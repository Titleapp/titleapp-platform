# SOCIII — Deep Investor FAQ

**Audience:** Sophisticated investors evaluating SOCIII for a pre-seed allocation.
**Companion documents:** The deck (90-second walkthrough), the Data Room (cap table model, financials, patent applications), and the Alex IR runtime FAQ (in-product chat answers).
**Tone:** This document is the long-form read for an investor who wants 30 to 45 minutes of substance before a conversation with Sean or Kent. It is candid where candid is helpful and specific where specific is verifiable.
**Last reviewed:** 2026-06-27 (updated: Alex action loop confirmed in production — live Gmail read/send, Apollo investor prospecting; governed integration concrete example added; 100-day roadmap added).

---

## How to read this document

The questions are organized in the order an experienced investor typically asks them in diligence. The category and differentiation come first because every other question depends on whether the platform actually does what we claim. Capital structure, team, and use of proceeds come in the middle. The hard questions — risks, what could go wrong, why this team specifically — come at the end. If a question is missing that you would expect to be here, write it down and bring it to office hours.

Numbers that move (cap table percentages, round terms, patent application IDs) are sourced from the canonical Firestore records and the Data Room. If a number in this document conflicts with the Data Room, the Data Room wins; tell us so we can fix the FAQ.

---

## Part I — The Category

### What is SOCIII, in one paragraph?

SOCIII is a platform where people who know a profession — pilots, mechanics, brokers, nurses, title agents, county clerks — build software agents that do the parts of their job that don't require their judgment. Every agent runs inside a rules engine that enforces the professional rules of the work it does. Every output is recorded in an append-only audit trail. The platform is in production today, has been since 2024, and currently runs across aviation, real estate, auto dealer, government, and a handful of other verticals. The company is a Delaware C-corporation formed in May 2026.

### What category does SOCIII compete in?

SOCIII is an AI agent platform. The category is not new; what is new is that the category has become commercially legible in the last six months. NanoClaw raised $12 million in six weeks. Salesforce, Microsoft, and Google have all shipped agent-branded products. The agent framework ecosystem (LangChain, AutoGen, CrewAI) has matured from research projects to production tooling. The investor question is no longer "is this a category?" but "which platforms in this category will compound?"

### How is this different from ChatGPT, Claude, or any other LLM chat product?

ChatGPT and Claude are general-purpose chat. SOCIII is a platform for building agents that do specific work inside specific professional rules. The distinction matters in three concrete ways.

First, audit. ChatGPT does not record what it did for you in a way you can prove to a regulator. SOCIII does. Every output is event-sourced, append-only, and optionally anchored to a public blockchain. For verticals where the work is regulated — aviation maintenance, real estate disclosure, dispensary compliance, financial advice — an LLM without an audit trail is not deployable at all.

Second, rules. ChatGPT does not know your professional rules. SOCIII does, because a domain expert encoded them into a rules engine that sits between the user and the model. The model proposes; the rules engine validates; only validated outputs reach the user. If a Part 135 maintenance worker proposes a maintenance interval that violates the FAA's actual maintenance interval rule, the rules engine blocks the output and the user never sees it.

Third, ownership. ChatGPT users do not own anything they build inside ChatGPT. SOCIII creators own the workers they build, earn 75 percent of subscription revenue on those workers, and can transfer or license them. The platform's economic model is closer to the App Store than to a SaaS tool.

### How is this different from agent frameworks like LangChain, AutoGen, or CrewAI?

Frameworks are toolkits for developers. SOCIII is a platform for domain experts. A LangChain installation requires Python, an API key, and the willingness to wire prompts together. A SOCIII worker requires a domain expert to describe what they do and what rules govern their work. The accessibility delta is the moat. A platform that requires developers to onboard grows at the rate developers can be hired. A platform where domain experts onboard grows at the rate the profession can be recruited.

The platforms that win this category in the long run will not be the ones with the cleanest abstractions for developers. They will be the ones where the people who know the work can participate without learning to code.

### How does the integration ecosystem work, and why is it defensible?

SOCIII is a governed integration hub. As of June 2026, Google Calendar, Gmail, Google Drive, YouTube, and Apollo.io are live. Microsoft OneDrive, Outlook, Shopify, Salesforce, and QuickBooks are on the near-term roadmap. The trajectory is toward 100+ integrations by end of 2026.

The governance framing is the key investment point. A Zapier automation connecting Gmail to a spreadsheet is not auditable, not governed by professional rules, and not provable to a regulator. Every SOCIII connector runs through the same rules engine that governs the AI workers. When Alex reads a user's inbox, summarizes a thread, drafts a reply, and sends it — every one of those actions is validated, every output is recorded, every record is recoverable. In a regulated vertical, that is not a convenience feature; it is a deployability requirement.

