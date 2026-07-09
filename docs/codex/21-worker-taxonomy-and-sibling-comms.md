# CODEX 21 — Worker Taxonomy, Vertical Bundles, and Sibling Communication

**Status:** CANONICAL — locked architecture. Do not modify without a new CODEX entry.
**Date:** 2026-07-07
**Author:** Sean Combs + Claude

---

## 1. The Problem This Solves

Workers were proliferating with inconsistent `suite` and `vertical` fields. CRE Analyst said `suite: "Investment"`, RE Marketing said `suite: "real-estate"`, zoning said `suite: "Entitlement"`. They belonged to the same vertical but wouldn't group together in the UI or catalog. Workers also had no awareness of their siblings — once inside CRE Analyst, there was no way to know that Title Abstract exists and can receive a `parcel-bundle/v1`.

This CODEX establishes the canonical taxonomy and the sibling communication pattern.

---

## 2. The Full Stack: Foundation + Vertical Layers

```
──────────────────────────────────────────────────────
  ALEX (COS — Chief of Staff)
  Full catalog awareness. Routes between all workers.
  The only entity that can see across verticals.
──────────────────────────────────────────────────────
  VERTICAL WORKERS  (industry domain)
  real-estate | aviation | education | healthcare | …
  Each vertical = a bundle of workers with a shared
  data model (ATTOM, RAAS rules, bundle shapes).
  CANNOT function without the Foundation layer below.
──────────────────────────────────────────────────────
  FOUNDATION — a priori to all vertical workers
  ┌─────────────┬──────────────────────────────────┐
  │ Spine       │ Alex · Accounting · HR ·         │
  │ Workers     │ Marketing · Contacts              │
  ├─────────────┼──────────────────────────────────┤
  │ Vault       │ Personal record store — DTCs,    │
  │             │ logbook, signed documents,        │
  │             │ medical, money. Singular; follows │
  │             │ the user across all verticals.    │
  ├─────────────┼──────────────────────────────────┤
  │ Drive       │ Files workspace — Google Drive /  │
  │             │ OneDrive. Per-persona connector.  │
  │             │ Workers READ from Drive; they     │
  │             │ never store files themselves.     │
  └─────────────┴──────────────────────────────────┘
──────────────────────────────────────────────────────
```

**The invariant:** You cannot run a vertical worker without the Foundation. A real estate worker writes records to the Vault, reads files from Drive, and is routed by Alex. Remove any of those and the worker is a disconnected chatbot. The Foundation is not optional and is not a separate purchase — it is the platform.

### 2.1 Vertical

The top-level industry classification. This is what customers buy when they subscribe to a "Vertical in a Box."

**Active verticals (4):**

| Vertical key (Firestore) | Display name | Bundle ID | Status |
|---|---|---|---|
| `real-estate` | Real Estate | `re-in-a-box` | Active |
| `aviation` | Aviation | `aviation-in-a-box` | Active |
| `education` | Education | `education-in-a-box` | Active |
| `healthcare` | Healthcare | `healthcare-in-a-box` | Active (no workers yet) |
| `finance` | Finance | `finance-in-a-box` | Aspirational — namespace reserved |
| `platform` | (Spine — no vertical) | `business-in-a-box` | Foundation |
| `unassigned` | (Staging zone) | — | Valid; creator workers before vertical promotion |

**Retired verticals (aliases kept for API backwards compat):**

| Old key | Action |
|---|---|
| `nursing` | Reclassified → `education`, suite `Licensing & CE` |
| `auto_dealer` / `auto-dealer` | Retired — no workers ever existed; `getVerticalConfig` aliases return `firestoreVertical: 'unassigned'` |

### 2.2 Suite / Task

The second-level grouping within a vertical. This answers "what does this worker DO?" for the catalog and UI filtering.

**Real Estate suites — 10 active, 2 reserved.** New suites require consolidating an existing entry first (guidance ceiling = 10 active per vertical).

Active (10):
- Investment
- Finance
- Legal
- Insurance
- Construction
- Design
- Entitlement
- Marketing
- Operations
- Property Management

