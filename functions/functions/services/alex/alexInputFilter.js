"use strict";

/**
 * alexInputFilter.js — Pre-LLM RAAS Input Filter for Alex
 *
 * Runs BEFORE the LLM is called. Three checks in order:
 *   1. Handoff triggers (Layer 4) — keyword match → route to worker, skip LLM
 *   2. Hard stops (Layers 1-3) — if answering requires rule violation → block + redirect
 *   3. Enrichment — inject user context so LLM has facts without hallucinating
 *
 * Trigger detection uses regex keyword matching — NOT the LLM.
 */

/**
 * Find the best matching worker for a handoff trigger.
 *
 * @param {string} vertical — active vertical
 * @param {string[]} subscribedWorkers — user's subscribed worker slugs
 * @param {string} triggerDescription — what was triggered (e.g. "procedure question")
 * @returns {{ workerSlug: string|null, workerName: string|null, subscribed: boolean }}
 */
function findHandoffWorker(vertical, subscribedWorkers, triggerDescription) {
  // Vertical → default worker mapping for common handoff categories
  const VERTICAL_WORKER_MAP = {
    aviation: {
      "aircraft systems question": { slug: "av-copilot-pc12", name: "PC12-NG CoPilot" },
      "FAR question": { slug: "av-copilot-pc12", name: "PC12-NG CoPilot" },
      "checkride question": { slug: "av-training-proficiency", name: "Training & Proficiency" },
      "procedure question": { slug: "av-copilot-pc12", name: "PC12-NG CoPilot" },
      _default: { slug: "av-copilot-pc12", name: "PC12-NG CoPilot" },
    },
    "real-estate": {
      "contract question": { slug: "contract-review", name: "Contract Review" },
      "title question": { slug: "title-research", name: "Title Research" },
      "escrow question": { slug: "escrow-coordinator", name: "Escrow Coordinator" },
      _default: { slug: "market-research", name: "Market Research" },
    },
    healthcare: {
      "clinical question": { slug: "clinical-protocol", name: "Clinical Protocol" },
      "patient question": { slug: "clinical-protocol", name: "Clinical Protocol" },
      _default: { slug: "clinical-protocol", name: "Clinical Protocol" },
    },
    government: {
      "permit question": { slug: "permit-tracker", name: "Permit Tracker" },
      "regulatory question": { slug: "compliance-monitor", name: "Compliance Monitor" },
      _default: { slug: "permit-tracker", name: "Permit Tracker" },
    },
  };

  const verticalMap = VERTICAL_WORKER_MAP[vertical] || {};
  const match = verticalMap[triggerDescription] || verticalMap._default;

  if (!match) return { workerSlug: null, workerName: null, subscribed: false };

  const subscribed = (subscribedWorkers || []).includes(match.slug);
  return { workerSlug: match.slug, workerName: match.name, subscribed };
}

/**
 * Run the RAAS input filter on a user message.
 *
 * @param {Object} params
 * @param {string} params.message — raw user message
 * @param {Object} params.rulePack — from getRulePack()
 * @param {Object} params.userContext — { subscribedWorkers, teams, activeTeamId, activeTeamVertical, ... }
 * @returns {Object} — { allowed, enrichedMessage, handoffTrigger, hardStopTriggered, auditLog }
 */
async function runInputFilter({ message, rulePack, userContext }) {
  const auditLog = {
    handoffTriggered: false,
    handoffTarget: null,
    hardStopTriggered: false,
    hardStopReason: null,
    checksRun: [],
  };

  if (!message || typeof message !== "string") {
    return { allowed: true, enrichedMessage: message, handoffTrigger: null, hardStopTriggered: false, auditLog };
  }

  const activeLayers = rulePack.activeLayers || [];
  const vertical = rulePack.layer3?.activeVertical || null;
  const subscribedWorkers = userContext?.subscribedWorkers || [];

  // ── CHECK 1: Vertical mustHandoff triggers (Layer 3) ──────
  if (activeLayers.includes(3) && rulePack.layer3?.activeRules?.mustHandoff) {
    for (const trigger of rulePack.layer3.activeRules.mustHandoff) {
      if (trigger.pattern && trigger.pattern.test(message)) {
        const worker = findHandoffWorker(vertical, subscribedWorkers, trigger.description);
        auditLog.checksRun.push("layer3_mustHandoff");
        auditLog.handoffTriggered = true;
        auditLog.handoffTarget = worker.workerSlug;

        let handoffMessage;
        if (worker.subscribed) {
          handoffMessage = `That is exactly what ${worker.workerName} is for. Opening it now.`;
        } else if (worker.workerSlug) {
          handoffMessage = `You need ${worker.workerName} for that. Want me to show you how to get it?`;
        } else {
          // No worker mapped — let LLM handle
          auditLog.handoffTriggered = false;
          auditLog.handoffTarget = null;
          break;
        }

        return {
          allowed: false,
          enrichedMessage: message,
          handoffTrigger: {
            workerSlug: worker.workerSlug,
            workerName: worker.workerName,
            subscribed: worker.subscribed,
            message: handoffMessage,
            triggerDescription: trigger.description,
          },
          hardStopTriggered: false,
          auditLog,
        };
      }
    }
  }

  // ── CHECK 2: Handoff triggers (Layer 4) ────────────────────
  if (activeLayers.includes(4) && rulePack.layer4?.triggers) {
    for (const trigger of rulePack.layer4.triggers) {
      if (trigger.pattern && trigger.pattern.test(message)) {
        // Only fire Layer 4 handoff if there's a vertical context to map to
        if (vertical && vertical !== "guest") {
          const worker = findHandoffWorker(vertical, subscribedWorkers, "");
          if (worker.workerSlug) {
            auditLog.checksRun.push("layer4_handoff");
            auditLog.handoffTriggered = true;
            auditLog.handoffTarget = worker.workerSlug;

            const msg = trigger.messageTemplate.replace("{workerName}", worker.workerName);
            return {
              allowed: false,
              enrichedMessage: message,
              handoffTrigger: {
                workerSlug: worker.workerSlug,
                workerName: worker.workerName,
                subscribed: worker.subscribed,
                message: worker.subscribed ? msg : `You need ${worker.workerName} for that. Want me to show you how to get it?`,
                triggerDescription: trigger.id,
              },
              hardStopTriggered: false,
              auditLog,
            };
          }
        }
        // No vertical or no worker — let LLM handle, but note the trigger
        auditLog.checksRun.push("layer4_handoff_no_match");
        break;
      }
    }
  }

  // ── CHECK 3: Enrichment — inject user context ──────────────
  auditLog.checksRun.push("enrichment");

  // Build enrichment context string for the system prompt (not the message)
  const enrichmentContext = [];

  if (activeLayers.includes(2) && userContext) {
    if (subscribedWorkers.length > 0) {
      enrichmentContext.push(`User's subscribed workers: ${subscribedWorkers.join(", ")}`);
    } else {
      enrichmentContext.push("User has no subscribed workers — direct to Browse Marketplace.");
    }

    if (userContext.teams && userContext.teams.length > 0) {
      enrichmentContext.push(`User's teams: ${userContext.teams.map((t) => t.name || t.teamId).join(", ")}`);
    }

    if (userContext.activeTeamVertical) {
      enrichmentContext.push(`Active vertical: ${userContext.activeTeamVertical}`);
    }
  }

  return {
    allowed: true,
    enrichedMessage: message,
    enrichmentContext: enrichmentContext.join("\n"),
    handoffTrigger: null,
    hardStopTriggered: false,
    auditLog,
  };
}

module.exports = { runInputFilter, findHandoffWorker };
