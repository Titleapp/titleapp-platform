# CODEX S52.22 — Legal Worker Family Expansion (LIT-001, DEF-001, DD-001, CLOSE-001)

**Date:** 2026-06-02
**Status:** SPEC — catalog-entry shape for four new legal workers, each consuming the ESC-013 Parcel Atlas substrate
**Vertical:** `legal`
**Companion docs:** [[CODEX-S52.20-Audit-Substrate-Property-Recording-Infrastructure]] (strategy lock), [[CODEX-S52.21-ESC-013-Parcel-Atlas-Worker-Spec]] (substrate worker)
**Already shipped 2026-06-02 morning:** PARA-001 (Paralegal), PAT-001 (Patent Worker)
**This brief specs:** LIT-001 (Litigation Discovery), DEF-001 (Compliance Defense), DD-001 (Transaction Due Diligence), CLOSE-001 (Closing Attorney)

---

## Why this expansion exists

Per the S52.20 four-constituency sales motion, each constituency needs a tailored worker that consumes the Parcel Atlas substrate (ESC-013) and presents the data in the action-lane shape that constituency wants:

| Constituency | Worker | Lead Wedge |
|---|---|---|
| State AGs | LIT-001 (Litigation Discovery — used in AG mode) | YES (the forcing function) |
| Plaintiff bar | LIT-001 (Litigation Discovery — used in plaintiff mode) | Fast monetization |
| Defense counsel | DEF-001 (Compliance Defense) | Reactive to AG/plaintiff pressure |
| Big-law M&A + RE finance | DD-001 (Transaction Due Diligence) | Slow but high-dollar |
| Closing attorneys (attorney-states) | CLOSE-001 (Closing Attorney) | Structural / accumulating |

All four consume the Parcel Atlas substrate. None of them duplicate substrate work. They are pure application workers on top of the data layer.

This document specs each at the catalog-entry level (slug, intent, canvas tabs, constraint sources, evidence-package contract). Full 6-file packages (intent-spec.yml, rules/, fixtures/, README) land per-worker when each is greenlit for build, in the same shape as PARA-001 / PAT-001 / ESC-013.

---

## LIT-001 — Litigation Discovery

### One-sentence purpose

Surface case-bringable violation patterns from the Parcel Atlas substrate (RESPA Section 8, AfBA non-disclosure, escrow self-dealing, steering, deed fraud, etc.) and generate prosecution-grade or demand-letter-grade evidence packages tailored to the user's constituency (State AG or plaintiff firm).

### Catalog entry