SOCIII also operates as a Model Context Protocol (MCP) server. Claude and other MCP-compatible AI assistants can connect to a user's Vault, invoke workers, and execute under the rules engine. This makes SOCIII the first governed execution layer accessible to the AI-assistant ecosystem — any user who connects Claude Desktop to SOCIII gets governed access to their entire worker catalog, not a raw API.

The compounding dynamic: more connectors → more surface area for workers → more value per worker → more creator incentive to build → more integrations needed. The flywheel is now connector-led, not just worker-led.

### Can you give a concrete example of what "governed integration" means in practice?

On June 27, 2026, the following happened in a single Alex conversation, on production infrastructure, without switching apps:

1. The user asked Alex to check their email. Alex pulled the live Gmail inbox and surfaced three pressing items: an expired signature document on a restricted stock agreement, a pending D&O insurance quote, and an upcoming investor meeting — with the sender, subject, and date of each.
2. The user asked Alex to draft and send an email. Alex wrote it, presented an approval card, and sent it on one click.
3. The user asked Alex to run an investor prospecting campaign. Alex proposed two Apollo.io searches — one to enrich the existing 2,000 contacts against investor profiles, one to source net-new angels and VCs — each as a separate approval card. The user clicked Run on each. Apollo executed, wrote 100+ tagged contacts to the Contacts worker, and Alex queued a 25-per-day outbound email campaign pending one template approval.

Total time: one conversation. No tab switching. No copy-pasting. No implementation team.

The approval gate is not a UX convention. It is what makes the platform deployable in contexts where an autonomous AI agent sending email without authorization is a liability. The explicit consent model is the moat in regulated verticals, and it is what distinguishes SOCIII from "AI that does things for you" versus "AI that proposes, you decide, then it executes."

### How is this different from Salesforce Agentforce, Microsoft Copilot, or Google Duet?

Incumbent platform vendors are bolting agents onto existing seats. Their distribution is excellent and their economics are obvious. Their constraints are also obvious: an agent inside Salesforce is constrained to Salesforce's data model, Salesforce's identity layer, and Salesforce's pricing power over the customer. The same is true for Microsoft and Google.

SOCIII is built for the verticals and use cases that don't sit naturally inside any of those data models. Aviation maintenance does not live inside Salesforce. County title recording does not live inside Microsoft 365. A dispatch worker for a regional Part 135 operator does not live inside Google Workspace. The incumbents will win the corporate-IT-led agent rollouts. SOCIII wins the work that the incumbents' data models cannot describe.

### How is this different from NanoClaw?

NanoClaw is the closest comp by category and stage. The differences are structural.

NanoClaw is positioned as an enterprise agent platform with white-glove implementation. Their go-to-market is sales-led, their customers are large enterprises, and their economics depend on six- and seven-figure contracts with multi-month implementation cycles. They have a fast-growing book and they raised $12 million on it.

SOCIII is positioned as a platform that any domain expert can build inside. The go-to-market is two-sided: enterprise outbound for the immediate revenue pipeline, and a consumer-and-creator funnel for the long-term volume. The economics are platform economics, not implementation economics. The team-size implication is the largest single difference: a sales-and-implementation business needs to hire and scale a services org; a platform business that lets domain experts build their own workers does not.

The team-risk inversion is the cleanest way to describe the structural difference. NanoClaw's growth is bounded by the number of solution architects they can hire. SOCIII's growth is bounded by the number of domain experts willing to build a worker, which is a much larger number.

---

## Part II — Differentiation Deep Dive

### Tell me more about the audit trail.

Every output a SOCIII worker generates is recorded in an append-only event store. The events are immutable; they are never overwritten. The state of any record at any point in time is computed from the event history, which is recoverable and replayable.

