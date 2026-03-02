# TitleApp — Worker Catalog Part 2A
## Phase 0: Site Selection | Phase 1: Design & Entitlement | Phase 2: Permitting
### Session 23a | Workers W-001 through W-012 + W-030

---

## PHASE 0 — Site Selection & Market Research

### W-001 Market Research & Demographics Analyst
```yaml
worker:
  id: "W-001"
  name: "Market Research & Demographics Analyst"
  slug: "market-research"
  phase: "Phase 0 — Site Selection & Market Research"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - fair_housing: "No analysis may use protected class demographics as negative scoring factors"
      - data_sourcing: "Census, BLS, and public data sources only — no purchased consumer data without disclosure"
    tier_2_schema:
      - target_markets: "Geographic areas of interest"
      - demographic_filters: "Income ranges, population density, growth thresholds"
      - competitor_tracking: "Comparable properties/developments to monitor"
    tier_3_schema:
      - report_format: "Summary vs. detailed"
      - update_frequency: "Weekly, monthly, quarterly"

  capabilities:
    inputs: ["Target market geography (MSA, county, zip, radius)", "Property type filter", "Investment criteria from Tier 2"]
    outputs: ["Market scorecard with growth indicators", "Demographic trend analysis", "Supply/demand pipeline report", "Comparable rent and vacancy analysis"]
    documents: ["Market Research Report (PDF)", "Demographic Dashboard (XLSX)", "Market Comparison Matrix (PDF)"]
    analyzes: ["Population growth trends", "Employment and income growth", "Rent growth vs. supply pipeline", "School ratings and walkability"]

  vault:
    reads_from: []
    writes_to: ["market_scorecard", "demographic_profile", "supply_pipeline_data", "rent_comp_data"]
    triggers: ["New market added to watchlist", "Quarterly refresh cycle"]

  referrals:
    receives_from: []
    sends_to:
      - { target: "W-002", trigger: "Market scores above threshold → deal sourcing" }
      - { target: "W-007", trigger: "Environmental risk flags → environmental review" }
    trigger_conditions: ["Market score >= 70 triggers deal sourcing", "Population growth > 2% YoY flags high-growth"]

  alex_registration:
    capabilities_summary: "Analyzes market demographics, growth trends, and supply/demand for target geographies"
    priority_level: "normal"
    notification_triggers: ["New market crosses scoring threshold", "Significant demographic shift in watched market"]
    daily_briefing_contribution: "Market watch updates and scoring alerts"

  landing:
    headline: "Know your market before you buy"
    subhead: "Demographics, growth trends, and supply pipeline — scored against your investment criteria."
    value_props:
      - "Scores markets against your specific criteria"
      - "Tracks supply pipeline so you're never surprised by new competition"
      - "Monitors demographic shifts that affect rent growth"
      - "Fair Housing compliant — no protected class scoring"
```

---

