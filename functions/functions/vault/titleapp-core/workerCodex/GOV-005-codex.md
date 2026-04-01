# Lien Processing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-005 |
| **Slug** | gov-lien-processing |
| **Vertical** | government |
| **RAAS Ruleset** | gov_005_lien_processing_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Lien Processing — manages lien filings, releases, and ELT (Electronic Lien and Title) transactions for vehicle titles

**Outputs:**
- gov005-lien-filing-confirmation
- gov005-lien-release-certificate
- gov005-elt-transaction-log

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-LP-001**: Lienholder Not ELT Registered — Lienholder is not registered with the state Electronic Lien and Title system — cannot process electronic lien filing
- **DMV-LP-002**: Release by Non-Lienholder — Lien release request submitted by a party that is not the recorded lienholder — release is invalid
- **DMV-LP-003**: Duplicate Lien Filing — An active lien by the same lienholder already exists on this title — cannot file duplicate lien

### Soft Flags (Tier 2 — Warning)
- **DMV-LP-FLG-001**: Multiple Liens on Title — Vehicle title already has two or more active liens — verify lien priority order

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Lienholder is not registered with the state Electronic Lien and Title system — cannot process electronic lien filing
- Will not proceed when: Lien release request submitted by a party that is not the recorded lienholder — release is invalid
- Will not proceed when: An active lien by the same lienholder already exists on this title — cannot file duplicate lien

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- vin
- lienholder_name
- lienholder_elt_id
- lien_amount
- action_type

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_005_lien_processing_v0.json`
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
