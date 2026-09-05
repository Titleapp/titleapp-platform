# CODEX 85 — The Four-App Push: Nursing, Student, DPP, Copilot

**Status:** SPEC — scoping and gap audit, no build started, for Sean's review
**Suite:** Cross-vertical (Nursing/Education, DPP, Aviation)
**Date:** 2026-09-03
**Trigger:** Same day as setting up real Apple Developer (Organization, Enrollment ID `N6HQQZZR2U`, pending verification) and Google Play Console (Organization, active) accounts, Sean asked to scope four native apps in relatively quick succession — a Nursing Student app, a general Student app, a DPP app, and a Copilot (aviation) app — "probably not all in one day." Sean's own framing for how to approach this: understand what we're doing conceptually, audit existing workers/tools for gaps, then write a Codex — one for the general push, with real per-app UX thinking since each is genuinely different. His one non-negotiable design bar, stated directly: **"you should always be able to talk to it and it works just fine."**
**Research method:** A repo-wide audit (delegated to a research sub-agent, key claims independently re-verified this session) of what already exists for each of the four verticals — backend workers, existing web portals, prior Codex specs — plus the platform's current native-app tooling (Capacitor config, dependencies, whether native project directories have ever been generated).

---

## 1. Executive Summary

- **These four apps are not one problem — they split into two genuinely different builds.** Nursing, Student, and DPP are all persona-scoped web experiences that already run inside `apps/business`'s `ClientPortal.jsx` pattern; wrapping them natively is a Capacitor job (already installed, already configured, never actually run). Copilot is a from-scratch native build requiring hardware access (Bluetooth GPS pairing, background location) that a web view fundamentally cannot provide — CODEX 64 already settled this: **"Native iOS App Required — Not PWA."** Don't sequence or scope these four as equals.
- **Nursing has the most groundwork by far.** A real, production student portal already exists (`ClientPortal.jsx`, `persona=student`, backed by the real `nursing-education-001` worker), with a real authorization fix and billing hookup shipped as recently as CODEX 82 (2026-08-29). This is the one that's closest to "wrap it and ship it."
- **DPP has real web infrastructure (the public passport viewer) but zero native-app planning anywhere, and a real open product question before it can be scoped: consumer app or merchant app?** A consumer "scan a battery, see its passport" app has a weak case for existing as a native app at all — a web page does that job with zero install. A merchant/field app ("chat with the DPP worker while auditing inventory") has a real "talk to it and it works" case. This needs an answer before DPP gets built, not during.
- **"General Student app" is the least differentiated of the four, and carries the same risk we already talked through and rejected for the "SOCIII does your email" idea.** Reusing nursing's persona infrastructure for a subject-agnostic tutor puts SOCIII in the same crowded field as ChatGPT's education mode and Khanmigo, without SOCIII's actual moat (rules-governed, domain-specific, audited expertise). Worth deciding explicitly whether this is a real standalone product or a lighter funnel feature, not assuming it's a smaller version of Nursing.
- **Copilot has the deepest existing spec (CODEX 64, a full v7 product spec with FAA regulatory framing and a ForeFlight-gap analysis) and the largest build — 8-16 weeks for the native app phase alone, per that Codex's own estimate — plus the most competitive, well-funded market of the four (ForeFlight, Ramco, FVO).** Richest homework, biggest lift. Sequence it last, which also matches what Sean already said this morning ("Nursing #1... DPP and then Aviation").
- **The platform's native-app tooling is real but configured as one single app, not four.** `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` are installed and `capacitor.config.json` is fully written (`appId: ai.sociii.app`, `appName: "SOCIII"`) — but `npx cap add ios/android` has never been run, and nobody has decided whether these four apps are four Capacitor "flavors" off one shared codebase or four fully separate projects (like the standalone `sociii-dpp-passport` Shopify app built this week). This is the first real architecture decision, and it's currently undecided everywhere. See §5.
- **Recommendation in one line:** sequence Nursing → DPP (once consumer-vs-merchant is answered) → Student (scoped honestly, likely lighter than assumed) → Copilot (biggest lift, own framework, own timeline) — and hold every one of them to the same bar: the chat interface has to be the primary surface and it has to actually work, not a bolted-on feature next to a dashboard.

---

## 2. The Conceptual Frame, Stated Plainly

Four different verticals, one shared design principle, and one shared piece of infrastructure that's mostly — but not fully — ready.

**The principle, in Sean's words:** you should always be able to talk to it and it works just fine. That's not a feature checkbox — it's the thing that has to be true before any of these four ships, and it's the thing that differentiates a SOCIII app from a generic dashboard-with-a-chatbot-bolted-on. Per-app UX sections below (§4) apply this concretely, not as a slogan.

