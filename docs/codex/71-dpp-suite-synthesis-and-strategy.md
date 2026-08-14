# CODEX 71 — DPP Suite: Current-State Synthesis + Strategy

**Status:** SPEC + PARTIAL BUILD — worker consolidation (§6) shipped this session; red-teamed and revised (§9); for Sean review before Elise consult
**Suite:** EU DPP
**Date:** 2026-08-13
**Trigger:** New-machine recovery pass surfaced that DPP has had zero engineering activity since 2026-07-29. Sean requested a fresh synthesis of what actually exists, plus a strategy pass, before looping Elise back in. Mid-review, Sean approved collapsing the specced workers from 5 to 3 — that consolidation has now been built (§6). A subsequent red team pass (§9) corrected two sourced regulatory-date errors in §4 and flagged marketing-collateral overclaims.
**Note on numbering:** `docs/codex/00-INDEX.md` was last updated through CODEX 48 (2026-07-25) even though codex files exist through 70 — the index itself is stale and out of scope for this doc to repair. This file is CODEX 71 (next unused number; the file 70 exists but is unindexed).

---

## 1. Executive Summary

- **Worker 1 (Compliance Auditor / `eu-battery-dpp-001`) is the only DPP worker with real substance** — Firestore-grounded chat plus a real RAAS ruleset (`functions/functions/raas/rulesets/eu_battery_dpp_v1.json`).
- **Workers 2–5 exist only as static demo canvases.** `DPPWorkerCanvas.jsx` renders hardcoded content for Passport Builder, Supply Chain Tracer, Registry Manager, and Lifecycle Monitor — including literal "⚠ TEST MODE" banners. There is no `/v1/dpp:submit` or any live registry/BMS/supplier endpoint anywhere in `functions/functions/`. CODEX 35 (2026-07-11) marked these "✅ Built + deployed" — that status describes the UI shell for the Voltara demo, not working product capability. No *backend engineering* has changed since (the worker-count consolidation in §6, done this session, is a frontend/grounding regroup, not new backend capability).
- **DPP has had zero engineering activity since 2026-07-29** (commit `ac6ccd27`, sales collateral). That's a clean ~2-week stop before the team's attention moved to other verticals (aviation, etc.), and it stayed parked straight through the Aug 10 hardware incident to today.
- **The EU DPP Central Registry's real launch date is 20 Jul 2026, not 19 Jul** — corrected in §4 after a red-team pass; see §9 for the full correction and sources. The actual access mechanism is also not a simple "allowlisting application" — it's a "verified economic operator" credential (eIDAS qualified electronic seal/signature, valid up to 3 years) which can be delegated to a verified third party like SOCIII. Either way, there is no evidence this was pursued, and for the fictional Voltara demo it doesn't matter — but it means "we can actually submit to the registry" is not true today, a fact that would surface immediately in front of a real client. It also means the registry itself is a **directory, not a data host** — it resolves a GS1 Digital Link product identifier to where the actual passport data lives; the passport itself would need to be hosted by SOCIII/the manufacturer, not uploaded to the EU. That's an architecture detail worth confirming before Worker 2's "Export + Submit" tab gets a real backend.
- **Business/positioning collateral is comparatively mature**: a dated whitepaper (`docs/whitepapers/dpp-provenance-business-in-a-box.md`, July 2026), a one-pager, a deck, broader sales collateral, and a dedicated pricing-philosophy doc (CODEX 36) that uses DPP/Elise as its canonical worked example.
- **Two decisions flagged in CODEX 35 (July 11) are still open, with no movement since**: (A) second-life marketplace model — informational-only vs. referral-fee, and (B) SOCIII/Elise reseller economics. Both block giving Elise a real sales script.
- **Elise has no `creators/elise-*` directory.** Unlike Sean's workspace (`creators/sean-combs/*`, 14 workers) or Ruthie's (`creators/ruthie/nursing-education-001`), everything DPP-related lives directly in the core app/functions code, not the creator-authoring pattern the rest of the platform uses.
- **The 5→3 worker consolidation proposed in §6 has been built.** Passport Builder + Registry Manager + Lifecycle Monitor are now one worker, `eu-passport-registry-001` ("Passport & Registry Manager"), with all 12 of their original tabs preserved — no content was cut, they were regrouped under one worker context instead of three. Compliance Auditor and Supply Chain Tracer are unchanged. See §6 for what changed and why, and §2 for the updated file inventory.
- **⚠ HARD PRICING RULE, added later in this same session (§19a) — the single most operationally urgent fact in this document, easy to miss if you stop reading at the top:** a full pricing model was designed (Base $99/mo–20 products, Growth $999/mo–500, Scale $1,799/mo–1,000, seats, one-time registration fee, unlimited included amendments), then self-red-teamed twice (once internally, once cross-checked against an external second opinion). **The Growth and Scale tiers are confirmed NOT SAFE to quote externally** — they are shown, not just suspected, to be actual losses at the pessimistic end of this document's own cost estimate. Only the $99 Base tier has a demonstrated safety margin. Do not let anyone (including Elise, including a future sales conversation) see the $999/$1,799 numbers as final.
- **A related, still-unsolved billing/architecture problem (§20): what counts as "one product" for pricing purposes is not simply "one GTIN."** Cosmetic and dimensional GTIN variants (a battery in a different color, a different capacity) need to bill differently from genuinely new products, and this has no built data model yet — a real gap that gets *more* urgent, not less, given Elise's stated intent to move into fashion soon, where this pattern is the norm rather than the exception.
- **The custody-event access model (§17) has a real, still-open gap independently confirmed twice**: Supply Chain Tracer's planned supplier-only access doesn't cover freight forwarders, customs brokers, distributors, or installers. GS1 EPCIS 2.0 is the recommended prior art to adopt rather than building bespoke — not yet evaluated or built.

---

## 2. What Concretely Exists Today

| Artifact | Path | State |
|---|---|---|
| Worker 1 — Compliance Auditor | `eu-battery-dpp-001`, canvas in `DPPWorkerCanvas.jsx`, ruleset `eu_battery_dpp_v1.json` | 🟡 Real chat + RAAS + Firestore grounding. Data intake across 7 clusters / 90 attributes. |
| Worker 2 — Passport & Registry Manager *(new, merged)* | `eu-passport-registry-001`, `PassportRegistryCanvas` in `DPPWorkerCanvas.jsx` | 🔴 Static canvas (12 tabs: Passport Queue/Preview/Export+Submit/Ledger + Registry Status/Submission Queue/QR/Alerts + Live Fleet/Amendments/BMS/Second-Life). Merges former Workers 2, 4, 5 — no content cut, just regrouped under one worker. JSON-LD generation, live registry submission, and BMS telemetry are all still spec-only, not built. |
| Worker 3 — Supply Chain Tracer | `eu-supply-chain-tracer-001`, `SupplyChainCanvas` | 🔴 Static canvas only. Supplier Data Network + supplier login (Firebase `role: supplier` claim) spec'd (CODEX 31), not built. |
| ~~Worker 4 — Registry Manager~~ | *(retired — merged into Worker 2 above)* | — |
| ~~Worker 5 — Lifecycle Monitor~~ | *(retired — merged into Worker 2 above)* | — |
| Demo company data | Voltara BV (Amsterdam, 6 SKUs, fictional suppliers) — CODEX 37 | 🟢 Seeded, idempotent seed script. |
| Localization (NL/DE/ZH) | CODEX 34 | 🔴 Not built. Demo is English-only. |
| Business collateral | `docs/whitepapers/dpp-provenance-business-in-a-box.md`, `docs/marketing/dpp/{one-pager,whitepaper,deck}.md`, `docs/sales/dpp-one-pager.md` | 🟢 Written, dated July 2026. |
| Pricing philosophy | CODEX 36 — uses Elise/DPP as canonical example | 🟢 Written, not finalized (reseller split still open — see §5). |
| Creator onboarding | `creators/elise-*` | ⚪ Does not exist. |
| Advisor/legal paperwork | `docs/legal/advisor-letters/elise-fellow-invitation.md` + RSPA docx files | 🟢 Exists (not reviewed here — legal). |

---

## 3. The Distinction That Matters Most: "Canvas Built" ≠ "Functional"

CODEX 35's readiness table (§4, 2026-07-11) says Workers 2–5's canvases are "✅ Built + deployed." That is accurate and also easy to misread. It means: the tab UI exists and looks complete for a scripted demo walkthrough with pre-seeded Voltara data. It does **not** mean any of the following are real:

- Generating an actual Annex XIII JSON-LD passport file
- Submitting anything to the actual EU DPP Central Registry
- A supplier being able to log in and submit their own data
- Live BMS telemetry driving the Lifecycle Monitor's SoH numbers

It's a reasonable and common sequencing choice — build the demo shell first, wire the backend once the business case is confirmed — but it means the true state of DPP is **one real worker (Compliance Auditor) plus four convincing mockups**, not "a working 5-worker suite."

---

## 4. Timeline Reality Check

**Corrected in the §9 red-team pass — see there for sources.** The version below replaces the original (which had the registry date one day off and incorrectly split the mandatory deadline into two dates).

| Milestone | Date | Status |
|---|---|---|
| Commission's deadline to have the registry *set up* (ESPR Article 13) | 2026-07-19 | Passed — an internal Commission deadline, not a public launch. |
| EU DPP Central Registry, testing environment + user guidelines actually go live | 2026-07-20 | Passed. |
| Implementing Regulation (EU) 2026/1778 (governs registry operating rules) adopted 16 Jul 2026 | enters into force 2026-08-06 | Passed. |
| **All three battery categories become DPP-mandatory on the same date** — EV batteries, LMT batteries (e-bikes/scooters), **and** industrial batteries >2kWh | **2027-02-18** | ~6 months away. There is no separate later date for LMT batteries — the original doc's Aug 2027 split was wrong. |

Given ~2 idle weeks (Jul 29 → Aug 10) plus the hardware incident, effective runway against the single Feb 2027 deadline — for all three battery categories, not just industrial — has shrunk without anyone having made that trade-off consciously. Worth naming explicitly rather than discovering later.

---

## 5. Open Decisions Carried Over From CODEX 35 (Still Unresolved)

**Decision A — Second-life marketplace model.** Informational-only listing of EU-registered refurbishers/recyclers (no commercial relationship), vs. a referral/marketplace fee when a client connects with one through the platform. Blocks the Second-Life Tracker tab's full build (now a tab inside the merged Passport & Registry Manager worker — see §6; it was Worker 5's Tab 5 before consolidation) and any sales pitch referencing second-life revenue. **Owner: Sean.**

**Decision B — Reseller economics with Elise. Structurally resolved 2026-08-13 — one parameter still open** (relabeled per Elise's round-2 review, which fairly flagged the earlier "RESOLVED" label as overstating things while a real number was still outstanding — that's now fixed here rather than left inconsistent). Elise sets her own advisory margin/reseller pricing on top — that's her business and Sean has no opinion on the number. The fixed platform-floor constraint: pricing stays as documented (whitepaper: $99/month base + per-seat + compute/data charges), and the worker(s) remain listed in the **general marketplace catalog** so any prospect can self-serve at that floor price regardless of whether they came through Elise. This does not preclude Elise also doing creator-led B2B outreach (Battlink-style) on top of that marketplace floor.

