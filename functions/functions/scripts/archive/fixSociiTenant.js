#!/usr/bin/env node
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

async function main() {
  const uid = "WResykI56hW16silsOtvlw1UjJK2";
  const wsId = "ws_1779846027006_hc71aw";

  // Check both docs
  const tenantDoc = await db.collection("tenants").doc(wsId).get();
  const userWsDoc = await db.collection("users").doc(uid).collection("workspaces").doc(wsId).get();

  console.log("tenants/" + wsId, "exists:", tenantDoc.exists);
  if (tenantDoc.exists) {
    const d = tenantDoc.data();
    console.log("  name:", d.name, "  vertical:", d.vertical, "  type:", d.type);
  }
  console.log("users/" + uid + "/workspaces/" + wsId, "exists:", userWsDoc.exists);
  if (userWsDoc.exists) {
    const d = userWsDoc.data();
    console.log("  name:", d.name, "  vertical:", d.vertical, "  onboardingComplete:", d.onboardingComplete);
  }

  // Patch tenants doc
  await db.collection("tenants").doc(wsId).set({
    name: "SOCIII, Inc.",
    vertical: "general",
    type: "org",
    onboardingComplete: true,
  }, { merge: true });
  console.log("\nPatched tenants/" + wsId);

  // Patch user workspace subcollection doc
  const existingUserWs = userWsDoc.exists ? userWsDoc.data() : {};
  await db.collection("users").doc(uid).collection("workspaces").doc(wsId).set({
    ...existingUserWs,
    name: "SOCIII, Inc.",
    vertical: "general",
    type: "org",
    onboardingComplete: true,
    status: "active",
  }, { merge: true });
  console.log("Patched users/" + uid + "/workspaces/" + wsId);

  // Verify
  const verifyTenant = await db.collection("tenants").doc(wsId).get();
  const verifyUserWs = await db.collection("users").doc(uid).collection("workspaces").doc(wsId).get();
  console.log("\nVerify tenants/" + wsId + " name:", verifyTenant.data()?.name);
  console.log("Verify userWs name:", verifyUserWs.data()?.name);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
