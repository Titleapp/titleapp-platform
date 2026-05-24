# Filing C — Multi-Tier Composable Rule-Based Governance System for AI-Powered Digital Workers

**Type:** Provisional Patent Application (35 U.S.C. § 111(b))
**Filing target:** Sun 2026-05-24 via USPTO EFS-Web
**Applicant:** SOCIII Inc. (Delaware C-corporation)
**Named Inventor:** Sean Lee Combs
**Small entity status:** Yes
**Estimated filing fee:** $120

---

## TITLE OF INVENTION

**Multi-Tier Composable Rule-Based Governance System for AI-Powered Digital Workers with Version-Pinned Audit Trail, Pre-Publish Constraint Enforcement, Regulatory Ingestion, and Identity-Anchored Hash Chain**

---

## FIELD OF THE INVENTION

The present invention relates to systems for governing the actions of artificial-intelligence-powered software agents (referred to herein as "Digital Workers"), and more particularly to a multi-tier composable rule architecture wherein platform-wide invariants, vertical-domain rule sets, workspace-level overrides, and per-transaction custom rules layer additively with conflict resolution, are version-pinned at the time of any governance event, are enforced by a pre-publish constraint check before any action with external consequences executes, and are integrated with a hash-anchored cryptographic audit chain that ties every governance decision to immutable proof-of-existence keyed by identity attestations.

---

## BACKGROUND OF THE INVENTION

### Continuous Invention Thread

This invention extends a continuous body of work in blockchain-anchored governance and Digital Worker composition, including:

- U.S. Patent Application No. 18/398,973 (Combs, filed December 28, 2023; abandoned in prosecution and published as prior art approximately June 28, 2025) which disclosed foundational parent-child Digital Title Certificate architecture and multi-signature smart-contract escrow mechanisms; and

- A December 2024 Blockchain Logbook System filing (Combs) which extended the parent-child architecture to dynamically-updatable logbook records.

The present invention is a net-new architectural contribution that builds on those foundational primitives. Where the prior art establishes the record-keeping substrate (parent-child DTCs with cryptographic anchoring), the present invention provides the *governance layer* that determines what AI-powered actions are permitted to write to that substrate, under what rules, with what audit and accountability, and how those rules compose across multiple authority levels.

### Cross-Filing Relationship to Co-Pending Applications

This application has a significant relationship to co-pending provisional patent applications filed by the same inventor and applicant on May 25, 2026 (collectively the "May 25 Family"). Specifically:

- The **Knowledge Capture Pipeline** (co-pending U.S. Provisional Patent Application No. [TO BE INSERTED — Filing 2 of May 25 cycle]) discloses three ingestion jobs (Codex Ingestion, Rule Extraction, Worker Fixture Capture) and a Terminal Worker safety architecture that together compose a SYSTEM for converting expert conversations into governed worker capabilities. That filing claims the pipeline as a composed system. The present application claims the **rule composition engine** as a STANDALONE system — the deterministic conflict resolution algorithm, the five-tier architecture, the content-hashing of rule definitions, the version-pinning mechanism, the pre-publish constraint check service, and the regulatory ingestion service — independent of whether those rules came from human conversation, codex documents, or any other source. The two filings are intentionally complementary: Filing 2 protects the pipeline that PRODUCES rules and fixtures; the present filing protects the engine that COMPOSES and ENFORCES rules.

- The **Identity-Anchored Hash-Chain Audit Trail** (co-pending U.S. Provisional Patent Application No. [TO BE INSERTED — Filing 1 of May 25 cycle]) discloses the audit chain architecture. The present application USES that audit chain to anchor each rule composition event and each rule-set version, but does not separately claim the audit chain architecture itself.

