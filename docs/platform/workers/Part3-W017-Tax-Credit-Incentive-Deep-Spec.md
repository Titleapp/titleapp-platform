# W-017 Tax Credit & Incentive | $99/mo
## Phase 3 — Financing | Standalone

**Headline:** "Find every dollar the government will give you"

## What It Does
Identifies, qualifies, and tracks tax credits, incentives, abatements, and subsidies for real estate development. Covers federal (LIHTC, Historic, OZ, NMTC, Energy), state, and local programs. Models credit impact on capital stack and investor returns.

## RAAS Tier 1 — Regulations
- **LIHTC (IRC §42)**: Qualified basis calculations, income/rent restrictions, 15+15yr compliance period, placed-in-service deadlines, 10% carryover test, minimum set-aside elections (20-50 or 40-60), student rule, next available unit rule. Hard stop: NEVER recommend credits exceeding qualified basis limits.
- **Historic Tax Credit (IRC §47)**: Certified historic structure requirements, NPS Part 1/2/3 applications, QRE calculations, 5-year recapture period, substantial rehabilitation test (QRE must exceed adjusted basis or $5K).
- **Opportunity Zone (IRC §1400Z)**: 180-day investment window, 90% asset test (semi-annual), substantial improvement test (double basis in 30 months), original use requirement, sin business exclusions.
- **New Markets Tax Credit (IRC §45D)**: CDE allocation, QLICI requirements, 7-year compliance period, recapture triggers.
- **Energy Credits (IRA)**: IRC §48 ITC, §179D deduction. Prevailing wage and apprenticeship requirements for bonus credits, domestic content, energy community bonuses.
- **State Programs**: State-specific — property tax abatements, TIF districts, state historic credits, brownfield credits, enterprise zone benefits.

## RAAS Tier 2 — Company Policies
- preferred_syndicators, minimum_credit_value (e.g., $0.85/credit LIHTC), compliance_monitoring_frequency (quarterly/annual), legal_counsel_required (true default)

## Capabilities
1. **Incentive Screening** — From project location/type/scope, identify all available credits/incentives at federal, state, local level
2. **Qualification Analysis** — Determine eligibility for each program; identify modifications needed to qualify
3. **Credit Modeling** — Calculate estimated credit amounts, equity pricing, net benefit to capital stack. With/without scenarios.
4. **Application Tracking** — Deadlines, submission status, approval timelines per program
5. **Compliance Calendar** — Reporting deadlines, certification requirements, audit schedules, recapture windows
6. **Syndicator Interface** — Credit summaries for tax credit syndicators: qualified basis, amounts, compliance timeline, projected returns

## Vault Data
- **Reads**: W-002 deal_analysis, W-016 capital_stack, W-021 construction_budget
- **Writes**: incentive_screening, credit_models, compliance_calendar → consumed by W-016, W-019, W-039

## Referral Triggers
- Credit structure needs legal review → W-045
- Credit impacts capital stack → W-016
- Compliance reporting due → W-047
- Credit investor needs reporting → W-019
- Energy credit requires prevailing wage → W-024

## Document Templates
1. tc-incentive-screening (PDF)
2. tc-credit-model (XLSX)
3. tc-compliance-calendar (XLSX)
4. tc-syndicator-summary (PDF)
