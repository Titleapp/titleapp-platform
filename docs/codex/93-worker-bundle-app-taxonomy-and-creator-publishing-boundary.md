# CODEX 93 — Worker/Bundle/App Product Taxonomy and the Creator-Publishing Boundary

**Status:** Strategy/scoping doc only. Formalizes a live conversation (2026-09-17) into a named framework and a numbered set of open decisions. Nothing built yet.

**Decisions from Sean (2026-09-17, same day), resolving Open Decisions #1–#7 below:**
- **#1 (revenue share):** unchanged — the split stays the same as it is today. Nothing new to design.
- **#2 (graduation criteria, layer 2 → 3):** deliberately **not** a rubric. This is a one-off decision Sean makes personally, triggered by revenue or investment considerations as they come up — not a threshold or process to formalize.
- **#3 (creator wrapper re-auth):** reconfirmed yes.
- **#4 (mechanical gate contents):** confirmed as proposed below, then refined by #7's liability framing — see the updated §4.
- **#5 (Business-in-a-Box vs. Flagship App):** confirmed as **two distinct layers**, not one bundle with two GTM wrappers. New implication worth tracking: this creates a **second graduation path**, symmetric to layer 2→3 — SOCIII may run many Business-in-a-Box variants across different business types, and only a few of those will ever get promoted into a fully-built Flagship App. Same "rare, deliberate SOCIII-initiated" shape as the creator-graduation path, not a creator-side decision this time either.
- **(no number, technical confirmation):** the creator-native-wrapper mechanism itself should reuse the *same* flavor-based Capacitor approach already used for SOCIII's own flagship apps ("the same, with a wrapper") — at least for now. Not a second, bespoke technical system.
- **#6 (productizing the hand-off):** explicitly **stays manual for now** — "I don't want to get distracted." No self-serve build pipeline to design or build until real creator demand justifies it.
- **#7 (liability/support boundary):** **liability for a creator's own domain content sits with the creator, not SOCIII** — "it's not our kuleana to check their compliance, our job is to give them a platform that enables them to do things properly and makes customer billing and account stuff easy." This meaningfully narrows what §4's mechanical gate needs to do — see the revised Tier B below.

**Origin:** Grew directly out of two same-day conversations: (1) whether PETRA's title-search capability should be a separate app from property management (resolved: no — see §2.4 and CODEX 92-adjacent findings below), and (2) Sean's own framing of the product stack — "we have workers, we have Business in a Box, we have these initial apps... but if a creator wants to make an app out of their worker, we should probably give them that option, but how do we do that without making ourselves a cat herding shop."

---

## 1. Executive Summary

