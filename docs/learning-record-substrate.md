# Learning Record Substrate — Spec

**Status:** Draft for review (2026-06-09)
**Driver:** Ruthie Clearwater's Student Evaluation Worker (university nursing program). Generalizes to any education + professional CE use case.
**Thesis:** This is **not a new data model.** It is the platform's existing **DTC + append-only logbook** substrate, made *typed and attested* so a worker can reason over real graded events instead of fixtures.

---

## 0. Where this already exists (don't reinvent)

The universal record model is already live across every vertical:

| Vertical | Anchor (DTC) | Logbook (append-only events) |
|---|---|---|
| Auto | VIN | service, mileage, title transfer |
| Aviation | tail number | **flight hours, currency, endorsements** |
| Academic | student record (`category:'student'`, `chatEngine.js:2723`) | today: free-text strings only |
| Credential / CE | credential (`category:'credential'` + `expiry`, `chatEngine.js:2811`) | today: free-text strings only |

DTCs live in `digitalTitleCertificates`; the logbook is the append-only event stream on the record. **The gap is depth:** the student/credential logbook entries are currently untyped strings (`{ entry, date, time }`), so there are no graded events to optimize against.

The aviation **hours + currency + endorsement** model is the closest existing analog to nursing **clinical hours + competency check-offs** — reuse it, don't reinvent it.

---

## Architecture decision — Vault = system of record, worker = adjacent reader

The learning record lives in the **Vault**, *not* inside Ruthie's worker. **Expand the Vault** to make "Learning Record" a first-class type (DTC + typed logbook); build the **Student Evaluation Worker as a vault-adjacent, stateless reader that owns no data.** These aren't either/or — it's a clean division of labor.

