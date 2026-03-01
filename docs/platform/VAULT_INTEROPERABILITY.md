# Vault Communication Layer, Worker Interoperability & Chief of Staff

This is the most important architectural document since Worker #1. It defines the connective tissue that makes TitleApp a platform, not an app store.

---

## Why This Matters

**The problem with every other ecosystem (Shopify, Salesforce, HubSpot):** Massive app stores, but nothing talks to each other. Users spend more time connecting apps than using them. Zapier exists as a billion-dollar company because these ecosystems failed at interoperability. Each app has its own database, billing, auth, data format, and compliance posture. The user is the integration layer.

**What TitleApp does differently:** Every Digital Worker on the platform shares the same database (Vault), the same billing (Stripe), the same auth, the same data format (Deal Objects), and the same compliance layer (RAAS). Workers communicate natively through the Vault. No connectors, no middleware, no Zapier. The Chief of Staff Worker coordinates them automatically. The user says "go" and it works.

**This is the moat.** Anyone can build an AI chatbot. Nobody else has a governed interoperability layer where specialized workers share context, self-organize around needs, and coordinate through a Chief of Staff. This takes years to build and gets stronger with every worker added.

---

## Landing Page Language

**Headline:** "Build Your AI Team. They Work Together. You Just Say Go."

**Subhead:** "TitleApp workers aren't siloed tools -- they're a team. They share context, hand off work, and coordinate automatically. No integrations. No copy-pasting. No starting over."

**Value Props:**
- "One worker finds the opportunity. The next one analyzes it. The next one closes it."
- "Buy three workers, get a Chief of Staff free -- it coordinates everything."
- "Unlike Shopify or Salesforce apps, our workers actually talk to each other."
- "Your workers share one workspace, one login, one bill. Everything just works."

---

## Architecture Overview

### The Three Layers

```
+-----------------------------------------------------------+
|                    CHIEF OF STAFF                          |
|         (Orchestrator -- coordinates all workers)          |
|         Free with 3+ worker subscriptions                  |
+---------------------------+-------------------------------+
                            | delegates, monitors, reports
+---------------------------+-------------------------------+
|                    THE VAULT                               |
|    (Shared workspace -- Deal Objects, documents, logs)     |
|    Every worker reads from and writes to the Vault         |
|    Single database, single schema, single source of truth  |
+--+------+------+------+------+------+------+------+------+
   |      |      |      |      |      |      |      |
+--+--++--+--++--+--++--+--++--+--++--+--++--+--++--+--+
|Title ||Analy||Inves||Const||Entit||Archi||Accou||Sched|
|Exprt ||st   ||tor  ||ruct ||lemen||tect ||nting||uling|
+-----++-----++-----++-----++-----++-----++-----++-----+
   Specialist Workers -- each with own RAAS library
```

**Layer 1: Specialist Workers** -- Domain-specific Digital Workers that do the actual work. Each has its own RAAS library. They read from and write to the Vault.

**Layer 2: The Vault** -- The shared workspace. Holds Deal Objects, generated documents, worker logs, referral history, and activity trails. Every worker accesses the same data. No silos.

**Layer 3: Chief of Staff Worker** -- The orchestrator. Takes high-level directives from the user, breaks them into tasks, assigns tasks to specialist workers, manages parallel and sequential execution, collects results, identifies gaps, and reports back.

---

## Layer 1: The Vault

### What the Vault Is

The Vault is the user's shared workspace on TitleApp. It is the single source of truth for all work product across all workers. It replaces the fragmented data model where each AI tool stores data in its own silo.

### Vault Schema (Firestore)

