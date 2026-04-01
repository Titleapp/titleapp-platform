# Deed Processing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-042 |
| **Slug** | gov-deed-processing |
| **Vertical** | government |
| **RAAS Ruleset** | gov_042_deed_processing_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Deed Processing — validates and records warranty deeds, quitclaim deeds, and special purpose deeds with chain-of-title verification and transfer tax assessment

**Outputs:**
- gov042-recorded-deed
- gov042-instrument-number
- gov042-transfer-tax-receipt
- gov042-chain-of-title-update

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-DP-001**: Legal Description Does Not Match Parcel — Legal description on the deed does not match the legal description in the assessor's parcel database — recording rejected to prevent cloud on title
- **REC-DP-002**: Transfer Tax Not Paid — Documentary transfer tax has not been paid and no exemption has been claimed — recording requires tax payment per state revenue code
- **REC-DP-003**: Grantor Signature Missing — Deed does not bear the signature of all grantors — deed is not executable and cannot be recorded

### Soft Flags (Tier 2 — Warning)
- **REC-DP-FLG-001**: Quitclaim Deed Advisory — Document is a quitclaim deed which provides no warranty of title — flag for title company notification if applicable
- **REC-DP-FLG-002**: Exempt Transfer Claimed — Transfer tax exemption claimed — verify exemption code is valid and documentation supports the claimed exemption

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Legal description on the deed does not match the legal description in the assessor's parcel database — recording rejected to prevent cloud on title
- Will not proceed when: Documentary transfer tax has not been paid and no exemption has been claimed — recording requires tax payment per state revenue code
- Will not proceed when: Deed does not bear the signature of all grantors — deed is not executable and cannot be recorded

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- deed_type
- document_file_id
- grantor
- grantee
- legal_description
- consideration_amount

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_042_deed_processing_v0.json`
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
