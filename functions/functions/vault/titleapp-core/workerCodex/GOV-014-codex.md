# DMV Revenue Reconciliation — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-014 |
| **Slug** | gov-revenue-reconciliation |
| **Vertical** | government |
| **RAAS Ruleset** | gov_014_revenue_reconciliation_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

DMV Revenue Reconciliation — reconciles daily fee collections, tracks outstanding balances, and generates revenue reports for treasury

**Outputs:**
- gov014-daily-reconciliation-report
- gov014-treasury-remittance
- gov014-exception-log

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-RR-001**: Batch Total Mismatch — Sum of individual transaction amounts does not match the payment processor batch total — discrepancy must be resolved before posting
- **DMV-RR-002**: Unallocated Payments Exceed Threshold — Unallocated payments exceed $500 — all payments must be matched to transactions before closing the batch

### Soft Flags (Tier 2 — Warning)
- **DMV-RR-FLG-001**: Refunds Exceed Daily Average — Daily refund total is more than 2x the rolling 30-day average — may indicate processing errors or fraud

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Sum of individual transaction amounts does not match the payment processor batch total — discrepancy must be resolved before posting
- Will not proceed when: Unallocated payments exceed $500 — all payments must be matched to transactions before closing the batch

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- reconciliation_date
- transaction_batch
- payment_processor_report
- general_ledger_codes

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_014_revenue_reconciliation_v0.json`
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
