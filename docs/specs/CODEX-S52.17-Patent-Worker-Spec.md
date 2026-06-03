# CODEX S52.17 — Patent Worker (PATENT-001) — Worker Spec

**Date:** 2026-06-02
**Status:** SPEC — six-file worker package ready for catalog seed
**Slug:** `patent-001`
**Vertical:** `legal` (subfield: IP)
**Justification:** SOCIII already has three provisional filings live (Audit Trail, Knowledge Capture, RAAS Multi-Tier) and three more drafted for the deferred batch (AI Escrow Locker, Title & Property Assurance, Build Without Code). Each filing carries hard prosecution + grace-period deadlines, multi-jurisdictional filing decisions, and family-tree relationships. Tracking this manually breaks within a year. Formal worker. Task #264 graduates from pending to spec-locked.

---

## What this worker does

**One sentence:** Manages a patent portfolio's full lifecycle — provisional drafting, deadline tracking, prior-art audit, family-tree management, foreign filing decisions, prosecution response support — with hard-stops on grace-period violations and a permanent record of every public disclosure that could compromise a future filing.

**What it does NOT do (the scope floor):**
- It does not file with the USPTO. Filing belongs to user's patent attorney, who has filing credentials and bar standing.
- It does not give patentability opinions. Patentability requires a registered patent attorney.
- It does not make claim-scope decisions. Claim scope is the most consequential decision in a filing; the worker drafts options, counsel chooses.
- It does not respond to office actions on the user's behalf. It drafts response candidates; counsel files.
- It does not maintain attorney-client privilege boundaries automatically. The user must declare which conversations are subject to privilege.

---

## File 1 — `catalog.json`

