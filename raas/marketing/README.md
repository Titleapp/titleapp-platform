# TitleApp AI — Marketing Automation Platform
# RAAS Guiding Document
# raas/marketing/README.md

---

## PURPOSE

This is a guiding document for TitleApp's marketing automation capability. It describes what the marketing module does, how it fits into the RAAS architecture, and what rules govern AI behavior when managing marketing across all verticals.

This is NOT an implementation spec. It defines the conceptual framework and rules that each vertical's marketing RAAS files will follow. Think of it as the constitution — each vertical's marketing rules are the laws.

---

## ARCHITECTURAL POSITION

Marketing automation is a horizontal platform capability. Every business workspace gets it. The global rules live here in `raas/marketing/`. Vertical-specific rules live in each vertical's `marketing/` subfolder.

The AI loads BOTH global marketing rules AND vertical-specific marketing rules when operating in a workspace.

```
raas/
├── marketing/                        ← THIS: Global rules for all verticals
│   ├── README.md                     ← This document
│   ├── channels/                     ← (future) Per-channel integration rules
│   └── compliance/                   ← (future) Universal advertising compliance
│
├── auto/marketing/                   ← Auto-specific: co-op, inventory campaigns, state disclosures
├── analyst/marketing/                ← Analyst-specific: SEC/FINRA, thought leadership
├── real-estate/marketing/            ← (future) Fair Housing, listing campaigns
├── insurance/marketing/              ← (future) Carrier co-op, cross-sell, renewals
├── mortgage/marketing/               ← (future) TILA/Reg Z, rate advertising
├── title-escrow/marketing/           ← (future) RESPA, B2B referral networks
├── education/marketing/              ← (future) Enrollment campaigns, gainful employment
├── property-management/marketing/    ← (future) Tenant acquisition, Fair Housing
└── general-business/marketing/       ← (future) Local SEO, social, referral programs
```

---

## WHAT THE MARKETING MODULE DOES

### For every business, regardless of vertical:

1. **Tracks spend and ROI** — Every dollar tracked by channel, attributed to revenue. "Which channels make me money?"

2. **Creates and places campaigns** — AI drafts campaigns, generates copy, selects targeting, submits to ad platforms via API. Business owner approves or AI acts autonomously per Rules settings.

3. **Optimizes in real-time** — AI monitors daily. Underperformers get paused or reallocated. Overperformers get more budget.

4. **Manages compliance** — Every ad validated against: platform policies, industry regulations, state requirements, co-op/partner rules. Nothing launches that violates rules.

5. **Handles co-op/MDF/referral programs** — Validates compliance, captures documentation, manages reimbursement claims. Applies to: auto (OEM co-op), insurance (carrier MDF), franchises (franchisor funds).

6. **Manages Google Business Profile** — Posts, photos, hours, review responses. Highest ROI for any local business. Free.

7. **Generates the morning briefing** — "You spent $847 yesterday across 3 channels. Google generated 6 leads at $41 each. Facebook generated 3 at $72 each. You have a 5-star review — I drafted a response."

---

## WHY THIS IS DIFFERENT

The AI has **business context** no standalone marketing tool has:

- **Inventory/listings** — which items are aging, new, popular, seasonal
- **Customers** — who's expiring, renewing, upgrading, at-risk
- **Pipeline** — who's negotiating, who went cold, who needs follow-up
- **Service/operations** — who's coming in today, what they might need
- **Products** — what to bundle, what to recommend, what margins look like
- **Compliance** — what the AI can and can't say in this jurisdiction, this industry, this platform

This context enables hyper-targeted campaigns that no human marketing manager or standalone tool could build at scale.

---

## MARKETING AUTONOMY LEVELS

These integrate with the global autonomy levels in the workspace Rules UI:

### Level 1 — Draft Only
AI analyzes performance, drafts campaign proposals, generates creative. Nothing launches without explicit approval.

### Level 2 — Low Autonomy
AI launches campaigns under budget threshold (default $250). Pauses severe underperformers. Sends alerts. Manages GBP posts. Campaigns over threshold, new channels, budget reallocation over 20%, and co-op submissions require approval.