```javascript
// Collection: vaults/{orgId}
{
  "orgId": "jma-ventures",
  "orgName": "JMA Ventures",
  "ownerId": "scott-id",
  "members": ["scott-id", "associate-1-id"],
  "activeWorkers": [
    "cre-analyst-001",
    "title-expert-001",
    "investor-governance-001",
    "construction-manager-001",
    "entitlement-worker-001",
    "chief-of-staff"            // Auto-added at 3+ workers
  ],
  "createdAt": "2026-03-01T00:00:00Z",
  "plan": "business",
  "branding": {
    "primaryLogo": "jma-logo.png",
    "secondaryLogo": "buildsf-logo.png",
    "primaryColor": "#1A3C5E",
    "orgName": "JMA Ventures"
  }
}

// Subcollection: vaults/{orgId}/dealObjects/{dealId}
{
  "dealId": "deal-001",
  "status": "screening",       // lifecycle state
  "createdAt": "2026-03-01T10:00:00Z",
  "createdBy": "scott-id",
  "lastUpdatedAt": "2026-03-01T11:30:00Z",
  "lastUpdatedBy": "cre-analyst-001",

  // Core property data (written by any worker that has it)
  "property": {
    "name": "Phoenix Gateway Apartments",
    "address": "1234 N Central Ave, Phoenix, AZ 85004",
    "type": "multifamily",
    "units": 200,
    "yearBuilt": 2023,
    "askingPrice": 35000000
  },

  // Worker contributions -- each worker writes to its own namespace
  "contributions": {
    "cre-analyst-001": {
      "worker": "CRE Deal Analyst",
      "completedAt": "2026-03-01T10:30:00Z",
      "score": 82,
      "recommendation": "strong_buy",
      "summary": "47% of replacement cost, strong submarket...",
      "financials": {
        "pricePerUnit": 175000,
        "replacementCost": 74500000,
        "pctReplacementCost": 0.47,
        "projectedCapRate": 0.058,
        "projectedIRR": 0.18,
        "projectedEquityMultiple": 2.1
      },
      "flags": ["below_replacement_cost", "broken_capital_stack"],
      "risks": ["oversupply_moderate", "lease_up_timeline"]
    },

    "title-expert-001": {
      "worker": "Title Expert",
      "completedAt": "2026-03-01T10:45:00Z",
      "titleStatus": "clean",
      "liens": [],
      "encumbrances": ["standard_utility_easement"],
      "summary": "Clean title. No liens. Standard utility easement only."
    },

    "entitlement-worker-001": {
      "worker": "Entitlement Analyst",
      "completedAt": "2026-03-01T10:35:00Z",
      "zoningStatus": "clear",
      "zoning": "MF-3",
      "overlayChanges": "none_pending",
      "summary": "Zoned MF-3, no pending changes, no CUP issues."
    },

    "investor-governance-001": {
      "worker": "Investor Governance",
      "completedAt": null,                    // Still in progress
      "status": "generating_documents",
      "documents": {
        "dealAnalysis": {"url": "...", "generatedAt": "..."},
        "offeringMemo": {"url": "...", "generatedAt": "..."},
        "financialModel": {"url": "...", "generatedAt": "..."}
      }
    }
  },

  // Referral history
  "referrals": [
    {
      "from": "title-expert-001",
      "to": "cre-analyst-001",
      "reason": "Property trading at 47% below replacement cost",
      "dataTransferred": ["property.address", "property.type", "titleStatus"],
      "userApproved": true,
      "timestamp": "2026-03-01T10:15:00Z"
    }
  ],

  // Activity log (full audit trail)
  "activityLog": [
    {
      "timestamp": "2026-03-01T10:00:00Z",
      "actor": "scott-id",
      "action": "deal_created",
      "details": "Created from broker email"
    },
    {
      "timestamp": "2026-03-01T10:05:00Z",
      "actor": "chief-of-staff",
      "action": "pipeline_launched",
      "details": "Assigned to: Analyst, Title Expert, Entitlement Worker"
    }
  ]
}
```

### Key Design Principles

**1. Workers write to their own namespace.** Each worker writes to `contributions.{workerId}`. No worker can overwrite another worker's contributions. This prevents conflicts and maintains the audit trail.

**2. Workers can read everything.** Any worker assigned to a deal can read the full Deal Object, including other workers' contributions. The Analyst can see the Title Expert's findings. The Investor Governance Worker can see the Analyst's score. Context flows freely.

**3. The Deal Object is the communication channel.** Workers don't message each other directly. They write to the Deal Object and other workers read it. This is simpler, more auditable, and more reliable than direct worker-to-worker messaging.

