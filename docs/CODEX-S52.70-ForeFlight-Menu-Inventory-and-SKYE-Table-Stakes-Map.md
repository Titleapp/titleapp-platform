# CODEX S52.70 — ForeFlight Menu Inventory and SKYE Table-Stakes Map

**Status:** Complete (2026-09-09). Grounded in Sean's own narration of his real ForeFlight iPad (MEM→LIT flight) **plus a full read of all 245 of his actual screenshots** (folder: `~/Downloads/FOREFLIGHT IMAGES`, also in Google Drive), reviewed in 4 parallel batches. This version corrects several guesses from the narration-only first draft and adds features that only showed up in the screenshots themselves.
**Scope note:** ForeFlight is single-user pilot software with no MX or Dispatch equivalent, so Parts 1-4 below are necessarily Pilot-scoped. **See Part 5 for MX/Dispatch coverage** (SKYE already has real coverage there that this ForeFlight comparison structurally can't surface) and role-ownership assignment for the gaps found here.
**Relationship to prior research:** `CODEX-S52.67` did video/transcript-based ForeFlight research and produced a gap punch list. This doc is the primary ForeFlight reference going forward — grounded in Sean's own device and real screenshots, organized as ForeFlight actually presents itself. Agreements with S52.67 are noted; net-new findings are marked **NEW**.
**SKYE-side source of truth:** `docs/SKYE-AVIATION-TAB-ARCHITECTURE.md` — cited, not re-derived.

**Red-team correction (2026-09-09):** an independent adversarial review of this doc's SKYE-side claims (fresh agent, no prior context, checked every 🟢/🔵 marker against the actual code rather than trusting this doc's own citations) found two claims that were **wrong, not just imprecise**, and both got corrected in place below rather than hidden:
1. **TOLD calculator was marked 🔴 "confirmed absent"; it's actually 🟡.** `apps/business/src/components/canvas/PerformanceCalculator.jsx` + `aviationPerformance.js` is a real, working density-altitude/wind-adjusted takeoff/landing distance estimator, mounted live in `AviationWorkerCanvas.jsx`'s `ReleaseFlightModal`. It's real physics + FAA rule-of-thumb math (FAA-P-8740-02), with honest fail-closed behavior when no sourced baseline exists for an aircraft type — not a fabrication. What it lacks vs. ForeFlight: only one aircraft type sourced (PC-12/47E), no TORA/TODA/ASDA per-runway comparison, no live METAR auto-pull, no per-flap climb table, no PDF export, and it's informational-only (doesn't gate the release the way ForeFlight's does). This is an **upgrade job, not a zero-to-one build** — materially changes the priority call below.
2. **Crew qualifications/currency was listed as the highest-confidence *unaddressed* gap; it's actually built.** `functions/functions/index.js`'s `crewRosterCurrency` route is a real, deployed, tenant-scoped, owner/admin-gated endpoint that resolves every crew member on the tenant's real `crewSchedule` and computes real per-person currency (pilot: 90-day/Instrument/Medical/BFR/61.57 IPC/135.293/135.297; MX: `computeMxCurrency`) — not a stub. `AviationWorkerCanvas.jsx`'s Dispatch Crew tab (`crewRosterToBlocks()`) renders it as a real table. The architecture doc's note that this is "explicitly NOT tracked... by design" was itself wrong and has been corrected in that doc too.

Everything else the red team checked (NOTAMs hardcoded to Hawaii, the inline-canvas-card gap, W&B lacking saved profiles, PACK having no equivalent, MEDEVAC flag absent, Emergency Glide Mode absent) held up as accurate. Two moderate overstatements were also softened: the "Airport weather/NOTAMs" row and the glide-ratio "cheap fix" framing (see their rows below for what changed and why).

---

## Part 1 — ForeFlight Menu Inventory (screenshot-verified)

