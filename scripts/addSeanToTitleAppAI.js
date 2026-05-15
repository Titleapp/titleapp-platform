"use strict";

/**
 * addSeanToTitleAppAI.js — One-shot membership fix.
 *
 * Sean's primary UID has 8 memberships but none of them are the TitleApp AI
 * workspace (ws_1778652045795_vk4sz1) where the cap table + 1597 contacts
 * + 251 workers live. This script:
 *
 *   1. Adds an active admin membership for Sean's UID on that workspace.
 *   2. Writes the workspace mirror under users/{uid}/workspaces/{tid} so
 *      the persona switcher in the sidebar picks it up.
 *
 * Idempotent: if either record already exists for this user + tenant, it
 * leaves them alone.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *     node scripts/addSeanToTitleAppAI.js           # dry run
 *   ... node scripts/addSeanToTitleAppAI.js --apply   # write
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const SEAN_UID = "4WHjuUgEseQfBr0Tg92YXXhu6Mj1";
const TENANT_ID = "ws_1778652045795_vk4sz1";

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — add Sean's UID as admin of TitleApp AI workspace\n`);
  console.log("  uid:", SEAN_UID);
  console.log("  tenant:", TENANT_ID);

  const tenantSnap = await db.collection("tenants").doc(TENANT_ID).get();
  if (!tenantSnap.exists) {
    console.error(`\nFATAL: tenants/${TENANT_ID} doesn't exist. Aborting.`);
    process.exit(1);
  }
  const tenant = tenantSnap.data() || {};
  console.log("  tenant name:", tenant.name || "(unnamed)");
  console.log("  tenant vertical:", tenant.vertical || "(unset)");

  // 1) Membership doc.
  const memSnap = await db.collection("memberships")
    .where("userId", "==", SEAN_UID)
    .where("tenantId", "==", TENANT_ID)
    .limit(1)
    .get();

  if (!memSnap.empty) {
    console.log("\n[membership] Already exists:", memSnap.docs[0].id, "role:", memSnap.docs[0].data().role);
  } else {
    console.log("\n[membership] Will create new admin membership.");
    if (APPLY) {
      const ref = await db.collection("memberships").add({
        userId: SEAN_UID,
        tenantId: TENANT_ID,
        role: "admin",
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "scripts/addSeanToTitleAppAI.js",
      });
      console.log("  created:", ref.id);
    }
  }

  // 2) Workspace mirror under user's subcollection.
  const mirrorRef = db.collection("users").doc(SEAN_UID).collection("workspaces").doc(TENANT_ID);
  const mirrorSnap = await mirrorRef.get();
  if (mirrorSnap.exists) {
    console.log("[mirror] Already exists. Updating role to admin/active.");
    if (APPLY) {
      await mirrorRef.update({
        role: "admin",
        status: "active",
        name: tenant.name || tenant.companyName || "TitleApp AI",
        vertical: tenant.vertical || null,
        jurisdiction: tenant.jurisdiction || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    console.log("[mirror] Will create new workspace mirror.");
    if (APPLY) {
      await mirrorRef.set({
        name: tenant.name || tenant.companyName || "TitleApp AI",
        vertical: tenant.vertical || null,
        jurisdiction: tenant.jurisdiction || null,
        creatorEnabled: tenant.creatorEnabled || false,
        role: "admin",
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to write)");
    process.exit(0);
  }
  console.log("\nDONE — Sean is now an admin of the TitleApp AI workspace.");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
