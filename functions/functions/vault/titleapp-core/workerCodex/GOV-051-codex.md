# Easement and Right-of-Way Recording — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-051 |
| **Slug** | gov-easement-row-recording |
| **Vertical** | government |
| **RAAS Ruleset** | gov_051_easement_row_recording_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Easement and Right-of-Way Recording — records easement grants, dedications, vacations, and utility easements with beneficiary and burdened parcel tracking

**Outputs:**
- gov051-recorded-easement
- gov051-instrument-number
- gov051-parcel-encumbrance-update
- gov051-gis-mapping-notification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-EW-001**: Grantor Does Not Own Burdened Parcel — Grantor of the easement is not the owner of the burdened parcel — cannot grant an easement over property not owned
- **REC-EW-002**: Easement Description Indeterminate — Legal description of the easement area is insufficient to locate the easement on the ground — recording would create title ambiguity

### Soft Flags (Tier 2 — Warning)
- **REC-EW-FLG-001**: Overlapping Easement Exists — A previously recorded easement overlaps with the proposed easement area — verify compatibility of uses

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Grantor of the easement is not the owner of the burdened parcel — cannot grant an easement over property not owned
- Will not proceed when: Legal description of the easement area is insufficient to locate the easement on the ground — recording would create title ambiguity

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- easement_type
- document_file_id
- grantor
- grantee_beneficiary
- burdened_parcel
- legal_description_of_easement

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_051_easement_row_recording_v0.json`
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
