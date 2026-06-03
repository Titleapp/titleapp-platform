# CODEX S52.21 — ESC-013 Parcel Atlas — Worker Spec

**Date:** 2026-06-02
**Status:** SPEC — six-file worker package ready for `digitalWorkers` catalog seed
**Slug:** `parcel-atlas`
**Vertical:** `title-escrow`
**Justification:** The substrate worker per CODEX S52.20 strategy lock. Pre-populates parcel DTCs from public records, anchors each on Base via Coinbase CDP, exposes audit-ledger viewer + queryable verification API. Powers ESC-001 through ESC-012 (every existing title-escrow worker) by replacing one-off transaction-time data ingestion with continuous pre-anchored substrate. Sublette WY pilot scope (~5,000 parcels, ~$1,000 cost) is the proof-of-concept.

---

## What this worker does

**One sentence:** Builds and maintains a cryptographically-anchored audit chain for every parcel in a declared boundary unit — ZIP, county, Ahupua'a, reservation, or arbitrary polygon — by pulling current-state from public records (ATTOM Property + Sale + Lending + Assessment + Permits), anchoring each parcel as a parent DTC on Base, and appending every detected change as a child logbook entry, with the result exposed as a queryable verification API consumed by every other Title-Escrow worker and offered as subscription tiers to plaintiff bar, defense counsel, county recorders, state AGs, and insurance carriers.

**What it does NOT do (the scope floor):**
- It does not file deeds, modify county records, or substitute for the official county recording system
- It does not give legal advice about title status or transaction validity
- It does not provide title insurance, escrow services, or closing services (those are downstream workers)
- It does not transfer ownership of any parcel — only records what the public records already show
- It does not custody money, escrow funds, or any financial instrument
- It does not publish data publicly (Bloomberg model, not Wikileaks)

---

## File 1 — `catalog.json`

```json
{
  "slug": "parcel-atlas",
  "label": "Parcel Atlas — Audit-Anchored Property Records",
  "vertical": "title-escrow",
  "jurisdiction": "US-NATIONWIDE",
  "creator": "sociii-spine",
  "tagline": "Pre-anchored audit chain for every parcel in your boundary — county, ZIP, Ahupua'a, reservation, or polygon. Powers every Title-Escrow worker. Surfaces evidence to plaintiff bar, defense counsel, county recorders, state AGs, and insurance carriers.",
  "pricing": {
    "tiers": {
      "individual": 99,
      "plaintiff_firm": 999,
      "defense_firm": 2499,
      "state_ag_public_sector": 0,
      "county_recorder_acknowledgment": 0,
      "insurance_carrier_enterprise": "contact_sales",
      "title_insurer_enterprise": "contact_sales"
    },
    "currency": "USD",
    "trial_days": 30,
    "note": "Tiered pricing per CODEX S52.20 strategy. AG and county tiers are subsidized as distribution channels; defense counsel and insurer tiers carry the revenue."
  },
  "forge": {
    "enabled": false,
    "forge_price": null,
    "note": "Substrate worker — not Forge-eligible. Foundational data layer, not a single-output deliverable."
  },
  "intent": "intent-spec.yml",
  "rulesets": [
    "rules/core.yml",
    "rules/public-records-handling.yml",
    "rules/audit-anchor-integrity.yml",
    "rules/customer-tier-data-access.yml"
  ],
  "constraintRaasSources": [
    "respa-section-8-kickback-detection",
    "respa-section-9-required-use-detection",
    "afba-disclosure-pattern-recognition",
    "fincen-gto-thresholds-by-jurisdiction",
    "ofac-sdn-list",
    "fair-housing-act-steering-patterns"
  ],
  "canvasTabs": "canvas-tabs.json",
  "lane": "marketplace",
  "outputs": [
    { "type": "text", "enabled": true, "contexts": ["chat_response"] },
    { "type": "structured_data", "enabled": true, "contexts": ["parcel_dtc", "logbook_entry", "audit_ledger", "boundary_summary", "risk_score", "violation_pattern"] },
    { "type": "document", "enabled": true, "contexts": ["parcel_audit_report", "boundary_overview", "violation_evidence_package", "subpoena_target_list", "carrier_risk_portfolio"], "cost_model": "per_render", "cost_cents": 0 },
    { "type": "image", "enabled": true, "contexts": ["boundary_map", "parcel_map", "risk_heatmap"] },
    { "type": "audio", "enabled": false },
    { "type": "video", "enabled": false },
    { "type": "multimedia_sequence", "enabled": false }
  ]
}
```

