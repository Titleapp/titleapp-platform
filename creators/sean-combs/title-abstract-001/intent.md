# Worker: `title-abstract-001`

**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Status:** Draft — Track B-1 (Code-direct worktree)
**Working title:** Title Abstract Report
**Vertical:** Real Estate (real-estate-professional)
**Source spec:** CODEX S52.19 (ATTOM Integration + Title Abstract Report Concept)

## What it does

Produces a **Title Abstract Report** for any US parcel — a strict superset of a traditional title insurance company's report. Vesting + chain of title + encumbrances + tax history are table stakes; the Abstract layers FEMA / wildfire / climate risk + comparable sales + AVM + zoning + permits + walkability + school + demographic context on top, every section traceable to its source data pull and cryptographically anchored on the property's DTC. Not insured title — *more useful than insured title for every decision that isn't "will this loan close."*

## Who uses it

**Operators** (the tenant — business or person who subscribes):
- Real estate brokers (residential + commercial) preparing buyer / seller / listing packages
- Buyers + sellers in transactions wanting more than the title insurance company shows them
- Lenders + mortgage originators doing risk underwriting
- Real estate investors + developers scoping acquisitions
- Real estate attorneys + escrow officers building a paper trail
- Property managers vetting properties for portfolios

**End-users** (people who interact via entitlement):
- The transaction parties referenced in any single Abstract — buyer, seller, broker, lender, escrow, agent, underwriter — each can be granted scoped read access to a specific report through workspace invitations + the audit chain.

## What success looks like

1. A complete Abstract for a single US parcel renders in under 30 seconds from address input
2. Every numeric / categorical field in the report carries a "source: ATTOM <endpoint> · pulled <timestamp> · cost <data-fee>" tooltip — no field is unsourced
3. The report's seven sections (Vesting / Encumbrances / Tax / Risk / Opportunity / Buildability / Audit) all render even when a section's underlying data is partially missing (gap-declared per EH-04)
4. Every Abstract generation is anchored as a compound DTC entry on the property's logbook (PLAT-008) — a forensic auditor three years later can reproduce who pulled what when
5. The Abstract beats a customer-side title insurance report on coverage (FEMA + climate + comps + zoning + permits) and beats it on cost ($4–8 vs $500–2,500) while explicitly NOT replacing title insurance for transaction closure

## What this worker is NOT

- **NOT an insured title product.** SOCIII is not a title insurance company; this worker does NOT certify lien clearance for transaction closure. The Abstract surfaces what ATTOM has — the user's title attorney / escrow officer certifies for the closing.
- **NOT a parcel-discovery worker.** Address input only. Site Recon (SITE-RECON-001) is the discovery / scoring upstream worker; this worker accepts the parcel-bundle/v1 it emits.
- **NOT a market analysis worker.** Comparable sales appear in the Opportunity Layer as context, not as a feasibility study. Feasibility (FEASIBILITY-001) consumes the Abstract and produces market study output downstream.
- **NOT a buildability decision.** Zoning + permits appear in the Buildability Layer as raw context. Land Use AI Attorney (LAW-LANDUSE-001) consumes this layer to produce a legal opinion.

## Why this dovetails with the SOCIII platform

| Need | Platform capability |
|---|---|
| Property DTC + logbook | SITE-RECON-001 emits parcel-bundle/v1; this worker pulls + appends |
| Per-field provenance | PLAT-008 audit anchor (CODEX S52.15 / S52.23) |
| Cost transparency on every ATTOM call | substrate `dataFee.js` + Active Persona Gate prompt |
| Tamper-proof report identity | Compound DTC anchored on Base via Crossmint (CODEX S52.15) |
| Cross-worker recall | accepts `parcel-bundle/v1` from Site Recon; emits `title-abstract-bundle/v1` to LAW-LANDUSE / FEASIBILITY / W-002 |
| Per-vertical visual floor | Trump Rule — RE visual floor = MLS-listing-grade hero + Bloomberg-grade sub-sections |

## Catalog declaration

