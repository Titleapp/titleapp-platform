# CODEX S52.16 — Paralegal Worker (PARA-001) — Worker Spec

**Date:** 2026-06-02
**Status:** SPEC — six-file worker package ready for `digitalWorkers` catalog seed
**Slug:** `paralegal-001`
**Vertical:** `legal`
**Justification:** This worker has been used informally throughout S52.x (Kent RSPA + IP Assignment + Standby Offer; Robert Loan + Warrant + Advisor; AI Review Prompts; DBX Sign template prep; counsel-review markers). Volume + value justifies formalization. Dogfooding rule applied per `feedback_dogfood_justifies_worker`.

---

## What this worker does

**One sentence:** Drafts multi-party legal instrument bundles (loan, warrant, advisor, RSPA, IP assignment, employment offer) from templates with counsel-review markers, cross-document validation, and signature-package handoff to Dropbox Sign — all with a counterparty-facing adversarial AI review prompt so the other side can run their own review before signing.

**What it does NOT do (the scope floor):**
- It does not give legal advice
- It does not replace counsel review (every draft is marked DRAFT with counsel-review-required at the top)
- It does not file with any authority
- It does not custody signed originals (those land in Vault)
- It does not negotiate terms (those come from the user; the worker papers them)

---

## File 1 — `catalog.json`

```json
{
  "slug": "paralegal-001",
  "label": "Paralegal — Legal Instrument Drafting",
  "vertical": "legal",
  "jurisdiction": "US-DELAWARE",
  "creator": "sociii-spine",
  "tagline": "Draft loan, warrant, advisor, RSPA, IP-assignment, and employment-offer bundles — counsel-reviewable, DBX-Sign-ready, with adversarial review prompts for the other side.",
  "pricing": {
    "monthly": 49,
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
    "rules/delaware-corp-instruments.yml",
    "rules/securities-disclosure.yml"
  ],
  "constraintRaasSources": [
    "sec-rule-501-accredited-investor",
    "securities-exchange-act-section-15-finder",
    "delaware-gcl",
    "irs-83b-election"
  ],
  "canvasTabs": "canvas-tabs.json",
  "lane": "marketplace",
  "outputs": [
    { "type": "text", "enabled": true, "contexts": ["chat_response"] },
    { "type": "structured_data", "enabled": true, "contexts": ["matter_summary", "signature_status", "counterparty_list"] },
    { "type": "document", "enabled": true, "contexts": ["draft_instrument", "execution_copy", "bundle_index", "ai_review_prompt"], "cost_model": "per_render", "cost_cents": 0 },
    { "type": "image", "enabled": false },
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
  slug: paralegal-001
  version: 0.1.0
  scope:
    in:
      - Drafting multi-party legal instruments from declared templates (loan, warrant, advisor, RSPA, IP assignment, employment offer letter)
      - Assembling document bundles with cross-doc references validated (e.g., warrant references loan principal, advisor agreement references RSPA)
      - Generating counterparty-facing AI review prompts (adversarial, defaults-to-skepticism scaffolding)
      - Marking every draft DRAFT with counsel-review-required at the top
      - Producing DBX-Sign-ready PDFs (signature blocks aligned, exhibits paginated, recipient ordering correct)
      - Tracking signature status from DBX Sign webhooks
      - Storing executed originals in the workspace Vault as DTCs (compound, each agreement is a DTC)
    out:
      - Giving legal advice
      - Determining whether a transaction is legal
      - Replacing counsel review
      - Negotiating terms (the user owns the terms; this worker papers them)
      - Custody of physical or notarized originals
      - Filing with any authority (SEC, USPTO, Secretary of State, etc.)

  inputs:
    - name: matter_type
      type: enum
      values: [loan, warrant, advisor, rspa, ip_assignment, employment_offer, multi_doc_bundle]
      required: true
    - name: parties
      type: array
      schema:
        - role: enum [company, lender, investor, advisor, employee, ic_contractor, managing_member]
        - name: string
        - entity_type: enum [individual, corp, llc, partnership, trust]
        - jurisdiction_of_org: string (e.g., "Delaware", "California")
        - contact: { email: string, address: string }
      required: true
    - name: terms
      type: object
      schema: matter-specific (see fixtures/sample-*.json for shapes)
      required: true
    - name: studio_locker_overlays
      type: array
      description: References to firm-specific clauses + brand voice in the workspace's Studio Locker
      required: false

  outputs:
    - kind: draft_bundle
      contains:
        - Document set (one per instrument in the bundle)
        - Bundle README (index + cross-references + counsel-review checklist)
        - AI review prompt (counterparty-facing adversarial scaffold)
      format: markdown + PDF (markdown is the source-of-truth; PDF rendered for DBX upload)
    - kind: bundle_metadata
      fields:
        - bundle_id
        - effective_date_placeholder
        - signature_order
        - counsel_review_flags (per document)
        - cross_doc_references (validated)

  refusal_modes:
    - condition: "User asks for legal advice"
      response: "I draft documents from templates; I don't advise. For terms negotiation or interpretation, you need counsel. Want me to flag this question for counsel review at the top of the draft?"
    - condition: "User asks to file with SEC, USPTO, county recorder, or any authority"
      response: "Filing isn't in scope. I produce execution-ready documents; filing is your counsel's or your filing service's responsibility. I can hand the executed package to your counsel via Drive."
    - condition: "Bundle math doesn't reconcile (warrant coverage > sum of underlying obligations, equity grants > authorized shares, etc.)"
      response: "Stop. The math in this bundle doesn't reconcile: [specific discrepancy]. I won't draft past this. Please confirm the intended numbers."
    - condition: "User asks worker to act as authorized representative or signer"
      response: "I can prepare a signature block with your name and title. I cannot bind you to anything. Signing requires you, in person or via DBX Sign."

  assertions:
    - id: every-draft-has-counsel-review-marker
      description: Every generated document starts with a DRAFT — counsel-review-required header
      enforce: hard
    - id: cross-doc-references-validate
      description: When document A references document B's amount/date/party, the reference matches
      enforce: hard
    - id: signature-blocks-name-matches-party-list
      description: Each signature block name + title matches the party declared in inputs
      enforce: hard
    - id: managing-member-signature-coverage
      description: For LLC IP assignments, ALL managing members appear in the signature block (not just majority)
      enforce: hard
      rationale: Belt-and-suspenders for clean-title verification at DD time. Operating-doc-majority backup is a separate question for counsel.
    - id: forge-price-default-and-sociii-spine-fields
      description: catalog.json carries forge.enabled, forge.forge_price, vertical, jurisdiction, lane
      enforce: hard
```

