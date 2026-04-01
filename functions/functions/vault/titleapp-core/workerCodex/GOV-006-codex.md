# Emissions Compliance — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-006 |
| **Slug** | gov-emissions-compliance |
| **Vertical** | government |
| **RAAS Ruleset** | gov_006_emissions_compliance_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Emissions Compliance — manages vehicle emissions testing records, exemptions, and compliance tracking per Clean Air Act and state programs

**Outputs:**
- gov006-emissions-test-certificate
- gov006-compliance-status
- gov006-exemption-determination

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-EM-001**: Test Station Not Licensed — Emissions test station is not currently licensed or has been suspended — test results are not accepted
- **DMV-EM-002**: OBD-II Readiness Monitors Incomplete — Vehicle OBD-II readiness monitors are not set — test is incomplete and results are invalid
- **DMV-EM-003**: Tampering Detected — Emissions control equipment has been tampered with or removed — violation of Clean Air Act Section 203(a)

### Soft Flags (Tier 2 — Warning)
- **DMV-EM-FLG-001**: Exemption May Apply — Vehicle model year may qualify for age-based or mileage-based emissions test exemption per state rules

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Emissions test station is not currently licensed or has been suspended — test results are not accepted
- Will not proceed when: Vehicle OBD-II readiness monitors are not set — test is incomplete and results are invalid
- Will not proceed when: Emissions control equipment has been tampered with or removed — violation of Clean Air Act Section 203(a)

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- vin
- test_station_id
- test_date
- test_result
- vehicle_model_year

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_006_emissions_compliance_v0.json`
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