**4. Referrals are explicit.** When a worker suggests a handoff to another worker, it's logged with: what triggered it, what data transfers, and whether the user approved. Full transparency.

---

## Layer 2: Worker Interoperability

### Three Communication Patterns

#### Pattern 1: Pre-Defined Pipeline
Workers execute in a pre-defined sequence. The user (or Chief of Staff) sets up the pipeline in advance. Each worker completes its task, writes to the Vault, and the next worker picks up.

**Use case:** Scott's acquisition pipeline. Every deal goes through the same sequence: screen -> title -> entitlement -> docs -> investor.

**Already defined in WORKER_TYPES.md (Prompt 22c).**

#### Pattern 2: Ad Hoc Referral
A worker is performing its primary task and identifies a need outside its domain. It completes its task, then offers to refer to another worker. The user approves the handoff. Context transfers through the Vault.

**Use case:** User is doing a title review. Title Expert notices the property is undervalued. Suggests referring to the Analyst Worker.

**Governed by Tier 0 rules P0.13-P0.15 (defined below).**

#### Pattern 3: Worker-Initiated Discovery
A worker identifies a need and there's no appropriate worker in the user's subscriptions or on the marketplace. The worker flags the gap and either suggests a marketplace alternative or logs the need to the Worker Request Board.

**Use case:** Title Expert finds a tribal land easement issue. No Tribal Land Easement Worker exists. Flags the gap as a market signal for creators.

### Referral Decision Tree

```
Worker detects need outside its domain
  |
  +- Does user subscribe to a relevant worker?
  |   +- YES -> Offer referral to that specific worker
  |   |         "Want me to send this to your Analyst Worker?"
  |   |
  |   +- NO -> Is there a relevant worker on the marketplace?
  |       +- YES -> Mention the marketplace option (ONE suggestion)
  |       |         "The CRE Analyst Worker on the marketplace
  |       |          handles this. Want to check it out?"
  |       |
  |       +- NO -> Flag the gap
  |               "I identified a need for [X]. No worker exists
  |                for this yet. You could request one be built
  |                or handle this with a professional."
  |               Log to Worker Request Board as demand signal.
  |
  +- ALWAYS: Complete primary task first. One suggestion max.
             Never interrupt. Never hard-sell.
```

### Tier 0 Platform Rules for Interoperability

These rules are LOCKED and apply to EVERY worker on the platform. They cannot be modified or disabled by creators.

**P0.13 -- Vault Awareness**
Every Digital Worker reads from and writes to the user's Vault. All work product -- analysis results, scores, recommendations, generated documents, flags, and logs -- must be stored as structured data in the Deal Object, not just as chat text. Workers must check the Vault for existing context before starting a task. If another worker has already contributed relevant data to the Deal Object, the current worker must acknowledge and build on that work, not duplicate it.

**P0.14 -- Referral Protocol**
When a worker identifies a need outside its domain during the course of its primary task, it must:
1. Complete its primary task first. Never interrupt primary task flow for a referral.
2. Check the user's active subscriptions for a relevant worker.
3. If found: offer ONE referral suggestion with a brief explanation of why.
4. If not found: check the marketplace catalog. Offer ONE suggestion with rating and price. Never hard-sell.
5. If no worker exists: flag the gap and offer alternatives (manual process, professional consultation, or worker request).
6. Maximum ONE referral suggestion per session. Never stack multiple suggestions.
7. The referral must be genuinely triggered by work context, not generic upselling. The RAAS library defines specific trigger conditions for each worker.

**P0.15 -- Context Transfer Consent**
When referring to another worker, the referring worker must:
1. Explicitly state what data will transfer to the receiving worker.
2. Require user approval before any data transfers.
3. Only transfer data relevant to the identified need (not the entire Deal Object history).
4. Log the referral in the Deal Object's referral history with: from, to, reason, data transferred, user approval status, and timestamp.

**P0.16 -- Contribution Integrity**
No worker may modify, delete, or overwrite another worker's contributions to a Deal Object. Each worker writes to its own namespace (`contributions.{workerId}`). Workers may read all contributions but may only write to their own. This ensures audit trail integrity and prevents conflicts.

