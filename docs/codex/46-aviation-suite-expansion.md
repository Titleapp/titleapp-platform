# CODEX 46 — Aviation Suite Expansion: Training, MX Deep Dive, Dispatch Taxonomy, and Long Game

**Status:** 🟡 Spec — Protean access live 2026-07-20
**Expands:** CODEX 40 (Aviation Workspace)
**Owner:** Sean Combs (ATP, PC-12/47E)
**Key design partner:** Eric Altshuler (Top Gun, Federal/military, Airlines — Part 121)
**Date:** 2026-07-20

---

## 0. Full Suite Taxonomy

CODEX 40 defined three workers. The full Aviation vertical is five suites, each a group of workers:

| Suite | Workers | Primary replacement |
|---|---|---|
| **CoPilot** | CoPilot (core) + type-specific injections | ForeFlight + FVO pilot dashboard |
| **MX** | MX Worker | RAMCO + paper logbook |
| **Training** | Certificate workers (PPL → ATP-CTP) + Recurrent/Line Check | Protean + paper training folders + Excel tracking |
| **Dispatch / Operations** | Dispatch (by op type: 61/141, 91, 135, 121) + Studio Locker | Protean + EMS Manager + FVO Schedule + GOM consultants |
| **Type Injections** | Per-aircraft-type context cards (737, 152, PC-12 NG, etc.) | Type-specific POH on iPad + memory |

The type injection is not a standalone suite — it's a plugin that extends CoPilot with aircraft-specific rules, limitations, and performance data. One CoPilot core, infinite type extensions. The rules engine loads the right type card at flight assignment time.

---

## 1. The Training Suite

### What it is

The same append-only, chain-anchored record substrate as Makai nursing — but for FAA-regulated pilot training. Each training event is an immutable DTC: who trained, who signed off, what was completed, to what standard, on what date and aircraft.

The Training Suite covers two categories of training records:

**A. Initial certificate ladder (earn the rating)**

| Certificate | FAR Part | Key records |
|---|---|---|
| Student pilot | 61.87 | Medical, first solo endorsement, area endorsements |
| Private (PPL) | 61.109 | Flight hours, XC, night, instrument (3hr), stage checks, checkride endorsement |
| Instrument (IR) | 61.65 | Instrument hours, approaches, holds, simulator, checkride endorsement |
| Multi-engine (MEL) | 61.63 | Multi-engine hours, endorsement or checkride |
| Seaplane (SES/MES) | 61.63 | Seaplane-specific endorsement |
| Commercial (CPL) | 61.129 | Commercial hours (250 total), complex, checkride |
| Rotor — Private | 61.109 | Helicopter-specific hour reqs |
| Rotor — Instrument | 61.65 | Helicopter instrument reqs |
| Rotor — Commercial | 61.129 | Helicopter commercial |
| Rotor — Multi-engine | 61.63 | Multi-engine helicopter endorsement |
| ATP | 61.159 | 1500 hours, ATP-CTP course, airline transport checkride |
| ATP-CTP | 61.156 | 30-hour ground + sim course required before ATP checkride — **separate record type** |
| CFI | 61.183 | CFI checkride, FOI knowledge test |
| CFII | 61.187 | Instrument instruction endorsement |

**B. Recurrent training (keep the currency)**

Professional pilots do not complete training once — they repeat it on a schedule. This is where the Training Suite is most valuable for Part 135/121 operators and where paper/spreadsheet tracking breaks down.

| Recurrent type | Cadence | Who | What it produces |
|---|---|---|---|
| **Line check / Proficiency Check (PC)** | 12 months min (Part 135); 6 months (Part 121); many Part 135 ops voluntarily do 6 | All Part 135/121 pilots | Signed check event, currency reset, DTC anchored |
| BFR (Biennial Flight Review) | Every 24 months | All pilots (Part 91 minimum) | CFI sign-off, DTC event |
| IPC (Instrument Proficiency Check) | As needed (after lapse) | Instrument-rated pilots | CFII sign-off, DTC event |
| Type recurrent (sim) | 12 months (Part 135 standard) | Type-rated pilots | Sim center sign-off, type currency reset |
| Night currency | Rolling 90 days | Any pilot conducting night flight | Auto-computed from logbook entries — no separate event |
| Medical | 1st class: 12mo/6mo by age; 2nd: 24mo; 3rd: 60mo | All pilots | Medical certificate scan → DTC |

### Line Checks — Why They Matter

Line checks (also called Proficiency Checks or PCs) are distinct from initial checkrides:

- **Part 121**: every 6 months, administered by an FAA-designated check airman or inspector; results go into the airman's official record
- **Part 135**: every 12 months minimum (many operators do 6); administered by company check airman; recorded in company training records and PRIA (Pilot Records Improvement Act) file
- **ATPs/type-rated pilots**: simulator events typically satisfy the PC requirement but the record must be formal
- **The paper problem**: line check records today = PDF form + filing cabinet. The PRIA database is where they live officially. If a pilot is hired and the new employer can't reach the prior employer's training department, they get nothing. SOCIII line check records follow the pilot, consent-gated, regardless of employer.

**The chain anchor on a passed line check is more defensible than a paper PC form.** If a certificate action follows an accident, the NTSB can retrieve the cryptographically signed record of every line check that pilot completed, including who administered it, what aircraft/sim they were in, and what date/time the check event was recorded. That's a completely different legal posture than "we keep records and we're pretty sure we have them."

### Eric Altshuler Angle on Training Records

Eric brings three distinct aviation contexts:

1. **Top Gun (military)**: Naval aviation uses the most rigorous training record systems in the world (NATOPS qualifications, carrier quals, weapons qualifications). Every event is documented and verified. Eric immediately understands why the GA/Part 135 paper system is embarrassingly inadequate by comparison.

2. **Federal/military aviation more broadly**: Government aviation operations (CBP, Coast Guard, federal law enforcement) have their own training record requirements that don't integrate with civilian FAA systems. A pilot moving from military to civilian doesn't have a clean record transfer path. This is an underserved market.

3. **Airlines (Part 121)**: Part 121 training programs are very mature — Advanced Qualification Programs (AQP), Evidence-Based Training (EBT), Continuous Improvement Programs. Airlines actually have decent training record systems (some use CORRIDOR or similar). Eric knows what "good" looks like here and can red-team our Training Suite against that standard.

Eric should be involved in the Part 135 and Part 121 Training Suite spec before it's built. His input on what military MX record-keeping looks like would directly inform the MX Worker.

---

## 2. MX Deep Dive (the knowledge gap)

Sean is a pilot, not an A&P mechanic. This section is the brief a non-MX person needs to understand what the MX Worker is actually tracking and why.

### The Regulatory Framework

| Regulation | What it covers |
|---|---|
| **FAR Part 43** | Who may perform maintenance, preventive maintenance, alterations; record-keeping requirements; return to service (RTS) |
| **FAR Part 65** | A&P mechanic certificates (Airframe + Powerplant); Inspection Authorization (IA) |
| **FAR Part 91.409** | Inspection requirements: annual (12mo), 100-hour (for hire), progressive inspection programs |
| **FAR Part 135.411–435** | Air carrier maintenance: Part 135 operators must have an approved maintenance program; MEL required |
| **FAR Part 121.363–374** | Airline maintenance: the most rigorous; Continuous Airworthiness Maintenance Programs (CAMP) |
| **FAR Part 145** | Certificated Repair Stations (CRS): organizations authorized to perform maintenance on aircraft for hire |
| **FAR Part 39** | Airworthiness Directives (ADs): mandatory compliance orders issued by FAA when a safety defect is found |

**Key rule for records (Part 43.9 and 43.11):** Every maintenance, preventive maintenance, rebuilding, or alteration performed on an aircraft must be recorded. The record must include: description of the work, date of completion, aircraft total time, name + certificate number + signature of the person who performed/approved the work. No record = the work didn't happen legally.

### The Three Certificates That Matter for MX Workers

**A&P Mechanic** — Can perform and sign off most maintenance on the airframe (Airframe rating) or engine/propeller (Powerplant rating). Cannot approve an aircraft for return to service after a major repair or alteration.

**Inspection Authorization (IA)** — An A&P mechanic with additional FAA authorization. Can perform and approve annual inspections, return aircraft to service after major repairs/alterations, approve field approvals (Form 337). Required for annual inspections. The IA is the gate for airworthiness sign-off.

**Certificated Repair Station (CRS / Part 145)** — An organization (not a person) authorized to perform specific maintenance. Airlines and large operators use CRS shops for heavy maintenance.

