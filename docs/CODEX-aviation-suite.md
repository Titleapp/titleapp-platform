# CODEX — Aviation Suite
*Version 2.0 · 2026-08-09 · SOCIII Inc.*
*v2: Red-team pass — emergency retrieval rule, ForeFlight competitive reframe, EFB table stakes, voice/wearables, duty-limit architecture, fail-closed live data, QRH fact verification.*

---

## Product Promise

**"At least as good as ForeFlight on the EFB fundamentals — weather, NOTAMs, charts, airport info, preferred routing, synthetic backup instruments, NEAREST/GLIDE. A thousand times better everywhere ForeFlight stops at data display: checklists, emergency procedures, logbook that actually connects to your flights, and the company-ops layer (dispatch, MX) that today lives in a separate app entirely."**

---

## Competitive Positioning (as of August 2026)

ForeFlight shipped an agentic AI layer (Airflow, July 1 2026) with voice input via MCP — so "ForeFlight doesn't have AI" is no longer accurate.

**The actual differentiation is tighter and more defensible:**

ForeFlight's AI is general-purpose across every aircraft type and operator. SOCIII's AI is calibrated to *your specific operation's regulated record* — one aircraft type, one company's OpSpecs, append-only RAAS-validated writes that ForeFlight's own AI connector explicitly stops short of (it "creates draft logbook entries for review," not committed records). That caution is correct. We match it on writes; we go deeper on type-specific correctness.

**What ForeFlight genuinely does well (must match or beat):**
- Weather, NOTAMs, airport info including multi-angle ramp photos
- Approach/departure charts (scoped to your actual bases — not global coverage)
- Flight plan form with FAA preferred routing (honest framing: suggested, not ATC-granted)
- In-flight route mapping (independent of onboard avionics — the independence IS the value)
- Synthetic backup PFD (attitude, speed, altitude tape from device GPS/sensors when panel fails)
- NEAREST airport and GLIDE ring configuration — high value for single-engine pilots
- ADS-B traffic display

**Where ForeFlight stops — SOCIII's 1000x territory:**
- Checklists and emergency procedures: ForeFlight has nothing here
- Logbook that actually connects to recorded flight data: ForeFlight records flights but doesn't close the loop to the logbook
- Company ops (dispatch release, crew legality, MX tracking): still a separate app for every Part 135 operator today
- Type-specific, operator-specific AI accuracy: ForeFlight can't know N661LF's actual ITT limit with certainty — we can

---

## The Four Workers

### 1. CoPilot (av-copilot-001)
**Persona:** Skye — personal PIC assistant and copilot. Knows your aircraft, your currency, your last 10 flights.
**Home screen:** Interactive aviation map (ForeFlight model). Map is always the first tab.

Skye is a copilot. A human copilot talks to the PIC during every phase of flight. Sterile cockpit doctrine does not restrict Skye — it's designed for non-essential crew conversation, not for a pilot's own AI tool in their ear.

**Tabs (in order):**

| Tab | What it does |
|-----|-------------|
| **Map** | Full aviation map: METAR dots always on. Toggles: Airports · Airspace · Navaids · Traffic · Wx Hazards. FAA sectional icons, airplane traffic shapes, dark ocean tiles, SIGMET/AIRMET polygons. |
| **Dashboard** | Compliance + currency snapshot. Actionable items only — things that need attention before the next flight. |
| **Flight** | *Upcoming* planned flight — ForeFlight-style: Date / ETD / Dep / Dest / Alt / Aircraft / Route / Altitude / IFR / W&B / Fuel / FBO / Navlog / Briefing. Living document Skye builds as you talk. |
| **Currency** | Full training record — every item, completion date, expiration, action priority. |
| **Preflight** | Assembled go/no-go package: weather · FRAT · W&B · NOTAMs · release. Pulled from Flight tab route. |
| **Past Trips** | Historical trip archive — past flights, fuel logs, IRS business purpose. NOT upcoming flights. |
| **Debrief** | Post-flight record — FOQA questionnaire, pilot remarks, squawk. Append-only. |
| **Logbook** | FAA-standard columns: Date · Route · Aircraft · Total · Day · Night · IFR Actual · Sim Inst · Day Ldg · Night Ldg · Approach type. Auto-populated from flight data — this is the "connects to your flights" claim. |
| **Charts** | Approach/departure charts and airport diagrams scoped to operator's actual bases (PHOG, PHNL, PHKO, PHTO). Multi-angle ramp photos. Preferred routing with honest framing: "suggested — confirm with ATC." |
| **Synthetic PFD** | Independent synthetic flight instruments (attitude, airspeed tape, altitude tape, heading) sourced from device GPS and sensors — not from aircraft avionics. Value is precisely the independence: panel-dark scenario. |
| **NEAREST** | Nearest airport list with GLIDE ring at current altitude. Range rings color-coded by whether you can make it. High value for single-engine ops. |

