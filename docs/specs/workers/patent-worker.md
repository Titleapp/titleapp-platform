# Patent Worker — Scaffold Spec

**Catalog slug (provisional):** `platform-patent` or `legal-patent-001`
**Vertical:** Platform (cross-vertical) OR Law (when the law-worker scaffolding ships)
**Pricing tier:** $79/mo (Tier 3)
**Status:** Scaffold — not yet built
**Origin:** Sean's directive 2026-05-22 — *"As we go through this effort we should be using this experience to build a patent worker. Help people build up patents, make applications, and follow through and make sure they mature the patent process."*

---

## What This Worker Does

The Patent Worker is the SOCIII platform's first end-to-end IP management worker. It helps individual inventors and early-stage founders identify patentable inventions in their ongoing work, draft provisional patent applications, manage USPTO EFS-Web filing logistics, track conversion deadlines, handle prosecution responses, and maintain a patent family with consistent citation patterns.

The seed data for this worker is Sean's own May–June 2026 patent filing cycle — every draft Sean produces becomes a training fixture for the worker's draft-generation capability.

---

## The Six Core Capabilities

### 1. Invention Identification (passive, conversational)

The worker observes ongoing user activity (chat conversations, codex documents, code commits) and surfaces potentially patentable inventions the user may not have flagged. Operates via:
- Keyword pattern matching against patent-eligible subject matter (novel system architectures, novel methods, novel compositions of matter)
- Semantic analysis identifying repeated structural insights ("you've described this same pattern in three different conversations — is this a patentable architecture?")
- Cross-reference with the user's existing patent family + active drafts to avoid duplicate flagging

Output: a "Patent Candidates" inbox the user reviews periodically. Each candidate has a short summary + the source context (which conversation, which file).

### 2. Provisional Drafting

Given a description of the invention (in conversational form OR as a structured prompt), the worker generates a complete provisional patent specification with:
- Field of the Invention
- Background (with the canonical "continuous invention thread" paragraph if the user has prior filings)
- Summary of the Invention
- Detailed Description of Embodiments
- Brief Description of the Drawings
- Claims (independent + dependent, numbered)
- Abstract (under 150 words per USPTO requirement)
- Inventorship + Assignment notes

The worker uses the Sean May-2026 filings as reference fixtures. Style is investor-conservative, broad-but-defensible claim language, with prior-art citations woven in.

### 3. USPTO Patent Center Filing Logistics

Step-by-step guidance through the USPTO Patent Center submission flow:
- Entity status determination (micro / small / large)
- Fee calculation per filing
- Required attachments (specification DOCX or PDF, drawings, cover sheet, fee transmittal, IP assignment)
- USPTO.gov account setup if user doesn't have one
- ePAS payment configuration
- Post-filing receipt storage + filing number capture

Worker doesn't actually submit (humans hit submit + pay); worker prepares everything and tells the user exactly what to click.

**Pre-filing identity gauntlet — the worker MUST hand-hold through these or the user gives up:**

The reality observed during the inventor's own 2026-05-25 filing session (~25 min just to reach the workbench):
1. **MyUSPTO ≠ Patent Center.** Users with USPTO.gov accounts repeatedly hit a "sign-in doom loop" on patentcenter.uspto.gov because Patent Center requires a separate enrollment beyond MyUSPTO credentials. Worker must surface this distinction at the very start: *"You'll need to enroll separately for Patent Center on top of your USPTO.gov account. Plan 15-20 minutes for first-time setup."*
2. **ID.me ↔ USPTO sync is a hidden prerequisite.** If the user already has ID.me (most do, courtesy of IRS / FAA / VA / state DMVs), it still must be **explicitly linked** to the USPTO.gov account via account settings → "Verify with ID.me." Worker should detect this state and walk the user through linking before they ever attempt Patent Center login.
3. **Customer Number confusion.** Patent Center's self-enrollment dialog asks for a "Customer Number" with confusing "Verify customer by" dropdown. Pro se inventors don't have one. Worker must explain: *"Customer Numbers are a frequent-filer convenience identifier used by law firms — not related to your prior patents. Pick 'I don't have a customer number' from the dropdown, or use the self-service Create Customer Number flow."*
4. **Submission-type confusion at filing time.** The "File new submission" page shows "Utility Nonprovisional" prominently above "Utility Provisional" — first-time inventors filing provisionals will mis-click without clear guidance. Worker must remind them at this exact step: *"You're filing a Utility Provisional under 35 USC § 111(b). Click the SECOND link, not the first. Nonprovisional is the $300+ full application; provisional is the $120 placeholder you want."*

