# TitleApp API Architecture

This spec defines the API endpoints for TitleApp. All endpoints align with the URL architecture defined in URL_ARCHITECTURE.md (22e). The frontend routes and API routes use the same slug/ID conventions so there's never a mismatch between what the user sees in the browser and what the backend serves.

T1 is building the URL architecture (22e). T2 is building the IR Worker (Session 25). This spec ensures the API layer is consistent with both.

---

## Conventions

### Base URL
```
Production:  https://api.titleapp.ai/v1
Staging:     https://api.staging.titleapp.ai/v1
```

### Authentication
- Firebase Auth JWT in `Authorization: Bearer {token}` header
- Public endpoints (marketplace browsing, worker detail pages) require no auth
- Vault and worker chat endpoints require auth
- Admin endpoints require auth + admin role

### Response Format
All responses follow:
```json
{
  "status": "ok",
  "data": { ... },
  "meta": {
    "requestId": "req-abc123",
    "timestamp": "2026-03-01T12:00:00Z"
  }
}
```

Error responses:
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Worker not found",
    "details": {}
  },
  "meta": { ... }
}
```

### Slug Resolution
Worker slugs (human-readable, from URL) resolve to worker IDs (internal, from Firestore) at the API layer. The client always sends slugs. The API resolves to IDs internally.

```
Client sends:   GET /v1/workers/cre-analyst
API resolves:   slug "cre-analyst" -> workerId "cre-deal-analyst-001"
API queries:    Firestore digitalWorkers/cre-deal-analyst-001
```

### Pagination
List endpoints support cursor-based pagination:
```
GET /v1/workers?limit=20&cursor={lastDocId}
```

---

## Public Endpoints (No Auth Required)

### Workers / Marketplace

```
GET /v1/workers
  Query params:
    - vertical: string (e.g., "real_estate", "construction")
    - suite: string (suite slug, e.g., "finance")
    - type: "standalone" | "composite" | "orchestrator"
    - sort: "popular" | "newest" | "top_rated" | "price_low" | "price_high"
    - search: string (full-text search on name + description)
    - limit: number (default 20, max 50)
    - cursor: string
  Returns: Array of worker summaries (slug, name, description, rating, price, vertical, type, creator)

GET /v1/workers/{slug}
  Returns: Full worker detail
    - slug, workerId, name, description, type, vertical
    - creator (username, displayName)
    - pricing (tier, monthlyPrice, trialDays)
    - rating (average, count)
    - capabilities (array of strings)
    - compliance (raasLevel, ruleCount, domains)
    - relatedWorkers (array of slugs -- "works with")
    - suiteId
    - subscriberCount
    - screenshots (array of image URLs)
    - onboardingSteps (summary of first-time flow)

GET /v1/workers/{slug}/reviews
  Query params:
    - sort: "newest" | "highest" | "lowest"
    - limit: number
    - cursor: string
  Returns: Array of reviews (userId anonymized, rating, text, date)

GET /v1/workers/{slug}/demo
  Returns: Demo configuration (max exchanges, capabilities available, CTA)
  Note: Demo chat uses POST /v1/workers/{slug}/demo/chat (rate-limited, no auth)

POST /v1/workers/{slug}/demo/chat
  Body: { "message": "Analyze this deal..." }
  Rate limit: 5 exchanges per session, 20 per IP per day
  Returns: Worker response (limited capabilities, no file upload, no Vault access)
```

### Suites

```
GET /v1/suites
  Returns: Array of all suites (slug, name, description, workerCount, iconUrl)

GET /v1/suites/{suite-slug}
  Returns: Suite detail
    - slug, name, description, vertical
    - workers (array of worker summaries in this suite)
    - bundle (recommended workers, combined price, savings)
    - compliance (industry-specific regulatory overview)

GET /v1/suites/{suite-slug}/bundle
  Returns: Bundle configuration
    - workers (array of worker slugs + prices)
    - totalPrice, bundlePrice (if discounted)
    - includesChiefOfStaff (true if 3+ workers)
    - trialDays
```

### Creators

```
GET /v1/creators/{username}
  Returns: Creator public profile
    - username, displayName, bio, avatarUrl
    - joinedAt
    - publishedWorkers (array of worker summaries)
    - totalUsers (across all workers)
    - averageRating (across all workers)

GET /v1/creators/{username}/workers
  Returns: Array of worker summaries by this creator
