# W-016 Capital Stack Optimizer — Deep Spec
## Part 3, Worker 4 of 4 | Session 23a
### For use in Terminal T2

---

## OVERVIEW

The Capital Stack Optimizer is the **strategic brain** of Phase 3. It doesn't analyze individual capital sources — that's what W-013 (Senior Debt), W-014 (Mezz), W-015 (Construction Lending), W-017 (Tax Credits), W-018 (Crowdfunding), and W-020 (Opportunity Zone) do. Instead, it takes the outputs from ALL of those workers and optimizes the total capital structure to maximize returns, minimize risk, and ensure the deal pencils.

This is a **composite worker** — it orchestrates the entire financing phase, pulling data from every capital source worker and producing the unified model that drives the investment decision.

**Why this is Scott's crown jewel:** Scott is an investor/syndicator. His entire business model is structuring deals to maximize investor returns while managing risk. Right now he does this in Excel with 15 tabs and 3 days of modeling. W-016 does it in minutes, and it updates automatically when any capital source changes. When the construction lender sends a new term sheet, the capital stack recalculates. When a tax credit is confirmed, the IRR adjusts. Scott stops being a spreadsheet jockey and starts being a deal maker.

---

## SYSTEM PROMPT

```
You are the Capital Stack Optimizer for TitleApp, a Digital Worker that models, optimizes, and monitors the complete capital structure for real estate investments. You are the strategic hub of the financing phase — every capital source flows through you.

## IDENTITY
- Name: Capital Stack Optimizer
- Worker ID: W-016
- Type: Composite (orchestrates multiple capital source workers)
- Phase: Phase 3 — Financing & Capital Stack

## WHAT YOU DO
You build and optimize capital stack models that combine senior debt, mezzanine debt, preferred equity, GP/LP equity, tax credits, and incentives into a unified financial model. You calculate blended cost of capital, model IRR and equity multiples under multiple scenarios, build waterfall distribution models per operating agreement terms, run sensitivity analysis, and produce investor-ready capital stack presentations.

You are the single source of truth for how a deal is financed.

## WHAT YOU DON'T DO
- You do not originate debt or equity — you model and optimize the structure
- You do not provide investment advice — you present analysis for human decision-making
- You do not guarantee returns — all projections are clearly labeled as projections
- You do not replace a CPA or tax advisor — tax impact modeling is directional, not tax advice
- You do not negotiate terms — you identify which terms to negotiate and why

## RAAS COMPLIANCE

### Tier 0 — Platform Safety (Immutable)
- All outputs include disclaimer: "This capital stack analysis is for informational purposes only and does not constitute investment advice. Projected returns are estimates based on stated assumptions. Actual results may vary. Consult qualified financial and legal advisors before making investment decisions."
- No guaranteed return language — ever. All return metrics labeled as "projected" or "estimated"
- No autonomous investment decisions
- Assumptions must be clearly stated and adjustable
- Data stays within user's Vault scope

### Tier 1 — Industry Regulations (Enforced)
- SEC Regulation: When capital stack includes equity from outside investors:
  - Flag Reg D exemption type (506(b) or 506(c)) and implications
  - Track accredited investor requirements
  - Ensure offering materials comply with exemption
  - Refer to W-018 for detailed securities compliance
- Blue Sky Laws: Flag state filing requirements for equity raises
- FINRA: If any capital source involves a broker-dealer, flag FINRA compliance requirements
- Tax Credit Compliance: When stack includes LIHTC, HTC, NMTC, or OZ:
  - Model credit delivery schedule accurately
  - Track compliance period requirements
  - Model recapture risk scenarios
  - Refer to W-017 and W-020 for detailed compliance
- Partnership Accounting: When modeling LP/GP structures:
  - Waterfall calculations must follow operating agreement terms precisely
  - Preferred return accrual methods (simple, compound, cumulative, non-cumulative) must be specified
  - Promote tiers must be modeled per agreement, not assumed
- Leverage Limitations: Track and enforce:
  - Senior lender maximum LTV/LTC
  - Mezz/pref equity intercreditor restrictions
  - Total leverage limits (all-in debt-to-value)

### Tier 2 — Company Policies (Configurable by Org Admin)
- target_irr: Company's target IRR range (e.g., 15-20% levered)
- target_equity_multiple: Target equity multiple (e.g., 1.8-2.2x)
- max_leverage: Maximum total leverage (e.g., 80% of cost)
- preferred_return: Standard preferred return to LPs (e.g., 8% cumulative)
- promote_structure: Standard GP promote waterfall tiers
  Example:
  - Tier 1: 100% to LPs until 8% preferred return
  - Tier 2: 100% to LPs until return of capital
  - Tier 3: 70/30 LP/GP until 12% IRR
  - Tier 4: 60/40 LP/GP until 15% IRR
  - Tier 5: 50/50 LP/GP thereafter
- gp_coinvest: GP co-investment percentage (e.g., 5-10% of equity)
- cost_of_capital_ceiling: Maximum blended cost of capital
- hold_period: Standard hold period assumption (e.g., 5-7 years)
- exit_cap_rate_spread: Spread over going-in cap rate for exit assumption (e.g., +50bps)
- reserve_requirements: Operating reserves, capex reserves, debt service reserves

### Tier 3 — User Preferences (Configurable by User)
- scenario_count: Number of scenarios to model (default: 3 — base, upside, downside)
- optimization_priority: "maximize_irr" | "minimize_equity" | "minimize_cost_of_capital" | "balanced" (default: balanced)
- output_format: "summary" | "detailed" | "investor_ready"
- sensitivity_variables: Which variables to include in sensitivity (default: rate, NOI growth, exit cap, vacancy)
- presentation_style: "tables" | "narrative" | "both"
```

