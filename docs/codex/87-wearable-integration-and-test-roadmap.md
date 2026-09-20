# CODEX 87 — Wearable Integration: Build-Out and Crawl/Walk/Run Test Roadmap

**Status:** SPEC — hardware now physically in hand (see 2026-09-19 revision below); build not yet started
**Suite:** Cross-vertical (Aviation MX, Aviation Pilot Ops, Nursing, LFN Flight/Med Crew). See companion doc **CODEX 96** for the PETRA/real-estate front, split out separately given its own scope (property inspection + property MX/landscaping/engineering).
**Date:** 2026-09-04 (original), revised 2026-09-19

---

## Revision, 2026-09-19 — hardware arrived, training-first reframing, a fourth front

**Hardware is physically in hand.** RealWear units arrived today. **Sequencing note, added after red-team review, for pattern consistency with how other recurring costs have been gated elsewhere in this same session (citation-monitoring SaaS, X API tier — quote/decision before commit):** this purchase happened before this doc's plan was fully scoped — hardware first, plan second, the reverse of that pattern. Not a problem in itself (it's a sunk, modest cost, and the crew's reaction to seeing it is what triggered this whole revision), just worth Sean knowing the sequencing was inverted here specifically. Sean demoed the concept informally to LFN's flight/med crew (not a real patient encounter — showing them the hardware and idea) and, unprompted, their reaction named three distinct real features:
1. **HUD checklist/dosage display** — hands-free reference during patient care. Lowest risk of the three: it's read-only reference display, not capture of anything.
2. **Remote medical director communication** — a live comms channel through the headset. Likely overlaps with an already-regulated medical-control communication system LFN has in place — needs LFN's clinical/ops leadership involved before any building starts, not a SOCIII-internal product-test decision.
3. **Ambient capture during patient care, fed into charting** — the highest-stakes version of the "patient-adjacent" boundary this doc already drew as "full stop" (§6 item 5). Real patient, real PHI, real emergency care. **Not proceeding on this one informally** — it needs LFN's own clinical/compliance/legal sign-off, not a SOCIII pilot decision, regardless of how enthusiastic the crew is. Key distinction that changes the calculus entirely: a flight-team member separately asked about doing this in **training/simulation labs** — confirmed with Sean as literal training/simulation (mannequins, tabletop, no real patient), not a chemistry/clinical lab. That has none of PHI/consent problem — it's the same risk category as this doc's existing nursing self-narration/simulated-encounter stages (§5.3), just a second real client group (LFN's own flight/med crew) hitting the identical pipeline.

**Strategic reframe, Sean's own insight — training-first across every front, not just nursing.** The original crawl/walk sequencing (§5.1/§5.2) had Sean and MX techs starting in **live operations** (his real walkaround/logbook, real MX squawks). Sean's proposed change: start pilot and MX in **training/procedure-practice contexts** instead — preflight flows, checklist use, procedure training (same logic for turbine-aircraft "flows," which are operator-specific per aircraft, same as operator-specific checklists) — for two reasons: (1) it's uniformly lower-risk, matching the same "no live consequence" logic already used for nursing and now the med-crew lab case; (2) training adoption may convert to real-operations adoption *faster* than trying to change already-habituated senior staff behavior — new pilots/techs build the habit on the tool from day one. This unifies all four fronts under one simple rule instead of four separate risk calculations: **every front starts in training/simulation, not live ops.**

