# Kent — Outbound Playbook for SOCIII Pre-Seed (v2)

**Audience:** Kent
**Owner:** Sean
**Effective:** 2026-05-26 (Monday — kickoff call) → 2026-05-27 (Tuesday — first outbound calls)
**Updated:** 2026-05-25
**Supersedes:** v1 (kept for reference at `Kent-Outbound-Playbook-2026-05-25.md`)

---

## What we're doing

We're raising the pre-seed for **SOCIII Inc.** SAFE round, market valuation in line with current AI-agent platform comps (NanoClaw being the most-recent reference point — they raised $12M in six weeks).

**Storyhouse Ventures** is the friendly first read this week. Their walkthrough is **Thursday 2026-05-28.** Everything between kickoff and Thursday is either Kent calling out, Sean making content, or platform polish.

**Goal of the kickoff call (Monday morning):** align Kent on the v2 pitch, the differentiation, the data room, and the operating cadence. Kent leaves the call ready to dial Tuesday.

---

## The 60-second pitch (v2 — differentiation-led)

> "Hey [name], it's Kent. I'm helping Sean Combs raise the pre-seed for **SOCIII** — a platform that's different from every other AI agent or bot you've seen this year.
>
> Three things make it different. Every output carries an **audit trail** — verifiable, on-chain, you can prove what an agent did and when. Every worker runs inside **RAAS guardrails** — a rules engine where domain experts encode their actual professional rules, not just a prompt, so the worker can't hallucinate past its constraints. And the **Sandbox** lets anyone build a worker by describing what they do. Nurses, mechanics, brokers, pilots, your aunt who barely opens her phone. The audience builds itself.
>
> Six patents filed last week covering the core architecture. Raising on a YC-style SAFE at market for AI-agent platforms. Worth a 15-minute call?"

~75 seconds spoken pace.

**What's intentionally NOT in the pitch:**
- "Rebrand of TitleApp" — most of Kent's call list won't recognize TitleApp. Bringing it up wastes the opener. Surface only if asked.
- Specific valuation dollar amount — market, not number. Sean negotiates per conversation.
- Specific use of proceeds breakdown — talked about reactively if they ask.
- Tech architecture deep-dive — saved for the deck and the 15-minute call.

**Adjust by segment:**

- **Operators in verticals (aviation, RE, auto, government):** insert a vertical-specific line after "different from every other AI agent": *"We have a complete worker stack for [vertical] — 56 aviation workers, 67 real estate workers, etc."* Then continue with the three differentiators.
- **Pure AI/agent investors:** stay with the three-differentiator core; the audit-trail + RAAS angle is the meat for them.
- **Family offices / strategic LPs:** lead with "platform building toward the cultural surface" — accessibility moat resonates better than the technical differentiation.

---

## The three differentiators — what to lean on

These are the three things every other AI agent platform doesn't have. Memorize them; deploy them; defend them.

### 1. Audit Trail
- Every output a worker generates is recorded in an append-only event store and (optionally) anchored to a public blockchain.
- You can prove, after the fact, what an agent did, when, and why. No silent hallucination, no plausible deniability.
- ChatGPT-wrappers and LangChain stacks have none of this. AutoGen and Crew don't either.
- For regulated verticals (healthcare, aviation, financial services), this is not optional. It's a compliance prerequisite.

### 2. RAAS Guardrails
- RAAS = Rules + AI-as-a-Service. The rules engine sits between the user and the model.
- Domain experts (the worker creators) encode their actual professional rules — Part 135 maintenance intervals, IL auto dealer title-issuance rules, CA real estate disclosure requirements — into machine-checkable RAAS modules.
- The model proposes; the rules engine validates; only validated outputs reach the user.
- This is the moat. Prompts can be stolen and replicated. A rules engine encoding 200+ verticals' worth of professional rules is a multi-year build.

### 3. Sandbox — "the audience builds itself"
- Build-Without-Code surface. A domain expert describes what they do, what rules govern their work, what outputs they produce. The Sandbox composes the worker.
- No coding fluency required. Nurses, mechanics, brokers, pilots, instructors, paralegals — all authors.
- The platform's accessibility moat. ChatGPT and Claude let developers build agents. SOCIII lets the people who *know the work* build the agents.
- This is what makes the marketplace scale. Once a vertical has one anchor creator, the long tail follows.

---

## What goes WITH the outreach

The deck. That's it. Send the deck with the cold email or attached to the LinkedIn message. The deck is the converter.

[Path placeholder — Sean confirms which file is the canonical v2 deck. Currently `docs/investor/current/TitleApp_Pitch_Deck_v7.pptx` is TitleApp-era and needs the SOCIII recut before it goes out.]

## What stays behind the Data Room

Anything that requires real interest to read:
- Financial model (3-year P&L, ARR projections)
- GitHub access (for technical investors)
- Patent filings (six provisionals, full text)
- Pre-formation creditor warrant schedule
- Wind-down packet for TitleApp LLC (only relevant to old TitleApp investors)
- Cap table detail (post-round modeling)
- Detailed architecture overview