**P0.17 -- Vault Privacy Scope**
Workers may only access Deal Objects that belong to the authenticated user or organization. Workers cannot access other users' Vaults or Deal Objects. Within an organization, access is governed by the member's role permissions.

---

## Layer 3: Chief of Staff Worker

### What It Is

The Chief of Staff is a specialized Digital Worker whose sole function is orchestration. It does not perform analysis, review titles, generate documents, or do any specialist work. It delegates, coordinates, monitors, and reports.

It is the single entry point for complex, multi-worker tasks. The user tells the Chief of Staff what they need, and it figures out which workers to deploy, in what order, with what dependencies.

### How It's Unlocked

**Free with 3+ active worker subscriptions.**

```
1-2 workers:  Workers use simple referral system (P0.14)
              No Chief of Staff needed -- direct worker interaction

3+ workers:   Chief of Staff automatically added to Vault
              FREE -- no additional subscription fee
              Coordinates all active workers
              Becomes the primary entry point for complex tasks
```

This bundling strategy:
- **Incentivizes multi-worker adoption:** "Buy three, get a coordinator free"
- **Increases retention:** Once the Chief of Staff is coordinating your workflow, switching costs are massive
- **Drives organic growth:** The Chief of Staff identifies gaps and suggests new workers from genuine work context
- **Increases ARPU:** Every worker the Chief of Staff recommends is a real, contextual need -- not a generic upsell

### Chief of Staff RAAS Library

**Tier 0:** Inherits all platform rules (P0.1-P0.17)

**Tier 1: Regulatory Awareness**
The Chief of Staff does not perform regulated tasks itself, but it must be aware of regulatory requirements when sequencing work. For example:
- Investment offerings require Reg D compliance before investor outreach -> ensure Governance Worker runs before investor communication
- Title review must be completed before closing documents -> enforce dependency
- Environmental assessment may be legally required before acquisition -> flag if Environmental Worker is not in the pipeline

**Tier 2: Orchestration Best Practices**

- **BP-CoS.1 -- Task Decomposition:** When receiving a complex directive, break it into discrete tasks and identify which specialist worker handles each task. Present the task plan to the user for approval before execution.

- **BP-CoS.2 -- Parallel Execution:** Identify tasks that can run simultaneously (e.g., title review and market analysis can run in parallel; document generation must wait for analysis completion). Maximize parallelism to reduce total time.

- **BP-CoS.3 -- Dependency Management:** Identify task dependencies and enforce sequencing. Never send incomplete data downstream. If Worker A's output is required by Worker B, Worker B does not start until Worker A completes.

- **BP-CoS.4 -- Decision Gates:** At defined points in the pipeline, pause and present results to the user for approval before proceeding. Default decision gates:
  - After screening/scoring: User decides whether to proceed
  - After document generation: User reviews before investor outreach
  - After investor commitments: User approves closing

- **BP-CoS.5 -- Progress Reporting:** Provide clear, concise status updates as tasks complete. Include: what's done, what's in progress, what's waiting, and any blockers. Use a consistent format:
  ```
  Completed: [task] -- [key result]
  In Progress: [task] -- [ETA]
  Waiting: [task] -- [waiting on what]
  Blocked: [task] -- [what's needed]
  ```

- **BP-CoS.6 -- Gap Identification:** When the user's active worker subscriptions do not cover a required task in the pipeline, flag the gap immediately. Suggest specific marketplace alternatives. Never silently skip a required step.

- **BP-CoS.7 -- Learning from History:** Track pipeline outcomes over time. If a particular worker consistently flags issues (e.g., entitlement problems in a specific market), proactively alert the user on future deals in that market.

**Tier 3: User Customization**
The user configures:
- Default pipeline sequences for common workflows (e.g., "Acquisition Pipeline," "Development Pipeline")
- Which decision gates are active vs. auto-approve
- Notification preferences (real-time vs. summary)
- Priority rules (e.g., "always run title first," "skip construction estimate on new builds")
- Custom approval thresholds (e.g., "auto-proceed if Analyst scores above 80")

