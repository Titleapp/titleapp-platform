/**
 * recordUsageEvent.js — Revenue-attribution helper (CODEX 50.5).
 *
 * Reframed in CODEX 50.5 from a Firestore writer into a pure helper that
 * returns the revenue-attribution fields for a single billable call. Callers
 * (the four telemetry write paths + the chat handler in index.js) merge the
 * helper output into the event document they were already writing.
 *
 *   Old shape: recordUsageEvent(params) writes to its own collection.
 *   New shape: computeRevenueAttribution(context) returns mergeable fields.
 *
 * Why a helper, not a writer:
 *   If this module wrote independently, every billable call would produce two
 *   Firestore writes (the existing telemetry write plus this one). That
 *   doubles cost and reintroduces the "one writes, the other doesn't" failure
 *   mode CODEX 50.4 fixed. As a helper, it merges into a single event doc.
 *
 * Schema extension on the canonical telemetry collection (USAGE_EVENTS_COLLECTION):
 *   creator_id          uid of worker's current owner (or null for system events)
 *   creator_status      "active" | "deleted" | "suspended"
 *   creator_share_amount cents — share for current owner. 0 for SOCIII originals.
 *   forkedFrom          source worker doc id (snapshot at write time, D5)
 *   forkedFromCollection source collection name (snapshot at write time)
 *   parent_creator_id   uid of immediate parent Creator (forked-from-Creator-authored only)
 *   parent_share_amount cents — 30% share for parent (forked-from-Creator-authored only)
 *   revenue_basis       "credit_pack" | "subscription_prorata" | "free" | "system"
 *   revenue_amount      cents — total revenue attributed to this call
 *   parent_interaction_id  groups events in one user interaction (refund walkback)
 *   billing_period      ISO month "2026-05" — pre-computed for cycle-close
 */

"use strict";

const admin = require("firebase-admin");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }

const TITLEAPP_PLATFORM_CREATOR = "titleapp-platform";

/**
 * Determine how many credits come from the included subscription allowance
 * versus overage. Used by callers that need to split included vs overage —
 * unchanged from the pre-50.5 helper so existing callers keep working.
 */
function splitCredits(creditsConsumed, tier, usedThisMonth) {
  const tierConfig = pricing.subscriptionTiers[tier] || pricing.subscriptionTiers.free;
  const included = tierConfig.creditsIncluded || 0;
  const remainingIncluded = Math.max(0, included - usedThisMonth);
  const fromIncluded = Math.min(creditsConsumed, remainingIncluded);
  const overage = Math.max(0, creditsConsumed - fromIncluded);
  return { creditsFromIncluded: fromIncluded, creditsOverage: overage };
}

/**
 * Per-credit revenue rate for a subscription tier. Used to compute
 * revenue_amount at write time for subscription users — gives a constant
 * per-credit dollar value rather than redistributing at cycle-close.
 *
 * Pro tier example: $29/month / 500 credits = $0.058 per credit.
 * A 5-credit call = $0.29 revenue.
 *
 * Free tier returns 0 (no revenue). Enterprise returns null (custom contracts
 * negotiate revenue separately; treat as 0 share for now).
 */
function revenuePerCreditForTier(tier) {
  const cfg = pricing.subscriptionTiers[tier];
  if (!cfg) return 0;
  if (cfg.price == null || cfg.creditsIncluded == null) return 0;
  if (cfg.creditsIncluded === 0) return 0;
  return cfg.price / cfg.creditsIncluded;
}

/**
 * Derive the ISO month bucket for a timestamp. Used for billing_period.
 * @param {Date|number|null} ts
 * @returns {string} e.g. "2026-05"
 */
function billingPeriodFromTimestamp(ts) {
  const d = ts instanceof Date ? ts : (ts ? new Date(ts) : new Date());
  return d.toISOString().slice(0, 7);
}

/**
 * Look up a worker doc across the three known collections. Returns the first
 * hit. Treats the worker doc as a snapshot — the caller does not get a
 * Firestore reference, just the data.
 */
async function loadWorker(db, workerId) {
  if (!workerId) return null;
  for (const col of ["workers", "digitalWorkers", "raasCatalog"]) {
    try {
      const snap = await db.collection(col).doc(workerId).get();
      if (snap.exists) return { id: snap.id, _collection: col, ...snap.data() };
    } catch (_) { /* try next */ }
  }
  return null;
}

/**
 * Look up the Creator's current account state for the creator_status snapshot.
 */
