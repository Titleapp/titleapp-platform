# FIRPTA and 1031 Exchange — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-007 |
| **Slug** | esc-firpta-1031-exchange |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_007_firpta_1031_exchange_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

FIRPTA and 1031 Exchange — enforces FIRPTA withholding requirements for foreign sellers, manages IRC Section 1031 exchange timelines and identification rules, tracks qualified intermediary coordination, and blocks closing or exchange completion when compliance gaps exist.

**Outputs:**
- check_id
- withholding_amount
- exchange_status
- qi_coordination

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-FE-001**: Foreign Seller Without Withholding Block Closing — Seller identified as foreign person under FIRPTA and required withholding has not been calculated or escrowed — block closing.
- **ESC-FE-002**: 1031 Timeline Expired Exchange Failed — The 45-day identification period or 180-day exchange period has expired — exchange has failed and must be treated as taxable sale.
- **ESC-FE-003**: Boot Not Calculated Block Exchange Completion — Taxable boot (cash or non-like-kind property received) has not been calculated — block exchange completion until boot amount is determined.

### Soft Flags (Tier 2 — Warning)
- **ESC-FE-FLG-001**: Reduced Withholding Certificate — Seller has applied for or received an IRS withholding certificate for reduced FIRPTA withholding — flag for tracking.
- **ESC-FE-FLG-002**: Multiple Replacement Properties — Exchanger has identified multiple replacement properties — flag for tracking compliance with the 3-property or 200% rule.
- **ESC-FE-FLG-003**: Reverse Exchange — Transaction structured as a reverse 1031 exchange (replacement acquired before relinquished sold) — flag for enhanced QI coordination.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Seller identified as foreign person under FIRPTA and required withholding has not been calculated or escrowed — block closing.
- Will not proceed when: The 45-day identification period or 180-day exchange period has expired — exchange has failed and must be treated as taxable sale.
- Will not proceed when: Taxable boot (cash or non-like-kind property received) has not been calculated — block exchange completion until boot amount is determined.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- seller_is_foreign
- sale_price

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_007_firpta_1031_exchange_v0.json`
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
