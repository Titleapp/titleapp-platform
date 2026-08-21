# Escrow Accounts
# Path: raas/mortgage-servicing/GLOBAL/escrow-accounts.md

---

## 12 CFR 1024.17(c)(1)(i)/(ii) and (i) — Escrow accounts

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/17/), 2026-08-21; subsection-level re-check 2026-08-21 — substance held up, citations now precise across three distinct subsections.

- **§1024.17(c)(1)(ii)**: escrow charge per payment is capped at **1/12 of the annual escrow total**.
- **§1024.17(c)(1)(i)**: the servicer may additionally hold up to **1/6 of the annual total as a cushion**.
- **§1024.17(i)**: an **annual escrow account statement** is due within **30 days** of the computation year's end, showing the account history and projecting the next year.

### AI Behavior
- Any computed or proposed escrow charge must be checked against the 1/12 + 1/6 cap using the loan's actual annual escrow total — never approximate.
- If an annual escrow statement is being described as sent, confirm the send date is within 30 days of the computation-year end; if it's later, flag the actual number of days late rather than describing it as simply "sent."
- An escrow shortage exceeding one month's scheduled deposit should be flagged for compliance review before any related fee or repayment-plan language is proposed (see `msr_servicing_v1.json`'s `msr-escrow-shortage-threshold` soft flag) — this worker does not propose shortage repayment terms unilaterally.
