# CODEX 75 — DPP Suite: Product Build Priorities (Post-Scoping)

**Status:** SPEC — for Sean's review; nothing below has started
**Suite:** EU DPP
**Date:** 2026-08-24
**Trigger:** Follow-up to CODEX 74 (Shopify/Amazon integration scoping). Sean's read on that research: the product needs real work before marketing claims get ahead of it — "it sounds like our product is better as it's more comprehensive... let's do that work." This CODEX is that work, sequenced. Also corrects a naming error introduced in the same session (§1).

---

## 1. Correction: Elise's real company is Traitly — "Volta Advisory" and "Volta Energy" are fictional demo names

CODEX 74 and an earlier same-session Amazon Service Provider Network (SPN) email draft both referred to Elise's consulting business as **"Volta Advisory."** That's wrong. **Volta Advisory / Volta Energy do not exist as real companies** — they're names used for the internal demo persona (alongside "Voltara BV," the fictional 6-SKU demo manufacturer seeded per CODEX 37). **Elise's real company is Traitly.**

This error was carried forward from this session's own memory of the EU data-residency planning work (`project_eu_data_residency_dpp.md`), which also used "Volta Advisory" incorrectly — that memory has been corrected as part of this CODEX.

**Practical consequence:** the Amazon SPN listing email drafted this session (originally addressed to Elise, proposing to list "Volta Advisory" on Amazon) has been **held, not sent**, and redirected to Sean's own inbox for review with the name corrected to Traitly throughout, including the draft listing copy. Do not send anything externally under "Volta Advisory" or "Volta Energy" — those names should never appear outside the internal demo environment.

---

## 2. Amazon SPN — status, unchanged in substance

The underlying recommendation from CODEX 74 §15 stands: list Elise's real company (**Traitly**) on Amazon's Service Provider Network under "Compliance" (and consider "Sustainability"), so Amazon-seller inquiries route to her, not to SOCIII directly. This requires Elise's own business/identity verification — not something that can be done from this side. The corrected email is sitting in Sean's inbox as a draft for review before it goes to her.

---

## 3. Product Build Priorities — what's actually next

CODEX 71's own audit and CODEX 74's competitive research converge on the same conclusion: the *architecture* is ahead of competitors, but *shipped* depth is behind or level with several of them. These five items close that gap, roughly in dependency order — each one either unblocks the next or is a standalone fix with no prerequisites.

### 3.1 Parameterize the public passport viewer per-tenant/per-SKU
**Why first:** every downstream thing — a Shopify QR widget, an Amazon packaging label, a manually shared passport link — resolves to this route. It's currently unconfirmed whether `/v1/dpp:passport:public` (shipped 2026-08-20, commit `0dcaa085`/`015dede9`) accepts a tenant/SKU parameter or is still a single fixed demo page.
**Scope:** small — confirm current behavior first; if unparameterized, add tenant/SKU routing to an existing, working endpoint. Not a new build from scratch.
**Blocks:** everything that needs a real, product-specific QR code or shareable passport link.

