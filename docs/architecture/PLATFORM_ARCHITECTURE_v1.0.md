# TitleApp Platform Architecture v1.0

**The Foundational Document**
March 25, 2026 · Version 1.0 · All future prompts build against this spec

---

## What This Document Is

This is the TitleApp Platform Architecture Specification — the foundational document that governs how the platform is built, organized, and experienced. It sits above all other documents in the governance hierarchy.

Worker #0 governs Alex (the Chief of Staff). Worker #1 governs Digital Workers (the products). Platform Architecture v1.0 governs the platform itself — the account model, the catalog structure, the UX model, and the data architecture that everything else builds on.

Every future build prompt — T1, T2, T3 — must reference and comply with this specification. If a prompt conflicts with this document, this document wins. If this document needs to change, update it here first.

| Document | Governs |
|----------|---------|
| Platform Architecture v1.0 (this) | The platform — account, catalog, UX, data architecture |
| Worker #0 (Alex rule pack) | Alex — Chief of Staff behavior, routing, RAAS rules |
| Worker #1 (governance pipeline) | Digital Workers — schema, publishing, quality gates |
| Session prompts (T1/T2/T3) | Individual features — must comply with all three above |

---

## The North Star — Three Principles That Never Change

See [NORTH_STAR.md](NORTH_STAR.md) for the standalone version.

### 1. THE SPOTIFY MODEL — Worker opens first. Always.

No auth, no email, no form before the worker opens. Anonymous UID is enough to start. Lead captured softly after the worker opens. Checkout after the demo, never before. If any feature gates the worker before the user sees it — it violates this principle and must be fixed.

### 2. THE THREE LAYERS — Account, Library, Store. Always in that order.

Account is always accessible via the avatar in the top right. Library (My Stuff) is what the user owns and uses. Store is where they discover and purchase. These three layers never collapse into each other. The store does not live inside the library. The account does not live inside the store.

### 3. THE SINGLE SOURCE OF TRUTH — One registry for everything.

Verticals are defined once. Worker slugs are defined once. Subscription status values are defined once. If the same concept is defined in more than one place — that is a bug, not a feature. The nightly sync enforces this automatically.

---

## Layer 1 — Account

The Account layer is the person. One identity. One bill. Multiple profiles underneath. Accessed exclusively via the avatar in the top right corner of every screen — the universal pattern used by Spotify, Google, Amazon, and every major consumer platform.

### 1.1 The Avatar — Always Visible, Top Right

A persistent avatar/initials circle must appear in the top right corner of every screen in the app. This is non-negotiable. It is the universal entry point to account management.

Avatar click reveals:

- **My Account** — name, email, password, connected accounts
- **My Profiles** — switch between profiles, add new profile
- **Billing** — subscriptions, payment method, invoices, upgrade/downgrade
- **Settings** — notifications, privacy, language, timezone
- **Sign Out**

The avatar displays user initials by default (e.g. 'SC' for Sean Combs). If the user uploads a photo it displays the photo. Avatar image is stored in Firestore — never localStorage.

### 1.2 Canonical User Document Schema

There is currently one user schema in Firestore. Going forward, all user documents must conform to this single canonical schema. The current two-format inconsistency (magic link users vs chat users) must be normalized.

**`users/{uid}` — canonical schema:**

```js
{
  // Identity
  uid: string,
  email: string,
  displayName: string,          // 'Sean Combs'
  firstName: string,            // 'Sean'
  avatarUrl: string | null,     // Firestore Storage URL
  avatarInitials: string,       // 'SC' — auto-computed

  // Account metadata
  accountType: 'consumer',      // always 'consumer' for now
  createdAt: timestamp,
  createdVia: string,           // 'google' | 'magic_link' | 'chat'
  lastActiveAt: timestamp,

  // Legal
  termsAcceptedAt: timestamp | null,
  disclaimerAccepted: boolean,
  disclaimerVersion: string,

  // Active profile (denormalized for performance)
  activeProfileId: string,      // references profiles subcollection
}
```

**`users/{uid}/profiles/{profileId}` — profile schema:**

```js
{
  profileId: string,
  name: string,                 // 'Home' | 'Work' | 'Side Hustle' | custom
  emoji: string,                // display icon
  vertical: string | null,      // primary vertical for this profile
  createdAt: timestamp,
  isDefault: boolean,
}
```

Profile limits: maximum 5 profiles per account. Default profiles created on signup: one profile named after the user's first use case. Additional profiles added manually.

