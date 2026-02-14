# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Each sub-project is managed independently — there is no root-level build or test orchestration.

**Admin UI** (`apps/admin/`):
```bash
npm run dev       # Vite dev server (localhost:5173)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

**Firebase Functions** (`functions/functions/`):
```bash
firebase deploy --only functions   # Deploy functions
firebase emulators:start           # Run locally with emulators
```

No test framework is configured anywhere in the codebase.

## Architecture

### Three-Layer System

```
[Admin UI / Chat AI]  →  [Cloudflare Worker "Frontdoor"]  →  [Firebase Functions → Cloud Run]
```

1. **Frontend (Door 1):** React 19 + Vite admin app at `apps/admin/`. Uses Firebase Auth; sends bearer tokens with all requests.
2. **Edge Router (Door 2/Frontdoor):** Cloudflare Worker at `titleapp-frontdoor.titleapp-core.workers.dev`. Enforces CORS, normalizes routes, verifies Firebase ID tokens. Routes are **locked** (see `docs/STATE.md`).
3. **Backend API:** Single Firebase Function `exports.api` in `functions/functions/index.js` — deployed as a Cloud Run service. All routing is handled manually inside that one function via `getRoute(req)`, which normalizes both direct `/v1/...` calls and Cloudflare passthrough `/api?path=/v1/...`.

### Backend Function Structure (`functions/functions/index.js`)

All HTTP routes live in one `onRequest` handler. Key helpers:
- `getRoute(req)` — normalizes path from direct calls and Cloudflare passthrough
- `requireFirebaseUser(req, res)` — verifies bearer token
- `getCtx(req, body, user)` — extracts `tenantId` from `x-tenant-id` header or body

RAAS routes delegate to `raas/raas.handlers.js` and `raas/raas.store.js`.

### Firestore Data Model (Append-Only)

**Invariant:** Records are never overwritten. State is computed from event history.

Key collections:
- `tenants/`, `memberships/`, `users/`
- `identityVerifications/`, `imports/`, `files/`
- `raasCatalog/{vertical}__{jurisdiction}` — workflow/ruleset catalog
- `raasPackages/{packageId}` — execution instances with bound files

### RAAS (Rules as a Service)

Located in `raas/`. Three-level hierarchy:
- **Level 0:** AI style guide (global)
- **Level 1:** Core behavioral rules (platform invariants)
- **Level 2:** Vertical baselines (domain-specific)

**Current verticals:**
- `raas/analyst/GLOBAL/` — deal screening, evidence-first analysis
- `raas/auto/IL/` — auto dealer revenue engine (Illinois); VIN-first, event-sourced vehicle lifecycle
- `raas/real-estate/CA/` and `/NV/` — title & ownership; parcel-anchored records

### Capability Contract Registry (`contracts/`)

`contracts/capabilities.json` is the **source of truth** for all executable actions. If a capability is not declared there, it does not exist. Each capability declares its `id` (versioned: e.g., `identity.register_user_v1`), allowed callers, required KYC level, and required roles. Versioning is **add-only** — never silently modify an existing capability version; create `v2`.

### Core Architectural Invariants

1. **Append-only Firestore** — all canonical records are event-sourced; never overwrite.
2. **AI agents are stateless executors** — agents propose actions, RAAS validates, events append. Agent logic stays model-agnostic (OpenAI, Claude, Gemini interchangeable).
3. **RAAS is the constraint engine** — business logic lives in rule definitions, not prompts. Rules are tenant-configurable and portable.
4. **Defensive IP** is the append-only record model, RAAS, and ownership/transfer semantics — NOT the UI, model provider, or cloud vendor.

## Door 2 Multi-Model Strategy

The chat interface is the **primary user experience** — Door 1 (admin dashboard) is fallback visibility only.

- **Model routing:** The chat entry point routes to either Anthropic Claude or OpenAI GPT based on user preference. Both are treated as interchangeable executors.
- **RAAS validation:** All AI outputs are validated by RAAS regardless of which model produced them. Business logic lives in rules, not prompts.
- **Inline structured objects:** After AI proposes an action, the UI renders structured objects (Trade Summary, DTC, etc.) inline within the chat conversation — pending user consent.
- **Explicit approval gate:** Nothing is shared or committed until the user explicitly approves. Agents propose; users confirm; only then do events append to Firestore.

## Key Files

| File | Purpose |
|------|---------|
| `functions/functions/index.js` | Main API handler — all routes |
| `functions/functions/raas/raas.handlers.js` | RAAS endpoint implementations |
| `functions/functions/raas/raas.store.js` | RAAS Firestore operations |
| `contracts/capabilities.json` | Capability registry (source of truth) |
| `raas/RECORD_ANCHORS.md` | Anchor abstraction (notary/escrow/blockchain) |
| `docs/STATE.md` | Cloudflare Frontdoor routing — locked |
| `docs/PRODUCT.md` | Product philosophy and user journeys |
| `firebase.json` | Hosting rewrites + function source config |

## Tech Stack

- **Frontend:** React 19, Vite, Firebase SDK 12
- **Backend:** Firebase Functions v2, Node.js 20, Firebase Admin SDK, Stripe SDK
- **Database:** Firestore (append-only event store)
- **Storage:** Firebase Cloud Storage
- **Auth:** Firebase Authentication (email/password) + Stripe Identity (KYC)
- **Edge:** Cloudflare Workers
- **Node version:** 20 (enforced via `.nvmrc`)
