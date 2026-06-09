"use strict";
/**
 * fixREWorkerStatusVertical.js — S52.45
 *  1. Flip the 4 RE workers to status=live.
 *  2. Normalize vertical → "real_estate_development" (the value the home/
 *     marketplace grouping + vertical filter key on; CRE Analyst uses it).
 *     My earlier seedREWorkers.js wrote "Real Estate" which doesn't group.
 *  3. Remove the duplicate `site-recon` digitalWorkers doc (stale slug; the
 *     catalog + backend routes + creator seed all use `site-recon-001`).
 *
 *   node scripts/fixREWorkerStatusVertical.js           (dry run)
 *   node scripts/fixREWorkerStatusVertical.js --apply
 */
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const APPLY = process.argv.includes("--apply");

const RE_SLUGS = ["title-abstract-001", "law-landuse-001", "zoning-001", "feasibility-001", "site-recon-001"];
const VERTICAL = "real_estate_development";
const DUP_TO_DELETE = "site-recon"; // stale duplicate (keep site-recon-001)

(async () => {
  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — status=live + vertical=${VERTICAL} on ${RE_SLUGS.length} workers\n`);
  for (const slug of RE_SLUGS) {
    for (const col of ["digitalWorkers", "workers"]) {
      const ref = db.doc(`${col}/${slug}`);
      const snap = await ref.get();
      if (!snap.exists) { console.log(`  ${col}/${slug} — (missing, skip)`); continue; }
      const x = snap.data();
      console.log(`  ${col}/${slug}: status ${x.status} → live · vertical ${JSON.stringify(x.vertical)} → ${VERTICAL}`);
      if (APPLY) await ref.set({ status: "live", vertical: VERTICAL, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  }
  // Dedup: delete the stale site-recon (keep site-recon-001)
  for (const col of ["digitalWorkers", "workers"]) {
    const ref = db.doc(`${col}/${DUP_TO_DELETE}`);
    const snap = await ref.get();
    if (snap.exists) {
      const x = snap.data();
      console.log(`\n  DELETE duplicate ${col}/${DUP_TO_DELETE} (name="${x.name || x.display_name}" vertical=${JSON.stringify(x.vertical)})`);
      if (APPLY) await ref.delete();
    } else {
      console.log(`\n  ${col}/${DUP_TO_DELETE} — (not present)`);
    }
  }
  console.log(`\n${APPLY ? "✅ done" : "DRY RUN — re-run with --apply"}`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
