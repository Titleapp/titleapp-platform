# TitleApp — Worker Catalog Part 2B
## Phase 3: Financing & Capital Stack
### Session 23a | Workers W-013 through W-020

---

### W-013 Mortgage & Senior Debt
```yaml
worker:
  id: "W-013"
  name: "Mortgage & Senior Debt"
  slug: "mortgage-senior-debt"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - tila_respa: "TILA-RESPA disclosure requirements"
      - dodd_frank: "Dodd-Frank ability-to-repay and QM rules where applicable"
      - fair_lending: "ECOA and Fair Housing lending discrimination prohibitions"
      - no_loan_origination: "Does not originate loans — analyzes and compares terms"
    tier_2_schema:
      - lender_relationships: "Preferred lender list with program parameters"
      - leverage_targets: "Maximum LTV, minimum DSCR thresholds"
      - rate_assumptions: "Current market rate benchmarks by product type"
    tier_3_schema:
      - comparison_criteria: "Weight rate vs. term vs. prepayment vs. flexibility"

  capabilities:
    inputs: ["Deal analysis from W-002 (via Vault)", "Appraisal review from W-030 (via Vault)", "Loan term sheets (PDF upload)", "Property financials (NOI, rent roll, expenses)"]
    outputs: ["Loan comparison matrix", "DSCR and LTV analysis", "Debt service coverage scenarios (rate sensitivity)", "Lender term sheet comparison"]
    documents: ["Loan Comparison Report (PDF)", "Debt Service Analysis (XLSX)", "Term Sheet Summary (PDF)"]

  vault:
    reads_from: ["deal_analysis (from W-002)", "appraisal_review (from W-030)", "capital_stack (from W-016)"]
    writes_to: ["senior_debt_analysis", "loan_comparison", "debt_service_projection"]
    triggers: ["Deal approved and moving to financing", "Term sheet received"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "Capital stack needs senior debt terms" }
      - { source: "W-002", trigger: "Deal approved → financing phase" }
    sends_to:
      - { target: "W-030", trigger: "Lender requires appraisal → appraisal review" }
      - { target: "W-016", trigger: "Senior debt terms confirmed → update capital stack" }
      - { target: "W-044", trigger: "Loan closing → title and escrow" }

  alex_registration:
    capabilities_summary: "Analyzes and compares senior debt options, models DSCR and LTV scenarios"
    priority_level: "high"
    notification_triggers: ["Rate lock expiration approaching", "New term sheet received"]
    daily_briefing_contribution: "Active loan comparisons, pending term sheets, rate environment"

  landing:
    headline: "Compare every loan offer in minutes"
    subhead: "DSCR, LTV, rate sensitivity — side-by-side loan analysis without the spreadsheet."
    value_props:
      - "Compares term sheets side by side automatically"
      - "Models debt service under multiple rate scenarios"
      - "Tracks rate lock deadlines"
      - "Does not originate loans — gives you data to negotiate"
```

---

### W-014 Mezzanine & Preferred Equity
```yaml
worker:
  id: "W-014"
  name: "Mezzanine & Preferred Equity"
  slug: "mezzanine-preferred-equity"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - sec_compliance: "Flag securities registration requirements"
      - intercreditor: "Track intercreditor agreement requirements with senior lender"
      - accredited_investor: "Verify accredited investor requirements where applicable"
    tier_2_schema:
      - mezz_providers: "Preferred mezzanine and pref equity sources"
      - max_blended_cost: "Maximum blended cost of capital threshold"
      - subordination_limits: "Senior lender subordination restrictions"
    tier_3_schema:
      - analysis_depth: "Quick comparison vs. full waterfall modeling"

  capabilities:
    inputs: ["Capital stack from W-016 (via Vault)", "Senior debt terms from W-013 (via Vault)", "Mezz/pref equity term sheets"]
    outputs: ["Mezz/pref equity comparison matrix", "Blended cost of capital analysis", "Waterfall and return priority analysis", "Intercreditor requirement checklist"]
    documents: ["Mezz/Pref Equity Comparison (PDF)", "Waterfall Analysis (XLSX)"]

  vault:
    reads_from: ["capital_stack (from W-016)", "senior_debt_analysis (from W-013)"]
    writes_to: ["mezz_pref_analysis"]
    triggers: ["Capital stack has mezz/pref equity layer", "Mezz term sheet received"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "Capital stack requires mezz/pref equity" }
    sends_to:
      - { target: "W-016", trigger: "Terms confirmed → update capital stack" }
      - { target: "W-045", trigger: "Intercreditor agreement → legal review" }

  alex_registration:
    capabilities_summary: "Analyzes mezzanine debt and preferred equity terms, models waterfall returns"
    priority_level: "normal"
    notification_triggers: ["Term sheet received", "Intercreditor issue flagged"]
    daily_briefing_contribution: "Mezz/pref equity status"

  landing:
    headline: "Structure your middle stack with confidence"
    subhead: "Mezz debt, preferred equity, intercreditor requirements — modeled before you sign."
    value_props:
      - "Compares mezz and pref equity terms side by side"
      - "Models blended cost of capital with senior debt"
      - "Flags intercreditor conflicts before closing"
      - "Waterfall analysis shows who gets paid first"
```

