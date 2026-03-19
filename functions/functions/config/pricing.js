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

  // ── Document Control Usage Allowances (per tier, per month) ──
  documentControlAllowances: {
    free:       { signatures: 0,  blockchainRecords: 0  },
    tier1:      { signatures: 5,  blockchainRecords: 5  },
    tier2:      { signatures: 10, blockchainRecords: 10 },
    tier3:      { signatures: 20, blockchainRecords: 20 },
    enterprise: { signatures: null, blockchainRecords: null }, // custom
  },

  // ── Overage Rates ($ per event after monthly allowance) ─────
  overageRates: {
    signature_request: 1.00,           // $1 per signature after allowance
    blockchain_record: 1.00,           // $1 per blockchain record after allowance
  },

  // ── Deposit / Prepay ───────────────────────────────────────
  depositAmounts: [100, 500, 1000],    // operator top-up choices
  autoRechargeThresholdDefault: 20,    // trigger recharge at $20
  autoRechargeAmountDefault: 100,      // default recharge amount

  // ── Stripe Product Price IDs (created by scripts/createBillingProducts.js) ──
  stripeProducts: {
    signatureOverage: null,  // price_xxx — $1.00/unit, fill after running script
    blockchainOverage: null, // price_xxx — $1.00/unit, fill after running script
    topUp100: null,          // price_xxx — $100.00 one-time
    topUp500: null,          // price_xxx — $500.00 one-time
    topUp1000: null,         // price_xxx — $1,000.00 one-time
  },

  // ── Stripe Meter Event Names ─────────────────────────────────
  stripeMeterEvents: {
    inferenceOverage: 'inference_credits_overage',
    auditTrailRecords: 'audit_trail_records',
    signatureOverage: 'signature_requests_overage',
    blockchainOverage: 'blockchain_records_overage',
  },

  // ── Creator Payout ───────────────────────────────────────────
  creatorMinPayoutThreshold: 50,       // $ minimum before transfer ($50)
  creatorMaxPayoutHoldWeeks: 4,        // Force payout after 4 weeks regardless of balance
};
