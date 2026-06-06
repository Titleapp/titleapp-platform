# CODEX S52.37 — Canvas-Worker Parity + the Shoot-the-Film Round

**Date:** 2026-06-06
**Status:** Principle RATIFIED by Sean during SITE-RECON-001 Lahaina-address live test. Codifies the gap-plugging mechanism for the platform's most consistently-missed surface: the canvas.
**Resume point:** post-S52.35 (Environment-Grounding Rule) — extends the four-way authoring loop framework to cover not just truth-grounding but UX-grounding
**Source memories:** `project_canvas_worker_parity_principle.md` + `project_canvas_should_be_live_build_preview.md` + `project_chat_reliability_is_the_iphone_story.md` (the template)

---

## The asymmetry that motivates this CODEX

Two of the platform's most important UX surfaces are chat and canvas. Recent sessions made chat markedly reliable. Canvas remained the most consistently-missed surface across the platform — to the point where Sean named it as the recurring product concern.

The asymmetry isn't about engineering effort. It's about which surface got a deliberate 4-part intervention and which didn't:

| Lever | Chat (worked) | Canvas (today) |
|---|---|---|
| Named architectural principle | "Claude-Chat-level + RAAS-reliable" ([[project-chat-reliability-is-the-iphone-story]]) | NONE |
| Universal helper / reusable wrapper | `safeAnthropicCall` (sanitize + timeout + race + fallback) | NONE — every worker bespoke |
| Cross-surface sweep | Task #425 in_progress | NONE |
| Validator enforcement | informal but consistent across new chat surfaces | `validateWorker.js` checks `canvas-tabs.json` exists but NOT whether it renders or binds to data |
| P0 product-survival framing | "Scott has to run his business on his iPhone" | tacit but never named or prioritized |

The result, as Sean named it: "we keep on missing the canvas interplay. It's probably the most common issue I keep seeing across the platform... I don't know how we plug this gap so we stop missing it."

This CODEX names the principle, codifies the mechanism, and locks the order of operations.

---

## The principle

> **Canvas-Worker Parity.** Every worker's canvas must be as functional as its chat the moment it ships to the marketplace. The canvas IS the worker; chat introduces it. A worker without a working, visually-coherent canvas is a half-shipped worker — and the platform will not let it ship.

This is the equivalent of "Claude-Chat-level + RAAS-reliable" for chat — short enough to remember, opinionated enough to drive trade-offs.

---

## The shoot-the-film insight (load-bearing)

Sean named the deeper missing piece during the SITE-RECON-001 build, mid-Lahaina test:

> "Alex did a really good job on pushing back on these audience value proposition but didn't ask any questions about what the user sees (or make recommendations). This is like making a movie by writing the script, detailed shot list, budget, all the contracts, the editing bay set up, but failing to shoot the film. Incorporate this. It's so important. Even boring workers should have some visual attractiveness. Not a video game, but a lot more than just wall of words."

The five Intent Spec rounds Alex runs today map cleanly to film pre-production — and stop there:

| Intent Spec round | Film equivalent |
|---|---|
| Round 1 — Purpose | Script (story premise) |
| Round 2 — Persona + success | Casting + audience |
| Round 3 — Constraints | Budget + legal + clearances |
| Round 4 — Out of scope | Production scope decisions |
| Round 5 — Edge cases handled | Storyboard (what we WILL shoot when X happens) |
| **MISSING — Visual narrative** | **Actually shoot the film. What does the audience SEE?** |

Without a round that explicitly asks "what does the user see in the first 3 seconds before they read a word," workers ship as walls of text dressed up as canvases. Sean's qualifier sets the design bar: *not a video game, but a lot more than just wall of words.*

What that means concretely:
- Domain-appropriate visuals (maps for property workers, charts for accounting workers, timelines for legal workers, badge clusters for verdict workers)
- 3-second visual hierarchy (color-coded status, prominent KPIs, spatially-grouped affordances)
- Layout density using UI patterns (cards, grids, columns, tabs) instead of paragraph blocks
- Even boring domains get visual treatment — a tax-compliance worker isn't a video game, but it doesn't have to look like a CSV either

