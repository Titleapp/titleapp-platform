# TitleApp — Worker Catalog Part 2D
## Phase 5: Stabilization | Phase 6: Operations | Phase 7: Disposition | Horizontal | New Workers
### Session 23a | Workers W-031 through W-052

---

## PHASE 5 — Stabilization & Lease-Up

### W-031 Lease-Up & Marketing
```yaml
worker:
  id: "W-031"
  name: "Lease-Up & Marketing"
  slug: "lease-up-marketing"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - fair_housing_marketing: "Fair Housing advertising and marketing requirements"
      - affirmative_marketing: "Affirmative fair housing marketing plan where required"
      - truth_in_advertising: "No misleading claims about amenities, features, or availability"
    tier_2_schema:
      - marketing_budget: "Lease-up marketing budget"
      - target_demographics: "Target renter profile (income, household size)"
      - branding: "Property branding and messaging guidelines"
    tier_3_schema:
      - reporting_cadence: "Weekly vs. monthly lease-up reports"

  capabilities:
    inputs: ["Unit mix and pricing from W-034 (via Vault)", "Property features and amenities", "Market data from W-001 (via Vault)"]
    outputs: ["Marketing plan and timeline", "Lease-up velocity tracking", "Lead pipeline management", "Market comparison for pricing validation"]
    documents: ["Marketing Plan (PDF)", "Lease-Up Tracker (XLSX)", "Weekly Lease-Up Report (PDF)"]

  vault:
    reads_from: ["market_scorecard (W-001)", "rent_comp_data (W-001)"]
    writes_to: ["lease_up_status", "marketing_plan"]
    triggers: ["Certificate of Occupancy issued", "Pre-leasing phase begins"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Substantial completion → begin lease-up" }
    sends_to:
      - { target: "W-032", trigger: "Lease application received → tenant screening" }
      - { target: "W-034", trigger: "Market feedback → rent adjustment" }

  alex_registration:
    capabilities_summary: "Manages lease-up marketing, lead tracking, velocity reporting"
    priority_level: "high"
    notification_triggers: ["Velocity below target", "Occupancy milestone reached"]
    daily_briefing_contribution: "Lease-up velocity, leads, occupancy progress"

  landing:
    headline: "Fill your building faster"
    subhead: "Marketing plans, lead tracking, lease-up velocity — from CO to stabilized in record time."
    value_props:
      - "Tracks lease-up velocity against your pro forma"
      - "Manages lead pipeline from inquiry to signed lease"
      - "Fair Housing compliant marketing — always"
      - "Validates pricing against real-time market data"
```

---

### W-032 Tenant Screening
```yaml
worker:
  id: "W-032"
  name: "Tenant Screening"
  slug: "tenant-screening"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 29 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - fcra: "Fair Credit Reporting Act compliance"
      - fair_housing: "No screening criteria based on protected classes"
      - state_screening: "State-specific screening limitations (ban-the-box, income ratio caps)"
      - adverse_action: "Proper adverse action notice requirements"
    tier_2_schema:
      - screening_criteria: "Income ratio, credit score minimum, criminal history policy"
      - approved_screening_services: "Third-party screening vendor"
    tier_3_schema:
      - auto_approve_threshold: "Criteria for automatic approval"

  capabilities:
    inputs: ["Rental application", "Screening report results"]
    outputs: ["Screening decision recommendation", "Adverse action notice (if denial)", "Approval letter"]
    documents: ["Screening Summary (PDF)", "Adverse Action Notice (PDF)"]

  vault:
    reads_from: ["lease_up_status (W-031)"]
    writes_to: ["screening_results"]

  referrals:
    receives_from:
      - { source: "W-031", trigger: "Application received → screen" }
    sends_to:
      - { target: "W-033", trigger: "Tenant approved → lease execution and move-in" }

  landing:
    headline: "Screen tenants fairly and fast"
    subhead: "FCRA compliant, Fair Housing compliant — consistent screening every time."
    value_props:
      - "Consistent criteria applied to every applicant"
      - "FCRA and Fair Housing compliant"
      - "Automatic adverse action notices when required"
      - "Integrates with your screening service"
```

---

### W-033 Property Management
```yaml
worker:
  id: "W-033"
  name: "Property Management"
  slug: "property-management"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "composite"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - landlord_tenant: "State landlord-tenant law (notice periods, security deposit limits, habitability)"
      - fair_housing_ops: "Fair Housing in operations (reasonable accommodations, service animals)"
      - security_deposit: "State-specific deposit handling and return timelines"
    tier_2_schema:
      - management_sops: "Company standard operating procedures"
      - escalation_matrix: "Issue escalation thresholds and contacts"
      - lease_template: "Standard lease agreement template"
    tier_3_schema:
      - communication_preference: "Email, text, portal, or mixed"

  capabilities:
    inputs: ["Lease agreements", "Tenant communications", "Maintenance requests from W-035"]
    outputs: ["Tenant communication management", "Lease renewal tracking", "Move-in/move-out processing", "Violation notices"]
    documents: ["Lease Renewal Notice (PDF)", "Violation Notice (PDF)", "Move-Out Statement (PDF)"]

  vault:
    reads_from: ["screening_results (W-032)", "rent_roll (W-034)"]
    writes_to: ["tenant_records", "lease_status"]

  referrals:
    receives_from:
      - { source: "W-032", trigger: "Approved tenant → lease execution" }
    sends_to:
      - { target: "W-035", trigger: "Maintenance request → work order" }
      - { target: "W-045", trigger: "Lease dispute → legal review" }

  landing:
    headline: "Manage properties without the headaches"
    subhead: "Leases, renewals, violations, move-outs — every tenant interaction handled consistently."
    value_props:
      - "Tracks every lease from signing to renewal"
      - "State-specific landlord-tenant compliance"
      - "Consistent violation and notice procedures"
      - "Move-in/move-out processing automated"
```

