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
  // CODEX 50.5 D3 — name is misleading: actual basis is REVENUE COLLECTED for
  // the call (credit cost for credit-pack users; per-credit subscription value
  // for subscription users), not inference margin. Locked at 0.20. A future
  // cleanup CODEX may rename this to creatorRevenueSharePct globally.
  creatorInferenceSharePct: 0.20,      // Creator gets 20% of revenue collected for the call
  creatorRevenueSharePct: 0.20,        // 50.5 alias — prefer this in new code
  creatorParentForkSharePct: 0.30,     // 50.5 D2 — when a Creator-authored worker is forked, 30% of share goes to the immediate parent, 70% to current forker

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

  // ── "Box" plans — $99 base + $5 per active seat ──────────────
  // Sean (2026-06-13): same pricing shape for both. Business in a Box = the
  // generic company stack; Academia in a Box = the education variant (adds the
  // FERPA / Academic Record layer and the student-data-plan overage model).
  // Bill only ACTIVE seats; data overage paid by the seat-holder (their own
  // credits), keeping the org's base bill predictable.
  businessInABox: {
    basePriceMonthly: 99,            // $ / month per workspace
    includedSeats: 5,                // first 5 seats free — small teams stay at $99
    perActiveSeatMonthly: 5,         // $ / active seat / month BEYOND the included 5
    perActiveSeatAnnual: 50,         // $ / active seat / year (prepaid), beyond 5
    includedCreditsPerSeat: 100,     // monthly data allowance per active seat
    enterpriseSeatThreshold: 1000,   // above this → flat negotiated license
    overagePaidBy: "seat",           // the seat-holder's own credits pay overage
    // billed seat quantity = max(0, activeSeats - includedSeats)
  },

  // SOCIII for Education = "Academia in a Box".
  // Three layers: (1) school base, (2) per active student seat (access +
  // included data allowance), (3) student data plan (heavy users top up their
  // OWN credits for overage — keeps the school's bill predictable). Professors
  // are creators and earn the standard 75% share on workers they publish.
  // Above the enterprise threshold, switch to a flat negotiated site license.
  education: {
    basePriceMonthly: 99,            // $ / month per institution workspace
    includedStudents: 5,             // first 5 students free (matches the box model)
    perActiveStudentMonthly: 5,      // $ / active student / month BEYOND the included 5
    perActiveStudentAnnual: 50,      // $ / active student / year (prepaid), beyond 5
    includedCreditsPerStudent: 100,  // monthly data allowance per active student
    enterpriseStudentThreshold: 1000,// above this → flat site license (custom)
    creatorRevenueSharePct: 0.75,    // professor share (matches creatorSubscriptionSharePct)
    overagePaidBy: "student",        // default: student data plan pays overage; "institution" pool optional
  },

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

  // ── Stripe Product Price IDs ─────────────────────────────────
  // SOCIII Stripe account (acct_1TYWqdBYvxF0jBHy)
  // Created by scripts/portStripeToSociii.js on 2026-05-25
  // Log: scripts/output/sociii-stripe-catalog-2026-05-26T01-11-31-934Z.json
  stripeProducts: {
    // Per-worker subscriptions
    workerTier1: 'price_1Tb9WbBYvxF0jBHyGnlhlQLz',
    workerTier2: 'price_1Tb9WcBYvxF0jBHydXTgAVWa',
    workerTier3: 'price_1Tb9WcBYvxF0jBHyWKdH8Uav',

    // Kits — Business in a Box ($99/mo each)
    kitStartup:            'price_1Tb9WdBYvxF0jBHyWC6br2Cr',
    kitRePropertyManager:  'price_1Tb9WdBYvxF0jBHyj7CfFik5',
    kitReBrokerage:        'price_1Tb9WeBYvxF0jBHy3d9ERLAP',
    kitReDeveloper:        'price_1Tb9WfBYvxF0jBHyVuvS7S8z',
    kitAviationOperator:   'price_1Tb9WfBYvxF0jBHywRbeY3ub',
    kitAutoDealer:         'price_1Tb9WgBYvxF0jBHyoqOE5hEo',
    kitTitleEscrow:        'price_1Tb9WgBYvxF0jBHyu1616CPs',
    kitGovernment:         'price_1Tb9WhBYvxF0jBHyppHckBdN',
    kitWeb3:               'price_1Tb9WhBYvxF0jBHyjsg3pWiB',
    kitLawFirm:            'price_1Tb9WiBYvxF0jBHyQYXwB06m',
    kitInvestmentFirm:     'price_1Tb9WiBYvxF0jBHyPObFFnhX',

    // All Access / Enterprise
    allAccess: 'price_1Tb9WjBYvxF0jBHyRCjoAiY4',

    // Platform-included + Creator
    vault:          'price_1Tb9WjBYvxF0jBHyGTYZMn0e',
    creatorLicense: 'price_1Tb9WkBYvxF0jBHyl6wVyy75',

    // Credits product (small top-ups + metered overage at $0.02/credit)
    creditsTopUp5:         'price_1Tb9WkBYvxF0jBHy9lxRG7V4',
    creditsTopUp15:        'price_1Tb9WkBYvxF0jBHyooGopOHd',
    creditsTopUp50:        'price_1Tb9WkBYvxF0jBHyYUaYze5T',
    creditsMeteredOverage: 'price_1Tb9WlBYvxF0jBHyiYsQ4pGR',

    // Balance Top-Ups (production code reads these as `"topUp" + amount`)
    topUp100:  'price_1Tb9WlBYvxF0jBHyzbIHUbMQ',
    topUp500:  'price_1Tb9WmBYvxF0jBHykzwQZeQP',
    topUp1000: 'price_1Tb9WmBYvxF0jBHyC1FxNt2E',

    // Usage overages (metered, $1/unit)
    signatureOverage:  'price_1Tb9WnBYvxF0jBHyO5KziiMM',
    blockchainOverage: 'price_1Tb9WnBYvxF0jBHy28qkfLMz',

    // Identity Checks
    identityCheckStandard: 'price_1Tb9WoBYvxF0jBHy5NPIEuMm',
    identityCheckInvestor: 'price_1Tb9WoBYvxF0jBHyIp1zzDv0',
    identityCheckCreator:  'price_1Tb9WpBYvxF0jBHy3EWwyWcs',
    identityCheckAdvisor:  'price_1Tb9WpBYvxF0jBHyepOWORC6',
  },

  // ── Stripe Billing Meter IDs (SOCIII account) ───────────────
  stripeMeters: {
    inferenceCreditsOverage:  'mtr_61UkXTwHMAWVnaT7b41BYvxF0jBHyScK',
    auditTrailRecords:        'mtr_61UkXTxitv0RqADHy41BYvxF0jBHyVTU',
    signatureRequestsOverage: 'mtr_61UkXTx4UJ7l0zJKM41BYvxF0jBHyL0i',
    blockchainRecordsOverage: 'mtr_61UkXTxoQfY3FRFfX41BYvxF0jBHyRYe',
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
