# CODEX 60 — Aviation Suite Rebuild: 7-Worker Architecture + Event-Driven Aircraft Record

**Status:** 🔵 Spec — Approved for build
**Supersedes:** CODEX 46 (Aviation Suite Expansion), CODEX 40 (Aviation Workspace)
**Owner:** Sean Combs (ATP, PC-12/47E)
**Design partners:** Eric Altshuler (Top Gun, Federal/military, Part 121)
**Date:** 2026-07-30

---

## 0. The Problem with the Prior Architecture

CODEX 46 defined 51 workers across 8 operational phases. This is wrong for two reasons:

1. **Fragmentation.** Each worker needs its own canvas, its own chat context, its own onboarding checklist. A mechanic opening the platform sees "Aircraft Status & MEL Tracker," "AD/SB Compliance Tracker," "Component & Life Tracker," and "Maintenance Work Order & Logbook" as four separate things. That's worse than a paper binder.

2. **No shared event spine.** When N661LF goes out of service, that fact lives nowhere — or worse, it gets entered four times in four different workers with no coordination. Dispatch doesn't know MX wrote up the FCU. The pilot's schedule doesn't reflect the aircraft is grounded. The ops director has no visibility.

**The fix:** Consolidate into 7 workers, with AIRCRAFT as a shared event source that every other worker subscribes to.

---

## 1. New Worker Taxonomy

### The 7 Core Workers

```
Aviation Suite
  ├── AIRCRAFT        The aircraft record — event source for all other workers
  ├── MX              All maintenance (MEL, ADs, components, work orders, parts)
  ├── DISPATCH        Mission/flight release — TYPE performance + per-tail actual config
  ├── TRAINING        Training records across the full certificate ladder + recurrent
  ├── OPERATIONS      Fleet scheduling, duty time, SMS, compliance, billing
  └── CoPilot         Personal pilot record — logbook, currency, medical, schedule
       ├── PC-12 NG
       ├── King Air B200
       ├── King Air B350
       ├── King Air C90GTx
       └── Caravan 208B
```

### What Each Worker Absorbs

| New Worker | Replaces (prior av-* slugs) |
|---|---|
| AIRCRAFT | aircraft-status-mel-tracker (partially), ad-sb-compliance-tracker (partially), parts of component-life-tracker |
| MX | maintenance-work-order-logbook, parts-inventory-manager, component-life-tracker, ad-sb-compliance-tracker, aircraft-status-mel-tracker |
| DISPATCH | mission-builder-dispatch, flight-risk-assessment-frat, weight-balance-calculator, weather-intelligence, flight-following-tracking, notam-intelligence, efb-flight-planning-companion, airport-helipad-intelligence |
| TRAINING | qualification-currency-tracker, training-records-manager, medical-certificate-tracker, ai-training-courseware, flight-duty-time-enforcer (training records portion) |
| OPERATIONS | crew-scheduling-roster, reserve-crew-swap-manager, flight-duty-time-enforcer, drug-alcohol-program-manager, safety-reporting-sms, foqa-flight-data-analysis, emergency-response-erp, post-flight-debrief, hazard-risk-register, sms-performance-monitor, ai-safety-officer, part-135-certificate-assistant, gom-poi-authoring, regulatory-compliance-monitor, far-compliance-monitor, charter-quoting-engine, accounts-receivable-billing, medevac-billing-collections, customer-portal-manager |
| CoPilot | av-digital-logbook, av-currency-tracker, av-my-aircraft, av-training-proficiency, av-flight-planning, av-alex-personal, av-pc12-ng, av-king-air-b200, av-king-air-b350, av-king-air-c90, av-caravan-208b |

---

## 2. The TYPE Layer

### Two Levels of TYPE

**Fleet TYPE** is the knowledge substrate for an aircraft model. It is not a user-facing worker — it is configured in workspace settings like a COA account in accounting. One TYPE is defined once and shared across all tails of that model.

```
TYPE: PC-12 NG (Pilatus PC-12/47E)
  ├── Maintenance program: inspection intervals, component life limits, overhaul requirements
  ├── AD/SB applicability: all current ADs and service bulletins for this model
  ├── Performance data: V-speeds, W&B envelope, fuel flow tables, climb/cruise charts
  ├── Regulatory requirements: type rating requirements (if applicable), currency standards
  └── Training standards: type-specific checkride standards, recurrent requirements
```

