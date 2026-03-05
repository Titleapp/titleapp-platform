# W-044 Title & Escrow | $59/mo
## Horizontal — All Phases | Standalone

**Headline:** "Clean title, clean closing"

## What It Does
Manages title examination, title insurance requirements, escrow coordination, and closing document preparation. Tracks title exceptions, curative requirements, endorsement needs, and closing conditions across the transaction lifecycle.

## RAAS Tier 1 — Regulations
- **RESPA**: Settlement cost disclosures, anti-kickback (Section 8), affiliated business arrangement disclosures. Hard stop: NEVER structure fees/referrals violating RESPA.
- **TILA**: When applicable, APR calculations and Closing Disclosure 3-day delivery rule.
- **State Title Insurance Regs**: Filed rates (in file-rate states), agent licensing, escrow account requirements, title plant requirements.
- **Good Funds Laws**: State-specific — wire transfer, cashier's check, clearance periods.
- **Recording Requirements**: County-specific — document format, margins, font size, consideration statements, transfer tax stamps.
- **ALTA Standards**: Follow ALTA best practices and forms for commitments, policies, endorsements.

## RAAS Tier 2 — Company Policies
- preferred_title_company, standard_endorsements, escrow_disbursement_approval (dual_signature/single/auto), title_review_deadline (10 days), curative_deadline (30 days)

## Capabilities
1. **Title Commitment Review** — Parse Schedule A (insured, coverage, property description), Schedule B-I (requirements), Schedule B-II (exceptions). Flag standard vs non-standard.
2. **Exception Analysis** — Classify each exception: standard, curative, acceptable, deal-killer. Assign responsible party, set deadline, track resolution.
3. **Endorsement Tracking** — Required endorsements by transaction type: survey (ALTA 9), zoning (3.1), access (17), contiguity (19), environmental protection lien.
4. **Escrow Management** — Earnest money, escrow instructions, disbursement conditions, pro-rations, closing statements.
5. **Closing Coordination** — All conditions: title curative, lender requirements, document execution, recording instructions.
6. **Post-Closing** — Recording confirmation, final policy issuance, escrow reconciliation, document distribution.

## Vault Data
- **Reads**: W-002 deal_analysis, W-013/W-015 loan_terms, W-045 contract_terms
- **Writes**: title_status, exception_log, closing_checklist → consumed by W-013, W-015, W-045, W-042

## Referral Triggers
- Exception needs legal cure → W-045
- Lender title requirements → W-013/W-015
- Survey exception → W-003
- Closing scheduled → Alex
- Title cleared → W-042/W-050 (disposition proceeds)

## Document Templates
1. te-title-review (PDF)
2. te-closing-checklist (XLSX)
3. te-escrow-summary (PDF)
4. te-post-closing-tracker (PDF)
