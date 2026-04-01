# DMV Correspondence — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-011 |
| **Slug** | gov-dmv-correspondence |
| **Vertical** | government |
| **RAAS Ruleset** | gov_011_dmv_correspondence_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

DMV Correspondence — manages automated and manual communications including suspension notices, renewal reminders, and hearing notifications

**Outputs:**
- gov011-correspondence-log
- gov011-notice-pdf
- gov011-delivery-confirmation

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-CO-001**: Legal Notice Missing Required Elements — Legal/suspension notice is missing required statutory elements (hearing rights, appeal deadline, statutory citation) — cannot send deficient notice
- **DMV-CO-002**: Address Not Verified — Recipient mailing address has not been verified through USPS CASS/NCOA — certified mail notices require valid address

### Soft Flags (Tier 2 — Warning)
- **DMV-CO-FLG-001**: Prior Mail Returned — Previous correspondence to this recipient was returned as undeliverable — consider alternate delivery method

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Legal/suspension notice is missing required statutory elements (hearing rights, appeal deadline, statutory citation) — cannot send deficient notice
- Will not proceed when: Recipient mailing address has not been verified through USPS CASS/NCOA — certified mail notices require valid address

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- correspondence_type
- recipient_id
- subject_matter
- delivery_method

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_011_dmv_correspondence_v0.json`
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
