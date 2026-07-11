# CODEX 25 — Real Estate Demo Persona: Merritt Capital Group

**Demo persona:** `/demo?persona=realestate`  
**Primary prospect audience:** Scott, Kimi, Christina + any CRE investor/brokerage  
**Story:** A boutique CRE operator running a mixed portfolio (condo brokerage, apartment PM, and a mixed-use development in progress) across three markets. Every worker the platform has, Scott needs. The HR tab alone tells the story that this isn't a simple tool.

---

## Lessons Learned from Dr. Maya (Do Not Repeat)

Before building anything, read and internalize these:

| Bug class | What happened | Prevention |
|-----------|--------------|------------|
| **Shared tenant** | Dr. Maya's demo shared a tenant with Sean's DEMO SPACE (`ws_1781920656122_tl9dhn`). When HR bootstrapped, Sean + Kent appeared in the vet clinic roster. | RE demo must get its **own dedicated tenant ID**. Never share with any real user. |
| **Wrong UID in seed scripts** | `seedCreatorWorkers.js` originally used Sean's DEMO SPACE UID, not Dr. Maya's. Workers seeded to wrong user. | Confirm demo UID from the `demo:token` endpoint before writing any seed script. Add assertion at top of every seed script. |
| **Checklist item IDs mismatched** | `DemoSignIn.jsx` set `ta_checklist_platform-hr` with keys like `"hr-basics"` but `WORKER_CHECKLISTS` in `WorkerCanvas.jsx` used `"roster"`. Result: 1/7 complete, showed setup mode not intelligence mode. | Pull the exact `id` fields from `WORKER_CHECKLISTS` in `WorkerCanvas.jsx` and paste them verbatim. No guessing. |
| **`landOnFirstDataTab` overlay** | App.jsx auto-fired `landOnFirstDataTab()` on every worker open, called `showCanvas()` with a WorkProductCard, and overlaid the WORKSPACE_HOME canvas for platform/spine workers. | Fixed globally in App.jsx (skip for `platform-*` and `chief-of-staff`). RE demo workers are vertical, not platform — they must have real signals so the auto-tab lands on data, not a blank tab. |
| **Bootstrap defaults** | When HR people list is empty, the backend seeds SOCIII staff (Sean + Kent). Empty = wrong. | Seed HR before any demo user can trigger bootstrap. Seeding script must run **before** the demo tenant is exposed. |
| **Wrong checklist completions for creator workers** | Creator dashboard checklists use different keys than spine workers. Don't assume the same structure. | Verify CREATOR_CHECKLISTS (if any) the same way — read the constant, paste verbatim. |

**Rule of thumb:** For any new demo persona, the order is:  
1. Create tenant + demo UID in the backend `demo:token` handler  
2. Seed Firestore (workers, HR, operating feed) with the CORRECT UID and tenant  
3. Update `DemoSignIn.jsx` (or a new persona sign-in) with EXACT localStorage checklist keys  
4. Build + QA in that order  

---

## Persona: Scott Harrington — Merritt Capital Group

**Entity structure (vertically integrated boutique operator):**
- **Merritt Capital Group, LLC** — parent entity; developer, LP holdco, investor of record for all 3 assets. Scott is principal.
- **Merritt Property Group, LLC** — wholly-owned subsidiary; licensed brokerage (CA + NV + TX) + property management firm. Dana Reyes is Principal Broker. All sales agents and PM staff are MPG employees.

This structure is realistic and common — one capital vehicle, one operating vehicle. It explains why Scott's HR roster covers both sales agents and maintenance staff: they're all Merritt Property Group payroll.

**Demo user name:** Scott Harrington, Principal — Merritt Capital Group  
**Demo user email:** `re-demo@sociii.ai` (new, separate from Dr. Maya)

---

## Three-Building Portfolio

These use **real building addresses** for ATTOM parcel lookups but **fictitious ownership and tenant names**.

