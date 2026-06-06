# Intent Spec — SITE-RECON-001 (Site Recon)

**Creator:** Sean Lee Combs (handle: `sean-combs`)
**Worker ID:** SITE-RECON-001
**Marketplace slug:** `site-recon`
**Spec version:** v1.1
**Built:** 2026-06-05 → 2026-06-06 (Steps 1–9 via four-way authoring loop)
**Ground-truth ruleset:** `functions/functions/raas/rulesets/site_recon_rules_v1.json`

## Round 1 — Purpose

> "Site Recon turns a real estate operator's vague hunch into a ranked list of underwriteable opportunities backed by historical title + sales + assessor data, with a feasibility verdict on each — done in under two minutes per parcel and chain-anchored so the analyst can defend the recommendation three years later."

Site Recon is the data substrate every other SOCIII real estate Digital Worker consumes. It converts a starting hunch — a neighborhood, a parcel, a zip code — into a bounded, ranked list of opportunities, each carrying a Green/Yellow/Red feasibility verdict, a plain-language named blocker, and a full audit anchor. The economic case: traditional pursuit funds cost $50K–$500K; Site Recon delivers the same first-look signal for tens of dollars.

## Round 2 — Operator persona + success outcome

Personas (spec §10, detected at onboarding, never silently upgraded): **First-Timer** (0 deals closed — education-forward), **Active Operator** (1–50 deals — standard density), **Veteran Developer** (50+ deals — dense data, CSV/JSON export, single-click cost gate).

The defining user voice, from the authoring session: *"I have a county and a use case (warehouse, drugstore, apartment complex). Show me the 10 parcels where I won't get stuck in permitting hell."*

Success looks like:
1. **Time to shortlist:** minutes from search to ranked list, vs. weeks of manual GIS queries
2. **False-positive discipline:** a GREEN verdict survives downstream underwriting the overwhelming majority of the time — GREEN must be *earned by evaluated passes, never granted by missing data* (tri-state check design)
3. **Evidence packages survive depositions:** every search, visual acknowledgment, and handoff anchored to PLAT-008 and mirrored to the parcel's Vault DTC logbook, queryable years later
4. **Cost per decision in dollars, not thousands:** ATTOM pull ($6/parcel) + GIS overlays ($0.05/fresh evaluation) + audit anchor, all metered through the cost gate with explicit confirmation
5. **Zero Fair Housing violations:** RULE-12 enforced fail-closed

## Round 3 — Constraints

- Rules: 17 (9 hard_stops + 8 soft_flags) per spec v1.1
- Composes with: Fair Housing v0, Deposition Rule, ATTOM API terms, CCPA
- Data fees: per the universal cost-recovery rule — ATTOM $6/parcel-report user-side, GIS evaluations $0.05/fresh-call cache-aware
- Vault: DTC-anchored, every action becomes a logbook entry on the parcel's DTC
- Audit anchor: PLAT-008 individual + batch receipts (Crossmint chain anchor optional)

## Round 4 — Out of scope

Per spec §1 ("What Site Recon Is NOT"): not a brokerage tool, not a consumer property search (not a Zillow replacement), not a valuation service (AVM is an input, not an appraisal), not a zoning attorney or permit expediter, not a substitute for full due diligence.

Follow-on workers this scopes toward (per the worker-dependency map that emerged from this build):
- **W-002 Real Estate Analyst** ("Title Abstract" in build naming — reconcile v1.2) — receives the one-click handoff for full underwriting
- **Land Use AI Attorney** — zoning/entitlement analysis (v1 surfaces `ZONING_UNAVAILABLE` placeholder blocker)
- **Permit Processor** — active permit flags (v1: `PERMIT_UNAVAILABLE`)
- **ESC-013 Parcel Atlas** — pre-anchored jurisdiction read-through (future-state)

## Round 5 — Edge cases handled

The 30 QA-001 assertions from spec §11 (QA-001 through QA-030): cost-gate block/pass, staleness caps (assessor 180d, AVM 30d), owner-mismatch flag, APN-retirement removal, list cap, persona lock + override, handoff contract, cross-worker timeout, no-investment-advice, overlay verdicts, batch receipts, SAMPLE chips, map/Street View/YouTube caps, input validation, Fair Housing refusal, session resume, CSV export schema.

Plus build-discovered handling not in the original spec: tri-state pass/fail/unknown checks with unknown-caps-at-YELLOW, fictional-address (ATTOM zero-results) refusal with no fee and no receipt, fail-closed Fair Housing detector, COST_MISMATCH 409 on quote drift >5%, per-APN handoff idempotency, orphan-fee logging on anchor rollback.

## Build history

| Step | What | Commit |
|---|---|---|
| 1 | searchByAddress + ATTOM cost gate | 1a6ae7e3 |
| 2 | scoreFeasibility + verdict logic | e0fd9797 |
| 3 | PLAT-008 audit anchor + rollback | 5389ab43 |
| 4 | searchByArea + batch receipt | 8972f3b9 |
| 5 | GIS overlay service (4 endpoints) | c791ee94 |
| 6 | visualLayer (Maps + Street View + RULE-17) | 41e34577 |
| 7 | handoffToTitleAbstract (W-002) | 1fa72ba3 |
| 8 | Vault DTC bridge + RULE-11/12 | cba44812 |
| 9 | Sublette + Oakland E2E + this file + marketplace | (this commit) |

## Failures preserved (QA-001 corpus)

- TC-061 — creator-journey snag loop (infrastructure)
- TC-062 — Alex miscitation of real rule under wrong number (miscitation)
- TC-063 — Alex fabrication of rule content under real IDs (authoritative-sounding fabrication)
- TC-064 — creator-journey response clipping at max_tokens, no indicator (silent truncation)

## Marketplace review status

- Submitted: 2026-06-06
- Reviewer: Forge Reviews (SOCIII-funded independent)
- Status: pending