```json
{
  "slug": "patent-001",
  "label": "Patent Worker — Portfolio Lifecycle Management",
  "vertical": "legal",
  "jurisdiction": "US-USPTO",
  "creator": "sociii-spine",
  "tagline": "Drafts provisionals, tracks prosecution deadlines, audits prior art, manages patent families, supports foreign filing decisions — without crossing into legal advice.",
  "pricing": {
    "monthly": 79,
    "currency": "USD",
    "trial_days": 14
  },
  "forge": {
    "enabled": true,
    "forge_price": 1.34
  },
  "intent": "intent-spec.yml",
  "rulesets": [
    "rules/core.yml",
    "rules/uspto-procedure.yml",
    "rules/grace-period-enforcement.yml",
    "rules/inventor-attribution.yml"
  ],
  "constraintRaasSources": [
    "35-usc-101-patentable-subject-matter",
    "35-usc-102-novelty-grace-period",
    "35-usc-103-non-obviousness",
    "35-usc-116-joint-inventorship",
    "mpep-2100-patentability",
    "uspto-fee-schedule-current",
    "pct-article-22-national-phase-deadline"
  ],
  "canvasTabs": "canvas-tabs.json",
  "lane": "marketplace",
  "outputs": [
    { "type": "text", "enabled": true, "contexts": ["chat_response"] },
    { "type": "structured_data", "enabled": true, "contexts": ["portfolio_summary", "deadline_calendar", "family_tree", "inventor_roster"] },
    { "type": "document", "enabled": true, "contexts": ["provisional_draft", "claim_draft", "prior_art_report", "office_action_response_candidate", "assignment_document"], "cost_model": "per_render", "cost_cents": 0 },
    { "type": "image", "enabled": true, "contexts": ["figure_placeholder", "family_tree_diagram"] },
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
  slug: patent-001
  version: 0.1.0
  scope:
    in:
      - Drafting provisional patent applications from inventor disclosure conversations
      - Drafting non-provisional applications from existing provisionals (continuation, conversion)
      - Drafting claim sets (multiple variants — broad, narrow, dependent strategies)
      - Tracking deadlines (provisional → non-provisional 12-month window, PCT 12-month priority, national phase 30/31-month, office action 3-month, etc.)
      - Tracking grace period (35 USC 102(b) one-year-from-public-disclosure clock)
      - Auditing inventor-recorded public disclosures (papers, talks, demos, GitHub commits, social posts) against grace-period viability for any future filing
      - Patent family management — tracking parent-child relationships across continuations, divisionals, CIPs, PCT applications, foreign nationals
      - Cross-filing claim-language coordination (when Filing C references Filing A, make sure the cross-reference language is correct in both)
      - Inventor list verification per filing (named inventors satisfy 35 USC 116 joint-inventorship requirements)
      - Foreign filing decision support — country-by-country cost / value matrix, PCT vs. direct national filing tradeoff
      - Prior art search assistance via integrated USPTO + Google Patents + EPO Espacenet queries (results, not opinions)
      - Office action response drafting (the candidate response, not the filing)
      - Assignment document drafting (inventor → company, prior-company → SOCIII for acquired IP)
      - Maintenance fee calendar tracking (3.5-year / 7.5-year / 11.5-year USPTO renewals)

    out:
      - Filing with any patent office (USPTO, EPO, JPO, CNIPA, etc.) — user's patent attorney files
      - Giving patentability opinions — registered patent attorney territory
      - Making final claim scope decisions — those are strategic + attorney-coordinated
      - Responding to office actions on the user's behalf (drafts only; counsel files)
      - Estimating prosecution costs (cost ranges yes, specific estimates no — too dependent on counsel choice)
      - Acting as the user's representative before the USPTO

  inputs:
    - name: matter_type
      type: enum
      values: [new_provisional, provisional_to_nonprovisional, continuation, divisional, cip, pct_filing, national_phase, office_action_response, assignment, family_audit, prior_art_search]
      required: true
    - name: invention_disclosure
      type: object
      schema:
        - title: string
        - field: string (the technical field)
        - background: string (problem being solved)
        - summary: string (the invention in 2-3 sentences)
        - detailed_description: string (the working embodiment)
        - claims_intent: string (what the inventor wants protected — translated to claims by the worker)
        - inventors: array of { name, role, contribution }
        - disclosure_history: array of { event_type, date, audience, public_or_private } (papers, talks, demos)
      required: for new_provisional and provisional_to_nonprovisional

  outputs:
    - kind: provisional_draft
      sections: [TITLE, FIELD, BACKGROUND, SUMMARY, DETAILED_DESCRIPTION, CLAIMS, ABSTRACT, FIGURES_LIST, INVENTORSHIP_AND_ASSIGNMENT_NOTES]
      format: markdown (counsel-review-required header)
    - kind: deadline_calendar
      structure: per-filing deadline rows with hard-stop dates flagged in red
    - kind: family_tree
      structure: parent-child filing relationships with cross-references
    - kind: grace_period_audit
      structure: per-disclosure timeline mapped against filing dates, with viability flags

  refusal_modes:
    - condition: "User asks for a patentability opinion"
      response: "A patentability opinion requires a registered patent attorney. I can run a prior-art search, surface the closest references, and draft claim variants — but the opinion is your attorney's call."
    - condition: "User asks to file directly with the USPTO"
      response: "Filing requires bar standing or a registered patent agent. I produce filing-ready packages; your counsel files them."
    - condition: "User asks to backdate a disclosure or filing"
      response: "Refused. Backdating is fraud on the patent office and is grounds for inequitable conduct (35 USC 282). The date is the date. We work with the actual timeline."
    - condition: "Grace period violation detected"
      response: "Stop. The proposed filing would violate the 35 USC 102(b) one-year grace period because [specific disclosure event on date X]. The earliest viable priority date is [Y]. We can still file, but the [pre-disclosure date] subject matter is no longer protectable."
    - condition: "Inventor list incomplete"
      response: "Refused until the inventor list is reconciled. Section 116 requires all who contributed to at least one claim to be named. Adding or removing inventors after filing requires a Section 116 correction. Better to get it right now."

  assertions:
    - id: grace-period-not-violated
      description: No proposed filing has a priority date later than the one-year-from-earliest-public-disclosure window for the claimed subject matter
      enforce: hard
    - id: every-filing-has-inventor-list
      description: Every filing's inventor list satisfies 35 USC 116 joint-inventorship requirements
      enforce: hard
    - id: every-filing-has-cross-references-validated
      description: When filing A references filing B (continuation, parent-child), the cross-reference language is correct in both directions
      enforce: hard
    - id: every-draft-has-counsel-review-marker
      description: Every drafted document carries the DRAFT — counsel-review-required header
      enforce: hard
    - id: counsel-attestation-pending-on-new-filings
      description: New filings are marked "pending counsel attestation" until the user's patent attorney signs off
      enforce: hard
    - id: deadline-alerts-fire-90-60-30-days
      description: Every tracked deadline fires alerts at 90 / 60 / 30 / 14 / 7 / 3 / 1 days out, plus same-day
      enforce: hard

  studio_locker_overlays:
    description: Per-firm filing strategy preferences live in the Studio Locker (Tier 3). Examples — preferred claim format, preferred figure conventions, default PCT election timing, default foreign filing strategy.
```