**The infrastructure reality:** three of the four apps (Nursing, Student, DPP) are thin native wrappers around web experiences that already exist or are cheap to build using the exact same pattern (`ClientPortal.jsx`'s persona system). The fourth (Copilot) is a genuinely separate native build with its own framework decision, already made in principle by CODEX 64. Treating all four as "just wrap it in Capacitor" would be wrong for Copilot; treating Copilot's complexity as the norm would make Nursing/Student/DPP look harder than they are.

---

## 3. Current State Audit, Per Vertical

### 3.1 Nursing/Student — real backend, real portal, most ready

- Student-facing web portal already live: `apps/business/src/pages/ClientPortal.jsx`, routed at `/portal?company=uh-nursing&persona=student` (and `makai-nursing`), backed by a real API (`GET /v1/student:customer:profile`) reading the same `nursing-education-001` worker the operator/instructor side uses, scoped server-side by `persona`.
- CODEX 82 (2026-08-29, shipped) is recent, real work on this exact surface: a live authorization gap fixed, a real student picker, tenant/role gating, billing hookup — not a demo.
- No prior Codex scopes a *native* nursing/student app specifically — this audit found the web portal, not a mobile plan.

### 3.2 "General Student" — infrastructure exists, the "general" part doesn't

- The persona system in `ClientPortal.jsx` (buyer/seller/tenant/student/consumer/borrower/petowner) is genuinely generic — but only nursing schools currently populate `persona=student`. There is no existing general-purpose, subject-agnostic student worker or content base.
- Nothing found scoping what "general" actually means here — which subjects, what knowledge base, whether it's tutoring, scheduling, or something else entirely.

### 3.3 DPP — real consumer web viewer, zero native-app planning

- The public passport viewer (`/passport/:passportId`, resolving through `ClientPortal.jsx`'s `persona=consumer` pattern, backed by `/v1/dpp:passport:public`) is real and live — confirmed independently in CODEX 74/75, both read in full earlier this session.
- Searched broadly across every Codex and marketing doc: **no mention anywhere** of a native DPP app, consumer or merchant-side, distinct from the Shopify-embedded app built this session (`apps/sociii-dpp-passport`). This is a real gap in planning, not just in code.

### 3.4 Copilot/Aviation — a real, deep, already-named spec, and the hardest build

- `docs/codex/64-copilot-ipad-ux.md` (Spec v7, red-teamed 2026-08-03) is a genuine product spec: a manifest data model, weight-and-balance/CG calculation, FAA AC 120-76E EFB regulatory framing, and a real ForeFlight-gap analysis.
- **Directly verified this session, exact quote (CODEX 64, line 502):** *"Native iOS App Required — Not PWA."* Reason: CoreBluetooth (Sentry external GPS pairing) and CoreLocation background modes aren't available to a web view or PWA. **Build path recommendation (line 521): React Native** — "the pragmatic choice — shared JS business logic (Alex chat, brief formatting, Vault sync) with native modules for CoreLocation, CoreBluetooth, and offline tile storage." Worth noting this isn't fully closed: CODEX 64's own open-decisions list still carries "React Native vs. Swift" as unresolved, trading build speed against native BLE/CoreLocation performance.
- Phase 1 (compliance dashboard) is done. Phase 2 (route brief) estimated 4-6 weeks. Phase 3 (the actual native app) estimated 8-16 weeks — the largest single lift of any of the four verticals.
- Related, still spec-stage: `40-aviation-workspace.md`, `46-aviation-suite-expansion.md`.

---

## 4. Per-App UX: What "Always Talkable To" Actually Means Here

Not the same answer for all four — the value of talking to it differs by app, and pretending otherwise is how you end up with a chat box nobody uses next to the dashboard everyone actually uses.

### 4.1 Nursing Student app
Chat is the natural primary surface here already — the underlying worker exists to answer real clinical/coursework questions grounded in real curriculum data, not general knowledge. The UX risk isn't "will people talk to it," it's making sure the schedule/grades/case-study views stay secondary supporting panels *around* the chat rather than the app defaulting to a dashboard-first layout the way the desktop/instructor side reasonably does. This is the one app where "just wrap the existing portal" is close to sufficient — the chat-first bar is mostly already met by the underlying worker; the job is making sure the native shell doesn't bury it.

### 4.2 General Student app
This is where "always talkable to" gets genuinely hard, because a subject-agnostic tutor chat is exactly the crowded, low-differentiation space competitors already occupy (ChatGPT's education mode, Khanmigo). Talking to it "just working" isn't enough to differentiate if what it says isn't grounded in something SOCIII specifically knows. Recommend deciding this explicitly before design work starts: either narrow it to a real domain SOCIII already has depth in (a lighter, adjacent version of an existing vertical), or scope it honestly as an awareness/funnel product rather than a standalone one — the same resolution we already reached this session for the "SOCIII runs your email" idea.

### 4.3 DPP app
The consumer side has a real UX problem: someone who just scanned a QR code to check a battery's compliance status has no obvious reason to want an ongoing conversation about it — a web page already answers the one question they have. "Always talkable to" doesn't clearly add value for a single-glance lookup. The merchant/field side is different and more promising: someone auditing inventory or managing a supplier relationship has an ongoing, multi-turn need — "which of my SKUs are missing carbon-footprint data," "has this supplier's certification expired" — that's a real chat use case. **This distinction is the open decision that has to be answered before UX work starts, not resolved by UX work.** See §7.

### 4.4 Copilot app
Chat is already core to the existing spec (Alex/Skye, brief formatting, Vault sync per CODEX 64's own framing) — the harder UX problem here isn't whether to talk to it, it's making sure the chat interface stays usable and fast in a genuinely hostile environment (gloved hands, cockpit glare, one-handed operation, unreliable connectivity in flight) where a web-app-quality chat experience won't hold up. This is a real native-UX problem CODEX 64 should already be tracking in depth; flagging here only to confirm it's held to the same "just works" bar as the other three, under much harder constraints.

---

## 5. The Shared Infrastructure Decision

`apps/business/package.json` already has `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` (^8.4.2), and `apps/business/capacitor.config.json` is fully written — real `appId` (`ai.sociii.app`), `appName` ("SOCIII"), splash screen, status bar, and keyboard plugin config. **`npx cap add ios/android` has never been run** — no native project directories exist yet. This tooling is genuinely one command away from producing a native shell, but it's configured as a single app, not four.

Two real paths for Nursing/Student/DPP (Copilot is settled separately — see §3.4):

1. **Four Capacitor "flavors" off the shared `apps/business` codebase** — same React app, same build tooling, different `appId`/`appName`/app icon per target, each pointed at its own persona route on load. Cheap to stand up given the tooling is already there; the four apps stay in lockstep with the main web app's release cadence, for better or worse.
2. **Four fully separate projects**, each with its own Capacitor config and release cycle — closer to how `sociii-dpp-passport` was built this week (a standalone repo). More isolation, more independence per app, but real duplicated tooling/maintenance across three apps that are otherwise doing the same kind of wrapping job.

Nobody has decided this anywhere in the docs. Recommend option 1 (shared flavors) as the default unless there's a specific reason one of these three needs to diverge from `apps/business`'s release cadence — but this is a real decision, not a mechanical one. See §7.

---

## 6. Recommended Sequencing

```
Nursing Student app  ──────────────────────→ ship first (most groundwork, clearest chat-first case)
DPP app  ──→ [answer consumer-vs-merchant] ──→ ship second, once scoped
General Student app  ──→ [answer differentiation] ──→ ship third, likely lighter than assumed
Copilot app  ──────────────────────────────→ ship last (biggest lift, hardest market, own framework)
```

This matches what Sean already said this morning for the App Store priority order (Nursing #1, then DPP, then Aviation), with "general Student" slotted in based on how much groundwork actually exists relative to the other three — not asserted independently here.

---

## 7. Open Decisions for Sean

1. **Shared Capacitor flavors vs. four separate projects** (§5) — this determines how the next several weeks of work are structured technically. Recommend shared flavors as the default; flag if there's a reason to diverge.
2. **DPP: consumer app or merchant/field app?** (§4.3) — these are different products with different UX, different value cases for "talk to it," and possibly different priority given the consumer case is genuinely weak. Needs an answer before DPP design work starts.
3. **General Student app: real standalone product, or narrower/funnel-scoped?** (§4.2) — the crowded-market risk here is the same shape as the email-assistant idea already set aside this session. Worth deciding deliberately rather than assuming it's "Nursing but general."
4. **Copilot: React Native or Swift, still genuinely open per CODEX 64's own open-decisions list** — not re-litigated here, just flagged as still unresolved and worth confirming before Phase 3 (the native app itself, 8-16 weeks) actually starts, since it's the largest single line item across all four apps.
5. **Should this Codex spawn per-app follow-on Codices, or should each app's detailed scoping happen as part of build?** Copilot already has its own deep spec (CODEX 64); Nursing/Student/DPP don't yet. Recommend a short scoping Codex per app once its open decision above (2, 3) is answered, rather than designing all three in this document before any real UX work starts.

---

## 8. Sourcing Note

Internal claims (portal/persona architecture, worker backing, Capacitor config and dependency state, native directory absence) are sourced to a repo-audit research pass this session, with the Capacitor config/dependency claims and the CODEX 64 native-app quote independently re-verified via direct file reads rather than relying solely on the delegated pass. CODEX 64, 74, 75, and 82 were each either read in full this session (74, 75) or directly grepped for the specific claims cited (64, 82) — none of this document's claims about those Codices are secondhand paraphrase without a direct check.

Not yet verified, and worth confirming before this Codex's recommendations are treated as final: (a) whether `apps/business`'s existing route/build structure can cleanly support four different `appId`/icon "flavors" without real refactoring — this session confirmed the config exists, not that multi-flavor builds have been tested; (b) the actual competitive/market case for a merchant-side DPP app (§4.3) — flagged as the more promising UX direction here, but not independently researched this session the way CODEX 74's Shopify-competitor teardown was.
