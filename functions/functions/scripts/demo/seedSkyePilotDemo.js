// Seed the SKYE demo pilot — Marcus Reyes, line pilot at Pacific Air Partners
// (persona "skye-pilot", /demo/skye). Populates his real logbook
// (logbookEntries, entryType aviation.flight / aviation.currency_event) so
// GET /v1/pilot:currency and GET /v1/logbook:list compute for real instead
// of showing "no logbook data yet."
//
// Profile (Sean's spec for this test account):
//   - 5,000 total hours: 3,500 turbine multi-engine (King Air B200) +
//     1,500 piston single-engine (Cirrus SR22). Seeded as a small number of
//     large "time carried forward" baseline entries (carriedForward: true,
//     the real electronic-logbook-migration pattern — nobody re-enters a
//     20-year paper logbook leg by leg) PLUS a handful of recent, real-dated
//     individual flights that also feed the 90-day/6-month recency windows,
//     so the two totals still add up exactly to 3,500 / 1,500.
//   - BFR: current, well within 24 months.
//   - IPC (61.57): current, well within 6 months.
//   - 135.293 (competency check) AND 135.297 (instrument proficiency check):
//     BOTH set to expire within 30 days of whenever this script actually
//     runs (computed from `new Date()` at run time, not a hardcoded date —
//     see DAYS_OUT_* below) — landing in bandFor()'s YELLOW band (days <=
//     30) as two SEPARATE items. This is the real reason
//     services/aviation/pilotCurrency.js got a distinct `ipc297` field
//     (2026-09-05 addendum) instead of continuing to collapse both into one
//     `typeRecurrent` slot.
//   - Medical (1st class): also expiring within 30 days, same YELLOW-band
//     treatment — an explicit near-term expirationDate rather than deriving
//     it from the FAA's age-based 6/12-calendar-month duration table (not
//     load-bearing for this test).
//   - 90-day day/night landings and 6-month approaches/holds: seeded current
//     (GREEN) via the recent flights below.
//
// Idempotent — clears all demo:true logbookEntries for this uid before
// writing (same pattern as scripts/demo/seedTitleDemo.js).
//
// Run from functions/functions/:
//   NODE_PATH=./node_modules node scripts/demo/seedSkyePilotDemo.js
"use strict";

const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const SKYE_UID = "demo-skye-pilot-001";
const SKYE_TENANT = "demo-pacific-air-001"; // Pacific Air Partners — same tenant as the `aviation` persona

const now = () => admin.firestore.FieldValue.serverTimestamp();

// Real-server-date math — recomputed every time this script runs, so the
// YELLOW-band currency items stay "due within 30 days" whenever this is
// actually re-seeded, instead of drifting into RED (expired) or GREEN (no
// longer a useful test case) as real time passes.
function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function isoDaysAgo(days) {
  return isoDaysFromNow(-days);
}