---

### W-034 Rent Roll & Revenue Management
```yaml
worker:
  id: "W-034"
  name: "Rent Roll & Revenue Management"
  slug: "rent-roll-revenue"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - rent_control: "Rent control and stabilization compliance where applicable"
      - affordable_housing: "Income and rent limits for affordable/LIHTC units"
      - state_rent_increase: "State-specific rent increase notice requirements"
    tier_2_schema:
      - revenue_targets: "Pro forma revenue targets by unit type"
      - concession_policy: "Standard concession parameters"
      - renewal_increase_policy: "Standard renewal increase percentage"
    tier_3_schema:
      - analysis_frequency: "Real-time vs. monthly rent roll analysis"

  capabilities:
    inputs: ["Current rent roll", "Market rent data from W-001 (via Vault)", "Lease status from W-033"]
    outputs: ["Rent roll analysis (actual vs. market vs. pro forma)", "Revenue optimization recommendations", "Rent increase calendar", "Loss-to-lease analysis"]
    documents: ["Rent Roll Report (XLSX)", "Revenue Analysis (PDF)", "Rent Increase Schedule (XLSX)"]

  vault:
    reads_from: ["rent_comp_data (W-001)", "lease_status (W-033)"]
    writes_to: ["rent_roll", "revenue_analysis"]

  referrals:
    receives_from:
      - { source: "W-031", trigger: "Market feedback → pricing adjustment" }
    sends_to:
      - { target: "W-039", trigger: "Revenue data → accounting" }
      - { target: "W-051", trigger: "Revenue data → investor reporting" }

  landing:
    headline: "Optimize every dollar of rent"
    subhead: "Rent roll analysis, loss-to-lease, renewal pricing — revenue management that pays for itself."
    value_props:
      - "Compares actual rents to market in real time"
      - "Identifies loss-to-lease and concession burn-off"
      - "Rent control and affordable housing compliance"
      - "Revenue forecasting for investor reporting"
```

---

### W-035 Maintenance & Work Order
```yaml
worker:
  id: "W-035"
  name: "Maintenance & Work Order"
  slug: "maintenance-work-order"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 39 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - habitability: "Implied warranty of habitability — priority response for habitability issues"
      - emergency_response: "Emergency maintenance response requirements by state"
    tier_2_schema:
      - response_sla: "Response time SLAs by priority (emergency, urgent, routine)"
      - preferred_vendors: "Maintenance vendor list by trade"
    tier_3_schema:
      - notification_preference: "Real-time vs. daily summary"

  capabilities:
    inputs: ["Maintenance requests from tenants or staff", "Preventive maintenance schedules"]
    outputs: ["Work order tracking and assignment", "Preventive maintenance calendar", "Maintenance cost tracking", "Vendor performance tracking"]
    documents: ["Work Order Report (PDF)", "Preventive Maintenance Schedule (XLSX)", "Maintenance Cost Summary (XLSX)"]

  vault:
    reads_from: ["tenant_records (W-033)"]
    writes_to: ["work_orders", "maintenance_costs"]

  referrals:
    receives_from:
      - { source: "W-033", trigger: "Maintenance request from tenant" }
    sends_to:
      - { target: "W-038", trigger: "Potential warranty claim → warranty worker" }
      - { target: "W-041", trigger: "Vendor needed → vendor management" }

  landing:
    headline: "Fix it fast, track it always"
    subhead: "Work orders, preventive maintenance, vendor tracking — maintenance simplified."
    value_props:
      - "Tracks every work order from request to resolution"
      - "Preventive maintenance reduces emergency calls"
      - "Vendor performance tracking across your portfolio"
      - "Habitability issues flagged for priority response"
```

---

### W-036 Utility Management
```yaml
worker:
  id: "W-036"
  name: "Utility Management"
  slug: "utility-management"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 39 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - rubs: "Ratio Utility Billing System compliance by jurisdiction"
      - submeter: "Submeter requirements and regulations by state"
    tier_2_schema:
      - billing_method: "Master meter, submeter, or RUBS"
      - utility_providers: "Local utility providers and rate structures"
    tier_3_schema:
      - analysis_scope: "Cost tracking only vs. optimization recommendations"

  capabilities:
    inputs: ["Utility bills", "Submeter readings", "Building occupancy data"]
    outputs: ["Utility cost analysis and trending", "RUBS allocation calculations", "Consumption anomaly alerts", "Efficiency recommendations"]
    documents: ["Utility Cost Report (XLSX)", "RUBS Allocation Report (PDF)"]

  vault:
    reads_from: ["tenant_records (W-033)"]
    writes_to: ["utility_data", "utility_costs"]

  referrals:
    receives_from: []
    sends_to:
      - { target: "W-039", trigger: "Utility costs → accounting" }

  landing:
    headline: "Stop overpaying for utilities"
    subhead: "Cost tracking, RUBS allocation, consumption anomalies — utility management that saves money."
    value_props:
      - "Tracks utility costs and identifies anomalies"
      - "Calculates RUBS allocations automatically"
      - "Spots consumption spikes before they hit your NOI"
      - "Compliance with submeter and RUBS regulations"
```

---

