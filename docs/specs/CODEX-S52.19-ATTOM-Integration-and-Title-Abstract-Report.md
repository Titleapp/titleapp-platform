# CODEX S52.19 — ATTOM Integration + Title Abstract Report Concept

**Date:** 2026-06-02
**Status:** STRATEGIC — captured for the Real Estate suite build (next week)
**Trigger:** Sean's insight 2026-06-02 — *"They have so many products. The key ones are the residential and commercial and LENDING documents. They also have zoning codes and such. We can construct really excellent TITLE ABSTRACT reports from this (different than a title report as we're not an insured title company but our reports will actually be better)."*

---

## Why this insight matters

A title insurance company's report covers: vesting · chain of title · legal description · encumbrances · tax status · liens · plat. It's table stakes; the insurance is the product.

ATTOM's data lets us produce a **Title Abstract Report** that's strictly a superset: everything a title report has, PLUS the entire risk + opportunity + zoning + demographics + permit context layered on top. Without the insurance.

**The positioning:** "Not insured title — but more useful than insured title for every decision that isn't 'will this loan close.'" Real estate brokers, agents, buyers, lenders, investors, developers, and underwriters all want this. The title insurance company hides everything behind a flat report; SOCIII reveals the property's complete picture.

---

## ATTOM API surface — what's available

Per the developer portal at `api.developer.attomdata.com` (Sean signed up 2026-06-02 — credentials in `~/Downloads/SOCIII-Vendor-Master-PRIVATE.md`):

| ATTOM API | What it carries | SOCIII RE worker that consumes it |
|---|---|---|
| **Property API** | Per-parcel record: APN, owner, vesting, legal description, valuation (AVM), assessment history, tax history | Property DTC parent record + Title Abstract base |
| **Area API** | Boundaries (school district, census tract, FEMA flood zone, fire hazard), demographic rollups | Title Abstract risk + opportunity layer |
| **POI API** | Points of interest near a property (schools, parks, retail, transit) | Property value drivers in the abstract |
| **Community API** | Walkability, livability scores, crime, climate risk projections | Risk + amenity context |
| **Property + Lending** | Mortgage history per property, deed-of-trust + reconveyance chain, foreclosure flags | Chain-of-title equivalent in the abstract |
| **Zoning** | Code, permitted uses, setbacks, density limits per parcel | Buildability + entitlement worker (RE-developer) |
| **Permits** | Permit history per property (renovations, additions, electrical, plumbing) | Improvement chain + condition signal |
| **Sales / Comparables** | Recent comparable sales by geography | Broker / valuation worker |

Sean's call-out:
- **Residential** — covered by Property API + Area + POI + Community
- **Commercial** — covered by Property API (commercial subset) + Area + POI
- **Lending** — Property + Lending API (deed + mortgage chain)
- **Zoning** — Zoning API

All four ATTOM family classes that Sean flagged map directly to RE workers we've already designed.

---

## The Title Abstract Report — composition

A SOCIII Title Abstract Report for a single parcel composes the following sections, every one of which is data-fee billed at 100% markup per `feedback_data_credit_billing_universal`:

### 1. Vesting + Ownership History
- Current owner of record (Property API)
- Vesting type (sole, joint, tenancy in common, trust, LLC, etc.)
- Prior owner chain back N years (Property + Lending API)
- Deed types (warranty, quitclaim, special warranty, trust deed, etc.)

