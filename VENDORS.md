# SOCIII — Vendor & Service Registry

> **⚠️ NO SECRETS IN THIS FILE.** No API keys, passwords, or tokens. Only account metadata.
> Secrets go in Firebase Functions config, Cloud Run env vars, or `.env.local` (gitignored).

---

## Account Owner

| Field | Value |
|-------|-------|
| Primary Email | sean@sociii.ai |
| Company Legal Name | SOCIII, Inc. |
| Operating Entity (Atlas C-corp) | SOCIII, Inc. (Delaware C Corporation), incorporated May 19, 2026 |
| DBA | TitleApp / SOCIII |
| EIN | 42-2675951 |
| **D-U-N-S® Number** | **14-503-1310** |
| Hawaii GET Account ID | GE-180-827-2896-01 |
| State | Delaware |
| Address | 1810 E Sahara Ave, STE 75942, Las Vegas, NV 89104 |
| Phone | (310) 430-0780 |
| Website | sociii.ai |

> Corrected 2026-09-02 — prior version of this table had stale info (old legal name, old email, wrong EIN) carried over from before the Stripe Atlas incorporation. Verified against Stripe Atlas directly.

---

## Core Infrastructure

### Firebase / Google Cloud
- **Project ID:** title-app-alpha
- **Console:** https://console.firebase.google.com/project/title-app-alpha
- **Services used:** Auth, Firestore, Storage, Hosting, Cloud Functions, Cloud Run
- **Hosting URLs:**
  - Main app: https://title-app-alpha.web.app
  - Frontdoor Workers: https://titleapp-frontdoor.titleapp-core.workers.dev
- **Account:** sean@sociii.ai
- **Env vars:** `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` (client-side, in app config)

### Cloudflare Workers
- **Account:** sean@sociii.ai
- **Workers:**
  - `titleapp-frontdoor` — /developers and /invest chat Workers
- **Domain:** titleapp-core.workers.dev
- **Env vars:** Set via `wrangler secret put`

---

## App Stores & Developer Platforms

### Apple Developer
- **Account:** sean@sociii.ai
- **Password:** not stored here — use a password manager
- **Password hint:** jet
- **Purpose:** Apple Developer Program enrollment, for eventual iOS/App Store distribution
- **Enrollment type:** Organization (SOCIII, Inc.) — chosen so the App Store listing shows the company name, not Sean's personal name
- **D-U-N-S:** 14-503-1310 (same number as the rest of the org — see Account Owner table)
- **Status:** submitted 2026-09-03, Enrollment ID `N6HQQZZR2U` — pending Apple's verification of signing authority (email to follow with next steps)

### Google Play Console
- **Account:** sean@sociii.ai (Google Workspace account created 2026-09-03 specifically for this — previously only had `seanlcombs@gmail.com` personal Gmail signed in)
- **Password:** not stored here — use a password manager
- **Purpose:** Google Play Console developer account, for Android/Google Play distribution
- **Account type:** Organization / company (SOCIII, Inc.) — same reasoning as Apple, avoids listing under a personal name
- **D-U-N-S:** 14-503-1310
- **Registration fee:** one-time $25 USD, paid — receipt sent to sean@sociii.ai
- **Status:** **Developer account created** 2026-09-03 — fully active, ready to use

---

## Business Operations

