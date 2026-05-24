# Personalized Outreach Worker — Scaffold Spec

**Catalog slug (provisional):** `platform-outreach` or `PLAT-007`
**Vertical:** Platform spine (universal — bridges IR + HR)
**Pricing tier:** $79/mo (Tier 3 — high-value, high-stakes use case)
**Status:** New scaffold — concept surfaced by Sean 2026-05-24 during the advisor/investor deck iteration session
**Origin:** Sean's framing — *"the customized decks for advisory and creators and investors (which I guess is either in IR and also HR, I'm guessing it's first an IR issue, then becomes an HR issue)"*

---

## The IR → HR Lifecycle Insight

The canonical lifecycle for any equity grant (advisor, creator, investor) has four phases that span two roles:

| Phase | Role | What happens | What the worker does |
|---|---|---|---|
| 1. Outreach | IR | Personalized deck + email + invitation | Generates the deck variant; drafts the email; sends |
| 2. Acceptance | IR→HR handoff | Recipient clicks 3-checkbox flow + KYC | Surfaces the landing page; routes the attestations; triggers KYC |
| 3. Onboarding | HR | Equity grant executed; agreements signed; access provisioned | Generates the FAST agreement variant; routes to e-signature; provisions workspace access; books kickoff call |
| 4. Ongoing | HR | Quarterly calls; vesting events; renewals; offboarding when applicable | Calendar cadence; vesting tracker; performance check-ins; clean exit flow if needed |

Most platforms split these into separate tools (CRM for outreach, HRIS for onboarding, equity-management for vesting). **SOCIII's wedge: one worker, one record, one continuous relationship from "we'd like you in this round" through "your warrants accelerated on exit."**

---

## What This Worker Does

The Personalized Outreach Worker manages the full lifecycle of every advisor, creator, and investor relationship from initial outreach through accepted equity grant through ongoing engagement.

### Core capability 1 — Deck Personalization Engine

Given:
- Master deck template (advisor / creator / investor variant)
- Recipient profile (their bio, their relationship history with Sean, their domain expertise, their geographic + tax residency)
- Round context (current round terms, advisor roster, capital plan)

Produces:
- Customized slide 1 (cover with recipient name)
- Customized "Why You" slide (their specific role and what they unlock)
- Customized "Round Roster" line (their position in the team)
- Tax-jurisdiction-appropriate equity structure language (e.g., for EU residents the warrant structure references the EU tax-optimization conversation)

Reference fixtures from the May 2026 advisor outreach cycle:
- Elise van der Bel (EU DPP, no prior history — newer relationship, more formal opening)
- Robert Rosenberg (30-year relationship, prior creditor exposure — warmer, more direct)
- Eric Altshuler (long history, aviation expertise — peer-to-peer tone)
- Scott Eschelman (TitleApp LLC carry-forward — direct, references shared journey)
- Kim Bennett (relatively new — middle warmth)
- Ruthie Clearwater (new — formal but enthusiastic)
- Dan Bass + Stan Stalknaker (three-venture rollover, HUB Culture — gratitude-forward)
- Tony Grenberg (most patient supporter, Brock Pierce network — recognition-forward)

Each fixture captures the relationship duration, the personalization decisions made, and the resulting tone. The worker uses these as templates for future recruitment cycles.

### Core capability 2 — Email Draft Generation

Same input as the deck personalization. Produces:
- Subject line (matching recipient familiarity level)
- Opening paragraph (acknowledging relationship history honestly — not pretending more than exists)
- Body (SOCIII context + why this person specifically + the structure + tax considerations + soft ask)
- P.S. (often the most-read part — relationship-appropriate closing detail)
- Sign-off (matching the relationship — "Sean" vs "Sean Lee Combs" vs "— Sean ✈️")

Sean reviews and edits before send. The worker drafts; Sean ships.

### Core capability 3 — Acceptance Landing Flow

The three-checkbox flow with magic-link tokenization, KYC integration via Stripe Identity / Coinbase Verified, and audit-chain anchoring of each acceptance event.

Each acceptance produces:
- A cryptographically-bound record tying recipient identity → deck version → terms version → KYC attestation
- Survives later disputes (audit chain provides definitive answer to "what did they agree to?")
- Triggers the HR handoff to onboarding workflows

### Core capability 4 — HR Handoff Automation

Once acceptance lands:
- FAST advisor agreement (or creator agreement, or investor subscription agreement) generated from the appropriate template + recipient-specific terms
- Routed to Dropbox Sign for e-signature
- Workspace invite generated (recipient gets SOCIII workspace access matching their role)
- Kickoff call scheduled (Calendly integration or Google Calendar direct booking)
- Equity grant entered into cap table (Cap Table worker integration)
- Welcome email + onboarding doc package sent

### Core capability 5 — Ongoing Relationship Cadence

Quarterly call reminders. Vesting event tracking. Annual W-9 or W-8BEN refresh for tax-reporting. Renewal alerts. Offboarding flow when applicable.

