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

## Recommendation

Ship the demo login this week as promised — it's real and it's genuinely good (the onboarding flow especially). But don't let "we showed Nina and Elise something real" become "this is ready for the next ten prospects" — items 1-3 above are the actual distance between those two things, and item 1 (real product-creation UI) is the one that matters most if DPP is meant to convert beyond hand-guided demos.
