# CODEX 60 — Aviation Suite Rebuild: 7-Worker Architecture (+2 Deferred) + Event-Driven Aircraft Record

**Status:** 🔵 Spec — Rev 3 (post red-team round 2, 2026-07-30)
**Supersedes:** CODEX 46 (Aviation Suite Expansion), CODEX 40 (Aviation Workspace)
**Owner:** Sean Combs (ATP, PC-12/47E)
**Design partners:** Eric Altshuler (Top Gun, Federal/military, Part 121)
**Red-team:** Internal — 12 issues (round 1) + 5 issues (round 2) resolved. Build-ready for Phase 1.

---

## 0. The Problem with the Prior Architecture

CODEX 46 defined 51 workers across 8 operational phases. This is wrong for two reasons:

1. **Fragmentation.** Each worker needs its own canvas, its own chat context, its own onboarding checklist. A mechanic opening the platform sees "Aircraft Status & MEL Tracker," "AD/SB Compliance Tracker," "Component & Life Tracker," and "Maintenance Work Order & Logbook" as four separate things. That's worse than a paper binder.

2. **No shared event spine.** When N661LF goes out of service, that fact lives nowhere — or worse, it gets entered four times in four different workers with no coordination. Dispatch doesn't know MX wrote up the FCU. The pilot's schedule doesn't reflect the aircraft is grounded. The ops director has no visibility.

**The fix:** Consolidate into 9 workers (7 in-scope for this CODEX + 2 deferred), with AIRCRAFT as the shared event source that every other worker subscribes to.

---

## 1. New Worker Taxonomy

### The 9 Workers (7 in-scope, 2 deferred)

```
Aviation Suite
  ├── AIRCRAFT        The aircraft record — event source for all other workers
  ├── MX              All maintenance (MEL, ADs, components, work orders, parts)
  ├── DISPATCH        Mission/flight release — TYPE performance + per-tail actual config
  ├── TRAINING        Training records across the full certificate ladder + recurrent
  ├── OPERATIONS      Crew scheduling, duty time, reserve crew, crew legality engine
  ├── SAFETY          SMS, FOQA, drug/alcohol, incident reporting, hazard register, ERP
  ├── [COMPLIANCE]    Part 135 cert, GOM/POI, FAR/regulatory monitoring — DEFERRED (future CODEX)
  ├── [BUSINESS]      Charter billing, medevac billing, customer portal — DEFERRED (future CODEX)
  └── CoPilot         Personal pilot record — logbook, currency, medical, schedule
       ├── PC-12 NG
       ├── King Air B200
       ├── King Air B350
       ├── King Air C90GTx
       └── Caravan 208B
```

COMPLIANCE and BUSINESS are named here to show where deferred functions land. They do not exist in any build phase of this CODEX and should not be referenced in demos or investor materials as shipped.

### What Each Worker Absorbs

| New Worker | Replaces (prior av-* slugs) | Scope note |
|---|---|---|
| AIRCRAFT | aircraft-status-mel-tracker, ad-sb-compliance-tracker (status view only) | Airworthiness record + event source |
| MX | maintenance-work-order-logbook, parts-inventory-manager, component-life-tracker, ad-sb-compliance-tracker (full compliance), aircraft-status-mel-tracker (mx detail) | Everything a wrench touches |
| DISPATCH | mission-builder-dispatch, flight-risk-assessment-frat, weight-balance-calculator, weather-intelligence, flight-following-tracking, notam-intelligence, efb-flight-planning-companion, airport-helipad-intelligence | Mission execution |
| TRAINING | qualification-currency-tracker, training-records-manager, medical-certificate-tracker, ai-training-courseware | Certificates + recurrent records |
| OPERATIONS | crew-scheduling-roster, reserve-crew-swap-manager, flight-duty-time-enforcer | Scheduling + legality engine |
| SAFETY | safety-reporting-sms, foqa-flight-data-analysis, emergency-response-erp, post-flight-debrief, hazard-risk-register, sms-performance-monitor, ai-safety-officer, drug-alcohol-program-manager | SMS + safety management |
| COMPLIANCE (deferred) | part-135-certificate-assistant, gom-poi-authoring, regulatory-compliance-monitor, far-compliance-monitor | Cert + regulatory — future CODEX |
| BUSINESS (deferred) | charter-quoting-engine, accounts-receivable-billing, medevac-billing-collections, customer-portal-manager | Commercial — future CODEX |
| CoPilot | av-digital-logbook, av-currency-tracker, av-my-aircraft, av-training-proficiency, av-flight-planning, av-alex-personal, av-pc12-ng, av-king-air-b200, av-king-air-b350, av-king-air-c90, av-caravan-208b | Personal pilot suite |