### Level 3 — High Autonomy
AI manages full digital ad budget. Launches and pauses campaigns. Reallocates between channels. Submits co-op/MDF claims. Responds to reviews. Total budget increases, new channel onboarding, and large claims require approval.

### Level 4 — Full Autopilot
AI runs everything. Monthly spend report sent for acknowledgment.

---

## CHANNEL TIERS

### Tier 1: API-Integrated (AI creates + manages + reports)

**Meta Marketing API (Facebook + Instagram)**
- OAuth 2.0, campaign creation, audience targeting, budget management
- Custom audiences, lookalikes, retargeting
- Special ad categories enforced: Housing, Credit, Employment
- Applicable: ALL verticals

**Google Ads API**
- OAuth 2.0, Search, Performance Max, Demand Gen
- Keyword management, geo-targeting, bid strategies
- Strongest for intent-based businesses
- Applicable: ALL verticals

**LinkedIn Marketing API**
- OAuth 2.0, Sponsored Content, Message Ads, Lead Gen Forms
- B2B targeting: job title, company, industry, seniority
- Applicable: analyst, title/escrow, mortgage (B2B), insurance (commercial), education (professional), TitleApp itself

**Google Business Profile API**
- Business listing management: posts, offers, photos, hours, review responses
- Free organic visibility — highest ROI for local businesses
- Applicable: ALL local businesses

**Email (SendGrid / Postmark)**
- AI writes, personalizes, schedules, sends
- CAN-SPAM compliance enforced
- Applicable: ALL verticals

**SMS (Twilio)**
- AI sends texts: follow-ups, reminders, offers
- TCPA compliance enforced: opt-in, quiet hours, opt-out
- Applicable: ALL verticals

### Tier 2: Feed-Managed (AI manages listings, pulls reports)
- Auto: AutoTrader, Cars.com, CarGurus, TrueCar, Edmunds
- Real estate: Zillow, Realtor.com, Redfin, MLS
- Property management: Apartments.com, Zillow Rentals, Rent.com
- Insurance: carrier quoting platforms
- Education: course aggregators, program directories
- General: Yelp Business, Nextdoor, industry directories

### Tier 3: Tracked (AI drafts + tracks, human places)
- Direct mail, radio/TV, print, events, referral programs, phone outreach

---

## UNIVERSAL COMPLIANCE RULES

These apply to ALL verticals. Vertical-specific compliance layers add on top.

### FTC — Truth in Advertising
- All claims must be substantiated
- Endorsements and testimonials must be genuine
- Material connections must be disclosed
- Deceptive pricing prohibited

### CAN-SPAM — Email Marketing
- Unsubscribe mechanism required
- Physical mailing address required
- Honest subject lines
- Honor opt-out within 10 business days

### TCPA — Phone/Text Marketing
- Prior express consent required for marketing texts/calls
- Opt-out must be honored immediately
- Quiet hours: no marketing texts/calls before 8 AM or after 9 PM recipient's time
- Do-not-call list compliance

### Platform Policies
- Meta: special ad categories (housing, credit, employment), community standards, restricted content
- Google: editorial policies, restricted content, trademark rules
- LinkedIn: professional community policies, restricted content

### AI-Specific Disclosure
- All AI-generated communications must include a disclosure when required by law or platform policy
- Default disclaimer (customizable in Rules): "This message was sent by an AI assistant on behalf of {business name}"
- The AI must never impersonate a human unless the business owner has explicitly opted out of disclosure (and applicable law permits it)

---

## ATTRIBUTION MODEL

Every lead gets tagged with its source at first touch. The full customer journey is tracked through multiple touchpoints.

**First-touch attribution** for channel ROI: "Which channel brought this lead in?"
**Multi-touch visibility** for deal analysis: "What was the full journey from first contact to close?"

The AI closes the loop that no standalone tool can: "Maria Gonzalez clicked a Facebook ad Jan 15, visited the website Jan 16, submitted a lead form Jan 17, test drove Jan 22, purchased Feb 3. Attributed revenue: $28,400 on $89 ad cost."

