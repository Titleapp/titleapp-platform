# CODEX 51.14 — Saturday Sprint Continuation (May 24, 2026)

**Period:** Saturday 2026-05-24, afternoon and evening
**Owner:** Sean
**Status:** Most of "Sunday's" docket from CODEX 51.13 actually executed today
**Pairs with:** [CODEX 51.13 — Day Snapshot](./CODEX-51.13-Day-Snapshot-2026-05-24.md) (morning, written as a rest-day note)

---

## Headline

The "rest day" stopped being a rest day after lunch. By dinner, most of the work CODEX 51.13 had pushed to Sunday was already done — including a 7-phase brand cutover, vendor onboarding across five external systems, the full SOCIII social presence under `sean@sociii.ai`, and the kickoff of the IR worker Phase 1 build.

Storyhouse Thursday (2026-05-28) walkthrough is now the next visible milestone. The pieces between today and Thursday — IR worker build, SendGrid DNS propagation, Stripe FC approval, Twilio A2P 10DLC clock — are either in motion or queued behind named dependencies.

---

## What Actually Shipped This Afternoon

### Vendor Onboarding — 5 Systems Started

| System | Status | Outcome |
|---|---|---|
| Coinbase Business | Submitted | W-9 filled (no payee code per CPA hint); Mercury statement as source of funds. KYB queue 5-10 business days. |
| DUNS | Submitted via Apple Developer | Bypassed dnb.com's slow queue by using Apple Developer's "Request DUNS through Apple" flow. Two birds, one move. |
| Apple Developer | Enrolled | Account under `sean@sociii.ai`. Awaiting DUNS issuance (1-2 days) before enrollment finalizes. |
| Stripe Treasury | LIVE confirmed | Acct ending 4207. Authorization to SOCIII Inc. verified. |
| Stripe Financial Connections | Application submitted | 3 data types (Balances, Transactions, Account Ownership). Tokenized account/routing deferred. 2-5 day approval. |

**Vendor registry created:** `docs/company/SOCIII-Vendors-Accounts.md`. Captures account ownership conventions (`sean@sociii.ai` vs `titleapp.core@gmail.com`), explicit no-passwords-here rule, and a per-vendor entry for each onboarded system. This becomes the canonical reference as new vendors come online.

### SOCIII Brand Icon Pipeline

The brand mark — interlocking purple-green hexagonal blades representing the parent-child DTC composition (canonical per [reference_sociii_brand_system](../../../.claude/projects/-Users-seancombs/memory/reference_sociii_brand_system.md), tied to patent 64/073,706) — was extracted from designer-upscaled SVGs and rendered at multiple resolutions for cross-platform use.

**Pipeline:** qlmanage (macOS Quick Look CLI) → PIL/numpy color-mask extraction → bbox detection with percentile-based outlier filtering → square crop with padding → resize at 200/512/1024 → save with navy bg replacement for white bleed.

**Assets produced (in `apps/business/src/assets/sociii-brand/`):**

- `icon/sociii-icon-framed.svg` — canonical framed vector
- `icon/sociii-icon-mark.svg` — canonical mark-only vector
- `icon/sociii-icon-framed-{200,512,1024}.png`
- `icon/sociii-icon-mark-{200,512,1024}.png`
- `logo/sociii-logo-full-dark.svg`
- `logo/sociii-logo-full-dark-{1200,1920,2400}.png`

The 1024 framed PNG was deployed as `apps/business/public/logo.png`. Legacy TitleApp logo + favicon archived to `apps/business/public/legacy/`. Favicon swapped to `sociii-icon-framed.svg`.

### Brand Cutover — 7 Phases Complete

CODEX 51.13 had this gated on "SVGs land." SVGs landed; cutover executed in full.

| Phase | Scope | Files | Replacements |
|---|---|---|---|
| A | Flip `ACTIVE_BRAND` + favicon/logo/index.html | 4 | — |
| B | `apps/business/src/` UI strings | 73 | 288 |
| C | `functions/functions/prompts/` Alex prompts | (in 113) | (in 629) |
| D | Email senders + templates | (in 113) | (in 629) |
| E | Static HTML (`public/*.html`, `docs.html`, `apps/admin/`) | 9 | ~52 |
| F | Marketing collateral (`marketing/launch-may-2026/*.md`) | 7 | 73 |
| G | Build verify | ✓ | 1.18s clean |

