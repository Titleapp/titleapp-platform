"use strict";

/**
 * One-shot — sync PLAT-008 (audit-trail) from platform.json → digitalWorkers/audit-trail.
 *
 * Per Sean priority 2026-06-02 night: audit trail is the most defensible moat,
 * must be visible in the marketplace as a discoverable platform worker.
 *
 * Stack (Sean clarification 2026-06-02 night):
 * - Crossmint = the minter (functional today via services/minting/crossmintMinter.js)
 * - NFT-per-action = the audit record (DTC parent or logbook child)
 * - Customer wallet = primary holder (Coinbase Wallet recommended)
 * - SOCIII custody copy = backup / dispute resolution
 * - Coinbase = audit ledger endpoint
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/syncAuditTrailWorker.js
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR);

const { syncCatalogWorkers } = require(path.join(FUNCTIONS_DIR, "helpers", "workerSync"));

(async () => {
  console.log("\nSyncing PLAT-008 (Audit Trail & Backup) → digitalWorkers/audit-trail\n");

  const db = admin.firestore();
  const result = await syncCatalogWorkers(db, {
    dryRun: false,
    workerIds: ["PLAT-008"],
  });

  console.log("Sync result:", JSON.stringify(result, null, 2));

  const snap = await db.collection("digitalWorkers").doc("audit-trail").get();
  if (snap.exists) {
    const d = snap.data();
    console.log("\nVerification — audit-trail:");
    console.log("  status:", d.status);
    console.log("  display_name:", d.display_name);
    console.log("  catalogId:", d.catalogId);
    console.log("  canvasTabs:", (d.canvasTabs || []).length);
    console.log("  canvasTab labels:", (d.canvasTabs || []).map(t => t.label).join(" | "));
    console.log("  constraintRaasSources:", (d.constraintRaasSources || []).length);
    console.log("  has controlCenterContribution:", !!d.controlCenterContribution);
    console.log("  has intent:", !!d.intent);
  } else {
    console.log("  ❌ doc does not exist");
  }

  process.exit(0);
})().catch(e => { console.error("FATAL:", e.stack); process.exit(1); });