---

### W-015 Construction Lending
```yaml
worker:
  id: "W-015"
  name: "Construction Lending"
  slug: "construction-lending"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - construction_loan_regs: "Track construction-to-perm conversion requirements"
      - mechanics_lien: "Flag mechanics lien priority and preliminary notice requirements by state"
      - interest_reserve: "Proper interest reserve calculation and draw requirements"
    tier_2_schema:
      - construction_lenders: "Preferred construction lender list"
      - draw_schedule_template: "Standard draw schedule format"
      - contingency_requirements: "Minimum hard and soft cost contingency percentages"
    tier_3_schema:
      - draw_tracking_detail: "Line-item vs. category-level tracking"

  capabilities:
    inputs: ["Construction budget from W-021 (via Vault)", "Permit status from W-012 (via Vault)", "Capital stack from W-016 (via Vault)", "Construction loan term sheets"]
    outputs: ["Construction loan comparison matrix", "Draw schedule template", "Interest reserve calculation", "Construction-to-perm conversion analysis"]
    documents: ["Construction Loan Comparison (PDF)", "Draw Schedule (XLSX)", "Interest Reserve Model (XLSX)"]

  vault:
    reads_from: ["capital_stack (from W-016)", "construction_budget (from W-021)", "permit_status (from W-012)"]
    writes_to: ["construction_loan_analysis", "draw_schedule", "interest_reserve"]
    triggers: ["Permit approved → construction financing needed", "Construction loan term sheet received"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "Capital stack requires construction loan" }
      - { source: "W-012", trigger: "Permit approved → construction lending can close" }
    sends_to:
      - { target: "W-023", trigger: "Loan closed → construction draw management begins" }
      - { target: "W-044", trigger: "Construction loan closing → title and escrow" }
      - { target: "W-016", trigger: "Construction loan terms confirmed → update capital stack" }

  alex_registration:
    capabilities_summary: "Analyzes construction loan terms, builds draw schedules, models interest reserves"
    priority_level: "high"
    notification_triggers: ["Permit approved — loan can close", "Draw schedule deviation"]
    daily_briefing_contribution: "Construction loan status, draw schedule tracking"

  landing:
    headline: "Construction loans that actually pencil"
    subhead: "Compare terms, build draw schedules, track interest reserves — permit to perm conversion."
    value_props:
      - "Compares construction loan terms side by side"
      - "Builds draw schedules aligned to your construction budget"
      - "Models interest reserve so you never run short"
      - "Tracks construction-to-perm conversion requirements"
```

---

