"use strict";

/**
 * Temporal Awareness (Capability 3)
 *
 * Understands that workers have lifecycles within a project or business.
 * Tracks where users are in their lifecycle and suggests activating/pausing workers.
 *
 * Worker Temporal Types:
 * - always_on:    Active for the life of the project/business
 * - phase_bound:  Active during a specific phase
 * - event_driven: Activated by a specific event
 * - seasonal:     Recurring at specific times
 * - one_time:     Used once then done
 */

const { loadCatalog } = require("../catalogs/loader");

/**
 * Get temporal status for all workers relative to a project's lifecycle.
 *
 * @param {Object} options
 * @param {string} options.vertical - Vertical name
 * @param {number} options.currentPhase - Project's current phase (0-7)
 * @param {string[]} options.activeWorkerSlugs - Currently subscribed workers
 * @param {Object} options.projectData - Additional project context
 * @returns {Object} Categorized temporal recommendations
 */
function getTemporalStatus(options = {}) {
  const {
    vertical = "real-estate-development",
    currentPhase = 0,
    activeWorkerSlugs = [],
    projectData = {},
  } = options;

  const catalog = loadCatalog(vertical);
  if (!catalog) return { activate: [], pause: [], upcoming: [], overdue: [] };

  const activeSet = new Set(activeWorkerSlugs);
  const activate = [];
  const pause = [];
  const upcoming = [];
  const overdue = [];

  for (const worker of catalog.workers) {
    if (worker.id === "W-048") continue; // Skip Alex

    const status = classifyWorkerTiming(worker, currentPhase, activeSet.has(worker.slug));

    switch (status.action) {
      case "activate":
        activate.push({ ...workerSummary(worker), reason: status.reason });
        break;
      case "pause":
        pause.push({ ...workerSummary(worker), reason: status.reason, savingsPerMonth: worker.pricing.monthly });
        break;
      case "upcoming":
        upcoming.push({ ...workerSummary(worker), reason: status.reason, phase: status.phase });
        break;
      case "overdue":
        overdue.push({ ...workerSummary(worker), reason: status.reason });
        break;
    }
  }

  // Calculate potential savings from pausing
  const monthlySavings = pause.reduce((sum, w) => sum + w.savingsPerMonth, 0);

  return {
    activate,
    pause,
    upcoming,
    overdue,
    monthlySavings,
    currentPhase,
    phaseName: getPhaseNameFromCatalog(catalog, currentPhase),
  };
}

function classifyWorkerTiming(worker, currentPhase, isActive) {
  switch (worker.temporalType) {
    case "always_on":
      // Always-on workers should be active once the project reaches their phase
      if (!isActive && worker.phase <= currentPhase) {
        return { action: "activate", reason: `Always-on worker for ${worker.suite} — should be active` };
      }
      return { action: "none" };

    case "phase_bound":
      if (isActive && worker.phase < currentPhase - 1) {
        // Worker's phase is well past — suggest pausing
        return { action: "pause", reason: `Phase ${worker.phase} is complete — this worker's primary function is done` };
      }
      if (!isActive && worker.phase === currentPhase) {
        // Worker should be active for current phase
        return { action: "activate", reason: `Your project is in Phase ${currentPhase} — this worker is needed now` };
      }
      if (!isActive && worker.phase === currentPhase + 1) {
        // Coming up in next phase
        return { action: "upcoming", reason: `Needed in Phase ${worker.phase}`, phase: worker.phase };
      }
      if (isActive && worker.phase > currentPhase + 1) {
        // Active too early
        return { action: "none" }; // Don't suggest pausing something the user proactively activated
      }
      return { action: "none" };

    case "event_driven":
      // Event-driven workers are activated by triggers, not phase
      // We can only flag if they're active but probably shouldn't be
      return { action: "none" };

    case "seasonal":
      // Seasonal workers have recurring activation patterns
      // Would need calendar data to determine timing
      return { action: "none" };

    case "one_time":
      // One-time workers are done after their task completes
      // Would need task completion data to determine
      return { action: "none" };

    default:
      return { action: "none" };
  }
}

function workerSummary(worker) {
  return {
    id: worker.id,
    slug: worker.slug,
    name: worker.name,
    price: worker.pricing.monthly,
    temporalType: worker.temporalType,
  };
}

function getPhaseNameFromCatalog(catalog, phase) {
  const p = (catalog.lifecycle || []).find(l => l.phase === phase);
  return p ? p.name : `Phase ${phase}`;
}

/**
 * Format temporal status as a message for Alex to present.
 */
function formatTemporalMessage(status) {
  const lines = [];

  if (status.activate.length > 0) {
    lines.push("WORKERS TO ACTIVATE NOW:");
    for (const w of status.activate) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
  }

  if (status.pause.length > 0) {
    lines.push(`\nWORKERS TO CONSIDER PAUSING (saves $${status.monthlySavings}/mo):`);
    for (const w of status.pause) {
      lines.push(`  ${w.id} ${w.name} — saves $${w.savingsPerMonth}/mo — ${w.reason}`);
    }
  }

  if (status.upcoming.length > 0) {
    lines.push("\nCOMING UP NEXT:");
    for (const w of status.upcoming) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
  }

  if (status.overdue.length > 0) {
    lines.push("\nOVERDUE — SHOULD ALREADY BE ACTIVE:");
    for (const w of status.overdue) {
      lines.push(`  ${w.id} ${w.name} — $${w.price}/mo — ${w.reason}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  getTemporalStatus,
  formatTemporalMessage,
};
