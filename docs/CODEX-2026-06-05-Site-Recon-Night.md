# CODEX 2026-06-05 Night — Site Recon Steps 1+2, Four-Way Loop Validated, S52.30 Concept

**Status:** SHIPPED + COMMITTED + PUSHED (3 commits)
**Branch:** main
**Pushed to:** origin/main `0d232fb2..6d43fb28`

---

## What shipped

### Site Recon (SITE-RECON-001) — Steps 1 + 2 of 9

The first creator worker built end-to-end through the four-way authoring loop (Sean + Claude.ai + Alex + Claude Code).

**Step 1 — `searchByAddress` endpoint with two-phase cost gate** (commit `1a6ae7e3`)
- `functions/functions/workers/site-recon-001/searchByAddress.js`
- Route wired inside `exports.api` at POST `/v1/workers/site-recon-001/search-by-address`
- Phase 1 (`confirmCost: false`) → `quoteDataFee` returns projection, stops
- Phase 2 (`confirmCost: true`) → ATTOM property-detail + sales-history + AVM pull, `recordDataFee` charges billing
- `ATTOM_API_KEY` added to function secrets array
- Reuses existing `dataFee.js` helpers — no markup math re-rolled
- Cost reconciliation flagged: ATTOM is $3 actual / $6 user per property report. Spec v1.1's `$4.20/10-parcels` was a placeholder; queue for next spec pass.

**Step 2 — `scoreFeasibility` verdict engine** (commit `e0fd9797`)
- `functions/functions/workers/site-recon-001/scoreFeasibility.js` (277 lines)
- Green / Yellow / Red verdict per spec RULE-04..07, RULE-13
- **Design invariant: every check returns `pass` | `fail` | `unknown`.** Core-data unknowns (assessor, AVM, owner) cap the verdict at YELLOW — GREEN must be earned by evaluated passes, never granted by missing data. Deposition Rule applied at the verdict layer.
- Smoke-tested against 7 QA-corpus-shaped fixtures:
  - Fresh + clean → 🟢 GREEN, conf 90 (QA-004)
  - Stale assessor 8mo → 🟡 "Stale assessor data", conf 70 (QA-003)
  - Owner mismatch → 🟡 OWNER_MISMATCH (QA-005)
  - APN retired → 🔴 APN_RETIRED (QA-006)
  - Coastal overlay → 🔴 COASTAL_COMMISSION_JURISDICTION (QA-017)
  - Stale AVM >30d → 🟡 STALE_AVM (QA-026)
  - Empty ATTOM response → 🟡 conf 20, no crash
- `blockerCode` constants + plain-English `namedBlocker` split (PLAT-008 receipt wants the constant, canvas wants the prose)
- Unevaluatable-in-v1 inputs flag instead of block (title chain / GIS overlays / APN retirement) with injection hooks ready for when those integrations land

### TC-061 — Creator-journey snag-loop bug (commit `6d43fb28`)

Captured into `docs/QA-001-TEST-CORPUS.md` BEFORE the fix per [[feedback-qa001-success-metric]].

Root cause: `functions/functions/index.js:2126-2135` (S52.29d creator-journey intercept) runs its own `Promise.race` with `new Error("anthropic_timeout_25s")` — `.code` undefined, message doesn't match `'anthropic_timeout'` either, so the timeout-specific catch branch is dead code. Every timeout displays the generic "Hit a snag" fallback. AND the catch persists the fallback into `creatorAuthoringHistory`, so turn N+1 pulls the poisoned history and fails identically. Loop, not blip.

Fix queued T1: migrate the creator-journey intercept to call the wrapped `getAnthropic()` from S52.29e (which DOES set `e.code = "anthropic_timeout"` correctly) instead of its standalone race. Add self-heal so failed turns don't poison the session.

### S52.30 — County Property Record Instrumentation Campaign (concept doc)