Investors access the Data Room only after they sign in via the IR Worker magic-link flow.

---

## Who Kent is calling

The contacts spine has **~3,000 enriched contacts**. The right segments for the first two weeks:

### Segment 1 — Warm operators with prior interest
- Anyone Sean or Kent has had a direct conversation with about the platform thesis in the last 6 months
- Anyone who replied to a prior outreach (positive or neutral)
- Storyhouse Ventures network (their LPs, their portfolio CEOs)

### Segment 2 — Warm-cold, high-signal investors
- Pre-seed and seed-stage VCs in AI tooling, vertical SaaS, or creator economy
- Angel investors who have publicly written about agent platforms, vertical AI, or compliance tech
- Family offices with a stated interest in early-stage software

### Segment 3 — Strategic operators (lower priority for raise, higher for distribution)
- C-level operators in aviation, real estate, auto dealer, government — the verticals SOCIII serves
- These are credibility + advisor candidates more than investor candidates

**Do not call this week:** the 28 accelerators list (deferred — different motion).

Segment filter: once the IR Phase 1 is live and the segment is exposed in the Contacts tab, Kent works from the platform. Until then, work from the CSV export Sean provides.

---

## The investor flow (what happens after they say yes)

When an investor confirms interest, the platform handles the rest:

1. Kent (or Sean) posts to `POST /v1/ir:investor:initiate` with `{ email, name, investmentAmount }`. The platform creates the investor record and emails a magic link.
2. Investor clicks the link → magic-link auth → lands in their personal SOCIII workspace.
3. Stripe Identity verification (SOCIII pays the $1.50/session fee). Takes ~3 minutes.
4. SAFE document presented via Dropbox Sign. Investor reviews and signs.
5. Signed SAFE auto-files into the investor's SOCIII Vault. Confirmation email sent. Investor sees the office-hours booking link.
6. SOCIII receives funds per wire instructions in the executed SAFE.

**Kent's role:** make the call, confirm interest, fire the initiation. Everything else runs without Kent's involvement until the investor wants to chat post-signing.

**Kent's safety net:** if anything breaks in the flow, the investor lands in the SOCIII platform with Alex (the platform Chief of Staff) available in chat. Alex is trained on the deck, the differentiation, the cap table, the patent family, the round terms — Alex can walk an investor through the whole story and answer their questions without Kent or Sean on the line. (See "Alex on fire" section below.)

---

## Alex on fire — the worker doing the walkthrough

This is the demonstration that proves the platform's thesis: an AI agent (Alex) walking an investor through the SOCIII deck and answering their questions, governed by the same RAAS guardrails and audit trail that protect every other worker on the platform.