Profiles are organizational only. Billing is always at the account level. A subscription created in any profile is billed to the account and accessible across all profiles.

### 1.3 What Profiles Replace

| Concept | Old (broken) | New (this spec) |
|---------|-------------|-----------------|
| Personal workspace | Personal Vault + workspace picker | Default profile — always exists |
| Team/business context | teams subcollection, Verbier Investments | Additional profile — Work or custom name |
| Multiple contexts | Multiple workspace docs, confusing nav | Profile switcher — clean, simple, 5 max |
| Context switching | Switch Workspace link at sidebar bottom | Avatar → My Profiles → tap to switch |

---

## Layer 2 — My Library (My Stuff)

The Library is what the user owns and uses. It is scoped to the active profile. Workers in the library are the workers subscribed to under the active profile. The library is the equivalent of Spotify's 'Your Library' — it's your stuff, organized the way you want it.

### 2.1 Home Screen — Your Workers

The home screen for an authenticated user shows their subscribed workers, grouped by vertical. No workspace picker. No team cards. No 'Add a Team' button. Just: here are your workers. Open one.

**Home screen layout:**

- Header: 'Good [morning/afternoon/evening] [firstName].'
- Profile indicator: active profile name with emoji — 'Home'
- Your workers, grouped by vertical: Aviation (3), Real Estate (1), Solar (2)
- Each worker shown as a card: name, tagline, Open button, trial days remaining if applicable
- Empty state: 'No workers yet. Browse the store to find your team.' with Browse button
- Browse Store button — always visible, takes user to Layer 3

### 2.2 Left Nav — Subscribed Workers Only

The left nav Digital Workers section shows only the user's subscribed workers for the active profile. Grouped by vertical. No vertical-specific nav items (CoPilot EFB, Dispatch, Fleet Status) unless a worker from that vertical is actively open in the chat.

**Left nav structure:**

```
DIGITAL WORKERS
  Alex                    CoS
  — Aviation —
  PC12-NG CoPilot
  Digital Logbook
  — Real Estate —
  CRE Analyst
  — Solar —
  Solar Sales Closer
+ Browse Marketplace
```

### 2.3 Vault

The Vault is the user's file storage — documents, conversation history, worker outputs. Scoped to the active profile. Accessible from the left nav. The Vault is not a workspace — it is storage. It does not contain workers.

---

## Layer 3 — The Store (Catalog)

The Store is where users discover, preview, and subscribe to workers. It is organized by verticals (collections) containing workers (products). The mental model is the App Store + Amazon categories + Spotify's browse page.

### 3.1 The Vertical Registry — Single Source of Truth

Verticals are defined ONCE in a single registry file. Every other system — workerSchema.js, Sidebar nav, Firestore, catalog JSONs, the frontend — references this registry. No more five different hardcoded lists.

**File:** `/functions/functions/config/verticals.js` — THE single source

See [VERTICAL_REGISTRY.md](VERTICAL_REGISTRY.md) for the human-readable version.

Every other file that needs a vertical list imports from this file. No hardcoding elsewhere. This is the law.

### 3.2 Store UX — Browse and Discover

**Store entry points:**

- Landing page chat bar → 'I'm a pilot' → routes to meet-alex?vertical=aviation
- Home screen 'Browse Store' button → meet-alex (all verticals)
- Left nav '+ Browse Marketplace' → meet-alex (all verticals)

**Store layout:**

- Vertical tab bar at top: All | Aviation | Real Estate | Auto Dealer | Solar | Web3 | Nursing | Games
- On desktop: clicking a tab slides the worker cards in from the direction of travel (right→left for forward, left→right for backward). 200ms CSS transition. Respects prefers-reduced-motion.
- On mobile: tab bar is horizontally scrollable. No swipe gesture (conflicts with vertical scroll). Tap to switch verticals.
- Heading: 'Top 10 in [Vertical] Today' when vertical selected. 'Top 10 Today' for All.
- Search: searches across display_name, capabilitySummary, quickStartPrompts for the active vertical. Full catalog search when All is selected.

### 3.3 The Purchase Flow — Spotify Model

This is the canonical purchase flow. Every deviation from this is a bug.