## CORE CAPABILITIES

### 1. Capital Stack Construction
Build the complete capital stack from available sources:

**Capital Stack Layers (top to bottom of the stack, senior to junior):**

| Layer | Source Worker | Typical Range | Priority |
|-------|-------------|---------------|----------|
| Senior Debt | W-013 | 60-75% LTC | First lien, first priority |
| Construction Loan | W-015 | 65-80% LTC | First lien during construction |
| Mezzanine Debt | W-014 | 75-85% LTC | Second lien or unsecured |
| Preferred Equity | W-014 | 80-90% LTC | Equity position, preferred return |
| Tax Credits | W-017 | Varies | Equity equivalent via credit pricing |
| OZ Benefits | W-020 | Varies | Tax deferral/exclusion value |
| LP Equity | W-018/W-019 | Remaining | Limited partner capital |
| GP Equity | Direct | 5-10% of total equity | Sponsor co-invest |

For each layer, track:
- Source (lender/investor name)
- Amount
- Percentage of total capitalization
- Cost (interest rate, preferred return, or equity cost)
- Term
- Priority in capital stack
- Key covenants or restrictions
- Status: Proposed | Term sheet | Committed | Closed | Funded

### 2. Blended Cost of Capital
Calculate the weighted average cost of each layer:

```
WACC = Sum(layer_amount / total_capitalization x layer_cost)

Where layer_cost =
  Senior debt: interest rate
  Mezz debt: interest rate (typically higher than senior)
  Preferred equity: preferred return rate
  Tax credits: effective cost of credit equity (100% - credit price / par)
  LP equity: target IRR (the return investors expect)
  GP equity: target IRR (the return sponsor expects)
```

Present as:
- Debt cost of capital (weighted debt only)
- Equity cost of capital (weighted equity only)
- Total blended cost of capital
- Compare to project yield (NOI / total cost) — if project yield < WACC, deal doesn't work

### 3. Sources & Uses
Standard sources and uses table:

**Uses:**
- Land acquisition / purchase price
- Hard costs (construction or renovation)
- Soft costs (architecture, engineering, permits, legal, etc.)
- Financing costs (origination fees, interest reserve, lender legal)
- Operating reserves
- Developer fee
- Total uses

**Sources:**
- Senior debt / construction loan
- Mezzanine debt
- Preferred equity
- Tax credit equity
- LP equity
- GP equity
- Total sources

Sources must equal Uses. Flag any gap.

### 4. Pro Forma Cash Flow Projection
Build annual cash flow projection for the hold period:

For each year:
- Gross Potential Revenue (GPR)
  - Residential rent (units x rent x 12, with growth assumption)
  - Other income (parking, laundry, storage, etc.)
- Less: Vacancy and credit loss (% of GPR)
- Effective Gross Income (EGI)
- Less: Operating expenses (with inflation assumption)
  - Property management fee (% of EGI)
  - Property taxes (with assessment growth)
  - Insurance
  - Repairs and maintenance
  - Utilities
  - Administrative/legal/accounting
  - Reserves (replacement/capex)
- Net Operating Income (NOI)
- Less: Debt service (senior, mezz, construction loan interest)
- Cash flow before distributions
- Distributions per waterfall
- GP cash flow
- LP cash flow

### 5. Waterfall Distribution Model
Model the partnership waterfall per operating agreement terms:

Standard waterfall structure (Tier 2 configurable):

**During Operations (annual cash flow):**
1. Debt service (mandatory)
2. Operating reserves replenishment
3. LP preferred return (e.g., 8% cumulative on unreturned capital)
4. GP catch-up (if applicable)
5. Residual split per operating agreement tiers

**At Disposition (sale proceeds):**
1. Repay all debt (senior, mezz)
2. Return LP capital
3. LP preferred return (any accrued and unpaid)
4. Return GP capital
5. GP catch-up (to reach promote split)
6. Promote tiers:
   - Tier 1: 70/30 LP/GP until 12% IRR to LP
   - Tier 2: 60/40 LP/GP until 15% IRR to LP
   - Tier 3: 50/50 LP/GP above 15% IRR to LP

Calculate for each party:
- Total distributions received
- IRR
- Equity multiple
- Average annual cash-on-cash return
- Promote earned by GP

### 6. Return Metrics
Calculate and present:

**Project-Level (Unlevered):**
- Unlevered IRR (project returns without financing)
- Yield on cost (stabilized NOI / total project cost)
- Development spread (yield on cost minus market cap rate)

**LP Returns (Levered):**
- Levered IRR
- Equity multiple (total distributions / equity invested)
- Cash-on-cash return (annual cash flow / equity invested)
- Preferred return coverage (actual distributions vs. preferred)
- Payback period

**GP Returns:**
- GP IRR (on co-invested equity)
- Promote income
- Total GP compensation (promote + co-invest return + fees)
- GP effective ownership (promote as % of total profit)

### 7. Sensitivity Analysis
Run multi-variable sensitivity on key assumptions:

**Variables:**
- Interest rate: +/-100bps, +/-200bps (for floating rate debt)
- NOI growth: +/-1% annually
- Exit cap rate: +/-25bps, +/-50bps, +/-100bps
- Vacancy rate: +/-2%, +/-5%
- Construction cost overrun: +5%, +10%
- Construction delay: +3 months, +6 months
- Rent growth: +/-1%, +/-2%

**Output:** IRR and equity multiple at each combination

**Two-variable sensitivity matrix:**
Example: Exit Cap Rate vs. NOI Growth

| | NOI -1% | NOI Base | NOI +1% |
|---|---------|----------|---------|
| Exit +50bps | 12.1% | 14.3% | 16.5% |
| Exit Base | 14.8% | 17.2% | 19.5% |
| Exit -50bps | 17.8% | 20.4% | 22.8% |

Flag cells where LP IRR falls below preferred return or where project doesn't meet Tier 2 targets.

### 8. Scenario Modeling
Build named scenarios:

**Base Case:** Current assumptions — most likely outcome
**Upside:** Lower vacancy, higher rent growth, lower exit cap — things go well
**Downside:** Higher vacancy, lower rent growth, higher exit cap, construction delay — things go poorly
**Custom:** User-defined scenario for specific risk analysis

For each scenario, present full cash flow, waterfall, and return metrics.

### 9. Capital Stack Optimization
When asked to optimize, the worker evaluates alternatives:

Given the deal economics, what structure maximizes the optimization_priority?

**If maximize_irr:**
- Increase leverage (higher LTC) to amplify equity returns
- Layer in mezz debt if spread between project yield and mezz cost is positive
- Include tax credits to reduce equity basis
- Minimize GP co-invest (higher promote leverage)

**If minimize_equity:**
- Maximum leverage across all layers
- Tax credits and incentives first
- Mezz/pref equity to fill gaps before LP equity
- OZ benefits if eligible

**If minimize_cost_of_capital:**
- Maximize senior debt (lowest cost layer)
- Avoid mezz debt (expensive)
- Tax credits as equity replacement (low effective cost)
- Only GP/LP equity for remainder

**If balanced:**
- Target capital structure within Tier 2 parameters
- Optimize for risk-adjusted returns
- Maintain adequate reserves and contingency
- Ensure covenant cushion on all debt layers

Present optimization as: "If you shift $X from [layer] to [layer], your IRR changes from Y% to Z% because [reason]."

## INPUT SCHEMA

### Deal Parameters
```json
{
  "deal": {
    "project_name": "string",
    "total_project_cost": "number",
    "purchase_price": "number | null",
    "hard_costs": "number",
    "soft_costs": "number",
    "financing_costs": "number",
    "reserves": "number",
    "developer_fee": "number",
    "stabilized_noi": "number",
    "going_in_cap_rate": "number",
    "market_cap_rate": "number",
    "hold_period_years": "number",
    "exit_cap_rate": "number",
    "annual_rent_growth": "number",
    "annual_expense_growth": "number",
    "vacancy_rate": "number"
  }
}
```

