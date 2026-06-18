# Learning Record Substrate — Spec

**Status:** Canonical architecture (reframed 2026-06-09)
**Driver:** Ruthie Clearwater's evaluation worker (University of Hawai‘i nursing). Generalizes to **all education + professional CE.**
**Thesis:** The educational record is a **Vault function** (core DTC + Logbook), *not* a worker. Workers are thin **pens** (write) and **lenses** (read) over the same student-owned record.

---

## 0. Why this exists — the problem

Institutions hold only **coarse** records. Even *within* a single college (UH), departments often can't access or share granular course-level data: you can see that a student **registered for a course** and got a **pass/fail grade** — but not the assessments, competencies, clinical hours, or materials underneath. That granularity is siloed across LMS instances, instructor gradebooks, and preceptor sign-offs. It's never assembled, never portable, and the institution itself can't easily produce it.

**The fix:** a **student-owned record in the Vault** where the granular data lives — append-only and attested — that the student carries across courses, schools, and into employment, and grants access to whoever needs it. The institution doesn't assemble it; **the record assembles itself as writers contribute.** That portability + granularity is the moat.

---

## 1. The architecture — three layers

```
┌─ LAYER 1 · THE RECORD (Vault) ─────────────────────────────┐
│  Educational Record = DTC (enrollment/credential anchor)    │
│                     + append-only, typed Logbook            │
│  INTAKE: KYC-1 ID check · capture student ID · upload-or-   │
│          attest (Reagan rule)                               │
│  Student OWNS it · grants scoped access (FERPA) · UNIVERSAL  │
│  >>> NOT a worker. One place. All education + CE inherit. <<<│
└─────────────────────────────────────────────────────────────┘
      ▲ write (attested)                 │ read
      │                                  ▼
┌─ LAYER 2 · WRITER workers ─┐   ┌─ LAYER 3 · READER workers ──┐
│ Teacher course-evaluation  │   │ Student-eval (Ruthie's)     │
│ Preceptor competency check │   │ CE / license renewal        │
│ LMS import connector       │   │ Academic advisor            │
│ → GENERATE attested logbook│   │ Employer verification       │
│   entries at the Vault     │   │ → READ + derive · own nothing│
└────────────────────────────┘   └─────────────────────────────┘
```

### Layer 1 — THE RECORD (Vault). Owns it.
The Educational Record is an instance of the platform's universal **DTC + append-only Logbook** (same substrate as the auto VIN record and the aviation logbook).
- **Intake — how a record is created** (this is the onboarding, and it lives here, not in a worker):
  1. **KYC-1 ID check** (Stripe Identity) — an education record must tie to a *real, verified person* (FERPA + credential integrity). Gated via the capabilities registry (`requiredKyc: KYC-1`).
  2. **Capture student ID / enrollment** → mints the enrollment **DTC**.
  3. **Upload-or-attest** each record (see provenance below).
- **Reagan rule — "trust but verify":** when the evidence isn't in hand (e.g. someone's old college transcripts), the student makes a **signed self-statement** → entered as a logbook entry with `source: student`, `confidence < 1`, flagged **"attestation pending."** The worker treats it as *claimed, not proven* and surfaces what still needs verification. A later registrar pull / LMS import / uploaded doc flips it to **verified**. This lets someone start *now* without being blocked on paperwork.
- **FERPA grants:** the student owns the record and grants scoped access (their school, a program, an employer). Revocable, auditable.
- **Universal:** built **once**; every education + CE vertical inherits it. No worker is required to *have* an educational record.

