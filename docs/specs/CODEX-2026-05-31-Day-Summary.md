# CODEX — 2026-05-31 Day Summary

**Length:** Long day — Sean's personal account, multiple sessions, one preflight-call break.
**Shipping bands:** S51.45 through S51.50 + S52.1/S52.2 specs.
**Theme:** Killed the no-code sandbox idea (Sunday morning), pivoted to Substack-pattern open-SDK creator model, drafted Creator Experience Brief through v4, built the v0.1 platform structure end-to-end, deployed live, captured the next day of work in spec + QA-001 corpus.

---

## What shipped (chronological)

### S51.45 — Creator Agreement v1.1 + SDK tooling + landing slim-down (morning)

- **Creator Agreement v1.1** effective for Marketplace tier. 13-section click-through. Captures legal moat per Sean's brief: independent contractor declaration, no-bind-SOCIII, brand restrictions, indemnification, suspension rights, IP, confidentiality, arbitration, dispute resolution. Definitions section with binding revenue math (Gross/Net/Stripe/refunds/chargebacks/sales tax/third-party API costs). New sections: Customer Ownership, Non-Circumvention (12-month), AI Provider Dependency, Worker Brand Ownership, Creator Death/Incapacity, Change-of-Control 90-day opt-out. No personal guarantees anywhere (per universal rule from earlier this week).
- **CREATOR-EARNINGS.md** updated: "What's NOT covered" section. Marketplace creators bring their own Claude subscription; Team seats reserved for IC/employee/Fellow only.
- **scripts/initWorker.js + scripts/validateWorker.js**: interactive worker scaffolder + Worker DoD validator. Root `package.json` wired with `init-worker`, `validate-worker`, `preview-worker`.
- **Landing page slim-down**: replaced 800-line marketing fluff (fake leaderboards, fake $29/49/79 pricing, fake games, 14-vertical carousel, 21-language pill row) with ~250-line clean Sign-in / Alex-chat / Start-free surface.
- **Advisor letter drafts**: Ruthie + Elise Fellow invitation letters in `docs/legal/advisor-letters/`.
- Deployed to `title-app-alpha.web.app` + `app.titleapp.ai`.

### S51.46 — Creator Experience Brief v4 (locked spec)

