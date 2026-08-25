# CODEX 74 — DPP Suite: Shopify &amp; Amazon Public App Integration Scoping

**Status:** SPEC — research complete across two passes, for Sean's review before any build starts
**Suite:** EU DPP
**Date:** 2026-08-24 (updated same day — §13–§15 added after Sean asked for a deeper competitor teardown and an Amazon services-channel question)
**Trigger:** Sean asked to scope full public/production-grade Shopify and Amazon app integrations for the DPP suite — a step beyond the private sandbox test plan CODEX 71 §12c/§12d already scoped and deliberately deferred as a "separate, later Q3 2026 milestone." This is that milestone's scoping pass. A same-day follow-up added two more questions: (1) a deeper teardown of the Shopify competitors named in §4, since Sean's instinct that "these all launched in the last few weeks" needed checking; (2) where competitor passport data actually lives / whether any of them use blockchain-style anchoring; and (3) whether SOCIII could get "a toe in the door" on Amazon by listing the compliance *service* itself rather than building a software integration.
**Note on numbering:** `docs/codex/00-INDEX.md` is stale (last updated through CODEX 48; files exist through 73) — per CODEX 71's own precedent, this doc does not attempt to repair the index. **74 is confirmed the next unused number** (73 is taken by an unrelated nursing-education doc).
**Research method:** four research passes total — an internal repo audit (current DPP data model, current Shopify code, git history since CODEX 71); an external pass on Shopify App Store + Amazon SP-API requirements; a deep teardown of all five named Shopify competitors (pricing, depth, reviews, category-specificity, registry claims); and a targeted pass on competitor data hosting/anchoring plus Amazon's Service Provider Network. Every external claim below carries a source; anything that could not be verified against a primary source is flagged inline rather than stated as fact, consistent with this suite's `dpp-no-fabricated-compliance` norm.

---

## 1. Executive Summary

