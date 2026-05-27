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

---

## Role: `nda` — Mutual NDA

**Env var:** `DROPBOX_SIGN_TEMPLATE_NDA`

**Required signer roles:**
- `Counterparty` (order 0)
- `Company` (order 1, SOCIII countersigner)

**Required merge fields:**
| Field name              | Source                                       |
|-------------------------|----------------------------------------------|
| `counterparty_name`     | recipient name                               |
| `counterparty_email`    | recipient email                              |
| `counterparty_company`  | `vars.counterpartyCompany`                   |
| `company_name`          | "SOCIII, Inc."                               |
| `agreement_date`        | `vars.agreementDate`                         |

> Phase 1 wires `investor` end-to-end. `advisor`, `creator`, and `nda` are wired
> at the API layer with two-signer flow (counterparty + SOCIII Company
> countersigner). Each template still needs its merge-field labels set on the
> Dropbox Sign side to match the names above.

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

---

## Template-side checklist (per template)

Both gates must be set on the Dropbox Sign side or the API call will appear to
succeed but the executed PDF will be empty or single-signed.

1. **Field labels match the names above EXACTLY.**
   - Open template → Edit → click each placed field → right-hand panel →
     "Data field name". The auto-default "Text Field 1/2/3" will NOT match.
2. **Both signer roles are placed.**
   - Recipient role (Investor / Advisor / Creator / Counterparty) AND the
     SOCIII countersigner role (Company / Platform).
   - Each role needs at least one signature field placed on the document, or
     Dropbox Sign will mark the request complete after only the first signer
     finishes.
3. **Field role assignment.**
   - Each field has a "Who fills this out?" dropdown — set merge fields to the
     SENDER (pre-filled, locked) and signature/initial fields to the correct
     signer role.

## Company countersigner config

Defaults are baked into `signatureService/index.js`:

- `SOCIII_COMPANY_SIGNER_EMAIL` — defaults to `seanlcombs@gmail.com`
  (Dropbox Sign account holder, required for test-mode sends to work)
- `SOCIII_COMPANY_SIGNER_NAME` — defaults to `Sean Combs`
- `SOCIII_COMPANY_SIGNER_USER_ID` — defaults to Sean's Firebase UID so the
  pending-signature entry is denormalized to his user record.

Override via Firebase functions secrets if any of these change.
