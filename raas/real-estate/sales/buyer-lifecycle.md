# Buyer Lifecycle
# Path: raas/real-estate/sales/buyer-lifecycle.md

---

## Stage 1: Lead
**Trigger:** New buyer inquiry (web lead, sign call, referral, open house, social media)

**AI actions:**
- Create contact record with type: buyer, subtype: buyer-lead
- Respond within 5 minutes (the most critical metric in real estate lead conversion)
- Personalize response to the source:
  - Zillow lead on specific property: reference that property, provide additional info, suggest showing
  - General inquiry: ask about their search criteria, timeline, and pre-approval status
  - Referral: mention the referring person by name
- Qualify: timeline (now vs 6 months), pre-approved?, renting vs owning, motivation

## Stage 2: Needs Assessment
**Trigger:** Initial conversation completed

**AI actions:**
- Document buyer criteria: price range, location preferences, property type, beds/baths, must-haves, deal-breakers
- Assess motivation level: 1-5 scale
- Check pre-approval status
- If not pre-approved: connect with preferred lender(s)
- If pre-approved: verify amount aligns with search criteria
- Set up automated MLS search matching their criteria
- Schedule buyer consultation if not done

## Stage 3: Active Search
**Trigger:** Buyer is pre-approved and actively looking

**AI actions:**
- Monitor MLS daily for matching listings
- Alert buyer within 1 hour of new matching listings (before other agents' buyers see them)
- Schedule showings efficiently (route optimization for multiple showings)
- After each showing: collect feedback, rate 1-5, track likes/dislikes
- Refine search criteria based on feedback patterns
- Track: homes viewed, favorites, rejected, and why
- If 10+ showings with no offer: reassess criteria or pricing expectations

## Stage 4: Making Offers
**Trigger:** Buyer wants to make an offer

**AI actions:**
- Pull comparable sales for the target property
- Analyze listing history: price changes, DOM, agent responsiveness
- Recommend offer strategy: at asking, below, or above (based on market conditions and competition)
- Draft offer with agent review (jurisdiction-specific forms)
- Include appropriate contingencies: inspection, appraisal, financing, sale of current home
- Calculate buyer's estimated costs: down payment, closing costs, monthly payment, insurance, taxes
- Track offer deadline and follow up with listing agent
- If rejected or countered: analyze counter, recommend response

## Stage 5: Under Contract → Closing
See `transaction-management.md`

## Stage 6: Post-Purchase
**AI actions:**
- Congratulations and welcome to new home
- Vendor list: recommended contractors, handymen, landscapers, cleaners
- Homestead exemption reminder (FL), property tax protest guidance (TX)
- Utility setup checklist
- Review/testimonial request (7-14 days after closing)
- Add to past client nurture: home anniversary, birthday, holiday, quarterly market updates
- Track: "Did you have a home to sell? Need a referral somewhere?"