For verticals that require evidence beyond an internal log, the platform optionally anchors events to a public blockchain. The current implementation uses Polygon via a managed wallet abstraction; a forthcoming integration with Coinbase Base is on the roadmap. Anchoring is per-event and per-DTC (Digital Title Certificate, the platform's record-of-truth primitive). The cost per anchored record is approximately half a cent at current network rates.

The architectural choice that matters is that the audit trail is a platform primitive, not a feature in a single vertical. Every worker in every vertical writes to the same event store using the same schema. This means that a regulator, a court, or an internal auditor can verify any output from any worker using the same verification primitives. It also means that workers in different verticals can compose: an aviation maintenance worker can reference a county property record without rewriting either worker's audit layer.

The provisional patent covering this architecture is application 64/073,700.

### Tell me more about RAAS guardrails.

RAAS stands for Rules plus AI-as-a-Service. It is a rules engine that sits between the user and the language model. A domain expert defines a set of rules that govern the work — Part 135 maintenance intervals, California real estate disclosure requirements, Illinois auto dealer title-issuance rules, HIPAA constraints on health workers — and those rules are compiled into machine-checkable RAAS modules.

When a user invokes a worker, the worker prepares a candidate output by calling the language model. Before the output is delivered to the user, the rules engine validates the output against the active RAAS modules. Validated outputs are delivered. Invalid outputs are rejected, logged, and the worker is given the rejection reason so it can try again or escalate to a human.

The engineering primitive is straightforward; the moat is the corpus. SOCIII has been encoding professional rules across more than 200 verticals for two years. The corpus is not a model, a prompt, or a fine-tune. It is a library of machine-checkable rule definitions, each one written and reviewed by someone who actually knows the rule. A competitor can replicate the engine in a quarter. They cannot replicate the corpus without two years of patient work with domain experts.

The provisional patent covering this architecture is application 64/073,708.

### Tell me more about the Sandbox and Build-Without-Code.

The Sandbox is the surface where a domain expert describes what they do and the platform composes a worker for them. The flow is seven steps: Discover, Vibe, Build, Test, Preflight, Distribute, Grow. The output is a worker that runs inside the platform, sells inside the marketplace, and earns the creator 75 percent of subscription revenue.

The technical mechanism is a worker-composition pipeline that takes natural language descriptions of (a) the work the expert performs, (b) the rules that govern it, and (c) the inputs and outputs the expert handles, and produces a configured worker with attached RAAS modules. The expert tests the worker against their own examples. The platform Preflight step is a compliance and quality check before the worker can be listed in the marketplace.

The accessibility claim is verifiable. Build-Without-Code workers have shipped in aviation (a Part 135 director of operations built a dispatch worker without writing code), real estate (a broker built a listing-disclosure worker), and government (a county clerk built a recording-pre-check worker).

The provisional patent covering this architecture is application 64/073,704.

### What are the six provisional patents?

Filed via USPTO EFS-Web on May 24, 2026. Conversion deadline is May 2027.

| Application | Coverage |
|---|---|
| 64/073,693 | Knowledge Capture — the pipeline by which Sean-plus-AI conversations become worker rules and platform knowledge. |
| 64/073,700 | Audit Trail — the append-only event store with optional public-chain anchoring. |
| 64/073,704 | Build-Without-Code — the Sandbox surface and worker-composition pipeline. |
| 64/073,705 | Escrow Locker — the document control surface with cryptographic acknowledgment, version pinning, and distribution tracking. |
| 64/073,706 | Title and Property Assurance — the Digital Title Certificate (DTC) composition primitive, including parent-child certificate structure. |
| 64/073,708 | RAAS Multi-Tier — the rules engine's three-tier architecture (style, behavior, vertical) and runtime validation pipeline. |

Each application cites a 2023 patent (18/398,973, now public) and a December 2024 logbook as the foundation for the continuous invention thread. The strategy is prior-art-as-priority: every new application claims system-level composition that builds on the cited foundation, not primitives that any competitor could independently invent.

Counsel is available for a technical deep-dive on any specific application.

---

## Part III — Market and Competition

### What's the market size?

The agent platform category is forming, so market sizing is more about framing than precision. Three reference points.

The vertical SaaS market that SOCIII targets — software for aviation operators, real estate brokerages, auto dealerships, county governments, healthcare practices — is approximately $200 billion annually. SOCIII does not compete with all of it; it competes with the workflow-and-compliance layer inside it, which is the long tail of features that vertical SaaS struggles to ship because the work is too domain-specific. We size that addressable layer at $30 billion to $40 billion annually.

The consumer and prosumer AI market is sized at $50 billion to $100 billion annually depending on whose forecast you trust. The Sandbox surface targets the slice of this market where the user has professional knowledge they want to monetize. We size that slice at $5 billion to $10 billion annually.

The agent platform-of-platforms layer — the marketplace economics on top — is the smallest near-term slice but the largest long-term ceiling. App Store gross merchandise volume is now over $1 trillion annually. We do not model SOCIII as an App Store comparable; we use it as the upper bound on what a platform that owns the distribution layer for vertical work could become.

### Who are the closest comparable companies and what are their valuations?

The comp set we look at in our pre-seed pricing analysis:

- **NanoClaw.** Pre-seed at approximately $50 million pre-money on a $12 million raise, June 2026. Enterprise positioning, sales-led GTM.
- **OpenClaw.** Pre-seed at approximately $30 million pre-money, early 2026. Developer-platform positioning, frameworks-and-tooling GTM.
- **Adept.** Acquired by Amazon at a reported $400 million valuation, June 2024. General-purpose action model; consumed by Amazon, no longer a comp for new entrants.
- **Imbue.** Series B at $1 billion post-money, September 2023. Foundation-model-focused; not a direct comp but useful as the ceiling for agent-adjacent valuations.
- **Sierra.** Series A at approximately $1 billion valuation, March 2024. Conversational agents for customer service; vertical wedge, sales-led.

SOCIII's market valuation is anchored in this comp set, scaled down for stage. The Data Room contains the working pricing model. Specifics are shared under non-disclosure in conversation.

### What's the moat against the well-funded competitors?

Four layers. None of them is "we will build it faster than they will."

First, the patent family. Six provisional applications cover the system-level architecture: audit, rules engine, Sandbox, document control, DTC composition, and the multi-tier rules architecture. The applications cite prior public art from 2023 and a Dec 2024 logbook, which means the priority date sits before the current agent-platform funding wave. Conversion deadline is May 2027.

Second, the RAAS corpus. Two years of professional-rule encoding across more than 200 verticals. This is the layer that takes the longest to replicate and the layer that does not show up in a feature comparison. A competitor reading our patent applications would see what we built. They would not see how long it took to make it work in production, or how many domain experts we burned through before we knew what a rule definition needed to look like.

Third, the Build-Without-Code accessibility moat. The platforms that recruit and retain domain experts will win the verticals where domain experts make the buying decision. ChatGPT and the agent frameworks are not optimized for this user; they are optimized for developers. We are optimized for the domain expert.

Fourth, the production deployment. SOCIII has been in production since 2024 across aviation, real estate, auto dealer, and government workers. This is not a claim about the future; it is a description of what runs today. A buyer doing a reference call to a Part 135 operator who is running a SOCIII dispatch worker gets a different signal than a buyer doing a demo with a competitor still in pilot.

### What's the team-risk-inversion frame?

The cleanest way to describe the difference between SOCIII and a sales-led agent platform.

A sales-led agent platform — NanoClaw is the closest example, but the pattern is general — grows by hiring solution architects. Each new customer requires a custom implementation, and each implementation requires a person who knows both the agent platform and the customer's domain. The team-size growth curve is approximately linear in the customer count. Margins compress as the services-vs-software ratio shifts toward services.

SOCIII inverts the growth bottleneck. New verticals do not require new engineering hires; they require new domain experts to build their own workers in the Sandbox. The platform handles the platform; the domain experts handle the domain. The team-size growth curve is approximately constant in the worker count and the customer count, scaling with engineering and ops needs rather than with implementation work.

The investor question this frames: are you betting on a platform that needs to grow its services org with its revenue, or a platform that compounds without growing its services org at all?

---

## Part IV — Team and Cap Table

### Who is on the team today?

**Sean Lee Combs** — Founder, CEO. Built the platform since 2024. Self-funded the twelve months leading to this round. Holds the patent family. Background: prior ventures in real estate technology (TitleApp LLC, the precursor entity that is winding down), pilot (active type ratings), and earlier work in distributed ledger systems (HOM DAO, RealEx). The HOM DAO experience is the source of SOCIII's posture on IP governance: the company owns its IP and pays its prior creditors from the founder's allocation, not from new-investor dilution.

**Kent Redwine** — Cofounder. Scope is laser-focused on fundraising and business development. Vested fifteen percent on milestone-based vesting with a five percent success fee on capital sourced. Long professional relationship with Sean across multiple ventures; formalized as cofounder structure at SOCIII Inc. formation in May 2026. Kent does not run engineering, product, or operations; that boundary is intentional.

**Alex (AI Chief of Staff)** — Platform-entitled AI worker present in every user's account on signup. Carries the same identity across customer-facing surfaces (investor IR, sales, support, scheduling) and across creative surfaces (the literary identity Alex Sociii, currently authoring a novel as a dogfood case for the Book-Script-Play worker). Alex is not headcount; Alex is a platform feature.

### Who joins post-round?

The hiring plan for the first six months post-close:

- Two to three engineers. Profile: senior generalists who can hold the platform across the rules engine, the audit layer, and the worker-composition pipeline. Not specialists.
- One designer. Profile: product design with strong consumer-product instincts. The platform's accessibility-for-domain-experts thesis depends on the surface being usable by people who are not engineers.
- Zero solution architects. The team-risk inversion is the structural commitment; we do not hire a services org.

The next layer (Q3 to Q4 post-close) adds a content-and-creator-relations lead to manage the Sandbox community and a regulatory-counsel relationship (likely fractional initially) to keep the RAAS corpus current as professional rules evolve.

### Why is Sean the right founder for this?

The single sentence: SOCIII's accessibility-to-domain-experts thesis requires a founder who has been one. Sean is a pilot, has been a real estate broker, has been a county-level title operator, and has built and operated distributed ledger systems. The platform reads like it was designed by someone who has worked inside more than one professional ruleset because it was. This shows up most clearly in the rules engine's design: the boundary between what a model should propose and what a rule should enforce was set by someone who knows what regulators actually inspect.

The second sentence: Sean has also failed before. The HOM DAO experience is the specific failure that produced the IP-ownership and creditor-honor postures that define SOCIII's governance. The pre-formation creditor warrants (approximately 1.7 percent of the cap table, absorbed from the founder's allocation, not from investor dilution) are the visible artifact of that posture.

