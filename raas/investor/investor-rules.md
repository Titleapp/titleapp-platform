# TitleApp AI — Investor Vertical, Vault AI Tools & Modular Capabilities

## Architecture Spec — Session 16e

## February 24, 2026

---

## The Big Picture

TitleApp is evolving from "vertical business workspaces" into a **modular AI business platform** where capabilities (cap table, KYC, voting, token minting, data rooms) are building blocks that any workspace can enable — and that individual users can access through their Personal Vault.

Three interconnected expansions:

1. **Investor Relations Vertical** — A new workspace type for companies raising capital
2. **Modular Capabilities** — Features that work across verticals (cap table, KYC, tokens, voting)
3. **Vault AI Tools** — The consumer/personal side where individuals access these same capabilities

---

## 1. Investor Relations Vertical

### What It Is

A workspace type purpose-built for companies raising capital. The AI handles investor relations, compliance, and the actual fundraise — conversationally.

### The Investor Journey (External Investor)

```
Investor visits titleapp.ai/invest/[company-slug]
  (or clicks "Investors" link from landing page)
    ↓
AI conversation: pitches the company, answers questions
  - What does the company do?
  - What's the market opportunity?
  - What are the financials?
  - Who's on the team?
  - What are the terms?
  The AI knows everything in the data room.
    ↓
Investor says "I'm interested" or "How do I invest?"
    ↓
KYC/AML Identity Verification
  - AI guides them through it conversationally
  - ID check (passport/license upload + selfie)
  - Accreditation check (if needed for RegD)
  - For RegCF: basic identity + investment limits check
    ↓
Investor Dashboard (their data room view)
  - Company financials, pitch deck, metrics
  - Cap table (their current/proposed stake)
  - Documents (SAFEs, subscription agreements)
  - Q&A with the AI
  - Investment history
    ↓
Invest directly
  - RegCF compliant investment flow
  - Payment processing (ACH, wire, crypto)
  - Subscription agreement signing
  - Token minting (ownership token via Venly/Polygon)
    ↓
Post-investment
  - Ongoing access to data room
  - Voting rights (via tokens or internal)
  - Quarterly updates from the AI
  - Cap table tracking
  - Secondary market (future)
```

### The Company Side (Workspace Owner)

The Investor Relations workspace gives the company:

**Data Room Management**
- Upload financials, pitch deck, legal docs
- AI auto-indexes everything — investors can ask questions and get answers from the docs
- Version control on all documents
- Track who's viewed what

**Cap Table**
- Current cap table with all shareholders/token holders
- Model new rounds (dilution calculator)
- Issue tokens for ownership (via Venly/Polygon or internal)
- Track vesting schedules
- SAFEs, convertible notes, priced rounds