---

## File 2 — `intent-spec.yml`

```yaml
worker:
  slug: parcel-atlas
  version: 0.1.0
  scope:
    in:
      - Pre-populating parcel DTCs for declared boundary units from ATTOM Property + Sale + Lending + Assessment + Permits endpoints
      - Anchoring each parent DTC + child logbook entry on Base via Coinbase CDP (merkle-batched per S52.15 cost model)
      - Continuously monitoring public records for changes (new sale, new mortgage, new permit, tax delinquency, lien recording, foreclosure filing) and appending each as child logbook entries
      - Exposing the audit chain as a queryable API for downstream Title-Escrow workers (ESC-001 through ESC-012)
      - Surfacing structural violation patterns (RESPA Section 8 kickback signatures, AfBA non-disclosure, escrow self-dealing, steering patterns) per constituency-specific filter
      - Generating evidence packages tailored to constituency (plaintiff firm demand letter exhibits, AG subpoena target lists, carrier risk-portfolio scores, defense-counsel client-book audits)
      - Maintaining tier-gated access (state AGs see prosecution-grade evidence; insurers see risk scoring; plaintiff firms see case patterns; county recorders see only their own jurisdiction)
      - Supporting polymorphic boundary units (ZIP, county, Ahupua'a, reservation, arbitrary polygon)
      - Risk surfacing per parcel (title risk, encumbrance risk, fraud-pattern risk, climate risk, regulatory risk)

    out:
      - Filing deeds, modifying county records, or substituting for official recording systems
      - Providing legal opinions about title status or transaction validity
      - Title insurance, escrow services, closing services (those are downstream workers)
      - Transferring ownership of any parcel
      - Custodying money or financial instruments
      - Publishing data publicly (Bloomberg model, not Wikileaks)
      - Paying bribes to any official, ever (Palau lesson)
      - Operating in jurisdictions where the substrate cannot be built without breaking the law (we obey GDPR, state privacy laws, FCRA, etc.)

  inputs:
    - name: boundary_unit
      type: enum
      values: [zip, county, ahupuaa, reservation, polygon]
      required: true
      description: The geographic boundary the Atlas covers
    - name: boundary_identifier
      type: string
      required: true
      description: ZIP code, county FIPS, Ahupua'a name + island, reservation ID, or GeoJSON polygon
    - name: customer_tier
      type: enum
      values: [individual, plaintiff_firm, defense_firm, state_ag, county_recorder, insurance_carrier, title_insurer]
      required: true
      description: Determines data access scope and evidence-package generation behavior
    - name: refresh_cadence
      type: enum
      values: [realtime, daily, weekly, monthly]
      required: false
      default: weekly
      description: How often the substrate re-pulls ATTOM and detects changes
    - name: violation_pattern_filters
      type: array
      required: false
      description: Specific violation patterns to surface (e.g., RESPA Section 8 kickback signatures, AfBA non-disclosure)

  outputs:
    - kind: parcel_dtc
      shape:
        - parcel_id: string (APN or geohash)
        - boundary_ref: reference to parent boundary DTC
        - current_owner: { name, entity_type, vesting_type, address }
        - current_state: { assessed_value, avm, last_sale_date, last_sale_amount }
        - chain_of_title: array of { from, to, instrument_type, recorded_date, doc_number }
        - active_encumbrances: array of { lien_type, holder, amount, recorded_date }
        - risk_scores: { title_risk, encumbrance_risk, fraud_pattern_risk, climate_risk, regulatory_risk }
        - anchor_record: { tx_hash, block_number, anchor_timestamp, network }
        - logbook_entries: array of child DTC references
    - kind: boundary_summary
      shape:
        - boundary_id, total_parcels, total_anchored, last_refresh, change_count_30d, violation_pattern_count_by_type
    - kind: violation_evidence_package
      shape: (tier-specific structure — AG sees prosecution-grade, plaintiff firm sees demand-letter-ready, defense firm sees remediation map, insurer sees risk portfolio)
    - kind: risk_heatmap
      shape: GeoJSON FeatureCollection with risk_score per parcel for canvas rendering

  refusal_modes:
    - condition: "User asks Atlas to file a deed, modify a county record, or substitute for official recording"
      response: "Atlas is a verification layer, not the recording system. We anchor what counties record; we don't replace it. Filing belongs to the official county system."
    - condition: "User asks Atlas to publish data publicly (Wikileaks-style)"
      response: "We don't publish. We provide. Subscribers act on data; their actions become public. Atlas stays neutral."
    - condition: "User asks for data outside their tier scope (e.g., plaintiff firm requesting AG-tier prosecution evidence)"
      response: "Your tier doesn't include that scope. The tier above does. Want to upgrade, or stay at current scope?"
    - condition: "User asks Atlas to operate in a jurisdiction where ingestion would violate law (e.g., GDPR-protected EU personal data)"
      response: "We can't run the substrate in that jurisdiction without a lawful basis. Atlas runs where public records can be lawfully ingested."
    - condition: "User asks Atlas to ignore Fair Housing Act steering patterns or other civil rights protections in violation surfacing"
      response: "Refused. The substrate exists to expose civil rights violations, not facilitate them. Steering patterns are surfaced because they are evidence of harm."
    - condition: "User asks for Atlas to be used in a foreign sovereign deal that requires payment to officials"
      response: "Refused. The substrate is anti-corruption infrastructure. Bribery contradicts the product. Walk."

  assertions:
    - id: every-parcel-dtc-has-anchor-record
      description: Every parent DTC has a valid Base anchor record before being exposed to any tier
      enforce: hard
    - id: every-logbook-entry-references-parent
      description: Every child logbook entry validly references its parent DTC and a prior child if applicable
      enforce: hard
    - id: tier-gated-access-enforced
      description: Tier scope is enforced at the API layer; no path bypasses tier check
      enforce: hard
    - id: public-records-only
      description: All ingested data is sourced from records lawfully available to the public; no scraped non-public data, no protected personal information beyond what public records reveal
      enforce: hard
    - id: anchor-cost-transparency
      description: Per-customer cost surface shows anchor cost basis + markup transparently per S52.15 cost model
      enforce: hard
    - id: bloomberg-not-wikileaks
      description: Atlas never publishes substrate data to public channels; all distribution is via authenticated subscriber sessions
      enforce: hard

  studio_locker_overlays:
    description: Per-customer overlays for custom violation patterns or jurisdictional rule variants. Used primarily by AG offices and large insurance carriers who need to encode their own enforcement criteria or underwriting rules.
```

