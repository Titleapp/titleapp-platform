# Fire Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-035 |
| **Slug** | gov-fire-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_035_fire_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Fire Inspector — conducts fire safety inspections, validates sprinkler and alarm systems, verifies egress compliance, and enforces IFC occupancy limits

**Outputs:**
- gov035-fire-inspection-report
- gov035-violation-notice
- gov035-occupancy-certification
- gov035-sprinkler-acceptance-report

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-FI-001**: Blocked Means of Egress — Required means of egress is blocked, locked, or obstructed — immediate life safety violation per IFC 1031
- **INSP-FI-002**: Fire Sprinkler System Non-Functional — Automatic sprinkler system is impaired, shut off, or failed acceptance test — building cannot be occupied
- **INSP-FI-003**: Fire Alarm Not Operational — Fire alarm and detection system is not operational or failed final acceptance test — occupancy not permitted
- **INSP-FI-004**: Occupancy Load Exceeded — Observed occupancy exceeds the posted maximum occupant load — fire code violation requiring immediate reduction

### Soft Flags (Tier 2 — Warning)
- **INSP-FI-FLG-001**: Fire Extinguisher Service Overdue — One or more fire extinguishers have overdue annual service tags — schedule maintenance
- **INSP-FI-FLG-002**: Knox Box Access Issue — Knox Box or key vault is missing, damaged, or contents do not match current building keys — fire department access risk

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Required means of egress is blocked, locked, or obstructed — immediate life safety violation per IFC 1031
- Will not proceed when: Automatic sprinkler system is impaired, shut off, or failed acceptance test — building cannot be occupied
- Will not proceed when: Fire alarm and detection system is not operational or failed final acceptance test — occupancy not permitted
- Will not proceed when: Observed occupancy exceeds the posted maximum occupant load — fire code violation requiring immediate reduction

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- fire_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_035_fire_inspector_v0.json`
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
