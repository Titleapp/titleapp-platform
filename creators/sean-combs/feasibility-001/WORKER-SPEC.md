# FEASIBILITY-001
## Market & Feasibility Study Worker

**Digital Worker Specification** | SOCIII Platform | **v1.0 (stub)**
**Date:** 2026-06-07
**Spec inheritance:** SITE-RECON-001 · LAW-LANDUSE-001 · **CODEX S52.43 (Platform RAAS Invariants)** · CODEX S52.41 (Substrate-Precedence) · CODEX S52.37 (Canvas-Worker Parity + Trump Rule) · BILLING RULING (prepaid-only)

> *"The feasibility and market study is the deliverable a developer needs to have some degree of certainty around sales and lease-up — and it is REQUIRED by a lender to ensure they have checked the box on risk underwriting."* — Sean, 2026-06-07

**v1 stub authoring note:** drafted as the first worker to use the post-S52.43 template inheritance pattern. Platform invariants are INHERITED, not re-specified. Author wrote scope-of-work only. §15.x will refine after first build + Scott + Kim feedback.

---

## §1 — What This Worker Is

FEASIBILITY-001 produces the **Market & Feasibility Study** — the deliverable a real estate developer takes to a lender or equity investor to demonstrate that the proposed project (units, mix, price point, absorption assumption) is supportable by demand at the site.

The study is required by:
- **Lenders** — for construction + permanent debt underwriting (HUD / Fannie / Freddie / bank construction loans / mini-perms)
- **Equity investors** — for capital raise sanity-check on rent/sale assumptions
- **Public agencies** — for entitlement applications where market-based capture rate is a condition (TIF districts, density bonus, IZ programs)
- **Developer's own board** — for IC approval on major allocations

This worker generates the analysis the customer can DEFEND. It does not replace the third-party market research firm for projects above the lender's threshold (typically $30M+ project size). It DOES replace the consultant for smaller projects AND it produces the first-pass diligence package that a third-party study refines for larger ones.

### Output shape — the "Market Snapshot" + the "Full Study"

| Tier | Output | Use |
|---|---|---|
| Tier-Q | **Market Snapshot** — 1-page demographic + comp summary | Developer pre-acquisition sanity check; back-of-envelope yes/no |
| Tier-R | **Feasibility Study** — 8-15 page lender-defensible analysis | Construction loan submission for small-mid projects ($5M-$30M); equity capital raise |
| Tier-S | **Investment-Grade Market Study** — 30-50 page institutional report | Capital markets transactions, REIT acquisitions, public-private partnerships, EIR economic analysis |

---

## §2 — What This Worker Is NOT

- **Not a Real Estate Analyst** — financial underwriting (IRR, capital stack, sensitivity) is W-002's job. This worker produces the demand/supply/comps INPUTS that W-002 consumes.
- **Not a third-party market research firm replacement** for institutional-grade transactions. For project sizes above the lender threshold, this worker produces a defensible first-pass that a third-party firm can refine + stamp.
- **Not a forecast oracle.** All projections are scenario-modeled with explicit confidence bands. Lender underwriting expects ranges, not single-point estimates.
- **Not a comp-only worker.** Comps are necessary but insufficient — demand drivers, employment growth, supply pipeline all matter.
- **Not jurisdiction-agnostic.** Demographic + employment + comp data quality varies dramatically by market. Worker declares data coverage explicitly per the Tier-5 gap-declaration discipline.

---

## §3 — Persona Detection + Tiers

Inherited from platform substrate per CODEX S52.43 + LAW-LANDUSE-001 §3 pattern.

| Tier | User profile | UX behavior | Cost basis |
|---|---|---|---|
| **Tier-Q — First-Timer / Pre-Acquisition** | Developer evaluating a deal; doesn't need lender-grade yet | Plain English, demand-vs-supply summary, capture rate gut check | Lightest |
| **Tier-R — Active Developer / Loan Submission** | Has a deal in contract; needs the study for lender or equity | Full lender-grade analysis, all 4 dimensions, exportable PDF | Moderate |
| **Tier-S — Institutional / Capital Markets** | REIT, fund, syndicate, large-scale; needs investment-committee-grade | Full study + advanced analytics (gravity models, alternative-use analysis, exit cap sensitivity) | Heaviest |

