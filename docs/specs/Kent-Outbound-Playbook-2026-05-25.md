# Kent — Outbound Playbook for SOCIII Pre-Seed

**Audience:** Kent
**Owner:** Sean
**Effective:** 2026-05-26 (Monday, first day of outbound calls)
**Updated:** 2026-05-25

---

## What we're doing

We're raising a pre-seed round into **SOCIII Inc.** The fundraise is the rebranded continuation of the TitleApp work — same architecture, same patent family, same Sean-led platform — but as a clean Delaware C-corp with the wind-down of TitleApp LLC happening in parallel.

**Round structure:** SAFEs at a $10M valuation cap. YC post-money template, counsel-approved.

**Storyhouse Ventures** is the friendly first read — they've expressed interest, the conversation is warm, the SOCIII walkthrough happens **Thursday 2026-05-28.** Everything between now and Thursday is either Kent calling out, Sean making content, or me building.

---

## Who Kent is calling

The contacts spine has **~3,000 enriched contacts** (Sean's + Kent's combined LinkedIn networks, imported and de-duped). The right segment for outbound this week:

### Segment 1 — Warm operators who've expressed interest
- Anyone Sean or Kent has had a direct conversation with about SOCIII / TitleApp / the platform thesis in the last 6 months
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

To pull the segments in the platform: once IR Phase 1 is verified live, Kent uses the Contacts tab → filter by `vertical` and `disposition`. Until then, work from the CSV export.

---

## The 60-second pitch

> "Hey [name], it's Kent. Sean Combs and I are raising a pre-seed for **SOCIII** — the rebrand and recapitalization of the TitleApp work you may have seen.
>
> Short version: it's a platform where domain experts package what they know into AI Digital Workers — governed by a rules engine, every output carries an audit trail. We just filed a six-patent family last weekend covering the core architecture. SOCIII Inc. is the new Delaware C-corp; TitleApp LLC is winding down.
>
> We're raising on a YC-style SAFE at a $10M cap. Friendly first reads happening this week. Worth a 15-minute call?"

**Variations by segment:**

- **Operators in verticals:** lead with the worker stack for their vertical (aviation has 56 workers, RE has 67, auto has 29, etc.).
- **AI/agent VCs:** lead with the multi-tier RAAS architecture + the patent claims on parent-child Digital Title Certificate composition.
- **Creator-economy investors:** lead with the platform-as-cultural-producer story — domain experts earning warrants on the workers they author.

---

## The investor flow (what happens after they say yes)

When an investor confirms interest, Kent sends them a magic-link invitation that drops them straight into the SOCIII platform's investor onboarding:

1. Kent (or Sean) posts to `POST /v1/ir:investor:initiate` with `{ email, name, investmentAmount }`. The platform creates the investor record and emails a magic link.
2. Investor clicks the link → magic-link auth → lands in their personal SOCIII workspace.
3. Stripe Identity verification (SOCIII pays the $1.50/session fee). Takes ~3 minutes.
4. SAFE document presented via Dropbox Sign. Investor reviews and signs.
5. Signed SAFE auto-files into the investor's SOCIII Vault. Confirmation email sent. Investor sees the office-hours booking link (Cal.com stopgap until native booker ships).
6. SOCIII receives funds per wire instructions in the executed SAFE.

**Kent's role:** make the call, confirm interest, fire the initiation. Everything else runs without Kent's involvement until the investor wants to chat post-signing.

**Kent's safety net:** if anything breaks in the flow, the investor lands in the SOCIII platform with Alex (the platform Chief of Staff) available in chat to answer questions. Alex is wired to know the cap table state, the fundraise context, and basic deal terms.

---

## Talking points Kent should be ready for

### "Why now?"
The patent family was filed last weekend — six provisionals covering Knowledge Capture, Audit Trail, Build-Without-Code, Escrow Locker, Title/Property Assurance, and RAAS Multi-Tier. Pre-formation IP is locked in before the grace-period clock runs out 6/28/2026. The platform's been in production since 2024; what changed is corporate structure and naming.

