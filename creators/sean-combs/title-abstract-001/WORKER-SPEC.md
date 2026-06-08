# TITLE-ABSTRACT-001
## Title Abstract Report

**Digital Worker Specification** | SOCIII Platform | **v1.0**
**Date:** 2026-06-07
**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Spec inheritance:** SITE-RECON-001 · CODEX S52.19 (ATTOM Integration + Title Abstract Report) · **CODEX S52.43 (Platform RAAS Invariants)** · CODEX S52.41 (Substrate-Precedence) · CODEX S52.37 (Canvas-Worker Parity + Trump Rule) · BILLING RULING (prepaid-only)

> *"A strict superset of a title insurance company's report. Vesting, chain, encumbrances, and tax are table stakes. The Abstract layers rights-stratum, risk, comps, zoning, and permits on top — every field traceable to its source pull and anchored on the property's DTC. More useful than insured title for every decision that isn't 'will this loan close.'"*

**Authoring note:** elevates `intent.md` (Track B-1 scaffold) to full build-ready spec. Platform invariants are INHERITED from CODEX S52.43, never re-specified (see §18). Author writes scope-of-work; the platform writes the discipline.

---

## §1 — What This Worker Is

TITLE-ABSTRACT-001 produces the **Title Abstract Report** for any US parcel — the forensic chain-of-title + encumbrance + rights-stratum record that a buyer, broker, lender, investor, or attorney needs to understand *what is owned, what is owed, what is severed, and what is unverified* about a property.

It is a strict **superset** of a traditional title company's preliminary report:
- **Vesting + chain of title** — owner of record + every recorded transfer back to the earliest verifiable instrument
- **Encumbrances** — mortgages, deeds of trust, liens, easements, deed restrictions, HOA/CC&Rs
- **Tax + lien status** — delinquency, judgment, mechanic, federal/state tax liens
- **Rights stratum** — the full vertical column: air / spectrum / surface / water / carbon / mineral / oil-gas / digital-subsurface — *what is held, what is severed, what is unverified* (the platform differentiator; no consumer title product surfaces this)
- **Risk + opportunity + buildability context** — FEMA / climate / comps / zoning / permits layered on as decision context

Every field is sourced (`source · pulled <timestamp> · cost <data-fee>`), version-pinned, and anchored as a compound DTC entry on the property's logbook (PLAT-008). A forensic auditor three years later can reproduce who pulled what, when, and at what version — the **Deposition Rule** load-bearing claim applied to property records.

It is **more useful than insured title for every decision that is not "will this loan close"** — and it costs $4–8 in data pulls versus $500–2,500 for a title policy.

---

## §2 — What This Worker Is NOT

- **NOT an insured title product.** SOCIII is not a title insurance company. This worker does NOT certify lien clearance for transaction closure. Every output carries the **"general information — not certified for closing; your title officer / escrow certifies"** disclaimer. It surfaces what the record shows; it does not indemnify.
- **NOT a parcel-discovery worker.** Address/APN input only. SITE-RECON-001 is the upstream discovery + scoring worker; this worker accepts the `parcel-bundle/v1` it emits.
- **NOT a market analysis worker.** Comps appear as context, not as a feasibility study. FEASIBILITY-001 consumes the Abstract for demand/supply analysis.
- **NOT a buildability decision.** Zoning + permits appear as raw context. ZONING-001 (consumer) and LAW-LANDUSE-001 (lawyer-grade) consume this layer to produce a use/legal verdict.

---

## §3 — Persona Detection + Tiers

Inherited from platform substrate per CODEX S52.43. Detected at onboarding, never silently upgraded.

| Tier | User profile | UX behavior | Cost basis |
|---|---|---|---|
| **Tier-Q — Homeowner / Buyer** | Single property; due diligence; "is this clean, what do I need to fix" | Plain English first, marketable-status hero, jargon < 15% | Lightest — fewest pulls |
| **Tier-R — Broker / Investor / Lender** | Transaction or underwriting; needs full chain + encumbrances + rights stratum | Full canvas, all 5 tabs, exportable summary | Moderate |
| **Tier-S — Institutional / Portfolio / Assemblage** | Fund, REIT, multi-parcel; needs cross-parcel rights + exportable forensic brief | Full Abstract + advanced rights-stratum analytics + PDF brief | Heaviest |

---

## §4 — Inputs

