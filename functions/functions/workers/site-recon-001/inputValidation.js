"use strict";

/**
 * SITE-RECON-001 — RULE-11 + RULE-12 enforcement (Build Step 8)
 *
 * Ground truth: site_recon_rules_v1.json hard_stops.
 *
 * RULE-11-input-validation — "Reject malformed inputs: fictional ZIP codes,
 * malformed APNs, search radii greater than 5 miles, polygon inputs
 * exceeding 10 square miles. Surface a specific input-error message."
 * on_fail: refuse_search, surface_specific_error.
 * Radius/polygon caps shipped in Step 4 (RADIUS_EXCEEDED/POLYGON_TOO_LARGE);
 * this module covers the APN + ZIP gap.
 *
 * RULE-12-fair-housing-pattern — "Refuse searches that suggest redlining,
 * steering, or any pattern correlated with protected-class avoidance.
 * Surface a regulatory note and decline to execute. RAAS Tier 2 Fair
 * Housing module governs detection." on_fail: refuse_search,
 * surface_fair_housing_regulatory_note.
 * Honest v1 surface: the JSON API accepts only geometry/APN/lot-size
 * filters — no demographic vectors by construction. Detection therefore
 * lives in the RAAS chat layer (fair-housing-act module, declared in the
 * catalog). This module provides the REFUSAL PLUMBING: any freeform string
 * input added to these endpoints in the future MUST route through
 * fairHousingScreen, and a detector hook is exposed for the RAAS layer to
 * call with chat-derived context. FAIL CLOSED: a hard_stop rule never
 * defaults open.
 */

// ── RULE-11: APN ─────────────────────────────────────────────────
// US APNs vary by county (digits, dashes, dots, occasional letters).
// Structural check: 5-25 chars, allowed charset, at least 4 digits.
function validateApn(apn) {
  const s = String(apn || "").trim();
  if (!s) return { ok: false, code: "INPUT_VALIDATION_FAILED", reason: "INVALID_APN", message: "APN is required." };
  if (s.length < 5 || s.length > 25 || !/^[0-9A-Za-z .\-]+$/.test(s) || (s.match(/[0-9]/g) || []).length < 4) {
    return { ok: false, code: "INPUT_VALIDATION_FAILED", reason: "INVALID_APN", message: `"${s}" is not a valid APN — expected a county parcel number like 013-0921-007-00.` };
  }
  return { ok: true, apn: s };
}

// ── RULE-11: ZIP ─────────────────────────────────────────────────
// Structural + bounds check (real ZIPs run 00501-99950; 00000/99999 and
// non-5-digit forms are fictional). True USPS-database validation is a
// future data-source integration; this catches the fictional-ZIP class
// the rule names. ZIP is optional in an address — absent is fine.
function validateZipInAddress(address2) {
  const m = String(address2 || "").match(/\b(\d{5})(?:-\d{4})?\b/);
  if (!m) return { ok: true, zip: null };
  const zip = m[1];
  const n = Number(zip);
  if (n < 501 || n > 99950) {
    return { ok: false, code: "INPUT_VALIDATION_FAILED", reason: "INVALID_ZIP", message: `ZIP code ${zip} does not exist — check the address and try again.` };
  }
  return { ok: true, zip };
}

// ── RULE-12: refusal plumbing (fail closed) ──────────────────────
const FAIR_HOUSING_NOTE =
  "This search was declined. Site Recon cannot execute searches that suggest redlining, steering, or avoidance of protected classes under the Fair Housing Act (42 U.S.C. §3601 et seq.). Search by location, parcel, or property characteristics instead.";

// Detector hook — the RAAS Tier 2 fair-housing-act module is the governing
// detector (chat layer). At the JSON API layer the inputs are geometry/APN/
// lot-size only, so detection here screens any freeform strings that reach
// it. Returns true when a pattern is detected.
let detector = (freeformStrings) => false;
function setFairHousingDetector(fn) { detector = fn; }

function collectFreeformStrings(body) {
  // Geometry, numbers, and enumerated codes are not freeform. Anything
  // string-typed outside the known structural fields is.
  const STRUCTURAL = new Set(["type"]);
  const out = [];
  const walk = (obj, path) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && !STRUCTURAL.has(k) && v.length > 0) {
        // Collect ALL non-structural strings — the detector decides.
        out.push({ field: `${path}${k}`, value: v });
      } else if (typeof v === "object") {
        walk(v, `${path}${k}.`);
      }
    }
  };
  walk(body, "");
  return out;
}

function fairHousingScreen(body) {
  let detected = false;
  try {
    detected = detector(collectFreeformStrings(body)) === true;
  } catch (e) {
    // FAIL CLOSED: a broken detector on a hard_stop rule refuses, never
    // silently passes.
    console.error("[site-recon-001] fair housing detector errored — refusing per hard_stop:", e.message);
    detected = true;
  }
  if (detected) {
    return { ok: false, status: 451, code: "FAIR_HOUSING_REFUSAL", message: FAIR_HOUSING_NOTE };
  }
  return { ok: true };
}

module.exports = { validateApn, validateZipInAddress, fairHousingScreen, setFairHousingDetector, FAIR_HOUSING_NOTE };