### Stable (Virtual Mailbox)
- **Dashboard:** https://dashboard.usestable.com
- **Account:** SOCIII, Inc. — Las Vegas, NV (#75942)
- **Purpose:** Virtual mailbox — receives physical mail at the Las Vegas address, digitizes on request
- **Las Vegas address:** 1810 E Sahara Ave, Las Vegas, NV 89104 (Suite #75942)
- **Receives mail for:** SOCIII, Inc. AND Sean Lee Combs personally (same mailbox #)
- **Billing:** Monthly subscription (see Stable dashboard)
- **Note:** Default action is "Shred in 30 days" — log in and request scans for anything important

---

## Tax & Regulatory Accounts

### Hawaii Department of Taxation — Hawaii Tax Online (GET)
- **Dashboard:** https://hitax.hawaii.gov
- **Username:** sociii
- **Password:** not stored here — use a password manager
- **Purpose:** General Excise Tax (GET) license — required for SOCIII to invoice/receive payment from UH Maui College (a Hawaii state entity)
- **Hawaii GET Account ID:** GE-180-827-2896-01 (General Excise); reconciliation account GE-180-827-2896-01R
- **Registered:** 2026-09-02, $20 one-time registration fee paid
- **Filing frequency:** Semi-Annually (est. annual GET liability under $2,000, based on current UH Maui contract value)
- **Related:** once active, also register at vendors.ehawaii.gov/hce for the Hawaii Compliance Express certificate (separate step, needed before UH's business office can process payment) — not yet done
- **Tracked as a live obligation:** `customObligations/hawaii_get_registration_uhmc` in Firestore, surfaced via the accounting worker's `query_compliance_filings` tool — marked complete 2026-09-02

---

## Payments & Billing

### Stripe
- **Account:** sean@sociii.ai
- **Dashboard:** https://dashboard.stripe.com
- **Purpose:** Subscriptions ($9/mo workspaces), AI credit packs, marketplace payouts (Connect), investor ID verification ($2 charge)
- **Products to create:**
  - Workspace Pro: $9/mo or $81/yr
  - Enterprise: $299/mo
  - AI Credit Packs: 500/$5, 2K/$15, 10K/$50
- **Env vars:**
  - `STRIPE_SECRET_KEY` — server-side only
  - `STRIPE_PUBLISHABLE_KEY` — client-side
  - `STRIPE_WEBHOOK_SECRET` — for webhook verification
  - `STRIPE_CONNECT_CLIENT_ID` — for marketplace/creator payouts

---

## E-Signatures

### Dropbox Sign (formerly HelloSign)
- **Account:** sean@sociii.ai
- **Dashboard:** https://app.hellosign.com
- **API Docs:** https://developers.hellosign.com
- **Purpose:** Platform-wide e-signatures
  - Investor SAFE agreements (data room)
  - Logbook signatures (compliance records)
  - Escrow Locker (release authorizations) — upcoming
- **Plan:** Essentials ($15/mo) or API tier as needed
- **Env vars:**
  - `DROPBOX_SIGN_API_KEY` — server-side only
  - `DROPBOX_SIGN_CLIENT_ID` — for embedded signing
  - `DROPBOX_SIGN_TEST_MODE` — `true` for sandbox

---

## Communications

### Twilio (includes SendGrid — same company, single account)
- **Account:** sean@sociii.ai
- **Twilio Console:** https://console.twilio.com
- **SendGrid Dashboard:** https://app.sendgrid.com (accessible from Twilio account)
- **Purpose:**
  - **SMS (Twilio):** Alex outbound/inbound, investor notifications, 2FA, daily digest
  - **Email (SendGrid):** Welcome emails, daily digest, investor updates, follow-up cadence, inbound parse, transactional (resets, receipts)
- **Email addresses:**
  - alex@titleapp.ai — Alex outbound
  - support@titleapp.ai — support
  - investors@titleapp.ai — investor relations
- **Estimated cost:** ~$10/mo SMS + $19.95/mo email (Essentials, 50K emails)
- **Env vars:**
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER` — the TitleApp SMS number
  - `TWILIO_WEBHOOK_URL` — inbound SMS webhook endpoint
  - `SENDGRID_API_KEY`
  - `SENDGRID_FROM_EMAIL` — default sender (alex@titleapp.ai)
  - `SENDGRID_INBOUND_WEBHOOK` — inbound parse webhook

---

## AI / LLM Providers

### Anthropic (Claude)
- **Account:** sean@sociii.ai
- **Dashboard:** https://console.anthropic.com
- **Purpose:** Primary AI engine — Alex chat, Worker intelligence, enforcement analysis, document analysis
- **Models used:** Claude Sonnet (chat), Claude Opus (complex analysis)
- **Env vars:**
  - `ANTHROPIC_API_KEY`

### OpenAI (GPT)
- **Account:** sean@sociii.ai
- **Dashboard:** https://platform.openai.com
- **Purpose:** Secondary/fallback AI, embeddings, specific use cases as needed
- **Env vars:**
  - `OPENAI_API_KEY`

### Google Cloud / Gemini
- **Account:** sean@sociii.ai
- **Console:** https://console.cloud.google.com
- **Purpose:** Vertex AI / Gemini models, shared with Firebase project for GCP services
- **Note:** Firebase project already handles most GCP auth
- **Env vars:**
  - `GOOGLE_AI_API_KEY` (if using Gemini API directly)

---

## Data APIs — Aviation

> **Status (audited 2026-06-16):** keys configured + connectors registered in `functions/functions/config/connectors.js`, billing metered in `services/billing/dataFee.js`, NOTAM cache + ADS-B polling-strategy + FAA endpoint constants (`config/externalApis.js`) all scaffolded — **but the actual fetch implementations are NOT yet written** (no `process.env.NOTAMIFY_API_KEY` / `ADSB_EXCHANGE_API_KEY` reads anywhere; aviationweather.gov never called). Finishing the fetch layer + map UI is the remaining work — and recovers the spend via the 2× resale markup already built into `dataFee.js`.

| Connector | Purpose | Cost | Env key |
|-----------|---------|------|---------|
| **adsb_exchange** | Live aircraft positions (fleet tracking / "radar returns") | ~$0.002/query (paid) | `ADSB_EXCHANGE_API_KEY` |
| **notamify** | NOTAM briefings per airport/route | ~$0.30/airport (paid) | `NOTAMIFY_API_KEY` |
| **aviationweather** | METAR / TAF / SIGMET / winds / PIREP / ATIS | Free (FAA public) | — |
| **faa_nasr** | Runways, frequencies, airspace boundaries, waypoints | Free | — |
| **faa_charts** | Sectionals, approach plates, airport diagrams | Free | — |
| **tfr_feed** | Temporary Flight Restrictions | Free | — |

- ForeFlight import parser: `services/copilot/parsers/foreflightParser.js`
- Preferred routes (live route): `GET /v1/aviation:preferredRoutes` (reads bundled seed; NASR ingest = v2)

## Data APIs — Other (configured keys)

> Corrected 2026-09-02 — this table was missing several real, already-configured accounts (Shopify, TikTok, GitHub, Google OAuth, Brave Search) found in `functions/functions/.env`. Added below with verified real usage. ATTOM and First American are **referenced in the pricing model (`services/billing/dataFee.js`) but not actually connected yet** — Sean confirmed this earlier ("not connected to ATTOM/FirstAm until funding" — they're expensive per-query data sources).

| Service | Purpose | Env key | Status |
|---------|---------|---------|--------|
| Realie / RentCast | Real-estate property data | `REALIE_API_KEY`, `RENTCAST_PROPERTY_DATA`, `REALIE_REAL_ESTATE_DATA` | configured |
| ATTOM | Property detail / sales / AVM | Secret Manager: `ATTOM_API_KEY` | **not yet connected** — priced in `dataFee.js`, deferred until funding |
| First American (title data) | Title/escrow detail | referenced in `dataFee.js` (`firstam:title`) | **not yet connected** — same as ATTOM, deferred until funding |
| Vincario | VIN decode (paid tier) | `VINCARIO_API_KEY`, `VINCARIO_SECRET_KEY` | configured |
| NHTSA vPIC | Free VIN decode | — (keyless) | live |
| Fal | Generative media (image/video) | `FAL_API_KEY` | configured |
| Google Maps | Base maps / Street View / Embed | `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | configured |
| Google OAuth | Gmail/Drive/Calendar connectors (Alex integrations) | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_GMAIL_REDIRECT_URI` | **live** — real, verified in `.env` |
| QuickBooks | Accounting connector | `QB_CLIENT_ID`, `QB_CLIENT_SECRET` | configured |
| Unified.to | Cross-platform connectors | `UNIFIED_API_KEY`, `UNIFIED_WORKSPACE_ID`, `UNIFIED_WORKSPACE_SECRET` | configured |
| **Shopify** | Read-only merchant "connect your store" OAuth (orders/customers/products into Accounting/Contacts) — see `services/shopify/shopify.js`; separate from the new public DPP app being built via Partner org | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_REDIRECT_URI` | **live** — real, verified in `.env`, was missing from this doc entirely |
| **TikTok** | Client credentials — likely RegCF marketing/social posting | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | configured — real key exists, usage not traced in this pass |
| **GitHub** | Repo access (CI, automation, or Alex tooling) | `GITHUB_TOKEN`, `GITHUB_REPO` | configured |
| **Brave Search** | Web search API | `BRAVE_SEARCH_API_KEY` | configured |
| **Alchemy (Polygon)** | Blockchain RPC node provider | `ALCHEMY_POLYGON_API_KEY` | configured — real key exists, usage not traced in this pass |
| **Helius** | Solana RPC/API provider | `HELIUS_API_KEY` | configured — real key exists; no Solana usage found anywhere in current code, worth confirming if still needed |

### Nokia API Hub (formerly RapidAPI)
- **Dashboard:** https://rapidapi.com/console (Nokia-owned since the Rapid acquisition)
- **Account:** sean@sociii.ai, personal account tier
- **Verified live subscription:** "Realtor" API — Pro plan, $20.00/mo, active since 15 Jul 2026, quota usage 0.02% (essentially unused so far)
- **Note:** Sean expected an e-signature API here too — not found under this account's subscriptions as of 2026-09-02. Worth checking whether that's a different Nokia/Rapid account, or was actually meant to reference Dropbox Sign (the real e-sign vendor already tracked above).

**Two items flagged by Sean I could not verify — need his input, not guessed:**
- **Coinbase** — only code reference found is a user-facing "Coinbase Wallet address" field (crypto custody preference, just a regex-validated address, not an API/account integration). If there's an actual **Coinbase Business account** (a real marketing email from Coinbase Business was seen in Sean's inbox 2026-08-31), that's a separate real account not reflected anywhere in code — needs Sean to provide details directly.
- **Nokia (APIs)** — zero references found anywhere in the codebase. Needs clarification from Sean on what this refers to before it can be added.

**Social & communications accounts** — not trackable from code at all (no API keys implies no integration, or credentials live elsewhere entirely). Needs a direct list from Sean: which platforms (X/Twitter, LinkedIn, TikTok account itself vs. the API client above, Instagram, Slack, etc.), account handles, and who has access.

---

## Blockchain / Web3

> Corrected 2026-09-02 — this section previously only listed Venly, which is not actually wired into any current code path (verified via repo search). The real, live anchoring stack is below.

### OpenTimestamps (universal default — every record, every user)
- **No account/API key** — free, public, decentralized timestamping protocol
- **Purpose:** Daily Merkle-batch hash anchor to Bitcoin for every DTC record (`services/anchor/dailyBatchAnchor.js`) — this is what backs the "tamper-evident, independently verifiable" claim across the whole platform
- **Verify endpoint:** `GET /v1/dpp:passport:public` / `GET /v1/dtc/:dtcId/verify` — public, no auth required

### Crossmint (opt-in, per-user — NFT minting on Polygon)
- **Purpose:** Optional NFT representation of a DTC record on Polygon mainnet, gated behind `blockchainMintingEnabled` on the user doc — NOT the default, most users/records never trigger this
- **Env vars:**
  - `CROSSMINT_SERVER_API_KEY` — confirmed live in `functions/functions/.env`
  - `CROSSMINT_COLLECTION_ID`
  - `CROSSMINT_RECIPIENT` — currently hardcoded to `email:treasury@sociii.ai`, not per-user (known gap, see memory)

### Venly — legacy, not currently integrated
- **Account:** dev@homdao.io (legacy) → migration to dev@titleapp.ai never completed
- **Status:** no `VENLY_*` env vars or Venly API calls found anywhere in the current codebase — this was Title App-era wallet infrastructure, superseded by Crossmint. Keeping this entry only as a historical note; do not build against it.

---

## Fundraising

### Wefunder
- **Campaign URL:** https://wefunder.com/titleapp (to be set up)
- **Purpose:** Reg CF raise — $1,070,000 target
- **Integration:** Link from data room, Alex directs investors here
- **No API integration needed for v1** — just outbound links

---

## Domain & DNS

> Corrected 2026-09-02 — sociii.ai was missing entirely; it's the actual primary domain in live use (all real email, legal docs at sociii.ai/legal/..., hosting).

### Domains
- **sociii.ai** — primary domain, actual live use (email, public legal pages, product)
- **titleapp.ai** — legacy domain, still referenced by some backend email addresses (alex@titleapp.ai, support@titleapp.ai) — not yet fully migrated
- **titleapp.com** — status unverified
- **DNS provider:** unverified — likely Cloudflare given Cloudflare Workers usage elsewhere, not confirmed for sociii.ai specifically

---

## Setting Up Env Vars

### Firebase Functions (v1)
```bash
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  stripe.webhook_secret="whsec_..." \
  stripe.publishable_key="pk_live_..." \
  dropboxsign.api_key="..." \
  dropboxsign.client_id="..." \
  twilio.account_sid="..." \
  twilio.auth_token="..." \
  twilio.phone_number="+1..." \
  sendgrid.api_key="SG...." \
  anthropic.api_key="sk-ant-..." \
  openai.api_key="sk-..."
```

### Cloud Run / Cloud Functions v2
```bash
# Use Google Secret Manager or set env vars directly
gcloud functions deploy functionName \
  --set-env-vars STRIPE_SECRET_KEY=sk_live_...
```

### Local Development
```bash
# Copy and fill in:
cp .env.example .env.local
# .env.local is gitignored — never commit it
```

---

## Status Tracker

| Service | Account Created | API Keys Generated | Integrated | Tested |
|---------|:-:|:-:|:-:|:-:|
| Firebase | ✅ | ✅ | ✅ | ✅ |
| Cloudflare Workers | ✅ | ✅ | ✅ | ✅ |
| Anthropic (Claude) | ✅ | ✅ | ✅ | ✅ |
| OpenAI (GPT) | ✅ | ⬜ | ⬜ | ⬜ |
| Google Cloud / Gemini | ✅ | ✅ | ✅ | ⬜ |
| Stripe | ✅ | ✅ | ✅ | ✅ |
| Dropbox Sign | ✅ | ⬜ | ⬜ | ⬜ |
| Twilio + SendGrid | ✅ | ✅ | ✅ | ✅ |
| OpenTimestamps (Bitcoin anchor) | N/A | N/A | ✅ | ✅ |
| Crossmint (Polygon, opt-in) | ✅ | ✅ | ✅ | ⬜ |
| Venly | — | — | ⬜ (superseded, not integrated) | — |
| Wefunder | ⬜ | ⬜ | N/A | N/A |
| Hawaii Dept. of Taxation (GET) | ✅ | N/A | N/A | N/A |

---

*Last updated: September 3, 2026*
