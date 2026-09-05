# CODEX 87 — Wearable Integration: Build-Out and Crawl/Walk/Run Test Roadmap

**Status:** SPEC — no build started, for Sean's review
**Suite:** Cross-vertical (Aviation MX, Aviation Pilot Ops, Nursing)
**Date:** 2026-09-04
**Trigger:** Same session as CODEX 86 (nursing charting) and the wearable-strategy-memo Sean shared (`wearable-strategy-memo.md`, forwarded via WhatsApp). Hardware decision, revised once during this same session: **both Sean and Ruthie start on RealWear** — one unit each, RealWear Developer Program (~$1,200 each, each ships a free Navigator 500). Meta glasses are now a possible secondary device for Sean later, not part of the starting hardware — deliberately deferred rather than run in parallel with RealWear from day one. Sean asked for a build-out plan plus a genuine crawl/walk/run test methodology — not literal test *flights*, a staged plan for validating whether the wearable capture actually helps or creates friction before expanding scope — starting from the simplest real primitive: observe something, tell it to remember. Sean's explicit addition: every go/no-go has to capture **why**, not just whether — a failed stage without a real diagnosis (hardware fit, pipeline gap, task mismatch, user resistance) isn't actionable.
**Research method:** Synthesizes the wearable-strategy-memo's own findings (RealWear/Vuzix institutional positioning, Meta's gated/consumer-motion limitations, the "capture → CODEX reasoning → structured record" architecture) with this session's own file-level audit of what capture/structured-output pipeline already exists in the codebase today (Logbook, `AviationWorkerCanvas.jsx`'s Release Flight form, the RAAS invariant generally). No new external research this pass — the memo already did that work; this doc is the build/test plan on top of it.

**Revision note (same day, red-team pass, with a live negotiated correction mid-review):** Five findings; one was narrowed through direct back-and-forth with Sean rather than accepted as originally raised — both outcomes are recorded here.

1. **Recording context at Life Flight Network — raised, then narrowed.** The original finding: crawl and walk both test recording technology on/around Sean's actual employer's ramp and maintenance staff, not a SOCIII sandbox, and that needed either LFN sign-off or an explicit decision to test elsewhere. **Sean's correction, accepted:** as PIC, recording his own walkaround/logbook observations on his phone or other devices is existing daily practice with no prohibition — crawl (§5.1) was never actually a new category of risk, just an extension of what he already does. **What still stands, narrowed:** walk (§5.2) involves *other people* (MX techs) using a SOCIII capture pipeline that could be mistaken for an official LFN system. The real requirement is smaller than original: be explicit with MX participants that this is a SOCIII product test, not an LFN-mandated tool, and participation is voluntary — not a full sign-off process. See §5.2.
2. **Nursing's recording-consent question (already flagged in CODEX 86) resurfaces here at the point recording actually starts, and the "patient-adjacent" boundary needs a sharper definition.** Sean confirmed "no patient-adjacent use, full stop" — but a live clarifying question is still open: does that also cover a simulated encounter with a standardized patient or a classmate role-playing a patient (another real person, recorded, even if not a real patient), or does run start with something safer — a student narrating their own observations about a written case study, with nobody else present or recorded? **This is still open — see §5.3 and §6 item 5.** If it's the second (self-narration only), "full stop" is already satisfied and there's nothing further to resolve; if the first, this needs its own consent/IRB answer (possibly through the nursing program's existing NURS-366 IRB study, per CODEX 73) before that version of run starts.
3. **Sequencing put the vertical Sean called "the biggest win" (CODEX 86) last, gated behind two aviation stages by device-sharing logic alone, with no consideration of decoupling.** Now addressed — see §5.3, which splits run into an early, capture-only sub-stage that doesn't need to wait for RealWear to clear aviation's crawl/walk gates first.
4. **MX discrepancy logging (walk) may create a second, non-authoritative record rather than replacing the real one** — Part 135 maintenance discrepancy logging typically has to land in an approved recordkeeping system; if SOCIII's capture is just parallel work re-entered into the official squawk system later, that's the same "second system alongside the real one" adoption-friction risk CODEX 86 flagged for nursing-vs-Epic. Now an explicit success-criterion question in §5.2, not just an implied one.
5. **The "why" diagnosis was a stated principle without a forced structure.** Now operationalized: every go/no-go in §5 must select from a named failure-category taxonomy (hardware fit / pipeline gap / task mismatch / user resistance / other, named) rather than defaulting to whatever narrative gets written after the fact.

---

## 1. Executive Summary

