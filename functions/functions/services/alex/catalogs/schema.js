"use strict";

/**
 * Universal Worker Catalog Schema
 *
 * Every TitleApp vertical follows this same structure.
 * New verticals (aviation, healthcare, legal, etc.) are added as JSON files
 * that conform to this schema — no code changes to Alex.
 */

const VALID_TYPES = ["standalone", "pipeline", "composite", "copilot", "orchestrator", "platform"];
const VALID_STATUSES = ["live", "development", "waitlist", "deprecated"];
const VALID_TEMPORAL_TYPES = ["always_on", "phase_bound", "event_driven", "seasonal", "one_time"];
const VALID_PRIORITIES = ["critical", "high", "normal", "low"];

const LIFECYCLE_TEMPLATE = [
  { phase: 0, name: "Discovery / Assessment", description: "Evaluate opportunity" },
  { phase: 1, name: "Planning / Design", description: "Plan the work" },
  { phase: 2, name: "Approval / Licensing", description: "Get permission" },
  { phase: 3, name: "Financing / Funding", description: "Get the money" },
  { phase: 4, name: "Execution / Operations", description: "Do the work" },
  { phase: 5, name: "Stabilization / Growth", description: "Reach steady state" },
  { phase: 6, name: "Ongoing Compliance", description: "Stay compliant" },
  { phase: 7, name: "Exit / Transition", description: "Wind down or sell" },
];

function validateWorkerEntry(entry) {
  const errors = [];
  if (!entry.id || !/^[A-Z][A-Z0-9]{0,3}-[A-Z0-9]{1,4}$/.test(entry.id)) errors.push(`Invalid id: ${entry.id}`);
  if (!entry.slug) errors.push("Missing slug");
  if (!entry.name) errors.push("Missing name");
  if (!VALID_TYPES.includes(entry.type)) errors.push(`Invalid type: ${entry.type}`);
  if (!VALID_STATUSES.includes(entry.status)) errors.push(`Invalid status: ${entry.status}`);
  if (!VALID_TEMPORAL_TYPES.includes(entry.temporalType)) errors.push(`Invalid temporalType: ${entry.temporalType}`);
  if (typeof entry.pricing?.monthly !== "number") errors.push("Missing pricing.monthly");
  return { valid: errors.length === 0, errors };
}

function validateCatalog(catalog) {
  const errors = [];
  if (!catalog.vertical) errors.push("Missing vertical");
  if (!Array.isArray(catalog.lifecycle)) errors.push("Missing lifecycle array");
  if (!Array.isArray(catalog.workers)) errors.push("Missing workers array");
  for (const w of (catalog.workers || [])) {
    const result = validateWorkerEntry(w);
    if (!result.valid) errors.push(`Worker ${w.id || "unknown"}: ${result.errors.join(", ")}`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Compact routing index — one line per worker, ~15 tokens each.
 * Always included in Alex's prompt for routing decisions.
 */
function toRoutingIndex(workers) {
  return workers.map(w =>
    `${w.id}|${w.slug}|${w.name}|P${w.phase}|${w.type}|$${w.pricing.monthly}/mo|${w.status}|${w.capabilitySummary}`
  ).join("\n");
}

/**
 * Active worker detail — full info for a subscribed worker, ~50 tokens each.
 * Only included for workers the user has active subscriptions for.
 */
function toActiveWorkerDetail(worker) {
  const parts = [
    `[${worker.id}] ${worker.name} (${worker.slug})`,
    `Type: ${worker.type} | Phase: ${worker.phase} | Price: $${worker.pricing.monthly}/mo`,
    `Capabilities: ${worker.capabilitySummary}`,
  ];
  if (worker.vault?.reads?.length) parts.push(`Reads from Vault: ${worker.vault.reads.join(", ")}`);
  if (worker.vault?.writes?.length) parts.push(`Writes to Vault: ${worker.vault.writes.join(", ")}`);
  if (worker.referrals?.length) {
    parts.push(`Referral triggers: ${worker.referrals.map(r => `${r.event} -> ${r.routesTo}`).join("; ")}`);
  }
  if (worker.temporalType !== "always_on") {
    parts.push(`Temporal: ${worker.temporalType}${worker.temporal?.typicalStart ? ` (${worker.temporal.typicalStart} to ${worker.temporal.typicalEnd})` : ""}`);
  }
  return parts.join("\n");
}

/**
 * Recommendation detail — used when Alex suggests a worker.
 */
function toRecommendationDetail(worker, tier, reason) {
  return {
    id: worker.id,
    slug: worker.slug,
    name: worker.name,
    price: worker.pricing.monthly,
    tier, // mandatory | core | connected | efficiency | future
    reason,
    capabilitySummary: worker.capabilitySummary,
    temporalType: worker.temporalType,
  };
}

/**
 * Bundle summary for cost presentation.
 */
function toBundleSummary(bundle) {
  return `${bundle.name} (${bundle.targetRole}): ${bundle.workers.join(", ")} — $${bundle.monthlyCost}/mo | Replaces: ${bundle.replaces}`;
}

module.exports = {
  VALID_TYPES,
  VALID_STATUSES,
  VALID_TEMPORAL_TYPES,
  VALID_PRIORITIES,
  LIFECYCLE_TEMPLATE,
  validateWorkerEntry,
  validateCatalog,
  toRoutingIndex,
  toActiveWorkerDetail,
  toRecommendationDetail,
  toBundleSummary,
};
