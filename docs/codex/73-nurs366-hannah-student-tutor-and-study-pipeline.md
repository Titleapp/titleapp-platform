# CODEX 73 — NURS-366 Student Tutor + Clinical Evaluator Study Pipeline

**Status:** 🟡 draft for discussion — not yet built
**Owner:** Sean / Claude Code
**Date:** 2026-08-17
**Trigger:** Ruthie sent her real NURS-366 (Advanced Cardiopulmonary) D2L course and asked for it to become a Digital Worker — a student tutor (Hannah) tied to the clinical evaluator the teacher sees — while her team's AACN Faculty Scholars grant proposal (submitted; IRB submitted, no signal until after semester start) runs a pilot study on whether this approach lifts clinical competency outcomes.

**This is not a demo scoping exercise.** NURS-366 is the actual intervention course in an actual (if outcome-pending) IRB study, per Sean's confirmation. Build accordingly — real data discipline from day one, even while some pieces (IRB determination, final consent language) are still pending.

---

## 1. What the study actually needs (grounding, not invention)

Per `docs/AACN-Faculty-Scholars-Proposal-Skeleton.md` (submitted; treat as directional, not locked — outcome pending):

- **Design:** quasi-experimental, cohort-assigned (not individually randomized), intervention vs. comparison arm.
- **Arm assignment mechanism (Sean, 2026-08-17):** intervention-arm students get a real SOCIII sign-in for the course; comparison-arm students get none and continue the traditional course. This is the actual arm-separation control — no separate "arm flag" field needed anywhere; access to Hannah's student mode is the treatment, and the absence of an account is the control. Simple and enforceable at the account-provisioning level. Sean flagged this as "I think — open to a better methodology," so treat it as the working plan, revisit if a cleaner approach surfaces.
- **Primary outcome:** average clinical competency rating (1–5, faculty-scored) per student at study end.
- **Secondary outcomes:** clinical hours documented, faculty evaluation completion rate, assessment score percentile.
- **Required procedural step:** "Students formally enrolled in the research arm via a platform consent event (recorded as an immutable logbook entry before any outcome data is collected)." This is a real feature, not paperwork — a consent-capture step that writes an append-only record, gating everything downstream.
- **Data collection requirement (Sean, 2026-08-17):** the platform must produce data usable for "the overarching study... on the question of will SOCIII's approach... lift student learning and test scores." This means every interaction surface (tutor sessions, evaluations, competency records) should be designed as instrumented study data from the start, not retrofitted later.

## 2. What already exists — reuse, do not rebuild

| Capability | File | Status |
|---|---|---|
| Signed, hash-chained clinical evaluation → student Vault | `services/education/clinicalEvaluation.js` (`signAndMintEvaluation`) | Real, working. This is the primary-outcome data mechanism. |
| Document-grounded course tutor (cites only uploaded materials) | `nursing-courses-001` (`index.js:3356-3374`) | Real pattern — Studio Locker grounding, no fabrication. |
| Studio Locker ingest + PDF extraction + prompt injection | per CODEX 70 | Real, deployed. Hannah already has 13 locker docs; `nursing-courses-001` has 6. |
| Real Firestore-backed cohort/student/competency tools | `get_nursing_cohort`, `get_nursing_student` (`index.js:5992-6025`) | Real — queries `tenants/demo-makai-nursing/nursingStudents` etc., not hardcoded. FERPA-gated to an explicit worker allowlist already. |
| Free, NCLEX-aligned OER content connector | `GET /v1/edu:content` (`services/education/oerCatalog.js`) | Real, deployed — OpenStax + Open RN, no licensing cost. |
| Dual faculty/student demo shell | `NursingDemoShell.jsx`, `/demo/nursing` + `/demo/nursing/student` | Real routing exists — but see §3, the role split underneath is not real yet. |
| Socratic-first tutor pattern worth copying | "Morgan" (microbiology tutor), `index.js:3560-3577` | Reference implementation for tutoring style in §5. |

## 3. What's actually broken (fix regardless of scope decisions below)

**Hannah is hardcoded faculty-only.** Her system prompt (`index.js:3511-3554`) states outright: *"The user in front of you is an instructor or program director, not a student."* The student demo route just swaps the greeting text; the backend persona doesn't change. Building a real student-tutor mode is genuinely new work, not wiring together two things that already exist.

**Hannah's cohort data is the same fake-baseline-vs-real-tools bug already fixed in aviation this session.** Lines 3523-3536 hardcode 8 named students with fake GPAs and a fake "REFLECTIONS INBOX" directly into the prompt, even though `get_nursing_cohort`/`get_nursing_student` are real tools that query real Firestore. The static block primes the model with specific fabricated names/numbers before any tool call — same pattern, same fix as MX Tracker: strip the hardcoded roster, let the tools be the only source of cohort data.

