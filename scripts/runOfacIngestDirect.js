/**
 * One-shot OFAC ingest, bypassing the HTTP layer to avoid Cloud Run gateway timeout.
 * Connects to Firestore directly via admin SDK + GOOGLE_APPLICATION_CREDENTIALS.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/runOfacIngestDirect.js
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const { runOfacIngest } = require(path.join(__dirname, "..", "functions", "functions", "services", "compliance", "ofac", "ingest"));

(async () => {
  process.stdout.write("Starting OFAC ingest...\n");
  const start = Date.now();
  const result = await runOfacIngest({ trigger: "manual-direct" });
  const elapsed = Math.round((Date.now() - start) / 1000);
  process.stdout.write(`Completed in ${elapsed}s\n`);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  await new Promise(r => process.stdout.write("", r));
  process.exit(0);
})().catch(e => { process.stderr.write(`FATAL: ${e.stack || e.message}\n`); process.exit(1); });
