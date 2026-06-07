# Worker: `<your-worker-slug>`

**Creator:** Your Name (`your@email.com`)
**Status:** Draft
**Working title:** What this worker is called

## What it does

One paragraph in plain English. A non-technical reader should understand what this worker does after reading this section. Avoid jargon. Avoid hedging. State the problem and the solution.

## Who uses it

There are typically two sides to every worker:

**Operators** (the tenant — business or person who subscribes):
- Who they are
- What they do with this worker
- What success looks like for them

**End-users** (people who interact via entitlement, if applicable):
- Who they are
- What they do
- What success looks like for them

If your worker only has operators (no end-user side), say so explicitly.

## What success looks like

3-5 measurable outcomes that determine whether this worker is working. Examples of GOOD success metrics:
- "Instructor grades a reflection in ≤ 2 minutes"
- "A locked record cannot be modified, even by the user who locked it"
- "Customer-facing latency stays under 200ms p95"

Examples of BAD success metrics:
- "The worker is helpful" (not measurable)
- "Users love it" (vanity metric)
- "Increases efficiency" (vague)

Treat any user-task time budget as a bug bar — if you exceed it, fix it.

## What this worker is NOT

The boundary. Examples:
- "Not a degree-granting system — institutions issue degrees, this records competencies"
- "Not an LMS replacement — focused on a specific workflow inside existing LMS use"
- "Not certified for X — architecture-friendly to X, certification is per-deployment"

Saying what your worker doesn't do prevents scope creep and sets expectations honestly.

## Why this dovetails with the SOCIII platform

What platform infrastructure does this worker depend on? Examples:

| Need | Platform capability |
|---|---|
| Tamper-proof records | Append-only event store + chain anchor |
| Multi-instructor visibility | Multi-tenant workspace model with role-scoped reads |
| Identity verification | Stripe Identity (KYC) |
| Cross-worker data flow | Vault DTCs (Digital Title Certificates) |
| Real-money side effects | Capability registry — declare what you need, maintainer wires it |

If your worker doesn't need any platform infrastructure beyond a database, that's a sign it might not be a good fit for SOCIII — it might just be a standalone app.

## Audit-anchored events (what gets recorded permanently)

Every action that changes platform state emits an event to the append-only log. Locked events are also anchored to the public chain. List the events your worker emits:

- `<event_name>` — what triggers it, who can trigger it
- `<event_name>` — ...

## Open questions for reviewer

Before this can ship, decide:

1. **Worker name** — placeholder vs. final
2. **Capabilities** — list anything that needs external effects (email, payments, third-party API)
3. **Cohort scope** — single tenant or multi-tenant from day one?
4. **Anything else** — boundaries, edge cases, integration questions

## Platform RAAS Invariants (INHERITS CODEX S52.43)

> **Do not modify this section.** Every SOCIII Digital Worker inherits the following platform-level invariants by reference. The Creator Workspace's Alex authoring flow scaffolds this section into every new spec automatically. You write scope-of-work; the platform writes discipline.

This worker inherits all Platform RAAS Invariants from **CODEX S52.43 — Platform RAAS Invariants**:

- **Epistemic Honesty Gate** (EH-01 through EH-07) — *a confident wrong answer is worse than no answer.* No model-recalled citations; confidence floor before output; gap declaration required; no silent jurisdiction fallback; hyper-local gap declaration; version pin required; no comparable fabrication.
- **CAS Color Protocol** — RED (warning) / YELLOW (caution) / BLUE (advisory action — *the missing color*) / WHITE (status) / GREEN (normal). Flag stack always ordered RED → YELLOW → BLUE → WHITE → GREEN.
- **Active Persona Gate** (AP-01 through AP-06) — every billable action surfaces the active payer's name + balance in the cost-confirm prompt; receipts stamped with `activePersonaId`; mid-session persona switch re-fires the gate.
- **Reagan Rule** — *trust but verify.* User-supplied data accepted graciously, tagged `source: user_supplied, verified: false`, treated as unverified until cross-referenced against an authoritative source. We never call the user a liar; we just don't act on unconfirmed data as fact.
- **Britney Rule** (TC-070) — never add details the source didn't say; relay verbatim or ask. When corrected, stop the behavior in the next response; apologizing while repeating the pattern IS the violation, not the correction.
- **Trump Rule** (CODEX S52.37) — *people are stupid, heavily medicated, and don't read.* Design for the audience that doesn't read. Every screen works in 3 seconds, even for the boring stuff. Color does the talking. Words are captions, not content. Each vertical has a paid-report-aesthetic visual floor that worker canvases must meet.

This spec MUST NOT redefine or modify any of these invariants. Worker-specific rules (your `RULE-XX` entries) may TIGHTEN substrate policy at the worker level; they may not LOOSEN it. Worker-level enforcement of platform invariants is verified by TC-121 through TC-138 in your QA-001 assertion catalog (auto-generated when you finalize the spec).

**Pricing inheritance:** This worker is FREE to use (no subscription, no seat charge, no per-worker fee). Users pay only for the data and analysis it fetches at substrate-locked cost + approved markup, deducted from the session-payer's prepaid balance per the BILLING RULING (prepaid-only). Your spec declares cost basis + tier shape only — NEVER dollar amounts. Dollar amounts live in `config/pricing.js` + `services/billing/dataFee.js` SOURCE_REGISTRY, rendered at view time via `pricingPreview(workerSlug)`.

**Composition inheritance:** Your worker participates in the accepts-contract substrate. Declare `emits` and `accepts` bundle shapes in your catalog entry (e.g., `accepts: ["parcel-bundle/v1", "video-tile/v1"]` and `emits: ["your-worker-output/v1"]`). The catalog discovers downstream consumers dynamically — never hardcode handoff target lists.

## Cross-references

- `docs/CODEX-S52.43-Platform-RAAS-Invariants.md` — canonical source for the invariants this template inherits
- `docs/CODEX-S52.41-Substrate-Precedence-Rule.md` — the rule that says specs may not redefine substrate
- `docs/CODEX-S52.37-Canvas-Worker-Parity.md` — Trump Rule + Canvas-Worker Parity sub-principles + per-vertical visual floor
- `docs/BILLING-ARCHITECTURE.md` — prepaid-only billing canon + Active Persona Gate substrate
- `contracts/bundle-shapes/` — declared bundle shapes for accepts-contract worker interop
- `docs/CREATOR-WORKER-BUILD.md` — the build pattern this file follows
- `docs/CREATOR-ONBOARDING.md` — the onboarding flow you came through
- Existing reference workers:
  - `creators/ruthie/nursing-education-001/` (longitudinal record pattern; education vertical)
  - `creators/sean-combs/site-recon-001/` (RE data substrate; first creator worker shipped)
  - `~/Downloads/LAW-LANDUSE-001_Worker_Spec_v3.md` (legal vertical; first spec built against this template's inheritance pattern)
  - `~/Downloads/FEASIBILITY-001_Worker_Spec_v1.md` (market research vertical; second spec under the inheritance pattern)