**Tail AIRCRAFT (N661LF)** is a specific instance of a TYPE. It references the TYPE for general limits and specs, then adds:
- This aircraft's actual TTSN, TSMOH, configuration, avionics
- This aircraft's actual maintenance history (every work order, every AD compliance entry)
- This aircraft's current airworthiness status (open squawks, MEL items, any deferred maintenance)
- This aircraft's deviation from the type baseline (STC modifications, avionics upgrades)

### The AFM/POH Rule

**RAAS invariant:** All performance calculations (W&B, dispatch release, TOLD cards) SHALL use pilot/operator-uploaded performance data from their certified aircraft's actual documents. The platform provides the frame — the computation structure, the limits checks, the output format. The operator provides the legal numbers from their actual AFM/POH.

This is legally correct (you cannot certify generic published numbers for a specific aircraft) and creates a moat. Once a customer uploads their aircraft data, that data is in the system. It is their data. Only SOCIII holds it in structured, queryable form.

### TYPE Supports All Workers

The TYPE layer is not CoPilot-only. Every worker reads from TYPE:

| Worker | What it reads from TYPE |
|---|---|
| MX | Maintenance program intervals, component life limits, AD/SB applicability for this model |
| DISPATCH | W&B envelope, performance tables, fuel planning data, V-speeds |
| TRAINING | Type rating requirements, recurrent training standards, checkride ACS/PTS |
| OPERATIONS | Regulatory requirements for this aircraft category/class, MEL category classifications |
| CoPilot | Type-specific procedures, limitations, emergency memory items, personal minimums context |

---

## 3. AIRCRAFT as Event Source

### The Core Invariant

The AIRCRAFT worker is the single source of truth for an aircraft's operational status. **Any event that changes an aircraft's state — squawk written, MEL deferred, work order opened or closed, AD complied with, airworthiness restored — is written once to the AIRCRAFT record and propagated to all subscriber workers.**

Nobody re-enters data. Nobody discovers a squawk by accident. Nobody schedules a grounded aircraft.

### Event Propagation Model

```
AIRCRAFT STATE CHANGE EVENT
  e.g.: N661LF — FCU squawk written by Pilot Johnson, 2026-07-30 14:23Z
  Aircraft status: OOS (maintenance)
  Estimated return: 48h + 2 MX test flights
  
  → MX receives:
      "FCU squawk open on N661LF. Pilot write-up: [full text]. MEL reference: [MEL item].
       History: FCU on N661LF has been written up twice in 18 months. Last repair: [date].
       Open a work order. Parts needed: [type-derived likely parts list]."
  
  → DISPATCH receives:
      "N661LF unavailable. Estimated return: [date+time].
       Affected trips: [list from schedule]. Repositioning options: [other tails with
       capacity]. Recommend: contact charter customers on affected trips within 2 hours."
  
  → OPERATIONS receives:
      "N661LF OOS for 48h. Pilot Johnson has 2 unscheduled days.
       Current duty time this week: 14h. Options: ground training, simulator slot,
       administrative tasks, GOM review, drug/alcohol program admin.
       Recommend: schedule N661LF test flights for Pilot Johnson on return."
  
  → CoPilot / Pilot Johnson receives:
      "Your aircraft N661LF is out of service. FCU squawk opened [time].
       Your next scheduled trip [date/route] is affected — DISPATCH is working
       on alternatives. Your schedule for the next 48h has been flagged."
```

### Squawk as First-Class Record

A squawk is the pivot point of this entire architecture. It is not a text note. It is a structured record:

```json
{
  "squawk_id": "sq_N661LF_20260730_001",
  "aircraft_id": "N661LF",
  "type_id": "pc12-ng",
  "written_by": { "pilot_id": "johnson_j", "cert": "ATP", "timestamp": "2026-07-30T14:23Z" },
  "description": "FCU inoperative — uncommanded pitch input on departure. Aborted takeoff.",
  "mel_reference": "MEL 22-10-01",
  "mel_category": "B",
  "aircraft_status": "oos_maintenance",
  "estimated_return_hours": 48,
  "mx_test_flights_required": 2,
  "events": [],
  "_isSeed": false,
  "tenantId": "..."
}
```

