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

- **"Flight" tab is 100% hardcoded fixture data** — a fabricated specific flight (PHOG→PHNL, Aug 9 2026, tail N701AA, "Crew: Rivera"), an invented navlog, presented as if it were a real upcoming flight. Not a form — just text telling the user to "tell Skye" to build a package or file a plan conversationally. Per the earlier SKYE feature-inventory research this session, those specific chat tools (route filing, W&B computation, FRAT scoring) aren't real registered tools yet on the live `av-copilot-001` persona — only `weather_brief` and `log_flight` are.
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

**Missing: a Risk Analysis (FRAT) tool for the pilot to fill out**, ideally living in Pilot Logbook/Status. Confirms a gap already flagged in this session's earlier SKYE feature-inventory research: the live `av-dispatch-001` persona's system prompt claims FRAT scoring as part of its release package, but only `weather_brief` is an actual registered tool — FRAT is aspirational prompt text, not a real, fillable tool anywhere in the product yet.

## Nearest tab

Sean's read: "Kind of there but needs to show location and direct heading to nearest airport and arrival altitude. Can't really read this. But good directionally." Two issues: a legibility/layout problem (can't read it as-is) and missing fields (current position, direct heading to the nearest airport, arrival altitude) on top of the glide-range-ring calculation already described in this tab's spec.

## QRH tab

Sean's read: functionally the checklist-switching works, but **findability is the real problem** — buried in the same scrollable tab row as everything else, same symptom as the general "too many tabs" complaint below. His specific ask: QRH (emergency checklists) is safety-critical and should not require hunting through tabs — wants it prominent and instantly reachable, visually distinct (his words: "probably in BIG RED LETTERS so QRH stands out"), matching how a real EFB treats emergency reference as always-one-tap-away, not buried navigation.

## Information-architecture feedback (Sean, live)

**A missing "Aircraft" tab, mirroring the "Airports" tab idea below.** Sean's read on QRH's format: good, and presumably sourced from the real POH/AFM for the aircraft type — confirmed directionally correct: the tab's own description in `aviationCanvasData.js` says "verbatim checklists from the PC-12/47E AFM... retrieved, never generated" (real design intent, actual checklist-text fidelity not independently verified tonight). His proposed structural fix: an **Aircraft** tab should be the real hub — holding the aircraft's documents (POH/AFM itself) and acting as the secondary path into everything airframe-specific that's currently scattered as flat sibling tabs: performance charts, W&B, QRH. Same pattern as the Airports-tab idea (below) but keyed by tail number/type instead of by field — together these two hub tabs would absorb most of the "too many tabs" sprawl.

**Consolidate under an "Airports" tab, ForeFlight-style.** With this many tabs (Dashboard/Flight/Currency/Preflight/Trip/Debrief/Logbook/Aircraft Logbook/Charts/Synthetic PFD/Nearest/QRH/Full EFB), tab-to-tab navigation is already getting hard to manage. Sean's proposed direction: unify Charts + runway data + SIDs/STARs/DPs + AFD data + photos + weather + NOTAMs under one **Airports** tab per the ForeFlight pattern, then make that a **dynamic, clickable field inside Flight Planning** — click an airport in the flight plan and see all of the above for that specific field. This is a real information-architecture change, not a quick fix, and it directly addresses backlog item 1 (the flight-planning form) at the same time — worth scoping together, not separately.

**Approach plate link produced no result.** The chart-fetching system is real (not a fixture) — `functions/functions/services/aviation/dtpp.js` pulls the actual current FAA d-tpp cycle metafile and PDF, matching against `AviationCharts.jsx`'s static plate-name list via a documented "loose match" (see its own top-of-file comment on this). An ILS approach-plate link returned nothing; not yet root-caused — could be a cycle-fetch failure or a name-match miss for that specific plate. Needs the exact airport/plate to reproduce.

## Recommendation

Given the size of items 1–3 above (each a real feature build, not a bug), the next dedicated SKYE session should scope and prioritize among: (a) a real structured flight-planning tool, (b) inline canvas cards for single-pane/tablet width, (c) a "Plan/New Flight" entry point, (d) the hamburger menu bug. Item (a) is probably the highest-value given it's the core "ForeFlight killer" pitch and the thing Sean specifically hit first.
