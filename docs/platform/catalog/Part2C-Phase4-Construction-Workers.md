# TitleApp — Worker Catalog Part 2C
## Phase 4: Construction
### Session 23a | Workers W-021 through W-029

---

### W-021 Construction Manager
```yaml
worker:
  id: "W-021"
  name: "Construction Manager"
  slug: "construction-manager"
  phase: "Phase 4 — Construction"
  type: "composite"
  pricing: { monthly: 79 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - osha: "OSHA 29 CFR 1926 construction safety standards"
      - building_code: "IBC/IRC compliance tracking through construction"
      - prevailing_wage: "Davis-Bacon and state prevailing wage tracking where applicable"
      - mechanics_lien: "Preliminary notice and lien deadline tracking by state"
    tier_2_schema:
      - project_template: "Standard project setup (phases, milestones, deliverables)"
      - budget_format: "CSI MasterFormat or custom division structure"
      - rfi_log_format: "Standard RFI tracking format"
      - change_order_authority: "Approval thresholds by dollar amount"
    tier_3_schema:
      - dashboard_view: "Timeline, budget, or issues-first"
      - reporting_cadence: "Daily, weekly, or milestone-based"

  capabilities:
    inputs: ["Permit status from W-012 (via Vault)", "Construction budget and schedule", "Contract documents", "Construction loan terms from W-015 (via Vault)"]
    outputs: ["Project dashboard (schedule, budget, issues)", "RFI log and tracking", "Change order log with budget impact", "Weekly/monthly progress reports", "Punchlist management"]
    documents: ["Monthly Progress Report (PDF)", "Budget Tracking Report (XLSX)", "RFI Log (XLSX)", "Change Order Log (XLSX)", "Punchlist (PDF)"]
    analyzes: ["Schedule variance (planned vs. actual)", "Budget variance by division", "Change order impact on total cost", "Critical path analysis"]

  vault:
    reads_from: ["permit_status (W-012)", "construction_loan_analysis (W-015)", "draw_schedule (W-015)"]
    writes_to: ["construction_budget", "construction_schedule", "rfi_log", "change_order_log", "progress_reports"]
    triggers: ["Permit approved → construction begins", "Weekly reporting cycle"]

  referrals:
    receives_from:
      - { source: "W-012", trigger: "Permit approved → construction can begin" }
    sends_to:
      - { target: "W-022", trigger: "Bid packages needed → procurement" }
      - { target: "W-023", trigger: "Draw request due → construction draw" }
      - { target: "W-025", trigger: "Insurance certificate needed → insurance" }
      - { target: "W-027", trigger: "Inspection milestone → QC" }
      - { target: "W-028", trigger: "Safety audit due → safety" }
      - { target: "W-029", trigger: "MEP coordination issue → MEP" }
      - { target: "W-024", trigger: "Labor needs identified → staffing" }
      - { target: "W-026", trigger: "Material procurement → supply chain" }

  alex_registration:
    capabilities_summary: "Manages construction projects — schedule, budget, RFIs, change orders, progress reporting"
    priority_level: "critical"
    notification_triggers: ["Schedule delay on critical path", "Budget overrun exceeds threshold", "Change order requires approval"]
    daily_briefing_contribution: "Active project status, schedule/budget variance, pending COs, today's inspections"

  landing:
    headline: "Your digital construction office"
    subhead: "Schedule, budget, RFIs, change orders — one place for everything on your jobsite."
    value_props:
      - "Tracks schedule and budget variance in real time"
      - "Manages RFIs and change orders with automatic budget impact"
      - "Connects directly to your construction loan draw schedule"
      - "Coordinates every construction worker on the platform"
```

---

