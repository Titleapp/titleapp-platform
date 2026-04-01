# Commission Reconciliation — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-008 |
| **Slug** | esc-commission-reconciliation |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_008_commission_reconciliation_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Commission Reconciliation — reconciles agent commissions, broker splits, referral fees, and transaction coordinator fees against the settlement statement. Blocks disbursement when totals do not balance or trust accounts are unverified.

**Outputs:**
- recon_id
- total_commissions
- total_fees
- balanced
- disbursement_ready

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-CR-001**: Commission Not Reconciled Block Disbursement — Commission amounts on the settlement statement do not reconcile with the listing agreement and buyer broker agreement — block disbursement.
- **ESC-CR-002**: Fee Discrepancy Hold — Fee discrepancy greater than $1 detected between agreed fees and settlement statement — hold for correction.
- **ESC-CR-003**: Trust Account Not Verified Block Commission Disbursement — Broker trust account has not been verified — block commission disbursement until account is confirmed.

### Soft Flags (Tier 2 — Warning)
- **ESC-CR-FLG-001**: Unusual Commission Rate — Commission rate falls outside typical market range — flag for review.
- **ESC-CR-FLG-002**: Referral Fee Above Threshold — Referral fee exceeds 25% of the commission — flag for compliance review.
- **ESC-CR-FLG-003**: TC Fee Above Market — Transaction coordinator fee exceeds typical market rate — flag for review.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Commission amounts on the settlement statement do not reconcile with the listing agreement and buyer broker agreement — block disbursement.
- Will not proceed when: Fee discrepancy greater than $1 detected between agreed fees and settlement statement — hold for correction.
- Will not proceed when: Broker trust account has not been verified — block commission disbursement until account is confirmed.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- commissions
- fees

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_008_commission_reconciliation_v0.json`
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
