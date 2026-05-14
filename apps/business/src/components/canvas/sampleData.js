/**
 * sampleData.js — Render-time sample data for empty workers (49.30 Phase 1, Option A).
 *
 * No Firestore writes. Sample values are rendered into the canvas only when the
 * user has no real data AND demo mode is active. Clearing demo mode flips a
 * localStorage flag and the canvas falls back to true empty state.
 *
 * Indexed by the same workerSlug used in WORKER_INTELLIGENCE / WORKER_CHECKLISTS.
 * KPI ids must match the kpi.id field in WORKER_INTELLIGENCE so values can
 * substitute 1:1 when the real value is null.
 */

const HIDE_SAMPLES_KEY = "ta_hide_samples";

export function isDemoMode() {
  try { return localStorage.getItem(HIDE_SAMPLES_KEY) !== "1"; } catch { return true; }
}

export function clearDemoMode() {
  try {
    localStorage.setItem(HIDE_SAMPLES_KEY, "1");
    window.dispatchEvent(new Event("ta:demo-mode-changed"));
  } catch {}
}

export function restoreDemoMode() {
  try {
    localStorage.removeItem(HIDE_SAMPLES_KEY);
    window.dispatchEvent(new Event("ta:demo-mode-changed"));
  } catch {}
}

/**
 * Map a raw vertical string (display label, slug, or suite name) to a canonical
 * key that VERTICAL_INTELLIGENCE / VERTICAL_SAMPLES use. Returns null if no match.
 */
export function normalizeVerticalKey(rawVertical) {
  const v = String(rawVertical || "").toLowerCase();
  if (!v) return null;
  if (v.includes("aviation") || v.includes("aero") || v.includes("flight") || v.includes("pilot") || v.startsWith("av-")) return "aviation";
  if (v.includes("auto-dealer") || v.startsWith("auto") || v === "auto" || v.startsWith("dealer")) return "auto";
  if (v.includes("real") || v.includes("estate") || v.includes("property")
      || v.startsWith("cre-") || v === "cre" || v.includes("commercial") || v.includes("tenant")
      || v.includes("brokerage") || v.includes("title") || v.startsWith("esc-")) return "real-estate";
  if (v.includes("invest") || v.includes("finance") || v.includes("capital")
      || v.startsWith("ir-") || v === "ir" || v.includes("cap-table") || v.includes("cap_table")
      || v.includes("underwriting") || v.includes("portfolio") || v.includes("fund")) return "investment";
  if (v.includes("government") || v.startsWith("gov") || v.includes("permit") || v.includes("public-sector")
      || v.includes("dmv") || v.includes("inspection") || v.includes("recording")) return "government";
  return null;
}

/**
 * Vertical-level intelligence — shape matches WORKER_INTELLIGENCE, used as
 * fallback when a worker has no worker-specific KPI definitions.
 */
export const VERTICAL_INTELLIGENCE = {
  "aviation": {
    kpis: [
      { id: "hours-flown", label: "Hours Flown (90d)", value: "--", unit: "", hint: "Sync logbook to populate" },
      { id: "approaches", label: "Approaches (90d)", value: "--", unit: "", hint: "Log approaches to populate" },
      { id: "training-due", label: "Training Due (30d)", value: "--", unit: "", hint: "Add training schedule to populate" },
      { id: "days-since-flight", label: "Days Since Last Flight", value: "--", unit: "", hint: "Log a flight to populate" },
    ],
    quickActions: [
      { label: "Currency check", prompt: "Run my currency check across categories. Tell me what is expiring next." },
      { label: "Logbook summary", prompt: "Summarize my logbook for the last 90 days." },
      { label: "Plan training", prompt: "Help me plan training for upcoming currency requirements." },
    ],
  },
  "auto": {
    kpis: [
      { id: "units-sold", label: "Units Sold (MTD)", value: "--", unit: "", hint: "Connect DMS to populate" },
      { id: "avg-gross", label: "Avg Gross / Unit", value: "--", unit: "$", hint: "Connect DMS to populate" },
      { id: "fi-penetration", label: "F&I Penetration", value: "--", unit: "%", hint: "Log F&I products to populate" },
      { id: "lot-turn", label: "Lot Turn (days)", value: "--", unit: "", hint: "Sync inventory to populate" },
    ],
    quickActions: [
      { label: "Deal walkthrough", prompt: "Walk me through a customer deal. Include trade, financing, and F&I products." },
      { label: "Inventory review", prompt: "Show me which inventory needs to move and recommend pricing actions." },
      { label: "Sales scorecard", prompt: "Build a sales scorecard for my team this month." },
    ],
  },
  "real-estate": {
    kpis: [
      { id: "active-deals", label: "Active Deals", value: "--", unit: "", hint: "Add deals to populate" },
      { id: "pipeline-value", label: "Pipeline Value", value: "--", unit: "$", hint: "Add deal values to populate" },
      { id: "avg-dom", label: "Avg DOM", value: "--", unit: "", hint: "Sync MLS to populate" },
      { id: "close-rate", label: "Close Rate", value: "--", unit: "%", hint: "Log closings to populate" },
    ],
    quickActions: [
      { label: "Property analysis", prompt: "Analyze a property. I will share the address and ask for a valuation, condition read, and fit assessment." },
      { label: "Run comps", prompt: "Run comparable sales for a subject property." },
      { label: "Market report", prompt: "Pull together a market report for my farm area." },
    ],
  },
  "investment": {
    kpis: [
      { id: "pipeline-value", label: "Pipeline Value", value: "--", unit: "$", hint: "Add active deals to populate" },
      { id: "active-diligence", label: "Active Diligence", value: "--", unit: "", hint: "Move deals to diligence to populate" },
      { id: "portfolio-irr", label: "Portfolio IRR", value: "--", unit: "%", hint: "Log positions to populate" },
      { id: "deals-screened", label: "Deals Screened (MTD)", value: "--", unit: "", hint: "Screen deals to populate" },
    ],
    quickActions: [
      { label: "Screen a deal", prompt: "Screen this deal for IC. Flag risks, missing diligence items, and your recommendation." },
      { label: "Portfolio update", prompt: "Give me a portfolio performance update across my active positions." },
      { label: "LP one-pager", prompt: "Draft an LP update one-pager for this quarter." },
    ],
  },
  "government": {
    kpis: [
      { id: "open-permits", label: "Open Permits", value: "--", unit: "", hint: "Sync permitting system to populate" },
      { id: "avg-processing", label: "Avg Processing (days)", value: "--", unit: "", hint: "Log permit timelines to populate" },
      { id: "citizen-requests", label: "Citizen Requests (MTD)", value: "--", unit: "", hint: "Log inbound requests to populate" },
      { id: "compliance-score", label: "Compliance Score", value: "--", unit: "%", hint: "Run compliance audits to populate" },
    ],
    quickActions: [
      { label: "Permit status", prompt: "Show me permits stalled longer than 14 days and recommend next actions." },
      { label: "Compliance audit", prompt: "Run a compliance audit across active processes. Highlight gaps." },
      { label: "Citizen response", prompt: "Draft a response to a citizen inquiry. I will share the request." },
    ],
  },
};