- **The memo's core architectural call is right, and it sets this doc's scope:** build one hardware-agnostic pipeline — **capture (voice/photo) → CODEX reasoning against the domain's authoritative source → rules validate → structured, auditable output** — not separate wearable integrations per vertical. Both Sean and Ruthie starting on the same RealWear hardware makes this even more natural: one real front end, two verticals, proving the pipeline generalizes before any second device enters the picture.
- **"Crawl" has to exercise the real pipeline, not a demo shortcut.** The differentiator here — same as nursing charting (CODEX 86) — is the rules-validation-plus-audit-trail step, not the capture. A crawl-stage test that skips rules validation "to keep it simple" doesn't actually test the thing worth testing. Simplicity should come from picking a small, low-stakes *task*, not from cutting the pipeline short.
- **Device capability still matters even with one hardware SKU** — RealWear has a real HUD, so nothing here is capture-only by hardware constraint the way a Meta-first plan would have been. Crawl/walk deliberately start capture-only anyway (§5.1, §5.2) because the *task* is simple, not because the device can't show anything back — the HUD feedback loop is saved for run (§5.3), where it's actually load-bearing.
- **A real primitive already exists to build the first crawl test on:** the Logbook (`aviation.log_flight_v1`, real, live, chat-driven — "log a flight" via Alex, Vault-owned, append-only). "Observe → tell it to remember" is not a new concept for this codebase; it's the existing chat-driven logbook pattern with a wearable as the new input channel instead of typed chat. That's the cheapest possible crawl-stage build — no new backend capability, just a new capture surface into a capability that already works.
- **What "done" looks like per stage is defined up front** (§5), matching the memo's own criteria (time per task, error/omission rate, sustained use past the novelty period) — plus Sean's explicit addition: every result needs a real diagnosis of **why**, pass or fail, not just a yes/no. A "no-go" with no cause identified isn't a usable result.

---

## 2. The One Pipeline, Two Front Ends

```
Capture (voice / photo)
        │
        ▼
CODEX reasoning against the domain's authoritative source
  (FAR/AC citations for aviation · nursing documentation standards for charting · AMM/AC citations for MX)
        │
        ▼
Rules validate (RAAS) — same invariant already proven elsewhere in the platform
        │
        ▼
Structured, auditable output — human confirms, event appends, nothing is silently finalized
```

One real hardware SKU to start — **RealWear, one unit each for Sean and Ruthie** — covering both verticals from day one. RealWear has a real HUD: it can show something back to the wearer (a checklist step, a flagged-missing-field prompt) as well as capture. Meta remains a possible *later* addition for Sean specifically (capture-only, no display) — deliberately not run in parallel with RealWear from the start, per the hardware decision.

Building the pipeline device-agnostic still matters even with one starting SKU: a feature proven on RealWear (e.g., logbook-by-voice) shouldn't need rebuilding if Meta enters later for a capture-only use case, or when a future Android XR device comes along — only the capture adapter should need to change, not the reasoning/rules/output layers underneath.

---

## 3. What Already Exists to Build On

- **Logbook** (`aviation.log_flight_v1`) — real, live, chat-driven: "log a flight — [tail], [dep], [arr], [hours], PIC" → appends an immutable Vault record. This is a near-exact match for "observe something, tell it to remember" — the wearable just becomes a new way to say that sentence.
- **Release Flight form** (`aviation.dispatch_release_flight_v1`) — real, live, currently a checkbox-heavy form (W&B acknowledgment, weather-briefing acknowledgment) — a real candidate for a voice-driven "walk" stage once the real W&B calculator (in progress, see aviation build queue) exists to attach real computed values to, not just a checkbox.
- **RAAS invariant** (agents propose → rules validate → human confirms → event appends) — already proven across every vertical in this codebase. Nothing new to invent architecturally; the work is applying it to a new *input channel* (wearable capture) and, for nursing charting specifically, a new *domain ruleset* (documentation standards — see CODEX 86).
- **Not yet existing:** any actual capture-ingestion pipeline for a photo or a voice clip originating from a wearable device (as opposed to typed chat) — this is the real new engineering surface this CODEX scopes.

---

## 4. Build-Out Order

