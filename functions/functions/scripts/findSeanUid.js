"use strict";
const path = require("path");
const admin = require(path.resolve(__dirname, "../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const auth = admin.auth();
const db = admin.firestore();

(async () => {
  try {
    const user = await auth.getUserByEmail("sean@sociii.ai");
    console.log("UID:", user.uid, "email:", user.email);
  } catch (e) {
    console.error("auth lookup failed:", e.message);
  }
  const mems = await db.collection("memberships").where("tenantId", "==", "ws_1779846027006_hc71aw").get();
  mems.forEach((d) => console.log("membership doc:", d.id, JSON.stringify(d.data())));
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
