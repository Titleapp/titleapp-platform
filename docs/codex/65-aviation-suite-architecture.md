# CODEX 65 — Aviation Suite Inter-Worker Architecture
# One Record, Multiple Workers, Real Information Flow

**Status:** Spec v2 — red-teamed 2026-08-03  
**Author:** Sean + Claude  
**Vertical:** Aviation  
**Depends on:** CODEX 60 (suite rebuild), CODEX 64 (CoPilot iPad UX)

---

## The Core Problem

Today's aviation operations run on information silos:

- **GE / P&WC** knows more about the engine's health than the operator's MX team.
  Engine telemetry flows continuously to the manufacturer via ACARS/HUMS. The
  operator finds out about a trend problem when GE calls them — or when the engine
  fails.
- **FlightAware** knows more about the aircraft's real-time position than the
  operator's Dispatch desk. ADS-B is public. The operator's own tools are often
  worse than what anyone can pull up on a browser.
- **The crew scheduling system** doesn't talk to MX. An aircraft goes OOS at 0200 —
  the scheduler finds out at 0600 when the pilot calls in. The manifest was already
  built against a grounded aircraft.
- **Duty limits** are tracked for pilots (because the FAA mandates it) but informally
  or not at all for MX technicians and Dispatch controllers — even though fatigue in
  those roles causes accidents too.

**SOCIII's opportunity:** be the aggregation layer. One append-only aircraft/person
record that all workers read from. Real information flow from every available source.
The same intelligence advantage GE has — but for the operator.

---

## The Three Entity Records

Everything in the aviation suite is built on three entity types. Each is append-only.
Workers are views into these records, not owners of them.

### 1. Aircraft Record (`aircraft/{tailNumber}`)
```
Sources that write to it:
  MX Worker:       squawks, work orders, AD compliance, inspections
  CoPilot:         flight events, clearances, logbook entries
  Dispatch:        flight assignments, release events
  Engine telemetry: (Phase 4) ACARS/HUMS engine health events
  ADS-B feed:      (Phase 3) position events, flight state

Fields that matter:
  status:          airworthy | grounded-mx | grounded-inspection | unscheduled-mx
  currentPosition: lat/lon/alt/groundspeed (from ADS-B, updated live)
  hobbsTTSN:       total time since new (from Hobbs events)
  nextInspection:  { type, dueDate, dueHobbs }
  openSquawks:     [ list of open work orders ]
  adCompliance:    [ all applicable ADs, status, next due ]
  engineHealth:    { trendStatus, lastDataAt, alerts }  // Phase 4
```

### 2. Person Record (`persons/{uid}`)
```
Sources that write to it:
  CoPilot:         logbook entries, clearances
  Dispatch:        duty period events, crew assignments
  Operations:      rest calls, fatigue risk assessments
  MX Worker:       sign-off events (A&P performing maintenance)
  HR/Roster:       certification, license, medical currency

Fields that matter for duty:
  role:            PIC | SIC | flight-nurse | A&P | IA | dispatcher | ops-controller
  currentDutyState: on-duty | off-duty | rest-period
  dutyPeriodStart: timestamp
  dutyHoursUsed:   this duty period
  restHoursBank:   hours of qualifying rest accumulated
  flightHours:     { last24h, last7d, last30d, last90d, calYear, last12mo }
  certifications:  [ medical, ATP, type ratings, A&P, IA, dispatcher cert ]
```

### 3. Flight Record (`flights/{flightId}`)
```
Sources that write to it:
  Dispatch:        flight.planned, manifest.created, flight.released
  CoPilot:         manifest.accepted, flight.departed, clearance.captured,
                   flight.arrived, logbook.appended
  MX:              aircraft.released (return to service after squawk)

This is the event log for one leg. The manifest lives here.
```

---

## Worker Responsibilities — Who Writes What

