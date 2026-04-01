# Title Search — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-050 |
| **Slug** | gov-title-search |
| **Vertical** | government |
| **RAAS Ruleset** | gov_050_title_search_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Title Search — conducts grantor/grantee index searches, builds chain of title, identifies encumbrances, and generates title abstracts from recorded documents

**Outputs:**
- gov050-title-abstract
- gov050-chain-of-title
- gov050-encumbrance-list
- gov050-search-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-TS-001**: Parcel Number Not Found — Parcel number does not exist in the assessor/recorder index — cannot perform search on non-existent parcel
- **REC-TS-002**: Index Gap Detected — Gap detected in the grantor/grantee index for the search period — title chain cannot be certified as complete

### Soft Flags (Tier 2 — Warning)
- **REC-TS-FLG-001**: Unreleased Liens Found — One or more liens on the property appear to be satisfied but have no recorded release — may require curative action
- **REC-TS-FLG-002**: Probate Conveyance in Chain — Chain of title includes a probate conveyance — verify court order and Letters Testamentary are on file

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Parcel number does not exist in the assessor/recorder index — cannot perform search on non-existent parcel
- Will not proceed when: Gap detected in the grantor/grantee index for the search period — title chain cannot be certified as complete

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- search_type
- parcel_number
- search_period_years
- requestor_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_050_title_search_v0.json`
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
