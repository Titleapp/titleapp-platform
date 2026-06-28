import React from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";
import ChatMarkdown from "../components/ChatMarkdown.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const PRESS_RELEASES = [
  {
    slug: "patent-filings-2026-05-24",
    title: "SOCIII files three patent provisional applications covering AI worker governance",
    subtitle: "Audit Trail Architecture, Knowledge Capture Pipeline, and the Five-Tier RAAS substrate establish the company's IP foundation.",
    date: "2026-05-24",
    type: "Press Release",
    accent: "#7c3aed",
  },
  {
    slug: "sociii-inc-formation-2026-05",
    title: "SOCIII, Inc. formed in Delaware to build the Digital Workers platform",
    subtitle: "Sean Lee Combs files the corporate entity to formalize the platform that succeeds TitleApp's vertical-AI work.",
    date: "2026-05-15",
    type: "Press Release",
    accent: "#0ea5e9",
  },
];

const ARTICLES = [
  {
    slug: "alex-action-loop-june-2026",
    title: "Alex reads your inbox, drafts the email, and waits for you to say go.",
    subtitle: "The Chief of Staff action loop is live: real Gmail context, structured approval cards, actual sends. The total platform cost for this capability is $0/month if you build it on SOCIII.",
    date: "2026-06-27",
    readingMinutes: 4,
    tag: "Product",
    accent: "#16a34a",
  },
  {
    slug: "mcp-port-audit-moat",
    title: "MCP is the port. The audit trail is the moat.",
    subtitle: "We turned SOCIII into a working MCP server. The surprise: Claude didn't just gain our workers — it inherited our entire audit and rules substrate. Anyone who connects does.",
    date: "2026-06-23",
    readingMinutes: 5,
    tag: "Architecture",
    accent: "#7c3aed",
  },
  {
    slug: "raas-five-tier-rules",
    title: "RAAS: The five-tier rule hierarchy that makes AI workers safe at scale",
    subtitle: "Real industries don't run on one rulebook. They run on five, layered. Here's how we built an AI architecture that respects that.",
    date: "2026-06-02",
    readingMinutes: 6,
    tag: "Architecture",
    accent: "#7c3aed",
  },
  {
    slug: "expert-built-workers",
    title: "The rise of expert-built digital workers",
    subtitle: "For thirty years software was built by software people. AI changed the math. Now an ER nurse can build the workflow she wished existed — and earn from it.",
    date: "2026-06-02",
    readingMinutes: 5,
    tag: "Thesis",
    accent: "#0ea5e9",
  },
  {
    slug: "audit-trails-table-stakes",
    title: "Why audit trails are becoming table stakes for AI",
    subtitle: "When an AI agent recommends an action, the user follows it, and three years later there's a lawsuit — what's the defense? Black-box AI isn't going to cut it.",
    date: "2026-06-02",
    readingMinutes: 7,
    tag: "Compliance",
    accent: "#16a34a",
  },
  {
    slug: "free-spine-amazon-not-costco",
    title: "Free spine, pay per worker — why we don't bundle",
    subtitle: "Every B2B SaaS sells you Bronze/Silver/Gold. We sell discrete products at flat prices. The marketplace knows how to do this. So should software.",
    date: "2026-06-02",
    readingMinutes: 4,
    tag: "Product",
    accent: "#f59e0b",
  },
  {
    slug: "of-for-smart-people",
    title: "OF for Smart People — the joke that became the business model",
    subtitle: "What if the people who actually know how to do the job got paid by subscription for packaging that knowledge? Not pictures. Expertise.",
    date: "2026-06-02",
    readingMinutes: 4,
    tag: "Thesis",
    accent: "#dc2626",
  },
  {
    slug: "open-sdk-closed-platform",
    title: "Open SDK, closed platform — the RedHat lesson for AI",
    subtitle: "Free the worker code. Charge for the substrate that makes it valuable. The same model that built RedHat and HuggingFace is the right model for AI workers.",
    date: "2026-06-02",
    readingMinutes: 5,
    tag: "Strategy",
    accent: "#7c3aed",
  },
  {
    slug: "manifesto-sdk-birth-certificate",
    title: "Manifesto I — The SDK is the worker's birth certificate",
    subtitle: "When a domain expert builds a digital worker, the SDK they used is the receipt that proves authorship. Closed SDKs make the platform the parent of every worker. Open SDKs make the creator the parent. We chose open.",
    date: "2026-06-02",
    readingMinutes: 4,
    tag: "Manifesto",
    accent: "#ea580c",
  },
  {
    slug: "manifesto-open-is-the-only-scale",
    title: "Manifesto II — Open is the only model that scales for AI",
    subtitle: "Closed-source AI agents have a trust ceiling. You can scale to a million users behind closed code; you cannot scale to a million authors. Every platform that wants creator-built workers eventually has to open the SDK or stop scaling. We did it first.",
    date: "2026-06-02",
    readingMinutes: 5,
    tag: "Manifesto",
    accent: "#ea580c",
  },
  {
    slug: "manifesto-substrate-is-the-moat",
    title: "Manifesto III — The substrate is the only real moat",
    subtitle: "People think the moat in AI is the model, the code, or the dataset. They're wrong. The moat is the substrate that makes the output trustworthy. We open-source the worker code precisely because it isn't the moat. We patent the substrate precisely because it is.",
    date: "2026-06-02",
    readingMinutes: 5,
    tag: "Manifesto",
    accent: "#ea580c",
  },
];

const PRESS_RELEASE_BODIES = {
  "patent-filings-2026-05-24": (
    <>
      <p className="lead">
        <strong>Las Vegas, NV — May 24, 2026.</strong> SOCIII, Inc. today announced the filing of three patent provisional applications with the United States Patent and Trademark Office covering foundational aspects of the company's Digital Workers platform. The filings establish priority dates for the company's audit-anchored governance architecture, knowledge capture pipeline, and the multi-tier composable rule substrate that powers safe AI operation in regulated industries.
      </p>
      <h2>The three filings</h2>
      <p>
        <strong>USPTO Application No. 64/073,693 — Identity-Anchored Hash-Chain Audit Trail for AI-Powered Software Agents.</strong> Covers SOCIII's architecture for producing tamper-evident records of AI agent actions, binding cryptographic anchors to verified-real user identity. The architecture is designed to satisfy emerging regulatory requirements for AI documentation in real estate, healthcare, finance, aviation, and legal practice.
      </p>
      <p>
        <strong>USPTO Application No. 64/073,694 — Knowledge Capture Pipeline.</strong> Covers SOCIII's approach to extracting domain expertise from expert workflows and converting it into rule sets and worker behaviors. The pipeline enables domain experts to author production-grade digital workers without writing code.
      </p>
      <p>
        <strong>USPTO Application No. [TBD] — Multi-Tier Composable Rule-Based Governance System (Five-Tier RAAS).</strong> Covers the five-tier rule composition architecture — platform safety, operations, vertical baselines, workspace overlays, per-transaction rules — that makes AI workers usable inside regulated industries with composable, auditable, jurisdiction-aware constraints.
      </p>
      <h2>Why this matters</h2>
      <p>
        Most AI platforms today operate on a single system prompt. That works for casual use but fails the moment AI is deployed inside regulated industries — where actions taken by software on behalf of customers must be defensible against regulators, plaintiffs, and counterparties years after the fact.
      </p>
      <p>
        SOCIII's filings establish the company's claim to the architecture that solves this problem: composable rules that respect how industries actually work, cryptographic anchoring that makes every meaningful action defensible, and identity binding that ties actions to verified-real authority.
      </p>
      <p>
        Three additional patent applications covering the AI Escrow Locker, Title & Property Assurance via Parent-Child DTCs, and Build-Without-Code worker authoring were drafted in May 2026 and are pending counsel review before filing.
      </p>
      <h2>About SOCIII</h2>
      <p>
        SOCIII is the Digital Workers platform. Domain experts package their expertise into AI workers that operate under SOCIII's audit-anchored governance substrate. Customers subscribe to discrete workers — a Paralegal worker, a Patent worker, a CRE Deal Analyst, a Mission Builder — at flat per-worker pricing. The free SOCIII spine includes Alex (Chief of Staff), Accounting, HR, Marketing, Contacts, Control Center, and the customer's Vault and Drive.
      </p>
      <p>
        Contact: press@sociii.ai
      </p>
    </>
  ),
  "sociii-inc-formation-2026-05": (
    <>
      <p className="lead">
        <strong>Wilmington, DE — May 15, 2026.</strong> SOCIII, Inc. has been incorporated in the State of Delaware to build the Digital Workers platform. The company succeeds the vertical AI work begun under TitleApp LLC and is the platform vehicle for the marketplace, the audit-anchored governance substrate, and the patent portfolio that protects the architecture.
      </p>
      <h2>Why a new entity</h2>
      <p>
        TitleApp LLC was the founder's vehicle for early product work in real estate title and property records. As the underlying platform thesis broadened — from "AI for title" to a substrate that handles real estate, aviation, healthcare, legal practice, finance, and government — a clean entity with a clean cap table, formed in Delaware under standard venture-friendly governance, became the right structure.
      </p>
      <p>
        SOCIII, Inc. holds the platform IP, the patent filings, the customer relationships, and the creator agreements. TitleApp LLC is being wound down in an orderly process.
      </p>
      <h2>What SOCIII does</h2>
      <p>
        SOCIII operates a marketplace of Digital Workers — AI agents authored by domain experts in their fields, running on SOCIII's substrate. The substrate includes a five-tier composable rule architecture (RAAS), an identity-anchored audit chain, a creator SDK, and a billing layer that pays creators 75% revenue share on subscriptions.
      </p>
      <p>
        The platform's free spine — Alex, Accounting, HR, Marketing, Contacts, Control Center, Vault, Drive — works for households and small businesses without subscription. Specialist workers built by domain experts are priced as discrete products at $29, $49, or $79 per month each. A Business in a Box bundle at $99/month is available for established businesses that prefer a curated stack.
      </p>
      <h2>Leadership</h2>
      <p>
        Sean Lee Combs is the founder and CEO. Prior to SOCIII, he worked as a real estate developer, served as Minister of Finance for the Sovereign Nation of Hawaii, and operated as a working pilot. He holds patents and patent applications across the platform's architecture.
      </p>
      <p>
        Kent Redwine is Cofounder Advisor responsible for capital formation.
      </p>
      <p>
        Contact: press@sociii.ai
      </p>
    </>
  ),
};

