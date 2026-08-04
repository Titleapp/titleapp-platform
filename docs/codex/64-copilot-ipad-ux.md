# CODEX 64 — CoPilot iPad UX
# Aviation Intelligence Layer — iPad-First Design

**Status:** Spec v7 — round 2 red-team patches applied 2026-08-03  
**Author:** Sean + Claude · HNL Airport  
**Vertical:** Aviation  
**Workers:** CoPilot (av-copilot-001), Dispatch (av-dispatch-001), MX (av-mx-001)

**Standing citation rule:** Every FAR/AC citation in this document must include a direct source link (eCFR.gov or FAA AC library). A citation without a link is unverified and must be treated as a placeholder.

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

## The MANIFEST — Central Organizing Record of Every Flight

The Manifest is the most important object in the CoPilot data model. It was missing
from v1 and v2. Adding it changes W&B, safety, billing, and post-flight debrief.

**What the Manifest is:** The authoritative list of every person on the aircraft for
a given flight leg — pilot(s), crew, patients, passengers — with their weights and roles.

**Why it's central to Part 135 air transport:**

1. **W&B (Safety):** The CG envelope calculation requires the weight and seat position
   of every person on the aircraft. You cannot complete W&B without the manifest.
   For HEMS: patient weight is often estimated pre-flight and confirmed post-pickup.
   The manifest holds both the estimate and the confirmed weight as separate events.

2. **Performance (Safety):** Takeoff distance, climb rate, max altitude — all
   performance calculations are manifest-dependent. An overweight or out-of-CG
   aircraft is a safety event, not a paperwork event.

3. **Safety (Regulatory):** FAR 135.63(c) requires each certificate holder to prepare
   a load manifest in duplicate before each takeoff (multiengine aircraft). FAR 135.63(d)
   requires the PIC to carry it on the flight. The manifest IS the regulatory record.

4. **Payments and Billing:** In air medical and charter, the manifest is the
   source of truth for the invoice — who flew, what services were rendered, what
   the billable weight was. The manifest closes the loop from flight to invoice.

**Manifest data model (append-only, per leg):**
```json
{
  "type": "aviation.manifest",
  "flightId": "...",
  "legId": "...",          // one manifest per leg (outbound ≠ return)
  "aircraft": "N661LF",
  "manifestedAt": "...",   // time PIC accepted the manifest
  "manifestedBy": "pilotUid",
  "persons": [
    {
      "role": "PIC",
      "name": "Combs, Sean",
      "weightLbs": 185,
      "seatStation": "left-front"
    },
    {
      "role": "flight-nurse",
      "name": "...",
      "weightLbs": 155,
      "seatStation": "cabin-left"
    },
    {
      "role": "patient",
      "name": "...",         // may be "Unknown" pre-pickup
      "weightLbs": 170,      // estimated pre-pickup; confirmed weight added as event
      "weightType": "estimated|confirmed|scale",
      "seatStation": "stretcher",
      "diagnosis": "...",    // optional for medical billing
      "insuranceId": "..."   // optional, drives billing
    }
  ],
  "totalWeightLbs": 510,
  "cgStation": 142.3,        // calculated from seat stations and weights
  "cgLimits": { "fwd": 138.5, "aft": 145.2 },
  "cgStatus": "ok",              // "ok" | "out-of-limits" | "not-available"
  "takeoffWeightLbs": 4850,
  "maxTakeoffWeightLbs": 5250,
  "weightOk": true,
  "pilotSignedOff": true,    // PIC explicitly accepts manifest
  "corrections": []          // any post-departure corrections (append-only)
}
```

---

## Aircraft W&B Profile — Required for Any CG Calculation

**Sean's ruling:** W&B must be tied to the actual aircraft's Gross Empty Weight and
the specifics of that individual aircraft. Otherwise it must be disclaimed — not shown.

Every aircraft has an **approved Weight and Balance document** — specific to that
tail number, not the model. Two PC-12/47Es sitting side by side have different
empty weights because of installed avionics, equipment modifications, paint, and
the last time maintenance re-weighed the aircraft. The approved W&B document is
the legal reference.

**What the aircraft W&B profile contains (entered once, maintained by ops):**

