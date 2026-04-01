# Mechanical/HVAC Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-034 |
| **Slug** | gov-mechanical-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_034_mechanical_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Mechanical/HVAC Inspector — inspects heating, ventilation, and air conditioning installations for IMC compliance, refrigerant handling, ductwork, and combustion air

**Outputs:**
- gov034-mechanical-inspection-report
- gov034-violation-notice
- gov034-combustion-test-results
- gov034-pass-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-ME-001**: Combustion Air Insufficient — Combustion air supply for fuel-burning appliances does not meet code minimum — carbon monoxide hazard per IMC Chapter 7
- **INSP-ME-002**: Flue/Vent Connector Improperly Installed — Flue pipe or vent connector is improperly sized, sloped, or connected — combustion gas leakage hazard
- **INSP-ME-003**: Refrigerant Leak Detected — Refrigerant leak detected in HVAC system — environmental and health hazard per EPA Section 608 regulations

### Soft Flags (Tier 2 — Warning)
- **INSP-ME-FLG-001**: Energy Code Compliance Check — HVAC system efficiency rating should be verified against current energy code requirements (IECC/ASHRAE 90.1)

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Combustion air supply for fuel-burning appliances does not meet code minimum — carbon monoxide hazard per IMC Chapter 7
- Will not proceed when: Flue pipe or vent connector is improperly sized, sloped, or connected — combustion gas leakage hazard
- Will not proceed when: Refrigerant leak detected in HVAC system — environmental and health hazard per EPA Section 608 regulations

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- mechanical_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_034_mechanical_inspector_v0.json`
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
