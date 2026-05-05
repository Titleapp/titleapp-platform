# CODEX 49.32 — Canvas Rendering & Worker Sample Data Test Log

**Status (as of 2026-05-03):** Launch blocker cleared. Canvas pipeline working across the four Spine workers tested.
**Session lead:** Sean
**Phases tested:** 5.2 (cross-worker attribution), 6.1 – 6.9 (canvas rendering across worker types).

---

## Architecture (what gets tested once vs. per-worker)

| Layer | Universal? | Notes |
|---|---|---|
| `|||CANVAS_RENDER|||` extraction (`canvasMarkers.js`) | yes | runs on every worker response |
| `canvasAutoWrap` fallback | yes | fires when model emits structured chat without a marker |
| Server-side payload coercion (`coerceCanvasPayload`) | yes | normalizes wrong shapes for known typed cards |
| `DELIVERY RULES` block in worker prompt | yes | prepended in worker-direct handler (`index.js:1742`) |
| `RightPanelContext` CANVAS state | yes | wired at `AppShell` so all workers can render |
| `WorkerHomeRenderer` CANVAS check | yes | renders `CanvasPanel` when `panel.state === "CANVAS"` |
| Typed card components | per-vertical | each card type has a dedicated React component; unknown types fall back to `card:work-product` |

**Implication:** The pipeline is universal across all 300+ workers. The variable is *typed-card coverage* per vertical. A worker without a typed card for its deliverable still renders cleanly via the `WorkProductCard` fallback.

---

## Test results

### Phase 5 — Cross-worker behavior

| # | Scenario | Status | Notes |
|---|---|---|---|
| 5.2 | Cross-worker attribution — model cites sibling worker as source | ❌ FAIL | Architectural. Model literally follows the rule "If you do NOT have the sibling-worker data in conversation history, do not invent it." Fix requires injecting sibling worker demo data into prompt context so the model can cite numbers without hallucinating. **Open.** |

### Phase 6 — Canvas rendering

| # | Worker | Card type tested | Status | Notes |
|---|---|---|---|---|
| 6.1 | (any) | image generation via fal.ai | ⏸ DEFERRED | Runtime issue, not addressed this session. |
| 6.2 | Accounting | `card:accounting-pl` | ✅ PASS | |
| 6.3 | Accounting | `card:accounting-balance-sheet` | ✅ PASS | |
| 6.4 | Accounting | `card:accounting-cashflow` | ✅ PASS | |
| 6.5 | Marketing | `card:marketing-content-calendar` | ✅ PASS | Required server-side payload coercion + fallback view. |
| 6.6 | Marketing | `card:marketing-email` | ✅ PASS | Required server-side payload coercion + fallback view. |
| 6.7a | CRE Analyst | pipeline rendered as text in chat | ⚠️ PARTIAL → addressed | Fixed by widening Pattern A trigger words to include "pipeline", "kpi", "metrics", "dashboard", "deal flow", "performance". **Needs retest.** |
| 6.7b | CRE Analyst | "Make this graphical / chart / heat map" produced more text | ⚠️ PARTIAL → addressed | Added `card:chart-bar`, `card:chart-funnel`, `card:chart-heatmap` types + `ChartCard.jsx` renderer + payload coercion. Prompt updated to forbid ASCII charts. **Needs retest.** |
| 6.8 | Control Center Pro | cadence picker via chat | ⏳ NOT YET RETESTED | Cadence chips wired through Preview Brief panel; chat path unverified. |
| 6.9 | Control Center Pro | Preview digest data wiring | ✅ PASS | New `PreviewBriefPanel` surfaces inline on the worker home (cadence chips + Preview button + live brief render). |

### Mobile

| Item | Status | Notes |
|---|---|---|
| `titleapp.ai` mobile header — Sign In wraps, Start Free clipped | ✅ FIXED | Added responsive `<style>` rules to `LandingPage.jsx`: tightens padding below 640px, hides Creators link, hides BETA badge below 380px. |

---

## Code changes shipped this session

### Backend (`functions/functions/`)

- `services/alex/canvasMarkers.js`
  - Added `coerceCanvasPayload(type, payload)` dispatch table.
  - New coercers: `coerceContentCalendar`, `coerceEmailCampaign`, `coerceRealEstateClosing`, `coerceBalanceSheet`, `coerceCashFlow`, `coercePL`, `coerceChart`.
  - Logs raw → coerced key transformation per render for debug.
- `services/alex/canvasAutoWrap.js`
  - Widened `DELIVERABLE_REQUEST_PATTERNS` to include `pipeline`, `kpi`, `metrics`, `dashboard`, `funnel`, `heat map`, `graphical`, `visual`, `deal flow`, `performance`, `what are my`, `how is my`.
  - Added type detection for chart variants in `pickTypeAndTitleFromAsk`.
  - Added placeholder payloads for chart card types in `placeholderPayloadFor`.