This is a DESIGN BAR, not just a functional bar.

---

## The 5-part mechanism

The mechanism that worked for chat was 4-part. Apply the same 4-part pattern to canvas, PLUS the 5th part the shoot-the-film insight names. Order in this document is implementation order, not narrative order.

### Part 1 — Name the principle (done by this CODEX)

Canvas-Worker Parity becomes the standing bar. Anyone proposing to ship a worker without functional, visually-coherent canvas must justify the deviation. Default is: not allowed.

### Part 2 — Build the universal helper

Create `bindCanvas(workerSlug, dataFeed, mode)` — the canvas equivalent of `safeAnthropicCall`:

- Reads the worker's `canvas-tabs.json` (declarative tab definitions)
- Subscribes to the worker's data feed (Firestore subscription, ATTOM result, GIS overlay, whatever the worker emits)
- Renders the declared tabs via the canvas skill library (Part 5 below)
- Handles loading/empty/error states uniformly (the canvas equivalent of `safeAnthropicCall`'s graceful fallback)
- Accepts a `mode` parameter:
  - `build` — rendering with SAMPLE data during /creators/journey Step 4-6
  - `live` — customer workspace at runtime
  - `preview` — frozen-state share URL (`/c/<creator>/<worker>?preview=<commit-hash>`)
  - `marketplace` — browse listing card / hero

Every place a worker's canvas appears uses this one helper. Bespoke implementations get migrated to the helper over time, identical pattern to the chat sweep.

### Part 3 — Validator enforcement

Extend `scripts/validateWorker.js` to require a canvas-bind smoke test as part of the creator package. The validator already checks `canvas-tabs.json` exists and has the right schema; extend it to:

- Mount the canvas in a headless renderer (jsdom or Playwright)
- Bind it to the worker's `sample-data.js` via `bindCanvas`
- Assert each declared tab renders without crash + shows non-empty content
- Assert at least one tab updates when a mocked live-data event arrives
- Assert at least one non-text-table visual primitive is present (map / chart / timeline / image / kanban / badge-cluster / dashboard-cards) — pure text-table canvases get a P1 warning at first; P0 after a grace period
- FAIL the validator if the canvas doesn't pass

This applies TC-068's lesson: validator is the canonical contract. Make canvas a contract-enforced requirement, not an aspirational one. Sean's "shoot the film" insight is enforced by Part 5's visual-primitive check.

### Part 4 — Cross-surface sweep (ticket #452, proposed)

Mirror task #425 for canvas:

- Audit every place canvas appears in the codebase (`/creators/journey`, customer workspace, marketplace browse, shareable preview, embedded canvas in chat)
- Apply the `bindCanvas` helper everywhere
- Remove bespoke implementations
- Track to a single ticket; fixed-window, 1–2 weeks

### Part 5 — Intent Spec gets a Visual Narrative round (shoot-the-film)

Extend Alex's authoring flow + `creators/_template/intent.md` + the `/creators/journey` Step 3 ("Design your worker with Alex") to include a Round 6 — **Visual Narrative**.

Questions Alex asks during this round:

- "What does someone see in the first 3 seconds of opening your worker? Before they read any word, what catches their eye?"
- "Pick a domain-appropriate visual primitive: map / chart / timeline / kanban / table-with-colored-badges / image grid / dashboard cards. Which one fits your worker?"
- "If your worker's first response is bad news (no results, blocking issue), what does THAT screen look like? An empty state is also a design decision."
- "Three example screens — happy path, edge case, error — sketch the visual layout in words. We'll generate a render and you can iterate."
- "What's the share-moment? Step 4 lets you share a preview with your network. What screenshot or short video would make a colleague say 'yes, that's exactly what I need'?"

Output of Round 6 lands in `intent.md` as a "Visual Narrative" section + drives the canvas-tabs.json defaults. Code uses it as input when scaffolding the worker's canvas in Step 6.

---

## The Trump Rule — the FLOOR for boring/regulated domains

Sean named the floor below which canvas cannot ship:

> "At minimum think of boring things as at least a deck of information with some graphics. For this property vertical, think of them more as sales or feasibility reports that rely heavily on maps imagery (google maps, street view) charts and such. Let's call this the trump rule. People are generally stupid, heavily medicated and don't read."

The Trump Rule is a named sub-principle of Canvas-Worker Parity. It addresses the "even boring workers should have some visual attractiveness" qualifier from the shoot-the-film insight. The heuristic in plain language: *design for someone who is stupid, heavily medicated, and doesn't read* — a deliberately blunt re-statement of well-documented UX wisdom (F-pattern reading, 5-second tests, deck-design over wall-of-text). The bluntness is the point; it forces designers to internalize the audience.

### The unifying question per vertical

> *"If your worker were a paid report a regulated industry pays $X for today, what does that report look like?"*

SOCIII workers compete against $5K feasibility reports, $500/hr lawyer memos, $300 inspection reports, $2K fundraise data rooms. Those reports are visual-heavy slide decks, map-heavy summaries, chart-heavy dashboards — not walls of text. Canvas must match the reference aesthetic.

### The FLOOR per vertical (validator-enforced after grace period)

| Vertical | Trump Rule reference | Required visual primitives |
|---|---|---|
| Real estate / property | $5K sales-pursuit / feasibility report | Google Maps + Street View + comparison tables with status badges + before/after photo grids + KPI cards |
| Legal | $500/hr lawyer memo / deposition prep | Timeline of events + evidence tiles + citation cards with verdict badges + redaction overlays |
| Accounting / finance | CPA-prepared financial statement | KPI dashboard + period-over-period charts + account drill-down tiles + variance status markers |
| Aviation | ForeFlight / Jeppesen flight planning | Map + sectional chart fragments + METAR/TAF cards + aircraft type photos |
| Compliance / regulatory | Audit binder | Timeline + evidence cards + checklist with attestations + signed-document tiles |
| Healthcare / medevac | Triage dashboard | Map + patient cards with status colors + timeline + vitals chart |
| HR / workforce | Org-chart with roster cards | Photo grid + status-coded role badges + timeline |
| IR / fundraise | LP pitch deck / data room | KPI dashboard + cap table waterfall + commitment timeline + LP grid |

Any worker shipping in one of these verticals without the required visual primitives gets a P1 finding at first (grace period), P0 after the cross-surface sweep completes. New worker verticals get added to the table as the platform expands.

### How the Trump Rule integrates with the 5-part mechanism

- **Part 1 (Principle)** — Trump Rule is the named FLOOR sub-principle
- **Part 2 (bindCanvas helper)** — helper accepts a `vertical` parameter; defaults to vertical-appropriate Trump-Rule-compliant skill bundles (property vertical → map + street view + comparison table + KPI cards baked in)
- **Part 3 (Validator)** — validator rejects canvases that don't meet vertical-appropriate Trump-Rule floor (property worker without a map = FAIL after grace period)
- **Part 4 (Cross-surface sweep, #452)** — sweep audits each shipped worker against its vertical's Trump-Rule floor; lifts existing workers up to bar
- **Part 5 (Visual Narrative Round 6)** — Alex's prompts during Round 6 explicitly reference the vertical's reference document ("we're competing with the $5K feasibility report — what does THAT look like, and how do we match it?")

### Why the FLOOR matters now

Customer's first impression is what makes them stay or churn. A wall-of-text canvas in a vertical where the customer expects map + Street View + KPI grid signals "this isn't actually built for me" within 3 seconds. The customer churns before evaluating the underlying intelligence.

For the property vertical specifically: SITE-RECON-001's canvas (Code's `2d3e9e66` ship) — and every subsequent property worker — MUST have Google Maps as a tab, Street View embedded per parcel, comparison tables with verdict badges, and KPI cards (cost, confidence, time saved). That's the minimum to compete with the existing $5K-per-pursuit market.

## The tool stack that makes Round 6 shippable

Without specific tools, Round 6 would be abstract design questions creators can't visualize. The platform ALREADY has three pieces that make it executable:

### fal.ai image generator (already integrated)

- Canvas mockup rendering at Step 3-4 of `/creators/journey`
- Alex asks "what does your worker look like at first open?" → fal.ai renders → creator iterates via image-to-image refinement
- Once approved, the visual narrative IS the canvas-tab-shape spec — Code scaffolds `canvas-tabs.json` from the approved mockup + the skill library (below)
- Step 4 "shareable preview" becomes the rendered mockup, not a placeholder

### Kling / Runway video generator (task #377 — in queue)

- 20-second walkthrough video of the worker's canvas in action
- That video IS the share-moment artifact for Step 4 — far more impactful than a screenshot
- Marketplace listing gets a Loom-style worker demo as the hero element
- Closes the share-moment loop: aspiration ([[project-hate-and-aspiration-dyad]]) → build → ship → SHARE-WITH-VIDEO → recruit next creator

### Claude Skills (canvas primitive library)

- Each canvas primitive becomes a SKILL with its own data-binding contract:
  - `map` — geographic worker visualizations (Site Recon, real estate, dispatch)
  - `chart` — time-series + comparative analytics (Accounting, Marketing, IR)
  - `timeline` — chronological event streams (Legal, audit trail, project management)
  - `kanban` — workflow stages (HR onboarding, Legal matters, Sales pipeline)
  - `image-grid` — visual asset workers (Brand, Marketing, Creative)
  - `badge-cluster` — verdict / status workers (Site Recon, Compliance, Patent)
  - `dashboard-cards` — KPI-forward workers (Command Center, Accounting Dashboard, IR Pipeline)
  - `table-with-status-badges` — structured-data workers WITH visual layer (Contacts, Workforce, Vault)
- Round 6 Visual Narrative output declares WHICH skills + WHICH data inputs
- `bindCanvas` consumes the worker's skill choices and renders them via the skill library
- New visual primitives extend the platform without re-architecting every worker

### Why this matters

Without these tools, Round 6 is asking creators abstract design questions. WITH them:

1. Alex asks → fal.ai renders → creator approves → spec is set
2. Skill library means creators don't author canvas from scratch — they pick + customize, same way they don't author chat from scratch
3. Video gen closes the share-moment loop with a real artifact
4. Validator compares the worker's actual canvas render against the approved mockup as part of the smoke test

The principle becomes executable on a known timeline. Without these, it would have been a 6-week design-system project. With them, it's a 2-week mechanism that compounds.

---

## Order of operations

### Today (this CODEX commits)
1. Principle named + codified (done by writing this doc)
2. Memory captured: `project_canvas_worker_parity_principle.md` indexed in MEMORY.md
3. Folds existing pending tickets into the architecture: #431 (Step 4 preview never fired), #450 (reorder journey panel), #240 (worker chat misroutes), #338 (IR canvas tab highlight stuck), #339 (worker chat clobbers active canvas tab), #342 (wire remaining 7 IR canvas tabs to live data), canvas-blocking-Accounting bug

### This week
4. Sketch `bindCanvas` API + canvas-bind smoke test specification
5. Identify the canvas surface audit scope (list of canvas surfaces today)
6. Open ticket #452 — cross-surface sweep

### Following 1-2 weeks
7. Code implements `bindCanvas` helper
8. Code extends `validateWorker.js` with canvas-bind + visual-primitive checks
9. Code adds Round 6 Visual Narrative to Alex's authoring flow (web + T1)
10. Code drafts initial Claude Skills for the 8 canvas primitives above
11. Cross-surface sweep — audit + migrate

### Continuous (post-sweep)
12. Every new worker's validator-PASS = canvas-bind smoke test PASS + at least one visual primitive
13. Existing workers grandfathered until the sweep migrates them
14. Marketplace listing surface gets the Kling-rendered worker demo video

---

## What this CODEX explicitly does NOT cover

- Design system color / typography / spacing standards — those belong to a separate design-tokens spec, not this principle
- Marketplace listing page design — `bindCanvas` in `marketplace` mode gives the renderer; the listing page's surrounding chrome is a separate UI spec
- Worker-specific canvas innovations (Site Recon's map, Aviation's flight planner) — those become Claude Skills the moment they're worth generalizing
- Performance budgets for canvas rendering — important but covered by the existing platform performance work, not this principle

---

## Why this principle generalizes beyond the immediate fixes

Every worker the platform has shipped or will ship needs canvas. Without this principle:
- Each worker's canvas is bespoke → re-introduces same bugs each time
- Validator passes workers with broken canvas → marketplace fills with walls of text
- Creator journey ships unfinished feeling → drop-off at Step 6-8
- Share-moment fails → no social proof → marketplace can't recruit
- Customer opens worker → "this is just chat" → churn

With this principle:
- Universal helper means new workers inherit reliability automatically
- Validator gate means failures are caught at the right layer
- Visual Narrative round means design intent is captured before build, not bolted on after
- Tool stack (fal.ai + video + skills) means the design intent is renderable, not aspirational
- Cross-surface sweep brings existing workers up to bar

---

## How this rule de-risks marketplace survival

The marketplace thesis depends on creators completing the journey AND customers finding workers useful. The 9-step `/creators/journey` flow with a placeholder canvas is a demotivation surface — Sean (a senior practitioner with high build velocity) hit this and flagged it; a first-time creator quits.

Customer side: marketplace browse + worker install + first-use experience. Without canvas parity, the customer's first impression is "this is a chatbot with a sidebar." With canvas parity, the customer's first impression is "this thing already understands my domain — I can see what it does."

The 18-month window the [[project-moat-stack-v1-and-manifesto]] establishes for SOCIII's positioning depends on workers that LOOK like they do something. Wall-of-words workers don't compete with Claude/ChatGPT/Gemini even when they have RAAS guardrails.

---

## Related

- [[project-canvas-worker-parity-principle]] — source memory; this CODEX is its codification
- [[project-canvas-should-be-live-build-preview]] — same session, parallel finding; live-build-preview is one specific instance of `bindCanvas` in `build` mode
- [[project-chat-reliability-is-the-iphone-story]] — the template this CODEX copies
- [[project-tc068-internal-contract-mismatch-template-vs-validator]] — same session; reinforces the "validator is the canonical contract" pattern that Part 3 relies on
- [[project-hate-and-aspiration-dyad]] — the share-moment closes the aspiration loop
- [[project-speed-to-falsifiability-is-the-product]] — canvas parity accelerates falsifiability for both creators and customers
- [[project-moat-stack-v1-and-manifesto]] — Canvas-Worker Parity should be the build-quality narrative anchor
- `docs/CODEX-S52.35-Environment-Grounding-Rule.md` — same authority order (validator > template > CODEX > Alex)
- `docs/QA-001-TEST-CORPUS.md` — receives canvas-bind smoke test as a new family
- `scripts/validateWorker.js` — gets extended in Part 3
- `creators/_template/intent.md` — gets Round 6 Visual Narrative section in Part 5
- Existing pending tickets folded into this architecture: #431, #450, #240, #338, #339, #342, canvas-blocking-Accounting
- Future tickets: #452 (cross-surface sweep)
- Future Claude Skills: map / chart / timeline / kanban / image-grid / badge-cluster / dashboard-cards / table-with-status-badges

---

## After this CODEX commits

Canvas joins chat at the same product-survival bar. The marketplace stops shipping wall-of-words workers. The creator journey stops feeling like a checklist with a placeholder. The share-moment artifact becomes real.

The next creator worker build (LAW-LANDUSE-001, per [[project-worker-dependency-clarity-emerges-from-real-builds]]) inherits all five parts of this mechanism plus the tool stack. The visual-narrative round runs before any code is written, the mockup gets rendered + iterated, the validator enforces the canvas-bind smoke test before the worker ships. That build becomes the first end-to-end exercise of Canvas-Worker Parity.

Sean's framing locks: *"both of them firing on both cylinders."*
