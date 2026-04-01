# Title Registration — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-001 |
| **Slug** | gov-title-registration |
| **Vertical** | government |
| **RAAS Ruleset** | gov_001_title_registration_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Title Registration — processes vehicle title transfers, validates VIN integrity, NMVTIS checks, odometer fraud detection, and lienholder verification

**Outputs:**
- gov001-title-certificate
- gov001-transfer-receipt
- gov001-nmvtis-report
- gov001-fee-schedule

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-R-001**: VIN Checksum Failure — VIN fails ISO 3779 / 49 CFR 565 check-digit validation — cannot process title with invalid VIN
- **DMV-R-002**: NMVTIS Title Problem Indicator — NMVTIS returns title_problem_indicator = true — title may be branded, salvage, or flood; requires manual review
- **DMV-R-003**: Odometer Rollback Detected — Reported odometer reading is less than the most recent prior recorded reading — potential odometer fraud per 49 USC 32703
- **DMV-R-004**: Lienholder Not in ELT Provider List — Declared lienholder is not a recognized Electronic Lien and Title (ELT) provider — cannot electronically process lien notation
- **DMV-R-005**: Duplicate Title Request — A title transfer for this VIN was already submitted within the last 3 business days — possible duplicate or fraud
- **DMV-R-006**: DPPA Permissible Use Not Logged — Driver's Privacy Protection Act (18 USC 2721) permissible use purpose code not recorded before accessing personal data
- **DMV-R-007**: Fee Payment Not Confirmed — Title transfer fee payment_intent_id not confirmed as settled — cannot issue title without confirmed payment

### Soft Flags (Tier 2 — Warning)
- **DMV-R-FLG-001**: High-Value Transfer — Purchase price exceeds $75,000 — flag for enhanced review and possible luxury tax assessment
- **DMV-R-FLG-002**: Out-of-State Title — Seller's current title was issued by a different state — verify reciprocity and title brand portability

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: VIN fails ISO 3779 / 49 CFR 565 check-digit validation — cannot process title with invalid VIN
- Will not proceed when: NMVTIS returns title_problem_indicator = true — title may be branded, salvage, or flood; requires manual review
- Will not proceed when: Reported odometer reading is less than the most recent prior recorded reading — potential odometer fraud per 49 USC 32703
- Will not proceed when: Declared lienholder is not a recognized Electronic Lien and Title (ELT) provider — cannot electronically process lien notation
- Will not proceed when: A title transfer for this VIN was already submitted within the last 3 business days — possible duplicate or fraud
- Will not proceed when: Driver's Privacy Protection Act (18 USC 2721) permissible use purpose code not recorded before accessing personal data
- Will not proceed when: Title transfer fee payment_intent_id not confirmed as settled — cannot issue title without confirmed payment

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- vin
- year_make_model
- odometer_reading
- seller_name
- buyer_name
- purchase_price
- payment_intent_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_001_title_registration_v0.json`
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
