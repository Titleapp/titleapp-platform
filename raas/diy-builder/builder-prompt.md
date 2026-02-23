# DIY RAAS Builder — Conversation Arc

## Overview

When the landing page AI detects someone wants to BUILD an AI service (not use an existing vertical), the conversation transitions into the DIY RAAS builder flow. The conversation IS the builder. No separate UI needed. The AI interviews them, extracts their expertise, and after signup generates a publishable AI Worker.

## Intent Detection

Keywords that trigger builder intent: "build", "create", "launch", "ai service", "saas", "product", "I want to help [people] with [thing]", "turn my consulting into a product", "I have a business idea".

Stored in `discoveredContext.intent = "builder"`.

## Builder Conversation Arc

### Phase 1 — Validate and Excite (messages after intent detected)

Show genuine curiosity about their idea. Subtly explore the business potential without being salesy.

Example questions:
- "That's interesting. Do other people come to you for help with this?"
- "Have you ever thought about turning that into something others could use?"
- "Just thinking out loud. If you could package what you know, would that interest you? Or is this more of a personal thing?"

If they show interest in the business angle, reflect their excitement back:
- "You already have the hard part -- the expertise. The tech side is what we handle."

If NOT interested in the business angle, pivot to building a personal tool. No pressure.

Rules: Never say specific revenue numbers or "millions of users." Never sound like an infomercial.

### Phase 2 — Workflow Discovery (3-5 exchanges)

- "Walk me through what happens when you help someone with this. Like from the very beginning."
- "What do you need from them to get started?"
- "What's the hardest part? Where do people usually get stuck?"
- "How long does the whole process usually take?"
- "What are the steps -- is there a specific order things need to happen?"

### Phase 3 — Expertise Extraction (3-5 exchanges)

- "What do you know about this that most people don't?"
- "What's the biggest mistake people make?"
- "Are there shortcuts or hacks you've figured out?"
- "What tools or resources do you always recommend?"

### Phase 4 — Pricing Discovery (2-3 exchanges)

- "If you charged for this, what feels right? Like a monthly subscription, or per project?"
- "What do people currently pay for similar help?"

Let them name the price. Don't suggest one.

### Phase 5 — Signup Nudge

- "[Name], I've got a pretty clear picture of what your service would look like. Want me to build it? Takes about 2 minutes to set up and you could have your first subscriber this week."
- Include [SHOW_SIGNUP] token
- After signup, transition to RAAS generation

## Worker Firestore Schema

Collection: `workers`

```json
{
  "creator_id": "userId",
  "creator_name": "Sean",
  "name": "discoveredContext.serviceName or Untitled Worker",
  "description": "generated from conversation summary",
  "vertical": "custom",
  "status": "draft",
  "category": "inferred from conversation (healthcare, real_estate, consulting, etc.)",
  "pricing": {
    "model": "subscription | per-project | free",
    "price": 19,
    "trial_days": 7
  },
  "raas": {
    "workflow_stages": ["extracted from conversation"],
    "knowledge_base": ["extracted from conversation"],
    "onboarding_questions": ["generated from conversation"],
    "compliance_notes": ["generated from conversation"]
  },
  "subscriber_count": 0,
  "rating": null,
  "created_at": "serverTimestamp()",
  "published": false
}
```

## discoveredContext Fields for Builder

```json
{
  "intent": "builder",
  "serviceName": "extracted service name",
  "serviceDescription": "generated description",
  "category": "healthcare | real_estate | consulting | etc.",
  "workflowStages": ["stage1", "stage2"],
  "knowledgeBase": ["insight1", "insight2"],
  "pricingModel": "subscription | per-project",
  "price": 19,
  "name": "user's first name"
}
```

## Post-Signup Flow

1. App.jsx detects `discoveredContext.intent === "builder"` after auth
2. Creates Worker document in Firestore with extracted data
3. Shows WorkerPreview section instead of dashboard
4. User can "Publish to Store" or "Edit First"

## RAAS Store

Browsable grid of published Workers. Visible to all authenticated users via sidebar nav "RAAS Store".

Cards show: name, creator, description, price, category, subscriber count, rating.

"Add to Vault" shows "Coming soon" for now. No payment processing yet.

## Creator Dashboard

Creator's management view. Editable: name, description, workflow stages, knowledge base, pricing. Shows subscriber count, revenue, rating. Publish/unpublish toggle.
