# QA-001 Assertions — `zoning`

Worker-specific behavioral assertions for ZONING-001 (consumer side). Full
catalog (TC-101 through TC-116 worker + TC-121 through TC-138 platform-invariant
enforcement) in `WORKER-SPEC.md` §14. TC numbers locked by the platform at merge.

## Worker-specific assertions

### Zoning verdict tab (default)

- TC-101: First-visit user sees the Lahaina coastal R-2 sample fixture, not an empty state
- TC-102: Every output carries the "general info — not legal advice; get a land use attorney" disclaimer (RULE-02)
- TC-103: Verdict triad color is readable before any text (Trump Rule — color before words)
- TC-104: A detected coastal/SMA permit requirement surfaces RED "required regardless" — never silently omitted (RULE-11)
- TC-105: Default-tab altitude — verdict + map + KPIs above the fold; stepper + badges below (3-second rule)

### Permitted uses tab

- TC-106: Every use card's code section is retrieved via the live resolver; resolver_required placeholders never ship (EH-01)
- TC-107: Each use is CAS-badged (by-right GREEN · conditional YELLOW · rezone RED) consistently with the verdict

### Overlays tab

- TC-108: Every overlay layer checked is declared; unverified overlays carry a named consequence (EH-05)
- TC-109: A detected HOA with un-indexed CC&Rs surfaces a BLUE upload affordance (RULE-07)
- TC-110: An embedded source video (planning-dept webinar) renders with its verified badge (Reagan Rule)

### Plain English tab

- TC-111: Output reads at a 7th-grade level — Tier-Q jargon density under threshold (RULE-08)
- TC-112: When stakes rise (discretionary / rezone / coastal), a "get a lawyer's opinion" escalation affordance is present (RULE-05)
- TC-113: STR / city-specific overlay gaps are declared as "verify with your city clerk", not silently filled (RULE-06)

### Cross-cutting

- TC-114: Every verdict writes a PLAT-008 receipt; anchor failure rolls back with 503 (RULE-03)
- TC-115: No verdict executes without a confirmed cost projection + wallet-balance gate (RULE-01 / AP-02)
- TC-116: A ZONING_UNAVAILABLE flip handoff from SITE-RECON-001 is accepted and resolves the parcel before proceeding

## Time budgets (treat as bugs if exceeded)

- Tier-Q verdict (confirmed): CAS verdict + cited section in < 20 seconds
- Cost projection (Phase 1): < 5 seconds