```json
{
  "tailNumber": "N661LF",
  "model": "PC-12/47E",
  "serialNumber": "...",
  "wbDocumentRef": "...",        // filename of approved W&B PDF in Vault
  "wbDocumentDate": "2025-03-15", // date of last approved weighing
  "basicEmptyWeightLbs": 3218,   // actual weighed empty weight
  "basicEmptyCgArm": 141.2,      // CG arm at empty weight (inches aft of datum)
  "basicEmptyMoment": 454183,    // BEW × arm
  "maxGrossWeightLbs": 5512,     // MTOW for this aircraft/config
  "maxLandingWeightLbs": 5512,
  "cgEnvelope": [                // forward and aft limits at various weights
    { "weightLbs": 3500, "fwdArmIn": 138.5, "aftArmIn": 145.8 },
    { "weightLbs": 4000, "fwdArmIn": 139.1, "aftArmIn": 145.8 },
    { "weightLbs": 4500, "fwdArmIn": 139.8, "aftArmIn": 145.8 },
    { "weightLbs": 5000, "fwdArmIn": 140.5, "aftArmIn": 145.8 },
    { "weightLbs": 5512, "fwdArmIn": 141.3, "aftArmIn": 145.8 }
  ],
  "stations": [                  // seat and compartment arm positions
    { "id": "left-front",    "label": "Pilot",         "armIn": 133.5 },
    { "id": "right-front",   "label": "Co-pilot",      "armIn": 133.5 },
    { "id": "cabin-left-1",  "label": "Cabin seat 1",  "armIn": 155.0 },
    { "id": "cabin-right-1", "label": "Cabin seat 2",  "armIn": 155.0 },
    { "id": "stretcher",     "label": "Stretcher",     "armIn": 158.0 },
    { "id": "aft-baggage",   "label": "Aft baggage",   "armIn": 183.0 }
  ]
}
```

This profile is entered once per tail number by ops (or MX after a re-weigh) and
stored in the aircraft record in Vault. It is NOT something the pilot enters on the ramp.

**Profile entry requires two-person sign-off.** The same "no single point of failure"
logic applied to clearance capture applies here — a typed BEW or arm value produces
a confident green checkmark that is just as dangerous as Mode B's missing data,
except it looks trustworthy. Profile entry/edit flow:

```
1. Ops enters profile data (BEW, arm, envelope, stations)
2. Profile enters PENDING state — Mode B still shown for this tail
3. Second authorized person (director of maintenance or designated ops lead)
   reviews and confirms each critical field:
     ✓ BEW matches approved W&B document
     ✓ CG arm matches approved W&B document
     ✓ Envelope limits match approved W&B document
4. Confirmer taps APPROVE PROFILE — profile.approved event written with both UIDs
5. Mode A activates for this tail number
```

Profile edits (e.g., after a re-weigh) follow the same two-person flow.
The old profile remains in the event record — it is not overwritten.

**Two modes — determined by whether an approved profile exists:**

### Mode A: Approved profile exists → Real CG calculation with margin indicator

CG status is **not binary**. A green checkmark at 145.1" against a 145.2" aft limit
is not the same as one at 142". Three states:

```
GREEN:  CG is within limits AND more than 5% of envelope width from either limit
        (comfortably mid-envelope)
YELLOW: CG is within limits BUT within 5% of either boundary
        ("NEAR AFT LIMIT — 0.1" margin")
RED:    CG is outside limits

5% threshold is a starting value — Sean to adjust based on operational experience.
```

```
MANIFEST W&B — N661LF
─────────────────────────────────────
Basic empty weight:  3,218 lbs @ 141.2"
Pilot (left-front):    185 lbs @ 133.5"
Flight nurse:          155 lbs @ 155.0"
Patient (stretcher):   175 lbs @ 158.0"  ← estimated; tap to confirm
Stretcher/equip:        85 lbs @ 158.0"
─────────────────────────────────────
RAMP WEIGHT:   3,818 lbs  ✓  (limit 5,512)
RAMP CG:       144.9"    ⚠  NEAR AFT LIMIT
                              limit 145.2" · margin 0.3"

[envelope diagram — dot plotted against limits, color-coded by zone]

─────────────────────────────────────
⚠ Verify against approved W&B document
  before flight. PIC is responsible.
```

### Mode B: No profile → total weight only, hard disclaimer, CG blocked

