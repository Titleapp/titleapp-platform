"use strict";

/**
 * cleanupLegacyMdReports.js — One-shot script to mark legacy .md accounting
 * reports as superseded so they stop appearing in Drive / Reports views.
 *
 * Context: canvasArchive emits .xlsx (P&L, Cash Flow, Balance Sheet, CoA)
 * and .pdf (invoices) since the Phase D-1 ship. Files from before that
 * migration are plain-text .md snapshots with no formulas. They are
 * functionally orphaned in the new flow.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *     node scripts/cleanupLegacyMdReports.js          # dry run
 *
 *   ... node scripts/cleanupLegacyMdReports.js --apply  # write
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — sweeping legacy .md accounting reports\n`);

  // Pull all storageObjects with status=active (or no status). We scope
  // afterward in JS to keep the Firestore query cheap.
  const snap = await db.collection("storageObjects").get();
  console.log("Total storageObjects scanned:", snap.size);

  const targets = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.status && data.status !== "active") continue;
    const name = String(data.filename || "").toLowerCase();
    const mime = String(data.mimeType || "").toLowerCase();
    const tags = Array.isArray(data.tags) ? data.tags.map(t => String(t).toLowerCase()) : [];

    const isMd = name.endsWith(".md") || mime.includes("markdown");
    if (!isMd) continue;

    // Only sweep accounting/report-tagged files. Don't touch user-uploaded
    // markdown notes.
    const isAccountingReport = tags.includes("accounting") || tags.includes("report")
      || /^(pl|balance-sheet|cashflow|invoice|coa)-/.test(name);
    if (!isAccountingReport) continue;

    targets.push({ id: d.id, ref: d.ref, filename: data.filename, tenantId: data.orgId, createdAt: data.createdAt });
  }

  console.log("Legacy .md accounting reports flagged:", targets.length);
  if (targets.length > 0) {
    console.log("\nFirst 10:");
    for (const t of targets.slice(0, 10)) {
      console.log(`  ${t.id}  ${t.filename}  (tenant=${t.tenantId || "—"})`);
    }
  }

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to mark these as superseded)");
    process.exit(0);
  }

  let written = 0;
  for (let i = 0; i < targets.length; i += 450) {
    const slice = targets.slice(i, i + 450);
    const batch = db.batch();
    for (const t of slice) {
      batch.update(t.ref, {
        status: "superseded",
        supersededAt: admin.firestore.FieldValue.serverTimestamp(),
        supersededBy: "cleanup-legacy-md-2026-05-15",
      });
      written += 1;
    }
    await batch.commit();
    console.log(`  committed ${written}/${targets.length}`);
  }
  console.log(`\nDONE — marked ${written} legacy .md reports as superseded.`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
