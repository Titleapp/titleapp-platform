# TitleApp URL Architecture

Every worker, suite, creator, and feature on TitleApp needs a clean, shareable, SEO-friendly URL. This isn't cosmetic -- it's infrastructure. Direct links to workers are how we:
- Send prospects like Scott directly to a worker
- Let creators share their workers on LinkedIn, Twitter, email
- Enable Google to index every worker as a landing page
- Track referral attribution for creator revenue share
- Embed worker access in external sites and apps
- Deep-link from emails, SMS, QR codes, and ads

---

## URL Structure Overview

```
titleapp.ai/
+-- workers/                          -> Marketplace (browse all workers)
|   +-- {slug}                        -> Worker detail/landing page
|   |   +-- /chat                     -> Direct conversation with worker
|   |   +-- /onboarding               -> Guided first-time setup
|   |   +-- /demo                     -> Interactive demo (no account needed)
|   |   +-- /reviews                  -> User reviews and ratings
|   |
|   +-- ?vertical={vertical}          -> Filter by vertical
|   +-- ?type={standalone|composite}  -> Filter by worker type
|   +-- ?sort={popular|new|rated}     -> Sort options
|
+-- suites/                           -> Industry suites (browse all)
|   +-- {suite-slug}                  -> Suite landing page (all workers in vertical)
|   |   +-- /workers                  -> Workers in this suite
|   |   +-- /bundle                   -> Recommended bundle + pricing
|   |
|   +-- real-estate                   -> Real Estate Suite
|   +-- construction                  -> Construction Suite
|   +-- aviation                      -> Aviation Suite
|   +-- healthcare                    -> Healthcare Suite
|   +-- legal                         -> Legal Suite
|   +-- finance                       -> Finance & Investment Suite
|   +-- ...                           -> (12 suites total)
|
+-- creators/                         -> Creator directory
|   +-- {username}                    -> Creator public profile
|   |   +-- /workers                  -> Creator's published workers
|   |   +-- /reviews                  -> Reviews across all their workers
|   |   +-- /stats                    -> Public stats (if creator opts in)
|   |
|   +-- apply                         -> Creator program application
|
+-- vault/                            -> User's workspace (authenticated)
|   +-- deals/                        -> Deal objects
|   |   +-- {dealId}                  -> Specific deal
|   +-- documents/                    -> Generated documents
|   +-- pipelines/                    -> Configured pipelines
|   +-- workers/                      -> Subscribed workers
|   +-- settings/                     -> Vault settings
|
+-- alex/                             -> Chief of Staff direct access
|   +-- /chat                         -> Talk to Alex
|
+-- account/                          -> Account management
|   +-- billing                       -> Subscription & payment
|   +-- settings                      -> Profile & preferences
|   +-- team                          -> Team members (org accounts)
|   +-- api-keys                      -> API access (future)
|
+-- ref/{code}                        -> Referral redirect
+-- invite/{code}                     -> Team invite redirect
|
+-- about                             -> Company info
+-- pricing                           -> Pricing page
+-- terms                             -> Terms of service
+-- privacy                           -> Privacy policy
+-- blog                              -> Blog / content
+-- docs                              -> Documentation / help center
+-- status                            -> System status page
|
+-- embed/{slug}                      -> Embeddable worker widget
```

---

## Worker URLs -- Detailed

### Slug Rules

- Lowercase, hyphenated, alphanumeric only
- 3-50 characters
- Must be unique across the platform
- Reserved slugs: `new`, `popular`, `featured`, `search`, `create`, `settings`, `admin`
- Platform workers get clean slugs: `cre-analyst`, `title-expert`, `investor-relations`
- Creator workers: creator can choose any available slug
- Slugs are permanent once published (changing breaks links)
- Redirect system for renamed workers (old slug -> new slug, 301)

### Worker Detail Page: `titleapp.ai/workers/{slug}`

This is both the marketing page AND the entry point. It adapts based on auth state:

```
+-----------------------------------------------------------+
|  titleapp.ai/workers/cre-analyst                           |
|                                                            |
|  +------------------------------------------------------+ |
|  |  CRE DEAL ANALYST                                    | |
|  |  4.7 stars  -  127 active users  -  by TitleApp      | |
|  |                                                        | |
|  |  Screen and score commercial real estate deals         | |
|  |  against your investment criteria in minutes.          | |
|  |                                                        | |
|  |  [Try Demo]  [Subscribe -- $29/mo]  [Share]           | |
|  +------------------------------------------------------+ |
|                                                            |
|  HOW IT WORKS                                             |
|  1. Upload your investment thesis or enter criteria       |
|  2. Feed it deal packages from brokers                    |
|  3. Get scored analysis with risk flags in minutes        |
|                                                            |
|  CAPABILITIES                                             |
|  - Deal scoring (0-100) against custom criteria           |
|  - Replacement cost analysis                              |
|  - Market fundamentals evaluation                         |
|  - Risk flagging and mitigation suggestions               |
|  - Financial modeling and return projections              |
|                                                            |
|  WORKS WITH                                               |
|  -> Investor Relations Worker (auto-handoff on approval)  |
|  -> Title Expert (parallel due diligence)                 |
|  -> Document Engine (auto-generates deliverables)         |
|                                                            |
|  COMPLIANCE                                               |
|  RAAS Level: Tier 2  -  42 governing rules                |
|  Domains: SEC, State RE, Fair Housing                     |
|                                                            |
|  PRICING                                                  |
|  $29/mo Professional  -  Free 7-day trial                 |
|  Part of Finance & Investment Suite                       |
|                                                            |
|  REVIEWS (127)                                            |
|  [reviews section]                                        |
+-----------------------------------------------------------+
```

**Auth State Behavior:**

| State | What They See | Primary CTA |
|-------|--------------|-------------|
| Not logged in | Full marketing page | "Try Demo" / "Start Free Trial" |
| Logged in, not subscribed | Marketing page + personalized | "Subscribe -- $29/mo" |
| Logged in, subscribed, first time | Redirects to `/onboarding` | Guided setup |
| Logged in, subscribed, returning | Redirects to `/chat` | Direct conversation |

### Worker Chat: `titleapp.ai/workers/{slug}/chat`

Direct link to conversation. If the user isn't subscribed, redirects to the detail page. If first time, redirects to onboarding.

This is the link you put in emails: "Go to titleapp.ai/workers/cre-analyst" -- the platform figures out the right experience based on the user's state.

### Worker Demo: `titleapp.ai/workers/{slug}/demo`

Interactive demo that works WITHOUT an account. Limited functionality:
- Can interact with the worker for 3-5 exchanges
- Cannot upload documents
- Cannot save results
- Shows a "Sign up to continue" prompt
- Useful for ads, social media, cold outreach

### Worker Onboarding: `titleapp.ai/workers/{slug}/onboarding`

First-time setup flow specific to that worker. For the CRE Analyst:
1. "What's your investment strategy?" (upload thesis doc or answer questions)
2. "What are your target parameters?" (replacement cost threshold, markets, return targets)
3. "Ready to screen your first deal" -> drops into /chat

Each worker defines its own onboarding flow in its RAAS Tier 3 configuration.

---

## Suite URLs -- Detailed

### Suite Slug Map

| Suite | Slug | URL |
|-------|------|-----|
| Real Estate | `real-estate` | titleapp.ai/suites/real-estate |
| Construction | `construction` | titleapp.ai/suites/construction |
| Aviation | `aviation` | titleapp.ai/suites/aviation |
| Healthcare | `healthcare` | titleapp.ai/suites/healthcare |
| Legal | `legal` | titleapp.ai/suites/legal |
| Finance & Investment | `finance` | titleapp.ai/suites/finance |
| Property Management | `property-management` | titleapp.ai/suites/property-management |
| Insurance | `insurance` | titleapp.ai/suites/insurance |
| Government & Compliance | `government` | titleapp.ai/suites/government |
| Hospitality | `hospitality` | titleapp.ai/suites/hospitality |
| Energy | `energy` | titleapp.ai/suites/energy |
| General Business | `business` | titleapp.ai/suites/business |

### Suite Landing Page: `titleapp.ai/suites/{suite-slug}`

Vertical-specific landing page that shows:
- Suite description and value proposition
- All workers in the suite (platform + creator)
- Recommended bundle (3+ workers + free Alex)
- Industry-specific compliance badges
- Case studies / testimonials from the vertical
- "Build a Worker for This Suite" CTA for creators

### Suite Bundle: `titleapp.ai/suites/{suite-slug}/bundle`

Pre-configured bundle page:
```
REAL ESTATE ACQUISITION BUNDLE
3 workers + free Chief of Staff

  CRE Deal Analyst ($29/mo)
  Title Expert ($29/mo)
  Investor Relations ($49/mo)
  Alex (Chief of Staff) -- FREE

Bundle: $107/mo
Alex coordinates all three automatically.

[Start Bundle -- 7 Day Free Trial]
```

---

## Creator URLs -- Detailed

### Creator Profiles: `titleapp.ai/creators/{username}`

Public profile page for each creator:

```
titleapp.ai/creators/scottbuilds

+---------------------------------------------------+
|  SCOTT E.                                          |
|  CRE & Construction Technology                     |
|  Creator since March 2026                          |
|                                                    |
|  Published Workers: 3                              |
|  Active Users: 284                                 |
|  Average Rating: 4.8                               |
|                                                    |
|  WORKERS                                           |
|  -> CRE Due Diligence Suite (4.9 stars)            |
|  -> Construction Cost Estimator (4.7 stars)        |
|  -> Entitlement Analyst (4.8 stars)                |
|                                                    |
|  [Follow This Creator]                             |
+---------------------------------------------------+
```

### Creator Application: `titleapp.ai/creators/apply`

Creator program signup. $49/year license. Leads to Worker #1 Sandbox.

---

## Referral URLs

### Structure: `titleapp.ai/ref/{code}`

Referral codes for attribution tracking. Two types:

**Creator Referrals:**
```
titleapp.ai/ref/cr-{creatorId}-{workerId}
Example: titleapp.ai/ref/cr-scott-cre-analyst

Tracks: creator who referred -> worker they referred to
Attribution: creator gets referral bonus (one-time or % of first 3 months)
```

**User Referrals:**
```
titleapp.ai/ref/u-{userId}
Example: titleapp.ai/ref/u-abc123

Tracks: user who referred -> new signup
Attribution: referring user gets credit (free month, etc.)
```

**Campaign Referrals:**
```
titleapp.ai/ref/{campaign-slug}
Example: titleapp.ai/ref/linkedin-march-2026
Example: titleapp.ai/ref/captain-sean-ep1

Tracks: marketing campaign -> signups
Attribution: campaign performance tracking
```

All referral URLs redirect to appropriate landing page with attribution cookie set.

### Referral URL Query Parameters

Standard UTM parameters also supported:
```
titleapp.ai/workers/cre-analyst?ref=cr-scott&utm_source=linkedin&utm_medium=post&utm_campaign=cre-launch
```

---

## Embed URLs

### Structure: `titleapp.ai/embed/{slug}`

Embeddable widget that lets external sites offer worker access:

```html
<!-- Embed CRE Analyst on a broker's website -->
<iframe
  src="https://titleapp.ai/embed/cre-analyst"
  width="400"
  height="600"
  frameborder="0">
</iframe>
```

**Embed behavior:**
- Shows a compact version of the worker chat interface
- Requires TitleApp account to use (shows login/signup if not authenticated)
- Branded with "Powered by TitleApp" footer
- Creator or partner can customize the embed with their branding
- Full RAAS rules still apply (Tier 0 locked)

**Use cases:**
- Broker websites: "Screen this deal with our AI analyst"
- Creator portfolios: "Try my workers"
- Partner integrations: CRM systems, property listing sites
- Blog posts: embedded interactive demos

### Embed Configuration

```
titleapp.ai/embed/{slug}?theme=dark&brand=partner-logo.png&cta=Subscribe
```

| Parameter | Values | Default |
|-----------|--------|---------|
| `theme` | `light`, `dark` | `light` |
| `brand` | URL to partner logo | TitleApp logo |
| `cta` | Custom CTA text | "Try It" |
| `demo` | `true`, `false` | `false` (requires auth) |
| `ref` | Referral code | none |

---

## Deep Links (Mobile / Desktop App)

When TitleApp has native apps, URLs resolve to deep links:

```
titleapp.ai/workers/cre-analyst/chat
  -> iOS: titleapp://workers/cre-analyst/chat
  -> Android: intent://workers/cre-analyst/chat#Intent;scheme=titleapp;end
  -> Desktop: Opens in desktop app if installed, web otherwise
```

Universal Links (iOS) and App Links (Android) handle the routing automatically.

---

## QR Codes

Every worker URL can be rendered as a QR code:

```
titleapp.ai/workers/{slug}/qr
  -> Returns a PNG QR code that points to titleapp.ai/workers/{slug}
```

**Use cases:**
- Business cards: "Scan to try my Digital Worker"
- Conference booths: QR code for each worker demo
- Print marketing: Magazine ads, postcards, flyers
- Property signage: "Scan for instant property analysis"

---

## SEO & Metadata

Every worker page generates proper meta tags:

```html
<title>CRE Deal Analyst -- TitleApp Digital Worker</title>
<meta name="description" content="Screen and score commercial real estate deals against your investment criteria in minutes. AI-powered analysis with RAAS compliance." />
<meta property="og:title" content="CRE Deal Analyst" />
<meta property="og:description" content="Screen CRE deals in minutes, not weeks." />
<meta property="og:image" content="https://titleapp.ai/workers/cre-analyst/og-image.png" />
<meta property="og:url" content="https://titleapp.ai/workers/cre-analyst" />
<link rel="canonical" href="https://titleapp.ai/workers/cre-analyst" />
```