/**
 * Vertical-level sample KPI values — keyed by the canonical vertical key,
 * with kpiIds matching VERTICAL_INTELLIGENCE entries.
 */
export const VERTICAL_SAMPLES = {
  "aviation": {
    kpis: {
      "hours-flown": 142,
      "approaches": 18,
      "training-due": 2,
      "days-since-flight": 6,
    },
  },
  "auto": {
    kpis: {
      "units-sold": 47,
      "avg-gross": 2850,
      "fi-penetration": 78,
      "lot-turn": 32,
    },
  },
  "real-estate": {
    kpis: {
      "active-deals": 8,
      "pipeline-value": 4200000,
      "avg-dom": 24,
      "close-rate": 67,
    },
  },
  "investment": {
    kpis: {
      "pipeline-value": 28500000,
      "active-diligence": 5,
      "portfolio-irr": 18,
      "deals-screened": 23,
    },
  },
  "government": {
    kpis: {
      "open-permits": 142,
      "avg-processing": 14,
      "citizen-requests": 387,
      "compliance-score": 94,
    },
  },
};

export const WORKER_SAMPLES = {
  "platform-accounting": {
    kpis: {
      "revenue": 47500,
      "expenses": 31200,
      "net-income": 16300,
      "cash-flow": 22400,
    },
  },
  "platform-marketing": {
    kpis: {
      "campaign-roi": 142,
      "leads": 87,
      "email-open-rate": 38,
      "social-reach": 12400,
    },
  },
  "platform-hr": {
    kpis: {
      "team-size": 14,
      "open-positions": 2,
      "reviews-due": 5,
      "compliance-score": 92,
    },
  },
  "platform-control-center-pro": {
    kpis: {
      "revenue": 47500,
      "active-workers": 6,
      "customer-growth": 18,
      "tasks-due": 7,
    },
  },
  "platform-contacts": {
    kpis: {
      "total-contacts": 312,
      "active-clients": 24,
      "followups-due": 9,
      "new-this-month": 18,
    },
  },
};

/**
 * Resolve a sample KPI value if demo mode is active and a sample exists.
 * Checks worker-specific samples first, then falls back to vertical samples.
 * @param {string} workerSlug
 * @param {string} kpiId
 * @param {string|null} [verticalKey] — canonical vertical key from normalizeVerticalKey
 * @returns {number|null}
 */
export function getSampleKpiValue(workerSlug, kpiId, verticalKey = null) {
  if (!isDemoMode()) return null;
  return WORKER_SAMPLES[workerSlug]?.kpis?.[kpiId]
       ?? (verticalKey ? VERTICAL_SAMPLES[verticalKey]?.kpis?.[kpiId] : undefined)
       ?? null;
}

/**
 * Spine workers (platform-*) have custom section UIs that render real backend
 * data — they don't surface the demo KPI tiles or the orange "demo banner".
 * Suppressing sample-data injection for them stops the chat from quoting
 * phantom numbers ($47,500 revenue etc.) that the visible UI never shows.
 */
const SUPPRESS_DEMO_SLUGS = new Set([
  "platform-accounting",
  "platform-marketing",
  "platform-hr",
  "platform-contacts",
  "platform-control-center-pro",
]);

/**
 * Does this worker (or its vertical) have any sample KPI data defined?
 * @param {string} workerSlug
 * @param {string|null} [verticalKey]
 * @returns {boolean}
 */
export function hasSampleData(workerSlug, verticalKey = null) {
  if (SUPPRESS_DEMO_SLUGS.has(workerSlug)) return false;
  return !!WORKER_SAMPLES[workerSlug] || (!!verticalKey && !!VERTICAL_SAMPLES[verticalKey]);
}

// ─────────────────────────────────────────────────────────────────────────────
// CODEX 50.10-T4 — Canvas tab fixtures
//
// Canonical demo data for per-tab canvas content. Hand-curated for Spine workers
// and Aviation CoPilots; vertical-templated for everyone else. The numbers in
// SPINE_FIXTURES align with WORKER_SAMPLES above so the landing-page KPI grid
// and the per-tab canvas tell the same story (e.g. Accounting's $47,500 revenue
// shows up both as a KPI tile and inside the P&L tab's revenue lines).
//
// Every payload returned to a card carries _demo: true so cards can render a
// SAMPLE chip in their header.
// ─────────────────────────────────────────────────────────────────────────────

const DEMO = { _demo: true, _demoLabel: "SAMPLE" };

