# Nursing LMS on SOCIII — Brief for Ruthie (+ Claude Code)

**For:** Ruthie Clearwater and her Claude Code instance.
**Purpose:** orient on the direction so Code can start building in the right shape. Read this top-to-bottom before touching code.
**Date:** 2026-06-26 · written off a working session with Sean.

---

## 0. TL;DR

You're not building "a nursing worker" anymore — you're exploring **a nursing-native LMS**, with **SOCIII underneath as the tamper-evident record of every grade, competency, and clinical hour.** ATI (your course-material + testing partner) plugs *into* you, not the other way around. The thing that makes this defensible is not the LMS UI — it's the **immutable learning record** beneath it.

One line: **the LMS is the interface; the SOCIII learning record is the product.**

---

## 1. The strategic shift

Until now the assumption was: SOCIII workers live *inside* the university's LMS (Canvas/Blackboard/D2L). The new idea: **replace the LMS for nursing schools.** That flips the integration in your favor and is a much bigger play — but it also changes what's mandatory (see §4).

Why nursing specifically is a real wedge (don't try to rebuild Canvas):
- Generic LMSs do nursing-specific things badly: **clinical-hour tracking, competency/skills attainment, NCLEX-readiness, ATI integration, and Board-of-Nursing / accreditation (ACEN/CCNE) reporting.**
- A nursing-native system that does those *well*, is AI-worker-driven, and produces a **provable transcript of competency** is differentiated. U of H (via Ruthie's relationship, dean-championed) is the beachhead.

### From Google microsites to a real platform — what's now possible

**Read this part carefully — it's the mental-model reset.** Ruthie's work so far has been shaped by what a Google microsite can do, and Code has been scoped to that. SOCIII is a different class of thing. The point isn't "a nicer website" — it's that whole categories of capability that were *impossible* on a microsite are now just available. Don't scope to the old ceiling.

| What a Google microsite can't do | What SOCIII does (available now) |
|---|---|
| Static pages; no real backend logic | Real backend + a **rules engine** (propose → validate → commit); AI workers with chat |
| No per-student data of record | **Append-only, attributed, anchored records**; a per-student **Vault** they own for life |
| No signatures / attestations | **Digital signatures** on evaluations, anchored into a tamper-evident audit trail |
| No live data — you hand-type or embed | **Turn-on connectors** (ATI via LTI, OpenStax/Open RN content, Google Drive/Gmail, wearables later) — no keys, no plumbing (§5, §6) |
| Pictures are clip-art you find | **Generate clinical visuals from data** — a real rhythm strip from the sim's numbers (§7) |
| Each instructor's stuff is a separate silo | **One governed, versioned, attributed corpus** that consolidates everyone's material (§9) |
| No identity, roles, or auth | SSO/SAML, roles, multi-tenant isolation |
| Content rots; no version history | Versioned, provenance-tracked, exportable, portable |
| You're stuck with what Google gives you | You (and your Code) **build new capabilities** as workers + connectors |

**The dot this connects:** you are not assembling a microsite with fancier widgets — you are building on a platform where a student's signed competency, the content it was assessed against, the visual they learned from, and the proof it happened all live in **one connected, provable record**. When Code understands that the floor is "real records + signatures + connectors + generated media + AI," it will design for the real ceiling, not the microsite one.

**And to be blunt about priorities: talking about this doesn't matter — doing it does.** Every section below points at something you can *make work on screen*. Build the clickable thing; the narrative follows.

---

## 2. The architecture (how it fits SOCIII)

```
   Students / Faculty
          │
   ┌──────▼───────────────────────────────┐
   │  Nursing LMS shell (the interface)    │  ← what you build
   │  courses · assignments · gradebook ·  │
   │  clinical hours · competencies        │
   └──────┬───────────────────────┬────────┘
          │ LTI 1.3 (you = Platform)│ writes
          ▼                         ▼
   ┌────────────┐          ┌─────────────────────────┐
   │   ATI      │  AGS →   │  SOCIII learning record  │  ← the moat
   │ (LTI Tool) │  scores  │  DTC + logbook, append-  │
   │            │          │  only, hash-chained,     │
   │  NRPS ←────┼─ roster  │  anchored (immutable     │
   │            │          │  transcript of record)   │
   └────────────┘          └─────────────────────────┘
```

Key inversion: **an LMS is an LTI *Platform* (a consumer of tools). ATI is a certified LTI *Tool*.** So as the LMS, you launch ATI, own the gradebook, and ATI writes scores back to *you*. Those scores then mint into the SOCIII immutable learning record.

This reuses what's already in the platform — **do not reinvent it:**
- **DTC + logbook substrate** = the system of record for typed/attested learning events (see `docs/learning-record-substrate.md`). Grades, competencies, clinical hours become DTC/logbook entries.
- **Vault** = the personal, cross-context system of record (the student's durable transcript lives here; the LMS is an adjacent reader/writer).
- **Workers + the data-driven canvas renderer** = how each surface (gradebook, cohort analytics, competency tracker) is drawn from a spec. Your Student Eval Worker is already the seed of this.
- **The rules engine + approval gates** = grade changes, competency sign-offs, etc. are *proposed → approved → appended*, never silently overwritten.

---

## 3. ATI integration — the facts

ATI (an **Ascend Learning** brand) has **no open public REST API.** It integrates through the **1EdTech LTI Advantage Complete** standard (certified 2026-05-20):

| Service | What it does | Who you are |
|---|---|---|
| **LTI 1.3** | secure launch / SSO into ATI | you = **Platform** |
| **Deep Linking 2.0** | embed specific ATI content/assessments in a course | Platform |
| **AGS 2.0** (Assignment & Grade Services) | **ATI writes scores back to your gradebook** | Platform owns the gradebook |
| **NRPS 2.0** (Names & Role Provisioning) | **you provide the roster + roles** to ATI | Platform |

No OneRoster / Caliper / QTI certification.

**What Code should pull first:** the **LTI 1.3 Platform-side** spec + **AGS** + **NRPS** (1EdTech / IMS Global). Implementing the *Platform* side is the unlock — it's well-documented standard work, not bespoke ATI glue.

**Human path:** Ascend staffs "Integration Specialist – Nurse Educator" roles. Ruthie's relationship is the lever to confirm ATI will launch as a tool inside a *new* third-party LMS and to get any deeper data agreement. (They're certified for it; worth confirming for a brand-new platform.)

---

## 4. Non-negotiables — these became existential

The moment you *are* the LMS, you become the **education-records system of record.** Two things that were "nice to have" for a worker are now **foundational product requirements**:

1. **FERPA.** You handle student education records for a public university. You must operate as a **"school official" with legitimate educational interest** (34 CFR §99.31(a)(1)), use data only under the institution's direction, and handle subprocessor re-disclosure (including AI model vendors). A FERPA addendum to the DPA is required.
2. **Accessibility — Section 508 / WCAG 2.1 AA + a VPAT.** A public university cannot procure a UI-forward system without it. Build to **WCAG 2.1 AA from day one** — retrofitting accessibility is brutal. Every component Code writes should be keyboard-navigable, screen-reader-labeled, and color-contrast-compliant.

(Full enterprise/education trust posture is in `docs/TRUST_AND_DATA_INTEGRITY.md` §14 — read that section; it's the compliance surface U of H will review.)

Also implied by "LMS of record": **SSO/SAML** against the university IdP, scale/load evidence, and a real gradebook/assignment data model.

---

## 5. The data layer — turn-on connectors (like ATTOM for real estate)

A vertical worker is only as good as the data it can reach. In real estate, a worker "turns on" ATTOM and can look up any property. **We built the same thing for nursing.** The platform has a **Connector Registry** (`functions/functions/config/connectors.js`) where each data source is declared once; Alex offers it; the creator says yes; the worker is connected — no API keys, no endpoints, ever visible to the creator.

New `health_education` connectors (live in the registry now):
- **`openstax_nursing`** — OpenStax's 8-book O.N.E. series (Fundamentals, Pharmacology, Med-Surg, Maternal-Newborn, Psych-Mental-Health, Clinical Skills, Nutrition, Population Health). **Free, CC BY 4.0, aligned to the 2023 NCLEX-PN/RN test plans.**
- **`openrn`** — Open RN textbooks + **25 VR patient-care scenarios** (CVTC / WTCS). Free, CC BY 4.0, NCLEX-RN aligned.
- **`ati_lti`** — the school's *existing* ATI subscription, connected via LTI (we don't resell ATI; the institution's license powers it).

Backend that powers this (real, deployed): `functions/functions/services/education/oerCatalog.js` (verified catalog + `findNursingContent(topic)`), exposed at **`GET /v1/edu:content?q=<topic>`**. Try it: ask for "cardiac rhythms" and it returns the real Med-Surg + Health-Alterations books with canonical links and the CC-BY attribution to carry.

**Important reframe (this changes the strategy):** open nursing content is no longer "dated." OpenStax + Open RN are current, peer-reviewed, NCLEX-aligned, and free. So **content is largely a solved, free input.** ATI's real value is *assessment, item banks, and NCLEX-readiness analytics* — not the textbook. That tells you where to compete (the LMS + record + AI tutoring on top of free content) and where to integrate (keep ATI for testing via LTI).

**For Code:** new connectors snap into the same registry as everything else. If you add another source (e.g., a state Board of Nursing feed, a sim-data provider), declare it in `config/connectors.js` with `verticals: ["health_education"]` and back it with a service module — don't hardcode it into a worker.

---

## 6. Connect the campus you already have (Google Workspace + MCP)

U of H runs on **Google Workspace (Drive + Gmail).** SOCIII already has **MCP connections to Google Drive and Gmail**, so a nursing worker can read/return course files, rubrics, and email *in the systems faculty already use* — no migration required. This is a low-friction wedge: "keep your Google Drive; the worker just works on top of it." (One connector per suite = email + Drive pickup; OneDrive is the fast-follow for Microsoft campuses.)

For Code: when a workflow needs a document or an email, prefer the **Google Drive / Gmail MCP tools** over asking the user to upload — it meets U of H where they are.

---

## 7. Patient simulations → generated clinical visuals (a real opportunity)

Ruthie's patient simulations today are essentially **data, not pictures** — rhythm strips, vital-sign sets, lab values, I&O, measurements. There's no *visual* of the patient or the waveform the student would actually see at the bedside. **That gap is an image-generation opportunity:** turn the sim's structured data into the visual a nurse must learn to read — an ECG/telemetry strip, a wound-progression image, a fundal-height or fetal-monitor tracing, a med label, a clinical scene.

How it should work on SOCIII:
- The sim data is the **source of truth** (typed, in the record). The image is a **rendering of that data**, generated on demand — never invented facts. (E.g., "sinus tach at 130, ST depression in II" → a strip that actually shows that.)
- This is governed by **RAAS rules for imagery**, not free-form prompting — the differentiator is *provenance*: every generated clinical image is tied to the data it came from and attributed/anchored, so it's safe to use in instruction and assessment. (See platform work on RAAS governance for imagery + voice.)
- Existing tooling: the chat runtime already has `generate_image`; the nursing build should call it from sim data with a clinical-accuracy rule layer, and store the result against the student/scenario record.

For Code + chat + Ruthie to "understand this": a sim scenario object should carry both its **data** and a **`visualize` capability** that renders the strip/image from that data. Chat should be able to say "show me the rhythm" and produce the real strip for *this* patient's numbers.

---

## 8. Wearables — live and simulated physiologic data

Two angles, both on-brand for the record-first model:
1. **Simulation realism:** wearable-style streams (HR, SpO₂, ECG, BP trends) make a sim feel live and give students time-series to interpret — the same data that feeds §7's generated strips.
2. **Real wearable data** (Apple Health, Fitbit, clinical monitors) as a future connector: physiologic data flowing into a governed, append-only record the student or clinician owns — exactly the Vault model. Treat it as another **turn-on connector** when it's time, with consent + provenance built in.

Keep it framed as data → record → (optional) generated visual, so it composes with everything else rather than being a one-off.

---

## 9. Consolidate the scattered great ideas into one governed corpus

Faculty (including Ruthie) have built lots of valuable but **scattered** material — little sites, spreadsheets, slide decks, handouts. Today that knowledge is siloed, un-versioned, and dies on someone's laptop. **SOCIII's append-only, attributed, versioned record is the natural place to unify it:** ingest the scattered artifacts into **one governed course/content corpus** where each piece keeps its author attribution, has a version history, and can be improved without losing provenance.

This is a genuine wedge — it's the OER weakness (maintenance/consolidation) that the open textbooks *don't* solve, and it's something neither ATI nor a generic LMS offers. The "living, consolidated, attributed nursing curriculum" is a story faculty will feel immediately.

For Code: model ingested materials as content records with `author`, `source`, `version`, `license` — reuse the worker-spec + DTC patterns; don't build a separate CMS.

---

## 10. The whole point — Vault records + digital signatures, working when you click

This is what makes Ruthie's vision *win*: it's one thing to **describe** a connected system, and another to **click and watch the pieces work together.** The demo has to show the loop closing:

- A clinical evaluation or competency sign-off the instructor completes →
- **digitally signed** (instructor attests; SOCIII anchors the signature into the audit trail) →
- written as an **append-only record into the student's Vault** (their durable, portable transcript of competency — see [[learning-record-substrate]] / Vault as the student's system of record) →
- visible to the student, exportable, and **provably theirs** — not trapped in an LMS that forgets them at graduation.

So the chain to make real and demoable:
**ATI/sim score or instructor evaluation → propose → instructor approves + digitally signs → append to student Vault → anchored → student sees their verified competency record.**

Make every link **clickable and visible**, not narrated. The "wow" is the student opening their Vault and seeing a signed, dated, verifiable competency that an instructor attested and the system can prove — portable for life. That is Ruthie's grand vision, and it's exactly what SOCIII is built to do; our job is to make it tangible on screen.

For Code, this means the nursing record types (§ "first moves" below) must: be **append-only**, carry an **attributed digital signature**, write into the **student's Vault**, and **anchor** on completion. Wire the existing signature + anchor + Vault substrates together for one real evaluation end-to-end before adding breadth.

---

## 11. Suggested first moves for Claude Code

Start narrow and real. In rough order:

1. **Sync the fork** (see §12) so you're on current platform code — the data-driven canvas renderer, worker spec format, DTC/logbook, chat grounding, the new `health_education` connectors (§5), and the `GET /v1/edu:content` OER endpoint all landed recently.
2. **Model the nursing learning record** as DTC/logbook entry types: `course_grade`, `competency_attainment`, `clinical_hour`, `ati_assessment_score`, `clinical_evaluation`. Append-only, attributed, **digitally signed**, approvable. Lean on the existing substrate — don't make a new store.
3. **Close ONE loop end-to-end and make it clickable (§10 is the whole point):** instructor completes a clinical evaluation → **proposes → approves + digitally signs** → appends to the **student's Vault** → **anchors** → student opens their Vault and sees the verified, dated, signed competency. Wire the existing signature + anchor + Vault substrates together — this single visible loop is more convincing than any breadth.
4. **Turn on the OER data layer (§5):** have the worker pull real content via `/v1/edu:content` (e.g. "show me cardiac-rhythm material") and cite it with CC-BY attribution. Content is free and solved — use it.
5. **Sim-data → generated visual (§7):** take a sim scenario's numbers (e.g. "sinus tach 130, ST depression II") and render the actual rhythm strip via `generate_image`, stored against the scenario/student record. Make chat able to say "show me the rhythm."
6. **One nursing-native surface** a generic LMS does badly — **competency tracker** or **clinical-hour log** — rendered through the canvas spec, reading the new record types. (The staff-credentials roster card is a good visual model.)
7. **Accessibility pass** on every UI you build (WCAG 2.1 AA) — non-negotiable for U of H (§4).

Keep it a **wedge**, not a Canvas clone. The win is "nursing programs get a provable, signed, portable competency transcript + native ATI integration + free current content," not "feature parity with Blackboard." And remember the Trump Rule: **show it working on screen — don't describe it.**

---

## 12. Staying current with the platform (fork sync)

Your fork `ruthie-lgtm/titleapp-platform` is the **full platform fork** (you're creator #1, you stay on the full fork). As of this brief it was **~220 commits behind** upstream `Titleapp/titleapp-platform` and **0 ahead** — i.e. nothing of yours to lose, a clean fast-forward. Get current before building:

**Easiest — GitHub UI:** open your fork → click **"Sync fork" → "Update branch."**

**Or with the gh CLI (run as yourself):**
```bash
gh repo sync ruthie-lgtm/titleapp-platform --branch main
```

**Or with git, if you have a local clone:**
```bash
git remote add upstream https://github.com/Titleapp/titleapp-platform.git   # one-time
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main
```

After syncing, you'll have: the data-driven canvas renderer (the keystone that makes worker specs actually draw real UI), the staff-credentials roster card pattern (a good model for a competency/roster card), per-worker chat grounding (anti-fabrication), and the learning-record substrate docs. Re-read `docs/learning-record-substrate.md` and this file after the sync.

**Going forward:** sync the fork before each work session so you don't drift 200 commits again. If you start committing your own nursing work, do it on a branch (e.g. `nursing-lms`) so syncing `main` stays a clean fast-forward.

---

## 13. Open questions for Sean / counsel (not for Code to invent)

- FERPA addendum + DPA — counsel to attach.
- VPAT / accessibility audit status.
- Whether ATI will launch as a tool inside a new third-party LMS (Ascend Integration Specialist confirmation).
- Scope: full nursing LMS vs. wedge-that-grows (Sean's lean: **wedge first**).
- Clinical-image generation (§7): the RAAS rule layer for clinical accuracy + the disclaimer/governance posture for instructional vs. assessment use.
- Wearables (§8): consent + data-handling model before any real device data flows in.
- Consolidation (§9): which scattered faculty materials to ingest first, and confirming reuse rights/licensing for non-OER instructor content.

---

## Appendix A — Data usage & governance (ethics & security committee summary)

*Plain-language summary of how student data is handled, enough for an IRB / ethics / IT-security review. Not exhaustive — the full posture is `docs/TRUST_AND_DATA_INTEGRITY.md` (esp. §14, education-sector), which counsel will pair with a FERPA addendum + DPA. Bracketed items `[CONFIRM]` are operational facts only the company/counsel can finalize before this goes to a committee.*

**1. What data, and why (purpose limitation).** Student education records needed for instruction, assessment, and competency tracking: enrollment/roster, course grades, ATI/assessment scores, competency attainment, clinical hours, instructor evaluations, and (with consent) simulation/wearable physiologic data. Used **only** to deliver the educational service the institution contracts for — not for advertising, not sold, not repurposed.

**2. Lawful basis (FERPA).** SOCIII acts as a **"school official" with a legitimate educational interest** (34 CFR §99.31(a)(1)), processing records **only under the institution's direction**. No re-disclosure except as the institution authorizes. A FERPA addendum to the DPA governs this. Minors/students under 18 (dual-enrollment) handled per the institution's FERPA/PPRA posture [CONFIRM].

**3. Where it lives (residency & isolation).** Data is logically isolated per tenant by default; **Dedicated tier** gives a physically separate, region-pinned database with **customer-managed encryption keys (CMEK)** the institution can revoke. US data residency; AI processing region named in the subprocessor list [CONFIRM region].

**4. Integrity (this is the differentiator).** Records are **append-only and hash-chained**, then periodically **anchored to an independent external register** — so history is tamper-evident and provable, including against insiders. Instructor evaluations and competency sign-offs carry **digital signatures** written into that same audit trail.

**5. AI use & model training.** AI workers **propose**; a rules engine validates; a human approves consequential actions. **No model vendor trains on student data** — we operate under enterprise/zero-retention API terms that prohibit it. Model vendors (e.g., Anthropic, OpenAI) are disclosed as **subprocessors** with their data-handling terms. Generated clinical visuals (§7) are rendered *from the underlying data*, governed by rules, and provenance-tracked — not free-form fabrication.

**6. Subprocessors.** A current list (name, role, region, data category) is part of the DPA, including model vendors and cloud/storage providers. [CONFIRM exhibit attached.]

**7. Access controls (insider threat).** SOCIII staff have **no routine access** to tenant data. Any support access requires a ticket/authorization **plus second-person approval** (no self-grant), is least-privilege and time-boxed, and is **logged into the same tamper-evident trail** — so our own access is auditable by the institution (Enterprise tier).

**8. Consent — sims & wearables.** Real wearable/physiologic data (§8) flows **only with explicit student consent**, with clear purpose and the ability to withdraw; simulation data used for instruction is synthetic/scenario data, not real patient PHI. [CONFIRM consent flow before any real-device data.]

**9. Retention & deletion.** Retention is contract-configurable. Hard-delete: on **Dedicated/CMEK**, deletion is cryptographically provable (key destruction / crypto-shredding); the external anchor stores only a non-reversible hash (hashes of encrypted, salted records — no recoverable PII). Supports FERPA record correction/expungement. [CONFIRM retention windows.]

**10. Accessibility.** Target **WCAG 2.1 AA**; a **VPAT** will be provided — required for public-university procurement. [CONFIRM VPAT status.]

**11. Security posture (stated honestly).** Production controls as above. **No third-party security attestation yet** (SOC 2 + external penetration test are on a named roadmap); we share status and reports/bridge letters on request. Documented incident-response plan; breach notification to the institution within [CONFIRM ≤72h], before any public disclosure; security contact [CONFIRM].

**12. Portability / exit.** Full record export in an **open, documented format** (events + files + verification proofs) on demand and at exit; the student's competency record is **theirs and portable** beyond enrollment. No lock-in.

**One-paragraph version for a committee:** *Student data is used solely to deliver instruction and assessment under the university's direction as a FERPA school official; it is isolated (and, on the Dedicated tier, encrypted under university-held keys), stored in an append-only, tamper-evident, externally-anchored record with digitally-signed evaluations; AI assists under a rules engine with human approval and no model trains on student data; staff access is second-person-approved and itself audited; wearable/real physiologic data requires explicit consent; data is deletable (provably so on Dedicated) and exportable in an open format; accessibility targets WCAG 2.1 AA with a VPAT; the vendor is early-stage and candid that SOC 2 and an external pentest are on the roadmap rather than complete.*
