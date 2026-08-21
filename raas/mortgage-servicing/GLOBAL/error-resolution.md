# Error Resolution — Notices of Error & Requests for Information
# Path: raas/mortgage-servicing/GLOBAL/error-resolution.md

---

## 12 CFR 1024.35 — Notice of Error (NOE)

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/35/), 2026-08-21, re-verified at subsection level 2026-08-21 after a red-team pass caught the first version of this doc treating this as one flat deadline. It is not.

- **Acknowledgment — §1024.35(d)**: 5 business days, one deadline regardless of error category.
- **Substantive response — §1024.35(e)(3)(i) — three separate deadlines depending on error category, not one:**
  1. **7 business days** — payoff-balance errors (the §1024.35(b)(6) category).
  2. **30 business days, or before a scheduled foreclosure sale, whichever is earlier** — foreclosure-related errors (the §1024.35(b)(9)/(10) categories).
  3. **30 business days** — every other error category.
- The 15-day extension (**§1024.35(e)(3)(ii)**) applies **only to the 30-business-day general category** — it does not extend the 7-day payoff-balance deadline or the foreclosure-sale-linked deadline.

### AI Behavior
- On NOE intake, first classify the error category (payoff-balance vs. foreclosure-related vs. general) — the substantive-response deadline depends entirely on this classification. Never apply the 30-day default without confirming the category isn't one of the two faster tracks.
- If category is unclear from the record, say so explicitly rather than defaulting to 30 days — defaulting to the slower deadline when a 7-day one actually applies is itself a compliance failure.
- Only apply the 15-day extension to the general (30-day) category.

## 12 CFR 1024.36 — Request for Information (RFI)

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/36/), 2026-08-21, re-verified at subsection level 2026-08-21 — same correction as above: not one flat deadline.

- **Acknowledgment — §1024.36(c)**: 5 business days.
- **Substantive response — two tiers, not one:**
  1. **§1024.36(d)(2)(i)(A) — 10 business days**, for a request specifically identifying the loan's current owner or assignee.
  2. **§1024.36(d)(2)(i)(B) — 30 business days**, for general requests.
- Extension (**§1024.36(d)(2)(ii)**): 15 more days, applies to the 30-day tier only — the extension notice must be sent to the borrower **before the original 30-day period ends**, not after.

### AI Behavior
- On RFI intake, first classify: is this an owner/assignee-identity request (10 days) or a general request (30 days)? Defaulting every RFI to 30 days will miss the faster owner/assignee track.
- If a 15-day extension is being used, confirm the extension notice was (or will be) sent before the original 30-business-day deadline — an extension notice sent after the deadline has already passed does not comply. The 10-day tier has no extension provision in this ruleset's verified citations.
- Flag any NOE/RFI within 3 business days of its actual applicable response deadline with no response logged (see `msr_servicing_v1.json`'s `msr-noe-deadline-approaching` soft flag) — computed from the correct tier, not a blanket 30 days.
- Never state a response deadline without both the received date and the error/request category it was computed from being present in the record.
