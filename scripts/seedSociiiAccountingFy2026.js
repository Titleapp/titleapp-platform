"use strict";

/**
 * One-shot seeder for SOCIII Accounting (FY 2026):
 *   1. forwardBudgets — directional 12-month budget adapted from
 *      TitleApp Financial Model v2 ($38K/mo target = $460K/yr).
 *   2. loanAgreements — 3 founder loans (Rosenberg, Dunn, Gibson), 4% annual.
 *   3. customObligations — quarterly interest payment deadlines (Sep 30,
 *      Dec 31) plus an October decision-review checkpoint.
 *
 * Discrepancies vs prior memory worth flagging:
 *   - Chris Dunn (SaoViet ICPD) was previously documented at 10% with PHOM
 *     coverage; now treated as plain 4% cash loan. Treated as renegotiated.
 *   - Michael Gibson was previously documented as a 104,763.79-HOM holder
 *     (not a cash lender). $10K cash treatment recorded here is the current
 *     plan and may need a side agreement / HOM buyout memorialization.
 *   - Robert Rosenberg loan currently sits on TitleApp LLC's books and
 *     transfers to SOCIII at wind-down (Action by Written Consent ~6/12).
 *     Recording on SOCIII pre-transfer is operational tracking; the formal
 *     journal-entry assumption happens after wind-down execution.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=title-app-alpha \
 *   GOOGLE_APPLICATION_CREDENTIALS=/Users/seancombs/.config/gcloud/legacy_credentials/titleapp.core@gmail.com/adc.json \
 *   node scripts/seedSociiiAccountingFy2026.js
 *
 * Idempotent: budget + loan docs use deterministic IDs; reruns merge.
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

const TENANT_ID = "ws_1779846027006_hc71aw"; // SOCIII workspace
const USER_ID = "WResykI56hW16silsOtvlw1UjJK2"; // Sean's UID

const TS = admin.firestore.FieldValue.serverTimestamp();

// ---------------------------------------------------------------------------
// 1a. Post-funding target budget (Oct 2026+)
// ---------------------------------------------------------------------------
// From docs/investor/current/TitleApp_Financial_Model_v2.xlsx:
//   $2.3M net proceeds / 60-month runway = $38,333/mo = $460K/yr.
//   Allocations preserved at category percentages.
// Written FIRST so the pre-funding doc (below) is the most recent and
// becomes the active forward run rate on the Dashboard.

const POSTFUNDING_BUDGET = {
  year: 2026,
  months: 12,
  lineItems: [
    { section: "Operating Expense", name: "Product & Engineering", annualCents: 18_400_000 },
    { section: "Operating Expense", name: "GTM & Sales",           annualCents: 11_500_000 },
    { section: "Operating Expense", name: "Operations",            annualCents: 9_200_000 },
    { section: "Operating Expense", name: "Vertical Expansion",    annualCents: 4_600_000 },
    { section: "Operating Expense", name: "Reserve",               annualCents: 2_300_000 },
  ],
};

const POSTFUNDING_ID = `sociii_fy2026_postfunding_target_v1`;

async function seedPostFundingBudget() {
  const annual = POSTFUNDING_BUDGET.lineItems.reduce((s, l) => s + l.annualCents, 0);
  await db.collection("forwardBudgets").doc(POSTFUNDING_ID).set({
    tenantId: TENANT_ID,
    year: POSTFUNDING_BUDGET.year,
    source: "import_prebuilt",
    sourceFileName: "TitleApp_Financial_Model_v2.xlsx (post-funding target)",
    sheetName: "FY 2026 Post-Funding Target",
    status: "target",
    activatesOn: "2026-10-01",
    lineItems: POSTFUNDING_BUDGET.lineItems.map((l) => ({
      section: l.section,
      name: l.name,
      monthlyCents: Math.round(l.annualCents / 12),
      months: 12,
      periodTotalCents: l.annualCents,
      annualTotalCents: l.annualCents,
    })),
    sectionTotals: { "Operating Expense": annual },
    grandPeriodTotalCents: annual,
    grandAnnualTotalCents: annual,
    monthlyRunRateCents: Math.round(annual / 12),
    notes: "Post-funding target: activates Oct 2026 assuming $2.5M raise closes. Pre-funding actual rate lives in the sibling 'prefunding_active' budget doc.",
    createdAt: TS,
    createdBy: USER_ID,
  }, { merge: true });
  return { budgetId: POSTFUNDING_ID, annual };
}

// ---------------------------------------------------------------------------
// 1b. Pre-funding active budget (May-Sep 2026, current run rate)
// ---------------------------------------------------------------------------
// Annualized current run rate so the Dashboard's forward run rate reflects
// reality. Each line item is set to its actual monthly rate × 12. Pre-funding
// monthly burn = $3,730. Annualized = $44,760.

const PREFUNDING_LINEITEMS = [
  { section: "AI & API",         name: "Anthropic Claude API",                   monthlyCents: 50_000 },
  { section: "AI & API",         name: "Misc API (Helius / Crossmint / fal.ai)", monthlyCents: 5_000 },
  { section: "Infrastructure",   name: "Firebase / GCP / Cloud Run",             monthlyCents: 20_000 },
  { section: "Infrastructure",   name: "Google Drive + other APIs",              monthlyCents: 30_000 },
  { section: "B2B Tools",        name: "Apollo (contact data)",                  monthlyCents: 9_900 },
  { section: "B2B Tools",        name: "Dropbox Sign",                           monthlyCents: 2_500 },
  { section: "Comms",            name: "Google Workspace",                       monthlyCents: 1_400 },
  { section: "Comms",            name: "SendGrid",                               monthlyCents: 2_000 },
  { section: "Comms",            name: "Twilio",                                 monthlyCents: 500 },
  { section: "Data APIs",        name: "Realie / Rentcast / Vincario",           monthlyCents: 10_000 },
  { section: "Marketing",        name: "Marketing spend",                        monthlyCents: 200_000 },
  { section: "Interest Expense", name: "Founder loan interest (4% × $125K)",     monthlyCents: 41_667 },
];

const PREFUNDING_ID = `sociii_fy2026_prefunding_active_v1`;

async function seedPreFundingBudget() {
  const monthlyTotal = PREFUNDING_LINEITEMS.reduce((s, l) => s + l.monthlyCents, 0);
  const annual = monthlyTotal * 12;

  // Compute section totals
  const sectionTotals = {};
  for (const l of PREFUNDING_LINEITEMS) {
    sectionTotals[l.section] = (sectionTotals[l.section] || 0) + l.monthlyCents * 12;
  }

  await db.collection("forwardBudgets").doc(PREFUNDING_ID).set({
    tenantId: TENANT_ID,
    year: 2026,
    source: "import_prebuilt",
    sourceFileName: "Sean estimate 2026-05-26 (pre-funding active)",
    sheetName: "FY 2026 Pre-Funding Active",
    status: "active",
    activeFrom: "2026-05-27",
    activeUntil: "2026-10-01", // expected funding close
    lineItems: PREFUNDING_LINEITEMS.map((l) => ({
      section: l.section,
      name: l.name,
      monthlyCents: l.monthlyCents,
      months: 12,
      periodTotalCents: l.monthlyCents * 12,
      annualTotalCents: l.monthlyCents * 12,
    })),
    sectionTotals,
    grandPeriodTotalCents: annual,
    grandAnnualTotalCents: annual,
    monthlyRunRateCents: monthlyTotal,
    notes: "Pre-funding active run rate. Personal Apple Developer ($99/yr) and domain renewals tracked separately as annual line items, NOT amortized here. Replaced by post-funding target on Oct funding close.",
    createdAt: TS,
    createdBy: USER_ID,
  }, { merge: true });

  return { budgetId: PREFUNDING_ID, monthlyRunRateCents: monthlyTotal, annual };
}

// ---------------------------------------------------------------------------
// 2. Loan agreements
// ---------------------------------------------------------------------------

const LOANS = [
  {
    id: "loan_rosenberg_2024",
    lender: "Robert Rosenberg",
    principalCents: 10_000_000, // $100,000
    interestRatePct: 4,
    accrualBasis: "annual",
    paymentFrequency: "quarterly",
    status: "anticipated_assumption", // Sits on TitleApp LLC until wind-down
    originatedAt: "2024-01-01", // approximate; papering existing handshake
    maturityAt: null,
    personalGuaranty: true,
    notes: "Existing handshake loan papered with personal guaranty. Transfers from TitleApp LLC → SOCIII Inc. on wind-down (Action by Written Consent ~2026-06-12). Decision-review checkpoint Oct 2026.",
  },
  {
    id: "loan_dunn_2024",
    lender: "Chris Dunn (SaoViet ICPD)",
    principalCents: 1_500_000, // $15,000
    interestRatePct: 4,
    accrualBasis: "annual",
    paymentFrequency: "quarterly",
    status: "active",
    originatedAt: "2024-01-15",
    maturityAt: null,
    personalGuaranty: false,
    notes: "Originally $15K bridge loan to HOM DAO Foundation (Jan 2024, 180-day, 10%, non-recourse, +30K pHOM coverage). Renegotiated to 4% cash loan for SOCIII tracking. PHOM coverage status TBD.",
  },
  {
    id: "loan_gibson_2025",
    lender: "Michael Gibson",
    principalCents: 1_000_000, // $10,000
    interestRatePct: 4,
    accrualBasis: "annual",
    paymentFrequency: "quarterly",
    status: "active",
    originatedAt: "2025-01-01", // placeholder; needs actual origination date
    maturityAt: null,
    personalGuaranty: false,
    notes: "Originally a 104,763.79-HOM holder position. Recorded here as $10K cash loan per Sean's current treatment. Side agreement / HOM buyout memorialization pending.",
  },
];

async function seedLoans() {
  for (const loan of LOANS) {
    const ref = db.collection("loanAgreements").doc(loan.id);
    await ref.set({
      tenantId: TENANT_ID,
      loanId: loan.id,
      lender: loan.lender,
      principalCents: loan.principalCents,
      interestRatePct: loan.interestRatePct,
      accrualBasis: loan.accrualBasis,
      paymentFrequency: loan.paymentFrequency,
      status: loan.status,
      originatedAt: loan.originatedAt,
      maturityAt: loan.maturityAt,
      personalGuaranty: loan.personalGuaranty,
      notes: loan.notes,
      createdAt: TS,
      createdBy: USER_ID,
    }, { merge: true });
  }

  const totalPrincipalCents = LOANS.reduce((s, l) => s + l.principalCents, 0);
  return { loanCount: LOANS.length, totalPrincipalCents };
}

// ---------------------------------------------------------------------------
// 3. Custom obligations (interest payments + Oct decision review)
// ---------------------------------------------------------------------------
// Quarterly interest = principal × rate / 4
//   Robert $100K × 4% / 4 = $1,000/qtr
//   Chris  $15K  × 4% / 4 = $150/qtr
//   Michael$10K  × 4% / 4 = $100/qtr
//   Total              = $1,250/qtr
//
// 2026 remaining quarters: Q3 (ends Sep 30), Q4 (ends Dec 31).
// Plus an October checkpoint for the "revisit if no money by Oct" decision.

function quarterlyInterestCents(loan) {
  return Math.round(loan.principalCents * (loan.interestRatePct / 100) / 4);
}

const OBLIGATIONS = [];

for (const loan of LOANS) {
  const qtrCents = quarterlyInterestCents(loan);
  const lenderShort = loan.lender.split(" ")[0].toLowerCase();

  // Q3 2026 interest payment
  OBLIGATIONS.push({
    obligationKey: `loan_interest_${lenderShort}_2026q3`,
    label: `Interest payment — ${loan.lender} (Q3 2026)`,
    detail: `$${(qtrCents / 100).toFixed(2)} due. Principal $${(loan.principalCents/100).toLocaleString()} × ${loan.interestRatePct}% ÷ 4.`,
    dueDate: "2026-09-30",
    severity: "amber",
    kind: "loan_interest",
    loanId: loan.id,
    amountCents: qtrCents,
  });

  // Q4 2026 interest payment
  OBLIGATIONS.push({
    obligationKey: `loan_interest_${lenderShort}_2026q4`,
    label: `Interest payment — ${loan.lender} (Q4 2026)`,
    detail: `$${(qtrCents / 100).toFixed(2)} due. Principal $${(loan.principalCents/100).toLocaleString()} × ${loan.interestRatePct}% ÷ 4.`,
    dueDate: "2026-12-31",
    severity: "amber",
    kind: "loan_interest",
    loanId: loan.id,
    amountCents: qtrCents,
  });
}

// October decision-review checkpoint
OBLIGATIONS.push({
  obligationKey: "loan_decision_review_2026_10",
  label: "Founder loan decision review (Oct 2026)",
  detail: "Per founder note: if no raise/revenue by October, revisit all founder loans. Combined $125K principal across Rosenberg / Dunn / Gibson. Options: refinance, partial paydown, conversion to equity, or extension.",
  dueDate: "2026-10-15",
  severity: "red",
  kind: "decision_checkpoint",
});

async function seedObligations() {
  for (const o of OBLIGATIONS) {
    const ref = db.collection("customObligations").doc(`${TENANT_ID}__${o.obligationKey}`);
    await ref.set({
      tenantId: TENANT_ID,
      obligationKey: o.obligationKey,
      label: o.label,
      detail: o.detail,
      dueDate: o.dueDate,
      severity: o.severity,
      kind: o.kind,
      loanId: o.loanId || null,
      amountCents: o.amountCents || null,
      createdByWorker: "accounting",
      createdAt: TS,
    }, { merge: true });
  }
  return { obligationCount: OBLIGATIONS.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log("\n=== SOCIII FY 2026 Accounting Seed ===\n");
  console.log("Tenant:", TENANT_ID);
  console.log("User:  ", USER_ID);
  console.log();

  // Write post-funding target FIRST so the pre-funding active budget below
  // becomes the latest-by-createdAt and wins the Dashboard's forward-run-rate
  // selector.
  const postBudget = await seedPostFundingBudget();
  console.log("✓ Post-funding target budget seeded:");
  console.log(`  Doc ID:        ${postBudget.budgetId}`);
  console.log(`  Annual total:  $${(postBudget.annual/100).toLocaleString()}  ($38,333/mo)`);
  console.log(`  Status:        target (activates 2026-10-01)`);

  // Wait briefly so createdAt timestamps are reliably distinguishable
  await new Promise((r) => setTimeout(r, 1500));

  const preBudget = await seedPreFundingBudget();
  console.log("\n✓ Pre-funding active budget seeded:");
  console.log(`  Doc ID:          ${preBudget.budgetId}`);
  console.log(`  Monthly run rate: $${(preBudget.monthlyRunRateCents/100).toLocaleString()}`);
  console.log(`  Annual (12mo extrapolation): $${(preBudget.annual/100).toLocaleString()}`);
  console.log(`  Status:          active (May 27 - Oct 1, 2026)`);

  const loans = await seedLoans();
  console.log(`\n✓ Loans seeded: ${loans.loanCount}`);
  console.log(`  Total principal: $${(loans.totalPrincipalCents/100).toLocaleString()}`);

  const obs = await seedObligations();
  console.log(`\n✓ Obligations seeded: ${obs.obligationCount}`);
  console.log(`  Quarterly interest total (all 3 loans): $${LOANS.reduce((s,l) => s + quarterlyInterestCents(l), 0)/100}`);

  console.log("\n=== Done ===\n");
  console.log("Check the Accounting worker in SOCIII workspace:");
  console.log("  - Dashboard → forward run rate should show ~$3,730/mo (pre-funding active)");
  console.log("  - Post-funding target ($38,333/mo) is on file as a sibling budget doc");
  console.log("  - Tax & Filing / Actions → should include 6 quarterly interest payments + Oct decision");
  console.log("  - (Loan agreements tab is not yet wired — data is in Firestore for now)");

  process.exit(0);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
