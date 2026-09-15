# CODEX S52.75 — Insurance Worker Suite: Scope

**Status:** Scoping/queue only (2026-09-15), per Sean's explicit instruction — *"We don't need to build it, I just want to make sure we codex it and put it in the queue."* No code written, no roadmap commitment made. Grounded in direct code reads (cited below), not assumption.

---

## The first finding matters more than anything else in this doc: this isn't a blank-slate idea

Before scoping "should SOCIII have an insurance worker," it's worth being direct: **a real insurance-compliance worker already exists in this codebase**, further along than a first pass would suggest, and any "new idea" needs to be positioned against it rather than duplicate it.

Checked directly:
- **`functions/functions/raas/rulesets/insurance_risk_v0.json`** — a genuine, well-scoped RAAS ruleset for construction-subcontractor insurance compliance. Not boilerplate: it encodes real hard-stops (missing workers' comp, an active sub with an expired COI, GC not named as additional insured, no builder's risk policy before construction starts) and real soft-flags (EMR >1.25, COI expiring within 30 days, coverage below project minimum, missing waiver of subrogation, missing pollution/professional liability for the relevant scopes). This is correct, real domain knowledge for a GC's insurance/risk manager, not a placeholder.
- **`functions/functions/helpers/workerSync.js`** registers it as `"W-025": "insurance-risk"` — a real catalog slug, not just a ruleset file sitting alone.
- **Four real document templates already built** in `documentEngine/templates/registry.js` and their PDF/XLSX generators: `ir-insurance-matrix` (master subcontractor coverage/expiration matrix), `ir-coi-deficiency` (a real, fully-worded COI Deficiency Notice), `ir-lender-report` (lender-facing insurance compliance report), `ir-risk-summary`.
- **Real cross-worker event routing**: `real-estate-development.json`'s catalog shows the Draw Worker (W-023) and Bid & Procurement worker both explicitly route "Insurance verification needed before draw release" events to W-025 — i.e., W-025 is meant to be a hard gate on releasing a construction draw, not a passive tracker. `App.jsx` line 1016 has real explanatory copy about this exact flow ("When a contract requires insurance, the Insurance Worker (W-025) picks up the requirement... When a mechanics lien deadline approaches, the Compliance Tracker (W-047) alerts").
- **Already referenced in a second vertical**: `functions/functions/services/alex/catalogs/solar-energy.json` also references W-025 — so this isn't purely a construction-only concept in the existing code, it's already been reused once.

**What's NOT confirmed real (checked, not found):** no seed script anywhere under `functions/functions/scripts/` populates `subcontractor_registry` or `insurance_policies` (the ruleset's own `required_inputs`) for any real or demo tenant, and no `digitalWorkers` catalog doc marks `insurance-risk` as `live`. This matches a pattern this codebase has hit before (the SKYE Pilot EFB orphaned-subsystem story, the DPP self-serve gap): **real rules + real documents + real routing, but no populated data path and likely no live demo today.** I did not find evidence either way of a chat-callable persona actually answering as this worker — that needs a live check, not a code-only one, before assuming it's demoable.

---

## What this means for "a new idea for a worker suite: Insurance"

Two different things could be meant here, and they lead to very different scope:

**Option A — Sean means: finish what's already started.** W-025 is real but orphaned (rules + docs + routing exist; no live data, likely no working demo). Under the existing one-persona-per-suite architecture ([[project_of_for_smart_people_naming_architecture]]), construction/RE-development already belongs to **Petra** ("every title/escrow/RE/mortgage/appraisal/construction worker — one identity"). If the idea stays scoped to construction/development insurance compliance, **it doesn't need a new persona at all** — it needs W-025 wired to real data (a `subcontractorRegistry`/`insurancePolicies` data model, a seed/import path, a live canvas) under Petra, the same way MX/Dispatch/CoPilot all answer as Skye. This is the cheaper, faster path — most of the hard domain-logic work (the ruleset itself) is already done.