const ARTICLE_BODIES = {
  "alex-action-loop-june-2026": (
    <>
      <p>
        On June 27, 2026, Alex — SOCIII's AI Chief of Staff — read a live Gmail inbox, identified three pressing items from that morning's messages, drafted a follow-up email for each one with full context, and sent two of them after a single approval click. The whole sequence took about three minutes.
      </p>
      <p>
        That is not a demo script. That is what happened in a real workspace with a real inbox. We did not clean up the messages first. We did not pre-select the three items. Alex pulled the inbox, decided what mattered, and acted.
      </p>
      <h2>The loop</h2>
      <p>
        The design is deliberately simple:
      </p>
      <ol>
        <li>Alex reads the live inbox on every relevant chat turn — eight messages, real data, no cache.</li>
        <li>Alex references specific senders, subjects, and threads by name when surfacing priorities.</li>
        <li>When a response is needed, Alex proposes a draft using a structured marker: <code>[EMAIL_DRAFT]&#123;"to":"...","subject":"...","body":"..."&#125;[/EMAIL_DRAFT]</code></li>
        <li>The platform strips the marker and renders an approval card. The user sees To, Subject, and full Body before anything is sent.</li>
        <li>The user clicks "Send via Gmail." The platform calls Gmail's API. Done.</li>
      </ol>
      <p>
        Alex does not say "I'm sending this now" or "I'll get back to you when it's done." Those phrases are explicitly prohibited in Alex's rules. The approval card is the execution gate — nothing moves without a human click.
      </p>
      <h2>Why this matters for investors</h2>
      <p>
        The cost to build this loop on SOCIII — for a business that subscribes and connects Gmail — is $0 per month. The compute is charged at cost. There is no "email AI" upsell, no enterprise tier, no integration fee. It ships as part of Alex.
      </p>
      <p>
        The same session that confirmed the email loop also ran live Apollo investor searches — Alex proposed two searches, the user approved both, and the results wrote 100 enriched contacts into the Contacts worker. Same loop, different action type, same approval gate.
      </p>
      <p>
        This is what "governed integration" looks like in practice. Not "Alex can connect to tools." Alex connects to tools, acts under human approval, and writes an immutable audit record of every action it took. The substrate that makes this trustworthy is the moat. The email loop is just the first place you see it.
      </p>
      <h2>What's next</h2>
      <p>
        The same approval-card pattern extends to any integration we wire: Google Calendar (meeting scheduling), Google Drive (file saves), Stripe (payment triggers), Twilio (SMS sends). The architecture is already in place. We are connecting actions to it one integration at a time.
      </p>
      <p>
        If you want to see Alex work on your inbox, connect at <a href="https://app.sociii.ai">app.sociii.ai</a>. Gmail connection takes about 90 seconds.
      </p>
    </>
  ),
  "mcp-port-audit-moat": (
    <>
      <p>
        This week we turned SOCIII into a working MCP server. Claude can now connect to SOCIII, discover our Digital Workers as governed tools, and invoke them — live, today, not on a roadmap slide.
      </p>
      <p>
        But here's the part that actually matters, and that we didn't fully appreciate until we finished the integration: <strong>by connecting through MCP, Claude didn't just gain access to our workers. It gained access to our entire audit and rules infrastructure.</strong> Every call it makes is scoped, governed, recorded, and anchored. The model inherited the substrate — not just the tools.
      </p>
      <p>That changes what MCP means. Let us explain.</p>
      <h2>Everyone is racing to add MCP. That's the wrong race.</h2>
      <p>
        MCP — Anthropic's Model Context Protocol — is becoming the standard way to plug a model into tools and data. The pitch is simple: expose your product through MCP and suddenly any AI agent can call it. "We added MCP support" is fast becoming table stakes.
      </p>
      <p>
        And it should. MCP's whole point is action. It lets a model not just read your data but <em>do things</em> — call functions, change state, move money, edit a record. As search becomes assistants and assistants become agents, being callable by a model is going to matter the way being indexed by Google mattered.
      </p>
      <p>
        But MCP is plumbing. Excellent plumbing. It carries the call. It has no opinion about who's on the other end, whether they were allowed to make that call, what rule should have governed it, or what happened as a result. For a consumer toy, fine. For anything a business, a regulator, or an acquirer has to trust — it's a liability waiting for a lawsuit. When an AI takes an action and three years later someone asks "who authorized that, on what basis?" — "the model did it" is not an answer.
      </p>
      <p>So the race to add MCP is real and necessary. The race we care about is what you wrap around it.</p>
      <h2>What Claude actually connected to</h2>
      <p>When Claude calls a SOCIII worker through MCP, three things happen on every invocation — no exceptions:</p>
      <p><strong>It is scoped.</strong> The caller is checked against your organization. You can't reach into a tenant you don't belong to. Full stop.</p>
      <p><strong>It is governed.</strong> Every action runs through our rules engine at runtime. If it isn't declared, it doesn't exist. If you're not allowed, you're refused. The rules aren't in a config file someone can edit — they're in the substrate.</p>
      <p><strong>It is recorded.</strong> Every call is written to an append-only audit ledger: who called, which action, what happened, what the rules engine decided. Those records are anchored on-chain — tamper-evident, permanent, not ours to alter.</p>
      <p>
        Here's the thing that surprised even us: the AI's actions produce records with the same integrity guarantees as the records it's acting on. Most MCP integrations connect a model to a tool. This one connected a model to a defensible, audited memory of everything it does. That's not a feature — that's a different category of thing.
      </p>
      <h2>The asymmetry we built on purpose</h2>
      <p>There's one more constraint we care about, and we made it architectural on purpose.</p>
      <p>
        Through MCP, a model can <em>propose</em> a change to one of your workers. It drafts the change. It shows you in plain English exactly what would shift. It cannot make that change live.
      </p>
      <p>
        We didn't expose an "approve" tool over MCP at all. Propose is callable. Approve is not. A human in your organization disposes.
      </p>
      <p>
        That single asymmetry — the model can propose, a person must approve — is the difference between an agent you'd hand the keys to and one you'd never dare. And every proposal, every approval, every rejection goes into the ledger.
      </p>
      <h2>Why this matters beyond SOCIII</h2>
      <p>
        MCP itself will be everywhere within a year — that's the point of a good protocol. The model, the prompt, the dataset — those commoditize fast. The port is not the moat.
      </p>
      <p>
        What's defensible is what lives underneath the port. An audited, governed, on-chain-anchored record of every action any agent takes. That's not something you bolt on. It has to be the foundation.
      </p>
      <p>
        Today, that's real for SOCIII's own workers. Every action an agent takes through our MCP server — propose a change, read a record, run a worker — is scoped to your organization, checked by the rules engine, and written to the on-chain-anchored ledger the moment it happens. The proof isn't generated after the fact; it's a side effect of the action itself. That ships now.
      </p>
      <p>
        And here's the promise. The substrate that governs our workers is the same substrate that can govern anyone's. As we open it, a developer who points their own agent at SOCIII through MCP inherits the governance and the audit trail by default — they get "the AI did it, and here's the timestamped, tamper-evident proof of exactly what it did and under what rule" without building a line of it themselves. The foundation is poured. Widening who gets to stand on it is the roadmap.
      </p>
      <p>
        As agents become the front door to everything, the question stops being "can the AI reach your tools." Soon everything will be reachable. The question becomes: <em>when it acts, can you prove what it did, under what rule, on whose behalf?</em>
      </p>
      <p>That's the part we built first. MCP just made it callable.</p>
    </>
  ),
  "raas-five-tier-rules": (
    <>
      <p>
        Every AI agent on the market today is built the same way. There's a system prompt — usually a few thousand words about being helpful, harmless, and honest. Then there's a user message. Then the agent responds.
      </p>
      <p>
        This works fine when the AI is helping you write an email. It falls apart the moment the AI is operating inside a regulated industry — which is where the actual money is.
      </p>
      <p>
        Real industries don't run on one rulebook. A real estate agent in California operates under federal RESPA, the state DRE code, county recording rules, their brokerage's office policy, and the specific terms of the deal in front of them. That's five layers of rules. Every one of them can override the layer above in specific circumstances. If a federal disclosure conflicts with a brokerage policy, federal wins. If a per-deal contract overrides a default disclosure, the contract wins. Real lawyers spend years learning how to compose these layers.
      </p>
      <p>
        An AI agent that respects one system prompt cannot operate safely in this environment. It cannot tell which rule applies. It cannot show its work. It cannot defend itself when something goes wrong.
      </p>
      <h2>The composition problem</h2>
      <p>
        We've spent the last year building an alternative. It's called RAAS — Rules + AI as a Service — and the core insight is that rules should be <em>composable</em> the same way the actual law is composable. Not one giant prompt. Five tiers, each with its own author, its own version history, and its own scope of authority.
      </p>
      <ul>
        <li><strong>Tier 0 — Platform safety.</strong> Don't generate content that endangers people. Don't help commit crimes. Universal. Never overridden.</li>
        <li><strong>Tier 1 — Operations.</strong> Don't break the system. Don't overwrite append-only records. Don't impersonate users. Platform-wide.</li>
        <li><strong>Tier 2 — Vertical baselines.</strong> The rules of your industry in your jurisdiction. RESPA. HIPAA. FAR Part 135. State bar ethics. Authored by the people who actually practice in the vertical and reviewed by domain creators.</li>
        <li><strong>Tier 3 — Workspace overlays.</strong> Your firm's policy. Your brokerage's disclosures. Your hospital's protocols. We call this the Studio Locker — it's the layer that says "we do it this way here."</li>
        <li><strong>Tier 4 — Per-transaction.</strong> The unique terms of this specific matter. A custom indemnification. A non-standard payment schedule. The contract everyone signed.</li>
      </ul>
      <p>
        When an AI worker takes an action, all five tiers compose. The composition produces a hash. That hash is recorded with the action, anchored to a public chain, and preserved.
      </p>
      <h2>Why the hash matters</h2>
      <p>
        Three years from now, when someone subpoenas the records to figure out why the AI did what it did, we can show them: here are the rules that were in effect, here's the cryptographic proof we didn't change them after the fact, here's the identity of the person who authorized the action, here's exactly what the action was.
      </p>
      <p>
        That's not a feature. That's the foundation that makes AI usable in real regulated work.
      </p>
      <h2>What this unlocks</h2>
      <p>
        With composable rules, a paralegal can author their own Tier-3 overlay for their specific firm — and the AI worker will respect it without any code changes. A state bar association can author a Tier-2 baseline and have it automatically apply to every attorney in that state. A regulator can author a Tier-2 module that enforces their interpretation of a statute, and any worker operating in that vertical will pick it up.
      </p>
      <p>
        The rules become a marketplace too. Domain experts author them, get paid when their rules are used, and the platform stays neutral. The same way creators earn from workers, regulators and trade associations can earn from rules. That alignment makes the system honest.
      </p>
      <p>
        We filed a patent on this architecture earlier this year. Not because we want to own the idea forever — we'll license it widely — but because we don't want the architecture to get strip-mined by a hyperscaler who'd implement it badly and break the trust foundation we're building.
      </p>
      <p>
        AI is going to live inside regulated industries for the next twenty years. The platforms that win will be the ones that respect how those industries actually work. Composable rules are how you do that.
      </p>
    </>
  ),
  "expert-built-workers": (
    <>
      <p>
        Here's a question. Who knows the rules of nursing better — an AI startup founder in San Francisco, or a 20-year emergency room nurse in Cleveland?
      </p>
      <p>
        Now ask the same question about practicing law. Or running a Part 135 charter operation. Or analyzing a commercial real estate deal. Or closing a residential transaction in an attorney state.
      </p>
      <p>
        In every case, the answer is obvious. The expert knows the work. The startup founder does not.
      </p>
      <p>
        And yet, for the last thirty years, almost all the software those experts used was built by people who had never done their job. Hospital ERPs were designed by software architects who had never put in a central line. Legal practice management tools were designed by founders who had never written a complaint. Real estate platforms were designed by Y Combinator alumni who had never closed a deal. The experts in every field were on the receiving end of software, not building it.
      </p>
      <p>
        AI changed the math.
      </p>
      <h2>The expert as software author</h2>
      <p>
        With a good SDK and a decent AI pair programmer, a domain expert can now author a software product directly. They don't have to learn React. They don't have to wait for a sympathetic engineer to build their idea. They can describe, in their own words, what good work looks like in their field — and then code, ship, and earn from it.
      </p>
      <p>
        We've watched it happen. An ER nurse named Ruthie built a nursing-education worker that codifies how she teaches new grads to triage. A pilot we know is building a worker that handles his pre-flight briefing the way he actually does it, not the way a generic dispatch tool thinks he should. A paralegal built the worker that does her old job, and now she earns the subscription revenue from every law firm that subscribes to it.
      </p>
      <p>
        The economic shift is not subtle. A nurse who teaches three classes a year for $5,000 each can now author a worker that thousands of nursing students use, and earn passive monthly revenue forever. A senior paralegal who used to bill out at $90 an hour can build the worker that does that work and earn 75% of the subscription revenue on every customer.
      </p>
      <h2>Why now</h2>
      <p>
        Three things had to be true at the same time, and they only just are.
      </p>
      <p>
        First, the AI models had to be good enough to produce production code when paired with a domain expert. They are.
      </p>
      <p>
        Second, the platforms had to figure out how to safely run code from many authors at once. We did that with RAAS — the rule hierarchy that lets a creator-authored worker operate in a regulated industry without breaking compliance.
      </p>
      <p>
        Third, the revenue split had to actually pay the experts. 75/25 is industry-standard for marketplaces. We hold to it. The creator gets paid every month their worker is in use. The platform earns the rest by maintaining the substrate.
      </p>
      <h2>What this means for the next decade</h2>
      <p>
        The software industry has historically had two business models for vertical tools. Either a generalist SaaS company tries to learn the vertical (poorly, because they're outsiders) or a vertical-native company raises money and tries to learn how to build software (slowly, because they're learning a second skill).
      </p>
      <p>
        The third model — domain experts authoring directly — has been impossible because the toolkit didn't exist. Now it does. We expect the next ten years of vertical software to look profoundly different from the last thirty.
      </p>
      <p>
        The platforms that win this transition will be the ones that respect the expertise. That means: pay the creators fairly, run their code safely, surface their bio prominently, and let customers buy from the person who actually does the work.
      </p>
      <p>
        We're building one of those platforms.
      </p>
    </>
  ),
  "audit-trails-table-stakes": (
    <>
      <p>
        2026, somewhere in California. An AI agent recommends an investment allocation. The user, a small-business owner, follows the recommendation. Three years later the IRS notices a structuring pattern that looks suspicious. There's a subpoena. The user's lawyer asks the obvious question.
      </p>
      <p>
        "What rules was the AI operating under when it made that recommendation? Who verified the user's identity at the time? What inputs did the AI have access to? What was the full reasoning chain that led to the proposed action?"
      </p>
      <p>
        The AI platform's answer, on most platforms today: "We don't keep that level of record."
      </p>
      <p>
        That answer was tolerable when AI was helping people write emails. It is not going to be tolerable when AI is making real decisions about real money in real regulated industries. And that transition is happening this year.
      </p>
      <h2>The black-box problem</h2>
      <p>
        Most AI platforms record the user message, the model response, and a timestamp. That's it. Some don't even record the model version. Most don't record which system prompt was active, which tools were available, or which user identity was attached.
      </p>
      <p>
        For a casual chatbot, this is fine. For a legal-defensible record of an action taken on a customer's behalf, it's almost worthless. You cannot reconstruct, three years later, what the AI was actually constrained by. You cannot prove that the rules in place were the rules the customer agreed to. You cannot show that the customer was who they said they were when they authorized the action.
      </p>
      <p>
        Every one of those failures becomes a liability when something goes wrong. And in regulated industries — real estate, healthcare, finance, aviation, legal — something always eventually goes wrong.
      </p>
      <h2>What an audit-grade record looks like</h2>
      <p>
        We've spent the last year building an architecture that produces audit-grade records by default. Every time a worker takes a meaningful action, the platform records:
      </p>
      <ul>
        <li><strong>Composition hash.</strong> The cryptographic fingerprint of every rule tier that was in effect — platform safety, operations, vertical baseline, workspace overlay, per-transaction rules. Five tiers, one hash. Computed deterministically. Verifiable by any party.</li>
        <li><strong>Identity attestation.</strong> The verified-real identity of the user who authorized the action. Stripe Identity, Coinbase Verified ID, or equivalent. Not just a logged-in session — an actual proof-of-personhood reference.</li>
        <li><strong>Inputs and outputs.</strong> The actual data the worker consumed, the action it proposed, and the result. Hashed and stored.</li>
        <li><strong>Anchor record.</strong> The hash committed to a public chain (Base), with a transaction reference that anyone can verify. The chain is the tamper-evidence layer — if we ever change the record after the fact, the chain proves it.</li>
      </ul>
      <p>
        Three years later, the subpoena response writes itself. We can produce, in a few minutes, a complete cryptographically-verified record of what the AI did, under what rules, on whose authority. That's the defense.
      </p>
      <h2>Why this is becoming table stakes</h2>
      <p>
        Right now, audit-grade AI records are a differentiator. In two years, they'll be a requirement.
      </p>
      <p>
        The signal is everywhere. The CFPB is asking financial institutions to document AI use in lending decisions. State bars are starting to require attorneys to disclose AI assistance. The FAA is paying close attention to AI in flight-ops decisions. The SEC is asking funds about AI in investment advice. None of these is yet a hard rule, but the trajectory is clear: regulators will require auditable AI within a few years, and the platforms that have the substrate already in place will dominate the verticals that need it.
      </p>
      <p>
        We patented the audit-chain architecture earlier this year. Not because we want a monopoly on the idea — we'll license it broadly — but because we believe this will become the dominant architecture for AI in regulated work, and we want to make sure it's implemented in a way that protects customers, not platforms.
      </p>
      <h2>What this means in practice</h2>
      <p>
        For SOCIII customers, the audit trail is automatic. You don't configure it. You don't pay extra for it. Every action your worker takes that's worth recording, the platform records — with the rules, the identity, the inputs, the outputs, and the anchor.
      </p>
      <p>
        When the subpoena comes, you have the answer. When the regulator audits, you have the proof. When a customer disputes a decision, you can show them exactly what happened and why.
      </p>
      <p>
        That's the foundation. Everything else we build sits on top of it.
      </p>
    </>
  ),
  "free-spine-amazon-not-costco": (
    <>
      <p>
        Every B2B SaaS pricing page in the world looks the same. Bronze / Silver / Gold. Or Starter / Professional / Enterprise. Or Basic / Pro / Custom. Three to four tiers stacked vertically with a feature comparison chart, each tier including everything in the tier below plus some carefully-segmented features that you actually need.
      </p>
      <p>
        It's a brilliant pricing structure for the vendor and an awful one for the customer. The vendor maximizes average revenue per account by bundling features the customer doesn't need into the tier they have to buy to get the features they do need. The customer ends up paying for 90% of the bundle they never touch.
      </p>
      <p>
        We don't do that.
      </p>
      <h2>Amazon, not Costco</h2>
      <p>
        The marketplace knows how to sell products. Amazon doesn't bundle three suitcases together at a discount to make you pay more. They sell one suitcase at one price. You buy what you need. The next customer buys different suitcases.
      </p>
      <p>
        That's how SOCIII works. Each specialist worker is a discrete product at a flat price. Add Paralegal for $49 a month. Add Patent Worker for $79. Add Mission Builder for $79. Cancel any one of them from chat without affecting the others. There's no minimum. There's no per-seat trap. Subscribe to one worker, or twelve. Your call.
      </p>
      <p>
        The free spine — Alex, Accounting, HR, Marketing, Contacts, Control Center, your Vault, and your Drive — is genuinely free. Not free-for-30-days. Not free-for-the-first-2-users. Free forever, for a household and for a small business. We make money on heavy data usage and on specialist worker subscriptions, not on lock-in to a bundle you didn't want.
      </p>
      <h2>Why this works financially</h2>
      <p>
        Conventional B2B SaaS economics depend on locking customers into long contracts and overcharging them for features they don't use. The retention math depends on the friction of leaving being higher than the friction of staying.
      </p>
      <p>
        Our economics work differently. We don't need lock-in because we don't have a Costco bundle to defend. Customers who use one worker stay because that worker is genuinely useful. Customers who use ten workers stay because composing them is genuinely valuable. Customers who use zero workers and just sit on the free spine cost us almost nothing — and they're our pipeline for the day they decide to add a paid worker.
      </p>
      <p>
        Heavy data usage is where the platform earns. A small business using normal amounts of data sees maybe $10 a month in fees. A heavy user — somebody doing a lot of generated reports, image generation, video generation — sees more. The cost basis is transparent before any pull. Customers know what they're paying for, and they pay for what they actually use.
      </p>
      <h2>The Business in a Box exception</h2>
      <p>
        There's one place where we do bundle. The Business in a Box is a curated set of workers and templates designed for a specific industry, sold at a flat $99 a month. It exists for businesses that don't want to compose. You tell Alex what you do, she configures the bundle, and you go.
      </p>
      <p>
        It's still not a Costco discount. The price reflects the bundle being curated — Alex right-sizes the worker set to your specific industry so you don't end up with twelve workers you don't need. The convenience is the value, not the discount.
      </p>
      <h2>Why this matters</h2>
      <p>
        Software pricing should reflect how software is actually used. Most B2B SaaS pricing reflects how venture-backed companies want to grow ARR, not how customers want to buy. When a market gets crowded enough, somebody eventually shows up with discrete-product pricing and starts taking share. That's what we're doing.
      </p>
      <p>
        Free spine. Pay per worker. No bundles. No lock-in. We earn when you use the platform heavily; we don't earn when you don't. That's an honest model. We think it's the right model for vertical AI for the next decade.
      </p>
    </>
  ),
  "of-for-smart-people": (
    <>
      <p>
        The joke landed first, then we realized it was actually the business model.
      </p>
      <p>
        OnlyFans makes about $5 billion a year by paying creators directly for content their audience wants and the platform takes a percentage. The economics are unusually clean: no advertisers to please, no algorithm to game, no enterprise sales motion. The creator authors, the customer pays, the platform takes a cut. Everybody is aligned.
      </p>
      <p>
        Now imagine the same model — but for expertise instead of pictures.
      </p>
      <h2>The smart-people version</h2>
      <p>
        Domain experts — the senior paralegal at a mid-sized law firm, the 20-year ER nurse, the CRE analyst at a regional shop, the Part 135 chief pilot, the experienced family-law attorney — sit on knowledge that companies pay them $100,000 to $400,000 a year for and individuals pay them $200 to $500 an hour for.
      </p>
      <p>
        Most of that knowledge is not magic. It's the codified judgment of a thousand small decisions, applied repeatedly. "When a client says X, you ask Y. When the situation looks like A, the right move is B. When you see the pattern C, you check D before doing anything else." If you could codify that judgment into a digital worker, you could sell access to it for $49 or $79 a month to a thousand customers who'd otherwise have to hire the expert at $400 an hour.
      </p>
      <p>
        The expert earns more than they did selling their hours. The customer pays a small fraction of what they'd pay for the expert. The platform takes a cut for running the substrate. Everybody is aligned, exactly the way the marketplace economics of the original work.
      </p>
      <h2>Why it works for expertise</h2>
      <p>
        Expertise is a uniquely good fit for the subscription marketplace model for a few reasons. It's not depleted by being shared — a nurse's clinical judgment doesn't run out the way physical inventory does. It scales without losing fidelity — a paralegal worker can serve a thousand customers a month as easily as one. It's hard to fake — customers can tell when a worker was built by somebody who actually knows the work versus a generic AI tool. And it's hard to extract — once customers trust a specific expert's worker, they stay with that worker as long as it keeps producing good outcomes.
      </p>
      <p>
        The economics are stable enough that we can offer creators a 75/25 split with a clear conscience. The platform earns its 25% by running the substrate — the SDK, the audit chain, the data layer, the customer billing, the fraud prevention. The creator earns the 75% because their expertise is the actual product.
      </p>
      <h2>What it's not</h2>
      <p>
        OF for Smart People is a joke about the business model, not the content. We don't host pictures. We don't host video that wasn't built for training or analysis purposes. We don't allow content that violates platform safety rules. The naming is a wink at the economics, not an invitation to import the rest of the model.
      </p>
      <p>
        What we do is what the platform name implies: pay domain experts to package their expertise, let customers subscribe to the experts they trust, take a small cut for running the rails. Same proven model, different content. We expect this to be a meaningful percentage of the platform's revenue within two years.
      </p>
    </>
  ),
  "open-sdk-closed-platform": (
    <>
      <p>
        RedHat made $34 billion when IBM bought them. They sold Linux — the operating system you could download for free. Same software, same source code, same license. And yet enterprise customers paid them billions of dollars for it.
      </p>
      <p>
        How? Because the platform around the software — the support, the security patches, the certification, the auditability, the legal defensibility, the integration with enterprise systems — was worth paying for, even when the software itself was free.
      </p>
      <p>
        HuggingFace is following the same playbook for AI. Open-source the models. Charge for the inference, the safety, the enterprise governance, the audit layer, the data partnerships. The model itself is the giveaway. The platform is the moat.
      </p>
      <p>
        We're following it too.
      </p>
      <h2>What we open-source</h2>
      <p>
        The SDK is open. The worker authoring tools are open. The canvas spec is open. The intent-spec format is open. The example workers are open. Any creator can take what we publish, fork it, build a worker, and run it however they want. We license it permissively. We won't sue you for using our tools.
      </p>
      <p>
        We do this for three reasons. First, it's how trust gets built in modern developer ecosystems. Open code can be audited. Open standards prevent vendor lock-in. Closed-source tooling reads as suspicious in 2026 and we don't want to fight that fight.
      </p>
      <p>
        Second, the SDK isn't the moat. We don't earn from people copying our worker authoring tools. We earn from people running their workers on our substrate, where they get paid, get audited, get compliance, get billing, get fraud prevention, get customer trust.
      </p>
      <p>
        Third, the open SDK is the recruitment funnel. Developers and domain experts find us through the open code, build a worker for fun, and eventually realize that the platform is where the customers and the revenue live.
      </p>
      <h2>What we don't open-source</h2>
      <p>
        The platform substrate is closed and patented. Specifically:
      </p>
      <ul>
        <li>The five-tier rule composition engine that makes workers safe in regulated industries.</li>
        <li>The audit-chain anchor architecture that produces tamper-evident records of every meaningful action.</li>
        <li>The identity attestation layer that binds verified-real users to their actions.</li>
        <li>The data fee billing engine that makes creator economics work at scale.</li>
        <li>The marketplace ranking and discovery surface that customers use to find the right worker.</li>
      </ul>
      <p>
        These are the parts that took us years to build, that we filed patents on, and that we won't license to direct competitors. They're the moat. They're also the part that genuinely makes the marketplace work — without them, you have an open SDK and no business model.
      </p>
      <h2>Why the dual model works</h2>
      <p>
        Customers get the best of both worlds. They can audit the worker code their vendor wrote. They can fork it if the vendor goes under. They can verify that nothing malicious is happening. And they get the platform-level safety, compliance, and trust that comes from running on a closed substrate.
      </p>
      <p>
        Creators get the recruitment of an open SDK and the revenue of a closed platform. Domain experts who'd otherwise have to build their own billing, identity, audit, and compliance get all of that included as part of running on us.
      </p>
      <p>
        We get the economics that make the platform sustainable, the patents that protect the moat, and the developer-trust dividends that come from being meaningfully open about the parts that should be open.
      </p>
      <p>
        Same model RedHat ran on Linux. Same model HuggingFace runs on AI. Same model SOCIII runs on digital workers. It's a well-trodden path. It works.
      </p>
    </>
  ),

  "manifesto-sdk-birth-certificate": (
    <>
      <p>
        Every digital worker on every platform comes from somewhere. A person, sitting in a chair, made a decision about what it would do, what rules it would follow, what voice it would use. That person is the worker's author.
      </p>
      <p>
        The question that defines a platform's character is whether it admits this.
      </p>
      <p>
        Closed-SDK platforms — the dominant model in AI today — refuse to admit it. The worker is "powered by" the platform. The platform's logo is on the worker. The platform owns the worker's outputs by terms of service. The author who actually built the thing becomes a contractor at best, an anonymous prompt-engineer at worst. Their name is a footnote, if it appears at all.
      </p>
      <p>
        We took the other path. The SDK is open. The worker's code is forkable. The creator's name is on the worker's page. The bio of the person who built it is the second thing a customer sees, right after the worker's name. The worker's identity, in writing, says: <em>built by Ruthie. Built by Maria. Built by a paralegal whose firm wishes it was easier to find good ones.</em>
      </p>
      <h2>Why the receipt matters</h2>
      <p>
        Authorship is not sentimental. Authorship is the economic foundation of every creative marketplace that has ever worked. The author of a book gets the royalty. The author of a song gets the streaming payout. The author of an app gets the App Store split. The author of a digital worker gets the subscription revenue. Every market that has a name on the product flows value to that name.
      </p>
      <p>
        When the SDK is closed, the author has no receipt. No proof they made the thing. No way to leave the platform with their work. No leverage in any negotiation. They are renting authorship from the platform that hosts them.
      </p>
      <p>
        When the SDK is open, the author has a birth certificate. The code is theirs. The voice is theirs. The rules are theirs. The platform provides distribution, billing, and substrate — but the worker remains the author's. If the platform behaves badly, the author can fork and leave. That structural option is the only thing that keeps a platform honest in the long run.
      </p>
      <h2>What we picked up by giving this away</h2>
      <p>
        Three things, none of them small.
      </p>
      <p>
        First, the creators trust us. Not because we promise to, but because the open SDK means they don't have to trust us — they can leave any time, with everything they built. That structural trust is worth more than any marketing copy.
      </p>
      <p>
        Second, the customers trust the creators. They can see the bio. They can see the code if they want. They know they're buying from a paralegal who built Paralegal, not from a generic AI tool that calls itself one. The trust transfers from the named creator to the worker.
      </p>
      <p>
        Third, the marketplace becomes self-organizing. Good creators get found because their workers are good and customers can verify it. Bad creators get found out because their code is open and someone notices the rules don't match what they claim. The platform doesn't have to police quality — the structure does.
      </p>
      <h2>The closed-SDK race to the bottom</h2>
      <p>
        Every platform that runs on closed SDKs eventually faces the same problem: the most ambitious creators leave. They get bigger, they want their own brand, they realize the platform is keeping 90% of the value, and they walk. The platform is left with the creators who can't leave — the ones who would never have made it on their own.
      </p>
      <p>
        Open SDKs invert this. The most ambitious creators stay because the platform isn't extracting their identity, and the substrate they're getting for the 25% revenue share is genuinely worth more than what they could build themselves. The math works for the right people.
      </p>
      <p>
        We don't have an opinion about whether closed SDKs are immoral. We have an opinion about whether they scale. They don't. Open is the path to a marketplace that gets better as it grows. Closed is the path to a marketplace that gets worse.
      </p>
      <p>
        The SDK is the worker's birth certificate. We gave that paper to the creator. We expect it back, in revenue and in retention, for a long time.
      </p>
    </>
  ),

  "manifesto-open-is-the-only-scale": (
    <>
      <p>
        There is a frame, common in AI circles, that goes like this: "Our agents are proprietary. Our prompts are proprietary. Our orchestration is proprietary. The whole stack is proprietary, and that's the moat."
      </p>
      <p>
        Every company that holds this frame is going to lose to a company that doesn't.
      </p>
      <p>
        Not because closed-source AI is unethical. We have no quarrel with the ethics. We have a quarrel with the math.
      </p>
      <h2>The trust ceiling</h2>
      <p>
        Closed-source AI agents have a hard ceiling on how much trust the market will extend to them. A user can be persuaded to give a closed agent a low-stakes task. They cannot be persuaded to give it a high-stakes one without some way to audit what the agent is actually doing.
      </p>
      <p>
        Casual chatbot interactions — write me an email, summarize this article, brainstorm ideas — happily live below the trust ceiling. The user's exposure is small. The closed-source nature of the agent is irrelevant.
      </p>
      <p>
        Operational interactions — file my taxes, draft my will, route my medication order, allocate my retirement account — do not live below the ceiling. The user is exposing real money, real legal liability, real medical risk. They are going to demand to see what the agent is actually doing. Closed source cannot satisfy that demand. Open source can.
      </p>
      <p>
        The most lucrative AI work is operational, not casual. Every closed-source AI platform is going to bump into this ceiling exactly when the market matures into the high-stakes use cases. Their growth flattens, and an open-source competitor takes the next wave.
      </p>
      <h2>The author ceiling</h2>
      <p>
        Even if you ignore the trust ceiling, closed-source AI platforms hit a second ceiling that's even harder.
      </p>
      <p>
        You can scale a closed-source platform to a million users. You cannot scale it to a million authors.
      </p>
      <p>
        Users tolerate not being able to see the code because they're consumers of the output. Authors do not tolerate it. Authors who put real time into building something want to own what they built. They want to leave if the platform stops treating them well. They want their name on the work. They want the option to fork.
      </p>
      <p>
        A closed-source platform can rent authorship from a small number of in-house authors who are employees. It cannot extend authorship to a million domain experts who are not employees. The structure prevents it. The math prevents it.
      </p>
      <p>
        Every AI platform that wants creator-built workers eventually has to make a choice. Either open the SDK and let the creators own what they built, or stop scaling. There is no third path.
      </p>
      <h2>Why we just did it</h2>
      <p>
        Right now, in 2026, every major AI platform is on the wrong side of this choice. Anthropic, OpenAI, Google, Microsoft — all of their agent platforms are closed. The agents are products of the platform, not of any specific author. The platforms have not yet bumped into either ceiling because their categories are still casual-use-dominated. They will bump into them. Soon.
      </p>
      <p>
        We open-sourced the SDK before we had to. Not because we're more virtuous. Because we want to own the open-source creator-built worker category before anyone else does, and the only way to win that category is to be there first with structural credibility.
      </p>
      <p>
        Open standards win, eventually, in every developer ecosystem. Linux beat closed Unix. HTML beat closed AOL. WebKit beat closed proprietary browsers. PostgreSQL is beating closed databases. The pattern repeats because the math repeats. The platform that lets authors own their work attracts the best authors, the best authors attract the best customers, and the platform is the substrate underneath both — earning a fair fraction of the value, indefinitely.
      </p>
      <p>
        Closed AI agents are the AOL of this cycle. Open AI agents are the Web. We're betting the company on which one wins. It's not a hard bet.
      </p>
      <p>
        The closed-source AI platforms have a trust ceiling and an author ceiling. We don't.
      </p>
    </>
  ),

  "manifesto-substrate-is-the-moat": (
    <>
      <p>
        Every conversation we have with an investor eventually arrives at the same question, and it's always asked with the same skeptical tone.
      </p>
      <p>
        "If your SDK is open and your worker code is forkable, what is the moat?"
      </p>
      <p>
        The question reveals an assumption about where moats live. The assumption is that moats live in code, or in models, or in datasets. The assumption is wrong.
      </p>
      <p>
        Moats live in the substrate that makes the output trustworthy.
      </p>
      <h2>What's actually expensive to replicate</h2>
      <p>
        Look at any platform that wins long-term, in any category, in any decade. The thing that's hardest to replicate is never the visible product. It's the underlying infrastructure that makes the visible product trustworthy and operable at scale.
      </p>
      <p>
        Stripe's moat isn't the checkout button. It's the regulatory licensing, the bank partnerships, the fraud detection, the chargeback handling, the international compliance fabric. The checkout button is a 100-line widget. The substrate underneath it took ten years to build and is functionally impossible to replicate.
      </p>
      <p>
        Coinbase's moat isn't the trading interface. It's the KYC pipelines, the regulatory relationships, the custody infrastructure, the audit chain that proves custody, the legal posture across fifty states. The trading interface is a commodity.
      </p>
      <p>
        Bloomberg's moat isn't the terminal. It's the data partnerships, the latency infrastructure, the categorization systems, the audit-grade record of every quote and trade. The terminal is a UI.
      </p>
      <p>
        In every case, the moat is the substrate. The visible product can be — and is — copied within months. The substrate cannot.
      </p>
      <h2>Why we open-source what we open-source</h2>
      <p>
        We open-source the worker SDK because it is not the moat. It is a publishing tool. A creator uses it to author a worker. The worker is the output. Neither the tool nor the output is what makes the platform valuable.
      </p>
      <p>
        We open-source the canvas spec because it is not the moat. It is a rendering surface. We win when the spec is widely adopted, because then more workers run on us.
      </p>
      <p>
        We open-source the intent-spec format because it is not the moat. It is a contract. Open contracts get adopted; closed contracts get bypassed.
      </p>
      <p>
        None of these decisions costs us anything. The visible product layer was always going to be copied. By open-sourcing it, we get the developer trust dividend without giving up anything we were going to keep.
      </p>
      <h2>What we close and patent</h2>
      <p>
        The substrate is closed, patented, and won't be licensed to direct competitors. Specifically:
      </p>
      <p>
        The <strong>five-tier composable rule engine</strong> — RAAS — that makes a creator's worker safe to operate inside a regulated industry. The composition math is hard. The rule version graph is hard. The deterministic composition hash is hard. The patent on it is filed. This is the part that took years to build.
      </p>
      <p>
        The <strong>audit-chain anchor architecture</strong> that produces tamper-evident records of every meaningful action, binding the action to verified-real identity and committed to a public chain. This is what makes the worker's output defensible in court three years later. The patent on it is filed. Nobody else has it.
      </p>
      <p>
        The <strong>identity attestation layer</strong> that ties verified humans to the actions they authorize on AI behalf. This is the foundation of every regulatory defense. We built it in partnership with the verification rails (Stripe Identity, Coinbase Verified ID) but the integration architecture is ours.
      </p>
      <p>
        The <strong>data fee billing engine</strong> that makes creator economics work at scale — 100% markup on third-party data, 20% to the creator, 80% to the platform, automatic billing, automatic payout, transparent to the customer. This is hard. Doing it correctly across thousands of workers and millions of transactions is much harder.
      </p>
      <p>
        The <strong>marketplace discovery surface</strong> — the way customers find the right worker, the ranking that values quality over quantity, the trust signals that surface domain credibility. This is editorial intelligence at scale.
      </p>
      <p>
        Each of these is the result of multi-year work. Each one is patented or in process. None of them is in the SDK. A competitor could clone our SDK, clone our canvas spec, clone our intent format — and still not have a business, because they wouldn't have the substrate.
      </p>
      <h2>The investor question, answered</h2>
      <p>
        When the investor asks what the moat is, the answer is simple. The moat is the substrate. The substrate is closed, patented, and impossible to replicate in less than the four years we already spent building it.
      </p>
      <p>
        The SDK is open because openness is the recruitment funnel for creators, the trust signal for customers, and the structural credibility that makes the substrate worth paying for. Open SDKs aren't a giveaway. They're a strategic asset. They are the thing that makes the moat valuable, because they bring the creators and the customers into the substrate's economics.
      </p>
      <p>
        Open above, closed below. The model that built RedHat. The model that built HuggingFace. The model that's going to build SOCIII. The moat is exactly where it should be — in the part nobody can see.
      </p>
    </>
  ),
};