Reserved (not yet active — no workers assigned):
- Brokerage ← promote when broker-specific admin/compliance workers exist
- Permitting ← promote when permitting/entitlement workers need a distinct suite

**Worker → Suite mapping (RE):**

| Worker slug | Suite | Notes |
|---|---|---|
| `cre-analyst` | Investment | CRE deal screening |
| `site-recon-001` | Investment | Physical site + zoning pull |
| `title-abstract-001` | Investment | Title chain + ownership |
| `feasibility-001` | Investment | Market + pro-forma |
| `law-landuse-001` | Legal | Entitlement + land use law |
| `zoning-001` | Entitlement | Zoning code lookup |
| `re-marketing-001` | Marketing | Brokerage marketing + showings |

### 2.3 Foundation Layer

**Spine workers** — provisioned on every workspace, regardless of vertical.

| Slug | Suite | Role |
|---|---|---|
| `platform-control-center-pro` | Operations | Alex (COS) — orchestrator |
| `platform-accounting` | Finance | Books, P&L, cash flow |
| `platform-hr` | People | Headcount, onboarding |
| `platform-marketing` | Marketing | Social, campaigns, ads |
| `platform-contacts` | Sales | CRM, outreach, pipeline |

**Vault** — the user's personal record store. DTCs, logbook entries, signed documents, medical records, financial accounts. Singular: one per user, follows them across all personas and verticals. Workers WRITE to the Vault (e.g., title abstract seals a DTC); the Vault does not belong to any vertical.

**Drive** — file workspace connector. Per-persona (a user can have a personal Drive and a brokerage Drive). Workers READ from Drive; they never store files themselves. Handoff pattern: "user uploads to Drive → worker reads → worker produces structured artifact → Vault records it."

---

## 3. Vertical Bundle Model

### 3.1 Product Rule

> **Foundation first.** Every customer gets Spine + Vault + Drive. This is the floor —
> not an add-on. A vertical worker without the Foundation is a disconnected chatbot.
>
> **Vertical bundles layer on top.** One subscription = all SOCIII-built workers in that
> vertical. Third-party creator workers = premium add-on; priced separately.
>
> **No à la carte for platform-native workers.** Keep the product simple. You buy the
> Foundation. You add a vertical. Done.

**Onboarding sequence (always this order):**
1. Customer signs up → Foundation provisioned automatically (Spine 5 + Vault + Drive)
2. Alex asks: "What industry are you in?" → recommends the matching vertical bundle
3. Customer subscribes to vertical bundle → all vertical workers appear in one click
4. Creator workers from the marketplace = optional add-on, always incremental

### 3.2 Bundles in Code

Defined in `functions/functions/index.js` → `BUNDLES` constant inside `POST /v1/bundle:subscribe`:

```javascript
"business-in-a-box": [
  "platform-control-center-pro",
  "platform-accounting",
  "platform-hr",
  "platform-marketing",
  "platform-contacts",
],
"re-in-a-box": [
  "cre-analyst", "site-recon-001", "title-abstract-001",
  "law-landuse-001", "zoning-001", "feasibility-001", "re-marketing-001",
],
"aviation-in-a-box": ["av-copilot-001", "av-mx-001", "av-dispatch-001"],
"education-in-a-box": ["nursing-ce-001", "student-eval-001"],
"nursing-in-a-box": ["nursing-ce-001", "student-eval-001"],  // backwards-compat alias
```

**Rule:** When a new worker is added to a vertical, add it to the corresponding bundle immediately, AND run a backfill script to grant it to all existing subscribers. The bundle is the product contract.

### 3.3 Bundle Subscribe API

```
POST /v1/bundle:subscribe
Body: { bundleId: "re-in-a-box", tenantId: "<workspace-id>" }
```

Subscribes all workers in the bundle at `priceCents: 0` (no Stripe checkout needed for SOCIII-native workers). Skips already-subscribed workers. Idempotent.

---

## 4. Sibling Communication

### 4.1 The Problem

Workers in the same vertical are isolated at runtime. Inside CRE Analyst, the model has no idea that Title Abstract exists or that it accepts `parcel-bundle/v1`. Inside Land Use, it doesn't know Zoning is available for the overlay data.