**Option B — Sean means something bigger: a genuinely new, cross-vertical suite.** The RAAS/reconciliation thesis ([[project_skye_raas_audit_trail_differentiator]]) suggests insurance compliance isn't inherently a construction-only problem — SOCIII already touches at least three places where "does my own record of coverage match what an external system of record requires/believes" is a real, live pain point:
- **Skye/aviation**: does a Part 135 operator have current hull and liability coverage meeting FAA OpSpec and insurer requirements, and can SOCIII's own audit trail prove it automatically rather than the DO/chief pilot tracking it in a spreadsheet? (Sean's own real-world context: he just lived a version of this exact reconciliation problem with his IACRA/logbook weekend — a different document, same shape of problem.)
- **Petra/construction** (W-025, above): GC ↔ subcontractor COI compliance, already real logic, just not wired to live data.
- **Elara/DPP**: EU product-liability coverage is a real, if not yet explicitly modeled, adjacent requirement for a company placing regulated products into the EU market.

If Sean's "new idea" is this broader, cross-vertical version, it genuinely deserves its own suite identity rather than living inside Petra — the whole point of the reconciliation thesis is that it's a horizontal capability, not one vertical's feature.

**This doc doesn't resolve which one Sean means — that's the first open question below, and it changes the recommendation materially.** What follows assumes Option B (new suite), since that's the literal reading of "a new idea for a worker suite," while flagging Option A as the cheaper alternative throughout.

---

## Persona name

**Recommendation: Vera.** Checked against the existing roster (Skye/Petra/Elara/Hannah/Max/Jordan/Sage/Ivy/Reed, per [[project_of_for_smart_people_naming_architecture]]) — no collision, and none of the existing back-of-house names (Max=Accounting, Jordan=HR, Sage=Contacts, Ivy=Marketing, Reed=IR) fit an insurance angle; all are already spoken for by an unrelated function. "Vera" is a short, human first name consistent with the existing naming spirit, with a quiet, non-cheesy resonance ("verify"/veritas) appropriate for a compliance-verification worker — not a pun that would read as a joke persona (the "OF for Smart People" ad-hook roster is a deliberately different, separate naming layer per that same memory doc; this is the real product-persona name, not a top-of-funnel gag character). Checked for collisions directly in `functions/functions/index.js`, `ChatPanel.jsx`, and `campaignRouting.js` — no existing use of "Vera" anywhere in the codebase.

---

## Why this fits the RAAS/reconciliation thesis specifically (not just "another compliance checklist")

The generic insurance-compliance pain point, real and well-documented in the industry, is exactly the shape [[project_skye_raas_audit_trail_differentiator]] already identified: **multiple systems of record that don't agree, discovered too late.** Concretely:
- A GC's own spreadsheet says a sub is covered; the sub's actual carrier lapsed the policy three weeks ago; nobody finds out until a claim happens on site and the certificate turns out to be stale — the single most common real insurance-compliance failure in construction risk management, which is precisely what `insurance_risk_v0.json`'s `expired_coi_active_sub` hard-stop already encodes.
- A Part 135 operator's insurance binder says one thing; the FAA OpSpec / lender covenant requires another; the mismatch surfaces during an audit or, worse, after an incident — structurally identical to Sean's own IACRA-weekend story, just a different document pair.
- The reconciliation isn't a one-time check, it's continuous — coverage lapses, projects add scope that changes required limits, new subs mobilize. A worker that can be asked "are we covered right now, provably" at any moment, backed by the same append-only, cryptographically-anchored audit trail as the rest of the platform, is a materially different product than a static spreadsheet or a yearly manual audit — and is the same "not a data viewer, an active reconciliation engine" bar the differentiator memo sets.

---

## Compliant vs. magic pass

Following the same 4-level framework already used in this week's SKYE/ForeFlight gap analysis ([[project_skye_foreflight_gap_doc_sep2026]]):