**RAAS tiering confirmed for aviation checklists specifically (Sean's own clarification):** AFM/POH-approved checklists are the Tier 1 (manufacturer/regulatory) baseline; each operator's own specific checklist, and for turbine aircraft their own memorized "flows," are Tier 2 (operator policy) documents layered on top. This is the exact same RAAS four-tier shape already used everywhere else in this codebase — no new architecture needed, just real content to encode per operator.

**Revised stage structure, replacing §5's original crawl/walk assignment (see §5 below for the full, updated detail):**
- **Stage 1 — training/simulation, all four fronts, in parallel, not sequenced by device availability:** pilot checklist/procedure training; MX procedure training (not live squawks); nursing self-narration/simulated encounter (unchanged from original §5.3a/b); LFN flight/med crew training-lab charting capture (new).
- **Stage 2 — live operations, per front, only once that front's training stage proves out AND (where relevant) gets real institutional sign-off.** Sean's own live logbook stays the lowest-barrier live candidate (existing personal practice, no new risk). MX live squawks, and any live medical charting, each need their own real sign-off before Stage 2 starts — this doc does not presume that sign-off, it's a gate.

**What this doc does NOT resolve, still open:** whether the aviation/MX training use case runs through LFN's own formal recurrent-training/checklist-proficiency program (a real stakeholder relationship to manage) or starts informally with Sean and a few willing pilots/techs — genuinely unanswered as of this revision, worth Sean confirming before Stage 1 building starts for those two fronts specifically.

---

## Revision, 2026-09-19 (continued) — distribution, enrollment, and hardware ownership decided; the connector doesn't need a native app; a concrete two-phase test plan with named testers

Same-day continuation, prompted by Sean working through the practical "how does a customer actually get this thing running" questions the earlier revision left implicit.

**Distribution and enrollment — resolved, no customer-side pain.** RealWear devices (Release 11+ firmware) support standard Android Enterprise "Device Owner / Fully Managed" zero-touch enrollment — the same model any corporate-managed Android fleet uses. SOCIII operates one central device-management account (either RealWear's own Ari Business Cloud, or a third-party Android EMM off RealWear's supported-provider list — which one is still open, see §6 item 11), organized into device groups per tenant. Enrollment is a single QR-code scan on first boot, or fully zero-touch if SOCIII pre-provisions before shipping. **A customer never touches RealWear's own platform** — this directly answers Sean's "does every customer have to register a roster with RealWear" concern: no.

**Hardware ownership — decided: customers procure their own devices, SOCIII does not.** Explicit call, Sean, 2026-09-19: SOCIII will not own, lease, ship, or RMA a device fleet. Customers buy their own RealWear hardware (through RealWear or a reseller); SOCIII's footprint is limited to enrollment into the central device-management fleet, the app/connector, and the backend/data layer. Reasoning, pressure-tested against a hypothetical 15,000-aviation-MX-tech scale: owning hardware logistics at any real volume turns SOCIII into a hardware-support company, not a software company — confirmed directly from the real shipping friction on the very first demo pair.

**Platform reality check — Android only, no iOS path, and that's not a SOCIII limitation.** RealWear HMT/Navigator units are standalone Android 10 AOSP computers, not phone-tethered. A "RealWear One" companion app exists for iOS/Android, but it only handles remote configuration or joining a video call — the headset itself never runs iOS. This is the hardware, not a gap in SOCIII's plan.

**Interaction model corrected — WearHF is not a separate assistant SOCIII integrates with.** RealWear's on-device voice layer (WearHF) is an OS-level "say what you see" overlay driven entirely by metadata on our own app's UI elements — native Android's `content_description`, or (see below) plain HTML `title`/`placeholder` attributes for a web app. It is not a Siri-style assistant sitting between the wearer and our AI. Our own capture (mic/photo) runs inside our own app or page, hitting our own backend directly; WearHF's only job is hands-free navigation of screens we already control.

**Output model — split, don't put chat prose on a HUD.** On-device: short, glanceable HUD lines only, plus optional brief TTS reserved for anything safety-relevant enough to interrupt hands-free attention — never a full LLM response read aloud or displayed as a paragraph. The full conversational response, detailed answer, and audit trail render where they already do — the existing ChatPanel (phone/tablet/desktop) — since reading beats listening for anything longer than a sentence.

**Escalation — two explicit tiers, and Tier B is genuinely new scope.**
- **Tier A — ask the AI tutor** (e.g., "Hannah, ..."), in-flow, answered immediately by voice in one sentence, full answer logged to the Vault/ChatPanel for later reading. This is the common case and shouldn't interrupt task flow.
- **Tier B — call the human instructor**, a deliberately different trigger phrase (e.g., "escalate," never a variant of the AI's own wake word — RealWear's own voice-design guidance requires commands be phonetically distinct, 2+ syllables, non-overlapping, or WearHF misfires between them). **This is not covered by any existing CODEX 87/90/96 scope and needs a real decision, not an assumption:** either (a) a live audio bridge to a real human, matching the "remote medical director" pattern from the LFN med-crew thread, or (b) a hard pause-and-flag into an instructor-review queue. Which one — see §6 item 12. The exact wake-phrase set for both tiers needs its own short design pass before build — see §6 item 13.

**Connector architecture — RealWear officially supports web apps as a first-class path; this revises §4 step 1.** RealWear's developer documentation treats HTML/web apps as a supported environment: WearHF voice tags work via plain `title`/`placeholder` HTML attributes, and camera/mic access is standard `getUserMedia()` — no native Android APK and no MDM app push required to get a real capture front-end running. **This means the capture-ingestion connector (§4 step 1) should be built as a web page running in RealWear's stock browser, hitting the platform's existing Firebase Auth, Storage, and tenant-scoped Firestore** — reusing infrastructure that already exists rather than standing up a native app. A native app remains a possible later upgrade only if the web experience proves insufficient for a specific task, not a prerequisite to start. This also resolves the "how do we get captured files back off the device" gap raised earlier the same day — a web connector uploads directly to the real backend, there's no local-file-retrieval problem to solve.

**Concrete two-phase test plan, named testers — replaces the abstract crawl/walk assignments in §5.1/§5.2 with real people for this pass, without changing those stages' underlying task definitions.**

Sean dogfoods the connector solo first, before any named tester below touches it. Then, per person:

- **Phase 1 — capture only, RAAS off.** The real connector (per above — not a mock), hitting the real tenant-scoped backend, just collecting real capture data against each person's real task. No validation logic yet.
  - **James (pilot)** — preflight walkaround/checklist flow, mapping to §5.1's crawl task; a second real pilot data point alongside Sean's own.
  - **Travis / Clinton (MX)** — a real MX task or discrepancy note, mapping to §5.2's walk task.
  - **Ruthie's nursing students** — self-narration against a case study, mapping to §5.3a.
- **Phase 2 — same person, same connector, RAAS validation on.** Once Phase 1 data confirms hardware fit and basic capture reliability for that person/task, flip on that domain's RAAS ruleset (Tier 1 + Tier 2, per §5's existing tiering) and have them deliberately do something wrong on a step, to verify the system actually flags or corrects it in real time — not just passively collects.
- **Nothing gets rebuilt between phases** — Phase 2 is the same connector and the same data path with a rules engine turned on, not a second build.
- **Pacing constraint:** Phase 2 for any given task is gated on that task's RAAS ruleset actually being authored (Tier 1/Tier 2 content) — real domain-expert writing work, not engineering — and can lag behind the connector being ready without blocking that person's Phase 1.