### W-037 HOA & Association Management
```yaml
worker:
  id: "W-037"
  name: "HOA & Association Management"
  slug: "hoa-association"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - state_hoa: "State HOA/condo association statutes (Davis-Stirling in CA, etc.)"
      - reserve_study: "Reserve study requirements by state"
      - meeting_notice: "Board meeting notice and open meeting requirements"
    tier_2_schema:
      - cc_rs: "CC&Rs and governing documents"
      - reserve_policy: "Reserve funding policy and targets"
    tier_3_schema:
      - management_scope: "Full management vs. financial tracking only"

  capabilities:
    inputs: ["CC&Rs and governing documents", "Assessment schedules", "Violation reports"]
    outputs: ["Assessment tracking and collection", "Violation management", "Reserve fund tracking", "Board meeting preparation"]
    documents: ["Assessment Report (XLSX)", "Violation Notice (PDF)", "Reserve Fund Status (PDF)", "Board Meeting Package (PDF)"]

  vault:
    reads_from: []
    writes_to: ["hoa_records", "reserve_status"]

  referrals:
    receives_from: []
    sends_to:
      - { target: "W-045", trigger: "Enforcement action → legal review" }
      - { target: "W-039", trigger: "Assessment data → accounting" }

  landing:
    headline: "HOA management without the drama"
    subhead: "Assessments, violations, reserves, board meetings — association management simplified."
    value_props:
      - "Tracks assessments and collections automatically"
      - "Manages violations consistently per CC&Rs"
      - "Monitors reserve fund health against requirements"
      - "Prepares board meeting packages"
```

---

### W-038 Warranty & Defect Management
```yaml
worker:
  id: "W-038"
  name: "Warranty & Defect Management"
  slug: "warranty-defect"
  phase: "Phase 5 — Stabilization & Lease-Up"
  type: "standalone"
  pricing: { monthly: 39 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - state_warranty: "State implied warranty of workmanship and habitability"
      - statute_of_repose: "Statute of repose/limitations for construction defects by state"
      - right_to_repair: "Right to repair statutes where applicable (SB 800 in CA)"
    tier_2_schema:
      - warranty_periods: "Standard warranty periods by trade/system"
      - preferred_warranty_contractors: "Warranty repair vendor list"
    tier_3_schema:
      - tracking_detail: "Summary vs. detailed defect tracking"

  capabilities:
    inputs: ["Warranty claims from tenants/owners", "Construction punchlist from W-021 (via Vault)", "Maintenance data from W-035 (via Vault)"]
    outputs: ["Warranty claim tracking", "Warranty expiration calendar", "Defect pattern analysis", "Contractor warranty enforcement"]
    documents: ["Warranty Claim Report (PDF)", "Warranty Expiration Calendar (XLSX)", "Defect Analysis (PDF)"]

  vault:
    reads_from: ["work_orders (W-035)"]
    writes_to: ["warranty_claims", "warranty_calendar"]

  referrals:
    receives_from:
      - { source: "W-035", trigger: "Potential warranty item from maintenance" }
    sends_to:
      - { target: "W-045", trigger: "Warranty dispute → legal review" }
      - { target: "W-025", trigger: "Defect claim may trigger insurance" }

  landing:
    headline: "Don't let warranties expire unused"
    subhead: "Claim tracking, expiration calendars, defect patterns — every warranty dollar recovered."
    value_props:
      - "Tracks every warranty expiration before it lapses"
      - "Identifies defect patterns across units and trades"
      - "Enforces contractor warranty obligations"
      - "Right-to-repair compliance where applicable"
```

---

## PHASE 6 — Operations

### W-039 Accounting
```yaml
worker:
  id: "W-039"
  name: "Accounting"
  slug: "accounting"
  phase: "Phase 6 — Operations"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - gaap: "GAAP compliance for financial reporting"
      - tax_basis: "Tax basis vs. book basis distinction"
      - no_cpa: "Does not replace licensed CPA — analyzes and organizes"
    tier_2_schema:
      - chart_of_accounts: "Company chart of accounts structure"
      - reporting_periods: "Monthly, quarterly, annual close schedule"
      - accounting_software: "Integration with QBO, Yardi, AppFolio, etc."
    tier_3_schema:
      - report_format: "Summary vs. detailed financial statements"

  capabilities:
    inputs: ["Revenue data from W-034 (via Vault)", "Utility costs from W-036", "Maintenance costs from W-035", "HOA data from W-037"]
    outputs: ["P&L by property", "Balance sheet", "Cash flow statement", "Budget vs. actual variance", "Month-end close checklist"]
    documents: ["Financial Statements (PDF)", "Budget vs. Actual Report (XLSX)", "Month-End Close Checklist (PDF)"]

  vault:
    reads_from: ["rent_roll (W-034)", "utility_costs (W-036)", "maintenance_costs (W-035)", "hoa_records (W-037)"]
    writes_to: ["financial_statements", "budget_variance"]

  referrals:
    receives_from:
      - { source: "W-034", trigger: "Revenue data → accounting" }
      - { source: "W-036", trigger: "Utility costs → accounting" }
    sends_to:
      - { target: "W-040", trigger: "Financial data → tax preparation" }
      - { target: "W-051", trigger: "Financial statements → investor reporting" }

  landing:
    headline: "Books that close themselves"
    subhead: "P&L, cash flow, budget variance — property accounting without the back office."
    value_props:
      - "P&L by property updated from operational workers"
      - "Budget vs. actual variance analysis"
      - "Month-end close checklist management"
      - "Does not replace your CPA — gives them clean data"
```

---

### W-040 Tax & Assessment
```yaml
worker:
  id: "W-040"
  name: "Tax & Assessment"
  slug: "tax-assessment"
  phase: "Phase 6 — Operations"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - no_tax_advice: "Does not provide tax advice — tracks and organizes"
      - assessment_deadlines: "Property tax assessment appeal deadlines by jurisdiction"
      - exemption_tracking: "Track property tax exemption eligibility and renewals"
    tier_2_schema:
      - tax_preparer: "CPA/tax preparer contact"
      - appeal_strategy: "Standard approach to assessment appeals"
    tier_3_schema:
      - tracking_scope: "Property tax only vs. income tax preparation support"

  capabilities:
    inputs: ["Property tax assessments", "Financial statements from W-039 (via Vault)", "Exemption applications"]
    outputs: ["Assessment review and appeal recommendation", "Property tax calendar", "Exemption tracking", "Tax document organization for CPA"]
    documents: ["Assessment Appeal Package (PDF)", "Property Tax Calendar (XLSX)", "Tax Document Checklist (PDF)"]

  vault:
    reads_from: ["financial_statements (W-039)"]
    writes_to: ["tax_records", "assessment_appeals"]

  referrals:
    receives_from:
      - { source: "W-039", trigger: "Financial data → tax prep" }
    sends_to:
      - { target: "W-045", trigger: "Assessment appeal → legal support" }

  landing:
    headline: "Never overpay on property taxes"
    subhead: "Assessment reviews, appeal deadlines, exemption tracking — property tax management simplified."
    value_props:
      - "Reviews assessments and flags appeal opportunities"
      - "Tracks every appeal deadline by jurisdiction"
      - "Monitors property tax exemption eligibility"
      - "Organizes tax documents for your CPA"
```

