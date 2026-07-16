# CODEX 39 — Clinical Education Vertical
## The Immutable Student Record Platform for Accredited Clinical Programs

**Status:** v1.0 — reference implementation live (Makai School of Nursing demo)
**Vertical key:** `education` · **Suite:** `Clinical Programs`
**Primary creator:** Ruthie Clearwater (nursing); generalizes to all clinical health professions
**Audience for this CODEX:** Platform builders, school administrators, Ruthie in sales conversations

---

## 0. The One-Sentence Pitch

> Every clinical program produces students whose competence must be provable — to accreditors, to licensing boards, to employers. Today that proof lives in spreadsheets, email threads, and LMS gradebooks that no one fully trusts and no student owns. This platform is the substrate that makes it provable, portable, and permanent.

---

## 1. The Problem That Exists in Every Accredited Clinical Program

Regardless of institution size, type, or specialty, every accredited clinical program shares the same structural problem:

**The record is fragmented across systems that don't talk to each other:**
- The LMS (Canvas, Blackboard, Moodle) holds grades but not clinical observations
- Clinical hours live in a spreadsheet the coordinator maintains manually
- Competency sign-offs travel by email between preceptors and coordinators
- ATI/HESI/board-prep scores arrive as CSV exports that someone types into another spreadsheet
- The student's record at graduation is a printout — not portable, not signed, not verifiable

**The accreditor's question is never answered fast:**
- When ACEN, CCNE, CAPTE, CODA, or any state board asks "show us your competency attainment data for the Class of 2027," the coordinator spends two weeks assembling it from six different sources
- If a student disputes a grade or competency status, there is no auditable chain of evidence — just someone's memory of what happened

**The student owns nothing:**
- At graduation, the record stays with the institution
- If the student transfers, the receiving program starts over
- When they apply for licensure, they reconstruct their record from memory

This is not a nursing problem. It is a clinical education infrastructure problem. It exists identically in nursing, physical therapy, occupational therapy, respiratory therapy, dental hygiene, EMS/paramedic, and any other regulated clinical profession that requires documented competency before licensure.

---

## 2. What This Platform Does (The Value Principles)

These principles hold regardless of institution or specialty:

### Principle 1 — The Record is Append-Only and Signed
Every event that matters — a clinical hour logged, a competency observed, an ATI score delivered, an instructor attestation — writes a new record. Nothing is overwritten. The audit trail is complete, chronological, and permanently verifiable. A student who disputes a grade has a timestamped record of every event that contributed to it. An accreditor who asks for evidence gets it in seconds, not weeks.

### Principle 2 — The Student Owns Their Record
At graduation, the student's competency record is exportable in a signed, open format. It doesn't disappear when they leave. It doesn't require the institution to still exist. It is theirs — and employers and licensing boards can verify it without calling the school.

### Principle 3 — The LMS Stays — This Platform Adds the Layer Canvas Can't
Canvas handles scheduling, content delivery, and the gradebook. This platform handles the immutable record, the competency attestation, and the AI workers that run on top of it. They are not competitors. The LMS and this platform connect via LTI 1.3 — scores flow from board-prep tools (ATI, HESI) through the LTI standard directly into the immutable record, with no CSV, no manual entry, no middleware.

### Principle 4 — Rules Govern the AI, Not Prompts
The five Digital Workers that run on this substrate are constrained by a ruleset (`nursing_clinical_v1` for the reference implementation) that enforces: no fabricated scores, no premature competency sign-offs, no NCLEX/licensure readiness declarations without data, content citation required. These rules are tenant-configurable — a dental program tightens different rules than a nursing program — but the platform enforces them regardless of what the user asks.

### Principle 5 — The Instructor Is Never Bypassed
The propose → approve → anchor flow means AI workers can surface data and recommend actions, but no competency is marked complete without a real instructor attestation event in the record. The AI prepares and organizes; the credentialed educator decides. This is the architecture that survives regulatory scrutiny.

---

## 3. The Five Workers — What Each One Does and Why It Generalizes

The five workers are named for the Makai reference implementation. Each one maps to a function that exists in every clinical program.

### Worker 1 — Student Record Worker
**Makai slug:** `nursing-records-001`
**The function:** Cohort overview + individual student record, including clinical hours, course grades, competency attainment log, and instructor attestations.
**Why it generalizes:** Every accredited program tracks the same structure — enrolled students, required clinical hours, competency checklist, instructor sign-offs. The data model is identical across nursing, PT, OT, respiratory, dental, EMS. The worker adapts by swapping the competency checklist and hour minimums.
**The demo moment:** "Ask this worker what's holding Jordan back from NCLEX readiness. It cites the exact records — two unsigned competencies and 313 hours short — without any estimation."

