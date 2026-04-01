# Driver License Issuance — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-003 |
| **Slug** | gov-license-issuance |
| **Vertical** | government |
| **RAAS Ruleset** | gov_003_license_issuance_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Driver License Issuance — processes new and renewal driver license applications, validates identity documents, vision screening, and REAL ID compliance

**Outputs:**
- gov003-license-application-receipt
- gov003-real-id-checklist
- gov003-temporary-license

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-LI-001**: Identity Documents Insufficient — Applicant has not provided the minimum required identity documents per REAL ID Act (6 CFR 37) — cannot issue compliant credential
- **DMV-LI-002**: Vision Test Failed — Applicant failed the vision screening test and no corrective lens restriction is acceptable — must obtain eye care professional clearance
- **DMV-LI-003**: Suspended or Revoked Status — Applicant has a current suspension or revocation on their driving record — cannot issue until reinstatement is complete

### Soft Flags (Tier 2 — Warning)
- **DMV-LI-FLG-001**: REAL ID Upgrade Available — Applicant is renewing a standard license and has documents sufficient for REAL ID — offer upgrade
- **DMV-LI-FLG-002**: Medical Review Needed — Applicant is over 70 or has disclosed a medical condition — schedule medical review per state policy

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Applicant has not provided the minimum required identity documents per REAL ID Act (6 CFR 37) — cannot issue compliant credential
- Will not proceed when: Applicant failed the vision screening test and no corrective lens restriction is acceptable — must obtain eye care professional clearance
- Will not proceed when: Applicant has a current suspension or revocation on their driving record — cannot issue until reinstatement is complete

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- applicant_name
- date_of_birth
- ssn_last_four
- identity_documents
- residency_documents
- vision_test_result
- license_class

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_003_license_issuance_v0.json`
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
