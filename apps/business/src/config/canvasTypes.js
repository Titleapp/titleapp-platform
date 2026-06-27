/**
 * canvasTypes.js — Canvas Protocol Type Registry (44.9)
 *
 * Every canvas type must be registered here.
 * If a signal is not in this registry, it does not render.
 *
 * Each entry:
 *   component  — React component name (string, resolved at render time)
 *   dataSource — where the card gets its data: 'conversation' | 'firestore' | 'hardcoded'
 *   dismissible — always true per spec
 *   mobileFallback — 'inline-card' (all cards render inline on mobile)
 *   emptyPrompt — text shown when data isn't available yet
 */

export const CANVAS_TYPES = {
  // Browse / vertical signals
  "browse:popular": {
    component: "WorkerListCanvas",
    dataSource: "firestore",
    query: { collection: "digitalWorkers", orderBy: "sessionCount", limit: 6 },
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
    isDiscovery: true,
  },
  "browse:free": {
    component: "WorkerListCanvas",
    dataSource: "firestore",
    query: { collection: "digitalWorkers", where: ["pricing_tier", "==", 0], limit: 6 },
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
    isDiscovery: true,
  },

  // Accounting cards
  "card:accounting-pl": {
    component: "PLSummaryCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about your P&L to see it here.",
  },
  "card:accounting-invoice": {
    component: "InvoiceListCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about your invoices to see them here.",
  },
  "card:accounting-coa": {
    component: "ChartOfAccountsCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to categorize your transactions to see your Chart of Accounts here.",
  },
  "card:accounting-balance-sheet": {
    component: "BalanceSheetCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to build a balance sheet to see it here.",
  },
  "card:accounting-cashflow": {
    component: "CashFlowStatementCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex for a cash flow statement to see it here.",
  },

  // HR cards
  "card:hr-employee-register": {
    component: "EmployeeRegisterCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about your employees to see them here.",
  },
  "checklist:hr-onboarding": {
    component: "ChecklistCard",
    dataSource: "hardcoded",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
  },
  "card:hr-performance": {
    component: "PerformanceCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about performance reviews to see details here.",
  },

  // Marketing cards
  "card:marketing-content-calendar": {
    component: "ContentCalendarCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to plan your content to see it here.",
  },
  "card:marketing-email": {
    component: "EmailCampaignCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about your email campaigns to see them here.",
  },

  // Control Center
  "card:control-center-revenue": {
    component: "RevenueDashboardCard",
    dataSource: "firestore",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
  },

  // Aviation
  "card:aviation-currency": {
    component: "AviationCurrencyCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about your currency status to see it here.",
  },
  // CoPilot operational tabs — pilot-facing, cockpit-ready.
  "card:aviation-aircraft": {
    component: "AircraftCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Aircraft type, tail, and specs appear here.",
    acceptsUpload: true,
    uploadCategory: "aircraft-profile",
    uploadTitle: "No aircraft profile uploaded.",
    uploadHint: "Upload a POH / AFM / aircraft data sheet so the CoPilot grounds in your actual aircraft. PDFs preferred.",
    uploadButton: "Upload POH / AFM",
    _title: "Aircraft",
  },
  "card:aviation-checklists": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to walk through a checklist to see it here.",
    acceptsUpload: true,
    uploadCategory: "checklists",
    uploadTitle: "No operator checklists uploaded.",
    uploadHint: "Operators publish their own normal-procedures checklist that overrides the AFM defaults. Upload it here so the CoPilot uses the version you actually fly.",
    uploadButton: "Upload operator checklists",
    _title: "Standard Checklists",
  },
  "card:aviation-qrh": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about an emergency procedure to see the QRH excerpt here.",
    acceptsUpload: true,
    uploadCategory: "qrh",
    uploadTitle: "No operator QRH uploaded.",
    uploadHint: "Operators publish their own QRH / emergency procedures. Upload yours so the CoPilot grounds in the exact procedures you're expected to fly.",
    uploadButton: "Upload operator QRH",
    _title: "QRH / Emergency",
  },
  "card:aviation-flight-planning": {
    component: "FlightPlanningCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to plan a flight to see the route and brief here.",
    acceptsUpload: true,
    uploadCategory: "flight-planning-sop",
    uploadTitle: "No flight-planning SOP uploaded.",
    uploadHint: "Upload your operator's flight-planning SOP, route-planning standards, alternates policy, or fuel-policy doc. The CoPilot uses these when proposing flight plans.",
    uploadButton: "Upload flight-planning SOP",
    _title: "Flight Planning",
  },
  "card:aviation-performance": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex for takeoff/landing performance to see the numbers here.",
    acceptsUpload: true,
    uploadCategory: "performance",
    uploadTitle: "No performance tables uploaded.",
    uploadHint: "Upload your operator's performance tables / charts. The CoPilot will read from these instead of the generic AFM values.",
    uploadButton: "Upload performance tables",
    _title: "Performance",
  },
  "card:aviation-weight-balance": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to run a weight & balance to see the calculation here.",
    acceptsUpload: true,
    uploadCategory: "weight-balance",
    uploadTitle: "No weight & balance template uploaded.",
    uploadHint: "Upload your aircraft's weight & balance worksheet or POH section. The CoPilot uses the actual envelope, arms, and moments from your document.",
    uploadButton: "Upload W&B template",
    _title: "Weight & Balance",
  },

  // Real Estate
  "card:real-estate-closing": {
    component: "RealEstateClosingCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about your closing to see details here.",
  },
  // CODEX 50.18 follow-up 2026-05-12 — RE workers show a map on the
  // canvas. Single property = pin + zoom. Multi-property = bounded search.
  // Demo data renders a representative regional map when no live data.
  "card:re-map": {
    component: "MapCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about a property and the map updates here.",
    _title: "Map",
  },
  "card:re-property-analysis": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to analyze a property to see the report here.",
    _title: "Property Analysis",
  },
  "card:re-market-report": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex for a market report to see it here.",
    _title: "Market Report",
  },
  "card:re-comp-analysis": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to run comps to see the analysis here.",
    _title: "Comparable Sales Analysis",
  },

  // Auto Dealer
  "card:auto-deal-analysis": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to analyze a deal to see it here.",
    _title: "Deal Analysis",
  },
  "card:auto-fi-compliance": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to review F&I compliance to see the report here.",
    _title: "F&I Compliance Review",
  },
  "card:auto-inventory": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about inventory to see the report here.",
    _title: "Inventory Snapshot",
  },

  // Marketing — visual campaign-performance board (winning creative + KPIs)
  "card:marketing-board": {
    component: "MarketingCampaignBoardCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Run a campaign and the winners show up here.",
    _title: "Marketing",
  },

  // VET-003 — drug dosing & protocol worker (propose → approve)
  "card:vet-dosing": {
    component: "VetDosingCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask for a weight-based dose — species, weight, drug — and I'll propose it with the source.",
    _title: "Drug Dosing",
  },

  // EDU-001 — CVT exam-prep cohort (instructor view)
  "card:edu-cohort": {
    component: "EduCohortCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Enroll students and their progress shows up here.",
    _title: "CVT Exam Prep",
  },

  // SPINE-4 — Staff Credential & Training (people-first roster + R/Y/G status)
  "card:staff-roster": {
    component: "StaffRosterCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask me who's due for a renewal, or add a staff member's license to track.",
    _title: "Staff Credentials",
  },

  // Generic work product (any worker, fallback)
  "card:work-product": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Nothing here yet — ask the worker in chat to pull this together.",
    _title: "Work Product",
  },

  // Trade summary + Analyst report (migrated from inline chat cards)
  "card:trade-summary": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
    _title: "Trade Summary",
  },
  "card:analyst-report": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
    _title: "Analyst Report",
  },

  // Generic visual charts (49.32) — any worker, when user asks for a graphical view.
  "card:chart-bar": {
    component: "ChartCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to chart something for you to see it here.",
    _title: "Chart",
  },
  "card:chart-funnel": {
    component: "ChartCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex about your pipeline to see a funnel here.",
    _title: "Pipeline Funnel",
  },
  "card:chart-heatmap": {
    component: "ChartCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Alex to compare metrics to see a heatmap here.",
    _title: "Heatmap",
  },

  // Generated images (49.32) — output of the generate_image tool.
  // Lands on canvas instead of inline in chat.
  "card:image": {
    component: "ImageCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask any worker to generate an image to see it here.",
    _title: "Generated Image",
  },

  // Video content (2026-06-04) — YouTube embeds, direct mp4/webm, etc.
  // Sean's directive: video is the difference between "people are
  // scared of this shit" and "people get it instantly."
  "card:video": {
    component: "VideoCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Drop a YouTube URL or direct video link to see it here.",
    _title: "Video",
  },
};

