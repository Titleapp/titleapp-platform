# Control Center — Daily Brief + Time Tracker (V1 spec)

**Author:** Sean + Claude · 2026-05-29
**Status:** Spec for review · build pending approval
**Why this exists:** Sean is ADHD-prone to hyperfocus. Loses track of where time went. Wants visibility without manual logging. Believes Control Center is the right home because (a) it dogfoods the platform, (b) Control Center is already where Sean looks each day, (c) the data already exists — we're aggregating, not creating.

## Design principles

1. **Zero manual logging.** All data pulled from existing sources (tasks, deploys, git, memory, session log). If Sean has to type to use it, it won't get used.
2. **Fuzzy time is fine.** Wall-clock isn't available; scope-based estimates (S/M/L, "roughly 2-3 hours") beat fake precision.
3. **Mis en place metaphor.** Morning prep, evening clean-up. Like a pilot's pre-flight + post-flight.
4. **Surface, don't preach.** Show the data. Don't tell Sean what to do with it.
5. **Counterweight to ADHD.** Detect scope drift mid-session. Surface "we came in for X, we're 90 min on Y."

## The card surface

A new Control Center card titled **"Today"**. Three sub-sections, top-to-bottom.

### 1. Morning brief (visible 6am-12pm, or until Sean clocks in)

```
Today · Friday, May 30 · Office mode

WHAT GOT BANKED YESTERDAY (3-5 bullets)
 ✓ HR + IR canvas tabs deployed
 ✓ /invest/vote page live
 ✓ Warm advisor + investor emails
 ✓ Shared outreach template library
 ✓ HR namespace delegation endpoints

WHAT'S IN FLIGHT (3-5 bullets, in_progress tasks)
 → Auto-dealer C-suite outreach campaign (#149)
 → SOCIII social channels (#251)
 → Apple Developer enrollment (#256, DUNS awaiting)
 → BIZ-LAW-001 dogfood TitleApp wind-down (#296)
 → SOCIII Accounting (#299)

TOP 3 CANDIDATE FOCUSES (ranked by deadline + strategic value)
 1. Catalog → Firestore sync + smoke-test HR/IR in sean@sociii.ai (10 min)
 2. Marketing worker grounding for weekend content drop (2-3h)
 3. QA-001 + Intent Spec scaffold (3-4h, fresh-mind work)

EXTERNAL CLOCKS TICKING
 ⏱ Patent grace period — 30 days remaining (closes ~Jun 28)
 ⏱ Coinbase Business KYB — pending underwriting
 ⏱ Apple Developer enrollment — DUNS in flight
 ⏱ SendGrid sociii.ai domain auth — multi-day
 ⏱ Stripe FC approval — Stripe review window

WHAT WOULD MAKE TODAY A WIN
 [Sean fills in one line at clock-in. Stored as state for evening review.]
```

### 2. During-session view (visible when Sean is "clocked in")

```
Clocked in · 2:14 PM · Working on: Marketing worker

SCOPE WATCH
 → Started: Marketing worker brand voice config
 → Current scope: Marketing brand voice + auto-dealer campaign generator
 → Drift level: medium (started narrow, expanded by one adjacent task)
 → Suggestion: bank current scope, queue auto-dealer for next session?

SESSION LIVE COUNTERS
 → Deploys this session: 0
 → Tasks completed: 1
 → Files modified: 4
 → Roughly: ~90 min of substantive work

INTERRUPTIONS
 [Sean can tap "stepping away" to pause the session timer for kids/flights/Kent calls.]
```

### 3. Evening clock-out (visible 5pm onward, or when Sean asks to commit)

