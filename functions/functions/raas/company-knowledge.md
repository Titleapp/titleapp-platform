# TitleApp — Company Knowledge Base
## For Alex (Investor Relations AI)

---

## What TitleApp Is

TitleApp is a RAAS (Rules + AI-as-a-Service) marketplace for AI-powered Digital Workers serving regulated industries -- real estate, aviation, property management, government, financial services, health/EMS education, mortgage lending, and auto dealer. Every worker passes through a 4-tier rules stack (platform safety → industry regulations → company policies → subscriber preferences) before any output reaches a user. The result is compliance-native AI that regulated industries can actually deploy.

TitleApp's Vault architecture -- where data transfer between Vaults is the transaction -- positions the platform as the infrastructure layer for the next generation of regulated AI. This includes serving as the intelligence backbone for emerging wearable + AI markets, where real-time compliance, audit trails, and rules-governed outputs are not optional.

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

## Current Scale

TitleApp has 1,000+ Digital Workers across 12 industry suites. Vibe Coding Sandbox live at app.titleapp.ai/sandbox -- non-technical creators can build and publish a compliant Digital Worker in under one hour.

## Current Verticals

Active verticals: Real Estate, Aviation, Government, Finance & Accounting, Health/EMS Education, Property Management, Mortgage Lending, Auto Dealer. Each with vertical-specific Digital Workers, rules, workflows, and AI behavior:

1. Auto Dealerships: Full dealership operations from licensing and compliance through inventory acquisition, merchandising, sales and desking, F&I, service and parts, retention and marketing, HR and compliance, to intelligence and reporting. Workers include Dealer License Monitor, FTC Safeguards Compliance, Auction Intelligence, Trade-In Valuation, Market Pricing Intelligence, Lead Management, Desking and Deal Structure, F&I Menu Builder, Lender Matching, Equity Mining, and Alex Chief of Staff. Pricing: $29-$79/mo per worker.

2. Real Estate Development: Full CRE lifecycle from site selection and due diligence through entitlement, design, financing, construction, lease-up, stabilization, and disposition. Workers include CRE Deal Analyst, Site Selector, Zoning Analyst, Capital Stack Optimizer, Construction Lending, Construction Manager, Environmental Compliance, and Alex Chief of Staff.

3. Aviation Part 135/91 and Pilot Suite: Full flight operations from certificate management and GOM authoring through fleet airworthiness, crew management, flight ops, safety and SMS, revenue and billing, compliance, and intelligence. Plus a Pilot Suite for personal pilots. Workers include Part 135 Certificate Assistant, GOM Authoring, AD/SB Tracker, Safety Reporting, FOQA, Charter Quoting, and Alex Aviation Chief of Staff.

4. Investment Analysis: Deal screening, risk assessment, portfolio monitoring, LP communications, and compliance-first analysis with evidence requirements.

5. Investor Relations: Fundraise management, cap table, data room, investor pipeline, compliance tracking. This is the vertical powering TitleApp's own raise -- dogfooding the product.

6. Property Management: Tenant management, lease administration, maintenance, rent collection, compliance, and financial reporting.

7. Health/EMS Education: 42 workers (HE-001 through HE-042) covering protocol reference, scenario simulation, clinical competency tracking, skills lab management, and continuing education compliance. Jurisdiction-aware with scope-of-practice enforcement.

8. Mortgage Lending: Automated underwriting, income verification, credit analysis, DTI calculations, compliance checking, and loan origination workflow management.

Each vertical has its own Digital Worker catalog, ruleset, system prompts, and domain-specific workflows. New verticals can be built by defining rules and workflows -- the AI execution layer is shared. Every new worker must pass through the Worker #1 governance pipeline before going live.

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

TitleApp generates revenue through four streams:

1. Worker Subscriptions: Individual Digital Workers priced at Free, $29/mo, $49/mo, or $79/mo. Volume discounts at 3+ workers (10% off), 5-10 workers (20% off), 10+ workers (30% off). Annual pricing includes 2 months free. Alex Chief of Staff is free with 3 or more active subscriptions.

2. Tech Fees (vertical-specific): Auto dealers pay $250/transaction or 2% of deal value. Real estate sales pay $500/transaction or 1%. Property management pays $250/transaction or 1%. Mortgage and lending verticals are subscription-only with no tech fee.

3. Digital Worker Marketplace: Creators build and sell Digital Workers (rule packages + workflows) on the TitleApp marketplace. TitleApp takes a 25% platform fee (75/25 split to creators). Creator License is $49/year (free until July 1, 2026 with code DEV100). $2 Identity Check always required. This is the network effect -- more creators mean more verticals mean more subscribers.

4. AI Usage Fees: Heavy AI usage (large document analysis, complex multi-step workflows, high-volume automation) incurs usage-based fees on top of the base subscription.

