# W-018 Crowdfunding & Reg D | $79/mo
## Phase 3 — Financing | Standalone

**Headline:** "Raise capital legally from the crowd"

## What It Does
Manages securities-compliant capital raising for real estate projects — Regulation D (506(b), 506(c)), Regulation CF, Regulation A/A+, and intrastate exemptions. Tracks investor qualifications, subscription document execution, fund administration, and ongoing SEC/state reporting requirements.

## RAAS Tier 1 — Regulations
- **Regulation D 506(b)**: Up to unlimited raise from accredited investors + up to 35 sophisticated non-accredited. NO general solicitation. Track: accredited investor self-certification, relationship documentation with non-accredited investors, information requirements for non-accredited (audited financials if >$5M), Form D filing (15 days after first sale), state Blue Sky notice filings.
- **Regulation D 506(c)**: Unlimited raise, general solicitation PERMITTED, but ALL investors must be accredited with reasonable verification steps. Track: third-party verification letters, tax return review, W-2/1099 + credit report, broker/attorney/CPA verification letters. Hard stop: NEVER accept investment without completed verification.
- **Regulation CF**: Up to $5M in 12-month period through registered funding portal. Track: funding portal selection, Form C filing, annual Form C-AR reporting, investment limits per investor (based on income/net worth), 21-day minimum offering period.
- **Regulation A / A+**: Tier 1 (up to $20M, state registration required) or Tier 2 (up to $75M, state preempted). Track: SEC qualification, offering circular, ongoing reporting (Tier 2: annual, semi-annual, current).
- **Anti-Fraud**: Securities Act Section 17(a), Exchange Act Section 10(b) / Rule 10b-5. ALL offering materials must be truthful, not misleading, and include material risk factors. Hard stop: flag any offering language making guarantees or omitting material risks.
- **Bad Actor Disqualification**: Rule 506(d) — check all covered persons (officers, directors, 20%+ owners, promoters) for disqualifying events. Must be done before first sale.
- **State Blue Sky**: Track state-specific requirements — notice filings (506), registration (Reg A Tier 1), investor suitability standards (some states impose additional requirements beyond federal).

## RAAS Tier 2 — Company Policies
- preferred_exemption: "506b" | "506c" | "reg_cf" | "reg_a" | "case_by_case"
- minimum_investment: Minimum per investor (default: $25,000 for 506, $1,000 for CF)
- accredited_verification_method: "self_cert" (506b only) | "third_party" | "tax_return"
- legal_counsel_required: true (default) — all offerings need securities counsel review
- funding_portal: Preferred Reg CF portal (if applicable)

## Capabilities
1. **Exemption Selection** — From raise amount, investor type, and marketing plans, recommend optimal exemption structure. Compare cost, timeline, and restrictions.
2. **Investor Qualification** — Track each investor: accredited status, verification method, verification date, subscription amount, investment limits (Reg CF), suitability review.
3. **Subscription Management** — Track subscription documents: PPM/offering circular delivery, subscription agreement execution, operating agreement execution, wire receipt, countersignature.
4. **Compliance Calendar** — All filing deadlines: Form D (15 days after first sale), Form D amendments (annual), Form C (Reg CF), Blue Sky filings, ongoing reporting deadlines.
5. **Cap Table Management** — Maintain investor cap table: names, amounts, ownership %, preferred return status, distribution history.
6. **Ongoing Reporting** — Generate required periodic reports by exemption type: Reg CF annual (Form C-AR), Reg A semi-annual/annual, 506 K-1 preparation support.

## Vault Data
- **Reads**: W-016 capital_stack (equity raise amount), W-002 deal_analysis (project details for offering materials), W-014 waterfall_models (investor return projections)
- **Writes**: investor_registry, subscription_status, cap_table, compliance_filings → consumed by W-019, W-039, W-051

## Referral Triggers
- PPM/offering circular needs legal review → W-045
- Entity formation for offering → W-046
- Investor distributions due → W-051
- K-1 preparation → W-040
- Investor inquiries/reporting → W-019
- Capital raised impacts stack → W-016

## Document Templates
1. crd-exemption-analysis (PDF) — Exemption comparison and recommendation
2. crd-investor-tracker (XLSX) — All investors with qualification and subscription status
3. crd-compliance-calendar (XLSX) — All filing deadlines by exemption type
4. crd-cap-table (XLSX) — Investor cap table with ownership and distribution tracking