---

### W-041 Vendor & Contract Management
```yaml
worker:
  id: "W-041"
  name: "Vendor & Contract Management"
  slug: "vendor-contract"
  phase: "Phase 6 — Operations"
  type: "standalone"
  pricing: { monthly: 39 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - contract_compliance: "Track contract terms, renewal dates, and SLA compliance"
      - insurance_verification: "Vendor insurance certificate tracking"
    tier_2_schema:
      - approved_vendors: "Master vendor list with ratings"
      - contract_templates: "Standard service contract templates"
    tier_3_schema:
      - tracking_scope: "Active contracts only vs. full vendor database"

  capabilities:
    inputs: ["Vendor contracts", "Insurance certificates", "Performance data from W-035 (via Vault)"]
    outputs: ["Contract expiration tracker", "Vendor performance scorecards", "Insurance compliance status", "Renewal recommendations"]
    documents: ["Vendor Scorecard (PDF)", "Contract Expiration Report (XLSX)", "Insurance Compliance Matrix (XLSX)"]

  vault:
    reads_from: ["work_orders (W-035)"]
    writes_to: ["vendor_records", "contract_status"]

  referrals:
    receives_from:
      - { source: "W-035", trigger: "Vendor needed for work order" }
    sends_to:
      - { target: "W-045", trigger: "Contract dispute → legal review" }

  landing:
    headline: "Every vendor tracked, every contract managed"
    subhead: "Expirations, performance, insurance — vendor management across your portfolio."
    value_props:
      - "Tracks every contract expiration and renewal date"
      - "Scores vendor performance based on work order data"
      - "Manages vendor insurance compliance"
      - "Renewal recommendations based on performance"
```

---

## PHASE 7 — Disposition

### W-042 Disposition Preparation
```yaml
worker:
  id: "W-042"
  name: "Disposition Preparation"
  slug: "disposition-prep"
  phase: "Phase 7 — Disposition"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - disclosure: "Seller disclosure requirements by state"
      - environmental_disclosure: "Known environmental condition disclosures"
      - fair_housing: "Fair Housing compliance in marketing and showings"
    tier_2_schema:
      - disposition_playbook: "Standard disposition process and timeline"
      - broker_relationships: "Preferred disposition broker list"
    tier_3_schema:
      - analysis_depth: "Quick valuation vs. full disposition package"

  capabilities:
    inputs: ["Financial statements from W-039 (via Vault)", "Rent roll from W-034 (via Vault)", "Capital improvements history", "Deal analysis from W-002 (via Vault)"]
    outputs: ["Disposition timeline and checklist", "Estimated disposition value range", "Seller disclosure package", "Due diligence data room preparation"]
    documents: ["Disposition Checklist (PDF)", "Valuation Summary (PDF)", "Seller Disclosure Package (PDF)"]

  vault:
    reads_from: ["financial_statements (W-039)", "rent_roll (W-034)", "deal_analysis (W-002)"]
    writes_to: ["disposition_package", "disposition_timeline"]

  referrals:
    receives_from: []
    sends_to:
      - { target: "W-043", trigger: "1031 exchange analysis → 1031 worker" }
      - { target: "W-044", trigger: "Title work for disposition → title & escrow" }
      - { target: "W-050", trigger: "Marketing and data room → Disposition Marketing" }

  landing:
    headline: "Sell at the right time for the right price"
    subhead: "Valuation, disclosure, data room — every step from hold/sell decision to closing."
    value_props:
      - "Estimates disposition value from your actual financials"
      - "Builds seller disclosure package by state requirements"
      - "Prepares due diligence data room from Vault data"
      - "Timeline and checklist from decision to close"
```

---

### W-043 1031 Exchange
```yaml
worker:
  id: "W-043"
  name: "1031 Exchange"
  slug: "1031-exchange"
  phase: "Phase 7 — Disposition"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - irc_1031: "IRC Section 1031 like-kind exchange requirements"
      - identification_period: "45-day identification period compliance"
      - exchange_period: "180-day exchange period compliance"
      - qi_requirements: "Qualified Intermediary requirements and restrictions"
      - related_party: "Related party exchange restrictions"
    tier_2_schema:
      - qi_relationships: "Qualified Intermediary contacts"
      - replacement_criteria: "Target property criteria for replacement"
    tier_3_schema:
      - exchange_type: "Delayed, reverse, or improvement exchange"

  capabilities:
    inputs: ["Disposition details from W-042 (via Vault)", "Basis and depreciation schedule", "Replacement property candidates"]
    outputs: ["1031 eligibility analysis", "Timeline tracker (45-day and 180-day)", "Identification letter preparation", "Boot calculation", "Replacement property comparison"]
    documents: ["1031 Exchange Analysis (PDF)", "Timeline Tracker (XLSX)", "Identification Letter (PDF)", "Boot Calculation (XLSX)"]

  vault:
    reads_from: ["disposition_package (W-042)", "financial_statements (W-039)"]
    writes_to: ["exchange_analysis", "exchange_timeline"]

  referrals:
    receives_from:
      - { source: "W-042", trigger: "1031 exchange analysis needed" }
    sends_to:
      - { target: "W-002", trigger: "Replacement property candidates → deal analysis" }
      - { target: "W-044", trigger: "Exchange closing → title & escrow" }
      - { target: "W-047", trigger: "45-day and 180-day deadlines → compliance tracker" }

  landing:
    headline: "Execute your 1031 without missing a deadline"
    subhead: "45-day ID, 180-day close, boot calculation — every exchange deadline tracked."
    value_props:
      - "Tracks 45-day and 180-day deadlines automatically"
      - "Calculates boot and tax impact"
      - "Prepares identification letters"
      - "Connects replacement property search to deal analysis"
```

