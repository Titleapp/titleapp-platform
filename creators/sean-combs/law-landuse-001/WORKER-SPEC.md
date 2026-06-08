# LAW-LANDUSE-001
## Land Use AI Attorney

**Digital Worker Specification** | SOCIII Platform | **v3.0**
**Date:** June 2026
**Spec inheritance:** SITE-RECON-001 · PARA-001 · **CODEX S52.43 (Platform RAAS Invariants)** · CODEX S52.41 (Substrate-Precedence) · CODEX S52.37 (Canvas-Worker Parity + Trump Rule) · BILLING RULING (prepaid-only)

> *"The legal feasibility layer on top of Site Recon's data substrate. Faster, deeper, and cheaper than anyone can imagine — with a disclaimer, not a law license."*

**v3 changes from v2:**
- §9 — adds `emits` / `accepts` bundle-shape declaration per accepts-contract substrate (was bilateral table)
- §10 — adds FREE-worker product principle inheritance + BILLING RULING reference
- §13 — Step 9 scenario count reconciled to match §12 (5 scenarios, not 6)
- §14 — TC-134/135/136/137 annotated as worker-level enforcement of platform invariants from CODEX S52.43
- §18 — **COLLAPSED to 3-line inheritance pointer.** Full content extracted to **CODEX S52.43 — Platform RAAS Invariants** (canonical source for EH / CAS / AP / Reagan / Britney / Trump). Every future worker inherits by reference.
- Sections §1–§7, §11–§12, §15–§17: preserved from v2 (light wording polish only)

---

## §1 — What This Worker Is

Land Use AI Attorney is the legal feasibility layer on top of Site Recon's data substrate. Site Recon tells you *"here's the parcel, here's what ATTOM says, here are the GIS overlays."* Land Use AI Attorney tells you *"given that parcel, given what you want to do with it, here's what the law says, here's what it will take, and here's what your real-world path looks like — in plain English, with citations a real attorney can audit."*

The worker covers the full range of real-property legal questions, from trivial to massive:

| Scope tier | Example questions | Typical user | Cost basis |
|---|---|---|---|
| **Tier-Q (Trivial)** | ADU feasibility, HOA pickleball ban, short-term rental allowed? | First-time homeowner, single-property owner | Lightest |
| **Tier-R (Medium)** | Variance probability, CUP for daycare, rezone R-1→R-2, lot split | Active developer, small builder, property attorney | Moderate |
| **Tier-S (Major)** | Brownfield mixed-use entitlement, post-disaster coastal rebuild, Specific Plan amendment | Veteran developer, REIT, municipal counsel | Heaviest |

Across all three tiers, the worker: (1) diagnoses applicable law; (2) translates to plain English with citations; (3) identifies specific blockers; (4) sketches the realistic path with cost and timeline; (5) flags when to escalate; (6) anchors to PLAT-008 with citation snapshot + version pin + rulesetHash.

---

## §2 — What This Worker Is NOT

- **Not a licensed attorney representing you.** Every output carries a UPL disclaimer.
- **Not a document drafting tool.** Drafting handoff to PARA-001.
- **Not a permitting workflow.** Application submission handoff to PERMIT-001-CITIZEN.
- **Not litigation counsel.** Escalates to LIT-001.
- **Not contract law.** Easements and lease drafting handoff to BIZ-LAW-001.
- **Not jurisdiction-agnostic.** Jurisdictions not yet onboarded return Tier-3-only analysis with explicit flag.

---

## §3 — Persona Detection + Tiers

Mirrors SITE-RECON-001 §10 pattern. Detected at onboarding, never silently upgraded. Tier upgrades require explicit user confirmation. Persona detection is inherited from platform substrate (per §15.7) — this worker does not re-detect, re-ask, or override.

| Tier | User profile | UX behavior | Cost basis |
|---|---|---|---|
| **Tier-Q — First-Timer** | 0 prior land-use questions; single property | Plain English, no jargon, examples-heavy, aggressive escalation triggers | Lightest compute |
| **Tier-R — Active Developer** | 1–10 prior projects OR small-builder OR attorney research | Plain English + code citations + comparable cases. Full canvas. | Moderate compute |
| **Tier-S — Veteran / Institutional** | 10+ projects OR institutional OR licensed attorney | Full citation list, risk-weighted timeline, exportable brief, advanced analytics | Heaviest compute |