- The **Build-Without-Code Worker Authoring System** (co-pending U.S. Provisional Patent Application No. [TO BE INSERTED — Filing D of May 25 cycle]) discloses the conversational worker authoring UX pattern. The present application is USED by Build-Without-Code workers (the rule composition engine evaluates each authored worker's rule set), but does not separately claim the authoring UX.

The cross-family claim differentiation will be coordinated at nonprovisional conversion time. The present filing's principal claim scope is the **rule composition engine as a standalone system** — usable independently of any specific ingestion pipeline, authoring surface, or audit trail anchoring scheme, and applicable across any rule-governed industry.

### Background — The Governance Gap in AI Agent Systems

The rapid proliferation of large language model (LLM) based AI agents (e.g., LangChain, AutoGen, OpenAI Assistants, Anthropic Claude, OpenAI GPT, Google Gemini-based agents) has created a substantial governance gap:

1. **Prompt-level guardrails are fragile.** State-of-the-art AI agents are governed primarily through natural-language instructions in their system prompts. These guardrails fail in known ways: instruction-following degrades under adversarial inputs, the model may "forget" earlier instructions during long conversations, and edge-case instructions are often violated.

2. **Hard-coded business logic is rigid.** Where agents are deployed in regulated industries, organizations frequently encode business rules and compliance constraints directly in application code surrounding the agent. This approach is rigid (rules cannot be updated without code deploys), opaque (rules are not visible to non-engineering stakeholders), and non-portable (rules cannot easily transfer between deployments).

3. **No standard for multi-authority rule composition.** Real-world regulated systems have multiple authorities defining rules at different levels — platform operators define safety invariants, regulators define industry-specific rules, jurisdictions add local overrides, and enterprises add custom policies. Existing AI agent frameworks have no standard architecture for composing these multi-authority rules with deterministic conflict resolution.

4. **No reproducible audit trail.** When an AI agent produces an output that is later challenged (regulatory inquiry, legal dispute, audit), the existing tooling typically cannot reconstruct exactly which rules were in effect at the time the output was produced. Rule sets are mutable; agents store no pinned version of the rules under which they operated.

5. **No pre-publish constraint enforcement.** Existing systems generally validate agent outputs by inspecting them after generation. They lack a structured pre-publish constraint check that evaluates *whether the proposed action would violate any active rule* before the action is committed externally (sending an email, transferring funds, modifying a record, posting to a public ledger).

6. **Regulatory data is ingested manually.** When regulatory rules change (new SEC enforcement actions, OFAC sanctions additions, jurisdiction-specific updates), affected enterprises typically discover and incorporate the changes manually, with significant lag and risk of missed updates.

7. **Identity and governance are decoupled.** Existing AI agent systems generally do not bind governance events to verified identities. The same agent invocation may be triggered by any authenticated user; there is no architecture wherein the user's identity attestation flows into the rule-set composition as a first-class input.

### Prior Art Limitations

While the cited prior art establishes the parent-child DTC + audit chain primitives, it does not address the governance gap above. Specifically:

- The cited prior art does not disclose a multi-tier rule composition architecture;
- It does not disclose rule-set version pinning;
- It does not disclose a pre-publish constraint check service;
- It does not disclose regulatory ingestion automating the update of vertical-level rule sets;
- It does not disclose AI-worker output validation against composed rule sets;
- It does not disclose binding identity attestations as inputs to governance evaluation;
- It does not address governance of AI-powered Digital Workers generally.

The present invention provides a comprehensive solution to the governance gap through novel architecture.

---

## SUMMARY OF THE INVENTION

The present invention provides a Multi-Tier Composable Rule-Based Governance System (the "System") comprising:

1. **A multi-tier rule architecture** organizing all governance rules into five tiers:
   - **Tier 0 (Platform Safety):** Immutable platform-wide invariants enforced on every action by every Digital Worker (e.g., no impersonation of licensed professionals, append-only audit trail, no PII exposure, AI-generation disclosure).
   - **Tier 1 (Platform Operations):** Platform-wide operational rules (subscription enforcement, role-based access control, capability gating, usage limits).
   - **Tier 2 (Vertical Baselines):** Per-industry rule sets defining the regulations applicable to a specific domain (real estate, securities, healthcare, aviation, automotive, etc.).
   - **Tier 3 (Workspace Overlays):** Per-tenant rule overrides allowing enterprises to layer custom policies onto the vertical baseline (e.g., higher signing thresholds, additional approval queues, custom data retention rules).
   - **Tier 4 (Per-Transaction Rules):** Transaction-specific rules layered onto the above for individual escrows, policies, or work products.

2. **A rule composition engine** that combines applicable rules across the five tiers using deterministic algorithms with conflict resolution prioritizing the most-restrictive rule.

3. **A rule registry storage layer** holding canonical rule definitions versioned by semantic version (major.minor.patch) with cryptographic content hashes, enabling rule sets to be addressed by version and verified for integrity.

4. **A version-pinning mechanism** wherein at every governance event, the composed rule-set version is captured and persisted alongside the event, enabling reconstruction of the exact rules under which any historical action was governed.

5. **A pre-publish constraint check service** that evaluates every proposed AI-Worker action with external consequences against the composed rule set, blocking violating actions or routing to human review based on configured rule severity.

6. **A regulatory ingestion service** that automatically pulls updates from authoritative regulatory feeds (OFAC sanctions, SEC enforcement actions, federal/state regulatory updates per vertical) and incorporates them into the corresponding Tier 2 vertical baselines, with versioning and notification.

7. **A hash-anchored cryptographic audit chain** wherein each governance event (rule evaluation result, AI-Worker output, action commit, version update) is serialized, hashed, signed by the platform, and anchored to a public blockchain (chain-agnostic; preferred embodiment Base) with the on-chain hash providing tamper-evidence and the full event payload retained off-chain for confidential audit.

8. **Identity-anchored governance** wherein the user's identity attestation (issued by a hosted identity rail) flows into the rule-set composition as a first-class input, with rules conditioned on verified attributes of the acting party (e.g., professional licensure, jurisdictional residency, sanctions status).

9. **AI-Worker output validation** wherein every Digital Worker output is evaluated against the composed rule set before being persisted or returned, with violating outputs blocked, rewritten, or escalated.

10. **A governance event API** providing structured access to the audit chain for authorized parties (regulators, courts, counterparties), with payload retrieval keyed by the on-chain hash anchor.

The System provides:

- **Composable governance** allowing platform operators, regulators, enterprises, and end-users to layer rules additively without code changes;
- **Deterministic conflict resolution** through most-restrictive prioritization;
- **Reproducible audit** through version-pinning of rule sets at the time of each governance event;
- **Tamper-evident audit trail** through the chain-agnostic hash-anchored audit chain;
- **Automated regulatory updates** through the regulatory ingestion service;
- **Pre-publish enforcement** preventing violating actions before they have external consequences;
- **Identity-aware governance** binding user attestations into the governance evaluation;
- **Cross-vertical applicability** with the same architectural pattern serving real estate, securities, healthcare, aviation, automotive, government, and any other domain with rule-based compliance requirements.

---

## DETAILED DESCRIPTION OF EMBODIMENTS

### System Architecture Overview

The System comprises a distributed architecture with the following principal components, deployable as a SaaS platform, on-premises enterprise system, or hybrid configuration.

**1. The Rule Registry.** A canonical, append-only storage layer holding all rule definitions. Each rule is a structured object containing:
   - A unique identifier (UUID);
   - A rule type code (e.g., `safety_invariant`, `operational_rule`, `vertical_baseline`, `workspace_overlay`, `transaction_rule`);
   - A tier assignment (0 through 4);
   - A semantic version (major.minor.patch);
   - A content hash (SHA-256 of the rule body);
   - A predicate or set of predicates defining the rule's evaluation logic;
   - A severity level (`hard_stop`, `soft_stop`, `warning`, `informational`);
   - A jurisdiction or scope (where the rule applies);
   - Metadata (creation date, author, prior version, related rules);
   - A retirement marker (rules are never deleted, only marked retired with a successor reference).

Rules are addressable by ID, by content hash, by version, or by scope query (e.g., "all Tier 2 real-estate rules effective for California").

**2. The Rule Composition Engine.** Given a governance event context (the acting Digital Worker, the target vertical, the workspace, the transaction, the acting user's identity attestation, the jurisdiction), the engine computes the composed rule set by:
   - Loading all Tier 0 platform safety rules (always applied);
   - Loading all Tier 1 operational rules applicable to the worker and the user's role;
   - Loading all Tier 2 vertical baseline rules for the target vertical and jurisdiction;
   - Loading all Tier 3 workspace overlays for the acting workspace;
   - Loading all Tier 4 transaction rules attached to the current transaction;
   - Detecting conflicts (rules whose predicates would produce different outcomes for the same input);
   - Resolving conflicts using most-restrictive prioritization (the rule producing the stricter outcome wins);
   - Computing a composition hash representing the full composed rule set, used for version pinning.

The composition is deterministic: given the same inputs, the same composed rule set and the same composition hash are produced. This enables version-pinning.

**3. The Version Pinning Mechanism.** At every governance event:
   - The composed rule-set hash is captured and persisted alongside the event;
   - For multi-step processes (escrows, policies, workflows that span multiple events), the rule-set version may be pinned at process initiation and held constant for the lifetime of the process — even if individual underlying rules update — to ensure the process completes under its initial rule contract;
   - Alternatively, the version may be re-evaluated at each event for processes that should adapt to rule updates;
   - The pinning policy (pin-at-initiation vs. re-evaluate-each-event) is itself a rule, allowing different verticals to adopt different policies.

**4. The Pre-Publish Constraint Check Service.** Before any AI-Worker action with external consequences executes (sending an email, transferring funds, modifying a record, posting to a public ledger, generating a customer-visible document), the System runs a structured check:
   - Compose the rule set for the proposed action's context;
   - Evaluate each rule's predicate against the proposed action's payload;
   - Aggregate the outcomes;
   - If any `hard_stop` rule evaluates as violated, block the action (hard fail);
   - If any `soft_stop` rule evaluates as violated, route the action to a human review queue (soft fail);
   - If any `warning` rules evaluate, log the warning and proceed;
   - Persist the evaluation result with the composition hash and the rule-by-rule outcomes to the audit chain.

The pre-publish check is the System's primary enforcement mechanism. By evaluating *before* externalization, the System prevents violating actions from having external consequences that cannot be undone.

**5. The Regulatory Ingestion Service.** Automated pulls from regulatory feeds:
   - *OFAC Specially Designated Nationals List:* Daily polling, with new entries triggering immediate updates to sanctions-screening rules in affected verticals (financial, real estate, securities).
   - *SEC enforcement actions:* Daily polling, with new actions flagged in securities-vertical rule sets.
   - *Federal Register:* Daily polling, with new rules in regulated industries (healthcare, aviation, transportation) parsed and surfaced for human-in-the-loop incorporation into Tier 2 baselines.
   - *State and local registries:* Per-jurisdiction polling for property records, licensing changes, regulatory updates.
   - *Industry-specific feeds:* FAA airworthiness directives, FDA drug recalls, NHTSA vehicle recalls, USPTO patent grants, etc.

Each ingested update generates a candidate rule update. Updates flagged as routine (e.g., a new entry on a sanctions list) auto-publish to the affected Tier 2 baseline. Updates flagged as substantive (e.g., a new regulatory framework) are surfaced to a human review queue with the relevant rule diffs.

**6. The Audit Chain.** Identical to the audit chains described in Filings A and B: each governance event is hashed, signed, anchored on a public blockchain, with the full event payload retained off-chain. For the present invention, the event payload specifically includes:
   - The composition hash of the rule set in effect;
   - The acting Digital Worker identifier;
   - The acting user's identity attestation reference;
   - The proposed action payload (what the worker wanted to do);
   - The rule-by-rule evaluation outcome;
   - The final action outcome (executed, blocked, routed to review);
   - The timestamp.

This enables reconstruction of the exact governance state for any historical event.

**7. The Identity Anchoring Layer.** Identity attestations issued by a hosted identity rail (Stripe Identity, Coinbase Verified, or similar third-party providers) are bound to user platform identities and flow into the rule-set composition as first-class inputs:
   - Rules may be conditioned on verified attributes (licensure, residency, sanctions status, jurisdiction);
   - Identity attestations are themselves recorded as child logbook entries on the user's parent DTC;
   - The identity attestation reference is included in every governance event payload, providing a cryptographic chain from action → composed rules → identity.

**8. The AI-Worker Output Validation Layer.** Every output produced by every Digital Worker is evaluated against the composed rule set before persistence or return:
   - Outputs that violate `hard_stop` rules are blocked;
   - Outputs that violate `soft_stop` rules may be rewritten by a designated rewriter Worker or routed to human review;
   - Outputs that emit content prohibited by safety rules (e.g., professional impersonation, financial advice without disclosure) are rewritten or blocked;
   - Validation occurs at the same enforcement point as the pre-publish check, ensuring consistency.

### Governance Event Lifecycle

A representative governance event proceeds as follows:

1. **Context establishment.** A Digital Worker is invoked to perform an action (e.g., generate a marketing email, propose a transaction, produce a report). The context is established: worker ID, target vertical, workspace, transaction (if applicable), acting user with their identity attestation, jurisdiction.

2. **Rule composition.** The composition engine assembles the applicable rule set across all five tiers, resolves conflicts, and computes the composition hash.

3. **Worker execution under rules.** The Digital Worker executes its function with the composed rules provided as constraints. State-of-the-art LLM-based workers receive the rules as system-prompt content; structured workers reference rules through API calls.

4. **Output validation.** The worker's output is evaluated against each rule. Violations are flagged with severity.

5. **Pre-publish check.** If the worker proposed an external action (send email, mint NFT, transfer funds), the pre-publish check evaluates the action against the composed rules independently of the worker's self-evaluation.

6. **Action decision.** Based on the validation and pre-publish outcomes, the action either executes, blocks, or routes to human review.

7. **Audit chain anchoring.** The full event — context, composition hash, rule evaluations, worker output, action outcome — is serialized, hashed, signed, and anchored on-chain. The full payload is retained off-chain.

8. **Notification.** Where rules require, parties are notified (e.g., a regulator subscribed to vertical updates may be notified of a Hard-Stop block).

### Cross-Vertical Applications

The same architectural pattern serves multiple verticals:

**Real Estate:** Tier 2 rules encode state-by-state title transfer requirements, recordation rules, disclosure obligations, environmental restrictions. Tier 3 overlays may add MLS-specific rules or brokerage policies. Tier 4 rules attach to specific transactions.

**Securities and Finance:** Tier 2 rules encode SEC requirements, FINRA rules, blue sky law variations. The pre-publish check ensures no offering material is published without proper registration or exemption documentation.

**Healthcare:** Tier 2 rules encode HIPAA, HITECH, state medical board rules. Pre-publish checks ensure no patient data is exposed in worker outputs.

**Aviation:** Tier 2 rules encode FAA Part 91, Part 135, Part 121 requirements with type-specific overlays for individual aircraft. CoPilot workers (referenced in related work by inventor) operate under these rules.

**Government Contracting:** Tier 2 rules encode FAR/DFARS, OFCCP requirements, set-aside program rules. Pre-publish checks ensure no compliance violations in proposal generation.

**Automotive (dealer operations):** Tier 2 rules encode state DMV rules, F&I compliance, advertising rules. Pre-publish checks block ad copy that violates state advertising regulations.

The architecture's value scales with the number of supported verticals: a single platform can serve any rule-governed industry with the same composition engine, pre-publish check, audit chain, and regulatory ingestion service.

### Variations and Embodiments

**Deployment configurations.** The System may be deployed as a SaaS platform (preferred embodiment), as on-premises enterprise software (for regulated industries with data residency requirements), or as a hybrid (where the rule registry and composition engine are on-premises but the audit chain anchor uses a public blockchain).

**Chain-agnostic operation.** Preferred embodiment anchors to Base. Alternative embodiments include Ethereum, Polygon, Solana, Avalanche, Hyperledger Fabric (for permissioned-chain deployments), and others.

**Open-source rule registry.** The Tier 2 vertical baseline rules may be published as open-source rule sets, allowing community contributions and regulator verification. The Tier 0-1 platform rules and the System's enforcement infrastructure remain proprietary.

**Rule diff visualization.** A user interface presenting before/after diffs of rule updates, enabling stakeholders to review changes before they propagate.

**Constitutional rules.** A subset of Tier 0 rules designated as "constitutional" — immutable across all System versions and requiring an extraordinary process (e.g., multi-signature governance vote) to modify. These provide ultimate platform-trust guarantees.

**Identity attestation reuse.** A user verified for one transaction may reuse the attestation for subsequent transactions, subject to expiration, revocation, and material-change triggers.

**Multi-language rule definitions.** Rule predicates may be expressed in domain-specific languages (DSLs) optimized for each vertical (e.g., a finance DSL for SEC rules, an aviation DSL for FAA airworthiness rules) and compiled to a uniform internal representation for evaluation.

**Cross-platform rule federation.** Multiple deployments of the System may federate their rule registries, enabling shared rule sets across enterprises (e.g., an industry consortium maintaining shared compliance rules).

---

## BRIEF DESCRIPTION OF THE DRAWINGS

(To be supplied with formal drawings prior to filing.)

**Figure 1:** System architecture overview showing the Rule Registry, Composition Engine, Version Pinning Mechanism, Pre-Publish Constraint Check, Regulatory Ingestion Service, Audit Chain, Identity Anchoring Layer, and AI-Worker Output Validation.

**Figure 2:** Multi-tier rule architecture diagram showing the five tiers (Platform Safety, Platform Operations, Vertical Baselines, Workspace Overlays, Per-Transaction Rules) with example rules at each tier.

**Figure 3:** Rule composition algorithm flow showing the inputs (context, applicable rules), the composition step, conflict resolution by most-restrictive prioritization, and the output (composed rule set + composition hash).

**Figure 4:** Governance event lifecycle showing the eight stages from context establishment through audit chain anchoring.

**Figure 5:** Pre-publish constraint check decision tree showing hard-stop, soft-stop, and warning paths.

**Figure 6:** Regulatory ingestion service architecture showing the polling of regulatory feeds, the candidate-update generation, and the routing of routine vs. substantive updates.

**Figure 7:** Audit chain anchoring detail showing the event payload, the hash, the on-chain anchor, and the off-chain retention.

**Figure 8:** Identity anchoring flow showing how identity attestations from a hosted identity rail flow into rule-set composition.

**Figure 9:** Cross-vertical application matrix showing how the same architecture serves real estate, securities, healthcare, aviation, government contracting, and automotive verticals.

---

## CLAIMS

(Provisional claims; non-limiting.)

**Claim 1.** A computer-implemented system for governing artificial-intelligence-powered software agents, the system comprising:
   (a) a rule registry storage layer holding rule definitions versioned by semantic version and identified by cryptographic content hash;
   (b) a multi-tier rule architecture organizing rules into a plurality of tiers comprising platform safety, platform operations, vertical baselines, workspace overlays, and per-transaction rules;
   (c) a rule composition engine that, given a governance event context, assembles applicable rules across the tiers, detects conflicts, and resolves conflicts by prioritizing the most-restrictive rule;
   (d) a version-pinning mechanism wherein the composed rule-set hash is captured and persisted alongside each governance event;
   (e) a pre-publish constraint check service that evaluates proposed external actions against the composed rule set before execution, blocking violations or routing to human review by severity;
   (f) a regulatory ingestion service that automatically polls regulatory feeds and incorporates updates into vertical baseline rule sets with versioning;
   (g) a cryptographic audit chain wherein governance events are hashed, signed, and anchored to a public blockchain while the underlying event payload including the composition hash is retained off-chain;
   (h) an identity anchoring layer wherein identity attestations from a hosted identity rail flow into rule-set composition as first-class inputs; and
   (i) an artificial-intelligence-powered software agent output validation layer wherein agent outputs are evaluated against the composed rule set before persistence or return.

**Claim 2.** The system of Claim 1, wherein the multi-tier rule architecture comprises exactly five tiers, ordered from most-restrictive-and-immutable to most-flexible-and-transactional.

**Claim 3.** The system of Claim 1, wherein the rule composition engine produces a composition hash that is deterministic across re-evaluations of the same inputs, enabling version-pinning.

**Claim 4.** The system of Claim 1, wherein the pre-publish constraint check distinguishes between hard-stop rules (blocking execution), soft-stop rules (routing to human review), warning rules (logging only), and informational rules (no enforcement).

**Claim 5.** The system of Claim 1, wherein the regulatory ingestion service polls feeds including but not limited to OFAC Specially Designated Nationals List, SEC enforcement actions, Federal Register notices, FAA airworthiness directives, FDA recalls, NHTSA recalls, and USPTO patent grants, with auto-publication of routine updates and human review of substantive updates.

**Claim 6.** The system of Claim 1, wherein the cryptographic audit chain is chain-agnostic with embodiments including Base, Ethereum, Polygon, Solana, Avalanche, and permissioned Hyperledger Fabric.

**Claim 7.** The system of Claim 1, wherein rules at any tier may be conditioned on verified attributes of the acting user provided by the identity anchoring layer.

**Claim 8.** A method for governing an artificial-intelligence-powered software agent action, the method comprising:
   (a) establishing a governance event context including the agent identifier, target vertical, workspace, transaction reference (if applicable), acting user identity attestation, and jurisdiction;
   (b) composing the applicable rule set across the multi-tier architecture with conflict resolution by most-restrictive prioritization;
   (c) computing a composition hash;
   (d) providing the composed rules to the agent as constraints during execution;
   (e) evaluating the agent's output against the composed rule set;
   (f) for proposed external actions, executing the pre-publish constraint check;
   (g) deciding to execute, block, or route to human review based on the evaluation outcome;
   (h) serializing the full governance event including context, composition hash, evaluation, and outcome;
   (i) hashing, signing, and anchoring the serialized event to a public blockchain; and
   (j) retaining the full event payload in append-only off-chain storage.

**Claim 9.** The method of Claim 8, wherein for multi-step processes spanning multiple governance events, the composition hash is captured at process initiation and held constant for the process lifetime to ensure the process completes under its initial rule contract.

**Claim 10.** The method of Claim 8, wherein for adaptive processes, the composition hash is re-evaluated at each event to ensure the process adapts to rule updates.

**Claim 11.** The system of Claim 1, applied to securities transactions wherein the vertical baseline rules encode SEC requirements, FINRA rules, and blue sky law variations, and the pre-publish constraint check ensures no offering material is published without proper registration or exemption documentation.

**Claim 12.** The system of Claim 1, applied to healthcare workflows wherein the vertical baseline rules encode HIPAA, HITECH, and state medical board rules, and the pre-publish constraint check ensures no patient data is exposed in agent outputs.

**Claim 13.** The system of Claim 1, applied to real estate transactions wherein the vertical baseline rules encode state-by-state title transfer requirements, recordation rules, disclosure obligations, and environmental restrictions.

**Claim 14.** The system of Claim 1, applied to aviation operations wherein the vertical baseline rules encode FAA Part 91, Part 135, and Part 121 requirements with type-specific overlays for individual aircraft.

**Claim 15.** The system of Claim 1, applied to automotive dealer operations wherein the vertical baseline rules encode state DMV rules, F&I compliance, and state advertising regulations.

**Claim 16.** The system of Claim 1, applied to government contracting wherein the vertical baseline rules encode FAR/DFARS, OFCCP requirements, and set-aside program rules.

**Claim 17.** The system of Claim 1, wherein a subset of Tier 0 rules is designated constitutional and immutable, requiring an extraordinary multi-signature governance process to modify, providing ultimate platform-trust guarantees.

**Claim 18.** The system of Claim 1, wherein multiple deployments of the system federate their rule registries to enable shared rule sets across enterprises in an industry consortium.

---

## ABSTRACT

A Multi-Tier Composable Rule-Based Governance System for AI-powered Digital Workers, comprising a rule registry holding versioned and content-hashed rule definitions, a five-tier rule architecture (platform safety, platform operations, vertical baselines, workspace overlays, per-transaction rules), a composition engine with deterministic conflict resolution prioritizing most-restrictive rules, a version-pinning mechanism capturing the composed rule-set hash at each governance event, a pre-publish constraint check service evaluating proposed external actions before execution with severity-based blocking or human review routing, an automated regulatory ingestion service polling authoritative feeds (OFAC, SEC, Federal Register, industry-specific) and incorporating updates into vertical baselines, a chain-agnostic hash-anchored cryptographic audit chain providing tamper-evident proof-of-existence for every governance event, an identity anchoring layer wherein identity attestations flow into rule-set composition as first-class inputs, and an AI-Worker output validation layer enforcing rules on agent outputs before persistence. The System extends the foundational parent-child Digital Title Certificate architecture (cited as prior art) by providing the governance layer that determines what AI-powered actions are permitted, under what rules, with what audit accountability. The same architectural pattern serves real estate, securities, healthcare, aviation, automotive, government contracting, and other rule-governed verticals. Deterministic version-pinning enables reconstruction of the exact rules under which any historical governance event was decided, supporting regulatory inquiry, legal dispute resolution, and audit. The System closes the governance gap in existing AI agent frameworks by providing structured, composable, version-pinned, audit-trailed, identity-anchored, and pre-publish-enforced rule-based governance.

---

## INVENTORSHIP AND ASSIGNMENT NOTES

**Named Inventor:** Sean Lee Combs, sole inventor.

**Applicant:** SOCIII Inc., a Delaware C-corporation.

**Architectural Significance:** This filing represents the structural moat patent for the SOCIII platform. While Filings A (AI Escrow Locker) and B (Title and Property Assurance) extend prior art parent-child DTC architecture with system-level compositions for specific applications, Filing C establishes intellectual property protection for the multi-tier composable rule governance pattern itself — the architectural innovation that enables every other Digital Worker deployment on the platform. Copying any single component of this filing (e.g., a regulatory ingestion service alone, or a hash-anchored audit chain alone) does not infringe; copying the composition of multi-tier rules + version pinning + pre-publish enforcement + identity anchoring + audit chain does. This composition is the moat.

**Open-Source Strategy Note:** While the present invention is patented, certain components are anticipated to be released under Apache 2.0 with a conditional patent grant. Specifically, Tier 2 vertical baseline rule definitions and example reference implementations may be open-sourced to drive industry adoption while the Tier 0-1 platform rules, the composition engine, the pre-publish enforcement, the regulatory ingestion service, and the audit chain anchoring remain hosted services with the patent grant conditioned on use through the platform's hosted trust layer.

**Cross-Filing Note:** This filing references and is referenced by Filings A and B in the same filing cycle. The three filings together form a patent family covering (i) the parent-child DTC + system composition primitives (extending prior art), (ii) title and property assurance application, and (iii) the governance layer enabling all of the above. Filing C is the most architecturally fundamental of the three and the broadest in cross-vertical application.

---

*End of Filing C draft. Sean to review, refine claim language, and add formal drawings before USPTO submission. This is the structural moat patent — Sean should review claim breadth carefully; broader claims face higher rejection risk but provide stronger protection if granted.*