---

## HORIZONTAL — All Phases

### W-044 Title & Escrow
```yaml
worker:
  id: "W-044"
  name: "Title & Escrow"
  slug: "title-escrow"
  phase: "Horizontal — All Phases"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - respa: "RESPA settlement procedures and disclosures"
      - title_standards: "ALTA title insurance standards"
      - escrow_regulations: "State escrow licensing and trust account requirements"
    tier_2_schema:
      - title_company: "Preferred title company relationships"
      - escrow_procedures: "Standard escrow instruction templates"
    tier_3_schema:
      - review_depth: "Exception review only vs. full title analysis"

  capabilities:
    inputs: ["Property address and APN", "Deal analysis from W-002 (via Vault)", "Preliminary title report"]
    outputs: ["Title exception review and analysis", "Escrow timeline tracking", "Closing checklist", "Title insurance comparison"]
    documents: ["Title Review Memo (PDF)", "Escrow Timeline (PDF)", "Closing Checklist (PDF)"]

  vault:
    reads_from: ["deal_analysis (W-002)", "dd_checklist (W-003)"]
    writes_to: ["title_review", "escrow_status"]

  referrals:
    receives_from:
      - { source: "W-002", trigger: "Deal moving forward → title search" }
      - { source: "W-003", trigger: "Title issues flagged → review" }
      - { source: "W-013", trigger: "Loan closing → title & escrow" }
      - { source: "W-015", trigger: "Construction loan closing → title" }
      - { source: "W-042", trigger: "Disposition → title work" }
      - { source: "W-043", trigger: "1031 exchange closing → title" }
    sends_to:
      - { target: "W-003", trigger: "Title exceptions → DD update" }

  alex_registration:
    capabilities_summary: "Reviews title exceptions, tracks escrow timelines, manages closing checklists"
    priority_level: "high"
    notification_triggers: ["Title exception requiring attention", "Escrow deadline approaching", "Closing date"]
    daily_briefing_contribution: "Active escrow status, approaching closings, title issues"

  landing:
    headline: "Clear title, clean closing"
    subhead: "Title review, escrow tracking, closing checklists — from commitment to keys."
    value_props:
      - "Reviews title exceptions and flags issues"
      - "Tracks every escrow milestone and deadline"
      - "Manages closing checklists across multiple transactions"
      - "Connects to every phase that touches title"
```

---

### W-045 Legal & Contract
```yaml
worker:
  id: "W-045"
  name: "Legal & Contract"
  slug: "legal-contract"
  phase: "Horizontal — All Phases"
  type: "copilot"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - no_legal_practice: "Does not practice law — reviews, flags, and organizes for attorney review"
      - jurisdiction_awareness: "Flag jurisdiction-specific legal requirements"
      - privilege_warning: "Cannot establish attorney-client privilege"
    tier_2_schema:
      - outside_counsel: "Law firm contacts by specialty"
      - contract_templates: "Standard contract templates library"
      - approval_thresholds: "Contract value thresholds requiring legal review"
    tier_3_schema:
      - review_depth: "Key terms only vs. comprehensive clause review"

  capabilities:
    inputs: ["Contracts and agreements (PDF upload)", "Term sheets", "Legal questions from other workers"]
    outputs: ["Contract review summaries", "Key terms extraction", "Risk flags and unusual clauses", "Comparison to standard terms"]
    documents: ["Contract Review Memo (PDF)", "Key Terms Summary (PDF)", "Risk Assessment (PDF)"]

  vault:
    reads_from: []
    writes_to: ["contract_reviews", "legal_flags"]

  referrals:
    receives_from:
      - { source: "W-002", trigger: "Deal approved → contract review" }
      - { source: "W-014", trigger: "Intercreditor agreement → legal" }
      - { source: "W-018", trigger: "PPM/subscription agreement → legal" }
      - { source: "W-022", trigger: "Subcontract execution → legal" }
      - { source: "W-033", trigger: "Lease dispute → legal" }
      - { source: "W-017", trigger: "Tax credit partnership → legal" }
    sends_to: []

  alex_registration:
    capabilities_summary: "Reviews contracts, flags risks, extracts key terms, organizes for attorney review"
    priority_level: "high"
    notification_triggers: ["High-risk clause identified", "Contract deadline approaching"]
    daily_briefing_contribution: "Pending contract reviews, flagged items, approaching deadlines"

  landing:
    headline: "Review every contract before you sign"
    subhead: "Key terms, risk flags, unusual clauses — contract review that saves your attorney time."
    value_props:
      - "Extracts and summarizes key terms automatically"
      - "Flags unusual or high-risk clauses"
      - "Compares terms against your standard contracts"
      - "Does not replace your attorney — reduces their billable hours"
```

---

