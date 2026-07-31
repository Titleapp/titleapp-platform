# CODEX 61 — Aviation Logbook: Vault as Substrate

**Status:** Rev 3 — instrument-currency window, Part 135 recurrent reconciliation, schema fields  
**Priority:** P1 — required before aviation demo recording  
**Builds on:** CODEX 60 (Aviation Suite Rebuild), CODEX 15 (Vault model), personas-vault-drive-worker-scoping lock (2026-06-24)

---

## 1. The Problem

Three logbook namespaces currently exist and are incoherent:

| Collection | Writer | Reader | Status |
|---|---|---|---|
| `logbooks/{userId}/entries` | CoPilot PC-12 handlers | CoPilot currency calculator | Orphan — personal data trapped inside a worker |
| `logbookEntries` | `/v1/logbook:append` (Vault model) | `/v1/logbook:list` | Correct substrate, underused |
| `logbook` | `/v1/pilot:parse` (legacy Excel import) | Nothing | Dead — orphaned collection |

The CoPilot currency calculator reads `logbooks/{userId}/entries` only. Any flight logged via the Vault path (`logbookEntries`) is invisible to the currency engine. If Sean logs a flight through Alex chat and a separate tool reads his PC-12 currency, they disagree.

Beyond the technical problem, there is an architectural mismatch: `logbooks/{userId}/entries` is an operator-scoped or app-scoped collection. It should not exist. The logbook belongs to the pilot, not to the worker.

---

## 2. The Architecture Principle

**The pilot logbook is a personal, portable record. It belongs to the pilot, not to the operator.**

When a pilot transitions from Pacific Air Partners to a new employer, their logbook goes with them. No operator can modify, revoke, or gate it. The same principle applies to:

- A nursing student's clinical hours and CE credits (belongs to the nurse, not the school)
- A real estate agent's transaction history (belongs to the agent, not the brokerage)
- A student's course completions and grades (belongs to the learner, not the LMS)

In SOCIII's data model this means: **canonical record lives in the Vault (`logbookEntries`). Workers project a context-aware view of that record. The worker does not own the data.**

This is the append-only, immutable chain that is the platform's core patent-pending moat. The logbook entry is written once, chain-anchored, and the pilot can prove its contents to any future employer, regulator, or insurer — without depending on the operator's continued cooperation.

The canvas and worker tabs that show logbook data are **projections**, not sources. The same data surfaces in two places by design:

- In the CoPilot worker: filtered by tail, recency, type — operational context
- In the personal Vault: complete lifetime record, portable, provable

This is not duplication. It is the same row viewed from two different angles.

---

## 3. Education Parallel

The nursing/education analogy is exact and should be locked as platform doctrine:

| Domain | Vault Entry Type | Worker Projection |
|---|---|---|
| Aviation | `aviation.flight` | CoPilot logbook tab, currency tab |
| Aviation | `aviation.currency_event` | CoPilot currency tab, TRAINING worker |
| Education | `education.course_completion` | Course worker progress tab |
| Education | `education.assessment` | Course worker grade/eval tab |
| Education | `education.ce_credit` | Nursing CE tracker, Vault CE wall |
| RE | `re.transaction` | RE Advocate transaction history |

The student sees their learning record inside the course context AND in their personal Vault. The course worker did not "create" those records in a way that traps them — it wrote append-only entries that the student owns.

FERPA compliance: the student's right to their educational record is satisfied by design, not by policy. The record is in their Vault; they can export or prove it without the school's permission. This is the answer to the LMS replacement play.

---

## 4. Target Architecture

### 4.1 Canonical Store: `logbookEntries` (Vault DTC model)

Flight log entries and currency events — records that belong to the **pilot as a person** — live in `logbookEntries` via `/v1/logbook:append`.

**Squawks are explicitly excluded from this rule.** A squawk is the aircraft's maintenance history. It belongs to the tail number, not the pilot who wrote it up. Per CODEX 60 (Rev 3, build-ready), squawks are canonically stored at `tenants/{tenantId}/squawks/{squawkId}` and AIRCRAFT is the event source. That collection remains the single writer. See §4.3 for the `file_squawk` COS tool which writes to that collection, not here.

