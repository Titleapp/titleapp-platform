# CODEX S52.44 — Real-Estate Worker Suite + Canvas-Substrate Fixes

**Date:** 2026-06-07
**Status:** Session wrap. Four real-estate Digital Workers built end-to-end (spec → canvas → SDK artifacts → catalog → Firestore seed → validated), and the structural substrate bugs that were hiding shipped workers were root-caused and fixed.
**Pairs with:** CODEX S52.43 (Platform RAAS Invariants) · S52.41 (Substrate-Precedence) · S52.37 (Canvas-Worker Parity) · BILLING RULING
**Why this exists:** the prior session's work was lost to a terminal restart with no wrap CODEX. This documents the S52.44 session so it survives.

---

## §1 — What shipped: the RE worker suite

Four creator workers built in `creators/sean-combs/`, all FREE workers (pay-per-data-pull), all inheriting CODEX S52.43 invariants, all consuming `parcel-bundle/v1`. The developer workflow spine:

```
SITE-RECON-001 → TITLE-ABSTRACT-001 → LAW-LANDUSE-001 / ZONING-001 → FEASIBILITY-001 → W-002 Analyst
   (data)           (title+rights)        (legal / consumer zoning)      (market study)   (financial)
```

| Worker | Tabs (default first) | Emits | Status |
|---|---|---|---|
| **TITLE-ABSTRACT-001** | Ownership chain · Encumbrances · Recorded docs · Rights stack · Plain English | `title-abstract-bundle/v1` | DoD ✅ |
| **LAW-LANDUSE-001** | Entitlement Roadmap · Citations · Comparable cases · Plain English | `feasibility-roadmap/v1`, `legal-opinion-bundle/v1` | DoD ✅ |
| **ZONING-001** (consumer) | Zoning verdict · Permitted uses · Overlays · Plain English | `zoning-verdict-bundle/v1`, `legal-question-bundle/v1`, `permit-intent-bundle/v1` | DoD ✅ |
| **FEASIBILITY-001** | Demand · Supply · Comps · Demographics · Sources | `market-snapshot/v1`, `feasibility-study/v1`, `investment-market-study/v1` | DoD ✅ |

Each has: `WORKER-SPEC.md` (full §1-18, LAW-LANDUSE v3 depth), `intent.md`, `canvas-tabs.json`, `service.js`, `sample-data.js`, `tests/assertions.md`. All four PASS `npm run validate-worker`. Bundle shapes written: `zoning-verdict-bundle`, `feasibility-study`, `legal-question-bundle`, `permit-intent-bundle` (joining the pre-existing `parcel-bundle`, `title-abstract-bundle`, `video-tile`).

