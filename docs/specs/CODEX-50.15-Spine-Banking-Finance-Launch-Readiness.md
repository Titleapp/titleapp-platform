# CODEX 50.15 — Spine + Banking/Finance Launch Readiness (SPEC)

**Author:** T1 (codebase-validating engineer)
**Date drafted:** 2026-05-05
**Status:** Decisions partially locked by Sean (paid-ad channels, comparison-site shape, static-site stack, Apollo as lead-gen vendor, organic posting via existing Unified.to). Sequencing locked relative to shipped 50.10/50.11/50.13/50.14. Discrepancies between memo and codebase flagged inline.
**Source memo:** `/tmp/codex-50.15-brief.txt` (CODEX 50.15 v2 architectural memo)
**Companion specs:** [CODEX-50.10 Foundation+Phase1 SHIPPED](CODEX-50.10-Foundation-Phase1-SHIPPED.md) · [CODEX-50.11 Improvement Loop](CODEX-50.11-Worker-Improvement-Loop.md) · [CODEX-50.13 Drive/Vault/DTC](CODEX-50.13-Drive-Vault-DTC-Logbook-Integration.md) · [CODEX-50.14 Chain+Hash Anchor](CODEX-50.14-Chain-Anchor-Hash-Anchor.md)

---

## What we're doing

Three pieces of foundation-level work to make the platform launch-ready when the launch is dogfooded on Sean's marketing function and Kent's actual fundraise:

1. **Marketing & Content (PLAT-003) beef-up.** PLAT-003 ships today (`functions/functions/services/alex/catalogs/platform.json:88-108`) as a "professional content co-pilot" with 5 canvas tabs (`functions/functions/helpers/canvasTabs.js:72-78`). The memo's launch-readiness checklist requires it to function as Sean's full marketing team — content creation, brand voice, organic + paid social, email/SMS sequencing, landing pages, lead nurture, lead generation, performance tracking, budget tracking, automation rules, approval workflow, plus a static SEO site and a comparison-site network. The substrate that exists (SendGrid, Twilio, Unified.to, PRLog, campaign engine, lead capture) covers ~40% of the surface; the rest is net-new wiring or building.

2. **Contacts (PLAT-006) beef-up.** Existing contacts schema (`functions/functions/api/routes/contacts.js:42-58`) is a thin v1 with `name`/`type`/`identity_id`/`notes` and `schema_version: spine_v1`. The memo adds tier metadata, lifecycle stage, lead score, source attribution, enrichment fields, named segments, and engagement history — pulled forward from v1.1-deferred status in CODEX 50.13. Marketing cannot function effectively without segmentation; segmentation cannot work without the missing fields.

