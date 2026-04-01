# Right-of-Way Encroachment — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-030 |
| **Slug** | gov-row-encroachment |
| **Vertical** | government |
| **RAAS Ruleset** | gov_030_row_encroachment_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Right-of-Way Encroachment — processes encroachment permits for work within public rights-of-way including utility cuts, sidewalk repairs, and temporary street closures

**Outputs:**
- gov030-encroachment-permit
- gov030-traffic-control-approval
- gov030-restoration-requirements
- gov030-bond-calculation

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-ROW-001**: Traffic Control Plan Not Approved — Work within the right-of-way requires an approved traffic control plan per MUTCD — plan not submitted or not approved
- **PERM-ROW-002**: Insurance Certificate Not on File — Applicant has not provided the required liability insurance certificate naming the jurisdiction as additional insured

### Soft Flags (Tier 2 — Warning)
- **PERM-ROW-FLG-001**: Major Arterial Impact — Encroachment is on a major arterial road — may require coordination with traffic engineering and off-peak work hours
- **PERM-ROW-FLG-002**: Extended Duration — Encroachment duration exceeds 14 days — may require additional public notification and detour signage

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Work within the right-of-way requires an approved traffic control plan per MUTCD — plan not submitted or not approved
- Will not proceed when: Applicant has not provided the required liability insurance certificate naming the jurisdiction as additional insured

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- location_description
- encroachment_type
- traffic_control_plan_id
- applicant_name
- start_date
- end_date

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_030_row_encroachment_v0.json`
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