### Personalization Settings

The Chief of Staff is customizable. It's not a generic bot -- it's YOUR operations coordinator.

**Default name: Alex** (ties to alex@titleapp.ai -- Alex is already on the team)

```
Route: /settings/chief-of-staff

CHIEF OF STAFF SETTINGS
+---------------------------------------------------+
|                                                     |
|  Name:  [Alex_______________]  (editable)           |
|                                                     |
|  Voice: [Select voice]                              |
|         - Alex (default, gender-neutral)            |
|         - Professional Male                         |
|         - Professional Female                       |
|         - Custom (coming soon)                      |
|                                                     |
|  Voice Interaction:  [ON] / OFF                     |
|  (Talk to your Chief of Staff via mic)              |
|                                                     |
|  Communication Style:                               |
|    ( ) Brief -- "Deal scored 82. Proceeding."       |
|    (*) Standard -- Score + key factors + next steps  |
|    ( ) Detailed -- Full breakdown with reasoning     |
|                                                     |
|  Notification Preferences:                          |
|    [x] Real-time updates as tasks complete           |
|    [ ] Summary report when pipeline finishes         |
|    [x] Alert on blockers or gaps                     |
|                                                     |
|  [Save Settings]                                    |
+---------------------------------------------------+
```

Throughout the platform, the experience is personalized:
- "Alex is running your acquisition pipeline..."
- "Alex identified a gap in your workflow."
- "Ask Alex to coordinate this."
- Voice: "Hey Alex, run the full pipeline on the Phoenix deal."

The name "Alex" is gender-neutral, professional, and already has a presence in the system (alex@titleapp.ai). It creates continuity -- Alex isn't a chatbot, Alex is a team member.

### Chief of Staff Capabilities

```javascript
// What the Chief of Staff can do
const chiefOfStaff = {
  // Read user's active worker subscriptions
  getActiveWorkers: async (orgId) => {...},

  // Create a task plan from a high-level directive
  decomposeTasks: async (directive, activeWorkers) => {...},

  // Assign a task to a specialist worker
  delegateTask: async (workerId, dealId, taskSpec) => {...},

  // Monitor task progress
  getTaskStatus: async (dealId) => {...},

  // Identify missing workers for a pipeline
  identifyGaps: async (requiredCapabilities, activeWorkers) => {...},

  // Search marketplace for gap-filling workers
  searchMarketplace: async (capability, vertical) => {...},

  // Generate status report for user
  generateStatusReport: async (dealId) => {...},

  // Create/save a reusable pipeline template
  savePipelineTemplate: async (name, steps) => {...},

  // Load a saved pipeline template
  loadPipelineTemplate: async (templateName) => {...},
};
```

### Chief of Staff Worker -- Firestore Entry

```javascript
// digitalWorkers/chief-of-staff
{
  "workerId": "chief-of-staff",
  "name": "Chief of Staff",
  "type": "orchestrator",                    // New worker type
  "description": "Your AI operations coordinator. Delegates tasks to your specialist workers, manages pipelines, tracks progress, and identifies gaps. Free with 3+ worker subscriptions.",
  "vertical": "platform",                    // Not vertical-specific
  "tier": "free_with_bundle",               // Pricing tier
  "capabilities": [
    "task_decomposition",
    "worker_delegation",
    "pipeline_management",
    "progress_monitoring",
    "gap_identification",
    "status_reporting"
  ],
  "canAccessWorkers": "*",                   // Can delegate to any worker
  "canReadVault": true,
  "canWriteVault": true,                     // Writes to activityLog and pipeline status
  "canSearchMarketplace": true,
  "maxParallelTasks": 5,
  "raasLibrary": "chief-of-staff-raas-v1"
}
```

---

## The Worker Request Board

When no worker exists for an identified need, the gap is logged to a public board that creators can browse.

### How It Works

1. A specialist worker (or the Chief of Staff) identifies a need that no existing worker covers.
2. With user permission, the need is logged to the Worker Request Board (anonymized -- no user data, just the capability need).
3. Creators browse the board to see demand signals.
4. A creator can "claim" a request, indicating they're building a worker for that need.
5. Users who requested the capability are notified when a matching worker is published.

