# Academia in a Box — Worker Bundle Specs

**Bundle:** `academia-in-a-box`
**Pricing:** $99/mo base + $5/active student
**Scope:** Universal — elementary through PhD. Platform-level tools only. Subject-specific workers are creator add-ons sold separately.
**Status:** Spec — implementation-ready

---

## 1. Syllabus-to-Worker

**Slug:** `edu-syllabus-worker`
**Tagline:** Upload your syllabus. Your course builds itself.

**Job:** Faculty upload a PDF or DOCX syllabus and the worker parses it into a live course — assignments, schedule, grading policy, reading list, and a Q&A assistant grounded in the course materials. This is the flagship onboarding action: a faculty member with no prior platform experience has a fully configured course in under five minutes. It serves both faculty (who author it once) and students (who use it daily for the rest of the term).

**Canvas Tabs:**

- **Course Overview** — Parsed course metadata: title, instructor, meeting times, location, term, credit hours, and contact info. Editable by faculty post-import.
- **Schedule** — Week-by-week calendar auto-generated from the syllabus. Each row shows topic, readings due, and assignments due. Faculty can drag-and-drop to adjust.
- **Assignments & Grading** — Full assignment list with due dates, point values, and the grading breakdown (weights per category). Auto-populates the Grade Tracker and Faculty Gradebook workers when enrolled.
- **Reading List** — All required and recommended materials extracted from the syllabus. Links to open-access sources where available; flags materials that need library or purchase access.
- **Ask the Syllabus** — AI Q&A grounded strictly in the uploaded course documents. Students ask questions; the worker answers from the syllabus text and returns a citation (page/section). Cannot hallucinate policy.

**Key Rules:**

1. All Q&A answers must cite the source document and section. If the answer is not in the uploaded materials, the worker must say so explicitly — it does not infer or fill gaps.
2. Faculty is the only role that can trigger re-parse, edit extracted fields, or mark the syllabus as final. Students have read-only access.
3. Once the syllabus is marked final, the generated schedule and assignment list propagate automatically to the Course Schedule and Grade Tracker workers for enrolled students — no manual re-entry.
4. The worker must surface a conflict flag if it detects contradictions in the syllabus (e.g., two assignments with the same due date, grading weights that do not sum to 100%).
5. No grade data is stored in this worker. It owns course structure only.

**Who uses it:** Faculty (author); Students (read + Q&A)

---

## 2. Course Schedule

**Slug:** `edu-course-schedule`
**Tagline:** Every class, deadline, and exam — one place, always current.

**Job:** Maintains the authoritative calendar for one course or a full semester load. Aggregates class meeting times, assignment due dates, exam blocks, and office hours into a single timeline. Students see their full multi-course load in one view; faculty see their course calendar and office hours. Neither group has to manually keep a separate planner.

**Canvas Tabs:**

- **Week View** — Rolling seven-day calendar showing all classes, due dates, and events across the student's enrolled courses (or the faculty member's taught courses). Color-coded by course.
- **Full Semester** — List view of the entire term. Sortable by date or by course. Exportable to iCal / Google Calendar.
- **Exams & Milestones** — Isolated view of midterms, finals, project presentations, and any graded events flagged as high-stakes. Surfaces countdown timers as dates approach.
- **Office Hours** — Faculty-posted office hours per course, with optional booking link. Students can see all their instructors' availability without hunting through multiple syllabi.

**Key Rules:**

1. The Course Schedule is populated by the Syllabus-to-Worker on parse — faculty do not manually re-enter dates. Faculty can make manual adjustments; all changes are logged with a timestamp and the reason field is required.
2. A change made by faculty (date moved, class cancelled) must push a notification to enrolled students within the platform before it is visible in the Schedule. Silent edits are not permitted.
3. The worker must respect institutional date blocks (e.g., spring break, holidays) when they are provided by the institution admin. It flags but does not automatically resolve conflicts with those blocks.
4. Students cannot edit the course calendar — only their own personal Study Planner. This worker is the source of truth; Study Planner subscribes to it.
5. Exam dates are read-only once a faculty member marks them final. Changes after that mark require an explicit unlock action and re-notification to students.

**Who uses it:** Both (faculty own it; students read it)

---

## 3. Study Planner

**Slug:** `edu-study-planner`
**Tagline:** Know what to study, know when to study it.

**Job:** Helps students plan and track their study time across all enrolled courses. Pulls upcoming deadlines from the Course Schedule, suggests study session timing based on exam proximity, and tracks sessions the student logs. The worker surfaces what is urgent without requiring students to manually maintain a separate to-do list. Faculty do not interact with this worker — it is entirely student-side.

