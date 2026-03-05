"use strict";

/**
 * Alex Prompt Builder
 *
 * Dynamically assembles Alex's system prompt from static components
 * (identity, rules, routing) + dynamic components (catalog, user profile,
 * Vault data, subscriptions).
 *
 * New verticals are injected by adding catalog JSON files — no code changes.
 */

const { getRoutingIndex, getActiveWorkerDetails, listVerticals, loadCatalog, getLifecycle } = require("./catalogs/loader");

// Lazy-load prompt components to minimize cold-start
let _identity, _rules, _routing, _communication, _intake, _onboarding, _surfaces, _registryContext;
function getIdentityModule() { if (!_identity) _identity = require("./prompts/identity"); return _identity; }
function getRulesModule() { if (!_rules) _rules = require("./prompts/rules"); return _rules; }
function getRoutingModule() { if (!_routing) _routing = require("./prompts/routing"); return _routing; }
function getCommunicationModule() { if (!_communication) _communication = require("./prompts/communication"); return _communication; }
function getIntakeModule() { if (!_intake) _intake = require("./prompts/intake"); return _intake; }
function getOnboardingModule() { if (!_onboarding) _onboarding = require("./prompts/onboarding"); return _onboarding; }
function getSurfacesModule() { if (!_surfaces) _surfaces = require("./prompts/surfaces"); return _surfaces; }
function getRegistryContextModule() { if (!_registryContext) _registryContext = require("./buildRegistryContext"); return _registryContext; }

// Rough token estimate: ~4 chars per token
function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

const MAX_TOKEN_BUDGET = 8000;

/**
 * Assemble Alex's full system prompt.
 *
 * @param {Object} options
 * @param {string} options.surface - "business" | "investor" | "developer" | "sandbox" | "privacy" | "contact"
 * @param {string[]} options.activeWorkerSlugs - Slugs of workers the user has active subscriptions for
 * @param {string} options.vertical - Primary vertical (e.g., "real-estate-development")
 * @param {string} options.communicationMode - "concise" | "detailed" | "executive_summary"
 * @param {Object} options.userProfile - { name, role, preferences }
 * @param {Object[]} options.projects - Project/business profiles from Vault
 * @param {Object} options.vaultSummary - Latest data summary from active workers
 * @param {Object[]} options.alerts - Pending cross-worker alerts
 * @param {string} options.alexName - Custom name for Alex (default: "Alex")
 * @param {string} options.alexVoice - Custom voice/personality
 * @param {Object} options.surfaceContext - Additional context for surface overlays (companyKnowledge, raiseTerms, etc.)
 * @returns {string} The assembled system prompt
 */
async function assemblePrompt(options = {}) {
  const {
    surface = "business",
    activeWorkerSlugs = [],
    vertical,
    communicationMode = "detailed",
    userProfile,
    projects,
    vaultSummary,
    alerts,
    alexName = "Alex",
    alexVoice,
    surfaceContext = {},
  } = options;

  // For non-business surfaces, use the surface overlay directly
  if (surface !== "business") {
    return getSurfacesModule().getSurfaceOverlay(surface, surfaceContext);
  }

  const sections = [];

  // 1. Static: Identity
  sections.push(getIdentityModule().getIdentity({ alexName, alexVoice }));

  // 2. Static: Platform rules
  sections.push(getRulesModule().getRules());

  // 3. Static: Communication mode
  sections.push(getCommunicationModule().getCommunicationInstructions(communicationMode));

  // 4. Static: Routing instructions (with active worker list)
  sections.push(getRoutingModule().getRoutingInstructions(activeWorkerSlugs));

  // 5. Static: Intake (if no user profile yet)
  if (!userProfile || !userProfile.role) {
    const availableVerticals = listVerticals().map(v => {
      const cat = loadCatalog(v);
      return cat ? cat.name : v;
    });
    sections.push(getIntakeModule().getIntakeInstructions(availableVerticals));
  }

  // 6. Static: Onboarding instructions
  sections.push(getOnboardingModule().getOnboardingInstructions());

  // 7. Dynamic: Catalog routing index
  if (vertical) {
    const routingIndex = getRoutingIndex(vertical);
    if (routingIndex) {
      sections.push(buildCatalogSection(vertical, routingIndex));
    }
  } else {
    // Multi-vertical: include all available catalogs
    const verticals = listVerticals();
    for (const v of verticals) {
      const routingIndex = getRoutingIndex(v);
      if (routingIndex) {
        sections.push(buildCatalogSection(v, routingIndex));
      }
    }
  }

  // 7b. Dynamic: Live registry context (pricing, promos, guarantees, programs)
  try {
    const registryContext = await getRegistryContextModule().buildRegistryContext({ vertical });
    if (registryContext) sections.push(registryContext);
  } catch (e) {
    // Non-fatal — catalog routing index still provides worker knowledge
  }

  // 8. Dynamic: Active worker details
  if (activeWorkerSlugs.length > 0 && vertical) {
    const details = getActiveWorkerDetails(vertical, activeWorkerSlugs);
    if (details) {
      sections.push(`ACTIVE WORKER DETAILS (your current subscriptions):\n${details}`);
    }
  }

  // 9. Dynamic: User profile
  if (userProfile) {
    sections.push(buildUserProfileSection(userProfile));
  }

  // 10. Dynamic: Project profiles
  if (projects && projects.length > 0) {
    sections.push(buildProjectsSection(projects));
  }

  // 11. Dynamic: Vault summary
  if (vaultSummary) {
    sections.push(buildVaultSummarySection(vaultSummary));
  }

  // 12. Dynamic: Lifecycle position
  if (projects && projects.length > 0 && vertical) {
    const lifecycle = getLifecycle(vertical);
    if (lifecycle.length > 0) {
      sections.push(buildLifecycleSection(projects, lifecycle));
    }
  }

  // 13. Dynamic: Pending alerts
  if (alerts && alerts.length > 0) {
    sections.push(buildAlertsSection(alerts));
  }

  // Token budget enforcement
  return enforceTokenBudget(sections);
}

