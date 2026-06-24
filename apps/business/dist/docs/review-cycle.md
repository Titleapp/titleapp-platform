# Review cycle

How a worker on SOCIII gets reviewed — by the platform's automated systems, by peers, and (selectively) by the founder. Plus the **Forge Reviews** program that gives you a guaranteed first paying customer.

## The three-tier review system

Marketplace lane workers go through tiered review:

| Tier | Coverage | Who |
|---|---|---|
| **Automated AI reviewer** | ~70% of PRs | Claude-based reviewer reads the PR diff + runs QA-001 + checks for common failure modes |
| **Peer review** | ~20% of PRs | Other vetted Marketplace creators in your vertical, when the AI flags ambiguity |
| **Founder review** | ~10% of PRs | Sample-based + always-on for new creators' first 3 ships, OR when peer review escalates |

This tiered system keeps the bar high without choking velocity.

## Forge Reviews

When your worker first lists in the Marketplace lane, the platform makes a **one-time, one-month payment** at the declared [Forge price](#the-forge-price) — funding the structured first review and giving your worker its first paying-customer event.

**One-time payment. No recurring subscription. No ongoing platform liability.**

This is the most important thing to understand about Forge: SOCIII pays for one month, the review publishes at day 7, and at day 30 the Forge subscription auto-cancels. **The platform does not subscribe to your worker month after month.** Forge is a launch-funded review event, not a permanent customer.

### The Forge price

In your `catalog.json`, you declare a `forge_price` for the Forge Review month. This is what the platform pays — once — separate from your standard customer price.

- **Default:** $1.34/month (one-time)
- **Minimum:** $1.34/month (the minimum that yields the creator a clean $1.00 net after Stripe processing)
- **Maximum:** Your standard customer price (you can opt to charge the platform full freight, but it's not required and we recommend the default)

### How the creator share works on Forge — flat $1.00, not 75/25

The standard 75/25 subscription split does **not** apply to the Forge tranche. Instead, Forge is structured to give the creator a clean **first-dollar event** by paying a flat $1.00 net:

| Step | Amount |
|---|---|
| SOCIII pays the Forge subscription | $1.34 |
| Stripe processing fee on a small charge | ~$0.34 |
| **Creator receives (flat)** | **$1.00** |
| Platform net (after processing) | $0.00 (the platform breaks even on Forge — that's the design) |

The flat $1.00 to the creator is intentional. It's a clean "first dollar" — literally a dollar — and the Forge tranche shows up in the creator's earnings ledger as a first revenue event the same as any other paying customer would.

### Why a one-month-only model

If SOCIII paid full subscription price ($29–$49+/mo) for Forge on every new worker indefinitely, we'd be carrying a permanent per-worker cost line that would compound as the Marketplace grows. A one-time month at $1.34 keeps Forge financially sustainable for the platform at any catalog size, while preserving everything that matters to the creator:

- ✅ **First-dollar revenue event** — your worker has a paying customer on day one
- ✅ **First-customer review** — you get a real, structured evaluation published on your worker page
- ✅ **First entry in your earnings ledger** — Forge shows up alongside any future real subscribers
- ✅ **Forge-passed discovery signal** — passing Forge is visible in the Marketplace ranking

### Lifecycle

| Day | What happens |
|---|---|
| 1 | Forge subscribes at the Forge price; $1.00 hits creator's earnings ledger |
| 1–7 | Forge runs your worker against real domain inputs |
| 7 | Structured review generated (private to you for the next 7 days) |
| 7–14 | You have a 7-day window to fix flagged issues before the review publishes |
| 14 | Review publishes on your worker's public product page |
| 30 | **Forge subscription auto-cancels.** No further payments. Published review remains. |

You can opt out of Forge Reviews for your first ship if you want unfiltered feedback first (declare `forge: false` in catalog).

## What the AI reviewer checks

On every PR, the automated reviewer scans for:

- Intent Spec completeness (inputs, outputs, refuses, assertions all present)
- QA-001 assertion coverage matches Intent Spec scope
- Edge-case fixtures present for declared refusal conditions
- Canvas tabs schema valid
- Pricing in catalog matches Lane requirements
- README readable + free of placeholder text
- No hardcoded secrets, no PII in fixtures
- Worker scope doesn't overlap an existing Marketplace worker by > 60%

PRs that pass all checks auto-merge. PRs that fail surface a plain-language comment with what to fix.

## Peer review

When the AI reviewer is uncertain (~20% of PRs), it routes to peer review:

- Other Marketplace creators in your vertical are invited to review
- 2 of 3 thumbs-up to merge
- Peer reviewers earn platform credit per review they complete
- Reviewers are randomly assigned, no creator can pick their own reviewer

Peer review is anonymous to the creator being reviewed. You see the feedback but not the identity. Unless your reviewer adds their name in the comment.

## Founder review

Founder review (Sean) is sample-based:
- Always-on for any creator's **first 3 workers**
- 10% sample of routine Marketplace PRs
- 100% of any PR where peer review can't reach consensus
- 100% of any worker dealing with statutory life-safety decisions

Founder review is named (you see "Sean Lee Combs reviewed your PR") and the standard is higher than peer.

## Quality scoring (public)

Every Marketplace worker accumulates a quality score visible on its product page:

- **Forge score** — from the funded first review
- **Customer rating** — 1–5 stars, opt-in per customer
- **Refund rate** — last 90 days
- **Assertion coverage** — what % of declared assertions are runtime-checked

The platform doesn't tell you the formula behind ranking (to prevent gaming), but it does tell you each input. You can audit your own score.

## What happens if your worker fails

A worker that fails Forge or accumulates quality issues:

1. **First flag** — private notice + 14-day window to fix
2. **Second flag** — worker moves to Experimental lane (with disclosure to customers)
3. **Sustained issues** — worker is delisted; you can re-author and re-submit after addressing

Delisting is rare and never silent. You'll always have warning + a path back.

## What comes next

**[→ QA-001 validator](/docs/qa-001)**
**[→ Three lanes](/docs/three-lanes)**
**[→ Creator Agreement](/docs/creator-agreement)** — quality clauses
