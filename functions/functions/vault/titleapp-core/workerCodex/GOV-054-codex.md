# Redaction and Privacy — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-054 |
| **Slug** | gov-redaction-privacy |
| **Vertical** | government |
| **RAAS Ruleset** | gov_054_redaction_privacy_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Redaction and Privacy — manages PII redaction requests, SSN/DOB removal from recorded documents, and address confidentiality program compliance

**Outputs:**
- gov054-redaction-confirmation
- gov054-redacted-document
- gov054-audit-log
- gov054-denial-notice

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-RP-001**: No Legal Authority for Redaction — Requestor has not cited a valid statutory or court-ordered authority for redacting information from the public record
- **REC-RP-002**: Redaction Would Remove Material Terms — Proposed redaction would remove material terms of the recorded document (legal description, parties, consideration) — exceeds permissible scope

### Soft Flags (Tier 2 — Warning)
- **REC-RP-FLG-001**: Bulk Redaction Request — Request covers more than 10 documents — may require supervisory approval and extended processing time

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Requestor has not cited a valid statutory or court-ordered authority for redacting information from the public record
- Will not proceed when: Proposed redaction would remove material terms of the recorded document (legal description, parties, consideration) — exceeds permissible scope

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- request_type
- document_instrument_number
- pii_to_redact
- requestor_name
- legal_authority

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_054_redaction_privacy_v0.json`
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
