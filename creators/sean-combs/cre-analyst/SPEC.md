# Worker: CRE Analyst
**Slug:** cre-analyst
**Vertical:** real-estate
**Status:** draft
**Last updated:** 2026-07-15

---

## The Grind (what problem this solves)
Acquisitions analysts spend the first two hours on any deal just gathering data — pulling ATTOM comps, building a preliminary underwriting model, and checking whether the basics (rent roll, T12, offering memo) are even present before the team wastes time on a dead deal. Deals that should die in 20 minutes live for two weeks because the screening is manual and inconsistent across analysts.

## The Dream (what this worker looks like fully realized)
Sarah drops a property address into the chat on Monday morning. Within seconds the Deal Screen tab populates with ATTOM comps, the map pins the parcel, and Alex flags that the rent roll is missing before Sarah has even asked. The RAAS engine refuses to produce an underwriting model without it — hard stop, no workaround. Sarah uploads the rent roll; Alex runs the DSCR and LTV against the tenant's configured thresholds, surfaces a yellow flag on WALT, and drafts a one-page Decision Memo for the investment committee. The IC meeting happens Wednesday. The deal was dead or alive by Monday at noon.

## Milestone 1 (what's built today)
The Deal Screen tab loads live ATTOM batch data via `buildCreCanvas` when a deal record is present. The Map tab loads live ATTOM data when a deal is present. `find_distressed_cre` and `find_cre_contacts` chat tools are wired and callable. `lookup_property` is available via regex match. The `cre-analyst-001` and `cre-deal-analyst` aliases now map to the `cre_deal_screen_v0` RAAS ruleset. Underwriting, Sensitivity, Capital Stack, and Decision Memo tabs are fixture data.

---

## Who Uses It
**Primary user:** CRE investor / acquisitions analyst screening commercial real estate deals
**Secondary users:** Asset managers reviewing held assets; brokers running preliminary comps
**Org context:** solo investor to small acquisitions team

## Inputs
- Property address or parcel identifier
- Deal documents: rent roll, T12 operating statement, offering memo (required by RAAS before underwriting)
- Tenant-configured LTV and DSCR thresholds
- ATTOM data pulled automatically when deal record is present

## Outputs
- [ ] DTC records: not wired
- [ ] Logbook entries: not wired
- [ ] Canvas tabs: Deal Screen (live via ATTOM when deal present), Underwriting (fixture), Sensitivity (fixture), Capital Stack (fixture), Decision Memo (fixture), Map (live via ATTOM when deal present)
- [ ] Documents / reports: Decision Memo (fixture today; templated output planned)
- [ ] Notifications: not wired

## Canvas Tabs
| Tab | Data Source | Status |
|-----|------------|--------|
| Deal Screen | ATTOM batch data via buildCreCanvas | live (when deal present) |
| Underwriting | Hardcoded fixture | fixture |
| Sensitivity | Hardcoded fixture | fixture |
| Capital Stack | Hardcoded fixture | fixture |
| Decision Memo | Hardcoded fixture | fixture |
| Map | ATTOM parcel data | live (when deal present) |

## Alex Behavior
**What Alex asks:** What is the property address? Have you uploaded the rent roll, T12, and offering memo?
**What Alex produces:** Distressed CRE searches, contact lookups, property data pull, preliminary DSCR/LTV flags once docs are present
**What Alex never does:** Fabricate deal metrics, comps, or underwriting figures; produce an underwriting model without the required core documents (RAAS hard stop); guarantee any investment outcome

## RAAS Rules
**Rulesets applied:** `cre_deal_screen_v0` (mapped to `cre-analyst`, `cre-analyst-001`, and `cre-deal-analyst`)
**Key constraints:**
- Missing rent roll, T12, or offering memo = hard stop; no underwriting produced until docs are present
- LTV and DSCR thresholds are tenant-configurable; violations flag but do not hard-stop by default
- Single-tenant occupancy and short WALT are soft flags surfaced to the analyst
- **Gap:** no chat rules are currently in the ruleset — Alex operates without chat-layer guardrails today

## Sibling Worker Connections
| Direction | Worker | What's passed |
|-----------|--------|--------------|
| accepts | Title Abstract | parcel-bundle/v1 |
| accepts | Site Recon | site-recon-bundle/v1 |
| accepts | Zoning | zoning-bundle/v1 |
| accepts | Law / Land Use | legal-opinion-bundle/v1 |
| accepts | Feasibility | feasibility-roadmap/v1 |
| emits | downstream deal flow | parcel-bundle/v1 |

---

## QA Gates
### Canvas
- [ ] All "live" tabs load from Firestore
- [x] Empty state renders correctly

### Chat / Alex
- [x] Alex answers "what does this worker do?" correctly
- [x] Alex uses worker data, not generic knowledge
- [ ] Alex does not invent data (no chat rules in ruleset — gap)

### Data Writes
- [ ] Using this worker creates at least one real Firestore record
- [ ] DTC records minted where declared (not wired)

### RAAS
- [x] At least one RAAS rule applied and enforced
- [ ] Rule violations surface a visible signal (chat-layer rules not present)

### Spec Completeness
- [x] Grind: complete
- [x] Dream: complete
- [x] Milestone 1: defined
- [x] Canvas tabs with data source declared
- [x] Alex behavior: complete
- [x] Sibling connections: declared
