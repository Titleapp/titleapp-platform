# CODEX 51.27 — QA-001 + Intent Spec Framework

**Author:** Sean + Claude · 2026-05-29
**Status:** Framing document. Implementation pending dedicated focus block.
**Predecessor context:** [CODEX-51.24](./CODEX-51.24-HR-IR-Polish-and-Worker-Testing-Thesis.md) introduced the worker-testing thesis. This doc formalizes the spec layer + QA worker design.

---

## TL;DR

Worker QA is currently 8+ hours/day of human eyeballing for Sean and unsustainable as the catalog grows past 238 workers. This document formalizes:

1. **Intent Spec** — declarative spec attached to every worker in the catalog defining problem, persona, UX likes/dislikes, canonical user journeys, canvas-narrative role per tab, success criteria, and failure modes. Lives in the catalog JSON. RAAS *references* it; doesn't own it.
2. **QA-001 (Worker QA)** — a SOCIII digital worker that reads any worker's Intent Spec and runs declarative conformance tests against it. Five test families. Outputs a PASS/FAIL report. Available in the marketplace as a sellable product for creators to validate workers before publishing.
3. **The patent claim** — the composition (declarative agent intent spec + LLM-as-judge against canonical journeys + canvas-narrative-role conformance + DOM-shape regression) is a novel agent-marketplace QA primitive that sits cleanly in the SOCIII patent family.

The two pieces are inseparable: QA-001 has nothing to test against without Intent Specs; Intent Specs have no enforcement mechanism without QA-001.

---

## Problem

### Current state of worker QA (2026-05-29)

The loop:
1. Build/modify worker → deploy → open browser → click around → screenshot what's broken → paste to Claude → Claude interprets pixels → propose fix → repeat.

This loop puts a human eyeball on the critical path for every iteration. The only sensor is Sean's retinas. The only signal is screenshots. Symptoms:
- 8+ hours/day on mechanical correctness checks (page renders, endpoints respond, fixtures load, chat replies)
- New workers regress old workers silently (no harness catches it)
- "Demo-ready" and "production-ready" are conflated because we can't measure the gap
- Worker count (238) outpaces Sean's ability to QA each one
- Hiring humans to QA contradicts the AI thesis ("we need humans to babysit the AI")

### What worker QA actually is (honest split)

- **~70% mechanical** — Does the page render? Do endpoints return 2xx? Do canvas tabs load fixtures? Does chat respond at all? Does the RAAS module load? Headless-browser + endpoint-smoke + LLM-judgable. Fully automatable.
- **~25% behavioral** — Does the worker actually help? Is chat tone right? Did the right RAAS module load? Are responses on-topic? LLM-as-judge against canonical prompts. Semi-automatable.
- **~5% subjective UX feel** — "Spacing's wrong," "label should be warmer." Genuinely human, but only at the template level (once per template, not per worker instance).

### Why we can't just write tests today

You can't test something if you can't articulate what "right" means. Today, most workers have a vague "do HR things" intent without:
- A crisp problem statement (what user pain this eliminates)
- A canonical user journey (what does the user actually do)
- A UX love/hate inventory (what current state must be preserved vs replaced)
- A functional contract (what this worker MUST do, measurably)
- A canvas narrative (what role each tab plays in the chat conversation — the "two-screen movie effect")

Without these, QA degenerates to "did it crash" — which is the test we have today. The Intent Spec IS the prerequisite. QA-001 reads from it; without it, there is no rubric.

---

## Architecture