### 2. Encumbrances Snapshot
- Active mortgages + holders (Lending API)
- Recorded liens (mechanic's, judgment, IRS — sourced from county recorder where ATTOM has coverage)
- Easements declared (where ATTOM has metadata)
- Deed restrictions / HOA / CCRs (where ATTOM has metadata)

> **Compliance flag:** SOCIII does NOT certify lien clearance for title-insurance purposes. The Abstract surfaces what ATTOM has; the user's title attorney / escrow officer certifies for transaction closure.

### 3. Tax + Assessment History
- Current assessed value vs. AVM (Property API)
- Tax history N years (annual change)
- Special assessments + tax districts (Area API)
- Tax delinquencies (where ATTOM has it)

### 4. Risk Layer
- FEMA flood zone (Area API)
- Wildfire risk score (Community API)
- Earthquake / liquefaction risk where available
- Climate risk projections (Community API)
- Crime risk score with trend (Community API)

### 5. Opportunity / Marketability Layer
- AVM with confidence interval (Property API)
- Comparable sales last 12 months (Sales API)
- Days-on-market by submarket (Sales)
- Walk score + transit score (Community)
- School district + ratings (Area)
- Demographics (Area)

### 6. Buildability + Entitlement Layer (RE-developer worker context)
- Zoning code + permitted uses
- Lot dimensions + setbacks + max FAR + height limit
- Permit history N years (renovations, additions)
- Subdivision potential signals (lot size vs. minimum)

### 7. SOCIII Audit Layer (the differentiator)
- Every ATTOM data pull recorded as a logbook entry on the Property DTC (per CODEX S52.15)
- Each logbook entry carries: timestamp · ATTOM API endpoint hit · cost · the actual payload hash · the user who initiated the pull · the worker that produced the abstract
- The full Abstract Report is itself a compound DTC — referenced by every party in the transaction (buyer, seller, broker, lender, escrow, agent, underwriter)
- Hash-anchored to Base; can be presented to a regulator / court as proof of due diligence at a specific moment in time
- Vocabulary discipline: audit ledger / logbook entry / anchor record — never "NFT" or "mint" in customer-facing surfaces (per S52.15)

This is the layer no title insurance company can offer. The report exists, the report's provenance is anchored, the report's underlying data sources are traceable.

---

## Why this beats a traditional title report

| Capability | Title Insurance Co. | SOCIII Title Abstract Report |
|---|---|---|
| Vesting + chain of title | ✓ | ✓ |
| Encumbrances snapshot | ✓ | ✓ (with provenance) |
| Tax + assessment history | Limited | Full N-year |
| Insured for title clearance | ✓ | ✗ (not an insurance product) |
| FEMA / wildfire / earthquake risk | ✗ | ✓ |
| Climate risk projections | ✗ | ✓ |
| Comparable sales + AVM | ✗ | ✓ |
| Walk + transit + school context | ✗ | ✓ |
| Zoning + buildability analysis | ✗ | ✓ |
| Permit history | ✗ | ✓ |
| Cryptographic audit chain | ✗ | ✓ |
| Updatable on demand | One-time | Continuously refreshable |
| Price | $500–$2,500/transaction | $29–$99/month subscription or per-pull |

The insurance is a separate purchase. For every decision that *isn't* closing — buying, selling, lending, listing, developing, refinancing, divorcing, settling an estate — the SOCIII Abstract is more useful.

---

## Which workers consume which ATTOM endpoints

| Worker | Vertical | ATTOM endpoints |
|---|---|---|
| RE Broker (residential) | real-estate-professional | Property + Area + POI + Sales (comparables) + Community |
| RE Broker (commercial) | real-estate-professional | Property (commercial subset) + Area + POI + Lending (CRE-mortgage chain) |
| Property Management | real-estate-professional | Property (owner contact) + Lending (insurance carrier from mortgage record) + Permits |
| Escrow | real-estate-professional | Property + Lending (mortgage payoff calc) + Area (recorder office) |
| RE Developer | real-estate-development | Property + Zoning + Permits + Community |
| Title Abstract (NEW — proposed) | real-estate-professional | All of Property + Area + POI + Community + Lending + Zoning + Permits |
| Lending / Mortgage Originator | real-estate-development (or new banking) | Property + Lending + Area (flood zone) + Community (risk) |
| Investor / Comparable Screener | real-estate-development | Sales + Property + Area + Community |

---

## Per-call cost & markup (data-fee mechanics)

ATTOM's standard developer-tier pricing (subject to verification once Sean has the dashboard):

| Call type | Base cost (estimated) | Customer is charged | Creator share | Platform share |
|---|---|---|---|---|
| Single property pull | ~$0.10–$0.30 | base × 2 | 20% of markup | 80% of markup |
| Bulk address (1k+) | discount tiered | base × 2 | 20% of markup | 80% of markup |
| AVM | ~$0.15 | base × 2 | 20% of markup | 80% of markup |
| Sales comp set | ~$0.50–$1.00 | base × 2 | 20% of markup | 80% of markup |

Title Abstract Report assembles ~12–15 calls per parcel. Customer total ≈ $4–$8 per report at the data fee layer (separate from the worker subscription). At scale that's the economic engine for the entire RE suite.

---

## Build wiring (after Sean has API key in hand)

1. `functions/functions/services/billing/dataFee.js` — add `attom:property`, `attom:area`, `attom:lending`, `attom:zoning`, `attom:permits`, `attom:sales` source IDs with per-call base cost
2. `functions/functions/services/data/attom.js` — new service: thin wrapper around ATTOM REST API with header auth, response normalization, per-call data-fee charge inline
3. `functions/functions/.env` — add `ATTOM_API_KEY=...` (gitignored, comes from Sean's pull from the ATTOM dashboard)
4. Real Estate vertical catalog (`services/alex/catalogs/real-estate-professional.json` and `real-estate-development.json`) — add `constraintRaasSources` entries for each worker that consumes ATTOM
5. Canvas tabs — new "Property" tab on every RE worker, surfaces ATTOM data with cost-quote-before-pull pattern
6. RE Title Abstract Report worker (RES-TITLE-001 proposed) — a meta-worker that composes the 7-section report from all the ATTOM endpoints

Estimated wire-up: 1–2 days once Sean has the API key + plan tier confirmed.

---

## Patent angle

The SOCIII Title Abstract Report's structural innovation — **third-party data ingestion + per-record audit anchoring + compound-DTC report assembly** — is potentially a patent claim worth filing under the Filing C umbrella (Multi-Tier Composable Rule-Based Governance) or as a continuation. Patent Worker should track this when activated.

Specifically the claim language would cover:
- A method for assembling a property abstract from N third-party data sources
- Where each source pull is metered, billed, and anchored to a property DTC as a logbook entry
- Where the resulting abstract is itself a compound DTC referenced by N transaction parties
- And where the audit chain is presentable as proof-of-due-diligence to a regulator or court

Defer to counsel on whether this is a separate filing or a continuation of Filing C.

---

## Memory + tracking

Adding:
- This CODEX (S52.19) — durable spec
- ATTOM in `~/Downloads/SOCIII-Vendor-Master-PRIVATE.md` (already done)
- Memory: `project_attom_title_abstract_thesis.md` (to write — captures the "abstract not insurance" positioning so future sessions don't re-litigate the framing)

---

## Related

- `[[CODEX-S52.15-Audit-Trail-Architecture-DTC-Logbook-Model]]` — the DTC + logbook audit substrate this abstract sits on
- `[[CODEX-S52.17-Patent-Worker-Spec]]` — Patent Worker that should track the abstract's patent angle
- `[[feedback_data_credit_billing_universal]]` — the 100% markup billing pattern
- `[[project_real_estate_vertical_strategy]]` — broader RE thesis
- `[[reference_apollo_api]]` — adjacent data-API integration as reference pattern
