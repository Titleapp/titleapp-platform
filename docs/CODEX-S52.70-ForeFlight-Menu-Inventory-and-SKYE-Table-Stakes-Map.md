# CODEX S52.70 — ForeFlight Menu Inventory and SKYE Table-Stakes Map

**Status:** Complete (2026-09-09). Grounded in Sean's own narration of his real ForeFlight iPad (MEM→LIT flight) **plus a full read of all 245 of his actual screenshots** (folder: `~/Downloads/FOREFLIGHT IMAGES`, also in Google Drive), reviewed in 4 parallel batches. This version corrects several guesses from the narration-only first draft and adds features that only showed up in the screenshots themselves.
**Relationship to prior research:** `CODEX-S52.67` did video/transcript-based ForeFlight research and produced a gap punch list. This doc is the primary ForeFlight reference going forward — grounded in Sean's own device and real screenshots, organized as ForeFlight actually presents itself. Agreements with S52.67 are noted; net-new findings are marked **NEW**.
**SKYE-side source of truth:** `docs/SKYE-AVIATION-TAB-ARCHITECTURE.md` — cited, not re-derived.

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
| Airport weather/NOTAMs/runways | 🟢 | `Preflight` tab (`GET /v1/aviation:weather`); Dispatch has `GET /v1/aviation:notams` (real, but hardcoded to Hawaii bases — needs to generalize to the filed trip) |
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
| **TOLD calculator** | 🔴 | Confirmed absent, now with a full target spec (live METAR pull, per-flap climb table, TORA/TODA/ASDA, PDF export). Two independent research passes agree this is SKYE's single biggest gap |
| Flight Meter/Times (Hobbs, Out/Off/On/In, Flight/Block time) | 🔴 | No equivalent confirmed |
| ICAO flight plan filing incl. MEDEVAC/special-handling flags | 🔴 | Filing exists on the Dispatch side conceptually but full ICAO-form fidelity (STS codes, wake category, dinghy/survival fields) not confirmed. **MEDEVAC flag specifically relevant** given Sean's real job — worth prioritizing over the oceanic/dinghy fields |
| W&B multiple saved profiles per tail | 🔴 | SKYE has a real W&B calculator (per S52.67) but multiple saved configs per aircraft not confirmed — now resolved as a real ForeFlight feature to match |
| **PACK (data-currency check + briefing bundle)** | 🔴 | No equivalent. Reframed by this review: the core mechanic is a **completeness/currency check**, not just bundling — needs FRAT + W&B + crew-legality tools (already flagged missing in architecture doc) to exist before a real PACK-equivalent is possible |
| Scratch Pad | 🟢 | Confirmed working in retest |
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
| **RAAS / rules engine behind any of this** | 🔵 | ForeFlight has none by design (Sean's own words). SKYE's structural advantage across every row above |

---

## Part 4 — Reconciled table-stakes punch list

**Confirmed by multiple independent passes (highest confidence):**
1. **TOLD calculator.** Now has a full, screenshot-verified target spec (live METAR pull, TORA/TODA/ASDA, per-flap climb data, PDF export). Two research passes (S52.67 video research + this screenshot review) and 3 of 4 review batches independently flagged it as ForeFlight's most-used, most-detailed feature.
2. **Track Log / post-flight replay — now with a specific, higher-value target: auto-drafting logbook entries**, not just a replay view. This raises its priority — it's a real workflow-time-saver, not just a nice-to-have viewer.
3. **Crew qualifications / currency visible cross-crew.** Unchanged from S52.67, still unaddressed.
4. **Glide ratio hardcoded to one aircraft.** Now visually confirmed as a real, fleet-wide-configurable ForeFlight feature — cheap fix, `aircraftTypeProfiles.js` pattern already exists in the codebase.

**Upgraded or reframed this pass:**
5. **PACK.** Reframed from "briefing bundler" to "data-currency/completeness checker that also bundles a download." Still blocked on the same FRAT/W&B/crew-legality tool gap already known, but now has a clearer product shape.
6. **Imagery (weather-chart library).** Elevated to its own line item — bigger than "map overlays," a real gap.
7. **Aircraft profile depth.** Elevated — the "custom content" idea Sean described is real but sits on top of a materially deeper baseline profile (performance/weights/fuel/filing) SKYE doesn't have yet either.
8. **Emergency Glide Mode as a dedicated full-screen UI**, not just the underlying calculator SKYE already has.

**Net-new, not in S52.67 at all:**
9. **Airport AI-summary ("Pilots Say...")** — ForeFlight's only shipped AI feature, and a low-effort, high-fit win for an AI-native platform to match or beat immediately.
10. **NOTAM-currency warning banner directly on charts** — a UX pattern, not a data gap, cheap to adopt once the underlying chart-currency check exists.
11. **Checklist voice mode ("Speak: Challenge & Response")** — directly reusable reference UX for the RealWear hands-free work already underway; de-risks that design problem rather than adding a new one.
12. **ICAO flight-plan MEDEVAC/special-handling flag** — small, concrete, and personally relevant to Sean's real job; worth prioritizing ahead of the broader oceanic/dinghy fields that come with it.

**Already strong / keep as differentiators (do not regress):**
- Pilot + Aircraft dual logbook (ForeFlight has only the former)
- Documents content locker (already rated "really good")
- No rules engine in ForeFlight at all — SKYE's RAAS layer is a standing structural advantage
- Dispatch-facing surface (ForeFlight has none)

**Not table stakes — explicitly deprioritize:**
- Full overlay-layer parity (PIREPs, Lightning, Dewpoint Spread long tail)
- Search & Rescue mode, Discover/education hub, Cockpit Sharing — niche or retention-only, not workflow-critical
- Dinghy/oceanic survival-equipment fields — real but low priority for current domestic Part 135/medevac ops

---

## Recommendation

The TOLD calculator remains the single highest-confidence build target — now with a concrete, screenshot-verified spec rather than a general description. The best net-new insight from the full-image pass is the **airport AI-summary feature**: it's ForeFlight's own only AI feature, it plays directly to SKYE's structural strength (an LLM synthesizing pilot notes is far cheaper to build than TOLD/W&B math), and it's a visible, demoable "we already beat ForeFlight at something" talking point for Part 135 operators. Worth pitching alongside the TOLD calculator as a paired near-term build: one closes the biggest safety-relevant gap, the other is a fast, cheap win that's easy to show off.