- **The product stack already has four real layers, not two** — Worker, Bundle (Business-in-a-Box or Flagship App), and Creator Storefront — but only the first three are things SOCIII fully owns and operates end to end. The fourth is a genuinely different kind of thing: a product surface controlled by an external party. Conflating it with the others is the actual source of the "cat herding" risk, not creator volume by itself.
- **The technical mechanism a creator-publishing model would need already exists and is already in production.** `apps/business/src/main.jsx` reads a build-time `VITE_NATIVE_FLAVOR` env var (plus per-flavor overrides like `VITE_NATIVE_RE_COMPANY`/`VITE_NATIVE_RE_PERSONA`) to make one shared Capacitor project (`apps/business/capacitor.config.json`, appId `ai.sociii.app`, `webDir: dist`) boot straight into a specific worker on native launch — this is how the aviation native app and at least one real-estate tenant flavor (Merritt Capital) already work today. A creator-scoped native wrapper is the same mechanism with a new flavor value, not new engineering.
- **The real reason to keep creator storefronts off native app stores is economic, not just operational.** Apple/Google take 15–30% off any revenue that flows through their in-app purchase rails. That comes out of the pool before SOCIII's own revenue share applies — so every creator subscriber paying via IAP shrinks the split for both the creator and SOCIII. Web/Stripe checkout (already the platform's payment rail) avoids this entirely.
- **The capability contract registry (`contracts/capabilities.json`) is the mechanism that lets creator publishing scale without per-creator human review**, since it already enforces `allowedCallers`/`requiredKyc`/`requiredRoles`/`writesAudit` per capability today for SOCIII's own workers. What's genuinely unbuilt is turning that from an engineer-authored gate into a submission-time validation pipeline for creator-authored rulesets (Open Decision #4).
- **This same session already produced one real precedent for "entitlements instead of a new app":** PETRA's Operations/Leasing/Compliance role-switcher (shipped 2026-09-17, `utils/propertyRole.js` + `PropertyRoleChooser.jsx` + Sidebar wiring) mirrors SKYE's aviation Pilot/MX/Dispatch pattern (`utils/crewRole.js`). Title search was seriously considered as a second real-estate app and rejected for exactly the "that's 2x iOS x Android for one buyer-type difference" reason driving this whole doc — it should become PETRA's fourth role instead, using the same entitlement mechanism, not a new build.
- **Mortgage servicing (Dana, `msr-servicing-001`) is real evidence the "one engine, vertical-specific compliance layer" pattern already works.** Its loan schema (`borrowerName`, UPB, `status`, `escrowAnnualTotal` — already optional/nullable) is largely asset-class-agnostic; what's mortgage-specific is the RAAS compliance layer (HUD-approved-housing-counselor referral language, RESPA framing baked into the borrower-persona chat guardrails at `index.js:6229-6240`). Extending Dana to auto or other securitized lending is mostly a new `raas/lending/{asset-class}/` vertical baseline, the same shape as `raas/real-estate/CA` vs `FL` vs `TX` already is — not new core engineering.

---

## 2. Current State (Audit)

### 2.1 The persona layer — one identity per vertical suite, already the platform's stated design

`functions/functions/index.js`'s `_SUITE_PERSONAS` map (cited in CODEX 90 at lines 5363–5392) is the single source of truth for which persona (Skye, Petra, Elara, etc.) a given worker slug belongs to. Its own comment states Petra is *"the single persona across the ENTIRE Title + Real Estate suite... it's all one identity."* This is already the platform's designed answer to "should this be a new persona or a role within an existing one" — the open question this doc addresses is one level up: which personas get a dedicated **app**, versus staying reachable only through the shared web marketplace.

### 2.2 The marketplace/catalog layer — mostly names, not built product

`apps/business/src/components/ChatPanel.jsx` (~lines 2975–3020) and `Sidebar.jsx`'s `RE_SUBCATEGORY` map show a large catalog of worker slugs already bucketed under Petra — escrow/closing (`esc-disclosure-package`, `esc-closing-disclosure`, `esc-firpta-1031`, etc.), CRE, construction lending, entity formation, and more, roughly 55+ names. A direct check this session found **none of the `esc-*` slugs beyond title search have a real backend handler directory** (`functions/functions/workers/`) — they exist as marketplace/pricing-page listing names (visible on the sociii.ai homepage's "Top 10 in All Industries Today" panel), not as shipped capability. This is the honest current state of the catalog layer: mostly names reserved for later, a small number genuinely real. Anyone reasoning about "how many workers do we already have" needs to check which layer they're counting from.

### 2.3 Business-in-a-Box — a real, distinct precedent, already shipping

Education Business in a Box (Ada persona, Course Uploader wizard) and Compliance in a Box (Elara/DPP) are real, active builds this quarter — curated operational bundles sold to a business running that specific business type, not branded consumer products. This is a genuinely different GTM motion from a Flagship App: the buyer is "give me the back-office stack to run an X business," not "I want the branded Y experience."

### 2.4 Flagship apps and the native-wrap decision rule — already deliberate, already selective

