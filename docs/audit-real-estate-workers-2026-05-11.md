# Real Estate Vertical — Complete Worker Audit

**Date:** 2026-05-11
**Owner:** Sean (review) · Claude (audit)
**Scope:** All 65 RE workers across RE Development + RE Professional catalogs. Plus gap analysis against Sean's launch-readiness expectations.

---

## TL;DR

**What exists:** 52 RE Development workers (W-001 → W-052, dev/investor heavy) + 13 RE Professional workers (12 ESC + RES-001 Salesperson). The DEVELOPMENT side is comprehensive; the **transactional sales/buy side is thin** with most of the workflow folded into a single overloaded RES-001 worker.

**What's missing (Sean called out + audit found):**
1. **Showing Scheduling** — no standalone worker. Showings live inside RES-001 implicitly, no dedicated capability.
2. **Property Inspection (mobile / wearable)** — no worker. Sean's spec: take a phone/wearable through a property, capture notes, photos (license-scoped), measurements, defect logging.
3. **County Land Title On-Chain** — **THE FOUNDING THESIS WORKER.** Not built. Helps a county/state move land + property title records on-chain, gives title holders an interface to manage and conduct things like tax payments. RE + GovTech crossover.
4. **DPP (Digital Product Passport) worker** — EU protocol, blockchain-anchored asset records. Architectural sibling of the County On-Chain worker. Same DTC + Logbook substrate, different jurisdiction + regulatory framework.
5. **Listing Intake / MLS-ready package** — folded into RES-001, should likely be standalone given how distinct the workflow is.
6. **Buyer Representation specifically** — folded into RES-001, dual mandate weakens both.

**Quality issues:**
- **Canvas tabs are generic defaults** (Overview / Activity / Resources) — auto-generated, not bespoke for workflow. Sean wanted canvas-with-chat to be working — structurally it is, but content is shallow.
- **Location-first UX rule not implemented** — new rule (memory `feedback_re_location_first_ux.md` 2026-05-11). Every RE output should lead with a Google Maps link; today none do.

**Strategic verdict:** RE vertical is launch-able as-is for Development + Title/Escrow audiences. For Sales/Buy/Lease and County/Government audiences, we need at minimum 3 new workers and a canvas-tab quality pass before serious dogfood with brokers/agents/counties.

---

## Inventory — what exists today

### Real Estate Development (52 workers, W-001 to W-052)