### W-002 CRE Deal Analyst
```yaml
worker:
  id: "W-002"
  name: "CRE Deal Analyst"
  slug: "cre-deal-analyst"
  phase: "Phase 0 — Site Selection & Market Research"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "live"

  raas:
    tier_0: "inherited"
    tier_1:
      - fair_housing: "No scoring based on tenant demographics or protected classes"
      - disclosure: "All assumptions clearly stated — no hidden variables"
      - no_guarantees: "No language guaranteeing returns or performance"
    tier_2_schema:
      - investment_thesis: "Cap rate floors, target IRR, preferred markets, property types, deal size range"
      - scoring_weights: "How to weight cap rate vs. growth vs. location vs. condition"
      - comparison_benchmarks: "Historical deals or portfolio averages"
    tier_3_schema:
      - output_detail: "Executive summary vs. full analysis"
      - scoring_display: "Numeric score, letter grade, or buy/hold/pass"
      - auto_compare: "Compare against last N deals analyzed"

  capabilities:
    inputs: ["Offering memorandum (PDF upload)", "Deal parameters (price, NOI, cap rate, units, market)", "Investment thesis from Tier 2", "Market data from W-001 (via Vault)"]
    outputs: ["Deal score (0-100) with BUY/HOLD/PASS", "Strengths and risks breakdown", "Side-by-side comparison", "Key metrics: cap rate, price/unit, NOI, DSCR"]
    documents: ["Deal Analysis Report (PDF)", "Multi-Deal Comparison Report (PDF)", "Deal Scorecard one-pager (PDF)"]
    analyzes: ["Cap rate vs. market average", "Price per unit vs. comparable sales", "NOI sustainability and rent growth potential", "Risk factors (deferred maintenance, concentration, tenant quality)"]

  vault:
    reads_from: ["market_scorecard (from W-001)", "investment_thesis (from Tier 2)"]
    writes_to: ["deal_analysis", "deal_score", "deal_comparison_matrix"]
    triggers: ["New OM uploaded", "Deal parameters entered manually", "Market data refresh from W-001"]

  referrals:
    receives_from:
      - { source: "W-001", trigger: "High-scoring market → source deals" }
    sends_to:
      - { target: "W-003", trigger: "Deal scores BUY or STRONG BUY → site due diligence" }
      - { target: "W-044", trigger: "Deal moving forward → title search" }
      - { target: "W-016", trigger: "Deal approved → model capital stack" }
      - { target: "W-045", trigger: "Deal approved → contract review" }
    trigger_conditions: ["Score >= 75 (BUY) triggers downstream", "Score >= 85 (STRONG BUY) triggers priority flag to Alex"]

  alex_registration:
    capabilities_summary: "Scores CRE deals against investment thesis, compares multiple deals, generates reports"
    priority_level: "high"
    notification_triggers: ["STRONG BUY deal identified", "Deal comparison requested"]
    daily_briefing_contribution: "Deals analyzed, scores, pending reviews"

  landing:
    headline: "Score every deal against your thesis"
    subhead: "Upload an OM, get a score. Compare deals side by side. Never second-guess your analysis."
    value_props:
      - "Scores deals 0-100 against YOUR investment criteria"
      - "Compares multiple deals side by side in seconds"
      - "Catches risks your spreadsheet misses"
      - "Every assumption visible — no black box"
```

---

### W-003 Site Due Diligence
```yaml
worker:
  id: "W-003"
  name: "Site Due Diligence"
  slug: "site-due-diligence"
  phase: "Phase 0 — Site Selection & Market Research"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - environmental_disclosure: "Flag all potential Phase I ESA triggers"
      - zoning_accuracy: "Reference current municipal zoning code — no assumptions"
      - flood_zone: "FEMA flood zone data must be current FIRM maps"
    tier_2_schema:
      - due_diligence_checklist: "Company-specific DD items beyond standard"
      - risk_tolerance: "Acceptable environmental, zoning, and title risk levels"
      - preferred_consultants: "Vendor list for Phase I, survey, geotech"
    tier_3_schema:
      - report_detail: "Summary checklist vs. narrative report"
      - alert_threshold: "Immediate alert vs. weekly summary"

  capabilities:
    inputs: ["Property address or APN", "Deal analysis from W-002 (via Vault)", "Zoning code and land use designation", "Site documents (survey, Phase I, geotech, title)"]
    outputs: ["DD checklist with status tracking", "Risk flag summary (red/yellow/green)", "Zoning conformance analysis", "Estimated timeline and cost for remaining DD"]
    documents: ["Due Diligence Checklist (PDF/XLSX)", "Site Risk Summary (PDF)", "Zoning Analysis Memo (PDF)"]
    analyzes: ["Zoning conformance and entitlement requirements", "Environmental risk indicators", "Flood zone and natural hazard exposure", "Utility availability and capacity", "Access, easement, and encumbrance review"]

  vault:
    reads_from: ["deal_analysis (from W-002)"]
    writes_to: ["dd_checklist", "site_risk_profile", "zoning_analysis"]
    triggers: ["Deal scored BUY or higher by W-002", "Manual DD initiation"]

  referrals:
    receives_from:
      - { source: "W-002", trigger: "Deal approved → run site DD" }
    sends_to:
      - { target: "W-007", trigger: "Environmental flags → detailed review" }
      - { target: "W-004", trigger: "Zoning non-conformance → entitlement strategy" }
      - { target: "W-044", trigger: "Title issues → title & escrow review" }
      - { target: "W-030", trigger: "DD complete → appraisal review" }
    trigger_conditions: ["Red environmental flag → immediate W-007", "Zoning variance needed → W-004", "DD 80%+ complete → notify Alex"]

  alex_registration:
    capabilities_summary: "Manages site-level due diligence checklists, flags risks, tracks DD completion"
    priority_level: "high"
    notification_triggers: ["Red risk flag identified", "DD completion milestone", "DD timeline at risk"]
    daily_briefing_contribution: "Active DD status, new flags, approaching deadlines"

  landing:
    headline: "Never miss a red flag on a site"
    subhead: "Zoning, environmental, flood, utilities — every risk checked before you close."
    value_props:
      - "Catches zoning and environmental issues before they kill your deal"
      - "Tracks every DD item with deadlines"
      - "Connects directly to your deal analysis — no double entry"
      - "Flags trigger specialist workers automatically"
```

