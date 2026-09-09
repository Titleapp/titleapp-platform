# CODEX S52.69 — SKYE iPad Retest: Fixed Tonight vs. Real Backlog (2026-09-08)

**Status:** Five real bugs found and fixed, deployed/committed. A live, tab-by-tab QA pass on the real iPad mini Simulator surfaced a further, larger backlog — captured here so it isn't lost in chat scrollback.
**Owner:** Sean (direction, live testing) · Claude (investigation, fixes)

---

## Fixed and deployed/committed tonight

1. **Real 3-tier tablet breakpoint.** The whole app rode a single 768/769px breakpoint (phone vs. desktop, no tablet tier) — hardcoded independently in 4 places (`AppShell.jsx`'s `useIsDesktopViewport` and `chatOpen` init, `CanvasResolver.js`'s `isMobileViewport`, `App.css`'s mode-switch media queries). Raised all four to 1024px (`AppShell.jsx`'s new `DESKTOP_MIN_WIDTH` constant) so an iPad mini in portrait (744px, the real kneeboard/EFB orientation) gets the single-pane mobile shell instead of a squeezed two-pane desktop layout. Phone-only density tiers (1100/640/480px) untouched — that's what produces a genuine tablet tier without new CSS. Commit `42c1618b`.
2. **Pilot EFB reconnected.** `CoPilotEFB.jsx` (8710 generator, ForeFlight logbook import, currency, duty time, examiner sign-off) was fully built but never routed to anywhere — imported in `App.jsx`, never mounted. Added a "Full EFB" tab to the Pilot/CoPilot canvas. Also fixed a hardcoded direct-Cloud-Run URL in that file that bypassed the Frontdoor's CORS/auth normalization. Commit `42c1618b`.
3. **Retired the iPad "Cockpit" fork.** Real iPads were silently redirected (`main.jsx`) to a separate, narrower screen (`CockpitView.jsx`, CODEX 64) built as a workaround for the missing tablet tier — no chat, no role-switcher, no EFB tab. Now real iPads land on the same worker canvas as everything else. `CockpitView.jsx` left in place, unreached, in case its persistent map-never-hidden-by-a-tab layout is worth porting into the canvas later. Commit `42c1618b`.
4. **Cross-worker chat session bleed (live recurrence of CODEX-S52.65).** Switching to a worker with no chat history yet fell back to "resume the most recently updated session in this tenant, period" — a real but unrelated worker's old conversation rendered under the correct new header (reproduced live: an old marketing conversation under Skye's header). Fixed by skipping that fallback when the sessionId already identifies a specific worker (the deterministic `wkr_`/`cos_` format). Deployed to the live `api` Cloud Function. Commit `42c1618b`. **Note:** this closes only this one resume-fallback mechanism — CODEX-S52.65's original sweep flagged ~57 other query sites with the same pattern, still unaudited.
5. **Skye's persona name was missing from the sidebar.** The worker list showed bare role names ("CoPilot"/"MX"/"Dispatch") with no persona — a hardcoded `WORKER_DISPLAY_NAMES` map, unrelated to Firestore. Chat header already showed "Skye · CoPilot"; sidebar was the one place her name never appeared. Fixed to match. Commit `928cb85a`.

## Confirmed real/live during testing (not fake)

- **Currency tab** — correctly shows no data (real `/v1/pilot:currency`, nothing logged yet for this account — not fabricated).
- **Live aviation map** — real Hawaii chart, METAR dots, airport markers, layer toggles (`AviationMap.jsx`, wired into the canvas correctly).
- **Role-switcher (Pilots / MX / Dispatch)** — present and functional in the landscape/desktop-tier layout.
- **CAS panel, Scratch Pad, Terrain/Profile view** — all rendering and present.
- **Preflight tab** — closer to real (ties into the same live weather plumbing as other `LIVE_TABS` entries) — Sean's read: "good direction but not quite there."
- **Aircraft Logbook tab format** — Sean's read: "really good" — no data yet (nothing logged), but the actual field format (Hobbs, total time per engine, start cycles, landing cycles, squawks, pilot/MX sign-offs) is the right shape. This is the real `aircraftRecords.js`-backed logbook (see the SKYE feature-inventory research earlier tonight — MX's deepest, most production-shaped backend) — validates that piece is worth building on directly rather than replacing.