### W-046 Entity & Formation
```yaml
worker:
  id: "W-046"
  name: "Entity & Formation"
  slug: "entity-formation"
  phase: "Horizontal — All Phases"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - state_formation: "State formation and registration requirements"
      - annual_compliance: "Annual report and franchise tax deadlines by state"
      - no_legal_advice: "Does not provide legal advice on entity structure"
    tier_2_schema:
      - standard_structure: "Company's standard entity structure (LLC, LP, Series)"
      - registered_agent: "Registered agent service"
      - formation_state: "Default formation state"
    tier_3_schema:
      - tracking_scope: "New formations only vs. full portfolio entity management"

  capabilities:
    inputs: ["Project details", "Ownership structure", "State requirements"]
    outputs: ["Entity structure recommendation", "Formation checklist", "Annual compliance calendar", "EIN application tracking"]
    documents: ["Entity Structure Memo (PDF)", "Formation Checklist (PDF)", "Compliance Calendar (XLSX)"]

  vault:
    reads_from: []
    writes_to: ["entity_records", "compliance_calendar"]

  referrals:
    receives_from:
      - { source: "W-018", trigger: "Entity formation for offering" }
      - { source: "W-020", trigger: "QOF entity formation" }
    sends_to:
      - { target: "W-047", trigger: "Entity compliance deadlines → tracker" }

  landing:
    headline: "Right entity, right state, on time"
    subhead: "Formation, EIN, annual reports, compliance — entity management across your portfolio."
    value_props:
      - "Recommends entity structure for each project"
      - "Tracks formation requirements by state"
      - "Manages annual report and franchise tax deadlines"
      - "Does not replace your attorney — gives them a head start"
```

---

### W-047 Compliance & Deadline Tracker
```yaml
worker:
  id: "W-047"
  name: "Compliance & Deadline Tracker"
  slug: "compliance-tracker"
  phase: "Horizontal — All Phases"
  type: "pipeline"
  pricing: { monthly: 39 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - deadline_accuracy: "All deadlines must reference current statutory or contractual sources"
      - cascading_alerts: "Multi-level alerts (30-day, 14-day, 7-day, 1-day)"
    tier_2_schema:
      - alert_recipients: "Who receives compliance alerts by category"
      - escalation_rules: "Missed deadline escalation procedure"
    tier_3_schema:
      - alert_frequency: "Daily digest vs. real-time alerts"

  capabilities:
    inputs: ["Deadlines from all workers (via Vault)", "Custom compliance items", "Regulatory calendars"]
    outputs: ["Master compliance calendar", "Upcoming deadline alerts", "Missed deadline escalation", "Compliance status dashboard"]
    documents: ["Compliance Calendar (XLSX)", "Deadline Status Report (PDF)"]

  vault:
    reads_from: ["All worker deadline outputs"]
    writes_to: ["compliance_calendar", "deadline_status"]

  referrals:
    receives_from:
      - { source: "W-017", trigger: "Tax credit compliance milestones" }
      - { source: "W-020", trigger: "OZ compliance milestones" }
      - { source: "W-043", trigger: "1031 exchange deadlines" }
      - { source: "W-046", trigger: "Entity compliance deadlines" }
    sends_to: []

  alex_registration:
    capabilities_summary: "Master compliance calendar — aggregates all deadlines across all workers"
    priority_level: "critical"
    notification_triggers: ["Any deadline within 7 days", "Missed deadline"]
    daily_briefing_contribution: "Top 5 upcoming deadlines, any overdue items"

  landing:
    headline: "Never miss a deadline again"
    subhead: "Every compliance date, every filing, every expiration — one calendar, cascading alerts."
    value_props:
      - "Aggregates deadlines from every worker on your platform"
      - "Cascading alerts at 30, 14, 7, and 1 day"
      - "Escalation when deadlines are missed"
      - "Single source of truth for all compliance dates"
```

---

### W-048 Alex — Chief of Staff
```yaml
worker:
  id: "W-048"
  name: "Alex — Chief of Staff"
  slug: "chief-of-staff"
  phase: "Horizontal — All Phases"
  type: "composite"
  pricing: { monthly: 0, note: "FREE with 3+ worker subscriptions" }
  status: "live"

  raas:
    tier_0: "inherited"
    tier_1:
      - data_scope: "Only accesses data within user's Vault scope"
      - no_autonomous_actions: "Coordinates and recommends — never executes without user approval"
      - cross_worker_privacy: "Respects worker-level access controls"
    tier_2_schema:
      - briefing_schedule: "Daily briefing time and format"
      - escalation_rules: "What gets escalated immediately vs. batched"
      - team_distribution: "How tasks are distributed across team members"
    tier_3_schema:
      - communication_style: "Formal, casual, or brief"
      - name: "Customizable (default: Alex)"
      - voice: "Customizable voice and tone"

  capabilities:
    inputs: ["All worker outputs (via Vault)", "User tasks and instructions", "Calendar and scheduling data"]
    outputs: ["Daily morning briefing", "Task routing to appropriate workers", "Cross-worker status summaries", "Priority recommendations", "Deadline reminders"]
    documents: ["Daily Briefing (PDF)", "Weekly Summary (PDF)", "Portfolio Dashboard (PDF)"]

  vault:
    reads_from: ["All worker outputs within user's scope"]
    writes_to: ["briefings", "task_routing"]

  referrals:
    receives_from: ["All workers — Alex sees everything"]
    sends_to: ["All workers — Alex can route tasks to any worker"]

  alex_registration:
    capabilities_summary: "I AM Alex. I coordinate all workers, provide briefings, and route tasks."
    priority_level: "critical"

  landing:
    headline: "Your Chief of Staff that never sleeps"
    subhead: "Daily briefings, task routing, deadline tracking — Alex coordinates your entire operation."
    value_props:
      - "Morning briefing with every worker's status"
      - "Routes tasks to the right worker automatically"
      - "Catches cross-worker conflicts and dependencies"
      - "Free with 3 or more worker subscriptions"
```

---

## NEW WORKERS (Gap Fills)

