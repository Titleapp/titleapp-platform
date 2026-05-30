# IR Worker — Investor View V2

**Date:** 2026-05-29
**Owners:** Sean (vision), Claude (synthesis + scope)
**Status:** Spec — not yet implemented
**Test discipline:** This spec is the input for QA-001. Success ≠ how few human screengrabs it took. Success = how many issues QA-001 flagged + corrected before a human dogfood pass.

## Vision (Sean's framing, 2026-05-29)

> "The experience we want for the investor prospect is pretty much like we have it but we now see we are in this specific workspace for SOCIII Investor Relations. We recognize that the area is secure and confidential. We can easily access documents and our other tasks (voting reports, conference calls, even investor updates — video and reports). And of course making sure ALEX can answer all of our questions tactfully and authoritatively."

The investor logs in, sees clearly that they're in a **SOCIII Investor Relations** scoped surface, and from one workspace can: see their position, access materials, vote, attend updates, get answers from Alex, sign new documents, and manage their compliance affirmations — without ever feeling like they wandered into the founder's admin view.

## What's IN scope (V2)

### 1. Position & economics
- **My Position** card: SAFE amount, shares issued, ownership %, instrument type, valuation cap, agreement date, executed-doc link
- **Round status** read-only: total target, total raised, your % of round, next close date, instrument terms
- **Cap table snapshot**: founder %, cofounder %, advisor pool %, option pool %, "your stake = X% pre-dilution / Y% projected post-Series A"
- **Tax docs**: K-1 (annual), 83(b) confirmation if relevant, state filings
- **Distributions / liquidity history** (mostly empty for SAFE holders pre-exit; populated on exit)

### 2. Documents & Data Room
**Architecture decision: Canvas Data Room is primary, Drive subfolder mirrors.**

| | Canvas Data Room (IR worker tab) | Drive subfolder (IR-scoped) |
|---|---|---|
| Source of truth | Yes — `fundraises/{id}/dataRoom` + scoped shares | Mirror (read-only sync) |
| Access control | Per-investor scoped via accessLog | Inherits from Drive workspace ACL |
| What lives there | SAFE PDFs, investor agreements, K-1s, board materials, term sheets, financial reports, deck, call recordings | Same files, plus investor's own uploads back |
| Audit trail | First-class — every view logged + immutable | Drive-native (less granular) |

**Uploads back from investor:**
- W-9 / W-8BEN
- Accredited investor certification
- Counsel attestations (rare)
- Goes to `users/{uid}/ir/investor-uploads/{fundraiseId}/` — visible to founder/treasury via review queue

**Doc lifecycle**:
- Status badge on every doc: Signed / Pending signature / View only
- Pending-signature docs surface in the obligation banner (we already have this — extend to non-onboarding signing)
- Signed docs include the audit trail summary (signers, dates, hash anchor)

### 3. Voting & governance
- **Open ballots** list with vote / proxy options (already has /invest/vote UI from S51.24)
- **Your weight** displayed (SAFE-holder voting weight per ballot rules; usually 0% on Reg D ballots but explicit so investor knows where they stand)
- **Closed ballot history** with how the investor voted
- **Annual meeting**: schedule, agenda, materials, voting proxy, livestream link

### 4. Communications & updates
- **Investor updates** feed: video (Loom-style), written reports, milestone announcements
- **Conference calls**: recordings of past calls, schedule for upcoming, dial-in for live
- **Direct message to founder** thread (not a chat fire-hose — a queue Sean reviews + replies to async)
- **Audit trail** card: every doc you've signed/accessed, every vote you've cast, every comm you've received. Transparency by design.

### 5. Deadlines & accountability (Sean's recurring rule)
*Memory: `feedback_workers_must_prevent_missed_deadlines.md` — every deadline-driven worker MUST surface required actions persistently.*

A **"What needs your attention"** card aggregates:
- Quarterly report due dates (passive, info only)
- K-1 expected date + reminder when delayed
- Open ballot close dates (with vote button)
- Annual meeting + proxy filing deadline
- Pending document signatures (any open obligation)
- Accredited investor re-affirmation (annual)
- Anything else with a calendar date

### 6. Compliance & attestations
- Accredited investor status (current, with re-affirm CTA when expiring)
- Regulatory updates relevant to this investment (Reg D, tax changes)
- Reg S-K material event filings (if SOCIII files any)
- Counsel attestation pattern preserved (memory: `project_user_counsel_attestation_pattern.md`)

### 7. Document signing queue
- Anything pending the investor's signature
- Amendments (revised SAFEs, side letters)
- Follow-on round participation rights
- Conversion notices at next priced round / exit
- Built on existing DBX Sign infrastructure — same defensive sync pattern (TC-018/019) applies

### 8. Co-investment / referrals (V2.5)
- "Sean asked if you'd like to look at..." — founder offers next deals
- Track record per investor of which deals they participated in across rounds
- One-click signal-of-interest (no commitment) → routes back to founder

## What's OUT of scope (V2) — deferred

- Direct messaging via real-time chat (the founder-thread is async only, like email)
- Live trading / secondaries marketplace
- Cross-portfolio aggregation (investor sees only SOCIII; their portfolio across companies is V3)
- Voice/video conferencing (relies on third-party links — Loom / Zoom / Google Meet)

## Alex behavior spec (chat tone)

