# Maintenance Operations
# Path: raas/real-estate/property-management/maintenance.md

---

## Request Handling

### Intake
Tenants can submit requests via:
- Chat with AI assistant (preferred — AI captures all details)
- Online portal
- Phone call (AI transcribes and creates ticket)
- Email (AI parses and creates ticket)
- In person (manager creates ticket)

### Required Information
- Property and unit
- Category (plumbing, electrical, HVAC, appliance, structural, pest, landscaping, safety, general)
- Description of issue
- Photos (strongly encouraged)
- Permission to enter (if tenant won't be home)
- Best contact number and times

### AI Triage
The AI categorizes priority:

**Emergency (dispatch immediately):**
- No heat (when temp below 50°F)
- Gas leak or gas smell
- Flooding or burst pipe
- Fire or fire damage
- Electrical hazard (sparking, burning smell)
- No running water
- Sewer backup
- Broken exterior door/window (security risk)
- Carbon monoxide alarm

**High (same-day response, next-day repair):**
- AC failure (when temp above 85°F)
- No hot water
- Refrigerator not working
- Toilet not flushing (only toilet in unit)
- Significant water leak (not flooding but active)

**Medium (3-5 day resolution):**
- Minor water leak (dripping faucet)
- Non-critical appliance issue (dishwasher, garbage disposal)
- Pest issue (non-emergency — ants, roaches)
- Broken fixture (cabinet, drawer, closet door)
- Minor plumbing (slow drain, running toilet)

**Low (10 day / next scheduled visit):**
- Cosmetic issues (paint, drywall nick)
- Weatherstripping
- Screen repair
- Caulking
- Light bulb in common area
- Landscaping request

### Vendor Dispatch
1. AI selects vendor: match specialty, check availability, prefer property's designated vendor
2. AI sends work order: property address, unit, issue description, tenant contact, access instructions
3. Vendor confirms receipt and ETA
4. AI notifies tenant: "Your maintenance request has been assigned to [vendor]. They'll be there [date/time]."
5. After completion: AI follows up with tenant — "Was the issue resolved?"
6. If not resolved: reopen, dispatch again
7. Invoice captured, added to property expenses

### Owner Approval
- Configurable threshold per owner (default $500)
- Under threshold: AI dispatches automatically, reports on monthly statement
- Over threshold: AI requests owner approval before dispatching
  - "Unit 4B needs an AC compressor replacement. Estimated cost: $1,200. Approve?"
  - Track approval response time — if no response in 24 hours, follow up
  - If emergency AND over threshold: dispatch anyway, notify owner immediately

### Preventive Maintenance Schedule
AI manages recurring maintenance:
- HVAC filter change: every 90 days
- HVAC service: spring (AC) and fall (heat)
- Gutter cleaning: twice per year
- Pest control: quarterly (if contracted)
- Smoke detector batteries: annually
- Fire extinguisher inspection: annually
- Landscape maintenance: weekly/biweekly (if contracted)
- Pool service: weekly (if applicable, especially FL)
- Dryer vent cleaning: annually
- Water heater flush: annually

### Warranty Tracking
- Appliance warranties: track expiration for each unit
- Home warranty policies: know coverage and claim process
- Builder warranty: track for newer properties (typically 1 year builder, 2 year systems, 10 year structural)
- Before dispatching vendor: AI checks if issue is covered under warranty

## Vendor Management
- Maintain preferred vendor list per specialty per property
- Track: response time, quality, cost, reliability
- Require: current insurance certificate (liability + workers comp), license (where applicable)
- Annual review: pricing comparison, performance assessment
- AI can recommend vendor changes based on performance data
