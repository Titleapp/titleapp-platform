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
  },
  "browse:free": {
    component: "WorkerListCanvas",
    dataSource: "firestore",
    query: { collection: "digitalWorkers", where: ["pricing_tier", "==", 0], limit: 6 },
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
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

  // Real Estate
  "card:real-estate-closing": {
    component: "RealEstateClosingCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: "Ask about your closing to see details here.",
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

  // Generic work product (any worker, fallback)
  "card:work-product": {
    component: "WorkProductCard",
    dataSource: "conversation",
    dismissible: true,
    mobileFallback: "inline-card",
    emptyPrompt: null,
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
