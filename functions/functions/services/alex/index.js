"use strict";

/**
 * Alex Service — Universal Orchestration Layer (W-048)
 *
 * Main entry point for the Alex service. Lazy-loaded to minimize cold-start.
 * Exports buildAlexPrompt() for the chat:message route and capability functions
 * for the alex:* API routes.
 */

// Lazy-load modules
let _promptBuilder;
let _catalogLoader;
let _recommend;
let _temporal;
let _orchestrate;
let _router;
let _portfolio;
let _reporting;

function getPromptBuilder() {
  if (!_promptBuilder) _promptBuilder = require("./promptBuilder");
  return _promptBuilder;
}

function getCatalogLoader() {
  if (!_catalogLoader) _catalogLoader = require("./catalogs/loader");
  return _catalogLoader;
}

function getRecommend() {
  if (!_recommend) _recommend = require("./capabilities/recommend");
  return _recommend;
}

function getTemporal() {
  if (!_temporal) _temporal = require("./capabilities/temporal");
  return _temporal;
}

function getOrchestrate() {
  if (!_orchestrate) _orchestrate = require("./capabilities/orchestrate");
  return _orchestrate;
}

function getRouter() {
  if (!_router) _router = require("./capabilities/router");
  return _router;
}

function getPortfolio() {
  if (!_portfolio) _portfolio = require("./capabilities/portfolio");
  return _portfolio;
}

function getReporting() {
  if (!_reporting) _reporting = require("./capabilities/reporting");
  return _reporting;
}

/**
 * Build Alex's system prompt for a chat session.
 *
 * @param {Object} options
 * @param {string} options.userId - Firebase user ID
 * @param {string} options.workspaceId - Workspace ID
 * @param {string} options.surface - "business" | "investor" | "developer" | etc.
 * @param {string[]} options.activeWorkers - Slugs of active worker subscriptions
 * @param {string} options.vertical - Primary vertical
 * @param {string} options.currentSection - Current UI section
 * @param {Object} options.workspace - Workspace data (from Firestore)
 * @param {Object} options.surfaceContext - Additional context for surface overlays
 * @returns {Promise<string>} Assembled system prompt
 */
async function buildAlexPrompt(options = {}) {
  const {
    userId,
    workspaceId,
    surface = "business",
    activeWorkers = [],
    vertical,
    currentSection,
    workspace,
    surfaceContext = {},
    onboardingStatus,
  } = options;

  // Extract Alex configuration from workspace
  const cosConfig = workspace?.cosConfig || {};
  const chiefOfStaff = workspace?.chiefOfStaff || {};
  const alexName = cosConfig.name || chiefOfStaff.name || "Alex";
  const alexVoice = cosConfig.personality || "professional";
  const communicationMode = cosConfig.communicationMode || "detailed";

  // Build user profile from workspace data
  let userProfile = null;
  if (workspace) {
    userProfile = {
      name: workspace.ownerName || workspace.name,
      role: workspace.ownerRole,
      industry: workspace.vertical || vertical,
      communicationMode,
      location: workspace.location,
    };
  }

  // Build project profiles from workspace
  let projects = null;
  if (workspace?.projects && workspace.projects.length > 0) {
    projects = workspace.projects;
  }

  // Assemble the prompt
  return getPromptBuilder().assemblePrompt({
    surface,
    activeWorkerSlugs: activeWorkers,
    vertical: vertical || workspace?.vertical || "real-estate-development",
    communicationMode,
    userProfile,
    projects,
    vaultSummary: null, // Vault data loaded on-demand, not pre-fetched
    alerts: null, // Alerts loaded on-demand
    alexName,
    alexVoice,
    surfaceContext,
    onboardingStatus,
  });
}

/**
 * Get worker recommendations for a workspace.
 */
async function getRecommendations(options = {}) {
  return getRecommend().getRecommendations(options);
}

/**
 * Get temporal status for workers in a project.
 */
function getTemporalStatus(options = {}) {
  return getTemporal().getTemporalStatus(options);
}

/**
 * Run orchestration checks for a workspace.
 */
async function runOrchestrationChecks(options = {}) {
  return getOrchestrate().runChecks(options);
}

/**
 * Parse routing tags from AI response.
 */
function parseRoutingTag(response) {
  return getRouter().parseRoutingTag(response);
}

/**
 * Get portfolio summary across all projects.
 */
async function getPortfolioSummary(options = {}) {
  return getPortfolio().getPortfolioSummary(options);
}

/**
 * Generate a value report for a workspace.
 */
async function generateValueReport(options = {}) {
  return getReporting().generateValueReport(options);
}

/**
 * Get catalog information.
 */
function getCatalog(vertical) {
  return getCatalogLoader().loadCatalog(vertical);
}

function getWorker(vertical, slugOrId) {
  return getCatalogLoader().getWorker(vertical, slugOrId);
}

function getAvailableVerticals() {
  return getCatalogLoader().listVerticals();
}

module.exports = {
  buildAlexPrompt,
  getRecommendations,
  getTemporalStatus,
  runOrchestrationChecks,
  parseRoutingTag,
  getPortfolioSummary,
  generateValueReport,
  getCatalog,
  getWorker,
  getAvailableVerticals,
};
