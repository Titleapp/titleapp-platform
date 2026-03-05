"use strict";

/**
 * Routing Classifier (Capability 5)
 *
 * Parses routing tags from Alex's AI response and classifies queries
 * for backend action.
 *
 * Routing tag format (appended to AI response):
 * [ROUTE:handle_directly]
 * [ROUTE:route_to_worker:cre-analyst]
 * [ROUTE:recommend_worker:construction-manager]
 * [ROUTE:cross_worker]
 * [ROUTE:no_worker]
 * [ROUTE:pipeline_action:create|advance|status]
 */

const ROUTE_TAG_PATTERN = /\[ROUTE:([a-z_]+)(?::([a-z0-9_-]+))?\]/;

const ROUTE_TYPES = {
  HANDLE_DIRECTLY: "handle_directly",
  ROUTE_TO_WORKER: "route_to_worker",
  RECOMMEND_WORKER: "recommend_worker",
  CROSS_WORKER: "cross_worker",
  NO_WORKER: "no_worker",
  PIPELINE_ACTION: "pipeline_action",
};

/**
 * Parse the routing tag from an AI response.
 * Returns the route classification and strips the tag from the response.
 *
 * @param {string} response - The raw AI response text
 * @returns {Object} { cleanResponse, route: { type, target } }
 */
function parseRoutingTag(response) {
  if (!response) return { cleanResponse: "", route: null };

  const match = response.match(ROUTE_TAG_PATTERN);
  if (!match) {
    return { cleanResponse: response, route: null };
  }

  const routeType = match[1];
  const routeTarget = match[2] || null;

  // Strip the routing tag from the response
  const cleanResponse = response.replace(ROUTE_TAG_PATTERN, "").trim();

  return {
    cleanResponse,
    route: {
      type: routeType,
      target: routeTarget,
    },
  };
}

/**
 * Generate a routing hint based on message context (pre-classification).
 * This helps set expectations before the AI processes the message.
 *
 * @param {string} message - User's message
 * @param {Object} context - { currentSection, vertical, activeWorkerSlugs }
 * @returns {Object} { hint, confidence }
 */
function getRoutingHint(message, context = {}) {
  const { currentSection, activeWorkerSlugs = [] } = context;
  const lower = (message || "").toLowerCase();

  // Platform questions — Alex handles directly
  const platformKeywords = [
    "how much", "cost", "price", "subscribe", "cancel", "pause",
    "what workers", "which workers", "add worker", "remove worker",
    "my subscription", "my plan", "alex", "chief of staff",
    "portfolio", "all projects", "overview", "summary",
    "intake", "onboard", "get started", "set up",
  ];

  for (const kw of platformKeywords) {
    if (lower.includes(kw)) {
      return { hint: ROUTE_TYPES.HANDLE_DIRECTLY, confidence: 0.7 };
    }
  }

  // If user is on a specific worker section, likely routing to that worker
  if (currentSection && currentSection !== "dashboard" && currentSection !== "chief-of-staff") {
    if (activeWorkerSlugs.includes(currentSection)) {
      return { hint: ROUTE_TYPES.ROUTE_TO_WORKER, target: currentSection, confidence: 0.6 };
    }
  }

  // Cross-worker keywords
  const crossWorkerKeywords = [
    "across all", "compare workers", "pipeline", "handoff",
    "what should i", "what do i need", "status report", "briefing",
    "executive summary", "deadline", "blocked",
  ];

  for (const kw of crossWorkerKeywords) {
    if (lower.includes(kw)) {
      return { hint: ROUTE_TYPES.CROSS_WORKER, confidence: 0.6 };
    }
  }

  // Default — let the AI classify
  return { hint: null, confidence: 0 };
}

/**
 * Determine the action to take based on a parsed route.
 *
 * @param {Object} route - { type, target }
 * @param {string[]} activeWorkerSlugs - Active worker slugs
 * @returns {Object} Action descriptor
 */
function getRouteAction(route, activeWorkerSlugs = []) {
  if (!route) return { action: "none" };

  switch (route.type) {
    case ROUTE_TYPES.HANDLE_DIRECTLY:
      return { action: "none" }; // Alex already answered

    case ROUTE_TYPES.ROUTE_TO_WORKER:
      if (route.target && activeWorkerSlugs.includes(route.target)) {
        return {
          action: "suggest_worker",
          workerSlug: route.target,
          message: `This question is best handled by your ${route.target} worker. Would you like me to switch you there?`,
        };
      }
      return { action: "none" };

    case ROUTE_TYPES.RECOMMEND_WORKER:
      return {
        action: "recommend_subscription",
        workerSlug: route.target,
      };

    case ROUTE_TYPES.CROSS_WORKER:
      return { action: "none" }; // Alex synthesized across workers

    case ROUTE_TYPES.NO_WORKER:
      return { action: "none" }; // Alex gave honest answer

    case ROUTE_TYPES.PIPELINE_ACTION:
      return {
        action: "pipeline",
        pipelineAction: route.target, // create | advance | status
      };

    default:
      return { action: "none" };
  }
}

module.exports = {
  parseRoutingTag,
  getRoutingHint,
  getRouteAction,
  ROUTE_TYPES,
};
