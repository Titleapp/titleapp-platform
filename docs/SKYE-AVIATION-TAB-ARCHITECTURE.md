# SKYE Aviation — Tab/Feature Architecture Map

**This is a living reference, not a dated snapshot — update it in place as tabs are added, wired to real data, or restructured.** For the live QA notes and findings behind these entries, see `docs/CODEX-S52.69-SKYE-iPad-Retest-Findings-Sep8.md`.

Source files: `apps/business/src/components/canvas/aviationCanvasData.js` (tab definitions), `apps/business/src/components/canvas/AviationWorkerCanvas.jsx` (the `LIVE_TABS` object — the single source of truth for which tabs read real data vs. static fixture content), `apps/business/src/sections/CoPilotEFB.jsx` (the Full EFB screen).

Legend: 🟢 Live (real endpoint) · ⚪ Fixture (static/hardcoded demo content) · 🟡 Partially live (some elements real, some not)

---

## Pilot / CoPilot (`av-copilot-001`) — Sean's active role

| Tab | Live? | Backs onto | Notes |
|---|---|---|---|
| Map | 🟢 | `AviationMap` component, real chart data | METAR dots, layer toggles (Airports/Airspace/Navaids/Traffic) |
| Dashboard | 🟢 | `GET /v1/pilot:currency` | Real FAA personal-currency computation |
| Flight | ⚪ | none — fully hardcoded fixture | Fabricated flight (PHOG→PHNL, N701AA, "Crew: Rivera"), invented navlog. **Highest-priority rebuild target** — see role-based home-screen spec in S52.69 |
| Currency | 🟢 | `GET /v1/pilot:currency` (same endpoint as Dashboard) | Fuller compliance-record table |
| Preflight | 🟢 | `GET /v1/aviation:weather` | Closer to real per live testing, "good direction, not quite there" |
| Past Trips | 🟡 | unconfirmed — Sean's live read was "looks like hardcoded data"; not independently verified in code | Business-purpose field is a real, deliberate design choice (billing/expense integration groundwork) |
| Debrief | ⚪ | not in `LIVE_TABS` | Sean's read: good intent, should auto-generate from Flight once that's real |
| Logbook | 🟢 | `GET /v1/logbook:list` | Pilot's own flight log |
| Aircraft Logbook | 🟢 | `GET /v1/mx:logbook:list` (read-only here; MX maintains it) | Sean's read: "really good" format (Hobbs, engine time, cycles, squawks, sign-offs) — just no data logged yet |
| Charts | 🟢 (real fetch, unconfirmed match rate) | `functions/functions/services/aviation/dtpp.js` — real FAA d-tpp cycle metafile + PDF fetch | An ILS approach-plate link returned no result live — not yet root-caused (cycle-fetch failure vs. name-match miss) |
| Synthetic PFD | 🟡 | device motion sensors (client-side) + GPS | Speed/altitude tapes real; artificial horizon **implemented in code but not rendering** (bug, not missing feature) — untested whether this is a Simulator-only limitation |
| Nearest | ⚪ (unconfirmed) | glide-range calc described in spec | Sean's read: needs current position, heading-to-nearest, arrival altitude; legibility problem |
| QRH | 🟢 | verbatim AFM checklist data ("retrieved, never generated" per its own design intent) | Sean's read: good format, presumed real POH/AFM sourcing confirmed directionally; findability is the real problem (buried in tab row, should be prominent/red) |
| **Full EFB** | see below | `CoPilotEFB.jsx`, reconnected 2026-09-08 | Own internal sub-tab system, see next section |

## Full EFB (`CoPilotEFB.jsx`) — internal sub-tabs

Mounted as the Pilot canvas's "Full EFB" tab (added 2026-09-08). Has its own header/tab-bar, separate from the canvas above.