**Canvas Tabs:**

- **This Week** — Priority-ordered list of what to work on in the next seven days: upcoming assignments (with days remaining), exams approaching (with suggested prep hours), and reading backlog. Urgency is calculated from Course Schedule data — not manually entered.
- **Study Log** — Student-logged sessions: course, date, duration, what was covered. Running total of hours per course for the term.
- **Planner** — Student's personal weekly block schedule. The worker can propose time blocks based on deadline proximity; the student accepts, rejects, or adjusts. Proposed blocks are suggestions, never locked.
- **Upcoming Deadlines** — Consolidated list of every due date across all enrolled courses, sorted chronologically. Sourced live from Course Schedule — no duplicate entry.

**Key Rules:**

1. This worker is read-only with respect to the Course Schedule — it subscribes, never writes. A student cannot use this worker to change a due date.
2. Suggested study blocks must be labeled as suggestions. The worker cannot commit a block to the student's schedule without explicit student acceptance.
3. Study session logs are private to the student by default. Faculty cannot view individual student study logs. Aggregated engagement signals (student opened the planner, logged a session) may be visible to faculty only if the institution has enabled that setting and the student was notified.
4. The worker must not pressure or shame. Language around overdue work is informational only — not judgmental. ("This assignment is past due" not "You missed this.")
5. Session tracking is self-reported. The worker does not claim to verify study time — it is a personal record tool, not an attendance system.

**Who uses it:** Students only

---

## 4. Grade Tracker

**Slug:** `edu-grade-tracker`
**Tagline:** Log your grades as they come in. Know where you stand all term.

**Job:** Students log grades as they receive them and the worker calculates weighted GPA, projected final grade per course, and progress toward degree completion milestones. The grading policy (weights, drop policies, extra credit rules) is imported from the Syllabus-to-Worker and applied automatically. Faculty have a read-only aggregate view — they cannot see individual student grade logs unless that student grants access.

**Canvas Tabs:**

- **Current Standing** — Per-course grade card: grades entered so far, weighted average to date, projected final grade (calculated from remaining assignments at current pace), and letter grade estimate. Updates the moment a new grade is logged.
- **Grade Log** — Chronological list of every grade entered: assignment name, date received, points earned, points possible, weight category. Editable by the student if they made an entry error.
- **GPA Calculator** — Cumulative and term GPA across all enrolled courses, using the institution's grade scale (4.0, 4.3, letter-only, pass/fail — configurable per institution). Projects GPA impact of different final grade outcomes.
- **Progress to Completion** — For degree-seeking students: credits earned vs. required, distribution requirements met, milestones remaining. Requires institution to have loaded a degree audit template; otherwise this tab shows only credit count.

**Key Rules:**

1. Grading weights are sourced from the Syllabus-to-Worker and locked for the student — they cannot be changed by the student. If a faculty member updates weights mid-term, the student is notified and must acknowledge the change before the new weights apply to their tracker.
2. Grade log entries are student-entered and student-owned. The worker stores them as self-reported. Faculty-entered grades (from the Faculty Gradebook) can be pushed to this worker with student consent, but the student retains the right to see and annotate every entry.
3. Projected final grade calculations must be shown with the assumption surface visible (e.g., "assumes you earn average score on remaining 3 assignments"). Projections are labeled projections — never presented as confirmed grades.
4. GPA calculations must match the institution's published grade scale. If no scale is loaded, the worker defaults to standard 4.0 and labels the output as estimated.
5. No grade data leaves this worker to any external system, third party, or analytics pipeline without explicit student consent and an audit entry.

**Who uses it:** Students (primary); Faculty (aggregate read-only)

---

## 5. Faculty Gradebook

**Slug:** `edu-faculty-gradebook`
**Tagline:** Grade entry, attendance, feedback, and sign-offs — one instrument.

**Job:** The instructor-side record of student performance. Faculty enter grades, log attendance, attach feedback notes to assignments, and issue competency sign-offs for programs that require attestation (nursing clinical hours, engineering labs, student teaching). All records are append-only — corrections are logged, not overwritten. The gradebook is export-ready for institutional SIS systems.

**Canvas Tabs:**

