// Normalize suite values that leaked vertical names or slug-style strings.
// Consolidates 10 outliers into existing suites rather than inventing new pills.
const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");

const REMAP = {
  "business-intelligence": "Intelligence",
  "client-communication": "Communications",
  "marketing-content": "Marketing",
  "re-daily-portfolio-report": "Operations",
  "solar-customer-proposal": "Sales",
  "solar-site-assessment": "Operations",
  "av-daily-ops-report": "Operations",
  "av-dispatch-board": "Operations",
  "control-center": "Intelligence",
  "alex-worker-zero": "Intelligence",
};

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — suite normalization\n`);
  for (const [slug, newSuite] of Object.entries(REMAP)) {
    const ref = db.collection("digitalWorkers").doc(slug);
    const d = await ref.get();
    if (!d.exists) {
      console.log(`  ${slug}: MISSING DOC`);
      continue;
    }
    const old = d.data().suite;
    console.log(`  ${slug.padEnd(32)} ${(old || "(none)").padEnd(28)} → ${newSuite}`);
    if (!DRY) await ref.update({ suite: newSuite });
  }
  console.log(`\n${DRY ? "DRY RUN — no writes. Re-run with --apply." : "Done."}\n`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