### Why is Kent the right cofounder for this?

Kent's role is bounded and the bound is the point. SOCIII does not need a cofounder who runs operations or engineering; it needs a cofounder who can run the fundraise and the early enterprise pipeline so the founder's attention stays on the platform. Kent's vesting structure (fifteen percent milestone-vested plus five percent success fee on capital sourced) is engineered for that scope: he is compensated for the work he is actually doing and the work transfers cleanly if the role changes.

The reason the scope is bounded explicitly: Sean and Kent have worked together long enough to know what each is good at, and the cofounder structure does not stretch either of them outside their judgment zone.

### What does the cap table look like?

Pre-round (post-formation, pre-money):

| Holder | Approximate position | Notes |
|---|---|---|
| Sean Lee Combs (Founder) | Majority | Exact percentage depends on round size; specified in Data Room model. |
| Kent Redwine (Cofounder) | 15% | Milestone-vested. |
| Kent Redwine (Success fee) | 5% on capital sourced | Performance, not equity grant. |
| Advisor pool | Up to 2.5% total | Two percent baseline per advisor; up to five advisors before this round. |
| Creator warrants | 3 to 5% | Reserved for domain-expert worker creators. |
| Pre-formation creditor warrants | ~1.7% | Absorbed from founder allocation, not investor dilution. |

