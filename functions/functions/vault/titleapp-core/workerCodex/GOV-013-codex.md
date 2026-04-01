# DMV Fraud Detection — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-013 |
| **Slug** | gov-fraud-detection |
| **Vertical** | government |
| **RAAS Ruleset** | gov_013_fraud_detection_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

DMV Fraud Detection — identifies suspicious patterns in title applications, registration renewals, and identity documents to flag potential fraud for investigation

**Outputs:**
- gov013-fraud-alert
- gov013-risk-assessment-report
- gov013-investigation-referral

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-FD-001**: Identity Document Forgery Detected — Document authentication analysis indicates forgery or alteration of identity documents — transaction blocked and referred to investigations unit
- **DMV-FD-002**: SSN Already Associated with Different Identity — Social Security number provided is already associated with a different verified identity in the system — potential identity theft
- **DMV-FD-003**: Known Fraud Ring Pattern — Transaction matches a known fraud ring pattern (shared address, sequential applications, linked applicants) — immediate hold for review

### Soft Flags (Tier 2 — Warning)
- **DMV-FD-FLG-001**: Elevated Risk Score — Transaction risk score exceeds normal threshold — flag for manual review before processing
- **DMV-FD-FLG-002**: Rapid Title Transfers — Vehicle has changed hands 3 or more times in the past 12 months — possible title washing or curbstoning

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Document authentication analysis indicates forgery or alteration of identity documents — transaction blocked and referred to investigations unit
- Will not proceed when: Social Security number provided is already associated with a different verified identity in the system — potential identity theft
- Will not proceed when: Transaction matches a known fraud ring pattern (shared address, sequential applications, linked applicants) — immediate hold for review

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- transaction_id
- transaction_type
- applicant_data
- document_scans
- risk_signals

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_013_fraud_detection_v0.json`
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
