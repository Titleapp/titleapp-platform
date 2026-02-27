# TitleApp — Company Knowledge Base
## For Alex (Investor Relations AI)

---

## What TitleApp Is

TitleApp is the Digital Worker platform -- AI agents governed by human-defined rules with deterministic enforcement and immutable audit trails. Instead of selling software features, TitleApp sells Digital Workers that follow configurable business rules. Each worker runs 24/7, monitoring data, enforcing compliance, executing workflows, and reporting back to the owner.

The underlying architecture is called RAAS (Rules + AI-as-a-Service). The platform sits between the AI model and the business outcome. Any AI model (Claude, GPT, Gemini) can be plugged in as the execution engine. TitleApp's value is the rules layer on top -- the governance, the audit trail, the compliance enforcement, the domain-specific knowledge that makes AI outputs trustworthy enough to act on.

Think of it as the compliance infrastructure that lets businesses actually trust AI in regulated environments. The AI does the work. The rules engine makes sure the work is done right.

---

## The Origin Story

TitleApp started as a blockchain-based land title verification system -- the idea that property ownership records should be immutable, portable, and verifiable. That led to Digital Title Certificates (DTCs) for vehicles, then aviation maintenance records, then professional credentials.

The Custom GPT wave revealed the governance gap. Everyone could build AI tools, but nobody could constrain them. A real estate GPT could hallucinate property values. A medical GPT could give dangerous advice. There was no rules layer.

The pattern that emerged was bigger than any single vertical: every industry has records that need to be trustworthy, workflows that need to be followed, and compliance rules that need to be enforced. The blockchain anchor was the first version of "provenance." The Digital Worker platform is the full realization -- AI-powered operations with deterministic rule enforcement and an immutable audit trail.

The pivot from "title verification" to "Digital Worker platform" happened when the team realized that the hardest problem in enterprise AI adoption is not the intelligence of the model -- it is trust. Businesses will not let AI make decisions unless there is a system ensuring those decisions follow the rules. That system is what we call RAAS -- Rules + AI-as-a-Service.

---

## Platform Architecture

TitleApp has three layers:

1. Door 1 (Dashboard): A React admin interface for visibility. Read-only view into what the AI has already done. This is not the primary interface -- it is the audit window.

2. Door 2 (Chat / Alex): The primary user interface. Users talk to Alex, their AI Chief of Staff. Alex handles everything -- data import, analysis, communications, compliance checks, reporting. The dashboard shows what Alex did. Alex is the one doing it.

3. Rules Engine (Backend): The RAAS enforcement layer. Every AI output passes through deterministic validation before reaching the user. Hard stops (must-not-violate rules) fail closed. Soft flags (warnings) get logged. The engine supports tenant-configurable risk profiles, so each business can tune their compliance thresholds.

How it works: Human-defined rules constrain every AI interaction. The rules are deterministic -- not suggestions, not guardrails, but hard enforcement. Cross-model enforcement means the same rules work regardless of whether Claude, GPT, or Gemini is the execution engine. Every action produces an immutable audit trail.

Supporting infrastructure:
- Append-only Firestore (event-sourced records -- nothing is overwritten, ever)
- Firebase Cloud Functions (stateless API handlers)
- Cloudflare Workers (edge routing and landing page)
- Firebase Cloud Storage (documents, files, uploads)
- Multi-model AI (Anthropic Claude, OpenAI GPT, Google Gemini -- interchangeable)

---

## The Marketplace — The Wedge

The marketplace play: domain experts (not developers) build Digital Workers -- AI agents with custom rule packages. A real estate compliance expert builds a Digital Worker that enforces fair housing rules on every listing. A dealership F&I manager builds a Digital Worker that matches customers to financing products based on credit profiles.

Creators set their price. TitleApp takes a 25% platform fee (75/25 split to creators). Every Digital Worker inherits the RAAS enforcement layer -- provenance, audit trail, compliance. This is the network effect: more creators mean more verticals mean more subscribers.

---

## Current Verticals

TitleApp serves multiple verticals, each with vertical-specific rules, workflows, and AI behavior:

1. Auto Dealerships: Inventory management, pricing intelligence, customer outreach, F&I product matching, service scheduling. Alex acts as the dealership's Chief of Staff -- managing vehicles, customers, and a full sales pipeline.

2. Real Estate & Mortgage: Listings, buyer matching, transaction management, property management with tenant tracking, maintenance requests, and compliance monitoring.

3. Investment Analysis: Deal screening, risk assessment, portfolio monitoring, LP communications, and compliance-first analysis with evidence requirements.

4. Investor Relations: Fundraise management, cap table, data room, investor pipeline, compliance tracking. This is the vertical powering TitleApp's own raise -- dogfooding the product.

5. Aviation: Aircraft records, pilot certifications, maintenance schedules, flight hour tracking, charter operations.

6. Healthcare (planned): Patient record governance, HIPAA compliance enforcement, clinical workflow automation.

Each vertical has its own Digital Worker ruleset, system prompts, and domain-specific workflows. New verticals can be built by defining rules and workflows -- the AI execution layer is shared.

---

## The Team

Sean Lee Combs (CEO): Product vision, platform architecture, go-to-market strategy. Sean designed the Digital Worker platform concept and leads product development. Has raised over $1.5B in capital across his career. Holds patents in blockchain record-keeping and is filing additional patents around the RAAS framework and the intersection of blockchain provenance with AI governance. Airline and medevac pilot -- brings firsthand understanding of regulated, safety-critical operations to the platform design.