```json
{
  "id": "LIT-001",
  "name": "Litigation Discovery",
  "slug": "litigation-discovery",
  "suite": "Legal Enforcement",
  "phase": 1,
  "type": "composite",
  "pricing": {
    "tiers": {
      "plaintiff_firm": 999,
      "state_ag_public_sector": 0
    },
    "currency": "USD",
    "trial_days": 30,
    "note": "Tiered pricing per S52.20. AG tier subsidized as forcing-function distribution channel; plaintiff firm tier monetized"
  },
  "status": "development",
  "capabilitySummary": "Surfaces case-bringable violation patterns from the Parcel Atlas substrate; generates prosecution-grade or demand-letter-grade evidence packages tailored to State AG or plaintiff firm constituency. Identifies subpoena targets for AGs; identifies aggregate damages exposure and best-case defendants for plaintiff firms. Does not litigate.",
  "tags": ["legal", "litigation", "RESPA", "AfBA", "escrow_self_dealing", "steering", "deed_fraud", "discovery", "evidence_package"],
  "valueBucket": ["legal_enforcement", "case_discovery"],
  "alexRegistration": {
    "priority": "high",
    "acceptsTasks": true,
    "briefingContribution": "open_cases"
  },
  "temporalType": "always_on",
  "forge": { "enabled": false, "forge_price": null },
  "lane": "marketplace",
  "creator": "sociii-spine",
  "jurisdiction": "US-NATIONWIDE",
  "constraintRaasSources": [
    { "moduleId": "respa-section-8-kickback-detection", "required": true, "load_when": "always" },
    { "moduleId": "respa-section-9-required-use-detection", "required": true, "load_when": "always" },
    { "moduleId": "afba-disclosure-pattern-recognition", "required": true, "load_when": "always" },
    { "moduleId": "fair-housing-act-steering-patterns", "required": true, "load_when": "always" },
    { "moduleId": "state-unfair-deceptive-practices-acts", "required": true, "load_when": "tier:state_ag" },
    { "moduleId": "cfpb-enforcement-precedents", "required": false, "load_when": "matter_type:respa_class_action" }
  ],
  "consumes_substrate": ["parcel-atlas"],
  "canvasTabs": [
    { "id": "case-pipeline", "label": "Case Pipeline", "signal": "card:case-pipeline", "default": true, "order": 0, "view": "litigation", "description": "Identified case-bringable patterns sorted by aggregate damages exposure or political-value-to-AG" },
    { "id": "violation-patterns", "label": "Violation Patterns", "signal": "card:violation-patterns", "order": 1, "view": "litigation", "description": "Substrate-surfaced patterns (RESPA, AfBA, steering, etc.) with evidence weight scoring" },
    { "id": "targets", "label": "Defendants / Subpoena Targets", "signal": "card:targets", "order": 2, "view": "litigation", "description": "Brokers / title cos / lenders / escrow holders with highest evidence weight; tier-gated (AG sees subpoena targets, plaintiff firm sees defendant rankings)" },
    { "id": "evidence-packages", "label": "Evidence Packages", "signal": "card:evidence-packages", "order": 3, "view": "litigation", "description": "Generated evidence binders for filed cases or open investigations" },
    { "id": "demand-letters", "label": "Demand Letters", "signal": "card:demand-letters", "order": 4, "view": "litigation", "description": "PARA-001-drafted demand letters with substrate-derived exhibits attached" },
    { "id": "case-status", "label": "Case Status", "signal": "card:case-status", "order": 5, "view": "litigation", "description": "Tracked open cases / investigations with timeline + counsel CC + next deadlines" },
    { "id": "press-watchlist", "label": "Press Watchlist", "signal": "card:press-watchlist", "order": 6, "view": "litigation", "description": "Tracked press coverage of cases brought from substrate (AG announcements, plaintiff firm filings, defense responses)" },
    { "id": "audit-trail", "label": "Audit Trail", "signal": "card:audit-trail", "order": 7, "view": "litigation", "description": "Logbook of all evidence queries + generated packages + handoffs to PARA-001" }
  ],
  "controlCenterContribution": {
    "section": "legal_enforcement",
    "kpis": ["cases_active", "evidence_packages_generated_30d", "damages_exposure_in_pipeline", "press_mentions_30d"]
  },
  "intent": {
    "scope_in": [
      "Surfacing violation patterns from the Parcel Atlas substrate",
      "Generating evidence packages (prosecution-grade for AGs, demand-letter-grade for plaintiff firms)",
      "Ranking defendants / subpoena targets by evidence weight + dollar exposure",
      "Handing off to PARA-001 for instrument drafting (demand letters, complaint drafts)",
      "Tracking case status across the firm's docket",
      "Press watchlist for cases the user brought from substrate"
    ],
    "scope_out": [
      "Filing cases (user files; we provide evidence)",
      "Issuing subpoenas (AG issues; we identify targets)",
      "Settling cases (user settles; we package evidence)",
      "Practicing law in any jurisdiction",
      "Substituting for counsel review of any evidence package"
    ],
    "refusal_modes": [
      "User asks LIT-001 to file a case — out of scope; LIT-001 provides evidence; user files",
      "User asks LIT-001 to publish substrate data publicly — Bloomberg model, not Wikileaks; refused",
      "User in non-AG tier asks for prosecution-grade subpoena targets — tier-gated, refused with upgrade path",
      "User asks LIT-001 to fabricate or alter evidence — refused, hard floor",
      "User asks LIT-001 to suppress Fair Housing Act steering pattern findings — refused (civil rights load-bearing per S52.20)"
    ],
    "spec_ref": "docs/specs/CODEX-S52.22-Legal-Worker-Family-Expansion.md"
  },
  "vault": {
    "reads": ["parcel-atlas-substrate", "open-cases", "counsel-correspondence", "studio-locker"],
    "writes": ["evidence-packages", "demand-letters", "case-status", "press-watchlist", "audit-trail"]
  },
  "referrals": [
    { "event": "evidence_package_ready_for_demand_letter", "routesTo": "PARA-001" },
    { "event": "evidence_package_ready_for_complaint_filing", "routesTo": "PARA-001" },
    { "event": "case_status_change", "routesTo": "platform-marketing" },
    { "event": "ag_tier_subpoena_target_identified", "routesTo": "PARA-001" }
  ],
  "coming_soon": [
    "Direct PACER integration (track filed cases against substrate-identified targets)",
    "State court docket integration (Westlaw / Lexis API)",
    "Press release auto-generation upon case filing (AG mode only)",
    "Co-counsel matchmaking (smaller firms partner with bigger firms on substrate-derived cases)"
  ]
}
```

---

## DEF-001 — Compliance Defense

### One-sentence purpose

