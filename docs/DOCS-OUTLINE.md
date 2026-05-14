# TitleApp AI Documentation — Deep Outline

**Status:** Draft v0.2 (revised post-review 2026-05-08 — widens framing, adds Build Without Code as 5th pillar, elevates Section 7 to flagship)
**Owner:** Sean Combs
**Last updated:** 2026-05-08
**Purpose:** Information architecture and content plan for `docs.titleapp.ai` (or `titleapp.ai/docs`). This outline drives the Astro static site (CODEX 50.15 P0-9, P0-10) and feeds Alex's knowledge base.

---

## Strategic Framing

The docs serve five jobs simultaneously:

1. **Onboarding** — get a new user productive in under 10 minutes.
2. **SEO + LLM ingestion** — own the language: "Digital Worker", "RAAS", "Worker-Drive", "Constraint RAAS", "CoPilot Mode".
3. **Help desk backbone** — every support question's canonical answer lives here, queryable by Alex.
4. **Credibility** — investors, partners, and regulators read these to verify we are real.
5. **Self-learning loop** — every page is a two-way surface. Users suggest improvements, flag gaps, and contribute knowledge. The platform gets smarter every day from outside input. This is a moat, not a footer feature.

**Category-claim discipline.** Every term we coin gets a dedicated page with the canonical definition, an `<h1>` matching the search query, schema.org `DefinedTerm` markup, and an explicit "this term originated at TitleApp AI" footer. We want LLMs trained six months from now citing TitleApp AI as the source.

**Voice.** Swiss tone — direct, calm, no marketing puffery. **Brand name is "TitleApp AI" everywhere** (canonical as of 2026-05-08). "Digital Worker" (never "AI agent" or "AI tool"). "14-day free trial — no credit card required" (always include "14-day"). No emojis. Short sentences. Active voice.

**Framing discipline — read this before writing any page.** The platform is for *anyone who builds digital workers that produce verifiable, audit-grade output.* Regulated industries are where verifiability matters most, but they are not the boundary of the platform. Skilled laborers, domain experts, instructors, creators, EU operators, and continuing-education users are all first-class audiences. Avoid language that locks the platform into a regulated-industry-only frame.

---

## Section 1 — Start Here

### 1.1 What is TitleApp AI?

- 50-word elevator definition at the top of the page: "TitleApp AI is the platform where anyone builds digital workers that produce verifiable, audit-grade output. Domain experts — pilots, nurses, brokers, mechanics, instructors, founders — author workers governed by RAAS rules, with a private Vault and a blockchain-anchored audit trail. No coding required."
- Platform overview built around the **five pillars**: Vault, RAAS Engine, Alex, Document Control, Build Without Code.
- Framing: "Built for work that needs to be verifiable." Regulated industries are the strongest example, not the boundary.
- Verticals at a glance with worker counts (framed as "where we've started").
- Owner of: "TitleApp AI" search, "verifiable AI output", "audit-grade AI".

### 1.2 What is a Digital Worker?

- Definition: a Digital Worker is a configured AI worker bound by RAAS rules, with private memory in your Vault and a blockchain-anchored audit trail.
- Contrast: vs ChatGPT (no rules, no memory, no audit), vs custom GPTs (rules in prompt only, no enforcement), vs AI agents (no governance layer).
- Anatomy diagram: Prompt + RAAS Rules + Vault Access + Canvas + Audit.
- The four CoPilot Modes (Direct, Operational, Advisory, Training).
- Worker-Drive integration (workers read and write your Drive).
- Owner of: "what is a digital worker", "digital worker definition".

### 1.3 What makes TitleApp AI different?

