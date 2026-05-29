# CODEX 51.21 — HR + IR Worker Polish + Worker Testing Thesis

**Session:** 2026-05-29 (Thursday evening)
**Sean's status:** Flying full-time, papering SOCIII formation, drafting Kent + Coinbase
**Branch:** main (uncommitted at session start, committed at end)
**Session type:** Maker session — started narrow (rewrite advisor email), grew into platform-level worker-testing reframe

## TL;DR

HR + IR workers polished to "demo-ready, manual-override-capable" state. Warm advisor + investor emails replace utilitarian Option 2 templates. IR voting end-to-end with `/invest/vote` UI page. Shared outreach template library extracted. HR namespace delegation endpoints added so HR worker is architecturally self-contained.

Mid-session reframe to **worker-testing as the real platform issue**: don't hire a human QA contractor (sycophancy bias caught and corrected), build QA-001 (Worker QA) as a SOCIII worker that QAs other workers — with an Intent Spec layer as the missing prerequisite that defines what "right" looks like before testing can verify it.

End-of-session strategic decision: **infrastructure-first**, with Aviation + RE workers as the polish-them-until-they-shine showcase use cases that prove the infrastructure works. 100-day all-in window before any pivot.

## Banked deliverables (deployed)

### Email tone rewrite
- `services/ir/advisorFlow.js` — `_advisorInviteEmail()` rewritten as warm 4-section prose:
  1. Welcome to the SOCIII ohana intro + terms + role
  2. ID check via Stripe Identity (SOCIII covers fee)
  3. Custom advisor deck + whitepaper inside portal
  4. Dropbox Sign packet heads-up from "Sean Lee Combs (SOCIII)" not impersonal hellosign
  Subject changed to `Welcome to the SOCIII ohana, {firstName}`.
- `services/ir/investorFlow.js` — `_investorInviteEmail()` mirrored with same warm 4-section structure. Securities-aware confidentiality footer. Subject `Welcome to SOCIII, {firstName} — pre-seed access`. Added `INVESTOR_DECK_URL`, `WHITEPAPER_URL`, `DATA_ROOM_URL` env constants.

### HR worker (PLAT-005) live
- `services/alex/catalogs/platform.json` — status flipped to `live`. Capability summary expanded to reflect unified roster + onboarding + schedule + compliance scope.
- 9 canvas tabs split by view:
  - HR view: people · onboarding · schedule · compliance · documents · notices
  - Member view: my-onboarding · my-documents · my-schedule
- `constraintRaasSources` → `platform_hr_compliance_v1` (required, load_when always)
- `controlCenterContribution` → `{ section: "people", kpis: [headcount_humans, headcount_digital, open_onboardings, compliance_obligations_open, coverage_healthy] }`
- `alexRegistration.priority` raised to `high`.

### HR services
- `services/hr/schedule.js` — schema + CRUD + `computeCoverage()` for humans + 24×7 digital workers. Default `DIGITAL_SHIFTS = [{dow:"*",start:"00:00",end:"24:00"}]`. Functions: `upsertSchedule`, `listSchedules`, `getSchedule`, `setStatus`, `addPto`, `computeCoverage`, `registerDigitalWorker`.
- `services/hr/people.js` — unified roster aggregator across `advisors/` + `hrSchedules/`. Read-only; no data duplication. Functions: `listPeople(tenantId, {type})`, `listOnboardings(tenantId)`, `getComplianceStatus(tenantId)`.

### HR compliance ruleset
- `raas/rulesets/platform_hr_compliance_v1.json` — 13 federal rules:
  - I-9 (hard_stop, 3 business days)
  - W-4 (hard_stop, before first payroll)
  - FLSA exempt vs non-exempt (soft_flag)
  - 1099 vs W-2 incl. CA AB5 (hard_stop)
  - ACA employer mandate (soft_flag)
  - FLSA recordkeeping 3yr (hard_stop)
  - Harassment training cadence (soft_flag)
  - OSHA general duty (soft_flag)
  - Required posters (hard_stop)
  - FMLA eligibility (soft_flag)
  - Final paycheck timing — state-specific (hard_stop)
  - COBRA notice (hard_stop)
  - Digital worker 24×7 (informational)
- State augmentations for US-CA, US-NY, US-TX.
- `loadStrategy: "federal_then_state"`.
- Cites: 8 U.S.C., 26 U.S.C., 29 C.F.R., CA Lab. Code, etc.

