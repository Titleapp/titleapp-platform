# CODEX 73 — NURS-366 Student Tutor + Clinical Evaluator Study Pipeline

**Status:** 🟢 unblocked, building — Ruthie answered the open questions in §7 on 2026-08-18
**Owner:** Sean / Claude Code
**Date:** 2026-08-17 (updated 2026-08-18)
**Trigger:** Ruthie sent her real NURS-366 (Advanced Cardiopulmonary) D2L course and asked for it to become a Digital Worker — a student tutor (Hannah) tied to the clinical evaluator the teacher sees — while her team's AACN Faculty Scholars grant proposal (submitted; IRB submitted, no signal until after semester start) runs a pilot study on whether this approach lifts clinical competency outcomes.

**This is not a demo scoping exercise.** NURS-366 is the real course being taught this term. Per Ruthie's 2026-08-18 answers (§7), it is **not yet the funded research arm-comparison study** — this term it's a test site for the tool and the process/research-survey design. The actual quasi-experimental study (if the grant is approved) can't start before Spring 2027. See §1 for what that changes.

---

## 1. What the study actually needs (grounding, not invention)

**Timeline reality, per Ruthie directly (2026-08-18):** NURS-366 this term is a **test site for the tool and the research process/surveys** — not the funded arm-comparison study itself.
- If the AACN grant is approved (awardees announced November 2026), the actual quasi-experimental research module cannot start before **Spring 2027**, and IRB submission for that study can't go in until after grant approval.
- If the grant is **not** approved, Ruthie's fallback is a research paper drawn from NURS-366 data directly, needing consent from her Department Chair and likely the students (a consent blurb) — she's still confirming the exact shape with a colleague (Jackie).
- **What this means for the build:** nothing this term needs to satisfy full active-study data-handling requirements (§6's export/consent-event design is still worth building since it's cheap and correct, but it is not gating anything live right now). The real near-term job is: make the tutor genuinely good against NURS-366's real content, with no research-data pressure yet.

Per `docs/AACN-Faculty-Scholars-Proposal-Skeleton.md` (submitted; treat as directional, not locked — outcome pending), for **if/when the Spring 2027 study happens:**

- **Design:** quasi-experimental, cohort-assigned (not individually randomized), intervention vs. comparison arm.
- **Arm assignment mechanism (Sean, 2026-08-17):** intervention-arm students get a real SOCIII sign-in for the course; comparison-arm students get none and continue the traditional course. This is the actual arm-separation control — no separate "arm flag" field needed anywhere; access to Hannah's student mode is the treatment, and the absence of an account is the control. Simple and enforceable at the account-provisioning level. Sean flagged this as "I think — open to a better methodology," so treat it as the working plan, revisit if a cleaner approach surfaces. **Not active this term** — see timeline above.
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

**Hannah's cohort data is the same fake-baseline-vs-real-tools bug already fixed in aviation this session.** ~~Lines 3523-3536 hardcode 8 named students with fake GPAs and a fake "REFLECTIONS INBOX" directly into the prompt~~ **Fixed 2026-08-18** — the hardcoded roster/inbox is stripped from `nursing-education-001`'s systemPrompt; verified live that Hannah now cites real students from `get_nursing_cohort` (Jordan Chen, Marcus Webb, Noah Ferreira — real Firestore records) instead of the fabricated Sarah K./Maya L./James C. roster.

**Found but NOT fixed (2026-08-18) — a bigger, separate item:** the cohort/reflections/SLO/audit-trail **canvas** (right-panel dashboard, not the chat) is a completely different, much larger fixture — `apps/business/src/data/nursingEducationData.json` (4,685 lines: tenant/courses/slos/reflectionTemplates/sites/instructors/cohorts/students/logbookEntries) rendered by `apps/business/src/sections/NursingEducationPanel.jsx` (978 lines). It still shows the same fake Sarah K./Maya L./James C. roster even after the chat fix above, since it's an entirely separate static data path with no connection to the real `nursingStudents`/`nursingCourses` Firestore collections. This is a real, substantial rebuild (comparable in scope to today's aviation MX/Dispatch work, not a quick fixture swap) — flagging it as its own scoped item rather than attempting it inline. Not yet added to the build order in §8; worth its own pass.

**Hannah doesn't know NURS-366.** Her known-course list is NURS 210/220/230/320/360. Per Sean, NURS-366 is confirmed as the actual intervention course — needs to be added, and its real content ingested via the Studio Locker (same mechanism already proven for `nursing-courses-001`), not hand-authored into a prompt.

