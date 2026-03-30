# TitleApp API Registry | Session 41 | Updated Session 43

Canonical record of all external API integrations.
Keys stored in: functions/functions/.env (backend) and apps/business/.env (frontend)
Never commit key values to git. .env is in .gitignore.
Use Option B terminal method for all new keys.

---

## Keys Confirmed in functions/functions/.env

| Line | Key Name | Service | Added | Notes |
|------|----------|---------|-------|-------|
| ~1 | ANTHROPIC_API_KEY | Anthropic Claude | Pre-existing | Core AI engine |
| ~2 | OPENAI_API_KEY | OpenAI | Pre-existing | Secondary AI |
| ~3 | STRIPE_SECRET_KEY | Stripe | Pre-existing | Billing |
| ~4 | STRIPE_PUBLISHABLE_KEY | Stripe | Pre-existing | |
| ~5 | STRIPE_WEBHOOK_SECRET | Stripe | Pre-existing | |
| ~6 | DROPBOX_SIGN_API_KEY | Dropbox Sign | Pre-existing | E-signatures |
| ~7 | DROPBOX_SIGN_CLIENT_ID | Dropbox Sign | Pre-existing | |
| ~8 | TWILIO_ACCOUNT_SID | Twilio | Pre-existing | SMS/voice |
| ~9 | TWILIO_AUTH_TOKEN | Twilio | Pre-existing | |
| ~10 | TWILIO_PHONE_NUMBER | Twilio | Pre-existing | |
| ~11 | SENDGRID_API_KEY | SendGrid | Pre-existing | Email/drip |
| ~12 | SENDGRID_UNSUBSCRIBE_GROUP_ID | SendGrid | Pre-existing | |
| ~13 | SENDGRID_FROM_EMAIL | SendGrid | Pre-existing | |
| ~14 | SENDGRID_FROM_NAME | SendGrid | Pre-existing | |
| ~15 | GOOGLE_OAUTH_CLIENT_ID | Google OAuth | Pre-existing | Auth |
| ~16 | GOOGLE_OAUTH_CLIENT_SECRET | Google OAuth | Pre-existing | |
| ~17 | GOOGLE_OAUTH_REDIRECT_URI | Google OAuth | Pre-existing | |
| ~18 | GDRIVE_ENCRYPTION_KEY | Google Drive | Pre-existing | Vault import |
| ~19 | FAL_API_KEY | fal.ai | Session 41 | Image generation - Flux 2 Turbo |
| ~20 | GOOGLE_MAPS_API_KEY | Google Maps Platform | Session 41 | 6 APIs restricted to app.titleapp.ai/* |
| ~21 | ADSB_EXCHANGE_API_KEY | ADS-B Exchange | Session 41 | Via RapidAPI - live aircraft tracking |
| ~22 | NOTAMIFY_API_KEY | Notamify | Session 41 | NOTAMs - $0.30/call - cache aggressively |
| ~23 | HELIUS_API_KEY | Helius Solana | Session 41 | God Key blockchain - audit trail minting |
| 24 | REALIE_API_KEY | Realie | Session 41 Mar 28 | Property data - replaces Estated |
| 25 | VINCARIO_API_KEY | Vincario | Session 41 Mar 28 | VIN decode + market value |
| 26 | VINCARIO_SECRET_KEY | Vincario | Session 41 Mar 28 | Required alongside API key |
| 27 | RENTCAST_PROPERTY_DATA | RentCast | Session 41 Mar 28 | Rental market data - replaces Mashvisor |
| 28 | CROSSMINT_SERVER_API_KEY | Crossmint | Session 41 Mar 28 | NFT minting - server-side - all scopes |
| 29 | ALCHEMY_POLYGON_API_KEY | Alchemy Polygon | Session 41 Mar 28 | Cap table - equity records |
| 30 | QB_CLIENT_ID | QuickBooks OAuth | Session 41 Mar 28-29 | Development keys |
| 31 | QB_CLIENT_SECRET | QuickBooks OAuth | Session 41 Mar 28-29 | Redirect: app.titleapp.ai/auth/quickbooks/callback |

---

## Frontend .env (apps/business/.env)

| Key | Service | Notes |
|-----|---------|-------|
| VITE_GOOGLE_MAPS_API_KEY | Google Maps | Browser-side Canvas renderer |

---

## Verified Keyless APIs (no signup required - tested working March 29 2026)

| Service | Verified Test URL | Status |
|---------|-------------------|--------|
| Aviation Weather METAR | aviationweather.gov/api/data/metar?ids=PHLI&format=json | VERIFIED - live METAR returned |
| Aviation Weather TAF | aviationweather.gov/api/data/taf?ids=KOAK&format=json | No key required |
| Aviation Weather PIREP | aviationweather.gov/api/data/pirep?format=json | No key required |
| Aviation Weather SIGMET | aviationweather.gov/api/data/sigmet?format=json | No key required |
| Aviation Weather Winds | aviationweather.gov/api/data/windtemp?format=json | No key required |
| TFR Feed | tfr.faa.gov/tfr2/list.html | XML feed - backend parse only |
| FAA AeroNav Charts | aeronav.faa.gov/d-tpp/ | VERIFIED - directory listing confirmed |
| FAA NASR | faa.gov/air_traffic/flight_info/aeronav | VERIFIED - page confirmed |
| NHTSA VIN Decode | vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json | VERIFIED - 140 fields returned |
| NPPES NPI Registry | npiregistry.cms.hhs.gov/api/?version=2.1&number={NPI} | VERIFIED - JSON confirmed |
| openFDA Drugs | api.fda.gov/drug/label.json?limit=1 | No key required |
| openFDA Devices | api.fda.gov/device/recall.json?limit=1 | No key required |
| NIH NLM | clinicaltables.nlm.nih.gov/api | No key required |
| CMS Hospital Compare | data.cms.gov/provider-data | No key required |
| HUD Fair Market Rents | huduser.gov/portal/datasets/fmr.html | No key required |
| US Census ACS | api.census.gov/data | No key required |
| FEMA Flood Maps | msc.fema.gov/arcgis/rest/services | No key required |
| EPA Environmental | enviro.epa.gov/enviro/efservice | No key required |
| Snapshot Voting | hub.snapshot.org/graphql | No key required |

---

## Paused / Removed / Future

| Service | Status | Reason |
|---------|--------|--------|
| Venly | PAUSED | $700/mo - replaced by Helius + Crossmint + Alchemy at near-zero cost |
| Estated | REMOVED | Acquired by ATTOM - redirects to $500/mo enterprise plan |
| Mashvisor | REMOVED | STR/Airbnb focused only - not property management |
| FAA NOTAM API direct | BLOCKED | Portal SSL issues as of March 2026 - using Notamify instead |
| Privy (user wallets) | FUTURE | Add when first subscriber requests wallet delivery |
| Carfax | FUTURE | Requires dealer agreements - add when dealer clients onboard |
| ATTOM Data | FUTURE | $500+/mo enterprise - add when enterprise clients require |
| BatchData | FUTURE | Pay-as-you-go property data - add when deep ownership history needed |
| Xero | FUTURE | Accounting for smaller operators - add when subscriber requests |

---

## Architecture Notes

### God Key Blockchain Architecture
- TitleApp holds platform master custody wallet via Helius
- All audit records minted automatically at near-zero cost
- Subscribers pay delivery fee ($0.25-$1.00) to receive records in their wallet
- If subscriber loses wallet: re-issue after identity verification
- Patent claim: dual custody + identity-gated re-issuance + RAAS-governed delivery
- File patent update before investor demos

### Google Maps Platform
- One key covers all 6 APIs: Maps JS, Geocoding, Places, Solar, Weather, Time Zone
- Restricted to app.titleapp.ai/* and these 6 APIs only
- Backend: GOOGLE_MAPS_API_KEY
- Frontend: VITE_GOOGLE_MAPS_API_KEY (same value, different variable name)

### QuickBooks OAuth
- Currently using Development keys
- Redirect URI: https://app.titleapp.ai/auth/quickbooks/callback
- Upgrade to Production keys when ready for real subscriber connections
- OAuth flow: subscriber authorizes TitleApp to read their QB data on first use

### Notamify Cost Management
- Pricing: $0.30/call dropping to $0.20 at volume
- Cache NOTAMs by airport, refresh every 30 minutes
- With caching: ~$3-5/month vs $108/month uncached for 4 flights/day at 3 airports
- Use as primary NOTAM source. FAA direct API unreliable as of March 2026.

### Data Link Health Monitor
- Patch prompt 41.3-T2 written - wraps all external API calls in callWithHealthCheck()
- Failed calls log to apiHealth/{serviceName} Firestore collection
- Alex provides plain-language fallback messages - never technical errors to subscribers
- Aviation workers flag data gaps explicitly in audit trail

---

| 32 | CONTROL_CENTER_DATA_MODE | Control Center | Session 43 | sandbox/live — banner toggle |

---

## Summary Counts

| Status | Count |
|--------|-------|
| LIVE | 12 |
| VERIFIED | 8 |
| PENDING | 15 |
| FUTURE/PAUSED | 20 |
| **Total** | **55** |

---

*CONFIDENTIAL — The Title App LLC | EIN 33-1330902 | titleapp.ai | Updated Session 43 | 2026-03-30*