**EFB Table Stakes (must reach ForeFlight parity):**
- [ ] Charts tab: approach/departure charts + airport diagrams + ramp photos
- [ ] Synthetic PFD tab: device-sensor-sourced, explicitly independent of aircraft avionics
- [ ] NEAREST/GLIDE: nearest airports with glide-range rings
- [ ] Preferred routing: FAA preferred routes, labeled "suggested — confirm with ATC"
- [x] Map: weather overlays, navaids, traffic, airspace
- [x] Weather: METAR/TAF/SIGMET/AIRMET pull

---

### ⛔ EMERGENCY RESPONSE RULE — NON-NEGOTIABLE

**QRH and emergency procedure responses use RETRIEVAL, not GENERATION.**

Skye's job in a CAS or emergency scenario:
1. Match the spoken/typed emergency to the correct section of the actual, current-revision QRH document stored as a Foundation-tier document in Studio Locker
2. Display that section **verbatim** — character for character — with the matched procedure title shown back: `Matching: ENGINE FIRE → QRH §3.4`
3. **Lead with this line, every single time:** `⚠ VERIFY EVERY STEP AGAINST YOUR PRINTED QRH/AFM. This does not replace the certified document.`
4. The AI's only judgment call is which section matches — never what the section says

This rule holds in voice mode, chat mode, and any future surface. No exceptions for "being maximally useful." The disclaimer leads. Always. This is the opposite of how non-emergency limitation questions should behave (where stating "118 KIAS" directly is correct). Emergency and non-emergency modes are explicitly different.

**Consequence of violating this rule:** a stressed pilot in an actual emergency gets wrong or stale procedure content delivered with AI confidence, with no prompt to check the paper document. That is the single highest-stakes failure mode in this entire product.

---

### PC-12/47E Technical Facts (verified before shipping — cite AFM revision)

These facts must be sourced to a specific AFM revision number stored as a Foundation document. If the document changes, these facts update from the document, not from a system prompt edit.

| Fact | Value | Source |
|------|-------|--------|
| Engine | PT6A-67P · 1,200 SHP | PC-12/47E AFM |
| Best glide | **118 KIAS** (at ~9,000 lbs) | PC-12/47E AFM |
| Vmo | 237 KIAS / Mmo 0.52 | PC-12/47E AFM |
| Max gear speed (Vle) | 185 KIAS | PC-12/47E AFM |
| Max crosswind (demonstrated) | 25 kt | PC-12/47E AFM |
| ITT max continuous | 820°C | PC-12/47E AFM |
| ITT max start (5 sec) | 1,090°C | PC-12/47E AFM |
| MTOW | 10,450 lbs | PC-12/47E AFM |
| Max certified altitude | FL300 | PC-12/47E AFM |
| Engine fire system | Fire handle PULL (arms Halon suppressor) then ROTATE (discharges) — **NOT** "extinguisher" | PC-12/47E AFM |
| Cabin portable fire extinguisher | PC-12 **requires at least one portable fire extinguisher** — confirmed by PIC. State this as fact; never suggest the aircraft lacks one. | PC-12/47E AFM + PIC confirmation |

---

### 2. MX (av-mx-001)
**Persona:** Skye (MX mode) — aircraft-first maintenance partner for the A&P and PIC.
**Home screen:** Aircraft tab — the anchor for everything.

**Tabs:** Aircraft · Aircraft Logbook · Scheduled MX · Unscheduled MX · Inspections · ADs/SBs · Documents

**Key behaviors:**
- Skye can log a squawk from chat: "Log a squawk — [description]" → draft appended to logbook, A&P must sign off
- **Voice capture, human certify** — voice can draft a completed-work entry and route it to the appropriate A&P for sign-off. Voice cannot complete a return-to-service determination. That is a certificated individual's regulated act (14 CFR 43.9/43.11). Voice makes the capture faster; it does not make the certification lighter.
- Aircraft Status in Dispatch links to this worker for detail
- All entries are append-only: squawks are resolved, not deleted

