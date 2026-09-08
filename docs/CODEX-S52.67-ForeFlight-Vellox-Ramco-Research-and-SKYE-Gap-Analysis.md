# CODEX S52.67 — Competitive Research (ForeFlight / Vellox-FlightVector / Ramco / EmsCharts) and SKYE Gap Analysis

**Status:** Research complete (2026-09-08). One gap closed same-day (terrain/vertical-profile view, see below). Remaining items below are unscoped/unbuilt as of this writing.
**Owner:** Sean (prioritization) · Claude (research, one build)
**Scope:** Before launching SKYE (SOCIII's aviation Digital Worker suite) and Hannah (nursing), learn from real-world-proven tools in adjacent domains — ForeFlight (general/business aviation EFB), Vellox Group/FlightVector (air-medical ops/dispatch, the platform Sean personally flies with at Life Flight Network), Ramco Aviation (MRO/maintenance software), and EmsCharts (EMS patient charting) — to find genuine pre-launch parity gaps ("table stakes") and genuine differentiation opportunities, not vague ones.

---

## Why this exists

Sean's direction: *"We need to have table stakes here and ForeFlight has lots of real world experience that we can learn from BEFORE launching our product. And also we'll see opportunities for us to do better by reviewing all of this."* This was explicitly not a "beat them" exercise — Sean was clear ForeFlight's Profile view specifically "works well... there is nothing bad about ForeFlight, it's actually really good. What we're adding is better integration, RAAS, and the other toolsets in one place — and eventually the wearable piece with RealWear."

## Methodology

Research was done by watching/extracting from real training and product videos — YouTube (ForeFlight, Ramco) and Vimeo (Vellox Group, under its Australian entity name Avinet Pty Ltd) — using live captions, official video descriptions, and (for ForeFlight) a sweep of the official channel's topical playlists (561 videos total; sampled representative playlists covering Weather, W&B, Dispatch, Logbook, Connectivity, Business, Emergency Glide, Advanced Planning, and Performance rather than exhausting all 561). Video frames render black/stalled in the research sandbox regardless of buffering state — a capture limitation, not a signal about the products — so findings are grounded in transcript/caption/description text, not screenshots, with a small number of targeted screenshots where a UI detail needed visual confirmation. Two initial dead-end conclusions (RAMCO, FlightVector) were superseded after Sean supplied the correct brand names — see note at the end on why.

Every gap claim below was cross-checked against SKYE's actual current code (`apps/business/src/components/canvas/AviationMap.jsx`, `AviationWorkerCanvas.jsx`, `AviationNearest.jsx`, `CockpitView.jsx`, `CoPilotEFB.jsx`, `MyLogbook.jsx`, `functions/functions/services/dispatch/alternateSelection.js`, `docs/CODEX-aviation-suite.md`), not assumed from memory.

---

## Source 1: ForeFlight (16 videos + channel/playlist sweep)

ForeFlight is the direct product-category benchmark for SKYE's pilot/copilot side. Findings below are the bulk of this research.

### Already-closed gap (same day, in response to this research)
**Vertical profile / terrain-avoidance view** — SKYE now has a ForeFlight-Profile-equivalent chart (commit `82efe12c`): altitude y-axis, distance x-axis, real terrain fill (Open-Meteo elevation data, verified live against real mountain ranges), planned-altitude line, Highest Point / Clearance / First Strike stats, magenta conflict-corridor overlay. Built faithfully to ForeFlight's structure per Sean's direction, in SKYE's own dark-cockpit palette. Known, stated limitations: manual ICAO-waypoint route entry only (no live flight-plan state exists anywhere in this codebase to hook into), centerline-only terrain sampling (no lateral corridor scan), no live GPS "actual altitude" overlay, straight-line planning-gradient climb/descent model rather than per-aircraft performance modeling.

### Table stakes / parity gaps — must-fix-before-launch risk
*A working pilot expects any real EFB to have these; ForeFlight has proven them out with real flight hours. Shipping without them is a credibility/safety gap noticed on flight one, not a differentiation choice.*

1. **No takeoff/landing performance calculator — highest-priority gap in this entire research effort.** SKYE's RAAS rules (`av_015_weight_balance_v0.json`, `av_p03_my_aircraft_v0.json`, `av_p05_flight_planning_v0.json`) correctly instruct a worker to flag high-density-altitude or short-runway concerns, and `alternateSelection.js` checks runway length against the aircraft's minimum landing distance "if known" — but there is no actual POH-based distance calculation (weight × density altitude × wind × runway surface → required distance number) anywhere. Every real pilot checks this every single flight, not just in emergencies. ForeFlight's "Performance" playlist treats this as core, not optional (Takeoff & Landing Distances, Runway Analysis, Route and Altitude Advisors, Payload and Fuel Planning all build on it).
2. **No off-airport landing-site reference for the glide/emergency feature.** `AviationNearest.jsx` has a real, working glide-range-to-airport calculator, but offers nothing if no airport is reachable — ForeFlight's Emergency Glide Mode has a dedicated Off-Airport Landings reference layer (fields/roads/other sites) for exactly this case.
3. **Glide ratio hardcoded to one aircraft type** (PC-12/47E, 15:1) in `AviationNearest.jsx`, despite `aircraftTypeProfiles.js` already existing elsewhere in the codebase for exactly this purpose. Cheap, mechanical fix — the pattern already exists, it's just not wired here.
4. **No dedicated one-tap Emergency Mode.** The existing glide-ranked-airports view is a panel among panels, not an activatable full-screen mode the way ForeFlight's Emergency Glide Mode is. Moderate-effort UX/routing change (not new math) for high perceived-safety payoff.
5. **Logbook is fragmented, narrow, and doesn't match ForeFlight's real feature set.** `MyLogbook.jsx` is actually a generic DTC/asset-activity ledger that happens to share the name "Logbook" — it is not a flight logbook. The real pilot logbook lives inside `CoPilotEFB.jsx`, hardcoded to one aircraft type (`copilot:pc12:*` routes), with a bare-bones manual entry form (date/departure/destination/total PIC-SIC time only — no night/instrument/cross-country/landings breakdown). No Track-Log-based auto-entry, no experience-report generator — both confirmed as real, established ForeFlight Logbook features by two independent videos.
6. **No Track Log / post-flight replay-debrief feature at all** — confirmed as a real ForeFlight category (not a guess) by two independent videos ("Post-Flight Tools," "ForeFlight Logbook").
7. **No passenger/companion-facing view.** Every SKYE role today (Pilot/Copilot/Dispatch/MX) is pilot-side; ForeFlight ships a dedicated non-pilot-facing surface for passengers/companions tracking a flight.
8. **Weight & Balance may lack per-aircraft saved configurations** (multiple loading profiles per tail number) — SKYE has a real `WeightBalanceCalculator` and `WB_DISCLAIMER`, but it wasn't confirmed from code whether multiple saved configs per aircraft are supported vs. one generic calculation. Flagged as needing a closer look, not confirmed as a gap.

### Opportunities to differentiate — concrete, not hand-wavy
1. **Route/altitude edits via natural chat language** instead of ForeFlight's in-context map pop-up keypad ("bump cruise to FL180 after CAINS" → the worker updates the map/profile). Same speed as ForeFlight's UI shortcut, no UI to learn. Directly relevant to the just-shipped Profile view's future "Edit route" surface.
2. **Emergency-mode worker that reasons about *why* a landing site is best** (wind, terrain, surface type, explained in a sentence) rather than ForeFlight's static reference list.
3. **On-demand chat-generated experience reports** ("generate my ATP-eligibility experience report") using the `generate_document` tool that already exists and is real — wiring, not new infrastructure. ForeFlight's reports are fixed templates.
4. **Cross-worker answers in one turn** that ForeFlight's siloed screens structurally can't do — e.g., a future performance calculator's output cross-checked automatically against Dispatch's fuel/payload numbers and Logbook currency status, instead of three separate ForeFlight screens a pilot reconciles manually.
5. **RealWear angle for post-flight debrief**: hands-free "how'd my approach look" voice query against a flight's actual GPS track, read back through the headset during walk-around. No current EFB, ForeFlight included, targets a wearable form factor today.

No genuine differentiation opportunity was found for weather products, connectivity/device pairing, or business/dispatch onboarding — match ForeFlight there, don't try to beat it; these are commodity-equivalent.

---

## Source 2: Vellox Group / FlightVector (air-medical ops — Sean's own real work platform)

**Correction note:** initial research under the search term "FlightVector" alone found nothing. Sean supplied the real corporate context: FlightVector is a product of **Vellox Group**, whose own site states it unifies five historically independent businesses — **Spidertracks, Air Maestro, Flight Vector, Complete Flight, and ADSoftware** — with the Dispatch page noting FlightVector was "Formerly FV Technologies." The Vimeo channel Sean linked (`avinetptyltd`) resolves to a profile literally named "Vellox Group" (Adelaide, Australia) — Avinet Pty Ltd is Vellox's original/Australian legal entity name, not a separate company. 140 real videos found there, including actual customer training sessions (a numbered lesson series, a real customer training recording, two 3-hour 2022 User Conference day recordings) and specific feature demos (CAD paging configuration, CAD-to-CAD inter-dispatch handoff, CAD abort functionality, OCC asset out-of-service tracking).

This is the single most credible benchmark in this whole research effort, since it's the actual software Sean flies under at Life Flight Network.

Vellox's real, named product line (`velloxgroup.com/solutions/`): **Operations, Safety Management System (SMS), Fleet Management, Dispatch, Maintenance.** Dispatch specifically: Resource Allocation, Scheduling, Unified Communication, Transport, Digitized Incident Plans, Maps (real-time aircraft tracking + custom geofencing/airspace alerts), Crew Check-Ins, Data Integration & Reporting, Regulatory Compliance.

### Table stakes / parity gaps
1. **No Safety Management System (SMS) module at all — the single biggest gap this whole research thread surfaced.** Vellox's SMS lets crew "create and manage safety and duty reports and risk assessments directly from the cockpit." SMS is an industry-standard category for Part 135/HEMS operators specifically — the segment SOCIII's aviation suite is closest to serving — and there is no equivalent anywhere in SKYE today.
2. **No ops-center-side live fleet tracking or geofencing** (Spidertracks-style). SKYE's map is built around the aircraft's own position (weather/airspace/glide for one aircraft); there's nothing for a dispatcher to watch multiple aircraft live with geofence/airspace alerts.
3. **No unified real-time communication hub or CAD-to-CAD interop concept.** SOCIII's Dispatch role has real records (crew duty roster, trip requests, fail-closed release-flight flow, pax manifest) but no described real-time multi-party comms or inter-agency dispatch handoff.
4. Crew qualifications / type-rating / medical-currency tracking gap (confirmed independently in the Ramco/EmsCharts research thread below — see there) applies here too, since Vellox's Crew Check-Ins feature covers exactly this.

### Opportunities to differentiate
- **Vellox's own positioning is "five historically independent businesses" unified into one platform** — real, self-admitted fragmentation across five separate product brands/UIs. SOCIII's single Skye persona spanning Pilot/Copilot/Dispatch/MX in one chat interface is architecturally the opposite of that. This is a genuine, defensible differentiator grounded in Vellox's own marketing copy, not a hand-wave.

---

## Source 3: Ramco Aviation (MRO/maintenance software)

**Correction note:** the first search hit a dead/wrong channel handle (`@ramcosystems`, 5 subscribers, empty). The real, active channel is `@RamcoSystemsLtd` (3.91K subscribers, 426 videos). `ramco.com/resources?topic=Aviation` is a current, substantial hub of 2025 webinars and whitepapers.

Real finds: "Ramco Aviation Remote Collaboration" (real-time comms linking a technician to engineers/supervisors mid-maintenance-task), "Ramco Maintenance Optimization & Shift Planning" (AOG-turnaround shift/workforce optimization), an "AI-Powered Smart Engine Shops" panel, and — directly relevant to Sean's own RealWear plan — a 2014 NBAA interview specifically on **"MRO Software on Wearables."** Current 2025 content is marketed around "agentic automation," "predictive AI," and "smart wrenches" — but this sits on top of what is still, underneath, panel/table-based MRO software (confirmed from the actual product screenshots visible in the videos, not just the marketing titles).

### Table stakes / parity gaps
- Crew qualifications/type-rating/medical-currency tracking (see Vellox section above) — this is the one concrete pre-launch-relevant MX/Dispatch gap that recurred across sources. `AviationWorkerCanvas.jsx` (line ~570) already self-documents this as missing: each pilot's currency lives only in their own private Vault, invisible cross-crew. A real MX/ops tool needs this as baseline.
- Ramco and (in the prior corrected pass) EmsCharts otherwise yielded no additional table-stakes claims specific to Ramco beyond this.

### Opportunities to differentiate
- **Ramco is retrofitting "agentic automation" onto an older module-based product; SOCIII is chat/agent-native from its foundation, not a retrofit.** This is a real, visible contrast (their own current webinar titles vs. their actual underlying panel/table UI), not a marketing claim — worth stating plainly in positioning against MRO-category competitors.
- Ramco's own NBAA wearables interview (2014) confirms MRO-on-wearables is an established, real category — validates the RealWear MX direction rather than it being a novel bet.

---

## Source 4: EmsCharts (EMS patient charting — future relevance, not current)

**Scope correction from Sean:** this research is explicitly for a *future* bedside/field clinical charting worker, distinct from the current nursing worker (persona Hannah), which is a nursing-*education* platform (cohort overview, clinical hours, competency log, NCLEX prep) — not a patient-charting tool. Forcing a direct comparison to Hannah's current scope would be dishonest; this research is filed forward, not against a current gap. See memory `project_bedside_ems_charting_worker_future.md`.

EmsCharts (Penncare Inc.'s product) has only two real videos, both ~16 years old (1.8–2.8K views): "EMS Reporting Software QA Features" and "EMS Mobile Reporting Software Features." One real, transferable concept: **dynamic QA levels + filters** — patient care reports are routed through tiered review rules rather than every report receiving equal review.

### Opportunity to differentiate (forward-looking, not a current-launch item)
Apply the dynamic-QA-tiering pattern generally, as a RAAS-governed, rule-tiered review-routing layer, to SOCIII's compliance-sensitive workers today — DPP/Elara's regulatory filings, Title/Petra's title-order QA — not just to a future EMS charting worker. This is grounded in a real feature actually observed, not speculative.

---

## Consolidated punch list — if closing 2-3 gaps first

Ranked by safety-relevance, how core the feature is to a working pilot/dispatcher's actual workflow, and effort vs. payoff:

1. **Takeoff/landing performance calculator** (ForeFlight gap #1). Highest safety relevance, checked on every real flight, and the RAAS advisory scaffolding already exists — this is completing a rule that currently only warns without calculating.
2. **Off-airport landing sites + aircraft-type-aware glide ratio** (ForeFlight gaps #2–3). Bundle these — both touch `AviationNearest.jsx`, both are safety-relevant, and the glide-ratio fix is genuinely cheap (the aircraft-profile pattern already exists elsewhere).
3. **Crew qualifications / type-rating / medical-currency tracking** (Vellox + Ramco, and already self-flagged in the codebase). Recurred across every ops/MX-adjacent source in this research — the strongest signal of any single gap being real and expected.

Bigger, non-trivial items intentionally left off this short list (real, but deserve their own dedicated scoping pass rather than a quick add): Safety Management System module, logbook unification/generalization beyond one aircraft type, Track Log/post-flight replay, ops-center live fleet tracking with geofencing.

---

## Why two sources were initially marked "no content" and weren't

RAMCO and FlightVector both returned "nothing found" on a first pass because the search used the product's colloquial name rather than the actual owning company/channel identity (RAMCO's real channel has a different handle than the obvious guess; "FlightVector" is not itself a searchable brand — it's a product line under Vellox Group, née Avinet Pty Ltd/FV Technologies). Sean caught and corrected both. Consistent with this project's standing discipline ([[feedback_verify_dont_trust_relay]]): a "not found" result from a single search term is a reason to check the premise, not a reason to conclude the thing doesn't exist.
