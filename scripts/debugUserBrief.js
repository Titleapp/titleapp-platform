"use strict";

/**
 * debugUserBrief.js — dump the Control Center brief for a given user email.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *     node scripts/debugUserBrief.js seanlcombs@gmail.com
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const EMAIL = process.argv[2];
if (!EMAIL) { console.error("USAGE: node debugUserBrief.js <email>"); process.exit(1); }

(async () => {
  // Find the user by email.
  const userRec = await admin.auth().getUserByEmail(EMAIL).catch(() => null);
  if (!userRec) { console.error("No Firebase user with email:", EMAIL); process.exit(1); }
  console.log("Firebase UID:", userRec.uid);

  // List memberships for that uid.
  const memSnap = await db.collection("memberships")
    .where("userId", "==", userRec.uid)
    .where("status", "==", "active")
    .get();
  console.log(`\nActive memberships: ${memSnap.size}`);

  for (const m of memSnap.docs) {
    const md = m.data();
    const tenantId = md.tenantId;
    if (!tenantId) { console.log(`  (skip — no tenantId)`); continue; }

    const tenantSnap = await db.collection("tenants").doc(tenantId).get();
    const tenantName = tenantSnap.exists ? (tenantSnap.data().name || "(unnamed)") : "(no tenant doc)";
    const mode = tenantSnap.exists ? (tenantSnap.data().mode || "operations") : "operations";

    // Per-tenant signal counts
    const [contactsSnap, txSnap, accountsSnap, draftsSnap, workersSnap] = await Promise.all([
      db.collection("contacts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0 })),
      db.collection("transactions").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0 })),
      db.collection("connectedAccounts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0 })),
      db.collection("marketingDrafts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0 })),
      db.collection("digitalWorkers").limit(500).get().catch(() => ({ size: 0 })),
    ]);

    const hasSignalOps = contactsSnap.size > 0 || txSnap.size > 0 || accountsSnap.size > 0;
    const hasSignalLaunch = hasSignalOps || draftsSnap.size > 0 || workersSnap.size > 0;

    console.log(`\n  ${tenantId}`);
    console.log(`    name:       ${tenantName}`);
    console.log(`    mode:       ${mode}`);
    console.log(`    role:       ${md.role || "(unknown)"}`);
    console.log(`    contacts:   ${contactsSnap.size}`);
    console.log(`    tx:         ${txSnap.size}`);
    console.log(`    accounts:   ${accountsSnap.size}`);
    console.log(`    drafts:     ${draftsSnap.size}`);
    console.log(`    workers:    ${workersSnap.size} (global, not tenant-scoped)`);
    console.log(`    hasSignal:  ${mode === "launch" ? hasSignalLaunch : hasSignalOps}`);
  }

  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
