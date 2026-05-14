"use strict";

/**
 * Soft-delete all platform-accounting reports for a tenant so the Reports
 * tab starts clean. New emissions (post canvasArchive metadata patch) will
 * dedupe properly via reportType + reportPeriod + reportVariant.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... TENANT_ID=<id> node scripts/cleanupAccountingReports.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... TENANT_ID=<id> node scripts/cleanupAccountingReports.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID) { console.error("ERROR: set TENANT_ID env var"); process.exit(1); }

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — soft-delete accounting reports for tenant=${TENANT_ID}\n`);

  const snap = await db.collection("storageObjects")
    .where("orgId", "==", TENANT_ID)
    .where("createdByWorker", "==", "platform-accounting")
    .where("status", "==", "active")
    .get();

  // Only target machine-archived .md report files — NEVER user uploads
  // (screenshots, .xlsx, .pdf etc). Reports carry the "report" tag from
  // canvasArchive AND have .md filenames + text/markdown mime.
  const targets = snap.docs.filter(d => {
    const data = d.data();
    const tags = Array.isArray(data.tags) ? data.tags : [];
    if (!tags.includes("report")) return false;
    if ((data.mimeType || "") !== "text/markdown") return false;
    if (!(data.filename || "").endsWith(".md")) return false;
    return true;
  });

  console.log(`Total active accounting objects: ${snap.size}. Report .md targets: ${targets.length}.`);
  console.log(`Files PRESERVED (user uploads, not reports): ${snap.size - targets.length}.\n`);
  console.log("Will soft-delete:");
  for (const d of targets) {
    console.log(`  ${d.id} — ${d.data().filename} — ${d.data().tags?.join(",")}`);
  }

  if (!APPLY) { console.log("\n(dry run — pass --apply to soft-delete)\n"); process.exit(0); }

  let count = 0;
  for (let i = 0; i < targets.length; i += 450) {
    const slice = targets.slice(i, i + 450);
    const batch = db.batch();
    for (const d of slice) {
      batch.update(d.ref, {
        status: "deleted",
        deleted_at: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: "cleanup-script-2026-05-14",
      });
      count++;
    }
    await batch.commit();
    console.log(`  committed ${count}/${targets.length}`);
  }
  console.log(`\nDONE — soft-deleted ${count} reports.\n`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
