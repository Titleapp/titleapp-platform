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
const { quoteDataFee, recordDataFee } = require("../../services/billing/dataFee");
const { scoreFeasibility } = require("./scoreFeasibility");
const { sha256 } = require("../../services/signatureService/blockchain");
// Namespace require (not destructured) so smoke tests can stub writeAuditRecord.
const auditTrail = require("../../services/auditTrailService");

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";
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

// ── ATTOM fetch helper ───────────────────────────────────────────
async function attomGet(path, params, apiKey) {
  const url = new URL(`${ATTOM_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const resp = await fetch(url.toString(), {
      headers: { apikey: apiKey, accept: "application/json" },
    });
    const json = await resp.json().catch(() => null);
    return { endpoint: path, httpStatus: resp.status, ok: resp.ok, data: json };
  } catch (e) {
    return { endpoint: path, httpStatus: null, ok: false, error: e.message };
  }
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
  const [propertyDetail, salesHistory, avm] = await Promise.all([
    attomGet("/property/detail", params, apiKey),      // assessor, owner of record, APN status
    attomGet("/saleshistory/detail", params, apiKey),  // sales history (raw — last-5 slicing comes with scoring)
    attomGet("/attomavm/detail", params, apiKey),      // AVM valuation
  ]);

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

  // ── Score the bundle (Step 2 — RULE-04..07, RULE-13) ────────────
  const attom = { propertyDetail, salesHistory, avm };
  const feasibility = scoreFeasibility(attom);

  // ── Anchor the pull to PLAT-008 (Step 3 — RULE-03, non-negotiable) ──
  const attomId = propertyDetail?.data?.property?.[0]?.identifier?.attomId ?? null;
  const pulledAt = new Date().toISOString();
  const receiptMetadata = {
    parcelRef: { address1: parsed.address1, address2: parsed.address2, attomId },
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

  return res.json({
    ok: true,
    phase: "pull",
    worker: WORKER_ID,
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
    feasibility,
  });
}

module.exports = { searchByAddress };