---

## §4 — Inputs

### From Site Recon handoff (parcel-bundle/v1)
Same handoff pattern as LAW-LANDUSE-001. Parcel + jurisdiction + Site Recon verdict.

### From W-002 Real Estate Analyst (underwriting-model/v1)
Optional reverse handoff — when the developer has a draft pro forma and wants to verify the rent/sale assumptions are supportable.

### From user (the question)
- **Proposed product** — unit count, unit mix (studio / 1BR / 2BR / 3BR / commercial), avg unit size, amenity tier (Class A / B / C)
- **Proposed product type** — multifamily / for-sale / mixed-use / hotel / SFR-build-to-rent / industrial / office / retail
- **Proposed target rents / sale prices** (optional — worker validates if provided, generates if not)
- **Submarket boundary** — user-drawn or auto-derived (1/2/5/10 mile radius default)
- **Timeline** — expected stabilization / sellout horizon
- **Lender / use-case context** — bank conventional / HUD / Fannie / Freddie / equity capital raise / IC presentation

### User-supplied inputs (per Reagan Rule)
- Existing market study (PDF) — accepted, tagged unverified
- User-claimed comps — accepted, tagged unverified until cross-referenced
- User-supplied demographic forecasts — accepted, tagged unverified
- User-claimed cap rates / absorption rates — accepted, surfaced as user-provided in output

---

## §5 — Data Sources / RAAS Composition

### Tier hierarchy
- **Tier 0/1/2:** Platform invariants (inherits CODEX S52.43 — EH/CAS/AP/Reagan/Britney/Trump)
- **Tier 3:** Market research sub-vertical baselines — demand modeling, supply pipeline analysis, capture rate theory, hedonic comp regression, gravity models, employment-housing nexus, school quality demand drivers, transit accessibility
- **Tier 4:** Jurisdictional baselines — by metro, by submarket; reflects which paid data subscriptions are active for that geography
- **Tier 5 (LOAD-BEARING):** Submarket-level data — neighborhood-specific comps + supply pipeline (entitlement records from local planning department)

### External data sources

| Source | Cost | Coverage | Use |
|---|---|---|---|
| **US Census ACS** | Free | All US | Demographics — pop, income, household, age cohorts, tenure, race/ethnicity |
| **Census Bureau Population Estimates** | Free | All US | Population growth trends |
| **BLS QCEW** | Free | All US | Employment, wages by industry by county |
| **BEA Regional GDP** | Free | All US metros | Economic base + growth |
| **HUD Fair Market Rents** | Free | All US | Rent reasonableness benchmarks |
| **HUD Income Limits** | Free | All US | Affordability bands |
| **MLS** | Paid per market | Most US | Residential comps (sale + rent) |
| **ATTOM** | Already integrated | All US | Sales comps + assessor data + property characteristics |
| **CoStar** | Paid (premium) | Major metros | Commercial comps + supply pipeline + tenant data |
| **Reonomy** | Paid | Major metros | Commercial property + ownership intel |
| **Yardi Matrix** | Paid | Multifamily-focused | Multifamily comps + pipeline |
| **State employment dept** | Free | Per state | Detailed employment forecasts + LMI |
| **City planning department** | Free (per jurisdiction) | Per city | Entitlement records — supply pipeline + permit issuance trends |
| **GreatSchools / Niche** | Free tier / paid | All US | School quality scores (demand driver for residential) |
| **Walk Score / Transit Score** | Free / paid | All US | Walkability + transit accessibility |

### v1 launch scope (free-tier sources only)
- Census ACS + BLS QCEW + BEA + HUD + ATTOM + MLS (where available)
- Tier-5 submarket = local planning dept manual scrape (per city, build incrementally)