**Hannah doesn't know NURS-366.** Her known-course list is NURS 210/220/230/320/360. Per Sean, NURS-366 is confirmed as the actual intervention course — needs to be added, and its real content ingested via the Studio Locker (same mechanism already proven for `nursing-courses-001`), not hand-authored into a prompt.

## 4. Hard prerequisite: the distress-disclosure protocol is spec'd, not built

`raas/rulesets/platform_distress_v1.json` does not exist. CODEX 66 (v3, "Spec — not yet built") defines the full protocol — regex gate → synchronous classifier → acknowledge/refer/flag/return-to-lead — and explicitly names Ruthie's study in its own open items: *"IRB consent for Ruthie's study: disclose session-link-gated mode, 48hr expiry, access logging, FERPA note."* CODEX 66 also names this exact scenario directly: *"A nursing student tells Hannah she's been having panic attacks before every clinical shift."*

**Recommendation (Sean concurred 2026-08-17): build this as a genuine prerequisite, not a fast-follow.** No real student should reach Hannah's student-tutor mode before `platform_distress_v1` is real. Concretely, this means implementing, before student-mode ships:
- The regex + classifier pipeline (§3.2 of CODEX 66)
- Fail-closed behavior on classifier error
- `alertFeed/{uid}/items/{docId}` writes with the structured metadata (not raw user text)
- The `safetyContact` production-activation gate (blocks activation if no tenant safety contact is configured)
- Session-link-gated reviewer access (the platform default) — and the FERPA disclosure language it requires must land in whatever consent document Ruthie's IRB submission uses

This is scoped, bounded work — a single RAAS ruleset + a classifier call + an alert-write path — not a research project. It should be sequenced early, in parallel with the tutor build, not after it.

## 5. The three real work items

### A — Student-tutor mode for Hannah

Branch Hannah's actual behavior on role (not just the greeting), gated by account type per the arm-separation model in §1:
- Faculty/admin accounts: today's Hannah — cohort status, faculty communication drafting, accreditation support.
- Student accounts (intervention arm only, by construction — no account, no access): Socratic review, reflection coaching against the Tanner framework, quiz-mode on course content, "what is my instructor looking for" guidance. Never grades, never NCLEX-readiness declarations, never discusses another student's record (already a stated boundary in her existing prompt — keep it, extend it to the student role explicitly).
- Persona identity stays Hannah — same name, same CODEX-66-defined relationship boundary and distress handling — the persona doesn't change, her role-conditioned behavior does.

**Tone/visual direction for the student mode (Sean, 2026-08-17, visually confirmed):** Ruthie's course carries a joyful, fun "Nurse Honu" (Hawaiian green sea turtle) mascot — an illustrated anthropomorphic turtle in flight-nurse/flight-medic gear (white nurse cap with red cross, blue flight suit, medical patches, aviation headset), with little sea-creature "students" (fish, crab, lizard) around her, deliberately lighter and warmer than the platform's standard UX to keep students engaged with heavy clinical material. Confirmed program name in the live D2L course is "Lamakū" (e.g. "Lamakū Support" page). Concretely: Hannah's student-mode canvas should carry noticeably more personality/warmth than the standard worker canvas chrome — a deliberate, scoped exception to platform visual consistency, not a default to generalize elsewhere. Confirm exact Honu/Lamakū visual assets and usage rights with Ruthie before building the canvas (§7 open questions) — the illustration Sean shared looks AI-generated/informal, not necessarily a licensed brand asset ready for production use as-is.

**Update (2026-08-17, from Ruthie directly):** Honu is Ruthie's own personal avatar, not a fixed course mascot — "she changes what she's wearing" depending on what's being taught (the flight-nurse costume Sean shared was presumably for a specific unit). If/when the student-mode canvas gets built, consider whether the avatar should shift appearance per module/unit rather than using one fixed image — matches how Ruthie already runs it herself.

**Hold status (2026-08-17):** Ruthie asked to pause anything beyond "building up the shell" — she's actively still authoring NURS-366 (through Module 6 of 16 as of this note) and wants to import her latest content herself before further build work happens against it. She's also without power at home and will respond to Sean's 3 open questions (§7) "this evening." Nothing beyond `platform_distress_v1` (platform-wide, not NURS-366-specific) should proceed until she responds.

### B — Real NURS-366 content, not hand-authored curriculum

Ingest NURS-366's actual materials into a Studio Locker scoped to this course (syllabus, unit content, rubrics — whatever Ruthie is willing to hand over as the D2L course stabilizes; per the research fork's read, some assignments are still `[Assignment Name]` placeholders, so this needs to be designed to grow with the course). Add NURS-366 to Hannah's known-course list. Supplement with the free OER connector (`GET /v1/edu:content`) for standard respiratory/cardiac/ACLS content NURS-366 doesn't need to re-author from scratch — per `NURSING-LMS-BRIEF.md`, current NCLEX-aligned OpenStax/Open RN content is free and already wired in.

