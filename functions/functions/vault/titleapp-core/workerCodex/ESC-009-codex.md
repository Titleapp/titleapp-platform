# HOA Estoppel — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-009 |
| **Slug** | esc-hoa-estoppel |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_009_hoa_estoppel_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

HOA Estoppel — requests and processes HOA estoppel certificates, tracks unpaid dues and special assessments, monitors transfer fees, and blocks closing when outstanding HOA obligations or pending litigation exist.

**Outputs:**
- estoppel_id
- certificate_status
- unpaid_dues
- special_assessments
- transfer_fee

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-HE-001**: Estoppel Not Received Condition Outstanding — HOA estoppel certificate has not been received — condition remains outstanding and cannot be cleared.
- **ESC-HE-002**: Unpaid Special Assessment Block Closing — Unpaid special assessment identified on estoppel — block closing until resolved or credited on settlement statement.
- **ESC-HE-003**: Pending HOA Litigation Flag For Review — HOA has pending litigation disclosed on estoppel — flag for title review and underwriter assessment.

### Soft Flags (Tier 2 — Warning)
- **ESC-HE-FLG-001**: High Transfer Fee — HOA transfer fee exceeds typical range — flag for buyer awareness.
- **ESC-HE-FLG-002**: Special Assessment Pending — HOA has a pending special assessment that may be levied post-closing — flag for buyer disclosure.
- **ESC-HE-FLG-003**: HOA Financial Concern — HOA financials indicate low reserves or budget shortfall — flag for buyer awareness.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: HOA estoppel certificate has not been received — condition remains outstanding and cannot be cleared.
- Will not proceed when: Unpaid special assessment identified on estoppel — block closing until resolved or credited on settlement statement.
- Will not proceed when: HOA has pending litigation disclosed on estoppel — flag for title review and underwriter assessment.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- hoa_name

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_009_hoa_estoppel_v0.json`
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