**Differentiator — the Rights Stack tab** (Title Abstract): vertical air→surface→below-ground stratum review (air/spectrum/water/carbon/mineral/oil-gas/digital — held/severed/unverified). **Stratum bands are earth-tone by elevation; CAS color appears ONLY on the per-stratum status badge** (Sean's ruling: a severed mineral right = tan below-ground band + RED "SEVERED" badge — honors "red = dead, green = go" without the band color fighting the CAS protocol). No consumer title product surfaces this; it visualizes the rights-stratum bundle work.

**Demo = several jurisdictions** (not one parcel through all four). Land Use + Zoning = Lahaina HI (coastal/SMA/post-fire — grounded in a real title report from Sean's parents' home); Title Abstract = Pinedale WY (long clean chain, severed minerals); Feasibility = Lahaina 24-unit. Plain English tab is standard on every worker (Trump-Rule consumer surface). Code citations render as `§ resolver_required` until the live resolver fetches verbatim text (EH-01 — no model-recalled citations ship).

---

## §2 — The substrate bug: shipped workers were invisible + canvas blank

**Symptoms (Sean):** shipped workers don't show up; canvas doesn't render when switching workers; Creator nav links broken; workers built in the repo (outside the sandbox) don't appear in the creator account (dogfooding).

**Root cause — one mechanism, multiple symptoms.** The frontend reads workers from Firestore. Workers built in `creators/<handle>/<slug>/` never get Firestore docs unless propagated:
- `digitalWorkers/{slug}` is written by `workerSync` (functions/functions/helpers/workerSync.js) — but ONLY for workers in `MARKETPLACE_SLUG_MAP`, else SKIPPED. The 4 RE workers weren't in the map.
- `WorkerStateContext.selectWorker()` reads `digitalWorkers/{slug}`; on a missing doc it **silently fell through** (only `nursing-education-001` had a hardcoded fallback) → `workerReady` stayed false → "Canvas must not mount until workerReady" → **blank canvas + invisible worker.**
- The **Creator dashboard reads a different collection** — `workers` where `creator_id == uid` (CreatorDashboard.jsx) — NOT `digitalWorkers`. So repo-built workers never appeared in the creator account even after marketplace sync.

**Fixes applied:**
1. Registered the 4 workers in `services/alex/catalogs/real-estate-development.json` (`scripts/registerREWorkers.js`).
2. Added them to `workerSync` `MARKETPLACE_SLUG_MAP` + `DISPLAY_NAME_MAP` (sync no longer skips them).
3. Hardened `WorkerStateContext.selectWorker()` — a missing `digitalWorkers` doc now synthesizes a minimal worker so the canvas mounts (graceful degradation) instead of hanging blank. Durable safety net for ALL future repo-built / unsynced workers.
4. Seeded the live docs (`scripts/seedREWorkers.js --apply`, via gcloud ADC): each worker written to BOTH `digitalWorkers/{slug}` (canvas tabs → renders) AND `workers/{slug}` (`creator_id` = Sean's UID, `published: true` → creator dashboard). Verified in prod (title-app-alpha).
5. **Creator nav fix** — `CreatorDashboard` ignored the `?tab=` param and had no Profile/Earnings tabs, so all three sidebar links rendered the same view. Added a tab bar honoring `?tab=workers|profile|earnings` (Workers = real; Profile/Earnings = honest "coming soon" stubs).

**Architectural follow-up:** the sandbox "ship a worker" flow + `workerSync` should write BOTH `digitalWorkers` AND `workers/{creator_id}` automatically, so repo/sandbox parity doesn't rely on the one-off seed script. And the `workerSync.js` + `WorkerStateContext.jsx` changes need a **deploy** to protect future workers (the 4 RE workers are already seeded, so they don't need it).

---

## §3 — Canvas doctrine (captured for the creator-dev process + Alex)

**Canvas is a first-class, EARLY step — not an afterthought.** Driven by the Trump Rule (*"people are dumb, use big pictures"* / "every screen works in 3 seconds for the audience that doesn't read"): if the screen must land in 3 seconds, the **visual design IS the spec.** The sandbox build-steps + docs don't yet treat canvas as foundational — gap to fix.

**Canvas source-composition doctrine.** The canvas is primarily a composition/presentation layer over existing sources, NOT a from-scratch image builder. Order of preference (increasing cost/control):
1. **Compose-over-source (default):** overlay/annotate a verified source the creator didn't build (Google Maps, YouTube `video-tile/v1`, an open-source textbook diagram, county GIS). This is also MORE correct — composing over a Reagan-passed source can't hallucinate the way a generated image can. The visual-layer twin of EH-01/EH-07: *no recalled citations, no fabricated comparables, no generated imagery where a verified source exists.*
2. **Image-render API (control):** wired today — `functions/functions/services/image/generator.js`, inline via `structuredData.imageUrl`.
3. **Kling video (motion):** NOT yet API-wired (manual source-drop + local overlay). To be replaced by native Fal.ai video — see §4.

Each composed source carries three fields: `provenance` (where from), `reaganStatus` (verified?), `license` (may I reuse it?). Alex should guide creators "what verified source can I overlay?" before "what should I generate?"

---

## §4 — Deferred: marketing worker rebuild (next, after substrate testing)

Per Sean's sequence — fix substrate → test workers → THEN marketing. The marketing worker never closed its loop (last-mile posting was manual). Captured spec (memory `marketing-worker-rebuild-spec`):
1. **Unified.to** (paid + idle) — wire as the social-posting primitive (LinkedIn/X/IG/FB/TikTok), cost-gated, PLAT-008 receipt. PRIORITY 1.
2. **Fal.ai video → SOURCE_REGISTRY** — `fal-ai/kling-video/v1.6/standard/text-to-video`, async (`fal.queue.submit` → poll `fal.queue.result`), cost gate (~$0.25-0.50/5s) → receipt with video_url+model+prompt+render_seconds+cost.
3. **Marketing canvas** (4 tabs: Content studio / Schedule & post / Analytics / Plain English) — same canvas rules as the RE workers.
4. **Press & PR tab** (v1 = tab, not new worker) — press-release drafting + EIN Presswire API submission (cost-gated, no auto-submit, PLAT-008 receipt). Future split → COMMS-001/PR-001 (a deposition-ready public-statement archive is a standalone compliance product).

End goal: brief → copy → image → video → approve → post → receipt. End to end, no manual steps.

---

## §5 — Files touched this session

- `creators/sean-combs/{law-landuse,title-abstract,zoning,feasibility}-001/` — full worker dirs
- `contracts/bundle-shapes/{zoning-verdict-bundle,feasibility-study,legal-question-bundle,permit-intent-bundle}.v1.json`
- `functions/functions/services/alex/catalogs/real-estate-development.json` — +4 workers
- `functions/functions/helpers/workerSync.js` — slug + display-name maps
- `apps/business/src/context/WorkerStateContext.jsx` — missing-doc robustness
- `apps/business/src/sections/CreatorDashboard.jsx` — `?tab=` nav fix
- `scripts/{registerREWorkers,seedREWorkers}.js` — catalog registration + Firestore seed

---

## §6 — Open / next

- Deploy `workerSync.js` + `WorkerStateContext.jsx` (protect future repo-built workers).
- Test the 4 workers live (reload → marketplace + creator dashboard + canvas render).
- Canvas-first-class: update sandbox build-steps + creator docs + Alex prompt.
- Then: marketing worker rebuild (§4).
- (Non-build: Kent RSPA/Standby execution envelope reviewed — flagged par-value ($0.0001 vs COI) + Exhibit A 51%/20% ownership split for Sean to confirm before signing.)