Worker should produce a "Pre-flight checklist" before any user attempts their first filing, covering all four of the above. After the first successful filing, the worker remembers the user is enrolled and skips the gauntlet on subsequent filings.

**Live-filing gauntlet — fail modes observed during the inventor's own 2026-05-25 session that the worker MUST pre-empt:**

5. **File-format whiplash during upload.** Patent Center's published accepted formats are `.pdf, .txt, .docx, .xml, .zip` — but in practice **DOCX is unreliable** (the system silently rejected the inventor's DOCX with "fonts that are not recognized") and **PNG is rejected outright** even though USPTO public guidance lists PNG as an acceptable drawing format. Worker must pre-render every upload as PDF before the user touches Patent Center: specifications as PDF, drawings combined into a single PDF (one figure per page, US Letter portrait).

6. **Page-size silent rejection.** When converting DOCX → PDF via Pages.app or Word, the export preserves the source document's page size. The inventor's DOCX templates were ~8.5" × 9.89" (a non-standard size), so the exported PDFs were rejected by Patent Center at the Review step: *"The PDF must be A4 portrait or 8.5 inches by 11 inches."* The fix is to either (a) force the source template to US Letter before export, or (b) post-process the resulting PDF to repaginate the MediaBox to 612 × 792 points with content translated to sit at the top. Worker's PDF generation must enforce US Letter portrait at the rendering stage — never trust the source format.

7. **Session timeout with no autosave warning — catastrophic data loss.** Patent Center sessions expire silently. The inventor took a phone call mid-filing and returned to find the entire Filing #01 submission (cover sheet, Web ADS, document uploads — ~35 minutes of work) wiped. There IS a "Save progress" button at the bottom of each section, but it is unstyled, easy to miss, and the system shows no idle warning before timeout. Worker must: (a) instruct the user to click "Save progress" after every section, (b) for filings beyond the first, pre-generate a clean stand-alone ADS PDF (PTO/AIA/14 or PTO/SB/16) locally so the Web ADS section can be skipped entirely on subsequent filings by uploading the pre-built ADS as the cover sheet, and (c) recommend completing each filing in one uninterrupted ~25 min sitting — never start unless the user can finish.

8. **Fee schedule drift.** USPTO fee tables in published guides go stale fast. The inventor's checklist documented $120 for small-entity provisional (fee code 2005); the actual fee at filing time was $130 (a recent bump). Worker must always pull the live fee schedule via `data.uspto.gov` rather than relying on cached values, and surface a "Fee changed since this draft was prepared" warning when the deltas don't match.

9. **Entity status silently reverts between filings.** Even when the first filing in a session is set to "Small" entity, Patent Center defaults each new application back to "Regular Undiscounted" — fee code 1005 at $325 instead of code 2005 at $130. This $195 per-filing delta would be invisible on a fee page unless the user knows to look. **Patent Worker must verify Small entity status on every Application Data section before reaching Calculate Fees, and warn loudly when fee code is anything other than 2005.**

The Patent Worker should treat Patent Center as a hostile UX environment — pre-stage everything possible offline (PDFs in correct size/format, ADS pre-rendered, fees verified live), then walk the user through Patent Center in tight ~25-min sessions with explicit "click Save progress now" prompts after every section.

### 4. Calendar & Deadline Management

