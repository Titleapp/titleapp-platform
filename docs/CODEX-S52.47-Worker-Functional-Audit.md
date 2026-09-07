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
| 1 | Marketing & Content | Ivy | Already mid-campaign-planning, first real test already failed | **Fixed and committed 2026-09-06** (`56bbf5a4`). Error-leak bug fixed (no more raw "No campaigns found matching query=..." dumps — live-verified). Added `check_linkedin_status`/`tiktok`/`x`/`youtube` tools, strictly scoped to the authenticated request's own uid, no posting/publish tool (publishing stays human-gated per RAAS's prompt-only enforcement). **Live-verified**: asked Ivy "is LinkedIn connected?" → correctly replied "LinkedIn is connected — account on file is Sean Combs." real data, no hallucination. RAAS ruleset: genuinely fine, `platform_marketing_v1` correctly loaded, not a fallback. **New cross-cutting bug found and Sean-confirmed as already-known**: the chat panel sometimes shows a stale header/worker mismatch (e.g. "Alex · Chief of Staff" header while displaying a previous Ivy conversation) — happens "frequently, especially with back-of-house workers" per Sean; root cause not yet investigated, likely a frontend state bug in `ChatPanel.jsx` not resetting the thread when switching workers. Not yet scoped/fixed. |
| 2 | Accounting | Max | Back-of-house, queued next | **Audited 2026-09-07.** Chat: basic round-trip works cleanly (verified). Real financial question ("cash position, overdue bills?") got a genuinely well-calibrated answer — correctly caveated "-$57,993 is a computed estimate from recorded transactions, not a confirmed bank balance since no live bank account is on file" and "no bills currently recorded, bills module not populated" rather than hallucinating. Setup is still 0 of 6 complete (no bank connected, no balance sheet on file) — matches earlier finding, unchanged. **New bug found, NOT the same as Ivy's fix, NOT yet root-caused**: a dense multi-part audit-style request (the kind that triggers Max's special CODEX S52.49 "multi-round verification loop" SSE path, `index.js` ~L8020-8070, unique to `platform-accounting`) produced a raw client-side JSON-parse error surfaced directly to the user: `Unexpected token 'd', "data: {"pr"... is not valid JSON`. The error text itself (still showing the `data: ` SSE prefix) suggests something in that verification-loop's progress-streaming path writes or re-parses a line without stripping the prefix somewhere outside the client's normal (correctly-guarded) SSE loop — exact mechanism not confirmed in the time available; did not attempt a blind patch to shared streaming code. Reproducible: send Max a message with multiple pseudo-headers/multi-part asks. RAAS ruleset: confirmed fine — `platform-accounting` → `platform_accounting_v1`, file exists and is valid JSON, not a fallback. Integration access: Stripe is wired at the platform/billing level (webhooks, checkout, subscriptions all real) but **Max has zero chat-callable Stripe tool** — Sean's belief that Max already has Stripe access is incorrect for conversational use. Did not add a `check_stripe_status` tool this pass (unlike Ivy's social-status tools, this needs its own scoped investigation into tenant→Stripe-customer mapping before it's safe to build) — flagged as a real, confirmed gap for a follow-up pass, not fixed. Confirmed no automated daily bill/email-scanning capability exists yet (as expected, not built). |
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
