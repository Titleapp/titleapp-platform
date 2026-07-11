// Top up prepaidCredits for Kent's SOCIII Inc workspace tenant.
// Finds the tenant by name "SOCIII Inc" or by Kent's membership.
// Idempotent-safe: only adds if current balance < 500.

const path = require("path");
const admin = require(path.resolve(__dirname, "../functions/functions/node_modules/firebase-admin"));

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const KENT_EMAIL = "kent@sociii.ai";
const TOP_UP_AMOUNT = 500; // credits to add

async function run() {
  // Find tenant by looking for Kent's membership
  const membershipsSnap = await db.collection("memberships")
    .where("email", "==", KENT_EMAIL)
    .get();

  if (membershipsSnap.empty) {
    // Try by uid lookup
    console.log("[topup] No memberships found for", KENT_EMAIL, "— searching tenants by name");
    const tenantsSnap = await db.collection("tenants")
      .where("name", "in", ["SOCIII Inc", "SOCIII", "sociii"])
      .get();
    if (tenantsSnap.empty) {
      console.error("[topup] Could not find SOCIII Inc tenant. Check Firestore manually.");
      process.exit(1);
    }
    for (const doc of tenantsSnap.docs) {
      console.log(`  Found tenant: ${doc.id} — ${doc.data().name} — prepaidCredits: ${doc.data().prepaidCredits ?? 0}`);
    }
    process.exit(0);
  }

  const tenantIds = [...new Set(membershipsSnap.docs.map(d => d.data().tenantId).filter(Boolean))];
  console.log("[topup] Kent's tenant IDs:", tenantIds);

  for (const tenantId of tenantIds) {
    const tenantRef = db.doc(`tenants/${tenantId}`);
    const snap = await tenantRef.get();
    if (!snap.exists) { console.log(`  Skipping ${tenantId} — doc missing`); continue; }
    const current = snap.data().prepaidCredits ?? 0;
    console.log(`  ${tenantId} (${snap.data().name || "?"}): prepaidCredits = ${current}`);
    await tenantRef.update({
      prepaidCredits: admin.firestore.FieldValue.increment(TOP_UP_AMOUNT),
      lastManualTopUpAt: admin.firestore.FieldValue.serverTimestamp(),
      lastManualTopUpNote: `Admin top-up ${TOP_UP_AMOUNT} credits for Kent (kent@sociii.ai) — 2026-07-06`,
    });
    console.log(`  ✓ Added ${TOP_UP_AMOUNT} credits → new balance: ${current + TOP_UP_AMOUNT}`);
  }

  console.log("[topup] Done.");
  process.exit(0);
}

run().catch(e => { console.error("[topup] Fatal:", e); process.exit(1); });
