# CODEX 64 — CoPilot iPad UX
# Aviation Intelligence Layer — iPad-First Design

**Status:** Spec  
**Author:** Sean + Claude · 2026-08-02 · HNL Airport  
**Vertical:** Aviation  
**Workers:** CoPilot (av-copilot-001), Dispatch (av-dispatch-001), MX (av-mx-001)

---

## Problem Statement

ForeFlight is the standard. Pilots have deep muscle memory for it. The pain is not
the map — the map is great. The pain is:

1. **You have to jump around.** Map → Flights → Plates → Logbook to do one logical
   thing (pre-flight brief). Every tab switch breaks situational awareness.
2. **It's reactive, not intelligent.** ForeFlight shows you data. It doesn't know
   what matters for YOUR route, YOUR currency, YOUR aircraft TODAY.
3. **The compliance layer is dumb.** FVO is a table. It emails you when things expire.
   There is no proactive scheduling intelligence.

The love: **ForeFlight as independent instrument panel.** If avionics go dark —
EFIS fails, G1000 freezes — the iPad on the kneeboard is showing live GPS position,
track, groundspeed, and a moving map. Pilots trust their lives to it. We must not
break this use case. We must earn the right to sit next to it.

---

## Design Principle: iPad First, Phone Never Forgotten

**Primary form factor: iPad** (10" to 12.9" — kneeboard or yoke mount)

A phone is a compliance dashboard and a quick-look. An iPad is a cockpit instrument.
These are different products with different trust requirements. The CoPilot iPad
experience must be designed to be trusted in IMC at FL250, not just in the FBO.

**Implications:**
- Split layout: map always visible, intelligence always adjacent. No tab-switch to hide the map.
- Offline-first: cellular is unreliable at altitude. Brief data cached before departure.
- Backup instrument mode: full-screen map with GPS instruments — no account needed, works with no connectivity.
- Touch targets sized for gloves-off, turbulence-tolerant operation.

---

## Three-View Architecture

### View 1: Ground / Pre-flight
_Default state when no flight is active_

**Layout: 60/40 split**

```
┌─────────────────────────────────┬────────────────────────┐
│                                 │  COMPLIANCE STATUS     │
│                                 │  ─────────────────     │
│         MOVING MAP              │  9 items · 09/30       │
│         (airport + terrain)     │  [yellow banner]       │
│                                 │                        │
│         [current position dot]  │  OPERATING FEED        │
│                                 │  ─────────────────     │
│                                 │  · FW Gen Sub due 60d  │
│                                 │  · PC12 Flight due 60d │
│                                 │  · CBT Q3 no date      │
│                                 │  [+ 6 more]            │
│                                 │                        │
│                                 │  ┌─────────────────┐   │
│                                 │  │  START A FLIGHT  │   │
│                                 │  └─────────────────┘   │
│                                 │                        │
│  [weather overlay toggle]       │  Alex chat input       │
└─────────────────────────────────┴────────────────────────┘
```

**Right pane scrolls vertically** — no tabs. Sections:
1. Compliance status (real FVO data, YELLOW count prominent)
2. Operating Feed (active alerts from Alex)
3. Recent logbook entries
4. [START A FLIGHT] action button
5. Alex chat input always at bottom

**Map:** Current position, terrain, nearby airports. Weather overlay toggle
(METAR station model, SIGMET boundaries). No route drawn yet.

---

### View 2: Active Flight / Pre-flight Brief
_Triggered by tapping START A FLIGHT or when a dispatch release exists_

**Entry flow:**
1. Tap START A FLIGHT → enter route (ICAO/ICAO, or spoken to Alex)
2. Route draws on map immediately
3. Right pane auto-generates brief (Alex calls weather_brief + get_notams in background)
4. Brief appears section by section as data arrives

**Layout: Same 60/40 split**

```
┌─────────────────────────────────┬────────────────────────┐
│                                 │  PHOG → PHNL · 0:45   │
│    ROUTE ON MAP                 │  VFR · N661LF          │
│    PHOG ─────────── PHNL        │  ─────────────────     │
│                                 │  WEATHER BRIEF         │
│    [weather along route]        │  PHOG: VFR 3000 OVC    │
│    [TFR rings if any]           │  PHNL: VFR CAVU        │
│    [NOTAM markers tappable]     │  En route: no SIGMET   │
│                                 │                        │
│                                 │  NOTAMs (2)            │
│                                 │  · ILS Rwy 26L U/S     │
│                                 │    [tap to expand]     │
│                                 │                        │
│                                 │  CURRENCY              │
│    [tap NOTAM dot = expand]     │  ✓ All current for     │
│                                 │  this flight type      │
│                                 │                        │
│  [recenter] [weather] [notams]  │  W&B QUICK CHECK       │
└─────────────────────────────────┴────────────────────────┘
```

