# Contributing to SOCIII

Welcome. This repo runs on a creator-driven model — anyone with domain expertise can build a Digital Worker and list it in the SOCIII marketplace for 75% revenue share.

The fastest path in: read [`docs/CREATOR-ONBOARDING.md`](docs/CREATOR-ONBOARDING.md). The next 90 minutes get you from fork to first PR.

---

## Two kinds of contributions

### 1. Creator workers — most contributions go here

If you're a domain expert (nursing, real estate, aviation, accounting, legal, education, etc.) and you want to build a worker that solves a problem in your domain:

1. **Fork** this repo on GitHub.
2. **Clone** your fork locally: `git clone https://github.com/<you>/sociii-platform.git`
3. **Install Claude Code**: `npm install -g @anthropic-ai/claude-code` (then `claude /login`)
4. **Copy the template**: `cp -r creators/_template creators/<your-handle>/<your-worker-slug>`
5. **Fill in the five files**:
   - `intent.md` — what / who / success / what-it's-NOT / why-it-dovetails-with-SOCIII
   - `canvas-tabs.json` — the tab structure your users see
   - `service.js` — your worker's exposed functions (pure event proposals)
   - `sample-data.js` — fixture data for first-visit users
   - `tests/assertions.md` — QA-001 assertions that must pass before merge
6. **Open a PR** to upstream `sociii/sociii-platform:main`

A maintainer reviews within 48 hours. Most workers ship in 1-2 review rounds.

**Full build pattern**: [`docs/CREATOR-WORKER-BUILD.md`](docs/CREATOR-WORKER-BUILD.md)

### 2. Platform contributions — narrower scope

If you want to contribute to the platform itself — backend API, RAAS rule engine, capability registry, audit trail, payment processing — open an issue describing what you want to work on **before** writing code. The platform layer is intentionally narrow and protected by patents (six provisionals filed 2026-05-24). Most enhancements to platform behavior should land as new capabilities declared in `contracts/capabilities.json` rather than new code paths.

---

## What gets reviewed in your PR

Creator-worker PRs are reviewed against:

| Check | Why |
|---|---|
| **Worker DoD** (5 files present, complete) | Predictable structure, easier review |
| **Intent spec clarity** | A non-domain-expert reviewer must understand what your worker does |
| **No real-money side effects without approval** | Real-money actions go through the capability registry, not inline code |
| **No secret leaks** | CI blocks PR merge if `process.env.SECRET_KEY` etc. appears in new files |
| **No PII in code or sample data** | Use anonymized personas in sample data; real PII never in repo |
| **RAAS compliance** | Your worker's rules layer on platform safety rules (no PII exposure, AI-generation disclosure, etc.) |
| **QA-001 assertions exercisable** | Your `tests/assertions.md` must contain ≥ 5 testable statements |

Pull requests that touch only `creators/<your-handle>/` get lighter review than PRs that touch root configs, `functions/`, `raas/`, or `contracts/` — those require explicit maintainer approval per `CODEOWNERS`.

---

## License + IP

This repo is licensed under **Apache 2.0** (see [LICENSE](LICENSE)).

What this means:
- **You can fork, modify, redistribute, and use this code commercially.** Including running your own infrastructure with workers based on this SDK.
- **You retain copyright on the worker code you write** in `creators/<your-handle>/`. When you contribute a worker via PR, you grant SOCIII and downstream users a perpetual license to use, modify, and distribute it under Apache 2.0 (standard for open-source contributions).
- **You do not get a license to the SOCIII *platform* service** (audit trail engine, payment processing, identity verification, marketplace, capability registry — patent-protected, runs at app.sociii.ai). To list workers on SOCIII or use platform infrastructure, a separate creator agreement applies.
- **You do not get a license to the SOCIII trademark.** Use the name to accurately describe origin ("based on the SOCIII platform") but not to brand a derivative product as SOCIII.

---

## Earning model (for creator workers listed on SOCIII)

When your worker is merged and live in the marketplace:

- **75% of net revenue to you**, 25% to SOCIII
- Net = gross minus payment processing fees, refunds, and chargebacks
- Paid monthly via the payment method on your creator profile
- 1099 generated automatically at year-end for US creators (via the SOCIII HR worker)
- Some creators cross into the advisor track (7 max, 0.5%/worker capped at 2.5% per advisor, total 17.5% reserved). That's a separate negotiation.

Full economics: [`docs/CREATOR-EARNINGS.md`](docs/CREATOR-EARNINGS.md) (Sunday-2026-05-31 placeholder; see governance docs)

---

## Code of conduct

Be a good colleague.

- Disagree with the work, not the person.
- Default to assuming good faith.
- If a reviewer asks for changes, take them seriously even if you disagree — they're seeing something you might be missing.
- Conversely, if you're the reviewer, explain *why* you're asking for a change, not just *what* to change.
- No harassment, no discrimination, no doxxing, no weaponizing the issue tracker.

Violations get a single warning. Repeat violations get banned.

---

## Getting unstuck

| Situation | Where to go |
|---|---|
| "How do I do X in the codebase?" | Ask Claude. It has the full codebase context. Most "how does X work" questions resolve in one prompt. |
| "Is X a good idea for my worker?" | Open a GitHub Discussion at `github.com/sociii/sociii-platform/discussions` |
| "How do I test this without running prod?" | Firebase emulators: `cd functions && firebase emulators:start` |
| "I think I found a bug in the platform itself" | Open a GitHub Issue with reproduction steps |
| "I want feedback on my worker before opening a PR" | Open a draft PR — reviewers will engage |
| "I want to chat with other creators" | The SOCIII Creators Slack — you get an invite after your first merged PR |

---

## Maintainer

**Sean Lee Combs**, Founder, SOCIII, Inc.

Reach via PR review comments or `github.com/seanlcombs`.