This record is written once (by the pilot in CoPilot, or directly in AIRCRAFT). MX reads it to open a work order. DISPATCH reads it to update availability. OPERATIONS reads it to manage the crew schedule. The Vault DTC anchors it immutably when the work order is signed off.

---

## 4. The MX Worker — Two Modes

### Mode 1: TYPE-Level Intelligence (General)

"The FCU is broken on my King Air C90 — how do I fix it?"

MX knows the King Air C90GTx maintenance manual structure. It knows the FCU is a Collins Pro Line 4 integrated avionics component. It knows the typical failure modes, the approved repair procedures, the regulatory citations (14 CFR 43, MMEL), and the paperwork required (FAA Form 337 if needed, maintenance release, logbook entry). This is general TYPE knowledge — no specific aircraft required.

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
| **Part 91 (personal/corporate)** | Flight planning, NOTAM brief, W&B, weather. No dispatch release required. Alex acts as self-briefing assistant. |
| **Part 135 (air carrier / charter)** | Formal dispatch release required before departure. FRAT mandatory. PIC and dispatcher co-sign. Alex enforces the release checklist. |
| **Part 141/142 (flight school)** | Student assignment to aircraft, instructor scheduling, solo endorsement verification before solo flights. Alex checks endorsements before aircraft assignment. |

The RAAS rules engine loads the right rule tree from `raas/aviation/{regulatory_part}/dispatch.rules.js` at dispatch time based on `workspace.regulatory_frame`.

### DISPATCH + AIRCRAFT Integration

When DISPATCH builds a dispatch release or flight plan:
1. Queries AIRCRAFT for current airworthiness status — if OOS, refuses dispatch
2. Pulls W&B envelope from TYPE, actual aircraft weight and CG from AIRCRAFT record
3. Queries OPERATIONS for crew duty time legality before releasing
4. Pulls live NOTAMs, METAR/TAF, SIGMET via the existing aviation API services
5. After release: monitors via ADS-B through flight-following service

---

## 6. The TRAINING Worker — Part of a Progression, Not a Destination

### The Core Model

Training completion ≠ operational authorization. This is a RAAS invariant enforced at the data layer:

```
training_event (signed off by CFI/DPE) → training_record (immutable DTC)
training_record → qualification_check (does this satisfy the regulatory requirement?)
qualification_check → currency_status (is it current? when does it expire?)
currency_status → OPERATIONS (who can fly what, right now?)
```

A pilot who passes a checkride gets a training record. That training record creates or updates a qualification. The qualification feeds OPERATIONS' crew legality engine. DISPATCH cannot release a trip with a pilot whose qualifications don't meet the trip requirements.

### Regulatory Frame

TRAINING adapts to the certificate being pursued or maintained:

| Part | Training type |
|---|---|
| Part 61 | Individual pilot certificates — PPL, IR, Commercial, ATP, CFI, type ratings |
| Part 141 | Approved school course completion — syllabus-based, stage checks, chief CFI sign-off |
| Part 142 | Training center (Level D simulator-based ATP-CTP, recurrent) |
| Part 135.293/.297/.299 | Operator recurrent — proficiency check, line check, IOE |

One record schema, multiple regulatory frames. The RAAS rule tree validates that the record satisfies the specific regulatory requirement it's claimed to satisfy.

---

## 7. The OPERATIONS Worker — Resource Optimization, Not Just Scheduling

### What OPERATIONS Manages

- Crew scheduling (who flies which tail on which trip)
- Duty time enforcement (FAR 135.265 through 135.273, or Part 91 self-imposed limits)
- Reserve crew management (who covers when a crew member is unavailable)
- SMS (Safety Management System) — incident reporting, hazard register, corrective actions
- Drug and alcohol program management
- GOM / POI authoring and currency
- Regulatory compliance monitoring (FAR changes, advisory circulars)
- Charter billing and accounts receivable
- Medevac billing (Medicare/Medicaid, air ambulance insurance)

### Idle Crew = Cost Center