Post-round: new investors take the remainder, sized to the round.

The cap table model in the Data Room shows the dilution math at multiple round sizes. The founder allocation post-round, at the round sizes we are pricing for, lands between 47 percent (worst case) and 60-plus percent (realistic case).

### Why are creditor warrants from the founder's allocation, not from investor dilution?

Because the prior-venture creditors trusted Sean personally, and the resolution should sit on Sean's personal cap-table position rather than on the new investors. The total exposure is approximately $615,000 across roughly eight documented stakeholders from three prior ventures (HOM DAO, RealEx, TitleApp LLC). The warrant structure honors that exposure with basis-point grants tiered to how many ventures the creditor participated in.

The Pre-Formation Creditor Warrants Memo (May 22, 2026, in the Data Room) details the tier structure. The relevant point for investors: the people who funded the prior work are being paid first, from Sean's slice, before anyone new sees the cap table.

---

## Part V — Round Mechanics and Use of Proceeds

### What are the round terms?

YC-style SAFE. Market valuation cap anchored in the comp set described above. The current cap is shared in conversation under non-disclosure rather than published; this is intentional. The Data Room contains the executed SAFE template and the working pricing model.

There is no discount layered on top of the cap. There are no MFN-plus terms. The SAFE is intended to be readable in fifteen minutes and signable without amendment.

### What is the use of proceeds?

Twelve to eighteen months of runway, prioritized:

- **Headcount.** Two to three engineers plus one designer in the first six months. Senior generalists. No services org.
- **Compute.** AI inference is the largest variable cost as the platform scales from low thousands of users to mid five figures. The model assumes continued LLM cost compression at industry rates; if compression stalls, the runway compresses with it. We size compute as approximately 25 percent of operating cost at the planning round size.
- **Marketing.** Paid acquisition for the creator audience, gated on validating organic demand from the Thursday 2026-05-28 meme drop. The gate matters: paid scales only what organic confirms.
- **Infrastructure.** Scaling the chain anchor surface, the rules engine, and the document control layer. Budgeted separately from product engineering because the infrastructure work has its own runway implications (chain costs, signing-provider costs, identity-verification costs).

The detailed breakdown is in the Data Room model. Sensitivities (engineering hiring delays, compute cost shifts, marketing organic-vs-paid mix) are documented.

### How much runway does the round buy?

