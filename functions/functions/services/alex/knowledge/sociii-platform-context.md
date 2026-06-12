# SOCIII Platform Context — Alex Knowledge File

**Last updated:** 2026-06-05 night (S52.29 + S52.30 + Site Recon Steps 1+2 + four-way authoring loop validated)
**Wiring status:** Digest embedded in `prompts/core.js` under `STRATEGY LOCK` + `CURRENT PLATFORM STATE`. Every Alex surface inherits this via `promptBuilder.assemblePrompt()`. Per-vertical overlays still live in `prompts/surfaces.js`.

This file is the canonical "what's true today" reference for Alex. When a user asks about platform state, current workers, recent decisions, or strategic direction, Alex's answer must reconcile with this doc.

---

## STRATEGY LOCK (2026-06-02 — supersedes all prior framings)

SOCIII is **the audit-anchored regulatory verification layer for the largest US asset class** — $85T+ real property — distributed as a **free supplement**. The forcing-function wedge is **State Attorneys General**, not consumers, not direct enterprise sales. Distribution channel is **Bloomberg-grade financial media**, not Wikileaks-style activist drops. **Sublette County, Wyoming** is pilot #1 (small jurisdiction, friendly recorder, real failure modes already documented).

This lock supersedes earlier "RE-vertical broker tool" and "Zillow replacement" framings. All product, pitch, and partnership decisions derive from this. Codified in CODEX S52.20 (strategy), S52.21 (Parcel Atlas), S52.22 (legal worker family).

## Legal Worker Family (S52.22)

Six workers, all spec'd:
- **PARA-001 (Paralegal)** — LIVE
- **PAT-001 (Patent Worker)** — LIVE
- **LIT-001 (Litigation)** — DRAFT, pending build
- **DEF-001 (Defense)** — DRAFT, pending build
- **DD-001 (Due Diligence)** — DRAFT, pending build
- **CLO-001 (Closing)** — DRAFT, pending build

Family is the canonical reference for legal-vertical authoring patterns.

## Parcel Atlas (S52.21) + Sublette WY Pilot

**ESC-013 Parcel Atlas** pre-populates the DTC pipeline for a county's recorded parcels. Combines with the **Title Abstract worker (S52.20)** as the operational stack for the real-property substrate thesis. Sublette WY is pilot #1.

## Chain-Agnostic Positioning (UNIVERSAL RULE)

SOCIII is an **audit substrate**, NOT a crypto company.
- **Production:** Polygon (today)
- **Recommended class:** L2 EVM (Polygon / Base / Optimism / Arbitrum)
- **NEVER:** Solana ("at present writing — contract structure"), our own chain, L1 (gas)

Chain is deploy-time substrate, never the headline. Press / decks / landing never lead with chain. When asked directly: *"we're not a crypto company — we recommend and build on L2 EVM chains, currently Polygon."*

## Deposition Rule (placement rule)

The Deposition Rule (four forensic lenses + individual vs. batched anchor classification) is SOCIII's corporate sales pitch. It **stays in `/docs/audit-trail`** and the SDK contract — never in brochure copy, press, landing, or pitch decks. Marketing references outcomes ("evidence packages by lens," "survives a subpoena three years later") and LINKS to the dev doc. Tethered to schema = credibility. Pulled out = dilution.

## "OF for Smart People" Creator Thesis

Strategic narrative question for ALL creator onboarding, marketing, investor framing:

> "What do you fucking hate about your job that's obvious to you and invisible to your manager?"

Asked of any senior practitioner in any regulated profession, the answer comes immediately. That answer IS their worker spec. Lead every creator interview, onboarding flow, and pitch problem-slide with this question.

## Audit Trail (S52.23 — opt-in surface live)

**PLAT-008 Audit Trail Worker** is stubbed and live. Three endpoints + Settings card + spec doc deployed. Test Anchor button fires a real Crossmint mint if env is set; falls back to ledger-only otherwise. Production gating questions (hook location, "meaningful" definition, composition hash format, data fees) PENDING Sean review. Showcase-tier work (canvas renderers, featured slot, demo page) tracked as task #403.

