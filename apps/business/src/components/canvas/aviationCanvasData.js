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
    subtitle: "PC-12/47E · Hawaii operations",
    disclaimer: "Advisory only — go/no-go authority rests with the PIC",
    cas: { RED: 0, YELLOW: 9, BLUE: 0, WHITE: 6, GREEN: 6 },
    tabs: [
      {
        id: "map",
        label: "Map",
        description: "Live aviation map — METAR dots always on. Toggle Airports, Airspace, Navaids, and Traffic layers. Click any marker for detail.",
        blocks: [
          { type: "aviationMap", center: [20.5, -157.0], zoom: 7, height: 560,
            icaos: ["PHOG", "PHNL", "PHKO", "PHTO", "PHNY", "PHJH", "PHLI"] },
        ],
      },
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Your compliance and currency snapshot — everything that needs attention before your next flight, pulled directly from your training record.",
        blocks: [
          { type: "heroes", items: [
            { band: "YELLOW", title: "9 items expiring 09/30/2026",  detail: "Recurrent training window — FW Gen Sub · PC12 Flight · PC12 Ground · PC12 CTS + 5 more" },
            { band: "GREEN",  title: "Medical current · Class 1",    detail: "Completed 05/11/2026 · Expires 05/31/2027" },
            { band: "GREEN",  title: "116.8 cal-year hours · PC-12", detail: "170.1 last 12 months · 54.9 last 90 days · 7.0 last 30 days" },
          ] },
          { type: "kpis", items: [
            { label: "Medical (Class 1)",   value: "Expires 05/31/2027",   band: "GREEN" },
            { label: "FW - 299",            value: "Expires 03/31/2027",   band: "GREEN" },
            { label: "CBT Q1",              value: "Expires 03/31/2027",   band: "GREEN" },
            { label: "CBT Q2",              value: "Expires 06/30/2027",   band: "GREEN" },
            { label: "CBT Q4",              value: "Expires 12/31/2026",   band: "GREEN" },
            { label: "HUET - Raft Hands On","value": "Expires 09/30/2027", band: "GREEN" },
            { label: "FW - Gen Sub",        value: "Expiring 09/30/2026",  band: "YELLOW" },
            { label: "PC12 - Flight",       value: "Expiring 09/30/2026",  band: "YELLOW" },
            { label: "PC12 - Ground",       value: "Expiring 09/30/2026",  band: "YELLOW" },
          ] },
          { type: "cards", items: [
            { band: "YELLOW", label: "ACTION REQUIRED", title: "Schedule recurrent training — 9 items expire 09/30/2026", detail: "FW Gen Sub · PC12 Emergency Training · PC12 Flight · PC12 Ground · PC12 293 · PC12 297 · FW 293(a) · CBT Q3 (no completion on file) · PC12 CTS. Recurrent window closes Sep 30.", action: "View Currency" },
          ] },
        ],
      },
      {
        id: "flight",
        label: "Flight",
        description: "Your next planned flight — ForeFlight-style. Fill in the details with Alex and get a complete go/no-go package: weather, W&B, FRAT, NOTAMs, and navlog.",
        blocks: [
          { type: "heroes", items: [
            { band: "BLUE",   title: "Next flight — PHOG → PHNL",          detail: "Aug 9 2026 · ETD 08:00 HST · IFR · FL230 · N701AA · Crew: Rivera" },
            { band: "GREEN",  title: "Weather — VFR improving",             detail: "PHOG VFR · PHNL VFR · Enroute clear · No SIGMETs" },
            { band: "YELLOW", title: "W&B check required before release",   detail: "Planned pax not yet added — tell Skye your pax weights to compute W&B" },
          ] },
          { type: "kpis", items: [
            { label: "Date",                value: "Aug 9 2026",            band: "WHITE" },
            { label: "ETD (HST)",           value: "08:00",                 band: "WHITE" },
            { label: "Departure",           value: "PHOG (Kahului)",        band: "WHITE" },
            { label: "Destination",         value: "PHNL (Honolulu)",       band: "WHITE" },
            { label: "Alternate",           value: "PHKO (Kona)",           band: "WHITE" },
            { label: "Aircraft",            value: "N701AA · PC-12/47E",    band: "WHITE" },
            { label: "Route",               value: "PHOG V19 PHNL",        band: "WHITE" },
            { label: "Altitude",            value: "FL230 IFR",             band: "WHITE" },
            { label: "ETE",                 value: "~0:45",                 band: "WHITE" },
            { label: "Fuel required",       value: "~65 gal",               band: "GREEN" },
            { label: "FBO — PHOG",          value: "Signature Flight Support", band: "WHITE" },
            { label: "FBO — PHNL",          value: "Signature Flight Support", band: "WHITE" },
          ] },
          { type: "table", title: "Navlog — PHOG → PHNL · IFR", cols: ["Fix", "Radial/Dist", "Alt", "TAS", "Wind", "GS", "ETE"], rows: [
            ["PHOG",  "Dep",       "4,000",  "—",     "—",       "—",    "0:00"],
            ["MKK",   "V19 34nm",  "FL230",  "270kt", "270/25",  "295kt","0:07"],
            ["PHNL",  "V19 55nm",  "Desc",   "270kt", "270/20",  "290kt","0:11"],
            ["TOT",   "89nm",      "—",      "—",     "—",       "—",    "0:18"],
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "BUILD PREFLIGHT PACKAGE", title: "Tell Skye to pull the full go/no-go package", detail: "Say: 'Build me a preflight package for PHOG to PHNL tomorrow at 08:00.' Skye pulls live weather, NOTAMs, computes W&B with your pax weights, scores the FRAT, and generates the release package.", action: "Open chat" },
            { band: "BLUE", label: "FILE FLIGHT PLAN", title: "Tell Skye to file IFR with PHOG clearance delivery", detail: "Say: 'File my IFR for PHOG PHNL FL230 V19 at 0800Z.' Skye formats the flight plan and confirms filing.", action: "File plan" },
          ] },
        ],
      },
      {
        id: "currency",
        label: "Currency",
        description: "Your full compliance record — every training item, completion date, and expiration. This is what FVO shows you, plus the intelligence to act on it.",
        blocks: [
          { type: "heroes", items: [
            { band: "YELLOW", title: "9 items expiring 09/30/2026", detail: "All in the same recurrent window — schedule simulator and CBT modules now" },
            { band: "GREEN",  title: "6 items current",             detail: "Medical · FW-299 · CBT Q1/Q2/Q4 · HUET — all clear through 2027" },
          ] },
          { type: "table", title: "Training record — PC-12 / Aeromed Air", cols: ["Item", "Completed", "Expires", "Status"], rows: [
            ["Medical 1 Year",             "05/11/2026", "05/31/2027", "Current ✓"],
            ["FW - 299",                   "03/21/2026", "03/31/2027", "Current ✓"],
            ["FW - CBT Q1",                "03/30/2026", "03/31/2027", "Current ✓"],
            ["FW - CBT Q2",                "06/27/2026", "06/30/2027", "Current ✓"],
            ["FW - CBT Q4",                "12/29/2025", "12/31/2026", "Current ✓"],
            ["HUET - Raft Hands On",       "09/22/2025", "09/30/2027", "Current ✓"],
            ["FW - Gen Sub",               "09/19/2025", "09/30/2026", "⚠ Expiring"],
            ["PC12 - Emergency Training",  "09/19/2025", "09/30/2026", "⚠ Expiring"],
            ["PC12 - Flight",              "03/21/2026", "09/30/2026", "⚠ Expiring"],
            ["PC12 - Ground",              "09/19/2025", "09/30/2026", "⚠ Expiring"],
            ["PC12 - 293",                 "09/19/2025", "09/30/2026", "⚠ Expiring"],
            ["PC12 - 297",                 "03/21/2026", "09/30/2026", "⚠ Expiring"],
            ["FW - 293 (a) 1, 4-8",        "10/12/2025", "09/30/2026", "⚠ Expiring"],
            ["FW - CBT Q3",                "—",          "09/30/2026", "⚠ No completion on file"],
            ["PC12 - CTS",                 "—",          "09/30/2026", "⚠ No completion on file"],
          ] },
          { type: "prose", items: [
            { band: "YELLOW", title: "What SOCIII does that FVO can't", text: "FVO shows you a table. SOCIII watches the table, surfaces the deadline before it becomes a problem, and helps you schedule the sim block or CBT module — right from this conversation. All 9 expiring items are in the same recurrent window (Sep 30). Tell Alex 'help me schedule my PC-12 recurrent' and it drafts the FlightSafety request for you." },
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
          { type: "map", address: "Teterboro Airport, NJ", sectionLabel: "Route: KTEB → KPBI · IFR FL230" },
          { type: "prose", items: [
            { band: "GREEN", title: "Go/no-go assessment", text: "Conditions support the flight. KPBI departure weather is MVFR with improving TAF — if KPBI holds below minimums at arrival, KFLL is a solid alternate 14 miles south. W&B is within limits at all fuel states. FRAT is Low. One NOTAM: ILS 10L OTS at KPBI — file for 28L ILS or expect visual. Suggest requesting IFR clearance direct KPBI with KFLL as alternate. File flight plan and obtain official briefing via 1800wxbrief.com before departure." },
          ] },
        ],
      },
      {
        id: "trip",
        label: "Past Trips",
        description: "Historical trip record — every past flight timestamped and signed from preflight release through debrief. This is your IRS business-purpose log and compliance archive. For your next planned flight, use the Flight tab.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "Trip closed",             detail: "PA26-0721 · Jul 21 2026 · 2.1 hrs PIC" },
            { band: "GREEN", title: "Business purpose logged", detail: "Site visit · Meridian Waterfront Phase 2" },
            { band: "BLUE",  title: "Billing summary ready",   detail: "2.1 hrs block · 4 passengers · Fuel 87 gal KPBI" },
          ] },
          { type: "table", title: "Operating feed — PA26-0721", cols: ["Time HST", "Event", "Notes"], rows: [
            ["08:12", "Preflight package assembled",   "Weather · W&B · FRAT all green"],
            ["08:47", "Flight plan filed",              "KTEB KPBI direct IFR FL230"],
            ["09:03", "Wheels up KTEB",                 "N704AA · 4 pax"],
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
            { band: "GREEN", title: "Records updated",    detail: "Logbook +4.0 hrs · N704AA engine +4.0 hrs" },
          ] },
          { type: "table", title: "FOQA — Flight Operations Quality Assurance", cols: ["Question", "Answer", "Notes"], rows: [
            ["Non-typical flight operations?",    "No",  "Standard IFR day flight"],
            ["Refueled with operator fuel?",       "Yes", "Atlantic Aviation KPBI · 87 gal Jet-A @ $7.10"],
            ["Deviation from planned route?",      "No",  "Direct KTEB-KPBI as filed"],
            ["Submit Quality Management Report?",  "No",  "No quality events"],
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "Pilot remarks", text: "Smooth trip. KPBI was VFR on arrival — TAF verified. ILS 28L in service as NOTAMed. Pax on schedule. Atlantic fuel receipt attached. No squawks. B200 performed as expected — smooth cruise FL230, 263 KTAS." },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "RECORD", title: "Trip record signed and chained", detail: "PA26-0721 appended to N704AA aircraft record · 4.0 hrs logged to pilot logbook · QMR: None · Debrief approved: A. Rivera 18:14 Jul 21 2026", action: "View full record" },
          ] },
        ],
      },
      {
        id: "logbook",
        label: "Logbook",
        description: "Your digital pilot logbook — append-only, chain-signed, and portable. FAA-standard columns with Day/Night, IFR/VFR, landings, and approach types.",
        blocks: [
          { type: "kpis", items: [
            { label: "Calendar year (PC-12)", value: "116.8 hrs",  band: "WHITE" },
            { label: "Last 12 months",        value: "170.1 hrs",  band: "WHITE" },
            { label: "Last 90 days",          value: "54.9 hrs",   band: "WHITE" },
            { label: "Last 60 days",          value: "33.4 hrs",   band: "WHITE" },
            { label: "Last 30 days",          value: "7.0 hrs",    band: "WHITE" },
            { label: "Night — last 90 days",  value: "18.3 hrs",   band: "WHITE" },
            { label: "IFR actual — 90 days",  value: "41.2 hrs",   band: "WHITE" },
            { label: "Day landings — 90 days",value: "34",         band: "WHITE" },
            { label: "Night landings — 90d",  value: "12",         band: "WHITE" },
          ] },
          { type: "table", title: "Recent flights — PC-12 / Aeromed Air", cols: ["Date", "Route", "Aircraft", "Total", "Day", "Night", "IFR", "Day Ldg", "Night Ldg", "Apch", "Purpose"], rows: [
            ["Aug 04", "PHOG–PHNL", "PC-12/47E", "0.8", "0.8", "—",  "0.8", "1", "—", "ILS 04L", "Air medical"],
            ["Aug 01", "PHNL–PHOG", "PC-12/47E", "0.8", "0.5", "0.3","0.8", "—", "1", "RNAV 02", "Positioning"],
            ["Jul 28", "PHOG–PHKO", "PC-12/47E", "0.9", "0.9", "—",  "0.7", "1", "—", "VFR",     "Air medical"],
            ["Jul 24", "PHKO–PHNL", "PC-12/47E", "1.1", "0.8", "0.3","1.1", "—", "1", "ILS 08L", "Air medical"],
            ["Jul 20", "PHNL–PHOG", "PC-12/47E", "0.8", "—",  "0.8","0.8", "—", "1", "RNAV 02", "Positioning"],
          ] },
          { type: "prose", items: [
            { band: "BLUE", title: "IRS documentation standard", text: "Every entry includes business purpose recorded at time of flight — not reconstructed later. This is what the IRS means by 'contemporaneous' logbook. Chain-signed entries cannot be altered after the fact. Export this record any time for your CPA or an audit." },
          ] },
        ],
      },
      {
        id: "charts",
        label: "Charts",
        description: "Approach and departure charts, airport diagrams, and preferred IFR routing for your bases — PHOG, PHNL, PHKO, PHTO, PHNY. Sourced from FAA AeroNav. Always verify chart currency against the current AIRAC cycle before flight.",
        blocks: [
          { type: "aviationCharts" },
        ],
      },
      {
        id: "synthetic-pfd",
        label: "Synthetic PFD",
        description: "Device-sensor-based backup flight display — attitude from motion sensors, speed and altitude from GPS. Independent of aircraft avionics. The independence is the entire point: panel-dark scenario, pre-flight situational awareness, post-maintenance function check. NOT a certified instrument. Verify against aircraft instruments at all times.",
        blocks: [
          { type: "syntheticPfd" },
        ],
      },
      {
        id: "nearest",
        label: "NEAREST",
        description: "Nearest airports ranked by distance with glide-range rings and arrival altitude calculated at your current altitude. PC-12/47E best glide: 118 KIAS, 15:1 per POH/AFM. Shows estimated arrival altitude at each airport — reachable with margin (green), marginal (yellow), or out of range (red). Enter altitude or use GPS to recalculate live.",
        blocks: [
          { type: "nearest" },
        ],
      },
      {
        id: "qrh",
        label: "QRH",
        description: "Emergency Quick Reference Handbook — verbatim checklists from the PC-12/47E AFM. Memory items appear first. These procedures are retrieved, never generated. If a procedure is not in this database, refer to your physical QRH immediately.",
        blocks: [
          { type: "aviationQrh" },
        ],
      },
    ],
  },

  // ──────────────────────────── MX / MAINTENANCE ────────────────────────────
  "av-mx-001": {
    title: "MX",
    subtitle: "PC-12/47E · Aeromed Air · Hawaii",
    disclaimer: "Airworthiness determination is the sole authority of the certifying A&P/IA — this record is for tracking and documentation only",
    cas: { RED: 0, YELLOW: 1, BLUE: 1, WHITE: 3, GREEN: 4 },
    tabs: [
      {
        id: "aircraft",
        label: "Aircraft",
        description: "Your aircraft record — the anchor for all maintenance, inspections, and compliance tracking. Everything else connects here.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "AIRWORTHY · PC-12/47E",     detail: "No MEL Category A or B items · cleared for all operations" },
            { band: "GREEN",  title: "Annual current",             detail: "Completed Dec 2025 · Next due Dec 2026" },
            { band: "YELLOW", title: "100-hour due in ~53 hrs",    detail: "Current: 1,847 TTSN · Due: 1,900 · At ~15 hrs/month → ~3.5 months" },
          ] },
          { type: "kpis", items: [
            { label: "Operator",            value: "Aeromed Air",   band: "WHITE" },
            { label: "Make / Model",        value: "Pilatus PC-12/47E",     band: "WHITE" },
            { label: "Engine",              value: "PT6A-67P · 1,200 SHP",  band: "WHITE" },
            { label: "Total airframe time", value: "1,847 hrs TTSN",        band: "WHITE" },
            { label: "Engine time (SMOH)",  value: "1,847 / 3,600 TBO",    band: "WHITE" },
            { label: "Engine remaining",    value: "1,753 hrs",             band: "GREEN" },
            { label: "Annual due",          value: "Dec 15 2026",           band: "GREEN" },
            { label: "100-hour due",        value: "1,900 hrs (~53 away)",  band: "YELLOW" },
          ] },
          { type: "table", title: "Aircraft certificates", cols: ["Document", "Status", "Expires"], rows: [
            ["FAA Registration",          "Current",   "Dec 31 2028"],
            ["Standard Airworthiness",    "Current",   "No expiration (maintained)"],
            ["IFR-certified (91.411)",    "Current",   "Mar 2027"],
            ["Transponder (91.413)",      "Current",   "Mar 2027"],
            ["ELT (91.207)",              "Current",   "Dec 2026"],
          ] },
        ],
      },
      {
        id: "aircraft-logbook",
        label: "Aircraft Logbook",
        description: "Append-only aircraft maintenance logbook — every entry timestamped and A&P-signed. The legal record of this aircraft's life.",
        blocks: [
          { type: "table", title: "Maintenance logbook (most recent first)", cols: ["Date", "TTSN", "Description", "Category", "Signed by"], rows: [
            ["Jul 15 2026", "1,847", "Gear door light R/M insp — socket defective, MEL deferred Cat C",   "Unscheduled", "Williams, R A&P"],
            ["Jun 28 2026", "1,800", "100-hour inspection — all items cleared · oil change MIL-PRF-23699", "Scheduled",   "Williams, R A&P/IA"],
            ["Jun 15 2026", "1,782", "PT6A chip detector inspection — no material · clear",                "Inspection",  "Williams, R A&P"],
            ["May 10 2026", "1,744", "AD 2026-08-12 compliance — fuel cap seal replacement",               "AD",          "Williams, R A&P"],
            ["Dec 15 2025", "1,601", "Annual inspection — all ADs current · airworthy",                    "Annual",      "Williams, R IA"],
            ["Dec 12 2025", "1,601", "ELT battery replacement — Kannad 406 AF-Compact · exp Dec 2027",    "Inspection",  "Williams, R A&P"],
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "LOG MAINTENANCE", title: "Tell Alex to log a maintenance entry", detail: "Say: 'Log maintenance on the PC-12 — [description], [A&P name], [TTSN], [date].' The entry appends to this logbook and cannot be altered after signing.", action: "Open chat" },
          ] },
        ],
      },
      {
        id: "scheduled-mx",
        label: "Scheduled MX",
        description: "All calendar- and hour-based scheduled maintenance — 100-hour, Annual, phase checks, and recurring ADs with due dates.",
        blocks: [
          { type: "table", title: "Upcoming scheduled maintenance", cols: ["Event", "Basis", "Due", "Remaining", "Status"], rows: [
            ["100-hour inspection",             "Hours",    "1,900 hrs",    "53 hrs (~3.5 mo)",  "Schedule now"],
            ["Annual inspection (91.409)",      "Calendar", "Dec 15 2026",  "~130 days",         "Plan ahead"],
            ["ELT battery / inspection (91.207)","Calendar","Dec 2026",     "~130 days",         "Coordinate w/ Annual"],
            ["Altimeter/static (91.411)",        "Calendar", "Mar 2027",    "~7 months",         "Tracking"],
            ["Transponder (91.413)",             "Calendar", "Mar 2027",    "~7 months",         "Tracking"],
            ["PT6A TBO (on-condition)",          "Hours",    "3,600 hrs",   "1,753 hrs",         "On track"],
            ["AD 2026-08-12 fuel cap seal",      "Calendar", "May 2027",    "~9 months",         "Tracking"],
          ] },
          { type: "cards", items: [
            { band: "YELLOW", label: "SCHEDULE NOW", title: "100-hour inspection due at 1,900 hrs", detail: "53 hrs remaining at current pace (~15 hrs/month) = approximately mid-November 2026. Coordinate with Williams MX now. Last 100-hr took 2 days AOG. Plan around Aeromed scheduling.", action: "Contact A&P" },
          ] },
        ],
      },
      {
        id: "unscheduled-mx",
        label: "Unscheduled MX",
        description: "Open squawks, pilot write-ups, and unscheduled maintenance events. Log a squawk by telling Alex.",
        blocks: [
          { type: "flags", items: [
            { band: "YELLOW", title: "Gear door light — right main inoperative", detail: "Logged Jul 15 2026 · MEL 32-60-01 · Cat C 30-day deferral · Placard installed · No operational restriction day/night VFR/IFR · A&P Williams notified · Part on order: light assy P/N 1149-002 · Repair scheduled Jul 28" },
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "No Category A or B open items", text: "Aircraft is cleared for all operations. One open Cat C MEL item (gear door light) does not restrict dispatch. Placard installed at R/H main gear door." },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "LOG A SQUAWK", title: "Tell Alex about any discrepancy", detail: "Say: 'Log a squawk — [describe the issue].' Alex creates a timestamped entry and notifies your A&P. Squawks are immutable — resolved, not deleted.", action: "Open chat" },
          ] },
        ],
      },
      {
        id: "inspections",
        label: "Inspections",
        description: "Complete inspection status — every FAR-required and operator inspection with last completed and next due.",
        blocks: [
          { type: "table", title: "Required inspection status", cols: ["Inspection", "FAR", "Last completed", "Next due", "Status"], rows: [
            ["Annual inspection",           "91.409",  "Dec 15 2025",           "Dec 15 2026",         "Current ✓"],
            ["100-hour inspection",         "91.409",  "Jun 28 2026 @ 1,800h",  "1,900h (~53 hrs)",    "⚠ Due ~Nov 2026"],
            ["Altimeter/static system",     "91.411",  "Mar 2025",              "Mar 2027",            "Current ✓"],
            ["Transponder",                 "91.413",  "Mar 2025",              "Mar 2027",            "Current ✓"],
            ["ELT battery/inspection",      "91.207",  "Dec 2025",              "Dec 2026",            "Current ✓"],
            ["VOR checks (IFR ops)",        "91.171",  "Per flight",            "Per flight",          "Crew responsibility"],
            ["Pitot-static (IFR)",          "91.411",  "Mar 2025",              "Mar 2027",            "Current ✓"],
            ["PT6A chip detector",          "Ops spec", "Jun 15 2026",          "Per 100-hr",          "Current ✓"],
          ] },
          { type: "prose", items: [
            { band: "BLUE", title: "Part 135 additional inspections", text: "Aeromed Air Part 135 OpSpecs add progressive/phase inspections above Part 91 minimums. Check current OpSpecs §D for operator-specific intervals on the PC-12/47E." },
          ] },
        ],
      },
      {
        id: "ads-sbs",
        label: "ADs / SBs",
        description: "Airworthiness directive compliance and open service bulletins.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "23 ADs complied",         detail: "All applicable ADs current as of Dec 2025 annual" },
            { band: "YELLOW", title: "1 recurring AD upcoming", detail: "AD 2026-08-12 fuel cap seal due May 2027" },
            { band: "GREEN",  title: "No emergency ADs",        detail: "No SAIB or emergency airworthiness directive outstanding" },
          ] },
          { type: "table", title: "Recurring ADs", cols: ["AD Number", "Subject", "Interval", "Last done", "Next due", "Status"], rows: [
            ["2026-08-12", "PC-12 fuel cap seal replacement", "12-month", "May 2026",  "May 2027",  "Current ✓"],
            ["2024-15-03", "Propeller hub inspection",        "1,000h",   "1,200h",    "2,200h",    "Current ✓"],
          ] },
          { type: "table", title: "Open service bulletins (non-mandatory)", cols: ["SB Number", "Subject", "Priority", "Status"], rows: [
            ["PC12-25-027", "Cabin door seal replacement",    "Non-mandatory", "Open — review at next Annual"],
            ["PC12-71-014", "Engine inlet de-ice inspection", "Non-mandatory", "Open — before winter ops"],
          ] },
        ],
      },
      {
        id: "documents",
        label: "Documents",
        description: "Aircraft documents — AFM, registration, airworthiness certificate, weight & balance, and 337s.",
        blocks: [
          { type: "cards", items: [
            { band: "GREEN",  label: "AFM / POH",        title: "PC-12/47E AFM Rev 12", detail: "Uploaded · W&B and performance tabs active · 387 pages", action: "View" },
            { band: "GREEN",  label: "REGISTRATION",     title: "FAA Registration — current", detail: "Expires Dec 31 2028 · Class: Airplane · Category: Standard", action: "View" },
            { band: "GREEN",  label: "AIRWORTHINESS",    title: "Standard Airworthiness Certificate", detail: "Issued · No expiration · Aircraft maintained per Part 91/135", action: "View" },
            { band: "GREEN",  label: "WEIGHT & BALANCE", title: "Current W&B data on file", detail: "Empty weight and CG from AFM · Used by CoPilot for preflight W&B computation", action: "View" },
            { band: "YELLOW", label: "337 FORMS",        title: "No 337 field approvals on file", detail: "Upload any STC or field approval 337s if applicable.", action: "Upload" },
          ] },
        ],
      },
    ],
  },

  // ────────────────────────────── DISPATCH ──────────────────────────────────
  "av-dispatch-001": {
    title: "Dispatch",
    subtitle: "Aeromed Air · Hawaii · Part 135",
    disclaimer: "Formal release required before departure — crew and aircraft legality verified at dispatch time",
    cas: { RED: 0, YELLOW: 1, BLUE: 0, WHITE: 1, GREEN: 3 },
    tabs: [
      {
        id: "fleet-map",
        label: "Fleet Map",
        description: "Live fleet position map — fleet aircraft shown in gold, other ADS-B traffic in white. METAR dots colored by flight category. Toggle Traffic layer to see all ADS-B.",
        blocks: [
          { type: "aviationMap", center: [20.5, -157.0], zoom: 7, height: 500,
            icaos: ["PHOG", "PHNL", "PHKO", "PHTO", "PHNY", "PHJH", "PHLI"],
            fleetTails: ["N701AA", "N702AA", "N703AA"] },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Today's and upcoming flight schedule — trips, tail assignments, crew, and release status.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN", title: "2 flights today",       detail: "AMA-0808-01 en route · AMA-0808-02 departs 18:00Z" },
            { band: "GREEN", title: "All crew legal",         detail: "All assigned crew within duty time limits" },
            { band: "GREEN", title: "All tails airworthy",    detail: "3 available PC-12 tails · no AOG aircraft today" },
          ] },
          { type: "table", title: "Today's schedule — 2026-08-08", cols: ["Trip", "Tail", "Crew PIC", "Route", "Depart", "Status"], rows: [
            ["AMA-0808-01", "N701AA", "Rivera A.",    "PHOG → PHNL", "14:00Z", "En route"],
            ["AMA-0808-02", "N702AA", "Martinez J.", "PHKO → PHOG", "18:00Z", "Pending"],
            ["AMA-0808-03", "N703AA", "—",           "—",           "—",      "Available"],
          ] },
          { type: "table", title: "Upcoming 3 days", cols: ["Date", "Trip", "Route", "Tail", "Status"], rows: [
            ["Aug 9",  "AMA-0809-01", "PHNL → PHTO", "N701AA", "Scheduled"],
            ["Aug 10", "AMA-0810-01", "PHOG → PHNL", "N702AA", "Scheduled"],
            ["Aug 10", "AMA-0810-02", "PHKO → PHOG", "N703AA", "Tentative"],
          ] },
        ],
      },
      {
        id: "crew",
        label: "Crew",
        description: "Crew legality computed per 14 CFR §135.273 (unscheduled Part 135). Skye requires actual duty period start, rest hours, and accumulated flight hours before releasing a trip — a proposed schedule is not verification. Provide these to Skye to get a computed release package.",
        blocks: [
          { type: "table", title: "Crew legality — today (§135.273 snapshot)", cols: ["Pilot", "Cert", "Medical", "Duty used / rem", "24h flight", "Status"], rows: [
            { band: "GREEN",  cells: ["Rivera A.",    "ATP · PC-12 type", "Class 1 — May 2027",  "4h / 10h rem",  "2.1h / 8h max",  "● GREEN"] },
            { band: "YELLOW", cells: ["Martinez J.", "ATP · PC-12 type", "Class 1 — Aug 2026 ⚠","0h / 14h",      "0h / 8h max",    "● CAUTION"] },
            { band: "GREEN",  cells: ["Thompson K.", "CPL · Inst",        "Class 2 — Mar 2027",  "0h / 14h",      "0h / 8h max",    "● GREEN"] },
          ] },
          { type: "flags", items: [
            { band: "YELLOW", title: "Martinez J. — Medical renewal in 32 days", detail: "Class 1 due Aug 2026 · Schedule AME appointment this week · Still legal to fly now" },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "RELEASE GATE — §135.273", title: "Tell Skye your duty start + rest + flight hours to compute a release", detail: "Say: 'Release AMA-0810-01 — duty started 06:00 HST, 9h rest prior, 0h flight today, 214h this quarter, 612h this year.' Skye computes all §135.273 limits and issues RELEASED / CONDITIONAL / BLOCKED with citations. Missing any input = BLOCKED.", action: "Start release" },
          ] },
        ],
      },
      {
        id: "pax-manifest",
        label: "Pax Manifest",
        description: "Passenger manifest for active and upcoming flights — names, weights, mission type (medevac or charter), and W&B feed.",
        blocks: [
          { type: "table", title: "AMA-0808-01 — active flight (air medical)", cols: ["Name", "Weight", "Role", "Notes"], rows: [
            ["Patient",     "180 lbs", "Patient",      "Air medical — PHOG → PHNL · Queen's Medical Center"],
            ["Medic 1",     "195 lbs", "Flight nurse",  "Aeromed crew"],
            ["Medic 2",     "175 lbs", "Paramedic",     "Aeromed crew"],
          ] },
          { type: "table", title: "AMA-0808-02 — charter flight (PHKO → PHOG 18:00Z)", cols: ["Name", "Weight", "Role", "Notes"], rows: [
            ["Reyes, Maria",    "145 lbs", "Passenger", "Corporate charter · Maui Land & Pineapple"],
            ["Reyes, Carlos",   "185 lbs", "Passenger", "Corporate charter · Maui Land & Pineapple"],
            ["Tanaka, Yuki",    "130 lbs", "Passenger", "Corporate charter · Maui Land & Pineapple"],
            ["Baggage",          "85 lbs", "Cargo",     "2 soft bags · aft baggage · W&B verified"],
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "ADD PAX", title: "Tell Skye to add a passenger to any flight", detail: "Say: 'Add pax to AMA-0808-02 — [name], [weight], [role].' The manifest updates in the dispatch record and feeds W&B automatically. Charter and medevac pax handled the same way.", action: "Open chat" },
          ] },
        ],
      },
      {
        id: "aircraft-status",
        label: "Aircraft Status",
        description: "Fleet airworthiness — current status of all tails available to dispatch.",
        blocks: [
          { type: "table", title: "Fleet status — Aug 8 2026", cols: ["Tail", "TTSN", "Next due", "MEL items", "Status"], rows: [
            ["N701AA", "1,847", "100-hr @ 1,900h",  "1 Cat C — gear door light (no restriction)", "AIRWORTHY"],
            ["N702AA", "2,301", "Annual Apr 2027",   "None",                                        "AIRWORTHY"],
            ["N703AA", "1,412", "Annual Nov 2026",   "None",                                        "AIRWORTHY"],
          ] },
          { type: "prose", items: [
            { band: "GREEN", title: "All three tails available for dispatch today", text: "N701AA has one Cat C MEL deferral (gear door light) — no operational restriction. Placard installed. N701AA cleared for release." },
          ] },
          { type: "cards", items: [
            { band: "WHITE", label: "MX DETAIL", title: "View full MX record for any tail", detail: "Click through to the MX worker for squawk history, open work orders, inspection status, and component life tracking for any tail.", action: "Open MX worker" },
          ] },
        ],
      },
      {
        id: "notams",
        label: "NOTAMs",
        description: "Active NOTAMs for Hawaii operations — relevant to today's Aeromed routes.",
        blocks: [
          { type: "cards", items: [
            { band: "BLUE", label: "LIVE NOTAMS", title: "Ask Alex to pull current NOTAMs for your route", detail: "Tell Alex: 'Get NOTAMs for PHOG to PHNL' — Alex pulls live NOTAMs from the FAA and summarizes operationally relevant items.", action: "Open chat" },
            { band: "WHITE", label: "STANDING", title: "PHOG — Confirm ILS 02/20 and RNAV approaches", detail: "Standard operations. Confirm approach status before filing.", action: "Confirm" },
          ] },
        ],
      },
      {
        // 2026-09-05 role-switcher pass — real, live METAR weather for the
        // same Hawaii bases as NOTAMs above. Dispatch needs this in-lens
        // (not just a click-through to CoPilot's preflight tab), since a
        // weather briefing is one of the two attestations ReleaseFlightModal
        // requires before a release can be issued.
        id: "weather",
        label: "Weather",
        description: "Live METARs for today's operating bases — the weather-briefing half of a release decision.",
        blocks: [],
      },
      {
        // 2026-09-05 role-switcher pass — real release history from
        // POST /v1/aviation:dispatch:releaseFlight (ReleaseFlightModal),
        // read back via the existing GET /v1/aviation:dispatch:releases
        // endpoint. That endpoint existed with no UI reading it before this;
        // this tab is the real go/no-go record dispatch actually needs to
        // see, not a new fixture.
        id: "releases",
        label: "Releases",
        description: "Every flight release issued from this workspace — PIC, aircraft, W&B and weather-briefing attestation, and releasing authority.",
        blocks: [],
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
            { band: "GREEN",  title: "N702AA — Airworthy",    detail: "2,301 TTSN · 890 TSMOH · Next inspection: Apr 2027" },
            { band: "GREEN",  title: "N703AA — Airworthy",    detail: "1,847 TTSN · 412 TSMOH · Next inspection: Nov 2026" },
            { band: "RED",    title: "N701AA — OOS",          detail: "FCU squawk open · Pilot write-up 2026-07-30 · MX in progress" },
          ] },
          { type: "table", title: "Fleet status", cols: ["Tail", "TTSN", "TSMOH", "Next Due", "Status"], rows: [
            ["N701AA", "2,847", "1,240", "Annual Feb 2027", "GROUNDED"],
            ["N702AA", "2,301", "890",   "Annual Apr 2027", "Airworthy"],
            ["N703AA", "1,847", "412",   "Annual Nov 2026", "Airworthy"],
          ] },
          { type: "flags", items: [
            { band: "RED",    title: "N701AA — FCU squawk open",          detail: "Pilot Martinez · 2026-07-30 14:23Z · MX triage in progress · Est return 48h" },
            { band: "YELLOW", title: "N703AA — Annual due in 76 days",    detail: "Due Nov 2026 · Schedule now to avoid AOG at inspection time" },
            { band: "WHITE",  title: "N701AA — Fuel cap MEL not applicable", detail: "MX confirmed: not MEL-deferrable. Aircraft OOS until repaired." },
          ] },
        ],
      },
      {
        id: "tail-detail",
        label: "Tail Detail",
        description: "N701AA complete record — specs, configuration, open items, and document status.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",    title: "OOS — FCU squawk",      detail: "Open since 2026-07-30 · MX in triage · Not MEL-deferrable" },
            { band: "WHITE",  title: "2,847 TTSN",            detail: "PT6A-67P · 1,240 TSMOH · OH interval 3,600h" },
            { band: "GREEN",  title: "AFM uploaded",          detail: "PC-12/47E AFM Rev 12 · W&B and performance tabs unlocked" },
          ] },
          { type: "kpis", items: [
            { label: "Registration",   value: "N701AA", band: "WHITE" },
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
            { band: "RED",   title: "N701AA · WO-2026-047 · FCU / fuel cap — left wing",  detail: "Pilot Martinez 2026-07-30 · MX Chen in triage · Parts on hand · Est 4h repair · WO open" },
            { band: "GREEN", title: "N703AA · Resolved · Nav light inoperative — 2026-07-18", detail: "Pilot Thompson 2026-07-18 · A&P Davis replaced nav light assembly 2026-07-19 · Signed off · Aircraft returned to service" },
          ] },
          { type: "table", title: "Squawk log — last 30 days", cols: ["Tail", "Date", "Description", "Status", "MX"], rows: [
            ["N701AA", "2026-07-30", "FCU / left fuel cap missing",     "OPEN",     "Chen K."],
            ["N703AA", "2026-07-18", "Nav light inoperative",            "CLOSED",   "Davis R."],
            ["N702AA", "2026-07-12", "Autopilot disconnect caution",     "CLOSED",   "Chen K."],
            ["N701AA", "2026-07-01", "Ice detector test fail — left",   "CLOSED",   "Davis R."],
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
            { band: "GREEN",  label: "REGISTRATION",     title: "N701AA FAA Registration", detail: "Expires 2028-12-31 · Class: Airplane · Category: Standard", action: "View" },
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
    subtitle: "N701AA · Pacific Air Partners · Maintenance Record",
    disclaimer: "All entries are append-only and require A&P or IA signature",
    cas: { RED: 1, YELLOW: 1, BLUE: 0, WHITE: 2, GREEN: 2 },
    tabs: [
      {
        id: "work-orders",
        label: "Work Orders",
        description: "Open and recent work orders — every job from squawk to sign-off, append-only.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",    title: "1 open — WO-2026-047", detail: "FCU / fuel cap · N701AA · Est 4h · Parts on hand" },
            { band: "GREEN",  title: "Closed this month: 3",  detail: "Nav light, autopilot caution, ice detector — all signed off" },
            { band: "GREEN",  title: "Parts on hand",         detail: "PC12-FUELCAP-LH in stock · No AOG parts order required" },
          ] },
          { type: "table", title: "Work orders", cols: ["WO #", "Tail", "Description", "A&P", "Status", "Hours"], rows: [
            ["WO-2026-047", "N701AA", "FCU / fuel cap — left wing",   "Chen K.",  "OPEN",     "4 est"],
            ["WO-2026-044", "N703AA", "Nav light assembly replacement", "Davis R.", "CLOSED",   "1.5"],
            ["WO-2026-041", "N702AA", "Autopilot disconnect — AHRS reset", "Chen K.", "CLOSED",  "0.5"],
            ["WO-2026-038", "N701AA", "Ice detector — left sensor R&R",   "Davis R.", "CLOSED",   "2.0"],
          ] },
        ],
      },
      {
        id: "component-life",
        label: "Component Life",
        description: "Time-limited component status across the fleet — engine, props, and life-limited parts.",
        blocks: [
          { type: "heroes", items: [
            { band: "GREEN",  title: "N701AA engine — 1,240 / 3,600 TSMOH",  detail: "2,360 hrs remaining · 65% life used" },
            { band: "GREEN",  title: "N702AA engine — 890 / 3,600 TSMOH",    detail: "2,710 hrs remaining · 25% life used" },
            { band: "YELLOW", title: "N703AA prop — 412 / 2,400 TSMOH",      detail: "Approaching mid-life — 17% life remaining · Next O/H within 6 months" },
          ] },
          { type: "table", title: "Life-limited components", cols: ["Tail", "Component", "TTSN", "Interval", "Remaining", "Status"], rows: [
            ["N701AA", "PT6A-67P engine",   "1,240", "3,600h",  "2,360h",  "GREEN"],
            ["N701AA", "Propeller",          "1,240", "2,400h",  "1,160h",  "GREEN"],
            ["N702AA", "PT6A-67P engine",    "890",  "3,600h",   "2,710h",  "GREEN"],
            ["N702AA", "Propeller",           "890",  "2,400h",   "1,510h",  "GREEN"],
            ["N703AA", "PT6A-67P engine",    "412",  "3,600h",   "3,188h",  "GREEN"],
            ["N703AA", "Propeller",           "412",  "2,400h",   "412h",    "YELLOW"],
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
            ["N701AA", "WO-2026-047 FCU repair",  "2026-08-01", "—",     "2 days",  "OPEN"],
            ["N703AA", "Annual inspection",         "2026-11-15", "2,000h", "108 days", "Schedule"],
            ["N701AA", "Annual inspection",         "2027-02-15", "3,000h", "200 days", "OK"],
            ["N702AA", "Annual inspection",         "2027-04-15", "2,600h", "259 days", "OK"],
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
            { band: "RED",    title: "N701AA — OOS",          detail: "FCU squawk · No dispatch until cleared by MX · WO-2026-047 open" },
            { band: "YELLOW", title: "Martinez — 6h duty remaining", detail: "Current duty period: 12h · 6h used · 6h remaining" },
            { band: "GREEN",  title: "N702AA — Released",     detail: "Rivera / Thompson · KTLH → KMCO · Departs 14:00Z · Package complete" },
          ] },
          { type: "table", title: "Today's dispatch board", cols: ["Trip", "Tail", "Crew PIC", "Route", "Depart", "Legality", "Status"], rows: [
            ["PAP-2026-112", "N702AA", "Rivera A.",   "KTLH→KMCO", "14:00Z", "Legal", "Released"],
            ["PAP-2026-113", "N701AA", "Martinez J.", "KMCO→KTPA", "16:00Z", "Legal", "Blocked — OOS"],
            ["PAP-2026-114", "N703AA", "Thompson K.", "KTPA→KEYW", "18:00Z", "Legal", "Pending"],
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
        description: "Weight and balance computation — uses N702AA operator-uploaded AFM data.",
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
            ["N702AA", "PAP-112", "KTLH", "KMCO", "En route", "15:52Z"],
            ["N703AA", "Ground",  "KTPA", "—",    "Airworthy", "—"],
            ["N701AA", "Ground",  "KTLH", "—",    "GROUNDED",  "—"],
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
            ["Rivera A. (ATP)",     "Class 1 — Dec 2026",  "Feb 2026", "Feb 2026", "Nov 2026 ⚠",  "Jun 2027", "YELLOW"],
            ["Martinez J. (ATP)",   "Class 1 — Aug 2026",  "Jan 2026", "Jan 2026", "Sep 2027",     "Sep 2027", "GREEN"],
            ["Thompson K. (CPL)",   "Class 2 — Mar 2027",  "Mar 2026", "Mar 2026", "N/A",          "Mar 2027", "GREEN"],
          ] },
          { type: "flags", items: [
            { band: "YELLOW", title: "Rivera A. — PC-12 type recurrent due Nov 2026", detail: "71 days · Schedule FSI/SimuFlite simulator now to avoid gap in schedule" },
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
            ["Rivera A.",    "PC-12 Type Recurrent", "Nov 2026", "71 days", "Schedule simulator"],
          ] },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Upcoming training events — simulator slots, checkrides, and ground training.",
        blocks: [
          { type: "cards", items: [
            { band: "YELLOW", label: "UPCOMING", title: "Rivera A. — PC-12 type recurrent", detail: "Due Nov 2026 · FSI Scottsdale preferred · Contact: 480-555-0131 · 2-day course + sim session", action: "Schedule" },
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
            ["Rivera A.",    "PAP-110", "PAP-112", "Rest", "Rest",    "PAP-116", "Rest",    "Rest"],
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
            ["Rivera A.",    "4h",  "10h",  "Current",  "Current (Dec)", "GREEN"],
            ["Martinez J.", "6h",  "6h",   "Current",  "Due 32 days",  "YELLOW"],
            ["Thompson K.", "0h",  "14h",  "Current",  "Current (Mar)", "GREEN"],
          ] },
          { type: "flags", items: [
            { band: "YELLOW", title: "Martinez J. — medical approaching expiration", detail: "32 days to Class 1 renewal · Legal to fly now · Flag at 30-day threshold" },
            { band: "RED",    title: "N701AA OOS — Martinez PAP-2026-113 blocked",  detail: "Assigned aircraft out of service · DISPATCH blocked release · Coordinate tail substitution" },
          ] },
        ],
      },
      {
        id: "reserve-pool",
        label: "Reserve Pool",
        description: "Reserve crew availability — duty-legal pilots available for substitution or coverage.",
        blocks: [
          { type: "cards", items: [
            { band: "WHITE", label: "RESERVE", title: "No reserve crew on standby today", detail: "Contact Rivera A. (off duty, rest period complete) or Martinez J. (on duty, 6h remaining) for any coverage needs.", action: "Contact crew" },
          ] },
        ],
      },
      {
        id: "conflicts",
        label: "Conflicts",
        description: "Scheduling conflicts — duty time, rest violations, or double-booking flags.",
        blocks: [
          { type: "flags", items: [
            { band: "RED",    title: "PAP-2026-113 — tail conflict", detail: "N701AA assigned but OOS. Reassign to N703AA (airworthy, Thompson K. available) or cancel trip." },
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
            ["Summer thunderstorm exposure (Florida corridor)", "High", "High", "HIGH", "Go/no-go criteria in GOM Section 4", "Rivera A."],
            ["Single-engine exposure — long overwater legs",    "Low",  "High", "MED",  "Alternate fuel planning requirement",  "Rivera A."],
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
            { label: "Last random",        value: "Rivera A. — Jun 2026",     band: "GREEN" },
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
    subtitle: "Rivera, Alex · Aeromed · PC-12/47E",
    disclaimer: "Advisory only — go/no-go authority rests with the PIC",
    cas: { RED: 0, YELLOW: 9, BLUE: 0, WHITE: 0, GREEN: 6 },
    tabs: [
      {
        id: "logbook",
        label: "My Logbook",
        description: "Your digital pilot logbook — append-only, chain-signed, portable. Every entry includes business purpose for IRS documentation.",
        blocks: [
          { type: "kpis", items: [
            { label: "Calendar year",   value: "116.8 hrs",    band: "WHITE" },
            { label: "Last 12 months",  value: "170.1 hrs",    band: "WHITE" },
            { label: "Last 90 days",    value: "54.9 hrs",     band: "WHITE" },
            { label: "Last 60 days",    value: "33.4 hrs",     band: "WHITE" },
            { label: "Last 30 days",    value: "7.0 hrs",      band: "WHITE" },
          ] },
          { type: "cards", items: [
            { band: "BLUE", label: "LOGBOOK", title: "Log your last flight with Alex", detail: "Tell Alex your route, aircraft, and flight time — it will be appended to your Vault logbook as an immutable, chain-signed record with IRS business-purpose documentation.", action: "Log a flight" },
          ] },
        ],
      },
      {
        id: "currency",
        label: "Currency",
        description: "Your Aeromed compliance tracker — real data from your FVO profile as of 2026-08-01. 9 items expire 09/30/2026.",
        blocks: [
          { type: "heroes", items: [
            { band: "YELLOW", title: "9 items expire 09/30/2026",       detail: "Recurrent window opens now. Schedule PC12 Flight, Emergency Training, Ground, and 5 other items before Sep 30." },
            { band: "GREEN",  title: "Medical — current",                detail: "Medical 1 Year · Completed 05/11/2026 · Expires 05/31/2027" },
            { band: "GREEN",  title: "HUET — current",                   detail: "Raft Hands On · Completed 09/22/2025 · Expires 09/30/2027" },
          ] },
          { type: "table", title: "Expiring 09/30/2026 — schedule now", cols: ["Item", "Last Completed", "Expires"], rows: [
            ["FW - Gen Sub",           "09/19/2025", "09/30/2026"],
            ["PC12 - Emergency Training", "09/19/2025", "09/30/2026"],
            ["PC12 - Flight",          "03/21/2026", "09/30/2026"],
            ["PC12 - Ground",          "09/19/2025", "09/30/2026"],
            ["PC12 - 293",             "09/19/2025", "09/30/2026"],
            ["PC12 - 297",             "03/21/2026", "09/30/2026"],
            ["FW - 293 (a) 1, 4-8",   "10/12/2025", "09/30/2026"],
            ["FW - CBT Q3",            "—",          "09/30/2026"],
            ["PC12 - CTS",             "—",          "09/30/2026"],
          ] },
          { type: "table", title: "Current — no action needed", cols: ["Item", "Completed", "Expires"], rows: [
            ["Medical 1 Year",    "05/11/2026", "05/31/2027"],
            ["FW - 299",          "03/21/2026", "03/31/2027"],
            ["FW - CBT Q1",       "03/30/2026", "03/31/2027"],
            ["FW - CBT Q2",       "06/27/2026", "06/30/2027"],
            ["FW - CBT Q4",       "12/29/2025", "12/31/2026"],
            ["HUET - Raft Hands On", "09/22/2025", "09/30/2027"],
          ] },
        ],
      },
      {
        id: "my-aircraft",
        label: "My Aircraft",
        description: "Your primary aircraft — N701AA status and next flight readiness.",
        blocks: [
          { type: "heroes", items: [
            { band: "RED",   title: "N701AA — OOS",     detail: "FCU squawk · WO-2026-047 · Est return 2026-08-01" },
            { band: "GREEN", title: "N702AA — Available", detail: "Airworthy · 2,301 TTSN · Prepped for PAP-112 today" },
          ] },
          { type: "cards", items: [
            { band: "RED",   label: "MY AIRCRAFT", title: "N701AA out of service", detail: "MX working WO-2026-047 (FCU/fuel cap). Next available: estimated 2026-08-01. Use N702AA for scheduled trips.", action: "Track WO" },
          ] },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Your upcoming trips, training, and duty periods.",
        blocks: [
          { type: "table", title: "This week", cols: ["Date", "Trip", "Route", "Tail", "Depart", "Status"], rows: [
            ["Jul 29", "PAP-112", "KTLH→KMCO", "N702AA", "14:00Z", "Released"],
            ["Jul 31", "Rest",    "—",           "—",      "—",      "Rest day"],
            ["Aug 1",  "PAP-116", "KMCO→KTLH", "N702AA", "16:00Z", "Pending"],
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
            { band: "BLUE", label: "READY", title: "Tell Alex your route to build a preflight package", detail: "Alex will pull live weather, NOTAMs, compute W&B from your N701AA AFM, calculate FRAT score, and generate a release-ready package.", action: "Start planning" },
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

AV_CANVAS["av-copilot-pc12"]  = copilotVariant("PC-12/47E", "N701AA · PC-12/47E", "N701AA", "PC-12/47E", "PT6A-67P", "3,600h");
AV_CANVAS["av-copilot-b200"]  = copilotVariant("King Air B200", "N·B200 · King Air B200", "N·B200", "King Air B200", "PT6A-42", "3,600h");
AV_CANVAS["av-copilot-b350"]  = copilotVariant("King Air B350", "N·B350 · King Air B350", "N·B350", "King Air B350", "PT6A-60A", "3,600h");
AV_CANVAS["av-copilot-c90"]   = copilotVariant("King Air C90", "N·C90 · King Air C90", "N·C90", "King Air C90B", "PT6A-21", "3,500h");
AV_CANVAS["av-copilot-208b"]  = copilotVariant("Caravan 208B", "N·208B · Cessna 208B", "N·208B", "208B Grand Caravan", "PT6A-114A", "3,600h");
AV_CANVAS["av-copilot-sr22"]  = copilotVariant("Cirrus SR22 G5", "N705AA · Cirrus SR22 G5", "N705AA", "SR22 G5 POH", "IO-550-N", "2,000h");

// ─────────────────────────── GROUND SCHOOL (PERSONAL) ─────────────────────
AV_CANVAS["av-ground-school-001"] = {
  title: "Ground School",
  subtitle: "My Courses · Progress · Oral Prep · PC-12 Recurrent",
  disclaimer: "Study material only — certification standards are set by the FAA examiner",
  cas: { RED: 0, YELLOW: 1, BLUE: 2, WHITE: 2, GREEN: 2 },
  tabs: [
    {
      id: "my-courses",
      label: "My Courses",
      description: "Your enrolled ground school courses — progress, due dates, and what's next. Tap any course to open it.",
      blocks: [
        { type: "heroes", items: [
          { band: "YELLOW", title: "9 courses due Sep 30 2026",         detail: "PC-12 recurrent window · Schedule FSI Scottsdale sim block as anchor (Flight + Emergency + Ground) · CBT and ground modules online" },
          { band: "BLUE",   title: "PC12 CTS — no completion on file",  detail: "Crew Threat and Error management — required for recurrent window · 4-hour classroom or online" },
          { band: "GREEN",  title: "CBT Q1 Q2 Q4 complete",             detail: "Quarterly CBT modules current · Q3 due Sep 30" },
        ] },
        { type: "cards", items: [
          { band: "YELLOW", label: "⚠ NOT STARTED · SIM REQUIRED", title: "PC12 — Flight · Type Recurrent Simulator",    detail: "FlightSafety Int'l · Scottsdale (KSDL) or Denver (KAPA) · 2-day full-motion sim · Due Sep 30 2026. Click to open Active Course for curriculum.", action: "Open course" },
          { band: "YELLOW", label: "⚠ NOT STARTED · SIM REQUIRED", title: "PC12 — Emergency Training · Emergency Sim",   detail: "FlightSafety Int'l · Covered in FSI 2-day block with Flight · Memory items + emergency scenarios · Due Sep 30 2026.", action: "Open course" },
          { band: "YELLOW", label: "⚠ NOT STARTED · GROUND",       title: "PC12 — Ground · Type Recurrent Ground",       detail: "FlightSafety Int'l · Ground portion of 2-day sim block · Systems, abnormals, QRH review · Due Sep 30 2026.", action: "Open course" },
          { band: "YELLOW", label: "⚠ NO RECORD ON FILE",           title: "PC12 — CTS · Crew Threat & Error Management", detail: "Annual recurrent requirement · 4-hour classroom + scenario debrief · Due Sep 30 2026. Ask Skye to study CRM concepts now.", action: "Study with Skye" },
          { band: "YELLOW", label: "⚠ NO RECORD ON FILE",           title: "FW — CBT Q3 · Quarterly CBT Module",          detail: "Online CBT module — complete any time before Sep 30 2026. Skye can cover the Q3 topics interactively to prepare.", action: "Study with Skye" },
          { band: "YELLOW", label: "⚠ EXPIRING",                    title: "FW — Gen Sub · Fixed-Wing General Subjects",  detail: "Annual ground topic review · Due Sep 30 2026. Skye can run an interactive review of Gen Sub topics.", action: "Study with Skye" },
          { band: "YELLOW", label: "⚠ EXPIRING",                    title: "PC12 — 293 · FAR 61.293 Ground",              detail: "Required ground knowledge review per FAR 61.293 · Due Sep 30 2026.", action: "Study with Skye" },
          { band: "YELLOW", label: "⚠ EXPIRING",                    title: "PC12 — 297 · FAR 61.297 Ground",              detail: "Required ground knowledge review per FAR 61.297 · Due Sep 30 2026.", action: "Study with Skye" },
          { band: "YELLOW", label: "⚠ EXPIRING",                    title: "FW — 293(a) 1, 4-8 · Fixed-Wing Operations", detail: "Fixed-wing operations review items 1, 4–8 · Due Sep 30 2026. Skye can walk through each item.", action: "Study with Skye" },
        ] },
      ],
    },
    {
      id: "active-course",
      label: "Active Course",
      description: "Your current course — curriculum outline, where you are, and what's next. Skye teaches any module interactively.",
      blocks: [
        { type: "heroes", items: [
          { band: "YELLOW", title: "PC-12/47E Type Recurrent — FSI 2-day course", detail: "FlightSafety International · Scottsdale (KSDL) or Denver (KAPA) · Full-motion sim" },
          { band: "BLUE",   title: "Skye can run interactive oral prep now",        detail: "No sim slot needed for the knowledge portion — Skye covers every systems topic in conversational depth" },
        ] },
        { type: "table", title: "PC-12/47E Type Recurrent — curriculum outline", cols: ["Module", "Topic", "Format", "Status"], rows: [
          ["1 — Systems",    "Powerplant · PT6A-67P · fuel system · oil system",          "Ground + oral",   "Not started"],
          ["2 — Systems",    "Pressurization · bleed air · outflow valve · safety valve", "Ground",          "Not started"],
          ["3 — Systems",    "Hydraulics · landing gear · brakes · nosewheel steering",   "Ground",          "Not started"],
          ["4 — Systems",    "Avionics · Primus Apex · autopilot · autothrottle",         "Ground",          "Not started"],
          ["5 — Emergency",  "Engine fire · emergency descent · pressurization loss",      "Sim · memory",    "Not started"],
          ["6 — Emergency",  "Smoke/fumes · gear malfunction · electrical failure",        "Sim · memory",    "Not started"],
          ["7 — Maneuvers",  "IFR proficiency · approaches · partial panel · abnormal",    "Sim",             "Not started"],
          ["8 — CTS",        "Crew Threat and Error management · scenario debrief",        "Ground + debrief","Not started"],
        ] },
        { type: "cards", items: [
          { band: "BLUE", label: "START WITH SKYE", title: "Run Module 1 — PT6A-67P powerplant with Skye now", detail: "Say: 'Teach me PC-12 PT6A-67P systems at ACS Proficient level — start with the engine, fuel system, and autofeather, then quiz me on memory items.' Skye tracks what you've covered and picks up where you left off.", action: "Start lesson" },
        ] },
      ],
    },
    {
      id: "quiz-exam",
      label: "Quiz & Exam",
      description: "AI-scored quizzes with rubric. Click any topic below to start a Skye quiz — Socratic probing before the answer, exactly like a real oral exam. Or type it in the chat.",
      blocks: [
        { type: "heroes", items: [
          { band: "BLUE",  title: "Click a topic below to start your quiz now", detail: "Each card starts a Skye oral prep session — no setup needed. Skye probes before revealing answers, just like a DPE." },
          { band: "GREEN", title: "4 ACS proficiency levels",                   detail: "Novice: recall · Developing: application · Proficient: analysis · Expert: synthesis + judgment" },
        ] },
        { type: "cards", items: [
          { band: "BLUE",   label: "15 Qs · PROFICIENT", title: "PT6A-67P Powerplant — Engine systems quiz",           detail: "Engine, fuel system, oil system, autofeather, chip detector, ITT limits. Say: 'Quiz me on PC-12 engine systems — 15 questions at proficient.'",                     action: "Start quiz" },
          { band: "YELLOW", label: "10 Qs · EXPERT",     title: "Pressurization failure — emergency oral quiz",        detail: "Outflow valve, safety valve, emergency descent triggers, O2 duration, crew actions. Say: 'PC-12 pressurization emergency — 10 questions at expert.'",               action: "Start quiz" },
          { band: "YELLOW", label: "12 Qs · EXPERT",     title: "Emergency memory items — engine fire / smoke / gear", detail: "All memory items from the QRH. Say: 'Run PC-12 emergency memory items quiz — start with engine fire, then pressurization, then smoke/fumes.'",                    action: "Start quiz" },
          { band: "BLUE",   label: "20 Qs · DEVELOPING", title: "FAR 61.293 / 61.297 — regulatory ground review",    detail: "Flight review requirements, currency, logging, recency. Say: 'Quiz me on .293 and .297 content at developing level.'",                                              action: "Start quiz" },
          { band: "BLUE",   label: "25 Qs · PROFICIENT", title: "IFR regulations — alternates, fuel, approaches",    detail: "Alternate requirements, fuel reserves, approach minimums, ATC instructions. Say: 'IFR regs quiz — alternates, fuel, approaches, minimums.'",                     action: "Start quiz" },
          { band: "BLUE",   label: "10 Qs · PROFICIENT", title: "CTS — Crew Threat and Error management",            detail: "Threat identification, error management, CRM principles. Say: 'CTS scenario quiz — 10 questions from the annual CRM module.'",                                   action: "Start quiz" },
        ] },
        { type: "prose", items: [
          { band: "GREEN", title: "How Skye scores you", text: "Skye uses the ACS task-based rubric across 4 levels. After each quiz set Skye gives a proficiency summary by topic — the same way an FSI instructor rates you before the sim check. Your scores append to your study record." },
        ] },
      ],
    },
    {
      id: "progress",
      label: "Progress",
      description: "Your completion tracking — courses done, quiz scores, and what's left before Sep 30.",
      blocks: [
        { type: "kpis", items: [
          { label: "Courses complete",     value: "0 / 9 in window",    band: "YELLOW" },
          { label: "CBT modules",          value: "3 / 4 complete",     band: "YELLOW" },
          { label: "Days to Sep 30",        value: "53 days",            band: "YELLOW" },
          { label: "Sim slot needed",       value: "2 days · FSI",       band: "YELLOW" },
        ] },
        { type: "table", title: "Completion tracker", cols: ["Course", "Completion date", "Signed by / Score"], rows: [
          ["PC12 - Flight",          "—", "—"],
          ["PC12 - Ground",          "—", "—"],
          ["PC12 - Emergency Training","—","—"],
          ["PC12 - CTS",             "—", "—"],
          ["FW - Gen Sub",           "—", "—"],
          ["FW - CBT Q3",            "—", "—"],
          ["PC12 - 293",             "—", "—"],
          ["PC12 - 297",             "—", "—"],
          ["FW - 293 (a) 1, 4-8",   "—", "—"],
        ] },
        { type: "cards", items: [
          { band: "YELLOW", label: "BOOK NOW", title: "Schedule FSI Scottsdale — PC-12 type recurrent", detail: "FSI Scottsdale (KSDL) or Denver (KAPA). 2-day course covers PC12 Flight + Ground + Emergency Training in one visit. After booking, tell Alex the date — he'll mark all three as scheduled and block your Aeromed schedule.", action: "Ask Skye to draft the request" },
        ] },
      ],
    },
    {
      id: "study-materials",
      label: "Study Materials",
      description: "Quick-reference crib sheets — PC-12 memory items, key limitations, and currency requirements.",
      blocks: [
        { type: "table", title: "PC-12/47E emergency memory items", cols: ["Emergency", "Immediate actions"], rows: [
          ["Engine fire",          "Condition lever CUTOFF · firewall shutoff CLOSE · NESA OFF · emergency descent"],
          ["Pressurization loss",  "O2 masks ON · descend FL250 (target 14,000 ft) · squawk 7700 · land ASAP"],
          ["Smoke / fumes",        "O2 mask + goggles · identify source · ventilate if safe · land ASAP"],
          ["Engine failure T/O",   "Autofeather arms · maintain Vy 105 KIAS · assess runway remaining"],
          ["Emergency descent",    "Power idle · prop full forward · Vmo−10 · bank 30-45° · squawk 7700 · declare"],
          ["Gear malfunction",     "Emergency extension checklist · fly the aircraft · land longest runway available"],
        ] },
        { type: "table", title: "Key limitations — PC-12/47E", cols: ["Parameter", "Limit", "Notes"], rows: [
          ["Vmo",                        "237 KIAS / Mmo 0.52",   "Never exceed — monitor in descent"],
          ["Max gear speed (Vle)",        "185 KIAS",              "Also max extension speed"],
          ["Max flap speed",              "150 KIAS (T/O) · 130 KIAS (LDG)", "Placard in cockpit"],
          ["Max crosswind (demonstrated)","25 kt",                 "Operator may limit lower"],
          ["PT6A ITT continuous",         "820°C",                 "1,090°C for 5 sec start limit"],
          ["Prop reverse",                "Below 40 KIAS",          "Fine pitch available airborne emergency"],
        ] },
        { type: "table", title: "Currency requirements (Part 135 · Aeromed)", cols: ["Requirement", "Interval", "Standard"], rows: [
          ["PC-12 type recurrent",  "Annual (Sep 30 window)",        "FSI sim + ground + emergency + CTS"],
          ["IFR proficiency",       "6 approaches + holds in 6 mo",  "Or IPC with CFII"],
          ["Night pax currency",    "3 full-stop night ldgs / 90 d", "If carrying night pax"],
          ["Medical — Class 1",     "40+: 6 months",                 "AME exam required"],
          ["FAR 61.293/297",        "Annual",                        "Aeromed-specific operations ground"],
        ] },
      ],
    },
  ],
};

export function getAvCanvas(slug) {
  return AV_CANVAS[slug] || null;
}
