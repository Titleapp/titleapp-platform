# Sign Permit — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-027 |
| **Slug** | gov-sign-permit |
| **Vertical** | government |
| **RAAS Ruleset** | gov_027_sign_permit_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Sign Permit — processes sign permit applications, validates sign code compliance including size, height, illumination, and location restrictions

**Outputs:**
- gov027-sign-permit
- gov027-sign-code-analysis
- gov027-site-plan-markup

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-SP-001**: Sign Exceeds Maximum Area — Proposed sign area exceeds the maximum permitted for this zoning district and frontage — must reduce or obtain variance
- **PERM-SP-002**: Sign in Public Right-of-Way — Proposed sign location encroaches into the public right-of-way without an encroachment permit

### Soft Flags (Tier 2 — Warning)
- **PERM-SP-FLG-001**: Digital/Electronic Sign — Proposed sign is digital or electronic — verify compliance with brightness, animation, and message duration restrictions

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Proposed sign area exceeds the maximum permitted for this zoning district and frontage — must reduce or obtain variance
- Will not proceed when: Proposed sign location encroaches into the public right-of-way without an encroachment permit

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- parcel_number
- sign_type
- sign_area_sqft
- sign_height
- illumination_type
- location_description

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_027_sign_permit_v0.json`
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
