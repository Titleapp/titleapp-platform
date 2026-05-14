/**
 * Add a "Map" tab to every RE worker's canvasTabs array.
 *
 * CODEX 50.18 follow-up 2026-05-12: Sean's call. Every RE worker shows
 * a Google Map on the canvas. Map becomes the new default tab; existing
 * default loses its default flag but keeps its position (order shifted +1).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/addMapTabToReWorkers.js
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_VERTICALS = new Set(["real_estate_development", "re_professional"]);

const MAP_TAB = {
  id: "map",
  label: "Map",
  signal: "card:re-map",
  default: true,
  order: 0,
};

(async () => {
  console.log("\n=== Adding Map tab to all RE workers ===\n");

  const snap = await db.collection("digitalWorkers").get();
  let touched = 0;
  let skipped = 0;
  let errored = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!RE_VERTICALS.has(d.vertical)) continue;

    const existingTabs = Array.isArray(d.canvasTabs) ? d.canvasTabs : [];

    // Idempotent: if a Map tab already exists, skip
    if (existingTabs.some(t => t.id === "map" || t.signal === "card:re-map")) {
      skipped++;
      continue;
    }

    // Build new tabs array: Map first, existing tabs shifted +1 with
    // default flag stripped (we own default now).
    const newTabs = [
      { ...MAP_TAB },
      ...existingTabs.map((t, i) => ({
        ...t,
        default: false,
        order: i + 1,
      })),
    ];

    // Cap at 6 (or 7 for aviation, n/a here) — preserve the cap, drop the
    // last tab if we exceed.
    const CAP = 6;
    const trimmed = newTabs.slice(0, CAP);

    try {
      await doc.ref.update({
        canvasTabs: trimmed,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const labels = trimmed.map(t => t.label).join(" | ");
      console.log(`✅ ${doc.id}: ${labels}`);
      touched++;
    } catch (e) {
      console.error(`❌ ${doc.id}: ${e.message}`);
      errored++;
    }
  }

  console.log(`\nSummary: ${touched} updated · ${skipped} already had Map · ${errored} errored\n`);
  process.exit(errored > 0 ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