### W-022 Bid & Procurement
```yaml
worker:
  id: "W-022"
  name: "Bid & Procurement"
  slug: "bid-procurement"
  phase: "Phase 4 — Construction"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - prevailing_wage: "Flag prevailing wage requirements for bid packages"
      - dbe_mbe_wbe: "Track disadvantaged/minority/women-owned business requirements"
      - bid_rigging: "No facilitation of bid rigging or anti-competitive practices"
    tier_2_schema:
      - approved_bidders: "Prequalified subcontractor and vendor lists"
      - bid_template: "Standard bid form and requirements"
      - insurance_requirements: "Required insurance minimums for subs"
    tier_3_schema:
      - comparison_criteria: "Price, schedule, qualifications, or weighted"

  capabilities:
    inputs: ["Bid packages from W-021 (via Vault)", "Scope of work descriptions", "Submitted bids"]
    outputs: ["Bid comparison matrix", "Bid leveling analysis", "Scope gap identification", "Award recommendation"]
    documents: ["Bid Comparison Matrix (XLSX)", "Bid Leveling Report (PDF)", "Award Recommendation Memo (PDF)"]

  vault:
    reads_from: ["construction_budget (W-021)"]
    writes_to: ["bid_analysis", "procurement_status"]
    triggers: ["Bid package issued by W-021", "Bids received"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Bid packages needed for trade scopes" }
    sends_to:
      - { target: "W-021", trigger: "Awards made → update construction budget" }
      - { target: "W-045", trigger: "Subcontract execution → legal review" }
      - { target: "W-025", trigger: "Insurance requirements for awarded subs" }

  alex_registration:
    capabilities_summary: "Manages bid solicitation, leveling, comparison, and award recommendations"
    priority_level: "normal"
    notification_triggers: ["Bid deadline approaching", "Bids received ready for leveling"]
    daily_briefing_contribution: "Open bids, pending awards, procurement status"

  landing:
    headline: "Level every bid in minutes, not hours"
    subhead: "Bid comparison, scope gap analysis, award recommendations — no more spreadsheet gymnastics."
    value_props:
      - "Compares bids side by side with automatic scope gap detection"
      - "Levels bids to true apples-to-apples"
      - "Tracks prevailing wage and DBE/MBE/WBE requirements"
      - "Award recommendations based on your weighted criteria"
```

---

### W-023 Construction Draw
```yaml
worker:
  id: "W-023"
  name: "Construction Draw"
  slug: "construction-draw"
  phase: "Phase 4 — Construction"
  type: "pipeline"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - aia_g702_g703: "AIA G702/G703 format compliance for draw applications"
      - retainage: "Track retainage requirements per contract and state law"
      - lien_waiver: "Conditional and unconditional lien waiver tracking by state"
      - mechanics_lien: "Preliminary notice compliance tracking"
    tier_2_schema:
      - draw_format: "AIA G702/G703 or lender-specific format"
      - retainage_percentage: "Standard retainage rate (typically 10%)"
      - lender_requirements: "Construction lender draw submission requirements"
    tier_3_schema:
      - tracking_detail: "Line-item vs. division-level"

  capabilities:
    inputs: ["Construction budget from W-021 (via Vault)", "Draw schedule from W-015 (via Vault)", "Subcontractor payment applications", "Inspection reports from W-027"]
    outputs: ["Draw request package (G702/G703)", "Lien waiver tracking matrix", "Retainage tracking", "Draw vs. budget reconciliation"]
    documents: ["Draw Request Package (PDF)", "Lien Waiver Matrix (XLSX)", "Draw Reconciliation Report (XLSX)"]

  vault:
    reads_from: ["construction_budget (W-021)", "draw_schedule (W-015)", "construction_loan_analysis (W-015)", "progress_reports (W-021)"]
    writes_to: ["draw_requests", "lien_waiver_status", "retainage_tracking"]
    triggers: ["Draw period end date", "Subcontractor payment applications received"]

  referrals:
    receives_from:
      - { source: "W-015", trigger: "Construction loan closed → draw management begins" }
      - { source: "W-021", trigger: "Draw request due → prepare package" }
    sends_to:
      - { target: "W-015", trigger: "Draw submitted → update construction lending tracker" }
      - { target: "W-021", trigger: "Draw reconciliation → update budget" }
      - { target: "W-027", trigger: "Draw requires inspection sign-off → QC" }

  alex_registration:
    capabilities_summary: "Manages construction draw requests, lien waivers, retainage tracking"
    priority_level: "high"
    notification_triggers: ["Draw period ending", "Missing lien waivers", "Retainage milestone"]
    daily_briefing_contribution: "Draw request status, missing lien waivers, upcoming draw dates"

  landing:
    headline: "Draw requests that get funded the first time"
    subhead: "G702/G703 packages, lien waiver tracking, retainage — no more draw delays."
    value_props:
      - "Generates AIA G702/G703 draw packages automatically"
      - "Tracks every lien waiver — conditional and unconditional"
      - "Reconciles draws against budget in real time"
      - "Connects directly to your construction lender"
```