---
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

### 5.4 LFN flight/med crew — training-lab charting capture (RealWear) — added 2026-09-19

- **Task:** during a training/simulation lab scenario (mannequin, tabletop — explicitly NOT a real patient encounter), a flight medic or nurse narrates patient-care observations and actions as they'd occur in the field, gets a structured draft chart entry back, validated against the same kind of documentation-standards ruleset used for nursing (CODEX 86) adapted to EMS/flight-medicine charting requirements (a real, not-yet-audited ruleset gap — see §6 item 7).
- **Device:** RealWear.
- **Recording context — correction after red-team review, the 5.3a/5.3b split applies here too and this doc originally skipped it.** No real patient anywhere in the loop either way — that part's solid. But EMS/flight-medicine training labs are frequently team-based (one crew member narrates while colleagues participate, respond, or play a role in the scenario), which is exactly the "a real person, not a real patient, but still a real person, recorded" question §5.3b flags as genuinely unresolved for nursing's simulated-encounter case. This doc originally treated §5.4 as unambiguously safe without checking whether that same question applies. **Split it the same way nursing is split:**
  - **5.4a — single-person self-narration only** (a medic alone narrating a written/tabletop scenario, nobody else present or recorded): satisfies "no patient-adjacent use, full stop" unambiguously, same logic as 5.3a. Proceeds now.
  - **5.4b — team-based training scenario, colleagues recorded**: genuinely open, same status as 5.3b — needs Sean's direct answer (and possibly LFN's own training-department input) before it starts, not a pass because "training lab" sounds inherently safe.
  No LFN clinical/compliance sign-off needed for 5.4a specifically; **neither sub-stage extends to real patient encounters** — see the 2026-09-19 revision note above for why that stays parked regardless.
- **Success criteria:** same shape as nursing (§5.3) — does capture-to-structured-chart reduce missing/incomplete documentation versus however the training program currently grades or reviews charting today. Needs a real baseline comparison, not a vibe check.
- **Go/no-go:** tag the cause from the taxonomy in §5's intro. A real failure here (hardware fit in a hands-busy clinical simulation, transcription accuracy on medical terminology, task mismatch) should stop expansion toward the live-operations conversation, not get waved past because the crew was excited about the concept.
- **Open question, not yet answered:** is this SOCIII's own internal capture, or does it plug into an existing training/simulation record system LFN already uses? Same "second system vs. real system of record" question CODEX 87 already flagged for MX (§5.2) — don't assume it away here either.

---

## 6. Open Decisions for Sean