**Right pane sections during brief:**
1. Route summary (origin/dest, ETA, aircraft, flight type)
2. Weather brief (METAR + TAF per airport + en route summary)
3. NOTAMs (filtered to operationally relevant, expandable)
4. Currency check (for THIS flight type — Part 135 vs 91)
5. W&B quick lookup from profile
6. [RELEASE FLIGHT] or [LOG FLIGHT MANUALLY] at bottom

**The key difference from ForeFlight:** All of this appears in one scroll in the
right pane while the map stays live. No tab switching. The NOTAM dot on the map
and the NOTAM text in the right pane are the same object — tap either, both highlight.

---

### View 3: In-Flight Monitoring
_After release / departure_

**Layout: 60/40 OR full-screen map toggle**

```
┌─────────────────────────────────┬────────────────────────┐
│                                 │  IN FLIGHT             │
│    MOVING MAP                   │  PHOG → PHNL           │
│    [aircraft position tracks]   │  ETE: 0:28 remaining   │
│                                 │  ─────────────────     │
│    GPS STRIP (bottom of map):   │  Alex monitoring:      │
│    TRK 082° GS 198kts FL085     │  No new alerts.        │
│    ALT 8500 ETE 0:28            │  Weather holding VFR.  │
│                                 │                        │
│                                 │  [Scratch pad]         │
│                                 │  ─────────────────     │
│                                 │  [tap to open voice    │
│                                 │   capture for ATC      │
│                                 │   clearance readback]  │
│                                 │                        │
│  [full-screen]  [weather]       │  Alex chat input       │
└─────────────────────────────────┴────────────────────────┘
```

**GPS strip (always visible at bottom of map pane):**
- Track (TRK), Groundspeed (GS), GPS Altitude, ETE
- These four are the minimum backup instrument set
- Visible even when right pane is open

**Right pane in flight:**
- Alex monitoring status (weather changes, airspace alerts)
- Scratch pad button (see below)
- Chat input for questions ("is the TFR still active?", "what's PHNL weather now?")

**Full-screen map mode** (tap expand icon):
- Entire screen is map + GPS strip
- Right pane collapses to a 48px "Alex" handle on the right edge
- Pull handle to reopen right pane
- This is the backup instrument mode — no UI chrome, just map + nav data

---

### Backup Instrument Mode
_What Sean means by "independent instrument panel if everything goes to shite"_

**Activation:** Full-screen map + GPS strip. No connectivity required after brief download.
**What works offline:**
- Moving map (cached tiles for the briefed route + 50nm buffer)
- GPS position, track, groundspeed, altitude (device GPS, no internet)
- Downloaded weather/NOTAM brief (read-only, from pre-flight)
- Logbook (read-only, from Vault sync)

**What doesn't work offline (clearly labeled):**
- Live weather updates
- New NOTAM pulls
- Alex chat (requires API call)

**Trust requirement:** The GPS strip and moving map must work in airplane mode,
with no cell signal, at FL250, in IMC. This is non-negotiable. If we can't
guarantee it, we don't ship backup instrument mode.

---

## Scratch Pad with Voice-to-Text
_Critical feature for IFR clearance readback_

The ForeFlight scratch pad is one of its most-used features. Pilots copy down
ACARS or ATC clearances on it. Our version adds intelligence:

**Flow:**
1. Tap scratch pad → full overlay appears (iPad keyboard or voice)
2. Tap microphone → voice-to-text captures clearance in real time
3. Alex reads the raw text and formats it as a structured clearance:
   ```
   Cleared to PHNL via POKAI1, FALES, direct.
   Climb and maintain 5,000. Expect 10,000 ten minutes after departure.
   Departure frequency: 124.8. Squawk 4721.
   ```
4. User taps CONFIRM READBACK → clearance is locked (read-only) and appended
   to the flight record in Vault as an append-only event
5. The clearance lives in the logbook entry for that flight permanently

**Why this matters vs ForeFlight scratch pad:**
- ForeFlight scratch pad is a notepad. It gets cleared. Nothing is kept.
- CoPilot scratch pad is an append-only record. If there's ever an incident
  and someone asks "what clearance did you receive?" — it's in the Vault,
  timestamped, hash-chained.
- This is defensible evidence. ForeFlight's is not.

---

## What We Do NOT Build

These are ForeFlight's domain. Building them would take years and lose.