---

### W-024 Labor & Staffing
```yaml
worker:
  id: "W-024"
  name: "Labor & Staffing"
  slug: "labor-staffing"
  phase: "Phase 4 — Construction"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - prevailing_wage: "Davis-Bacon and state prevailing wage compliance"
      - certified_payroll: "Certified payroll reporting requirements"
      - e_verify: "E-Verify requirements where applicable"
      - flsa: "Fair Labor Standards Act overtime and classification"
    tier_2_schema:
      - labor_sources: "Union halls, staffing agencies, direct hire preferences"
      - wage_rates: "Current prevailing wage rates by trade and jurisdiction"
    tier_3_schema:
      - tracking_level: "Project-level vs. task-level labor tracking"

  capabilities:
    inputs: ["Construction schedule from W-021 (via Vault)", "Trade scope requirements", "Prevailing wage determination"]
    outputs: ["Labor needs forecast by trade and week", "Certified payroll reports", "Labor cost tracking vs. budget", "Prevailing wage compliance log"]
    documents: ["Labor Forecast (XLSX)", "Certified Payroll Report (PDF)", "Prevailing Wage Compliance Log (XLSX)"]

  vault:
    reads_from: ["construction_schedule (W-021)", "construction_budget (W-021)"]
    writes_to: ["labor_forecast", "labor_compliance"]
    triggers: ["Schedule phase starting", "Certified payroll period ending"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Labor needs identified" }
    sends_to:
      - { target: "W-021", trigger: "Labor cost tracking → update budget" }
      - { target: "W-028", trigger: "New workers on site → safety orientation" }

  alex_registration:
    capabilities_summary: "Forecasts labor needs, tracks prevailing wage compliance, manages certified payroll"
    priority_level: "normal"
    notification_triggers: ["Labor shortage forecast", "Certified payroll deadline"]
    daily_briefing_contribution: "Labor forecast, compliance status"

  landing:
    headline: "Right trade, right time, right rate"
    subhead: "Labor forecasting, prevailing wage compliance, certified payroll — workforce simplified."
    value_props:
      - "Forecasts labor needs by trade and week"
      - "Tracks prevailing wage compliance automatically"
      - "Generates certified payroll reports"
      - "Catches labor budget variances before they compound"
```

---

