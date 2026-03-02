# W-004 Land Use & Entitlement | $99/mo
## Phase 1 — Design & Entitlement | Standalone

**Headline:** "Get your approvals before you break ground"

## What It Does
Manages the land use entitlement process — zoning applications, variances, special use permits, subdivision approvals, planned unit developments, and municipal hearing preparation. Tracks approval timelines, public comment periods, conditions of approval, and post-entitlement compliance.

## RAAS Tier 1 — Regulations
- **Zoning Compliance**: Track local zoning ordinance requirements — permitted uses, conditional uses, density limits, height limits, setbacks, FAR, lot coverage, parking ratios, open space requirements. Hard stop: NEVER advise proceeding with construction without confirmed zoning approval for proposed use.
- **SEQRA/CEQA/State Environmental Review**: Track state-level environmental review requirements triggered by land use approvals. Varies by state (SEQRA in NY, CEQA in CA, etc.). Type I vs Type II actions, negative declarations, EIS requirements.
- **Subdivision Laws**: State and local subdivision approval requirements — preliminary plat, final plat, improvement agreements, dedication of public improvements, lot merger/splitting.
- **Takings / Exactions**: Track conditions of approval for constitutional limits — Nollan/Dolan nexus and rough proportionality tests for exactions. Flag conditions that may constitute regulatory takings.
- **Vested Rights**: Track when development rights vest — varies by jurisdiction (building permit issuance, substantial reliance, development agreement). Critical for protecting project from zoning changes.
- **Public Notice Requirements**: Track statutory notice requirements for hearings — publication, mailing to adjacent owners, posting on site. Failure to meet notice requirements can void approvals.

## RAAS Tier 2 — Company Policies
- entitlement_consultant: Preferred land use attorney/consultant
- community_engagement_strategy: "proactive" | "reactive" | "none"
- approval_contingency: Whether PSA is contingent on entitlement (default: true)
- max_entitlement_timeline: Maximum months willing to pursue entitlements

## Capabilities
1. **Zoning Analysis** — Current zoning vs proposed use gap analysis. Identify what approvals are needed: by-right, variance, special use, rezoning, PUD.
2. **Application Preparation** — Generate application narratives, supporting documents, site plan requirements, and submission checklists for each required approval.
3. **Hearing Preparation** — Prepare hearing packages: project description, compliance analysis, community benefit statements, response to anticipated objections, visual presentations.
4. **Timeline Tracking** — Track every step: pre-application meeting, application submission, completeness review, staff report, planning commission, city council/board, appeal periods. Model total entitlement timeline.
5. **Condition Tracking** — Log all conditions of approval. Classify: pre-construction, during construction, ongoing. Track compliance status for each condition.
6. **Public Comment Management** — Track public comments received, categorize themes, prepare responses, identify community concerns requiring project modifications.

## Vault Data
- **Reads**: W-003 dd_findings (zoning status, environmental), W-002 deal_analysis (project scope), W-005 design_plans (site plans for applications)
- **Writes**: entitlement_status, conditions_of_approval, approval_timeline → consumed by W-012, W-021, W-047

## Referral Triggers
- Environmental review required → W-007
- Entitlement approved → W-012 (permitting can begin)
- Conditions affect design → W-005 (Architecture) / W-006 (Engineering)
- Entitlement timeline impacts deal → W-002 (reassess feasibility)
- Conditions require ongoing compliance → W-047 (deadline tracking)
- Legal challenge to approval → W-045

## Document Templates
1. lue-zoning-analysis (PDF) — Current vs proposed gap analysis
2. lue-application-narrative (PDF) — Hearing-ready project narrative
3. lue-condition-tracker (XLSX) — All conditions with status and deadlines
4. lue-timeline (PDF) — Visual entitlement timeline with milestones