Proactively audit the user's (defense firm's) client book against the Parcel Atlas substrate, surfacing pre-litigation exposure (RESPA gaps, AfBA disclosure failures, escrow practices that pattern-match active enforcement), and generate remediation roadmaps + forward-defense documentation packages.

### Catalog entry

```json
{
  "id": "DEF-001",
  "name": "Compliance Defense",
  "slug": "compliance-defense",
  "suite": "Legal Defense",
  "phase": 1,
  "type": "composite",
  "pricing": {
    "tiers": {
      "defense_firm": 2499,
      "enterprise_law_firm": "contact_sales"
    },
    "currency": "USD",
    "trial_days": 30,
    "note": "Defense firms representing brokers / title cos / lenders / escrow holders subscribe at flat-rate; enterprise law firms with 50+ relevant clients negotiate enterprise pricing"
  },
  "status": "development",
  "capabilitySummary": "Proactively audits defense-firm client books against the Parcel Atlas substrate. Surfaces pre-litigation exposure for each client (RESPA Section 8 fingerprints, AfBA non-disclosure, escrow self-dealing signals, steering patterns). Generates remediation roadmaps + forward-defense documentation. Hardens client posture before AG / plaintiff bar action. Does not litigate.",
  "tags": ["legal", "defense", "compliance", "remediation", "RESPA", "AfBA", "client_audit", "forward_defense"],
  "valueBucket": ["legal_defense", "exposure_remediation"],
  "alexRegistration": {
    "priority": "high",
    "acceptsTasks": true,
    "briefingContribution": "client_exposure"
  },
  "temporalType": "always_on",
  "forge": { "enabled": false, "forge_price": null },
  "lane": "marketplace",
  "creator": "sociii-spine",
  "jurisdiction": "US-NATIONWIDE",
  "constraintRaasSources": [
    { "moduleId": "respa-section-8-kickback-detection", "required": true, "load_when": "always" },
    { "moduleId": "afba-disclosure-pattern-recognition", "required": true, "load_when": "always" },
    { "moduleId": "escrow-self-dealing-detection", "required": true, "load_when": "always" },
    { "moduleId": "cfpb-enforcement-precedents", "required": true, "load_when": "always" },
    { "moduleId": "state-bar-malpractice-standards", "required": true, "load_when": "always" }
  ],
  "consumes_substrate": ["parcel-atlas"],
  "canvasTabs": [
    { "id": "client-book", "label": "Client Book", "signal": "card:client-book", "default": true, "order": 0, "view": "defense", "description": "Defense firm's client list with per-client exposure score derived from substrate match against their transaction history" },
    { "id": "exposure-map", "label": "Exposure Map", "signal": "card:exposure-map", "order": 1, "view": "defense", "description": "Heat map of each client's exposure across pattern dimensions (RESPA / AfBA / escrow / steering)" },
    { "id": "remediation", "label": "Remediation Roadmaps", "signal": "card:remediation", "order": 2, "view": "defense", "description": "Per-client remediation plans — disclosure updates, fee renegotiations, process changes" },
    { "id": "forward-defense", "label": "Forward Defense Docs", "signal": "card:forward-defense", "order": 3, "view": "defense", "description": "Audit-anchored documentation of remediation for use as evidence-of-good-faith in future enforcement actions" },
    { "id": "alerts", "label": "Enforcement Alerts", "signal": "card:alerts", "order": 4, "view": "defense", "description": "Active AG investigations + plaintiff filings matching firm's client patterns" },
    { "id": "competitor-exposure", "label": "Competitor Exposure", "signal": "card:competitor-exposure", "order": 5, "view": "defense", "description": "Defense firm's competitors' clients exposure (informational; helps firm pitch new clients away from competitors with high exposure)" },
    { "id": "audit-trail", "label": "Audit Trail", "signal": "card:audit-trail", "order": 6, "view": "defense", "description": "Logbook of audits run + remediation actions + forward-defense doc generation" }
  ],
  "controlCenterContribution": {
    "section": "legal_defense",
    "kpis": ["clients_audited", "high_exposure_clients", "remediation_in_progress", "forward_defense_packages"]
  },
  "intent": {
    "scope_in": [
      "Auditing defense firm's client book against the Parcel Atlas substrate",
      "Generating per-client exposure scores across RESPA / AfBA / escrow / steering dimensions",
      "Producing remediation roadmaps per client",
      "Generating forward-defense documentation packages (audit-anchored evidence of remediation)",
      "Alerting firm to active AG investigations or plaintiff filings matching their clients' patterns",
      "Tracking remediation progress across the client book"
    ],
    "scope_out": [
      "Litigating cases (firm litigates; we provide intelligence)",
      "Settling cases (firm settles)",
      "Substituting for counsel judgment on remediation strategy",
      "Practicing law in any jurisdiction"
    ],
    "refusal_modes": [
      "User asks DEF-001 to suppress evidence of client wrongdoing — refused; substrate is read-only",
      "User asks DEF-001 to provide AG-tier prosecution evidence about opposing parties — wrong worker; redirect to LIT-001 if tier-eligible",
      "User asks DEF-001 to forge or alter remediation documentation timestamps — refused, hard floor"
    ],
    "spec_ref": "docs/specs/CODEX-S52.22-Legal-Worker-Family-Expansion.md"
  },
  "vault": {
    "reads": ["parcel-atlas-substrate", "firm-client-list", "remediation-history", "studio-locker"],
    "writes": ["client-audits", "remediation-roadmaps", "forward-defense-packages", "enforcement-alerts", "audit-trail"]
  },
  "referrals": [
    { "event": "remediation_requires_instrument_drafting", "routesTo": "PARA-001" },
    { "event": "client_at_critical_exposure", "routesTo": "platform-marketing" },
    { "event": "competitor_client_high_exposure", "routesTo": "platform-marketing" }
  ],
  "coming_soon": [
    "State bar CLE-eligible reporting (firm earns CLE credits for using forward-defense docs)",
    "Carrier integration (malpractice insurer reduces premium for firms using DEF-001 for client audit)",
    "Industry benchmarking (firm sees their client book exposure vs. similar firms)"
  ]
}
```

