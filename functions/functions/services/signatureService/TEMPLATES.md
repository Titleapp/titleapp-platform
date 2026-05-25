# Dropbox Sign Templates — Handoff

This document is the manual setup handoff for the role-based signature packet
flow exposed by `signatureService.sendSignaturePacket({ role, ... })`.

Each role below requires:
1. A reusable template uploaded at https://app.hellosign.com/home/manageTemplates
2. The merge fields listed populated in the template
3. The template ID copied into the corresponding environment variable

The integration uses Dropbox Sign's `signature_request/send_with_template`
endpoint (still hosted at `api.hellosign.com/v3`, despite the rebrand).

---

## Role: `investor` — YC-style Post-Money SAFE

**Env var:** `DROPBOX_SIGN_TEMPLATE_INVESTOR_SAFE`

**Where to get it:** Dropbox Sign dashboard → Templates → your SAFE template
→ "Use template" or copy the template ID from the URL.

**Required signer roles in the template:**
- `Investor` (order 0)
- `Company` (order 1, Sean as countersigner)

**Required merge fields (template text tags / fields):**
| Field name        | Source                                        |
|-------------------|-----------------------------------------------|
| `investor_name`   | recipient name                                |
| `investor_email`  | recipient email                               |
| `investment_amount` | `vars.investmentAmount` (e.g. "25000")     |
| `valuation_cap`   | `vars.valuationCap` (default 10000000)       |
| `shares_issued`   | `vars.sharesIssued` (= amount × 10M / cap)   |
| `agreement_date`  | `vars.agreementDate` (ISO date)              |
| `company_name`    | "SOCIII, Inc."                                |
| `company_state`   | "Delaware"                                    |

**Files to upload to the template:**
- The current YC Post-Money SAFE PDF, marked up with the field placeholders.

---

## Role: `advisor` — Advisor Warrant Agreement

**Env var:** `DROPBOX_SIGN_TEMPLATE_ADVISOR_WARRANT`

**Required signer roles:**
- `Advisor` (order 0)
- `Company` (order 1)

**Required merge fields:**
| Field name        | Source                                        |
|-------------------|-----------------------------------------------|
| `advisor_name`    | recipient name                                |
| `advisor_email`   | recipient email                               |
| `warrant_shares`  | `vars.warrantShares`                          |
| `strike_price`    | `vars.strikePrice` (default 0.001)            |
| `vesting_months`  | `vars.vestingMonths` (default 24)             |
| `cliff_months`    | `vars.cliffMonths` (default 6)                |
| `agreement_date`  | `vars.agreementDate`                          |

---

## Role: `creator` — Creator Platform Agreement

**Env var:** `DROPBOX_SIGN_TEMPLATE_CREATOR_AGREEMENT`

**Required signer roles:**
- `Creator` (order 0)
- `Platform` (order 1)

**Required merge fields:**
| Field name        | Source                                        |
|-------------------|-----------------------------------------------|
| `creator_name`    | recipient name                                |
| `creator_email`   | recipient email                               |
| `revenue_share`   | `vars.revenueShare` (default "75%")           |
| `agreement_date`  | `vars.agreementDate`                          |

> Phase 1 only wires the `investor` role. `advisor` and `creator` are stubbed
> at the API layer so Sean can populate the env vars later without code
> changes. Phase 3 will activate creator. Phase 4 will activate advisor.

---

## Setup checklist

- [ ] Sign in at https://app.hellosign.com with the SOCIII account.
- [ ] Upload SAFE PDF as a template with the fields above.
- [ ] Set `DROPBOX_SIGN_TEMPLATE_INVESTOR_SAFE` in Firebase Functions config:
      `firebase functions:secrets:set DROPBOX_SIGN_TEMPLATE_INVESTOR_SAFE`
- [ ] (Already set from existing signatureService) confirm `HELLOSIGN_API_KEY`
      and `HELLOSIGN_CLIENT_ID` are populated.
- [ ] Verify webhook destination in the Dropbox Sign dashboard points to:
      `https://api-feyfibglbq-uc.a.run.app/v1/signatures:webhook`.
- [ ] Smoke-test with a $1 dummy investor record after env vars are set.
