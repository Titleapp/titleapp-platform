# Creators

This directory is where Digital Workers built by external creators live. Every directory under `creators/` is one worker. The platform discovers and loads them automatically.

> **First time here?** Read [`docs/CREATOR-ONBOARDING.md`](../docs/CREATOR-ONBOARDING.md) (90-min walkthrough) and [`docs/CREATOR-WORKER-BUILD.md`](../docs/CREATOR-WORKER-BUILD.md) (build pattern reference).

## Directory layout

```
creators/
├── _template/              # blank skeleton — copy this to start
│   ├── README.md           # your worker's overview
│   ├── intent.md           # what / who / success / NOT / dovetails
│   ├── canvas-tabs.json    # tab structure users see
│   ├── service.js          # exposed functions (pure event proposals)
│   ├── sample-data.js      # fixtures for first-visit users
│   └── tests/
│       └── assertions.md   # QA-001 assertions
│
├── <your-handle>/          # your namespace — keep all your workers under here
│   └── <worker-slug>/      # one worker per directory
│
└── ruthie/                 # reference example
    └── nursing-education-001/
        ├── intent.md             ← read this first as a worked example
        ├── canvas-tabs.json
        ├── sample-data.js        ← uses real NURS 220/320 SLOs + Tanner framework
        ├── preview.html          ← `open` this in Chrome to see what the demo looks like
        └── tests/assertions.md
```

## Live creator workers

| Creator | Worker | Status | Domain |
|---|---|---|---|
| Ruthie Clearwater | `nursing-education-001` | Scaffold + preview | Nursing education — longitudinal student record with Tanner clinical judgment framework |
| _(your name here)_ | _(your worker)_ | _(draft / live)_ | _(your domain)_ |

## Start a new worker (one command)

```bash
npm run create-worker -- --handle=jane --slug=fitness-coach
```

This copies `_template/` to `creators/jane/fitness-coach/` and replaces the placeholder strings. You're ready to start editing.

> If `npm run create-worker` doesn't exist yet in your fork, you can do the same thing manually:
> ```bash
> cp -r creators/_template creators/<your-handle>/<your-slug>
> ```

## Preview your worker locally

```bash
npm run preview-worker -- --worker=jane/fitness-coach
```

Opens your worker's `preview.html` in the browser. (Your worker needs a `preview.html` file for this to work — Ruthie's reference has one, copy that pattern.)

## Worker DoD — before opening a PR

Run through this checklist (also in [`docs/CREATOR-WORKER-BUILD.md`](../docs/CREATOR-WORKER-BUILD.md)):

- [ ] `intent.md` filled in completely (no `<placeholder>` text)
- [ ] `canvas-tabs.json` has 3-7 tabs, exactly one marked `default: true`
- [ ] `service.js` exports at least one function, each returning event proposals
- [ ] `sample-data.js` has fixtures for every `canvasTab.id`
- [ ] `tests/assertions.md` has ≥ 5 testable assertions
- [ ] No API keys, passwords, or tokens in any file
- [ ] No `process.env` reads (declare secrets as capabilities)
- [ ] All function inputs validated; no trust-the-caller patterns
- [ ] `preview.html` (optional but recommended — makes review faster)

## What gets shared, what doesn't

**Your fork** lives in your GitHub account. You own it, you push to it freely. Nothing you write there is shared until you open a PR.

**Your PR** is reviewed by a SOCIII maintainer. PRs that touch only `creators/<your-handle>/` get a lighter review; PRs that touch root configs, `functions/`, `raas/`, or `contracts/` require explicit maintainer approval.

**When merged**, your worker is licensed under Apache 2.0 (you retain copyright; you grant SOCIII + downstream users a perpetual license to use, modify, and distribute).

**Listing on app.sociii.ai marketplace** is a separate step from merge. After merge, a maintainer adds your worker to the marketplace catalog. You earn 75% of net revenue starting then.

## Questions

- Build pattern: [`docs/CREATOR-WORKER-BUILD.md`](../docs/CREATOR-WORKER-BUILD.md)
- Onboarding flow: [`docs/CREATOR-ONBOARDING.md`](../docs/CREATOR-ONBOARDING.md)
- License + IP: [`LICENSE`](../LICENSE), [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Discussions: github.com/sociii/sociii-platform/discussions

Happy building.