async function loadCreatorStatus(db, creatorUid) {
  if (!creatorUid || creatorUid === TITLEAPP_PLATFORM_CREATOR) return "platform";
  try {
    const snap = await db.collection("users").doc(creatorUid).get();
    if (!snap.exists) return "deleted";
    const data = snap.data();
    if (data.deleted_at || data.deletedAt) return "deleted";
    if (data.suspended === true || data.status === "suspended") return "suspended";
    return "active";
  } catch (_) {
    return "active"; // fail-open — don't block payouts on transient lookup errors
  }
}

/**
 * Round to 4 decimals for currency stability (matches the legacy revenue
 * calculator in this file).
 */
function round4(n) { return +Number(n).toFixed(4); }

/**
 * Core helper. Builds the revenue-attribution merge object for a single
 * billable call. Returns the fields ready to merge into the existing
 * telemetry event doc.
 *
 * @param {object} context
 * @param {string} context.workerId — worker whose call this is (required for billable events)
 * @param {string} [context.userId] — calling user
 * @param {string} [context.tenantId] — active tenant context
 * @param {("credit_pack"|"subscription_prorata"|"free"|"system")} context.revenueBasis
 * @param {number} [context.revenueAmount] — cents attributed to this call. Required for credit_pack/subscription_prorata.
 * @param {string} [context.tier] — subscription tier when revenueBasis === "subscription_prorata"
 * @param {number} [context.creditCost] — credits consumed (used to derive revenueAmount when not provided)
 * @param {Date|number} [context.timestamp] — for billing_period derivation. Defaults to now.
 * @param {string} [context.parentInteractionId] — group id for chained events
 * @returns {Promise<object>} mergeable revenue-attribution fields
 */
