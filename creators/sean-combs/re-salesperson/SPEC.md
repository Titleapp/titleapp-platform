# Worker: Real Estate Advocate
**Slug:** re-salesperson
**Vertical:** real-estate
**Status:** draft
**Last updated:** 2026-07-15

---

## The Grind (what problem this solves)
Licensed real estate agents spend more time on administrative overhead — building CMAs, tracking buyer and listing pipelines, managing disclosure checklists — than they do with clients. Every transaction involves the same set of documents and the same set of questions, yet agents assemble them from scratch each time. There is no system that knows where every deal is and what the next required step is.

## The Dream (what this worker looks like fully realized)
Jordan has 12 active buyers and 4 listings. She opens the Buyers tab Monday morning and the worker surfaces which buyers have been pre-approved and which haven't, with a one-tap nudge draft ready to send. She asks Alex to pull comps for a listing she's pricing — Alex runs a property lookup and tells her what sold within a half-mile in 90 days, then drafts a CMA narrative she can edit. When an offer comes in on her listing, she drops it into the chat; Alex walks her through every disclosure required in California, checks the contract dates for conflicts, and flags a missing contingency before Jordan's client signs. Nothing fabricated — every figure comes from the property record or the document in front of them.

## Milestone 1 (what's built today)
The worker exists in the platform with an intro in `WORKER_INTROS` covering listing prep, offer analysis, contract review, and disclosure requirements. `lookup_property` is callable via regex match on property addresses mentioned in chat. All canvas tabs (Pipeline, Listings, Buyers, Active Deals, Schedule, CMA Library) are empty shells — no fixture, no live data. No RAAS ruleset is mapped. No DTC. No API routes beyond `lookup_property`. This worker is the earliest-stage of the four real-estate workers.

---

## Who Uses It
**Primary user:** Licensed real estate agent managing listings, buyers, and active transactions
**Secondary users:** Transaction coordinators; team leads reviewing pipeline
**Org context:** solo agent to small brokerage team

## Inputs
- Property addresses (triggers `lookup_property`)
- Listing details and asking price (entered in chat)
- Offer documents (uploaded or described in chat)
- Buyer profiles and pre-approval status (entered in chat)
- State/jurisdiction (drives disclosure checklist)

## Outputs
- [ ] DTC records: not wired
- [ ] Logbook entries: not wired
- [ ] Canvas tabs: Pipeline (empty shell), Listings (empty shell), Buyers (empty shell), Active Deals (empty shell), Schedule (empty shell), CMA Library (empty shell)
- [ ] Documents / reports: CMA narrative (chat-drafted, not templated); disclosure checklist (chat-guided, not generated)
- [ ] Notifications: not wired

## Canvas Tabs
| Tab | Data Source | Status |
|-----|------------|--------|
| Pipeline | No data source wired | not built |
| Listings | No data source wired | not built |
| Buyers | No data source wired | not built |
| Active Deals | No data source wired | not built |
| Schedule | No data source wired | not built |
| CMA Library | No data source wired | not built |

## Alex Behavior
**What Alex asks:** What is the property address? Which state is the transaction in? Are you representing the buyer or seller?
**What Alex produces:** Property lookups via `lookup_property`, listing prep guidance, offer analysis walk-throughs, disclosure requirement checklists (knowledge-based, not from live documents), contract review commentary
**What Alex never does:** Fabricate property values, comparable sale prices, or transaction terms; give legal advice or guarantee that a disclosure checklist is complete for a specific jurisdiction without citing the source; represent a figure as a live data pull unless `lookup_property` returned it

## RAAS Rules
**Rulesets applied:** none — this is the primary gap for this worker
**Key constraints:**
- **Gap:** no ruleset mapped; Alex operates with no platform-level guardrails today
- When a ruleset is built, it must enforce: no fabricated comps, disclosure checklist must cite jurisdiction source, agent representation conflicts must be surfaced

## Sibling Worker Connections
| Direction | Worker | What's passed |
|-----------|--------|--------------|
| listed in | re-in-a-box bundle | pending — not yet wired |
| none wired | — | no active bundle connections |

---

## QA Gates
### Canvas
- [ ] All "live" tabs load from Firestore
- [ ] Empty state renders correctly (tabs are shells with no content, including no empty state messaging)

### Chat / Alex
- [x] Alex answers "what does this worker do?" correctly
- [ ] Alex uses worker data, not generic knowledge (no live data exists)
- [ ] Alex does not invent data (no RAAS rules to enforce this)

### Data Writes
- [ ] Using this worker creates at least one real Firestore record
- [ ] DTC records minted where declared (not wired)

### RAAS
- [ ] At least one RAAS rule applied and enforced (no ruleset mapped)
- [ ] Rule violations surface a visible signal (no rules to violate)

### Spec Completeness
- [x] Grind: complete
- [x] Dream: complete
- [x] Milestone 1: defined
- [x] Canvas tabs with data source declared
- [x] Alex behavior: complete
- [x] Sibling connections: declared