Critical patent-process deadlines auto-populated to the user's calendar (via Google Calendar connector, V1 already shipped):
- 12-month conversion deadline (provisional → nonprovisional OR PCT)
- 60-day prep window opening (8 weeks before conversion)
- Grace period closures (35 USC 102(b)(1)) for inventor's own prior disclosures
- Office action response deadlines (when nonprovisional is in prosecution)
- Maintenance fee deadlines (3.5 / 7.5 / 11.5 years post-grant)

Each deadline gets a Control Center alert at T-30, T-14, T-3.

### 5. Patent Family Management

For users with multiple filings (Sean is the prototype: 5 drafts in the May-June 2026 cycle, ~10 expected by 2028):
- Maintain consistent prior-art citation across all filings
- Track which filings have which claims (no accidental redundancy or gaps)
- Surface cross-citation opportunities ("Filing 1 mentions audit chain, Filing 2 covers Knowledge Capture which produces audit-anchored events — explicitly cite Filing 1 in Filing 2's Background")
- Generate the canonical "continuous invention thread" paragraph for every new filing automatically

### 6. Competitive Monitoring (long-term capability)

Watch USPTO public application data for competing filings in the user's domain:
- Daily scan of new applications in the user's IPC classes
- Flag potential prior-art conflicts against pending applications
- Surface competitor filings that may affect the user's patent strategy
- Suggest defensive publication strategies for inventions the user doesn't want to patent but doesn't want a competitor to either

## 7. Post-Filing Lifecycle (Prosecution Scope)

Filing a provisional is one afternoon. The next 20 years is where the Patent Worker earns its subscription. Most pro se inventors lose patents to missed deadlines, not to bad claims. The worker's primary lifecycle responsibility is to prevent that loss.

**Receipt capture + storage discipline.** Every filing produces two artifacts the user MUST retain: the official acknowledgement receipt (with application number and confirmation number) and the payment receipt (with fee codes and amounts). Worker pulls both PDFs immediately after submission, indexes them by application number, and stores them in a dedicated "Patents Locker" inside the user's Vault. Pairs each filing record with its source spec markdown, rendered PDFs, drawings, and the conversational input that produced the draft. One canonical folder per application; one master index per family.

**Calendar surface.** Per-filing alerts populated automatically into the user's Google Calendar:
- For provisionals on the 12-month clock: T-180, T-90, T-30, T-0 alerts driving the convert/abandon/PCT decision
- For non-provisionals post-grant: maintenance fee windows at 3.5y / 7.5y / 11.5y with surcharge-window flags
- For PCT applications: 30-month national stage deadlines per designated state
- For pending applications in prosecution: office action response deadlines (3 months base, extendable to 6 with escalating fees)

Each calendar event links back to the Patents Locker entry and the relevant Control Center alert.

**Cross-reference patching.** When filing related applications, drafts frequently contain `[TO BE INSERTED]` placeholders for sibling application numbers not yet assigned at draft time. Worker tracks every such placeholder across the family graph, and once the sibling filing's application number is captured from its acknowledgement receipt, prompts the user to re-patch the source markdown and re-render the affected PDFs before non-provisional conversion. This is exactly the manual workflow Sean executed on 2026-05-24 — the worker automates it.

**Non-provisional conversion workflow.** At the 12-month mark on each provisional, worker drives the three-way decision: convert to non-provisional ($400-$1,600 small entity, claims drafting required), abandon (no action), or PCT (international placeholder). Conversion workflow covers claims drafting (independent + dependent with proper antecedent basis), declaration of inventorship, formal drawings (if upgrade required), and the IDS for any prior art surfaced during the provisional year.

**PCT decision support.** For families with international upside, worker surfaces the PCT decision matrix: which markets matter for the user's business, baseline international filing fees, designated state selection, and the 30-month national phase deadline tree. Translation costs and local-counsel requirements per jurisdiction are flagged early — most pro se inventors underestimate these.

**Office Action handling.** Worker monitors USPTO Patent Center and PAIR for office actions on the user's pending applications, calendars the 3-month response window (extendable to 6 with monthly fees), and drafts initial claim-amendment suggestions in response to § 102/§ 103/§ 112 rejections. Examiner interviews scheduled through worker when the response complexity exceeds what amendment alone resolves.

