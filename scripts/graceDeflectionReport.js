"use strict";

/**
 * Grace (program-support-001) deflection-rate report — CODEX 81 §5 item 4.
 *
 * Deflection rate = 1 - (escalations from Grace) / (total Grace turns),
 * per tenant, per ISO week. Reads two purpose-built sources rather than
 * deriving "total conversations" from the general chatSessions collection,
 * whose schema varies across dozens of write sites in index.js and was
 * never designed to answer this question reliably:
 *
 *   - supportWorkerActivity/{tenantId}_program-support-001_{weekKey}
 *       totalTurns — incremented once per normal Grace response
 *       (POST /v1/support:worker-turn, fired from ChatPanel.jsx)
 *   - supportSessions where workerSlug == "program-support-001"
 *       one doc per escalation to a human, already has tenantId + openedAt
 *
 * CODEX 81's own §4 refinement: this reports one blended ceiling number,
 * not split into trust-based-impatience vs. structural-refusal escalations
 * — that split needs supportSessions to record which category a given
 * escalation falls into, which doesn't exist yet. Read the printed number
 * against that caveat, not as if it were already the refined metric.
 *
 * Sample-size caveat (CODEX 79 §3.3): at UH-Maui-scale weekly volume, one
 * escalated ticket swings this number by double digits. Read as a
 * multi-week trend, not a single week's verdict.
 *
 * Usage:
 *   node scripts/graceDeflectionReport.js                    # last 8 weeks, all tenants
 *   node scripts/graceDeflectionReport.js --tenant=uh-maui    # one tenant
 *   node scripts/graceDeflectionReport.js --weeks=4
 */

const path = require("path");
const admin = require(
  path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin")
);
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const WORKER_SLUG = "program-support-001";

function isoWeekKey(date) {
  const jan1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - jan1) / 86400000) + jan1.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function recentWeekKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() - i * 7 * 86400000);
    keys.push(isoWeekKey(d));
  }
  return keys;
}

async function main() {
  const args = process.argv.slice(2);
  const tenantArg = args.find(a => a.startsWith("--tenant="))?.split("=")[1] || null;
  const weeksArg = parseInt(args.find(a => a.startsWith("--weeks="))?.split("=")[1] || "8", 10);
  const weekKeys = new Set(recentWeekKeys(weeksArg));

  // Activity (denominator) — purpose-built counter, small collection.
  let activitySnap = await db.collection("supportWorkerActivity")
    .where("workerSlug", "==", WORKER_SLUG)
    .get();
  const activity = {}; // `${tenantId}|${weekKey}` -> totalTurns
  activitySnap.forEach(doc => {
    const d = doc.data();
    if (tenantArg && d.tenantId !== tenantArg) return;
    if (!weekKeys.has(d.weekKey)) return;
    activity[`${d.tenantId}|${d.weekKey}`] = d.totalTurns || 0;
  });

  // Escalations (numerator's complement) — existing supportSessions collection.
  let escQuery = db.collection("supportSessions").where("workerSlug", "==", WORKER_SLUG);
  if (tenantArg) escQuery = escQuery.where("tenantId", "==", tenantArg);
  const escSnap = await escQuery.get();
  const escalations = {}; // `${tenantId}|${weekKey}` -> count
  escSnap.forEach(doc => {
    const d = doc.data();
    const opened = d.openedAt?.toDate ? d.openedAt.toDate() : null;
    if (!opened) return;
    const weekKey = isoWeekKey(opened);
    if (!weekKeys.has(weekKey)) return;
    const key = `${d.tenantId}|${weekKey}`;
    escalations[key] = (escalations[key] || 0) + 1;
  });

  // Content gaps — separate signal, printed alongside for context, not
  // folded into the deflection percentage itself.
  let gapQuery = db.collection("supportContentGaps").where("workerSlug", "==", WORKER_SLUG);
  if (tenantArg) gapQuery = gapQuery.where("tenantId", "==", tenantArg);
  const gapSnap = await gapQuery.get();
  const gapCounts = {}; // `${tenantId}|${weekKey}` -> count
  gapSnap.forEach(doc => {
    const d = doc.data();
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : null;
    if (!created) return;
    const weekKey = isoWeekKey(created);
    if (!weekKeys.has(weekKey)) return;
    const key = `${d.tenantId}|${weekKey}`;
    gapCounts[key] = (gapCounts[key] || 0) + 1;
  });

  const allKeys = new Set([...Object.keys(activity), ...Object.keys(escalations), ...Object.keys(gapCounts)]);
  if (allKeys.size === 0) {
    console.log(`No Grace activity found for the last ${weeksArg} week(s)${tenantArg ? ` (tenant=${tenantArg})` : ""}.`);
    console.log("If Grace has real traffic and this is empty, check that /admin:bootstrap-program-support-001");
    console.log("has been run and that the deployed build includes the worker-turn/content-gap wiring.");
    return;
  }

  console.log("tenant".padEnd(24) + "week".padEnd(10) + "turns".padEnd(8) + "escalated".padEnd(11) + "gaps".padEnd(7) + "deflection");
  [...allKeys].sort().forEach(key => {
    const [tenantId, weekKey] = key.split("|");
    const turns = activity[key] || 0;
    const esc = escalations[key] || 0;
    const gaps = gapCounts[key] || 0;
    const deflection = turns > 0 ? `${(100 * (1 - esc / turns)).toFixed(1)}%` : "n/a (0 turns)";
    console.log(
      tenantId.padEnd(24) + weekKey.padEnd(10) + String(turns).padEnd(8) + String(esc).padEnd(11) + String(gaps).padEnd(7) + deflection
    );
  });

  console.log("\nRead as a multi-week trend, not a single week's verdict (CODEX 79 §3.3 sample-size caveat).");
  console.log("This is one blended ceiling number — CODEX 81 §4's trust-vs-structural split isn't in the data yet.");
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
