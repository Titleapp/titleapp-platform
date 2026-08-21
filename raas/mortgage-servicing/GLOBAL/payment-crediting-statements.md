# Payment Crediting & Periodic Statements (Reg Z)
# Path: raas/mortgage-servicing/GLOBAL/payment-crediting-statements.md

---

## 12 CFR 1026.36(c)(1)(i) — Prompt payment crediting

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1026/36/) and [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.36), 2026-08-21, re-confirmed verbatim on a subsection-level re-check 2026-08-21. (The memo this worker's spec is based on referenced "prompt crediting" without a section number — this is the citation.)

A periodic payment must be credited as of its **date of receipt**. A crediting delay is only permissible when the delay causes **no fee** to the consumer and **no negative credit reporting** — a narrow exception, not a general grace period. §1026.36(c)(1)(iii) has a further partial-payment handling exception not yet reflected in the ruleset — flagged, minor, optional addition.

### AI Behavior
- Payment-crediting date must equal the received date in the record. If a delay is proposed, confirm neither a fee nor negative reporting results — if either would result, block the delayed crediting (`msr-prompt-payment-crediting` hard stop; as of this pass, "block" is a prompt instruction, not a server-side mechanical block — CODEX S52.60 §3.1).
- Never describe a late-crediting outcome as compliant without confirming the no-fee/no-negative-reporting condition explicitly, from the record — not by assumption.

---

## 12 CFR 1026.41(d)(1)-(8) — Periodic statements for residential mortgage loans

Verified against [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.41) and [eCFR](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-E/section-1026.41), 2026-08-21; subsection-level re-check 2026-08-21 found a real gap in the first pass — see below. (The memo said "periodic statements" with no section number; this is it.)

A periodic statement is required each billing cycle, with 8 independently-numbered content requirements, (d)(1) through (d)(8): amount due, explanation of amount due, past-payment breakdown, transaction activity, partial-payment information, servicer contact information, account information, and delinquency information. **(d)(8) — the delinquency-specific content — is conditional, not standard: it's only required once the borrower is more than 45 days delinquent.** The first pass of this doc listed content requirements as if they were all standard fields on every statement, which is wrong for (d)(8) specifically.

### AI Behavior
- When generating or describing a periodic statement, confirm it includes (d)(1)-(7) always, and (d)(8) only when the loan is currently more than 45 days delinquent — describing (d)(8) content as required (or, separately, as absent-and-therefore-noncompliant) on a current or lightly-delinquent loan is itself the error this rule exists to prevent.
- Flag any missing field rather than treating a partial statement as compliant, but check delinquency status before flagging (d)(8) as missing.
- This section governs *content completeness* of the statement itself; it does not separately govern the crediting timing above (that's §1026.36(c)(1)(i)) — don't conflate the two when explaining a compliance issue to a compliance officer.
