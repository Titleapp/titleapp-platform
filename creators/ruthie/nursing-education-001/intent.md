# Worker: nursing-education-001

**Creator:** Ruthie Clearwater (`ruthiec@hawaii.edu`)
**Status:** First draft — building parallel to Ruthie's existing Apps Script tool, demo-ready target 2026-06-02 (Tuesday faculty session)
**Working title:** "Nursing Education" — final name TBD by Ruthie

## What it does

A longitudinal student record system for nursing programs. Follows each student from program entry to graduation across courses, cohorts, clinical sites, and instructors — in one tamper-proof place that the institution doesn't lose.

Replaces the current scattered-document workflow (Word files + Google Docs shared one-to-one between students and instructors) with a single shared canvas where every clinical reflection, every SLO observation, every grade, and every instructor note lives together, indexed by student, queryable by anyone with the right role.

Built on the **Tanner Clinical Judgment Framework** (Noticing → Interpreting → Responding → Reflecting), with **ANA Standards of Practice** mapped to each Student Learning Outcome.

## Who uses it

**Program admin** (Ruthie's role):
- Creates rubrics + SLO definitions
- Manages cohorts (currently 7 active: Faculty Playground, ASN20, others)
- Onboards instructors + clinical sites
- Sees program-wide outcomes + at-risk students across all courses
- Owns the audit trail

**Instructors** (~7 active on Tuesday, more later):
- Grade student reflections
- Observe SLO competencies during clinical rotations
- Support struggling students (chat asks "where is Maya struggling?")
- See their cohort's progress at a glance

**Students** (~20-30 in program):
- Submit clinical reflections (Tanner framework prompts)
- See their own journey across courses
- Track their SLO progression toward graduation requirements
- Export their full record (FERPA portability)

## What success looks like

**For the user (measurable time budgets — bugs if exceeded):**
- Student writes a reflection in ≤ 10 minutes
- Instructor grades a reflection in ≤ 2 minutes (90 seconds is the bar)
- Instructor checks "who's behind this week" in their cohort in ≤ 5 seconds
- New instructor onboarded in one click (single invite link)
- New SLO or rubric authored by admin in ≤ 1 minute

**For the program:**
- A locked grade cannot be modified — by anyone, including the instructor who locked it
- 3 years of student observations are recoverable, exportable, and verifiable
- An accreditation review can be answered with a query, not a panic
- A student can show a verified transcript to a future employer or licensing board
- The institution doesn't depend on a personal Google account for student records

**For Tuesday (2026-06-02 faculty session):**
- 3-4 of 7 instructors commit to piloting in fall semester
- All 7 leave saying "I'm interested, keep me posted" (no active rejection)
- Boss (already supportive) confirms continued backing

## What this worker is NOT

- **Not an LMS replacement.** Doesn't replace Canvas / Blackboard / Brightspace for course materials, lectures, quizzes. Focused specifically on clinical reflection + competency tracking.
- **Not a degree-granting system.** Records competencies; the institution issues the degree.
- **Not a curriculum management system.** Curriculum lives elsewhere; this tracks student progress against it.
- **Not FERPA-certified.** It is FERPA-friendly by architecture (audit trail, identity verification, encrypted storage, portable exports), but certification is per-institution-deployment and requires the institution's privacy office + a Data Processing Agreement. Tuesday demo target: demo-able. Production target: Q3 2026 with institutional process.

## Why this dovetails with the SOCIII platform

| Need | Platform capability |
|---|---|
| Tamper-proof grades | Append-only event store + chain anchor (patent 64/073,700) — locked grade cannot be modified by anyone |
| Multi-instructor visibility across courses | Multi-tenant workspace model with role-scoped reads |
| Student support via chat | Alex chat layer with grounded queries against real cohort data |
| FERPA-defensible audit | Every read, write, grade-lock, and unlock attempt logged with verified identity (Stripe Identity) |
| Recoverable storage | Firestore + point-in-time recovery; event log replay |
| Portable student record | One-click full export at any time, including all observations, reflections, and grades |
| Verifiable transcripts | Public chain anchor — third parties (employer, board, accreditor) can verify a grade independently |

## Existing data Ruthie has built (will be imported on Sunday)

From `Master Config Sheet`:
- **5 nursing courses**: NURS 210 (Health Promotion Across the Lifespan), NURS 220 (Health & Illness I), NURS 230 (Clinical Immersion I), NURS 320 (Family Nursing), NURS 360 (Complex Care)
- **46 SLOs** with criteria + ANA Standards mapping
- **46 reflection templates** using Tanner framework with subcategory prompts and closing prompts
- **32 clinical sites** including Hale Makua (LTC), Kula Hospital (LTC), and others across Maui/Hawai'i
- **26 instructors** mapped to courses and sites
- **7 cohorts** including Faculty Playground and ASN20

The migration script will pull all of this into SOCIII's Firestore as the demo dataset, so Tuesday shows Ruthie's real program — not invented data.

## Audit-anchored events (what gets recorded permanently)

Every action that changes a student's record emits an event to the append-only log. Locked events are also anchored to the public chain:

- `reflection.submitted` — student turns in a reflection
- `slo.observed` — instructor records a competency observation
- `grade.locked` — instructor marks a grade final (chain-anchored)
- `grade.unlock_attempted` — anyone (including original instructor) tries to modify a locked grade → rejected, event logged
- `student.enrolled` — admin enrolls a student in a cohort
- `instructor.assigned` — admin assigns an instructor to a course/site
- `record.exported` — student or admin exports a record (FERPA disclosure log)

## Open questions for Ruthie (resolve before Monday)

1. **Worker name** — "Nursing Education" is a placeholder. If you want it branded as part of UH Mānoa, say so. If you want it as a tool of yours (Clearwater Nursing, Lokahi Nursing, etc.), name it.
2. **Workspace branding** — Logo, color accent, anything specific to your program?
3. **Demo data scope** — for Tuesday, do we show real student names (with their consent) or anonymized ("Student A", "Student B")?
4. **One existing student** to feature as "Sarah" in the longitudinal demo — pick someone whose journey across NURS 210 → 220 illustrates the platform well.

## Cross-references

- [[ruthie-developer-pattern]] — strategic context for why Ruthie is the prototype creator
- [[open-sdk-closed-platform-thesis]] — the business model this worker proves
- [[qa001-success-metric]] — assertions in `tests/assertions.md` are written before the build
- Existing platform docs: `docs/CREATOR-WORKER-BUILD.md`, `CLAUDE.md`
