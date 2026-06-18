# QA-001 Assertions — `feasibility`

Worker-specific behavioral assertions for FEASIBILITY-001. Full catalog (TC-101
through TC-120 worker + TC-121 through TC-138 platform-invariant enforcement) in
`WORKER-SPEC.md` §14. TC numbers locked by the platform at merge.

## Worker-specific assertions

### Demand tab (default)

- TC-101: First-visit user sees the Lahaina 24-unit sample fixture, not an empty state
- TC-102: Demand tab is the synthesis surface — top-line verdict + demand score + capture analysis, pointing to Demographics for the deep-dive (no duplication)
- TC-103: No study executes without a confirmed cost projection + wallet-balance gate (RULE-01 / AP-02)
- TC-104: Capture-rate sanity gate fires — an implied capture rate above threshold is caveated (RULE-09)

### Supply tab

- TC-105: Supply-pipeline timeline color-codes each project by stage (proposed / permitted / entitled / under-construction)
- TC-106: When local planning-dept supply data is unavailable, a BLUE coverage gap is surfaced, not silently omitted (RULE-08 / EH-05)

### Comps tab

- TC-107: Every comp is retrieved with provenance — address, date, rent, source, retrievedAt (EH-07); no fabricated comps
- TC-108: Sample comps carry verifyMethod: synthetic_for_demo_only
- TC-109: The CoStar coverage gap (MLS-only comp set) is flagged BLUE, not presented as complete

### Demographics tab

- TC-110: Plain-English headers — "Median income", not "MHI" (Trump sub-B)
- TC-111: School-quality data invoked as a demand driver discloses its 3rd-party source + recency (RULE-13 / Reagan)

### Sources tab

- TC-112: Every data source is version-pinned with a retrieval date (EH-06) — deposition-ready
- TC-113: The lender-readiness badge matches the actual data-tier coverage (RULE-04)
- TC-114: The pull receipt stamps activePersonaId + accountId + walletTransactionId (AP-01)

### Cross-cutting

- TC-115: Every study writes a PLAT-008 receipt; anchor failure rolls back with 503 (RULE-03)
- TC-116: Data older than the 24-month freshness floor is blocked or caveated by tier (RULE-02)
- TC-117: Output contains no financial underwriting (IRR / capital stack) — demand/supply/comps inputs only (boundary with W-002)
- TC-118: A user-supplied market study / rent assumption is tagged verified:false and surfaced as user-provided (Reagan Rule)

## Time budgets (treat as bugs if exceeded)

- Tier-Q snapshot (confirmed): demand summary in < 30 seconds
- Tier-R study (confirmed): full 5-tab canvas in < 2 minutes
- Cost projection (Phase 1): < 5 seconds
