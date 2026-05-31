# Creator Onboarding — Build a Digital Worker

Welcome. This walks you from "I have an idea for a worker" to "my pull request is open" in about 90 minutes.

## What you're going to build

A **Digital Worker** is an AI agent that solves a specific problem in a specific domain. A nurse instructor builds a competency-evaluation worker. A title agent builds a closing-checklist worker. A flight school builds a CFI-curriculum worker. You bring the domain expertise; SOCIII's platform brings audit, payments, identity, and a customer base.

Your worker lives in `creators/<your-handle>/<worker-slug>/` in the repo. When it's reviewed and merged, it appears in the SOCIII marketplace, and you start earning revenue share (75% creator / 25% platform) on every customer that subscribes.

## What you need

| Thing | Why | Where |
|---|---|---|
| GitHub account | To fork the repo | github.com |
| Git installed | To clone your fork | `git --version` should work |
| Node.js 20+ | To run the local dev environment | `node --version` should print 20+ |
| Anthropic subscription (Pro, Max, or Team) | To run Claude Code locally | claude.ai |
| Claude Code CLI installed | The AI coding assistant | See step 3 below |
| About 90 minutes of focus | Bring coffee | |

## The five steps

### 1. Fork the repo

Go to https://github.com/sociii/sociii-platform and click **Fork** in the top right. GitHub creates a copy at `github.com/<your-username>/sociii-platform`. You own it. You can push to it freely.

### 2. Clone your fork locally

```bash
git clone https://github.com/<your-username>/sociii-platform.git
cd sociii-platform
git remote add upstream https://github.com/sociii/sociii-platform.git
```

The `upstream` remote lets you pull future changes from the official repo. You'll use it later.

### 3. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

If you don't have an Anthropic subscription yet, get one at https://claude.ai. Pro ($20/mo) works fine to start; if you're heavy in the codebase daily, Max ($100/mo) gives 5x the usage.

Authenticate Claude Code:

```bash
claude /login
```

It opens a browser to log in via your Anthropic account.

### 4. Start a branch for your worker

```bash
git checkout -b worker/<your-handle>-<worker-slug>
```

Examples:
- `worker/ruthie-nurse-eval-001`
- `worker/marcus-flight-school-curriculum`
- `worker/jen-title-closing-checklist`

### 5. Run Claude Code in the repo and start building

```bash
claude
```

Claude reads `CLAUDE.md` (the project's instructions to AI assistants) and is immediately ready to help.

Your first message to Claude:

> I'm building a new worker called `<your-slug>`. Read `docs/CREATOR-WORKER-BUILD.md` and walk me through creating my worker's intent spec.

Claude will guide you through:
1. **Intent spec** — what your worker does, who uses it, what success looks like
2. **Canvas tabs** — what the worker shows users (rubric, active items, completed, etc.)
3. **Service module** — the functions your worker exposes
4. **Sample data** — fixture data for the demo state
5. **Worker DoD** — definition-of-done checks

When you're done, your directory will look like:

```
creators/<your-handle>/<worker-slug>/
├── intent.md          # What this worker does, who for, what success looks like
├── canvas-tabs.json   # The tabs users see in the worker's right panel
├── service.js         # Your worker's exposed functions (stateless executors)
├── sample-data.js     # Fixture data for demo / first-visit
├── README.md          # Anything specific to your worker
└── tests/             # QA-001 assertions
    └── assertions.md  # What must be true for this worker to ship
```

### 6. Open a pull request

When your worker is ready:

```bash
git add creators/<your-handle>/<worker-slug>/
git commit -m "feat(creator): add <worker-slug> worker — first draft"
git push origin worker/<your-handle>-<worker-slug>
```

Then open a pull request on GitHub from your branch to `sociii/sociii-platform:main`.

A SOCIII maintainer (Sean or his delegate) will review within 48 hours. Expect at least one round of feedback — that's normal. Once approved, your worker merges and goes live in the marketplace.

## What gets reviewed

Your PR is reviewed against:

1. **Worker DoD** — Does it have all five files (intent, tabs, service, sample data, README + assertions)?
2. **Intent spec clarity** — Can someone unfamiliar with your domain understand what success looks like?
3. **No real-money side effects without approval** — If your worker triggers payments, identity verification, or external API calls that cost money, those go through the capability registry (see `contracts/capabilities.json`). You don't need to wire them; you declare what you'd need, and a SOCIII maintainer adds the capability with appropriate guards.
4. **No secret leaks** — Your code can't contain API keys, passwords, or tokens. Use environment variables and the secrets registry.
5. **RAAS compliance** — Your worker's rules layer on top of platform safety rules (no PII exposure, AI-generation disclosure, etc.). Conflicts get flagged.

## What you don't need to worry about

- **Audit trail** — The platform records every action your worker takes. You don't write audit code.
- **Payments** — When a customer subscribes to your worker, the platform handles Stripe + revenue split. You don't write payment code.
- **Identity verification** — When a worker needs to verify a user's identity, the platform handles Stripe Identity. You declare "this action requires KYC" in your capability list.
- **Hosting** — Once merged, your worker runs on SOCIII infrastructure. You don't deploy.
- **Customer acquisition** — Your worker appears in the SOCIII marketplace. Customers find you there.

## How you get paid

When your worker generates revenue (subscriptions, per-use fees, data fees), the platform automatically splits 75% to you / 25% to SOCIII. You're paid monthly via the payment method on your creator profile.

Tax forms (1099 for U.S. creators, equivalent for international) are generated automatically at year-end. The SOCIII HR worker handles this.

See `docs/CREATOR-EARNINGS.md` for the full economics (warrants, milestone vesting, advisor track if you cross 2.5% revenue contribution, etc.).

## When you get stuck

- **Read the relevant existing worker** — `creators/_template/` is the skeleton; `creators/ruthie/nurse-eval-001/` is the reference example for evaluation-style workers.
- **Ask Claude** — it has the full codebase context. Most "how does X work in this codebase" questions resolve in one prompt.
- **Open a discussion on GitHub** — github.com/sociii/sociii-platform/discussions. SOCIII maintainers and other creators help here.
- **Slack** — once you have a merged PR, you get an invite to the SOCIII Creators Slack.

## What this doc is not

- Not a tutorial on AI agents in general — assumes you know what an AI agent does
- Not a guide to your specific domain — only you know your domain
- Not a guide to React or JavaScript — assumes basic web-dev literacy; if you're brand new to coding, partner with someone who isn't, or ask Claude to be patient with you (it will be)

Welcome to SOCIII. Build something real.

— Sean Combs, Founder, SOCIII, Inc.