For advisors specifically:
- Quarterly check-in scheduled automatically
- Pre-call brief generated (what's been happening in their domain, what SOCIII needs from them this quarter)
- Post-call notes captured + filed to the relationship record
- Annual vesting milestone triggers

---

## Architecture

**Tier 0 Platform Safety:**
- No equity grant communicates value without proper risk disclosure
- All securities-related communications require disclaimer footers
- KYC required before any equity issuance (Reg D 506(b) accredited investor verification)

**Tier 1 Platform Ops:**
- Workspace access provisioning requires explicit acceptance step
- All grants require Sean's confirmation before final issuance (not automated end-to-end without human checkpoint)
- Cap table updates require Cap Table worker integration

**Tier 2 Vertical baseline (Equity Recruiting + Securities Compliance):**
- Reg D 506(b) exemption requirements (accredited investor self-certification + reasonable belief)
- Standard advisor agreement terms (FAST template by Founder Institute, YC advisor template)
- US tax considerations (83(b) election timing, IRC § 422 ISO limits for employee/contractor distinction)
- International advisor tax considerations (US-EU tax treaty implications, Spain Beckham Law eligibility, Netherlands holding company structures)
- USA PATRIOT Act AML requirements

**Tier 3 Workspace overlays:**
- Per-tenant template variants
- Per-tenant relationship history depth (how much past context is brought into outreach)
- Per-tenant approval policy (who must approve before send)

**Tier 4 Per-recipient rules:**
- Specific recipient's prior commitments (creditor warrants, prior LLC positions)
- Specific recipient's tax structure preferences
- Specific recipient's communication preferences (frequency, channel)

---

## Strategic Significance

**For Sean's immediate use:** the May 2026 advisor outreach cycle is the seed. Sean is currently doing this work by hand (writing each advisor email individually, customizing each deck). The worker captures that pattern so it scales without losing the personal touch.

**For SOCIII's broader market:** every founder raising capital faces this exact problem. The Personalized Outreach Worker becomes a flagship platform spine worker that any startup founder can subscribe to and have their advisor + investor outreach managed with the same relationship-aware care that Sean is giving his network.

**For the Knowledge Capture Pipeline patent (Filing 2 this weekend):** this worker is a strong reference embodiment. Tacit founder expertise (how to write a recruiting email that doesn't sound transactional, how to personalize a deck without losing the core message, how to honor a 30-year relationship in a 250-word ask) becomes packaged as a worker capability that other founders can invoke.

---

## Build Phases (Estimated 15-18 dev days)

**Phase 1 — Outreach + Deck Personalization (4-5 days)**
- Worker scaffold + system prompt
- Deck template engine (master template + personalization slots)
- Email draft generation
- Recipient profile schema

**Phase 2 — Acceptance Landing Flow (3-4 days)**
- Magic-link tokenization
- Three-checkbox landing page
- Audit-chain integration (every acceptance event anchored)
- KYC integration via Stripe Identity

**Phase 3 — HR Handoff Automation (3-4 days)**
- FAST agreement generation (advisor variant)
- Creator agreement variant
- Investor subscription doc variant
- Dropbox Sign routing
- Workspace invite trigger

**Phase 4 — Cap Table Integration (2-3 days)**
- Vesting schedule entry
- Cap table update (Cap Table worker handoff)
- Creditor warrants integration (per the May 22 memo)

**Phase 5 — Ongoing Relationship Cadence (3-4 days)**
- Quarterly call cadence
- Pre-call brief generation
- Post-call notes capture
- Annual tax-document refresh

---

## Open Questions

1. **One worker or two?** Single worker spanning IR→HR is the elegant answer. But operationally, IR is often a fundraising-focused role and HR is an operations-focused role. Could split into "Outreach" + "Onboarding" sister workers with explicit handoff. Recommend single worker for V1; split if usage patterns indicate two distinct buyers.

2. **Securities counsel attestation:** This worker generates documents that have securities-law implications. The counsel attestation pattern (`project_user_counsel_attestation_pattern.md`) applies — user attests they have counsel reviewing before any equity grant is finalized.

3. **Cap Table worker dependency:** This worker can't fully ship without the Cap Table worker (#229 HOM DAO reconciliation → IR/Cap Table worker foundation) being further along. Phase 4 specifically requires the cap-table data model. Phases 1-3 can ship standalone.

4. **Recipient privacy:** The worker maintains rich relationship records for each advisor / creator / investor. Privacy and security handling for that data needs to follow the same pattern as the Contacts spine worker (per-tenant isolation, encryption at rest, access controls).

5. **Communication channel coverage:** V1 is email-only outbound. V2 adds LinkedIn DM, Telegram for Web3 contacts, WhatsApp for international advisors. Sequence depends on Sean's actual recruiting patterns.

---

## Connection to the Pre-Formation Creditor Warrants Memo

The creditor warrant outreach (Robert, Eric, Dan, Stan, Tony, etc.) is the highest-stakes test of this worker. Each creditor has:
- A specific cash exposure across one to three prior ventures
- A specific relationship history with Sean (30 years for Eric and Robert; shorter for Tony)
- A specific tax structure consideration (Robert's stolen funds, Bass family HUB Culture follow-on potential, Tony's RAMPRATE corporate structure)

The worker handles this complexity by templating around the variables: cash amount, venture rollover count, tier (1/2/3), special circumstances, follow-on capital potential. Each outreach feels personal because the personalization variables are actually loaded with that person's real data.

This is the kind of high-trust, high-customization, high-stakes outreach that GENERIC AI tools cannot do safely. SOCIII's audit-chain + governance architecture makes it deliverable.

---

*Scaffold spec produced 2026-05-24. Concept new today; build window post-launch once advisor/investor outreach cycle has produced enough fixtures to seed the personalization templates.*