**From Site Recon handoff (primary path):** one-click "Hand off → Title Abstract" passes `parcel-bundle/v1` — address, APN, ATTOM data, GIS geometry, owner record, sales history, AVM, assessor.

**Standalone:** accepts address + APN directly; auto-resolves to a parcel before proceeding (Reagan Rule — verifies the APN resolves to a real parcel; resolution failure surfaces gracefully).

**User-supplied (per Reagan Rule — accepted, tagged `source: user_supplied, verified: false` until cross-referenced):**
- Prior title policy / preliminary report (PDF) — OCR'd, reasoned over, flagged unverified
- ALTA survey / plat
- HOA CC&Rs — existence confirmed from record; content unverified until uploaded
- Drone aerial / property video — rendered via `video-tile/v1` with the unverified badge

---

## §5 — Data Sources / RAAS Composition

**Tier hierarchy:**
- **Tier 0/1/2** — platform invariants (inherits CODEX S52.43 — EH / CAS / AP / Reagan / Britney / Trump), audit anchor, persona/cost gate, Deposition Rule, title-vertical baselines (instrument-provenance discipline, severance disclosure, marketability-is-informational)
- **Tier 3** — title sub-vertical: chain-of-title assembly, deed-type semantics, encumbrance taxonomy, rights-stratum law, lien priority
- **Tier 4** — jurisdictional recording systems (county recorder/clerk schemas; e.g. Sublette County WY, Mono County CA, Maui County HI), state property-law baselines (e.g. WY prior-appropriation water law, CA/HI mineral & coastal severance norms)
- **Tier 5 (LOAD-BEARING)** — parcel-specific: recorded instruments, HOA/CC&Rs, special tax districts (Mello-Roos / CFD), PUD covenants, federal patents (BLM mineral severance)

**External authority feeds (retrieval only, never model recall — EH-01/EH-07):**
- ATTOM — `attom:property`, `attom:area`, `attom:lending`, `attom:zoning`, `attom:permits`, `attom:sales`, `attom:community`, `attom:poi`
- County recorder / clerk — recorded instrument retrieval (deeds, deeds of trust, liens, easements, patents)
- FEMA / GIS — flood + overlay (pinned via Site Recon)
- State engineer / water-rights registry (prior-appropriation states), carbon registry (emerging strata)

**Rights-stratum honesty protocol:** the worker always declares which strata it verified and which it could not (air / spectrum / surface / water / carbon / mineral / oil-gas / digital). Unverified strata surface as BLUE action flags with named consequence (EH-05).

---

## §6 — Rules (RAAS)

Worker-specific rules; platform invariants inherited per §18 / CODEX S52.43. Worker rules may TIGHTEN substrate policy, never LOOSEN it (CODEX S52.41).

### Hard stops — `on_fail: refuse_analysis`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-01** Input validation | 🔴 RED | Address/APN resolves to a real parcel; jurisdiction recording system onboarded | Refuse with explanation + routing |
| **RULE-02** No insured-title representation | 🔴 RED | Output never asserts certified lien clearance / closing-grade guarantee; "not certified for closure" disclaimer present | Block output without disclaimer |
| **RULE-03** Audit anchor non-negotiable | 🔴 RED | Every Abstract writes to PLAT-008 with rulesetHash + per-pull provenance + version pin | 503 with rollback |
| **RULE-04** Instrument provenance | 🔴 RED | Every recorded instrument cited: recording no., book/page, date, source, retrievedAt, hash. No fabricated instruments (anti-EH-07) | Block the instrument without provenance |
| **RULE-05** Severance disclosure | 🔴 RED | Any detected mineral / water / air / oil-gas severance surfaced prominently as a verdict-level item | Block output without severance surfaced |

### Soft flags — `on_fail: caveat_and_proceed`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-06** Chain-completeness gap declaration | 🟡 YELLOW | Output declares earliest verified transfer + any gaps/breaks in the chain | Caveat: "chain verified back to <year>; <gap> unverified" |
| **RULE-07** Rights-stratum gap declaration | 🟡 YELLOW | Output names every stratum checked + every stratum unverified (EH-05) | Surface unverified strata as BLUE action flags |
| **RULE-08** Lien-data freshness | 🟡 YELLOW | Tax/lien/judgment search current within freshness window | Caveat: "tax search current through <date>" |
| **RULE-09** Marketability is informational | 🟡 YELLOW | "Marketable: Yes/No" is presented as record-derived status, not a legal opinion or insurability guarantee | Caveat present alongside marketable-status hero |

