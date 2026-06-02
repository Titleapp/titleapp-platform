# Creator Agreement

Marketplace creators sign the Creator Agreement during onboarding. This page summarizes what it says in plain language. It is **not** the legal text — for the controlling document, see your signed copy via your Creator Dashboard.

> **Plain-language summary. Not legal advice.** The signed agreement governs.

## What you're agreeing to

### 1. You author the worker; we operate the platform

You grant SOCIII a license to host, distribute, bill for, and market your worker on the Marketplace. You retain authorship and the ability to fork your own worker off the platform if you ever choose to leave.

### 2. Revenue split: 75/25

Net revenue. Monthly payout on the 5th. See **[Earnings →](/docs/earnings)**.

### 3. Customer ownership stays with SOCIII

Customers acquired through the Marketplace are SOCIII customers. You don't get to email them outside the platform without their explicit consent. Reason: customer trust + privacy law. Many of our customers are in regulated professions; we promise them their identity isn't sold or sublet.

### 4. Non-circumvention

You agree not to use SOCIII customer lists, contact info, or aggregated data you encountered through the platform to market a competing service outside SOCIII. If a customer reaches out to you directly (LinkedIn, conference, etc.), that's fine. If you scrape Marketplace data to build a list, that's not.

### 5. AI provider dependency disclosure

Your worker runs on whatever AI provider the platform routes to. Today: Anthropic Claude and OpenAI GPT. SOCIII reserves the right to swap providers; you get advance notice for breaking changes.

### 6. Worker brand ownership

The worker brand (its name, look, description) is co-owned: you have full rights when you build under SOCIII, AND you can fork it off the platform under Apache 2.0 if you ever leave. SOCIII retains the rights to its own brand association (we don't lose the listing if you go elsewhere — your worker just continues without you).

### 7. Creator death / incapacity

If you become unable to maintain your worker, the platform has the right to either freeze the worker (no new subscriptions, existing customers grandfathered) or contract a successor maintainer. Your estate continues receiving the 75% share for the worker's natural revenue life.

### 8. Quality + the QA-001 gate

Your worker must pass QA-001 on every release. Workers with sustained quality issues (refund rate > 5%, repeated red-team failures, customer complaints) can be moved from Marketplace lane to Experimental lane while you fix things. See **[Three lanes →](/docs/three-lanes)**.

### 9. Refunds, chargebacks, fraud

The platform handles all of this. Your earnings are net of refunds + chargebacks. If a worker is at the center of a fraud claim, the platform investigates; if substantiated, the worker is suspended.

### 10. Indemnity

You indemnify SOCIII for claims arising specifically from your domain content (e.g., professional liability for medical advice, legal advice). The platform indemnifies you for claims arising from the platform itself (uptime, billing, audit integrity).

### 11. Term

Open-ended. Either side can terminate with 30 days' notice. On termination:
- Your worker stops accepting new subscriptions
- Existing subscriptions run out their term
- You receive final payout per the normal cycle
- You can fork your worker off the platform under Apache 2.0

### 12. Definitions

The signed agreement has a formal definitions section (Worker, Creator, Net Revenue, Marketplace, Lane, etc.). When in doubt, consult the signed text.

### 13. The "Customer ownership" carve-out

Reasonable exception: customers who reach out to you **first** (LinkedIn DM, email after a conference talk, etc.) are yours to engage. The non-circumvention covers list-scraping, not natural relationships.

## What we promise you (the platform's side)

In return for your 75/25 deal:
- **Hosting + compute on us** — no LLM API bills land on you
- **Identity, billing, audit, compliance scaffolding** — all platform-provided
- **Distribution** — your worker shows up in search, in the Marketplace, in Alex's recommendations
- **Forge Reviews** — funded by SOCIII, your first paying customer + structured review
- **Quarterly community events** — creator network, peer learning, founder office hours
- **Transparent metrics** — full earnings dashboard, no opaque revenue accounting

## What we don't do

- We don't write your worker for you. You + Claude Code do.
- We don't promise marketplace ranking. The algorithm is transparent (review scores, recency, customer outcome). You can game it, but the gaming feeds back into quality assertions.
- We don't withhold taxes. You're a contractor.

## Reading the actual agreement

Your signed Creator Agreement v1.1 is in your Creator Dashboard under Documents. The platform version history is in the GitHub repo at `legal/creator-agreement/`. Every version change is announced with at least 30 days' notice; you can opt to stay on your signed version or migrate.

## What comes next

**[→ Earnings & payouts](/docs/earnings)**
**[→ Three lanes](/docs/three-lanes)**
**[→ Review cycle](/docs/review-cycle)**