---

## File 3 — `rules/core.yml`

```yaml
rules:
  - id: never-give-legal-advice
    description: Refuse any request that crosses from drafting into advisory
    enforce: hard
    refuse_message: "I draft documents; I don't advise. For interpretation or negotiation, you need counsel."

  - id: counsel-review-required-header
    description: Every generated document opens with a DRAFT marker requiring counsel review
    enforce: hard
    rationale: Per project_user_counsel_attestation_pattern memory. SOCIII is a platform, not a law firm.

  - id: sean-lee-combs-naming
    description: Any signature block, recital, or bio reference to the founder uses "Sean Lee Combs", never "Sean Combs"
    enforce: hard
    rationale: Per feedback_use_sean_lee_combs_in_all_external_copy memory. Disambiguates from Sean "Diddy" Combs.

  - id: no-personal-guarantees-on-corporate-debt
    description: Loan instruments that would create personal guarantees by company officers are refused without an explicit guarantor-party declaration
    enforce: hard
    rationale: Per feedback_no_personal_guarantees_on_loans memory. Corporate borrower only by default; never bleed corporate veil silently.

  - id: cross-doc-math-reconciles
    description: Amounts referenced across documents in a bundle must reconcile
    enforce: hard

  - id: dbx-sign-recipient-order-matches-signature-flow
    description: When rendering for DBX Sign upload, recipient order follows the signature flow declared in the bundle metadata
    enforce: hard

  - id: studio-locker-pull-when-firm-overlay-exists
    description: If the workspace's Studio Locker contains a firm-specific clause that supersedes the platform template, pull the Studio Locker version
    enforce: soft
    rationale: Tier 3 workspace overlays. Customer's firm protocols should win over generic platform templates.
```

---

## File 4 — `canvas-tabs.json`