| ID | Name | Phase | Suite |
|---|---|---|---|
| W-001 | Market Research & Demographics Analyst | 1 — Site Selection | Investment |
| W-002 | **Real Estate Analyst + Investor** (renamed from CRE Deal Analyst) | 1 | Investment |
| W-003 | Site Due Diligence | 1 | Investment |
| W-030 | Appraisal & Valuation Review | 1 | Investment |
| W-004 | Land Use & Entitlement | 2 — Design & Entitlement | Entitlement |
| W-005 | Architecture & Design Review | 2 | Design |
| W-006 | Engineering Review | 2 | Design |
| W-007 | Environmental & Cultural Review | 2 | Compliance |
| W-008 | Energy & Sustainability | 2 | Compliance |
| W-009 | Accessibility & Fair Housing | 2 | Compliance |
| W-010 | Government Relations & Public Hearing | 2 | Entitlement |
| W-011 | Fire & Life Safety | 2 | Compliance |
| W-012 | Permit Submission & Tracking | 3 — Permitting | Permitting |
| W-013 | Mortgage & Senior Debt | 4 — Financing | Finance |
| W-014 | Mezzanine & Preferred Equity | 4 | Finance |
| W-015 | Construction Lending | 4 | Finance |
| W-016 | Capital Stack Optimizer | 4 | Finance |
| W-017 | Tax Credit & Incentive | 4 | Finance |
| W-018 | Crowdfunding & Reg D | 4 | Finance |
| W-019 | Investor Relations | 4 | Finance |
| W-020 | Opportunity Zone | 4 | Finance |
| W-021 | Construction Manager | 5 — Construction | Construction |
| W-022 | Bid & Procurement | 5 | Construction |
| W-023 | Construction Draw | 5 | Construction |
| W-024 | Labor & Staffing | 5 | Construction |
| W-025 | Insurance & Risk | 5 | Insurance |
| W-026 | Materials & Supply Chain | 5 | Construction |
| W-027 | Quality Control & Inspection | 5 | Construction |
| W-028 | Safety & OSHA | 5 | Construction |
| W-029 | MEP Coordination | 5 | Construction |
| W-031 | Lease-Up & Marketing | 6 — Stabilization | Operations |
| W-032 | Tenant Screening | 6 | Operations |
| W-033 | Property Management | 7 — Operations | Property Management |
| W-034 | Rent Roll & Revenue Management | 7 | Operations |
| W-035 | Maintenance & Work Order | 7 | Operations |
| W-036 | Utility Management | 7 | Operations |
| W-037 | HOA & Association Management | 7 | Property Management |
| W-038 | Warranty & Defect Management | 7 | Operations |
| W-039 | Accounting | 7 | Operations |
| W-040 | Tax & Assessment | 7 | Operations |
| W-041 | Vendor & Contract Management | 7 | Operations |
| W-051 | Investor Reporting & Distributions | 7 | Investment |
| W-052 | Debt Service & Loan Compliance | 7 | Finance |
| W-042 | Disposition Preparation | 8 — Disposition | Operations |
| W-043 | 1031 Exchange | 8 | Investment |
| W-050 | Disposition Marketing & Data Room | 8 | Investment |
| W-044 | Title & Escrow | 8 | Legal |
| W-045 | Legal & Contract | 8 | Legal |
| W-046 | Entity & Formation | 8 | Legal |
| W-047 | Compliance & Deadline Tracker | 8 | Compliance |
| W-048 | Alex — Chief of Staff | All | Platform |
| W-049 | Property Insurance & Risk | All | Insurance |

**Coverage:** development-side (institutional/multifamily) is very strong. Investment workflow is comprehensive. Construction + entitlement workflows complete.

### Real Estate Professional (13 workers)

| ID | Name | Suite |
|---|---|---|
| ESC-001 | The Escrow Locker | Escrow & Closing |
| ESC-002 | Wire Fraud Prevention | Escrow & Closing |
| ESC-003 | Title Search and Commitment | Title & Search |
| ESC-004 | Lien Clearance | Title & Search |
| ESC-005 | Disclosure Package | Escrow & Closing |
| ESC-006 | Closing Disclosure | Escrow & Closing |
| ESC-007 | FIRPTA and 1031 Exchange | Escrow & Closing |
| ESC-008 | Commission Reconciliation | Escrow & Closing |
| ESC-009 | HOA Estoppel | Escrow & Closing |
| ESC-010 | Status Portal | Operations |
| ESC-011 | Recording Monitor | Operations |
| ESC-012 | Alex Chief of Staff for Title and Escrow | Operations |
| RES-001 | Real Estate Salesperson | Sales |

**Coverage:** Title/Escrow workflow comprehensive. **Sales = ONE worker** (RES-001) that tries to do everything: buyer pipeline, listing pipeline, MLS matching, offer drafting, post-close. Overloaded.

---

## Workflow gap analysis (what's missing for a real launch)

### Sale-side workflow (residential)

**Sean's mental model:** list → market → show → offer → diligence → close → post-close

| Step | Worker today | Gap? |
|---|---|---|
| Listing intake (interview seller, gather facts, MLS-ready package) | RES-001 (folded in) | **Standalone "Listing Intake" worker needed** |
| Market/CMA + pricing | RES-001 (CMA-derived offer drafting only) + W-001 Market Research | Cleaner separation; pricing intelligence worker |
| Marketing (photos, video, social, web) | None RE-specific (relies on platform Marketing worker PLAT-003) | Acceptable — Marketing worker handles cross-vertical |
| **Showing scheduling** | None | **NEW WORKER NEEDED** (see below) |
| **Property inspection (mobile / wearable)** | None | **NEW WORKER NEEDED** (see below) |
| Offer drafting | RES-001 | OK in RES-001 |
| Due diligence period management | RES-001 contingency-deadline enforcement | OK |
| Closing (title/escrow) | ESC-001 through ESC-012 | Strong coverage |
| Post-close cadence (referrals, anniversary, repeat customer) | RES-001 mentions; thin | Light gap; can grow inside RES-001 |

