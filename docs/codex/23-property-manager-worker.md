# CODEX 23 — Property Manager Worker
## Worker: `property-manager-001` | Vertical: Real Estate | Status: Spec

---

## The Thesis

Property management is a compliance hell and an operations mess — simultaneously. A PM
running 50 residential units is juggling: 50 rent ledgers, 50 lease expiry dates, 200+ annual
maintenance events, state-mandated notice timelines, Fair Housing screening guardrails, and
potential evictions whose procedures vary by county. The software they use (AppFolio, Buildium,
Yardi Breeze) costs $1–3/unit/month, does none of the thinking, and forces the PM to move
between 4–6 tools per task.

**The moat:** The rules that govern this work are non-negotiable — Fair Housing, habitability,
notice timelines, security deposit caps, eviction procedures. These are RAAS-enforced invariants,
not prompts. An AI that "usually" applies Fair Housing correctly is a liability. A rules engine
that *cannot* produce a discriminatory screening output is a product.

**One worker, two faces:**

`property-manager-001` is a single worker with two access modes — operator and tenant.
The PM subscribes and owns the worker. They grant tenants access to their own unit's view
within it. When a tenant moves out, the operator revokes their access token. The tenant's
lease documents and repair history are already in their personal Vault (anchor happened at
signing and each MX close) — they keep those forever, but they lose the live PM workspace.

This mirrors how a law firm worker gives a client a portal view into their own matter,
while the lawyer sees all matters. One worker, role-scoped views.

---

## §1 — Operator Mode (PM's View)

### What It Does

#### 1. Lease-Up (Vacant Unit → Signed Lease)
- Pull property data from ATTOM (address, assessor facts, AVM for rental rate benchmarking)
- Generate rental listing description + qualifying criteria statement (Fair Housing compliant)
- Compute market rent using comparable rentals (ATTOM rental comps + user-uploaded comps)
- Produce listing readiness checklist (habitability, safety certs, move-in condition)
- Track applicant pipeline: inquired → toured → applied → screened → approved → signed

#### 2. Tenant Screening (Fair Housing Guardrails — Core RAAS Layer)
- Accept application data: income, employment, credit score tier, rental history, references
- Apply user-configured screening criteria: income ratio (e.g. 3× monthly rent), credit floor,
  prior eviction flag, prior balance-due flag
- **RAAS rule block:** Any screening criterion that correlates with a protected class triggers
  a hard rule violation before output. The worker CANNOT produce outputs that condition approval
  on: race, color, national origin, religion, sex, familial status, disability (FHA §3604),
  source of income (where state law adds it: CA, NV, OR, WA, NY, IL and more).
- Output: screening decision (approve / conditional / deny) + written adverse action notice
  (FCRA-compliant if credit was pulled) + documented rationale using only permissible criteria
- CAS flags: RED = criterion is legally impermissible | YELLOW = criterion is permissible but
  creates disparate-impact risk | GREEN = clean

#### 3. Active Lease Management
- Lease terms on file: rent amount, due date, grace period, late fee schedule, lease expiry
- Rent ledger: paid / partial / late / unpaid per tenant per month
- Renewal pipeline: flag leases expiring within 90 days, draft renewal offer, track acceptance
- Lease amendments: document and append (append-only, Vault-anchored)
- Move-out checklist: condition report, security deposit accounting, forwarding address

#### 4. Maintenance Coordination
- Tenant submits MX request (via tenant-portal-001 → lands in PM's inbox here)
- PM triages: emergency (habitability / life-safety) vs. routine vs. cosmetic
- Emergency escalation: 24-hr response rule (implied warranty of habitability, all states)
- Vendor dispatch: create work order, assign vendor, track status → completed
- Habitability log: every MX event is appended to property's DTC logbook (Vault-anchored)
- Cost tracking: MX spend per unit per year, deducted from security deposit at move-out

#### 5. Eviction Workflow (State-Specific, Rules-Enforced)
- Pre-eviction: cure notice (pay or quit, cure or quit, unconditional quit) — day counts
  are state-enforced in RAAS, not left to the PM's memory
- Unlawful detainer filing checklist: service requirements, proof of service, court deadlines
- Court date tracker + hearing preparation checklist
- **RAAS rule block:** Retaliatory eviction guard — worker flags if eviction notice follows
  within X days of tenant's protected activity (repair complaint, Fair Housing complaint,
  organizing with other tenants). State thresholds vary (60–180 days).
