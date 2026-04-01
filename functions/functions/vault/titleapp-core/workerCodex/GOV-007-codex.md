# Dealer Licensing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-007 |
| **Slug** | gov-dealer-licensing |
| **Vertical** | government |
| **RAAS Ruleset** | gov_007_dealer_licensing_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Dealer Licensing — processes new and renewal dealer license applications, validates bond, lot, and insurance requirements

**Outputs:**
- gov007-dealer-license-certificate
- gov007-lot-inspection-report
- gov007-bond-verification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-DL-001**: Surety Bond Insufficient — Dealer surety bond amount is below the state-mandated minimum — cannot issue dealer license without adequate bond
- **DMV-DL-002**: Lot Inspection Failed — Dealer lot failed physical inspection — must meet zoning, signage, office, and display area requirements
- **DMV-DL-003**: Principal Has Felony Conviction — A principal or officer of the dealership has a disqualifying felony conviction per state dealer licensing statute

### Soft Flags (Tier 2 — Warning)
- **DMV-DL-FLG-001**: Consumer Complaints on File — Dealer has 3 or more unresolved consumer complaints — may require additional oversight or conditions on license
- **DMV-DL-FLG-002**: License Renewal Overdue — Dealer license has been expired for more than 60 days — reinstatement fees and re-inspection may apply

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Dealer surety bond amount is below the state-mandated minimum — cannot issue dealer license without adequate bond
- Will not proceed when: Dealer lot failed physical inspection — must meet zoning, signage, office, and display area requirements
- Will not proceed when: A principal or officer of the dealership has a disqualifying felony conviction per state dealer licensing statute

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- dealer_name
- dealer_type
- business_address
- surety_bond_number
- lot_inspection_date
- insurance_certificate

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_007_dealer_licensing_v0.json`
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