### W-016 Capital Stack Optimizer
```yaml
worker:
  id: "W-016"
  name: "Capital Stack Optimizer"
  slug: "capital-stack-optimizer"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "composite"
  pricing: { monthly: 99 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - sec_regulation: "Flag Reg D, Reg A+, Reg CF requirements based on capital sources"
      - leverage_limits: "Track lender-imposed leverage and subordination restrictions"
      - blue_sky: "State Blue Sky law compliance for equity raises"
    tier_2_schema:
      - target_irr: "Company's target IRR range"
      - max_leverage: "Maximum total leverage ratio"
      - preferred_return: "Standard preferred return to LPs"
      - promote_structure: "Standard GP promote/waterfall"
      - cost_of_capital_ceiling: "Maximum blended cost of capital"
    tier_3_schema:
      - scenario_count: "Number of scenarios to model (default 3)"
      - optimization_priority: "Maximize IRR, minimize equity, minimize cost of capital, or balanced"

  capabilities:
    inputs: ["Deal analysis from W-002 (via Vault)", "Senior debt terms from W-013", "Mezz/pref terms from W-014", "Construction loan from W-015", "Tax credits from W-017", "OZ benefits from W-020"]
    outputs: ["Optimized capital stack with multiple scenarios", "Blended cost of capital per scenario", "IRR and equity multiple projections", "Waterfall distribution model", "Sensitivity analysis (rate, NOI, exit cap)"]
    documents: ["Capital Stack Summary (PDF)", "Capital Stack Model (XLSX)", "Waterfall Analysis (XLSX)", "Investor Presentation Capital Slides (PPTX)"]
    analyzes: ["Optimal leverage ratio", "Blended cost of capital", "IRR sensitivity to rate changes", "Equity multiple at various exit scenarios", "Preferred return coverage"]

  vault:
    reads_from: ["deal_analysis (W-002)", "senior_debt_analysis (W-013)", "mezz_pref_analysis (W-014)", "construction_loan_analysis (W-015)", "tax_credit_analysis (W-017)", "oz_analysis (W-020)", "appraisal_review (W-030)"]
    writes_to: ["capital_stack", "waterfall_model", "irr_projections", "sensitivity_analysis"]
    triggers: ["Deal approved entering financing", "Any capital source term sheet updated", "Tax credit or incentive confirmed"]

  referrals:
    receives_from:
      - { source: "W-002", trigger: "Deal approved → model capital stack" }
      - { source: "W-013", trigger: "Senior debt terms → update stack" }
      - { source: "W-014", trigger: "Mezz terms → update stack" }
      - { source: "W-015", trigger: "Construction loan terms → update stack" }
      - { source: "W-017", trigger: "Tax credits confirmed → update stack" }
      - { source: "W-020", trigger: "OZ benefits confirmed → update stack" }
    sends_to:
      - { target: "W-013", trigger: "Stack needs senior debt → request terms" }
      - { target: "W-014", trigger: "Stack needs mezz/pref equity → request terms" }
      - { target: "W-015", trigger: "Stack needs construction loan → request terms" }
      - { target: "W-017", trigger: "Stack may benefit from tax credits → analyze" }
      - { target: "W-019", trigger: "Stack finalized → investor materials needed" }
      - { target: "W-018", trigger: "Equity gap → crowdfunding/Reg D analysis" }

  alex_registration:
    capabilities_summary: "Optimizes capital stack across debt, equity, and incentives — models IRR, waterfall, sensitivity"
    priority_level: "critical"
    notification_triggers: ["Capital stack updated", "IRR drops below target", "Capital source term change"]
    daily_briefing_contribution: "Capital stack status, IRR projections, pending term sheets"

  landing:
    headline: "Build the capital stack that maximizes your returns"
    subhead: "Senior debt, mezz, equity, tax credits — optimized together, not in silos."
    value_props:
      - "Models the optimal mix of debt, equity, and incentives"
      - "Runs sensitivity analysis on rates, NOI, and exit cap"
      - "Waterfall model shows exactly who gets paid what"
      - "Updates automatically when any capital source changes"
```

---

### W-017 Tax Credit & Incentive
```yaml
worker:
  id: "W-017"
  name: "Tax Credit & Incentive"
  slug: "tax-credit-incentive"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 99 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - irc_accuracy: "IRC Section references must be current — LIHTC (42), HTC (47), NMTC (45D), energy (48/48E)"
      - state_program_accuracy: "State programs must reference current statutes"
      - allocation_cycles: "Track QAP and allocation cycle deadlines by state"
      - no_tax_advice: "Does not provide tax advice — analyzes eligibility and models impact"
    tier_2_schema:
      - target_programs: "Which credit programs company pursues (LIHTC, HTC, NMTC, etc.)"
      - syndicator_relationships: "Tax credit syndicator/investor relationships"
      - pricing_benchmarks: "Current credit pricing by program"
    tier_3_schema:
      - analysis_scope: "Eligibility screening only vs. full economic modeling"

  capabilities:
    inputs: ["Project location, type, and scope", "Capital stack from W-016 (via Vault)", "Energy/sustainability from W-008 (via Vault)", "Deal analysis from W-002 (via Vault)"]
    outputs: ["Tax credit eligibility matrix (all applicable programs)", "Economic impact model (credit value, equity equivalent, IRR impact)", "Application timeline and deadline tracker", "Compliance period requirements"]
    documents: ["Tax Credit Eligibility Report (PDF)", "Credit Economic Model (XLSX)", "Application Checklist (PDF)", "Compliance Period Calendar (PDF)"]

  vault:
    reads_from: ["capital_stack (W-016)", "deal_analysis (W-002)", "energy_review (W-008)", "available_incentives (W-008)"]
    writes_to: ["tax_credit_analysis", "incentive_inventory", "compliance_calendar"]
    triggers: ["New project enters financing", "Incentive identified by W-008", "Capital stack has equity gap"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "Capital stack may benefit from tax credits" }
      - { source: "W-008", trigger: "Energy incentives identified" }
    sends_to:
      - { target: "W-016", trigger: "Credit value confirmed → update capital stack" }
      - { target: "W-047", trigger: "Compliance period → deadline tracker" }
      - { target: "W-045", trigger: "Tax credit partnership structure → legal review" }

  alex_registration:
    capabilities_summary: "Screens projects for tax credit and incentive eligibility, models economic impact"
    priority_level: "high"
    notification_triggers: ["Application deadline approaching", "New program eligibility", "Compliance milestone"]
    daily_briefing_contribution: "Credit applications pending, upcoming deadlines, compliance milestones"

  landing:
    headline: "Find every dollar of credits and incentives"
    subhead: "LIHTC, HTC, NMTC, energy credits, state programs — screened and modeled for your project."
    value_props:
      - "Screens every federal and state program you qualify for"
      - "Models the actual dollar impact on your capital stack"
      - "Tracks application deadlines and allocation cycles"
      - "Monitors compliance period requirements"
```

