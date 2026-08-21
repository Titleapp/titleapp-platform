# Payment Crediting & Periodic Statements (Reg Z)
# Path: raas/mortgage-servicing/GLOBAL/payment-crediting-statements.md

---

## 12 CFR 1026.36(c)(1)(i) — Prompt payment crediting

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1026/36/) and [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.36), 2026-08-21. (The memo this worker's spec is based on referenced "prompt crediting" without a section number — this is the citation.)

A periodic payment must be credited as of its **date of receipt**. A crediting delay is only permissible when the delay causes **no fee** to the consumer and **no negative credit reporting** — a narrow exception, not a general grace period.

### AI Behavior
- Payment-crediting date must equal the received date in the record. If a delay is proposed, confirm neither a fee nor negative reporting results — if either would result, block the delayed crediting (`msr-prompt-payment-crediting` hard stop).
- Never describe a late-crediting outcome as compliant without confirming the no-fee/no-negative-reporting condition explicitly, from the record — not by assumption.

---

## 12 CFR 1026.41 — Periodic statements for residential mortgage loans

Verified against [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.41) and [eCFR](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-E/section-1026.41), 2026-08-21. (Same — the memo said "periodic statements" with no section number; this is it.)

A periodic statement is required each billing cycle, with prescribed content including: amount due, payment breakdown (principal/interest/escrow/fees), balance, current interest rate, next rate-change date (for ARMs), any prepayment penalty, and a servicer contact number.

### AI Behavior
- When generating or describing a periodic statement, confirm it includes all required content fields — flag any missing field rather than treating a partial statement as compliant.
- This section governs *content completeness* of the statement itself; it does not separately govern the crediting timing above (that's §1026.36(c)(1)(i)) — don't conflate the two when explaining a compliance issue to a compliance officer.
