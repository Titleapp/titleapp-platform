// Create the Merritt Capital Group tenant for the RE demo persona.
// Idempotent — checks for existing tenant by name before creating.
// Prints tenant ID for use in all subsequent seed scripts.
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const { createWorkspace } = require("../../helpers/workspaces");

// Replace with actual UID from createREDemoUser.js output
const RE_DEMO_UID = process.env.RE_DEMO_UID || "";
if (!RE_DEMO_UID) throw new Error("Set RE_DEMO_UID env var to the UID printed by createREDemoUser.js");

const RE_WORKERS = [
  "platform-accounting",
  "platform-hr",
  "platform-marketing",
  "platform-contacts",
  "re-marketing-001",
  "title-abstract-001",
  "zoning-001",
  "cre-analyst",
  "investor-relations",
  "re-property-manager",
  "chief-of-staff",
];

(async () => {
  // Idempotency — check for existing MCG tenant under this user.
  const existing = await db.collection("users").doc(RE_DEMO_UID)
    .collection("workspaces").where("name", "==", "Merritt Capital Group").limit(1).get();
  if (!existing.empty) {
    const tenantId = existing.docs[0].id;
    console.log("• Merritt Capital Group tenant already exists:", tenantId);
    console.log("\n RE_DEMO_TENANT =", tenantId);
    process.exit(0);
  }

  const ws = await createWorkspace(RE_DEMO_UID, {
    vertical: "real-estate",
    name: "Merritt Capital Group",
    tagline: "CRE Developer + Operator — 3-asset mixed portfolio",
    type: "org",
    onboardingComplete: true,
    workerIds: RE_WORKERS,
    description: "Merritt Capital Group, LLC — CRE developer and operator. Portfolio: The Meridian at Flamingo (Las Vegas, luxury condo brokerage + HOA, 746 units), Creekwood Commons (Sacramento, 148-unit Class B apartments, 95.9% occupancy), Domain Point (Austin, mixed-use development in progress, 8 LP investors, delivery Oct 2026). Operating subsidiary: Merritt Property Group, LLC (Dana Reyes, Principal Broker, licensed CA + NV + TX). 15 staff across MCG and MPG.",
    demo: true,
  });

  console.log("✓ Created Merritt Capital Group tenant →", ws.id);
  console.log("\n RE_DEMO_TENANT =", ws.id);
  console.log(" Update this in index.js demo:token handler and all seed scripts.");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
