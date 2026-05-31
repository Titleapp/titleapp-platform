# Worker: `<your-worker-slug>`

**Creator:** Your Name (`your@email.com`)
**Status:** Draft — not yet submitted for review
**Working title:** What this worker is called

> Copy this entire `_template/` directory to `creators/<your-handle>/<your-worker-slug>/` and fill in the placeholders. The five files below are the contract. Open a PR when ready.

## What this worker does

One paragraph in plain English. A non-technical reader should understand what this worker does, who uses it, and why it matters. If you can't explain it in one paragraph, you don't understand it yet.

## Files in this directory

| File | What it is |
|---|---|
| `intent.md` | The full intent spec — what / who / success / what-it's-NOT / why-it-dovetails-with-SOCIII |
| `canvas-tabs.json` | The right-panel tab structure your users see |
| `service.js` | Your worker's exposed functions (pure event proposals, no direct mutations) |
| `sample-data.js` | Fixture data so first-visit users see something real, not an empty state |
| `tests/assertions.md` | The QA-001 assertions that must pass before the worker ships |

## Anything specific to know about THIS worker

If your worker has unusual dependencies (e.g. "requires the tenant to have a Stripe account connected") or domain-specific assumptions (e.g. "designed for nursing programs using ANA Standards") — say so here.

## Pull request checklist

Before opening a PR, run through `docs/CREATOR-WORKER-BUILD.md` § "Worker DoD":

- [ ] `intent.md` filled in completely, no `<placeholder>` text remaining
- [ ] `canvas-tabs.json` has 3-7 tabs, one marked `default: true`
- [ ] `service.js` exports at least one function, each returns event proposals
- [ ] `sample-data.js` has fixtures for every `canvasTab.id`
- [ ] `tests/assertions.md` has at least 5 testable assertions
- [ ] No API keys, passwords, or tokens in any file (CI will block)
- [ ] Capability requirements declared if your worker needs external effects

## Earning

When merged + listed in the marketplace, you earn 75% of net revenue from subscriptions and per-use fees on this worker. Tax forms generated automatically at year-end via the SOCIII HR worker. See `docs/CREATOR-EARNINGS.md` for full economics.

— You
