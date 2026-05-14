/**
 * Push the new CoPilot canvas-tab structure to PC12-NG (AV-P07) only.
 *
 * Sean's call 2026-05-12: cockpit-first tab order — Map (default),
 * Checklists, QRH, Flight Planning, Performance, Weight & Balance,
 * Aircraft, then reference tabs (Logbook, Currency, Duty, Training,
 * Documents). Tab bar wraps to two rows for aviation CoPilots.
 *
 * Runs in isolation against AV-P07 first. If Sean accepts the result we
 * propagate to AV-P01..AV-P11 with a separate pass.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/pushPc12CopilotTabs.js
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const { AVIATION_COPILOT_TABS } = require(path.join(__dirname, "..", "functions", "functions", "helpers", "canvasTabs"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TARGET_SLUG = "av-pc12-ng"; // AV-P07

(async () => {
  console.log(`\n=== Pushing new CoPilot tabs to ${TARGET_SLUG} ===\n`);

  const ref = db.collection("digitalWorkers").doc(TARGET_SLUG);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`FATAL: digitalWorkers/${TARGET_SLUG} not found`);
    process.exit(1);
  }

  const tabs = AVIATION_COPILOT_TABS.map(t => ({ ...t }));
  await ref.update({
    canvasTabs: tabs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const labels = tabs.map(t => t.label).join(" | ");
  console.log(`OK ${TARGET_SLUG}: ${labels}\n`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
