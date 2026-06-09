# CODEX S52.45 — Canvas/Overlay Root Causes + Platform-Wide Worker Readiness

**Date:** 2026-06-08
**Trigger:** RE-worker demo prep surfaced bugs that turned out to be the *default state*
of the platform, not isolated defects. This CODEX captures the root causes as **classes**
and the mechanisms to apply the fixes across all 265 workers.

---

## The audit (the radar)

`scripts/auditWorkerReadiness.js` scans every `digitalWorkers/*` for: grounded chat
(`workerSystemPrompts/{slug}` exists), `canvasDesigned` flag, real canvas (designed
allowlist), status. Run it any time.

**Baseline (2026-06-08): 265 workers — 5 fully ready, 260 at risk, 6 grounded, ~11 real canvas.**

---

## Bug class 1 — Recommendation overlay hijacks the worker canvas

**Symptom:** the "{vertical} Workers" marketplace panel pops over a worker's canvas on
almost every chat turn.

**Root cause:** "am I inside a worker?" was tracked in **three different contexts**
(`ChatPanel.activeWorkerSlug`, `RightPanelContext.activeWorkerData`,
`WorkerStateContext.activeWorkerId`) and components checked whichever was convenient.
`ChatPanel.activeWorkerSlug` goes **stale/null** across navigation (noted in-code), and
that's the value gating the recommendation trigger at `ChatPanel.jsx` — so inside a worker
it fired `showRecommendations`, flipping the panel to `STATE-3` over the canvas.

**Fix (deployed, applies to ALL workers):**
- `ChatPanel.jsx` — gate the signal-extractor on a reliable composite signal
  (`workerCtx.activeWorkerId || activeWorkerData.workerId/slug || activeWorkerSlug || activeWorkerName`).
- `RightPanelContext.showRecommendations` — bail whenever `activeWorkerData` is set (the
  overlay state can never be entered while a worker is open).
- `RightPanel.jsx` — render guard returns null for STATE-2/3 if a worker is active.

**Lesson:** one canonical "active worker" signal. Divergent per-component flags = leaks.

## Bug class 2 — Wrong/generic canvas for undesigned workers

**Symptom:** Site Recon (a parcel scout) showed a generic "$4.2M pipeline / 8 deals" RE-dev
template; many tabs blank.

**Root cause:** TWO canvas systems — the designed `RealEstateWorkerCanvas` (gated by a
hardcoded 4-slug `RE_CANVAS` allowlist) and the generic `getFixtureForTab` tab system.
A worker with no designed canvas **silently falls back** to a wrong-vertical template.
Also, a chat signal flips `WORKSPACE_HOME → CANVAS`, abandoning the designed canvas for the
generic one ("the canvas flips when I chat").

**Fix (deployed):**
- Explicit `canvasDesigned` flag per worker. `false` → clean "Canvas not designed yet —
  chat-only" notice (Sean's rule: **NO canvas > INCORRECT canvas**). Reversible.
- `scripts/sweepCanvasDesigned.js` set `canvasDesigned:false` on **175** undesigned workers
  (preserved the ~11 designed + auto/aviation vertical fixtures).
- `RightPanel.jsx` — RE workers hold their designed canvas through `CANVAS` state (no flip).

**Lesson:** never silently fall back to a generic template. Be explicit about design state;
absence of a canvas is a first-class, honest UI state.

## Bug class 3 — Grounded-but-toolless chat ("go do it yourself")

**Symptom:** CRE Analyst, asked for debt-holder/servicer contacts, replied "I don't have
access… order a title search / buy Trepp" — despite the platform having ATTOM + Apollo.

**Root cause:** worker grounding prompts don't declare available tools or a "fetch, don't
instruct" rule; tools weren't wired into the chat loop for that worker.

**Fix (CRE Analyst, deployed):**
- New `find_cre_contacts` tool (Apollo `searchPeople`) wired into the chat tool loop
  alongside `find_distressed_cre` (ATTOM).
- Grounding updated: declares both tools + "USE THEM, NEVER DEFLECT" + honest limits.

**Lesson:** a grounded worker must be **tool-aware**. Standard grounding template should list
the worker's data tools and forbid deflection when a tool can answer.

---

## Prevention — Worker Definition-of-Done (extend `validateWorker.js`)

A worker may not go `status: live` unless:
1. **Grounded** — `workerSystemPrompts/{slug}` exists and is tool-aware.
2. **Canvas state explicit** — `canvasDesigned` is `true` (with a real canvas) or `false`
   (chat-only). Never unset.
3. **Tools declared** — any live data source (ATTOM/Apollo/etc.) is wired + named in grounding.
4. **Landing synced** — public `/workers/{slug}` copy + CTA match what the worker does.

Run `scripts/auditWorkerReadiness.js` as the gate.

## Known follow-ups
- Auto (`ad-*`) / aviation (`av-*`) use per-vertical fixtures, NOT per-worker designed
  canvases — same generic-fixture risk; preserved for now, revisit.
- Worker **landing pages** are stale since March + the "Start Free Trial" CTA dumps to the
  generic home instead of the worker. Needs a sync pass (separate task).
- Grounding is the big gap: only 6/265 workers grounded.

## Files touched
- `apps/business/src/components/ChatPanel.jsx`
- `apps/business/src/context/RightPanelContext.jsx`
- `apps/business/src/components/RightPanel/RightPanel.jsx`
- `apps/business/src/components/canvas/sampleData.js` (CRE tab fixtures)
- `functions/functions/index.js` (`find_cre_contacts` tool + handler)
- `scripts/auditWorkerReadiness.js`, `scripts/sweepCanvasDesigned.js`,
  `scripts/groundCREAnalyst.js`, `scripts/fixREWorkerStatusVertical.js`, `scripts/seedREWorkers.js`
