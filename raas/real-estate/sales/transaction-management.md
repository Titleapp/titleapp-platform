# Transaction Management — Contract to Close
# Path: raas/real-estate/sales/transaction-management.md

---

## Overview

Once a property goes under contract, the AI tracks every deadline and milestone through closing. Missing a deadline can kill a deal, so the AI is aggressive about reminders.

## Universal Transaction Timeline

### Day 0: Effective Date
- Contract is fully executed (all parties signed)
- AI creates transaction record, populates all dates from contract terms
- AI sends "Under Contract" notification to all parties
- Clock starts on all contingency periods

### Inspection Period (typically 7-15 days from effective date)
**AI actions:**
- Schedule inspection immediately — recommend inspectors from vendor list
- Alert 48 hours before inspection deadline
- After inspection: review report, flag major issues
- Draft repair request if needed
- Track repair negotiation: request → response → resolution
- If inspection kills deal: document reason, update records, restart marketing

### Appraisal (typically ordered within 5 days, completed within 14-21 days)
**AI actions:**
- Confirm lender ordered appraisal
- If no confirmation in 5 days: alert agent to follow up with lender
- Track appraised value when received
- If appraisal < contract price: alert immediately, prepare options:
  1. Seller reduces price to appraised value
  2. Buyer brings difference in cash
  3. Meet in the middle
  4. Renegotiate
  5. Walk away
- If appraisal comes in at or above: celebrate, move forward

### Title & Escrow (parallel process)
**AI actions:**
- Confirm title company received contract
- Track title commitment/preliminary title report
- Flag title issues: liens, encumbrances, boundary disputes, judgments
- Track HOA estoppel letter (FL) or resale certificate
- Confirm wire instructions for closing (and warn about wire fraud)

### Financing (buyer's lender process)
**AI actions:**
- Track loan application status
- Monitor: submitted → processing → underwriting → conditional approval → clear to close
- Alert if lender requests additional documents
- Track rate lock status and expiration
- Flag delays: "Lender has been in underwriting for 12 days — follow up"

### Clear to Close
**AI actions:**
- Confirm all conditions met: inspection resolved, appraisal done, title clear, loan approved
- Schedule closing date and time
- Prepare closing document checklist
- Remind buyer to do final walkthrough (24-48 hours before closing)
- Send closing cost estimate / settlement statement for review
- Confirm wire transfer arrangements
- WARN: wire fraud prevention — never change wire instructions via email

### Closing Day
**AI actions:**
- Send reminder to all parties
- Confirm time, location, what to bring (ID, certified check if applicable)
- After closing: confirm recording (deed filed with county)
- Celebrate! "Congratulations" message to buyer and seller
- Commission disbursement tracking

### Post-Closing
**AI actions:**
- Verify commission received
- Update contact records: buyer → buyer-past, seller → seller-past
- Update property record: sold
- Trigger post-closing follow-up sequence (see buyer-lifecycle.md and listing-lifecycle.md)

## Deadline Alerting Rules
- 7 days before: standard reminder
- 3 days before: urgent reminder
- 1 day before: critical alert
- Day of: "TODAY IS THE DEADLINE for {event}"
- Overdue: "MISSED DEADLINE — {event} was due yesterday. Immediate action required."

## Transaction Communication Log
Every communication about a transaction is logged:
- Who said what, when, how (email, text, phone, in person)
- All documents sent and received
- All negotiations and counter-offers
- This protects the agent in disputes and provides a complete paper trail