```
MANIFEST — N661LF
─────────────────────────────────────
Total manifest weight:  600 lbs
─────────────────────────────────────
⛔ CG CALCULATION NOT AVAILABLE
Aircraft W&B profile has not been entered
for N661LF. Contact ops to enter the
approved W&B document before CG can
be calculated in this app.

Verify W&B against the approved aircraft
W&B document before flight.
PIC is responsible.
```

Mode B never shows a CG number. Partial data — a made-up empty weight, a guessed
arm — is worse than no data because it creates false confidence.

**Profile maintenance:**
- Ops enters/updates the profile when maintenance re-weighs the aircraft
- The approved W&B PDF is attached to the profile as a Vault document
- Profile carries a `wbDocumentDate` — the app shows a WARNING banner if the
  profile is > 2 years old (FAA recommends re-weighing when records are lost or
  after major modifications)
- MX worker triggers a "re-weigh reminder" alert when modifications affect empty weight

---

## Dispatch → Manifest → CoPilot: The Full Event Chain

**Sean's key insight:** Dispatch is the upstream system. It assigns the aircraft and
crew mix. The manifest is Dispatch's output and CoPilot's input. The PIC does not
create the manifest — the PIC accepts it.

**Self-dispatch exception (small Part 135 operators):** Many Part 135 operators —
particularly single-pilot or small air taxi operations — do not have a staffed
Dispatch function. The PIC is also the dispatcher. This is a real and common pattern
that the current Dispatch→Manifest→CoPilot chain doesn't address.

Self-dispatch mode:
- Triggered when the tenant has no Dispatch worker licensed, OR when the PIC
  explicitly taps "I am self-dispatching this flight"
- PIC builds the manifest themselves in CoPilot (not a separate Dispatch worker)
- The manifest is tagged `selfDispatched: true` — permanent metadata on the record
- RAAS audit flag: self-dispatched flights are flagged for ops review in the
  operator's safety program (not a block — a flag)
- The billing loop is simplified: no separate Dispatch invoice review step;
  PIC's manifest IS the billing source

This is not a degraded mode — it's a first-class flow for the operators most
likely to be early SOCIII customers. The architecture handles both; the manifest
data model is identical either way.

```
DISPATCH (ops worker)
  │
  ├─ Assigns AC: N661LF
  ├─ Assigns crew: Combs (PIC) + Jones (Flight Nurse)
  ├─ Sets manifest type: air-medical
  ├─ Enters initial weights from crew profiles
  ├─ Patient weight: estimated (180 lbs) until pickup
  │
  └─▶ manifest.created event → pushed to CoPilot on PIC's device
          │
          ▼
     COPILOT (pilot worker)
          │
          ├─ PIC reviews manifest: CG calculated from aircraft profile
          ├─ Patient arrives → weight confirmed (172 lbs)
          ├─ manifest.correction event appended, CG recalculates
          ├─ CG ✓ → PIC taps ACCEPT MANIFEST
          │         manifest.accepted event written
          │
          └─▶ flight.released event → Dispatch sees release confirmation
                    │
                    ▼
               FLIGHT EVENTS (append-only)
                    │
                    ├─ flight.departed
                    ├─ clearance.captured (voice/manual)
                    ├─ flight.arrived
                    ├─ logbook.appended (PIC entry)
                    │   + logbook.appended (SIC/crew entry if applicable)
                    │
                    └─▶ invoice.draft created in Dispatch
                              from manifest: who flew, what services,
                              patient insurance ID, Hobbs delta
```

**The rule:** Nothing in this chain is overwritten. Every correction is a new event.
The manifest that existed at the moment of `manifest.accepted` is permanent — that
is what the PIC signed off on. The confirmed patient weight is a correction event
appended after. Both are in the record.

**Dispatch creates. CoPilot consumes and appends. MX reads squawks and ADs.**
Three workers, one append-only aircraft/flight record underneath.

---

## Manifest Types

The Manifest data model must support all Part 91/135 use cases. The `manifestType`
field drives which fields are required and how the invoice is generated.