- Output: properly-dated notice letter (state-specific template), filing checklist,
  timeline with hard deadlines

#### 6. Commercial vs. Residential Mode
- Mode is set at workspace setup (or per property record)
- **Residential mode:** FHA applies. Security deposit cap (1–2× monthly rent, state-specific).
  Habitability rules (implied warranty). Eviction notice minimums enforced.
- **Commercial mode:** FHA does NOT apply to business tenants. No security deposit cap.
  No habitability mandate. Lease is largely freedom-of-contract. Triple-net vs. gross vs.
  modified-gross lease type tracked. CAM reconciliation supported.
  RAAS rules shift from tenant-protection to contract-enforcement.

#### 7. Compliance Dashboard
- Active violations: overdue MX (habitability risk), notices past deadline, missing inspections
- Upcoming deadlines: lease renewals, rent increase notice windows, annual inspection due dates
- Jurisdiction-specific calendar: NV = 3-day pay-or-quit; CA = 3-day; NY = 14-day;
  TX = 3-day; FL = 3-day; WA = 14-day; OR = 10-day (examples — full table in RAAS rules)

---

## §2 — Tenant Mode (Tenant's View)

The PM provisions tenant access per unit. Tenant gets a scoped view — only their unit's
data, only their lease, only their MX requests. Pricing: included in PM subscription or
$5–10/tenant/mo add-on.

### What It Does

#### 1. My Lease
- View current lease terms (rent, due date, lease end date, pet addendum, parking)
- Download signed lease PDF (from Vault anchor or Drive)
- View lease amendment history (append-only log)
- Renewal: accept/counter renewal offer from PM

