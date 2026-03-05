"use strict";

/**
 * Worker Recommendation Engine (Capability 2)
 *
 * Builds recommendations from catalog data using 5 tiers:
 * mandatory → core → connected → efficiency → future
 */

const { loadCatalog, filterWorkers } = require("../catalogs/loader");
const { toRecommendationDetail } = require("../catalogs/schema");

// Compliance trigger patterns — when these conditions are detected,
// the corresponding worker capabilities become mandatory
const COMPLIANCE_TRIGGERS = {
  federal_funding: {
    workers: ["labor-staffing"], // W-024 (Davis-Bacon/prevailing wage)
    reason: "Federal funding requires Davis-Bacon prevailing wage compliance",
  },
  prevailing_wage_project: {
    workers: ["labor-staffing"],
    reason: "Prevailing wage requirements apply to this project",
  },
  securities_offering: {
    workers: ["crowdfunding-reg-d", "legal-contract"],
    reason: "Securities offerings require SEC compliance and legal review",
  },
  construction_project: {
    workers: ["safety-osha"],
    reason: "OSHA 29 CFR 1926 applies to all construction projects",
  },
  osha_jurisdiction: {
    workers: ["safety-osha"],
    reason: "OSHA compliance is required in this jurisdiction",
  },
  lihtc: {
    workers: ["tax-credit-incentive", "compliance-deadline"],
    reason: "LIHTC projects require ongoing tax credit compliance monitoring",
  },
  opportunity_zone: {
    workers: ["opportunity-zone", "compliance-deadline"],
    reason: "OZ investments have strict 180-day and substantial improvement deadlines",
  },
  multifamily: {
    workers: ["accessibility-fair-housing"],
    reason: "Multifamily projects must comply with Fair Housing Act design requirements",
  },
};

/**
 * Generate worker recommendations for a user.
 *
 * @param {Object} options
 * @param {string} options.vertical - The user's primary vertical
 * @param {string} options.role - User's role (developer, investor, gc, etc.)
 * @param {number} options.currentPhase - Current project phase (0-7)
 * @param {string[]} options.activeWorkerSlugs - Already-subscribed worker slugs
 * @param {string[]} options.complianceTriggers - Detected compliance triggers
 * @param {Object} options.userNeeds - Free-form user needs from intake
 * @returns {Object} Categorized recommendations with pricing
 */
function getRecommendations(options = {}) {
  const {
    vertical = "real-estate-development",
    role,
    currentPhase = 0,
    activeWorkerSlugs = [],
    complianceTriggers = [],
    userNeeds = {},
  } = options;

  const catalog = loadCatalog(vertical);
  if (!catalog) return { recommendations: [], totalMonthlyCost: 0 };

  const allWorkers = catalog.workers.filter(w => w.id !== "W-048"); // Exclude Alex
  const activeSet = new Set(activeWorkerSlugs);

  const mandatory = [];
  const core = [];
  const connected = [];
  const efficiency = [];
  const future = [];

  for (const worker of allWorkers) {
    // Skip already-subscribed workers
    if (activeSet.has(worker.slug)) continue;

    // Check mandatory compliance triggers
    const mandatoryReason = getMandatoryReason(worker, complianceTriggers);
    if (mandatoryReason) {
      mandatory.push(toRecommendationDetail(worker, "mandatory", mandatoryReason));
      continue;
    }

    // Check if worker's mandatoryWhen conditions are met
    if (worker.mandatoryWhen && worker.mandatoryWhen.length > 0) {
      const triggered = worker.mandatoryWhen.find(cond => complianceTriggers.includes(cond));
      if (triggered) {
        mandatory.push(toRecommendationDetail(worker, "mandatory", `Required because: ${triggered}`));
        continue;
      }
    }

    // Core: workers in the user's current or next phase, matching role
    if (isCoreWorker(worker, currentPhase, role)) {
      core.push(toRecommendationDetail(worker, "core", getCoreReason(worker, currentPhase)));
      continue;
    }

    // Connected: workers that share Vault data with active workers
    const connectionReason = getConnectionReason(worker, activeWorkerSlugs, allWorkers);
    if (connectionReason) {
      connected.push(toRecommendationDetail(worker, "connected", connectionReason));
      continue;
    }

    // Future: workers for later phases
    if (worker.phase > currentPhase + 1) {
      future.push(toRecommendationDetail(worker, "future", `Needed in Phase ${worker.phase} (${getPhaseDescription(worker.phase, catalog)})`));
      continue;
    }

    // Efficiency: everything else that's available
    if (worker.status !== "deprecated") {
      efficiency.push(toRecommendationDetail(worker, "efficiency", worker.capabilitySummary));
    }
  }

  // Calculate costs
  const startNowCost = [...mandatory, ...core].reduce((sum, w) => sum + w.price, 0);
  const activeCurrentCost = activeWorkerSlugs.length > 0
    ? allWorkers.filter(w => activeSet.has(w.slug)).reduce((sum, w) => sum + w.pricing.monthly, 0)
    : 0;
  const peakCost = allWorkers.reduce((sum, w) => sum + w.pricing.monthly, 0);

  return {
    recommendations: { mandatory, core, connected, efficiency, future },
    pricing: {
      currentMonthly: activeCurrentCost,
      recommendedAdditions: startNowCost,
      projectedTotal: activeCurrentCost + startNowCost,
      peakMonthly: peakCost,
    },
    alexFree: (activeWorkerSlugs.length + mandatory.length + core.length) >= 3,
  };
}

