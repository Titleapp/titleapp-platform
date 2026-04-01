# ADA and Accessibility Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-039 |
| **Slug** | gov-ada-accessibility |
| **Vertical** | government |
| **RAAS Ruleset** | gov_039_ada_accessibility_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

ADA and Accessibility Inspector — verifies compliance with ADA, ABA, Fair Housing Act, and ICC A117.1 accessibility standards for new construction and alterations

**Outputs:**
- gov039-accessibility-inspection-report
- gov039-ada-compliance-checklist
- gov039-correction-notice
- gov039-pass-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-ADA-001**: Accessible Route Not Provided — No accessible route from public way to building entrance — ADA Title III violation and ICC A117.1 non-compliance
- **INSP-ADA-002**: Accessible Restroom Non-Compliant — Required accessible restroom does not meet clearance, grab bar, or fixture height requirements per ADA Standards
- **INSP-ADA-003**: Accessible Parking Not Provided — Required number of accessible parking spaces with proper signage, slope, and access aisle not provided

### Soft Flags (Tier 2 — Warning)
- **INSP-ADA-FLG-001**: Alteration Triggers Path of Travel Upgrade — Alteration cost exceeds 20% disproportionate cost threshold — path of travel accessibility upgrade may be required per 28 CFR 36.403

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: No accessible route from public way to building entrance — ADA Title III violation and ICC A117.1 non-compliance
- Will not proceed when: Required accessible restroom does not meet clearance, grab bar, or fixture height requirements per ADA Standards
- Will not proceed when: Required number of accessible parking spaces with proper signage, slope, and access aisle not provided

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- permit_number
- inspection_type
- inspector_id
- gps_coordinates
- accessibility_observations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_039_ada_accessibility_v0.json`
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
