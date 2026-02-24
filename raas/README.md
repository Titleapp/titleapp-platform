# TitleApp RAAS — Rules as a Service

## Documentation & Architecture

---

## What is RAAS?

RAAS (Rules as a Service) is TitleApp's platform for creating, publishing, and subscribing to AI-powered services called **Workers**. A Worker is an AI service built from someone's expertise — their rules, workflows, decision-making processes, and domain knowledge — packaged into a subscribable product.

**The core idea:** Anyone can turn what they know into an AI service that others pay to use. No code. No technical skills. Just a conversation with the AI.

---

## How It Works

### For Creators (Building a Worker)

1. **Start a conversation** — Go to titleapp.ai and tell the AI you want to build an AI service, or click "Build an AI Service" from the workspace wizard
2. **The AI interviews you** — It asks about your expertise, your process, who needs it, what makes you different
3. **The AI proposes a Worker** — Based on the conversation, it suggests a name, description, capabilities, target audience, and pricing
4. **Review and adjust** — Tweak anything you want
5. **Publish to the RAAS Store** — Your Worker goes live and people can subscribe
6. **Earn revenue** — You keep 75% of subscription revenue. TitleApp keeps 25%.

### For Subscribers (Using a Worker)

1. **Browse the RAAS Store** — Find Workers by category, rating, or search
2. **Subscribe** — Pick a Worker, pay the monthly fee
3. **Use it** — The Worker appears in your Vault under AI Tools & GPTs. Talk to it like any AI — but this one has the creator's expertise baked in.

### For Developers (API)

Workers can also be accessed via the TitleApp API:

- `POST /v1/workers/import` — Register a Worker built on another platform
- `POST /v1/workers/{id}/mint` — Mint a blockchain title record
- `GET /v1/workers/{id}/title` — Look up provenance history
- `POST /v1/workers/{id}/verify` — Verify rules match the titled version
- `GET /v1/title/{recordId}` — Public title lookup (no auth required)

Full API docs: https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs

---

## Worker Architecture

### What a Worker Contains

