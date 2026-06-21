// Create the "DEMO SPACE" workspace in Sean's account, the canonical way
// (via the real createWorkspace helper → tenant doc + admin membership).
// Idempotent: re-running won't duplicate. Prints the tenant id for seeding.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const { createWorkspace } = require("../../helpers/workspaces");

const SPINE = [
  "platform-accounting",
  "platform-contacts",
  "platform-hr",
  "platform-marketing",
  "platform-control-center-pro",
];

(async () => {
  const user = await admin.auth().getUserByEmail("sean@sociii.ai");
  const uid = user.uid;
  console.log("Sean uid:", uid);

  // Idempotency — reuse an existing DEMO SPACE if present.
  const existing = await db.collection("users").doc(uid)
    .collection("workspaces").where("name", "==", "DEMO SPACE").limit(1).get();
  if (!existing.empty) {
    console.log("DEMO SPACE already exists →", existing.docs[0].id);
    process.exit(0);
  }

  const ws = await createWorkspace(uid, {
    vertical: "general",
    name: "DEMO SPACE",
    tagline: "Demo workspace for training videos — safe to reset",
    type: "org",
    onboardingComplete: true,
    workerIds: SPINE,
  });
  console.log("✓ Created DEMO SPACE →", ws.id);
  console.log("   (switch to it in the workspace switcher; seed targets this tenantId)");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