**Grounded** — every factual answer cites a source in the data room or investor record:
- "Per Section 2 of your SAFE (signed 2026-05-29), the cap is $25M post-money."
- "Your K-1 is expected by March 15 per the LLC operating agreement."
- "The accredited affirmation expires 2027-05-29. I'll remind you 30 days out."

**Tactful + authoritative**:
- ✅ Answers factual questions about terms, dates, processes, obligations
- ✅ Surfaces relevant documents proactively ("You may want to review the 2026 board update before voting")
- ✅ Knows when to escalate: "That's a question best for Sean directly — want me to book office hours?"

**Never**:
- ❌ Speculates on returns or future valuations
- ❌ Recommends investing more (or less)
- ❌ Comments on other investors' positions
- ❌ Provides legal, tax, or investment advice (says: "I'd point you to your own counsel for that")
- ❌ Reveals other investors' info even when asked

**Behavioral contract** — the Alex investor-view RAAS module must include:
- All seven "Never" rules as hard constraints
- A "cite or escalate" rule — every factual claim must have a source link OR be deflected to the founder
- Cross-check rule: investor identity must be verified before answering position-specific questions

## QA-001 assertions specifically for IR worker investor view

The whole point of capturing this spec rigorously is so QA-001 can test against it. Drawing on patterns from TC-020 through TC-027:

### A. Data binding & sample-vs-real
- For investor user with role=investor entitlement, every canvas tab loads from real entity state, not SAMPLE fixtures. (TC-022 archetype)
- Position card shows the investor's actual SAFE terms (cap, amount, shares). Mismatch = fail.
- Cap table card shows current state of `fundraises/{id}/captable` snapshot, not hardcoded fixture.

### B. Outbound comms
- Every investor email goes to Primary inbox in test Gmail (TC-020 archetype): subject lines that don't trigger Promotions classifier
- Every email links to a real surface in the workspace (TC-024 archetype): if email mentions "deck", workspace has accessible deck

### C. Signing lifecycle
- Every signing-related obligation matches a backend action handler (TC-021 archetype)
- Every templated document has the correct template ID + role names case-matched (TC-025, TC-026 archetypes)
- Every webhook miss has a defensive sync recovery path (TC-018, TC-019 archetypes)
- Every state-machine value written by the flow is recognized by every consumer (TC-027 archetype)

### D. Permission & isolation
- Investor cannot view other investors' positions
- Investor cannot view founder-only admin tabs (cap-table edit, fundraise edit, voting-create)
- Investor's entitlement reads cross-tenant (SOCIII platform tenant) but their materials surface stays scoped to their own record

### E. Deadline surfacing
- Every deadline driven by a Firestore date field must appear in the "What needs your attention" card within 24h of becoming relevant
- Missed-deadline detection: if a date passes without action, the card escalates color and a chat opener fires

### F. Alex tone enforcement
- LLM-as-judge tests on 20 sample investor questions covering: factual, speculative, advisory, other-investor-info
- Each response must satisfy: cites source OR deflects, never violates any "Never" rule, no marketing tone leakage
- Memory `feedback_chat_tone_no_marketing_stack.md` applies — no campaign-style language in chat session prompts

## Test discipline reframe (Sean's framing, 2026-05-29)

> "The test this time is not how many times I have to screengrab. The test this time is spec, build, deploy, then get 001 — based on the issues we've had to see how much of it it can flag and correct prior to the human trying it."

**Success metric for this spec's build**:
- Total bugs caught in human dogfood pass — minimize
- Total bugs caught by QA-001 before human dogfood — maximize
- Ratio: QA-001 catches / total caught — target ≥ 80% before V3

**Baseline from S51.37 dogfood (today):** 8/8 P0s caught by human, 0 caught by QA-001 (because QA-001 doesn't exist yet).
**Target for this spec's V2 implementation:** ≥6/8 of the equivalent bug classes caught by QA-001 before any human touches it.

That's the leverage thesis turned into a measurable contract.

## Open questions for Sean

1. **Founder thread vs. office hours** — should the "direct message to founder" be a real thread surface or just an "email founder" button that opens mailto:?
2. **Conference call infrastructure** — host on Zoom/Meet (link in workspace) or build a native conferencing layer? V2 = link-only is probably right.
3. **Annual meeting voting proxy** — separate UX or extends `/invest/vote`?
4. **Investor-specific deck variants** — does the deck shown to Storyhouse differ from what aspensean test sees? Probably yes for real production. Spec'd via per-investor `accessGrant` records.
5. **Where do video updates live** — Drive-native upload + canvas embed, or external Loom links that we just track?

## Related memory + tasks

- [[project_qa_001_test_corpus]] — corpus discipline (28 entries currently)
- [[project_ir_dogfood_2026_05_29]] — 8-bug walkthrough that motivated this spec
- [[feedback_workers_must_prevent_missed_deadlines]] — Sean's deadline rule
- [[feedback_chat_extension_of_better_self]] — Alex tone north star
- [[project_user_counsel_attestation_pattern]] — compliance pattern
- Task #306 — shared `onboardingFlow.js` (state-name SoT, prerequisite for QA-001 state-machine assertions)
- Task #353 — investor-side persistence (V1 shipped today as S51.40; V2 = this spec)
- Task #342 — remaining 7 IR canvas tabs to live data (prerequisite for V2)
