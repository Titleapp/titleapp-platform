# Inspections
# Path: raas/real-estate/sales/inspections.md

---

## Transaction Inspections — Types with Cost Ranges

| Inspection | Cost Range | Notes |
|------------|-----------|-------|
| General Home | $350-600 | Standard for all transactions |
| Termite / WDO | $75-150 | Required in FL |
| Roof | $150-300 | Recommended for homes 10+ years |
| Foundation | $300-500 | Critical in TX (clay soil) |
| HVAC | $100-200 | Recommended for systems 8+ years |
| Sewer Scope | $200-400 | Recommended for homes 20+ years |
| Electrical | $150-300 | Recommended for pre-1980 homes |
| Pool | $150-250 | If pool present |
| Mold | $300-600 | If signs of water intrusion |
| Radon | $150-200 | Recommended in all markets |
| Survey | $400-800 | Often required by lender |
| Wind Mitigation (FL) | $75-150 | Reduces insurance premium |
| 4-Point (FL) | $100-200 | Required for insurance on older homes |
| Phase I (Commercial) | $2,000-5,000 | Environmental assessment |

## AI Inspection Management

### Before Inspection
- Recommends which inspections based on property age, type, location, and known issues
- Schedules from vendor list (preferred inspectors per area)
- Confirms access (lockbox code, tenant notice if occupied)
- Tracks deadline: alerts at 5, 3, 1 day before inspection contingency expires

### After Inspection
- Parses inspection report PDF
- Categorizes findings:
  - **Critical / Safety** — must address (electrical hazard, structural, gas leak)
  - **Major ($1,000+)** — significant repair needed (roof, HVAC, foundation, plumbing)
  - **Minor** — cosmetic or small repairs (caulking, outlets, hardware)
  - **Informational** — no action needed but noted (age of systems, maintenance recommendations)
- Summarizes in plain English for client
- Drafts repair request with dollar amounts from cost database

## AI-Guided Property Tour (Phone-Based)

Buyer opens Property Tour Mode on phone at the property:

**Screen 1: Pre-Tour Analysis**
- Fair value range based on comps
- Monthly payment estimate (principal, interest, taxes, insurance, HOA)
- Risk maps: flood zone, fire zone, school ratings, crime stats
- Key disclosures flagged

**Screen 2: Room-by-Room Guide**
- AI prompts buyer what to look for in each room based on property age, disclosures, and known issues
- Buyer takes photos
- AI assesses condition in real-time
- Checks: water stains (ceiling, baseboards), outlet function, window condition, floor levelness, cabinet condition, appliance age, HVAC vents, water pressure

**Output: On-the-Spot Condition Assessment**
- What's good
- What to monitor
- What's concerning
- Estimated 5-year repair budget
- Fair value verdict

Less biased than a human inspector: no relationship with seller's agent, no incentive to find or hide problems, consistent methodology, data-backed.

## Instant Offer from the Property

Buyer finishes tour, says "I want to make an offer":
1. AI recommends offer price with reasoning (comps, condition issues, DOM, competition)
2. AI drafts contract (jurisdiction-specific: FAR/BAR in FL, TREC in TX, CAR RPA in CA) pre-filled with recommended terms
3. Buyer reviews on phone, signs, submits — before leaving the driveway
4. Seller's AI receives, analyzes, presents to seller with recommendation

## Repair Cost Database

Regional cost estimates for common repairs:

| Repair | Cost Range |
|--------|-----------|
| Roof Replacement | $8,000-18,000 |
| HVAC System | $5,000-12,000 |
| Water Heater | $800-1,800 |
| Foundation (per pier) | $800-2,000 |
| Kitchen Remodel | $25,000-80,000 |
| Bathroom Remodel | $10,000-35,000 |
| Exterior Paint | $3,000-8,000 |
| Flooring (per sqft) | $3-15 |
| Electrical Panel | $1,500-4,000 |
| Plumbing Repipe | $4,000-15,000 |
| Termite Treatment | $500-2,500 |
| Sewer Line | $3,000-12,000 |

## Vendor Estimate Comparison

AI requests 2-3 estimates from vendor network, compares against market rates, presents comparison with recommendation to client.

## Property Management Inspections

### Move-In Inspection
- Document every room with photos
- Tenant signs off on condition
- Establishes baseline for deposit deductions

### Move-Out Inspection
- Compare to move-in photo by photo
- Calculate deductions per state law
- Draft deposit return letter per state deadline (FL: 30 days, TX: 30 days, CA: 21 days)

### Annual Inspection
- Schedule with proper notice per state law (FL: 12 hrs, TX: 24 hrs best practice, CA: 24 hrs written)
- Generate checklist: smoke detectors, water damage, pest evidence, HVAC filters, exterior condition
- Store results with photos

### Drive-By Inspection
- Exterior checks for lease compliance
- Unauthorized vehicles, yard condition, exterior damage, unauthorized modifications