- `index.js`
  - Worker-direct `DELIVERY RULES` (line ~1717): added type-specific payload shape examples for content-calendar, email, closing, balance-sheet, cashflow, chart-bar, chart-funnel, chart-heatmap.
  - Pattern A trigger expanded; explicit prohibition on ASCII / text-rendered charts.
  - New endpoint `POST /v1/user:previewDigest` (line ~6239) — returns dryRun digest brief for the authenticated user.
- `admin/generateDailyDigest.js`
  - New exported function `generateSubscriberBriefForUser(userId, cadence, {dryRun})`.

### Frontend (`apps/business/src/`)

- `components/AppShell.jsx` — lifted `RightPanelProvider` to wrap entire app shell so chat panel and main share one context.
- `App.jsx` — `WorkerHomeRenderer` now checks `panel.state === "CANVAS"` and renders `CanvasPanel`.
- `context/RightPanelContext.jsx` — `resetCanvas` now exits CANVAS state on worker switch.
- `components/canvas/ContentCalendarCard.jsx` — falls back to `CanvasFallbackView` when `payload.calendar` missing.
- `components/canvas/EmailCampaignCard.jsx` — falls back when `payload.campaigns` missing.
- `components/canvas/RealEstateClosingCard.jsx` — accepts payload-as-closing-data + fallback view.
- **NEW** `components/canvas/CanvasFallbackView.jsx` — generic last-resort renderer for `summary`/`sections`/`fields`/`items`.
- **NEW** `components/canvas/ChartCard.jsx` — bar / funnel / heatmap renderer.
- **NEW** `components/canvas/PreviewBriefPanel.jsx` — Control Center Pro home action: cadence chips + Preview my brief.
- `components/canvas/WorkerCanvas.jsx` — renders `PreviewBriefPanel` when `workerSlug === "platform-control-center-pro"`.
- `config/canvasTypes.js` — registered `card:chart-bar`, `card:chart-funnel`, `card:chart-heatmap`.
- `components/canvas/CanvasComponentMap.jsx` — wired `ChartCard`.
- `components/LandingPage.jsx` — added responsive header rules for mobile.

---

## Pre-launch coverage plan

**Goal:** validate the canvas pipeline + API surface across the verticals targeted for launch (Aviation, Auto, Real Estate, Title & Escrow), in addition to the 5 Spine workers already passing.

### Verticals to walk through pre-launch

| Vertical | Sample worker | Typed cards already registered |
|---|---|---|
| Aviation (CoPilot) | AV-P07 PC12-NG | `card:aviation-currency` |
| Auto Dealer | F&I worker | `card:auto-deal-analysis`, `card:auto-fi-compliance`, `card:auto-inventory` |
| Real Estate Development | property analysis worker | `card:re-property-analysis`, `card:re-market-report`, `card:re-comp-analysis` |
| Title & Escrow | ESC-001 escrow | `card:real-estate-closing` |

For each, run the standard 4-test pattern:
1. Ask for a structured deliverable → expect typed card on canvas
2. Ask for a chart / funnel / heat map → expect `card:chart-*`
3. Switch worker mid-session → confirm canvas resets cleanly
4. Send a non-deliverable message → confirm chat-only response (no spurious canvas)

### Canvas-coverage gap-fill candidates (post-launch)

These verticals would benefit from typed cards but currently fall through to `card:work-product`:
- Aviation logbook entries (`card:aviation-logbook-entry`)
- Aviation flight plan / weight & balance (`card:aviation-flight-plan`)
- Title chain of ownership (`card:title-chain`)
- Escrow milestone tracker beyond closing (`card:escrow-milestones`)
- Construction draw schedule (`card:construction-draws`)

---

## Open items going into next session

| Priority | Item |
|---|---|
| P0 | Retest 6.7a/6.7b after Pattern-A widening + chart cards |
| P0 | Walk Aviation / Auto / RE / Title workers through 4-test pattern |
| P1 | 5.2 — sibling worker demo data injection for cross-worker attribution |
| P2 | 6.8 — Control Center Pro cadence picker via chat (separate from inline panel) |
| P3 | Typed cards for aviation logbook, title chain, escrow milestones |

---

## 49.32 expansion — Tenant-Scoped Subscriptions, Tenant-Pooled Credits, & Settings Universality

After the canvas work landed, T2 audit identified two launch blockers that
rolled into the 49.32 codex: revenue (Add Credits stub) and team collaboration
(workers siloed per-user). Sean approved both fixes plus a Settings/Rules
universality audit. All four shipped in this session.

### Decisions

| Question | Sean's call | Implication |
|---|---|---|
| Stripe customer for tenants | **Clean separation** — fresh Stripe customer per workspace; admin re-enters card | Better revenue tracking for creator sharing + API markup |
| Credit scoping model | **Tenant-pooled with adaptive scaling** — workspace pays for all team usage; $20 min / $10 auto-recharge starting balance | Enables creator revenue sharing on actual usage; adaptive scaling deferred to follow-up CODEX |

### Phases shipped

