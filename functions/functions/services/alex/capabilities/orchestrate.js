"use strict";

/**
 * Cross-Worker Orchestration (Capability 4)
 *
 * Monitors Vault data across all active workers and catches things
 * that fall between the cracks:
 * - Prerequisite checks
 * - Cascading updates
 * - Conflict detection
 * - Coverage gaps
 * - Deadline convergence
 */

const { loadCatalog } = require("../catalogs/loader");

/**
 * Run all orchestration checks for a workspace.
 *
 * @param {Object} options
 * @param {string} options.vertical - Vertical name
 * @param {string[]} options.activeWorkerSlugs - Active worker slugs
 * @param {number} options.currentPhase - Current project phase
 * @param {Object} options.vaultData - Current Vault data by worker slug
 * @param {Object[]} options.pipelines - Active pipeline definitions
 * @param {Object[]} options.deadlines - Known deadlines
 * @returns {Object} Orchestration alerts grouped by type
 */
function runChecks(options = {}) {
  const {
    vertical = "real-estate-development",
    activeWorkerSlugs = [],
    currentPhase = 0,
    vaultData = {},
    pipelines = [],
    deadlines = [],
  } = options;

  const catalog = loadCatalog(vertical);
  if (!catalog) return { alerts: [], summary: "No catalog loaded" };

  const activeWorkers = catalog.workers.filter(w => activeWorkerSlugs.includes(w.slug));

  const alerts = [
    ...checkPrerequisites(activeWorkers, vaultData, catalog),
    ...detectConflicts(activeWorkers, vaultData),
    ...findCoverageGaps(activeWorkers, currentPhase, catalog),
    ...checkDeadlineConvergence(deadlines),
    ...checkPipelineHealth(pipelines),
  ];

  // Sort by severity: critical > warning > info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));

  return {
    alerts,
    summary: alerts.length === 0
      ? "All clear — no cross-worker issues detected"
      : `${alerts.filter(a => a.severity === "critical").length} critical, ${alerts.filter(a => a.severity === "warning").length} warnings, ${alerts.filter(a => a.severity === "info").length} informational`,
  };
}

/**
 * Check if active workers have their prerequisite data available.
 */
function checkPrerequisites(activeWorkers, vaultData, catalog) {
  const alerts = [];
  const availableData = new Set(Object.keys(vaultData));

  for (const worker of activeWorkers) {
    if (!worker.vault?.reads?.length) continue;

    for (const required of worker.vault.reads) {
      if (!availableData.has(required)) {
        // Find which worker produces this data
        const producer = catalog.workers.find(w =>
          w.vault?.writes?.includes(required)
        );
        const producerName = producer ? `${producer.name} (${producer.id})` : "unknown worker";
        const isProducerActive = producer && activeWorkers.some(w => w.id === producer.id);

        if (!isProducerActive && producer) {
          alerts.push({
            type: "prerequisite",
            severity: "warning",
            message: `${worker.name} needs "${required}" data from ${producerName}, but that worker is not active`,
            relatedWorkers: [worker.slug, producer?.slug].filter(Boolean),
            recommendation: `Subscribe to ${producerName} to provide ${required} data`,
          });
        } else if (isProducerActive) {
          alerts.push({
            type: "prerequisite",
            severity: "info",
            message: `${worker.name} is waiting for "${required}" data from ${producerName}`,
            relatedWorkers: [worker.slug, producer?.slug].filter(Boolean),
          });
        }
      }
    }
  }

  return alerts;
}

/**
 * Detect conflicting data between workers.
 */
function detectConflicts(activeWorkers, vaultData) {
  const alerts = [];

  // Check for workers that write to the same Vault keys
  const writeMap = new Map(); // key -> [worker slugs]
  for (const worker of activeWorkers) {
    for (const writeKey of (worker.vault?.writes || [])) {
      if (!writeMap.has(writeKey)) writeMap.set(writeKey, []);
      writeMap.get(writeKey).push(worker);
    }
  }

  for (const [key, writers] of writeMap) {
    if (writers.length > 1) {
      alerts.push({
        type: "conflict",
        severity: "warning",
        message: `Multiple workers write to "${key}": ${writers.map(w => w.name).join(", ")}. Check for conflicting data.`,
        relatedWorkers: writers.map(w => w.slug),
      });
    }
  }

  return alerts;
}