---

## §4 — Inputs

### From Site Recon handoff (primary path)
One-click *"Hand off → Land Use Attorney"* from SITE-RECON-001 passes: `handoffToken`, `parcel` (address, APN, ATTOM data, GIS geometry, owner record, sales history, AVM, assessor), `jurisdiction` (state, county, city, federal overlays), and `siteReconVerdict` (band, confidence, blockers).

### From user (the question)
- Free-text question (default)
- Structured intent (Tier-R/S): encroachment / ADU / variance / CUP / rezone / subdivide / specific-plan / brownfield / coastal / historic
- Proposed change: current use, proposed use, project scope

### Tier-5 hyper-local uploads (when worker cannot auto-detect)
- HOA CC&Rs (PDF) — worker OCRs and analyzes
- Mello-Roos / CFD disclosures
- Specific Plan / overlay documents
- PUD covenants

Per the Reagan Rule (CODEX S52.43): user-supplied documents are accepted graciously, tagged `source: user_supplied, verified: false`, and treated as unverified until cross-referenced against an authoritative source.

### Standalone (no Site Recon prior)
Worker accepts address + question directly. Auto-fires Site Recon search first with explicit user confirmation and cost gate. Cost is additive.

---

## §5 — Data Sources / RAAS Composition

### Tier hierarchy
- **Tier 0:** Global AI style guide (platform inherited)
- **Tier 1:** Platform invariants — PLAT-008 audit anchor, persona detection, cost gate, Deposition Rule, Active Persona Gate (platform primitive — see §18)
- **Tier 2:** Legal vertical baselines — UPL discipline, citation discipline, Deposition Rule lens, persona-appropriate escalation
- **Tier 3:** Land use sub-vertical — zoning law, entitlement processes, CEQA/NEPA, federal overlays, state preemption, procedural law
- **Tier 4:** Jurisdictional baselines — CA (Coastal Act, CEQA, SB 9/10), WY, HI (CZMA, Maui County, wildfire overlay), TX, NY, FL (initial onboarded set; §15.1 = global, open onboarding)
- **Tier 5 (LOAD-BEARING):** HOA CC&Rs, Mello-Roos/CFD, assessment districts, Specific Plans, Community Plans, overlay zones, ARBs, PUD covenants, BIDs

### Tier-5 honesty protocol
Worker always declares what hyper-local layers it checked and which it could not check. Confidence band degrades when hyper-local data is missing. This is surfaced as a **BLUE CAS flag** (action item), never a silent omission. (EH-05; CODEX S52.43.)

### External authority feeds
- **Municode** — primary code-section retrieval
- **General Code** — secondary code feed
- **State legislature feeds** — current statutes + amendments
- **CourtListener / Justia** — case law retrieval
- **CEQAnet (CA)** — CEQA filing history
- **GIS endpoints** — FEMA, CCC, NRHP, HUD QOZ (pinned via Site Recon)

---

## §6 — Rules (RAAS)

### Hard stops — `on_fail: refuse_analysis`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-01** Input validation | 🔴 RED | Address/APN valid; question is land-use; jurisdiction onboarded | Refuse with explanation and routing |
| **RULE-02** Federal preemption gate | 🔴 RED | Proposed use does not violate FHA, ADA, Civil Rights Act, ESA | Refuse + cite controlling statute |
| **RULE-03** Audit anchor non-negotiable | 🔴 RED | Every analysis writes to PLAT-008 with rulesetHash + citation snapshot + version pin | 503 with rollback |
| **RULE-04** UPL gate | 🔴 RED | Worker never says "you should sue" or gives specific legal advice | Refuse + route to LIT-001 or licensed counsel |
| **RULE-05** Jurisdiction coverage gate | 🟡 YELLOW | Tier-4 jurisdictional baseline authored for target jurisdiction | Flag as Tier-3-only; escalate (EH-04) |
| **RULE-06** Fair Housing pattern detection | 🔴 RED | Proposed restriction has no FH disparate impact concern | Refuse + cite FHA + state FEHA |
| **RULE-07** High-stakes confidence floor | 🔴 RED | Tier-S analysis with confidence ≥ 60% | Refuse + escalate to licensed counsel |