- Authored the full Creator Experience Brief through three passes (v2 → v3 → v4) with red-team reviews from both Claude (separate session) and OpenAI.
- v4 locks four pillars: Journey (13 beats, then 10 steps after Sean's later feedback), Three Lanes (Open Apache fork / Marketplace / Research Preview), Forge Reviews (independent reviewer LLC funded by SOCIII), Certification (Certified + Advanced Creator credentials, $149/$49/Free, PADI-style).
- Type D Consultant added as a fourth creator type, served by inbound Sociii Build concierge ($500/hr, Fortune 500 only, scoped engagements).
- TRpW (Total Revenue per Worker) replaces subscriber-count as the pricing graduation metric.
- Status Thread + Coach Function established as distinct emotional mechanics (split from the v2 "Cheerleader" concept).
- Beat 6 (Mockup Preview) moved BEFORE Beat 5 (Install Grind) — "show me my worker, then make me work."
- New Forge First Customer beat solves the cold-start customer problem.
- AI reviewer scope reduced to security/structure/capability only (taste-based AI review becomes "please ignore this stupid comment" within 6 months).
- Pricing tier rule: no $79 workers Day 1, universal incl. Fellows.
- Customer Acquisition Loops as dedicated subject. v3 was ~40% onboarding-heavy; v4 rebalances to ~25/15/20/40 (onboarding/validation/recognition/distribution).
- Persisted as `docs/specs/SOCIII-Creator-Experience-Brief-v4.md` + Downloads copy for outside-review sharing.

### S51.47 — V4 creator platform structure: profile + credential + journey + Studio

- 6 backend endpoints added to `functions/functions/index.js`:
  - `GET /v1/creator:public-profile` (public)
  - `GET /v1/credential:verify` (public)
  - `POST /v1/studio:intake` (public)
  - `GET /v1/journey:state` (authed)
  - `POST /v1/journey:advance` (authed)
  - `POST /v1/creator:claim-handle` (authed)
- 5 Firestore collections introduced: `creators/{uid}` extended; `creatorHandles/{handle}` index; `creatorCredentials/{credentialId}`; `journeyState/{uid}`; `studioIntake/{intakeId}`.
- 4 React pages:
  - `CreatorProfilePublic.jsx` at `/c/<handle>` — Substack-author-style public profile
  - `CredentialVerify.jsx` at `/credential/<id>` — LinkedIn-verifiable artifact
  - `SociiiBuild.jsx` at `/build` — Fortune 500 inbound landing
  - `CreatorJourney.jsx` at `/creators/journey` — 13-step journey checklist (later rebuilt as 10 steps in S51.50)
- App.jsx routing: 4 new URL patterns. Lazy-loaded React.Suspense pattern matching existing pages.
- Deployed and smoke-tested green.

### S51.48 — Seed Ruthie demo + Creator Journey nav link

- Extended `admin:bootstrap-nursing-education-001` endpoint to seed v4 creator data:
  - `creators/ruthie-clearwater` full profile (CRNA, MSN, BSN, RN; bio; Verified Expert mark)
  - `creatorHandles/ruthie` → ruthie-clearwater index
  - `creatorCredentials/SOCIII-CC-RUTHIE-0001` Certified Creator credential
- Simplified `creator:public-profile` queries to avoid composite index requirements (filter status in memory).
- Demo URLs now show real content:
  - `https://title-app-alpha.web.app/c/ruthie`
  - `https://title-app-alpha.web.app/credential/SOCIII-CC-RUTHIE-0001`
- First attempt at adding Creator Journey link to sidebar (Account section, bottom) — wrong location per Sean's later feedback.

### S51.49 — Fix Creator Journey sidebar link rendering invisible (TC-029)

- The sidebar link added in S51.48 was rendering but invisible. Root cause: inline `style={{ color: "inherit" }}` overrode the `.navItem` CSS class's `color: #e5e7eb`, making the link inherit the parent's transparent/dark color against the dark sidebar background.
- Fix: replaced the `<a>` element with `<button>` using the same styling pattern as adjacent Account-section buttons.
- Captured as TC-029 in the QA-001 corpus.

### S51.50 — Creator Journey rewrite per Sean's feedback (late evening, ~22:00)

- Sean reviewed the v0.1 Creator Journey and flagged seven issues across copy, structure, and navigation.
- Sidebar: removed "Creator Journey" from the Account section. Added a "Creator" section at the TOP of the sidebar (purple label, peer with MY DRIVE/MY VAULT) with a "Become a Creator" button. Persona-first navigation rule established.
- Journey page rewrite:
  - "Beats" → "Steps" — universal language, not jargon
  - 13 steps compressed to 10 — fewer feels achievable
  - All time references removed ("30 minutes invested," "13 beats from...")
  - Humblebrag status copy removed ("Most people close this tab")
  - Explicit "Tools you'll need" section at top with three cards: Claude subscription (claude.ai link), Claude Chat (browser tab), Claude Code (install docs link). Terminal-newbie hint at bottom.
  - Step 2's broken `/onboard/creator` link fixed → `/meet-alex?intent=creator-signup`
  - Backward-compat: old beat state in Firestore maps to new step ids on load.
- Captured as TC-028, TC-030, TC-031, TC-032, TC-033, TC-034, TC-035 in QA-001 corpus.

### S52.1 spec — Contacts → IR Bridge (deferred to tomorrow)

- Sean asked how investor prospects get from the contacts spine into the IR worker. Answer: there's no bridge today. Investor records are created one-at-a-time in `fundraises/{id}/investors/`; contacts spine holds the broader prospect list but doesn't flow into it.
- Spec'd at `docs/specs/CODEX-S52.1-Contacts-IR-Bridge.md` (verbally — full doc pending; scope captured in chat).
- Scope: new endpoint `POST /v1/ir:import-from-contacts`, new contact engagement event types (`ir.invited`, `ir.signed_safe`, etc.), Prospects tab UI in IR worker, sync hooks back to contacts.

### S52.2 spec — Creator Journey v2 with three-part shell + QA-001 (locked overnight)

- Sean's structural critique caught at the end of the day: the Creator Journey breaks the three-part workspace pattern. Same issue on `/data-room`.
- Saved as `docs/specs/CODEX-S52.2-Creator-Journey-v2-with-QA-001.md` with:
  - Architecture: refactor to render inside AppShell (sidebar + Alex chat + canvas all preserved)
  - File changes locked
  - 25 QA-001 assertions across structural/behavioral/copy/visual/cross-cutting
  - Build sequence + commitment to running QA-001 pre-flight before Sean's eyes

---

## Decisions locked (memory captured)

1. **Universal rule — no personal guarantees on any company loan, ever.** Robert's $100K loan papered without PG.
2. **Sandbox killed; Substack pattern replaces it.** Three creator tiers (Open / Marketplace / Research Preview) + Fellow exception (max 7 ever).
3. **Fellow roster locked at 7.** Eric / Elise / Scott / Kim / Ruthie / Kent / Robert. No more Fellow offers.
4. **All 10 Creator Journey design questions locked** (Q1-Q10) — hybrid public/private journey page, manual self-report + habit prompts, immediate shareable Beat 6 reward, QA-001 minimum cut, tiered review (70 AI / 20 peer / 10 Sean), founder mystique via X broadcast, Creator Profile Day 1, Fal.ai logos, mid-tier network activation, cheerleader-then-coach reframe.
5. **Three Lanes framework** answers the radical-dev tension. QC isn't the gate; marketplace access is.
6. **Pricing tier rule** — universal, no Fellow exemption. No $79 workers Day 1.
7. **Three-part workspace layout rule** (NEW tonight) — every authenticated surface MUST preserve sidebar + Alex chat + canvas.
8. **User-facing copy rules** (NEW tonight) — no time references, no humblebrag, "Step" not "Beat" (10 max), persona-first navigation.

---

## What didn't ship today (deliberately deferred)

- **Three-part shell refactor for Creator Journey** — spec'd, build deferred to AM (would have shipped half-baked at midnight).
- **Robert's loan + advisor letter** — Sean's tonight task originally; pushed to tomorrow after preflight call interrupted.
- **DNS swap** (sociii.ai → app.sociii.ai) — Sean's tonight task; pushed to tomorrow.
- **Investor Data Room three-part fix** — same architectural fix as Creator Journey; queued separately.
- **Contacts → IR bridge** — spec'd today; build tomorrow.
- **Forge entity setup** (LLC formation, editorial charter, funding flow) — Sean's task, not blocking.
- **`@sociii/sdk` npm publish** — package builds locally; Sean needs to `npm publish` from his account.
- **GitHub branch protection on main** — required for CODEOWNERS to enforce; Sean's task.

---

## Tomorrow's docket (reordered per Sean 2026-05-31 ~23:00)

In order of execution:

1. **DNS swap** — Cloudflare + Firebase Hosting custom domain for sociii.ai → app.sociii.ai. (Was #3 originally — moved to first for quick infra win.)
2. **Contacts → IR bridge** (S52.1) — endpoints + UI + sync hooks. (Was #4 — moved up because actually-useful-for-fundraising.)
3. **Investor Data Room three-part fix** — apply same architectural pattern as Creator Journey. Quick fix using same shell. (Was #5 — moved up; low-risk pattern reuse.)
4. **Robert's loan + advisor letter** — paper the $100K note, draft warm letter, send via DBX Sign. (Was #2 — personal relationship work; do it when focused.)
5. **Build the three-part shell refactor for Creator Journey** (S52.2 spec). Run QA-001 pre-flight before showing Sean. Target ≥75% catch rate on the 25 assertions. (Was #1 — biggest refactor; save for last when momentum is built.)
6. ✅ **DONE TONIGHT** — Kent's agreement sent via DBX Sign + IR cold-call and Advisor cold-call test forms fired. Awaiting his feedback. (Was #6 originally.)

**Strategic shape of the order:** start with infra wins (DNS, contacts bridge), pattern-reuse fix (data room), then focus-required personal work (Robert), then big UI refactor (Creator Journey shell with full QA-001 pre-flight) last.

---

## Critical lesson from today

We skipped QA-001 pre-flight on every build. Sean caught 7/7 issues on S51.50, 0/7 caught by me before he looked. That's the inverse of the QA-001 success metric (`feedback_qa001_success_metric.md`).

Going forward: every build writes its assertion list in the spec, and I walk the list before announcing the build as ready for review. The S52.2 spec is the first one to enforce this discipline.

---

*Codex authored 2026-05-31 ~22:30 by Claude on Sean's personal account. Captures S51.45 through S51.50 + S52.1 spec + S52.2 spec.*