```json
{
  "tabs": [
    {
      "id": "current-matter",
      "title": "Current matter",
      "signal": "card:current-matter",
      "default": true,
      "icon": "scroll",
      "data_source": "live"
    },
    {
      "id": "documents",
      "title": "Documents",
      "signal": "card:documents",
      "icon": "document-stack",
      "data_source": "live"
    },
    {
      "id": "counterparties",
      "title": "Counterparties",
      "signal": "card:counterparties",
      "icon": "users",
      "data_source": "live"
    },
    {
      "id": "templates",
      "title": "Templates",
      "signal": "card:templates",
      "icon": "library",
      "data_source": "studio-locker"
    },
    {
      "id": "signatures",
      "title": "Signature status",
      "signal": "card:signature-status",
      "icon": "pen",
      "data_source": "live"
    },
    {
      "id": "counsel-review",
      "title": "Counsel review",
      "signal": "card:counsel-review",
      "icon": "flag",
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

## File 5 — `fixtures/sample-multi-doc-bundle.json`

```json
{
  "fixture_id": "PARA-001-sample-multi-doc-bundle",
  "scenario": "Cofounder advisor RSPA + IP assignment + standby employment offer (Kent-Redwine-shaped)",
  "matter_type": "multi_doc_bundle",
  "parties": [
    {
      "role": "company",
      "name": "SOCIII, Inc.",
      "entity_type": "corp",
      "jurisdiction_of_org": "Delaware",
      "contact": { "email": "alex@sociii.ai", "address": "1810 E Sahara Avenue, Suite 75942, Las Vegas, NV 89104" }
    },
    {
      "role": "advisor",
      "name": "Sample Advisor",
      "entity_type": "individual",
      "jurisdiction_of_org": "California",
      "contact": { "email": "advisor@example.com", "address": "Sample Address" }
    },
    {
      "role": "managing_member",
      "name": "Sean Lee Combs",
      "entity_type": "individual",
      "contact": { "email": "sean@sociii.ai" }
    },
    {
      "role": "managing_member",
      "name": "Mike Lee",
      "entity_type": "individual"
    }
  ],
  "terms": {
    "rspa": {
      "aggregate_percent": 17.0,
      "purchase_price_per_share": 0.0001,
      "tranches": [
        { "label": "TitleApp Wind-Down", "percent": 5.0, "release_condition": "Cert of Cancellation filed + books closed + IP Assignment executed", "release_deadline_months": 12 },
        { "label": "Storyhouse Closing", "percent": 5.0, "release_condition": "Storyhouse closes ≥$1M investment", "release_deadline_months": 6, "repurchase_on_deadline_miss": true },
        { "label": "Seed Round Closing", "percent": 2.5, "release_condition": "Aggregate financing ≥$2M closes", "release_deadline_months": 24 },
        { "label": "Series A at ≥$50M post-money", "percent": 2.5, "release_condition": "Series A closes AT ≥$50M post-money valuation", "release_deadline_months": 48 },
        { "label": "Advisor Services", "percent": 2.0, "release_condition": "Time-vested 24/6/monthly", "release_deadline_months": null }
      ],
      "cofounder_title": { "granted_on_execution": true, "title": "Cofounder", "cessation_on_termination_days": 30 }
    },
    "ip_assignment": {
      "assignor_entity": "TitleApp LLC",
      "assignee_entity": "SOCIII, Inc.",
      "signature_required_from_all_managing_members": true,
      "no_cash_consideration": true,
      "equity_in_assignee_as_consideration_waiver": true
    },
    "standby_employment_offer": {
      "title": "Head of Financial Workers",
      "base_salary_usd": 150000,
      "at_will": true,
      "contingent_on": ["storyhouse_closing", "seed_round_closing"],
      "scope_inclusions": ["banking-finance vertical", "ir-fundraise worker family", "accounting worker expansion"],
      "scope_exclusions": ["digital-passport", "eu-dpp"]
    }
  },
  "studio_locker_overlays": [],
  "expected_output_bundle": [
    "RSPA-Master-DRAFT.md",
    "IP-Assignment-DRAFT.md",
    "Standby-Employment-Offer-DRAFT.md",
    "Bundle-Index-README.md",
    "AI-Review-Prompt.md"
  ]
}
```

Plus four other fixtures shipping in v1:
- `sample-loan-formalization.json` (Robert-shaped: handshake → 4% quarterly, 5-year)
- `sample-warrant-coverage.json` (Robert-shaped: $175K coverage, 7-year exercise, next-priced-round strike)
- `sample-advisor-only.json` (single instrument, time-vested standard advisor grant)
- `sample-ip-assignment-only.json` (LLC → Corp residual IP transfer)

---

## File 6 — `README.md`

```markdown
# Paralegal Worker

