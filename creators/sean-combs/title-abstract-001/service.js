/**
 * Service module for `title-abstract` worker (TITLE-ABSTRACT-001).
 *
 * SDK-side declaration: pure functions returning EVENT PROPOSALS. Platform
 * implementation lives in functions/functions/workers/title-abstract-001/.
 * No side effects, no external calls, no process.env.
 *
 * Inherits CODEX S52.43. Recorded-instrument retrieval is EXTERNAL ONLY
 * (EH-01) — the model proposes a query; instrumentResolver fetches the record,
 * hashes it, version-pins it. NOT an insured-title product (RULE-02).
 */

export const SERVICE_ID = "title-abstract";

export const REQUIRED_CAPABILITIES = [
  "audit.anchor_event_v1", // PLAT-008 compound-DTC receipt per Abstract (RULE-03)
  "data.attom_property_v1", // property / sales / tax pulls
  "data.instrument_resolve_v1", // county recorder/clerk recorded-document retrieval (EH-01) — hashed, version-pinned
  "data.rights_stratum_v1", // air/spectrum/water/carbon/mineral/oil-gas/digital resolution + severance detection
];

const TIERS = ["Q", "R", "S"];

/**
 * Propose a Title Abstract assembly. Two-phase: cost gate (RULE-01) + wallet
 * gate (AP-02) block execution until the user confirms the projection.
 *
 * @param {Object} input
 * @param {Object} input.parcel - { address, apn, jurisdiction }
 * @param {string} [input.tier] - "Q" | "R" | "S"
 * @param {boolean} [input.confirmCost]
 * @returns {Object} Event proposal or { error }
 */
export function proposeAbstract({ parcel, tier, confirmCost }) {
  if (!parcel || !parcel.apn || !parcel.jurisdiction) {
    return { error: "parcel.apn and parcel.jurisdiction are required (RULE-01 input validation)" };
  }
  const personaTier = TIERS.includes(tier) ? tier : "Q";
  return {
    type: "titleAbstract.abstractProposed",
    payload: { parcel, tier: personaTier, confirmCost: confirmCost === true },
    requires: ["data.attom_property_v1", "data.instrument_resolve_v1", "data.rights_stratum_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose a single-section refresh without re-anchoring the full Abstract.
 * (Snapshot-first in v1; refresh is v1.1 — stubbed here for contract shape.)
 */
export function proposeSectionRefresh({ abstractId, section, confirmCost }) {
  const SECTIONS = ["ownership-chain", "encumbrances", "recorded-docs", "rights-stack"];
  if (!abstractId || typeof abstractId !== "string") {
    return { error: "abstractId is required (issued with each Abstract)" };
  }
  if (!SECTIONS.includes(section)) {
    return { error: `section must be one of: ${SECTIONS.join(", ")}` };
  }
  return {
    type: "titleAbstract.sectionRefreshProposed",
    payload: { abstractId, section, confirmCost: confirmCost === true },
    requires: ["data.attom_property_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose a handoff. Emits title-abstract-bundle/v1 to LAW-LANDUSE / ZONING /
 * FEASIBILITY / W-002. Catalog discovers valid targets (CODEX S52.42).
 */
export function proposeHandoff({ handoffToken, target }) {
  if (!handoffToken || typeof handoffToken !== "string") {
    return { error: "handoffToken is required (issued with each Abstract)" };
  }
  if (!target || typeof target !== "string") {
    return { error: "target worker id is required (resolved from the catalog Send-to dropdown)" };
  }
  return {
    type: "titleAbstract.handoffProposed",
    payload: { handoffToken, target, bundleShape: "title-abstract-bundle/v1" },
    requires: ["audit.anchor_event_v1"],
  };
}
