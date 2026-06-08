# Worker: `feasibility-001`

**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Status:** Build — full spec at `WORKER-SPEC.md` (v1)
**Working title:** Market & Feasibility Study
**Vertical:** Real Estate (real-estate-professional — developer / lender facing)
**Source spec:** `WORKER-SPEC.md` (FEASIBILITY-001 v1) · CODEX S52.43

## What it does

Produces the Market & Feasibility Study a developer takes to a lender or equity investor to demonstrate that a proposed project (units, mix, price point, absorption) is supportable by demand at the site. Takes a parcel (from a SITE-RECON-001 handoff or resolved standalone) plus the proposed product, and returns a demand analysis (demographics + employment + capture rate), a supply-pipeline analysis (competing projects + absorption), rent/sale comps, and a lender-readiness badge — every input version-pinned and audit-anchored. Comp retrieval is external-only (EH-07); all projections are scenario-modeled with explicit confidence bands.

## Who uses it

**Operators** (the tenant): real estate developers (pre-acquisition through loan submission), equity investors, REITs and institutional funds, and public agencies needing a market-based capture rate for entitlement. Persona tiers Q (pre-acquisition snapshot) / R (lender-defensible study) / S (institutional study) detected at onboarding.

**End-users:** lenders, equity partners, and investment-committee members granted scoped read access to a specific study via workspace invitations + the audit chain.

## What success looks like

1. From a parcel + proposed product, a Tier-R study returns a CAS-coded demand / supply / composite verdict with a lender-readiness badge.
2. Every comp carries provenance — address, date, price/rent, source, retrievedAt (EH-07) — no fabricated comps.
3. Every data source is version-pinned and surfaced on the Sources tab (EH-06); the study declares its data-coverage gaps (EH-05) rather than silently filling them.
4. The lender-readiness badge accurately reflects which lender programs the study qualifies for given the data tier (RULE-04).
5. Every study anchors to PLAT-008 (Deposition Rule) — if the loan defaults, a forensic auditor reconstructs that the analysis was honest at emit time.

## What this worker is NOT

- **NOT a Real Estate Analyst** — financial underwriting (IRR, capital stack, sensitivity) is W-002's job; this worker produces the demand/supply/comp INPUTS W-002 consumes.
- **NOT a third-party market research firm replacement** for institutional transactions above the lender threshold — it produces a defensible first-pass a third-party firm refines + stamps.
- **NOT a forecast oracle** — projections are scenario-modeled with confidence bands, never single-point.
- **NOT a legal/zoning verdict** (LAW-LANDUSE-001 / ZONING-001) and **NOT a title product** (TITLE-ABSTRACT-001).

## Catalog declaration

```json
{
  "id": "FEASIBILITY-001",
  "slug": "feasibility-001",
  "vertical": "real-estate-professional",
  "pricing_tier": 0,
  "creator": "sean-combs",
  "creatorRevenueSharePct": 20,
  "emits": ["market-snapshot/v1", "feasibility-study/v1", "investment-market-study/v1"],
  "accepts": ["parcel-bundle/v1", "title-abstract-bundle/v1", "underwriting-model/v1", "video-tile/v1"]
}
```

## Canvas tabs

Default = **Demand** (most visual — demographics dashboard synthesis). Full tab set + element specs in `WORKER-SPEC.md` §7 and `canvas-tabs.json`:

1. **Demand** (default) — verdict hero cards + demand-catchment map + demand-score synthesis + capture-rate analysis (points to Demographics for the deep-dive).
2. **Supply** — supply-pipeline Gantt timeline + competitive set + absorption.
3. **Comps** — rent/sale comp scatter + comp table with provenance (EH-07).
4. **Demographics** — full demographic deep-dive (pyramid, income, employment, tenure).
5. **Sources** — deposition-ready source audit (version pins + pull receipt + lender-readiness badge).

Canvas mockups locked 2026-06-07 — `canvas-mockup*.png` (demand + supply + comps + demographics + sources).

## Platform RAAS Invariants (INHERITS CODEX S52.43)

> Do not modify. Inherits Epistemic Honesty Gate (EH-01..07), CAS Color Protocol, Active Persona Gate (AP-01..06), Reagan Rule, Britney Rule, Trump Rule. Pricing: FREE worker; users pay only for data pulls at substrate-locked cost + approved markup per BILLING RULING (prepaid-only). Composition: declares emits/accepts per the accepts-contract substrate. Full inheritance + worker-level TC-121..138 enforcement in `WORKER-SPEC.md` §14/§18.
