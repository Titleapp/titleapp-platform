# CODEX 20 — RE Brokerage Marketing Worker
## Worker: `re-marketing-001` | Vertical: Real Estate | Status: Building

---

## The Thesis

Zillow's model is passive: list a property, wait for buyers to find it, send leads to agents who
call once and quit. The model is collapsing because AI can replace every part of it — except two:

1. **Physical presence at the property** — someone must unlock the door, be on-site for safety,
   and handle the logistics of an in-person showing.
2. **Emotional validation** — buyers make a $500K–$2M decision partly on "does this human I
   trust think this is the right house for me?" That last mile is still human.

Everything else — marketing, lead gen, scheduling, follow-up, content creation, ad management,
sphere outreach — is mechanical drag. It's expensive (6% commission), it's inconsistent (the
quality of the agent determines the outcome), and it's AI-automatable.

**This worker removes the drag and makes the broker better at the two things only a human can do.**

The broker becomes a "confirmation specialist + keyholder." Their actual work is:
- Show up, let people in, manage safety during the showing
- Be present when the buyer has emotional questions ("is this really the right house?")
- Sign off on offers that the AI has already analyzed and ranked
- Negotiate (the AI drafts the counter, the human executes the relationship)

The cost implication is significant: if the broker's actual value is ~20% of a transaction,
the commission should reflect that — and the buyer/seller benefits from a lower-friction process.

---

## What This Worker Does

### 1. Listing Marketing Engine
- Pull property data from ATTOM (APN, assessor data, photos if available, last sale, AVM)
- Generate compelling listing description (no MLS required — direct-to-buyer voice)
- Produce listing readiness scorecard (condition, pricing, curb appeal, legal clearance)
- Create property one-pager (downloadable PDF/canvas)

### 2. Sphere of Influence (SOI) Email Campaigns
- Ingest the broker's SOI list (CSV upload or connected Google Contacts)
- Draft and schedule listing announcement emails
- Run drip sequences: new listing → open house invite → price reduction → sold notification
- Track opens, clicks, and replies — surface hot contacts to broker
- Segment by: past clients, neighbors, investors, referral partners

### 3. Social Media Listing Posts
- Generate listing content for Instagram, Facebook, LinkedIn
- Schedule posts on the content calendar
- Pull property photos (from ATTOM or uploaded)
- Produce Reels/Story scripts (AI writes; broker shoots 30-second vertical video)
- Track post performance (impressions, saves, DM inquiries)

### 4. Paid Advertising
- Generate Google Ads copy for the listing (search + display)
- Generate Meta Ads creative brief (AI produces image + copy; broker approves before launch)
- Track click-through, cost per lead, conversion
- Suggest bid adjustments based on days on market vs. lead velocity

