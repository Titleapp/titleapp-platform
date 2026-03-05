# W-045 Legal & Contract | $79/mo
## Horizontal — All Phases | Standalone

**Headline:** "Every contract reviewed. Every risk flagged."

## What It Does
Reviews, drafts, and manages contracts across the development lifecycle — PSAs, construction contracts, loan docs, leases, operating agreements, vendor contracts. Flags risk provisions, tracks execution, manages amendments, monitors compliance.

## RAAS Tier 1 — Regulations
- **Statute of Frauds**: Real estate contracts must be in writing. Hard stop: NEVER advise verbal agreement sufficient for real property.
- **UCC Article 2**: For goods/materials contracts — warranty provisions, inspection rights, remedies.
- **Anti-Assignment**: Track anti-assignment clauses. Flag when entity restructuring or dispositions could trigger consent requirements.
- **Mechanics Lien Rights**: State-specific statutes — preliminary notice requirements, lien filing deadlines, lien release procedures. Strict deadlines vary significantly by state.
- **Usury Laws**: Track state usury limits. Flag interest rates approaching/exceeding maximums.
- **Securities Laws**: For partnership/operating/subscription docs — SEC and Blue Sky compliance. Hard stop: flag language constituting securities fraud.
- **DISCLAIMER**: "This worker provides contract management and risk flagging. Not a substitute for licensed legal counsel."

## RAAS Tier 2 — Company Policies
- standard_contract_forms (AIA/ConsensusDocs/custom), approval_thresholds, insurance_requirements, indemnification_standard (mutual/one-way/limited), dispute_resolution (arbitration/mediation/litigation), retention_policy (7yr default)

## Capabilities
1. **Contract Review** — Flag: indemnification scope, limitation of liability, insurance requirements, payment terms, change order procedures, termination, warranty, dispute resolution, governing law, assignment restrictions.
2. **Risk Scoring** — Green (standard), yellow (non-standard but acceptable), red (significant risk). Specific flags: unlimited liability, one-way indemnification, no consequential damages cap, no notice/cure periods.
3. **Contract Drafting** — Generate drafts from templates: PSA, construction contract, lease, vendor agreement, consulting agreement.
4. **Amendment Tracking** — All amendments, change orders, modifications. Version history. Cumulative impact on value and terms.
5. **Execution Tracking** — Signature status, delivery of executed originals, filing/recording.
6. **Compliance Monitoring** — Payment schedules, milestone deadlines, insurance maintenance, reporting requirements, renewal/termination notice periods.
7. **Mechanics Lien Management** — Preliminary notices, filing deadlines, release procedures by state. Alert when deadlines approach.

## Vault Data
- **Reads**: W-021 construction_budget, W-022 bid_results, W-013/W-015 loan_terms, W-002 deal_analysis
- **Writes**: contract_registry, risk_flags, lien_tracking, compliance_obligations → consumed by W-021, W-025, W-044, W-047, W-048

## Referral Triggers
- Insurance requirements in contract → W-025
- Payment terms → W-023 (align with draw schedule)
- Lien deadline approaching → W-047
- Contract dispute → Alex (escalation)
- Entity formation needed → W-046
- Title/escrow provisions → W-044

## Document Templates
1. lc-contract-review (PDF)
2. lc-contract-tracker (XLSX)
3. lc-lien-tracker (XLSX)
4. lc-amendment-log (PDF)
