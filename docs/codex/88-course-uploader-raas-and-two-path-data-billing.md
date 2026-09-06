# CODEX 88 — Course Uploader Per-Course RAAS + Two-Path Data Billing

**Status:** 🟡 Course Uploader RAAS/billing rework in progress (background build); two-path billing model confirmed as *design decision*, not yet built — see §3
**Applies to:** Education vertical (Course Uploader / Ada / Hannah), and the same two-path billing shape for any future Box-plan vertical with an institution-vs-individual payer split (e.g. Business-in-a-Box's company vs. individual-seat variants)
**Date:** 2026-09-05
**Trigger:** QC pass on the Course Uploader build (CODEX 70 Surface 2) surfaced that no course has any real RAAS ruleset today; that conversation led directly into Sean's UH Maui semester-pricing call with Anne and the resulting two-path billing decision below.

---

## 1. The RAAS gap (why this CODEX exists)

Confirmed by reading the code, not assumed: `functions/functions/raas/raas.engine.js`'s `WORKER_RULESET_MAP` only maps a small, fixed list of *worker IDs* to ruleset files. Nursing's five workers share a real, substantial ruleset (`nursing_clinical_v1.json` — hard-stops against fabricated ATI scores, premature NCLEX-readiness declarations, unverified competency sign-offs, missing OER attribution, unsupported accreditation claims). The generic `course-tutor-001` worker — what every *non*-nursing course created via the Course Uploader actually uses — has **zero entries in the map. Zero enforcement.**

Sean's framing: "make sure every course has a studio locker. otherwise there is no RAAS." Correction surfaced during the check: every course *does* get its own isolated Studio Locker (each course gets its own `courseUid`, and the locker is scoped by `uid+workerId` — so document isolation is real and already correct). The actual gap is one level up: a locker full of raw documents (syllabus, rubric PDFs) injected into a system prompt is knowledge, not rules. RAAS is the constraint layer on top of that knowledge, and today no per-course version of that constraint layer can even be expressed — rulesets are keyed by a small, fixed worker-ID list, never by an individual course instance.

**Fix in progress** (background build, not yet merged as of this writing): a per-course ruleset stored on the course's own Firestore doc, generated via a new required wizard step ("make sure your rules are in place" — a short questionnaire or guided chat), with the RAAS engine checking for and applying a course-specific ruleset in addition to the existing static `WORKER_RULESET_MAP` lookup for course-tutor workers.

## 2. Wizard restructure (Sean, 2026-09-05)

The Course Uploader ("like a super-easy, stripped-down Sandbox") is being restructured from its original 4-step build into 3 creative steps, with instructor credential verification (.edu OTP) as a gate before step 1, not a numbered step in the flow itself:

1. **Name your course + chat setup** — course metadata + the tutor's chat persona.
2. **Upload your materials** — local files + real Google Drive import (already built, reusing the same infra as aviation document import), extended to support images/charts/video, with an option to *generate* supporting media via fal.ai (already integrated elsewhere on the platform — reused, not a new vendor integration). Media generation cost must be visible to the instructor before they trigger it, not hidden.
3. **Make sure your rules are in place** — the new RAAS step from §1. Then **Publish**.

## 3. Two-path data billing (Sean's decision, 2026-09-05)

**Context:** in the UH Maui College conversation with Anne, Sean agreed to keep the semester's fee **flat** — he has no real data yet on how heavily students will actually use Hannah. This matches [[CODEX 76]]'s own explicit recommendation: don't lock in overage terms until at least one real billing cycle of usage data exists. The usage-visibility reporting CODEX 76 built (monthly actual-vs-included report to the tenant's billing contact, framed as "strong engagement," nothing auto-charged) is exactly what will produce that data over this semester.

**The two-path model, as Sean described it — and confirmed already present as a *data-model* concept in `config/pricing.js`, though not yet built as working payment flows:**

- **Path 1 — Institution/corporate covers overage.** A company (e.g., a title company) has a real billing contact, and overage is charged to the institution's own account automatically **up to a threshold**, past which it requires an explicit trigger/approval rather than auto-charging indefinitely — the same shape Sean referenced in "Claude does this" (a spend threshold gates automatic top-up, not unlimited silent charging). `config/pricing.js`'s `businessInABox: { overagePaidBy: "seat" }` is the closest existing config shape, but "seat" here means the *seat-holder's own credits*, not an institution-wide pool with a threshold gate — the threshold/auto-vs-manual-trigger mechanism itself does not exist yet anywhere in the codebase. This needs to be built.
- **Path 2 — Institution covers the base seat price; overage is à la carte for the individual.** This is UH Maui's actual shape: the university pays the flat per-student seat price, but is **not** willing to cover open-ended data overage. `config/pricing.js`'s `education: { overagePaidBy: "student", ... "institution pool optional" }` already encodes this as the *default* for education — but there is currently **no actual payment flow** for a student or teacher to pay their own overage directly (no à la carte purchase UI, no individual payment method on file for this purpose). This is real, named work, not yet started.

**What CODEX 76 already flagged as open, still true today:** no metered Stripe price exists for AI-interaction-volume overage on either path; the actual overage rate is a placeholder (reusing the seat-overage rate, not a considered interaction-volume rate); `config/pricing.js` and `config/stripeBoxes.js` are two not-yet-reconciled sources of Box-plan truth. None of this blocks running the current semester at a flat rate — it blocks building either payment path for real, and blocks any future annual-contract overage-rate conversation.

## 4. What to build, in order (not started as of this CODEX)

1. Reconcile `config/pricing.js` / `config/stripeBoxes.js` (CODEX 76 §6 item 4) — prerequisite for both paths, avoids building on two divergent sources of truth.
2. A real metered Stripe price for AI-interaction-volume overage (CODEX 76 §6 item 1) — a commercial/rate decision requiring Sean's sign-off and Stripe API access, not something to default silently.
3. Path 1 (institution auto-covers with a threshold gate): the actual auto-charge-up-to-threshold-then-manual-trigger mechanism, modeled on Claude's own auto-reload pattern — genuinely new, nothing like this exists in the codebase today.
4. Path 2 (individual à la carte): a real payment flow for a student/teacher to pay their own overage — a payment method on file, a purchase UI, and the metering hook to actually charge it (as opposed to today's visibility-only reporting).
5. Only after at least one real billing cycle of usage data exists (per CODEX 76 §6 item 6, now actively collecting via UH Maui's semester): revisit the actual overage rate for interaction volume specifically, not the seat-overage rate reused as a placeholder today.

## Cross-references

- `docs/codex/70-education-demo-and-course-uploader.md` — original Course Uploader spec (Surface 2); this CODEX supersedes its 4-step flow with the 3-step restructure in §2.
- `docs/codex/76-institution-overage-billing-and-usage-reporting.md` — the usage-visibility build this CODEX's billing section builds directly on top of; read that CODEX's §0 correction before assuming any of its original plan still holds.
- `functions/functions/raas/raas.engine.js` — `WORKER_RULESET_MAP`, the static per-worker-ID mechanism the new per-course ruleset check extends.
- `functions/functions/raas/rulesets/nursing_clinical_v1.json` — the real ruleset schema (`hard_stops`/`chat_rules`/`soft_flags`/`disclaimer`/`system_context`) a generated per-course ruleset should follow.
- `functions/functions/config/pricing.js` — `overagePaidBy` field, the existing data-model expression of the two-path idea.
- `functions/functions/services/billing/boxPlanUsage.js` / `billing/resetMonthlyUsage.js` — the real, live usage-tracking and monthly-reporting mechanism currently producing the data this semester's UH Maui usage will be judged against.