- **Shopify and Amazon are not comparable builds.** Shopify has a well-defined, buildable path: a public app, GraphQL Admin API, metaobject-based passport data, a theme app extension for the storefront widget, standard OAuth + mandatory GDPR webhooks, submitted through Shopify's normal App Store review. Amazon has **no equivalent hook to build against today** — no DPP-specific API, no product-type schema field for passport data, and an active policy against the exact QR/external-link display pattern that makes the Shopify version work. See §7–8.
- **Shopify DPP is not a greenfield market.** At least five apps are already live on the Shopify App Store addressing this space, two of them (PassportPro, PassportEU) explicitly claiming battery-category coverage today. See §4. This changes the framing from "build the first mover" to "decide how to differentiate against live competitors," and means competitor trials should happen before further scoping, not after.
- **The existing Shopify connector (`functions/functions/services/shopify/shopify.js`) cannot be extended into this** — it's a read-only, per-user "connect your store" OAuth pattern (same shape as the Gmail/Drive connectors), built for pulling orders/customers/products into Accounting/Contacts context. It has no write scopes, no metafield/metaobject code, no webhooks, and isn't a Shopify Partner public app. A DPP storefront app is a separate, net-new Partner-account build, not an extension of what exists. See §5.1.
- **Amazon's own compliance mechanism today is narrower than DPP and already live**: sellers must supply a per-country battery EPR registration number through Seller Central's Compliance Portal (deadline was 18 Aug 2025; Amazon deactivates non-compliant listings in Germany, Netherlands, Poland, Sweden and others with no grace period). That's real, enforced, and worth tracking — but it is not the EU DPP Central Registry, not GS1 Digital Link, and not exposed via SP-API as a catalog attribute as far as this research could confirm. See §8.1.
- **Amazon's anti-external-link listing policy is a real structural blocker**, not a minor detail: QR codes/links intended to redirect off-Amazon are disallowed on listing images/detail pages. No Amazon policy carve-out for legally-mandated compliance marks (the CE/WEEE precedent) was found extending to a scannable, link-bearing QR code. **Recommendation: do not scope an Amazon "storefront widget" analogous to Shopify's** — if an Amazon product needs a physical GS1 Digital Link QR code, it most plausibly belongs on the physical packaging/insert (a labeling/print workflow), not the digital listing. See §8.3.
- **The QR/passport-link destination already exists and shipped independently of this scoping effort**: a public, unauthenticated passport viewer went live at `/demo/dpp` (route `/v1/dpp:passport:public`, fixed 2026-08-20) during the same window CODEX 71 claimed zero DPP engineering activity was happening — that claim in CODEX 71 was itself wrong; real work happened 2026-08-14 through 2026-08-20 (persona/canvas wiring, the public viewer, a supplier data-request pipeline). See §3.2. **Open item:** whether this viewer route is already parameterized per-tenant/per-SKU or is still a single fixed demo page needs direct confirmation before any QR code is generated against it — not confirmed in this pass.
- **No `capabilities.json` entries exist for `dpp`, `shopify`, `ecommerce`, or `marketplace`.** Per this repo's own rule ("if a capability is not declared there, it does not exist" — `CLAUDE.md`), any Shopify-write or Amazon-write capability needs new, versioned entries before it can be called from anywhere in the platform. See §9.2.
- **Recommendation in one line:** treat Shopify as a real, scoped, buildable Q3/Q4 2026 project (public app, ~4-8 weeks engineering + Shopify's own multi-week review cycle), and treat Amazon as a **watch-and-track item, not a software build** — but a real, near-zero-cost discoverability move (§15) is available immediately, independent of any SP-API decision.
- **[Added same-day] "All launched in the last few weeks" is half-right.** Reviews cluster in July–August 2026 across all five Shopify competitors, but that's a lagging indicator — actual launch dates span Dec 2025 (PassportPro, 8 months live, still zero reviews) through Jul 2026 (SolveDPP, the only genuinely new one). See §13.
- **[Added same-day] Only one competitor makes a credible battery-specific depth claim, and it has no track record.** PassportEU is the one competitor using "80+ attributes / 7 clusters / Battery Reg 2023/1542" language that mirrors SOCIII's own model — backed by a single 24-hour-old review and pricing that contradicts itself between its own website and its Shopify listing. See §13.
- **[Added same-day] Nobody, anywhere, claims blockchain/on-chain anchoring.** Zero of the five competitors make any cryptographic tamper-evidence claim. The strongest of the five (PassportPro) has explicit append-only-database language framed around tamper prevention — real, but application-layer Postgres, not cryptographic anchoring. This is a genuinely open differentiator for SOCIII if its existing on-chain anchoring tech gets wired specifically into DPP records (not yet confirmed done — see §14). Two of five (PassportEU, Passtiq) have no amendment/versioning model at all in their public materials, a real gap by the team's own standard.
- **[Added same-day] Amazon does have a real "toe in the door" that doesn't require any SP-API build: the Service Provider Network (SPN).** A free, vetted directory of compliance/service vendors inside Seller Central, with an actual "Compliance" category — and Amazon has already forced sellers toward exactly this pattern by shutting down its own in-house EPR compliance service and routing sellers to third-party SPN providers instead. See §15.

---

## 2. Why This, Why Now

Three independent signals point the same direction:

1. **Regulatory**: EV/LMT/industrial (&gt;2kWh) batteries become DPP-mandatory on a single date, **18 Feb 2027** (CODEX 71 §4, sourced) — roughly six months from this writing. A passport that only lives inside SOCIII's own worker canvas doesn't satisfy the regulation's actual requirement, which is consumer/downstream accessibility via a scannable data carrier at the point the product is encountered — which for most consumers is a Shopify storefront or an Amazon listing, not a manufacturer's internal compliance tool.
2. **Platform-level enforcement is already happening, ahead of the DPP mandate itself** (CODEX 71 §13, sourced): Amazon and eBay already gate battery listings on EPR registration; Shopify already has GPSR-driven EU compliance settings. The commercial pressure on manufacturers to have *something* on their storefront is current, not a 2027 problem.
3. **Sean's own prior direction (CODEX 71 §12c/§12d)** already earmarked a "Shopify app already on the Q3 2026 roadmap" and explicitly scoped the public-app version as later, separate work from the private-sandbox demo-client effort. This document is that separate effort, now that the sandbox-first plan (CODEX 71 §12d) has had time to mature and a public app is back on the table.

---

## 3. Current Platform State (Internal Audit)

### 3.1 Shopify — read-only connector, not a distributable app

| Fact | Detail | Source |
|---|---|---|
| Pattern | Per-user "connect your store" OAuth, same shape as Gmail/Drive connectors | `functions/functions/services/shopify/shopify.js` |
| Scopes | `read_orders,read_customers,read_products,read_reports` — **read-only**, no write scopes anywhere | `shopify.js:28` |
| API calls implemented | `getRecentOrders`, `getRevenueSummary`, `getCustomers`, `getProducts` — Admin API 2024-01, all read-only | `shopify.js` |
| Webhooks | **None registered** — confirmed via grep across the Shopify service/hook/canvas files | audit pass |
| Distribution model | Server-side redirect OAuth built specifically to route around Shopify's COOP headers breaking a popup flow (CODEX 17, 2026-07-01); confirmed working against `sociii-test.myshopify.com` | `docs/codex/17-settings-brand-icons-shopify-oauth.md` |
| Token storage | AES-256-GCM encrypted at `users/{uid}/integrations/shopify` | audit pass |

**Implication:** none of this is reusable for a DPP storefront app beyond the general "we already know how to do Shopify OAuth" experience. The public-app version needs its own Partner account, its own OAuth app registration (a public app's distribution method is chosen once and can't be changed later — see §5), its own scope set including writes, and its own webhook handling.

### 3.2 DPP backend — real, more current than CODEX 71 claims

CODEX 71 (dated 2026-08-13) states "DPP has had zero engineering activity since 2026-07-29." That was **incorrect as of the date it was written and is more incorrect now** — real commits landed 2026-08-14 through 2026-08-20:

| Commit | Date | What |
|---|---|---|
| `a83e5257` | Aug 14 | DPP demo build-out — Elara persona, live-data canvas wiring |
| `66ca7041` | Aug 15 | DPP demo fixes, stale registry-date sweep |
| `6da3a4d5` / `b2e0555f` / `afd3ff44` | Aug 16 | CODEX-S52.50 DPP weekly priority report + supplier data-request pipeline |
| `0dcaa085` | Aug 20 | **Public end-consumer passport portal shipped at `/demo/dpp`** — this is the "QR-scan passport viewer" CODEX 71 §12c described as "being built now" |
| `015dede9` | Aug 20 | Fixed `/v1/dpp:passport:public` 401 — route now correctly unauthenticated |

No Shopify- or Amazon-specific DPP work happened in this window. This CODEX is the first pass at that.

**Open item, not resolved in this research pass:** confirm whether `/demo/dpp` / `/v1/dpp:passport:public` already accepts a per-tenant/per-SKU parameter, or is currently a single fixed demo page. This matters directly for §6 and §9 — the QR code a Shopify product carries needs to resolve to *that specific product's* passport, not a generic demo. If the route isn't parameterized yet, that's a prerequisite build item ahead of any Shopify integration, not a nice-to-have.

### 3.3 Existing DPP data model — build against this, don't invent a parallel one

From `functions/functions/services/canvas/workerOwnData.js`:

| Collection | Key fields | Notes |
|---|---|---|
| `dppProducts` | `sku`, `name`, `clusters.c1`–`c7` (`{pct}`), `overallPct`, `passportStatus` (`unknown`/`ready`/`submitted`/`registered`), `registryId`, `tenantId` | The natural join key for a Shopify/Amazon integration is `tenantId` + `sku` |
| `dppRegistryStatus` | `allowlistStatus`, `registryGoLive`, `submissionQueue[]`, `registered[]`, `tenantId` | |
| `dppFleet` | `sku`, `unitsDeployed`, `bmsStatus`, `sohPct`, `sohColor`, `cycleCount`, `ratedCycles`, `amendmentPending`, `tenantId` | Lifecycle/telemetry side, not directly relevant to a storefront display but relevant if a passport's public view ever surfaces live SoH |
| `dppSuppliers` | `name`, `language`, `status`, `certExpiry`, `products[]`, `tenantId` | Supply Chain Tracer side, out of scope for this doc |

Any Shopify/Amazon ingestion should read/write `dppProducts` by `tenantId` + `sku`, matching a merchant's own SKU field, rather than creating a second product record system.

### 3.4 Amazon — confirmed nonexistent

No SP-API, Selling Partner, or Amazon-marketplace code exists anywhere in the repo. The only "amazon" hits are the unrelated `creative.publish_kdp_v1` capability (Amazon KDP book publishing, a different vertical entirely) and aspirational "cross-channel sync" mentions in marketing copy for an unrelated worker. This is a from-scratch build in every respect, not an extension.

### 3.5 Marketing collateral

CODEX 71 §9b/§12c/§13 already audited and corrected overclaiming language in `docs/whitepapers/dpp-provenance-business-in-a-box.md` and `docs/sales/dpp-one-pager.md` (2026-08-13) — including the "Coming in Q3 2026" Shopify roadmap line this CODEX now acts on. Not re-audited fresh in this pass; relying on CODEX 71's own trail. **Before any public Shopify/Amazon claim goes into collateral, re-check it against §4–§8 below** — specifically, do not let any collateral imply Amazon parity with Shopify, since §8 shows that isn't true today.

---

## 4. Competitive Landscape — Shopify is not greenfield

Confirmed live on the Shopify App Store today (Aug 2026):

| App | Claim | Note |
|---|---|---|
| [PassportPro](https://apps.shopify.com/passportpro) | ESPR-compliant DPPs + QR codes; explicitly covers **textiles, batteries, and electronics**; AI auto-fill, CSV import | Direct battery-category overlap |
| [PassportEU](https://apps.shopify.com/passporteu-digital-passports) | AI auto-fill, QR codes, public passport pages; textiles, **batteries**, electronics, furniture | Direct battery-category overlap |
| [SolveDPP](https://apps.shopify.com/solvedpp) | ESPR-compliant, AI-automated passports, QR sharing | |
| [Passtiq](https://apps.shopify.com/passtiq) | Theme-extension QR/passport display; currently textile-focused | Confirms the theme-app-extension pattern (§5.5) is already the market's chosen mechanism |
| [PassoNext](https://apps.shopify.com/passonext) | Explicitly uses **GS1 Digital Link** in its passport QR codes | Confirms GS1 Digital Link is already the de facto standard other vendors use, not a SOCIII-only choice |
| [Packify](https://apps.shopify.com/ppwr-ready) | Adjacent — packaging EPR (PPWR), not DPP; tracks EPR registration per EU country | Different regulation, same buyer |

**Amazon-side, no equivalent exists.** The competitive landscape there is entirely general EPR-compliance tooling (ForSURE, CIRT, AlgoREP, Ecosurety, EPR Tradex) — none claim SP-API-level catalog integration for passport display, consistent with §8's finding that Amazon has no hook to build against.

**Recommendation:** before writing a line of Shopify integration code, install/trial PassportPro and PassportEU on a dev store. Their listing copy already demonstrates a working OAuth → metaobject → theme-extension → QR pipeline for the exact battery category SOCIII targets. This should shape the differentiation decision in §11 (Open Decisions) rather than being treated as background noise.

---

## 5. Shopify — What's Necessary

### 5.1 App type and distribution

**Public app** is the only shape that can be installed by any merchant and listed on the App Store; custom apps are single-store only and never listed. **The distribution method is chosen once at app creation and cannot be changed later** — this is a real, load-bearing decision to get right before creating the app record. ([Select a distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method))

### 5.2 Registration

Free Shopify Partner account (email/business profile, no fee). Public app created via Partner Dashboard → Apps → Create app → Public distribution. Free Partner development stores are the standard build/test environment before submission. ([Shopify Help — Partner Account](https://help.shopify.com/en/partners/manage-account))

### 5.3 API — GraphQL is mandatory, not optional, as of today

**Confirmed via Shopify's own changelog: new public apps submitted since April 2025 must use the GraphQL Admin API — REST is legacy.** ([Shopify changelog](https://shopify.dev/changelog/starting-april-2025-new-public-apps-submitted-to-shopify-app-store-must-use-graphql)) This means the app must be built GraphQL-only from day one — there is no REST fallback option for a new app in 2026. OAuth 2.0 authorization-code grant is the standard install flow. Scopes follow `read_/write_` pairs (`write_` implies `read_`); exact current scope name(s) for metafield/metaobject writes should be verified live against `shopify.dev/docs/api/usage/access-scopes` before implementation — not independently confirmed to a specific scope string in this research pass.

### 5.4 Data model: metaobjects + metafields, not metafields alone

Define a reusable **Metaobject** type (e.g. `battery_passport`) holding the structured compliance record (manufacturer, GTIN, carbon footprint, recycled-content %, passport ID, registry status, GS1 Digital Link/QR URL), then attach it to each Product via a metafield of type "metaobject reference." This avoids duplicating the same passport schema across every SKU variant, per Shopify's own stated distinction between metafields (simple per-resource data) and metaobjects (reusable structured types). ([About metaobjects](https://shopify.dev/docs/apps/build/metaobjects))

### 5.5 Storefront display: Theme App Extensions

**Theme App Extensions with App Blocks** let a merchant drag the passport/QR widget into their theme via the theme editor with zero code, on Online Store 2.0 (JSON-template) themes. This is the sanctioned mechanism — apps generally may not modify theme files directly via the Asset API. ([About theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions)) Confirmed as already the market pattern (Passtiq, §4).

### 5.6 Mandatory compliance webhooks

Apps listed on the App Store must implement and verify three GDPR webhooks: `customers/data_request`, `customers/redact`, `shop/redact` (fired 48 hours post-uninstall), respond 200-series, and complete actual data actions within 30 days. ([Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)) **Unverified in this pass:** a secondary source claims these can now only be registered via the Shopify CLI, not the Admin API — worth confirming directly before finalizing the build architecture, since it affects tooling/CI setup.

### 5.7 Shopify's native EU compliance settings — separate, not extensible

Shopify's Settings → Markets → EU compliance section is **GPSR-driven** (responsible-person name/address/contact display), not DPP/battery-specific, and Shopify explicitly states it does not enforce compliance on the merchant's behalf — the merchant/seller carries that responsibility. No native hook exists for a third-party app to plug into; the DPP widget is fully additive via the theme app extension in §5.5, not an extension of Shopify's own compliance UI.

### 5.8 Review, certification, billing

- Standard review: Draft → Submitted → Reviewed → Published. No official median timeline confirmed in this pass.
- **Billing API** required if SOCIII charges merchants directly through the app (vs. bundling into an existing SOCIII subscription) — off-platform billing is generally disallowed for App Store apps.
- **Built for Shopify** (optional, higher-visibility certification): requires ≥50 net installs on paid plans, ≥5 reviews, Admin UI and storefront performance thresholds (storefront rule: app must not drop Lighthouse score by more than 10 points), adds an estimated 2–4 weeks of review on top of baseline. Not required to list publicly — an enhancement, not a gate.

---

## 6. Shopify — What It Should Do (Functional Scope)

1. **Merchant installs the app** (OAuth, public-app flow) and grants product read/write + metaobject scopes.
2. **Product sync / mapping**: merchant's Shopify products map to `dppProducts` by SKU + `tenantId`. Bulk CSV/spreadsheet-style ingestion should be the default onboarding flow (consistent with CODEX 71 §11's "bulk-first ingestion" recommendation for the DPP intake worker generally) rather than one-product-at-a-time.
3. **Passport data attaches via metaobject + metafield reference** (§5.4) — populated either by pulling from an already-completed `dppProducts` record (compliance work done via the Compliance Auditor / Passport &amp; Registry Manager workers) or flagging products with no matching passport yet.
4. **Storefront widget (theme app extension)** renders a "View Digital Product Passport" block with the GS1 Digital Link QR code, installed by the merchant via drag-and-drop into their theme — no code editing required.
5. **QR/link destination**: resolves to the public passport viewer (§3.2's `/demo/dpp` / `/v1/dpp:passport:public` route family) — **contingent on confirming/building per-SKU parameterization**, flagged as an open prerequisite above.
6. **Status sync back into the DPP worker canvas**: a product's `passportStatus` (`unknown`/`ready`/`submitted`/`registered`) should be visible to the merchant inside the app (e.g. a dashboard tab: "12 of 20 products have a live passport") rather than only inside SOCIII's own worker chat — this is the actual value proposition of a Shopify app versus just telling merchants to use the worker directly.
7. **Compliance webhooks** (§5.6) handled for GDPR obligations — table stakes for listing, not a differentiator.
8. **Billing**: TBD whether this is bundled into an existing SOCIII/Elise subscription or billed standalone via Shopify's Billing API — flagged as an open decision (§11), not resolved here, and should be checked against the CODEX 71 §19a hard pricing rule (only the $99/mo Base tier is currently approved for external quoting).

---

## 7. Amazon — What's Necessary (and the case for *not* building the equivalent)

### 7.1 Registration path (for completeness — see recommendation below before committing to this)

Third-party developers register via **Developer Central** inside the **Solution Provider Portal**, with an identity-verification step. A **public** SP-API app (installable by other sellers, not just SOCIII's own account) must, per Amazon's Developer Agreement, be listed in the **Selling Partner Appstore** — the same "public vs. private" distinction Shopify has. LWA (Login with Amazon) provides the OAuth flow. ([SP-API Registration Overview](https://developer-docs.amazon/sp-api/docs/sp-api-registration-overview))

### 7.2 Relevant APIs and the critical negative finding

- **Product Type Definitions API** returns the JSON-Schema attribute contract for a given product type, used by both **Listings Items API** (write) and **Catalog Items API** (read).
- **No evidence of a DPP-specific or GS1-Digital-Link-specific attribute field in this schema.** This was searched for directly and specifically (per Amazon's own docs and changelog surfaces) and came back empty — not "unfound because search was shallow," but a genuine current-state absence as of Aug 2026. This is the single most important finding of this research pass: **there is nothing on Amazon's side to integrate a DPP passport against today.**

### 7.3 What Amazon *does* enforce today — a narrower, separate requirement

Confirmed directly against Amazon's own Seller Central Europe help page: sellers must supply a **per-EU-country battery EPR registration number** (deadline 18 Aug 2025, already passed), submitted through Seller Central's **Compliance Portal / Account Health** page — not via SP-API as a catalog attribute. Non-compliant listings are deactivated with no grace period in at least Germany, Netherlands, Poland, Sweden. This is real, enforced, and worth tracking for SOCIII's manufacturer clients — but it is EPR registration-number proof, not a battery passport, and it isn't exposed as something a third-party app writes via SP-API; it's a seller-side manual submission.

### 7.4 Why an Amazon storefront-widget build doesn't make sense yet

Amazon's Product Detail Page Rules disallow external links/QR codes on listing images/detail pages intended to redirect off-Amazon. Seller-forum consensus suggests QR codes on **physical packaging/inserts** (not digital listing content) linking to informational (non-promotional) content are more tolerated, but **no explicit Amazon policy exemption was found** extending the CE-marking/WEEE-symbol precedent (physical, legally-mandated marks checked via product/packaging photos) to a scannable, link-bearing QR code. This is a genuine open compliance question, not a solved one — the honest scoping conclusion is that a Shopify-style in-listing widget is not a safe bet to build against Amazon's current policy.

### 7.5 Approval rigor, if pursued at all

Amazon requires (for restricted-scope apps) a mandatory architecture/PII review by Amazon's SP-API Solutions Architecture team, a live public website, and Data Protection Policy compliance (24-hour incident notification, 24-hour access revocation on termination, 7-day critical-vulnerability resolution). A DPP app that only touches public catalog attributes — not customer PII — may avoid the restricted-role review entirely, which matters for scoping if this is ever revisited. Confirmed: once approved, Appstore publishing takes 3–4 weeks; no official pre-approval review-duration SLA was found (a secondary source's "months-long audit" claim for PII-scope apps is plausible but unverified against a primary Amazon page).

### 7.6 Recommendation

**Do not scope a full Amazon SP-API storefront integration now.** Instead:
0. **List SOCIII on Amazon's Service Provider Network now — see §15.** This is a real, free, near-zero-effort move that gets SOCIII discoverable to Amazon sellers as a compliance service provider, entirely independent of any SP-API decision. Sequenced as item 0 because there's no reason to wait on it.
1. **Track, don't integrate**: build lightweight tooling (could live inside the existing Compliance Auditor worker) to help manufacturer clients manage their per-country EPR registration numbers — a real, already-enforced need, achievable without any SP-API build since it's a Seller Central manual-submission process today.
2. **Physical label workflow, if demand shows up**: if a client needs a GS1 Digital Link QR on Amazon-sold product packaging, treat that as a print/label design deliverable (packaging artwork), not a software integration — sidesteps the unresolved listing-QR policy question in §7.4 entirely.
3. **Revisit SP-API integration on a trigger, not a calendar date**: watch for any Amazon announcement of a DPP-specific mechanism (Amazon has a track record of adding compliance-portal features with short notice, as it did for EPR in mid-2025) and re-scope only if/when that happens — most plausibly needed sometime before the Feb 2027 mandate, but there's nothing to build against yet.

---

## 8. Cross-Cutting: GS1 Digital Link

A GS1 Digital Link QR encodes a structured, standard URL (`https://[domain]/01/[GTIN]/10/[BATCH]/21/[SERIAL]/17/[EXPIRY]`, GTIN mandatory, others optional) — the same code resolves to a web page in a browser (the passport) and extracts a GTIN at POS. This is already the de facto standard among Shopify competitors (PassoNext, confirmed §4) and matches the EU registry's own "directory not host" model (CODEX 71 §9a) — the registry/QR resolves to wherever the passport is actually hosted (SOCIII, in this case), it doesn't host the data itself. The EU Battery Regulation's data-carrier requirement (Article 77) calls for ISO/IEC 15459-compliant identifiers, which GS1 Digital Link satisfies. Any hosted passport URL (§3.2/§6.5) should be built GS1-Digital-Link-compliant from the start rather than as a plain arbitrary URL, since that's the format both the regulation and the competitive market already expect.

---

## 9. Prerequisite Platform Work

### 9.1 Confirm/build per-SKU passport viewer parameterization

Before any QR code can be generated for a real merchant product, confirm whether `/v1/dpp:passport:public` (shipped 2026-08-20) already accepts a tenant/SKU parameter or is a single fixed demo page. If the latter, this is a prerequisite build item, sequenced ahead of the Shopify app itself.

### 9.2 New `capabilities.json` entries required

No `dpp`, `shopify`, `ecommerce`, or `marketplace` capability IDs exist today. Per this repo's own rule, any new Shopify-write or Amazon-related capability must be declared before it can be called. Proposed (names illustrative, not final):
- `ecommerce.shopify_products_write_v1` — write passport metaobject/metafield to a merchant's product
- `ecommerce.shopify_passport_status_read_v1` — surface `dppProducts.passportStatus` inside the app dashboard
- (Amazon: deliberately none proposed yet, per §7.6's recommendation not to build against SP-API now)

### 9.3 Pricing/packaging decision needed before billing is wired

CODEX 71 §19a's hard pricing rule stands: **only the $99/month Base tier is currently approved for external quoting; Growth ($999) and Scale ($1,799) are confirmed not safe to quote.** Whether the Shopify app is a bundled feature of the existing DPP worker subscription or a separately-billed Shopify-native charge (via the Billing API, §5.8) needs a decision before implementation, not after — it changes whether the app even needs Shopify Billing API integration at all.

---

## 10. Build Plan (Shopify only — Amazon deferred per §7.6)

Rough phasing, not yet time-boxed against real engineering capacity (per CODEX 71 §12a's still-open point about what "Tier 1 priority" means in actual engineer-days):

1. **Competitor trial** (§4) — install PassportPro and PassportEU on a dev store; document their actual OAuth/metaobject/theme-extension UX before writing SOCIII's own.
2. **Confirm/build passport-viewer parameterization** (§9.1) — blocking prerequisite.
3. **Partner account + public app registration** (§5.1–5.2), distribution method locked in deliberately.
4. **GraphQL Admin API integration** — product read/write, metaobject definition + metafield attachment (§5.3–5.4).
5. **Theme app extension** — the storefront QR/passport widget (§5.5).
6. **Compliance webhooks** (§5.6) — table stakes for submission.
7. **New capabilities.json entries** (§9.2) wired into the existing `dppProducts` model (§3.3) — no parallel data model.
8. **Billing decision executed** (§9.3) — bundled vs. Shopify Billing API.
9. **Submit for App Store review** — budget multiple weeks, unconfirmed exact median.

---

## 11. Open Decisions for Sean

1. **Differentiation vs. the 5 live Shopify competitors** — lead with the multi-party supply-chain gap and/or real registry submission (§13's recommendations), rather than competing on generic AI-auto-fill or category breadth where competitors already crowd the space? Recommend deciding this only after the competitor trial in §10 step 1 (now sharpened by §13's per-app teardown).
2. **Billing/packaging** (§9.3) — bundled into existing DPP subscription, or a separate Shopify-billed charge? Gates whether Shopify Billing API work is even in scope. §13 finding: price a transparent mid-tier ($30–50/mo) rather than matching either the unsustainably-cheap floor ($9.99–19.99/mo, where real Annex-XIII depth isn't plausible) or PassportEU's vague, self-contradictory enterprise tier.
3. **Amazon posture** — confirm agreement to "list on SPN now (§15), track EPR, don't build SP-API yet" (§7.6), or does Sean want a harder push on SP-API registration regardless (e.g., to be first if/when Amazon does add a DPP mechanism)? SPN listing itself is nearly a non-decision (free, fast, no downside) — the live question is only about the SP-API build.
4. **Passport-viewer parameterization** (§9.1) — needs a direct answer from whoever built the 2026-08-20 route (commit `015dede9`/`0dcaa085`), not guessed here.
5. **Physical QR/label workflow for Amazon-sold products** (§7.6 item 2) — is this worth building as its own small deliverable now, independent of any SP-API decision, given it sidesteps the unresolved listing-QR policy question entirely?
6. **[Added same-day] On-chain anchoring for DPP specifically** — §14 confirms no competitor has real cryptographic tamper-evidence, which is a genuine open lane, but it's not yet confirmed that SOCIII's existing Base-anchoring tech (live for other record types per CODEX 71 §9b) is actually wired into `dppProducts`/passport records. Worth confirming and, if not yet wired, prioritizing — it would be a clean, defensible, honestly-earned differentiator against every named competitor.
7. **[Added same-day] Who actually applies to Amazon's SPN** (§15) — business/identity verification is required (business license, government ID for the legal rep); needs Sean or whoever holds that authority to initiate, not something that can be done from code.

---

## 12. Sourcing Note

All Shopify and Amazon claims above are sourced inline to `shopify.dev`, Shopify's own changelog, Amazon's own developer docs (`developer-docs.amazon`), and Amazon's Seller Central Europe help pages where possible; secondary sources (blogs, forum threads) are explicitly labeled as such and flagged wherever they couldn't be cross-checked against a primary page. Three items are flagged as genuinely unverified and worth direct confirmation before implementation locks in: the exact Shopify metafield-scope name (§5.3), whether GDPR webhooks can only be registered via Shopify CLI (§5.6), and whether any Amazon policy exemption exists for legally-mandated QR codes (§7.4/§8's Amazon side). §13–§15 (added same-day) follow the same sourcing discipline — see each section's inline citations.

---

## 13. Deep Competitor Teardown (added same-day, per Sean's request)

### 13.1 Launch-date reality check

Sean's instinct — "these all launched in the last few weeks" — is **half right**. Shopify reviews lag true launch by months (merchants are slow to review), so low review counts don't mean recent launches. Actual first-listing dates:

| App | Listed since | Reviews | Reality |
|---|---|---|---|
| PassportPro | Dec 29, 2025 | 0 | **Oldest of the five — 8 months live with zero traction.** Reads as a failed/abandoned listing, not a fresh threat. |
| Passtiq | Apr 20, 2026 | 0 | ~4 months, no reviews |
| PassportEU | Apr 21, 2026 | 1 (5★, 24hrs of use) | ~4 months |
| PassoNext | May 11, 2026 | 2 (5★, one-line, thin) | ~3 months |
| SolveDPP | Jul 24, 2026 | 2 (5★, substantive) | **Only genuinely new entrant — ~1 month old** |

Only SolveDPP matches "last few weeks." The other four have been live for months with negligible-to-thin adoption — the real signal is a land-grab reacting to the same ESPR/battery-deadline timeline SOCIII is targeting, not entrenched incumbents.

### 13.2 Per-app depth, pricing, and category-specificity

| | PassportPro | PassportEU | SolveDPP | Passtiq | PassoNext |
|---|---|---|---|---|---|
| Developer | "Velvet Development" (Madrid — unverifiable, no web presence) | NovaStack (general software studio, unrelated client work) | Ledgercloud (Hamburg — established SaaS vendor, already sells a live Shopify→DATEV/BMD accounting-export product) | Lumine (Hanoi — indie shop, several unrelated small apps) | Mandasa Technologies (real 10+yr, 5,000+ project Shopify agency — DPP is a side product) |
| Top-tier price | $19.99/mo unlimited | $79–$299/mo (**own website and own Shopify listing show different tier structures — a real ops/trust weakness**) | $9.99/mo unlimited (tier naming is backwards — "Pro" cheaper than "Starter") | $49/mo unlimited | $80/mo unlimited |
| Battery-specific? | Bullet only, among textiles/electronics | **Yes — explicit "80+ attributes / 7 clusters," cites Battery Reg 2023/1542 directly** | Listed as a target vertical; battery landing page **404s** — depth unconfirmed, likely thin | **No — explicitly textile-first**, no battery mention anywhere | Contradictory: Shopify listing omits batteries entirely; the developer's own forum launch post claims battery coverage |
| AI-fill specificity | Vague ("Gemini AI Auto-fill assistant") | Most specific — "pre-fills 80% of fields" from existing catalog text | Names actual sources (metafields/product text/Excel) | Vaguest ("AI drafts fields for review") | Vague ("AI and bulk generation") |
| Registry submission claim | None | None (only "structured export") | None | None | None |
| Supply-chain handling | Manufacturer address book only | Unexplained "traceability" bullet, gated to undisclosed Enterprise tier | **Best of the five** — CSV/ERP import + a customer testimonial about "automating supplier onboarding," but still manufacturer-side consolidation, not a true multi-party supplier portal | None | None |
| GS1 Digital Link | No | Pro+ tier only | No | No | **Yes, on every plan** — the one genuinely solid technical choice found |

**Packify** (adjacent — packaging EPR under PPWR, not DPP, $7/mo) is worth studying for *positioning technique* rather than as a direct competitor: it builds cheap credibility by naming real national registries (LUCID/Germany, Citeo/France, CONAI/Italy, Ecoembes/Spain) and a real deadline (Aug 12, 2026), with an explicit "not legal advice" disclaimer, rather than claiming to be a system of record.

### 13.3 How SOCIII should be better — concrete, not generic

1. **Lead with the multi-party supply-chain gap.** Confirmed wide open — four of five competitors don't touch it at all; SolveDPP's CSV-import pattern is the closest anyone gets, and it's still single-party consolidation, not a real supplier-side portal with independent attestation. This is SOCIII's Supply Chain Tracer's whole reason for existing (CODEX 31) and the single most defensible thing to put in Shopify listing copy and demo video, not a generic "we're more compliant" pitch.
2. **Match PassportEU's specificity, then out-substantiate it.** It's the only competitor whose language ("80+ attributes / 7 clusters" / direct Battery Reg 2023/1542 citation) mirrors SOCIII's real internal model — and it has a single 24-hour-old review behind the claim. SOCIII wins by showing a real populated battery passport with named cluster/field labels and a mapping table against actual Annex XIII line items, not by matching the marketing language.
3. **Battery-specificity is a nearly open lane.** Only PassportEU makes a substantive battery claim; PassoNext's is self-contradictory; the rest are absent or explicitly textile-first. Lead the Shopify listing with battery as the primary use case, not one bullet among four categories — the generic multi-category pattern Sean suspected is confirmed true for four of five.
4. **Nobody claims real registry submission — a clean, low-risk claim to be first on.** Makes sense given the registry only went live 20 Jul 2026 with verified-economic-operator gating — nobody plausibly has it built. Whoever gets actual registry submission (even a beta/waitlist) working first has an uncontested claim.
5. **Steal Packify's "named registries, named deadlines" credibility pattern.** Cite the actual Feb 2027 deadline, Battery Regulation (EU) 2023/1542 by number, and the 20 Jul 2026 registry go-live directly in listing copy — costs nothing extra and reads far more credible than any competitor's generic "AI-powered compliance" language.
6. **Price transparently in the $30–50/mo range**, explicit about what supply-chain access actually includes (e.g., "up to N supplier accounts," "custody event log") — directly exploiting PassportEU's self-inflicted vagueness on its own $299/mo "Enterprise" tier.
7. **Bake real, named-support-person reviews into launch strategy.** SolveDPP's two reviews (naming a real support person, describing a real competitive bake-off) read as disproportionately convincing for a 1-month-old app. That pattern is cheap and achievable — make sure SOCIII's first Shopify reviews come from merchants who can speak to specific interactions, not generic praise.

**Honest caveat carried over from the research pass:** nothing found here should change SOCIII's roadmap on substance — depth is thin everywhere except PassportEU's *claims* (unproven) and SolveDPP's *authenticity* (small but real). The battery-passport-plus-supply-chain space on Shopify is genuinely still open; the real risk is timing (four of five competitors already have 3+ months of listing/SEO history), not being out-built.

---

## 14. Data Hosting &amp; Anchoring — Competitor Gap (added same-day)

Went past each competitor's Shopify listing into their own marketing site / privacy policy. All quotes below are verbatim from the cited page.

| App | Hosting/infra disclosed | Amendment/versioning claim | Blockchain/on-chain/hash claim |
|---|---|---|---|
| **PassportPro** | Supabase (Postgres, encryption at rest, SOC 2 Type II) + Vercel — named explicitly in its [privacy policy](https://passportpro.app/privacy) | **Strongest of the five**: *"Print run snapshots and amendments are stored in append-only structures to prevent tampering and ensure data integrity"* ([privacy policy](https://passportpro.app/privacy)); marketing site separately claims *"immutable passport snapshots, and full amendment history"* ([passportpro.app](https://passportpro.app/)) | None — explicitly application-layer append-only Postgres, not cryptographic |
| **SolveDPP** | Not disclosed in this pass | *"alle Änderungen bleiben versioniert und prüfbar"* ("all changes remain versioned and auditable") ([solvedpp.com](https://solvedpp.com/)) | None |
| **PassportEU** | Not disclosed in this pass | **None found** — no versioning/history model described anywhere in public materials, a real gap by the team's own standard. Separately notable: its [privacy policy](https://www.passporteu.app/en/privacy) states public passport pages go offline 30 days after subscription cancellation and data is deleted after 90 days — a real concern for a record type meant to persist across a product's lifetime | None |
| **Passtiq** | "PostgreSQL database hosted on secure infrastructure," no cloud provider named ([privacy policy](https://passtiq.com/privacy)) | None found | None |
| **PassoNext** | Not found — no dedicated marketing site/privacy policy located beyond the Shopify listing and a [Community launch post](https://community.shopify.com/t/introducing-passonext-a-digital-product-passport-dpp-app-for-shopify/651124) | Unverified by absence, not confirmed either way | None found (unverified by absence) |

**Synthesis:** zero of the five make any blockchain, on-chain, cryptographic-hash, or notarization claim — a clean, consistent finding. PassportPro's append-only-database framing is the closest anyone gets to a tamper-evidence story, and it's real in spirit but application-layer, not cryptographic. Two competitors (PassportEU, Passtiq) have no amendment-history model at all in public materials — a genuine technical gap given the EU registry's own amendment-lifecycle requirements (CODEX 71 §2's Worker 2 scope). None claim automatic registry submission, consistent with §13.2 — the two that mention registry at all (PassportPro, PassportEU) only claim structured-format export.

**Implication for SOCIII:** real cryptographic tamper-evidence/anchoring is a wide-open gap versus every named competitor — but the marketing differentiation needs to be specific about *mechanism* (on-chain anchoring vs. an app-layer append-only database), not just "we have an audit trail and they don't," since PassportPro's framing is close enough in spirit that a vague claim wouldn't clearly separate SOCIII from it. This is contingent on confirming SOCIII's own Base-anchoring tech (live elsewhere on the platform, "HASH ANCHORED" badges — CODEX 71 §9b) is actually wired into `dppProducts`/passport records specifically, which has not been confirmed in any research pass to date. See Open Decision #6.

---

## 15. Amazon Service Provider Network — A Real Toe-in-the-Door (added same-day)

Sean asked whether SOCIII should "sell the service" on Amazon rather than build a software integration. The answer is **yes, and it's a real, already-proven mechanism, not a stretch.**

### 15.1 What it is

Amazon operates the **[Service Provider Network (SPN)](https://sell.amazon.com/tools/service-provider-network)** — Amazon's own description: *"a group of vetted third-party service providers who can help with almost every step of selling with Amazon."* It's explicitly distinct from the Selling Partner Appstore (§7): *"the Appstore [lists] applications created by software partners... the Service Provider Network lists agencies and individuals who provide specific services and on-demand, personalized assistance."* Sellers browse it inside Seller Central (Apps and Services → Explore Services), filterable by category, location, language, and reviews.

### 15.2 Requirements — low bar, no cost

Per the [registration page](https://spcentral.amazon.com/nlp/register-ww): **free to list** (*"at this time SPN does not charge service providers for listing their services"*), requiring only business verification (business license) and identity verification (government ID for the legal representative). There are 21+ categories, including one literally called **"Compliance"** (*"testing, certification, inspection, audits, and quality assurance"*) and a separate **"Sustainability"** category. No exclusivity requirement found.

### 15.3 Direct precedent — Amazon has already forced exactly this pattern

This isn't speculative. Amazon shut down its own in-house EPR compliance service (new sign-ups ended Sep 2024, service ended Dec 2024 — dates secondary-sourced, not independently confirmed against a primary Amazon announcement) and now explicitly routes sellers to third parties via SPN. Amazon's own German compliance page states: *"Choose a provider from the SPN network (product, tax and EPR compliance)"* ([sell.amazon.de](https://sell.amazon.de/en/einhaltung-der-erweiterten-herstellerverantwortung)), and names actual recommended vendors — **SGS, MTS, QIMA** for general product compliance ([sell.amazon.de/en/spn-product-compliance](https://sell.amazon.de/en/spn-product-compliance)). None of the five EPR vendors previously identified in this suite's research (ForSURE, CIRT, AlgoREP, Ecosurety, EPR Tradex) were confirmed listed in SPN — meaning there's no crowded precedent in your specific comparison set, but clear precedent that *other* compliance vendors are, and that Amazon actively wants this channel populated.

### 15.4 Honest limits

DPP/battery-passport-specific demand on Amazon isn't proven the way EPR/VAT demand demonstrably is — no DPP-specific Amazon compliance page exists (consistent with §7.2's finding that Amazon has no DPP API hook at all). It's also unconfirmed whether the "Compliance" category gets meaningful organic seller browsing versus being checked only when a seller is already in a specific bind (e.g., post-EPR-shutdown panic). This is a low-cost, low-risk, real discoverability/credibility move — not a proven lead-gen channel. Treat it as free marginal upside, not a validated growth channel.

### 15.5 Recommendation

List SOCIII on the SPN under **Compliance** (and consider **Sustainability**) now, independent of any SP-API build decision. It requires business/identity verification from whoever holds that authority (Open Decision #7) — not something buildable from code — but there's no reason to wait on it, and it directly answers Sean's "toe in the door" question with a real yes.