1. **Capture ingestion, device-agnostic.** A real endpoint that accepts a voice clip or photo (from any source — a phone acting as a stand-in before hardware arrives, then RealWear once units are in hand) and routes it into the existing chat/worker pipeline the same way a typed message does today. This is the actual new infrastructure piece — everything downstream (reasoning, rules, structured output) already exists.
2. **Logbook-by-capture** (crawl stage — see §5.1) — wire capture ingestion into the existing, live `aviation.log_flight_v1` capability. No new domain logic; proves the ingestion pipeline works end-to-end on a capability that's already real.
3. **Nursing self-narration-by-capture** (early run sub-stage — see §5.3) — deliberately sequenced here, in parallel with walk rather than after it, because it doesn't need RealWear's HUD feedback loop and shouldn't be forced to wait behind aviation's device-sharing schedule given CODEX 86 named this the highest-value vertical. Reuses the same capture ingestion from step 1; the new piece is CODEX 86's documentation-standards ruleset, not the pipeline.
4. **MX discrepancy-by-capture** (walk stage — see §5.2) — same ingestion pipeline, pointed at a new-but-simple MX capability (log a squawk/discrepancy with a photo). Real domain logic this time (a discrepancy needs real fields — aircraft, system, description, severity — not just a logbook line), but still no rules-validation complexity beyond "are the required fields present." Whether this record becomes the actual record of record or just parallel work is a real open question — see §5.2.
5. **Nursing charting-with-HUD-feedback** (full run stage — see §5.3) — the real CODEX 86 target once the self-narration sub-stage (step 3) has proven the capture→rules pipeline: capture → structured draft chart entry → real documentation-standards rules validation → human confirms, with the HUD showing something back (a flagged missing field, a draft ready for review). This is where the actual differentiator gets tested for real, on real hardware, for the first time.

---

## 5. Crawl / Walk / Run — With Real Success Criteria

Each stage needs a real go/no-go before the next one starts. "Did it feel useful" is not a criterion — these are, matching the memo's own framing. **Every go/no-go, pass or fail, must be tagged with a cause from this list** (Sean's explicit requirement) — a result without one of these isn't a usable result:

- **Hardware fit** — the device itself didn't work for the task (comfort, battery, audio pickup, HUD visibility in the actual environment).
- **Pipeline gap** — the capture→reasoning→rules→output pipeline itself had a real defect (misheard transcription, wrong field extraction, a rule that should have fired and didn't).
- **Task mismatch** — the task wasn't actually a good fit for voice/wearable capture, independent of how well the hardware or pipeline performed.
- **User resistance** — the person kept reverting to their old method even though the tool worked, for reasons unrelated to the above (habit, trust, social/workplace friction).
- **Other** — named explicitly, not left as an unlabeled miscellaneous bucket.

### 5.1 Crawl — Pilot walkaround + logbook-by-voice (RealWear or phone stand-in)

- **Task:** during a preflight walkaround, speak observations naturally ("left main tire looks a little low, noting for logbook") and log a completed flight by voice instead of typing it into chat.
- **Device:** phone as a stand-in first (proves the pipeline before hardware arrives), then RealWear once it's in hand.
- **Recording context:** this is Sean, as PIC, recording his own observations — an extension of existing daily practice, not a new category of risk. No external sign-off needed.
- **Success criteria:** (a) voice-captured log entries are logged with the same accuracy as typed ones — spot-check against Sean's own actual flights; (b) time-to-log is equal or faster than typing; (c) Sean keeps using it past the first week without reverting to typing.
- **Go/no-go:** if accuracy is materially worse than typed entry, or Sean reverts to typing within a week, this needs rework before walk starts — don't proceed on faith. Tag the cause from the taxonomy above.

### 5.2 Walk — MX discrepancy logging (RealWear, MX crew at Hilo)

- **Task:** an MX tech notices something during a task, speaks a discrepancy note with a photo of the item, it becomes a real structured discrepancy record (not just a logbook line — needs aircraft/system/severity fields).
- **Device:** RealWear.
- **Recording context — a real precondition, not just a nicety:** before any MX tech participates, be explicit with them that this is a SOCIII product test, not an LFN-mandated tool, and participation is voluntary. This is not a regulatory sign-off requirement — it's making sure nobody mistakes a side-company's product test for an official employer system. This should happen before walk starts, every time a new participant joins.
- **Success criteria:** (a) real before/after comparison against however MX currently logs discrepancies (paper, existing squawk system) — time per entry, omission rate (does a required field get skipped that a form would have forced); (b) MX techs keep using it once the novelty wears off, per the memo's own stated bar; (c) **does this become the actual record of record, or does it create a second system that still has to be manually re-entered into the official squawk system?** If it's the latter, that's added work layered on top of the real process, not a replacement for it — the same "second system alongside Epic" adoption-friction risk CODEX 86 flagged for nursing, and it should be measured explicitly here, not just assumed away by a good time-per-entry number.
- **Go/no-go:** this is the stage most likely to surface "creates problems" per Sean's own framing (hands-busy MX environment, noise, whether photo+voice is actually easier than a tablet, and the record-of-record question above) — a real failure here should stop expansion into a bigger MX-glasses rollout, not get explained away. Tag the cause from the taxonomy above.

### 5.3 Run — Nursing charting-by-capture (RealWear, Ruthie) — split into two sub-stages, sequenced in parallel with walk, not behind it

Per CODEX 86, nursing is the highest-value vertical here — this roadmap deliberately doesn't force it to wait for both aviation stages to clear first. It splits into two sub-stages instead:

**5.3a — Self-narration, no other person recorded.** A student narrates their own observations about a written case study out loud — nobody else present, nobody else's voice captured — gets a structured draft chart entry back, validated against a real documentation-standards ruleset (CODEX 86), presented for approval. **This satisfies "no patient-adjacent use, full stop" unambiguously** — there's no patient, real or simulated, anywhere in the loop. This can start in parallel with walk (§5.2), reusing the same capture ingestion (§4 step 1) and CODEX 86's ruleset, without waiting on RealWear to clear aviation's gates first, since it doesn't need HUD feedback to produce a real result.

**5.3b — Simulated encounter (standardized patient or classmate role-play) — genuinely open, needs Sean's direct answer before it starts.** This is where a real person (not a real patient, but a real person) would be recorded during a practice scenario. Whether this is in-bounds under "no patient-adjacent, full stop" is not yet resolved — it depends on whether that boundary is about *real patients specifically* or *any recorded person in a patient-role scenario*. If this proceeds, it likely needs the nursing program's own consent process — possibly through the existing NURS-366 IRB study (CODEX 73) rather than treated as an internal SOCIII product test. **Do not start 5.3b until this is explicitly answered** — 5.3a does not depend on this answer and can proceed regardless.

- **Device:** RealWear — this is where the HUD's ability to show something back (a flagged missing required field, a draft ready for review) actually matters, unlike crawl/walk which are capture-only.
- **Success criteria:** matches CODEX 86's own framing — does real-time rules validation measurably reduce missing-required-field errors compared to DocuCare's current manual-faculty-grading baseline. This needs a real comparison, not a vibe check — Ruthie is well-positioned to set up that comparison given she owns the program relationship.
- **Go/no-go:** this is the highest-value, highest-complexity stage, and per the memo, entirely Ruthie's call on how (or whether) it feeds into the charting worker — this doc scopes the test, it doesn't presume the outcome or push a spec onto her program. Tag the cause from the taxonomy above.

---

## 6. Open Decisions for Sean

1. **Capture ingestion is real new infrastructure, not yet estimated.** Worth a real scoping pass (likely its own short build) before crawl starts, even though crawl itself reuses an existing capability downstream.
2. **Phone-as-stand-in vs. wait for hardware** — crawl (§5.1) can start before RealWear physically arrives, using a phone to prove the pipeline. Worth confirming that's the intent rather than waiting on hardware to start any of this.
3. **Who decides pass/fail per stage** — Sean for crawl/walk (his own operational access at LFN, per the memo), Ruthie for run (her program, her call) — worth stating explicitly rather than assuming, especially since run's success criteria depend on her setting up the DocuCare comparison.
4. **What happens on a "no-go"** — the memo's own framing ("decide whether to expand hardware, proceed to a paid customer pilot, or stop here") applies per-stage, not just at the end — worth deciding whether a walk-stage failure blocks run from starting, or whether they're independent enough to run in parallel once crawl passes.
5. **§5.3b's patient-adjacent boundary — genuinely unresolved, needs Sean's direct answer.** Does "no patient-adjacent use, full stop" cover a standardized-patient/classmate role-play scenario (a real person recorded, even though not a real patient), or does run stay at the self-narration level (§5.3a) until this is explicitly decided? This is the one open item in this document that blocks a specific sub-stage from starting — everything else can proceed without it.
6. **MX record-of-record status** (§5.2) — does a Part 135 operator's official squawk/discrepancy system need to stay the record of record regardless of what SOCIII's capture produces, or is there a real path to SOCIII's output *becoming* that record? This shapes whether walk's success criteria should include "was this accepted as the actual record" as a hard requirement, not just a nice-to-have observation.

---

## 7. Sourcing Note

This doc does no new external research — it's a synthesis of the wearable-strategy-memo Sean provided this session (regulatory findings on cockpit wearables, hardware decision, buying-motion analysis) and this session's own direct file reads confirming what capture/structured-output infrastructure already exists (`aviation.log_flight_v1`, `aviation.dispatch_release_flight_v1`, the RAAS invariant generally). The nursing-charting-specific claims in §5.3 are sourced to CODEX 86, written the same session. No claims here about RealWear/Meta hardware specifics, pricing, or regulatory status are re-verified beyond what the memo already established — if any of that has changed since the memo was written, this doc inherits that staleness risk.