`docs/CODEX-S52.30-County-Instrumentation-Concept.md` (commit `0d232fb2`, last night's session).

CONCEPT, not approved for execution. Six honest gaps must close before Sublette WY runs. THE dogfood case for the audit substrate thesis. Creator-framed (Sean Lee Combs + Kim Bennett). ~$200 total direct cost across 4 counties.

---

## What was validated

### Four-Way Authoring Loop (Sean + Claude.ai + Alex + Claude Code)

Extension of the [[project-three-way-authoring-loop]]. Live proof:

1. Alex generated a Step 1 prompt with wrong stack (Next.js/TS/Supabase)
2. Claude Code rejected it with factual findings against the actual repo (Firebase/JS/Cloud Functions)
3. Sean passed Code's findings back to Alex with NO corrected prompt and NO hints
4. Alex re-grounded the entire prompt against the real stack — not just patched the three named items
5. Code accepted v2 with three further repo-convention corrections, shipped Step 1

This is RAAS working as a constraint engine catching cross-tool drift. Sean directive: **"We need to make this a feature not a bug in our training materials."**

### Creator-Build IS the Platform-QA Modality

5 real platform defects surfaced during ONE Site Recon session:
- TC-061 creator-journey Alex snag loop on long pasted message
- ATTOM cost spec drift (~14× off)
- Drive save persistence failure (chat attachment "file usable in this chat only")
- Step 4 shareable preview never fired during build
- Step 5 "Set up your tools" redundant in journey panel

None found by a QA pass. All found because Sean was building a real worker. Rotate workers (not iterations) → each session exercises a different platform cross-section → each session finds a different defect class.

---

## Memory updates

New memory files written tonight:
- `project_four_way_authoring_loop_with_code.md`
- `project_creator_journey_build_phase_paste_bug.md`
- `project_creator_build_as_platform_test_modality.md`

MEMORY.md index updated for each.

Earlier in session (from continuation summary):
- `project_three_way_authoring_loop.md`
- `project_county_instrumentation_campaign.md`
- `project_moat_stack_v1_and_manifesto.md`
- `project_chat_reliability_is_the_iphone_story.md` (updated)

---

## Alex prompt refresh

`functions/functions/services/alex/knowledge/sociii-platform-context.md` updated with:
- Four-Way Authoring Loop section
- Creator-Build-IS-the-Platform-QA-Modality section
- Site Recon Steps 1+2 shipped detail
- County Instrumentation S52.30 concept reference
- Moat Stack v1 reference

Every Alex surface inherits via `promptBuilder.assemblePrompt()` reading the updated knowledge file. No per-surface edits needed.

---

## QA-001 run

Full output: `docs/qa-001-runs/2026-06-05-run.txt`

Result: 1/5 checks passed, 978 findings (P0:16 P1:961 P2:1). Numbers match the prior baseline — no new regressions from tonight's commits. Existing P0+P1 debt tracked in task #382 (catalog completeness backfill) and the action-handler routes (`ir:warrant:step`) that need the start_identity / start_signature handlers wired.

Site Recon shipped as a platform handler (`functions/functions/workers/site-recon-001/`), not as a creator-dir package (`creators/<handle>/<slug>/`), so the validateWorker.js DoD check does not apply tonight.

---

## Tomorrow — sandbox + RE worker focus

Per Sean's end-of-night directive: tomorrow's whole focus is the sandbox and using it to get the RE workers all set up. Task list captured separately.

Build-rotation order per [[project-re-development-lifecycle-map-v1]]:
1. Finish Site Recon Steps 3-9 (PLAT-008 anchor + visual + W-002 handoff + Sublette test)
2. Land Use AI Attorney (LAW-LANDUSE-001)
3. W-002 enhancement (embed market feasibility)
4. Permitting citizen-side + government-side split
5. Comms Hub (HUB-001)

Pre-build housekeeping queued T1:
- Fix TC-061 creator-journey snag loop (migrate intercept to wrapped client + self-heal)
- Fix Drive save persistence (chat attachments persist to Drive)
- Fix Step 4 shareable preview firing
- Strip Step 5 "Set up your tools" redundancy in journey panel

---

*CODEX 2026-06-05 night. Three commits pushed. T1 has clean main to pull. Standing housekeeping complete.*
