# CODEX 64 — CoPilot iPad UX
# Aviation Intelligence Layer — iPad-First Design

**Status:** Spec v2 — red-teamed 2026-08-02  
**Author:** Sean + Claude · HNL Airport  
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
- Backup instrument mode: full-screen map with GPS instruments.
- Touch targets sized for gloves-off, turbulence-tolerant operation.

---

## 🔴 Blocking Issues Resolved

### GPS Chip — Sentry (or equivalent) Required, Not Device GPS

**Red-team finding:** Only cellular-model iPads have a built-in GPS chip. Wi-Fi-only
iPads — the majority of kneeboard setups — do not. "Device GPS, no internet" silently
fails for a significant fraction of users.

**Decision:** CoPilot does not rely on built-in iPad GPS.

**Standard setup:** Wi-Fi iPad + **Sentry** (or Bad Elf, Dual XGPS, etc.) external
GPS puck connected via Bluetooth. Sentry is the most common in the field. It provides
1Hz GPS updates, ADS-B weather and traffic (on Sentry Plus), and works with any Wi-Fi
iPad. This is the same setup the majority of ForeFlight users already run.

**In-app GPS state indicator (always visible in map pane):**
```
🟢 SENTRY · 8 sats · 12ft accuracy
🟡 SENTRY · searching…
🔴 NO GPS · map only — position not available
```

**Pairing flow (first launch):**
1. App checks for CoreBluetooth GPS peripheral (NMEA over BT/BLE)
2. If none found → onboarding screen: "CoPilot uses an external GPS for reliable
   position tracking. Tap to pair Sentry, Bad Elf, or any NMEA GPS device."
3. Paired device remembered; reconnects automatically in range

**Native app decision (see below) is required to support CoreBluetooth.**

---

### Native iOS App Required — Not PWA

**Red-team finding:** Phase 3 specified "Mapbox + browser geolocation" — a PWA/web
approach. Browser geolocation in Safari throttles in background, has no background-
location entitlement, and cannot sustain the GPS update rate required for a moving map.
This directly contradicts the "non-negotiable" offline/backup instrument promise.

**Decision:** CoPilot aviation is a **native iOS app** (Swift/SwiftUI or React Native
with native modules). Not a PWA. Not a web view wrapped in a shell.

**Why this matters for the build:**
- CoreLocation background modes: `NSLocationAlwaysAndWhenInUseUsageDescription` —
  allows continuous GPS updates with screen off
- CoreBluetooth: required for Sentry/external GPS pairing
- Background fetch: allows brief data refresh before departure
- MapKit or Mapbox iOS SDK: native tile caching, not browser cache
- The web canvas (what exists today in apps/business/) is the **ground/desk** experience.
  The iPad cockpit experience is a separate native app.

**Build path:** React Native is the pragmatic choice — shared JS business logic
(Alex chat, brief formatting, Vault sync) with native modules for CoreLocation,
CoreBluetooth, and offline tile storage. The current Firebase/Firestore backend
works identically from React Native.

**This changes Phase 3 scope materially.** Logged as Open Question #6 below.

---

### Regulatory / Liability Framing — Supplemental EFB, Not Instrument

**Red-team finding:** Language like "pilots trust their lives to it" and "independent
instrument panel if everything goes to shite" reads like backup instrument, not
supplemental display. No FAA regulatory framing in the doc.

**Decision:** CoPilot is classified and marketed as a **Class 1 Electronic Flight
Bag (EFB)** per FAA AC 120-76D — supplemental to, never a replacement for, required
aircraft instruments and pilot-in-command judgment.

**Required disclaimers:**
- App launch screen (dismissible after first read, persistent in settings):
  *"CoPilot is a supplemental Electronic Flight Bag (EFB) per FAA AC 120-76D.
  It is not a certified aviation instrument. Go/no-go authority rests with the PIC.
  Do not use as a primary navigation or instrument reference."*