```
Worker {
  id: string              // Unique identifier (wkr_xxx)
  name: string            // Display name
  description: string     // One-line description
  capabilities: string[]  // What it can do
  rules: string[]         // The encoded expertise/decision rules
  audience: string        // Who it's for
  category: string        // Store categorization
  pricing: {
    model: 'subscription' | 'per-use' | 'free'
    amount: number        // Monthly price in USD
    currency: 'USD'
  }
  author: {
    name: string
    userId: string
    verified: boolean
  }
  status: 'draft' | 'published' | 'archived'
  titled: boolean         // Has blockchain provenance record
  latestTitleRecord: { ... }  // Most recent title record
  source: {               // For imported Workers
    platform: string      // 'titleapp' | 'openai-gpt' | 'langchain' | 'custom'
    external_id: string
    external_url: string
  }
  metrics: {
    subscribers: number
    rating: number
    totalRevenue: number
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Firestore Schema

```
tenants/{tenantId}/workers/{workerId}              — Worker document
tenants/{tenantId}/workers/{workerId}/rules/        — Detailed rule documents
tenants/{tenantId}/workers/{workerId}/titleRecords/ — Blockchain provenance records
titleRecords/{recordId}                             — Top-level for public lookups
raasSubscriptions/{subscriptionId}                  — User subscriptions to Workers
```

---

## The Builder Interview

When a user wants to create a Worker, the AI conducts a structured interview:

### Phase 1 — Discovery (4-5 exchanges minimum)

The AI asks about:

- **Expertise area** — "What do people always come to you for?"
- **Target audience** — "Who needs this knowledge? Who would pay?"
- **Process/workflow** — "Walk me through how you approach this"
- **Differentiation** — "What's your secret sauce?"

The AI is warm, curious, and genuinely excited. It reflects back what it hears and builds enthusiasm.

### Phase 2 — Synthesis (1-2 exchanges)

The AI proposes the Worker concept:

- Suggested name
- One-line description
- Key capabilities (3-5)
- Target audience
- Suggested pricing ($5-49/month)

### Phase 3 — The Build Moment

After confirmation, the AI creates the workspace and generates the Worker. The user lands on the WorkerPreview page.

### System Prompt

The builder interview uses a specialized system prompt (see `raas/diy-builder/builder-prompt.md`). Key rules:

- Minimum 4 user exchanges before proposing a Worker
- Never mention workspaces, dashboards, or technical details during the interview
- Be warm and conversational, not corporate
- Help sharpen vague ideas through questions
- The `[CREATE_WORKSPACE]` token signals workspace creation

---

## Blockchain Provenance

**"Build it anywhere. Title it here."**

Every Worker can be minted as a blockchain record on Polygon via Venly. This provides:

- **Proof of authorship** — Immutable, timestamped record of who created what
- **Version history** — Each update creates a new record linked to the previous
- **Verification** — Anyone can check that a Worker's current rules match its title
- **Portability** — The provenance record lives on-chain, independent of TitleApp

### What Gets Minted

A lightweight metadata record (NOT the full rules — those stay in Firestore):

```json
{
  "worker_id": "wkr_abc123",
  "name": "Relocation Expert AI",
  "description": "...",
  "author_email_hash": "sha256(...)",
  "capabilities": ["...", "..."],
  "rules_hash": "sha256(...)",
  "created_at": "2026-02-24T00:00:00Z",
  "version": 1
}
```

The `metadata_hash` of this object is stored on-chain. The actual rules never touch the blockchain (privacy + cost), but anyone can verify by hashing the current rules and comparing.

### Title Record

```
TitleRecord {
  version: number
  txHash: string           // Polygon transaction hash
  chain: 'polygon'
  tokenId: string
  mintedAt: timestamp
  metadataHash: string     // SHA-256 of the metadata JSON
  rulesHash: string        // SHA-256 of the rules array
  memo: string             // Optional note
  previousVersionTx: string // Link to previous version
  status: 'minted'
}
```

### Wallet Strategy

Most creators don't have crypto wallets. Venly handles this:

- Custodial wallet created automatically on first mint
- Tied to TitleApp account (no seed phrases)
- Gas costs negligible on Polygon, absorbed by TitleApp
- Optional: connect external wallet, transfer ownership

### Toggle in Settings

Blockchain minting is opt-in via a toggle in workspace Settings under "Blockchain Title Records." When enabled, title records are minted on Worker publish and rule updates.

---

## RAAS Store

### Store Layout

The RAAS Store is a browsable grid of published Workers, accessible from any workspace sidebar or from the Personal Vault.

Each card shows:

- Worker name and author
- One-line description
- Category badge
- Rating and subscriber count
- Monthly price
- "Titled on Polygon" badge (if applicable)
- Subscribe button

### Categories

- Business & Operations
- Finance & Investing
- Real Estate
- Automotive
- Legal & Compliance
- Health & Wellness
- Technology
- Lifestyle & Travel
- Education
- Custom

### Discovery

- Search by keyword
- Filter by category, price range, rating
- Sort by popularity, newest, rating
- AI-recommended Workers based on user's workspace type

---

## Creator Dashboard

Creators manage their Workers from the Creator Dashboard, accessible from the sidebar.

### Dashboard Shows:

- Published Workers with status
- Subscriber counts and trends
- Revenue (total, this month, per Worker)
- Subscriber list
- Worker analytics (usage, ratings, feedback)
- Edit/update Worker rules
- Publish/unpublish controls

### Revenue Model

- **Creator gets 75%** of subscription revenue
- **TitleApp gets 25%** (covers AI compute, infrastructure, billing)
- Payouts via Stripe Connect (future)
- Revenue visible in real-time on Creator Dashboard

---

## Worker Import ("Bring Your Worker")

### API-First

The TitleApp API supports importing Workers built on any platform:

```bash
# Register an external Worker
curl -X POST https://api.titleapp.ai/v1/workers/import \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Relocation Expert AI",
    "description": "Guides Americans through relocating to Spain",
    "source": { "platform": "custom" },
    "capabilities": ["Visa guidance", "Cost of living", "Healthcare"],
    "rules": ["Always ask which region", "Compare NIE vs TIE"],
    "category": "lifestyle",
    "pricing": { "model": "subscription", "amount": 15 },
    "mint_title": true
  }'
