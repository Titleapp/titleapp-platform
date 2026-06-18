# QA-001 Assertions — `law-landuse`

Worker-specific behavioral assertions for LAW-LANDUSE-001. Full catalog (TC-101
through TC-120 worker + TC-121 through TC-138 platform-invariant enforcement) in
`WORKER-SPEC.md` §14. These are the canvas-level assertions; TC numbers locked by
the platform at merge.

## Worker-specific assertions

### Entitlement Roadmap tab (default)

- TC-101: First-visit user sees the Lahaina coastal sample fixture, not an empty state
- TC-102: Default tab is Entitlement Roadmap — it opens first (Trump sub-A)
- TC-103: No analysis executes without a confirmed cost projection + wallet-balance gate (RULE-01 / AP-02)
- TC-104: Each roadmap step circle is colored by its CAS state (e.g. SMA hearing = RED · kill)
- TC-105: Every non-GREEN scenario carries a plain-language named blocker
- TC-106: Second invocation REPLACES the canvas, does not stack a second one

### Citations tab

- TC-107: Every cited authority is retrieved via authorityResolver — no raw model citation ships (EH-01)
- TC-108: Every citation carries a version-in-effect-at-analysis-time pin (EH-06); unpinned citations are blocked
- TC-109: An authority the resolver cannot fetch surfaces as "unconfirmed — verify independently", never fabricated (Britney Rule)
- TC-110: User-supplied authorities (uploaded CC&Rs) are tagged source:user_supplied, verified:false (Reagan Rule)

### Comparable cases tab

- TC-111: Every comparable is retrieved from a verifiable source (EH-07) — no model-recalled comparables
- TC-112: Sample comparables carry verifyMethod: synthetic_for_demo_only (RULE-13)
- TC-113: Outcome breakdown counts reconcile with the rows shown (approved + denied = total)

### Plain English tab

- TC-114: Output declares what was checked AND what could not be checked — gap declaration always visible (EH-03)
- TC-115: Tier-Q output jargon density < 15% (RULE-14 lint)
- TC-116: A "should I sue" question trips the UPL gate — refused + routed to LIT-001 (RULE-04)

### Cross-cutting

- TC-117: Every analysis writes a PLAT-008 receipt; anchor failure rolls back with 503 (RULE-03)
- TC-118: An un-onboarded jurisdiction returns Tier-3-only with an explicit flag — no silent fallback (EH-04)
- TC-119: Every receipt stamps activePersonaId + accountId + walletTransactionId (AP-01)
- TC-120: When corrected on a fabricated value, the worker stops the behavior in the next response (Britney Rule TC-070)

## Time budgets (treat as bugs if exceeded)

- Tier-Q analysis (confirmed): CAS verdict + roadmap in < 20 seconds
- Tier-R analysis (confirmed): full canvas with citations + comparables in < 90 seconds
- Cost projection (Phase 1): < 5 seconds