| Sub-tab | Backs onto | Notes |
|---|---|---|
| Status | `GET /v1/copilot:pc12:status` | Aircraft + pilot status check — Sean's read: correctly reads as "step 1" of flight planning |
| Logbook | `copilot:pc12:*` routes — real 8710 generator, ForeFlight CSV import (`foreflightParser.js`), manual entry | This is the **Pilot** logbook specifically (distinct from the canvas's Aircraft Logbook tab — both real, both needed) |
| Currency | same `/v1/pilot:currency`-family data | Sean's read: "another version of the earlier tab" — confirmed as an intentional redundant path, not a bug (see "Design principle" in S52.69) |
| Duty | `copilot:pc12:dutyEvent` | Currently too simple — Sean pointed to Life Flight Network's FVOps dashboard as the concrete reference design (rolling time-window table + gauges + quals-expiration table) — see S52.69 |
| Training | `copilot:pc12:addGroundTraining` | Structure good (ground training + instructor endorsements), but **only Ground Training exists — no Flight Training entry type, no device-type field** (aircraft/training-device/simulator) — confirmed live gap matching the `form8710Builder.js` dead `simulator` field found in code research |
| Documents | `copilot:pc12:uploadDoc` + Google Drive import (`DriveImportModal.jsx`) | Sean's read: "really good," reads as Studio Locker for CoPilot. Drive import had a stale hardcoded-URL bug — **fixed 2026-09-08**. Doc types already defined: POH, QRH, GOM, MEL, OpSpecs, W&B |
| CoPilot (chat) | `copilot:pc12:chat`, own `pc12SystemPrompt.js` | **Not just a redundant chat box** — has a real 4-mode system: **Direct** (verbatim from uploaded docs, source-cited — exactly the "grounded, not hallucinated" pattern), **Operational** (applies FARs/OpSpecs, cited), **Training** (Socratic checkride-prep study mode, scenario-based, knowledge-gap identification), **Advisory** (general reasoning, default). Sean flagged this as feeling redundant with the main Skye chat and possibly broken — the "broken" part may already be fixed (shared the same URL bug as Drive import, fixed same session). **The redundancy question and Sean's separately-proposed "Training tab with checkride quizzes" idea may be the same feature — this Training mode already exists here, just not surfaced as its own dedicated experience.** Worth resolving together, not separately. |

## MX (`av-mx-001`)

| Tab | Live? | Backs onto | Notes |
|---|---|---|---|
| Aircraft | 🟢 | `GET /v1/mx:listAircraft` (`computeAirworthiness()`) | Anchor tab for maintenance/compliance |
| Aircraft Logbook | 🟢 | `GET /v1/mx:logbook:list` | Same real logbook the Pilot canvas reads read-only |
| Scheduled MX | 🟢 | `GET /v1/mx:listAircraft` (`evaluateMaintenanceItems()`) | |
| Unscheduled MX | 🟢 | `GET /v1/mx:listSquawks` | |
| Inspections | 🟢 | same `evaluateMaintenanceItems()` as Scheduled MX, FAR-inspection framing | |
| ADs / SBs | 🟢 | `GET /v1/mx:listAircraft` (`adCompliance.items`) | |
| MEL | 🟢 | `GET /v1/mx:listSquawks` (`melItemsToBlocks`) | |
| Warranty | 🟢 | `GET /v1/mx:listAircraft` | |
| NEF | 🟢 | `GET /v1/mx:listAircraft` | |
| Documents | ⚪ (not in `LIVE_TABS`) | | AFM, 337s, W&B docs, registration — static per spec |

MX is the single most complete lens — nearly every tab is real. See the SKYE feature-inventory research (earlier this session) for the deeper `aircraftRecords.js` backend behind it.

## Dispatch (`av-dispatch-001`)

| Tab | Live? | Backs onto | Notes |
|---|---|---|---|
| Fleet Map | ⚪ (not in `LIVE_TABS` for the `-001` slug — only the generic fleet-level `av-dispatch` has a live weather-map tab) | | |
| Requests | 🟢 | real aircraft-matching against fleet on file | Not a static form |
| Schedule | 🟢 | `GET /v1/dispatch:listTripRequests` | |
| Crew | 🟢 | `GET /v1/scheduling:listSchedule` + `GET /v1/dispatch:crewRosterCurrency` | Fleet-wide qual/medical/type-rating currency explicitly NOT tracked here by design (lives in each pilot's personal Vault) |
| Pax Manifest | 🟢 | `GET /v1/dispatch:listTripRequests` | |
| Aircraft Status | 🟢 | `GET /v1/mx:listAircraft` (`airworthiness`) | Same data MX Tracker reads — can't show a different answer |
| NOTAMs | 🟢 | `GET /v1/aviation:notams` | Hardcoded to Hawaii bases (PHOG/PHNL/PHKO/PHTO/PHNY) — not yet derived from the actual filed trip |
| Weather | 🟢 | `GET /v1/aviation:weather` | Same ICAO set as NOTAMs |
| Releases | 🟢 | `GET /v1/aviation:dispatch:releases` | |

Dispatch's live persona system prompt claims a 7-step release package (crew legality, airworthiness, weather, FRAT, W&B, NOTAMs, IRS docs) but only `weather_brief` is an actual registered chat tool — the tabs above are real, the *chat* can't act on most of them yet (see SKYE feature-inventory research, earlier this session).

## Other role keys in `aviationCanvasData.js` — mostly inactive/unused

The file also defines `av-copilot` (generic, no `-001`), `av-mx` (generic), `av-aircraft`, `av-training`, `av-operations`, `av-safety`, `av-dispatch` (generic fleet-level), and `av-ground-school-001`. Almost none of these appear in `LIVE_TABS` (only `av-dispatch`'s weather-map/notam/flight-following and `av-aircraft`'s squawks tab have any live wiring) and they don't appear to be reachable from Sean's real tenant (`activeWorkers` only has `av-copilot-001`/`av-mx-001`/`av-dispatch-001`). **Not deep-mapped here** — worth a separate, quick conversation with Sean about whether these are dead fixtures safe to remove, or serve some other purpose (e.g. a different demo/fleet-operator persona) before touching them.