### Building 1 — The Meridian at Flamingo (Las Vegas, NV)
**Purpose in demo:** Brokerage + HOA management + active listings  
**Real address:** 4525 Dean Martin Dr, Las Vegas NV 89103 (Panorama Towers — real 31-story luxury condo, ~746 units, built 2007)  
**Fictitious overlay:** "The Meridian at Flamingo" — re-branded for demo  
**Parcel note:** ATTOM covers by unit (e.g., Unit 1404). Use unit-level lookup for listing cards.  
**Story elements:**
- 12 active listings ($450K–$1.1M range)
- 3 pending (under contract), 2 closed in 30 days
- 100 prospect buyers in the CRM (Contacts worker)
- HOA board meeting scheduled July 15
- 2 buyer's agents assigned (see HR roster)

### Building 2 — Creekwood Commons (Sacramento, CA)
**Purpose in demo:** Property management — Class B apartment complex  
**Real address:** 2901 Riverside Blvd, Sacramento CA 95818 (real mid-rise apartment corridor)  
**Fictitious overlay:** "Creekwood Commons Apartments" — 148 units  
**Story elements:**
- 142/148 units occupied (95.9% occupancy)
- Rent roll: avg $1,840/mo → $261,280 gross monthly
- 3 maintenance tickets open (HVAC unit 214, roof leak unit 308, appliance unit 512)
- Turnover: Unit 116 vacated June 1 — in prep for July 1 move-in
- Section 8 tenants: 12 (HUD subsidy tracked in ledger)
- Annual inspection due: August 14