/**
 * Find coverage gaps — lifecycle phases with no worker coverage.
 */
function findCoverageGaps(activeWorkers, currentPhase, catalog) {
  const alerts = [];

  // Check phases from current through current+2
  for (let phase = currentPhase; phase <= Math.min(currentPhase + 2, 7); phase++) {
    const phaseWorkers = catalog.workers.filter(w => w.phase === phase && w.id !== "W-048");
    const activeInPhase = phaseWorkers.filter(w => activeWorkers.some(a => a.id === w.id));

    // Check for hub workers (critical priority) that should be active
    const missingHubs = phaseWorkers.filter(w =>
      w.alexRegistration?.priority === "critical" &&
      !activeWorkers.some(a => a.id === w.id)
    );

    if (phase === currentPhase && missingHubs.length > 0) {
      for (const hub of missingHubs) {
        alerts.push({
          type: "coverage_gap",
          severity: "warning",
          message: `Hub worker ${hub.name} (${hub.id}) is not active for Phase ${phase}. This worker coordinates other Phase ${phase} workers.`,
          relatedWorkers: [hub.slug],
          recommendation: `Subscribe to ${hub.name} ($${hub.pricing.monthly}/mo) for Phase ${phase} coordination`,
        });
      }
    }

    if (phase === currentPhase && activeInPhase.length === 0 && phaseWorkers.length > 0) {
      const phaseName = (catalog.lifecycle || []).find(l => l.phase === phase)?.name || `Phase ${phase}`;
      alerts.push({
        type: "coverage_gap",
        severity: "info",
        message: `No workers active for ${phaseName} (Phase ${phase}). ${phaseWorkers.length} workers available.`,
        relatedWorkers: [],
        recommendation: `Consider activating workers for ${phaseName}`,
      });
    }
  }

  return alerts;
}

/**
 * Check for converging deadlines across workers.
 */
function checkDeadlineConvergence(deadlines) {
  const alerts = [];
  if (deadlines.length < 2) return alerts;

  // Sort by date
  const sorted = [...deadlines].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Find clusters of deadlines within 3 days of each other
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i].dueDate);
    const cluster = [sorted[i]];

    for (let j = i + 1; j < sorted.length; j++) {
      const next = new Date(sorted[j].dueDate);
      const daysDiff = (next - current) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 3) {
        cluster.push(sorted[j]);
      } else {
        break;
      }
    }

    if (cluster.length >= 3) {
      alerts.push({
        type: "deadline_convergence",
        severity: "warning",
        message: `${cluster.length} deadlines converge within 3 days (${sorted[i].dueDate}): ${cluster.map(d => d.title).join(", ")}`,
        relatedWorkers: [...new Set(cluster.map(d => d.workerSlug).filter(Boolean))],
      });
      i += cluster.length - 1; // Skip past cluster
    }
  }

  return alerts;
}

/**
 * Check pipeline health — stalled steps, pending approvals.
 */
function checkPipelineHealth(pipelines) {
  const alerts = [];
  const now = Date.now();

  for (const pipeline of pipelines) {
    if (!pipeline.steps) continue;

    for (const step of pipeline.steps) {
      if (step.status === "in_progress" && step.startedAt) {
        const hoursElapsed = (now - new Date(step.startedAt).getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 48) {
          alerts.push({
            type: "pipeline_stalled",
            severity: "warning",
            message: `Pipeline "${pipeline.name}" step "${step.name}" has been in progress for ${Math.round(hoursElapsed)} hours`,
            relatedWorkers: step.workerId ? [step.workerId] : [],
          });
        }
      }

      if (step.status === "pending_approval" && step.requestedAt) {
        const hoursWaiting = (now - new Date(step.requestedAt).getTime()) / (1000 * 60 * 60);
        if (hoursWaiting > 24) {
          alerts.push({
            type: "pending_approval",
            severity: "info",
            message: `Pipeline "${pipeline.name}" step "${step.name}" is waiting for your approval (${Math.round(hoursWaiting)} hours)`,
            relatedWorkers: step.workerId ? [step.workerId] : [],
          });
        }
      }
    }
  }

  return alerts;
}

module.exports = {
  runChecks,
};
