# Third-Party Integrations

## Active

### Infrastructure
- **Firebase** — Auth, Firestore, Cloud Functions, Hosting, Cloud Storage
- **Cloudflare** — Workers (edge router/Frontdoor), DNS, R2 storage, MCP server
- **Stripe** — Subscriptions, Connect (75/25 rev share), Identity (KYC), Billing Meters

### Communications
- **Twilio** — SMS, WhatsApp (send + inbound), 2FA/Verify
- **SendGrid** — Transactional email, webhooks, inbound parsing
- **Telegram** — Bot API (advisor group updates, owner alerts)

### AI / Models
- **Anthropic (Claude)** — Primary AI model (claude-sonnet-4-5); workers + COS
- **OpenAI (GPT)** — Secondary model; embeddings (text-embedding-3-small)
- **Fal.ai** — Image generation (FLUX; marketing creatives, logo, mockup)

### Data & Enrichment
- **ATTOM** — Real estate property data (detail, sales history, parcel); metered per lookup
- **Apollo.io** — B2B contact enrichment + outreach sequences; monthly credit budget
- **RapidAPI / ADS-B Exchange** — Live aircraft tracking (aviation workers)
- **Notamify** — NOTAM data (aviation workers)

### OAuth / Social Connectors
- **Google** — OAuth (Gmail MCP read/send, Google Calendar, Google Drive, YouTube upload)
  - Project: #496560182504 · account: sean@sociii.ai (Google SSO)
- **LinkedIn** — OAuth (profile, post)
- **TikTok** — OAuth (video upload, post)
- **Shopify** — OAuth (orders, customers, products, reports)
  - Partner account: sean@sociii.ai (Google SSO) · partners.shopify.com/5022654
  - Dev dashboard: dev.shopify.com · App: SOCIII (Client ID: 8d852d919fad8d07ac9907a3b128ea0e)
  - Redirect URI: https://sociii.ai/auth/shopify-callback

### E-sign & Documents
- **Dropbox Sign (HelloSign)** — E-signatures (advisor/investor agreements; IR-only scale)

### Real Estate / Title
- **Google Maps Embed API** — Property maps in Title Abstract canvas

## Planned
- **Microsoft (OneDrive / Office 365)** — Drive connector, e-sign pickup
- **Venly** — Blockchain anchor (currently SHA-256 hash simulation)
- **ForeFlight** — Pilot logbook auto-import
- **AIRAC regional nav database** — Packaged download + currency tracking

## API Keys Location
All keys are in Firebase Functions `.env` (local) and GCP Secret Manager (deployed).
Never commit keys to the repository.
