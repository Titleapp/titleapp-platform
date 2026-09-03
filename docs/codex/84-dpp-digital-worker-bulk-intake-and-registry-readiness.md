# CODEX 84 — DPP Digital Worker: Bulk Intake, Status-Check, and EU Registry Submission Readiness

**Status:** SPEC + real progress — one capability shipped, EU-hosting effort re-scoped and revised down; rest still for Sean's review
**Suite:** EU DPP
**Date:** 2026-09-03 (updated same day twice — red-team pass, then a build+research pass; see Revision Notes)
**Trigger:** After building and shipping the `sociii-dpp-passport` Shopify app (a per-tenant integration doing SKU-matched catalog display, self-serve regulatory-scope intake, and passport attach/status display), Sean asked whether the underlying Digital Worker (RAAS) platform has equivalent bulk product-inventory upload and status-checking capabilities — his read: "I think that is completely missing from our present digital worker." A same-session follow-up asked what's actually required to reach real EU DPP Central Registry submission, whether the registry exposes a callable API today, and — if not — how to deal with that. Sean asked both threads be tracked together in one Codex.
**Revision note (same day, red-team pass):** Two corrections from the first draft. (1) **Estonia reframed.** The first draft treated an Estonia entity as instrumental to eIDAS/"verified economic operator" credentialing. Per Sean, the actual driver is commercial optics (Elise's read that EU counterparties are reluctant to contract with a US entity) and EU data residency — separate from, and not gated by, registry credentialing. §5 is substantially rewritten. (2) **A sourcing error, caught by re-verification the red-team pass prompted:** the status-check capability was **not** a new gap — CODEX 74 §9.2 already proposed `ecommerce.shopify_passport_status_read_v1` (2026-08-24), which was also never built. §1 and §3 corrected below. Both corrections and the additional open items raised are folded in throughout rather than appended as a separate section, consistent with how CODEX 74 handled its own same-day corrections.
**Revision note 2 (same day, build + parallel research pass):** Sean asked to "build up what's scoped here" and, in parallel, to research what EU-region GCP hosting for DPP data actually requires. Two real outcomes: (1) `dpp.get_passport_status_v1` is now **implemented, not just proposed** — real route (`GET /v1/dpp:worker:passportStatus`) and a real `capabilities.json` entry, both shipped this pass (§4.2, §6 item 1). (2) The EU-hosting research (§5.1) came back more favorable than the 2026-08-18 estimate it was checking: the effort re-scopes to 1–3 days, not 2–4, and a materially new fact surfaced — forming the Estonia entity would independently eliminate the GDPR Article 27 requirement regardless of hosting decisions, a real (if secondary) link between Tracks A and the data-residency work that wasn't visible before.
**Revision note 3 (same day, resolved the last open build item):** Sean said "keep going" on the `imports/` vs. `dppImports` decision (§7 item 2) rather than waiting further, so it's resolved per the Codex's own already-stated recommendation: DPP gets its own `dppImports` collection now; the platform-wide `imports/` fix stays a separate, later item, unblocked from this. `dpp.bulk_intake_v1` is now **built**: real route (`POST /v1/dpp:worker:bulkIntake`), real `capabilities.json` entry, per-row accept/reject (not all-or-nothing), reuses `selfServeIntake`'s exact scope-determination logic rather than duplicating it, writes one `dppImports` doc per batch, and emits an event + audit record via the platform's existing `workerEventBus`/`auditTrailService` helpers — the same pattern `transactions.import_statement_v1` already established elsewhere. **Not yet deployed** — written and syntax-validated locally only; deploying to production Firebase Functions is a separate, explicit step, not taken here without confirmation.
**Note on numbering:** `docs/codex/00-INDEX.md` remains stale (last maintained through ~48); per CODEX 71/74/75 precedent, this doc doesn't attempt to repair it. 84 is confirmed the next unused number (83 is the UH Maui synthetic-testing doc, dated 2026-08-29).
**Research method:** two passes, plus a same-day verification pass prompted by red-team review. (1) An internal repo audit (delegated to a research sub-agent, cross-checked directly against CODEX 74/75 for the citations below) tracing the exact backend routes the new Shopify app calls, the Firestore collections/fields behind them, the DPP RAAS ruleset file, the platform-wide `imports/` collection and its only handler, and every `capabilities.json` entry that could plausibly relate to bulk import or status-check, across all verticals for comparison — not just DPP. (2) External web research (this session, direct) on the EU DPP Central Registry's actual technical access mechanism: eIDAS "verified economic operator" credentialing, Estonia-based qualified-seal issuance timelines, and whether the registry's API for economic operators is live. (3) Same-day: direct (non-delegated) re-verification of the two strongest absence-claims — repo-wide grep for Firestore triggers and IaC/Terraform outside `functions/functions/` (none found), and a direct read of `contracts/capabilities.json` confirming the 83-total count and zero `dpp`/`battery`/`ecommerce`/`shopify` entries — plus a full-text search of every prior Codex for any earlier status-check mention, which surfaced the CODEX 74 §9.2 citation above.

---

## 1. Executive Summary

- **Sean's instinct is confirmed, and it's bigger than DPP.** There is no working bulk-import capability anywhere on the platform today, for any vertical. The `imports/` Firestore collection that CLAUDE.md's architecture doc lists as core data model is, in the actual code, an audit-log stub: its only handler counts newlines in a CSV to log a row count and never parses rows or writes to any target collection. See §2.3.
- **This exact gap was already flagged three times and never built — not two.** CODEX 71 §11 recommended "bulk-first ingestion" for the DPP intake worker; CODEX 74 §6 point 2 repeated it verbatim in the Shopify-scoping context; CODEX 74 §9.2 separately proposed `ecommerce.shopify_passport_status_read_v1`, a status-check capability; CODEX 75 §3.2 listed adding `capabilities.json` entries for dpp/shopify as "small, low-risk, start immediately." **None of the four happened.** (First draft of this Codex incorrectly called the status-check gap "new" — it isn't; corrected here after a red-team pass prompted re-verification.) See §3.
- **DPP had zero `capabilities.json` entries — now has two, both shipped this session.** `dpp.get_passport_status_v1` (`GET /v1/dpp:worker:passportStatus`) and `dpp.bulk_intake_v1` (`POST /v1/dpp:worker:bulkIntake`, using DPP's own new `dppImports` collection) are both real, declared, versioned capabilities now — closing the CODEX 74 §9.2 and CODEX 71 §11/CODEX 75 §3.2 gaps. Everything the new Shopify app does is still route-level code invisible to the capability registry — that part's unchanged — but the platform-general bulk-intake and status-check gaps are both closed. Not yet deployed to production. See §2.2, §4.1, §4.2.
- **The DPP RAAS vertical is a hallucination guard, not a capability set.** `functions/functions/raas/rulesets/eu_battery_dpp_v1.json` contains eight anti-fabrication regex rules (no invented passport IDs, no fabricated compliance %, a Cluster-3 hard gate, no invented SoH%, etc.) plus a system-context paragraph — no tool/action definitions. See §2.1.
- **The EU registry is not the blocker for building bulk-intake/status-check.** Those are pure platform-engineering gaps, buildable today, entirely independent of eIDAS/registry status — don't gate them on anything in §5.
- **Estonia is a separate decision from EU registry credentialing — don't conflate them (corrected this pass).** Per Sean, the entity driver is commercial optics (EU counterparties preferring an EU counterparty) and EU data residency, not registry access. It doesn't need to wait on anything else in this document, and forming it doesn't by itself confer verified-economic-operator status either — those are two independent tracks. See §5.1.
- **EU registry submission itself is a separate, harder question with a genuinely open sub-question: who is even the "economic operator"?** Under the Battery Regulation, that's typically the manufacturer/importer placing the battery on the EU market — plausibly SOCIII's customers, not SOCIII. If so, SOCIII may not need eIDAS/verified-operator status itself at all unless it wants to submit *on behalf of* customers as a delegated third party. Not resolved here — flagged as the most consequential open question in §7. See §5.
- **Recommendation in one line:** build the bulk-intake and status-check capabilities now — they don't depend on Estonia, eIDAS, or registry timing at all. Treat the Estonia entity as an independent go-to-market/data-residency decision that also doesn't need to wait on anything here. Treat actual EU registry submission (the eIDAS/API piece) as the slowest-moving, most-open track of the three, gated first on answering who the economic operator actually is.

---

## 2. Current Platform State (Internal Audit)

### 2.1 DPP RAAS vertical — a hallucination guard, not a capability registry

`functions/functions/raas/rulesets/eu_battery_dpp_v1.json` defines eight anti-hallucination regex patterns (no fabricated compliance status, no invented passport IDs, a Cluster-3 hard gate, no invented State-of-Health %, etc.) and a system-context paragraph. It defines **no tools, actions, or capabilities** — it only constrains what an AI response inside the DPP worker chat is allowed to claim. Other production verticals (`raas/auto-dealer/GLOBAL/`, `raas/real-estate/TX/`) additionally have markdown rule docs per function area; DPP has no equivalent.

### 2.2 `capabilities.json` — one DPP entry now, shipped this session

At the time of the first draft, of 83 total capabilities registered platform-wide, **none** were namespaced `dpp`, `battery`, `ecommerce`, or `shopify` — exactly CODEX 74 §9.2's 2026-08-24 finding. That's now two: `dpp.get_passport_status_v1` and `dpp.bulk_intake_v1` (§4.1/§4.2), both backed by real routes — see Revision Notes 2–3. Closest existing precedent that shaped the new entries' shape:

| Capability | Shape | Relevance |
|---|---|---|
| `docs.upload_rrl_doc_v1` | Single document, versioned | Upload pattern, but single-item — not bulk |
| `transactions.import_statement_v1` | Single bank statement (PDF/CSV), `emitsEvent: true`, `writesAudit: true` | Closest existing import capability — still single-file, not multi-row bulk ingestion |
| `kyc.get_kyc_status_v1` | Read-only status lookup | Status-check precedent |
| `ir.investor.status_v1` | Read-only status lookup | Status-check precedent |
| `title.customer.get_order_status_v1` | Read-only, entitlement-checked (caller identity matched against the record), built for a customer-facing portal | **Exact shape DPP needs for a merchant-facing "is my passport ready" check** — copy this pattern, don't invent a new one |

### 2.3 The `imports/` collection — an audit-log stub, not ingestion machinery

CLAUDE.md's architecture doc lists `imports/` as part of the platform's core Firestore data model. In practice, its only handler (`POST /admin/import`) takes `{type, csvText, mode}`, computes a `rowCount` by counting newlines, and writes **only that metadata** to `imports/` — it never parses `csvText` into rows and never writes to any target collection (no `dppProducts`, nothing else). No Firestore trigger exists on `imports/{id}` to process it asynchronously. The only other consumer reads these entries back as an activity/reports feed, not as a queue to process. **There is no working bulk-import capability anywhere on the platform today, for any vertical** — this generalizes well past DPP and directly validates Sean's "completely missing" read.

### 2.4 DPP backend routes the new Shopify app actually calls — thin, single-record, single-tenant

Three routes in `functions/functions/index.js`, all gated by one hardcoded shared secret (the code's own comment flags this explicitly as a stopgap "before any real merchant installs this app"):

| Route | Method | Shape |
|---|---|---|
| `dpp:shopify:products` | GET | Single-tenant fetch of all `dppProducts` records |
| `dpp:shopify:selfServeIntake` | POST | **One SKU per call.** Rejects with 409 if a record already exists — no upsert |
| `dpp:shopify:attachPassport` | POST | **One SKU per call** |

### 2.5 Firestore schema behind it

`dppProducts`: `sku`, `name`, `clusters.c1`–`c7`, `overallPct`, `passportStatus` (`unknown`/`ready`/`submitted`/`registered`), `registryId`, `tenantId`, `capacityKwh`, `dppInScope`, `batteryCategory`, `voltage`, `ampHours`, a `selfServe` flag. `productPassports`: `brandName`, `productName`, `materials`, `manufacturing`, `carbonFootprintKgCO2e`, `recyclability` — explicitly documented in the `attachPassport` handler's own comment as **"two separate, never-unified schemas"**; the handler only carries over fields `dppProducts` actually has and leaves the rest `null` rather than fabricating.

---

## 3. What Was Already Recommended and Never Built

| Recommendation | Source | Status |
|---|---|---|
| "Bulk CSV/spreadsheet-style ingestion should be the default onboarding flow... rather than one-product-at-a-time" | CODEX 71 §11, repeated verbatim in CODEX 74 §6 point 2 | Not built |
| `ecommerce.shopify_passport_status_read_v1` — a status-check capability, "surface `dppProducts.passportStatus` inside the app dashboard" | CODEX 74 §9.2 | **Built this session** as `dpp.get_passport_status_v1` — see §4.2 |
| Add `capabilities.json` entries for `dpp`/`shopify` — "small, low-risk, start immediately" | CODEX 75 §3.2 | **Both built** (`dpp.get_passport_status_v1`, `dpp.bulk_intake_v1`) |
| Real JSON-LD / Annex XIII passport generation (prerequisite for any future registry submission) | CODEX 75 §3.4 | Not built — still a static canvas mockup per CODEX 71 §2/§3 |

Nothing here is a new discovery about *intent* — it's confirmation that documented intent and shipped code have diverged for three-plus weeks running. Note the correction from the first draft: the status-check row above was originally, incorrectly, presented as a fresh finding from this session's Shopify build. It wasn't — CODEX 74 named the exact capability five rows up from where this document first proposed `dpp.get_passport_status_v1` independently (§4.2). The two proposals aren't identical (CODEX 74's is Shopify-app-scoped; §4.2's is vertical-general, matching `title.customer.get_order_status_v1`'s shape) but they're the same underlying gap, spotted twice, three weeks apart, still unbuilt.

---

## 4. What This Session's Shopify Build Teaches, Generalized

### 4.1 Bulk intake — what a real capability should look like

The Shopify app's current pattern (join Shopify's catalog against `dppProducts` by SKU in memory, one self-serve intake call per unmatched SKU) is a reasonable *display* pattern but not an ingestion mechanism. A genuine bulk-intake capability should:
- Actually parse an uploaded CSV/JSON into rows (unlike `imports/`'s current row-count-only stub).
- Validate and accept/reject **per row**, not all-or-nothing — a 500-SKU upload shouldn't fail entirely because row 214 is malformed.
- Reuse the existing `selfServeIntake` scope-determination logic (`capacityKwh = voltage × ampHours / 1000`, the LMT/EV-always-in-scope rule) per row, rather than requiring 500 individual API calls.
- Emit an event and write an audit record per batch, matching the `emitsEvent: true` / `writesAudit: true` pattern `transactions.import_statement_v1` already establishes elsewhere on the platform — this is a solved pattern, just not applied to DPP.

### 4.2 Status-check — built this session, not just recommended

Right now — as of the first draft — there was no way to just *ask* what state a SKU is in without either triggering a mutation (`selfServeIntake` both determines scope AND writes a new record) or going through the Shopify-specific route directly. **This is now built:** `GET /v1/dpp:worker:passportStatus` (`functions/functions/index.js`), backed by the `dpp.get_passport_status_v1` capability entry (§2.2). Modeled directly on `title.customer.get_order_status_v1`'s shape but simplified to tenant-isolation (the caller's own authenticated tenant via `requireFirebaseUser` + `getCtx`'s `x-tenant-id`), not per-customer entitlement matching, since this is an internal/worker-callable capability, not an external customer portal. Reads only `dppProducts` — every field it returns (`passportStatus`, `registryId`, `capacityKwh`, `dppInScope`, `batteryCategory`) already lives there, so the `dppProducts`/`productPassports` schema-merge question (§7 item 4) turned out not to block this specific capability at all; it only matters if a future caller needs `productPassports`-only fields (materials, carbon footprint) in the same response, which is a real scope expansion, not something this build guessed at.

### 4.3 A cheap, non-technical lesson worth carrying over

This session's fix to the Shopify app's own UI — renaming "Check scope" to "Check if passport required" because "in scope" is correct regulatory language but opaque to a merchant — is a pattern worth auditing across the actual DPP worker canvas UI too: keep technical field names (`dppInScope`, `passportStatus`) as the internal vocabulary, but check whether user-facing copy anywhere in the worker still uses that same jargon directly. Flagged as a cheap follow-up, not scoped further here.

---

## 5. Estonia, EU Data Residency, and Registry Submission — Three Separate Tracks

The first draft of this document conflated these into one "eIDAS/Estonia" thread. They're three independent problems, with different owners, different timelines, and — critically — **none of them block each other**. Corrected per a same-day red-team pass.

### 5.1 Track A — the Estonia entity: commercial optics and data residency, not registry access

Per Sean, the actual driver for an Estonia entity is (a) Elise's read that EU counterparties are reluctant to contract with a US entity, and (b) a related interest in housing data in the EU. This is a go-to-market and data-residency decision. It does **not** need to wait on anything else in this document — including whether SOCIII ever pursues eIDAS/verified-economic-operator status at all (Track C, below).

Two things worth separating further within this track:

- **The EU data-residency piece is now independently re-verified, not just cited — and the estimate revises down.** A same-day research pass (prompted directly by the prior draft's own flag that this was "citation, not re-verification") confirmed the finding still holds, with real detail added:
  - Firestore multi-database is GA; a second named database in an EU region (`eur3` multi-region, or single regions like `europe-west4`/Netherlands or `europe-west3`/Frankfurt) is a single `gcloud` CLI command, not a project migration. Database ID and location are immutable once created.
  - The code is in better shape than assumed: `functions/functions/services/canvas/workerOwnData.js` already takes `db` as a parameter rather than hardcoding it — no refactor needed there. The real work is threading a second Firestore client (`getFirestore(app, databaseId)` from `firebase-admin/firestore`, supported in the installed SDK version) into roughly 5–8 DPP-specific call sites (the three Shopify routes, `buildWorkerOwnData`'s DPP block, the new status-check route above).
  - `firestore.rules` and `firestore.indexes.json` need **zero new DPP-specific entries** — DPP has no client-direct Firestore access (everything routes through Cloud Functions using the privileged Admin SDK, which bypasses rules), and its query shapes are pure-equality filters Firestore auto-satisfies without composite indexes.
  - No evidence of real (non-demo) DPP tenant data in the current database — only seed/demo scripts (`seedDppDemo.js`, `seedDppPassport.js`) were found. If that holds under a live check, "migration" means pointing new writes at the EU database going forward, not moving existing data under downtime constraints.
  - **Revised estimate: 1–3 days, not 2–4** — narrower than the 2026-08-18 estimate, mainly because the rules/indexes work that estimate likely budgeted for turns out not to be needed.
  - **GDPR Article 27 finding confirmed, plus one new link worth noting:** the EU Representative requirement is genuinely about legal establishment, not data location — hosting in an EU region has no effect on it either way. But forming the Estonia entity would eliminate the Article 27 requirement entirely, independent of any hosting decision, since it only applies to companies with no EU establishment at all. Tracks A and this data-residency work remain independently actionable, but they're not fully unrelated — worth knowing regardless of which happens first.
  - **One separate, still-open item surfaced**: Google Cloud has a distinct "EU Data Boundary" (Assured Workloads) control package — a real, separate configuration/cost decision beyond just picking an EU region, and even with it enabled, the controlling legal entity remains Google LLC, a US corporation. Whether SOCIII wants this formal package or just an informally-chosen EU region is a real, still-open decision, not resolved by this research pass. See §7.
- **The commercial-optics half is worth a light pressure-test, not to block it, but to calibrate urgency.** Has "EU companies won't contract with a US entity" actually stalled or cost a specific deal, or is Elise flagging it proactively? Both are valid reasons to move forward — they imply different timelines (act now vs. plan deliberately). Flagged as an open question, §7.

### 5.2 Track B — forming an EU entity does not, by itself, confer verified-economic-operator status

If SOCIII (or an Estonia subsidiary) later decides it wants to submit directly to the EU DPP Central Registry (rather than leaving that to customers — see Track C), the entity is only step one of three in sequence, not a single move:

1. Form the legal entity (fast — Estonia is among the EU's quickest, same-day to a few days via the e-Business Register; the e-Residency *card* specifically, if that route is used instead of a local formation agent, can take several weeks longer due to background checks).
2. Complete KYB and obtain a qualified electronic seal from a QTSP (also fast once step 1 is done — cited turnarounds from multiple providers range ~20 minutes to under 48 hours for the certificate itself).
3. The EU registry's own "verified economic operator" recognition step on top of holding that credential — **timeline unconfirmed**, no public track record exists yet since the registry only launched 20 Jul 2026, roughly six weeks before this writing.

Steps 1–2 are fast and well-documented. Step 3 is the genuine unknown, and it's a registry-side process, not something a fast Estonia formation shortens.

### 5.3 Track C — the open question that matters most: is SOCIII even the "economic operator"?

Under the EU Battery Regulation, the "economic operator" obligated to register a battery's DPP is typically the manufacturer or importer placing it on the EU market — plausibly **SOCIII's customers**, not SOCIII itself as a software/compliance vendor. If that's right, SOCIII may get the commercial and data-residency benefit of an EU entity without ever needing eIDAS/verified-operator status itself — customers would register under their own credential, using SOCIII's tooling. The alternative is SOCIII deliberately positioning itself as a **delegated third party**: a verified economic operator may delegate registration to a verified third party, which is a real, documented option, but requires SOCIII itself to become verified, which only makes sense if SOCIII wants to run registrations on customers' behalf as part of its own service.

**Same-day signal, not yet a confirmed decision:** in drafting a reply to Elise the same day this section was revised, Sean floated exactly this — positioning SOCIII as the party that actually files the registration on a customer's behalf, framed as more valuable than the app/tooling alone because it creates real switching-cost lock-in, and because it's a genuine differentiator (CODEX 74 §13.2 confirmed zero of five live Shopify competitors claim real registry submission). If this becomes the actual direction, it resolves this section in favor of SOCIII needing verified-operator status itself — it stops being an open question and becomes a requirement. Flagged here as a live signal worth tracking, not yet treated as decided; confirm explicitly before committing eIDAS work to this path. See §7.

### 5.4 Track C, continued — registry API status: designed for one, not published yet

Independent of who ends up registering, the registry's own architecture officially lists "an API for registering DPPs and retrieving data" as a component. As of the v1.0 DPP Registry User Guide for Economic Operators, however, **only the manual web-interface path is documented** — the machine-to-machine REST API for economic operators is explicitly described as "anticipated to follow," not published. A JSON/XML batch-file submission format is available as an interim option even without a live API.

**Urgency check, on Track C's own merits, independent of Estonia:** CODEX 71 §4 already established the actual compliance deadline — EV, LMT, and industrial (>2kWh) batteries all become DPP-mandatory on the same date, 18 Feb 2027, roughly five months from this writing. That's the real clock on Track C (who registers, and whether SOCIII needs eIDAS status), not the registry's 6-week age. Worth keeping this deadline in view when deciding how soon §7's open questions on Track C need answers, separate from however quickly the Estonia entity (Track A) moves.

### 5.5 What to build now regardless of how Tracks B and C resolve

Two genuinely different things get lumped together as "registry readiness," and they should be sequenced differently:

- **Real JSON-LD / Annex XIII passport content generation (CODEX 75 §3.4) has value independent of EU submission** — it's the actual passport data model, used by the passport viewer page and QR codes regardless of whether SOCIII or a customer ever submits to the registry. **Build this now** — it isn't gated on Tracks B or C at all.
- **A registry-specific JSON/XML export/submission mapping is narrower** — its only purpose is feeding the EU registry's batch-submission format, which (a) isn't published as a stable spec yet in machine-readable form, and (b) has no user-facing value until Track C answers who's actually submitting. Building this now risks rework against a spec that hasn't shipped. **Hold this specifically until Track C is answered and the registry's batch format is confirmed stable** — this is the one piece of "registry readiness" work actually worth gating, and it's a narrower scope than the first draft implied.

---

## 6. Prerequisite Platform Work

1. ~~New `capabilities.json` entries: `dpp.get_passport_status_v1`, `dpp.bulk_intake_v1`~~ — **both done this session** (§2.2, §4.1, §4.2).
2. ~~A real CSV/JSON row parser wired to actual ingestion~~ — **done**, using DPP's own `dppImports` collection per the Codex's own recommendation, not the platform-wide `imports/` collection (still a real, separate item — see §7 item 2, now scoped narrower: the platform-wide fix, not DPP's blocker).
3. ~~Per-row validation, reusing the existing `selfServeIntake` scope-determination logic~~ — **done**, same formula and category rules, not duplicated.
4. ~~Resolve which schema `dpp.get_passport_status_v1` actually reads from~~ — **turned out not to block anything**: every field the shipped capability returns lives in `dppProducts` alone (§4.2). Only relevant again if a future caller needs `productPassports` fields in the same response.
5. UI terminology audit pass across DPP worker surfaces (§4.3) — cheap, independent of everything else here. Not started.
6. EU data residency (Track A, §5.1) — **re-verified and re-scoped this session**: 1–3 days (down from 2–4), no rules/indexes work needed, no code refactor needed beyond threading a second DB client into ~5–8 call sites. Still open: whether real DPP tenant data exists (needs a live Firestore check, not done), and whether to pursue GCP's formal "EU Data Boundary" package vs. an informally-chosen EU region.

---

## 7. Open Decisions for Sean

**Escalating this one on its own, since it's been asked three times across three Codices and answered zero:** what does DPP's "Tier 1 priority" actually mean in engineer-days/week? First raised CODEX 71 §12a (2026-08-13), re-raised CODEX 75 §5.3 (2026-08-24), and it now blocks sequencing decisions in this document too (#2 and #4 below both depend on it implicitly). Given the pattern of this specific question going unanswered twice already, it probably shouldn't ride along at the bottom of a spec doc a third time — worth a direct, standalone answer rather than being folded into general review.

1. **Estonia entity — pressure-test the urgency, not the decision.** Has "EU counterparties won't contract with a US entity" actually stalled or cost a specific deal, or is this Elise flagging proactively? Either justifies moving forward; they imply different timelines. This decision does not depend on anything else in this document (§5.1) — it can proceed on its own schedule regardless of how Tracks B/C below resolve. **Corollary, for completeness:** if SOCIII ultimately decides *not* to pursue delegated-third-party status (§5.3), does that change the Estonia entity's value at all? Almost certainly not — the optics and data-residency drivers stand on their own regardless of the delegation decision — but worth a one-line confirmation rather than leaving it an implicit assumption.
2. **`imports/` scope — DPP's own path is resolved and built; the platform-wide question stays open.** DPP now has its own `dppImports` collection (built this session, per this Codex's own recommendation) rather than waiting on the platform-wide `imports/` collection, which is still just an audit-log stub for every OTHER vertical. Whether to invest in fixing `imports/` generally (benefits every vertical, real lift) remains a real, separate decision — it no longer blocks DPP, so there's less urgency, but the underlying platform gap (§2.3) hasn't gone away.
3. ~~Confirm go-ahead on the two new `capabilities.json` entries~~ — done, both of them.
4. ~~Which schema does `dpp.get_passport_status_v1` read~~ — resolved by observation, not decision: it only ever needed `dppProducts` (§4.2).
5. **Who is actually the "economic operator" for SOCIII's customers' batteries** (§5.3) — the customer/manufacturer under their own credential, or SOCIII acting as a verified delegated third party? A same-day signal (Sean's draft reply to Elise, §5.3) points toward the delegated-agent direction — confirm whether that's the real call, since it would resolve this from "open question" to "requirement."
6. **EU data residency — re-scoped, two smaller things still open**: (a) whether real DPP tenant data exists today (needs a live Firestore check — not done, everything in this pass was code/docs-based); (b) whether to pursue GCP's formal "EU Data Boundary" Assured Workloads package or just an informally-chosen EU region — a real cost/configuration decision, not yet made.
7. **Sequencing the registry-specific JSON/XML export mapping** (§5.5) — explicitly held until Track C (#5 above) is answered, distinct from the general JSON-LD/Annex XIII passport generation work (CODEX 75 §3.4), which should proceed now regardless.

---

## 8. Sourcing Note

Internal claims (RAAS ruleset contents, `capabilities.json` entries, `imports/` handler behavior, DPP route/schema shapes) are sourced to this session's repo-audit research pass, cross-checked directly against CODEX 74/75 (both read in full this session), and — for the two strongest absence-claims (no Firestore trigger on `imports/{id}`, zero `dpp`/`battery`/`ecommerce`/`shopify` capabilities among 83 total) — independently re-verified this session via direct repo-wide grep (including a check for IaC/Terraform outside `functions/functions/`, none found) and a direct read of `contracts/capabilities.json`, rather than relying solely on the earlier delegated audit pass. The status-check "not previously logged" error in the first draft was caught by a full-text search across every prior Codex prompted by red-team review, which surfaced CODEX 74 §9.2 — see §3.

External EU registry/eIDAS claims are sourced to the EU Commission's own DPP Registry pages, the Minespider and Traceable regulatory explainers, and QTSP provider pages (Disig, IDnow). The EU data-residency finding in §5.1 was originally a citation to prior scoping (dated 2026-08-18) but has since been independently re-verified via a dedicated same-day research pass: Firestore multi-database GA status and CLI mechanics sourced to Google Cloud's own docs and blog; the code-impact claims (`workerOwnData.js`'s `db`-as-parameter pattern, the 339 `admin.firestore()` call sites, zero `getFirestore(databaseId)` usage) sourced to direct reads of `functions/functions/services/canvas/workerOwnData.js` and repo-wide grep; the rules/indexes claims sourced to direct reads of `firestore.rules` and `firestore.indexes.json`; the GDPR Article 27 re-confirmation sourced to GDPR Local and Clarip's explainers; the "EU Data Boundary" finding sourced to Google Cloud's own Assured Workloads docs.

Items still flagged as genuinely unverified: (a) the actual turnaround time for the EU registry's own verified-economic-operator recognition step once a qualified seal is held — no public track record exists given the registry's ~6-week age at time of writing; (b) whether Estonia company formation strictly requires personal e-Residency or can be completed via a local formation agent/director without it; (c) whether SOCIII or its customers are the correct "economic operator" under the Battery Regulation for SOCIII's specific business model (§5.3) — this is a legal question, not a research-pass finding, and shouldn't be treated as settled by anything in this document; (d) whether any real, non-demo DPP tenant data exists in the current database — the EU-hosting research pass found only demo-seed scripts, but did not query the live database directly, so this is an inference, not a confirmed fact.
