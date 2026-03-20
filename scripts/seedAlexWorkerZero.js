/**
 * seedAlexWorkerZero.js — Register Alex as Worker Zero in Firestore
 *
 * Writes digitalWorkers/alex-worker-zero with platform worker fields.
 * Uses merge: true — safe to re-run.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/seedAlexWorkerZero.js
 */

"use strict";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}
const db = admin.firestore();

async function seed() {
  const ref = db.collection("digitalWorkers").doc("alex-worker-zero");

  await ref.set({
    workerId: "alex-worker-zero",
    workerNumber: 0,
    name: "Alex",
    title: "Chief of Staff",
    type: "platform",
    status: "live",
    vertical: "all",
    rulePackId: "alex-rule-pack-v1",
    isWorkerZero: true,
    auditTrailEnabled: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    version: "1.0.0",
    price: 0,
    priceDisplay: "Free",
    creatorId: "titleapp-platform",
    creatorName: "TitleApp",
    description: "Alex is your Chief of Staff — the universal orchestration layer that sits above every specialist Digital Worker on the platform. RAAS-governed with a 6-layer rule pack.",
    shortDescription: "Chief of Staff — orchestrates all Digital Workers",
  }, { merge: true });

  console.log("Done. Alex Worker Zero registered at digitalWorkers/alex-worker-zero");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
