# SITE RECON
## Digital Worker Specification
**SITE-RECON-001 | SOCIII Platform | v1.1 | June 2026**

*Changes from v1.0: applied review corrections + added Section 6 "Visual Guidance & Geographic Context" with maps, Street View, and YouTube discovery. Numbering of downstream sections shifted accordingly.*

---

> *"Site Recon turns a real estate operator's vague hunch into a ranked list of underwriteable opportunities backed by historical title + sales + assessor data, with a feasibility verdict on each — done in under two minutes per parcel and chain-anchored so the analyst can defend the recommendation three years later."*

---

## 1. Intent

### Purpose

Site Recon is the data substrate that every other SOCIII real estate Digital Worker consumes. It converts a real estate operator's starting hunch — a neighborhood, a parcel, a zip code — into a bounded, ranked list of underwriteable opportunities. Each opportunity carries a feasibility verdict and a full audit anchor so the analyst can defend the recommendation in a deposition, a partnership meeting, or a regulatory review three years later.

The economic case is simple: traditional pursuit funds cost $250,000–$500,000 for major development and $50,000–$100,000 for a duplex. Site Recon delivers the same signal for hundreds of dollars. That is a 100– to 1,000–fold cost compression. That is the pitch.

### Why visual context is load-bearing, not decorative

"Location location location" is a motto, but it describes things charts cannot capture: sun direction, view obstructions, what's across the street, what the block actually feels like. A south-facing parcel with morning light is a different asset than the north-facing parcel next door — the data tables won't tell you that. A unit looking at a power plant or a freeway sound wall is worth less than the unit two doors down; the data tables won't tell you that either.

ATTOM's own data anomalies prove the point. A condo on floor 4 and the same floor plan on floor 25 will show wildly different sale prices. To a chart, those are noise. To anyone who looks at Street View or aerial imagery for thirty seconds, the difference is the view — and the price gap is suddenly fully explained.

Site Recon therefore treats visual context as a primary data product, not a UI decoration. Street View, satellite imagery, sun-direction analysis, and YouTube neighborhood video are pulled and rendered alongside the data tables so the operator can read both layers together. When the numbers and the visuals disagree, Site Recon surfaces the disagreement explicitly — that's the highest-value signal it produces.

### Scope

- Pull and rank parcels from a defined search area using ATTOM data
- Return a feasibility verdict (Green / Yellow / Red) with a named blocker per parcel
- Surface row-level underwriting cost before the user commits to a deeper pull
- **Render every result with geographic context — maps, Street View, satellite imagery, overlay flags** *(new in v1.1)*
- **Surface relevant YouTube videos of the area for visual neighborhood context** *(new in v1.1)*
- Anchor every pull to the audit trail (PLAT-008) per the Deposition Rule
- Hand off ranked opportunities to W-002 Real Estate Analyst with one click
- Record every pull as a logbook entry in Vault DTC
- Gate every data spend with a cost projection before execution

### What Site Recon Is NOT

- Not a brokerage tool. It does not facilitate offers, negotiations, or transactions.
- Not a Zillow replacement. It is not a consumer property search product.
- Not a valuation service. AVM data from ATTOM is one input to feasibility scoring, not a certified appraisal.
- Not a zoning attorney or permit expediter. Zoning and permit analysis are handled by dedicated workers (v2 — Site Recon uses placeholder blockers in v1).
- Not a replacement for due diligence. Site Recon produces a ranked shortlist and a feasibility signal. Full underwriting is done by W-002.

---

## 2. Capabilities

The bounded set of things Site Recon can do, stated as observable outputs.

