# CODEX 38 — Makai School of Nursing Demo Workspace
## University of Hawaiʻi Education Vertical — Sales & Socialization Tool

**Status:** Spec — red-teamed; v1.1 fixes applied (vertical key, pricing, minting, Reagan rule, KYC note)  
**Purpose:** DEMONSTRATION AND SALES TOOL ONLY. No real student data. No FERPA obligations attach to this workspace.  
**Primary audience:** Ruthie Clearwater — to show colleagues, department chairs, and her dean what the platform can do for nursing education.  
**Demo school:** Makai School of Nursing (fictional — "makai" = toward the ocean in Hawaiian; evokes UH context without impersonating any real institution)  
**Tenant slug:** `demo-makai-nursing`  

---

## 0. Why This Exists — and What It Is Not

This is a **clickable demo environment**, not a production deployment. It exists so Ruthie can open a browser in a meeting with a colleague or dean and show the platform working — with realistic nursing data, real AI responses, and a visually coherent picture of what a "School in a Box" looks like for nursing programs.

**What it is:**
- A seeded Firestore tenant with fictional students, fictional courses, and plausible clinical data
- Five Digital Workers that actually respond to chat and render real canvases
- A simulated ATI score event that demonstrates the LTI integration story
- A demo narrative Ruthie can walk through in 15–20 minutes

