"use strict";

/**
 * SITE-RECON-001 — W-002 handoff (Build Step 7)
 *
 * POST /v1/workers/site-recon-001/handoff-to-title-abstract
 * Body: { handoffToken, apn, confirmRePull?, address? }
 *
 * Happy path: token (15-min TTL) → cached parcel bundle (subcollection,
 * written at search time) → W-002 initiate → anchored handoff record.
 * Cost $0 — no re-pull.
 *
 * Token semantics: valid for its full TTL across MULTIPLE parcels (spec §2:
 * one-click promotion of ANY ranked parcel) with per-APN idempotency —
 * the same parcel can't be handed off twice (409 ALREADY_HANDED_OFF).
 *
 * Fallback: expired token / cache miss → 410 TOKEN_EXPIRED with re-pull
 * projection; confirmRePull:true + resolvable address → fresh billed pull
 * (RULE-01 gate honored by the projection round-trip), then handoff.
 *
 * RULE-10: the W-002 call gets a 10s timeout. Timeout/error surfaces as
 * 504 CROSS_WORKER_TIMEOUT — a named blocker, never a silent failure.
 */

const admin = require("firebase-admin");
const billing = require("../../services/billing/dataFee");
const auditTrail = require("../../services/auditTrailService");
const w002 = require("./titleAbstractStub");
const { pullParcelBundle } = require("./attomClient");
const scoring = require("./scoreFeasibility");
const vault = require("./vaultIntegration");
const { validateApn } = require("./inputValidation");

const WORKER_ID = "site-recon-001";
const SOURCE_PROPERTY = "attom:property";
const W002_TIMEOUT_MS = 10000;

function getDb() { return admin.firestore(); }
function apnKeyOf(apn) { return String(apn).replace(/[^A-Za-z0-9_.-]+/g, "-").slice(0, 200); }

async function rePullProjection(userId) {
  const quote = await billing.quoteDataFee({ source: SOURCE_PROPERTY, units: 1, userId });
  return {
    totalFeeUsd: quote.costBilledCents / 100,
    breakdown: {
      attomCostUsd: quote.costActualCents / 100,
      sociiiMarkupUsd: (quote.costBilledCents - quote.costActualCents) / 100,
    },
    message: quote.message,
  };
}

