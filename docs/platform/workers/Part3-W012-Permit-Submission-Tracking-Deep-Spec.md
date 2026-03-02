# W-012 Permit Submission & Tracking | $59/mo
## Phase 2 — Permitting | Standalone

**Headline:** "Every permit tracked. Every resubmission handled."

## What It Does
Manages the building permit application, plan review, correction response, and permit issuance process. Tracks all permit types (building, grading, demolition, mechanical, electrical, plumbing, fire), plan check comments, resubmission deadlines, permit fees, and inspection requirements tied to each permit.

## RAAS Tier 1 — Regulations
- **IBC/IRC Compliance**: Building permits require demonstrated code compliance. Track which code edition the jurisdiction has adopted (IBC 2018, 2021, etc.) and any local amendments. Plans must be stamped by licensed design professionals per state law.
- **Licensed Professional Requirements**: Track which drawings require stamps — architect (building design), structural engineer (structural), mechanical/electrical/plumbing engineers (MEP), civil engineer (grading/site), fire protection engineer (fire suppression). Varies by state and project size.
- **Permit Expiration**: Track permit expiration rules — most jurisdictions expire permits after 180 days of inactivity. Some require renewal fees. Hard stop: flag permits approaching expiration.
- **ADA/FHA Review**: Track accessibility plan review — separate review process in many jurisdictions. Fair Housing Act applies to residential buildings with 4+ units.
- **Environmental/Stormwater Permits**: Track separate permits: grading permit, SWPPP (stormwater pollution prevention plan), NPDES permit for sites >1 acre.
- **Demolition Permits**: Track demolition-specific requirements: asbestos survey (NESHAP), utility disconnection confirmations, neighbor notifications, surety bonds.

## RAAS Tier 2 — Company Policies
- permit_expediter: Use permit expediting service (true/false)
- plan_check_response_deadline: Internal deadline to respond to corrections (default: 14 days)
- fee_approval_threshold: Permit fees requiring management approval
- parallel_submittal: Submit multiple permit types simultaneously (default: true)

## Capabilities
1. **Permit Requirements Analysis** — From project scope, identify all permits required by jurisdiction. Generate permit application checklist with fees, submission requirements, and typical review timelines.
2. **Submission Tracking** — Track each permit: application date, plan check round (1st, 2nd, 3rd), correction comments received, resubmission date, approval date, issuance date, expiration date.
3. **Plan Check Comment Management** — Parse plan check comments by discipline (architectural, structural, MEP, fire). Assign to responsible design professional. Track response status.
4. **Fee Tracking** — Track all permit fees: plan check, building permit (usually % of construction value), school fees, park fees, utility connection fees, impact fees. Total cost impact.
5. **Permit Timeline Modeling** — Model total permitting timeline based on jurisdiction typical review times, number of plan check rounds, and correction response times.
6. **Inspection Requirements** — From issued permits, generate list of required inspections by permit type. Feed to W-027 for scheduling.

## Vault Data
- **Reads**: W-004 entitlement_status (conditions affecting permits), W-005 design_plans (for submission), W-006 engineering_docs
- **Writes**: permit_status, inspection_requirements, permit_fees → consumed by W-021, W-027, W-047

## Referral Triggers
- Plan check corrections require design changes → W-005/W-006
- Permits issued → W-021 (construction can begin)
- Inspection requirements generated → W-027
- Permit expiration approaching → W-047
- Permit fees impact budget → W-016 (capital stack)
- Fire department comments → W-011 (Fire & Life Safety)

## Document Templates
1. pst-permit-checklist (XLSX) — All required permits with status
2. pst-plan-check-log (XLSX) — Comments by discipline with response tracking
3. pst-fee-summary (PDF) — All permit and impact fees
4. pst-timeline (PDF) — Permitting timeline with milestones