### v2 launch scope (paid sources gated)
- CoStar / Reonomy / Yardi added per submarket as customer demand justifies
- Per the substrate-precedence rule: each new SOURCE_REGISTRY entry is a PR against `services/billing/dataFee.js`, NOT a worker-spec change

### Tier-5 honesty protocol
Per EH-05 (CODEX S52.43): worker always declares data coverage gaps. If submarket-level supply pipeline data is unavailable, output explicitly surfaces *"Tier-5 supply pipeline not available for this submarket — upload local permit data or contact your municipal planning dept"* as a BLUE CAS flag.

---

## §6 — Rules (RAAS)

Worker-specific rules; platform invariants inherited per §18 / CODEX S52.43.

### Hard stops — `on_fail: refuse_analysis`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-01** Input validation | 🔴 RED | Parcel valid; product type land-use-appropriate; jurisdiction has minimum data tier onboarded | Refuse with explanation and routing |
| **RULE-02** Data freshness floor | 🔴 RED | Demographic + comp data within 24 months of analysis date | Refuse OR proceed with explicit caveat per tier — Tier-Q allows up to 36 months with WHITE flag; Tier-R/S blocks above 24 |
| **RULE-03** Audit anchor non-negotiable | 🔴 RED | Every analysis writes to PLAT-008 with source registry hash + data retrievedAt + version pin | 503 with rollback |
| **RULE-04** Lender-readiness gate | 🔴 RED | Tier-R/S outputs explicitly declare which lender programs the study qualifies for (Bank conventional / Fannie / Freddie / HUD / equity-only) based on data tier coverage | Block output without declaration |
| **RULE-05** Comp grounding | 🔴 RED | Every comp cited: address, date, price/rent, source, retrievedAt. No fabricated comps (anti-EH-07). | Block comp without provenance |

### Soft flags — `on_fail: caveat_and_proceed`

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-06** Submarket size adequacy | 🟡 YELLOW | Submarket has ≥5 comparable transactions within last 24 months | Caveat: "thin comp set; analysis carries higher uncertainty" |
| **RULE-07** Single-source over-reliance | 🟡 YELLOW | No single data source provides >70% of analysis inputs | Caveat: "analysis depends heavily on [source]; recommend cross-reference" |
| **RULE-08** Supply pipeline coverage | 🔵 BLUE | Local planning dept supply data verified for the submarket | Surface as BLUE action: "supply pipeline data uploaded by user or via municipal API" |

### Worker-specific rules

| Rule | CAS | Assertion | On fail |
|---|---|---|---|
| **RULE-09** Capture rate sanity gate | 🟡 YELLOW | Implied capture rate (proposed units ÷ demand) <30% for the absorption window | Caveat: "implied capture rate is aggressive; verify against historical absorption" |
| **RULE-10** Affordability disclosure | ⚪ WHITE | If proposed rents/sale prices exceed area median income affordability thresholds, surface the income-to-housing-cost ratio prominently | Always surface — informational, not gating |
| **RULE-11** Forecast horizon discipline | 🟡 YELLOW | Demand forecasts beyond 5-year horizon flagged as speculative | Caveat: forecast confidence degrades beyond 5 yr |
| **RULE-12** Anti-bubble check | 🔵 BLUE | Year-over-year rent or price growth >10% triggers advisory flag re cyclical risk | Surface as BLUE: "this submarket exhibited bubble-class growth; underwrite cycle risk" |
| **RULE-13** School-driven demand transparency | ⚪ WHITE | When school quality is invoked as a demand driver, the worker discloses the data source + recency + (per Reagan Rule) if it's from a third party (GreatSchools etc.) | Always disclose |

---

## §7 — Canvas Visual Specification (Trump Rule + CAS)

**Mockup location:** `creators/sean-combs/feasibility-001/canvas-mockup.png` (Sean to upload before build kickoff via fal.ai prompt provided 2026-06-07).

