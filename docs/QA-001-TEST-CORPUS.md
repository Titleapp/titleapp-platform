# QA-001 — Test Corpus

**Author:** Sean + Claude · 2026-05-29 (initiated mid-debug)
**Purpose:** Living catalog of failure modes captured from real production bugs. When QA-001 ships, every test case below becomes an assertion in the harness. Each bug we hit going forward gets added here.
**Predecessor:** [CODEX-51.27 Framing Doc](./CODEX-51.27-QA-001-and-Intent-Spec-Framework.md)

## Why this file exists

Sean's question to Claude on 2026-05-29 ~09:35 HT: *"Based on your conversation yesterday you said that we could capture this kind of stuff without a human having sit and screen shot. Are we learning from this round on what that worker will be looking for?"*

Honest answer: not until that moment. Debugging the HR/Fundraise canvas tabs surfaced ~6 distinct failure modes across three layers (catalog, sync helper, frontend) — and Claude was fixing each one without writing them down as test cases. This file fixes that. Every bug captured here is one QA-001 will catch the moment a regression re-introduces it.

**Discipline:** Whenever a worker bug is diagnosed, before fixing it, add it here. The fix can come second.

---

## Test families (from framing doc, recapped)

1. **Catalog ↔ Firestore parity** — does the Firestore mirror match the JSON catalog?
2. **Headless Playwright canvas walkthrough** — does each declared tab render without crash?
3. **Endpoint smoke** — do declared backend endpoints return 2xx?
4. **Chat LLM-as-judge** — do responses satisfy successCriteria?
5. **RAAS module load + isolation** — does the right ruleset load per worker?

---

## Test cases captured during S51.28 debug session

### TC-001 — workerSync helper writes all catalog structural fields
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P0 (load-bearing — silently dropped 4 fields for every worker)
- **Real bug:** `helpers/workerSync.js` `.set()` call did not include `canvasTabs`, `constraintRaasSources`, `controlCenterContribution`, or `intent`. Any catalog edit to those fields silently failed to reach `digitalWorkers/{slug}`. Frontend fell back to generic Overview/Activity/Resources defaults.
- **Test:** For every worker in catalog, pick one of the four fields, modify the catalog JSON, run sync, read Firestore mirror, assert Firestore value matches catalog value.
- **Pass:** Firestore.canvasTabs === catalog.canvasTabs (deep equal)
- **Fail signal:** Firestore field missing OR generic defaults (`[Overview, Activity, Resources]`)
- **Discovery method:** Direct Firestore read after sync showed 3 generic tabs instead of declared 9. Diagnosed by reading helper source.

### TC-002 — Slug-aliased Firestore docs stay in sync
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P1 (affects workers whose canonical slug changed at some point)
- **Real bug:** Catalog declared `slug: "hr-people"` but workspace memberships still keyed by legacy `platform-hr` slug. Sync wrote to `digitalWorkers/hr-people` but `digitalWorkers/platform-hr` had stale 4-tab data. Frontend looked up `platform-hr` and got stale view.
- **Test:** For each catalog entry, check if Firestore has additional docs with related slug patterns (legacy aliases). If found, assert they have identical canvasTabs.
- **Pass:** All slug-aliased docs have matching canvasTabs (or no aliases exist)
- **Fail signal:** Two docs with same `intent.problem` but different `canvasTabs`
- **Discovery method:** Sean reloaded; saw old tabs despite verified sync. Listed all Firestore docs for `*hr*` slugs — found two.
- **Follow-up needed:** Aliasing should be declarative. Add `aliases: ["platform-hr"]` to catalog entry so workerSync writes both. Then deprecate aliases over time.

### TC-003 — Sidebar sub-nav matches catalog canvasTabs
- **Family:** 2 (Headless Playwright walkthrough — extended to navigation)
- **Severity:** P1 (UX inconsistency confuses users about what worker can do)
- **Real bug:** `Sidebar.jsx` line 880-891 hardcodes `platform-hr` and `hr-people` sub-nav as `[Employees, Scheduling, Compliance, Onboarding]`. Catalog declares 9 different tabs. Sidebar expansion shows 4 legacy items, top-bar shows 9 catalog items — same worker, two truth sources.
- **Test:** For each worker in catalog, headless-render sidebar expansion. Compare sub-nav labels to catalog.canvasTabs labels.
- **Pass:** Sub-nav labels are a subset (or equal) of catalog.canvasTabs labels
- **Fail signal:** Sub-nav contains labels not in catalog.canvasTabs (= hardcoded legacy)
- **Discovery method:** Sean's screenshot showed conflicting tab sets. Grep'd Sidebar.jsx for hardcoded HR.
- **Follow-up needed:** Sidebar should derive sub-nav from worker.canvasTabs filtered to view=admin (or similar). Kill the hardcoded dictionary.

### TC-004 — Worker default landing page reflects current catalog
- **Family:** 2 (Headless Playwright walkthrough)
- **Severity:** P2 (cosmetic but signals stale content to users)
- **Real bug:** `WorkerCanvas` component renders worker default landing view with hardcoded KPI cards ("Pipeline Value $28.5M", "Team Size --") that predate the canvas-tab system. New users see content unrelated to the worker's declared intent.
- **Test:** Render worker home (no tab selected). Extract visible KPI labels. Assert they appear in catalog `intent.canonicalJourneys` or `controlCenterContribution.kpis`.
- **Pass:** Landing KPIs map to declared intent
- **Fail signal:** Landing shows KPIs unrelated to declared journeys (legacy content)
- **Discovery method:** Screenshots showed $28.5M LP-side data on FOUNDER-side Fundraise worker. Mismatch between landing content and worker purpose.