---

## BUDGET MANAGEMENT

Each workspace has a monthly marketing budget with per-channel allocation.

**AI responsibilities:**
- Track spend against budget in real-time
- Alert before overspend
- Recommend reallocation based on performance
- For co-op programs: track fund balances with use-it-or-lose-it countdown timers

**Budget authority follows autonomy levels:**
- Level 1: AI recommends, human approves all spend
- Level 2: AI spends up to per-campaign threshold automatically
- Level 3: AI manages full budget within monthly total
- Level 4: AI can recommend monthly budget increases

---

## ONBOARDING FLOW FOR MARKETING

When a workspace first accesses Marketing (or when AI recommends a campaign and no accounts are connected):

1. "Connect your advertising accounts" — select platforms
2. OAuth flow for each platform
3. Import existing campaigns (30 days of history)
4. Budget setup — AI recommends allocation based on vertical benchmarks
5. Marketing Health Check — "Here's what's working, what's not, and what I'd change"
6. Marketing permissions default to workspace autonomy level

---

## CROSS-MODULE INTEGRATION

Marketing connects to every other RAAS module:

- **Inventory/Listings → Marketing:** Aging triggers campaigns. New items trigger launch campaigns. Price changes update creative.
- **Customers → Marketing:** Expirations trigger outreach. History informs targeting.
- **Pipeline → Marketing:** Attribution flows in. Closed deals update ROI. Lost deals inform retargeting.
- **Service → Marketing:** Service-to-sales tracked as marketing-influenced. Retention campaigns.
- **Rules → Marketing:** Autonomy levels govern spend, channels, compliance.
- **DTC → Marketing:** Every asset tracks its marketing history and cost-to-acquire.

---

## DIY RAAS CONNECTION

When the DIY RAAS configurator is built, marketing rules assemble from composable blocks:

1. **Compliance modules:** FTC (everyone), Fair Housing (housing), TILA/Reg Z (lending), SEC/FINRA (investment), state insurance regs, education rules, attorney advertising, HIPAA
2. **Channels:** Meta, Google, LinkedIn, GBP, email, SMS, industry platforms
3. **Campaign types:** Lead gen, brand awareness, retention, referral, events, listings, enrollment
4. **Autonomy defaults:** Level 1-4 with per-area overrides
5. **Co-op/partner programs:** OEM co-op, carrier MDF, franchisor funds, referral programs

A dental practice picks: FTC + HIPAA + Google + GBP + email + patient retention.
A flight school picks: FTC + education rules + Google + Meta + enrollment funnels.
A car wash franchise picks: FTC + franchisor co-op + Meta + GBP + local promotions.

Same building blocks, custom assembly.

---

## VERTICAL-SPECIFIC COMPLIANCE SUMMARY

Each vertical adds its own compliance layer on top of the universal rules:

| Vertical | Key Compliance | Primary Risk |
|----------|---------------|-------------|
| Auto | OEM co-op rules, state ad disclosures | Losing co-op reimbursement, state AG action |
| Real Estate | Fair Housing Act | Discrimination claims, platform ad restrictions |
| Property Mgmt | Fair Housing Act (rentals) | Discrimination claims |
| Insurance | State ad regulations, carrier co-op | License action, carrier termination |
| Mortgage | TILA/Reg Z, ECOA | Federal enforcement, license revocation |
| Title/Escrow | RESPA Section 8 | Kickback allegations, license action |
| Analyst | SEC/FINRA advertising rules | Regulatory action, fund sanctions |
| Education | Gainful employment, FTC | Federal funding loss, FTC action |
| General | FTC basics | FTC enforcement |

---

## REVENUE IMPLICATIONS

- **Stickiness:** Connected ad accounts + performance history = high switching cost
- **Upsell:** Marketing could be premium tier ($19-29/mo) or included to drive adoption
- **Data moat:** Cross-vertical campaign data improves recommendations for all users
- **Vertical expansion:** Marketing module already built — only compliance RAAS needed per new vertical
- **Dogfooding:** TitleApp uses its own marketing module for customer acquisition