```
┌────────────────────────────────────────┐
│       CATALOG (per-worker JSON)        │
│  • name, slug, suite, pricing, etc.    │
│  • canvasTabs                          │
│  • controlCenterContribution           │
│  • constraintRaasSources               │
│  • intent { ... }                  ◄── NEW
└──────────────┬─────────────────────────┘
               │
               │   reads intent spec
               ▼
┌────────────────────────────────────────┐
│       QA-001 (Worker QA)               │
│  Test families:                        │
│   1. Catalog ↔ Firestore parity        │
│   2. Headless Playwright canvas        │
│   3. Endpoint smoke                    │
│   4. Chat LLM-as-judge                 │
│   5. RAAS module load + isolation      │
│                                        │
│  Output: PASS/FAIL grid +              │
│   screenshot strip + judge findings    │
└────────────────────────────────────────┘
               │
               │   informs
               ▼
┌────────────────────────────────────────┐
│  Creator publishes worker → QA-001     │
│  runs → green → publish                │
└────────────────────────────────────────┘
```

---

## Part 1 — Intent Spec schema

Attached to each worker's catalog entry as a top-level `intent` block.

### Formal shape

```js
intent: {
  // Why this worker exists
  problem:        "Single sentence describing the user pain this worker eliminates",
  userPersona:    "Concrete persona, not generic. Who actually opens this worker daily?",

  // What we're replacing or preserving
  uxHates: [
    "Things users currently hate about how they do this task",
    "Patterns to NOT reintroduce when we replace those tools"
  ],
  uxLoves: [
    "Patterns from current tools that users like — preserve these",
    "Behaviors that signal product-market fit and shouldn't break"
  ],

  // What success looks like
  canonicalJourneys: [
    {
      id: "short-id",
      label: "Human-readable journey title",
      steps: [
        "User does X",
        "Worker responds Y",
        "Canvas shows Z",
        "User confirms W"
      ],
      expectedTabs: ["tab-id-1", "tab-id-2"],  // tabs that should be involved
      acceptanceProbe: "Question the worker should be able to answer about this journey"
    }
  ],

  // The two-screen movie effect
  canvasNarrative: {
    <tabId>: {
      role:              "One-sentence description of this tab's role in the chat experience",
      supportsChatAbout: ["topics the user might be discussing when this tab is the right visual"],
      whatUserFeels:     "Emotional reaction when they see this tab in context",
      missingWithoutIt:  "What the chat experience LOSES if this tab is absent"
    }
    // ...one entry per declared canvas tab
  },

  // Measurable acceptance
  successCriteria: [
    "Specific, testable assertions about what this worker MUST do correctly",
    "QA-001 evaluates LLM-as-judge against each criterion"
  ],

  // Known unhelpful patterns
  failureModes: [
    "Specific ways this worker can be unhelpful even if it technically works",
    "Regressions to watch for (e.g., 'falls through to Alex baseline')",
    "Domain-specific anti-patterns ('cites generic legal advice instead of state-specific rule')"
  ]
}
```

### The two-screen movie effect, formalized

Sean's framing: chat is dialogue. Canvas is the second screen — visual reinforcement that makes the dialogue feel alive, not like talking to a Slack bot. People are used to this from TV picture-in-picture and from screen-sharing during a video call.

Every canvas tab should have an articulated *narrative role*. Not "show stuff" — but: **what conversation does this tab support, what does the user feel when they see it, what would be MISSING from the chat experience if the tab weren't there.**

If a tab can't pass that test, the tab shouldn't exist. The Intent Spec makes this explicit before code is written.

### What lives WHERE

- **Catalog JSON** — owns `intent`. Source of truth. Human-readable for creators, machine-readable for QA-001.
- **RAAS layer** — *references* the Intent Spec (e.g., "this rule applies when the worker's intent includes financial advice"). Does not own it. RAAS is behavioral runtime; intent is design contract.
- **Firestore `digitalWorkers/{slug}` mirror** — gets a copy of `intent` synced from catalog so frontend + QA-001 can read without hitting the JSON.
- **Patent provisional family** — Intent Spec is the load-bearing primitive cited as novel composition.

---

## Part 2 — HR worker Intent Spec (concrete worked example)

Concrete instance of the schema for `platform-hr` (PLAT-005). Demonstrates that the spec is writable and produces useful constraints.

