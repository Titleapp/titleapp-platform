// Create the demo@sociii.ai login (Dr. Maya Chen persona), wire it to the
// Meadow Creek workspace (so it inherits all seeded accounting/contacts/staff),
// and make it show in her workspace switcher. Idempotent.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const EMAIL = "demo@sociii.ai";
const PASSWORD = "MeadowCreek!2026";
const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2";
const TENANT = "ws_1781920656122_tl9dhn"; // Meadow Creek / DEMO SPACE

(async () => {
  // 1. Create or fetch the demo user.
  let user;
  try {
    user = await admin.auth().getUserByEmail(EMAIL);
    console.log("• demo user exists:", user.uid);
    await admin.auth().updateUser(user.uid, { password: PASSWORD, displayName: "Dr. Maya Chen", emailVerified: true });
  } catch {
    user = await admin.auth().createUser({ email: EMAIL, password: PASSWORD, displayName: "Dr. Maya Chen", emailVerified: true });
    console.log("✓ created demo user:", user.uid);
  }
  const uid = user.uid;

  // 2. Membership → Meadow Creek tenant (admin) so she accesses all seeded data.
  const memSnap = await db.collection("memberships")
    .where("userId", "==", uid).where("tenantId", "==", TENANT).limit(1).get();
  if (memSnap.empty) {
    await db.collection("memberships").add({
      userId: uid, tenantId: TENANT, role: "admin", status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(), demo: true,
    });
    console.log("✓ membership added (admin @ Meadow Creek)");
  } else { console.log("• membership exists"); }

  // 3. Copy the workspace doc into demo's subcollection so it shows in her switcher.
  const srcSnap = await db.collection("users").doc(SEAN_UID).collection("workspaces").doc(TENANT).get();
  if (srcSnap.exists) {
    const data = srcSnap.data();
    await db.collection("users").doc(uid).collection("workspaces").doc(TENANT).set({
      ...data, name: "Meadow Creek Veterinary Clinic", onboardingComplete: true,
    });
    console.log("✓ workspace doc copied to demo's switcher");
  } else { console.warn("! source workspace doc not found under Sean — switcher copy skipped"); }

  console.log("\nDEMO LOGIN → " + EMAIL + " / " + PASSWORD);
  console.log("demo uid: " + uid + " | tenant: " + TENANT);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