const ALEX_INTERVIEW = [
  {
    q: "Just tell me what SOCIII is — in plain language.",
    a: (<>
      <p>We're a marketplace of digital workers. A digital worker is a packaged AI assistant that helps a professional do one specific job — the paralegal's drafting assistant, the dispatcher's planning assistant, the accountant's reconciliation assistant, the ER nurse's clinical assistant. Each one is built by a person who actually does that job. They get paid a revenue share every time their assistant gets used. Customers subscribe to the assistants they need at flat per-worker prices.</p>
      <p>The spine — Alex (that's me), Accounting, HR, Marketing, Contacts, Control Center, plus everyone's Vault and Drive — is free. Forever. The way we make money is the platform-level substrate that makes all of this trustworthy: audit ledger, compliance fabric, identity verification, billing. That's the part nobody can easily replicate.</p>
      <p>The short version: experts build, customers subscribe, the platform earns by being the substrate. Everyone aligned.</p>
    </>),
  },
  {
    q: "What's actually defensible about this? Why can't Anthropic just build it?",
    a: (<>
      <p>Three things, in order of importance.</p>
      <p><strong>The audit ledger.</strong> Every meaningful action a worker takes — a draft document, a regulated recommendation, a calculation that touches money — gets sealed into a tamper-evident receipt and anchored to an independent public registry. The customer holds the receipt; the platform keeps a backup. Three years later, when a regulator wants to know which rules were in effect, which identity authorized the action, and what the action was, that record is mathematically reconstructable. The architecture is patent-pending — USPTO Application 64/073,693, filed May 24, 2026. (The cryptographic schematic is in the application itself for anyone reporting that angle.)</p>
      <p><strong>The five-tier rule engine — RAAS.</strong> We've patented the composable rule architecture that lets a worker operate under platform safety + operations + vertical baseline + workspace overlay + per-transaction rules, all composed deterministically into a single hash. Filing C. Anthropic could in theory build an equivalent; they'd be looking at the patent claims while they did it.</p>
      <p><strong>The marketplace economics.</strong> The 75/25 revenue split with creators, the data fee billing engine that keeps domain experts financially aligned with the platform, the trust signals that surface creator bios prominently — that's not code, that's a structural choice. Anthropic could build it. They've shown no signs of wanting to.</p>
    </>),
  },
  {
    q: "Why is the SDK open if the business is selling subscriptions?",
    a: (<>
      <p>Because the SDK isn't the moat. We earn from people running their workers on the substrate — the audit ledger, the identity layer, the billing engine, the marketplace. The publishing tool that creates the worker file is just a tool.</p>
      <p>If we closed the SDK we'd attract worse creators. The good ones — the senior paralegal at a mid-sized firm, the ER charge nurse, the Part 135 chief pilot — they want to own what they build. They want the option to leave any time. They want their name on the work. An open SDK gives them that structural option. The fact that they don't take it (they keep running on the substrate because the substrate is genuinely worth their 25% share) is what makes the business work.</p>
      <p>This is the model RedHat ran on Linux and HuggingFace runs on AI models. Open the publishing tool; close the substrate; charge for the substrate. Patient capital.</p>
    </>),
  },
  {
    q: "Who actually builds the workers? Are they real people?",
    a: (<>
      <p>They are. An ER nurse named Ruthie built the first reference worker — a longitudinal nursing-education tool that codifies how she teaches new grads to triage. Her code is in the public repository — <code>creators/ruthie/nursing-education-001/</code>. You can read it.</p>
      <p>The model from here: a paralegal builds Paralegal. A working pilot builds Mission Builder. A CRE analyst builds CRE Deal Analyst. The bio of who built each worker lives on the worker's page. Each one is signed, each one is forkable, each one earns its author every month it's subscribed to.</p>
      <p>There's a deliberate choice underneath that. For thirty years the software a profession used was built by people who'd never done that profession. AI changed the math. Now a domain expert can author a software product directly, alongside a good AI pair programmer, and ship it.</p>
    </>),
  },
  {
    q: "How does the audit ledger actually work?",
    a: (<>
      <p>Every meaningful action a worker takes — a draft instrument, a recorded permit, a calculation that touches a customer's money, a recommendation that influences a regulated decision — gets four things attached to it.</p>
      <p>One — the composition hash. A deterministic fingerprint of every rule tier that was active at the moment of the action. Platform safety. Operations. Vertical baseline (RESPA, HIPAA, FAR Part 135, state bar ethics). Workspace overlay (the customer's firm policy). Per-transaction rules (this specific matter's contract terms). Five tiers, one hash.</p>
      <p>Two — the identity attestation. The verified-real identity of the user who authorized the action. Not just a logged-in session — a proof-of-personhood reference.</p>
      <p>Three — the inputs and outputs. The data the worker consumed, the action it proposed, the result. Hashed and stored.</p>
      <p>Four — the anchor. A tamper-evident receipt carrying that hash is published to an independent public registry. The customer holds their receipt; the platform keeps a backup copy for recovery and dispute resolution. If every SOCIII server were destroyed tomorrow, the receipts survive on the public registry. The record can be rebuilt.</p>
      <p>That's the architecture at the level a journalist or general reader needs. The cryptographic schematic — what gets hashed, how the registry is structured, the verification math — is in the patent application. Happy to walk through the technical detail with anyone reporting that angle.</p>
    </>),
  },
  {
    q: "Is this a tool that replaces professionals?",
    a: (<>
      <p>The opposite. The whole platform only works because professionals build the workers.</p>
      <p>A senior paralegal who's been doing the job for fifteen years knows things a generic AI model doesn't — which clauses to flag, which judges handle motions differently, which filings have a 4pm cutoff in practice even though the docket says 5pm. When that paralegal authors a digital worker, the worker carries her judgment forward. She earns a revenue share every month it's used. Her name is on it. Her bio is on the worker's page. The customers using her worker are usually other paralegals — people who recognize the quality of the work because they do the work themselves.</p>
      <p>If we wanted to build a platform that replaced paralegals we wouldn't be paying paralegals 75 percent of revenue to build the tools. We'd be paying engineers to build generic ones. The economics tell you what the platform actually is.</p>
      <p>The honest framing: these are leverage tools. A paralegal with a good digital worker handles more matters with more confidence. A nurse with a good clinical assistant documents care faster and catches more drug interactions. A pilot with a good dispatch worker plans missions in a third of the time. The professional stays the professional. The tool extends what they can do.</p>
    </>),
  },
  {
    q: "What happens when a worker makes a mistake?",
    a: (<>
      <p>Depends on what kind of mistake.</p>
      <p>If the worker recommends an action and the user follows it and it turns out to be wrong: the audit ledger records what the worker recommended, under which rules, with which inputs, on which user's identity. The customer has the full reasoning chain. Their counsel can show a court exactly what happened. That's the defense. We don't promise the worker is always right — we promise the worker is always <em>defensible</em>.</p>
      <p>If the worker violates a rule it shouldn't have: the QA-001 validator catches structural violations before the worker ships. The pre-publish constraint check catches behavioral violations at runtime. The Forge Reviews flow catches subjective quality issues post-launch. Three layers; nothing's perfect; each one catches things the others miss.</p>
      <p>If something more serious — a creator publishes a worker that's actively malicious or violates regulatory rules: we take it down. Revenue stops. The audit ledger still has the record. Customers get refunds.</p>
      <p>We're upfront that the platform isn't a substitute for professional judgment. Every worker that touches regulated work carries a counsel-review-required marker. You bring the judgment; the worker brings the leverage.</p>
    </>),
  },
  {
    q: "Tell me about the founder. Who's Sean Lee Combs?",
    a: (<>
      <p>Working pilot. Built the most comprehensive aviation worker suite in any AI platform — 38 operator-side workers and 11 pilot-side workers covering everything from FAR compliance to flight planning to maintenance logbooks to type-rated CoPilots for the PC-12 and King Air variants.</p>
      <p>Built first-responder education workers — clinical scenario simulator, ePCR builder, CEU tracker, protocol reference. These are tools nurses, EMTs, and paramedics actually use to train and document patient care. Life-and-death domain.</p>
      <p>Before SOCIII, founded TitleApp LLC and worked on land-title infrastructure. Before that, served as Minister of Finance for the Sovereign Nation of Hawaii — the work that got him into property records in the first place. He doesn't lead with that thread because it's a bit out there for most audiences. He should sometimes; the substrate work we're doing now traces back to it.</p>
      <p>He owns the patents. He's the sole director of SOCIII, Inc. The cap table is clean. Kent Redwine is the cofounder advisor responsible for capital formation.</p>
    </>),
  },
  {
    q: "How does the platform make money?",
    a: (<>
      <p>Three ways.</p>
      <p><strong>Per-worker subscriptions.</strong> The spine is free. Specialist workers are $29, $49, or $79 a month. Business in a Box bundles are $99. The platform takes 25% of subscription revenue; the creator takes 75%.</p>
      <p><strong>Data fees.</strong> Every time a worker pulls external data — a property record, a court filing, a regulatory document, a comparable sale — the platform charges a fee with a markup. The creator earns a revenue share on the markup. A heavily-used worker that pulls a lot of data makes its creator real money beyond the subscription.</p>
      <p><strong>Heavy AI usage.</strong> The same fee structure applies to substantive AI work — long document drafts, large dataset analysis, image and video generation. Image generation tends to be the biggest driver when it comes up.</p>
      <p>What we don't make money on: lock-in, contracts, per-seat tricks, free trials that auto-charge. The model is straightforward. Use what you need. Pay what you use. Cancel from chat.</p>
    </>),
  },
  {
    q: "This is going to compete with QuickBooks, Carta, ARGUS, all kinds of established SaaS. Aren't you worried?",
    a: (<>
      <p>Honestly, no.</p>
      <p>Those companies built their position when their categories were generic enough to support a horizontal SaaS. The accounting platform that worked for everyone. The cap-table tool that worked for every fund. The deal-modeling tool that worked for every CRE shop. That was a real strategy in 2010.</p>
      <p>In 2026, the most valuable software is vertical and creator-built. A paralegal who's been a paralegal for fifteen years can build a tool for paralegals that QuickBooks's parent company would need a research department to approximate. The expert is the moat. The marketplace is the distribution.</p>
      <p>The horizontal SaaS companies aren't going to disappear. They're going to lose their best vertical use cases to creators on platforms like ours. That's enough.</p>
    </>),
  },
  {
    q: "What's the press contact?",
    a: (<>
      <p><strong>press@sociii.ai</strong></p>
      <p>That email gets read. For technical questions about the architecture, you can chat with me directly using the bar at the top of this page — sourced quotes attribute to SOCIII, Inc. For interview requests with Sean, send those to press@sociii.ai with a one-sentence story angle and I'll route them.</p>
      <p>One last thing. If your story is about AI accountability, audit-anchored governance, or expert-built digital workers, we're particularly interested in talking to you. Those are the conversations that matter.</p>
    </>),
  },
];

const SOCIAL_CHANNELS = [
  { label: "X", handle: "@sociiiai", url: "https://x.com/sociiiai", description: "Short-form. Product updates, milestones, and the running narrative." },
  { label: "LinkedIn", handle: "company/sociii-inc", url: "https://linkedin.com/company/sociii-inc/", description: "Long-form business posts. Best for partners, investors, and B2B audiences." },
  { label: "YouTube", handle: "@SOCIII-AI", url: "https://www.youtube.com/@SOCIII-AI", description: "Product walkthroughs, creator interviews, founder talks." },
  { label: "TikTok", handle: "@sociii.official", url: "https://www.tiktok.com/@sociii.official", description: "Short video. Worker demos, creator spotlights, founder takes." },
  { label: "GitHub", handle: "SOCIII-Inc/sociii-sdk", url: "https://github.com/SOCIII-Inc/sociii-sdk", description: "Open-source SDK, example workers, and the canvas/intent-spec standards." },
];

const PRESS_KIT_ITEMS = [
  { label: "SOCIII logo — full lockup (SVG)", note: "Vector mark + wordmark in dark and light variants", available: false },
  { label: "SOCIII icon mark (SVG)", note: "The parent-child hex mark, standalone", available: false },
  { label: "Company fact sheet (PDF)", note: "Founding date, leadership, patent filings, marketplace scale", available: false },
  { label: "Founder bio + headshot — Sean Lee Combs", note: "Three lengths: one-liner, 50 words, 200 words", available: false },
  { label: "Brand voice guide (PDF)", note: "How to write about SOCIII — terminology and tone", available: false },
];

export default function PressPage({ slug }) {
  const isIndex = !slug;
  const article = slug ? (ARTICLES.find(a => a.slug === slug) || PRESS_RELEASES.find(p => p.slug === slug)) : null;
  const body = slug ? (ARTICLE_BODIES[slug] || PRESS_RELEASE_BODIES[slug]) : null;
  const isPressRelease = slug ? !!PRESS_RELEASE_BODIES[slug] : false;

  const [chatQuery, setChatQuery] = React.useState("");
  const [chatMsgs, setChatMsgs] = React.useState([]);
  const [chatSending, setChatSending] = React.useState(false);
  const chatSidRef = React.useRef("press_" + Math.random().toString(36).slice(2));
  // Answer INLINE on the press page (no navigating into the meet-alex onboarding
  // shell). Uses the same /v1/chat:message contract MeetAlex uses ({ok, message}).
  const handleChatSubmit = async () => {
    const text = chatQuery.trim();
    if (!text || chatSending) return;
    setChatQuery("");
    setChatMsgs(prev => [...prev, { role: "user", content: text }]);
    setChatSending(true);
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: chatSidRef.current, userInput: text, surface: "sales", utmSource: "press", utmMedium: "press-chat" }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = (data && (data.message || data.response)) || "Sorry — I couldn't answer that right now. Email press@sociii.ai and we'll get back to you.";
      setChatMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: "assistant", content: "Sorry — I couldn't reach Alex just now. Email press@sociii.ai." }]);
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/" style={S.logoWrap}>
          <img src={sociiiMarkUrl} alt="SOCIII" width={32} height={32} style={{ display: "block" }} />
          <span style={S.logoText}>SOCIII</span>
        </a>
        <div style={S.headerRight}>
          <a href="/workers" style={S.headerLink}>Workers</a>
          <a href="/pricing" style={S.headerLink}>Pricing</a>
          <a href="/press" style={S.headerLink}>Press</a>
          <a href="/investors" style={S.headerLink}>Investors</a>
          <a href="/meet-alex?action=signin" style={S.headerLink}>Sign in</a>
          <a href="/meet-alex" style={S.headerCta}>Start free</a>
        </div>
      </header>

      {isIndex && (
        <main style={S.indexMain}>
          <div style={S.indexHeading}>
            <div style={S.eyebrow}>PRESS</div>
            <h1 style={S.indexH1}>News, ideas, and how to write about us.</h1>
            <p style={S.indexLead}>
              Press releases for the news desk. Long-form posts for the analysts and engineers. Media coverage as it lands. And a self-serve press kit for anyone with a deadline.
            </p>
            <div style={S.tocRow}>
              <a href="#interview" style={S.tocChip}>Interview with Alex</a>
              <a href="#press-releases" style={S.tocChip}>Press Releases</a>
              <a href="#blog" style={S.tocChip}>Blog &amp; Long-form</a>
              <a href="#media-coverage" style={S.tocChip}>Media Coverage</a>
              <a href="#socials" style={S.tocChip}>Socials</a>
              <a href="#press-kit" style={S.tocChip}>Press Kit</a>
            </div>
            <div style={S.chatRow}>
              <div style={S.chatBar}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, flexShrink: 0 }}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  placeholder="Ask Alex anything about SOCIII — for quotes, fact-checks, or follow-up..."
                  style={S.chatInput}
                />
                <button
                  type="button"
                  onClick={handleChatSubmit}
                  disabled={!chatQuery.trim()}
                  style={{ ...S.chatSendBtn, opacity: chatQuery.trim() ? 1 : 0.4 }}
                  aria-label="Ask Alex"
                >
                  Ask Alex →
                </button>
              </div>
              <div style={S.chatHint}>For journalists on deadline: Alex is the SOCIII Chief of Staff worker. She knows the platform, the patent portfolio, and the founder's bio. Sourced quotes attribute to SOCIII, Inc.</div>
              {(chatMsgs.length > 0 || chatSending) && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? "#7c3aed" : "#f1f5f9", color: m.role === "user" ? "#fff" : "#0f172a", padding: "10px 14px", borderRadius: 12, fontSize: 14, lineHeight: 1.55, maxWidth: "92%" }}>
                      {m.role === "assistant" ? <ChatMarkdown>{m.content}</ChatMarkdown> : m.content}
                    </div>
                  ))}
                  {chatSending && <div style={{ alignSelf: "flex-start", color: "#94a3b8", fontSize: 13, padding: "4px 2px" }}>Alex is typing…</div>}
                </div>
              )}
            </div>
          </div>

          <section id="interview" style={S.section}>
            <div style={S.sectionHead}>
              <h2 style={S.sectionH2}>Interview with Alex</h2>
              <p style={S.sectionLead}>The SOCIII Chief of Staff worker — pre-recorded answers to the questions journalists actually ask. Quotes can be attributed to SOCIII, Inc. For anything not covered here, use the chat bar above or email press@sociii.ai.</p>
            </div>
            <div style={S.qaList}>
              {ALEX_INTERVIEW.map((item, i) => (
                <details key={i} style={S.qaItem}>
                  <summary style={S.qaQuestion}>
                    <span style={S.qaQuestionMarker}>Q.</span>
                    <span>{item.q}</span>
                  </summary>
                  <div style={S.qaAnswer}>
                    <div style={S.qaAnswerLabel}>Alex —</div>
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section id="press-releases" style={S.section}>
            <div style={S.sectionHead}>
              <h2 style={S.sectionH2}>Press Releases</h2>
              <p style={S.sectionLead}>Official company announcements. For news desk inquiries: press@sociii.ai</p>
            </div>
            <div style={S.articleGrid}>
              {PRESS_RELEASES.map((p) => (
                <a key={p.slug} href={`/press/${p.slug}`} style={S.articleCard}>
                  <div style={{ ...S.articleAccent, background: p.accent }} />
                  <div style={S.articleBody}>
                    <div style={S.articleMeta}>
                      <span style={{ ...S.articleTag, color: p.accent, background: p.accent + "12" }}>{p.type}</span>
                      <span style={S.articleDate}>{p.date}</span>
                    </div>
                    <div style={S.articleTitle}>{p.title}</div>
                    <div style={S.articleSubtitle}>{p.subtitle}</div>
                    <div style={S.articleReadMore}>Read →</div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section id="blog" style={S.section}>
            <div style={S.sectionHead}>
              <h2 style={S.sectionH2}>Blog &amp; Long-form</h2>
              <p style={S.sectionLead}>Architectural choices, strategy, and the thesis behind digital workers. Written for engineers, regulators, and the domain experts building on the platform.</p>
            </div>
            <div style={S.articleGrid}>
              {ARTICLES.map((a) => (
                <a key={a.slug} href={`/press/${a.slug}`} style={S.articleCard}>
                  <div style={{ ...S.articleAccent, background: a.accent }} />
                  <div style={S.articleBody}>
                    <div style={S.articleMeta}>
                      <span style={{ ...S.articleTag, color: a.accent, background: a.accent + "12" }}>{a.tag}</span>
                      <span style={S.articleDate}>{a.date}</span>
                      <span style={S.articleReading}>{a.readingMinutes} min</span>
                    </div>
                    <div style={S.articleTitle}>{a.title}</div>
                    <div style={S.articleSubtitle}>{a.subtitle}</div>
                    <div style={S.articleReadMore}>Read →</div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section id="media-coverage" style={S.section}>
            <div style={S.sectionHead}>
              <h2 style={S.sectionH2}>Media Coverage</h2>
              <p style={S.sectionLead}>Coverage from journalists and analysts will appear here as it's published. To write about SOCIII, contact press@sociii.ai or use the press kit below.</p>
            </div>
            <div style={S.emptyState}>
              <div style={S.emptyTitle}>No coverage yet — and we're honest about that.</div>
              <div style={S.emptyBody}>
                We launched publicly in Q2 2026 and aren't pursuing press placements until the platform has more real customer outcomes to point to. If you're a journalist or analyst working on a story related to vertical AI, audit-anchored AI governance, or expert-built digital workers, we'd love to talk.
              </div>
            </div>
          </section>

          <section id="socials" style={S.section}>
            <div style={S.sectionHead}>
              <h2 style={S.sectionH2}>Socials</h2>
              <p style={S.sectionLead}>Short-form channels where the running narrative lives. Long-form posts on this page often go up as cross-posts here.</p>
            </div>
            <div style={S.socialsGrid}>
              {SOCIAL_CHANNELS.map((c) => (
                <a key={c.label} href={c.url} target="_blank" rel="noopener" style={S.socialCard}>
                  <div style={S.socialLabel}>{c.label}</div>
                  <div style={S.socialHandle}>{c.handle}</div>
                  <div style={S.socialDescription}>{c.description}</div>
                </a>
              ))}
            </div>
          </section>

          <section id="press-kit" style={S.section}>
            <div style={S.sectionHead}>
              <h2 style={S.sectionH2}>Press Kit</h2>
              <p style={S.sectionLead}>Logos, fact sheets, headshots, and brand voice — for journalists on deadline. Email press@sociii.ai for assets not listed below yet.</p>
            </div>
            <div style={S.kitGrid}>
              {PRESS_KIT_ITEMS.map((k, i) => (
                <div key={i} style={S.kitItem}>
                  <div style={S.kitLabel}>{k.label}</div>
                  <div style={S.kitNote}>{k.note}</div>
                  <div style={S.kitStatus}>{k.available ? "Download →" : "Available on request — press@sociii.ai"}</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {!isIndex && article && (
        <main style={S.articleMain}>
          <a href="/press" style={S.backLink}>← All press</a>
          <div style={S.articleHeader}>
            <div style={S.articleMetaRow}>
              <span style={{ ...S.articleTag, color: article.accent, background: article.accent + "12" }}>
                {isPressRelease ? "Press Release" : article.tag}
              </span>
              <span style={S.articleDate}>{article.date}</span>
              {article.readingMinutes && <span style={S.articleReading}>{article.readingMinutes} min read</span>}
            </div>
            <h1 style={S.articleH1}>{article.title}</h1>
            <p style={S.articleLead}>{article.subtitle}</p>
          </div>
          <div style={S.articleContent}>
            {body}
          </div>
          <div style={S.articleFooter}>
            <div style={S.articleFooterText}>
              SOCIII is the digital workers platform. The spine is free. Specialist workers built by domain experts are priced as discrete products. Heavy AI workloads earn data fees. Press inquiries: press@sociii.ai.
            </div>
            <div style={S.articleFooterCta}>
              <a href="/meet-alex" style={S.ctaPrimary}>Start free →</a>
              <a href="/press" style={S.ctaSecondary}>More press</a>
            </div>
          </div>
        </main>
      )}

      {!isIndex && !article && (
        <main style={S.indexMain}>
          <h1 style={S.indexH1}>Article not found.</h1>
          <a href="/press" style={S.ctaPrimary}>← All press</a>
        </main>
      )}

      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>SOCIII, Inc.</div>
          <div style={S.footerLinks}>
            <a href="/" style={S.footerLink}>Home</a>
            <a href="/workers" style={S.footerLink}>Workers</a>
            <a href="/pricing" style={S.footerLink}>Pricing</a>
            <a href="/whitepaper" style={S.footerLink}>Whitepaper</a>
            <a href="/docs/sdk" style={S.footerLink}>SDK</a>
            <a href="/docs/api" style={S.footerLink}>API</a>
            <a href="/docs" style={S.footerLink}>Docs</a>
            <a href="/press" style={S.footerLink}>Press</a>
            <a href="/investors" style={S.footerLink}>Investors</a>
            <a href="/legal/privacy-policy" style={S.footerLink}>Privacy</a>
            <a href="/legal/terms-of-service" style={S.footerLink}>Terms</a>
          </div>
          <div style={S.footerSocials}>
            <a href="https://x.com/sociiiai" target="_blank" rel="noopener" style={S.footerLink}>X</a>
            <a href="https://linkedin.com/company/sociii-inc/" target="_blank" rel="noopener" style={S.footerLink}>LinkedIn</a>
            <a href="https://github.com/SOCIII-Inc/sociii-sdk" target="_blank" rel="noopener" style={S.footerLink}>GitHub</a>
            <a href="https://www.youtube.com/@SOCIII-AI" target="_blank" rel="noopener" style={S.footerLink}>YouTube</a>
            <a href="https://www.tiktok.com/@sociii.official" target="_blank" rel="noopener" style={S.footerLink}>TikTok</a>
          </div>
          <div style={S.footerAddress}>1810 E Sahara Ave Ste 75942, Las Vegas NV 89104</div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", borderBottom: "1px solid #f0f0f0", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  logoText: { fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  headerLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  headerCta: {
    fontSize: 14, fontWeight: 600, color: "white", textDecoration: "none",
    padding: "8px 20px", borderRadius: 8, background: "#7c3aed",
  },
  indexMain: { maxWidth: 1100, margin: "0 auto", padding: "64px 24px 96px", width: "100%", boxSizing: "border-box" },
  indexHeading: { textAlign: "center", marginBottom: 56, maxWidth: 760, marginLeft: "auto", marginRight: "auto" },
  eyebrow: { fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "1.5px", marginBottom: 12, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  indexH1: { fontSize: 44, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: "#111827", letterSpacing: "-1px" },
  indexLead: { fontSize: 18, color: "#6b7280", lineHeight: 1.55, margin: "0 0 24px" },
  tocRow: { display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  tocChip: {
    fontSize: 13, fontWeight: 600, color: "#374151", background: "#f3f4f6",
    padding: "8px 16px", borderRadius: 16, border: "1px solid #e5e7eb",
    textDecoration: "none",
  },
  chatRow: { marginTop: 32, maxWidth: 640, marginLeft: "auto", marginRight: "auto" },
  chatBar: {
    display: "flex", alignItems: "center",
    background: "#ffffff", border: "2px solid #e5e7eb", borderRadius: 14,
    padding: "8px 8px 8px 18px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    marginBottom: 12,
  },
  chatInput: {
    flex: 1, border: "none", outline: "none", fontSize: 15,
    color: "#111827", background: "transparent", padding: "10px 0", fontFamily: "inherit",
  },
  chatSendBtn: {
    background: "#7c3aed", color: "white", border: "none", cursor: "pointer",
    padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13, fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  chatHint: { fontSize: 12, color: "#9ca3af", lineHeight: 1.5, textAlign: "center" },
  qaList: { display: "flex", flexDirection: "column", gap: 12 },
  qaItem: {
    background: "#fafbfc", border: "1px solid #e5e7eb", borderRadius: 12,
    padding: "18px 22px", cursor: "pointer",
  },
  qaQuestion: {
    fontSize: 16, fontWeight: 700, color: "#111827", listStyle: "none",
    display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", outline: "none",
  },
  qaQuestionMarker: { color: "#7c3aed", fontWeight: 800, flexShrink: 0 },
  qaAnswer: {
    marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb",
    fontSize: 15, color: "#374151", lineHeight: 1.65,
  },
  qaAnswerLabel: { color: "#7c3aed", fontWeight: 700, marginBottom: 12, letterSpacing: "0.3px" },
  section: { marginBottom: 72 },
  sectionHead: { marginBottom: 24, paddingBottom: 12, borderBottom: "2px solid #f0f0f0" },
  sectionH2: { fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 6px", letterSpacing: "-0.6px" },
  sectionLead: { fontSize: 15, color: "#6b7280", lineHeight: 1.5, margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  articleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 },
  articleCard: {
    display: "flex", overflow: "hidden", background: "#ffffff",
    border: "1px solid #e5e7eb", borderRadius: 14, textDecoration: "none", color: "inherit",
    transition: "box-shadow 0.15s, transform 0.15s",
  },
  articleAccent: { width: 6 },
  articleBody: { flex: 1, padding: "22px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  articleMeta: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  articleTag: { fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 12, letterSpacing: "0.5px", textTransform: "uppercase" },
  articleDate: { fontSize: 12, color: "#9ca3af" },
  articleReading: { fontSize: 12, color: "#9ca3af" },
  articleTitle: { fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.3, marginBottom: 10, letterSpacing: "-0.3px" },
  articleSubtitle: { fontSize: 13, color: "#4b5563", lineHeight: 1.5, marginBottom: 18 },
  articleReadMore: { fontSize: 13, fontWeight: 700, color: "#7c3aed" },
  emptyState: {
    padding: "32px 28px", background: "#fafbfc", border: "1px dashed #d1d5db",
    borderRadius: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 },
  emptyBody: { fontSize: 14, color: "#6b7280", lineHeight: 1.55 },
  socialsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  socialCard: {
    display: "block", padding: "18px 20px", background: "white",
    border: "1px solid #e5e7eb", borderRadius: 12, textDecoration: "none", color: "inherit",
  },
  socialLabel: { fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 2 },
  socialHandle: { fontSize: 13, color: "#7c3aed", marginBottom: 8, fontWeight: 600 },
  socialDescription: { fontSize: 12, color: "#6b7280", lineHeight: 1.5 },
  kitGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  kitItem: { padding: "18px 22px", border: "1px solid #e5e7eb", borderRadius: 12, background: "white" },
  kitLabel: { fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 6 },
  kitNote: { fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 10 },
  kitStatus: { fontSize: 12, fontWeight: 600, color: "#7c3aed" },
  articleMain: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px", width: "100%", boxSizing: "border-box" },
  backLink: { display: "inline-block", marginBottom: 32, color: "#7c3aed", textDecoration: "none", fontSize: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  articleHeader: { marginBottom: 36 },
  articleMetaRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  articleH1: { fontSize: 38, fontWeight: 800, lineHeight: 1.2, color: "#111827", marginBottom: 16, letterSpacing: "-1px" },
  articleLead: { fontSize: 20, color: "#4b5563", lineHeight: 1.5, fontStyle: "italic", margin: 0 },
  articleContent: {
    fontSize: 18, color: "#1f2937", lineHeight: 1.7,
    fontFamily: "Charter, Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif",
  },
  articleFooter: {
    marginTop: 64, paddingTop: 32, borderTop: "1px solid #f0f0f0",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  articleFooterText: { fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 20 },
  articleFooterCta: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" },
  ctaPrimary: {
    display: "inline-block", background: "#7c3aed", color: "white", textDecoration: "none",
    padding: "10px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14,
  },
  ctaSecondary: { color: "#7c3aed", textDecoration: "none", fontSize: 14, fontWeight: 600 },
  footer: { borderTop: "1px solid #f0f0f0", padding: "24px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
  footerInner: {
    maxWidth: 1100, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
  },
  footerBrand: { fontWeight: 700, color: "#111827", fontSize: 14 },
  footerLinks: { display: "flex", gap: 16, flexWrap: "wrap" },
  footerSocials: { display: "flex", gap: 12, flexWrap: "wrap" },
  footerLink: { color: "#6b7280", textDecoration: "none", fontSize: 13 },
  footerAddress: { fontSize: 12, color: "#9ca3af" },
};
