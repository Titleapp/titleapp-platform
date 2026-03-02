# TitleApp — Universal RAAS Scaffold & Complete Worker Catalog
## Session 23a | March 2, 2026

---

## 1. Four-Tier RAAS Compliance Architecture

Tiers cascade — lower tier cannot be overridden by higher tier.

### Tier 0 — Platform Safety (Immutable)
- No harmful content generation
- No impersonation of licensed professionals (lawyers, CPAs, engineers, brokers)
- Workers ADVISE and ANALYZE, never execute transactions
- All outputs include domain-appropriate disclaimers
- Data stays within user's Vault scope (Org, Personal, Shared)
- PII follows platform encryption and access control
- No cross-Vault access without explicit Shared workspace invitation

### Tier 1 — Industry Regulations (Per suite)
- Real Estate: Fair Housing, RESPA, TILA, Dodd-Frank, state licensing
- Construction: OSHA, ICC codes, ADA/FHA, Davis-Bacon
- Finance: SEC (Reg D/A+/CF), FINRA, Blue Sky laws, accredited investor
- Environmental: NEPA, CEQA, ESA, Clean Water Act, NHPA Section 106
- Insurance: State DOI, surplus lines, NAIC standards

### Tier 2 — Company Policies (Org admin)
- Investment thesis, approval workflows, preferred vendors, templates, risk tolerance, branding

### Tier 3 — User Preferences (Individual)
- Communication style, output formats, notifications, dashboard layout, units, language

---

## 2. Universal Worker Schema

```yaml
worker:
  id: "W-XXX"
  name: "Display Name"
  slug: "url-slug"
  suite: "suite-name"
  phase: "Phase X — Phase Name"
  type: "standalone|pipeline|composite|copilot"
  pricing: { monthly: XX, annual_discount: "20%" }
  status: "live|development|waitlist"
  raas:
    tier_0: "inherited"
    tier_1: []
    tier_2_schema: []
    tier_3_schema: []
  capabilities:
    inputs: []
    outputs: []
    documents: []
    analyzes: []
  vault:
    reads_from: []
    writes_to: []
    triggers: []
  referrals:
    receives_from: []
    sends_to: []
    trigger_conditions: []
  alex_registration:
    capabilities_summary: ""
    accepts_tasks_from_alex: true
    priority_level: "critical|high|normal|low"
    notification_triggers: []
    daily_briefing_contribution: ""
  landing:
    headline: ""
    subhead: ""
    value_props: []
    cta: "Start Free | Join Waitlist"
```

---

## 3. Universal Disclaimers by Domain

| Domain | Disclaimer |
|--------|-----------|
| Financial Analysis | "For informational purposes only. Not investment advice. Consult a licensed financial advisor." |
| Legal / Contracts | "For informational purposes only. Not legal advice. Consult a licensed attorney." |
| Tax / Accounting | "For informational purposes only. Not tax advice. Consult a licensed CPA." |
| Construction / Engineering | "Does not replace licensed professional engineering review." |
| Environmental | "Preliminary review only. Does not replace formal environmental assessment." |
| Insurance | "For informational purposes only. Consult a licensed insurance professional." |
| Real Estate Brokerage | "Not a broker opinion of value. Consult a licensed real estate professional." |
| Appraisal | "Not a certified appraisal. Obtain a certified appraisal for lending/legal purposes." |

---

## 4. Worker Deploy Gate Checklist

- [ ] Worker ID assigned and unique
- [ ] Slug registered in URL architecture
- [ ] RAAS Tier 0 inherited (confirmed)
- [ ] RAAS Tier 1 regulations defined
- [ ] RAAS Tier 2 schema defined (org config options)
- [ ] RAAS Tier 3 schema defined (user config options)
- [ ] Input schema defined
- [ ] Output schema defined
- [ ] Document templates registered with Document Engine
- [ ] Vault read/write contracts defined
- [ ] Referral triggers mapped (receives_from / sends_to)
- [ ] Alex registration complete
- [ ] Landing page copy written (iPod test passed)
- [ ] Waitlist page live at titleapp.ai/workers/{slug}
- [ ] Disclaimer auto-injection confirmed
- [ ] Tested with at least one real-world scenario

---

## 5. Complete Worker Catalog (52 Workers)

### PHASE 0 — Site Selection & Market Research

#### W-001 Market Research & Demographics Analyst
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Fair Housing (no protected class scoring), public data sourcing only
- **Inputs:** Target geography, property type, investment criteria
- **Outputs:** Market scorecard, demographic trends, supply/demand pipeline, rent/vacancy comps
- **Documents:** Market Research Report (PDF), Demographic Dashboard (XLSX), Market Comparison Matrix (PDF)
- **Vault writes:** market_scorecard, demographic_profile, supply_pipeline_data, rent_comp_data
- **Sends to:** W-002 (market scores above threshold), W-007 (environmental risk flags)
- **Alex:** normal priority | "Analyzes market demographics, growth trends, and supply/demand"
- **Headline:** "Know your market before you buy"

