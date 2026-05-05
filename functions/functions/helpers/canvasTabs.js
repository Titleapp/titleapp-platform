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

// Aviation gets a higher cap so its 7-tab CoPilot EFB structure mirrors 1:1
// rather than truncating. Every other vertical caps at 6.
const TAB_CAP_DEFAULT = 6;
const TAB_CAP_AVIATION = 7;
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
  ],
  "platform-marketing": [
    { id: "kpis",             label: "KPIs",              signal: "card:work-product",                default: true, order: 0 },
    { id: "campaigns",        label: "Campaigns",         signal: "card:marketing-email",             order: 1 },
    { id: "creative",         label: "Creative",          signal: "card:image",                       order: 2 },
    { id: "content-calendar", label: "Content Calendar",  signal: "card:marketing-content-calendar",  order: 3 },
    { id: "email",            label: "Email",             signal: "card:marketing-email",             order: 4 },
  ],
  "platform-control-center-pro": [
    { id: "revenue",     label: "Revenue Dashboard", signal: "card:control-center-revenue", default: true, order: 0 },
    { id: "mrr",         label: "MRR",               signal: "card:work-product",           order: 1 },
    { id: "subscribers", label: "Subscribers",       signal: "card:work-product",           order: 2 },
  ],
};

// Aviation CoPilot EFB structure (per sections/CoPilotEFB.jsx). Mirrors
// the dedicated EFB section so the right-panel canvas stays in sync.
// Cap raised to 7 for aviation only.
const AVIATION_COPILOT_TABS = [
  { id: "status",    label: "Status",    signal: "card:aviation-currency", default: true, order: 0 },
  { id: "logbook",   label: "Logbook",   signal: "card:work-product",      order: 1 },
  { id: "currency",  label: "Currency",  signal: "card:aviation-currency", order: 2 },
  { id: "duty",      label: "Duty",      signal: "card:work-product",      order: 3 },
  { id: "training",  label: "Training",  signal: "card:work-product",      order: 4 },
  { id: "documents", label: "Documents", signal: "card:work-product",      order: 5 },
  { id: "copilot",   label: "CoPilot",   signal: "card:work-product",      order: 6 },
];

const RE_TABS = [
  { id: "overview", label: "Overview", signal: "card:re-property-analysis", default: true, order: 0 },
  { id: "listings", label: "Listings", signal: "card:work-product",         order: 1 },
  { id: "closings", label: "Closings", signal: "card:real-estate-closing",  order: 2 },
  { id: "contacts", label: "Contacts", signal: "card:work-product",         order: 3 },
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

  // 2. Aviation CoPilots — EFB mirror. Identified by catalogId AV-P01..AV-P11
  // (the 11 pilot CoPilots; marketplace slugs vary, e.g. av-caravan-208b).
  const catalogId = (worker.catalogId || "").toUpperCase();
  if (vertical === "aviation" && /^AV-P\d/.test(catalogId)) {
    return AVIATION_COPILOT_TABS.map(t => ({ ...t }));
  }

  // 3. Real Estate (development + professional)
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
  AUTO_TABS,
  longTailTabs,
};