### Schema

```javascript
// Collection: workerRequests
{
  "requestId": "req-001",
  "capability": "Tribal land easement analysis",
  "vertical": "real_estate",
  "requestedBy": "anonymized",               // No user data exposed
  "requestCount": 3,                          // Number of users who requested this
  "sourceWorker": "title-expert-001",         // Which worker identified the gap
  "context": "Title reviews involving tribal land easements require specialized knowledge of federal Indian law and BIA regulations.",
  "status": "open",                           // open, claimed, in_development, published
  "claimedBy": null,
  "createdAt": "2026-03-01T00:00:00Z",
  "lastRequestedAt": "2026-03-15T00:00:00Z"
}
```

### Request Board UI

```
Route: /marketplace/requests (visible to creators)

+-------------------------------------------------------+
|  WORKER REQUEST BOARD                                  |
|  Build what the market needs                           |
|                                                        |
|  +--------------------------------------------------+ |
|  | 7 requests   |  Tribal Land Easement Analyst      | |
|  | Real Estate  |  Analyze easements on tribal       | |
|  | Status: OPEN |  land, BIA regulations...          | |
|  |              |  [Claim This Request]              | |
|  +--------------------------------------------------+ |
|  +--------------------------------------------------+ |
|  | 4 requests   |  Solar Easement Compliance         | |
|  | Energy       |  Review solar access rights        | |
|  | CLAIMED      |  and state-specific regs...        | |
|  |              |  Builder: @solardev (ETA: 2wk)     | |
|  +--------------------------------------------------+ |
|  +--------------------------------------------------+ |
|  | 3 requests   |  Maritime Title Specialist         | |
|  | Legal        |  Admiralty law, riparian rights     | |
|  | Status: OPEN |  tidal boundaries...               | |
|  |              |  [Claim This Request]              | |
|  +--------------------------------------------------+ |
+-------------------------------------------------------+
```

This creates a direct feedback loop between user demand and creator supply. The marketplace grows from real needs, not guesswork.

---

## Pricing & Bundling Model

### Worker Pricing Tiers (Updated)

| Tier | Monthly | Description |
|------|---------|-------------|
| Starter | $9/mo | Single-function standalone worker |
| Professional | $29/mo | Advanced standalone worker with deeper capabilities |
| Business | $49/mo | Composite worker or pipeline-capable worker |
| Enterprise | $79/mo | Premium multi-domain composite worker |
| Chief of Staff | FREE | Unlocked automatically with 3+ active subscriptions |

### Bundling Strategy

```
BUNDLE: "BUILD YOUR TEAM"

Subscribe to any 3 workers -> Chief of Staff unlocked FREE

Marketing:
"Every team needs a coordinator. Subscribe to 3 or more
Digital Workers and your Chief of Staff is on us. It
coordinates your entire workflow, tracks progress across
all your workers, and makes sure nothing falls through
the cracks."

Why this works:
- Incentivizes going from 2 workers to 3 (revenue +33-100%)
- Chief of Staff drives further adoption (identifies gaps -> suggests workers)
- Retention: canceling means losing your coordinator and dismantling workflows
- The "free" worker is the best salesperson on the platform
```

### Revenue Impact Model

```
User with 2 workers:  ~$38-58/mo
  -> Incentivize to add 1 more for free Chief of Staff

User with 3 workers:  ~$47-87/mo + free Chief of Staff
  -> Chief of Staff identifies 1-2 additional needs per quarter

User with 5 workers:  ~$85-165/mo + free Chief of Staff
  -> Chief of Staff running full operational pipeline
  -> Switching cost: very high (would need to rebuild entire workflow)

User with 8 workers:  ~$152-312/mo + free Chief of Staff
  -> Platform is running significant portion of business operations
  -> Switching cost: prohibitive
```

---

## Comparison: TitleApp vs. Shopify/Salesforce App Stores

