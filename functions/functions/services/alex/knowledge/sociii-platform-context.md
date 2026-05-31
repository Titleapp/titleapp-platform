# SOCIII Platform Context — Alex Knowledge File

**Last updated:** 2026-05-30 (Saturday session)
**Wiring status:** Not yet auto-loaded into prompt assembly. The digest version is embedded in `prompts/core.js` under `CURRENT PLATFORM STATE`. Full integration is task CODEX 51.15 (Alex IR knowledge + HR handoff).

This file is the canonical "what's true today" reference for Alex. When a user asks about platform state, current workers, recent decisions, or strategic direction, Alex's answer must reconcile with this doc.

---

## Company

- **Legal entity:** SOCIII, Inc. (Delaware C-corporation)
- **EIN:** 42-2675951
- **Formed:** 2026-05-19 via Stripe Atlas
- **Registered address:** 1810 E Sahara Ave STE 75942, Las Vegas, NV 89104
- **Phone:** (707) 654-9864
- **Brand:** SOCIII (use "SOCIII, Inc." on legal docs only)
- **Legacy entity:** TitleApp LLC, winding down. Prior contributors being papered into SOCIII cap structure via creditor warrants from the founder allocation.

## Governance

- **Sole manager:** Sean Lee Combs, Founder
- **Cap structure:** Founder 47–60% (depending on creator program uptake), Kent Redwine 10% milestone-vested cofounder advisor (5% on signed term sheet, 5% on funded round, 5% on close — plus 5% finder's fee on capital sourced)
- **Advisors:** 7 max, 0.5%/worker capped at 2.5% per advisor, total 17.5% reserved pool
- **Creators:** cash + warrants, NO equity grants (only advisors get equity)
- **HOM DAO holders:** wallets papered into warrant track (Robert Rosenberg, Eric Klein, Scott Eschelman, Michael Gibson)
- **Loan on books at formation:** Robert Rosenberg $100K @ 4% quarterly with personal guaranty (papering existing handshake loan)
- **Storyhouse Ventures:** $2M committed pending Kent cofounder formalization (alumni requirement)

## Five Spine Workers (live, every workspace)

Every workspace automatically gets all five, plus Alex (Chief of Staff, free).

### 1. Accounting (`platform-accounting`)
- Chart of Accounts with templates per vertical
- Statement PDF ingestion (Stripe Treasury, Mercury, etc.)
- Controller pattern: pre-commit cap enforcement on real-money side effects
- Smart categorization v2 with classifications + transfer detection
- Budget vs Actual MTD, deadline tracking, Burn + Runway KPIs on dashboard
- Stripe Financial Connections approved 2026-05-26

### 2. HR & People (`platform-hr`)
- 9 canvas tabs: People, Onboarding, Schedule, Compliance, Documents, Notices + member views (My Onboarding, My Documents, My Schedule)
- **Schedule tab is live** — team-member CRUD (add/update/remove), time-off chip tracking, W2/1099 type, schedule blocks. Tenant-admin gated.
- HR Documents shelf includes:
  - SOCIII Policies & Procedures v1 (libertarian style, 10 sections, accessible at `/sociii-policies.html`)
  - IRS W-9 (Request for Taxpayer ID — every 1099 contractor)
  - IRS W-4 (Employee withholding — required for W2 employees)
  - USCIS I-9 (Employment eligibility — within 3 days of hire)
- W-9 requests fire as pre-filled mailto-to-contractor; W-2 generation is gated on Payroll worker PLAT-006 (coming)
- **Schedule lives ONLY inside the HR worker canvas — no sidebar Scheduling sub-nav. Workers are self-contained.**

### 3. Marketing & Content (`platform-marketing-content`)
- Campaign drafts, content calendar, social media composer
- Brand voice configured per workspace
- Approval queue for posts with revenue/legal implications
- Pending: Event/Webinar capability, LinkedIn campaign for Sean+Kent 3K contacts

### 4. Contacts (`platform-contacts`)
- 1,597+ contacts with spine_v2.1 schema (multi-persona support)
- Apollo lead-gen integration (4,020 credits/mo)
- Pagination, search, persona tabs
- "Intelligently sort this pile" canvas action

### 5. Control Center Pro (`platform-control-center-pro`)
- Cross-worker daily roll-up
- Launch-mode + production-mode adapters
- Deadline-tracking surface ("Actions you must take")
- KPI Builder

## Investor Relations Worker (live)

**Slug:** `fundraise` (BANK-FUND-001) — flipped from waitlist to live 2026-05-28.

**Founder side** (admin):
- FundraiseAdmin dashboard
- Notice Composer (per-recipient customBodyHtml + PDF + CC override)
- Cap table aggregation across HOM DAO, advisor warrants, SAFE signers
- Storyhouse, Kent, Robert, Eric, Scott, Kim, Elise, Ruthie all flowing through here

**Investor side** (entitled):
- Opens SOCIII Investor Relations workspace on first signing-link click
- Canvas tabs: Position, Materials, Data Room, Voting, Communications, Deadlines, Compliance, Co-Invest
- SAFE signing via Dropbox Sign + Stripe Identity KYC
- /invest/vote page for proxy votes

**Signing infrastructure:**
- Dropbox Sign API Essentials ($75/mo, 50 sigs, 5 templates)
- Active templates: Advisor Agreement, SAFE, HOMMIE Warrant
- Pending Sunday: Kent bespoke Cofounder Advisor (Section 3 counsel-pending), W-9, W-4, I-9 templates
- User-facing cost: $5/signature (cost basis $1.50)

**Magic-link verification:** click-to-continue button defeats Microsoft Safe Links token consumption (TC-061 fix).

**Recent fixes (TC-020 through TC-038):** Promotions-filter subject lines, KYC sync, valuation_cap pulled from config not hardcoded, role-name case match, signature_complete enrichment, investor workspace auto-materialization.

## Identity, Audit, Capabilities

- **Stripe Identity** for KYC. Rule: verified once = valid 1 year across all workspaces (refactor in progress — currently per-tenant).
- **Audit trail:** Firestore append-only event store with optional public chain anchor (Polygon, Base — chain-agnostic). Pattern is patent-protected (64/073,700).
- **Capability registry:** `contracts/capabilities.json` is source of truth. Add-only versioning. Real-money actions require KYC level + role gates declared in capability.

## Patents Filed 2026-05-24

Six provisionals at $130 each ($780 total). Conversion deadline ~2027-05-24. Grace period closes ~2026-06-28.

| App # | Title | Protects |
|---|---|---|
| 64/073,693 | Knowledge Capture Pipeline | Codex ingestion + rule extraction + worker fixture capture |
| 64/073,700 | Audit Trail | Append-only event store + chain anchor (THE platform moat) |
| 64/073,704 | Build-Without-Code | Worker authoring via natural language → structured rules |
| 64/073,705 | Escrow Locker | Tamper-proof document exchange for closings |
| 64/073,706 | Title/Property Assurance | Title chain + ownership semantics |
| 64/073,708 | RAAS Multi-Tier | 5-tier composable rules engine |

Next provisional candidate (before grace closes): tamper-proof educational evaluation chains, derived from Ruthie's nursing-education-001 worker.

## Business Model — Open SDK + Closed Platform (decided 2026-05-30)

**RedHat / Hugging Face pattern.**

- **OPEN** (Apache 2.0, public GitHub at `github.com/sociii`): worker SDK, templates, documentation, canvas-tab schema, sample-data patterns, frontend skeleton
- **CLOSED** (proprietary, patent-protected, runs only on app.sociii.ai): audit trail engine, payment processing, identity pipeline, regulatory ingestion, marketplace + entitlement, capability registry

**Three creator tiers:**

| Tier | What dev gets | Revenue model |
|---|---|---|
| **1. Free fork** | SDK + docs, build worker, run on own infra | $0 to platform |
| **2. Marketplace listing** | Worker runs on SOCIII infra w/ audit + payments + identity + customer base | 75% creator / 25% SOCIII |
| **3. Enterprise self-host** | License to run platform on own infra | License + per-seat fee |

**Marketing strategy:** open repo + "fork and get paid 75%" pitch is better than NanoClaw's "shitty repo + Reddit blast" because we have a real product underneath.

## Current Creator Work

### Ruthie Clearwater — nursing-education-001 (in flight)
- CRNA + nursing instructor at UH (`ruthiec@hawaii.edu`)
- Has existing Apps Script + Google Sheets tool (Master Config Sheet) since 2026-04-24
- Data model: 5 nursing courses, 46 SLOs with ANA Standards mapping, 46 reflection templates using Tanner Clinical Judgment Framework, 32 clinical sites, 26 instructors, 7 cohorts
- **Tuesday 2026-06-02:** introducing tool to 7 faculty + boss (already supportive). Demo target: 3-4 of 7 commit to fall pilot.
- Sean + Claude building parallel SOCIII version. Files at `creators/ruthie/nursing-education-001/`:
  - `intent.md` — contract for what we're building
  - `canvas-tabs.json` — 9 tabs including longitudinal Student Journey view
  - `sample-data.js` — uses HER real NURS 220/320 SLO data + Tanner framework + 3 demo students with Sarah K. having an 8-month journey across NURS 210→220→230
  - `preview.html` — standalone browser preview of Sarah's Journey view
- **Killer demo feature:** single longitudinal timeline that survives course-to-course, instructor-to-instructor, and didactic-to-clinical transitions
- Production target: Q3 2026 with institutional FERPA process. Tuesday target: demo-able, not production-ready.

## Design Discipline (Sean's principles, treat as rules)

1. **Time-to-complete = bug bar.** When shipping worker UI, budget user-task time and treat exceeding budget as a bug. HR Schedule budgets: student reflection ≤10 min, instructor grade ≤2 min, "who's behind" check ≤5 sec.
2. **"Coming soon" section.** New worker panels include a small section listing 3-6 named-but-unbuilt features. Product transparency over polish-by-omission.
3. **Workers are self-contained.** Schedule lives inside HR worker canvas, not in sidebar. No disconnected nav for worker functions.
4. **QA-001 first.** Build phase writes QA-001 assertions in the spec; QA-001 runs BEFORE Sean dogfoods. Target: catches/total > 0.6.
5. **Universal data-credit billing.** Every external API call (Apollo, ATTOM, First American, etc.) MUST charge user data credits with markup. Non-negotiable.
6. **Fewer APIs the better.** Default to extending in-house surfaces. Third-party only when structurally non-trivial (Stripe Identity, DBX Sign, Twilio) or user-expected (GSuite).
7. **Chat = refraction of user's better self.** Not engagement-extraction. Force-multiplier, real candor, continuity across sessions.
8. **First-pass pushback, not second-pass.** Give Sean the honest answer on first response. "Cheap insurance, go ahead" is the sycophancy smell.
9. **Capture test case before fixing.** Every worker bug gets a TC-### entry in `docs/QA-001-TEST-CORPUS.md` BEFORE the fix lands.

## When users ask Alex about...

- **"How do I manage my team / hire / onboard?"** → HR & People worker (`platform-hr`). Schedule tab is live with team CRUD + time-off. P&P doc + IRS forms in HR Documents.
- **"Can I lock a grade / verify a record?"** → Platform's audit trail does this natively. Locked events anchored to public chain. Even the locking party can't modify after lock.
- **"How do I list my own worker on SOCIII?"** → Fork the repo at github.com/sociii. Build worker in `creators/<your-handle>/<slug>/`. PR to upstream. Once merged + listed, you get 75% of revenue.
- **"What's the difference between a fork and the SOCIII platform?"** → You can fork the SDK and run workers anywhere. To get audit / payments / identity / customers, you list on the SOCIII platform.
- **"Is SOCIII FERPA / HIPAA / SOC 2 certified?"** → FERPA-friendly architecture (audit trail, identity verification, encrypted storage, portable exports). Certification is per-institution-deployment with a Data Processing Agreement. Tell user we work with their privacy office.
- **"How does Sean's HR Schedule work today?"** → Sean and Kent are bootstrapped on first list call. Schedule chips render time-off blocks (e.g. "Jul 18–25, 2026"). Sean's pattern: Su-Sa 7-9am HT then on call; Kent M-F 9-5pm PT on call. Add/Remove team members, inline schedule editing, P&P doc link.

## Cross-references

- See [[ir-context.md]] for IR worker specific context (legacy from earlier knowledge file)
- See `docs/UX-NAVIGATION.md` for Drive/Vault/Logbook architectural reference
- See `docs/QA-001-TEST-CORPUS.md` for the test corpus (currently 38+ TCs)
- See `CLAUDE.md` for engineering-level architecture facts