---

## File 3 — `rules/core.yml`

```yaml
rules:
  - id: no-patentability-opinions
    description: Refuse any request for a patentability opinion
    enforce: hard
    refuse_message: "Patentability opinions are registered-attorney territory. Want me to run a prior art search instead?"

  - id: no-filing-on-behalf-of-user
    description: Never represent filing with any patent office on the user's behalf
    enforce: hard
    refuse_message: "Filing requires bar standing. I prepare filing-ready packages; your counsel files them."

  - id: never-backdate
    description: Refuse any request to misrepresent disclosure or filing dates
    enforce: hard
    refuse_message: "Backdating is fraud on the patent office. We use actual dates only."

  - id: grace-period-hard-stop
    description: When a proposed filing's priority date is more than one year after the earliest-claimed-subject-matter public disclosure, block the filing with explicit reason
    enforce: hard
    rationale: "35 USC 102(b) one-year grace period. After this window, the subject matter is in the public domain and unpatentable in the US. (Other jurisdictions have stricter absolute-novelty rules — see foreign filing rules.)"

  - id: inventor-list-required-before-filing
    description: Refuse to finalize a filing without a verified inventor list satisfying 35 USC 116
    enforce: hard

  - id: counsel-attestation-marker
    description: Every drafted filing document carries DRAFT — counsel-review-required header
    enforce: hard
    rationale: "Per project_user_counsel_attestation_pattern memory."

  - id: sean-lee-combs-naming
    description: When the named inventor is SOCIII's founder, the rendering is "Sean Lee Combs", never "Sean Combs"
    enforce: hard
    rationale: "Per feedback_use_sean_lee_combs_in_all_external_copy memory."

  - id: prior-art-references-are-references-not-opinions
    description: Prior art reports list references with relevance scores; do not assert patentability conclusions
    enforce: hard

  - id: foreign-absolute-novelty
    description: When advising on foreign filings (EPO, JPO, most jurisdictions), flag absolute-novelty rules — ANY public disclosure before filing kills foreign rights
    enforce: hard
    rationale: "US has a 1-year grace period; most other jurisdictions do not. A US-safe disclosure may kill foreign rights."

  - id: maintenance-fee-deadline-tracking
    description: Once a US patent grants, track 3.5/7.5/11.5-year maintenance fee deadlines with 90/60/30/14/7/3/1-day alerts
    enforce: hard
    rationale: "Missed maintenance fees abandon the patent. Hard-stop alerts."
```

---

## File 4 — `canvas-tabs.json`