The canvas applies CAS Color Protocol (CODEX S52.43 §3) + Canvas-Worker Parity sub-principles (CODEX S52.37) per the legal/RE vertical floor.

### Canvas element specifications

- **CAS instrument panel:** 5-color bar across top showing flag counts. Lender reads project risk profile at a glance.
- **Verdict hero:** 3 cards — Demand verdict (Green / Yellow / Red), Supply verdict, Composite feasibility verdict. Visible before the analysis loads.
- **Demographics dashboard:** Population pyramid + median household income big-number + employment growth chart + top-5-employers ranked list. Per Trump Rule sub-principle B (plain-English headers — *Median income*, not *MHI*).
- **Rent / sale comp scatter plot:** X = $/sqft, Y = unit size, colored by submarket. Hover reveals address + recency. Filter by date + comp type + subject-area radius.
- **Supply pipeline timeline:** Horizontal Gantt-style chart showing competing projects under entitlement or construction in the submarket over next 24 months. Color-coded by stage (proposed / approved / under construction).
- **Big numbers:** 4 KPI cards — implied capture rate, demand-vs-supply ratio, projected stabilized rent/sale, median absorption timeline. Per Trump Rule sub-principle C (headline numbers adjacent to entity ID).
- **CAS flag stack:** Ordered RED → YELLOW → BLUE → WHITE → GREEN. Each flag has inline action link.
- **Video tile slot:** `video-tile/v1` primitive embedded — typical content: investor webinar from local Economic Development office, news report on submarket dynamics, drone aerial of subject site, or competitor project marketing video. Per CODEX S52.43 §5 (Reagan Rule), user-supplied videos display the unverified badge.
- **Default tab:** Demand (most visual — demographics dashboard is the entry point per Trump Rule sub-principle A).
- **Tab bar:** Demand · Supply · Comps · Demographics · Sources (data-provenance tab; deposition substrate)
- **Gap declaration:** Always visible BLUE CAS flag — names every data layer the worker could not verify.

### Lender-readiness badge
Tier-R/S outputs include a prominent badge declaring which lender programs the analysis qualifies for:
- 🟢 Bank conventional construction loan
- 🟢 Equity capital raise
- 🟡 Fannie Mae multifamily (requires CoStar supplement)
- 🔴 HUD 221(d)(4) (requires HUD-approved consultant signoff — this worker does not qualify)

The badge directly addresses Sean's framing: *"It is REQUIRED by a lender to ensure they have checked the box on risk underwriting."*

---

## §8 — Audit Anchor / Deposition Rule

Per CODEX S52.43 + LAW-LANDUSE-001 pattern: every analysis is anchored. The Deposition Rule applies fully. Lender takes the worker's output to underwriting committee — three years later, if the loan defaults, a forensic auditor opens the receipt and verifies the worker's analysis was honest at the time.

### Pull-receipt schema additions (beyond LAW-LANDUSE pattern)

```yaml
pull_receipt:
  workerId: "FEASIBILITY-001"
  searchId: "feas_..."
  question: { proposedProduct, submarketBoundary, lenderContext, personaTier }
  dataSources: [
    { source: "Census ACS 5-year 2024", version: "2024-12", retrievedAt, retrievedHash },
    { source: "ATTOM rental comps", region: "Maui HI 96761", retrievedAt, count: 47 },
    { source: "MLS — Maui Board of Realtors", retrievedAt, count: 23 },
    # ... etc — every source called, hashed, version-pinned (EH-06)
  ]
  comps: [
    { address, dateClosed, price, sqft, units, source, retrievedHash }  # No fabrications (EH-07)
  ]
  reasoningChain: [
    "Demand model: <inputs → method → result>",
    "Supply analysis: <inputs → method → result>",
    "Capture rate: <inputs → method → result>"
  ]
  verdict: { demandBand, supplyBand, composite, lenderReadinessBadge }
  rulesetHash, promptHash, modelVersion, responseStopReason
  activePersonaId, accountId, walletTransactionId  # Active Persona Gate
```