### W-025 Insurance & Risk
```yaml
worker:
  id: "W-025"
  name: "Insurance & Risk"
  slug: "insurance-risk"
  phase: "Phase 4 — Construction"
  type: "standalone"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - state_doi: "State Department of Insurance regulations"
      - builders_risk: "Builder's risk policy requirements and endorsements"
      - additional_insured: "Additional insured and certificate requirements"
      - wrap_up: "OCIP/CCIP wrap-up program requirements"
    tier_2_schema:
      - insurance_broker: "Company's insurance broker contact"
      - minimum_limits: "Required coverage minimums by trade/risk level"
      - ocip_ccip: "Whether project uses wrap-up insurance"
    tier_3_schema:
      - tracking_detail: "Certificate tracking vs. full policy analysis"

  capabilities:
    inputs: ["Construction contracts", "Subcontractor insurance certificates", "Project risk profile from W-003 (via Vault)"]
    outputs: ["Insurance requirements matrix by trade", "Certificate compliance tracker", "Coverage gap analysis", "Claims tracking log"]
    documents: ["Insurance Requirements Matrix (XLSX)", "Certificate Compliance Report (PDF)", "Coverage Gap Analysis (PDF)"]

  vault:
    reads_from: ["construction_budget (W-021)", "bid_analysis (W-022)"]
    writes_to: ["insurance_compliance", "coverage_analysis"]
    triggers: ["New subcontractor awarded", "Certificate expiration approaching"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Insurance certificate needed for new sub" }
      - { source: "W-022", trigger: "Insurance requirements for awarded subs" }
    sends_to:
      - { target: "W-021", trigger: "Insurance non-compliance → stop work flag" }
      - { target: "W-049", trigger: "Construction complete → transition to property insurance" }

  alex_registration:
    capabilities_summary: "Tracks construction insurance compliance, certificates, coverage gaps"
    priority_level: "high"
    notification_triggers: ["Certificate expiring", "Coverage gap identified", "New claim filed"]
    daily_briefing_contribution: "Expiring certificates, compliance status, open claims"

  landing:
    headline: "No expired certificates, no coverage gaps"
    subhead: "Track every sub's insurance, catch gaps before they become claims."
    value_props:
      - "Tracks every certificate expiration automatically"
      - "Identifies coverage gaps before incidents occur"
      - "Manages additional insured requirements"
      - "Flags non-compliant subs before they enter your jobsite"
```

---

### W-026 Materials & Supply Chain
```yaml
worker:
  id: "W-026"
  name: "Materials & Supply Chain"
  slug: "materials-supply-chain"
  phase: "Phase 4 — Construction"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - buy_american: "Buy American Act requirements for federal projects"
      - tariff_tracking: "Current tariff impacts on imported materials"
      - spec_compliance: "Material specs must match approved plans"
    tier_2_schema:
      - approved_suppliers: "Preferred vendor list"
      - lead_time_thresholds: "Alert thresholds for long-lead items"
    tier_3_schema:
      - tracking_level: "Critical items only vs. comprehensive"

  capabilities:
    inputs: ["Construction schedule from W-021 (via Vault)", "Material specifications", "Procurement timeline requirements"]
    outputs: ["Long-lead item tracker with order-by dates", "Material cost tracking vs. budget", "Substitution analysis (spec-compliant alternatives)", "Delivery schedule coordination"]
    documents: ["Long-Lead Item Schedule (XLSX)", "Material Substitution Analysis (PDF)", "Procurement Status Report (XLSX)"]

  vault:
    reads_from: ["construction_schedule (W-021)", "construction_budget (W-021)"]
    writes_to: ["material_tracking", "procurement_schedule"]
    triggers: ["Material order deadline approaching", "Supply chain disruption detected"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Material procurement schedule needed" }
    sends_to:
      - { target: "W-021", trigger: "Delivery delay → schedule impact notification" }
      - { target: "W-022", trigger: "Need alternate sourcing → procurement" }

  alex_registration:
    capabilities_summary: "Tracks material procurement, lead times, supply chain disruptions, substitutions"
    priority_level: "normal"
    notification_triggers: ["Long-lead item order deadline", "Supply chain disruption"]
    daily_briefing_contribution: "Procurement status, delivery alerts, supply chain issues"

  landing:
    headline: "Never wait on materials again"
    subhead: "Long-lead tracking, order-by dates, substitution analysis — supply chain managed."
    value_props:
      - "Tracks every long-lead item with order-by deadlines"
      - "Alerts when supply chain disruptions affect your project"
      - "Analyzes spec-compliant substitutions"
      - "Coordinates delivery schedules with your construction timeline"
```

---

