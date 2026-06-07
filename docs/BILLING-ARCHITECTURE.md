# BILLING-ARCHITECTURE.md — Canonical substrate reference

**Date:** 2026-06-06
**Purpose:** Single source of truth for how pricing + billing + wallet works across all SOCIII workers. Authored after the LAW-LANDUSE-001 spec invented untethered pricing (TC-069) and the top-up-vs-gate field drift surfaced during Sean's Site Recon test. Per the substrate-precedence rule (CODEX S52.41 candidate), worker specs MUST reference this doc; they may never invent billing mechanics.
**Status:** v1 — captures actual production behavior as of `e1b6d3e7` (HEAD). Architecture questions in §6 await Sean's ratification.

---

## §1 — Canonical files (the substrate)

| File | Role | Key exports |
|---|---|---|
| `functions/functions/config/pricing.js` | Canonical pricing source-of-truth. Self-declares: *"ALL pricing references in the codebase MUST read from this file."* | `creditRate`, `executionCredits`, `dataFeeMarkupMultiplier`, `auditTrailFeePerRecord`, `subscriptionTiers`, `creatorSubscriptionSharePct`, `creatorRevenueSharePct`, `stripeProducts`, `stripeMeters` |
| `functions/functions/services/billing/dataFee.js` | Data pass-through registry + pre-call quote + event ledger | `SOURCE_REGISTRY`, `quoteDataFee`, `recordDataFee` |
| `functions/functions/services/health/callWithHealthCheck.js` | Session-credit gate for inference/connector calls | `checkAndDeductCredits` |
| `functions/functions/billing/usageProcessor.js` | Cycle-close aggregation + Stripe overage + top-up webhook handler | `processUsageEvents`, `chargeOverageToStripe`, `creditBalanceFromCheckout`, `handleTopUpBalance` |
| `functions/functions/billing/stripeWebhook.js` | Stripe webhook router; dispatches to usageProcessor + credit-pack handler | (event handlers) |

**No per-worker Stripe SKUs.** The `stripeProducts` map in `pricing.js` has SKUs for KITS, tiers, top-ups, identity checks, signature overage — but NOT for individual workers. Worker pricing is computed from `SOURCE_REGISTRY` + `executionCredits` + `auditTrailFeePerRecord`, all of which live in this substrate.

---

## §2 — Three locked revenue lines

Per `pricing.js` lines 7-37:

### Line 1 — Inference Credits (AI execution)
- `creditRate: $0.02` per credit at overage
- `executionCredits`: `simple: 1, standard: 5, complex: 15, external_api: 25, esign: 30, ocr: 50`
- Subscription tiers (`free $0` / `tier1 $29` / `tier2 $49` / `tier3 $79` / `enterprise`) include monthly credit packs
- Stripe meter: `inferenceCreditsOverage`

### Line 2 — Data Pass-Through (external APIs)
- Global `dataFeeMarkupMultiplier: 2.0` (user pays 2× actual API cost)
- Per-source overrides in `SOURCE_REGISTRY` (ofac/gis use 5.0× on $0.01 baseline since the actual API is free; the markup covers ingest + compute)
- Charged at cycle-close, NOT per-call
- Stripe meter pattern: per-source overage

### Line 3 — Audit Trail (blockchain records)
- `auditTrailFeePerRecord: $0.005`
- Every PLAT-008 receipt charges this
- Stripe meter: `auditTrailRecords`

---

## §3 — SOURCE_REGISTRY (current production state, dataFee.js:40-73)

| Source key | Actual cost | Markup | User-side per unit | Notes |
|---|---|---|---|---|
| `apollo:search` | $1.00 | 2.0× | $2.00 | Apollo people search |
| `apollo:enrich` | $1.00 | 2.0× | $2.00 | Apollo person enrich |
| `apollo:org_search` | $1.00 | 2.0× | $2.00 | Apollo organization search |
| `ofac:screen` | $0.01 | 5.0× | $0.05 | OFAC SDN screen (Treasury feed is free; markup covers ingest) |
| `gis:overlays` | $0.01 | 5.0× | $0.05 | GIS overlay evaluation (FEMA/CCC/NRHP/OZ — same pattern) |
| `attom:property` | $3.00 | 2.0× | **$6.00** | ATTOM property report (Sean rate-set 2026-06-01) |
| `attom:snapshot` | $0.10 | 2.0× | $0.20 | ATTOM area snapshot (ESTIMATE PENDING tier) |
| `firstam:title` | $10.00 | 1.5× | $15.00 | First American title detail |
| `mls:listing` | $0.50 | 2.0× | $1.00 | MLS listing pull |
| `notamify:notams` | $0.25 | 2.0× | $0.50 | NOTAMIFY NOTAM pull (Sean rate-set 2026-06-01) |
| `kling:video` | $0.50 | 2.0× | $1.00 | Kling AI video generation |