```

### Referrals

```
GET /v1/ref/{code}
  Returns: Referral resolution
    - type: "creator" | "user" | "campaign"
    - redirectTo: URL (worker page, suite page, or landing page)
    - attribution: { source, medium, campaign } (for tracking)
  Side effect: Sets attribution cookie on client
```

### Search

```
GET /v1/search
  Query params:
    - q: string (search query)
    - type: "workers" | "suites" | "creators" | "all"
    - limit: number
  Returns: Combined search results across workers, suites, creators
```

---

## Authenticated Endpoints (Auth Required)

### Worker Interaction

```
POST /v1/workers/{slug}/chat
  Headers: Authorization: Bearer {token}
  Body: {
    "message": "Analyze this deal package",
    "attachments": ["fileId-1", "fileId-2"],   // Uploaded files
    "dealId": "deal-001"                        // Optional -- associates with Vault deal
  }
  Returns: {
    "response": "I'll analyze this deal against your criteria...",
    "workerActions": [
      { "type": "scoring", "status": "in_progress" },
      { "type": "vault_write", "dealId": "deal-001", "field": "screening" }
    ],
    "suggestedFollowUp": ["Upload rent roll", "Adjust cap rate threshold"]
  }

POST /v1/workers/{slug}/chat/stream
  Same as above but returns Server-Sent Events for streaming responses
  SSE format: data: { "type": "text_delta", "content": "..." }

GET /v1/workers/{slug}/onboarding
  Headers: Authorization: Bearer {token}
  Returns: Onboarding flow definition
    - steps (array of onboarding steps with type, prompt, fields)
    - completedSteps (what user has already done)
    - requiredUploads (e.g., "investment_thesis")

POST /v1/workers/{slug}/onboarding
  Headers: Authorization: Bearer {token}
  Body: {
    "step": "investment_criteria",
    "data": {
      "targetMarkets": ["phoenix", "denver", "salt_lake"],
      "maxReplacementCostBasis": 0.55,
      "minimumUnits": 100,
      "targetIRR": 0.15
    }
  }
  Returns: { "nextStep": "upload_thesis", "progress": 0.66 }

POST /v1/workers/{slug}/upload
  Headers: Authorization: Bearer {token}
  Body: multipart/form-data with file
  Returns: { "fileId": "file-abc123", "fileName": "deal_brief.pdf", "size": 245000 }
```

### Subscriptions

```
GET /v1/subscriptions
  Headers: Authorization: Bearer {token}
  Returns: Array of user's active subscriptions
    - workerId, slug, name, tier, monthlyPrice, startedAt, status

POST /v1/subscriptions
  Headers: Authorization: Bearer {token}
  Body: { "workerSlug": "cre-analyst", "tier": "professional" }
  Returns: Subscription confirmation + Stripe checkout session URL
  Side effect: If this is the 3rd subscription, auto-adds Chief of Staff

DELETE /v1/subscriptions/{subscriptionId}
  Headers: Authorization: Bearer {token}
  Returns: Cancellation confirmation
  Side effect: If dropping below 3 subscriptions, flags Chief of Staff removal (grace period)

GET /v1/subscriptions/bundle-check
  Headers: Authorization: Bearer {token}
  Returns: {
    "activeCount": 2,
    "chiefOfStaffEligible": false,
    "workersNeeded": 1,
    "suggestedWorker": { "slug": "title-expert", "reason": "Complements your CRE Analyst" }
  }
```

### Vault

```
GET /v1/vault
  Headers: Authorization: Bearer {token}
  Returns: Vault overview (org info, active workers, deal count, document count)

--- Deal Objects ---

GET /v1/vault/deals
  Headers: Authorization: Bearer {token}
  Query params:
    - status: "screening" | "approved" | "docs_generated" | "investor_ready" | "archived"
    - sort: "newest" | "score_high" | "score_low"
    - limit, cursor
  Returns: Array of deal object summaries

POST /v1/vault/deals
  Headers: Authorization: Bearer {token}
  Body: {
    "property": {
      "name": "Phoenix Gateway Apartments",
      "address": "1234 N Central Ave, Phoenix, AZ",
      "type": "multifamily",
      "units": 200,
      "askingPrice": 35000000
    },
    "source": "broker",
    "sourceName": "Marcus & Millichap"
  }
  Returns: Created deal object with dealId

