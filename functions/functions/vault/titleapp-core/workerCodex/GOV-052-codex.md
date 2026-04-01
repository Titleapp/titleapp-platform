# Lis Pendens and Court Orders — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-052 |
| **Slug** | gov-lis-pendens-court-orders |
| **Vertical** | government |
| **RAAS Ruleset** | gov_052_lis_pendens_court_orders_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Lis Pendens and Court Orders — records notices of pending litigation, court-ordered transfers, foreclosure notices, and abstracts of judgment against real property

**Outputs:**
- gov052-recorded-document
- gov052-instrument-number
- gov052-parcel-cloud-notification
- gov052-party-notification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-LP-001**: Court Case Number Not Verified — Court case number cannot be verified against the issuing court's records — document may be fraudulent
- **REC-LP-002**: Court Order Missing Judge Signature — Court order does not bear the signature of the issuing judge or judicial officer — order is not executable
- **REC-LP-003**: Expungement Order — Do Not Record — An expungement or withdrawal order has been issued for this lis pendens — original notice must be removed, not re-recorded

### Soft Flags (Tier 2 — Warning)
- **REC-LP-FLG-001**: Foreclosure Notice — Homeowner Notification Required — Foreclosure-related document being recorded — jurisdiction may require additional homeowner counseling notifications

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Court case number cannot be verified against the issuing court's records — document may be fraudulent
- Will not proceed when: Court order does not bear the signature of the issuing judge or judicial officer — order is not executable
- Will not proceed when: An expungement or withdrawal order has been issued for this lis pendens — original notice must be removed, not re-recorded

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- document_type
- case_number
- court_name
- document_file_id
- property_affected
- parties

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_052_lis_pendens_court_orders_v0.json`
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
