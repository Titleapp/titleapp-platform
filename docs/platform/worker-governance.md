# Worker Governance — Worker #1 Pipeline

**Last updated: Session 28 (March 2026)**

## The Six Stages

| Stage | Name | What Happens |
|-------|------|-------------|
| 1 | Intake Interview | Creator declares vertical, jurisdiction, description, SOPs |
| 2 | Regulatory Research | Worker #1 researches regulations, generates compliance brief |
| 3 | Compliance Brief | Creator reviews research, acknowledges findings |
| 4 | Rules Library | 4-tier RAAS library populated (Tier 0 auto, Tier 1 locked, Tier 2/3 editable) |
| 5 | Pre-Publish Check | 8-point acceptance criteria validated |
| 6 | Submit for Review | Developer waiver + identity verification + admin review |

## P0.18 — Worker #1 Law
No worker goes live until Worker #1 passes the full pipeline. Status `live` can ONLY be set by admin approval flow. The builder cannot directly set `status: live`.

## 8-Point Pre-Publish Check
1. Worker has a name and description
2. Vertical and jurisdiction are set
3. Tier 0 rules present (platform invariants)
4. Tier 1 rules present (3+ regulatory rules)
5. Tier 2 or Tier 3 rules present (at least one custom rule)
6. No prohibited content in rules or description
7. Landing page slug is valid
8. Credit cost is assigned

## Publish Flow
1. Developer Waiver (shared liability acknowledgment)
2. Identity Verification (Stripe Identity)
3. Creator License ($49/yr — required)
4. Submit for admin review
5. Admin approves → `syncApprovedWorker()` → status: live