---

### W-030 Appraisal & Valuation Review (NEW — fills numbering gap)
```yaml
worker:
  id: "W-030"
  name: "Appraisal & Valuation Review"
  slug: "appraisal-valuation"
  phase: "Phase 0 / Phase 3 — Horizontal"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - uspap_awareness: "Flag deviations from USPAP standards in uploaded appraisals"
      - no_certified_appraisal: "Output is NOT a certified appraisal — always disclose"
      - comp_objectivity: "Comparable selection must be transparent and defensible"
    tier_2_schema:
      - valuation_methodology_preference: "Income approach weighting vs. sales comp vs. cost"
      - cap_rate_benchmarks: "Internal cap rate assumptions by market"
      - appraisal_gap_threshold: "Max acceptable gap between appraised value and purchase price"
    tier_3_schema:
      - review_depth: "Quick check vs. full comp challenge analysis"

  capabilities:
    inputs: ["Uploaded appraisal report (PDF)", "Deal analysis from W-002 (via Vault)", "Purchase price and proposed terms"]
    outputs: ["Appraisal gap analysis", "Comp adjustment review", "Valuation range estimate", "Lender appraisal risk flag"]
    documents: ["Appraisal Review Memo (PDF)", "Comp Challenge Worksheet (XLSX)", "Valuation Summary (PDF)"]

  vault:
    reads_from: ["deal_analysis (from W-002)", "market_scorecard (from W-001)"]
    writes_to: ["appraisal_review", "valuation_estimate"]
    triggers: ["Appraisal report uploaded", "Financing phase initiated"]

  referrals:
    receives_from:
      - { source: "W-003", trigger: "DD complete → appraisal needed" }
      - { source: "W-013", trigger: "Lender requires appraisal → review incoming" }
    sends_to:
      - { target: "W-013", trigger: "Appraisal gap identified → alert senior debt" }
      - { target: "W-016", trigger: "Valuation confirmed → update capital stack" }

  alex_registration:
    capabilities_summary: "Reviews appraisals, identifies valuation gaps, challenges weak comps"
    priority_level: "high"
    notification_triggers: ["Appraisal gap exceeds threshold", "Weak comps identified"]
    daily_briefing_contribution: "Pending appraisal reviews, gap alerts"

  landing:
    headline: "Catch appraisal gaps before your lender does"
    subhead: "Review comps, challenge adjustments, know your valuation risk before closing."
    value_props:
      - "Spots weak comps and questionable adjustments"
      - "Calculates appraisal gap risk before you apply for the loan"
      - "Compares income approach vs. sales approach automatically"
      - "Not a certified appraisal — a smarter review of one"
```

---

## PHASE 1 — Design & Entitlement