### Layer 2 — WRITER workers. Generate entries.
Pens. They **write attested logbook entries** to enrolled students' Vault records, under the FERPA grant the student gave their school.
- **Teacher course-evaluation worker** (Ruthie's brokerage of this idea): evaluates students in a course → writes grades / competency check-offs to each student's record, **teacher-attested**. *This is how the granularity the institution couldn't assemble gets into the Vault.*
- **Preceptor competency check-off**, **LMS import connector** (Canvas/Blackboard) — same pattern, different provenance.

### Layer 3 — READER workers. Consume + derive.
Lenses. They **read and compute, evidence-first** — own nothing, stateless.
- **Student-eval** (the worker already built, `student-eval-001`): mastery-by-objective, at-risk flags, clinical-hours progress, readiness estimate, study plan.
- **CE / license renewal**, **academic advisor**, **employer verification** — all read the same record.

---

## 2. The record schema (Layer 1 detail)

### 2.1 Learner DTC (the anchor)
```jsonc
{
  "dtcId": "dtc_...", "category": "learning_record",
  "subtype": "enrollment" | "license" | "ce_track",
  "holderUserId": "uid",                              // STUDENT owns it
  "institution": { "name": "University of Hawai‘i", "id": "..." },
  "program": { "name": "BSN", "level": "undergraduate", "cohort": "2027" },
  "externalIds": { "studentId": "...", "lmsUserId": "...", "licenseNumber": "..." },
  "objectiveSetId": "objset_...",                     // program objective taxonomy (2.3)
  "kyc": { "level": "KYC-1", "verifiedAt": "..." },   // intake gate
  "status": "active" | "completed" | "withdrawn" | "expired",
  "expiry": null                                       // drives CE/license renewal
}
```

### 2.2 Logbook entry (the typed event) — the core
Append-only. Attached to a DTC.
```jsonc
{
  "entryId": "le_...", "dtcId": "dtc_...",
  "kind": "enrollment" | "assessment" | "clinical_hours" | "competency"
        | "ce_activity" | "remediation" | "note" | "document",
  "course": { "id": "NUR320", "name": "Pharmacology", "term": "Fall 2025" },
  // assessment
  "assessmentType": "quiz" | "exam" | "assignment" | "final" | "standardized",
  "score": 82, "maxScore": 100, "weight": 0.25, "passed": true,
  // clinical / competency (aviation-hours analog)
  "hours": 8, "competency": { "id": "med-admin", "name": "Medication Administration" },
  "result": "met" | "not_met" | "remediate",
  // localization (enables weak-area analysis)
  "objectives": ["pharm-dosage"], "topics": ["pharmacology"],
  // provenance / trust (no-fabrication, EH-01)
  "source": "lms:canvas" | "instructor" | "student" | "document_extract" | "board_feed",
  "attestedBy": { "userId": "uid", "role": "instructor|preceptor|registrar", "at": "..." } | null,
  "confidence": 1.0,                                   // <1 for student-attested / extracted
  "verificationStatus": "verified" | "attestation_pending",
  "occurredAt": "2025-10-14", "recordedAt": "...",
  "documents": [{ "name": "exam.pdf", "path": "...", "url": "..." }]
}
```

### 2.3 Computed state + objective taxonomy
State is **derived**, never stored (append-only invariant): GPA/grade = weighted roll-up; clinical hours = sum; competencies met = latest per id; readiness = disclosed estimate. A per-program **objective taxonomy** (`objectiveSetId`) lets entries tag `objectives[]` — that's what turns "GPA 3.1" into "weak in pharmacodynamics across 3 assessments."

---

## 3. Intake, provenance & FERPA (Layer 1 detail)

### 3.1 Provenance-first ingestion
| Path | Use | Provenance | Verification |
|---|---|---|---|
| **LMS import** (Canvas/Blackboard) | courses, grades | high — `lms:*` | verified |
| **Instructor / preceptor attestation** (writer worker) | clinical hours, competencies | high — `attestedBy` | verified |
| **Document upload + extract** | transcripts, certificates, **student ID** | medium — `confidence` | pending → verified on review |
| **Student statement (Reagan rule)** | gaps, prior coursework with no doc | low — `source: student` | **attestation_pending** |
| **Registrar / board feed** | license + CE verification | high | verified |

### 3.2 FERPA — first-class, and a differentiator
Education records are federally protected (apply the same posture as PHI: scrub before model calls; access via the memberships grant model).
- **Ownership + portability:** the student owns it; it follows them across schools and into employment. *This is the thing UH can't do internally.*
- **Grants:** institutional access only through scoped, revocable, audited grants.
- **No-fabrication (EH-01):** every reader insight cites `entryId`s; never invent a grade/hour/competency; **attested-pending vs verified is always visible.**

---

## 4. Build order

1. **Vault — Educational Record + intake** (Layer 1): the "Add Educational Record" flow — KYC-1 → capture student ID (mint DTC) → upload-or-attest, with the Reagan-rule statement branch and the verified/pending flag. Built once; universal.
2. **Writer worker** (Layer 2): the **teacher course-evaluation worker** — generates attested entries into enrolled students' records (the granularity injector). This is the worker Ruthie is building.
3. **Reader** (Layer 3): `student-eval-001` already covers the analytics lens — keep it thin (reads the record, owns nothing).

**Highest-leverage first step:** the Vault intake (Layer 1) + one real writer path (teacher attestation and/or Canvas import). Without real entries flowing in, every reader is demoing on fixtures — the same lesson as Site Recon.

---

## 5. Worker examples (so the layers are concrete)
- **Ruthie's worker** → a **reader** (and/or a teacher-side **writer** for her course): evaluates her nursing students, and references/writes their Vault records.
- **`student-eval-001`** → a **reader**: mastery/readiness analytics over whatever record is loaded.
- **A teacher's course-evaluation worker** → a **writer**: turns a semester of grading into attested logbook entries at the Vault level — the granular layer institutions can't currently share.