3. **Fundraise worker (new) + CRE rename + Banking/Finance vertical.** Fork `INV-IR-001 Founder IR` (the founder-archetype IR worker, `services/alex/catalogs/investor.json:14-28`) into a new `BANK-FUND-001 Fundraise` worker registered under a new `banking-finance.json` catalog. Tab structure: Overview/Investors/Data Room/Term Sheet/Cap Table/Communications (6 tabs, fits `TAB_CAP_DEFAULT=6` at `helpers/canvasTabs.js:18`). Rename `W-002 CRE Deal Analyst` → `Real Estate Analyst + Investor` (bundles into Real Estate Developer + Real Estate Manager). Banking/Finance becomes a fully named launch vertical; the existing "Capital Formation" naming retires (it does not exist as a bundle in code today — see Discrepancy #4).

Cross-cutting: the static marketing site (Astro), the comparison-site network (shared infrastructure, multi-domain), and the lead-generation primitive (Apollo) are new infrastructure that both Marketing and Fundraise consume.

## Why we're doing it

The platform's launch credibility rests on dogfooding. If PLAT-003 cannot run TitleApp's own warm-network launch, the "digital workers replace teams" pitch fails its first test. If the Fundraise worker cannot run Kent's actual fundraise, the same pitch fails its second test. Both must work end-to-end before launch — not be incrementally improved post-launch.

Contacts is the data substrate. Without tier/segment/lifecycle/score/source/enrichment/engagement, Marketing cannot target campaigns, route handoffs, or compute CAC. Fundraise cannot run an investor pipeline. Every downstream worker (Real Estate Analyst+Investor, future Banking/Finance workers, all vertical workers) reads contacts.

The Banking/Finance vertical registration is mechanical but architecturally load-bearing: it gives Fundraise a home, retires the misleading "Capital Formation" terminology, and creates the slot for future Lending Origination, Underwriting, Banking Compliance, Wealth Management, Trade Finance, Treasury & Cash Management, and Insurance workers (all post-launch).

## Decisions locked (Sean)

**D-1 — Paid ads at v1.** Google + LinkedIn only. Defer X, TikTok, Meta to v1.1. (B2B regulated industries; X/TikTok/Meta have lower intent and higher creative cost.)

**D-2 — Organic posting at v1.** Full coverage via existing Unified.to integration: LinkedIn, X, Meta (FB+IG), TikTok, YouTube, Google Business Profile, Pinterest, Reddit. Reuse `services/socialService/index.js:16-73` `postViaUnified()`. T1 validates which platforms Unified.to actually supports per their current API and patches gaps. (See Discrepancy #1.)

**D-3 — Static marketing site stack.** Astro. Best for content-heavy SEO sites; islands architecture keeps interactive surfaces light; ships partial hydration which mainstream React/Next don't do as cleanly. Markdown content authoring matches the Marketing worker's natural output format.

**D-4 — Lead-gen vendor.** Apollo. Best price/quality balance among Apollo / Clay / ZoomInfo / Lusha / Sales Navigator. API-only (no scraping, no LinkedIn ToS exposure). $99-149/seat/month for the Pro tier; ~$0.50-1.00 per enrichment via API.

**D-5 — Comparison-site network shape.** Shared infrastructure: one repo, multi-domain mapping, single content pipeline driven by the Marketing worker. Not 5 standalone sites. (Operational complexity collapses; SEO link-equity stays diversified by domain; content updates ship across all sites in one push.)

**D-6 — Banking/Finance is a fully named launch vertical.** Fundraise is its launch worker. Future workers attach as the vertical builds out post-launch.

## Discrepancies between memo and code state

**Discrepancy #1 — "Hootsuite-style API integration confirmed by Sean as existing."** Memo line 28 references "Hootsuite-style API integration confirmed by Sean as existing in the platform." The actual integration is **Unified.to Marketing API**, not Hootsuite (`services/socialService/index.js:6-7,33-48`). Unified.to is a unified-API aggregator that proxies to LinkedIn, X, Meta, TikTok, etc. Functional shape is the same — single API, multi-platform fan-out — but vendor relationships differ (rate limits, OAuth flows, supported features per platform are Unified.to's surface, not Hootsuite's). Sean's intent is preserved; nomenclature corrected.

**Discrepancy #2 — "CRE-archetype IR worker."** Memo (lines 116-119, 145-152) references a "CRE-archetype IR worker" with "~698 lines per CODEX 50.7" of RAAS, to be renamed "Real Estate Analyst + Investor" and forked into Fundraise. The codebase has two distinct workers:

- `INV-IR-001 Founder IR` (`services/alex/catalogs/investor.json:14-28`) — founder-archetype, $79/mo, status `waitlist`, RAAS in `raas/investor/GLOBAL/` (prompts/sops/templates totaling ~298 lines combined). This is the natural fork-source for Fundraise.
- `W-002 CRE Deal Analyst` (`services/alex/catalogs/real-estate-development.json:144-195`) — composite multi-screen deal analyst, $79/mo, status `live`, RAAS prompt at `raas/analyst/GLOBAL/prompts/cre-analyst-system-prompt.md` (139 lines) plus per-screen rulesets in `raas/financing/GLOBAL/` (4 files). Combined RAAS surface is closer to ~700 lines including six deal-screen rulesets (`cre_deal_screen_v0`, `pe_deal_screen_v0`, `debt_acquisition_screen_v0`, `entitlement_screen_v0`, `conversion_screen_v0`, `refinance_screen_v0`).

The memo conflates these. Resolution:
- **Fork source for Fundraise:** `INV-IR-001 Founder IR` (the actual founder-archetype IR worker). Its existing RAAS is the right substrate for founder-side fundraise.
- **Rename target ("Real Estate Analyst + Investor"):** `W-002 CRE Deal Analyst`. This is the worker whose name uses "CRE" terminology Sean dislikes, and whose capability surface (deal screening across 6 deal types) maps to "real estate investment analysis + investor-side analyst." The `W-019 Investor Relations` worker in `real-estate-development.json:1000-1038` (LP-side comms, status `development`) stays as-is for now; it is not the rename target.

**Discrepancy #3 — "Existing campaign engine and SendGrid/Twilio integrations confirmed."** Confirmed in `functions/functions/campaigns/campaignEngine.js` (130 lines, event-triggered campaign matching with dedup + personalization + queueing) and `services/emailService/marketingCampaigns.js` (185 lines, SendGrid Marketing API list/single-send/import/stats). Twilio is wired (per CODEX 50.10-T6 audit) but the SMS sequencing arm of the Marketing worker is wired only at the message-queue level — there is no per-campaign branching logic, opt-in tracking surface, or quiet-hours enforcement layer. Net-new build for SMS sequencing UX/rules.

**Discrepancy #4 — "Capital Formation bundle."** Memo line 158 says "the existing Capital Formation bundle name either retires or is repositioned." There is no `Capital Formation` bundle in the catalog. The bundles in `services/alex/catalogs/real-estate-development.json:2422-2525` are `scott-jma-capital`, `layton-construction`, `blackrock-institutional`. The only "capital"-named primitive is `W-016 Capital Stack Optimizer` (a worker, not a bundle). Resolution: nothing to retire. The Banking/Finance vertical registration creates new bundles from scratch.

**Discrepancy #5 — Studio Locker tier semantics.** Studio Locker uses `tier 1/2/3` for knowledge-document classification (`services/sandbox/studioLocker.js:36-42` — Platform / Professional Library / Worker-Specific). The memo's "tier metadata" on Contacts (personal/professional/confidential/investor/customer/prospect/partner/vendor) is an unrelated taxonomy. Spec uses the field name `contact_tier` to avoid confusion with Studio Locker's `tier`.

**Discrepancy #6 — Founder IR `status: waitlist`.** `INV-IR-001` is `waitlist` today; means it shows in the marketplace but is not provisioned to subscribers. Forking into Fundraise requires either (a) flipping `INV-IR-001` to `live` first or (b) skipping straight to Fundraise registration as `live`. Spec recommends (b) — Fundraise ships `live`; `INV-IR-001` remains as a fork-source artifact and either gets renamed in v1.1 to "Founder Comms Co-Pilot" or retires.

**Discrepancy #7 — Investor KYC primitive coverage.** `services/idVerification.js` is the existing ID-verification primitive but is **creator-side only** — `users/{userId}.idVerificationStatus` per the file header. There is no investor-side KYC surface today. The memo (line 140) says "each invited investor goes through ID verification using the existing idVerification primitive (confirmed in CODEX 50.10-T6)." The primitive is structurally reusable but requires a new caller path: investor-record-scoped KYC at `fundraises/{fundraiseId}/investors/{investorId}` rather than `users/{uid}`. Net-new wiring (~4-6 hours), not net-new construction.

**Discrepancy #8 — Cap table existing surface.** `apps/business/src/sections/InvestorCapTable.jsx` is a working UI (~80+ lines visible) reading `getCapTables`/`getCapTable`/`updateCapTable` API client calls. Backed by `raas` collection (vertical=investor, jurisdiction=GLOBAL). Cap table primitive **does exist** at v1 and supports add-shareholder, model-round, valuation/total-shares display. Memo says "point at existing wallet captables UI for v1" — confirmed feasible. Fundraise's Cap Table tab is an embed/iframe of this surface, not a rebuild.

## Phased plan

Three priority bands. Honest wall-clock estimates at engineering-Claude shipping pace (the 9-hour-vs-30-hour ratio that 50.10 actually shipped at). Items inside each band can parallelize where dependencies allow.

### P0 — Launch-blocking (must ship before warm-network launch)

| # | Item | Estimate | Dependencies |
|---|---|---|---|
| P0-1 | Contacts schema migration (tier, lifecycle, lead_score, source, enrichment, segments collection, engagement subcollection) | 4 hours | None |
| P0-2 | Brand Voice Studio Locker doc + Marketing worker reads on every generation | 3 hours | None |
| P0-3 | Unified.to channel audit + gap-fill (validate which of 8 platforms in D-2 actually post; patch any unwired) | 4 hours | None |
| P0-4 | Marketing worker organic-post canvas tab wired end-to-end (draft → approve → schedule → post → log) | 3 hours | P0-2, P0-3 |
| P0-5 | Email sequencing UX (multi-step drips, branching on open/click/reply, audience = Contacts segment) | 6 hours | P0-1 |
| P0-6 | SMS sequencing wired with TCPA opt-in/opt-out + quiet hours | 4 hours | P0-1 |
| P0-7 | Lead nurture rules engine (scoring updates from email/SMS engagement; threshold-based human-handoff) | 5 hours | P0-1, P0-5, P0-6 |
| P0-8 | Apollo lead-gen integration (search by ICP, enrich, qualify, write to Contacts as new records with source=apollo) | 6 hours | P0-1 |
| P0-9 | Astro static marketing site scaffolded (homepage + 3 vertical pages + pricing + about + blog index) deployed to titleapp.ai | 8 hours | None (parallel) |
| P0-10 | Marketing worker → Astro publish path (worker generates MDX, commits to repo, Cloudflare Pages auto-deploys) | 4 hours | P0-9 |
| P0-11 | Banking/Finance vertical catalog registered (`banking-finance.json`) | 2 hours | None |
| P0-12 | Fundraise worker registered (`BANK-FUND-001`) with 6-tab canvas, fork RAAS from `INV-IR-001` | 5 hours | P0-11, Discrepancy #2 resolved |
| P0-13 | Fundraise Investors tab → Apollo prospecting with investor-ICP defaults | 3 hours | P0-8, P0-12 |
| P0-14 | Fundraise Data Room — Drive partition tagged `fundraiseId` + scoped share-links | 5 hours | P0-12 |
| P0-15 | Fundraise KYC — investor-record-scoped wrapper around `idVerification.js` | 5 hours | P0-12, Discrepancy #7 resolved |
| P0-16 | Fundraise Cap Table tab — embed of `InvestorCapTable.jsx` scoped to fundraise | 2 hours | P0-12 |
| P0-17 | Rename `W-002 CRE Deal Analyst` → `Real Estate Analyst + Investor` (catalog + RAAS prompt + bundles + subscribers backfill) | 4 hours | None |
| P0-18 | Comparison-site repo scaffolded (Astro multi-domain, 3 sites: RE, Aviation, Banking/Finance) | 6 hours | P0-9 |
| P0-19 | Marketing worker performance tab (org+paid rollups, per-campaign + per-channel; reads from `socialPosts`, `emailCampaigns`, ad-channel APIs) | 5 hours | P0-4, P0-5 |
| P0-20 | Marketing worker approval workflow (sample-pack approval at campaign creation; per-out-of-band post approval) | 4 hours | P0-2, P0-4 |

**P0 total:** ~88 hours engineering-Claude pace. At the 50.10 ratio (9h/30h ≈ 0.3x), real wall-clock is ~26-30 hours of focused work. Realistic 1-week sprint with one engineer, half a sprint with two.

### P1 — Launch-adjacent (ship within 2 weeks of launch)

| # | Item | Estimate |
|---|---|---|
| P1-1 | Google Ads integration (campaign create, ad-set, creative upload, lead-gen forms read, conversion tracking) | 12 hours |
| P1-2 | LinkedIn Ads integration (sponsored content, message ads, LinkedIn lead-gen forms read) | 10 hours |
| P1-3 | Marketing automation rules engine (if-then chains with channel triggers — bounce-rate alerts, retargeting, score-threshold notifications) | 8 hours |
| P1-4 | Budget tracking + CAC dashboard + reallocation recommendations (worker recommends, Sean decides) | 6 hours |
| P1-5 | A/B testing infrastructure (variant generation, statistical-confidence promotion) | 5 hours |
| P1-6 | SEO content production cadence (worker maintains a content calendar, drafts blog posts on schedule, publishes to Astro on approval) | 4 hours |
| P1-7 | Comparison-site content production for the 3 launch sites (10 products each, ranked, with TitleApp at #1, real competitors with honest reviews) | 6 hours |
| P1-8 | Comparison-site lead capture (newsletter signup, comparison-guide download, vendor-selection wizard) → Contacts | 4 hours |
| P1-9 | Reply handling for email (inbound replies routed to Marketing worker for nurture continuation, or to Sean/Kent for high-value contacts) | 5 hours |
| P1-10 | Fundraise Data Room manual DTC creation flow (subscription agreements signed → DTC, logbook entry recording signature event) | 4 hours |
| P1-11 | Fundraise Term Sheet tab (deal terms entry, cap-table impact projection via `InvestorCapTable.jsx` model-round, signed-doc tracking) | 5 hours |
| P1-12 | Fundraise Communications tab (investor updates, sequencing via Marketing worker primitives) | 4 hours |
| P1-13 | Bundle structure for Banking/Finance (TitleApp-Founder bundle: Fundraise + Marketing + Contacts at $X/mo) | 2 hours |
| P1-14 | Press release wiring (PRLog already exists at `services/prService/index.js`) — Marketing worker drafts + distributes | 2 hours |

**P1 total:** ~77 hours engineering-Claude pace. ~22-25 hours wall-clock at the 50.10 ratio.

### P2 — Post-launch (v1.1 and beyond, no launch dependency)

| # | Item | Notes |
|---|---|---|
| P2-1 | X Ads integration | Defer per D-1 |
| P2-2 | TikTok Ads integration | Defer per D-1 |
| P2-3 | Meta Ads integration (FB + IG) | Defer per D-1 |
| P2-4 | Automatic budget reallocation across channels (worker decides, not just recommends) | Memo "Does Not Do" line 194 |
| P2-5 | Auto-DTC-on-signed-document for data room (vs manual at v1) | Memo "Does Not Do" line 192 |
| P2-6 | Lightweight investor membership/role primitive for data room access (vs share-link with email verification at v1) | Memo "Does Not Do" line 191 |
| P2-7 | Trust score evolution (auto-publish threshold relaxes as worker establishes track record) | Memo line 104 |
| P2-8 | Bidirectional cap-table on-chain anchor (vs read-and-display + new-issuance recording at v1) | Memo line 142 |
| P2-9 | Tier metadata expansion to per-workspace configurability (vs sensible defaults + simple field at v1) | Memo line 107-108 |
| P2-10 | Additional comparison sites (4-6 more verticals as Marketing worker scales) | Memo line 76 |
| P2-11 | Fundraise non-equity placement tabs (Debt, PE, Real Estate, Fund Formation as additional tabs or tab-switcher) | Memo line 134; founder-equity is launch-priority |
| P2-12 | Future Banking/Finance vertical workers: Lending Origination, Underwriting, Banking Compliance, Wealth Management, Trade Finance, Treasury & Cash Management, Insurance | Memo line 154 |

P2 has no aggregate estimate; each item is independent and prioritized post-launch based on what Sean's actual marketing operation reveals as the next bottleneck.

## Marketing & Content beef-up — keep / extend / build

For each launch-readiness sub-capability, current state vs target. Format: **Keep** = already wired, no changes. **Extend** = wired but missing surface or rules. **Build** = net-new construction.

### Content creation (proactive + reactive)

- **Current:** PLAT-003 generates content via the Alex chat surface (catalog summary at `platform.json:99` "Ready-to-send LinkedIn posts, email campaigns, press releases, and thought leadership"). Drafts saved to `marketingDrafts` collection (`services/socialService/index.js:81-101`). Two-questions-max + minimum-2-variations rules baked into the worker prompt.
- **Target:** Proactive (worker drafts ahead based on campaign calendar) + reactive (Sean asks for a specific post). Both surface drafts for approval.
- **Decision:** **Extend.** Reactive is wired. Proactive needs (a) a campaign calendar primitive on the Marketing worker's Content Calendar tab (already exists at `helpers/canvasTabs.js:76` `card:marketing-content-calendar`), (b) a scheduled job that reads the calendar and drafts ahead, (c) UI surface for "draft ahead" review. ~4 hours.

### Brand voice configuration via Studio Locker

- **Current:** Studio Locker exists (`services/sandbox/studioLocker.js`) with tiered knowledge documents (Tier 1 Platform / Tier 2 Professional / Tier 3 Worker-Specific). Settings page has a `voiceNotes` textarea (`apps/business/src/admin/pages/Settings.jsx:294`) but it does not feed Marketing worker generation.
- **Target:** A Studio Locker doc that defines tone, vocabulary (Digital Worker not AI agent, TitleApp not TitleApp AI, $0/$29/$49/$79 pricing language, 14-day free trial framing, etc.), do-not-say list, example content. Worker reads on every generation.
- **Decision:** **Build.** Create a `marketing_brand_voice` document at `studioLockers/{userId}/workers/platform-marketing/documents/brand_voice` with structured fields (tone, vocabulary_substitutions, do_not_say, example_content). Marketing worker prompt template loads this on every generation. P0-2; ~3 hours.

### Organic social (Unified.to)

- **Current:** `services/socialService/index.js:16-73` — `postViaUnified()` fans out to platforms via Unified.to Marketing API. Platforms array is passed as input; no whitelisting today. Includes scheduling (`scheduledAt` param). Logs to `socialPosts` collection.
- **Target:** Full coverage of LinkedIn, X, Meta FB+IG, TikTok, YouTube, Google Business Profile, Pinterest, Reddit (per D-2).
- **Decision:** **Extend.** Unified.to as a vendor supports all 8 named platforms per their published surface. Need to: (a) audit which 8 are actually wired in the user's Unified.to workspace OAuth (per `UNIFIED_WORKSPACE_ID`), (b) patch any missing OAuth flows, (c) add a UI surface to manage connected accounts. P0-3; ~4 hours.

### Paid ads (Google + LinkedIn at v1)

- **Current:** Nothing wired. No Google Ads or LinkedIn Ads API integration in the codebase.
- **Target:** Google Ads (search, display, YouTube) + LinkedIn Ads (sponsored content, message ads, lead-gen forms read).
- **Decision:** **Build.** Each is its own API surface with OAuth, campaign/ad-set/creative schema, conversion tracking, reporting endpoints. Defer to P1 (P1-1, P1-2). v1 launches with organic + email + comparison-site SEO + warm-network outreach as the demand surface; paid acceleration adds within 2 weeks of launch.

### Performance dashboard

- **Current:** Marketing worker has a "KPIs" canvas tab (`canvasTabs.js:73`) bound to `card:work-product` (generic placeholder). No real metrics.
- **Target:** Per-campaign metrics (impressions, CTR, CPC, conversion rate, CAC, ROAS), per-channel rollups (spend, performance, ROI), organic+paid combined view, A/B variant statistical confidence, automation-rule firing log.
- **Decision:** **Build.** Wire the KPIs tab to read from `socialPosts` (organic), `emailCampaigns` + SendGrid stats API (email), `messageQueue` (SMS), and (P1) Google Ads + LinkedIn Ads APIs (paid). Aggregate in Cloud Functions on a 5-minute scheduler; cache to `marketingPerformance/{userId}/snapshots/{snapshotId}`. P0-19; ~5 hours for org+email; +3-4 hours for ad channels in P1.

### Email/SMS sequencing (existing SendGrid + Twilio)

- **Current:**
  - Email: `services/emailService/marketingCampaigns.js` — list create, single send, contact import, stats. SendGrid Marketing API.
  - SMS: Twilio wired (per CODEX 50.10-T6 audit). Used for one-off sends today; not for sequenced drips.
  - Campaign engine: `campaigns/campaignEngine.js` — event-triggered campaign matching with dedup + personalization + queueing. Single-step today.
- **Target:** Multi-step drips with branching logic on open/click/reply. Personalization from Contacts attributes. Reply handling routed to Marketing worker (nurture continuation) or to Sean/Kent (high-value handoff). TCPA compliance for SMS (opt-in tracking, opt-out honoring, quiet hours).
- **Decision:** **Extend campaign engine.** Add a `sequence` schema to campaign docs (steps with branching conditions). Extend `triggerCampaign` to support multi-step state machines. Add an `engagementHistory` subcollection on contacts that engagement updates feed into. Build SMS opt-in/quiet-hours layer (~4 hours, P0-6). Email reply-handling is P1 (P1-9).

### Landing page generation

- **Current:** No landing page generation surface. Lead capture exists (`services/marketingService/index.js:24-90` — `captureLead` writes to `leads` collection with UTM attribution and a 0-100 lead score).
- **Target:** Marketing worker invokes the existing landing page worker (which stays separate per Sean's architectural intent), generated pages live on the Astro static marketing site for SEO value, lead capture flows into Contacts + Marketing nurture sequence.
- **Decision:** **Build.** No "existing landing page worker" exists in the catalog today (no entry in `platform.json` or any vertical catalog with a landing-page slug). Either (a) register a new `PLAT-008 Landing Page Generator` worker that the Marketing worker invokes, or (b) extend Marketing worker with a landing-page generation capability that publishes MDX templates to the Astro repo. Recommend (b) for simplicity; (a) only if Sean wants the discoverable separate worker for marketplace purposes. P0-9 + P0-10 cover the publish path; landing-page-specific MDX templates are ~3 hours.

### SEO static site (Astro) + content production

- **Current:** No static marketing site. Cloudflare Pages hosting is wired for the apps but not for marketing content. The React app at `apps/admin` and `apps/business` does not render server-side; Google sees almost nothing on titleapp.ai.
- **Target:** Astro static site at titleapp.ai/marketing surface (or a separate apex; T1 picks based on DNS). Hosts homepage, vertical landing pages, blog, pricing, about, comparison content, case studies. React app remains as the authenticated product UI. Marketing worker publishes content via Git-based deployment.
- **Decision:** **Build.** P0-9 (8 hours) scaffolds Astro at `marketing-site/` repo path with: Astro 4.x, MDX support, Tailwind, structured-data (schema.org Organization/Product), sitemap auto-generation, robots.txt, canonical URLs. Cloudflare Pages auto-deploy on push to `main`. P0-10 (4 hours) wires the Marketing worker to commit MDX files via the Cloudflare API or a service-account git push. Existing `apps/admin` Cloudflare Workers Frontdoor (`docs/STATE.md`) does not interfere — Astro deploys to a separate Pages project.

### Comparison site network

- **Current:** Nothing.
- **Target:** Network of vertical-specific comparison sites where TitleApp ranks #1 honestly. Each lists 10 products in the category, ranked, with credible reviews. Initial v1: 3-5 sites (Real Estate, Aviation, Banking/Finance). Marketing worker generates content, maintains refresh cadence, captures leads independently into the same Contacts pipeline.
- **Decision:** **Build, shared infra (per D-5).** P0-18 (6 hours) scaffolds a single Astro repo `comparison-sites/` configured for multi-domain output via `astro:site` config + Cloudflare Pages custom domains. Sean acquires domains separately. Content lives in `content/{site}/products/{slug}.md` per site, and `astro.config.mjs` reads `process.env.SITE_KEY` to filter content. Single content pipeline driven by Marketing worker (P0-10's same publish path, scoped to `comparison-sites` repo with a site-key parameter). P1-7 covers content production for the 3 launch sites; P1-8 covers lead capture.

### Lead nurture + automation rules

- **Current:** Lead capture exists (`marketingService/captureLead`); `computeLeadScore` is a basic UTM/promo/source 0-100 scorer (`marketingService/index.js:13-22`). No nurture sequences post-capture.
- **Target:** Multi-step automated email + SMS sequences based on contact behavior. Branching on open/click/reply. Lead-score updates from engagement. Threshold-based human-handoff (high-score contacts flagged for direct follow-up by Sean or Kent).
- **Decision:** **Build.** P0-7 (5 hours) wires nurture rules engine: campaign events → `engagementHistory` writes → score updates → threshold checks → handoff alerts. P1-3 (8 hours) extends with a general if-then rules engine for non-nurture automation (bounce-rate alerts, retargeting hints, etc.).

### Lead generation (Apollo)

- **Current:** Nothing.
- **Target:** API-based prospecting (no scraping, no LinkedIn ToS exposure). Search by ICP criteria, enrich, qualify, write to Contacts as new records tagged with source. Same primitive serves Kent's investor-prospecting use case in Fundraise.
- **Decision:** **Build, vendor = Apollo (per D-4).** P0-8 (6 hours) wires Apollo: OAuth/API key, search endpoint with ICP params (industry, role, company size, geography, technographics), enrichment endpoint, qualification scoring against per-workspace ICP profile. Writes new contacts with `source: 'apollo'`, lifecycle `cold`, lead_score from Apollo confidence + ICP match. Cost: ~$0.50-1.00 per enrichment via API; budget surface in P1-4.

### Budget tracking

- **Current:** Nothing.
- **Target:** Per-channel and per-campaign budget caps, spend velocity monitoring with alerts, CAC calculation per channel, reallocation recommendations.
- **Decision:** **Build.** P1-4 (6 hours) — depends on P1-1 + P1-2 ad channel integrations for spend data, and P0-19 performance dashboard for CAC denominator (converted leads). Worker recommends; Sean decides. Auto-reallocation deferred to P2-4.

### Approval workflow

- **Current:** Per-draft approve/reject exists in `services/socialService/index.js:139-202`. No campaign-level sample-pack approval.
- **Target:** Sean approves campaign tone/voice + 5-10 sample posts at campaign creation. Worker auto-publishes within those parameters during the campaign. Out-of-parameter content flagged for explicit approval.
- **Decision:** **Extend.** P0-20 (4 hours) — add a `marketingCampaigns/{campaignId}/samples/{sampleId}` collection with per-sample approval status; campaign-level `tone_approved`, `samples_approved` flags; worker-side check on every generation (matches approved tone/voice, structurally similar to approved samples → auto-publish; otherwise → flag for approval).

## Contacts beef-up — schema additions

Existing schema (`api/routes/contacts.js:42-58`):
```js
{
  tenantId, schema_version: "spine_v1",
  name, type, identity_id,
  workspaces: [workspace_id],
  added_by, notes,
  created_at, updated_at
}
```

Existing `type` enum (line 42): `customer | vendor | investor | tenant | employee | patient | student | contractor | personal`.

**Target schema additions** (schema_version bumps to `spine_v2`):

```js
{
  // existing v1 fields preserved
  ...,

  // NEW v2 fields
  contact_tier: "personal" | "professional" | "confidential" | "investor" | "customer" | "prospect" | "partner" | "vendor",
  // (overlaps with existing `type`; recommend `type` becomes `contact_tier`'s alias and deprecates v1.1)

  lifecycle_stage: "cold" | "warm" | "engaged" | "converted" | "churned" | "lost",

  lead_score: number, // 0-100, updated by Marketing scoring rules

  source: {
    primary: "campaign" | "landing_page" | "comparison_site" | "apollo" | "manual_import" | "api" | "chat" | ...,
    sub: string | null, // campaign-id, landing-page-slug, etc.
    utm_source, utm_medium, utm_campaign, utm_content, ref, promo_code,
    captured_at: timestamp
  },

  enrichment: {
    company: string | null,
    company_size: string | null, // "1-10" | "11-50" | "51-200" | etc.
    industry: string | null,
    role: string | null,
    seniority: string | null,
    social: { linkedin: url|null, twitter: url|null, ...},
    source: "apollo" | "manual" | "import",
    enriched_at: timestamp
  },

  segments: [string], // array of segment slugs this contact belongs to

  // engagement history lives in subcollection (size unbounded)
  // contacts/{contactId}/engagement/{eventId}: { type: "email_sent" | "email_open" | "click" | "reply" | "sms_sent" | "sms_reply" | "call_scheduled", channel, campaignId, payload, timestamp }
}
```

**Segments collection** (workspace-scoped saved queries): `segments/{segmentId}`:
```js
{
  tenantId, slug, name,
  query: {
    contact_tier?, lifecycle_stage?, lead_score_min?, segments_contain?, source_primary?,
    enrichment_filters?: { industry?, role?, company_size?, ... },
    custom_filters?: [{ field, op, value }]
  },
  created_at, created_by, last_evaluated_at, last_count
}
```

**Engagement subcollection** at `contacts/{contactId}/engagement/{eventId}` — append-only per CLAUDE.md invariant.

**Migration mechanics:**
- Schema version bumps `spine_v1` → `spine_v2`. Existing contacts get backfilled with `contact_tier` mapped from `type`, `lifecycle_stage: "cold"` default, `lead_score: 0`, empty `enrichment`, empty `segments`, empty `engagement` subcollection.
- Backfill script lives at `functions/functions/scripts/migrateContactsV2.js`. One-shot run at deploy time.
- Existing list/create/put/delete handlers (`api/routes/contacts.js`) updated to read/write v2 fields. v1 reads remain compatible during transition window.

**Indexes needed** (add to `firestore.indexes.json`):
- `contacts (tenantId ASC, lifecycle_stage ASC, lead_score DESC)` — segment evaluation
- `contacts (tenantId ASC, contact_tier ASC, created_at DESC)` — tier-filtered lists
- `contacts (tenantId ASC, source.primary ASC, created_at DESC)` — source attribution dashboards
- `segments (tenantId ASC, slug ASC)` — workspace-scoped lookup

P0-1; ~4 hours including migration script + index deploys.

## Fundraise worker (NEW) — fork from `INV-IR-001`

### Worker registration

New entry in a new catalog file `services/alex/catalogs/banking-finance.json`:

```js
{
  vertical: "banking-finance",
  name: "Banking & Finance",
  version: "1.0.0",
  lifecycle: [
    { phase: 0, name: "Capital Formation", description: "Founder-side and operator-side fundraising — equity, debt, PE, fund formation" }
    // Future phases: 1 Lending Origination, 2 Underwriting, 3 Wealth Management, etc. — empty at v1.
  ],
  suites: [
    { id: "capital-formation", name: "Capital Formation" }
  ],
  workers: [
    {
      id: "BANK-FUND-001",
      name: "Fundraise",
      slug: "fundraise",
      suite: "Capital Formation",
      phase: 0,
      type: "composite",
      pricing: { monthly: 79 },
      status: "live",
      capabilitySummary: "Founder-side fundraising co-pilot. Equity (KISS, SAFE, convertible, seed), debt placements, PE placements, fund formation. Investor prospecting via Apollo. Data room with scoped sharing and KYC. Cap table integration. Communications via Marketing worker.",
      tags: ["fundraise", "investor-relations", "founder", "capital-formation", "kyc"],
      valueBucket: ["raise_capital", "communicate_clearly"],
      alexRegistration: { priority: "high", acceptsTasks: true, briefingContribution: "fundraise_status" },
      temporalType: "always_on"
    }
  ],
  bundles: [
    {
      id: "titleapp-founder",
      name: "TitleApp Founder",
      description: "Spine + Fundraise bundle for early-stage founders running a fundraise alongside the company.",
      persona: "founder",
      workerIds: ["PLAT-001", "PLAT-003", "PLAT-006", "PLAT-004", "BANK-FUND-001"],
      monthlyPrice: 79,
      replaces: "$10K+/mo in solo-founder ops + investor relations support"
    }
  ]
}
```

P0-11 (catalog registration) + P0-12 (worker doc + tabs + RAAS fork): ~7 hours combined.

### Fork mechanics from `INV-IR-001 Founder IR`

Per memo Open Question line 178, three fork options:

(a) **Copy-and-modify** — duplicate the worker doc, new workerId. Independent evolution.
(b) **Reference-share RAAS** — new worker registers, points at existing RAAS by reference.
(c) **Use existing forking infrastructure** (per CODEX 50.3, API-only without UI surface).

**Recommendation: (a) copy-and-modify.** Reasons:
- `INV-IR-001` is `waitlist`, not provisioned to subscribers. No live-state fork concerns.
- Fundraise needs RAAS additions (founder-archetype equity, debt placements folded from `INV-DEBT-001`, PE folded from `INV-PE-001`, fund-formation reference to `INV-FUND-001`). Reference-share would require parallel evolution; copy-and-modify keeps both clean.
- Existing forking infrastructure (option c) per CODEX 50.3 is API-only — using it for a one-time bootstrap adds no value.

**Mechanics:**
1. Copy `raas/investor/GLOBAL/` → `raas/banking-finance/GLOBAL/`. Rename prompts, sops, templates.
2. Author `raas/banking-finance/GLOBAL/prompts/fundraise-system-prompt.md` extending Founder IR with: SAFE/KISS/convertible note generation, equity-round mechanics, term-sheet review, debt-placement screening (folded from `INV-DEBT-001`), PE-placement screening (folded from `INV-PE-001`), fund-formation cross-reference (delegates to `INV-FUND-001`).
3. Reuse `ir_compliance_v0` ruleset (`functions/functions/raas/rulesets/ir_compliance_v0.json`) for securities compliance — Reg D 506(b)/506(c), Reg CF, Reg A — already authored, no duplication needed.
4. New ruleset `fundraise_v0.json` with founder-specific hard stops (e.g., "valuation cap < $1M flagged as unusually low", "discount rate > 30% flagged", "post-money valuation modeling required for SAFE conversion").

### Tab structure (6 tabs, fits `TAB_CAP_DEFAULT=6`)

Add to `helpers/canvasTabs.js`:

```js
const FUNDRAISE_TABS = [
  { id: "overview",       label: "Overview",       signal: "card:fundraise-overview",       default: true, order: 0 },
  { id: "investors",      label: "Investors",      signal: "card:fundraise-investors",                     order: 1 },
  { id: "data-room",      label: "Data Room",      signal: "card:fundraise-data-room",                     order: 2 },
  { id: "term-sheet",     label: "Term Sheet",     signal: "card:fundraise-term-sheet",                    order: 3 },
  { id: "cap-table",      label: "Cap Table",      signal: "card:fundraise-cap-table",                     order: 4 },
  { id: "communications", label: "Communications", signal: "card:fundraise-communications",                order: 5 },
];
```

Add a routing branch in `generateDefaultTabs`:
```js
if (slug === "fundraise") return FUNDRAISE_TABS.map(t => ({ ...t }));
```

Per memo line 134, non-equity placement types (Debt, PE, Real Estate, Fund Formation) are NOT additional tabs at v1 — there's no room (6/6 tabs used). Resolution: founder-equity is the launch tab content; non-equity types appear via tab-switcher within Overview at v1.1 (P2-11).

### Data Room implementation depth

Per memo line 138-140, v1 ships: Drive partition tagged with `fundraiseId` + scoped read access via share-link with email verification.

**Mechanics (P0-14, ~5 hours):**
1. New collection `fundraises/{fundraiseId}` — fundraise instance scoped to a tenant. Fields: `tenantId`, `name`, `stage` (active/closed/cancelled), `targetRaise`, `currentRaised`, `lead_investor`, `created_at`.
2. Drive partition: existing `storageObjects` collection (per CODEX 50.13) gets a `fundraiseId` field where applicable. Files uploaded inside the Data Room tab carry `fundraiseId` set; files outside don't.
3. Scoped share-link: new collection `fundraiseShares/{shareId}` — `fundraiseId`, `email`, `expiresAt`, `verifiedAt`, `accessLog: []`. Email verification via existing magicLink primitive (`services/magicLink.js`).
4. Investor-side data room view: a new public page `/fundraise/{shareId}` reads share-token, verifies email, lists Drive files filtered by `fundraiseId` + `share.allowedFiles` (subset selection at share creation).
5. Document DTC creation: per memo line 139, manual at v1 (auto-mint-on-sign deferred to v1.1, P2-5). When a subscription agreement is countersigned, Sean (or Kent) clicks "Mint DTC" in the Data Room tab. Reuses existing DTC creation primitives from CODEX 50.13/50.14. Logbook entry recording the signature event auto-appends.

### KYC integration

Per memo line 140, "each invited investor goes through ID verification using the existing idVerification primitive" — but per Discrepancy #7, the existing `idVerification.js` is creator-side (`users/{userId}.idVerificationStatus`), not investor-side.

**Mechanics (P0-15, ~5 hours):**
1. Investor record schema at `fundraises/{fundraiseId}/investors/{investorId}`: `contactId` (FK to Contacts collection), `email`, `kycStatus` (`not_submitted` | `pending` | `approved` | `rejected`), `kycSubmittedAt`, `kycVerifiedAt`, `kycRejectionReason`, `accreditationStatus` (`unverified` | `self_attested_accredited` | `verified_accredited`).
2. New service `services/investorKyc.js` — wraps `idVerification.js` state machine but writes to investor record path instead of user record. Reuses photo-upload, admin queue, SendGrid notifications. Storage path `/verifications/fundraises/{fundraiseId}/investors/{investorId}/`.
3. Verified-status tracked on the investor record. KYC artifacts attached as DTCs (per memo line 140) for audit trail — reuses CODEX 50.14 chain anchor for permanence.

### Cap Table integration

Per memo line 142, v1 ships read-and-display + new-issuance recording. Bidirectional on-chain integration is v1.1 (P2-8).

**Mechanics (P0-16, ~2 hours):**
- The Cap Table tab is an embed of `apps/business/src/sections/InvestorCapTable.jsx` filtered by `fundraiseId`. Existing API client calls `getCapTables({ vertical: 'investor', jurisdiction: 'GLOBAL' })` → modify to accept optional `fundraiseId` parameter for fundraise-scoped filtering. Backend RAAS store filters cap-table records by fundraiseId where present.
- Add-shareholder UX from `InvestorCapTable.jsx` already supports new-issuance recording (line 59-80). Round modeling already exists (line 25-27 `showModel`/`modelAmount`/`modelValuation`).

### Investor prospecting (Apollo via Marketing's lead-gen primitive)

Per memo line 144, Fundraise invokes the same Apollo prospecting capability as Marketing.

**Mechanics (P0-13, ~3 hours):**
- Investors tab calls `apolloPeopleSearch` (built in P0-8) with investor-specific ICP defaults: `seniority: ["VP", "Director", "Partner"]`, `roles: ["investor", "venture", "private equity", "angel"]`, `industries: [user-configured]`, `geography: [user-configured]`.
- Returned prospects flow into Contacts as new records with `contact_tier: "investor"`, `lifecycle_stage: "cold"`, `source.primary: "apollo"`, `source.sub: "fundraise:{fundraiseId}"`. Tagged in `segments` array with `fundraise_{fundraiseId}_prospects`.
- Investors tab UI lists contacts where segment includes `fundraise_{fundraiseId}_prospects`. Add-prospect manually also possible.

## CRE IR worker rename — `W-002` → "Real Estate Analyst + Investor"

Per Discrepancy #2 resolution, the rename target is `W-002 CRE Deal Analyst`, not `INV-IR-001`.

### Migration concerns + blast radius

**Catalog rename** (`services/alex/catalogs/real-estate-development.json:144-195`):
- `name: "CRE Deal Analyst"` → `"Real Estate Analyst + Investor"`
- `slug: "cre-deal-analyst"` → keep slug for backward compat (URL stability), OR add a slug alias if Sean wants the slug to match the new name. Recommend keeping slug; aliasing introduces routing complexity for negligible UX gain.
- `briefingContribution: "Scores CRE deals against investment thesis"` → `"Scores real estate deals and investor opportunities against thesis criteria"`.
- `capabilitySummary` updated to remove "CRE" terminology and include investor-side framing.

**RAAS prompt rename** (`raas/analyst/GLOBAL/prompts/cre-analyst-system-prompt.md`):
- File rename → `real-estate-analyst-investor-system-prompt.md`.
- Header rename: `# CRE Deal Analyst — System Prompt (W-002)` → `# Real Estate Analyst + Investor — System Prompt (W-002)`.
- Body: replace "CRE Deal Analyst" with "Real Estate Analyst + Investor" throughout. Keep "commercial real estate" descriptive language where it accurately describes scope (not the worker name).

**Bundle membership** (`real-estate-development.json:2422-2525`):
- `scott-jma-capital` bundle includes `W-002`. Keep.
- `blackrock-institutional` bundle includes `W-002`. Keep.
- Add to a new `real-estate-developer` bundle if one ships (not in catalog today).
- Memo line 149 says "potentially appears in Real Estate Manager bundle if T1 confirms relevance." There is no `real-estate-manager` bundle in catalog today. If/when it ships, include W-002.

**Subscriber records:** `subscriptions` collection has records keyed by `workerId` and `slug`. Slug stays `cre-deal-analyst` (per recommendation above), so subscriber records do NOT migrate. The displayed name updates next time the catalog is fetched.

**Search index:** if there's a Firestore-backed search/discovery index, it reads from catalog name. Updates on next catalog reload. No migration needed.

**Marketplace cache:** the `digitalWorkers` collection mirrors catalog entries (per `helpers/workerSync.js`). Run `workerSync` to push the new name into Firestore; UI consumers (per `useWorkerCatalog`) fetch updated docs on next mount. Migration is a single sync job run.

**Cross-references in other RAAS prompts:** Multiple other workers reference `W-002 CRE Deal Analyst` by name in their system prompts (e.g., `raas/site-selection/GLOBAL/W-003-site-due-diligence-rules.md:17`, `raas/construction/GLOBAL/prompts/capital-stack-optimizer-system-prompt.md:225,239`, `raas/investor/GLOBAL/prompts/investor-relations-system-prompt.md:133`, `raas/entitlement/GLOBAL/W-004-land-use-entitlement-rules.md:118`). Rename references too. ~30 minutes of grep-and-replace.

P0-17 total: ~4 hours including catalog edit, RAAS prompt rename, cross-reference updates, workerSync run, and verification that all Alex-routed messages still resolve correctly.

## Banking/Finance vertical registration in catalog

Per D-6, fully named launch vertical. P0-11 ships:
- New file `services/alex/catalogs/banking-finance.json` (structure shown in Fundraise section above).
- Update `services/alex/catalogs/loader.js` to include `banking-finance.json` in the catalog load list.
- `helpers/workerSync.js` — add an entry mapping `BANK-FUND-001` → `fundraise` slug.
- `helpers/userProvisioning.js` — Fundraise is a paid worker, NOT auto-provisioned at signup. No change.

**Bundle decision (Discrepancy #4 resolved):** No "Capital Formation" bundle exists to retire. Banking/Finance ships fresh with one bundle: `titleapp-founder` (Spine + Fundraise, $79/mo entry-level for solo founders). Future bundles (`venture-fund-formation`, `corporate-finance-team`, etc.) attach as more workers join the vertical post-launch.

P0-11 total: ~2 hours.

## Astro static site infrastructure

### Repo structure

New top-level directory `marketing-site/`:
```
marketing-site/
├── astro.config.mjs            # Astro 4.x config, MDX, Tailwind, sitemap, structured data
├── content/
│   ├── pages/                  # MDX pages (index, pricing, about)
│   ├── verticals/              # Per-vertical landing pages (real-estate, aviation, banking-finance)
│   ├── blog/                   # Blog posts (long-form SEO)
│   └── case-studies/           # Customer stories
├── src/
│   ├── components/             # Astro components (Header, Footer, CTABlock, etc.)
│   ├── layouts/                # Page layouts (Default, Vertical, Blog, ComparisonGuide)
│   ├── pages/                  # File-based routing
│   └── utils/                  # SEO helpers, schema.org generators
├── public/                     # Static assets
├── package.json
└── README.md
```

### Deployment pipeline

- Cloudflare Pages auto-deploys on push to `main` branch of `marketing-site` repo.
- Custom domain: `titleapp.ai` (apex). The existing React product app moves to `app.titleapp.ai` subdomain.
- Existing Cloudflare Frontdoor at `titleapp-frontdoor.titleapp-core.workers.dev` (per `docs/STATE.md`) does not interfere — Astro deploys to a separate Pages project; routing is by domain, not by Frontdoor path rules.

**DNS migration sequence (no code change):**
1. Pre-launch: deploy Astro to `marketing-site.pages.dev` for verification.
2. At launch: cut DNS — `titleapp.ai` apex → Astro Pages, `app.titleapp.ai` → existing React product app, both via Cloudflare proxy.
3. Add 301s in Cloudflare Pages config for any pre-existing marketing routes that change.

### Integration with Marketing worker's content publishing

Two paths considered:
- (a) **Headless CMS (Decap, Sanity, Contentful)** — Marketing worker posts content to CMS API; Astro builds from CMS. Adds a vendor + ongoing cost.
- (b) **Direct Git push** — Marketing worker commits MDX files via GitHub API or service-account git push. Astro auto-builds on push.

**Decision: (b) direct Git push.** No additional vendor; lowest operational complexity; fits Sean's preference for transparent infrastructure. P0-10 (4 hours):
1. GitHub PAT scoped to `marketing-site` repo, stored in Cloud Functions secret manager.
2. New service `services/marketingService/publish.js` — `publishMdx({ contentPath, frontmatter, body, commitMessage })` → uses GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`) to commit.
3. Marketing worker's content-creation flow (when content type is `blog | landing_page | comparison_listing`): generate MDX → call `publishMdx` → Astro auto-builds → live in ~30s.
4. Approval gate: content publishes only after Sean approves (per existing approve-draft flow). On approval, draft transitions `approved` → `published` and `publishMdx` fires.

### Comparison-site domain mapping

Per D-5, single repo, multi-domain. Astro supports this via build-time `SITE_KEY` env var:

```
comparison-sites/
├── astro.config.mjs            # Reads process.env.SITE_KEY, configures `site` and content collections
├── content/
│   ├── real-estate/            # SITE_KEY=real-estate → bestdigitalworkers-realestate.com
│   ├── aviation/               # SITE_KEY=aviation → bestaitools-aviation.com
│   └── banking-finance/        # SITE_KEY=banking-finance → bestircompare.com (or analogous)
├── src/                        # Shared components, layouts
└── package.json
```

Cloudflare Pages: one Pages project per domain, each with `SITE_KEY` env var set, all pointing at the same repo. Each domain builds its own filtered subset.

P0-18 (6 hours): scaffold the repo, configure 3 Pages projects, deploy placeholder content for the 3 launch sites.

## Sequencing relative to in-flight CODEX 50.13/50.14/50.11

Per CODEX 50.10-Foundation-Phase1-SHIPPED.md (line 3): all 8 foundation steps from 50.13/50.14/50.11 + Phase 1 worker activation are SHIPPED as of 2026-05-04. No outstanding foundation dependencies.

This 50.15 spec sequences cleanly:
- **No dependencies on unshipped 50.13/50.14/50.11 work.** Drive/Vault separation, DTC schema v2, hash anchor, chain anchor (Crossmint/Polygon), modification-authority gates, contact-webhook tenant filter — all live. Fundraise's Data Room reuses Drive partition primitives that exist. Fundraise's KYC artifact-DTC flow reuses existing DTC creation that exists. Marketing worker's content publishing has no anchor dependency.
- **Builds on 50.11 improvement loop.** When Marketing worker generation produces poor output, Sean uses the per-message feedback surface (shipped 50.10-T8) to flag for retraining. Same path for Fundraise.
- **Independent of orphan ruleset work.** The 32 of 34 orphan rulesets adopted in 50.10 don't intersect this spec. The 2 remaining orphans (intentional exceptions per 50.10 SHIPPED line 3) are unrelated.

Sequencing inside 50.15:
1. **Week 1 (P0-1 through P0-11):** Contacts schema, Brand Voice, Unified.to audit, organic posting wired, email/SMS sequencing, lead nurture, Apollo, Astro scaffold, Banking/Finance catalog. These items can largely parallelize between two engineers.
2. **Week 2 (P0-12 through P0-20):** Fundraise worker (depends on P0-11 catalog), W-002 rename, comparison-site repo scaffold, performance tab, approval workflow.
3. **Week 3-4 (P1):** Paid ads, automation rules, content production, comparison-site content, reply handling, Fundraise Term Sheet/Communications tabs, manual DTC for data room.
4. **Post-launch (P2):** X/TikTok/Meta ads, auto-DTC-on-sign, lightweight investor membership, trust-score evolution, bidirectional cap-table chain, additional comparison sites, Fundraise non-equity tabs, additional Banking/Finance workers.

## Open questions remaining for Sean

After T1 codebase visibility, the following memo Open Questions are resolved:
- ✅ Marketing & Content current state — see beef-up section
- ✅ Hootsuite-style API integration current state — Discrepancy #1 (it's Unified.to)
- ✅ Static marketing site infrastructure choice — D-3 Astro
- ✅ Lead generation API selection — D-4 Apollo
- ✅ Comparison site infrastructure — D-5 shared repo
- ✅ Per-channel paid ads integration sequence — D-1 Google + LinkedIn at v1
- ✅ Contacts current state — see beef-up section
- ✅ Fundraise worker fork mechanics — copy-and-modify from `INV-IR-001`
- ✅ Data room implementation depth at v1 — Drive partition + scoped share-link with email verification
- ✅ Cap table integration approach — embed `InvestorCapTable.jsx` filtered by fundraiseId
- ✅ RE Analyst + Investor rename mechanics — see migration concerns section

**Still open for Sean:**
- **Q-1:** Marketing-site domain — `titleapp.ai` apex (with React app moving to `app.titleapp.ai`) or a separate apex? Spec recommends apex so SEO link-equity flows to titleapp.ai directly.
- **Q-2:** Comparison-site domains — does Sean acquire `bestdigitalworkers-realestate.com`, `bestaitools-aviation.com`, `bestircompare.com` (or similar)? If yes, T1 just configures Pages; if no, T1 stalls comparison-site rollout.
- **Q-3:** Fundraise pricing — $79/mo recommended (matches `INV-IR-001`); or $0/mo if treated as a Spine extension since Sean+Kent are dogfooders? Spec assumes $79/mo for marketplace consistency.
- **Q-4:** Bundle pricing for `titleapp-founder` — $79/mo just for Fundraise + Spine workers free, or stack pricing? Spec assumes $79/mo total (Spine free + Fundraise $79).
- **Q-5:** Apollo seat budget — $99-149/mo per seat. Sean approves the line item before P0-8 ships?
- **Q-6:** GitHub repo for `marketing-site` and `comparison-sites` — new repos under titleapp-core org, or monorepo additions? Spec assumes new repos for cleaner CI separation.

## What this spec does not cover

- Vertical activation (orphan adoption beyond the shipped 32, Government worker fleshout, Real Estate Salesperson) — separate workstream.
- Auto-DTC-on-signed-document flows (P2-5).
- Lightweight investor membership/role primitive (P2-6).
- Scraping-based prospecting (explicitly out per memo).
- Automatic ad-budget reallocation (P2-4).
- Future Banking/Finance workers beyond Fundraise (P2-12).
- Migration of existing `INV-IR-001 Founder IR` — stays as-is at v1 (status `waitlist`); v1.1 either renames it to "Founder Comms Co-Pilot" or retires it.

## Success criteria (definition of "launch-ready")

- ✅ Sean can ask the Marketing worker for a LinkedIn post about an upcoming feature, get drafts in brand voice, approve, schedule, and verify it posted to LinkedIn + X + Reddit (the channels he picks) — all from chat.
- ✅ Sean can launch an email nurture sequence to "Hawaii aviation operators" segment (Apollo-sourced 200 contacts, lifecycle `cold`), see open/click rates in the Performance tab, and watch lead scores climb.
- ✅ Sean can publish a 1500-word SEO blog post to titleapp.ai/blog/digital-workers-vs-rpa and see it ranked in Google within 14 days.
- ✅ Kent can open the Fundraise worker, prospect 28 Series A leads via Apollo, invite them to a Data Room with email-verified scoped access, run KYC on each, generate term sheets, and update the cap table when commitments come in — all from chat.
- ✅ A user Googling "best AI tools for aviation maintenance" finds bestaitools-aviation.com (or equivalent) with TitleApp at #1, ranked honestly with credible competitor reviews.
- ✅ The 7 Spine workers (PLAT-001 through PLAT-007) and the new Fundraise worker (BANK-FUND-001) all show under the Banking/Finance / Marketing / Spine catalog correctly. W-002 displays as "Real Estate Analyst + Investor" not "CRE Deal Analyst."

If all six pass, Sean ships the warm-network launch.

---

## Critical Files for Implementation

- `/Users/seancombs/titleapp-platform/functions/functions/services/alex/catalogs/banking-finance.json` (NEW)
- `/Users/seancombs/titleapp-platform/functions/functions/api/routes/contacts.js` (extend schema to spine_v2)
- `/Users/seancombs/titleapp-platform/functions/functions/helpers/canvasTabs.js` (add FUNDRAISE_TABS, MARKETING tab extensions)
- `/Users/seancombs/titleapp-platform/functions/functions/services/socialService/index.js` (extend Unified.to channel coverage)
- `/Users/seancombs/titleapp-platform/functions/functions/campaigns/campaignEngine.js` (extend to multi-step sequencing)