### W-027 Quality Control & Inspection
```yaml
worker:
  id: "W-027"
  name: "Quality Control & Inspection"
  slug: "quality-control-inspection"
  phase: "Phase 4 — Construction"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - ibc_inspection: "IBC required inspection milestones"
      - special_inspection: "Special inspection requirements (structural, fireproofing)"
      - third_party: "Third-party testing and inspection requirements"
    tier_2_schema:
      - inspection_checklist: "Company QC checklists by trade"
      - photo_documentation: "Required photos at milestones"
    tier_3_schema:
      - deficiency_tracking: "Summary vs. detailed"

  capabilities:
    inputs: ["Construction schedule from W-021 (via Vault)", "Inspection reports and photos", "Plan specifications for QC comparison"]
    outputs: ["Inspection schedule and tracking", "Deficiency log with status", "Photo documentation by inspection", "QC compliance report"]
    documents: ["Inspection Report (PDF)", "Deficiency Log (XLSX)", "QC Compliance Summary (PDF)"]

  vault:
    reads_from: ["construction_schedule (W-021)", "progress_reports (W-021)"]
    writes_to: ["inspection_reports", "deficiency_log"]
    triggers: ["Inspection milestone on schedule", "Draw request requires sign-off"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Inspection milestone approaching" }
      - { source: "W-023", trigger: "Draw requires inspection verification" }
    sends_to:
      - { target: "W-021", trigger: "Deficiency found → CM notification" }
      - { target: "W-023", trigger: "Inspection passed → draw can proceed" }

  alex_registration:
    capabilities_summary: "Tracks inspections, manages deficiency logs, coordinates QC milestones"
    priority_level: "normal"
    notification_triggers: ["Inspection due tomorrow", "Unresolved deficiency past deadline"]
    daily_briefing_contribution: "Upcoming inspections, open deficiencies"

  landing:
    headline: "Every inspection tracked, every deficiency resolved"
    subhead: "QC checklists, inspection scheduling, deficiency tracking — quality without the paper chase."
    value_props:
      - "Schedules inspections aligned to construction milestones"
      - "Tracks every deficiency from identification to resolution"
      - "Photo documentation organized by inspection and trade"
      - "Connects inspection approvals to draw requests"
```

---

### W-028 Safety & OSHA
```yaml
worker:
  id: "W-028"
  name: "Safety & OSHA"
  slug: "safety-osha"
  phase: "Phase 4 — Construction"
  type: "standalone"
  pricing: { monthly: 49 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - osha_1926: "OSHA 29 CFR 1926 construction safety standards"
      - osha_300: "OSHA 300 log and recordkeeping requirements"
      - osha_silica: "Silica exposure standards (Table 1 compliance)"
      - fall_protection: "Fall protection requirements (Subpart M)"
      - confined_space: "Permit-required confined space (Subpart AA)"
      - state_osha: "State OSHA plan requirements (Cal/OSHA, etc.)"
    tier_2_schema:
      - safety_program: "Company's site-specific safety plan template"
      - incident_thresholds: "EMR and TRIR thresholds for sub qualification"
      - toolbox_talk_schedule: "Weekly safety topic requirements"
    tier_3_schema:
      - reporting_detail: "Incident-only vs. near-miss tracking"

  capabilities:
    inputs: ["Project type and hazard profile", "Subcontractor safety records (EMR, TRIR)", "Incident reports"]
    outputs: ["Site-specific safety plan", "Hazard analysis by construction phase", "Toolbox talk content and tracking", "Incident investigation reports", "OSHA 300 log management"]
    documents: ["Site-Specific Safety Plan (PDF)", "Hazard Analysis (PDF)", "Incident Report (PDF)", "OSHA 300 Log (XLSX)", "Toolbox Talk (PDF)"]

  vault:
    reads_from: ["construction_schedule (W-021)"]
    writes_to: ["safety_plan", "incident_log", "osha_300_log"]
    triggers: ["New construction phase starting", "Incident reported", "Weekly toolbox talk cycle"]

  referrals:
    receives_from:
      - { source: "W-021", trigger: "Safety audit due or new phase starting" }
      - { source: "W-024", trigger: "New workers on site → safety orientation" }
    sends_to:
      - { target: "W-021", trigger: "Safety violation → stop work notice" }
      - { target: "W-025", trigger: "Incident with injury → insurance claim" }

  alex_registration:
    capabilities_summary: "Manages construction safety plans, OSHA compliance, incident tracking, toolbox talks"
    priority_level: "critical"
    notification_triggers: ["Safety incident reported", "OSHA audit scheduled", "Sub EMR exceeds threshold"]
    daily_briefing_contribution: "Safety status, incidents, upcoming toolbox talks, compliance alerts"

  landing:
    headline: "Zero incidents starts with zero excuses"
    subhead: "Safety plans, OSHA compliance, incident tracking — your digital safety officer."
    value_props:
      - "Generates site-specific safety plans by construction phase"
      - "Tracks OSHA 300 log and recordkeeping automatically"
      - "Weekly toolbox talk content and attendance tracking"
      - "Screens sub safety records before they enter your site"
```