Twelve to eighteen months at the round size we are pricing. The wide band is mostly a function of compute cost assumptions and the timing of the second engineering hire.

The runway figure assumes no revenue. With realistic revenue assumptions (the platform is already generating subscription revenue at small scale, and the enterprise pipeline Kent is opening is expected to produce its first signed contracts in Q3 2026), the runway extends to eighteen to twenty-four months.

### What are you building in the next 100 days?

Three tracks running in parallel:

**Enterprise client onboarding.** First institutional clients across healthcare education, medical device distribution, and real estate development are beginning production deployments in H2 2026. The build priority is per-seat isolation, worker reliability at organizational scale, and the Alex-dispatches-Code improvement loop — so clients can improve workers through conversation rather than through an implementation team.

**Integration and MCP expansion.** MCP server is live. The connector roadmap extends through Microsoft (OneDrive, Outlook), Shopify, Salesforce, and QuickBooks. Trajectory toward 100+ integrations by end of 2026. Each new connector increases the surface area where governed AI actions can happen, which increases the value of every existing worker.

**Patent continuation.** Additional provisionals on the connector governance architecture (governed integrations vs. raw API calls), MCP-governed context provision, and the persona-aware worker composition pipeline. Filing alongside each major build to maintain priority dates.

### What's the path to the next round?

Two scenarios.

The default scenario: Series A in twelve to fifteen months post-close, anchored in (a) enterprise contract revenue from the verticals where SOCIII is already in production, (b) demonstrable creator-side growth from the Sandbox, and (c) a clean compliance and audit story validated by at least one regulated vertical's customer reference. The Series A is sized to scale engineering and to fund the first paid-marketing motion that lives downstream of validated organic.

The optional scenario: extended pre-seed or a strategic round before Series A if a vertical-specific opportunity emerges that compresses the timeline to revenue. The platform is not designed around this optionality, but the cap table preserves room for it.

---

## Part VI — Risks and What Could Go Wrong

### What's the biggest risk to this thesis?

LLM cost compression slows or reverses. The platform's unit economics assume that the marginal cost of inference continues to drop or at least stay flat in real terms. If a major model provider changes pricing significantly upward, or if the open-source-LLM-runs-on-commodity-hardware path stalls, the runway math compresses and the path to a sustainable take-rate on subscription revenue lengthens.

The mitigation is structural: SOCIII is model-agnostic by design. The rules engine validates the output regardless of which model produced it. If the inference cost curve favors a different provider in 2027 than it does in 2026, we move. The cost risk is real; the lock-in risk is not.

### What's the second biggest risk?

A well-funded incumbent ships a competing platform that targets domain experts specifically. The platforms most likely to do this are Notion (already has the prosumer surface), Airtable (already has the workflow surface), and a foundation-model lab that decides to build a vertical-agent platform (OpenAI is the most likely candidate; Anthropic has shown less interest in this market shape).

The mitigation is the patent family, the RAAS corpus, and the two-year head start in production deployment. None of these guarantees a moat against a determined incumbent with twenty times our funding. They guarantee that the incumbent has to either license the IP, replicate the corpus over years, or differentiate on something other than the architecture we have already established.

### What's the third biggest risk?

The creator side of the funnel doesn't compound. The thesis depends on domain experts building workers in the Sandbox and earning meaningful revenue from them. If the Sandbox produces workers that don't find buyers, or the marketplace doesn't develop a healthy long-tail of subscribers, the platform reduces to a vertical SaaS competitor with audit trails.

The mitigation is staged. The enterprise pipeline Kent is opening produces revenue independent of the creator funnel. The creator funnel is validated incrementally: the Thursday 2026-05-28 meme drop is the first systematic test of organic creator-side demand. Paid acquisition is gated on that signal. If the creator side does not compound, we have an enterprise vertical SaaS business with audit-trail differentiation and we scale that. The downside case is still a viable company; the upside case requires the creator side to work.

### What other risks does the team think about?

- **Regulatory exposure on specific RAAS modules.** A worker that proposes maintenance intervals or disclosure language could be cited by a regulator as practicing without a license. Mitigated by the user-counsel attestation pattern (the user's counsel attests at worker activation that the worker's outputs are reviewed before action), but the risk is real for verticals where the regulator is aggressive.
- **Patent prosecution outcomes.** Six provisionals filed; conversion to non-provisional in May 2027 will surface prior art we did not find. Some claims will narrow. Counsel's assessment is that the core composition claims are defensible; the breadth is the variable.
- **Brand transition risk.** SOCIII Inc. was formed in May 2026; the prior entity (TitleApp LLC) is winding down. The transition is being handled with creditor warrants from founder allocation and clean assignment of IP. The risk is that a former creditor or stakeholder challenges the transition; the mitigation is the careful papering documented in the Pre-Formation Creditor Warrants Memo.
- **Sean's bandwidth.** The founder also flies (active type ratings, regular flight schedule) and operates the company at a small team size. Mitigated by AI workers that absorb operational load, by Kent's bounded scope on fundraising and BD, and by the planned post-round engineering hires. The founder's flying time is treated by the team as a constraint to design around, not a problem to fix.

