# Alex Chief of Staff for Title and Escrow — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-012 |
| **Slug** | esc-alex-title-escrow |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_012_alex_title_escrow_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Alex Chief of Staff for Title and Escrow — monitors all active Escrow Lockers, surfaces anomalies and stalled transactions, escalates unresolved wire fraud alerts, provides daily briefings, and tracks stage breakdowns across the portfolio.

**Outputs:**
- briefing
- anomaly_count
- active_lockers
- stage_breakdown

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-AX-001**: Anomaly Unacknowledged Escalate — An anomaly has gone unacknowledged for more than 24 hours — escalate to operations manager.
- **ESC-AX-002**: Wire Fraud Alert Unresolved Escalate To Admin — A wire fraud alert remains unresolved — escalate to admin immediately.

### Soft Flags (Tier 2 — Warning)
- **ESC-AX-FLG-001**: Locker Stalled — An Escrow Locker has not advanced stages in an unusually long period — flag for review.
- **ESC-AX-FLG-002**: Deadline Breach — A transaction has breached a contractual or regulatory deadline — flag for immediate attention.
- **ESC-AX-FLG-003**: High Volume Day — Unusually high number of active Lockers or disbursements scheduled — flag for capacity planning.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: An anomaly has gone unacknowledged for more than 24 hours — escalate to operations manager.
- Will not proceed when: A wire fraud alert remains unresolved — escalate to admin immediately.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- tenant_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_012_alex_title_escrow_v0.json`
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