### 1. Airports
Weather, NOTAMs, runways, approach list, frequencies. Has its own Runway/Procedure/NOTAM sub-tabs, deeper than a single page. Jumps directly into **Plates** when viewing an approach. Also hosts:
- **3D Airport view** — confirmed: full-screen photorealistic day+night Google/NASA runway-threshold flythrough, runway-end quick-select grid, live ALT MSL/APT ELEV/distance/glidepath HUD readouts. Night mode renders actual approach lighting against a starfield.
- **FAA live airport camera feed** — real public data source: `weathercams.faa.gov` (confirmed via the app's own About/credits screen). Also independently exposed as a **"Cameras" layer inside the Map overlay picker**, not just an Airports-page feature.
- **FBOs directory** — per-FBO fuel pricing (100LL/Jet A), radio frequency, service-provider logos (crew cars, WiFi, Avfuel, Hertz/Enterprise/Avis), NBAA membership flag. Includes a structured **"Request Fuel Release"** form (location/date/fuel type/qty/provider/comment).
- **Comments tab — has an AI-generated "Pilots Say..." summary** synthesizing crowd pilot reviews per airport into a short digest. **NEW, real shipped AI feature**, worth flagging directly — it's the one place ForeFlight itself uses AI today.
- Airport diagrams show a **NOTAM-currency warning banner directly on the chart** ("Expired. 7 NOTAMs >") — ties staleness to the specific chart being viewed. **NEW, worth stealing as a UX pattern.**

### 2. Maps
Primary situational-awareness view. **Correcting the first-draft guess:** the Flight-Plan (FPL) bar's real tab structure is **Edit | NavLog | Profile** (confirmed independently by 3 of 4 review batches), with **Altitude** and **Procedures** as separate buttons on the same bar (not a nested Winds/Altitude/Procedures submenu as originally guessed from narration alone).
- **NavLog** — confirmed real: single-column leg-by-leg list (DEP/waypoint, HDG, LEG dist/fuel%/time, TOTALS, REMAINING, ETA).
- **Profile** — confirmed real: vertical terrain/airspace chart, tap-to-reveal airspace callouts (e.g. "Memphis Class B, 3,000'-10,000' MSL"), highest-point/clearance/first-strike stat row. This is the same structure SKYE already built (commit `82efe12c`) — genuinely close parity here.
- **Overlay picker** — confirmed concretely, ~25 layers: base layers (Jeppesen IFR low/high, aerial, VFR sectional, Canada, Caribbean/Mexico) plus overlays (Radar variants, Satellite, Icing, Turbulence, Clouds, Surface Analysis, Winds, Hazard Advisor, Traffic, AIR/SIGMET, NOTAMs, TFRs, Cameras, Flight Category, Surface Wind, Winds Aloft, Dewpoint Spread, Temperature, Visibility, Ceiling, Sky Coverage, PIREPs, Lightning, Obstacles, User Waypoints, Fuel prices). Confirms the "30-50 overlays" claim was accurate.
- **Live ADS-B traffic** — rich popups (tail, alt, dist/bearing, heading, speed, airline, route, ETA, aircraft type, data freshness), with an "Internet Traffic — not for navigation" disclaimer.
- **Map Settings** — Brightness, Invert Colors, Map Theme, Terrain, Day/Night Overlay, Place Labels, Cultural Elements, Auto-Center Mode (North Up / Track Up Centered / Track Up Forward — three distinct modes), Route Labels, **Operational Notes** (a company-policy annotation layer — natural fit for SKYE's RAAS content), Extended Centerlines, Ownship Distance Rings.
- **Glide Settings** — per-tail-number config (Best Glide Speed + Glide Ratio) across a fleet list, some tails flagged "Glide Not Configured." Visual proof this is fleet-scoped, not single-aircraft.
- **Emergency Glide Mode** — confirmed as a full dedicated red-PFD-style full-screen UI: "No Attitude Information" banner, GS/GPS ALT tapes, compass rose with XTRK, DIST/ACTIVE LEG/ETE header, a full annotation/scribble toolset overlaid, and a real approach plate insertable directly onto the map with the missed-approach path drawn in magenta.

### 3. Imagery — **NEW, missed entirely in the first draft**
A full standalone aviation weather-chart library, distinct from Map overlays: Prog Charts (hour-by-hour out to Day 7), ~20 regional graphical Cloud/Surface forecasts, Winds Aloft by altitude band, Graphical AIRMETs, SIGMETs by type (Convective/Icing/Turbulence/Dust/All), a full Icing product suite, Turbulence by altitude band × type × forecast hour, Satellite (Visible/IR), Doppler Radar. This is categorically bigger than a single weather endpoint — deserves its own table-stakes line, not folded into "map overlays."

### 4. Plates
Approach/departure/SID/STAR charts. **Guided selection workflow confirmed real, and richer than narrated**: selecting an approach auto-inserts it into the route as a segment pill; tapping it opens a panel with "VERIFY WITH PLATE," an automatic **plate-currency/expiry warning** ("Approach expired, see Downloads"), Change Approach/Hide Plate controls, a fix-by-fix route list down to the DA/DH, a **photorealistic runway-approach photo in both day and night versions**, Approach Lights/Short Final toggles, and a Missed Approach text block.

### 5. Flights
Route/plan building, filing, calculations.
- **Flights list** — grouped by month, route/altitude/ETD/ETA/route string per entry.
- **Performance/TOLD calculator — fully confirmed, and the richest single finding in this whole review.** Aircraft config (flaps, deice, inertial separator, ACS, safety-distance factor), weight/density-altitude inputs, **live METAR auto-pulled** for weather, runway-by-runway comparison table with live headwind/crosswind, TORA/TODA/ASDA, VR, 50ft speed, accelerate-stop distance, ground roll, climb speeds/rates per flap setting, PDF export. This is the concrete target spec for SKYE's #1 confirmed gap.
- **Flight Meter/Times** — Hobbs Start/End/Total, Time Out/Off/On/In, Flight time, Block time — dispatch-release-grade time accounting.
- **File (ICAO flight plan)** — full ICAO form: Form Type/Rules/Type, aircraft wake-category suffix, TAS, departure/route/altitude/enroute time/fuel aboard. **STS Special Handling picker includes MEDEVAC** (also ALTRV/ATFMX/FFR/FLTCK/HAZMAT/HEAD/HOSP/HUM/MARSA) — Sean's own sample flight had MEDEVAC selected, directly relevant to his real LFN job. Also full dinghy/emergency-equipment fields (life jackets, radios, survival gear by biome) — oceanic/international-capable, likely low priority for current domestic ops but real.
- **W&B — multiple saved profiles per aircraft, confirmed real** ("Select a W&B Profile" modal, named profiles per tail). This resolves S52.67's flagged-but-unconfirmed item #8.
- **PACK — confirmed, and structurally different from what was assumed.** Route-preview map, then an itemized download manifest with sizes: weather/AIRMETs-SIGMETs/NOTAMs, Jeppesen Charts, Airport & Nav Database, **Emergency Landing Geometry, Runway Obstacle Analysis, Worldwide Obstacles**, IFR/VFR charts, Terminal Procedures, user Documents — plus a Pause/in-progress state (only one PACK job runs at a time, route-scoped). Settings has an **"Enable Auto-Check"** toggle described as auto-checking "for needed data for a planned route of flight" — **PACK is fundamentally a data-currency/completeness checker that also bundles the download, not just a document bundler.** This reframes it: SKYE's equivalent needs a completeness/currency check as the core mechanic, with document bundling as a side effect.

### 6. Scratch Pad
Typed or handwritten templates for clearance capture, used regardless of ACARS availability. In-flight amendments get written here first, then transferred to the Map's FPL editing surface.

### 7. Documents
Confirmed exactly as narrated, with real content: an "Imported" binder holding Sean's actual Life Flight Network operator docs (GOM, Fuel Handling Procedures, MEL Process, PC-12 POH, NEF List), plus FAA/Jeppesen/NAV CANADA drives with real downloadable datasets. Purely informational — no rules engine behind it.

### 8. Logbook
**Pilot logbook only**, confirmed no aircraft/CAN equivalent (explicit SKYE differentiator to preserve). Entry form is far more granular than assumed: Hobbs/Tach/duty times with a Zulu-time quick-fill, PIC/SIC/Night/Solo/Multi-Pilot/PICUS/Examiner roles, day/night takeoff/landing counters, Instrument (actual/sim/IFR/holds/approaches), NVG time+ops, Training (dual given/received, sim flight, ground training + instructor signature), flight tags, crew/passengers, flight photos, comments. **Track Logs auto-generate draft logbook entries** ("Draft from ForeFlight Track Log") — a real, working auto-population pipeline, not just a manual form.

### 9. Aircraft
**Confirmed materially deeper than "manual data + custom content" as originally assumed.** Real sub-sections: General/Performance/Ownship/Glide (real PC-12 numbers — 119kt, 15:1 glide ratio, notably matching SKYE's own hardcoded value), Altitudes, Weights, Fuel, Filing (FAA/ICAO codes, STS handling incl. MEDEVAC), Dinghy, Emergency/Survival equipment, NAV Canada fields. Sean's "type-specific custom content" vision is a real, separate idea layered on top of this, not a replacement for it.

### 10. Custom Content — **NEW top-level section, matches Sean's own naming**
Custom Charts (MBTiles/GeoPDF upload), Custom Map Layers (KML/KMZ/GeoJSON), User Waypoints, and downloadable versioned "Content Packs" (e.g. "Airport Construction Notices"). This is close to a structural template for Sean's own "push type-specific content" vision for SKYE's Aircraft section — worth reusing the pattern rather than inventing a new one.

### 11. Track Logs
Confirmed rich: full map + route, dual-axis altitude/speed graph, scrubber with speed multiplier, a 3D toggle, Info/export/Edit actions. Feeds the Logbook auto-draft pipeline above.

### 12. Device
Confirmed: Sentry ADS-B pairing card (ADS-B Weather/Traffic, WAAS GPS, AHRS, CO alerts, pressure altitude) with a Buy Now CTA when nothing's paired; clean "No supported devices connected" empty state otherwise. Natural home for RealWear/Starlink pairing per Sean's vision.

### 13. Passenger Mode — confirmed live and real, not just a pitch
An active toggle in Sean's own account ("✓ Sending route updates to Passengers... Disable Passenger Mode") — a genuinely shipped, non-pilot-facing companion tracking feature.

### 14. Send To / Share
Cross-section sheet: Mail, Flights, Plates, Logbook, Clipboard, Share FPL File, Print, Passenger. Cross-feature linking is explicit and first-class throughout the app, not a bolt-on.

### 15. Search & Rescue (SAR) mode — **NEW, not previously known**
A dedicated mode with its own SAR waypoint entry (lat/lon) and search-pattern features. Niche relative to Sean's Part 135/medevac focus, but notable as an example of ForeFlight building a fully separate mode for a specialized mission profile — directly analogous to what a Dispatch/MX mode-switch inside SKYE is trying to do.

### 16. Discover / What's New — **NEW**
An in-app education hub: Getting Started, Flight Planning, Maps & Charts, Weather guides, plus dated release notes with feature demos (e.g. "Map Annotations 2.0," "AGL Alert Altitudes"). Low product priority, but notable as a retention/onboarding mechanism ForeFlight invests in.

### 17. Cockpit Sharing / Auto-Receive Panel Flight Plans — **NEW**
Settings-level panel-GPS integration: shares flight-plan state with installed avionics and can auto-receive a flight plan from the panel. Relevant if SKYE ever needs to talk to installed avionics rather than just standalone ADS-B receivers.

### 18. Checklist "Speak: Challenge & Response" voice mode — **NEW, directly relevant to RealWear work**
A voice-driven challenge-and-response checklist mode. This is close to a validated existing pattern for what a RealWear-hands-free SKYE checklist experience should feel like — worth reviewing directly as reference UX before designing SKYE's own version.

### 19. Housekeeping
Account, Jeppesen, Support, About (confirms `weathercams.faa.gov` as a real credited data source), Sync Status, Comments (see AI summary feature above under Airports).

---

## Part 2 — Sean's real workflow (MEM→LIT), step by step

Unchanged from the narration — screenshot review confirmed rather than contradicted this workflow order:

| Step | Section(s) | Purpose |
|---|---|---|
| 1 | **Airports** | Weather, NOTAMs, runways, approaches — legality check |
| 2 | **Flights** (some pilots start with weather here; others push to **Map** first) | Build the route |
| 3 | **Plates** | Identify SIDs/STARs/approaches; jump to **Airports → 3D view / live cameras** for unfamiliar fields |
| 4 | **Flights** | File the flight plan |
| 5 | **Flights** | W&B, TOLD, cruise, fuel (primary + 2 alternates) |
| 6 | **Flights → PACK** | Assemble/verify the full legal briefing package |
| 7 | **Scratch Pad** | Copy clearance before/at engine start |
| 8 | **Map (in-flight)** | Weather/wind/ADS-B overlays; amendments via scratch pad → FPL |
| 9 | **Logbook / Track Logs** (post-flight) | Log the flight, review the track for debrief |

Standing addition: this same weather/NOTAM/route/W&B/fuel info should also be visible to **Dispatch** users, who at many Part 135 ops file the flight plan, arrange FBO logistics, and produce the manifest.

---

## Part 3 — Feature-by-feature map against SKYE

Legend: 🟢 SKYE has a real equivalent · 🟡 Partial/weaker equivalent · 🔴 No equivalent (table stakes gap) · 🔵 SKYE-only capability ForeFlight lacks

| ForeFlight feature | SKYE status | Detail |
|---|---|---|
| Airport weather/NOTAMs/runways | 🟡 | `Preflight` tab (`GET /v1/aviation:weather`); Dispatch has `GET /v1/aviation:notams` (real, but hardcoded to Hawaii bases — needs to generalize to the filed trip). Downgraded from 🟢 per red-team check — Sean's own live-test read on this tab was "good direction, not quite there," which the doc had dropped |
| 3D Airport view | 🔴 | No equivalent. Confirmed rich (day/night, runway-selector grid, live HUD) — bigger lift than first assumed |
| FAA live airport camera feed | 🔴 | No equivalent. Confirmed real public source (`weathercams.faa.gov`) — genuinely cheap to integrate if that endpoint is open |
| Airport Comments → AI "Pilots Say..." summary | 🔴 | No equivalent, and notable: this is ForeFlight's *own* only shipped AI feature. SKYE's whole premise is AI-native — this specific feature is low-hanging fruit that plays directly to SKYE's strength (an LLM synthesizing airport-specific pilot notes is easy relative to TOLD/W&B math) |
| FBOs directory + fuel release request | 🔴 | No equivalent confirmed |
| Map (base layer, traffic, ADS-B) | 🟢 | `AviationMap.jsx`, real chart data, layer toggles |
| Map overlay breadth (~25 layers) | 🟡 | SKYE has the core aviation-relevant layers; long tail (PIREPs, Lightning, Dewpoint Spread, etc.) not confirmed. Lower priority per Sean's own framing |
| Map → Edit/NavLog/Profile tabs | 🟡 | Profile view exists and is close to parity (commit `82efe12c`). NavLog (leg-by-leg course/dist/ETE/fuel) not confirmed to exist as a dedicated view — real gap, now correctly scoped (was mis-described in first draft) |
| **Imagery (Prog Charts, regional forecasts, Winds Aloft, AIRMET/SIGMET, Icing, Turbulence, Satellite, Doppler)** | 🔴 | No equivalent — single weather endpoint today. **Upgraded finding**: bigger gap than "map overlays," deserves its own line item |
| Plates: guided STAR→Approach→DA/MDA/DH→Insert→auto briefing strip (day/night photo, missed-approach text) | 🟡 | `Charts` tab does real chart lookup/fetch, but the guided selection workflow and auto-generated briefing strip are not confirmed to exist. Also: an ILS plate lookup failed live during retest, not fully root-caused |
| Flights: route/plan building | ⚪→🔴 | Canvas `Flight` tab is fully hardcoded fixture data (highest-priority rebuild target per architecture doc) |
| **TOLD calculator** | 🟡 | **Corrected 2026-09-09**: a real one exists (`PerformanceCalculator.jsx`/`aviationPerformance.js`, real density-altitude/wind physics + FAA rule-of-thumb math, mounted in Dispatch's `ReleaseFlightModal`), not absent. Gap vs. ForeFlight: one aircraft type sourced, no TORA/TODA/ASDA per-runway table, no live METAR auto-pull, no per-flap climb data, no PDF export, informational-only (doesn't gate release). This is an enhancement job, not a build-from-zero |
| Flight Meter/Times (Hobbs, Out/Off/On/In, Flight/Block time) | 🔴 | No equivalent confirmed |
| ICAO flight plan filing incl. MEDEVAC/special-handling flags | 🔴 | Filing exists on the Dispatch side conceptually but full ICAO-form fidelity (STS codes, wake category, dinghy/survival fields) not confirmed. **MEDEVAC flag specifically relevant** given Sean's real job — worth prioritizing over the oceanic/dinghy fields |
| W&B multiple saved profiles per tail | 🔴 | SKYE has a real W&B calculator (per S52.67) but multiple saved configs per aircraft not confirmed — now resolved as a real ForeFlight feature to match |
| **PACK (data-currency check + briefing bundle)** | 🔴 | No equivalent. Reframed by this review: the core mechanic is a **completeness/currency check**, not just bundling. **Resolved 2026-09-09**: checked `_cosTools` directly (`functions/functions/index.js:10613`, the full 20-tool array) — no crew-legality, FRAT, or W&B tool exists anywhere. Crew-legality *data* is real (`crewRosterCurrency`) but REST-only, viewed by a human on the Dispatch dashboard; Dispatch's chat cannot call it. A real PACK needs new tool-wiring for all three (crew-legality-via-chat, FRAT, W&B-via-chat), not just composing already-callable pieces |
| Scratch Pad | 🟡 | Confirmed working in retest, but it's a generic freeform drawing canvas (`ScratchPad.jsx`, localStorage-persisted) — no clearance-specific templates or structured fields like ForeFlight's. Downgraded from 🟢 per red-team check: real but not full parity |
| In-flight route amendment (scratch pad → FPL) | 🔴 | Known gap: `ChatPanel.jsx` missing `addInlineCard` arg |
| Documents (content locker) | 🟢 | Full EFB → Documents sub-tab, real, rated "really good" by Sean |
| Logbook (pilot only, no aircraft equivalent) | 🔵 | SKYE-only advantage: has both Pilot logbook and Aircraft Logbook (real, shared read-only view). Confirm this stays a stated differentiator |
| Logbook entry granularity (NVG, PICUS, Examiner roles, day/night landing counts, dual given/received) | 🟡 | SKYE's manual entry form is comparatively basic — real granularity gap, moderate priority |
| **Track Logs → auto-draft Logbook entries** | 🔴 | No equivalent. Confirmed as a real, working pipeline in ForeFlight — meaningful UX win (removes manual logbook entry after every flight) |
| Aircraft profile depth (Performance/Ownship/Glide/Weights/Fuel/Filing/Dinghy/NAV Canada) | 🟡 | SKYE's MX `Aircraft` tab is real and arguably more operationally complete (airworthiness computation) than ForeFlight's static-data version, but lacks this specific depth of per-aircraft performance/filing profile |
| Glide ratio — fleet-configurable per tail | 🔴 | SKYE hardcodes one aircraft (15:1, PC-12) in `AviationNearest.jsx` despite `aircraftTypeProfiles.js` already existing for this purpose elsewhere. Confirmed real, visible, cheap-relative-to-payoff fix |
| Emergency Glide Mode (dedicated full-screen UI) | 🔴 | SKYE has the underlying glide-range calculator (`AviationNearest.jsx`) but not the dedicated full-screen activatable mode. Confirmed as a real, richly-designed ForeFlight screen — bigger UX lift than previously scoped |
| Off-airport landing-site reference | 🔴 | Still unconfirmed either way from screenshots — carry forward from S52.67 as an open item |
| Custom Content (charts/map layers/waypoints/content packs) | 🔴 | No equivalent. Real structural template worth reusing for Sean's "push type-specific content" vision under Aircraft |
| Device pairing (Sentry/ADS-B) | 🔴 | No equivalent; natural home for RealWear/Starlink, ties into active integration work |
| Passenger Mode | 🔴 | No equivalent — any SKYE role today is pilot/ops-side only |
| Search & Rescue mode | 🔴 | Niche; low priority given current Part 135/medevac focus |
| Discover/What's New in-app education hub | 🔴 | Low priority; retention mechanism, not a workflow feature |
| Cockpit Sharing / Auto-Receive Panel FPL | 🔴 | Low priority unless SKYE needs installed-avionics integration beyond ADS-B |
| **Checklist "Speak: Challenge & Response" voice mode** | 🔴 | No equivalent — but this is a validated existing UX pattern to copy directly for SKYE's RealWear hands-free checklist work, not a from-scratch design problem |
| **Dispatch visibility into flight/weather/route info** | 🟡 | SKYE's Dispatch role already has real weather/NOTAMs/releases/manifest tabs — structurally ahead of ForeFlight (no dispatch-facing surface at all). Real gap: NOTAMs hardcoded to Hawaii bases |
| **RAAS / rules engine behind any of this** | 🔵 | ForeFlight has none by design (Sean's own words). Real structural advantage, but **uneven coverage today** — confirmed wired for weather/NOTAMs; confirmed *not* wired to chat yet for FRAT/W&B/crew-legality. Don't read this as a blanket advantage against every row above |

---

## Part 4 — Reconciled table-stakes punch list

**Corrected 2026-09-09 after red-team check:** crew qualifications/currency visible cross-crew is **not** an open gap — `crewRosterCurrency` (real, deployed, tenant-scoped) already does this; removed from the punch list below. TOLD calculator moved from "build from zero" to "enhance existing" (see Part 3). **Resolved same day**: the red team also raised whether crew-legality/FRAT/W&B data is reachable by Dispatch's *chat* as a callable tool, vs. only as a REST endpoint a human views. Checked directly — it is REST-only; no such tool exists in `_cosTools`. See the PACK row below.

**Confirmed genuine gaps (highest confidence):**
1. **TOLD calculator — upgrade, not build.** Real screenshot-verified target spec for what's missing from the existing `PerformanceCalculator.jsx`: live METAR auto-pull, TORA/TODA/ASDA per-runway table, per-flap climb data, PDF export, additional aircraft types beyond PC-12/47E, and a decision on whether it should gate release (like ForeFlight) or stay informational.
2. **Track Log / post-flight replay with auto-drafting logbook entries** — not just a replay view, a real workflow-time-saver ForeFlight has and SKYE doesn't.
3. **Glide ratio — not hardcoded, but effectively inert.** Red-team correction: `AviationNearest.jsx` already has a real lookup path (`aircraftType` prop → profile → fallback), it's just that (a) nothing in the app currently passes a non-default `aircraftType`, and (b) `aircraftTypeProfiles.js` — its own header marks it a placeholder — has exactly one aircraft type sourced, the same value as the fallback. So wiring the existing path through today would change nothing; the real work is sourcing real per-type POH glide data for each additional aircraft SKYE needs to support. Bigger lift than "cheap fix" as originally framed.

**Upgraded or reframed this pass:**
4. **PACK.** Reframed from "briefing bundler" to "data-currency/completeness checker that also bundles a download." Confirmed no equivalent exists. Scoping it depends on the open question above (is crew-legality/FRAT/W&B data chat-callable yet, not just REST-viewable).
5. **Imagery (weather-chart library).** Elevated to its own line item — bigger than "map overlays," a real gap.
6. **Aircraft profile depth.** Elevated — the "custom content" idea Sean described is real but sits on top of a materially deeper baseline profile (performance/weights/fuel/filing) SKYE doesn't have yet either.
7. **Emergency Glide Mode as a dedicated full-screen UI**, not just the underlying calculator SKYE already has.

**Net-new, not in S52.67 at all:**
8. **Airport AI-summary ("Pilots Say...")** — ForeFlight's only shipped AI feature. Real caveat from the red-team pass: the LLM-summarization step is the easy part; the actual precondition — does SKYE have or can it get a corpus of crowd pilot comments per airport to summarize — is unverified, not confirmed cheap.
9. **NOTAM-currency warning banner directly on charts** — a UX pattern, not a data gap, cheap to adopt once the underlying chart-currency check exists.
10. **Checklist voice mode ("Speak: Challenge & Response")** — directly reusable reference UX for the RealWear hands-free work already underway; de-risks that design problem rather than adding a new one.
11. **ICAO flight-plan MEDEVAC/special-handling flag** — small, concrete, and personally relevant to Sean's real job; worth prioritizing ahead of the broader oceanic/dinghy fields that come with it.

**Already strong / keep as differentiators (do not regress):**
- Pilot + Aircraft dual logbook (ForeFlight has only the former)
- Documents content locker (already rated "really good")
- Fleet-wide crew qualifications/currency roster for Dispatch (`crewRosterCurrency`) — real, and something ForeFlight itself doesn't expose this way
- Dispatch-facing surface (ForeFlight has none)
- RAAS/rules engine — a real structural advantage, but **only where a rule is actually wired to a chat-callable tool today** (confirmed via direct `_cosTools` check for weather/NOTAMs; confirmed absent for FRAT/W&B-via-chat/crew-legality-via-chat — the crew-legality *data* exists via `crewRosterCurrency` but is REST-only, not chat-callable). Don't cite RAAS as a blanket advantage against every ForeFlight gap above — it's real, but its coverage is uneven today.

**Not table stakes — explicitly deprioritize:**
- Full overlay-layer parity (PIREPs, Lightning, Dewpoint Spread long tail)
- Search & Rescue mode, Discover/education hub, Cockpit Sharing — niche or retention-only, not workflow-critical
- Dinghy/oceanic survival-equipment fields — real but low priority for current domestic Part 135/medevac ops

---

## Part 5 — Role division of labor: Pilot vs. MX vs. Dispatch

**Scope gap flagged by Sean (2026-09-09) and fixed here:** everything above skews heavily Pilot-side. That's not an oversight in how the doc was written — it's a structural fact about the source material: **ForeFlight is single-user pilot software. It has no MX (fleet maintenance) surface and no Dispatch/ops surface at all.** There was nothing MX- or Dispatch-shaped in 245 screenshots of a pilot's own iPad to extract, because ForeFlight doesn't build for those roles. So Parts 1-4 are an honest inventory of what they cover — but presenting that as "the SKYE gap analysis" without saying so up front understates how far ahead SKYE already is in the two roles ForeFlight simply doesn't address.

**ForeFlight has zero answer to either of these roles. SKYE already has real, mostly-live coverage for both** (per `docs/SKYE-AVIATION-TAB-ARCHITECTURE.md`):

- **MX (`av-mx-001`) — SKYE's single most complete lens, nearly every tab real**: Aircraft (airworthiness computation), Aircraft Logbook, Scheduled MX, Unscheduled MX, Inspections, ADs/SBs, MEL (category A/B/C/D rectification-deadline math), Warranty, NEF — all backed by real endpoints (`aircraftRecords.js`). Only Documents is static. Chat tool-awareness for `file_squawk`/`log_maintenance_entry` fixed 9/8.
- **Dispatch (`av-dispatch-001`) — also mostly real**: Requests, Schedule, Crew (the `crewRosterCurrency` roster this session corrected), Pax Manifest, Aircraft Status, NOTAMs, Weather, Releases are all backed by real endpoints. Fleet Map is the one gap (only the generic, non-`-001` slug has a live weather map). Dispatch's system prompt claims a 7-step release package; `weather_brief`/`get_notams` are real chat tools, crew-legality/FRAT/W&B are not (see PACK, above).

**For MX and Dispatch table-stakes specifically, ForeFlight is not the right benchmark — `CODEX-S52.67` already did that research correctly**, against Vellox Group/FlightVector (real ops/dispatch software, and the platform Sean personally flies under at Life Flight Network) and Ramco Aviation (MRO/maintenance software). That doc's biggest MX/Dispatch-relevant finding, independently confirmed there: **no Safety Management System (SMS) module** — a real industry-standard category for Part 135/HEMS operators specifically, with no SKYE equivalent. That belongs in the same table-stakes conversation as this doc's Pilot-side findings, not a separate one.

**Assigning role-ownership to this doc's own gaps** (per Sean's own workflow narrative — at many Part 135 ops, Dispatch files the flight plan, arranges FBO logistics, and produces the manifest, not just the pilot):

| Gap (from Part 3/4) | Primary role | Why |
|---|---|---|
| TOLD calculator (enhance) | Pilot, but Dispatch needs to see the same number | Pilot computes it preflight; Dispatch's release decision depends on the same figure — one calculation, both roles need visibility |
| PACK (crew-legality/FRAT/W&B tool-wiring) | **Dispatch primarily** | This is literally Dispatch's stated 7-step release package in its own system prompt — it's not a pilot feature at all, it's Dispatch's core job that happens to also benefit the pilot |
| Crew currency roster | Dispatch (already real) | Already correctly Dispatch-facing (`crewRosterCurrency`), not pilot-facing — this is right, not a gap |
| Imagery weather-chart library | Pilot + Dispatch shared | Both roles need the same weather picture; today only Pilot's `Preflight` tab has any weather at all |
| Track Log → auto-draft logbook | Pilot | Personal logbook, pilot-only by nature (matches ForeFlight) |
| Aircraft profile depth (performance/weights/fuel/filing) | MX owns the record, Pilot/Dispatch read it | MX's `Aircraft` tab is the natural owner; Pilot and Dispatch both need read access for planning |
| Airport AI-summary | Pilot (mirrors ForeFlight's own placement) | Lowest-priority role question — a pilot-facing convenience either way |
| SMS module (from S52.67, not this doc) | MX/Dispatch/Safety jointly | Confirmed the single biggest MX/Dispatch-relevant gap across both research passes — worth pulling into this doc's punch list rather than leaving it siloed in S52.67 |

**How to apply going forward:** any future ForeFlight-sourced research should be labeled explicitly as Pilot-scope only, with MX/Dispatch table-stakes questions routed to S52.67-style benchmarks (Vellox/Ramco, or their successors) instead — don't expect ForeFlight screenshots to ever answer an MX or Dispatch question, because the product was never built to.

**The other half of this — how a user actually gets routed to the right role — is already fully specced, not a new gap.** `CODEX-S52.69`'s top-priority item (2026-09-08, still unbuilt) is exactly this: a first-run "are you a pilot, maintenance tech, or dispatch" question that drives three genuinely distinct home screens from then on, with easy switching afterward for the shared-device case. This doc's Part 3/4 findings (TOLD, PACK, Imagery, etc.) are all *content* gaps within whichever role a user lands in; the onboarding spec in S52.69 is the *routing* gap that decides which role's content they see in the first place. Both need to happen — table-stakes features are wasted if a user never gets routed to the screen that has them.

---

## Recommendation

**Corrected 2026-09-09.** The original version of this recommendation named the TOLD calculator as "the single highest-confidence build-from-zero target" — that premise was wrong (a real calculator already exists) and has been fixed throughout this doc. The honest recommendation now:

1. **Enhance the existing TOLD calculator** (`PerformanceCalculator.jsx`) rather than build one: add live METAR auto-pull, a TORA/TODA/ASDA per-runway table, per-flap climb data, and source performance profiles for whatever aircraft types beyond the PC-12/47E SKYE needs to support next. Decide deliberately whether it should gate a release (like ForeFlight) or stay informational — that's a product/safety call, not an engineering one.
2. **PACK is the clearest real zero-to-one gap** — genuinely no equivalent exists. **Resolved**: checked `_cosTools` directly — crew-legality, FRAT, and W&B are all REST/human-viewed only, none are chat-callable. A real PACK needs new tool-wiring for all three before it can be a chat-driven "one action assembles everything" feature; it isn't mostly composition of already-callable pieces.
3. **Airport AI-summary feature** is still a good candidate for a fast, visible win — ForeFlight's only shipped AI feature, directly playable to SKYE's strength — but only once someone confirms SKYE has (or can get) a real corpus of per-airport pilot comments to summarize. The AI step is cheap; the data-sourcing step is unverified and could be the actual blocker.

The corrected picture is less flattering than the original draft but more useful for actually planning work: SKYE has more built already (crew currency, a real basic TOLD calc) than the first pass credited it for, and the genuinely open gaps are narrower and more specific than "build a performance calculator from scratch."
