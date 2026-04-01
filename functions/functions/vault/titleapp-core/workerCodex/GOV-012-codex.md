# DMV Hearings and Appeals — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-012 |
| **Slug** | gov-hearings-appeals |
| **Vertical** | government |
| **RAAS Ruleset** | gov_012_hearings_appeals_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

DMV Hearings and Appeals — schedules administrative hearings, tracks evidence submissions, and generates hearing officer decision documents

**Outputs:**
- gov012-hearing-notice
- gov012-hearing-decision
- gov012-evidence-log
- gov012-appeal-instructions

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-HA-001**: Hearing Notice Not Served — Respondent was not served with hearing notice within the statutory minimum notice period — hearing must be rescheduled
- **DMV-HA-002**: Hearing Officer Conflict of Interest — Assigned hearing officer has a declared conflict of interest with the respondent or case — must recuse and reassign

### Soft Flags (Tier 2 — Warning)
- **DMV-HA-FLG-001**: Continuance Requested — Respondent has requested a continuance — verify good cause and reschedule within statutory timeframe
- **DMV-HA-FLG-002**: Attorney Representation — Respondent has retained legal counsel — ensure all communications include attorney of record

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Respondent was not served with hearing notice within the statutory minimum notice period — hearing must be rescheduled
- Will not proceed when: Assigned hearing officer has a declared conflict of interest with the respondent or case — must recuse and reassign

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- case_number
- hearing_type
- respondent_name
- hearing_date
- evidence_list

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_012_hearings_appeals_v0.json`
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