### W-004 Land Use & Entitlement
```yaml
worker:
  id: "W-004"
  name: "Land Use & Entitlement"
  slug: "land-use-entitlement"
  phase: "Phase 1 — Design & Entitlement"
  type: "standalone"
  pricing: { monthly: 99 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - zoning_code_currency: "Reference current adopted zoning code — flag pending amendments"
      - public_notice: "Track public hearing notice requirements by jurisdiction"
      - ceqa_nepa: "Flag environmental review triggers for entitlement actions"
      - vested_rights: "Identify vesting requirements for approved entitlements"
    tier_2_schema:
      - target_jurisdictions: "Municipalities where company operates"
      - entitlement_playbook: "Standard approach to variances, CUPs, rezoning"
      - political_landscape_notes: "Known council positions, community opposition history"
    tier_3_schema:
      - tracking_detail: "Milestone summary vs. detailed action items"
      - hearing_alerts: "Advance notice period for public hearings"

  capabilities:
    inputs: ["Property address and APN", "Current zoning designation", "Proposed use and density", "Site DD from W-003 (via Vault)"]
    outputs: ["Entitlement pathway analysis (by-right vs. discretionary)", "Required approvals checklist with timeline", "Zoning code gap analysis", "Risk assessment for discretionary approvals"]
    documents: ["Entitlement Strategy Memo (PDF)", "Approval Pathway Timeline (PDF)", "Zoning Gap Analysis (PDF)"]
    analyzes: ["By-right development potential", "Variance/CUP/rezoning requirements", "Parking, setback, FAR, height, density conformance", "Public hearing and appeal risk", "Environmental review triggers"]

  vault:
    reads_from: ["site_risk_profile (from W-003)", "zoning_analysis (from W-003)"]
    writes_to: ["entitlement_strategy", "approval_requirements", "entitlement_timeline"]
    triggers: ["Zoning non-conformance flagged by W-003", "New development project initiated"]

  referrals:
    receives_from:
      - { source: "W-003", trigger: "Zoning non-conformance → entitlement strategy needed" }
    sends_to:
      - { target: "W-005", trigger: "Entitlement pathway defined → architecture review" }
      - { target: "W-007", trigger: "CEQA/NEPA trigger → environmental review" }
      - { target: "W-010", trigger: "Public hearing required → government relations" }
      - { target: "W-012", trigger: "Entitlements approved → permit submission" }

  alex_registration:
    capabilities_summary: "Analyzes zoning conformance, maps entitlement pathways, tracks approval timelines"
    priority_level: "high"
    notification_triggers: ["Public hearing date approaching", "Entitlement expiration warning", "Zoning code amendment affecting project"]
    daily_briefing_contribution: "Active entitlement status, upcoming hearings, timeline risks"

  landing:
    headline: "Map your path from zoning to shovel"
    subhead: "Know exactly what approvals you need, how long they'll take, and what could go wrong."
    value_props:
      - "Identifies every approval needed before you spend on design"
      - "Tracks public hearing dates and notice deadlines"
      - "Flags CEQA/NEPA triggers before they surprise you"
      - "Monitors zoning code changes that affect your project"
```

---

### W-005 Architecture & Design Review
```yaml
worker:
  id: "W-005"
  name: "Architecture & Design Review"
  slug: "architecture-design-review"
  phase: "Phase 1 — Design & Entitlement"
  type: "copilot"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - building_code: "Reference current IBC/IRC adopted edition by jurisdiction"
      - ada_fha: "Flag accessibility and Fair Housing design requirements"
      - energy_code: "Reference current IECC or state energy code (Title 24 in CA)"
      - no_stamped_drawings: "Does not replace licensed architect review"
    tier_2_schema:
      - design_standards: "Standard unit mixes, finishes, amenity packages"
      - cost_targets: "Per-unit or per-SF hard cost targets"
      - preferred_architects: "Firm list for RFP"
    tier_3_schema:
      - review_focus: "Code compliance, cost efficiency, marketability, or all"

  capabilities:
    inputs: ["Architectural plans (PDF)", "Entitlement requirements from W-004 (via Vault)", "Program requirements (unit count, mix, SF targets)"]
    outputs: ["Design compliance checklist", "Code conformance review notes", "Unit mix and program optimization", "Cost impact flags"]
    documents: ["Design Review Memo (PDF)", "Code Compliance Checklist (PDF)", "Program Comparison Matrix (XLSX)"]

  vault:
    reads_from: ["entitlement_strategy (from W-004)", "approval_requirements (from W-004)"]
    writes_to: ["design_review", "program_summary"]
    triggers: ["Architectural plans uploaded", "Entitlement pathway approved"]

  referrals:
    receives_from:
      - { source: "W-004", trigger: "Entitlement pathway defined → design to code" }
    sends_to:
      - { target: "W-006", trigger: "Structural/MEP questions → engineering review" }
      - { target: "W-009", trigger: "Accessibility items → ADA/FHA review" }
      - { target: "W-011", trigger: "Fire/life safety items → fire review" }
      - { target: "W-008", trigger: "Energy code questions → sustainability review" }

  alex_registration:
    capabilities_summary: "Reviews architectural plans for code compliance, program efficiency, cost alignment"
    priority_level: "normal"
    notification_triggers: ["Code non-conformance flagged", "Design review milestone complete"]
    daily_briefing_contribution: "Active design reviews, flagged items"

  landing:
    headline: "Review plans before they cost you money"
    subhead: "Code compliance, unit mix optimization, and cost flags — before you break ground."
    value_props:
      - "Catches code issues before plan check"
      - "Optimizes unit mix for revenue"
      - "Flags cost overruns in the design phase"
      - "Does not replace your architect — makes them faster"
```