| Event | Written by | Read by |
|---|---|---|
| `manifest.created` | Dispatch | CoPilot (PIC review) |
| `manifest.accepted` | CoPilot | Dispatch (release gate) |
| `manifest.correction` | CoPilot | Dispatch, MX (weight affects performance) |
| `flight.released` | Dispatch | CoPilot (brief unlocked) |
| `flight.departed` | CoPilot | Dispatch (in-flight tracking), Operations |
| `squawk.filed` | CoPilot | MX (work queue) |
| `squawk.cleared` | MX | Dispatch (aircraft available again), CoPilot (aircraft status) |
| `aircraft.grounded` | MX | Dispatch (cannot assign), CoPilot (RED status) |
| `aircraft.returned` | MX | Dispatch (available), CoPilot (GREEN status) |
| `duty.start` | Dispatch/Ops | All workers (duty clock running) |
| `duty.end` | Dispatch/Ops | All workers (rest period begins) |
| `rest.complete` | Dispatch/Ops | Dispatch (crew available to assign) |
| `ad.due` | MX | Dispatch (aircraft may be restricted) |
| `engine.alert` | Engine feed | MX (primary), Dispatch (availability) |

**The rule:** No worker calls another worker. Workers write events. The RAAS engine
enforces cross-worker constraints by reading event history — not by workers calling
each other's APIs.

---

## Duty Limits — All Personnel, Not Just Pilots

This is the gap in current practice. Fatigue in MX and Dispatch kills people.

### Flight Crew (FAR 135.267 / 135.271)

⛔ **DO NOT SHIP THIS GATE UNTIL THE RULE IS ENCODED FROM THE ACTUAL FAR TEXT.**

The red-team correctly flagged that "9 hrs minimum rest" is a dangerous
simplification. FAR 135.267 is a table — rest requirements scale against the
length of the preceding duty period. FAR 135.271 covers augmented crew scenarios
separately. An incorrectly simplified rest rule baked into a hard block is itself
a hazard: it can wrongly clear a pilot who isn't legal, or wrongly ground one who
is. This spec does not reproduce the rule from memory.

**Before this gate ships:**
1. Pull the current FAR 135.267 table verbatim from eCFR.gov
2. Pull FAR 135.271 (augmented crew) and 135.273 (scheduling)
3. Encode the exact duty-period → minimum-rest lookup as a deterministic function
4. Have a licensed aviation attorney or qualified ops spec expert review the
   implementation against the operator's specific OpSpec provisions
5. Write the function into raasEngine.validate() with citations to the specific
   paragraph — not a hardcoded number

**What the gate logic will look like (structure only — values TBD from actual FAR):**
```
GATE: dispatch_cannot_exceed_crew_duty_limit
  Inputs:
    preceding_duty_period_hours  (computed from duty.start → duty.end events)
    rest_hours_accumulated       (computed from duty.end → next duty.start)
    flight_time_last_24h         (computed from logbook events)
    flight_time_last_quarter     (rolling)
    flight_time_last_year        (rolling)

  Lookup: FAR 135.267 table → minimum_rest_required
          FAR 135.271 if augmented crew → different table

  Action: HARD BLOCK if rest < minimum_rest_required
  Error: "Rest requirement not met per FAR 135.267. Required: [X] hrs.
          Accumulated: [Y] hrs. Available after: [timestamp]."
```

**In the meantime:** Display-only duty clock in CoPilot and Dispatch. No hard block
until the gate is correctly implemented. A clock that shows hours and lets the crew
make the call is safer than a rule that might be wrong.

**Flight time limits (these ARE straightforward and safe to encode now):**
```
  500 hrs in any calendar quarter        (FAR 135.267(a)(1))
  800 hrs in any two consecutive quarters (FAR 135.267(a)(2))
  1,400 hrs in any calendar year         (FAR 135.267(a)(3))
  8 hrs in any 24-hr period, single PIC  (FAR 135.267(b)(1))
  10 hrs in any 24-hr period, two pilots (FAR 135.267(b)(2))

These can be hard-blocked now — they are absolute and not duty-period-dependent.
```

