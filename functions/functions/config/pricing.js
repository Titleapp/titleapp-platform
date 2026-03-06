/**
 * config/pricing.js — Canonical pricing source of truth
 *
 * ALL pricing references in the codebase MUST read from this file.
 * No hardcoded pricing numbers anywhere else.
 *
 * Three revenue lines:
 *   Line 1 — Inference Credits (AI execution)
 *   Line 2 — Data Pass-Through Fee (external APIs)
 *   Line 3 — Audit Trail Fee (blockchain records)
 */

module.exports = {
  // ── Line 1 — Inference Credits ────────────────────────────────
  creditRate: 0.02,                    // $ per credit at overage
  executionCredits: {
    simple: 1,
    standard: 5,
    complex: 15,
    external_api: 25,
    esign: 30,
    ocr: 50,
  },
  creatorInferenceSharePct: 0.20,      // Creator gets 20% of TitleApp inference margin

  // ── Line 2 — Data Pass-Through Fee ───────────────────────────
  dataFeeMarkupMultiplier: 2.0,        // actual_cost * 2.0 = user charge

  // ── Line 3 — Audit Trail Fee ─────────────────────────────────
  auditTrailFeePerRecord: 0.005,       // $ per blockchain record
  auditTrailGasCostAlert: 0.004,       // Alert if gas exceeds this

  // ── Subscription Tiers (locked — do not change) ──────────────
  subscriptionTiers: {
    free:        { price: 0,    creditsIncluded: 100  },
    tier1:       { price: 29,   creditsIncluded: 500  },
    tier2:       { price: 49,   creditsIncluded: 1500 },
    tier3:       { price: 79,   creditsIncluded: 3000 },
    enterprise:  { price: null, creditsIncluded: null },
  },

  // ── Creator Revenue Share (locked — do not change) ───────────
  creatorSubscriptionSharePct: 0.75,
  platformSubscriptionSharePct: 0.25,

  // ── Stripe Meter Event Names ─────────────────────────────────
  stripeMeterEvents: {
    inferenceOverage: 'inference_credits_overage',
    auditTrailRecords: 'audit_trail_records',
  },

  // ── Creator Payout ───────────────────────────────────────────
  creatorMinPayoutThreshold: 0.50,     // $ minimum before transfer
};