---

## DD-001 — Transaction Due Diligence

### One-sentence purpose

For big-law M&A and RE finance partners closing portfolio acquisitions, REIT transactions, real-estate fund deals, or commercial-property purchases — generate transaction-time audit-chain reports on every parcel in the deal, surface title risk + encumbrance risk + chain-of-title gaps + zoning/permit issues, and produce DD memoranda formatted for client delivery.

### Catalog entry

```json
{
  "id": "DD-001",
  "name": "Transaction Due Diligence",
  "slug": "transaction-due-diligence",
  "suite": "Big Law Real Estate",
  "phase": 1,
  "type": "composite",
  "pricing": {
    "tiers": {
      "big_law_partner": 1499,
      "biglaw_firm_enterprise": "contact_sales",
      "per_transaction_addon": 4999
    },
    "currency": "USD",
    "trial_days": 30,
    "note": "Subscription per partner; enterprise rates for firms with 20+ partners in RE practice; per-deal premium for $100M+ transactions"
  },
  "status": "development",
  "capabilitySummary": "Generates transaction-time audit-chain reports on every parcel in a deal — portfolio acquisition, REIT, real-estate fund, commercial-property purchase. Surfaces title risk + encumbrance risk + chain-of-title gaps + zoning/permit issues. Produces DD memoranda formatted for client delivery. Reduces big-law partner's DD review time from days to hours per parcel. Does not provide legal opinion.",
  "tags": ["legal", "due_diligence", "big_law", "ma", "reit", "real_estate_fund", "title_risk", "portfolio_acquisition"],
  "valueBucket": ["transaction_dd", "risk_surfacing"],
  "alexRegistration": {
    "priority": "high",
    "acceptsTasks": true,
    "briefingContribution": "active_deals"
  },
  "temporalType": "event_driven",
  "forge": { "enabled": false, "forge_price": null },
  "lane": "marketplace",
  "creator": "sociii-spine",
  "jurisdiction": "US-NATIONWIDE",
  "constraintRaasSources": [
    { "moduleId": "chain-of-title-gap-detection", "required": true, "load_when": "always" },
    { "moduleId": "encumbrance-completeness-validation", "required": true, "load_when": "always" },
    { "moduleId": "fincen-gto-thresholds-by-jurisdiction", "required": true, "load_when": "deal_amount_above_threshold" },
    { "moduleId": "firpta-foreign-buyer-detection", "required": true, "load_when": "always" },
    { "moduleId": "ofac-sdn-list", "required": true, "load_when": "always" },
    { "moduleId": "zoning-entitlement-check", "required": false, "load_when": "deal_type:commercial|development" }
  ],
  "consumes_substrate": ["parcel-atlas"],
  "canvasTabs": [
    { "id": "active-deals", "label": "Active Deals", "signal": "card:active-deals", "default": true, "order": 0, "view": "biglaw", "description": "Open transactions with status, parcel count, DD progress, target close" },
    { "id": "portfolio-map", "label": "Portfolio Map", "signal": "card:portfolio-map", "order": 1, "view": "biglaw", "description": "GeoJSON map of all parcels in the current transaction with risk-color overlay" },
    { "id": "title-risk", "label": "Title Risk", "signal": "card:title-risk", "order": 2, "view": "biglaw", "description": "Per-parcel chain-of-title analysis with gap detection + quitclaim flags + no-consideration transfers" },
    { "id": "encumbrances", "label": "Encumbrances", "signal": "card:encumbrances", "order": 3, "view": "biglaw", "description": "Active liens, easements, deed restrictions per parcel; aggregate exposure across portfolio" },
    { "id": "regulatory", "label": "Regulatory Layer", "signal": "card:regulatory", "order": 4, "view": "biglaw", "description": "FIRPTA exposure, FinCEN GTO thresholds, OFAC matches, zoning constraints, environmental flags" },
    { "id": "dd-memos", "label": "DD Memoranda", "signal": "card:dd-memos", "order": 5, "view": "biglaw", "description": "Generated DD memos formatted for client delivery; counsel-review-required markers" },
    { "id": "comparables", "label": "Comparable Deals", "signal": "card:comparables", "order": 6, "view": "biglaw", "description": "Recent comparable transactions with audit-chain provenance for valuation defensibility" },
    { "id": "audit-trail", "label": "Audit Trail", "signal": "card:audit-trail", "order": 7, "view": "biglaw", "description": "Logbook of all DD queries + memos + handoffs" }
  ],
  "controlCenterContribution": {
    "section": "biglaw_re",
    "kpis": ["active_deals", "parcels_in_dd", "high_risk_parcels_flagged", "dd_memos_delivered_30d"]
  },
  "intent": {
    "scope_in": [
      "Transaction-time audit-chain reports on every parcel in a deal",
      "Title risk + encumbrance risk + chain-of-title gap surfacing",
      "FIRPTA / FinCEN GTO / OFAC compliance flagging",
      "Zoning + entitlement check for commercial / development deals",
      "DD memoranda formatted for client delivery (counsel-review-required marker on every page)",
      "Comparable deal surfacing with audit-chain provenance",
      "Multi-jurisdictional portfolio handling (single transaction with parcels in multiple states)"
    ],
    "scope_out": [
      "Legal opinions on title status",
      "Closing the transaction (escrow / title workers handle that)",
      "Negotiating terms (DD-001 surfaces; partner negotiates)",
      "Substituting for partner judgment on deal-breaker materiality"
    ],
    "refusal_modes": [
      "User asks DD-001 to opine on whether title is good enough to close — out of scope; partner decides; DD-001 provides evidence",
      "User asks DD-001 to suppress red flags from DD memo to favor a deal — refused, hard floor",
      "User asks DD-001 to fabricate comparable deals — refused"
    ],
    "spec_ref": "docs/specs/CODEX-S52.22-Legal-Worker-Family-Expansion.md"
  },
  "vault": {
    "reads": ["parcel-atlas-substrate", "active-deals", "comparable-deals", "studio-locker"],
    "writes": ["dd-memos", "risk-reports", "regulatory-flags", "audit-trail"]
  },
  "referrals": [
    { "event": "ofac_match_detected", "routesTo": "PARA-001" },
    { "event": "title_defect_requires_quiet_title_action", "routesTo": "PARA-001" },
    { "event": "deal_closing_imminent", "routesTo": "esc-escrow-locker" }
  ],
  "coming_soon": [
    "iManage / NetDocuments integration (DD memos flow into firm DMS)",
    "Practice management integration (Clio / Centerbase / Aderant)",
    "Carrier integration (lender title insurance auto-quote based on substrate-surfaced risk)",
    "REIT-specific compliance reporting (SOX-friendly audit documentation)"
  ]
}
```