---

### 3. Ground School (av-ground-school-001)
**Persona:** Skye (instructor mode) — Socratic ground school teacher at any ACS level.
**Home screen:** My Courses.

**Tabs:** My Courses · Active Course · Quiz & Exam · Progress · Study Materials

**Key behaviors:**
- Courses are clickable cards — tapping one navigates to Active Course with that course loaded
- Quizzes are clickable cards that auto-populate the chat with the quiz prompt
- Skye teaches interactively: quizzes Socratically before revealing answers
- **No hard-coded operator name** — use "operator" generically throughout
- Demo data uses Sean's actual LFN training record, but UI and copy never say "Life Flight Network"

---

### 4. Dispatch (av-dispatch-001)
**Persona:** Skye (Dispatch mode) — formal release authority assistant.
**Home screen:** Fleet Map.

**Tabs:** Fleet Map · Schedule · Crew · Pax Manifest · Aircraft Status · NOTAMs

**Crew legality — explicit architecture:**
Dispatch's crew-legality gate **reuses the CODEX 65 duty-limit engine**, branched by `operationCategory` (Part 135 standard / HEMES / Part 91). Do NOT rebuild this logic. HEMES branching applies only to helicopter hospital-based EMS — LFN's PC-12 fixed-wing operation uses the standard Part 135 branch. A future helicopter tenant on this Aviation Suite uses the HEMES branch. Same code, different branch.

**Fail-closed on live data — explicit rule:**
If any live data fetch (weather, NOTAMs, ADS-B) fails or times out during a dispatch release:
- Dispatch **blocks the release** — does not silently proceed
- UI shows: "Cannot confirm [weather/NOTAMs/traffic] — live data unavailable. Release blocked until data is confirmed or manually overridden by authorized dispatcher."
- Manual override is logged as an event in the append-only record
This is the same fail-closed pattern as CODEX 68's research-directive error handling, applied to a higher-stakes context.

**Pax manifest:** Supports both medevac (patient + medical crew) AND charter (named passengers + weights). Same manifest format, different role labels.

**Aircraft Status:** Each tail links through to MX worker. Not a duplicate of MX — summary only.

---

## Voice Input & Wearables

### Voice Input Design

**Activation:** Wake-word over Bluetooth (model: "Hey Siri") — never always-listening. Physical/screen push-to-talk is the backup. PTT button stays reserved for ATC radio — Skye uses a separate activation path.

**Read-only queries:** Skye responds immediately. "What's my best glide?" → "118 knots."

**Write actions require confirmation before committing:**
Any voice command that would append to the record (log a squawk, add a logbook entry, add pax to manifest) must be confirmed — spoken "confirm" or screen tap — before it commits. Misrecognition rate in a cockpit is materially higher than typed text. A misheard write into an append-only record is irreversible.

**Emergency QRH voice:** Skye reads emergency responses aloud in TTS. Emergency TTS output is **brief and standardized** — the matched procedure title and memory items only, not a full conversational response. Verbose spoken AI output during an actual emergency competes with ATC and procedure execution for auditory attention. Real memory-item callouts are designed to be terse. Skye matches that discipline.

**Sterile cockpit:** Does not apply. Skye is a copilot. A human copilot communicates with the PIC during all phases of flight.

### Wearables — v1 Scope

**What ships in v1 (push notification mirroring — no native watch app):**
- Currency/compliance alerts mirrored to watch via phone's native notification system (haptic + short text)
- Dispatch release-status changes
- Squawk updates

**What does NOT ship in v1:**
- Full native watchOS/Wear OS app
- QRH display on a watch face — wrong form factor for a safety-critical document that requires a paper-QRH disclaimer. Screen real estate is too small; this is the one surface where the disclaimer will always fail to appear.

**Anchor wearable feature (v2):** Raise-to-speak from the watch to trigger voice input. A pilot's hands are on controls — wrist activation is more natural than reaching for a tablet. This is the right anchor feature, not a secondary display.

**Staleness requirement:** Any wearable surface showing live data (weather, dispatch status) must display a "last updated" timestamp. Aircraft connectivity degrades in flight. Stale data with no timestamp is a trust failure.

---

## EFB Authorization

This product is designed for real operational use in the cockpit (voice, synthetic instruments, emergency QRH retrieval). Each Part 135 operator must authorize it through their own EFB program under **AC 120-76E** (current revision — not 120-76D). SOCIII is not a certified EFB. "Not certified" does not mean "not for the cockpit" — ForeFlight isn't certified either, and it's used operationally because operators authorize it. SOCIII expects the same path.