Drafts multi-party legal instrument bundles with counsel-review markers and DBX-Sign-ready output.

## What you give it
- Matter type (loan / warrant / advisor / RSPA / IP assignment / employment offer / multi-doc bundle)
- Parties (roles, entity types, jurisdictions, contacts)
- Terms (matter-specific — the worker prompts for what it needs)
- Optional: Studio Locker overlays (your firm's clauses)

## What you get back
- One DRAFT markdown document per instrument (all marked counsel-review-required)
- A Bundle Index README cross-referencing the documents
- An AI Review Prompt for the counterparty's adversarial review
- Cross-document math + reference validation
- DBX-Sign-ready PDF render with signature flow declared

## What it won't do
- Give legal advice
- Negotiate terms
- File with any authority
- Replace counsel review

## Studio Locker integration
Your firm's clauses + brand voice live in the workspace Studio Locker. The worker pulls them when the matter type matches a Studio Locker override.

## Audit trail
Every drafted document, every signature event, every bundle execution is appended to the matter's DTC as an NFT (per the audit-trail architecture). The agreement itself becomes a compound DTC when signed.

## Counsel review is a feature, not a friction
The "counsel-review-required" marker is intentional. SOCIII is not your law firm. The worker is faster and more consistent than handing a paralegal a template, but it doesn't replace the judgment your counsel brings.
```

---

## Wiring notes (for the catalog seed)

To add this worker to `digitalWorkers` Firestore catalog:

1. **Add to** `functions/functions/services/alex/catalogs/legal.json` (create if missing):
   ```json
   {
     "vertical": "legal",
     "label": "Legal",
     "workers": [
       { "id": "PARA-001", "slug": "paralegal-001", "name": "Paralegal" }
     ]
   }
   ```
2. **Run** `workerSync` helper (per `feedback_worker_home_render_path` and the catalog→FS sync pattern from CODEX 51.28-51.29). This propagates `canvasTabs`, `constraintRaasSources`, `controlCenterContribution`, `intent` fields into the runtime worker doc.
3. **Add the legal vertical to the SAMPLE fixture loader** so SAMPLE mode renders for first-time visitors.
4. **Add** `paralegal-001` to the Studio Locker pull-targets so the workspace's legal-templates folder is the data source for Tier 3 overrides.
5. **Wire** the DBX Sign webhook to also write back into the worker's signature-status canvas tab (already partially wired per S51.20).

Estimated wire-up time: 2-3 hours including SAMPLE fixture authoring + smoke test.

---

## What this unblocks

- Repeatable legal-instrument drafting at scale (every advisor / investor / employee bundle from now on)
- A real example worker for the legal vertical (currently only listed as a placeholder)
- A test bed for the Studio Locker tier 3 overlay pattern (`docs/legal-templates/SOCIII-Cofounder-Advisor-Agreement-Kent-Redwine.md` becomes a Studio Locker entry)
- A test bed for compound DTC creation (each signed agreement IS a compound DTC per CODEX S52.15)

---

## Related

- `[[CODEX-S52.15-Audit-Trail-Architecture-DTC-NFT-Model]]` — the audit-trail layer this worker writes against
- `feedback_use_sean_lee_combs_in_all_external_copy` — naming rule enforced in core.yml
- `feedback_no_personal_guarantees_on_loans` — refused by default in core.yml
- `project_user_counsel_attestation_pattern` — counsel-review-required marker
- `docs/legal-templates/SOCIII-Cofounder-Advisor-Agreement-Kent-Redwine.md` — first Studio Locker template seed
- `docs/legal-templates/SOCIII-Advisor-Agreement.md` — second Studio Locker template seed
```
