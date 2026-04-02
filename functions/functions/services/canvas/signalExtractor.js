"use strict";

/**
 * signalExtractor.js — Canvas Protocol Signal Extractor (44.9)
 *
 * Deterministic keyword matching. No LLM call.
 * Reads conversation context + workerId + vertical → emits canonical signal string.
 * Signal format: type:identifier (kebab-case, no spaces)
 *
 * Called from index.js worker chat handler after every AI response.
 */

// ═══════════════════════════════════════════════════════════════
//  WORKER-SPECIFIC SIGNAL MAP
// ═══════════════════════════════════════════════════════════════

const WORKER_SIGNALS = {
  // Platform — Accounting
  "platform-accounting": [
    { keywords: ["p&l", "profit", "loss", "expenses", "revenue", "cash", "tax", "deduct"], signal: "card:accounting-pl" },
    { keywords: ["invoice", "bill", "payment", "overdue"], signal: "card:accounting-invoice" },
    { keywords: ["chart of accounts", "categorize", "transactions"], signal: "card:accounting-coa" },
  ],

  // Platform — HR
  "platform-hr": [
    { keywords: ["employee", "hire", "staff", "headcount"], signal: "card:hr-employee-register" },
    { keywords: ["offer letter", "onboarding", "new hire"], signal: "checklist:hr-onboarding" },
    { keywords: ["pip", "performance", "review", "termination"], signal: "card:hr-performance" },
  ],

  // Platform — Marketing
  "platform-marketing": [
    { keywords: ["content calendar", "posts", "schedule"], signal: "card:marketing-content-calendar" },
    { keywords: ["email", "newsletter", "campaign"], signal: "card:marketing-email" },
  ],

  // Platform — Control Center Pro
  "platform-control-center-pro": [
    { keywords: ["revenue", "mrr", "subscribers", "churn"], signal: "card:control-center-revenue" },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  VERTICAL-LEVEL SIGNAL MAP (any worker in the vertical)
// ═══════════════════════════════════════════════════════════════

const VERTICAL_SIGNALS = {
  aviation: [
    { keywords: ["currency", "logbook", "medical", "flight hours", "current"], signal: "card:aviation-currency" },
  ],
  real_estate_development: [
    { keywords: ["title", "closing", "escrow", "deed"], signal: "card:real-estate-closing" },
  ],
  re_professional: [
    { keywords: ["title", "closing", "escrow", "deed"], signal: "card:real-estate-closing" },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  EXTRACT FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract a canvas signal from conversation context.
 *
 * @param {string} userMessage — current user message
 * @param {Array<{role:string, content:string}>} conversationContext — last 5 exchanges
 * @param {string} workerId — marketplace slug of active worker
 * @param {string} vertical — vertical of active worker
 * @returns {string|null} — signal string or null
 */
function extract(userMessage, conversationContext, workerId, vertical) {
  if (!userMessage) return null;

  const msgLower = userMessage.toLowerCase();

  // Build combined text from last 5 exchanges for broader context
  const contextText = (conversationContext || [])
    .slice(-5)
    .map((m) => (m.content || "").toLowerCase())
    .join(" ");

  const combined = msgLower + " " + contextText;

  // 1. Check worker-specific signals first (highest priority)
  const workerRules = WORKER_SIGNALS[workerId];
  if (workerRules) {
    for (const rule of workerRules) {
      for (const kw of rule.keywords) {
        if (msgLower.includes(kw.toLowerCase())) {
          return rule.signal;
        }
      }
    }
  }

  // 2. Check vertical-level signals
  const verticalRules = VERTICAL_SIGNALS[vertical];
  if (verticalRules) {
    for (const rule of verticalRules) {
      for (const kw of rule.keywords) {
        if (msgLower.includes(kw.toLowerCase())) {
          return rule.signal;
        }
      }
    }
  }

  // 3. Default: emit vertical signal if vertical is known
  if (vertical) {
    return `vertical:${vertical}`;
  }

  return null;
}

module.exports = { extract, WORKER_SIGNALS, VERTICAL_SIGNALS };