#### W-002 CRE Deal Analyst
- **Type:** standalone | **Price:** $79/mo | **Status:** live
- **Tier 1:** Fair Housing, full assumption disclosure, no return guarantees
- **Inputs:** OMs (PDF), deal parameters, investment thesis (Tier 2), market data (W-001)
- **Outputs:** Deal score (0-100) BUY/HOLD/PASS, strengths/risks, side-by-side comparison, key metrics
- **Documents:** Deal Analysis Report (PDF), Multi-Deal Comparison (PDF), Scorecard one-pager (PDF)
- **Vault reads:** market_scorecard (W-001), investment_thesis (Tier 2)
- **Vault writes:** deal_analysis, deal_score, deal_comparison_matrix
- **Receives from:** W-001 (high-scoring market)
- **Sends to:** W-003 (BUY/STRONG BUY → DD), W-044 (title search), W-016 (capital stack), W-045 (contract review)
- **Alex:** high priority | "Scores CRE deals against investment thesis"
- **Headline:** "Score every deal against your thesis"

#### W-003 Site Due Diligence
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** Environmental disclosure, zoning code accuracy, current FEMA FIRM maps
- **Inputs:** Property address/APN, deal analysis (W-002), zoning code, site documents
- **Outputs:** DD checklist with status, risk flags (red/yellow/green), zoning conformance, timeline/cost estimates
- **Documents:** DD Checklist (PDF/XLSX), Site Risk Summary (PDF), Zoning Analysis Memo (PDF)
- **Vault reads:** deal_analysis (W-002)
- **Vault writes:** dd_checklist, site_risk_profile, zoning_analysis
- **Receives from:** W-002 (deal approved)
- **Sends to:** W-007 (environmental flags), W-004 (zoning non-conformance), W-044 (title issues), W-030 (DD complete)
- **Alex:** high priority | "Manages site DD checklists, flags risks"
- **Headline:** "Never miss a red flag on a site"

#### W-030 Appraisal & Valuation Review
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist | **Phase:** 0/3 Horizontal
- **Tier 1:** USPAP awareness, NOT a certified appraisal (always disclose), transparent comp selection
- **Inputs:** Appraisal report (PDF), deal analysis (W-002), purchase price/terms
- **Outputs:** Appraisal gap analysis, comp adjustment review, valuation range, lender risk flag
- **Documents:** Appraisal Review Memo (PDF), Comp Challenge Worksheet (XLSX), Valuation Summary (PDF)
- **Vault reads:** deal_analysis (W-002), market_scorecard (W-001)
- **Vault writes:** appraisal_review, valuation_estimate
- **Receives from:** W-003 (DD complete), W-013 (lender requires appraisal)
- **Sends to:** W-013 (appraisal gap → alert senior debt), W-016 (valuation confirmed → update stack)
- **Alex:** high priority | "Reviews appraisals, identifies valuation gaps"
- **Headline:** "Catch appraisal gaps before your lender does"

### PHASE 1 — Design & Entitlement

#### W-004 Land Use & Entitlement
- **Type:** standalone | **Price:** $99/mo | **Status:** waitlist
- **Tier 1:** Current zoning code, public hearing notices, CEQA/NEPA triggers, vesting requirements
- **Inputs:** Property address/APN, zoning designation, proposed use/density, site DD (W-003)
- **Outputs:** Entitlement pathway (by-right vs discretionary), approval checklist/timeline, zoning gap analysis, risk assessment
- **Documents:** Entitlement Strategy Memo (PDF), Approval Pathway Timeline (PDF), Zoning Gap Analysis (PDF)
- **Vault reads:** site_risk_profile (W-003), zoning_analysis (W-003)
- **Vault writes:** entitlement_strategy, approval_requirements, entitlement_timeline
- **Receives from:** W-003 (zoning non-conformance)
- **Sends to:** W-005 (design), W-007 (CEQA/NEPA), W-010 (public hearing), W-012 (entitlements approved)
- **Alex:** high priority | "Analyzes zoning conformance, maps entitlement pathways"
- **Headline:** "Map your path from zoning to shovel"

#### W-005 Architecture & Design Review
- **Type:** copilot | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Current IBC/IRC, ADA/FHA design requirements, energy code (IECC/Title 24), no stamped drawings
- **Inputs:** Architectural plans (PDF), entitlement requirements (W-004), program requirements
- **Outputs:** Design compliance checklist, code conformance review, unit mix optimization, cost impact flags
- **Documents:** Design Review Memo (PDF), Code Compliance Checklist (PDF), Program Comparison Matrix (XLSX)
- **Vault reads:** entitlement_strategy (W-004), approval_requirements (W-004)
- **Vault writes:** design_review, program_summary
- **Sends to:** W-006 (structural/MEP), W-009 (accessibility), W-011 (fire), W-008 (energy)
- **Alex:** normal priority | "Reviews architectural plans for code compliance"
- **Headline:** "Review plans before they cost you money"