---

## §9 — Composition with Other Workers (accepts-contract substrate)

```yaml
# Catalog entry
emits:
  - shape: "market-snapshot/v1"
    description: "Tier-Q demographic + comp summary, 1-page lender pre-screen"
  - shape: "feasibility-study/v1"
    description: "Tier-R full feasibility analysis with lender-readiness badge"
  - shape: "investment-market-study/v1"
    description: "Tier-S institutional-grade study, exportable PDF"
    auditAnchored: true
    exportable: true

accepts:
  - shape: "parcel-bundle/v1"
    description: "Site Recon parcel + GIS overlays + ATTOM data + jurisdiction"
  - shape: "underwriting-model/v1"
    description: "Optional reverse handoff from W-002 to validate pro forma assumptions"
    optional: true
  - shape: "video-tile/v1"
    description: "Investor webinars, drone aerials, news reports, competitor marketing videos"
    optional: true
```

The catalog DISCOVERS downstream consumers dynamically — every worker that declares `accepts: ["feasibility-study/v1"]` appears in this worker's "Send to…" dropdown.

### Today's known integrations (illustrative — substrate discovers, doesn't hardcode)

| Worker | Direction | Bundle shape |
|---|---|---|
| **SITE-RECON-001** | ← upstream | `parcel-bundle/v1` |
| **W-002 Real Estate Analyst** | ↔ peer | `underwriting-model/v1` reverse-handoff for assumption validation; `feasibility-study/v1` forward to W-002 for full pro forma |
| **LAW-LANDUSE-001** | ↔ peer | Land Use's `feasibility-roadmap/v1` informs entitlement timing in supply pipeline; LAW-LANDUSE consumes capture rate to gut-check use viability |
| **PERMIT-001-CITIZEN** | → downstream | `feasibility-study/v1` accompanies entitlement application as economic justification |
| **PLAT-008 Audit Trail** | → infra | Every output anchored (lender-bound — Deposition Rule load-bearing) |
| **Vault DTC** | → infra | Parcel logbook entry per analysis |

---

## §10 — Cost Basis (NOT Pricing) — FREE-Worker Inheritance

> **Per the SOCIII FREE-worker product principle:** this worker is FREE to use. Users pay only for the data and analysis it fetches at substrate-locked cost + approved markup, deducted from the session-payer's prepaid balance per the BILLING RULING (CODEX BILLING-ARCHITECTURE.md v2). **No subscription. No seat charge. No per-worker fee.**

Pricing inherited from platform substrate per CODEX S52.41. Worker declares cost basis + tier shape only; dollar amounts live in `config/pricing.js` + `SOURCE_REGISTRY` + Stripe catalog, rendered at view time via `pricingPreview(workerSlug)`.

| Tier | Cost basis | What drives cost |
|---|---|---|
| **Tier-Q** | 1× Anthropic call + Census ACS pull + 10-15 comps + summary | Cheapest: free demographics, sampled comps |
| **Tier-R** | 3-5× Anthropic calls + Census ACS + BLS + ATTOM full + MLS + 50-100 comps + supply pipeline pull + lender-readiness analysis | Moderate: full data tier across multiple paid sources |
| **Tier-S** | 8-15× Anthropic calls + Tier-R sources + CoStar + Reonomy + statistical analysis (gravity models, hedonic regression) + exportable institutional brief | Heaviest: premium data subscriptions, advanced analytics |

### External authorities — SOURCE_REGISTRY entries to land before launch
Per substrate-precedence rule, PR against `services/billing/dataFee.js` with actual API costs + markup:

- `census:acs` (free)
- `bls:qcew` (free)
- `bea:regional` (free)
- `hud:fmr` (free)
- `attom:rentals` (already registered — `attom:property` covers; add `attom:rentals` variant)
- `mls:listing` (already registered — verify per-market coverage)
- `costar:comps` (paid premium — defer to v2)
- `reonomy:property` (paid — defer to v2)
- `yardi:matrix` (paid — defer to v2)
- `planningdept:supply` (per-jurisdiction custom scrape — v2)

