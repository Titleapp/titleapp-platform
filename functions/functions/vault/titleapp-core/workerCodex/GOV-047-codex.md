# Vital Records — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-047 |
| **Slug** | gov-vital-records |
| **Vertical** | government |
| **RAAS Ruleset** | gov_047_vital_records_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Vital Records — manages birth certificates, death certificates, marriage licenses, and domestic partnership registrations with identity verification and fraud prevention

**Outputs:**
- gov047-certified-copy
- gov047-request-receipt
- gov047-identity-verification-log
- gov047-denial-notice

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-VR-001**: Requestor Not Authorized — Requestor does not have a qualifying relationship or legal authority to obtain a certified copy of this vital record per state vital statistics law
- **REC-VR-002**: Identity Verification Failed — Requestor's identity could not be verified through the required identification process — vital record cannot be released
- **REC-VR-003**: Record Sealed by Court Order — Requested vital record is sealed by court order — cannot be released without court authorization to unseal

### Soft Flags (Tier 2 — Warning)
- **REC-VR-FLG-001**: High-Volume Requestor — Requestor has made more than 5 vital record requests in 30 days — flag for potential misuse review

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Requestor does not have a qualifying relationship or legal authority to obtain a certified copy of this vital record per state vital statistics law
- Will not proceed when: Requestor's identity could not be verified through the required identification process — vital record cannot be released
- Will not proceed when: Requested vital record is sealed by court order — cannot be released without court authorization to unseal

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- record_type
- requestor_name
- requestor_relationship
- identity_verification
- subject_details

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_047_vital_records_v0.json`
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
