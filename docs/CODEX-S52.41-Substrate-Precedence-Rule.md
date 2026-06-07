# CODEX S52.41 — Substrate-Precedence Rule + the Billing Ruling Reference

**Date:** 2026-06-06
**Status:** Codifies the universal worker-spec discipline that emerged from TC-069 (worker spec invents pricing) and Sean's BILLING RULING 2026-06-06 ~16:00 HST (prepaid-only canon). Every future worker spec must obey both.
**Source memories:** `project_tc069_pricing_is_hive_primitive_not_worker_spec.md` + `project_billing_ruling_prepaid_only_canonical.md` + `project_billing_architecture_deep_dive_three_findings.md`
**Source artifact:** `docs/BILLING-ARCHITECTURE.md` (v2, prepaid-only canon)

---

## Why this CODEX exists

LAW-LANDUSE-001's v1 spec invented `$20 / $150 / $750` pricing tiers that the platform's billing layer cannot enforce. SITE-RECON-001's v1.1 spec invented `$4.20 / 10 parcels` rate that diverged from the actual `SOURCE_REGISTRY` `attom:property` rate of `$6.00/parcel`. Both are TC-069 instances: worker specs presenting pricing as something workers DEFINE, when the platform's `pricing.js` + `dataFee.js` substrate AUTHORS pricing.