- Backup instrument mode persistent footer:
  *"SUPPLEMENTAL DISPLAY ONLY — NOT A CERTIFIED INSTRUMENT"*
- W&B quick-check persistent banner (see Polish section)
- Terrain overlay persistent label: *"Situational awareness only — not TAWS"*

**Legal read needed before Phase 3 ships.** Specifically: does Sean's use of his own
app in his own aircraft during Part 91 personal flight require any OpSpec amendment?
Part 135 use requires coordination with the operator's ops manual and POI.

---

## 🟡 Real Risk Resolved

### Clearance Capture — Two Modes, Both Attach to Flight Record

**Red-team finding:** Single CONFIRM READBACK button on voice-transcribed text creates
a point of failure. If Alex mis-transcribes an altitude or squawk code and a rushed
pilot taps confirm, the Vault record becomes "permanent, timestamped, official-looking
evidence of a clearance that's wrong."

**Decision:** Two capture modes. Both store raw + structured. Field-level confirm on
numbers.

**Mode 1 — Voice transcription:**
1. Tap mic → speak clearance as you receive it
2. Raw audio → raw text shown immediately (no Alex structuring yet)
3. Pilot reads raw text to verify accuracy FIRST
4. Tap STRUCTURE → Alex formats into CRAFT fields:
   ```
   Clearance limit:  PHNL
   Route:            POKAI1, FALES, direct
   Altitude:         5,000 · expect 10,000 at 10min
   Frequency:        124.8
   Transponder:      4721
   ```
5. Pilot confirms each number field individually (altitude, squawk, frequency
   each have their own ✓ tap — not one blanket button)
6. LOCK RECORD → Vault appends: `{ rawText, structuredCraft, confirmationTimestamp,
   pilotUid, flightId }`

**Mode 2 — Manual text entry:**
1. Tap keyboard → standard text field
2. Type clearance freeform (or paste)
3. Same CRAFT structuring flow as above
4. Same field-level confirmation
5. Same Vault append

**What's stored in Vault either way:**
```json
{
  "type": "aviation.clearance",
  "flightId": "...",
  "rawText": "...",        // raw voice transcript or typed text
  "structuredCraft": {     // Alex-formatted, pilot-confirmed
    "clearanceLimit": "PHNL",
    "route": "POKAI1 FALES direct",
    "altitude": "5000, expect 10000 at 10min",
    "frequency": "124.8",
    "squawk": "4721"
  },
  "confirmedFields": ["altitude", "squawk", "frequency"],
  "captureMode": "voice|manual",
  "capturedAt": "...",
  "pilotUid": "..."
}
```

ForeFlight's scratch pad disappears when cleared. This record is permanent.

---

### Brief Staleness Indicator — Always Visible in Backup Mode

**Red-team finding:** No mention of how old the cached brief is while airborne.
A TFR that popped up 90 minutes post-download is a real safety gap if there's no
visible timestamp.

**Decision:** Brief timestamp is a **persistent, prominent element** in all flight
views, not buried.

```
┌─────────────────────────────────┐
│ BRIEF DOWNLOADED 0815Z          │
│ Live updates unavailable        │
│ Check NOTAMs when online        │
└─────────────────────────────────┘
```

In backup instrument mode (full-screen map), this appears as a persistent
banner at the top of the screen. It cannot be dismissed during flight.
Color: WHITE normally, YELLOW if brief is > 2 hours old, RED if > 4 hours old.

---

### ForeFlight Integration Table — Corrected

**Red-team finding:** The table implied "Alex synthesizes ForeFlight's data" — but
actual data sources are AviationWeather.gov and Notamify, independent of ForeFlight.

**Corrected table:**