For prospects who want to self-explore before scheduling a call, Kent can route them to **alex.sociii.ai** (or the platform's chat surface in their personal workspace). Alex:

- Knows the deck top to bottom and can walk through it slide by slide on request
- Answers cap table questions with the real numbers (not made up)
- Answers patent questions with the actual filed application numbers and scope
- Handles "why now," "what's the moat," "use of proceeds," "competitive landscape" with the canonical answers
- Routes "I want to talk to a human" requests to Sean's or Kent's calendar (office hours flow)
- Records the entire conversation in the investor's Vault for transparency

This is the platform proving itself. The audit trail is the evidence; Alex is the demo.

(Implementation status: Alex IR knowledge module being built 2026-05-25 — see `services/alex/knowledge/ir-context.md` once committed.)

---

## Talking points Kent should be ready for

### "Why now?"
The patent family was filed last weekend — six provisionals covering Knowledge Capture, Audit Trail, Build-Without-Code, Escrow Locker, Title/Property Assurance, and RAAS Multi-Tier. Pre-formation IP is locked in. The platform's been in production since 2024; what changed is corporate structure (clean Delaware C-corp via Stripe Atlas) and the launch story.

### "What's the moat?"
Three layers. The patent family is the defensive IP layer. The rules engine (RAAS) is the compliance moat — encoding 200+ verticals' professional rules is a multi-year build that's already done. The Sandbox is the network effect — domain experts build workers, the marketplace grows organically, each new worker recruits the next.

### "What's the GTM?"
Three motions in parallel. Enterprise: Kent's outbound to the operator audience. Consumer/creator: the meme rollout on consumer social starting Thursday 2026-05-28 — the "anyone can build a worker" thesis lands first with the people whose problems are most personal. Developer: SDK + docs site for integrators.

### "Who else is investing?"
Storyhouse Ventures is the friendly first read this week. Sean self-funded the 12 months leading to this round; he has the runway to keep going without raising. The round opens when the cap fills; we're sequencing for quality over speed.

### "What's the use of proceeds?"
12-18 months of runway. Headcount: 2-3 engineers + 1 designer. Compute: AI inference is the largest variable cost. Marketing: paid acquisition for the creator audience after the organic meme drop validates demand. Infrastructure: scaling the platform from low-thousands of users to mid-five-figures.

### "Cap table?"
- **Founder (Sean Combs)** — majority position post-round, exact percentage depends on round size
- **Cofounder (Kent Redwine)** — 15% milestone-vested cofounder equity + 5% success fee on capital sourced
- **Advisor pool** — ~2.5% (2% baseline per advisor, capped at 5 advisors pre-round)
- **Creator warrants** — ~3-5% allocated for domain-expert worker creators
- **Pre-formation creditor warrants** — ~1.7% from Sean's allocation, honoring prior-venture commitments
- **New investors** — remainder, sized to the round

Specific percentages in the Data Room.

### "Patent details?"
Six provisionals filed 2026-05-24 via USPTO EFS-Web. Application numbers in the Data Room. Conversion deadline ~2027-05-24. Counsel on call for any deep-dive questions.

### "What changed from TitleApp?" (reactive only)
If they know TitleApp: brand and entity. The codebase, the workers, the architecture, the patent family — all continuous. TitleApp LLC is winding down; SOCIII Inc. is a clean Delaware C-corp formed via Stripe Atlas on 2026-05-19, EIN 42-2675951. Pre-formation creditors are being honored from Sean's founder allocation, not from investor dilution.

If they don't know TitleApp: don't bring it up.

### "How does Kent fit?"
Cofounder, equity-vested. Sean runs the platform and the product; Kent runs fundraising, BD, and outbound. Long-standing professional relationship, formalized as cofounder structure at SOCIII Inc. formation. Specific terms in the cap table summary.

### "What's the valuation?"
Market for AI-agent platforms. Recent comps include NanoClaw. Happy to share specific cap in a conversation under a non-disclosure.

---

## Hard rules Kent operates under

1. **No specific raise dollar amount in writing.** Talk in terms of "market" or "in line with recent comps," not "we're raising $X." Memory rule: raise specificity stays verbal.
2. **No NDA required for the standard pitch.** Storyhouse + select strategic conversations may warrant an NDA — Sean's call on those.
3. **No promises about future valuation, dilution, or board seats.** Stick to the SAFE terms as written.
4. **Anyone serious about investing should be sent through the IR flow.** Don't email PDFs around or attach docs to email outside the deck — that creates a paper trail outside the platform's audit layer.
5. **If counsel needs to be looped in, loop in Sean first.** Don't directly engage counsel without Sean.
6. **Storyhouse Thursday is the priority.** All other Monday-Wednesday calls are warmup for that walkthrough.
7. **Lead with differentiation, not corporate evolution.** Most prospects don't know TitleApp. Bringing it up wastes the opener.

---

## What Kent doesn't have to do

- Build cap-table spreadsheets — the platform does this.
- Email PDFs of the SAFE — the platform does this.
- Track investor KYC status — the platform does this.
- Remember to send post-call follow-ups — Sean's calendar + the IR worker handle reminders (Phase 5).
- Worry about wire instructions — they're in the executed SAFE.
- Memorize all the talking points — when in doubt, route to Alex in the platform chat for the canonical answer.

Kent does the calls. The platform does the paperwork. Alex does the deep walkthroughs and the Q&A. That's the division of labor.

---

## End-of-day status update

Kent sends Sean a brief end-of-day note:
- How many calls dialed
- How many connected
- How many interested → magic-link sent
- Any specific investor signals worth Sean's attention before next day
- Anything that broke in the platform flow (Sean fixes before next morning)

Operating cadence: Kent + Sean sync each morning, Kent runs the calls, the platform handles the paperwork, end-of-day status closes the loop.

---

## Kickoff call agenda (Monday morning — Sean + Kent)

Suggested 30-45 minutes:

1. **5 min** — Read the v2 pitch out loud, in voice. Kent tries it; adjust language to his natural cadence.
2. **5 min** — Walk through the three differentiators. Kent's version of each, in his own words.
3. **10 min** — Demo the investor flow end-to-end with a test investor (you+test@example.com or similar). Magic link → KYC → SAFE → Vault. Kent sees what a "yes" looks like in the platform.
4. **5 min** — Demo Alex doing a deck walkthrough. Kent sees what Alex can do when an investor wants to self-explore.
5. **5 min** — Review the segment Kent will work this week. Names of first 10-15 calls.
6. **5 min** — Operating cadence: morning sync, end-of-day update format, when to loop Sean in.
7. **Open Q&A** — Kent surfaces anything not covered.

---

*Playbook v2 drafted 2026-05-25 post-workout. Supersedes v1. Changes: dropped TitleApp framing from lead pitch, dropped $10M cap reference (market-based instead), added Kent's cofounder role to cap table answer, added Alex-on-fire section, deck goes with outreach + deeper materials in Data Room, kickoff call agenda added.*