**Fundraise Management**
- Set round terms (RegCF: max raise, min/max investment, valuation)
- Track committed vs. target
- Investor pipeline (who's interested, who's verified, who's invested)
- Automated compliance checks
- Investment limits enforcement (RegCF: income-based limits)

**Investor Communications**
- AI-powered Q&A (investors ask, AI answers from data room)
- Quarterly update drafts (AI generates from metrics)
- Voting/governance proposals
- Distribution notifications

**Compliance**
- RegCF form filing assistance (Form C, annual reports)
- KYC/AML record keeping
- Investment limit tracking
- Bad actor checks
- Funding portal integration (if using Wefunder/Republic/DealMaker)

### RegCF Specifics

Regulation Crowdfunding (RegCF) allows companies to raise up to $5M/year from anyone (not just accredited investors). Key requirements:

- Must use a registered funding portal OR broker-dealer
- Form C filing with SEC
- Annual reports
- Investment limits based on investor income/net worth
- Financial statement requirements vary by raise amount

**Options for compliance:**

1. **Partner with a funding portal** (Wefunder, Republic, StartEngine, DealMaker) — they handle regulatory compliance, TitleApp provides the AI experience layer on top
2. **Register as a funding portal** (long-term, expensive, requires FINRA membership)
3. **Broker-dealer partnership** — partner with a BD who handles the securities side

**Recommended for v1:** Partner with DealMaker or similar white-label solution. They handle the regulatory infrastructure, TitleApp provides the AI-first investor experience. The investor still interacts through TitleApp — DealMaker runs in the background for compliance.

---

## 2. Modular Capabilities (Cross-Vertical Features)

These features start in the Investor vertical but are useful across ALL workspace types. Build them as modular components that any workspace can enable.

### Cap Table Module

- Track ownership (equity, tokens, SAFEs, notes)
- Model dilution scenarios
- Issue/transfer tokens (Venly integration)
- Vesting schedule tracking
- Available in: Investor Relations, any workspace that wants to track ownership

### Token Minting Module

- Mint ownership tokens (cap table), title records (Workers), or custom tokens
- Uses existing Venly/Polygon infrastructure
- Token types:
  - **Ownership tokens** — represent equity/cap table stake
  - **Title tokens** — provenance records for AI Workers (16b spec)
  - **Governance tokens** — voting rights
  - **Custom tokens** — whatever the workspace needs
- Available in: All workspaces via Settings toggle

### KYC/AML Module

- Identity verification flow (ID upload + selfie + liveness check)
- Accreditation verification (for RegD)
- AML screening
- Stores verified identity — user only does this ONCE across all of TitleApp
- Provider options: Stripe Identity, Persona, Jumio, Plaid IDV
- Available in: Investor Relations (mandatory), any workspace that needs identity verification

### Voting/Governance Module

- Create proposals
- Token-weighted or one-person-one-vote
- On-chain voting (via governance tokens on Polygon) OR internal voting (database-based)
- Results recorded immutably
- Available in: Investor Relations, any workspace with governance needs

### Data Room Module

- Secure document storage with access controls
- AI-indexed — users can ask questions about the documents
- Version control
- View tracking (who accessed what, when)
- Available in: Investor Relations, Real Estate (deal rooms), Analyst (LP data rooms)

### Payment Processing Module

- Stripe Connect for marketplace payments (Digital Worker creator payouts)
- ACH/wire for investments
- Crypto payments (via Venly)
- Subscription billing ($9/seat/month)
- Available in: All workspaces

---

## 3. Vault — AI Tools & GPTs

### The Evolution of the Personal Vault

The Vault started as "your digital life, organized." It's evolving into the **consumer hub** for all of TitleApp's capabilities. The Vault is where an individual person manages everything they do across the platform.

### Vault Sections (Current + New)

**Current:**
- Documents — personal file storage
- AI Assistant — general purpose chat

**New — AI Tools & GPTs:**
A section in the Vault where users can access modular AI-powered tools and their Digital Worker subscriptions. Think of it as an app drawer.

```
┌─────────────────────────────────────────┐
│  AI Tools & GPTs                         │
│                                          │
│  MY SUBSCRIPTIONS                        │
│  ┌──────────┐  ┌──────────┐             │
│  │ Relocation│  │ Tax      │             │
│  │ Expert AI │  │ Advisor  │             │
│  │ $15/mo    │  │ $9/mo    │             │
│  └──────────┘  └──────────┘             │
│                                          │
│  BUILT-IN TOOLS                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ Cap      │  │ My       │             │
│  │ Table    │  │ Tokens   │             │
│  │ Viewer   │  │          │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ Voting   │  │ My       │             │
│  │          │  │ Identity │             │
│  │          │  │ (KYC)    │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ Data     │  │ My       │             │
│  │ Rooms    │  │ Invest-  │             │
│  │          │  │ ments    │             │
│  └──────────┘  └──────────┘             │
│                                          │
│  [Browse Marketplace →]                  │
└─────────────────────────────────────────┘
```

### Built-in Tools (available to all Vault users)

**Cap Table Viewer**
- See your ownership stakes across any company using TitleApp's cap table module
- Track vesting schedules
- View token holdings

**My Tokens**
- All tokens you hold (ownership, governance, title records)
- Connected to Venly wallet
- Transfer/manage tokens

**Voting**
- Active proposals from companies/DAOs you're involved with
- Vote directly from the Vault
- Voting history

**My Identity (KYC)**
- Your verified identity, stored once
- Reusable across any TitleApp experience that requires KYC
- "Verified ✓" badge on your profile

**Data Rooms**
- Access to any data rooms you've been invited to
- Company data rooms (as an investor)
- Deal rooms (as a party to a transaction)

**My Investments**
- Portfolio of RegCF (and other) investments made through TitleApp
- Performance tracking
- Distributions received
- Upcoming votes/decisions

### Digital Worker Subscriptions

- Workers you've subscribed to from the Marketplace
- Launch any Worker directly from the Vault
- Manage subscriptions (cancel, billing)

---

## 4. Landing Page Updates

### Developer Link

- Location: Footer + subtle text link in top nav ("Developers" or "API")
- Links to: API docs page (currently at the Cloud Functions URL, future: docs.titleapp.ai)
- Style: Understated. Gray text, no button. Developers will find it.

### Investor Link

- Location: Footer + subtle text link in top nav ("Investors")
- Links to: titleapp.ai/invest (the AI-powered investor experience)
- For TitleApp's OWN raise initially, but eventually this is a feature any company on the platform can enable
- Style: Understated like the developer link. The people who need it will find it.

### Footer Layout

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TitleApp AI

Product          Company          Developers
─────────        ─────────        ─────────
Auto Dealers     About            API Docs
Real Estate      Blog             OpenAPI Spec
Analysts         Careers          SDKs
Personal Vault   Press            Status
Marketplace      Contact          Changelog

Investors        Legal
─────────        ─────────
Invest           Privacy
Data Room        Terms
                 Security

                    © 2026 TitleApp AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 5. How It All Connects

```
TITLEAPP PLATFORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS WORKSPACES              PERSONAL VAULT
(B2B — $9/seat/month)           (B2C — free tier)
┌─────────────────┐             ┌─────────────────┐
│ Auto Dealer     │             │ Documents       │
│ Real Estate     │             │ AI Assistant    │
│ Analyst         │◄───────────►│ AI Tools & GPTs │
│ Aviation        │  shared     │  - Cap Table    │
│ Investor Rels   │  modules    │  - My Tokens    │
│ DW Builder      │             │  - Voting       │
│ [Custom]        │             │  - My Identity  │
└────────┬────────┘             │  - Investments  │
         │                      │  - Data Rooms   │
         │                      │  - DW Subs      │
         │                      └────────┬────────┘
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────┐
│              SHARED INFRASTRUCTURE               │
│                                                  │
│  Blockchain (Venly/Polygon)                      │
│     - Title records, ownership tokens, governance│
│                                                  │
│  KYC/AML (Stripe Identity / Persona)             │
│     - Verify once, use everywhere                │
│                                                  │
│  Payments (Stripe Connect)                       │
│     - Subscriptions, investments, payouts        │
│                                                  │
│  AI Engine                                       │
│     - Chat, rules engine, Worker execution       │
│                                                  │
│  Public API (40+ endpoints)                      │
│     - Third-party integrations                   │
│     - "Bring Your Worker" import                 │
│     - Title verification                         │
└─────────────────────────────────────────────────┘
```

---

## 6. Implementation Priority

### Now (Session 16)

- [x] 16a: Chat-first Digital Worker builder onboarding
- [x] 16b: Blockchain provenance API spec (Venly/Polygon)
- [x] 16c: Blockchain API Claude Code prompt
- [x] 16d: Fix universal onboarding + delete/reset buttons
- [ ] 16e: Landing page — Developer link + Investor link (quick add)

### Next Sprint

- [ ] Investor Relations vertical — AI pitch conversation
- [ ] KYC/AML integration (pick provider, build flow)
- [ ] Vault "AI Tools & GPTs" section
- [ ] Cap table module (Firestore schema + basic UI)
- [ ] Landing page footer with full nav

### Following Sprint

- [ ] RegCF compliance (DealMaker or similar partnership)
- [ ] Token-based cap table (Venly minting for ownership)
- [ ] Voting/governance module
- [ ] Data room with AI-powered Q&A
- [ ] Investor dashboard (data room view for external investors)

### Future

- [ ] Payment processing for investments (ACH/wire/crypto)
- [ ] Secondary market for tokens
- [ ] Funding portal partnership or registration
- [ ] Multi-company investor portfolio view in Vault
- [ ] Investor Relations as a publishable vertical (any company can enable it)

---

## 7. Positioning

**For TitleApp's own raise:** "We don't send you a deck. We let you talk to our AI. It knows everything about the company — the product, the market, the financials, the team. When you're ready to invest, it handles KYC, the subscription agreement, and the transaction. The entire raise happens inside the product."

**For other companies using the Investor Relations vertical:** "Raise your round through TitleApp. Your investors don't read a 40-page deck — they talk to an AI that knows your business inside and out. KYC, compliance, cap table, and investment processing — all in one conversational flow."

**For the platform overall:** "TitleApp AI: The AI is the UX. Whether you're running a dealership, managing properties, analyzing investments, raising capital, or building your own AI service — everything starts with a conversation."

---

## Notes

- The Investor Relations vertical is ALSO a proof-of-concept for TitleApp's own fundraise. Eat your own cooking.
- The modular architecture means every feature built for investors (KYC, cap table, voting, tokens) becomes available to all other verticals.
- The Vault's "AI Tools & GPTs" section makes TitleApp sticky for consumers — it's not just business software, it's where you manage your digital financial life.
- RegCF has a $5M/year cap. For larger raises, RegD (accredited only) or RegA+ ($75M cap) are options. The platform should support all three eventually.
- The token-based cap table means ownership is portable and verifiable. If a company leaves TitleApp, their cap table lives on the blockchain. That's a trust signal for investors.
- "Build it anywhere. Title it here." applies to companies AND their fundraises.
