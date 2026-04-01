# The Escrow Locker — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-001 |
| **Slug** | esc-escrow-locker |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_001_escrow_locker_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

The Escrow Locker — manages the full lifecycle of an escrow transaction from offer acceptance through disbursement and recording. Enforces identity verification, wire security, condition satisfaction, and audit retention across all parties and stages.

**Outputs:**
- locker_id
- escrow_number
- stage
- stage_name
- conditions_status
- sealing_hash
- audit_trail

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-HS-001**: Identity Verified All Parties — No Locker stage advances without all parties identity-verified. OFAC hit = immediate freeze.
- **ESC-HS-002**: Offer Chain Required — Locker cannot open on standalone PA. Offer chain required or exception attestation logged.
- **ESC-HS-003**: Bank Account Verified Before Disbursement — All disbursement accounts verified via Stripe Financial Connections.
- **ESC-HS-004**: Wire Callback Required — Outbound wire verified via callback to number on file from original agreement.
- **ESC-HS-005**: Wire Change Hold — Any change to wire instructions triggers automatic hold and human auth.
- **ESC-HS-006**: No Disbursement Before Conditions — No disbursement until all conditions marked SATISFIED.
- **ESC-HS-007**: Notarization Before Recording — No recording without all notarization confirmed.
- **ESC-HS-008**: No DTC Transfer Before Recording — DTC transfer requires recording confirmation number.
- **ESC-HS-009**: No Commingling — EMD and closing funds in separate sub-accounts.
- **ESC-HS-010**: Human In Loop At Disbursement — Human must confirm all disbursements.
- **ESC-HS-011**: Seven Year Retention — All Locker records retained 7 years.
- **ESC-HS-012**: PII Masked In Logs — SSN, EIN, account numbers masked in audit log.

### Soft Flags (Tier 2 — Warning)
- **ESC-HS-FLG-001**: Stage Transition Delay — More than 5 days between stages — flag for review.
- **ESC-HS-FLG-002**: Condition Deadline Approaching — Less than 3 days until condition deadline — flag for urgency.
- **ESC-HS-FLG-003**: Multiple Counter Offers — More than 3 counter offers — flag for negotiation complexity.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: No Locker stage advances without all parties identity-verified. OFAC hit = immediate freeze.
- Will not proceed when: Locker cannot open on standalone PA. Offer chain required or exception attestation logged.
- Will not proceed when: All disbursement accounts verified via Stripe Financial Connections.
- Will not proceed when: Outbound wire verified via callback to number on file from original agreement.
- Will not proceed when: Any change to wire instructions triggers automatic hold and human auth.
- Will not proceed when: No disbursement until all conditions marked SATISFIED.
- Will not proceed when: No recording without all notarization confirmed.
- Will not proceed when: DTC transfer requires recording confirmation number.
- Will not proceed when: EMD and closing funds in separate sub-accounts.
- Will not proceed when: Human must confirm all disbursements.
- Will not proceed when: All Locker records retained 7 years.
- Will not proceed when: SSN, EIN, account numbers masked in audit log.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- asset_id
- asset_type
- buyer_id
- seller_id
- offer_amount
- purchase_agreement
- parties
- conditions

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_001_escrow_locker_v0.json`
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