### Worker-specific rules

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-10** HOA / CC&R existence flag | 🔵 BLUE | Detected HOA surfaced with "CC&Rs not indexed — upload to complete" action when content unavailable | Surface as BLUE action with upload affordance |
| **RULE-11** Special-tax disclosure | ⚪ WHITE → 🟡 YELLOW | Any special tax district (Mello-Roos / CFD) surfaces annual cost + lifetime exposure prominently | Block output without disclosure when detected |
| **RULE-12** Version pin per instrument | 🔵 BLUE → 🔴 RED | Every cited instrument + tax/lien search carries version-in-effect-at-analysis-time | Block citation without version pin |

---

## §7 — Canvas Visual Specification (Trump Rule + CAS)

**Mockups:** `~/Downloads/Canvas Mock Ups 6-7-26/title-abstract-001_canvas-mockup*.png` (Ownership chain, Encumbrances, Recorded docs, Rights stack rendered + locked 2026-06-07). RE visual floor = recorded-document-archive grade + MLS-listing-grade hero.

**CAS instrument panel:** 5-color pill bar always visible at top (`Red / Yellow / Blue / White / Green` with count badges). The user reads title state before any text.

**Tab bar (5 tabs; default = Ownership chain): Ownership chain · Encumbrances · Recorded docs · Rights stack · Plain English.** Plat map folded into Ownership chain's parcel map. (Confirmed against mockup inventory 2026-06-07; the revised Plain-English render labeled tab 3 "Tax & liens" — recorded-docs is canonical per the file set; tax/lien status surfaces inside it.)

1. **Ownership chain (default)** — parcel map (subject parcel + easements drawn) + optional user-upload drone aerial (`video-tile/v1`, unverified badge). Verdict triad: *Title chain (clean/issues)* · *Open encumbrances (count)* · *Rights severance (mineral/water/etc.)*. Vertical chain-of-title, **newest first**, each transfer a CAS-coded card (grantor → grantee, deed type, date, consideration, recording no., status pill). Right rail heroes: **Marketable status (Yes/No)** · **Open encumbrances** · **Last sale price** · **Lien total**. Bottom CAS flag stack (RED→YELLOW→BLUE→WHITE→GREEN) with inline action links ("Pull probate order", "Check WY SEO", "Pull recorded doc").
2. **Encumbrances** — verdict triad: *Lien stack (clear/total)* · *Open easements (count)* · *Deed restrictions (detected/none)*. CAS-coded encumbrance detail cards (each: type, recording, amount, status, action link). **Lien-stack-as-bars** visualization — horizontal bars per lien class (mortgage/mechanic/tax/HOA/judgment/IRS); zero-height green bars = "nothing here" at a glance.
3. **Recorded docs** — instrument archive table: type, grantor→grantee, recording no., date, consideration, CAS-coded status (Verified / Verify probate / Review impact / Minerals severed), "Pull doc" link per row. Filterable (All / Deeds / Easements / Liens / Other), searchable. Dark stats header: total instruments / deeds / easements / liens.
4. **Rights stack** — *the differentiator.* Vertical column from above-the-land to below-it: **Air · Radio/spectrum · Surface (fee) · Water · Carbon/sequestration · Mineral · Oil & gas · Digital/subsurface-fiber.** **Stratum BANDS are earth-tone by elevation** (above-ground = light blue · surface = light green · below-ground = tan) — the band tells you *where* a right sits. **CAS color appears ONLY on the per-stratum status badge** (🟢 Held/Verified = go · 🔴 Severed = dead · 🟡 Review required · 🔵 Action needed · ⚪ status). Synthesis ruled 2026-06-07 via the revised "earth-tone FIXED" mockup: keeps the elevation cue AND honors "red = dead, green = go" on the badge — e.g. mineral rights render as a tan below-ground band with a RED "SEVERED 1978" badge. Right rail: jurisdiction land-law context panel (WY prior-appropriation, federal-patent mineral severance), action-items list, rights-stack summary.
5. **Plain English** — CAS-coded conversational prose. GREEN hero answer (*"You own it clean, but the mineral rights aren't yours"*), CAS-coded sections, common-questions Q&A, action bar (Send to analyst · Export PDF · Order title insurance · Upload CC&Rs to complete).

