# W-003 Site Due Diligence | $59/mo
## Phase 0 — Site Selection | Standalone

**Headline:** "Know what you're buying before you buy it"

## What It Does
Manages the physical, environmental, and regulatory due diligence process for a development site. Tracks Phase I/II environmental reports, geotechnical studies, ALTA surveys, flood zone determinations, utility availability, zoning confirmation, and easement/encumbrance analysis. Produces a due diligence summary that feeds the go/no-go decision.

## RAAS Tier 1 — Regulations
- **CERCLA / ASTM E1527**: Phase I Environmental Site Assessments must follow ASTM E1527-21 standard to qualify for innocent landowner defense under CERCLA. Track all appropriate inquiries (AAI), recognized environmental conditions (RECs), controlled RECs (CRECs), and historical RECs (HRECs). Hard stop: NEVER recommend closing on a site with unresolved RECs without flagging environmental liability.
- **NEPA**: For projects with federal funding/permits, track National Environmental Policy Act requirements — categorical exclusion, environmental assessment (EA), or environmental impact statement (EIS).
- **Wetlands (Clean Water Act §404)**: Track wetland delineations, Army Corps of Engineers jurisdiction, Section 404 permit requirements, and mitigation requirements.
- **Endangered Species Act**: Track if site is in critical habitat or has listed species. Flag consultation requirements with USFWS.
- **Flood Zone (FEMA)**: Track FEMA flood zone determination — Zone A, AE, X, etc. If in floodplain, track floodplain development permit requirements and flood insurance requirements.
- **ALTA Survey Standards**: Track ALTA/NSPS Land Title Survey requirements and Table A optional items selected. Survey must be certified to buyer, lender, and title company.

## RAAS Tier 2 — Company Policies
- due_diligence_period: Standard DD period in days (default: 60)
- required_reports: Which reports are required vs optional by project type
- environmental_risk_tolerance: "zero_tolerance" | "managed_risk" | "case_by_case"
- survey_table_a_items: Standard Table A optional items to include

## Capabilities
1. **DD Checklist Generator** — From project type and location, generate comprehensive due diligence checklist with all required studies, reports, and approvals
2. **Report Tracking** — Track status of all DD reports: ordered, in progress, draft received, final, reviewed. Flag overdue items against DD period deadline.
3. **Environmental Analysis** — Parse Phase I ESA findings: RECs, CRECs, HRECs, de minimis conditions, business environmental risks. Recommend Phase II if warranted.
4. **Survey Analysis** — Review ALTA survey for: easements, encroachments, setback violations, access issues, utility locations, flood zone boundaries. Cross-reference with title commitment exceptions.
5. **Zoning Confirmation** — Verify current zoning allows proposed use. Identify variance, special use permit, or rezoning requirements. Track municipal approval timeline.
6. **Utility Assessment** — Track utility availability: water, sewer, electric, gas, telecom, stormwater. Identify capacity constraints, connection fees, and infrastructure requirements.
7. **DD Summary Report** — Produce go/no-go summary with all findings, risk items, cost implications, and timeline impacts.

## Vault Data
- **Reads**: W-002 deal_analysis (project scope, location), W-001 market_research (market context)
- **Writes**: dd_checklist, dd_findings, environmental_status, survey_analysis, zoning_status → consumed by W-002, W-004, W-016, W-044

## Referral Triggers
- Environmental issue found → W-007 (Environmental Review)
- Zoning issue found → W-004 (Land Use & Entitlement)
- Survey exception found → W-044 (Title & Escrow)
- Flood zone issues → W-025 (Insurance — flood insurance required)
- DD complete, go decision → W-016 (Capital Stack modeling begins)
- DD findings impact value → W-030 (Appraisal adjustment)

## Document Templates
1. sdd-checklist (XLSX) — Comprehensive DD checklist with status tracking
2. sdd-summary (PDF) — Go/no-go summary with all findings
3. sdd-environmental-memo (PDF) — Phase I findings analysis and recommendations
4. sdd-survey-review (PDF) — Survey analysis with title cross-reference
