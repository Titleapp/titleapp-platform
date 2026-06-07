# Worker: `zoning-001`

**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Status:** Draft — Track B-2 (Code-direct worktree)
**Working title:** Zoning + Entitlement (Consumer Side)
**Vertical:** Real Estate (real-estate-professional — citizen / homeowner / small builder facing)

## What it does

Answers "what can I build on this parcel?" in plain English for a homeowner, small builder, or first-time buyer who does NOT have a land use attorney on retainer. Takes an address + a question ("can I add an ADU?" / "can I split this lot?" / "can I add a second story?" / "is this rentable as STR?") and returns a clear allowed / conditional / not-allowed verdict with the relevant code section, the next-step procedure (over-the-counter permit / planning hearing / variance / no path), and an estimated cost + timeline to get to entitled. Differs from Land Use AI Attorney (LAW-LANDUSE-001) which is the lawyer-facing professional worker; this is the consumer-facing simplifier.

## Who uses it

**Operators** (the tenant):
- Homeowners thinking about a renovation, addition, ADU, or rental conversion
- Small-volume builders + flippers scoping a project before purchase
- First-time buyers in due diligence wanting to know "what could I do with this place"
- Real estate agents fielding "can my client build…" questions

**End-users:**
- The same — this is a single-payer consumer worker; no entitlement layer needed in v1.

## What success looks like

1. From address + plain-English question, a verdict returns in under 20 seconds
2. The verdict cites the relevant zoning code section (e.g., "Sublette County LDR §4.2.3") AND the citation is a live, retrievable URL — never a model-recalled citation (EH-01)
3. Conditional outcomes ("you can do this if you get a variance") include the next-step procedure, where to file, and an honest estimate range for cost + timeline (gap-declared per EH-04 when unknown)
4. Plain-English language scored at 7th-grade reading level — no legalese unless directly quoting code
5. Every verdict is anchored to the property's DTC logbook so a homeowner can show the answer to a contractor / spouse / county clerk three months later and prove what they relied on at decision time

## What this worker is NOT