GET /v1/vault/deals/{dealId}
  Headers: Authorization: Bearer {token}
  Returns: Full deal object with all worker contributions, referral log, activity log

PATCH /v1/vault/deals/{dealId}
  Headers: Authorization: Bearer {token}
  Body: { "status": "approved" }  // or any updatable field
  Returns: Updated deal object

DELETE /v1/vault/deals/{dealId}
  Headers: Authorization: Bearer {token}
  Returns: Archived (soft delete -- moved to archived status, not destroyed)

GET /v1/vault/deals/{dealId}/contributions
  Headers: Authorization: Bearer {token}
  Returns: All worker contributions for this deal, organized by worker

GET /v1/vault/deals/{dealId}/activity
  Headers: Authorization: Bearer {token}
  Returns: Full activity log / audit trail

--- Documents ---

GET /v1/vault/documents
  Headers: Authorization: Bearer {token}
  Query params:
    - dealId: string (filter by deal)
    - format: "pdf" | "docx" | "xlsx" | "pptx"
    - sort, limit, cursor
  Returns: Array of generated documents

POST /v1/vault/documents/generate
  Headers: Authorization: Bearer {token}
  Body: {
    "templateId": "cre-deal-analysis",
    "format": "pdf",
    "dealId": "deal-001",
    "content": { ... },             // Structured content from worker
    "branding": "org-default"       // or custom branding config
  }
  Returns: { "documentId": "doc-abc", "downloadUrl": "...", "expiresAt": "..." }

GET /v1/vault/documents/{documentId}
  Headers: Authorization: Bearer {token}
  Returns: Document metadata + download URL

GET /v1/vault/documents/{documentId}/download
  Headers: Authorization: Bearer {token}
  Returns: File stream (PDF, DOCX, etc.)

--- Pipelines ---

GET /v1/vault/pipelines
  Headers: Authorization: Bearer {token}
  Returns: Array of configured pipelines

POST /v1/vault/pipelines
  Headers: Authorization: Bearer {token}
  Body: {
    "name": "CRE Acquisition Pipeline",
    "steps": [
      { "order": 1, "workerSlug": "cre-analyst", "handoff": "approval_gate" },
      { "order": 2, "workerSlug": "title-expert", "handoff": "automatic" },
      { "order": 3, "workerSlug": "investor-relations", "handoff": "automatic" }
    ],
    "autoApproveThreshold": 80
  }
  Returns: Created pipeline

POST /v1/vault/pipelines/{pipelineId}/execute
  Headers: Authorization: Bearer {token}
  Body: { "dealId": "deal-001" }
  Returns: Pipeline execution status (started, step statuses)

GET /v1/vault/pipelines/{pipelineId}/status
  Headers: Authorization: Bearer {token}
  Returns: Current execution state of all steps
```

### Chief of Staff (Alex)

```
POST /v1/alex/chat
  Headers: Authorization: Bearer {token}
  Body: {
    "message": "Run the full acquisition pipeline on the Phoenix deal",
    "dealId": "deal-001"          // Optional -- associates with specific deal
  }
  Returns: Alex's response + task plan + delegated actions

GET /v1/alex/status
  Headers: Authorization: Bearer {token}
  Returns: Overview of all active tasks Alex is managing

GET /v1/alex/settings
  Headers: Authorization: Bearer {token}
  Returns: Alex personalization settings (name, voice, comm style, notifications)

PATCH /v1/alex/settings
  Headers: Authorization: Bearer {token}
  Body: { "name": "Jordan", "communicationStyle": "brief" }
  Returns: Updated settings
```

### Referrals (Authenticated)

```
GET /v1/account/referral-code
  Headers: Authorization: Bearer {token}
  Returns: User's referral code and shareable URL

GET /v1/account/referrals
  Headers: Authorization: Bearer {token}
  Returns: Referral history (who signed up, status, credits earned)
```

---

## Creator Endpoints (Auth + Creator Role Required)

```
GET /v1/creator/workers
  Returns: Creator's published and draft workers

POST /v1/creator/workers
  Body: Worker configuration from Sandbox/Worker #1
  Returns: Created worker (draft status)

PATCH /v1/creator/workers/{workerId}
  Body: Updated worker config
  Returns: Updated worker

POST /v1/creator/workers/{workerId}/publish
  Body: { "slug": "my-cool-worker", "tier": "professional", "price": 2900 }
  Pre-check: 7-point acceptance criteria must pass
  Returns: Published worker with marketplace URL