async function handoffToTitleAbstract(req, res, { body, ctx, jsonError }) {
  const token = (body.handoffToken || "").toString();
  // RULE-11 (hard stop): structural APN validation — specific error, no spend.
  const apnCheck = validateApn(body.apn);
  if (!apnCheck.ok) return jsonError(res, 400, apnCheck.message, { code: apnCheck.code, reason: apnCheck.reason });
  const apn = apnCheck.apn;
  if (!token) return jsonError(res, 400, "handoffToken is required.", { code: "INVALID_TOKEN" });
  const apnKey = apnKeyOf(apn);
  const db = getDb();

  // ── Resolve token → cached bundle ──────────────────────────────
  const tokenSnap = await db.collection("handoff-tokens").doc(token).get();
  const tokenDoc = tokenSnap.exists ? tokenSnap.data() : null;
  const tokenValid = tokenDoc && Date.now() < (tokenDoc.expiresAtMs || 0);

  if (tokenDoc && tokenDoc.userId !== ctx.userId) {
    return jsonError(res, 403, "This handoff token belongs to another user.", { code: "FORBIDDEN" });
  }
  if (tokenValid && Array.isArray(tokenDoc.usedApns) && tokenDoc.usedApns.includes(apnKey)) {
    return res.status(409).json({ ok: false, code: "ALREADY_HANDED_OFF", message: "This parcel was already handed off from this search." });
  }

  let bundle = null;
  let parcelRef = null;
  let feasibility = null;
  let handoffMethod = null;
  let costUsd = 0;
  let feeEventId = null;
  let linkedSearchId = tokenDoc?.searchId || null;

  if (tokenValid) {
    const parcelSnap = await db
      .collection("search-results").doc(tokenDoc.searchId)
      .collection("parcels").doc(apnKey).get();
    if (parcelSnap.exists) {
      const d = parcelSnap.data();
      bundle = d.bundle || null;
      parcelRef = d.parcel || null;
      feasibility = d.feasibility || null;
      handoffMethod = "token";
    }
  }

  // ── Fallback: expired token or cache miss ──────────────────────
  if (!bundle) {
    if (body.confirmRePull !== true) {
      return res.status(410).json({
        ok: false,
        code: "TOKEN_EXPIRED",
        message: "Handoff token expired or search data is no longer cached. Confirm re-pull to proceed.",
        rePull: await rePullProjection(ctx.userId),
        next: "Re-submit with confirmRePull: true and the parcel address to pull fresh data.",
      });
    }
    // Resolve an address: request body, or whatever the cached search holds.
    let address1 = (body.address?.address1 || "").toString();
    let address2 = (body.address?.address2 || "").toString();
    if ((!address1 || !address2) && linkedSearchId) {
      const staleParcel = await db
        .collection("search-results").doc(linkedSearchId)
        .collection("parcels").doc(apnKey).get();
      if (staleParcel.exists) {
        const p = staleParcel.data().parcel || {};
        address1 = address1 || p.address1 || "";
        address2 = address2 || p.address2 || "";
      }
    }
    if (!address1 || !address2) {
      return jsonError(res, 400, "Parcel address required for re-pull (address: { address1, address2 }).", { code: "ADDRESS_REQUIRED" });
    }
    const apiKey = process.env.ATTOM_API_KEY || "";
    if (!apiKey) return jsonError(res, 500, "ATTOM API key not configured", { code: "ATTOM_KEY_MISSING" });

    bundle = await pullParcelBundle({ address1, address2 }, apiKey);
    feasibility = scoring.scoreFeasibility(bundle);
    parcelRef = {
      apn,
      attomId: bundle?.propertyDetail?.data?.property?.[0]?.identifier?.attomId ?? null,
      address1,
      address2,
    };
    handoffMethod = "re-pull";
    const fee = await billing.recordDataFee({
      source: SOURCE_PROPERTY,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      units: 1,
      requestedBy: `${WORKER_ID}:handoff-re-pull`,
      metadata: { apn, address1, address2 },
    });
    feeEventId = fee.eventId || null;
    costUsd = (billing.SOURCE_REGISTRY[SOURCE_PROPERTY].actualCentsPerUnit * billing.SOURCE_REGISTRY[SOURCE_PROPERTY].markup) / 100;
  }

  // ── W-002 initiate (RULE-10: timeout → named blocker, never silent) ──
  let job;
  try {
    job = await Promise.race([
      w002.initiateAbstract(bundle, ctx.userId, ctx.tenantId),
      new Promise((_, reject) => {
        const e = new Error("w002_timeout");
        e.code = "cross_worker_timeout";
        setTimeout(() => reject(e), W002_TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    return res.status(504).json({
      ok: false,
      code: "CROSS_WORKER_TIMEOUT",
      blocker: "CROSS_WORKER_TIMEOUT",
      message: `${w002.W002_WORKER_ID} did not respond. The handoff was not completed — retry shortly.`,
      ...(feeEventId ? { feeEventId, note: "Re-pull fee was charged; retry with your handoff token — data is now cached." } : {}),
    });
  }

  // ── Anchor the handoff (its own record, linked to the search) ──
  const timestamp = new Date().toISOString();
  let anchor;
  try {
    anchor = await auditTrail.writeAuditRecord({
      event_id: `PLAT-008-${timestamp.slice(0, 10).replace(/-/g, "")}-handoff-${apnKey}`,
      worker_id: WORKER_ID,
      user_id: ctx.userId,
      org_id: ctx.tenantId,
      execution_type: "site-recon:w002-handoff",
      timestamp,
      metadata: {
        apn,
        handoffMethod,
        targetWorkerId: w002.W002_WORKER_ID,
        titleAbstractJobId: job.jobId,
        linkedSearchId,
        feasibilityVerdict: feasibility?.verdict || null,
        feeEventId,
        costUsd,
      },
    });
  } catch (anchorErr) {
    console.error("[orphan_handoff]", { apn, jobId: job.jobId, error: anchorErr.message });
    return res.status(503).json({
      ok: false,
      code: "AUDIT_ANCHOR_FAILED",
      phase: "anchor",
      message: "Handoff was initiated but the audit anchor failed. Quote this job ID to support for reconciliation.",
      titleAbstractJobId: job.jobId,
    });
  }

  // ── Per-APN idempotency mark (token survives for other parcels) ──
  if (tokenValid) {
    try {
      await db.collection("handoff-tokens").doc(token).set(
        { usedApns: admin.firestore.FieldValue.arrayUnion(apnKey) },
        { merge: true }
      );
    } catch (e) {
      console.warn(`[${WORKER_ID}] token usedApns update failed (non-fatal):`, e.message);
    }
  }

  // Vault DTC logbook mirror (Step 8 — soft, never blocks).
  const vaultResult = await vault.createVaultLogbookEntry(
    { execution_type: "site-recon:w002-handoff", timestamp, receiptId: anchor.receiptId || null, txHash: anchor.txHash, metadata: { apn, handoffMethod, titleAbstractJobId: job.jobId, linkedSearchId } },
    { apn, attomId: parcelRef?.attomId, address1: parcelRef?.address1, address2: parcelRef?.address2 },
    ctx
  );

  return res.json({
    ok: true,
    vaultStatus: vaultResult.ok ? "ok" : "unavailable",
    handoff: {
      titleAbstractWorkerId: w002.W002_WORKER_ID,
      titleAbstractJobId: job.jobId,
      status: job.status,
      estimatedCompletionMinutes: job.estimatedCompletionMinutes,
      parcel: {
        apn,
        address: [parcelRef?.address1, parcelRef?.address2].filter(Boolean).join(", "),
      },
      handoffMethod,
      cost: costUsd,
    },
    auditRecord: {
      recordId: anchor.receiptId || null,
      anchorType: "individual",
      txHash: anchor.txHash || null,
    },
  });
}

module.exports = { handoffToTitleAbstract };
