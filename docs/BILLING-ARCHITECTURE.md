# BILLING-ARCHITECTURE.md — Canonical substrate reference

**Date:** 2026-06-06 · **Updated:** 2026-06-06 ~16:30 HST with Sean's BILLING RULING (prepaid-only canon)
**Purpose:** Single source of truth for how pricing + billing + wallet works across all SOCIII workers. Authored after the LAW-LANDUSE-001 spec invented untethered pricing (TC-069), the top-up-vs-gate field drift surfaced during Sean's Site Recon test, and Sean ratified the prepaid-only billing canon resolving the platform's open philosophy question. Per the substrate-precedence rule (CODEX S52.41), worker specs MUST reference this doc; they may never invent billing mechanics.
**Status:** v2 — incorporates Sean's BILLING RULING. The earlier "Pool A vs Pool B / drifts as open questions" framing was itself partial-congruence drift (TC-068 at the substrate-doc layer); revised. Substrate work proceeds against this doc.

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

## §4 — The canonical billing model: prepaid-only

Per Sean's BILLING RULING 2026-06-06 ~16:00 HST: **prepaid-only across both revenue lines that touch user balance**. The first-draft of this doc framed billing as a two-pool architecture with open drift questions; that framing was itself partial-congruence as camouflage (correct facts at the field layer, wrong layer of analysis). The platform's canonical model:

### Single user balance pool, written by every top-up, read by every gate, deducted by every charge

