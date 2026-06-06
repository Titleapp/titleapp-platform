# QA-001 Assertions — `site-recon`

Worker-specific assertions for SITE-RECON-001. The full 30-assertion catalog
lives in spec v1.1 §11 (QA-001 through QA-030); these are the canvas-level
behavioral assertions per the creator template. TC numbers assigned by the
platform at merge.

## Worker-specific assertions

### Opportunities tab

- TC-101: First-visit user sees the Pinedale sample fixture, not an empty state
- TC-102: No data pull executes without a confirmed cost projection (RULE-01 — Phase 1 quote, Phase 2 confirm)
- TC-103: Requesting more than 50 parcels returns LIMIT_EXCEEDED, not a truncated silent result (RULE-08)
- TC-104: A retired-APN parcel is REMOVED from the ranked list, not flagged (RULE-07)
- TC-105: Ranked order is verdict band (GREEN → YELLOW → RED), confidence descending within band
- TC-106: W-002 handoff button appears only on GREEN and YELLOW rows
- TC-107: Handing off the same parcel twice returns ALREADY_HANDED_OFF (per-APN idempotency)

### Historical tab

- TC-108: Assessor data older than 180 days shows the staleness badge AND caps the verdict at YELLOW (RULE-05)
- TC-109: A parcel with no sales history says so explicitly — never renders an empty table without explanation

### Feasibility tab

- TC-110: GREEN requires every core check to PASS — an unknown (unevaluated) core check caps the verdict at YELLOW
- TC-111: Verdict does not render before imagery is available to view; acknowledgment recorded as its own anchored audit record (RULE-17)
- TC-112: Every non-GREEN verdict carries a plain-language named blocker

### Cross-cutting

- TC-113: Every executed pull writes a PLAT-008 receipt; anchor failure rolls the response back with 503 AUDIT_ANCHOR_FAILED (RULE-03)
- TC-114: A fictional ZIP or unresolvable address refuses the search with a specific error and ZERO fees charged (RULE-11)
- TC-115: A search pattern flagged by the Fair Housing module refuses with the regulatory note — detector failure refuses too, never passes (RULE-12, fail closed)
- TC-116: Output never contains investment advice — feasibility signals and named blockers only (RULE-09)
- TC-117: Every parcel action (pull, acknowledgment, handoff) appears as a logbook entry on that parcel's Vault DTC, chronologically

## Time budgets (treat as bugs if exceeded)

- Single-address search (confirmed): ranked verdict in < 15 seconds
- 10-parcel area search (confirmed): ranked list in < 2 minutes (spec Intent benchmark)
- Cost projection (Phase 1): < 5 seconds