Suite pages, creator profiles, and blog posts all get proper meta tags. Every page is indexable by Google.

### Sitemap

```
titleapp.ai/sitemap.xml
  -> Auto-generated from:
    - All published worker pages
    - All suite pages
    - All creator profile pages
    - Static pages (pricing, about, terms, privacy)
    - Blog posts
```

---

## Routing Implementation (Next.js / React Router)

```javascript
// Next.js App Router structure
app/
+-- page.tsx                              // Landing page
+-- workers/
|   +-- page.tsx                          // Marketplace
|   +-- [slug]/
|       +-- page.tsx                      // Worker detail
|       +-- chat/page.tsx                 // Worker conversation
|       +-- onboarding/page.tsx           // First-time setup
|       +-- demo/page.tsx                 // Public demo
|       +-- reviews/page.tsx              // Reviews
+-- suites/
|   +-- page.tsx                          // All suites
|   +-- [suite]/
|       +-- page.tsx                      // Suite landing
|       +-- workers/page.tsx              // Workers in suite
|       +-- bundle/page.tsx               // Bundle page
+-- creators/
|   +-- page.tsx                          // Creator directory
|   +-- apply/page.tsx                    // Creator application
|   +-- [username]/
|       +-- page.tsx                      // Creator profile
|       +-- workers/page.tsx              // Creator's workers
+-- vault/
|   +-- page.tsx                          // Dashboard
|   +-- deals/[dealId]/page.tsx           // Deal object
|   +-- documents/page.tsx                // Documents
|   +-- pipelines/page.tsx                // Pipelines
|   +-- settings/page.tsx                 // Vault settings
+-- alex/
|   +-- chat/page.tsx                     // Chief of Staff
+-- account/
|   +-- billing/page.tsx
|   +-- settings/page.tsx
|   +-- team/page.tsx
+-- ref/[code]/page.tsx                   // Referral redirect
+-- invite/[code]/page.tsx                // Team invite
+-- embed/[slug]/page.tsx                 // Embeddable widget
+-- pricing/page.tsx
+-- about/page.tsx
+-- terms/page.tsx
+-- privacy/page.tsx
+-- blog/
|   +-- page.tsx
|   +-- [post]/page.tsx
+-- docs/
    +-- page.tsx
    +-- [...path]/page.tsx
```

---

## Firestore: Worker Slug Registry

```javascript
// Collection: workerSlugs/{slug}
// This is a lookup table for slug -> workerId resolution
{
  "slug": "cre-analyst",
  "workerId": "cre-deal-analyst-001",
  "creatorId": "titleapp",              // "titleapp" for platform workers
  "status": "active",                    // active, reserved, redirecting
  "redirectTo": null,                    // Set if worker was renamed
  "createdAt": "2026-03-01T00:00:00Z",
  "suiteId": "finance",
  "vertical": "real_estate"
}

// Reserved slugs (cannot be claimed)
// Stored in workerSlugs with status: "reserved"
const RESERVED_SLUGS = [
  "new", "popular", "featured", "search", "create",
  "settings", "admin", "api", "help", "support",
  "pricing", "about", "blog", "docs", "status",
  "chief-of-staff", "alex", "vault"
];
```

---

## Scott's Specific URLs

For the email to Scott, these are the exact links:

```
Analyst Worker:    titleapp.ai/workers/cre-analyst
IR Worker:         titleapp.ai/workers/investor-relations
His Vault:         titleapp.ai/vault (after signup)
Alex:              titleapp.ai/alex/chat (after 3+ workers)
```

---

## Priority Order

1. **Worker detail pages** (`/workers/{slug}`) -- needed NOW for Scott and all go-to-market
2. **Worker chat routing** (`/workers/{slug}/chat`) -- needed NOW for direct worker access
3. **Worker onboarding** (`/workers/{slug}/onboarding`) -- needed for first-time UX
4. **Suite landing pages** (`/suites/{suite-slug}`) -- needed for vertical marketing
5. **Creator profiles** (`/creators/{username}`) -- needed for creator program launch
6. **Referral system** (`/ref/{code}`) -- needed for growth
7. **Embeds** (`/embed/{slug}`) -- needed for partner integrations
8. **QR codes** -- nice to have for events and print
9. **Deep links** -- needed when native apps launch

Items 1-3 must be live before we send Scott's email.
