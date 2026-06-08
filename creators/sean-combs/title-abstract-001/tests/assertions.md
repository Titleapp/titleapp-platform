# QA-001 Assertions — `title-abstract`

Worker-specific behavioral assertions for TITLE-ABSTRACT-001. Full catalog
(TC-101 through TC-118 worker + TC-121 through TC-138 platform-invariant
enforcement) in `WORKER-SPEC.md` §14. TC numbers locked by the platform at merge.

## Worker-specific assertions

### Ownership chain tab (default)

- TC-101: First-visit user sees the Pinedale (9708 US-191) sample fixture, not an empty state
- TC-102: Every output carries the "general information — not certified for closing" disclaimer (RULE-02)
- TC-103: Marketable-status hero (Yes/No) renders adjacent to the parcel ID (Trump sub-C)
- TC-104: Chain renders newest-first; chain-completeness gap is declared (earliest verified transfer named, RULE-06)
- TC-105: A user-uploaded drone aerial renders with the unverified badge (Reagan Rule)

### Encumbrances tab

- TC-106: Lien-stack-as-bars renders $0 classes as zero-height green bars (clear at a glance)
- TC-107: Each encumbrance card carries recording number + book/page + date + status (RULE-04 provenance)

### Recorded docs tab

- TC-108: Every recorded instrument is retrieved via instrumentResolver — no fabricated instruments (EH-07)
- TC-109: Sample instruments carry verifyMethod: synthetic_for_demo_only (RULE-13)
- TC-110: Tax + judgment search status surfaces with a "current through" date (RULE-08 freshness)

### Rights stack tab

- TC-111: Stratum BANDS are earth-tone by elevation; CAS color appears ONLY on the per-stratum status badge
- TC-112: A detected severance (mineral 1978) renders as a below-ground band + RED "Severed" badge (RULE-05)
- TC-113: Every stratum checked is declared; unverified strata surface as BLUE action flags (EH-05 / RULE-07)

### Plain English tab

- TC-114: GREEN hero answer renders before any prose (Trump Rule — color before words)
- TC-115: Gap declaration always visible — chain gaps, unverified strata, un-indexed CC&Rs named (EH-03)

### Cross-cutting

- TC-116: Every Abstract writes a PLAT-008 compound-DTC receipt; anchor failure rolls back with 503 (RULE-03)
- TC-117: Every receipt stamps activePersonaId + accountId + walletTransactionId (AP-01)
- TC-118: A special tax district (Mello-Roos/CFD) surfaces annual cost + lifetime exposure when detected (RULE-11)

## Time budgets (treat as bugs if exceeded)

- Tier-Q Abstract (confirmed): chain + marketable status in < 30 seconds
- Tier-R Abstract (confirmed): full 5-tab canvas in < 90 seconds
- Cost projection (Phase 1): < 5 seconds