- **NOT a substitute for a land use attorney.** Consumer surfaces every verdict with a "this is general guidance based on public code — for a binding determination get a land use attorney" banner.
- **NOT a permit application worker.** Surfaces the next-step procedure but does not auto-file permits. The citizen-side permitting worker (PERMIT-001-CITIZEN, queued task #422) handles that.
- **NOT a feasibility study.** "Can I build it?" yes; "should I build it from a market / financial standpoint?" → FEASIBILITY-001 handles that.
- **NOT LAW-LANDUSE-001.** That's the lawyer-grade opinion product for paid practitioners. This is the homeowner-grade simplifier.

## Why this dovetails with the SOCIII platform

| Need | Platform capability |
|---|---|
| Zoning code + permitted uses | ATTOM Zoning API + county code GIS (substrate `services/data/zoning.js`) |
| Live code-section citations (no model recall) | EH-01 / EH-02 / EH-03 + URL retrieval + hash |
| Parcel context | Accepts parcel-bundle/v1 from SITE-RECON-001 or pulls fresh |
| Audit-anchored verdict | PLAT-008 anchor — homeowner can prove what code said at decision time |
| Handoff to lawyer when stakes rise | Emits legal-question-bundle/v1 — LAW-LANDUSE-001 accepts |
| Handoff to permit filer | Emits permit-intent-bundle/v1 — PERMIT-001-CITIZEN accepts |
| Visual floor — homeowner-friendly | Trump Rule — RE consumer visual floor = MLS / Zillow-grade hero + Lego-instruction-grade procedure cards |

## Catalog declaration

```
{
  "id": "ZONING-001",
  "slug": "zoning-001",
  "vertical": "real-estate-professional",
  "pricing_tier": 0,
  "creator": "sean-combs",
  "creatorRevenueSharePct": 20,
  "emits": [
    "zoning-verdict-bundle/v1",
    "legal-question-bundle/v1",
    "permit-intent-bundle/v1"
  ],
  "accepts": ["parcel-bundle/v1"],
  "constraintRaasSources": [
    "attom:zoning",
    "attom:permits",
    "county_code_lookup",
    "county_gis_overlay"
  ]
}
```

## Canvas tabs

1. **Verdict Hero** (default) — three-color verdict (GREEN allowed / YELLOW conditional / RED not allowed) + headline plain-English answer + headline citation. Visual floor: Zillow-listing-grade hero.
2. **Code Sections** — every cited code section as a tile: section heading + plain-language summary + verbatim quoted text + live URL.
3. **Next Steps** — procedure cards for conditional outcomes: over-the-counter permit / planning hearing / variance, with cost + timeline ranges.
4. **What's Next on SOCIII** — handoff cards: "Get a lawyer's opinion" (LAW-LANDUSE-001) / "File the permit" (PERMIT-001-CITIZEN) / "Check feasibility" (FEASIBILITY-001).
5. **Audit Receipt** — DTC logbook entry: who asked what when, citations pulled at that moment, retained hash.

Canvas mockup REQUIRED per Round 6 of /creators/journey before Code build starts — drop at `creators/sean-combs/zoning-001/canvas-mockup.png` (+ tab variants).

## Audit-anchored events

- `zoning_question_asked` — anchors the question + parcel + ATTOM pull cost
- `zoning_verdict_returned` — anchors verdict + every cited code section + URL + retrieved hash
- `zoning_handoff_to_lawyer` — emitted when user clicks "get a lawyer's opinion" → LAW-LANDUSE-001
- `zoning_handoff_to_permitting` — emitted when user clicks "file the permit" → PERMIT-001-CITIZEN

## Open questions for reviewer

1. **Jurisdictional coverage** — ATTOM Zoning API coverage is uneven. For v1 limit to US states where ATTOM has full coverage + flag "limited coverage" elsewhere. Sublette WY + Mono CA + Maui HI must be in v1.
2. **STR / Airbnb question class** — short-term rental rules change frequently and are often city-specific overlays not in ATTOM. Defer to v1.1 with a "STR rules change frequently — verify with your city clerk" gap declaration in v1.
3. **HOA / CCRs** — private restrictions can override allowed-by-zoning. ATTOM has partial coverage. Surface as a separate flag in the Verdict Hero ("Zoning allows X — HOA may not. Check your CCRs.").
4. **Variance-likelihood estimate** — should the conditional verdict include a "likelihood you'll get the variance based on similar applications" estimate? Defer v1; would require a dataset we don't have yet.

## Cross-references

- `docs/CODEX-S52.43-Platform-RAAS-Invariants.md` — invariants this worker inherits
- `docs/specs/CODEX-S52.19-ATTOM-Integration-and-Title-Abstract-Report.md` — ATTOM Zoning API + Permits API
- `~/Downloads/LAW-LANDUSE-001_Worker_Spec_v3.md` — sibling lawyer-grade worker; this consumer surface emits legal-question-bundle/v1 that LAW-LANDUSE-001 accepts
- `contracts/bundle-shapes/parcel-bundle.v1.json` — accepted bundle shape (TO BE WRITTEN)
- `contracts/bundle-shapes/zoning-verdict-bundle.v1.json` — emitted bundle shape (TO BE WRITTEN)
- Reference workers: `creators/sean-combs/site-recon-001/` (upstream parcel emitter); `creators/sean-combs/title-abstract-001/` (sibling RE worker)

## Platform RAAS Invariants (INHERITS CODEX S52.43)

> Do not modify. Inherits Epistemic Honesty Gate (EH-01..07), CAS Color Protocol, Active Persona Gate (AP-01..06), Reagan Rule, Britney Rule, Trump Rule. Pricing: FREE; users pay only for data pulls at substrate-locked cost + approved markup. Composition: declares emits/accepts per accepts-contract substrate.
