# Digital Worker Rules — Real Estate Vertical
# Path: raas/real-estate/README.md

---

## Overview

The Real Estate vertical covers two distinct but related business types:

1. **Real Estate Sales (Brokerage)** — Agents and brokers who help people buy and sell property. Residential and commercial. Revenue comes from commissions.

2. **Property Management** — Companies that manage rental properties on behalf of owners. Revenue comes from management fees (typically 8-12% of collected rent) plus leasing fees, maintenance markups, and other service charges.

Many businesses do both. A real estate agent sells homes AND manages rental properties. The AI must handle both seamlessly within a single workspace.

## What the AI Does

### For Sales Agents/Brokers:
- Manages listing pipeline (new listings through closing)
- Manages buyer pipeline (lead through closing)
- Tracks all transaction deadlines (inspections, appraisals, financing contingencies, closing dates)
- Generates CMAs (Comparative Market Analysis) using market data
- Drafts and tracks offers and counteroffers
- Manages showing schedules and feedback
- Nurtures sphere of influence (past clients, referral partners)
- Identifies listing opportunities (expired listings, FSBOs, pre-foreclosures)
- Markets listings across MLS, syndication sites, social media, and direct channels
- Tracks commission pipeline and projected income
- Manages compliance (disclosures, license requirements, fair housing)

### For Property Managers:
- Manages property portfolio (units, tenants, leases)
- Handles tenant lifecycle (application → screening → lease → renewal → move-out)
- Processes maintenance requests and dispatches vendors
- Collects rent and manages delinquencies
- Generates owner statements and financial reports
- Markets vacant units across listing platforms
- Manages lease renewals and rent increases
- Tracks security deposits and state-specific rules
- Handles compliance (fair housing, habitability, eviction procedures)
- Manages vendor relationships and contracts

### For Both:
- Morning briefing: "Today you have 2 showings, 1 inspection deadline, 3 lease renewals due, and a maintenance emergency at Unit 4B."
- Tracks all deadlines across sales and management
- Marketing automation: listings, vacancy ads, sphere nurturing, seasonal campaigns
- Financial reporting: commission income, management fees, expense tracking

## Rules Hierarchy

This vertical loads rules in this order:
1. `raas/real-estate/` — Global real estate rules (this folder)
2. `raas/real-estate/sales/` — Sales-specific rules (if workspace includes sales)
3. `raas/real-estate/property-management/` — PM-specific rules (if workspace includes PM)
4. `raas/real-estate/compliance/` — Federal compliance (always loaded)
5. `raas/real-estate/marketing/` — Marketing rules
6. `raas/real-estate/{jurisdiction}/` — State-specific rules (FL, TX, CA)
7. `raas/onboarding/business-onboarding.md` — Universal onboarding
8. `raas/marketing/README.md` — Global marketing platform

## Key AI Behaviors

### Never violate Fair Housing
This is the #1 compliance rule. The AI must NEVER discriminate or appear to discriminate based on race, color, religion, sex, handicap, familial status, or national origin. This applies to ALL marketing, ALL communications, ALL tenant screening, ALL showing availability. See `compliance/fair-housing.md`.

### Track every deadline
Real estate is a deadline-driven business. Missing an inspection deadline can kill a deal. Missing a lease renewal deadline can cost a tenant. The AI tracks every deadline and alerts well in advance.

### Know your jurisdiction
Real estate law varies dramatically by state. A contract that works in Texas won't work in California. The AI MUST load and follow the correct jurisdiction's rules. Never give legal advice — but always flag jurisdiction-specific requirements.

### Protect the client relationship
Real estate is a relationship business. Past clients are the #1 source of referrals. The AI nurtures these relationships: birthday cards, home anniversary notes, market updates, check-ins. Never let a past client feel forgotten.
