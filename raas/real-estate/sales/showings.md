# Showing Management
# Path: raas/real-estate/sales/showings.md

---

## Showing Scheduling for Listings (Seller Side)

Buyer's agent requests showing → AI checks seller availability preferences → confirms or suggests alternative → sends confirmation with access instructions (lockbox code, gate code, showing rules) → notifies seller → follows up with buyer's agent within 2 hours for feedback → aggregates feedback weekly for seller.

Seller availability configured at listing:
- Available times (e.g., "weekdays 10-5, weekends 11-4")
- Notice required (e.g., "24 hours")
- Pets (e.g., "dog must be crated, cat roams")
- Vacant vs occupied
- Tenant notice requirements per state (FL: 12 hours, TX: best practice 24 hours, CA: 24 hours written)

## Showing Scheduling for Buyers

Buyer says "I want to see these 4 homes Saturday" → AI checks availability for all properties → builds optimized driving route (minimize drive time) → sends requests simultaneously → confirms as responses arrive → sends buyer final schedule with property summaries, photos, and price analysis.

Post-showing: AI asks buyer to rate 1-5 with feedback → tracks patterns → refines criteria ("You've rated 3 homes with pools 4-5 stars. Adding 'pool preferred' to criteria.")

## The Showing Agent Pool (AI Brokerage Model)

Contract showing agents: licensed agents who work per-showing ($50-75 flat fee).

AI dispatches nearest available agent like Uber dispatches a driver:
- Agent gets briefing: property address, buyer name, pre-approval amount, what buyer cares about
- Agent opens door, lets buyer explore, reports back to AI with feedback
- Requirements: active license, background check, E&O insurance, smartphone with app, professional appearance
- AI manages pool: tracks reliability, quality (buyer ratings), availability patterns. Auto-removes agents below 4.0 rating.

## Rideshare Integration

AI dispatches Lyft/Uber via API for buyer transportation to showings, inspections, and closings:
- Timed with buffer: "Showing at 2 PM, 22-minute drive, Lyft pickup at 1:30 PM"
- Cost disclosed before booking, charged to buyer or brokerage account
- AI tracks ride in real-time, adjusts if delayed

## Open House Management

- AI recommends timing, creates event listings on MLS/Zillow/Facebook, sends invitations
- Digital sign-in via QR code (captures: name, email, phone, pre-approved?, working with agent?)
- Every sign-in becomes a lead with immediate AI follow-up within 2 hours
- Staffed by showing agent pool ($100-200 per open house)
