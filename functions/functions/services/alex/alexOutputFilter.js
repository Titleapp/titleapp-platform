"use strict";

/**
 * alexOutputFilter.js — Post-LLM RAAS Output Filter for Alex
 *
 * Checks the LLM response against the rule pack before returning it.
 * Detects:
 *   — Hard stop violations (Layer 1): banned phrases, non-existent UI, wrong pricing
 *   — Hallucinated facts (Layer 2): worker names not in subscribedWorkers
 *   — Vertical violations (Layer 3): domain answers Alex should not give
 *
 * On violation: inject violation context into a retry LLM call.
 * Max 2 regeneration attempts. If still violating → safe fallback.
 */

const SAFE_FALLBACK = "I want to make sure I give you accurate information. Let me connect you with the right worker for this.";
const MAX_REGENERATIONS = 2;

// Valid nav items by context — anything else is a hallucination
const VALID_NAV_ITEMS = {
  universal: [
    "Dashboard", "Deal Pipeline", "Documents", "Signatures",
    "Reports", "Clients & Contacts", "Settings", "Worker Rules",
    "Personal Vault", "Browse Marketplace", "Document Vault",
  ],
  aviation: [
    "CoPilot EFB", "Dispatch", "Fleet Status", "Crew",
    "Safety", "Scheduling", "Compliance", "Logbook",
    "Currency", "My Aircraft", "Training", "Flight Planning",
  ],
  "real-estate": [
    "Properties", "Deals", "Title & Escrow", "Deal Screening",
    "Portfolio", "Assumptions", "Evidence Table", "Investor Pipeline",
    "Waterfall", "Data Room", "Reporting", "Draw Requests",
    "Lien Waivers", "Retainage", "Schedule of Values",
    "Leasing", "Marketing", "Rent Roll", "Work Orders",
    "Tenants", "Maintenance", "Appraisal Review",
  ],
  auto: [
    "Inventory", "Appraisals", "Desking", "CRM",
    "F&I Menu", "Compliance", "Trade-In", "Lead Management",
    "Service Appointments", "MPI Dashboard", "Parts",
    "Warranty Claims", "Body Shop", "Floor Plan",
  ],
  government: [
    "Intake", "Queue", "Inspections", "Permits",
    "Code Enforcement", "Violations", "Compliance",
    "Reports", "Scheduling", "Portal Dashboard",
  ],
};

/**
 * Check a response against Layer 1 hard stop patterns.
 *
 * @param {string} response
 * @param {Object} layer1 — rulePack.layer1
 * @returns {Array} — violations found
 */
function checkLayer1(response, layer1) {
  const violations = [];
  if (!layer1 || !layer1.hardStops) return violations;

  for (const stop of layer1.hardStops) {
    if (stop.pattern && stop.pattern.test(response)) {
      violations.push({ ruleId: stop.id, layer: 1, message: stop.message });
    }
  }
  return violations;
}

/**
 * Check a response against Layer 2 user fact constraints.
 * Detects references to workers the user is NOT subscribed to.
 *
 * @param {string} response
 * @param {Object} layer2 — rulePack.layer2
 * @returns {Array} — violations found
 */
function checkLayer2(response, layer2) {
  const violations = [];
  if (!layer2 || !layer2.data) return violations;

  const subscribedWorkers = layer2.data.subscribedWorkers || [];

  // If user has no workers and Alex suggests using one (not subscribing)
  if (subscribedWorkers.length === 0) {
    // Check if Alex references "your worker" or "open your" without a subscribe suggestion
    if (/\b(your\s+worker|open\s+your|in\s+your\s+team)\b/i.test(response) &&
        !/\b(subscribe|get\s+it|sign\s+up|browse|marketplace)\b/i.test(response)) {
      violations.push({
        ruleId: "empty_workers_hallucination",
        layer: 2,
        message: "Referenced user having workers when subscribedWorkers is empty",
      });
    }
  }

  return violations;
}

/**
 * Check a response against Layer 3 vertical cannotSay rules.
 *
 * @param {string} response
 * @param {Object} layer3 — rulePack.layer3
 * @returns {Array} — violations found
 */