| CoPilot does | ForeFlight does | Data source |
|---|---|---|
| Compliance tracking | Nothing | FVO / manual entry |
| Pre-flight brief | Raw data display | AviationWeather.gov (METAR/TAF), Notamify (NOTAMs) |
| Logbook (Vault) | Logbook (proprietary) | Pilot entry / ForeFlight export import |
| Clearance record | Scratch pad (ephemeral) | Voice/manual entry → Vault |
| Post-flight debrief | Nothing | Pilot entry / GPS track import |
| Operating Feed alerts | No proactive alerts | Alex (RAAS-validated) |

**ForeFlight API** is a long-term aspiration, not a current integration.
Do not reference it in any pitch material until we have API access.

---

## 🟢 Polish Resolved

**W&B disclaimer:** Hard persistent banner on quick-check screen, not advisory text:
*"THIS IS NOT A CERTIFIED W&B CALCULATION. Verify against the aircraft AFM before
flight. Pilot in command is responsible."* Always visible; cannot be dismissed.

**Terrain overlay:** Persistent label on any terrain layer:
*"Terrain — situational awareness only. Not TAWS. Not certified for IFR terrain
avoidance."*

**Backup instrument mode / "no account needed":** Clarified — backup instrument mode
shows generic GPS position and cached map tiles only. No tenant data, no brief content,
no operating feed. A locked/lost/stolen iPad in backup mode shows nothing sensitive.
Tenant brief data requires auth.

---

## Paper Logbook Integration

**Sean's question:** *"What does the paper logbook placement look like? Do we snap
a photo of the hobbs? Is it reading the flight to know whether that was a day or
night flight. Can the pilot override and manually enter?"*

This is the post-flight debrief flow. Three data sources combine to build the logbook entry:

### Source 1 — Hobbs / Tach Photo
- Pilot taps SNAP HOBBS at start and end of flight
- App runs OCR on the photo to extract the Hobbs reading
- Delta = aircraft time for this entry (cross-check against flight time)
- Both photos stored in Vault as evidence (useful for 100-hr and annual tracking)
- If OCR fails or pilot skips → manual entry field for Hobbs/Tach

### Source 2 — Automatic Day/Night Calculation
- App knows: departure airport, arrival airport, departure time (UTC), arrival time (UTC)
- Uses NOAA civil twilight algorithm for each airport's lat/lon on the flight date
- Computes: how many minutes of the flight were during night (after civil twilight)
- Splits flight time into day hours and night hours automatically
- **Pilot can always override** — the calculated split is a suggestion, not locked

### Source 3 — Manual Override (always available)
Every field in the logbook entry is manually editable. The auto-calculated fields
(day/night split, flight time from Hobbs delta) appear pre-filled but are not locked.
A persistent EDIT button on every auto-filled field.

**The logbook entry screen:**
```
┌─────────────────────────────────────────────┐
│ LOG THIS FLIGHT                             │
│                                             │
│ Date         2026-08-02    [edit]           │
│ Aircraft     N661LF        [edit]           │
│ Route        PHOG → PHNL  [edit]           │
│ Total time   0.7 hrs       [edit]           │
│                                             │
│ Day time     0.3 hrs  ← calculated [edit]  │
│ Night time   0.4 hrs  ← calculated [edit]  │
│                                             │
│ Flight type  Part 135      [edit]           │
│ PIC/SIC      PIC           [edit]           │
│ Instrument   0.0 hrs       [edit]           │
│ Approaches   0             [edit]           │
│                                             │
│ Hobbs start  [SNAP PHOTO or type]          │
│ Hobbs end    [SNAP PHOTO or type]          │
│                                             │
│ Business purpose                           │
│ [Patient transport — PHOG to PHNL]        │
│                                             │
│ Remarks                                    │
│ [optional]                                 │
│                                             │
│  [DISCARD]          [APPEND TO VAULT]      │
└─────────────────────────────────────────────┘
```

**APPEND TO VAULT** is append-only. Once tapped, the entry is immutable.
If the pilot made an error, they add a correction entry — they do not modify
the original. This is the logbook equivalent of the FAA's own amendment standard
(draw a line through, initial, and add correction — not erase).

