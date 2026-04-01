# Impact Fee Calculation — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-024 |
| **Slug** | gov-impact-fee-calc |
| **Vertical** | government |
| **RAAS Ruleset** | gov_024_impact_fee_calc_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Impact Fee Calculation — calculates development impact fees for transportation, parks, schools, fire, and utility infrastructure based on project scope and land use

**Outputs:**
- gov024-impact-fee-calculation
- gov024-fee-breakdown-by-category
- gov024-credit-determination
- gov024-payment-schedule

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-IF-001**: Fee Schedule Not Current — Impact fee calculation is based on an outdated fee schedule — must recalculate using the current adopted fee schedule
- **PERM-IF-002**: Land Use Category Not in Fee Schedule — Proposed land use category is not defined in the impact fee schedule — requires staff determination before calculating fees

### Soft Flags (Tier 2 — Warning)
- **PERM-IF-FLG-001**: Fee Credit May Apply — Property has prior development that was demolished — applicant may be eligible for impact fee credit for the prior use
- **PERM-IF-FLG-002**: Affordable Housing Exemption — Project includes affordable housing units that may qualify for impact fee reduction or exemption per local ordinance

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Impact fee calculation is based on an outdated fee schedule — must recalculate using the current adopted fee schedule
- Will not proceed when: Proposed land use category is not defined in the impact fee schedule — requires staff determination before calculating fees

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- land_use_category
- unit_count
- square_footage
- fee_schedule_version

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_024_impact_fee_calc_v0.json`
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
