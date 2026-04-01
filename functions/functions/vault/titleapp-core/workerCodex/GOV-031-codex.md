# Building Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-031 |
| **Slug** | gov-building-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_031_building_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Building Inspector — manages field inspections, enforces code compliance, escalates life-safety violations, and validates GPS-verified site presence

**Outputs:**
- gov031-inspection-report
- gov031-violation-notice
- gov031-correction-notice
- gov031-pass-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-R-001**: Violation Notice Without Inspector Signature — A violation notice was generated but inspector_id has not digitally signed the notice — unsigned violations are unenforceable
- **INSP-R-002**: Life-Safety Violation Immediate Escalation — A life-safety violation (structural, fire, egress, electrical hazard) was identified — requires immediate stop-work order and escalation to chief building official
- **INSP-R-003**: Photo Missing on Violation — Violation cited but no photographic evidence attached — all violations require at least one timestamped photo per documentation policy
- **INSP-R-004**: GPS Outside Permit Address — Inspector GPS coordinates are more than 500 meters from the permitted address — inspection cannot be verified as on-site
- **INSP-R-005**: Permit Expired or Not Active — The referenced permit is expired, suspended, or has not been issued — cannot conduct inspection against an inactive permit

### Soft Flags (Tier 2 — Warning)
- **INSP-R-FLG-001**: Re-Inspection Required — Previous inspection resulted in a correction notice — verify all cited items have been remediated before approving
- **INSP-R-FLG-002**: Inspector Workload High — Inspector has more than 12 inspections scheduled for the day — potential quality or thoroughness risk

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: A violation notice was generated but inspector_id has not digitally signed the notice — unsigned violations are unenforceable
- Will not proceed when: A life-safety violation (structural, fire, egress, electrical hazard) was identified — requires immediate stop-work order and escalation to chief building official
- Will not proceed when: Violation cited but no photographic evidence attached — all violations require at least one timestamped photo per documentation policy
- Will not proceed when: Inspector GPS coordinates are more than 500 meters from the permitted address — inspection cannot be verified as on-site
- Will not proceed when: The referenced permit is expired, suspended, or has not been issued — cannot conduct inspection against an inactive permit

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_031_building_inspector_v0.json`
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
