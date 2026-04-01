# UCC Filing — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-045 |
| **Slug** | gov-ucc-filing |
| **Vertical** | government |
| **RAAS Ruleset** | gov_045_ucc_filing_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

UCC Filing — processes Uniform Commercial Code financing statements, amendments, continuations, and terminations for secured transactions

**Outputs:**
- gov045-ucc-filing-receipt
- gov045-filing-number
- gov045-search-report
- gov045-lapse-reminder

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-UCC-001**: Debtor Name Does Not Meet Exact Match Standard — Debtor name on UCC filing does not conform to the state's exact match search logic standard — filing may be ineffective to perfect the security interest
- **REC-UCC-002**: Continuation Filed After Lapse — UCC continuation statement filed after the original filing has lapsed (past the 5-year term) — continuation is ineffective, must file new financing statement
- **REC-UCC-003**: Filing Fee Not Collected — UCC filing fee has not been collected — Secretary of State / Recorder cannot accept filing without payment

### Soft Flags (Tier 2 — Warning)
- **REC-UCC-FLG-001**: Approaching Lapse Date — UCC filing is within 6 months of the 5-year lapse date — secured party should consider filing a continuation statement

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Debtor name on UCC filing does not conform to the state's exact match search logic standard — filing may be ineffective to perfect the security interest
- Will not proceed when: UCC continuation statement filed after the original filing has lapsed (past the 5-year term) — continuation is ineffective, must file new financing statement
- Will not proceed when: UCC filing fee has not been collected — Secretary of State / Recorder cannot accept filing without payment

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- filing_type
- debtor_name
- secured_party
- collateral_description
- document_file_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_045_ucc_filing_v0.json`
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
