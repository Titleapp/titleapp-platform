/**
 * Service module for `site-recon` worker (SITE-RECON-001).
 *
 * SDK-side declaration: pure functions returning EVENT PROPOSALS. The
 * platform implementation lives in functions/functions/workers/site-recon-001/
 * — this module declares the worker's contract for the rules engine and
 * capability review. No side effects, no external calls, no process.env.
 */

export const SERVICE_ID = "site-recon";

/**
 * Capabilities with real-world consequences. Reviewed by a SOCIII
 * maintainer and wired with KYC gates, role checks, and per-call billing.
 */
export const REQUIRED_CAPABILITIES = [
  "audit.anchor_event_v1", // PLAT-008 receipt per pull (RULE-03 — no receipt = no pull)
  "data.attom_property_v1", // billed property pulls ($6/parcel user-side)
  "data.gis_overlays_v1", // FEMA/CCC/NRHP/OZ point-in-polygon evaluations
];

/**
 * Propose a single-address parcel search. Two-phase: the platform's cost
 * gate (RULE-01) blocks execution until the user confirms the projection.
 *
 * @param {Object} input
 * @returns {Object} Event proposal or { error }
 */
export function proposeParcelSearch({ address, confirmCost }) {
  if (!address || typeof address !== "string" || !address.includes(",")) {
    return { error: 'address is required, e.g. "9708 US Highway 191, Pinedale, WY 82941"' };
  }
  return {
    type: "siteRecon.parcelSearchProposed",
    payload: { address: address.trim(), confirmCost: confirmCost === true },
    requires: ["data.attom_property_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose an area search (radius or polygon → ranked list, RULE-08 cap 50).
 */
export function proposeAreaSearch({ area, limit, confirmCost }) {
  if (!area || !["radius", "polygon"].includes(area.type)) {
    return { error: 'area.type must be "radius" or "polygon"' };
  }
  const cappedLimit = Math.min(Math.max(1, Number(limit) || 10), 50);
  return {
    type: "siteRecon.areaSearchProposed",
    payload: { area, limit: cappedLimit, confirmCost: confirmCost === true },
    requires: ["data.attom_property_v1", "data.gis_overlays_v1", "audit.anchor_event_v1"],
  };
}

/**
 * Propose a W-002 handoff for a ranked parcel (Green or Yellow rows).
 */
export function proposeHandoff({ handoffToken, apn }) {
  if (!handoffToken || typeof handoffToken !== "string") {
    return { error: "handoffToken is required (issued with each search result)" };
  }
  if (!apn || typeof apn !== "string" || apn.length < 5) {
    return { error: "apn is required — the county parcel number from the ranked list" };
  }
  return {
    type: "siteRecon.w002HandoffProposed",
    payload: { handoffToken, apn: apn.trim() },
    requires: ["audit.anchor_event_v1"],
  };
}