**Minting-fee mechanism — simplification proposed by Sean, replacing the open "fee above a threshold" placeholder:** bundle a set number of mints into the $99/month base, then charge a straightforward data fee per mint beyond that included allowance — the standard "included quota + overage" SaaS pattern, easier to reason about than an undefined threshold. Directionally good and consistent with CODEX 36's "little piggy, not a hog" philosophy. **Still open, and load-bearing for whether the quota number means anything:** what actually counts as one "mint"? If it's only the initial passport creation, a modest bundled quota is generous. If every custody-chain event and every telemetry update (§17) is *also* a separate mint — which becomes the natural default once GS1 EPCIS 2.0 adoption happens (§17), since each shipping/customs/delivery/install event would be its own EPCIS event — a single product could generate dozens of mint events over its life, and any small bundled quota gets exceeded almost immediately, making the overage fee the real price rather than the $99 headline. **Needs:** (1) a definition of what counts as a billable mint, (2) real unit-cost data (Firestore/anchoring/compute cost per mint) to size the bundled quota and overage price — not yet available as of this codex revision.

Decision A doesn't require engineering and has been sitting since July 11. Decision B was structurally resolved 2026-08-13 (above) — the minting-fee mechanism it also gates now has its own open items, tracked in §19.

---

## 6. Strategy: Collapse the Specced Workers — DECIDED + BUILT this session

Sean's observation: five separate DPP workers means a user doing one continuous job gets bounced across multiple worker chat contexts unnecessarily. Looking at what each worker actually does and who actually uses it:

| Worker | Actual user | Actual job |
|---|---|---|
| 1. Compliance Auditor | Manufacturer's compliance team | Collect the 90 data attributes |
| 2. Passport Builder | Same team, same session | Turn completed data into a JSON-LD file |
| 4. Registry Manager | Same team, ongoing | Submit that file, track status, handle amendments |
| 5. Lifecycle Monitor | Same team, ongoing | Feed the same passport ongoing SoH/amendment updates |
| 3. Supply Chain Tracer | **Upstream suppliers** — a different person entirely, with a planned (not yet built — see §2) separate Firebase `role: supplier` claim | Suppliers submit sourcing data once, feeding every client passport that uses them |

Workers 2, 4, and 5 are three sequential/recurring touches on **the same passport record**, by **the same client-side user**, at different points in that record's life (build → submit → maintain). Splitting them into three separate "workers" — each re-introducing itself as Elara, re-explaining its own scope — is the exact toggling friction Sean flagged, and it isn't earning anything: there's no distinct buyer or access boundary being protected by the split, unlike Worker 3.

**Decision: collapse 5 workers into 3.** Sean approved this during review; it has been built:

1. **Compliance Auditor** (unchanged) — the data-intake foundation.
2. **Passport & Registry Manager** — new merged worker, slug `eu-passport-registry-001`, replacing the former Passport Builder (`eu-passport-builder-001`) + Registry Manager (`eu-registry-manager-001`) + Lifecycle Monitor (`eu-lifecycle-monitor-001`). One worker now covers a passport's full life: generate → submit → track status/amendments → ongoing lifecycle updates as the battery ages. All 12 tabs from the three source workers were preserved (none of their content was cut) and are now organized under one worker context instead of three.
3. **Supply Chain Tracer** (unchanged) — kept separate. Different persona (suppliers, not the manufacturer), a *planned* separate access mode and Firebase claims (CODEX 31 Priority 4 — supplier portal auth is spec'd, not built; see §2), and its own network-effect moat (CODEX 31's "one supplier, many passports" model). Folding this into the client-facing worker would blur a boundary the spec deliberately built separate — but be precise with anyone (including Elise) about *why* it's separate today: it's the right planned architecture, not a currently-enforced access control. If challenged on "why is this still its own worker" before the supplier login is built, the honest answer is "planned separation," not "protected separation."

**Why now was the cheap moment to do this:** none of Workers 2/4/5's real backend existed yet — they were still static mockups. Consolidating was a re-plan, not a migration; there was no throwaway engineering to write off.

**What actually changed (files touched):**
- `apps/business/src/components/canvas/DPPWorkerCanvas.jsx` — merged `PassportBuilderCanvas`, `RegistryManagerCanvas`, `LifecycleMonitorCanvas` into one `PassportRegistryCanvas` with all 12 tabs; updated the slug registry and routing switch.
- `apps/business/src/components/Sidebar.jsx` — display-name map updated (2 entries removed, 1 renamed to "Passport & Registry Manager").
- `functions/functions/index.js` — the Traitly/Volta Advisory demo persona's `activeWorkers` list updated to the 3 surviving slugs.
- `functions/functions/services/canvas/workerOwnData.js` — merged the three workers' Firestore-grounding block functions (`dppPassportBlock` + `dppRegistryBlock` + `dppLifecycleBlock`) into one `dppPassportRegistryBlock`.
- `functions/functions/services/canvas/verticalSiblings.js` — merged the sibling-handoff metadata (emits/accepts contracts, descriptions) for the three retired slugs into the new one.

**Verification performed:** production build (`npm run build`) succeeds with no errors. Beyond that, every one of the 12 tab sub-components referenced by the merged canvas (`PBTabQueue`, `TabPassport`, `PBTabExport`, `PBTabLedger`, `RMTabStatus`, `RMTabQueue`, `RMTabQR`, `RMTabAlerts`, `LMTabFleet`, `LMTabAmendments`, `LMTabBMS`, `LMTabSecondLife`) was confirmed to resolve to exactly one function definition in the file — this catches the most likely merge failure mode (a dangling reference to a deleted/renamed component), which a passing build alone would not catch (JSX doesn't statically check that a referenced component exists). **Not performed:** an authenticated, logged-in click-through of all 12 tabs against the live Voltara BV seed data. That would require driving the actual demo sign-in flow in a browser and hasn't been done — worth doing before this is shown to Elise or a client, not just relying on the structural check above.

**Not yet touched / worth a follow-up decision:** the merged worker's 12 tabs is a lot for one `TabBar` row — this consolidation reduced *worker-level* toggling as asked, but a further pass to reduce or regroup the tab count itself would be a separate design decision, not made here.

---

## 7. Recommended Path Forward

1. Sean reviews this codex (worker consolidation is already shipped — this is a sanity check against the live canvas, not a go/no-go).
2. Resolve Decision A (second-life model) and Decision B (reseller economics) — pure judgment calls, no engineering blocked on anything else.
3. Consult Elise — including showing her the now-3-worker layout — before any further build. She's the one who'll actually sell and demo this; get her read on whether it matches how she'd walk a client through it.
4. Decide: pursue EU registry allowlisting now (a month past the original window), or treat it as a task to trigger once a real (non-Voltara) client is imminent.
5. Only after 2–4 are settled, resume engineering — starting with real JSON-LD generation in the consolidated Passport & Registry Manager worker, since it's the prerequisite for everything downstream (registry submission can't be real until the file it submits is real).
6. Onboard Elise into the creator-authoring pattern (`creators/elise-*`) rather than keeping DPP logic embedded in core app/functions — consistent with every other vertical, and necessary if she's meant to operate semi-independently the way Ruthie does for nursing education.

---

## 8. Open Questions for Sean (before the Elise consult)

- Sanity-check the shipped 5→3 consolidation (§6) — does the merged worker's tab set make sense, or should some of those 12 tabs be trimmed/regrouped further?
- Decision A: second-life marketplace — informational-only, or referral-fee?
- ~~Decision B: reseller economics~~ — RESOLVED 2026-08-13, see §5. Only the exact minting-fee threshold is still open.
- Registry allowlisting — pursue now, or wait for a real client?
- Formal `creators/elise-*` onboarding — do now, or defer until build resumes?

---

## 9. Red Team Pass — Regulatory Sourcing Correction + Marketing Collateral Audit

A red-team review of this codex's first draft found two categories of real problems, both fixed above and detailed here with sources.

### 9a. Regulatory dates and mechanism — corrected

The original §4 stated the registry "opened 19 Jul 2026" with an 8-day third-party "allowlisting" window, and split the mandatory DPP deadline into Feb 2027 (industrial) vs Aug 2027 (LMT). All three claims were checked against the actual regulation and are wrong or imprecise:

1. **19 Jul 2026 was the Commission's internal deadline to have the registry set up (ESPR Article 13), not the public launch.** The registry, testing environment, and user guidelines actually went live **20 Jul 2026** — one day later. ([Traceable Digital: "EU Central DPP Registry: 19 July Deadline vs. 20 July Launch"](https://traceable.digital/resources/blog/eu-central-dpp-registry-what-we-know-about-the-july-2026-launch/))
2. **There is no separate Aug 2027 date for LMT batteries.** EV batteries, LMT batteries (e-bikes/scooters), and industrial batteries >2kWh all become DPP-mandatory on the **same date: 18 Feb 2027**. ([BluestonePIM: "Digital Product Passport for Batteries: The February 2027 Deadline"](https://www.bluestonepim.com/blog/digital-product-passport-for-batteries); confirmed across multiple independent compliance-guide sources.) This matters beyond a date label — it means LMT never had the extra ~6 months of runway the original doc implied.
3. **The access mechanism is not "third-party allowlisting" with an 8-day window.** An economic operator must first become a **"verified economic operator"** under the regulation — proven via a qualified electronic signature (sole traders) or qualified electronic seal (legal entities) issued under eIDAS, valid up to 3 years. A verified operator may then **delegate registration to a third party** (e.g. a platform like SOCIII), provided that third party is *itself* verified. ([Traceable Digital: "EU DPP Central Registry — What Manufacturers Need to Know"](https://traceable.digital/regulatory/eu-central-registry/); [Minespider: "The EU DPP Registry: What Economic Operators Need to Know"](https://www.minespider.com/blog/the-eu-dpp-registry-what-economic-operators-need-to-know))
4. **The registry is a directory, not a data host.** Given a product identifier via GS1 Digital Link, it returns *the location of* the product's DPP data — the actual passport is hosted by the manufacturer or their designated platform. ([same Minespider source above; also the official EU Commission "DPP Registry User Guide for Economic Operators"](https://single-market-economy.ec.europa.eu/document/download/079a45e2-469f-4eec-b1e5-32e8e05d1357_en?filename=dpp_registry_user_guide_for_economic_operators.pdf)) This is an architecture-relevant fact for Worker 2's future "Export + Submit" build: the API call is closer to "register our hosting location as authoritative for this product ID" than "upload a file to the EU."
5. Also confirmed: **Commission Implementing Regulation (EU) 2026/1778** (adopted 16 Jul 2026, governs registry operating rules) doesn't itself enter into force until **6 Aug 2026** — three weeks after the registry's public launch.

Primary EU legal texts, for direct citation: [Regulation (EU) 2023/1542 (Batteries), EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542) and [Regulation (EU) 2024/1781 (ESPR), EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02024R1781-20240628).

**This correction is applied above in the Executive Summary and §4.** No further regulatory-date claim appears anywhere in this codex without a source attached.

### 9b. Marketing collateral — audited against §3's reality check, and it does not pass cleanly

§2 originally rated business collateral 🟢 "written, dated July 2026" with no caveat, while the rest of this codex is careful to separate "canvas exists" from "capability exists" (§3). That discipline was not applied to the collateral. It should have been — a direct search of the existing files found real overclaims:

- `docs/whitepapers/dpp-provenance-business-in-a-box.md:113`: *"SOCIII is the running system that is live before your deadline... and produces DPPs that are compliant, auditable, and registry-ready from day one."* — Per §2/§3, no DPP has ever been generated as real JSON-LD, and registry submission is a hardcoded TEST MODE mock. This line asserts the opposite.
- Same file, line 121: *"The pilot establishes the record architecture, the supplier attestation workflow, and the QR-to-registry interface."* — present tense, implying these already exist. The supplier attestation workflow (supplier login) is spec'd, not built (§2). The QR-to-registry interface is a mock.
- `docs/sales/dpp-one-pager.md:20`: *"Handles supply chain tracing and registry submission in one workflow. Supply Chain Tracer and Registry Manager run concurrently."* — same issue; there is no live registry submission to run concurrently with anything.

**Fixed (2026-08-13, after Elise's review flagged this as a hard blocker on forwarding the collateral to anyone, Battlink included).** Both files were corrected: the "live," "day one," and "runs concurrently" language was rewritten to describe the architecture/roadmap accurately (e.g., "SOCIII is being built to be the running system in place..." rather than "SOCIII is the running system that is live..."), and stale pre-consolidation worker names (separate "Registry Manager," "Lifecycle Monitor," "Passport Builder") were updated to the merged "Passport & Registry Manager" throughout both `docs/whitepapers/dpp-provenance-business-in-a-box.md` and `docs/sales/dpp-one-pager.md`. One item flagged inline for follow-up rather than guessed: the one-pager's blockchain-anchoring claim — Base-anchoring is confirmed live elsewhere on the platform (Vault records show a "HASH ANCHORED" badge), but whether it's actually wired for DPP records specifically wasn't verified and shouldn't be asserted either way until confirmed. `docs/marketing/dpp/*.md` (a separate one-pager/whitepaper/deck set) did not have the same issue on inspection — those read as brand positioning ("SOCIII is turnkey DPP infrastructure") rather than specific operability claims, so left untouched.

---

## 10. Studio Locker Document Plan (for Elise's review)

Sean asked for the reference-document list each of the 3 DPP workers' Studio Locker should carry, including links, plus a SOCIII-authored best-practices document. Every link below was pulled from an actual source this session — none are guessed URLs. Where I could not confirm a specific link (noted inline), it's flagged rather than fabricated, consistent with the RAAS rule already built into this suite (`dpp-no-invented-allowlist`, `dpp-no-fabricated-compliance`).

**Note on structure:** unlike the Title Production Suite (CODEX 48), where documents genuinely cascade EU→country→state→county (title/recording law is jurisdiction-by-jurisdiction), EU battery/DPP compliance is **harmonized at the EU level** — there isn't a natural province/city layer here. The real second layer is (a) each member state's own supply-chain due-diligence law where one exists, and (b) each member state's designated market-surveillance/enforcement authority, which does vary by country but was only reliably confirmed for Germany in this pass.

### Worker 1 — DPP Compliance Tracker (`eu-battery-dpp-001`)
*Data intake across the 7 clusters / 90 attributes — the foundational compliance-audit worker.*

| Tier | Document | Link |
|---|---|---|
| EU primary law | Regulation (EU) 2023/1542 — Batteries Regulation (full text, consolidated) | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542) |
| EU primary law | Regulation (EU) 2024/1781 — ESPR (Ecodesign for Sustainable Products) | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02024R1781-20240628) |
| EU official guidance | Annex XIII data requirements (within the Battery Regulation above) | Same EUR-Lex document, Annex XIII |
| SOCIII-authored | **"DPP Compliance Readiness Guide"** — our own cluster-by-cluster checklist (see §10d below) | *To be authored* |

### Worker 2 — Passport & Registry Manager (`eu-passport-registry-001`)
*JSON-LD generation, registry submission, status tracking, lifecycle amendments.*

| Tier | Document | Link |
|---|---|---|
| EU official | DPP Registry User Guide for Economic Operators (PDF, DG GROW) | [European Commission](https://single-market-economy.ec.europa.eu/document/download/079a45e2-469f-4eec-b1e5-32e8e05d1357_en?filename=dpp_registry_user_guide_for_economic_operators.pdf) |
| EU primary law | Commission Implementing Regulation (EU) 2026/1778 (registry operating rules) | *Confirm exact EUR-Lex URL by CELEX lookup before sending — adopted 16 Jul 2026, very recently indexed; not independently re-verified this session beyond the secondary source above* |
| EU primary law | eIDAS — Regulation (EU) No 910/2014, as amended by (EU) 2024/1183 (verified economic operator credentials) | *Cite by number; confirm exact EUR-Lex URL before sending — not independently re-verified this session* |
| Industry standard | GS1 Digital Link (the identifier standard the registry resolves against) | [GS1.org](https://www.gs1.org/standards/gs1-digital-link) — verify current doc URL before sending |
| Industry standard | Battery Pass Consortium — Battery Passport Content Guidance (2023, DIN/DKE-backed) — the actual source of the 7-cluster structure this suite already uses | [thebatterypass.eu PDF](https://thebatterypass.eu/assets/images/content-guidance/pdf/2023_Battery_Passport_Content_Guidance.pdf) — verified 2026-08-13 |
| Industry standard | Battery Pass Data Model (open source, GitHub) — a real technical schema aligned with DIN DKE SPEC 99100, a strong candidate reference for actual JSON-LD generation work | [github.com/batterypass/BatteryPassDataModel](https://github.com/batterypass/BatteryPassDataModel) — verified 2026-08-13 |
| Industry standard | DIN DKE SPEC 99100 (Jan 2025) — defines the mandatory + voluntary data attributes referenced by CODEX 30 | Cite by number; confirm exact publisher link before sending — not independently re-verified this session beyond the secondary sources above |
| SOCIII-authored | **"Passport Build & Registry Submission Playbook"** (see §10d below) | *To be authored* |

### Worker 3 — Supply Chain Tracer (`eu-supply-chain-tracer-001`)
*Supplier onboarding, sourcing declarations, materials due diligence (Clusters 4+5).*

| Tier | Document | Link |
|---|---|---|
| EU primary law | Battery Regulation Articles 52–54 (supply chain due diligence) | Same EUR-Lex document as Worker 1, Articles 52–54 |
| EU primary law | Regulation (EU) 2017/821 — Conflict Minerals Regulation | *Cite by number; confirm exact EUR-Lex URL before sending — not independently re-verified this session* |
| EU primary law | Directive (EU) 2024/1760 — Corporate Sustainability Due Diligence Directive (CSDDD). **Verified stale as originally cited (caught in a second red-team pass, same species of error as §9a's registry-date fix — citing a regulation by its original number without flagging a substantive later amendment):** the "Omnibus I" Directive amending both CSRD and CSDDD was published in the Official Journal 26 Feb 2026, entering into force 18 Mar 2026 — it narrowed CSDDD's scope from ~13,000 to ~6,000 companies (thresholds raised to 5,000 employees / €1.5B turnover), deleted the climate transition plan obligation and the EU-wide civil liability regime (reverted to national law), and unified the application date to **26 July 2029** (transposition by 26 July 2028) rather than the original staggered dates. This is meaningfully later and narrower than practitioners were planning around pre-Omnibus — relevant for a prospect like HOPPECKE, who may not be in scope at all post-narrowing depending on size. ([DLA Piper — EU Omnibus I Directive amending CSRD and CSDDD](https://www.dlapiper.com/en-us/insights/blogs/environment-health-safety-and-product-compliance/2026/eu-omnibus-i-directive-amending-csrd-and-csddd-will-enter-into-force-on-18-march-2026); [Arthur Cox — Omnibus I Directive published](https://www.arthurcox.com/insights/omnibus-i-directive-published-revised-scope-and-reduced-obligations-under-csrd-and-csddd/)) | *Confirm exact EUR-Lex URL for the original directive before sending — the Omnibus I amendment itself should be cited alongside it, not instead of it* |
| Germany (relevant — HOPPECKE is a German prospect) | Act on Corporate Due Diligence Obligations in Supply Chains (LkSG), in force since 1 Jan 2023, enforced by BAFA (Federal Office of Economics and Export Control) | [German government CSR portal (BMAS)](https://www.csr-in-deutschland.de/EN/Legislation/German-Supply-Chain-Act/german-supply-chain-act.html) |
| International standard | OECD Due Diligence Guidance for Responsible Supply Chains of Minerals from Conflict-Affected Areas | [OECD.org](https://www.oecd.org/en/topics/sub-issues/responsible-supply-chains-of-minerals.html) — verify current doc URL before sending |
| Industry network | Catena-X (automotive/battery data-sharing network, referenced in CODEX 31 as a connector target) | *Link not verified this session — confirm before sending* |
| SOCIII-authored | **"Supplier Data Submission Standard"** (see §10d below) | *To be authored* |

### 10a. What's still missing, honestly

I could not confirm which specific national authority handles Battery Regulation market-surveillance enforcement in the Netherlands (Voltara's home country) — search results indicated Dutch implementation has been delayed and didn't name a designated body with confidence. **Do not put a guessed Dutch authority link in front of Elise or a client.** Flag this as a follow-up research item, or ask Elise directly — as a Netherlands-based advisor she likely already knows the answer.

### 10b. Studio Locker isn't just a reading list — it needs a real ingestion path

This section is a *curated document plan*, not yet a working feature. Recall from this morning's RE work: Studio Locker is a live API (`/v1/worker:locker:list`) with tiered documents (Platform / Professional Library / Worker-Specific) — there is currently no seed script that populates it for **any** worker, DPP or RE. Turning this list into something that actually shows up in the app is a separate, real build task (document storage, PDF/URL ingestion, tier classification) — not done as part of this pass. Flagging as a next step if Sean wants the Locker populated rather than just planned.

### 10c. Revenue angle — Sean's question, answered against what's actually in the codebase

Sean asked whether, once built out, this Studio Locker content could sit inside Elise's own creator account so she earns revenue from it. That's consistent with the existing plan already in §7 (item 6) (onboard Elise into `creators/elise-*`) and with CODEX 36's creator-led B2B revenue track (client pays the creator, creator pays SOCIII) — no new mechanism would be needed, just formally moving DPP into her creator workspace. The specifics (does Locker content itself carry separate value, or is it bundled into the worker's overall price) should be part of the Decision B reseller-economics conversation (§5), not decided here.

**On Sean's platform-admin access question — confirmed directly in the code:** yes, editing rights are retained regardless of creator assignment. `functions/functions/index.js` has a hardcoded `PLATFORM_ADMIN_UIDS` set containing Sean's UID that bypasses the organization-only worker visibility gate (line ~601) and gates several admin-only endpoints exclusively to that UID (lines ~32321–32362). Beyond that in-app bypass, the underlying worker code lives in the same monorepo Sean already has full repo access to — creator "ownership" in this platform governs runtime usage/visibility gating, not literal edit access to the source. Both paths confirm continued full edit access after any handoff to Elise's creator account.

### 10d. The best-practices documents — the actual opportunity Sean flagged

Sean's real point: most manufacturers don't have internal DPP documentation yet — the market is new enough that whoever publishes the clearest practical standard first gets cited as the reference, rather than having to match an existing one. Three SOCIII-authored documents are proposed above (one per worker) rather than one generic doc, since each worker's job is genuinely different:

1. **DPP Compliance Readiness Guide** (Worker 1) — a plain-language, cluster-by-cluster (1–7) checklist of what data a manufacturer needs before starting, in what format, sourced from whom internally. This is the highest-leverage one to write first — it's the front door every new client hits.
2. **Passport Build & Registry Submission Playbook** (Worker 2) — once real JSON-LD generation exists (§7 (item 5)), document the actual build→submit→amend workflow as the reference process, including the "registry is a directory, not a host" distinction from §9a so clients don't get this wrong either.
3. **Supplier Data Submission Standard** (Worker 3) — a template defining exactly what a complete supplier attestation contains. This is the one with the strongest network-effect case: if SOCIII's supplier submission format becomes what advisors ask suppliers to fill out, that format becomes the de facto standard purely through adoption, which is the CODEX 31 "moat" argument made concrete.

None of these three are written yet — this is the plan, not the deliverable. Worth sequencing after Decision A/B (§5) and the Elise consult, since her read on what her actual clients need should shape these before they're drafted.

---

## 11. Canvas & Ingestion Design Note (Sean's question, this session)

Sean's question: most users will likely just upload a spreadsheet of their products rather than enter data one SKU at a time in chat, but eventually this could push down to point-of-manufacture (an ERP/MES/PLM system generating the passport automatically at the moment a battery is made).

**Recommendation:** treat these as two different phases, not one design.

- **Near-term default: bulk-first ingestion.** Design the Passport Queue tab (in the merged Passport & Registry Manager worker) around "upload your product list (CSV/Excel), review the mapped results" as the primary flow, not one-SKU-at-a-time chat entry. This matches how manufacturers already track SKUs today — most don't have this data anywhere except a spreadsheet.
- **Longer-term: point-of-manufacture / ERP integration is real, but it's a Platform-tier build, not a near-term one.** It requires a bespoke integration per manufacturer's ERP/MES system — the same shape of problem CODEX 33 already flagged for the Lifecycle Monitor's BMS connection ("no standard API exists — each product line requires a bespoke integration"). Don't build this now; the value is real but the integration cost is per-client, not a one-time platform feature.
- **Keep the data model open for both without committing to either now.** An `ingestionSource` field on each product record (`spreadsheet` / `erp-webhook` / `manual`) costs nothing to add today and avoids a schema rewrite when ERP integration eventually gets built for a specific client.

---

## 12. Elise's Round 2 Review — Responses (2026-08-13)

Elise reviewed this codex, found no issue with the substance ("I don't have any issue here so I'm not really the blocker"), and raised commercial/GTM points plus a testing-methodology concern. Responses below.

### 12a. Is DPP actually resourced? (her point 4) — Answered directly by Sean

**Yes, DPP is a current Tier-1 engineering priority**, alongside Ruthie's nursing-education workers. Sean's stated priority order as of this session:
- **Tier 1 (current):** DPP (Elise/Volta Advisory) + Ruthie's nursing-education suite.
- **Tier 2 (next):** Title Production Suite (Texas title company client, CODEX 48), Scott's real estate firm (San Francisco), and Sean's personal aviation suite (his own day-job use case).

This is a real answer, not a placeholder — worth relaying to Elise directly so she can set Battlink expectations accordingly.

**Elise's fair follow-up (round 2):** a Tier-1 priority ranking isn't the same thing as a committed engineering-hours allocation. Worth asking Sean directly what Tier 1 translates to concretely (e.g., X engineer-days/week) so "resourced" is checkable against the Feb 2027 deadline rather than just a ranking relative to other verticals. **Not yet answered as of this codex revision.**

### 12b. Supply Chain Tracer / best practices (her point 5) — escalated from "plan" to "build as much as possible"

Sean's read: the three SOCIII-authored best-practice documents proposed in §10d aren't just useful collateral — since no ISO standard or private industry standard currently exists for DPP supplier attestation format specifically, authoring one first is a real market-establishing opportunity, and it directly helps Elise's own consulting positioning. Direction: build these out as fully as possible, not just plan them. (Not yet started as of this codex revision — next actionable step, sequenced after the demo-client work below since that will surface real gaps the best-practice docs should address.)

**Two-sided opportunity sharpened in round 2 (§13, and §15a):** the parties who'd carry the biggest burden for custody-event logging and telemetry reporting (small manufacturers, freight forwarders, distributors, installers) are, per Elise's own v2 sample doc's responsible-party mapping, the least sophisticated/resourced parties in the chain. SOCIII's angle: make custody-event logging radically low-friction for non-technical contributors (closer to a one-tap "confirm receipt" mobile flow than a full worker-chat interface). Elise's angle: offer a **managed compliance service** — her team doing the actual data-entry/custody-logging on behalf of sellers who can't do it themselves — a stickier, higher-value service than referral reselling, and a natural justification for her margin in Decision B above.

### 12c. Demo client site — scope resolved

Clarified scope: **both** of the two options considered.
1. **Public consumer-facing passport viewer** — the actual "scan the QR code, see the passport" page. Confirmed as in-scope and mandate-critical: the EU Battery Regulation itself requires the passport to be accessible via QR code to anyone downstream (manufacturer, distributor, retailer, end consumer) — this isn't optional polish, it's the regulatory requirement. Sean asked for this to be built now (see below — first slice in progress).
2. **Self-service manufacturer-side ingestion** — also confirmed in-scope, framed as a sales/self-discovery tool (same pattern as the other vertical demos): a prospective client of Elise or SOCIII should be able to see their own product catalog ingested and turned into passports.

**Sean's resolution to the "who's our test client" circular-logic problem Elise raised** (she's effectively asking for a real client before she'll sell to a real client): rather than wait for an external client, build our own functioning e-commerce company as the demo client — up to and including a real Shopify dev store, tested via a private custom app pulling the real Shopify Admin API rather than more fictional Firestore seed data. This gives genuine end-to-end integration testing without needing an external customer, and doubles as real progress toward the Shopify app already on the Q3 2026 roadmap (whitepaper, §"Coming in Q3 2026").

**Scoping note added by Claude:** a private custom app on our own Shopify dev store (to prove real Admin API ingestion works) is a contained build. A public Shopify App Store listing is a materially bigger undertaking (OAuth app review, billing API, multi-merchant install flow, ongoing App Store compliance) and should stay a separate, later Q3 2026 milestone rather than something this demo-client effort quietly grows into. Setting up the actual dev store needs two inputs from Sean first (existing Shopify Partner account? preferred store name) — not started as of this codex revision, pending that.

**Build status:** the public passport viewer (item 1 above) is being built now as the concrete next step — see commit history / code for current state, since this codex won't be kept in perfect lockstep with every line of that build.

### 12d. Demo-client approach — revised again, twice, same session

The demo-client plan evolved twice more after §12c was written, in real time during review:

1. Sean first proposed a real dropshipping e-bike/e-scooter operation (loose battery packs ruled out — hazmat shipping restrictions; consumer power banks ruled out — not in the Feb 2027 DPP-mandate category, which covers only LMT/industrial>2kWh/EV batteries specifically).
2. On reflection, Sean flagged this as likely disproportionate ("killing an ant with a bazooka") and asked for a lighter way to test the actual target: **plugins for Amazon, eBay, and Shopify**, not a retail business.
3. **Resolved: use each platform's own official developer sandbox**, not a real business at all:
   - **Shopify** — free Partner development store, populated with realistic (still fake) e-bike/battery product data.
   - **Amazon** — SP-API sandbox (static + dynamic mock responses, plus a newer AI-driven sandbox), registered via the Solution Provider Portal — usable even without an approved seller/developer account. ([Amazon SP-API Sandbox docs](https://developer-docs.amazon.com/sp-api/docs/sp-api-sandbox))
   - **eBay** — full Developer Program Sandbox: virtual test users, test listings, no real money or real accounts. ([eBay Developer Sandbox](https://developer.ebay.com/api-docs/static/sandbox-landing.html))
4. **Real-world validation, once sandbox-proven:** rather than SOCIII operating as a retailer, find one small, real, friendly manufacturer (likely via Elise's existing network — Battlink, HOPPECKE, FIAMM, or similar) willing to be a design partner and install a private beta on *their* real store. This gets real supplier data and genuine end-to-end proof without SOCIII taking on retail/fulfillment risk, and directly resolves the circular-logic problem Elise raised in her review (§12) — a real client to test against — without requiring SOCIII to become that client itself.

**Current status: sandbox-first plan confirmed. Not yet built.** No dev store, SP-API registration, or eBay sandbox account has been created as of this codex revision.

**Real gap in this plan, identified by Elise's round-2 review:** the sandboxes validate the *retailer/platform side* (listing compliance fields, checkout metadata) — they test nothing about *supplier-side adoption friction*, which by Sean's own §12b analysis is where the real risk sits (small manufacturers, freight forwarders, and installers are the least sophisticated/resourced parties in the chain). A sandbox proves the plumbing works when SOCIII controls both ends of the test data; it says nothing about whether a real freight forwarder will actually tap "confirm receipt" on a phone. **Recommendation, not yet actioned:** test the actual custody-event UX with one real, non-technical third party (even a single freight forwarder or small distributor) **in parallel with** the retail-side sandbox work, not sequentially after it — otherwise the first real test of the hardest, least-proven part of the system happens at the same moment as the first real client relationship, which is a worse time to discover UX problems.

---

## 13. Competitive Landscape

**Staxxer** (staxxer.com) — flagged by Elise during review. Netherlands-based (Nijmegen — same country as Elise/Voltara, likely how she knows them), founded 2021. Automates **VAT and EPR (Extended Producer Responsibility) registration/filing** for e-commerce sellers — hooks into sales platforms, pulls data, calculates and files per-country. **Not a DPP competitor today** — their product is the tax/registration side of EU e-commerce compliance, not the passport/traceability side this suite builds. Two implications worth tracking: (1) the adjacency is close enough that they could plausibly expand into DPP later, and (2) EPR registration — which Staxxer already automates — is specifically the thing Amazon is *already* actively gating listings on (see below), meaning a manufacturer may need both an EPR solution (Staxxer or similar) and a DPP solution (SOCIII) — a partnership angle as plausible as a competitive one.

**Enforcement mechanism — confirmed both government- and platform-level, and the platform layer is already live today:**
- Government: national market surveillance authorities enforce per member state; non-compliant products can also be blocked at EU customs on import.
- **Platform-level gating is not hypothetical — it's happening now**, ahead of the full DPP mandate: Amazon and eBay are already deactivating/hiding battery listings that lack required EPR registration, and Amazon has a dedicated seller-facing field for uploading a Battery EPR registration number. Shopify already has an EU compliance settings section (Settings → Markets → EU) for responsible-person info and surfaces compliance metadata at EU checkout.
- **Strategic implication:** this validates "build the Amazon/eBay/Shopify plugin soon" as a real priority, not just a nice-to-have roadmap item — the platforms are moving on adjacent (EPR) requirements faster than a standalone demo-client effort would need them to, and full DPP-specific gating is a plausible near-term extension of the same pattern.

Sources: [Minefield Navigator — Battery Directive Compliance for Amazon Sellers](https://minefieldnavigator.com/en/knowledge-base/battery-directive-compliance), [SellerGuardrails — EU product compliance for online sellers 2026](https://sellerguardrails.com/guides/eu-product-compliance-for-online-sellers/), [DAM Law Firm — EU Batteries EPR: Day-After Enforcement](https://damlawfirm.com/blog/eu-batteries-epr-day-after/)

---

## 14. China / PRC Sourcing Opportunity — and an Open Legal Question

Sean's question: most of these batteries are manufactured in China — what B2B platform do Chinese manufacturers use, and should SOCIII build a presence there too?

**What exists, verified this session:**
- **B2B marketplaces** — Alibaba.com (international-facing), 1688.com (Alibaba's domestic-China wholesale marketplace), Made-in-China.com (export-facing directory). All three are sourcing/discovery marketplaces, not transactional checkout platforms with an app ecosystem — the Shopify/Amazon/eBay "build a plugin" model doesn't map onto them the same way.
- **China already runs its own mandatory battery passport system.** MIIT (Ministry of Industry and Information Technology) has operated a national NEV power battery traceability platform since 2018, with an expanded, more strictly mandatory version launched **1 April 2026** — every EV battery gets a "Digital ID," and no EV may legally be sold in China without one. Manufacturers, importers, and recyclers report across the full lifecycle. ([China Daily — "Digital IDs" for EV batteries](https://www.chinadaily.com.cn/a/202601/27/WS6978270aa310d6866eb35f2e.html), [CarNewsChina — national battery traceability platform, mandatory April 1 rollout](https://carnewschina.com/2026/04/01/china-launches-national-battery-traceability-platform-with-mandatory-april-1-rollout/))

**The actual opportunity this creates:** not competing with or integrating directly into MIIT's platform (a sovereign government system SOCIII almost certainly has no access to), but recognizing that Chinese battery manufacturers exporting to the EU (CATL and others already named as target suppliers in CODEX 31) **already collect most of this lifecycle/traceability data domestically for MIIT.** Supply Chain Tracer's pitch to them becomes "resubmit the lifecycle data you already report domestically, reformatted for your EU export customers" rather than "start tracking data you've never tracked" — a meaningfully easier ask. This is a real differentiator worth building into the Best Practices documents (§12b) — Sean specifically flagged this manufacturer/distributor/buyer value chain as valuable content for the Compliance Readiness Guide and Supplier Data Submission Standard.

**Open legal question — sharpened, not resolved, by Elise's round-2 review — still needs real PRC-qualified counsel, not guessed here.** The general Data Security Law concern below is no longer the only relevant citation: Elise's Claude surfaced, and this session independently verified, a **live, specific, and very recent guideline**:

**Guidelines for Security of Automotive Data Cross-Border Transfer (2026 Edition)** — jointly issued **30 January 2026** by eight PRC ministries/departments including MIIT and the Cyberspace Administration of China (CAC). Applies to automotive data processors (manufacturers, parts suppliers, autonomous-driving/technology providers) across the full vehicle data lifecycle (R&D, manufacturing, connected-vehicle operations, OTA updates).

**Corrected after a second red-team pass — the original framing here overstated scope, re-verified directly:** "charge/discharge control and battery temperature control" is not a standalone battery/BMS-data category under this guideline. It applies specifically to **OTA (over-the-air) software-update source code**, and only counts as important data when it *simultaneously* involves: (a) upgrading vehicles operating within China, (b) remote-control functionality (excluding near-field communication), *and* (c) one of a list of safety-relevant vehicle functions — vehicle start/operation, power loss, emergency braking, cruise control, lane keeping, charge/discharge control, or battery temperature control. Charge/discharge and thermal control are two items in that safety-function list, not a general "battery telemetry is important data" rule — this is meaningfully narrower than routine SoH/BMS data of the kind this suite's Lifecycle Monitor tab produces. ([Data Compliance China — Guidelines for the Security of Automotive Data Export (2026 Edition)](https://datacompliancechina.com/laws/automotive-data-export-security-guidelines/); [King & Wood Mallesons — China's 2026 Automotive Data Cross-Border Transfer Guidelines](https://www.kingandwood.com/cn/en/insights/latest-thinking/chinas-2026-automotive-data-cross-border-transfer-guidelines.html))

**The recommendation to get PRC counsel still stands — but scope the engagement correctly.** Point counsel at "OTA update source code with remote-control + listed-safety-function overlap," not "battery/BMS data generally" — the earlier framing here could have misdirected the legal engagement toward the wrong scope entirely.

This raises the stakes specifically for **EV battery** data (as distinct from general industrial-battery data, which this guideline's scope is automotive-specific and may not cover as squarely) — get real PRC counsel before any EV-battery-specific supplier integration is built, and make sure whoever is engaged is pointed at this Jan 2026 guideline as the starting reference, not the general Data Security Law alone.

The general Data Security Law backdrop, for context: it requires a CAC security assessment before "important data" leaves the country generally. ([Arnold & Porter — China Clarifies Cross-Border Data Transfer Rules](https://www.arnoldporter.com/en/perspectives/advisories/2025/06/china-clarifies-cross-border-data-transfer-rules)) One structural point that meaningfully de-risks SOCIII's position either way: under Chinese law, cross-border transfer compliance burden falls on the **Chinese party doing the exporting** (the supplier), not on SOCIII as the foreign receiving party — the same burden any Chinese manufacturer already carries when sharing data with Western customers today. **Action needed:** get PRC-qualified legal counsel to review — citing the Jan 2026 automotive-data guideline specifically — before this becomes more than a talking point or gets built into any real supplier-onboarding flow.

**Do not** build or market anything implying a direct MIIT integration — position this purely as "reuse of data the supplier already assembles," never as SOCIII having special access to a Chinese state system.

---

## 15. Reference Data Model — Sample Battery Passport (from Elise's Claude)

Elise's own Claude Code session sent over a sample dummy battery passport JSON (`dummy-battery-passport.json`, received via WhatsApp), modeled on "the class of product Battlink-type suppliers place on the EU market" — a fictional stationary commercial/industrial energy storage unit. This is a genuinely valuable, independently-produced artifact worth treating as a real input to the Best Practices documents (§12b) and to Worker 2's eventual real data model, not just a curiosity:

- **It independently confirms the same 7-cluster structure** this codebase already uses (`dppComplianceBlock`'s `c1`–`c7`), sourced explicitly from the now-verified Battery Pass Consortium Content Guidance (§10 table above) — strong cross-validation that our architecture matches the real industry standard, from a source produced independently of this codex.
- **It models a materially more precise 3-tier access scheme than anything in our own docs today**: `public` (anyone scanning the QR code), `legitimate_interest` (technicians, recyclers, current owners, authorised repairers), `regulator_only` (notified bodies, market surveillance authorities, the Commission) — reusing the real GDPR-adjacent "legitimate interest" concept sensibly. Worth adopting this exact 3-tier naming rather than inventing our own.
- **It distinguishes `static` vs. `dynamic` fields per attribute** (dynamic fields explicitly marked "requires live BMS connection") — this maps directly onto our own Compliance Auditor (static intake) vs. Lifecycle Monitor tab (dynamic SoH) split inside the merged Passport & Registry Manager worker (§6), independent validation that the architecture is right.
- **It models an industrial (>2kWh) stationary storage product**, not LMT/EV — useful additional texture beyond Voltara BV's existing EV/Industrial/LMT mix, and directly relevant to Battlink's actual product category.

### 15a. V2 of the reference doc — migrated in from the now-retired CODEX 72 §5, since it was never actually duplicated here

**This content was previously only written into CODEX 72 §5, which is now retired — a second red-team pass caught two cross-references elsewhere in this document (§12b, §19b) pointing here as if this content already existed. It didn't. Migrated properly now, not just re-pointed.**

Elise's Claude sent a second, more developed sample (`sample-battery-passport-v2.docx`, saved at `docs/codex/reference/sample-battery-passport-v2.docx`). A genuine improvement over the v1 JSON above, not a duplicate:

- **Adds a `Responsible Party` column per field** — directly answers "who updates this" with a real allocation (Manufacturer / EU Importer-Economic Operator / Notified Body / Third-Party Verifier / Tier 1-2 Suppliers / Logistics Provider / Owner-Operator, depending on the field). Correctly notes the Regulation places *legal* responsibility on the economic operator regardless of who does the underlying data entry.
- **Adds an `Update Trigger` column**, with a genuinely useful regulatory nuance: Annex XIII 4(d) only requires dynamic data be kept "up to date," no numeric interval specified. **EUROBAT's industry interpretation** (reflected in this doc) is **event-triggered** updates (ownership transfer, refurbishment, significant maintenance) rather than a fixed schedule — appropriately caveated by its own source as "current defensible industry position, not confirmed final rule," since the Commission has signaled further guidance is still coming. Adopted with the same caveat in §19b's amendment-inclusion decision.

**What it still doesn't model — confirming §17's multi-party custody-access gap is real, not something either side missed:** "Logistics Provider" appears in this v2 doc only as a data input for the *carbon-footprint distribution-stage emissions* number — not as a party who logs the actual custody chain (left factory → customs-cleared → delivered to distributor → installed) as its own sequence of events. Even this more detailed, independently-produced document doesn't model custody transfer as a first-class event stream.

**Sean's strategic read (§12b) is grounded in this doc specifically:** the parties who'd carry the biggest burden for custody-event logging and telemetry reporting — small manufacturers, freight forwarders, distributors, installers — are, per this v2 doc's own responsible-party mapping, exactly the least sophisticated/resourced parties in the chain.

**Recommendation:** treat this file as a real reference artifact for whoever eventually writes the Best Practices documents (§12b) and for Worker 2's real JSON-LD generation work — not just a one-off sample. **Done:** a copy now lives at [`docs/codex/reference/dummy-battery-passport.json`](reference/dummy-battery-passport.json), so it doesn't stay stranded in a WhatsApp attachment folder.

---

## 16. Session Coverage Map (guard against recency bias)

Sean asked explicitly that nothing from earlier in this session get lost or overshadowed by whatever was discussed most recently. This map lists every substantive thread from the full session, in the order it happened, each pointing to where the detail lives:

1. **Worker consolidation, 5→3** (§6) — decided and built: Passport Builder + Registry Manager + Lifecycle Monitor merged into `eu-passport-registry-001`.
2. **Regulatory date/mechanism corrections** (§4, §9a) — registry launch is 20 Jul not 19 Jul; Feb 2027 deadline covers all three battery categories together, no separate LMT date; access is "verified economic operator" (eIDAS), not "allowlisting"; registry is a directory, not a data host.
3. **Marketing collateral overclaims found and fixed** (§9b) — whitepaper and sales one-pager corrected; `docs/marketing/dpp/*.md` checked and found not to have the same issue.
4. **Reseller economics (Decision B) resolved structurally** (§5, §12a) — Elise sets her own margin; platform floor stays $99/mo + seats + data + minting fee above threshold (exact threshold still open); worker stays marketplace-listed.
5. **Resourcing priority *partially* answered** (§12a) — corrected in a second red-team pass, which caught this exact section overstating resolution: DPP is confirmed Tier 1 alongside Ruthie's nursing suite (Title Co. Texas, Scott's SF RE firm, and Sean's personal aviation suite are Tier 2) — but the concrete engineer-hours commitment behind that ranking is **still not answered**, only the relative tier ranking is. Don't treat this as fully closed.
6. **Best-practice documents escalated from "plan" to "build as much as possible"** (§12b, §14) — market-establishing opportunity since no ISO/private standard exists yet for supplier attestation format specifically.
7. **Studio Locker document plan** (§10) — sourced links per worker, honestly flagging what couldn't be verified rather than guessing.
8. **Demo-client site scope and testing approach** (§12c, §12d) — both a public passport viewer and a manufacturer self-service ingestion path are in scope; testing converged on platform sandboxes (Shopify dev store, Amazon SP-API sandbox, eBay Developer sandbox), not a real dropship/retail business; real-world validation via one design-partner brand through Elise's network.
9. **Competitive landscape + enforcement mechanism** (§13) — Staxxer (VAT/EPR automation, not a DPP competitor) flagged by Elise; enforcement confirmed as both government- and already-live platform-level gating (Amazon/eBay already deactivating listings lacking EPR registration).
10. **China/PRC sourcing opportunity + open legal question** (§14) — MIIT's existing mandatory domestic battery traceability platform makes Chinese-supplier onboarding easier (reuse, not new tracking). **Corrected in a third red-team pass, which caught this line repeating the same staleness pattern as item 5 above:** the legal-risk scope is narrower than "battery/BMS data generally" — it's specifically OTA update source code with remote-control + listed safety-function overlap (§14). Still needs real PRC counsel, now correctly scoped.
11. **Reference data model from Elise's Claude** (§15) — independent cross-validation of the 7-cluster / 3-tier / static-dynamic architecture, plus the newly-verified Battery Pass Consortium sources.

**Nothing above has been demoted or dropped in favor of the China/legal discussion just because it happened most recently** — all eleven threads carry equal standing as open items or shipped decisions, tracked at their respective section references.

---

## 17. Static Attributes vs. Custody Events vs. Telemetry — Architecture Clarification (and Patent Framing)

Sean's question, prompted by the sample JSON (§15): clarify static vs. dynamic data using a concrete example — "manufacturing the product" vs. "product left factory in China, delivered to Rotterdam, installed in a medical device" — and who is responsible for updating each.

**The sample JSON's binary (`static` / `dynamic`) collapses several genuinely different things. Elise's round-2 review (via her Claude) refined this further — the model is now four categories, not three:**

1. **Static attributes** — set once, by a single "manufactured" event, never overwritten again for that serial number (chemistry, rated capacity, manufacture date). **Responsible party: the manufacturer.**
2. **Custody/lifecycle events** — Sean's Rotterdam example. A chain of discrete, one-time custody-transfer events: manufactured → shipped from factory → customs-cleared/imported → delivered to distributor → installed → (later) serviced → end-of-life. **This is architecturally identical to chain-of-title in real estate** — a sequence of transfers, each an immutable append, with "current status" derived by reading the latest event rather than updating a field. This is a stronger, more explicit patent-framing point than the whitepaper currently states outright: the same append-only, event-sourced architecture applies to physical custody, not just property ownership — worth making this connection explicit in patent claims and in the whitepaper, not just implied.
3. **Telemetry/dynamic measurements** — live-BMS-connected values (state of health %, cycle count), appended on an ongoing cadence, where "current value" = most recent reading.
4. **Periodic attestation/recalculation data** (new, from Elise's round-2 review) — fields like carbon footprint totals, third-party verification status, and due-diligence policy summaries. These aren't static (they do get updated), aren't custody events (nothing changes hands), and aren't telemetry (no BMS involved) — they're updated on a **compliance calendar** (annual audit, recalculation cycle) by a **different responsible party** (auditor, verifier) than whoever made the original entry (manufacturer). Forcing these into "static" implies they never change; forcing them into "dynamic" implies event/telemetry-driven updates. Neither is right — this needed its own bucket.

**Boundary case worth documenting per-field, not left implicit:** the "second-life suitability reassessment" field changes over time (making it look dynamic) but its trigger is a custody event (ownership transfer for second-life use), so it belongs in category 2, not 3 — per Elise's review. Expect more of these judgment calls once the real data model is built; each should be documented explicitly rather than inferred from the field name.

**Responsibility is not one party per category 2 — it's inherently multi-party**, unlike categories 1, 3, and 4:
- Manufacturer logs "left factory."
- A freight forwarder or customs broker logs import clearance — this is literally the sample JSON's `economic_operator_placing_on_market` field (its example: "Sample EU Importer B.V., Rotterdam, Netherlands" — matches Sean's example exactly).
- A distributor logs receipt.
- An installer or OEM — potentially a completely different company than the original manufacturer (e.g. a medical device maker integrating a purchased battery component) — logs installation.

**Product implication — a real architecture gap, confirmed independently by Elise's own more detailed v2 sample (§15), not a naming detail:** Supply Chain Tracer's planned access model (Firebase `role: supplier`, spec'd not built per §2) is currently scoped only to raw-material/component suppliers. Category 2's multi-party custody chain means the same kind of scoped, limited-access contributor role is also needed for freight forwarders, customs brokers, distributors, and installers — none of whom are "suppliers" in the materials-sourcing sense CODEX 31 was written around.

**RESOLVED — don't design this bespoke. Adopt GS1 EPCIS 2.0.** Elise's round-2 review identified directly relevant prior art, independently verified this session: **EPCIS 2.0** is an open, royalty-free GS1 standard (ratified June 2022) purpose-built for exactly this problem — multi-party custody events (shipping, receiving, transformation, transaction) captured as a standardized "who, what, when, where, why" event stream, with native source/destination party typing (`owning_party`, `possessing_party`, `location`) that directly models the manufacturer → freight forwarder → customs → distributor → installer chain. It's already the standard underlying pharma chain-of-custody (DSCSA) and food traceability (FSMA 204), supports JSON-LD and REST natively, and pairs directly with GS1 Digital Link — already in this architecture. One source found during verification states GS1's own provisional DPP standard **requires** DPP data be backed by EPCIS 2.0 events as the evidence layer — meaning this may not be optional prior art to consider, but the standard this suite needs to align with regardless. ([GS1 EPCIS and CBV Implementation Guideline](https://www.gs1.org/standards/epcis-and-cbv-implementation-guideline/current-standardd); [Brevitaz — GS1 DPP Provisional Standard: What It Actually Requires](https://brevitaz.com/blogs/gs1-dpp-provisional-standard-what-it-requires))

**Action:** before designing Supply Chain Tracer's access model further, evaluate adopting EPCIS 2.0's event schema directly. This likely collapses "how do non-supplier contributors get scoped access" into the much narrower problem of "how do we let each party post an EPCIS-shaped event" — an existing schema plus an access layer on top, not a bespoke role/permission system from scratch.

---

## 18. GDPR Flag — New, From Elise's Round 2 Review

If a custody event (§17, category 2) ever logs a **named individual** — a specific installer, technician, or driver — rather than just a company/role, that's personal data flowing through a system mostly designed around product-compliance law, not data-protection law. **Not yet assessed.** Needs a short GDPR pass once the custody-event schema is actually designed (likely alongside the EPCIS 2.0 evaluation, §17): who is the data controller for an event-log entry containing a named person, and does it need retention/access rules distinct from the product-compliance data around it. Flagging now so it's designed in from the start rather than retrofitted.

---

## 19. Finalized Pricing Model (2026-08-13 pricing thread)

This thread ran long and self-corrected twice — worth recording the reasoning, not just the final numbers, since a later reader (or red team) should be able to see why each figure is what it is.

### 19a. The tier structure

**A second red-team pass flagged that the hard rule below lived only in prose, two paragraphs down — invisible to anyone who reads only the table (a salesperson, Elise, a future editor could quote these prices without ever seeing the hold). Status is now in the table itself:**

| Tier | Products included | Price | Status |
|---|---|---|---|
| Base | up to 20 | $99/month | ✅ Approved for use |
| Growth | up to 500 | $999/month | 🛑 **NOT APPROVED — do not quote externally** |
| Scale | up to 1,000 | $1,799/month | 🛑 **NOT APPROVED — do not quote externally** |
| Enterprise | over 1,000 | Custom — talk to sales | N/A — no fixed price to misquote |

Plus: **5 seats included at every tier** (platform-wide policy, not DPP-specific — see §19b), **+$5/month per seat** beyond 5.

**How this was derived, and its confidence level — corrected after a self-red-team pass caught a cherry-picked margin claim:** the $99/20-product base tier is high-confidence — low stakes, easy to sanity-check. The $999 and $1,799 tiers are **provisional, built on a chain of estimates**: $0.001/token real mint cost (confirmed by Sean) → an assumed ~500–2,000 tokens per full Annex XIII registration record (not measured, a guess) → ~$0.50–$2 real cost per registration.

**Correction:** an earlier version of this section claimed the tiers sit at "roughly 1.3–3x" that estimated cost. That's only true at the *low* end of the same $0.50–$2 range this document itself states. Checked honestly across the full stated range:
- Growth tier (500 products, $999/mo): at $0.50/product → $250 cost, 4.0x margin. At $2/product → **$1,000 cost against $999 revenue — a loss.**
- Scale tier (1,000 products, $1,799/mo): at $0.50/product → $500 cost, 3.6x margin. At $2/product → **$2,000 cost against $1,799 revenue — a $201/month loss.**

So the honest statement is: **these tiers range from a solid margin to a real loss, depending on where the true token count falls within the range this document already admits is a guess** — not "1.3–3x margin" as previously stated. That's the same shape of error as the mint-cost-vs-token-cost unit confusion earlier in this session (a favorable number presented with more confidence than the underlying estimate supports), just softer. This calculation also still excludes AI-compute/support overhead entirely, so even the "safe" scenarios have less real margin than the raw numbers suggest.

**HARD RULE, per Sean, 2026-08-13 — overrides everything else in this section:** *"Do not put out anything that causes us to slip below a big margin — or worse, lose money."* This is a non-negotiable constraint on publishing, not a preference. Concretely:

- **The Growth ($999) and Scale ($1,799) tier prices must NOT be quoted, published, or used in any pricing page, sales conversation, or customer-facing material** until the token-count and turnover unknowns above are resolved with real data. As shown above, they are demonstrated to be **actual losses**, not just thin margins, at the pessimistic end of this document's own stated cost range — that is exactly the outcome this rule prohibits. "Provisional, needs validation" was too soft a framing for a scenario that includes losing money; this is a hold, not a caveat.
- **The Base tier ($99/20 products) is the only one of the three with a safety margin at the pessimistic end of the same estimate** — 20 × $2 (worst case) = $40 cost against $99 revenue, ~60% margin, still profitable even if the token-count guess is wrong in the expensive direction. It's the only tier that could reasonably be soft-launched on the current estimate, and even it hasn't been *confirmed*, just shown to have a smaller downside.
- **Before Growth/Scale can be published:** get an actual measured token count from a real registration event, and real monthly new-product turnover data (registration cost is one-time per product, but tier price is recurring monthly — those don't reconcile without a turnover estimate). Ideally validated via the design-partner brand once in place (§12d). Until then, treat them as **not approved for external use**, and if a number is needed sooner, recompute a floor price that stays profitable at the *pessimistic* end of the cost range ($2/product), not the midpoint or optimistic end — the mistake corrected above.

**Second red-team pass (external, from Elise's side, cross-checked against this codex's own record) found two more real gaps in this section, not caught by the internal self-red-team:**

1. **This cost model only prices the initial registration — it was never reconciled with the EPCIS 2.0 adoption decision (§17), which was made in the same session and affects the same P&L.** §17 resolves to adopt GS1 EPCIS 2.0 for custody events, meaning every shipment, customs clearance, delivery, and install becomes its own logged event. Whether those events are billed as separately metered mints or bundled as "included" (as amendments now are, §19b), there is currently **no per-EPCIS-event cost, and no blockchain-anchoring cost per event, factored into this section's math at all** — the $0.50–$2/product estimate is registration-only. If custody events end up bundled into the subscription the same way amendments were, the Base tier's "~60% margin even at the pessimistic end" claim is likely optimistic once ongoing custody/telemetry compute and anchoring costs are actually added — not just the registration line this section currently models.
2. **"$0.001/token" was confirmed as an LLM-generation-token cost — it was never confirmed whether it also includes the separate Base-chain anchoring/gas cost that "minting" implies elsewhere in this platform's terminology (CODEX 36).** If anchoring is a second, separate cost line not captured in the $0.001/token figure, that changes the cost estimate at its foundation, not just within the range already being treated as uncertain. **Needs a direct one-line confirmation from Sean**: does $0.001/token already include Base-chain anchoring cost, or only the LLM generation cost that produces the record's content?

**Also flagged, worth Sean's input rather than resolved here:** the "hold Growth/Scale entirely" response to the loss scenario may be broader than the actual risk. Registration cost is one-time per new GTIN (§19c) — a genuinely loss-making month only happens when a customer registers a large batch of new products in the same billing period (e.g., a large customer's first onboarding month), not in ongoing steady state once a catalog is established. A narrower fix — a separate bulk-onboarding fee for large initial catalogs, decoupled from the ongoing subscription price — might resolve the real risk without indefinitely blocking two tiers the business likely needs. **The hard rule in this section stays in force until Sean decides between "hold the tiers" and "add a bulk-onboarding fee instead"** — this observation narrows the problem, it doesn't loosen the rule on its own.

**Marketing collateral checked against the hard rule — flagged repeatedly across red-team rounds as an unchecked box, now actually done and documented (not just performed silently and left unrecorded, which is why it kept getting re-flagged):** grepped `docs/whitepapers/`, `docs/sales/dpp-one-pager.md`, and `docs/marketing/dpp/*.md` for the Growth/Scale figures ($999, $1,799) — clean, neither number appears anywhere. **However, this check surfaced a separate, more serious, pre-existing problem**: `docs/marketing/dpp/{one-pager,whitepaper,deck}.md` contained an entirely different, older 2-tier pricing scheme ("$49/month, one category, up to 500 SKUs" / "$99/month, all categories, **unlimited SKUs**") that predates this whole pricing thread and was never reconciled with it. "$99/month, unlimited SKUs" is not merely inconsistent with today's tiers — given everything computed in this section, it's **demonstrably unsafe under the hard rule**: no ceiling on real per-product cost against a fixed low price. This was live in real marketing files, not just an internal draft. **Fixed immediately rather than left pending full reconciliation** (all three files now say "$99/month, up to 20 products, larger catalogs contact us," matching the one tier actually approved — with an inline note in each file flagging the change and warning against re-adding an "unlimited" claim at any fixed price). The whitepaper's own "47 SKU medical device" worked example also quoted a specific "$99/month" cost for a product count that exceeds the approved 20-product tier — that specific cost figure was removed from the example rather than left to imply Growth-tier pricing that isn't approved yet.

### 19b. What's included in the subscription — and what changed from the original CODEX 36 model

**Amendments/updates: unlimited, included in the subscription — no separate per-event fee. Correction after self-red-team: the safety argument below was false as originally stated, and this decision should be treated as conditional, not settled.** This replaces CODEX 36 Dimension 3's existing **€20-per-lifecycle-amendment** fee (set 2026-07-12).

**Original rationale (kept for the record, then corrected):** amendments are gated to *material* events only (ownership transfer, refurbishment, significant maintenance — the EUROBAT event-triggered interpretation from the v2 reference doc, §15, **not §17 as an earlier draft of this paragraph incorrectly cited** — §17 never mentions EUROBAT; this is a second-red-team catch, orphaned cross-reference now fixed), so "unlimited included" isn't the same as "unlimited and abusable" because "the RAAS rules already prevent frivolous/frequent fake amendments from being valid events in the first place."

**That claim is false today, and it's the exact "canvas ≠ functional" mistake §3 warns about, made by a later section of this same document.** Per §2's own inventory: Worker 2 (Passport & Registry Manager, which owns all amendment/lifecycle-event handling) is a static canvas, spec-only, not built. The one real RAAS ruleset that exists (`eu_battery_dpp_v1.json`) is scoped to Worker 1 (Compliance Auditor / data intake) — nothing today enforces "material events only" for amendments, because the amendment-processing backend doesn't exist yet. Separately, even once built: "material" is inherently judgment-based (ownership transfer, refurbishment, "significant maintenance" aren't bright lines), so a large industrial customer with genuinely high, entirely legitimate maintenance/ownership-transfer frequency could generate real cost exposure with zero abuse involved — and since the €20 fee was retired with no replacement metering, there's currently no mechanism bounding that exposure at all.

**Revised position:** don't treat "unlimited amendments, included" as finalized. Either (a) build and ship the material-event gating rule for the Passport & Registry Manager worker *before* retiring the per-amendment fee in practice, or (b) keep a soft cap (e.g., a generous per-product-per-year included allowance, with a real fee only beyond that) as an interim safeguard until (a) exists. Charging per-amendment forever does re-introduce the nickel-and-diming this session has been designing away from — that reasoning still holds — but "unlimited and currently ungated" is a real, uncapped cost exposure, not a solved problem.

**Registration: one-time fee, per new product only — this is the only fee that survives from CODEX 36's original Dimension 3 model.** The €75 "DPP initial passport registration" figure from CODEX 36 is explicitly value-calibrated, not cost-calibrated (its own text: "reflects the gap in business value, not the gap in compute cost") — that reasoning still holds; nothing here changes the €75 figure itself, only confirms it's the sole remaining per-event fee, and clarifies exactly what counts as triggering it (§19c, §20).

**Done, not "not yet done" — corrected after self-red-team caught this exact staleness.** CODEX 36 §3 Dimension 3 has already been edited: the €20 amendment fee row is struck through, marked "RETIRED 2026-08-13," and cross-references this section. An earlier draft of this paragraph said "action needed, not yet done" and left that claim in place after the edit was actually made — the same species of stale/contradictory claim Elise's round-2 review caught once already (the Decision B "resolved" mislabeling, §12a), just self-inflicted this time instead of caught externally. Given the correction in the paragraph above (this decision is conditional, not settled), the CODEX 36 edit itself may need a further follow-up once the material-event gating question is resolved — but the edit described here is real and already made.

### 19c. What counts as "a new product" — GTIN, not SKU, and not every GTIN either

**SKU doesn't matter for billing at all.** A SKU is a purely internal, company-invented inventory label with no external standard — two companies' SKU schemes have no relationship to each other, and a customer could structure theirs however they like without it affecting anything SOCIII bills.

**GTIN (GS1's globally standardized identifier) is the right base unit** — it's what the EU registry, GS1 Digital Link, and this whole architecture are already built around, and GS1 itself publishes rules (the GTIN Management Standard) for when a new one is actually required, so it isn't arbitrary the way SKU is.

**But not every new GTIN should trigger the full registration fee or count as a new product against the tier quota — see §20.** A new GTIN that's a cosmetic or dimensional variant of an already-registered product (new color, new size) shares almost all of its real compliance data with the parent and shouldn't be billed as if it were independently sourced and verified from scratch.

---

## 20. Product Family / Compliance Profile — Cross-Vertical Architecture Principle

Stress-tested across industries at Sean's request, since Elise wants to pivot into fashion quickly and this pattern turns out not to be DPP- or battery-specific at all.

### 20a. The problem, generalized beyond batteries

A battery "color variant" (§19c) is the mild version of a pattern that becomes the **structural norm**, not an edge case, in several of the exact product categories ESPR is already rolling DPP out to:

- **Fashion/textiles** (ESPR target, per the whitepaper's own roadmap) — one "style" routinely becomes 20–30 GTINs (5 colors × 6 sizes), all sharing the same fabric composition, same factory, same supply chain, same carbon footprint calculation.
- **Electronics** (ESPR target) — storage-capacity variants can be materially different (more/different materials); color variants are purely cosmetic. Both get separate GTINs; only one of them represents real new compliance work.
- **Construction products** (ESPR target) — dimensional variants of the same material composition; quantity scales, composition doesn't.
- **Furniture** (ESPR target) — color/upholstery and configuration (2-seat vs. 3-seat) variants, usually sharing sourcing and materials.
- **Auto parts** (not yet an ESPR/DPP target, but worth naming as the extreme case if this vertical ever gets built) — the exact same physical part frequently gets a different GTIN purely for vehicle-fitment/catalog-compatibility reasons. Potentially the highest GTIN-to-real-product ratio of any category named here, since fitment listings can multiply without any physical difference at all.

If billing naively counted every GTIN as a full new product, a genuinely small fashion brand with ~50 styles could have 1,000+ GTINs and get pushed into "enterprise custom pricing" (§19a) despite being exactly the small-business customer this pricing model exists to serve. This isn't a hypothetical risk confined to batteries — it would make the pricing model broken for an entire future vertical on day one.

### 20b. The generalized rule

**The test is not "is this the same product line" or even "does GS1 require a new GTIN" — it's "does this variant require independently-sourced, independently-verified new compliance data, or does it inherit the parent's."** A four-way taxonomy, applicable across every vertical named above:

1. **Cosmetic variants** — color, finish. Shares ~100% of compliance data with the parent. Cheapest case — should be free or near-free to add, no tier-quota impact.
2. **Dimensional/quantity variants** — size, pack size, capacity that scales linearly without changing composition. Shares supply chain and material composition; only quantity-derived numbers (weight, a linearly-scaled carbon footprint) need light recalculation from the parent's data, not independent sourcing. Cheap, not free — a "scaled from parent" calculation, not a fresh registration.
3. **Fitment/catalog-alias variants** — same physical item, different GTIN purely for a market/compatibility listing. Zero difference in regulated data. Should be the cheapest case of all, cheaper even than a cosmetic variant, since literally nothing about the product differs.
4. **Materially different variants** — genuinely different chemistry, composition, or sourcing. This is the only case that should trigger the full one-time registration fee (§19c) and count as a new product against the tier quota, regardless of vertical.

**This taxonomy is not as clean as it looks — self-red-team found real ambiguity in the flagship vertical itself, not just in hypothetical future ones.** Concrete counterexample in batteries: a higher-capacity version of the same product line (e.g., 100kWh vs. 120kWh, same chemistry, same factory, more cells) — is this category 2 (dimensional, cheap) or category 4 (materially different, full fee)? Capacity, cycle life, and warranty are explicitly regulated Annex XIII performance/durability data requiring real verification, not just "scaled from parent" arithmetic — yet chemistry (this section's own stated test for "dimensional") is unchanged. The rule as stated doesn't cleanly resolve this. The same ambiguity recurs in electronics (a product that varies on *two* axes in one GTIN — color *and* storage capacity — isn't addressed; real products often vary on multiple axes at once, not the single axis this taxonomy implicitly assumes) and in construction (dimensional variants that are also thermal-performance-relevant, not just quantity-scaled).

**No verification or dispute mechanism is described for a classification that determines real fee dollars.** As written, category classification is self-reported by the customer (or whoever operates Passport & Registry Manager on their behalf). This platform's own RAAS rules elsewhere explicitly guard against "fabricated compliance" and "invented" claims (`dpp-no-fabricated-compliance`, `eu_battery_dpp_v1.json`) — it's a real gap that this classification step has no analogous check, audit trail, or dispute-resolution process. A customer motivated to avoid the registration fee has a direct incentive to call a materially-different variant "cosmetic" or "dimensional," and nothing described here would catch that.

### 20c. Product implication

This needs to be a **first-class, cross-vertical data-model primitive from day one** — a "product family" (or "compliance profile") object that GTINs attach to, each tagged with a relationship type (cosmetic / dimensional / fitment-alias / independent) that determines both what compliance data can be inherited and what gets billed. It should not be designed as a battery-specific bolt-on, given Elise's stated intent to move into fashion soon — retrofitting this after the fact would be far more expensive than building it in from the start. Worth checking, when the textile vertical actually gets built, whether fashion/retail's existing informal "style number" / "parent style" concept can be mapped onto this directly rather than inventing a parallel SOCIII-specific taxonomy. **Given the ambiguity above, this data model needs an explicit classification-review/audit step built in from the start, not bolted on after a dispute — this is not a detail to defer.**

**Not yet built. Not yet assessed against GS1's own variant/hierarchy standards** (worth checking whether GS1 already has a supported way to model parent/variant relationships before designing one from scratch — the same "check for prior art before building bespoke" discipline that led to the EPCIS 2.0 recommendation in §17).

**Verified this round, and it matters: GS1's identifier-modeling capability is not the same question as the EU registry's legal/billing treatment, and only the first has been checked.** GS1 does have real, relevant infrastructure — a documented granularity model (GTIN + version code for product-model variants, GTIN + lot/batch, GTIN + serial for item-level) recognized under ESPR. ([GS1 Standards Enabling the EU Digital Product Passport](https://gs1.eu/wp-content/uploads/2024/12/GS1-Standards-Enabling-DPP.pdf)) That confirms GS1's *identifier scheme* can technically represent a variant hierarchy — genuine, useful prior art, consistent with the EPCIS 2.0 finding elsewhere in this codex. **It does not confirm that the EU DPP Central Registry's actual registration process treats a "family" as one billable, one-registration-satisfies-many-GTINs event.** Those are two different questions — technical identifier modeling vs. regulatory registration unit — and only the first has been verified. **If the registry actually requires an independent registration action per GTIN regardless of shared underlying data (plausible, unconfirmed), the "free/cheapest case" framing above for cosmetic and fitment-alias variants is wrong at the registry-interaction level even if it's right at the internal-data-cost level** — SOCIII could still owe a real registry-side action (and therefore real cost) per GTIN even when treating it internally as "the same family, no new work." This needs explicit regulatory confirmation before the billing model is finalized, not inference from GS1's identifier standard alone.

**Not addressed anywhere in this codex, and it should be:** what happens when a classification turns out to be wrong after the fact. Two distinct failure modes, neither designed for: (a) a product billed as "materially different" (full €75 paid) is later found to actually be a variant of an existing registration — a refund/credit question; (b) a "free" cosmetic variant is later found to differ materially (under-declared, whether by error or incentive per the gap above) — this is not just a billing dispute, it's a potential **regulatory-compliance failure for the customer** if the EU registry treats it as one legal registration when it should have been two, which is a bigger problem than a SOCIII revenue question. Neither scenario has a described process. Separately, smaller but real: CODEX 36's minting fee is denominated in EUR (€75) while the CODEX 71 subscription tiers (§19a) are in USD ($99/$999/$1,799) — no stated policy for how these reconcile on a single EU customer's bill; CODEX 36's existing FX handling covers compute credits only, not this newer mixed structure.

---

*This codex is a synthesis and strategy document — this is now the single authoritative document for the DPP suite (CODEX 72's round-2 briefing was retired 2026-08-13, superseded by this file — per Sean, everything stays in one place going forward). See §16 for the full session coverage map (note: §16 predates §17–20 and hasn't been re-walked to include them). §17–20 (architecture, pricing, product-family) were self-red-teamed after drafting (via an independent fork, not just re-reading my own work) and the pass found real problems, now corrected in place rather than just listed here: a cherry-picked tier-margin claim that was actually a loss at the pessimistic end of the document's own cost estimate (§19a); a false claim that RAAS rules already gate amendments against abuse, when the enforcing worker isn't built (§19b) — the "unlimited amendments" decision is now marked conditional, not settled; a stale "not yet done" claim about the CODEX 36 edit that had, in fact, already been done (§19b); and in §20, a real classification ambiguity in the flagship battery vertical itself (capacity variants), a conflation of GS1's identifier-modeling capability with an unconfirmed assumption about the EU registry's actual billing/legal treatment of variant families, no described mechanism for disputing or auditing a self-reported classification with real fee stakes, and no treatment of reclassification/refund scenarios or the EUR/USD pricing mismatch between CODEX 36 and this codex's tiers. All are now reflected in §19/§20 directly, not just noted here.

**Standing hard rule, per Sean, 2026-08-13 (§19a): do not publish or quote any DPP pricing that risks a thin margin or a loss.** The Growth ($999) and Scale ($1,799) tiers are explicitly **not approved for external use** until validated against real cost data — they are shown, not just suspected, to be potential losses at the pessimistic end of this document's own cost estimate. Only the Base tier ($99/20 products) has a demonstrated safety margin at that same pessimistic end. This rule overrides any earlier framing in this document that treated the Growth/Scale numbers as merely "provisional."

**Third red-team round (2026-08-13, two independent passes — one internal fork, one external from Elise's side — run in parallel, findings reconciled together) caught, and this document now corrects:** CODEX 36 still repeating the false amendment-gating claim after CODEX 71 §19b had already corrected it here (fixed in both places now); the hard pricing rule living only in prose and not in the tier table itself (now a status column in the table, §19a); the China important-data claim overstating scope — it's OTA update source code with remote-control + listed safety-function overlap, not general battery/BMS telemetry (corrected, §14); a stale CSDDD citation that didn't reflect the Feb 2026 Omnibus I amendments narrowing its scope and pushing dates to 2028/2029 (corrected, §10); an orphaned EUROBAT citation pointing at §17, which never mentioned it (content was actually only in the now-retired CODEX 72 §5 — migrated into §15a rather than just re-pointed); the pricing model and the EPCIS-adoption decision never having been reconciled with each other, meaning the cost estimate only prices initial registration, not ongoing custody/telemetry events (flagged, §19a); an unresolved ambiguity in whether "$0.001/token" includes Base-chain anchoring cost or only LLM generation cost (flagged as a direct question for Sean, §19a); a live, unresolved blockchain-anchoring claim in the actual customer-facing sales one-pager — checked directly against the code and confirmed NOT wired for DPP (fixed in `docs/sales/dpp-one-pager.md`); and a §16/§12a internal contradiction over whether the resourcing question was fully answered (it wasn't — only the tier ranking was). A narrower alternative to the blanket Growth/Scale hold — a separate bulk-onboarding fee for large initial catalogs — was proposed and is Sean's to decide; the hard rule stays in force either way until he does.

Decisions still made or resolved: the 5→3 worker consolidation (§6, built), the regulatory-date corrections (§9a), Decision B's structure (§5/§12a). Remaining open, now including the corrections above: Decision A (§5), unit-economics validation for the Growth/Scale tiers before they can be used anywhere (§19a — hard blocked, not just open), the bulk-onboarding-fee-vs-blanket-hold decision (§19a), the $0.001/token anchoring-cost question (§19a), the amendment-gating build-or-cap decision (§19b), registry allowlisting timing (§8), formal `creators/elise-*` onboarding (§8), the best-practice documents (§12b), the parallel real-third-party custody UX test (§12d), the China cross-border data legal question with counsel — now correctly scoped to OTA source code (§14), the GDPR assessment (§18), Sean's concrete engineering-hours commitment (§12a), regulatory confirmation of the registry's variant-billing treatment (§20), a classification-dispute/audit mechanism (§20), reclassification/refund handling (§20), and the EUR/USD pricing reconciliation (§20).*