### Soft flags — `on_fail: caveat_and_proceed`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-08** Recent law caveat | 🟡 YELLOW | Law cited amended within last 12 months | Caveat: "law in this area is changing fast" |
| **RULE-09** Local political risk | 🟡 YELLOW | Jurisdiction has known restrictive politics | Caveat: "technical answer is X; political reality may be Y" |
| **RULE-10** Missing data from Site Recon | 🟡 YELLOW | Site Recon returned YELLOW/RED on stale assessor data | Caveat: "base data is stale; analysis caveats accordingly" |

### Worker-specific rules

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-11** Citation freshness | 🔵 BLUE | Every citation includes version-in-effect-at-analysis-time | Block citation without version pin |
| **RULE-12** Comparable case grounding | 🔴 RED | Each cited approval: hearing date, jurisdiction, applicant, decision, vote count, link. No fabricated comparables. | Block comparables section |
| **RULE-13** Sample address verification | 🔴 RED | Any sample address has `verifyMethod: live_county_records` or `synthetic_for_demo_only` | Block output |
| **RULE-14** Persona-appropriate language | 🟡 YELLOW | Tier-Q: jargon density <15%. Tier-S: no over-simplification. | Lint fail → rewrite |
| **RULE-15** Escalation rate floor | 🔵 BLUE | Escalation rate ≥ 20% for Tier-Q in complex-law jurisdictions | Audit + retune |
| **RULE-16** Tier-5 hyper-local missing-data discipline | 🟡 YELLOW | Output explicitly declares what was checked and what could not be verified | Block output without gap declaration |
| **RULE-17** Mello-Roos / special tax disclosure | 🟡 YELLOW | Any detected special tax overlay surfaces annual cost + lifetime exposure as prominent line item | Block output without disclosure |

---

## §7 — Canvas Visual Specification (Trump Rule + CAS)

> **Trump Rule** (SOCIII platform definition): People are dumb and like pictures. The answer must be visible before a word is read. Color does the talking. Words are captions, not content.

The CAS Color Protocol (RED / YELLOW / BLUE / WHITE / GREEN) is a platform-level invariant ratified in CODEX S52.43 — applied to all canvas elements, status indicators, roadmap steps, and flag stacks across every SOCIII worker.

> **Blue is the missing color in every legal and real estate product ever built.** Yellow = stop and look at this. Blue = flag this and keep moving. That distinction is what prevents missed items at scale.

### Canvas Visual — Round 6 Visual Narrative (build contract for Code)

The mockup image is the visual contract. Code builds this. Every element is specified. **Canvas mockup location:** `creators/sean-combs/law-landuse-001/canvas-mockup.png` (Sean to upload before build kickoff). The mockup is illustrative — the worker is not about any specific property. Use cases drive demos, not addresses.

### Canvas element specifications

- **CAS instrument panel:** 5-color bar always visible at top. Pilot reads aircraft state at a glance before any text.
- **Verdict hero:** 3 cards — Green / Yellow / Red verdict per scenario. Visible before map loads.
- **Map:** Live Google Maps satellite view. Risk overlays drawn via Maps API polygon layer (SMA = blue, Coastal = red, Wildfire = amber). Comparable case pins (green = approved, red = denied) on real nearby addresses.
- **Big numbers:** 4 KPI cards — approval probability, median timeline, median cost, comparable case count. 22px numbers. Color-coded.
- **Roadmap:** Icon circles, each colored per CAS state (green/yellow/blue/white/red). Click any step → CAS-colored drill-down. No tables, no lists.
- **CAS flag stack:** Ordered RED → YELLOW → BLUE → WHITE → GREEN. Each flag has inline action link. This is the message stack, not a footnote.
- **Default tab:** Entitlement Roadmap (most visual). Citations and Plain English are secondary tabs.
- **Gap declaration:** Always visible, always a BLUE CAS flag. Never buried in fine print. (Per EH-03; CODEX S52.43.)

---

## §8 — Audit Anchor / Deposition Rule

Every analysis is anchored. The Deposition Rule applies fully: a forensic auditor three years later opens the receipt, sees the citation set, sees the version-pinned authorities, sees the reasoning chain, sees the inputs.

### Pull-receipt schema

```yaml
pull_receipt:
  workerId: "LAW-LANDUSE-001"
  searchId: "law_..."
  question: { rawText, structuredIntent, personaTier }
  appliedAuthorities: [
    { citation, versionPin, sourceUrl, retrievedAt, retrievedHash }
  ]
  reasoningChain: [ input → authority → application → conclusion ]
  verdict: { feasibility, confidence, roadmap, costs }
  rulesetHash, promptHash, modelVersion, responseStopReason
  activePersonaId, accountId, walletTransactionId  # Active Persona Gate (CODEX S52.43)
```

