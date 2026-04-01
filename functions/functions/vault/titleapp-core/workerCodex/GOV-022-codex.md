# Variance and Conditional Use Permit Processing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-022 |
| **Slug** | gov-variance-cup |
| **Vertical** | government |
| **RAAS Ruleset** | gov_022_variance_cup_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Variance and Conditional Use Permit Processing — manages applications for zoning variances, conditional/special use permits, and administrative adjustments

**Outputs:**
- gov022-hearing-notice
- gov022-staff-recommendation
- gov022-board-decision
- gov022-conditions-of-approval

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-VC-001**: Public Notice Not Published — Required public notice for hearing has not been published within the statutory notice period — hearing cannot proceed
- **PERM-VC-002**: Adjacent Property Owners Not Notified — Property owners within the required notification radius have not been sent notice — due process requirement not met
- **PERM-VC-003**: Hardship Not Self-Created — Variance findings require that the hardship was not self-created by the applicant — self-created hardship cannot be basis for variance

### Soft Flags (Tier 2 — Warning)
- **PERM-VC-FLG-001**: Neighborhood Opposition — Three or more written objections received from adjacent property owners — board should consider community impact

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Required public notice for hearing has not been published within the statutory notice period — hearing cannot proceed
- Will not proceed when: Property owners within the required notification radius have not been sent notice — due process requirement not met
- Will not proceed when: Variance findings require that the hardship was not self-created by the applicant — self-created hardship cannot be basis for variance

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- application_type
- parcel_number
- applicant_name
- hardship_justification
- hearing_date

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_022_variance_cup_v0.json`
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