1. **Existence** — 🟡 partial today. Real rules, real documents, real routing exist (W-025). No live data path, no confirmed working chat persona. Not zero, not real either.
2. **Fidelity** — the rules themselves are genuinely correct for the construction-COI use case (checked against real industry practice: workers' comp as an absolute requirement, additional-insured endorsements, builder's risk, EMR thresholds, waiver of subrogation — this is not generic filler). Fidelity for any OTHER vertical (aviation hull/liability, DPP product-liability) is currently **zero** — nothing in the ruleset covers those; a cross-vertical suite would need genuinely new rulesets per vertical, not a relabeling of the construction one.
3. **Utility — compliant gate.** "Compliant" here means: reliably, correctly answers "is this specific policy/sub/project actually in compliance right now" against real, live-synced data (not a stale upload), with the hard-stops actually blocking the action they're supposed to block (e.g., actually preventing a draw release, not just displaying a warning banner someone can ignore). Nothing in this codebase today demonstrates that end-to-end — this is the real bar before any magic conversation is worth having, same as the Preflight-tab fabricated-FRAT lesson from this same session: a compliance tool that's wrong or unenforced is worse than one that doesn't exist yet.
4. **Magic — only evaluated once #3 is real.** A genuinely magic version doesn't wait to be asked — it's the thing that catches "your subcontractor's GL policy lapses in 12 days and they're scheduled to pour foundation on day 10" *before* anyone asks, the same way SKYE's aspiration is to catch an internally-contradictory logbook entry before it reaches a government form. For a broker or risk manager, the "show a colleague unprompted" moment is almost certainly: SOCIII proactively producing the lender-required compliance report the night before it's due, already reconciled, instead of someone manually chasing five subs for updated COIs the week of a lender audit.

---

## Explicit non-scope for right now

This is a queue entry, not a commitment. It is **not** prioritized ahead of, or instead of, the currently active work: DPP market-readiness ([[project_compliance_in_a_box_dpp]]), the SKYE gap-closure fixes from this week's review, or the investor/VC push that's this month's stated top priority. Nothing in this doc should be read as a recommendation to start building before Sean makes that call explicitly.

---

## Open questions for Sean

1. **Option A or B above** — is this idea "finish and demo-harden the existing W-025 construction insurance worker under Petra" (cheaper, most of the domain logic already exists), or "a genuinely new, cross-vertical suite" that also reaches into Skye/aviation and Elara/DPP (bigger, needs new rulesets per vertical, but matches the real differentiator thesis more fully)? This materially changes both scope and whether a new persona is even warranted.
2. **Is there a real anchor customer or relationship**, the way Elise/Traitly anchors DPP and your own LFN Part 135 role anchors SKYE — an actual GC, broker, MGA, or Part 135 operator who's felt this pain and would sanity-check the build, rather than building speculatively? Construction insurance compliance in particular has enough regulatory/contractual nuance (state-specific WC requirements, ISO endorsement forms, lender-specific minimums) that a real practitioner relationship would materially de-risk this the way Elise's real feedback did for DPP.
3. **If cross-vertical (Option B): which vertical first?** Aviation hull/liability (extends Skye, and you'd be your own first real test case via LFN), construction COI (extends Petra, cheapest since W-025 already exists), or something not yet in SOCIII's portfolio at all (e.g., a standalone product for insurance brokers/MGAs themselves as the primary customer, analogous to how Hannah serves nursing educators rather than students)?
4. **Is there a specific regulatory/industry-standard framework this should be built against**, the way DPP is explicitly built against EU Battery Regulation 2023/1542? (For construction: state WC statutes + standard ISO CG 20 10/20 37 additional-insured endorsement forms would be the natural equivalent; for aviation: FAA OpSpec insurance requirements + typical aviation hull/liability policy structures.)
5. **Data source reality check**: who/what would actually feed `insurance_policies` and `subcontractor_registry` (or their aviation/DPP equivalents) with live data — manual upload, a COI-tracking integration (e.g., Certificate management platforms like myCOI/Certificial that GCs already use), a broker portal connection, or OCR off uploaded PDF certificates? This is the same "who actually writes the real data" question that surfaced as the core gap in both the SKYE Preflight-tab and DPP self-serve reviews this week, and it determines almost all of the real build cost.
