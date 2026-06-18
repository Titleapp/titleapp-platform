"use strict";
/**
 * sweepCanvasDesigned.js — S52.45. Platform-wide application of "NO canvas >
 * INCORRECT canvas". Sets canvasDesigned:false on every worker that does NOT
 * have a real/curated canvas, so they show the clean chat-only notice instead
 * of a wrong generic template. Fully reversible (flip to true as canvases ship).
 *
 * PRESERVED (keep their canvas):
 *   - DESIGNED allowlist (RE_CANVAS + CRE + curated spine + fundraise)
 *   - auto_dealer vertical (AUTO_FIXTURES) + aviation copilot (AVIATION_FIXTURES)
 *
 *   node scripts/sweepCanvasDesigned.js          (dry run)
 *   node scripts/sweepCanvasDesigned.js --apply
 */
const admin = require(require("path").join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const APPLY = process.argv.includes("--apply");

const DESIGNED = new Set([
  "title-abstract-001", "law-landuse-001", "zoning-001", "feasibility-001",
  "cre-analyst", "cre-deal-analyst",
  "platform-accounting", "platform-hr", "platform-marketing", "platform-control-center-pro", "fundraise",
]);
const keep = (slug, x) => {
  if (DESIGNED.has(slug)) return "designed";
  if ((x.vertical || "") === "auto_dealer") return "auto-fixtures";
  if (/^AV-P\d/i.test(String(x.catalogId || x.catalog_id || ""))) return "aviation-fixtures";
  if ((x.vertical || "") === "aviation") return "aviation";
  return null;
};

(async () => {
  const snap = await db.collection("digitalWorkers").get();
  let flag = 0, kept = 0;
  const keptList = [];
  for (const d of snap.docs) {
    const x = d.data(); const slug = d.id;
    const why = keep(slug, x);
    if (why) { kept++; keptList.push(`${slug} (${why})`); continue; }
    if (x.canvasDesigned === false) { flag++; continue; } // already flagged
    flag++;
    if (APPLY) {
      await db.doc(`digitalWorkers/${slug}`).set({ canvasDesigned: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      const w = await db.doc(`workers/${slug}`).get();
      if (w.exists) await db.doc(`workers/${slug}`).set({ canvasDesigned: false }, { merge: true });
    }
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${snap.size} workers: ${flag} → chat-only, ${kept} keep their canvas`);
  console.log(`PRESERVED:\n  ${keptList.join("\n  ")}`);
  if (!APPLY) console.log("\nRe-run with --apply to write.");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
