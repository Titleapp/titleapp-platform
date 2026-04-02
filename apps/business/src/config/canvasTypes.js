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