### Cost gate + payer naming
Per BILLING RULING + Active Persona Gate (CODEX S52.43 §4): every billable action surfaces "Billing to: [payer] — $X from your $Y balance" + switch keyword.

---

## §11 — Inherited Product Debt (Apply at Design Time)

### A. Cache + pivot
Worker remembers per-submarket + per-source caches. Canvas becomes a pivot interface — change product type, change submarket boundary, change unit mix without re-pulling underlying data.

### B. Wallet balance gate
Per BILLING RULING — wallet check before cost-confirm. If balance < cost, top-up flow.

### C. Search strategy coaching
*"Tier-Q ($X) is right for pre-acquisition; Tier-R ($Y) is right for loan submission; Tier-S ($Z) is right for capital markets transactions. Don't pay for the institutional tier when you need a deal sanity check."*

### D. Lender-readiness clarity
Tier-R outputs include the lender-readiness badge prominently. Users buying the wrong tier for their use case get coached toward the right one.

---

## §12 — Demo Scenarios

### Scenario 1 — Tier-Q: Pre-acquisition deal sanity check (Pinedale WY)
User has a Pinedale parcel in contract; thinking 12-unit workforce-housing project. Worker pulls Census ACS, regional employment, ATTOM rent comps within 50-mile radius. Output: small 1-page snapshot — population +1.2% YoY, employment dominated by energy + tourism, comparable apartment rent $1,100-1,400/2BR, no current supply pipeline in 25-mile radius. **CAS:** GREEN demand verdict, WHITE supply (no pipeline), composite YELLOW (thin comp set per RULE-06). User decides whether to proceed to Tier-R.

### Scenario 2 — Tier-R: Construction loan submission (Lahaina post-fire rebuild + expand)
User rebuilding + expanding post-fire — proposed 24-unit luxury rental on coastal-adjacent parcel. Worker pulls full Tier-R data set. Output: 8-page study showing demand band (high — post-fire rebuild premium + visitor-economy worker housing shortage), supply band (constrained — entitlement bottleneck + Coastal Commission scrutiny), capture rate 18% (within sanity range), lender-readiness badge GREEN for bank conventional + equity. Includes video tile from Maui County Economic Development webinar on post-fire recovery. **CAS:** YELLOW supply pipeline incomplete (BLUE flag to upload local planning dept records).

### Scenario 3 — Tier-S: Investment-grade market study (West Oakland brownfield)
Institutional fund acquiring 6-acre brownfield, proposed 240-unit mixed-use. Worker pulls Tier-S data including CoStar + Yardi Matrix supply pipeline (paid). Output: 30-page institutional report with gravity model on demand draw, hedonic regression on rent comps, supply pipeline timeline showing 312 competing units coming online in 18 months, capture rate analysis showing tight competition, lender-readiness GREEN for HUD 221(d)(4) (with consultant supplement) + Fannie + bank construction loans. Includes BLUE flag on cyclical risk (RULE-12 — submarket exhibiting >10% YoY rent growth).

---

## §13 — Build Sequence (9 Steps)

1. **Step 1:** `feasibilityQuery.js` handler + route + cost gate + wallet gate + handoff token validation
2. **Step 2:** `analyzeDemand.js` — demographic + employment analysis composing Census ACS + BLS + BEA + HUD
3. **Step 3:** PLAT-008 audit anchor + receipt schema with source pinning + Active Persona Gate stamping
4. **Step 4:** `compsResolver.js` — **external retrieval only, no model recall** (per EH-01 + EH-07). ATTOM + MLS + (Tier-S: CoStar + Yardi). Verified, hashed, version-pinned.
5. **Step 5:** `supplyPipeline.js` — local planning department records + user upload accepting per Reagan Rule. Per-jurisdiction scraper builds incrementally as customer demand justifies (v2 scope).
6. **Step 6:** Canvas — CAS instrument panel + verdict hero + demographics dashboard + comp scatter + supply timeline + KPI cards + CAS flag stack (RED→YELLOW→BLUE→WHITE→GREEN) + video-tile/v1 slot + lender-readiness badge. Default tab = Demand.
7. **Step 7:** Tier routing + lender-readiness logic + exportable PDF generation for Tier-R/S
8. **Step 8:** Vault DTC bridge + W-002 handoff (forward + reverse) + LAW-LANDUSE peer handoff
9. **Step 9:** E2E scenario tests across 3 demo scenarios + workerSync + marketplace review ping

