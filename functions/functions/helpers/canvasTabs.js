"use strict";

/**
 * canvasTabs.js — Per-worker canvas tab schema, validation, and default-tabs
 * generator (CODEX 50.10-T3).
 *
 * canvasTabs[] lives on each digitalWorkers/{slug} doc. The CanvasTabBar
 * renders the array as a horizontal tab strip; each tab binds a label to
 * a CANVAS_TYPES signal which resolves to a card via the existing registry.
 *
 * The generator runs at backfill time and on new-worker creation. Once a
 * worker has been hand-authored, generator output is suppressed unless
 * --force is passed in the backfill script.
 */

// Aviation gets a higher cap because CoPilots need the full operational tab
// set (checklists, QRH, flight plan, performance, W&B, aircraft, map) plus
// reference tabs (logbook, currency, duty, training, documents). The frontend
// CanvasTabBar wraps to a second row above 7 visible tabs.
const TAB_CAP_DEFAULT = 6;
const TAB_CAP_AVIATION = 12;
const TAB_MIN = 2;

const VALID_TAB_ID = /^[a-z0-9-]+$/;

function tabCapForVertical(vertical) {
  return vertical === "aviation" ? TAB_CAP_AVIATION : TAB_CAP_DEFAULT;
}

/**
 * Validate a canvasTabs array against the schema.
 * Throws on invalid input. Returns the (possibly normalized) array on success.
 */
function validateCanvasTabs(tabs, vertical) {
  if (!Array.isArray(tabs)) throw new Error("canvasTabs must be an array");
  const cap = tabCapForVertical(vertical);
  if (tabs.length < TAB_MIN) throw new Error(`canvasTabs must have at least ${TAB_MIN} entries`);
  if (tabs.length > cap) throw new Error(`canvasTabs exceeds cap of ${cap} for vertical "${vertical}"`);

  const ids = new Set();
  let defaults = 0;
  for (const t of tabs) {
    if (!t || typeof t !== "object") throw new Error("each tab must be an object");
    if (!VALID_TAB_ID.test(t.id || "")) throw new Error(`invalid tab id "${t.id}"`);
    if (ids.has(t.id)) throw new Error(`duplicate tab id "${t.id}"`);
    ids.add(t.id);
    if (typeof t.label !== "string" || !t.label.trim()) throw new Error(`tab "${t.id}" missing label`);
    if (typeof t.signal !== "string" || !t.signal.trim()) throw new Error(`tab "${t.id}" missing signal`);
    if (typeof t.order !== "number") throw new Error(`tab "${t.id}" missing numeric order`);
    if (t.default === true) defaults++;
  }
  if (defaults !== 1) throw new Error(`exactly one tab must have default:true (got ${defaults})`);
  return tabs;
}

// Spine workers — hand-curated per Sean's 2026-05-04 direction.
// Drop COA from accounting, add Tax. Add Compliance to HR. Marketing
// expands from 2 to 5 tabs. CCP unchanged.
const SPINE_TABS = {
  "platform-accounting": [
    { id: "overview",      label: "Overview",      signal: "card:work-product",            default: true,  order: 0 },
    { id: "pl",            label: "P&L",           signal: "card:accounting-pl",           order: 1 },
    { id: "balance-sheet", label: "Balance Sheet", signal: "card:accounting-balance-sheet",order: 2 },
    { id: "cash-flow",     label: "Cash Flow",     signal: "card:accounting-cashflow",     order: 3 },
    { id: "invoices",      label: "Invoices",      signal: "card:accounting-invoice",      order: 4 },
    { id: "tax",           label: "Tax",           signal: "card:work-product",            order: 5 },
  ],
  "platform-hr": [
    { id: "employees",   label: "Employees",   signal: "card:hr-employee-register", default: true, order: 0 },
    { id: "onboarding",  label: "Onboarding",  signal: "checklist:hr-onboarding",   order: 1 },
    { id: "performance", label: "Performance", signal: "card:hr-performance",       order: 2 },
    { id: "compliance",  label: "Compliance",  signal: "card:work-product",         order: 3 },
    { id: "notices",     label: "Notices",     signal: "card:work-product",         order: 4 },
  ],
  // Visual campaign-performance board (Trump Rule) — see what's winning at a
  // glance. All three tabs render MarketingCampaignBoardCard with a different
  // view (overview / campaigns / creative), fed by buildMarketingPayload.
  "platform-marketing": [
    { id: "overview",  label: "Overview",  signal: "card:marketing-board", default: true, order: 0 },
    { id: "campaigns", label: "Campaigns", signal: "card:marketing-board", order: 1 },
    { id: "creative",  label: "Creative",  signal: "card:marketing-board", order: 2 },
  ],
  "platform-control-center-pro": [
    { id: "revenue",     label: "Revenue Dashboard", signal: "card:control-center-revenue", default: true, order: 0 },
    { id: "mrr",         label: "MRR",               signal: "card:work-product",           order: 1 },
    { id: "subscribers", label: "Subscribers",       signal: "card:work-product",           order: 2 },
  ],
};

