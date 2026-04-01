# Demolition Permit — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-028 |
| **Slug** | gov-demolition-permit |
| **Vertical** | government |
| **RAAS Ruleset** | gov_028_demolition_permit_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Demolition Permit — processes demolition permit applications, verifies asbestos surveys, utility disconnections, historic review, and OSHA compliance

**Outputs:**
- gov028-demolition-permit
- gov028-asbestos-clearance
- gov028-utility-disconnect-log
- gov028-debris-disposal-plan

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-DM-001**: Asbestos Survey Not Completed — NESHAP-required asbestos survey has not been completed prior to demolition — violation of 40 CFR 61 Subpart M
- **PERM-DM-002**: Utilities Not Disconnected — One or more utilities (gas, electric, water, sewer) have not been confirmed disconnected — safety hazard
- **PERM-DM-003**: Historic Structure — Demolition Blocked — Structure is on the local, state, or national historic register — demolition requires historic preservation board review and approval

### Soft Flags (Tier 2 — Warning)
- **PERM-DM-FLG-001**: Demolition Debris Disposal Plan — Demolition will generate significant debris — verify disposal facility acceptance and recycling plan compliance

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: NESHAP-required asbestos survey has not been completed prior to demolition — violation of 40 CFR 61 Subpart M
- Will not proceed when: One or more utilities (gas, electric, water, sewer) have not been confirmed disconnected — safety hazard
- Will not proceed when: Structure is on the local, state, or national historic register — demolition requires historic preservation board review and approval

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- parcel_number
- structure_type
- demolition_contractor
- asbestos_survey_id
- utility_disconnect_confirmations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_028_demolition_permit_v0.json`
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
