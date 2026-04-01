# Notary Administration — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-048 |
| **Slug** | gov-notary-administration |
| **Vertical** | government |
| **RAAS Ruleset** | gov_048_notary_administration_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Notary Administration — manages notary public commissions, notary journal audits, RON provider registrations, and notary complaint investigations

**Outputs:**
- gov048-notary-commission
- gov048-bond-filing-receipt
- gov048-journal-audit-report
- gov048-complaint-investigation

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-NA-001**: Notary Bond Not Filed — Notary public bond has not been filed with the county recorder — commission cannot be issued without bond
- **REC-NA-002**: Background Check Disqualification — Notary applicant has a disqualifying conviction per state notary statutes — commission application denied
- **REC-NA-003**: RON Provider Not State-Approved — Remote online notarization platform is not on the state-approved provider list — RON sessions on this platform are not valid

### Soft Flags (Tier 2 — Warning)
- **REC-NA-FLG-001**: Commission Expiring Soon — Notary commission expires within 90 days — send renewal reminder

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Notary public bond has not been filed with the county recorder — commission cannot be issued without bond
- Will not proceed when: Notary applicant has a disqualifying conviction per state notary statutes — commission application denied
- Will not proceed when: Remote online notarization platform is not on the state-approved provider list — RON sessions on this platform are not valid

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- notary_action_type
- notary_name
- commission_number
- bond_surety_info

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_048_notary_administration_v0.json`
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