This needs to be addressed explicitly in the operator onboarding flow, not left as a silent assumption.

---

## PHI Handling

Medevac pax manifest in demo is de-identified. Whether the real product stores actual patient data (name, weight, condition, referring hospital) is a separate, materially larger question — HIPAA Business Associate Agreements, minimum necessary data principles, breach notification. This decision must be made explicitly before any real medevac tenant onboards. It is not covered by demo de-identification.

---

## Demo Context (for Loom videos)

**Operator:** Life Flight Network · Hawaii · Part 135 (demo framing only — no "Life Flight Network" text in generic UI copy)
**Aircraft:** PC-12/47E · N661LF · TTSN 1,847 · PT6A-67P
**PIC:** Combs, Sean · ATP · PC-12/47E type · Medical current
**Bases:** PHOG (Kahului/Maui) · PHNL (Honolulu) · PHKO (Kona)
**Real currency gap:** 9 items expiring 09/30/2026 — the forcing function
**Charter demo:** Maui Land & Pineapple corporate pax on LFN-0808-02

**Demo data isolation:** LFN-branded trip IDs (LFN-0808-xx) and operator references must stay strictly within Sean's demo tenant. They must not appear in templates, onboarding flows, or any content a future tenant could see. Same class of bug as CODEX W-048 catalog-vertical leakage.

---

## Open Technical Gaps

| Gap | Priority | Status |
|-----|----------|--------|
| Charts tab: approach/departure charts + airport diagrams + ramp photos | P0 | Not started |
| Synthetic PFD tab: device-sensor-sourced backup instruments | P0 | Not started |
| NEAREST/GLIDE: nearest airports with glide-range rings | P0 | Not started |
| Voice input: wake-word + PTT (Bluetooth), confirmation-gated writes | P0 | Not started |
| Emergency QRH: retrieval-not-generation, verbatim display, disclaimer leads | P0 | Not started |
| N661LF cabin fire extinguisher: at least one required per AFM + PIC confirmed | P0 | ✓ Resolved |
| PC-12/47E AFM as Foundation document with revision number | P1 | Not started |
| Dispatch crew-legality: wire to CODEX 65 duty-limit engine | P1 | Not started |
| Dispatch fail-closed: block release on live data failure | P1 | Not started |
| Ground School: course card click navigates to Active Course tab | P1 | Not started |
| Quiz cards: "Start quiz" action pre-populates chat | P1 | Not started |
| Fleet Map: fleet aircraft ADS-B icons distinct from METAR dots | P1 | Not started |
| Wearables v1: push notification mirroring to watch | P2 | Not started |
| EFB authorization: AC 120-76E operator onboarding flow | P2 | Not started |
| PHI handling decision for real medevac tenants | P2 | Decision needed |
| CoPilot Weather tab: pull from active Flight tab route | P2 | Not started |

## Completed

| Item | Notes |
|------|-------|
| Dark Matter tiles | CartoDB dark_all deployed |
| FAA sectional airport icons | DivIcon SVG — circle + 4 ticks (public), filled magenta (private) |
| Navaid symbols | VOR compass rose, NDB double circle, fix triangle |
| SIGMET/AIRMET polygon rendering | Wx Hazards layer toggle |
| Airplane traffic icons rotated by heading | Replaces plain red circles |
| CoPilot: Flight tab (upcoming flight planner) | ForeFlight-style navlog |
| CoPilot: Past Trips (renamed from Trip) | Clarifies historical vs upcoming |
| CoPilot: Nav Database removed | Was giving JS error |
| CoPilot: Logbook expanded | Day/Night/IFR/Ldg/Approach columns |
| Dispatch: Crew status color-coded rows | Band-colored table rows |
| Dispatch: Pax manifest includes charter | Alongside medevac |
| Dispatch: Aircraft Status MX link | "Open MX worker" card |
| Ground School: clickable course cards | Replaced static table |
| Ground School: Quiz & Exam clickable cards | Each starts a quiz |
| Ground School: LFN removed from course cards | Generic operator framing |
| Drive search_drive bug fixed | Proxy replaced with explicit method wrapper |

---

*Cross-vertical note: Every fix in this CODEX (color-coded status, clickable cards, fail-closed live data, confirmation-gated writes) should be audited against RE, Nursing, and Business verticals. Aviation solved it first; others should inherit.*