---

## 2. The TYPE Layer

### Two Levels of TYPE

**Fleet TYPE** is the knowledge substrate for an aircraft model. It is not a user-facing worker — it is configured in workspace settings like a COA account in accounting. One TYPE is defined once and shared across all tails of that model.

```
TYPE: PC-12 NG (Pilatus PC-12/47E)
  ├── Maintenance program: inspection intervals, component life limits, overhaul requirements
  ├── AD/SB applicability: all current ADs and service bulletins for this model
  ├── Reference performance data: V-speeds, W&B envelope, fuel flow tables, climb/cruise charts
  ├── Regulatory requirements: type rating requirements (if applicable), currency standards
  └── Training standards: type-specific checkride standards, recurrent requirements
```

**Tail AIRCRAFT (N661LF)** is a specific instance of a TYPE. It references the TYPE for general limits and specs, then adds:
- This aircraft's actual TTSN, TSMOH, configuration, avionics
- This aircraft's actual maintenance history (every work order, every AD compliance entry)
- This aircraft's current airworthiness status (open squawks, MEL items, any deferred maintenance)
- This aircraft's deviation from the type baseline (STC modifications, avionics upgrades)
- This aircraft's operator-uploaded AFM/POH data (authoritative — required for dispatch computations)

### Two-Tier Data Quality

TYPE data is **reference quality**: it unlocks general intelligence, Q&A, advisory context, and model-level comparisons. A mechanic can ask "what are the inspection intervals for the PT6A-67P?" and get a correct answer from TYPE data alone.

Tail-level **AFM/POH upload is authoritative**: it is required to unlock dispatch computations, W&B calculations, and TOLD card generation. The canvas enforces this: performance and W&B tabs render in a locked state until the operator completes the AFM/POH upload checklist. Reference data from TYPE is never substituted silently for operator-uploaded data in a computed output.

This distinction must be stated explicitly in any user-facing copy. "Your aircraft data" means their specific document, not the model baseline.

### TYPE Supports All Workers

| Worker | What it reads from TYPE |
|---|---|
| MX | Maintenance program intervals, component life limits, AD/SB applicability for this model |
| DISPATCH | Reference W&B envelope, reference performance tables (advisory only until AFM uploaded) |
| TRAINING | Type rating requirements, recurrent training standards, checkride ACS/PTS |
| OPERATIONS | Aircraft category/class regulatory requirements, MEL category classifications |
| CoPilot | Type-specific procedures, limitations, emergency memory items, personal minimums context |

### TYPE Build Schedule