#### W-006 Engineering Review
- **Type:** copilot | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** No PE stamp, ASCE 7/ACI 318/AISC standards, seismic design category
- **Inputs:** Engineering plans/reports, geotech report, design review (W-005)
- **Outputs:** Engineering review checklist, structural assessment, civil/grading review, utility capacity
- **Documents:** Engineering Review Memo (PDF), Structural Assessment Summary (PDF)
- **Sends to:** W-029 (MEP coordination), W-012 (engineering complete → permit)
- **Alex:** normal priority
- **Headline:** "Engineering review without the wait"

#### W-007 Environmental & Cultural Review
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** NEPA (CE/EA/EIS), CEQA (exemption/MND/EIR), ESA, NHPA Section 106, Clean Water Act, Hawaii Chapter 343/burial council
- **Inputs:** Property address/APN, site DD (W-003), Phase I ESA, project description
- **Outputs:** Environmental screening, required reviews/timeline, cultural resource assessment, mitigation recommendations
- **Documents:** Environmental Screening Report (PDF), Section 106 Memo (PDF), Mitigation Checklist (XLSX)
- **Receives from:** W-003, W-004, W-001
- **Sends to:** W-008 (sustainability), W-004 (clearance), W-012 (clearance → permit)
- **Alex:** high priority | Hawaii-baseline built in
- **Headline:** "Know your environmental risk before it stops your project"

#### W-008 Energy & Sustainability
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Jurisdiction energy code (IECC/Title 24), LEED/ENERGY STAR/NGBS accuracy, current incentives
- **Inputs:** Building plans/specs, design review (W-005), location/climate zone
- **Outputs:** Energy code compliance, green cert pathway, renewable/efficiency ROI, incentive inventory
- **Documents:** Energy Compliance Memo (PDF), Sustainability Strategy (PDF), Incentive Inventory (XLSX)
- **Sends to:** W-017 (tax credits), W-012 (compliance confirmed → permit)
- **Alex:** normal priority
- **Headline:** "Turn energy compliance into profit"

#### W-009 Accessibility & Fair Housing
- **Type:** copilot | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** FHA design requirements, ADA Title III, Section 504, state accessibility codes
- **Inputs:** Architectural plans, unit mix/building type, funding sources
- **Outputs:** Accessibility compliance checklist, FHA analysis, required accessible unit count, common area review
- **Documents:** Accessibility Review Memo (PDF), FHA Compliance Checklist (PDF)
- **Headline:** "Get accessibility right the first time"

#### W-010 Government Relations & Public Hearing
- **Type:** copilot | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Public notice requirements, Brown Act/sunshine law, lobbying disclosure triggers
- **Inputs:** Entitlement strategy (W-004), project description, hearing schedule
- **Outputs:** Hearing prep package, community engagement strategy, talking points, notice compliance
- **Documents:** Hearing Prep Package (PDF), Community Outreach Plan (PDF), Notice Checklist (PDF)
- **Headline:** "Walk into every hearing prepared"

#### W-011 Fire & Life Safety
- **Type:** copilot | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** NFPA 1/13/72/101, IBC Chapter 9-10, no PE stamp replacement
- **Inputs:** Architectural plans, occupancy/construction type, design review (W-005)
- **Outputs:** Fire protection requirements, egress analysis, alarm/detection requirements, fire marshal notes
- **Documents:** Fire & Life Safety Review Memo (PDF), Egress Analysis (PDF)
- **Sends to:** W-012 (fire review → permit), W-029 (fire protection → MEP)
- **Headline:** "Pass fire plan check the first time"

### PHASE 2 — Permitting

#### W-012 Permit Submission & Tracking
- **Type:** pipeline | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** Jurisdiction submission requirements, plan check cycles, permit expiration tracking
- **Inputs:** Approved plans from Phase 1 workers, jurisdiction requirements, correction letters
- **Outputs:** Submission checklist, permit status tracker, correction tracking, timeline forecast
- **Documents:** Submission Checklist (PDF), Permit Status Dashboard (XLSX), Correction Tracker (XLSX)
- **Vault reads:** All Phase 1 worker outputs
- **Vault writes:** permit_status, permit_timeline
- **Receives from:** W-004 through W-011
- **Sends to:** W-015 (permit approved → construction lending), W-021 (permit approved → construction)
- **Alex:** high priority
- **Headline:** "Never lose track of a permit again"

### PHASE 3 — Financing & Capital Stack

#### W-013 Mortgage & Senior Debt
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** TILA-RESPA, Dodd-Frank QM, fair lending (ECOA), no loan origination
- **Inputs:** Deal analysis (W-002), appraisal review (W-030), term sheets, property financials
- **Outputs:** Loan comparison matrix, DSCR/LTV analysis, rate sensitivity scenarios, term sheet comparison
- **Documents:** Loan Comparison (PDF), Debt Service Analysis (XLSX), Term Sheet Summary (PDF)
- **Vault reads:** deal_analysis (W-002), appraisal_review (W-030), capital_stack (W-016)
- **Vault writes:** senior_debt_analysis, loan_comparison, debt_service_projection
- **Sends to:** W-030 (appraisal needed), W-016 (update stack), W-044 (loan closing → title)
- **Alex:** high priority
- **Headline:** "Compare every loan offer in minutes"