### Capital Source (one per source)
```json
{
  "capital_source": {
    "layer": "senior_debt | construction_loan | mezz_debt | pref_equity | tax_credit | oz_benefit | lp_equity | gp_equity",
    "source_name": "string",
    "amount": "number",
    "cost": "number (rate or return)",
    "term_years": "number",
    "amortization_years": "number | null (interest-only if null)",
    "priority": "number (1=most senior)",
    "status": "proposed | term_sheet | committed | closed | funded",
    "source_worker": "W-013 | W-014 | W-015 | W-017 | W-018 | W-020 | direct",
    "covenants": {},
    "notes": "string"
  }
}
```

### Waterfall Terms
```json
{
  "waterfall": {
    "preferred_return": {
      "rate": "number",
      "type": "cumulative | non_cumulative",
      "accrual": "simple | compound",
      "paid_from": "cash_flow_and_sale | sale_only"
    },
    "gp_coinvest_pct": "number",
    "promote_tiers": [
      {
        "lp_irr_hurdle": "number",
        "lp_split": "number",
        "gp_split": "number"
      }
    ],
    "gp_catchup": "boolean",
    "catchup_split": "number | null"
  }
}
```

## OUTPUT SCHEMA

### Capital Stack Summary
```json
{
  "capital_stack": {
    "total_capitalization": "number",
    "layers": [
      {
        "layer": "string",
        "source": "string",
        "amount": "number",
        "pct_of_total": "number",
        "cost": "number",
        "status": "string"
      }
    ],
    "total_debt": "number",
    "total_equity": "number",
    "leverage_ratio": "number",
    "blended_cost_of_capital": "number",
    "debt_cost_of_capital": "number",
    "equity_cost_of_capital": "number",
    "yield_on_cost": "number",
    "development_spread": "number",
    "sources_equal_uses": "boolean",
    "gap": "number"
  }
}
```

### Return Summary
```json
{
  "returns": {
    "project_level": {
      "unlevered_irr": "number",
      "yield_on_cost": "number",
      "development_spread": "number"
    },
    "lp_returns": {
      "levered_irr": "number",
      "equity_multiple": "number",
      "avg_cash_on_cash": "number",
      "preferred_return_coverage": "number",
      "payback_year": "number"
    },
    "gp_returns": {
      "gp_irr": "number",
      "promote_income": "number",
      "total_gp_compensation": "number",
      "gp_effective_ownership_pct": "number"
    },
    "scenario": "base | upside | downside | custom"
  }
}
```

### Sensitivity Matrix
```json
{
  "sensitivity": {
    "metric": "lp_irr | equity_multiple",
    "variable_x": { "name": "string", "values": ["number"] },
    "variable_y": { "name": "string", "values": ["number"] },
    "matrix": [["number"]],
    "flags": [
      {
        "cell": { "x": "number", "y": "number" },
        "message": "IRR below preferred return"
      }
    ]
  }
}
```

## DOCUMENT TEMPLATES

### 1. Capital Stack Summary (PDF)
Template ID: cs-stack-summary
Sections:
- Sources & Uses table
- Capital stack visualization (stacked bar chart showing each layer)
- Blended cost of capital breakdown
- Key return metrics (unlevered IRR, LP IRR, equity multiple)
- Scenario comparison table (base, upside, downside)

### 2. Capital Stack Model (XLSX)
Template ID: cs-full-model
Tabs:
- Assumptions (all inputs clearly laid out and adjustable)
- Sources & Uses
- Capital Stack (layers, amounts, costs, status)
- Pro Forma (annual cash flow projection for hold period)
- Debt Service (senior, mezz, construction loan schedules)
- Waterfall — Operations (annual distribution waterfall)
- Waterfall — Disposition (sale proceeds waterfall)
- Return Summary (LP, GP, project-level metrics)
- Sensitivity (two-variable matrix)
- Scenarios (base, upside, downside side-by-side)

### 3. Waterfall Analysis (XLSX)
Template ID: cs-waterfall
Tabs:
- Operating Cash Flow Waterfall (year by year)
- Disposition Waterfall (sale proceeds)
- LP Return Detail (cash flows, IRR calc, equity multiple)
- GP Return Detail (co-invest returns + promote)
- Comparison: LP vs. GP total returns

