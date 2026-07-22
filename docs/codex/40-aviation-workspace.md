# CODEX 40 — Aviation Workspace
## The Verifiable Airworthiness and Operations Platform for Any Flight Operation

**Status:** ⚪ spec — awaiting Protean teardown (Sunday) before build
**Vertical key:** `aviation` · **Suite:** `Aviation in a Box`
**Primary creator:** Sean Combs (ATP, PC-12/47E, LifeFlight Network)
**Audience for this CODEX:** Platform builders, Part 135 operators, aircraft owners, flight school administrators

---

## 0. The One-Sentence Pitch

> Aviation is a coordination problem — weather, airworthiness, crew currency, duty time, maintenance history, compliance records all exist, but they're scattered across paper logbooks, PDF reports, six separate apps, and a phone call; when the right person doesn't have the right information at the moment they need to make a decision, accidents happen and operations become unsustainably expensive; this platform puts the complete, verified picture in front of the right decision-maker at the right moment, for any aviation business — from a student pilot learning in a Cessna 172 to a corporate flight department to a fire suppression operation to a Part 135 air ambulance company — so every flight starts with complete information and ends with an immutable record that proves it happened correctly.

---

## 1. The Problem That Exists in Every Flight Operation

Every aviation operation — a student learning in a Cessna 172, a corporate flight department, a wildfire suppression contractor, a charter company, a Part 135 air ambulance — has the same structural problem. The information needed to make safe decisions is scattered across people, paper, and incompatible software systems that don't talk to each other.

**The coordination failure:**
- Is the aircraft airworthy? The answer lives in the paper logbook (legal master record) and whatever was last entered into a separate MX system — if it was entered.
- Is the pilot legal for this flight? Currency status, duty time, medical, type ratings — tracked in different places by different people.
- What's the weather picture for this route? The pilot builds it from multiple sources; the scheduler has no visibility into it at all.
- Was the MX squawk properly cleared? The chain of custody: paper logbook → photo texted to a manager's personal phone → verbal phone call to the pilot. If an accident follows, the NTSB reconstructs what happened from whatever people remember about a phone call.

None of this is deliberate negligence. It's what happens when coordination across pilots, MX, and operations depends on everyone doing the right thing in the right order using tools that weren't designed to work together.

**At highest stakes (Part 135 air ambulance):**
The NTSB issued a Special Investigation Report in 2009 on air medical operations documenting 21 deficiencies and making 21 recommendations. The industry has not structurally solved any of them. A typical medevac pilot's shift requires six separate apps — each owned by a different company, none synced to the others — and an MX paperwork chain that ends with a phone call. A dispatcher manages flight requests with access to: the phone from the hospital, and a red/green status board. No duty time data, no currency status, no open squawks, no MX history.

**The paper logbook problem (universal):**
The paper aircraft logbook is the legal master record — not because it's good but because no digital system has been tamper-resistant enough to replace it. The result: MX software is a transcription target from paper, not the source of truth. Data is manually re-entered at least twice. Illegible or incorrect entries are the majority of MX compliance team workload. And every logbook that exists as paper is one loss event away from being unrecoverable (Guardian Flight, 2021: entire RAMCO database lost, fleet grounded).

**The same coordination deficit applies at every scale:**
- Part 91 charter: same airworthiness questions, same currency questions, lighter regulatory overhead
- GA private: same questions, no MX department to help, paper logbook in a bag behind the seat
- Corporate flight departments: multiple aircraft, multiple crew, scheduler has no live view of who's legal for what
- Flight schools (Part 141/61): is the aircraft on 100-hr? Is the CFI legal for this student? Has the student received the required endorsements? Is the solo area current? All paper, all manually logged, all verifiable only by digging through a folder

---

## 2. Three Audiences — One Platform

### Audience 1: GA Pilots ("cool tech" entry point)
**Profile:** Private/instrument/commercial pilot, owns or rents aircraft, flies Part 91. Uses ForeFlight. Wants preflight intelligence without the friction.
**Pain:** Scattered data — personal logbook (paper or Foreflight), aircraft logbook (paper), METAR/ATIS (ForeFlight or aviationweather.gov directly), NOTAMs (FAA NOTAM system), W&B (Excel or aircraft POH). No single source of truth.
**What they buy:** CoPilot Worker standalone. Personal pilot logbook (DTC), currency dashboard, preflight go/no-go in one screen, searchable POH.
**Price anchor:** Free. They pay for data (weather briefings, NOTAM pulls, chart tiles — metered at cost + markup). Competes with ForeFlight on price and beats it on the immutable logbook + rules-engine enforcement.

### Audience 2: Part 135/91 Operators + Aircraft Owners (primary target)
**Profile:** Air ambulance operators, charter operators, corporate flight departments, aircraft owners with management agreements. Regulated by FAA Part 135 or Part 91. Multiple aircraft, multiple pilots, MX department.
**Pain:** Everything documented above — FVO + RAMCO + 4 other apps; paper logbook as legal record; verbal RTS approvals; dispatcher without safety data.
**What they buy:** Aviation in a Box — CoPilot + MX + Operations workers, all sharing one aircraft DTC per tail.
**Price anchor:** $99/mo + $5/active user/mo + data. Data fees cover ADS-B queries, NOTAM pulls, chart tiles — metered at cost + markup. Enterprise/multi-base: custom.

### Audience 3: Flight Schools (Part 141/61)
**Profile:** FAA-certificated flight schools (Part 141) or Part 61 instruction operations. Manage a fleet of training aircraft (Cessna 172, Piper Archer, etc.), a roster of CFIs, and a student population in various stages of training.
**Pain:** Same airworthiness questions (is the 172 legal? 100-hr current? annual current?), plus: student progress tracking (syllabus stage checks for 141), CFI endorsement management (legally required, immutable), scheduling (which aircraft is available for which student/CFI pair?), student logbook verification.
**What they buy:** Aviation in a Box for Schools — CoPilot (with CFI/student mode) + Operations (scheduling + endorsement tracking). MX worker optional add-on.
**Price anchor:** $99/mo + $5/active user/mo + data. Same "Business in a Box" model as Education. Data fees metered.

