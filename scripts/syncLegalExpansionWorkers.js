"use strict";

/**
 * One-shot — sync LIT-001 + DEF-001 + DD-001 + CLO-001 from catalog JSON
 * → digitalWorkers/{slug} Firestore mirror.
 *
 * Per CODEX S52.22 Legal Worker Family Expansion (2026-06-02).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   node scripts/syncLegalExpansionWorkers.js
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
  console.log(`\nSyncing LIT-001 + DEF-001 + DD-001 + CLO-001 → digitalWorkers/ (dryRun=${dryRun})\n`);

  const db = admin.firestore();
  const result = await syncCatalogWorkers(db, {
    dryRun,
    workerIds: ["LIT-001", "DEF-001", "DD-001", "CLO-001"],
  });

  console.log("Sync result:", JSON.stringify(result, null, 2));

  if (dryRun) return;

  const slugs = ["litigation-discovery", "compliance-defense", "transaction-due-diligence", "closing-attorney"];
  for (const slug of slugs) {
    const snap = await db.collection("digitalWorkers").doc(slug).get();
    console.log(`\nVerification — ${slug}:`);
    if (snap.exists) {
      const d = snap.data();
      console.log("  status:", d.status);
      console.log("  display_name:", d.display_name);
      console.log("  vertical:", d.vertical);
      console.log("  catalogId:", d.catalogId);
      console.log("  canvasTabs count:", (d.canvasTabs || []).length);
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