**Convention for adding new sources** (per LAW-LANDUSE-001 spec §10 — future):
```js
"municode:lookup":   { actualCentsPerUnit: TBD, markup: TBD, label: "Municode code section lookup" },
"courtlistener:case": { actualCentsPerUnit: TBD, markup: TBD, label: "CourtListener case retrieval" },
"ceqanet:filing":    { actualCentsPerUnit: TBD, markup: TBD, label: "CEQAnet CEQA filing lookup" },
```
Actual costs require Sean to confirm vendor pricing before commit.

---

## §4 — Two billing-pool model

The substrate uses **two separate pools** that serve different purposes. Understanding this distinction is load-bearing:

### Pool A — `prepaidCredits` (credit-call pool, count-based)
- **Used for:** session-level inference + connector calls (`executionCredits` units)
- **Read by:** `checkAndDeductCredits` (callWithHealthCheck.js:132)
- **Written by:** credit-pack purchase webhook (stripeWebhook.js:780-789), subscription credit allocations
- **Personal Vault field:** `users/{uid}.billing.prepaidCredits ?? users/{uid}.prepaidCredits` (dual-write for legacy compat)
- **Workspace field:** `tenants/{tenantId}.prepaidCredits`
- **Deducted at:** call-time, atomically before the call proceeds. Returns `INSUFFICIENT_CREDITS` if short.
- **Top-up path:** credit-pack purchase Stripe checkout (writes `data.metadata.credits` count)

### Pool B — `billing.balance` (data-fee dollar pool, USD-based)
- **Used for:** data-fee pass-through charges (Apollo, ATTOM, GIS, NOTAMIFY, etc.)
- **Read by:** `chargeOverageToStripe` (usageProcessor.js:130)
- **Written by:** `creditBalanceFromCheckout` top-up webhook (usageProcessor.js:282)
- **Personal Vault field:** `users/{uid}.billing.balance`
- **Workspace field:** ⚠️ **DRIFT — no equivalent declared** (open question, §6)
- **Deducted at:** cycle-close (NOT per-call). `recordDataFee` appends to `dataFeeEvents`; `processUsageEvents` aggregates; `chargeOverageToStripe` settles against `billing.balance` first, then Stripe.
- **Top-up path:** balance-top-up Stripe checkout (writes USD `amountNum`)

### Why two pools?
- Credit pool: predictable, per-call, atomic. Users see "X credits remaining." Works great for chat/OCR/connector flows where each call is small + frequent.
- Dollar pool: variable cost per call (a single ATTOM report = $6, a single First Am title = $15). Hard to map to credits cleanly when underlying API costs vary 100×. Dollar-pool model + cycle-close settlement keeps the unit math correct.

This is the right architecture for what the platform does. The drift is in the EDGES — fields, gates, top-up routing.

---

## §5 — Worker flows by pool

### Inference-only workers (chat, doc gen, OCR) → Pool A
- Chat session opens → `checkAndDeductCredits(userId, connectorId, creditCost, context)` deducts from `prepaidCredits`
- Returns `INSUFFICIENT_CREDITS` if short
- User tops up via credit-pack purchase

### Data-fee workers (Site Recon, Marketing/Kling, OFAC screen, etc.) → Pool B
- Pre-call: worker calls `quoteDataFee({source, units, userBalanceCents})` → returns tier `silent`/`warn`/`confirm`
- Worker presents UX per tier (silent ack / inline warn / explicit confirm)
- Call proceeds; worker calls external API
- Post-call: worker calls `recordDataFee({source, userId, tenantId, units})` → appends to `dataFeeEvents` (billed:false)
- Cycle-close: `processUsageEvents` aggregates → `chargeOverageToStripe` deducts from `billing.balance`, charges Stripe overage for remainder

### Hybrid workers (most actually) → BOTH pools
- Inference for the chat layer (Pool A) AND data fees for external pulls (Pool B)
- Example: Site Recon's chat is `simple` credits (Pool A), the ATTOM pulls are data fees (Pool B)
- Wallet UX needs to surface BOTH balances OR collapse them into one user-facing number

---

## §6 — KNOWN DRIFTS + ARCHITECTURE QUESTIONS (Sean ratification needed)

These are the field-mismatch bugs surfaced 2026-06-06 + the architectural decisions that resolve them. Per substrate-precedence rule, no unilateral fix — Sean picks.

### Drift 1 — Top-up vs Site Recon wallet gate (P0)

**File evidence:**
- `usageProcessor.js:282` — top-up webhook writes `users/{uid}.billing.balance`
- `workers/site-recon-001/chatIntent.js:48` — wallet gate reads `users/{uid}.billing.prepaidCredits ?? users/{uid}.prepaidCredits`
- **chatIntent.js:31-35 EXPLICITLY ACKNOWLEDGES the drift in a code comment.** Code knew.

