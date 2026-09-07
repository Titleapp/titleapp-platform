# CODEX S52.47 — Worker Functional Audit

**Status:** In progress · started 2026-09-06
**Owner:** Sean (direction) · Claude (execution)
**Scope:** every real Digital Worker across SOCIII, back-of-house and every vertical sold to customers

---

## Why this exists

Sean's directive, verbatim (2026-09-06): *"I haven't stress tested IVY at all. It's probably messed up... it's fair to assume she is at a very basic level of operational capability and we need to fix that asap."* Followed by: *"Sit in my SOCIII account and actually use the workers and see if they are functional. Because everyone is getting these workers when they sign up for SOCIII. So they need to be good. And right now they probably are not."* Then expanded to the full roster: *"I think you need to run this through all of the workers - especially the ones we are going to be selling. We need to uncover all of the issues - and there are many I'm sure."*

This is not the demo/persona QA pass from earlier in the week (see `project_pre_launch_punch_list.md` / the Preflight Check artifact) — that tested demo personas across apps. This tests the REAL workers a paying customer actually receives, at real operational depth.

**Working assumption going in, stated by Sean:** most of these are probably broken or running on generic fallback behavior, not the real thing. Report the unvarnished truth per worker — don't round up.

## The 3-question diagnostic, applied per worker

1. **Is basic chat actually working?** Not just replying — replying *correctly*, without mis-routing into broken tool calls, without hanging on ordinary messages. (Ivy's first real test failed this: a strategic briefing message caused a leaked/broken tool-call response — "No campaigns found matching query='2026'" — instead of an actual reply.)
2. **Is a real RAAS ruleset governing this worker, or is it silently on `DEFAULT_CHAT_RULES` fallback?** Precedent: `av-digital-logbook`'s compliance ruleset (`av_p01_digital_logbook_v0`) was already found this session to fail loading silently, falling back to generic rules — caught only via the live worker-health canary, not obvious from using the product. Assume every worker needs this same check.
3. **Does it have REAL working tool access to what it's supposed to integrate with** (social platforms for Marketing, bank feeds for Accounting, etc.) — or is that access frontend-only, with the worker itself unable to actually check or act on it?

Fix straightforward, scoped bugs in place when found. Flag bigger architectural gaps as follow-up work rather than attempting a redesign mid-audit.

## Audit order and status

| # | Worker | Persona | Why this priority | Status |
|---|---|---|---|---|
| 1 | Marketing & Content | Ivy | Already mid-campaign-planning, first real test already failed | **In progress** — chat mis-routing + possible hang found, full audit running |
| 2 | Accounting | Max | Back-of-house, queued next | Not started |
| 3 | HR & People | Jordan | Back-of-house | Not started |
| 4 | Contacts | Sage | Back-of-house | Not started |
| 5 | IR Worker | Reed | Back-of-house | Not started |
| 6 | Aviation suite (CoPilot/Dispatch/Av Mx) + `/demo/skye` | Skye | **Actually sold to customers** — highest real-world stakes | Not started |
| 7 | Title/Real-Estate suite (28 worker slugs) | Petra | **Actually sold to customers** — the original core business; no demo path confirmed yet, needs discovery | Not started |
| 8 | Nursing education + `/nursing-demo` | Hannah | **Actually sold to customers** — Ruthie's vertical | Not started |
| 9 | DPP suite | Elara | **Actually sold to customers** — Elise's vertical; demo/sandbox path not yet confirmed | Not started |

Alex (Chief of Staff) explicitly excluded from this pass — Sean's own assessment is that Alex already works acceptably.

## Rule going forward

Update this table (status column + a findings note per row) as each worker's audit completes — this doc is the persistent tracker for the whole effort, which is explicitly multi-session ("over the next day"). Don't let findings live only in chat history.
