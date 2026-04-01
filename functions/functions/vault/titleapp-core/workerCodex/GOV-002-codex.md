# Vehicle Registration Renewal — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-002 |
| **Slug** | gov-registration-renewal |
| **Vertical** | government |
| **RAAS Ruleset** | gov_002_registration_renewal_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Vehicle Registration Renewal — processes annual registration renewals, validates emissions compliance, insurance verification, and outstanding violation checks

**Outputs:**
- gov002-renewal-receipt
- gov002-registration-card
- gov002-fee-schedule

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-RN-001**: Insurance Not Verified — Vehicle insurance policy could not be verified through the state insurance verification system — registration cannot be renewed without active coverage
- **DMV-RN-002**: Emissions Test Expired or Failed — Emissions/smog test is expired or vehicle failed the most recent test — renewal blocked per Clean Air Act compliance
- **DMV-RN-003**: Outstanding Parking or Traffic Violations — Vehicle has unresolved parking or traffic violations with court holds — registration renewal blocked until violations cleared
- **DMV-RN-004**: Registration Fee Not Paid — Annual registration fee payment not confirmed — cannot issue renewal sticker without payment

### Soft Flags (Tier 2 — Warning)
- **DMV-RN-FLG-001**: Late Renewal — Registration is being renewed more than 30 days after expiration — late fees may apply
- **DMV-RN-FLG-002**: Address Change Detected — Owner's address on file differs from the address provided — may need to update records and reassess county fees

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Vehicle insurance policy could not be verified through the state insurance verification system — registration cannot be renewed without active coverage
- Will not proceed when: Emissions/smog test is expired or vehicle failed the most recent test — renewal blocked per Clean Air Act compliance
- Will not proceed when: Vehicle has unresolved parking or traffic violations with court holds — registration renewal blocked until violations cleared
- Will not proceed when: Annual registration fee payment not confirmed — cannot issue renewal sticker without payment

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- vin
- plate_number
- owner_name
- insurance_policy_id
- emissions_test_date
- payment_intent_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_002_registration_renewal_v0.json`
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