### Maintenance Technicians (A&P / IA)
```
No specific FAR duty limit — but:
  - FAA AC 120-100 addresses MX human factors and fatigue
  - Many Part 135 OpSpecs include internal MX duty limits
  - Safety-critical sign-offs (return to service, engine work, flight control
    rigging) carry extra scrutiny

SOCIII approach:
  - Track duty periods for all A&P / IA personnel as events
  - Flag if an A&P has been on duty > 12 hrs before signing off a critical item
  - Flag is advisory (not a hard block) — ops manager must acknowledge
  - The acknowledgment is an event in the record (permanent, auditable)

RAAS gate: critical_mx_signoff_fatigue_check
  If technician duty_hours_used > 10 at time of sign-off:
    status: WARN
    action: ops_manager_acknowledgment_required
    event: mx.fatigue_waiver_acknowledged

  If technician duty_hours_used > 14 at time of sign-off:
    status: HARD BLOCK with break-glass override
    — NOT an unconditional wall. A single A&P at a remote base on an urgent
      medevac return-to-service has no time for "go home and sleep."
    Break-glass path:
      1. TWO authorized persons must approve (ops manager + director of maintenance)
      2. Written justification required (minimum 50 chars, stored as event field)
      3. Escalation notification fires to ops director immediately (SMS + in-app)
      4. Event written: mx.fatigue_hardblock_override with both approver UIDs,
         justification text, and timestamp — permanent, uneditable
    The record of what happened is worse for the operator than the fatigue itself.
    That friction is the point — it prevents casual override while preserving a
    genuine safety escape valve for extreme circumstances.
```

### Dispatch / Operations Controllers
```
No FAR duty limit for Part 135 single-pilot ops — but:
  - Part 121 (large carriers): dispatchers have duty limits (8 hrs on position)
  - Best practice for Part 135 ops with formal dispatch function: 10 hr limit

SOCIII approach:
  - Track dispatcher duty events (same model as MX)
  - Advisory flag if dispatcher on duty > 10 hrs is releasing flights
  - The flight.released event carries the dispatcher's duty_hours_at_release
    as a metadata field — permanent record of who released and how tired they were
```

---

## Aircraft Status — Better Than FlightAware

**Sean's point:** FlightAware gives better real-time aircraft status than most
operators' own Dispatch systems. GE knows more about engine health than the operator's
MX team. This is backwards and fixable.

### Current state (industry standard):
```
FlightAware: ADS-B position, track, altitude, groundspeed — PUBLIC DATA
MX board:    Grease-pencil or whiteboard status, updated manually
Dispatch:    Phone calls to confirm aircraft availability
Engine OEM:  Trend data in their own portal — operator logs in separately (if at all)
```

### Target state (SOCIII):
```
One aircraft status screen — aggregated from all sources:

N661LF — AIRWORTHY
─────────────────────────────────────────────────
POSITION      PHNL Ramp 7 · on ground · last ADS-B 14:32Z
FLIGHT STATE  Parked (not flight plan active)
HOBBS         4,823.1 hrs
NEXT INSPECT  100-hr due @ 4,850 hrs · 26.9 hrs remaining
OPEN SQUAWKS  None
ENGINE TREND  Normal · last data 14:15Z [P&WC feed]
AD STATUS     All current · next due Nov 2026

LAST 5 EVENTS:
  14:31Z  flight.arrived (PHOG→PHNL, Combs)
  14:28Z  ADS-B: on ground PHNL
  09:15Z  flight.departed (PHNL→PHOG, Combs)
  09:10Z  manifest.accepted (Combs · 4 souls · CG ✓)
  2026-08-01  squawk.cleared WO-2026-047 (FCU — Williams R. A&P)
```

### ADS-B Integration (Phase 3)

Source: **ADS-B Exchange** (already paid for, already wired — see aviation-apis-wired.md)
- Polled every 60 seconds per tail number
- Events written: `adsb.position`, `adsb.airborne`, `adsb.on_ground`
- `adsb.airborne` event auto-starts a flight watch in Dispatch
- `adsb.on_ground` event (after airborne) triggers post-flight debrief prompt in CoPilot
- Flight state derived from ADS-B, not from manual dispatch entry:
  ```
  on_ground + no flight plan = parked
  on_ground + active flight plan = pre-departure or taxiing
  airborne = in flight
  airborne + squawk 7700 = emergency
  airborne + squawk 7600 = lost comms
  airborne + squawk 7500 = hijack
  ```