```json
{
  "tabs": [
    {
      "id": "portfolio",
      "title": "Portfolio",
      "signal": "card:portfolio-summary",
      "default": true,
      "icon": "binder",
      "data_source": "live"
    },
    {
      "id": "deadlines",
      "title": "Deadlines",
      "signal": "card:deadline-calendar",
      "icon": "calendar-alert",
      "data_source": "live"
    },
    {
      "id": "filings",
      "title": "Filings",
      "signal": "card:filing-list",
      "icon": "document-stack",
      "data_source": "live"
    },
    {
      "id": "family-tree",
      "title": "Family tree",
      "signal": "card:family-tree",
      "icon": "tree",
      "data_source": "live"
    },
    {
      "id": "inventors",
      "title": "Inventors",
      "signal": "card:inventor-roster",
      "icon": "users",
      "data_source": "live"
    },
    {
      "id": "prior-art",
      "title": "Prior art",
      "signal": "card:prior-art-references",
      "icon": "magnifier",
      "data_source": "live"
    },
    {
      "id": "disclosures",
      "title": "Public disclosures",
      "signal": "card:disclosure-timeline",
      "icon": "clock",
      "data_source": "live",
      "description": "Tracks every public disclosure for grace-period analysis"
    },
    {
      "id": "foreign-filing",
      "title": "Foreign filing",
      "signal": "card:foreign-filing-matrix",
      "icon": "globe",
      "data_source": "live"
    },
    {
      "id": "audit-trail",
      "title": "Audit trail",
      "signal": "card:audit-trail",
      "icon": "chain",
      "data_source": "live"
    }
  ]
}
```

---

## File 5 — `fixtures/sample-portfolio-soci.json` (SAMPLE mode shows SOCIII's actual portfolio)

```json
{
  "fixture_id": "PATENT-001-sample-sociii-portfolio",
  "scenario": "SOCIII Inc. current patent portfolio (filed + deferred)",
  "filings": [
    {
      "id": "filing-1-audit-trail",
      "title": "Identity-Anchored Hash-Chain Audit Trail for AI-Powered Software Agents",
      "filing_type": "provisional",
      "filed_date": "2026-05-24",
      "uspto_app_no": "64/073,693",
      "named_inventors": ["Sean Lee Combs"],
      "assignee": "SOCIII, Inc.",
      "status": "FILED",
      "deadlines": [
        { "label": "Non-provisional conversion deadline", "date": "2027-05-24", "days_remaining": 357 }
      ]
    },
    {
      "id": "filing-2-knowledge-capture",
      "title": "Knowledge Capture Pipeline — Codex Ingestion, Rule Extraction, Worker Fixture Capture",
      "filing_type": "provisional",
      "filed_date": "2026-05-24",
      "uspto_app_no": "64/073,694",
      "named_inventors": ["Sean Lee Combs"],
      "assignee": "SOCIII, Inc.",
      "status": "FILED"
    },
    {
      "id": "filing-c-raas",
      "title": "Multi-Tier Composable Rule-Based Governance System (5-Tier RAAS)",
      "filing_type": "provisional",
      "filed_date": "2026-05-25",
      "uspto_app_no": "TBD-from-USPTO",
      "named_inventors": ["Sean Lee Combs"],
      "assignee": "SOCIII, Inc.",
      "status": "FILED"
    },
    {
      "id": "filing-a-escrow-locker",
      "title": "AI Escrow Locker — Multi-Party Asset Custody with Rule-Based Release",
      "filing_type": "provisional",
      "drafted_date": "2026-05-30",
      "filed_date": null,
      "named_inventors": ["Sean Lee Combs"],
      "assignee": "SOCIII, Inc.",
      "status": "DRAFTED — pending counsel review",
      "deadlines": [
        { "label": "Grace period hard-stop (any earliest disclosure)", "date": "2027-06-28", "days_remaining": 391, "is_hard_stop": true }
      ]
    },
    {
      "id": "filing-b-title-property-assurance",
      "title": "Title and Property Assurance via Parent-Child DTC + Hash-Anchored Logbook",
      "filing_type": "provisional",
      "drafted_date": "2026-05-30",
      "status": "DRAFTED — pending counsel review"
    },
    {
      "id": "filing-d-build-without-code",
      "title": "Build-Without-Code Worker Authoring via Conversational AI Pair-Coding",
      "filing_type": "provisional",
      "drafted_date": "2026-05-30",
      "status": "DRAFTED — pending counsel review"
    }
  ],
  "patent_family": {
    "filing-c-raas": {
      "parent_of": [],
      "child_of": [],
      "cross_references": ["filing-1-audit-trail", "filing-2-knowledge-capture", "filing-a-escrow-locker", "filing-b-title-property-assurance", "filing-d-build-without-code"]
    }
  },
  "disclosure_timeline": [
    { "date": "2026-05-25", "type": "patent filings public docket", "audience": "USPTO", "is_grace_starting": true, "subjects": ["audit-trail-architecture", "knowledge-capture-pipeline", "raas-five-tier"] },
    { "date": "2026-06-01", "type": "sociii.ai/docs deployed (raas page, canvas page describe architecture publicly)", "audience": "public web", "is_grace_starting": true, "subjects": ["raas-five-tier", "audit-trail-architecture", "canvas-content-types", "wearable-contexts"] }
  ],
  "grace_period_alerts": [
    { "subject": "raas-five-tier", "earliest_disclosure": "2026-05-25", "hard_stop_filing_date": "2027-05-25", "days_remaining": 358, "status": "PROTECTED (filing already in)" },
    { "subject": "canvas-content-types + wearable-contexts (newly disclosed in docs site 2026-06-01)", "earliest_disclosure": "2026-06-01", "hard_stop_filing_date": "2027-06-01", "days_remaining": 365, "status": "MONITORING — may warrant provisional", "action_recommendation": "Discuss with counsel whether the canvas + wearable contexts warrant their own provisional given the public disclosure clock now running" }
  ]
}
```

