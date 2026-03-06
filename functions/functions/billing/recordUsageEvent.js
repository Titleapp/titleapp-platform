/**
 * recordUsageEvent.js — Write full v2.0 usage events
 *
 * Every worker execution writes one usage_events document capturing
 * all three revenue lines:
 *   Line 1 — Inference credits
 *   Line 2 — Data pass-through fees
 *   Line 3 — Audit trail fees
 *
 * usage_events is append-only. No updates after creation.
 * Users can read their own aggregate summaries only (via Cloud Function).
 */

"use strict";

const admin = require("firebase-admin");
const crypto = require("crypto");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }

/**
 * Determine how many credits come from the included subscription allowance
 * versus overage.
 *
 * @param {number} creditsConsumed — total credits for this execution
 * @param {string} tier — subscription tier key
 * @param {number} usedThisMonth — credits already consumed this billing period
 * @returns {{ creditsFromIncluded: number, creditsOverage: number }}
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
 * Calculate revenue splits for a single usage event.
 *
 * @param {object} params
 * @param {number} params.creditsOverage
 * @param {number} params.dataFeeActual — sum of actual external API costs
 * @param {number} params.dataFeeCharged — sum of marked-up charges
 * @param {number} params.auditFee — audit trail fee charged
 * @param {number} params.gasCost — actual gas cost
 * @param {number} params.inferenceActualCost — actual Anthropic API cost
 * @returns {{ revenue_line_1, revenue_line_2, revenue_line_3, creator_share_amount }}
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

  // Line 1: Overage revenue minus actual AI cost
  const overageRevenue = creditsOverage * pricing.creditRate;
  const revenueLine1 = overageRevenue - inferenceActualCost;

  // Line 2: Markup revenue (charged - actual)
  const revenueLine2 = dataFeeCharged - dataFeeActual;

  // Line 3: Audit trail fee minus gas
  const revenueLine3 = auditFee - gasCost;

  // Creator share: 20% of TitleApp's inference margin on overage only
  const creatorShareAmount = revenueLine1 > 0
    ? +(revenueLine1 * pricing.creatorInferenceSharePct).toFixed(4)
    : 0;

  return {
    revenue_line_1: +revenueLine1.toFixed(4),
    revenue_line_2: +revenueLine2.toFixed(4),
    revenue_line_3: +revenueLine3.toFixed(4),
    creator_share_amount: creatorShareAmount,
  };
}

/**
 * Write a complete v2.0 usage event to Firestore.
 *
 * @param {object} params
 * @param {string} params.worker_id
 * @param {string} params.creator_id
 * @param {string} params.user_id
 * @param {string|null} params.org_id
 * @param {string} params.execution_type — simple/standard/complex/external_api/esign/ocr
 * @param {string} params.subscription_tier — free/tier1/tier2/tier3/enterprise
 * @param {number} params.usedThisMonth — credits already used before this execution
 * @param {number} params.inference_cost_actual — actual Anthropic API cost in USD
 * @param {Array} params.data_api_calls — array of { provider, endpoint, actual_cost_usd, charged_to_user }
 * @param {object|null} params.audit — { txHash, gasCost, fee } from auditTrailService
 * @param {string|null} params.jurisdiction — "HI:QueensMedical" format
 * @param {string} params.raas_tier_applied — "0"/"1"/"2"/"3"
 * @param {boolean} params.disclaimer_active
 * @returns {FirebaseFirestore.DocumentReference} — the written event reference
 */
async function recordUsageEvent(params) {
  const db = getDb();
  const eventId = crypto.randomUUID();

  // Credits consumed based on execution type
  const creditsConsumed = pricing.executionCredits[params.execution_type] || pricing.executionCredits.standard;

  // Split included vs overage
  const { creditsFromIncluded, creditsOverage } = splitCredits(
    creditsConsumed,
    params.subscription_tier || "free",
    params.usedThisMonth || 0
  );

  // Sum data fees
  const dataApiCalls = params.data_api_calls || [];
  const dataFeeActual = dataApiCalls.reduce((sum, c) => sum + (c.actual_cost_usd || 0), 0);
  const dataFeeCharged = dataApiCalls.reduce((sum, c) => sum + (c.charged_to_user || 0), 0);

  // Audit trail
  const audit = params.audit || null;
  const auditRecordWritten = !!audit;
  const auditFeeCharged = audit ? audit.fee : 0;
  const gasCostActual = audit ? audit.gasCost : 0;

  // Revenue calculations
  const revenue = calculateRevenue({
    creditsOverage,
    dataFeeActual,
    dataFeeCharged,
    auditFee: auditFeeCharged,
    gasCost: gasCostActual,
    inferenceActualCost: params.inference_cost_actual || 0,
  });

  const event = {
    // Identity
    event_id: eventId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    worker_id: params.worker_id,
    creator_id: params.creator_id || null,
    user_id: params.user_id,
    org_id: params.org_id || null,

    // Line 1 — Inference
    execution_type: params.execution_type,
    credits_consumed: creditsConsumed,
    inference_cost_actual: params.inference_cost_actual || 0,
    subscription_tier: params.subscription_tier || "free",
    credits_from_included: creditsFromIncluded,
    credits_overage: creditsOverage,

    // Line 2 — Data fees
    data_api_calls: dataApiCalls,
    data_fee_actual: +dataFeeActual.toFixed(4),
    data_fee_charged: +dataFeeCharged.toFixed(4),

    // Line 3 — Audit trail
    audit_record_written: auditRecordWritten,
    audit_fee_charged: auditFeeCharged,
    blockchain_tx_hash: audit ? audit.txHash : null,
    gas_cost_actual: gasCostActual,

    // Compliance
    jurisdiction: params.jurisdiction || null,
    raas_tier_applied: params.raas_tier_applied || "0",
    disclaimer_active: params.disclaimer_active !== false,

    // Revenue summary
    revenue_line_1: revenue.revenue_line_1,
    revenue_line_2: revenue.revenue_line_2,
    revenue_line_3: revenue.revenue_line_3,
    creator_share_amount: revenue.creator_share_amount,

    // Immutability
    _written_at: admin.firestore.FieldValue.serverTimestamp(),
    _version: "2.0",
  };

  const ref = await db.collection("usage_events").add(event);
  return ref;
}

module.exports = { recordUsageEvent, splitCredits, calculateRevenue };