Kent Redwine (CFO): Finance, operations, fundraise execution. Over $20B in M&A experience. 19 years in Climate Tech. Kent manages the company's financial model, runway planning, and investor relations.

Kim Ellen Bennett (GovTech & Real Estate Lead): Public sector strategy, government technology partnerships, and real estate vertical development. Kim leads TitleApp's approach to state DMV integrations, municipal record systems, and regulatory compliance in government contexts.

Vishal Kumar (Frontend Engineer): 8 years experience. React architecture, UI/UX implementation, component library development. Built the admin dashboard, onboarding wizard, and chat interface.

Manpreet Kaur (Backend Engineer): 8 years experience. Cloud infrastructure, AI integration, API development. Built the Firebase Functions backend, rules engine, and multi-model AI routing.

AI Development: Built on Claude (Anthropic), OpenAI GPT, and Google Gemini -- model-agnostic by design.

Advisors:
- Scott Eschelman: BUILD SF, over $500M in real estate capital deployed, Stanford.
- Peggy Liu: World Economic Forum, TIME Magazine Hero of the Environment, MIT.

---

## Competitive Landscape

TitleApp sits at the intersection of several categories. The key framing: TitleApp is complementary to the large AI model providers, not competitive with them.

- Large AI model providers (Anthropic, OpenAI, Google): TitleApp sits on top of these models as the governance layer. They build intelligence. TitleApp builds the trust infrastructure that makes that intelligence safe to deploy in regulated environments. Model-agnostic by design.
- Enterprise AI platforms (Palantir AIP, ServiceNow): Similar governance goals, but enterprise-only pricing and heavy integration requirements. TitleApp offers accessible pricing and self-serve onboarding.
- Vertical SaaS (DealerSocket, Yardi, etc.): Domain-specific but not AI-native. Adding AI features as bolt-ons without governance.
- AI agent frameworks (CrewAI, AutoGen): Developer tools for building agents. No governance, no compliance, no audit trail. TitleApp provides the compliance layer that makes agents safe to deploy.
- Horizontal AI assistants (Microsoft Copilot, Glean): Broad capabilities but no deterministic rule enforcement or immutable audit trail.

TitleApp's differentiation: cross-model enforcement (works with any AI model) + immutable audit trail + DIY builder for domain experts + accessible pricing + marketplace network effects.

---

## Market Opportunity

Total Addressable Market: $435B+ across regulated industries that need AI governance.
Serviceable Addressable Market: $94B.
Conservative 5-year Serviceable Obtainable Market: $128M.

Bottom-up math across 8 segments:
- Auto dealerships: 18,000+ franchise dealers, 40,000+ independent dealers in the US
- Real estate: 1.5M+ licensed agents, 100K+ brokerages
- Mortgage: Loan officers, underwriters, compliance teams
- Financial services: Investment firms, family offices, hedge funds, VC firms
- Aviation: 200K+ general aviation aircraft, 600K+ active pilots
- Healthcare: Hospitals, clinics, compliance departments
- Government: State DMVs, municipal record offices, regulatory agencies
- Insurance: Claims processing, underwriting, compliance

---

## Revenue Model

TitleApp generates revenue through three streams:

1. Subscription: Accessible per-seat pricing for access to the platform and Alex. This is the base layer -- every user gets an AI Chief of Staff. Pricing scales with value delivered.

2. Digital Worker Marketplace: Creators build and sell Digital Workers (rule packages + workflows) on the TitleApp marketplace. TitleApp takes a 25% platform fee (75/25 split to creators). This is the network effect -- more creators mean more verticals mean more subscribers.

3. AI Usage Fees: Heavy AI usage (large document analysis, complex multi-step workflows, high-volume automation) incurs usage-based fees on top of the base subscription.

---

## Use of Funds

From the current raise (net proceeds approximately $803K after Wefunder fees):

- Product Development (45%): Complete vertical build-out, Digital Worker marketplace launch, blockchain provenance integration, and Public API for third-party developers.
- Go-to-Market (25%): Targeted outreach to auto dealerships (first vertical to market), content marketing, and partnership development with industry associations.
- Operations (20%): Cloud infrastructure, AI API costs, legal and compliance (securities, data privacy), and accounting.
- Reserve (10%): Working capital buffer for unexpected costs or extended runway.

---

## Investor Documents

Three documents are available in the data room:
1. TitleApp Executive Summary (PDF) -- public access, available to all visitors
2. TitleApp Pitch Deck (PPTX) -- available to prospects who have shared their contact info
3. TitleApp Business Plan, February 2026 (DOCX) -- available to verified investors

Alex can reference these documents and offer to share them when relevant. The executive summary can be shared freely. The pitch deck and business plan require the investor to create an account first.

---

## Roadmap

Near-term (Q1-Q2 2026):
- Complete investor relations vertical (in progress -- dogfooding the raise)
- Launch Digital Worker marketplace with creator tools
- Auto dealership pilot program (first paying customers)
- Public API v1 with developer documentation

Mid-term (Q3-Q4 2026):
- Real estate vertical launch
- Aviation vertical launch
- Stripe Identity integration for verified credentials
- Mobile app (React Native)

Long-term (2027+):
- Government/GovTech partnerships (DMV integrations, municipal records)
- International expansion (UK, EU regulatory frameworks)
- Enterprise tier with custom Digital Worker rulesets and dedicated support
- Cash flow positive target: mid-2027