### D — Tie interactions to the real evaluator (careful about what this means)

**Important distinction the grant design forces:** the study's primary outcome is *faculty-signed* competency ratings — not an AI-generated evaluation. Hannah's tutor sessions should not self-sign competency attestations; that would break both the RAAS rule already in place (`nursing_clinical_v1.json`: "no competency marked complete without instructor attestation") and the study's own validity (the AI can't grade itself as the outcome measure).

What tutor sessions *should* produce: structured, SLO-tagged activity records (what topic, what Tanner phase, self-assessed confidence, timestamp) that become **input evidence** a faculty member reviews when writing their signed evaluation — closing the loop described in `NURSING-LMS-BRIEF.md` §10 (propose → faculty approves + signs → appends to student Vault → anchored) without letting the tutor substitute for the instructor.

### E — What "expand the scope of interactions" concretely means

Recommend: Socratic-first tutoring modeled on the existing "Morgan" pattern (question the student toward the answer rather than stating it), quiz mode against NURS-366's real respiratory/cardiac/ACLS content, and reflection-writing coaching against the Tanner framework (Noticing → Interpreting → Responding → Reflecting) — Hannah's existing domain expertise, just now actually reachable by a student. This should be discussed further with Ruthie directly — she's the domain expert on what "better tutoring" looks like for this specific course.

## 6. Study data-collection design (Sean's data-for-the-study ask)

Every surface above should double as study instrumentation from the start:

- **Primary outcome data:** faculty-signed competency ratings — already real via `signAndMintEvaluation`. Ensure ratings are captured on the 1–5 scale the grant specifies, per learning objective, and exportable.
- **Secondary outcome data:** clinical hours (already modeled in the aviation duty/logbook pattern — nursing equivalent needs the same per-shift, preceptor-attested structure) and faculty evaluation completion rate (a simple completeness query over the evaluation collection).
- **Process/engagement data (not a named outcome, but directly useful and low-cost to capture):** tutor session count, topics covered, self-reported confidence over time, quiz performance — this is the kind of usage signal that helps explain *why* an outcome difference did or didn't appear, and it's nearly free to log since Hannah's conversations already exist; just needs structured tagging (SLO, Tanner phase) at write time rather than free text only.
- **The informed-consent event** (§1) as an immutable logbook entry, written before any other data collection for that student — this is a concrete feature to build, not a paperwork afterthought.
- **Export:** the grant explicitly calls for "platform export at the end of the study period" — whatever we build needs a real export path for the eval/competency/hours data, not just chat-readable answers.

## 7. Open questions for Ruthie specifically (not Sean's or Claude's to invent)

- Which specific SLOs / ANA Standards map to NURS-366's respiratory, cardiac, and ACLS units? Hannah's existing 45-SLO framework is for her other 5 courses — need the NURS-366 mapping.
- What does her actual IRB consent form say about data access, session-link-gated review, and the FERPA disclosure CODEX 66 requires? (This should inform, not be invented by, the platform's consent-event feature.)
- Does she want a pre/post assessment score integrated (the grant's optional research question #3, NCLEX-readiness instrument) — if so, which instrument, and is it something students take on-platform or off-platform and get manually entered?
- What counts as "engagement" or "better tutoring" to her, concretely — this directly shapes item E.

## 8. Suggested build order

1. `platform_distress_v1.json` + alert pipeline (§4) — prerequisite, do first, in parallel with everything below.
2. Fix Hannah's hardcoded fake cohort (§3) — small, contained, same fix already proven in aviation.
3. Add NURS-366 to Hannah's known courses; ingest real course content into her locker (§B).
4. Build the consent-event feature (§6) — gates all downstream data collection for a given student.
5. Build student-tutor role branching (§A) behind the sign-in-gated arm model (§1).
6. Wire structured, SLO-tagged activity logging from tutor sessions as evidence for faculty evaluation (§D) — not self-signed.
7. Export path for study outcome data (§6).
8. Discuss §E and the open questions in §7 directly with Ruthie before finalizing tutor style/scope.

---

## Cross-references

- `docs/AACN-Faculty-Scholars-Proposal-Skeleton.md` — the study design (submitted, outcome pending)
- `docs/NURSING-LMS-BRIEF.md` — long-term strategic direction ("wedge first," not full LMS replacement)
- `docs/codex/66-worker-persona-and-distress-protocol.md` — distress protocol spec (§4 implements this)
- `docs/codex/70-education-demo-and-course-uploader.md` — locker/demo-shell mechanisms this build reuses
- `functions/functions/raas/rulesets/nursing_clinical_v1.json` — governance already in place
- `functions/functions/services/education/clinicalEvaluation.js` — the real signing pipeline
