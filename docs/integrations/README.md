# Third-Party Integrations

## Active
- **Firebase** — Auth, Firestore, Cloud Functions, Hosting, Cloud Storage
- **Stripe** — Subscriptions, Connect (75/25 rev share), Identity, Billing Meters
- **Cloudflare** — Workers (edge router), DNS (titleapp.ai)
- **Twilio** — SMS (sendSMS), inbound (twilioInbound)
- **SendGrid** — Email (sendEmail), webhooks, inbound parsing
- **Dropbox Sign (HelloSign)** — E-signatures (createSignatureRequest, hellosignWebhook)

## Planned
- **Venly** — Blockchain (currently simulated hashes)
- **OAuth 2.0** — Public API auth (currently API key only)
- **ForeFlight** — Pilot logbook auto-import (Pilot Pro feature)

## API Keys Location
All API keys are stored in Firebase Functions environment config (`.env`).
Never commit keys to the repository.
