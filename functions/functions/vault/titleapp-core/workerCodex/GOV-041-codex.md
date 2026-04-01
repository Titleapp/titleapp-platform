# Document Recording — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-041 |
| **Slug** | gov-document-recording |
| **Vertical** | government |
| **RAAS Ruleset** | gov_041_document_recording_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Document Recording — validates and records deeds, mortgages, liens, and other instruments against the official land record with hash integrity and notarization verification

**Outputs:**
- gov041-recording-receipt
- gov041-instrument-number
- gov041-chain-of-title-update
- gov041-fee-receipt

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-R-001**: SHA-256 Hash Mismatch — Computed SHA-256 hash of the uploaded document does not match the declared document_hash — document may have been tampered with in transit
- **REC-R-002**: Grantor Not Current Vested Owner — Grantor name does not match the current vested owner in the chain of title — conveyance by non-owner is void
- **REC-R-003**: Notarization Missing or Expired — Document requires notarization but no valid notary acknowledgment is present, or the notary commission has expired
- **REC-R-004**: Remote Online Notarization in Restricted State — Document was notarized via RON but the recording jurisdiction does not accept remote online notarization — must be re-notarized in person
- **REC-R-005**: Recording Fee Not Collected — Recording fee has not been collected or payment has not been confirmed — document cannot be accepted for recording without payment
- **REC-R-006**: Lien Release by Non-Lienholder — Lien release or satisfaction document was executed by a party that is not the recorded lienholder — release is invalid

### Soft Flags (Tier 2 — Warning)
- **REC-R-FLG-001**: Multiple Documents Same Parcel Same Day — More than one recording submitted for the same parcel within 24 hours — verify recording order priority
- **REC-R-FLG-002**: Transfer Tax May Apply — Document type is a deed and consideration exceeds the transfer tax exemption threshold — verify transfer tax payment

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Computed SHA-256 hash of the uploaded document does not match the declared document_hash — document may have been tampered with in transit
- Will not proceed when: Grantor name does not match the current vested owner in the chain of title — conveyance by non-owner is void
- Will not proceed when: Document requires notarization but no valid notary acknowledgment is present, or the notary commission has expired
- Will not proceed when: Document was notarized via RON but the recording jurisdiction does not accept remote online notarization — must be re-notarized in person
- Will not proceed when: Recording fee has not been collected or payment has not been confirmed — document cannot be accepted for recording without payment
- Will not proceed when: Lien release or satisfaction document was executed by a party that is not the recorded lienholder — release is invalid

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- document_type
- document_file_id
- document_hash
- grantor
- grantee
- legal_description

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_041_document_recording_v0.json`
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