const SPINE_FIXTURES = {
  "platform-accounting": {
    "overview": {
      title: "Accounting overview",
      subtitle: "Sample period · last 30 days",
      summary: "Healthy month. Revenue is up modestly month-over-month, expenses tracking on plan, and net income comfortably positive.",
      fields: [
        { label: "Revenue", value: "$47,500" },
        { label: "Expenses", value: "$31,200" },
        { label: "Net Income", value: "$16,300" },
        { label: "Cash Flow", value: "$22,400" },
      ],
    },
    "pl": {
      revenue: [
        { label: "Service revenue", amount: 32000 },
        { label: "Product sales", amount: 12500 },
        { label: "Other income", amount: 3000 },
      ],
      totalRevenue: 47500,
      expenses: [
        { label: "Salaries & wages", amount: 18500 },
        { label: "Rent & utilities", amount: 4200 },
        { label: "Software & SaaS", amount: 2100 },
        { label: "Marketing", amount: 3400 },
        { label: "Professional services", amount: 1800 },
        { label: "Other operating", amount: 1200 },
      ],
      totalExpenses: 31200,
      netIncome: 16300,
    },
    "balance-sheet": {
      title: "Balance Sheet",
      subtitle: "As of period end",
      sections: [
        { heading: "Assets",      body: "Cash & equivalents · $84,200\nAccounts receivable · $22,400\nFixed assets (net) · $12,800\nTotal assets · $119,400" },
        { heading: "Liabilities", body: "Accounts payable · $9,800\nAccrued expenses · $4,200\nLong-term debt · $24,000\nTotal liabilities · $38,000" },
        { heading: "Equity",      body: "Owner equity · $65,100\nRetained earnings · $16,300\nTotal equity · $81,400" },
      ],
    },
    "cash-flow": {
      title: "Cash Flow Statement",
      subtitle: "Sample period · last 30 days",
      sections: [
        { heading: "Operating",   body: "Net income · $16,300\nDepreciation · $1,200\nChange in AR · $4,800\nChange in AP · $2,100\nNet operating · $24,400" },
        { heading: "Investing",   body: "Equipment purchases · -$2,000\nNet investing · -$2,000" },
        { heading: "Financing",   body: "Debt repayment · -$1,500\nOwner draws · -$1,500\nNet financing · -$3,000" },
      ],
      fields: [{ label: "Net change in cash", value: "$22,400 (sample)" }],
    },
    "invoices": {
      invoices: [
        { number: "INV-2041", customer: "Acme Property Group",  amount: 4500, dueDate: "2026-05-15", status: "due" },
        { number: "INV-2040", customer: "Brennan & Co.",        amount: 2800, dueDate: "2026-05-08", status: "overdue" },
        { number: "INV-2039", customer: "Cedar Title Services", amount: 6200, dueDate: "2026-05-22", status: "due" },
        { number: "INV-2038", customer: "Delta Realty Partners",amount: 1950, dueDate: "2026-04-28", status: "paid" },
        { number: "INV-2037", customer: "Echo Capital",         amount: 3300, dueDate: "2026-04-25", status: "paid" },
      ],
    },
    "tax": {
      title: "Tax overview",
      subtitle: "Sample preparation status",
      summary: "Quarterly filings on track. Year-end planning items flagged for review with your CPA.",
      fields: [
        { label: "Q1 estimate paid", value: "$4,200" },
        { label: "Q2 estimate due",  value: "Jun 15" },
        { label: "Sales tax YTD",    value: "$2,140" },
        { label: "Open tax tasks",   value: "3" },
      ],
      sections: [
        { heading: "Upcoming filings", body: "Q2 federal estimate · Jun 15\nState sales tax · Jul 20\n1099 prep · Jan 31" },
      ],
    },
  },
  "platform-hr": {
    "employees": {
      employees: [
        { name: "Maya Chen",    role: "Operations Manager",   startDate: "2024-08-12", status: "active" },
        { name: "Jordan Reed",  role: "Senior Analyst",        startDate: "2025-02-04", status: "active" },
        { name: "Priya Patel",  role: "Marketing Lead",        startDate: "2024-04-22", status: "active" },
        { name: "Sam Walters",  role: "Customer Success",      startDate: "2025-09-15", status: "onboarding" },
        { name: "Lee Nakamura", role: "Engineering",           startDate: "2023-11-03", status: "active" },
      ],
    },
    "onboarding": {
      title: "Onboarding checklist",
      items: [
        "Offer letter signed",
        "I-9 / W-4 collected",
        "Direct deposit set up",
        "Equipment provisioned",
        "Day-1 systems access",
        "Manager 1:1 scheduled",
      ],
    },
    "performance": {
      title: "Performance reviews",
      subtitle: "Sample cycle · current quarter",
      fields: [
        { label: "Reviews due",    value: "5" },
        { label: "Completed",      value: "8" },
        { label: "Avg rating",     value: "4.1 / 5" },
        { label: "PIPs active",    value: "0" },
      ],
      sections: [
        { heading: "Recent",       body: "Maya Chen · Exceeds (4.5)\nJordan Reed · Meets (3.8)\nPriya Patel · Exceeds (4.4)" },
      ],
    },
    "compliance": {
      title: "HR compliance",
      summary: "All federal posters current. State filings on schedule. One harassment-prevention training overdue.",
      fields: [
        { label: "Compliance score",   value: "92%" },
        { label: "Training overdue",   value: "1" },
        { label: "Posters current",    value: "Yes" },
        { label: "Last audit",         value: "2026-03-12" },
      ],
    },
  },
  "platform-marketing": {
    "kpis": {
      title: "Marketing KPIs",
      subtitle: "Sample period · last 30 days",
      fields: [
        { label: "Campaign ROI",       value: "142%" },
        { label: "Leads generated",    value: "87" },
        { label: "Email open rate",    value: "38%" },
        { label: "Social reach",       value: "12,400" },
      ],
    },
    "campaigns": {
      invoices: [], // not used by EmailCampaignCard, but passed-through field-tolerant
      title: "Active campaigns",
      sections: [
        { heading: "Spring promo (email)",    body: "Sent · 4,200\nOpen · 38%\nClick · 6.4%\nReplies · 14" },
        { heading: "Q2 prospecting (LinkedIn)", body: "Sent · 1,100\nResponse · 11%\nMeetings booked · 7" },
        { heading: "Newsletter · April",      body: "Sent · 6,800\nOpen · 41%\nClick · 4.9%" },
      ],
    },
    "creative": {
      title: "Creative library",
      summary: "Eight assets in rotation across email, social, and display. Two scheduled for refresh next sprint.",
      items: [
        "Hero image · Spring promo (used 6x)",
        "Email header · Newsletter (used 4x)",
        "LinkedIn carousel · Q2 prospecting",
        "Square social · Customer story #3",
        "Square social · Customer story #4",
      ],
    },
    "content-calendar": {
      title: "Content calendar",
      subtitle: "Next 14 days",
      sections: [
        { heading: "This week", body: "Mon · Newsletter draft\nWed · LinkedIn post\nThu · Customer story #5\nFri · Spring promo refresh" },
        { heading: "Next week", body: "Mon · Newsletter send\nTue · Webinar invite\nThu · Case study publish" },
      ],
    },
    "email": {
      title: "Email performance",
      fields: [
        { label: "Sends (30d)",    value: "12,100" },
        { label: "Open rate",      value: "38%" },
        { label: "Click rate",     value: "5.6%" },
        { label: "Unsubscribes",   value: "0.3%" },
      ],
    },
  },
  "platform-control-center-pro": {
    "revenue": {
      title: "Revenue dashboard",
      subtitle: "Sample period · current month",
      fields: [
        { label: "Revenue (MTD)",   value: "$47,500" },
        { label: "MRR",             value: "$38,200" },
        { label: "New customers",   value: "12" },
        { label: "Churn",           value: "1.4%" },
      ],
    },
    "mrr": {
      title: "Monthly recurring revenue",
      summary: "MRR up 18% over the last quarter. New customer growth balanced against modest churn.",
      sections: [
        { heading: "MRR breakdown", body: "New MRR · +$4,200\nExpansion MRR · +$1,100\nChurned MRR · -$540\nNet new · +$4,760" },
      ],
    },
    "subscribers": {
      title: "Subscribers",
      fields: [
        { label: "Active",          value: "187" },
        { label: "New (MTD)",       value: "12" },
        { label: "Cancelled (MTD)", value: "3" },
        { label: "Net growth",      value: "+9" },
      ],
    },
  },
};