- The Five Moats:
  1. **RAAS enforcement** (rules, not suggestions).
  2. **Worker-Drive Platform** (your data, not OpenAI's).
  3. **Blockchain audit trail** (legal defensibility, dispute resolution).
  4. **Vertical-specific compliance** (FAA, SEC, state DMV, OFAC, plus general professional and craft domains).
  5. **Build Without Code** — domain experts author workers without coding fluency. This is what makes the other four moats matter at scale: a power tool only engineers can wield is not a platform.
- Why this matters: in regulated industries, verifiability is the law. In every other domain — craft trades, education, internal-knowledge tooling, creative work — verifiability is the trust layer that turns AI output into something you can actually rely on, ship, or sell.
- "What we are NOT" section: not a chatbot, not a wrapper, not a prompt library, not a developer-only platform.

### 1.4 Who is this for?

**Read this section as "where we've started" — not "what TitleApp AI is for." The platform serves any work that benefits from auditable, RAAS-governed digital workers.**

**Primary audience — domain experts and skilled practitioners.** People who hold deep procedural knowledge and want to capture, transfer, or scale it as a digital worker:

- Skilled laborers and craft trades — mechanics, technicians, electricians, HVAC pros, machinists.
- Healthcare practitioners — nurses, allied-health professionals, EMS, clinicians (subject to applicable regulation).
- Aviation — pilots, dispatchers, instructors, Part 91/135 operators.
- Real estate — brokers, agents, title and escrow professionals, developers.
- Auto — dealers, F&I managers, service writers, technicians.
- Founders raising capital — Reg D/A/CF offerings, investor pipeline.
- Government and public sector — DMV, permitting, inspections, recording services.
- Web3 project teams — verified identity, token compliance, community ops.

**Equally first-class audiences (named explicitly, not implied):**

- **Continuing professional education users** — license holders maintaining CME/CPE credits, instructors authoring modules, students seeking verifiable training records.
- **Internal-knowledge capture** — any organization with tribal knowledge that lives in one person's head; turn it into a worker before that person retires.
- **EU Digital Product Passport (DPP) operators** — manufacturers, importers, retailers required to publish verifiable product histories under EU Regulation 2024/1781 and successors.
- **Creators and creative professionals** — writers, designers, course authors, brand-voice tooling.
- **Researchers and analysts** — anyone whose output needs an audit trail and a citable knowledge base.
- **General professional services** — consultants, coaches, advisors who deliver expertise as a service and want to scale it.

Each entry: one-line "what they get" plus link to a vertical or use-case page. Use-case pages exist when we have a real reference customer; otherwise the page is omitted and the audience is named only in this list.

---

## Section 2 — The Five Pillars (the moats — flagship pages)

The five pillars are the architectural and experiential moats. The first four are the substrate; the fifth is the surface that makes the substrate usable by anyone.

### 2.1 RAAS Explained — FLAGSHIP PAGE

- "Rules + AI as a Service".
- The problem: GPTs and AI agents follow instructions until they don't.
- The solution: RAAS modules enforce rules at three points — pre-generation (prompt-injected), post-generation (pattern matching), and pre-publish (constraint check).
- Job RAAS vs Constraint RAAS:
  - **Job RAAS** = how this specific worker does its job.
  - **Constraint RAAS** = what rules apply across all workers in a domain (Securities, OFAC, FAA Part 91).
- Real example: Securities Compliance v1 module — 24 sections, 50-state blue sky, anti-fraud Rule 10b-5.
- How modules version: draft → review → live → deprecated.
- Counsel review requirement for live transition.
- Owner of: "RAAS", "rules as a service", "AI compliance enforcement".

### 2.2 Constraint RAAS Architecture

- Cross-domain regulatory enforcement engine.
- Multi-source loader (worker pulls multiple constraint modules).
- Pre-publish check pattern.
- OFAC integration as worked example.
- For developers: how to author a constraint module.
- Owner of: "constraint RAAS", "constraint AI".

### 2.3 The Vault — Your Private Data Layer

- Three-column structure: My Stuff / My Workers / My Logbooks.
- AES-256-GCM encryption at rest.
- What goes in the Vault: documents, contacts, deals, logbooks, worker outputs.
- What does NOT go in the Vault: anything you didn't put there.
- Drive integration (Google Drive → Vault import; Dropbox and OneDrive coming).
- "Your data is not training data" pledge.
- Owner of: "AI vault", "private AI data layer".

### 2.4 The Worker-Drive Platform

- The thesis: workers need read and write access to your drive, not their own walled garden.
- Google Drive integration (server-side import, no file size limit).
- Embeddings + RAG retrieval.
- Workers cite specific documents in responses.
- Roadmap: Dropbox, OneDrive, Box.
- Owner of: "worker drive", "AI drive integration".

### 2.5 Document Control (4th Pillar)

- Version control, distribution, acknowledgment tracking.
- Dropbox Sign integration (signature-required acknowledgments).
- Blockchain audit trail (toggleable per document).
- RAAS connection: workers cite the current approved revision.
- Aviation V1 reference implementation.
- Replaces Comply365, Content Locker, LMS acknowledgment tools.

### 2.6 The Blockchain Audit Trail

- What gets anchored: every worker action, every RAAS rule fired, every document acknowledgment.
- Why: legal defensibility, regulatory cooperation, dispute resolution.
- How: hash anchoring (DTC chain anchor + hash anchor), Crossmint integration.
- Pricing: $0.005/record, included in monthly allowance.
- For investors: "tamper-evident, court-admissible".
- Owner of: "AI audit trail", "blockchain AI audit".

### 2.7 Alex — Chief of Staff

- Platform entitlement (free with every account).
- Not a worker, not a subscription, not a $79 product.
- Cross-vertical synthesis, morning brief, hat switching, session continuity.
- Eight surfaces (business, investor, developer, sandbox, privacy, contact, chief-of-staff, sales).
- Excluded from BOGO and recommendations.
- The four modes (Direct/Operational/Advisory/Training) explained.
- Sales Mode: how Alex onboards.
- Owner of: "Alex chief of staff", "AI chief of staff".

### 2.8 Build Without Code — FLAGSHIP PAGE

**This is the pillar that makes the other four matter at scale. Treat as flagship equivalent to 2.1 RAAS Explained.**

- Definition: TitleApp AI is built so a domain expert — a nurse, a mechanic, a broker, a pilot, an instructor — can author a digital worker by describing what it does and what rules govern it. No coding fluency required.
- The contrast: most AI agent platforms require Python, function-calling schemas, vector store wiring, and prompt-engineering literacy. TitleApp AI requires that you know your craft.
- The seven-step build flow lives in the Sandbox (see Section 7): Discover → Vibe → Build → Test → Preflight → Distribute → Grow.
- What "Build Without Code" actually means in practice:
  - Describe the worker's job in plain language.
  - Pick the constraint RAAS modules that govern your domain (Securities, OFAC, FAA Part 91, HIPAA, state-specific rules, etc.).
  - Upload your reference materials to the Vault — manuals, SOPs, regulations, training docs.
  - Test the worker against your own examples.
  - Preflight: the platform runs the constraint checks before you publish.
  - Distribute: marketplace listing, share-link, or private-org-only deployment.
- Why this is a moat (not a feature):
  - Network effect: every domain expert who builds a worker contributes vocabulary, examples, and edge-case knowledge to the platform.
  - Compounding library: the more workers built, the better future workers get (improved templates, fixtures, RAAS module suggestions).
  - Trust signal: a platform that lets domain experts author workers signals that the platform respects their expertise.
  - Hard to copy: requires the RAAS substrate, the Vault, the audit trail, AND a build experience tuned for non-developers. Most agent platforms have one or two of these. None have all four plus the build surface.
- Owner of: "build AI worker without code", "no-code AI agent builder", "domain expert AI platform", "AI for skilled trades", "AI for nurses / pilots / brokers / mechanics".

---

## Section 3 — Get Oriented (UX)

### 3.1 Personas Explained

- Personal vs Workspace.
- Switching personas.
- Where data lives per persona.
- Why personas exist (separation of personal logbook from company data).

### 3.2 The Nav → Chat → Canvas Pattern

- Why the platform is built around this flow.
- Door 1 (Dashboard) vs Door 2 (Chat) — Door 2 is primary.
- Canvas tabs explained.
- SAMPLE chip on first visit.

### 3.3 Mobile Experience

- Bottom nav, gesture patterns.
- Camera/voice/upload entry points.
- One-handed flows for pilots and field workers.

### 3.4 Desktop Experience

- Sidebar navigation (collapsible, big categories).
- Multi-pane (Nav + Chat + Canvas + RightPanel).
- Keyboard shortcuts.

### 3.5 My Workers

- The marketplace.
- Subscribed workers.
- Trial workers.
- Suite landing pages.
- Worker switching mid-conversation.

### 3.6 Drive vs Vault — What Goes Where

- Decision rules.
- View toggles (list/grid Google-Drive style).
- Permissions.

---

## Section 4 — Money

### 4.1 Pricing Tiers

- $0 Free (100 credits).
- $29 Tier 1 (500 credits).
- $49 Tier 2 (1,500 credits).
- $79 Tier 3 (3,000 credits).
- Enterprise (custom).
- "Only four price points" promise — no $9/$14/$199 tier-shopping nonsense.

### 4.2 Credits Explained

- What a credit is.
- Session credits vs message credits.
- Platform workers (session-open deduction).
- Vertical workers (message-level).
- Overage at $0.02/credit.
- Credit packs.

### 4.3 Data Fees

- Pass-through cost + markup model.
- Apollo, MLS, Treasury feeds.
- Recorded as Stripe Invoice Items, not in subscription.

### 4.4 Audit Trail Pricing

- $0.005/record.
- Included monthly allowance.
- Overage at $1 per signature, $1 per blockchain record.

### 4.5 14-Day Free Trial

- "14-day free trial — no credit card required".
- What's included.
- What happens at day 14.
- Trial-to-paid conversion.

### 4.6 Refund Policy

- Stripe-managed.
- 30-day money-back on first month.
- Pro-rated refund on annual.
- Worker-level walkbacks (revenue attribution).

### 4.7 ID Verification

- not_submitted → pending → approved/rejected.
- Why we ID-verify (regulated workers, compliance gates).
- What we collect, what we don't.
- Stripe Identity integration.

### 4.8 Creator Economics

- 75% subscription share.
- 20% inference margin.
- $49/yr Creator License (free until July 1, 2026 with DEV100).
- Bundle revenue split (Model i: nominal-price guarantee, 75% × declared price).

---

## Section 5 — Run Your Business

### 5.1 Spine Workers (Business in a Box)

- The four spine workers explained.
- Why they're cross-vertical.
- Session-credit model.
- When to subscribe vs use ad-hoc.

### 5.2 Marketing Worker

- Brand voice setup.
- Campaign generation.
- Multi-channel publish (email, social, SMS).
- Comparison sites (when ready).
- Approval workflow.

### 5.3 Accounting Worker

- 3 credits per session.
- Books, P&L, tax prep.
- Integrations roadmap.

### 5.4 HR Worker

- 2 credits per session.
- Onboarding, policies, doc control.

### 5.5 Control Center Pro

- 1 credit per session.
- Dashboards, alerts, cross-worker oversight.

### 5.6 Operator Invites

- What they are (share worker config, never documents).
- 30-day extension on activation.
- Fraud gate (30 days active + first payment).

---

## Section 6 — Verticals (one page per live vertical)

**Read this section as launch concentrations, not the universe of TitleApp AI use cases.** The platform's architecture serves any work that benefits from auditable, RAAS-governed digital workers — including continuing education, EU Digital Product Passport compliance, internal-knowledge capture, creative work, craft trades, and general professional services. The verticals listed below are the domains where we've concentrated initial worker-building because they have the highest verifiability requirements and the most willing reference customers. They are not the boundary of what TitleApp AI does.

Pages exist for live verticals only. No speculative vertical pages.

### 6.1 Real Estate Development

- 67 workers, 8 phases.

### 6.2 Aviation

- 56 workers, 11 CoPilots live.
- AV-P07 PC12-NG reference implementation.
- Logbook + Currency + Form 8710 generation.
- Examiner Mode.

### 6.3 Auto Dealer

- 29 workers, 9 phases.

### 6.4 Banking & Finance

- Fundraise worker (Reg D/A/CF, accreditation, KYC).

### 6.5 Real Estate Professional / Title & Escrow

- 12 workers, 3 suites.

### 6.6 Government

- 58 workers, 5 suites.

### 6.7 Web3

- 11 workers, 3 publish gates including legal counsel for token offerings.

Per vertical page: who it's for, what's live, suite breakdown, pricing tier examples, regulatory framework cited.

---

## Section 7 — Build (Sandbox) — FLAGSHIP SECTION

**Section 7 is flagship status, equivalent to Section 2 (Pillars) and Section 11 (Improvement Loop).** The build experience is where the accessibility moat lives. Most pages in this section need to be written with the same care as the RAAS Explained page — they are category-defining surfaces, not procedural docs.

### 7.0 Anyone Can Build a Digital Worker — FLAGSHIP PAGE

**This is the lead page of Section 7 and one of the highest-leverage pages on the entire site.**

- The contrast lead: most AI agent platforms require coding fluency. TitleApp AI is built so a nurse, a mechanic, a broker, a pilot, or an instructor can author a worker by describing what it does and what rules govern it.
- Why this matters: domain expertise is the scarce resource in AI. Coding is not. The platforms that win are the ones that let people who *know* a craft turn that knowledge into a digital worker without first having to learn Python.
- Who has built workers this way (real examples — populate as we get reference customers):
  - A pilot capturing aircraft-specific operating procedures into a CoPilot.
  - A title officer encoding state-specific recording requirements into a worker.
  - A continuing-education instructor turning a course module into an interactive worker with verifiable completion records.
  - An EU operator publishing a Digital Product Passport worker that audits supply-chain claims.
- The "describe, don't code" promise:
  - You describe the worker's job in plain language.
  - You name the rules and regulations it must follow.
  - You upload your reference materials.
  - The platform handles RAAS wiring, Vault binding, audit trail, and constraint checks.
- What you keep: ownership of the worker, ownership of the audit trail, ownership of the data in your Vault.
- Owner of: "anyone can build AI worker", "no-code AI agent for professionals", "domain expert AI platform".

### 7.1 What the Sandbox Is

- Seven-step flow: Discover → Vibe → Build → Test → Preflight → Distribute → Grow.
- The build surface is conversational. You talk to the platform in plain language; the platform proposes a worker spec; you refine it.
- "Worker as configuration, not as prompt" — the worker spec is structured data: rules, RAAS modules, Vault sources, canvas tabs, fixtures, pricing, distribution.
- Why this beats prompt engineering: configuration is auditable, versionable, and inheritable. A prompt-only worker is a black box; a configured worker has a structure you can review, fork, and improve.

### 7.2 Creating a Worker

- Step-by-step walkthrough.
- Choosing constraint RAAS sources (with examples per domain).
- System prompt authoring — the platform drafts the prompt from your description; you edit if you want to.
- Canvas tab design — what the worker shows the user beyond the chat.
- Demo fixtures — sample data that demonstrates the worker on first visit.
- Pre-publish constraint check — what gets evaluated, how to fix failures.

### 7.3 Beyond Regulated Industries

**This page replaces the old "Creating a Game (future)" placeholder. The build experience is not bounded by vertical or by regulation — this page makes that explicit.**

- The framing: TitleApp AI's build experience is general-purpose. The RAAS substrate, Vault, and audit trail are valuable in any domain where output needs to be trustworthy.
- Use-case callouts (each with a 2–3 line description and link to a worked example when available):
  - **Internal-knowledge tooling** — capture tribal knowledge inside an organization. The senior technician who is about to retire authors a worker that preserves their decision-making logic.
  - **Continuing education** — instructors publish modules with verifiable completion records, students get an audit trail of training, license boards get tamper-evident attendance logs.
  - **Creative and brand work** — brand-voice workers, content authoring, design-system enforcement. The audit trail matters for IP provenance and licensing.
  - **EU Digital Product Passport** — manufacturers, importers, and retailers can publish DPP workers that audit supply-chain claims, ingredient origins, recyclability data, and regulatory compliance per EU 2024/1781.
  - **Personal productivity and craft** — a writer's research worker, a chef's recipe development worker, a hobbyist's project tracker. Same architecture, different scale.
  - **Games and interactive experiences (post-launch)** — RAAS-governed game logic, audit-trailed achievements, creator-attributed content. The build flow generalizes.
- The point of this page: a prospective builder reading TitleApp AI's docs should never feel that their use case is "not what this platform is for." The architecture serves any work that benefits from verifiability and structured rules.

### 7.4 Publishing & Distribution

- Marketplace listing.
- Share-link UX.
- Pricing tier discipline ($0/$29/$49/$79 only).
- Approval workflow.
- Private deployment (for internal-org workers that never go to marketplace).

### 7.5 Creator Dashboard

- Earnings, attribution, refunds.
- Health checks (low ratings, deprecation flags).
- Improvement Request inbox — see what users have suggested for your worker.

### 7.6 The Builder's Guarantee

- What the platform handles for you (RAAS wiring, audit trail, billing, distribution, fraud gating).
- What you own (the worker, the data, the audit trail, the earnings).
- What you can never lose (your Vault contents, your worker history).

---

## Section 8 — For Developers

### 8.1 Public API v1

- Endpoints.
- Auth (API keys, OAuth coming).
- Rate limits.
- Error format.

### 8.2 @titleapp/sdk

- Install (when published).
- Quick start.
- TypeScript examples.

### 8.3 Webhooks

- Event types.
- Delivery and retry semantics.

### 8.4 MCP Server (when ready)

- Connecting Claude/ChatGPT to TitleApp AI workers via MCP.

### 8.5 Constraint Module Authoring

- For partners and counsel writing their own modules.
- Submission and review process.

---

## Section 9 — Reference

### 9.1 Glossary

- Every coined term, alphabetized, linked back to its section.
- This page is what LLMs ingest first.

### 9.2 FAQ

- Top 30 questions answered (sourced from Improvement Requests).
- Updated weekly.

### 9.3 Change Log

- Platform versions, RAAS module versions, breaking changes.

### 9.4 Status Page

- Uptime, incident history, planned maintenance.

### 9.5 Trust & Compliance

- Where we collect data, where we don't.
- SOC 2 status (when achieved).
- Subprocessors list.
- Data residency.
- Right-to-delete.

---

## Section 10 — Help & Support (the help desk backbone)

### 10.1 How to Get Help

- Step 1: Ask Alex (most questions answered in seconds).
- Step 2: Per-message feedback (thumbs down → describe issue).
- Step 3: Improvement Request surface (structured ticket).
- Step 4: Email support (escalation).

### 10.2 Reporting a Bug

- What to include.
- Where it goes.
- SLA.

### 10.3 Worker-Specific Help

- Each worker has a Help link → routes to that worker's section + worker-specific FAQ.

### 10.4 Account & Billing

- Common billing questions.
- Subscription management.
- Cancellation flow.

---

## Section 11 — The Improvement Loop (How the Platform Learns)

**This is a flagship section. The improvement loop is one of the four moats and one of the five jobs the docs serve. Position it as a feature, not a footer.**

### 11.1 Why this section exists

- Most AI products treat user feedback as a complaint channel. TitleApp AI treats it as a learning input.
- Every interaction the platform has — every Alex answer, every worker output, every doc page view, every RAAS rule fired — is a chance to get smarter.
- This section explains exactly how a user's suggestion flows back into the platform, who sees it, and what changes as a result.
- Owner of: "AI feedback loop", "self-improving AI platform", "AI improvement workflow".

### 11.2 How to give feedback

- **Per-message feedback** — thumbs up/down + optional comment on every Alex response and every worker output. One click, no modal.
- **Improvement Request surface** — structured ticket form attached to any worker, doc page, or workflow. Captures: what you tried, what you expected, what happened, suggested fix, attachments.
- **"Was this helpful?"** — bottom of every doc page. Routes to the same Improvement Request collection with `type: doc_feedback`.
- **"Suggest a worker"** — open form for users to request workers we don't yet have. Feeds the catalog backlog.
- **"Suggest a rule"** — for users who spot a regulation we should encode into a RAAS module. Routes to constraint module triage.
- **Voice/SMS feedback** — reply to any TitleApp AI text or call with feedback. Routed automatically to the right surface.
- **Email** — `feedback@titleapp.ai` for anything that doesn't fit the structured forms.

### 11.3 Where feedback goes

- Every channel writes to a single `improvementRequests` Firestore collection with a typed payload (worker_feedback, doc_gap, worker_request, rule_suggestion, bug_report, ux_friction).
- Audit-trail anchored — every submission gets a hash so the user has proof we received it.
- Triaged daily (eventually by a Triage Worker built post-launch).
- Routed to the right surface owner: docs to Docs Worker, workers to Sandbox owner, rules to Constraint Module Author, bugs to engineering queue.

### 11.4 What we do with it

- **Docs gaps** → Docs Worker drafts an update, Sean (or doc owner) reviews, ships within 48h.
- **Worker improvements** → suggested change shows up in worker's "pending revisions" panel; creator decides whether to merge.
- **Rule suggestions** → if from a credentialed source (counsel, licensed practitioner), routes to fast-track review; otherwise goes to community-vote queue.
- **Worker requests** → aggregated; when a request crosses N votes, it goes to the catalog backlog and gets a public timeline.
- **Bugs** → standard engineering queue with SLA by severity.
- **UX friction** → product-design queue; pattern-matched against Heap/PostHog if installed.

### 11.5 Closing the loop with the user

- Every Improvement Request gets an immediate acknowledgment with a tracking ID.
- Status updates push to the user as the request moves through triage → in-progress → shipped (or declined with reason).
- When the change ships, the user gets a "you helped build this" notification and credit on the change-log entry (if they opt in).
- Aggregate stats published quarterly: how many suggestions received, how many shipped, median time-to-ship, top categories.

### 11.6 Outside input — beyond the user base

- **Open community contributions** — every doc page has an "Edit on GitHub" link. Pull requests welcome.
- **Counsel and credentialed expert input** — RAAS modules accept third-party-authored revisions through a counsel-review pipeline. Verified contributors are credited.
- **Partner integrations** — partners (Stripe, Apollo, Crossmint) get a dedicated channel to flag platform changes that affect their integration.
- **Regulator input** — direct intake for regulators who want to flag enforcement priorities. Becomes a constraint module input.
- **Independent researchers** — security disclosures get a structured intake with bounty tiers (when established).
- **Other LLMs** — `/llms.txt` and `/llms-full.txt` invite other AI systems to ingest our docs and link back. We treat this as outside input too — when ChatGPT cites us correctly, that is signal.

### 11.7 Self-learning across the platform

- **Alex retrieval misses** — every time Alex doesn't have a doc to cite, that is auto-logged as `doc_gap`. The thing that surfaces gaps writes the gaps.
- **Worker output ratings** — workers with sustained low ratings get flagged for revision; creators see the signal.
- **RAAS rule fire rates** — if a constraint rule fires unusually often (or never), that is a signal the rule is mis-tuned. Surfaces in the constraint module dashboard.
- **Failed publishes** — every pre-publish constraint check rejection is studied. If many users hit the same rejection, the worker prompt or the rule may need adjustment.
- **Search queries with no clicks** — surfaced as a content gap.
- **Drop-off in onboarding** — surfaced as a UX gap.

### 11.8 Privacy of feedback

- Feedback is private to TitleApp AI by default. Aggregates may be published; individual submissions never.
- Users can mark a submission "public" if they want it visible in a community board.
- Users can withdraw a submission at any time.
- No feedback content is used to train external AI models.

### 11.9 Why this is a moat

- Network effect: every user makes the platform smarter for every other user.
- Compounding accuracy: workers get better answers, RAAS modules get tighter rules, docs get more comprehensive — automatically over time.
- Trust signal: a platform that treats feedback as fuel signals to regulated industries that it takes correctness seriously.
- Hard to copy: requires the audit-trail backbone, the structured Improvement Request schema, the doc-Alex retrieval link, and the discipline to actually act on submissions.

### 11.10 Roadmap

- **v0 (now)**: per-message feedback ✅ shipped, Improvement Request surface ✅ shipped.
- **v0.5 (pre-launch)**: doc-feedback widget, "Suggest a worker" form, status-update notifications.
- **v1 (post-launch)**: Triage Worker (auto-routes submissions), Docs Worker (drafts doc updates from doc_gap submissions), public change-log with contributor credits.
- **v2**: community-vote queue for worker requests and rule suggestions, public quarterly improvement report, contributor leaderboard.

---

## Cross-Cutting Requirements (every page)

- Canonical URL plus Open Graph card plus JSON-LD `Article` schema.
- Last-updated timestamp (auto-pulled from git).
- "Edit on GitHub" link (proves we are real, drives community contribution).
- "Was this helpful?" widget → writes to `improvementRequests` with `type: doc_feedback`.
- "Ask Alex about this" button → opens chat with page context preloaded.
- Plain-text export at `/path.md` alongside `/path.html` (LLM-friendly).
- Section anchor links for Alex deep-citations.
- Glossary tooltips on first use of each coined term.

---

## SEO + LLM-Ingestion Infrastructure

- `/llms.txt` at root (emerging standard, Cursor and Perplexity already use it).
- `/llms-full.txt` with all docs concatenated (for one-shot LLM ingestion).
- `sitemap.xml` auto-generated.
- RSS feed for change log.
- OpenGraph cards per page.
- JSON-LD structured data: `Article`, `DefinedTerm`, `FAQPage`, `Product`.
- No JavaScript-required content.
- All pages crawlable without auth.

---

## What to Write FIRST (priority order)

These pages earn the most leverage per word:

1. **What is RAAS** — own the category before anyone else does.
2. **What is a Digital Worker** — own this term too.
3. **What makes TitleApp AI different** — top-of-funnel conversion.
4. **Anyone Can Build a Digital Worker** (Section 7.0) — the accessibility moat in writing. Pairs with #2 and #3 to define the platform.
5. **Build Without Code** (Section 2.8) — pillar page, sibling to the RAAS Explained page.
6. **The Vault** — answers the #1 trust question (where does my data go?).
7. **Pricing Tiers + Credits** — pre-empts every billing question.
8. **The Blockchain Audit Trail** — investor and partner credibility.
9. **The Improvement Loop** (Section 11.1–11.6) — names the self-learning moat.
10. **Glossary** — meta-page that anchors every other page.

Everything else can wait two weeks. These ten pages get us indexed, ranked, credible, and frame the platform widely enough that no audience reads us as "regulated industries only."

---

## How This Connects to Help Desk

- Every doc page is a help desk article. When a user asks Alex a question, Alex retrieves the matching doc section and cites it.
- Every Improvement Request with `type: doc_gap` gets routed to a Docs Worker (build post-launch) that drafts an update.
- Per-message feedback with low ratings on Alex answers triggers "did Alex have a doc to cite?" — if no, that's a doc gap auto-logged.
- Three feedback loops feed the docs: user thumbs-down, Alex retrieval miss, and Improvement Request submissions. The thing that surfaces gaps writes the gaps.

This is the Marketing worker's first real job. Once we ship Astro and authenticate the first content workflow, TitleApp AI's own docs become the dogfood test of "can the Marketing worker run TitleApp AI's launch?"

---

## Sequencing Recommendation

- **Tonight (post-testing):** save this outline so it is living, not lost.
- **Pre-launch week 1:** draft the seven priority pages above (~6,000 words total, half-day with the Marketing worker if it works).
- **Launch week:** ship Astro site (P0-9, P0-10) with the seven pages plus skeleton stubs for everything else.
- **Launch +2 weeks:** fill in vertical pages, add screenshots.
- **Launch +4 weeks:** v1 with video walkthroughs on top three pages.
- **Ongoing:** Marketing worker plus Docs Worker maintain it; you review.

---

## Open Questions

1. Domain choice: `docs.titleapp.ai` (subdomain) vs `titleapp.ai/docs` (subdirectory)? Subdirectory wins for SEO juice consolidation; subdomain wins for separation of concerns.
2. CMS layer: keep markdown-in-git as source of truth (recommended), or add a headless CMS (Sanity/Contentful) for non-engineering edits?
3. Authoring workflow: who writes v0.1 — Sean directly, the Marketing worker once verified, or both?
4. Localization: English-only at launch, or build with i18n hooks from day one?
5. Comments/community: enable them on docs pages (Discourse, Giscus) or keep one-way for v0?