### Worker 2 — Course Delivery Worker
**Makai slug:** `nursing-courses-001`
**The function:** Active course roster, module-level progress, board-prep score integration (ATI, HESI, NBDHE, etc.), graded assignment tracking that writes to the student record on completion.
**Why it generalizes:** Every program has courses. The board-prep tool changes (ATI for nursing, NBDHE for dental, NPTE for PT) but the LTI integration pattern is identical — score arrives via AGS 2.0 grade passback, lands in the immutable record. The content layer is open (OpenStax, Open RN, institutional OER) — no proprietary lock-in.
**The demo moment:** "Click Simulate ATI Score. Watch the score arrive, update the gradebook, and mint a logbook entry — all in one action. This is exactly how a real ATI score would flow from your institution's existing ATI license."

### Worker 3 — AI Tutor Worker
**Makai slug:** `nursing-tutor-001`
**The function:** Student-facing AI tutor that knows the course content, maps questions to licensure-exam competency domains, and prepares students without grading them.
**Why it generalizes:** Every clinical student needs exam preparation. The tutor adapts to the licensure exam — NCLEX-RN, NCLEX-PN, NPTE, NBDHE, NREMT. The constraint is universal: the AI helps students identify gaps and study targeted content, but does not declare readiness. That is always a human clinical judgment.
**The demo moment:** "Ask the tutor what Maya should study before her pharmacology module. It reads her course progress from the record and gives a specific, cited recommendation — not a generic study guide."

### Worker 4 — Interdisciplinary Comms Worker
**Makai slug:** `nursing-comms-001`
**The function:** Faculty queue for pending attestations, preceptor portal for off-campus clinical supervisors, and the propose → approve → anchor flow that closes the loop between field observation and the student's record.
**Why it generalizes:** Every program has preceptors or clinical supervisors who observe students off-campus and need a way to report back. Today that's email. This worker replaces the email with a secure, signed, auditable attestation that goes directly into the record. The preceptor doesn't need a full platform login — they get a secure link, attest, and the record is updated.
**The demo moment:** "Show the faculty queue. Three attestations pending — Jordan's two competencies and Noah's preceptor evaluation. Click approve on one. Watch it flip from pending to verified and append to the student's record. That's the entire flow."

### Worker 5 — Accreditation & Compliance Worker
**Makai slug:** `nursing-accreditation-001`
**The function:** Dean-level dashboard — cohort NCLEX readiness distribution, clinical hours summary flagged against minimums, board-prep score distributions by module, and the audit package that answers an accreditor's question in seconds.
**Why it generalizes:** ACEN, CCNE, CAPTE, CODA, CoARC — every accrediting body has a site visit. Every site visit asks "show us your outcome data." This worker assembles it from the same records that are being built all year, rather than from a manual export the coordinator assembles the night before. The standards change by specialty and accreditor, but the underlying pattern — append evidence all year, export the audit package on demand — is universal.
**The demo moment:** "Ask the worker to show NCLEX readiness distribution for the Class of 2028. Then ask it to flag which students are at risk of not meeting the clinical hours minimum before graduation. Both answers come from the same live records — no spreadsheet assembly required."

---

## 4. The Technology Spine (What Institutions Are Actually Buying)

When a school evaluates this platform, the surface is the five workers. The defensible value — what they cannot build themselves in a reasonable timeframe — is the substrate:

| Layer | What it is | Why it's hard to replicate |
|---|---|---|
| **Append-only record** | Firestore event store — every write is a new document, nothing is overwritten | The architecture, not just the code — institutions that built their own systems built mutable databases and can't go back |
| **Instructor attestation flow** | Propose → approve → anchor with digital signature | The legal and regulatory weight of a signed, anchored attestation is different from a checkbox in a spreadsheet |
| **LTI 1.3 Platform** | OIDC handshake, JWK endpoint, AGS grade receiver, NRPS roster endpoint | Existing LMS platforms took years to build their LTI Platform stacks; this one is a service, not an on-premise install |
| **RAAS rules engine** | Tenant-configurable rules that govern what AI workers can and cannot say or do | The rules travel with the deployment — a school configures their competency thresholds without touching code |
| **Portable student record** | Signed, open-format export the student owns at graduation | No current LMS produces a student-owned, verifiable, portable record — this is a gap in the entire market |

---

## 5. What This Is NOT

Explicitly — to prevent scope creep in sales conversations:

- **Not an LMS.** Canvas, Blackboard, and Moodle keep their jobs. This platform is the layer those systems don't have.
- **Not a scheduling tool.** Clinical rotation scheduling, room booking, and faculty assignment live elsewhere.
- **Not an electronic health record.** No PHI is stored here. Clinical observations are competency assessments, not patient records.
- **Not a board-prep platform.** ATI, HESI, and other board-prep tools stay — they integrate via LTI. This platform receives their scores; it doesn't replace their content.
- **Not a replacement for ACEN/CCNE compliance consulting.** The platform generates the data that supports accreditation; it doesn't interpret the standards or provide legal advice on compliance.

---

## 6. How the Pricing Model Works (Two-Tier — Keep Separate)

**What the school pays the creator (e.g., Ruthie):**
This is the creator's pricing decision. A working illustration is $99/month per institution + $5/month per active student. These numbers have NOT been confirmed with SOCIII and Ruthie has NOT locked them with any school. Do not quote to a dean as settled pricing.

