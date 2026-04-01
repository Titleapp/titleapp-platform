# Zoning Verification — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-018 |
| **Slug** | gov-zoning-verification |
| **Vertical** | government |
| **RAAS Ruleset** | gov_018_zoning_verification_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Zoning Verification — validates proposed use against zoning ordinance, checks setbacks, lot coverage, FAR, height limits, and parking requirements

**Outputs:**
- gov018-zoning-verification-letter
- gov018-use-determination
- gov018-setback-analysis
- gov018-parking-calculation

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-ZV-001**: Use Not Permitted in Zone — Proposed use is not a permitted or conditional use in the current zoning district — requires rezoning or use variance
- **PERM-ZV-002**: Setback Violation — Proposed structure encroaches into required setback area — must obtain variance or redesign
- **PERM-ZV-003**: Height Limit Exceeded — Proposed building height exceeds the maximum allowed in this zoning district — requires height variance or redesign

### Soft Flags (Tier 2 — Warning)
- **PERM-ZV-FLG-001**: Parking Below Minimum — Proposed parking count is below the minimum required — may need shared parking agreement or reduction request
- **PERM-ZV-FLG-002**: Overlay District Applies — Parcel is within a zoning overlay district (historic, floodplain, airport) — additional design standards may apply

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Proposed use is not a permitted or conditional use in the current zoning district — requires rezoning or use variance
- Will not proceed when: Proposed structure encroaches into required setback area — must obtain variance or redesign
- Will not proceed when: Proposed building height exceeds the maximum allowed in this zoning district — requires height variance or redesign

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- parcel_number
- proposed_use
- building_footprint
- building_height
- parking_spaces_proposed

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_018_zoning_verification_v0.json`
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
