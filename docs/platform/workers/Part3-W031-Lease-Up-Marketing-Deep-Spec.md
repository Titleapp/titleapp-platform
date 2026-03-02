# W-031 Lease-Up & Marketing | $59/mo
## Phase 5 — Stabilization | Standalone

**Headline:** "Fill your building faster"

## What It Does
Manages the lease-up process from pre-leasing through stabilization — marketing strategy, lead tracking, tour scheduling, lease negotiation support, concession analysis, absorption forecasting, and lease execution tracking. Produces leasing reports for ownership and lenders showing velocity and projected stabilization date.

## RAAS Tier 1 — Regulations
- **Fair Housing Act (FHA)**: Prohibits discrimination based on race, color, national origin, religion, sex, familial status, disability. ALL marketing materials and leasing practices must comply. Hard stop: flag any language, criteria, or practice that could constitute FHA violation. Track: equal opportunity logo on all marketing, consistent application criteria, reasonable accommodation requests.
- **ADA / Section 504**: Track accessibility requirements for marketing office, model units, and common areas. Website/digital marketing must be accessible (WCAG standards).
- **State/Local Fair Housing**: Many states/cities add protected classes beyond federal (source of income, sexual orientation, gender identity, criminal history, etc.). Track by jurisdiction.
- **LIHTC / Affordable Housing**: If property has income-restricted units — track income qualification process, rent restrictions, student rule, household certification requirements. Marketing must reach qualified populations.
- **Truth in Advertising**: Marketing claims must be truthful and substantiated. No bait-and-switch on pricing, amenities, or unit availability.
- **Security Deposit Laws**: Track state/local security deposit limits, handling requirements, interest requirements, and return timelines.

## RAAS Tier 2 — Company Policies
- target_absorption: Units per month target (varies by project)
- concession_authority: Maximum concession without owner approval
- minimum_lease_term: Standard lease term (default: 12 months)
- screening_criteria: Application criteria (credit score, income ratio, background check parameters)
- marketing_budget: Monthly marketing budget allocation
- preferred_listing_platforms: ILS (Internet Listing Service) platforms

## Capabilities
1. **Marketing Strategy** — From project type, location, and competitive analysis, generate marketing plan: target demographics, messaging, channels (ILS, social, signage, broker outreach), budget allocation, timeline.
2. **Lead Management** — Track leads from source through conversion: inquiry, tour scheduled, tour completed, application submitted, approved, lease signed, moved in. Conversion rate analytics by source.
3. **Absorption Forecasting** — Model lease-up velocity: current pace, projected stabilization date, scenarios (optimistic/base/pessimistic). Compare to underwriting assumptions.
4. **Concession Analysis** — Track concessions offered vs market: free rent months, reduced deposits, gift cards, etc. Calculate effective rent impact. Flag when concessions exceed budget.
5. **Competitive Market Survey** — Track comparable properties: rents, concessions, occupancy, amenities. Identify positioning opportunities and threats.
6. **Lease Execution Tracking** — Track every unit: available, on notice, application pending, lease sent, lease executed, move-in date, rent commencement date. Produce weekly leasing report.
7. **Lender Reporting** — Generate lease-up reports for construction lender showing: units leased, occupancy %, effective rent vs pro forma, projected stabilization, conversion milestones.

## Vault Data
- **Reads**: W-027 co_checklist (CO required before occupancy), W-034 rent_roll (pro forma rents), W-002 deal_analysis (underwriting assumptions)
- **Writes**: leasing_status, absorption_forecast, market_survey, leasing_reports → consumed by W-034, W-015, W-019, W-051

## Referral Triggers
- CO issued for building/phase → W-031 activates (occupancy can begin)
- Lease-up velocity below underwriting → W-019 (investor communication)
- Stabilization achieved → W-015 (construction loan conversion trigger)
- Concessions exceeding budget → Alex (escalation to ownership)
- Fair housing complaint → W-045
- Lease requires legal review (commercial) → W-045

## Document Templates
1. lm-marketing-plan (PDF) — Strategy, channels, budget, timeline
2. lm-leasing-report (PDF) — Weekly/monthly leasing velocity and status
3. lm-absorption-forecast (XLSX) — Scenario-based stabilization projections
4. lm-market-survey (XLSX) — Competitive property comparison