GET /v1/creator/analytics
  Query params: workerId (optional, for specific worker)
  Returns: Subscriber count, revenue, ratings, usage metrics

GET /v1/creator/requests
  Returns: Worker Request Board -- open requests matching creator's verticals

POST /v1/creator/requests/{requestId}/claim
  Returns: Claimed request (creator commits to building it)
```

---

## Admin Endpoints (Auth + Admin Role Required)

```
GET /v1/admin/workers/review-queue
  Returns: Workers pending review (from creator submissions)

POST /v1/admin/workers/{workerId}/approve
  Returns: Approved worker (moves to marketplace)

POST /v1/admin/workers/{workerId}/reject
  Body: { "reason": "RAAS violations in Tier 2 rules" }
  Returns: Rejected worker with feedback

GET /v1/admin/metrics
  Returns: Platform metrics (users, subscribers, revenue, workers published)

GET /v1/admin/slugs
  Returns: All registered slugs with status
```

---

## Worker Discovery & Referral Endpoints (Embedded in All Chat)

These endpoints power the referral protocol (P0.14) and Chief of Staff orchestration (22d). They are called BY workers during chat -- not directly by the user. Every worker chat session has access to these internally.

### Worker Discovery (Called by Workers Mid-Chat)

```
GET /v1/discovery/user-workers
  Headers: Authorization: Bearer {token}
  Returns: Array of user's active subscribed workers
    - slug, name, capabilities, vertical
  Purpose: Worker checks what other workers the user has before making a referral
  Called by: Any worker during chat when it detects an out-of-domain need

GET /v1/discovery/marketplace-match
  Headers: Authorization: Bearer {token}
  Body: {
    "capability": "investment_analysis",
    "vertical": "real_estate",
    "context": "Title review revealed property below replacement cost"
  }
  Returns: Top 3 matching workers from marketplace
    - slug, name, rating, price, relevanceScore
    - reason: "Handles CRE deal analysis and scoring"
  Purpose: Worker finds relevant marketplace workers when user doesn't have one
  Called by: Any worker when referral target not in user's subscriptions

GET /v1/discovery/gap-check
  Headers: Authorization: Bearer {token}
  Body: {
    "requiredCapabilities": ["deal_analysis", "title_review", "investor_docs", "entitlement_review"],
    "userWorkers": ["cre-analyst", "title-expert"]
  }
  Returns: {
    "covered": ["deal_analysis", "title_review"],
    "gaps": [
      { "capability": "investor_docs", "suggestedWorker": "investor-relations", "price": "$49/mo" },
      { "capability": "entitlement_review", "suggestedWorker": "entitlement-analyst", "price": "$29/mo" }
    ],
    "chiefOfStaffEligible": false,
    "workersNeededForCoS": 1
  }
  Purpose: Alex and pipeline builder identify missing workers
  Called by: Chief of Staff when planning a pipeline; pipeline builder UI
```

### Worker Referrals (Called by Workers Mid-Chat)

```
POST /v1/referrals/suggest
  Headers: Authorization: Bearer {token}
  Body: {
    "fromWorkerSlug": "title-expert",
    "toWorkerSlug": "cre-analyst",
    "dealId": "deal-001",
    "reason": "Property trading at 47% below estimated replacement cost",
    "dataToTransfer": ["property.address", "property.type", "contributions.title-expert-001.titleStatus"],
    "triggerRule": "BP2.14-replacement-cost-flag"
  }
  Returns: {
    "referralId": "ref-abc123",
    "status": "pending_user_approval",
    "suggestion": {
      "message": "I noticed this property may be trading well below replacement cost. Your CRE Deal Analyst could evaluate this as an investment. Want me to send it over?",
      "toWorker": { "slug": "cre-analyst", "name": "CRE Deal Analyst" },
      "dataPreview": ["Property address", "Property type", "Title status: clean"]
    }
  }
  Purpose: Worker formally suggests a referral -- returns the suggestion message for display in chat
  Called by: Any worker when its RAAS referral rules trigger
  Note: This does NOT execute the referral. It creates a pending suggestion for user approval.