---

## CLOSE-001 — Closing Attorney

### One-sentence purpose

For attorneys in attorney-closing states (NJ, NY, MA, CT, NC, SC, GA, etc.) — anchor every closing they handle on the SOCIII audit chain, generating per-closing forward-defense documentation that establishes documentable care for malpractice exposure, while providing the attorney with a single workspace for closing pipeline + per-closing exposure + practice-wide audit trail.

### Catalog entry

```json
{
  "id": "CLOSE-001",
  "name": "Closing Attorney",
  "slug": "closing-attorney",
  "suite": "Attorney-State Closings",
  "phase": 1,
  "type": "composite",
  "pricing": {
    "tiers": {
      "solo_attorney": 299,
      "small_firm": 999,
      "regional_firm": 2999
    },
    "currency": "USD",
    "trial_days": 30,
    "note": "Per-attorney pricing scales with firm size; state bar association partnerships may offer CLE-credit-bundled discounts"
  },
  "status": "development",
  "capabilitySummary": "Anchors every closing on the SOCIII audit chain in attorney-closing states. Generates per-closing forward-defense documentation establishing documentable care for malpractice exposure. Provides closing pipeline + per-closing risk surface + practice-wide audit trail. Reduces closing time per file by automating chain-of-title, encumbrance, and disclosure verification. Does not substitute for attorney judgment.",
  "tags": ["legal", "closing_attorney", "attorney_states", "malpractice_defense", "forward_defense", "title_verification", "closing_workflow"],
  "valueBucket": ["closing_workflow", "malpractice_defense"],
  "alexRegistration": {
    "priority": "high",
    "acceptsTasks": true,
    "briefingContribution": "closing_pipeline"
  },
  "temporalType": "always_on",
  "forge": { "enabled": false, "forge_price": null },
  "lane": "marketplace",
  "creator": "sociii-spine",
  "jurisdiction": "US-ATTORNEY-STATES",
  "constraintRaasSources": [
    { "moduleId": "chain-of-title-gap-detection", "required": true, "load_when": "always" },
    { "moduleId": "encumbrance-completeness-validation", "required": true, "load_when": "always" },
    { "moduleId": "state-bar-malpractice-standards", "required": true, "load_when": "always" },
    { "moduleId": "trid-tila-respa-disclosure-rules", "required": true, "load_when": "always" },
    { "moduleId": "state-specific-closing-requirements", "required": true, "load_when": "always" }
  ],
  "consumes_substrate": ["parcel-atlas"],
  "canvasTabs": [
    { "id": "closing-pipeline", "label": "Closing Pipeline", "signal": "card:closing-pipeline", "default": true, "order": 0, "view": "closing_attorney", "description": "Active closings sorted by target close date with status, parties, exposure score" },
    { "id": "per-closing-workspace", "label": "Closing Detail", "signal": "card:closing-detail", "order": 1, "view": "closing_attorney", "description": "Single-closing workspace with chain-of-title verification, encumbrance check, disclosure compliance, signature flow" },
    { "id": "forward-defense", "label": "Forward Defense", "signal": "card:forward-defense", "order": 2, "view": "closing_attorney", "description": "Per-closing forward-defense documentation packages (audit-anchored evidence of care for malpractice purposes)" },
    { "id": "exposure-map", "label": "Practice Exposure", "signal": "card:practice-exposure", "order": 3, "view": "closing_attorney", "description": "Practice-wide exposure across all closings; identifies trend risk + carrier-reportable patterns" },
    { "id": "cle-tracker", "label": "CLE Credits", "signal": "card:cle-tracker", "order": 4, "view": "closing_attorney", "description": "CLE credits earned via state bar partnerships for using audit-anchored closing practice" },
    { "id": "carrier-reports", "label": "Malpractice Carrier Reports", "signal": "card:carrier-reports", "order": 5, "view": "closing_attorney", "description": "Carrier-formatted reports demonstrating attorney's audit-anchored process; supports premium reduction conversations" },
    { "id": "audit-trail", "label": "Audit Trail", "signal": "card:audit-trail", "order": 6, "view": "closing_attorney", "description": "Logbook of all closings handled + forward-defense docs + carrier interactions" }
  ],
  "controlCenterContribution": {
    "section": "closing_attorney",
    "kpis": ["closings_active", "closings_completed_30d", "forward_defense_packages", "cle_credits_earned_ytd"]
  },
  "intent": {
    "scope_in": [
      "Anchoring every closing on the SOCIII audit chain",
      "Generating per-closing forward-defense documentation",
      "Pre-closing verification: chain-of-title, encumbrances, disclosures, TRID compliance",
      "Signature flow integration with Dropbox Sign + state-specific notary requirements",
      "Closing pipeline management",
      "Practice-wide exposure monitoring",
      "CLE credit tracking via state bar partnerships",
      "Malpractice carrier reporting"
    ],
    "scope_out": [
      "Substituting for attorney judgment on materiality of defects",
      "Providing legal advice to closing parties",
      "Issuing title insurance (separate vertical)",
      "Acting as escrow agent (ESC workers handle that)"
    ],
    "refusal_modes": [
      "User asks CLOSE-001 to backdate forward-defense docs — refused, hard floor",
      "User asks CLOSE-001 to substitute for attorney sign-off on a closing — refused, attorney closes; CLOSE-001 documents",
      "User asks CLOSE-001 to close in a non-attorney state where unauthorized practice rules forbid — refused with redirect to ESC-001 workflow"
    ],
    "spec_ref": "docs/specs/CODEX-S52.22-Legal-Worker-Family-Expansion.md"
  },
  "vault": {
    "reads": ["parcel-atlas-substrate", "closing-pipeline", "carrier-correspondence", "studio-locker"],
    "writes": ["closing-records", "forward-defense-packages", "carrier-reports", "audit-trail"]
  },
  "referrals": [
    { "event": "closing_requires_instrument_drafting", "routesTo": "PARA-001" },
    { "event": "title_defect_blocks_closing", "routesTo": "esc-lien-clearance" },
    { "event": "closing_completed", "routesTo": "esc-recording-monitor" }
  ],
  "coming_soon": [
    "State bar association CLE-credit partnerships (NJ, NY, MA, NC, GA first)",
    "Malpractice carrier premium-reduction partnerships",
    "Direct integration with state e-recording portals",
    "Multi-attorney firm workflow (closing supervised by senior partner with junior associate execution)"
  ]
}
```