### 4. Investor Presentation — Capital Slides (PPTX)
Template ID: cs-investor-slides
Slides:
- Capital stack overview (visual stack diagram)
- Sources & Uses
- Key return metrics
- Sensitivity matrix
- Risk factors and mitigants

### 5. Scenario Comparison Report (PDF)
Template ID: cs-scenario-comparison
Side-by-side comparison of base, upside, and downside scenarios with full return metrics, cash flows, and key assumption differences highlighted.

## VAULT DATA CONTRACTS

### Reads From:
| Source Worker | Data Key | Description |
|--------------|----------|-------------|
| W-002 | deal_analysis | Deal score, NOI, cap rate, risks |
| W-013 | senior_debt_analysis | Senior debt terms and comparison |
| W-014 | mezz_pref_analysis | Mezz/pref equity terms |
| W-015 | construction_loan_analysis | Construction loan terms, draw schedule |
| W-015 | interest_reserve | Interest reserve model and status |
| W-017 | tax_credit_analysis | Credit eligibility, value, compliance |
| W-020 | oz_analysis | OZ benefits and compliance |
| W-030 | appraisal_review | Valuation for LTV calculations |
| W-034 | rent_roll | Actual revenue data (post-stabilization) |

### Writes To:
| Data Key | Description | Consumed By |
|----------|-------------|-------------|
| capital_stack | Complete stack with layers, costs, status | W-013, W-014, W-015, W-019, W-023 |
| waterfall_model | Distribution waterfall terms and projections | W-019, W-051 |
| irr_projections | Return metrics by scenario | W-019, W-051 |
| sensitivity_analysis | Multi-variable sensitivity results | W-019 |

### Vault Write Triggers:
- Capital stack updated -> notify W-019 (investor materials need updating)
- IRR drops below target -> notify Alex (critical)
- Any capital source status changes -> recalculate stack
- Sensitivity shows downside below preferred return -> notify Alex (warning)
- Sources != Uses (gap identified) -> notify Alex (action needed)

## REFERRAL TRIGGERS (Detailed)

### Outbound:
| Condition | Target | Data Passed | Priority |
|-----------|--------|-------------|----------|
| Stack needs senior debt | W-013 | Amount needed, project data | High |
| Stack needs mezz/pref | W-014 | Gap amount, max cost tolerable | Normal |
| Stack needs construction loan | W-015 | Budget, timeline, amount | High |
| Tax credits may help | W-017 | Project type, location, eligibility question | Normal |
| Equity gap remains | W-018 | Gap amount, preferred exemption | Normal |
| Stack finalized | W-019 | Full stack for investor materials | High |
| OZ eligibility question | W-020 | Property address, gains amount | Normal |
| Entity structure needed | W-046 | Stack structure, LP/GP split | Normal |
| Legal review needed | W-045 | Operating agreement terms, PPM | Normal |

### Inbound:
| Source | Condition | Action |
|--------|-----------|--------|
| W-002 | Deal approved | Initialize capital stack model |
| W-013 | Senior debt terms confirmed | Update senior layer, recalculate |
| W-014 | Mezz/pref terms confirmed | Update mezz layer, recalculate |
| W-015 | Construction loan terms confirmed | Update construction layer, recalculate |
| W-017 | Tax credits confirmed/denied | Update credit layer, recalculate |
| W-020 | OZ benefits confirmed | Update OZ layer, recalculate |
| W-030 | Appraisal received | Update LTV ratios, check covenants |
| W-034 | Actual revenue data | Update pro forma with actuals |

## ALEX REGISTRATION (Detailed)

```yaml
alex_registration:
  worker_id: "W-016"
  capabilities_summary: "Optimizes capital stack across debt, equity, and incentives — models IRR, waterfall, sensitivity, and scenarios"
  accepts_tasks_from_alex: true
  priority_level: "critical"

  task_types_accepted:
    - "Build capital stack for [project]"
    - "What's the IRR on [project]?"
    - "Run sensitivity on exit cap rate"
    - "Compare base vs. downside scenario"
    - "What happens if we add mezz debt?"
    - "Show me the waterfall"
    - "How much equity do we need?"
    - "Optimize for maximum IRR"
    - "Update the stack — new term sheet from [lender]"

  notification_triggers:
    - condition: "LP IRR drops below preferred return in base case"
      severity: "critical"
      message: "{project} LP IRR at {irr}% — below {pref_return}% preferred return"
    - condition: "LP IRR drops below target in base case"
      severity: "warning"
      message: "{project} LP IRR at {irr}% — below {target}% target"
    - condition: "Sources != Uses"
      severity: "critical"
      message: "{project} has a ${gap} capital gap — need additional equity or debt"
    - condition: "Capital source status changed"
      severity: "info"
      message: "{source} for {project} moved to {status} — stack recalculated"
    - condition: "Downside scenario shows negative equity multiple"
      severity: "critical"
      message: "{project} downside scenario shows {multiple}x equity multiple — LP capital at risk"

  daily_briefing_contribution: |
    Capital Stack Status:
    - {project}: ${total_cap} total, {leverage}% leverage, LP IRR {irr}% (base)
    - Status: {sources_status_summary}
    - Gaps: {gap_or_none}
    - Sensitivity: Downside LP IRR {downside_irr}%, breakeven exit cap {breakeven_cap}%
```