| Capability | Description |
|---|---|
| **Parcel Search** | Accept a geographic input (address, APN, zip, lat/long, polygon) and return a ranked list of up to 50 parcels. Default list size is 10. Cost projection shown before any data pull executes. |
| **ATTOM Data Pull** | Pull assessor/tax detail, sales history, deed transfers, title chain, AVM valuation, foreclosure status, and neighborhood/market stats for each parcel in the list. |
| **Feasibility Verdict** | Score each parcel Green, Yellow, or Red. Attach a plain-language named blocker for any non-Green verdict. Blocker categories are drawn from the 12 locked failure mode categories. |
| **Cost Transparency** | Show estimated data fee for each next action before it executes. Show session roll-up at session end. Markup breakdown shown on hover: `[ATTOM cost] + [SOCIII markup] = [user fee]`. Running spend counter visible at all times. |
| **Audit Anchoring** | Write pull-receipt to PLAT-008 Audit Trail for every data pull. Classify each receipt under the Deposition Rule (individual-anchored vs. batched). Log every pull as a parcel logbook entry in Vault DTC. |
| **W-002 Handoff** | One-click promotion of any ranked parcel to W-002 Real Estate Analyst for full underwriting. Passes parcel ID, all pulled ATTOM data, feasibility verdict, audit anchor reference. Confirmation modal shown with handoff summary. |
| **Persona-Adaptive UX** | Detect user persona at onboarding (First-Timer / Active Operator / Veteran). Adjust information density, guidance level, and export options. Per-session persona override available via session header. |
| **Canvas Display** | Render results across three tabs: Historical, Opportunities, Feasibility — each with map + table + visual context per Section 6. |
| **Map Rendering** *(new)* | Embed interactive Google Maps with parcel polygon, search radius, comparable sale pins, and toggleable overlay layers (coastal commission, historic district, flood zone, opportunity zone). |
| **Street View Integration** *(new)* | Embed Google Street View at parcel address. Falls back to satellite-only view with named badge if Street View unavailable. |
| **YouTube Discovery** *(new)* | Pull top 3 relevant videos of the area via YouTube Data API v3. Filtered by relevance score (duration ≥ 60s, view count ≥ 100, uploaded within last 36 months). |
| **Visual Overlay Layers** *(new)* | Coastal commission / historic district / flood zone (via FEMA) / opportunity zone rendered as toggleable map polygon layers. |
| **Sun + View Analysis** *(new)* | For each parcel, compute parcel orientation (cardinal direction of primary facade) and estimated sun exposure (morning / afternoon / all-day / shadow). Render alongside Street View. |
| **Floor-Level View Differentiation** *(new — for condos/multi-unit)* | When ATTOM data shows price variance among same-floorplan units in a stack, render a unit-stack diagram with per-floor Street View or aerial imagery so the operator can see what each floor actually looks at. Explicitly labels the "this is a view premium" thesis. |
| **Visual-Data Disagreement Detection** *(new)* | When ATTOM data implies a comparable but the visual context (sun, view, surroundings) contradicts the comparable, surface the disagreement explicitly. e.g., "These two units sold for the same price but unit B faces a power substation — verify before relying on the comp." |

---

## 3. Rules

Invariants the worker must never violate. Plain English here; the RAAS Tier 4 YAML block follows.

### Plain-English Invariants

- **RULE-01:** Never execute a data pull without first showing the user the cost projection and receiving explicit confirmation.
- **RULE-02:** Never auto-promote a First-Timer persona to Veteran without explicit user-initiated upgrade.
- **RULE-03:** Every data pull must produce a pull-receipt anchored to PLAT-008. No receipt = no pull.
- **RULE-04:** A feasibility verdict of Green requires clean title chain, fresh assessor data, fresh AVM, no APN retirement, and no active coastal-commission or historic-district overlay.
- **RULE-05:** Stale assessor data (older than 6 months) must trigger a staleness warning. The parcel may appear in the ranked list but must not receive a Green verdict.
- **RULE-06:** An owner-of-record mismatch must flag the parcel Yellow and surface the mismatch as the named blocker. It does not block the parcel from the list.
- **RULE-07:** An APN retirement must surface as a named blocker in the Feasibility tab. A retired APN parcel must be removed from the ranked opportunity list.
- **RULE-08:** The ranked list is capped at 50 parcels per session. Default is 10. User may expand to ≤50 but must confirm cost projection before expansion executes.
- **RULE-09:** The worker must never state that a parcel is a good investment. It states feasibility signals and named blockers. Investment judgment belongs to the operator.
- **RULE-10:** Cross-worker calls to W-002, PLAT-008, Vault DTC, Zoning/Entitlement, and Permit Processor must time out gracefully. A timeout surfaces as a named blocker, not a silent failure.
- **RULE-11** *(new)*: Input validation — reject fictional ZIPs, malformed APNs, search radii > 5 miles, and polygon inputs that exceed 10 sq mi. Surface a clear, specific input-error message.
- **RULE-12** *(new)*: Fair Housing — Site Recon must not respond to search patterns that suggest redlining, steering, or any pattern correlated with protected-class avoidance. RAAS Tier 2 baseline (Fair Housing module) governs. Surface a regulatory note + decline to execute.
- **RULE-13** *(new)*: AVM freshness — AVM data older than 30 days must trigger a staleness warning. Verdict capped at Yellow when AVM is stale (separate threshold from RULE-05 assessor data).
- **RULE-14** *(new)*: Every parcel result must include a map marker. The Opportunities tab must render results on a map alongside the table. No table-only views in v1.
- **RULE-15** *(new)*: YouTube video discovery is capped at top 3 results per parcel. Results filtered: duration > 60s, view count > 100, uploaded within last 36 months. If fewer than 3 qualify, show the qualifying count.
- **RULE-16** *(new — visual-data disagreement)*: When ATTOM data shows price variance among same-floorplan units in the same building/stack (variance > 15%), Site Recon must render the unit stack with per-floor view imagery and surface "view premium suspected" as a named caveat on each affected unit. Never silently treat divergent comps as equivalent.
- **RULE-17** *(new — sun + view first)*: For every parcel result, Street View + satellite imagery must be pulled and rendered before any feasibility verdict is shown. The operator must have the option to see the parcel before reading the verdict. This is non-negotiable because it changes which verdicts a human will trust.

