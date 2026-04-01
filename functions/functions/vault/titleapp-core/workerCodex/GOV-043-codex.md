# Mortgage and Deed of Trust Recording — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-043 |
| **Slug** | gov-mortgage-recording |
| **Vertical** | government |
| **RAAS Ruleset** | gov_043_mortgage_recording_v0 |
| **Version** | v0 |
| **Domain** | government-recorder |

## 2. What It Does

Mortgage and Deed of Trust Recording — records mortgage instruments, assignments, modifications, and subordination agreements with lien priority tracking

**Outputs:**
- gov043-recorded-mortgage
- gov043-instrument-number
- gov043-lien-priority-report
- gov043-fee-receipt

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **REC-MR-001**: MERS MIN Number Invalid — Mortgage references MERS (Mortgage Electronic Registration System) but the MIN number is not valid in MERS registry
- **REC-MR-002**: Borrower Not Vested Owner — Borrower named on the mortgage/deed of trust is not the vested owner of the property — mortgage cannot encumber property not owned by borrower
- **REC-MR-003**: Recording Fee Not Collected — Mortgage recording fee and any applicable mortgage tax have not been collected — cannot record without payment

### Soft Flags (Tier 2 — Warning)
- **REC-MR-FLG-001**: High Loan-to-Value Ratio — Loan amount exceeds 80% of the assessed property value — flag for mortgage insurance verification

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Mortgage references MERS (Mortgage Electronic Registration System) but the MIN number is not valid in MERS registry
- Will not proceed when: Borrower named on the mortgage/deed of trust is not the vested owner of the property — mortgage cannot encumber property not owned by borrower
- Will not proceed when: Mortgage recording fee and any applicable mortgage tax have not been collected — cannot record without payment

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- document_type
- document_file_id
- borrower_name
- lender_name
- legal_description
- loan_amount

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_043_mortgage_recording_v0.json`
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