## Confirmed fake/placeholder during testing

- **"Flight" tab is 100% hardcoded fixture data** — a fabricated specific flight (PHOG→PHNL, Aug 9 2026, tail N701AA, "Crew: Rivera"), an invented navlog, presented as if it were a real upcoming flight. Not a form — just text telling the user to "tell Skye" to build a package or file a plan conversationally. Per the earlier SKYE feature-inventory research this session, those specific chat tools (route filing, W&B computation, FRAT scoring) still aren't real registered tools on the live `av-copilot-001` persona. **Correction from later in this same session:** NOTAMs *is* real and already wired (`get_notams`, a genuine tool with a working handler) — it just wasn't listed in Skye's or Dispatch's "TOOLS YOU HAVE" prompt text, so the model never called it. Fixed same session (commit `425ca23b`, deployed, not yet live-verified).
- **"Past Trips" tab** — Sean's read, not yet independently verified in code: "looks like hardcoded data," though the business-purpose field is a real, deliberate design choice (sets up for billing/expense integration later).
- **"Debrief" tab** — confirmed not in `LIVE_TABS` (hardcoded, matches Sean's read). Sean's take: good intent — this reads like the answer to a post-flight follow-up/debrief, and the natural design is auto-generating it from the "Flight" tab's data once that's real, rather than being its own separate hand-entered thing.
- **"Logbook" tab (`aircraft-logbook`/pilot logbook)** — Sean's read: incomplete data. Consistent with the zero-entries finding from the Pilot-EFB research earlier tonight (both logbook data models — the live `logbookEntries` collection and the EFB's `logbooks/{uid}/entries` — are empty for this account; nothing has been logged yet, real or fake).

## Real gaps identified, not fixed tonight (deliberately — feature builds, not bugs)

1. **No real flight-planning form/tool.** Sean's ask: a proper structured flow — route, WX brief, navaids, NOTAMs, fuel/W&B, company-specific info — not a loose conversational reply. This is a genuine build (wiring real tool calls into the CoPilot persona, likely reusing existing pieces that already exist elsewhere in the codebase — `WeightBalanceCalculator`/`PerformanceCalculator` components, the real `/v1/aviation:notams` endpoint — rather than starting from zero).
2. **"Log Flight" exists; "Plan a Flight" / "New Flight" does not.** The only primary action on the Pilot canvas today is after-the-fact logging. A forward-looking planning entry point is a separate, real gap.
3. **Canvas signals don't render inline in single-pane (portrait/tablet) mode.** `ChatPanel.jsx` calls `CanvasResolver.resolve(signal, context, panel.showCanvas)` — 3 arguments; the resolver's 4th parameter, `addInlineCard`, is never passed. So a chat-triggered canvas result (e.g. "Skye Output is ready in the canvas on the right") has nowhere to render at single-pane width — confirmed live: Sean got nothing in portrait, saw it fine after rotating to landscape (where the right panel is simultaneously visible). Building the inline-card path is real work: wiring an actual `Block`-based renderer into `ChatPanel`'s message stream, not a quick patch.
4. **Hamburger menu reported not working** on the opening/portrait view — not yet root-caused; needs a dedicated look (separate from the items above).

## Synthetic PFD (backup instrument mode)