```
Clocked out · 6:47 PM · 4h 12m active (rough)

BANKED TODAY
 ✓ Marketing worker brand voice config
 ✓ Auto-dealer campaign generator v0
 ✓ 12 LinkedIn post drafts queued for Saturday

IN FLIGHT (carrying to tomorrow)
 → Auto-dealer email sequence (3 of 5 drafted)
 → Marketing worker → spine snapshot wiring

PATTERN THIS WEEK (mini-roll-up)
 → Platform infra:     ~6h   (HR/IR endpoints, voting service, catalog sync)
 → Legal + formation:  ~4h   (advisor signing, Kent reconciliation, sessions.md)
 → Marketing:          ~3h   (today's brand voice + drafts)
 → Communications:     ~2h   (Kent emails, Coinbase response)
 → Side conversations: ~1h

TOMORROW FIRST-LOOK
 → Verify auto-dealer drip deployed correctly
 → Marketing worker UX polish before weekend content goes live

COMMIT? [Y/N] — if Y, runs git add -A + push + writes sessions.md entry.
```

## Data sources (what gets pulled, from where)

| Field | Source |
|---|---|
| Date / day-of-week | `currentDate` system context |
| Office vs flying mode | Manual tap (one-time per day) or pulled from Calendar if Aviation worker connected |
| What got banked yesterday | Last `sessions.md` entry's "Banked deliverables" bullets |
| In flight | TaskList filtered to `status: in_progress` |
| Top 3 focuses | TaskList ranked by: pending → has deadline → strategic-priority tag |
| External clocks | Hand-curated list in `docs/external-clocks.md` (Patent grace period, Coinbase KYB, etc.) — auto-decremented daily |
| "Win" line | Sean fills morning, recalled evening |
| Scope watch | Track session-opening intent vs current tool-call topics; flag drift via topic clustering |
| Deploys / tasks / files counters | Live counts as session progresses |
| Pattern this week | Aggregate sessions.md entries by topic bucket |
| Tomorrow first-look | Last 2-3 in-flight items or Sean's hand-jot |

## Time tracking — honest limits

Wall-clock is not available to me in real time. Approach:

- **Session boundaries** = first user message of conversation + Sean's "clocking out" / commit signal
- **Active time** ≈ session duration minus tagged interruptions
- **Per-task scope estimate** = honest S/M/L based on tool calls + scope complexity
- **Weekly bucket roll-up** = aggregated session topics from sessions.md, tagged into 5 buckets at session-write time

Fuzzy data is fine. The point is to surface *patterns* ("you spent 3 days on legal, 0 on Aviation worker — is that what you want?") not generate billable hours.

## What this is NOT

- Not a productivity guilt machine. No streaks, no nags about idle days.
- Not a Pomodoro timer. ADHD users don't respond well to forced rhythm.
- Not a calendar. It complements but doesn't replace your Calendar worker.
- Not a manager. It doesn't tell Sean what to do. It surfaces and asks.

## Implementation phases

**Phase 1 (1 day):**
- Sessions.md auto-write at commit time (already partially in place — formalize the template)
- External clocks markdown file + decrement script
- Control Center card with morning brief + evening clock-out views (no during-session view yet)
- Manual "what would make today a win" + "office mode" tap

**Phase 2 (1-2 days):**
- During-session scope-drift detection
- Live counters (deploys, tasks, files)
- "Stepping away" interruption tap
- Weekly bucket roll-up

**Phase 3 (later, integrates with QA-001):**
- Cross-worker time view (which workers consumed which session time)
- CEO worker reads the brief and pre-drafts the "win" line based on yesterday's incomplete work

## Success criteria

1. Sean can answer "where did my time go this week?" in 30 seconds, from one card.
2. Mid-session scope drift gets surfaced at least once per drifty session.
3. Morning brief takes <60 seconds to read.
4. Evening clock-out takes <2 min and produces a clean commit + journal entry.
5. After 4 weeks of use, Sean has data to make hire-vs-build / focus-vs-spread decisions.

## Failure modes to watch

- Card becomes ignored (not visible enough on Control Center) → solve with placement
- "Win" line becomes performative → drop it if not used 3 days running
- Bucket categorization is wrong → tunable taxonomy
- Sean games the data ("I'll just say marketing for everything") → diminishing returns, self-correcting

## Patent angle

"AI-assistant session telemetry with scope-drift detection and pattern roll-up for ADHD-prone executive use." Probably not its own provisional — folds into the CEO Worker family. Worth mentioning in CEO Worker's intent spec when we get to it.