---

## Cross-worker evidence-package contract

All four legal workers exchange data with each other and with ESC-013 Parcel Atlas via a standardized evidence-package contract. This avoids each worker reinventing how it consumes substrate data.

### Evidence-package envelope

```json
{
  "envelope_version": "1.0",
  "package_type": "violation_evidence | dd_memo | forward_defense | remediation",
  "source_worker": "lit-001 | def-001 | dd-001 | close-001",
  "consuming_worker": "para-001 | lit-001 | def-001 | dd-001 | close-001",
  "substrate_refs": {
    "parcel_dtcs": ["array of parcel DTC refs from parcel-atlas"],
    "logbook_entries": ["array of logbook entry refs"],
    "anchor_records": ["array of Base anchor record refs"]
  },
  "user_context": {
    "tier": "individual | plaintiff_firm | defense_firm | state_ag | biglaw_partner | closing_attorney",
    "jurisdiction": "string",
    "matter_id": "string"
  },
  "package_payload": {
    // Type-specific payload — varies by package_type
  },
  "counsel_review_required": true,
  "audit_anchor": {
    "tx_hash": "string",
    "block_number": "number",
    "anchor_timestamp": "ISO8601"
  }
}
```

### Handoff matrix

| From worker | Event | To worker | Package type |
|---|---|---|---|
| LIT-001 | Demand letter ready | PARA-001 | violation_evidence |
| LIT-001 | Complaint filing ready | PARA-001 | violation_evidence |
| LIT-001 | AG subpoena target | PARA-001 | violation_evidence (AG variant) |
| DEF-001 | Remediation requires instrument | PARA-001 | remediation |
| DEF-001 | Client at critical exposure | platform-marketing | (notification, not envelope) |
| DD-001 | OFAC / FIRPTA flag requires drafting | PARA-001 | dd_memo |
| DD-001 | Title defect → quiet title needed | PARA-001 | dd_memo |
| DD-001 | Deal closing imminent | esc-escrow-locker | dd_memo |
| CLOSE-001 | Closing requires instrument | PARA-001 | forward_defense |
| CLOSE-001 | Title defect blocks closing | esc-lien-clearance | forward_defense |
| CLOSE-001 | Closing completed | esc-recording-monitor | forward_defense |