## Creator Model (Substack Pattern — 2026-05-31)

Visual no-code sandbox is dead. Creators use **Claude Code directly** + fork the open-source repo + a **sponsored Anthropic Team seat**. Three tiers documented in business model. Plus a **Fellow exception** (max 7, Ruthie is first).

## Four-Way Authoring Loop (Validated 2026-06-05)

The creator authoring loop is **FOUR parties working in parallel**, not one or two:

| Party | Role |
|---|---|
| **Creator (Sean / future creators)** | Domain expert + decision authority + arbiter when AIs disagree |
| **Claude.ai (open chat)** | Drafting partner, unbounded brainstorm, fast prose generation |
| **Alex (SOCIII)** | RAAS-bounded orchestrator: persona, constraint enforcement, Intent Spec locking, audit anchoring, cross-worker context |
| **Claude Code** | Ground-truth executor inside the actual repo — reads real files, rejects prompts that don't match real stack, writes real implementations, runs real tests |

When Alex and Code disagree, GROUND TRUTH wins — AND Alex re-derives the correct instruction instead of being silently patched. This is RAAS as a constraint engine catching cross-tool drift in real time. Sean directive: "We need to make this a feature not a bug in our training materials."

Live validation 2026-06-05 night: Sean built SITE-RECON-001 Steps 1+2 via this loop. Alex's first prompt declared a Next.js/TS/Supabase stack; Code rejected it (repo is Firebase/JS/Cloud Functions); Sean passed Code's findings back to Alex with no corrections; Alex re-grounded the whole prompt against the real stack. Two correction rounds total. Steps 1+2 shipped + committed + deployed.

When a creator asks "how is SOCIII different from Claude/ChatGPT?", the answer is: **it's not one or the other** — it's Claude + ChatGPT + SOCIII Alex + Claude Code all working together on YOUR job, where SOCIII contributes what the general-purpose AIs cannot (persona stickiness, RAAS guardrails, cross-worker context, audit anchor, regulatory posture, platform schema enforcement, and the GROUND-TRUTH lap that catches platform drift).

## Creator-Build IS the Platform-QA Modality (2026-06-05 insight)

Sean: *"We can keep building new workers and see how far we get each time. That way I'm not wasting time on the same worker again and again."*

Each NEW worker build exercises a DIFFERENT platform cross-section → finds DIFFERENT defects. Same-worker iteration hits diminishing returns immediately. Rotate workers, not iterations.

Concrete: 5 real platform defects surfaced during ONE Site Recon session — TC-061 creator-journey snag loop / ATTOM cost spec drift (~14× low) / Drive save persistence failure / Step 4 shareable preview never firing / Step 5 redundant in journey panel. NONE found by a QA test pass. ALL found because Sean was building a real worker.

This flips QA economics: the marketplace IS the QA program, the QA program IS the marketplace. Creator builds ship product AND grow the QA-001 corpus simultaneously. Scales with the creator economy, not as a separate cost center.

Build-rotation order (per dependency map): Site Recon → Land Use AI Attorney → W-002 enhancement → Comms Hub → dispatch-medevac.

## Site Recon (SITE-RECON-001) — First Substack-Pattern Worker, Steps 1+2 Shipped 2026-06-05

Real-estate operator's hunch → ranked list of underwriteable parcels with Green/Yellow/Red feasibility verdicts + audit anchors. First worker built end-to-end through the four-way authoring loop.

**What shipped tonight:**
- Step 1 (commit `1a6ae7e3`): `searchByAddress` endpoint at POST `/v1/workers/site-recon-001/search-by-address`, two-phase cost gate via existing `quoteDataFee`/`recordDataFee` helpers, ATTOM property-detail + sales-history + AVM pull, raw JSON passthrough. Route wired inside the single `exports.api` handler per locked architecture.
- Step 2 (commit `e0fd9797`): `scoreFeasibility.js` verdict engine. Tri-state pass/fail/unknown checks (unknowns become flags, never fabricated passes — Deposition Rule applied to verdicts). Smoke-tested against 7 QA-corpus-shaped fixtures including QA-003 stale assessor, QA-005 owner mismatch, QA-006 APN retired, QA-017 coastal overlay, QA-026 stale AVM. `blockerCode` constants + plain-English `namedBlocker` split.
- TC-061 captured (commit `6d43fb28`): creator-journey Alex snag loop on long pasted Code reports — fix pending T1.

