# Property Management Operations
# Path: raas/real-estate/property-management/README.md

---

## Overview

Property management is an operational business. Revenue comes from management fees, leasing fees, and maintenance markups. The AI runs day-to-day operations: tenant communication, maintenance dispatch, rent collection, owner reporting, and vacancy marketing.

## Key Performance Metrics
- **Occupancy rate:** Target 95%+. Below 90% is a problem.
- **Average days vacant:** Market-dependent but lower is better. Track vs market average.
- **Rent collection rate:** Target 98%+. Track on-time vs late vs delinquent.
- **Maintenance response time:** Emergency: 1 hour. Urgent: 24 hours. Routine: 3-5 days.
- **Tenant retention rate:** Higher is better — turnover is expensive ($2,000-$5,000 per turn).
- **Owner satisfaction:** Track communication frequency, statement accuracy, issue resolution.

## AI Operational Rules

### Rent Collection
- Rent due on the 1st (standard, configurable per lease)
- Grace period per lease (typically 3-5 days)
- Day 1: Rent due notification (sent day before)
- Day after grace period: Late fee assessed, late notice sent
- Day 10: Second notice, phone call attempt
- Day 15: Final notice / demand letter / 3-day notice (jurisdiction-specific)
- Day 20: Begin eviction consultation with attorney (jurisdiction-specific)
- AI NEVER threatens or intimidates — always professional, factual, and legally compliant

### Maintenance Dispatch
- Tenant submits request (chat, portal, phone, email)
- AI categorizes and prioritizes:
  - **Emergency** (no heat, flooding, gas leak, fire, break-in): Dispatch immediately, any time of day. Alert property manager.
  - **High** (no hot water, AC out in summer, appliance failure): Same-day response, next-day repair
  - **Medium** (leaking faucet, broken fixture, pest issue): 3-5 day resolution
  - **Low** (cosmetic, convenience): Schedule with next routine visit or within 10 days
- AI selects vendor based on: specialty, availability, preferred vendor for property, cost, rating
- Track from request to completion
- If vendor doesn't respond in 2 hours (emergency) or 24 hours (other): escalate to next vendor
- Owner approval required for expenses over threshold (configurable, default $500)

### Lease Renewals
- 90 days before expiration: AI analyzes market rent, tenant payment history, property condition
- 90 days: Generate renewal recommendation for property manager review
- 75 days: Send renewal offer to tenant
- 60 days: Follow up if no response
- 45 days: Final offer or begin vacancy preparation
- 30 days: If not renewing, begin marketing unit, schedule move-out inspection
- AI recommends rent increase based on: market comps, tenant quality (payment history, maintenance frequency, complaints), owner preferences, local rent control laws (CA)

### Owner Reporting
- Monthly owner statement by the 10th of following month
- Contents: rent collected, expenses paid, management fee, net disbursement
- Annual: 1099 for tax purposes, year-end summary, property performance
- Ad hoc: vacancy updates, maintenance issues, tenant concerns
- AI drafts all reports, manager reviews and sends

### Move-In Process
1. Application received → AI runs background/credit check
2. Application approved → lease generated from template
3. Lease signed → collect security deposit + first month
4. Move-in inspection (document condition with photos)
5. Key handoff
6. Welcome communication: emergency contacts, maintenance portal, community rules

### Move-Out Process
1. Notice received (or lease expiration)
2. Schedule move-out inspection
3. Move-out inspection (document condition, compare to move-in)
4. Calculate security deposit deductions (per state law — see jurisdiction files)
5. Return deposit within state-required timeframe
6. Unit turn: cleaning, repairs, painting, carpet
7. Relist unit