**What this means for the MX Worker:** Every logbook entry needs to capture which certificate type performed the work. An A&P can sign off a 100-hour inspection. Only an IA can sign off an annual. Only a CRS or IA can sign off a major repair. The rules engine needs to enforce this — a 100-hour sign-off by someone without an A&P, or an annual by someone without an IA, makes the aircraft legally unairworthy even if the work was perfect.

### What Gets Tracked

**Component life tracking — three types:**

| Type | What it means | Example |
|---|---|---|
| **Hard time** | Component must be overhauled or replaced at a specific interval regardless of condition | Engine TBO (Time Between Overhaul): PT6A-67P = 3,600 hours; calendar life limits on some components |
| **On condition** | Component is inspected at intervals; replaced when it shows wear beyond limits | Most airframe components; some avionics |
| **Condition monitoring** | No fixed interval; continued in service as long as monitoring data shows acceptable trends | Turbine engine health monitoring (trend analysis of oil consumption, exhaust gas temp) |

**Key records the MX Worker tracks:**

| Record | What it is |
|---|---|
| **TTAF** | Total Time Airframe — the aircraft's total accumulated flight hours since manufacture. Never resets. |
| **TSMOH / SMOH** | Time Since Major Overhaul — engine hours since last major overhaul. Resets at overhaul. |
| **TSN** | Time Since New — used for components that have never been overhauled |
| **Cycles** | Pressurization cycles (for pressurized aircraft), landing cycles (for landing gear), start cycles (for engines). Some limits are cycle-based not hour-based |
| **AD compliance** | Airworthiness Directives — mandatory FAA orders. Some are one-time ("do this once"), some are recurring ("check every 100 hours"), some are immediate ("ground the aircraft now") |
| **SB compliance** | Service Bulletins — manufacturer-issued maintenance guidance. Optional unless incorporated into an AD, but often required by insurance and Part 135 programs |
| **Annual inspection** | Required every 12 calendar months by an IA. Must be recorded in aircraft logbook |
| **100-hour inspection** | Required every 100 hours for any aircraft used for hire (flight instruction, Part 135). Similar scope to annual |
| **Form 337** | FAA form for major repairs and alterations. Submitted to FAA, copy kept in aircraft records. Required for things like: avionics install, structural repair, engine modification |
| **8130-3** | FAA Airworthiness Approval Tag. Issued by an approved manufacturer or repair station to certify that a part is airworthy. Required on new/overhauled parts when installed. The paper trail for part traceability |

### The AD Problem (Why AI Helps Here)

Airworthiness Directives are published by FAA at rgl.faa.gov. There are tens of thousands of them. For any given aircraft, the relevant ADs depend on: make, model, engine type, serial number range, avionics installed, and modification status.

**Current reality for most operators:** Their A&P checks the FAA website manually. Some use a paid service like AC-U-KWIK or CAMP to track ADs for their fleet. Small operators do it with a spreadsheet. Nobody does it well.

**What the MX Worker can do:** Given the aircraft's type, serial number, engine type, and installed equipment (from the Aircraft DTC), automatically pull the applicable AD list from the FAA database, cross-reference against the aircraft's compliance records, and surface: (a) ADs not yet complied with, (b) recurring ADs coming due, (c) ADs that became effective after the last compliance check. This is AI-assisted research, not AI decision-making — the IA still reviews and signs off.

**The liability posture:** The system doesn't certify airworthiness. It surfaces what the FAA database says is applicable. The qualified mechanic makes the determination. This is "advisory with records" — the same posture as the dispatcher go/no-go model.

### MX Software Landscape

| System | Who uses it | What it does | Where it breaks |
|---|---|---|---|
| **RAMCO** | Part 135/121 operators, large corporate | Fleet MX, journey log, discrepancy tracking, crew | Paper logbook still master record; no FVO/dispatch sync; expensive; single point of failure (Guardian 2021) |
| **CAMP Systems** | Turbine operators (PC-12, jets) | Tracking compliance for turbine aircraft; CAMP subscription required | Expensive; read-only for pilots; no dispatch connection |
| **Flightdocs** | Charter operators, corporate | Cloud MX for GA/charter; good UX | Limited Part 135 compliance tools; no AI |
| **ATP (Avtrak)** | Airlines, large corporate | Enterprise MX | Not for smaller operators |
| **MaintainX** | General industry MX | Work orders, checklists | Not aviation-specific; no FAA awareness |
| **Paper logbook + Excel** | Most of GA, small Part 135 | "Works" | Everything CODEX 40 documents about Guardian 2021 |

**SOCIII entry points:** 
- New Part 135 operators who haven't committed to RAMCO yet (switching cost is zero)
- Operators post-Guardian-2021-equivalent incident (data loss is the fear that opens the conversation)
- PC-12 / turbine GA owners who are currently on CAMP but want MX + dispatch in one system

### MX Worker Capability Expansion (beyond CODEX 40)

CODEX 40 specifies 5 tabs for the MX Worker. Additional capabilities needed:

**AD/SB Tracker tab** (new):
- Pulls applicable ADs from FAA rgl.faa.gov by aircraft type + serial number range
- AI categorizes: one-time vs. recurring; grounding vs. airworthy-with-compliance
- Status per AD: complied (with event reference) / due soon / overdue / not applicable (with IA note)
- SB tracking: manufacturer SBs marked optional vs. incorporated-into-AD vs. insurance-required
- Alert when a new AD is issued that applies to an aircraft in the fleet

**Parts Traceability tab** (new):
- 8130-3 tag photo attached at part installation
- Part number, serial number, TSN/TSO at install, source (manufacturer/CRS/overhauled)
- Required for airworthiness documentation, resale, and insurance claims
- Chain-anchored: the 8130-3 event is immutable; if a part is removed and replaced, a new event records the old part out and new part in

**Form 337 Register tab** (expansion):
- List of all major repairs/alterations on the aircraft
- Each 337 scanned and linked from DTC
- FAA submission status tracked
- AI flags: when a proposed repair would require a 337 (vs. an IA sign-off being sufficient)

---

## 3. Dispatch Suite — Broken Down by Operation Type

CODEX 40 describes the Operations Worker generically. The Dispatch suite needs to be differentiated by FAA operation type because the rules, record-keeping requirements, and user personas are materially different.

### Dispatch Worker — Part 61/141 Flight School

**User:** Flight school administrator, chief CFI, front-desk scheduler
**What's different:** No commercial operations; no duty time enforcement; student scheduling is the core function

Key capabilities:
- Aircraft scheduling by student + CFI + aircraft (prevents double-booking, 100-hr tracking)
- CFI availability calendar (when is CFI available, what students are they signed off to teach)
- Student progress dashboard (where is each student in the syllabus — connects to Training Suite)
- Endorsement gate: system blocks a student solo flight if the CFI endorsement DTC doesn't exist for that aircraft + area
- 100-hour enforcement: aircraft cannot be scheduled for hire (instruction) when 100-hr is within 5 hours
- Stage check scheduling: schedule the next stage check based on syllabus progress

### Dispatch Worker — Part 91 Owner/Operator

**User:** Aircraft owner, flight department coordinator, personal assistant
**What's different:** No commercial operation; no duty time; simpler regulatory overhead; focus is personal scheduling + airworthiness awareness

Key capabilities:
- Trip planning: date + route + passengers → pulls weather, NOTAMs, W&B, airworthiness status
- Personal schedule: block out aircraft maintenance windows, training events, planned trips
- Maintenance reminders: annual coming due, 100-hr (if rented occasionally for flight instruction), ADs
- No duty time tracking (Part 91 has none for non-commercial)
- Fuel planning + preferred FBOs

### Dispatch Worker — Part 135 Charter / Air Ambulance

**User:** Dispatcher, OCC coordinator, base manager
**What's different:** This is the highest-stakes dispatch context; duty time is legally enforced; FRAT is required; OCC approval is required; go/no-go has real legal consequences