function getMandatoryReason(worker, triggers) {
  for (const trigger of triggers) {
    const pattern = COMPLIANCE_TRIGGERS[trigger];
    if (pattern && pattern.workers.includes(worker.slug)) {
      return pattern.reason;
    }
  }
  return null;
}

function isCoreWorker(worker, currentPhase, role) {
  // Workers in the current phase or the next phase are core
  if (worker.phase === currentPhase || worker.phase === currentPhase + 1) {
    // Hub workers are always core
    if (worker.alexRegistration?.priority === "critical") return true;
    // High-priority workers in current phase are core
    if (worker.phase === currentPhase && worker.alexRegistration?.priority === "high") return true;
    return true;
  }
  return false;
}

function getCoreReason(worker, currentPhase) {
  if (worker.phase === currentPhase) {
    return `Active in your current phase (Phase ${currentPhase})`;
  }
  return `Coming up in Phase ${worker.phase} — start now for smoother transition`;
}

function getConnectionReason(worker, activeSlugs, allWorkers) {
  if (!worker.vault?.reads?.length) return null;

  // Check if any active worker writes data that this worker reads
  const activeWriters = allWorkers
    .filter(w => activeSlugs.includes(w.slug))
    .flatMap(w => w.vault?.writes || []);

  const shared = worker.vault.reads.filter(r => activeWriters.includes(r));
  if (shared.length > 0) {
    return `Reads ${shared.join(", ")} from your active workers — adds cross-worker intelligence`;
  }
  return null;
}

function getPhaseDescription(phase, catalog) {
  const lifecycle = catalog.lifecycle || [];
  const p = lifecycle.find(l => l.phase === phase);
  return p ? p.name : `Phase ${phase}`;
}

/**
 * Format recommendations as a prompt-friendly string for Alex to present.
 */
function formatRecommendationsForPrompt(result) {
  const { recommendations, pricing, alexFree } = result;
  const lines = ["YOUR RECOMMENDED WORKER SUITE\n"];

  if (recommendations.mandatory.length > 0) {
    lines.push("MANDATORY (regulatory):");
    for (const w of recommendations.mandatory) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
    lines.push("");
  }

  if (recommendations.core.length > 0) {
    lines.push("START NOW:");
    for (const w of recommendations.core) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
    lines.push("");
  }

  if (recommendations.connected.length > 0) {
    lines.push("ADD FOR CROSS-WORKER INTELLIGENCE:");
    for (const w of recommendations.connected) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
    lines.push("");
  }

  if (recommendations.efficiency.length > 0) {
    lines.push("OPTIONAL:");
    for (const w of recommendations.efficiency.slice(0, 5)) { // Cap at 5
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.capabilitySummary}`);
    }
    if (recommendations.efficiency.length > 5) {
      lines.push(`  ...and ${recommendations.efficiency.length - 5} more`);
    }
    lines.push("");
  }

  if (recommendations.future.length > 0) {
    lines.push("COMING LATER:");
    for (const w of recommendations.future.slice(0, 5)) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
    lines.push("");
  }

  lines.push(`MONTHLY COST: $${pricing.projectedTotal} now → $${pricing.peakMonthly} at peak`);
  if (alexFree) {
    lines.push("Alex (Chief of Staff): FREE with 3+ subscriptions");
  }

  return lines.join("\n");
}

module.exports = {
  getRecommendations,
  formatRecommendationsForPrompt,
  COMPLIANCE_TRIGGERS,
};
