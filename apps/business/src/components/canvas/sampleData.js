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
 * Does this worker (or its vertical) have any sample KPI data defined?
 * @param {string} workerSlug
 * @param {string|null} [verticalKey]
 * @returns {boolean}
 */
export function hasSampleData(workerSlug, verticalKey = null) {
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
    title: "Logbook (last 5 entries)",
    sections: [
      { heading: "2026-04-29 · KSEA → KPDX", body: "Total · 1.2 · IFR · Day · Single Pilot" },
      { heading: "2026-04-22 · KPDX → KSEA", body: "Total · 1.1 · VFR · Day · Single Pilot" },
      { heading: "2026-04-18 · KSEA → KSFO", body: "Total · 2.0 · IFR · Night · Single Pilot · 1 ILS" },
      { heading: "2026-04-15 · KSEA local",  body: "Total · 1.4 · VFR · Day · Pattern · 4 landings" },
      { heading: "2026-04-08 · KSEA → KGEG", body: "Total · 0.9 · IFR · Day · Single Pilot · 1 RNAV" },
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
    title: "Duty / rest",
    fields: [
      { label: "Duty hours (today)",    value: "0" },
      { label: "Duty hours (7d)",       value: "12.4" },
      { label: "Rest required",         value: "10h" },
      { label: "Last rest period",      value: "11h ago" },
    ],
  },
  "training": {
    title: "Training & proficiency",
    sections: [
      { heading: "Recurrent training",  body: "Annual proficiency · due Aug 2026\nIPC · current\nEmergency procedures · current" },
      { heading: "In-progress",         body: "Glass cockpit refresher · 60% complete\nNew avionics qualification · scheduled May 18" },
    ],
  },
  "documents": {
    title: "Documents",
    items: [
      "POH (PC12-NG, current rev) · uploaded",
      "Insurance certificate · current",
      "Annual inspection report · 2025-08",
      "Avionics qualification cert · 2024-11",
      "Currency endorsement (CFI) · 2026-04",
    ],
  },
  "copilot": {
    title: "CoPilot — recent",
    summary: "Ready to assist with preflight, currency review, weight & balance, and post-flight summaries. Ask any question to get started.",
  },
};

// Real Estate suite (development + professional) — shared fixture content.
const RE_FIXTURES = {
  "overview": {
    title: "Portfolio overview",
    subtitle: "Sample snapshot",
    fields: [
      { label: "Active deals",        value: "8" },
      { label: "Pipeline value",      value: "$4.2M" },
      { label: "Avg DOM",             value: "24 days" },
      { label: "Close rate",          value: "67%" },
    ],
  },
  "listings": {
    title: "Active listings",
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
  if (!isDemoMode() || !worker) return null;
  const slug = worker.slug || worker.workerId || "";
  const vertical = worker.vertical || worker.suite || "";
  const catalogId = String(worker.catalogId || "").toUpperCase();

  // 1. Spine
  if (SPINE_FIXTURES[slug] && SPINE_FIXTURES[slug][tabId]) {
    return { ...SPINE_FIXTURES[slug][tabId], ...DEMO };
  }
  // 2. Aviation CoPilot
  if (/^AV-P\d/.test(catalogId) && AVIATION_COPILOT_FIXTURES[tabId]) {
    return { ...AVIATION_COPILOT_FIXTURES[tabId], ...DEMO };
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