**What the creator pays SOCIII:**
Platform subscription + pre-funded compute credits + per-event minting fees. This is governed by CODEX 36 (creator economics). It is separate from and unrelated to what the school pays.

**The creator's margin:**
The gap between what the school pays and what SOCIII charges. The creator sets their own price; SOCIII takes the platform fee; the creator keeps the difference. This is the "Business in a Box for Schools" model.

---

## 7. The Reference Implementation — Makai School of Nursing

The demo environment is a fictional nursing school called Makai School of Nursing ("makai" = toward the ocean in Hawaiian), built to evoke a University of Hawaiʻi context without impersonating any real institution.

**What's seeded:**
- Tenant `demo-makai-nursing` with `demoMode: true` and `mintingExempt: true`
- 6 named demo students: Jordan Chen (at-risk), Maya Kahale (on-track), Leilani Akana (ready), Noah Ferreira (on-track), Aiko Tanaka (on-track), Marcus Webb (at-risk)
- 12 background cohort students (no individual stories)
- 2 instructors: Dr. Kealani Moku, Prof. Ana Rodrigues
- 2 courses: NSG 201 Fundamentals, NSG 312 Pharmacology
- 3 competency records with pending/verified states

**What's live:**
- All 5 workers respond to chat and read from Firestore
- `GET /v1/nursing:cohort` — cohort overview
- `GET /v1/nursing:student` — individual student record
- `POST /v1/demo/ati-score-event` — ATI simulation (LTI AGS passback)
- `POST /v1/nursing:competency:attest` — instructor sign-off
- RAAS ruleset `nursing_clinical_v1` enforced on all 5 workers

**What's needed before Ruthie's first live walkthrough:**
- [ ] Ruthie's UID added to `demo-makai-nursing` tenant as `role: "instructor"` (pull from Firebase Auth console)
- [ ] Hawaiian names confirmed by Ruthie as authentic-feeling
- [ ] Pricing confirmed with Sean before quoting any number to a school

---

## 8. How to Adapt This for a Different Institution or Specialty

The reference implementation is nursing. To adapt:

1. **Change the ruleset** — swap `nursing_clinical_v1` for a specialty-specific ruleset (e.g., `pt_clinical_v1` for PT programs). The new ruleset governs which score thresholds, which board-prep exam, and which competency framework applies.
2. **Change the course content** — OpenStax has nursing, anatomy, pharmacology. Open RN covers nursing. For PT, OT, or dental, the institution supplies their OER or commercial content; the platform handles delivery and attribution.
3. **Change the accreditor references** — ACEN/CCNE for nursing, CAPTE for PT, CODA for dental. The Accreditation Worker templates update to cite the relevant standards.
4. **Keep the data model** — the student record structure (clinical hours, competency attainments, logbook entries, instructor attestations) is identical across specialties. No schema changes needed.
5. **Keep the 5-worker pattern** — every clinical program needs records, courses, tutoring, communication, and accreditation reporting. The names change; the architecture doesn't.

**Time to adapt:** With the reference implementation live, adapting to a new specialty is a configuration and ruleset change — not a rebuild.

---

## 9. Open Decisions

1. **FERPA DPA template** — for a real institutional deployment at a public university, a FERPA-compliant DPA is required. A template is in Downloads (held per Option B pending counsel). Do not deploy to a real institution without this in place.
2. **VPAT / WCAG 2.1 AA** — required for public university procurement. Not yet certified. Flag honestly in any sales conversation.
3. **Ruthie's pricing** — needs to be confirmed with Sean before any school conversation. Two separate numbers: what the school pays Ruthie, and what Ruthie pays SOCIII.
4. **ATI contract language** — "ATI integrates via LTI 1.3" is accurate. "ATI is integrated" is not — the demo simulates the integration. A real deployment requires the institution's existing ATI license and Ascend Learning's confirmation.
5. **Creator economics model** — CODEX 36 governs what Ruthie pays SOCIII. This has not been finalized in writing with Ruthie.
6. **Other clinical specialties** — PT, OT, dental hygiene, respiratory therapy, EMS are all natural next deployments. Who builds them is an open question — a new creator per specialty, or Ruthie licensing a broader clinical education platform.

---

## 10. Connection to Platform CODEX Stack

| CODEX | What it covers | Relation to this one |
|---|---|---|
| CODEX 14 | Nursing LMS — signed Vault + capability menu | Earlier strategic framing; this CODEX supersedes for build decisions |
| CODEX 38 | Makai demo workspace (operations manual) | Demo-specific; this CODEX is the generalized version |
| CODEX 36 | Creator economics | Governs what Ruthie pays SOCIII |
| CODEX 22 | Five verticals + canonical keys | `education` vertical + `Clinical Programs` suite locked here |
| docs/learning-record-substrate.md | DTC + logbook record architecture | The data model this vertical runs on |
| docs/NURSING-LMS-BRIEF.md | Full strategic brief | Read before any institutional sales conversation |