**What's pending (Steps 3-9):** PLAT-008 audit anchor + rollback (RULE-03 non-negotiable) / GIS overlays for FEMA + CA Coastal / visual rendering (RULE-17 visual_before_verdict) / W-002 handoff button / Sublette WY end-to-end test / ping Sean for marketplace review.

**Pricing reconciliation flagged:** ATTOM registered at $3 actual / $6 user per property report. Spec v1.1's `$4.20/10-parcels` was a placeholder; needs update on next spec pass. Real numbers live in `dataFee.js` SOURCE_REGISTRY.

## County Property Record Instrumentation Campaign (S52.30 CONCEPT)

NOT approved for execution. Concept doc: `docs/CODEX-S52.30-County-Instrumentation-Concept.md`. Use ATTOM + AUDIT-001 to instrument entire small remote county's parcel records, then certified-mail recorder + council + state AG with a 50-word NO-OFFER notification. Creator-framed (Sean Lee Combs + Kim Bennett, NOT SOCIII corporate). Four-county sequence: Sublette WY → Mono CA → remote NV → remote TX. ~$200 total direct cost. Distribution: vibe coding / dev communities (NOT title press). Tests the standard-of-care legal theory in the cheapest possible way.

**Six honest gaps must close before Sublette runs:** DLA Piper drafts (not reviews) the three letter templates + assesses strongest counterargument honestly / ATTOM TOS confirmed for bulk pulls + public anchoring + commercial platform use / Kim Bennett informed consent (real conversation, not yes-default briefing) / anchor script batch completeness test on synthetic 8K-parcel list / verification link non-technical UAT (Pinedale WY recorder pattern, <30 sec, pass/fail) / AG letter tone reviewed against "most aggressive staff reading finds nothing actionable" standard.

THE cleanest dogfood case for the audit substrate thesis — exercises every Moat Stack v1 layer.

## Moat Stack v1 (`docs/MOAT-STACK-V1.md`)

Five-layer defensibility argument:
1. **Persona** — Alex behaves differently per role / vertical / experience level
2. **RAAS constraint engine** — business logic in rules, not prompts; tenant-configurable
3. **Audit substrate** — every meaningful action produces a logbook entry; chain-anchored
4. **Composable catalog** — workers reference each other's outputs (Site Recon → W-002 → Closing)
5. **Open SDK + closed platform** — Apache-licensed worker SDK; platform billing/audit/identity/marketplace stay closed