**Correction (Ruthie, 2026-08-18):** Hannah's existing 45-SLO framework is **not** for her other courses — it belongs to the Clinical Evaluation Tool (CET) specifically, and the CET is strictly separate from NURS-366's course content ("the CET will be the entry into getting the university to have buy-in to the entire system" — i.e. it's the separate wedge product, not part of this build). NURS-366's real learning framework comes from its syllabus's Course Learning Outcomes (CLOs), not from Hannah's 45-SLO set. Every module in the real course follows the same shape: Learning Outcomes → Lectures → Class PowerPoints → Essential/Optional Video Resources → Supplemental Resources → Assignments. Do not map NURS-366 content onto the CET's SLOs — pull the real CLOs from the syllabus instead.

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

**Hold status: lifted (2026-08-18).** Ruthie answered all of §7's open questions plus two more (assessment instrument, her definition of "good tutoring" — now the actual spec for §E below). She was through Module 6 of 16 as of 2026-08-17; the sandbox has all content for Modules 1-7, Modules 8-16 are hidden pending her revisions to the Assignments section but will mostly follow the same structure. Building proceeds — see §8 for order.

### B — Real NURS-366 content, not hand-authored curriculum

Ingest NURS-366's actual materials into a Studio Locker scoped to this course (syllabus, unit content, rubrics — whatever Ruthie is willing to hand over as the D2L course stabilizes; per the research fork's read, some assignments are still `[Assignment Name]` placeholders, so this needs to be designed to grow with the course). Add NURS-366 to Hannah's known-course list. Supplement with the free OER connector (`GET /v1/edu:content`) for standard respiratory/cardiac/ACLS content NURS-366 doesn't need to re-author from scratch — per `NURSING-LMS-BRIEF.md`, current NCLEX-aligned OpenStax/Open RN content is free and already wired in.

### D — Tie interactions to the real evaluator (careful about what this means)

**Important distinction the grant design forces:** the study's primary outcome is *faculty-signed* competency ratings — not an AI-generated evaluation. Hannah's tutor sessions should not self-sign competency attestations; that would break both the RAAS rule already in place (`nursing_clinical_v1.json`: "no competency marked complete without instructor attestation") and the study's own validity (the AI can't grade itself as the outcome measure).

What tutor sessions *should* produce: structured, SLO-tagged activity records (what topic, what Tanner phase, self-assessed confidence, timestamp) that become **input evidence** a faculty member reviews when writing their signed evaluation — closing the loop described in `NURSING-LMS-BRIEF.md` §10 (propose → faculty approves + signs → appends to student Vault → anchored) without letting the tutor substitute for the instructor.

### E — What "good tutoring" means for NURS-366 (Ruthie's own words, 2026-08-18 — this is the spec)

> "Good tutoring in NURS 366 should help students understand and apply critical care concepts rather than memorize information or simply arrive at the correct answer. The tutor should guide students through the why behind what is happening with the patient and help them connect pathophysiology, assessment findings, hemodynamics, labs, medications, and interventions.
>
> Because this course focuses heavily on critical care and clinical judgment, tutoring should emphasize recognizing patterns, identifying priorities, anticipating deterioration, and deciding what the nurse should do next. Students should be encouraged to explain their reasoning and work through questions instead of being given answers.
>
> Tutoring should also help students identify gaps in foundational knowledge that may be making the more complex concepts difficult. When necessary, the tutor should break concepts down, rebuild that foundation, and then bring the student back to the clinical situation.
>
> Ultimately, good tutoring for NURS 366 should help students become more independent thinkers — students who can look at a changing patient situation, recognize what matters, understand why it matters, and determine the safest nursing response."

Concretely, this becomes the student-mode system prompt's core behavior, layered on top of the existing "Morgan" Socratic pattern (question toward the answer, never state it) and the Tanner framework (Noticing → Interpreting → Responding → Reflecting) already used for reflection coaching:
1. Never give the answer directly — ask the question that gets the student to connect pathophys → assessment → hemodynamics → labs → meds → interventions themselves.
2. Explicitly train pattern recognition and prioritization — "what matters most right now, and why" — over rote recall.
3. When a student is stuck, diagnose whether it's a foundational-knowledge gap first; if so, rebuild that piece explicitly before returning to the original clinical scenario, rather than pushing forward on a shaky base.
4. The end goal stated by name is independent clinical thinking, not correct-answer completion — quiz mode and reflection coaching should both be built to reinforce that, not just to score correctness.

