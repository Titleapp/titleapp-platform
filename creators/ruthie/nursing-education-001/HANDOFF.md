# Hand-off to Ruthie — Nursing Education 001 worker

Sat 2026-05-30 build. Live at app.titleapp.ai (worker named "Nursing Education 001").

This doc gives you everything you need to keep building. Read it once. Save it.

---

## What you have right now

A working SOCIII worker that renders **your real Master Config Sheet data**:

- All 5 courses you authored (NURS 210/220/230/320/360)
- All 45 SLOs with criteria, mapped to ANA Standards
- All 45 reflection templates using the Tanner framework
- All 31 clinical sites, 25 instructors, 6 cohorts
- 8 demo students bootstrapped (replace with real students via invite flow — see below)
- Sarah K. has an 18-event longitudinal journey across NURS 210 → 220 → 230 demonstrating the multi-dimensional scoring you talked about (reflections + SLO observations + professionalism + attendance + clinical incidents)
- Audit trail with chain-anchored locked grades (the Nov 13 self-reported near-miss is intentionally framed as a STRENGTH, not a failure — per your insight that nuance matters)
- Alex (the chat) now knows what nursing education is and won't hallucinate fundraising vocabulary

---

## How to get back in

1. Go to **app.titleapp.ai** (this becomes **app.sociii.ai** Sunday)
2. Sign in with `ruthiec@hawaii.edu`
3. Switch to the SOCIII workspace (top of left sidebar)
4. Find **Nursing Education 001** in your My Workers list, or in the Marketplace under Education
5. Click to open

---

## Two ways to keep building

### Path A — Tell Sean what you want changed (this weekend)

This is the fastest path while we figure out long-term creator tooling. For things like:

- "Add a new SLO criterion to NURS 320 SLO 3"
- "Change the Tanner reflection prompts for NURS 220"
- "Add Dr. So-and-So as an instructor"
- "I want a new tab for X"
- "This column should show Y instead of Z"

Send Sean a note (email, text, whatever's easiest). Within 24 hours it ships. This is exactly how Sean built tonight's worker — you told him what mattered (longitudinal record, time-budget design, multi-dimensional scoring, security & FERPA) and he built to it.

**Quickest channel: email `sean@sociii.ai`** with subject line starting "Nursing worker:" — that auto-tags it.

### Path B — Build it yourself (Sunday onward)

For this you'll need:

1. **An Anthropic Team seat** — Sean is creating SOCIII's Anthropic Team plan Sunday and inviting you. You'll get a `ruthie@sociii.ai` email + login to Claude/Claude Code.

2. **GitHub access** — the SOCIII codebase is public at `github.com/Titleapp/titleapp-platform` (moving to `github.com/sociii-Inc/sociii-platform` Sunday). You can fork it under your GitHub account.

3. **Claude Code on your Mac** — Anthropic's command-line AI pair programmer. Install:
   ```
   npm install -g @anthropic-ai/claude-code
   claude /login
   ```
   Then `cd` into your fork and run `claude`. It reads the codebase and helps you make changes.

4. **Your worker's directory**:
   ```
   creators/ruthie/nursing-education-001/
   ├── intent.md          ← what this worker is for (read this first)
   ├── canvas-tabs.json   ← the tabs you see at the top of the worker
   ├── data.json          ← your Master Config Sheet, exported
   ├── sample-data.js     ← used by the React panel
   └── preview-*.html     ← visual previews of student + instructor views
   ```

   Changes to your worker go here. When ready, open a Pull Request to upstream. Sean reviews + merges.

5. **The build pattern** — read `docs/CREATOR-WORKER-BUILD.md` in the repo. It explains the 5-file worker structure (intent → canvas tabs → service → sample data → tests).

---

## What's NOT yet working (be honest)

Sean and Claude shipped a first-step version tonight. Known gaps:

| Gap | When it ships |
|---|---|
| **Cross-linking between cards** — clicking SLO 7.0 should drill into the SLO definition. Clicking "Hale Makua (LTC)" should drill into the site. Right now nothing is clickable. | Sunday |
| **RAAS rule pack for nursing** — your worker has data + UI but no rule engine enforcing your domain rules (Tanner structure, ANA mapping, grade-lock prereqs, FERPA constraints). | Sunday — you author the rules, Sean wires them |
| **Student-facing view** — what Sarah sees when she logs in. A preview exists at `creators/ruthie/nursing-education-001/preview-student.html` but it's not in the platform yet. | Sunday |
| **Glossary tooltips** — hover over "SLO" / "Tanner" / "ANA" to see definitions for someone who doesn't know nursing | Sunday |
| **Real student onboarding** — invite real students via the same flow we ship for advisors/investors (email → Stripe Identity KYC → academic-record DTC in their personal Vault → entitled membership to Clearwater Nursing) | Sunday backend wire — UI ships next week |
| **Multi-cohort views** — only ASN20 shows demo data; BSN01-04 are scaffolded but empty | When you have real students |

---

## What you should think about between now and Tuesday

For your faculty session:

1. **Pick the moment** — what's the 60-second story? Sean's recommendation (from tonight's chat) is:
   - "Here's Sarah — let me show you her journey." → longitudinal timeline (the hook)
   - Ask Alex: "where is Sarah struggling?" → grounded answer pulled from her data
   - Show one reflection rendered in Tanner framework
   - Lock a grade → audit trail → "even I can't change this now"
   - "Pilot with me next semester?"

2. **Decide on Sarah** — the demo persona is currently named "Sarah K." Want to swap to a real (anonymized) student? Or keep Sarah K.? Easy change.

3. **Branding** — the worker is currently just "Nursing Education 001". Want to call it something else? "Clearwater Nursing Education"? Something portable like "Lokahi"? "Hoailona"? Let Sean know by Sunday and he'll swap it.

4. **Anything to add or change before Tuesday** — tell Sean now, ships before 5pm Sunday.

---

## How the broader story fits

What Sean is building (SOCIII) is a platform where domain experts like you build AI workers and get paid 75% of every dollar your worker generates. Right now there are no other creator workers live — you're the first. The pattern your worker proves (longitudinal record + multi-dimensional scoring + tamper-proof audit) generalizes to every regulated profession with continuing education: medicine, aviation, law, real estate, accounting.

The win for you isn't just Tuesday's faculty session. It's eventually:

- Your nursing program licenses this as their official student record system → you get revenue
- Other nursing programs adopt the same template → you get revenue from each
- The pattern extends to non-nursing health professions (PT, OT, respiratory therapy, EMS, etc.) → you license it as a framework

That's the bigger picture. Tuesday is the proof point.

---

## If something breaks

Email `sean@sociii.ai` (subject line: "Nursing worker: [what's broken]"). Sean has the keys to fix anything in real time.

If Sean is on a flight or asleep, the platform itself is resilient — locked grades stay locked, data stays in the audit trail, nothing gets lost. Worst case the worker UI is slow or missing — your data is safe.

---

## One last thing

You arrived with the right instincts. The Tanner framework, the ANA mapping, the audit log from day one, the multi-dimensional thinking — all of that is hard for most people to see, and you saw it. The platform is built around your instincts being right.

Thanks for letting us build with you.

— Sean + Claude