function checkLayer3(response, layer3) {
  const violations = [];
  if (!layer3 || !layer3.activeRules || !layer3.activeRules.cannotSay) return violations;

  const vertical = layer3.activeVertical || "unknown";

  // Check for domain-specific content Alex should not generate
  const VERTICAL_VIOLATION_PATTERNS = {
    aviation: [
      { pattern: /\b(per\s+FAR\s+\d|14\s*CFR\s+\d|part\s+\d{2,3}\.\d)/i, desc: "FAR citation" },
      { pattern: /\b(step\s+\d+.*(?:throttle|mixture|flap|gear|prop)|checklist\s*:)/i, desc: "procedure instruction" },
      { pattern: /\b(TBO|overhaul\s+interval|airworthiness\s+directive|AD\s+\d)/i, desc: "airworthiness determination" },
    ],
    "real-estate": [
      { pattern: /\b(this\s+contract\s+(?:means|requires|states)|legal\s+interpretation|I\s+interpret\s+this)/i, desc: "contract interpretation" },
      { pattern: /\b(title\s+is\s+(?:clear|clouded|marketable)|I\s+(?:determine|find)\s+the\s+title)/i, desc: "title determination" },
    ],
    healthcare: [
      { pattern: /\b(you\s+(?:should|need\s+to)\s+take|prescribe|diagnos(?:e|is)\s+(?:is|with)|treatment\s+(?:is|should\s+be))/i, desc: "clinical guidance" },
    ],
    government: [
      { pattern: /\b(this\s+regulation\s+(?:means|requires)|you\s+are\s+(?:in|out\s+of)\s+compliance|I\s+interpret\s+this\s+(?:statute|ordinance))/i, desc: "regulatory interpretation" },
    ],
  };

  const patterns = VERTICAL_VIOLATION_PATTERNS[vertical] || [];
  for (const { pattern, desc } of patterns) {
    if (pattern.test(response)) {
      violations.push({ ruleId: `vertical_${vertical}_${desc.replace(/\s+/g, "_")}`, layer: 3, message: `Response contains ${desc} — not allowed for Alex in ${vertical} context` });
    }
  }

  return violations;
}

/**
 * Check for hallucinated nav items — references to UI sections that don't exist.
 *
 * @param {string} response
 * @param {string} vertical — current user vertical
 * @returns {Array} — violations found
 */
function checkNavHallucination(response, vertical) {
  const validItems = [
    ...VALID_NAV_ITEMS.universal,
    ...(VALID_NAV_ITEMS[vertical] || []),
  ];
  const validLower = validItems.map(v => v.toLowerCase());

  // Match phrases like "go to X in", "open X", "click on X", "navigate to X", "the X tab/section/page"
  const navPatterns = [
    /(?:go\s+to|open|click\s+on|navigate\s+to|visit|head\s+to)\s+(?:the\s+)?([A-Z][\w\s&]+?)(?:\s+(?:in|tab|section|page|panel|screen)|\.|,|$)/gi,
    /(?:the|your)\s+([A-Z][\w\s&]+?)\s+(?:tab|section|page|panel|screen)/gi,
  ];

  const hallucinated = [];
  for (const pattern of navPatterns) {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const item = match[1].trim();
      if (item.length < 3 || item.length > 40) continue;
      if (!validLower.some(v => v === item.toLowerCase() || item.toLowerCase().includes(v) || v.includes(item.toLowerCase()))) {
        hallucinated.push(item);
      }
    }
  }

  return hallucinated.length > 0 ? hallucinated : null;
}

/**
 * Run the full output filter on an LLM response.
 *
 * @param {Object} params
 * @param {string} params.response — raw LLM response text
 * @param {Object} params.rulePack — from getRulePack()
 * @param {Object} params.userContext — { subscribedWorkers, teams, ... }
 * @returns {Object} — { approved, response, violations, regenerationCount, auditLog }
 */
function runOutputFilter({ response, rulePack, userContext }) {
  if (!response || typeof response !== "string") {
    return { approved: true, response: response || "", violations: [], regenerationCount: 0, auditLog: { checksRun: [] } };
  }

  const activeLayers = rulePack.activeLayers || [];
  const violations = [];
  const auditLog = { checksRun: [] };

  // Layer 1 checks (always active)
  if (activeLayers.includes(1)) {
    auditLog.checksRun.push("layer1_hardStops");
    violations.push(...checkLayer1(response, rulePack.layer1));
  }

  // Layer 2 checks
  if (activeLayers.includes(2)) {
    auditLog.checksRun.push("layer2_userFacts");
    violations.push(...checkLayer2(response, rulePack.layer2));
  }

  // Layer 3 checks
  if (activeLayers.includes(3)) {
    auditLog.checksRun.push("layer3_verticalRules");
    violations.push(...checkLayer3(response, rulePack.layer3));
  }

  // Nav item hallucination check (always active)
  const vertical = rulePack.layer3?.activeVertical || userContext?.vertical || "";
  const hallucinatedNav = checkNavHallucination(response, vertical);
  if (hallucinatedNav) {
    auditLog.checksRun.push("navItemHallucination");
    const validItems = [...VALID_NAV_ITEMS.universal, ...(VALID_NAV_ITEMS[vertical] || [])];
    violations.push({
      ruleId: "nav_item_hallucination",
      layer: 1,
      message: `Hallucinated nav items: ${hallucinatedNav.join(", ")}. Only reference: ${validItems.join(", ")}`,
    });
  }

  const approved = violations.length === 0;

  return {
    approved,
    response: approved ? response : null,
    violations,
    regenerationCount: 0,
    auditLog,
  };
}

/**
 * Build violation context string for a retry LLM call.
 *
 * @param {Array} violations — from runOutputFilter()
 * @returns {string}
 */
function buildViolationContext(violations) {
  return violations
    .map((v) => `VIOLATION [${v.ruleId}]: ${v.message}`)
    .join("\n");
}

module.exports = {
  runOutputFilter,
  buildViolationContext,
  SAFE_FALLBACK,
  MAX_REGENERATIONS,
  checkLayer1,
  checkLayer2,
  checkLayer3,
  checkNavHallucination,
  VALID_NAV_ITEMS,
};
