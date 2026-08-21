# Escrow Accounts
# Path: raas/mortgage-servicing/GLOBAL/escrow-accounts.md

---

## 12 CFR 1024.17(c)(1)(ii) and (i) — Escrow accounts

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/17/), 2026-08-21; subsection-level re-check 2026-08-21 — and a further self-caught correction after that: the cushion/monthly-cap subsection split was backwards in the previous version of this doc.

**§1024.17(c)(1)(i) is an at-settlement rule (initial escrow deposit cushion) — a different lifecycle stage than ongoing servicing, and not really this worker's scope.** The subsection that actually governs ongoing monthly servicing — what this worker checks — is **§1024.17(c)(1)(ii)** alone, which covers **both**:
- the monthly escrow charge, capped at **1/12 of the annual escrow total**, and
- the ongoing cushion, capped at **1/6 of the annual escrow total**.

**§1024.17(i)**: an **annual escrow account statement** is due within **30 days** of the computation year's end, showing the account history and projecting the next year.

### AI Behavior
- Any computed or proposed escrow charge must be checked against the 1/12 + 1/6 cap using the loan's actual annual escrow total — never approximate.
- If an annual escrow statement is being described as sent, confirm the send date is within 30 days of the computation-year end; if it's later, flag the actual number of days late rather than describing it as simply "sent."
- An escrow shortage exceeding one month's scheduled deposit should be flagged for compliance review before any related fee or repayment-plan language is proposed (see `msr_servicing_v1.json`'s `msr-escrow-shortage-threshold` soft flag) — this worker does not propose shortage repayment terms unilaterally.
