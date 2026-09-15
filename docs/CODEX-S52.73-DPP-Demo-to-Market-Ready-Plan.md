# CODEX S52.73 — DPP (Elara): From Working Demo to Market-Ready

**Status:** Scoping only, grounded in direct code reads this session — no code written yet.
**Why now:** Nina and Elise (Traitly — Sean's real EU battery-passport partner; "Volta Advisory" is a demo-only fictional name for their data, not a legal entity) asked to start hands-on testing this week. Sean committed to a demo login, not a self-serve signup — this doc is why, and what closes that gap.

---

## What's actually real today (confirmed by direct code reads)

**Real and working:**
- `DppClientOnboarding.jsx` — a genuine 3-step flow: Stripe Identity KYC, business-registration document upload, e-signed agent-authorization agreement. Wired into `App.jsx` when `onboardingVertical === "dpp"`. Backed by real routes (`/v1/dpp:workspace:onboardingStatus`, `/v1/dpp:workspace:authorizeAgent:start`).
- A public passport viewer (`GET /v1/dpp:passport:public`) reads a real `productPassports` Firestore doc, no auth required — a legitimate end-consumer-facing route, already real.
- Elara's 3 personas (`eu-battery-dpp-001`, `eu-passport-registry-001`, `eu-supply-chain-tracer-001`) are real, distinct system prompts, all mapped to the "Elara" name in `ChatPanel.jsx`.
- The demo canvas fetches live data from `GET /v1/dpp:demo:data` — not a hardcoded JS constant.

**The real gap:** everything demoable lives in **one fixed demo tenant** (`demo-volta-advisory-001`, seeded by `seedDppDemo.js`). If a brand-new external user runs the real onboarding flow (real KYC, real doc, real signature) end to end, they land in an **empty workspace with no UI path to create a battery-passport record.** The generic chat-driven RAAS engine writes to `raasPackages`, not to the `dppProducts`/`dppSuppliers`/`dppRegistryStatus` collections the canvas and public-passport route actually read. Only three things write `dppProducts` today: the Shopify shared-secret intake route, the offline seed script, and nothing else.

**Shopify — two different things, very different maturity:**
- The general "connect your store" OAuth card (orders/revenue/customers) is **dead code** — the backend routes it calls don't exist in `index.js`. A merchant clicking "Connect Shopify" 404s immediately.
- The DPP-specific Shopify app (`apps/sociii-dpp-passport/`) is real, working Remix code — real OAuth, real product-to-passport metafield writes, matches SKUs to real `dppProducts` records. But `shopify.app.toml` still has placeholder `example.com` URLs, it's never been installed on a real store, and it's hardcoded to a single tenant via an env var.

## This week — what actually ships to Nina/Elise (low-risk, already committed)

**Give them the existing demo login, don't invent a new path.** The `traitly` demo persona is real and Firestore-backed today. Before handing over access:

1. **Confirm demo-tenant isolation.** Since Nina and Elise will both be poking at the *same* seeded tenant, check whether one person's actions (adding a test product, changing a status) visibly pollute what the other sees, or what the next prospect sees after them. If the seed script isn't idempotent/resettable, that's a real risk for a demo meant to be shown repeatedly — worth a quick reset-before-each-session script rather than assuming it's fine.
2. **Walk them through, don't just hand over a login.** Given the onboarding flow (KYC/doc/signature) is real and separately impressive, consider showing that *and* the seeded demo canvas as two distinct things — "here's what a real client's first-day experience looks like" plus "here's the ongoing product experience once they're in" — rather than only the demo canvas.

This is enough for this week's ask. It is not the same as "market ready."

## What "market ready" actually requires (the real gap this week's demo doesn't close)

1. **A real product/passport-creation UI**, wired to `dppProducts`/`dppSuppliers` directly — not the generic RAAS chat path. Without this, every future prospect after Nina/Elise hits the same empty-workspace wall the instant they finish the (real, working) onboarding flow. This is the actual highest-priority build if the goal is a self-serve or sales-demo-able product, not just one hand-guided walkthrough.
2. **A Shopify decision, not a Shopify build-blindly.** The DPP Shopify app already works end-to-end in local dev. Going from that to "a merchant can actually install this" means: replacing the placeholder `example.com` config with a real hosted URL, deciding public App Store listing vs. private/custom app install, and removing the single-tenant hardcoding so it can serve more than one SOCIII customer. This is a real scoping decision (cost/timeline/hosting) for Sean, not something to build on assumption.
3. **Demo-tenant reset/repeatability**, formalized rather than assumed — the same seed script that's "not runnable from this environment... written and ready to run by whoever has deploy access" needs an owner and a real trigger (a button, a scheduled reset, something) if this demo is going to be shown to more than one prospect without manual intervention each time.

## Shopify app deployment — concrete checklist (2026-09-10)

Investigated what's actually blocking `apps/sociii-dpp-passport/` from being installed on a real store. Confirmed by direct code read, not guessed:

**Already real and correctly configured (no action needed):**
- `.env` already has real values, not placeholders — `SOCIII_API_BASE` points at the real Cloud Run backend, `SOCIII_DPP_SECRET` is a real shared secret. **`SOCIII_TENANT_ID` (`ws_1779846027006_hc71aw`) is confirmed — via `scripts/installSociiiWorkers.js`, `scripts/seedSociiiAccountingFy2026.js`, and others — to be Sean's own SOCIII, Inc. workspace, not Elise/Traitly's.** Fine for continued dev/testing against your own tenant, but this needs to be swapped to whichever real tenant Elise/Traitly actually operates under (the seeded `demo-volta-advisory-001`, or a freshly onboarded real one) before this app is installed on her actual store — otherwise her store would be writing battery-passport data into your own SOCIII workspace, not hers.
- The single-tenant hardcoding flagged in the original scoping above is a non-issue for shipping *one* real store (Elise's) — it only matters if/when a second merchant needs to install this app.
- App builds clean (`npm run build`), Prisma client generates clean.

**Fixed tonight (safe, local-only change, doesn't touch anything live):**
- `prisma/schema.prisma` had the Shopify session-storage DB hardcoded to a local `file:dev.sqlite` path — fatal on Cloud Run specifically, whose filesystem is ephemeral and can run multiple instances. A merchant's Shopify session would vanish on every cold start/restart, forcing constant re-auth. Now reads from `DATABASE_URL` (`.env` keeps the same sqlite default for local dev, so nothing changes today) — production deploy just needs a real Postgres connection string and `provider` flipped from `"sqlite"` to `"postgresql"` in that same file. No other code changes needed for this part.

**Real blockers — need Sean's own accounts/decisions, not fixable from here:**
1. **`shopify.app.toml` still points at placeholders**: `application_url = "https://example.com"` and `redirect_urls = ["https://example.com/api/auth"]`. Needs a real HTTPS URL before anything can go live.
2. **A real Postgres instance** for Shopify session storage — smallest real option is a small Cloud SQL Postgres instance (keeps it in the same GCP project/billing as the rest of SOCIII) or an external managed Postgres (Neon/Supabase free tier) if avoiding GCP setup is preferred for a single-tenant app. Either way, this needs actual provisioning + the resulting `DATABASE_URL` in that environment's config.
3. **Actual hosting.** The `Dockerfile` is real and builds a working container image — it needs to run somewhere reachable at a real URL. Cloud Run is the natural fit (same platform as the rest of SOCIII's backend) — that just needs `gcloud auth login` (interactive, needs Sean) then a `gcloud run deploy` from this directory, or wiring into whatever CI/CD the main app already uses.
4. **A real domain/subdomain** pointing at that hosted URL — e.g. something like `dpp-shopify.sociii.ai`, a CNAME/A record added in Namecheap (same account already used for `sociii.ai`'s other DNS).
5. **`shopify app deploy`** (needs `npx shopify login` — interactive, needs Sean's Shopify Partner account) to push the corrected config to Shopify's side once (1) points at the real URL.
6. **Install on Elise/Traitly's actual store** — needs either a private/custom app install link (fastest path for one merchant) or a full App Store listing (only needed if this is meant for more than one merchant later).

**Bottom line:** every remaining step needs either your GCP login, your Shopify Partner login, or a DNS change on your Namecheap account — none of that is something I can complete without you. But the checklist above is now the exact ordered list, not an open scoping question, so it should be mechanical whenever you're back at the keyboard with those logins handy.

## Recommendation

Ship the demo login this week as promised — it's real and it's genuinely good (the onboarding flow especially). But don't let "we showed Nina and Elise something real" become "this is ready for the next ten prospects" — items 1-3 above are the actual distance between those two things, and item 1 (real product-creation UI) is the one that matters most if DPP is meant to convert beyond hand-guided demos.
