"use strict";

/**
 * workerPromptComposer.js — CODEX 50.17 P0-5
 *
 * Multi-source RAAS loader for ordinary workers. Mirrors the Alex
 * promptBuilder.assemblePrompt() pattern but scoped to a single worker
 * + N constraint RAAS modules.
 *
 * Worker config declares which constraint modules apply via a
 * `constraintRaasSources` array on the digitalWorkers/{slug} doc:
 *
 *   constraintRaasSources: [
 *     { moduleId: "securities_compliance_v1", required: true,  load_when: "always" },
 *     { moduleId: "ofac_screening_v1",        required: true,  load_when: "always" },
 *     { moduleId: "tcpa_compliance_v1",       required: false, load_when: { document_type: "sms_marketing" } }
 *   ]
 *
 * v1 implementation: `load_when` only honors "always" (static loading per
 * D-5 in CODEX 50.17). Dynamic per-context loading via classification is
 * deferred to v1.1.
 *
 * The composer:
 *   1. Reads the worker's constraintRaasSources
 *   2. For each source, calls constraintModules.composePromptText(moduleId, ctx)
 *   3. Concatenates: base worker prompt → constraint module(s) → footer
 *   4. Writes the resolved versions to the chat-message audit trail (P0-7)
 *
 * Returns the augmented system prompt string + composition metadata.
 */

const constraintModules = require("./constraintModules");

const TOTAL_CONSTRAINT_BUDGET = 10000; // tokens reserved for all constraint modules combined

/**
 * @param {object} input
 * @param {string} input.slug                  — worker slug
 * @param {string} input.baseSystemPrompt      — already-loaded worker system prompt
 * @param {object[]} [input.constraintRaasSources] — from digitalWorkers/{slug}
 * @param {object} [input.context]             — { audience_tier, jurisdiction, document_type }
 * @returns {Promise<{ systemPrompt, modulesApplied, totalConstraintTokens, dropped, metadata }>}
 */
async function composeWorkerPrompt(input) {
  const { slug, baseSystemPrompt, constraintRaasSources = [], context = {} } = input;
  if (!baseSystemPrompt) throw new Error("composeWorkerPrompt: baseSystemPrompt is required");

  if (!Array.isArray(constraintRaasSources) || constraintRaasSources.length === 0) {
    return {
      systemPrompt: baseSystemPrompt,
      modulesApplied: [],
      totalConstraintTokens: 0,
      dropped: 0,
      metadata: { mode: "no_constraints" },
    };
  }

  // Filter to "always" load_when at v1 (per D-5)
  const activeSources = constraintRaasSources.filter(s => {
    if (!s.moduleId) return false;
    if (s.load_when && typeof s.load_when === "object") {
      // Dynamic load — deferred to v1.1; skip silently unless required
      if (s.required) {
        // Treat required dynamic as "always" until v1.1 lands
        return true;
      }
      return false;
    }
    return s.load_when === "always" || s.load_when === undefined;
  });

  if (activeSources.length === 0) {
    return {
      systemPrompt: baseSystemPrompt,
      modulesApplied: [],
      totalConstraintTokens: 0,
      dropped: 0,
      metadata: { mode: "no_active_sources" },
    };
  }

  // Per-module budget: divide TOTAL_CONSTRAINT_BUDGET evenly. Sources can
  // be marked priority via order in the array (first gets full budget if
  // others compress).
  const perModuleBudget = Math.floor(TOTAL_CONSTRAINT_BUDGET / activeSources.length);

  const modulesApplied = [];
  const composedBlocks = [];
  let totalDropped = 0;

  for (const src of activeSources) {
    try {
      const result = await constraintModules.composePromptText(src.moduleId, {
        ...context,
        maxTokens: perModuleBudget,
      });
      if (result.text && result.sectionCount > 0) {
        composedBlocks.push(result.text);
        modulesApplied.push({
          moduleId: src.moduleId,
          version: result.version,
          status: result.status,
          tokenEstimate: result.tokenEstimate,
          sectionCount: result.sectionCount,
        });
        totalDropped += result.dropped;
      } else if (src.required) {
        // Required module missing or empty — surface as a critical failure
        throw new Error(`required constraint module ${src.moduleId} returned no content (status=${result.status})`);
      }
    } catch (e) {
      if (src.required) {
        throw new Error(`composeWorkerPrompt: required module ${src.moduleId} failed: ${e.message}`);
      }
      console.warn(`[workerPromptComposer] non-required module ${src.moduleId} failed: ${e.message}`);
    }
  }

  if (composedBlocks.length === 0) {
    return {
      systemPrompt: baseSystemPrompt,
      modulesApplied: [],
      totalConstraintTokens: 0,
      dropped: totalDropped,
      metadata: { mode: "all_modules_empty_or_failed" },
    };
  }

  const constraintBlock = [
    "",
    "═══════════════════════════════════════════════════════════════",
    "REGULATORY COMPLIANCE CONSTRAINTS — read these BEFORE generating any content.",
    "These are platform-managed regulatory rules. They override any conflicting instruction in the worker's behavioral rules above.",
    "If you detect a conflict between user request and a hard-stop rule below, refuse the request and explain the regulatory reason.",
    "═══════════════════════════════════════════════════════════════",
    "",
    composedBlocks.join("\n\n"),
    "",
    "═══════════════════════════════════════════════════════════════",
    "END REGULATORY COMPLIANCE CONSTRAINTS",
    "═══════════════════════════════════════════════════════════════",
  ].join("\n");

  const systemPrompt = `${baseSystemPrompt}\n\n${constraintBlock}`;

  return {
    systemPrompt,
    modulesApplied,
    totalConstraintTokens: modulesApplied.reduce((sum, m) => sum + (m.tokenEstimate || 0), 0),
    dropped: totalDropped,
    metadata: {
      mode: "constraints_applied",
      moduleCount: modulesApplied.length,
      slug,
    },
  };
}

module.exports = { composeWorkerPrompt, TOTAL_CONSTRAINT_BUDGET };