---

### W-006 Engineering Review
```yaml
worker:
  id: "W-006"
  name: "Engineering Review"
  slug: "engineering-review"
  phase: "Phase 1 — Design & Entitlement"
  type: "copilot"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - no_pe_stamp: "Does not replace licensed PE review or stamp"
      - code_reference: "Reference current ASCE 7, ACI 318, AISC standards"
      - seismic_zone: "Apply correct seismic design category for project location"
    tier_2_schema:
      - structural_preferences: "Wood frame, steel, concrete, hybrid"
      - geotech_standards: "Minimum soil bearing, foundation preferences"
    tier_3_schema:
      - review_scope: "Structural only, civil only, or comprehensive"

  capabilities:
    inputs: ["Engineering plans and reports (PDF)", "Geotechnical report", "Design review from W-005 (via Vault)"]
    outputs: ["Engineering review checklist", "Structural system assessment", "Civil/grading review notes", "Utility capacity assessment"]
    documents: ["Engineering Review Memo (PDF)", "Structural Assessment Summary (PDF)"]

  vault:
    reads_from: ["design_review (from W-005)", "site_risk_profile (from W-003)"]
    writes_to: ["engineering_review", "structural_assessment"]

  referrals:
    receives_from:
      - { source: "W-005", trigger: "Structural/MEP questions from design review" }
    sends_to:
      - { target: "W-029", trigger: "MEP coordination items → MEP worker" }
      - { target: "W-012", trigger: "Engineering review complete → ready for permit" }

  alex_registration:
    capabilities_summary: "Reviews engineering plans for code compliance and constructability"
    priority_level: "normal"

  landing:
    headline: "Engineering review without the wait"
    subhead: "Structural, civil, and MEP review notes — before your engineer bills you for revisions."
    value_props:
      - "Pre-screens plans before formal PE review"
      - "Flags seismic and foundation concerns early"
      - "Does not replace your engineer — reduces revision cycles"
      - "Catches coordination gaps between disciplines"
```

---