| Type | Use case | Weight rows | Billing driver | Logbook |
|---|---|---|---|---|
| `air-transport` | Charter, point-to-point | Named passengers + weights | Per-seat or block hour | 1 entry (PIC) |
| `air-medical` | HEMS, medevac | Crew + patient + equipment | Insurance / patient billing | 1–2 entries (PIC + crew) |
| `cargo` | Freight, no pax | Freight bill + weight distribution | Per-lb or block hour | 1 entry (PIC) |
| `mixed` | Cargo + crew | Crew + freight | Block hour | 1 entry (PIC) |
| `training` | Part 61/141 dual instruction | Instructor + student | Hobbs time (aircraft + CFI) | 2 entries (dual given + dual received) |
| `part-121` | Scheduled service | Pax list + average/actual weights | Ticket price | — |

Part 121 and the full flight school billing model are out of scope for Phase 3.
All others are in scope. Training type is the simplest manifest but produces the
most complex logbook output (two separate entries, split currency attribution).

**Training manifest additions:**
```json
{
  "manifestType": "training",
  "instructor": {
    "role": "CFI",               // or "CFII", "ATP-CTP-instructor", "DE" (checkride)
    "name": "...",
    "certificateNumber": "...",
    "weightLbs": 185,
    "station": "left-front"      // or right-front depending on aircraft
  },
  "student": {
    "role": "student-pilot",     // or "private", "instrument", "commercial", "ATP-candidate"
    "name": "...",
    "certificateNumber": "...",  // if certificated; blank for student pilot
    "weightLbs": 165,
    "station": "right-front"
  },
  "trainingObjective": "ILS approaches and holding — instrument currency",
  "hobbsStart": 4821.3,
  "hobbsEnd": 4823.1,           // filled post-flight
  "logbookSplit": {
    "instructorEntry": {
      "entryType": "dual-given",
      "instrumentTime": 1.8,
      "approachCount": 4
    },
    "studentEntry": {
      "entryType": "dual-received",
      "instrumentTime": 1.8,     // simulated instrument if VMC
      "approachCount": 4,
      "holds": 2,
      "confirmedByProxy": false  // true if instructor confirmed on student's behalf
    }
  }
}
```