Existing schemas in `services/vault/schemas/`:
- `services/vault/schemas/pilotCurrency.js` — point-in-time currency events (see `aviation.currency_event` below)
- `services/vault/schemas/aircraftLogbook.js` — inspection events, AD compliance events (personal Vault projection only — squawk canonical collection is in CODEX 60)

New schema additions needed:

```
aviation.flight {
  tailNumber: string,          // N661LF
  date: ISO-8601 date,
  depIcao: string,             // KTLH
  arrIcao: string,             // KMCO
  flightTime: decimal,         // 2.1
  picTime: decimal,
  sicTime: decimal,
  nightTime: decimal,
  instrumentTime: decimal,
  approachCount: integer,            // IFR approaches flown — used by 61.57(c) instrument currency tally
  approachTypes: string[],           // e.g. ["ILS", "RNAV"] — optional, for logbook detail
  holdCount: integer,                // holding procedures flown — used by 61.57(c) tally
  landingCount: integer,
  flightType: "part91" | "part135" | "training" | "checkride",
  aircraftCategory: "airplane",
  aircraftClass: "multiengine_land" | "single_engine_land",
  typeRating: string | null,   // "PC12_47E"
  remarks: string,
  businessPurpose: string,     // for IRS documentation
  operatorId: string | null,   // tenantId of the operator, null = personal
  tripId: string | null,       // links to DISPATCH trip record if Part 135
}

aviation.currency_event {
  // Required on every entry — used by §4.2 filter logic
  tenantId: string,                  // always "vault" for personal pilot records
  linkedEntityId: string,            // userId of the pilot this event belongs to

  eventType: "bfr" | "ipc" | "medical" | "type_recurrent"
           | "135_proficiency_check" | "135_line_check" | "135_ioe",
  date: ISO-8601 date,               // date of the checkride/physical/sign-off
  expirationDate: ISO-8601 date,     // computed: BFR +24mo, IPC +6mo (+6 grace), etc.
  aircraftType: string | null,       // "PC12_47E" — required for type_recurrent + 135 events
  examinerName: string | null,       // DPE/AME/FSDO/check airman name
  examinerCertNumber: string | null,
  medicalClass: "class1" | "class2" | "class3" | null,  // medical events only
  signedBy: string,
  notes: string,
}
```

**Part 135 event types reconciled against CODEX 60:** CODEX 60 names three Part 135 recurrent types. All three map to `aviation.currency_event`:

| CODEX 60 name | `eventType` value | Recurrence | Notes |
|---|---|---|---|
| Proficiency check (135.293) | `135_proficiency_check` | Annual | Tests maneuvers per type — replaces the draft `135_pic_check` name; renamed to match reg citation |
| Line check (135.299) | `135_line_check` | Annual | Evaluated on a revenue flight by a check airman; separate from proficiency check |
| IOE (Initial Operating Experience) | `135_ioe` | One-time per type | Stored once as the qualification record for that aircraft type; not a recurring currency window |

`type_recurrent` is the generic annual event for Part 91 operations and non-135 type maintenance. It does not duplicate `135_proficiency_check` — a Part 135 operator records `135_proficiency_check`, a Part 91 owner-pilot records `type_recurrent`.

**Why two schemas, not one — and why three query modes:** The currency engine requires three distinct query patterns:

1. **Tally from `aviation.flight`** — 90-day recency (T/O + landings), night currency, and instrument currency (61.57(c))
2. **Latest event from `aviation.currency_event`** — BFR, IPC (only when 61.57(c) window has lapsed > 12 months), medical, type recurrent, 135 checks
3. **IPC as fallback, not replacement** — IPC only enters the picture if a pilot's 61.57(c) approach tally has been zero for more than 12 months; a pilot who flew 6 IFR approaches last month is instrument current from their flight log with no IPC event needed