---

## File 3 — `rules/core.yml`

```yaml
rules:
  - id: substrate-not-system-of-record
    description: Atlas anchors what counties record; it does not replace or substitute for the official system of record
    enforce: hard
    rationale: Avoids the MERS comparison and the regulatory exposure of being treated as an unauthorized recorder

  - id: bloomberg-distribution-only
    description: Atlas never publishes substrate data publicly; all access flows through authenticated tier-gated subscription
    enforce: hard
    rationale: Per CODEX S52.20 distribution model. Publication exposes SOCIII to defamation, tortious interference, and burns commercial relationships

  - id: tier-isolation-strict
    description: A tier's queries return only the data scope that tier subscribes to; no data leakage across tiers
    enforce: hard
    rationale: AG-tier data is prosecution-sensitive; plaintiff-firm-tier data is case-strategy-sensitive; insurer-tier data is portfolio-sensitive. Cross-tier leakage destroys trust

  - id: anchor-before-expose
    description: A parcel DTC is not exposed via API until its Base anchor record is confirmed
    enforce: hard
    rationale: Verification claims require verifiable anchors. No pre-anchor exposure even for trusted tiers

  - id: violation-patterns-are-patterns-not-conclusions
    description: Surfaced violation patterns (RESPA, AfBA, steering, etc.) are statistical / structural patterns, not legal conclusions
    enforce: hard
    rationale: SOCIII does not prosecute. The pattern is the evidence. The user (AG, plaintiff firm) makes the legal conclusion

  - id: never-pay-officials
    description: Atlas operations never involve direct or indirect payment to government officials in any jurisdiction
    enforce: hard
    rationale: Palau lesson. The substrate is anti-corruption infrastructure. Bribery contradicts the product

  - id: civil-rights-violations-are-load-bearing
    description: Fair Housing Act violations, steering patterns, redlining patterns are surfaced and prominently flagged, not suppressed
    enforce: hard
    rationale: The substrate exists in part to expose civil rights harms in property markets. Suppression would defeat the purpose

  - id: anchor-cost-transparency
    description: Customer-facing cost surface shows base anchor cost + markup transparently
    enforce: soft
    rationale: Per data-fee billing universal rule (`feedback_data_credit_billing_universal`)

  - id: vocabulary-discipline
    description: Customer-facing surfaces use audit-domain language (audit ledger, logbook entry, anchor record, parent / child DTC); never crypto-domain language (NFT, mint, token, etc.)
    enforce: hard
    rationale: Per S52.15 vocabulary cascade. Crypto vocabulary alienates the actual buyers (insurance, AG, attorneys, recorders)
```

