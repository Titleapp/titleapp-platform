# ZONING-001
## Zoning + Entitlement (Consumer Side)

**Digital Worker Specification** | SOCIII Platform | **v1.0**
**Date:** 2026-06-07
**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Spec inheritance:** SITE-RECON-001 · LAW-LANDUSE-001 (sibling lawyer-grade worker) · CODEX S52.19 (ATTOM Zoning + Permits API) · **CODEX S52.43 (Platform RAAS Invariants)** · CODEX S52.41 (Substrate-Precedence) · CODEX S52.37 (Canvas-Worker Parity + Trump Rule) · BILLING RULING (prepaid-only)

> *"'What can I build on this parcel?' — answered in plain English for a homeowner who does not have a land use attorney on retainer. The consumer-facing simplifier; LAW-LANDUSE-001 is the lawyer-grade opinion."*

**Authoring note:** elevates `intent.md` (Track B-2 scaffold) to full build-ready spec. Platform invariants are INHERITED from CODEX S52.43 (see §18). This is the **consumer** counterpart to LAW-LANDUSE-001 — same parcel substrate, homeowner-grade surface.

---

## §1 — What This Worker Is

ZONING-001 answers **"what can I build on this parcel?"** in plain English for a homeowner, small builder, first-time buyer, or agent who does not have a land use attorney on retainer. Input: address + a plain-English question ("can I add an ADU?", "can I split this lot?", "can I rebuild what burned?", "is this rentable short-term?"). Output: a clear **allowed / conditional / not-allowed** verdict with:
- the relevant **zoning code section** — a live, retrievable citation (never model-recalled, EH-01)
- the **next-step procedure** — over-the-counter permit / planning hearing / variance / rezone / no path
- an honest **cost + timeline** estimate to get entitled (gap-declared when unknown, EH-04)
- the **restrictions that actually bite** — setbacks, height, lot coverage, parking, overlays — as numeric values

It differs from LAW-LANDUSE-001 (the lawyer-facing professional opinion) by being the **homeowner-grade simplifier**: plain language at a 7th-grade reading level, Lego-instruction-grade procedure cards, and aggressive escalation to the lawyer-grade worker when stakes rise.

---

## §2 — What This Worker Is NOT

- **NOT a substitute for a land use attorney.** Every verdict carries *"general guidance based on public code — for a binding determination, get a land use attorney."* Escalates to LAW-LANDUSE-001 when stakes rise (RULE-05).
- **NOT a permit-application worker.** Surfaces the next-step procedure but does not file. PERMIT-001-CITIZEN handles filing (accepts `permit-intent-bundle/v1`).
- **NOT a feasibility study.** "Can I build it?" yes; "should I, from a market standpoint?" → FEASIBILITY-001.
- **NOT LAW-LANDUSE-001.** That is the lawyer-grade paid-practitioner opinion. This is the homeowner-grade simplifier emitting `legal-question-bundle/v1` to it on escalation.
- **NOT a title product.** Ownership / encumbrances / rights → TITLE-ABSTRACT-001.

---

## §3 — Persona Detection + Tiers

Inherited from platform substrate per CODEX S52.43. Consumer-first.

| Tier | User profile | UX behavior | Cost basis |
|---|---|---|---|
| **Tier-Q — Homeowner / Buyer (default)** | Single property; one question; no attorney | Plain English, 7th-grade reading level, examples-heavy, aggressive escalation triggers | Lightest |
| **Tier-R — Small builder / Agent** | Scoping a project before purchase; fielding client questions | Plain English + code citations + restriction detail + entitlement-path detail | Moderate |

No entitlement layer in v1 — single-payer consumer worker.

---

## §4 — Inputs

**From user (primary):** address + plain-English question.

**From Site Recon handoff:** `parcel-bundle/v1` (address, APN, ATTOM, GIS geometry, jurisdiction). **`ZONING_UNAVAILABLE` flip** — when SITE-RECON-001 cannot resolve zoning for a parcel during its own screen, it hands off to ZONING-001 (with cost gate) for the deeper consumer zoning analysis.