**Aggregate: ~195 files touched, ~1,042 replacements.** Build passes. Not yet committed — Sean reviews + commits.

**Protected references explicitly preserved (per cutover spec):**
- Cloudflare frontdoor URLs (`titleapp-frontdoor.titleapp-core.workers.dev`) — infra-locked
- Firestore collection names (`raasCatalog`, `raasPackages`, `digitalWorkers`) — schema-locked
- Firebase project name (`title-app-alpha`) — infra-locked
- API paths (`/v1/raas:*`) — contract-locked
- `brand.titleapp` fallback object in `config/brandConfig.js` — preserved for one-flip pattern
- `TITLEAPP_PLATFORM_CREATOR` constant in `billing/recordUsageEvent.js` — internal data identifier

### Social Presence Under sean@sociii.ai

Five platforms set up in one session. Same brand pack on each (display name `SOCIII`, framed icon PNG as avatar, full logo PNG as banner, 133-char cross-platform bio, `sociii.ai` link).

| Platform | Handle | State |
|---|---|---|
| LinkedIn | SOCIII, Inc. (page 118283918) | Page created, description + location pack drafted |
| YouTube | @SOCIII-Inc | Channel created (SOCIII alone was taken) |
| X / Twitter | @SOCIII-variant | Profile + Premium subscribed |
| TikTok | (set up on mobile) | Account live |
| Reddit | u/SOCIII | Account, profile, social links populated |
| Instagram | — | Deferred (no SOCIII fit for launch week) |
| Telegram | — | Skipped (no fit; would add support load with no payoff) |

All five accounts use `sean@sociii.ai` as the email of record, NOT his personal Gmail. The same hygiene rule applied to Apple Developer earlier in the day — ownership lives with the SOCIII identity, not with the founder's personal accounts.

### IR Worker Design — Decisions Locked

Sean dropped a full product brief over dinner-time on the IR worker scope. Synthesizing his asks and the existing scaffolding (`services/fundraise/investorKyc.js`, `services/fundraise/dataRoom.js`, `services/signatureService/`, magic-link auth, Google Calendar V1, Document Control with Dropbox Sign), five decisions were locked:

1. **SMS provider:** Twilio (part of the SendGrid parent company; same vendor account)
2. **Identity verification:** Stripe Identity ID-only sessions (SOCIII absorbs the $1.50/session fee for investors and advisors; creators pay $2 as part of their $49/yr license)
3. **Valuation:** Hard-coded at $10M for v1. Updates on each future round-close.
4. **Quarterly calls:** Single combined shareholder update (not per-cohort)
5. **Office hours:** Cal.com stopgap for Phase 1. Native booker on top of the existing Google Calendar connector deferred to Phase 2.

**Phase order (locked):**

1. Phase 1 — Investor flow end-to-end (Storyhouse-ready)
2. Phase 2 — Advisor flow + native office-hours booker
3. Phase 3 — Creator flow ($2 ID + $49/yr license)
4. Phase 4 — Vault $-value rollup (first asset-value display)
5. Phase 5 — Abandonment recovery + quarterly reminder cron + Google Drive write extension
6. Phase 6 — Alex IR knowledge injection + HR handoff for advisors

### IR Worker Phase 1 — Build Kicked Off

A background agent is building Phase 1 right now. Scope:

- New `services/identity/stripeIdentity.js` — Stripe Identity ID-only session creation + webhook handling
- Extended `services/signatureService/` to accept role-based template routing (investor SAFE, advisor warrant, creator agreement) keyed off env-var template IDs
- New `services/ir/investorFlow.js` — orchestrator (initiate → KYC → sign → Vault stash → email confirm)
- New HTTP routes `/v1/ir:investor:initiate|step|status` registered in `getRoute(req)`
- Capability registry entries in `contracts/capabilities.json`
- Cal.com URL constant for office-hours stopgap
- Vault metadata shape includes `sharesIssued` field calculated from `investmentAmount / (valuationCap / 10M)` — Phase 4 Vault $-rollup will read this without schema change

The agent reports back when done. No commit, no deploy until Sean reviews.

---

## Open Multi-Day Clocks

These all start ticking now and bound when Phase 1 can be exercised end-to-end:

| Clock | ETA | Owner | Notes |
|---|---|---|---|
| SendGrid sociii.ai domain auth | 1-3 days | Sean | Add 3 CNAMEs to Namecheap; verify in SendGrid. Email sends bounce until live. |
| Stripe Financial Connections approval | 2-5 days | Stripe | Application submitted today. |
| Apple Developer / DUNS issuance | 1-2 days | Apple → D&B | Enrollment finalizes once DUNS lands. |
| Twilio A2P 10DLC | 2-7 days | Sean (signup tonight) | US carrier requirement for business SMS. Starts when Twilio signup completes. |
| Coinbase KYB | 5-10 days | Coinbase | Standard underwriting queue. |
| Legal template Dropbox Sign upload | Tonight or tomorrow | Sean | SAFE (YC post-money), advisor warrant (Kent's template), creator agreement (3-month-old PDF — needs delta review). Required before Phase 1 can send a signing packet. |

---

## What's NOT Done

- **Phase A from morning CODEX 51.13 (Sunday docket):** Three patent provisional filings via USPTO EFS-Web. Drafts + DOCX staged in `~/Downloads/SOCIII-Patent-Filings-2026-05-25/`. Still Sunday morning's job.
- **Creator agreement diff:** 3-month-old PDF needs review of what's changed since (HOMDAO carve-out, $49/yr license addition, $2 ID fee, creator economics restructure per CODEX 51.13's advisor deck iteration). Surface the delta when Sean is back; do not unilaterally rewrite legal text.
- **BrandLoader polish (#274):** `BrandLoader.jsx` still renders the placeholder S-mark. Swap to the parent-child hex mark queued as post-launch polish.
- **Git commit of brand pass:** ~195 modified files staged-uncommitted. Sean reviews before committing.

---

## Memory Updates

- **Updated #251** — SOCIII social channels: LinkedIn, YouTube, X (with Premium), TikTok, Reddit all live under `sean@sociii.ai`. IG deferred, Telegram skipped.
- **Updated #246** — Brand migration sweep marked complete (all 7 phases done; build clean).
- **New tasks (queued)**: SendGrid DNS, Twilio signup + A2P 10DLC, Stripe product rename, Dropbox Sign template upload, creator agreement delta review.
- **Reference [SOCIII brand system](../../../.claude/projects/-Users-seancombs/memory/reference_sociii_brand_system.md):** confirmed mark meaning = parent-child DTC composition (patent 64/073,706). Marketing narrative locked: "Parent rules govern. Child workflows compose."

---

## Sunday's Revised Order of Operations (2026-05-25)

In priority order, with most of the "easy" infrastructure work now already done:

1. **Three patent provisional filings via USPTO EFS-Web.** Same as CODEX 51.13's #1. $360 total.
2. **Stripe product rename** in Stripe Dashboard — TitleApp → SOCIII for the 5 products referenced in `config/pricing.js` (signatureOverage, blockchainOverage, topUp100/500/1000). 5 minutes.
3. **SendGrid DNS** — pull the 3 CNAMEs from SendGrid → add to Namecheap → start the propagation clock.
4. **Twilio signup + A2P 10DLC submission** — multi-day clock; later it starts, later SMS goes live.
5. **Upload SAFE + advisor warrant + creator agreement to Dropbox Sign.** Capture template IDs, drop into env vars per the Phase 1 agent's `TEMPLATES.md`.
6. **Review the Phase 1 agent's output** when it lands (background, expected tonight). Commit the brand pass + Phase 1 together once verified.
7. **Creator agreement delta review** — 3-month diff between the old PDF and current creator economics.
8. **Investor deck slide 2 decision** (carried over from CODEX 51.13).

---

## Strategic Note

Two structural truths surfaced today that are worth keeping near the surface:

**First, vendor hygiene scales linearly with discipline.** Every account created under `sean@sociii.ai` today is one less hostage to a personal Gmail handle later. The same rule applied to Apple ID, YouTube, X, TikTok, Reddit, LinkedIn. The cost of doing it right at creation time is zero. The cost of fixing it later — when accounts have history, content, ad spend, or followers — is meaningful. This is the kind of decision that compounds.

**Second, "rest day" is a planning category, not a personality category.** CODEX 51.13 deliberately scoped Saturday small, and that was right *for the morning*. By afternoon the work that needed doing fit a different shape — discrete, parallelizable, mostly external-system setup that benefited from immediate execution rather than next-day batching. The morning rest enabled the afternoon throughput. Both halves are correct; the boundary between them was Sean's read of his own state, not a calendar.

---

*Continuation of CODEX 51.13. Sunday is filing day + propagation day + commit day. Phase 1 IR build is in flight.*