**What it is not:**
- A system processing real student education records
- FERPA-governed data (all data is synthetic/fictional)
- A production-ready deployment (SOC 2, VPAT, FERPA DPA are on the roadmap for real deals — see NURSING-LMS-BRIEF.md §4 and §11)
- A replacement for Canvas or Blackboard (it's a wedge — see §2)

**The demo goal:** After the walkthrough, the dean or colleague says: "I get it — this is the student record piece that Canvas doesn't do. How do we pilot it?"

---

## 1. The Demo Narrative — The Story Ruthie Tells

The core pitch is a single sentence:

> "Your ATI scores, clinical hours, instructor evaluations, and competency sign-offs all live in one place the student owns — and the institution can prove, not just claim."

Walk it in this order:

1. **Open the dashboard** — show the cohort: 18 students in the BSN Program Class of 2028. Three flags: one at-risk (behind on clinical hours), one outstanding (ready for NCLEX), one with a pending competency attestation waiting for a signature.
2. **Click a student record** — show the Vault-style learning record: enrolled, 312 clinical hours logged, ATI Fundamentals score 78%, two competency sign-offs with instructor signatures, one pending.
3. **Open the Eval Worker** — ask the worker about that student. It cites the actual hours and gaps, recommends a specific clinical rotation, and surfaces the one unsigned competency as a blocker.
4. **Show the ATI score arriving** — trigger the simulated ATI score event. The score flows in, the AI tutor immediately notes the gap area, and the student's record is updated.
5. **Open the Comms Worker** — show the instructor dashboard. The flag from step 4 is already surfaced in the instructor's queue.
6. **Show the Accreditation view** — open the Compliance Worker's cohort dashboard. Show the dean the NCLEX readiness distribution, clinical hours summary, and the audit trail that answers an accreditor's question in seconds instead of days.
7. **Show the student's record is theirs** — open the student-side Vault export view. Show that the record is portable, signed, and doesn't disappear when they graduate.

---

## 2. The Wedge Frame (What to Say to a Dean)

The pitch to an administrator is NOT "we replace Canvas." Canvas handles enrollment, scheduling, and LMS commodity work. The pitch is the gap Canvas doesn't fill:

| What Canvas does | What SOCIII adds |
|---|---|
| Enrollment, assignments, LMS gradebook | Immutable, signed competency record the student owns for life |
| Grade storage (pass/fail visible to registrar) | Granular clinical-hours log, skill attainments, preceptor evaluations |
| ATI embedded via LTI (scores go to Canvas gradebook) | Scores flow to the immutable record + trigger AI-guided follow-up |
| Static gradebook | Rules-engine: propose → instructor approves → record appended (no silent overwrites) |
| Nothing at graduation | Portable Vault the student carries to employers |
| Accreditation = export to Excel + manual compilation | One cohort dashboard with audit trail ready |

The dean's question: "Does this replace Canvas?" Answer: "No — you keep Canvas. This is the layer that does the things Canvas can't: the immutable record, the competency attestation, the accreditation audit trail, and the AI workers that run on top of it. Think of it as the substrate beneath your LMS, not a replacement of it."

---

## 3. The Demo Worker Suite — 5 Workers

All workers carry `vertical: "education"` (the canonical locked value from CODEX-22's Five Verticals table: `real-estate, aviation, education, healthcare, finance`) with `suite: "Clinical Programs"` as the sub-grouping. The RAAS ruleset is `nursing_clinical_v1`. Sibling injection is active — they surface each other in chat.

> **Red team fix (v1.1):** The original draft used `vertical: nursing_education` — a non-canonical key that would hard-block at publish under Amendment A Fix 5. `nursing_education` is a suite beneath `education`, not a peer vertical. This is the same class of drift as `vertical: compliance` in the DPP workers. Do not re-introduce a `nursing_education` vertical key anywhere in this build.

### Worker 1 — Student Record Worker (`nursing-records-001`)
**The lynchpin.** Manages the immutable learning record for each enrolled student.

**What it shows:**
- Cohort overview: all 18 students, flagged by status (on track / at-risk / ready)
- Individual student record: enrollment DTC, clinical hours log, course grades, competency attainments with instructor signatures
- The "Reagan rule" attestation model: when evidence isn't in hand (e.g., old transcripts), the student makes a signed self-statement → entered as a logbook entry with `source: student`, flagged "attestation pending" (grey). A later verified event (registrar pull, uploaded doc, LMS import) flips it to verified (green). "Trust but verify" — claimed data is visible and usable, but always marked as unconfirmed until a second source corroborates it.
- The fact that this record belongs to the STUDENT, not the school

**Canvas tabs:** Cohort Overview · Student Record · Clinical Hours · Competency Log · Vault Export

**Chat persona:** Kaia (a name that works in Hawaiian context). Evidence-first. Cites the exact logbook entries she's referencing, never fabricates a score.

**The demo moment:** Ask Kaia "what's holding back Jordan Chen for NCLEX readiness?" She surfaces the two specific competency attestations that are unsigned and the clinical-hours gap — with exact numbers from the record, not estimates.

---

### Worker 2 — Course Delivery Worker (`nursing-courses-001`)
**Where content meets records.** Tracks two seeded courses with real OpenStax/Open RN content wired.

**Seeded courses:**
- **NSG 201 — Fundamentals of Nursing Care** (OpenStax Nursing: Fundamentals, 2023 edition, CC BY 4.0)
- **NSG 312 — Clinical Pharmacology** (OpenStax Nursing: Pharmacology, 2023 edition, CC BY 4.0)

Each course has: enrolled students, week-by-week module progress, ATI assessment placeholders, and graded assignments that write to the student record on completion.

**The ATI simulation event:** In the demo, clicking "Trigger ATI Score" sends a simulated AGS 2.0 grade passback event (as if ATI wrote the score back from an LTI launch). The score appears in the gradebook AND mints a logbook entry in the student's record. This is the LTI integration story — no CSV, no manual entry, no middleware.

**Canvas tabs:** Course Roster · Module Progress · ATI Integration · Gradebook · Course Content

**What to say about the content:** "The course material is from OpenStax Nursing — peer-reviewed, NCLEX-aligned, free, and licensed CC BY 4.0. ATI's value is the item bank and NCLEX-readiness analytics, not the textbook. We plug ATI in via LTI; the content is already here."

---

### Worker 3 — AI Tutor Worker (`nursing-tutor-001`)
**In-course student support.** A nurse-specific AI tutor that knows the course content, can quiz the student, and maps to NCLEX-PN/RN competency domains.

**What it shows:**
- A student opens a chat and asks: "I don't understand cardiac rhythms — can you help?"
- The tutor surfaces the relevant section from NSG 312, explains the concept, and then offers a practice question mapped to NCLEX competency domain "Physiological Adaptation."
- If the student answers wrong, the tutor breaks down the reasoning and links back to the content.
- The tutor does NOT grade. It prepares. The grade is an instructor decision, anchored in the record.

**The rule the tutor follows:** It cannot tell a student they are "ready for NCLEX." It can tell them what gaps remain and what to focus on. NCLEX readiness is a clinical judgment call, not an AI output.

**Canvas tabs:** Active Sessions · Tutor Analytics · NCLEX Domain Map · Content Coverage

**The demo moment:** Ask the tutor "What should Maya Kahale study before her pharmacology module?" The tutor reads Maya's course progress (from the same Firestore grounding) and gives a specific, cited recommendation.

---

### Worker 4 — Interdisciplinary Comms Worker (`nursing-comms-001`)
**Faculty + clinical supervisor coordination.** The layer that connects instructors, preceptors, and admin without email threads.

**What it shows:**
- An instructor posts a clinical observation note for a student ("Demonstrated clean sterile technique; recommend sign-off on Competency 4B")
- The note proposes a competency attainment entry → instructor confirms → it appends to the student's record with their digital signature
- The admin dashboard shows all pending attestations queue-wide — who's waiting on a signature, from whom, for how long
- A preceptor from off-campus can submit a clinical evaluation without needing a Canvas login — they get a secure link, attest, and the record is updated

**The gap this fills:** Today this is email. The preceptor sends an email. The faculty coordinator transcribes it into a spreadsheet. Neither is signed, neither is in the student's record, and neither is auditable. This worker closes that loop.

**Canvas tabs:** Faculty Queue · Preceptor Portal · Pending Attestations · Communication Log

---

### Worker 5 — Accreditation & Compliance Worker (`nursing-accreditation-001`)
**The dean view.** ACEN/CCNE reporting dashboard — the thing that sells to administrators.

**What it shows:**
- Cohort NCLEX readiness distribution (how many students at what readiness level)
- Clinical hours summary by student, flagged against program minimums
- ATI score distributions by module, mapped to NCLEX domains
- The audit trail: for any accreditor question ("Show us competency attainment records for your 2027 cohort"), pull it in seconds, not days
- The three ACEN Standards most relevant to this data: Standard 4 (Curriculum), Standard 5 (Resources), Standard 6 (Outcomes)

**The demo moment for a dean:** "When your ACEN site visit comes, you currently assemble this from Canvas exports, spreadsheets, and email. Here's what that looks like from one dashboard — pulled from records that are already signed and anchored. You can export the audit package right now."

**Canvas tabs:** Cohort Dashboard · NCLEX Outcomes · Clinical Hours Report · ATI Performance · Accreditation Export

---

## 4. Seeded Demo Data — "Makai Class of 2028"

Fictional students (DO NOT use real names of actual UH students):

| Student | Status | Clinical Hours | ATI Fund. | Notes |
|---|---|---|---|---|
| Jordan Chen | At-Risk | 187 / 500 | 68% | 2 unsigned competencies; behind on hours |
| Maya Kahale | On Track | 312 / 500 | 78% | 3 courses complete; pharmacology module in progress |
| Leilani Akana | Ready | 498 / 500 | 91% | NCLEX readiness flag: high; competencies all signed |
| Noah Ferreira | On Track | 298 / 500 | 74% | Preceptor evaluation pending |
| Aiko Tanaka | On Track | 341 / 500 | 81% | — |
| Marcus Webb | At-Risk | 120 / 500 | 59% | Extended leave; return plan active |

(12 additional students seeded as background cohort, no individual stories)

**Seeded instructors:**
- Dr. Kealani Moku — Course Lead, NSG 201
- Prof. Ana Rodrigues — Clinical Coordinator (preceptor contact)
- (Ruthie herself can be added as a third instructor for the live demo so she can sign a real attestation in the room)

**Seeded courses:**
- NSG 201 Fundamentals: Week 6 of 16, all 6 enrolled in demo cohort
- NSG 312 Pharmacology: Week 3 of 14, 4 enrolled in demo cohort

---

## 5. ATI Integration — What's Real vs. Simulated in the Demo

The demo shows a simulated ATI LTI score event. Here's the honest framing:

**What the demo shows:** A button labeled "Simulate ATI Score Delivery" triggers a synthetic `ags_grade_passback` event, which the backend processes identically to how it would process a real ATI score. The score appears in the gradebook and mints a logbook entry.

**What real ATI integration requires:**
1. A signed agreement with Ascend Learning (ATI's parent) confirming SOCIII can act as an LTI 1.3 Platform for their Tool
2. LTI 1.3 Platform-side implementation: OIDC handshake, JWK endpoint, AGS endpoint (we write the grade receiver; ATI calls it)
3. NRPS endpoint (we expose the roster; ATI reads it for enrollment sync)
4. A real ATI institutional license at the school (ATI isn't resold — the institution's existing license powers it)

**The demo framing to use:** "What you're seeing is exactly how the integration works — ATI writes a score back to our gradebook via the LTI standard, and it automatically updates the student's immutable record. The implementation is standard LTI 1.3; we'd wire it to your existing ATI license."

Do NOT say "ATI is integrated" — say "ATI integrates via LTI 1.3, and this is what that data flow looks like."

---

## 6. RAAS Ruleset — `nursing_clinical_v1`

Hard stops for all five workers:

1. **No fabricated scores** — Workers cannot cite an ATI score, clinical hours count, or grade that does not exist in the student's Firestore record. If the data isn't there, say so.
2. **No NCLEX readiness declarations** — Workers cannot tell a student (or instructor) that a student "is ready for NCLEX." They can surface readiness indicators; the declaration is a human clinical judgment.
3. **No fabricated competency sign-offs** — A competency cannot be marked complete unless a real instructor attestation event has been committed to the record. Pending ≠ complete.
4. **FERPA language in real deployments** — Workers must not present student data to an unauthenticated viewer. In the demo tenant, this is relaxed (all demo data is synthetic); in production, access is governed by the capability registry's auth gate. Note: the registry field is currently named `requiredKyc` — this field was purpose-built for financial identity verification (Stripe Identity) and may need a parallel `requiredAuth` or `requiredRole` field for educational-records access, where "KYC" carries the wrong connotation. Flag this before wiring the real UH deployment.
5. **Content citation required** — When the AI Tutor cites course material, it must attribute the source (OpenStax title, chapter, edition, CC BY 4.0). No paraphrasing without attribution.
6. **No invented accreditation status** — Workers cannot say the program "meets ACEN Standard X" without data backing the claim. Surface the data; let the dean interpret the standard.

---

## 7. Demo Space Setup — What Code Needs to Build

### Phase 1 — Tenant + seed (unblocked now)
- [ ] Create Firestore tenant `demo-makai-nursing` with `demoMode: true` flag **AND `mintingExempt: true`** — this bypasses the credit-reservation gate so every simulated ATI score event, competency sign-off, and logbook mint during a live walkthrough does NOT draw down real credits or trigger a "please add credits" block mid-demo. Confirm this exemption flag is wired in the minting pathway before Ruthie does her first live walkthrough. (Same exemption pattern used in `ws_1781920656122_tl9dhn` Sean's dedicated demo workspace.)
- [ ] Seed 6 named students + 12 background cohort with realistic records (clinical hours, ATI scores, course enrollment, 2-3 competency entries per student)
- [ ] Seed 2 instructors + 2 courses (NSG 201, NSG 312) with week-level progress
- [ ] Wire the `ags_grade_passback` simulation endpoint (`POST /v1/demo/ati-score-event`) — processes identically to a real AGS call; just the trigger is synthetic

### Phase 2 — Workers (unblocked now, builds on existing substrates)
- [ ] `nursing-records-001` — Canvas + chat, reads from seeded Firestore records, Kaia persona
- [ ] `nursing-courses-001` — Canvas + chat, ATI simulation trigger, OpenStax content via existing `/v1/edu:content` endpoint
- [ ] `nursing-tutor-001` — Chat-first (canvas is secondary), NCLEX domain map tab
- [ ] `nursing-comms-001` — Faculty queue canvas + preceptor attestation propose→approve flow
- [ ] `nursing-accreditation-001` — Cohort dashboard canvas, ACEN Standards tab, export button

### Phase 3 — Demo polish
- [ ] "Makai School of Nursing" branding in workspace header (logo: clean monoline wave mark)
- [ ] Demo mode banner: subtle, honest — "This is a demonstration environment. All student data is fictional."
- [ ] Ruthie as live instructor — add her uid to the demo tenant with `role: "instructor"` so she can sign a real attestation during the demo walk-through

### RAAS ruleset
- [ ] Author `nursing_clinical_v1.json` with 6 hard stops above + `chat_rules` for all 5 workers

---

## 8. Red Team Questions — Known Challenges

*These are the objections a dean, IT, or IRB will raise. Ruthie should have a crisp answer for each before using this in a formal meeting.*

**"Is this FERPA compliant?"**
In this demo, no FERPA obligations attach — all data is fictional. For a real deployment: yes, SOCIII operates as a school official under 34 CFR §99.31(a)(1) with a FERPA addendum to the DPA. The immutable, append-only record actually strengthens FERPA compliance vs. spreadsheets.

**"Can we keep using Canvas?"**
Yes. SOCIII is the layer beneath the LMS, not a replacement for it. Canvas handles scheduling and the commodity LMS work; SOCIII handles the immutable record, competency attestation, and AI workers. Students can use both.

**"Does ATI actually integrate with this?"**
ATI is LTI 1.3 certified. Any LTI 1.3 Platform can launch it. The demo shows the exact data flow (score in → record updated). A real deployment requires Ascend Learning's confirmation that they'll launch as a Tool inside a new third-party LMS — that's a contract conversation, not a technical one.

**"Is student data portable?"**
Yes — that's the whole point. Show the Vault export in the demo. The student's signed competency record downloads in an open JSON format with cryptographic proof. They own it at graduation.

**"What about accessibility / WCAG?"**
The demo interface is not yet WCAG 2.1 AA certified. For a real deployment at a public university, accessibility is a procurement requirement and is on the roadmap. Be honest about this — don't claim compliance before it's verified.

**"What does this cost?"**
Two-tier answer — do not conflate them:

- **What the school pays Ruthie (TRAITLY/creator pricing):** This is Ruthie's call to set, not SOCIII's. A working illustration used internally is $99/month per school + $5/month per active student — but this number has NOT been formally approved by Sean/SOCIII and Ruthie has NOT confirmed it with any school. Do not quote it to a dean as a settled price. Say: "We're finalizing the education pricing — I'll send you the proposal after this meeting."
- **What Ruthie pays SOCIII (platform fee):** This is governed by the creator economics in CODEX 36 (platform subscription + pre-funded compute credits + per-event minting fees). It is not $99+$5 — those are two separate things.

> **Red team fix (v1.1):** The original draft cited CODEX 36 as the source of $99+$5. CODEX 36 does not contain this figure. The $99+$5 number appears in the Education GTM memory entry from 2026-06-13 as an illustrative structure, not a confirmed price. Before Ruthie quotes any number to a real institution, Sean needs to confirm what SOCIII charges her and what margin she sets. Quoting an unconfirmed price to a dean locks in a negotiating anchor nobody agreed to.

**"Who else is using this?"**
Honest answer: Makai is the first nursing-specific deployment; Ruthie is the pioneer. The platform substrate (append-only records, digital workers, Vault) is live across other verticals (real estate, automotive, regulatory advisory). The nursing-specific workers are new.

---

## 9. What NOT to Build in the Demo

- **Canvas replacement UI** — don't build a course calendar, an LMS-style sidebar, or a full gradebook UI. The demo shows the *record and the workers*, not a full LMS shell. Canvas-replacement is a future phase.
- **Real wearable integration** — no BLE/Health API connections in the demo. Wearables are a future connector.
- **Real ATI deep linking** — the demo uses simulated score delivery. Don't build a real OIDC handshake or JWK endpoint for the demo.
- **Real e-sign flow** — competency sign-offs in the demo use a simplified "approve" button, not a full Dropbox Sign / Google eSignature flow. The anchor is real; the signing ceremony is simplified for demo speed.
- **PHI of any kind** — no real clinical data, no real patient information, no real student names. All fictional.

---

## 10. Connection to Existing Platform (Don't Reinvent)

| Needed | Already Built |
|---|---|
| Append-only student record | DTC + Logbook substrate (`docs/learning-record-substrate.md`) |
| Clinical hour log | Logbook entry type `clinical_hour` (defined in learning-record-substrate.md §2.3) |
| Competency attainment | Logbook entry type `competency_attainment` with `attestedBy` field |
| Instructor attestation / digital signature | Existing `propose → approve → anchor` flow (same as Vault writes elsewhere) |
| OER course content | `GET /v1/edu:content` live endpoint (OpenStax + Open RN catalog wired) |
| Sibling worker injection | Fixed in this session — `status in ["active", "live"]` query |
| AI chat with worker grounding | `workerOwnData.js` pattern — one function per worker reads Firestore before chat |
| Canvas rendering | `WorkerCanvas.jsx` → `isREWorker` / `isDPPWorker` pattern — add `isNursingWorker` |

The nursing workers follow the exact same patterns as the DPP and RE workers. They are not special.

---

## 11. Spec References

- `docs/NURSING-LMS-BRIEF.md` — full strategic brief (read this before building)
- `docs/learning-record-substrate.md` — canonical record architecture
- `docs/codex/26-education-demo-persona.md` — prior education demo persona work
- `contracts/capabilities.json` — capability registry (add `nursing.record_write_v1`, `nursing.attestation_v1`; verify these match the existing `identity.register_user_v1`-style naming convention before adding)
- `functions/functions/raas/rulesets/eu_battery_dpp_v1.json` — reference for `chat_rules` format

---

## 12. Open Items Before First Live Use (Ruthie's Checklist)

These must be resolved before Ruthie walks this in front of a real dean or department chair:

- [ ] **Pricing confirmed with Sean** — Do not quote any dollar figure to a school until Sean confirms what SOCIII charges Ruthie (platform fee) and Ruthie decides what she charges the school. These are two separate numbers.
- [ ] **Hawaiian names approved by Ruthie** — The demo uses Hawaiian/Polynesian-evoking names (Makai, Kaia, Leilani, Dr. Kealani Moku, etc.) chosen by someone not from Hawaiʻi. Ruthie must confirm they read as genuine before any live meeting — change any that feel off.
- [ ] **`mintingExempt: true` confirmed** — Verify the demo tenant bypasses the credit-reservation gate before the first live walkthrough. A "please add credits" error mid-demo is unacceptable.
- [ ] **ATI language checked** — Rehearse the "ATI integrates via LTI 1.3" framing. Do not say "ATI is integrated" in present tense — it's a simulation in the demo.
- [ ] **WCAG caveat ready** — If a dean's IT office asks about accessibility, be prepared to say: "We're building to WCAG 2.1 AA; we don't have a VPAT yet — that's on the roadmap for a real institutional deployment."
