# Fleet Registration — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-009 |
| **Slug** | gov-fleet-registration |
| **Vertical** | government |
| **RAAS Ruleset** | gov_009_fleet_registration_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

Fleet Registration — processes bulk vehicle registration for government and commercial fleets, IRP/IFTA compliance, and apportioned plates

**Outputs:**
- gov009-fleet-registration-manifest
- gov009-irp-cab-cards
- gov009-apportioned-plate-schedule

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-FR-001**: IRP Account Not in Good Standing — International Registration Plan account has outstanding balances or suspended status — fleet registration blocked
- **DMV-FR-002**: USDOT Number Invalid — Fleet USDOT number is inactive, revoked, or not found in FMCSA SAFER database — commercial fleet registration requires active authority
- **DMV-FR-003**: Insurance Below Federal Minimum — Fleet liability insurance is below FMCSA minimum financial responsibility requirements (49 CFR 387)

### Soft Flags (Tier 2 — Warning)
- **DMV-FR-FLG-001**: Large Fleet Discount Eligible — Fleet has more than 50 vehicles — may qualify for bulk registration discount program

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: International Registration Plan account has outstanding balances or suspended status — fleet registration blocked
- Will not proceed when: Fleet USDOT number is inactive, revoked, or not found in FMCSA SAFER database — commercial fleet registration requires active authority
- Will not proceed when: Fleet liability insurance is below FMCSA minimum financial responsibility requirements (49 CFR 387)

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- fleet_id
- organization_name
- vehicle_list
- irp_account_number
- base_jurisdiction

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_009_fleet_registration_v0.json`
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