#### W-014 Mezzanine & Preferred Equity
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Securities registration, intercreditor requirements, accredited investor verification
- **Inputs:** Capital stack (W-016), senior debt (W-013), mezz/pref term sheets
- **Outputs:** Comparison matrix, blended cost of capital, waterfall/priority analysis, intercreditor checklist
- **Documents:** Mezz/Pref Comparison (PDF), Waterfall Analysis (XLSX)
- **Sends to:** W-016 (update stack), W-045 (intercreditor → legal)
- **Headline:** "Structure your middle stack with confidence"

#### W-015 Construction Lending
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Construction-to-perm conversion, mechanics lien priority/notice, interest reserve calculation
- **Inputs:** Construction budget (W-021), permit status (W-012), capital stack (W-016), term sheets
- **Outputs:** Construction loan comparison, draw schedule template, interest reserve, C2P conversion analysis
- **Documents:** Construction Loan Comparison (PDF), Draw Schedule (XLSX), Interest Reserve Model (XLSX)
- **Sends to:** W-023 (loan closed → draw management), W-044 (closing → title), W-016 (update stack)
- **Alex:** high priority
- **Headline:** "Construction loans that actually pencil"

#### W-016 Capital Stack Optimizer
- **Type:** composite | **Price:** $99/mo | **Status:** waitlist
- **Tier 1:** SEC Reg D/A+/CF, lender leverage/subordination limits, state Blue Sky
- **Inputs:** Deal analysis (W-002), all financing worker outputs, tax credits (W-017), OZ (W-020)
- **Outputs:** Optimized capital stack (multiple scenarios), blended cost of capital, IRR/equity multiple projections, waterfall, sensitivity analysis
- **Documents:** Capital Stack Summary (PDF), Capital Stack Model (XLSX), Waterfall (XLSX), Investor Slides (PPTX)
- **Vault reads:** 7 workers | **Vault writes:** capital_stack, waterfall_model, irr_projections, sensitivity_analysis
- **Receives from:** W-002, W-013, W-014, W-015, W-017, W-020
- **Sends to:** W-013, W-014, W-015, W-017, W-019, W-018
- **Alex:** CRITICAL priority — hub worker
- **Headline:** "Build the capital stack that maximizes your returns"

#### W-017 Tax Credit & Incentive
- **Type:** standalone | **Price:** $99/mo | **Status:** waitlist
- **Tier 1:** IRC current sections (LIHTC 42, HTC 47, NMTC 45D, energy 48/48E), state programs, QAP cycles, no tax advice
- **Inputs:** Project location/type/scope, capital stack (W-016), energy/sustainability (W-008), deal analysis (W-002)
- **Outputs:** Eligibility matrix (all programs), economic impact model, application timeline, compliance requirements
- **Documents:** Eligibility Report (PDF), Credit Model (XLSX), Application Checklist (PDF), Compliance Calendar (PDF)
- **Sends to:** W-016 (update stack), W-047 (compliance), W-045 (partnership → legal)
- **Alex:** high priority
- **Headline:** "Find every dollar of credits and incentives"

#### W-018 Crowdfunding & Reg D
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Reg D 506(b)/506(c), Reg CF, Reg A+, Blue Sky, bad actor screening, Form D filing
- **Inputs:** Capital stack (W-016), deal analysis (W-002), target raise amount
- **Outputs:** Exemption pathway analysis, filing requirements/timeline, investor eligibility, offering structure comparison
- **Documents:** Exemption Analysis (PDF), Filing Checklist (PDF), Offering Summary (PDF)
- **Sends to:** W-045 (PPM → legal), W-019 (offering materials), W-046 (entity formation)
- **Headline:** "Raise capital the right way"

#### W-019 Investor Relations
- **Type:** standalone | **Price:** $79/mo | **Status:** development
- **Tier 1:** No return guarantees, accredited investor disclosure, past performance disclaimers
- **Inputs:** Capital stack (W-016), deal analysis (W-002), financial performance
- **Outputs:** Investor update letters, deal summary packages, LP portal content, distribution notices
- **Documents:** Investor Deck (PPTX), Quarterly Report (PDF), Deal One-Pager (PDF), Distribution Notice (PDF)
- **Sends to:** W-051 (ongoing reporting)
- **Alex:** high priority
- **Headline:** "Keep your investors informed and confident"

#### W-020 Opportunity Zone
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** IRC 1400Z-1/1400Z-2, substantial improvement test, QOF 90% asset test, holding periods (5/7/10yr), working capital safe harbor
- **Inputs:** Property address (OZ tract verification), capital gains info, project scope, capital stack (W-016)
- **Outputs:** OZ eligibility, substantial improvement test, economic model (deferral+step-up+exclusion), compliance timeline
- **Documents:** OZ Eligibility Report (PDF), OZ Economic Model (XLSX), Compliance Calendar (PDF)
- **Sends to:** W-016 (update stack), W-046 (QOF entity), W-047 (compliance milestones)
- **Headline:** "Maximize your Opportunity Zone benefits"

### PHASE 4 — Construction

