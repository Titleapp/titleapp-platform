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

  // ─────────────────────────────── AIRCRAFT ─────────────────────────────────
  "av-aircraft": {
    title: "AIRCRAFT",
    subtitle: "Pacific Air Partners · 3 tails · Part 91/135",
    disclaimer: "Airworthiness status is advisory — verify with A&P before dispatch",
    cas: { RED: 1, YELLOW: 1, BLUE: 0, WHITE: 1, GREEN: 1 },
    tabs: [
      {
        id: "fleet-map",
        label: "Fleet Map",
        description: "All tails at a glance — status, TTSN, next inspection due, and any open items.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "N662LF — Airworthy",    detail: "2,301 TTSN · 890 TSMOH · Next inspection: Apr 2027" },
            { band: "GREEN",  title: "N663LF — Airworthy",    detail: "1,847 TTSN · 412 TSMOH · Next inspection: Nov 2026" },
            { band: "RED",    title: "N661LF — OOS",          detail: "FCU squawk open · Pilot write-up 2026-07-30 · MX in progress" },
          ] },
          { type: "table", title: "Fleet status", cols: ["Tail", "TTSN", "TSMOH", "Next Due", "Status"], rows: [
            ["N661LF", "2,847", "1,240", "Annual Feb 2027", "GROUNDED"],
            ["N662LF", "2,301", "890",   "Annual Apr 2027", "Airworthy"],
            ["N663LF", "1,847", "412",   "Annual Nov 2026", "Airworthy"],
          ] },
          { type: "flags", items: [
            { band: "RED",    title: "N661LF — FCU squawk open",          detail: "Pilot Martinez · 2026-07-30 14:23Z · MX triage in progress · Est return 48h" },
            { band: "YELLOW", title: "N663LF — Annual due in 76 days",    detail: "Due Nov 2026 · Schedule now to avoid AOG at inspection time" },
            { band: "WHITE",  title: "N661LF — Fuel cap MEL not applicable", detail: "MX confirmed: not MEL-deferrable. Aircraft OOS until repaired." },
          ] },
        ],
      },
      {
        id: "tail-detail",
        label: "Tail Detail",
        description: "N661LF complete record — specs, configuration, open items, and document status.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",    title: "OOS — FCU squawk",      detail: "Open since 2026-07-30 · MX in triage · Not MEL-deferrable" },
            { band: "WHITE",  title: "2,847 TTSN",            detail: "PT6A-67P · 1,240 TSMOH · OH interval 3,600h" },
            { band: "GREEN",  title: "AFM uploaded",          detail: "PC-12/47E AFM Rev 12 · W&B and performance tabs unlocked" },
          ] },
          { type: "kpis", items: [
            { label: "Registration",   value: "N661LF", band: "WHITE" },
            { label: "Model",          value: "PC-12/47E", band: "WHITE" },
            { label: "Serial",         value: "1661", band: "WHITE" },
            { label: "Year",           value: "2018", band: "WHITE" },
            { label: "Engine TSMOH",   value: "1,240 / 3,600 hrs", band: "GREEN" },
            { label: "Next annual",    value: "Feb 2027", band: "GREEN" },
            { label: "Seats",          value: "8 pax", band: "WHITE" },
            { label: "Avionics",       value: "Honeywell Primus Apex", band: "WHITE" },
          ] },
          { type: "cards", items: [
            { band: "RED",  label: "OPEN SQUAWK", title: "FCU anomaly — fuel cap left wing", detail: "Pilot Martinez 2026-07-30 14:23Z: Left wing fuel cap missing post-fueling. MX triage: parts on hand, est 4h labor. Work order #WO-2026-047 open.", action: "View work order" },
          ] },
        ],
      },
      {
        id: "squawks",
        label: "Squawks",
        description: "All open squawks across the fleet — write-up, triage status, and resolution track.",
        blocks: [
          { type: "flags", items: [
            { band: "RED",   title: "N661LF · WO-2026-047 · FCU / fuel cap — left wing",  detail: "Pilot Martinez 2026-07-30 · MX Chen in triage · Parts on hand · Est 4h repair · WO open" },
            { band: "GREEN", title: "N663LF · Resolved · Nav light inoperative — 2026-07-18", detail: "Pilot Thompson 2026-07-18 · A&P Davis replaced nav light assembly 2026-07-19 · Signed off · Aircraft returned to service" },
          ] },
          { type: "table", title: "Squawk log — last 30 days", cols: ["Tail", "Date", "Description", "Status", "MX"], rows: [
            ["N661LF", "2026-07-30", "FCU / left fuel cap missing",     "OPEN",     "Chen K."],
            ["N663LF", "2026-07-18", "Nav light inoperative",            "CLOSED",   "Davis R."],
            ["N662LF", "2026-07-12", "Autopilot disconnect caution",     "CLOSED",   "Chen K."],
            ["N661LF", "2026-07-01", "Ice detector test fail — left",   "CLOSED",   "Davis R."],
          ] },
        ],
      },
      {
        id: "ads-sbs",
        label: "ADs/SBs",
        description: "Airworthiness directive and service bulletin compliance matrix for the PC-12 fleet.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "23 ADs complied",       detail: "All applicable ADs current as of last annual" },
            { band: "YELLOW", title: "2 SBs open",            detail: "Non-mandatory — review recommended before next annual" },
            { band: "GREEN",  title: "No emergency ADs",      detail: "No SAIB or emergency airworthiness directive outstanding" },
          ] },
          { type: "table", title: "Open SBs", cols: ["SB Number", "Subject", "Priority", "Compliance Date", "Status"], rows: [
            ["PC12-25-027", "Cabin door seal replacement",     "Non-mandatory", "At next maintenance",   "Open"],
            ["PC12-71-014", "Engine inlet de-ice inspection",  "Non-mandatory", "Before winter ops",      "Open"],
          ] },
        ],
      },
      {
        id: "documents",
        label: "Documents",
        description: "Aircraft documents — AFM, 337s, weight and balance data, and registration.",
        blocks: [
          { type: "cards", items: [
            { band: "GREEN",  label: "AFM / POH",        title: "PC-12/47E AFM Rev 12", detail: "Uploaded 2026-02-15 · Authoritative for W&B and performance computation · 387 pages", action: "View" },
            { band: "GREEN",  label: "REGISTRATION",     title: "N661LF FAA Registration", detail: "Expires 2028-12-31 · Class: Airplane · Category: Standard", action: "View" },
            { band: "GREEN",  label: "AIRWORTHINESS",    title: "Standard Airworthiness Certificate", detail: "Issued 2018-03-22 · No expiration · Aircraft remains airworthy while maintained per Part 91", action: "View" },
            { band: "YELLOW", label: "337 — STC",        title: "No STC 337s on file", detail: "No field approvals or STC modifications recorded. Upload if applicable.", action: "Upload" },
          ] },
        ],
      },
    ],
  },

  // ─────────────────────────────── MX (FLEET) ───────────────────────────────
  "av-mx": {
    title: "MX",
    subtitle: "N661LF · Pacific Air Partners · Maintenance Record",
    disclaimer: "All entries are append-only and require A&P or IA signature",
    cas: { RED: 1, YELLOW: 1, BLUE: 0, WHITE: 2, GREEN: 2 },
    tabs: [
      {
        id: "work-orders",
        label: "Work Orders",
        description: "Open and recent work orders — every job from squawk to sign-off, append-only.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",    title: "1 open — WO-2026-047", detail: "FCU / fuel cap · N661LF · Est 4h · Parts on hand" },
            { band: "GREEN",  title: "Closed this month: 3",  detail: "Nav light, autopilot caution, ice detector — all signed off" },
            { band: "GREEN",  title: "Parts on hand",         detail: "PC12-FUELCAP-LH in stock · No AOG parts order required" },
          ] },
          { type: "table", title: "Work orders", cols: ["WO #", "Tail", "Description", "A&P", "Status", "Hours"], rows: [
            ["WO-2026-047", "N661LF", "FCU / fuel cap — left wing",   "Chen K.",  "OPEN",     "4 est"],
            ["WO-2026-044", "N663LF", "Nav light assembly replacement", "Davis R.", "CLOSED",   "1.5"],
            ["WO-2026-041", "N662LF", "Autopilot disconnect — AHRS reset", "Chen K.", "CLOSED",  "0.5"],
            ["WO-2026-038", "N661LF", "Ice detector — left sensor R&R",   "Davis R.", "CLOSED",   "2.0"],
          ] },
        ],
      },
      {
        id: "component-life",
        label: "Component Life",
        description: "Time-limited component status across the fleet — engine, props, and life-limited parts.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "N661LF engine — 1,240 / 3,600 TSMOH",  detail: "2,360 hrs remaining · 65% life used" },
            { band: "GREEN",  title: "N662LF engine — 890 / 3,600 TSMOH",    detail: "2,710 hrs remaining · 25% life used" },
            { band: "YELLOW", title: "N663LF prop — 412 / 2,400 TSMOH",      detail: "Approaching mid-life — 17% life remaining · Next O/H within 6 months" },
          ] },
          { type: "table", title: "Life-limited components", cols: ["Tail", "Component", "TTSN", "Interval", "Remaining", "Status"], rows: [
            ["N661LF", "PT6A-67P engine",   "1,240", "3,600h",  "2,360h",  "GREEN"],
            ["N661LF", "Propeller",          "1,240", "2,400h",  "1,160h",  "GREEN"],
            ["N662LF", "PT6A-67P engine",    "890",  "3,600h",   "2,710h",  "GREEN"],
            ["N662LF", "Propeller",           "890",  "2,400h",   "1,510h",  "GREEN"],
            ["N663LF", "PT6A-67P engine",    "412",  "3,600h",   "3,188h",  "GREEN"],
            ["N663LF", "Propeller",           "412",  "2,400h",   "412h",    "YELLOW"],
          ] },
        ],
      },
      {
        id: "ad-compliance",
        label: "AD Compliance",
        description: "Airworthiness directive compliance matrix — all applicable ADs, compliance dates, and next due.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "23 ADs applicable",    detail: "All complied — last verified at annual 2026-02-15" },
            { band: "GREEN", title: "No recurring ADs due",  detail: "Next recurring AD check at 3,000 TTSN · 153 hrs remaining" },
            { band: "GREEN", title: "No emergency ADs",      detail: "SAIB check current as of 2026-07-30" },
          ] },
        ],
      },
      {
        id: "parts",
        label: "Parts",
        description: "Parts inventory for open work orders and upcoming scheduled maintenance.",
        blocks: [
          { type: "table", title: "Parts on hand — open WOs", cols: ["Part #", "Description", "Qty", "WO", "Status"], rows: [
            ["PC12-FUELCAP-LH", "Left wing fuel cap assembly", "1", "WO-2026-047", "On hand"],
          ] },
          { type: "cards", items: [
            { band: "GREEN", label: "PARTS STATUS", title: "All open WO parts on hand", detail: "No AOG parts orders outstanding. Next maintenance visit parts TBD pending inspection scope.", action: "Order parts" },
          ] },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Upcoming maintenance events — inspections, component overhauls, and scheduled checks.",
        blocks: [
          { type: "table", title: "Upcoming 12 months", cols: ["Tail", "Event", "Due Date", "Due Hours", "Days Out", "Status"], rows: [
            ["N661LF", "WO-2026-047 FCU repair",  "2026-08-01", "—",     "2 days",  "OPEN"],
            ["N663LF", "Annual inspection",         "2026-11-15", "2,000h", "108 days", "Schedule"],
            ["N661LF", "Annual inspection",         "2027-02-15", "3,000h", "200 days", "OK"],
            ["N662LF", "Annual inspection",         "2027-04-15", "2,600h", "259 days", "OK"],
          ] },
        ],
      },
    ],
  },

  // ──────────────────────────── DISPATCH (FLEET) ────────────────────────────
  "av-dispatch": {
    title: "DISPATCH",
    subtitle: "Pacific Air Partners · Trip Release · Part 91/135",
    disclaimer: "Formal release required before departure — crew and aircraft legality verified at dispatch time",
    cas: { RED: 1, YELLOW: 2, BLUE: 0, WHITE: 0, GREEN: 2 },
    tabs: [
      {
        id: "dispatch-board",
        label: "Dispatch Board",
        description: "Today's trips — tail assignments, crew legality, and release status.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",    title: "N661LF — OOS",          detail: "FCU squawk · No dispatch until cleared by MX · WO-2026-047 open" },
            { band: "YELLOW", title: "Martinez — 6h duty remaining", detail: "Current duty period: 12h · 6h used · 6h remaining" },
            { band: "GREEN",  title: "N662LF — Released",     detail: "Combs / Thompson · KTLH → KMCO · Departs 14:00Z · Package complete" },
          ] },
          { type: "table", title: "Today's dispatch board", cols: ["Trip", "Tail", "Crew PIC", "Route", "Depart", "Legality", "Status"], rows: [
            ["PAP-2026-112", "N662LF", "Combs S.",   "KTLH→KMCO", "14:00Z", "Legal", "Released"],
            ["PAP-2026-113", "N661LF", "Martinez J.", "KMCO→KTPA", "16:00Z", "Legal", "Blocked — OOS"],
            ["PAP-2026-114", "N663LF", "Thompson K.", "KTPA→KEYW", "18:00Z", "Legal", "Pending"],
          ] },
        ],
      },
      {
        id: "weather-map",
        label: "Weather",
        description: "Route weather snapshot — current METARs, TAFs, and SIGMET activity.",
        blocks: [
          { type: "table", title: "Route weather — PAP-2026-112 KTLH→KMCO", cols: ["Station", "Category", "Ceiling", "Vis", "Wind"], rows: [
            ["KTLH", "VFR",   "SCT060",   "10SM",  "270/08"],
            ["KGNV", "VFR",   "BKN080",   "10SM",  "260/10"],
            ["KMCO", "VFR",   "SCT100",   "10SM",  "250/12"],
          ] },
          { type: "kpis", items: [
            { label: "SIGMET", value: "None active", band: "GREEN" },
            { label: "AIRMET",  value: "Sierra (mountain obscuration)", band: "YELLOW" },
            { label: "TFR",     value: "None on route", band: "GREEN" },
          ] },
        ],
      },
      {
        id: "wb",
        label: "W&B",
        description: "Weight and balance computation — uses N662LF operator-uploaded AFM data.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "W&B within limits",  detail: "9,124 lbs · Max 10,450 lbs · CG 154.2 in · Limit 150–160 in" },
            { band: "GREEN", title: "Fuel 280 gal",        detail: "Required 195 gal · Reserve 85 gal · Max 402 gal" },
          ] },
          { type: "kpis", items: [
            { label: "Basic empty weight", value: "6,220 lbs", band: "WHITE" },
            { label: "Crew + pax",         value: "1,240 lbs (4 pax)", band: "WHITE" },
            { label: "Fuel",               value: "1,680 lbs (280 gal)", band: "WHITE" },
            { label: "Baggage",            value: "184 lbs", band: "WHITE" },
            { label: "Gross weight",       value: "9,124 / 10,450 lbs", band: "GREEN" },
            { label: "CG",                 value: "154.2 in (limit 150–160)", band: "GREEN" },
          ] },
        ],
      },
      {
        id: "notam",
        label: "NOTAMs",
        description: "Relevant NOTAMs for PAP-2026-112 KTLH→KMCO departure.",
        blocks: [
          { type: "cards", items: [
            { band: "YELLOW", label: "KTLH", title: "Taxiway Bravo closed — 06:00–14:00Z", detail: "NOTAM 07/30/26 · Use Taxiway Charlie via Echo · Confirm with ground prior to taxi", action: "Noted" },
            { band: "GREEN",  label: "KMCO", title: "No relevant NOTAMs", detail: "All runways and taxiways operational · ILS all runways serviceable", action: "Confirm" },
          ] },
        ],
      },
      {
        id: "flight-following",
        label: "Flight Following",
        description: "Live ADS-B position for Pacific Air Partners fleet.",
        blocks: [
          { type: "table", title: "Fleet position — live", cols: ["Tail", "Flight", "From", "To", "Status", "ETA"], rows: [
            ["N662LF", "PAP-112", "KTLH", "KMCO", "En route", "15:52Z"],
            ["N663LF", "Ground",  "KTPA", "—",    "Airworthy", "—"],
            ["N661LF", "Ground",  "KTLH", "—",    "GROUNDED",  "—"],
          ] },
        ],
      },
    ],
  },

  // ──────────────────────────── TRAINING (FLEET) ────────────────────────────
  "av-training": {
    title: "TRAINING",
    subtitle: "Pacific Air Partners · Crew Records · Part 135.293",
    disclaimer: "Currency checks are advisory — DISPATCH queries the crew legality engine at release time",
    cas: { RED: 0, YELLOW: 2, BLUE: 0, WHITE: 1, GREEN: 3 },
    tabs: [
      {
        id: "crew-currency",
        label: "Crew Currency",
        description: "All-pilots currency matrix — medical, BFR, IFR, type recurrent, and 135 checks.",
        blocks: [
          { type: "table", title: "Crew currency matrix", cols: ["Pilot", "Medical", "BFR", "IPC", "Type Recurrent", "135 Check", "Status"], rows: [
            ["Combs S. (ATP)",     "Class 1 — Dec 2026",  "Feb 2026", "Feb 2026", "Nov 2026 ⚠",  "Jun 2027", "YELLOW"],
            ["Martinez J. (ATP)",   "Class 1 — Aug 2026",  "Jan 2026", "Jan 2026", "Sep 2027",     "Sep 2027", "GREEN"],
            ["Thompson K. (CPL)",   "Class 2 — Mar 2027",  "Mar 2026", "Mar 2026", "N/A",          "Mar 2027", "GREEN"],
          ] },
          { type: "flags", items: [
            { band: "YELLOW", title: "Combs S. — PC-12 type recurrent due Nov 2026", detail: "71 days · Schedule FSI/SimuFlite simulator now to avoid gap in schedule" },
            { band: "YELLOW", title: "Martinez J. — Class 1 medical due Aug 2026",   detail: "32 days · Schedule AME appointment this week" },
          ] },
        ],
      },
      {
        id: "cert-ladder",
        label: "Certificate Ladder",
        description: "Pilot certificate progression and qualification status.",
        blocks: [
          { type: "cards", items: [
            { band: "GREEN",  label: "COMBS S.",   title: "ATP · PC-12/47E Type Rating · MEI · CFII", detail: "All certificates current · Part 135 qualified · Chief Pilot", action: "View records" },
            { band: "GREEN",  label: "MARTINEZ J.", title: "ATP · PC-12/47E Type Rating",              detail: "All certificates current · Part 135 qualified · SIC qualified", action: "View records" },
            { band: "GREEN",  label: "THOMPSON K.", title: "CPL · Instrument · Multi-Engine",            detail: "Non-type-rated — right seat B100/C90 only · Part 135 SIC qualified", action: "View records" },
          ] },
        ],
      },
      {
        id: "expirations",
        label: "Upcoming",
        description: "Currency and certificate expirations in the next 90 days.",
        blocks: [
          { type: "table", title: "90-day expiration calendar", cols: ["Pilot", "Item", "Expires", "Days Out", "Action"], rows: [
            ["Martinez J.", "Class 1 Medical",      "Aug 2026", "32 days", "Schedule AME"],
            ["Combs S.",    "PC-12 Type Recurrent", "Nov 2026", "71 days", "Schedule simulator"],
          ] },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Upcoming training events — simulator slots, checkrides, and ground training.",
        blocks: [
          { type: "cards", items: [
            { band: "YELLOW", label: "UPCOMING", title: "Combs S. — PC-12 type recurrent", detail: "Due Nov 2026 · FSI Scottsdale preferred · Contact: 480-555-0131 · 2-day course + sim session", action: "Schedule" },
            { band: "YELLOW", label: "UPCOMING", title: "Martinez J. — Class 1 AME appointment", detail: "Due Aug 2026 · FAA-designated AME required · Schedule with Dr. Chen, KLAS", action: "Schedule" },
          ] },
        ],
      },
    ],
  },

  // ──────────────────────────── OPERATIONS (FLEET) ──────────────────────────
  "av-operations": {
    title: "OPERATIONS",
    subtitle: "Pacific Air Partners · Crew Scheduling · Duty Time",
    disclaimer: "Crew legality is computed at dispatch time — this board is a live preview only",
    cas: { RED: 1, YELLOW: 1, BLUE: 0, WHITE: 1, GREEN: 2 },
    tabs: [
      {
        id: "crew-schedule",
        label: "Crew Schedule",
        description: "This week's crew schedule — trips, duty periods, and rest blocks.",
        blocks: [
          { type: "table", title: "Week of 2026-07-28", cols: ["Pilot", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], rows: [
            ["Combs S.",    "PAP-110", "PAP-112", "Rest", "Rest",    "PAP-116", "Rest",    "Rest"],
            ["Martinez J.", "Rest",    "PAP-113", "Standby", "Rest",  "Rest",    "PAP-118", "Rest"],
            ["Thompson K.", "PAP-111", "Rest",    "PAP-114", "Rest", "PAP-117", "Rest",    "Rest"],
          ] },
        ],
      },
      {
        id: "crew-legality",
        label: "Crew Legality",
        description: "Duty time and currency status per pilot — queried by DISPATCH before every release.",
        blocks: [
          { type: "table", title: "Crew legality — current duty period", cols: ["Pilot", "Duty Used", "Duty Remaining", "Currency", "Medical", "Legality"], rows: [
            ["Combs S.",    "4h",  "10h",  "Current",  "Current (Dec)", "GREEN"],
            ["Martinez J.", "6h",  "6h",   "Current",  "Due 32 days",  "YELLOW"],
            ["Thompson K.", "0h",  "14h",  "Current",  "Current (Mar)", "GREEN"],
          ] },
          { type: "flags", items: [
            { band: "YELLOW", title: "Martinez J. — medical approaching expiration", detail: "32 days to Class 1 renewal · Legal to fly now · Flag at 30-day threshold" },
            { band: "RED",    title: "N661LF OOS — Martinez PAP-2026-113 blocked",  detail: "Assigned aircraft out of service · DISPATCH blocked release · Coordinate tail substitution" },
          ] },
        ],
      },
      {
        id: "reserve-pool",
        label: "Reserve Pool",
        description: "Reserve crew availability — duty-legal pilots available for substitution or coverage.",
        blocks: [
          { type: "cards", items: [
            { band: "WHITE", label: "RESERVE", title: "No reserve crew on standby today", detail: "Contact Combs S. (off duty, rest period complete) or Martinez J. (on duty, 6h remaining) for any coverage needs.", action: "Contact crew" },
          ] },
        ],
      },
      {
        id: "conflicts",
        label: "Conflicts",
        description: "Scheduling conflicts — duty time, rest violations, or double-booking flags.",
        blocks: [
          { type: "flags", items: [
            { band: "RED",    title: "PAP-2026-113 — tail conflict", detail: "N661LF assigned but OOS. Reassign to N663LF (airworthy, Thompson K. available) or cancel trip." },
            { band: "GREEN",  title: "No duty time violations this week", detail: "All crew within Part 135.265 limits for the rolling 24h, 7-day, and 30-day windows." },
          ] },
        ],
      },
    ],
  },

  // ──────────────────────────── SAFETY (FLEET) ──────────────────────────────
  "av-safety": {
    title: "SAFETY",
    subtitle: "Pacific Air Partners · SMS · Part 135 Safety Management",
    disclaimer: "Safety reports are confidential — SMS coordinator has independent reporting chain",
    cas: { RED: 0, YELLOW: 1, BLUE: 0, WHITE: 2, GREEN: 3 },
    tabs: [
      {
        id: "safety-board",
        label: "Safety Board",
        description: "Open safety reports — incidents, hazards, and near-misses. All reports are append-only.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "0 open incidents",     detail: "No open incidents requiring investigation" },
            { band: "YELLOW", title: "1 open hazard",        detail: "Taxiway Bravo closure at KTLH — crew awareness" },
            { band: "GREEN",  title: "SMS current",          detail: "Last SMS review Jul 2026 · Next review Jan 2027" },
          ] },
          { type: "table", title: "Recent safety reports", cols: ["Date", "Type", "Description", "Risk", "Status"], rows: [
            ["2026-07-30", "Hazard",    "KTLH Taxiway Bravo closure",          "Low",    "Open"],
            ["2026-07-18", "Incident",  "Nav light inoperative on preflight",  "Low",    "Closed"],
            ["2026-06-30", "Near-miss", "Traffic conflict KMCO class B",        "Medium", "Closed"],
          ] },
        ],
      },
      {
        id: "hazard-register",
        label: "Hazard Register",
        description: "Operational hazard register — risk matrix and mitigation status.",
        blocks: [
          { type: "table", title: "Active hazards", cols: ["Hazard", "Likelihood", "Severity", "Risk", "Mitigation", "Owner"], rows: [
            ["Summer thunderstorm exposure (Florida corridor)", "High", "High", "HIGH", "Go/no-go criteria in GOM Section 4", "Combs S."],
            ["Single-engine exposure — long overwater legs",    "Low",  "High", "MED",  "Alternate fuel planning requirement",  "Combs S."],
            ["Fatigue — multi-day trips away from base",        "Med",  "Med",  "MED",  "Trip duty limits in GOM Section 7",   "Martinez J."],
          ] },
        ],
      },
      {
        id: "drug-alcohol",
        label: "Drug & Alcohol",
        description: "DOT/FAA drug and alcohol testing program — testing schedule and compliance status.",
        blocks: [
          { type: "kpis", items: [
            { label: "Program status",     value: "Compliant — DOT Part 40", band: "GREEN" },
            { label: "Last random",        value: "Combs S. — Jun 2026",     band: "GREEN" },
            { label: "Pre-employment",     value: "All crew clear",           band: "GREEN" },
            { label: "Next random pool",   value: "Q3 2026 — Aug",           band: "YELLOW" },
          ] },
        ],
      },
      {
        id: "foqa",
        label: "FOQA",
        description: "Flight data analysis — exceedance trends and safety performance indicators.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "0 exceedances this month", detail: "No FOQA events exceeding established thresholds · 23 flights analyzed" },
            { band: "GREEN", title: "SPI trend — positive",     detail: "3-month rolling trend: approach stabilization improving, hard landing frequency down" },
          ] },
        ],
      },
      {
        id: "erp",
        label: "ERP",
        description: "Emergency response plan — plan status, drill history, and contact tree.",
        blocks: [
          { type: "kpis", items: [
            { label: "ERP status",     value: "Current — Rev 3 Jul 2026", band: "GREEN" },
            { label: "Last drill",     value: "Jun 15 2026",              band: "GREEN" },
            { label: "Next drill",     value: "Dec 2026",                 band: "GREEN" },
            { label: "POC current",    value: "Yes — all contacts verified", band: "GREEN" },
          ] },
        ],
      },
    ],
  },

  // ─────────────────────────── COPILOT (PERSONAL) ───────────────────────────
  "av-copilot": {
    title: "CoPilot",
    subtitle: "Combs, Sean · ATP · PC-12/47E",
    disclaimer: "Advisory only — go/no-go authority rests with the PIC",
    cas: { RED: 0, YELLOW: 2, BLUE: 0, WHITE: 1, GREEN: 4 },
    tabs: [
      {
        id: "logbook",
        label: "My Logbook",
        description: "Your digital pilot logbook — append-only, chain-signed, portable. Every entry includes business purpose for IRS documentation.",
        blocks: [
          { type: "kpis", items: [
            { label: "Total time",      value: "4,847 hrs",    band: "WHITE" },
            { label: "PC-12 time",      value: "1,623 hrs",    band: "WHITE" },
            { label: "Multi-engine",    value: "3,201 hrs",    band: "WHITE" },
            { label: "Instrument",      value: "1,847 hrs",    band: "WHITE" },
            { label: "Night",           value: "623 hrs",      band: "WHITE" },
            { label: "Last 30 days",    value: "47 hrs",       band: "WHITE" },
          ] },
          { type: "table", title: "Recent entries", cols: ["Date", "Tail", "Route", "Type", "Duration", "Remarks"], rows: [
            ["2026-07-29", "N662LF", "KTLH→KMCO", "Part 135", "2.1h", "Business transport"],
            ["2026-07-27", "N662LF", "KMCO→KTLH", "Part 135", "2.0h", "Business transport"],
            ["2026-07-25", "N661LF", "KTLH→KTPA", "Part 91",  "1.4h", "Maintenance flight"],
          ] },
        ],
      },
      {
        id: "currency",
        label: "Currency",
        description: "Your currency status — all certificates and recencies at a glance.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "Medical — Class 1 current",  detail: "Expires Dec 31 2026 · 154 days remaining" },
            { band: "GREEN",  title: "BFR — current",               detail: "Completed Feb 10 2026 · Next due Feb 2028" },
            { band: "YELLOW", title: "Type recurrent — due soon",   detail: "PC-12/47E · Due Nov 2026 · 71 days · Schedule now" },
          ] },
          { type: "kpis", items: [
            { label: "Class 1 Medical",      value: "Dec 31 2026 · 154d", band: "GREEN" },
            { label: "BFR",                   value: "Feb 2028 · Current",  band: "GREEN" },
            { label: "IPC",                   value: "Feb 2028 · Current",  band: "GREEN" },
            { label: "PC-12 Type Recurrent",  value: "Nov 2026 · 71d",      band: "YELLOW" },
            { label: "Night currency",        value: "Current",              band: "GREEN" },
            { label: "135.293 PIC Check",     value: "Jun 2027 · Current",   band: "GREEN" },
          ] },
        ],
      },
      {
        id: "my-aircraft",
        label: "My Aircraft",
        description: "Your primary aircraft — N661LF status and next flight readiness.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",   title: "N661LF — OOS",     detail: "FCU squawk · WO-2026-047 · Est return 2026-08-01" },
            { band: "GREEN", title: "N662LF — Available", detail: "Airworthy · 2,301 TTSN · Prepped for PAP-112 today" },
          ] },
          { type: "cards", items: [
            { band: "RED",   label: "MY AIRCRAFT", title: "N661LF out of service", detail: "MX working WO-2026-047 (FCU/fuel cap). Next available: estimated 2026-08-01. Use N662LF for scheduled trips.", action: "Track WO" },
          ] },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Your upcoming trips, training, and duty periods.",
        blocks: [
          { type: "table", title: "This week", cols: ["Date", "Trip", "Route", "Tail", "Depart", "Status"], rows: [
            ["Jul 29", "PAP-112", "KTLH→KMCO", "N662LF", "14:00Z", "Released"],
            ["Jul 31", "Rest",    "—",           "—",      "—",      "Rest day"],
            ["Aug 1",  "PAP-116", "KMCO→KTLH", "N662LF", "16:00Z", "Pending"],
          ] },
          { type: "kpis", items: [
            { label: "Duty this week",  value: "18h used / 40h limit",    band: "GREEN" },
            { label: "Rest today",       value: "10h since last duty off",  band: "GREEN" },
          ] },
        ],
      },
      {
        id: "flight-planning",
        label: "Flight Planning",
        description: "Flight planning for your next trip — tell Alex your departure and destination.",
        blocks: [
          { type: "cards", items: [
            { band: "BLUE", label: "READY", title: "Tell Alex your route to build a preflight package", detail: "Alex will pull live weather, NOTAMs, compute W&B from your N661LF AFM, calculate FRAT score, and generate a release-ready package.", action: "Start planning" },
          ] },
        ],
      },
    ],
  },
};