### "What changed from TitleApp?"
Brand and entity. The codebase, the workers, the architecture, the patent family — all continuous. TitleApp LLC is winding down; SOCIII Inc. is a clean Delaware C-corp formed via Stripe Atlas on 2026-05-19, EIN 42-2675951. Pre-formation creditors are being honored from Sean's founder allocation, not from investor dilution.

### "What's the moat?"
Three layers. The patent family is the defensive IP layer. The rules engine (RAAS) is the compliance moat — domain experts can encode their professional rules without writing code. The marketplace is the network effect — 200+ workers across 7 verticals, growing weekly.

### "What's the GTM?"
Three motions in parallel. Enterprise: Kent's outbound to the operator audience. Consumer/creator: the "OF for Smart People" meme rollout starts Thursday 2026-05-28 on consumer social. Developer: SDK + docs site for integrators.

### "Who else is investing?"
Storyhouse Ventures is the friendly first read this week. Sean self-funded the 12 months leading to this round; he has the runway to keep going without raising. The round opens when the cap fills; we're sequencing for quality over speed.

### "What's the use of proceeds?"
12-18 months of runway. Headcount: 2-3 engineers + 1 designer. Compute: AI inference is the largest variable cost. Marketing: paid acquisition for the creator audience after the organic meme drop validates demand. Infrastructure: scaling the platform from low-thousands of users to mid-five-figures.

### "Cap table?"
Founder (Sean) ~60% at close. Advisor pool ~2.5% (cap, 2% baseline per advisor, max 5 advisors before this round). Creator warrants ~3-5% across this and next round. New investors from this round take the remainder. Specific numbers in the Data Room.

### "Patent details?"
Six provisionals filed 2026-05-24 via USPTO EFS-Web. Application numbers in the Data Room. Conversion deadline ~2027-05-24. Counsel on call for any deep-dive questions.

---

## What's in the Data Room

(Accessible to confirmed investors via the IR Worker once they sign in.)

- SOCIII Inc. formation docs (Stripe Atlas COI, EIN letter)
- YC-style SAFE template (the document the investor will sign)
- One-pager summary
- Pitch deck (current version)
- Patent family — six filed provisionals
- Pre-formation creditor warrant schedule (the Robert / Eric / Peter / etc. context)
- Wind-down packet for TitleApp LLC
- Financial model (3-year P&L, ARR projections)
- Architecture overview

**Sean to upload to the Data Room:** the deck and the model. The rest is already in the platform.

---

## Hard rules Kent operates under

1. **No specific raise dollar amount in writing.** Talk in terms of "cap and round," not "we're raising $X." Memory rule: raise specificity stays verbal.
2. **No NDA required for the standard pitch.** Storyhouse + select strategic conversations may warrant an NDA — Sean's call on those.
3. **No promises about future valuation, dilution, or board seats.** Stick to the SAFE terms as written.
4. **Anyone serious about investing should be sent through the IR flow.** Don't email PDFs around or attach docs to email — that creates a paper trail outside the platform's audit layer.
5. **If counsel needs to be looped in, loop in Sean first.** Don't directly engage counsel without Sean.
6. **Storyhouse Thursday is the priority.** All other Monday-Wednesday calls are warmup for that walkthrough.

---

## What Kent doesn't have to do

- Build cap-table spreadsheets — the platform does this.
- Email PDFs of the SAFE — the platform does this.
- Track investor KYC status — the platform does this.
- Remember to send post-call follow-ups — Sean's calendar + the IR worker handle reminders (Phase 5).
- Worry about wire instructions — they're in the executed SAFE.

Kent does the calls. The platform does the paperwork. That's the division of labor.

---

## End-of-day Monday status update

Kent should send Sean a brief end-of-day note:
- How many calls dialed
- How many connected
- How many interested → magic-link sent
- Any specific investor signals worth Sean's attention before Tuesday
- Anything that broke in the platform flow (Sean fixes before Tuesday morning)

This is the operating cadence for the week. Kent + Sean sync each morning, Kent runs the calls, the platform handles the paperwork, end-of-day status closes the loop.

---

*Playbook drafted 2026-05-25. Updated as Storyhouse Thursday approaches.*
