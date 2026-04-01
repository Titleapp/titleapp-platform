# Subdivision Review — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-023 |
| **Slug** | gov-subdivision-review |
| **Vertical** | government |
| **RAAS Ruleset** | gov_023_subdivision_review_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Subdivision Review — reviews and processes preliminary and final plat applications, lot configurations, infrastructure dedications, and improvement agreements

**Outputs:**
- gov023-preliminary-plat-review
- gov023-final-plat-approval
- gov023-improvement-agreement
- gov023-infrastructure-checklist

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-SUB-001**: Plat Not Sealed by Licensed Surveyor — Subdivision plat does not bear the seal and signature of a licensed land surveyor — plat cannot be accepted
- **PERM-SUB-002**: Infrastructure Improvement Agreement Not Executed — Final plat submitted but the required infrastructure improvement agreement and surety have not been executed
- **PERM-SUB-003**: Utility Capacity Insufficient — Water, sewer, or electrical utility capacity is insufficient to serve the proposed number of lots — utility will-serve letters not obtained

### Soft Flags (Tier 2 — Warning)
- **PERM-SUB-FLG-001**: Large Subdivision Threshold — Subdivision exceeds 50 lots — may trigger traffic impact study and additional park land dedication requirements

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Subdivision plat does not bear the seal and signature of a licensed land surveyor — plat cannot be accepted
- Will not proceed when: Final plat submitted but the required infrastructure improvement agreement and surety have not been executed
- Will not proceed when: Water, sewer, or electrical utility capacity is insufficient to serve the proposed number of lots — utility will-serve letters not obtained

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- application_type
- parcel_number
- plat_document_id
- lot_count
- infrastructure_plan

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_023_subdivision_review_v0.json`
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