**Gap declaration:** always-visible BLUE CAS flag naming every layer the worker could not verify (chain gaps, unverified strata, un-indexed CC&Rs). Never buried.

---

## §8 — Audit Anchor / Deposition Rule

Every Abstract is anchored. A forensic auditor three years later opens the receipt and sees every pull, every instrument hash, every version pin, and the initiating persona.

```yaml
pull_receipt:
  workerId: "TITLE-ABSTRACT-001"
  searchId: "ta_..."
  parcel: { address, apn, jurisdiction }
  dataPulls: [
    { source: "attom:property", retrievedAt, retrievedHash, dataFee },
    { source: "county-recorder:Sublette-WY", instrument: "2019-08142", retrievedAt, retrievedHash },
    # ... every ATTOM + recorder + tax pull, hashed + version-pinned (EH-06)
  ]
  chainOfTitle: [ { grantor, grantee, deedType, date, recordingNo, retrievedHash } ]  # No fabrication (EH-04/07)
  encumbrances: [ { type, recordingNo, amount, status, retrievedHash } ]
  rightsStratum: [ { stratum, status, verified, severedAt?, source } ]
  verdict: { marketable, openEncumbrances, lastSalePrice, lienTotal, severances }
  rulesetHash, promptHash, modelVersion, responseStopReason
  activePersonaId, accountId, walletTransactionId   # Active Persona Gate AP-01/03
```

CRITICAL: instrument retrieval is a hard external lookup, not generation. The model emits a query ("I need recording 2019-08142, Sublette County"); `instrumentResolver.js` fetches the record, hashes it, version-pins it. The model reasons over retrieved text, never recalled text. Resolver miss → surfaced unconfirmed, never fabricated (Britney Rule).

---

## §9 — Composition with Other Workers (accepts-contract substrate)

Participates in the platform accepts-contract interop substrate (CODEX S52.42). The catalog discovers consumers dynamically; this spec does not hardcode the roster.

```yaml
emits:
  - shape: "title-abstract-bundle/v1"
    description: Vesting + chain + encumbrances + tax + rights-stratum, audit-anchored
    auditAnchored: true
    exportable: true   # Tier-R/S PDF
accepts:
  - shape: "parcel-bundle/v1"
    description: Site Recon parcel + GIS + ATTOM + ownership candidate
    minimumFields: [address, apn, geometry, jurisdiction]
  - shape: "video-tile/v1"
    description: Drone aerial / property video (user-supplied, unverified badge)
    optional: true
```

**Today's known integrations (illustrative — substrate discovers, does not hardcode):**

| Worker | Direction | Bundle shape |
|---|---|---|
| SITE-RECON-001 | ← upstream | `parcel-bundle/v1` via handoff token |
| LAW-LANDUSE-001 | → downstream | `title-abstract-bundle/v1` (encumbrance/rights layer feeds legal opinion) |
| ZONING-001 | → downstream | `title-abstract-bundle/v1` (HOA/CC&R + overlay context) |
| FEASIBILITY-001 | → downstream | `title-abstract-bundle/v1` (clean-title input to market study) |
| W-002 Real Estate Analyst | → downstream | `title-abstract-bundle/v1` (underwriting input) |
| PLAT-008 Audit Trail | → infra | Every Abstract anchored |
| Vault DTC | → infra | Compound logbook entry per Abstract |

---

## §10 — Cost Basis (NOT Pricing) — FREE-Worker Inheritance

> **FREE to use.** Users pay only for the data the worker fetches at substrate-locked cost + approved markup, deducted from the session-payer's prepaid balance per the BILLING RULING (BILLING-ARCHITECTURE.md v2). No subscription, no seat, no per-worker fee.

Pricing is a shared hive primitive. This spec declares cost basis + tier shape only; dollar amounts live in `config/pricing.js` + `SOURCE_REGISTRY` + Stripe catalog, rendered at view time via `pricingPreview(workerSlug)`. Specs that invent dollar amounts create TC-069-class failures (CODEX S52.41).

| Tier | Cost basis | What drives cost |
|---|---|---|
| **Tier-Q** | 1× call + ATTOM property/sales + recorder chain pull + tax search | Cheapest: single parcel, snapshot |
| **Tier-R** | 3–5× calls + full ATTOM set + recorder + rights-stratum pulls + HOA OCR | Moderate: multi-source |
| **Tier-S** | 8–15× calls + Tier-R + cross-parcel rights analytics + exportable brief | Heaviest: assemblage, analytics |

