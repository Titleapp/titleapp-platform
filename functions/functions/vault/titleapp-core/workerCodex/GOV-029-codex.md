# Grading and Excavation Permit — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-029 |
| **Slug** | gov-grading-excavation |
| **Vertical** | government |
| **RAAS Ruleset** | gov_029_grading_excavation_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Grading and Excavation Permit — processes earthwork permits, validates erosion control plans, geotechnical reports, and stormwater management requirements

**Outputs:**
- gov029-grading-permit
- gov029-erosion-control-approval
- gov029-earthwork-calculation
- gov029-inspection-schedule

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-GR-001**: Geotechnical Report Not Provided — Grading exceeds threshold requiring a geotechnical investigation report — cannot approve without soil stability analysis
- **PERM-GR-002**: Erosion Control Plan Missing — Project disturbs more than the threshold area and no erosion and sediment control plan has been submitted
- **PERM-GR-003**: NPDES Permit Not Obtained — Disturbed area exceeds 1 acre and NPDES Construction General Permit has not been filed with EPA/state agency

### Soft Flags (Tier 2 — Warning)
- **PERM-GR-FLG-001**: Hillside Grading — Site has slopes exceeding 15% grade — additional engineering review and slope stability analysis recommended

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Grading exceeds threshold requiring a geotechnical investigation report — cannot approve without soil stability analysis
- Will not proceed when: Project disturbs more than the threshold area and no erosion and sediment control plan has been submitted
- Will not proceed when: Disturbed area exceeds 1 acre and NPDES Construction General Permit has not been filed with EPA/state agency

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- parcel_number
- cut_volume_cy
- fill_volume_cy
- disturbed_area_acres
- erosion_control_plan_id
- geotech_report_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_029_grading_excavation_v0.json`
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
