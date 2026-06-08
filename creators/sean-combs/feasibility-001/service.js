/**
 * Service module for `feasibility` worker (FEASIBILITY-001) — Market &
 * Feasibility Study.
 *
 * SDK-side declaration: pure functions returning EVENT PROPOSALS. Platform
 * implementation lives in functions/functions/workers/feasibility-001/. No
 * side effects, no external calls, no process.env.
 *
 * Inherits CODEX S52.43. Comp retrieval is EXTERNAL ONLY (EH-01/EH-07) — the
 * model proposes a query; compsResolver fetches, hashes, version-pins. NOT
 * financial underwriting (that is W-002) — this is the demand/supply/comps
 * market study.
 */

export const SERVICE_ID = "feasibility";

export const REQUIRED_CAPABILITIES = [
  "audit.anchor_event_v1", // PLAT-008 receipt per study (RULE-03) — Deposition Rule load-bearing
  "data.census_acs_v1", // demographics (income, age, household, tenure) — free
  "data.comps_resolve_v1", // external rent/sale comp retrieval (EH-07) — ATTOM/MLS, provenance per comp
  "data.supply_pipeline_v1", // local planning-dept entitlement records + user upload (Reagan Rule)
];

const TIERS = ["Q", "R", "S"];

/**
 * Propose a market & feasibility study. Two-phase: cost gate (RULE-01) +
 * wallet gate (AP-02) block execution until the user confirms.
 *
 * @param {Object} input
 * @param {Object} input.parcel - { address, apn, jurisdiction }
 * @param {Object} input.proposedProduct - { units, unitMix, productType, targetRents? }
 * @param {string} [input.tier] - "Q" | "R" | "S"
 * @param {boolean} [input.confirmCost]
 * @returns {Object} Event proposal or { error }
 */
export function proposeMarketStudy({ parcel, proposedProduct, tier, confirmCost }) {
  if (!parcel || !parcel.apn || !parcel.jurisdiction) {
    return { error: "parcel.apn and parcel.jurisdiction are required (RULE-01 input validation)" };
  }
  if (!proposedProduct || !proposedProduct.productType || !(Number(proposedProduct.units) > 0)) {
    return { error: "proposedProduct.productType and a positive units count are required" };
  }
  const personaTier = TIERS.includes(tier) ? tier : "Q";
  return {
    type: "feasibility.studyProposed",
    payload: { parcel, proposedProduct, tier: personaTier, confirmCost: confirmCost === true },
    requires: ["data.census_acs_v1", "data.comps_resolve_v1", "data.supply_pipeline_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose a handoff. Emits market-snapshot/v1 (Q) | feasibility-study/v1 (R) |
 * investment-market-study/v1 (S) to W-002 / PERMIT-001 / LAW-LANDUSE. Accepts
 * optional reverse-handoff underwriting-model/v1 from W-002.
 */
export function proposeHandoff({ handoffToken, target, bundleShape }) {
  const SHAPES = ["market-snapshot/v1", "feasibility-study/v1", "investment-market-study/v1"];
  if (!handoffToken || typeof handoffToken !== "string") {
    return { error: "handoffToken is required (issued with each study)" };
  }
  if (!target || typeof target !== "string") {
    return { error: "target worker id is required (resolved from the catalog Send-to dropdown)" };
  }
  const shape = SHAPES.includes(bundleShape) ? bundleShape : "feasibility-study/v1";
  return {
    type: "feasibility.handoffProposed",
    payload: { handoffToken, target, bundleShape: shape },
    requires: ["audit.anchor_event_v1"],
  };
}