---

### W-018 Crowdfunding & Reg D
```yaml
worker:
  id: "W-018"
  name: "Crowdfunding & Reg D"
  slug: "crowdfunding-reg-d"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - reg_d_506b: "506(b) — no general solicitation, up to 35 non-accredited"
      - reg_d_506c: "506(c) — general solicitation allowed, accredited only, verification required"
      - reg_cf: "Regulation Crowdfunding limits and portal requirements"
      - reg_a_plus: "Reg A+ Tier 1 and Tier 2 requirements"
      - blue_sky: "State Blue Sky filing requirements by exemption type"
      - bad_actor: "Bad actor disqualification screening"
      - form_d: "Form D filing requirements and deadlines"
    tier_2_schema:
      - preferred_exemption: "Default Reg D exemption type"
      - platform_relationships: "Crowdfunding platform accounts"
      - minimum_investment: "Standard minimum investment amounts"
    tier_3_schema:
      - offering_structure: "LLC, LP, or Series LLC preference"

  capabilities:
    inputs: ["Capital stack from W-016 (via Vault)", "Deal analysis from W-002 (via Vault)", "Target raise amount and investor type"]
    outputs: ["Exemption pathway analysis", "Filing requirements and timeline", "Investor eligibility checklist", "Offering structure comparison"]
    documents: ["Exemption Analysis Report (PDF)", "Filing Checklist (PDF)", "Offering Summary (PDF)"]

  vault:
    reads_from: ["capital_stack (W-016)", "deal_analysis (W-002)"]
    writes_to: ["securities_exemption_analysis", "filing_requirements"]
    triggers: ["Equity raise needed in capital stack"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "Equity gap → crowdfunding/Reg D analysis" }
    sends_to:
      - { target: "W-045", trigger: "PPM/subscription agreement → legal" }
      - { target: "W-019", trigger: "Offering materials needed → IR worker" }
      - { target: "W-046", trigger: "Entity formation needed → Entity worker" }

  alex_registration:
    capabilities_summary: "Analyzes securities exemption pathways for equity raises"
    priority_level: "normal"
    notification_triggers: ["Form D filing deadline", "Blue Sky filing deadlines"]
    daily_briefing_contribution: "Active offerings, filing deadlines"

  landing:
    headline: "Raise capital the right way"
    subhead: "Reg D, Reg CF, Reg A+ — the right exemption, the right filing, no SEC surprises."
    value_props:
      - "Identifies the right securities exemption for your raise"
      - "Tracks every filing requirement and deadline"
      - "Screens for bad actor disqualification"
      - "Does not replace your securities attorney — gives them a head start"
```

---