### IR voting (Snapshot-style weighted ballots)
- `services/ir/voting.js` — `fundraises/{id}/ballots/{ballotId}` with `snapshotShares` map locked at creation time. Functions: `createBallot`, `listBallots`, `getBallot`, `castVote` (idempotent, rejects post-close, updates before close), `tallyBallot`, `closeBallot`, `notifyBallot` (SendGrid fan-out), `snapshotCapTable`.
- Vote weights = `sharesIssued` at ballot open time; ineligible if shares acquired after.
- Email template with voting weight % + voting URL.

### BANK-FUND-001 (Fundraise) canvas tabs
- `services/alex/catalogs/banking-finance.json` — 10 canvas tabs:
  - Fundraise view: pipeline · progress · data-room · cap-table · governance · notices
  - Investor view: communication · voting · my-position · documents
- `controlCenterContribution` → `{ section: "capital_formation", kpis: [raise_target, raise_committed, raise_received, open_ballots, next_close] }`.

### /invest/vote UI page
- `apps/business/src/pages/InvestorVote.jsx` — Reads URL params (fundraise/ballot/investor). Signs in via Firebase Auth (returnTo support). GETs ballot, displays metrics (your shares + voting weight % + closes date), radio options, idempotent POST. Success state shows chosen option + note that re-votes before close update the choice. Closed-ballot + zero-shares edge states handled.
- Wired in `App.jsx` alongside `InvestorInquiry`.

### HR namespace delegation
- New endpoints `/v1/hr:advisor:initiate`, `/v1/hr:advisor:step`, `/v1/hr:advisor:status` delegate to `services/ir/advisorFlow.js`. IR namespace stays live for backwards-compat (Kent + aspensean tests + investor flow). HR worker now has a self-contained API surface.

### Canvas fixtures
- `apps/business/src/components/canvas/sampleData.js` — HR fixtures for all 9 tabs (realistic SOCIII roster: Kent closed, Eric pending, Scott KYC-complete + 4 digital workers). Fundraise fixtures for all 10 tabs (Storyhouse/Rosenberg/Kent network in pipeline, 60/15/12/10/3 cap table split, governance with open ballot demo, plus investor-view tabs).

### Shared outreach template library
- `services/_shared/outreachTemplates.js` — Frame (`emailFrame`), signature block, section heading, body paragraph, callout box, brand-link helper, securities-aware confidentiality footer with `general` + `investor` variants. Available for HR + Marketing flows without touching existing email templates.

### Documentation
- `docs/HR-IR-INSTALL-CHECKLIST.md` — Concrete browser dev-tools snippets for catalog→Firestore sync (`/v1/admin:workers:sync` with `workerIds: ["PLAT-005", "BANK-FUND-001"]`), smoke test checklists, end-to-end advisor invite + ballot vote tests.
- `docs/CONTROL-CENTER-DAILY-BRIEF-SPEC.md` — Spec for Control Center "Today" card. Three sections (morning brief / during-session / evening clock-out). Zero manual logging — data pulled from tasks, deploys, git, sessions.md. Fuzzy time accepted ("scope is S/M/L"). Weekly bucket roll-up (platform infra / legal-formation / specific workers / marketing / sales-comms). Implementation phases 1-3.

### Routes added to `functions/functions/index.js`
- IR voting: POST `/v1/ir:ballot:create`, `/ir:ballot:notify`, `/ir:ballot:vote`, `/ir:ballot:close` · GET `/ir:ballot:list`, `/ir:ballot:get`, `/ir:ballot:tally`
- HR schedule: POST `/v1/hr:schedule:upsert`, `/hr:schedule:pto`, `/hr:schedule:register-worker` · GET `/hr:schedule:list`, `/hr:schedule:coverage`
- HR people: GET `/v1/hr:people:list`, `/hr:onboarding:list`, `/hr:compliance:status`
- HR advisor delegation: POST `/v1/hr:advisor:initiate`, `/hr:advisor:step` · GET `/hr:advisor:status`

## Deployments

- `firebase deploy --only functions:api` — twice (HR+IR initial, then warm investor email + HR delegation)
- `firebase deploy --only hosting` — twice (with InvestorInquiry + fixtures, then with InvestorVote)
- All deploys clean. Function URL: https://api-feyfibglbq-uc.a.run.app

## NOT yet done