POST /v1/referrals/{referralId}/approve
  Headers: Authorization: Bearer {token}
  Returns: {
    "status": "approved",
    "action": "context_transferred",
    "redirectTo": "/workers/cre-analyst/chat?dealId=deal-001"
  }
  Side effects:
    - Transfers specified data fields to target worker's context
    - Logs referral in deal object's referral history
    - If target worker is not subscribed, returns marketplace page instead

POST /v1/referrals/{referralId}/dismiss
  Headers: Authorization: Bearer {token}
  Returns: { "status": "dismissed" }
  Side effect: Logged (helps tune referral quality over time)

POST /v1/referrals/marketplace-suggest
  Headers: Authorization: Bearer {token}
  Body: {
    "fromWorkerSlug": "title-expert",
    "capability": "tribal_land_easement_analysis",
    "context": "Title involves tribal land easement requiring specialized analysis"
  }
  Returns: {
    "matchFound": false,
    "suggestion": {
      "message": "I identified a need for tribal land easement analysis. No specialized worker exists on the platform yet. Would you like to request one be built, or handle this with a professional consultant?",
      "options": [
        { "action": "request_worker", "label": "Request this worker be built" },
        { "action": "dismiss", "label": "Handle manually" }
      ]
    }
  }
  Purpose: Handles the case where no matching worker exists -- feeds Worker Request Board
  Called by: Any worker when it detects an unserviceable need

POST /v1/worker-requests
  Headers: Authorization: Bearer {token}
  Body: {
    "capability": "Tribal land easement analysis",
    "vertical": "real_estate",
    "sourceWorkerSlug": "title-expert",
    "context": "Title reviews involving tribal land easements require specialized federal Indian law knowledge"
  }
  Returns: { "requestId": "req-001", "status": "submitted" }
  Side effect: Added to Worker Request Board for creators
```

### Chief of Staff Orchestration

```
POST /v1/alex/plan
  Headers: Authorization: Bearer {token}
  Body: {
    "directive": "Run the full acquisition pipeline on the Phoenix deal",
    "dealId": "deal-001"
  }
  Returns: {
    "planId": "plan-abc123",
    "steps": [
      { "order": 1, "workerSlug": "cre-analyst", "task": "Screen and score deal", "parallel": false, "eta": "5 min" },
      { "order": 2, "workerSlug": "title-expert", "task": "Review title", "parallel": true, "eta": "10 min" },
      { "order": 2, "workerSlug": "entitlement-analyst", "task": "Verify zoning", "parallel": true, "eta": "8 min" },
      { "order": 3, "workerSlug": null, "task": "Generate documents", "service": "document-engine", "eta": "3 min" },
      { "order": 4, "workerSlug": "investor-relations", "task": "Prepare investor package", "eta": "5 min" }
    ],
    "gaps": [],
    "decisionGates": [
      { "afterStep": 1, "condition": "score >= 80", "autoApprove": true },
      { "afterStep": 3, "condition": "user_review", "autoApprove": false }
    ],
    "estimatedTotal": "~25 min",
    "status": "awaiting_approval"
  }
  Purpose: Alex decomposes a directive into a task plan for user approval

POST /v1/alex/plan/{planId}/approve
  Headers: Authorization: Bearer {token}
  Returns: { "status": "executing", "firstStep": "cre-analyst" }
  Side effect: Begins executing the pipeline

POST /v1/alex/plan/{planId}/modify
  Headers: Authorization: Bearer {token}
  Body: {
    "removeSteps": [{ "workerSlug": "entitlement-analyst" }],
    "addSteps": [],
    "adjustGates": [{ "afterStep": 1, "autoApprove": true, "condition": "score >= 75" }]
  }
  Returns: Updated plan

GET /v1/alex/plan/{planId}/status
  Headers: Authorization: Bearer {token}
  Returns: {
    "planId": "plan-abc123",
    "status": "executing",
    "steps": [
      { "order": 1, "workerSlug": "cre-analyst", "status": "complete", "result": { "score": 84 } },
      { "order": 2, "workerSlug": "title-expert", "status": "in_progress" },
      { "order": 3, "workerSlug": null, "status": "waiting" },
      { "order": 4, "workerSlug": "investor-relations", "status": "waiting" }
    ],
    "currentGate": null,
    "completedAt": null
  }