---

## File 4 — `canvas-tabs.json`

```json
{
  "tabs": [
    {
      "id": "boundary-map",
      "title": "Boundary Map",
      "signal": "card:boundary-map",
      "default": true,
      "icon": "map",
      "data_source": "live",
      "description": "GeoJSON map of every parcel in the boundary with risk-color overlay (red/yellow/green)"
    },
    {
      "id": "parcel-list",
      "title": "Parcels",
      "signal": "card:parcel-list",
      "icon": "grid",
      "data_source": "live",
      "description": "Sortable, filterable list of every anchored parcel with owner, last sale, risk score, last change"
    },
    {
      "id": "audit-trail",
      "title": "Audit Trail",
      "signal": "card:audit-trail",
      "icon": "chain",
      "data_source": "live",
      "description": "Time-ordered logbook of every change anchored across the boundary; click any entry to see the anchor record"
    },
    {
      "id": "opportunities",
      "title": "Opportunities",
      "signal": "card:opportunities",
      "icon": "target",
      "data_source": "live",
      "description": "Buy lane (foreclosure, default, NOD, distressed, owner-willing) + Legal lane (quiet title candidates, deed-fraud signals, RESPA pattern matches). Tier-filtered"
    },
    {
      "id": "violations",
      "title": "Violation Patterns",
      "signal": "card:violation-patterns",
      "icon": "alert",
      "data_source": "live",
      "description": "Structural violation pattern surface (RESPA Section 8, AfBA non-disclosure, escrow self-dealing, steering, deed fraud) — tier-gated"
    },
    {
      "id": "risk-heatmap",
      "title": "Risk Heatmap",
      "signal": "card:risk-heatmap",
      "icon": "thermometer",
      "data_source": "live",
      "description": "Multi-dimensional risk overlay (title, encumbrance, fraud, climate, regulatory) per parcel on the boundary map"
    },
    {
      "id": "evidence-packages",
      "title": "Evidence Packages",
      "signal": "card:evidence-packages",
      "icon": "folder",
      "data_source": "live",
      "description": "Generated evidence packages for the tier (demand letters for plaintiff firms, subpoena targets for AGs, remediation maps for defense, risk portfolios for insurers)"
    },
    {
      "id": "subscription",
      "title": "Subscription",
      "signal": "card:subscription",
      "icon": "key",
      "data_source": "live",
      "description": "Tier status, usage, anchor-cost transparency, upgrade options"
    }
  ]
}
```