### W-007 Environmental & Cultural Review
```yaml
worker:
  id: "W-007"
  name: "Environmental & Cultural Review"
  slug: "environmental-cultural-review"
  phase: "Phase 1 — Design & Entitlement"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - nepa: "Flag NEPA categorical exclusion vs. EA vs. EIS triggers"
      - ceqa: "Flag CEQA exemption vs. MND vs. EIR triggers (CA projects)"
      - esa: "Endangered Species Act — flag listed species habitat"
      - nhpa_106: "Section 106 — flag historic/cultural resource triggers"
      - clean_water: "Wetland and waters of the US identification"
      - hawaii_baseline: "HI: Chapter 343 HRS, burial council, cultural impact assessment, SMA permit"
    tier_2_schema:
      - environmental_risk_tolerance: "Acceptable remediation cost threshold"
      - preferred_consultants: "Phase I/II ESA vendor list"
    tier_3_schema:
      - review_depth: "Screening level vs. detailed analysis"

  capabilities:
    inputs: ["Property address and APN", "Site DD from W-003 (via Vault)", "Phase I ESA report (if available)", "Project description and disturbance area"]
    outputs: ["Environmental screening report", "Required reviews and timeline", "Cultural resource sensitivity assessment", "Mitigation strategy recommendations"]
    documents: ["Environmental Screening Report (PDF)", "Section 106/Cultural Resource Memo (PDF)", "Mitigation Tracking Checklist (XLSX)"]

  vault:
    reads_from: ["site_risk_profile (from W-003)", "entitlement_strategy (from W-004)"]
    writes_to: ["environmental_review", "cultural_review", "mitigation_requirements"]

  referrals:
    receives_from:
      - { source: "W-003", trigger: "Environmental risk flags → detailed review" }
      - { source: "W-004", trigger: "CEQA/NEPA triggers from entitlement" }
      - { source: "W-001", trigger: "Environmental risk in market data" }
    sends_to:
      - { target: "W-008", trigger: "Sustainability/energy impacts identified" }
      - { target: "W-004", trigger: "Environmental review complete → entitlement proceeds" }
      - { target: "W-012", trigger: "Environmental clearance → ready for permit" }

  alex_registration:
    capabilities_summary: "Screens for environmental and cultural compliance triggers, tracks mitigation"
    priority_level: "high"
    notification_triggers: ["ESA listed species habitat", "Cultural resource sensitivity flagged", "Mitigation deadline"]
    daily_briefing_contribution: "Active environmental reviews, clearance status, mitigation deadlines"

  landing:
    headline: "Know your environmental risk before it stops your project"
    subhead: "NEPA, CEQA, Section 106, wetlands, endangered species — screened before you spend."
    value_props:
      - "Screens for every federal, state, and local environmental trigger"
      - "Identifies cultural resource sensitivity before ground disturbance"
      - "Tracks mitigation requirements through completion"
      - "Hawaii-baseline: Chapter 343, burial council, cultural impact built in"
```

---

### W-008 Energy & Sustainability
```yaml
worker:
  id: "W-008"
  name: "Energy & Sustainability"
  slug: "energy-sustainability"
  phase: "Phase 1 — Design & Entitlement"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - energy_code: "Reference jurisdiction's adopted energy code (IECC, Title 24, etc.)"
      - green_cert: "Accurate representation of LEED, ENERGY STAR, NGBS requirements"
      - incentive_accuracy: "Credits and rebates must be current and jurisdiction-specific"
    tier_2_schema:
      - sustainability_goals: "Target certification level, net-zero goals, ESG reporting"
      - utility_rate_assumptions: "Local utility rates for ROI calculations"
    tier_3_schema:
      - analysis_scope: "Code compliance only vs. beyond-code optimization"

  capabilities:
    inputs: ["Building plans and specifications", "Design review from W-005 (via Vault)", "Project location and climate zone"]
    outputs: ["Energy code compliance assessment", "Green certification pathway", "Renewable energy and efficiency ROI", "Available incentive and rebate inventory"]
    documents: ["Energy Compliance Memo (PDF)", "Sustainability Strategy Report (PDF)", "Incentive Inventory (XLSX)"]

  vault:
    reads_from: ["design_review (from W-005)"]
    writes_to: ["energy_review", "sustainability_strategy", "available_incentives"]

  referrals:
    receives_from:
      - { source: "W-005", trigger: "Energy code questions from design review" }
      - { source: "W-007", trigger: "Sustainability impacts from environmental review" }
    sends_to:
      - { target: "W-017", trigger: "Tax credits/incentives → Tax Credit & Incentive worker" }
      - { target: "W-012", trigger: "Energy compliance confirmed → permit ready" }

  alex_registration:
    capabilities_summary: "Assesses energy code compliance, green certifications, sustainability incentives"
    priority_level: "normal"

  landing:
    headline: "Turn energy compliance into profit"
    subhead: "Code compliance, green certifications, tax credits — sustainability that pays for itself."
    value_props:
      - "Maps every applicable tax credit and rebate"
      - "Models ROI on renewable energy and efficiency upgrades"
      - "Tracks green certification from design through completion"
      - "Stays current on changing energy codes by jurisdiction"
```

---

