# CODEX S52.43 — Platform RAAS Invariants

**Date:** 2026-06-07
**Status:** Canonical source for platform-level Digital Worker invariants. Every worker spec authored after this CODEX commits inherits these invariants by reference, never by re-specification.
**Pairs with:** CODEX S52.41 (Substrate-Precedence Rule) · CODEX S52.37 (Canvas-Worker Parity + Trump Rule) · BILLING-ARCHITECTURE.md v2 (BILLING RULING — prepaid-only)
**Extracted from:** LAW-LANDUSE-001 Worker Spec v2 §18 (now collapsed to 3-line pointer in v3)
**Origin context:** During the SITE-RECON-001 dogfood + LAW-LANDUSE-001 v2 authoring, Sean named five rule families that govern AI-driven worker behavior independent of any one worker's scope. These are the platform's rules; workers inherit them.

---

## §1 — Why this CODEX exists

Five rule families surfaced during the SITE-RECON-001 build and LAW-LANDUSE-001 v2 spec authoring that are NOT worker-specific. They govern how every AI-driven Digital Worker on the SOCIII platform reasons, surfaces information, charges money, accepts user input, and corrects itself when caught fabricating. They are:

1. **Epistemic Honesty Gate** (EH-01 through EH-07) — what a worker may assert from its own reasoning
2. **CAS Color Protocol** (Crew Alerting System) — how a worker surfaces state visually
3. **Active Persona Gate** (AP-01 through AP-06) — who is paying for what, surfaced explicitly
4. **Reagan Rule** — how a worker treats user-supplied data
5. **Britney Rule** (TC-070) — how a worker corrects itself when caught fabricating
6. **Trump Rule** (CODEX S52.37 — referenced, not re-specified) — per-vertical visual floor

These belong in one canonical CODEX, not redundantly inside every worker spec. LAW-LANDUSE-001 v3 inherits by 3-line pointer to this doc. Every future worker does the same. The Creator Workspace's Alex prompt auto-injects this inheritance into every new spec drafted via Intent Spec rounds. PLAT-SUBSTRATE-01 validator lint enforces inheritance presence.

The fundamental principle: **a confident wrong answer is worse than no answer.** RAAS blocks the former. RAAS surfaces the latter honestly.

---

## §2 — Epistemic Honesty Gate (EH-01 through EH-07)

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **EH-01** No recall citations | 🔴 RED | Every cited authority retrieved from external verified source at analysis time. Model recall of legal text, code section text, or any sourceable content is never a valid citation source. | Block citation. Surface: *"I could not verify this authority from a primary source. Treat as unconfirmed and verify independently."* |
| **EH-02** Confidence floor before output | 🟡 YELLOW | Before generating output, worker scores confidence on: (1) data completeness, (2) authority coverage, (3) jurisdiction coverage, (4) hyper-local coverage. Any dimension below threshold → flag, not suppress. | Degrade confidence band. Name the specific gap and which section it affects. |
| **EH-03** Gap declaration required | 🔴 RED | Every output includes explicit declaration of what was checked and what could not be checked. First-class UI element, not footnote. Required section on every output regardless of tier. | Block output. An output with no gap declaration does not ship. |
| **EH-04** No silent jurisdiction fallback | 🟡 YELLOW | When jurisdiction-specific (Tier-4) baseline not onboarded, worker must not silently fall back to general framework and present it as jurisdiction-specific. | Surface: *"I don't have the specific local code for [jurisdiction] onboarded yet. What follows is the general framework — verify with a local [expert] before acting."* |
| **EH-05** Hyper-local gap declaration | 🔵 BLUE | When entity has detected sub-municipal layers (HOA / Specific Plan / Mello-Roos / PUD / overlay / etc.) that worker cannot fully verify, output explicitly names the gap and its consequence. | Surface as BLUE CAS flag with named consequence and upload affordance. |
| **EH-06** Version pin required | 🔴 RED | Every cited authority includes version in effect at analysis time. Citation without version pin does not ship. | Block citation. Re-pull with version detection or surface as unversioned with explicit caveat. |
| **EH-07** No comparable fabrication | 🔴 RED | Comparable cases / examples / precedents must be retrieved from verifiable sources. Model-recalled comparables are never valid. | Block comparables section. Surface: *"I could not retrieve verified comparable cases. Probability estimates are lower-confidence as a result."* |