TYPE data is built per model in this order, tied to build phases:
- Phase 1: PC-12 NG (primary demo aircraft)
- Phase 2: King Air B200, B350, C90GTx (Eric Altshuler's background; Part 135 target)
- Phase 4: Caravan 208B (medevac/EMS market; common Part 135 platform)

Caravan TYPE data is explicitly deferred to Phase 4. The CoPilot-208B shell in Phase 3 renders in reference-only mode until Phase 4.

---

## 3. AIRCRAFT as Event Source

### The Core Invariant

The AIRCRAFT worker is the single source of truth for an aircraft's operational status. **Any event that changes an aircraft's state — squawk written, MEL deferred, work order opened or closed, AD complied with, airworthiness restored — is written once to the AIRCRAFT record and propagated to all subscriber workers.**

Nobody re-enters data. Nobody discovers a squawk by accident. Nobody schedules a grounded aircraft.

### The Universal Airworthiness Gate

Airworthiness status is the prerequisite to flight regardless of regulatory frame. Whether the operation is a Part 135 charter, a Part 91 owner-operator, a Part 141 student solo, or a flight school dual instruction flight — an aircraft that is out of service cannot fly. DISPATCH enforces this via invariant #1 regardless of which regulatory tree is active.

### Event Propagation Model

```
AIRCRAFT STATE CHANGE EVENT
  e.g.: N661LF — fuel cap squawk written by Pilot Martinez, 2026-07-30 14:23Z
  Description: "Left wing fuel cap missing post-fueling. Observed on walk-around."
  Aircraft status: OOS (maintenance)
  [MX triage fields populated after mechanic reviews — not at write-up time]

  → MX receives:
      "Fuel cap squawk open on N661LF. Pilot write-up: [text]. Parts: fuel cap P/N [from TYPE].
       Likely 30-min fix. Open work order. Parts on hand? If not, AOG request to [vendor]."

  → DISPATCH receives:
      "N661LF unavailable — pending MX triage. Affected trips: [list from schedule].
       Repositioning options: [other available tails]. Recommend: notify affected
       customers within 2 hours."

  → OPERATIONS receives:
      "N661LF OOS, Pilot Martinez potentially available.
       Crew legality check: Martinez — duty time this week 14h, currency current.
       Suggest: use downtime for [training due items / admin tasks].
       Alert ops director."

  → SAFETY receives:
      "Squawk opened on N661LF by Pilot Martinez — fuel cap. If this is the second
       fuel-cap squawk on this tail in 12 months, flag for hazard register review.
       Pattern tracking: [check recurring-squawk history against this aircraft.]"

  → CoPilot / Pilot Martinez receives:
      "Your N661LF squawk is open. MX is reviewing. Your next scheduled trip may
       be affected — watch DISPATCH for updates."
```

### Squawk as Two-Phase Record

A squawk is the pivot point of this entire architecture. It is not a text note. It is a structured record with two distinct phases:

**Phase 1 — Pilot write-up (at time of observation):**
```json
{
  "squawk_id": "sq_N661LF_20260730_001",
  "aircraft_id": "N661LF",
  "type_id": "pc12-ng",
  "tenantId": "...",
  "written_by": { "pilot_id": "martinez_j", "cert": "ATP", "timestamp": "2026-07-30T14:23Z" },
  "description": "Left wing fuel cap missing post-fueling. Observed on walk-around.",
  "aircraft_status": "oos_maintenance",
  "mx_triage": null,
  "events": [],
  "_isSeed": false
}
```

**Phase 2 — MX triage (after mechanic reviews, not at write-up):**
```json
{
  "mx_triage": {
    "triaged_by": { "mechanic_id": "chen_k", "cert": "A&P", "timestamp": "2026-07-30T15:10Z" },
    "mel_applicable": false,
    "mel_reference": null,
    "estimated_return_hours": 1,
    "mx_test_flights_required": 0,
    "parts_required": ["PC12-FUELCAP-LH"],
    "parts_on_hand": true
  }
}
```

The pilot does not know the estimated return time or whether an MEL applies — that is MX's determination. The event propagation example above correctly uses only pilot-populated fields at write-up time. DISPATCH gets the MX-triage update as a second event when the mechanic files it, not instantly on write-up.

---

## 4. The MX Worker — Two Modes

### Mode 1: TYPE-Level Intelligence (General)

"The FCU is broken on my King Air C90 — how do I fix it?"

MX knows the King Air C90GTx maintenance manual structure. It knows the Collins Pro Line 4 avionics architecture. It knows the typical failure modes, the approved repair procedures, the regulatory citations (14 CFR 43, MMEL), and the paperwork required (FAA Form 337 if needed, maintenance release, logbook entry). This is general TYPE knowledge — no specific aircraft required.

### Mode 2: Tail-Specific Execution (N661LF)

"The FCU on N661LF was written up by Pilot Johnson on 2026-07-30. Fix it and do the paperwork."

Now MX has:
- The specific squawk (structured, from the AIRCRAFT record)
- N661LF's maintenance history (has the FCU failed before? When? What was done?)
- N661LF's current configuration (which FCU variant is installed? Any STC modifications?)
- The open work order (auto-created from the squawk event)
- The parts inventory (do we have the parts? If not, which supplier?)
- The regulatory requirement (sign-off requirements, whether an IA is required, 337 applicability)

MX produces the complete documentation package: work order, parts used, labor hours, maintenance release, and the logbook entry text — ready for the A&P or IA to review and sign.

---

## 5. The DISPATCH Worker — Context-Aware by Operation Type

DISPATCH behavior adapts to the operator's declared regulatory frame. Same worker, different rule trees:

| Regulatory Frame | DISPATCH mode |
|---|---|
| **Part 91 (personal/corporate)** | Flight planning, NOTAM brief, W&B, weather. No formal dispatch release required. Alex acts as self-briefing assistant. |
| **Part 135 (air carrier / charter)** | Formal dispatch release required before departure. FRAT mandatory. PIC and dispatcher co-sign. Alex enforces the release checklist. |
| **Part 141/142 (flight school)** | Student assignment to aircraft, instructor scheduling, solo endorsement verification before solo flights. Alex checks endorsements before aircraft assignment. |

The RAAS rules engine loads the right rule tree from `raas/aviation/{regulatory_part}/dispatch.rules.js` at dispatch time based on `workspace.regulatory_frame`.

### DISPATCH + AIRCRAFT + OPERATIONS Integration

When DISPATCH builds a dispatch release or flight plan:
1. Queries AIRCRAFT for current airworthiness status — if OOS, refuses dispatch
2. Pulls reference W&B envelope from TYPE; uses operator-uploaded AFM data if available
3. Queries OPERATIONS **crew legality engine** for both duty time limits AND currency status before releasing — a crew member blocked by either is surfaced inline on the Dispatch Board with the specific reason (duty time exceeded / currency expired / medical lapsed)
4. Pulls live NOTAMs, METAR/TAF, SIGMET via the existing aviation API services
5. After release: monitors via ADS-B through the flight-following service

The Dispatch Board canvas tab surfaces crew-legality status as a color indicator per crew member (green = legal, yellow = approaching limit, red = blocked) without requiring the dispatcher to navigate to TRAINING or OPERATIONS to find the reason.

---

## 6. The TRAINING Worker — Part of a Progression, Not a Destination

### The Core Model

Training completion ≠ operational authorization. This is a RAAS invariant enforced at the data layer:

```
training_event (signed off by CFI/DPE) → training_record (immutable DTC)
training_record → qualification_check (does this satisfy the regulatory requirement?)
qualification_check → currency_status (is it current? when does it expire?)
currency_status → feeds OPERATIONS crew legality engine
```

A pilot who passes a checkride gets a training record. That training record creates or updates a qualification. The qualification feeds the **crew legality engine** in OPERATIONS. DISPATCH cannot release a trip with a pilot whose qualifications don't satisfy the trip's regulatory requirements.

Currency status is computed on read from the `qualifications` collection. If query performance becomes an issue at scale, a materialized `currencyStatus` view should be evaluated — this is flagged as a future optimization decision, not a Day 1 requirement.

### Regulatory Frame

| Part | Training type |
|---|---|
| Part 61 | Individual pilot certificates — PPL, IR, Commercial, ATP, CFI, type ratings |
| Part 141 | Approved school course completion — syllabus-based, stage checks, chief CFI sign-off |
| Part 142 | Training center (Level D simulator-based ATP-CTP, recurrent) |
| Part 135.293/.297/.299 | Operator recurrent — proficiency check, line check, IOE |

One record schema, multiple regulatory frames. The RAAS rule tree validates that the record satisfies the specific regulatory requirement it's claimed to satisfy.

---

## 7. The OPERATIONS Worker — Crew Scheduling + Legality Engine

### Scope (this CODEX only)

OPERATIONS in this CODEX covers the runtime crew operations layer:
- Crew scheduling (who flies which tail on which trip)
- Duty time enforcement (FAR 135.265–135.273 for Part 135; operator-defined limits for Part 91)
- Reserve crew management (who covers when a primary crew member is unavailable)
- **Crew legality engine** — the authoritative aggregator of duty time (from OPERATIONS' own records) and currency/qualification status (from TRAINING). DISPATCH queries this engine. It is not a background service — it has a named canvas surface.

### What Is Not in OPERATIONS (explicitly deferred)

The following functions absorbed from prior workers are **not** in OPERATIONS in this CODEX and are not in any build phase below:
- Drug and alcohol program management → SAFETY (Section 8)
- SMS / safety reporting → SAFETY
- GOM / POI authoring → COMPLIANCE (deferred future CODEX)
- Regulatory compliance monitoring → COMPLIANCE (deferred)
- Charter billing, medevac billing, customer portal → BUSINESS (deferred)

### Crew Legality Engine

OPERATIONS owns the crew legality engine. It aggregates:
- Duty time entries (written by OPERATIONS on every scheduled flight/duty period)
- Currency and qualification status (read from TRAINING's `qualifications` collection)
- Medical certificate expiration (read from TRAINING)

Output: per-crew-member legality status consumed by DISPATCH at release time. Canvas surface: a Crew Legality tab showing each crew member's current status across all dimensions (duty time remaining, currency expiration dates, medical status) as a single view.

### Idle Crew = Cost Center

When an aircraft goes OOS, OPERATIONS surfaces the highest-value use of the grounded crew member's time:

```
OPERATIONS receives: N661LF OOS, Pilot Martinez potentially available for 48h

OPERATIONS evaluates (from existing data — no external booking):
  - Is Martinez due for recurrent training in the next 60 days? → Flag for scheduling.
  - Is Martinez's drug/alcohol testing (in SAFETY) coming due? → Coordinate with SAFETY.
  - Are there administrative tasks (GOM review, compliance items) queued? → Surface them.
  - Is there a trip where another crew member needs coverage? → Check legality and suggest.

Output: Suggested schedule options for ops director to approve. OPERATIONS does not
book external simulator slots — it surfaces the need and the contact; the ops director
makes the call.
```

---

## 8. The SAFETY Worker — SMS + Safety Management

SAFETY is a separate worker from OPERATIONS because safety management is a distinct function with distinct regulatory requirements, distinct reporting chains, and — critically — independence from operational pressure. An SMS that lives inside the same worker as crew scheduling is structurally conflicted.

### What SAFETY Manages
- Safety reports (incident, accident, hazard observations)
- FOQA / flight data analysis (exceedance review, trend identification)
- Emergency response plan (ERP) — plan management and drill records
- Post-flight debrief records
- Hazard register and risk matrix
- Drug and alcohol testing program (DOT/FAA compliance, collection scheduling, result tracking)
- Safety performance indicators (SPI) and SMS maturity tracking

### Canvas
Safety Board (open reports + status), Hazard Register (risk matrix), Drug & Alcohol (testing schedule + compliance), FOQA (exceedance trend chart), ERP (plan + drill history).

---

## 9. The CoPilot Worker — Personal Pilot Record + TYPE Intelligence

### What CoPilot Manages
- Digital logbook (replaces FVO, ForeFlight paper export, or Excel)
- Currency tracker — 3 takeoffs/landings, instrument currency, night currency, BFR/flight review
- Medical certificate status and expiration (read-view only — the record of authority lives in TRAINING; CoPilot renders a personal dashboard view of the same data, not a separate record)
- Personal schedule (trips assigned, training coming up)
- Personal minimums and go/no-go decision support
- Flight planning for personal/Part 91 operations

### TYPE Sub-Workers

Each TYPE sub-worker extends CoPilot with aircraft-specific intelligence:

```
CoPilot (PC-12 NG)
  ├── General model knowledge: PT6A-67P management, QRH flows, known failure modes,
  │    type rating standards, FSI/SimuFlite recurrent requirements
  ├── Reference performance: V-speeds, fuel flow tables (from TYPE — reference only)
  └── Tail-specific actuals: reads N661LF's uploaded AFM/POH for authoritative numbers
       — W&B, actual empty weight, actual CG, actual TTSN for planning
```

**The AFM/POH gate:** CoPilot TYPE sub-workers are useful out of the box for general model Q&A. W&B and performance computation tabs are locked until the operator uploads their certified AFM/POH. This is enforced by a canvas checklist, not a soft warning.

---

## 10. Firestore Data Model

### Collections

```
tenants/{tenantId}/
  aircraftTypes/{typeId}          — fleet TYPE definitions (PC-12, B200, etc.)
  aircraft/{aircraftId}           — specific tail records; tenantId field on each doc
  squawks/{squawkId}              — squawk write-ups (pilot phase + mx-triage phase)
  workOrders/{workOrderId}        — MX work orders (linked to squawk)
  dispatchReleases/{releaseId}    — dispatch releases (linked to aircraft + crew)
  trainingRecords/{recordId}      — training events (immutable once signed)
  qualifications/{qualId}         — currency/qualification status derived from training records
  dutyTimeEntries/{entryId}       — flight/duty time log (written by OPERATIONS)
  crewSchedule/{entryId}          — crew schedule entries
  safetyReports/{reportId}        — SMS reports (SAFETY worker)

dtcs/{dtcId}                     — immutable Vault DTC for completed/signed work orders;
                                   tenantId is a field on each document (not in path)
logbookEntries/{entryId}         — personal pilot logbook (tenantId = "vault")
```

### Aircraft Record Schema

```json
{
  "aircraft_id": "N661LF",
  "tenantId": "...",
  "type_id": "pc12-ng",
  "registration": "N661LF",
  "serial_number": "123",
  "manufacturer": "Pilatus",
  "model": "PC-12/47E",
  "year": 2018,
  "ttsn": 2847.3,
  "tsmoh_engine": 1240.1,
  "configuration": {
    "seats": 8,
    "avionics": "Honeywell Primus Apex",
    "stcs": [],
    "deviations_from_type": []
  },
  "airworthiness_status": "airworthy",
  "open_squawks": [],
  "open_mel_items": [],
  "next_inspection": { "type": "Annual", "due_date": "2027-02-15", "due_ttsn": 3000 },
  "afm_uploaded": true,
  "afm_storage_path": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 11. Sidebar Grouping

```
Aviation
  ├── AIRCRAFT        (slug: av-aircraft)
  ├── MX              (slug: av-mx)
  ├── DISPATCH        (slug: av-dispatch)
  ├── TRAINING        (slug: av-training)
  ├── OPERATIONS      (slug: av-operations)
  ├── SAFETY          (slug: av-safety)
  └── CoPilot
       ├── CoPilot        (slug: av-copilot)
       ├── PC-12          (slug: av-copilot-pc12)
       ├── King Air B200  (slug: av-copilot-b200)
       ├── King Air B350  (slug: av-copilot-b350)
       ├── King Air C90   (slug: av-copilot-c90)
       └── Caravan 208B   (slug: av-copilot-208b)
```

---

## 12. Canvas Design (Trump Rule)

Every worker must have a visually rich canvas before it ships. Per the Trump Rule: people don't read, they see pictures.

| Worker | Primary canvas tabs |
|---|---|
| AIRCRAFT | Fleet Map (all tails: green/yellow/red status), Tail Detail (N-number card, TTSN, open items), Squawks (open + history), ADs/SBs, Documents (AFM, 337s) |
| MX | Work Orders (open/in-progress/closed), Component Life (time-since-overhaul bars), AD Compliance matrix, Parts Inventory, Maintenance Schedule |
| DISPATCH | Dispatch Board (today's trips, tail assignments, crew legality indicator per crew), Weather Map (route overlay), W&B Calculator, NOTAM Brief, Flight Following (live ADS-B) |
| TRAINING | Crew Currency Board (all pilots × all currencies, color-coded), Certificate Ladder (progress per pilot), Upcoming Expirations (30/60/90-day calendar), Training Schedule |
| OPERATIONS | Crew Schedule (Gantt), Crew Legality (duty time remaining + currency status per crew, color-coded), Reserve Pool (available crew + legality), Schedule Conflicts |
| SAFETY | Safety Board (open reports + status), Hazard Register (risk matrix), Drug & Alcohol (testing schedule), FOQA (exceedance trend), ERP (plan + drill records) |
| CoPilot | My Logbook (recent flights, running totals), Currency Status (go/no-go at a glance), My Aircraft (tail status, next mx), Schedule (upcoming trips + training), Flight Planning |

---

## 13. Build Phases

### Phase 1 — AIRCRAFT + MX (Foundation)
- AIRCRAFT worker + canvas (Fleet Map + Tail Detail + Squawks)
- Squawk data model with two-phase schema (pilot write-up / MX triage)
- Event propagation hooks (squawk → MX, DISPATCH, OPERATIONS, SAFETY, CoPilot)
- MX worker + canvas (Work Orders + Component Life + AD Compliance)
- TYPE library setup — PC-12 NG first
- AFM/POH upload gate; W&B and performance tabs locked until uploaded
- **Pending Eric confirmation:** MX sign-off check for IA renewal (§65.91(c)) and recency-of-experience (§65.83) — placeholder in MX Work Orders canvas; implementation blocked on field clarification from Eric Altshuler before shipping

### Phase 2 — DISPATCH + OPERATIONS + King Air TYPE
- DISPATCH worker + canvas (Dispatch Board with inline crew-legality indicators + Weather + W&B + NOTAM + Flight Following)
- Regulatory frame selection (Part 91 / 135 / 141) wired to RAAS rule tree
- OPERATIONS worker + canvas (Crew Schedule + Crew Legality + Reserve Pool)
- Crew legality engine: aggregates duty time (OPERATIONS) + currency (TRAINING, seed/demo data only in Phase 2 — live TRAINING bridge ships Phase 3) + medical (TRAINING, same)
- King Air B200, B350, C90GTx TYPE data
- OOS event → DISPATCH (tail unavailable) + OPERATIONS (crew suggestion) propagation

### Phase 3 — TRAINING + SAFETY + CoPilot
- TRAINING worker + canvas (Currency Board + Certificate Ladder + Expirations + Schedule)
- Training record → qualification → crew legality engine live bridge
- SAFETY worker + canvas (Safety Board + Hazard Register + D&A + FOQA + ERP)
- CoPilot worker + canvas (Logbook + Currency + Aircraft + Schedule + Flight Planning)
- CoPilot TYPE shells: PC-12, B200, B350, C90 (Caravan reference-only pending Phase 4)
- Personal pilot schedule integration with OPERATIONS crew schedule

### Phase 4 — Event Spine + Caravan + Demo
- Full squawk event propagation across all workers (real-time Firestore listeners)
- Vault DTC anchoring of completed/signed work orders (immutable record)
- Caravan 208B TYPE data (unlocks CoPilot-208B from reference-only to full)
- AIRAC nav database integration (CODEX 56)
- Demo tenant seed: Eric Altshuler demo space, PC-12 fleet, seeded squawks + work orders + crew records

---

## 14. Regulatory Invariants (RAAS Rules)

These rules are enforced by the RAAS constraint engine, not by prompts. They cannot be overridden by the AI model.

1. **Dispatch shall not release an aircraft with an open OOS squawk** unless an applicable MEL item explicitly authorizes continued operation with the specific discrepancy noted and restrictions documented.
2. **Dispatch shall not release a crew member whose currency has expired** for the category, class, or type required by the operation.
3. **Dispatch shall not release a crew member who has exceeded duty time limits** for their declared regulatory frame (135.265–135.273 for Part 135; operator-defined limits for Part 91).
4. **MX shall flag work-order sign-offs where the signing mechanic's Inspector Authorization (IA) renewal is overdue** (§65.91(c), 24-calendar-month renewal requirement), or where the mechanic's recency-of-experience under §65.83 may be lapsed. ⚠️ **Implementation note:** A&P certificates issued under 14 CFR Part 65 do not expire. The check is specifically on IA renewal and recency-of-experience, not certificate expiration. Exact field implementation to be confirmed with Eric Altshuler (A&P/ATP) before Phase 1 ships.
5. **Training records shall not claim regulatory compliance** without the required signatures (CFI endorsement, DPE sign-off, or authorized check airman, per the applicable FAR).
6. **W&B calculations shall use operator-uploaded AFM data**, not TYPE reference data, when producing a dispatch output or TOLD card.
7. **A squawk written by a pilot is presumed airworthiness-affecting** until a certificated mechanic reviews and either clears the aircraft or opens a work order.
8. **Completed, signed maintenance entries and dispatch releases are immutable once committed.** No record may be deleted or overwritten after sign-off. Corrections are append-only (superseding records reference the original). This is the chain-of-custody guarantee that makes the platform legally defensible.

---

## 15. Competitive Position

**ForeFlight** owns the VFR/IFR navigation chart space. We do not compete on charts.
**RAMCO** owns Part 145 repair station MX at the enterprise level. We target the operator, not the MX shop.
**Protean** owns Part 135 ops specs consulting. We target the runtime, not the document production.
**FVO** owns the paper logbook import workflow. We absorb it.

SOCIII's moat is the event spine — the fact that a squawk written by a pilot instantly propagates to five subscribers: MX (work order), DISPATCH (tail availability), OPERATIONS (crew reassignment), SAFETY (recurring-squawk pattern), and CoPilot (pilot's own schedule). No other platform in general aviation has this. The competitors are all point solutions with no cross-worker data model.

The second moat is the append-only record. A signed maintenance entry, a completed checkride record, a dispatch release — these are immutable once committed. That is legally defensible chain of custody. The industry's paper-based record-keeping creates real exposure: records get lost, altered, or destroyed, leaving operators without documentation at exactly the moment they need it (accident investigation, FAA audit, insurance claim). An immutable, cryptographically anchored record eliminates that exposure.

---

## 16. Demo Gate — Must Pass Before Recording

Run these 6 checks in order before recording any aviation demo video. Each one tests an agentic action, not just a canvas render. Takes ~5 minutes. If any fails, do not record.

| # | Prompt to Alex | Pass condition |
|---|----------------|----------------|
| AV-01 | "What's the weather at KTLH and KMCO?" | Returns real current METARs with flight category (VFR/IFR/MVFR), wind, and vis — not fixture text |
| AV-02 | "Any NOTAMs at KTLH right now?" | Returns real NOTAM data or explicit "no active NOTAMs" — not fixture cards |
| AV-03 | "Log a flight — N662LF, KTLH to KMCO, 2.1 hours PIC, Part 135, business transport" | Alex confirms details, writes to Vault, returns entry ID beginning with a Firestore doc ID |
| AV-04 | Open CoPilot worker → My Logbook tab | Green dot appears, logged flight from AV-03 shows in the table within 10 seconds |
| AV-05 | "File a squawk on N661LF — fuel cap missing after fueling, left wing" | Alex confirms, returns work order number (WO-YYYY-###), squawk appears in AIRCRAFT → Squawks tab |
| AV-06 | Open DISPATCH worker → Weather tab | Green dot + live METAR table renders for KTLH/KMCO route (not "Showing sample data") |

**What each test covers:**
- AV-01/02: COS aviation tools + live API integration (weather.js, notams.js)
- AV-03: `log_flight` COS tool → Vault write
- AV-04: `/v1/logbook:list` → canvas live data fetch
- AV-05: `file_squawk` COS tool → Firestore write → canvas read
- AV-06: `/v1/aviation:weather` → canvas live data fetch

**If a test fails:** check the browser console for the specific API error before assuming it is a code bug — Notamify and ADS-B Exchange have API key expiry that looks like a broken feature.
