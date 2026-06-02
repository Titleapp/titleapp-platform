# Glossary

Terms used across the SOCIII platform — alphabetized. When in doubt, this is the canonical definition.

---

## Alex
The platform's Chief of Staff agent. Lives in the chat panel of every authenticated surface. Answers questions, routes work between workers, recommends new workers based on what you're doing, and runs cross-worker workflows that span more than one domain. Alex doesn't replace workers — Alex helps you find and orchestrate them.

## API
Application Programming Interface. The full surface a system exposes to be called by other systems. An API is the *contract* (the set of methods, the shapes of inputs and outputs, the authentication model); an [endpoint](#endpoint) is a single addressable URL inside that contract. When SOCIII says "API reference," we mean the complete callable surface — multiple endpoints, plus auth, plus error semantics. **[See API reference →](/docs/api)**

## Append-only audit
The platform's data-integrity invariant: every action a worker takes appends an immutable event to Firestore. Nothing is ever overwritten or deleted. Current state is *computed* from the event history, not stored as a mutable record. Combined with the [audit chain](#audit-chain) this is the architectural moat — every governance decision and every state change can be reconstructed exactly as it happened.

## Assertion
A declared expectation in your [Intent Spec](#intent-spec) that the platform enforces at runtime via [QA-001](#qa-001). Each assertion is a one-line claim about your worker (e.g., "rejects inputs that mention scheduling without a date"). The validator runs these against your fixtures during build and against live invocations after publish. Assertions are the contract between you (the creator) and the platform that your worker behaves as advertised.

## Audit chain
The cryptographic record of every governance event in SOCIII. Each worker action is serialized, hashed, signed by the platform, and anchored to a public blockchain (Base in current embodiment). The full event payload is retained off-chain; the on-chain hash provides tamper-evidence. Together with [version pinning](#composition-hash) this enables reconstruction of the exact rules under which any historical action was governed — the foundation for regulatory audit, dispute resolution, and AI accountability. See Filing C in the patent portfolio for the architectural claim.

---

## Canvas
The right-hand panel of the SOCIII workspace — the presentation surface where the worker shows the user what it's doing. The canvas renders one of several [content types](#content-type) per [canvas tab](#canvas-tab) and adapts across render contexts (web, mobile, future watch + spatial). **[See Canvas →](/docs/canvas-tabs)**

## Canvas tab
One of the 3–10 named tabs your worker defines in its `canvas-tabs.json`. Each tab carries an `id`, `title`, `signal`, optional `icon`, `data_source`, `fixture`, and `scope`. The platform renders them across the top of the canvas and loads each tab's content on click. **[See Canvas tabs →](/docs/canvas-tabs)**

## Capability registry
The append-only registry at `contracts/capabilities.json` that lists every executable action a worker can call. Capabilities are versioned (e.g., `identity.register_user_v1`), declare allowed callers, required KYC level, and required roles. **A capability not declared here does not exist** — workers cannot synthesize new capabilities at runtime. This is the platform's source of truth for what AI actions are even possible.

## catalog.json
The worker's spec file. Declares the worker's name, vertical, jurisdiction, lane, pricing, [Forge price](#forge-price), [constraint RAAS sources](#regulatory-ingestion), output types ([content type](#content-type) enablement), and metadata. The first file Claude Code helps you author when you start a new worker. **[See Worker anatomy →](/docs/worker-anatomy)**

## Cold invite
An outreach email containing a [magic link](#magic-link) that delivers the recipient directly to a pre-built workspace. Used heavily in advisor recruiting, investor outreach, and creator onboarding. The recipient never has to "sign up" — clicking the link is sign-up.

## Composition hash
A deterministic cryptographic hash of the full composed [ruleset](#raas) (all five tiers merged) at a moment in time. Captured and persisted alongside every governance event so the exact rules under which an action was decided can always be reconstructed. The pinning policy (pin-at-process-initiation vs. re-evaluate-each-event) is itself a rule, allowing different verticals to choose different behaviors. Patent Filing C, Claim 3.

## Constraint check (pre-publish)
The validation that runs before any worker action with external consequences (sending an email, transferring funds, modifying a record, posting to a public ledger) executes. Evaluates the proposed action against the composed [ruleset](#raas). If a `hard_stop` rule is violated, the action blocks. If a `soft_stop` rule is violated, the action routes to human review. Warnings log but don't block. The pre-publish check is the platform's primary enforcement mechanism — it prevents violations from having external consequences that cannot be undone.

## Content type (output type)
A first-class category of output a worker can produce. Currently: `text`, `structured_data`, `document`, `image`, `audio`, `video`, `multimedia_sequence`. Every worker spec carries declarations for all content types with an `enabled: true | false` flag; creators activate the types their worker actually produces. New types added to the registry trigger automated stub-insertion across existing workers (default `enabled: false`) — creators opt in when ready. **[See Canvas → Content types →](/docs/canvas-tabs)**

## Cofounder
External-facing title for a senior contributor with founder-equity-shape participation. At SOCIII the Cofounder title is granted up-front in the [RSPA](#rspa) and is *not* conditioned on milestone completion — the equity vests on milestones, but the title is granted on signature. See `feedback_advisor_outreach_warmth` for naming convention.

## Creator
A person who has authored at least one worker on SOCIII. Marketplace-lane creators have signed the Creator Agreement and earn revenue per the [75/25 subscription split](#earnings) plus the [20/80 data-fee markup](#data-fees). Open Apache-lane authors are also creators, but without the revenue mechanics (and without the Creator Agreement).

---

## Data Credits / Data Fees
Variable runtime costs metered and billed by the platform with a universal **100% markup**. Scope: every external data-API call (Apollo, ATTOM, MLS, etc.) AND every model token cost (Claude, GPT, Gemini, image / video / audio generators). The customer pays base × 2; the creator earns 20% of the markup; the platform earns 80%. Independent of and additive to the [subscription split](#earnings). Non-negotiable platform-wide. **[See Earnings & payouts →](/docs/earnings)**

## Digital Title Certificate (DTC)
SOCIII's foundational data-record primitive — an append-only event-sourced ownership record. Every DTC has a **parent-child** structure: the parent record carries the identity of the asset (a vehicle's VIN, a parcel's APN, a person's professional credential), and child records carry every state-changing event that happened to that asset (sale, lien, inspection, transfer, attestation). The full chain is computed by replaying the events.

DTCs are anchored cryptographically:
- The append-only event store lives in Firestore (off-chain, queryable)
- A periodic hash anchor commits the merkle root of the event chain to a public blockchain (Base in current embodiment)
- On-chain anchor = tamper-evidence; off-chain payload = confidentiality + query

DTCs come **embedded in every worker** — the worker's audit trail of actions, the assets it touches, and the signatures it collects are all DTC-shaped by default. The creator can declare which DTC types their worker reads, writes, and parents; the platform handles the storage and anchoring.

Historical note: the DTC primitive originates in the inventor's 2023 provisional patent application (since published as prior art), extended in the December 2024 Blockchain Logbook System filing, and now embedded as the universal record substrate underneath the SOCIII platform. The current RAAS governance layer (Filing C) is the new architectural contribution on top.

## Digital Worker
User-facing name for what the platform internally calls a "RAAS package." Same thing — use "Digital Worker" in customer-facing copy; "worker" in engineering / SDK contexts.

## Drive
The per-workspace shared document store. Like Google Drive, but inside the platform — workspace-scoped, role-gated, and integrated with workers via [Lockers](#locker). Holds working documents, uploads, exports, signed agreements. Distinct from [Vault](#vault) (which is for verified / signed / DTC-anchored documents).

---

## Earnings (75/25 split)
For Marketplace-lane workers: creator earns 75% of net subscription revenue, platform earns 25%. Net = gross − payment processing − refunds − chargebacks. **[See Earnings & payouts →](/docs/earnings)**

## Endpoint
A single addressable URL on an [API](#api). Where an API is the contract, an endpoint is one specific route — for example, `POST /v1/workers/{slug}/invocations` is an endpoint inside SOCIII's worker API. Each endpoint declares its method, params, body shape, and response shape. Generally, "calling the API" means calling some endpoint inside it.

---

## Fellow
A reserved early-adopter tier — capped at 7 total slots, all currently allocated as of 2026-05-31. Fellows are formalized as Cofounder-Tier Advisors with the equity grants of that tier. Future advisors join as Marketplace creators only (the Fellow tier is not a public path).

## Fixture
A concrete example input (and expected output) for your worker, used by [QA-001](#qa-001) and the [SAMPLE mode](#sample-mode) demo experience. Stored in `fixtures/*.json`. Claude Code helps you author fixtures from a single real-world example.

## Forge price
The amount SOCIII pays for the **one-time, one-month** [Forge Reviews](#forge-reviews) subscription on day 1 of your Marketplace listing. Declared in `catalog.json` as `forge_price`. Default and minimum: **$1.34/month** (one-time only). The Forge tranche bypasses the standard 75/25 split and pays the creator a **flat $1.00 net** — the platform absorbs the Stripe processing cost. **The Forge subscription is one month only and auto-cancels at day 30; there is no recurring platform payment.** **[See Review cycle → Forge Reviews →](/docs/review-cycle)**

## Forge Reviews
The platform-funded first-customer + structured review program. On the day your worker first lists in the Marketplace lane, SOCIII makes a **one-time, one-month payment** at the declared [Forge price](#forge-price). Forge uses your worker against real domain inputs for 7 days, generates a structured review (private to you for 7 days, then published on your worker page), and counts as your first paying customer. **At day 30 the subscription auto-cancels — no further payments.** **[See Review cycle →](/docs/review-cycle)**

## Forge score
The structured rating Forge produces during its review week. Visible publicly on your worker's product page once published.

---

## Identity attestation
A cryptographic statement issued by a hosted identity rail (Stripe Identity, Coinbase Verified) that binds a user's platform identity to verified attributes (jurisdictional residency, professional licensure, sanctions status). Identity attestations flow into [RAAS](#raas) composition as first-class inputs — rules may be conditioned on verified user attributes. Recorded as a child entry on the user's [DTC](#digital-title-certificate-dtc). Patent Filing C, Claim 7.

## Intent Spec
The YAML file declaring what your worker accepts, produces, refuses, and asserts. The first thing Claude Code helps you author when you start a new worker — and the highest-leverage conversation in the build, because the clarity of the Intent Spec determines the rest of the worker's behavior. **[See Intent Spec →](/docs/intent-spec)**

---

## Jurisdiction
The legal-geography scope for a worker's [vertical baseline](#vertical-baseline). Examples: `CA` (California), `NV` (Nevada), `EU` (European Union — for GDPR-governed workers). Declared in `catalog.json` as `jurisdiction:`. The platform's [regulatory ingestion service](#regulatory-ingestion-service) auto-updates the rules in this jurisdiction's Tier 2 baseline. A worker can operate in multiple jurisdictions; the platform merges the applicable rule sets.

---

## KYC gate
A platform invariant ([RAAS](#raas) Tier 1) that requires any worker handling money to verify the user's identity through Stripe Identity before activation. Cannot be disabled by the creator.

---

## Lane
A worker's distribution tier. Three values: `open` (Apache 2.0 fork, no revenue, no SOCIII brand), `marketplace` (curated, 75/25 split, branded), `experimental` (AI-reviewer only, "Experimental" disclosure mark). Declared in `catalog.json`. **[See Three Lanes →](/docs/three-lanes)**

## Locker
A scoped [Drive](#drive) subfolder — usually with a domain-specific name like "Hospital Protocol Locker" or "Brand Voice Studio Locker" — that a worker can read from at runtime. Customers populate the Locker with their company-specific documents; the worker references them. See also [Studio Locker](#studio-locker).

---

## Magic link
The platform's passwordless authentication mechanism. Sent via SendGrid as a one-time URL that signs the user in on click. Used heavily in advisor flows, investor outreach, [cold invites](#cold-invite), and any flow where you want zero-friction onboarding.

## Marketplace
The curated SOCIII Marketplace at `sociii.ai/marketplace`. [Marketplace lane](#lane) workers only. 75/25 subscription split + 20/80 data-fee markup, full SOCIII brand association, Creator Agreement signed, [QA-001](#qa-001) gated.

---

## Per-transaction rules
[RAAS Tier 4](#tier) — rules attached to a specific deal, escrow, policy, or work product. The most flexible tier; used when a single transaction needs constraints that don't apply to the worker globally. Version-pinned at transaction initiation. **[See RAAS →](/docs/raas)**

## Personal Vault
Every signed-in user has one — their personal workspace, distinct from any company workspaces they belong to. Holds their personal DTCs (driver's license, identity verifications, personal title certificates), signed agreements that they personally hold, and personal Drive content.

## Pre-publish constraint check
See [Constraint check](#constraint-check-pre-publish).

---

## QA-001
The platform's Worker Quality Assurance system. Runs the [assertions](#assertion) declared in your [Intent Spec](#intent-spec) against your fixtures (build time) and against live invocations (runtime). Gate for Marketplace-lane shipping. **[See QA-001 →](/docs/qa-001)**

---

## RAAS
Rules + AI-as-a-Service. The platform's rule engine — the part that decides what a worker is allowed to do, what it must check, and how it composes constraints from multiple sources. Five tiers: Platform Safety · Platform Operations · Vertical Baselines (jurisdictional law) · Workspace Overlays (Studio Locker) · Per-Transaction Rules. **[See RAAS →](/docs/raas)**

## RAAS module
An auto-updating regulatory rule pack maintained by the platform's [regulatory ingestion service](#regulatory-ingestion-service). Examples: OFAC SDN list (sanctions), FAA airworthiness directives, FINRA broker-dealer rules, state DMV regs. Workers opt in via `constraintRaasSources` in `catalog.json`.

## Refusal mode
A class of input or condition where your worker explicitly declines to act. Declared in your [Intent Spec](#intent-spec). Each refusal mode has a stated reason and a refusal message that's surfaced to the user.

## Regulatory ingestion service
The platform's continuously-polling service that pulls updates from authoritative regulatory feeds (OFAC daily, SEC enforcement actions daily, Federal Register daily, state DMV per-jurisdiction, FAA airworthiness directives) and incorporates them into the affected [Vertical Baseline](#vertical-baseline) rule sets. Routine updates auto-publish; substantive changes route to a human-review queue. Patent Filing C, Claim 5.

## RSPA
Restricted Stock Purchase Agreement. The legal instrument by which Cofounder-tier participants receive equity at par with an 83(b) election filed at formation. Multi-tranche RSPAs (with milestone-gated repurchase rights per tranche) are the SOCIII pattern for performance-vested founder equity. See `docs/legal-templates/SOCIII-Cofounder-Advisor-Agreement-Kent-Redwine.md` for the template.

---

## SAMPLE mode
The first-load demo experience: when a user opens a worker that has no real data yet, the platform renders the worker's fixtures with a "SAMPLE" chip in each card header so the user knows what they're seeing. Critical for showing what the worker does before the user provides real input.

## Sociii Build
The enterprise concierge tier. For Fortune-500 customers who want a custom-built worker authored by SOCIII's team rather than by an external creator. Priced at $500/hr. **[Visit sociii.ai/build](https://sociii.ai/build)**

## Spine workers
The platform's own first-party workers — Accounting, HR, Contacts, Scheduling, Marketing, Drive, Vault, Command Center, IR. They ship with SOCIII and operate as the core operating system for every workspace. Creators can build on top of them but cannot replace them.

## Studio Locker
[RAAS Tier 3](#tier) — the layer where a customer's organization-specific policies and procedures live. Examples: a hospital's chest-pain protocol, a law firm's compliance playbook, a dealership's deal-doc workflow, a company's brand voice. The Studio Locker is **versioned, audited, and owned by the customer** (not the platform). Workers reference the Studio Locker at runtime; the platform merges Studio Locker rules into the composed ruleset the same way it merges platform-maintained rules. This is the layer that lets two nursing-evaluation workers built for different hospitals enforce different protocols while sharing the same worker code. **[See RAAS → Tier 3 →](/docs/raas)**

---

## Tier (RAAS)
One of the five layers in the RAAS hierarchy. Tier 0 = Platform Safety. Tier 1 = Platform Operations. Tier 2 = Vertical Baseline (jurisdictional law, platform-maintained). Tier 3 = Workspace Overlay ([Studio Locker](#studio-locker), customer-maintained). Tier 4 = Per-Transaction Rules. Lower tier wins on conflict; more-restrictive rule wins on tie. The five-tier structure is the patented architectural claim (Filing C, Claim 2 — "exactly five tiers"). **[See RAAS →](/docs/raas)**

## Three Lanes
The distribution-tier framework: Open Apache fork (Lane 1) / Marketplace 75/25 (Lane 2) / Experimental (Lane 3). **[See Three Lanes →](/docs/three-lanes)**

## TRpW
Total Revenue per Worker. The platform metric for pricing graduation — high-TRpW workers may negotiate alternate billing models (e.g., enterprise self-host). Visible in Creator Dashboard.

---

## Vault
The per-user secure document store for verified, signed, and DTC-anchored artifacts. Holds identity verifications, signed agreements, DTCs the user owns. Workspace-scoped (each workspace + every user has its own Vault). Distinct from [Drive](#drive) (working documents).

## Vertical Baseline
[RAAS Tier 2](#tier) — per-industry rule sets defining the regulations applicable to a specific domain (real estate, securities, healthcare, aviation, automotive, etc.). Maintained by the platform's [regulatory ingestion service](#regulatory-ingestion-service); kept current automatically as laws change. Creators opt their worker into a vertical baseline via `vertical:` and `jurisdiction:` in `catalog.json`.

---

## Wearable context
A future render context for the canvas — examples: `phone_mobile` (shipping), `glanceable_watch_card`, `vision_pro_spatial`, `voice_only`. Every [content type](#content-type) carries a `wearable_contexts` field declaring which render contexts it supports. Most workers will only declare `phone_mobile` today, but the wearable context fields are reserved in the spec so a worker can extend to a watch face or a Vision Pro spatial panel later by flipping `enabled: true` rather than retrofitting. **[See Canvas → Wearables →](/docs/canvas-tabs)**

## Worker
A packaged Digital Worker — six files (`catalog.json`, `intent-spec.yml`, `rules/`, `fixtures/`, `canvas-tabs.json`, `README.md`) that combine domain rules, sample data, canvas tabs, and pricing. The unit of authorship and distribution on SOCIII. **[See Worker anatomy →](/docs/worker-anatomy)**

## Workspace
A tenant container — a company or team using SOCIII. Has its own [Vault](#vault), [Drive](#drive), member roles, billing relationships, and access to one or more workers. Workspaces are independent from each other; users can belong to multiple workspaces and switch between them.

## Workspace Overlay
[RAAS Tier 3](#tier) — see [Studio Locker](#studio-locker).

---

## What comes next

**[→ The SDK overview](/docs/sdk)**
**[→ Worker anatomy](/docs/worker-anatomy)**
**[→ RAAS — full rule hierarchy](/docs/raas)**
**[→ Canvas — tabs, content, wearables](/docs/canvas-tabs)**