// Aviation CoPilot fixtures — shared content across the 11 CoPilots; aircraft
// tail number is injected per worker if the worker has one.
const AVIATION_COPILOT_FIXTURES = {
  "map": {
    title: "Recent route — KSEA → KPDX",
    region: "Seattle, WA to Portland, OR",
    locations: [
      { address: "Seattle-Tacoma International Airport (KSEA), WA", label: "Departure" },
      { address: "Portland International Airport (KPDX), OR",       label: "Arrival" },
    ],
  },
  "aircraft": {
    title: "Pilatus PC-12/47E NG",
    subtitle: "Sample profile · Type Certificate Data Sheet A04CE · grounded from AFM",
    sections: [
      {
        heading: "Category & Type",
        fields: [
          { label: "Category",       value: "Normal (FAR 23 commuter)" },
          { label: "Type",           value: "Single-engine turboprop" },
          { label: "Certification",  value: "FAA · Transport Canada · EASA" },
          { label: "Crew",           value: "1 (single-pilot certified)" },
          { label: "Seats",          value: "10 max (1 crew + 9 pax)" },
        ],
      },
      {
        heading: "Dimensions",
        fields: [
          { label: "Length",         value: "47 ft 3 in (14.40 m)" },
          { label: "Wingspan",       value: "53 ft 4 in (16.28 m)" },
          { label: "Height",         value: "14 ft (4.26 m)" },
          { label: "Cabin length",   value: "16 ft 11 in" },
          { label: "Cabin width",    value: "5 ft (60 in)" },
          { label: "Cabin height",   value: "4 ft 10 in (58 in)" },
        ],
      },
      {
        heading: "Powerplant",
        fields: [
          { label: "Engine",         value: "Pratt & Whitney Canada PT6A-67P" },
          { label: "Power rating",   value: "1,200 SHP (flat-rated)" },
          { label: "Propeller",      value: "Hartzell 5-blade composite, 1,700 RPM max" },
          { label: "ITT limits",     value: "850°C continuous · 900°C 20 sec transient" },
          { label: "Torque max",     value: "100% continuous" },
        ],
      },
      {
        heading: "Electrical",
        fields: [
          { label: "Main bus",       value: "28 VDC" },
          { label: "Generator",      value: "300A starter-generator + 100A standby" },
          { label: "Battery",        value: "Ni-Cd 24V 43Ah" },
          { label: "Inverter",       value: "115 VAC 400 Hz (avionics)" },
          { label: "External power", value: "GPU required below -20°C" },
        ],
      },
      {
        heading: "Avionics",
        fields: [
          { label: "Suite",          value: "Honeywell Primus Apex / Advanced Cockpit (ACE)" },
          { label: "Displays",       value: "4 × 10.4 in PFD/MFD" },
          { label: "Autopilot",      value: "Dual-channel digital, autoland-capable" },
          { label: "Nav",            value: "Dual FMS · Dual GPS WAAS · VOR/ILS · RNAV" },
          { label: "Surveillance",   value: "TCAS II · TAWS-B · ADS-B Out + In · Mode S" },
          { label: "Weather",        value: "Onboard radar · datalink WX (XM/SBS)" },
        ],
      },
      {
        heading: "Environmental",
        fields: [
          { label: "Pressurization", value: "Max differential 5.75 PSI" },
          { label: "Cabin alt",      value: "8,000 ft @ FL300" },
          { label: "Climate",        value: "Bleed-air heat · vapor-cycle A/C" },
          { label: "Oxygen",         value: "Crew demand · pax constant-flow (required >FL250)" },
          { label: "Ice protection", value: "Pneumatic boots (wings + tail), heated windshield, prop deice, inertial separator" },
        ],
      },
      {
        heading: "Flight Controls",
        fields: [
          { label: "Primary",        value: "Conventional cable-actuated ailerons, elevator, rudder" },
          { label: "Trim",           value: "Electric pitch, manual rudder, aileron tab" },
          { label: "High-lift",      value: "Single-slot Fowler flaps (0° / 15° / 30° / 40°)" },
          { label: "Spoilers",       value: "Inboard roll spoilers" },
          { label: "Stick pusher",   value: "Active near stall (alpha-vane driven)" },
        ],
      },
      {
        heading: "Landing Gear",
        fields: [
          { label: "Type",           value: "Tricycle, hydraulically retractable, trailing-link mains" },
          { label: "Tires",          value: "Main 22×8.0-8 · Nose 16×4.4-7" },
          { label: "Brakes",         value: "Hydraulic carbon discs, anti-skid" },
          { label: "Steering",       value: "Direct nose-wheel · ±54° via rudder pedals" },
        ],
      },
      {
        heading: "Fuel & Oil",
        fields: [
          { label: "Fuel capacity",  value: "402 US gal (2,704 lbs · usable)" },
          { label: "Fuel grade",     value: "Jet A / Jet A-1 / JP-8" },
          { label: "Imbalance max",  value: "200 lbs L/R" },
          { label: "Oil capacity",   value: "12 US qt PT6A engine oil" },
          { label: "Oil consumption", value: "<0.4 qt/hr typical" },
        ],
      },
      {
        heading: "Basic Limitations",
        fields: [
          { label: "Vne",            value: "240 KIAS" },
          { label: "Vno",            value: "185 KIAS" },
          { label: "Va @ MTOW",      value: "152 KIAS" },
          { label: "Vfe approach",   value: "180 KIAS" },
          { label: "Vfe full flap",  value: "154 KIAS" },
          { label: "Vs0 / Vs1",      value: "67 / 84 KIAS (MTOW)" },
          { label: "Max op altitude", value: "FL300" },
          { label: "Max op temp",    value: "ISA +35°C" },
        ],
      },
      {
        heading: "Weights",
        fields: [
          { label: "MTOW",           value: "10,450 lbs" },
          { label: "Max ramp",       value: "10,495 lbs" },
          { label: "Max landing",    value: "9,921 lbs" },
          { label: "Max zero fuel",  value: "8,818 lbs" },
          { label: "Empty (typical)", value: "6,460 lbs" },
          { label: "Useful load",    value: "~3,990 lbs" },
        ],
      },
    ],
  },
  "status": {
    title: "Aircraft status",
    subtitle: "Sample preflight summary",
    fields: [
      { label: "Tail number",        value: "N142TA" },
      { label: "Hobbs",              value: "1,284.6" },
      { label: "Tach",               value: "1,178.2" },
      { label: "Last flight",        value: "6 days ago" },
      { label: "Next inspection",    value: "12 days" },
    ],
  },
  "logbook": {
    title: "Aircraft Logbook · N142TA",
    subtitle: "Per-flight aircraft entries. Squawks here surface to the MX worker.",
    sections: [
      {
        heading: "2026-04-29 · KSEA → KPDX",
        body: "Hobbs 1,284.6 → 1,285.8 (1.2) · Tach 1,178.2 → 1,179.3 · Cycles +1\nFuel: 750 lbs out, 545 lbs in · Block 1.4\nSquawks: NONE\nPIC: S. Combs · ATP · Medical Class 1",
      },
      {
        heading: "2026-04-22 · KPDX → KSEA",
        body: "Hobbs 1,283.4 → 1,284.6 (1.2) · Tach 1,177.1 → 1,178.2 · Cycles +1\nFuel: 700 lbs out, 510 lbs in · Block 1.3\nSquawks: L pitot heat intermittent at takeoff — cycled OK, MEL-deferred · MX worker ticket #2026-0419",
      },
      {
        heading: "2026-04-18 · KSEA → KSFO",
        body: "Hobbs 1,281.4 → 1,283.4 (2.0) · Tach 1,175.1 → 1,177.1 · Cycles +1\nFuel: 1,200 lbs out, 720 lbs in · Block 2.3 · 1 ILS\nSquawks: NONE",
      },
      {
        heading: "2026-04-15 · KSEA local pattern",
        body: "Hobbs 1,280.0 → 1,281.4 (1.4) · Tach 1,173.7 → 1,175.1 · Cycles +4\n4 full-stop landings · Pattern · No issues",
      },
      {
        heading: "2026-04-08 · KSEA → KGEG",
        body: "Hobbs 1,279.1 → 1,280.0 (0.9) · Tach 1,172.8 → 1,173.7 · Cycles +1\nFuel: 480 lbs out, 290 lbs in · Block 1.1 · 1 RNAV\nSquawks: Cabin pressure fluctuation during climb (resolved at level-off) — MX trend log updated",
      },
    ],
    items: [
      "Open MX items: 1 (deferred — L pitot heat intermittent · MEL Section 30-31)",
      "Next inspection: 100-hr (12 flight hrs away · ETD 2026-05-08)",
      "AD compliance: current as of 2026-04-29",
      "SB compliance: current · SB 12-2 outstanding (optional)",
    ],
  },
  "currency": {
    title: "Currency status",
    fields: [
      { label: "Day landings (90d)",    value: "9 / 3 required" },
      { label: "Night landings (90d)",  value: "4 / 3 required" },
      { label: "IFR approaches (6m)",   value: "8 / 6 required" },
      { label: "Holds (6m)",            value: "2 / 1 required" },
      { label: "BFR due",               value: "Aug 2026" },
      { label: "Medical due",           value: "Mar 2027" },
    ],
  },
  "duty": {
    title: "Duty & Risk Assessment",
    subtitle: "Sample · FAR Part 135 single-pilot · operator rules apply",
    sections: [
      {
        heading: "Duty time (FAR 135.267)",
        fields: [
          { label: "On duty",               value: "NO · ready to assume duty" },
          { label: "Duty hours (24h max)",  value: "0 / 14 (single pilot)" },
          { label: "Flight hours (24h)",    value: "0 / 8" },
          { label: "Flight hours (7d)",     value: "5.7 / 34" },
          { label: "Flight hours (30d)",    value: "28.4 / 120" },
          { label: "Flight hours (365d)",   value: "412 / 1,200" },
          { label: "Last rest period",      value: "11h ago · qualifying (≥10h continuous)" },
        ],
      },
      {
        heading: "FRAT — Flight Risk Assessment",
        body: "Operator FRAT (Sample Part 135 operator) scores risk across pilot, aircraft, environment, and mission factors. Risk thresholds:\nGREEN < 20 · YELLOW 20–34 · RED ≥ 35 (DO not depart without operator approval)",
        fields: [
          { label: "Pilot (rest / currency)",   value: "3 pts · GREEN" },
          { label: "Aircraft (squawks / MX)",   value: "5 pts · GREEN (1 MEL-deferred item)" },
          { label: "Environment (WX / time)",   value: "9 pts · GREEN (night IMC departure adds 6)" },
          { label: "Mission (medevac / pax)",   value: "4 pts · GREEN" },
          { label: "TOTAL",                     value: "21 pts · YELLOW · Operator notification recommended" },
        ],
      },
      {
        heading: "Operating rules in force",
        body: "Part 135 · Sample operator GOM · clinical ops policies · flight ops · dispatch procedures (operator-uploaded).\n\nFor reference: Part 91 baseline less restrictive; Part 121 more restrictive (8/13 limits, augmented crew). Use the toggle in Settings to switch rule context.",
      },
    ],
  },
  "training": {
    title: "Training & Proficiency",
    subtitle: "Sample · PC-12/47E systems modules · daily flashcards",
    sections: [
      {
        heading: "Systems courses",
        body: "Powerplant (PT6A-67P) · 12 modules · 78% complete\nElectrical · 9 modules · 100% (recurrent due 2026-09)\nAvionics (Apex / ACE) · 14 modules · 45% complete\nPressurization & environmental · 6 modules · 100%\nIce protection · 4 modules · 100%\nLanding gear & hydraulics · 5 modules · 50% complete\nFlight controls & stall protection · 7 modules · 86%",
      },
      {
        heading: "Recurrent (FAR 135.293/297/299)",
        body: "Annual proficiency check · due Aug 2026\nIFR currency (135.297) · current\nLine check (135.299) · due Nov 2026\nEmergency procedures · current\nCRM · current",
      },
      {
        heading: "Today's flashcards (3 due)",
        body: "1. ITT redline values (continuous / transient)\n2. Emergency descent procedure — first 3 actions\n3. Stall recovery — initial nose-down + power application",
      },
      {
        heading: "Daily reminder",
        body: "Pre-flight habit — 2 skill-sharpeners before every flight:\n  • Review one QRH emergency procedure (aircraft-specific)\n  • Review one operator OpSpec or SOP\n\nPost-flight habit: log squawks + 1 thing that went well, 1 to improve.",
      },
    ],
  },
  "documents": {
    title: "Documents",
    subtitle: "Operator documents available to the CoPilot",
    sections: [
      {
        heading: "Aircraft documents",
        body: "POH / AFM (PC-12/47E NG, current rev) · uploaded\nWeight & Balance template (N142TA-specific) · uploaded\nMEL / Operator MEL · uploaded\nInsurance certificate · current (expires 2026-09-30)\nAirworthiness certificate · current\nRegistration · current (expires 2027-04-30)\nAnnual inspection report · last 2025-08-12\n100-hr inspection · last 2026-03-04",
      },
      {
        heading: "Pilot documents",
        body: "ATP certificate · single-pilot PC-12 type rating · current\nMedical Class 1 · expires 2027-03-15\nBFR · last 2025-08-10 (due 2027-08)\nCFI ground / single-engine · current\nPassport · expires 2031-06\nLast 24 months of currency endorsements · in vault",
      },
      {
        heading: "Operator documents",
        body: "Operator GOM · upload to ground CoPilot\nClinical / medical ops policies · upload\nFlight ops policies · upload\nDispatch procedures · upload\nOpSpecs (A001 / A002 / B050) · upload\nFRAT form · operator-provided",
      },
    ],
  },
  "copilot": {
    title: "CoPilot — recent",
    summary: "Ready to assist with preflight, currency review, weight & balance, and post-flight summaries. Ask any question to get started.",
  },
  "checklists": {
    title: "Standard Checklists",
    subtitle: "PC12-NG · normal procedures",
    sections: [
      { heading: "Preflight",       body: "Exterior walk-around · panel check · fuel sample · oxygen · weather brief · NOTAMs" },
      { heading: "Before start",    body: "Seats / belts · doors · circuit breakers · fuel selector · power · avionics · clearance" },
      { heading: "Start",           body: "Beacon ON · prop area clear · starter engage · ITT monitor · oil pressure · generator on" },
      { heading: "Taxi",            body: "Brakes check · flight controls free · flaps set · trim set · transponder STBY" },
      { heading: "Before takeoff",  body: "Run-up complete · flight instruments · autopilot test · briefing complete · transponder ALT" },
      { heading: "Cruise",          body: "Power set · mixture / prop · pressurization · fuel balance · oxygen check above FL250" },
      { heading: "Descent / approach", body: "Descent brief · ATIS · approach setup · checklists · fuel · weight & balance verified" },
      { heading: "After landing",   body: "Flaps up · transponder STBY · landing lights off · radar off · taxi checklist" },
      { heading: "Shutdown",        body: "Parking brake · prop low pitch · cool down · ignition off · fuel selector · ext power" },
    ],
  },
  "qrh": {
    title: "QRH — Emergency / Abnormal",
    subtitle: "PC12-NG · quick reference (always defer to current AFM)",
    sections: [
      { heading: "Engine failure in flight",     body: "1. Fly the aircraft · best glide 118 KIAS\n2. Identify nearest suitable airport\n3. Attempt restart per AFM\n4. Squawk 7700 · declare emergency\n5. Brief passengers · prepare for forced landing" },
      { heading: "Engine fire in flight",        body: "1. Power lever IDLE · condition lever CUTOFF\n2. Fuel selector OFF · firewall shutoff PULL\n3. Best glide · divert immediately\n4. Smoke / fume checklist if cabin affected" },
      { heading: "Smoke / fire / fumes",         body: "1. Oxygen mask 100% · smoke goggles\n2. Crew comm established\n3. Identify source · isolate electrical bus\n4. Land at nearest suitable airport" },
      { heading: "Loss of pressurization",       body: "1. Don oxygen mask immediately\n2. Emergency descent · 240 KIAS or Vmo\n3. Level off at 10,000 ft or MEA\n4. Pressurization controller · check\n5. Land as soon as practical" },
      { heading: "Electrical failure",           body: "1. Identify failed bus · load shed\n2. Battery / generator switches as required\n3. Standby instruments · emergency lighting\n4. Land at nearest suitable airport" },
      { heading: "Landing gear unsafe",          body: "1. Recycle gear · verify hydraulic\n2. Emergency extension per AFM\n3. Visual confirmation if possible\n4. Brief passengers · land soft field" },
    ],
  },
  "flight-planning": {
    title: "Flight Planning",
    subtitle: "Sample plan · KSEA → KPDX · PC-12/47E NG",
    route: {
      departure:   "KSEA",
      destination: "KPDX",
      alternate:   "KHIO",
      routeString: "KSEA SEA4.OLM SEA OLM.OLM5 KPDX",
      routeSource: "FAA NFDC Preferred Route · KSEA→KPDX · TURBOJET 240–FL450 · cycle 2026-05-15",
      distanceNm:  129,
      eteHm:       "0+38",
      cruiseAlt:   "FL250",
      blockFuel:   "210 lbs",
      reserveFuel: "45 min IFR",
    },
    windsAloft: [
      { altitude: "FL180", wind: "240° / 22 kt", temp: "-12°C" },
      { altitude: "FL210", wind: "250° / 28 kt", temp: "-20°C" },
      { altitude: "FL250", wind: "260° / 32 kt", temp: "-30°C" },
      { altitude: "FL280", wind: "265° / 36 kt", temp: "-36°C" },
    ],
    weather: {
      departure: {
        station: "KSEA",
        metar: "KSEA 130053Z 21008KT 10SM FEW040 12/06 A3008",
        taf:   "TAF KSEA 130020Z 1301/1406 21010KT P6SM SCT040",
      },
      arrival: {
        station: "KPDX",
        metar: "KPDX 130053Z 22006KT 5SM BR BKN025 11/09 A3007",
        taf:   "TAF KPDX 130020Z 1301/1406 22008KT 5SM BR BKN025",
      },
      alternate: {
        station: "KHIO",
        metar: "KHIO 130055Z AUTO 22005KT 6SM BKN030 11/08 A3007",
      },
    },
    notams: [
      "!KPDX 05/142 KPDX RWY 28R/10L PAPI OUT OF SERVICE 2605131000-2605151000",
      "!ZSE 05/098 ZSE AIRSPACE PJE WI AN AREA DEFINED AS 5NM RADIUS OF KPLU SFC-12500FT 2605131400-2605132300",
      "!FDC 5/3942 ZSE PART 95 STAR ATIS RNAV (RNP) BUKLE.BUKLE2 KPDX AMDT 2",
    ],
    briefing: "TFR check clear · NOTAMs reviewed · ATIS Romeo · expect RNAV (RNP) Z RWY 28R at KPDX · contingency to KHIO with adequate fuel · O2 check passenger seats 3-4 · brief sterile cockpit below 10,000.",
    map: { from: "KSEA", to: "KPDX" },
  },
  "performance": {
    title: "Performance",
    subtitle: "Sample · KSEA · departure",
    fields: [
      { label: "OAT",            value: "12°C" },
      { label: "Pressure alt",   value: "433 ft" },
      { label: "Wind",           value: "210° / 8 kt" },
      { label: "Runway",         value: "16L · 11,901 ft · dry" },
      { label: "Takeoff weight", value: "9,820 lbs" },
      { label: "V1",             value: "92 KIAS" },
      { label: "Vr",             value: "98 KIAS" },
      { label: "V2",             value: "104 KIAS" },
      { label: "Takeoff distance", value: "2,140 ft (50 ft obstacle)" },
      { label: "Climb rate (ISA)", value: "1,640 fpm" },
      { label: "Landing distance", value: "1,810 ft (50 ft obstacle)" },
    ],
  },
  "weight-balance": {
    title: "Weight & Balance",
    subtitle: "Sample · KSEA → KPDX",
    fields: [
      { label: "Empty weight",       value: "6,940 lbs @ 184.2 in" },
      { label: "Pilot + crew",       value: "190 lbs @ 130.0 in" },
      { label: "Pax (4)",            value: "720 lbs @ 192.0 in" },
      { label: "Baggage (fwd)",      value: "60 lbs @ 95.0 in" },
      { label: "Baggage (aft)",      value: "120 lbs @ 311.0 in" },
      { label: "Fuel (block)",       value: "1,790 lbs @ 199.5 in" },
      { label: "Takeoff weight",     value: "9,820 lbs · MTOW 10,450 lbs" },
      { label: "CG",                 value: "186.4 in · WITHIN ENVELOPE" },
      { label: "Landing weight",     value: "9,610 lbs · MLW 9,921 lbs" },
      { label: "Landing CG",         value: "186.1 in · WITHIN ENVELOPE" },
    ],
  },
};