**Information Disclosure Statement (IDS) management.** Prior art the inventor learns about post-filing must be disclosed per 37 CFR 1.56. Worker tracks ongoing prior-art discoveries (from competitive monitoring, from user conversations, from sibling filings) and prompts IDS submission within the strict timing rules (3 months of awareness, before first office action, before payment of issue fee with escalating fees thereafter).

**Continuation strategy.** Before each parent application grants, worker prompts the user to consider filing a continuation to keep prosecution alive — preserving the ability to draft new claims against the same disclosure as the market and competitive landscape evolve. Divisional applications flagged when examiner issues a restriction requirement.

**Assignment + chain of title.** Worker tracks assignments on the USPTO Assignment database, flags when assignment recordation is needed (at company formation, M&A, licensing, security interest), and produces the assignment documents and cover sheets. For the SOCIII family, the initial inventor→entity assignment was executed via Stripe Atlas formation docs — worker treats this as the canonical pattern for founder/NewCo cases.

**Maintenance fees post-grant.** At 3.5, 7.5, and 11.5 years post-grant, worker drives the renewal decision per family member. Surcharge windows (6 months past due, escalating fees) tracked explicitly. Abandonment risk surfaced loudly — a single missed window forfeits the patent.

**Prior art monitoring.** Continuous scan of new publications, competitor filings, and patent litigation that touches the claim scope of every active family member. This is the year-over-year subscription value: the inventor cannot manually watch the field for 20 years, but the worker can.

**Renewal decisions.** At each maintenance window, worker presents cost/value tradeoff per family member: cost of renewal, current claim scope, competitive activity in the space, licensing or litigation history, and a recommendation. User decides; worker executes.

### USPTO Data Layer — Three Free Public APIs (confirmed by inventor 2026-05-25 during own filing session)

The Patent Worker's data layer pulls from three complementary free USPTO endpoints:

1. **USPTO Open Data Portal** (`data.uspto.gov`) — bulk patent data, filing status tracking, document downloads. Supports programmatic filing-status checks on the user's own applications (no scraping required) and bulk-archive ingestion for prior-art corpus building.

2. **PatentsView API** (`patentsview.org/api`) — analytical API with patent search, citation graphs, assignee data, inventor data. Powers the prior-art identification capability and competitive monitoring. Returns structured JSON.

3. **Patent Examination Data System / PEDS** (`peds.uspto.gov`) — examination history, office action transcripts, examiner data, average pendency by art unit, allowance rates by examiner. Powers the prosecution-response capability and helps the worker advise on examiner-specific strategies during prosecution.

Combined, these three APIs eliminate any external commercial-API spend for the Patent Worker's core capabilities. The platform incurs no data-fee markup on USPTO queries; the value-add is the worker's synthesis layer (combining queries, applying RAAS rules, presenting structured outputs), not the raw data access.

This is significant for unit economics: a $79/mo Patent Worker with no per-session data fees has near-100% gross margin on the subscription revenue. Compares favorably to vertical workers requiring paid third-party APIs (ATTOM Data for RE at ~$0.10/lookup, Bumper for auto at ~$0.20/lookup, etc.).

---

## Architecture

**Tier 0 Platform Safety rules apply universally.**

**Tier 1 Platform Ops rules:**
- Worker outputs identifying patentable subject matter must include the disclaimer *"This is a heuristic identification. Confirm with patent counsel before relying on it for filing decisions."*
- Worker drafts must include the disclaimer *"This is a draft provisional specification produced by an AI worker. Have your patent counsel review before USPTO submission."*

**Tier 2 Vertical baseline rules (Patent Practice):**
- USPTO Manual of Patent Examining Procedure (MPEP) guidance
- USPTO formal requirements (formatting, page limits, signature requirements)
- 35 USC § 101 (patentable subject matter) eligibility framework
- 35 USC § 102 (novelty) and § 103 (obviousness) standards
- 35 USC § 112 (written description, enablement, definiteness) requirements
- Jurisdictional considerations for international filings (PCT, Paris Convention, EPO, JPO, CNIPA)