⛔ **Emergency squawk detection requires an out-of-band notification path before
this feature ships. In-app alerts are useless if nobody has the app open.**

The red-team correctly flagged that Open Question #4 and "alert fires immediately"
directly contradicted each other. Here is the resolved design:

**Emergency notification architecture (required before Phase 3 ships):**

```
TRIGGER: ADS-B event with squawk in {7700, 7600, 7500}
  and aircraft was previously in airborne state

IMMEDIATE (< 30 seconds):
  1. SMS via Twilio (or equivalent) to ops duty officer phone number
     — phone number configured per tenant, required field in tenant settings
     — message: "SQUAWK 7700 — N661LF — last position 21.3204°N 157.9215°W
                 at 8,500ft — 14:47Z. Check comms immediately."
  2. SMS to backup contact (second required field in tenant settings)
  3. In-app push notification to all Dispatch users in this tenant

SECONDARY (in-app, for when someone opens the app):
  4. RED banner across all workers: "EMERGENCY SQUAWK — N661LF — 14:47Z"
  5. Flight record event: aircraft.emergency_squawk written immediately
     (cannot be suppressed, permanent)

SQUAWK 7500 (hijack) — additional step:
  6. SMS message text changes to include: "NOTIFY LAW ENFORCEMENT"
     SOCIII does not call law enforcement directly — operator must do that.
     But the notification text makes the required action explicit.

WHAT WE DO NOT DO:
  — Call the aircraft directly (we have no voice link)
  — Dispatch emergency services (liability, jurisdiction — operator's call)
  — Suppress or delay the notification for any reason

TENANT ONBOARDING GATE:
  Ops duty officer phone number and backup are required fields.
  The ADS-B polling loop does not activate until both are configured.
  A tenant cannot use live aircraft tracking without emergency contacts on file.
```

This is an onboarding requirement, not an optional configuration. No phone numbers
→ no live tracking. That's not punitive — it's the responsible default.

### Engine Telemetry Integration (Phase 4)

**The GE / P&WC insight:** Engine manufacturers have continuous health monitoring
data that operators don't see in real time. For the PC-12, P&WC has the **Eagle
Services Plan** and digital health monitoring via their **AeroCentrix** platform.

**What they monitor:**
- ITT (Interstage Turbine Temperature) trend — rising ITT at same power = deterioration
- Torque trend — power output degradation
- Fuel flow trend — efficiency changes
- Vibration signatures — bearing wear, impeller damage
- Start cycle data — hot starts, hung starts (compressor blade damage risk)

**SOCIII integration path:**
- P&WC AeroCentrix has an API (requires operator enrollment)
- Events written to aircraft record: `engine.health_report`, `engine.alert`
- MX worker surfaces alerts in squawk queue: "P&WC trend alert: ITT +8°C above
  baseline at cruise power — schedule borescope inspection"
- Dispatch reads engine health status before releasing aircraft

**Before P&WC API access:** Manual entry. MX tech reads their P&WC portal,
files a squawk if there's a trend alert. Same event, lower automation.

**The competitive framing:** Most operators have the P&WC portal login on one
laptop in the MX shop. Nobody checks it before every release. SOCIII checks it
for every flight release — automatically, if the API is connected; as a workflow
prompt, if it's manual. The discipline is the product, not just the data.

---

## Cross-Worker RAAS Gates

These are the constraints that span multiple workers. Enforced by the RAAS engine
against the append-only event record — not by workers calling each other.