Failing to distinguish these will tell any actively-flying IFR pilot they are not instrument current — an immediate trust-killer in an aviation demo.

### 4.2 Currency Engine: reads `logbookEntries`

The CoPilot currency calculator must be rewritten to read from `logbookEntries` filtered by:
- `tenantId: "vault"` (personal Vault entries) OR
- `tenantId: operatorId` (entries logged under a specific operation)
- `type: "aviation.flight"` 
- `linkedEntityId: userId` (pilot's UID)

Eight FAA currency windows — three query modes:

**Mode A — tally from `aviation.flight` over a rolling window:**
1. **90-day recent experience** — sum T/O + landings over preceding 90 days · 3 day T/O + 3 landings for day pax; +3 night T/O + 3 night landings for night pax
2. **Night currency** (Part 135 ops) — sum night landings over preceding 90 days
3. **Instrument currency (61.57(c))** — sum `approachCount` over preceding 6 calendar months; requires ≥ 6 approaches + at least one hold/course-intercept recorded · if ≥ 6: current · if < 6 but < 12 months since last qualifying set: grace period (safety pilot required for IFR) · if > 12 months with zero qualifying approaches: IPC required (see Mode B #4)

   *This window is satisfied by normal IFR flying with no signed event. IPC is the recovery path when this window lapses, not the primary check.*

**Mode B — latest matching `aviation.currency_event` with explicit expiration date:**
4. **BFR** — `eventType: "bfr"` · expires 24 calendar months from `date`
5. **IPC** — `eventType: "ipc"` · expires 6 calendar months from `date` (+6 grace) · only required when Mode A window #3 has lapsed > 12 months
6. **Medical** — `eventType: "medical"` · expiration from `expirationDate` field · Class 1: 12mo (under 40) / 6mo (over 40) · Class 2: 12mo · Class 3: 60mo (under 40) / 24mo (over 40)
7. **Type recurrent / 135 proficiency** — `eventType: "type_recurrent"` (Part 91) or `"135_proficiency_check"` (Part 135) · expires 12 calendar months per `aircraftType`

**Mode C — existence check (one-time qualification record):**
8. **135 line check + IOE** — `eventType: "135_line_check"` (annual) and `"135_ioe"` (one-time per type) · verify record exists for the current aircraft type and operation

### 4.3 Alex COS Aviation Tools

Four new tools added to `_cosTools` in the COS handler:

```
weather_brief(icaoList: string[])
  → calls /v1/aviation:weather, returns color-coded METARs + TAFs + SIGMETs
  → Alex summarizes in plain English: "KTLH is VFR, ceiling 6,000, visibility 10. No SIGMETs on your route."

get_notams(icaoList: string[])
  → calls /v1/aviation:notams (Notamify, paid, cached 30min)
  → Alex filters to operationally relevant NOTAMs only (runway closures, ILS outages, TFRs)
  → Strips administrative/lighting NOTAMs unless specifically asked

log_flight(entry: aviation.flight schema)
  → calls /v1/logbook:append with type "aviation.flight"
  → writes to logbookEntries (Vault canonical)
  → returns confirmation with entry ID
  → Alex usage: "Logged your flight N662LF KTLH→KMCO 2.1h PIC. Entry ID: lb_xxx. View in your Vault logbook."

file_squawk(tailNumber, description, pilotName, tenantId)
  → writes to tenants/{tenantId}/squawks/{squawkId} — CODEX 60 canonical collection, NOT logbookEntries
  → triggers MX worker notification (squawk propagation per CODEX 60 Invariant #1)
  → Alex usage: "Squawk filed on N661LF: FCU anomaly. Work order WO-2026-048 opened and MX notified."
  
  NOTE on data ownership: A squawk is the aircraft's maintenance record, not the pilot's personal record.
  It stays with the tail number regardless of who wrote it up. The pilot's Vault may show a read-projection
  ("squawks I've written up") queried from the operator's squawks collection, but there is no second write
  into logbookEntries. This is the boundary between CODEX 60 (aircraft-scoped) and CODEX 61 (pilot-scoped).
```

### 4.4 Canvas Live Data

The canvas tabs that currently show fixture data must fetch from live endpoints on tab activation:

| Tab | Current | Target |
|---|---|---|
| DISPATCH › Weather | Static METAR fixture | Fetch `/v1/aviation:weather?stations=KTLH,KMCO` on mount |
| DISPATCH › NOTAMs | Static NOTAM fixture | Fetch `/v1/aviation:notams?locations=KTLH,KMCO` on mount |
| DISPATCH › Flight Following | Static tail positions | Fetch `/v1/aviation:traffic` on mount, poll every 60s; cancel interval on tab unmount/component unmount to prevent polling leak |
| CoPilot › My Logbook | Static fixture entries | Fetch `/v1/logbook:list?type=aviation.flight` on mount |
| CoPilot › Currency | Static currency table | Fetch `/v1/aviation:currency` (computes from logbookEntries) on mount |
| AIRCRAFT › Squawks | Static squawk table | Fetch `/v1/aviation:squawks?tenantId={tenantId}` on mount — reads CODEX 60 `tenants/{tenantId}/squawks` collection, not logbookEntries |

---

## 5. Migration Plan

### Phase 1 — Schema + COS tools (no migration yet)
1. Add `aviation.flight` schema to `services/vault/schemas/`
2. Add 4 aviation tools to `_cosTools` in COS handler (`index.js`)
3. Update `/v1/aviation:currency` endpoint to compute from `logbookEntries` (dual-read: check both `logbooks/{userId}/entries` AND `logbookEntries`, merge results)
4. Deploy + test: Alex can do a weather brief, log a flight, check NOTAMs

### Phase 2 — Canvas live data
5. Wire 6 canvas tabs to fetch from live endpoints (see §4.4)
6. `CoPilot › My Logbook` tab renders real `logbookEntries` from Firestore
7. Deploy + test: Logbook tab shows Sean's real seeded entries from `#50`

### Phase 3 — Currency engine consolidation (after Phase 1 + 2 stable)
8. Rewrite CoPilot currency calculator to read `logbookEntries` (Vault) exclusively
9. Migrate existing `logbooks/{userId}/entries` to `logbookEntries` (one-time script)
10. Deprecate `logbooks/{userId}/entries` collection writes
11. Deprecate `logbook` (legacy) collection entirely
12. Deploy + confirm currency checks correct

### Phase 4 — Education parallel
13. Add `education.course_completion`, `education.assessment`, `education.ce_credit` schemas to Vault
14. Wire nursing/CE course workers to write logbook entries on completion
15. Surface entries in Vault under Education pillar
16. Wire student record view in course worker to read from `logbookEntries`

---

## 6. Demo Readiness Gate

Before recording aviation demo videos, all of the following must be true:

- [ ] Alex can answer "What's the weather at KTLH?" with a real METAR
- [ ] Alex can answer "Any NOTAMs at KMCO?" with real current data
- [ ] Alex can log a flight via chat and it appears in the CoPilot logbook tab
- [ ] Alex can file a squawk via chat and it appears in AIRCRAFT › Squawks tab
- [ ] CoPilot logbook tab shows real entries (not fixture)
- [ ] CoPilot currency tab shows real currency windows (not fixture)
- [ ] DISPATCH weather and NOTAM tabs show live data

---

## 7. Open Decisions

1. **Dual-read window for Phase 1**: During Phase 3 migration, the currency engine needs to read BOTH `logbooks/{userId}/entries` AND `logbookEntries` to avoid losing history. Accept a short dual-read window; clean up after confirmed migration.

2. **Operator vs. personal logbook entries**: When a Part 135 pilot logs a flight under an operator tenant, should the entry live in the Vault (`tenantId: "vault"`) or the operator's tenant? Recommendation: always Vault, with `operatorId` field linking to the operation. Operator can read (they're the employer) but cannot modify or delete (pilot's record).

3. **Education schema timing**: Phase 4 can be deferred until the nursing demo is scheduled. Not needed for aviation demo.