**SOURCE_REGISTRY entries to land before launch** (PR against `services/billing/dataFee.js` with actual API cost + markup): `attom:property`, `attom:sales`, `attom:lending`, `attom:zoning`, `attom:permits`, `recorder:<county>`, `clerk:<county>`.

**Cost gate (BILLING RULING + Active Persona Gate AP-02):** `quoteDataFee` → wallet balance check ("Billing to: [payer] — $X from your $Y balance") → user confirms → `recordDataFee` atomically deducts (prepaid-only, refuse not float) → cache + pivot (same parcel + same instruments versions = cached, no re-charge).

---

## §11 — Inherited Product Debt (Apply at Design Time)

- **A. Cache + pivot** — per-parcel + per-instrument cache. Canvas is a pivot interface: change tier / refresh a section without re-pulling the whole Abstract.
- **B. Wallet balance gate** — check balance before cost-confirm; top-up flow if short (intercept layer, before Alex composes the prompt).
- **C. Snapshot-first** — v1 ships a one-shot snapshot to control data-fee cost; per-section "refresh" is v1.1 (intent.md §Open-Q1).
- **D. Search coaching** — "A Tier-Q snapshot answers 'is it clean' for less; go Tier-R when you're underwriting."

---

## §12 — Demo Scenarios

**Scenario 1 — Tier-Q: Homeowner clean-title check (Pinedale WY, 9708 US-191).** Long clean chain back to a 1978 federal patent; 5 verified transfers; 2 open easements (utility 1987, road access 2003); **mineral rights severed at the 1978 patent (surface only)**; lien total $0; marketable: Yes. Rights stack shows surface GREEN/held, mineral + oil-gas RED/severed, water YELLOW (WY prior-appropriation priority date unconfirmed), carbon/spectrum/digital BLUE/action-needed. Plain English: *"You own it clean — but you don't own what's under it."*

**Scenario 2 — Tier-R: Investor encumbered parcel.** Active deed of trust (First National Bank, $720K) → YELLOW "payoff before close"; HOA detected, CC&Rs not indexed → BLUE upload action; tax current, no judgments → GREEN. Demonstrates the encumbrance triad + lien-stack-as-bars.

**Scenario 3 — Tier-S: Assemblage abstract (v1.1).** 5–50 contiguous parcels, cross-parcel rights-stratum roll-up, exportable forensic brief. Out of scope for v1; tracked.

---

## §13 — Build Sequence (9 Steps)

1. `titleAbstractQuery.js` — handler + route + cost gate + wallet gate + handoff-token validation
2. `assembleChain.js` — chain-of-title assembly from recorder pulls + deed-type semantics + gap detection
3. PLAT-008 audit anchor + compound-DTC receipt schema with per-instrument pinning (§8) + Active Persona Gate stamping
4. `instrumentResolver.js` — **external retrieval only, no model recall** (EH-01/07): county recorder/clerk + ATTOM, verified, hashed, version-pinned; HOA CC&R OCR pipeline
5. `rightsStratum.js` — air/spectrum/surface/water/carbon/mineral/oil-gas/digital resolution; severance detection from federal patents + jurisdiction land-law baselines; CAS status per stratum
6. Canvas — CAS instrument panel + 5 tabs (Ownership chain default / Encumbrances / Recorded docs / Rights stack / Plain English) + lien-stack-as-bars + CAS-colored stratum column + flag stack + `video-tile/v1` slot
7. Persona-tier routing + marketability/severance disclosure gates + "not certified for closure" disclaimer enforcement
8. Vault DTC bridge + handoff emit (`title-abstract-bundle/v1` → LAW-LANDUSE / ZONING / FEASIBILITY / W-002)
9. E2E scenario tests across the 3 demo scenarios + `workerSync` + marketplace review ping

---

## §14 — QA-001 Assertion Catalog

### Worker-specific assertions (TC-101 through TC-118)