- **Catalog → Firestore sync** — `digitalWorkers/{slug}` mirror not yet updated for PLAT-005 + BANK-FUND-001. Run the browser-dev-tools snippet from `docs/HR-IR-INSTALL-CHECKLIST.md` tomorrow morning while logged in as `titleapp.core@gmail.com` (admin).
- **Install into sean@sociii.ai workspace** — Pending the sync above + marketplace subscription.
- **HR worker chat handler** — Falls through to Alex baseline; needs `platform-hr` in per-worker prompt registry.
- **QA-001 (Worker QA)** — Discussed at length, deferred to fresh session.
- **Intent Spec schema** — Discussed at length, deferred to fresh session.
- **Control Center daily brief card** — Spec written, implementation deferred.

## Mid-session reframe — worker testing thesis

### The problem named
Sean named the meta-problem mid-session: 8+ hours/day on mechanical UI testing is unsustainable, contradicts the AI thesis if solved with human contractors ("we need humans to babysit the AI"), and is the actual scaling bottleneck for 238 workers.

### Honest split
- ~70% mechanical (page renders, endpoints respond, fixtures load, chat replies, RAAS module loads, canvas tabs render without crash) — automatable via Playwright + endpoint smoke + LLM-as-judge
- ~25% behavioral (does the worker actually help, is chat tone right) — semi-automatable via LLM-as-judge against canonical prompts
- ~5% genuinely human (subjective UX feel) — but at template level (once per template), not per worker instance

### First reframe: don't hire humans, build a worker
QA-001 (Worker QA) becomes a SOCIII worker that QAs other workers. Sellable in marketplace to creators building their own workers. Flips investor pitch from "AI needs human babysitters" to "AI-built tooling QAs the AI workforce."

### Second reframe (Sean drove): Intent Spec is prerequisite
QA-001 needs an Intent Spec to test against. Without "what right looks like," QA is just "did it not crash" — which is what we have today. **Intent Spec schema proposed:**
```js
intent: {
  problem:        "Single sentence — user pain eliminated",
  userPersona:    "Who the primary user actually is",
  uxHates:        [ "things users hate about current state" ],
  uxLoves:        [ "patterns to preserve from current state" ],
  canonicalJourneys: [ { id, steps, expectedTabs } ],
  canvasNarrative: {                    // THE TWO-SCREEN MOVIE EFFECT
    <tabId>: {
      role:               "Picture-in-picture of X while we talk Y",
      supportsChatAbout:  [ "topics" ],
      whatUserFeels:      "Emotional reaction",
      missingWithoutIt:   "What chat experience loses",
    }
  },
  successCriteria: [ "measurable; LLM-as-judge tests against these" ],
  failureModes:    [ "known ways this worker can be unhelpful" ],
}
```

Lives in catalog JSON. RAAS layer *references* but doesn't own (RAAS = behavioral rules at runtime; Intent Spec = design contract pre-runtime).

### Patent angle
"Declarative agent intent specification with automated conformance testing — narrative canvas-tab roles + LLM-as-judge against canonical user journeys." Novel composition; folds into existing SOCIII patent family.

### Implications
- New workers: spec-first → reviewed → code built against spec → QA-001 validates → ship when green.
- Existing 238 workers: backfill retro-specs. Top 10 by usage first. Exposes workers without clear intention for revision or deprecation. ~30-60 min per worker.

## End-of-session strategic decision

**Infrastructure-first priority** (saved to `memory/project_infrastructure_first_priority.md`):

Platform infrastructure issues — sandbox isolation, build-without-code, Intent Spec layer, QA harness, worker orchestration, RAAS multi-tier loading — are the real moat and the real win.

Aviation + Real Estate workers exist to *prove* the infrastructure works. Sean is the credible SME for both (A&P mechanic + pilot, RE/title background), so demos are credible without the marketplace narrative. They are not the fallback. They are the showcase use cases that make the infrastructure story visible.

When prioritizing any session: **infrastructure work beats new-worker work, unless the new-worker work is Aviation or RE polish.** Marketing + IR matter because they automate Sean's outbound during a raise, but they are operational scaling, not the moat.

**100-day window:** all-in on platform + Aviation/RE polish. Evaluate at day 100. Pivot to vertical-only only if data demands.

## Sycophancy callout (feedback memory saved)

Sean called out Claude's first-pass response on the Manpretty hire question ("yes, cheap insurance, go ahead") as classic sycophant-bias agreement. Only after Sean challenged did the better reframe emerge (build QA worker, don't hire humans).

Saved as `feedback_first_pass_pushback.md`: **Give Sean the honest answer on first response. "Cheap insurance, go ahead" is the smell — stop and ask if there's a structural answer that makes the question irrelevant.**

