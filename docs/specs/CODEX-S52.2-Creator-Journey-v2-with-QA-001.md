# CODEX S52.2 — Creator Journey v2 (Three-Part Shell + Copy Rules) + QA-001 Assertions

**Status:** Spec — pending Sean's AM approval before build.
**Authored:** 2026-05-31, late night, after Sean's review of S51.50 surfaced multiple structural + copy issues that QA-001 should have caught pre-dogfood.
**Reference:** `docs/specs/SOCIII-Creator-Experience-Brief-v4.md`, `feedback_three_part_workspace_layout`, `feedback_user_facing_copy_rules`, `feedback_qa001_success_metric`.

---

## 1. Why this rescope

Tonight's build (S51.50) was rejected because:

1. **Standalone page broke the three-part workspace** — `/creators/journey` rendered as a full-page surface with no sidebar nav, no Alex chat, no way to switch context. The user lands and is stranded.
2. **Time references in user copy** — "30 minutes invested," "13 beats from..." Direct violation of the no-time-in-copy rule.
3. **Humblebrag status thread** — "Most people close this tab. You're still reading." Reads as manipulation, especially Step 1.
4. **"Beat" jargon** instead of "Step."
5. **Broken Step 2 link** — pointed at `/onboard/creator` without a token, hit "Link looks incomplete" error page.
6. **Sidebar location wrong** — Creator Journey buried in Account section instead of top-level persona.
7. **Color: inherit bug** — the first sidebar link was invisible against the dark background.

All seven were obvious. Most were copy. A pre-flight QA-001 pass would have caught at least 5 of 7 before Sean ever opened the page.

---

## 2. Scope of v2

### What it IS

- Refactor the Creator Journey from a standalone page → a worker-like surface inside the standard SOCIII workspace layout
- Reuse the layout pattern from `DeveloperSandbox.jsx` (the OLD sandbox UX, which Sean confirmed was good — only the content failed)
- Apply the corrected copy (10 steps, no time, no humblebrag)
- Wire Alex chat with step-aware context

### What it is NOT

- Not a refactor of every other full-page surface — Investor Data Room and others are SEPARATE fixes (queued as separate TCs in the QA-001 corpus)
- Not a no-code worker builder (the sandbox killed that)
- Not a re-write of the user-facing 10-step content (the new copy from S51.50 is approved; just needs to be embedded in the right shell)

---

## 3. Architecture

### Layout

Three-rail layout, mirroring `apps/business/src/pages/DeveloperSandbox.jsx`:

| Rail | Width | Content |
|---|---|---|
| **Left** | ~280px | Standard `Sidebar.jsx` (already has Creator section pinned at top from S51.50) |
| **Middle** | flex-1 | Alex chat panel — scoped to journey context, can answer "what is Step 5?" intelligently |
| **Right** | ~440px | Step progress board: 10 steps + Tools card. Click a step → opens its detail card in the same rail. |

### File changes

- **NEW** `apps/business/src/pages/CreatorJourneyShell.jsx` — the three-part shell. Imports `Sidebar`, embeds `ChatPanel` for Alex (with creator-journey context prompt), and renders the steps board in the right rail.
- **MODIFY** `apps/business/src/pages/CreatorJourney.jsx` — keep, but it becomes the *right-rail content component* used by the shell. Strip out its own header/footer, expose as `<CreatorJourneyBoard />`.
- **MODIFY** `apps/business/src/App.jsx` — `/creators/journey` route now renders `CreatorJourneyShell` instead of the standalone page.
- **NEW** Alex chat context module: `functions/functions/services/alex/knowledge/creator-journey-context.md` — domain vocabulary for steps + tools + tips. Loaded via `CREATOR_KNOWLEDGE` map in `functions/functions/index.js` (same pattern as nursing-education-context.md per S51.43.11).

### Backend (already shipped in S51.47)

No new backend endpoints required. `/v1/journey:state` and `/v1/journey:advance` already exist. Step ID mapping (already in `CreatorJourney.jsx`) preserves backward-compat with old beat ids.

### Alex chat context injection

When the user is on the journey shell, the chat session's system prompt gets a creator-journey-context.md preamble plus a structured directive:

> "The user is currently on Step N of their SOCIII Creator Journey. The 10 steps are: [list]. Step N is about: [description]. Answer the user's questions in context of where they are. If they ask 'what is X' (Git, Node, Claude Code, GitHub), give a plain-language explanation appropriate for a domain expert who is not a developer."

Implementation: middle-rail ChatPanel passes `journeyStep=N` as context, backend chat handler injects creator-journey-context.md + the step-specific directive.

---

## 4. QA-001 Assertion List

These are the assertions that MUST pass before Sean reviews. Write them in `creators/_template/tests/assertions.md` style. Each is a structural, behavioral, copy, or visual check.

### Structural

- **TC-S52-01:** `/creators/journey` renders with three rails visible (sidebar + middle + right rail). DOM contains a `.sidebar`, a `.chat-panel`, and a `.canvas-panel` (or equivalent class/data-attrs).
- **TC-S52-02:** Sidebar at left includes the "Creator" section pinned at top with "Become a Creator" or "My Journey" button.
- **TC-S52-03:** Alex chat panel renders in the middle rail with input field and at least one initial Alex message.
- **TC-S52-04:** Right rail renders "Tools you'll need" card section + a 10-step progress board.
- **TC-S52-05:** Each of the 10 steps renders with a step number, title, description, and checkbox.
- **TC-S52-06:** Progress bar at top reflects `completedSteps / 10` accurately.

### Behavioral

