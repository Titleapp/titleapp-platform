# CODEX 78 — Mercury/Stripe → Accounting Worker: Turn It On, Don't Build It

**Status:** AUDIT — the integration already exists and is fully wired; this is a "turn it on" CODEX, not a build spec
**Date:** 2026-08-26
**Trigger:** While tracking down CPA-requested documents (bank statements, loan reconciliation) for Parth Shah, it became clear SOCIII's own books were reconciled by hand from 195 manually-exported Chime/PayPal/USB transactions rather than pulled automatically — the exact problem this integration already solves. Sean asked whether a Mercury/Stripe integration into the Accounting Worker would be useful.

---

## 1. The finding: this is already built, end-to-end

This is not a greenfield feature request. Real, wired infrastructure already exists:

- **`functions/functions/services/accounting/stripeFinancialConnections.js`** (259 lines) — a complete bank-connection flow using **Stripe Financial Connections**, not Plaid. Per the file's own header, this was a deliberate architecture call: *"keep vendor count down before SOCIII migration; existing Stripe sk_live/sk_test has FC scope by default"* (Sean, 2026-05-18). Flow: create an FC session → client opens Stripe's hosted bank-picker modal → user selects their institution and accounts → server saves them to `connectedAccounts` → a sync step pulls balances/transactions on an ongoing basis. Stripe's FC product supports thousands of U.S. institutions through the same aggregator networks Plaid uses, so Mercury (and Chime, US Bank, etc.) should already be reachable through this flow — not independently verified against Mercury specifically in this pass.
- **Fully wired to real API routes** in `functions/functions/index.js`: `/v1/accounting:fc:createSession`, `/v1/accounting:fc:saveAccount`, `/v1/accounting:fc:sync`, `/v1/accounting:fc:disconnect`.
- **Fully wired to the frontend**: `apps/business/src/hooks/useAccounting.js` calls all four routes; `apps/business/src/sections/Accounting.jsx` has real UI, including the line **"Connect Mercury, US Bank, Chime, or any major bank. Transactions sync automatically — no more PDF uploads."** — Mercury is literally named in the product's own copy.
- **The Accounting onboarding checklist already lists this as a required step**: `Accounting.jsx:25` — `{ id: "connect-bank", label: "Connect at least one bank account", goTab: "accounts" }`.
- **A PDF-statement fallback also already exists**: `statementIngest.js` (394 lines) hands a dropped-in statement PDF to Claude's native PDF support to extract structured transactions — explicitly built because *"real-world statements vary wildly by issuer (American Express, Mercury, Chase, PayPal, Apple Card, Stripe payout statement)"* (file's own header). This is the manual path the product already offers as a backup when a live connection isn't available or isn't wanted.

**Conclusion: nothing needs to be built for the core capability.** What's missing is that nobody ever completed the "connect at least one bank account" step for SOCIII's own tenant — a "built but never turned on" gap, the same pattern this repo's own audits (CODEX 71, CODEX 77) have surfaced repeatedly elsewhere.

## 2. Why this matters concretely — it's not hypothetical

The CPA document-gathering pass this session found the actual cost of not having this turned on:
- No real Mercury bank statement existed anywhere in Drive until it was manually pulled today — the company's own financial workbook had been flagging *"Mercury Operating Checking statements — Never found in Drive"* as an open item.
- The founder loan reconciliation required manually tracing 195 transactions across Chime, PayPal, and a USB card statement to arrive at a defensible number — and even then, two different figures ($10,017.88 vs. $23,500) exist for the same loan because the reconciliation was done by hand, twice, at different times, with different scope decisions.
- A live Mercury connection via the existing FC flow would have made the $200 balance and every transaction behind it queryable and auditable in real time, instead of requiring today's ad hoc document hunt.

## 3. What "turning it on" actually requires

1. **Connect SOCIII's own Mercury account** through the existing Accounting tab flow (`Connect at least one bank account` → Stripe FC modal → select Mercury → done). This is a few minutes of UI interaction, not an engineering task — someone with access to the SOCIII tenant and the Mercury login just needs to click through it.
2. **Confirm Mercury specifically resolves inside Stripe's FC institution picker.** Not verified in this pass — Stripe FC's institution coverage is broad but not universal; if Mercury (whose accounts sit at Column N.A., a real bank) doesn't show up by name, that's worth knowing before promising it in product copy the way `Accounting.jsx` already does.
3. **Same for Stripe itself as a data source** — separately from Financial Connections (which connects *bank* accounts), `config/connectors.js` already has a `stripe` connector (`"Stripe Revenue"`) that reads MRR/subscriber/churn/revenue data from a tenant's own Stripe account — this is a different, already-existing mechanism from FC. Confirm SOCIII's own tenant has this connected too, once SOCIII has real Stripe revenue to track (currently pre-revenue, so lower urgency).
4. **Backfill history**: FC sync pulls forward from connection time — the Feb–Jul 2026 pre-connection history will still need the manual reconciliation work already done (or the PDF statement-ingestion fallback, now that real statements exist) rather than a live sync, since FC can't retroactively pull transactions from before the account was linked.

## 4. Product angle, not just internal hygiene

This isn't only about SOCIII's own books. Per CODEX 71/74's own pattern of using SOCIII's real internal use as a dogfooding proof point (the Shopify DPP integration scoping used the same logic), a lot of SOCIII's actual target customers — pre-revenue startups, small professional-services firms — bank at Mercury and take payments via Stripe. An Accounting Worker that syncs both automatically, with zero manual PDF handling, is a real, demonstrable differentiator worth using in sales conversations once SOCIII's own tenant has it turned on and can be shown live.

## 5. Recommended next step

Connect SOCIII's own Mercury account through the existing flow first — it's the cheapest possible way to validate the whole thing works end-to-end before saying anything about it to a customer or investor. If it doesn't work cleanly (Mercury not resolving in Stripe's institution list, sync gaps, etc.), that's the real finding to act on — not a new build.