**CRITICAL:** Authority retrieval is a hard external lookup, not a generation task. The model generates a query — *"I need Maui County Code §19.04.040"* — and the `authorityResolver.js` fetches verbatim text, hashes it, and version-pins it. The model reasons over RETRIEVED text, never RECALLED text. If the resolver cannot find the citation, the worker surfaces it as unconfirmed — it does not fabricate. (Per EH-01; CODEX S52.43.)

---

## §9 — Composition with Other Workers (accepts-contract substrate)

LAW-LANDUSE-001 participates in the platform's accepts-contract worker interop substrate (CODEX S52.42 candidate). Bundle-shape contracts:

```yaml
# Catalog entry
emits:
  - shape: "feasibility-roadmap/v1"
    description: "Entitlement roadmap + verdict band + cost band + Mello-Roos carrying cost"
    auditAnchored: true
  - shape: "legal-opinion-bundle/v1"
    description: "Full Tier-S exportable brief with citations, reasoning chain, comparable cases"
    auditAnchored: true
    exportable: true

accepts:
  - shape: "parcel-bundle/v1"
    description: "Site Recon parcel + GIS overlays + ATTOM data + ownership candidate"
    minimumFields: ["address", "apn", "geometry", "jurisdiction"]
```

Per the substrate, downstream consumers DISCOVER LAW-LANDUSE-001 by declaring matching `accepts` in their own catalog entries. The spec does NOT enumerate downstream worker names — the catalog does, dynamically, at render time.

### Today's known integrations (illustrative — substrate discovers, doesn't hardcode)