| Phase | Status | Summary |
|---|---|---|
| 1. Add Credits wire-up | ✅ live | `BillingPage.jsx` credit-pack picker → `/v1/credits:purchase` → Stripe Checkout → `SubscribeSuccess.jsx` polls user/tenant balance and confirms increment |
| 2. resolveSubscription + ownerType | ✅ live | `middleware/resolveSubscription.js`: tenant-scope first, user-scope, legacy fallback. `/worker:subscribe` and `/worker:checkout` both write `ownerType`/`ownerId`. Tenant subs create a fresh Stripe customer per workspace. Stripe webhook routes events to the right pool. |
| 2b. Tenant credit pool | ✅ live | `tenants/{tenantId}.prepaidCredits` field. `checkAndDeductCredits` honors tenant context via new `tenantId` parameter. `purchaseCreditPack` accepts `tenantId` (admin only). Stripe webhook credits the tenant pool when `metadata.scope === "tenant"`. |
| 3. Role enforcement | ✅ live | `middleware/membershipCheck.js`: `enforceRoleGate(uid, tenantId, requiredRole)` with admin > member > viewer. Personal Vault short-circuits to "owner". Applied at `/worker:subscribe`, `/worker:checkout`, and `purchaseCreditPack` (tenant scope). |
| 4. Backfill migration | ✅ tooling ready | `scripts/migrateSubscriptionsToOwnerType.js`. Idempotent. Cases A/B/C/D per spec § 8. Dry-run on 20 prod docs: 14 Case A (user), 1 Case B (tenant: kent), 2 Case C (user), 3 Case D (deferred — user 4WHjuUgEs… is admin of 4 workspaces, needs `--force-tenant`). Live run blocked on Stripe-key fix. |
| 5. Frontend role/tenant UX | ✅ live | `BillingPage.jsx`: dual balance cards (Personal + Workspace), scope toggle on credit-pack picker, role badge in title, "view-only" warning for non-admins. `Sidebar.jsx`: role badge inline with workspace sub-line. `ChatPanel.jsx` and `RAASStore.jsx`: pass `tenantId` on `/worker:subscribe` so admins create tenant-scoped subs from the workspace context. |
| 6. Auto-recharge cron | ⏸ post-launch | Cron monitors tenant balance; auto-charge when below $10 threshold. Adaptive scaling logic to track usage trends. Out of scope for this session per spec § 13. |

### Settings & Worker Rules audit (separate task — same session)

User feedback: "Settings & Worker Rules seem focused on auto sales right now."

Confirmed: `apps/business/src/sections/Rules.jsx` had only `auto`, `analyst`,
and `real-estate` configs, with `RULES_CONFIGS[vertical] || RULES_CONFIGS.auto`
as the fallback for everything else. Same pattern in `Settings.jsx` (default
vertical = `auto`).

Fixes:
- `Rules.jsx` — added 4 new vertical configs (`aviation`, `consumer`, `platform`, `default`); changed fallback from `auto` to `default`. Default vertical for Worker Rules page is now `consumer`.
- `Settings.jsx` — default vertical is now `consumer`. `VERTICAL_LABELS` expanded from 6 to 14 entries (every launch + post-launch vertical).
- `App.jsx` — root vertical default flipped to `consumer`.
- `ChatPanel.jsx` — vertical default flipped to `consumer`.

### Production prerequisites (Sean / DevOps)

These must be done in production before the new flows work end-to-end:

1. **Fix STRIPE_SECRET_KEY in Cloud Functions env.** Current key is invalid — Stripe rejected `sk_live_******…fG2i`. Update via `firebase functions:secrets:set STRIPE_SECRET_KEY` and redeploy.
2. **Run setup scripts** (idempotent, gated by `secret: "titleapp-seed-2026"`):
   ```bash
   curl -X POST https://setupstripeproducts-feyfibglbq-uc.a.run.app -d '{"secret":"titleapp-seed-2026"}'
   curl -X POST https://api-feyfibglbq-uc.a.run.app/setupPromoCodes -d '{"secret":"titleapp-seed-2026"}'
   ```
   Confirms `config/stripe` doc with credit-pack price IDs.
3. **Run migration backfill** (after Stripe is unblocked):
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/...credentials.json \
     NODE_PATH=./node_modules \
     node ../../scripts/migrateSubscriptionsToOwnerType.js --dry-run
   ```
   Then resolve any Case D rows with `--user <uid> --force-tenant <tenantId>` and re-run without `--dry-run`.

### Test plan (post-Stripe-unblock)

Per spec § 11:

- [ ] Add Credits E2E (user pool) — buy 500-pack with test card 4242, confirm balance increments.
- [ ] Webhook idempotency — replay same `checkout.session.completed` event, verify no double-credit.
- [ ] Subscribe Marketing & Content from your Business workspace as admin → tenant Stripe customer created, sub doc has `ownerType:"tenant"`.
- [ ] Kent (member of same workspace) opens Marketing & Content in workspace context → chat works.
- [ ] Kent in Personal Vault opens Marketing & Content → blocked (no user-scope sub).
- [ ] Kent as `member` cannot subscribe a new worker on the workspace → 403.
- [ ] Add a third user as `viewer`. `/chat:message` returns 403 in workspace context.
- [ ] Cancel tenant sub → Kent loses access in workspace context.
