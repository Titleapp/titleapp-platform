# W-039 Accounting | $59/mo
## Phase 6 — Operations | Standalone

**Headline:** "Books that are always audit-ready"

## What It Does
Manages project and property-level accounting — chart of accounts, general ledger, accounts payable/receivable, bank reconciliation, financial statement preparation, budget vs actual reporting, and audit support. Produces GAAP-compliant financials for ownership, lenders, investors, and tax preparation.

## RAAS Tier 1 — Regulations
- **GAAP Compliance**: Financial statements must follow Generally Accepted Accounting Principles. Track: revenue recognition (ASC 606 for development fees, ASC 842 for leases), cost capitalization vs expensing (ASC 360 for real estate), depreciation methods and useful lives, impairment testing.
- **Tax Basis Accounting**: Many real estate partnerships report on tax basis, not GAAP. Track differences: depreciation (MACRS vs straight-line), cost segregation, bonus depreciation, §1031 exchange basis adjustments. Maintain book-tax reconciliation.
- **Partnership Accounting**: For multi-investor structures — track capital accounts per §704(b), substantial economic effect, partner allocations, guaranteed payments, distribution waterfalls. K-1 preparation support.
- **Construction Accounting**: During development — track percentage of completion, cost-to-cost method, retainage payable/receivable, AIA billing reconciliation, job cost accounting by division.
- **Lender Reporting**: Construction and permanent lenders require periodic financial reporting — operating statements, rent rolls, debt service coverage calculations, covenant compliance. Track formats and deadlines by lender.
- **1099 Reporting**: Track 1099 requirements for vendors/contractors — 1099-NEC for services >$600, 1099-MISC for rents, 1099-INT for interest. Filing deadline January 31.

## RAAS Tier 2 — Company Policies
- chart_of_accounts: Standard COA template (NAREIT, custom, or property-management-industry)
- fiscal_year: Calendar year or alternate fiscal year
- approval_workflow: AP approval levels by amount
- capitalization_threshold: Minimum amount to capitalize vs expense (default: $5,000)
- reporting_frequency: Monthly, quarterly financial statements
- audit_requirements: Annual audit, review, compilation, or none

## Capabilities
1. **Chart of Accounts Management** — Standardized COA for real estate: organized by property, phase (development/operations), and natural account. Consistent across portfolio.
2. **AP/AR Processing** — Track payables: invoice receipt, coding, approval, payment, 1099 tracking. Track receivables: rent billing, tenant charges, collections, write-offs.
3. **Bank Reconciliation** — Reconcile bank accounts monthly. Track outstanding checks, deposits in transit, bank fees. Flag discrepancies.
4. **Financial Statement Preparation** — Generate: income statement, balance sheet, cash flow statement, budget vs actual variance report. By property and consolidated.
5. **Job Cost Reporting** — During construction: cost tracking by CSI division, committed vs actual, budget remaining, projected final cost. Reconcile with W-021 budget.
6. **Draw Reconciliation** — Reconcile construction draws (W-023) with accounting records. Track retainage payable, stored materials, and contractor payments.
7. **Investor Reporting** — Generate investor financial packages: property financials, waterfall calculations, distribution summaries, capital account statements. K-1 preparation support.
8. **Audit Support** — Maintain audit-ready records: document retention, reconciliation workpapers, supporting schedules, confirmation letters.

## Vault Data
- **Reads**: W-023 draw_data (construction costs), W-034 rent_roll (revenue), W-035 work_orders (maintenance costs), W-041 vendor_contracts (AP), W-051 distribution_schedule
- **Writes**: financial_statements, job_cost_reports, ap_ar_status, tax_workpapers → consumed by W-040, W-051, W-019, W-015, W-052

## Referral Triggers
- Tax filing preparation → W-040
- Investor financial reporting → W-019 / W-051
- Lender financial reporting → W-015 / W-052
- Budget variance exceeding threshold → Alex (escalation)
- Construction cost overrun → W-021
- 1099 filing deadline → W-047
- Audit findings requiring action → W-045 (if legal implications)

## Document Templates
1. acct-financial-statements (PDF) — Income statement, balance sheet, cash flow
2. acct-budget-variance (XLSX) — Budget vs actual with variance analysis
3. acct-job-cost-report (XLSX) — Construction cost tracking by division
4. acct-investor-package (PDF) — Financial statements with capital account detail