#### W-021 Construction Manager
- **Type:** composite | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** OSHA 29 CFR 1926, IBC/IRC, Davis-Bacon prevailing wage, mechanics lien tracking
- **Inputs:** Permit status (W-012), construction budget/schedule, contracts, construction loan (W-015)
- **Outputs:** Project dashboard (schedule/budget/issues), RFI log, change order log, progress reports, punchlist
- **Documents:** Monthly Progress Report (PDF), Budget Tracking (XLSX), RFI Log (XLSX), CO Log (XLSX), Punchlist (PDF)
- **Vault writes:** construction_budget, construction_schedule, rfi_log, change_order_log, progress_reports
- **Receives from:** W-012 (permit approved)
- **Sends to:** W-022 through W-029 (all construction workers)
- **Alex:** CRITICAL priority — construction hub
- **Headline:** "Your digital construction office"

#### W-022 Bid & Procurement
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** Prevailing wage flagging, DBE/MBE/WBE tracking, no bid rigging
- **Inputs:** Bid packages (W-021), scope descriptions, submitted bids
- **Outputs:** Bid comparison matrix, bid leveling, scope gap identification, award recommendation
- **Documents:** Bid Comparison (XLSX), Bid Leveling Report (PDF), Award Recommendation (PDF)
- **Headline:** "Level every bid in minutes, not hours"

#### W-023 Construction Draw
- **Type:** pipeline | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** AIA G702/G703 compliance, retainage tracking, lien waiver tracking (conditional/unconditional), mechanics lien
- **Inputs:** Construction budget (W-021), draw schedule (W-015), sub payment applications, inspections (W-027)
- **Outputs:** Draw request package (G702/G703), lien waiver matrix, retainage tracking, draw vs budget reconciliation
- **Documents:** Draw Request Package (PDF), Lien Waiver Matrix (XLSX), Draw Reconciliation (XLSX)
- **Alex:** high priority
- **Headline:** "Draw requests that get funded the first time"

#### W-024 Labor & Staffing
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** Davis-Bacon, certified payroll, E-Verify, FLSA overtime/classification
- **Inputs:** Construction schedule (W-021), trade scope requirements, prevailing wage determination
- **Outputs:** Labor forecast by trade/week, certified payroll, labor cost tracking, prevailing wage compliance
- **Documents:** Labor Forecast (XLSX), Certified Payroll Report (PDF), Compliance Log (XLSX)
- **Headline:** "Right trade, right time, right rate"

#### W-025 Insurance & Risk
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** State DOI, builders risk, additional insured/certificates, OCIP/CCIP wrap-up
- **Inputs:** Construction contracts, sub insurance certificates, project risk profile (W-003)
- **Outputs:** Insurance requirements matrix, certificate compliance tracker, coverage gap analysis, claims log
- **Documents:** Insurance Requirements (XLSX), Certificate Compliance (PDF), Coverage Gap Analysis (PDF)
- **Sends to:** W-049 (construction complete → property insurance)
- **Alex:** high priority
- **Headline:** "No expired certificates, no coverage gaps"

#### W-026 Materials & Supply Chain
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** Buy American Act, tariff tracking, spec compliance
- **Inputs:** Construction schedule (W-021), material specs, procurement timeline
- **Outputs:** Long-lead tracker with order-by dates, cost tracking, substitution analysis, delivery coordination
- **Documents:** Long-Lead Schedule (XLSX), Substitution Analysis (PDF), Procurement Status (XLSX)
- **Headline:** "Never wait on materials again"

#### W-027 Quality Control & Inspection
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** IBC required inspections, special inspections, third-party testing
- **Inputs:** Construction schedule (W-021), inspection reports/photos, plan specs
- **Outputs:** Inspection schedule/tracking, deficiency log, photo documentation, QC compliance report
- **Documents:** Inspection Report (PDF), Deficiency Log (XLSX), QC Summary (PDF)
- **Headline:** "Every inspection tracked, every deficiency resolved"

#### W-028 Safety & OSHA
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** OSHA 1926, OSHA 300 log, silica (Table 1), fall protection (Subpart M), confined space (Subpart AA), state OSHA
- **Inputs:** Project type/hazard profile, sub safety records (EMR/TRIR), incident reports
- **Outputs:** Site-specific safety plan, hazard analysis, toolbox talks, incident reports, OSHA 300 log
- **Documents:** Safety Plan (PDF), Hazard Analysis (PDF), Incident Report (PDF), OSHA 300 Log (XLSX), Toolbox Talk (PDF)
- **Alex:** CRITICAL priority
- **Headline:** "Zero incidents starts with zero excuses"

#### W-029 MEP Coordination
- **Type:** copilot | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** NEC, IMC/IPC, ASHRAE, NFPA 72 fire alarm
- **Inputs:** MEP drawings/specs, architectural plans (W-005), structural plans (W-006)
- **Outputs:** Clash/conflict identification, coordination meeting notes, ceiling height/routing analysis, MEP schedule
- **Documents:** MEP Coordination Report (PDF), Clash Detection Summary (PDF), MEP Schedule (XLSX)
- **Headline:** "Catch clashes before they cost you"

### PHASE 5 — Stabilization & Lease-Up