**Dispatch assigns training flights the same way it assigns charter:** instructor
to aircraft, student added to manifest, training objective entered. CoPilot surfaces
the manifest to the instructor (PIC). After flight, both logbook entries are generated
from the single manifest — instructor reviews/confirms their entry, student confirms
theirs separately (or the instructor confirms both if student doesn't have app access).
When the instructor confirms on the student's behalf, the student's logbook event is
tagged `confirmedByProxy: true` — distinguishing proxy confirmation from a
self-confirmed entry in the audit trail.

**The training worker** (Flight Academy — separate CODEX) handles the broader curriculum:
lesson plan progression, endorsements, stage check scheduling, written test prep.
The manifest type is the CoPilot/Dispatch integration point — not the full training product.

**Cargo manifest additions:**
```json
{
  "manifestType": "cargo",
  "freightItems": [
    {
      "freightBillNumber": "...",
      "description": "Medical supplies",
      "weightLbs": 240,
      "station": "aft-baggage",
      "hazmat": false
    }
  ]
}
```

**Medical manifest additions:**
```json
{
  "manifestType": "air-medical",
  "patient": {
    "weightLbs": 175,
    "weightType": "estimated",   // → "scale" or "confirmed" after pickup
    "station": "stretcher",
    "diagnosis": "...",          // optional — medical crew enters post-flight
    "insuranceId": "...",        // drives billing
    "flightNurseNotes": "..."    // appended post-flight, not pre-flight
  },
  "equipment": [
    { "description": "Stretcher + frame", "weightLbs": 65, "station": "stretcher" },
    { "description": "IV pump + monitor", "weightLbs": 20, "station": "stretcher" }
  ]
}
```

Note: patient weight in medical manifests is often estimated pre-pickup.
The flow is: ops enters estimate → PIC accepts manifest with estimate →
patient loaded → actual weight confirmed → CORRECTION EVENT appended.
The CG recalculates from the confirmed weight. If the updated CG goes out of limits,
the app alerts the PIC immediately.

---

**The manifest flow (pre-flight):**

```
1. Dispatch enters initial manifest (crew weights from profiles, patient TBD)
2. PIC reviews manifest on CoPilot — CG and weight calculated live
3. Patient arrives → actual weight entered (scale or confirmed estimate)
4. CG recalculates — green/yellow/red indicator
5. PIC taps ACCEPT MANIFEST → locked as an event; flight can depart
6. If patient weight changes after pickup (e.g., additional equipment added)
   → CORRECTION EVENT appended, not overwrite
```

**The billing loop (post-flight):**

```
Manifest → flight completed → billing record generated
  · Who flew (names + roles)
  · Billable weight
  · Services rendered (from flight nurse notes)
  · Insurance IDs if captured
→ Invoice draft surfaced in Dispatch worker for ops team to review and send
```

**What CoPilot (pilot-facing) does vs Dispatch (ops-facing):**
- CoPilot: PIC accepts the manifest, sees CG/weight status, captures corrections
- Dispatch: ops team builds the manifest, generates the invoice, tracks billing

The manifest is the handoff point between the two workers. It is write-once from
Dispatch and read-plus-correction from CoPilot.

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

**Decision:** CoPilot is classified and marketed as a **portable Electronic Flight Bag (EFB)** per FAA AC 120-76E (current, superseded AC 120-76D in June 2024) — supplemental to, never a replacement for, required aircraft instruments and pilot-in-command judgment.

**Required disclaimers:**
- App launch screen (dismissible after first read, persistent in settings):
  *"CoPilot is a supplemental portable Electronic Flight Bag (EFB) per FAA AC 120-76E.
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

**W&B / Manifest disclaimer:** Hard persistent banner on the manifest CG screen:
*"CG calculation is based on entered weights and standard seat station arms. Verify
against the aircraft AFM W&B document before flight. Pilot in command is responsible
for confirming aircraft is within CG and weight limits."* Always visible; cannot be dismissed.

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
│              ← photo: ✓ verified           │
│              ← manual: ⚠ unverified        │
│ Hobbs end    [SNAP PHOTO or type]          │
│              ← photo: ✓ verified           │
│              ← manual: ⚠ unverified        │
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

**Hobbs integrity flag:** Manual Hobbs entries (no photo) are tagged
`hobbsVerified: false` in the logbook event. These appear in Dispatch with a
⚠ flag for ops review before the Hobbs delta is used for invoicing. OCR-confirmed
entries are `hobbsVerified: true`. Pilots see the same flag in their logbook view —
it doesn't block logging, but it flags the record as pending verification.
A billing system that treats unverified Hobbs identically to verified Hobbs
undermines the audit trail built everywhere else in this spec.

**Hobbs gate — aircraft record writes:**
The `hobbsVerified` flag applies beyond billing. CODEX 65 uses Hobbs to compute
`aircraft/{tail}/nextInspection.dueHobbs` — the countdown MX watches for 100-hr
inspections. An unverified Hobbs entry must not silently update that safety-relevant
countdown with the same weight as a photo-verified entry.

Gate: Hobbs writes to the aircraft record that update `nextInspection.dueHobbs`
require either `hobbsVerified: true` OR an explicit ops-manager acknowledgment
(same WARN pattern as the MX fatigue WARN gate). This gate applies when writing
to `aircraft/{tail}` in CODEX 65 — not only to the billing pipeline.

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
│  [Sentry: 🟢]  [weather]       │  MANIFEST · CG ✓ · [ACCEPT] │
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

4. **W&B scope** — manifest-driven W&B is the right model (see Manifest section above).
   The question is how precisely we model the aircraft's CG envelope. Quick check
   (rough CG from manifest weights + standard seat stations) is Phase 3. AFM-calibrated
   CG envelope (exact station arms from the PC-12 Weight and Balance document) is Phase 4
   and requires digitizing the AFM data for each tail number. Sean to decide: is rough
   CG sufficient for Phase 3, or is AFM accuracy required before PIC can use it?

5. **HEMS/medevac user research** — when you talk to Eric Altshuler, use it as
   a listening session: what does a medevac Part 135 brief look like vs standard
   air transport? Patient/stretcher weight in W&B, LZ considerations, altitude
   constraints. Informs Phase 2 scope — doesn't block it.

6. **React Native vs Swift** — React Native is faster and reuses Firebase/Firestore
   SDK. Swift is more performant and has better CoreBluetooth/CoreLocation integration.
   Decision needed before Phase 3 starts.