```
GATE: dispatch_cannot_assign_oos_aircraft
  Query: aircraft/{tail}/events where type="aircraft.grounded" and no subsequent
         "aircraft.returned" event
  Action: HARD BLOCK — manifest.created fails validation
  Error: "N661LF has an open grounding event (WO-2026-047). Aircraft must be
          returned to service by MX before assignment."

GATE: dispatch_cannot_exceed_crew_duty_limit
  Query: persons/{uid}/events where type in ["duty.start","duty.end","flight.departed","flight.arrived"]
         in last 24h
  Compute: hours since last qualifying rest period
  Action: HARD BLOCK if < 9 hrs rest (pilot); WARN if < 11 hrs rest (MX/dispatch)
  Error: "Combs has 6.2 hrs of rest since last duty. Minimum 9 hrs required.
          Next available: 02:45Z"

GATE: copilot_cannot_release_without_manifest_accepted
  Query: flights/{flightId}/events where type="manifest.accepted"
  Action: HARD BLOCK — flight.departed cannot be written before manifest.accepted
  Error: "Manifest has not been accepted by PIC. Accept manifest before departure."

GATE: mx_fatigue_signoff_check
  Query: persons/{uid} duty hours at time of squawk.cleared event
  Action: WARN if > 10 hrs, HARD BLOCK if > 14 hrs (extreme)
  Event written: mx.fatigue_waiver_acknowledged (if ops manager overrides WARN)

GATE: engine_alert_before_release
  Query: aircraft/{tail}/events where type="engine.alert" and status="open"
  Action: WARN — dispatch can override with ops_manager_acknowledgment
  Event written: dispatch.engine_alert_acknowledged

GATE: critical_ad_before_release
  Query: aircraft/{tail}/adCompliance
  — Must check AMOC status, not raw due date alone.
    An AD with an approved Alternate Means of Compliance (AMOC) may extend or
    replace the standard compliance date. Querying nextDue <= today without
    checking for an active AMOC blocks legally airworthy aircraft.
  Data model required:
    adCompliance entry: {
      adNumber, title, effectiveDate, standardDueDate,
      amocApproved: bool,       // AMOC on file with this operator
      amocReference: string,    // FAA AMOC approval number
      amocEffectiveDate: date,
      amocExpiryDate: date,     // AMOCs can expire
      actualComplianceDate: date,
      complianceMethod: "standard | amoc | not-applicable",
      status: "current | overdue | amoc-current | amoc-expired | n/a"
    }
  Gate logic: HARD BLOCK only if status in ["overdue", "amoc-expired"]
  Status "amoc-current" = aircraft is airworthy, no block.
```

**Transactional consistency for safety-critical gates:**

Gates that could race against concurrent writes need Firestore transactions,
not plain reads. Two specific cases:

```
dispatch_cannot_assign_oos_aircraft:
  Risk: MX clears a squawk (aircraft.returned event) at the same moment
        Dispatch is checking aircraft status for an assignment.
  Fix:  Manifest creation runs inside a Firestore transaction that reads
        the aircraft status document atomically. If a concurrent write
        changes status between the read and the manifest.created write,
        the transaction retries. The manifest cannot be created against
        a document that changed state during the write.

critical_ad_before_release:
  Same pattern. flight.released event is written inside a transaction
  that reads adCompliance at the same instant.

RAAS engine implementation note: raasEngine.validate() must use
db.runTransaction() for these two gates specifically — plain reads
are not sufficient for safety-critical dispatch blocking.
```

---

## Worker Suite Map

```
                    ┌─────────────────────────────────────────┐
                    │         RAAS ENGINE (constraint layer)  │
                    │  reads all events, enforces all gates   │
                    └────────────┬────────────────────────────┘
                                 │ validates
              ┌──────────────────┼──────────────────────┐
              │                  │                       │
              ▼                  ▼                       ▼
    ┌──────────────────┐ ┌──────────────┐    ┌─────────────────────┐
    │    DISPATCH      │ │   COPILOT    │    │        MX           │
    │                  │ │              │    │                     │
    │ · Assign AC+crew │ │ · Accept     │    │ · Squawk queue      │
    │ · Build manifest │ │   manifest   │    │ · Work orders       │
    │ · Release flight │ │ · Flight     │    │ · AD compliance     │
    │ · Track duty     │ │   events     │    │ · Inspections       │
    │ · Invoice draft  │ │ · Logbook    │    │ · Engine trend      │
    │ · Crew schedule  │ │ · Clearance  │    │ · Return to service │
    └────────┬─────────┘ └──────┬───────┘    └──────────┬──────────┘
             │                  │                        │
             └──────────────────┴────────────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │   APPEND-ONLY RECORDS     │
                    │                          │
                    │  aircraft/{tail}          │
                    │  persons/{uid}            │
                    │  flights/{flightId}       │
                    └───────────┬──────────────┘
                                │ fed by
              ┌─────────────────┼─────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
       ADS-B Exchange     P&WC AeroCentrix    Manual entry
       (live position)    (engine health)     (squawks, Hobbs,
                                               logbook, W&B)
```