**Tier 3 Workspace overlays:**
- Per-tenant patent strategy (offensive vs defensive)
- Per-tenant claim breadth preference (broad-but-risky vs narrow-but-defensible)
- Per-tenant assignee designation (inventor personal vs entity)

**Tier 4 Per-application rules:**
- Specific filing's prior-art constraints
- Specific filing's claim-set vs other family members
- Specific filing's drawings requirements

---

## Worker Fixtures (Seed Data)

The May 24, 2026 Sean filings become Phase 1 fixtures:

1. **Filing 1 — Identity-Anchored Hash-Chain Audit Trail** (~3500 words, system architecture patent)
2. **Filing 2 — Knowledge Capture Pipeline** (~3500 words, system + UX architecture)
3. **Filing D — Build-Without-Code Worker Authoring** (~2500 words, UX pattern)

Each fixture captures:
- The conversational input that led to the patent (Sean describing the invention)
- The full draft output (the patent document)
- The prior-art citations that were used and why
- The claim structure and ordering decision rationale
- The Background paragraph that establishes the continuous invention thread

Additional fixtures expected from the June 2026 filing batch (3 more) + ongoing Sean filings will enrich the worker's draft-generation capability over time.

### SOCIII Patent Family — Canonical First Filing (2026-05-24)

Sean (sole inventor) filed six USPTO provisional patent applications on 2026-05-24 through Patent Center, all assigned to SOCIII Inc. (Applicant + Assignee, executed via Stripe Atlas formation docs). This is the canonical first-filing fixture set for the Patent Worker — the complete end-to-end submission record that subsequent worker users will benchmark against.

| # | Title | App # | Confirmation # | Filed | Pages |
|---|---|---|---|---|---|
| 01 | Knowledge Capture Pipeline for Converting Human Expert Conversations into Governed AI-Powered Digital Worker | 64/073,693 | 1491 | 2026-05-24 6:05:59 PM ET | 14 spec + 3 drawings |
| 02 | Identity-Anchored Hash-Chain Audit Trail System with Version-Pinned Rule-Set Provenance, Confidential Off-Chain Payload Retention, and Chain-Agnostic Anchoring for AI-Powered Governance Decisions | 64/073,700 | 3318 | 2026-05-24 6:25:53 PM ET | 13 spec + 3 drawings |
| 03 | Build-Without-Code Worker Authoring System for Conversational AI-Mediated Specification Generation by Non-Engineer Domain Experts, with Structural Safety Properties and Multi-Stage Governance Pipeline Validation | 64/073,704 | 9350 | 2026-05-24 6:31:13 PM ET | 13 spec + 3 drawings |
| 04 | AI-Integrated Blockchain Escrow Locker System with Composed Worker Governance, Multi-Tier Compliance Enforcement, and Identity-Anchored Audit Chain | 64/073,705 | 3732 | 2026-05-24 6:35:09 PM ET | 14 spec (figures embedded) |
| 05 | Blockchain-Based Title and Property Assurance System with AI-Governed Worker Composition, Multi-Tier Compliance Rules, and Real-Time Risk Underwriting Through Composed Parent-Child Digital Title Certificate Architecture | 64/073,706 | 4515 | 2026-05-24 6:38:52 PM ET | 16 spec |
| 06 | Multi-Tier Composable Rule-Based Governance System for AI-Powered Digital Workers with Version-Pinned Audit Trail, Pre-Publish Constraint Enforcement, Regulatory Ingestion, and Identity-Anchored Hash Chain | 64/073,708 | 4113 | 2026-05-24 6:42:56 PM ET | 17 spec |

Entity status: Small. Fee per filing: $130 (code 2005). Total: $780. Cards: 2079. Correspondence: Sean Lee Combs, 1810 E Sahara Ave STE 75942, Las Vegas NV 89104. Conversion deadline: ~2027-05-24 for all six.

---

## Pricing & Economics