### Why these are platform-level, not worker-level

These apply EQUALLY to:
- A legal worker citing code sections
- A medical worker citing literature
- A real estate worker citing comparable sales
- An accounting worker citing tax authorities
- A finance worker citing market data

If we let each worker re-derive these, they will. Result: TC-069 at every spec authoring. Lock once, inherit everywhere.

---

## §3 — CAS Color Protocol (Crew Alerting System)

Borrowed from aviation Crew Alerting Systems (Sean's PC-12 background). The pilot reads aircraft state at a glance before any text. The same protocol applies to every SOCIII canvas element, every status indicator, every roadmap step, every flag stack.

| Color | CAS state | SOCIII meaning | Worker action | User action |
|---|---|---|---|---|
| 🔴 RED | Warning | Hard stop — blocker, illegal, or confidence failure | Block or escalate. Never proceed. | Do not proceed. |
| 🟡 YELLOW | Caution | Proceed with care — named condition present, resolve before committing | Flag + explain + name the blocker | Check before committing |
| 🔵 BLUE | Advisory action | Action item — something needs doing, no time pressure | Surface + offer inline action link | Add to to-do list; keep moving |
| ⚪ WHITE | Status | Awareness only — not good or bad, just true | Surface prominently as data point | Know it. No action required. |
| 🟢 GREEN | Normal | All clear — no blockers, verified, cleared | Proceed | Go |

### Flag stack order (locked)

**RED → YELLOW → BLUE → WHITE → GREEN**

Red always at top. Green always at bottom. This is the safety hierarchy, not an aesthetic choice. A pilot sees warnings before advisories.

### Why BLUE is the missing color (Sean's key insight)

> *"Blue is the missing color in every legal and real estate product ever built. Yellow = stop and look at this. Blue = flag this and keep moving. That distinction is what prevents missed items at scale."*

Most legal and real-estate-vertical software offers RED/YELLOW/GREEN ternary states. BLUE adds a fourth dimension: *"something needs doing, but it's not urgent — surface it so the user doesn't lose track."* WHITE adds a fifth: *"this is a fact you should be aware of — neither good nor bad."*

Five-color CAS protocol gives workers a richer messaging vocabulary than any competitor surface. Customers learn the protocol once on their first worker and apply it across every worker thereafter. Cross-worker UX coherence at the substrate layer.

### Trump Rule alignment

Per CODEX S52.37: if the customer can read the color before reading the words, the design is working. CAS Color Protocol IS the Trump Rule's implementation primitive for status communication.

---

## §4 — Active Persona Gate (AP-01 through AP-06)

Every billable action in the SOCIII platform happens UNDER a specific persona (Personal Vault / Workspace tenant / Side-hustle / etc.). The platform makes that persona explicit at every money-moving moment. Per [[project-billing-architecture-deep-dive-three-findings]] Finding 3 (billing-persona disambiguation): every business user has multiple pockets; the implicit-payer model produces silent misallocation.

| Rule | Assertion | On fail |
|---|---|---|
| **AP-01** Active persona ID stamped on receipt | Every PLAT-008 receipt includes `activePersonaId`, `accountId`, and `walletTransactionId` | Receipt fails verification; cycle-close audit flags |
| **AP-02** Cost-confirm prompt names the payer | Gate prompt format: *"Billing to: [payer name] — $X from your $Y balance. Say 'confirm' — or 'bill personal' to switch ($Z available there)."* | Output blocked; gate cannot fire silently |
| **AP-03** Mid-session persona switch re-fires gate | If active persona changes mid-session, the cost-confirm prompt re-fires before next billable action | Cannot continue without re-confirmation |
| **AP-04** Receipts retain original persona on switch | When persona switches mid-session, prior receipts retain original persona stamp; not retroactively reassigned | Audit chain stays honest; switch is forward-only |
| **AP-05** Account name displayed in every prompt | The session-payer's account display name appears in every cost-confirm prompt, every wallet status surface, every receipt summary | Lint fail at PR time |
| **AP-06** Switch keyword toggles single transaction | User can type `bill personal` / `bill workspace` / `bill <workspace-name>` to switch active payer; switch persists for the session unless re-switched | Substrate, not per-worker; chat dispatch layer owns |

### Substrate location

This is platform substrate, not worker substrate. Workers CONSUME the Active Persona Gate. Workers do NOT implement persona-billing logic. The chat dispatch layer + the wallet gate + the PLAT-008 audit anchor all enforce these rules across every worker uniformly.

---

## §5 — Reagan Rule

**Trust but verify.**

Any data the user provides is accepted graciously and treated as unverified until the worker confirms it from an authoritative external source. The worker never calls the user a liar. It simply does not act on unconfirmed data as fact.

User-supplied documents, addresses, parcels, HOA documents, comparable cases, and any other input are all tagged:

```yaml
source: user_supplied
verified: false
provided_at: <timestamp>
worker_can_cross_check: true | false | partial
```

…until the worker confirms them from an authoritative source. This is not skepticism. **It is epistemic hygiene.**

### Application examples across the platform

- **User uploads HOA CC&Rs:** accepted, OCR analyzed, tagged unverified until cross-referenced against title records or other authoritative source. Worker may reason FROM the document but flags any conclusion as "based on user-supplied document, not independently verified."
- **User provides an APN or address:** accepted as the search input but the worker verifies it resolves to a real parcel before proceeding. Resolution failure surfaces gracefully.
- **User claims a comparable case was approved:** accepted as context but the worker does not cite it as verified unless it can retrieve the decision record independently.
- **User provides a cost estimate or timeline:** accepted as context, surfaced as `user-provided, unverified` in the output. Never relayed as a worker-generated figure (Britney Rule overlap).
- **User uploads a video file:** accepted, tagged `source: user_supplied, verified: false`. Worker may surface it in the canvas via `video-tile/v1` with the unverified badge visible.

### Relationship to other rules

- **Reagan Rule governs INPUTS** (what the user provides to the worker)
- **Britney Rule governs OUTPUTS AFTER CORRECTION** (what the worker does when caught fabricating)
- **Epistemic Honesty Gate governs the worker's OWN ASSERTIONS** (what the worker claims from its own reasoning)

All three work together. Reagan + EH define how the worker handles ground truth at the input + reasoning layers. Britney handles the failure recovery at the output layer.

---

## §6 — Britney Rule (TC-070)

> **RULE: Never add details the source didn't say — relay verbatim or ask. When corrected, stop the behavior in the next response; apologizing while repeating the pattern in the same conversation IS the violation, not the correction.**

The Britney Rule is the behavioral complement to EH-01 (no recall citations) and EH-07 (no comparable fabrication). Those rules govern what the worker outputs. The Britney Rule governs what the worker does **when caught violating them**. The correction must land. Acknowledgment without behavior change is the violation.

Named after the Britney Spears song "Oops! ... I Did It Again" — captures the failure mode where an AI apologizes for hallucinating and then immediately hallucinates again in the next reply.

### Application examples

- **Worker invents a cost estimate not present in substrate:**
  - Britney Rule fires
  - Correct response: *"I don't have a verified cost figure for this — the substrate didn't provide one. Here's what I do know: [verbatim from source]."*
  - INCORRECT response: *"You're right, sorry. Let me try again — the estimate is around $X."* (the apology is followed by another fabrication)

- **Worker cites a code section it cannot retrieve:**
  - EH-01 + Britney Rule both fire
  - Correct response: block the citation; surface as unconfirmed; offer to retrieve from authoritative source

- **Worker repeats an invented timeline after correction:**
  - TC-134 failure (worker-level enforcement)
  - This is the violation, not the original error

### Structural fix (substrate, not prompts)

Better Alex prompts do not reliably fix the Britney Rule. The substrate fix is to **remove the affordance** to fabricate. Specifically:

- Numeric values that should come from substrate (pricing, balances, timelines, comparable counts) are surfaced via **tool calls to substrate helpers** (`pricingPreview()`, `balanceQuery()`, `comparableCountQuery()`), never freehand
- Receipts that confirm actions are rendered via the **system-message channel** (TC-071 fix — server-side render from canvas-payload event, not from text the LLM can imitate)
- Citations + comparables go through **external retrieval only** per EH-01 and EH-07

Each substrate primitive removes one class of fabrication. The Britney Rule is the named behavioral standard; the substrate is the structural enforcement.

### PLAT-PRICE-02 validator lint

Sample Alex transcripts for un-tool-called dollar amounts. Match against known system-message format regexes. Lint fail at PR time for any LLM-generated chat text that imitates substrate-rendered content.

---

## §7 — Trump Rule (reference; full spec in CODEX S52.37)

**Per-vertical visual floor.** Design for the audience that doesn't read. Every screen has to work in three seconds, even for the boring stuff.

Sean's source framing: *"People are generally stupid, heavily medicated and don't read."* Marketing-ready translation: *"Design for the audience that doesn't read. Every screen works in 3 seconds, even for the boring stuff."*

CODEX S52.37 specifies the per-vertical floor table (property = Maps + Street View + KPI cards + verdict badges; legal = timeline + evidence tiles + citation cards; accounting = KPI dashboard + period charts + variance markers; etc.) and the four Canvas-Worker Parity sub-principles (A: default-most-visual-tab / B: plain-English-headers / C: headline-number-adjacent / D: subsequent-invocation-replaces).

The CAS Color Protocol (§3 above) is the Trump Rule's status-communication implementation primitive. Together they form the visual-discipline layer of the SOCIII canvas.

---

## §8 — Worker spec inheritance pattern

Every worker spec authored after this CODEX commits has the following section near the end:

```markdown
## §X — Platform RAAS Invariants (INHERITS CODEX S52.43)

This worker inherits all Platform RAAS Invariants by reference from CODEX S52.43:

- Epistemic Honesty Gate (EH-01 through EH-07)
- CAS Color Protocol — RED / YELLOW / BLUE / WHITE / GREEN
- Active Persona Gate (AP-01 through AP-06)
- Reagan Rule — trust but verify
- Britney Rule (TC-070) — never invent values source didn't provide
- Trump Rule (CODEX S52.37) — per-vertical visual floor

This spec MUST NOT redefine or modify any of these invariants. Worker-specific rules may TIGHTEN substrate policy at the worker level (per CODEX S52.41 substrate-precedence rule); they may not LOOSEN it. Worker-level enforcement of platform invariants is verified by TC-121 through TC-138.
```

Three lines of inheritance pointer replace ~80 lines of re-specification. As new invariants are added to this CODEX over time, every worker inherits the additions automatically — without spec rewrites.

---

## §9 — Creator Workspace authoring injection

The Creator Workspace's Alex Intent Spec rounds (in `/creators/journey`) auto-inject the inheritance pattern from §8 into every new worker spec. Specifically, the Web-Alex system prompt for the authoring intercept includes:

> *"When the creator finishes the Intent Spec rounds, every spec you produce includes a §-Platform-Invariants section inheriting CODEX S52.43 by reference. The creator does not need to know what the invariants are; you scaffold the inheritance section automatically. Their job is scope of work. Your job is to ensure the substrate is inherited."*

Additionally, `creators/_template/intent.md` includes the inheritance section as a pre-populated placeholder so every spec born from the template has it from the start.

This is the **substrate-injection-at-authoring-time** pattern — distinct from the substrate-precedence rule (which blocks redefinition at REVIEW time). The Creator Workspace's authoring AI is the SUBSTRATE'S DELIVERY MECHANISM to creators.

Per Sean's 2026-06-06 design conversation: the creator doesn't need to know an invariant exists to inherit it. The platform handles substrate. The creator handles scope of work.

---

## §10 — Code enforcement at build time

When the four-way authoring loop kicks in (Sean + Web-Alex + T1 + Code), Code's build inherits the invariants STRUCTURALLY:

- **EH-01** enforced by build pattern: every authority cite calls `authorityResolver.js` (external retrieval); model never asserts a citation directly
- **EH-07** enforced same way: comparables go through `comparableCases.js`
- **CAS Color Protocol** enforced by the bundle-shape registry: every status / verdict / flag uses a CAS-aware component
- **Active Persona Gate** enforced by the wallet gate + chat dispatch layer (substrate, not per-worker)
- **Reagan Rule** enforced by input tagging: every user-supplied input is wrapped with `source: user_supplied, verified: false` metadata
- **Britney Rule** enforced by substrate helpers: `pricingPreview()`, `balanceQuery()`, etc. — LLM cannot fabricate substrate-rendered content

The validator gate (`npm run validate-worker`) checks for these structural patterns at PR time. PLAT-PRICE-02 lints LLM transcripts for un-tool-called numeric values. PLAT-RECEIPT-01 lints LLM-generated chat text for system-message format imitation. PLAT-SUBSTRATE-01 verifies every spec has the §X inheritance section.

---

## §11 — Validator enforcement (PLAT-* checks)

| Check | What it verifies | Severity |
|---|---|---|
| **PLAT-SUBSTRATE-01** | Every worker spec contains the §X inheritance pointer to CODEX S52.43 | P0 |
| **PLAT-PRICE-01** | No invented dollar amounts in specs / intent.md / Alex prompts unless adjacent to substrate reference | P1 → P0 after grace |
| **PLAT-PRICE-02** | LLM chat transcripts don't quote dollar amounts without preceding substrate helper tool-call | P1 |
| **PLAT-RECEIPT-01** | LLM-generated chat text doesn't match known system-message format regexes | P0 |
| **PLAT-EH-01** | Authority retrieval calls `authorityResolver.js` (or equivalent) before any cite | P0 |
| **PLAT-EH-07** | Comparable retrieval calls `comparableCases.js` (or equivalent) before any comparable cite | P0 |
| **PLAT-CAS-01** | Canvas elements use CAS-aware components (no hardcoded color values for status) | P1 |
| **PLAT-AP-01** | Every billable action surfaces activePersonaId in receipts | P0 |
| **PLAT-REAGAN-01** | User-supplied inputs tagged `source: user_supplied, verified: false` | P1 |

These checks ship alongside this CODEX. Existing workers may grandfather temporarily; new workers PASS or DON'T MERGE.

---

## §12 — Marketing-manifesto implications

Per [[project-marketing-manifesto-britney-trump-pantheon]] — the named rules in this CODEX become public-facing marketing assets:

- **Britney Rule** — *"We named our AI hallucination rule after a pop song so we'd remember to fix it. Better prompts don't fix hallucination. Removing the affordance does."*
- **Trump Rule** — *"Design for the audience that doesn't read. Every screen works in 3 seconds."*
- **Reagan Rule** — *"Trust but verify. Every user-supplied input gets tagged unverified until we confirm it. We never call the user a liar. We just don't act on unconfirmed data as fact."*
- **CAS Color Protocol** — *"Blue is the missing color in every legal and real estate product ever built. Yellow = stop. Blue = flag and keep moving."*
- **Epistemic Honesty Gate** — *"A confident wrong answer is worse than no answer. Our gate blocks the former and surfaces the latter honestly."*

These five rules form a coherent technical-depth story: SOCIII treats AI failure as a structural engineering problem, not a prompt-engineering problem. Counterintuitive marketing upside — naming the failures publicly makes the platform look honest about money + data + facts.

Investor deck repurposable from this CODEX:
- "AI hallucination as structural problem" (Britney Rule + EH-01 + TC-071 trio)
- "Audit substrate's customer-facing trust layer" (signed receipts + AP-01 + Deposition Rule)
- "Every worker inherits discipline by reference, not by re-implementation" (substrate-precedence + Creator Workspace injection)

---

## §13 — Inheritance examples (existing workers)

### LAW-LANDUSE-001 v3 §18

```markdown
This worker inherits all Platform RAAS Invariants by reference from CODEX S52.43:
- Epistemic Honesty Gate (EH-01 through EH-07)
- CAS Color Protocol — RED / YELLOW / BLUE / WHITE / GREEN
- Active Persona Gate (AP-01 through AP-06)
- Reagan Rule — trust but verify
- Britney Rule (TC-070) — never invent values source didn't provide
- Trump Rule (CODEX S52.37) — per-vertical visual floor

This spec MUST NOT redefine or modify any of these invariants...
```

### SITE-RECON-001 (retroactive update queued for v1.2 reconciliation)

The same inheritance section gets added to SITE-RECON-001 spec v1.2 as part of the post-ship reconciliation pass.

### Future workers — FEASIBILITY-001, TITLE-ABSTRACT-001, ZONING-001, etc.

The Creator Workspace scaffolds the inheritance section into every new spec via the template + Alex prompt injection (§9). Authors don't write the section; it's already there.

---

## §14 — Operating model going forward

Each new platform invariant becomes ONE more rule family in this CODEX. Worker specs inherit the additions automatically. The catalog stays current via substrate evolution, never via mass spec rewrites — same pattern as the chat-reliability sweep (#425) and the canvas-worker parity sweep (#452) at a higher abstraction layer.

This is the compounding moat: every new failure class we name + structurally fix becomes:
1. A new section in this CODEX
2. A new lint check in QA-001's PLAT-* family
3. A new sentence in the Creator Workspace's Alex prompt
4. Zero spec rewrites across the catalog

The catalog gets stronger automatically.

---

## §15 — Related

- `docs/CODEX-S52.41-Substrate-Precedence-Rule.md` — sibling discipline; substrate wins over spec; this CODEX IS substrate
- `docs/CODEX-S52.37-Canvas-Worker-Parity.md` — sibling discipline; Trump Rule + CAS Color Protocol implementation primitive
- `docs/CODEX-S52.35-Environment-Grounding-Rule.md` — sibling discipline at the environment-state layer
- `docs/BILLING-ARCHITECTURE.md` v2 — BILLING RULING substrate (prepaid-only); Active Persona Gate operates within this billing canon
- `docs/QA-001-TEST-CORPUS.md` — TC-068/069/070/071 corpus entries; PLAT-* lint checks defined here
- `creators/_template/intent.md` — inheritance section pre-populated
- `~/Downloads/LAW-LANDUSE-001_Worker_Spec_v3.md` §18 — first inheritance pointer (3 lines)
- Memory: `project-marketing-manifesto-britney-trump-pantheon` — marketing assets
- Memory: `project-billing-architecture-deep-dive-three-findings` — Active Persona Gate source
- Memory: `project-britney-rule-alex-chat-layer-tc069` — Britney Rule source
- Memory: `project-tc071-fake-execution-receipt` — TC-071 + substrate fix
- Memory: `project-billing-ruling-prepaid-only-canonical` — billing canon
- Memory: `project-bees-in-hive-composition-architecture` — pricing/billing/persona as hive primitives

---

## §16 — After this CODEX commits

Every future worker spec — including LAW-LANDUSE-001 build, TITLE-ABSTRACT, ZONING-CONSUMER, FEASIBILITY-001, W-002 cleanup, STUDENT-RECORD-001, Communications Hub, and every successor — inherits the invariants by reference. No spec needs to re-derive them. No spec author needs to know them by heart. The Creator Workspace handles substrate; the creator handles scope of work.

Authors write the worker. The platform writes the discipline.