// Real Estate suite (development + professional) — shared fixture content.
const RE_FIXTURES = {
  "map": {
    title: "Active property locations",
    region: "Austin, TX",
    locations: [
      { address: "412 Cedar Lane, Austin, TX 78704",      label: "$675K · 14 DOM" },
      { address: "880 Maple Ridge, Austin, TX 78745",     label: "$925K · 8 DOM" },
      { address: "27 Lakeshore Dr, Austin, TX 78732",     label: "$485K · 32 DOM" },
      { address: "1140 Pine Hollow, Austin, TX 78735",    label: "$1.45M · 6 DOM" },
      { address: "65 Birch Court, Austin, TX 78759",      label: "$560K · 19 DOM" },
    ],
  },
  "overview": {
    title: "Portfolio overview",
    subtitle: "Sample snapshot · Downtown Austin metro",
    region: "Austin, TX",
    locations: [
      { address: "412 Cedar Lane, Austin, TX 78704",   label: "$675K" },
      { address: "880 Maple Ridge, Austin, TX 78745",  label: "$925K" },
      { address: "27 Lakeshore Dr, Austin, TX 78732",  label: "$485K" },
      { address: "1140 Pine Hollow, Austin, TX 78735", label: "$1.45M" },
      { address: "65 Birch Court, Austin, TX 78759",   label: "$560K" },
    ],
    fields: [
      { label: "Active deals",        value: "8" },
      { label: "Pipeline value",      value: "$4.2M" },
      { label: "Avg DOM",             value: "24 days" },
      { label: "Close rate",          value: "67%" },
    ],
  },
  "listings": {
    title: "Active listings",
    region: "Austin, TX",
    locations: [
      { address: "412 Cedar Lane, Austin, TX 78704",   label: "3BR · $675K · 14 DOM" },
      { address: "880 Maple Ridge, Austin, TX 78745",  label: "4BR · $925K · 8 DOM" },
      { address: "27 Lakeshore Dr, Austin, TX 78732",  label: "2BR · $485K · 32 DOM" },
      { address: "1140 Pine Hollow, Austin, TX 78735", label: "5BR · $1.45M · 6 DOM" },
      { address: "65 Birch Court, Austin, TX 78759",   label: "3BR · $560K · 19 DOM" },
    ],
    items: [
      "412 Cedar Lane · 3BR / 2BA · $675,000 · 14 DOM",
      "880 Maple Ridge · 4BR / 3BA · $925,000 · 8 DOM",
      "27 Lakeshore Dr. · 2BR / 2BA · $485,000 · 32 DOM",
      "1140 Pine Hollow · 5BR / 4BA · $1.45M · 6 DOM",
      "65 Birch Court · 3BR / 2BA · $560,000 · 19 DOM",
    ],
  },
  "closings": {
    title: "Upcoming closings",
    sections: [
      { heading: "This week",  body: "412 Cedar Lane · May 9 · clear to close\n880 Maple Ridge · May 11 · awaiting appraisal" },
      { heading: "Next week",  body: "27 Lakeshore Dr. · May 17 · title review pending\n65 Birch Court · May 19 · clear to close" },
    ],
  },
  "contacts": {
    title: "Recent contacts",
    items: [
      "Buyer · Sarah & David Kim — pre-approved $850K",
      "Seller · Robert Chen — listing 1140 Pine Hollow",
      "Lender · Pacific Trust · Maria Lopez",
      "Inspector · Coastal Home Inspections · Jamie Park",
    ],
  },
};

