"use strict";

/**
 * Multi-Project / Portfolio Support (Capability 6)
 *
 * Users may have multiple projects, properties, or business units.
 * Alex manages across all of them.
 *
 * Worker scope levels:
 * - Project-level: One instance per project (W-021, W-023, W-031)
 * - Portfolio-level: One instance across all projects (W-039, W-019, W-047)
 * - Entity-level: May span projects (W-046, W-045)
 */

/**
 * Generate a portfolio summary across all projects in a workspace.
 *
 * @param {Object} options
 * @param {Object[]} options.projects - Array of project data
 * @param {string[]} options.activeWorkerSlugs - Active worker slugs
 * @param {Object[]} options.alerts - Cross-worker alerts
 * @param {Object} options.subscriptionData - { totalMonthly, workerCount }
 * @returns {Object} Portfolio summary
 */
function getPortfolioSummary(options = {}) {
  const {
    projects = [],
    activeWorkerSlugs = [],
    alerts = [],
    subscriptionData = {},
  } = options;

  const projectSummaries = projects.map(p => ({
    name: p.name,
    phase: p.phase,
    phaseName: p.phaseName || `Phase ${p.phase}`,
    status: getProjectStatus(p),
    workerCount: p.activeWorkers?.length || 0,
    monthlyCost: p.monthlyCost || 0,
    attentionItems: getAttentionItems(p, alerts),
  }));

  const totalMonthly = subscriptionData.totalMonthly ||
    projectSummaries.reduce((sum, p) => sum + p.monthlyCost, 0);
  const totalWorkers = subscriptionData.workerCount || activeWorkerSlugs.length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const warningAlerts = alerts.filter(a => a.severity === "warning");

  return {
    projectCount: projects.length,
    totalMonthly,
    totalWorkers,
    projects: projectSummaries,
    alertSummary: {
      critical: criticalAlerts.length,
      warning: warningAlerts.length,
      total: alerts.length,
    },
    overallStatus: criticalAlerts.length > 0 ? "needs_attention" : warningAlerts.length > 0 ? "monitor" : "green",
  };
}

function getProjectStatus(project) {
  if (project.blockedItems && project.blockedItems > 0) return "blocked";
  if (project.overdueItems && project.overdueItems > 0) return "at_risk";
  return "on_track";
}

function getAttentionItems(project, alerts) {
  return alerts.filter(a =>
    a.projectId === project.id ||
    (a.relatedWorkers && project.activeWorkers?.some(w => a.relatedWorkers.includes(w)))
  );
}

/**
 * Format portfolio summary as a message for Alex.
 */
function formatPortfolioMessage(summary) {
  const lines = [];

  lines.push(`You have ${summary.projectCount} active project${summary.projectCount !== 1 ? "s" : ""}:`);

  for (let i = 0; i < summary.projects.length; i++) {
    const p = summary.projects[i];
    const statusIcon = p.status === "blocked" ? "BLOCKED" : p.status === "at_risk" ? "AT RISK" : "On track";
    lines.push(`${i + 1}. ${p.name} — ${p.phaseName}, ${p.workerCount} workers active, $${p.monthlyCost}/mo [${statusIcon}]`);
    if (p.attentionItems.length > 0) {
      lines.push(`   Attention: ${p.attentionItems.map(a => a.message).join("; ")}`);
    }
  }

  lines.push("");
  lines.push(`Total platform cost: $${summary.totalMonthly}/mo across ${summary.totalWorkers} workers`);

  if (summary.alertSummary.total > 0) {
    lines.push(`Items needing attention: ${summary.alertSummary.critical} critical, ${summary.alertSummary.warning} warnings`);
  } else {
    lines.push("No items needing attention this week.");
  }

  return lines.join("\n");
}

module.exports = {
  getPortfolioSummary,
  formatPortfolioMessage,
};