#### W-031 Lease-Up & Marketing
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** Fair Housing marketing, affirmative marketing plans, truth in advertising
- **Inputs:** Unit mix/pricing (W-034), property features, market data (W-001)
- **Outputs:** Marketing plan, lease-up velocity tracking, lead pipeline, pricing validation
- **Documents:** Marketing Plan (PDF), Lease-Up Tracker (XLSX), Weekly Report (PDF)
- **Alex:** high priority
- **Headline:** "Fill your building faster"

#### W-032 Tenant Screening
- **Type:** standalone | **Price:** $29/mo | **Status:** waitlist
- **Tier 1:** FCRA, Fair Housing, state screening limitations, adverse action notices
- **Inputs:** Rental application, screening report results
- **Outputs:** Screening decision recommendation, adverse action notice, approval letter
- **Documents:** Screening Summary (PDF), Adverse Action Notice (PDF)
- **Headline:** "Screen tenants fairly and fast"

#### W-033 Property Management
- **Type:** composite | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** State landlord-tenant law, Fair Housing operations, security deposit handling
- **Inputs:** Lease agreements, tenant communications, maintenance requests (W-035)
- **Outputs:** Tenant communication management, lease renewal tracking, move-in/out processing, violation notices
- **Documents:** Lease Renewal Notice (PDF), Violation Notice (PDF), Move-Out Statement (PDF)
- **Headline:** "Manage properties without the headaches"

#### W-034 Rent Roll & Revenue Management
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** Rent control/stabilization, affordable housing income/rent limits, state rent increase notices
- **Inputs:** Current rent roll, market rent data (W-001), lease status (W-033)
- **Outputs:** Rent roll analysis (actual vs market vs pro forma), revenue optimization, rent increase calendar, loss-to-lease
- **Documents:** Rent Roll Report (XLSX), Revenue Analysis (PDF), Rent Increase Schedule (XLSX)
- **Sends to:** W-039 (accounting), W-051 (investor reporting)
- **Headline:** "Optimize every dollar of rent"

#### W-035 Maintenance & Work Order
- **Type:** standalone | **Price:** $39/mo | **Status:** waitlist
- **Tier 1:** Implied warranty of habitability, emergency response requirements
- **Inputs:** Maintenance requests, preventive maintenance schedules
- **Outputs:** Work order tracking, PM calendar, maintenance cost tracking, vendor performance
- **Documents:** Work Order Report (PDF), PM Schedule (XLSX), Cost Summary (XLSX)
- **Sends to:** W-038 (warranty claims), W-041 (vendor management)
- **Headline:** "Fix it fast, track it always"

#### W-036 Utility Management
- **Type:** standalone | **Price:** $39/mo | **Status:** waitlist
- **Tier 1:** RUBS compliance, submeter regulations
- **Inputs:** Utility bills, submeter readings, occupancy data
- **Outputs:** Utility cost analysis, RUBS allocation, consumption anomaly alerts, efficiency recommendations
- **Documents:** Utility Cost Report (XLSX), RUBS Allocation Report (PDF)
- **Headline:** "Stop overpaying for utilities"

#### W-037 HOA & Association Management
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** State HOA statutes (Davis-Stirling), reserve study requirements, meeting notice/open meeting
- **Inputs:** CC&Rs, assessment schedules, violation reports
- **Outputs:** Assessment tracking, violation management, reserve fund tracking, board meeting prep
- **Documents:** Assessment Report (XLSX), Violation Notice (PDF), Reserve Status (PDF), Board Package (PDF)
- **Headline:** "HOA management without the drama"

#### W-038 Warranty & Defect Management
- **Type:** standalone | **Price:** $39/mo | **Status:** waitlist
- **Tier 1:** State implied warranty, statute of repose, right to repair (SB 800 in CA)
- **Inputs:** Warranty claims, construction punchlist (W-021), maintenance data (W-035)
- **Outputs:** Warranty claim tracking, expiration calendar, defect pattern analysis, contractor enforcement
- **Documents:** Warranty Claim Report (PDF), Expiration Calendar (XLSX), Defect Analysis (PDF)
- **Headline:** "Don't let warranties expire unused"

### PHASE 6 — Operations

#### W-039 Accounting
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** GAAP compliance, tax basis vs book basis, not a CPA replacement
- **Inputs:** Revenue (W-034), utility costs (W-036), maintenance costs (W-035), HOA data (W-037)
- **Outputs:** P&L by property, balance sheet, cash flow, budget vs actual variance, month-end close checklist
- **Documents:** Financial Statements (PDF), Budget vs Actual (XLSX), Close Checklist (PDF)
- **Sends to:** W-040 (tax prep), W-051 (investor reporting)
- **Headline:** "Books that close themselves"

#### W-040 Tax & Assessment
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** No tax advice, assessment appeal deadlines, exemption tracking
- **Inputs:** Property tax assessments, financial statements (W-039), exemption applications
- **Outputs:** Assessment review/appeal recommendation, property tax calendar, exemption tracking, CPA document prep
- **Documents:** Assessment Appeal Package (PDF), Property Tax Calendar (XLSX), Tax Document Checklist (PDF)
- **Headline:** "Never overpay on property taxes"

