# Creator Earnings on SOCIII

This document explains exactly how creators make money on the SOCIII platform. Everything stated here is reflected in the Creator Agreement; if anything in that contract conflicts with this doc, the contract wins.

> **TL;DR** — When your Digital Worker is published on the SOCIII marketplace and a customer subscribes to it, you receive **75% of net revenue**, paid monthly. SOCIII keeps 25% to cover infrastructure, payments processing, identity verification, audit trail, and customer acquisition. There is no upfront cost to you, no minimum revenue requirement, and no exclusivity clause — you can also run your worker on your own infrastructure for free.

---

## The three creator tiers

SOCIII operates three tiers, in order of brand attachment:

### Tier 1 — Open fork (free)

You fork the SOCIII open-source SDK (Apache 2.0), build whatever you want, and run it on your own infrastructure. You keep **100% of whatever you make**. SOCIII gets nothing. Nothing prevents you from competing with the platform — it's open source.

What you give up: no SOCIII marketplace listing, no platform-managed audit trail or payments processing, no customer acquisition through SOCIII channels.

### Tier 2 — Marketplace listing (most creators are here)

Your Digital Worker is listed in the SOCIII marketplace at app.sociii.ai. Customers discover it, subscribe to it, and the platform handles everything operational. You focus on the worker; we handle the infrastructure.

**Revenue split: 75% creator / 25% SOCIII** of net revenue.

This is the section the rest of this document is about.

### Tier 3 — Enterprise self-host

A large organization licenses the platform itself to run on their infrastructure (their audit trail, their payments processor, their identity verification, their data residency). You can build creator-published workers that are designed for this deployment mode, with separate terms — discussed case by case.

---

## What "net revenue" means

For a Tier 2 marketplace listing, **net revenue** equals:

**Gross customer revenue** (what customers pay for your worker, including subscription fees, per-use fees, and per-event data fees)

**Minus** (in this order):

1. **Payment processing fees** — Stripe takes approximately 2.9% + $0.30 per transaction. We pass this through at cost.
2. **Refunds + chargebacks** — if a customer returns or disputes a charge, that amount comes out of net before the split.
3. **Sales tax / VAT** — collected from the customer, remitted to the relevant tax authority. Doesn't enter the split.
4. **Third-party API costs incurred by your worker** — if your worker calls Apollo, ATTOM, First American, OpenAI directly, or any other paid third-party service on behalf of the customer, the cost is netted out. You can configure markup on these in your worker's pricing definition.

What's left is **net revenue**. You get 75% of that. SOCIII keeps 25%.

### Worked example

A customer subscribes to your worker for $99/month.

- Gross: $99.00
- Stripe fee: ~$3.17 (2.9% + $0.30)
- No refunds, no chargebacks, no third-party API costs
- Net revenue: $95.83
- **Your share (75%):** $71.87
- SOCIII share (25%): $23.96

If your worker has 50 customers at $99/mo:

- Net revenue: $4,791.50/month
- **Your monthly payout: ~$3,594**
- Annual: ~$43,128

This is steady-state for one moderately successful worker. The platform thesis is that domain experts can build several workers across their expertise area over a few years and stack them.

---

## When and how you get paid

**Payout schedule:** monthly, on or around the 5th of the following month for the previous month's earnings. (Example: January 2027 earnings paid first week of February 2027.)

**Payout method:** ACH direct deposit (U.S. creators) or international wire (non-U.S.). You set up payout details when your worker is approved for marketplace listing.

**Minimum payout threshold:** $25. If your monthly earnings are below $25, they accrue and pay out when the cumulative balance crosses $25. This avoids fees on tiny transfers.

**Currency:** USD. International creators receive USD wires, subject to your bank's conversion.

---

## Taxes

**U.S. creators:** SOCIII issues a 1099-NEC at year-end for any creator with annual payouts exceeding $600. You're responsible for your own income tax filing. We recommend you set aside ~25-30% of your earnings for federal + state income tax + self-employment tax.

**International creators:** SOCIII does not withhold tax. You're responsible for your local tax obligations. We provide an annual earnings statement you can use for your filing.

**Sales tax / VAT:** SOCIII handles sales tax collection and remittance on customer charges where required. You don't see this in your share — it's collected from the customer separately and remitted before the net-revenue calculation.

---

## What SOCIII handles for you (in the 25%)

The 25% platform share covers:

- **Payment processing** — Stripe integration, payouts, dispute handling, chargeback management
- **Audit trail + chain anchor** — every action your worker takes is logged immutably, tamper-proof, anchored to the public blockchain
- **Identity verification** — Stripe Identity-backed KYC for users who interact with your worker, included free
- **Regulatory rule loading** — OFAC SDN feed, jurisdictional compliance modules, FERPA-friendly architecture, etc.
- **Hosting** — Firebase Hosting, Firebase Functions, Firestore, Cloud Storage
- **AI inference costs** — when your worker calls Claude / GPT / Gemini through the SOCIII platform (subject to fair-use limits — heavy AI usage may incur additional per-call data fees billed to the customer)
- **Customer acquisition** — marketplace discovery, search ranking, featured placement, marketing emails to platform users, content marketing
- **Tax handling** — 1099 generation, sales tax collection + remittance, annual earnings statements
- **Customer support** — first-line support for billing, account, and platform-level issues (you handle product-specific support for your worker)
- **Marketing assistance** — the Marketing & Content worker on the platform can help you author launch copy, social posts, email sequences for your worker's audience

---

## What you handle

- **Worker code + maintenance** — when something breaks in your worker, you fix it. SOCIII will help with platform-level issues but not with your worker's internal logic.
- **Domain expertise** — the rules your worker enforces, the SOPs it follows, the outputs it generates. You're the expert.
- **Product-specific customer support** — if a customer of your worker has a question about *how* the worker does what it does, you answer.
- **Income tax** — see Taxes above.

---

## Pricing your worker

You set the price. The marketplace listing page lets you choose:

- **Subscription** (monthly or annual) — a recurring charge per customer for ongoing access
- **Per-use** — a fee each time the customer triggers a specific worker action
- **Per-event data fee** — a fee each time the worker calls a paid third-party service on behalf of the customer (with optional markup)
- **Free tier + paid features** — your worker exposes a free version with limits, and paid upgrades unlock more

What works depends on the type of value your worker delivers. For evaluation/compliance/grading workers, subscriptions tend to fit. For one-shot deliverables, per-use is cleaner. We can advise during the marketplace listing review.

**Pricing floor:** there isn't one. You can charge $5/month or $5,000/month. The market signals what's right.

**Pricing changes:** you can update your worker's price at any time. Existing customers continue at their grandfathered rate for the duration of their current subscription period; new customers pay the new rate.

---

## Advisor track (rare — Fellow tier)

A small number of creators (target: maximum 7 across the platform's lifetime) cross from marketplace creator to genuine partner — typically because they've helped prove the platform thesis in a meaningful way or contributed substantial domain expertise across multiple workers.

For these creators, in addition to the 75% revenue share, an **advisor agreement + warrant** may be offered. Terms:

- **Equity warrant:** up to 2.5% of fully-diluted SOCIII, Inc. equity per advisor, milestone-vested over multiple years
- **Advisor title:** publicly recognized as a SOCIII Fellow
- **SOCIII email** at `<firstname>@sociii.ai` (the *only* tier where this is offered)
- **Closer collaboration** with the platform team on roadmap, vertical strategy, and downstream workers

This is not a default path. It's offered explicitly by Sean to specific creators who've earned it. The vast majority of successful creators operate as Tier 2 marketplace creators and never need the Fellow tier — the marketplace share is the economic relationship.

---

## What happens if SOCIII shuts down

Your work belongs to you. The worker code is in the open-source repo under Apache 2.0 — you can run it anywhere. The customer relationships migrate to wherever you direct them. The accumulated audit trail data is exportable to you. SOCIII fiduciary obligations include ensuring an orderly wind-down should it ever come to that.

This is part of why we kept the platform layer open at the architectural level — even if the company doesn't survive, the protocol does.

---

## What happens if a creator is removed

SOCIII reserves the right to suspend or remove a creator's marketplace listing under the Creator Agreement's terms (ToS violations, illegal activity, brand damage, public conduct inconsistent with the platform's values, prolonged inactivity, etc.). When this happens:

- **Earned but unpaid revenue** through the date of removal is still owed to you, paid on the next normal payout cycle
- **Active customer subscriptions** are wound down at the end of the current billing period or refunded pro-rata (at SOCIII's discretion based on the reason for removal)
- **Your worker code remains in the open-source repo** — you retain the right to run it elsewhere
- **Your creator profile is removed** from the marketplace; existing customer references may be retained for audit purposes

Suspensions for cause are not arbitrary; they require documented evidence of the conduct in question and follow a process described in the Creator Agreement.

---

## Questions

- Worker-specific questions or product clarifications: SOCIII Creators Slack (you receive an invite after your first merged PR)
- Earnings statement issues: `sean@sociii.ai` (this routes to whoever handles finance ops as the company grows; currently Sean)
- Tax questions: talk to your own accountant; we provide statements, not tax advice

---

*This document is informational and reflects current platform policy. The Creator Agreement is the binding legal contract — read it carefully before signing. Material changes to economics or policy are announced with 90 days' notice in the Creators Slack and via email.*

— Last updated: 2026-05-31