## $5M-readiness honest answer

Demo-ready, not scale-ready. Right where you'd expect after 6 months — not failure. Of 238 catalog workers, ~10 have production-quality flows. No QA harness. Most workers' chat falls through to Alex baseline. Multi-tenant + RAAS isolation works with edge cases.

If $5M lands: hire 3-4 senior engineers + designer + QA lead. NOT 10 engineers to build 100 more workers (that's the death spiral — scales chaos faster than quality). Spec layer + QA harness + Worker Orchestration Layer must land before scaling team. They're the patent moat AND the prerequisite for sane scaling.

## Time tracking (memory + Control Center plan)

Sean asked if Claude tracks time. Honest answer: no wall-clock, only scope + markers Sean drops.

Proposed (spec at `docs/CONTROL-CENTER-DAILY-BRIEF-SPEC.md`):
- Morning brief: 3 candidate focuses + external clocks + "what would make today a win"
- During-session: scope-drift detection ("we came in for X, we're 90 min on Y")
- Evening clock-out: rough S/M/L scope estimate, banked vs in-flight, tomorrow first-look
- Weekly: bucket roll-up (platform infra / legal-formation / specific workers / marketing / sales-comms)
- Zero manual logging — pulled from tasks, deploys, git, memory
- Sean's evening commit/push pattern becomes the natural session boundary

## What stands out

**Big win mentioned by Sean:** Dropbox Sign automation + advisor letter capability. Two days ago this didn't work end-to-end. Now Kent + aspensean both signed cleanly, the email is warm, and the HR namespace exposes it as `/v1/hr:advisor:initiate`. That's the kind of capability that proves the platform can do real work — not just demo-render.

## Tomorrow's first-look

1. `git add -A` is done (committed at session end). Pull on aspensean@gmail.com side to confirm.
2. Run catalog sync snippet from `docs/HR-IR-INSTALL-CHECKLIST.md` (browser dev tools, ~30 sec).
3. Open `app.sociii.ai` as `sean@sociii.ai`, subscribe HR + Fundraise from Marketplace.
4. Smoke test canvas tabs render with fixtures.
5. Read `docs/CONTROL-CENTER-DAILY-BRIEF-SPEC.md` with coffee, decide if structure works.
6. If green, scaffold Phase 1 (sessions.md auto-write + external clocks file + Control Center card).
7. Move on to Intent Spec + QA-001 in a fresh session block (NOT stacked on tonight's session).

## Files touched

**New:**
- `functions/functions/raas/rulesets/platform_hr_compliance_v1.json`
- `functions/functions/services/hr/schedule.js`
- `functions/functions/services/hr/people.js`
- `functions/functions/services/ir/voting.js`
- `functions/functions/services/_shared/outreachTemplates.js`
- `apps/business/src/pages/InvestorInquiry.jsx`
- `apps/business/src/pages/InvestorVote.jsx`
- `docs/HR-IR-INSTALL-CHECKLIST.md`
- `docs/CONTROL-CENTER-DAILY-BRIEF-SPEC.md`

**Modified:**
- `functions/functions/index.js` (15 new routes)
- `functions/functions/services/ir/advisorFlow.js` (warm email + URL constant)
- `functions/functions/services/ir/investorFlow.js` (warm email + URL constants + tracking_settings)
- `functions/functions/services/alex/catalogs/platform.json` (HR worker live + canvas tabs + RAAS + control center)
- `functions/functions/services/alex/catalogs/banking-finance.json` (Fundraise canvas tabs + control center)
- `apps/business/src/App.jsx` (InvestorInquiry + InvestorVote routes)
- `apps/business/src/components/LandingPage.jsx` (investors link → /investors)
- `apps/business/src/pages/landing/LandingPage.jsx` (investors links → /investors)
- `apps/business/src/components/canvas/sampleData.js` (HR + Fundraise fixtures)
- `scripts/dogfoodAdvisorFlow.js` (test script tweaks)

## Memories added/updated

- `project_infrastructure_first_priority.md` (NEW) — Platform infra + sandbox/coding is the real win; Aviation + RE are showcase use cases.
- `feedback_first_pass_pushback.md` (NEW) — Give honest answer on first response; "cheap insurance go ahead" is the sycophancy smell.
- `sessions.md` — appended detailed session entry (2026-05-29).
- `MEMORY.md` — index updated with CODEX 51.21 + infrastructure-first + first-pass pushback pointers.