| Step | Moment | What happens |
|------|--------|-------------|
| 1 | Worker card click | Worker opens immediately. Anonymous UID. No auth. No form. No gate. |
| 2 | Alex greeting | Worker-specific opener. 'Hey — I'm your [Worker]. Ask me anything.' |
| 3 | Lead capture | Alex 2nd message: 'What's a good email or number to save this for you?' Stored in guestLeads. Soft. Never blocks. |
| 4 | User works | Real conversation. 3-5 exchanges. Worker demonstrates value. |
| 5 | Trial banner | After 3+ exchanges — right panel: 'Enjoying [Worker]? Start your free 14-day trial.' Dismissible. |
| 6 | Checkout | 'Start my trial' → 'Continue with Google' (primary) or email (fallback). Auth inline. Trial starts. Worker never closes. |
| 7 | Confirmation | Alex: 'You're all set. Your 14-day trial of [Worker] starts now. No charge today.' |
| 8 | Abandonment | guestLeads with converted:false → recovery email after 24 hours via SendGrid. |

---

## Data Architecture

This section defines the canonical Firestore schema. All collections, all document formats, all field names. One format per collection. No exceptions.

### 4.1 Subscription Document — Canonical Format

There are currently two incompatible subscription formats. Going forward there is ONE format. All existing documents must be normalized to this format.

```js
// subscriptions/{uid}_{workerId}
{
  // Identity
  userId: string,               // Firebase UID
  workerId: string,             // Firestore doc ID e.g. 'av-caravan-208b'
  workerSlug: string,           // same as workerId — canonical reference
  workerName: string,           // display name e.g. 'Caravan 208B CoPilot'
  profileId: string | null,     // which profile this was added from (null = default)

  // Status — ONE field, ONE set of values
  trialStatus: 'trial_active'   // active trial
             | 'subscribed'     // paid, post-trial
             | 'trial_expired'  // trial ended, not converted
             | 'cancelled',     // user cancelled

  // Trial lifecycle
  trialStartedAt: timestamp,
  trialExpiry: timestamp | null, // null for free workers
  day12NotifiedAt: timestamp | null,
  day14NotifiedAt: timestamp | null,

  // Stripe (filled when converted to paid)
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  stripeProductId: string | null,

  // Audit
  createdAt: timestamp,
  subscribedAt: timestamp | null,
  cancelledAt: timestamp | null,
}
```

**CRITICAL:** The query for active subscriptions must use `trialStatus`, not `status`. The `status` field is deprecated and must be removed from all subscription documents during normalization.

```js
// Correct query — used everywhere
db.collection('subscriptions')
  .where('userId', '==', uid)
  .get()
// Then filter in memory:
// exclude trialStatus IN ['cancelled', 'trial_expired']
```

### 4.2 Worker Document — Canonical Format

Every `digitalWorkers` document must have these fields. The 40.1-T3 backfill added the substrate and launch page fields. Worker #1 governance enforces this on all new submissions.

```js
// digitalWorkers/{workerId}
{
  // Identity
  worker_id: string,            // matches doc ID e.g. 'av-caravan-208b'
  display_name: string,
  headline: string,
  vertical: string,             // must match VERTICALS registry key
  suite: string,
  status: 'live' | 'draft' | 'waitlist',

  // Pricing
  pricing_tier: 'free' | '$29' | '$49' | '$79',

  // Content
  capabilitySummary: string,
  raas_tier_0: [],              // universal platform rules
  raas_tier_1: [],              // worker-specific blocking rules
  raas_tier_2: [],              // warning rules
  raas_tier_3: [],              // advisory rules

  // Workspace launch page (added by 40.1-T3)
  workspaceLaunchPage: {
    tagline: string,
    valueProp: string,
    whatYoullHave: string,
    quickStartPrompts: [string, string, string],
    activeSubstrateFeatures: string[],
  },

  // Platform substrate (added by 40.1-T3)
  platformSubstrate: {
    email: true,
    sms: true,
    documentGeneration: true,
    eSignatures: true,
    vault: true,
    auditTrail: true,
    payments: true,
    identityVerification: false, // creator sets true for high-liability
  },

  // Quality (set by Certification Worker)
  qualityStatus: 'unaudited' | 'red' | 'yellow' | 'green',
  qualityScore: number | null,
  qualityAuditedAt: timestamp | null,
  certificationIssues: [],

  // Sync
  syncedAt: timestamp,
}
```

### 4.3 Guest Leads — Cart Abandonment

```js
// guestLeads/{anonymousUid}
{
  contact: string,              // email or phone
  workerSlug: string,
  vertical: string,
  capturedAt: timestamp,
  converted: boolean,
  recoveryEmailSent: boolean,
  recoveryEmailSentAt: timestamp | null,
}
```

### 4.4 Sync Reports — Nightly Catalog Sync