- **TC-S52-07:** Click a step's checkbox → API call to `/v1/journey:advance` fires within 1 second.
- **TC-S52-08:** After marking a step complete, refresh the page → state persists (Firestore round-trip works).
- **TC-S52-09:** Send a message in the Alex chat → response returns within 10s and references the current step in plain language (e.g., "Step 5 is about installing your tools. Here's what you need...").
- **TC-S52-10:** Click sidebar's "Become a Creator" link from any other workspace surface → routes to `/creators/journey` and the journey shell loads.
- **TC-S52-11:** Open `/creators/journey` directly (typing URL) → renders correctly with three rails (no broken state if user lands cold).

### Copy

- **TC-S52-12:** No occurrences of `\d+\s*(minute|hour|second|day|week|month)s?` (regex) in the user-facing copy of the page. Time references prohibited.
- **TC-S52-13:** No occurrences of the strings "Most people" or "Most prospects" in user-facing copy. Humblebrag prohibited.
- **TC-S52-14:** No occurrences of the word "Beat" or "beat 1/2/3..." in user-facing copy. Step nomenclature only.
- **TC-S52-15:** Exactly 10 steps render. Not 13. Not 11. Not 9.
- **TC-S52-16:** The "Tools you'll need" section names exactly three tools: Claude subscription, Claude Chat, Claude Code. Each has a clickable link to its install/signup page.

### Visual

- **TC-S52-17:** All step titles, step descriptions, sidebar items, and chat messages have sufficient contrast against their background (manual check: hold up the inverted-color test or use Chrome DevTools accessibility audit).
- **TC-S52-18:** No invisible links (regression test for the `color: inherit` bug from S51.49). Open DevTools, query all `<a>` and `<button>` inside `.navItem` — confirm computed color is NOT `transparent` and is NOT the same color as the background.
- **TC-S52-19:** On mobile width (≤768px), the layout collapses gracefully — sidebar becomes a drawer, chat + canvas stack.
- **TC-S52-20:** Active step has clear visual treatment (border/glow/background) distinguishing it from incomplete-locked and completed-greyed states.

### Cross-cutting / regression

- **TC-S52-21:** The Sidebar's existing Account section (Billing, Settings, Suggestions, Worker Rules) still works — clicking each routes to its existing surface. (Regression check; S51.50 removed Creator Journey from there.)
- **TC-S52-22:** The Sidebar's MY DRIVE / MY VAULT / MARKETPLACE / MY WORKSPACES / MY WORKERS / MY GAMES sections still render correctly. (Regression check; the new Creator section above them shouldn't displace anything.)
- **TC-S52-23:** Other authenticated routes that DON'T have three-part layout yet (`/data-room`, `/whitepaper`, etc.) — their TCs are CAPTURED but not BLOCKING for this build. Add them to the QA-001 corpus as separate items for follow-up.

### Manual checks (Sean's eyes still needed for these — but only AFTER 01-22 pass automatically)

- **TC-S52-24:** The journey feels like a coach helping you, not a kindergarten teacher rewarding you. Read all 10 step descriptions out loud — do any read as patronizing?
- **TC-S52-25:** Alex's responses in the journey shell feel competent and step-aware. Try at least three "I'm stuck on Step X" prompts and verify the answers are specific to where the user is.

---

## 5. Build sequence

1. **Read** the three referenced memory files (`feedback_three_part_workspace_layout`, `feedback_user_facing_copy_rules`, `feedback_qa001_success_metric`).
2. **Write** the assertion file at `creators/_template/tests/assertions.md` for the Creator Journey (or at a path like `tests/creator-journey-v2.assertions.md`).
3. **Build** `CreatorJourneyShell.jsx` using the DeveloperSandbox.jsx layout as the structural reference.
4. **Refactor** `CreatorJourney.jsx` into `CreatorJourneyBoard.jsx` (the right-rail content).
5. **Wire** Alex chat context with creator-journey-context.md + step-specific directive.
6. **Update** `App.jsx` route to render the shell.
7. **Build + deploy** to a preview channel (if Firebase Hosting preview is set up) OR to main hosting with explicit "test, do not announce" note.
8. **Run QA-001** — walk through assertions TC-S52-01 through TC-S52-23 mechanically. Any failure → fix. Any I cannot test myself (e.g., real Alex chat response quality) → flag for Sean's eyes.
9. **Only then** tell Sean to look at it.

---

## 6. What I commit to differently going forward

Per Sean's feedback tonight: "we should have run this by 001-QC to flag errors. We kind of stopped doing that during today's session."

The S51.37 baseline was 0/8 QA-001 catches; today's S51.50 was the same — Sean caught 7/7 issues himself.

**For S52.2 and every build afterward, the target is ≥75% of testable assertions caught by my pre-flight QA-001 pass before Sean's eyes hit the build.** This means:

- I write the assertion list AS PART OF the spec (above).
- I run the assertions in code (where automatable) or by deliberate manual walkthrough (where not).
- I document which I ran and what failed.
- I fix what fails.
- THEN I tell Sean to review.

If Sean catches an assertion-checkable issue that I missed, the QA-001 procedure is broken — and we treat that as a separate process bug to fix before the next build.

---

## 7. Open questions for Sean's AM approval

1. **Where in the worker hierarchy does Creator Journey live?** Should it appear in MY WORKERS as a "system worker" (so it's discoverable from the workspace home grid), or only via the sidebar's Creator section? Recommendation: both — appears as a system worker AND is pinned at the top via sidebar.
2. **Does the Investor Data Room get the same three-part refactor in this build, or separately?** Recommendation: separately. This build is Creator Journey only; data room is queued as S52.3.
3. **Mobile breakpoint** — desktop-first or mobile-first? Recommendation: desktop-first (matches current platform pattern), but TC-S52-19 ensures mobile doesn't break.

---

*Spec ready for AM review. Once approved, build sequence executes. QA-001 assertion checklist above is the contract — Sean shouldn't see this build until I've walked it myself.*