```
{
  "id": "TITLE-ABSTRACT-001",
  "slug": "title-abstract-001",
  "vertical": "real-estate-professional",
  "pricing_tier": 0,
  "creator": "sean-combs",
  "creatorRevenueSharePct": 20,
  "emits": ["title-abstract-bundle/v1"],
  "accepts": ["parcel-bundle/v1"],
  "constraintRaasSources": [
    "attom:property",
    "attom:area",
    "attom:lending",
    "attom:zoning",
    "attom:permits",
    "attom:sales",
    "attom:community",
    "attom:poi"
  ]
}
```

## Canvas tabs (default + secondary)

1. **Abstract Hero** (default tab) — headline verdict card: address + APN + AVM + risk badge + price-confidence indicator + "Generate Full Abstract" CTA. Visual floor: MLS-listing-grade.
2. **Vesting + Chain** — owner-of-record + N-year chain + deed-type timeline
3. **Encumbrances** — active mortgages + liens + easements + HOA, with compliance flag (not certified for closure)
4. **Risk Layer** — FEMA flood + wildfire + earthquake + climate map overlay
5. **Opportunity Layer** — AVM + comps + walk/transit/school scores + demographics
6. **Buildability + Permits** — zoning + setbacks + FAR + permit history
7. **Audit Receipt** — DTC compound entry with every ATTOM pull listed (timestamp + endpoint + cost + hash + initiating user)

Canvas mockup REQUIRED per Round 6 of /creators/journey before Code build starts — drop at `creators/sean-combs/title-abstract-001/canvas-mockup.png` (+ tab variants).

## Audit-anchored events

- `title_abstract_requested` — triggers ATTOM cost quote to active payer
- `title_abstract_generated` — full 7-section report assembled + anchored as compound DTC entry on the property's logbook
- `title_abstract_section_refreshed` — partial refresh of one section without re-anchoring the full report
- `title_abstract_handed_off` — emitted when downstream worker (LAW-LANDUSE-001 / FEASIBILITY-001 / W-002) accepts the title-abstract-bundle/v1

## Open questions for reviewer

1. **Refresh cadence** — should the Abstract be a one-shot snapshot or include a "refresh this section" button per panel? S52.19 implies refreshable; this MVP ships snapshot-first to control data-fee cost; refresh is v1.1.
2. **PDF export** — title insurance reports are PDF artifacts. Does the Abstract emit a downloadable PDF + a live canvas, or just live canvas? Defer to Sean — PDF is patent-claim-relevant.
3. **Multi-parcel report (assemblage)** — developer use case wants 5–50 contiguous parcels in one Abstract. Out of scope for v1; tracked under "assemblage abstract" in v1.1.
4. **Bulk-pull discount** — ATTOM offers bulk-address discount. Surface to user OR amortize silently? Sean should rule.

## Cross-references

- `docs/specs/CODEX-S52.19-ATTOM-Integration-and-Title-Abstract-Report.md` — source spec
- `docs/specs/CODEX-S52.20-Audit-Substrate-Property-Recording-Infrastructure.md` — strategic frame
- `docs/CODEX-S52.43-Platform-RAAS-Invariants.md` — invariants this worker inherits (see Platform RAAS Invariants section below)
- `contracts/bundle-shapes/parcel-bundle.v1.json` — accepted bundle shape (TO BE WRITTEN)
- `contracts/bundle-shapes/title-abstract-bundle.v1.json` — emitted bundle shape (TO BE WRITTEN)
- Reference workers: `creators/sean-combs/site-recon-001/` (upstream parcel-bundle emitter)

## Platform RAAS Invariants (INHERITS CODEX S52.43)

> Do not modify. This worker inherits all Platform RAAS Invariants from CODEX S52.43 — Epistemic Honesty Gate (EH-01..07), CAS Color Protocol, Active Persona Gate (AP-01..06), Reagan Rule, Britney Rule, Trump Rule. Pricing inheritance: FREE worker; users pay only for ATTOM data pulls at substrate-locked cost + approved markup per BILLING-RULING (prepaid-only). Composition inheritance: declares `emits: ["title-abstract-bundle/v1"]` and `accepts: ["parcel-bundle/v1"]` per the accepts-contract substrate.
