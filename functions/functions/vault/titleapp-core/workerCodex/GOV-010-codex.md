# Commercial Driver License Processing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-010 |
| **Slug** | gov-cdl-processing |
| **Vertical** | government |
| **RAAS Ruleset** | gov_010_cdl_processing_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Commercial Driver License Processing — manages CDL applications, endorsements, medical certifications, and FMCSA Drug & Alcohol Clearinghouse checks

**Outputs:**
- gov010-cdl-application-receipt
- gov010-endorsement-checklist
- gov010-clearinghouse-query-result
- gov010-medical-cert-status

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-CDL-001**: FMCSA Clearinghouse Violation Found — Drug & Alcohol Clearinghouse query returned an unresolved violation — CDL issuance prohibited per 49 CFR 382.701
- **DMV-CDL-002**: Medical Certificate Expired or Missing — DOT medical certificate (Form MCSA-5876) is expired or not on file — CDL cannot be renewed or issued
- **DMV-CDL-003**: Skills Test Not Passed — Applicant has not passed the required CDL skills test for the requested class and endorsements

### Soft Flags (Tier 2 — Warning)
- **DMV-CDL-FLG-001**: Hazmat Endorsement TSA Check Pending — Hazmat endorsement requested — TSA security threat assessment must be completed before endorsement can be added
- **DMV-CDL-FLG-002**: Medical Variance Required — Applicant disclosed a condition requiring FMCSA medical exemption or skill performance evaluation

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Drug & Alcohol Clearinghouse query returned an unresolved violation — CDL issuance prohibited per 49 CFR 382.701
- Will not proceed when: DOT medical certificate (Form MCSA-5876) is expired or not on file — CDL cannot be renewed or issued
- Will not proceed when: Applicant has not passed the required CDL skills test for the requested class and endorsements

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- applicant_name
- cdl_class
- endorsements_requested
- medical_certificate
- clearinghouse_query_consent

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_010_cdl_processing_v0.json`
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
