# CODEX 96 — PETRA Wearable Use: Property Inspection, MX, Landscaping, and Engineering Documentation

**Status:** SPEC — no build started, companion doc to CODEX 87.
**Suite:** Real Estate / Property (PETRA) — **scope confirmed by Sean 2026-09-19: PETRA = Property, broadly, not title-narrow.** Title/closing inspection is a real, valid use case but a secondary one; the primary driver for this doc is property MX, landscaping, and maintenance documentation. This resolves the scope-boundary question raised after red-team review (was: does PETRA's mandate actually extend this broadly, or is this scope drift via "the architecture makes it easy to add" — answer: no drift, deliberate call).
**Date:** 2026-09-19
**Trigger:** Same wearable-hardware conversation as CODEX 87 (RealWear arrived, LFN med crew reaction). Sean asked to extend the "one capture pipeline, many front ends" architecture to PETRA, then explicitly confirmed the center of gravity is property MX/landscaping/maintenance documentation, not title/closing inspection — driven by two real trends: insurers increasingly requiring documented proof of repairs/installations before honoring claims or renewing coverage, and an aging trades workforce where hands-free guided procedure + captured proof has real training and knowledge-preservation value.
**Relationship to other docs:** Reuses CODEX 87's architecture (capture → CODEX reasoning against the domain's authoritative source → RAAS rules validate → structured, auditable output) rather than re-deriving it — split into its own doc because PETRA's actual scope (inspection + MX + landscaping + engineering) is substantial enough to deserve its own space, not because the underlying pipeline differs. Builds directly on **CODEX 90** (Real-Estate Property Operations: Maintenance, Inspection, and Walkthrough App Scoping, 2026-09-16), which already did real scoping work relevant here — cited throughout, not re-audited from scratch this pass.

**Real dependency stack before Stage 1 can run at all, stated plainly after red-team review so it doesn't get lost the next time this doc is referenced:** (1) CODEX 87's own capture-ingestion pipeline — not yet estimated, let alone built; (2) the Storage-routing fix in §1 below — unbuilt; (3) which of CODEX 90's three disconnected maintenance implementations to consolidate onto — open, inherited from CODEX 90; (4) CODEX 90's RBAC gap — open, inherited. This is a spec sitting four layers on top of things that don't exist yet, not a near-term build.

---

## 1. Executive Summary