POST /v1/alex/delegate
  Headers: Authorization: Bearer {token}
  Body: {
    "workerSlug": "cre-analyst",
    "dealId": "deal-001",
    "task": "Screen this deal against user's investment criteria",
    "inputData": { "property": { ... } },
    "onComplete": "report_to_alex"
  }
  Returns: { "taskId": "task-abc", "status": "delegated" }
  Purpose: Alex assigns a specific task to a specific worker
  Called by: Alex during pipeline execution
```

### Chat Middleware -- Injected Into All Worker Chat

**CRITICAL: These capabilities are injected into every worker's chat runtime, not just Alex's.** Every worker has access to the discovery and referral APIs during conversation. This is how P0.13 (Vault Awareness) and P0.14 (Referral Protocol) work in practice.

```javascript
// Injected into every worker's runtime context
const platformServices = {
  // Vault access (P0.13)
  vault: {
    getDeal: async (dealId) => fetch(`/v1/vault/deals/${dealId}`),
    writeToDeal: async (dealId, contribution) => fetch(`/v1/vault/deals/${dealId}/contributions`, { method: 'POST', body: contribution }),
    getContributions: async (dealId) => fetch(`/v1/vault/deals/${dealId}/contributions`),
  },

  // Discovery (P0.14)
  discovery: {
    getUserWorkers: async () => fetch('/v1/discovery/user-workers'),
    findMarketplaceMatch: async (capability, vertical) => fetch('/v1/discovery/marketplace-match', { body: { capability, vertical } }),
    checkGaps: async (required) => fetch('/v1/discovery/gap-check', { body: { requiredCapabilities: required } }),
  },

  // Referrals (P0.14, P0.15)
  referrals: {
    suggest: async (toSlug, dealId, reason, data) => fetch('/v1/referrals/suggest', { body: { toWorkerSlug: toSlug, dealId, reason, dataToTransfer: data } }),
    suggestMarketplace: async (capability, context) => fetch('/v1/referrals/marketplace-suggest', { body: { capability, context } }),
  },

  // Documents (22b)
  documents: {
    generate: async (templateId, format, content, branding) => fetch('/v1/vault/documents/generate', { body: { templateId, format, content, branding } }),
  },

  // Chief of Staff awareness
  alex: {
    isActive: async () => fetch('/v1/subscriptions/bundle-check'),
    reportCompletion: async (taskId, result) => fetch(`/v1/alex/tasks/${taskId}/complete`, { body: result }),
  }
};

// This object is available to EVERY worker during chat.
// Workers use it to:
//   1. Read/write Vault deal objects
//   2. Check what other workers the user has
//   3. Suggest referrals when they detect out-of-domain needs
//   4. Generate documents through the Document Engine
//   5. Report task completion back to Alex if delegated
```

---

## Webhook Endpoints (For Integrations)

```
POST /v1/webhooks/stripe
  Stripe payment events (subscription created, payment failed, etc.)

POST /v1/webhooks/dropbox-sign
  E-signature events (signed, viewed, declined)

POST /v1/webhooks/twilio
  SMS/voice events (message received, call completed)
```

---

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public (unauthenticated) | 60 requests | per minute per IP |
| Demo chat | 5 exchanges | per session |
| Authenticated | 300 requests | per minute per user |
| Worker chat | 30 messages | per minute per user |
| Document generation | 10 documents | per hour per user |
| File upload | 50 MB per file | -- |
| Admin | 600 requests | per minute |

---

## Versioning

API is versioned in the URL: `/v1/`. Breaking changes get a new version (`/v2/`). Non-breaking additions (new fields, new endpoints) are added to the current version.

Deprecation policy: Old versions supported for 12 months after new version launch. Deprecation header included in responses: `Sunset: Sat, 01 Mar 2027 00:00:00 GMT`

---

## CORS

```
Allowed origins:
  - https://titleapp.ai
  - https://*.titleapp.ai
  - https://localhost:3000 (development)

Allowed methods: GET, POST, PATCH, DELETE, OPTIONS
Allowed headers: Authorization, Content-Type, X-Request-ID
```

---

## Priority

1. **Worker detail + chat endpoints** -- needed for Scott's email
2. **Subscription endpoints** -- needed for Stripe integration
3. **Vault deal endpoints** -- needed for worker interoperability
4. **Document generation endpoint** -- needed for Document Engine
5. **Alex endpoints** -- needed for Chief of Staff
6. **Creator endpoints** -- needed for developer program launch
7. **Admin endpoints** -- needed for worker review queue
8. **Embed + webhook endpoints** -- needed for partner integrations