// Auto Dealer suite — shared fixture content.
const AUTO_FIXTURES = {
  "overview": {
    title: "Dealer overview",
    subtitle: "Sample MTD",
    fields: [
      { label: "Units sold (MTD)",   value: "47" },
      { label: "Avg gross / unit",   value: "$2,850" },
      { label: "F&I penetration",    value: "78%" },
      { label: "Lot turn",           value: "32 days" },
    ],
  },
  "inventory": {
    vehicles: [
      { vin: "1FTRX12W9XKA12345", year: 2024, make: "Ford",     model: "F-150 XLT",   daysOnLot: 8,  price: 48500 },
      { vin: "5XYZH4AG1JG123456", year: 2023, make: "Hyundai",  model: "Sonata",       daysOnLot: 22, price: 24800 },
      { vin: "WBA8E1G53GNT12345", year: 2024, make: "BMW",      model: "330i",         daysOnLot: 14, price: 41900 },
      { vin: "JTDKARFU2K3098765", year: 2023, make: "Toyota",   model: "Prius",        daysOnLot: 36, price: 27500 },
      { vin: "1G1ZD5ST3LF123456", year: 2024, make: "Chevrolet",model: "Malibu",       daysOnLot: 11, price: 26200 },
    ],
  },
  "deals": {
    title: "Recent deals",
    sections: [
      { heading: "Closed this week",  body: "F-150 XLT · $48,500 · gross $3,100\nSonata · $24,800 · gross $2,400\n330i · $41,900 · gross $4,800" },
      { heading: "Pending",           body: "Prius · awaiting credit\nMalibu · F&I approval pending" },
    ],
  },
  "fi": {
    title: "F&I performance",
    fields: [
      { label: "Penetration",        value: "78%" },
      { label: "Products / deal",    value: "2.4" },
      { label: "Avg F&I gross",      value: "$1,450" },
      { label: "Compliance score",   value: "98%" },
    ],
  },
};