Sean's read: "Pretty good... but no artificial horizon. See the speed and altitude tape. Good start." The speed/altitude tapes render correctly; the attitude ball area was a plain black circle instead of a sky/ground horizon. **This is a real rendering bug, not a missing feature** — `SyntheticPFD.jsx` has a fully implemented canvas-drawn artificial horizon (sky/ground gradient fill, horizon line, pitch-ladder degree marks, all keyed off `pitch`/`bank`), it's just not painting. Not yet root-caused (candidates: canvas context/sizing issue, or a silent early-return when real device motion sensors aren't available — this was tested on the Simulator, which has no real accelerometer/gyroscope, so `PITCH 0° BANK 0°` may reflect "no sensor data" rather than "level flight"; needs a real device to fully distinguish a Simulator limitation from an actual bug). The clear "NOT A CERTIFIED INSTRUMENT" disclaimer and backup-only framing is real, deliberate, and correct.

## Full EFB tab (tonight's reconnect)

Sean's read: sub-tab structure is good. **Status** sub-tab (aircraft + pilot status check) correctly reads as "step 1" of flight planning. **Logbook** sub-tab is confirmed as the **Pilot** logbook specifically — correctly distinct from the canvas's separate **Aircraft** Logbook tab (both are real, necessary, and different: pilot flight time/currency vs. airframe maintenance records). Disclaimer/acknowledgment gate reads well.

**Missing: a Risk Analysis (FRAT) tool for the pilot to fill out**, ideally living in Pilot Logbook/Status. Confirms a gap already flagged in this session's earlier SKYE feature-inventory research: the live `av-dispatch-001` persona's system prompt claims FRAT scoring as part of its release package, but FRAT still has no real registered tool anywhere — genuinely aspirational prompt text, not a real, fillable tool anywhere in the product yet. (NOTAMs, mentioned in the same release-package list, turned out to already be real — see the correction under "Full EFB tab" above; FRAT/W&B are not the same situation, still unbuilt as far as verified.)

## Nearest tab

Sean's read: "Kind of there but needs to show location and direct heading to nearest airport and arrival altitude. Can't really read this. But good directionally." Two issues: a legibility/layout problem (can't read it as-is) and missing fields (current position, direct heading to the nearest airport, arrival altitude) on top of the glide-range-ring calculation already described in this tab's spec.

## QRH tab

Sean's read: functionally the checklist-switching works, but **findability is the real problem** — buried in the same scrollable tab row as everything else, same symptom as the general "too many tabs" complaint below. His specific ask: QRH (emergency checklists) is safety-critical and should not require hunting through tabs — wants it prominent and instantly reachable, visually distinct (his words: "probably in BIG RED LETTERS so QRH stands out"), matching how a real EFB treats emergency reference as always-one-tap-away, not buried navigation.

## Training tab

Sean's read: structure is good (ground training + instructor endorsements land in a sensible place), but **only Ground Training exists — no Flight Training entry type**, and no way to record which device the training happened in (aircraft vs. training device vs. approved simulator). This is a live confirmation of a gap already identified in this session's earlier SKYE feature-inventory research: `form8710Builder.js`'s totals object has a `simulator` field that no code path ever populates, and no entry type or `deviceType`/`aircraftCategory` value distinguishes a simulator/training-device session from a real aircraft flight anywhere in the schema. **Partially fixed same session (commit `8119bd86`, deployed):** `form8710Builder.js` now correctly routes simulator/training-device time into its own `totals.simulator` bucket instead of conflating it with real aircraft time (verified with 5 functional test cases), and the manual log-entry form in `CoPilotEFB.jsx` got an "Aircraft / Device" dropdown so the fix is actually reachable, not just correct in isolation. **Not yet done:** the Ground/Flight training split in the dedicated Training sub-tab's own entry type dropdown — that dropdown still doesn't distinguish Ground from Flight training as separate categories. The aircraftCategory field added here is on the general log-entry form, not that specific dropdown.

## Documents tab

Sean's read: "really good" — reads as the equivalent of Studio Locker (the existing platform-wide document-storage pattern) but for CoPilot specifically, and the Google Drive import already built into `CoPilotEFB.jsx` (`DriveImportModal`) is well-received and working as intended. Feature idea on top of what's there: real aircraft-specific docs should be importable from the actual aircraft/operator, **plus** SOCIII should supply general aircraft-**type** template documents (e.g. a stock PC-12/47E AFM/checklist set) as a starting baseline rather than requiring every pilot to source everything from scratch.

## Documents tab — Google Drive import bug (FIXED)

Sean's read: "GDrive link not working." Root cause: `DriveImportModal.jsx` independently hardcoded the same stale direct Cloud Run URL (`api-feyfibglbq-uc.a.run.app`) that `CoPilotEFB.jsx`'s own `apiCall` had before tonight's earlier fix — same bug, duplicated in a second file, bypassing the Frontdoor's CORS/auth normalization entirely. Fixed the same way (route through `/api?path=/v1/...`). Not yet retested live (needs rebuild).

## CoPilot's internal "Chat" sub-tab — redundant with Skye chat

Sean's read: "Seems to be a redundant chat box... this is Skye's domain, chat doesn't seem to work." Two things:
1. **The "doesn't work" part may already be fixed** — this internal chat calls the same `apiCall("chat", ...)` in `CoPilotEFB.jsx` whose URL bug was fixed earlier tonight (see Full EFB section above). Needs a rebuild + retest to confirm.
2. **The redundancy critique is a real, separate architecture question, independent of the bug.** This isn't just duplicate UI — it very likely runs as a fully separate, isolated conversation (its own PC-12-specific system prompt/session), not sharing history with the main Skye chat. Worth deciding whether the EFB needs its own chat sub-tab at all, versus just being a structured-data surface that the one real Skye chat (always present) reads and writes into.

## Duty tab — concrete reference design (Sean, live)

Current Duty sub-tab: too simple, needs a real duty-time snapshot. Sean pointed to his actual employer's flight-ops software (Life Flight Network's FVOps, `lfn.fvflightops.com`) as "the only useful thing in that app" — a concrete, proven reference to build toward, not a vague ask:

- **Flight Time Summary**: a table of rolling windows (Calendar Year / Last 12 Months / Last 90/60/30 Days) × aircraft/fleet-group columns (their case: Fixed Wing, PC12 Logistics, EC135P2+, PC12 MED Standard), plus the same data as a bar chart.
- **Flight & Duty Times**: five circular gauge widgets, each a progress ring against a real regulatory/company cap — e.g. "131.3/1400 hrs — Calendar Year Flight Time," "23.6/500 hrs — this quarter," "85.3/800 hrs — this + previous quarter," "0 hrs — past 24 hrs," "0 in 23 days — rest periods needed."
- **My Qualification/Training Status**: a table (Category / Training Item / Date Last Completed / Expiration Date) with near-expiry rows visually highlighted (color-coded by urgency) — effectively merges duty-time and currency/quals tracking into one dashboard.

This is real, scoped feature work (rolling time-window aggregation + gauge components + an expiration-highlighted quals table), not a quick fix — but now has a concrete, working reference to build against rather than a from-scratch design problem.

## Design principle (Sean, live)

**Redundant paths to the same data are a feature, not duplication to eliminate.** EFB's own Currency sub-tab is functionally another version of the canvas's Currency tab — Sean's explicit take: that's good, CoPilot should have 2-3 ways to reach the same information, because different pilots work differently. Worth keeping in mind when consolidating tabs per the Airports/Aircraft-hub ideas below: the goal is reducing *navigation friction*, not collapsing every view down to one canonical path.

## No first-run role selection (Pilot / MX / Dispatch)

Sean's read: nowhere in the app do you actually choose which role you are — Pilot, MX, or Dispatch. The RoleSwitcher tabs let you flip between roles once you're already in the aviation worker, but there's no initial "which are you" moment establishing a default/primary identity. Sean's proposed fix: prompt for this on first major usage, and keep it always easy to switch afterward — explicitly calling out the shared-device case (a company iPad handed between a pilot, a mechanic, and a dispatcher) as a real reason switching needs to stay easy even after the initial choice.

## Information-architecture feedback (Sean, live)