#### 2. Rent Payment
- Current balance: rent due + any late fees + utility charges
- Payment history: paid dates, amounts, receipts
- **Payment execution:** The worker proposes payment (amount + method); tenant approves;
  payment is initiated (Stripe ACH or external link to PM's payment processor)
  — explicit approval gate, no auto-pay without tenant consent
- Partial payment flag: routes to PM as requiring decision before acceptance

#### 3. Maintenance Requests
- Submit MX request: description, urgency (emergency / routine), photos
- Track status: submitted → triaged → vendor dispatched → scheduled → completed
- Emergency escalation: if tenant marks emergency, immediate SMS/email to PM
- View full repair history for the unit

#### 4. Communications
- Message thread with PM (Alex routes, PM receives in property-manager-001)
- Notice delivery: PM sends formal notices (pay or quit, entry notice, renewal offer) via
  this channel — creates a timestamped, tenant-acknowledged delivery record

**Server-side enforcement:** Tenant access tokens are scoped to a single `unit_id` at the database query layer — not just at the UI or prompt level. A tenant's token cannot retrieve another unit's lease, payments, or MX records. This is consistent with Amendment A (Fix 8) platform invariant: never trust prompt-level scoping alone.

---

## §3 — Canvas Tabs

### Visual Treatment — Trump Rule First

**Both workers lead with a property photo.** No wall of text, no table as the first thing you see.
The ATTOM property image (or user-uploaded photo) anchors every card. The key numbers are a
2–3 item summary row below it. Everything else unfolds from there.

---

### property-manager-001 Canvas

**Properties tab (default / landing view):**
```
┌─────────────────────────────────────┐
│  [PROPERTY PHOTO]  4821 Skyline Rd  │  ← full-bleed or 16:9 hero image
│  Henderson NV · 3BR/2BA · $2,450/mo │
├──────────┬──────────┬───────────────┤
│ Occupied │ Rent Due │ MX Open       │
│  8 / 10  │  $2,450  │  3 items      │
├──────────┴──────────┴───────────────┤
│  [Ask Alex for help]                │  ← Alex entry point
└─────────────────────────────────────┘
  Unit 1 · Maria Santos · Current ✓
  Unit 2 · David Chen · OVERDUE 12d ⚠
  ...
```

The "Ask Alex for help" button opens the chat pre-prompted with property context so the PM
can say "draft a pay-or-quit notice for Unit 2" without re-explaining the situation.

| Tab | Signal | What renders |
|-----|--------|--------------|
| Properties | `card:pm-portfolio` | Property photo hero + vacancy/rent/MX summary row + unit list + Ask Alex |
| Lease-Up | `card:pm-leaseup` | Applicant pipeline Kanban: inquired → toured → applied → screened → approved |
| Screening | `card:pm-screening` | Screening decision + CAS flags + adverse action notice |
| Maintenance | `card:pm-maintenance` | Work orders by status: open / dispatched / completed; MX spend YTD |
| Evictions | `card:pm-eviction` | Active eviction timelines with countdown to each deadline |
| Compliance | `card:pm-compliance` | RED/YELLOW items requiring PM action; jurisdiction calendar |

---

### tenant-portal-001 Canvas

**Same property photo hero — tenant perspective:**
```
┌─────────────────────────────────────┐
│  [PROPERTY PHOTO]  720 Oasis Blvd   │  ← same visual treatment
│  Unit 4B · Your home                │
├──────────┬──────────┬───────────────┤
│ Rent Due │  Due On  │ Lease Ends    │
│  $1,850  │  Aug 1   │  Dec 31       │
├──────────┴──────────┴───────────────┤
│  [Pay rent]  [Report maintenance]   │  ← two primary CTAs
│  [Ask Alex for help]                │
└─────────────────────────────────────┘
```

"Pay rent" opens an approval card (tenant sees the amount, confirms, then payment initiates).
"Report maintenance" opens a guided intake with urgency selector and photo upload.
"Ask Alex" lets the tenant ask about their lease, submit requests, or escalate.

| Tab | Signal | What renders |
|-----|--------|--------------|
| My Lease | `card:tp-lease` | Property photo hero + lease terms + expiry countdown + amendment history |
| Rent | `card:tp-rent` | Balance due + payment history + Pay-now approval card |
| Maintenance | `card:tp-maintenance` | Submit request form (urgency + photos) + status tracker |
| Messages | `card:tp-messages` | Thread with PM, formal notices |

---

## §4 — Tools

### Operator Mode Tools

| Tool | Description |
|------|-------------|
| `lookup_property` | Pull ATTOM data: APN, AVM (rent benchmarking), sales history, flood/hazard |
| `screen_applicant` | Apply screening criteria with Fair Housing guardrails; output decision + rationale |
| `generate_notice` | Produce state-specific notice (pay-or-quit, cure, entry, renewal); enforce day counts |
| `create_work_order` | Create MX work order: property, issue, urgency, assigned vendor, due date |
| `log_protected_activity` | Record a timestamped, structured event of tenant protected activity (repair complaint filed, Fair Housing complaint filed, tenant organizing activity). Required data source for PM-EV-002 retaliatory eviction guard. |
| `dispatch_vendor` | Send work order to vendor via email/SMS; track acceptance; log response time |
| `log_payment` | Record rent payment to ledger; flag partial payments |
| `anchor_signed_document` | Vault-anchor signed leases, amendments, notices (append-only) |
| `get_rental_comps` | Pull rental comp data for market rent benchmarking (ATTOM rental data) |
| `revoke_tenant_access` | Revoke a tenant's access token for a specific unit. In-flight MX requests are closed with status "tenant-departed"; open message threads are archived read-only. Tenant's personal Vault records (lease, MX history) are unaffected — they were anchored at event time and remain in the tenant's Vault permanently. |
| `sync_hoa_status` | Read-only fetch of hoa-status/v1 bundle from W-037: dues status, open violations, reserve %, next board meeting. Never writes HOA data — W-037 owns it. |

### Tenant Mode Tools

| Tool | Description |
|------|-------------|
| `submit_mx_request` | Create MX request: issue, urgency, photos → routes to PM's inbox |
| `propose_payment` | Draft rent payment for tenant approval → initiates on explicit approve |
| `view_lease` | Retrieve current lease terms and amendment history from Vault |
| `send_message` | Thread message to PM with timestamp and delivery record |
| `track_mx_status` | Check status of any open MX request submitted by this tenant |

---

## §5 — RAAS Rules (The Moat)

### Fair Housing Rules (property-manager-001 — hard blocks)

```
RULE PM-FH-001: PROHIBITED_SCREENING_CRITERIA
  IF screening_criterion IN [race, color, national_origin, religion, sex,
    familial_status, disability]
  THEN block_output, emit CAS:RED, require_override: false
  // These are absolute — no override path exists

RULE PM-FH-002: SOURCE_OF_INCOME_PROTECTION
  IF jurisdiction IN [CA, NV, OR, WA, NY, IL, CO, MA, CT, DC, MD, VT, MN, ND]
  AND screening_criterion == "source_of_income"
  THEN block_output, emit CAS:RED
  // Section 8 vouchers, disability payments, alimony — protected in these states

RULE PM-FH-003: DISPARATE_IMPACT_FLAG
  IF screening_criterion IN [criminal_history, eviction_history, credit_score_below_threshold,
    minimum_income_multiple, employment_type]
  THEN emit CAS:YELLOW, require_individualized_assessment
  // Per HUD 2016 criminal-history guidance: these criteria are permissible but require
  // case-by-case evaluation of nature/severity/recency rather than blanket policy.
  // Static list — expanded as HUD/DOJ guidance evolves. No live statistical computation.

RULE PM-FH-004: ADVERSE_ACTION_NOTICE
  IF screening_decision == "deny" AND credit_report_used == true
  THEN require_adverse_action_notice (FCRA §615)
  // Auto-generates the notice; blocks output until generated
```

### Eviction Rules (state-enforced notice timelines)

```
RULE PM-EV-001: NOTICE_DAY_COUNT
  IF jurisdiction == "NV" THEN pay_or_quit_days = 7 (NRS 40.253, effective 2019)
  IF jurisdiction == "CA" THEN pay_or_quit_days = 3
  IF jurisdiction == "NY" THEN pay_or_quit_days = 14 (HSTPA 2019)
  IF jurisdiction == "TX" THEN pay_or_quit_days = 3
  IF jurisdiction == "FL" THEN pay_or_quit_days = 3
  // Notice letter CANNOT be generated with fewer days than mandated

RULE PM-EV-001b: JURISDICTION_FAIL_CLOSED
  IF jurisdiction NOT IN rules_file
  THEN block generate_notice output,
       emit CAS:RED ("Jurisdiction {state} not yet in rules file — cannot generate compliant notice"),
       require_manual_review
  // generate_notice never defaults or guesses day counts. Unsupported jurisdiction = hard stop.

RULE PM-EV-002: RETALIATORY_EVICTION_GUARD
  IF eviction_notice_date - tenant_protected_activity_date < retaliation_window_days
  THEN emit CAS:RED, block_output, require_manual_review
  // Retaliation windows: NV 60d | CA 180d | NY 90d | WA 90d

RULE PM-EV-003: COMMERCIAL_EVICTION_EXCEPTION
  IF property_type == "commercial"
  THEN skip FH rules, apply contract_terms_only
  // Commercial tenants do not have residential tenant protections
```

### Habitability Rules

```
RULE PM-HAB-001: EMERGENCY_MX_ESCALATION
  IF mx_category IN [no_heat, no_hot_water, sewage_backup, gas_leak,
    electrical_hazard, structural_failure, no_running_water, pest_infestation]
  THEN escalation_required = true, response_window_hours = 24
  // Implied warranty of habitability — all 50 states

RULE PM-HAB-002: RENT_WITHHOLDING_FLAG
  IF open_habitability_mx_age_days > 30
  AND tenant_has_notified_pm_in_writing
  THEN emit CAS:YELLOW ("tenant may assert rent withholding rights — jurisdiction-specific")
```

---

## §6 — Bees in the Hive: Sibling + Spine Connections

Every new worker must know its place in the hive. property-manager-001 is a hub worker —
it takes handoffs from upstream acquisition workers and feeds downstream into accounting,
Vault, and tenant mode.

```yaml
property-manager-001:

  # ── Receives from siblings ──────────────────────────────────────────────────
  accepts:
    - from: site-recon-001
      bundle: parcel-bundle/v1
      use: >
        Property address, APN, zoning classification, flood zone, parcel dimensions.
        Auto-populates the property record on lease-up so PM doesn't re-enter what
        site-recon already pulled.

    - from: title-abstract-001
      bundle: title-abstract/v1
      use: >
        Ownership verification before lease-up. Confirms the landlord has legal
        standing to rent the property (no undisclosed liens or ownership disputes).

    - from: cre-analyst
      bundle: deal-screen/v1
      use: >
        For commercial PM mode: acquisition price, target cap rate, pro forma NOI.
        PM worker opens with these assumptions already in the record.

    - from: feasibility-001
      bundle: feasibility-report/v1
      use: >
        Zoning entitlements, density limits, permitted uses. Relevant when PM is
        leasing a mixed-use or adaptive-reuse property.

    - from: tenant (self — tenant mode)
      bundle: mx-request/v1
      use: Inbound maintenance requests from tenants land in the PM's MX queue.

    - from: accounting (spine)
      bundle: ledger-entry/v1
      use: >
        Reconcile rent payments: accounting spine confirms payment posted;
        property-manager-001 marks ledger current. Source of truth for arrears.

  # ── Sends to siblings ────────────────────────────────────────────────────────
  emits:
    - to: tenant (self — tenant mode)
      bundle: notice-delivery/v1
      trigger: >
        Formal notice generated (entry notice, pay-or-quit, renewal offer).
        Tenant mode shows it with read-receipt timestamp.

    - to: accounting (spine)
      bundle: ledger-entry/v1
      trigger: >
        Rent logged, late fee assessed, security deposit movement.
        Keeps accounting spine current without PM double-entering.

    - to: Vault (DTC)
      bundle: logbook-entry/v1
      trigger: >
        Signed lease anchored, MX event logged, notice delivered.
        Goes into BOTH the operator's property DTC and the tenant's personal Vault.
        Tenant retains their logbook entries forever after move-out.

    - to: law-landuse-001
      bundle: compliance-flag/v1
      trigger: >
        When eviction is initiated or a Fair Housing red flag fires — law worker
        can pull jurisdictional statutes and draft required legal documents.

    - to: re-marketing-001
      bundle: vacancy-notice/v1
      trigger: >
        When a unit is vacated or a non-renewal is confirmed — marketing worker
        auto-drafts a new listing for the vacancy.

  # ── Spine connections ────────────────────────────────────────────────────────
  spine:
    - spine: accounting
      how: rent ledger entries, late fees, security deposit movements, vendor invoices

    - spine: HR (if PM has employees/staff)
      how: vendor W-9 records, 1099 generation for independent contractors

    - spine: Comms
      how: >
        All formal notices delivered via Comms spine (email + SMS), not ad-hoc.
        Delivery timestamp logged for eviction notice defense.
```

---

## §7 — Maintenance: The Hardest Part + Repair Software

MX is where property management falls apart. It involves: tenant urgency (real or perceived),
vendor availability, legal exposure (habitability clock), cost control, and communication
across 3–4 parties simultaneously. Most PMs still do this over text.

### The Full MX Lifecycle

```
Tenant reports issue (tenant mode → MX request)
  → PM triages (emergency / routine / cosmetic / deferred)
  → PM dispatches vendor (work order created, vendor notified via Comms spine)
  → Vendor confirms receipt + provides ETA
  → PM notifies tenant of scheduled window
  → Work completed → vendor closes work order
  → PM reviews + approves (cost vs. quote)
  → Cost logged (accounting spine)
  → Logbook entry appended to property DTC (Vault-anchored)
  → Tenant marks satisfied (optional; logged if not satisfied → escalation path)
```

Every step is timestamped and append-only. The habitability clock (24h for emergencies)
is enforced by RAAS rule PM-HAB-001 — if a step isn't taken in time, the PM gets a
red alert and Alex sends a push.

### Repair Software — Run Alongside, Not Replace

Major repair software platforms the PM may already use:

| Platform | Type | Integration approach |
|----------|------|----------------------|
| **HotSOS** (Duetto) | Commercial/hotel MX ticketing | API: create/read work orders via REST; use for large commercial portfolios |
| **Latchel** | Residential MX coordination + 24/7 triage | Webhook inbound (Latchel calls vendors, SOCIII logs outcomes) |
| **Buildium** | Full PM software (MX module) | REST API: sync work orders bidirectionally |
| **AppFolio** | Full PM software (MX module) | API: pull work orders into SOCIII logbook |
| **ServiceTrade** | Commercial field service | API: dispatch + track vendor work orders |
| **Thumbtack / Angi** | Consumer vendor marketplace | No API; Alex can suggest + link, PM books manually |

**Integration strategy (v1):** SOCIII is the system of record for the logbook and compliance
clock. If the PM uses HotSOS or Buildium for dispatching, SOCIII pulls the outcome via
webhook or polling and appends it to the Vault logbook. The PM doesn't abandon their
existing vendor relationships — SOCIII sits above and ensures everything is documented.
Tight API integrations (Latchel, Buildium, AppFolio) are v2 connectors.

### HOA Management — Connects to W-037 (Standalone HOA Worker)

W-037 (HOA & Association) already exists as a fully-specced standalone worker: assessments,
CC&R compliance, violation workflow, reserve studies, board meeting support, financial reporting.
`property-manager-001` does NOT duplicate that. Instead it:

1. Passes HOA-relevant property context to W-037 (APN, unit ID, CC&Rs on file)
2. Receives violation notices from W-037 and forwards them to the tenant in tenant mode as a courtesy — clearly framed as the owner's compliance obligation, not the tenant's. The tenant is informed for remediation awareness (e.g., a noise complaint the tenant can cure), not held legally responsible for the HOA fine.
3. Pulls reserve fund status from W-037 for the compliance dashboard
4. Alerts Alex when an HOA action requires PM attention (e.g. special assessment, lien risk)

The connector for property-manager-001 → W-037 is `bundle: hoa-status/v1`.

**For the tenant (tenant mode) — HOA-relevant view:**
- Open violations on their unit with remediation steps (pulled from W-037)
- HOA rules that apply to their unit (pets, parking, modifications)
- Submit HOA-related questions (routed to PM, not directly to board)

Full member voting, ballot management, and community polling live in W-037 — see that spec for the complete implementation. property-manager-001 connects via the hoa-status/v1 bundle.

## §8 — Jurisdiction Table (Starter — expand in RAAS rules file)

| State | Pay-or-Quit | Security Dep Cap | SOI Protected | Retaliation Window |
|-------|-------------|-----------------|---------------|-------------------|
| NV | 7 days | 3× monthly rent | Yes | 60 days |
| CA | 3 days | 2× (unfurn) / 3× (furn) | Yes | 180 days |
| NY | 14 days | 1× monthly (2019+) | Yes | 90 days |
| TX | 3 days | No cap (reasonable) | No | 6 months |
| FL | 3 days | No cap | No | Not codified |
| WA | 14 days (2021+) | No cap | Yes | 90 days |
| OR | 10 days | 1.5× monthly rent | Yes (2014) | 90 days |
| CO | 10 days | 2× monthly rent | Yes | 90 days |
| IL | 5 days (Cook Co.) | No statewide cap | Yes (Chicago) | Varies |

---

## §9 — Build Priority

Per the vet model sequence (Vault → Spine → Creator → Portal):

1. **`property-manager-001` backend tools** — `screen_applicant`, `generate_notice`, `create_work_order`, `log_payment`; RAAS rules PM-FH-001..004 + PM-EV-001..003 + PM-HAB-001..002
2. **`property-manager-001` canvas** — `card:pm-portfolio` + `card:pm-maintenance` (highest demo value); `card:pm-leaseup` + `card:pm-screening` + `card:pm-eviction` + `card:pm-compliance`
3. **HOA connector (`sync_hoa_status`)** — wire before `card:pm-compliance` which reads it. Wire name: `bundle: hoa-status/v1`; Vault key written by W-037: `hoa_status` (no hyphen, underscore — different formats, same data). Refresh cadence: W-037 writes to Vault on every status change; `sync_hoa_status` reads latest record on canvas load — staleness is bounded by W-037's write frequency, no polling needed.
4. **Seed demo data** — 3–5 units for DEMO SPACE: 2 occupied (one with open MX, one renewal-due), 1 vacant (in lease-up), 1 past-due tenant (eviction pending)
5. **Tenant mode canvas** — `card:tp-rent` + `card:tp-maintenance` first; lease + messages follow
6. **State RAAS rules file** — `raas/real-estate/GLOBAL/rules/property-manager-rules.json` — 10-state jurisdiction table, Fair Housing blocks, eviction timelines

---

## §10 — Open Decisions (Resolve Before Build)

1. **Commercial/residential toggle:** Per-workspace setting, or per-property record? (Recommend: per-property — a PM may manage both types)
2. **Screening criteria source:** PM enters criteria once at setup, or per listing? (Recommend: workspace-level defaults with per-listing overrides)
3. **Payment processor:** Route through Stripe (already integrated) or link to PM's existing processor (AppFolio, Buildium, Rent Manager)? (Recommend: Stripe for first build; integration connectors later)
4. **Tenant portal distribution:** Tenant gets a separate SOCIII login, or PM sends them a magic-link per unit? (Recommend: magic-link per unit for fast adoption; SOCIII account optional)
5. **Commercial eviction scope:** Commercial unlawful detainer is far more variable (lease governs). Include in v1 or gate behind commercial add-on?
6. **Tenant-mode pricing:** Included in the PM's subscription or $5–10/tenant/mo add-on? Resolving this determines the CODEX-22 graduation math (a PM with 300 units at full tenant adoption = real seat counts). Also determines whether this ships as part of re-in-a-box or as a separate SKU with its own pricing tier.
7. **Unit owner access model:** In the common three-party structure (unit owner → PM company → renting tenant), the owner is the HOA member — not the PM and not the renter. Today, USAGE PATHS handles the two-party cases: board/member in W-037, PM/tenant in property-manager-001. The unanswered case: an owner who hired a PM and wants visibility into the HOA relationship their PM is managing on their behalf. Today that owner has no defined access path — they're not the "operator" (that's the PM), and they're not the "tenant" (that's the renter). Options: (a) owner gets their own W-037 member-mode account separately; (b) PM can grant delegated read-only access to the owner; (c) defer until a PM customer raises it. Recommend option (a) as the simplest — the owner IS a W-037 member by definition, regardless of whether they hired a PM. This is a product question, not a wording issue.
8. **W-037 auto-provisioning:** W-037's USAGE PATHS describes property-manager-001 "auto-provisioning W-037 as a required dependency." This mechanism does not exist yet — the platform only supports flat bundles (`BUNDLES` constant), not worker-to-worker dependency graphs. Auto-provisioning is a v2 build item. In v1, both workers must be subscribed independently (both are in re-in-a-box, so subscribing to re-in-a-box gives you both). The billing question — when W-037 is eventually auto-provisioned as a dependency, is it free (included in PM's subscription) or separately metered? — must be resolved before that feature ships.

---

## §11 — Competitive Position

This is not property management software. It is a compliance-enforcing, jurisdiction-aware
operating system for property managers — built on the same append-only records substrate that
handles DEA registrations for vets and chain-of-title for real estate attorneys.

The PM's liability is not remembering rent is due. The PM's liability is:
- Missing a notice deadline and restarting a 45-day eviction process
- Using a screening criterion that violates Fair Housing and triggering a HUD complaint
- Failing to respond to a habitability issue and having the tenant assert rent withholding

SOCIII catches all three before the PM makes the mistake. That is the product.

See also: [[learning-record-substrate]] (same append-only logbook model), [[esign-architecture-google-plus-anchor]] (lease signing rail), [[worker-taxonomy-vertical-bundles]] (RE in a Box)
