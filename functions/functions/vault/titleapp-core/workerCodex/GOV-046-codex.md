# Plat and Map Recording — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-046 |
| **Slug** | gov-plat-map-recording |
| **Vertical** | government |
| **RAAS Ruleset** | gov_046_plat_map_recording_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Plat and Map Recording — records subdivision plats, lot line adjustments, parcel maps, and condominium plans with surveyor certification and planning approval verification

**Outputs:**
- gov046-recorded-plat
- gov046-book-page-reference
- gov046-parcel-number-assignments
- gov046-assessor-notification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-PM-001**: Surveyor Certification Missing — Plat or map does not bear the certification of a licensed land surveyor — cannot be recorded per state survey statutes
- **REC-PM-002**: Planning Commission Approval Not Obtained — Subdivision plat or parcel map has not received required planning commission or governing body approval
- **REC-PM-003**: Map Does Not Meet Recording Standards — Map sheet size, scale, margins, or labeling does not meet the recorder's minimum standards for recording

### Soft Flags (Tier 2 — Warning)
- **REC-PM-FLG-001**: Easement Dedication on Map — Map includes dedication of new easements — verify that all affected property owners have signed the dedication certificates

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Plat or map does not bear the certification of a licensed land surveyor — cannot be recorded per state survey statutes
- Will not proceed when: Subdivision plat or parcel map has not received required planning commission or governing body approval
- Will not proceed when: Map sheet size, scale, margins, or labeling does not meet the recorder's minimum standards for recording

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- map_type
- document_file_id
- surveyor_license_number
- planning_approval_id
- parcel_numbers_affected

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_046_plat_map_recording_v0.json`
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
