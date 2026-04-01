# Salvage and Rebuilt Title — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-008 |
| **Slug** | gov-salvage-rebuilt-title |
| **Vertical** | government |
| **RAAS Ruleset** | gov_008_salvage_rebuilt_title_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Salvage and Rebuilt Title — processes branded title applications for salvage, rebuilt, and flood-damaged vehicles with enhanced inspection requirements

**Outputs:**
- gov008-branded-title-certificate
- gov008-rebuild-inspection-report
- gov008-parts-audit-trail

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-SR-001**: Rebuild Inspection Not Completed — Vehicle has not passed a state-authorized rebuild inspection — rebuilt title cannot be issued without certified inspection
- **DMV-SR-002**: Stolen Parts Identified — One or more replacement parts VINs or serial numbers match NCIC stolen parts database — law enforcement referral required
- **DMV-SR-003**: Anti-Theft Inspection Failed — Vehicle failed the anti-theft component verification — VIN plates, major component labels, or federal safety certification label discrepancies found

### Soft Flags (Tier 2 — Warning)
- **DMV-SR-FLG-001**: Flood Damage Brand from Another State — Vehicle has a flood damage brand from another jurisdiction — verify all electrical and safety systems were inspected during rebuild
- **DMV-SR-FLG-002**: High Repair Cost Ratio — Documented repair costs exceed 90% of pre-loss value — additional structural integrity inspection recommended

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Vehicle has not passed a state-authorized rebuild inspection — rebuilt title cannot be issued without certified inspection
- Will not proceed when: One or more replacement parts VINs or serial numbers match NCIC stolen parts database — law enforcement referral required
- Will not proceed when: Vehicle failed the anti-theft component verification — VIN plates, major component labels, or federal safety certification label discrepancies found

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- vin
- brand_type
- insurance_claim_id
- rebuild_inspection_report
- photos
- parts_receipts

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_008_salvage_rebuilt_title_v0.json`
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
