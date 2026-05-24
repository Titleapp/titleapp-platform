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

### 3. USPTO EFS-Web Filing Logistics

Step-by-step guidance through the USPTO submission flow:
- Entity status determination (micro / small / large)
- Fee calculation per filing
- Required attachments (specification PDF, drawings, cover sheet, fee transmittal, IP assignment)
- USPTO.gov account setup if user doesn't have one
- ePAS payment configuration
- Post-filing receipt storage + filing number capture

Worker doesn't actually submit (humans hit submit + pay); worker prepares everything and tells the user exactly what to click.

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

This capability requires integration with USPTO's Patent Examination Data System (PEDS) — free public API.

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
