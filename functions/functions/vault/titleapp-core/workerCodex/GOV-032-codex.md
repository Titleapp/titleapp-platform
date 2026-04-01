# Electrical Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-032 |
| **Slug** | gov-electrical-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_032_electrical_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Electrical Inspector — conducts electrical system inspections for NEC compliance, verifies panel sizing, grounding, GFCI/AFCI protection, and load calculations

**Outputs:**
- gov032-electrical-inspection-report
- gov032-violation-notice
- gov032-correction-list
- gov032-pass-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-EL-001**: Missing Grounding or Bonding — Electrical system grounding or bonding electrode conductor is missing or improperly installed per NEC Article 250 — life safety hazard
- **INSP-EL-002**: Panel Overloaded — Electrical panel load exceeds rated capacity — fire hazard per NEC Article 408
- **INSP-EL-003**: GFCI Protection Missing in Required Location — Ground fault circuit interrupter protection not provided in kitchen, bathroom, garage, exterior, or other required locations per NEC 210.8
- **INSP-EL-004**: Permit Expired or Not Active — The referenced electrical permit is expired, suspended, or has not been issued — cannot conduct inspection

### Soft Flags (Tier 2 — Warning)
- **INSP-EL-FLG-001**: AFCI Protection Advisory — Arc fault circuit interrupter protection is required in bedrooms and living areas per NEC 210.12 — verify coverage
- **INSP-EL-FLG-002**: Solar/Battery System Present — Solar PV or battery storage system installed — verify rapid shutdown compliance per NEC 690.12 and interconnection approval

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Electrical system grounding or bonding electrode conductor is missing or improperly installed per NEC Article 250 — life safety hazard
- Will not proceed when: Electrical panel load exceeds rated capacity — fire hazard per NEC Article 408
- Will not proceed when: Ground fault circuit interrupter protection not provided in kitchen, bathroom, garage, exterior, or other required locations per NEC 210.8
- Will not proceed when: The referenced electrical permit is expired, suspended, or has not been issued — cannot conduct inspection

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- electrical_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_032_electrical_inspector_v0.json`
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