Native (Capacitor) wraps are not applied uniformly even within one flagship app. The existing, deliberate rule (tracked since 2026-09-05): native investment goes to consumer/field-facing use (on-the-go, phone-camera-driven, or literally can't be at a desk) — Pilot and MX in aviation, tenant/customer side in real estate, the DPP customer scan flow. Desk-based back-office work stays web-only regardless of vertical — aviation Dispatch, real-estate title-company/property-manager admin, nursing instructor side. **This is the same rule that resolved the title-search-as-separate-app question earlier today**: title-company back-office users are desk-based the same way Dispatch is, so folding title search into PETRA as an entitled role, web-only, matches a rule the platform already applies elsewhere — it isn't a new exception.

### 2.5 The capability contract registry as an enforcement mechanism, not just documentation

`contracts/capabilities.json` already declares, per capability: `allowedCallers`, `requiredKyc`, `requiredRoles`, `emitsEvent`, `writesAudit`. Per `CLAUDE.md`'s own stated invariant, "if a capability is not declared there, it does not exist" — this is a real, load-bearing enforcement point today, not aspirational language. The gap for creator publishing specifically: every entry today is hand-authored by a SOCIII engineer describing a SOCIII-built worker. Nothing today validates a creator-submitted worker/ruleset against this registry at submission time — that pipeline doesn't exist (Open Decision #4).

### 2.6 The native-wrapper mechanism a creator model would reuse

`apps/business/src/main.jsx` (lines ~10, 35–36, 107–109) already implements exactly the mechanism a creator-scoped app would need: a build-time `VITE_NATIVE_FLAVOR` value plus flavor-specific overrides, read at launch to set `ta_redirect_page` and send the user straight into one specific worker/persona, bypassing the general workspace hub entirely. One shared Capacitor project (`apps/business/capacitor.config.json`) already produces multiple differently-scoped native experiences from the same `dist` build this way. A "creator flavor" is the same pattern with a new value — real, low-risk, already-proven infrastructure, not a new subsystem.

---

## 3. Proposed Taxonomy

| Layer | Definition | Example | Built/owned by | Distribution | Monetization | Native app? | Gate |
|---|---|---|---|---|---|---|---|
| **0. Worker** | Atomic RAAS-governed capability | `re-title-search-001` | SOCIII | Not sold standalone | N/A | No | Capability registry |
| **1a. Business in a Box** | Curated operational bundle for running a business type | Education Business in a Box, Compliance in a Box | SOCIII | Direct to operators | Business subscription | No | Bundle-level QA |
| **1b. Flagship App** | Curated, branded, role-entitled bundle with real UX | SKYE, PETRA, ELARA | SOCIII, end to end | App Store + web | Consumer subscription or business-in-a-box | Yes, selectively (§2.4's rule) | Full product review |
| **2. Creator Storefront** | One creator's own worker, published under their name | (none live yet) | Creator (content) + SOCIII (infra/shell) | SOCIII marketplace + creator-branded web page | Revenue share (unchanged split — Resolved #1) | **No** — no separate native build published or maintained by SOCIII | Mechanical: capability registry validation, not manual product review |
| **3. Graduated Flagship** *(rare, deliberate)* | A creator's work invested into its own dedicated app | (none yet) | SOCIII (deliberate investment decision) | App Store + web | Case-by-case | Yes | Same bar as any flagship decision — SOCIII-initiated only |

**Resolved 2026-09-17 (#5): 1a and 1b are two distinct layers, not one bundle with two GTM wrappers.** This surfaces a second graduation path, symmetric to 2→3: SOCIII may run many Business-in-a-Box variants across different business types, and only a few will ever be promoted into a fully-built Flagship App. Same shape as the creator-graduation path — rare, deliberate, SOCIII-initiated, not a rubric (see Resolved #2 below).

---

## 4. The Creator-Publishing Boundary

This is the actual strategic decision this doc exists to record.

**The problem, precisely stated:** letting creators self-serve into their own native app multiplies four costs that don't scale linearly with creator count — a distinct App Store/Play Store developer relationship and review cycle per creator, an OS-compatibility maintenance treadmill per app, a support inbox per creator, and (per §4 below) a real revenue loss to store fees. None of these get cheaper by having more infrastructure; they get more expensive by having more creators.

**The proposed boundary:** a creator's worker is always reachable as a **layer-2 storefront** — SOCIII's shared marketplace, a creator-branded web page, checkout on SOCIII's existing Stripe rail. SOCIII never builds, publishes, or maintains a native app on a creator's behalf at this layer.

**If a creator specifically wants a native app anyway:** SOCIII hands them a **thin wrapper, not a fork** — a generic Capacitor shell (the same mechanism in §2.6, extended with a new `VITE_NATIVE_FLAVOR` value scoped to that creator's single worker) that the creator compiles and publishes under **their own developer account**. Critically, the wrapper still calls SOCIII's hosted API:
- The revenue-share relationship continues unchanged on that traffic (Sean, 2026-09-17: keep the split the same).
- The capability registry still governs everything the worker can do — publishing a native shell doesn't grant the creator's app any capability their worker wasn't already entitled to.
- **Authentication round-trips through SOCIII, confirmed by Sean this session** — a subscriber's entitlement lives in SOCIII's system, not the creator's. This is what keeps the hand-off a wrapper-and-continue-the-relationship model rather than a disguised full exit.
- What actually transfers to the creator is narrow and deliberate: the App Store/Play Store developer account, the review process, the ongoing OS-compatibility burden, and the 15–30% store cut on whatever revenue flows through that specific native channel. The underlying platform IP — the RAAS engine, the rules for other tenants, other workers — never leaves SOCIII's infrastructure, consistent with `CLAUDE.md`'s own framing of defensive IP as the engine and record model, not the UI.

**Resolved 2026-09-17 (technical confirmation, no number):** the wrapper described above should reuse the *same* flavor-based Capacitor mechanism already used for SOCIII's own flagship apps, not a second bespoke system — "the same, with a wrapper," at least for now.

**Resolved 2026-09-17 (#4 and #7 together) — the mechanical gate, narrowed by where liability actually sits:**

Sean's answer to #7 is explicit: **liability for a creator's own domain content sits with the creator, not SOCIII** — "it's not our kuleana to check their compliance, our job is to give them a platform that enables them to do things properly and makes customer billing and account stuff easy." That meaningfully narrows what the gate needs to do, into three tiers:

- **Tier A — auto-approved, fully mechanical, this is most submissions.** A creator worker may only declare capabilities from a new, deliberately narrow `creator.*` class — content generation, chat, scheduling, read-only lookups on the creator's own content. No write access to another tenant's data, no direct financial-transaction capability, no direct PHI-adjacent capability. The check is a set-membership test: every capability referenced exists in the allowlist, and the worker defines zero new capability IDs of its own. It then inherits the same `requiredKyc`/`requiredRoles`/tenant-scoping enforcement every other capability already gets platform-wide — nothing new to build there. **This tier does the real regulatory-exposure work, structurally, not by reviewing content:** by simply never granting a creator worker a capability that touches money-movement or health data directly, SOCIII's own platform-level exposure on those fronts is prevented by scope restriction, before liability allocation even matters. Billing/account handling itself stays entirely inside SOCIII's own already-compliant Stripe/account infrastructure — exactly the "customer billing and account stuff easy" half of what Sean says the platform actually owes the creator.
- **Tier B — automated scan, narrowed by #7 to platform-integrity only, not domain-compliance.** Originally scoped (in the first draft of this doc) to flag regulated-domain vocabulary (medical/legal/financial claims) for human review — **that's now out of scope per #7**, since vetting whether a creator's domain content is *correct* isn't SOCIII's kuleana. What remains genuinely SOCIII's problem regardless of liability allocation: impersonation of SOCIII/Anthropic/a real person, prompt-injection/self-jailbreak attempts, and attempted capability-scope violations (Tier A already blocks these mechanically, but a text-level scan catches an attempt to talk the model into acting outside its declared scope at runtime, not just at submission). This is a materially smaller, more mechanical job than the original Tier B — a platform-abuse scan, not a compliance review.
- **Tier C — not self-serve.** Any request for a capability outside `creator.*`, or a genuinely new capability, still routes to a real human decision — which in practice overlaps with the graduation conversation (Resolved #2) and shouldn't pretend to be mechanical.

**Why this self-selects correctly:** most creators will be satisfied with a web storefront reaching their whole audience without any app-store friction. Only creators serious enough to run their own developer account will bother with the native option — which is exactly the population equipped to carry that overhead, rather than SOCIII carrying it on their behalf.

**Layer 3 stays separate and rare.** A creator's work becoming a fully SOCIII-built, SOCIII-published flagship app is a deliberate investment decision SOCIII initiates (based on revenue, strategic fit, or exclusivity) — never something a creator graduates into by request or by hitting a metric threshold on their own.

---

## 5. Open Decisions — all seven resolved 2026-09-17

1. ~~Revenue-share mechanics for layer 2~~ — **Resolved: unchanged.** Same split as today; nothing new to design. (Still worth writing the actual percentage/calculation basis down somewhere durable outside this doc — that's a documentation task, not an open decision anymore.)
2. ~~Graduation criteria for layer 2 → layer 3~~ — **Resolved: deliberately not a rubric.** A one-off decision Sean makes personally, triggered by revenue or investment considerations as they arise. Same answer extends to the new 1a→1b graduation path found while resolving #5.
3. ~~Does the creator wrapper re-authenticate through SOCIII's own auth?~~ — **Resolved 2026-09-17 — yes.** Reconfirmed.
4. ~~What the mechanical gate checks~~ — **Resolved: three tiers (A/B/C), see §4.** Narrowed materially by #7's liability answer — Tier B dropped from "flag regulated-domain content for human review" to "platform-integrity/abuse scan only."
5. ~~Whether Business-in-a-Box (1a) and Flagship App (1b) are meaningfully distinct layers~~ — **Resolved: yes, two distinct layers**, with a symmetric 1a→1b graduation path (see §3).
6. ~~Productizing the hand-off itself~~ — **Resolved: stays manual, on purpose.** "I don't want to get distracted" — no self-serve build pipeline until real creator demand justifies the investment. A SOCIII engineer cuts each creator build by hand for now.
7. ~~Liability/support boundary once a creator's native app is live~~ — **Resolved: liability for the creator's own domain content sits with the creator, not SOCIII.** SOCIII's job is the enabling platform (properly-scoped capabilities, billing, account infrastructure), not compliance-checking what creators build with it. This is also what narrowed #4's Tier B.

**No open decisions remain from this doc's original scope.** Any of these can still be revisited if real creator activity surfaces something the framework didn't anticipate — this is a strategy doc formalizing decisions already made, not a permanent constraint on revisiting them.

---

## 6. Sourcing Note

Grounded in direct repo checks performed the same day: `_SUITE_PERSONAS` mapping and file:line citations reused from CODEX 90's own verified audit; `esc-*` worker-slug backend-handler check (`functions/functions/workers/` directory listing) performed fresh this session and found zero handler directories beyond `re-title-search-001`; `re-title-search-001/handler.js` read directly (402 lines, real ATTOM integration, immutable chain-of-title events); MSR/Dana backend checked directly (`index.js` lines ~2232, ~5360, ~6229–6240, ~20513–20619) confirming real Firestore-backed loan records and mortgage-specific compliance guardrail language; `apps/business/src/main.jsx` and `capacitor.config.json` read directly to confirm the `VITE_NATIVE_FLAVOR` mechanism; `contracts/capabilities.json` structure confirmed against existing entries. The four-layer taxonomy and the creator-publishing boundary itself are Sean's own framing from this session's conversation, formalized here rather than independently derived — this doc records and grounds a strategic decision already made in discussion, it does not propose a new one.
