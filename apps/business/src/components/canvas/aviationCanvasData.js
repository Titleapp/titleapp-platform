// Aviation worker canvas data — demo/sample specs for CoPilot, Dispatch, and MX.
// Rendered by AviationWorkerCanvas.jsx using the same block types as reCanvasData.js.
// Aircraft-agnostic: no PC-12 lock. Demo data uses "your aircraft" framing.
//
// Block types: heroes · kpis · flags · cards · table · bars · prose · map

export const AV_CAS = {
  RED:    { key: "RED",    dot: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  YELLOW: { key: "YELLOW", dot: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  BLUE:   { key: "BLUE",   dot: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  WHITE:  { key: "WHITE",  dot: "#64748b", bg: "#f8fafc", border: "#e2e8f0", text: "#475569" },
  GREEN:  { key: "GREEN",  dot: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
};
export const AV_CAS_ORDER = ["RED", "YELLOW", "BLUE", "WHITE", "GREEN"];
export const AV_CAS_LABELS = {
  RED: "no-go", YELLOW: "caution", BLUE: "advisory", WHITE: "reference", GREEN: "go",
};

// Flight category colors — used by weather blocks and map markers.
export const FLIGHT_CATEGORY = {
  VFR:  { label: "VFR",  color: "#16a34a", bg: "#f0fdf4" },
  MVFR: { label: "MVFR", color: "#2563eb", bg: "#eff6ff" },
  IFR:  { label: "IFR",  color: "#dc2626", bg: "#fef2f2" },
  LIFR: { label: "LIFR", color: "#9333ea", bg: "#faf5ff" },
};

export const AV_CANVAS = {

  // ─────────────────────────────── COPILOT ──────────────────────────────────
  "av-copilot-001": {
    title: "CoPilot",
    subtitle: "N662FW · PC-12/47E · Pacific Air Partners",
    disclaimer: "Advisory only — go/no-go authority rests with the PIC",
    cas: { RED: 0, YELLOW: 1, BLUE: 1, WHITE: 2, GREEN: 8 },
    tabs: [
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Your operational status at shift start — currency, aircraft, and any open items that need attention before the next flight.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "All currency current",  detail: "Medical · BFR · IFR · Type recurrent — all within limits" },
            { band: "GREEN",  title: "N662FW airworthy",      detail: "1 MEL deferred · Cat C · day/night ops OK" },
            { band: "YELLOW", title: "Type recurrent",        detail: "Due Oct 2026 · 71 days · schedule simulator now" },
          ] },
          { type: "kpis", items: [
            { label: "Medical",         value: "Class 1 · Dec 31 2026", band: "GREEN" },
            { label: "BFR",             value: "Feb 10 2026",           band: "GREEN" },
            { label: "IPC",             value: "Feb 10 2026",           band: "GREEN" },
            { label: "Type recurrent",  value: "Oct 2026",              band: "YELLOW" },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "NEXT TRIP", title: "KTEB → KPBI · Jul 21 2026", detail: "Meridian Waterfront Phase 2 · 4 pax · Depart 09:00 · Est 2.1 hrs · Preflight package ready", action: "Open Preflight" },
          ] },
        ],
      },
      {
        id: "preflight",
        label: "Preflight",
        description: "Your assembled go/no-go package for the next trip — weather, W&B, FRAT, and NOTAMs in one place. Alex built this from live data.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "FRAT score 8/50 · Low Risk", detail: "All risk categories within normal limits" },
            { band: "GREEN", title: "KTEB · VFR · 3000 OVC",      detail: "Vis 10SM · Wind 280/14 · 09:00 departure" },
            { band: "BLUE",  title: "KPBI · MVFR clearing",        detail: "800 OVC improving 1500+ by 10:30 · Monitor TAF" },
          ] },
          { type: "table", title: "Route weather snapshot", cols: ["Station", "Category", "Ceiling", "Vis", "Wind", "Temp"], rows: [
            ["KTEB", "VFR",        "3000 OVC",           "10SM", "280/14G22", "72°F"],
            ["KMCO", "VFR",        "SCT060",             "10SM", "250/08",    "86°F"],
            ["KPBI", "MVFR→VFR",  "800 OVC (improving)", "6SM",  "170/06",   "79°F"],
          ] },
          { type: "kpis", items: [
            { label: "FRAT score",   value: "8 / 50 Low",        band: "GREEN" },
            { label: "W&B status",   value: "9,847 lbs ✓",       band: "GREEN" },
            { label: "Fuel required", value: "312 gal / 420 cap", band: "GREEN" },
            { label: "ETE",          value: "2.1 hrs",            band: "WHITE" },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "NOTAM", title: "KPBI — ILS Rwy 10L out of service", detail: "NOTAM 06/23/2026 · Expect ILS 28L or visual 10R · Suitable alternates: KFLL (14nm) KOPF (54nm)", action: "Review" },
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "Go/no-go assessment", text: "Conditions support the flight. KPBI departure weather is MVFR with improving TAF — if KPBI holds below minimums at arrival, KFLL is a solid alternate 14 miles south. W&B is within limits at all fuel states. FRAT is Low. One NOTAM: ILS 10L OTS at KPBI — file for 28L ILS or expect visual. Suggest requesting IFR clearance direct KPBI with KFLL as alternate. File flight plan and obtain official briefing via 1800wxbrief.com before departure." },
          ] },
        ],
      },
      {
        id: "trip",
        label: "Trip",
        description: "The immutable record for this trip — every event timestamped and signed from preflight release through debrief. This is your IRS business-purpose log and your compliance record.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "Trip closed",             detail: "PA26-0721 · Jul 21 2026 · 2.1 hrs PIC" },
            { band: "GREEN", title: "Business purpose logged", detail: "Site visit · Meridian Waterfront Phase 2" },
            { band: "BLUE",  title: "Billing summary ready",   detail: "2.1 hrs block · 4 passengers · Fuel 87 gal KPBI" },
          ] },
          { type: "table", title: "Operating feed — PA26-0721", cols: ["Time HST", "Event", "Notes"], rows: [
            ["08:12", "Preflight package assembled",   "Weather · W&B · FRAT all green"],
            ["08:47", "Flight plan filed",              "KTEB KPBI direct IFR FL230"],
            ["09:03", "Wheels up KTEB",                 "N662FW · 4 pax"],
            ["09:08", "En route FL230",                 "On course · clear of TFRs"],
            ["11:09", "Wheels down KPBI",               "2.1 hrs block · fuel stop Atlantic Aviation"],
            ["11:22", "Fuel: 87 gal Jet-A · KPBI",    "Atlantic Aviation · $7.10/gal"],
            ["11:38", "Transfer to ground transport",   "Pax to site: Meridian Waterfront"],
            ["15:47", "Return to KPBI",                 "Pax boarded"],
            ["16:02", "Wheels up KPBI return",          "1.9 hrs est"],
            ["17:56", "Wheels down KTEB",               "Return complete · 4.0 hrs block total"],
            ["18:14", "Debrief card approved",          "PA Rivera"],
          ] },
          { type: "cards", items: [
            { band: "WHITE", label: "IRS DOCUMENTATION", title: "Business purpose: Site visit · Meridian Waterfront Phase 2", detail: "Passengers: 4 · Purpose: Commercial real estate site inspection · Billable to: Pacific Air Partners LLC · Deductible: Yes (§162 ordinary and necessary)", action: "Export for CPA" },
          ] },
        ],
      },
      {
        id: "debrief",
        label: "Debrief",
        description: "Post-flight debrief record — auto-populated from trip data. Review, add remarks, and approve. This is your FOQA and compliance record.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "Debrief complete",   detail: "PA26-0721 · Jul 21 2026 · Filed 18:14" },
            { band: "GREEN", title: "QMR: None filed",    detail: "No quality events flagged on this trip" },
            { band: "GREEN", title: "Records updated",    detail: "Logbook +4.0 hrs · N662FW engine +4.0 hrs" },
          ] },
          { type: "table", title: "FOQA — Flight Operations Quality Assurance", cols: ["Question", "Answer", "Notes"], rows: [
            ["Non-typical flight operations?",    "No",  "Standard IFR day flight"],
            ["Refueled with operator fuel?",       "Yes", "Atlantic Aviation KPBI · 87 gal Jet-A @ $7.10"],
            ["Deviation from planned route?",      "No",  "Direct KTEB-KPBI as filed"],
            ["Submit Quality Management Report?",  "No",  "No quality events"],
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "Pilot remarks", text: "Smooth trip. KPBI was VFR on arrival — TAF verified. ILS 28L in service as NOTAMed. Pax on schedule. Atlantic fuel receipt attached. No squawks. Med crew rocks — wait wrong aircraft." },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "RECORD", title: "Trip record signed and chained", detail: "PA26-0721 appended to N662FW aircraft record · 4.0 hrs logged to pilot logbook · QMR: None · Debrief approved: A. Rivera 18:14 Jul 21 2026", action: "View full record" },
          ] },
        ],
      },
      {
        id: "logbook",
        label: "Logbook",
        description: "Your digital pilot logbook — append-only, chain-signed, and portable. Every entry timestamped at the time of flight. IRS-ready with business purpose on every trip.",
        blocks: [
          { type: "kpis", items: [
            { label: "Total time",        value: "4,316.4 hrs", band: "WHITE" },
            { label: "PIC time",          value: "3,994.2 hrs", band: "WHITE" },
            { label: "Instrument actual", value: "412.7 hrs",   band: "WHITE" },
            { label: "Night time",        value: "291.3 hrs",   band: "WHITE" },
          ] },
          { type: "table", title: "Recent flights", cols: ["Date", "Route", "Aircraft", "Block", "PIC", "Instrument", "Night", "Purpose"], rows: [
            ["Jul 21", "KTEB–KPBI–KTEB", "N662FW", "4.0", "4.0", "1.8", "0.0", "Site visit Meridian"],
            ["Jul 17", "KTEB–KBOS–KTEB", "N662FW", "2.8", "2.8", "2.8", "0.0", "Client meeting"],
            ["Jul 14", "KTEB–KJAX",       "N662FW", "2.1", "2.1", "1.4", "0.0", "Project inspection"],
            ["Jul 10", "KTEB–KCLT–KTEB", "N662FW", "3.2", "3.2", "3.2", "1.1", "Investor presentation"],
            ["Jul 08", "KTEB–KPHL",       "N662FW", "0.4", "0.4", "0.0", "0.0", "Day trip"],
          ] },
          { type: "prose", items: [
            { band: "BLUE", title: "IRS documentation standard", text: "Every entry includes business purpose recorded at time of flight — not reconstructed later. This is what the IRS means by 'contemporaneous' logbook. Chain-signed entries cannot be altered after the fact. Export this record any time for your CPA or an audit." },
          ] },
        ],
      },
    ],
  },

  // ──────────────────────────── MX / MAINTENANCE ────────────────────────────
  "av-mx-001": {
    title: "Aircraft Record",
    subtitle: "N662FW · PC-12/47E · S/N 1847",
    disclaimer: "Airworthiness determination is the authority of the certifying A&P/IA — this record is advisory",
    cas: { RED: 0, YELLOW: 1, BLUE: 1, WHITE: 4, GREEN: 5 },
    tabs: [
      {
        id: "airworthiness",
        label: "Airworthiness",
        description: "N662FW's complete airworthiness picture — inspections, engine time, and open MEL items at a glance.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "AIRWORTHY",       detail: "No Category A or B MEL items · cleared for all operations" },
            { band: "YELLOW", title: "1 MEL deferred",  detail: "Cat C · gear door light inop · 30-day window · day/night OK" },
            { band: "GREEN",  title: "Annual current",  detail: "Completed Dec 15 2025 · Next due Dec 15 2026" },
          ] },
          { type: "kpis", items: [
            { label: "Total airframe time",  value: "1,847 hrs",                  band: "WHITE" },
            { label: "Engine time (SMOH)",   value: "1,847 hrs / 3,600 TBO",     band: "WHITE" },
            { label: "Engine remaining",     value: "1,753 hrs",                  band: "GREEN" },
            { label: "Last 100-hr",          value: "1,800 hrs (47 hrs ago)",     band: "GREEN" },
          ] },
          { type: "table", title: "Inspection status", cols: ["Inspection", "Last completed", "Next due", "Status"], rows: [
            ["Annual (FAR 91.409)",          "Dec 15 2025",  "Dec 15 2026",  "Current ✓"],
            ["100-hour",                     "1,800 hrs",    "1,900 hrs",    "47 hrs used / 53 remaining"],
            ["Altimeter/static (FAR 91.411)","Mar 2025",     "Mar 2027",     "Current ✓"],
            ["Transponder (FAR 91.413)",     "Mar 2025",     "Mar 2027",     "Current ✓"],
            ["ELT (FAR 91.207)",             "Dec 2025",     "Dec 2026",     "Current ✓"],
          ] },
          { type: "cards", items: [
            { band: "YELLOW", label: "MEL CAT C · 30-DAY", title: "Gear door light — right main inoperative", detail: "Inop since Jul 15 2026 · MEL item 32-60-01 · Placard installed · No operational restriction day/night VFR/IFR · Defer to next scheduled MX visit · A&P notified: Williams, R", action: "View MEL item" },
          ] },
        ],
      },
      {
        id: "timeline",
        label: "Timeline",
        description: "Complete maintenance history for N662FW — every entry append-only and chain-signed. The full story of this aircraft.",
        blocks: [
          { type: "table", title: "Maintenance timeline (most recent first)", cols: ["Date", "Tach", "Description", "Status", "Signed by"], rows: [
            ["Jul 15 2026", "1,847", "Gear door light R/M px insp — bulb replaced, socket defective, MEL deferred",    "MEL open",  "Williams, R A&P"],
            ["Jul 14 2026", "1,847", "Return from PA26-0721 · 4.0 hrs logged",                                          "Logged",    "A. Rivera PIC"],
            ["Jun 28 2026", "1,800", "100-hour inspection completed — all items cleared · oil change 8qt MIL-PRF-23699", "Signed off","Williams, R A&P / IA"],
            ["Jun 15 2026", "1,782", "PT6A engine chip detector inspection — no material found · clear",                 "Closed",    "Williams, R A&P"],
            ["May 10 2026", "1,744", "AD 2026-08-12 compliance — fuel cap seal replacement (recurring 12-month)",        "Complied",  "Williams, R A&P"],
            ["Dec 15 2025", "1,601", "Annual inspection completed — all ADs current · airworthy",                        "Signed off","Williams, R IA"],
            ["Dec 12 2025", "1,601", "ELT battery replacement — Kannad 406 AF-Compact · exp Dec 2027",                  "Closed",    "Williams, R A&P"],
          ] },
        ],
      },
      {
        id: "squawks",
        label: "Squawks",
        description: "Open discrepancies and their resolution status. Log a new squawk by telling Alex — it goes into the record immediately.",
        blocks: [
          { type: "flags", items: [
            { band: "YELLOW", title: "Gear door light — right main", detail: "Logged Jul 15 2026 · MEL 32-60-01 · Cat C 30-day deferral · Placard installed at R/H main gear door · No dispatch restriction · A&P Williams notified · Repair scheduled Jul 28 · Part on order: light assy P/N 1149-002" },
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "No open Category A or B squawks", text: "N662FW is cleared for all operations. The one open item (gear door light) is a Category C MEL deferral — it does not restrict operations day or night, IFR or VFR. The placard is installed. Repair is scheduled for Jul 28 when the part arrives." },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "LOG A SQUAWK", title: "Tell Alex about any discrepancy", detail: "Say: 'Log a squawk on N662FW — [describe the issue].' Alex will create a timestamped entry in the aircraft record and notify your A&P. The squawk is immutable — it cannot be deleted, only resolved.", action: "Open chat" },
          ] },
        ],
      },
      {
        id: "upcoming",
        label: "Upcoming",
        description: "What's coming due on N662FW — by date and by hours. Nothing should surprise you.",
        blocks: [
          { type: "table", title: "Upcoming maintenance", cols: ["Item", "Basis", "Due", "Remaining", "Priority"], rows: [
            ["100-hour inspection",           "Hours",    "1,900 hrs",  "53 hrs",       "Schedule now"],
            ["Annual inspection",             "Calendar", "Dec 15 2026","148 days",     "Plan ahead"],
            ["PT6A engine TBO",               "Hours",    "3,600 hrs",  "1,753 hrs",    "On track"],
            ["AD 2026-08-12 (fuel cap seal)", "Calendar", "May 2027",   "~10 months",   "Tracking"],
            ["Altimeter/static",              "Calendar", "Mar 2027",   "~8 months",    "Tracking"],
          ] },
          { type: "cards", items: [
            { band: "YELLOW", label: "SCHEDULE NOW", title: "100-hour inspection due at 1,900 hrs (53 hrs away)", detail: "At current flying rate (~15 hrs/month) this is due in approximately 3-4 months — September or October 2026. Coordinate with Williams MX now to avoid AOG. Last 100-hr took 2 days.", action: "Contact A&P" },
          ] },
        ],
      },
    ],
  },

  // ────────────────────────────── DISPATCH ──────────────────────────────────
  "av-dispatch-001": {
    title: "Trip Release",
    subtitle: "Pacific Air Partners · Part 135 charter",
    disclaimer: "Advisory only — dispatch authority rests with the designated dispatcher and PIC per the operator's OpSpecs",
    cas: { RED: 0, YELLOW: 1, BLUE: 0, WHITE: 2, GREEN: 6 },
    tabs: [
      {
        id: "trip-package",
        label: "Trip Package",
        description: "Alex's pre-assembled trip release package — every item verified before you tap Dispatch. No manual re-entry.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "Package complete",      detail: "All release items verified · FRAT 8/50 Low" },
            { band: "GREEN", title: "Pilot: A. Rivera",      detail: "Currency current · Medical current · Type current" },
            { band: "GREEN", title: "N662FW airworthy",      detail: "MEL Cat C (no restriction) · W&B within limits" },
          ] },
          { type: "table", title: "Release checklist — PA26-0721", cols: ["Item", "Status", "Data source"], rows: [
            ["Pilot currency — Medical",          "✓ Current · Dec 2026",              "Pilot Vault"],
            ["Pilot currency — BFR/IPC",          "✓ Current · Feb 2026",              "Pilot Vault"],
            ["Pilot currency — Type recurrent",   "✓ Current · due Oct 2026",          "Pilot Vault"],
            ["Aircraft airworthy",                "✓ Airworthy · 1 MEL Cat C",         "Aircraft Record N662FW"],
            ["MEL items — operational impact",    "✓ None · gear door light day/night OK", "MEL 32-60-01"],
            ["W&B",                               "✓ 9,847 lbs within MTOW 10,450",    "Preflight package"],
            ["Weather brief",                     "✓ FRAT Low · KPBI improving",        "Live weather"],
            ["Flight plan filed",                 "✓ KTEB KPBI direct IFR FL230",       "FAA filed 08:47"],
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "Release status", text: "All items verified. Tap Dispatch to open the trip record and start the operating feed. Every item above is signed to a data source — not self-reported. If any item goes red, the package holds until resolved." },
          ] },
        ],
      },
      {
        id: "frat",
        label: "FRAT",
        description: "Flight Risk Assessment score for PA26-0721 — auto-scored from weather, crew, and aircraft data.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "Score: 8/50 · Low Risk", detail: "Below 20-point threshold · no Chief Pilot review required" },
          ] },
          { type: "table", title: "FRAT breakdown", cols: ["Category", "Score", "Max", "Detail"], rows: [
            ["Weather",          "4", "20", "KPBI MVFR improving · KFLL alternate available"],
            ["Aircraft",         "1", "10", "MEL Cat C · no restriction"],
            ["Crew experience",  "1", "10", "ATP · type current"],
            ["Mission type",     "2", "10", "Interfacility charter · 4 pax"],
            ["Night operations", "0", "10", "Day flight · return before dusk"],
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "FRAT result", text: "Score 8/50 — Low Risk. No single category is elevated. Dispatch without Chief Pilot review per OpSpecs §7.3. If KPBI weather does not improve as forecast, re-run FRAT before wheels-up — a forecast bust to 400 OVC would push Weather to 14 and total to 18, still Low but worth confirming alternate availability." },
          ] },
        ],
      },
      {
        id: "trip-record",
        label: "Trip Record",
        description: "The trip record and IRS documentation — business purpose, passengers, billing, and the chain-signed event log.",
        blocks: [
          { type: "kpis", items: [
            { label: "Trip ID",      value: "PA26-0721",        band: "WHITE" },
            { label: "Block time",   value: "4.0 hrs",          band: "WHITE" },
            { label: "Fuel (KPBI)", value: "87 gal @ $7.10",   band: "WHITE" },
            { label: "Passengers",  value: "4",                  band: "WHITE" },
          ] },
          { type: "table", title: "Billing summary", cols: ["Item", "Quantity", "Rate", "Amount"], rows: [
            ["Block time — charter",        "4.0 hrs",  "$1,850/hr",               "$7,400.00"],
            ["Fuel surcharge",              "87 gal",   "$2.10/gal above $5.00",   "$182.70"],
            ["Landing fee — KPBI",          "1",        "$45.00",                  "$45.00"],
            ["Ground transport coordination","1",       "$0",                      "Pax arranged directly"],
            ["Total",                       "",         "",                        "$7,627.70"],
          ] },
          { type: "prose", items: [
            { band: "BLUE", title: "IRS business purpose log", text: "Business purpose: Site visit · Meridian Waterfront Phase 2. Date: Jul 21 2026. PIC: A. Rivera ATP. Passengers: 4. This entry is timestamped at time of flight and chain-signed — it meets the IRS contemporaneous log requirement for aircraft deduction documentation under IRC §274(d). Export for your CPA via the trip record." },
          ] },
        ],
      },
    ],
  },
};

export function getAvCanvas(slug) {
  return AV_CANVAS[slug] || null;
}