### RAAS Tier 4 YAML

```yaml
rules:
  - id: RULE-01
    label: cost_gate
    trigger: any_data_pull
    assertion: cost_projection_confirmed == true
    on_fail: block_pull, show_cost_modal
  - id: RULE-02
    label: persona_lock
    trigger: persona_upgrade_attempt
    assertion: user_explicit_upgrade_request == true
    on_fail: retain_current_persona
  - id: RULE-03
    label: audit_anchor_required
    trigger: any_data_pull
    assertion: pull_receipt_written_to_PLAT008 == true
    on_fail: rollback_pull, surface_error
  - id: RULE-04
    label: green_verdict_conditions
    trigger: feasibility_scoring
    assertion: title_chain_clean AND assessor_data_fresh AND avm_fresh AND apn_active AND no_overlay
    on_fail: verdict = YELLOW or RED, attach_named_blocker
  - id: RULE-05
    label: stale_assessor_data
    trigger: assessor_data_age_check
    assertion: assessor_data_age_days <= 180
    on_fail: staleness_warning, max_verdict = YELLOW
  - id: RULE-06
    label: owner_mismatch_flag
    trigger: owner_of_record_check
    assertion: owner_record_consistent == true
    on_fail: verdict = YELLOW, blocker = OWNER_MISMATCH, retain_in_list
  - id: RULE-07
    label: apn_retirement
    trigger: apn_status_check
    assertion: apn_active == true
    on_fail: remove_from_ranked_list, blocker = APN_RETIRED
  - id: RULE-08
    label: list_cap
    trigger: parcel_list_generation
    assertion: parcel_count <= 50
    on_fail: truncate_at_50, confirm_expansion_cost
  - id: RULE-09
    label: no_investment_advice
    trigger: any_output_generation
    assertion: output_contains_investment_recommendation == false
    on_fail: strip_recommendation, surface_feasibility_signal_only
  - id: RULE-10
    label: cross_worker_timeout
    trigger: cross_worker_call
    assertion: response_received_within_timeout
    on_fail: surface_named_blocker = CROSS_WORKER_TIMEOUT
  - id: RULE-11
    label: input_validation
    trigger: parcel_search_input
    assertion: input_well_formed AND search_radius_within_limits AND polygon_area_within_limits
    on_fail: refuse_search, surface_specific_error
  - id: RULE-12
    label: fair_housing_pattern
    trigger: parcel_search_input
    assertion: no_protected_class_avoidance_pattern_detected
    on_fail: refuse_search, surface_fair_housing_regulatory_note
  - id: RULE-13
    label: avm_freshness
    trigger: avm_age_check
    assertion: avm_age_days <= 30
    on_fail: staleness_warning, max_verdict = YELLOW
  - id: RULE-14
    label: map_required
    trigger: opportunities_tab_render
    assertion: map_marker_layer_rendered == true
    on_fail: block_tab_render, surface_error
  - id: RULE-15
    label: youtube_discovery_cap
    trigger: youtube_search
    assertion: results_count <= 3 AND each_result_meets_filter
    on_fail: truncate_to_3, drop_results_below_filter
  - id: RULE-16
    label: view_premium_detection
    trigger: comparable_sales_analysis
    assertion: same_floorplan_price_variance_percent <= 15 OR view_premium_caveat_attached == true
    on_fail: attach_caveat = VIEW_PREMIUM_SUSPECTED, render_unit_stack_imagery
  - id: RULE-17
    label: visual_before_verdict
    trigger: feasibility_verdict_render
    assertion: street_view_or_satellite_rendered_for_parcel == true
    on_fail: block_verdict_render, pull_imagery_first
```