**Why the record belongs in the Vault:**
- **Student ownership + portability (FERPA):** the record follows the student across schools and into employment. Only works if it's Vault-owned, not locked inside one school's worker.
- **Reuse = the marketplace thesis:** one Vault learning record → many workers read it (evaluation, CE/renewal, academic advising, employer verification). Data trapped in a worker can't be reused.
- **Defensible IP:** the append-only record model is the moat — not the worker UI (CLAUDE.md invariant #4).
- **Survives the worker:** workers come and go; the transcript / clinical-hours record must persist regardless.

**Why the worker stays adjacent (owns nothing):**
- Platform invariant: *"AI agents are stateless executors."* The worker reads DTC + logbook, computes evidence-first analytics, proposes insights — it never becomes the system of record.
- The same worker pattern is then reusable for CE, advising, employer verification, etc.

**This is mostly enrichment, not net-new infra.** The Vault already has the scaffolding — `category:'student'` DTC, `MyCertifications`, `MyLogbook`, `VaultDTCs`. "Expanding the Vault" here means enriching the existing DTC + logbook with the typed schema (Part A) + a "Learning Record" Vault view + the FERPA grant model (Part B) — not building a second store.

| | **VAULT** (expand) | **WORKER** (Ruthie's — adjacent) |
|---|---|---|
| Owns | the record (DTC + logbook), append-only | nothing — stateless |
| Controls | student grants, FERPA access, portability | reads granted records only |
| Ingestion | LMS import / attestation land **here** | — |
| Produces | the durable record | evidence-first analytics, study plans, readiness |
| Lifespan | permanent, follows the student | swappable; one of many readers |

---

## PART A — Typed logbook-entry schema

### A.1 Learner DTC (the anchor)

Extends the existing `student` / `credential` DTC. One DTC = one credential journey (an enrollment, a license, a CE track).

```jsonc
{
  "dtcId": "dtc_...",
  "category": "learning_record",
  "subtype": "enrollment" | "license" | "ce_track",
  "holderUserId": "uid",                 // STUDENT owns it (their Vault)
  "institution": { "name": "...", "id": "..." },   // school / board
  "program":     { "name": "BSN", "id": "...", "level": "undergraduate", "cohort": "2027" },
  "externalIds": { "studentId": "...", "lmsUserId": "...", "licenseNumber": "..." },
  "objectiveSetId": "objset_...",        // ref to the program's objective taxonomy (A.4)
  "status": "active" | "completed" | "withdrawn" | "expired",
  "startedAt": "2025-08-25",
  "expectedCompletion": "2027-05-15",
  "expiry": null,                        // drives CE/license renewal when set
  "createdAt": "...",
  "anchor": { /* RECORD_ANCHORS: notary/escrow/chain */ }
}
```

### A.2 Logbook entry (the typed event) — **the core of this spec**

Append-only. Attached to a DTC. General across verticals; rich enough for nursing.

```jsonc
{
  "entryId": "le_...",
  "dtcId": "dtc_...",
  "kind": "enrollment" | "assessment" | "clinical_hours" | "competency"
        | "ce_activity" | "remediation" | "note" | "document",

  "course": { "id": "NUR320", "name": "Pharmacology", "term": "Fall 2025" },  // optional

  // --- assessment (kind=assessment) ---
  "assessmentType": "quiz" | "exam" | "assignment" | "final" | "standardized",
  "score": 82, "maxScore": 100, "percent": 82, "weight": 0.25,
  "passingScore": 75, "passed": true,

  // --- clinical / competency (the aviation-hours analog) ---
  "hours": 8,                                         // kind=clinical_hours
  "competency": { "id": "med-admin", "name": "Medication Administration", "level": "independent" },
  "result": "met" | "not_met" | "remediate",          // kind=competency
  "site": "Maui Memorial — Med/Surg",

  // --- learning localization (enables "weak area" analysis) ---
  "objectives": ["pharm-dosage", "pharm-interactions"],   // maps to A.4 taxonomy
  "topics": ["pharmacology", "dosage-calculation"],

  // --- provenance / trust (NO-FABRICATION, EH-01) ---
  "source": "lms:canvas" | "instructor" | "student" | "document_extract" | "board_feed",
  "sourceRef": "canvas:submission:12345",
  "attestedBy": { "userId": "uid", "role": "instructor|preceptor|registrar", "at": "..." } | null,
  "confidence": 1.0,                                  // <1 for extracted/uncertain data

  // --- temporal + audit ---
  "occurredAt": "2025-10-14",
  "recordedAt": "2025-10-15T09:02:00Z",
  "documents": [{ "name": "exam.pdf", "path": "...", "url": "..." }]
}
```

### A.3 Append-only invariant — state is COMPUTED, never stored

Consistent with the platform's core invariant. The worker derives, never overwrites:

- **GPA / course grade** = weighted roll-up of `assessment` entries.
- **Clinical hours** = sum of `clinical_hours.hours` (exactly the aviation flight-hours pattern).
- **Competencies met** = latest `competency` result per `competency.id`.
- **CE status** = sum of `ce_activity.hours` vs. board requirement, against DTC `expiry`.
- **NCLEX / readiness** = derived estimate (always disclosed as an estimate).

### A.4 Objective taxonomy (the "optimize learning" enabler)

A lightweight per-program objective set (`objectiveSetId`). Entries tag `objectives[]`. This is what lets the worker say *"weak in pharmacodynamics across 3 assessments"* instead of just *"GPA 3.1"*. For nursing, seed from the program's course objectives / NCLEX test plan categories.

### A.5 Worked examples

```jsonc
// Pharmacology exam (from the LMS)
{ "kind":"assessment", "course":{"id":"NUR320","name":"Pharmacology"},
  "assessmentType":"exam", "score":82, "maxScore":100, "weight":0.25,
  "objectives":["pharm-dosage"], "source":"lms:canvas", "occurredAt":"2025-10-14" }

// Clinical rotation hours (preceptor-attested — the aviation-hours analog)
{ "kind":"clinical_hours", "hours":8, "site":"Maui Memorial — Med/Surg",
  "source":"instructor", "attestedBy":{"role":"preceptor","userId":"uid","at":"..."},
  "occurredAt":"2025-10-16" }

// Competency check-off
{ "kind":"competency", "competency":{"id":"med-admin","name":"Medication Administration","level":"independent"},
  "result":"met", "source":"instructor", "attestedBy":{"role":"preceptor",...} }

// Professional CE activity (on a subtype:'license' DTC with expiry)
{ "kind":"ce_activity", "course":{"name":"Sepsis Update"}, "hours":2,
  "topics":["critical-care"], "source":"document_extract", "confidence":0.9,
  "documents":[{"name":"ce-cert.pdf","path":"..."}] }
```

---

## PART B — Ingestion + FERPA model (one-pager)

### B.1 Where entries come from (provenance-first)

The worker can only be evidence-first if every entry has a trustworthy source. No source → it cannot be cited → the worker won't assert it.

| Path | Use | Provenance | Priority |
|---|---|---|---|
| **LMS import** (Canvas / Blackboard / Moodle API) | courses, assignments, quiz/exam grades | high — `source:lms:*` | **P0** — the unlock for a university program |
| **Instructor / preceptor attestation** | clinical hours, competency check-offs (not in LMS) | high — `attestedBy` | **P0** for nursing |
| **Student manual entry** | gaps, prior coursework | low — flag for attestation | P1 |
| **Document upload + extract** | transcripts, CE certificates | medium — `confidence`, flag for attestation | P1 |
| **Board / registrar feed** | license + CE verification | high | P2 (future) |

**Recommendation:** lead with **Canvas LMS import** (most nursing programs run Canvas or Blackboard) + **instructor attestation** for clinical/competency. That covers ~90% of a nursing program's record with real provenance.

### B.2 Trust model

- Graded academic events: trusted from the **LMS** or **registrar**.
- Clinical hours / competencies: require **preceptor/instructor attestation** (`attestedBy`).
- Student- or document-sourced entries: enter as `confidence < 1` and are **flagged for attestation** before the worker treats them as authoritative.

### B.3 FERPA — the education HIPAA (first-class, and a selling point)

Student education records are federally protected (FERPA), exactly as health data is under HIPAA. We already PHI-scrub for health verticals; apply the same posture here.

- **Ownership:** the student owns the record (`holderUserId` = their Vault). Records are **portable** — they follow the student across schools and into employment. *This is a differentiator, not just a constraint.*
- **Institutional access via grants:** schools/instructors read student records only through the existing **memberships** model, scoped to their program/cohort — never a global read.
- **Consent + revocation:** the student grants school access and can export or revoke it.
- **Audit (Deposition Rule):** every read and write is an append-only event — who saw what, when.
- **Minimization:** the worker reasons over **structured fields**, not raw PII dumps; scrub identifiers before any model call, same as the PHI path.
- **Retention / deletion:** append-only, but support FERPA deletion/redaction via tombstone entries rather than destructive overwrite.

### B.4 The evaluation worker contract (build-on-top)

Reads DTC + logbook, computes **evidence-first**:
- Mastery heatmap by **objective** (A.4) → names weak areas with the entries that prove it.
- At-risk flags (trend across assessments).
- Clinical-hours progress vs. program requirement; competencies outstanding.
- NCLEX / readiness **estimate** (disclosed as an estimate, never a guarantee).
- Recommended study plan tied to weak objectives.

**Hard rule (EH-01):** every insight cites `entryId`s. The worker **never invents a grade, hour, or competency.** If data is missing, it says so (same discipline as Site Recon / "what still needs a deeper pull").

### B.5 Canvas (Trump Rule)

The worker's canvas is a **mastery / competency / clinical-hours dashboard** — one glance shows: on-track or at-risk, mastery heatmap, hours progress ring, competencies remaining. Not a transcript table — a cockpit.

---

## Phased build plan

1. **Schema** — add the typed logbook-entry model + `learning_record` DTC subtype (extend the existing `student`/`credential` flows, don't fork them).
2. **Ingestion** — Canvas LMS import connector (P0) + instructor/preceptor attestation for clinical hours & competencies (P0).
3. **Evaluation worker** — evidence-first analytics over the logbook (mastery, at-risk, readiness, study plan).
4. **Canvas** — the mastery/competency/hours dashboard.
5. **CE variant** — reuse the whole stack for professional CE: `license` DTC + `ce_activity` entries + renewal-readiness vs. `expiry`.

**Highest-leverage first step:** the typed/attested entry schema + one real ingestion path (Canvas). Without real graded events flowing in, the worker has nothing to optimize — same lesson as Site Recon shining only on real data.
