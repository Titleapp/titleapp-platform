# Earnings & payouts

What Marketplace creators earn, when payouts land, and how the economics actually work.

## The 75/25 split

On every unit of **net subscription revenue** your worker generates on the Marketplace:
- **75% to you** (the creator)
- **25% to the platform** (SOCIII)

**Net subscription revenue = gross subscription revenue − payment processing − refunds − chargebacks**

What's *not* deducted from your 75% share:
- Hosting, audit storage, identity verification fees
- Marketing spend
- Marketplace listing fees (none)

The platform's 25% share covers the above. **Model token costs and external data-API costs are NOT absorbed by the platform** — they're billed through data fees with a universal markup (see the Data fees section below).

## Payout cycle

Payouts land on the **5th of each month** for the prior month's earnings.

- **Earned in March** → paid out April 5
- **Earned in April** → paid out May 5

Payouts are deposited to your Stripe Express account (created during onboarding). You can see real-time earnings in your Creator Dashboard at any time.

## Minimum payout

The local-currency equivalent of US$25. If your month's earnings are below threshold, they roll forward to the next month until the threshold is reached. No earnings expire.

## Currency

SOCIII is built multi-currency. Workers price in their listing currency (USD today, EUR, GBP, CAD, AUD, JPY queued as the marketplace expands to more jurisdictions). Subscribers pay in their local currency where supported; creators are paid in their declared payout currency. FX conversions happen at the platform's banking layer with the spread disclosed on every statement.

Until additional currencies activate, all listings and payouts are USD by default.

## What customers pay

Each worker sets its own pricing in `catalog.json`. Three common patterns:

| Pattern | Example | When to use |
|---|---|---|
| **Subscription monthly** | $49/mo (or local-currency equivalent) | Default — recurring use case |
| **Subscription annual** | $490/yr (~17% off) | Customer commits longer term |
| **Per-invocation** | $0.50/run | One-off use (e.g., document conversion) |

Per-invocation pricing requires `pricing.unit: invocation` in your catalog. The platform handles metering automatically.

## Bundle revenue (cross-worker)

When a customer subscribes to a **bundle** of workers (your worker plus 4 others, sold as a package), revenue splits proportionally:

**Model used: nominal-price guarantee.**
- The bundle price might be discounted vs. sum-of-parts
- But you still receive 75% × your worker's *declared* price
- The platform absorbs the discount (it comes out of the platform's 25% share)

Example: Your worker is declared at $49/mo. Customer buys a bundle at $99/mo containing 5 workers ($245 worth declared). Each creator still earns 75% × $49 = $36.75/mo. Platform absorbs the $146 discount.

## Refunds

If a customer requests a refund:
- Refund deducts from your earnings at the time it's processed (not when the original subscription was paid)
- If the refund is for a month already paid out, future payouts are reduced to net out
- Refund rate is monitored — workers with > 5% refund rate trigger a review

## Data fees (universal 100% markup, 20% to creator)

Every variable usage cost your worker incurs at runtime — **external data APIs** (Apollo, ATTOM, First American, MLS, etc.) AND **model token costs** (Claude, GPT, Gemini, image / video / audio generation models) — is billed to the customer through **data fees**, separate from subscription revenue.

### How the math works

| Step | Formula | Example |
|---|---|---|
| Base cost | What the upstream vendor charges (data API call, model tokens, render fee) | $1.00 |
| **Platform markup** | **100% of base cost** | +$1.00 |
| Customer is charged | Base + markup | $2.00 |
| **Creator earns** | **20% of the markup** | $0.20 |
| Platform earns | 80% of the markup (after covering the base cost) | $0.80 |

The markup is universal: the same 100% applies to a $0.001 Claude token charge, a $0.50 ATTOM property record, or a $5 Kling video render. Every variable runtime cost flows through the same formula.

### Why this scope (data + tokens, not just data)

The original framing of "data fees" covered only third-party data APIs. The scope is broader: every runtime variable cost — including the model tokens that produce the worker's output — is metered and marked up. A worker that uses heavy Claude reasoning ends up generating meaningful data-fee revenue even if it never calls an external API, because token consumption is part of the data-fee surface.

### How it stacks with subscriptions

Data fees and the 75/25 subscription split are **independent revenue streams that stack**:

- **Subscription revenue** = 75% creator / 25% platform on the monthly fee ($29/mo, $49/mo, etc.)
- **Data fee revenue** = 20% creator / 80% platform on the markup (the customer covers the base cost)

A worker that drives both high subscriptions AND high token consumption earns from both rails. A worker with light usage earns mostly from subscriptions. A worker that's used heavily by enterprise customers (high token + high data-API consumption) ends up with data-fee revenue that meaningfully exceeds subscription revenue at scale.

### Why the platform takes the larger share of data-fee markup

The platform fronts every base cost at the API call (Claude, ATTOM, etc. bill SOCIII; SOCIII collects from the customer). The 80% platform share of the markup covers the working-capital float, the FX/conversion risk on multi-currency billing, the cost of the metering + billing infrastructure, and the cost of dispute resolution when customers contest specific usage. The creator gets 20% as recognition of the fact that their worker authored the usage in the first place — but the creator does NOT bear the working-capital risk if a customer disputes or charges back.

### Universal — non-negotiable

This applies to every worker on every marketplace lane. There is no opt-out, and the markup percentage is fixed. The creator cannot waive it, discount it, or route data calls outside the platform's metering. Workers found doing so are de-listed.

## Taxes

Independent contractor. You receive a 1099-NEC if your annual earnings exceed $600. The platform doesn't withhold; you're responsible for self-employment tax.

International creators receive a W-8BEN equivalent form during onboarding.

## Transparency

In your Creator Dashboard:
- Live month-to-date earnings
- Per-worker breakdown
- Subscription count, churn, refund rate
- Forecasted next payout

In your worker's product page:
- Total subscribers (creator-visible only)
- Net revenue last 30 days (creator-visible only)
- Review scores (public)

## What comes next

**[→ Creator Agreement](/docs/creator-agreement)** — the legal scaffolding
**[→ Three lanes](/docs/three-lanes)** — when the 75/25 split applies (Marketplace lane only)
**[→ Review cycle](/docs/review-cycle)** — how reviews affect discovery + earnings
