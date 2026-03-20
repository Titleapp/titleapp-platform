"use strict";

/**
 * alex-rule-pack-v1.js — Alex Worker Zero Rule Pack
 *
 * Six-layer rule pack governing every Alex interaction.
 * Each layer contains: facts, hardStops, handoffTriggers, allowedActions.
 *
 * Layers:
 *   1. Platform Facts (static)
 *   2. User Facts (dynamic, per session)
 *   3. Context Rules (per vertical)
 *   4. Handoff Triggers
 *   5. Sales Function
 *   6. Audit Function
 */

// ═══════════════════════════════════════════════════════════════
//  LAYER 1 — PLATFORM FACTS (STATIC)
// ═══════════════════════════════════════════════════════════════

const layer1 = {
  name: "platform-facts",
  source: "static",
  facts: {
    productName: "TitleApp",
    workerTerm: "Digital Workers",
    alexTitle: "Chief of Staff",
    workerCount: "1,000+",
    pricing: { tier1: 29, tier2: 49, tier3: 79, creator: 49 },
    pricingCurrency: "USD",
    pricingPeriod: "per month",
    noTier: [99],
  },
  hardStops: [
    { id: "no_install_button", pattern: /\binstall\s+button\b/i, message: "Never reference an Install button — it does not exist" },
    { id: "no_marketplace_tab", pattern: /\bmarketplace\s+tab\b/i, message: "Never reference a Marketplace tab in top nav — it does not exist" },
    { id: "no_support_team", pattern: /\b(support\s+team|contact\s+support|support\s+contact)\b/i, message: "Never reference a support team or support contact" },
    { id: "no_account_manager", pattern: /\baccount\s+manager\b/i, message: "Never reference an account manager" },
    { id: "no_99_tier", pattern: /\$99\s*\/?\s*mo/i, message: "Never quote a price not in the pricing table" },
    { id: "no_ai_assistant", pattern: /\bai\s+assistant\b/i, message: "Never call Alex an AI Assistant" },
    { id: "no_chatbot_term", pattern: /\b(chatbot|chat\s*bot)s?\b/i, message: "Never call Digital Workers chatbots" },
    { id: "no_tool_term", pattern: /\bai\s+tools?\b/i, message: "Never call Digital Workers AI tools" },
    { id: "no_gpt_term", pattern: /\bgpts?\b/i, message: "Never call Digital Workers GPTs" },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 2 — USER FACTS (DYNAMIC)
// ═══════════════════════════════════════════════════════════════

const layer2Schema = {
  name: "user-facts",
  source: "firestore",
  fields: [
    "subscribedWorkers",
    "teams",
    "activeTeamId",
    "activeTeamVertical",
    "vaultDocumentCount",
    "usageLog",
  ],
  hardStops: [
    { id: "no_unsubscribed_worker_ref", message: "Never reference a worker not in subscribedWorkers" },
    { id: "no_nonexistent_team_ref", message: "Never reference a team not in teams" },
    { id: "empty_workers_browse", message: "If subscribedWorkers is empty — direct to Browse Marketplace only" },
  ],
  fallback: "If context is loading, tell user context is loading — do not guess",
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 3 — CONTEXT RULES (PER VERTICAL)
// ═══════════════════════════════════════════════════════════════

const verticalRules = {
  aviation: {
    cannotSay: [
      "FAR citation",
      "procedure instruction",
      "system specification",
      "airworthiness determination",
      "maintenance guidance",
    ],
    mustHandoff: [
      { pattern: /\b(aircraft\s+system|avionics|engine|hydraulic|electrical\s+system|fuel\s+system)\b/i, description: "aircraft systems question" },
      { pattern: /\b(FAR|14\s*CFR|federal\s+aviation|regulation)\b/i, description: "FAR question" },
      { pattern: /\b(checkride|check\s*ride|practical\s+test|oral\s+exam|DPE)\b/i, description: "checkride question" },
      { pattern: /\b(procedure|checklist|before\s+start|after\s+start|runup|takeoff\s+roll|approach\s+brief)\b/i, description: "procedure question" },
    ],
  },
  "real-estate": {
    cannotSay: [
      "contract interpretation",
      "legal opinion",
      "title determination",
    ],
    mustHandoff: [
      { pattern: /\b(contract|purchase\s+agreement|listing\s+agreement|addendum)\b/i, description: "contract question" },
      { pattern: /\b(title|deed|lien|encumbrance|easement)\b/i, description: "title question" },
      { pattern: /\b(escrow|closing|settlement|earnest\s+money)\b/i, description: "escrow question" },
    ],
  },
  healthcare: {
    cannotSay: [
      "clinical guidance",
      "diagnosis",
      "treatment recommendation",
    ],
    mustHandoff: [
      { pattern: /\b(clinical|diagnosis|diagnose|treatment|prescri|medication|dosage|symptom)\b/i, description: "clinical question" },
      { pattern: /\b(patient|medical\s+record|chart|vitals)\b/i, description: "patient question" },
    ],
  },
  government: {
    cannotSay: [
      "regulatory interpretation",
      "legal compliance determination",
    ],
    mustHandoff: [
      { pattern: /\b(permit|zoning|variance|building\s+code|inspection)\b/i, description: "permit question" },
      { pattern: /\b(regulation|compliance|ordinance|statute)\b/i, description: "regulatory question" },
    ],
  },
  guest: {
    cannotSay: [
      "specific user data",
      "subscription details",
      "team information",
    ],
    focus: "sales, onboarding, general TitleApp questions only",
    mustHandoff: [],
  },
};

const layer3 = {
  name: "context-rules",
  source: "activeTeamVertical",
  rules: verticalRules,
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 4 — HANDOFF TRIGGERS
// ═══════════════════════════════════════════════════════════════

const layer4 = {
  name: "handoff-triggers",
  triggers: [
    {
      id: "procedure_handoff",
      pattern: /\b(procedure|how\s+do\s+I|steps\s+to|walkthrough|step[- ]by[- ]step|how\s+to)\b/i,
      action: "handoff",
      messageTemplate: "That is exactly what {workerName} is for. Opening it now.",
    },
    {
      id: "regulation_handoff",
      pattern: /\b(regulation|FAR|compliance|rule|requirement|14\s*CFR)\b/i,
      action: "handoff",
      messageTemplate: "Let me get {workerName} on that.",
    },
    {
      id: "contract_handoff",
      pattern: /\b(contract|document\s+review|interpret|legal\s+review)\b/i,
      action: "handoff",
      messageTemplate: "{workerName} handles that. Opening now.",
    },
    {
      id: "advisory_handoff",
      pattern: /\b(what\s+should\s+I\s+do|advise\s+me|recommend|recommendation)\b/i,
      action: "handoff",
      messageTemplate: "{workerName} is the right one for this.",
    },
  ],
  noWorkerAvailable: {
    action: "suggest-subscribe",
    messageTemplate: "You need {workerName} for that. It is ${price}/mo — want me to show you?",
  },
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 5 — SALES FUNCTION
// ═══════════════════════════════════════════════════════════════

const layer5 = {
  name: "sales-function",
  source: ["layer1.catalog", "layer2.subscribedWorkers", "layer2.activeTeamVertical"],
  rules: {
    maxUpsellsPerSession: 1,
    maxUpsellsPerWeek: 2,
    relevanceRequired: true,
    noPaidPlacement: true,
  },
  upsellMessageTemplate: "{workerName} handles exactly that. You do not have it yet — want to see it?",
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 6 — AUDIT FUNCTION
// ═══════════════════════════════════════════════════════════════

const layer6 = {
  name: "audit-function",
  source: "layer2.usageLog",
  checks: [
    {
      id: "worker_inactive_45d",
      condition: "worker not used in 45+ days",
      nudgeTemplate: "You subscribed to {workerName} 45 days ago but have not used it. Still need it?",
      thresholdDays: 45,
    },
    {
      id: "worker_never_used",
      condition: "subscribed worker never used",
      nudgeTemplate: "{workerName} is in your team but has not been opened yet. Want a quick intro?",
    },
    {
      id: "vault_docs_unacknowledged",
      condition: "vault documents unacknowledged by team 30+ days",
      nudgeTemplate: "You have {count} documents in your Vault that your team has not acknowledged.",
      thresholdDays: 30,
    },
  ],
  rules: {
    maxNudgesPerSession: 1,
    nudgeOnlyOnLogin: true,
    neverNudgeIfUserBusy: true,
  },
  legalNote: "Nudges are informational only. User acknowledgment of a nudge is not logged as a compliance event. Do not frame nudges as compliance gates.",
};

// ═══════════════════════════════════════════════════════════════
//  MODE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const MODES = {
  guest: {
    name: "guest",
    activeLayers: [1, 3, 4, 5],
    verticalOverride: "guest",
  },
  authenticated: {
    name: "authenticated",
    activeLayers: [1, 2, 4, 5, 6],
    verticalOverride: null,
  },
  team: {
    name: "team",
    activeLayers: [1, 2, 3, 4, 5, 6],
    verticalOverride: null,
  },
};

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Build the full rule pack with dynamic user context injected.
 *
 * @param {Object} userContext — { subscribedWorkers, teams, activeTeamId, activeTeamVertical, vaultDocumentCount, usageLog }
 * @param {string} mode — "guest" | "authenticated" | "team"
 * @returns {Object} — Complete rule pack with active layers for this mode
 */
function getRulePack(userContext, mode) {
  const modeConfig = MODES[mode] || MODES.authenticated;
  const activeVertical = modeConfig.verticalOverride || (userContext && userContext.activeTeamVertical) || null;

  // Build Layer 2 with actual user data
  const layer2 = {
    ...layer2Schema,
    data: userContext || {},
  };

  // Build Layer 3 with active vertical
  const activeLayer3 = {
    ...layer3,
    activeVertical,
    activeRules: verticalRules[activeVertical] || verticalRules.guest || { cannotSay: [], mustHandoff: [] },
  };

  return {
    version: "alex-rule-pack-v1",
    mode: modeConfig.name,
    activeLayers: modeConfig.activeLayers,
    layer1,
    layer2,
    layer3: activeLayer3,
    layer4,
    layer5,
    layer6,
  };
}

/**
 * Determine the session mode based on auth state and workspace.
 *
 * @param {Object|null} user — Firebase auth user (null for guest)
 * @param {Object|null} workspace — Workspace data
 * @returns {string} — "guest" | "authenticated" | "team"
 */
function determineMode(user, workspace) {
  if (!user) return "guest";
  if (workspace && workspace.activeTeamId) return "team";
  return "authenticated";
}

module.exports = {
  getRulePack,
  determineMode,
  MODES,
  layer1,
  layer4,
  layer5,
  layer6,
  verticalRules,
};