### 5. Showing Logistics (The Keyholder Scaffold)
- Qualify incoming leads: pre-approval status, buyer's agent rep, timeline, motivation
- Schedule showings on broker's Google Calendar (direct API)
- Send buyer confirmation with: date/time, property address, parking info, and Uber/Lyft deep link
- Pre-showing reminder (2h before)
- Post-showing feedback request (automated follow-up to buyer's agent)
- Build showing log (who came, feedback score, follow-up status)

### 6. Lead Pipeline
- Score each lead on: financial readiness, motivation, timeline, engagement
- Surface the top 3 leads in the operating feed ("These buyers are ready — call them now")
- Auto-follow-up cold leads with email drip
- Flag leads that have gone dark (7-day no-response)

---

## What This Worker Does NOT Do
- Not an MLS system — no IDX, no MLS listing submission (that requires a licensed broker action)
- Not a transaction manager — no earnest money, escrow, or closing coordination (→ Title Abstract)
- Not a negotiation engine — AI drafts counter-offer language, but broker executes
- Not a showing replacement — the physical showing requires the broker to be present
- Does not replace the human relationship or the trust layer — that is explicitly preserved

---

## Canvas Tabs

| Tab ID | Label | Canvas Signal | Card Component |
|--------|-------|---------------|----------------|
| `listing` | Listing | `card:listing-readiness` | `ListingScorecardCard` |
| `campaign` | Campaign | `card:marketing-campaign` | `MarketingCampaignBoardCard` |
| `social` | Social | `card:content-calendar` | `ContentCalendarCard` |
| `showings` | Showings | `card:re-showings` | `ShowingScheduleCard` (new) |
| `ads` | Ads | `card:marketing-campaign` | `MarketingCampaignBoardCard` |

Default tab on open: `listing` (shows the readiness scorecard + property data at a glance).

---

## RAAS Compliance

### Tier 0 — Platform Safety (Immutable)
- All generated marketing materials include: "AI-assisted content · broker-reviewed · not a licensed appraisal"
- No autonomous offer acceptance — AI ranks offers, broker decides
- Fair Housing compliance built into all marketing copy generation — no protected-class language
- All communications to leads require broker review before send (or explicit broker-approved auto-send toggle)

### Tier 1 — Industry Regulations (Enforced)
- **Fair Housing Act (42 U.S.C. § 3604)**: No language that discriminates by race, color, national origin, religion, sex, familial status, or disability in generated listing copy or ad targeting
- **CAN-SPAM Act**: All email campaigns include unsubscribe, sender identity, and physical address
- **RESPA**: No referral fee structures embedded in worker flow
- **State advertising disclosure**: Generated copy includes broker name + license number in all ads
- **TCPA**: No SMS/phone outreach without explicit opt-in (Email and in-app only by default)

### Tier 2 — Org-Level (Configurable by Admin)
- `auto_send_emails`: false by default — broker must approve each campaign send
- `auto_schedule_showings`: true by default — can be toggled to require broker approval
- `uber_link_enabled`: true — generates Uber deep link in showing confirmation
- `soi_segment_labels`: customizable label set for the sphere list

### Tier 3 — User Preferences
- `preferred_post_time`: when to publish social posts (default: 9am local)
- `follow_up_cadence`: how aggressively to follow up cold leads (3/5/7 days)
- `listing_description_tone`: "professional" | "warm" | "luxury" | "investment" (default: professional)

---

## Red Team: Risks to Eliminate Before Launch

### Risk 1: Fair Housing Violations in AI-Generated Copy
**Scenario**: AI generates listing copy that implies preferred buyer type ("great for families with
young children" → familial status violation; "in a quiet neighborhood" → coded language).
**Mitigation**: Output passes through a Fair Housing filter prompt before any copy is shown to the
user. Violations block the render and explain the issue. All generated copy includes disclosure.

### Risk 2: Spam / SOI List Quality
**Scenario**: Broker uploads an old list with unsubscribed or purchased contacts. AI sends blast.
**Mitigation**: All SOI uploads must pass dedup + unsubscribe-list check. Require double-opt-in
confirmation for first outreach to any contact who hasn't received an email in >6 months.

### Risk 3: Showing Logistics Liability
**Scenario**: AI schedules a showing for the wrong time. Buyer shows up; broker isn't there.
**Mitigation**: All showing confirmations go to the broker's calendar AND the broker gets a
push notification at the time of scheduling. Broker has a 15-minute cancellation window before
the buyer confirmation email is sent.

### Risk 4: Lead Data Privacy
**Scenario**: Lead pipeline data (buyer's pre-approval amount, motivation, financials) is shown
in an insufficiently scoped way.
**Mitigation**: Lead data is scoped to the workspace. No cross-broker sharing. Buyer contact data
is not shown to anyone outside the workspace tenant. Buyers can request data deletion.

### Risk 5: Unlicensed Brokerage Activity
**Scenario**: AI is doing so much of the transaction that regulators argue it constitutes
brokerage activity requiring a license.
**Mitigation**: The licensed broker is the named actor on every output. AI is explicitly a tool
the broker uses. All communications are from the broker, not "from SOCIII." The licensed broker
reviews and approves before any send. This is the same position as DocuSign, Skyslope, etc.

---

## Build Plan

### Phase 1 — Worker Definition (this sprint)
- [ ] Write RAAS system prompt → `raas/real-estate/GLOBAL/prompts/re-brokerage-marketing-system-prompt.md`
- [ ] Write Firestore worker doc (seeded via `/tmp/seed-re-marketing-worker.js`)
- [ ] Define canvas tabs in Firestore `digitalWorkers/re-marketing-001`
- [ ] Wire `card:listing-readiness` as the default canvas open (already has a renderer)

### Phase 2 — Showing Logistics (next sprint)
- [ ] Backend route: `POST /v1/workers/re-marketing-001/schedule-showing`
  - Checks Google Calendar for broker availability
  - Writes showing record to `showings/{tenantId}/{listingId}/{showingId}`
  - Fires showing confirmation email (from broker's Gmail via MCP)
  - Generates Uber deep link: `uber://?action=setPickup&pickup=auto&dropoff[nickname]=<address>&dropoff[latitude]=<lat>&dropoff[longitude]=<lng>`
- [ ] New canvas card: `ShowingScheduleCard.jsx` — calendar view of upcoming showings + lead scores

### Phase 3 — SOI Campaign (follow-on)
- [ ] SOI list upload endpoint (CSV → contacts/{tenantId}/soi)
- [ ] Wire campaign sender (Gmail MCP for personal sends; mailgun/sendgrid for bulk)
- [ ] Campaign tracking: open pixel + click redirect

### Phase 4 — Paid Ads
- [ ] Google Ads draft generator (copy only — broker pushes to Ads platform)
- [ ] Meta Ads creative brief generator
- [ ] Ad performance ingestion (via Google Ads API read-only)

---

## Data Model

```
listings/{tenantId}/{listingId}
  address, apn, attomData, listPrice, status, createdAt

showings/{tenantId}/{listingId}/{showingId}
  leadId, scheduledAt, confirmedAt, brokerCalendarEventId, uberLink,
  feedbackRequestSentAt, feedbackScore, status

leads/{tenantId}/{listingId}/{leadId}
  name, email, phone, buyerAgentEmail, preApprovalAmount, timeline,
  motivation, qualScore, showingIds[], lastContactAt, stage

soiContacts/{tenantId}/{contactId}
  name, email, type (past_client|neighbor|investor|referral|other),
  optedInAt, lastEmailedAt, unsubscribedAt

campaigns/{tenantId}/{campaignId}
  listingId, type (listing_announcement|open_house|price_reduction),
  subject, bodyTemplate, sentAt, recipientCount,
  opens, clicks, replies
```

---

## Firestore Canvas Tabs (for digitalWorkers/re-marketing-001)

```json
[
  { "id": "listing",   "label": "Listing",  "signal": "card:listing-readiness",   "default": true  },
  { "id": "campaign",  "label": "Campaign", "signal": "card:marketing-campaign"                    },
  { "id": "social",    "label": "Social",   "signal": "card:content-calendar"                      },
  { "id": "showings",  "label": "Showings", "signal": "card:re-showings"                           },
  { "id": "ads",       "label": "Ads",      "signal": "card:marketing-campaign"                    }
]
```

---

## Alex Quick-Start Prompts (for worker home screen)

```
"I have a new listing at 742 Evergreen Terrace — let's get it market-ready"
"Draft an email to my sphere announcing this listing"
"Schedule a showing for Tuesday at 2pm"
"Score my leads — who's most likely to make an offer?"
"Create social posts for this week's open house"
"How is my campaign performing?"
```

---

## The Human Anchor (Design Invariant)

Every showing confirmation email ends with:
> "Questions before your visit? Your agent [Broker Name] can be reached at [phone/email]."

Every offer analysis ends with:
> "Ready to move forward? Your agent reviews all offers and will guide next steps."

The AI proposes. The broker confirms. The transaction closes with a licensed human in the seat.
This is the design — not a compliance patch.
