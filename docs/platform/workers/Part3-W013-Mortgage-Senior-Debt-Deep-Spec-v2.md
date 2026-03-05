# W-013 Mortgage & Senior Debt | $79/mo (UPDATED)
## Phase 3 — Financing | Standalone

**Headline:** "Know your best loan before the broker calls"

## What It Does
Analyzes permanent debt options: conventional bank, agency (Fannie DUS, Freddie SBL/CME), CMBS, life company, credit union. Sizes loans from binding constraints (LTV, DSCR, debt yield), compares term sheets, models refinance scenarios, tracks rate locks through closing.

## RAAS Tier 1 — Regulations
- **TILA**: APR calculations and disclosure requirements when applicable
- **RESPA**: Settlement cost disclosures and anti-kickback compliance
- **Dodd-Frank ATR/QM**: Ability-to-repay and qualified mortgage standards where applicable
- **Agency (Fannie/Freddie)**: DUS requirements — DSCR minimums (1.25x typical), LTV caps (80% typical), reserves, supplemental loan restrictions, green financing incentives
- **CMBS**: Lockbox/cash management, reserves (tax, insurance, capex, TI/LC), defeasance/yield maintenance, special servicer triggers, B-piece buyer approval
- **Life Company**: Portfolio lender-specific — more flexible, relationship-dependent
- **DISCLAIMER**: "Analysis is informational. Loan terms subject to lender underwriting. Not a commitment to lend."

## RAAS Tier 2 — Company Policies
- target_dscr (1.25x default), max_ltv (75% default), preferred_lenders, rate_lock_policy, prepayment_preference (yield_maintenance/defeasance/step_down/open), recourse_tolerance (full/partial/non-recourse_only)

## Capabilities
1. **Term Sheet Analysis** — Parse: amount, LTV, DSCR, rate (fixed/floating/hybrid), spread, index, term, amort, IO, prepayment, reserves, recourse, origination, exit fees
2. **Loan Sizing** — Three binding constraints: LTV (value × max LTV), DSCR (NOI ÷ min DSCR ÷ debt constant), Debt Yield (NOI ÷ min yield). Binding = lowest proceeds.
3. **Loan Comparison** — Side-by-side across lender types: all-in cost including origination, rate, reserves, prepayment at projected hold, legal. Effective rate and total cost.
4. **Debt Service Schedule** — Full amortization: monthly P&I, annual debt service, IO, remaining balance, balloon. Model rate adjustments for floating/hybrid.
5. **Refinance Analysis** — Payoff + prepayment penalty, new sizing, cash-out, rate comparison, break-even.
6. **Rate Lock Tracking** — Lock dates, expiration, extension fees, float-down provisions, economic triggers.
7. **Reserve Analysis** — Model required reserves: tax, insurance, capex, TI/LC, interest reserve. Impact on net proceeds.

## Vault Data
- **Reads**: W-002 deal_analysis (NOI, cap rate, value), W-016 capital_stack, W-030 appraisal, W-034 rent_roll
- **Writes**: loan_comparison, debt_service_schedule, refinance_models, rate_lock_status → consumed by W-016, W-019, W-039, W-052

## Referral Triggers
- Loan requires title → W-044
- Loan docs need legal review → W-045
- Rate lock decision → Alex (escalation)
- Loan closed → W-052 (debt service monitoring begins)
- Construction-to-perm conversion → W-015
- Loan impacts capital stack → W-016

## Document Templates
1. sd-term-sheet-analysis (PDF)
2. sd-loan-comparison (XLSX)
3. sd-amortization-schedule (XLSX)
4. sd-refinance-analysis (PDF)