### Buy-side workflow (residential)

| Step | Worker today | Gap? |
|---|---|---|
| Buyer intake + criteria | RES-001 (MLS matching) | OK but thin |
| Property search | RES-001 (MLS-derived) | OK |
| **Tour scheduling** | None | **Same gap as Showing Scheduling** |
| Offer drafting | RES-001 | OK |
| Inspection ordering + review | None RE-pro-specific (relies on third-party inspectors) | Inspection scheduling worker would feed this |
| Mortgage + lending | None RE-pro-specific (RE Dev W-013 is debt for developers, not consumers) | **Gap: Consumer Mortgage / Pre-Approval worker** |
| Closing + funding | ESC-001 through ESC-012 | OK |
| Post-close | RES-001 | OK |

### Lease-side workflow (residential, single-family rental)

| Step | Worker today | Gap? |
|---|---|---|
| Listing | W-031 Lease-Up & Marketing (skewed to development lease-up) | Acceptable but development-flavored |
| Tour / showing | None | Same Showing Scheduling gap |
| Application + screening | W-032 Tenant Screening | OK |
| Lease drafting + signing | None RE-pro-specific | **Gap: Residential Lease worker** |
| Move-in inspection + condition documentation | None | **Same Inspection gap** |
| Rent collection + maintenance | W-033 Property Management, W-035 Maintenance | OK for multifamily; thin for single-family rental |

### Title-transfer + on-chain (founding thesis)

This is where the platform's origin story lives — and the worker is **NOT BUILT**.

**Sean's vision:** Help a county or state completely move land and property title records on-chain, then give every title holder an interface (TitleApp AI) to access information, conduct tax payments, and trigger transfers.

**Existing substrate (already shipped):**
- DTC (Digital Title Certificate) chain anchor (CODEX 50.13 Step 6 — Crossmint integration)
- Hash anchor service (CODEX 50.13 Step 3)
- Audit-layer version pinning (CODEX 50.13 Step 4)
- DTC schema unified migration (Step 2)
- Per-tenant Vault for storing DTCs (Pillar 1)

**The substrate is there. The worker is not.** We have all the moving parts to support a county-level on-chain title program. Just no worker that orchestrates: ingest county records → mint DTCs per parcel → create a holder portal → handle tax payments and transfers → produce regulator-facing reports.

**Recommendation:** stand up `RES-002 County Land Title On-Chain` as the next worker after Showing Scheduling. Suite: **Sales** in RE Pro catalog, plus cross-registered in **Recording Services** suite under Government. This worker IS the founding thesis productized.

### DPP (Digital Product Passport) — EU sibling

**Sean's vision:** A worker that follows the EU DPP protocol (Regulation 2024/1781 and successors) for issuing blockchain/DPP records for assets — same DTC + Logbook substrate, different regulatory framework + audience (manufacturers, importers, retailers in EU).

**Same architecture as County On-Chain:** ingest asset records → mint per-asset records → holder portal → produce regulator-facing reports. Just substituting county for EU regulator and parcel for product.

**Recommendation:** stand up `EU-DPP-001 Digital Product Passport` worker. Suite: **Compliance** in a new EU vertical OR cross-register in Government + RE Professional. Either way, share the substrate with the County Land Title worker so we're not duplicating chain-anchor logic.

---

## Specific new workers required

### #1 — `RES-002 Showing Scheduling` (SOFT-LAUNCH CRITICAL)

