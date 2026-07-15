# Worker: Investor Relations
**Slug:** investor-relations
**Vertical:** real-estate
**Status:** draft
**Last updated:** 2026-07-15

---

## The Grind (what problem this solves)
General Partners raising a fund spend weeks manually assembling LP updates — pulling figures from spreadsheets, writing narrative, tracking who voted on what, and fielding the same questions from five different investors. There is no single place where deal performance, capital activity, and governance all live together. LP communications happen in email threads that disappear, and ballot records exist only in someone's inbox.

## The Dream (what this worker looks like fully realized)
Marcus closes a deal on a Thursday afternoon. By the time his first LP logs in Friday morning, the IR Worker has already updated the portfolio dashboard, posted a capital call notice with the waterfall preview, and queued a distribution memo for Marcus's approval. His LP, Diane, opens the chat and asks what her net IRR is across all three funds she's in — Alex pulls the live figures, cites the LP agreement, and surfaces the ballot she hasn't voted on yet, with a one-tap approval. Marcus has never drafted an LP update manually. His fund looks institutional from day one.

## Milestone 1 (what's built today)
Overview, Investors, Capital, and Governance canvas tabs load live data from Firestore via the `ir:canvas` route. The Governance tab surfaces open ballots in real time. Deal CRUD, investor onboarding, capital calls, distributions, waterfall, and compliance routes are all wired (30+ API routes). Ballot votes store a DTC hash when available. The Documents tab is fixture data. The `ir-worker-001` alias now correctly maps to the `investor-relations` RAAS ruleset.

---

## Who Uses It
**Primary user:** General Partner / fund manager raising capital from LPs
**Secondary users:** LPs reviewing their positions; fund administrators
**Org context:** solo GP to small team

## Inputs
- Deal records (created via deal CRUD routes)
- Investor onboarding data (name, commitment, LP agreement reference)
- Capital call and distribution events
- Ballot/governance items (created by GP, voted by LPs)

## Outputs
- [ ] DTC records: ballot votes — DTC hash stored when ballot is cast; mint path needs end-to-end verification
- [ ] Logbook entries: capital events (calls, distributions) appended as Firestore events
- [ ] Canvas tabs: Overview (KPIs + asset list, live), Investors (table, live), Capital (bar charts, live), Documents (fixture), Governance (open ballots, live)
- [ ] Documents / reports: LP update memos (planned, not yet templated)
- [ ] Notifications: not wired

## Canvas Tabs
| Tab | Data Source | Status |
|-----|------------|--------|
| Overview | Firestore via ir:canvas (kpis + asset list) | live |
| Investors | Firestore via ir:canvas (investor table) | live |
| Capital | Firestore via ir:canvas (bar chart data) | live |
| Documents | Hardcoded fixture | fixture |
| Governance | Firestore via ir:canvas (open ballots) | live |

## Alex Behavior
**What Alex asks:** Which fund or deal do you want to discuss? Who is the LP? What is the ballot question?
**What Alex produces:** Portfolio KPI summaries, capital call drafts, distribution memos, ballot status, LP-specific position breakdowns
**What Alex never does:** Guarantee returns or project future performance; cite LP rights without referencing the LP agreement on file; invent investor data not present in Firestore

## RAAS Rules
**Rulesets applied:** `ir_compliance_v0` (mapped to both `investor-relations` and `ir-worker-001` slugs)
**Key constraints:**
- LP data is confidential — never surface one LP's figures to another
- Capital call and distribution amounts must match waterfall calculation before commit
- Ballot results are immutable once the voting window closes

## Sibling Worker Connections
| Direction | Worker | What's passed |
|-----------|--------|--------------|
| receives from | fundraise / data room flow | deal file, investor commitments |
| internal alias | ir-worker-001 | canvas renders under both slugs |

---

## QA Gates
### Canvas
- [x] All "live" tabs load from Firestore
- [x] Empty state renders correctly

### Chat / Alex
- [x] Alex answers "what does this worker do?" correctly
- [x] Alex uses worker data, not generic knowledge
- [x] Alex does not invent data

### Data Writes
- [x] Using this worker creates at least one real Firestore record
- [ ] DTC records minted where declared (ballot DTC hash path needs end-to-end verification)

### RAAS
- [x] At least one RAAS rule applied and enforced
- [x] Rule violations surface a visible signal

### Spec Completeness
- [x] Grind: complete
- [x] Dream: complete
- [x] Milestone 1: defined
- [x] Canvas tabs with data source declared
- [x] Alex behavior: complete
- [x] Sibling connections: declared