#### W-041 Vendor & Contract Management
- **Type:** standalone | **Price:** $39/mo | **Status:** waitlist
- **Tier 1:** Contract compliance tracking, vendor insurance verification
- **Inputs:** Vendor contracts, insurance certificates, performance data (W-035)
- **Outputs:** Contract expiration tracker, vendor scorecards, insurance compliance, renewal recommendations
- **Documents:** Vendor Scorecard (PDF), Contract Expiration Report (XLSX), Insurance Compliance (XLSX)
- **Headline:** "Every vendor tracked, every contract managed"

#### W-051 Investor Reporting & Distributions (NEW)
- **Type:** standalone | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Partnership accounting, K-1 requirements, waterfall compliance per operating agreement, no tax advice
- **Inputs:** Financial statements (W-039), revenue (W-034), capital stack (W-016), waterfall terms
- **Outputs:** Quarterly investor reports, distribution calculations per waterfall, K-1 prep worksheets, IRR/equity multiple tracking
- **Documents:** Quarterly Report (PDF), Distribution Summary (PDF), K-1 Worksheet (XLSX), Performance Dashboard (PDF)
- **Sends to:** W-040 (K-1 → tax prep)
- **Alex:** high priority
- **Headline:** "Distributions calculated, investors informed"

#### W-052 Debt Service & Loan Compliance (NEW)
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** Covenant tracking, lender reporting requirements, default trigger early warning
- **Inputs:** Financial statements (W-039), loan documents/covenants, senior debt (W-013)
- **Outputs:** DSCR monitoring/trending, covenant compliance testing, lender reporting package, refinance triggers, maturity tracking
- **Documents:** Covenant Compliance Report (PDF), DSCR Trending (XLSX), Lender Report Package (PDF), Maturity Calendar (XLSX)
- **Sends to:** W-013 (refinance trigger), W-047 (covenant deadlines)
- **Alex:** high priority
- **Headline:** "Stay ahead of every loan covenant"

### PHASE 7 — Disposition

#### W-042 Disposition Preparation
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** Seller disclosure requirements, environmental disclosure, Fair Housing in marketing
- **Inputs:** Financial statements (W-039), rent roll (W-034), capital improvements, deal analysis (W-002)
- **Outputs:** Disposition timeline/checklist, estimated value range, seller disclosure package, data room prep
- **Documents:** Disposition Checklist (PDF), Valuation Summary (PDF), Seller Disclosure Package (PDF)
- **Sends to:** W-043 (1031 exchange), W-044 (title), W-050 (marketing/data room)
- **Headline:** "Sell at the right time for the right price"

#### W-043 1031 Exchange
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** IRC 1031, 45-day identification, 180-day exchange, QI requirements, related party restrictions
- **Inputs:** Disposition details (W-042), basis/depreciation, replacement candidates
- **Outputs:** Eligibility analysis, timeline tracker (45/180-day), identification letter, boot calculation, replacement comparison
- **Documents:** 1031 Analysis (PDF), Timeline Tracker (XLSX), Identification Letter (PDF), Boot Calculation (XLSX)
- **Sends to:** W-002 (replacement → deal analysis), W-044 (exchange closing → title), W-047 (deadlines)
- **Headline:** "Execute your 1031 without missing a deadline"

#### W-050 Disposition Marketing & Data Room (NEW)
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** NDA/CA tracking, seller disclosure, Fair Housing in marketing
- **Inputs:** Disposition package (W-042), financials (W-039), rent roll (W-034), property materials
- **Outputs:** OM preparation, virtual data room, buyer qualification tracking, NDA management, bid tracking
- **Documents:** Offering Memorandum (PDF), Data Room Index (PDF), Buyer Tracker (XLSX), NDA Template (PDF)
- **Sends to:** W-044 (buyer selected → title/escrow)
- **Headline:** "Sell your asset like an institution"

### HORIZONTAL — All Phases

#### W-044 Title & Escrow
- **Type:** standalone | **Price:** $59/mo | **Status:** waitlist
- **Tier 1:** RESPA, ALTA standards, state escrow regulations
- **Inputs:** Property address/APN, deal analysis (W-002), preliminary title report
- **Outputs:** Title exception review, escrow timeline tracking, closing checklist, title insurance comparison
- **Documents:** Title Review Memo (PDF), Escrow Timeline (PDF), Closing Checklist (PDF)
- **Receives from:** W-002, W-003, W-013, W-015, W-042, W-043 (most-connected horizontal worker)
- **Alex:** high priority
- **Headline:** "Clear title, clean closing"

#### W-045 Legal & Contract
- **Type:** copilot | **Price:** $79/mo | **Status:** waitlist
- **Tier 1:** Does not practice law, jurisdiction awareness, cannot establish attorney-client privilege
- **Inputs:** Contracts/agreements (PDF), term sheets, legal questions from other workers
- **Outputs:** Contract review summaries, key terms extraction, risk flags, comparison to standards
- **Documents:** Contract Review Memo (PDF), Key Terms Summary (PDF), Risk Assessment (PDF)
- **Receives from:** W-002, W-014, W-018, W-022, W-033, W-017 (most referrals received)
- **Alex:** high priority
- **Headline:** "Review every contract before you sign"

