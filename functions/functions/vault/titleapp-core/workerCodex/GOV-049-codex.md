# eRecording Gateway — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-049 |
| **Slug** | gov-erecording-gateway |
| **Vertical** | government |
| **RAAS Ruleset** | gov_049_erecording_gateway_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

eRecording Gateway — manages electronic recording submissions from title companies and law firms via PRIA/URPERA standards, validates digital signatures and document formatting

**Outputs:**
- gov049-erecording-receipt
- gov049-pria-acknowledgment
- gov049-rejection-notice
- gov049-instrument-numbers

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-ER-001**: Submitter Not Authorized — eRecording submitter is not registered or has been suspended from the jurisdiction's eRecording portal — submission rejected
- **REC-ER-002**: Digital Signature Invalid — Digital signature on the document package does not validate or the signing certificate has been revoked — cannot accept submission
- **REC-ER-003**: Document Format Non-Compliant — Submitted document does not meet PRIA formatting requirements (page size, margins, font legibility, image resolution)

### Soft Flags (Tier 2 — Warning)
- **REC-ER-FLG-001**: High Volume Submitter — Submitter has sent more than 50 documents today — verify system capacity and submitter account status

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: eRecording submitter is not registered or has been suspended from the jurisdiction's eRecording portal — submission rejected
- Will not proceed when: Digital signature on the document package does not validate or the signing certificate has been revoked — cannot accept submission
- Will not proceed when: Submitted document does not meet PRIA formatting requirements (page size, margins, font legibility, image resolution)

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- submitter_id
- document_package
- digital_signature
- pria_version
- payment_method

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_049_erecording_gateway_v0.json`
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