/**
 * Resolve a vertical:* wildcard signal.
 * Returns a synthetic WorkerListCanvas config filtered by the vertical.
 */
export function resolveVerticalSignal(signal) {
  if (!signal || !signal.startsWith("vertical:")) return null;
  const vertical = signal.replace("vertical:", "");
  return {
    component: "WorkerListCanvas",
    dataSource: "firestore",
    query: { collection: "digitalWorkers", where: ["vertical", "==", vertical], limit: 6 },
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
    isDiscovery: true,
    _signal: signal,
  };
}

/**
 * Look up a signal in the registry. Handles vertical:* wildcards.
 */
export function lookupSignal(signal) {
  if (!signal) return null;
  if (CANVAS_TYPES[signal]) return { ...CANVAS_TYPES[signal], _signal: signal };
  if (signal.startsWith("vertical:")) return resolveVerticalSignal(signal);
  return null;
}

/**
 * Is this resolved canvas a discovery / worker-list card (the "<vertical>
 * Workers" recommendation grid)? Such a card must NEVER hijack a worker's own
 * canvas. Robust to new browse/vertical signals: checks the isDiscovery flag
 * first, then falls back to the signal-prefix + component name. (S52.46 / #36)
 */
export function isDiscoveryCanvas(canvasData) {
  const r = canvasData?.resolved || canvasData || {};
  if (r.isDiscovery) return true;
  if (r.component === "WorkerListCanvas") return true;
  const sig = String(r._signal || "");
  return sig.startsWith("vertical:") || sig.startsWith("browse:");
}