**Operations worker** (separate from Dispatch) handles the broader crew management:
scheduling, fatigue risk programs, drug & alcohol testing records, training currency
for Dispatch and MX personnel. Same entity records, different window.

---

## What This Means for Build Order

1. **Now:** The shared entity record schema must be designed before Phase 2 of any
   worker starts. The Firestore collection structure for `aircraft/`, `persons/`, and
   `flights/` determines whether cross-worker queries are possible.

2. **Phase 2 (all workers):** Every worker that writes events must write to the
   shared records, not its own silo. MX squawks go to `aircraft/{tail}/events`,
   not to `tenants/{id}/squawks` as currently implemented.

3. **Phase 3:** ADS-B polling loop writes `adsb.*` events to aircraft record.
   Dispatch reads aircraft status from the record, not from a manual board.

4. **Phase 4:** P&WC or GE telemetry feed, if operator enrolled. Until then,
   manual workflow prompt in MX: "Check engine trend data before release."

---

## Open Questions

1. **Firestore schema migration:** The current squawks collection is at
   `tenants/{id}/squawks`. The target is `aircraft/{tail}/events`. Migration
   needed before Phase 2 cross-worker queries work.

2. **Multi-operator aircraft (cross-tenant access control):** If N661LF is
   operated by Life Flight but maintained under an MRO contract at a different
   company, "MRO gets a read-only view" is not a sufficient answer — it implies
   a single `aircraft/{tail}` document is visible across two tenant accounts,
   which breaks the Studio Locker per-tenant isolation model.
   Proposed answer: The aircraft record lives under the operating certificate
   holder's tenant. MRO access is granted via an explicit `aircraft.share` event
   that specifies scope: maintenance-events-only (squawks, work orders, ADs) —
   NOT manifest data, billing data, or crew information. The share is revocable
   and creates an audit event. This needs its own CODEX before Phase 3 ships.

3. **P&WC AeroCentrix enrollment:** Does Life Flight have an active Eagle Services
   Plan? If so, API access may already be available. Worth asking ops.

4. **Squawk 7700/7600/7500 notification path:** Resolved above — Twilio SMS to
   ops duty officer and backup contact, both required before live ADS-B activates.

5. **Operations worker scope:** The SOCIII wedge is the small Part 135 operator
   running crew scheduling out of a spreadsheet with no formal FRMS. That operator
   has the most to gain from basic duty tracking and the least switching cost.

6. **Duty clock enforcement for MX/Dispatch:** Without a badge-in/badge-out
   integration or an active prompt, MX techs and dispatchers have no incentive
   to log duty events consistently. Options:
   a. App prompt: "You have an open work order — are you still on duty?" after 10hrs
   b. Shift-start required before work orders can be opened (procedural enforcement)
   c. Integration with a timekeeping system (Kronos, etc.) — overkill for Phase 3
   Recommended: Option (b) for Phase 3. Work order creation is gated on an open
   duty event. Forces the discipline without hardware integration.

7. **Engine alert tiers:** A single WARN gate for all engine alerts conflates an
   ITT nudge (schedule a borescope) with an imminent-failure precursor (ground
   immediately). Phase 4 engine telemetry integration needs at minimum two tiers:
   ADVISORY (trend deviation, schedule inspection within X hours/cycles) and
   URGENT (anomaly requiring immediate ground inspection before next flight).
   URGENT = same override friction as MX fatigue hard block. ADVISORY = same as
   current WARN with ops manager acknowledgment.