---

## 4. Sample Data

### Example: Oakland Infill Parcel — End-to-End Flow

The following walks through a complete Site Recon session using a real Oakland, CA parcel. This is the SAMPLE chip displayed in the Canvas to orient new users.

### Input

| Field | Value |
|---|---|
| Address | 3241 Market Street, Oakland, CA 94608 |
| APN | 013-0921-007-00 |
| Search Radius | 0.5 miles |
| List Size | 10 parcels (default) |
| Estimated Pull Cost | $4.20 *(ESTIMATE PENDING ATTOM tier confirmation)* |

### Ranked Opportunity List Output

| # | Address / APN | Last Sale | Assessed | Verdict | Named Blocker |
|---|---|---|---|---|---|
| 1 | 3241 Market St (013-0921-007) | $410K / 2019 | $388K | 🟢 GREEN | — |
| 2 | 3255 Market St (013-0921-008) | $375K / 2021 | $340K | 🟡 YELLOW | Owner mismatch |
| 3 | 3198 Market St (013-0920-044) | $290K / 2016 | $275K | 🟡 YELLOW | Stale data (8 mo) |
| 4 | 831 32nd St (013-0921-002) | Off-market | $190K | 🔴 RED | APN retired (removed from list) |
| 5 | 3270 Market St (013-0922-001) | $520K / 2023 | $498K | 🟢 GREEN | — |
| 6–10 | (additional parcels) | — | — | Mixed | Cost to expand: +$1.80 |

### Session Roll-Up

| Metric | Value |
|---|---|
| Total Data Spend | $4.20 |
| ATTOM cost / SOCIII markup | $2.10 / $2.10 |
| Parcels Reviewed | 5 (of 10 returned) |
| Green Verdicts | 2 |
| Yellow Verdicts | 2 |
| Red Verdicts | 1 (removed from list) |
| Pursuit Fund Baseline | $50,000 (duplex tier) |
| **Cost Compression** | **11,900×** |
| Pull Receipt | `PLAT-008-20260605-Oakland-013-0921` [anchored] |

### Cost Comparison

| Method | Cost | Time |
|---|---|---|
| Traditional pursuit fund (duplex) | $50,000–$100,000 | 4–8 weeks |
| Traditional pursuit fund (major dev) | $250,000–$500,000 | 8–16 weeks |
| **Site Recon (this session)** | **$4.20** | **Under 2 minutes** |

---

## 5. Canvas Tabs

Site Recon renders results across three tabs. Each tab is described with its structured content + visual context + SAMPLE chip behavior.

### Tab 1: Historical

**Content:**
- Title chain (ownership history, deed transfers, encumbrances)
- Assessor history (assessed value by year, tax status, exemptions)
- Prior sales (date, price, buyer/seller, instrument type)
- Staleness flag (orange badge if assessor data > 6 months OR AVM > 30 days)

**Visual context:**
- Parcel boundary rendered on Google Maps satellite view
- Pin markers for each prior sale/deed transfer event with date label
- Street View embed at the parcel address (fallback to satellite-only badge if unavailable)
- Deed transfer chain visualized as a horizontal timeline beneath the map

**SAMPLE chip:** Pre-populated with the Oakland Market Street parcel (APN 013-0921-007). Shows a 5-year ownership history with one deed transfer flagged for review. Map shows parcel boundary, Street View embed shows the actual building.

### Tab 2: Opportunities

**Content:**
- Ranked list of parcels (10 default, up to 50)
- Per-row: address, APN, last sale price/date, assessed value, feasibility verdict badge (Green/Yellow/Red), named blocker
- Per-row: **cost-to-go-deeper button** — opens additional ATTOM data products (title chain depth, mortgage history, prior owners) at marginal cost. Shows cost projection before executing.
- One-click W-002 handoff button on any Green or Yellow row
- Session roll-up bar at bottom: total spend, ATTOM/SOCIII split, parcels reviewed, Green count, cost compression vs. pursuit fund