```js
// syncReports/{YYYY-MM-DD}
{
  date: string,
  checkedCount: number,
  createdCount: number,
  updatedCount: number,
  errorCount: number,
  errors: [],
  completedAt: timestamp,
}
```

---

## Platform Substrate — Eight Universal Capabilities

Every Digital Worker ships with these eight capabilities. Always available. Never active by default. Lazy-loaded when the worker invokes them. These are the platform's swiss army knife — creators don't have to think about them. They're just there.

| Capability | Provider | Rule |
|-----------|----------|------|
| Email | SendGrid / alex@titleapp.ai | Always available. Worker outputs, alerts, summaries. |
| SMS | Twilio | Always available. Confirm TrustHub before using. |
| Document Generation | Claude Tools | PDF, DOCX, structured outputs from worker conversations. |
| E-Signatures | Dropbox Sign | Lazy-loaded. Only initializes when worker requests a signature. |
| Vault | Firestore + Storage | Always on. All worker outputs stored, versioned, retrievable. |
| Audit Trail | Firestore (immutable) | Always on. Cannot be disabled. Every interaction logged. |
| Payments | Stripe | Subscription billing, invoicing, one-time charges. |
| Identity Verification | Stripe Identity — $2/user | Lazy-loaded. Suspended in test mode. Creator sets requiresIdentityVerification: true for high-liability workers. One-time per user. Result stored in Vault. |

---

## Brand Language — Non-Negotiable

| Element | Correct | Never Say |
|---------|---------|-----------|
| Product name | TitleApp | TitleApp AI |
| Workers | Digital Workers | chatbots, tools, GPTs, assistants |
| Alex | Chief of Staff | AI Assistant, bot, chatbot |
| Worker count | 1,000+ Digital Workers | 153 workers, exact Firestore count |
| Tagline | They're on your team now. | anything else |
| Sub-tagline | Real expertise. On call. Forever. | anything else |
| Subscribe button | Start 14-day free trial | Subscribe $X/mo |
| Post-subscribe | Your 14-day trial of [Worker] starts now. No charge today. | anything else |
| Pricing | Free / $29 / $49 / $79 | $99, custom bundles, invented tiers |
| Creator earnings | 75% revenue share | any other percentage |

---

## Implementation Roadmap

See [TECH_DEBT.md](TECH_DEBT.md) for Session 42 specific items with issue codes.

### Immediate — Session 39/40 (already running)

- 39.11-T2: Normalize subscription trialStatus, fix nav query — IN PROGRESS
- 39.11-T1: Fix home screen, nav grouping, vertical nav items — PENDING T2
- 39.10-T2: Fix chat routing to active worker, lock right panel — DEPLOYED
- 40.1-T3: Worker substrate backfill — COMPLETE

### Session 42 — Platform Architecture Foundation

- Create `/functions/functions/config/verticals.js` — single vertical registry
- Normalize all user documents to canonical schema
- Create `users/{uid}/profiles` subcollection, migrate workspaces to profiles
- Add persistent avatar component — top right corner of every screen
- Normalize all subscription documents to single canonical format
- Update home screen — subscribed workers grouped by vertical
- Add vertical transition animation — CSS slide on desktop, tap on mobile
- Update catalog search — index capabilitySummary and quickStartPrompts

### Session 43+ — Future Architecture

- Certification Worker — automated quality gate for all 146 workers
- Platform substrate wiring — RAAS engine integration for all 8 capabilities
- Stripe trial conversion — Stripe Checkout Session creation, webhook handler
- Creator Studio improvements — deeper discovery, stress test vertical-awareness
- State Professional Licensing Suite (GOV-Suite 5)
- Gaming vertical — worker catalog, sandbox templates
- Mobile app — native swipe navigation between verticals

---

## How to Use This Document

When writing a build prompt for T1, T2, or T3 — check it against this document first. Ask:

1. Does this prompt maintain the Spotify Model? (Worker opens first. Always.)
2. Does this prompt respect the three-layer architecture? (Account → Library → Store)
3. Does this prompt use the canonical subscription schema? (trialStatus, not status)
4. Does this prompt reference the single vertical registry? (Not a hardcoded list)
5. Does this prompt maintain the brand language? (TitleApp, Digital Workers, Chief of Staff)

If the answer to any of these is no — revise the prompt before pasting it to a terminal.

---

*This document is the platform. Everything else is implementation.*

The Title App LLC · EIN 33-1330902 · DUNS 119438383 · titleapp.ai · v1.0 · March 25, 2026