---

## File 5 — `fixtures/sample-sublette-county.json`

```json
{
  "fixture_id": "PARCEL-ATLAS-sample-sublette-wy",
  "scenario": "Sublette County WY pilot — pre-populated parcel DTCs anchored on Base demonstrating the substrate model",
  "boundary": {
    "unit": "county",
    "identifier": "WY-035-Sublette",
    "display_name": "Sublette County, Wyoming",
    "fips_code": "56035",
    "estimated_parcels": 5200,
    "anchored_parcels": 5187,
    "anchor_progress": "99.75%",
    "last_full_refresh": "2026-06-23T08:00:00Z",
    "next_full_refresh": "2026-06-30T08:00:00Z"
  },
  "sample_parcels": [
    {
      "parcel_id": "82941-PNL-04123",
      "address": "100 W Pine St, Pinedale, WY 82941",
      "current_owner": {
        "name": "Pinedale Ranch Holdings LLC",
        "entity_type": "llc",
        "vesting_type": "sole_owner",
        "registered_agent": "Withheld per Wyoming LLC privacy law"
      },
      "current_state": {
        "assessed_value": 425000,
        "avm": 510000,
        "last_sale_date": "2023-08-15",
        "last_sale_amount": 480000
      },
      "chain_of_title_summary": "3 transactions tracked from 2008-present; clean chain, no gaps detected",
      "active_encumbrances": [
        { "lien_type": "mortgage", "holder": "First Bank of Wyoming", "amount": 384000, "recorded_date": "2023-08-22" }
      ],
      "risk_scores": {
        "title_risk": "green",
        "encumbrance_risk": "green",
        "fraud_pattern_risk": "green",
        "climate_risk": "yellow (wildfire exposure tier 2)",
        "regulatory_risk": "green"
      },
      "anchor_record": {
        "tx_hash": "0x9f3a8b...e72f",
        "block_number": 18491773,
        "anchor_timestamp": "2026-06-19T11:00:14Z",
        "network": "base-mainnet"
      },
      "logbook_entry_count": 3
    },
    {
      "parcel_id": "82941-PNL-02847",
      "address": "447 E Magnolia St, Pinedale, WY 82941",
      "current_owner": {
        "name": "Curtis & Mary Anderson",
        "entity_type": "individual",
        "vesting_type": "joint_tenancy"
      },
      "current_state": {
        "assessed_value": 285000,
        "avm": 340000,
        "last_sale_date": "2019-04-02",
        "last_sale_amount": 295000
      },
      "chain_of_title_summary": "2 transactions tracked from 2014-present; clean chain",
      "active_encumbrances": [
        { "lien_type": "mortgage", "holder": "Wells Fargo", "amount": 198000, "recorded_date": "2019-04-15" },
        { "lien_type": "mechanics_lien", "holder": "Sublette Contractors LLC", "amount": 14750, "recorded_date": "2025-09-12", "status": "active" }
      ],
      "risk_scores": {
        "title_risk": "yellow (active mechanics lien)",
        "encumbrance_risk": "yellow",
        "fraud_pattern_risk": "green",
        "climate_risk": "green",
        "regulatory_risk": "green"
      },
      "anchor_record": {
        "tx_hash": "0xc841a2...91f3",
        "block_number": 18491820,
        "anchor_timestamp": "2026-06-19T11:14:08Z",
        "network": "base-mainnet"
      },
      "logbook_entry_count": 5
    },
    {
      "parcel_id": "82922-BIG-00738",
      "address": "Township 30N, Range 113W, Section 24 (raw land)",
      "current_owner": {
        "name": "Big Piney Land Trust",
        "entity_type": "trust",
        "vesting_type": "trust",
        "trustee": "Withheld per trust filing"
      },
      "current_state": {
        "assessed_value": 1850000,
        "avm": null,
        "last_sale_date": "2017-11-30",
        "last_sale_amount": 1200000,
        "acreage": 480
      },
      "chain_of_title_summary": "4 transactions since 1989; one quitclaim deed in 2014 with no consideration documented (yellow flag)",
      "active_encumbrances": [],
      "risk_scores": {
        "title_risk": "yellow (no-consideration quitclaim 2014)",
        "encumbrance_risk": "green",
        "fraud_pattern_risk": "yellow (trust opacity + quitclaim pattern matches asset-hiding signatures)",
        "climate_risk": "yellow (winter range / wildlife migration constraints)",
        "regulatory_risk": "yellow (water rights complexity)"
      },
      "anchor_record": {
        "tx_hash": "0x71b482...0a4e",
        "block_number": 18492014,
        "anchor_timestamp": "2026-06-19T12:31:50Z",
        "network": "base-mainnet"
      },
      "logbook_entry_count": 6
    }
  ],
  "violation_pattern_surface": {
    "respa_section_8_signatures_30d": 4,
    "afba_non_disclosure_signatures_30d": 2,
    "escrow_self_dealing_signatures_30d": 0,
    "deed_fraud_signatures_30d": 1,
    "steering_pattern_signatures_30d": 0,
    "note": "Pattern surface is tier-gated. Individual tier sees only their own subscriptions; plaintiff firm tier sees all patterns; AG tier sees all patterns + recommended subpoena targets"
  },
  "tier_cost_basis": {
    "atttom_pull_cost_per_parcel_cents": 20,
    "anchor_cost_per_parcel_cents": 8,
    "platform_markup_cents": 30,
    "total_customer_charge_per_parcel_cents": 58,
    "sublette_full_refresh_cost_usd": 3010,
    "individual_query_cost_usd": 0.58,
    "note": "Per S52.15 cost model. Real-time refresh is amortized across subscriber base; query-level charges are passed through with markup"
  },
  "expected_output_artifacts": [
    "Boundary-Map.geojson",
    "Parcel-List-Anchored.json",
    "Audit-Trail-30d.json",
    "Risk-Heatmap.geojson",
    "Sublette-Case-Study.pdf"
  ]
}
```