```js
{
  "id": "PLAT-005",
  "slug": "hr-people",
  // ...existing catalog fields...
  "intent": {
    "problem": "Founders and operators of small companies lose hours each week reconciling people-status across payroll, HRIS, scheduling, contractor logs, and compliance trackers, and they still miss filing deadlines that cost real money in penalties.",

    "userPersona": "Solo or near-solo founder/CEO running a 1-30 person company who has no full-time HR person and is currently paying $20-100K/year in HR software fees they barely use — plus eating compliance penalties they should have caught.",

    "uxHates": [
      "Flipping between 4 SaaS tools to answer one question about a single employee",
      "Compliance dashboards that surface threats without surfacing the action that resolves them",
      "Onboarding wizards that demand the same info in three places",
      "'See full report (PDF)' as the only way to view actual data",
      "Generic legal disclaimers instead of state-specific actionable guidance"
    ],
    "uxLoves": [
      "Knowing who's on shift right now without thinking",
      "Compliance items as actionable obligations, not anxiety triggers",
      "Treating digital workers as first-class team members (because they ARE)",
      "Single roster view across humans + contractors + advisors + AI workers"
    ],

    "canonicalJourneys": [
      {
        "id": "invite-advisor",
        "label": "Invite a new advisor and track onboarding to close",
        "steps": [
          "User says 'I want to bring on a new advisor at 0.5%'",
          "Worker confirms terms + asks for name/email/vertical",
          "Worker fires invite (delegates to advisorFlow)",
          "Onboarding tab updates with new pending entry",
          "User watches state advance: invited → ID-verified → signed → closed",
          "On close, People tab + cap table reflect the new advisor"
        ],
        "expectedTabs": ["people", "onboarding", "documents"],
        "acceptanceProbe": "Who's onboarding right now and what's blocking them?"
      },
      {
        "id": "coverage-check",
        "label": "Confirm someone is on the desk right now",
        "steps": [
          "User asks 'Is anyone covering customer success today?'",
          "Worker reads computeCoverage() result",
          "Schedule tab highlights current shift",
          "Worker answers in chat + tab pulses"
        ],
        "expectedTabs": ["schedule"],
        "acceptanceProbe": "Who is currently on shift and when does coverage gap?"
      },
      {
        "id": "compliance-triage",
        "label": "What HR action must I take this week to stay legal?",
        "steps": [
          "User asks 'What's overdue on HR compliance?'",
          "Worker reads platform_hr_compliance_v1 + tenant state",
          "Compliance tab shows obligations ranked hard_stop → soft_flag",
          "Worker proposes the single highest-priority action"
        ],
        "expectedTabs": ["compliance"],
        "acceptanceProbe": "What's my single highest-priority HR compliance action right now?"
      }
    ],

    "canvasNarrative": {
      "people": {
        "role": "Picture-in-picture of the team while we talk staffing or coverage. Roster always-visible.",
        "supportsChatAbout": ["who's on the team", "hiring status", "advisor pipeline", "digital workers in production"],
        "whatUserFeels": "Confidence — I can see everyone at once and nobody is hidden.",
        "missingWithoutIt": "Chat answers become walls of text listing names; user loses ambient awareness."
      },
      "onboarding": {
        "role": "Live pipeline of in-flight invitations across all people types. The 'what's cooking' view.",
        "supportsChatAbout": ["who's onboarding right now", "what's blocked", "what closes this week"],
        "whatUserFeels": "Calm — I know exactly where every invite is and what it's waiting on.",
        "missingWithoutIt": "Founder forgets about invites between meetings; loses candidates to slow follow-up."
      },
      "schedule": {
        "role": "Real-time coverage view — who's on, who's PTO, digital workers always-on.",
        "supportsChatAbout": ["who's working now", "coverage gaps", "PTO conflicts", "on-call rotations"],
        "whatUserFeels": "Operational clarity — I know we're covered before I leave for vacation.",
        "missingWithoutIt": "User can't trust answers about coverage; falls back to texting humans."
      },
      "compliance": {
        "role": "Open-obligation surface. Threats translated into actions with deadlines.",
        "supportsChatAbout": ["what's overdue", "what triggered this obligation", "how do I close it"],
        "whatUserFeels": "Resolution-oriented anxiety — I see the threat AND the action that kills it.",
        "missingWithoutIt": "Worker becomes a generic compliance chatbot; user ignores threats they don't trust."
      },
      "documents": {
        "role": "Agreement + signed-packet archive scoped to people-management documents.",
        "supportsChatAbout": ["pull up advisor X's signed agreement", "what's pending signature"],
        "whatUserFeels": "Audit-ready — everything is here, dated, attributable.",
        "missingWithoutIt": "User searches Drive / Gmail for documents; trust erodes."
      },
      "notices": {
        "role": "Audit log of HR-originated outbound communications (welcome emails, anniversary reminders, compliance digests).",
        "supportsChatAbout": ["what went out", "to whom", "when"],
        "whatUserFeels": "Visible accountability — I see exactly what my HR worker sent on my behalf.",
        "missingWithoutIt": "User suspects worker is going rogue with emails; trust collapse."
      },
      "my-onboarding": {
        "role": "Member-view: where YOU are in your own onboarding. Status visible at a glance.",
        "supportsChatAbout": ["what's left for me to do", "what's the next step"],
        "whatUserFeels": "Agency — I see what I need to do and how close I am to done.",
        "missingWithoutIt": "Invitee asks the inviter for status; defeats the point of self-serve onboarding."
      },
      "my-documents": {
        "role": "Member-view: YOUR signed agreements + HR documents, downloadable.",
        "supportsChatAbout": ["pull up my advisor agreement", "what did I sign"],
        "whatUserFeels": "Ownership — these are mine, I can access them anytime.",
        "missingWithoutIt": "Invitee emails inviter to ask for a copy of what they already signed."
      },
      "my-schedule": {
        "role": "Member-view: YOUR shifts, PTO balance, time-off requests.",
        "supportsChatAbout": ["how much PTO do I have", "request time off"],
        "whatUserFeels": "In control of my own time.",
        "missingWithoutIt": "Employees can't self-serve; manager fields PTO questions all week."
      }
    },

    "successCriteria": [
      "User asks 'Who's on team?' → response references both humans + digital workers + advisors and matches People tab roster",
      "User asks 'Is anyone covering X right now?' → response cites Schedule tab data + names specific person",
      "User asks 'What's overdue on compliance?' → response cites specific platform_hr_compliance_v1 rule + state augmentation",
      "User says 'Invite Alice as advisor' → worker confirms terms, asks for missing fields, fires advisor:initiate, surfaces in Onboarding tab",
      "Digital worker subscription event → automatically registers in HR schedule with 24×7 coverage",
      "Final paycheck timing question for CA termination → response cites CA Lab. Code § 201-203 specifically, not generic federal baseline"
    ],

    "failureModes": [
      "Chat falls through to Alex baseline (no per-worker prompt loaded)",
      "Generic 'consult an HR attorney' fallback instead of cited specific state rule",
      "Compliance tab shows generic warnings without specific obligation actions",
      "Canvas tabs decorative — render but don't update when chat asks relevant questions",
      "Roster missing digital workers (only shows humans)",
      "Advisor onboarding state doesn't reflect in Onboarding tab after invite",
      "Marketing-language disclaimer over-fires on non-HR responses (the disclaimer-cluster bug)"
    ]
  }
}
```

