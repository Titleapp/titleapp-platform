#!/usr/bin/env node
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

async function main() {
  const uid = "WResykI56hW16silsOtvlw1UjJK2";
  
  // All active memberships
  const memSnap = await db.collection("memberships")
    .where("userId", "==", uid)
    .where("status", "==", "active")
    .get();
  
  console.log("Active memberships:");
  for (const doc of memSnap.docs) {
    const m = doc.data();
    const tenantDoc = await db.collection("tenants").doc(m.tenantId).get();
    const t = tenantDoc.exists ? tenantDoc.data() : {};
    console.log(`  ${m.tenantId} → name: "${t.name}" vertical: "${t.vertical}" type: "${t.type}"`);
  }
  
  // All user workspace docs
  const wsSnap = await db.collection("users").doc(uid).collection("workspaces").get();
  console.log("\nUser workspace subcollection docs:");
  for (const doc of wsSnap.docs) {
    const d = doc.data();
    console.log(`  ${doc.id} → name: "${d.name}" vertical: "${d.vertical}" status: "${d.status}" onboardingComplete: ${d.onboardingComplete}`);
  }
  
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