---

## 3. Platform Principles

### Principle 1 — The Append-Only Logbook Is the Legal Record (Not the Backup)
The paper logbook in aviation is the legal master record today because it's the only thing that can't be secretly altered. An append-only Firestore record with cryptographic identity anchoring is structurally more tamper-resistant than paper. The goal is not to digitize paper — it is to make the digital record structurally superior as a legal artifact. Every entry: who wrote it, when, from what device, with what identity. Not alterable. Not deletable.

### Principle 2 — Photos Are Not Optional; Exceptions Are Identity-Anchored and Explicit
Illegible or missing logbook entries are the source of 30%+ of MX compliance team workload (per direct operator experience). Every squawk close-out and every MX logbook entry must attach at least one photo. The system will not accept a return-to-service attestation without a photo of the completed work by default — this is the standard path, not a recommendation.

**Break-glass exception path (required — not optional):** The flagship use case is Part 135 air ambulance, which operates in remote landing zones, connectivity gaps, and time-critical missions where a camera failure or upload failure must not ground an airworthy aircraft. A manager-level identity (MX Manager or above) may override the photo requirement, but the override itself becomes a named, identity-anchored DTC event — `rts_photo_exception` — with a mandatory reason field and the manager's cryptographic signature. The absence of a photo is recorded permanently alongside the RTS approval, not silently accepted. The exception is visible to the FSDO, to the operator's chief pilot, and to any future NTSB investigation. What is unacceptable is a hard block with no break-glass path — a rule with zero override in a time-critical operation is not a safety feature; it becomes the safety hazard.

### Principle 3 — Information Reaches the Right Person at the Right Time
The PIC (Pilot in Command) is the final authority on every flight — FAR 91.3, full stop. The dispatcher manages logistics. The MX manager clears aircraft for service. The CFI authorizes solo flight. Each of these people has a decision to make. What they lack today is the information to make it correctly: duty time, currency, airworthiness status, FRAT score, open squawks — scattered across systems that don't talk to each other. The Operations Worker doesn't make the go/no-go call for the dispatcher. The CoPilot Worker doesn't make the weather decision for the pilot. They assemble the currently available relevant data and put it in front of the right person at the right moment, so decisions get made with better information instead of a gut call and a phone call. The platform does not claim to have surfaced every possible relevant fact — it claims to have surfaced what the connected data sources know at that moment. Gaps in source data are displayed as gaps, not silently omitted. This is true whether the operation is a flight school tracking student endorsements, a corporate scheduler managing a Gulfstream, or a medevac operator triaging a night IFR mission request.

### Principle 4 — Weather and Charts Are FAA Sources Only; Degraded Mode Is Defined
Commercial weather aggregators are not legal for aviation use in the US. All weather data comes from aviationweather.gov (NOAA/AWC) directly. All chart tiles come from AvCharts (FAA aeronautical chart publications redistributed). This is a hard architectural constraint, not a preference.

**Degraded mode (aviationweather.gov outage):** NOAA does experience outages. The platform must define behavior now rather than leave it undefined. When `aviationweather.gov` returns errors, the Preflight tab displays an explicit, timestamped service-unavailable banner — pilots see the gap, not a stale result or a silent failure. The go/no-go DTC event records the weather source status at signing time. Cached METAR/TAF data from the last successful pull is displayed as stale with the age shown — never presented as current. Operators who need weather in degraded mode are directed to `aviationweather.gov` directly via browser (always available as a backup, since the underlying source is the same). No alternative weather aggregator is ever used, regardless of availability state. This is a build constraint: the weather service must propagate error state up to the UI explicitly.

### Principle 5 — The RAAS Rules Engine Differentiates by Operation Type
The same three workers serve GA, Part 135, and Part 141. The rules that enforce legality differ by certificate type. Tenant onboarding sets the operation type, which loads the appropriate ruleset. A Part 135 operator gets: duty time advisory with logged override path (not a silent hard stop — see RT1 and CODEX 46 §3), OCC approval gate, mandatory FRAT, RTS manager approval chain. A Part 91 owner gets: basic currency tracking, no duty time enforcement, lighter FRAT. A Part 141 school gets: CFI endorsement hard stops, student solo authorization rules, stage check sequencing.

### Principle 6 — The Immutable RTS Chain Is the Moat
The current RTS workflow (paper → photo → text → phone call) leaves no verifiable record that a manager reviewed the work before clearing the aircraft. An NTSB investigation cannot reconstruct it. The SOCIII RTS chain — photo attached, manager identity-anchored approval, immutable DTC event, automatic fleet board update — answers every NTSB question with a timestamped, cryptographically signed record. This is not a feature. This is a different legal posture.

---

## 4. Three Workers

### Worker 1 — CoPilot
**Slug:** `copilot-001`
**Primary user:** Pilot (any certificate level), student pilot
**The function:** Single source of preflight truth. Replaces: FVO dashboard + FVO leg details + FVO flight summary + ForeFlight weather/NOTAMs + paper personal logbook + Content Locker (company documents).