### W-009 Accessibility & Fair Housing
```yaml
worker:
  id: "W-009"
  name: "Accessibility & Fair Housing"
  slug: "accessibility-fair-housing"
  phase: "Phase 1 — Design & Entitlement"
  type: "copilot"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - fha_design: "Fair Housing Act design and construction requirements for covered multifamily"
      - ada: "ADA Title III for public accommodations and common areas"
      - section_504: "Section 504 requirements for federally assisted housing"
      - state_access: "State-specific accessibility codes (CA CBC Chapter 11B, etc.)"
    tier_2_schema:
      - funding_sources: "Federal funding triggers Section 504"
      - unit_mix_accessibility: "Required accessible unit percentages"
    tier_3_schema:
      - review_scope: "FHA only, ADA only, or comprehensive"

  capabilities:
    inputs: ["Architectural plans (PDF)", "Unit mix and building type", "Funding sources"]
    outputs: ["Accessibility compliance checklist", "FHA design requirement analysis", "Required accessible unit count", "Common area accessibility review"]
    documents: ["Accessibility Review Memo (PDF)", "FHA Compliance Checklist (PDF)"]

  vault:
    reads_from: ["design_review (from W-005)", "program_summary (from W-005)"]
    writes_to: ["accessibility_review"]

  referrals:
    receives_from:
      - { source: "W-005", trigger: "Accessibility items flagged in design review" }
    sends_to:
      - { target: "W-005", trigger: "Requirements feed back to design" }
      - { target: "W-012", trigger: "Review complete → ready for permit" }

  landing:
    headline: "Get accessibility right the first time"
    subhead: "ADA, Fair Housing, Section 504 — every requirement checked before plan submission."
    value_props:
      - "Catches Fair Housing design violations before they become lawsuits"
      - "Calculates required accessible unit counts automatically"
      - "Flags Section 504 triggers when federal money is involved"
      - "Saves redesign costs by catching issues early"
```

---

### W-010 Government Relations & Public Hearing
```yaml
worker:
  id: "W-010"
  name: "Government Relations & Public Hearing"
  slug: "government-relations"
  phase: "Phase 1 — Design & Entitlement"
  type: "copilot"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - public_notice: "Track jurisdiction-specific public notice requirements"
      - open_meeting: "Flag Brown Act/sunshine law compliance"
      - lobbying_disclosure: "Flag lobbying registration triggers by jurisdiction"
    tier_2_schema:
      - political_landscape: "Council member positions, known opposition groups"
      - community_engagement_playbook: "Standard outreach approach"
    tier_3_schema:
      - briefing_format: "Talking points vs. full presentation prep"

  capabilities:
    inputs: ["Entitlement strategy from W-004 (via Vault)", "Project description and community impact", "Hearing schedule"]
    outputs: ["Public hearing preparation package", "Community engagement strategy", "Talking points and opposition responses", "Notice compliance checklist"]
    documents: ["Hearing Prep Package (PDF)", "Community Outreach Plan (PDF)", "Notice Compliance Checklist (PDF)"]

  vault:
    reads_from: ["entitlement_strategy (from W-004)"]
    writes_to: ["hearing_prep", "community_engagement_plan"]

  referrals:
    receives_from:
      - { source: "W-004", trigger: "Public hearing required → prep package" }
    sends_to:
      - { target: "W-004", trigger: "Hearing outcome → update entitlement strategy" }

  landing:
    headline: "Walk into every hearing prepared"
    subhead: "Talking points, opposition research, notice compliance — never blindsided."
    value_props:
      - "Prepares responses to anticipated opposition"
      - "Tracks notice deadlines so you never miss a filing"
      - "Builds community engagement strategy"
      - "Stays current on council positions"
```

---