This is the same isolation problem that made the COS dashboard incomplete — solved there by injecting `_workerCatalogCtx`. The same injection pattern applies here.

### 4.2 The Pattern: Vertical Sibling Injection

At chat request time, for any worker whose `vertical !== 'platform'`, inject a sibling context block into the system prompt:

```
SIBLING WORKERS IN THIS VERTICAL (RE):
Workers are listed with ALL inputs they can consume and ALL outputs they produce.
When your output matches another worker's accepted input, propose the handoff.

- CRE Analyst (cre-analyst)
  accepts: address + deal terms, site-recon-bundle/v1, legal-opinion-bundle/v1,
           zoning-bundle/v1, feasibility-roadmap/v1
  emits:   parcel-bundle/v1

- Site Recon (site-recon-001)
  accepts: parcel-bundle/v1
  emits:   parcel-bundle/v1 (enriched with physical site data),
           site-recon-bundle/v1 (photos, conditions, comps)

- Title Abstract (title-abstract-001)
  accepts: parcel-bundle/v1
  emits:   title-abstract-bundle/v1

- Land Use Attorney (law-landuse-001)
  accepts: parcel-bundle/v1, title-abstract-bundle/v1
  emits:   legal-opinion-bundle/v1

- Zoning + Entitlement (zoning-001)
  accepts: parcel-bundle/v1
  emits:   zoning-bundle/v1

- Market & Feasibility (feasibility-001)
  accepts: parcel-bundle/v1, site-recon-bundle/v1,
           legal-opinion-bundle/v1, zoning-bundle/v1
  emits:   feasibility-roadmap/v1

- RE Brokerage Marketing (re-marketing-001)
  accepts: address (direct), title-abstract-bundle/v1
  emits:   listing-readiness/v1 (terminal — user-facing)

SIBLING RULE: When your output matches another worker's accepted input, say:
"Want me to pass this to [Worker Name] to [next action]? I can describe
what to bring — you or Alex can open it from there."
Never say "go to the other tab." Never imply a handoff has already happened.
Phase 1 is suggestion-only — name the next worker, describe what it needs,
stop there. No auto-execution. The user navigates; Alex routes.
```

### 4.3 Implementation Location

In `index.js`, inside the chat handler, after the `_isReWorker` detection block. Look for `_workerCatalogCtx` — the sibling injection follows the same append pattern.

Build the sibling list dynamically from Firestore — filter by BOTH `vertical` AND `suite`, then intersect with the tenant's subscribed slugs:

```javascript
// Step 1: get tenant's subscribed worker slugs
const tenantSubs = await db.collection("subscriptions")
  .where("ownerId", "==", tenantId)
  .where("trialStatus", "in", ACTIVE_STATUSES)
  .get();
const subscribedSlugs = new Set(tenantSubs.docs.map(d => d.data().workerId));

// Step 2: get same-vertical, same-suite siblings from global catalog
const siblings = await db.collection("digitalWorkers")
  .where("vertical", "==", dw.vertical)
  .where("suite", "==", dw.suite)
  .where("status", "==", "active")
  .get();

// Step 3: intersect with tenant entitlement
const entitledSiblings = siblings.docs
  .filter(d => d.id !== workerSlug && subscribedSlugs.has(d.id));
```

Suite isolation within a vertical is required: an education/Professional Development worker must not see nursing-ce-001 (education/Licensing & CE) as a sibling.

