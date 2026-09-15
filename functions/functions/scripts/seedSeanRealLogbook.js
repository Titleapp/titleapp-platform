// Real data load — Sean's actual SOCIII Vault logbook (WResykI56hW16silsOtvlw1UjJK2,
// tenant ws_1779846027006_hc71aw). NOT a demo/test script — no `demo: true`,
// never wiped by a demo-reset job.
//
// Two baseline "carried forward" entries (same real pattern already used in
// scripts/demo/seedSkyePilotDemo.js for exactly this scenario — a handful of
// category-level entries summarizing a prior electronic logbook, not
// thousands of fabricated individual legs) sourced directly from Sean's real
// ForeFlight exports (Complete-Logbook-Report-2-Page.pdf / Experience-Report.pdf,
// both as of 2026-09-10, career total 3133.6 hrs through last ForeFlight entry
// 12/11/24). Night/actual-instrument/XC/approaches/landings are prorated
// between ASEL and AMEL by each category's share of total time — ForeFlight's
// own category tables don't break those out per-category, only in aggregate,
// so this is a reasonable, clearly-labeled approximation for a carry-forward
// summary line, not a claim of leg-by-leg precision.
//
// Plus two new, real 2026 entries (Sep 1 2025 - Sep 1 2026, Life Flight
// Network Hawaii ops, PC-12/47E) built from Sean's own attested totals
// (215.0 hrs PIC / 167.0 night / 175.0 actual instrument / 300 approaches /
// 300 landings / all cross-country), split N662LF/N661LF ~20/80 per his
// own count — see chat record for the full derivation. FlightVector (LFN's
// ops system) doesn't export per-flight data, only blanket totals, so this
// is an attested summary entry, exactly the same legitimacy as his own
// pre-1992 "XFER - No Dest" entries already in the ForeFlight logbook.
"use strict";
const path = require("path");
const admin = require(path.resolve(__dirname, "../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2";
const SEAN_TENANT = "ws_1779846027006_hc71aw";
const now = () => admin.firestore.FieldValue.serverTimestamp();

// ForeFlight career totals as of the 2026-09-10 export (career total, through
// last real ForeFlight entry 12/11/24 — see Experience-Report.pdf EXPERIENCE
// table, "Totals" row for AIRPLANE).
const CAREER_TOTAL = 3133.6;
const CAREER_NIGHT = 1277.7;
const CAREER_ACTUAL_INST = 1575.3;
const CAREER_XC = 2559.7;
const CAREER_LDG_DAY = 831;
const CAREER_LDG_NIGHT = 655;
const CAREER_APPROACHES = 178; // instrument-training page running total, Complete-Logbook-Report p.16

const ASEL_TOTAL = 2188.0, ASEL_PIC = 2138.0;
const AMEL_TOTAL = 945.6, AMEL_PIC = 893.5;
const aselShare = ASEL_TOTAL / CAREER_TOTAL;
const amelShare = AMEL_TOTAL / CAREER_TOTAL;
const r1 = (n) => Math.round(n * 10) / 10;

const baselineDocs = [
  {
    tailNumber: null,
    aircraftType: "Various (Cessna/Piper/Cirrus/Bonanza, piston single-engine — see logbook PDF)",
    aircraftCategory: "airplane",
    aircraftClass: "single-engine land",
    engineType: "piston",
    date: "2024-12-11", // last real ForeFlight entry date — this is when Vault carries the balance forward from
    depIcao: null,
    arrIcao: null,
    flightTime: ASEL_TOTAL,
    picTime: ASEL_PIC,
    sicTime: 0,
    nightTime: r1(CAREER_NIGHT * aselShare),
    instrumentTime: r1(CAREER_ACTUAL_INST * aselShare),
    xcTime: r1(CAREER_XC * aselShare),
    landingCount: Math.round((CAREER_LDG_DAY + CAREER_LDG_NIGHT) * aselShare),
    nightLandingCount: Math.round(CAREER_LDG_NIGHT * aselShare),
    approachCount: Math.round(CAREER_APPROACHES * aselShare),
    holdCount: 0,
    flightType: "part91",
    carriedForward: true,
    remarks: `Time carried forward from ForeFlight electronic logbook (career total through 12/11/24) — ${ASEL_TOTAL.toFixed(1)} hrs ASEL, piston. Not itemized leg-by-leg; night/actual-instrument/XC/approaches prorated from career aggregate by category time-share. Source: ForeFlight Complete Logbook Report / Experience Report, exported 2026-09-10.`,
  },
  {
    tailNumber: null,
    aircraftType: "King Air 90/C90/B200, E175, A320 (AMEL — see logbook PDF)",
    aircraftCategory: "airplane",
    aircraftClass: "multi-engine land",
    engineType: "turboprop/turbojet",
    date: "2024-12-11",
    depIcao: null,
    arrIcao: null,
    flightTime: AMEL_TOTAL,
    picTime: AMEL_PIC,
    sicTime: r1(AMEL_TOTAL - AMEL_PIC),
    nightTime: r1(CAREER_NIGHT * amelShare),
    instrumentTime: r1(CAREER_ACTUAL_INST * amelShare),
    xcTime: r1(CAREER_XC * amelShare),
    landingCount: Math.round((CAREER_LDG_DAY + CAREER_LDG_NIGHT) * amelShare),
    nightLandingCount: Math.round(CAREER_LDG_NIGHT * amelShare),
    approachCount: Math.round(CAREER_APPROACHES * amelShare),
    holdCount: 0,
    flightType: "part135",
    carriedForward: true,
    remarks: `Time carried forward from ForeFlight electronic logbook (career total through 12/11/24) — ${AMEL_TOTAL.toFixed(1)} hrs AMEL, turboprop/turbojet (King Air family, E175, A320). Not itemized leg-by-leg; night/actual-instrument/XC/approaches prorated from career aggregate by category time-share. Source: ForeFlight Complete Logbook Report / Experience Report, exported 2026-09-10.`,
  },
];

// 2026 LFN attested summary entries — real per Sean's own numbers, split by
// tail per his stated ~80/20 (661LF/662LF) ratio. See chat record 2026-09-10/11.
const LFN_TOTAL = 215.0, LFN_NIGHT = 167.0, LFN_INST = 175.0, LFN_APPR = 300, LFN_LDG = 300;
const split661 = 0.8, split662 = 0.2;
const r1v = (n) => Math.round(n * 10) / 10;

const lfnDocs = [
  {
    tailNumber: "N662LF",
    aircraftType: "Pilatus PC-12/47E",
    aircraftCategory: "airplane",
    aircraftClass: "single-engine land",
    engineType: "turbine",
    date: "2026-09-01",
    depIcao: null,
    arrIcao: null,
    flightTime: r1v(LFN_TOTAL * split662),
    picTime: r1v(LFN_TOTAL * split662),
    sicTime: 0,
    nightTime: r1v(LFN_NIGHT * split662),
    instrumentTime: r1v(LFN_INST * split662),
    xcTime: r1v(LFN_TOTAL * split662),
    landingCount: Math.round(LFN_LDG * split662),
    nightLandingCount: Math.round(LFN_LDG * split662 * (LFN_NIGHT / LFN_TOTAL)),
    approachCount: Math.round(LFN_APPR * split662),
    holdCount: 0,
    flightType: "part135",
    carriedForward: true,
    remarks: "Attested summary entry — Life Flight Network Hawaii ops, 09/01/25-09/01/26. FlightVector (LFN duty/ops system) does not export per-flight data, only blanket totals; consolidated here per Sean's own attested records rather than itemized leg-by-leg. Routes: PHNL/PHTO/PHKO/PHOG/PHMU/PHLI/PHNY.",
  },
  {
    tailNumber: "N661LF",
    aircraftType: "Pilatus PC-12/47E",
    aircraftCategory: "airplane",
    aircraftClass: "single-engine land",
    engineType: "turbine",
    date: "2026-09-01",
    depIcao: null,
    arrIcao: null,
    flightTime: r1v(LFN_TOTAL * split661),
    picTime: r1v(LFN_TOTAL * split661),
    sicTime: 0,
    nightTime: r1v(LFN_NIGHT * split661),
    instrumentTime: r1v(LFN_INST * split661),
    xcTime: r1v(LFN_TOTAL * split661),
    landingCount: Math.round(LFN_LDG * split661),
    nightLandingCount: Math.round(LFN_LDG * split661 * (LFN_NIGHT / LFN_TOTAL)),
    approachCount: Math.round(LFN_APPR * split661),
    holdCount: 0,
    flightType: "part135",
    carriedForward: true,
    remarks: "Attested summary entry — Life Flight Network Hawaii ops, 09/01/25-09/01/26. Includes 4.0 hrs PIC check with company check airman Noel McDermot, sole manipulator of controls (not dual received). FlightVector (LFN duty/ops system) does not export per-flight data, only blanket totals; consolidated here per Sean's own attested records rather than itemized leg-by-leg. Routes: PHNL/PHTO/PHKO/PHOG/PHMU/PHLI/PHNY.",
  },
];

async function main() {
  const logCol = db.collection("logbookEntries");
  const allDocs = [...baselineDocs, ...lfnDocs];
  for (const d of allDocs) {
    const ref = await logCol.add({
      userId: SEAN_UID,
      tenantId: SEAN_TENANT,
      entryType: "aviation.flight",
      data: d,
      createdAt: now(),
      source: "seedSeanRealLogbook",
    });
    console.log(`• Wrote ${d.tailNumber || d.aircraftClass} — ${d.flightTime} hrs (${ref.id})`);
  }
  const total = allDocs.reduce((s, d) => s + d.flightTime, 0);
  console.log(`\nTotal written: ${total.toFixed(1)} hrs across ${allDocs.length} entries.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
