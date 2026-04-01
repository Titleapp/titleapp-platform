# Title Search and Commitment — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-003 |
| **Slug** | esc-title-search-commitment |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_003_title_search_commitment_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Title Search and Commitment — processes title searches, classifies exceptions in Schedule B, identifies deal-killer defects, tracks curative actions, and produces commitment documents for underwriting.

**Outputs:**
- search_id
- schedule_a
- schedule_b1
- schedule_b2
- exception_classifications
- curative_actions

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-TS-001**: Deal-Killer Exception Block Closing — Title search reveals a deal-killer exception (e.g., unresolvable cloud on title) — block closing until resolved or waived by underwriter.
- **ESC-TS-002**: Curative Item Unresolved Block Recording — One or more curative items remain unresolved — block recording until all curative actions are completed.
- **ESC-TS-003**: Title Not Clear Block Disbursement — Title has not been cleared by the title officer — block disbursement until clear title is confirmed.

### Soft Flags (Tier 2 — Warning)
- **ESC-TS-FLG-001**: Non-Standard Exception — Title search contains a non-standard exception that may require additional endorsement or underwriter review.
- **ESC-TS-FLG-002**: Endorsement Recommended — Title officer recommends an additional endorsement to address a specific exception.
- **ESC-TS-FLG-003**: Chain of Title Gap — A gap exists in the chain of title — may require affidavit or quiet title action.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Title search reveals a deal-killer exception (e.g., unresolvable cloud on title) — block closing until resolved or waived by underwriter.
- Will not proceed when: One or more curative items remain unresolved — block recording until all curative actions are completed.
- Will not proceed when: Title has not been cleared by the title officer — block disbursement until clear title is confirmed.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- property_address
- search_type

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_003_title_search_commitment_v0.json`
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