// ── Aircraft-specific CoPilot variants (CODEX 60) ────────────────────────────
// Each entry is a type-specific CoPilot persona. Tabs are scoped to the
// aircraft type. Canvas data is demo/advisory — live data injected by Alex.

function copilotVariant(typeLabel, tail, tailShort, afmModel, engineLabel, tohoInterval) {
  return {
    title: `CoPilot — ${typeLabel}`,
    subtitle: `${tail} · ${typeLabel} · Pacific Air Partners`,
    disclaimer: "Advisory only — go/no-go authority rests with the PIC",
    cas: { RED: 0, YELLOW: 1, BLUE: 0, WHITE: 2, GREEN: 4 },
    tabs: [
      {
        id: "flight-planning",
        label: "Flight Planning",
        description: `${typeLabel} flight planning — performance, fuel planning, and routing with type-specific data from your uploaded AFM.`,
        blocks: [
          { type: "cards", items: [
            { band: "BLUE", label: "READY", title: `Tell Alex your route for a ${typeLabel} preflight package`, detail: `Alex will pull live weather, NOTAMs, compute W&B from your ${afmModel} AFM data, and generate a go/no-go package specific to the ${typeLabel}.`, action: "Start planning" },
          ] },
        ],
      },
      {
        id: "performance",
        label: "Performance",
        description: `${typeLabel} performance tables — climb, cruise, and landing data from your uploaded AFM.`,
        blocks: [
          { type: "kpis", items: [
            { label: "Max cruise",      value: "From AFM — upload to activate",  band: "WHITE" },
            { label: "Best range",      value: "From AFM — upload to activate",  band: "WHITE" },
            { label: "Climb rate",      value: "From AFM — upload to activate",  band: "WHITE" },
            { label: "Service ceiling", value: "From AFM — upload to activate",  band: "WHITE" },
          ] },
          { type: "prose", items: [
            { band: "BLUE", title: "Activate performance data", text: `Upload your ${afmModel} AFM or POH to unlock type-specific performance tables. Alex will parse climb, cruise, descent, and fuel-burn tables and use them in every preflight package.` },
          ] },
        ],
      },
      {
        id: "weight-balance",
        label: "Weight & Balance",
        description: `Weight and balance computation using your ${tailShort} empty weight and CG from the uploaded AFM.`,
        blocks: [
          { type: "cards", items: [
            { band: "BLUE", label: "UPLOAD AFM TO ACTIVATE", title: `${afmModel} W&B data not yet loaded`, detail: `Upload your aircraft's empty weight and CG data from the ${afmModel} AFM. Alex will compute W&B for every trip automatically.`, action: "Upload AFM" },
          ] },
        ],
      },
      {
        id: "logbook",
        label: "Logbook",
        description: `Your ${typeLabel} logbook entries — automatically tagged by type and tail.`,
        blocks: [
          { type: "kpis", items: [
            { label: `${typeLabel} time`,  value: "—",  band: "WHITE" },
            { label: "Last 30 days",       value: "—",  band: "WHITE" },
            { label: "Last 90 days",       value: "—",  band: "WHITE" },
            { label: "Total time",         value: "—",  band: "WHITE" },
          ] },
          { type: "prose", items: [
            { band: "BLUE", title: "Connect your logbook", text: "Link your pilot logbook to auto-tag entries by aircraft type. Time in type is tracked separately for insurance, type recurrent, and Part 135 reporting." },
          ] },
        ],
      },
      {
        id: "currency",
        label: "Currency",
        description: `${typeLabel} type currency — recency of experience and type recurrent status.`,
        blocks: [
          { type: "kpis", items: [
            { label: "Type recurrent", value: "From pilot Vault",  band: "WHITE" },
            { label: "Night currency", value: "From logbook",      band: "WHITE" },
            { label: "IFR currency",   value: "From logbook",      band: "WHITE" },
            { label: "Last flight",    value: "From logbook",      band: "WHITE" },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "CONNECT VAULT", title: "Connect your pilot Vault for live currency tracking", detail: "When your Vault is linked, Alex checks currency automatically at every preflight and flags anything that's approaching expiration.", action: "Connect Vault" },
          ] },
        ],
      },
      {
        id: "documents",
        label: "Documents",
        description: `${typeLabel} documents — AFM, supplements, POH, and operator manuals.`,
        blocks: [
          { type: "cards", items: [
            { band: "YELLOW", label: "AFM / POH",   title: `${afmModel} AFM — not uploaded`, detail: "Upload your AFM to activate performance tables and W&B computation.", action: "Upload" },
            { band: "WHITE",  label: "SUPPLEMENTS",  title: "No STC supplements on file",       detail: "Add avionics or STC supplement documents if applicable.",              action: "Upload" },
            { band: "WHITE",  label: "MEL",           title: "No MEL on file",                   detail: "Upload your operator MEL to enable MEL-deferred dispatch tracking.",  action: "Upload" },
          ] },
        ],
      },
    ],
  };
}

AV_CANVAS["av-copilot-pc12"]  = copilotVariant("PC-12/47E", "N661LF · PC-12/47E", "N661LF", "PC-12/47E", "PT6A-67P", "3,600h");
AV_CANVAS["av-copilot-b200"]  = copilotVariant("King Air B200", "N·B200 · King Air B200", "N·B200", "King Air B200", "PT6A-42", "3,600h");
AV_CANVAS["av-copilot-b350"]  = copilotVariant("King Air B350", "N·B350 · King Air B350", "N·B350", "King Air B350", "PT6A-60A", "3,600h");
AV_CANVAS["av-copilot-c90"]   = copilotVariant("King Air C90", "N·C90 · King Air C90", "N·C90", "King Air C90B", "PT6A-21", "3,500h");
AV_CANVAS["av-copilot-208b"]  = copilotVariant("Caravan 208B", "N·208B · Cessna 208B", "N·208B", "208B Grand Caravan", "PT6A-114A", "3,600h");

export function getAvCanvas(slug) {
  return AV_CANVAS[slug] || null;
}