Key capabilities (extends CODEX 40 Operations Worker):
- **Flight request intake:** incoming from hospital (air ambulance), charter client, or internal request
- **Auto-assembled crew package:** for each incoming request, the rules engine pulls:
  - Crew duty time status (how many hours available before FAR 135.265 limit)
  - Crew currency for this flight (night IFR? type rating? FRAT score for this crew?)
  - Aircraft MX status (open squawks? airworthiness current?)
  - FRAT pre-score (pre-populated from available data; pilot completes before departure)
  - Weather for the route (FAA sources; routed to PIC for go/no-go — not dispatcher's decision)
- **OCC approval gate:** dispatcher cannot release flight without completing the rules-engine checklist; each item is a logged acknowledgment, not a checkbox
- **Duty time hard stop (see RT1 from CODEX 40):** advisory with override path, identity-anchored. Do not build as silent hard block.
- **Post-flight record:** flight time, crew duty time update, patient transport record (if air ambulance), aircraft time update → all routed back to MX and Training Workers automatically

**Medevac subset:** 
- Hospital helipad database (NOTAMs + LZ conditions)
- Med crew manifest: crew role, patient weight/category (not diagnosis — HIPAA), care level
- Transport record: connects flight to hospital billing (the Protean gap)
- Response time tracking: request → dispatch → wheels up → landing → patient offload

### Dispatch Worker — Part 121 Airline

**User:** Licensed dispatcher (Part 121 requires a certificated dispatcher — FAR 65.51+)
**What's different:** The most regulated dispatch context; dispatchers are legally co-responsible for the safety of the flight (joint release authority with PIC); airlines have ACARS, OCC, sophisticated systems already

**Honest assessment for the near term:** Part 121 is not the right first market. Airlines have ACARS, OCC systems, ALPA, and contractual crew scheduling software (Sabre, Jeppesen, etc.). Switching cost is enormous, regulatory burden for the platform would be significant, and Eric's inside knowledge confirms this. However, the **long game is clear:**

As the platform matures and drone operations become routine, the line between "dispatching a crewed aircraft" and "dispatching an autonomous aircraft" blurs. The rules engine that enforces Part 135 dispatch compliance is the same substrate that can enforce UAM/UAS dispatch compliance. Building toward Part 121 standards from the start means the drone dispatch layer inherits a defensible regulatory posture rather than building it from scratch.

For now: **build Part 135, design for Part 121 later, architect for drone from day one.**

---

## 4. Studio Locker — FAA Document Generator

CODEX 40 calls this "Compliance Documents Worker." The right user-facing name is **Studio Locker** — consistent with the platform's content generation pattern (SOCIII Build → Studio Locker is the FAA document output layer).

Studio Locker generates and maintains the regulatory document stack required to hold and operate under an FAA operating certificate. It is not a template filler — it generates documents pre-populated with the operator's actual data from their configuration, cross-referenced against current FARs.

| Document | Who needs it | How Studio Locker generates it |
|---|---|---|
| **GOM** (General Operations Manual) | Part 135 required | From operator config: company name, aircraft list, bases, operation type, crew roster → AI drafts; DO reviews + identity-signs |
| **SOP** (Standard Operating Procedures) | Part 135 standard | AI synthesizes from GOM + manufacturer guidance + NTSB recommendations; operator customizes |
| **MEL** (Minimum Equipment List) | Part 135 required | Starts from MMEL (FAA master MEL for the aircraft type); operator customizes; FSDO submission package |
| **Ops Specs** | Issued by FSDO, but operator prepares the package | Studio Locker prepares the amendment package when fleet/base/operation changes |
| **Training Curriculum** | Part 135/141 required | From training ladder configuration; auto-aligned to FAR requirements |
| **Ground School Materials** | Part 141 optional | AI-generated from training curriculum; compliant with 141 appendix requirements |

**Data source licensing — four categories, different legal posture:**

Every source in Studio Locker falls into one of these categories. Build and market accordingly.

| Category | Sources | Posture |
|---|---|---|
| **Public domain** | CFRs, ACs, FAA Orders, AIM, ADs, NTSB reports | US government works — free to ingest, index, redistribute. No restrictions. |
| **Manufacturer-copyrighted** | POH/AFM, Type Certificate Data Sheets (partially) | NOT government works — copyrighted by Pilatus, Cessna, Bell, etc. Legal theory: operator already holds a licensed copy; SOCIII indexes their copy for their own use only. Do NOT build a cross-tenant searchable POH library from uploaded documents. Each POH is scoped to the uploading tenant. |
| **Commercial API — agreement required** | Protean, Signature/Avfuel FBO fueling, CAMP-adjacent AD tracking | Third-party commercial products. SOCIII needs a commercial API agreement with each vendor before building an integration. This is a business-development prerequisite, not an engineering task. Do not build the connector until the agreement exists. |
| **Restricted federal access** | DOT Drug/Alcohol Clearinghouse (49 CFR Part 40), FAA PRD (Pilot Records Database) | Access limited to designated employer representatives with specific registration and query authorization from the relevant federal agency. Requires a formal administrative relationship — not just a technical connector. Flag as legal/compliance prerequisite before building. |

**The identity gate before any FSDO submission** is load-bearing (from CODEX 40, Principle — identity-anchored approval required). An AI-drafted GOM submitted to the FSDO without a DO sign-off is not better than copy-paste; it's the same failure mode with a less accountable author. Every document must show a human review DTC event before it can be marked submission-ready.

**FAA regulatory library — required in every Studio Locker:**

The Studio Locker is not just a document generator. It is also the operator's AI-searchable regulatory library. Every relevant CFR and FAA publication must be ingested, version-tracked, and surfaced in context. This is the "Content Locker" function from CODEX 40 elevated to a searchable corpus.

| Category | What's included |
|---|---|
| **Title 14 CFRs** | Part 1 (definitions), 43 (maintenance), 61 (certification — pilots/instructors), 65 (certification — mechanics/dispatchers), 67 (medical), 71 (airspace), 91 (general operating rules), 107 (UAS/drones), 119 (certification — air carriers), 121 (domestic/flag operations), 135 (commuter/on-demand), 141 (flight schools), 145 (repair stations), 183 (representatives of the Administrator) |
| **Advisory Circulars (ACs)** | All ACs applicable to the operator's certificate type. Searchable by subject. AI flags when an AC supersedes a prior version that the GOM references. |
| **Airworthiness Directives** | Per-aircraft AD library (covered in MX section — AD/SB Tracker). Also surfaced in Studio Locker for compliance document cross-referencing. |
| **Type Certificate Data Sheets (TCDS)** | Per aircraft type — defines the approved configurations, engine/propeller combinations, and limitations as certificated by FAA. Source of truth for weight limits, CG envelope, approved modifications. |
| **POH / AFM** | Pilot's Operating Handbook / Airplane Flight Manual. Operator uploads per tail; AI-indexed and searchable. Replaces "PDF on an iPad." |
| **FAA Orders** | Order 8900.1 (Flight Standards Information Management System — the FAA's own operations handbook). Relevant orders for certificate holders. |
| **AIM** | Aeronautical Information Manual — procedures, airspace rules, phraseology. Updated twice yearly; Studio Locker tracks current edition. |
| **NTSB Accident Reports** | Searchable corpus of NTSB final reports and safety recommendations. AI surfaces relevant accidents when a GOM section or procedure is being reviewed — "here are three accidents where this procedure was a contributing factor." |

**Update cadence:** CFRs and ACs are updated via the Federal Register. Studio Locker subscribes to the eCFR API and FAA AC notification system. When a referenced regulation changes, every GOM section that cites it is flagged for DO review. Operators are never surprised by a reg change that makes their documents non-compliant.

---

## 5. The Long Game — Uber Dispatch and the Drone Layer

This is the strategic frame that differentiates SOCIII from "a better RAMCO."

**The current model:** Pilots fly aircraft. Dispatchers manage them. Both are humans.

**The near-term model (2026–2030):** Same as current, with AI pre-assembling the compliance picture and reducing dispatcher cognitive load. Humans remain in every decision loop. SOCIII builds trust here.

**The medium-term model (2028–2035):** UAS (drone) operations become routine under FAA UTM (UAS Traffic Management) and BVLOS (Beyond Visual Line of Sight) frameworks. A drone operation needs everything a crewed operation needs: airworthiness verification, dispatch, route planning, weather go/no-go, post-flight records — but no physical pilot. The "dispatch" is the rules engine + a remote operator. This is the platform we're building now.

**The long-term model:** A dispatcher platform that handles crewed aircraft, advanced air mobility (eVTOL), and autonomous UAS in a unified operations center. The "Uber" analogy is exactly right: a customer submits a request (medical transport, cargo delivery, inspection flight), the platform assembles the best available resource (crewed helicopter? drone? eVTOL?), dispatches it with full compliance documentation, and closes the loop with an immutable transport record. Humans are in the loop for oversight and exception handling, not for every routine decision.

**Why build now:** Every Part 135 dispatch record we anchor today is training data for the rules engine that will manage drone dispatch tomorrow. Every IA who uses the MX Worker today is defining what "verified airworthy" means for a drone tomorrow. The moat is the records substrate and the rules engine — not the UI.

**Eric's role in the long game:** Top Gun pilots are the exact people who will run the first serious drone operations at scale. Military drone operations (MQ-9, UAVs) have already solved the command structure, rules-of-engagement, and authority hierarchy problems. The FAA is working through the same problems in civilian airspace. Eric understands both worlds.

---

## 6. Type Injection Model — How Aircraft Type Workers Work

Sean's description of CoPilot + 737 CoPilot + Cessna 152 CoPilot + PC-12 NG is the right model. Implementation:

**The base CoPilot worker** knows how to:
- Run a preflight (FRAT, weather, NOTAMs, W&B)
- Track pilot currency
- Log a flight leg
- Close a mission and generate a post-flight debrief record (auto-populated from flight data)
- Interface with MX status

**Mission close — post-flight debrief spec (derived from Protean/OASIS teardown, 2026-07-20):**

Incumbent model (Protean): transport closes → email fires to pilot → pilot opens browser → fills two separate manual forms: (1) PTD (Post Transport Debrief) with transport type, disposition, dispatcher name, standby, ETA, and a CAD-assembled comm-log block; (2) FOQA (Flight Operations Quality Assurance) — literally 4 binary questions: non-typical ops? refueled? deviation from route? submit QMR? — plus a remarks field. Both end with a QMR yes/no. Total pilot time: 10–15 minutes of manual re-entry of data the CAD system already has.

**The "OTHER" data quality problem:** Because pilots fill these forms from memory against dropdown lists that don't match real operations, "OTHER" is the most frequent answer category across both forms. The result: a database the analytics layer can't use. Safety directors review a monthly Excel export. No real-time patterns. The compliance posture is "we collected a debrief" — not "we analyzed the data."

**CoPilot debrief model:**

At mission close, CoPilot surfaces one debrief card (push notification, not email + browser). Pre-populated from the mission DTC:
- Aircraft tail, type, base
- Crew names (pilot, medical crew, dispatcher)
- Origin → destination, wheels-up/wheels-down timestamps
- Actual METAR at both airports at time of flight (live weather APIs)
- Fueling event if logged during flight (FBO name, airport ID, fuel type auto-filled)
- Route deviation (auto-compared against filed vs. flown if ADS-B data available)

FOQA answers pre-populate: refueled → from fueling DTC; deviation → from route comparison; pilot flips defaults only if something changed. Pilot reads, adds one line of remarks if warranted, approves. 90 seconds. If QMR = Yes, Alex opens a quality DTC pre-filled from mission data — pilot adds event description, approves. Chained to the flight DTC; supervisor sees it in their review queue immediately.

**Design rule (enforced by this spec):** Never ask a pilot to answer a question the flight record already knows. Pre-fill from data; require confirmation only. Free text beats dropdowns for non-pre-fillable fields — free text is AI-analyzable; "OTHER" noise is not.

**A type injection card** (`typeDTC/{icaoTypeCode}`) adds:
- The specific V-speeds, limitations, and performance tables for that type
- Type-specific FRAT items (single-engine turboprop risk profile vs. twin jet; FIKI vs. no-FIKI)
- Type-specific currency requirements (PC-12 LifeFlight recurrent profile is different from generic PC-12 Part 91)
- POH/AFM reference links from Vault
- Type-specific checklist library
- Any type-specific RAAS rules (e.g., PC-12 pressurization ceiling rule, 737 ETOPS rule)

**Initial type cards to seed (priority order):**
1. PC12 (Sean flies it; medevac market; unique pressurized single-engine turboprop profile)
2. C172 (most common training aircraft; flight school market entry)
3. B737 (Eric's airline background; most common airliner worldwide)
4. R44 / R22 (Robinson helicopter; most common rotor training platform)
5. AS350/H125 (Airbus H125 — most common EMS helicopter in North America; required for Plugin A medevac demo)
6. BE58 (Baron; common multi-engine training + charter)
7. A320 (Airbus; second most common airliner; Eric can validate)

**PC-12 NG type card specifics:**
- Engine: PT6A-67P (3,600hr TBO — hard time)
- Max gross weight: 10,450 lbs (no type rating required under FAR 61.31 (below 12,500 lbs, non-turbojet). Many Part 135 operators voluntarily apply type-rating-level proficiency standards — this is an operational choice, not a legal requirement. The rules engine must NOT flag the PC-12 as requiring a type rating.)
- Pressurization: max differential 6.0 PSI; ceiling 30,000 ft
- FIKI: full de-ice equipped
- Key ADs: Pilatus issues SBs regularly; several recurring ADs on landing gear and fuel system
- TOLD performance: Pilatus has a published TOLD app; we interface with that data model

---

## 7. Wearables — Stubbed for All Three Worker Groups

Wearables are a first-class input/output surface for aviation — not a nice-to-have. The data substrate (DTC events) is already wearable-ready. What needs to be stubbed now so the architecture doesn't foreclose it:

**For pilots (Apple Watch / future aviation-specific wearables):**
- Currency alerts on wrist: medical expiring in 30 days, BFR due next month, type recurrent overdue — no app-open required
- Hobbs auto-read: Apple Watch GPS + motion can detect engine start/stop events and propose a logbook entry pre-filled with date, duration, and aircraft (confirmed by pilot before DTC write)
- FRAT push: at shift check-in, Watch prompts FRAT completion if not done in the last 2 hours
- Go/no-go summary: preflight completed → Watch confirms green/yellow/red before pilot walks to the aircraft
- Inflight alerts: duty time warning (X hours remaining) pushed to Watch during flight
- **Fatigue biometric input (future):** HRV (heart rate variability) and sleep data from Watch as an optional FRAT input — pilot chooses to share. Not enforced; advisory. The system notes if a pilot's biometrics suggest fatigue at dispatch time. This is the long-game UAS application — automated systems can't fake fatigue data.

**For MX technicians (Apple Watch / hands-free wearables):**
- Hands-free squawk documentation: tech's hands are on the aircraft; Watch mic captures voice description → AI transcribes and pre-fills squawk form → tech taps approve on Watch face → DTC event queued for photo attachment when hands are free
- Part call-out: "Hey, what's the part number for the PC-12 fuel cap seal?" — answered on Watch without leaving the aircraft
- RTS notification: MX manager receives RTS approval request on Watch → reviews photo on phone → approves or rejects on the phone (Watch surfaces the notification and photo preview only — the actual identity-anchored approval tap happens on the primary device per the general rule above)
- AD compliance check: tech can ask Watch "is this AD complied with on N662LF?" before starting the work

**For dispatchers:**
- Incoming flight request push: Watch vibrates when new request comes in, shows crew/aircraft status at a glance
- Duty time warning: Watch alerts when a crew member is within 1 hour of their duty limit — dispatcher doesn't need to be watching the screen
- RTS alert: Watch notifies when an aircraft clears maintenance and becomes available

**Architecture stub:** All wearable interactions are thin clients that read from and write to the same DTC event store. No wearable-specific data model needed. The Watch app surfaces read views and initiates event proposals; the user confirms on the primary device (phone/tablet) before anything is written. This prevents a Watch-tap from creating an unintended logbook entry.

**Build order:** Wearables are Phase 4+ — do not build before core workers are shipped. But the API surface (`POST /v1/aviation/event:propose`, `GET /v1/aviation/currency/{pilotId}`) should be designed wearable-first from the start so nothing has to be retrofitted.

---

## 8. Fueling Processes

Fueling is not a Part 121 concern (airlines have dedicated fueling crews, contracts, and audit systems). But for Part 91, 135, and Part 61/141 flight schools, fueling is a significant safety and compliance gap that no current platform addresses well.

**Why fueling matters:**

Misfueling (Jet-A into a gasoline engine, or avgas into a turbine) is a recurrent accident cause. Water contamination in fuel is another. The paper trail for fueling is typically: an FBO receipt, sometimes a fuel log on a clipboard. If an accident follows, reconstructing exactly what was in the tanks at departure is difficult.

**What the Fueling record needs to capture:**

| Field | Why |
|---|---|
| Fuel type | 100LL (avgas) vs. Jet-A vs. Jet-A+FSII vs. 100 (no longer common). Aircraft DTC specifies approved fuel type — system flags if fueling record doesn't match |
| Quantity added (gallons) | Cross-checked against W&B — can't have more fuel than the tanks hold |
| Fuel truck / FBO / pump ID | Traceability if contamination is later found |
| Sump results | Sump (drain a sample from each low-point) performed before flight — clear and bright (no water/sediment) or anomaly noted |
| Temperature + specific gravity | For accurate density calculation (especially relevant for turbines) |
| FSII added | Fuel System Icing Inhibitor (Prist) — required by some POHs in cold weather ops; must be the right concentration |
| Fueler identity | Who performed the fueling (FBO employee, pilot, or self-service) |
| Photo | Fuel caps secure post-fueling; fuel quantity visible on sight gauges |

**Fueling DTC event type:** `aircraft_fueling` — appended to the aircraft's DTC events subcollection, timestamped, identity-anchored. Immutable. Cross-referenced at preflight go/no-go: if no fueling record exists since the last flight and fuel quantity has changed, the system flags for confirmation.

**Fuel farm management (Part 135 remote ops):**
Some Part 135 operators (medevac at remote bases, charter with fuel caches) manage their own fuel supply. This adds:
- Fuel inventory: gallons on hand per location, resupply schedule
- Contamination testing log: ATA 100 microbial/water testing at defined intervals (especially for Jet-A stored more than 90 days)
- NFPA 407 compliance records: fueling procedures, bonding/grounding equipment inspection, fire extinguisher currency
- These are Part 135 GOM requirements — Studio Locker generates the fueling SOP section from the operator's fuel farm configuration

**Flight school (Part 141/61) fueling:**
- Schools with their own fuel (common for 100LL) need the same contamination testing and inventory records
- CFI endorsement for student solo includes confirming the student is trained on proper fueling and sump procedures for the aircraft type — this becomes a training record DTC event

**Rule cross-reference:** FAR 91.9 (weight and balance), FAR 91.103 (preflight action), and POH limitations section all bear on fueling. Studio Locker cross-references fueling SOP against current regs automatically.

---

## 9. Human Certification Registry — Pilots, MX, and Dispatch

Every human in the aviation system holds one or more FAA certificates. Tracking certificate currency is currently fragmented across: the FAA Airmen Registry (public, searchable), employer HR files, physical wallet cards, and the pilot's personal logbook. No system ties them together in real time.

**The chain-anchored certification registry is the PRIA replacement — and potentially the FAA Medical system replacement.** See Section 10.

### Pilot Certificates and Currency

| Certificate / Rating | Issuing authority | Currency requirement | DTC record type |
|---|---|---|---|
| Student Pilot Certificate | FAA | Valid until age 71 (then every 2 years) | Certificate scan + DTC event at issue |
| Private Pilot Certificate | FAA | No expiration — but must be current to exercise privileges | Certificate scan |
| Commercial Pilot Certificate | FAA | No expiration | Certificate scan |
| ATP Certificate | FAA | No expiration | Certificate scan |
| Type Rating | FAA | No expiration but currency requires recurrent training | Certificate scan + recurrent DTC events |
| Instrument Rating | FAA | No expiration but currency (IPC) lapses | Certificate scan + IPC DTC events |
| Multi-Engine Rating | FAA | No expiration | Certificate scan |
| CFI Certificate | FAA | **Expires every 24 months** — must be renewed by FIRC or checkride | Certificate scan + renewal DTC events |
| CFII Certificate | FAA | Same as CFI | Certificate scan |
| Flight Engineer Certificate | FAA (legacy) | No expiration | Certificate scan |
| Remote Pilot Certificate (Part 107) | FAA | Recurrent knowledge test every 24 months | Certificate scan + test DTC event |
| Medical Certificate — 1st Class | FAA AME | Under 40: 12mo ATP, 60mo 2nd class privileges; Over 40: 6mo ATP, 12mo commercial, 60mo recreational | Scan + expiry date tracked |
| Medical Certificate — 2nd Class | FAA AME | 12mo commercial privileges, 60mo recreational | Scan + expiry date |
| Medical Certificate — 3rd Class | FAA AME | Under 40: 60mo; Over 40: 24mo | Scan + expiry date |
| BasicMed | AOPA / FAA | Physician exam every 48mo + online course every 24mo | DTC events for each component |
| BFR (Biennial Flight Review) | Any CFI | Every 24 calendar months | CFI identity-anchored DTC event |
| IPC (Instrument Proficiency Check) | CFII | After instrument currency lapses | CFII identity-anchored DTC event |

### MX Certificates

| Certificate | Issuing authority | Notes |
|---|---|---|
| A&P — Airframe | FAA | No expiration; currency maintained by active practice |
| A&P — Powerplant | FAA | No expiration |
| Inspection Authorization (IA) | FAA | **Renews annually** — must be exercised (perform at least one annual inspection per year) or lapse |
| Repairman Certificate | FAA | Issued for specific aircraft (amateur-built) or specific employer (Part 135 MX) |
| Part 145 CRS Certificate | FAA | Issued to organization; specific ratings per capability |
| Drug/Alcohol Testing Program | DOT/FAA | Required for all safety-sensitive MX personnel at Part 121/135 operators (Part 120) |

**IA annual renewal** is the most commonly missed certification expiry in GA MX. An IA who misses their annual renewal cannot perform annual inspections — any aircraft they signed off is technically in question. The MX Worker must track IA renewal dates and alert 60 days in advance.

### Dispatch Certificates

| Certificate | Issuing authority | Notes |
|---|---|---|
| Aircraft Dispatcher Certificate | FAA (Part 65 Subpart C) | **Required for Part 121 operations.** Not required for Part 135 but many operators use certificated dispatchers. Knowledge test + practical test. No expiration but proficiency requirements. |
| Drug/Alcohol Testing | DOT/FAA | Required for Part 121 dispatchers (Part 120) |

### Drug and Alcohol Testing Records (Part 120)

Part 121 and 135 operators must maintain a DOT-compliant drug and alcohol testing program for all safety-sensitive employees (pilots, mechanics, dispatchers). Records must be kept for 5 years. Testing results must be available to subsequent employers via DOT Drug and Alcohol Clearinghouse.

This is a standalone record type in the certification registry — not part of the pilot logbook. Identity-anchored, immutable, consent-gated for employer access.

### HAZMAT Training

Any employee who handles dangerous goods (lithium batteries, medical oxygen, dry ice, firearms) must complete HAZMAT training per 49 CFR Part 172 Subpart H. Recurrent every 3 years. Applies to: flight crew carrying passenger medical equipment, cargo operations, flight schools handling batteries.

---

## 10. The Chain-Anchored Pilot Record — PRIA Replacement and FAA Medical Layer

This is the biggest strategic bet in the aviation platform.

### PRIA Today (Why It's Broken)

The Pilot Records Improvement Act (49 U.S.C. § 44703(h)) requires air carriers and Part 135 operators to request training records, drug/alcohol records, and employment history from a pilot's prior employers before hiring. The intent: prevent pilots with problematic records from moving between operators without scrutiny.

**The reality:**
- Requests go by mail or fax to prior employers' HR departments
- Prior employers have 30 days to respond — and frequently don't
- Records are paper or PDFs in filing cabinets
- Employers with poor HR practices literally cannot locate records from 5 years ago
- The FAA PRIA portal (PRD — Pilot Records Database) is mandatory for Part 121 operators as of 2021 but Part 135 compliance is incomplete
- A pilot who changes employers 4 times in 8 years leaves a fragmented record trail that no single entity can reconstruct

**SOCIII's position:** Every training event, line check, recurrent event, and logbook entry that happens in SOCIII is already a chain-anchored DTC event tied to the pilot's identity. If a pilot has used SOCIII for 3 years across two Part 135 operators, their complete record — with cryptographic proof of authenticity and a full chain of custody — is instantly available to the next employer, with the pilot's explicit consent.

This is not a replacement for the FAA PRD (which is federally mandated). It is a portable, cryptographically verified supplement that makes PRIA compliance instant for operators who use SOCIII, and gives pilots a genuine portable record of their career.

### The FAA Medical System — Why On-Chain Makes Sense

The current FAA medical system:
- Pilot sees an Aviation Medical Examiner (AME)
- AME submits exam data to FAA Civil Aerospace Medical Institute (CAMI) in Oklahoma City
- FAA issues a paper medical certificate (wallet card)
- Pilot carries the card; no digital verification exists
- If a pilot is medically decertified, revocation is not instant — there is a lag between revocation and the pilot's knowledge

**What on-chain adds:**
- Medical certificate issuance becomes a DTC event: AME identity-anchored + date + certificate class + expiry
- Medical status is instantly verifiable by an employer or dispatcher at preflight — no phone call to CAMI
- Revocation is an event appended to the chain — instantly visible to any system that checks currency status
- BasicMed components (physician exam + online course) are naturally DTC events already

**Critical constraint:** SOCIII cannot replace the FAA's authority to issue medical certificates. What it can do is create a parallel chain-anchored record that pilots consent to share, which makes verification instant. The FAA remains the authority; SOCIII provides the infrastructure. This is the same model as county title records — the county is the authority, SOCIII provides the append-only record layer.

**The long game:** As the FAA modernizes (they are actively working on digital pilot certificates through the MOSAIC rulemaking), SOCIII's chain-anchored pilot record becomes the natural home for the digital certificate. Getting there requires a regulatory relationship with the FAA — likely via the Aviation Rulemaking Advisory Committee (ARAC) or a specific pilot program with a cooperating FSDO.

### What to Build Now vs. Later

**Build now (no regulatory approval needed):**
- Certificate scan → DTC event (pilot uploads their certificate, AI extracts key fields, event is anchored)
- Currency tracking based on certificate data + logbook events (already partially built)
- Employer consent flow: pilot grants a Part 135 operator access to their SOCIII record for PRIA purposes
- Medical expiry tracking and alerts

**Build later (requires regulatory engagement):**
- Direct AME → SOCIII integration (AME submits exam to SOCIII as well as CAMI)
- FAA PRD API integration (when FAA exposes one — currently Part 121 operators access PRD directly)
- Digital certificate verification for dispatch go/no-go (requires FAA acceptance of digital verification)

---

1. **Protean integration depth** — Protean is live today (2026-07-20). What does Protean expose? API, export files, webhook? This determines whether the Operations Worker integrates with Protean or replaces it for new operators.

2. **Training Suite as Part 141 pitch** — The training record substrate is identical to Makai nursing. Should the same "Business in a Box for Schools" pricing apply to flight schools ($99/mo + $5/active student)? Flight schools have 10–50 active students at any time — that's the same revenue model.

3. **Line check records + PRIA** — The Pilot Records Improvement Act (PRIA) requires employers to request training records from prior employers before hiring. If a pilot's line check records are in SOCIII, can we make PRIA requests automatic? This is a significant product feature for Part 135 hiring managers.

4. **MX Worker for GA solo owners** — CAMP is the dominant turbine MX tracking tool. PC-12 owners on CAMP pay ~$300–600/year just for tracking. SOCIII MX Worker as a CAMP alternative for single-aircraft owners is a direct addressable segment. What would it cost to build the PC-12 AD/SB database specifically?

5. **Eric as creator / design partner** — What is the right structure for Eric's involvement? Creator (builds an aviation worker on the platform)? Advisor (RSPA for Part 135/military input)? Design partner (paid for specific spec work)? His Top Gun + airline background is unique. Resolve this week.

6. **Demo space this week** — Three workers to demo (CODEX 40 recommendation): CoPilot + PC-12, MX logbook, Part 135 dispatch (medevac). Does the Protean teardown change this priority?

---

## 11. Specialist Operation Plugins

Each of the following extends the base CoPilot + MX + Dispatch core via a plugin ruleset and mission-specific data model — the same injection pattern as aircraft type cards. The base workers don't change; the plugin loads operation-specific rules, forms, and record types at tenant onboarding.

---

### Plugin A — Medevac Medical Crew Layer

This is the deepest plugin and the one with the most regulatory surface. The aircraft and the flight are only half the medevac operation — the medical team and the patient mission profile are the other half.

**Medical crew manifest (extends Operations/Dispatch Worker):**

Every medevac flight carries a medical crew whose composition must match the mission. The dispatch worker must enforce this before releasing the flight.

| Crew role | Certification tracked | Mission requirement |
|---|---|---|
| Flight Nurse (FN/RN) | RN license (state) + CFRN (Certified Flight Registered Nurse) + ACLS/PALS/NRP as applicable | All ALS/CCT flights |
| Flight Paramedic (FP) | Paramedic license + FP-C (Flight Paramedic Certified) | ALS flights; some CCT |
| Respiratory Therapist (RT) | RT license + CPFT/RRT + ACLS | CCT / ventilator-dependent patients |
| Neonatal Nurse Practitioner (NNP) | NNP certification + NRP | Neonatal transport only |
| Transport Physician | Medical license + FAAEM or equivalent | Highest acuity CCT |
| Critical Care Paramedic (CCP) | FP-C + additional critical care training | CCT transport |

**Aircraft configuration by mission profile:**

The Operations Worker must know not just which aircraft is available but whether it is configured for the mission type. Configuration is a MX-level record (tracked in aircraft DTC) — cannot be self-reported by the dispatcher.

| Mission type | Configuration requirement | Special constraints |
|---|---|---|
| **BLS (Basic Life Support)** | Stretcher, basic monitoring, O2 | Standard config; most aircraft eligible |
| **ALS (Advanced Life Support)** | ALS monitor/defibrillator, IV pumps, advanced airway | Most rotor Part 135 aircraft |
| **CCT (Critical Care Transport)** | Full ICU-equivalent: ventilator, multiple IV pumps, invasive monitoring | Weight-critical; specific aircraft only |
| **Neonatal / Pediatric (NICU)** | Transport isolette (incubator), neonatal ventilator, warming, pediatric monitoring | Isolette weighs 30–50 lbs; must be in W&B; specific aircraft with isolette mount |
| **Hyperbaric patient** | Low-altitude protocol required; O2 management | **Cannot expose DCS patients to reduced pressure** — cabin altitude must stay as close to sea level as possible; PC-12 flown at lower altitude than normal; some aircraft not eligible |
| **ECMO transport** | ECMO circuit + perfusionist or trained nurse; dedicated power; vibration management | Very few aircraft certified; weight, power, and space requirements are extreme |
| **Scene response (EMS)** | Standard ALS or CCT; LZ assessment required | LZ conditions drive aircraft selection |
| **Interfacility** | Based on care level at origin → destination | Hospital-to-hospital; higher predictability than scene |

**Hyperbaric/DCS transport — special handling:**
Decompression sickness (DCS, "the bends") patients cannot be exposed to reduced atmospheric pressure — it worsens their condition. The RAAS rule for a DCS transport must enforce: (a) altitude restriction in the flight plan, (b) aircraft with capability to maintain sea-level (or near) cabin pressure, (c) pilot briefed on pressure management protocol. This is a dispatch rule, not just a clinical one — the Operations Worker must flag it.

**Pediatric transport — special W&B:**
Neonatal transport isolettes are heavy (30–50 lbs) and attach at a specific point in the cabin. The W&B calculation for a neonatal flight must include the isolette at its mount position, not just as a passenger weight. The aircraft DTC records the isolette mount arm so the W&B calculator loads correctly for neonatal missions automatically.

**HIPAA and patient data:**
Patient information in the medevac dispatch record is strictly regulated. What the dispatch/operations worker captures:
- Patient weight (required for W&B — not optional, not estimable)
- Care level (BLS/ALS/CCT/Neonatal — not diagnosis)
- Receiving hospital + care team contact
- Mission type (scene vs. interfacility)
- NOT: patient name, diagnosis, condition details — these stay in the clinical charting system (Protean, ImageTrend, etc.)

The interface with Protean/charting is a data handoff: the flight record DTC event ID is passed to the charting system, linking the transport record to the clinical record without SOCIII holding PHI.

**Medical certificate / currency display rule (RT14):** When the crew package shows a crew member's medical status or currency, display it as: 'per pilot-provided certificate dated [date]' — never as 'verified by SOCIII.' The pilot self-certifies under FAR 61.23; the platform records and displays what the pilot provided. This framing must appear in the UI, not just the red-team notes.

**CAMTS/AAMS accreditation records:**
Most serious Part 135 air medical operators seek CAMTS (Commission on Accreditation of Medical Transport Systems) accreditation. CAMTS has its own audit requirements for crew training records, equipment maintenance, quality management, and safety programs. The Training Suite and MX Worker records are directly useful for CAMTS audits — a CAMTS audit tab in the Operations Worker surfaces the current compliance status.

---

### Plugin B — Aerial Firefighting

Aerial firefighting is operated under a patchwork of FAR parts and government contract frameworks. Most operations are Part 91 (exclusive-use government contracts with USFS/BLM/CAL FIRE) or Part 135 (Call-When-Needed/CWN contracts). Some retardant application may invoke Part 137 (agricultural aircraft). The plugin loads the appropriate ruleset at operator configuration.

**Fleet types and their specific records:**

| Fleet type | Plugin data model additions |
|---|---|
| **SEAT (Single Engine Air Tanker)** | Retardant tank capacity + load records; hopper weight in W&B; drop speed/altitude limits from contract specs |
| **MAFFS (C-130 + USAF modular system)** | Military-civilian coordination records; USAF activation/deactivation events |
| **VLAT (Very Large Air Tanker — DC-10, 747)** | High-capacity retardant ops; specialized crew requirements; only a few operators |
| **Rotor with helibucket (Bambi Bucket)** | Bucket weight + capacity in W&B; dip site location records; hover endurance calculations |
| **Lead plane / Air attack** | Coordination records; TFR boundary management; radio frequency management |

**Mission-specific records:**

- **Retardant load event:** volume loaded (gallons), retardant type (PHOS-CHEK or equivalent), USFS-approved product confirmation, tank flush records, load cell reading
- **Drop record:** target coordinates, altitude at release, airspeed at release, pilot ID, time — immutable DTC event linked to the flight leg
- **TFR compliance:** active TFR boundaries pulled from FAA NOTAMs and displayed in CoPilot Charts tab; Operations Worker blocks dispatch into a TFR-restricted area without explicit override
- **Night operations record:** NVG currency for each crew member; night ops waiver from contracting agency on file in Studio Locker
- **Environmental compliance:** USFS requires retardant be kept out of waterways; drop records include proximity-to-water notation; AI flags drops planned near waterways for dispatcher review

**Contract management (Studio Locker extension):**
USFS and BLM contracts have specific requirements for crew qualifications, aircraft specifications, and documentation. The Studio Locker plugin for firefighting maintains:
- Current exclusive-use or CWN contract documents
- Required crew qualification matrix per contract (QNS — Qualification Notification System compliance)
- Aircraft specification compliance per contract (retardant capacity, comms equipment, GPS requirements)
- Daily availability reports (DAR) — required by USFS for contracted aircraft

---

### Plugin C — External Load / Construction and Lift (Part 133)

Part 133 is the FAR governing rotorcraft external load operations. It requires a separate operating certificate from Part 135. The plugin extends the MX and CoPilot workers with load-specific records and the Operations Worker with lift planning.

**Certificate and crew requirements:**
- Part 133 operating certificate (separate from Part 135)
- Pilot must hold commercial or ATP + category/class rating + specific Part 133 experience hours
- Longline currency: minimum hours within prior 90 days on longline operations (varies by operator)

**External load classes:**
- **Class A:** load not free to swing (rigidly attached) — uncommon
- **Class B:** load free to swing, can be jettisoned, not human-occupied — most construction work
- **Class C:** load free to swing, can be jettisoned, human-occupied (personnel positioning, short-haul)
- **Class D:** human external load (heli-skiing rescue extraction, some construction) — most restrictive

**Lift planning record (new DTC event type: `external_load_lift`):**
- Load description + weight (certified by rigging crew)
- Load CG estimate + attachment point
- Hook load capacity at mission density altitude (from Type Card performance tables)
- Longline length
- LZ / placement coordinates
- Rigging plan (attached from Vault docs)
- Rigger identity (certification tracked in the human certification registry)
- Pre-lift safety briefing DTC event (identity-anchored, all crew)
- Emergency jettison procedure confirmed

**W&B for external load:**
The aircraft DTC carries the hook load limit chart for the specific tail. The Operations Worker uses this to enforce: hook load + fuel + crew + internal payload must not exceed the chart limit at the planned density altitude. A lift that would exceed limits is blocked before dispatch.

---

### Plugin D — Heli-Skiing and Mountain Operations

Heli-skiing is typically Part 135 or Part 91 commercial, operated in mountainous terrain with unique safety, performance, and guest management requirements.

**Performance-critical additions to CoPilot:**
- Density altitude calculator (mountain ops at 8,000–14,000 ft MSL routinely)
- High-altitude performance tables from Type Card (hover ceiling OGE/IGE at mission altitude)
- Wind + downdraft risk assessment (mountain wave, rotor wash, terrain masking — not captured by standard METAR)
- Snow LZ assessment: slope angle, snow surface condition (supportive crust vs. breakable slab), avalanche exposure
- Go/no-go at the LZ level, not just the departure airport — conditions can be VFR at the base but IMC at the drop zone

**Guest management (Operations Worker extension):**
- Skier manifest: actual weights required (ski gear adds 15–25 lbs per person)
- Skier skill classification (affects drop zone selection and group management)
- Location tracking: GPS last-known position per skier group when dropped off (for SAR)
- Emergency contact per skier (integrated with SAR coordination if needed)
- Return time tracking: expected pickup time + overdue alert

**SAR coordination:**
Heli-ski operators work closely with local SAR organizations. The Operations Worker maintains:
- Current SAR contact + frequency
- Overdue alert trigger (configurable — typically 30 min past expected pickup)
- Skier last-known GPS position available to SAR instantly when alert fires

**Regulatory and permit layer (Studio Locker extension):**
- USFS or BLM operating area permit — specific terrain zones authorized
- State aviation operating authority (varies by state)
- Passenger liability waivers (on Vault — linked per guest)
- Avalanche awareness training records for guides and pilots

---

### Plugin E — Air Tours (Part 136)

Commercial air tours are governed by Part 136 and, for National Park operations, additional SFARs and park-specific rules. The Grand Canyon has the most complex air tour regulatory environment in the US.

**Part 136 baseline requirements:**
- Operator must hold Part 135 or Part 91 certificate depending on operation
- Safety briefing required before each flight — DTC event confirming briefing given
- Passenger manifest: names + weights (for W&B and emergency response)
- Route management: authorized routes per Part 136 and any park-specific plan

**Grand Canyon (SFAR 93) — specific rules:**
- Flight-free zones: specific areas within the canyon where flight is prohibited at any altitude
- Altitude minimums: minimum altitudes above the rim in different sectors
- Time-of-day restrictions: some tours restricted to certain hours
- Noise quotas: maximum number of flights per route per day (managed by FAA Air Tour Management Plan)
- ATSC (Air Tour Scorecard) reporting: compliance data submitted to FAA

**Commercial Air Tour Management Plan (ATMP):**
Under the National Parks Air Tour Management Act, each park with commercial air tours must have an ATMP (many are still pending as of 2026). Studio Locker tracks the current ATMP status for each park in which the operator is authorized, and alerts when plan updates require route or procedure changes.

**Guest management:**
Same requirements as heli-skiing (actual weights, manifest) plus:
- Boarding pass / ticket tie to manifest (for high-volume operations)
- Photo capture at boarding (customer service + safety identification)

---

### Plugin Summary — Which Operations Need Which Plugins

| Operation | Base workers | Plugins |
|---|---|---|
| Part 135 air ambulance (standard ALS) | CoPilot + MX + Dispatch | Plugin A (medical crew layer — BLS/ALS) |
| Part 135 air ambulance (CCT/NICU/hyperbaric) | CoPilot + MX + Dispatch | Plugin A (full — all mission configs) |
| Aerial firefighting (SEAT/rotor) | CoPilot + MX + Dispatch | Plugin B |
| Construction/lift | CoPilot + MX + Dispatch | Plugin C (Part 133) |
| Heli-skiing | CoPilot + MX + Dispatch | Plugin D |
| Air tours (standard) | CoPilot + MX + Dispatch | Plugin E |
| Air tours (Grand Canyon) | CoPilot + MX + Dispatch | Plugin E + SFAR 93 ruleset |
| Flight school (Part 141) | CoPilot + MX + Dispatch | Training Suite plugin |
| Part 91 owner/operator | CoPilot + MX | Dispatch lite |
| Part 121 airline | CoPilot + MX + Dispatch | Part 121 ruleset (future) |

---

## 12. Open Decisions Added by This Session

1. **Protean integration depth** — Protean is live today (2026-07-20). What does Protean expose? API, export files, webhook? This determines whether the Operations Worker integrates with Protean or replaces it for new operators.

2. **Training Suite as Part 141 pitch** — The training record substrate is identical to Makai nursing. Should the same "Business in a Box for Schools" pricing apply to flight schools ($99/mo + $5/active student)?

3. **Line check records + PRIA** — If a pilot's line check records are in SOCIII, can PRIA requests become automatic (with pilot consent)? This is a significant product feature for Part 135 hiring managers.

4. **MX Worker for GA solo owners** — CAMP is dominant for turbine tracking (~$300–600/year per aircraft). SOCIII MX Worker as a CAMP alternative for single-aircraft PC-12 owners is a direct addressable segment.

5. **Eric as creator / design partner** — What is the right structure? Creator? Advisor (RSPA)? Paid design partner for specific spec work? Resolve this week.

6. **Demo space this week** — Three workers to demo: CoPilot + PC-12, MX logbook, Part 135 dispatch (medevac). Does the Protean teardown change this priority? **Answered (2026-07-20):** Same three workers, same order. The teardown does not change what to build — it sharpens what the debrief tab in CoPilot must do (see §6 Mission Close spec above). One new constraint: all demo personas must be fictional. Do not use real operator identifiers, real crew names, or real patient/transport IDs in any demo build or video. The teardown is for internal design; the demo is a generalized Part 135 scenario (fictional operator "Pacific Medevac," fictional crew).

7. **FAA regulatory engagement for PRIA/Medical chain** — The on-chain pilot record requires a regulatory relationship to reach its full potential. Is there an ARAC participation path, or a specific FSDO willing to run a pilot program? Eric's military + airline background may open doors here.

8. **Drug/alcohol testing records (Part 120)** — DOT Drug and Alcohol Clearinghouse already exists (mandatory since 2020). Does SOCIII integrate with it as an additional data source for the certification registry, or maintain separate records that employers can query?

9. **Fueling — FBO API integration** — Major FBOs (Signature, Avfuel, Avionics network) have digital fueling records. Can we pull fueling data directly from FBO systems rather than requiring manual entry? This would make the fueling DTC automatic for most commercial operations.

10. **External red team** — MX domain (A&P/IA or MX director), military aviation ops, Part 135 dispatcher. Who from Sean's network? Eric is confirmed for military + airlines. MX and dispatch experts still needed.

---

## 12. Red Team (additions to CODEX 40 RT1–RT6)

- **RT7 (Training Suite — CFI liability):** If a CFI endorsement DTC is created on SOCIII and the student subsequently has an accident, the CFI's identity anchor in the record is unambiguous. CFIs will want to know: does SOCIII's endorsement record create more liability exposure than a paper endorsement that could be disputed? Answer: likely the opposite — the DTC shows exactly what was authorized (aircraft, area, date), which limits the scope of liability. A paper endorsement is vaguer. But this should be validated by an aviation attorney before marketing the Training Suite to CFIs specifically.

- **RT8 (MX — unauthorized maintenance):** The system records who performed maintenance by certificate type. If a pilot logs a maintenance event with incorrect credentials (claims A&P rating they don't have), the aircraft could be released as airworthy on incorrect records. Mitigation: certificate verification at user provisioning time (FAA airmen registry lookup by certificate number). This is a build requirement before the MX Worker goes live for any Part 135 operator.

- **RT9 (AD tracking freshness):** The FAA publishes new ADs regularly. If our AD database is stale by even 30 days, an operator could be flying an aircraft with a non-compliant AD while the platform shows green. Mitigation: daily automated pull from FAA rgl.faa.gov AD database; any new applicable AD triggers an immediate fleet alert. This is a required background job, not a nice-to-have.

- **RT10 (Part 121 scope creep):** The Uber dispatch vision will attract requests to "just add Part 121 support." Part 121 dispatch is regulated — dispatchers are certificated, the airline is the certificate holder, and the dispatch system itself could be considered part of the operations specification. Do not add Part 121 enforcement features without aviation counsel and a clear regulatory strategy. Design for it architecturally; do not market it until the posture is clear.

- **RT11 (Drone dispatch = new regulatory surface):** When the platform extends to UAS dispatch, every new operation type (BVLOS, beyond-crew, autonomous) requires its own regulatory analysis. The rules engine that works for Part 135 does not automatically apply to Part 107 or future BVLOS waiver operations. Build the drone layer with a new ruleset namespace (`rules/aviation-uas-part107`, `rules/aviation-uas-bvlos`) from the start — do not extend the crewed aircraft ruleset to cover drones.

---

- **RT12 (Fueling — wrong fuel type):** If the aircraft DTC says Jet-A and a fueling event records 100LL, the system should flag it immediately. But the system can only flag what it's told — if the fueling record is entered incorrectly (or not entered at all), the safety net is gone. Mitigation: photo of fuel cap + fuel receipt required for every fueling DTC event; AI reads fuel type from receipt photo where possible; system flags any fueling where the recorded type doesn't match the approved type in the aircraft DTC.

- **RT13 (PRIA — pilot consent under employer pressure):** The portable pilot record consent model assumes pilots consent freely. In practice, a new employer could make SOCIII consent a condition of employment, which creates coercion risk. Mitigation: the consent model must be revocable at any time; consent grants a specific employer access to specific record types for a specific period — not a blanket data dump. Pilots can see exactly what was shared and when. Document this in the pilot-facing privacy disclosure before building the consent flow.

- **RT14 (FAA Medical — unauthorized practice risk):** If SOCIII tracks medical status and surfaces it in a dispatch go/no-go context, and that status is wrong (a revocation hasn't been recorded yet), a dispatcher could release a flight with a medically decertified pilot while the system shows green. This is a worse outcome than the current state where dispatchers have no digital verification at all — because SOCIII's wrong green carries an implicit "verified" claim. Mitigation: always display the source and timestamp of medical data; never display medical status as "verified by SOCIII" — only "per pilot-provided certificate dated X." The pilot self-certifies; the platform records and displays what the pilot provided. The legal responsibility remains with the pilot (FAR 61.23) and the employer's PRIA process.

- **RT15 (Wearable biometric FRAT — gaming):** If fatigue biometrics (HRV, sleep) become an input to the FRAT score, pilots under scheduling pressure will manage their devices to game the score. Mitigation: biometric input must be strictly opt-in and advisory — never a blocking input to dispatch. If it ever becomes a hard stop, pilots will find ways to generate favorable data. The value is in the aggregate trend (fleet-wide fatigue patterns) not the individual pre-flight gate.

- **RT16 (IA annual renewal tracking):** If SOCIII tracks IA renewals and an IA's authorization lapses, every annual inspection they've signed since the lapse is in question. If SOCIII surfaces that lapse, it creates immediate liability for the operator — even though the lapse is the IA's responsibility. Mitigation: IA renewal tracking is advisory with alerts, not a system-enforced gate on MX records. The alert fires 60 days before renewal; after lapse, a banner shows on the IA's profile noting the authorization status. Aircraft that were inspected during a lapse period are not retroactively flagged by the system — that determination is a legal/regulatory question outside the platform's authority.

---

- **RT17 (Medevac — HIPAA boundary creep):** The dispatch record must not accumulate PHI. Patient weight and care level are operationally required and not individually identifying in context. But adding diagnosis, patient name, or condition details — even informally, through a free-text notes field — creates HIPAA exposure. Mitigation: no free-text patient description field in the dispatch record. The clinical charting system (Protean/ImageTrend) holds the PHI; SOCIII holds only the flight record linked by event ID. The integration is a pointer, not a data mirror.

- **RT18 (Firefighting — retardant drop liability):** If the Operations Worker surfaces a drop location recommendation or route and the drop causes environmental damage (retardant in a waterway), the operator's use of SOCIII could be cited as evidence of the planning process. Mitigation: SOCIII surfaces the waterway proximity flag; the pilot and operator make the drop decision. The DTC event records that the flag was shown + who approved the drop. Never claim the system "clears" a drop location — it flags risk; humans decide.

- **RT19 (Part 133 — load weight certification):** The lift planning DTC records the load weight. If the weight is wrong (self-reported by rigging crew without independent verification), the W&B calculation based on it is wrong. A load heavier than declared could exceed hook limits at altitude. Mitigation: the system requires the rigger's identity-anchored sign-off on the declared weight; any weight variance from a load cell reading must be reconciled before the lift event closes. The platform does not certify load weights — it records what was declared by whom.

- **RT20 (Heli-skiing — SAR overdue alert false positives):** An overdue alert that fires incorrectly (skier group is fine but comms are down) could trigger a SAR response that pulls resources from a real emergency. Mitigation: the alert is a notification to the operator, not an automatic SAR dispatch. The operator acknowledges or escalates. The DTC records the alert time + operator acknowledgment — if a real incident follows, the record shows how long it took to escalate.

---

*Next steps: Protean teardown today (2026-07-20). Then build aviation demo space: CoPilot + PC-12, MX logbook, Part 135 dispatch (medevac subset Plugin A). External red team: Eric (military/airlines) + MX expert + Part 135 dispatcher TBD. Medevac medical crew red team: ideally a flight nurse or medical director.*
