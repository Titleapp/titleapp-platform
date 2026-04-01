# Environmental Review — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-021 |
| **Slug** | gov-environmental-review |
| **Vertical** | government |
| **RAAS Ruleset** | gov_021_environmental_review_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Environmental Review — manages NEPA/CEQA/SEPA compliance, wetland delineation, stormwater management, and endangered species consultation for development permits

**Outputs:**
- gov021-environmental-determination
- gov021-mitigation-measures
- gov021-stormwater-review
- gov021-permit-conditions

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-ER-001**: Environmental Impact Statement Required — Project triggers mandatory EIS/EIR threshold and no environmental impact statement has been filed — cannot proceed without environmental clearance
- **PERM-ER-002**: Wetlands Permit Not Obtained — Project impacts jurisdictional wetlands and no Section 404 permit has been obtained from Army Corps of Engineers
- **PERM-ER-003**: Endangered Species Consultation Required — Project area contains critical habitat for listed endangered/threatened species — Section 7 consultation with USFWS required before proceeding

### Soft Flags (Tier 2 — Warning)
- **PERM-ER-FLG-001**: Phase I ESA Recommended — Site history indicates potential environmental contamination — Phase I Environmental Site Assessment recommended before grading
- **PERM-ER-FLG-002**: Stormwater Permit Threshold — Disturbed area exceeds 1 acre — NPDES Construction General Permit (CGP) likely required

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Project triggers mandatory EIS/EIR threshold and no environmental impact statement has been filed — cannot proceed without environmental clearance
- Will not proceed when: Project impacts jurisdictional wetlands and no Section 404 permit has been obtained from Army Corps of Engineers
- Will not proceed when: Project area contains critical habitat for listed endangered/threatened species — Section 7 consultation with USFWS required before proceeding

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- parcel_number
- project_description
- project_acreage
- environmental_checklist
- stormwater_plan

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_021_environmental_review_v0.json`
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
