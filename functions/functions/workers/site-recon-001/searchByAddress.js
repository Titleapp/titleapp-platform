"use strict";

/**
 * SITE-RECON-001 — searchByAddress (Build Step 1: ATTOM integration)
 *
 * POST /v1/workers/site-recon-001/search-by-address
 * Input: { address: string, confirmCost: boolean }
 *
 * Two-phase cost gate (spec RULE-01 — cost gate is non-negotiable):
 *   Phase 1 (confirmCost !== true): quote via quoteDataFee, return projection, stop.
 *   Phase 2 (confirmCost === true): pull ATTOM property detail + sales history +
 *     AVM, record the data fee, score the bundle via scoreFeasibility (Step 2),
 *     return { parcel, feasibility }.
 *
 * Step 3 (RULE-03 — no receipt = no pull): every successful pull anchors a
 * receipt to the PLAT-008 audit trail via auditTrailService.writeAuditRecord.
 * Anchor failure rolls back the response (503 AUDIT_ANCHOR_FAILED); the
 * billing fee stays recorded as an orphan fee, logged grep-able for
 * reconciliation.
 *
 * Not yet wired (later build steps per spec v1.1):
 *   - Vault DTC logbook entry per pull — Step TBD
 *   - Full input validation: APN format, radius, polygon (RULE-11) — Step TBD
 *   - Fair Housing pattern screen (RULE-12) — Step TBD
 *   - GIS overlays (coastal/historic/FEMA/OZ) feeding scoring — Step TBD
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { quoteDataFee, recordDataFee } = require("../../services/billing/dataFee");
const { scoreFeasibility } = require("./scoreFeasibility");
const { sha256 } = require("../../services/signatureService/blockchain");
const { pullParcelBundle } = require("./attomClient");
// Namespace requires (not destructured) so smoke tests can stub per-case.
const auditTrail = require("../../services/auditTrailService");
const gis = require("./gisOverlayService");

const SOURCE = "attom:property"; // registered in dataFee.js SOURCE_REGISTRY ($3 actual × 2.0 markup)
const WORKER_ID = "site-recon-001";
const SPEC_VERSION = "SITE-RECON-001-v1.1";

// ── PLAT-008 composition hash — computed ONCE at module load ────
// The receipt records which ruleset governed this pull. Read + hash the
// ruleset file a single time; never re-read per request.
const RULESET_PATH = path.join(__dirname, "../../raas/rulesets/site_recon_rules_v1.json");
let RULESET_HASH = null;
try {
  RULESET_HASH = sha256(fs.readFileSync(RULESET_PATH, "utf8"));
} catch (e) {
  // A receipt that hashes nothing defends nothing — fail loud in logs.
  // Anchor writes still proceed (rulesetHash: null is visible in the receipt).
  console.error(`[${WORKER_ID}] ruleset hash unavailable:`, e.message);
}

// ── Address parsing ──────────────────────────────────────────────
// ATTOM wants address1 (street) + address2 (city/state). v1: split on
// the first comma. RULE-11 full validation (APN, radius, polygon) lands
// in a later step; for now reject empty/unsplittable input with a
// specific error per the rule's spirit.
function parseAddress(raw) {
  const s = String(raw || "").trim();
  if (!s) return { error: "Address is required." };
  const idx = s.indexOf(",");
  if (idx < 1 || idx === s.length - 1) {
    return { error: 'Address must include street and city/state, e.g. "3241 Market Street, Oakland, CA 94608".' };
  }
  return {
    address1: s.slice(0, idx).trim(),
    address2: s.slice(idx + 1).trim(),
  };
}

/**
 * Route handler. index.js does auth + ctx extraction and delegates here.
 *
 * @param {object} req  Express request
 * @param {object} res  Express response
 * @param {object} deps { body, ctx, jsonError } — ctx from getCtx(): { tenantId, userId, email }
 */