// Aviation CoPilot — pilot-operational tab order (Sean's call 2026-05-12).
// Cockpit-first: map + checklists + QRH + flight planning + performance + W&B
// + aircraft up front. Reference (logbook / currency / duty / training /
// documents) follows. Tabs wrap to two rows in CanvasTabBar above ~7.
// Sean's call 2026-05-13: aviation CoPilots open with Flight Planning by
// default — that's where the flight starts. FlightPlanningCard embeds a
// route map at the bottom, so users get planning + map in one canvas.
// Map tab remains second for the full-canvas route view.
const AVIATION_COPILOT_TABS = [
  { id: "flight-planning", label: "Flight Planning",   signal: "card:aviation-flight-planning",  default: true, order: 0 },
  { id: "map",            label: "Map",                signal: "card:re-map",                    order: 1 },
  { id: "checklists",     label: "Checklists",         signal: "card:aviation-checklists",       order: 2 },
  { id: "qrh",            label: "QRH",                signal: "card:aviation-qrh",              order: 3 },
  { id: "performance",    label: "Performance",        signal: "card:aviation-performance",      order: 4 },
  { id: "weight-balance", label: "Weight & Balance",   signal: "card:aviation-weight-balance",   order: 5 },
  { id: "aircraft",       label: "Aircraft",           signal: "card:aviation-aircraft",         order: 6 },
  { id: "logbook",        label: "Logbook",            signal: "card:work-product",              order: 7 },
  { id: "currency",       label: "Currency",           signal: "card:aviation-currency",         order: 8 },
  { id: "duty",           label: "Duty",               signal: "card:work-product",              order: 9 },
  { id: "training",       label: "Training",           signal: "card:work-product",              order: 10 },
  { id: "documents",      label: "Documents",          signal: "card:work-product",              order: 11 },
];

const RE_TABS = [
  { id: "overview", label: "Overview", signal: "card:re-property-analysis", default: true, order: 0 },
  { id: "listings", label: "Listings", signal: "card:work-product",         order: 1 },
  { id: "closings", label: "Closings", signal: "card:real-estate-closing",  order: 2 },
  { id: "contacts", label: "Contacts", signal: "card:work-product",         order: 3 },
];

// RES-001 Real Estate Salesperson — bespoke workflow tabs (CODEX 50.18
// follow-up 2026-05-11). Replaces generic long-tail / RE_TABS for the
// salesperson worker specifically. Buyer + listing dual pipeline +
// active deals in escrow + schedule across showings/closings/follow-up
// + saved CMAs for pricing intelligence.
const RES_SALESPERSON_TABS = [
  { id: "pipeline",  label: "Pipeline",     signal: "card:work-product",         default: true, order: 0 },
  { id: "listings",  label: "Listings",     signal: "card:work-product",         order: 1 },
  { id: "buyers",    label: "Buyers",       signal: "card:work-product",         order: 2 },
  { id: "deals",     label: "Active Deals", signal: "card:real-estate-closing",  order: 3 },
  { id: "schedule",  label: "Schedule",     signal: "card:work-product",         order: 4 },
  { id: "cma",       label: "CMA Library",  signal: "card:re-property-analysis", order: 5 },
];

// GEN-001 Scheduling — cross-vertical scheduling worker (CODEX 50.18
// follow-up 2026-05-11). Calendar coordination, multi-resource booking,
// availability, conflicts, and follow-ups.
const GEN_SCHEDULING_TABS = [
  { id: "calendar",   label: "Calendar",     signal: "card:work-product", default: true, order: 0 },
  { id: "events",     label: "Events",       signal: "card:work-product", order: 1 },
  { id: "availability", label: "Availability", signal: "card:work-product", order: 2 },
  { id: "conflicts",  label: "Conflicts",    signal: "card:work-product", order: 3 },
  { id: "followups",  label: "Follow-ups",   signal: "card:work-product", order: 4 },
];