- **Personal Vault field:** `users/{uid}.billing.prepaidCredits` (with `users/{uid}.prepaidCredits` root mirror for legacy reads)
- **Workspace field:** `tenants/{tenantId}.prepaidCredits`
- **Top-up writes:** Stripe checkout (`balance_topup` or `credit_pack`) credits THIS field
- **Gate reads:** session credit check (`checkAndDeductCredits`) AND worker wallet gate (Site Recon's `chatIntent.js`) read THIS field
- **Charge deducts:** atomic at event time — `recordDataFee` decrements THIS field; `checkAndDeductCredits` decrements THIS field
- **Insufficient = refuse, never float:** no overflow-to-invoice; auto-recharge (`checkBalanceRecharge` / `handleUpdateAutoRecharge`) is the convenience layer that makes prepaid livable

### What the ruling eliminated

The pre-ruling code had `billing.balance` (USD pool for cycle-close-aggregated data fees) AND `prepaidCredits` (count pool for atomic call-time deductions) as two half-wired models. Ruling resolves to single-pool-prepaid. Implications:

- `billing.balance` field gets repurposed: now mirrors `prepaidCredits` for backward compatibility; long-term cleanup CODEX can remove it
- `chargeOverageToStripe` (usageProcessor.js:130+) repurposed: NOT a charge path for data fees anymore (data fees deduct atomically at event time); becomes a **reconciliation report only** for inference-credit subscription overages
- `dataFeeEvents` collection role unchanged: append-only audit ledger for deposition (Line 3 audit-trail role preserved per [[feedback-deposition-rule-lives-in-dev-docs]]), but events now record DEDUCTIONS TAKEN, not charges TO COLLECT

### Why prepaid-only

- **Deposition-grade clarity** — receipts record deductions taken at event time, atomically. Three years later, "did this customer pay for this call?" is unambiguous
- **No silent debt accumulation** — users cannot run up bills they didn't consent to. Insufficient = refuse
- **Single source of truth for "can this run?"** — gate and meter read/write the same field; cannot diverge
- **Auto-recharge handles UX cost** — users who don't want to think set auto-recharge and forget; prepaid livable without prepaid friction

---

## §5 — Worker flows under the prepaid-only canon

### Every external-cost call (Lines 1 + 2 + 3) gates against the same pool

- Pre-call: worker calls `quoteDataFee({source, units, userBalanceCents})` → returns tier (silent <$1 / warn <$10 / confirm ≥$10 or ≥15% of balance) + minimum-balance check
- Worker presents UX per tier with **payer-named gate prompt** per [[project-billing-ruling-prepaid-only-canonical]] point 6: *"Billing to: [payer] — $X from your $Y balance. Say 'confirm' — or 'bill personal' to switch."*
- User confirms; worker calls external API
- Post-call: worker calls `recordDataFee({source, userId, tenantId, units})` → atomically decrements payer pool + appends event to `dataFeeEvents` (status: `deducted: true`)
- Failure to deduct = refuse; the call does NOT fire if the pool can't cover it

### Quote-phase coverage (per ruling point 1)

Even quote-phase queries (the 40¢ `attom:snapshot` calls Sean caught) must gate against balance. Free exploration ends exactly where provider fees begin. Implementation: `quoteDataFee` becomes a gating call (deducts atomically if it succeeds), not a passive estimate.

### Session inference (Line 1) — same model

- Worker session opens → `checkAndDeductCredits(userId, connectorId, creditCost, context)` deducts from `prepaidCredits`
- Returns `INSUFFICIENT_CREDITS` if short
- Same field as data fees; same auto-recharge; same gate prompt format

### Payer resolution (universal across worker flows)

Both gates resolve the payer pool via the same logic:
- If `tenantId` is set AND not `"vault"` / `"personal"` / `"guest-*"` → deduct from `tenants/{tenantId}.prepaidCredits`
- Else → deduct from `users/{uid}.billing.prepaidCredits` (with root `users/{uid}.prepaidCredits` mirror)
- The chat-dispatch substrate (per the billing-persona ruling point 6) MUST name the payer in the gate prompt + offer a switch keyword (`bill personal` / `bill workspace`)

---

## §6 — DRIFTS RESOLVED BY THE RULING (no open questions remain)

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

**RULING APPLIED:** Site Recon's gate is now CORRECT — it always read the enforcement field (`prepaidCredits` family). The drift was the top-up webhook writing the wrong field (`billing.balance`), not the gate reading the wrong field. Ruling point 4 mandates: top-up must credit the enforcement field. Fix surface: `creditBalanceFromCheckout` in `usageProcessor.js:274-299` writes `prepaidCredits` + `billing.prepaidCredits` (mirroring credit-pack purchase pattern at `stripeWebhook.js:780-789`).

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

**RULING APPLIED:** Workspaces use `tenants/{tenantId}.prepaidCredits` as their canonical pool — same field as `checkAndDeductCredits` already uses. The "no Pool B for workspace" framing was the wrong framing; with prepaid-only canon, there is only one pool per pool-holder (user or tenant), and workspaces already have it. Data-fee deductions at event time will hit this field via the same payer-resolution logic `checkAndDeductCredits` uses today.

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

## §10 — Implementation queue (T1 executes per BILLING RULING)

Sequence-locked. Each group its own commit; deploy after Group 2 + Group 4 land together so the gate matches the meter.

### Group 1 — Top-up credits the enforcement field (P0 prereq)
- `functions/functions/billing/usageProcessor.js:274-299` `creditBalanceFromCheckout` — write `prepaidCredits` (root) + `billing.prepaidCredits` (legacy mirror) atomically; preserve existing `billing.balance` write for auto-recharge threshold backward compatibility (housekeeping CODEX can remove later)

### Group 2 — Atomic deduction at recordDataFee (the missing wire)
- `functions/functions/services/billing/dataFee.js:103` `recordDataFee` — wrap in Firestore transaction: (a) resolve payer per universal logic, (b) read balance, (c) verify ≥ cost, (d) deduct atomically, (e) append `dataFeeEvents` with status `deducted: true`
- Failure to deduct (insufficient balance) → throw `INSUFFICIENT_BALANCE`, external API call does NOT fire
- `quoteDataFee` callers must trap this error and surface refusal UX

### Group 3 — Wallet gate alignment (already correct, just update comments)
- `functions/functions/workers/site-recon-001/chatIntent.js` lines 31-35 — update comment block to reflect ruling-applied state; gate logic stays as-is (it was always correct per the ruling)

### Group 4 — Quote-phase coverage (ruling point 1)
- Substrate layer above `quoteDataFee` MUST atomically deduct or refuse for snapshot-tier sources (`attom:snapshot`, `apollo:org_search`-quote-phase, etc.)
- No silent quote-phase charges — every cost-incurring call gates against balance

### Group 5 — Billing-persona surface (ruling point 6)
- Chat dispatch layer (substrate, NOT per-worker) — gate prompt becomes "Billing to: [payer] — $X from your $Y balance. Say 'confirm' — or 'bill personal' to switch ($Z available there)."
- Switch keywords: `bill personal` / `bill workspace` / `bill <workspace-name>` — switch active payer for this transaction; persists for the session unless re-switched
- Receipt UX (canvas metadata bar + chat completion line) surfaces "billed to [payer]" — deposition-grade clarity

### Group 6 — Cycle-close repurposed (ruling point 5)
- `functions/functions/billing/usageProcessor.js` `processUsageEvents` — no longer aggregates data-fee events into Stripe invoice; becomes monthly reconciliation report (per-source per-payer)
- `chargeOverageToStripe` — keep for inference-credit subscription overages (Line 1 still uses Stripe overage path) + audit-trail meter overages (Line 3); data-fee path no longer routes here
- Mark today's ~$242 of `billed: false` test events as `excluded: true, reason: "pre-ruling-test-data"` during the substrate-migration deploy

### Already shipped this session
- ✅ LAW-LANDUSE-001 spec §10 refactored to cost-basis-not-prices (pre-ruling)
- ✅ Memory TC-069 with Code's sharper framing
- ✅ Memory `project-billing-ruling-prepaid-only-canonical` (the ruling)
- ✅ Memory `project-bees-in-hive-composition-architecture` (pricing as hive primitive)
- ✅ Memory `project-test-dont-rebuild-principle-qa001-expansion`
- ✅ This doc (v2)

### Doc sweep (this turn)
- `docs/CODEX-S52.41-Substrate-Precedence-Rule.md` — codifies §7 worker-spec discipline + billing ruling reference
- `docs/QA-001-TEST-CORPUS.md` TC-069 entry — canonical with Code's framing
- `~/Downloads/LAW-LANDUSE-001_Worker_Spec_v1.md` §10 — ruling-aligned API references

### Future (queued, Sean ratifies before each code group ships)
- `scripts/qa-001/checks/plat-price-01-substrate-reference-lint.js` (Layer 3 tripwire fix)
- `creators/_template/intent.md` Pricing & Billing section
- `/creators/journey` Step 3 Alex prompt — substrate-precedence guard
- `SITE-RECON-001_Worker_Spec_v1.2.md` reconciliation pass

---

## After this doc commits

Every future worker spec — and every future Alex authoring prompt — can ground against this file. The substrate is finally one paste away. The platform's own constitution is now documented.

Code's lesson holds: spec-in-repo is the immune system, but the spec must be checked against substrate, not just against itself. This doc IS the substrate's constitution.