**Result:** User in personal vault tops up $X via Stripe Checkout → money lands in `billing.balance`. Wallet gate sees `prepaidCredits = 0`. "Insufficient." Customer cannot use the worker after top-up.

**Root cause:** Site Recon's wallet gate copied the `checkAndDeductCredits` field set (Pool A) but Site Recon's actual charging mechanism is data-fees (Pool B). The gate mirrors the WRONG pool.

**Three resolution options:**

#### Option A — Fix Site Recon's gate to read Pool B (Site Recon is genuinely Pool B)
- Change `chatIntent.js:48` to read `d.billing?.balance ?? 0`
- Change `chatIntent.js:44` (workspace) — but Pool B has no workspace field yet (see Drift 2)
- Top-up webhook stays as-is
- Update chatIntent.js comment block
- **Smallest blast radius.** Other data-fee workers (Marketing-Kling, OFAC, Apollo-using workers) likely have the same drift and need the same fix
- **Cost:** N file changes where N = data-fee workers with wallet gates

#### Option B — Fix top-up webhook to credit BOTH pools (preserve gate as-is)
- Modify `creditBalanceFromCheckout` to write `billing.balance` += $X AND `prepaidCredits` += $X / $0.02 (50 credits per $)
- Treats every top-up dollar as buying 50 credits + the dollar staying as balance
- **Double-spend risk:** money lands in two pools but is only worth $X in real terms
- **Don't do this.** Architecturally wrong.

#### Option C — Collapse the two pools into one (large refactor, right long-term)
- Pick ONE pool (probably `billing.balance` USD-based since it scales to variable data costs)
- Migrate credit-call gates to compute "credits available = billing.balance / pricing.creditRate"
- Top-up funds the single pool
- All workers read the single pool
- **Largest blast radius.** Touches every worker, every gate, every top-up path. Needs deprecation window for `prepaidCredits` reads.

**T1 recommendation: Option A** for the immediate P0, plus a follow-up audit (Drift 2 + a sweep) to apply the same gate-correction across all data-fee workers. Option C goes on the roadmap as a real cleanup CODEX.

### Drift 2 — Workspace tenants have no Pool B field

**File evidence:**
- `chatIntent.js:44` — workspace path reads `snap.data()?.prepaidCredits ?? 0` (Pool A only)
- `chargeOverageToStripe` (usageProcessor.js:130+) — deducts from `users/{uid}.billing.balance`, no tenant equivalent
- No `tenants/{tenantId}.billing.balance` written anywhere I could find

**Result:** A workspace running a data-fee worker (Site Recon, Marketing-Kling) charges data fees against `dataFeeEvents` with `tenantId` set, but cycle-close settles against the USER's `billing.balance` (not the tenant's), OR the tenant pays via credit-pack purchase (Pool A only).

**Question for Sean:**
- (a) Should workspaces have a `tenants/{id}.billing.balance` Pool B field that mirrors the user pattern?
- (b) Should workspace data-fee charges fall back to the calling user's personal Pool B?
- (c) Should workspaces only use credit-pack purchases (Pool A) and data-fee charges convert through?

T1 recommendation: (a) — workspaces should have parity with users for both pools. Cleanest model, easiest to explain to creators/customers.

### Drift 3 — Credit-pack purchase writes both legacy fields ("49.32 — write to root prepaidCredits AND legacy billing.prepaidCredits")

**File evidence:**
- `stripeWebhook.js:780-789` — credit pack writes both `prepaidCredits` AND `billing.prepaidCredits`
- Comment explicitly says: *"so reads from either path see the increment until the cleanup CODEX"*

**Status:** Pre-existing technical debt. Cleanup CODEX never landed. Not a P0; flag for housekeeping.

---

## §7 — Worker spec discipline (substrate-precedence rule — applies to ALL workers)

Codified in CODEX S52.41 (forthcoming). The worker-spec-author's contract:

### Worker specs CAN declare:
- **Subscription price** (lived-in users; Sean ratifies; lands in catalog)
- **Per-call `creditCost`** for Pool A inference deductions (must be a value from `pricing.executionCredits`)
- **New `SOURCE_REGISTRY` entries** for the worker's external APIs (PR against `dataFee.js`)
- **Cost-gate TIGHTENING** (worker may require explicit confirm at lower thresholds than substrate default)

### Worker specs MUST NOT declare:
- Specific dollar amounts ($X, $Y/parcel — invented number = TC-069 violation)
- Wallet schemas or fields (`billing.balance`, `prepaidCredits` are substrate)
- Stripe SKU IDs (managed in `pricing.js` stripeProducts)
- Cost-gate LOOSENING (any spec rule that permits silent draws above substrate default = validator FAIL)
- Subscription bundling logic (platform-level)
- Multi-currency / promo codes / discount tiers (platform-level)