**A missing "Aircraft" tab, mirroring the "Airports" tab idea below.** Sean's read on QRH's format: good, and presumably sourced from the real POH/AFM for the aircraft type — confirmed directionally correct: the tab's own description in `aviationCanvasData.js` says "verbatim checklists from the PC-12/47E AFM... retrieved, never generated" (real design intent, actual checklist-text fidelity not independently verified tonight). His proposed structural fix: an **Aircraft** tab should be the real hub — holding the aircraft's documents (POH/AFM itself) and acting as the secondary path into everything airframe-specific that's currently scattered as flat sibling tabs: performance charts, W&B, QRH. Same pattern as the Airports-tab idea (below) but keyed by tail number/type instead of by field — together these two hub tabs would absorb most of the "too many tabs" sprawl.

**Consolidate under an "Airports" tab, ForeFlight-style.** With this many tabs (Dashboard/Flight/Currency/Preflight/Trip/Debrief/Logbook/Aircraft Logbook/Charts/Synthetic PFD/Nearest/QRH/Full EFB), tab-to-tab navigation is already getting hard to manage. Sean's proposed direction: unify Charts + runway data + SIDs/STARs/DPs + AFD data + photos + weather + NOTAMs under one **Airports** tab per the ForeFlight pattern, then make that a **dynamic, clickable field inside Flight Planning** — click an airport in the flight plan and see all of the above for that specific field. This is a real information-architecture change, not a quick fix, and it directly addresses backlog item 1 (the flight-planning form) at the same time — worth scoping together, not separately.

**Approach plate link produced no result.** The chart-fetching system is real (not a fixture) — `functions/functions/services/aviation/dtpp.js` pulls the actual current FAA d-tpp cycle metafile and PDF, matching against `AviationCharts.jsx`'s static plate-name list via a documented "loose match" (see its own top-of-file comment on this). An ILS approach-plate link returned nothing; not yet root-caused — could be a cycle-fetch failure or a name-match miss for that specific plate. Needs the exact airport/plate to reproduce.

## Role-based onboarding + home screens (Sean's spec, live — the big one)

This is a coherent product direction spanning most of tonight's smaller findings, not an isolated fix. Captured close to verbatim.

**General mobile-environment principle:** the canvas should be the initial/primary view on mobile/tablet, with the Skye chat button always at-the-ready (floating) — not chat-first. This confirms and extends work already in place (aviation canvas-first at mobile tier, shipped 2026-08-30).

**RH nav menu should default collapsed**, not open. (Not yet matched to a specific component in code — verify against the actual right-panel/nav toggle before implementing; several small header icons were seen tonight that could be this.)

**First-run role selection, professionally worded:** on first major usage, ask "are you a pilot, maintenance tech, or dispatch" (his phrasing note: use professional wording, not internal shorthand like "MX"). That choice drives the entire opening experience from then on — with easy switching afterward for the shared-device case (one company iPad passed between a pilot, a mechanic, and a dispatcher).

**Pilot opening screen:** the Map — your location, radar, weather — with **New Flight** and other nav functions immediately accessible from there. (Ties directly to the already-flagged "Log Flight exists, Plan/New Flight doesn't" gap — this spec answers where that action should live.)

**MX (Maintenance Tech) opening screen:** Fleet Status + your assigned aircraft's daily/weekly/monthly checklist and notes. Sean's specific vision: a **half-report, half-chat** hybrid screen — Skye greets by name and summarizes what's on the plate today and this week ("Hi [name], here's what's on your plate for today and this week. How can I help?"), then quick access to a fleet status manifest and a map showing asset locations. This is essentially the Duty-tab reference-design idea (rolling summary + gauges/status) fused with a personalized conversational opener, applied as the actual home screen for this role.

**Dispatch opening screen:** same pattern as MX — a daily/weekly briefing + conversational "how can I help" opener, plus quick access to a map showing asset locations.

