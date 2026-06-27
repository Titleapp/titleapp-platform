# 14 — Nursing LMS: signed-Vault loop, education connectors, and the capability menu

**Date:** 2026-06-27
**Arc:** Ruthie Clearwater (creator #1, nursing) + University of Hawaii (dean-championed, our most important client). Trigger: U of H wants university-wide use; Ruthie is exploring replacing the nursing-school LMS. This codex captures the product + platform work that came out of that strategy session.

---

## The thesis, applied to education

SOCIII = "a tamper-evident audit trail your AI workers write to; the record is the product, the workers are the interface." Applied to nursing: the LMS is the *interface*, the **immutable, signed, anchored learning record** is the *moat*. Don't rebuild Canvas — own the record + the AI workers + the integrations, as a nursing wedge (clinical hours, competency, NCLEX readiness, ATI integration, BON/accreditation reporting).

Strategic reframes locked this session:
- **Open content is solved & free.** OpenStax O.N.E. (8 books) and Open RN (+25 VR sims) are current, CC-BY, NCLEX-aligned. So ATI's moat is *assessment/analytics*, not the textbook. Compete on LMS+record+AI; integrate ATI for testing via **LTI** (Ruthie's product becomes the LTI **Platform**; ATI plugs in as a Tool; AGS pushes scores back → mint into the record).
- **U of H runs Google Workspace** → existing Drive/Gmail MCP is the low-friction wedge.
- **Sims are data, not pictures** → generate clinical visuals (ECG strips, etc.) *from* the data, governed by RAAS imagery rules.
- **FERPA + accessibility (VPAT/WCAG 2.1 AA) become existential** the moment you're the records system (drove the trust-memo v2.2 §14 after an independent reviewer scored v2.1 at 58 on the education surface).

---

## What shipped (all deployed + pushed both remotes)

### 1. The signed-Vault loop (the §10 payoff, end-to-end)
`functions/functions/services/education/clinicalEvaluation.js`:
- `signAndMintEvaluation()` — computes a real SHA-256 **signature hash chain** (`services/signatureService/blockchain.js`) over the evaluation, then `mintDtc()` (`services/vault/vaultWriter.js`) into the **student's Vault** as type `clinical_evaluation` (contentHash set; externally anchored by the daily batch).
- `listStudentEvaluations()` — reads them back and **recomputes `verifyChain`** per record → proof it's untampered.
- Routes: `POST /v1/edu:evaluation:sign`, `GET /v1/edu:evaluations`.
- e2e verified live: sign → 200, list → verified:true; DTC confirmed in Firestore.

**The demoable moment:** instructor fills + Approve & Sign → digitally signed → student's Vault → anchored → student sees a verified, portable competency. Built on existing substrates, no new store.

### 2. Education connectors — "turn on like ATTOM"
`functions/functions/config/connectors.js` already *was* the registry Sean wanted (creators flip a switch; no keys). Added `health_education` connectors: `openstax_nursing`, `openrn`, `ati_lti` (LTI, per-institution — we don't resell ATI) + vertical aliases (education/nursing → health_education). Backed by `services/education/oerCatalog.js` (verified CC-BY catalog) at `GET /v1/edu:content?q=…`.

### 3. Instructor UI + Ruthie's workers render
- `ClinicalEvalCard.jsx` (signal `card:clinical-eval`): Sign Evaluation form → signed receipt; Signed Records tab with recomputed "Signature verified" badges.
- `OerContentCard.jsx` (signal `card:oer-content`): live free NCLEX-aligned course content.
- Worker `clinical-evaluation-001` registered + added to Dr. Chen's workspace + seeded one eval.
- **Ruthie's two workers had 0 canvas tabs (flat shell)** → gave them real tabs: `student-eval-001` (Sign + Records), `nursing-education-001` (Course Content + Sign + Records).

### 4. The capability menu (the adoption unlock)
Insight: the bottleneck isn't building — creators and their Code don't know the **possibility space**, so they build to the website ceiling. Two surfaces:
- `docs/CREATOR-CAPABILITIES.md` — creator- AND Code-facing menu (connectors, owned Vault records, signatures+anchoring, data-driven canvas, chat-drives-canvas, visuals-from-data, MCP, rules+gates), each with the real hook + a copy-me example. In every fork; linked from CREATOR-SETUP + CREATOR-WORKER-BUILD.
- Alex chat: `services/alex/prompts/capabilities.js` injected for builder/owner surfaces (business, chief-of-staff, sandbox, developer). **Generative day-zero stance:** offer what's possible by name, and when asked for something not listed, say "yes — here's how we'd build it" + pitch ideas. Guardrail kept: "platform can do X / you can build X" ≠ "this worker already does X."

### 5. QA-001 now actually checks chat + canvas
`scripts/qa-001/checks/`:
- `canvas-render.js` (P0, static): every worker tab signal resolves to a registered card component; every referenced `card:*` is registered. Catches the flat-render / orphaned-signal class (Ruthie's 0-tab bug). Non-vacuous: 42 signals / 30 components / 11 live slugs / 28 refs.
- `chat-smoke.js` (P0, live best-effort): one real chat turn through the deployed frontdoor; asserts 200 + non-empty grounded answer; P2-skips without creds. The "No response received" gate.

---

## QA status at end of day
- `canvas-render`: **PASS** (0 P0).
- `chat-smoke`: **PASS** (live).
- Full `chatTest.js` (11 surfaces): **10/11**. Everything built/touched is grounded (COS, accounting, contacts, HR, marketing, spine-4 roster, vet dosing, edu cohort, vault). One red: `title-abstract-001` — generic intro, **no seeded data in the demo tenant** (pre-existing gap, not today's work).
- Pre-existing QA-001 P0s unrelated to this arc: `state-machine` flowStep recognition (advisor/creator flows). Left for a separate pass.

---

## Operational notes / gotchas
- API requires `x-tenant-id` header on all `/v1` calls (global gate) — creators' Code must send it.
- Demo password `MeadowCreek!2026` is **rotated**; e2e auth uses the admin throwaway-password trick (`chatTest.js getToken`).
- Ruthie: platform account `ruthie@sociii.ai` (uid `0XXysVzFNuOznMPxZZx3BxhU8d42`); GitHub fork `ruthie-lgtm/titleapp-platform` (full fork, was ~227 behind / 0 ahead — builds in-app, hasn't pushed to git). Engagement heartbeat only (last-active + worker count), per Sean "not Big Brother."

## Open / next
- `title-abstract-001` — seed demo data or wire ATTOM for the demo tenant so it grounds.
- Sim-data → generated clinical visuals (RAAS imagery rule layer) — §7 of the brief, not yet built.
- LTI 1.3 Platform side (consume ATI via AGS/NRPS) — Ruthie's Code first build.
- FERPA addendum + VPAT — counsel/ops (committee blockers for U of H).
- Surface still-newer capabilities in Alex as they ship (keep `capabilities.js` ↔ `CREATOR-CAPABILITIES.md` in sync).

## Artifacts in Sean's Downloads (to send)
`SOCIII-Nursing-LMS-Brief-for-Ruthie.md` · `Ruthie-Fork-Update-Instructions.md` · `SOCIII-Creator-Capabilities.md` · `SOCIII-Trust-and-Data-Integrity.md`