**IRS business purpose** is a required field for Part 135 crews — the app does not
allow logging without it, consistent with IRS business-purpose documentation requirements.

**Paper logbook photo import (optional):**
- Pilot can snap a photo of an existing paper logbook page
- OCR extracts entries into a review screen
- Pilot approves each extracted row before it goes to Vault
- This is for onboarding (migrating existing paper logbook), not routine use

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
│   (requires Sentry — shows      │  ─────────────────     │
│    "NO GPS" if not paired)      │  · FW Gen Sub due 60d  │
│                                 │  · PC12 Flight due 60d │
│                                 │  · CBT Q3 no date      │
│                                 │  [+ 6 more]            │
│                                 │                        │
│                                 │  ┌─────────────────┐   │
│                                 │  │  START A FLIGHT  │   │
│                                 │  └─────────────────┘   │
│                                 │                        │
│  [Sentry: 🟢 8 sats]           │  Alex chat input       │
└─────────────────────────────────┴────────────────────────┘
```

### View 2: Active Flight / Pre-flight Brief
_Triggered by START A FLIGHT or when a dispatch release exists_

**Layout: Same 60/40 split**

```
┌─────────────────────────────────┬────────────────────────┐
│                                 │  PHOG → PHNL · 0:45   │
│    ROUTE ON MAP                 │  VFR · N661LF          │
│    PHOG ─────────── PHNL        │  BRIEF: 0815Z 🟢       │
│                                 │  ─────────────────     │
│    [weather along route]        │  WEATHER BRIEF         │
│    [TFR rings if any]           │  PHOG: VFR 3000 OVC    │
│    [NOTAM markers tappable]     │  PHNL: VFR CAVU        │
│                                 │  En route: no SIGMET   │
│                                 │                        │
│                                 │  NOTAMs (2)            │
│                                 │  · ILS Rwy 26L U/S     │
│                                 │  · [tap to expand]     │
│                                 │                        │
│                                 │  CURRENCY ✓            │
│                                 │  All current for       │
│    [tap NOTAM dot = expand]     │  this flight type      │
│                                 │                        │
│  [Sentry: 🟢]  [weather]       │  W&B — see AFM banner  │
└─────────────────────────────────┴────────────────────────┘
```

### View 3: In-Flight Monitoring

```
┌─────────────────────────────────┬────────────────────────┐
│  BRIEF: 0815Z 🟢 (+0:22)       │  IN FLIGHT             │
│                                 │  PHOG → PHNL           │
│    MOVING MAP                   │  ETE: 0:28 remaining   │
│    [aircraft position tracks]   │  ─────────────────     │
│                                 │  Alex monitoring:      │
│    GPS STRIP:                   │  No new alerts.        │
│    TRK 082° GS 198kts           │  Weather holding VFR.  │
│    ALT 8500 ETE 0:28            │                        │
│                                 │  CLEARANCE             │
│                                 │  [🎙 Voice] [⌨ Type]  │
│                                 │  ─────────────────     │
│                                 │                        │
│  SUPPLEMENTAL DISPLAY ONLY      │  Alex chat input       │
│  NOT A CERTIFIED INSTRUMENT     │                        │
└─────────────────────────────────┴────────────────────────┘
```

Persistent footer (cannot be dismissed): "SUPPLEMENTAL DISPLAY ONLY — NOT A CERTIFIED INSTRUMENT"

### Backup Instrument Mode
Full-screen map + GPS strip. Auth not required. No tenant data visible.
Brief timestamp banner always shown. Sentry GPS state always shown.

```
┌──────────────────────────────────────────────────────────┐
│ BRIEF: 0815Z 🟡 (+2:14) — may not reflect recent NOTAMs │
│ SENTRY 🟢 8 sats · 12ft                                  │
│                                                          │
│               [full screen moving map]                   │
│               [aircraft position dot]                    │
│               [cached terrain overlay]                   │
│               Terrain — situational awareness only       │
│                         Not TAWS                         │
│                                                          │
│  TRK 082°   GS 198kts   ALT 8500ft   ETE 0:22          │
│                                          [◀ CLOSE MAP]  │
│  SUPPLEMENTAL DISPLAY ONLY — NOT A CERTIFIED INSTRUMENT  │
└──────────────────────────────────────────────────────────┘
```

---

## Post-Flight Debrief Flow

After landing, the right pane automatically surfaces the log entry screen.

1. **Time entries pre-filled** from GPS track (departure time, arrival time, total elapsed)
2. **Day/night split calculated** from civil twilight at departure/arrival airports
3. **Snap Hobbs photos** (optional but encouraged)
4. **Clearance record** attached if captured during flight
5. **Business purpose** required (IRS)
6. **Pilot reviews, edits any field, taps APPEND TO VAULT**

If the pilot exits the app without logging, a reminder fires next time the app opens:
"You have an unlogged flight from yesterday. Log it now?"

---

## What We Do NOT Build

- ❌ Navigation database (Jeppesen / AIRAC cycles)
- ❌ Approach plates and instrument procedures
- ❌ ATC voice communication
- ❌ Filing flight plans directly to FAA/ICAO
- ❌ Synthetic vision / attitude reference
- ❌ Certified terrain avoidance (TAWS)

**ForeFlight export import (not replace):** If the pilot exports a ForeFlight
logbook (CSV) or track log (GPX), Alex can ingest it. Import is the integration
strategy — not API competition.

---

## Build Sequence

### Phase 1 — Compliance Dashboard ✅ DONE
Real FVO data in CoPilot canvas. alertFeed tools wired. Alex pushes compliance alerts.

### Phase 2 — Route Brief View (4-6 weeks)
Route entry in Alex chat → weather_brief + get_notams → structured brief in right pane
alongside static map. Brief staleness indicator. No live GPS yet.

### Phase 3 — Native iOS App (8-16 weeks)
React Native. CoreLocation background modes. CoreBluetooth for Sentry pairing.
Mapbox iOS SDK with offline tile caching. GPS strip. 60/40 layout.

### Phase 4 — Backup Instrument Mode + Clearance Capture + Logbook (parallel with Phase 3)
Full-screen map. Sentry GPS strip. Brief timestamp banner. Voice + manual clearance
capture with CRAFT structuring and field-level confirmation. Hobbs photo OCR.
Day/night calculation. Post-flight log entry screen.

### Phase 5 — Talking to the Map (6+ months)
Alex aware of what's on the map. Proactive in-flight alerts. Voice to map.

---

## Open Questions

1. **Portrait vs landscape** — does the app need both orientations, or is the 60/40
   split landscape-only for iPad? Kneeboard mounts are landscape; yoke mounts sometimes portrait.

2. **Offline brief trigger** — when does the app cache tiles and brief data? On flight
   start? Manual "DOWNLOAD BRIEF" button? Or on departure airport entry?

3. **ForeFlight logbook export import** — is this a real use case for Sean? If so,
   ForeFlight CSV/GPX import should be in Phase 4 scope.

4. **W&B scope** — quick check (Alex computes from profile, hard disclaimer) vs. full
   AFM-calibrated W&B tool. Quick check is Phase 3. Full tool is a separate CODEX.

5. **Eric Altshuler / HEMS requirements** — have this conversation before Phase 2
   locks. Patient/stretcher weight and altitude considerations change the brief view
   and W&B scope. Also: does HEMS operation require specific EFB OpSpec language?

6. **React Native vs Swift** — React Native is faster and reuses Firebase/Firestore
   SDK. Swift is more performant and has better CoreBluetooth/CoreLocation integration.
   Decision needed before Phase 3 starts.