### W-049 Property Insurance & Risk (NEW)
```yaml
worker:
  id: "W-049"
  name: "Property Insurance & Risk"
  slug: "property-insurance"
  phase: "Phase 5-6 — Stabilization & Operations"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - state_doi: "State Department of Insurance regulations"
      - flood_insurance: "NFIP and private flood insurance requirements"
      - earthquake: "Earthquake insurance requirements where applicable"
      - lender_required: "Lender-required coverage tracking"
    tier_2_schema:
      - insurance_broker: "Property insurance broker contact"
      - coverage_standards: "Minimum coverage by property type and value"
    tier_3_schema:
      - review_cadence: "Annual review vs. event-triggered"

  capabilities:
    inputs: ["Property details and value", "Lender insurance requirements", "Current policy documents", "Claims history"]
    outputs: ["Coverage adequacy analysis", "Policy comparison matrix", "Claims management tracking", "Renewal calendar"]
    documents: ["Coverage Analysis (PDF)", "Policy Comparison (XLSX)", "Claims Summary (PDF)"]

  vault:
    reads_from: ["financial_statements (W-039)"]
    writes_to: ["property_insurance_status", "claims_tracking"]

  referrals:
    receives_from:
      - { source: "W-025", trigger: "Construction complete → transition to property insurance" }
    sends_to:
      - { target: "W-039", trigger: "Insurance costs → accounting" }

  landing:
    headline: "Property insurance that actually covers you"
    subhead: "Coverage analysis, policy comparison, claims tracking — post-construction insurance managed."
    value_props:
      - "Analyzes coverage adequacy against property value"
      - "Compares policy options side by side"
      - "Tracks lender-required coverage compliance"
      - "Manages claims from filing to resolution"
```

---

### W-050 Disposition Marketing & Data Room (NEW)
```yaml
worker:
  id: "W-050"
  name: "Disposition Marketing & Data Room"
  slug: "disposition-marketing"
  phase: "Phase 7 — Disposition"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - confidentiality: "NDA/CA tracking for data room access"
      - disclosure: "Seller disclosure requirements by state"
      - fair_housing: "Fair Housing compliance in property marketing"
    tier_2_schema:
      - marketing_template: "Standard disposition marketing package"
      - data_room_structure: "Standard data room folder structure"
    tier_3_schema:
      - marketing_scope: "Broker-managed vs. direct marketing"

  capabilities:
    inputs: ["Disposition package from W-042 (via Vault)", "Financial data from W-039", "Rent roll from W-034", "Property photos and materials"]
    outputs: ["Offering memorandum preparation", "Virtual data room organization", "Buyer qualification tracking", "NDA/CA management", "Bid tracking"]
    documents: ["Offering Memorandum (PDF)", "Data Room Index (PDF)", "Buyer Tracker (XLSX)", "NDA Template (PDF)"]

  vault:
    reads_from: ["disposition_package (W-042)", "financial_statements (W-039)", "rent_roll (W-034)"]
    writes_to: ["disposition_marketing", "data_room_status", "buyer_tracking"]

  referrals:
    receives_from:
      - { source: "W-042", trigger: "Disposition decision → marketing and data room" }
    sends_to:
      - { target: "W-044", trigger: "Buyer selected → title and escrow" }

  landing:
    headline: "Sell your asset like an institution"
    subhead: "Offering memorandum, data room, buyer tracking — disposition marketing that maximizes value."
    value_props:
      - "Builds virtual data room from your Vault data automatically"
      - "Tracks buyer NDAs and qualification"
      - "Manages bid process and offer comparison"
      - "Packaging that competes with institutional dispositions"
```

---

### W-051 Investor Reporting & Distributions (NEW)
```yaml
worker:
  id: "W-051"
  name: "Investor Reporting & Distributions"
  slug: "investor-reporting-distributions"
  phase: "Phase 6 — Operations"
  type: "standalone"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - partnership_accounting: "Partnership allocation and distribution compliance"
      - k1_requirements: "K-1 preparation requirements and deadlines"
      - waterfall_compliance: "Distribution waterfall per operating agreement"
      - no_tax_advice: "Does not provide tax advice — calculates per agreement terms"
    tier_2_schema:
      - distribution_policy: "Quarterly, monthly, or event-based distributions"
      - waterfall_structure: "Operating agreement waterfall terms"
      - reporting_template: "Standard investor report format"
    tier_3_schema:
      - report_detail: "Summary vs. detailed performance"

  capabilities:
    inputs: ["Financial statements from W-039 (via Vault)", "Revenue data from W-034", "Capital stack from W-016", "Waterfall terms from operating agreement"]
    outputs: ["Quarterly investor reports", "Distribution calculations per waterfall", "K-1 preparation worksheets", "IRR and equity multiple tracking", "Cash-on-cash return reporting"]
    documents: ["Quarterly Investor Report (PDF)", "Distribution Summary (PDF)", "K-1 Worksheet (XLSX)", "Performance Dashboard (PDF)"]

  vault:
    reads_from: ["financial_statements (W-039)", "rent_roll (W-034)", "capital_stack (W-016)", "waterfall_model (W-016)"]
    writes_to: ["investor_reports", "distribution_records", "k1_worksheets"]

  referrals:
    receives_from:
      - { source: "W-019", trigger: "Ongoing reporting → distributions" }
      - { source: "W-039", trigger: "Financial statements → investor reporting" }
      - { source: "W-034", trigger: "Revenue data → investor reporting" }
    sends_to:
      - { target: "W-040", trigger: "K-1 worksheets → tax preparation" }

  alex_registration:
    capabilities_summary: "Generates investor reports, calculates distributions per waterfall, prepares K-1 worksheets"
    priority_level: "high"
    notification_triggers: ["Distribution calculation ready", "K-1 deadline approaching", "Quarterly report due"]
    daily_briefing_contribution: "Upcoming distribution dates, reporting deadlines, K-1 status"

  landing:
    headline: "Distributions calculated, investors informed"
    subhead: "Waterfall calculations, K-1 prep, quarterly reports — investor operations on autopilot."
    value_props:
      - "Calculates distributions per your operating agreement waterfall"
      - "Generates K-1 preparation worksheets for your CPA"
      - "Quarterly investor reports with actual performance data"
      - "Tracks IRR and equity multiple against projections"
```

