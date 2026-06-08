/**
 * Service module for `law-landuse` worker (LAW-LANDUSE-001).
 *
 * SDK-side declaration: pure functions returning EVENT PROPOSALS. The platform
 * implementation lives in functions/functions/workers/law-landuse-001/ — this
 * module declares the worker's contract for the rules engine and capability
 * review. No side effects, no external calls, no process.env.
 *
 * Inherits CODEX S52.43 Platform RAAS Invariants. Authority + comparable
 * retrieval is EXTERNAL ONLY (EH-01/EH-07) — the model proposes a query; the
 * platform resolver fetches, hashes, version-pins. Never model recall.
 */

export const SERVICE_ID = "law-landuse";

/**
 * Capabilities with real-world consequences. Reviewed by a SOCIII maintainer
 * and wired with KYC gates, role checks, and per-call billing.
 */
export const REQUIRED_CAPABILITIES = [
  "audit.anchor_event_v1", // PLAT-008 receipt per analysis (RULE-03 — no receipt = no analysis)
  "data.attom_property_v1", // parcel context (when standalone / no Site Recon prior)
  "data.authority_resolve_v1", // external code-section retrieval (EH-01) — Municode / state feeds, version-pinned
  "data.comparable_cases_v1", // external comparable-case retrieval (EH-07) — agenda packets / CourtListener / CEQAnet
];

const TIERS = ["Q", "R", "S"];

/**
 * Propose a land-use feasibility analysis. Two-phase: the platform cost gate
 * (RULE-01) + wallet gate (AP-02) blocks execution until the user confirms.
 *
 * @param {Object} input
 * @param {Object} input.parcel - { address, apn, jurisdiction } (from handoff or resolved)
 * @param {string} input.question - free-text or structured land-use question
 * @param {string} [input.personaTier] - "Q" | "R" | "S" (never silently upgraded — TC-120)
 * @param {boolean} [input.confirmCost]
 * @returns {Object} Event proposal or { error }
 */
export function proposeLandUseQuery({ parcel, question, personaTier, confirmCost }) {
  if (!parcel || !parcel.apn || !parcel.jurisdiction) {
    return { error: "parcel.apn and parcel.jurisdiction are required (RULE-01 input validation)" };
  }
  if (!question || typeof question !== "string" || question.trim().length < 3) {
    return { error: "a land-use question is required" };
  }
  const tier = TIERS.includes(personaTier) ? personaTier : "Q";
  return {
    type: "lawLanduse.analysisProposed",
    payload: { parcel, question: question.trim(), personaTier: tier, confirmCost: confirmCost === true },
    requires: ["data.authority_resolve_v1", "data.comparable_cases_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose a handoff to a downstream worker. The catalog discovers valid targets
 * dynamically (accepts-contract substrate, CODEX S52.42) — this only validates
 * shape. Emits feasibility-roadmap/v1 or legal-opinion-bundle/v1.
 */
export function proposeHandoff({ handoffToken, target, bundleShape }) {
  if (!handoffToken || typeof handoffToken !== "string") {
    return { error: "handoffToken is required (issued with each analysis result)" };
  }
  if (!target || typeof target !== "string") {
    return { error: "target worker id is required (resolved from the catalog Send-to dropdown)" };
  }
  const shape = bundleShape || "feasibility-roadmap/v1";
  return {
    type: "lawLanduse.handoffProposed",
    payload: { handoffToken, target, bundleShape: shape },
    requires: ["audit.anchor_event_v1"],
  };
}