// Long-tail vertical templates — used by the 129 workers that fall through
// to the Overview / Activity / Resources tab structure. Each vertical has
// 3-4 sub-types where helpful (ops, compliance, growth, etc.); single
// template per vertical otherwise.
const LONG_TAIL_TEMPLATES = {
  government: {
    overview: {
      title: "Vertical snapshot",
      subtitle: "Sample · Government services",
      fields: [
        { label: "Open permits",       value: "142" },
        { label: "Avg processing",     value: "14 days" },
        { label: "Citizen requests",   value: "387" },
        { label: "Compliance score",   value: "94%" },
      ],
    },
    activity: {
      title: "Recent activity",
      items: [
        "Permit #2026-0481 issued (residential) · 3h ago",
        "Inspection report filed — 412 Cedar Lane · 8h ago",
        "License renewed — Acme Plumbing LLC · 1d ago",
        "Citizen request received — pothole report · 1d ago",
        "Audit cycle completed — Q1 compliance · 4d ago",
      ],
    },
    resources: {
      title: "Resources",
      items: [
        "Standard operating procedures · v3.2",
        "Permit fee schedule · current",
        "Compliance audit checklist · 2026-Q1",
        "Citizen response templates",
      ],
    },
  },
  web3: {
    overview: {
      title: "Project snapshot",
      subtitle: "Sample · Web3 project",
      fields: [
        { label: "Holders",            value: "8,420" },
        { label: "Treasury (USD)",     value: "$1.24M" },
        { label: "Active proposals",   value: "3" },
        { label: "Engagement (24h)",   value: "+412" },
      ],
    },
    activity: {
      title: "Recent activity",
      items: [
        "Proposal #017 passed — community treasury allocation · 6h ago",
        "Smart contract upgrade deployed — V2.3 · 1d ago",
        "AMA scheduled — May 12 · 2d ago",
        "Holder report published — April · 4d ago",
        "New listing — DEX integration · 1w ago",
      ],
    },
    resources: {
      title: "Resources",
      items: [
        "Tokenomics whitepaper · v2.1",
        "Smart contract audit report",
        "Governance framework",
        "Community guidelines",
      ],
    },
  },
  solar: {
    overview: {
      title: "Pipeline snapshot",
      subtitle: "Sample · Solar / VPP",
      fields: [
        { label: "Installations (YTD)", value: "142" },
        { label: "kW deployed",         value: "1,850" },
        { label: "Permits pending",     value: "18" },
        { label: "AHJ avg approval",    value: "21 days" },
      ],
    },
    activity: {
      title: "Recent activity",
      items: [
        "Install completed — 8.5 kW residential, Phoenix · 2h ago",
        "Permit approved — 25 kW commercial, San Francisco · 1d ago",
        "Net metering enrolled — 12 kW, Albuquerque · 2d ago",
        "Site assessment scheduled — 3 sites · 3d ago",
        "Equipment delivered — 40 panels · 4d ago",
      ],
    },
    resources: {
      title: "Resources",
      items: [
        "AHJ permitting requirements (50-state)",
        "NEC 2023 compliance checklist",
        "Net metering enrollment templates",
        "Equipment specifications library",
      ],
    },
  },
  marketing: {
    overview: {
      title: "Marketing snapshot",
      subtitle: "Sample · last 30 days",
      fields: [
        { label: "Sends (30d)",        value: "12,100" },
        { label: "Open rate",          value: "38%" },
        { label: "Leads generated",    value: "87" },
        { label: "Campaign ROI",       value: "142%" },
      ],
    },
    activity: {
      title: "Recent activity",
      items: [
        "Newsletter sent — April edition · 4,200 recipients · 1d ago",
        "LinkedIn campaign launched — Q2 prospecting · 2d ago",
        "Customer story published — #5 · 3d ago",
        "Webinar invite sent — May 18 · 4d ago",
        "Spring promo refresh shipped · 5d ago",
      ],
    },
    resources: {
      title: "Resources",
      items: [
        "Brand guidelines · v3",
        "Email templates · current",
        "Customer story library",
        "Q2 campaign briefs",
      ],
    },
  },
  re_professional: {
    overview: {
      title: "Operations snapshot",
      subtitle: "Sample · Title & escrow",
      fields: [
        { label: "Open files",         value: "34" },
        { label: "Closings (week)",    value: "8" },
        { label: "Avg cycle (days)",   value: "21" },
        { label: "Curative items",     value: "5" },
      ],
    },
    activity: {
      title: "Recent activity",
      items: [
        "Closing completed — 412 Cedar Lane · 2h ago",
        "Title commitment issued — 880 Maple Ridge · 5h ago",
        "Curative item resolved — 27 Lakeshore Dr. · 1d ago",
        "New file opened — 1140 Pine Hollow · 1d ago",
        "Wire received — 65 Birch Court · 2d ago",
      ],
    },
    resources: {
      title: "Resources",
      items: [
        "Title underwriting guidelines",
        "Closing procedures · current",
        "Curative checklist library",
        "Wire fraud prevention SOP",
      ],
    },
  },
  // Fallback used when vertical has no template — covers any worker that
  // somehow doesn't map to one of the above (platform sub-workers, all, etc).
  generic: {
    overview: {
      title: "Worker overview",
      summary: "This worker is ready to help. Connect data sources and start a conversation to populate this canvas with real activity.",
      fields: [
        { label: "Status",          value: "Ready" },
        { label: "Last interaction", value: "Just now" },
      ],
    },
    activity: {
      title: "Recent activity",
      summary: "Recent work shows up here.",
      items: [
        "No real activity yet — start a conversation to populate this tab",
        "Sample event · 2h ago",
        "Sample event · 6h ago",
      ],
    },
    resources: {
      title: "Resources",
      summary: "Upload your documents to unlock personalized insights.",
      items: [
        "Operating procedures (sample)",
        "Reference checklist (sample)",
        "Best practices (sample)",
      ],
    },
  },
};

