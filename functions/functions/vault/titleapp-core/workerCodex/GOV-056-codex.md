# Document Preservation and Digitization — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-056 |
| **Slug** | gov-document-preservation |
| **Vertical** | government |
| **RAAS Ruleset** | gov_056_document_preservation_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Document Preservation and Digitization — manages document scanning, indexing, microfilm/digital conversion, and long-term archival of recorded instruments

**Outputs:**
- gov056-scan-batch-report
- gov056-quality-audit
- gov056-index-verification
- gov056-preservation-certificate

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-DP-001**: Image Quality Below Standard — Scanned image resolution or legibility falls below the minimum archival standard (300 DPI, ISO 19005 PDF/A) — rescan required
- **REC-DP-002**: Index Data Missing — Scanned document does not have complete index data (instrument number, recording date, document type, parties) — cannot be added to searchable archive

### Soft Flags (Tier 2 — Warning)
- **REC-DP-FLG-001**: Deteriorating Source Document — Original document shows signs of deterioration (fading ink, brittleness, water damage) — prioritize preservation scanning

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Scanned image resolution or legibility falls below the minimum archival standard (300 DPI, ISO 19005 PDF/A) — rescan required
- Will not proceed when: Scanned document does not have complete index data (instrument number, recording date, document type, parties) — cannot be added to searchable archive

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- batch_id
- source_format
- date_range
- book_page_range
- quality_standard

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_056_document_preservation_v0.json`
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
