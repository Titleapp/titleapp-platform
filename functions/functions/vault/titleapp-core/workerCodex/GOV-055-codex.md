# GIS and Parcel Mapping — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-055 |
| **Slug** | gov-gis-parcel-mapping |
| **Vertical** | government |
| **RAAS Ruleset** | gov_055_gis_parcel_mapping_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

GIS and Parcel Mapping — maintains parcel boundary data, processes splits and merges, updates GIS layers from recorded plats, and manages spatial data integrity

**Outputs:**
- gov055-parcel-map-update
- gov055-gis-layer-changelog
- gov055-assessor-parcel-notification
- gov055-topology-report

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-GIS-001**: Geometry Topology Error — Proposed parcel boundary creates a topology error (overlap, gap, self-intersection) in the parcel fabric — cannot update GIS layer
- **REC-GIS-002**: No Recorded Source Document — Parcel boundary change has no corresponding recorded instrument (plat, lot line adjustment, court order) — GIS cannot be updated without legal basis

### Soft Flags (Tier 2 — Warning)
- **REC-GIS-FLG-001**: Area Discrepancy — Calculated parcel area differs by more than 5% from the legal description acreage — verify survey data
- **REC-GIS-FLG-002**: Adjacent Parcel Notification — Boundary change affects shared boundary with adjacent parcels — notify adjacent parcel owners and assessor

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Proposed parcel boundary creates a topology error (overlap, gap, self-intersection) in the parcel fabric — cannot update GIS layer
- Will not proceed when: Parcel boundary change has no corresponding recorded instrument (plat, lot line adjustment, court order) — GIS cannot be updated without legal basis

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- action_type
- parcel_numbers
- source_document_instrument
- geometry_data
- effective_date

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_055_gis_parcel_mapping_v0.json`
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
