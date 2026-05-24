# Filing D — Build-Without-Code Worker Authoring through Conversational AI-Mediated Specification Generation with Governance Pipeline Validation

**Type:** Provisional Patent Application (35 U.S.C. § 111(b))
**Filing target:** Sun 2026-05-25 via USPTO EFS-Web
**Applicant:** SOCIII Inc. (Delaware C-corporation)
**Named Inventor:** Sean Lee Combs
**Small entity status:** Yes
**Estimated filing fee:** $120

---

## TITLE OF INVENTION

**Build-Without-Code Worker Authoring System for Conversational AI-Mediated Specification Generation by Non-Engineer Domain Experts, with Structural Safety Properties and Multi-Stage Governance Pipeline Validation**

---

## FIELD OF THE INVENTION

The present invention relates to systems for authoring AI-powered software agents (referred to herein as "Digital Workers"), and more particularly to a user-experience pattern wherein non-engineer domain experts (clinicians, pilots, brokers, instructors, compliance officers, and similar professionals lacking software engineering literacy) author deployable AI workers through a structured conversational dialog with an AI-mediated authoring interface, with the conversation producing structured worker specifications (not executable code) that pass through a multi-stage governance pipeline before becoming invocable by other users — providing the accessibility advantages of natural-language authoring while preserving the safety advantages of governed deployment.

---

## BACKGROUND OF THE INVENTION

### Continuous Invention Thread

This invention extends a continuous body of work in AI-mediated governance and parent-child digital identity architecture, including U.S. Patent Application No. 18/398,973 (Combs, filed December 28, 2023; abandoned in prosecution and published as prior art approximately June 28, 2025) which disclosed foundational parent-child Digital Title Certificate (DTC) architecture, and the December 2024 Blockchain Logbook System filing (Combs) which extended that architecture to dynamically-updatable logbook records. The present invention is a focused contribution claiming the **conversational worker authoring user-experience pattern** — the specific architecture by which non-engineer domain experts produce deployable AI workers through structured natural-language dialog without ever interacting with code, while the resulting workers pass through the same governance validation that any platform-built worker would face.

This filing is structurally related to a co-pending Knowledge Capture Pipeline filing (Filing 2 in the same May 2026 filing cycle) which discloses the Terminal Worker safety architecture as one component of a broader pipeline. The present invention focuses specifically on the conversational authoring UX pattern as a standalone claim — different claim scope, different protection, both intended to issue.

### Background — The Accessibility Gap in AI Agent Authoring

The deployment of AI-powered software agents in regulated industries requires agents that operate within the rules, conventions, and accumulated wisdom of human domain experts. However, the people with the deepest domain expertise — practicing nurses, working pilots, experienced brokers, senior compliance officers, certified financial planners, licensed real estate appraisers, and similar professionals — are typically NOT software engineers. They cannot author AI agents through code, and existing prompt-engineering interfaces are too unstructured to produce reliably-deployable agents.

The standard approaches all have fatal accessibility gaps:

1. **Code-based agent SDKs** (LangChain, LangGraph, AutoGen, OpenAI Assistants API, Anthropic Tools): require Python or JavaScript fluency. Excludes 99% of domain experts.

2. **No-code agent builders** (GPT Builder, Claude Projects, Zapier Central): use form-based interfaces requiring users to know what fields to fill in. Domain experts often don't know how to translate their expertise into the abstract slots the builders provide.

3. **Prompt-engineering interfaces**: open text fields where the user writes their own system prompt. Brittle output quality. No safety guarantees. No path to a governed deployment.

4. **Hand-coded by paired engineer**: a domain expert pairs with a software engineer who translates the expert's knowledge into agent configuration. Expensive (engineer time), slow (multiple iteration cycles), lossy (engineer rarely captures the expert's complete tacit knowledge).

None of these methods allow the most natural workflow: **a domain expert describing what their agent should do, in their own words, to an AI assistant that asks clarifying questions and produces a deployable result.**

### Background — The Safety Gap in Conversational Authoring

A naive implementation of "let the user describe an agent and the AI builds it" introduces severe safety problems:

1. **Prompt injection through authoring**: an adversarial user describes an agent in terms that include instructions to modify the platform, exfiltrate other users' data, or grant elevated privileges. If the authoring system treats the description as instructions, the platform is compromised.