**Standalone:** address + question directly; auto-resolves the parcel first (Reagan Rule — verifies the address resolves before proceeding).

**User-supplied (per Reagan Rule — tagged `verified: false`):** HOA CC&Rs (private restrictions can override allowed-by-zoning), prior approvals, survey. Accepted, reasoned over, flagged unverified until cross-referenced.

---

## §5 — Data Sources / RAAS Composition

**Tier hierarchy:**
- **Tier 0/1/2** — platform invariants (CODEX S52.43), audit anchor, cost gate, consumer-language discipline, escalation discipline
- **Tier 3** — zoning sub-vertical: permitted-use taxonomy, ministerial-vs-discretionary path semantics, ADU/density state law, variance/CUP/rezone procedure
- **Tier 4** — jurisdictional zoning codes (e.g. Maui County HI, Sublette County WY, Mono County CA), state preemption (ADU/SB-9-class density law), coastal/SMA overlays
- **Tier 5 (LOAD-BEARING)** — parcel-specific overlays: SMA/coastal, flood, historic, HOA/CC&Rs, special tax districts (Mello-Roos/CFD), PUD covenants

**External feeds (retrieval only, no model recall — EH-01):** ATTOM `attom:zoning` + `attom:permits`; county code lookup (`county_code_lookup`) for verbatim section text + live URL; county GIS overlay (`county_gis_overlay`) for SMA/flood/historic/special-district detection. Every cited section retrieved, hashed, version-pinned.

**Hyper-local honesty protocol:** the worker declares which overlays it checked and which it could not (SMA / HOA / STR ordinance / special district). STR rules and HOA CC&Rs are frequently city-specific and not in ATTOM — surfaced as BLUE action flags with named consequence (EH-05), never silently omitted.

---

## §6 — Rules (RAAS)

Worker-specific rules; platform invariants inherited per §18 / CODEX S52.43. Worker rules may TIGHTEN, never LOOSEN (CODEX S52.41).

### Hard stops — `on_fail: refuse_analysis`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-01** Input validation | 🔴 RED | Address resolves to a real parcel; question is a zoning/use question; jurisdiction onboarded | Refuse with explanation + routing |
| **RULE-02** Consumer-guidance disclaimer | 🔴 RED | Output never gives binding legal advice; "general guidance — get a land use attorney for a binding determination" present | Block output without disclaimer |
| **RULE-03** Audit anchor non-negotiable | 🔴 RED | Every verdict writes to PLAT-008 with rulesetHash + cited sections + URL + hash + version pin | 503 with rollback |
| **RULE-04** Citation provenance | 🔴 RED | Every cited code section is a live retrieved URL + verbatim text + hash. No model-recalled citations (EH-01) | Block citation without live source |
| **RULE-05** Escalation trigger | 🟡 YELLOW | When stakes rise (discretionary path / rezone / contested / coastal hearing), surface "get a lawyer's opinion" → LAW-LANDUSE-001 | Block output without escalation affordance |
| **RULE-11** Coastal / SMA hard requirement | 🔴 RED | Detected SMA/coastal-overlay permit requirement surfaced as RED "required regardless" — no silent omission of a hard permit gate | Block output without surfacing the hard gate |

### Soft flags — `on_fail: caveat_and_proceed`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-06** STR / overlay gap declaration | 🔵 BLUE | STR + city-specific overlay rules declared as "changes frequently — verify with your city clerk" when not in ATTOM | Surface as BLUE action flag |
| **RULE-07** HOA / CC&R override flag | 🔵 BLUE | Detected HOA surfaced: "Zoning allows X — your HOA CC&Rs may not. Upload to verify." | Surface as BLUE action with upload affordance |
| **RULE-08** Plain-language reading level | 🟡 YELLOW | Tier-Q output ≤ 7th-grade reading level; no legalese unless directly quoting code | Lint fail → rewrite |
| **RULE-09** Overlay / special-district disclosure | ⚪ WHITE → 🟡 YELLOW | Special tax district / overlay surfaces annual cost + consequence as a prominent line item | Block output without disclosure when detected |
| **RULE-10** Version pin per citation | 🔵 BLUE → 🔴 RED | Every cited section carries version-in-effect-at-analysis-time | Block citation without version pin |

