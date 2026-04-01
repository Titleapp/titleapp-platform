# VIN Verification — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-004 |
| **Slug** | gov-vin-verification |
| **Vertical** | government |
| **RAAS Ruleset** | gov_004_vin_verification_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

VIN Verification — validates vehicle identification numbers against NHTSA decode, checks for theft records, and verifies physical VIN plate integrity

**Outputs:**
- gov004-vin-verification-report
- gov004-nhtsa-decode-result
- gov004-inspector-certification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-VV-001**: VIN Decode Failure — VIN does not decode against NHTSA vPIC database — may be a non-standard or counterfeit VIN
- **DMV-VV-002**: NCIC Theft Record Found — VIN matches an active NCIC stolen vehicle record — law enforcement must be notified immediately
- **DMV-VV-003**: VIN Plate Tampering Detected — VIN plate photo analysis indicates signs of tampering, replacement, or alteration — requires law enforcement inspection

### Soft Flags (Tier 2 — Warning)
- **DMV-VV-FLG-001**: Confidential VIN Location Mismatch — Federal confidential VIN (hidden VIN) location does not match expected position for this make/model — further inspection recommended

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: VIN does not decode against NHTSA vPIC database — may be a non-standard or counterfeit VIN
- Will not proceed when: VIN matches an active NCIC stolen vehicle record — law enforcement must be notified immediately
- Will not proceed when: VIN plate photo analysis indicates signs of tampering, replacement, or alteration — requires law enforcement inspection

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- vin
- inspector_id
- vin_photo
- vehicle_location
- inspection_date

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_004_vin_verification_v0.json`
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
