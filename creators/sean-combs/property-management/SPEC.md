# Worker: Property Manager
**Slug:** property-management
**Vertical:** real-estate
**Status:** draft
**Last updated:** 2026-07-15

---

## The Grind (what problem this solves)
Independent property managers juggle Fair Housing compliance, eviction cure windows, maintenance tickets, and lease renewals across a portfolio — mostly in their head or in a folder of spreadsheets. One wrong screening question costs them a federal complaint. One missed cure-period deadline turns a correctable nonpayment into a contested eviction. There is no system that holds them to the right rules automatically.

## The Dream (what this worker looks like fully realized)
David manages 40 units across three buildings. On Tuesday a tenant texts about a broken heater — David opens the chat, logs the ticket, and Alex reminds him that habitability maintenance has a 24-hour response clock in California (with the statute cited). On Thursday he starts screening a new applicant. Alex walks him through the questions he can and cannot ask, flags a phrasing in his standard email as a Fair Housing risk, and stops him before he sends it. When a tenant goes 10 days without paying rent, the Evictions tab surfaces the correct cure window for that unit's state, pre-filled with the tenant's name and the amount owed. David never has to look up a statute. The rules are already inside the worker.

## Milestone 1 (what's built today)
The RAAS ruleset `property_manager_v1` is the most comprehensive of all five real-estate worker rulesets: Fair Housing hard stops are enforced in chat, eviction cure windows are surfaced with statute citations, and discriminatory screening patterns are matched and blocked. Alex responds to property management questions within these guardrails. All canvas tabs (Properties, Lease-Up, Screening, Maintenance, Evictions, Compliance) render with fixture data hardcoded in `PropertyManagerCanvas.jsx`. No API routes for tenant, lease, or maintenance data exist yet. No live Firestore data flows into any tab. DTC is not wired.

---

## Who Uses It
**Primary user:** Residential property manager overseeing a portfolio of rental units
**Secondary users:** Landlords self-managing a small number of units
**Org context:** solo / small team

## Inputs
- Tenant names and unit assignments (entered in chat today; no form/route yet)
- Lease terms (entered in chat today)
- Maintenance requests (described in chat)
- Screening questions the manager intends to ask
- State/jurisdiction of each property (drives cure window and statute lookups)

## Outputs
- [ ] DTC records: not wired
- [ ] Logbook entries: not wired
- [ ] Canvas tabs: Properties (fixture), Lease-Up (fixture), Screening (fixture), Maintenance (fixture), Evictions (fixture), Compliance (fixture)
- [ ] Documents / reports: eviction notice templates (planned, not built)
- [ ] Notifications: not wired

## Canvas Tabs
| Tab | Data Source | Status |
|-----|------------|--------|
| Properties | Hardcoded fixture in PropertyManagerCanvas.jsx | fixture |
| Lease-Up | Hardcoded fixture | fixture |
| Screening | Hardcoded fixture | fixture |
| Maintenance | Hardcoded fixture | fixture |
| Evictions | Hardcoded fixture | fixture |
| Compliance | Hardcoded fixture | fixture |

## Alex Behavior
**What Alex asks:** Which property and unit? What state is the property in? What is the tenant's situation?
**What Alex produces:** Fair Housing-compliant screening guidance, eviction cure window with statute citation, maintenance response timelines, lease renewal checklists
**What Alex never does:** Advise on discriminatory screening criteria; recommend lockouts or self-help eviction; give specific legal guarantees; cite eviction cure windows without citing the applicable state statute

## RAAS Rules
**Rulesets applied:** `property_manager_v1` (mapped to `property-management` and `property-management-001`)
**Key constraints:**
- Fair Housing violations = hard stop; the question or action is blocked with an explanation
- Eviction cure windows vary by state; Alex must cite the statute, not a generic number
- Discriminatory screening pattern-match runs on any screening-related chat input before a response is generated

## Sibling Worker Connections
| Direction | Worker | What's passed |
|-----------|--------|--------------|
| none declared | — | standalone worker; no bundle shapes wired |

---

## QA Gates
### Canvas
- [ ] All "live" tabs load from Firestore
- [x] Empty state renders correctly (fixture renders without error)

### Chat / Alex
- [x] Alex answers "what does this worker do?" correctly
- [ ] Alex uses worker data, not generic knowledge (no live data to use)
- [x] Alex does not invent data (RAAS rules constrain fabrication in this domain)

### Data Writes
- [ ] Using this worker creates at least one real Firestore record
- [ ] DTC records minted where declared (not wired)

### RAAS
- [x] At least one RAAS rule applied and enforced
- [x] Rule violations surface a visible signal (Fair Housing hard stop messages appear in chat)

### Spec Completeness
- [x] Grind: complete
- [x] Dream: complete
- [x] Milestone 1: defined
- [x] Canvas tabs with data source declared
- [x] Alex behavior: complete
- [x] Sibling connections: declared