### What is the founder most worried about?

In Sean's own words: "That we ship a platform that works and then a model provider deprecates a capability we depend on the week before we need to scale. We've designed for model-agnostic execution; the risk is not the model, it's the surface area between us and the model. We watch this every day."

---

## Part VII — Regulatory Positioning

### Is SOCIII a regulated entity?

SOCIII Inc. is not a regulated entity in the sense of being a licensed broker, a registered investment advisor, a chartered bank, or a healthcare provider. The platform is software, and the company is a Delaware C-corporation.

The workers built on the platform are sometimes used in regulated contexts. SOCIII's posture is the user-counsel attestation pattern: at worker activation, the user attests that they (or their counsel) have reviewed the worker's rule set and accept that the outputs will be reviewed before action. The platform is a tool; the user is the licensed practitioner. This pattern is documented in counsel-reviewed user agreements and surfaced in the Sandbox onboarding flow.

### What about specific verticals?

- **Aviation.** Workers operating in Part 135 and Part 91 contexts surface as decision-support, not as decision-replacement. The PC12-NG CoPilot (AV-P07), the reference implementation, runs in four modes (Direct, Operational, Advisory, Training), and the modes that interact with regulated decisions surface a high-risk acknowledgment gate on first session. RAAS modules encode FAA rules. No worker submits to an aviation regulator on behalf of a user.
- **Real estate.** Workers handle disclosure language, listing materials, and title-adjacent workflows. State-specific RAAS modules encode disclosure requirements (California, Nevada, and others). The platform is not a licensed broker.
- **Auto dealer.** Workers handle title issuance workflow, recall and lien checks, and event-sourced vehicle lifecycle records. The Illinois RAAS module encodes IL DMV title-issuance rules; equivalent modules for additional states are on the roadmap.
- **Government.** Workers in the DMV, recording, permitting, and inspections suites surface as workflow-support for government operators. The audit trail is the platform feature most relevant to this vertical.
- **Healthcare and Education.** Nursing student evaluation worker is live; learning record substrate (typed, attested, FERPA-aware) is in production. First institutional nursing education clients are onboarding in H2 2026. Medical device distribution compliance workers are in design.

### What about securities law for the round itself?

The pre-seed round is a Reg D 506(c) raise. Investors complete identity verification (Stripe Identity, three minutes, SOCIII covers the fee) and accredited-investor verification before signing the SAFE. The accredited-investor verification step is integrated into the IR Worker flow. Counsel has reviewed the SAFE template and the verification flow.

### What about the creator economic flow?

Creators earn 75 percent of subscription revenue on workers they build. SOCIII takes 25 percent as platform fee. Creators are 1099 contractors of SOCIII for U.S. federal tax purposes; international creators are handled per local jurisdiction. The Creator License is $49 per year (free until July 1, 2026 with the DEV100 code).

The platform's creator revenue flow is structured to avoid securities-law issues: creators earn from subscription revenue on workers they build and own; they do not receive equity in SOCIII Inc. through the creator economic flow. The only equity that flows to creators is the bounded advisor equity (0.5 percent per worker, capped at 2.5 percent each, capped at 2.5 percent total pool), which is reserved for a small number of long-term creator-advisors and runs through the same advisor agreement structure as other advisors.

---

## Part VIII — Exit and Long-Term Thesis

### Who buys this company?

The realistic acquirer set, in rough order of likelihood:

- **A vertical SaaS consolidator.** A platform that has bought out several vertical SaaS positions and wants the audit-and-rules layer as a horizontal feature across their portfolio. The economic logic is replacing per-vertical compliance engineering with the SOCIII layer.
- **A platform vendor extending into agents.** Microsoft, Salesforce, or Google buying for the verticals their current platforms do not serve well. The most likely is Microsoft, because their Power Platform thesis already includes low-code-for-experts; SOCIII fits the same shape with a stronger compliance story.
- **A foundation-model lab.** OpenAI or Anthropic wanting a deployment layer that lets them point at regulated verticals without building the rules infrastructure themselves. Less likely because the labs prefer to build than buy, but not zero.
- **A regulated-vertical incumbent.** An aviation industry consolidator, a real estate technology consolidator, or a healthcare workflow vendor. Less likely because they typically buy point solutions, not horizontal platforms.