**Capability:**
- Multi-property showing schedule for buyer's day-of touring (4-6 properties optimally routed)
- Single-property showing slot management for listing agent (calendar slots, instant-booking link, confirmation flow)
- Conflict detection (between agent calendar, listing agent's available slots, buyer's availability)
- Driving directions between properties (Google Maps integration)
- Automated reminders (24hr, 1hr, day-of)
- Post-showing follow-up cadence (feedback request, next steps)

**RAAS modules:** generic real-estate practice rules + state-specific licensing rules (showing must be conducted by licensed agent in most states)

**Pricing:** $29/mo (functional utility worker)

**Sean's "showing + inspection on phone/wearable" idea fits HERE** as one of the canvas tabs — see RES-003 below.

### #2 — `RES-003 Property Inspection (Mobile + Wearable)` (LAUNCH-WEEK CRITICAL)

**Capability:**
- Mobile-first capture: audio notes during walkthrough, geo-stamped photo capture (license-scoped — agent's own photos, NOT third-party MLS imagery), measurement via phone LiDAR (newer iPhones), live transcription
- Wearable integration: Apple Watch / Meta Ray-Bans / future hardware — hands-free voice notes, gesture-triggered photo capture
- Structured defect log: room-by-room walk, defect categories (cosmetic, mechanical, structural, environmental), severity rating
- Report generation: post-walk PDF with photos + notes + map link + recommended repairs
- Audit trail anchored to DTC (the property's logbook)

**This is the "showing + phone/wearable inspection" Sean called out.** It's most useful for:
- Buyer's agent doing pre-offer property assessment
- Listing agent doing pre-listing condition documentation
- Property manager doing move-in / move-out inspection
- Insurance / claims documentation

**RAAS modules:** generic RE rules + privacy rules (no photos of people without consent, no recording in California without 2-party consent)

**Pricing:** $49/mo (advanced utility)

### #3 — `RES-004 County Land Title On-Chain` (POST-LAUNCH CODEX-SIZED)

**Capability:**
- Ingest county recorder records (deeds, mortgages, liens, easements) at bulk import or live API integration
- For each parcel: mint a DTC anchored on the chain
- Per-parcel logbook with every recorded event from county → DTC
- Holder portal: every property owner gets a TitleApp AI account scoped to their parcel(s), can view chain, initiate transfers, pay property tax via integrated payment
- County administrator dashboard: monitor health, audit trail, jurisdictional reports
- Regulator-facing reports: defensibility under state recording laws

**RAAS modules:** state-specific recording requirements (we'd need to author per-state, similar to securities blue-sky model)

**Pricing:** Enterprise — county-level licensing. This is the foundational TitleApp thesis productized.

**Strategic note:** the substrate exists (DTC + chain anchor + hash anchor + Vault). This worker is THE flagship deliverable for any government RFP TitleApp AI wins. Build is ~4-6 weeks of focused work to ship a real reference implementation.

### #4 — `EU-DPP-001 Digital Product Passport` (POST-LAUNCH CODEX-SIZED)

**Same architecture as #3, EU-DPP regulatory framework.**

Strategic note: EU DPP is a regulatory requirement landing 2026-2030 across textiles, electronics, batteries, construction products. Manufacturers MUST publish DPP records. TitleApp AI's RAAS + DTC + audit substrate is a near-perfect fit. This is a massive parallel market to county-level title.

**Pricing:** Enterprise — manufacturer / importer licensing.

### #5 — Optional but desirable

- **RES-005 Open House Manager** — sign-ins, follow-up, no-show analysis. ($29/mo)
- **RES-006 Consumer Mortgage Pre-Approval** — borrower fitness, document gathering, regulatory pre-screen. ($29/mo)
- **RES-007 Residential Lease Drafting + Signing** — state-specific lease templates, e-sign, security deposit handling. ($49/mo)

---

## Quality issues to fix before broker dogfood

### Canvas tabs are generic defaults

**Verified for RES-001:** canvas tabs are `Overview / Activity / Resources` — these are the auto-generated defaults from CODEX 50.10-T3, not bespoke for the salesperson workflow.

**What RES-001 should have:**
- Buyer Pipeline (kanban of buyers by stage)
- Listing Pipeline (kanban of listings by stage)
- Active Deals (current contracts in DD/escrow)
- Schedule (calendar of showings, closings, key deadlines)
- CMA Library (saved CMAs and price recommendations)

**Same gap likely applies to most of the 52 RE Dev workers.** They were backfilled with default canvas tabs in CODEX 50.10-T3 but never authored for actual workflow.

**Recommendation:** before broker / dealer / county dogfood, run a canvas-tab quality pass on the top 10-15 RE workers (RES-001, ESC-001, ESC-003, W-001, W-002, W-003, W-031, W-033, W-034, W-042, W-044). Author bespoke tabs per worker workflow. Estimated effort: ~1 hour per worker = 10-15 hours total.

### Location-first UX rule not implemented

**Per memory `feedback_re_location_first_ux.md` (locked 2026-05-11):** every RE worker output leads with a Google Maps link, never auto-pulls photos.

**Implementation needed:**
1. Author a constraint RAAS module `re_location_first_v1` that loads on every RE worker
2. Module enforces: address mentioned → Maps link injected; photo URL detected → blocked
3. Canvas tab schema gains a `location` field that renders Maps link prominently
4. System prompts for all RE workers updated to include the rule

**Estimated effort:** 1 day for module + 1 day for canvas schema + 0.5 day for prompt updates per worker × top 15 workers = ~10 hours.

---

## Recommendations — what to ship and when

### Soft-launch critical (this week)

1. **Author 5 bespoke canvas tabs for RES-001** (Buyer Pipeline, Listing Pipeline, Active Deals, Schedule, CMA Library) — ~2 hours
2. **Author `re_location_first_v1` constraint RAAS module** + load on RES-001 — ~3 hours
3. **Stand up `RES-002 Showing Scheduling` worker** (catalog entry + 4-5 canvas tabs + RAAS hook) — ~6 hours

### Launch-week critical

4. **Stand up `RES-003 Property Inspection (Mobile + Wearable)` worker** — ~8 hours catalog work, mobile capture UI is a separate UI track
5. **Canvas-tab quality pass on top 10 RE workers** — ~12 hours

### Stage 1 post-launch (next 2 weeks)

6. **Spec + start `RES-004 County Land Title On-Chain` worker** — multi-week build, but spec authored in week 1 post-launch
7. **Spec `EU-DPP-001 Digital Product Passport` worker** — concurrent with #6 since substrate overlaps

### Stage 2 post-launch (next month)

8. RES-005 Open House Manager, RES-006 Mortgage Pre-Approval, RES-007 Residential Lease

---

## Estimated launch readiness if we ship recommendations 1-3 this week

**Audiences ready to demo to:**
- ✅ Title officers and escrow officers (12 ESC workers strong)
- ✅ Real-estate developers (52 RE Dev workers strong)
- ✅ Investors / RE analysts (W-002 + finance suite)
- ⚠ Brokers / agents — barely. RES-001 + RES-002 + bespoke tabs = workable. Without showing scheduling: not really.
- ❌ Buyers (consumer) — still no consumer-mortgage worker, no inspection-as-a-buyer worker
- ❌ County governments — founding thesis worker (RES-004) not built
- ❌ EU manufacturers — DPP worker not built

**For Sean's May 22 RE webinar:** the demo Sean walks through on stage should be RES-001 + ESC-003 (Title Search) since both are functional. The Slide 10 incumbent-evolution language remains accurate; we're not over-claiming what the worker stack covers today.

---

## Asks for Sean

1. **Confirm priorities 1-3 for this week** (RES-001 canvas + location module + Showing Scheduling worker)
2. **Confirm RES-002 Showing Scheduling vs. folding it into RES-001** — I recommend standalone, but you may have a different intuition
3. **County On-Chain worker prioritization** — is it Stage 1 post-launch (2 weeks), or accelerated because it's the founding thesis? Either is defensible.
4. **DPP worker** — same question. Stage 1 or earlier?
5. **Mobile/wearable inspection** — your call on whether the canvas-tab approach is enough or if we need a native mobile app component