## 6. Study data-collection design (Sean's data-for-the-study ask)

Every surface above should double as study instrumentation from the start:

- **Primary outcome data:** faculty-signed competency ratings — already real via `signAndMintEvaluation`. Ensure ratings are captured on the 1–5 scale the grant specifies, per learning objective, and exportable.
- **Secondary outcome data:** clinical hours (already modeled in the aviation duty/logbook pattern — nursing equivalent needs the same per-shift, preceptor-attested structure) and faculty evaluation completion rate (a simple completeness query over the evaluation collection).
- **Process/engagement data (not a named outcome, but directly useful and low-cost to capture):** tutor session count, topics covered, self-reported confidence over time, quiz performance — this is the kind of usage signal that helps explain *why* an outcome difference did or didn't appear, and it's nearly free to log since Hannah's conversations already exist; just needs structured tagging (SLO, Tanner phase) at write time rather than free text only.
- **The informed-consent event** (§1) as an immutable logbook entry, written before any other data collection for that student — this is a concrete feature to build, not a paperwork afterthought.
- **Export:** the grant explicitly calls for "platform export at the end of the study period" — whatever we build needs a real export path for the eval/competency/hours data, not just chat-readable answers.

## 7. Questions for Ruthie — answered 2026-08-18

- **Q: Which SLOs/ANA Standards map to NURS-366's respiratory, cardiac, and ACLS units?**
  **A:** Wrong framework entirely — Hannah's 45-SLO set belongs to the CET, not this course. NURS-366 has its own Course Learning Outcomes (CLOs) in the syllabus; use those. See the correction in §3.
- **Q: What does her IRB consent form say about data access, session review, FERPA disclosure?**
  **A:** No active study yet, so no consent form exists to match yet. NURS-366 this term is a test site for the tool/process, not the funded study — see the timeline in §1. She's begun the IRB process herself (finishing required training before submission) and is separately emailing Dr. Tanner for permission to use her rubric.
- **Q: Does she want a pre/post NCLEX-readiness assessment integrated?**
  **A:** Yes eventually, but she hasn't designed what it would look like yet. Not a near-term build item — revisit once she has a concrete instrument in mind.
- **Q: What does "good tutoring" mean to her, concretely?**
  **A:** Answered in full — now the actual spec in §E.

**Also from the same message:** she's reading the UH IRB eProtocol submission process, plans a couple more focused hours on this before pivoting to prep for Thursday's faculty training, and will read this CODEX more thoroughly. She shared a nursing-practice forum link (`nursingpractice.annualforums.com`) without further context — worth asking her directly what she wants us to do with it before assuming.

## 8. Suggested build order (updated 2026-08-18 — timeline de-risked, no active study yet)

1. `platform_distress_v1.json` + alert pipeline (§4) — still a real prerequisite regardless of study status. Any real student talking to a real tutor needs this live. Do first.
2. Fix Hannah's hardcoded fake cohort (§3) — small, contained, same fix already proven in aviation.
3. Add NURS-366 to Hannah's known courses; ingest real Module 1-7 content from the sandbox into her locker (§B), pulling real CLOs per module (not the CET's SLOs — §3 correction).
4. Build student-tutor role branching (§A) with the tutoring philosophy in §E as the actual system-prompt spec — this is the real near-term deliverable now that the research-arm timeline has moved to Spring 2027 at the earliest.
5. Wire structured, activity logging from tutor sessions as evidence for faculty evaluation (§D) — not self-signed. Useful regardless of study status.
6. Consent-event feature (§6) and export path — still worth building since it's cheap and correct, but not gating anything this term. Lower urgency than 1-5 above.
7. Revisit §7's still-open items (pre/post assessment instrument, the forum link) with Ruthie once she has more to share.

---

## Cross-references

- `docs/AACN-Faculty-Scholars-Proposal-Skeleton.md` — the study design (submitted, outcome pending)
- `docs/NURSING-LMS-BRIEF.md` — long-term strategic direction ("wedge first," not full LMS replacement)
- `docs/codex/66-worker-persona-and-distress-protocol.md` — distress protocol spec (§4 implements this)
- `docs/codex/70-education-demo-and-course-uploader.md` — locker/demo-shell mechanisms this build reuses
- `functions/functions/raas/rulesets/nursing_clinical_v1.json` — governance already in place
- `functions/functions/services/education/clinicalEvaluation.js` — the real signing pipeline