### Pattern enforcement (PLAT-PRICE-01 lint, to ship):
- Scope: `creators/_template/intent.md`, all `creators/*/intent.md`, all worker spec docs in `docs/`, all worker chat system prompts
- Rule: NO hardcoded dollar amounts (regex `\$\d` and variants) UNLESS adjacent to a `pricing.js` / `dataFee.js` / `callWithHealthCheck.js` reference
- Severity: P1 first 90 days, P0 after grace period
- Suggestion text: *"Pricing belongs in the platform pricing substrate. See docs/BILLING-ARCHITECTURE.md."*

---

## §8 — Why TC-069 slipped past TC-063's discipline (Code's forensic, preserved)

> "Partial congruence is camouflage. The spec almost knew the platform: $29 tier ✓ matches pricing.js, ×2 markup ✓ matches, 20% creator share ✓ matches. Every spot-check happened to land on a true fact. What was wrong wasn't mostly the numbers — it was the implied authority: the spec presented pricing as something the worker defines, when the platform says workers define only their subscription price."

Code's 3-layer diagnosis of why our immune system missed it:
1. **Spec written before discipline existed** — partial congruence as camouflage; spot-checks happened to land on true facts
2. **Grounding regime one layer shallow** — Alex prompts checked against spec/ruleset, but spec was never checked against substrate. "We treated the spec as the constitution and never checked it against federal law."
3. **Tripwires fire on contradiction and missing code, not on jurisdiction** — "This prompt is answering a question the platform already answered" was a new error class with no detector

The lint check (PLAT-PRICE-01) addresses Layer 3 by detecting jurisdiction violations. This doc + CODEX S52.41 address Layers 1+2 by making the substrate one-paste-away for any future spec author + Alex prompt.

---

## §9 — Related

- `docs/CODEX-S52.34-Site-Recon-Step9-Prompt.md` — TC-065/066/067 lessons (sibling failure classes)
- `docs/CODEX-S52.35-Environment-Grounding-Rule.md` — sibling discipline at the environment layer
- `docs/CODEX-S52.37-Canvas-Worker-Parity.md` — canvas substrate discipline
- `docs/CODEX-S52.41-Substrate-Precedence-Rule.md` — forthcoming, codifies the worker-spec contract above
- `docs/QA-001-TEST-CORPUS.md` TC-069 — corpus entry codifying the partial-congruence-as-camouflage failure class
- Memory `project-tc069-pricing-is-hive-primitive-not-worker-spec` — strategic framing + ownership split
- Memory `project-bees-in-hive-composition-architecture` — pricing as the 6th shared hive primitive
- `~/Downloads/LAW-LANDUSE-001_Worker_Spec_v1.md` §10 — first spec to follow this discipline
- `~/Downloads/SITE-RECON-001_Worker_Spec_v1.1.md` — needs v1.2 reconciliation pass per the TC-069 lesson

---

## §10 — Action items (T1 owns; Sean ratifies §6 first)

### Awaiting Sean's ratification (§6)
- [ ] Drift 1 fix path — A, B, or C? T1 recommends A.
- [ ] Drift 2 architecture — (a), (b), or (c)? T1 recommends (a).
- [ ] Drift 3 cleanup priority

### After §6 ratification, T1 ships in sequence
1. Drift 1 fix per ratified option (chatIntent.js gate field change + audit other data-fee workers)
2. Drift 2 fix per ratified option (workspace Pool B parity)
3. `docs/QA-001-TEST-CORPUS.md` TC-069 entry (canonical, with Code's framing)
4. `docs/CODEX-S52.41-Substrate-Precedence-Rule.md` (codifies §7)
5. `scripts/qa-001/checks/plat-price-01-substrate-reference-lint.js` (the validator)
6. `creators/_template/intent.md` Pricing & Billing section with `BILLING-ARCHITECTURE.md` link
7. `/creators/journey` Step 3 Alex prompt — substrate-precedence guard
8. SITE-RECON-001 spec v1.2 reconciliation (apply the discipline retroactively)

### Already shipped
- ✅ LAW-LANDUSE-001 spec §10 refactored to cost-basis-not-prices
- ✅ Memory TC-069 captured with Code's sharper framing
- ✅ This doc

---

## After this doc commits

Every future worker spec — and every future Alex authoring prompt — can ground against this file. The substrate is finally one paste away. The platform's own constitution is now documented.

Code's lesson holds: spec-in-repo is the immune system, but the spec must be checked against substrate, not just against itself. This doc IS the substrate's constitution.