---

### W-052 Debt Service & Loan Compliance (NEW)
```yaml
worker:
  id: "W-052"
  name: "Debt Service & Loan Compliance"
  slug: "debt-service-compliance"
  phase: "Phase 6 — Operations"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - covenant_tracking: "Loan covenant compliance monitoring"
      - reporting_requirements: "Lender reporting requirements and deadlines"
      - default_triggers: "Early warning on potential default triggers"
    tier_2_schema:
      - loan_portfolio: "Active loan list with covenant details"
      - dscr_threshold: "Minimum DSCR alert threshold"
      - lender_contacts: "Lender relationship contacts"
    tier_3_schema:
      - monitoring_frequency: "Monthly vs. quarterly covenant testing"

  capabilities:
    inputs: ["Financial statements from W-039 (via Vault)", "Loan documents and covenants", "Senior debt terms from W-013 (via Vault)"]
    outputs: ["DSCR monitoring and trending", "Covenant compliance testing", "Lender reporting package", "Refinance trigger analysis", "Maturity date tracking"]
    documents: ["Covenant Compliance Report (PDF)", "DSCR Trending Analysis (XLSX)", "Lender Report Package (PDF)", "Maturity Calendar (XLSX)"]

  vault:
    reads_from: ["financial_statements (W-039)", "senior_debt_analysis (W-013)", "rent_roll (W-034)"]
    writes_to: ["debt_compliance", "dscr_monitoring", "maturity_calendar"]

  referrals:
    receives_from:
      - { source: "W-039", trigger: "Financial data → covenant testing" }
    sends_to:
      - { target: "W-013", trigger: "Refinance trigger → senior debt analysis" }
      - { target: "W-047", trigger: "Covenant and maturity deadlines → compliance tracker" }

  alex_registration:
    capabilities_summary: "Monitors DSCR, tests loan covenants, tracks maturity dates, prepares lender reports"
    priority_level: "high"
    notification_triggers: ["DSCR below threshold", "Covenant violation risk", "Maturity within 12 months"]
    daily_briefing_contribution: "Debt service status, covenant compliance, approaching maturities"

  landing:
    headline: "Stay ahead of every loan covenant"
    subhead: "DSCR monitoring, covenant testing, maturity tracking — never be surprised by your lender."
    value_props:
      - "Monitors DSCR trending against your covenant minimum"
      - "Tests all loan covenants automatically each period"
      - "Tracks maturity dates with refinance trigger alerts"
      - "Generates lender reporting packages"
```

---

### PLAT-005 HR & People Worker
```yaml
worker:
  id: "PLAT-005"
  name: "HR & People Worker"
  slug: "hr-people"
  phase: "Platform (Business in a Box)"
  type: "horizontal"
  pricing: { monthly: 29 }
  status: "planned"

  raas:
    tier_0: "inherited"
    tier_1:
      - flsa_compliance: "FLSA wage and hour rules"
      - fmla_eligibility: "FMLA eligibility rules"
      - ada_accommodation: "ADA accommodation rules"
      - i9_verification: "I-9 employment eligibility verification"
      - w4_withholding: "W-4 withholding form requirements"
    tier_2_schema:
      - hr_policies: "Operator HR policies and employee handbook"
      - onboarding_checklist: "Company-specific onboarding checklist"
      - pto_policies: "PTO and leave policies"
    tier_3_schema:
      - schedule_preferences: "Employee personal schedule preferences"
      - communication_preferences: "Communication preferences"

  capabilities:
    inputs: ["Employee records", "Compliance documents", "Schedule data"]
    outputs: ["Compliance flag dashboard", "Onboarding checklists", "Document expiration alerts", "Schedule overview"]
    documents: ["Employee Register (PDF)", "Compliance Status Report (XLSX)", "Onboarding Checklist (PDF)"]

  vault:
    reads_from: ["contacts"]
    writes_to: ["employees", "compliance_flags"]

  referrals:
    receives_from:
      - { source: "PLAT-001", trigger: "Payroll data → employee record" }
    sends_to:
      - { target: "PLAT-001", trigger: "Compensation changes → accounting" }

  landing:
    headline: "Every employee tracked, every deadline met"
    subhead: "Onboarding, scheduling, compliance reminders, and contractor management. Alex reminds you what needs attention."
    value_props:
      - "Tracks onboarding checklists and missing documents"
      - "Monitors compliance deadlines (I-9, certifications, licenses)"
      - "Manages employee and contractor schedules"
      - "Reminds about expiring agreements and renewals"
```

---

**End of Part 2D — Complete Catalog**

## CATALOG SUMMARY

| Phase | Workers | Monthly Revenue (if all subscribed) |
|-------|---------|-------------------------------------|
| Phase 0 — Site Selection | W-001, W-002, W-003, W-030 | $276 |
| Phase 1 — Design & Entitlement | W-004 through W-011 | $562 |
| Phase 2 — Permitting | W-012 | $59 |
| Phase 3 — Financing | W-013 through W-020 | $671 |
| Phase 4 — Construction | W-021 through W-029 | $499 |
| Phase 5 — Stabilization | W-031 through W-038 | $373 |
| Phase 6 — Operations | W-039, W-040, W-041, W-051, W-052 | $275 |
| Phase 7 — Disposition | W-042, W-043, W-050 | $177 |
| Horizontal | W-044 through W-048, W-049 | $324 |
| **TOTAL** | **52 workers** | **$3,216/mo** |

## CLIENT BUNDLES (Updated)
- **Scott / JMA Capital** (investor/syndicator): ~$740/mo for full investment + financing stack
- **Layton Construction** (GC): ~$630/mo for digital construction office
- **BlackRock** (institutional): ~$3,216/mo for complete lifecycle — replacing $50K+/mo in consultant fees