**Visual context (per RULE-14 — map is required, not optional):**
- Interactive Google Maps with all ranked parcels rendered as color-coded markers (Green/Yellow/Red matching verdict)
- Marker hover shows mini-card: address + verdict + named blocker
- Toggle: **List view ↔ Map view ↔ Split view** (split is default for Active Operator + Veteran personas; List default for First-Timer)
- Search radius rendered as a circle on the map
- Optional heatmap layer toggle (market activity density)

**SAMPLE chip:** Shows the full 5-row Oakland ranked list. Map shows all 5 parcels color-coded on satellite imagery within the 0.5 mile radius.

### Tab 3: Feasibility

**Content:**
- Detailed view for a single selected parcel
- Verdict card (Green/Yellow/Red) with named blocker in plain English
- Underwriting inputs: AVM estimate, assessed value delta, last sale price delta, days since last transfer
- Overlay flags: coastal commission jurisdiction, historic district, flood zone, opportunity zone
- Action buttons: Go Deeper (RULE-01 cost gate), Handoff to W-002 (with confirmation modal), Save to Vault

**Visual context:**
- Parcel-specific map with overlay flags rendered as toggleable polygon layers (orange = coastal commission, purple = historic district, blue = FEMA flood zone, green = opportunity zone)
- Street View embed of the parcel
- Comparable sales (within 0.5 mi radius) rendered as map pins with hover-revealing price + date
- **YouTube panel:** Top 3 videos of the area — neighborhood walks, real estate tours, news clips. Filtered per RULE-15. Each video shown as embedded thumbnail with title + uploader + view count + duration.

**SAMPLE chip:** Shows the Green verdict detail for 3241 Market Street. Clean title chain, AVM $415K vs. assessed $388K, last transfer 2019. No overlays. YouTube panel shows 3 sample Oakland neighborhood videos.

---

## 6. Visual Guidance & Geographic Context *(new in v1.1)*

Site Recon's UX principle: **every parcel result carries geographic + visual context, not just rows in a table.** This is enforced by RULE-14 (map required) and the per-tab visual specifications in Section 5.

### Map Stack

| Layer | Source | Purpose |
|---|---|---|
| Base map (street, satellite, terrain) | Google Maps API | Default visual context |
| Parcel boundary polygon | Google Maps + ATTOM parcel geometry | Show exact parcel footprint |
| Marker layer (ranked parcels) | Google Maps + ATTOM list result | Color-coded by verdict |
| Street View | Google Maps Street View API | Ground-level view of parcel |
| Coastal Commission overlay | CA Coastal Commission GIS (public) | Jurisdiction polygon, orange line |
| Historic District overlay | Per-jurisdiction GIS (public) | District polygon, purple |
| Flood Zone overlay | FEMA Flood Map Service Center API (public) | FIRM flood zones, blue polygon |
| Opportunity Zone overlay | IRS Opportunity Zone GIS (public) | OZ polygon, green |
| Comparable sales pins | ATTOM sales data + Google Maps | Hover-revealed market context |

### YouTube Discovery

| Aspect | Spec |
|---|---|
| API | YouTube Data API v3 (free tier, generous quota) |
| Search query template | `"<address>" OR "<neighborhood name>" Oakland` (or appropriate jurisdiction) |
| Filter (RULE-15) | duration > 60s, view count > 100, uploaded within last 36 months |
| Result cap | top 3 by relevance score |
| Display | Embedded thumbnail with title, uploader, view count, duration |
| Fallback | If fewer than 3 qualify, show the qualifying count; if zero, show "no qualifying videos for this area" |

### Persona-Adaptive Visual Density

| Persona | Map Default | Table Default | YouTube Panel |
|---|---|---|---|
| First-Timer | Visible, with tooltips and education layers | Compact, with inline explainers | Always shown |
| Active Operator | Visible, no tooltips by default | Standard | Always shown |
| Veteran | Compact (toggleable to full) | Dense data prioritized | Collapsed by default; expandable |

---

## 7. Cross-Worker Dependencies

### Workers Site Recon Reads From