When an aircraft goes OOS, OPERATIONS is the worker that asks: what is the highest-value use of this crew member's grounded time?

```
OPERATIONS receives: N661LF OOS, Pilot Johnson available for 48h

OPERATIONS evaluates:
  - Is Johnson due for recurrent training in the next 60 days? → Schedule it now.
  - Is there a simulator slot available at FlightSafety/CAE? → Book it.
  - Is Johnson's drug/alcohol testing due? → Schedule the collection.
  - Is there GOM review or regulatory training required? → Assign it.
  - Is there a trip that another crew member is short on? → Can Johnson cover?

Output: Suggested 48h schedule for Pilot Johnson, ready for ops director review.
```

This is not just scheduling. It is resource optimization applied to the most expensive variable cost in aviation operations: certified crew.

---

## 8. The CoPilot Worker — Personal Pilot Record + TYPE Intelligence

### What CoPilot Manages

- Digital logbook (replaces FVO, ForeFlight paper logbook, or Excel)
- Currency tracker — 3 takeoffs/landings, instrument currency, night currency, BFR/flight review
- Medical certificate status and expiration
- Personal schedule (what trips am I on? what training is coming up?)
- Personal minimums and go/no-go decision support
- Flight planning for personal/Part 91 operations

### TYPE Sub-Workers

Each TYPE sub-worker extends CoPilot with aircraft-specific intelligence:

```
CoPilot (PC-12 NG)
  ├── Knows PC-12 NG limitations and memory items
  ├── Knows PT6A-67P engine management nuances
  ├── Knows the TAS/fuel flow tables for planning
  ├── Knows the most common failure modes and QRH flows
  └── Reads the pilot's ACTUAL aircraft data from AIRCRAFT record (N661LF)
       — uses N661LF's actual empty weight, actual CG, actual TTSN for planning
```

The TYPE sub-worker provides general model intelligence. The AIRCRAFT record provides tail-specific actuals. Together they produce genuinely useful flight planning that a ForeFlight PDF cannot.

**The AFM/POH onboarding gate:** A CoPilot TYPE sub-worker is useful out of the box for general model questions. For flight planning and W&B calculations, it requires the pilot to upload their actual certified AFM/POH data. This is enforced by a canvas checklist tab — the W&B and performance tabs render in locked state until the operator uploads their data.

---

## 9. Firestore Data Model

### Collections

```
tenants/{tenantId}/
  aircraftTypes/{typeId}          — fleet TYPE definitions (PC-12, B200, etc.)
  aircraft/{aircraftId}           — specific tail records (N661LF, N662LF)
  squawks/{squawkId}              — squawk write-ups (linked to aircraft + crew)
  workOrders/{workOrderId}        — MX work orders (linked to squawk)
  dispatchReleases/{releaseId}    — dispatch releases (linked to aircraft + crew)
  trainingRecords/{recordId}      — training events (linked to crew member)
  qualifications/{qualId}         — pilot qualifications derived from training records
  dutyTimeEntries/{entryId}       — flight/duty time log
  crewSchedule/{entryId}          — crew schedule entries
  safetyReports/{reportId}        — SMS reports

dtcs/{dtcId}                     — immutable Vault DTC for completed/signed work orders
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

## 10. Sidebar Grouping

```
Aviation
  ├── AIRCRAFT        (slug: av-aircraft)
  ├── MX              (slug: av-mx)
  ├── DISPATCH        (slug: av-dispatch)
  ├── TRAINING        (slug: av-training)
  ├── OPERATIONS      (slug: av-operations)
  └── CoPilot
       ├── CoPilot        (slug: av-copilot)
       ├── PC-12          (slug: av-copilot-pc12)
       ├── King Air B200  (slug: av-copilot-b200)
       ├── King Air B350  (slug: av-copilot-b350)
       ├── King Air C90   (slug: av-copilot-c90)
       └── Caravan 208B   (slug: av-copilot-208b)
