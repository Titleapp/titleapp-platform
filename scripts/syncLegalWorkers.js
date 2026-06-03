"use strict";

/**
 * One-shot — sync PARA-001 (paralegal) + PAT-001 (patent) from catalog JSON
 * → digitalWorkers/{slug} Firestore mirror. Bypasses the HTTP
 * /v1/admin:workers:sync endpoint (which requires auth) by calling the
 * underlying helper directly.
 *
 * Per CODEX S52.16 + S52.17 (2026-06-02).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   node scripts/syncLegalWorkers.js
 *
 * Optional flags:
 *   --dry-run     Validate without writing
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR);

const { syncCatalogWorkers } = require(path.join(FUNCTIONS_DIR, "helpers", "workerSync"));

const dryRun = process.argv.includes("--dry-run");

(async () => {
  console.log(`\nSyncing PARA-001 + PAT-001 → digitalWorkers/ (dryRun=${dryRun})\n`);

  const db = admin.firestore();
  const result = await syncCatalogWorkers(db, {
    dryRun,
    workerIds: ["PARA-001", "PAT-001"],
  });

  console.log("Sync result:", JSON.stringify(result, null, 2));

  if (dryRun) return;

  const paraSnap = await db.collection("digitalWorkers").doc("paralegal").get();
  const patSnap = await db.collection("digitalWorkers").doc("patent").get();

  for (const [label, snap] of [["paralegal", paraSnap], ["patent", patSnap]]) {
    console.log(`\nVerification — ${label}:`);
    if (snap.exists) {
      const d = snap.data();
      console.log("  status:", d.status);
      console.log("  display_name:", d.display_name);
      console.log("  vertical:", d.vertical);
      console.log("  catalogId:", d.catalogId);
      console.log("  canvasTabs count:", (d.canvasTabs || []).length);
      console.log("  canvasTabs labels:", (d.canvasTabs || []).map(t => t.label).join(" | "));
      console.log("  constraintRaasSources count:", (d.constraintRaasSources || []).length);
      console.log("  has controlCenterContribution:", !!d.controlCenterContribution);
      console.log("  has intent:", !!d.intent);
    } else {
      console.log("  ❌ doc does not exist");
    }
  }

  console.log();
  process.exit(0);
})().catch(e => { console.error("FATAL:", e.stack); process.exit(1); });
