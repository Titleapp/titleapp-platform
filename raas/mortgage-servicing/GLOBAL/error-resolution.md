# Error Resolution — Notices of Error & Requests for Information
# Path: raas/mortgage-servicing/GLOBAL/error-resolution.md

---

## 12 CFR 1024.35 — Notice of Error (NOE)

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/35/), 2026-08-21.

- Servicer must **acknowledge** receipt of a written Notice of Error within **5 business days**.
- Substantive response generally due within **30 business days** of receipt (some error categories have different timing — confirm the specific category before stating a deadline).

## 12 CFR 1024.36 — Request for Information (RFI)

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/36/), 2026-08-21.

- Same **5-business-day** acknowledgment requirement.
- Up to **30 business days** to respond, **extendable by 15 more days** — but the extension notice must be sent to the borrower **before the original 30-day period ends**, not after.

### AI Behavior
- On intake of a NOE or RFI, compute both the acknowledgment deadline (received date + 5 business days) and the substantive-response deadline (received date + 30 business days) from the actual received date in the record.
- If a 15-day extension is being used for an RFI, confirm the extension notice was (or will be) sent before the original 30-business-day deadline — an extension notice sent after the original deadline has already passed does not comply.
- Flag any NOE/RFI within 3 business days of its response deadline with no response logged (see `msr_servicing_v1.json`'s `msr-noe-deadline-approaching` soft flag).
- Never state a response deadline without the received date it was computed from being present in the record.
