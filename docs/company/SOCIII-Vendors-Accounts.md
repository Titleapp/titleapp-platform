# SOCIII, Inc. — Vendor & Account Registry

> **Source of truth** for which email/Apple ID/account-holder is used at each external vendor.
> **Passwords:** never recorded here. All credentials live in the company password manager.
> **Update protocol:** when an account is created or an account holder changes, update this file the same day. Update `~/.claude/projects/-Users-seancombs/memory/` references if material.

---

## Account ownership conventions

| Account type | Default email | Notes |
|---|---|---|
| Officer-of-record / public-facing platforms | `sean@sociii.ai` | Apple Developer, Coinbase, Stripe, vendor accounts where Sean is the signatory |
| Brand public handle | `alex@sociii.ai` | Social channels, marketing tools, public inbox |
| Infrastructure admin (private) | `titleapp.core@gmail.com` | Firebase, GCP, Cloudflare — legacy dev handle, kept private |

---

## Apple Developer Program

| Field | Value |
|---|---|
| **Account Holder Apple ID** | `sean@sociii.ai` |
| **Apple ID created** | 2026-05-24 |
| **2FA** | Enabled (required by Apple) |
| **Organization** | SOCIII, Inc. |
| **Enrollment status** | In progress — DUNS request submitted via Apple 2026-05-24 ~2:20 PM PT |
| **DUNS** | Pending — Apple submits to D&B on SOCIII's behalf; expected 1-2 business days |
| **D-U-N-S linked to** | SOCIII Inc., 1810 E Sahara Ave, Las Vegas NV 89104 |
| **DUNS contact on file** | Sean Combs, sean@sociii.ai, (310) 430-0780 |
| **Password** | In password manager (do not record here) |
| **Recovery email** | TBD — set in Apple ID settings |
| **Trusted phone** | (707) 654-9864 (SOCIII company line) |

---

## Stripe Atlas / Stripe / Stripe Treasury

| Field | Value |
|---|---|
| **Account email** | TBD — confirm in Atlas dashboard |
| **Stripe account ID** | `acct_1TYWqdBYvxF0jBHy` |
| **Atlas formation** | Complete (2026-05-19) |
| **Account verification** | Complete (cleared 2026-05-24) — no active tasks |
| **Treasury** | **LIVE** (provisioned 2026-05-24) |
| **Treasury Financial Account** | ending `4207` — SOCIII operating bank account; use this routing/account # for vendor ACH/wires |
| **Payments balance** | Active — Stripe payment revenue lands here, auto-transfers to Financial Account |
| **Financial Connections** | Application pending — apply at dashboard.stripe.com/financial-connections/application |

---

## Coinbase Business

| Field | Value |
|---|---|
| **Account email** | `sean@sociii.ai` (assumed — confirm) |
| **Business name** | SOCIII, Inc. |
| **Application** | Submitted 2026-05-24, in review |
| **Beneficial owner** | Sean Lee Combs (70%) |

---

## SendGrid

| Field | Value |
|---|---|
| **Account email** | TBD |
| **Sending domain** | sociii.ai (authentication pending — multi-day clock) |

---

## Google Workspace (sociii.ai)

| Field | Value |
|---|---|
| **Admin account** | TBD |
| **Active mailboxes** | `sean@sociii.ai` (active), `alex@sociii.ai` (active) |

---

## Cloudflare

| Field | Value |
|---|---|
| **Account email** | `titleapp.core@gmail.com` |
| **Account ID** | `943ae2cdf19f03a1e4ab86a97d28f657` |
| **Notes** | Hosts titleapp-frontdoor Worker; account migration to SOCIII naming TBD |

---

## Firebase / GCP

| Field | Value |
|---|---|
| **Admin account** | `titleapp.core@gmail.com` |
| **Project** | title-app-alpha |
| **Notes** | Legacy project name; rename or migrate to sociii project TBD |

---

## GitHub

| Field | Value |
|---|---|
| **Org** | github.com/Titleapp (legacy) — migration to SOCIII org pending (task #260) |
| **Primary account** | TBD |

---

## D&B (DUNS)

| Field | Value |
|---|---|
| **DUNS number** | Pending — requested via Apple Developer enrollment |
| **Direct D&B account** | Not opened (going through Apple's request path) |

---

## Password-manager rule

If you find yourself about to write a password, API key, recovery code, or 2FA seed into this file or any other file in the repo — **STOP**.

- Passwords → password manager (1Password / Bitwarden / etc.)
- API keys → Firebase Secret Manager or `.env` files outside the repo
- 2FA seeds → password manager TOTP field or authenticator app
- Recovery codes → password manager secure note

This file records WHICH email/account is used at each vendor — never the credential itself.
