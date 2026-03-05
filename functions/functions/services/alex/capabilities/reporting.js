"use strict";

/**
 * Value Reporting (Capability 9) & Communication Mode Formatting (Capability 7)
 *
 * Generates monthly value reports demonstrating ROI.
 * Formats responses according to the user's communication mode preference.
 */

/**
 * Generate a monthly value report for a workspace.
 *
 * @param {Object} options
 * @param {string} options.workspaceId
 * @param {string} options.month - ISO month string (YYYY-MM)
 * @param {Object} options.metrics - { documentsGenerated, deadlinesTracked, deadlinesMet, drawsProcessed, drawAmount, alertsCaught, hoursEstimated }
 * @param {number} options.monthlyCost - Platform cost
 * @param {number} options.consultantEquivalent - What this would cost with consultants
 * @param {Object[]} options.highlights - Key accomplishments
 * @returns {Object} Value report data
 */
function generateValueReport(options = {}) {
  const {
    workspaceId,
    month,
    metrics = {},
    monthlyCost = 0,
    consultantEquivalent = 0,
    highlights = [],
  } = options;

  const {
    documentsGenerated = 0,
    deadlinesTracked = 0,
    deadlinesMet = 0,
    deadlinesMissed = 0,
    drawsProcessed = 0,
    drawAmount = 0,
    alertsCaught = 0,
    hoursEstimated = 0,
    complianceItems = 0,
    complianceMisses = 0,
  } = metrics;

  const savings = consultantEquivalent > 0 ? consultantEquivalent - monthlyCost : 0;
  const savingsPercent = consultantEquivalent > 0 ? Math.round((savings / consultantEquivalent) * 100) : 0;
  const deadlineRate = deadlinesTracked > 0 ? Math.round((deadlinesMet / deadlinesTracked) * 100) : 100;
  const complianceRate = complianceItems > 0 ? Math.round(((complianceItems - complianceMisses) / complianceItems) * 100) : 100;

  return {
    workspaceId,
    month,
    summary: {
      documentsGenerated,
      deadlinesTracked,
      deadlinesMet,
      deadlinesMissed,
      deadlineComplianceRate: deadlineRate,
      drawsProcessed,
      drawAmount,
      alertsCaught,
      hoursEstimated,
      complianceItems,
      complianceMisses,
      complianceRate,
    },
    cost: {
      platformMonthly: monthlyCost,
      consultantEquivalent,
      monthlySavings: savings,
      savingsPercent,
    },
    highlights,
    // Template data for document generation
    documentData: {
      templateId: "alex-monthly-value-report",
      format: "pdf",
      title: `Monthly Value Report — ${month}`,
      content: {
        month,
        metrics: {
          documentsGenerated,
          deadlinesTracked,
          deadlinesMet,
          drawsProcessed,
          drawAmount: formatCurrency(drawAmount),
          alertsCaught,
          hoursEstimated,
          complianceItems,
        },
        cost: {
          platform: formatCurrency(monthlyCost),
          consultant: formatCurrency(consultantEquivalent),
          savings: formatCurrency(savings),
          savingsPercent: `${savingsPercent}%`,
        },
        highlights,
      },
    },
  };
}

/**
 * Format a value report as a chat message in the specified communication mode.
 */
function formatValueReportMessage(report, mode = "detailed") {
  switch (mode) {
    case "concise":
      return formatConcise(report);
    case "executive_summary":
      return formatExecutive(report);
    case "detailed":
    default:
      return formatDetailed(report);
  }
}

function formatConcise(report) {
  const s = report.summary;
  const c = report.cost;
  const lines = [
    `Value report for ${report.month}:`,
    `${s.documentsGenerated} docs, ${s.deadlinesTracked} deadlines (${s.deadlineComplianceRate}% met), ${s.alertsCaught} alerts caught`,
    `${s.hoursEstimated}h saved, $${c.platformMonthly}/mo vs $${c.consultantEquivalent}/mo consultants (${c.savingsPercent}% savings)`,
  ];
  return lines.join("\n");
}

function formatDetailed(report) {
  const s = report.summary;
  const c = report.cost;
  const lines = [
    `This month, your Digital Workers:`,
    "",
  ];

  if (s.drawsProcessed > 0) {
    lines.push(`Processed ${s.drawsProcessed} construction draws (${formatCurrency(s.drawAmount)}) with automated cross-checks`);
  }
  if (s.alertsCaught > 0) {
    lines.push(`Caught ${s.alertsCaught} issue${s.alertsCaught !== 1 ? "s" : ""} before they became problems`);
  }
  if (s.deadlinesTracked > 0) {
    lines.push(`Tracked ${s.deadlinesTracked} deadlines (${s.deadlinesMet} met, ${s.deadlinesMissed} missed)`);
  }
  if (s.documentsGenerated > 0) {
    lines.push(`Generated ${s.documentsGenerated} documents`);
  }
  if (s.complianceItems > 0) {
    lines.push(`Compliance items handled: ${s.complianceItems} (${s.complianceRate}% rate)`);
  }

  lines.push("");
  lines.push(`Estimated time saved: ${s.hoursEstimated} hours`);
  lines.push(`Estimated cost vs. consultants: ${formatCurrency(c.consultantEquivalent)}/mo vs. your ${formatCurrency(c.platformMonthly)}/mo (${c.savingsPercent}% savings)`);

  if (report.highlights.length > 0) {
    lines.push("");
    lines.push("Key highlights:");
    for (const h of report.highlights) {
      lines.push(`  ${h}`);
    }
  }

  return lines.join("\n");
}

function formatExecutive(report) {
  const s = report.summary;
  const c = report.cost;
  const status = s.deadlinesMissed > 0 ? "Needs attention" : "Green";
  return `${report.month}: ${status}. ${s.hoursEstimated}h saved, ${c.savingsPercent}% cost reduction ($${c.platformMonthly} vs $${c.consultantEquivalent}). ${s.deadlinesTracked} deadlines tracked, ${s.complianceRate}% compliance rate.`;
}

function formatCurrency(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

module.exports = {
  generateValueReport,
  formatValueReportMessage,
};
