/**
 * Re-sync just BANK-FUND-001 from catalog → digitalWorkers/fundraise.
 * Backfills slug, workerId, pricing, capabilitySummary, etc.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/syncFundraiseWorker.js
 */
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const { syncCatalogWorkers } = require(path.join(__dirname, "..", "functions", "functions", "helpers", "workerSync"));

(async () => {
  console.log("\n=== Sync BANK-FUND-001 from catalog ===\n");
  const result = await syncCatalogWorkers(db, { workerIds: ["BANK-FUND-001"], dryRun: false });
  console.log(JSON.stringify(result, null, 2));

  // Verify after
  const dw = await db.collection("digitalWorkers").doc("fundraise").get();
  if (dw.exists) {
    const d = dw.data();
    console.log("\nPost-sync digitalWorkers/fundraise:");
    console.log("  status:", d.status);
    console.log("  slug:", d.slug);
    console.log("  workerId:", d.workerId || d.id || "(none)");
    console.log("  name:", d.name);
    console.log("  pricing:", JSON.stringify(d.pricing || {}));
    console.log("  capabilitySummary:", (d.capabilitySummary || "").slice(0, 100));
  }
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