### W-011 Fire & Life Safety
```yaml
worker:
  id: "W-011"
  name: "Fire & Life Safety"
  slug: "fire-life-safety"
  phase: "Phase 1 — Design & Entitlement"
  type: "copilot"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - nfpa: "Reference current NFPA 1, 13, 72, 101 as adopted by jurisdiction"
      - ibc_fire: "IBC Chapter 9 fire protection, Chapter 10 egress"
      - no_pe_stamp: "Does not replace fire protection engineer review"
    tier_2_schema:
      - fire_marshal_ahj: "Local fire authority having jurisdiction"
      - sprinkler_preference: "NFPA 13 vs. 13R vs. 13D based on building type"
    tier_3_schema:
      - review_scope: "Sprinkler, alarm, egress, or comprehensive"

  capabilities:
    inputs: ["Architectural plans (PDF)", "Building occupancy and construction type", "Design review from W-005 (via Vault)"]
    outputs: ["Fire protection requirements checklist", "Egress analysis (travel distance, exit width, count)", "Fire alarm and detection requirements", "Fire Marshal pre-submission notes"]
    documents: ["Fire & Life Safety Review Memo (PDF)", "Egress Analysis (PDF)"]

  vault:
    reads_from: ["design_review (from W-005)"]
    writes_to: ["fire_safety_review"]

  referrals:
    receives_from:
      - { source: "W-005", trigger: "Fire/life safety items from design review" }
    sends_to:
      - { target: "W-012", trigger: "Fire review complete → ready for permit" }
      - { target: "W-029", trigger: "Fire protection system → MEP coordination" }

  landing:
    headline: "Pass fire plan check the first time"
    subhead: "Sprinkler, alarm, egress — every fire marshal requirement checked before submission."
    value_props:
      - "Catches egress violations before plan check rejection"
      - "Identifies correct sprinkler system for your building"
      - "Prepares fire marshal pre-submission notes"
      - "Does not replace your fire engineer — reduces revision cycles"
```

---

## PHASE 2 — Permitting

### W-012 Permit Submission & Tracking
```yaml
worker:
  id: "W-012"
  name: "Permit Submission & Tracking"
  slug: "permit-tracking"
  phase: "Phase 2 — Permitting"
  type: "pipeline"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - jurisdiction_requirements: "Track submission requirements per jurisdiction"
      - plan_check_cycles: "Track correction cycles and resubmission requirements"
      - permit_expiration: "Track permit expiration and extension deadlines"
    tier_2_schema:
      - expediting_contacts: "Plan check expediter vendor list"
      - standard_submission_package: "Company's standard submission checklist additions"
    tier_3_schema:
      - notification_frequency: "Daily, weekly, or milestone-only updates"

  capabilities:
    inputs: ["Approved plans from Phase 1 workers (via Vault)", "Jurisdiction submission requirements", "Plan check correction letters"]
    outputs: ["Submission package checklist", "Permit status tracker", "Correction response tracking", "Permit timeline forecast"]
    documents: ["Submission Checklist (PDF)", "Permit Status Dashboard (XLSX)", "Correction Response Tracker (XLSX)"]

  vault:
    reads_from: ["entitlement_strategy (W-004)", "design_review (W-005)", "engineering_review (W-006)", "environmental_review (W-007)", "fire_safety_review (W-011)", "accessibility_review (W-009)"]
    writes_to: ["permit_status", "permit_timeline"]
    triggers: ["All Phase 1 reviews complete", "Correction letter received"]

  referrals:
    receives_from:
      - { source: "W-004 through W-011", trigger: "Design phase reviews complete → ready for submission" }
    sends_to:
      - { target: "W-015", trigger: "Permit approved → construction lending can close" }
      - { target: "W-021", trigger: "Permit approved → construction can begin" }

  alex_registration:
    capabilities_summary: "Tracks permit submissions, corrections, and approvals across jurisdictions"
    priority_level: "high"
    notification_triggers: ["Permit approved", "Correction letter received", "Permit expiration approaching"]
    daily_briefing_contribution: "Permit status updates, correction deadlines, approaching expirations"

  landing:
    headline: "Never lose track of a permit again"
    subhead: "Submissions, corrections, approvals — every permit tracked from filing to issuance."
    value_props:
      - "Tracks every permit across every jurisdiction"
      - "Manages plan check corrections and resubmittals"
      - "Alerts before permits expire"
      - "Connects permit approval directly to construction and lending"
```

---

**End of Part 2A — Phase 0 through Phase 2**
**Next: Part 2B — Phase 3 (Financing & Capital Stack): W-013 through W-020**