That's the worked example. ~120 lines of structured spec. From this, QA-001 can derive ~15-20 testable assertions.

---

## Part 3 — QA-001 (Worker QA) design

### What QA-001 is

A SOCIII digital worker like any other (catalog entry, canvas tabs, RAAS, etc). Its specific job: read a target worker's Intent Spec from the catalog and run declarative conformance tests against it.

### Five test families

QA-001 runs five distinct test families against a target worker. Each family produces PASS/FAIL/SKIP + evidence (screenshot, log excerpt, judge transcript).

#### Family 1 — Catalog ↔ Firestore parity

- Read catalog JSON for target worker
- Read `digitalWorkers/{slug}` Firestore doc
- Compare structural fields: status, canvasTabs (id/label/view/order), controlCenterContribution, constraintRaasSources, pricing
- PASS if mirror matches catalog. FAIL with diff if drift detected.
- This catches the exact bug we hit yesterday with HR + Fundraise sync.

#### Family 2 — Headless Playwright canvas walkthrough

- Spawn headless Chrome via Playwright
- Sign in as test user with the worker subscribed
- Navigate to worker home
- For each declared canvas tab:
  - Click into tab
  - Wait for render
  - Capture `console.log` / `console.error`
  - Screenshot
  - Assert: tab content rendered (DOM selector present), no console errors