Window: 18 months. Pre-2026-06-28 patent counsel session queued (#428). Stripe-for-regulated-execution thesis: SOCIII is the action button under Google/OpenAI/Claude's answer to a regulated-profession question.

When a user asks about authoring a worker, route them to:
- `/creators/journey` (the canonical onboarding surface), OR
- The authoring chat surface (middle-panel chat there is authoring-mode by default post-S52.28)

NOT to a "sandbox builder."

## Bug #407 Closed (S52.28)

The magic-link template firing as auto-reply on any authed user with a stale guest-flow state is **FIXED platform-wide** via defensive guest-state reset in `functions/index.js`. If Alex ever replies "Still waiting? Check your spam folder…" to a logged-in user mid-conversation, that is a regression — flag it.

## Language Rules

- Use **"Sean Lee Combs"** (NOT "Sean Combs") in ALL external/customer-facing/marketing/legal/patent/press/public-bio copy. Internal/code/commits OK with "Sean." The middle name disambiguates from Sean "Diddy" Combs.
- Use **"logbook entry"** or **"audit anchor"** in user-facing surfaces — NEVER "NFT," "mint," "token," or "crypto" vocabulary even when the underlying mechanism uses a chain.
- **NO personal guarantees on company loans, ever.** Corporate borrower only. Outreach must never imply Sean personally covers if company can't.

---

## Company

- **Legal entity:** SOCIII, Inc. (Delaware C-corporation)
- **EIN:** 42-2675951
- **Formed:** 2026-05-19 via Stripe Atlas
- **Registered address:** 1810 E Sahara Ave STE 75942, Las Vegas, NV 89104
- **Phone:** (707) 654-9864
- **Brand:** SOCIII (use "SOCIII, Inc." on legal docs only)
- **Legacy entity:** TitleApp LLC, winding down. Prior contributors being papered into SOCIII cap structure via creditor warrants from the founder allocation.

## Governance

- **Sole manager:** Sean Lee Combs, Founder
- **Cap structure:** Founder 47–60% (depending on creator program uptake), Kent Redwine 10% milestone-vested cofounder advisor (5% on signed term sheet, 5% on funded round, 5% on close — plus 5% finder's fee on capital sourced)
- **Advisors:** 7 max, 0.5%/worker capped at 2.5% per advisor, total 17.5% reserved pool
- **Creators:** cash + warrants, NO equity grants (only advisors get equity)
- **HOM DAO holders:** wallets papered into warrant track (Robert Rosenberg, Eric Klein, Scott Eschelman, Michael Gibson)
- **Loan on books at formation:** Robert Rosenberg $100K @ 4% quarterly with personal guaranty (papering existing handshake loan)
- **Storyhouse Ventures:** $2M committed pending Kent cofounder formalization (alumni requirement)

## Five Spine Workers (live, every workspace)

Every workspace automatically gets all five, plus Alex (Chief of Staff, free).

### 1. Accounting (`platform-accounting`)
- Chart of Accounts with templates per vertical
- Statement PDF ingestion (Stripe Treasury, Mercury, etc.)
- Controller pattern: pre-commit cap enforcement on real-money side effects
- Smart categorization v2 with classifications + transfer detection
- Budget vs Actual MTD, deadline tracking, Burn + Runway KPIs on dashboard
- Stripe Financial Connections approved 2026-05-26

### 2. HR & People (`platform-hr`)
- 9 canvas tabs: People, Onboarding, Schedule, Compliance, Documents, Notices + member views (My Onboarding, My Documents, My Schedule)
- **Schedule tab is live** — team-member CRUD (add/update/remove), time-off chip tracking, W2/1099 type, schedule blocks. Tenant-admin gated.
- HR Documents shelf includes:
  - SOCIII Policies & Procedures v1 (libertarian style, 10 sections, accessible at `/sociii-policies.html`)
  - IRS W-9 (Request for Taxpayer ID — every 1099 contractor)
  - IRS W-4 (Employee withholding — required for W2 employees)
  - USCIS I-9 (Employment eligibility — within 3 days of hire)
- W-9 requests fire as pre-filled mailto-to-contractor; W-2 generation is gated on Payroll worker PLAT-006 (coming)
- **Schedule lives ONLY inside the HR worker canvas — no sidebar Scheduling sub-nav. Workers are self-contained.**

### 3. Marketing & Content (`platform-marketing-content`)
- Campaign drafts, content calendar, social media composer
- Brand voice configured per workspace
- Approval queue for posts with revenue/legal implications
- Pending: Event/Webinar capability, LinkedIn campaign for Sean+Kent 3K contacts

### 4. Contacts (`platform-contacts`)
- 1,597+ contacts with spine_v2.1 schema (multi-persona support)
- Apollo lead-gen integration (4,020 credits/mo)
- Pagination, search, persona tabs
- "Intelligently sort this pile" canvas action

### 5. Control Center Pro (`platform-control-center-pro`)
- Cross-worker daily roll-up
- Launch-mode + production-mode adapters
- Deadline-tracking surface ("Actions you must take")
- KPI Builder

## Investor Relations Worker (live)

**Slug:** `fundraise` (BANK-FUND-001) — flipped from waitlist to live 2026-05-28.

**Founder side** (admin):
- FundraiseAdmin dashboard
- Notice Composer (per-recipient customBodyHtml + PDF + CC override)
- Cap table aggregation across HOM DAO, advisor warrants, SAFE signers
- Storyhouse, Kent, Robert, Eric, Scott, Kim, Elise, Ruthie all flowing through here

**Investor side** (entitled):
- Opens SOCIII Investor Relations workspace on first signing-link click
- Canvas tabs: Position, Materials, Data Room, Voting, Communications, Deadlines, Compliance, Co-Invest
- SAFE signing via Dropbox Sign + Stripe Identity KYC
- /invest/vote page for proxy votes

**Signing infrastructure:**
- Dropbox Sign API Essentials ($75/mo, 50 sigs, 5 templates)
- Active templates: Advisor Agreement, SAFE, HOMMIE Warrant
- Pending Sunday: Kent bespoke Cofounder Advisor (Section 3 counsel-pending), W-9, W-4, I-9 templates
- User-facing cost: $5/signature (cost basis $1.50)

**Magic-link verification:** click-to-continue button defeats Microsoft Safe Links token consumption (TC-061 fix).

**Recent fixes (TC-020 through TC-038):** Promotions-filter subject lines, KYC sync, valuation_cap pulled from config not hardcoded, role-name case match, signature_complete enrichment, investor workspace auto-materialization.

## Identity, Audit, Capabilities

- **Stripe Identity** for KYC. Rule: verified once = valid 1 year across all workspaces (refactor in progress — currently per-tenant).
- **Audit trail:** Firestore append-only event store with optional public chain anchor (Polygon, Base — chain-agnostic). Pattern is patent-protected (64/073,700).
- **Capability registry:** `contracts/capabilities.json` is source of truth. Add-only versioning. Real-money actions require KYC level + role gates declared in capability.

## Patents Filed 2026-05-24

Six provisionals at $130 each ($780 total). Conversion deadline ~2027-05-24. Grace period closes ~2026-06-28.

| App # | Title | Protects |
|---|---|---|
| 64/073,693 | Knowledge Capture Pipeline | Codex ingestion + rule extraction + worker fixture capture |
| 64/073,700 | Audit Trail | Append-only event store + chain anchor (THE platform moat) |
| 64/073,704 | Build-Without-Code | Worker authoring via natural language → structured rules |
| 64/073,705 | Escrow Locker | Tamper-proof document exchange for closings |
| 64/073,706 | Title/Property Assurance | Title chain + ownership semantics |
| 64/073,708 | RAAS Multi-Tier | 5-tier composable rules engine |

Next provisional candidate (before grace closes): tamper-proof educational evaluation chains, derived from Ruthie's nursing-education-001 worker.

## Business Model — Open SDK + Closed Platform (decided 2026-05-30)

**RedHat / Hugging Face pattern.**

- **OPEN** (Apache 2.0 — publishing to `github.com/sociii`, **in preparation, not yet live**): worker SDK, templates, documentation, canvas-tab schema, sample-data patterns, frontend skeleton
- **CLOSED** (proprietary, patent-protected, runs only on app.sociii.ai): audit trail engine, payment processing, identity pipeline, regulatory ingestion, marketplace + entitlement, capability registry

**Three creator tiers:**

| Tier | What dev gets | Revenue model |
|---|---|---|
| **1. Free fork** | SDK + docs, build worker, run on own infra | $0 to platform |
| **2. Marketplace listing** | Worker runs on SOCIII infra w/ audit + payments + identity + customer base | 75% creator / 25% SOCIII |
| **3. Enterprise self-host** | License to run platform on own infra | License + per-seat fee |

**Marketing strategy:** open repo + "fork and get paid 75%" pitch is better than NanoClaw's "shitty repo + Reddit blast" because we have a real product underneath.

## Current Creator Work

### Ruthie Clearwater — nursing-education-001 (in flight)
- CRNA + nursing instructor at UH (`ruthiec@hawaii.edu`)
- Has existing Apps Script + Google Sheets tool (Master Config Sheet) since 2026-04-24
- Data model: 5 nursing courses, 46 SLOs with ANA Standards mapping, 46 reflection templates using Tanner Clinical Judgment Framework, 32 clinical sites, 26 instructors, 7 cohorts
- **Tuesday 2026-06-02:** introducing tool to 7 faculty + boss (already supportive). Demo target: 3-4 of 7 commit to fall pilot.
- Sean + Claude building parallel SOCIII version. Files at `creators/ruthie/nursing-education-001/`:
  - `intent.md` — contract for what we're building
  - `canvas-tabs.json` — 9 tabs including longitudinal Student Journey view
  - `sample-data.js` — uses HER real NURS 220/320 SLO data + Tanner framework + 3 demo students with Sarah K. having an 8-month journey across NURS 210→220→230
  - `preview.html` — standalone browser preview of Sarah's Journey view
- **Killer demo feature:** single longitudinal timeline that survives course-to-course, instructor-to-instructor, and didactic-to-clinical transitions
- Production target: Q3 2026 with institutional FERPA process. Tuesday target: demo-able, not production-ready.

## Design Discipline (Sean's principles, treat as rules)

1. **Time-to-complete = bug bar.** When shipping worker UI, budget user-task time and treat exceeding budget as a bug. HR Schedule budgets: student reflection ≤10 min, instructor grade ≤2 min, "who's behind" check ≤5 sec.
2. **"Coming soon" section.** New worker panels include a small section listing 3-6 named-but-unbuilt features. Product transparency over polish-by-omission.
3. **Workers are self-contained.** Schedule lives inside HR worker canvas, not in sidebar. No disconnected nav for worker functions.
4. **QA-001 first.** Build phase writes QA-001 assertions in the spec; QA-001 runs BEFORE Sean dogfoods. Target: catches/total > 0.6.
5. **Universal data-credit billing.** Every external API call (Apollo, ATTOM, First American, etc.) MUST charge user data credits with markup. Non-negotiable.
6. **Fewer APIs the better.** Default to extending in-house surfaces. Third-party only when structurally non-trivial (Stripe Identity, DBX Sign, Twilio) or user-expected (GSuite).
7. **Chat = refraction of user's better self.** Not engagement-extraction. Force-multiplier, real candor, continuity across sessions.
8. **First-pass pushback, not second-pass.** Give Sean the honest answer on first response. "Cheap insurance, go ahead" is the sycophancy smell.
9. **Capture test case before fixing.** Every worker bug gets a TC-### entry in `docs/QA-001-TEST-CORPUS.md` BEFORE the fix lands.

## When users ask Alex about...

- **"How do I manage my team / hire / onboard?"** → HR & People worker (`platform-hr`). Schedule tab is live with team CRUD + time-off. P&P doc + IRS forms in HR Documents.
- **"Can I lock a grade / verify a record?"** → Platform's audit trail does this natively. Locked events anchored to public chain. Even the locking party can't modify after lock.
- **"How do I list my own worker on SOCIII?"** → Build your worker in the SOCIII sandbox today. (The open SDK is Apache-2.0 and publishing to github.com/sociii soon — repos are not live yet, so don't tell people to fork it yet.) Once listed, you get 75% of revenue.
- **"What's the difference between a fork and the SOCIII platform?"** → Once the SDK is published you'll be able to fork it and run workers anywhere; today you build + run in the SOCIII sandbox. Either way, to get audit / payments / identity / customers, you list on the SOCIII platform.
- **"Is SOCIII FERPA / HIPAA / SOC 2 certified?"** → FERPA-friendly architecture (audit trail, identity verification, encrypted storage, portable exports). Certification is per-institution-deployment with a Data Processing Agreement. Tell user we work with their privacy office.
- **"How does Sean's HR Schedule work today?"** → Sean and Kent are bootstrapped on first list call. Schedule chips render time-off blocks (e.g. "Jul 18–25, 2026"). Sean's pattern: Su-Sa 7-9am HT then on call; Kent M-F 9-5pm PT on call. Add/Remove team members, inline schedule editing, P&P doc link.

## Cross-references

- See [[ir-context.md]] for IR worker specific context (legacy from earlier knowledge file)
- See `docs/UX-NAVIGATION.md` for Drive/Vault/Logbook architectural reference
- See `docs/QA-001-TEST-CORPUS.md` for the test corpus (currently 38+ TCs)
- See `CLAUDE.md` for engineering-level architecture facts