---

## §14 — QA-001 Assertion Catalog

### Worker-specific assertions (TC-101 through TC-120)

| TC | Assertion | Pass condition | Priority |
|---|---|---|---|
| TC-101 | Handoff token from SITE-RECON-001 validates | Token accepted, parcel data passes | P0 |
| TC-102 | Tier-Q output jargon density <15% | Lint passes | P1 |
| TC-103 | Tier-R output includes lender-readiness badge | Badge present + correct programs flagged | P0 |
| TC-104 | Data freshness floor RULE-02 fires | >24-month data blocked or caveated | P0 |
| TC-105 | Comp count assertion — Tier-R has ≥50 comps | Count ≥50; provenance per comp | P0 |
| TC-106 | Source registry version-pins | Pin on every cite | P0 |
| TC-107 | Audit anchor written to PLAT-008 | Receipt retrievable | P0 |
| TC-108 | Default canvas tab = Demand | Demand tab opens first (Trump Rule sub-A) | P1 |
| TC-109 | Column headers full English (sub-B) | "Median income", not "MHI" | P1 |
| TC-110 | Headline number adjacent to entity ID (sub-C) | Capture rate adjacent to project name | P1 |
| TC-111 | Subsequent invocation replaces canvas (sub-D) | Single canvas rendered | P0 |
| TC-112 | Wallet balance gate fires before confirm | Gate present, balance shown | P0 |
| TC-113 | Cache + pivot returns cached for same-submarket repeat | No re-charge | P0 |
| TC-114 | Capture rate sanity gate RULE-09 fires | <30% caveated | P0 |
| TC-115 | Video tile renders with verified badge per Reagan Rule | Unverified user uploads show badge | P0 |
| TC-116 | Lender-readiness badge accurate per data tier coverage | Badge matches actual data | P0 |
| TC-117 | Affordability disclosure (WHITE flag) surfaces when applicable | Income-to-housing ratio visible | P1 |
| TC-118 | Anti-bubble flag RULE-12 surfaces on >10% YoY growth | BLUE flag present | P1 |
| TC-119 | Stop reason check on Alex outputs | end_turn | P1 |
| TC-120 | Persona tier upgrade requires explicit confirmation | Silent upgrade blocked | P1 |

### Platform-invariant enforcement (TC-121 through TC-138 — inherits from CODEX S52.43)
Same set as LAW-LANDUSE-001 §14. Verifies the worker inherits S52.43 invariants correctly.

---

## §15 — Open Questions

- **§15.1 Per-market data coverage onboarding** — which metros first? Maui (Lahaina demo bench), Oakland (W. Oakland scenario), Pinedale WY (Sublette demo bench) at launch; add by customer demand.
- **§15.2 Paid data source partnership strategy** — CoStar / Reonomy / Yardi negotiations vs API consumption vs partner-resold. Defer to v2.
- **§15.3 Lender-readiness badge thresholds** — exact data-tier-coverage rules for each lender program need lender input (Kent? a sample lender contact?). Pre-Monday: ship the framework; refine post-Monday after Scott + Kim feedback.
- **§15.4 Third-party consultant white-label** — for Tier-S, partner with regional market research firms who can stamp the worker's analysis? Defer.
- **§15.5 Workforce + affordable housing variants** — capture rate models differ significantly for LIHTC / HUD-financed / Section 8 deals. Need separate Tier-R sub-flow? Defer.
- **§15.6 Build-to-rent specialty** — SFR build-to-rent has different demand-side drivers than multifamily. Separate model? Defer.
- **§15.7 Commercial product types** — office / industrial / retail need very different data stacks. v1 launch is residential-multifamily-focused; commercial = v2.
- **§15.8 Persona detection** — inherits from platform per CODEX S52.43.
- **§15.9 No referrals** — same as LAW-LANDUSE §15.8: no lead generation to specific consultants or market research firms.

