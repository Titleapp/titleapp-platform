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
  // card:accounting-pl and card:accounting-balance-sheet are CODEX 43 Pattern B:
  // the component self-fetches from the backend; AI emits signal-only (no payload).
  "card:accounting-pl": {
    component: "PLSummaryCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Max about your P&L to see it here.",
  },
  "card:accounting-invoice": {
    component: "InvoiceListCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Max about your invoices to see them here.",
  },
  "card:accounting-coa": {
    component: "ChartOfAccountsCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Max to categorize your transactions to see your Chart of Accounts here.",
  },
  "card:accounting-balance-sheet": {
    component: "BalanceSheetCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Max to build a balance sheet to see it here.",
  },
  "card:accounting-cashflow": {
    component: "CashFlowStatementCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Max for a cash flow statement to see it here.",
  },

  // HR cards
  "card:hr-employee-register": {
    component: "EmployeeRegisterCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Jordan about your employees to see them here.",
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
    emptyPrompt: "Ask Jordan about performance reviews to see details here.",
  },

  // Marketing cards
  "card:marketing-content-calendar": {
    component: "ContentCalendarCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Ivy to plan your content to see it here.",
  },
  "card:marketing-email": {
    component: "EmailCampaignCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Ivy about your email campaigns to see them here.",
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
    emptyPrompt: "Ask Skye to walk through a checklist to see it here.",
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
    emptyPrompt: "Ask Skye about an emergency procedure to see the QRH excerpt here.",
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
    emptyPrompt: "Ask Skye to plan a flight to see the route and brief here.",
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
    emptyPrompt: "Ask Skye for takeoff/landing performance to see the numbers here.",
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
    emptyPrompt: "Ask Skye to run a weight & balance to see the calculation here.",
    acceptsUpload: true,
    uploadCategory: "weight-balance",
    uploadTitle: "No weight & balance template uploaded.",
    uploadHint: "Upload your aircraft's weight & balance worksheet or POH section. The CoPilot uses the actual envelope, arms, and moments from your document.",
    uploadButton: "Upload W&B template",
    _title: "Weight & Balance",
  },

  "card:aviation-weather": {
    component: "AviationWeatherCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about weather at a departure or destination airport.",
    _title: "Weather Briefing",
  },
  "card:aviation-traffic": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about traffic near an airport to see live ADS-B here.",
    _title: "Live Traffic",
  },
  "card:aviation-fleet-map": {
    component: "AviationFleetMapCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Skye to show fleet positions and the live map loads here.",
    _title: "Fleet Map",
  },
  "card:aviation-navdb": {
    component: "AviationNavDbCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Regional AIRAC nav databases load here.",
    _title: "Nav Database",
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
    emptyPrompt: "Ask Rudy about a property and the map updates here.",
    _title: "Map",
  },
  "card:re-property-analysis": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Rudy to analyze a property to see the report here.",
    _title: "Property Analysis",
  },
  "card:re-market-report": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Rudy for a market report to see it here.",
    _title: "Market Report",
  },
  "card:re-comp-analysis": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Rudy to run comps to see the analysis here.",
    _title: "Comparable Sales Analysis",
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

  // CLINICAL-EVALUATION-001 — the signed-Vault loop (instructor sign + verified records)
  "card:clinical-eval": {
    component: "ClinicalEvalCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Fill an evaluation and Approve & Sign — it writes to the student's Vault, signed and anchored.",
    _title: "Clinical Evaluation",
  },

  // TITLE-ABSTRACT-001 — real-estate title/ownership abstract (live tenant record)
  "card:title-abstract": {
    component: "TitleAbstractCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask me to look up a property you have on file — I'll pull the chain of title, liens, and easements.",
    _title: "Title Abstract",
  },

  // OER course content (free, NCLEX-aligned open textbooks via /v1/edu:content)
  "card:oer-content": {
    component: "OerContentCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Search a nursing topic to pull free, current, NCLEX-aligned course material.",
    _title: "Course Content",
  },

  // Student transcript — #74 course-level granularity (clinical hours, assignments, assessments, grades)
  "card:student-transcript": {
    component: "StudentTranscriptCard",
    dataSource: "firestore",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Your course-by-course transcript will appear here as your instructor records assessments, reflections, and clinical hours.",
    _title: "Student Transcript",
  },

  // Patent portfolio + deadline engine
  "patent:portfolio": {
    component: "PatentPortfolioCard",
    dataSource: "firestore",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask the Patent Worker about your portfolio to see it here.",
    _title: "Patent Portfolio",
  },

  // Business-in-a-Box bundle offer — one-click add all 5 spine workers
  "bundle:offer": {
    component: "BundleOfferCard",
    dataSource: "static",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask to see the Business-in-a-Box to get all 5 workers at once.",
    _title: "Business-in-a-Box",
  },
  "bundle:offer:re-in-a-box": {
    component: "BundleOfferCard",
    dataSource: "static",
    dismissible: true,
    mobileFallback: "inline-card",
    _title: "Real Estate in a Box",
  },
  "bundle:offer:education-in-a-box": {
    component: "BundleOfferCard",
    dataSource: "static",
    dismissible: true,
    mobileFallback: "inline-card",
    _title: "Education in a Box",
  },
  "bundle:offer:aviation-in-a-box": {
    component: "BundleOfferCard",
    dataSource: "static",
    dismissible: true,
    mobileFallback: "inline-card",
    _title: "Aviation in a Box",
  },
  "bundle:offer:ecommerce-in-a-box": {
    component: "BundleOfferCard",
    dataSource: "static",
    dismissible: true,
    mobileFallback: "inline-card",
    _title: "eCommerce in a Box",
  },

  // E-sign anchor log — SOCIII moat: suite-agnostic chain record of completed signings
  "esign:documents": {
    component: "EsignAnchorCard",
    dataSource: "firestore",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Tell Alex when you complete a signing — I'll create a SOCIII anchor record.",
    _title: "Signed Documents",
  },

  // Listing Readiness scorecard — real-estate listing worker (S52.47)
  // Worker emits |||CANVAS_RENDER|||{type:"card:listing-readiness",...}|||END_CANVAS|||
  "card:listing-readiness": {
    component: "ListingScorecardCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask the Listing Readiness worker about a property to see its scorecard here.",
    _title: "Listing Readiness",
  },

  // Property Manager — portfolio + compliance canvas (CODEX 23)
  "card:pm-portfolio": {
    component: "PropertyManagerCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Rudy about your portfolio to see units, rent status, and MX here.",
    _title: "Portfolio",
  },
  "card:pm-leaseup": {
    component: "PropertyManagerCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about a vacant unit to see the lease-up pipeline here.",
    _title: "Lease-Up",
  },
  "card:pm-screening": {
    component: "PropertyManagerCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Rudy to screen an applicant — Fair Housing rules enforced.",
    _title: "Screening",
  },
  "card:pm-maintenance": {
    component: "PropertyManagerCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Submit a maintenance request to see work orders here.",
    _title: "Maintenance",
  },
  "card:pm-evictions": {
    component: "PropertyManagerCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about an eviction to see notice timelines and filing steps here.",
    _title: "Evictions",
  },
  "card:pm-compliance": {
    component: "PropertyManagerCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Rudy about upcoming deadlines to see your compliance calendar here.",
    _title: "Compliance",
  },

  // RE Brokerage Marketing — showing schedule (re-marketing-001)
  "card:re-showings": {
    component: "ShowingScheduleCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask to schedule a showing to see your showing calendar here.",
    _title: "Showings",
  },

  // MSR Servicing & Compliance Worker cards (CODEX S52.60) — all Pattern B,
  // self-fetch from /v1/msr:operator:*, AI payload ignored, same shape as
  // card:accounting-pl above.
  "card:msr-portfolio": {
    component: "MsrPortfolioDashboardCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana for a portfolio overview to see it here.",
    _title: "Portfolio Overview",
  },
  "card:msr-delinquency-queue": {
    component: "MsrDelinquencyQueueCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana about the delinquency queue to see it here.",
    _title: "Delinquency Queue",
  },
  "card:msr-loss-mitigation": {
    component: "MsrLossMitigationCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana about hardship requests to see them here.",
    _title: "Loss Mitigation",
  },
  "card:msr-error-resolution": {
    component: "MsrErrorResolutionCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana about open NOEs or RFIs to see them here.",
    _title: "NOE / RFI Tracker",
  },
  "card:msr-escrow": {
    component: "MsrEscrowCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana about escrow status to see it here.",
    _title: "Escrow",
  },
  "card:msr-licensing": {
    component: "MsrLicensingCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana about state licensing status to see it here.",
    _title: "State Licensing",
  },
  "card:msr-audit-log": {
    component: "MsrAuditLogCard",
    dataSource: "api",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask Dana about the compliance audit log to see it here.",
    _title: "Compliance Audit Log",
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

  // Analyst report (migrated from inline chat cards)
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
    emptyPrompt: "Ask to chart something for you to see it here.",
    _title: "Chart",
  },
  "card:chart-funnel": {
    component: "ChartCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about your pipeline to see a funnel here.",
    _title: "Pipeline Funnel",
  },
  "card:chart-heatmap": {
    component: "ChartCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask to compare metrics to see a heatmap here.",
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

  // Shopify — live commerce data (orders, revenue, top products)
  "card:shopify-commerce": {
    component: "ShopifyCommerceCard",
    dataSource: "live",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Connect your Shopify store in Settings to see live revenue and orders here.",
    _title: "Shopify Store",
  },

  // Site Recon — full-panel parcel analysis result (site-recon-001)
  // Emitted by workers/site-recon-001/chatIntent.js when an area or address
  // search completes. Renders ranked parcel list + map + street-view tabs.
  "site-recon-results": {
    component: "SiteReconCanvas",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask to run Site Recon on an address to see parcel analysis here.",
    _title: "Site Recon",
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