### 3.2 Add missing `capabilities.json` entries for DPP/Shopify
**Why:** per this repo's own rule (`CLAUDE.md`: "if a capability is not declared there, it does not exist"), zero entries currently exist for `dpp`, `shopify`, `ecommerce`, or `marketplace`. Nothing that writes to a merchant's store or exposes new DPP actions can be called until these are declared.
**Scope:** small, mechanical — versioned entries, add-only per the registry's own rule. No design decision required beyond naming.
**Blocks:** any future Shopify-write work (whenever that's prioritized) and any new DPP worker tool that needs to be callable.

### 3.3 Wire existing on-chain anchoring into `dppProducts`/passport records specifically
**Why this matters more than it sounds:** CODEX 74 §14 confirmed zero competitors have any cryptographic tamper-evidence — the closest is an application-layer append-only Postgres table (PassportPro). SOCIII's anchoring tech (RFC-3161 timestamping + transparency log, no-crypto-by-default, per `trust-and-data-integrity.md` §3) is real and already live for other record types. It is **not yet confirmed wired into DPP passport records specifically.** This is the one item on this list that turns an architectural claim ("we're more comprehensive") into a demonstrable one.
**Scope:** medium — the anchoring mechanism exists; this is about routing passport create/amend events through it, not building anchoring from scratch.
**Blocks:** the "battery passport that can't be quietly altered" claim from being marketing copy instead of a checkable fact.

### 3.4 Real JSON-LD / Annex XIII passport generation
**Why:** this is the prerequisite for the single biggest available differentiator — actual EU DPP Central Registry submission, which **no competitor has built** (CODEX 74 §13.2, confirmed across all five). Right now, per CODEX 71 §2/§3, passport "generation" is still a static canvas mockup, not a real structured-data export.
**Scope:** the largest of the first four items — real schema work against the 7-cluster/90-attribute model, output as actual JSON-LD conforming to Annex XIII.
**Blocks:** real registry submission (§3.4 is a prerequisite for a future §3.6-type item — actual registry API integration — which isn't yet scoped at all and would need its own CODEX once SOCIII pursues "verified economic operator" registration, a legal/business step, not just engineering).
**Sequencing note:** this can start in parallel with 3.1–3.3; it doesn't depend on them.

### 3.5 Supply Chain Tracer — real supplier-side portal
**Why:** CODEX 74 §13.3's clearest finding — **zero of five Shopify competitors handle genuine multi-party supplier data collection.** The closest (SolveDPP) only does CSV import from a manufacturer, not an independent supplier login/attestation flow. This is SOCIII's most defensible gap to close, and the reason CODEX 31 spec'd Supply Chain Tracer as a separate worker with its own planned access mode in the first place.
**Scope:** the largest item on this list — a new user type (supplier), its own auth/claims (Firebase `role: supplier`, per CODEX 31), and a real attestation workflow, not just a data-entry form.
**Blocks:** nothing else on this list, but it's the highest-value standalone item for competitive differentiation once built.

### 3.6 Not on this list, deliberately: Shopify app build itself, Amazon SP-API integration
Per CODEX 74, the Shopify public app is real, scoped, buildable work — but it depends on none of the above being done first except loosely on 3.1 (the QR destination) and 3.2 (capability declarations). It's a separate, larger project (public Partner app, GraphQL Admin API, theme extension, App Store review) that should be its own build phase once Sean prioritizes it against the five items above, not bundled into "product work" implicitly. Amazon SP-API integration remains explicitly not recommended (CODEX 74 §7.6) — nothing to build against yet.

---

## 4. Recommended sequencing

```
3.1 (viewer parameterization) ──┐
                                 ├─→ unblocks Shopify/Amazon QR work whenever pursued
3.2 (capabilities.json)  ───────┘

3.3 (anchoring wired to DPP) ───────→ standalone, no dependents on this list

3.4 (real JSON-LD generation) ──────→ prerequisite for future registry-submission work (unscoped)

3.5 (Supply Chain Tracer portal) ───→ standalone, highest competitive value, largest lift
```

3.1 and 3.2 are small and low-risk — reasonable to start immediately without further discussion. 3.3, 3.4, and 3.5 are real engineering investments that compete for the same limited bandwidth CODEX 71 §12a already flagged as an open question ("what does 'Tier 1 priority' translate to in actual engineer-days?" — never answered as of CODEX 71). That question is still open and matters more here than it did in CODEX 71, since three genuinely large items are now queued behind it.

---

## 5. Open Decisions for Sean

1. **Confirm go-ahead on 3.1 and 3.2** — low-risk, no design decision needed beyond what's already specified above.
2. **Sequence 3.3 vs. 3.4 vs. 3.5** — all three are real, valuable, and independent of each other. Recommend picking one at a time rather than splitting effort three ways, given the still-unanswered engineer-days question from CODEX 71 §12a.
3. **Answer CODEX 71 §12a's carried-over question**: what does DPP's "Tier 1 priority" actually mean in engineer-days/week? This has been open since 2026-08-13 and now gates a real sequencing decision, not just a status question.
4. **Confirm the Traitly correction is complete** — check whether "Volta Advisory"/"Volta Energy" appear anywhere else customer-facing (they should only ever appear inside the internal demo environment) before any external document referencing Elise's business goes out.
