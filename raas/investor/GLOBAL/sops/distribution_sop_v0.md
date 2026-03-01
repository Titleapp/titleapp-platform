# SOP: Distribution Calculation & Payment

**Version:** v0
**Domain:** Investor Relations
**Last Updated:** 2026-03-01

## Purpose

Define the process for calculating, allocating, and distributing returns to investors according to the deal's waterfall structure.

## Trigger Events

Distributions are initiated when:
- Property disposition (sale proceeds)
- Refinance (excess proceeds)
- Scheduled cash distributions (monthly/quarterly)
- Fund wind-down / final distribution

## Process

### Step 1: Determine Distributable Amount

1. Calculate gross proceeds from event
2. Subtract transaction costs, reserves, and obligations
3. Result = Net Distributable Amount

### Step 2: Run Waterfall Calculation

Standard 4-tier waterfall (configurable per deal):

**Tier 1 — Return of Capital**
- 100% to investors until all contributed capital returned
- Pro-rata among all investors based on commitment percentage

**Tier 2 — Preferred Return**
- Cumulative preferred return (typically 8% annual)
- 100% to LPs until preferred return fully satisfied
- Accrues from date of capital contribution

**Tier 3 — GP Catch-Up**
- 100% to GP until GP has received target carry percentage of total profits
- Typically 20% catch-up to align GP with stated carry

**Tier 4 — Carried Interest Split**
- Remaining proceeds split per deal terms (typically 80/20 LP/GP)
- "Promote" or "carry" to GP for performance

### Step 3: Allocate to Individual Investors

1. Determine each investor's pro-rata share:
   `investor_share = investor_commitment / total_commitments`
2. Apply share to LP distribution amount from waterfall
3. Round to 2 decimal places (any rounding remainder to largest investor)

### Step 4: Generate Distribution Notice

1. Create distribution notice for each investor showing:
   - Distribution date
   - Source (sale, refi, operating cash flow)
   - Gross amount
   - Their allocation
   - Cumulative distributions to date
   - Remaining capital account balance
2. Send via configured communication channel
3. Record in `irDistributions` collection

### Step 5: Process Payment

1. Payment methods: ACH, wire transfer, check
2. Record payment date and method
3. Update investor capital account
4. Update deal cumulative distributions

### Step 6: Tax Reporting

1. Track distributions by character (return of capital vs. income vs. capital gain)
2. Flag K-1 implications
3. Retain records for tax year reporting

## Audit Trail

Every distribution must record:
- Deal ID and name
- Distribution date and source
- Total distributed amount
- Waterfall calculation details (tier-by-tier)
- Individual investor allocations
- Payment method and confirmation
- Approving administrator

## Frequency

| Distribution Type | Typical Frequency |
|-------------------|-------------------|
| Operating cash flow | Monthly or quarterly |
| Refinance proceeds | Event-driven |
| Sale proceeds | Event-driven |
| Fund distributions | Quarterly |
| Final distribution | End of fund life |
