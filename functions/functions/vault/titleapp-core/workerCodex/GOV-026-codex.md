# Certificate of Occupancy — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-026 |
| **Slug** | gov-certificate-occupancy |
| **Vertical** | government |
| **RAAS Ruleset** | gov_026_certificate_occupancy_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Certificate of Occupancy — validates all final inspections, fire sign-offs, utility connections, and as-built conditions before issuing occupancy authorization

**Outputs:**
- gov026-certificate-of-occupancy
- gov026-temporary-co
- gov026-inspection-summary
- gov026-outstanding-items

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-CO-001**: Final Inspection Not Passed — One or more required final inspections have not been passed — CO cannot be issued per IBC 111.1
- **PERM-CO-002**: Fire Department Sign-Off Missing — Fire department has not signed off on fire protection systems and means of egress — CO requires fire marshal approval
- **PERM-CO-003**: Health Department Clearance Missing — Building includes food service, pool, or other regulated use requiring health department clearance — not yet obtained

### Soft Flags (Tier 2 — Warning)
- **PERM-CO-FLG-001**: Temporary CO Requested — Applicant has requested a temporary certificate of occupancy — verify that outstanding items are non-life-safety and set expiration date

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: One or more required final inspections have not been passed — CO cannot be issued per IBC 111.1
- Will not proceed when: Fire department has not signed off on fire protection systems and means of egress — CO requires fire marshal approval
- Will not proceed when: Building includes food service, pool, or other regulated use requiring health department clearance — not yet obtained

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- occupancy_type
- final_inspection_ids
- fire_sign_off
- utility_connections

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_026_certificate_occupancy_v0.json`
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