- ❌ Navigation database (Jeppesen / AIRAC cycles)
- ❌ Approach plates and instrument procedures
- ❌ Weight & balance from aircraft-specific AFM data entry
- ❌ Track log recording (GPS track of the flight path)
- ❌ Synthetic vision (attitude indicator from GPS)
- ❌ ATC voice communication
- ❌ Filing flight plans directly to FAA/ICAO

**How we handle these:**
- W&B: "Ask Alex about N661LF W&B for 4 POB + 300lbs fuel" → Alex computes from
  the aircraft profile we've built, not a full AFM digitization. Approximate is fine
  for quick check; always recommend confirming with the actual AFM.
- Flight plan filing: link to ForeFlight or 1800wxbrief. We don't file.
- Track log: If the user exports a ForeFlight track log (GPX), Alex can ingest it
  and auto-populate the logbook entry. Import, not record.

---

## Integration Points with ForeFlight

We don't compete — we wrap.

| CoPilot does | ForeFlight does | Integration |
|---|---|---|
| Compliance tracking | Nothing | FVO replacement |
| Pre-flight intelligence brief | Raw data display | Alex synthesizes ForeFlight's data |
| Logbook (Vault) | Logbook (proprietary) | Import from ForeFlight export (CSV/PDF) |
| Clearance record | Scratch pad only | Our scratch pad → Vault |
| Post-flight debrief | Nothing | Alex auto-populates from GPX export |
| Operating Feed alerts | No proactive alerts | Alex pushes compliance alerts |

**Long-term:** ForeFlight has an API for partner integrations. If the product
proves itself with pilots, apply for API access so CoPilot can read real flight
data (currency, logbook totals) rather than requiring manual entry.

---

## Build Sequence

### Phase 1 — Compliance Dashboard (table stakes, shippable now)
- Mobile-responsive CoPilot canvas showing real FVO data
- CAS header: YELLOW:9 prominent
- Operating Feed wired to push_alert (DONE — CODEX 63/64 session)
- Alex can push compliance alerts: "9 items expire 09/30 — open scheduling now"
- Target: visible at next Eric Altshuler conversation

### Phase 2 — Route Brief View (4-6 weeks)
- Route entry in Alex chat ("plan a flight PHOG to PHNL")
- Alex calls weather_brief + get_notams, returns structured brief
- Brief rendered in right pane alongside static map (Mapbox or Leaflet + OpenAero tiles)
- Basic route line on map from entered ICAO pair

### Phase 3 — Live Map + GPS Strip (8-12 weeks)
- Mapbox map with GPS position (browser geolocation)
- Aviation weather overlay (METAR station model via AviationWeather.gov)
- TFR layer (via our existing Notamify integration)
- 60/40 split layout (iPad)
- GPS strip (track, GS, GPS alt, ETE)

### Phase 4 — Backup Instrument Mode + Scratch Pad (12-16 weeks)
- Offline tile caching for briefed route
- Full-screen map with GPS strip
- Voice-to-text scratch pad → structured clearance → Vault append

### Phase 5 — Talking to the Map (6+ months)
- Alex aware of what's on the map ("TFR just appeared ahead")
- Proactive in-flight alerts ("weather building at your alternate")
- "Ask Alex" while looking at map → answer rendered in context of current view

---

## CODEX Links

- CODEX 60: Aviation suite rebuild (7-worker architecture)
- CODEX 61: Aviation logbook + Vault substrate
- CODEX 63: CoPilot canvas real FVO data (session 2026-08-01)
- **CODEX 64: This document** — iPad UX spec
- CODEX 65 (TBD): Phase 2 build — Route Brief View

---

## Open Questions (design decisions for Sean)

1. **Kneeboard vs yoke mount** — does the app need a portrait AND landscape layout,
   or is one sufficient? ForeFlight works both. Our split layout is landscape-native.

2. **Offline brief download trigger** — when does the app cache map tiles and brief
   data for offline use? On flight start? On departure airport entry? Or manual "DOWNLOAD BRIEF"?

3. **ForeFlight track log import** — is GPX export from ForeFlight something you
   actually do, or is the logbook fully manual? If you export GPX, we can auto-fill
   the logbook entry from it.

4. **W&B scope** — do we try to do real PC-12 W&B from the AFM envelope, or just
   show the "quick check" (confirm with AFM)? Real W&B is a significant engineering
   lift and liability consideration.

5. **Eric Altshuler** — does this UX work for Part 135 medevac specifically? He'll
   know if there are HEMS-specific requirements (weight of patient/stretcher, altitude
   considerations, etc.) that should be in the brief view.