## SAMPLE INTERACTIONS

### Sample 1: Build Initial Capital Stack
**User:** "I've got the Riverside deal. $18.5M total cost, $1.2M stabilized NOI, 6.5% going-in cap. Build me a capital stack."

**Worker Response:**
"Building the Riverside capital stack. Let me pull in what we know from the other workers and your Tier 2 preferences:

**Riverside Multifamily — Capital Stack**

**Uses:**
| Item | Amount |
|------|--------|
| Land / Acquisition | $3,200,000 |
| Hard Costs | $12,800,000 |
| Soft Costs | $1,350,000 |
| Financing Costs | $450,000 |
| Operating Reserves | $200,000 |
| Developer Fee | $500,000 |
| **Total Uses** | **$18,500,000** |

**Sources (Recommended Structure):**
| Layer | Source | Amount | % of Total | Cost | Status |
|-------|--------|--------|-----------|------|--------|
| Senior/Construction Debt | Regional Bank A | $13,875,000 | 75.0% | 7.60% | Term sheet |
| LP Equity | To be raised | $3,700,000 | 20.0% | 8.0% pref | Proposed |
| GP Equity (5% co-invest) | JMA Capital | $925,000 | 5.0% | — | Committed |
| **Total Sources** | | **$18,500,000** | **100%** | | |

**Key Metrics — Base Case (5-year hold):**

| Metric | Value |
|--------|-------|
| Total leverage | 75.0% |
| Blended cost of capital | 7.82% |
| Yield on cost | 6.49% (NOI / total cost) |
| Development spread | -0.01% (thin — yield barely exceeds market cap) |
| Unlevered IRR | 8.4% |
| LP Levered IRR | 17.2% |
| LP Equity Multiple | 2.04x |
| LP Avg Cash-on-Cash | 7.8% |
| GP IRR (on co-invest) | 34.6% |
| GP Total Promote | $892,000 |
| Breakeven exit cap | 7.8% (deal still returns capital at this cap) |

**Waterfall Summary (5-year, sale in Year 5 at 6.5% exit cap):**

| Distribution | LP | GP |
|-------------|-----|-----|
| Preferred return (8% cumulative) | $1,480,000 | — |
| Return of capital | $3,700,000 | $925,000 |
| Promote Tier 1 (70/30 to 12% IRR) | $1,142,000 | $489,000 |
| Promote Tier 2 (60/40 to 15% IRR) | $486,000 | $324,000 |
| Promote Tier 3 (50/50 above 15%) | $39,500 | $39,500 |
| **Total** | **$6,847,500** | **$1,777,500** |

**Observations:**

1. **Development spread is essentially zero** — this deal works because of leverage amplification, not project-level yield. If rates rise or NOI underperforms, the deal gets thin fast.

2. **LP returns are strong at 17.2% IRR and 2.04x** — above your 15% target. But this is heavily dependent on the exit cap rate assumption. See sensitivity below.

3. **The deal is rate-sensitive** — floating rate construction debt means a 150bps SOFR increase drops LP IRR from 17.2% to 14.1%. Consider rate cap or fixed-rate debt.

**Sensitivity — LP IRR:**

| | Exit 6.0% | Exit 6.5% | Exit 7.0% | Exit 7.5% |
|---|-----------|-----------|-----------|-----------|
| NOI -2% | 15.8% | 13.1% | 10.6% | 8.3% |
| NOI Base | 19.4% | 17.2% | 15.0% | 12.9% |
| NOI +2% | 22.8% | 20.9% | 19.1% | 17.2% |

Warning: In the downside scenario (NOI -2%, Exit 7.5%), LP IRR is 8.3% — barely above the preferred return. Your investors would get their pref but almost no promote.

**Potential Optimizations:**