### TC-005 — Demo fixtures fire on tab click
- **Family:** 2 + 4 (Playwright + behavioral)
- **Severity:** P2 (first-visit UX — new users see empty state instead of demo)
- **Real bug:** `WorkerHomeRenderer` first-visit logic explicitly keeps the landing page until user clicks a tab. New users see hardcoded landing instead of fixtures showing what the worker can do.
- **Test:** Render worker home. Click each declared canvas tab. Assert each click produces a canvas card with `demoMode === true` (SAMPLE chip rendered).
- **Pass:** Each tab click renders a non-empty fixture card
- **Fail signal:** Tab click does nothing OR fixture missing for that tab id
- **Discovery method:** Sean noted that screenshots showed default landing with tabs above but no fixture content visible. Behavior is by-design but worth measuring.

### TC-006 — Worker slug consistency across all touchpoints
- **Family:** 1 (Catalog ↔ Firestore parity — extended)
- **Severity:** P1 (cascading failures when slug doesn't match)
- **Real bug:** HR has THREE slug variants in active use:
  - Catalog: `hr-people`
  - Sample fixture keys: `platform-hr`
  - Sidebar sub-nav keys: both `platform-hr` AND `hr-people`
  - Workspace subscription: `platform-hr` (legacy)
- **Test:** For each catalog worker, grep frontend codebase for usages of the slug. If multiple variants found, fail.
- **Pass:** Only one slug variant referenced
- **Fail signal:** Multiple slug variants → frontend/backend/fixtures will diverge
- **Discovery method:** Six grep searches across this debug session. Multiple variants in different places.
- **Follow-up needed:** Pick ONE canonical slug per worker. Add to catalog as `slug` + `aliases: []`. Use aliases for migration; treat any code reference to alias as a deprecation warning.

### TC-007 — Frontend rebuild includes latest catalog read paths
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P2 (transient — appears as "old tabs" until rebuild + deploy)
- **Real bug:** Catalog edits change Firestore. But if frontend JS bundle is cached / outdated, users see stale UI for hours after fix.
- **Test:** After catalog deploy, hit hosting URL and inspect `<script>` references. Assert `index-{hash}.js` hash is newer than catalog deploy timestamp.
- **Pass:** Bundle hash newer than last catalog write
- **Fail signal:** Bundle predates catalog change (users still getting stale content)
- **Discovery method:** Multiple "hard reload" instructions needed during debug.

### TC-008 — Fixture key matches actual worker slug
- **Family:** 1 + 4
- **Severity:** P1 (fixtures don't render even when wired correctly)
- **Real bug:** `sampleData.js` `WORKER_SAMPLES["platform-hr"]` was authored, but worker slug in workspace is `hr-people` (or now `platform-hr` after alias mirror — but the canonical catalog slug is `hr-people`). Fixture lookup by `worker.slug` might not match.
- **Test:** For each catalog worker, iterate canvas tabs, call `getFixtureForTab(worker, tab.id)`. Assert non-null fixture returned for at least one tab.
- **Pass:** Every worker has at least one tab with a fixture matching its slug
- **Fail signal:** All fixture lookups return null (slug mismatch with sampleData keys)
- **Discovery method:** Anticipated during sampleData.js authoring — flagged as known mismatch risk for HR specifically.

---

## Open / not-yet-captured failure modes

### TC-009 — Tab `signal` field required for click handler to fire
- **Family:** 2 (Headless Playwright walkthrough)
- **Severity:** P0 (tabs render but are entirely non-interactive — discoverable only via human click)
- **Real bug:** Catalog `canvasTabs` entries declare `{id, label, view, description}` but no `signal` field. WorkerHomeRenderer calls `lookupSignal(tab.signal)` on click; with `tab.signal === undefined` the lookup returns null, the click handler silently exits, and nothing happens. Tabs LOOK clickable but are dead. Hard to notice visually since hover state still applies.
- **Test:** For each declared canvas tab, assert `signal` field is non-empty string AND `lookupSignal(signal)` resolves to a valid signal definition.
- **Pass:** Every tab has a resolvable signal
- **Fail signal:** Tab missing `signal` field, OR signal string doesn't match any registered signal
- **Discovery method:** Sean clicked "People" tab on HR; nothing happened. Confirmed by reading WorkerHomeRenderer code: `const resolved = lookupSignal(def.signal); if (!resolved) return;`
- **Why this matters for QA-001:** This is the EXACT class of bug QA-001 catches and Sean's eyeballs can't. The tabs render so a visual diff looks fine; the click is non-interactive so only an automated click-and-assert catches it.

---

(slot for next bug)

---

## When to ship QA-001

The corpus grows organically. When we have ~15-20 test cases captured (we have 8 from one debug session — extrapolate), the harness has enough scope to be useful. At that point:

1. Phase 0 from framing doc — HR Intent Spec backfill
2. Phase 2 — Catalog↔FS parity test (TC-001, TC-002, TC-006, TC-007, TC-008 all live in this family)
3. Phase 6 — Playwright walkthrough (TC-003, TC-004, TC-005)

That's three test families lit up from the corpus we've already captured. Each one prevents a real bug we just hit.

---

## Discipline going forward (rule)

**Before fixing a worker bug:** add it to this corpus. The fix can come second. Never let a bug get fixed without capturing the test case — that's how the harness gets built without a separate sprint.

This file is the QA-001 backlog. It's also Anthropic-style "feedback memory" but at the platform level.
