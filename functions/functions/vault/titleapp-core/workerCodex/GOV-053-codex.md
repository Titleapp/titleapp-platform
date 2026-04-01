# Tax Lien and Assessment Recording — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-053 |
| **Slug** | gov-tax-lien-assessment |
| **Vertical** | government |
| **RAAS Ruleset** | gov_053_tax_lien_assessment_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Tax Lien and Assessment Recording — records property tax liens, special assessment liens, and tax sale certificates with statutory notice compliance

**Outputs:**
- gov053-tax-lien-certificate
- gov053-notice-of-delinquency
- gov053-redemption-calculation
- gov053-assessor-notification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-TL-001**: Statutory Notice Period Not Met — Required notice to the property owner of delinquent taxes was not sent within the statutory timeframe — lien is unenforceable
- **REC-TL-002**: Duplicate Tax Lien for Same Year — A tax lien for the same parcel and tax year already exists in the records — duplicate filing rejected

### Soft Flags (Tier 2 — Warning)
- **REC-TL-FLG-001**: Tax Sale Redemption Period Active — Property is within the statutory redemption period following tax sale — owner may still redeem
- **REC-TL-FLG-002**: Homestead Exemption on File — Property has a homestead exemption on file — verify that additional consumer protection notice requirements are met

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Required notice to the property owner of delinquent taxes was not sent within the statutory timeframe — lien is unenforceable
- Will not proceed when: A tax lien for the same parcel and tax year already exists in the records — duplicate filing rejected

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- lien_type
- parcel_number
- tax_year
- lien_amount
- taxing_authority

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_053_tax_lien_assessment_v0.json`
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