async function computeRevenueAttribution(context) {
  const {
    workerId,
    revenueBasis,
    parentInteractionId,
    timestamp,
  } = context || {};

  const billing_period = billingPeriodFromTimestamp(timestamp);

  // Non-billable bases short-circuit — still record the basis for analytics.
  if (revenueBasis === "free" || revenueBasis === "system") {
    return {
      creator_id: null,
      creator_status: null,
      creator_share_amount: 0,
      forkedFrom: null,
      forkedFromCollection: null,
      parent_creator_id: null,
      parent_share_amount: 0,
      revenue_basis: revenueBasis,
      revenue_amount: 0,
      parent_interaction_id: parentInteractionId || null,
      billing_period,
    };
  }

  // Resolve revenue_amount from explicit value or per-credit derivation.
  let revenue_amount = Number(context.revenueAmount || 0);
  if (!revenue_amount && context.creditCost && context.tier && revenueBasis === "subscription_prorata") {
    revenue_amount = revenuePerCreditForTier(context.tier) * Number(context.creditCost);
  }
  revenue_amount = round4(revenue_amount);

  // No worker → can't attribute. Treat like a free event with the basis preserved.
  if (!workerId) {
    return {
      creator_id: null,
      creator_status: null,
      creator_share_amount: 0,
      forkedFrom: null,
      forkedFromCollection: null,
      parent_creator_id: null,
      parent_share_amount: 0,
      revenue_basis: revenueBasis || "system",
      revenue_amount,
      parent_interaction_id: parentInteractionId || null,
      billing_period,
    };
  }

  const db = getDb();
  const worker = await loadWorker(db, workerId);

  // Worker not found — treat as system event so the call still records.
  if (!worker) {
    return {
      creator_id: null,
      creator_status: null,
      creator_share_amount: 0,
      forkedFrom: null,
      forkedFromCollection: null,
      parent_creator_id: null,
      parent_share_amount: 0,
      revenue_basis: "system",
      revenue_amount,
      parent_interaction_id: parentInteractionId || null,
      billing_period,
    };
  }

  const creatorId = worker.creatorId || worker.createdBy || null;
  const isSOCIIIOriginal = !creatorId || creatorId === TITLEAPP_PLATFORM_CREATOR;
  const sharePct = pricing.creatorRevenueSharePct ?? pricing.creatorInferenceSharePct ?? 0.20;
  const parentForkPct = pricing.creatorParentForkSharePct ?? 0.30;

  // SOCIII original: record creator_id (so platform totals are visible)
  // but creator_share_amount = 0 — no royalty owed.
  if (isSOCIIIOriginal) {
    return {
      creator_id: TITLEAPP_PLATFORM_CREATOR,
      creator_status: "platform",
      creator_share_amount: 0,
      forkedFrom: worker.forkedFrom || null,
      forkedFromCollection: worker.forkedFromCollection || null,
      parent_creator_id: null,
      parent_share_amount: 0,
      revenue_basis: revenueBasis,
      revenue_amount,
      parent_interaction_id: parentInteractionId || null,
      billing_period,
    };
  }

  // Creator-authored. Inspect lineage to decide split.
  const forkedFrom = worker.forkedFrom || null;
  const forkedFromCollection = worker.forkedFromCollection || null;
  const creator_status = await loadCreatorStatus(db, creatorId);

  // Not a fork — full share to current creator.
  if (!forkedFrom) {
    const creator_share_amount = round4(revenue_amount * sharePct);
    return {
      creator_id: creatorId,
      creator_status,
      creator_share_amount,
      forkedFrom: null,
      forkedFromCollection: null,
      parent_creator_id: null,
      parent_share_amount: 0,
      revenue_basis: revenueBasis,
      revenue_amount,
      parent_interaction_id: parentInteractionId || null,
      billing_period,
    };
  }

  // Forked. Look up the source to determine if parent was Creator-authored.
  const source = await loadWorker(db, forkedFrom);
  const sourceCreatorId = source ? (source.creatorId || source.createdBy || null) : null;
  const sourceIsSOCIIIOriginal = !sourceCreatorId || sourceCreatorId === TITLEAPP_PLATFORM_CREATOR;

  if (sourceIsSOCIIIOriginal) {
    // Forked from SOCIII original — full share to forker, no upstream payout.
    const creator_share_amount = round4(revenue_amount * sharePct);
    return {
      creator_id: creatorId,
      creator_status,
      creator_share_amount,
      forkedFrom,
      forkedFromCollection,
      parent_creator_id: null,
      parent_share_amount: 0,
      revenue_basis: revenueBasis,
      revenue_amount,
      parent_interaction_id: parentInteractionId || null,
      billing_period,
    };
  }

  // Forked from Creator-authored — 70/30 split.
  // Forker (current creator) gets 70% of share; immediate parent gets 30%.
  // Per spec D2: level-2+ forks attribute to level-1 forker as parent, NOT
  // the original creator.
  const totalShare = revenue_amount * sharePct;
  const parent_share_amount = round4(totalShare * parentForkPct);
  const creator_share_amount = round4(totalShare * (1 - parentForkPct));

  return {
    creator_id: creatorId,
    creator_status,
    creator_share_amount,
    forkedFrom,
    forkedFromCollection,
    parent_creator_id: sourceCreatorId,
    parent_share_amount,
    revenue_basis: revenueBasis,
    revenue_amount,
    parent_interaction_id: parentInteractionId || null,
    billing_period,
  };
}

/**
 * Legacy revenue calculator — kept for any caller still using it. CODEX 50.5
 * supersedes this with computeRevenueAttribution. Both can coexist; the
 * helper returns the canonical revenue-attribution fields, while this
 * computes line-item revenue (line 1/2/3) for Stripe overage / data fee /
 * audit fee accounting.
 */
function calculateRevenue(params) {
  const {
    creditsOverage = 0,
    dataFeeActual = 0,
    dataFeeCharged = 0,
    auditFee = 0,
    gasCost = 0,
    inferenceActualCost = 0,
  } = params;

  const overageRevenue = creditsOverage * (pricing.creditRate || 0);
  const revenueLine1 = overageRevenue - inferenceActualCost;
  const revenueLine2 = dataFeeCharged - dataFeeActual;
  const revenueLine3 = auditFee - gasCost;

  const sharePct = pricing.creatorRevenueSharePct ?? pricing.creatorInferenceSharePct ?? 0.20;
  const creatorShareAmount = revenueLine1 > 0 ? round4(revenueLine1 * sharePct) : 0;

  return {
    revenue_line_1: round4(revenueLine1),
    revenue_line_2: round4(revenueLine2),
    revenue_line_3: round4(revenueLine3),
    creator_share_amount: creatorShareAmount,
  };
}

module.exports = {
  // CODEX 50.5 — primary export.
  computeRevenueAttribution,
  // Helpers.
  splitCredits,
  calculateRevenue,
  revenuePerCreditForTier,
  billingPeriodFromTimestamp,
  loadWorker,
  loadCreatorStatus,
  // Constants.
  TITLEAPP_PLATFORM_CREATOR,
};