The contract ensures that any handoff between legal workers is structurally validated, anchored, and counsel-review-required-marked, with full substrate provenance preserved through the handoff chain.

---

## Wiring notes (for catalog seed)

Add all four worker entries to `functions/functions/services/alex/catalogs/legal.json` alongside the existing PARA-001 and PAT-001.

Updated catalog structure:

```json
{
  "vertical": "legal",
  "name": "Legal",
  "version": "1.1.0",
  "lifecycle": [
    { "phase": 0, "name": "Intake / Matter Setup", "description": "Identify parties, scope, jurisdiction; open the matter" },
    { "phase": 1, "name": "Drafting / Discovery / Defense / DD / Closing", "description": "Substrate-driven workflows per constituency" },
    { "phase": 2, "name": "Counsel Review", "description": "User's counsel reviews; attests at activation" },
    { "phase": 3, "name": "Execution / Filing", "description": "Counterparty signature, attorney filing — user-driven" },
    { "phase": 4, "name": "Prosecution / Maintenance / Forward Defense", "description": "Deadline tracking, office actions, maintenance fees, forward-defense documentation" }
  ],
  "suites": [
    { "id": "instruments", "name": "Legal Instruments" },
    { "id": "ip-portfolio", "name": "IP Portfolio" },
    { "id": "legal-enforcement", "name": "Legal Enforcement" },
    { "id": "legal-defense", "name": "Legal Defense" },
    { "id": "biglaw-re", "name": "Big Law Real Estate" },
    { "id": "attorney-state-closings", "name": "Attorney-State Closings" }
  ],
  "workers": [
    /* PARA-001 (existing), PAT-001 (existing), plus LIT-001, DEF-001, DD-001, CLOSE-001 as detailed above */
  ],
  "bundles": [
    {
      "id": "sociii-legal-spine",
      "name": "SOCIII Legal Spine",
      "description": "Paralegal + Patent + the four substrate-consuming workers. The complete legal family.",
      "persona": "founder",
      "workerIds": ["PARA-001", "PAT-001", "LIT-001", "DEF-001", "DD-001", "CLOSE-001"],
      "monthlyPrice": 5000,
      "note": "Bundle pricing per CODEX S52.20 four-constituency sales motion; individual tier-gated subscriptions also available"
    }
  ]
}
```

