# Lien Clearance — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-004 |
| **Slug** | esc-lien-clearance |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_004_lien_clearance_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Lien Clearance — tracks existing liens on the property, coordinates payoff demands, monitors release recordings, and blocks DTC transfer and closing until all liens are satisfied and released.

**Outputs:**
- clearance_id
- lien_type
- payoff_amount
- release_status
- release_confirmed

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-LC-001**: Unreleased Lien Block DTC Transfer — An existing lien has not been released — block DTC transfer until lien release is recorded.
- **ESC-LC-002**: Payoff Amount Unconfirmed Block Disbursement — Payoff amount from lienholder has not been confirmed — block disbursement until confirmed payoff demand is received.
- **ESC-LC-003**: Release Not Recorded Block Closing — Lien release has not been recorded with the county — block closing until recording is confirmed.

### Soft Flags (Tier 2 — Warning)
- **ESC-LC-FLG-001**: Payoff Amount Increase — Payoff amount has increased since the original demand — flag for review and updated HUD/CD.
- **ESC-LC-FLG-002**: Per Diem High — Per diem interest on the existing lien is unusually high — flag for timing optimization.
- **ESC-LC-FLG-003**: Multiple Liens — Property has multiple liens requiring coordination — flag for sequencing and priority review.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: An existing lien has not been released — block DTC transfer until lien release is recorded.
- Will not proceed when: Payoff amount from lienholder has not been confirmed — block disbursement until confirmed payoff demand is received.
- Will not proceed when: Lien release has not been recorded with the county — block closing until recording is confirmed.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- lien_type
- lienholder

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_004_lien_clearance_v0.json`
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
