# TitleApp — Vendor & Service Registry

> **⚠️ NO SECRETS IN THIS FILE.** No API keys, passwords, or tokens. Only account metadata.
> Secrets go in Firebase Functions config, Cloud Run env vars, or `.env.local` (gitignored).

---

## Account Owner

| Field | Value |
|-------|-------|
| Primary Email | seanlcombs@gmail.com |
| Company Legal Name | The Title App LLC |
| Operating Entity (Atlas C-corp) | SOCIII, Inc. (Delaware C Corporation) |
| DBA | TitleApp / SOCIII |
| EIN | 33-1330902 |
| **D-U-N-S® Number** | **14-503-1310** |
| State | Delaware |
| Address | 1209 N Orange St, Wilmington, DE 19801 |

---

## Core Infrastructure

### Firebase / Google Cloud
- **Project ID:** title-app-alpha
- **Console:** https://console.firebase.google.com/project/title-app-alpha
- **Services used:** Auth, Firestore, Storage, Hosting, Cloud Functions, Cloud Run
- **Hosting URLs:**
  - Main app: https://title-app-alpha.web.app
  - Frontdoor Workers: https://titleapp-frontdoor.titleapp-core.workers.dev
- **Account:** seanlcombs@gmail.com
- **Env vars:** `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` (client-side, in app config)

### Cloudflare Workers
- **Account:** seanlcombs@gmail.com
- **Workers:**
  - `titleapp-frontdoor` — /developers and /invest chat Workers
- **Domain:** titleapp-core.workers.dev
- **Env vars:** Set via `wrangler secret put`

---

## Payments & Billing

### Stripe
- **Account:** seanlcombs@gmail.com
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
- **Account:** seanlcombs@gmail.com
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
- **Account:** seanlcombs@gmail.com
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
- **Account:** seanlcombs@gmail.com
- **Dashboard:** https://console.anthropic.com
- **Purpose:** Primary AI engine — Alex chat, Worker intelligence, enforcement analysis, document analysis
- **Models used:** Claude Sonnet (chat), Claude Opus (complex analysis)
- **Env vars:**
  - `ANTHROPIC_API_KEY`

### OpenAI (GPT)
- **Account:** seanlcombs@gmail.com
- **Dashboard:** https://platform.openai.com
- **Purpose:** Secondary/fallback AI, embeddings, specific use cases as needed
- **Env vars:**
  - `OPENAI_API_KEY`

### Google Cloud / Gemini
- **Account:** seanlcombs@gmail.com
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

| Service | Purpose | Env key |
|---------|---------|---------|
| Realie / RentCast | Real-estate property data | `REALIE_API_KEY`, `RENTCAST_PROPERTY_DATA`, `REALIE_REAL_ESTATE_DATA` |
| ATTOM | Property detail / sales / AVM | Secret Manager: `ATTOM_API_KEY` |
| Vincario | VIN decode (paid tier) | `VINCARIO_API_KEY`, `VINCARIO_SECRET_KEY` |
| NHTSA vPIC | Free VIN decode | — (keyless) |
| Fal | Generative media (image/video) | `FAL_API_KEY` |
| Google Maps | Base maps / Street View / Embed | `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` |
| QuickBooks | Accounting connector | `QB_CLIENT_ID`, `QB_CLIENT_SECRET` |
| Unified.to | Cross-platform connectors | `UNIFIED_API_KEY`, `UNIFIED_WORKSPACE_ID`, `UNIFIED_WORKSPACE_SECRET` |

---

## Blockchain / Web3

### Venly
- **Account:** dev@homdao.io (legacy) → migrating to dev@titleapp.ai
- **Purpose:** Token creation (Polygon), DTC minting, wallet infrastructure
- **Env vars:**
  - `VENLY_CLIENT_ID`
  - `VENLY_CLIENT_SECRET`
  - `VENLY_APPLICATION_ID`

---

## Fundraising

### Wefunder
- **Campaign URL:** https://wefunder.com/titleapp (to be set up)
- **Purpose:** Reg CF raise — $1,070,000 target
- **Integration:** Link from data room, Alex directs investors here
- **No API integration needed for v1** — just outbound links

---

## Domain & DNS

### Domains
- **titleapp.ai** — primary domain
- **titleapp.com** — if owned
- **DNS provider:** TBD (likely Cloudflare)

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
| Stripe | ✅ | ⬜ | ⬜ | ⬜ |
| Dropbox Sign | ✅ | ⬜ | ⬜ | ⬜ |
| Twilio + SendGrid | ⬜ | ⬜ | ⬜ | ⬜ |
| Venly | ✅ | ⬜ | ⬜ | ⬜ |
| Wefunder | ⬜ | ⬜ | N/A | N/A |

---

*Last updated: February 25, 2026*
