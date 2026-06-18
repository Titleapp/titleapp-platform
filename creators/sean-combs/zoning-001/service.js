/**
 * Service module for `zoning` worker (ZONING-001) — Zoning + Entitlement
 * (consumer side).
 *
 * SDK-side declaration: pure functions returning EVENT PROPOSALS. Platform
 * implementation lives in functions/functions/workers/zoning-001/. No side
 * effects, no external calls, no process.env.
 *
 * Inherits CODEX S52.43. Code-section retrieval is EXTERNAL ONLY (EH-01) — the
 * model proposes a query; citationResolver fetches verbatim text + live URL,
 * hashes it, version-pins it. Consumer-grade simplifier; escalates to
 * LAW-LANDUSE-001 when stakes rise (RULE-05).
 */

export const SERVICE_ID = "zoning";

export const REQUIRED_CAPABILITIES = [
  "audit.anchor_event_v1", // PLAT-008 receipt per verdict (RULE-03)
  "data.attom_zoning_v1", // zoning classification + permitted uses + permits
  "data.citation_resolve_v1", // external code-section retrieval (EH-01) — verbatim text + live URL, version-pinned
  "data.gis_overlays_v1", // SMA/coastal + flood + historic + special-district overlay detection (EH-05)
];

/**
 * Propose a zoning verdict. Two-phase: cost gate (RULE-01) + wallet gate
 * (AP-02) block execution until the user confirms. Accepts the SITE-RECON-001
 * ZONING_UNAVAILABLE flip handoff.
 *
 * @param {Object} input
 * @param {Object} input.parcel - { address, apn, jurisdiction }
 * @param {string} input.question - plain-English "what can I build" question
 * @param {boolean} [input.confirmCost]
 * @returns {Object} Event proposal or { error }
 */
export function proposeZoningQuery({ parcel, question, confirmCost }) {
  if (!parcel || !parcel.apn || !parcel.jurisdiction) {
    return { error: "parcel.apn and parcel.jurisdiction are required (RULE-01 input validation)" };
  }
  if (!question || typeof question !== "string" || question.trim().length < 3) {
    return { error: "a plain-English zoning question is required (e.g. 'can I add an ADU?')" };
  }
  return {
    type: "zoning.verdictProposed",
    payload: { parcel, question: question.trim(), confirmCost: confirmCost === true },
    requires: ["data.attom_zoning_v1", "data.citation_resolve_v1", "data.gis_overlays_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose an escalation / handoff. Emits one of:
 *  - legal-question-bundle/v1 → LAW-LANDUSE-001 ("get a lawyer's opinion", RULE-05)
 *  - permit-intent-bundle/v1  → PERMIT-001-CITIZEN ("file the permit")
 *  - zoning-verdict-bundle/v1 → FEASIBILITY-001 / W-002 ("check feasibility")
 */
export function proposeEscalation({ handoffToken, target, bundleShape }) {
  const SHAPES = ["legal-question-bundle/v1", "permit-intent-bundle/v1", "zoning-verdict-bundle/v1"];
  if (!handoffToken || typeof handoffToken !== "string") {
    return { error: "handoffToken is required (issued with each verdict)" };
  }
  if (!target || typeof target !== "string") {
    return { error: "target worker id is required (resolved from the catalog Send-to dropdown)" };
  }
  const shape = SHAPES.includes(bundleShape) ? bundleShape : "zoning-verdict-bundle/v1";
  return {
    type: "zoning.escalationProposed",
    payload: { handoffToken, target, bundleShape: shape },
    requires: ["audit.anchor_event_v1"],
  };
}