| Dimension | Shopify/Salesforce | TitleApp |
|-----------|-------------------|----------|
| **Data sharing** | Each app has own database. Must export/import or build custom APIs. | All workers share the Vault. Same database, same schema. |
| **Integration** | Zapier, custom APIs, middleware. Fragile, breaks, costs extra. | Native. Workers read/write to Vault automatically. Zero config. |
| **Billing** | Each app bills separately. Surprise charges. Multiple invoices. | One subscription, one invoice, one payment method. |
| **Auth** | Separate logins per app. Multiple passwords. SSO if you're lucky. | One login. One account. All workers accessible. |
| **Compliance** | Each app has own privacy policy, own security posture. Hope they're compliant. | RAAS Tier 0 rules apply to every worker. Consistent compliance platform-wide. |
| **Coordination** | User manually coordinates between apps. User is the integration layer. | Chief of Staff coordinates automatically. User says "go." |
| **Discovery** | Browse massive app store. Read reviews. Hope it works with your other apps. | Chief of Staff identifies real needs from work context. Relevant, not random. |
| **Creator experience** | Build custom integrations for every other app you want to connect to. | Build your worker. Vault interoperability is automatic. Focus on domain expertise. |
| **Switching cost** | Low per app. Just uninstall and install alternative. | High. Workers are interconnected through Vault and Chief of Staff. |

---

## Implementation Priority

### Phase 1: Vault Core (HIGH -- enables everything)
1. Vault schema in Firestore (deal objects, contributions, referral log)
2. Worker runtime gets Vault read/write methods
3. Deal Object CRUD API
4. Basic Vault UI in user workspace

### Phase 2: Referral System (HIGH -- enables worker awareness)
1. Implement P0.13-P0.17 in worker runtime
2. Subscription registry query (what workers does this user have?)
3. Marketplace search API for gap identification
4. Referral UI component (suggestion card)
5. Update Worker #1 to generate Tier 2 referral maps

### Phase 3: Chief of Staff Worker (MEDIUM -- enables orchestration)
1. Build Chief of Staff worker with orchestration RAAS
2. Task decomposition engine
3. Parallel/sequential execution manager
4. Progress monitoring and status reporting
5. Pipeline template save/load
6. Auto-unlock logic (3+ subscriptions)

### Phase 4: Worker Request Board (LOW -- enables marketplace growth)
1. Request schema in Firestore
2. Request Board UI for creators
3. Claim and status tracking
4. Notification system for requesters
5. Integration with Worker #1 (pre-populate research when creator claims a request)

---

## Tier 0 Rules Summary (Complete List)

For reference, the complete Tier 0 rule set as of this document:

| Rule | Name | Source |
|------|------|--------|
| P0.1 | Do No Harm | 22a (Worker #1) |
| P0.2 | Transparency | 22a |
| P0.3 | Human Override | 22a |
| P0.4 | Data Privacy | 22a |
| P0.5 | Audit Trail | 22a |
| P0.6 | No Unauthorized Practice | 22a |
| P0.7 | Scope Limitation | 22a |
| P0.8 | Error Handling | 22a |
| P0.9 | Document Disclosure | 22b (Document Engine) |
| P0.10 | Document Audit Trail | 22b |
| P0.11 | Document Retention | 22b |
| P0.12 | No Misleading Credentials | 22b |
| P0.13 | Vault Awareness | 22d (This document) |
| P0.14 | Referral Protocol | 22d |
| P0.15 | Context Transfer Consent | 22d |
| P0.16 | Contribution Integrity | 22d |
| P0.17 | Vault Privacy Scope | 22d |

---

## What Success Looks Like

A user like Scott subscribes to 5 specialist workers. His Chief of Staff is automatically unlocked. He gets a deal package from a broker.

He opens his Vault, tells the Chief of Staff: "Run the full acquisition pipeline on this Phoenix deal."

The Chief of Staff breaks it into tasks, assigns them to specialists, runs what it can in parallel, pauses at decision gates for Scott's approval, generates all deliverables through the Document Engine, and hands off to the Investor Governance Worker to begin capital raising.

Scott doesn't manage 5 separate AI tools. He manages one team. His workers talk to each other. Context flows automatically. Nothing falls through the cracks.

**That's not an app store. That's an operating system for business.**
