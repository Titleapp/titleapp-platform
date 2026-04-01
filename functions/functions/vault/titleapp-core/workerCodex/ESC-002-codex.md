# Wire Fraud Prevention — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-002 |
| **Slug** | esc-wire-fraud-prevention |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_002_wire_fraud_prevention_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Wire Fraud Prevention — validates wire instructions, detects domain mismatches, enforces callback verification, and flags suspicious patterns before any funds are disbursed.

**Outputs:**
- check_id
- status
- risk_flags
- callback_confirmed

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-WF-001**: Wire Instruction Change Hold — Any change to wire instructions triggers automatic hold and requires human authorization before proceeding.
- **ESC-WF-002**: Domain Mismatch Hold — Email domain on wire instructions does not match known party domain — hold for manual verification.
- **ESC-WF-003**: No Callback Phone Block — No callback phone number on file — block wire processing until callback number is provided.
- **ESC-WF-004**: Callback Not Confirmed Block Disbursement — Callback to verified phone number has not been confirmed — block disbursement.

### Soft Flags (Tier 2 — Warning)
- **ESC-WF-FLG-001**: New Bank Institution — Wire instructions reference a bank institution not previously seen for this party — flag for enhanced review.
- **ESC-WF-FLG-002**: International Wire — Wire is routed internationally — flag for OFAC screening and additional compliance checks.
- **ESC-WF-FLG-003**: Rush Request — Party has requested expedited wire processing — flag for heightened scrutiny.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Any change to wire instructions triggers automatic hold and requires human authorization before proceeding.
- Will not proceed when: Email domain on wire instructions does not match known party domain — hold for manual verification.
- Will not proceed when: No callback phone number on file — block wire processing until callback number is provided.
- Will not proceed when: Callback to verified phone number has not been confirmed — block disbursement.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- wire_instructions
- callback_phone

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_002_wire_fraud_prevention_v0.json`
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
