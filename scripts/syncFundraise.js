/**
 * CODEX 50.15 P0-12 — Sync Fundraise (BANK-FUND-001) into digitalWorkers
 * collection from the new banking-finance.json catalog.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/syncFundraise.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/syncFundraise.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const { syncCatalogWorkers } = require(path.join(__dirname, "..", "functions", "functions", "helpers", "workerSync"));

const DRY = !process.argv.includes("--apply");

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Sync Fundraise (BANK-FUND-001)\n`);
  const result = await syncCatalogWorkers(db, {
    dryRun: DRY,
    workerIds: ["BANK-FUND-001"],
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
