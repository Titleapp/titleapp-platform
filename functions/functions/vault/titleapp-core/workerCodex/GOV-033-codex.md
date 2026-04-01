# Plumbing Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-033 |
| **Slug** | gov-plumbing-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_033_plumbing_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Plumbing Inspector — inspects plumbing installations for UPC/IPC compliance including DWV systems, water supply, backflow prevention, and fixture counts

**Outputs:**
- gov033-plumbing-inspection-report
- gov033-violation-notice
- gov033-test-results
- gov033-pass-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-PL-001**: Backflow Prevention Missing — Cross-connection control or backflow prevention device not installed where required — public water supply contamination risk
- **INSP-PL-002**: DWV Pressure Test Failed — Drain-waste-vent system failed the required air or water pressure test — system has leaks and cannot be concealed
- **INSP-PL-003**: Improper Venting — Plumbing vent system is improperly sized, trapped, or terminated — sewer gas intrusion hazard

### Soft Flags (Tier 2 — Warning)
- **INSP-PL-FLG-001**: Water Heater Temperature Relief — Water heater temperature and pressure relief valve discharge pipe must terminate at an approved location — verify installation

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Cross-connection control or backflow prevention device not installed where required — public water supply contamination risk
- Will not proceed when: Drain-waste-vent system failed the required air or water pressure test — system has leaks and cannot be concealed
- Will not proceed when: Plumbing vent system is improperly sized, trapped, or terminated — sewer gas intrusion hazard

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- plumbing_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_033_plumbing_inspector_v0.json`
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
