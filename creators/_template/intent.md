# Worker: `<your-worker-slug>`

**Creator:** Your Name (`your@email.com`)
**Status:** Draft
**Working title:** What this worker is called

## What it does

One paragraph in plain English. A non-technical reader should understand what this worker does after reading this section. Avoid jargon. Avoid hedging. State the problem and the solution.

## Who uses it

There are typically two sides to every worker:

**Operators** (the tenant — business or person who subscribes):
- Who they are
- What they do with this worker
- What success looks like for them

**End-users** (people who interact via entitlement, if applicable):
- Who they are
- What they do
- What success looks like for them

If your worker only has operators (no end-user side), say so explicitly.

## What success looks like

3-5 measurable outcomes that determine whether this worker is working. Examples of GOOD success metrics:
- "Instructor grades a reflection in ≤ 2 minutes"
- "A locked record cannot be modified, even by the user who locked it"
- "Customer-facing latency stays under 200ms p95"

Examples of BAD success metrics:
- "The worker is helpful" (not measurable)
- "Users love it" (vanity metric)
- "Increases efficiency" (vague)

Treat any user-task time budget as a bug bar — if you exceed it, fix it.

## What this worker is NOT

The boundary. Examples:
- "Not a degree-granting system — institutions issue degrees, this records competencies"
- "Not an LMS replacement — focused on a specific workflow inside existing LMS use"
- "Not certified for X — architecture-friendly to X, certification is per-deployment"

Saying what your worker doesn't do prevents scope creep and sets expectations honestly.

## Why this dovetails with the SOCIII platform

What platform infrastructure does this worker depend on? Examples:

| Need | Platform capability |
|---|---|
| Tamper-proof records | Append-only event store + chain anchor |
| Multi-instructor visibility | Multi-tenant workspace model with role-scoped reads |
| Identity verification | Stripe Identity (KYC) |
| Cross-worker data flow | Vault DTCs (Digital Title Certificates) |
| Real-money side effects | Capability registry — declare what you need, maintainer wires it |

If your worker doesn't need any platform infrastructure beyond a database, that's a sign it might not be a good fit for SOCIII — it might just be a standalone app.

## Audit-anchored events (what gets recorded permanently)

Every action that changes platform state emits an event to the append-only log. Locked events are also anchored to the public chain. List the events your worker emits:

- `<event_name>` — what triggers it, who can trigger it
- `<event_name>` — ...

## Open questions for reviewer

Before this can ship, decide:

1. **Worker name** — placeholder vs. final
2. **Capabilities** — list anything that needs external effects (email, payments, third-party API)
3. **Cohort scope** — single tenant or multi-tenant from day one?
4. **Anything else** — boundaries, edge cases, integration questions

## Cross-references

- `docs/CREATOR-WORKER-BUILD.md` — the build pattern this file follows
- `docs/CREATOR-ONBOARDING.md` — the onboarding flow you came through
- Existing reference workers: `creators/ruthie/nursing-education-001/` (longitudinal record pattern), and any others added since