2. **Inadvertent compliance violations**: a well-meaning user describes an agent that, due to lack of domain expertise on the user's part, would violate regulations they're not aware of. If the system deploys without governance validation, the platform ships an out-of-compliance agent into production.

3. **Quality drift**: agents authored through pure conversation, without structural validation, vary wildly in quality. Some are excellent; others are nearly nonfunctional. End users cannot distinguish the difference until they've already wasted time on a poor agent.

4. **No accountability chain**: when an authored agent produces a harmful output later, no governance record exists tying the agent back to the authoring decisions, the rules applied, or the validation steps taken. Audit becomes impossible.

### Prior Art Limitations

The cited prior art (18/398,973 and the December 2024 logbook filing) establishes the foundational record-keeping substrate but does not address the accessibility or safety gaps in agent authoring. Existing prompt-engineering and no-code agent platforms address accessibility partially but lack the structural safety properties this invention provides.

The present invention provides a comprehensive solution.

---

## SUMMARY OF THE INVENTION

The present invention provides a Build-Without-Code Worker Authoring System (the "System") with three structural safety properties and a multi-stage governance pipeline, comprising:

### Three Structural Safety Properties of the Authoring Interface

1. **Talk-to-AI conversational surface.** The author interacts with an AI assistant through structured natural-language dialog. The assistant guides the author through a worker specification flow asking targeted questions in a defined order:
   - What does the worker do? (one-line purpose)
   - Who uses it? (target user role and vertical)
   - What inputs does it take? (data types, documents, prompts)
   - What outputs does it produce? (reports, decisions, recommendations, drafts)
   - What rules must it follow? (compliance, accuracy, jurisdictional constraints)
   - What must it never do? (hard stops, prohibited actions)
   - What data sources should it use? (connector library selection)
   - What pricing tier? (free, $29, $49, $79)

   The dialog is structured but conversational — the user answers in natural language; the assistant follows up with clarifying questions; the cumulative answers produce a worker specification.

2. **Cannot-harm-code property.** The authoring conversation produces ONLY structured worker specifications (JSON, YAML, or equivalent structured data), never executable code. The specification format is the only thing the user can produce through this surface. The authoring system has:
   - No write access to platform code or platform configuration
   - No write access to other tenants' data
   - No execution path for arbitrary code
   - No mechanism by which the conversation itself can elevate the user's privileges
   - No way for prompt-injection attempts in the dialog to bypass the structural constraints, because the user has no privileges to elevate via the dialog

   This is enforced at the system architecture level, not at the policy level. The authoring system simply does not have the capabilities that would be required for these violations to occur, regardless of what is said in the conversation.

