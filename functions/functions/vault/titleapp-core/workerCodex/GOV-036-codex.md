# Structural Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-036 |
| **Slug** | gov-structural-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_036_structural_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Structural Inspector — inspects foundation, framing, and structural systems for compliance with IBC structural provisions, engineered plans, and special inspection requirements

**Outputs:**
- gov036-structural-inspection-report
- gov036-special-inspection-log
- gov036-correction-notice
- gov036-pass-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-ST-001**: Foundation Does Not Match Approved Plans — As-built foundation dimensions, depth, or reinforcement do not match the approved structural plans — structural integrity at risk
- **INSP-ST-002**: Special Inspection Report Missing — Special inspection is required for this structural element (concrete, steel, masonry, soils) per IBC 1704 but no special inspection report has been filed
- **INSP-ST-003**: Structural Deficiency Observed — Visible structural deficiency (cracking, deflection, connection failure) observed — stop work and require structural engineer evaluation

### Soft Flags (Tier 2 — Warning)
- **INSP-ST-FLG-001**: Seismic Design Category D or Higher — Building is in Seismic Design Category D, E, or F — additional seismic connection and hold-down inspections required

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: As-built foundation dimensions, depth, or reinforcement do not match the approved structural plans — structural integrity at risk
- Will not proceed when: Special inspection is required for this structural element (concrete, steel, masonry, soils) per IBC 1704 but no special inspection report has been filed
- Will not proceed when: Visible structural deficiency (cracking, deflection, connection failure) observed — stop work and require structural engineer evaluation

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- structural_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_036_structural_inspector_v0.json`
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