---

## §7 — Canvas Visual Specification (Trump Rule + CAS)

**Mockups:** `~/Downloads/Canvas Mock Ups 6-7-26/zoning-001_canvas-mockup.png` (Current zoning rendered + near-locked 2026-06-07, Lahaina coastal R-2). RE **consumer** visual floor = Zillow-listing-grade hero + Lego-instruction-grade procedure cards.

**CAS instrument panel:** 5-color pill bar always visible (Red/Yellow/Blue/White/Green + counts). Verdict color read before any word.

**Tab bar (4 tabs; default = Zoning verdict): Zoning verdict · Permitted uses · Overlays · Plain English** (ruled 2026-06-07 via revised mockup). The Entitlement-path stepper and Restrictions numeric-badge grid (detailed below) fold INTO the Zoning verdict tab beneath the verdict triad; a dedicated **Overlays** tab carries the hyper-local layer (SMA / flood / historic / HOA-CC&Rs / special-tax-district, EH-05). Detailed component specs follow:

1. **Current zoning (default)** — verdict triad scaled to the user's question (e.g. *Single-family rebuild — by-right* GREEN · *Duplex — allowed with conditions* YELLOW · *Triplex+ — rezone required* RED). Color-coded zoning map: subject parcel outlined (deep purple) + 1-mile radius colored by zone (R-1/R-2/C-1/PD) + overlay wash (SMA coastal = red). 4 KPI cards: zoning class · max height · lot coverage · parking min. Each verdict card links its live code section inline (EH-01).
2. **Allowed uses** — icon-card grid of use types (Single family / Duplex / ADU / Home office / Short-term rental / Multi-family), each CAS-badged (by-right GREEN · conditional/ministerial · STR YELLOW · multi-family RED-rezone).
3. **Entitlement path** — horizontal stepper per path: ministerial ("building permit only · ~60 days · $ fees" GREEN) · conditional ("planning review · neighbor notification · 60–90 days · $ fees" YELLOW) · rezone ("12–18 months · commission + council hearings · $ fees" RED). CAS-colored, plain-English, cost + timeline on every step.
4. **Restrictions** — numeric-badge grid of the restrictions that actually bite: SMA permit · height limit · coastal setback (from MHW) · front/side/rear setback · lot coverage · parking · FAR · min lot — each a CAS-colored badge with the **actual numeric value**.
5. **Plain English** — CAS-coded conversational prose at 7th-grade reading level. GREEN hero answer, CAS-coded sections ("the one thing you cannot skip", "build the same thing — green light", "want to go bigger"), common-questions Q&A, action bar (Get a lawyer's opinion → LAW-LANDUSE · File the permit → PERMIT-001 · Check feasibility → FEASIBILITY · Upload CC&Rs · Export PDF).

**Gap declaration:** always-visible BLUE flag naming every overlay the worker could not verify (STR ordinance, HOA CC&Rs, special district). Never buried.

**Default-tab altitude:** the default tab is verdict triad + map + KPIs only. Allowed-uses grid / entitlement stepper / restriction badges live on their own tabs — the default obeys the 3-second rule.

---

## §8 — Audit Anchor / Deposition Rule

Every verdict is anchored so a homeowner can show a contractor / spouse / county clerk three months later and prove what the code said at decision time.

```yaml
pull_receipt:
  workerId: "ZONING-001"
  searchId: "zn_..."
  parcel: { address, apn, jurisdiction }
  question: { rawText, structuredIntent, personaTier }
  citedSections: [
    { citation, versionPin, sourceUrl, verbatimText, retrievedAt, retrievedHash }  # EH-01/06, live URL only
  ]
  overlays: [ { type, source, verified, consequence } ]   # SMA / HOA / special district (EH-05)
  verdict: { band, plainAnswer, allowedUses, entitlementPath, restrictions, costTimeline }
  rulesetHash, promptHash, modelVersion, responseStopReason
  activePersonaId, accountId, walletTransactionId   # Active Persona Gate
```

CRITICAL: code-section retrieval is a hard external lookup (`citationResolver.js`), not generation. The model emits a query ("Maui County Code §19.04.040"); the resolver fetches verbatim text, hashes it, version-pins it. The model reasons over retrieved text, never recalled text. Miss → surfaced unconfirmed, never fabricated (Britney Rule).

---

## §9 — Composition with Other Workers (accepts-contract substrate)

```yaml
emits:
  - shape: "zoning-verdict-bundle/v1"
    description: Allowed/conditional/not-allowed verdict + cited sections + restrictions, audit-anchored
    auditAnchored: true
  - shape: "legal-question-bundle/v1"
    description: Escalation payload — LAW-LANDUSE-001 accepts (when stakes rise)
  - shape: "permit-intent-bundle/v1"
    description: Next-step procedure payload — PERMIT-001-CITIZEN accepts
accepts:
  - shape: "parcel-bundle/v1"
    description: Site Recon parcel + GIS + ATTOM (incl. ZONING_UNAVAILABLE flip handoff)
    minimumFields: [address, apn, geometry, jurisdiction]
```

**Today's known integrations (illustrative — substrate discovers, does not hardcode):**

| Worker | Direction | Bundle shape |
|---|---|---|
| SITE-RECON-001 | ← upstream | `parcel-bundle/v1` (incl. `ZONING_UNAVAILABLE` flip) |
| TITLE-ABSTRACT-001 | ← upstream | `title-abstract-bundle/v1` (HOA/CC&R + overlay context) |
| LAW-LANDUSE-001 | → escalation | `legal-question-bundle/v1` ("get a lawyer's opinion") |
| PERMIT-001-CITIZEN | → downstream | `permit-intent-bundle/v1` ("file the permit") |
| FEASIBILITY-001 | → downstream | "check feasibility" handoff |
| PLAT-008 Audit Trail | → infra | Every verdict anchored |
| Vault DTC | → infra | Parcel logbook entry per verdict |

---

## §10 — Cost Basis (NOT Pricing) — FREE-Worker Inheritance

> **FREE to use.** Users pay only for data pulls at substrate-locked cost + approved markup, deducted from the session-payer's prepaid balance (BILLING RULING). No subscription, no seat, no per-worker fee.

Pricing is a shared hive primitive; dollar amounts live in `config/pricing.js` + `SOURCE_REGISTRY` + Stripe catalog, rendered at view time via `pricingPreview(workerSlug)` — never invented in the spec (CODEX S52.41).

| Tier | Cost basis | What drives cost |
|---|---|---|
| **Tier-Q** | 1× call + ATTOM zoning + ≤3 code sections + overlay check | Cheapest: single question |
| **Tier-R** | 2–4× calls + ATTOM zoning/permits + full section set + multi-path detail | Moderate: builder-grade detail |

**SOURCE_REGISTRY entries (PR against `services/billing/dataFee.js` with actual cost + markup):** `attom:zoning`, `attom:permits`, `county_code_lookup`, `county_gis_overlay`.

**Cost gate (BILLING RULING + AP-02):** `quoteDataFee` → wallet check ("Billing to: [payer] — $X from your $Y balance") → confirm → `recordDataFee` (prepaid-only) → cache + pivot (same parcel + same question + same section versions = cached, no re-charge).

---

## §11 — Inherited Product Debt (Apply at Design Time)

- **A. Cache + pivot** — per-parcel + per-section cache; change the question without re-pulling base zoning.
- **B. Wallet balance gate** — balance check before cost-confirm; top-up flow if short.
- **C. Escalation coaching** — "This is a discretionary path — a $X lawyer opinion before you file could save months. Want to escalate?"

---

## §12 — Demo Scenarios

**Scenario 1 — Tier-Q: Coastal post-fire rebuild (Lahaina HI, R-2).** Homeowner wants to rebuild what burned. Verdict triad: SFH rebuild GREEN (by-right · ministerial · building permit only ~60 days) · Duplex YELLOW (conditional · planning review 60–90 days · $2–5K) · Triplex+ RED (legislative rezone · 12–18 months · $30–80K · hearings). **SMA coastal permit surfaced RED "required regardless"** (RULE-11). Restrictions badges: 30 ft height, 40 ft coastal setback from MHW, 45% lot coverage, 2/unit parking, FAR 0.55, 5,000 sqft min lot. STR flagged YELLOW. Plain English: *"Build the same thing — green light. The one thing you cannot skip — the coastal permit."* Escalation card to LAW-LANDUSE for the contested-bigger path.

**Scenario 2 — Tier-Q: ADU question (Mono County CA).** "Can I add an ADU?" → GREEN ministerial under state ADU law; HOA CC&Rs detected → BLUE "may restrict — upload to verify" (RULE-07); special tax district → WHITE annual-cost advisory (RULE-09).

**Scenario 3 — Tier-Q: STR question.** "Can I rent this short-term?" → verdict with BLUE gap declaration: *"STR rules are city-specific and change frequently — verify with your city clerk"* (RULE-06), with what ATTOM/GIS could confirm surfaced honestly.

---

## §13 — Build Sequence (9 Steps)

1. `zoningQuery.js` — handler + route + cost gate + wallet gate + handoff-token validation (incl. `ZONING_UNAVAILABLE` flip)
2. `analyzeZoning.js` — permitted-use + path classification (ministerial vs discretionary vs legislative) + Tier-2 consumer-language composition
3. PLAT-008 audit anchor + receipt schema with citation pinning (§8) + Active Persona Gate stamping
4. `citationResolver.js` — **external retrieval only, no model recall** (EH-01): ATTOM zoning/permits + county code lookup (verbatim + live URL) + county GIS overlay, hashed + version-pinned
5. `overlayDetect.js` — SMA/coastal + flood + historic + HOA + special-district detection; hard-gate surfacing (RULE-11); hyper-local gap declaration (EH-05)
6. Canvas — CAS instrument panel + 5 tabs (Current zoning default / Allowed uses / Entitlement path / Restrictions / Plain English) + zoning map + restriction numeric badges + CAS flag stack
7. Consumer-language gates (7th-grade reading level RULE-08) + escalation routing (LAW-LANDUSE / PERMIT-001 / FEASIBILITY) + disclaimer enforcement
8. Vault DTC bridge + handoff emit (`zoning-verdict-bundle/v1`, `legal-question-bundle/v1`, `permit-intent-bundle/v1`)
9. E2E scenario tests across the 3 demo scenarios + `workerSync` + marketplace review ping

---

## §14 — QA-001 Assertion Catalog

### Worker-specific assertions (TC-101 through TC-116)

| TC | Assertion | Pass condition | Priority |
|---|---|---|---|
| TC-101 | Handoff token (incl. ZONING_UNAVAILABLE flip) validates | Token accepted, parcel passes | P0 |
| TC-102 | Consumer-guidance disclaimer present | Disclaimer on every output (RULE-02) | P0 |
| TC-103 | Every cited section is a live URL + verbatim + hash | No model-recalled citations (RULE-04/EH-01) | P0 |
| TC-104 | Coastal/SMA hard gate surfaced RED when detected | "Required regardless" present (RULE-11) | P0 |
| TC-105 | Escalation affordance present when stakes rise | "Get a lawyer's opinion" link (RULE-05) | P0 |
| TC-106 | STR/overlay gap declared when not in ATTOM | BLUE "verify with city clerk" (RULE-06) | P1 |
| TC-107 | HOA override flag surfaced when HOA detected | BLUE upload affordance (RULE-07) | P1 |
| TC-108 | Tier-Q reading level ≤ 7th grade | Lint passes (RULE-08) | P1 |
| TC-109 | Audit anchor written + retrievable in PLAT-008 | Receipt retrievable | P0 |
| TC-110 | Default canvas tab = Current zoning | Opens first (Trump sub-A) | P1 |
| TC-111 | Default tab altitude = verdict + map + KPIs only | Grid/stepper/badges on own tabs | P1 |
| TC-112 | Verdict color readable before text (Trump/CAS) | CAS triad renders before prose | P1 |
| TC-113 | Subsequent invocation replaces canvas (sub-D) | Single canvas rendered | P0 |
| TC-114 | Wallet balance gate fires before confirm | Gate present, balance shown | P0 |
| TC-115 | Cache + pivot returns cached for repeat same-parcel question | No re-charge | P0 |
| TC-116 | Restriction badges show actual numeric values | Setback/height/parking values present | P1 |

### Platform-invariant enforcement (TC-121 through TC-138 — inherits CODEX S52.43)

Same set as LAW-LANDUSE-001 §14: EH-01..07, CAS-01..04, AP-01/02, Britney TC-070, Reagan. Verifies the worker inherits the canon correctly.

---

## §15 — Open Questions (from intent.md)

1. **Jurisdictional coverage** — ATTOM Zoning coverage uneven. v1 limits to full-coverage states + flags "limited coverage" elsewhere. Sublette WY + Mono CA + Maui HI must be in v1.
2. **STR / Airbnb question class** — city-specific overlays often not in ATTOM. v1 = gap declaration ("verify with city clerk"); v1.1 = onboarded STR baselines.
3. **HOA / CC&Rs** — private restrictions can override zoning. Surface as Verdict-Hero flag + upload affordance (RULE-07).
4. **Variance-likelihood estimate** — defer v1; requires a comparable-application dataset we don't have yet (LAW-LANDUSE-001 owns comparable-case grounding).

---

## §16 — What This Enables Strategically

ZONING-001 is the **consumer on-ramp** to the RE worker stack: the homeowner asks "what can I build", gets an honest plain-English answer with a real citation, and — when stakes rise — escalates into the paid lawyer-grade worker (LAW-LANDUSE-001) or the permit filer (PERMIT-001). It proves:
- **Trump Rule generalizes to the consumer floor** — the same CAS discipline that serves a developer serves a first-time homeowner.
- **The escalation ladder works** — free consumer simplifier → paid lawyer-grade opinion → permit filing, all on one parcel substrate, all audit-anchored.
- **EH-01 at the consumer layer** — a homeowner gets a *real, retrievable* code citation, not a confident hallucination. A confident wrong answer about what you can build is worse than no answer.

---

## §17 — Next Steps

1. Lock canvas (5 tabs; Plain English added per consumer mandate; default-tab altitude confirmed — ruled 2026-06-07)
2. Copy locked mockups into `creators/sean-combs/zoning-001/canvas-mockup*.png`
3. Run build sequence §13 (four-way loop: Sean + Web-Alex + T1 + Code)
4. E2E across §12 scenarios; `workerSync`; marketplace listing

---

## §18 — Platform RAAS Invariants (INHERITS CODEX S52.43)

This worker inherits all Platform RAAS Invariants by reference from **CODEX S52.43 — Platform RAAS Invariants**:

- **Epistemic Honesty Gate** (EH-01 through EH-07)
- **CAS Color Protocol** — RED / YELLOW / BLUE / WHITE / GREEN
- **Active Persona Gate** (AP-01 through AP-06)
- **Reagan Rule** — trust but verify; user-supplied data tagged unverified
- **Britney Rule** (TC-070) — never invent values source didn't provide
- **Trump Rule** (CODEX S52.37) — per-vertical visual floor

This spec MUST NOT redefine or modify any of these invariants. Worker-specific rules (RULE-01 through RULE-11 in §6) may TIGHTEN substrate policy at the worker level (per CODEX S52.41 substrate-precedence); they may not LOOSEN it. Worker-level enforcement of platform invariants is verified by TC-121 through TC-138 in §14.

---

**ZONING-001** | SOCIII Platform | **v1.0** | June 2026 | Confidential | General information only — not legal advice
