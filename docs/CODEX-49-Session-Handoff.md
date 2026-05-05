# CODEX 49 — Session Handoff (49.30 → 49.32)

**Session date:** 2026-05-02 → 2026-05-03
**Scope:** Worker Sample Data + Canvas Rendering + Cross-Worker Attribution +
          Image Rendering + Marketing Campaign Execution + Tenant-Scoped
          Subscriptions + Tenant-Pooled Credits + Settings/Worker Rules
          Universality Audit
**Status:** All in-scope work shipped. Production prerequisites pending
            (Stripe key fix + setup scripts + backfill migration). One phase
            deferred post-launch (auto-recharge cron).

This document is the complete handoff so a new conversation can pick up where
we left off without losing context.

---

## 1. Session arc

The session opened mid-test of CODEX 49.30 / 49.31 / 49.32 worker sample data
and canvas rendering. From there it expanded into:

1. Diagnosing and fixing canvas rendering for the 5 Spine workers
2. Cross-worker attribution (5.2) so workers can cite each other's data
3. fal.ai image generation (6.1) and routing images to canvas
4. Marketing & Content campaign execution (end-to-end SendGrid + Unified.to wiring)
5. T2-audit-driven CODEX 49.32: tenant-scoped subscriptions + tenant-pooled credits
6. Settings & Worker Rules universality audit (Sean: "they kind of seem to be
   focused on auto sales right now")
7. Mobile landing page nav fix

---

## 2. Test status (final)

### Phase 5 — Cross-worker behavior

| # | Scenario | Status | Notes |
|---|---|---|---|
| 5.2 | Cross-worker attribution from Marketing worker | ✅ PASS | Cites "Your Accounting worker shows revenue of $47,500" |
| 5.2 | Cross-worker attribution from Alex / Chief of Staff | ✅ PASS | Same sibling state injection now applied to legacy/COS path |

### Phase 6 — Canvas rendering (launch blocker — cleared)

| # | Worker | Card | Status |
|---|---|---|---|
| 6.1 | (any) | image generation via fal.ai | ✅ PASS — landed on canvas, prompt caption + Open full size + Download |
| 6.2 | Accounting | `card:accounting-pl` | ✅ PASS |
| 6.3 | Accounting | `card:accounting-balance-sheet` | ✅ PASS |
| 6.4 | Accounting | `card:accounting-cashflow` | ✅ PASS |
| 6.5 | Marketing | `card:marketing-content-calendar` | ✅ PASS |
| 6.6 | Marketing | `card:marketing-email` | ✅ PASS |
| 6.7 | CRE Analyst | pipeline + chart-funnel + heatmap | ✅ PASS (after Pattern A widening + chart card types added) |
| 6.8 | Control Center Pro | cadence picker via chat | ⏳ NOT YET RETESTED standalone — inline panel works |
| 6.9 | Control Center Pro | Preview digest data wiring | ✅ PASS — PreviewBriefPanel renders inline on worker home |

### Mobile

| Item | Status |
|---|---|
| `titleapp.ai` mobile header (Sign In wrap, Start Free clipped) | ✅ FIXED — responsive `<style>` rules below 640px / 380px |

### Other

| Item | Status |
|---|---|
| Marketing & Content campaign execution end-to-end | ✅ Wired (extractor + side-effects deployed); awaiting first real send for full E2E confirmation |
| Settings & Worker Rules audit (vertical universality) | ✅ Fixed — 4 new configs + default fallback |
| Tenant-scoped subscriptions (CODEX 49.32 spec) | ✅ Phases 1-5 + 2b shipped. Phase 6 deferred post-launch. |

---

## 3. Decisions captured (Sean approved)

### CODEX 49.32 T1 spec — two open questions resolved

| Question | Sean's call | Implication |
|---|---|---|
| **Q1: Stripe customer for tenants** | **Option B — Clean tenant separation.** Fresh Stripe customer per Business workspace. Admin re-enters card. | Better revenue tracking for creator sharing + API markup. Migration does NOT copy stripeCustomerId from user to tenant. |
| **Q2: Credit scoping model** | **Tenant-pooled with adaptive scaling.** Workspace pays for all team usage. Start: $20 min balance / $10 auto-recharge threshold. | Enables creator revenue sharing on actual worker usage. Adaptive auto-recharge cron deferred to post-launch CODEX. |

---

## 4. Code changes — what shipped

### Backend (`functions/functions/`)

#### Canvas rendering pipeline
- **`services/alex/canvasMarkers.js`** — added `coerceCanvasPayload(type, payload)` dispatch table. Coercers for content-calendar, email-campaign, real-estate-closing, balance-sheet, cash-flow, P&L, and chart variants. Logs raw → coerced key transformation per render.
- **`services/alex/canvasAutoWrap.js`** — widened `DELIVERABLE_REQUEST_PATTERNS` (added `pipeline`, `kpi`, `metrics`, `dashboard`, `funnel`, `heat map`, `graphical`, `visual`, `deal flow`, `performance`, `what are my`, `how is my`). Added chart variants to `pickTypeAndTitleFromAsk`. Added placeholder payloads for chart cards.
- **`services/alex/canvasMarkers.js`** + **`services/alex/sideEffectMarkers.js`** (new) — extracts `|||SIDE_EFFECT|||{action,data}|||END_SIDE_EFFECT|||` markers for campaign execution.
- **`services/canvas/spineState.js`** (new) — mirrors WORKER_SAMPLES from frontend `sampleData.js`; reads live data from `briefings/{uid}` when available; renders `SIBLING WORKER STATE` block for prompt injection.

#### Worker-direct chat handler (`index.js`)
- Inline `DELIVERY RULES` block updated with type-specific payload examples for content-calendar, email, closing, balance-sheet, cash-flow, chart-bar, chart-funnel, chart-heatmap. Pattern A trigger expanded. Explicit prohibition on ASCII / text-rendered charts.
- Added `EXECUTION SIDE EFFECTS` section to delivery rules with usage rules and example markers.
- Added sibling state injection (calls `buildSiblingStatePrompt`) to both worker-direct path AND Alex/COS legacy path.
- Wired `generate_image` tool into the worker-direct anthropic call (was previously only in sandbox/legacy paths). Fixed aspect_ratio → size mapping bug (`portrait`/`landscape` → `portrait_3_4`/`landscape_4_3`).
- Routes generated image to canvas via `card:image` render (no longer inline `structuredData.imageUrl`).
- Side-effect extraction + `executeChatSideEffects` dispatch wired into worker-direct path.

#### Side-effect handlers (`executeChatSideEffects` in index.js)
- Added `sendEmailCampaign` action — calls `emailService/marketingCampaigns.sendMarketingEmail`. Supports inline contact creation when `data.contacts` array passed.
- Added `scheduleSocialPost` action — calls `socialService.postViaUnified` (or `saveDraft` when `status:"draft"` / `dryRun:true`).
- Added `enqueueMessage` action — generic email/SMS dispatch through unified `messageQueue`.

#### Tenant subscription & billing infrastructure
- **`middleware/resolveSubscription.js`** (new) — `resolveSubscription(uid, tenantId, workerSlug)`. Tenant-first → user → legacy fallback. Returns `{ active, source, subDoc, tenantId, membershipRole }`. Free workers list unchanged.
- **`middleware/membershipCheck.js`** (new) — `enforceRoleGate(uid, tenantId, requiredRole)` with admin > member > viewer hierarchy. Personal Vault short-circuits to "owner". `rejectIfRoleInsufficient(res, ...)` Express helper.
- **`/v1/credits:purchase`** route added on the main api function. Auth-derived `userId` (closes the previous body-param auth bypass). Optional `tenantId` body field for tenant top-ups.
- **`/v1/billing:portal`** route added (was a missing route the BillingPage already tried to call).
- **`/v1/worker:subscribe`** and **`/v1/worker:checkout`** — both write `ownerType`/`ownerId` discriminator fields on every new subscription doc. Both honor optional `tenantId` body field; when admin role gate passes, sub becomes tenant-scoped + a fresh tenant Stripe customer is created (per Q1 decision).
- **`billing/purchaseCreditPack.js`** — accepts `tenantId`. When admin tops up for a workspace, charges the tenant's Stripe customer (creates one if missing). Personal Vault flow unchanged.
- **`billing/stripeWebhook.js`** — `checkout.session.completed` handler now reads `metadata.scope` / `metadata.ownerType` / `metadata.tenantId`. Routes credit packs and worker-sub credit allocations to the right pool. Tenant subs no longer touch `users/{uid}.tier`.
- **`services/health/callWithHealthCheck.js`** — `checkAndDeductCredits(userId, connector, cost, { tenantId, ... })`. When `tenantId` is set, deducts from `tenants/{tenantId}.prepaidCredits`. Returns `source: "tenant"|"user"` so callers show the right insufficient-credits message.
- **`index.js`** chat handler — passes `tenantId` (from body / context / `x-tenant-id` header) to `checkAndDeductCredits`.

#### Endpoints (functions/functions/admin/generateDailyDigest.js)
- New exported `generateSubscriberBriefForUser(userId, cadence, { dryRun })` — used by `/v1/user:previewDigest`.

### Frontend (`apps/business/src/`)

#### Canvas — provider, state machine, fallback
- **`components/AppShell.jsx`** — lifted `RightPanelProvider` to wrap the entire app shell so chat panel and main share one context.
- **`App.jsx`** `WorkerHomeRenderer` — checks `panel.state === "CANVAS"` and renders `CanvasPanel` when active. Default vertical changed from `auto` to `consumer`.
- **`context/RightPanelContext.jsx`** — `resetCanvas` exits CANVAS state on worker switch.

#### Canvas card components
- **`components/canvas/CanvasFallbackView.jsx`** (new) — generic last-resort renderer for `summary`/`sections`/`fields`/`items`.
- **`components/canvas/ChartCard.jsx`** (new) — bar / funnel / heatmap renderer; auto-derives chart type from `card:chart-*` slug if `payload.chartType` missing.
- **`components/canvas/ImageCard.jsx`** (new) — image renderer with loading/error states, "Open full size" + "Download" actions.
- **`components/canvas/PreviewBriefPanel.jsx`** (new) — Control Center Pro home action: cadence chips + Preview my brief button + inline brief render. Saves cadence to `users/{uid}.digestCadence`.
- **`components/canvas/ContentCalendarCard.jsx`** — falls back to `CanvasFallbackView` when `payload.calendar` missing.
- **`components/canvas/EmailCampaignCard.jsx`** — falls back when `payload.campaigns` missing.
- **`components/canvas/RealEstateClosingCard.jsx`** — accepts payload-as-closing-data + fallback view.
- **`components/canvas/WorkerCanvas.jsx`** — renders `PreviewBriefPanel` when `workerSlug === "platform-control-center-pro"`.

#### Canvas registry
- **`config/canvasTypes.js`** — registered `card:chart-bar`, `card:chart-funnel`, `card:chart-heatmap`, `card:image`.
- **`components/canvas/CanvasComponentMap.jsx`** — wired `ChartCard`, `ImageCard`.

#### Tenant/role UX (Phase 5)
- **`sections/BillingPage.jsx`** — full rewrite. Detects active workspace + admin role from Firestore. Dual balance cards (Personal + Workspace). Scope toggle on credit-pack picker (admin-only for workspace pool). Role badge in title. Hides Manage Billing for non-admin members in tenant context. Listens to `ta:workspace-changed` event for refresh.
- **`pages/SubscribeSuccess.jsx`** — handles `?type=credits&amount=N` query. Polls user/tenant balance up to ~12s for webhook to land. Redirects appropriately based on type.
- **`components/Sidebar.jsx`** — fetches active workspace role from `memberships/`. Renders role badge inline with workspace sub-line. Re-fetches on workspace-change event.
- **`components/ChatPanel.jsx`** — passes `tenantId` from localStorage on `/worker:subscribe` calls so admins create tenant-scoped subs from the workspace context.
- **`sections/RAASStore.jsx`** — same `tenantId` pass-through on subscribe.

#### Marketing landing
- **`components/LandingPage.jsx`** — added responsive `<style>` rules: tightens header padding below 640px, hides Creators link, hides BETA badge below 380px, no-wrap on remaining links.

#### Settings & Worker Rules audit
- **`sections/Rules.jsx`** — added 4 new vertical configs:
  - `aviation` — Flight Operations / Training / Compliance / Communication / Marketing sections
  - `consumer` — Personal Tasks / Communication / Data Access (Personal Vault baseline)
  - `platform` — Accounting / Marketing / HR / Contacts / Control Center / Communication (Spine workers)
  - `default` — Tasks / Communication / Data (generic fallback for any vertical)
- Fallback at line 373 changed from `RULES_CONFIGS.auto` to `RULES_CONFIGS.default`. Default vertical changed from `auto` to `consumer`.
- **`sections/Settings.jsx`** — default vertical `auto` → `consumer`. `VERTICAL_LABELS` expanded from 6 entries to 14 (every launch + post-launch vertical).
- **`App.jsx`** — root vertical default `auto` → `consumer`.
- **`components/ChatPanel.jsx`** — vertical default `auto` → `consumer`.

### Migration tooling

- **`scripts/migrateSubscriptionsToOwnerType.js`** (new) — idempotent backfill. Adds `ownerType`/`ownerId` fields to existing subs based on user's active memberships:
  - Case A: 0 active memberships → `ownerType:"user"`
  - Case B: 1 admin membership → `ownerType:"tenant"`
  - Case C: member/viewer only → `ownerType:"user"`
  - Case D: multiple admin memberships → flagged for manual review
- Flags: `--dry-run`, `--user <uid>`, `--force-tenant <tenantId>`, `--limit <n>`
- Dry-run on first 20 prod docs: 14 Case A, 1 Case B (kent), 2 Case C, 3 Case D (user `4WHjuUgEs...` is admin of 4 workspaces — needs manual `--force-tenant` resolution).

---

## 5. Files added (new) — quick reference

| File | Purpose |
|---|---|
| `apps/business/src/components/canvas/CanvasFallbackView.jsx` | Generic last-resort canvas renderer |
| `apps/business/src/components/canvas/ChartCard.jsx` | Bar / funnel / heatmap renderer |
| `apps/business/src/components/canvas/ImageCard.jsx` | Generated image canvas card |
| `apps/business/src/components/canvas/PreviewBriefPanel.jsx` | Control Center Pro inline cadence + Preview brief |
| `functions/functions/services/alex/sideEffectMarkers.js` | Extracts SIDE_EFFECT markers from chat output |
| `functions/functions/services/canvas/spineState.js` | Sibling worker state injector for prompts |
| `functions/functions/middleware/resolveSubscription.js` | Tenant-first sub resolver |
| `functions/functions/middleware/membershipCheck.js` | Role gate (admin/member/viewer) |
| `scripts/migrateSubscriptionsToOwnerType.js` | Idempotent backfill for ownerType/ownerId |
| `docs/CODEX-49.32-Canvas-Test-Log.md` | Original 49.32 phase log (canvas + sample data) |
| `docs/CODEX-49-Session-Handoff.md` | This document |

---

## 6. Production prerequisites — required before testing

These three steps are gating the team-collaboration demo and any real revenue
flow. None require code; all are operational tasks.

### 6.1 Fix STRIPE_SECRET_KEY (BLOCKING — Sean working on this)

The Cloud Functions env has an invalid Stripe key. Stripe rejected
`sk_live_******…fG2i` during the seed-script attempt. Until this is fixed,
**every Stripe-touching flow fails** — Add Credits, subscription create/cancel,
billing portal, the seed scripts themselves.

**Action:** Update via `firebase functions:secrets:set STRIPE_SECRET_KEY`
(paste current key from Stripe Dashboard → Developers → API keys), then
redeploy:

```bash
firebase deploy --only functions:setupStripeProducts,functions:purchaseCreditPack,functions:stripeWebhook,functions:api,functions:createSubscription,functions:createBillingPortalSession
```

### 6.2 Run setup scripts (idempotent, gated by seed secret)

```bash
curl -X POST https://setupstripeproducts-feyfibglbq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"secret":"titleapp-seed-2026"}'

curl -X POST https://setuppromocodes-feyfibglbq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"secret":"titleapp-seed-2026"}'
```

Verify in Firestore:
- `config/stripe` doc exists with `prices.creditPack500` / `creditPack2000` / `creditPack10000`
- `promoCodes/{CODE}` docs exist (AUTOLAUNCH, TITLELAUNCH, etc.)

### 6.3 Run subscription backfill migration

```bash
cd /Users/seancombs/titleapp-platform/functions/functions
GOOGLE_APPLICATION_CREDENTIALS=/Users/seancombs/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
  NODE_PATH=./node_modules \
  node ../../scripts/migrateSubscriptionsToOwnerType.js --dry-run
```

Review Case D rows (user `4WHjuUgEs...` from dry-run is admin of 4 workspaces).
Resolve each with:

```bash
node ../../scripts/migrateSubscriptionsToOwnerType.js --user <uid> --force-tenant <tenantId>
```

Then run live (no `--dry-run`):

```bash
node ../../scripts/migrateSubscriptionsToOwnerType.js
```

---

## 7. Test plan for the next session

### 7.1 Stripe smoke tests (after 6.1 + 6.2)

- [ ] Click "Add Data Credits" in Personal Vault → picker shows 500 / 2000 / 10000 → click 500-pack → Stripe Checkout opens.
- [ ] Pay with `4242 4242 4242 4242` / any future expiry / any CVC → land on `/subscribe/success?type=credits&amount=500`.
- [ ] Balance increments by 500 within ~5 seconds of webhook firing.
- [ ] Replay the same `checkout.session.completed` event manually → balance does NOT double (idempotency check).
- [ ] Open a worker that requires session credits while balance is below cost → blocked with `INSUFFICIENT_CREDITS`.

### 7.2 Tenant-pays subscription (after 6.3)

- [ ] As Sean (admin of a Business workspace), open the workspace context. Subscribe Marketing & Content from there. Confirm:
  - A fresh tenant Stripe customer is created (different from your personal customer).
  - The new `subscriptions/` doc has `ownerType:"tenant"`, `ownerId:<workspaceId>`.
  - The workspace's `tenants/{id}.stripeCustomerId` is set.
- [ ] As Kent (member of the same workspace), open the workspace and open Marketing & Content. Worker chat works (sub resolves via tenant).
- [ ] Kent in Personal Vault opens Marketing & Content → blocked (no user-scope sub).
- [ ] Sean cancels the tenant subscription. Kent loses access in workspace context within ~minutes.

### 7.3 Role enforcement

- [ ] Kent as `member` cannot subscribe a new worker on the workspace. `/worker:subscribe` returns 403 / `insufficient_role`.
- [ ] Add a test user as `viewer`. They can browse but `/chat:message` returns 403 in tenant context.
- [ ] Sidebar shows correct role badge when switching workspaces.

### 7.4 Tenant credit pool

- [ ] In a Business workspace as admin, click Add Data Credits → toggle defaults to "Workspace pool" → buy 500-pack → Stripe charges the **tenant** customer (verify in Stripe Dashboard).
- [ ] After webhook, `tenants/{id}.prepaidCredits` increments. User's `prepaidCredits` does NOT change.
- [ ] Kent runs a credit-deducting worker in workspace context. Tenant pool decrements. Kent's personal pool does NOT change.
- [ ] Toggle picker to "Personal pool" → top up own balance, doesn't touch tenant.

### 7.5 Settings & Worker Rules universality

- [ ] Open Worker Rules in a Personal Vault session. See `consumer` config (Tasks / Communication / Data) — NOT auto-dealer F&I/Sales sections.
- [ ] Open Worker Rules in an Aviation workspace. See aviation-specific sections (Flight Operations / Training / Compliance).
- [ ] Open Worker Rules in a Business in a Box workspace. See platform sections (Accounting / Marketing / HR / Contacts / Control Center).

### 7.6 Worker walkthrough across launch verticals (Sean's pre-launch goal)

For each of: PC12-NG CoPilot (aviation), F&I Compliance (auto), Property
Analysis (real-estate), Title & Escrow worker — run the standard pattern:

1. Ask for a structured deliverable → expect typed canvas card.
2. Ask "make it visual / chart / heat map" → expect `card:chart-*`.
3. Ask "what does my marketing pipeline look like?" while in the worker → expect cross-worker citation from the SIBLING WORKER STATE.
4. Switch worker mid-session → confirm canvas resets cleanly.

---

## 8. What's still open

| Priority | Item | Notes |
|---|---|---|
| P0 | Stripe key fix (Sean) | Blocks all revenue + tenant flows |
| P0 | Run setup scripts in prod | After Stripe fix |
| P0 | Run backfill migration | After Stripe fix |
| P1 | 6.8 — Control Center Pro cadence picker via chat (vs inline panel) | Inline works; standalone chat path untested |
| P1 | Vertical worker walkthrough (Aviation / Auto / RE / Title) | Sean has downloaded test workers; ready when prereqs done |
| P1 | 5.2 architecturally complete but verify on Aviation/Auto/RE workers | Currently validated only on Spine workers |
| P2 | Phase 6 — auto-recharge cron (tenant pool) | Sean approved as post-launch CODEX |
| P2 | Cleanup CODEX — remove legacy `userId` field from `subscriptions/` after a soak period | Mentioned in spec § 3.1 |
| P3 | Typed cards for aviation logbook, title chain, escrow milestones | Currently fall through to `card:work-product` |

---

## 9. Architectural invariants worth preserving

These came up during the session and should not regress:

- **Canvas pipeline is universal** across all 300+ workers. Extraction
  (`canvasMarkers.js`), payload coercion (`coerceCanvasPayload`), autoWrap
  fallback, delivery rules, sibling state injection, and `RightPanel` state
  all run on every worker response. Typed cards are per-vertical; unknown
  types fall through to `card:work-product` cleanly.
- **Server-side payload coercion is the safety net.** Don't rely on prompt
  obedience for shape correctness. When the model emits a typed marker with
  the wrong shape, `coerceCanvasPayload` translates it before the frontend
  sees it. This is why 6.5/6.6 went from FAIL to PASS.
- **Side-effects gate on explicit user approval.** The `EXECUTION SIDE EFFECTS`
  block in DELIVERY RULES forbids the model from emitting `|||SIDE_EFFECT|||`
  markers without "yes send it" / "run the campaign now". Drafts on canvas
  are fine without approval; sends are not.
- **Free workers stay free.** `FREE_WORKERS` set in `resolveSubscription.js`
  short-circuits to `active: true` — Alex / GOV-000 / GOV-015 / GOV-030 /
  GOV-040 / GOV-057 / ESC-012 must never be gated by sub checks.
- **Personal Vault is the launch baseline.** Default vertical is `consumer`,
  not `auto`. Worker Rules fall back to a generic `default` config, not
  auto-dealer F&I.
- **Tenant separation is clean.** Per Q1 decision, tenants get fresh Stripe
  customers — never reuse the user's customer. This is for proper revenue
  attribution / creator sharing.

---

## 10. Quick start for next session

If you're a new conversation picking this up:

1. Read this doc top to bottom.
2. Read `docs/CODEX-49.32-Canvas-Test-Log.md` for the canvas-specific phase log.
3. Confirm with Sean whether Stripe key has been fixed (§ 6.1).
4. If yes:
   - Run the setup scripts (§ 6.2).
   - Run the backfill migration (§ 6.3).
   - Walk through the test plan (§ 7).
5. If no:
   - Continue prep work that's independent of Stripe (e.g., vertical-specific typed cards from § 8 P3, or auto-recharge cron design from § 8 P2).

---

**Session lead:** Sean
**Codex maintainer:** Claude (Opus 4.7)
**Last updated:** 2026-05-03
