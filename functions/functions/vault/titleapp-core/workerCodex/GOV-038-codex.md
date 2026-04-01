# Health and Food Safety Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-038 |
| **Slug** | gov-health-food-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_038_health_food_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Health and Food Safety Inspector — conducts food establishment inspections, validates temperature controls, sanitation, and FDA Food Code compliance

**Outputs:**
- gov038-health-inspection-report
- gov038-violation-notice
- gov038-closure-order
- gov038-reinspection-schedule

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-HF-001**: Imminent Health Hazard — Imminent health hazard observed (sewage backup, no hot water, rodent infestation, foodborne illness outbreak) — immediate closure per FDA Food Code 8-404.11
- **INSP-HF-002**: Critical Temperature Violation — Food held in the temperature danger zone (41-135F) beyond safe time limits — critical food safety violation
- **INSP-HF-003**: No Certified Food Manager on Staff — Establishment does not have a certified food protection manager as required by FDA Food Code 2-102.12

### Soft Flags (Tier 2 — Warning)
- **INSP-HF-FLG-001**: Score Below Satisfactory Threshold — Inspection score is below the satisfactory threshold — establishment should receive follow-up inspection within 30 days
- **INSP-HF-FLG-002**: Repeat Violation — Same violation category was cited in the previous inspection — pattern of non-compliance

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Imminent health hazard observed (sewage backup, no hot water, rodent infestation, foodborne illness outbreak) — immediate closure per FDA Food Code 8-404.11
- Will not proceed when: Food held in the temperature danger zone (41-135F) beyond safe time limits — critical food safety violation
- Will not proceed when: Establishment does not have a certified food protection manager as required by FDA Food Code 2-102.12

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- establishment_id
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_038_health_food_inspector_v0.json`
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