```

### Supported Source Platforms

- `titleapp` — Built on TitleApp
- `openai-gpt` — Custom GPT
- `langchain` — LangChain agent
- `crewai` — CrewAI agent
- `huggingface` — Hugging Face model
- `custom` — Any other platform

### What Import Does

1. Creates a Worker document in Firestore
2. Optionally mints a blockchain title record
3. Optionally lists on the RAAS Store
4. Provides API access for the Worker

---

## Investment Instruments (Investor Relations Vertical)

When used for fundraising (Investor Relations workspace), Workers and the RAAS infrastructure support investment instruments:

### SAFE (Simple Agreement for Future Equity)

- Pre-share issuance
- Converts to equity on triggering event (priced round, IPO, acquisition)
- Stored as a signed document in investor's Vault
- No tokens minted until conversion

### SAFT (Simple Agreement for Future Tokens)

- Pre-token issuance
- Converts to tokens on triggering event (token launch)
- Stored as a signed document in investor's Vault
- Tokens minted to investor's wallet on conversion

### Token (Direct Issuance)

- Shares have been issued / cap table is defined
- Ownership tokens minted immediately on investment
- Tokens appear in investor's Vault wallet
- Represent actual equity/ownership units

### Configuration

The company selects their instrument type during Investor Relations workspace setup. The AI explains the tradeoffs and helps them choose.

---

## Pricing

### For Workspace Users

- **Personal Vault**: Free
- **Business Workspaces**: $9/seat/month + AI usage (our cost + 50% margin)
- **14-day free trial** on all business workspaces

### For RAAS Creators

- Free to build and publish Workers
- 75/25 revenue split (creator keeps 75%)
- Blockchain title minting: free (gas absorbed by TitleApp)

### For RAAS Subscribers

- Price set by creator ($5-49/month typical)
- Cancel anytime
- Access via Personal Vault → AI Tools & GPTs

### For API Users

- API key authentication
- Rate limited (see API docs for limits)
- Usage-based pricing (future)

---

## Competitive Landscape

| Platform | What They Do | TitleApp's Position |
|----------|-------------|---------------------|
| OpenSea (AI marketplace) | Trading/marketplace for AI agents | "List there, title here" |
| Custom GPT Store | Build + distribute GPTs | "Built a GPT? Title it here" |
| LangChain / CrewAI | Agent frameworks | "Built an agent? Register + title here" |
| Hugging Face | Model hosting | "Hosting a model? Prove you built it" |
| Wefunder / Republic | Funding portals | Integration partner for RegCF compliance |

**TitleApp's moat:** We're not just a marketplace. We're the **title office for AI services**. The provenance layer. Build it anywhere, title it here.

---

## File Structure (Repo)

```
raas/
├── README.md                  ← This file
├── diy-builder/
│   └── builder-prompt.md      ← System prompt for builder interview
├── store/
│   └── store-categories.md    ← RAAS Store category definitions
├── auto/
│   └── auto-rules.md          ← Auto dealer vertical rules
├── real-estate/
│   └── re-rules.md            ← Real estate vertical rules
├── analyst/
│   └── analyst-rules.md       ← Investment analyst vertical rules
├── vault/
│   └── vault-rules.md         ← Personal vault rules
├── investor/
│   └── investor-rules.md      ← Investor relations vertical rules
├── onboarding/
│   ├── universal-onboarding.md ← Onboarding wizard spec
│   └── integrations-catalog.md ← Integration options per vertical
└── blockchain/
    ├── title-minting.md       ← Blockchain provenance spec
    └── venly-integration.md   ← Venly/Polygon integration details
```

---

## Links

- **Live Platform**: https://titleapp.ai
- **API Docs**: https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs
- **OpenAPI Spec**: `TITLEAPP_API_OPENAPI_SPEC.yaml` (repo root)
- **GitHub**: github.com/Titleapp/titleapp-platform

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-23 | 1.0 | Initial RAAS documentation (Session 15) |
| 2026-02-24 | 2.0 | Added blockchain provenance, Worker import, investor instruments, fee comparison, Wefunder hybrid approach (Session 16) |