---

## §16 — What This Enables Strategically

FEASIBILITY-001 completes the SOCIII real estate development workflow stack:

**SITE-RECON-001** (data substrate) → **LAW-LANDUSE-001** (legal feasibility) → **FEASIBILITY-001** (market feasibility) → **W-002 Real Estate Analyst** (financial underwriting) → **PERMIT-001** (entitlement workflow) → **RE-SALES / RE-LEASING** (post-completion)

This is the developer's actual workflow. Mirroring it exactly is the demo's strategic weight — Scott + Kim see the platform speak their language at the workflow level, not just the data level.

### The cost compression story
A market & feasibility study costs $15K-$50K from a third-party market research firm and takes 4-8 weeks. FEASIBILITY-001 produces a lender-defensible Tier-R study in minutes for the cost of the underlying data pulls. **For small-mid projects (sub-$30M), FEASIBILITY-001 replaces the consultant entirely. For institutional projects above the threshold, FEASIBILITY-001 produces the first-pass that a third-party firm refines + stamps — turning their 6-week engagement into a 2-week review.**

### The lender story
Banks + agency lenders require a market study as a checklist item. Most studies are 90% boilerplate + 10% real analysis. FEASIBILITY-001 makes the 10% the entire deliverable. Lender risk officers get the actual analysis faster and trust it more because every input is auditable.

### The marketplace composability story
FEASIBILITY-001 is a clean demonstration of bees-in-hive composition: same parcel substrate, different domain (financial vs legal vs underwriting), same audit anchor, same Trump Rule discipline. Three workers (LAW-LANDUSE + FEASIBILITY + W-002) consume the same `parcel-bundle/v1` and produce three different outputs that all feed a single deal decision.

---

## §17 — Next Steps

1. Sean ratifies v1 stub
2. Canvas mockup generated via fal.ai prompt (provided 2026-06-07) + uploaded to `creators/sean-combs/feasibility-001/canvas-mockup.png`
3. Cut intake CODEX — S52.x documenting the build kickoff (post-Monday demo)
4. v2 spec round adds CoStar / Reonomy / Yardi paid integrations + commercial product types
5. Build sequence runs after LAW-LANDUSE-001 + TITLE-ABSTRACT + ZONING + W-002 cleanup ship

---

## §18 — Platform RAAS Invariants (INHERITS CODEX S52.43)

This worker inherits all Platform RAAS Invariants by reference from **CODEX S52.43 — Platform RAAS Invariants**:

- **Epistemic Honesty Gate** (EH-01 through EH-07)
- **CAS Color Protocol** — RED / YELLOW / BLUE / WHITE / GREEN
- **Active Persona Gate** (AP-01 through AP-06)
- **Reagan Rule** — trust but verify; user-supplied data tagged unverified
- **Britney Rule** (TC-070) — never invent values source didn't provide
- **Trump Rule** (CODEX S52.37) — per-vertical visual floor

This spec MUST NOT redefine or modify any of these invariants. Worker-specific rules (RULE-01 through RULE-13 in §6) may TIGHTEN substrate policy at the worker level (per CODEX S52.41 substrate-precedence rule); they may not LOOSEN it. Worker-level enforcement of platform invariants is verified by TC-121 through TC-138 in §14.

---

**FEASIBILITY-001** | SOCIII Platform | **v1.0 (stub)** | June 2026 | Confidential | General information only — not lender investment advice
