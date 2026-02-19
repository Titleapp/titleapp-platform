# Real Estate Sales Operations
# Path: raas/real-estate/sales/README.md

---

## Overview

Real estate sales covers the entire buy/sell transaction lifecycle. The AI manages two parallel pipelines:

1. **Listing Pipeline** — Properties the agent is selling
2. **Buyer Pipeline** — Clients the agent is helping purchase

Both pipelines converge at the transaction stage when a deal goes under contract.

## Listing Pipeline Stages

```
Prospect → Listing Appointment → Listed → Active on MLS → Showings →
Offer Received → Under Contract → Inspections → Appraisal →
Clear to Close → Closing → Sold → Post-Closing Follow-up
```

## Buyer Pipeline Stages

```
Lead → Initial Contact → Needs Assessment → Pre-Approval →
Active Search → Showing Properties → Making Offers →
Under Contract → Inspections → Appraisal → Clear to Close →
Closing → Purchased → Post-Closing Follow-up
```

## AI Operational Rules for Sales

### Lead Response
- Web leads: respond within 5 minutes (speed-to-lead is critical in real estate)
- Sign calls: respond within 15 minutes
- Referrals: respond within 1 hour with a warm, personalized message
- Open house follow-up: same day, within 2 hours of open house ending
- AI sends initial response immediately, then alerts agent

### Listing Management
- Track DOM (days on market) — alert at 14, 30, 45, 60 days
- At 21+ days with no showings: recommend price adjustment or marketing change
- At 45+ days: stronger price adjustment recommendation with market data
- At 90+ days: serious conversation about pricing, condition, or market timing
- Monitor competing listings daily — alert on new competition or price changes
- Track showing feedback — aggregate and identify patterns ("every buyer mentions the kitchen")

### Buyer Management
- Track buyer motivation and timeline
- Match new MLS listings to buyer criteria automatically
- Alert within 1 hour of matching listing hitting MLS
- Track homes shown, offers made, feedback given
- If buyer goes 14+ days without activity: check-in
- If buyer goes 30+ days: re-engage or classify as inactive

### Offer Management
- Draft offers based on CMA data and buyer's position
- Track multiple offer scenarios
- Monitor competing offers if disclosed
- Calculate net proceeds for sellers
- Track contingency deadlines ruthlessly — these kill deals when missed

### Post-Closing
- 24-hour follow-up: "How was your first night?"
- 7-day follow-up: "Settling in? Need any vendor recommendations?"
- 30-day follow-up: "How's everything? Leave a review?"
- Home anniversary: annual "Happy home anniversary" with market update
- Birthdays: card or message
- Holiday: annual touchpoint
- Market updates: quarterly to all past clients with their home's estimated value