- **Grade Entry** — Spreadsheet-style grid: students as rows, assignments as columns, populated from the course structure set in Syllabus-to-Worker. Faculty enter scores; the worker calculates running averages and flags outliers (unusually low scores, missing submissions). Bulk import from CSV supported.
- **Attendance** — Per-session attendance log. Faculty mark present / absent / late / excused per student. Running attendance percentage displayed per student; threshold alerts configurable (e.g., flag at 3 unexcused absences).
- **Feedback Queue** — Assignments pending written feedback. Faculty can write, save as draft, and release feedback to individual students or the whole class at once. Released feedback is visible in the student's Grade Tracker.
- **Competency Sign-Offs** — For programs with attestation requirements: checklist of competencies per student, with sign-off date, faculty name, and optional notes. Generates a signed attestation record stored in SOCIII Vault. Required for clinical, lab, and credentialed programs.
- **Export** — One-click export to CSV or common SIS interchange formats (CSV with configurable column mapping). Export log records who exported, when, and what range of records.

**Key Rules:**

1. All grade entries are append-only. If a faculty member corrects a grade, the original entry and the correction both persist, with the correction timestamped and the faculty member's name attached. No silent overwrites.
2. Competency sign-offs, once issued, are immutable attestation records stored in the SOCIII Vault. They cannot be deleted — only superseded by a new sign-off that references the prior one.
3. Faculty can only view and edit their own course gradebook. Cross-course access requires an explicit department-head or admin role. Students see only their own row.
4. Feedback drafts are invisible to students until explicitly released by faculty. A draft is never accidentally exposed.
5. Bulk import from CSV must produce a diff preview before any records are written. Faculty confirm the diff; only then do records append. Partial imports are not permitted — it is all-or-nothing per import batch.

**Who uses it:** Faculty (primary); Students (feedback + sign-off read-only)

---

## 6. Campus Comms

**Slug:** `edu-campus-comms`
**Tagline:** Announcements, office hours, and course Q&A — without the inbox chaos.

**Job:** Structured in-platform communication channel between faculty and students for a course or across an institution. Faculty post announcements, schedule and manage office hours, and moderate Q&A threads per course. Students ask questions, see answers visible to the whole class, and receive announcements without email. All communication is logged and searchable — no messages disappear into an inbox.

**Canvas Tabs:**

- **Announcements** — Faculty-posted announcements per course, displayed in reverse chronological order. Each announcement has a read receipt count (faculty see how many students have viewed it). Students can react (acknowledge) but not reply publicly — replies go to the Q&A thread.
- **Q&A Threads** — Per-course question board. Students post questions; faculty answer. Other students can upvote questions (surfaces what the class most needs answered). Faculty can mark an answer as official. Answered questions are searchable for the rest of the term.
- **Office Hours** — Faculty post recurring and one-off office hours. Students can RSVP for a slot (optional, configurable per instructor). RSVP list is visible only to faculty. Office hours are automatically surfaced in the Course Schedule worker.
- **Direct Messages** — One-to-one messaging between a student and their instructor for that course. Visible only to those two parties. Faculty can set a response-time expectation (e.g., "I respond within 48 hours on weekdays") displayed to students before they send.

**Key Rules:**

1. Only faculty and institution admins can post Announcements. Students cannot create announcements — they can only post in Q&A threads and Direct Messages.
2. Q&A threads are per-course and scoped to enrolled students and that course's faculty. A student in Course A cannot see Course B's Q&A, even if they are enrolled in both.
3. All messages, announcements, and threads are retained for the full term plus one additional year. Nothing is deleted by users — records are append-only. Faculty can archive (hide from active view) but not purge.
4. The worker does not send email. It is an in-platform channel by design. If an institution has external notification enabled (optional, admin-level setting), it may trigger a notification to the student's registered address — but the content and record live in the platform.
5. Faculty response time expectation is surfaced to students before they open a Direct Message. If no expectation is set, the worker shows a default: "Response time not specified." It never implies immediate availability.

**Who uses it:** Both (faculty post and moderate; students read and participate)

---

## Bundle Cross-Worker Wiring

These six workers are designed as a connected system. The data dependencies are one-directional — changes flow downstream, not back up:

```
Syllabus-to-Worker
  → Course Schedule (dates + structure)
  → Grade Tracker (weights + assignment list)
  → Faculty Gradebook (course roster + assignment list)
  → Campus Comms (course enrollment + Q&A context)

Course Schedule
  → Study Planner (deadline feed, read-only)
  → Campus Comms (office hours feed)
```

No worker writes back to Syllabus-to-Worker after initial parse. Course structure changes flow from faculty through Syllabus-to-Worker only, then propagate downstream with student notification.

---

## RAAS Vertical

`raas/education/UNIVERSAL/` — no jurisdiction dependency. Institution-level configuration (grade scale, academic calendar, competency frameworks) is loaded at the tenant level by institution admins.