Plus three additional fixtures shipping in v1:

- `sample-mono-county.json` — Mono CA, Sean's Mammoth-era warm intro target (~14,000 parcels)
- `sample-waimanalo-ahupuaa.json` — Waimānalo, Oahu (sleeper fixture for the sovereign vector when activated; demonstrates Ahupua'a boundary unit)
- `sample-plaintiff-firm-evidence-package.json` — Tier-specific output: a demand-letter-ready evidence package for a hypothetical RESPA case derived from substrate patterns

---

## File 6 — `README.md`

```markdown
# Parcel Atlas Worker

The substrate worker. Pre-populates parcel DTCs for declared boundary units, anchors each on Base, exposes the audit chain via tier-gated API. Every other Title-Escrow worker (ESC-001 through ESC-012) consumes this substrate.

## What you give it

- A boundary unit (ZIP, county, Ahupua'a, reservation, or arbitrary polygon)
- A boundary identifier (ZIP code, county FIPS, Ahupua'a name, etc.)
- Your customer tier (determines data scope and evidence-package shape)
- Refresh cadence preference (realtime, daily, weekly, monthly)
- Optional violation pattern filters

## What you get back

- A pre-anchored parcel DTC for every parcel in the boundary
- A queryable audit chain (every recorded change is a logbook entry on the parcel's DTC)
- Boundary map with risk-color overlay (red/yellow/green per dimension)
- Tier-specific evidence packages
  - **Plaintiff firms:** demand-letter-ready exhibits with violation pattern evidence
  - **Defense firms:** client-book audit maps with proactive remediation suggestions
  - **State AGs:** prosecution-grade evidence packages with subpoena target lists
  - **County recorders:** their own jurisdiction's anchor status + ransomware-survival demonstration
  - **Insurance carriers:** portfolio-wide risk scoring and loss-ratio reduction reports
  - **Title insurers:** chain-of-title verification certificates per parcel
- Continuous monitoring — new sales, mortgages, permits, liens, foreclosures appear as logbook entries within the refresh cadence

## What it won't do

- File deeds or modify county records (Atlas is verification, not recording)
- Replace the official county system of record
- Provide title insurance, escrow, or closing services (those are downstream workers)
- Publish substrate data publicly (Bloomberg model — never Wikileaks)
- Operate in jurisdictions where ingestion would break the law
- Suppress civil rights violations (Fair Housing Act steering patterns are surfaced, not hidden)
- Pay bribes to officials (Palau lesson — absolute floor)

## How tiers work

| Tier | Monthly | What you see |
|---|---|---|
| Individual | $99 | Single boundary, query-based access, no evidence packages |
| Plaintiff Firm | $999 | Multiple jurisdictions, RESPA/AfBA pattern surfacing, demand-letter generator |
| Defense Firm | $2,499 | Client-book audit (your firm's clients), proactive remediation maps |
| State AG (public sector) | $0 first 12 mo, then nominal | State-wide pattern detection, prosecution-grade evidence packages, subpoena target lists |
| County Recorder (acknowledgment) | $0 | Their own county's substrate, ransomware-survival demo, fraud-detection alerts |
| Insurance Carrier | enterprise | Portfolio-wide risk scoring, loss-ratio reduction reports |
| Title Insurer | enterprise | Chain-of-title verification certificates per parcel |

## Boundary unit polymorphism

Atlas accepts the same shape for radically different boundaries:

- **ZIP code** (default ingestion unit; matches ATTOM's bulk pull granularity)
- **County FIPS** (recorder-facing; aggregates ZIPs by FIPS)
- **Ahupua'a** (sovereign Hawaiian land unit; activated when SOCIII engages the Sovereign Nation of Hawaii, currently parked)
- **Reservation** (Tribal Nation deployments)
- **Arbitrary polygon** (watershed, HOA, school district, AG investigation target zone, plaintiff firm geographic case target)

Same product. Different framings. Same audit chain underneath.

## Sublette WY pilot

The first production deployment. ~5,200 parcels in Sublette County (Pinedale seat). $3,000 total cost (ATTOM pull + Base anchors + platform overhead). Case study generated within 2 weeks of go-live. Becomes the demo for Mono CA (Sean's Mammoth-era warm intro), Placer CA (Kimmi + Christina), Nevada counties (Sean's Mammoth-era recorder relationships), and other small county pilots.

## Audit trail integration

Every operation Atlas performs is itself a logbook entry on Atlas's own operations DTC. Every parcel pull, every anchor commit, every tier query, every evidence package generated. The substrate is self-auditing.

## Counsel review

Atlas surfaces patterns; it does not litigate. Every prosecution-grade evidence package carries the standard DRAFT — counsel-review-required header per `project_user_counsel_attestation_pattern`. SOCIII is the platform; counsel decides the case.
```

---

## Wiring notes (for catalog seed)

1. **Add to** `functions/functions/services/alex/catalogs/title-escrow.json` alongside the existing ESC-001 through ESC-012 workers:
   ```json
   { "id": "ESC-013", "slug": "parcel-atlas", "name": "Parcel Atlas" }
   ```
2. **constraintRaasModules** new entries needed in `constraintRaasModules` collection:
   - `respa-section-8-kickback-detection`
   - `respa-section-9-required-use-detection`
   - `afba-disclosure-pattern-recognition`
   - `fincen-gto-thresholds-by-jurisdiction`
   - `ofac-sdn-list` (already exists per S50.15 OFAC integration)
   - `fair-housing-act-steering-patterns`
3. **Data integration** services needed:
   - `services/data/attom.js` — already exists (ATTOM API wrapper); extend with bulk-pull and change-detection endpoints
   - `services/anchor/base.js` — new (Coinbase CDP wrapper for Base anchoring); spec'd in S52.15 Section 8
   - `services/data/county-direct/` — new directory for direct-county scrapers (phase 2 work); start with Sublette WY
4. **Schema** additions to Firestore:
   - `parcelDTCs/{boundary_id}__{parcel_id}` — parent DTC for each parcel
   - `parcelLogbook/{boundary_id}__{parcel_id}__{entry_id}` — child entries
   - `boundaryDTCs/{boundary_id}` — boundary-level aggregate (county / ZIP / Ahupua'a)
   - `tierSubscriptions/{customer_id}` — tier and scope per customer
5. **Run** `workerSync` to mirror legal.json's existing PARA-001 + PAT-001 pattern: catalog → `digitalWorkers/parcel-atlas`
6. **Wire** evidence-package generation handoff to PARA-001 (paralegal generates demand letters), LIT-001 (litigation discovery packages), DEF-001 (defense remediation), CLOSE-001 (closing attorney malpractice documentation)
7. **Wire** UI canvas to render GeoJSON boundary + risk heatmap (extend existing Maps integration per CODEX 50.20 RE Map card)

Estimated wire-up: 2-3 weeks for v1 with Sublette WY pilot, including ATTOM bulk integration + Base anchoring + canvas rendering + tier gating + initial evidence-package generation.

---

## What this unblocks

- The Sublette WY pilot (CODEX S52.20 Section: Sublette WY pilot) — concrete proof-of-concept of the substrate model
- Activation of every existing Title-Escrow worker (ESC-001 through ESC-012) with pre-anchored substrate
- The four-constituency sales motion (plaintiff bar, AGs, closing attorneys, county recorders + insurers) — each gets tier-gated access to the same substrate
- The legal worker family expansion (LIT-001, DEF-001, DD-001, CLOSE-001) all consume the Parcel Atlas substrate
- The Coinbase strategic conversation — "we have anchored N parcels on Base; here's the killer Base app you've been looking for"
- The Mono / Placer / Nevada county walk-ins (Sean's warm intros) — case study in hand
- The Storyhouse pitch upgrade — "we're not pitching the broker market, we're building the property recording infrastructure"
- The Kimmi advisor activation — she becomes the strategic architect for the insurer + county-records lane

---

## Open questions for next session

1. **Anchor cost basis confirmation.** Need to confirm actual Base anchor gas cost via Coinbase CDP test transaction. Current estimate is $0.08/parcel; could be lower at scale.
2. **ATTOM bulk pricing negotiation.** Default developer pricing is $0.10-0.30/parcel. Bulk licensing for full-county or full-state could reduce 80%+. Worth a sales conversation when Sublette validates the model.
3. **Direct-county scraper architecture.** When does the per-parcel ATTOM cost stop making sense and direct-county scraping become economically rational? Probably at the state-wide scale, not the county scale.
4. **Tier gating implementation.** API-level enforcement is straightforward; canvas-level visual gating requires per-tier conditional rendering. Spec the tier-gate component in the next session.
5. **Evidence-package handoffs.** PARA-001 already exists; the LIT-001/DEF-001/DD-001/CLOSE-001 specs (next brief) need to define the handoff contract for evidence packages.

---

## Related

- `[[CODEX-S52.20-Audit-Substrate-Property-Recording-Infrastructure]]` — the strategy lock this worker executes against
- `[[CODEX-S52.15-Audit-Trail-Architecture-DTC-Logbook-Model]]` — the substrate model this worker builds
- `[[CODEX-S52.16-Paralegal-Worker-Spec]]` — PARA-001 consumes evidence packages
- `[[CODEX-S52.17-Patent-Worker-Spec]]` — PAT-001 sibling reference
- `[[CODEX-S52.19-ATTOM-Integration-and-Title-Abstract-Report]]` — ATTOM integration spec (now subsumed by this worker)
- `[[project-real-estate-vertical-strategy]]` — earlier RE strategy memory
- `[[feedback_data_credit_billing_universal]]` — cost transparency rule this worker honors
```

---

*This document is the production spec for ESC-013 Parcel Atlas. Build sequence follows the CODEX S52.20 strategy lock. Sublette WY pilot is the first deployment; tier-gated subscription distribution is the revenue model. Updates require explicit revision.*