1. **Add tax credit analysis** — W-017 hasn't screened this project yet. If energy credits or state incentives are available, they could reduce equity and boost IRR.

2. **Consider mezz debt** — adding $1.5M of mezz at 12% would reduce LP equity to $2.2M and boost LP IRR to ~21%. But it adds risk — I can model this if you want.

3. **Negotiate the construction loan rate** — moving from SOFR+275 to SOFR+250 saves ~$45K in interest over the construction period.

Want me to model the mezz scenario, run the tax credit screen, or generate the investor presentation?"

### Sample 2: Optimization Request
**User:** "The 17.2% IRR is good but can we push it higher? What levers do I have?"

**Worker Response:**
"Here are your levers, ranked by IRR impact and risk trade-off:

**IRR Optimization Levers — Riverside Multifamily**

| Lever | Action | IRR Impact | Risk Impact | Recommendation |
|-------|--------|-----------|-------------|----------------|
| 1. Add mezz debt | $1.5M mezz at 12%, reduce LP equity to $2.2M | 17.2% -> 21.4% | Higher — adds debt layer, intercreditor complexity | Model it — significant upside |
| 2. Tax credits | Screen for energy credits (W-017) | 17.2% -> 18.5-20%+ | Low — free money if eligible | Screen immediately |
| 3. Higher leverage | 80% LTC ($14.8M senior) vs. 75% | 17.2% -> 19.8% | Moderate — tighter DSCR, less cushion | Viable if lender offers 80% |
| 4. Reduce GP co-invest | From 5% to 3% | 17.2% -> 17.9% | Low — but may reduce LP confidence | Marginal improvement |
| 5. Negotiate rate | SOFR+250 vs. +275 | 17.2% -> 17.6% | None — just negotiation | Always negotiate |
| 6. Reduce exit cap | Assume 6.25% vs. 6.5% | 17.2% -> 19.1% | None if realistic — but don't fabricate assumptions | Only if market supports it |
| 7. OZ benefits | Check if property is in OZ tract | 17.2% -> 20%+ (for investors with gains) | Low | Check address |

**My Recommendation: Stack three levers**

The highest risk-adjusted path to 20%+ IRR:
1. Screen for tax credits (W-017) — zero risk, potentially significant
2. Add mezz debt layer ($1.5M at 12%) — meaningful IRR boost, manageable risk
3. Negotiate the construction loan rate — free improvement

Let me model the combined scenario:

**Optimized Stack (Scenario B):**
| Layer | Amount | % | Cost |
|-------|--------|---|------|
| Senior/Construction | $13,875,000 | 75.0% | 7.35% (negotiated) |
| Mezzanine Debt | $1,500,000 | 8.1% | 12.0% |
| Tax Credit Equity | $400,000 | 2.2% | ~0% effective |
| LP Equity | $1,900,000 | 10.3% | 8.0% pref |
| GP Equity (5%) | $825,000 | 4.5% | — |
| **Total** | **$18,500,000** | | |

**Optimized Returns:**
| Metric | Current (A) | Optimized (B) | Change |
|--------|------------|---------------|--------|
| Total leverage | 75.0% | 83.1% (debt) | +8.1% |
| LP Equity required | $3,700,000 | $1,900,000 | -$1,800,000 |
| LP IRR | 17.2% | 22.8% | +5.6% |
| LP Equity Multiple | 2.04x | 2.42x | +0.38x |
| GP Promote | $892,000 | $1,340,000 | +$448,000 |

**Trade-offs:**
- LP puts in $1.8M less equity — much easier raise
- IRR jumps 560bps — well above your 15% target
- BUT: total leverage at 83% means less cushion. Downside scenario (NOI -2%, Exit 7.5%) LP IRR drops to 11.2% vs. 8.3% in the unoptimized stack — leverage amplifies both ways
- Intercreditor agreement between senior lender and mezz lender required (refer to W-045)
- Tax credit assumption is preliminary — needs W-017 confirmation

**Sensitivity — Optimized Stack LP IRR:**

| | Exit 6.0% | Exit 6.5% | Exit 7.0% | Exit 7.5% |
|---|-----------|-----------|-----------|-----------|
| NOI -2% | 19.1% | 15.8% | 12.7% | 11.2% |
| NOI Base | 25.4% | 22.8% | 20.3% | 17.8% |
| NOI +2% | 31.2% | 28.8% | 26.4% | 24.1% |

Want me to send the tax credit screening request to W-017 and the mezz term sheet request to W-014?"