| Worker / System | ID | What Site Recon Reads | v1 Status |
|---|---|---|---|
| ATTOM Data API | External | Assessor/tax, sales history, deed transfers, title chain, AVM, foreclosure status, neighborhood stats | LIVE (ESTIMATE PENDING tier) |
| Google Maps API | External | Base map, parcel geometry, Street View | LIVE |
| YouTube Data API v3 | External | Area video discovery | LIVE |
| FEMA Flood Map API | External | Flood zone overlays | LIVE |
| CA Coastal Commission GIS | External | Coastal jurisdiction overlay | LIVE |
| Zoning/Entitlement Worker | (Permit Processors team) | Zoning classification, entitlement status | **v2 planned; v1 uses placeholder blocker `ZONING_UNAVAILABLE`** |
| Permit Processor | (Permit Processors team) | Active permit flags, jurisdiction overlay detection | **v2 planned; v1 uses placeholder blocker `PERMIT_UNAVAILABLE`** |
| Parcel Atlas | ESC-013 | Pre-anchored jurisdiction data | **Future-state only — not a v1 dependency** |

### Workers That Read From Site Recon

| Worker / System | ID | What They Read |
|---|---|---|
| Real Estate Analyst | W-002 | Full ATTOM data package, feasibility verdict, named blocker, audit anchor reference. Triggered via one-click handoff. |
| Audit Trail | PLAT-008 | Pull-receipt for every data pull. Deposition-Rule classification attached. |
| Vault DTC | DTC | Parcel logbook entry for every pull. Includes parcel ID, pull timestamp, data products, cost, verdict. |
| Economist team (W-002 enhanced) | W-002 | Neighborhood + market stats layer. Site Recon is the data substrate. *(Market analysis is the W-002 enhancement — currently a gap.)* |
| Asset Management team | future-state | Historical title + assessor data for ongoing asset monitoring. *(Post-MVP — team worker not yet built.)* |

---

## 8. Audit Anchor Pattern

The Deposition Rule governs how Site Recon classifies and anchors every data pull. The goal: an analyst must be able to retrieve the exact data returned in any prior pull and defend it in a legal or regulatory proceeding.

### Individual-Anchored Pulls

Any pull against a single identified parcel (by APN or address) is classified as individual-anchored. The pull-receipt is written to PLAT-008 with the parcel APN as the primary key.

- **Trigger:** user selects a specific parcel for deep pull or W-002 handoff
- **Receipt fields:** `pull_id`, `timestamp`, `parcel_id` (APN), `data_products[]`, `cost_usd`, `verdict`, `named_blocker`, `user_id`, `session_id`, `map_assets[]` *(map snapshot + Street View image URLs)*
- **Deposition-Rule classification:** `INDIVIDUAL`
- **Vault DTC entry:** written immediately on pull completion

### Batched Pulls

A ranked-list generation pull (area search returning multiple parcels) is classified as batched. A single batch receipt is written to PLAT-008 with the session as the primary key and a parcel manifest attached.

- **Trigger:** user submits a geographic search and confirms the cost gate
- **Receipt fields:** `batch_id`, `timestamp`, `search_parameters{}`, `parcel_manifest[]`, `total_cost_usd`, `session_id`, `user_id`, `map_assets[]`
- **Deposition-Rule classification:** `BATCH`
- **Vault DTC entries:** one entry per parcel in the manifest, written on batch completion

### Pull-Receipt Format

```yaml
pull_receipt:
  pull_id: PLAT-008-20260605-Oakland-013-0921-007
  classification: INDIVIDUAL
  timestamp: 2026-06-05T14:32:11Z
  parcel_id: 013-0921-007-00
  jurisdiction: Oakland, CA
  data_products:
    - assessor_detail
    - sales_history
    - title_chain
    - avm_valuation
  cost_breakdown:
    attom_cost_usd: 0.42
    sociii_markup_usd: 0.42
    user_paid_usd: 0.84
  verdict: GREEN
  named_blocker: null
  map_assets:
    - satellite_snapshot_url
    - street_view_snapshot_url
    - overlay_layer_state
  youtube_results: []
  user_id: usr_abc123
  session_id: sess_xyz789
  chain_anchor: [hash reference]
```

---

## 9. Pricing

| Component | Spec |
|---|---|
| Monthly Subscription | $29/month per user. Covers Site Recon access and session tooling. Does not include data pull costs. |
| Data Pull Fees | Pass-through of ATTOM API cost + compute cost, with 100% markup applied by SOCIII platform. User sees final fee (cost + markup) before any pull executes. |
| Markup Split | Of the 100% markup: 20% to Site Recon creator, 80% retained by SOCIII platform. |
| Cost Gate | **Non-negotiable.** Every pull shows projected cost and requires explicit user confirmation before execution. No exceptions. |
| Cost Transparency | Row-level cost shown in the Opportunities tab. Session roll-up shown at session end. Markup breakdown on hover: `[ATTOM cost] + [SOCIII markup] = [user fee]`. Running spend counter visible in the session header at all times. |
| Example Pull Cost | A 10-parcel Oakland area search pulling assessor + sales history + AVM: approximately $4.20 total to user *(ESTIMATE PENDING ATTOM tier confirmation)*. Creator share: ~$0.42. |
| Map/YouTube costs | Google Maps + YouTube Data API are free at expected volumes. No pass-through fee. |
| Session resume | If a user closes mid-session, in-progress ranked list persists for 24 hours under the same session ID. Audit anchors persist permanently. |