- **This is a new capture front-end onto two pipelines that substantially already exist on paper.** CODEX 87 already proved the "one pipeline, many front ends" architecture (capture → reasoning → RAAS → structured output) across aviation and nursing. CODEX 90 already scoped property inspection/maintenance in real depth (actors, schema, the record-of-record question). RealWear becomes the new capture surface for both — this doc's job is to say what's specific to PETRA, not restate either.
- **CODEX 90 already found a real gap that becomes load-bearing the moment a wearable is involved.** The only shipped photo-intake pattern in this codebase (aviation's squawk-photo flow) sends images inline as base64 to Claude's vision and never persists them to Storage — fine for a squawk (a text description is enough), wrong here. A buyer walkthrough, an inspector report, or an insurance-documentation photo needs the actual photo kept as durable evidence, not just an AI-generated summary. **Do not build wearable capture for PETRA on top of the aviation pattern — route through the generic Storage service CODEX 90 already identified as the correct target.** This is the single most important technical carry-over from CODEX 90 into this doc.
- **RAAS tiering for this front mirrors aviation's exactly, per Sean's own framing:** industry/regulatory/insurer standard = Tier 1, the specific title company's or property manager's own checklist = Tier 2. Concretely: ASHI/InterNACHI inspection standards or state disclosure requirements, and increasingly specific insurer documentation requirements for repairs/installations, sit at Tier 1; a given title company's or property management company's own due-diligence checklist sits at Tier 2. No new architecture — this is the same shape as AFM/POH (Tier 1) + operator checklist (Tier 2) in CODEX 87.
- **Insurance documentation is the sharpest, most concrete driver here, worth treating as the lead wedge rather than a secondary benefit.** Insurers increasingly require photo/video proof that a repair or installation was done to code before they'll pay a claim or renew coverage — roofing, electrical, plumbing, water heaters — and in fire-prone regions specifically, defensible-space/vegetation-management documentation is becoming an underwriting requirement, not a nice-to-have. That makes the Tier 1 ruleset genuinely concrete (what does the insurer require to pay a claim), not just "industry best practice" — a sharper, more monetizable pain point than most compliance documentation, and a real reason a property owner or manager would pay for this independent of the title/closing use case.
- **Aging trades workforce is a second, distinct driver, not the same claim restated.** A wearable that guides a less-experienced tech through a hands-free checklist while capturing proof of the work has training/onboarding value (build competence faster) and knowledge-preservation value (capture what an experienced, often close-to-retiring tradesperson knows before it leaves with them) — matches the same training-adoption logic CODEX 87's 2026-09-19 revision applied to aviation/MX.
- **Sequencing should follow CODEX 87's revised training-first principle, not CODEX 90's original live-actor assumptions.** CODEX 90 named real actors (tenant, field technician, MX director, REIT/owner, prospective buyer/lessor, building inspector) without distinguishing training/simulation from live use. This doc's recommendation: start with an actual training/simulation-style low-stakes capture (a real property walkthrough on a property NOT mid-transaction, or a training exercise for a new inspector/tech) before running this on a live closing file or a live insurance claim.

---

## 2. What Already Exists to Build On (per CODEX 90, cited not re-audited)

- **Three disconnected maintenance implementations already exist**, none talking to each other — a top-level API-key-gated `maintenance` collection nothing calls, a richer `tenants/{id}/maintenanceTickets` subcollection nothing reads, and three fully-mocked React canvas components with non-functional buttons. Building real wearable capture means picking one of these to consolidate onto, not adding a fourth.
- **Zero capabilities exist today** in `contracts/capabilities.json` for real estate, property management, maintenance, rent, lease, or inspection. Aviation's MX capability set (`aviation.log_squawk_v1`, `aviation.add_maintenance_item_v1`, the propose-then-confirm photo-commit pattern) is the template CODEX 90 already recommended replicating.
- **CODEX 90's photo/video architecture finding is the one to build on:** use the generic Storage service (`functions/functions/lib/storage/index.js`), not aviation's inline-base64-to-vision pattern. CODEX 90's proposed schema (Storage-URL arrays, from CODEX 27) assumed this correctly — it just was never wired to it.
- **CODEX 90's actor list already covers most of what this doc needs:** tenant, field technician, MX director, REIT/owner, prospective buyer/lessor, building inspector. This doc adds landscaping/vegetation-management crews and engineering/structural assessors as two further actors CODEX 90 didn't name, both driven by the insurance-documentation angle specifically.
- **CODEX 90's unresolved RBAC gap also applies here directly** — the flat `admin`/`member`/`viewer` role model can't express a GM → MX Director → Field Technician hierarchy, and CODEX 90 already flagged this as shared platform infrastructure work, not vertical-scoped. Wearable capture for a landscaping crew or an engineering assessor is one more consumer of that same unbuilt permission model, not a new problem.

---

## 3. New Use Cases This Doc Adds

**Property inspection (general):**
- **Pre-closing final walkthrough** — buyer confirms agreed repairs were actually done, hands-free capture ties directly into the closing file. This is the escrow-officer wearable idea from earlier in this vertical's build discussion, just with RealWear instead of a phone.
- **Inspector reports** — a home inspector narrates findings room by room, photos auto-tagged to each flagged item, structured report instead of a paper form.
- **Title-relevant condition issues** — anything visible on a walkthrough that could affect insurability or trigger a disclosure requirement gets captured in the same pass as the general inspection, instead of being a separate step someone has to remember.

**Property MX, landscaping, and engineering (new front, this doc's specific addition):**
- **Repair/installation documentation for insurance** — plumbing, electrical, roofing, HVAC, water heater work narrated and photographed as it's performed, producing a structured record proving code-compliant completion. This is the real, monetizable wedge — a property owner/manager pays for this specifically because it protects a future claim, not because it's generally tidy recordkeeping.
- **Landscaping/vegetation management** — defensible-space documentation in fire-prone regions (a real, growing underwriting requirement), plus general maintenance/liability documentation (tree risk, slip-fall-relevant upkeep).
- **Engineering/structural documentation** — an assessment or an installation done to engineering spec, captured and tied to the property record rather than living in a separate consultant's file nobody can find later.
- **Training/knowledge-preservation** — a less-experienced tech follows a HUD-guided procedure; an experienced tech's narrated walkthrough of a job becomes a captured training asset before that knowledge leaves with them.

---

## 4. RAAS Tiering (mirrors CODEX 87's aviation shape exactly)

| Tier | Aviation (CODEX 87) | PETRA (this doc) |
|---|---|---|
| Tier 1 — regulatory/industry baseline | AFM/POH-approved checklist | ASHI/InterNACHI inspection standards, state disclosure requirements, insurer documentation requirements for repairs/installations, local building code |
| Tier 2 — operator/company policy | Operator-specific checklist, turbine-aircraft flows | Title company's or property manager's own due-diligence checklist |
| Tier 3 — individual preference | (not separately named in CODEX 87) | Individual inspector's/agent's own preference, where applicable |

No new RAAS architecture required — this is real content to encode per domain, using the same four-tier structure already proven elsewhere in the platform.

---

## 5. Sequencing Recommendation

Following CODEX 87's 2026-09-19 training-first reframing rather than CODEX 90's original live-actor-only framing:

1. **Stage 1 — low-stakes / training-style capture.** A real property walkthrough NOT mid-transaction (e.g., a property already owned, or a training exercise for a new inspector/tech), proving the capture → Storage → structured-output pipeline end to end before it touches a live closing file or a live insurance claim. Reuses CODEX 87's capture-ingestion infrastructure (§4 step 1 of that doc) — no new capture pipeline to build, just a new domain ruleset and the Storage-routing fix from §1 above.
2. **Stage 2 — live use, gated on Stage 1 proving out.** Live pre-closing walkthroughs, live inspector reports, live insurance-documentation capture on real repair/installation work. Each of these should get its own real success criteria and go/no-go, matching CODEX 87's taxonomy (hardware fit / pipeline gap / task mismatch / user resistance / other) rather than a single blanket "PETRA wearables work" verdict.

---

## 6. Open Decisions

1. **Storage-routing fix is a real prerequisite, not optional polish.** Per §1, building wearable capture for PETRA on the aviation photo pattern would produce AI summaries with no durable photo evidence — actively wrong for insurance documentation and inspector reports specifically. This needs to happen before Stage 1, not be retrofitted after.
2. **Which of CODEX 90's three disconnected maintenance implementations does this consolidate onto?** CODEX 90 already posed this question for the property-ops app generally; this doc inherits it rather than re-deciding it independently.
3. **Who is the actual first Stage-1 test partner?** Attorneys Title (the real, signed PETRA customer) is the obvious candidate for the inspection/walkthrough use case; the MX/landscaping/engineering insurance-documentation use case may have a different natural first partner (a property management company, or Sean's own network) — not yet identified.
4. **Elevated after red-team review — this is bigger than a missing ruleset, it may break the Tier-1 assumption itself.** §4 claims insurer documentation requirements mirror AFM/POH or ASHI/InterNACHI as a clean Tier 1 baseline. They may not: AFM/POH and ASHI/InterNACHI are single, stable, public standards — insurer documentation requirements are contractual, often carrier-specific, and not uniformly public. "What Carrier X requires to pay a roofing claim" may not be one encode-once-apply-everywhere Tier 1 ruleset at all — it could be many carrier-specific variants, which breaks RAAS's core assumption for this front specifically. **Before any content gets encoded, confirm whether a single Tier 1 baseline genuinely exists here — don't just research the content assuming the structure already holds.** If it turns out to be carrier-specific, that's a materially different (and larger) scoping problem than "needs a research pass," and worth surfacing to Sean as its own decision before proceeding.
5. **CODEX 90's unresolved RBAC gap blocks the landscaping/engineering actors cleanly fitting the permission model** — same open item as CODEX 90 already named, not re-litigated here, just flagged as a shared dependency.