### Building 3 — Domain Point (Austin, TX)
**Purpose in demo:** Active development + LP investor relations  
**Real address:** 300 W 6th St, Austin TX 78701 (real Class A mixed-use corridor, downtown Austin)  
**Fictitious overlay:** "Domain Point" — 24-unit mixed-use (retail ground floor + 18 residential)  
**Story elements:**
- Construction phase: ~70% complete, projected delivery Oct 2026
- Open permit: structural + MEP (permit #AUS-2026-004821)
- 8 LP investors (see IR worker seed data below)
- Next capital call: $380K due July 30
- Architect of record: Rivera & Associates (1099 contract)

---

## HR Roster — Full CRE Operation

Scott's HR story is the most powerful because it shows the **full complexity** of a CRE operation. This is not Dr. Maya's 5-person clinic. Seed all of the following. Every person has an `assignedTo` field so Alex can answer "who's on Creekwood?":

| Name | Role | Entity | Type | Assigned To | Notes |
|------|------|--------|------|-------------|-------|
| Scott Harrington | Principal | MCG | W2 / Owner | All | Demo user |
| Dana Reyes | Principal Broker | MPG | W2 | Bldg 1 + 2 | Licensed CA + NV + TX |
| Marcus Webb | Buyer's Agent | MPG | W2 | Bldg 1 | Active on 3 buyer files |
| Taylor Oakes | Buyer's Agent | MPG | W2 | Bldg 1 | New — 60-day ramp |
| Andrea Solis | Property Manager | MPG | W2 | Bldg 2 | Full-time on-site |
| Kenji Park | Maintenance Coordinator | MPG | W2 | Bldg 2 + Bldg 1 HOA | On-call |
| Ray Estevez | HVAC Technician | MPG | W2 | Bldg 2 | OSHA 30 expires Sep 2026 |
| Luis Morales | Maintenance Technician | MPG | W2 | Bldg 2 | Rotating weekends |
| Pat Nguyen | Groundskeeper | MPG | 1099 | Bldg 2 | Weekly contract |
| Carmen Vega | Property Admin / Leasing | MPG | W2 | Bldg 2 | Front office |
| Jordan Blake | Transaction Coordinator | MPG | 1099 | Bldg 1 | Closings admin |
| Derek Cho | Construction Superintendent | MCG | Contract | Bldg 3 | Westbrook GC, on-site |
| Sofia Restrepo | Permitting Specialist | MCG | Contract | Bldg 3 | Austin permit pipeline |
| Elena Marchetti | General Counsel | MCG | 1099 | All | Retainer basis |
| Carlos Rivera | Architect (AOR) | MCG | 1099 | Bldg 3 | Rivera & Associates |

**MCG = Merritt Capital Group / MPG = Merritt Property Group (subsidiary)**  
**Total: 15 staff across W2, 1099, and contract** — shows SOCIII HR handles multi-type, multi-entity workforce.

**External firms (in the record, not HR roster):**
- Westbrook General Contractors — GC of record for Domain Point
- Rivera & Associates — architecture firm of record, AOR = Carlos Rivera

**Operating feed items to surface in HR:**
- "Ray Estevez OSHA 30 cert expires in 97 days — renewal required before September"
- "Taylor Oakes 60-day ramp review due June 30"
- "Derek Cho (Westbrook) contract ends Oct 1 — Domain Point delivery date, extend or close out"

---

## LP Investor Data (Domain Point / IR Worker)

8 limited partners for the Bldg 3 deal:

| Name | Entity | Commitment | Paid In |
|------|--------|-----------|---------|
| Howard Finch | Finch Family Trust | $750,000 | $600,000 |
| Diana Park | Park Equity LLC | $500,000 | $400,000 |
| Robert & Carol Simmons | Simmons Ventures | $1,000,000 | $800,000 |
| Yusef Osman | Osman Holdings | $250,000 | $250,000 |
| Patricia Liang | Liang Capital Group | $500,000 | $400,000 |
| Marcus Eaton | ME Real Assets LLC | $300,000 | $150,000 |
| Sunrise Ridge Partners | (entity) | $700,000 | $700,000 |
| The Nguyen Group | (entity) | $250,000 | $100,000 |

**Total committed: $4,250,000 / Total paid in: $3,400,000**  
**Next call:** $380,000 due July 30, 2026

---

## Workers Scott Needs

> **RED-TEAM NOTE:** `re-brokerage`, `re-property-manager`, and `re-investor-relations` do NOT
> exist as wired workers. They have no WORKER_CHECKLISTS, WORKER_INTELLIGENCE, or liveData
> handler. The 6 RE analysis workers (title-abstract-001, zoning-001, etc.) render from
> reCanvasData.js — they bypass the checklist flow entirely. `investor-relations` exists in
> the marketplace but has no canvas infrastructure. See red-team RT1, RT2, RT7, RT12.
>
> **Decision required before build:**
> - Option A: Build `re-property-manager` and `investor-relations` canvas before demo
> - Option B: Scope down — show analysis workers + platform workers + re-marketing-001;
>   tell PM story through Accounting (rent roll); drop IR from this demo

| Worker slug | Why needed | Notes |
|-------------|-----------|-------|
| `platform-control-center-pro` | Portfolio KPIs across 3 assets | Fully wired |
| `platform-accounting` | Multi-entity GL, rent roll, draws | Fully wired |
| `platform-hr` | 15-person mixed workforce | Fully wired |
| `platform-marketing` | Listing ads, email to buyers | Needs campaigns seeded (see Marketing section) |
| `platform-contacts` | 100 buyers, 8 LPs, vendors | Fully wired |
| `re-marketing-001` | Listing-level marketing + showings | Wired — needs campaigns seeded |
| `title-abstract-001` | Title chain for Bldg 1 condo units | Custom RE canvas (no checklist needed) |
| `zoning-001` | Zoning for Bldg 3 mixed-use | Custom RE canvas (no checklist needed) |
| `cre-analyst` | Deal analysis for Domain Point | Custom RE canvas (no checklist needed) |
| `investor-relations` | 8 LPs, cap table, capital calls | **Canvas NOT built — decision required** |
| `re-property-manager` | Bldg 2 tenants, maintenance, ledger | **Canvas NOT built — decision required** |
| `chief-of-staff` | Cross-portfolio priority synthesis | Fully wired |

---

## Demo Token Architecture

This persona requires a **new entry** in the `demo:token` endpoint in `functions/functions/index.js`:

```js
// Around the existing DEMO_UID block, add:
const RE_DEMO_UID = ""; // create via Firebase Auth, fill in after creation
const RE_DEMO_TENANT = ""; // create via Firestore, fill in after creation

if (req.query.persona === "realestate") {
  // issue token for RE demo user
}
```

The new `/demo?persona=realestate` route in `App.jsx` (or `main.jsx` routing) should:
1. Hit `/v1/demo:token?persona=realestate`
2. Sign in with custom token
3. Set checklists in localStorage (with EXACT item IDs from WORKER_CHECKLISTS)
4. Redirect to `/?demo=1&persona=realestate`

---

## DemoSignIn Checklist Keys — EXACT (copy-paste, do not guess)

```js
// Non-default items only — default items (first item in each list) auto-complete
const reChecklists = {
  "ta_checklist_platform-control-center-pro": { "email-connection": now, "communication-preferences": now, "key-metrics": now, "revenue-tracking": now, "acquisition-goals": now, "external-feeds": now },
  "ta_checklist_platform-accounting":         { "bank-statements": now, "accounting-software": now, "tax-returns": now, "expense-rules": now, "vendor-lists": now },
  "ta_checklist_platform-hr":                 { "roster": now, "handbook": now, "org-chart": now, "payroll": now, "perf-reviews": now, "compliance-docs": now },
  "ta_checklist_platform-marketing":          { "brand-guidelines": now, "social-accounts": now, "contact-lists": now, "competitor-docs": now, "content-workflow": now },
  "ta_checklist_platform-contacts":           { "import-contacts": now, "crm-connect": now, "comm-history": now, "followup-auto": now, "client-categories": now },
  // RE canvas workers (title-abstract-001, zoning-001, cre-analyst, etc.) have NO
  // WORKER_CHECKLISTS entries — they render reCanvasData.js directly, skip checklist flow.
  // investor-relations and re-property-manager: NOT in WORKER_CHECKLISTS — build decision pending.
};
```

## Opening Scene (Define Before Building)

When Scott signs in, the platform must feel like his world immediately — not a blank workspace.

**First worker to open:** `platform-control-center-pro` — portfolio KPIs, all 3 buildings in one view.

**Alex's opening message (seeded as first COS context):**
> "Good morning, Scott. Two LPs haven't responded to the Domain Point capital call — $130K outstanding with 21 days to July 30. The GC contract extension vote is still open: 3 of 8 pending. Permit inspection is Thursday. On the brokerage side, Unit 704 is clear to close July 8, and Marcus Webb has two active negotiations from last weekend's open house at Unit 1901. What do you want to tackle first?"

**Tenant workspace description (Firestore field — feeds Alex's COS context):**
```
"description": "Merritt Capital Group, LLC — CRE developer and operator. Portfolio: The Meridian at Flamingo (Las Vegas, luxury condo brokerage + HOA), Creekwood Commons (Sacramento, 148-unit Class B apartments), Domain Point (Austin, mixed-use development in progress, 8 LP investors). Operating subsidiary: Merritt Property Group, LLC (Dana Reyes, Principal Broker). 15 staff across MCG and MPG."
```

---

## Seed Script Checklist (in order)

> **Every seed script must start with this guard (Dr. Maya lesson):**
> ```js
> const DEMO_UID = ""; // VERIFY: must match RE_DEMO_UID in index.js demo:token exactly
> const DEMO_TENANT = ""; // VERIFY: must match RE_DEMO_TENANT in index.js demo:token exactly
> if (!DEMO_UID || !DEMO_TENANT) throw new Error("Fill in DEMO_UID and DEMO_TENANT before running");
> ```

**Decision required before step 1:** Verify Austin address ATTOM coverage, or swap to a confirmed residential address. Do not seed `seedREProperties.js` until this is resolved.

1. `scripts/demo/createREDemoUser.js` — create Firebase Auth user `re-demo@sociii.ai`, print UID
2. `scripts/demo/createRETenant.js` — create Merritt Capital Group tenant, print tenant ID; write `description` field for Alex COS context
3. Update `index.js` `demo:token` endpoint with new UID + tenant ID; add UID to credit whitelist (RT23)
4. `scripts/demo/assignREWorkers.js` — write RE workers to tenant's workspace so they appear in Scott's sidebar (title-abstract-001, zoning-001, feasibility-001, cre-analyst, re-marketing-001, investor-relations if canvas built)
5. `scripts/demo/seedREHRPeople.js` — seed 15-person roster (MCG + MPG, with `assignedTo` per building)
6. `scripts/demo/seedREOperatingFeed.js` — seed 10 alert items to `alertFeed/{DEMO_UID}/items` (UID, not tenant)
7. `scripts/demo/seedREMaintenanceTickets.js` — seed 5 MX tickets with Fal.ai photo URLs (CODEX 27 schema); collection: `tenants/{DEMO_TENANT}/maintenanceTickets`
8. `scripts/demo/seedREContacts.js` — seed 100 buyers into Contacts collection; include segment tags (first-time, investor, upgrade, relocation) so Contacts worker shows segments
9. `scripts/demo/seedREListings.js` — seed 12 active Bldg 1 listings + 3 pending + 2 closed
10. `scripts/demo/seedREProperties.js` — seed 3 parcels with ATTOM addresses (verify Austin addr first)
11. `scripts/demo/seedREInvestors.js` — seed 8 LPs for Domain Point
12. `scripts/demo/seedREMarketingCampaigns.js` — seed all 4 layers of campaigns (prevents SAMPLE chip); verify exact collection path in liveData.js before writing
13. `scripts/demo/seedREAccounting.js` — seed rent roll transactions: $261,280/mo recurring from Creekwood (142 units × $1,840 avg), Meridian HOA fee income, Domain Point draw history; collection path: verify against `buildPlatformAccountingPayload` in liveData.js
14. Update `DemoSignIn.jsx` with persona branching + exact checklist keys above
15. QA pass — explicit criteria:
    - Control Center Pro: opens first, portfolio KPIs visible for all 3 assets
    - HR roster: exactly 15 rows, entity (MCG/MPG) + assignedTo visible
    - Marketing: campaigns for all 4 layers, NO SAMPLE chip on any card
    - Contacts: 100 buyers, segment tabs visible
    - Accounting: rent roll revenue showing (not blank KPIs)
    - MX tickets: 5 open tickets with photo thumbnails in the maintenance canvas
    - LP table: 8 investors, $4.25M committed total
    - alertFeed: 10 items, 0 resolved, severity colors correct
    - All platform-* workers: intelligence mode, no setup checklist visible
    - re-marketing-001: first tab auto-selects to real campaign data (no blank WorkProductCard)
    - title-abstract-001: renders RE canvas for 4525 Dean Martin Dr without ATTOM error
    - Alex opening message matches the briefing above (not generic workspace intake)
    - No Sean/Kent/SOCIII defaults anywhere

---

## Marketing — Full Spec (Major Demo Pillar, Four Layers)

Scott's demo shows something no single platform has ever offered: **four distinct marketing
and communications contexts, all in one place.** This is the differentiator.

The `buildMarketingPayload()` function returns `_demo: true` when no campaigns exist in
Firestore, which renders SAMPLE watermarks on every card. All campaigns below must be seeded.

---

### Layer 1 — Brokerage Lead Gen (Meridian at Flamingo / for-sale)

**Narrative anchor:** "Scott doesn't depend on Zillow. His buyers find him through Google and
AI-powered search — that's where the next generation of buyer discovery is happening."

**Campaigns:**

| Campaign | Status | Key metric |
|----------|--------|-----------|
| Google Search — "Luxury condos Las Vegas Strip" | Active | 3.2% CTR, $12.40 CPC, 14 leads last 30d |
| Instagram — Meridian at Flamingo Listings | Active | 1,840 followers, 312 impressions last 7d, 8 DMs |
| Broker Co-Op Outreach — Q3 (email to 140 agents) | Active | 34% open rate, 6 showing referrals attributed |
| Buyer Drip — Q3 Luxury Buyers (12-email sequence) | Active | 68/100 subscribers, 9 opens last 7d |
| Post–Open House Follow-up (Unit 1901 showing event) | Sent | 22 attendees, 7 follow-up replies, 2 active negotiations |

**Showing event (demo moment):** Unit 1901 open house June 28 — 22 RSVPs, post-event
drip triggered automatically. Alex shows the showing queue and auto-drafted follow-up emails.

**Broker referral tracking:** Co-brokerage referral program — when a buyer's agent from
another firm refers a client, the system tracks the referral source, the deal close, and the
2.5% referral fee obligation. Jordan Blake (TC) manages coordination.

**Social accounts:**

| Platform | Handle | Followers | Last Activity |
|----------|--------|-----------|--------------|
| Instagram | @merrittwithcapital | 1,840 | 2 days ago — Unit 704 under-contract post |
| YouTube | Merritt Capital Group | 412 subs | 1 week ago — Unit 1901 virtual tour (unlisted, pending publish) |
| LinkedIn | Merritt Capital Group | 612 | Domain Point construction milestone |

---

### Layer 2 — PM Tenant Comms & Retention (Creekwood Commons / rentals)

**Narrative anchor:** "Scott's 142 tenants don't churn because the comms never drop. Every
lease renewal, every maintenance update, every community event — on autopilot."

**Campaigns:**

| Campaign | Status | Key metric |
|----------|--------|-----------|
| Lease Renewal Drip — Aug/Sep Expirations | Active | 12 leases expiring; 60-day notices sent to 7 |
| Unit 116 Vacancy — Google + Apartments.com | Active | Posted June 3, 14 inquiries, 3 showings |
| Creekwood July Newsletter | Sent | 142 units, 89% delivery, pool hours + July 4 notice |

**Tenant comms quick actions:**
- "Draft the August renewal reminder for tenants expiring in September" → Alex generates, routed for approval
- "Post Unit 116 to Google and apartments.com" → publishes through platform-marketing connector

---

### Layer 3 — HOA Comms (Meridian at Flamingo / owner-side)

**Narrative anchor:** "The same approval and voting infrastructure that handles deal sign-off
handles HOA budget votes. This is the consent layer the condo world has needed."

**Comms:**

| Item | Status | Date |
|------|--------|------|
| Q3 HOA Meeting Notice + Agenda | Sent | July 1 |
| Q3 Budget Approval Vote | Open | 18/32 votes received — closes July 14 |
| Special Assessment Notice — Pool resurfacing ($680/unit) | Pending | Sends July 15 after vote |
| Quarterly maintenance report | Draft | Due July 20 |

**Demo moment:** Alex surfaces "18 of 32 HOA budget votes received — 14 outstanding.
Reminder sends automatically tomorrow if not resolved." This is the SOCIII consent gate
applied to a new vertical — same engine, different context.

---

### Layer 4 — LP IR Comms (Domain Point / development)

**Narrative anchor:** "8 investors, $4.25M committed. They don't call Scott — they get
structured updates, and when there's a vote, they approve from their phone."

**Communications:**

| Item | Status | Date |
|------|--------|------|
| July LP Construction Update | Sent | July 1, 8/8 opened |
| Capital Call Notice — $380K due July 30 | Active | 6 of 8 transferred; Osman + Nguyen Group pending |
| Vote: Westbrook GC contract extension (6 weeks) | Open | 5/8 approved, 3 pending |
| Q2 Financial Summary (P&L per LP share) | Draft | Due July 15 |

**Demo moment:** "Yusef Osman and The Nguyen Group haven't responded to the capital call
or the contractor vote. Alex drafts a follow-up. You approve it. It sends."

---

### Brand Guidelines

Merritt Capital Group — navy (#0a2240) + gold (#c9a84c), clean serif wordmark.
Upload once to brand-guidelines tab; applies across all 4 layers.

### Seed Script Required

`scripts/demo/seedREMarketingCampaigns.js` — seeds all 4 layers into:
`campaigns/{RE_TENANT_ID}/items` (verify collection path in liveData.js before writing)

---

## Operating Feed — Scott's Alex Daily Brief (Two-Tier Model)

> **RED-TEAM NOTE:** alertFeed is UID-scoped, not tenant-scoped.
> Path: `alertFeed/{RE_DEMO_UID}/items/{alert_id}` — seed using the UID, not the tenant ID.

RE development and operations is putting out fires every day. The feed reflects that urgency.

**Design pattern:**
- **Morning brief (principal level):** Alex surfaces 8-10 strategic items — what needs Scott's decision or attention. Shown in the operating feed panel.
- **Asset/unit zoom (on request):** Ask Alex "what's open at Creekwood?" → full granular queue including sink in 4E. This shows the platform handles CEO visibility AND unit-level operations from the same place.

**Principal-level feed (seed these — shown in morning brief):**

| Item | Asset | Severity | Notes |
|------|-------|---------|-------|
| Capital call: Osman + Nguyen Group not transferred | Domain Point | 🔴 | $130K exposure, July 30 deadline |
| Contractor vote: 3 of 8 LPs haven't voted on GC extension | Domain Point | 🔴 | Westbrook contract decision due |
| Permit inspection: structural sign-off | Domain Point | 🟡 | Scheduled July 3 |
| HOA budget vote: 14 of 32 units outstanding | Meridian | 🟡 | Closes July 14, vote approval needed |
| Unit 704 under contract — clear to close July 8 | Meridian | 🟢 | $875,000, Marcus Webb |
| Unit 1901 showing event: 22 attendees, 2 active negotiations | Meridian | 🟢 | Post-event follow-up pending |
| Taylor Oakes 60-day ramp review | MPG / HR | 🟡 | Due tomorrow |
| Ray Estevez OSHA 30 expiring Sep 2 | MPG / HR | 🟡 | 97 days, renewal required |
| HVAC Unit 214 — Day 4, vendor en route | Creekwood | 🟡 | Tenant escalation risk |
| Unit 116 vacancy: showing today, 14 total inquiries | Creekwood | 🟢 | Carmen coordinating |

**Granular queue (surfaced by Alex on ask — "what maintenance is open at Creekwood?"):**

| Ticket | Unit | Issue | Assigned | SLA | Status |
|--------|------|-------|---------|-----|--------|
| MX-2026-0142 | 214 | HVAC not cooling | Ray Estevez | 24hr | Vendor en route Day 4 |
| MX-2026-0138 | 308 | Roof leak — interior ceiling | Kenji Park | 48hr | Exterior contractor pending |
| MX-2026-0145 | 4E | Kitchen sink — drain slow | Luis Morales | 72hr | Scheduled tomorrow |
| MX-2026-0147 | 512 | Refrigerator out | Carmen Vega | 48hr | Replacement ordered, ETA July 11 |
| MX-2026-0149 | 116 | Turnover prep — paint + carpet | Kenji Park | July 25 | Unit vacated, make-ready in progress |

---

## Visual Canvas Requirements — RE Demo Must Be Photo-First

> **CRITICAL:** Real estate is viscerally visual. Every canvas tab that touches a property
> must show photos and maps — not just text. A demo that looks like a spreadsheet fails.
> This is the Trump Rule applied to RE: if it doesn't look like the property, it isn't real.

### Property Photos
Each building needs at minimum: exterior shot, lobby/common area, a unit interior. Source:
- Panorama Towers (Bldg 1): real public listing photos from ATTOM or open web
- Creekwood Commons (Bldg 2): stock apartment exterior + interior (royalty-free)
- Domain Point (Bldg 3): construction site progress photo (generate via Fal.ai)

### Maintenance Issue Photos (Generate via Fal.ai — seed as Storage URLs)
The maintenance ticket queue must show photo evidence alongside each ticket. Generate:
- HVAC unit (coils visibly dirty/frosted, condensate pan)
- Ceiling stain from roof leak (water stain on drywall, visible bulge)
- Slow kitchen drain (standing water in sink)
- Refrigerator door seal gap / warm interior (condensation on contents)
- Unit 116 turnover — scuffed walls, worn carpet (make-ready before state)

These should be stored in Firebase Storage as `demo/re/maintenance/{ticket_id}.jpg` and
referenced in each maintenance ticket record.

### Map Requirements
- Bldg 1 (Meridian): Google Maps embed for 4525 Dean Martin Dr — satellite + street view
- Bldg 2 (Creekwood): 2901 Riverside Blvd Sacramento — neighborhood map showing walkability
- Bldg 3 (Domain Point): 300 W 6th St Austin — construction zone context

### Canvas Tab Visual Standards
Every RE canvas tab must have at minimum ONE visual element (photo, map, or chart):
- Property overview tab: exterior photo + map pin
- Maintenance tab: photo thumbnail per open ticket
- Listings tab: photo carousel for active units
- Tenant roster: unit grid (occupancy heat map by floor/unit number)
- LP table: no photo needed but a progress bar for capital deployment is required
- HOA tab: building photo + vote tally visual