### W-019 Investor Relations
```yaml
worker:
  id: "W-019"
  name: "Investor Relations"
  slug: "investor-relations"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "development"

  raas:
    tier_0: "inherited"
    tier_1:
      - no_guarantees: "No language guaranteeing returns or performance"
      - accredited_disclosure: "Proper accredited investor disclosure in all materials"
      - past_performance: "Past performance disclaimers required"
    tier_2_schema:
      - investor_database: "LP/investor contact list and preferences"
      - reporting_cadence: "Quarterly, monthly, or custom"
      - branding: "Company brand kit for investor materials"
    tier_3_schema:
      - communication_style: "Formal/institutional vs. conversational"
      - report_depth: "Executive summary vs. detailed performance"

  capabilities:
    inputs: ["Capital stack from W-016 (via Vault)", "Deal analysis from W-002 (via Vault)", "Financial performance (NOI, occupancy, distributions)"]
    outputs: ["Investor update letters", "Deal summary packages for prospective LPs", "LP portal content", "Distribution notices"]
    documents: ["Investor Deck (PPTX)", "Quarterly Investor Report (PDF)", "Deal Summary One-Pager (PDF)", "Distribution Notice (PDF)"]

  vault:
    reads_from: ["capital_stack (W-016)", "deal_analysis (W-002)", "irr_projections (W-016)"]
    writes_to: ["investor_materials", "investor_communications"]
    triggers: ["Reporting cadence date", "New deal ready for presentation", "Distribution event"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "Capital stack finalized → investor materials needed" }
      - { source: "W-018", trigger: "Offering launched → investor outreach" }
    sends_to:
      - { target: "W-051", trigger: "Ongoing reporting → Investor Reporting & Distributions" }

  alex_registration:
    capabilities_summary: "Creates investor materials, manages LP communications, generates performance reports"
    priority_level: "high"
    notification_triggers: ["Reporting deadline approaching", "Distribution date approaching"]
    daily_briefing_contribution: "Pending investor reports, upcoming distribution dates"

  landing:
    headline: "Keep your investors informed and confident"
    subhead: "Quarterly reports, deal summaries, distribution notices — professional IR without the IR team."
    value_props:
      - "Generates institutional-quality investor reports"
      - "Creates deal summary packages for new LP outreach"
      - "Tracks reporting deadlines automatically"
      - "Proper disclaimers and disclosures on every document"
```

---

### W-020 Opportunity Zone
```yaml
worker:
  id: "W-020"
  name: "Opportunity Zone"
  slug: "opportunity-zone"
  phase: "Phase 3 — Financing & Capital Stack"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - irc_1400z: "IRC Sections 1400Z-1 and 1400Z-2 requirements"
      - substantial_improvement: "Substantial improvement test (original use or 100% basis increase)"
      - qof_requirements: "Qualified Opportunity Fund 90% asset test"
      - holding_period: "5-year, 7-year, and 10-year benefit tiers"
      - working_capital_safe_harbor: "31-month working capital safe harbor requirements"
    tier_2_schema:
      - oz_fund_structure: "QOF and QOZB entity structure"
      - capital_gains_source: "Source and timing of capital gains being deferred"
    tier_3_schema:
      - analysis_depth: "Eligibility screening vs. full economic modeling"

  capabilities:
    inputs: ["Property address (OZ tract verification)", "Capital gains information", "Project scope and timeline", "Capital stack from W-016 (via Vault)"]
    outputs: ["OZ eligibility verification", "Substantial improvement test analysis", "OZ benefit economic model (deferral + step-up + exclusion)", "Compliance timeline and milestones"]
    documents: ["OZ Eligibility Report (PDF)", "OZ Economic Model (XLSX)", "Compliance Calendar (PDF)"]

  vault:
    reads_from: ["capital_stack (W-016)", "deal_analysis (W-002)"]
    writes_to: ["oz_analysis", "oz_compliance_calendar"]
    triggers: ["Property in designated OZ tract", "Capital gains deferral requested"]

  referrals:
    receives_from:
      - { source: "W-016", trigger: "OZ benefits applicable to capital stack" }
    sends_to:
      - { target: "W-016", trigger: "OZ benefits confirmed → update capital stack" }
      - { target: "W-046", trigger: "QOF entity formation → Entity worker" }
      - { target: "W-047", trigger: "OZ compliance milestones → Compliance Tracker" }

  alex_registration:
    capabilities_summary: "Verifies OZ eligibility, models tax benefits, tracks compliance milestones"
    priority_level: "normal"
    notification_triggers: ["Compliance milestone approaching", "90% asset test deadline"]
    daily_briefing_contribution: "OZ compliance status, upcoming milestones"

  landing:
    headline: "Maximize your Opportunity Zone benefits"
    subhead: "Eligibility, substantial improvement, compliance tracking — OZ tax benefits done right."
    value_props:
      - "Verifies OZ tract eligibility instantly"
      - "Models the full economic benefit (deferral + step-up + exclusion)"
      - "Tracks every compliance milestone and deadline"
      - "Does not replace your tax advisor — gives them a head start"
```

---

**End of Part 2B — Phase 3 (Financing & Capital Stack)**
**Next: Part 2C — Phase 4 (Construction): W-021 through W-029**