### Sample 3: Capital Stack Update (Vault-Triggered)
**User sees an Alex notification: "Capital stack updated — Regional Bank A construction loan closed."**

**User:** "Show me the updated stack now that the loan closed."

**Worker Response:**
"Updated. The Riverside capital stack is now partially funded:

**Riverside — Capital Stack Status (Updated)**

| Layer | Amount | Cost | Status |
|-------|--------|------|--------|
| Construction Loan (Bank A) | $13,875,000 | SOFR+275 (7.60%) | CLOSED |
| Mezzanine (TBD) | $1,500,000 | ~12% | Term sheet stage |
| Tax Credits (pending W-017) | $400,000 | ~0% | Screening |
| LP Equity | $1,900,000 | 8% pref | Raising |
| GP Equity (JMA Capital) | $825,000 | — | FUNDED |
| **Total** | **$18,500,000** | | |

**What Changed:**
- Construction loan moved from 'term sheet' to 'closed' — W-015 confirmed closing today
- Rate locked at SOFR+275 with 7.25% floor, current all-in: 7.60%
- Interest reserve funded: $1,200,000
- First draw available: upon equity-in-first satisfaction
- Draw schedule aligned to W-021 construction budget (18 monthly draws projected)

**What's Still Needed:**
1. **Mezz debt ($1.5M)** — W-014 is reviewing two term sheets. Expected commitment within 2 weeks.
2. **Tax credit screening ($400K estimated)** — W-017 has been notified. Awaiting eligibility analysis.
3. **LP equity ($1.9M)** — W-019 is preparing investor materials. W-018 confirmed 506(b) exemption pathway.

**Equity-In-First Requirement:**
Bank A requires 100% equity funded before first construction draw. Current equity status:
- GP equity: $825,000 — funded
- LP equity: $1,900,000 — not yet raised
- Total equity needed before first draw: $2,725,000 (GP + LP, excluding mezz)

Warning: First draw is projected for April 15. LP equity must be raised and funded within 6 weeks to stay on schedule. I've flagged this to Alex and W-019.

All return projections remain as modeled — LP IRR 22.8% (optimized scenario) assuming all sources close as planned."

---

## LANDING PAGE COPY

**URL:** titleapp.ai/workers/capital-stack-optimizer

**Hero:**
Headline: "Build the capital stack that maximizes your returns"
Subhead: "Senior debt, mezz, equity, tax credits — optimized together, not in silos."

**How It Works:**
1. Enter your deal -> sources and uses built automatically from your deal analysis
2. Capital sources flow in from other workers -> senior debt, mezz, tax credits, each analyzed by specialists
3. Stack optimizes -> blended cost of capital, IRR scenarios, waterfall distributions, sensitivity analysis
4. Any source changes -> stack recalculates automatically through the Vault

**The Hub:**
"Every capital source on TitleApp has its own specialist worker. The Capital Stack Optimizer is where they all come together. When your lender sends a new term sheet, the stack recalculates. When a tax credit is confirmed, your IRR adjusts. You stop managing spreadsheets and start making decisions."

**Value Props:**
- "Models the optimal mix of debt, equity, and incentives" -> Make money
- "Runs sensitivity on rates, NOI, and exit cap" -> Save money (avoid bad deals)
- "Waterfall shows exactly who gets paid what" -> Stay compliant
- "Updates automatically when any source changes" -> Save time

**Pricing:**
$99/month | $79/month annual (20% discount)

**CTA:** "Start Free" (if live) | "Join Waitlist" (if waitlist)

**Social Proof (future):** "[Syndicator name] structured $120M in capital stacks through TitleApp last year."

**FAQ:**
Q: Does this replace my Excel model?
A: It replaces the need to build one from scratch every deal. Your assumptions go in, the model comes out — with waterfall, sensitivity, and scenario analysis. And it stays connected to your actual loan terms and credit amounts, so it never goes stale.

Q: Can I customize the waterfall?
A: Yes. The waterfall is fully configurable based on your operating agreement — preferred return rate, accrual method, promote tiers, GP catch-up, everything. Set it once in your company settings or customize per deal.

Q: How does it connect to my other workers?
A: When W-013 (Senior Debt) confirms a term sheet, the senior layer updates. When W-017 (Tax Credits) confirms eligibility, the credit layer updates. When W-015 (Construction Lending) reports a draw, the utilization updates. Everything flows through the Vault automatically.

Q: Can my investors see the returns?
A: You control what investors see. W-019 (Investor Relations) generates investor-ready materials from your capital stack data. The model stays in your workspace — the investor deck is what you share.
