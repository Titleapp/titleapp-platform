# Plan Review — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-017 |
| **Slug** | gov-plan-review |
| **Vertical** | government |
| **RAAS Ruleset** | gov_017_plan_review_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Plan Review — routes building plans to appropriate review disciplines, tracks review cycles, manages applicant resubmittals, and enforces code compliance checklists

**Outputs:**
- gov017-plan-review-comments
- gov017-correction-notice
- gov017-approval-stamp
- gov017-discipline-routing-log

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-PR-001**: Plans Not Sealed by Licensed Professional — Submitted plans do not bear the seal and signature of a licensed architect or engineer as required by state law for this project type
- **PERM-PR-002**: Fire Life Safety Deficiency — Plans have an unresolved fire/life safety deficiency (egress, fire separation, sprinkler coverage) — cannot approve until corrected
- **PERM-PR-003**: ADA/Accessibility Non-Compliant — Plans do not meet ADA/ABA accessibility requirements per ICC A117.1 — corrections required before approval

### Soft Flags (Tier 2 — Warning)
- **PERM-PR-FLG-001**: Third Review Cycle — Plans are on their third or later review cycle — escalate to supervising plan reviewer
- **PERM-PR-FLG-002**: Deferred Submittal Pending — One or more deferred submittals (truss design, fire suppression, special inspections) are still outstanding

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Submitted plans do not bear the seal and signature of a licensed architect or engineer as required by state law for this project type
- Will not proceed when: Plans have an unresolved fire/life safety deficiency (egress, fire separation, sprinkler coverage) — cannot approve until corrected
- Will not proceed when: Plans do not meet ADA/ABA accessibility requirements per ICC A117.1 — corrections required before approval

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- plan_set_version
- review_disciplines
- building_code_edition
- occupancy_type

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_017_plan_review_v0.json`
2. Add or modify hard_stops and soft_flags as needed
3. Run `POST /v1/admin:workers:sync` to propagate changes to Firestore
4. Changes take effect on next catalog cache refresh (5 minutes)

## 8. Version History

| Version | Date | Notes |
|---------|------|-------|
| v0 | 2026-04-01 | Recovered from RAAS rulesets — Session 43 |

## 9. Known Limitations

- Connectors not yet wired. Advisory Mode until documents uploaded.
- Required inputs are declared but not enforced at runtime (pending enforcement engine).
- Outputs are declared but document templates may not yet exist in the template registry.
- raasStatus set to `pending` — requires review before activation.