Cache the sibling query result for the session (it's static per workspace).

**DO NOT** hardcode sibling lists in individual worker system prompts. The sibling list lives in the chat injection layer — it updates automatically when workers are added.

### 4.4 Alex as the Universal Router

Alex (COS, `platform-control-center-pro`) already has full catalog visibility via `_workerCatalogCtx`. When a user is in the dashboard and asks Alex to hand something off to Title Abstract, Alex can reference the sibling catalog and propose the action.

Alex should NOT need to know the internals of each worker — he routes by capability and bundle shape, not by worker implementation.

---

## 5. Data Flow: Bundle Shapes

Workers communicate via typed artifact bundles. The bundle shape is the contract — the producer defines it, the consumer reads it. Shape versioning is add-only.

**Current RE bundle shapes:**

| Shape | Produced by | Consumed by |
|---|---|---|
| `parcel-bundle/v1` | cre-analyst, site-recon-001 | title-abstract-001, law-landuse-001, zoning-001, feasibility-001 |
| `site-recon-bundle/v1` | site-recon-001 | feasibility-001, cre-analyst |
| `title-abstract-bundle/v1` | title-abstract-001 | law-landuse-001, re-marketing-001 |
| `legal-opinion-bundle/v1` | law-landuse-001 | cre-analyst, feasibility-001 |
| `zoning-bundle/v1` | zoning-001 | law-landuse-001, feasibility-001, cre-analyst |
| `feasibility-roadmap/v1` | feasibility-001 | cre-analyst |
| `listing-readiness/v1` | re-marketing-001 | (terminal — user-facing) |

---

## 6. Red Team

**R1: Too many suites creates catalog chaos**
*Attack:* As we add workers, the suite list grows to 20+ categories. The UI becomes a dropdown nobody reads.
*Mitigation:* Suites are for filtering, not navigation. The UI primary navigation is **vertical** (RE, Aviation, Nursing). Suites are secondary filters within a vertical. Cap to ~10 per vertical. If more than 10 needed, split the vertical.

**R2: Sibling injection bloats the context window**
*Attack:* Injecting 7-worker sibling lists into every RE worker chat adds ~200 tokens per turn × thousands of sessions = meaningful cost.
*Mitigation:* Sibling injection is one-time per session (not per turn). It's injected into the system prompt, not the conversation. System prompt caching reduces this to near-zero.

**R3: "Bundle subscribe" bypasses Stripe**
*Attack:* A determined user could hit `/v1/bundle:subscribe` directly with a free bundle ID and get workers that should cost money.
*Mitigation:* Already handled — the bundle subscribe endpoint checks `pricing_tier > 0` and skips paid workers. Only free/included workers go through this path. Paid workers require Stripe Checkout. This is the intended behavior.

**R4: Firestore vertical field drift**
*Attack:* When a new worker is seeded, the person seeding might forget to set `vertical` to the canonical key (`real-estate`). The worker ends up outside all vertical filters.
*Mitigation:* The `getVerticalConfig` lookup in `catalog:byVertical` uses `firestoreVertical` as the primary filter. Add a validation step to the worker-publish path that checks `vertical` against the known vertical list and warns if it's missing or non-canonical.

**R5: Sibling list becomes stale**
*Attack:* We retire a worker (e.g., `site-recon-001` merges into `cre-analyst`). The old sibling injection still references it. Users see ghost worker references in chat.
*Mitigation:* The sibling list is built dynamically from Firestore `status: "active"` query. Retired workers have `status: "retired"` and are excluded. No hardcoded lists.

**R6: Customer buys a vertical bundle but Foundation isn't provisioned**
*Attack:* Edge case — a customer somehow subscribes to `re-in-a-box` without the Foundation layer (Spine + Vault + Drive). RE workers are useless without Alex, Vault writes, and Drive reads. They see broken workers and churn.
*Mitigation:* The bundle subscribe endpoint should check for Foundation prerequisites and auto-provision them first if missing. The onboarding sequence enforces Foundation-first. Never expose vertical bundles as a standalone purchase in the UI — they always appear AFTER Foundation onboarding. Add a gating check: if `platform-control-center-pro` is not subscribed, auto-subscribe Foundation first before vertical bundle.

---

## 7. Open Items

- [ ] Implement sibling injection at chat layer (estimate: 2 hours)
- [ ] Add "Marketing" to the RE suite filter list (done 2026-07-07 in code; deploy pending)
- [ ] Build marketplace UI treatment for "RE in a Box" vs "Business in a Box" (CODEX 23?)
- [ ] Property Scout worker — needed for Scott Eschelman demo; no code yet
- [ ] CE workers for CA + HI (CRE/agent license renewal — revenue gateway)