---

## File 6 — `README.md`

```markdown
# Patent Worker

Manages a patent portfolio's full lifecycle — drafting, deadline tracking, prior-art audit, family management, foreign filing decisions — without crossing into legal opinion territory.

## What you give it
- An invention disclosure (in chat, conversationally)
- A list of inventors (the worker prompts for completeness against 35 USC 116)
- A disclosure timeline (papers, talks, demos, GitHub commits, social posts — any public disclosure that affects grace period)
- Optional: Studio Locker overlays (your firm's filing strategy preferences)

## What you get back
- A complete provisional draft (TITLE, FIELD, BACKGROUND, SUMMARY, DETAILED_DESCRIPTION, CLAIMS, ABSTRACT, FIGURES_LIST, INVENTORSHIP_AND_ASSIGNMENT_NOTES) — counsel-review-required
- A deadline calendar with hard-stop dates (provisional→non-provisional 12-month, PCT 12-month priority, national phase 30/31-month, office action 3-month, maintenance fees)
- A grace-period audit mapping every public disclosure against every claimed subject area
- A patent family tree showing parent-child relationships and cross-references
- Foreign filing decision support — per-country cost/value matrix with absolute-novelty warnings
- Prior art search results from USPTO + Google Patents + EPO Espacenet (references only, not opinions)
- Office action response candidates — for counsel to refine + file
- Inventor assignment documents

## What it won't do
- File with any patent office
- Give patentability opinions
- Make claim-scope decisions on its own
- Respond to office actions on your behalf
- Estimate prosecution costs with specificity
- Represent you before the USPTO
- Backdate anything

## The hard-stops
- Grace period violation: blocks the filing with explicit explanation of which disclosure killed the priority date
- Inventor list incomplete: blocks the filing until reconciled (Section 116)
- Maintenance fee missed: hard alerts at 90/60/30/14/7/3/1 days before each deadline
- Foreign absolute-novelty: when planning foreign filings, flags every public disclosure that would kill rights

## Counsel relationship
Patent worker is your counsel's force multiplier, not their replacement. Drafts go to counsel; counsel reviews, refines, files. Every artifact carries a DRAFT — counsel-review-required header. The worker tracks counsel's deadlines as the user's deadlines, and surfaces them with hard alerts.

## Studio Locker integration
Your firm's filing strategy preferences live in your workspace Studio Locker:
- Preferred claim formats (Jepson, means-plus-function, etc.)
- Default PCT election timing
- Default foreign filing strategy (PCT vs. direct nationals)
- Preferred figure conventions
- Counsel contact info (so deadline alerts CC the right attorney)

## Audit trail integration
Every drafted filing, every prior-art search, every grace-period audit, every counsel correspondence is appended to the matter DTC as a logbook entry. The matter itself is a compound DTC (per CODEX S52.15) — the patent application IS the entity, and every prosecution event is a logbook entry that appends to it.
```

