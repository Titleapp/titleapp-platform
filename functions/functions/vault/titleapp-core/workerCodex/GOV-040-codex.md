# Environmental Compliance Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-040 |
| **Slug** | gov-environmental-compliance |
| **Vertical** | government |
| **RAAS Ruleset** | gov_040_environmental_compliance_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Environmental Compliance Inspector — inspects construction sites for erosion control, stormwater BMP maintenance, dust control, and NPDES permit compliance

**Outputs:**
- gov040-environmental-inspection-report
- gov040-violation-notice
- gov040-corrective-action-plan
- gov040-bmp-status-log

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-EN-001**: Sediment Discharge to Waterway — Active sediment discharge observed entering a water body or storm drain — Clean Water Act violation requiring immediate corrective action
- **INSP-EN-002**: Erosion Control BMPs Not Installed — Required best management practices for erosion and sediment control are not installed per the approved SWPPP/erosion control plan
- **INSP-EN-003**: Hazardous Material Spill — Hazardous material spill observed on construction site — requires immediate containment and agency notification per CERCLA/SARA

### Soft Flags (Tier 2 — Warning)
- **INSP-EN-FLG-001**: BMP Maintenance Needed — Erosion control BMPs are installed but showing signs of degradation or capacity limits — maintenance needed before next rain event
- **INSP-EN-FLG-002**: Dust Control Inadequate — Visible dust emissions from site exceed local air quality management district standards — increase watering or apply stabilizer

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Active sediment discharge observed entering a water body or storm drain — Clean Water Act violation requiring immediate corrective action
- Will not proceed when: Required best management practices for erosion and sediment control are not installed per the approved SWPPP/erosion control plan
- Will not proceed when: Hazardous material spill observed on construction site — requires immediate containment and agency notification per CERCLA/SARA

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- environmental_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_040_environmental_compliance_v0.json`
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