The diagnosis (Code's forensic, preserved in [[project-tc069-pricing-is-hive-primitive-not-worker-spec]]):

> "Partial congruence is camouflage. The spec almost knew the platform: $29 tier ✓ matches pricing.js, ×2 markup ✓ matches, 20% creator share ✓ matches. Every spot-check happened to land on a true fact. What was wrong wasn't mostly the numbers — it was the implied authority: the spec presented pricing as something the worker defines, when the platform says workers define only their subscription price."

Three layers of immune-system failure (Code):
1. Spec authored before discipline existed — partial congruence as camouflage
2. Grounding regime one layer shallow — Alex prompts checked against spec/ruleset; spec never checked against substrate
3. Tripwires fire on contradiction and missing code, not on jurisdiction — "this prompt is answering a question the platform already answered" was a class of error with no detector

This CODEX is the discipline that fixes Layers 1 + 2. The PLAT-PRICE-01 lint check (forthcoming) fixes Layer 3.

---

## The rule

> **Substrate-Precedence Rule:** Worker specs MAY NOT author substrate behavior. They may only reference canonical substrate documents and tighten substrate gates within their domain.
>
> When a worker spec disagrees with substrate, substrate wins. Always.

Substrate is the set of platform-level systems that govern cross-worker invariants: billing, audit anchor, identity, persona context, entity DTC layer, accepts-contract interop. Worker specs CONSUME these; they do not REDEFINE them.

---

## Authority hierarchy (locked)

When systems disagree, the authority order is:

1. **Validator** (executable contract — TC-068's lesson)
2. **Substrate code + canonical docs** (`pricing.js`, `dataFee.js`, `auditTrailService`, `BILLING-ARCHITECTURE.md`, `CODEX-S52.x-*.md`)
3. **Template** (`creators/_template/`)
4. **CODEX worker-spec grounding docs** (`CODEX-S52.31..34`-type per-step grounding for a specific worker build)
5. **Alex authoring prompts** (web + T1 + every surface)

Worker specs occupy a sub-tier of (4): they consume (2) and (3), are validated by (1), and feed (5). A worker spec that contradicts (2) is invalid by construction.

---

## What worker specs CAN declare

### Pricing levers (the only ones a worker spec may pull)

1. **Subscription price** (lived-in user subscription tier) — author proposes; Sean ratifies; lands in subscription catalog
2. **Per-call `creditCost`** for Line 1 inference deductions — must be a value from `pricing.js.executionCredits` (simple=1cr / standard=5cr / complex=15cr / external_api=25cr / esign=30cr / ocr=50cr)
3. **`SOURCE_REGISTRY` entries** for the worker's external APIs — PR against `services/billing/dataFee.js` with actual API costs + markup
4. **Cost-gate tightening** — worker spec MAY require explicit confirm at lower thresholds than substrate default (silent <$1 / warn <$10 / confirm ≥$10); LOOSENING above substrate default = validator FAIL

### Behavioral levers (no pricing implication)

5. **Persona detection logic** within the worker's domain
6. **RAAS ruleset entries** for the worker's domain-specific rules
7. **Canvas tab declarations** (per the Canvas-Worker Parity / Trump Rule discipline of S52.37)
8. **Bundle shape declarations** — `emits` / `accepts` arrays per the accepts-contract substrate (S52.42 forthcoming)
9. **Workflow / step semantics** within the worker's domain

---

## What worker specs MUST NOT declare

### Pricing forbidden territory

- Specific dollar amounts (`$20`, `$150`, `$6/parcel` — invented number = TC-069 violation; substrate authors prices)
- Per-jurisdiction pricing variation (platform-level only)
- Subscription bundling logic (platform-level)
- Promo codes / discount tiers / multi-currency assumptions (platform-level)
- Stripe SKU IDs (managed in `pricing.js.stripeProducts`)
- Cost-gate LOOSENING (any rule permitting silent draws above substrate default = validator FAIL)

### Substrate-system forbidden territory

- Wallet schemas or fields (`prepaidCredits`, `billing.balance`, etc. are substrate)
- Top-up flow mechanics (substrate-managed)
- Cycle-close / billing-cycle logic (substrate-managed)
- Audit anchor schema or write logic (PLAT-008 substrate)
- Identity / KYC / persona-detection primitives (substrate)
- Entity DTC schema or creation semantics (substrate)
- Cross-worker handoff target lists (per accepts-contract substrate — handoff target discovery is dynamic, never hardcoded)

---

## The BILLING RULING (canonical reference)

Per Sean 2026-06-06 ~16:00 HST, the platform's billing philosophy is **prepaid-only**. Full ruling in `docs/BILLING-ARCHITECTURE.md` v2 + `project_billing_ruling_prepaid_only_canonical.md`. Worker specs inherit by reference:

### What this means for a worker spec author

When writing a worker spec's pricing/billing section, the author:

1. **Declares cost basis only** (what makes the worker cost money — Anthropic calls, external API pulls, processing) — NOT dollar amounts
2. **Declares tier shape only** (what differentiates Q/R/S in scope/depth) — NOT tier prices
3. **References `BILLING-ARCHITECTURE.md`** for the prepaid-only gate semantics, atomic-deduction wire, and payer-resolution logic
4. **Asserts inheritance** of: atomic deduction at event time, gate-reads-enforcement-field, "Billing to: [payer]" surface, refuse-not-float on insufficient
5. **Does NOT redesign** any of the above — the spec consumes the substrate, period

### Worked example (LAW-LANDUSE-001 §10, ruling-aligned)

CORRECT (post-CODEX):

> §10 — Cost basis (NOT pricing). This worker has 3 cost-basis tiers (Q/R/S) differing in depth of analysis. Q = 1× Anthropic + lightweight authority resolver; R = 3-5× Anthropic + full Tier-3 authority resolver + 5-15 comparable cases; S = 8-15× Anthropic + advanced analytics + 50-100 authorities. Per CODEX S52.41, dollar amounts come from the platform pricing substrate (`config/pricing.js` + `SOURCE_REGISTRY` + `BILLING-ARCHITECTURE.md`); this spec does not author them. External authorities consumed: Municode, General Code, CourtListener, CEQAnet, state legislative feeds — PR against `services/billing/dataFee.js` SOURCE_REGISTRY required before launch with actual API costs. Inherits BILLING RULING: prepaid-only, atomic deduction at event time, refuse-not-float on insufficient, "Billing to: [payer]" surface per substrate.

INCORRECT (pre-CODEX, TC-069 violation):

> §10 — Pricing tiers: Q $20 / R $150 / S $750. Wallet gate checks balance. Top-up routes to billing.

---

## Lint enforcement (PLAT-PRICE-01, fixes immune-system Layer 3)

Forthcoming `scripts/qa-001/checks/plat-price-01-substrate-reference-lint.js`:

- **Scope:** `creators/_template/intent.md`, all `creators/*/intent.md`, all worker spec docs (`*Worker_Spec*.md`), all worker chat system prompts in `functions/`
- **Rule:** any line containing a dollar amount (regex `\$\d` and variants, currency keywords) MUST be within 5 lines of a substrate reference (`pricing.js`, `dataFee.js`, `callWithHealthCheck.js`, `BILLING-ARCHITECTURE.md`, `CODEX-S52.41`)
- **Severity:** P1 first 90 days post-CODEX (warning), P0 after grace (lint fail blocks merge)
- **Suggestion text on hit:** *"Pricing belongs in the platform substrate. See `docs/BILLING-ARCHITECTURE.md`. Worker specs may declare cost basis + tier shape only."*
- **Bypass:** intentionally illustrative dollar amounts in EXAMPLES sections may be marked with `<!-- substrate-lint: example -->` HTML comment

---

## Generalization beyond billing

The Substrate-Precedence Rule applies to every substrate system, not just billing. Worker specs inherit-by-reference:

| Substrate system | Canonical authority | Worker-spec discipline |
|---|---|---|
| Pricing/billing/wallet | `pricing.js` + `dataFee.js` + `BILLING-ARCHITECTURE.md` (CODEX S52.41) | Declare cost basis + tier shape; never dollar amounts |
| Audit anchor (PLAT-008) | `auditTrailService` + S52.23 audit-trail architecture | Declare auditTriggers + composition rules; never schema |
| Identity / KYC | `identityVerifications` collection + identity service | Declare KYC requirements per workflow; never primitive |
| Persona context | spine_v2 contacts + persona-detection substrate | Reference persona tiers; never invent persona-detection logic |
| Entity DTC layer | Vault DTC service + per-vertical substrate workers (per [[project-vertical-substrate-worker-pattern-student-record]]) | Read/write entity DTCs; never invent schemas |
| Cross-worker interop | accepts-contract substrate (CODEX S52.42 forthcoming) | Declare emits/accepts; never hardcode handoff targets |
| Environment grounding | S52.35 environment-grounding rule | Defer terminal-tool path-picking to Code; never bare commands |

CODEX S52.41 is the META-RULE: substrate wins. Every other CODEX in this family ratifies a specific substrate-precedence boundary.

---

## Why this rule compounds over time

Each new platform invariant becomes another substrate boundary. Without the rule, every new boundary is a re-invention vector for worker specs. With the rule:

- New billing capability (e.g., multi-currency) → substrate adds it → worker specs inherit by reference, no per-worker change
- New audit primitive → same pattern
- New persona dimension → same pattern
- New interop bundle shape → same pattern

The rule + lint + canonical docs create a system where substrate evolution does NOT require worker-spec migration. Every worker stays current with substrate because it never had its own copy of substrate to drift.

This compounds the [[project-test-dont-rebuild-principle-qa001-expansion]] discipline: catalog triage stays cheap because workers never invented substrate; only the productive surface gets reviewed.

---

## Implementation queue

### Already shipped
- ✅ `docs/BILLING-ARCHITECTURE.md` v2 with BILLING RULING incorporated
- ✅ Memory captures of the ruling + the accepts-contract substrate + the vertical-substrate pattern
- ✅ LAW-LANDUSE-001 spec §10 pre-ruling (cost-basis-not-prices); ruling-aligned API references to follow this session

### This session
- This CODEX (S52.41)
- `docs/QA-001-TEST-CORPUS.md` TC-069 entry with Code's framing
- LAW-LANDUSE-001 spec §10 update referencing this CODEX

### This week
- BILLING substrate code groups 1-6 per `BILLING-ARCHITECTURE.md` §10
- `scripts/qa-001/checks/plat-price-01-substrate-reference-lint.js`
- `creators/_template/intent.md` Pricing & Billing section with substrate reference
- `/creators/journey` Step 3 Alex prompt — substrate-precedence guard

### Next week
- CODEX S52.42 — Accepts-Contract Worker Interop Substrate
- SITE-RECON-001 spec v1.2 reconciliation
- W-002 Real Estate Analyst QA-001 expanded triage (first catalog-triage test case)
- STUDENT-RECORD-001 spec v1 draft (Ruthie-greenlit; education vertical substrate)

---

## Related

- `docs/BILLING-ARCHITECTURE.md` v2 — the substrate this CODEX defers to for billing
- `docs/QA-001-TEST-CORPUS.md` TC-069 — corpus entry with canonical framing
- `docs/CODEX-S52.34-Site-Recon-Step9-Prompt.md` (+ corrigendum) — TC-065/066/067 precedents
- `docs/CODEX-S52.35-Environment-Grounding-Rule.md` — sibling discipline (substrate-precedence for environment state)
- `docs/CODEX-S52.37-Canvas-Worker-Parity.md` — sibling discipline (substrate-precedence for canvas surface)
- Future CODEX S52.42 — Accepts-Contract Worker Interop Substrate
- Memory `project-tc069-pricing-is-hive-primitive-not-worker-spec`
- Memory `project-billing-ruling-prepaid-only-canonical`
- Memory `project-bees-in-hive-composition-architecture` — pricing/billing/wallet as hive primitive 6
- Memory `project-test-dont-rebuild-principle-qa001-expansion` — how substrate-precedence makes catalog triage cheap
- `~/Downloads/LAW-LANDUSE-001_Worker_Spec_v1.md` §10 — first spec to follow this CODEX

---

## After this CODEX commits

Every future worker spec — including STUDENT-RECORD-001 (Ruthie's substrate, queued) and every productive worker on top of it — inherits substrate-precedence + billing-ruling + accepts-contract by reference. Author writes scope-of-work (what the worker does); platform writes price (what it costs). The catalog stops growing fragile.

Per Sean's directive 2026-06-06: "we're making an exponential amount of progress right now." This CODEX is one of the substrate boundaries that protects the velocity — every new worker becomes substrate-correct by construction, not by per-spec review.