---

## Wiring notes

1. **Add to** `functions/functions/services/alex/catalogs/legal.json` alongside the Paralegal worker:
   ```json
   { "id": "PATENT-001", "slug": "patent-001", "name": "Patent Worker" }
   ```
2. **constraintRaasSources** needs new RAAS modules added to `constraintRaasModules` collection:
   - `35-usc-101-patentable-subject-matter`
   - `35-usc-102-novelty-grace-period`  ← contains the grace-period math the worker depends on
   - `35-usc-103-non-obviousness`
   - `35-usc-116-joint-inventorship`
   - `mpep-2100-patentability`
   - `uspto-fee-schedule-current`  ← regulatory ingestion service should pull this from USPTO weekly
   - `pct-article-22-national-phase-deadline`
3. **External data integration** — the prior-art search relies on USPTO PatFT, Google Patents, EPO Espacenet. These are existing APIs to wire (USPTO Open Data, Google Patents Public Data via BigQuery, EPO Open Patent Services). Add to `dataFee.js`:
   - `uspto:patent-search` cost: $0 (free API), still 100% markup billed to customer at $0.02/query
   - `google:patents-search` cost: $0 (BigQuery query), marked up
   - `epo:espacenet-search` cost: $0 (free API), marked up
4. **Deadline alerter** — needs a daily cron that scans all `patent-001` workspaces, computes outstanding deadlines, fires alerts at 90/60/30/14/7/3/1-day windows. Reuse the existing Accounting Worker deadline-tracking surface (per S51.x) — same primitive.
5. **Counsel CC** — every alert email needs the user's counsel email CC'd if declared in Studio Locker.

Estimated wire-up: 2-3 days including the deadline alerter + USPTO API integration. Most of the substantive logic lives in the drafting model + rule application, which is already in-domain for the platform.

---

## What this unblocks

- SOCIII's own patent portfolio is the dogfood case — the worker tracks Filings 1, 2, C (filed) + A, B, D (drafted, pending counsel) + the deferred batch with hard deadlines
- Other Marketplace customers in IP-heavy industries (biotech, semiconductors, software platforms) get a productized patent operations layer
- Knowledge Capture Pipeline (Filing 2) flows naturally — captured ruleset knowledge becomes patent claim language

---

## Related

- `[[CODEX-S52.15-Audit-Trail-Architecture-DTC-Logbook-Model]]` — compound DTCs (patent matter as entity)
- `[[CODEX-S52.16-Paralegal-Worker-Spec]]` — sibling legal worker (assignments draft here)
- `docs/patents/2026-05-24/` — Filings 1 + 2 already filed
- `docs/patents/2026-06-deferred/` — Filings A, B, C, D drafted, pending counsel
- `project_patent_provisional_batch_2` memory — Patent claims #1-5
- `project_patent_filing_strategy` memory — overall portfolio approach
- `feedback_use_sean_lee_combs_in_all_external_copy` — Named Inventor rendering
```