---

## 10. Persona Detection

Persona is detected at onboarding via four questions. The detected persona controls information density, guidance level, and export behavior throughout the session. Persona is never silently upgraded.

### Onboarding Questions

| # | Signal | Question | Weight |
|---|---|---|---|
| 1 | Deals closed | How many real estate deals have you closed as a principal? [0 / 1–10 / 11–50 / 50+] | **Heaviest (drives initial placement)** |
| 2 | Role | What best describes your role? [Investor, Developer, Agent/Broker, Other] | Medium |
| 3 | Deal size | What is your typical deal size and asset class? | Light (does NOT drive tier — 50 small deals = Veteran, not First-Timer) |
| 4 | Deal source | How do you typically find opportunities? [Gut/network / Market data / Both] | Light |

### Persona Placement Logic *(corrected from v1.0 — deals closed is the heaviest signal)*

| Persona | Trigger | UX Behavior |
|---|---|---|
| **First-Timer** | 0 deals closed (regardless of role or deal size) | Education-forward. Inline explainers on every term. Step-by-step cost gate with plain-English breakdown. No dense data exports. Encourages W-002 handoff before action. Map + YouTube panels always visible. |
| **Active Operator** | 1–50 deals closed | Standard UX. Inline help available but not pushed. Full Canvas tab access. Row-level cost shown without extra explanation. W-002 handoff available. Map + YouTube visible by default. |
| **Veteran Developer** | 50+ deals closed | Dense data mode. Minimal UI chrome. Raw export (CSV/JSON) prioritized over visual flourishes. Batch operations enabled. Cost gate is single-click confirm. Map compact (toggleable to full); YouTube collapsed by default. |

### Per-Session Override

User may toggle persona mode per-session via session header. A Veteran working a tricky deal can switch to First-Timer mode for that session. Default at next session = last upgrade choice from Settings.

### Upgrade Rule

A user may self-upgrade their persona at any time from Settings. Site Recon will never auto-upgrade based on observed behavior. A First-Timer who runs 20 sessions stays a First-Timer until they explicitly upgrade.

### Veteran Export Schema (CSV / JSON)

```
parcel_id, address, jurisdiction, last_sale_date, last_sale_price,
assessed_value, avm_estimate, avm_date, verdict, named_blocker,
data_products_pulled, pull_cost_usd, pull_id, audit_anchor_ref,
map_snapshot_url, street_view_url, comparable_sales_count,
youtube_results_count, overlay_flags
```

---

## 11. QA-001 Assertions

Test cases that verify Site Recon works as specified. Each assertion has a pass condition and a referenced rule.