// CODEX S52.65 follow-up (2026-09-07): exported (was a bare `main()` call
// ending in process.exit()) so a scheduled Cloud Function can require() and
// invoke this to periodically restore /demo/skye's shared demo tenant —
// re-running this naturally keeps the currency-expiration dates correctly
// "within 30 days of now" too, which this script already computed at run
// time by design. require.main guard below preserves standalone CLI usage.
async function main() {
  const logCol = db.collection("logbookEntries");

  // ── Reset — clear this pilot's demo logbook entries before reseeding ──────
  const existing = await logCol.where("userId", "==", SKYE_UID).where("demo", "==", true).get();
  if (!existing.empty) {
    const batches = [];
    let batch = db.batch();
    let n = 0;
    existing.docs.forEach((d) => {
      batch.delete(d.ref);
      n++;
      if (n % 400 === 0) { batches.push(batch.commit()); batch = db.batch(); }
    });
    batches.push(batch.commit());
    await Promise.all(batches);
  }
  console.log(`• Cleared ${existing.size} existing SKYE demo logbook entries`);

  // ── Recent, real-dated flights (feed 90-day/6-month recency + a slice of ──
  // ── the career total) ──────────────────────────────────────────────────
  // King Air B200 (N704AA) — turbine, multi-engine land. Pacific Air's real
  // twin-turboprop charter aircraft (same tail already established for this
  // tenant in seedSpineCanvasDemo.js's accounting ledger).
  const RECENT_TURBINE_ME = [
    { daysAgo: 4,  depIcao: "KVNY", arrIcao: "KASE", flightTime: 2.6, landingCount: 1, nightLandingCount: 0, approachCount: 2, holdCount: 0, flightType: "part135", remarks: "Charter — Van Nuys to Aspen" },
    { daysAgo: 11, depIcao: "KASE", arrIcao: "KVNY", flightTime: 2.4, landingCount: 1, nightLandingCount: 1, approachCount: 1, holdCount: 1, flightType: "part135", remarks: "Charter return leg — night arrival KVNY" },
    { daysAgo: 19, depIcao: "KVNY", arrIcao: "KJAC", flightTime: 2.1, landingCount: 1, nightLandingCount: 0, approachCount: 2, holdCount: 0, flightType: "part135", remarks: "Charter — Van Nuys to Jackson Hole" },
    { daysAgo: 27, depIcao: "KJAC", arrIcao: "KVNY", flightTime: 2.0, landingCount: 1, nightLandingCount: 1, approachCount: 1, holdCount: 0, flightType: "part135", remarks: "Charter return leg — night arrival KVNY" },
  ];
  const turbineRecentTotal = RECENT_TURBINE_ME.reduce((s, f) => s + f.flightTime, 0); // 9.1

  // Cirrus SR22 G5 (N705AA) — piston, single-engine land. Pacific Air's
  // training/proficiency aircraft (same tail established elsewhere for this
  // tenant).
  const RECENT_PISTON_SE = [
    { daysAgo: 8,  depIcao: "KVNY", arrIcao: "KSMO", flightTime: 1.1, landingCount: 2, nightLandingCount: 0, approachCount: 2, holdCount: 0, flightType: "training", remarks: "Instrument proficiency practice — ILS/RNAV KSMO" },
    { daysAgo: 22, depIcao: "KSMO", arrIcao: "KVNY", flightTime: 1.0, landingCount: 2, nightLandingCount: 1, approachCount: 1, holdCount: 0, flightType: "training", remarks: "Night currency + approach practice" },
  ];
  const pistonRecentTotal = RECENT_PISTON_SE.reduce((s, f) => s + f.flightTime, 0); // 2.1

  const CAREER_TURBINE_ME = 3500;
  const CAREER_PISTON_SE = 1500;
  const baselineTurbineME = Math.round((CAREER_TURBINE_ME - turbineRecentTotal) * 10) / 10; // 3490.9
  const baselinePistonSE = Math.round((CAREER_PISTON_SE - pistonRecentTotal) * 10) / 10;    // 1497.9

  const flightDocs = [];

  // ── Baseline "time carried forward" entries — the real electronic-logbook ──
  // migration pattern: a handful of large category-level entries, clearly
  // flagged, rather than thousands of fabricated individual legs.
  flightDocs.push({
    tailNumber: "N704AA",
    aircraftType: "King Air B200",
    aircraftCategory: "airplane",
    aircraftClass: "multi-engine land",
    engineType: "turbine",
    date: isoDaysAgo(365 * 4), // logged when this Vault logbook was first migrated
    depIcao: null,
    arrIcao: null,
    flightTime: baselineTurbineME,
    picTime: baselineTurbineME,
    sicTime: 0,
    landingCount: 0,
    nightLandingCount: 0,
    approachCount: 0,
    holdCount: 0,
    flightType: "part135",
    carriedForward: true,
    remarks: `Time carried forward from prior paper/electronic logbooks — ${baselineTurbineME.toFixed(1)} hrs turbine multi-engine (King Air B200 and prior twin-turboprop types), migrated on Vault setup. Not itemized leg-by-leg; see individual recent flights below for current entries.`,
  });
  flightDocs.push({
    tailNumber: "N705AA",
    aircraftType: "Cirrus SR22 G5",
    aircraftCategory: "airplane",
    aircraftClass: "single-engine land",
    engineType: "piston",
    date: isoDaysAgo(365 * 4),
    depIcao: null,
    arrIcao: null,
    flightTime: baselinePistonSE,
    picTime: baselinePistonSE,
    sicTime: 0,
    landingCount: 0,
    nightLandingCount: 0,
    approachCount: 0,
    holdCount: 0,
    flightType: "part91",
    carriedForward: true,
    remarks: `Time carried forward from prior paper/electronic logbooks — ${baselinePistonSE.toFixed(1)} hrs piston single-engine (Cirrus SR22 and prior single-engine types), migrated on Vault setup. Not itemized leg-by-leg; see individual recent flights below for current entries.`,
  });

  // ── Recent, individual, real-dated flights ────────────────────────────────
  RECENT_TURBINE_ME.forEach((f) => flightDocs.push({
    tailNumber: "N704AA",
    aircraftType: "King Air B200",
    aircraftCategory: "airplane",
    aircraftClass: "multi-engine land",
    engineType: "turbine",
    date: isoDaysAgo(f.daysAgo),
    depIcao: f.depIcao,
    arrIcao: f.arrIcao,
    flightTime: f.flightTime,
    picTime: f.flightTime,
    sicTime: 0,
    landingCount: f.landingCount,
    nightLandingCount: f.nightLandingCount,
    approachCount: f.approachCount,
    holdCount: f.holdCount,
    flightType: f.flightType,
    carriedForward: false,
    remarks: f.remarks,
  }));
  RECENT_PISTON_SE.forEach((f) => flightDocs.push({
    tailNumber: "N705AA",
    aircraftType: "Cirrus SR22 G5",
    aircraftCategory: "airplane",
    aircraftClass: "single-engine land",
    engineType: "piston",
    date: isoDaysAgo(f.daysAgo),
    depIcao: f.depIcao,
    arrIcao: f.arrIcao,
    flightTime: f.flightTime,
    picTime: f.flightTime,
    sicTime: 0,
    landingCount: f.landingCount,
    nightLandingCount: f.nightLandingCount,
    approachCount: f.approachCount,
    holdCount: f.holdCount,
    flightType: f.flightType,
    carriedForward: false,
    remarks: f.remarks,
  }));

  for (const d of flightDocs) {
    await logCol.add({
      userId: SKYE_UID,
      tenantId: SKYE_TENANT,
      entryType: "aviation.flight",
      demo: true,
      data: d,
      createdAt: now(),
      source: "seedSkyePilotDemo",
    });
  }
  const totalLogged = flightDocs.reduce((s, d) => s + d.flightTime, 0);
  console.log(`• Wrote ${flightDocs.length} aviation.flight entries (${totalLogged.toFixed(1)} hrs total — ${CAREER_TURBINE_ME} turbine-ME target / ${CAREER_PISTON_SE} piston-SE target)`);

  // ── Currency events ────────────────────────────────────────────────────────
  // bfr — current, well within 24 months (14 months ago → ~10 months remaining)
  const bfrDate = isoDaysAgo(30 * 14);
  // ipc (61.57) — current, well within 6 months (2 months ago → ~4 months remaining)
  const ipcDate = isoDaysAgo(30 * 2);
  // medical — 1st class, explicit near-term expiration (22 days out): YELLOW
  const medicalExpiration = isoDaysFromNow(22);
  // 135.293 competency check — explicit near-term expiration (25 days out): YELLOW
  const competencyExpiration = isoDaysFromNow(25);
  // 135.297 IPC — explicit near-term expiration (18 days out, deliberately a
  // DIFFERENT day than 135.293 above so the two show as clearly separate
  // items, not a single coincidentally-matching date): YELLOW
  const ipc297Expiration = isoDaysFromNow(18);

  const eventDocs = [
    { eventType: "bfr", date: bfrDate, aircraftType: "King Air B200", remarks: "Flight review — King Air B200, current." },
    { eventType: "ipc", date: ipcDate, aircraftType: "King Air B200", remarks: "Instrument proficiency check (61.57) — current." },
    { eventType: "medical", date: isoDaysAgo(30 * 5), expirationDate: medicalExpiration, medicalClass: "Class 1", remarks: "1st class medical — approaching expiration." },
    { eventType: "135_proficiency_check", date: isoDaysAgo(30 * 11), expirationDate: competencyExpiration, aircraftType: "King Air B200", remarks: "14 CFR 135.293 competency check — due soon." },
    { eventType: "135_297_ipc", date: isoDaysAgo(30 * 5), expirationDate: ipc297Expiration, aircraftType: "King Air B200", remarks: "14 CFR 135.297 instrument proficiency check — due soon (distinct from 135.293 above)." },
  ];
  for (const ev of eventDocs) {
    await logCol.add({
      userId: SKYE_UID,
      tenantId: SKYE_TENANT,
      entryType: "aviation.currency_event",
      demo: true,
      data: ev,
      createdAt: now(),
      source: "seedSkyePilotDemo",
    });
  }
  console.log(`• Wrote ${eventDocs.length} aviation.currency_event entries`);
  console.log(`  - BFR: ${bfrDate} (current)`);
  console.log(`  - IPC (61.57): ${ipcDate} (current)`);
  console.log(`  - Medical (1st class): expires ${medicalExpiration} (YELLOW — due within 30 days)`);
  console.log(`  - 135.293 competency: expires ${competencyExpiration} (YELLOW — due within 30 days)`);
  console.log(`  - 135.297 IPC: expires ${ipc297Expiration} (YELLOW — due within 30 days, distinct from 135.293)`);

  console.log("\n✓ SKYE demo pilot (Marcus Reyes, demo-skye-pilot-001) seeded.");
}

module.exports = { seedSkyePilotDemo: main };

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