// BIZ-LAW-001 Business Law / Paralegal — entity lifecycle, document
// templates, signature orchestration, audit trail. First dogfood is the
// TitleApp LLC wind-down; later flows include SOCIII formation governance,
// option grants, board consents, BOI filings, foreign quals.
const BUSINESS_LAW_TABS = [
  { id: "overview",   label: "Overview",      signal: "card:work-product", default: true, order: 0 },
  { id: "documents",  label: "Documents",     signal: "card:work-product", order: 1 },
  { id: "signatures", label: "Signatures",    signal: "card:work-product", order: 2 },
  { id: "filings",    label: "Filings",       signal: "card:work-product", order: 3 },
  { id: "deadlines",  label: "Deadlines",     signal: "card:work-product", order: 4 },
  { id: "audit-trail",label: "Audit Trail",   signal: "card:work-product", order: 5 },
];

const AUTO_TABS = [
  { id: "overview",  label: "Overview",  signal: "card:work-product",          default: true, order: 0 },
  { id: "inventory", label: "Inventory", signal: "card:auto-inventory",        order: 1 },
  { id: "deals",     label: "Deals",     signal: "card:auto-deal-analysis",    order: 2 },
  { id: "fi",        label: "F&I",       signal: "card:auto-fi-compliance",    order: 3 },
];

// Universal long-tail fallback. Every worker without a specific rule above
// gets these three tabs. All point at card:work-product; the tab label
// becomes the _title shown by the card's empty-state.
function longTailTabs() {
  return [
    { id: "overview",  label: "Overview",  signal: "card:work-product", default: true, order: 0 },
    { id: "activity",  label: "Activity",  signal: "card:work-product", order: 1 },
    { id: "resources", label: "Resources", signal: "card:work-product", order: 2 },
  ];
}

/**
 * Generate default canvas tabs for a worker.
 * @param {object} worker — full digitalWorkers/{slug} doc
 * @returns {Array} canvasTabs array (never throws; falls back to long-tail)
 */
function generateDefaultTabs(worker) {
  if (!worker || typeof worker !== "object") return longTailTabs();
  const slug = worker.worker_id || worker.catalogSlug || "";
  const vertical = worker.vertical || "";

  // 1. Spine workers — explicit map
  if (SPINE_TABS[slug]) return SPINE_TABS[slug].map(t => ({ ...t }));

  // 1b. Business Law — single slug, vertical-adjacent.
  if (slug === "business-law") return BUSINESS_LAW_TABS.map(t => ({ ...t }));

  // 2. Aviation CoPilots — EFB mirror. Identified by catalogId AV-P01..AV-P11
  // (the 11 pilot CoPilots; marketplace slugs vary, e.g. av-caravan-208b).
  const catalogId = (worker.catalogId || "").toUpperCase();
  if (vertical === "aviation" && /^AV-P\d/.test(catalogId)) {
    return AVIATION_COPILOT_TABS.map(t => ({ ...t }));
  }

  // 3a. RES-001 Real Estate Salesperson — bespoke workflow tabs (CODEX
  // 50.18 follow-up 2026-05-11). Distinct from the generic RE_TABS used
  // by other re_professional + real_estate_development workers.
  if (slug === "re-salesperson" || (worker.catalogId || "").toUpperCase() === "RES-001") {
    return RES_SALESPERSON_TABS.map(t => ({ ...t }));
  }

  // 3b. GEN-001 Scheduling — cross-vertical scheduling worker.
  if (slug === "scheduling" || (worker.catalogId || "").toUpperCase() === "GEN-001") {
    return GEN_SCHEDULING_TABS.map(t => ({ ...t }));
  }

  // 3b. Real Estate (development + professional) generic
  if (vertical === "real_estate_development" || vertical === "re_professional") {
    return RE_TABS.map(t => ({ ...t }));
  }

  // 4. Auto Dealer
  if (vertical === "auto_dealer") {
    return AUTO_TABS.map(t => ({ ...t }));
  }

  // 5. Long-tail fallback (Government, Web3, Solar, Health, Marketing,
  // non-CoPilot Aviation, anything else).
  return longTailTabs();
}

module.exports = {
  validateCanvasTabs,
  generateDefaultTabs,
  tabCapForVertical,
  TAB_CAP_DEFAULT,
  TAB_CAP_AVIATION,
  TAB_MIN,
  // Exported for tests / authoring tools
  SPINE_TABS,
  AVIATION_COPILOT_TABS,
  RE_TABS,
  RES_SALESPERSON_TABS,
  GEN_SCHEDULING_TABS,
  AUTO_TABS,
  longTailTabs,
};
