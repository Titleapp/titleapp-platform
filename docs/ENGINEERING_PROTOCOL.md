# TitleApp Engineering Protocol

**v1.1 — Multi-Contributor Edition**

| Field | Value |
|-------|-------|
| Document | TitleApp Engineering Protocol v1.1 |
| Location | `docs/ENGINEERING_PROTOCOL.md` in repo (commit `45bc7f29`) |
| Supersedes | v1.0 — April 2026 |
| Changes in v1.1 | Added: multi-contributor model, branch discipline, bus protocol, SDK path, 24-hour coverage model |
| Red-teamed | Yes — incorporated before publication |
| Author | Sean Combs / TitleApp |

---

## What Changed in v1.1

v1.0 was written for a solo founder with one terminal. v1.1 extends it for a multi-contributor team.

- **Added sections:** Branch Discipline, Contributor Setup, Bus Protocol, SDK Worker Path, 24-Hour Coverage Model.
- All v1.0 rules remain in force. Nothing was removed.

---

## Part 1 — The Working Model (unchanged from v1.0)

Two sessions: this chat (planning/CODEX) + one Claude Code terminal (execution). One surface at a time. Research before touch. Commit before deploy. No exceptions.

---

## Part 2 — Branch Discipline (NEW in v1.1)

### The rule

Nobody pushes directly to main. Ever. Main is protected at the GitHub level.

Every change happens on a branch. Every branch gets a PR. Every PR gets reviewed before merge. This applies to Sean, Ruthie, Kent, contractors, and any future engineers.

### Branch naming

```
// Format: [contributor]-[surface]-[date]
// Examples:
sean/spine-workers-0418
ruthie/nursing-worker-0420
kent/accounting-canvas-0421
contractor/fix-mobile-nav-0425
```

### GitHub branch protection rules (set these now)

- Require pull request before merging to main
- Require at least 1 approval
- Dismiss stale reviews when new commits are pushed
- Require status checks to pass (lint + build)
- Do not allow bypassing the above settings — including admins

### PR process

1. Create branch from main
2. Do your work following the CODEX protocol
3. Open PR with description: what changed, why, how to test
4. Tag reviewer (Sean for now, designated lead when team grows)
5. Reviewer tests the change, approves or requests changes
6. Merge to main only after approval
7. Delete branch after merge

---

## Part 3 — Contributor Setup (NEW in v1.1)

### Current contributors

| Contributor | Role | Access Level | Focus |
|-------------|------|--------------|-------|
| Sean Combs | Founder / Lead | Full | Architecture, Spine workers, product decisions |
| Ruthie | Domain Expert | Branch only | Nursing workers, creator experience testing |
| Kent Redwine | CFO | Branch only | Finance workers, accounting canvas |
| Contractors | Engineers | Branch only | Assigned surfaces, never main |

### New contributor onboarding checklist

1. GitHub account created and added to repo with branch-only access
2. Claude Code installed: `npm install -g @anthropic-ai/claude-code`
3. Repo cloned: `git clone https://github.com/Titleapp/titleapp-platform`
4. Read Engineering Protocol v1.1 (this document)
5. Read the 3 most recent CODEX documents to understand current state
6. Create first branch: `git checkout -b [name]/onboarding-[date]`
7. Make one small change, open a PR, get it reviewed and merged
8. Only then start assigned work

---

## Part 4 — Bus Protocol (NEW in v1.1)

### The Bus Question

If Sean is unavailable — medical emergency, travel, or otherwise — can the project continue?

**Currently: No.** Sean is the only person who understands the full system.

This section defines what needs to exist so the answer becomes **Yes**.

### What must be documented for continuity

- Firebase project access — who has admin credentials besides Sean?
- Cloudflare account access — landing page is deployed here
- Anthropic API key location and rotation procedure
- Domain registrar access (titleapp.ai)
- The Title App LLC — EIN 33-1330902 — who has legal/financial access?

### Minimum viable continuity (do this now)

1. Add Kent Redwine as GitHub admin
2. Share Firebase console access with Kent
3. Document all API keys and credentials in a secure shared location (1Password team vault or equivalent)
4. Write a one-page "If I'm unavailable" document that tells Kent what to do in the first 48 hours
5. Ensure at least one other person can deploy to production

### Technical continuity

The CODEX documents, patch logs, and this protocol ARE the technical continuity. A competent engineer reading the last 5 CODEX documents can understand the current state of the system without Sean's help.

This only works if the documents are kept current. Every change gets documented. No exceptions.

---

## Part 5 — SDK Worker Path (NEW in v1.1)

### Why this exists

The sandbox is the no-code creator path. The SDK is the code-first path. Both publish to the same marketplace. Domain experts who are comfortable with code (Ruthie, Kent, technical contractors) should not be constrained by the sandbox's guided experience.

