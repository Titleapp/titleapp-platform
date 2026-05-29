"use strict";

/**
 * One-shot — force-sync PLAT-005 (hr-people) + BANK-FUND-001 (fundraise) from
 * catalog JSON → digitalWorkers/{slug} Firestore mirror. Bypasses the HTTP
 * /v1/admin:workers:sync endpoint (which requires auth) by calling the
 * underlying helper directly.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   node scripts/forceSyncHrFundraise.js
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR);

const { syncCatalogWorkers } = require(path.join(FUNCTIONS_DIR, "helpers", "workerSync"));

(async () => {
  console.log("\nForce-sync PLAT-005 + BANK-FUND-001 → digitalWorkers/\n");

  const db = admin.firestore();
  const result = await syncCatalogWorkers(db, {
    dryRun: false,
    workerIds: ["PLAT-005", "BANK-FUND-001"],
  });

  console.log("Sync result:", JSON.stringify(result, null, 2));

  // Verify by reading back the docs.
  const hrSnap = await db.collection("digitalWorkers").doc("hr-people").get();
  const fundSnap = await db.collection("digitalWorkers").doc("fundraise").get();

  console.log("\nVerification — hr-people:");
  if (hrSnap.exists) {
    const d = hrSnap.data();
    console.log("  status:", d.status);
    console.log("  canvasTabs count:", (d.canvasTabs || []).length);
    console.log("  canvasTabs labels:", (d.canvasTabs || []).map(t => t.label).join(" | "));
    console.log("  constraintRaasSources:", JSON.stringify(d.constraintRaasSources || []));
  } else {
    console.log("  ❌ doc does not exist");
  }

  console.log("\nVerification — fundraise:");
  if (fundSnap.exists) {
    const d = fundSnap.data();
    console.log("  status:", d.status);
    console.log("  canvasTabs count:", (d.canvasTabs || []).length);
    console.log("  canvasTabs labels:", (d.canvasTabs || []).map(t => t.label).join(" | "));
    console.log("  constraintRaasSources:", JSON.stringify(d.constraintRaasSources || []));
  } else {
    console.log("  ❌ doc does not exist");
  }

  process.exit(0);
})().catch(e => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