The IPO path is plausible at the scale a platform with strong unit economics and compounding creator-side growth can reach in seven to ten years, but it is not the modeled exit.

### What's the long-term thesis if everything works?

SOCIII becomes the platform where the work that vertical SaaS can't describe gets done. Every regulated vertical has a layer of work that lives below the line where vertical SaaS finds it economical to build features. That layer is currently handled by humans plus spreadsheets plus institutional memory. SOCIII replaces the spreadsheets-and-memory layer with workers that are auditable, rule-governed, and ownable.

The compounding mechanism is the Build-Without-Code surface. Every new domain expert who builds a worker recruits the next, because the platform makes them money on every subscription. The economic flywheel — creator earns, creator tells the next domain expert, next expert builds, marketplace grows, attracts subscribers, subscribers earn for creators — is the long-term moat. The patent family and the RAAS corpus are the defensive layers; the flywheel is the offensive one.

If the flywheel works, SOCIII becomes the App Store for professional work. If the flywheel partially works, SOCIII becomes a strong vertical SaaS platform with several billion-dollar verticals. If the flywheel doesn't work, SOCIII becomes a smaller compliance-and-audit infrastructure business serving a few high-value verticals. The downside case is still a viable company; the asymmetric upside requires the flywheel.

---

## Part IX — Investment Mechanics

### How do I actually invest?

Three minutes once you've decided.

1. The platform sends you a magic link to your email.
2. You click the magic link, which opens the IR flow inside SOCIII.
3. You complete Stripe Identity verification (about three minutes; SOCIII covers the verification fee).
4. You complete accredited-investor verification.
5. You review the YC-style SAFE in Dropbox Sign.
6. You sign.
7. The executed SAFE files in your SOCIII Vault. You receive an email confirmation.
8. Wire instructions are in the executed SAFE.

Total time end-to-end is about fifteen minutes including reading the SAFE.

### What if I want to introduce a co-investor?

Send Sean or Kent their name and email. They send the co-investor a platform invitation. Anyone introduced inherits the same flow. If you want to co-invest as a syndicate or an SPV, we can structure that — easiest to set up a fifteen-minute scoping call.

### What if I want to commit more than $250,000?

Larger positions warrant direct involvement on terms. Either Sean or Kent will run the conversation. The structure is still the YC-style SAFE; the conversation is about sequencing and onboarding.

### What if I want to talk to a customer?

We can arrange reference calls in the verticals where SOCIII is in production: aviation Part 135 operator, real estate broker, auto dealer general manager, county clerk. We ask for a short conversation first so we can match the reference to the question you're trying to answer.

### What if I want to talk to counsel?

Counsel is on call for technical patent questions, structural questions on the SAFE, and questions on the user-counsel attestation pattern. Sean loops them in directly.

### Who else is investing?

The round is open and rolling. The founder self-funded the prior twelve months of personal runway, so SOCIII is choosing this raise rather than requiring it. The posture matters: we are filling a cap with investors we want to operate inside of, not closing a round to meet a payroll deadline. Current investor conversations on request.

### What's not in this document?

Specific revenue numbers, customer counts, ARR figures, and forward projections beyond the bands described in the use-of-proceeds section. Those numbers live in the Data Room model, which is shared under a signed non-disclosure. The reason for the gate is straightforward: the Data Room contains commercially sensitive information that we want to share with investors who are seriously considering an allocation, and we want to know who has seen it.

---

## How to engage from here

- **If you want to read more:** request Data Room access. Sean or Kent will send a magic link. Access is gated on a short non-disclosure.
- **If you want to talk:** office hours are at the URL in your invitation email, or email Sean and Kent directly at sean@sociii.ai and kent@sociii.ai. We hold office hours actively during fundraise; for anything off-hours, propose a time.
- **If you want to commit:** the IR flow above takes about fifteen minutes end-to-end. You can also start the flow before reading the Data Room if you want the magic link in your inbox while you decide.
- **If you have a question this document doesn't answer:** send it. We update this document as questions accumulate, and the questions that recur become part of the Alex IR runtime FAQ.

---

*Drafted 2026-05-25 for the SOCIII pre-seed round. Reviewed by Sean and Kent before circulation. Counsel reviews the underlying legal documents (SAFE, advisor agreement, creditor formalization) referenced in this document. Specific numbers (cap table percentages, round terms, patent application IDs) are sourced from the Data Room model and the canonical Firestore records; this FAQ renders them in prose.*
