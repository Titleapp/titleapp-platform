# Lien Filing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-044 |
| **Slug** | gov-lien-filing |
| **Vertical** | government |
| **RAAS Ruleset** | gov_044_lien_filing_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Lien Filing — records mechanic's liens, tax liens, judgment liens, and HOA liens with statutory deadline tracking and proper notice verification

**Outputs:**
- gov044-recorded-lien
- gov044-instrument-number
- gov044-lien-notice
- gov044-deadline-tracker

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-LF-001**: Mechanic's Lien Filing Deadline Expired — Mechanic's lien is being filed after the statutory deadline from completion of work — lien is time-barred and cannot be recorded
- **REC-LF-002**: Preliminary Notice Not Served — Mechanic's lien claimant did not serve the required preliminary notice — lien is invalid without proper notice
- **REC-LF-003**: Lien Amount Exceeds Statutory Limit — Claimed lien amount exceeds the statutory limit for this lien type or exceeds the contract amount — lien may be subject to penalties

### Soft Flags (Tier 2 — Warning)
- **REC-LF-FLG-001**: Multiple Liens on Same Parcel — Parcel already has 3 or more active liens recorded — verify lien priority and notify title companies of complex lien stack

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Mechanic's lien is being filed after the statutory deadline from completion of work — lien is time-barred and cannot be recorded
- Will not proceed when: Mechanic's lien claimant did not serve the required preliminary notice — lien is invalid without proper notice
- Will not proceed when: Claimed lien amount exceeds the statutory limit for this lien type or exceeds the contract amount — lien may be subject to penalties

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- lien_type
- document_file_id
- claimant_name
- property_owner
- legal_description
- lien_amount

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_044_lien_filing_v0.json`
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