function buildCatalogSection(vertical, routingIndex) {
  return `WORKER CATALOG — ${vertical.replace(/-/g, " ").toUpperCase()}:
Format: ID|slug|name|phase|type|price|status|capabilities
${routingIndex}`;
}

function buildUserProfileSection(profile) {
  const parts = ["USER PROFILE:"];
  if (profile.name) parts.push(`Name: ${profile.name}`);
  if (profile.role) parts.push(`Role: ${profile.role}`);
  if (profile.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile.communicationMode) parts.push(`Preferred mode: ${profile.communicationMode}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);
  return parts.join("\n");
}

function buildProjectsSection(projects) {
  const parts = ["ACTIVE PROJECTS:"];
  for (const p of projects) {
    const line = `- ${p.name}${p.phase !== undefined ? ` (Phase ${p.phase})` : ""}${p.status ? ` — ${p.status}` : ""}${p.workerCount ? ` — ${p.workerCount} workers active` : ""}${p.monthlyCost ? ` — $${p.monthlyCost}/mo` : ""}`;
    parts.push(line);
  }
  return parts.join("\n");
}

function buildVaultSummarySection(summary) {
  if (typeof summary === "string") return `VAULT SUMMARY:\n${summary}`;
  const parts = ["VAULT SUMMARY:"];
  for (const [workerSlug, data] of Object.entries(summary)) {
    if (typeof data === "string") {
      parts.push(`[${workerSlug}] ${data}`);
    } else if (data.summary) {
      parts.push(`[${workerSlug}] ${data.summary}`);
    }
  }
  return parts.join("\n");
}

function buildLifecycleSection(projects, lifecycle) {
  const parts = ["LIFECYCLE POSITIONS:"];
  for (const p of projects) {
    if (p.phase !== undefined) {
      const phase = lifecycle.find(l => l.phase === p.phase);
      const phaseName = phase ? phase.name : `Phase ${p.phase}`;
      parts.push(`- ${p.name}: ${phaseName} (Phase ${p.phase}/7)`);
    }
  }
  return parts.join("\n");
}

function buildAlertsSection(alerts) {
  const parts = ["PENDING ALERTS:"];
  for (const a of alerts) {
    const severity = a.severity === "critical" ? "CRITICAL" : a.severity === "warning" ? "WARNING" : "INFO";
    parts.push(`[${severity}] ${a.message}${a.relatedWorkers ? ` (${a.relatedWorkers.join(", ")})` : ""}`);
  }
  return parts.join("\n");
}

/**
 * Enforce the token budget by truncating dynamic sections.
 * Priority: alerts > active workers > vault > projects > catalog > intake
 */
function enforceTokenBudget(sections) {
  let assembled = sections.join("\n\n---\n\n");
  let tokens = estimateTokens(assembled);

  if (tokens <= MAX_TOKEN_BUDGET) return assembled;

  // Truncation order: vault summary first, then projects, then catalog routing index
  // Keep: identity, rules, communication, routing, alerts, active worker details
  const truncationTargets = [
    "VAULT SUMMARY:",
    "ACTIVE PROJECTS:",
    "LIFECYCLE POSITIONS:",
    "WORKER CATALOG —",
  ];

  for (const target of truncationTargets) {
    if (tokens <= MAX_TOKEN_BUDGET) break;
    const idx = assembled.indexOf(target);
    if (idx === -1) continue;

    const nextSectionIdx = assembled.indexOf("\n\n---\n\n", idx + 1);
    if (nextSectionIdx === -1) {
      // Last section — truncate to fit
      const remaining = MAX_TOKEN_BUDGET - estimateTokens(assembled.substring(0, idx));
      const maxChars = Math.max(remaining * 4, 200);
      const section = assembled.substring(idx);
      const truncated = section.substring(0, maxChars) + "\n[...truncated for space]";
      assembled = assembled.substring(0, idx) + truncated;
    } else {
      const section = assembled.substring(idx, nextSectionIdx);
      const truncated = section.substring(0, 400) + "\n[...truncated for space]";
      assembled = assembled.substring(0, idx) + truncated + assembled.substring(nextSectionIdx);
    }
    tokens = estimateTokens(assembled);
  }

  return assembled;
}

module.exports = {
  assemblePrompt,
  estimateTokens,
  MAX_TOKEN_BUDGET,
};