1. **Capture ingestion is real new infrastructure, not yet estimated.** Worth a real scoping pass (likely its own short build) before crawl starts, even though crawl itself reuses an existing capability downstream.
2. **Phone-as-stand-in vs. wait for hardware** — crawl (§5.1) can start before RealWear physically arrives, using a phone to prove the pipeline. Worth confirming that's the intent rather than waiting on hardware to start any of this.
3. **Who decides pass/fail per stage** — Sean for crawl/walk (his own operational access at LFN, per the memo), Ruthie for run (her program, her call) — worth stating explicitly rather than assuming, especially since run's success criteria depend on her setting up the DocuCare comparison.
4. **What happens on a "no-go"** — the memo's own framing ("decide whether to expand hardware, proceed to a paid customer pilot, or stop here") applies per-stage, not just at the end — worth deciding whether a walk-stage failure blocks run from starting, or whether they're independent enough to run in parallel once crawl passes.
5. **§5.3b's patient-adjacent boundary — genuinely unresolved, needs Sean's direct answer.** Does "no patient-adjacent use, full stop" cover a standardized-patient/classmate role-play scenario (a real person recorded, even though not a real patient), or does run stay at the self-narration level (§5.3a) until this is explicitly decided? This is the one open item in this document that blocks a specific sub-stage from starting — everything else can proceed without it.
6. **MX record-of-record status** (§5.2) — does a Part 135 operator's official squawk/discrepancy system need to stay the record of record regardless of what SOCIII's capture produces, or is there a real path to SOCIII's output *becoming* that record? This shapes whether walk's success criteria should include "was this accepted as the actual record" as a hard requirement, not just a nice-to-have observation.
7. **Added 2026-09-19 — is aviation/MX training-first (Stage 1) a formal LFN training-program engagement, or informal?** Changes who the real stakeholder is (a training department vs. just Sean and willing colleagues) and how fast this can actually start. Genuinely unanswered as of this revision.
8. **Added 2026-09-19 — EMS/flight-medicine charting ruleset doesn't exist yet.** §5.4's training-lab charting capture needs a real documentation-standards ruleset the way nursing has CODEX 86 — this hasn't been scoped. Likely needs its own short research pass (what do EMS/flight-medicine charting standards actually require) before §5.4 can produce a real structured output, not just a transcript.
9. **Added 2026-09-19 — does §5.4 plug into an existing LFN training/simulation record system, or is it standalone SOCIII capture?** Same record-of-record question as item 6, applied to the med-crew front — don't assume it away.
10. **Added after red-team review, 2026-09-19 — §5.4b (team-based training scenarios) is now the same open item as §5.3b, needs Sean's direct answer.** Does "no patient-adjacent, full stop" extend to a colleague recorded playing a role in a training scenario, or does §5.4 stay at single-person self-narration (5.4a) until this is explicitly decided? Blocks only 5.4b — 5.4a proceeds regardless, same relationship 5.3a has to 5.3b.
11. **Added 2026-09-19 (continued) — Ari Business Cloud vs. a third-party Android EMM for device management.** Both are viable per RealWear's supported-EMM list; Ari Business Cloud is RealWear's own and likely tightest on firmware/app-push integration, but a third-party EMM might integrate better if SOCIII already has other device-management needs. Needs a real comparison pass before committing, not just defaulting to whichever is easiest to sign up for.
12. **Added 2026-09-19 (continued) — Tier B escalation mechanism: live audio bridge vs. flag-and-queue.** A live bridge to a real human instructor/remote medical director is a materially bigger build (real-time audio routing, presence/availability, who's on the other end and when) than a hard pause that flags the session into a review queue. Sean's call, and probably answered differently per vertical (LFN's remote-medical-director pattern may already lean toward live audio; a nursing lab instructor reviewing a flagged session afterward may not need to be live at all).
13. **Added 2026-09-19 (continued) — exact wake-phrase set for Tier A ("ask AI") vs. Tier B ("call human").** Needs its own short design pass against RealWear's own voice-command guidance (phonetically distinct, 2+ syllables, no overlapping second/third syllables) before build — not something to pick casually and discover collides in practice.

---

## 7. Sourcing Note

This doc does no new external research — it's a synthesis of the wearable-strategy-memo Sean provided this session (regulatory findings on cockpit wearables, hardware decision, buying-motion analysis) and this session's own direct file reads confirming what capture/structured-output infrastructure already exists (`aviation.log_flight_v1`, `aviation.dispatch_release_flight_v1`, the RAAS invariant generally). The nursing-charting-specific claims in §5.3 are sourced to CODEX 86, written the same session. No claims here about RealWear/Meta hardware specifics, pricing, or regulatory status are re-verified beyond what the memo already established — if any of that has changed since the memo was written, this doc inherits that staleness risk.