| TC | Assertion | Pass condition | Priority |
|---|---|---|---|
| TC-101 | Handoff token from SITE-RECON-001 validates | Token accepted, parcel passes | P0 |
| TC-102 | "Not certified for closure" disclaimer present | Disclaimer on every output (RULE-02) | P0 |
| TC-103 | Every recorded instrument has provenance | recording no. + book/page + date + hash per instrument (RULE-04) | P0 |
| TC-104 | Severance surfaced prominently when detected | Mineral/water/air severance at verdict level (RULE-05) | P0 |
| TC-105 | Chain-completeness gap declared | Earliest verified transfer + gaps named (RULE-06) | P0 |
| TC-106 | Rights-stratum gap declared | Every stratum checked + unverified named (RULE-07) | P0 |
| TC-107 | Audit anchor written + retrievable in PLAT-008 | Receipt retrievable | P0 |
| TC-108 | Default canvas tab = Ownership chain | Ownership chain opens first (Trump sub-A) | P1 |
| TC-109 | Plain-English headers (sub-B) | "Marketable status", not "MS" | P1 |
| TC-110 | Marketable-status hero adjacent to parcel ID (sub-C) | Layout verified | P1 |
| TC-111 | Subsequent invocation replaces canvas (sub-D) | Single canvas rendered | P0 |
| TC-112 | Wallet balance gate fires before confirm | Gate present, balance shown | P0 |
| TC-113 | Cache + pivot returns cached for repeat same-parcel | No re-charge | P0 |
| TC-114 | Lien-stack-as-bars renders zero classes as clear | $0 classes render green/zero | P1 |
| TC-115 | Rights-stack strata CAS-colored by status | Green=held, Red=severed, etc. (not by elevation) | P1 |
| TC-116 | Special-tax disclosure surfaces when detected | Mello-Roos/CFD annual + lifetime shown (RULE-11) | P1 |
| TC-117 | Video tile renders with unverified badge per Reagan | User uploads show badge | P0 |
| TC-118 | Sample addresses pass verifyMethod check | `verifyMethod: live_county_records` or `synthetic_for_demo_only` | P0 |

### Platform-invariant enforcement (TC-121 through TC-138 — inherits CODEX S52.43)

Same set as LAW-LANDUSE-001 §14: verifies the worker inherits the S52.43 canon correctly — EH-01..07 (instrument/comparable retrieval, gap declaration, version pin), CAS-01..04 (5 colors, flag-stack order, status-color match, BLUE action links), AP-01/02 (persona stamp + named cost prompt), Britney TC-070 (no invented values), Reagan (user inputs tagged `verified: false`).

---

## §15 — Open Questions (from intent.md)

1. **Refresh cadence** — snapshot vs per-section refresh. MVP ships snapshot-first; refresh is v1.1.
2. **PDF export** — Abstract emits downloadable PDF + live canvas, or canvas only? PDF is patent-claim-relevant — Sean to rule.
3. **Assemblage (multi-parcel) abstract** — 5–50 contiguous parcels in one Abstract. v1.1.
4. **Bulk-pull discount** — ATTOM bulk-address discount surfaced to user OR amortized silently? Sean to rule.

---

## §16 — What This Enables Strategically

TITLE-ABSTRACT-001 is the **audit substrate's customer-facing trust layer** for property. Three proofs:
- **Rights-stratum is the wedge.** No consumer title product surfaces air/water/carbon/mineral/oil-gas/digital as one CAS-coded column. It makes the invisible visible and is uniquely SOCIII.
- **Deposition Rule, applied to property.** Every instrument hashed + version-pinned + anchored — a record that survives a subpoena three years later.
- **Cost compression.** $4–8 in data pulls vs $500–2,500 for a title policy, while explicitly NOT replacing insured title for closing. We don't compete with the title company on indemnity — we beat it on coverage and on cost for every decision that isn't the loan close.

It is the **substrate worker** the other RE workers compose on: LAW-LANDUSE / ZONING / FEASIBILITY / W-002 all consume `title-abstract-bundle/v1`.

---

## §17 — Next Steps

1. Lock canvas (5 tabs; Plain English added; Plat map folded into Ownership chain; rights-stack strata CAS-colored by status — all ruled 2026-06-07)
2. Copy locked mockups into `creators/sean-combs/title-abstract-001/canvas-mockup*.png`
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

This spec MUST NOT redefine or modify any of these invariants. Worker-specific rules (RULE-01 through RULE-12 in §6) may TIGHTEN substrate policy at the worker level (per CODEX S52.41 substrate-precedence); they may not LOOSEN it. Worker-level enforcement of platform invariants is verified by TC-121 through TC-138 in §14.

---

**TITLE-ABSTRACT-001** | SOCIII Platform | **v1.0** | June 2026 | Confidential | General information — not certified for closing