**How this ties everything together:** the Map (real, working), the missing New Flight action, the Duty-tab reference design, the redundant-internal-chat question, and the RoleSwitcher all converge into one thing — three distinct, role-tailored home screens replacing a single generic canvas default, with chat woven into the home screen itself for MX/Dispatch rather than kept separate.

## Map should be full-screen, controls overlaid on top

Sean's read: the map and similar visual surfaces need to go full-screen — currently too many buttons/controls sit stacked above the map in normal layout flow, shrinking the actual map area. Fix direction: float the controls as an overlay on top of the map (absolute-positioned), not stacked in the layout pushing it smaller.

## Reference materials Sean plans to supply

- **ForeFlight flight-planning UI screenshots** — Sean got ForeFlight access today and offered to screenshot its full flight-planning flow as a concrete reference, same value as tonight's FVOps Duty-tab reference.
- **FIS (PT6 engine) training manual** — source material for a proposed new **Training/Quiz tab** within CoPilot: quizzes on Systems, QRH, Emergencies, CFRs, WX, Instrument flying, structured like real checkride prep (ATP vs. Instrument vs. Private Pilot tracks, systems questions). This is a genuinely new, distinct feature from the existing EFB "Training" sub-tab (which logs completed training events, not study/quiz content).
  - **Design constraint to carry into that build**: this platform's whole ethos is grounded, cited answers (QRH is explicitly "retrieved, never generated"). Quiz content should work the same way — sourced from the actual uploaded manual with citations, not freely generated systems facts. A wrong answer in checkride-prep content is a real safety-adjacent liability, not just a UX issue.

## Full tab/feature architecture map — requested, not yet built

Sean asked for a complete map of every navigation tab across all three roles and what actually backs each one (real endpoint / static fixture / unbuilt) — a structural reference for how the app is actually organized, distinct from this findings log. Offered to build this via code-reading (no device needed) as a follow-up.

## Desktop parity — explicit standing requirement

**Everything built for mobile/tablet must cross-populate to the desktop worker.** Display sizing differs, but functionality must be the same — this session's work has been mobile/tablet-focused only; desktop is a different code path (chrome differs even though the canvas component tree is shared) and hasn't been touched or verified.

**Concrete desktop layout idea, from live use tonight:** for visual-heavy workers (this one; likely also the nursing charting worker and MX), collapse/hide the right-hand nav column by default when opening the worker, so the map/visual canvas gets ~2/3 of the screen and chat gets ~1/3 — rather than the current even 3-column split. This directly clarifies the earlier "RH nav menu should default collapsed" note from earlier in this same session (same underlying idea, seen at two different device widths). Not yet matched to the exact column/component in `AppShell.jsx`'s real layout code — verify before implementing, don't assume which of the 3 columns this is.

## Recommendation

**Top priority, superseding the earlier framing below: the role-based onboarding + home-screen redesign** (see that section above). It's the one piece of direction from tonight that actually unifies almost everything else found — the Map (real, working), the missing New Flight action, the Duty-tab reference design, the redundant internal-chat question, the RoleSwitcher, and the general canvas-first-on-mobile principle all converge into "three distinct, role-tailored home screens" rather than being separate fixes. Scope that first; several of the smaller items below become sub-tasks of it rather than standalone work.

Everything else, roughly in order after that:
1. Full-screen map with overlaid controls (quick, well-scoped layout fix).
2. A real structured flight-planning tool (route/WX/navaids/NOTAMs/fuel/W&B/company info) — likely absorbed into the Pilot home screen's "New Flight" entry point once that's scoped.
3. The Airports-tab and Aircraft-tab consolidations (reduce tab sprawl, feed the same flight-planning work).
4. Inline canvas cards for single-pane/tablet width (`ChatPanel.jsx` never passes `addInlineCard` to `CanvasResolver`).
5. The hamburger-menu bug and the RH-nav-defaults-open issue (not yet root-caused, either could be quick once located).
6. Smaller confirmed items: Synthetic PFD's artificial horizon not painting, the ILS approach-plate link, Ground/Flight training split + device-type field, Risk Analysis (FRAT) tool.
