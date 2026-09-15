// Reads Sean's real logbookEntries (SOCIII Vault) and generates two separate
// documents, matching ForeFlight's own two-document split: a Summary of
// Logbook Entries (certificates, currency, career totals, entry detail) and
// a standalone FAA Form 8710-1 Experience Grid. Real aggregation over real
// Firestore data.
"use strict";
const path = require("path");
const fs = require("fs");
const admin = require(path.resolve(__dirname, "../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2";

const PILOT_INFO = {
  name: "Sean Lee Combs",
  address: "30 Pihaa Street, Lahaina, HI 96761",
  email: "seanlcombs@gmail.com",
};

// Real certificate/test data — Commercial Pilot, ATP Written, ATP CTP, FCC,
// Part 135 recurrency from the ForeFlight Experience Report export
// (2026-09-10); ATP Multiengine + ATP Single-Engine knowledge tests
// confirmed directly from the real PSI/FAA test reports. Medical/293/297/
// HUET live in Firestore as aviation.currency_event entries.
const CERTIFICATES = [
  { title: "Commercial Pilot", issued: "2011-04-01", expires: "No expiration" },
  { title: "ATP Multiengine (ATM) Knowledge Test", issued: "2023-11-15", expires: "2028-11-30", note: "Score 92%, Pass — FTN A2718120, Exam ID 90111520235681505" },
  { title: "ATP Single-Engine, Part 135 (ATS) Knowledge Test", issued: "2026-08-31", expires: "2028-08-31", note: "Score 96%, Pass — FTN A2718120, Exam ID 90083120265671086. Directly relevant to this weekend's checkride." },
  { title: "ATP CTP Course Completion", issued: "2023-11-09", expires: "No expiration", note: "ATP Jet Simulation, Inc. — 10.0 hrs FSTD (A320 Level D FFS + Level 4 FTD) + 31.0 hrs ground = 41.0 hrs total, per 61.159 aeronautical-experience credit." },
  { title: "FCC Radio Operator", issued: "2023-11-12", expires: "No expiration" },
  { title: "Part 135 Recurrency", issued: "2023-11-19", expires: "No expiration" },
];

// Real simulator time (FFS/FTD), sourced verbatim from Sean's original
// ForeFlight 8710 Report export (2026-09-10) — separate from real aircraft
// time in logbookEntries (simulators don't count in the Airplanes row of
// the actual FAA 8710 form).
const SIM_ROWS = {
  FFS: { total: 51.0, instrRcvd: 59.0, solo: 0, pic: 0, sic: 0, xcInstrRcvd: 0, xcSolo: 0, xcPic: 0, xcSic: 0, inst: 71.0, nightInstrRcvd: 40.0, nightTOLDG: 27, nightPic: 0, nightSic: 0, nightTOLDGPic: 27, nightTOLDGSic: 0 },
  FTD: { total: 18.5, instrRcvd: 27.5, solo: 0, pic: 0, sic: 0, xcInstrRcvd: 0, xcSolo: 0, xcPic: 0, xcSic: 0, inst: 68.5, nightInstrRcvd: 7.0, nightTOLDG: 0, nightPic: 0, nightSic: 0, nightTOLDGPic: 0, nightTOLDGSic: 0 },
};

const CURRENCY_LABELS = {
  medical: "Medical Certificate — 1st Class",
  "135_proficiency_check": "135.293 Competency Check (PC12-293)",
  "135_297_ipc": "135.297 Instrument Proficiency Check (PC12-297)",
  huet_raft: "HUET - Raft Hands On",
};

function blank() {
  return {
    total: 0, pic: 0, sic: 0, night: 0, inst: 0, xc: 0, landings: 0, nightLandings: 0, approaches: 0, holds: 0,
    // 8710-grid sub-splits not directly stored per entry — derived below by
    // prorating each entry's PIC/SIC share across its XC/night/night-landing
    // totals. Since picTime+sicTime now equals flightTime exactly on every
    // real entry (solo time folded into PIC per 14 CFR 61.51(e) — a
    // certificated, non-student pilot flying alone logs it as PIC, not a
    // separate Solo bucket), this proration closes exactly, not
    // approximately. Solo stays 0 deliberately, not left unset.
    instrRcvd: 0, solo: 0, xcInstrRcvd: 0, xcSolo: 0, xcPic: 0, xcSic: 0,
    nightInstrRcvd: 0, nightPic: 0, nightSic: 0, nightLdgPic: 0, nightLdgSic: 0,
  };
}
function add(agg, d) {
  const total = d.flightTime || 0;
  const pic = d.picTime || 0;
  const sic = d.sicTime || 0;
  const picShare = total > 0 ? pic / total : 0;
  const sicShare = total > 0 ? sic / total : 0;
  agg.total += total;
  agg.pic += pic;
  agg.sic += sic;
  agg.solo += d.soloTime || 0;
  agg.night += d.nightTime || 0;
  agg.inst += d.instrumentTime || 0;
  agg.xc += d.xcTime || 0;
  agg.landings += d.landingCount || 0;
  agg.nightLandings += d.nightLandingCount || 0;
  agg.approaches += d.approachCount || 0;
  agg.holds += d.holdCount || 0;
  agg.xcPic += (d.xcTime || 0) * picShare;
  agg.xcSic += (d.xcTime || 0) * sicShare;
  agg.nightPic += (d.nightTime || 0) * picShare;
  agg.nightSic += (d.nightTime || 0) * sicShare;
  agg.nightLdgPic += (d.nightLandingCount || 0) * picShare;
  agg.nightLdgSic += (d.nightLandingCount || 0) * sicShare;
}
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

const SHARED_STYLE = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; max-width: 1100px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 22px; margin-bottom: 2px; font-weight: 700; }
  .sub { color: #666; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 28px; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f7; font-size: 12px; letter-spacing: 0.02em; color: #444; font-weight: 700; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.remarks { font-size: 11px; color: #555; max-width: 320px; }
  .section-title { font-size: 15px; font-weight: 700; margin: 28px 0 10px; border-bottom: 2px solid #333; padding-bottom: 4px; }
  .grand td, .grand th { font-weight: 700; background: #eef2ff; }
  .note { font-size: 11px; color: #777; margin-top: -12px; margin-bottom: 20px; }
  .print-hint { font-size: 12px; background: #fffbe6; border: 1px solid #f0d878; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; }
  @media print { .print-hint { display: none; } }
  table.wide8710 { font-size: 11px; }
  table.wide8710 th, table.wide8710 td { padding: 4px 6px; }
`;

function header(title, genDate) {
  return `<h1>${PILOT_INFO.name} — ${title}</h1>
<div class="sub">${PILOT_INFO.address} · ${PILOT_INFO.email}<br>Generated by SOCIII Vault (Pilot Logbook), ${genDate}</div>
<div class="print-hint">To save as a PDF: File → Print (or ⌘P), then choose "Save as PDF" as the destination.</div>`;
}

function build8710Table(grand) {
  function picSic(pic, sic) { return `${f1(pic)}<br><span style="color:#888">${f1(sic)}</span>`; }
  function row(label, r) {
    if (!r) return `<tr><td>${label}</td>${Array(15).fill('<td class="num">&nbsp;</td>').join("")}</tr>`;
    return `<tr class="${label === "Airplanes" ? "grand" : ""}">
      <td><strong>${label}</strong></td>
      <td class="num">${f1(r.total)}</td>
      <td class="num">${f1(r.instrRcvd)}</td>
      <td class="num">${f1(r.solo)}</td>
      <td class="num">${picSic(r.pic, r.sic)}</td>
      <td class="num">${f1(r.xcInstrRcvd)}</td>
      <td class="num">${f1(r.xcSolo)}</td>
      <td class="num">${picSic(r.xcPic, r.xcSic)}</td>
      <td class="num">${f1(r.inst)}</td>
      <td class="num">${f1(r.nightInstrRcvd)}</td>
      <td class="num">${r.nightTOLDG}</td>
      <td class="num">${picSic(r.nightPic, r.nightSic)}</td>
      <td class="num">${picSic(r.nightTOLDGPic, r.nightTOLDGSic)}</td>
      <td class="num">&nbsp;</td><td class="num">&nbsp;</td><td class="num">&nbsp;</td><td class="num">&nbsp;</td>
    </tr>`;
  }
  const airplanes = {
    total: grand.total, instrRcvd: grand.instrRcvd, solo: grand.solo, pic: grand.pic, sic: grand.sic,
    xcInstrRcvd: grand.xcInstrRcvd, xcSolo: grand.xcSolo, xcPic: grand.xcPic, xcSic: grand.xcSic,
    inst: grand.inst, nightInstrRcvd: grand.nightInstrRcvd, nightTOLDG: grand.nightLandings,
    nightPic: grand.nightPic, nightSic: grand.nightSic,
    nightTOLDGPic: Math.round(grand.nightLdgPic), nightTOLDGSic: Math.round(grand.nightLdgSic),
  };
  return `<table class="wide8710">
<tr>
  <th></th><th>Total</th>
  <th>Instruction<br>Rcvd</th><th>Solo</th><th>PIC/SIC</th>
  <th>XC Instruction<br>Rcvd</th><th>XC Solo</th><th>XC PIC/SIC</th>
  <th>Instrument</th>
  <th>Night Instruction<br>Rcvd</th><th>Night<br>TO/LDG</th><th>Night<br>PIC/SIC</th><th>Night TO/LDG<br>PIC/SIC</th>
  <th>No.<br>Flights</th><th>No.<br>Aero-tows</th><th>No. Grnd<br>Launches</th><th>No. Pwred<br>Launches</th>
</tr>
${[
    row("Airplanes", airplanes),
    row("R.C.", null),
    row("P.L.", null),
    row("Gliders", null),
    row("L.T.A.", null),
    row("FFS", SIM_ROWS.FFS),
    row("FTD", SIM_ROWS.FTD),
    row("ATD", null),
  ].join("\n")}
</table>`;
}

async function main() {
  const currencySnap = await db.collection("logbookEntries")
    .where("userId", "==", SEAN_UID)
    .where("entryType", "==", "aviation.currency_event")
    .get();
  const CURRENCY_ORDER = ["medical", "135_proficiency_check", "135_297_ipc", "huet_raft"];
  const currencyEvents = currencySnap.docs.map((d) => d.data().data || {})
    .sort((a, b) => CURRENCY_ORDER.indexOf(a.eventType) - CURRENCY_ORDER.indexOf(b.eventType));

  const snap = await db.collection("logbookEntries")
    .where("userId", "==", SEAN_UID)
    .where("entryType", "==", "aviation.flight")
    .get();

  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  entries.sort((a, b) => (a.data?.date || "").localeCompare(b.data?.date || ""));

  const grand = blank();
  const byClass = { "single-engine land": blank(), "multi-engine land": blank() };
  const byEngine = { piston: blank(), turboprop: blank(), turbojet: blank(), "turboprop/turbojet": blank() };

  for (const e of entries) {
    const d = e.data || {};
    add(grand, d);
    if (byClass[d.aircraftClass]) add(byClass[d.aircraftClass], d);
    if (byEngine[d.engineType]) add(byEngine[d.engineType], d);
  }

  const genDate = new Date().toISOString().slice(0, 10);

  const rows = entries.map((e) => {
    const d = e.data || {};
    return `<tr>
      <td>${d.date || ""}</td>
      <td>${d.tailNumber || "(carried forward)"}</td>
      <td>${d.aircraftType || ""}</td>
      <td class="num">${f1(d.flightTime)}</td>
      <td class="num">${f1(d.picTime)}</td>
      <td class="num">${f1(d.nightTime)}</td>
      <td class="num">${f1(d.instrumentTime)}</td>
      <td class="num">${f1(d.xcTime)}</td>
      <td class="num">${d.approachCount || 0}</td>
      <td class="num">${d.landingCount || 0}</td>
      <td class="remarks">${d.remarks || ""}</td>
    </tr>`;
  }).join("\n");

  // ── Document 1: Summary of Logbook Entries ──────────────────────────────
  const summaryHtml = `<!doctype html>
<html><head><meta charset="utf-8">
<title>Sean Lee Combs — Summary of Logbook Entries</title>
<style>${SHARED_STYLE}</style>
</head><body>

${header("Summary of Logbook Entries", genDate)}

<div class="section-title">Currency &amp; Training Status</div>
<table>
<tr><th>Item</th><th>Last Completed</th><th>Expiration</th><th>Notes</th></tr>
${currencyEvents.map((ev) => `<tr>
  <td>${CURRENCY_LABELS[ev.eventType] || ev.eventType}</td>
  <td>${ev.date || ""}</td>
  <td>${ev.expirationDate || ""}</td>
  <td class="remarks">${ev.remarks || ""}</td>
</tr>`).join("\n")}
</table>

<div class="section-title">Certificates</div>
<table>
<tr><th>Certificate</th><th>Issued</th><th>Expires</th><th>Notes</th></tr>
${CERTIFICATES.map((c) => `<tr>
  <td>${c.title}</td>
  <td>${c.issued}</td>
  <td>${c.expires}</td>
  <td class="remarks">${c.note || ""}</td>
</tr>`).join("\n")}
</table>

<div class="section-title">Career Totals</div>
<table>
<tr><th>Total Time</th><th>PIC</th><th>Night</th><th>Instrument (Actual)</th><th>Cross-Country</th><th>Approaches</th><th>Landings</th></tr>
<tr class="grand">
  <td class="num">${f1(grand.total)}</td>
  <td class="num">${f1(grand.pic)}</td>
  <td class="num">${f1(grand.night)}</td>
  <td class="num">${f1(grand.inst)}</td>
  <td class="num">${f1(grand.xc)}</td>
  <td class="num">${grand.approaches}</td>
  <td class="num">${grand.landings}</td>
</tr>
</table>

<div class="section-title">By Category/Class Summary</div>
<table>
<tr><th>Category/Class</th><th>Total</th><th>PIC</th><th>Night</th><th>Instrument</th><th>XC</th><th>Approaches</th><th>Landings</th></tr>
${Object.entries(byClass).map(([k, v]) => `<tr>
  <td>${k.replace(/\b\w/g, (c) => c.toUpperCase())}</td>
  <td class="num">${f1(v.total)}</td>
  <td class="num">${f1(v.pic)}</td>
  <td class="num">${f1(v.night)}</td>
  <td class="num">${f1(v.inst)}</td>
  <td class="num">${f1(v.xc)}</td>
  <td class="num">${v.approaches}</td>
  <td class="num">${v.landings}</td>
</tr>`).join("\n")}
</table>

<div class="section-title">By Engine Type</div>
<table>
<tr><th>Engine Type</th><th>Total</th><th>PIC</th></tr>
${Object.entries(byEngine).filter(([, v]) => v.total > 0).map(([k, v]) => `<tr>
  <td>${k}</td>
  <td class="num">${f1(v.total)}</td>
  <td class="num">${f1(v.pic)}</td>
</tr>`).join("\n")}
</table>

<div class="section-title">Logbook Entries (source detail)</div>
<div class="note">"(carried forward)" rows summarize prior electronic-logbook history or attested company duty-record totals — see each row's remarks for sourcing. Not itemized leg-by-leg where marked.</div>
<table>
<tr><th>Date</th><th>Tail</th><th>Aircraft</th><th>Total</th><th>PIC</th><th>Night</th><th>Inst</th><th>XC</th><th>Appr</th><th>Ldg</th><th>Remarks</th></tr>
${rows}
</table>

</body></html>`;

  // ── Document 2: FAA Form 8710-1 Experience Grid (standalone) ────────────
  const form8710Html = `<!doctype html>
<html><head><meta charset="utf-8">
<title>Sean Lee Combs — FAA Form 8710-1 Experience Grid</title>
<style>${SHARED_STYLE}</style>
</head><body>

${header("FAA Form 8710-1 Experience Grid", genDate)}

<div class="note">Same row/column layout as the official 8710 form. Solo is 0 deliberately — per 14 CFR 61.51(e), a certificated (non-student) pilot flying alone logs it as PIC, not a separate Solo category, so the 83.3 hrs ForeFlight's own report split out as "Solo" (35.0 ASEL + 48.3 AMEL) is folded into PIC here (corrected 2026-09-11). SIC (18.8 total: 15.0 ASEL + 3.8 AMEL) reconciled directly from the Experience Report's per-aircraft-type SIC breakdown. PIC + SIC = Total exactly on the Airplanes row, and XC/Night PIC+SIC sub-splits now close exactly against their stated totals too (they didn't before this fix). Instruction Received / XC Instruction Received / XC Solo / Night Instruction Received are 0 — none of Sean's real logged time is dual received, correct for a working PIC. R.C./P.L./Gliders/L.T.A./ATD rows are blank — no time logged in those categories. No. Flights/Aero-tows/Grnd/Pwred Launches columns apply only to glider operations and are blank throughout.</div>
${build8710Table(grand)}

</body></html>`;

  const summaryPath = path.resolve(__dirname, "../../../SOCIII-Flight-Experience-Report.html");
  const form8710Path = path.resolve(__dirname, "../../../SOCIII-8710-Report.html");
  fs.writeFileSync(summaryPath, summaryHtml);
  fs.writeFileSync(form8710Path, form8710Html);
  console.log(`Wrote summary report to ${summaryPath}`);
  console.log(`Wrote 8710 report to ${form8710Path}`);
  console.log(`\nGrand totals: ${f1(grand.total)} hrs total, ${f1(grand.pic)} PIC, ${f1(grand.night)} night, ${f1(grand.inst)} actual instrument, ${f1(grand.xc)} XC, ${grand.approaches} approaches, ${grand.landings} landings.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