- PASS if all tabs render. FAIL with specific tab + console excerpt.

#### Family 3 — Endpoint smoke

- For each declared canvasTab that has a backend endpoint (inferred from naming convention or explicit spec):
  - POST/GET sample payload via deployed API
  - Assert 2xx status
  - Assert response shape matches expected schema
- PASS if all endpoints return 2xx with valid shape.

#### Family 4 — Chat LLM-as-judge

- For each `successCriteria` entry + each `canonicalJourney.acceptanceProbe`:
  - Open chat against target worker
  - Send the probe question
  - Capture response
  - Pass response + criterion to Claude (judge model)
  - Judge returns: { passed: bool, reasoning: "...", evidence_quoted: "..." }
- Aggregate: PASS if 90% of criteria pass. FAIL with judge transcripts for failures.

#### Family 5 — RAAS module load + isolation

- Trigger a chat session against the target worker
- Inspect server-side log for "loaded RAAS module: <id>" line per declared `constraintRaasSources`
- PASS if all declared modules logged as loaded
- Also: send a deliberately off-topic prompt; assert worker stays in its lane (doesn't bleed into another worker's RAAS scope)

### Output format

After running all five families against a target worker, QA-001 produces a report at `qa-reports/{slug}-{YYYY-MM-DD}.md`:

```markdown
# QA Report — platform-hr — 2026-05-29

**Verdict:** READY (16/18 pass · 1 skip · 1 fail)

## Summary grid
| Family | Pass | Fail | Skip |
|---|---|---|---|
| Catalog↔FS parity | 4 | 0 | 0 |
| Canvas walkthrough | 8 | 1 | 0 |
| Endpoint smoke | 3 | 0 | 0 |
| Chat LLM-as-judge | 6 | 0 | 0 |
| RAAS load | 1 | 0 | 0 |

## Failures
### Canvas walkthrough — `my-schedule` tab
- DOM selector `[data-card="my-schedule"]` not present
- Console error: `TypeError: Cannot read property 'shifts' of null`
- Screenshot: qa-reports/screenshots/2026-05-29-hr-my-schedule.png
- Likely cause: fixture missing or unauthenticated read path

## Skips
### Endpoint smoke — `/v1/hr:schedule:pto`
- No sample payload defined in Intent Spec — add `endpointFixtures` block

## Recommended actions
1. Fix my-schedule renderer null-guard
2. Add PTO endpoint fixture for full coverage
```

The report is the artifact. Sean (or Manpretty, or any QA reviewer) reads the report — not the screenshots. The report is the source of truth for "is this worker shippable."

### Where QA-001 lives in the marketplace

QA-001 is itself a SOCIII worker — has a catalog entry, canvas tabs, pricing tier. Two surfaces:
- **Platform-internal** — runs on every catalog change for every worker. CI job. Sean's morning brief shows the overnight QA roll-up.
- **Marketplace creator-facing** — Creators run QA-001 against their own draft workers before publishing. "Click here to QA your worker — see the report, fix what's flagged, publish when green." Sold at a creator tier or bundled with Creator License.

