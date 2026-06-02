# Creator earnings — quick reference

Repo-root cheat sheet. Full economics at **[sociii.ai/docs/earnings](https://sociii.ai/docs/earnings)**.

## The deal

- **75%** to you (the creator) of net revenue
- **25%** to the platform (covers compute, hosting, audit, identity, billing)
- **Net = gross − payment processing − refunds − chargebacks**
- Compute costs (LLM API) are **not** deducted from your 75¢ — platform absorbs them

## Payouts

- **5th of each month** for the prior month's earnings
- Stripe Express deposit to your connected bank
- **Minimum $25** — under that rolls forward
- USD only

## Pricing models

| Pattern | Catalog field | Example |
|---|---|---|
| Subscription | `pricing.unit: "subscription"` | $49/mo |
| Annual | `pricing.unit: "subscription"`, `pricing.cycle: "annual"` | $490/yr |
| Per-invocation | `pricing.unit: "invocation"` | $0.50/run |

## Lane matters

- **Marketplace lane** = 75/25 split. **[See three lanes →](https://sociii.ai/docs/three-lanes)**
- **Open lane** = no revenue (Apache 2.0, portfolio / community)
- **Experimental lane** = reduced split OR no marketing push (negotiable per worker)

## Data fee markup

If your worker calls external paid APIs (Apollo, ATTOM, MLS, etc.), customers pay data credits with a platform markup. You don't pay; the customer does.

## Refunds

Deducted from your earnings at the time of processing. Workers with > 5% refund rate trigger a review.

## Taxes

- 1099-NEC issued if annual earnings > $600
- Platform doesn't withhold
- International creators: W-8BEN equivalent during onboarding

## Bundle revenue

Nominal-price guarantee: if a customer buys a bundle at a discount, you still earn 75% of your *declared* worker price. Platform absorbs the bundle discount.

## Full docs

**[sociii.ai/docs/earnings →](https://sociii.ai/docs/earnings)** — refunds, taxes, payout details, bundle math.

**[sociii.ai/docs/creator-agreement →](https://sociii.ai/docs/creator-agreement)** — the controlling legal terms.