After update, run `workerSync` to mirror to `digitalWorkers/litigation-discovery`, `digitalWorkers/compliance-defense`, `digitalWorkers/transaction-due-diligence`, `digitalWorkers/closing-attorney` — same pattern as `syncLegalWorkers.js` did for PARA-001 and PAT-001 this morning.

---

## Build sequence

1. **ESC-013 Parcel Atlas** (substrate) — Week 1-2. Must ship first; all four legal workers depend on it.
2. **LIT-001 Litigation Discovery** — Week 3. Highest-leverage forcing function (AG mode); fastest monetization (plaintiff firm mode). First constituency-facing worker.
3. **CLOSE-001 Closing Attorney** — Week 4. Structural adoption channel in attorney states; lowest political friction.
4. **DEF-001 Compliance Defense** — Week 5. Activates once AG / plaintiff cases create demand pressure.
5. **DD-001 Transaction Due Diligence** — Week 6. Big-law-partner adoption; longest sales cycle but highest contract size.

Each weekly milestone is a 6-file worker package shipping with catalog + intent + rules + canvas + fixture + README, plus the workerSync mirror.

---

## What this unblocks

- The full S52.20 four-constituency sales motion has workers behind it
- Defense counsel can subscribe in response to AG/plaintiff activity (DEF-001)
- Big-law partners can subscribe for deal-time DD (DD-001)
- Closing attorneys in attorney states adopt structurally (CLOSE-001)
- AGs get the forcing-function tool (LIT-001 AG mode)
- Plaintiff bar gets the fast-monetization tool (LIT-001 plaintiff mode)
- Every handoff between legal workers + PARA-001 + the Title-Escrow vertical is standardized via the evidence-package envelope
- The legal vertical (`legal.json`) becomes a substantial 6-worker family covering instruments + IP + enforcement + defense + DD + closing
- The substrate (ESC-013 Parcel Atlas) earns from multiple constituencies via tier-gated subscriptions consuming the same underlying data

---

## Open questions for next session

1. **Specific state bar associations to approach first** for the CLE-credit partnership (CLOSE-001) — NJ, NY, MA, NC, GA leading candidates per S52.20.
2. **First AG offices to approach** (LIT-001 AG mode) — reformist AGs with active consumer-protection enforcement records. Cold-pitch the chief of consumer protection or civil rights division.
3. **First plaintiff firms to approach** (LIT-001 plaintiff mode) — 3-5 mid-size firms with active RESPA practices. Apollo-mine or warm intro?
4. **First defense firm to pilot DEF-001** — likely a firm representing brokers / title cos / lenders facing CFPB or AG pressure currently. Need 1-2 candidates.
5. **First big-law partner to pilot DD-001** — RE finance partner at a regional firm doing portfolio acquisitions. Need 1-2 candidates.
6. **Malpractice carrier partnership** (CLOSE-001) — which carriers (Travelers, ALAS, Lawyers Mutual variants) would pilot premium-reduction for SOCIII-using attorneys?

---

## Related

- `[[CODEX-S52.20-Audit-Substrate-Property-Recording-Infrastructure]]` — strategy lock these workers execute against
- `[[CODEX-S52.21-ESC-013-Parcel-Atlas-Worker-Spec]]` — substrate worker all four consume
- `[[CODEX-S52.16-Paralegal-Worker-Spec]]` — PARA-001 receives most handoffs
- `[[CODEX-S52.17-Patent-Worker-Spec]]` — PAT-001 sibling reference
- `[[CODEX-S52.15-Audit-Trail-Architecture-DTC-Logbook-Model]]` — audit substrate the evidence-package envelope rides on
- `[[project_user_counsel_attestation_pattern]]` — counsel-review-required marker discipline maintained across all four

---

*This document is the production catalog-entry-level spec for LIT-001, DEF-001, DD-001, and CLOSE-001. Full 6-file packages per worker land per build greenlight in subsequent CODEX docs (S52.23, S52.24, etc.). The strategy lock (S52.20) and the substrate spec (S52.21) are upstream; these four are downstream applications.*
