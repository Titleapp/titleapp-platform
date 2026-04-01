# Fire Prevention Review — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-020 |
| **Slug** | gov-fire-prevention-review |
| **Vertical** | government |
| **RAAS Ruleset** | gov_020_fire_prevention_review_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Fire Prevention Review — reviews building plans and permit applications for fire code compliance including sprinkler, alarm, egress, and fire separation requirements

**Outputs:**
- gov020-fire-review-comments
- gov020-fire-code-checklist
- gov020-sprinkler-requirement-determination
- gov020-egress-plan-approval

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-FP-001**: Sprinkler System Not Provided Where Required — Building exceeds threshold requiring automatic sprinkler system per NFPA 13/IFC but no sprinkler system is shown on plans
- **PERM-FP-002**: Insufficient Egress Capacity — Calculated egress capacity does not meet occupant load requirements per IBC Chapter 10 — life safety hazard
- **PERM-FP-003**: Fire Department Access Blocked — Fire department access road does not meet minimum width, grade, or turnaround requirements per IFC Appendix D

### Soft Flags (Tier 2 — Warning)
- **PERM-FP-FLG-001**: High Hazard Occupancy — Building contains Group H (high-hazard) occupancy classification — additional fire prevention measures may be required
- **PERM-FP-FLG-002**: Fire Flow Calculation Needed — Building size exceeds threshold requiring fire flow calculation — verify water supply adequacy with fire department

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Building exceeds threshold requiring automatic sprinkler system per NFPA 13/IFC but no sprinkler system is shown on plans
- Will not proceed when: Calculated egress capacity does not meet occupant load requirements per IBC Chapter 10 — life safety hazard
- Will not proceed when: Fire department access road does not meet minimum width, grade, or turnaround requirements per IFC Appendix D

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- occupancy_type
- occupant_load
- sprinkler_required
- alarm_system_type
- fire_department_access

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_020_fire_prevention_review_v0.json`
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