```

---

## 11. Canvas Design (Trump Rule)

Every worker must have a visually rich canvas before it ships. No worker launches with a blank or text-only canvas. Per the Trump Rule: people don't read, they see pictures.

| Worker | Primary canvas tabs |
|---|---|
| AIRCRAFT | Fleet Map (all tails, status: green/yellow/red), Tail Detail (N-number card, config, TTSN, open items), Squawks (open + history), ADs/SBs, Documents (AFM, 337s) |
| MX | Work Orders (open, in-progress, closed), Component Life (time since overhaul bars), AD Compliance matrix, Parts Inventory, Maintenance Schedule |
| DISPATCH | Dispatch Board (today's trips, tail assignments, crew legality), Weather Map (route weather overlay), W&B calculator, NOTAM Brief, Flight Following (live ADS-B) |
| TRAINING | Crew Currency Board (all pilots, all currencies, color-coded), Certificate Ladder (progress per pilot), Upcoming Expirations (calendar view), Training Schedule |
| OPERATIONS | Crew Schedule (Gantt), Duty Time (hours remaining per crew, color-coded), SMS Dashboard (open reports, hazard register), Compliance Calendar, Billing |
| CoPilot | My Logbook (recent flights, running totals), Currency Status (go/no-go at a glance), My Aircraft (tail status, next mx), Schedule (upcoming trips + training), Flight Planning |

---

## 12. Build Phases

### Phase 1 — AIRCRAFT + MX (Foundation)
- AIRCRAFT worker + canvas (Fleet Map + Tail Detail + Squawks)
- Squawk data model + event propagation hooks
- MX worker + canvas (Work Orders + Component Life + AD Compliance)
- TYPE library setup (PC-12 first, then King Air family)
- AFM/POH upload gate + W&B data ingestion

### Phase 2 — DISPATCH + OPERATIONS
- DISPATCH worker + canvas (Dispatch Board + Weather Map + W&B)
- Squawk → DISPATCH OOS propagation
- OPERATIONS worker + canvas (Crew Schedule + Duty Time + SMS)
- OOS → OPERATIONS idle-crew suggestion engine
- Regulatory frame selection (Part 91 / 135 / 141)

### Phase 3 — TRAINING + CoPilot
- TRAINING worker + canvas (Currency Board + Certificate Ladder)
- Training record → qualification → OPERATIONS crew legality bridge
- CoPilot worker + canvas (Logbook + Currency + Flight Planning)
- TYPE sub-worker shells (PC-12, B200, B350, C90, 208B)
- Personal pilot schedule integration with OPERATIONS

### Phase 4 — Event Spine + Demo
- Full squawk event propagation across all workers (real-time)
- Vault DTC anchoring of completed work orders
- AIRAC nav database integration (CODEX 56)
- Demo tenant seed: Eric Altshuler demo space, PC-12 fleet, seeded squawks + work orders

---

## 13. Regulatory Invariants (RAAS Rules)

These rules are enforced by the RAAS constraint engine, not by prompts. They cannot be overridden by the AI model.

1. **Dispatch shall not release an aircraft with an open OOS squawk** (unless MEL authorizes with restrictions noted)
2. **Dispatch shall not release a crew member whose currency has expired** for the operation type
3. **Dispatch shall not release a crew member who has exceeded duty time limits** for their regulatory frame
4. **MX shall not sign off work performed under an expired certificate** (A&P certificate expiration check)
5. **Training records shall not claim regulatory compliance** without the required signatures
6. **W&B calculations shall use operator-uploaded AFM data**, not platform defaults
7. **A squawk written by a pilot is presumed airworthiness-affecting** until cleared by a certificated mechanic

---

## 14. Competitive Position

**ForeFlight** owns the VFR/IFR navigation chart space. We do not compete on charts.
**RAMCO** owns Part 145 repair station MX at the enterprise level. We target the operator, not the MX shop.
**Protean** owns Part 135 ops specs consulting. We target the runtime, not the document production.
**FVO** owns the paper logbook import workflow. We absorb it.

SOCIII's moat is the event spine — the fact that a squawk written by a pilot instantly updates MX, DISPATCH, OPERATIONS, and the pilot's own schedule. No other platform in general aviation has this. The competitors are all point solutions with no cross-worker data model.

The second moat is the append-only record. A signed maintenance entry, a completed checkride record, a dispatch release — these are immutable once committed. That is legally defensible chain of custody. Guardian Flight's 2021 data loss was catastrophic because their records weren't immutable. Ours are.