### Current state of the SDK

The API exists. The WORKER_SPEC format exists. RAAS is wired. What is missing is documentation and a clear "here's how to build a worker outside the sandbox" guide.

### SDK worker building process

1. Define the worker spec (JSON) following the WORKER_SPEC format
2. Set RAAS tiers in the spec (Tier 0-3 compliance rules)
3. Upload knowledge documents via `/v1/sandbox:knowledge` endpoints
4. Test via `/v1/sandbox:worker:test` endpoints
5. Submit for preflight via `/v1/sandbox:worker:preflight`
6. Publish via `/v1/worker:publish`

A full SDK documentation document (separate from this protocol) needs to be written before Ruthie or Kent use this path. That document is **CODEX 49.1**.

---

## Part 6 — 24-Hour Coverage Model (NEW in v1.1)

### The goal

With funding, TitleApp needs engineering coverage across time zones. This section defines how that works without creating the multi-terminal collision problem that caused Session 48's TDZ bugs.

### Coverage model

| Coverage | Who | Rules |
|----------|-----|-------|
| US Day | Sean + 1 engineer | Sean owns architecture. Engineer owns assigned surface. Never same surface simultaneously. |
| US Night / EU Day | 1-2 contractors | Work from assigned CODEX docs only. No architectural decisions. PRs reviewed by Sean on waking. |
| Weekend | On-call only | Production fixes only. No feature work. Every fix documented in patch log. |

### The anti-collision rule

One engineer per surface at any time. A surface is defined in Part 1. If two engineers need to work on related surfaces, they coordinate via this chat (Claude.ai) before starting. The CODEX document for a surface is the lock — whoever is assigned the CODEX owns that surface until it's merged.

---

## Part 7 — Mechanical Gates (unchanged from v1.0)

Gate 1: no-use-before-define (ESLint). Gate 2: import/no-cycle. Gate 3: Husky pre-commit hook. Gate 4: Circular dep warnings logged not thrown. Gate 5: Pre-deploy git status check. See v1.0 for full implementation details.

**Status:** Gates 1-5 defined. Codebase audit (Part 8) must complete before Husky activates.

---

## Part 8 — Codebase Audit (unchanged from v1.0)

Must complete before Husky activates. Checklist: TDZ audit grep, `npm run lint` zero errors, activate Husky, test commit, add `safe-deploy.js`, cut `protocol-v1-baseline` tag.

**Status:** TDZ audit complete (Session 48). Lint audit pending. Husky not yet active.

---

## Part 9 — What This Protocol Does Not Solve (updated)

- **Existing landmines** — codebase audit addresses known ones, unknown issues remain
- **AI hallucination** — trust grep output over AI assumptions
- **Prompt quality** — red-team every CODEX before handing to terminal
- **Scale beyond 4-5 engineers** — this protocol needs formal engineering management practices at that point
- **Business continuity beyond technical** — legal, financial, and IP protection are outside scope of this document
- **Sandbox completion** — this protocol governs how work gets done, not what work gets done. Sandbox prioritization is a product decision.

---

## Appendix — TDZ Fixes Applied (48.7a–48.7d)

| Commit | File | Fix |
|--------|------|-----|
| `89b4c533` | ChatPanel.jsx | `WORKER_SUITES` moved from module-level const to `useMemo` inside component |
| `53c52dff` | RAASStore.jsx | `ALL_SUITES` moved from module-level const to `useMemo` inside component |
| `31bc8c6e` | Sidebar.jsx | `selectedWorkerName` moved below `workerList` declaration |
| `f496059a` | Sidebar.jsx | `workerList` + `selectedWorkerName` moved above `brandLabel` IIFE |

### Root Cause

Vite/Rolldown bundles all modules into a single file. ES module evaluation order is not guaranteed to match import order. When module A's top-level code references module B's export before B's declaration executes, the minified bundle throws "Cannot access 'X' before initialization" (TDZ crash). The fix is to defer all cross-module computations to render time (`useMemo`) or extract shared data to zero-dependency modules.

### Error Boundary

`AppErrorBoundary` in `App.jsx` wraps all `AdminShell` renders. Catches render crashes and displays a recovery UI instead of a blank page. Added as a safety net during the 48.7 TDZ investigation.

---

## Appendix — Deployment Commands

```bash
# Platform (frontend)
cd ~/titleapp-platform/apps/business && npm run build
cd ~/titleapp-platform && firebase deploy --only hosting

# Backend (functions)
cd ~/titleapp-platform && firebase deploy --only functions

# Landing page (Cloudflare Worker)
cd ~/titleapp-landing && npx wrangler deploy
```

## Appendix — Commit Convention

- Prefix: `{codex}.{patch}{letter}` (e.g., `48.7d`)
- Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Commit message describes the fix, not the symptom
