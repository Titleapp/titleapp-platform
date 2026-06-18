# Worker: `law-landuse-001`

**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Status:** Build — full spec at `WORKER-SPEC.md` (v3)
**Working title:** Land Use AI Attorney
**Vertical:** Real Estate (real-estate-professional — lawyer / developer facing)
**Source spec:** `WORKER-SPEC.md` (LAW-LANDUSE-001 v3) · CODEX S52.43

## What it does

The legal feasibility layer on top of Site Recon's data substrate. Takes a parcel (from a SITE-RECON-001 handoff or resolved standalone) plus a land-use question — from trivial (ADU feasibility, HOA rule) to major (post-disaster coastal rebuild, brownfield entitlement) — and returns: what the law says, what it will take, and the realistic path, in plain English with citations a real attorney can audit. It diagnoses applicable law, translates to plain English with version-pinned citations, identifies specific blockers, sketches the path with cost and timeline, flags when to escalate to a licensed attorney, and anchors every analysis to PLAT-008. Authority + comparable retrieval is external-only (EH-01/EH-07) — never model recall.

## Who uses it

**Operators** (the tenant): active developers, small builders, real estate attorneys doing research, REITs and institutional counsel, and property owners scoping a project. Persona tiers Q (first-timer) / R (active developer) / S (veteran / institutional) are detected at onboarding and never silently upgraded.

**End-users:** transaction parties granted scoped read access to a specific analysis via workspace invitations + the audit chain.

## What success looks like

1. From a parcel + question, a feasibility analysis returns with a CAS-coded verdict, an entitlement roadmap, and version-pinned citations.
2. Every cited authority is retrieved from a primary source at analysis time — no model-recalled citations (EH-01); every citation carries a version pin (EH-06).
3. Comparable cases are retrieved from verifiable sources (EH-07) — hearing date, jurisdiction, decision, vote — never fabricated.
4. Every output declares what was checked and what could not be checked (EH-03 gap declaration), and degrades confidence honestly when hyper-local data is missing.
5. Every analysis anchors to PLAT-008 with citation snapshot + version pin + rulesetHash — a forensic auditor three years later reproduces the reasoning (Deposition Rule).

## What this worker is NOT

- **NOT a licensed attorney representing you.** Every output carries a UPL disclaimer and escalates to a licensed attorney when stakes rise.
- **NOT a document drafting tool** (that is PARA-001), **NOT a permitting workflow** (PERMIT-001-CITIZEN), **NOT litigation counsel** (LIT-001).
- **NOT a title product** (TITLE-ABSTRACT-001) and **NOT a market/financial study** (FEASIBILITY-001 / W-002).
- **NOT jurisdiction-agnostic** — un-onboarded jurisdictions return Tier-3-only analysis with an explicit flag (EH-04, no silent fallback).

## Catalog declaration

```json
{
  "id": "LAW-LANDUSE-001",
  "slug": "law-landuse-001",
  "vertical": "real-estate-professional",
  "pricing_tier": 0,
  "creator": "sean-combs",
  "creatorRevenueSharePct": 20,
  "emits": ["feasibility-roadmap/v1", "legal-opinion-bundle/v1"],
  "accepts": ["parcel-bundle/v1", "title-abstract-bundle/v1", "legal-question-bundle/v1"]
}
```

## Canvas tabs

Default = **Entitlement Roadmap** (most visual). Full tab set + element specs in `WORKER-SPEC.md` §7 and `canvas-tabs.json`:

1. **Entitlement Roadmap** (default) — CAS instrument panel + verdict hero cards + Google Maps risk overlays + KPI cards + CAS-colored entitlement stepper + flag stack.
2. **Citations** — version-pinned authority cards (external retrieval only, EH-01).
3. **Comparable cases** — outcome breakdown + timeline distribution + verifiable case rows (EH-07).
4. **Plain English** — CAS-coded conversational verdict + Q&A + handoff action bar.

Canvas mockups locked 2026-06-07 — `canvas-mockup*.png` (roadmap + citations + comparables + plain).

## Platform RAAS Invariants (INHERITS CODEX S52.43)

> Do not modify. Inherits Epistemic Honesty Gate (EH-01..07), CAS Color Protocol, Active Persona Gate (AP-01..06), Reagan Rule, Britney Rule, Trump Rule. Pricing: FREE worker; users pay only for data + authority pulls at substrate-locked cost + approved markup per BILLING RULING (prepaid-only). Composition: declares emits/accepts per the accepts-contract substrate. Full inheritance + worker-level TC-121..138 enforcement in `WORKER-SPEC.md` §14/§18.