The creator-facing surface IS the patent's commercial proof. We don't just claim the harness — we sell it.

### Canvas tabs for QA-001 itself (sketch)

- **runs** — recent QA reports (table of slug · date · verdict · failures)
- **dashboard** — roll-up across all workers (PASS rate, recent regressions, slowest tests)
- **rubric** — interactive: pick a worker, see its Intent Spec rendered, see which criteria pass/fail
- **regressions** — diff between two runs (catches "we made a UI change and it broke 5 other workers")
- **my-worker** (creator view) — drafts I'm QA'ing right now, status of each

---

## Part 4 — Patent claim sketch

Drop into the family alongside the existing 6 provisionals. Working title:

**"Declarative Agent Intent Specification with Automated Conformance Testing for AI Agent Marketplaces"**

Independent claim sketch:

> A system for automated quality assurance of AI agents in a marketplace, comprising:
>
> (a) a declarative intent specification stored as structured data associated with each agent, the specification including at least: a problem statement, a user persona, a set of canonical user journeys with acceptance probes, a per-visual-component narrative role definition, and a set of testable success criteria;
>
> (b) a conformance testing agent that reads the intent specification of a target agent and executes test families against the target agent including at least: structural parity testing between the agent's catalog representation and its runtime representation; headless browser walkthrough of declared visual components with console-error capture; endpoint reachability and response-shape validation; and large-language-model-as-judge evaluation of agent chat responses against the target agent's declared success criteria;
>
> (c) a report generator producing a structured conformance verdict including pass/fail status per test family, evidence artifacts, and recommended remediation actions;
>
> (d) wherein the per-visual-component narrative role definition includes at least: a description of the conversational role the component supports, a list of chat topics the component supports, and a description of what the chat experience loses if the component is absent.

Dependent claims would cover:
- The marketplace surface where third-party creators run conformance testing against their own draft agents prior to publication
- The dependency between the intent specification and a separate constraint-rules-engine layer
- The composition with a multi-tenant audit-log infrastructure
- The use of large-language-model-as-judge with rubric prompts derived from the intent specification's success criteria

Refers back to provisional 64/073,708 (RAAS Multi-Tier) and 64/073,693 (Knowledge Capture) for the dependency structure.

Filing cost: ~$130 small entity. Conversion deadline ~12 months out. **Recommend filing alongside the next provisional batch.**

---

## Part 5 — Implementation phases

When we sit down to build (next focused block, NOT today):

### Phase 0 — Schema lock + HR spec backfill
- Add `intent` to catalog JSON schema (formal JSON schema doc)
- Backfill HR worker's catalog entry with the Intent Spec from Part 2 above
- Sync to Firestore via `/v1/admin:workers:sync`
- **Estimate: S**

### Phase 1 — QA-001 catalog entry + canvas
- Catalog entry for QA-001 (slug `worker-qa`, suite Operations, status `development`)
- Canvas tabs (runs, dashboard, rubric, regressions, my-worker)
- Demo fixtures
- **Estimate: M**

### Phase 2 — Test family 1 (Catalog↔FS parity)
- Service: `services/qa/parityTest.js`
- Endpoint: `POST /v1/qa:run:parity` (body: `{ workerSlug }`)
- Output: report fragment
- **Estimate: S**

### Phase 3 — Test family 3 (Endpoint smoke)
- Service: `services/qa/endpointSmoke.js`
- Spec extension: workers declare `endpointFixtures` block in Intent Spec
- **Estimate: M**

### Phase 4 — Test family 5 (RAAS load)
- Hook into `augmentPromptWithChatContext` to emit RAAS-load log line
- Service reads recent logs to verify modules loaded
- **Estimate: S**