| ID | Test Case | Pass Condition | Rule Ref | Priority |
|---|---|---|---|---|
| QA-001 | Cost gate blocks pull without confirmation | Pull does not execute; cost modal shown | RULE-01 | P0 |
| QA-002 | Cost gate passes with confirmation | Pull executes; pull-receipt written to PLAT-008 | RULE-01, RULE-03 | P0 |
| QA-003 | Assessor data older than 6 months | Staleness warning badge shown; verdict capped at Yellow | RULE-05 | P0 |
| QA-004 | Assessor + AVM both fresh, clean chain | Green verdict returned; no blocker | RULE-04 | P0 |
| QA-005 | Owner-of-record mismatch detected | Yellow verdict; blocker = OWNER_MISMATCH; retained in list | RULE-06 | P0 |
| QA-006 | APN retirement detected | Parcel removed from ranked list; Feasibility shows blocker = APN_RETIRED | RULE-07 | P0 |
| QA-007 | List size exceeds 50 | List truncated at 50; user notified | RULE-08 | P0 |
| QA-008 | First-Timer persona onboarded (0 deals) | Education-forward UX rendered; dense export not offered | Section 10 | P1 |
| QA-009 | Veteran persona onboarded (50+ deals) | Dense data mode; CSV/JSON export offered; cost gate single-click | Section 10 | P1 |
| QA-010 | Auto-upgrade attempt (system-initiated) | Persona not changed; user remains in original tier | RULE-02 | P0 |
| QA-011 | W-002 handoff on Green parcel | Parcel ID, ATTOM data, verdict, audit anchor passed to W-002; confirmation modal shown | Section 7 | P1 |
| QA-012 | Cross-worker call timeout (W-002 unavailable) | Named blocker = CROSS_WORKER_TIMEOUT; silent failure does not occur | RULE-10 | P0 |
| QA-013 | Time-to-first-list benchmark | Ranked list of 10 parcels returned in under 2 minutes from confirmed pull | Intent | P0 |
| QA-014 | Session roll-up at session end | Spend, ATTOM/SOCIII split, parcels reviewed, Green count, cost compression all shown | Cost Transparency | P1 |
| QA-015 | Pull-receipt written to Vault DTC | One logbook entry per parcel pulled; fields complete | Section 8 | P1 |
| QA-016 | No investment recommendation in output | Output text contains no language recommending purchase/investment | RULE-09 | P0 |
| QA-017 | Coastal commission overlay detected | Parcel Red; blocker = COASTAL_COMMISSION_JURISDICTION; overlay rendered on map | Section 3, Section 6 | P1 |
| QA-018 | Historic district overlay detected | Parcel Yellow/Red; blocker = HISTORIC_DISTRICT; overlay rendered | Section 3, Section 6 | P1 |
| QA-019 | Batch pull receipt written to PLAT-008 | Single batch receipt with parcel manifest; classification = BATCH | Section 8 | P1 |
| QA-020 | SAMPLE chip loads in all three tabs | Oakland parcel displays in Historical, Opportunities, Feasibility without errors | Section 5 | P1 |
| **QA-021** *(new)* | Map renders with all ranked parcels as markers, color-coded | Map shows N markers matching N parcels; colors match verdicts | RULE-14 | P0 |
| **QA-022** *(new)* | Street View loads for parcel with valid address | Embed renders; fallback satellite badge if unavailable | Section 5 Tab 1 | P1 |
| **QA-023** *(new)* | YouTube discovery returns ≤3 filtered videos | Each video meets duration/view/recency filter; cap respected | RULE-15 | P1 |
| **QA-024** *(new)* | Input validation rejects malformed APN | Search refused with specific error message | RULE-11 | P0 |
| **QA-025** *(new)* | Fair Housing pattern triggers refusal | Search refused; regulatory note surfaced | RULE-12 | P0 |
| **QA-026** *(new)* | AVM staleness threshold (>30 days) | Staleness warning fires; verdict capped at Yellow | RULE-13 | P0 |
| **QA-027** *(new)* | Cost breakdown visible on hover | ATTOM cost + SOCIII markup shown separately, summing to user fee | Cost Transparency | P1 |
| **QA-028** *(new)* | Per-session persona override | User toggles persona via session header; UX adapts immediately | Section 10 | P1 |
| **QA-029** *(new)* | Session resume within 24h | In-progress ranked list persists; audit anchors permanent | Section 9 | P1 |
| **QA-030** *(new)* | Veteran CSV export schema | All required columns present; values populated where data available | Section 10 | P1 |

---

## Build Plan (developer notes — not part of customer-facing spec)

Order of implementation:

1. **Catalog entry** in `functions/functions/services/alex/catalogs/real-estate-development.json` — capabilities (12), pricing, alex registration, vault outputs, referrals (cross-worker)
2. **RAAS rules JSON** at `functions/functions/raas/rulesets/site-recon-rules-v1.json` — 15 rules
3. **Canvas tabs structure** — 3 tabs with content schema + visual elements per Section 5
4. **Sample data fixture** — Oakland Market St parcel for the SAMPLE chip across all 3 tabs
5. **Map integration helper** — wraps existing Google Maps integration for parcel boundary + marker + Street View + overlays
6. **YouTube discovery helper** — YouTube Data API v3 wrapper with filter logic
7. **Intent file** at `creators/sean-combs/site-recon-001/intent.md` — locked decisions summary
8. **QA-001 assertions** added to `docs/QA-001-TEST-CORPUS.md` (30 entries)
9. **`workerSync` run** to propagate to Firestore

Each layer committed separately for reviewable diff.

---

**SITE-RECON-001 | SOCIII Platform | v1.1 | June 2026 | Confidential**