---

## Use of Funds

$2.5M raise, Post-Money SAFE, $15M valuation cap, 20% discount. Private placement -- terms available to qualified investors. Net proceeds approximately $2.3M (~8% fees).

- Product & Engineering (40%, $920K): Complete vertical build-out, Digital Worker marketplace, Vault architecture, Public API expansion.
- GTM & Sales (25%, $575K): Targeted outreach to early revenue verticals (Real Estate/CRE, Finance & Accounting, Auto Dealer), content marketing, partnership development.
- Operations (20%, $460K): Cloud infrastructure, AI API costs, legal and compliance, accounting.
- Vertical Expansion (10%, $230K): Auto, Health/EMS, Mortgage, Property Management vertical launches.
- Reserve (5%, $115K): Working capital buffer.

Monthly burn: $38,000. Runway at zero revenue: 60 months. Cash flow positive target: Q3 2027 (base) / Q1 2027 (best) / Q4 2026 (stretch).

Investor inquiries: sean@titleapp.ai.

---

## Investor Documents

Three documents are available in the data room:
1. TitleApp Executive Summary (PDF) -- public access, available to all visitors
2. TitleApp Pitch Deck (PPTX) -- available to prospects who have shared their contact info
3. TitleApp Business Plan, February 2026 (DOCX) -- available to verified investors

Alex can reference these documents and offer to share them when relevant. The executive summary can be shared freely. The pitch deck and business plan require the investor to create an account first.

---

## Platform Capabilities (Live)

Document Engine: Any Digital Worker can generate PDF, DOCX, XLSX, and PPTX documents using 8 base templates (report, memo, agreement, deck, cashflow model, proforma, one-pager, letter). All generated documents carry an AI disclosure footer. Branding is tenant-configurable.

Public API v1: Comprehensive REST API covering all verticals, webhooks, and universal inbound. Authentication via API key (X-API-Key header). Rate limiting at 100 requests/hour on free tier. Health check and documentation endpoints available without auth.

Worker #1 Governance Pipeline: Every new Digital Worker passes through a 7-stage pipeline (intake interview, regulatory research, compliance brief, rules library editor, pre-publish check, publish flow, admin review) before going live. No exceptions. This is the trust infrastructure that differentiates TitleApp from other AI agent platforms.

Student Pilot Program: Free Pilot Pro ($29/mo value) for enrolled student pilots. Annual re-verification with student ID upload. Graduates transition to paid plans with a 3-month courtesy period.

CFI/CFII Program: Free Pilot Pro+ ($49/mo value) for flight instructors on academy staff. FAA Airmen Inquiry spot-check for certificate validation. Annual re-verification tied to employment.

Dynamic Worker Registry: A live Firestore-backed catalog (raasCatalog) serves as the single source of truth for all worker records. Content sync events automatically update homepage counts, vertical caches, Alex knowledge base, and chat context when workers are approved or deprecated.

Guarantees: 14-day free trial (no credit card), 60-day money-back guarantee, cancel anytime with one click, pause option (stop billing, keep data), data always belongs to the user (Vault preserved forever).

Current Promotions: AUTOLAUNCH (2 months free, auto dealer), TITLELAUNCH (2 months free, title/escrow), PMLAUNCH (2 months free, property management), PILOT3FREE (3 months free, Pilot Pro), DEV100 (Creator License free until July 1, 2026), EARLYBIRD50 (50% off for 6 months), DEMO30 (1 month free post-demo).

Referral Program: Every paid customer gets a referral code. 30% recurring commission on referral subscriptions. Monthly payout via Stripe Connect for earnings over $100.

## Roadmap

Completed (Q1 2026):
- 1,000+ Digital Workers live across 12 industry suites
- Public API v1 with developer documentation
- Document Engine with PDF, DOCX, XLSX, PPTX generation
- Worker #1 governance pipeline with gate verification
- Student pilot and CFI verification programs
- Dynamic worker registry with live content sync
- Investor data room with tiered access
- Developer Sandbox for building custom workers

Near-term (Q2 2026):
- Stripe billing integration (infrastructure built, keys pending)
- Property management vertical launch
- Custom template upload for Document Engine
- E-signature integration
- Mobile app (React Native)

Mid-term (Q3-Q4 2026):
- Government/GovTech partnerships (DMV integrations, municipal records)
- Healthcare vertical
- OAuth 2.0 for Public API
- GPT Store action schema and Claude MCP server config

Long-term (2027+):
- International expansion (UK, EU regulatory frameworks)
- Enterprise tier with custom Digital Worker rulesets and dedicated support
- Cash flow positive target: Q3 2027 (base) / Q1 2027 (best) / Q4 2026 (stretch)