### Phase 5 — Test family 4 (Chat LLM-as-judge)
- Service: `services/qa/llmJudge.js`
- Judge prompt template derived from successCriteria + acceptanceProbe
- Cost-conscious: cache results, throttle re-runs
- **Estimate: M**

### Phase 6 — Test family 2 (Headless Playwright)
- Spin up Playwright runner (probably as separate Cloud Run service, not in main `api` function)
- Per-tab walkthrough + screenshot + console capture
- **Estimate: L**

### Phase 7 — Report renderer + marketplace surface
- `qa-reports/` directory in repo (committed reports as audit trail)
- Canvas UI for browsing reports
- Creator-facing "QA my draft worker" flow
- **Estimate: M**

### Phase 8 — CI integration
- Trigger QA-001 on every catalog change (Cloud Build hook)
- Morning brief in Control Center shows overnight roll-up
- Email alert on regression
- **Estimate: S**

Total scope: L-XL. Best executed across 2-3 focused work blocks (NOT on-call days, NOT end-of-session stacking).

---

## Open questions

These don't need to be answered to ship the framework, but they shape implementation:

1. **Where does QA-001 run?** Cloud Functions has timeout limits unfriendly to long Playwright runs. Probably a separate Cloud Run service or a Cloud Build job triggered by catalog changes.
2. **Cost ceiling for LLM-as-judge?** Running judge per criterion per worker per change = budget concern. Cache + throttle. Maybe judge only changed paths.
3. **Who can invoke QA-001?** Platform-internal CI is unauthenticated trigger. Creator-facing is creator-authenticated only against their own drafts.
4. **What's the "release" gate?** PASS required to flip catalog `status: "live"`? Or PASS strongly recommended but creator can override with attestation? Same question Sean's pattern has been "user-counsel attestation" — could be "creator-attestation" here.
5. **Regression detection across workers** — when a UI change breaks 5 unrelated workers, who triages? The dashboard surfaces it but doesn't fix it. Need a triage flow.
6. **Intent Spec versioning** — when a creator updates their spec, do old QA reports get invalidated? Add `intentVersion` field. Stale reports flagged.

---

## What changes about today's workflow once this lands

**Before (today):**
- Build worker → deploy → Sean clicks around → screenshots → Claude interprets → fix → repeat
- 8+ hrs/day on QA loops
- Regressions silent
- "Ready" is a gut call

**After (post-QA-001):**
- Build worker → deploy → QA-001 runs automatically → report renders → Sean reads report (~5 min)
- Failures pre-localized to exact tab/endpoint/criterion
- Regressions caught against last-green baseline
- "Ready" is a verdict, not a gut call
- Sean's role shifts from QA-er to verdict-reviewer + ambiguity-resolver

**Honest accounting:** This shifts ~7 of Sean's 8 daily QA hours to the harness. Remaining ~1 hour is for genuine ambiguity (judge disagrees with intuition, UX-feel calls, novel failure modes). That hour is high-leverage; the other 7 are not. That's the unlock.

---

## Decision needed before Phase 0 starts

1. **Confirm canvasNarrative is the right name** — or do we call it `tabRole` / `canvasPurpose` / something else? Naming is sticky once it ships.
2. **Confirm Intent Spec lives in catalog JSON** — or split into a sibling `intentSpecs/{slug}.json` file for readability when specs get long?
3. **Confirm patent filing intent** — file as standalone provisional, or fold into existing 64/073,708 (RAAS Multi-Tier) as a continuation-in-part?

These three decisions block Phase 0. Everything else can be deferred.

---

## Notes for the next session

When you sit down to build, start with Phase 0 (HR Intent Spec backfill in catalog). Run `/v1/admin:workers:sync` afterward. Verify it doesn't break the frontend canvas renderer. *Then* move to Phase 1.

Don't try to build all 8 phases in one sprint. The honest path is Phase 0-2 first session (gets parity testing live = real value), Phase 3-5 second session, Phase 6-7 third session. Each session ends with a committed shippable improvement.
