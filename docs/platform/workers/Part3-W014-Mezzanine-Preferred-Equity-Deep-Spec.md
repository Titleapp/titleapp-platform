# W-014 Mezzanine & Preferred Equity | $79/mo
## Phase 3 — Financing | Standalone

**Headline:** "Fill the gap between your debt and your equity"

## What It Does
Analyzes and structures mezzanine debt and preferred equity positions within the capital stack. Compares structures (mezz vs pref equity vs JV equity), models waterfall returns, tracks intercreditor requirements, and produces term sheet comparisons for subordinate capital providers.

## RAAS Tier 1 — Regulations
- **SEC / Securities Laws**: Mezzanine debt and preferred equity interests are securities. Track Regulation D (506(b), 506(c)) exemption requirements, accredited investor verification, Form D filing deadlines (15 days after first sale), Blue Sky state notice filings. Hard stop: NEVER structure an offering that doesn't comply with applicable securities exemptions.
- **ERISA**: Track if any capital source involves pension/retirement funds. ERISA "plan asset" rules can create fiduciary liability for the sponsor. Flag ERISA-sensitive structures.
- **Intercreditor Requirements**: Senior lenders typically require intercreditor agreements with mezz lenders. Track: recognition agreements, standstill periods, cure rights, purchase options, UCC foreclosure rights. CMBS lenders have specific intercreditor templates.
- **UCC Perfection**: Mezzanine debt is secured by pledge of ownership interests (not real property). Track UCC-1 filing, perfection requirements, and priority.
- **Usury**: State usury laws apply to mezzanine loans. Track blended current + accrued rates against state maximums. Some states have commercial loan exemptions.
- **Tax Treatment**: Mezz debt = interest deduction. Pref equity = allocation of partnership income. Track tax treatment differences and impact on investor returns.

## RAAS Tier 2 — Company Policies
- max_ltc_with_mezz: Maximum loan-to-cost including mezz (default: 85%)
- preferred_return_cap: Maximum preferred return willing to offer (default: 15%)
- promote_structure: Standard promote/waterfall tiers
- mezz_vs_pref_preference: "mezzanine" | "preferred_equity" | "case_by_case"

## Capabilities
1. **Gap Analysis** — From W-016 capital stack, identify the gap between senior debt proceeds and total equity. Size the mezz/pref equity need.
2. **Structure Comparison** — Side-by-side: mezz debt vs preferred equity vs JV equity. Compare: cost of capital, control rights, intercreditor friction, foreclosure remedies, tax treatment, balance sheet impact.
3. **Waterfall Modeling** — Full waterfall model: preferred returns (current pay vs accrued), return of capital, promote splits, catch-up provisions, IRR hurdles, clawback provisions. Model multiple scenarios.
4. **Term Sheet Analysis** — Parse mezz/pref equity term sheets: rate (current/accrued), term, extension options, prepayment, exit fee, conversion rights, governance rights, major decision consent rights, guaranty requirements.
5. **Intercreditor Tracking** — Track intercreditor agreement requirements between senior lender and mezz lender: standstill period, cure rights, purchase option pricing, default triggers.
6. **Investor Reporting** — Generate periodic reports for mezz/pref equity investors: current pay distributions, accrued return balance, covenant compliance, project status.

## Vault Data
- **Reads**: W-016 capital_stack (gap size), W-013 loan_terms (senior debt terms for intercreditor), W-002 deal_analysis (project returns), W-019 investor_contacts
- **Writes**: mezz_analysis, waterfall_models, intercreditor_status → consumed by W-016, W-019, W-039, W-051

## Referral Triggers
- Securities compliance needed → W-045 (legal review of PPM/subscription docs)
- Intercreditor negotiation → W-045
- Mezz/pref equity changes capital stack → W-016 (recalculate)
- Investor reporting due → W-019
- Entity formation for mezz structure → W-046
- Tax implications → W-040 (Tax & Assessment)

## Document Templates
1. mpe-structure-comparison (PDF) — Mezz vs pref equity vs JV side-by-side
2. mpe-waterfall-model (XLSX) — Multi-tier waterfall with scenario analysis
3. mpe-term-sheet-analysis (PDF) — Parsed term sheet with key terms highlighted
4. mpe-investor-report (PDF) — Periodic investor status report
