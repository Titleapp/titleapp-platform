# Jurisdiction Onboarding — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-000 |
| **Slug** | gov-jurisdiction-onboarding |
| **Vertical** | government |
| **RAAS Ruleset** | gov_000_jurisdiction_onboarding_v0 |
| **Version** | v0 |
| **Domain** | government |

## 2. What It Does

Jurisdiction Onboarding — validates FIPS code, EIN, contact domain, and suite eligibility before provisioning a government tenant

**Outputs:**
- gov000-onboarding-checklist
- gov000-suite-provisioning-report
- gov000-jurisdiction-profile

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **GOV-000-BLK-001**: Invalid FIPS Code — fips_code not found in Census Bureau FIPS reference dataset — jurisdiction cannot be verified
- **GOV-000-BLK-002**: Contact Email Domain Mismatch — primary_contact_email domain does not match the jurisdiction's official domain — potential impersonation
- **GOV-000-BLK-003**: Invalid EIN Format — EIN does not conform to IRS XX-XXXXXXX format — cannot verify tax-exempt entity status
- **GOV-000-BLK-004**: No Suites Requested — suites_requested array is empty — at least one suite (DMV, Permitting, Inspector, Recorder) must be selected
- **GOV-000-BLK-005**: Recorder Suite Without eRecording Compliance — Recorder suite requested but jurisdiction has not confirmed eRecording compliance (PRIA/URPERA standards)
- **GOV-000-BLK-006**: Inspector Suite Missing Life-Safety Escalation — Inspector suite requested but life_safety_escalation contact/protocol not provided — cannot deploy inspection workers without escalation path
- **GOV-000-BLK-007**: Onboarding Report Not Signed — Onboarding report has not been signed within 14 calendar days of generation — must be re-generated and signed

### Soft Flags (Tier 2 — Warning)
- **GOV-000-FLG-001**: Multiple Suites Requested — Jurisdiction requested 3 or more suites — recommend phased rollout to manage change management risk
- **GOV-000-FLG-002**: Small Jurisdiction Population — Jurisdiction population below 10,000 — consider shared-service deployment model

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: fips_code not found in Census Bureau FIPS reference dataset — jurisdiction cannot be verified
- Will not proceed when: primary_contact_email domain does not match the jurisdiction's official domain — potential impersonation
- Will not proceed when: EIN does not conform to IRS XX-XXXXXXX format — cannot verify tax-exempt entity status
- Will not proceed when: suites_requested array is empty — at least one suite (DMV, Permitting, Inspector, Recorder) must be selected
- Will not proceed when: Recorder suite requested but jurisdiction has not confirmed eRecording compliance (PRIA/URPERA standards)
- Will not proceed when: Inspector suite requested but life_safety_escalation contact/protocol not provided — cannot deploy inspection workers without escalation path
- Will not proceed when: Onboarding report has not been signed within 14 calendar days of generation — must be re-generated and signed

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- fips_code
- jurisdiction_name
- state
- ein
- suites_requested

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_000_jurisdiction_onboarding_v0.json`
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
