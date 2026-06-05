# CODEX S52.28 — Creator Authoring Intercept + Bug #407 Resolution

**Author:** Sean Lee Combs / SOCIII, Inc.
**Date:** 2026-06-04 night
**Scope:** Unblock the natural creator authoring path on `/creators/journey`
**Status:** SHIPPED (live on sociii.ai)

---

## Problem

Three bugs stacked on top of each other broke the dogfood Sean tried to
run while building RES-DATA-001:

1. **Creator Journey Step 3 dead link** — clicking "Talk to Alex →" sent
   signed-in users to `/meet-alex?intent=create-worker`. App.jsx's route
   handler stripped the intent param and fell through to the Personal
   Vault home (`dashboard` ContextualMessage fired, header read "Welcome
   to your Vault…"). MeetAlex.jsx never read `?intent=`.

2. **Bug #407 — magic-link auto-reply** — When Sean typed in the middle-
   panel chat on `/creators/journey` instead of using the Step 3 link
   (which is what any sane creator would do — Alex is right there), the
   backend resumed his most recent session, which was stuck in
   `state.step = 'magic_link_sent'` from earlier `/meet-alex` testing.
   Every message returned "Still waiting? Check your spam folder, or I
   can resend the link." regardless of content. Sessions are resumed by
   `auth.uid` lookup at `functions/index.js:1929-1947` for continuity, so
   a single stale guest state poisoned every subsequent surface.

3. **No authoring handler in `chatEngine.js`** — Even after clearing the
   stale state, `case 'authenticated'` is a keyword-routed monolith
   (`dashboard` / `logbook` / `business` / etc.). "I have an idea for a
   new digital worker" matches no keyword and falls through with no
   return value → frontend renders "No response received."

## Resolution

### Patch 1 — App.jsx (5995-6019)

Added an `isCreatorAuthoring` flag computed from
`window.location.search`. When `isMeetAlex && intent === 'create-worker'`,
the route override that normally redirects authenticated users to the
workspace home is skipped, and the MeetAlex shell renders inside AppShell
just like the guest case.

### Patch 2 — MeetAlex.jsx (22-37, 233-235, 649)

- New `isCreatorAuthoring` state mirrors the URL param.
- `nameCollected` forced true in authoring mode (the user is already
  signed in; their name is known).
- New opening line: *"You're starting a new worker. In one sentence —
  what does it do that no other worker on the platform does? No need to
  wordsmith. The version we sharpen later starts here."*
- Header sub-text swaps from "Chief of Staff" to "Worker authoring" so
  the surface visibly identifies as a different mode.

### Patch 3 — ChatPanel.jsx (78)

Added `'creator-journey'` to `CONTEXTUAL_MESSAGES` so the middle-panel
welcome on `/creators/journey` primes the authoring conversation. (This
fires for any signed-in user landing on the journey page, regardless of
how they got there.)

### Patch 4 — functions/index.js (1949-1968) — defensive guest-state reset

The single most impactful change. For any authenticated user whose
resumed session has `state.step` in a guest-flow terminal set
(`magic_link_sent`, `creating_account`, `signin_email`, `collect_name`,
`collect_email`, `collect_company_name`, `collect_company_description`,
`choose_audience`), force-reset to `'authenticated'` before chatEngine
processes the message.

Without this, **any signed-in user who ever poked the guest signup flow
once** got the magic-link reply on every workspace message until their
session was manually cleared.

### Patch 5 — functions/index.js (5255-5320) — creator-journey intercept

When `body.context.currentSection === 'creator-journey'` and the request
is authenticated, short-circuit chatEngine entirely. Call Anthropic
(`claude-sonnet-4-5-20250929`) directly with a purpose-built authoring
system prompt that walks the user through five Intent Spec rounds:

1. What is the worker for?
2. What does success look like?
3. Who is the user?
4. What can go wrong?
5. What other workers does it depend on?

History accumulates in `sessionState.creatorAuthoringHistory` (capped at
30 messages). Session document is written back with
`surface: 'creator-journey'`.

The system prompt explicitly forbids: magic links, email collection,
COS-Alex behavior, reset prompts, markdown headers. Style rules: plain
text, one question per turn, acknowledge-then-ask cadence, push back on
vague answers.

If the AI call throws, the handler falls through to chatEngine — better
to risk a less-coherent reply than to return empty.

## What ships

- Step 3 → `/meet-alex?intent=create-worker` → renders authoring shell
  (no vault redirect)
- Middle-panel chat on `/creators/journey` opens with Intent Spec Round 1
  contextual message
- Authenticated users' stale guest-flow sessions auto-reset on next
  message (bug #407 mitigated platform-wide)
- Authoring conversation produces real AI replies that stay in role for
  the full 5-round Intent Spec walkthrough

## What's NOT shipped (queued)

- **State-aware creator nav** — Sidebar "Become a Creator" should
  resolve to a multi-item creator section (My Workers / My Creator
  Profile / Earnings / Journey) once the user has agreement-signed or
  drafted-worker state. Half-session refactor. Queued as task.
- **Friction #6 — dedicated `/build` or `/author` route** — Long-term,
  authoring deserves its own URL with its own canvas (Intent Spec / Spec
  / Test / Publish tabs), not a query-param mode on COS Alex. Multi-
  session effort. Queued.
- **Full Alex prompt refresh across remaining surfaces (task #406)** —
  Tonight's intercept handles `/creators/journey`. The other surfaces
  (worker chat panels, Command Center, /meet-alex sales mode) still
  carry pre-S52.x prompts that don't know about Audit Trail, Parcel
  Atlas, the legal worker family, or the chain-agnostic positioning.
  Continue tomorrow.

## Build + deploy verification

- `apps/business` Vite build: green (1.60s, 1.02s)
- `firebase deploy --only hosting:title-app-alpha`: success
- `firebase deploy --only functions:api`: success (two rounds —
  guest-state reset + creator-journey intercept)
- `curl -I https://sociii.ai/meet-alex?intent=create-worker` → 200 OK
  with `last-modified` matching deploy timestamp

## Related

- Bug #407 (magic-link template auto-fire) — marked completed
- Task #406 (Alex prompt refresh ALL surfaces) — partial progress, still
  pending
- [[project_sandbox_killed_substack_pattern]] — the Substack-pattern
  creator model this unblocks
- [[project_sandbox_intent_spec_first]] — the rule that Intent Spec is
  step 1 of any creator flow, now enforced server-side via the authoring
  system prompt
- `~/Downloads/RES-DATA-001-creation-log.md` — the build-in-public log
  that captured this whole diagnostic + fix sequence in real time