| Worker | Direction | Bundle shape |
|---|---|---|
| **SITE-RECON-001** | ← upstream | `parcel-bundle/v1` via handoff token |
| **W-002 Real Estate Analyst** | → downstream | `feasibility-roadmap/v1` for financial model input |
| **PARA-001 Paralegal** | → downstream | `legal-opinion-bundle/v1` triggers drafting (variance app, CC&R memo, demand letter) |
| **PERMIT-001-CITIZEN** | → downstream | `feasibility-roadmap/v1` triggers application workflow (split from PERMIT-001 per #422; ships first) |
| **PERMIT-001-GOV** | → downstream | `legal-opinion-bundle/v1` to municipal-side worker (post-citizen ship) |
| **LIT-001** | → downstream | Escalation: quiet title, writ of mandamus |
| **BIZ-LAW-001** | → downstream | Easement agreements, option contracts |
| **PLAT-008 Audit Trail** | → infra | Every output anchored |
| **Vault DTC** | → infra | Parcel logbook entry per analysis |

Creator-built workers that declare `accepts: ["feasibility-roadmap/v1"]` appear in LAW-LANDUSE-001's "Send to…" dropdown the day they're listed — no code change to this worker ever required.

---

## §10 — Cost Basis (NOT Pricing) — FREE-Worker Inheritance

> **Per the SOCIII FREE-worker product principle:** this worker is FREE to use. Users pay only for the data and analysis it fetches at substrate-locked cost + approved markup, deducted from the session-payer's prepaid balance per the BILLING RULING (CODEX BILLING-ARCHITECTURE.md v2). **No subscription. No seat charge. No per-worker fee.**

Pricing is a shared hive primitive. This spec declares cost basis and tier shape only. Dollar amounts live in `config/pricing.js` + `SOURCE_REGISTRY` + Stripe catalog, rendered at view time via `pricingPreview(workerSlug)`. Worker specs that invent dollar amounts create TC-069-class failures. (Per CODEX S52.41 substrate-precedence rule.)

| Tier | Cost basis | What drives cost |
|---|---|---|
| **Tier-Q** | 1× Anthropic call + ≤3 authorities + Tier-2 baseline. No Tier-4/5. | Cheapest: smallest context, fewest pulls |
| **Tier-R** | 3–5× Anthropic calls + 10–25 authorities + 5–15 comparable cases + full Tier-3/4/5 + optional HOA CC&R OCR | Moderate: multi-pass reasoning, external pulls |
| **Tier-S** | 8–15× Anthropic calls + 50–100 authorities + statistical comparable analysis + exportable brief | Heaviest: heavy compute, multiple data feeds |

### External authorities — SOURCE_REGISTRY entries to land before launch
Per substrate-precedence rule, these PR against `services/billing/dataFee.js` with actual API costs + markup before worker ships:

- `municode:lookup` — Municode code-section retrieval
- `general-code:lookup` — General Code feed
- `courtlistener:case` — CourtListener case retrieval
- `ceqanet:filing` — CEQAnet CEQA filing lookup
- `legislature:statute` — State legislature current statutes + amendments

### Cost gate pattern (required by every worker — BILLING RULING)

- **`quoteDataFee`:** queries platform pricing module for current price BEFORE any analysis
- **Wallet balance check + persona-named gate** (per Active Persona Gate, CODEX S52.43): *"Billing to: [payer] — $X from your $Y balance. Say 'confirm' — or 'bill personal' to switch."*
- **User confirms or cancels**
- **`recordDataFee`:** atomically deducts payer pool at event time (per BILLING RULING — prepaid-only, refuse-not-float)
- **Cache + pivot:** same parcel + same question + same authority versions = cached result, no re-charge

---

## §11 — Inherited Product Debt (Apply at Design Time)

### A. Cache + pivot
Worker remembers per-parcel + per-authority caches. Canvas becomes a pivot interface — change tier, change scope without re-running underneath.

### B. Wallet balance gate
Before cost-confirm prompt, check user balance. If balance < cost: *"Your balance is $X. This costs $Y. You need to add $Z. Say 'top up' or 'cancel.'"* Wallet check in intercept layer BEFORE Alex composes the confirmation prompt. (Per BILLING RULING.)

### C. Search strategy coaching
*"Starting with a Tier-Q quick-look before a Tier-R full analysis saves money if Tier-Q says definitely no."* Tier-S explicit gating: *"Tier-S is for $1M+ decisions. Are you sure?"*

---

## §12 — Demo Scenarios

### Scenario 1 — Trivial (Tier-Q): Fence encroachment
Neighbor's fence 18 inches over property line. Worker: adverse possession statute, local fence ordinances, 3 options (talk / demand letter / quiet title), timeline + cost each, escalation trigger. **CAS:** WHITE advisory on adverse possession timer, BLUE action on demand letter option.

### Scenario 2 — Medium (Tier-R): Multi-unit residential on single-family lot
User has a single-family lot zoned R-1 and wants 4 units. Worker identifies 4 paths: (1) ministerial approval under applicable state ADU/density law, (2) density bonus + variance, (3) rezone — legislative, 12–18 months, (4) sell to a developer who specializes in this. Comparable case pull from jurisdiction records. **CAS roadmap:** GREEN for ministerial path, RED for rezone timeline risk.

### Scenario 3 — Major (Tier-S): Former industrial brownfield, high-density mixed-use redevelopment
6-acre former industrial site, post-remediation. User wants 240-unit mixed-use 6-over-2 with ground-floor retail. Worker: AB 2011 streamlining eligibility, CEQA EIR exposure, density bonus, IZ compliance, transportation. Roadmap: 5 entitlement decision points. Cost-time: median 18 months, $1.2M–$3.5M entitlement, EIR $800K–$1.2M, 65% approval probability based on comparable projects in jurisdiction. Killer risks: CEQA writ challenge, Surplus Lands Act if any public land involved, environmental remediation re-opening.

### Scenario 4 — Post-disaster coastal rebuild (dogfood use case)
Coastal parcel destroyed in a declared disaster. User wants to rebuild — and potentially expand. Worker: like-for-like rebuild is GREEN under post-disaster provisions if jurisdiction allows. Going bigger is YELLOW — triggers contested discretionary review. Coastal overlay (SMA or equivalent) is a BLUE action item — permit required regardless of disaster status. HOA CC&Rs: BLUE — not verified, upload to complete. Comparable: post-disaster rebuild cases in jurisdiction, approval rate surfaced.

### Scenario 5 — HOA + Mello-Roos compound (Tier-R, hyper-local load-bearing)
SFH in new residential subdivision, HOA governed, special tax district. User wants garage ADU + accessory structure for family member. Worker: Auto-detect hyper-local tax layer (special tax district — annual cost + lifetime exposure surfaced as WHITE advisory per RULE-17). HOA detected, CC&Rs not indexed — BLUE flag, upload prompt. CC&R analysis: potential "outbuilding" restriction partially preempted by state ADU law (unsettled — caveat surfaced). Garage conversion: GREEN — ministerial. Accessory structure: YELLOW — HOA architectural review required.

---

## §13 — Build Sequence (9 Steps)

1. **Step 1:** `landUseQuery.js` handler + route + cost gate + wallet gate + handoff token validation
2. **Step 2:** `analyzeFeasibility.js` core analysis engine + Tier-2 baseline composition
3. **Step 3:** PLAT-008 audit anchor + receipt schema with citation pinning + Active Persona Gate stamping (per CODEX S52.43)
4. **Step 4:** `authorityResolver.js` — **external retrieval only, no model recall** (per EH-01), version-pin, hash. Municode + General Code + state feeds + Tier-5 hyper-local sources + HOA CC&R OCR pipeline
5. **Step 5:** `comparableCases.js` — agenda-packet retrieval + decision parsing. Sources: CourtListener, CEQAnet, local planning department GIS. **No model-recalled comparables** (per EH-07).
6. **Step 6:** Canvas — CAS instrument panel + verdict hero + Google Maps + big numbers + CAS roadmap + CAS flag stack (RED→YELLOW→BLUE→WHITE→GREEN). Default tab = roadmap.
7. **Step 7:** Persona-tier routing + UPL gates + escalation routing (LIT-001 / PARA-001 / counsel referral per §15.8 — NO referrals to specific firms)
8. **Step 8:** Vault DTC bridge + W-002 handoff
9. **Step 9:** E2E scenario tests across all **5 demo scenario types** (§12) + workerSync + marketplace review ping

---

## §14 — QA-001 Assertion Catalog

### Worker-specific assertions (TC-101 through TC-120)

| TC | Assertion | Pass condition | Priority |
|---|---|---|---|
| TC-101 | Handoff token from SITE-RECON-001 validates | Token accepted, parcel data passes | P0 |
| TC-102 | Tier-Q output jargon density <15% | Lint passes | P1 |
| TC-103 | Tier-S output has ≥10 authorities | Citation count ≥10 | P0 |
| TC-104 | UPL gate fires on "should I sue" | Output refused + routed to LIT-001 | P0 |
| TC-105 | FH violation triggers federal preemption gate | Output refused + FHA cited | P0 |
| TC-106 | Unonboarded jurisdiction → Tier-3-only flag | Explicit flag surfaced | P0 |
| TC-107 | Authority retrieval version-pins correctly | Pin present on every citation | P0 |
| TC-108 | Reasoning chain captured in receipt | Chain present + traceable | P0 |
| TC-109 | Audit anchor written + verifiable in PLAT-008 | Receipt retrievable | P0 |
| TC-110 | Default canvas tab = entitlement roadmap | Roadmap opens first | P1 |
| TC-111 | Column headers full English, no jargon abbreviations | Lint passes | P1 |
| TC-112 | Cost dashboard headline number adjacent to entity ID | Layout verified | P1 |
| TC-113 | Second invocation replaces canvas, doesn't stack | Single canvas rendered | P0 |
| TC-114 | Wallet balance gate fires before confirm | Gate present, balance shown | P0 |
| TC-115 | Cache + pivot returns cached result for repeat-query same-parcel | No re-charge on repeat | P0 |
| TC-116 | Comparable case citations are real (anti-fabrication) | Each cite verifiable in source | P0 |
| TC-117 | Sample addresses pass verifyMethod check | verifyMethod present | P0 |
| TC-118 | Validator template-vs-implementation contract match | No drift | P0 |
| TC-119 | Stop reason check on Alex outputs (anti-clipping) | responseStopReason = end_turn | P1 |
| TC-120 | Persona tier upgrade requires explicit confirmation | Silent upgrade blocked | P1 |

### Platform-invariant enforcement (TC-121 through TC-138) — worker-level enforcement of CODEX S52.43

Per CODEX S52.41 substrate-precedence: these TCs enforce platform invariants at the worker level. They are NOT worker-author inventions; they verify this worker inherits the canon correctly.

| TC | Platform invariant | Worker-level assertion | Pass condition | Priority |
|---|---|---|---|---|
| TC-121 | EH-01 (no recall citations) | authorityResolver called; no raw model citation | Resolver called for every cite | P0 |
| TC-122 | EH-02 (confidence floor) | 4-dimension score present in receipt | data + authority + jurisdiction + hyper-local scored | P0 |
| TC-123 | EH-03 (gap declaration required) | Gap section present in every output; not empty | Gap declaration always visible | P0 |
| TC-124 | EH-04 (no silent jurisdiction fallback) | "Tier-3 only" label when Tier-4 unavailable | Label explicit | P0 |
| TC-125 | EH-05 (hyper-local gap declaration) | HOA/CFD/Specific Plan gap explicitly stated | Gap named with consequence | P0 |
| TC-126 | EH-06 (version pin required) | No unversioned citations in output | Pin on every cite | P0 |
| TC-127 | EH-07 (no comparable fabrication) | comparableCases.js called; no raw model comparables | Function called for every comparable | P0 |
| TC-128 | CAS-01 (5 colors render) | RED/YELLOW/BLUE/WHITE/GREEN all present and correct | All 5 render | P0 |
| TC-129 | CAS-02 (flag stack order) | Stack order: RED→YELLOW→BLUE→WHITE→GREEN | Order verified | P1 |
| TC-130 | CAS-03 (roadmap step color matches CAS state) | Each step circle color = CAS state | Color-state match | P0 |
| TC-131 | CAS-04 (BLUE flag includes inline action link) | Action link present on all BLUE flags | Link present | P1 |
| TC-132 | Active Persona Gate (AP-01) | activePersonaId stamped on every receipt | Field present in receipt | P0 |
| TC-133 | Active Persona Gate (AP-02) | Account name shown in cost-confirm prompt | Account visible in prompt | P0 |
| TC-134 | Britney Rule (TC-070 platform) | Corrected behavior stops in next response | No repeat after correction in same session | P0 |
| TC-135 | Britney Rule (TC-070 platform) | Worker does not invent values source did not provide | No invented pricing/timelines/citations/comparables | P0 |
| TC-136 | Reagan Rule (platform invariant) | User-supplied data tagged `source: user_supplied, verified: false` | Tag present on all user inputs | P0 |
| TC-137 | Reagan Rule (platform invariant) | User-supplied figures labeled as user-provided in output | Not relayed as worker-generated | P0 |
| TC-138 | Geographic: non-US jurisdiction returns Tier-3-only with explicit flag | Flag present, no silent fallback | Explicit | P0 |

---

## §15 — Open Questions / Locked Decisions

- **§15.1 Jurisdiction coverage** — LOCKED: global, no ceiling. v1 baseline is US federal law plus progressively onboarded US state and local layers. Any jurisdiction worldwide can be onboarded to Tier-4. Until a local baseline is authored, the worker returns Tier-3-only analysis with an explicit flag (EH-04). The principle: *we know what we know and we flag what we do not.* International expansion is an onboarding question, not an architectural one.

- **§15.2 Cross-worker integration** — LOCKED: open plug-in architecture via accepts-contract substrate (§9). Any downstream worker that declares matching `accepts` bundle shapes can connect — permit, litigation, document drafting, financial modeling, or any future worker not yet imagined. The spec does not name or target specific workers. The connection primitive is the bundle shape; the roster is open and dynamic.

- **§15.3 HOA data acquisition** — LOCKED: hybrid. Auto-detect HOA existence from county/title records; prompt user upload for CC&R content (per Reagan Rule, treated as unverified until cross-referenced).

- **§15.4 Comparable case sourcing** — LOCKED: Trump Rule applies. People are not going to read agenda packets. Surface what the worker can verify from indexed sources. If the user volunteers a document, accept it (Reagan Rule) and treat it as unverified until the worker can confirm it. Gaps are BLUE flags, not scrapers. Build the scraper when there is demand, not before.

- **§15.5 Hyper-local restriction layering** — LOCKED: never assume city zoning is the full answer. The worker checks all layers it can detect: special tax districts, HOA covenants, PUD restrictions, overlay zones, assessment districts, community plan areas. Flag every layer it cannot. (EH-05 enforces this.)

- **§15.6 Pricing module integration** — LOCKED: per-worker SKU registration with Tier-Q/R/S sub-SKUs via platform substrate (`config/pricing.js` + `SOURCE_REGISTRY`); rendered at view time via `pricingPreview(workerSlug)`. Platform-level decision; this worker consumes the substrate per CODEX S52.41.

- **§15.7 Persona detection** — LOCKED: solved at platform substrate level. This worker inherits the active persona from the platform — it does not re-detect, re-ask, or override.

- **§15.8 Referrals** — LOCKED: NO REFERRALS. SOCIII is not an ad model or lead generation platform. Escalation language is: *"you need a licensed attorney for this."* Full stop. The worker does not recommend, name, or link to specific attorneys or firms. Ever.

- **§15.9 Tier-S analytics depth** — OPEN. Insufficient information to opine. Revisit when real Tier-S usage data exists.

---

## §16 — What This Enables Strategically

LAW-LANDUSE-001 proves three things simultaneously:

- **Data substrate → legal substrate composition works.** SITE-RECON-001 → LAW-LANDUSE-001 handoff via accepts-contract bundle shapes proves the marketplace composability thesis.
- **Canvas-Worker Parity principle generalizes across verticals.** Trump Rule + CAS Color Protocol applied to legal vertical proves it's not a property-vertical accident.
- **The Deposition Rule is the audit substrate's load-bearing claim.** A legal opinion that survives a subpoena three years later is the bar. This worker is the test.

### The cost compression story
A Tier-R land use analysis costs $5,000–$9,000 from a licensed attorney (8–15 hours at $400–600/hr). LAW-LANDUSE-001 delivers the same analytical groundwork in minutes. The attorney the user hires afterwards reviews and signs off on a structured analysis — their 12-hour job becomes a 2-hour job. **That's the pitch: not replace the lawyer, make the lawyer 6× faster and 6× cheaper.**

---

## §17 — Next Steps

1. Sean ratifies v3 spec (open §15.9 the only open item)
2. **CODEX S52.43 — Platform RAAS Invariants** authored (extracts §18 content from v2; LAW-LANDUSE-001 inherits by reference)
3. **`creators/_template/intent.md`** updated with `§-Platform-Invariants-Inherits-S52.43` scaffold section
4. **Web-Alex `/creators/journey` system prompt** updated to inject S52.43 invariants into every new Intent Spec authoring flow
5. **Canvas mockup** uploaded to `creators/sean-combs/law-landuse-001/canvas-mockup.png`
6. Cut intake CODEX — S52.44 (or next available slot) documenting LAW-LANDUSE-001 build kickoff
7. Canvas-context-routing primitive shipped (EOD-caught P0 — prereq for any worker switching demo)
8. Run the four-way authoring loop — Sean + Web-Alex (Intent Spec Round 6 = CAS Visual Narrative) + T1 (CODEX cuts) + Code (build)
9. Inherits compounded discipline — every TC class lesson, every CODEX rule, every CAS sub-principle applied at build time

---

## §18 — Platform RAAS Invariants (INHERITS CODEX S52.43)

This worker inherits all Platform RAAS Invariants by reference from **CODEX S52.43 — Platform RAAS Invariants**:

- **Epistemic Honesty Gate** (EH-01 through EH-07) — no recall citations, confidence floor before output, gap declaration required, no silent jurisdiction fallback, hyper-local gap declaration, version pin required, no comparable fabrication
- **CAS Color Protocol** — RED / YELLOW / BLUE / WHITE / GREEN; flag stack order; BLUE-is-the-missing-color discipline
- **Active Persona Gate** (AP-01 through AP-06) — persona-named billing prompt; persona-stamped receipts; mid-session switch re-fires cost gate
- **Reagan Rule** — trust but verify; user-supplied data tagged unverified; epistemic hygiene at the input layer
- **Britney Rule** (TC-070) — never invent values source didn't provide; when corrected, stop in next response
- **Trump Rule** (CODEX S52.37) — per-vertical visual floor; design for the audience that doesn't read

**This spec MUST NOT redefine or modify any of these invariants.** Worker-specific rules (RULE-01 through RULE-17 in §6) may TIGHTEN substrate policy at the worker level (per CODEX S52.41 substrate-precedence rule); they may not LOOSEN it. Worker-level enforcement of platform invariants is verified by TC-121 through TC-138 in §14.

Per CODEX S52.43 + the SOCIII Creator Workspace authoring flow: any future worker built after this one inherits the same invariants by reference. The Creator Workspace's Alex Intent Spec rounds automatically scaffold the inheritance section into every new spec.

---

**LAW-LANDUSE-001** | SOCIII Platform | **v3.0** | June 2026 | Confidential | General information only — not legal advice