#### W-046 Entity & Formation
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** State formation/registration, annual compliance/franchise tax, no legal advice
- **Inputs:** Project details, ownership structure, state requirements
- **Outputs:** Entity structure recommendation, formation checklist, compliance calendar, EIN tracking
- **Documents:** Entity Structure Memo (PDF), Formation Checklist (PDF), Compliance Calendar (XLSX)
- **Receives from:** W-018 (offering entity), W-020 (QOF entity)
- **Sends to:** W-047 (entity compliance deadlines)
- **Headline:** "Right entity, right state, on time"

#### W-047 Compliance & Deadline Tracker
- **Type:** pipeline | **Price:** $39/mo | **Status:** waitlist
- **Tier 1:** Current statutory/contractual deadline sources, cascading alerts (30/14/7/1 day)
- **Inputs:** Deadlines from all workers, custom compliance items, regulatory calendars
- **Outputs:** Master compliance calendar, upcoming deadline alerts, missed deadline escalation, compliance dashboard
- **Documents:** Compliance Calendar (XLSX), Deadline Status Report (PDF)
- **Receives from:** W-017, W-020, W-043, W-046 (all deadline-generating workers)
- **Alex:** CRITICAL priority — aggregates ALL deadlines
- **Headline:** "Never miss a deadline again"

#### W-048 Alex — Chief of Staff
- **Type:** composite | **Price:** FREE with 3+ subscriptions | **Status:** live
- **Tier 1:** Vault scope only, no autonomous actions, cross-worker privacy
- **Inputs:** All worker outputs, user tasks, calendar data
- **Outputs:** Daily morning briefing, task routing, cross-worker summaries, priority recommendations, deadline reminders
- **Documents:** Daily Briefing (PDF), Weekly Summary (PDF), Portfolio Dashboard (PDF)
- **Receives from / Sends to:** ALL workers
- **Alex:** CRITICAL — IS Alex
- **Headline:** "Your Chief of Staff that never sleeps"

#### W-049 Property Insurance & Risk (NEW)
- **Type:** standalone | **Price:** $49/mo | **Status:** waitlist
- **Tier 1:** State DOI, NFIP/private flood, earthquake, lender-required coverage
- **Inputs:** Property details/value, lender requirements, current policies, claims history
- **Outputs:** Coverage adequacy analysis, policy comparison, claims tracking, renewal calendar
- **Documents:** Coverage Analysis (PDF), Policy Comparison (XLSX), Claims Summary (PDF)
- **Receives from:** W-025 (construction complete → property insurance)
- **Headline:** "Property insurance that actually covers you"

---

## 6. Catalog Summary

| Phase | Workers | Monthly Revenue |
|-------|---------|----------------|
| Phase 0 — Site Selection | W-001, W-002, W-003, W-030 | $276 |
| Phase 1 — Design & Entitlement | W-004 through W-011 | $562 |
| Phase 2 — Permitting | W-012 | $59 |
| Phase 3 — Financing | W-013 through W-020 | $671 |
| Phase 4 — Construction | W-021 through W-029 | $499 |
| Phase 5 — Stabilization | W-031 through W-038 | $373 |
| Phase 6 — Operations | W-039, W-040, W-041, W-051, W-052 | $275 |
| Phase 7 — Disposition | W-042, W-043, W-050 | $177 |
| Horizontal | W-044 through W-049 | $324 |
| **TOTAL** | **52 workers** | **$3,216/mo** |

## 7. Client Bundles

- **Scott / JMA Capital** (investor/syndicator): ~$740/mo for full investment + financing stack
- **Layton Construction** (GC): ~$630/mo for digital construction office
- **BlackRock** (institutional): ~$3,216/mo for complete lifecycle — replacing $50K+/mo in consultant fees

## 8. Hub Workers (Critical Priority)

- **W-016 Capital Stack Optimizer** — financing hub, reads from 7 workers, sends to 6
- **W-021 Construction Manager** — construction hub, coordinates 8 workers
- **W-047 Compliance & Deadline Tracker** — aggregates all deadlines across all workers
- **W-048 Alex (Chief of Staff)** — orchestrates everything, free at 3+ subscriptions

## 9. Referral Flow (Lifecycle)

```
W-001 Market Research
  → W-002 Deal Analysis (score ≥70)
    → W-003 Site DD (score ≥75 BUY)
      → W-004 Entitlement → W-005/006/007/008/009/010/011 Design Phase
        → W-012 Permitting
          → W-016 Capital Stack ← W-013/014/015/017/018/020
            → W-021 Construction ← W-022/023/024/025/026/027/028/029
              → W-031-038 Stabilization
                → W-039-041/051/052 Operations
                  → W-042/043/050 Disposition
                    → W-002 (1031 replacement) [cycle]

Horizontal: W-044 Title, W-045 Legal, W-046 Entity, W-047 Compliance, W-048 Alex, W-049 Insurance
```
