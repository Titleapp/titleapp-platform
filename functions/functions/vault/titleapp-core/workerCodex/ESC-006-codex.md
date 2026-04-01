# Closing Disclosure — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-006 |
| **Slug** | esc-closing-disclosure |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_006_closing_disclosure_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Closing Disclosure — generates and validates Closing Disclosure (CD) and HUD-1 settlement statements, enforces TRID tolerance checks, verifies proration accuracy, and blocks signing and disbursement when discrepancies exist.

**Outputs:**
- cd_id
- cd_type
- total_credits
- total_debits
- prorations
- balanced

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-CD-001**: CD Not Balanced Block Signing — Closing Disclosure does not balance — total credits and debits do not reconcile. Block signing until corrected.
- **ESC-CD-002**: TRID Tolerance Exceeded Regenerate Required — TILA-RESPA Integrated Disclosure tolerance limits exceeded — CD must be regenerated and a new 3-day waiting period may apply.
- **ESC-CD-003**: Settlement Not Signed By All Parties Block Disbursement — Settlement statement has not been signed by all required parties — block disbursement.

### Soft Flags (Tier 2 — Warning)
- **ESC-CD-FLG-001**: Proration Adjustment Large — Proration adjustment exceeds expected range — flag for review.
- **ESC-CD-FLG-002**: Closing Cost Above Estimate — One or more closing costs exceed the Loan Estimate by more than the allowed tolerance — flag for buyer notification.
- **ESC-CD-FLG-003**: Cash To Close Change — Cash to close amount has changed from the Loan Estimate — flag for buyer awareness.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Closing Disclosure does not balance — total credits and debits do not reconcile. Block signing until corrected.
- Will not proceed when: TILA-RESPA Integrated Disclosure tolerance limits exceeded — CD must be regenerated and a new 3-day waiting period may apply.
- Will not proceed when: Settlement statement has not been signed by all required parties — block disbursement.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- cd_type
- credits
- debits
- prorations

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_006_closing_disclosure_v0.json`
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