// Map a frontend vertical string (which may use different casing/spelling
// from the canonical sampleData keys) to a long-tail template key.
function longTailTemplateKey(vertical) {
  const v = String(vertical || "").toLowerCase();
  if (v === "government" || v.startsWith("gov")) return "government";
  if (v === "web3") return "web3";
  if (v === "solar_vpp" || v === "solar" || v.startsWith("solar")) return "solar";
  if (v === "marketing") return "marketing";
  if (v === "re_professional") return "re_professional";
  return "generic";
}

/**
 * Resolve a per-tab fixture payload for a given worker + tab.
 *
 * Returns null if demo mode is off, the worker has no fixture data, or the
 * tab has no matching template entry. Returned payloads always carry
 * { _demo: true, _demoLabel: "SAMPLE" } so cards can render a SAMPLE chip.
 *
 * Lookup order:
 *   1. Spine workers — explicit tab-keyed map
 *   2. Aviation CoPilots — shared map (if catalogId matches AV-PXX)
 *   3. Real-estate suite — shared map
 *   4. Auto-dealer suite — shared map
 *   5. Long-tail vertical template (overview/activity/resources only)
 *
 * @param {object} worker — minimum {slug, vertical, catalogId}
 * @param {string} tabId — e.g. "pl", "overview", "currency"
 * @returns {object|null} payload for context.payload
 */
export function getFixtureForTab(worker, tabId) {
  if (!worker) return null;
  const slug = worker.slug || worker.workerId || "";
  const vertical = worker.vertical || worker.suite || "";
  const catalogId = String(worker.catalogId || "").toUpperCase();

  // Aviation CoPilot baseline tabs ALWAYS load fixture content, regardless of
  // demo mode. These tabs (Aircraft profile, Logbook, Currency, Duty, Training,
  // Documents) represent the *baseline data layer* — AFM-derived aircraft data
  // and operator-/pilot-scoped status. Without the baseline these tabs would be
  // empty and useless. Real data plumbing replaces the baseline over time.
  // 2026-05-13 (Sean).
  const isAviationCopilot = /^AV-P\d/.test(catalogId);
  if (isAviationCopilot && AVIATION_COPILOT_FIXTURES[tabId]) {
    return { ...AVIATION_COPILOT_FIXTURES[tabId], ...DEMO };
  }

  // Map tabs ALWAYS load fixture content, regardless of demo mode. Sean's rule:
  // every RE worker output leads with a map; aviation always shows the route.
  // Without a fixture the map falls back to "San Francisco, CA" which is wrong
  // for every vertical. Real chat-emitted CANVAS_RENDER markers override.
  if (tabId === "map") {
    if (SPINE_FIXTURES[slug] && SPINE_FIXTURES[slug].map) return { ...SPINE_FIXTURES[slug].map, ...DEMO };
    if ((vertical === "real_estate_development" || vertical === "re_professional") && RE_FIXTURES.map) {
      return { ...RE_FIXTURES.map, ...DEMO };
    }
    if (vertical === "auto_dealer" && AUTO_FIXTURES.map) return { ...AUTO_FIXTURES.map, ...DEMO };
  }

  // All other fixtures remain gated by demo mode.
  if (!isDemoMode()) return null;

  // 1. Spine
  if (SPINE_FIXTURES[slug] && SPINE_FIXTURES[slug][tabId]) {
    return { ...SPINE_FIXTURES[slug][tabId], ...DEMO };
  }
  // 3. Real estate suite
  if ((vertical === "real_estate_development" || vertical === "re_professional") && RE_FIXTURES[tabId]) {
    return { ...RE_FIXTURES[tabId], ...DEMO };
  }
  // 4. Auto dealer
  if (vertical === "auto_dealer" && AUTO_FIXTURES[tabId]) {
    return { ...AUTO_FIXTURES[tabId], ...DEMO };
  }
  // 5. Long-tail vertical templates — only the universal three tabs apply
  const tplKey = longTailTemplateKey(vertical);
  const tpl = LONG_TAIL_TEMPLATES[tplKey] || LONG_TAIL_TEMPLATES.generic;
  if (tpl[tabId]) return { ...tpl[tabId], ...DEMO };
  return null;
}

/**
 * Has this worker been opened before? Used to gate first-time-landing vs
 * returning-auto-fire on the canvas tab bar.
 *
 * Side-effect on call: marks the worker as seen. Call once per worker open.
 * @param {string} slug
 * @returns {boolean} true if worker had been seen prior to this call
 */
export function markWorkerVisitedAndCheck(slug) {
  if (!slug) return false;
  const KEY = "ta_worker_visited";
  let seen = {};
  try {
    seen = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {}
  const wasSeen = !!seen[slug];
  seen[slug] = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch {}
  return wasSeen;
}
