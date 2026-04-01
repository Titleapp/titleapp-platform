# Code Enforcement — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-025 |
| **Slug** | gov-code-enforcement |
| **Vertical** | government |
| **RAAS Ruleset** | gov_025_code_enforcement_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Code Enforcement — manages property maintenance complaints, violation investigations, notice and order issuance, abatement tracking, and compliance monitoring

**Outputs:**
- gov025-violation-notice
- gov025-compliance-timeline
- gov025-abatement-order
- gov025-case-closure-report

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-CE-001**: Imminent Danger — Emergency Abatement Required — Condition constitutes imminent danger to life or safety — emergency abatement authority must be invoked immediately per municipal code
- **PERM-CE-002**: Notice Not Served Within Statutory Period — Violation notice was not served on the property owner within the required statutory timeframe — notice is void
- **PERM-CE-003**: Due Process Violation — Property owner was not provided an opportunity to correct or appeal before penalty assessment — due process not satisfied

### Soft Flags (Tier 2 — Warning)
- **PERM-CE-FLG-001**: Repeat Offender — Property has had 3 or more code enforcement cases in the past 24 months — consider escalated enforcement action
- **PERM-CE-FLG-002**: Compliance Deadline Approaching — Compliance deadline is within 7 days and violation has not been corrected — prepare follow-up inspection

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Condition constitutes imminent danger to life or safety — emergency abatement authority must be invoked immediately per municipal code
- Will not proceed when: Violation notice was not served on the property owner within the required statutory timeframe — notice is void
- Will not proceed when: Property owner was not provided an opportunity to correct or appeal before penalty assessment — due process not satisfied

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- complaint_number
- parcel_number
- violation_type
- investigation_date
- officer_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_025_code_enforcement_v0.json`
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