---

### W-029 MEP Coordination
```yaml
worker:
  id: "W-029"
  name: "MEP Coordination"
  slug: "mep-coordination"
  phase: "Phase 4 — Construction"
  type: "copilot"
  pricing: { monthly: 59 }
  status: "waitlist"

  raas:
    tier_0: "inherited"
    tier_1:
      - nec: "National Electrical Code requirements"
      - imc_ipc: "International Mechanical and Plumbing Code"
      - ashrae: "ASHRAE standards for HVAC design"
      - nfpa_fire_alarm: "NFPA 72 fire alarm system coordination"
    tier_2_schema:
      - mep_standards: "Company standards for MEP specifications"
      - bim_requirements: "BIM coordination requirements (LOD, clash detection)"
    tier_3_schema:
      - coordination_scope: "Full BIM coordination vs. conflict identification only"

  capabilities:
    inputs: ["MEP drawings and specifications", "Architectural plans from W-005 (via Vault)", "Structural plans from W-006 (via Vault)"]
    outputs: ["MEP clash/conflict identification", "Coordination meeting notes and action items", "Ceiling height and routing analysis", "MEP schedule alignment"]
    documents: ["MEP Coordination Report (PDF)", "Clash Detection Summary (PDF)", "MEP Schedule (XLSX)"]

  vault:
    reads_from: ["design_review (W-005)", "engineering_review (W-006)", "construction_schedule (W-021)"]
    writes_to: ["mep_coordination", "clash_report"]
    triggers: ["MEP drawings received", "Construction schedule reaches MEP phase"]

  referrals:
    receives_from:
      - { source: "W-006", trigger: "MEP coordination items from engineering" }
      - { source: "W-021", trigger: "MEP coordination issues during construction" }
      - { source: "W-011", trigger: "Fire protection system coordination" }
    sends_to:
      - { target: "W-021", trigger: "Coordination issue resolved → update schedule" }

  alex_registration:
    capabilities_summary: "Coordinates MEP systems, identifies clashes, aligns MEP with construction schedule"
    priority_level: "normal"
    notification_triggers: ["Clash requiring resolution", "MEP phase approaching"]
    daily_briefing_contribution: "MEP coordination status, unresolved clashes"

  landing:
    headline: "Catch clashes before they cost you"
    subhead: "MEP coordination, clash detection, schedule alignment — before the drywall goes up."
    value_props:
      - "Identifies MEP conflicts before they hit the field"
      - "Coordinates mechanical, electrical, and plumbing scheduling"
      - "Aligns MEP milestones with your construction schedule"
      - "Does not replace your MEP engineer — reduces coordination delays"
```

---

**End of Part 2C — Phase 4 (Construction)**
**Next: Part 2D — Phase 5-7 + Horizontal + New Workers (W-031 through W-052)**