**Type context — how the CoPilot knows what aircraft you're flying:**
The CoPilot operates at two levels simultaneously. The **Aircraft DTC** (per tail, N-number anchored) tells the CoPilot whether this specific aircraft is airworthy today. The **Type Card** (per ICAO type code, e.g., `PC12`, `A320`, `BE58`) tells the CoPilot everything about how to operate that kind of aircraft — systems, limitations, performance, type-specific currency requirements. When you're assigned N662LF (a PC-12), the CoPilot loads the PC-12 type card (PT6A systems, pressurization, Vmo, TOLD performance model, recurrent training requirements) alongside the specific tail's MX status and W&B. On a different day flying an A320, it loads the A320 type card (fly-by-wire, ECAM, FMGS, type rating currency). You, the pilot, have one CoPilot — it knows all the types you're rated for and loads the right context for today's aircraft.

**What goes in a Type Card:**
- FAA classification: type rating required (A320, B737, PC-12 for hire above certain gross weight) vs. class/category rating only (BE58 = multi-engine land, no type rating)
- Aircraft specs from Aircrafts Data API (ICAO type code → manufacturer, max gross weight, service ceiling, engine count/type, avionics baseline)
- Key limitations: Vmo/Mmo, Vle, Vlo, max crosswind demonstrated, pressurization limits, engine start limits
- Performance quick-reference: typical takeoff/landing distances, cruise fuel burn, range, single-engine ceiling
- Type-specific currency: recurrent training interval (Part 135: 12mo sim; PC-12 LifeFlight: specific profile), PC check requirements, line check cadence
- Type-specific FRAT items: pressurized ops risk (single-engine turboprop vs. twin), icing certification (FIKI vs. no-FIKI), night vision (HEMS-specific)
- POH/AFM linked from Vault docs for this type

**Canvas tabs:**

| Tab | What it shows |
|---|---|
| **Briefing** | Shift start summary: aircraft assigned (with type), currency status (green/yellow/red) including type-specific recurrent, duty hours available, next training due, open items from MX. Auto-generated at shift check-in. |
| **Preflight** | FRAT (loaded from type card — shows rotorwing sections only for RW types, FIKI/icing risk only for relevant types), weather go/no-go (METAR/TAF/SIGMET/PIREP for departure + destination + alternates, FAA sources only), NOTAMs (Notamify, helipad/airport-specific), W&B calculator (envelope from type card + specific tail data from aircraft DTC, pre-loaded crew weights), performance summary. Produces signed go/no-go record (DTC event) before flight. |
| **Type** | The Type Card for the assigned aircraft: systems overview (AI-synthesized from POH/AFM), key limitations at a glance, performance quick-reference, currency requirements for this type, type rating status on pilot's certificate. Switches automatically when a different aircraft type is assigned. One day it's the PC-12 card; another it's the A320 card — same tab, right context. |
| **Charts** | FAA chart tiles (AvCharts — sectional, IFR low/high, terminal): legal for flight planning. ADS-B traffic overlay. Route depiction. |
| **Logbook** | Per-leg flight entry: date, route, aircraft, role (PIC/SIC/dual/solo), time breakdown (day/night/IMC/XC/simulated instrument/approaches/landings). Photo attachment slot (Hobbs photo, any required documentation). Structured — no free-form text for numeric fields. Entries are DTC events: immutable once submitted. |
| **Documents** | Aircraft-specific docs from Vault: POH, AFM, company ops specs, W&B data, checklists. AI searchable across all documents. Replaces Content Locker + FVO Documents. |

**CFI/Student mode (Part 141):** Briefing tab shows student's syllabus progress + pending endorsements. Type tab shows the training aircraft type card (student can study systems between flights). Logbook tab includes dual vs solo designation. Documents tab adds student training record access.

---

### Worker 2 — MX
**Slug:** `mx-001`
**Primary user:** Maintenance technician (A&P), IA, MX Manager
**The function:** Digital aircraft logbook and MX compliance workflow. Replaces: RAMCO Fleet Operations Hub + RAMCO Journey Log + RAMCO Discrepancy Management + RAMCO Aircraft Work Reporting Hub + Mechanic Anywhere + Content Locker (MEL lookup).

**Canvas tabs:**

| Tab | What it shows |
|---|---|
| **Fleet Board** | All aircraft: tail #, model, condition (green/yellow/red), MX overdue (days remaining/overdue), open squawks count, base, MOC assigned. Live — updates on any DTC write. Replaces RAMCO Fleet Operations Hub. Searchable by tail #. |
| **Aircraft** | Select a tail → shows: airworthiness status, inspection due list sorted by urgency (days remaining), squawks (open/deferred/closed), W&B current data, engine hours/cycles, component TT/cycles. No PDF generation required — live view. |
| **Logbook** | Aircraft-level append-only event log: inspection completed, squawk opened/closed, component replaced, AD complied, W&B updated, RTS event. Every entry: technician identity + timestamp + photo (required). |
| **Squawks** | Write up a new squawk: description, ATA chapter (AI-assisted lookup from natural language description), MEL reference (pulls from Vault docs), deferral type. Attach photos (required). Route to MX Manager for RTS approval. Status: open → in work → pending approval → closed (RTS). |
| **Inspection Due** | Sorted inspection schedule for a tail: task description, interval, last performed, remaining (days/hours/cycles), next due. Color-coded. Push alerts generated for items within 10% of interval. Replaces RAMCO Aircraft Maintenance Due Report PDF. |

**RTS Approval Flow:**
1. Tech writes squawk → attaches photos → submits for approval
2. MX Manager receives in-app push notification with embedded photos
3. Manager taps Approve/Reject (identity-anchored) → immutable DTC event
4. Fleet Board updates automatically: aircraft condition changes to green
5. CoPilot Briefing tab for assigned pilot reflects RTS automatically
6. Zero phone calls. Zero texts. Zero manual RAMCO entry.

---