3. **Policy-gated deployment.** The worker specification produced through the conversation must pass through a multi-stage governance pipeline before becoming invocable by other users:
   - **Stage 1 — Intake:** initial specification capture
   - **Stage 2 — Research:** platform-side validation that the worker's declared vertical exists, the jurisdiction is supported, the proposed rules are well-formed, and no obvious safety issues exist
   - **Stage 3 — Rules:save:** the proposed rule set is composed and previewed against the existing rule registry
   - **Stage 4 — PrePublish:** the worker is run against a test fixture set to verify expected behavior
   - **Stage 5 — Submit:** the author submits the worker for review
   - **Stage 6 — Admin Review:** a platform operator (or a designated reviewer for the worker's vertical) reviews the specification, rule set, and test outputs
   - **Stage 7 — APPROVED:** the worker becomes invocable

   The author cannot self-approve. The author cannot bypass any stage. The author cannot deploy a worker that has failed any preceding stage.

### Compounding Effects

The same authoring conversation that produces a deployed worker also produces input data for the Knowledge Capture Pipeline (co-pending filing): the conversation becomes training material for future authoring assistants, and the worker fixtures become demo / training / regression-test resources for the platform.

This compounding property means every successful worker authored through the System makes future authoring sessions more effective, building a domain-knowledge moat that competitors cannot replicate without similar volume of authored workers.

---

## DETAILED DESCRIPTION OF EMBODIMENTS

### The Authoring Conversation Flow

A representative authoring session for a vertical worker (e.g., a Part 135 charter operator's flight planning assistant for a specific aircraft type):

1. **Opening.** The platform presents the authoring assistant: *"What do you do that other people always ask you for help with?"*

2. **Initial description.** The expert responds in natural language: *"I'm a chief pilot at a Part 135 operator. We fly a fleet of Pilatus PC-12s, and dispatchers constantly ask me whether they can launch a particular leg given weather, fuel, runway requirements, and the specific limitations of our PC-12s. I want to build a worker that any of my dispatchers can use to get the same answer I would give, but in 30 seconds instead of 15 minutes of back-and-forth."*

3. **Clarifying questions.** The assistant asks targeted follow-ups:
   - *"What specifically does the dispatcher input?"*
   - *"What's the output format — a yes/no, a structured go/no-go report, or a guidance document?"*
   - *"Are there any FAR/AIM rules the worker must enforce regardless of what the dispatcher inputs?"*
   - *"Are there your company's own SOPs that override the FAR baseline?"*
   - *"Should this worker access live weather (FAA ADDS feed), aircraft performance tables, or both?"*

4. **Specification refinement.** The expert answers each. The assistant synthesizes the answers into a structured worker specification (JSON), continuously updated as the conversation progresses, visible to the expert as a side-panel preview.

5. **Connector and capability selection.** The assistant offers relevant connectors based on the vertical: *"Should this worker pull live weather automatically from FAA? Free. Should it pull NOTAMs? About $0.60 per session. Live aircraft positions? Tiny cost — about $0.002 per query."* Expert confirms which to include.

6. **Rule-set composition.** The assistant explains: *"Based on what you told me, this worker will operate under the Part 135 baseline rules, plus your company's SOPs as overlays, plus FAR/AIM compliance as a hard stop. The rule set is composed and will be applied to every dispatcher session. Want me to show you what the rules look like?"*

7. **Pricing decision.** *"Most vertical-specific workers in regulated industries price at $79/month. Yours could go in at $49 since it's a workflow tool not a full decision-support suite — your call."*

8. **Specification finalization.** The assistant produces the complete worker specification and submits it to the governance pipeline.

9. **Governance pipeline.** The seven-stage pipeline runs. The expert is notified of any issues at any stage and prompted to clarify or adjust.

10. **Approval and publication.** Upon approval, the worker is published to the platform's marketplace and is invocable by any platform user (subject to subscription, vertical access, and per-worker rules).

### Architectural Implementation Details

**The conversational interface** is rendered through the same chat UI used by all platform workers — same React component, same RAAS rule enforcement, same audit chain anchoring. From the platform's perspective, the authoring assistant is just another worker. The difference is only in its system prompt and its constraints.

**The cannot-harm-code property is enforced at multiple layers:**
- The authoring worker has no tool access to file-system writes, database mutations, or cross-tenant queries
- The authoring worker can only produce outputs of one type: a structured worker specification matching a published schema
- The platform's pre-publish constraint check (per the co-pending Knowledge Capture filing) evaluates the produced specification against safety rules before persistence
- Prompt-injection attempts that would try to elevate privileges fail because the underlying capabilities are not granted to the authoring worker

**The governance pipeline** is implemented as a state machine with explicit state transitions:
```
intake → research → rules:save → prePublish → submit → adminReview → APPROVED
                                                          ↓
                                                       REJECTED
```
- Each transition is itself an audit event written to the audit chain (per the co-pending Audit Trail filing)
- Failed transitions surface to the author with structured remediation guidance
- The author can revise and resubmit; each revision creates a new audit event

### Variations and Embodiments

**Domain-expertise-aware questioning.** The authoring assistant's question sequence adapts to the user's stated vertical. A nursing worker author gets different follow-up questions than a real estate worker author than a financial compliance worker author. This is implemented through Tier 2 vertical-baseline rule sets that inject vertical-specific questioning patterns into the authoring assistant's system prompt.

**Multi-session authoring.** Complex workers may take multiple sessions to fully specify. The System persists the partial specification across sessions, with each resumption picking up where the prior session left off. Audit chain captures the full multi-session lineage.

**Collaborative authoring.** Multiple experts may co-author a single worker. The System mediates the collaboration: any participant may add to the specification; conflicts are surfaced for resolution. Audit chain captures every contribution per participant.

**Authoring assistance escalation.** When the System detects that a worker specification is approaching a complexity threshold beyond what conversational authoring can reliably produce, the assistant suggests engaging a "Terminal mode" pair-programmer (a more capable authoring surface for users with some coding ability) or a human SOCIII platform engineer for review.

**Vertical-specific authoring templates.** Pre-built templates for common worker patterns within each vertical (e.g., aviation: "type-rating-specific copilot," "currency tracker," "logbook intelligence"; healthcare: "protocol assistant," "prior-authorization workflow") accelerate authoring by pre-filling the typical structure. The author fills in the specific differences.

**Author-facing rule visualization.** When the rule set is composed, the System renders a visual diagram of the rule hierarchy (Tier 0 platform safety + Tier 1 platform operations + Tier 2 vertical baseline + Tier 3 workspace overlays + Tier 4 per-worker rules) so the author can see exactly which rules will govern their worker.

---

## BRIEF DESCRIPTION OF THE DRAWINGS

(To be supplied with formal drawings prior to filing.)

**Figure 1:** System architecture overview showing the authoring conversational interface, the cannot-harm-code structural constraints, the governance pipeline state machine, and the integration with the platform's existing rule composition and audit chain services.

**Figure 2:** Authoring conversation flow diagram showing the question sequence, the side-panel specification preview, and the user's natural-language inputs at each step.

**Figure 3:** Cannot-harm-code property diagram showing what the authoring worker CAN do (produce structured specifications) and what it CANNOT do (modify code, mutate other tenants' data, elevate privileges, execute arbitrary actions).

**Figure 4:** Governance pipeline state machine with seven stages and the transition rules between them.

**Figure 5:** Cross-vertical authoring patterns showing how the same conversational interface adapts to aviation, healthcare, real estate, automotive, government, and other domains.

**Figure 6:** Compounding effects diagram showing how each successful authored worker improves subsequent authoring sessions through the Knowledge Capture Pipeline.

**Figure 7:** Collaborative authoring flow showing multiple experts contributing to a single worker specification with conflict resolution.

---

## CLAIMS

(Provisional claims; non-limiting.)

**Claim 1.** A computer-implemented worker authoring system for non-engineer domain experts, the system comprising:
   (a) a conversational authoring interface presenting a structured dialog flow asking targeted questions about the worker's purpose, users, inputs, outputs, rules, prohibited actions, data sources, and pricing tier;
   (b) a specification synthesis service producing a structured worker specification from the cumulative answers, in a published schema format, never as executable code;
   (c) a cannot-harm-code property enforced architecturally wherein the authoring conversation cannot modify platform code, mutate other tenants' data, elevate user privileges, or execute arbitrary actions, regardless of inputs received during the conversation;
   (d) a multi-stage governance pipeline comprising at least: intake, research, rules:save, prePublish, submit, admin review, and approved stages, wherein the author cannot self-approve and cannot bypass any stage; and
   (e) an audit chain integration wherein each governance pipeline transition is recorded as a structured event for retrospective reconstruction.

**Claim 2.** The system of Claim 1, wherein the conversational interface adapts its question sequence based on the user's stated vertical, with vertical-specific question patterns injected through a multi-tier rule composition engine.

**Claim 3.** The system of Claim 1, wherein the cannot-harm-code property is enforced through architectural absence of the capabilities that would be required for prohibited actions, rather than through policy filtering of inputs.

**Claim 4.** The system of Claim 1, wherein the governance pipeline integrates with a pre-publish constraint check service that evaluates the produced specification against multi-tier rules before persistence.

**Claim 5.** The system of Claim 1, supporting multi-session authoring wherein partial specifications persist across sessions with each resumption continuing from prior state, and wherein the audit chain captures the full multi-session lineage.

**Claim 6.** The system of Claim 1, supporting collaborative authoring wherein multiple experts may co-author a single worker specification, with the system mediating contribution conflicts and the audit chain capturing per-participant contributions.

**Claim 7.** The system of Claim 1, providing pre-built vertical-specific authoring templates that accelerate authoring by pre-filling typical worker patterns within each vertical including but not limited to aviation, healthcare, real estate, automotive, government, education, financial services, and legal practice verticals.

**Claim 8.** The system of Claim 1, providing author-facing rule visualization wherein the composed rule hierarchy (platform safety, platform operations, vertical baseline, workspace overlays, per-worker rules) is rendered visually for author review before submission.

**Claim 9.** A method for a non-engineer domain expert to author a deployable AI-powered software agent without writing code, the method comprising:
   (a) initiating a conversational authoring session with the system of Claim 1;
   (b) describing the agent's intended purpose in natural language;
   (c) answering structured follow-up questions about users, inputs, outputs, rules, prohibited actions, data sources, and pricing tier;
   (d) reviewing the synthesized specification in a side-panel preview;
   (e) selecting connectors and capabilities from a vertical-appropriate menu;
   (f) confirming the composed rule set;
   (g) submitting the specification to the governance pipeline;
   (h) addressing any pipeline-stage feedback through additional conversation rounds; and
   (i) upon admin review approval, having the worker published as invocable by other platform users.

**Claim 10.** The method of Claim 9, wherein the domain expert completes the entire authoring flow without interacting with code, configuration files, command-line interfaces, or other engineering tooling.

**Claim 11.** The system of Claim 1, wherein each successful authoring session contributes fixtures to a Knowledge Capture Pipeline that improves the conversational interface's question patterns and specification synthesis for subsequent authoring sessions.

**Claim 12.** The system of Claim 1, applied to aviation wherein the conversational interface uses aviation-specific question patterns and pre-built templates for common worker types including pilot decision support, currency tracking, logbook intelligence, and dispatch workflow assistants.

**Claim 13.** The system of Claim 1, applied to healthcare wherein the conversational interface uses healthcare-specific question patterns and pre-built templates for protocol assistants, prior-authorization workflows, clinical decision support, and credential verification workers.

**Claim 14.** The system of Claim 1, applied to real estate wherein the conversational interface uses RE-specific question patterns and pre-built templates for comparative market analysis, title and escrow workflow, lease analysis, and property valuation workers.

**Claim 15.** The system of Claim 1, applied to financial services wherein the conversational interface uses finance-specific question patterns including blue-sky law jurisdiction awareness and FINRA conduct rule compilation.

---

## ABSTRACT

A Build-Without-Code Worker Authoring System for non-engineer domain experts, comprising a conversational authoring interface that asks structured questions about the proposed worker's purpose, users, inputs, outputs, rules, prohibited actions, data sources, and pricing tier; a specification synthesis service producing structured worker specifications (never executable code); a cannot-harm-code property enforced architecturally through capability absence rather than policy filtering, ensuring the authoring conversation cannot modify platform code, mutate other tenants' data, elevate user privileges, or execute arbitrary actions regardless of inputs; a multi-stage governance pipeline (intake → research → rules:save → prePublish → submit → admin review → approved) that the author cannot self-approve or bypass; and audit chain integration recording each pipeline transition. The System enables domain experts (clinicians, pilots, brokers, instructors, compliance officers, and similar professionals lacking engineering literacy) to author deployable AI workers through natural-language dialog. Vertical-specific question patterns and pre-built templates accelerate authoring across aviation, healthcare, real estate, automotive, government, education, financial services, and legal practice. Compounding effects through Knowledge Capture Pipeline integration: each successful authoring session improves the system's question patterns and specification synthesis for subsequent sessions. The System extends prior art governance architecture (cited as foundation) by providing the specific user-experience pattern that makes deployable AI worker authoring accessible to the population of domain experts who hold the most valuable tacit knowledge but cannot code — closing the accessibility gap that has limited prior agent authoring platforms.

---

## INVENTORSHIP AND ASSIGNMENT NOTES

**Named Inventor:** Sean Lee Combs, sole inventor.

**Applicant:** SOCIII Inc., a Delaware C-corporation.

**Strategic significance for fundraise:** This is the accessibility moat patent. The platform's defensibility against ChatGPT, Claude Projects, GPT Builder, and similar competitors rests significantly on the question: who can actually USE these systems to produce deployable workers? The answer is: today, only software engineers. SOCIII's Build-Without-Code pattern extends authoring access to the 99% of domain experts who hold the most valuable expertise but cannot code. Investors evaluating SOCIII's TAM expansion potential should treat this filing as the IP that protects the broader-population go-to-market.

**Cross-filing relationship:** This filing is structurally related to Filing 2 (Knowledge Capture Pipeline) which includes the Terminal Worker safety architecture as one component of a broader pipeline. The present filing focuses specifically on the conversational authoring UX as a standalone claim — different claim scope, different protection, intended to issue as a separate patent.

**Prior public disclosure:** The Build-Without-Code pattern has been operationally present in the SOCIII platform's Sandbox authoring surface since approximately Q4 2025. Limited public visibility through the platform's marketing site and the marketplace listings of workers authored through it. Under 35 U.S.C. § 102(b)(1), the inventor's grace period for prior public disclosures is presumed open for this filing pending counsel review.

---

*End of Filing D draft. Sean to review, refine claim language, and add formal drawings before USPTO submission.*
