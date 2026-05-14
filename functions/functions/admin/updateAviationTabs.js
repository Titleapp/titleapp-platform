"use strict";

/**
 * One-shot: re-apply AVIATION_COPILOT_TABS to all digitalWorkers/{slug}
 * with catalogId matching /^AV-P\d/. Sean wanted Flight Planning to be the
 * default tab (2026-05-13).
 *
 * Run with:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *   node functions/functions/admin/updateAviationTabs.js
 */

const admin = require("firebase-admin");
const path = require("path");
const { AVIATION_COPILOT_TABS } = (() => {
  // re-export via require — canvasTabs.js exports them indirectly through
  // buildCanvasTabs. Easier to inline a copy of the constant.
  return {
    AVIATION_COPILOT_TABS: [
      { id: "flight-planning", label: "Flight Planning", signal: "card:aviation-flight-planning", default: true, order: 0 },
      { id: "map",             label: "Map",             signal: "card:re-map",                    order: 1 },
      { id: "checklists",      label: "Checklists",      signal: "card:aviation-checklists",       order: 2 },
      { id: "qrh",             label: "QRH",             signal: "card:aviation-qrh",              order: 3 },
      { id: "performance",     label: "Performance",     signal: "card:aviation-performance",      order: 4 },
      { id: "weight-balance",  label: "Weight & Balance", signal: "card:aviation-weight-balance",  order: 5 },
      { id: "aircraft",        label: "Aircraft",        signal: "card:aviation-aircraft",         order: 6 },
      { id: "logbook",         label: "Logbook",         signal: "card:work-product",              order: 7 },
      { id: "currency",        label: "Currency",        signal: "card:aviation-currency",         order: 8 },
      { id: "duty",            label: "Duty",            signal: "card:work-product",              order: 9 },
      { id: "training",        label: "Training",        signal: "card:work-product",              order: 10 },
      { id: "documents",       label: "Documents",       signal: "card:work-product",              order: 11 },
    ],
  };
})();

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

async function main() {
  const snap = await db.collection("digitalWorkers").get();
  let updated = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const catalogId = String(d.catalogId || "").toUpperCase();
    if (!/^AV-P\d/.test(catalogId)) { skipped++; continue; }
    await doc.ref.update({ canvasTabs: AVIATION_COPILOT_TABS });
    console.log(`✓ ${doc.id} (${catalogId})`);
    updated++;
  }
  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