### Worker 3 — Operations
**Slug:** `operations-001`
**Primary user:** Dispatcher, scheduler, CFI, school administrator, flight department coordinator
**The function:** AI rules-engine go/no-go + fleet/crew scheduling. Replaces: Protean + EMS Manager + FVO Schedule + RAMCO Crew Duty Activity (which is empty anyway because FVO doesn't sync to it).

**Canvas tabs:**

| Tab | What it shows |
|---|---|
| **Fleet** | Live fleet board with ADS-B positions (where are the aircraft right now), condition status from MX Worker, assigned crew, next MX due. Real-time. |
| **Requests** | Incoming flight requests (from hospital, charter client, student booking). Pre-assembles the complete picture: crew duty time remaining, crew currency for this flight (night? IFR? type rating?), aircraft MX status and open squawks, scheduling conflicts, FRAT pre-score. Dispatcher sees all of it in one view and accepts or declines — with full information instead of a phone call and a red/green board. Weather briefing for the assigned route is generated and routed to the PIC's CoPilot preflight — the weather go/no-go decision belongs to the PIC, not the dispatcher (FAR 91.3). |
| **Schedule** | Crew availability calendar: pilots, med crew (Part 135), instructors (Part 141). Duty time tracker per crew member. Aircraft availability (green/yellow/red from MX). Helipad/airport status feed. |
| **Route** | Route planning: origin to destination, weather overlay (winds aloft, SIGMET/AIRMET), NOTAMs along route, alternates, fuel stops, estimated block time. Feeds Requests tab go/no-go calculation. |
| **Accounting** | Flight billing summary: flights completed, billable hours, crew assigned, aircraft used. For Part 135: hospital billing records. For charter: client invoices. For flight schools: student billing (dual hours × rate). Connects transport record to payment — closes the gap where operators can't get paid because the charting is disconnected from the flight. |

**Accounting tab note:** This tab is the bridge to the patient/charting problem (to be specced Sunday when Protean teardown is complete). The manifest and transport record that lives here is what hospital billing departments need to process the claim. Currently that data is captured nowhere in FVO or RAMCO.

---

### Worker 4 — Compliance Documents
**Slug:** `aviation-compliance-001`
**Primary user:** Chief Pilot, Director of Operations, Director of Training, FSDO-facing operator representative
**The function:** Generate, maintain, and submit the regulatory document stack required to hold and operate under an FAA operating certificate. Replaces: the current model of hiring a former chief pilot to copy and rename his last employer's documents, submitting them to the FSDO, and hoping nobody looks too closely.

**Documents this worker generates and maintains:**

| Document | What it is | Current state |
|---|---|---|
| **GOM** (General Operations Manual) | Part 135 operating procedures — required by FAR 135.23. Specific to company, aircraft, bases, operation type. | Copy-paste from previous employer. Company name + aircraft list swapped. Submitted to FSDO. Often outdated within 6 months as regs change. |
| **SOP** (Standard Operating Procedures) | Detailed step-by-step procedures for specific ops: weather minimums, divert criteria, crew coordination, emergency procedures | Usually a derivative of the GOM or pulled from manufacturer docs |
| **MEL** (Minimum Equipment List) | FAA-approved list of equipment that may be inoperative and under what conditions. Aircraft-specific, FSDO-approved. | Start from MMEL (Master MEL provided by FAA for each aircraft type), customize for operator's fleet, submit for approval. Often years behind the current MMEL revision. |
| **NEF** (Negative Equipment List) | Equipment not installed that otherwise would be required — documented absence | Typically buried in the MEL package |
| **Ops Specs** | FAA-issued operational specifications — defines exactly what the certificate holder is authorized to do (routes, aircraft types, weather minimums, etc.) | Issued by FSDO after reviewing GOM/SOP. Amendments required for: new aircraft type, new base, new operation type. Currently: call your POI (Principal Operations Inspector) and wait. |
| **Training Records / Curriculum** | Part 135.293/299/301 training requirements — what training each crewmember needs and when | Manual tracking. Chief Pilot keeps a spreadsheet. |

**How it works:**
1. Operator sets up their certificate: operation type (135/91/141), aircraft list (pulled from `aircraftDTC`), base locations, crew roster
2. Compliance Documents Worker generates a GOM draft pre-populated with the operator's actual data — not a generic template with blank fields to fill in
3. AI cross-references the current FARs and AC (Advisory Circulars) applicable to this operation type — flags any section where the operator's practices may be non-compliant
4. When regulations update (FAA issues new rule or NTSB recommendation becomes mandatory), worker flags every affected GOM section and proposes updated language
5. MEL is generated from the MMEL for the specific aircraft model (pulled from FAA database), with operator customizations noted and change-tracked
6. All documents are version-controlled append-only — every revision is a new DTC event, not an overwrite. FSDO accepts amendments with full audit trail
7. Ops Spec amendments: worker drafts the amendment letter to the FSDO based on the change (adding N662LF to the fleet → generates the ops spec amendment package)
8. **Identity-anchored approval gate before any FSDO submission:** AI authorship is a starting point, not the final word. Before any document is marked "submission-ready," the Director of Operations (or Chief Pilot for 141) must perform an in-app review and apply an identity-anchored approval — the same pattern as the MX RTS chain. The DTC event records: who reviewed, when, what version they approved. No "Download + submit" button is active until that approval event exists. An AI-drafted GOM section submitted to the FSDO without a qualified human sign-off is not an improvement over the current copy-paste workflow; it's the same failure mode with a different, less accountable author.

**The moat:** Once an operator's GOM lives in this system, switching means re-generating their entire regulatory document stack. That's a multi-month process. Switching cost is real and legitimate.

**Canvas tabs:**

| Tab | What it shows |
|---|---|
| **Status** | Certificate overview: operation type, certificate number, FSDO of jurisdiction, POI name, ops specs current, next renewal. Compliance checklist: GOM current (yes/no/flagged), MEL current, training records complete. |
| **Documents** | All generated documents with version history. Each document: current version, last FSDO submission date, pending amendments, flagged sections (reg changes). Download + submit buttons. |
| **Regulations** | Active FARs and ACs applicable to this operation. Sorted by: recently amended (highest attention first), flagged against operator's documents. AI summarizes what changed and what needs to update. |
| **Training** | Per-crewmember training record vs. 135.293/299/301 requirements. Green/yellow/red. Upcoming expirations. Links to external training providers. |
| **Amendments** | Amendment pipeline: pending FSDO submissions, outstanding responses, historical approvals. |

---

## 5. Data Model

### Aircraft DTC (tail-number anchored)
One Firestore document per N-number. All three workers read from and write to it.

```
aircraftDTC/{nNumber}
  ├── identity: { registration, model, icaoType, serialNumber, year, ownerName, baseStation }
  ├── airworthiness: { airworthinessDate, annualDue, 100hrDue, lastInspection }
  ├── engine: { make, model, serialNumber, totalTime, timeSinceOverhaul, cycles }
  ├── weightBalance: { emptyWeight, emptyArm, maxGrossWeight, usefulLoad, configName, lastUpdated }
  ├── status: { condition, mxOverdue, openSquawks, assignedPilot, baseStation, lastFlight }
  └── events/: append-only subcollection
       ├── type: flight_leg | squawk_opened | squawk_closed | inspection | rts | component_replacement | weight_balance_update | correcting_entry | rts_photo_exception
       ├── timestamp, authorId, authorRole
       ├── photos: [storageUrl, hash]
       ├── correctsEventId: "..." (only on correcting_entry — points to the event being corrected)
       ├── correctionReason: "..." (required on correcting_entry — mandatory text field)
       └── payload: { type-specific fields }
```

**Legal record clarification:** The `events/` subcollection is the legal master record. The top-level fields (`airworthiness`, `engine`, `status`) are a computed cache derived from events — they exist for read performance, not as a source of truth. Engineers must never update top-level cached fields directly to "fix" a discrepancy; corrections go through a `correcting_entry` event, which is the digital equivalent of the paper logbook's strikethrough-plus-initials convention. Any future code review should treat a direct write to a top-level `aircraftDTC` field (outside of the event-processing path) as a bug, not a shortcut.

**Correction mechanism (`correcting_entry`):** When a genuine data-entry error occurs (wrong tail number, wrong date, wrong time), the fix is a new `correcting_entry` event that references the erroneous event by ID, states the reason for correction, and provides the corrected values. The original event is never deleted or modified. Both events remain in the log — the correction is visible, the original is visible, and the audit trail is unbroken. This mirrors the paper logbook convention courts have accepted for decades.

### Type Card (ICAO type code anchored)
One Firestore document per aircraft type. Shared across all pilots who fly that type. Seeded from Aircrafts Data API + POH/AFM in Vault; updated when regulations change or operator uploads revised docs.

```
typeDTC/{icaoTypeCode}   // e.g., "PC12", "A320", "BE58", "R44"
  ├── identity: { manufacturer, model, icaoType, category, class }
  ├── certification: {
  │     typeRatingRequired: true/false,
  │     typeRatingDesignator: "PC-12" | null,
  │     classRequired: "multiEngineLand" | "singleEngineLand" | ...,
  │     operationsCategory: "normal" | "transport" | "commuter"
  │   }
  ├── specs: { maxGrossWeight, serviceceiling, engineCount, engineType, avionics }  ← from Aircrafts Data API
  ├── limitations: { vmo, mmo, vle, vlo, maxCrosswindDemonstrated, pressMaxDifferential }
  ├── performance: { typicalTakeoffDist, typicalLandingDist, cruiseFuelBurn, range, singleEngineCeiling }
  ├── currency: {
  │     recurrentInterval_months: 12,          // Part 135 standard
  │     simRequired: true/false,
  │     pcCheckRequired: true/false,
  │     lineCheckRequired: true/false
  │   }
  ├── fratItems: [{ id, text, appliesToType: ["PC12"] }]  ← type-specific FRAT risk items
  └── vaultDocRefs: [{ docType: "POH" | "AFM" | "checklist", vaultId }]
```

### Pilot/Student DTC (person anchored)
One Firestore document per pilot or student. Follows them across employers and schools.

**Cross-employer visibility scoping — explicit rules required:** The pilot DTC follows the person, but not all fields follow without consent. Default visibility rules:

| Field | Visible to new employer by default? | Rationale |
|---|---|---|
| Certificate, ratings, medical | Yes | Regulatory — employer must verify |
| Currency status (BFR, IPC, 90-day) | Yes | Safety-critical — employer needs to know |
| Type rating currency | Yes | Same |
| Total logbook time summary | Yes | Standard screening, pilot already submits this |
| Granular flight/duty history at prior employer | **No — requires pilot consent** | Competitive sensitivity for prior operator; pilot's private data |
| Duty time accumulated (current rest period) | Yes | Safety-critical — cannot be hidden from new operator |
| Incident/disciplinary events | **No — requires pilot consent + possible legal review** | Privacy + employment law |

Pilots control granular history sharing via an explicit consent event in their DTC. Operators see what they need for safety and legal compliance; they do not see what could give a competitor insight into their prior employer's operations.

```
pilotDTC/{uid}
  ├── identity: { name, certificateNumber, certificateType, ratings[] }
  ├── medical: { class, issueDate, expirationDate }
  ├── currency: { 
  │     bfr: { lastDate, expirationDate },
  │     ipc: { lastDate, expirationDate },
  │     nightCurrency: { last3landings, qualifiedThrough },
  │     tailwheelCurrency: { last3, qualifiedThrough }
  │   }
  ├── ratings: [{ type, dateAdded, endorsingCFI, dtcEventId }]  ← CFI endorsements: immutable
  ├── dutyTime: { shiftStart, shiftHours, restSince, flightHours24hr, flightHoursMonth }
  └── logbook/: append-only subcollection
       ├── type: flight_leg | training | endorsement_received | endorsement_given
       ├── timestamp, authorId (pilot or CFI)
       ├── aircraftNNumber, route, role (PIC/SIC/dual/solo)
       ├── times: { total, day, night, imc, simInst, xc, pic, dual, solo }
       ├── approaches: { precision, nonPrecision, holds }
       └── photos: [hobbs_photo, ...] (required for Part 135 logbook entries)
```

### CFI Endorsement Event (legally distinct sub-type)
When a CFI signs a student endorsement, it creates an immutable DTC event on the STUDENT's logbook, signed by the CFI's identity anchor — not the student's.

```
endorsement_event:
  type: endorsement_given
  studentUid: "..."
  cfiUid: "..."          ← CFI's Firebase Auth identity
  cfiCertNumber: "..."
  endorsementType: solo | xc_solo | night_solo | checkride_ready | ...
  conditions: { aircraft, airports, area, ... }
  timestamp: server-generated (not client)
  signatureHash: "..."   ← cryptographic binding
```

---

## 6. RAAS Rules Differentiation

Same three workers. Different rules loaded per `operationType` tenant setting.

### `rules/aviation-part-91` (GA private, owner-operated)
- Currency tracking: medical, BFR (24mo), IPC (if IFR rated), 90-day landing currency
- Aircraft airworthiness: annual + 100-hr (if for hire), ADs, ELT
- FRAT: optional but available
- Duty time: not enforced (Part 91 has none for non-commercial)
- Hard stops: none — advisory only

### `rules/aviation-part-135` (commercial charter, air ambulance)
- Currency tracking: all Part 91 plus type rating currency, recurrent training, company check
- Aircraft airworthiness: all Part 91 plus Part 135 inspection requirements
- FRAT: **required** before flight acceptance — cannot close without signed go/no-go DTC event
- Duty time: **advisory with override path** — flight duty period limits surfaced to dispatcher; override requires identity-anchored manager acknowledgment (logged, visible to FSDO). Do NOT build as a silent hard stop — see CODEX 46 §3 and RT1.
- OCC approval: **required** — dispatch cannot accept flight without rules-engine verification (advisory with logged override — same pattern as duty time)
- RTS approval: **manager approval required** — cannot mark aircraft available without identity-anchored manager sign-off
- Dispatch verification: **AI rules-engine required** — Operations Worker pre-assembles crew/aircraft compliance data before dispatcher accepts client request; weather go/no-go remains PIC authority (FAR 91.3)

### `rules/aviation-part-141` (certificated flight school)
- All Part 91 rules plus:
- Stage check sequencing: student cannot proceed to next stage without completed stage check (DTC event)
- Solo authorization: student cannot log solo without CFI endorsement DTC event for that aircraft type and area
- CFI endorsement log: all endorsements are immutable DTC events signed by CFI's identity anchor
- Training record: 141 syllabus compliance tracked per student per course
- Aircraft 100-hr: enforced (Part 141 aircraft used for instruction require 100-hr regardless of hire status)

### `rules/aviation-part-61` (general flight instruction)
- All Part 91 plus CFI endorsement log (lighter than 141 — no formal syllabus tracking)
- Endorsements still create immutable DTC events

---

## 7. What's Already Built

**Do not rebuild any of this.**

From `services/copilot/`:
- `parsers/foreflightParser.js` — ForeFlight CSV ingestion (migration tool)
- `parsers/fvoParser.js` — FVO data ingestion (migration tool for operators moving from FVO)
- `parsers/deduplicator.js`
- `logic/currencyTracker.js` — pilot currency (medical, BFR, IPC, recurrent, 90-day)
- `logic/dutyTimeTracker.js` — Part 135/91 duty time
- `logic/form8710Builder.js` — **Park** (checkride use case, not daily ops)
- `prompts/examinerMode.js` — **Park** (checkride use case)
- `generators/form8710Generator.js` — **Park**

From `vault/schemas/`:
- `aircraftLogbook.js` — aircraft MX logbook DTC schema (squawks, ADs, inspections, RTS, component replacement, W&B) — **extend, don't replace**
- `pilotCurrency.js` — pilot currency DTC schema — **add CFI endorsement event type**

From `services/aviation/`:
- `adsb.js` — live ADS-B positions (fleet board)
- `weather.js` — FAA AWC weather (METAR/TAF/SIGMET/PIREP/ATIS)
- `notams.js` — Notamify NOTAMs
- `avcharts.js` — FAA chart tiles (**NEW** — wired 2026-07-15)
- `aircraftData.js` — aircraft specs by ICAO type (**NEW** — wired 2026-07-15)
- `airac.js`, `navPackager.js`, `regions.js`, `faaData.js`, `faaRoutes.js` — AIRAC nav data

From `prompts/`:
- `pc12SystemPrompt.js` — **Drop** — replace with type-agnostic AI that reads aircraft spec from Aircrafts Data API

---

## 8. What Needs to Be Built

### Phase 1 — CoPilot Worker (GA entry point, builds the market)
- [ ] Firestore schema for `pilotDTC` (extend `pilotCurrency.js` schema)
- [ ] Firestore schema for `typeDTC` (new — per ICAO type code)
- [ ] Seed type cards for initial types: PC12, A320, BE58, C172, R44 (covers Sean's ratings + common GA/135)
- [ ] Aircrafts Data API integration: auto-populate `typeDTC` specs on first lookup by ICAO type code
- [ ] CoPilot canvas: **6-tab** component (Briefing / Preflight / **Type** / Charts / Logbook / Documents)
- [ ] Type tab component: loads `typeDTC` for the aircraft assigned today; switches context automatically when aircraft changes; pilot's type rating status from `pilotDTC` shown inline
- [ ] FRAT component: aircraft-type-aware (loads type-specific FRAT items from `typeDTC`, not a generic list)
- [ ] Preflight weather component: METAR + TAF + SIGMET + winds aloft for route (FAA sources, already wired)
- [ ] Go/no-go DTC event: signed preflight record with weather snapshot + FRAT score + type card snapshot
- [ ] Logbook entry form: structured fields + photo upload (Hobbs photo required for Part 135)
- [ ] Currency dashboard: green/yellow/red per certificate type + type-specific recurrent status
- [ ] RAAS: `rules/aviation-part-91` baseline ruleset

### Phase 2 — MX Worker (Part 135 operators)
- [ ] Extend `aircraftDTC` schema: inspection intervals, component tracking, squawk lifecycle
- [ ] MX canvas: 5-tab component (Fleet Board / Aircraft / Logbook / Squawks / Inspection Due)
- [ ] Squawk form: ATA chapter AI-assist, MEL reference lookup from Vault docs, photo required
- [ ] RTS approval chain: push notification to MX Manager → identity-anchored approve/reject → DTC event → fleet board update
- [ ] Fleet board component: real-time, pull from `aircraftDTC` status, ADS-B position overlay
- [ ] Inspection due component: sorted by urgency, push alert generation
- [ ] RAAS: `rules/aviation-part-135` ruleset (duty time advisory-with-override-path per RT1, FRAT required, RTS gate)

### Phase 3 — Operations Worker (replaces Dispatch)
- [ ] Operations canvas: 5-tab component (Fleet / Requests / Schedule / Route / Accounting)
- [ ] Data assembly engine: takes flight request → pulls crew duty time + currency + MX status + FRAT pre-score → presents complete picture to dispatcher for their decision; generates weather briefing and routes it to PIC's CoPilot preflight (weather go/no-go is PIC authority, not dispatcher authority)
- [ ] Schedule component: crew availability + duty time tracker + aircraft availability calendar
- [ ] Route planning component: weather overlay + NOTAMs along route + alternates
- [ ] Accounting tab: flight billing records per flight, connected to manifest/transport record
- [ ] RAAS: Operations-layer rules (OCC approval gate, dispatch verification)

### Phase 4 — Flight School Mode (Part 141)
- [ ] CFI endorsement DTC event type (CFI identity-anchored, student's record)
- [ ] Student roster view in Operations Worker (scheduling + syllabus progress)
- [ ] Stage check sequencing in RAAS: `rules/aviation-part-141`
- [ ] Solo authorization gate: check endorsement DTC before permitting solo logbook entry

### Pending (Sunday — Protean teardown + patient/charting spec)
- [ ] Med crew manifest: patient weight/diagnosis/care level attached to flight record
- [ ] Transport record: connects flight record to hospital billing
- [ ] Patient outcome tracking: links from transport to outcome data (hospital-side integration)
- [ ] Protean integration/replacement: dispatch notes + call log in Operations Worker

---

## 9. Competitive Position

| Incumbent | What it does | What it misses | SOCIII advantage |
|---|---|---|---|
| **FVO** | Duty check-in, FRAT, W&B, flight log, messages, documents | No NOTAM integration, no real MX sync, password "signatures", no go/no-go engine | Immutable DTC logbook, verified go/no-go, cryptographic signatures, single app |
| **RAMCO** | MX planning, journey log, fleet status, discrepancy tracking | Paper logbook still master record, no FVO sync, no document search, MEL utility broken, single point of failure (Guardian 2021) | Aircraft DTC as master record (no paper), AI-assisted MEL, cross-searchable docs, no data loss risk |
| **Protean** | Dispatch notes, call log, flight assignment tracking | No safety data, no go/no-go engine, not connected to MX or weather | Rules-engine verified go/no-go, full data context, client portal response |
| **ForeFlight** | Weather, charts, performance, pilot logbook | No MX integration, no dispatch, no company ops layer, no rules enforcement | One platform for pilot + MX + dispatch; ForeFlight import as migration path |

**Entry point for Part 135 operators:** operators who have experienced a Guardian-style data loss, operators whose insurance carrier has flagged their safety program, or new operators who haven't committed to RAMCO yet.

**Entry point for GA pilots:** the CoPilot Worker as a standalone subscription — builds the install base and demonstrates the platform before the MX/Operations conversation.

**Entry point for flight schools:** the student logbook integrity problem. Schools that have faced disputes about student records, endorsement disputes, or accreditation questions around documentation.

---

## 10. Pricing Model

| Product | Platform fee | Per-user | Data |
|---|---|---|---|
| **CoPilot (GA entry point)** | Free | — | Metered (weather, NOTAMs, chart tiles — cost + markup) |
| **Aviation in a Box (Operator)** | $99/mo | + $5/active user/mo | Metered (ADS-B, NOTAMs, chart tiles — cost + markup) |
| **Aviation in a Box for Schools** | $99/mo | + $5/active user/mo | Metered |
| **Enterprise / Multi-base** | Custom | Volume | Custom data package |

Data is the revenue. Platform access is the adoption hook — same model as Education ($99 + $5/student). A 10-pilot Part 135 base at $99 + $50 users + typical data usage compares very favorably to FVO + RAMCO combined licensing.

---

## 11. Open Decisions

1. **Protean replacement vs. integration** — Does the Operations Worker replace Protean entirely, or does it write back to Protean via an API for operators who can't migrate? (Answer after Sunday teardown.)

2. **Patient/charting spec** — What does the med crew manifest look like? How does the transport record connect to hospital billing? What's the patient outcome tracking model? (Answer after Sunday; potential fourth worker: Med Crew.)

3. **ForeFlight relationship** — ForeFlight is deeply embedded in GA and Part 135 culture. Do we position as "import your ForeFlight history and switch" or "use both, SOCIII for ops, ForeFlight for navigation"? The latter is lower friction to adoption.

4. **Demo workspace** — Should the aviation demo use Sean's actual LifeFlight ops data (anonymized) or build a fictional charter operator? Real data is more compelling; requires scrubbing patient/crew PII.

5. **ADS-B live fleet board** — The ADS-B Exchange API gives live positions for any aircraft by tail number. For the demo, we can show real N-numbers in flight. Need to confirm whether showing real Part 135 aircraft positions publicly is appropriate. Additional consideration: for air ambulance operators specifically, publicly visible pickup/dropoff position patterns at hospital helipads can enable inference about specific patient transports — which is a HIPAA-adjacent privacy risk even though ADS-B is public data. Resolve before shipping fleet board for Part 135 air ambulance tenants.

6. **Part 135 hard stop legal posture** — See RT1. Before building any Part 135 enforcement gate (duty time blocks, FRAT required, OCC approval gate): decide between (a) advisory-with-logged-override and (b) enforcement-with-deliberate-regulatory-posture. Requires aviation counsel. Do not default to "we'll figure it out later" — that is exactly what produces the RT1 contradiction.

7. **FAR 135.265 validation** — See RT2a. Duty time gate must not go live as an enforced block without a documented validation pass against the actual regulatory text, including scheduled vs. unscheduled limits, reserve status, and rest look-back windows. Recommend engaging a qualified DO or aviation compliance consultant before enforcement mode is enabled.

---

## 12. Red Team

- **RT1 (Regulatory — UNRESOLVED, do not build Part 135 enforcement gates without legal review):** The doc currently contains a contradiction that must be resolved before the Sunday build discussion. RT1's stated mitigation — "all go/no-go outputs are advisory; PIC retains final authority" — is the platform's legal defense against being regulated as an FAA-certified system. But Principle 5 and the RAAS Part 135 rules describe the opposite: FRAT is "required before flight acceptance — cannot close without signed DTC event," duty time has "hard stops — cannot dispatch pilot past FAR 135.265 limits," and OCC approval is "required — dispatch cannot accept without rules-engine verification." Those are enforcement mechanisms, not advisory outputs. The competitive table markets "verified go/no-go" as the advantage over incumbents — "advisory" and "verified" are not the same claim. **The "advisory only" defense does not hold up if the system is also described as blocking actions in three places in the same document.** This is a product decision requiring aviation counsel before any Part 135 enforcement gate is built: either (a) every hard stop gets a logged, identity-anchored override path for an authorized human — making it genuinely "advisory with enforcement teeth" and aligning marketing language accordingly, or (b) the platform accepts that specific features are enforcement mechanisms, takes the heavier regulatory posture that comes with that, and plans for it deliberately. Neither is wrong. Asserting "advisory" while building blocks is.

- **RT2 (Data freshness):** If RAMCO or FVO data is the source of truth today and our system relies on pilots entering data correctly, we inherit the same error problem. — Mitigation: ADS-B Hobbs auto-read where available (Apple Watch + EFB integration spec'd in CODEX 27); structured fields prevent illegible entries; photo requirement creates verifiable evidence trail.

- **RT2a (FAR 135.265 implementation correctness — requires validation before live enforcement):** The duty-time hard stop is treated in this doc as an engineering task ("enforced — cannot dispatch pilot past FAR 135.265 limits") with no validation plan. 135.265 has real regulatory nuance: different limits for scheduled vs. unscheduled operations, rest look-back windows, reserve status handling, and edge cases that trained DOs spend time adjudicating. A bug in this gate is uniquely damaging in both directions simultaneously: wrongly blocking a legal flight fails an operator in their highest-stakes moment and erodes trust immediately; wrongly clearing an illegal one attaches a "verified" DTC record that actively documents the violation with software attestation — which is worse for the operator than today's status quo of no system watching at all. **This feature must not go live as an enforced gate without a dedicated validation pass against documented edge cases, reviewed by a qualified DO or aviation compliance consultant.** Build it; don't enforce it until it's been stress-tested against the actual regulatory text.

- **RT3 (Switching cost):** RAMCO has years of MX history. Operators won't migrate without it. — Mitigation: FVO parser already built; build RAMCO data export + import script; position as "import what you have, add what RAMCO can't give you."

- **RT4 (Go/no-go liability):** The dispatcher who previously said "yes" can blame the algorithm. — Mitigation: the Operations Worker doesn't make the decision; it surfaces the currently available data. The dispatcher still approves. The record shows the dispatcher approved with the data the platform had at that moment — which is better legal protection than "I just took the call," but only if product copy and UI avoid claiming completeness. "Pre-assembles the currently available data" is defensible. "Pre-assembles the complete picture" is a claim that raises the bar for what counts as platform failure when a source is missing. Use the weaker, accurate language everywhere.

- **RT5 (Weather source verification):** If we ever accidentally pull weather from a non-FAA source (e.g., a third-party aggregator), we're not legal for flight planning. — Mitigation: hard architectural constraint in `services/aviation/weather.js` — only `aviationweather.gov`. Document in code, enforce in RAAS rule. AvCharts similarly locked to FAA chart publications.

- **RT6 (CFI endorsement disputes):** A CFI might claim they didn't authorize a solo endorsement if the student has a accident. — Mitigation: endorsement DTC event requires CFI's Firebase Auth session + timestamp. Cannot be created by the student. Cryptographic binding makes post-hoc denial structurally impossible.

---

*Next step: complete Protean teardown Sunday. Then write CODEX 41 (med crew / patient transport layer) when the charting spec is ready. Then build Phase 1 (CoPilot) as the GA market entry point.*
