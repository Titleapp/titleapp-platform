# Contractor License Verification — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-019 |
| **Slug** | gov-contractor-license-verify |
| **Vertical** | government |
| **RAAS Ruleset** | gov_019_contractor_license_verify_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Contractor License Verification — validates contractor licensing status, classification, bond, workers compensation, and insurance before permit issuance

**Outputs:**
- gov019-license-verification-report
- gov019-insurance-confirmation
- gov019-classification-check

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-CLV-001**: License Not Found or Inactive — Contractor license number not found in state licensing board database or status is inactive/suspended/revoked
- **PERM-CLV-002**: Work Classification Mismatch — Contractor's license classification does not cover the type of work described on the permit application
- **PERM-CLV-003**: Workers Compensation Lapsed — Contractor does not have active workers' compensation coverage and is not a qualifying sole proprietor exempt — work cannot proceed

### Soft Flags (Tier 2 — Warning)
- **PERM-CLV-FLG-001**: Disciplinary Actions on Record — Contractor has one or more disciplinary actions on record with the licensing board — inform permit applicant

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Contractor license number not found in state licensing board database or status is inactive/suspended/revoked
- Will not proceed when: Contractor's license classification does not cover the type of work described on the permit application
- Will not proceed when: Contractor does not have active workers' compensation coverage and is not a qualifying sole proprietor exempt — work cannot proceed

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- contractor_license_number
- contractor_name
- work_classification
- insurance_certificate_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_019_contractor_license_verify_v0.json`
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