- **$79/month** Tier 3 platform pricing
- **3 credits per session open** (matches Accounting worker pattern)
- **Data fees:** none built-in; competitive monitoring requires USPTO PEDS API which is free
- **Creator economics if shipped via a creator partner:** standard 75% subscription / 20% inference margin to the patent attorney or IP-savvy domain expert who configures the worker

**Target buyers:**
- Solo founders building patentable IP (the Sean profile — the highest-intensity user)
- Boutique patent law firms wanting to scale their drafting capacity
- Corporate IP departments looking to standardize patent family management

**Why subscription retention compounds:** The drafting and filing capability is what gets users in the door, but the post-filing lifecycle (Section 7) is what justifies the recurring subscription. A typical patent family generates $5K-$15K in attorney fees over its 20-year life if outsourced — claims drafting, office action responses, IDS submissions, maintenance fee tracking, assignment recordation, prior-art monitoring, renewal decisions. The Patent Worker substitutes for the routine 80% of that workload at $79/mo while explicitly flagging the 20% that genuinely requires a human attorney (claim amendments under rejection, infringement analysis, litigation). Users stay subscribed for the duration of their active patents because the alternative is either resuming attorney spend or losing patents to missed deadlines.

---

## How the Knowledge Capture Pipeline Self-Improves This Worker

The Patent Worker is the **reference embodiment** in the Knowledge Capture Pipeline patent (Filing 2 this weekend). The connection works in both directions:

1. **Worker fixtures from Sean's filings** become training examples that improve the worker's draft generation
2. **Every user of the Patent Worker** contributes new fixtures (their inventions, their citation patterns, their prosecution decisions) that further improve the worker for everyone else

This is the compounding-data-moat in action: the worker gets stronger every time a new user puts their domain expertise through it. After 100 users have filed 500 patents through the worker, the platform has the largest single corpus of small-entity provisional-drafting expertise ever assembled.

---

## Build Phases (Estimated 15-20 dev days total)

**Phase 1 — Draft Generation Core (4-5 days)**
- Worker scaffold + system prompt
- Drafting template engine
- Fixture-based prompt enrichment
- Output validation (does the draft have all required sections?)

**Phase 2 — Filing Logistics Walkthrough (3-4 days)**
- EFS-Web step-by-step prompt sequences
- Fee calculator
- Required attachment checklist
- Post-filing receipt capture

**Phase 3 — Calendar + Deadline Integration (2-3 days)**
- Google Calendar connector reuse
- Deadline calculation engine
- Alert thresholds (T-30, T-14, T-3)
- Control Center surface

**Phase 4 — Patent Family Management (3-4 days)**
- Family graph data model
- Cross-citation engine
- Automatic "continuous invention thread" paragraph generation
- Family integrity validation (no orphan filings, consistent prior-art)

**Phase 5 — Competitive Monitoring (3-4 days)**
- USPTO PEDS API integration
- Daily scan job
- Prior-art conflict detection
- Defensive publication suggestion engine

---

## Open Questions

1. **Catalog placement:** Platform spine (`PLAT-005` style) or Law vertical (`LAW-003` style)? The worker is universal in applicability but legally-flavored — could go either way. Recommend Law vertical (joins Business Law, Legal Forms, RE/Land Use, Aviation Law, Family Law, Tax Law) since the Tier 2 baseline is heavily legal.

2. **Counsel attestation:** Per `project_user_counsel_attestation_pattern` memory, modules ship live with user's counsel attesting at worker activation. The Patent Worker probably requires the user to confirm they have or will engage patent counsel before unlocking the drafting capability. Lower-risk capabilities (calendar tracking, competitive monitoring) can be open access.

3. **Bar association considerations:** The worker is structured to assist inventors and counsel, not to practice law. Disclaimer language should be reviewed by bar counsel before launch to ensure compliance with unauthorized-practice-of-law statutes in jurisdictions where users may be located.

4. **PCT and international filings:** V1 should be US-only (USPTO). V2 adds PCT support. V3 adds direct EPO/JPO/CNIPA filing guidance. Sequence depends on user demand.

---

*Scaffold spec produced 2026-05-24. Ready for build when prioritized by Sean post-launch.*