async function searchByAddress(req, res, { body, ctx, jsonError }) {
  const parsed = parseAddress(body.address);
  if (parsed.error) return jsonError(res, 400, parsed.error, { code: "INVALID_ADDRESS" });

  // One address = one property report = 1 billable unit.
  const units = 1;

  // ── Phase 1: cost projection (RULE-01 — never pull without it) ──
  const quote = await quoteDataFee({ source: SOURCE, units, userId: ctx.userId });

  if (body.confirmCost !== true) {
    return res.json({
      ok: true,
      phase: "quote",
      worker: WORKER_ID,
      estimatedCost: quote.costBilledCents / 100,
      breakdown: {
        attomCostUsd: quote.costActualCents / 100,
        sociiiMarkupUsd: (quote.costBilledCents - quote.costActualCents) / 100,
        totalFeeUsd: quote.costBilledCents / 100,
      },
      tier: quote.tier,
      message: quote.message,
      next: "Re-submit with confirmCost: true to execute the pull.",
    });
  }

  if (quote.blocked) {
    return jsonError(res, 402, quote.message, { code: "BELOW_MINIMUM_BALANCE" });
  }

  // ── Phase 2: execute the ATTOM pull ──────────────────────────────
  const apiKey = process.env.ATTOM_API_KEY || "";
  if (!apiKey) return jsonError(res, 500, "ATTOM API key not configured", { code: "ATTOM_KEY_MISSING" });

  const params = { address1: parsed.address1, address2: parsed.address2 };
  // detail = assessor + owner of record + APN; salesHistory raw; AVM valuation
  const { propertyDetail, salesHistory, avm } = await pullParcelBundle(params, apiKey);

  // ── Record the data fee (universal data-credit billing — non-negotiable).
  // recordDataFee is non-fatal by design; billing never blocks the response.
  const fee = await recordDataFee({
    source: SOURCE,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    units,
    requestedBy: `${WORKER_ID}:search-by-address`,
    metadata: { address1: parsed.address1, address2: parsed.address2 },
  });

  // ── GIS overlays (Step 5 — feeds the RED conditions + flood/OZ flags) ──
  const prop0 = propertyDetail?.data?.property?.[0];
  const overlays = await gis.getOverlays(
    {
      lat: Number(prop0?.location?.latitude ?? NaN),
      lng: Number(prop0?.location?.longitude ?? NaN),
      state: prop0?.address?.countrySubd || (parsed.address2.match(/\b([A-Z]{2})\b/) || [])[1] || null,
      apn: prop0?.identifier?.apn || null,
    },
    ctx
  );

  // ── Score the bundle (Step 2 — RULE-04..07, RULE-13) ────────────
  const attom = { propertyDetail, salesHistory, avm };
  const feasibility = scoreFeasibility(attom, { overlays });

  // ── Anchor the pull to PLAT-008 (Step 3 — RULE-03, non-negotiable) ──
  const attomId = prop0?.identifier?.attomId ?? null;
  const pulledAt = new Date().toISOString();
  const receiptMetadata = {
    parcelRef: { address1: parsed.address1, address2: parsed.address2, attomId },
    // Step 5 additive: overlay state at scoring time (spec §8 overlay_layer_state)
    overlays: {
      floodZone: overlays.floodZone,
      coastalCommission: overlays.coastalCommission,
      historicDistrict: overlays.historicDistrict,
      opportunityZone: overlays.opportunityZone,
      evaluated: overlays.evaluated,
      errors: overlays.errors,
    },
    feasibility: {
      verdict: feasibility.verdict,
      namedBlocker: feasibility.namedBlocker,
      blockerCode: feasibility.blockerCode,
      confidenceScore: feasibility.confidenceScore,
      flags: feasibility.flags,
    },
    feeEventId: fee.eventId || null,
    composition: { spec: SPEC_VERSION, rulesetHash: RULESET_HASH },
  };
  // Pull-id per spec §8: PLAT-008-YYYYMMDD-<parcel ref>
  const eventId = `PLAT-008-${pulledAt.slice(0, 10).replace(/-/g, "")}-${String(attomId || parsed.address1).replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40)}`;

  let anchor;
  try {
    anchor = await auditTrail.writeAuditRecord({
      event_id: eventId,
      worker_id: WORKER_ID,
      user_id: ctx.userId,
      org_id: ctx.tenantId,
      execution_type: "site-recon:property-pull",
      timestamp: pulledAt,
      metadata: receiptMetadata,
    });
  } catch (anchorErr) {
    // RULE-03 on_fail: rollback_pull. Never proceed without a receipt; the
    // fee already recorded becomes an orphan, logged grep-able for
    // reconciliation.
    console.error("[orphan_fee]", {
      feeEventId: fee.eventId || null,
      parcelRef: receiptMetadata.parcelRef,
      error: anchorErr.message,
    });
    return res.status(503).json({
      ok: false,
      code: "AUDIT_ANCHOR_FAILED",
      phase: "anchor",
      parcel: receiptMetadata.parcelRef,
      feasibility: receiptMetadata.feasibility,
      feeEventId: fee.eventId || null,
      message: "Pull succeeded but audit anchor failed. Result not persisted. Fee charged — contact support for reconciliation.",
    });
  }

  // ── Cache + handoff token (Step 7 — single-parcel handoff path) ──
  const apnVal = prop0?.identifier?.apn || attomId || parsed.address1;
  const apnKey = String(apnVal).replace(/[^A-Za-z0-9_.-]+/g, "-").slice(0, 200);
  const parcelRender = {
    apn: prop0?.identifier?.apn || null,
    attomId,
    address1: parsed.address1,
    address2: parsed.address2,
    lat: Number(prop0?.location?.latitude ?? NaN) || null,
    lng: Number(prop0?.location?.longitude ?? NaN) || null,
  };
  let searchId = null;
  let handoffToken = null;
  let handoffExpiresAt = null;
  try {
    const db = admin.firestore();
    const nowMs = Date.now();
    searchId = `search_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    await db.collection("search-results").doc(searchId).set({
      userId: ctx.userId,
      tenantId: ctx.tenantId || null,
      receiptId: anchor.receiptId || null,
      searchArea: null, // single-address pull, no area
      rankedParcels: [{ rank: 1, parcel: parcelRender, feasibility, overlays }],
      createdAtMs: nowMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("search-results").doc(searchId)
      .collection("parcels").doc(apnKey).set({
        parcel: parcelRender,
        feasibility,
        overlays,
        bundle: attom,
        createdAtMs: nowMs,
      });
    handoffToken = crypto.randomBytes(16).toString("hex");
    handoffExpiresAt = new Date(nowMs + 15 * 60 * 1000).toISOString();
    await db.collection("handoff-tokens").doc(handoffToken).set({
      searchId,
      userId: ctx.userId,
      tenantId: ctx.tenantId || null,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 15 * 60 * 1000,
      usedApns: [],
    });
  } catch (cacheErr) {
    searchId = null;
    handoffToken = null;
    handoffExpiresAt = null;
    console.warn(`[${WORKER_ID}] search cache/token write failed (non-fatal):`, cacheErr.message);
  }

  return res.json({
    ok: true,
    phase: "pull",
    worker: WORKER_ID,
    searchId,
    handoffToken,
    handoffExpiresAt,
    address: { ...params },
    fee: {
      chargedUsd: quote.costBilledCents / 100,
      breakdown: {
        attomCostUsd: quote.costActualCents / 100,
        sociiiMarkupUsd: (quote.costBilledCents - quote.costActualCents) / 100,
      },
      feeEventId: fee.eventId || null,
    },
    auditAnchor: {
      receiptId: anchor.receiptId || null,
      txHash: anchor.txHash,
      anchoredAt: pulledAt,
    },
    parcel: attom,
    overlays,
    feasibility,
  });
}

module.exports = { searchByAddress };
