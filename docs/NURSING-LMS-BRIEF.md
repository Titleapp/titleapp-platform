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

## 5. Suggested first moves for Claude Code

Start narrow and real. In rough order:

1. **Sync the fork** (see §6) so you're on current platform code — the data-driven canvas renderer, worker spec format, DTC/logbook, and chat grounding all landed recently.
2. **Model the nursing learning record** as DTC/logbook entry types: `course_grade`, `competency_attainment`, `clinical_hour`, `ati_assessment_score`. Append-only, attributed, approvable. Lean on the existing substrate — don't make a new store.
3. **Stub the LTI 1.3 Platform** (issuer, deployment, JWKS, OIDC launch) — enough to launch *one* ATI tool in a sandbox and receive one AGS score back. Prove the loop: ATI score → AGS → DTC entry → anchored.
4. **One nursing-native surface** that a generic LMS does badly — pick **competency tracker** or **clinical-hour log** — rendered through the existing canvas spec, reading the new record types.
5. **Accessibility pass** on whatever UI you build, every time (WCAG 2.1 AA).

Keep it a **wedge**, not a Canvas clone. The win is "nursing programs get a provable competency transcript + native ATI integration," not "feature parity with Blackboard."

---

## 6. Staying current with the platform (fork sync)

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

## 7. Open questions for Sean / counsel (not for Code to invent)

- FERPA addendum + DPA — counsel to attach.
- VPAT / accessibility audit status.
- Whether ATI will launch as a tool inside a new third-party LMS (Ascend Integration Specialist confirmation).
- Scope: full nursing LMS vs. wedge-that-grows (Sean's lean: **wedge first**).
