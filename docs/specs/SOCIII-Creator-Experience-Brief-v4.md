# The Creator Experience — Product Brief v4

**Audience:** Sean + outside reviewers (Claude on the SOCIII corporate account, OpenAI). This is the strategic frame, not a build spec. It's also the implementation gate — once Sean signs off on v4, code work on the Creator Journey begins.

**v4 changes from v3 (2026-05-31, second pass):**

1. **Type D — The Consultant added.** ~40-60% of addressable market (attorneys, CPAs, RE brokers, aviation instructors) who won't touch GitHub. Distinct entry path: Sociii Studio (inbound-only, no public pricing, $500/hr scoped engagements). See Sections 2 + 10.
2. **TRANSFORMATION as third axis in the single sentence.** People pay huge money to BECOME someone (degrees, PADI certs, MBAs). The platform isn't just tradeable + recognized — it's transformational. See Section 1.
3. **Beat 6 (Mockup Preview) moved BEFORE Beat 5 (Install Grind).** Server-rendered Worker mockup based on Beat 4 artifacts. They see "their" Worker before they install anything. Massive emotional reordering. See Section 3.
4. **New Beat — Forge First Customer.** Sean's idea, evolved. Forge Reviews (independent entity, funded by SOCIII but editorially independent) subscribes to every new Worker within 72 hours of listing. Solves cold-start customer problem AND provides structured feedback. Slotted between Merge+Public Identity and Network Activation. See Sections 3 + 9.
5. **Cheerleader → Coach reframe + Status Thread as distinct function.** Two parallel emotional mechanics: Coach (responds to frustration) and Status Thread (affirms at progress). Idle prompts killed. See Section 5.
6. **AI reviewer scope reduced.** Security + capability declarations + structural breakage + obvious functional issues only. Naming/style/taste out. Prevents "please ignore this stupid comment" failure mode. See Section 7.
7. **Lane 3 → "Research Preview" framing.** Google Labs not App Store. Visual differentiation matters. Graduation criteria explicit. See Section 8.
8. **Pricing tier rule.** No $79 Workers Day 1. Universal — even Fellows. Distribution beats pricing on Day 1, no exceptions. Tiered graduation based on TRpW (Total Revenue per Worker), not subscriber count. See Section 11.
9. **Data fees as Beat 4 design consideration.** Smart creators optimize for data-fee revenue, not subscription tier. Beat 4 conversation walks through "what data does your worker pull and from where." Subscription cancellations don't kill data revenue. See Sections 3 + 11.
10. **SOCIII Certified Creator + Advanced Creator credentials.** PADI-style portable status. $149 sticker / $49 paid / Free at 5 Workers. The win condition is badges on LinkedIn/UpWork/Fiverr. See Section 9.
11. **Honest Beat 5 timing.** 90-180 minutes for Type A creators. Stop pretending it's 45-60 universally.
12. **Beat 9 SLA explicit.** Same-day for AI auto-merge, 5 business days for peer review, 5-10 for Sean review.
13. **Exit instrumentation.** Lightweight telemetry even with manual self-report so we know where churn happens.
14. **Worker maintenance status flag on Marketplace listings.** Silent deprecation is a customer trust problem.
15. **Rebalanced thematic weight.** v3 was ~40% onboarding / 30% validation / 20% recognition / 10% distribution. v4 is ~25% / 15% / 20% / 40%. Customer acquisition is now load-bearing. See Section 14.
16. **Customer Acquisition Loops as dedicated subject.** Was implicit. Now explicit. See Section 14.

**Premise unchanged:** Whatever code we ship next will be judged by a simple question — does Ruthie sit down at her terminal tonight, walk through her journey, and end up feeling that this is the most rewarding work she's done in a while? If yes, the journey is right. If no, the code shape doesn't matter.

---

## 1. The Single Sentence (v4)

**The SOCIII creator experience is the moment a domain expert realizes their knowledge can become a product, a reputation, and eventually a business — and the platform respects them enough to be honest about the work it takes.**

Three axes — TRANSFORMATION + RECOGNITION + REVENUE — not just two. The deepest payoff is *becoming someone*. People pay $400-$1,000 for PADI Open Water because they become a *diver*. People pay $30K for a state MBA because they become *creditialed in business*. People pay $5K for a startup accelerator because they become a *founder*.

SOCIII does the same thing for domain expertise. Ruthie isn't just authoring a Worker — she's becoming a SOCIII Certified Creator with a credential that lives on her LinkedIn for the next 20 years. The Worker is the artifact; the transformation is the product.

This reframe matters because it explains why creators will tolerate the 90-180 minute install grind, the validation discomfort, the public PR review. They're not just shipping software. They're earning identity.

---

## 2. Four Creator Types (v4 expanded)

### Type A — The Domain Expert (Ruthie)

Twenty-five years of clinical and teaching experience. Knows Tanner's clinical judgment model, knows the ANA Standards. Lives the *content*. Terrified of breaking the platform. Will sit down at the terminal because the platform respects her expertise; will quit if it patronizes her.

### Type B — The Adjacent Builder (Elise)

HTML, CSS, Liquid, some Python. Comfortable in a terminal. Built Shopify themes. Hangs around AI Twitter. Edge is *taste and speed of iteration*. **Underspecified in v3 — corrected here:** her churn vector is Beat 4 feeling dumbed-down for someone who already knows what she wants to build. Express path through Beat 4 for "I know my schema, give me the form." See Section 3 Beat 4.

### Type C — The Quiet Founder

Solo or two-person shop with a systematized workflow. Aviation MRO. Title clerk. Homeschool curriculum author. Not asking permission. Wants to monetize. Will see through marketing language faster than any other type. Wants tools, not validation.

### Type D — The Consultant (NEW in v4)

Attorney. CPA. Real estate broker. Title officer. Aviation instructor. Insurance specialist. **Probably 40-60% of the addressable market.** They have:
- Expertise that's worth $300-500/hour billable
- An existing audience (clients, referral network, professional community)
- Zero interest in installing Node or fighting with Git on a Saturday
- Willingness to pay real money for outcome certainty

**Their entry path is NOT the self-service Journey.** It's **Sociii Studio** — inbound only, qualified intake call, $500/hour scoped engagement. They pay Sociii Studio to author + deploy their Worker. They never see the install grind. They go straight to Beat 10 (Network Activation) with a finished, marketplace-listed Worker. See Section 10.

The Studio path is how SOCIII captures the consultant market without compromising the self-service Journey for Types A/B/C. It also self-funds — at $500/hour effective revenue against $50-150/hour delivery cost, Studio is profitable infrastructure.

---

## 3. The Journey (v4 reordered, beat-by-beat with Status Thread woven through)

Twelve canonical beats from first encounter to first payout (Types A/B/C). Type D skips Beats 1-9 via Studio.

### Beat 1 — Discovery (5 minutes)
**Where:** sociii.ai landing page or referral link from Kent/X/LinkedIn.
**Status Thread:** *"Most people close this tab. You're still reading."*
**What they should feel:** Surprised recognition — *this is for me?*
**Bar:** A nurse who has never thought of herself as a "creator" should look at the page and say *"Oh — like Substack but I get paid for what I actually know."*

### Beat 2 — The Maybe-I-Could Moment (10 minutes)
**Where:** Public marketplace browsing.
**Status Thread:** *"You clicked into the marketplace. Most people scroll past listings without engaging."*
**What they should feel:** Specific envy — someone like me is recognized AND earning.
**Bar:** Each creator profile feels like a Substack author page or a HuggingFace researcher page. A *person with proof of work*. Not a SKU listing.

### Beat 3 — The Commitment + CV Capture (15 minutes)
**Where:** Creator-onboarding surface. Beats 1-3 run publicly without auth (localStorage state). Sign-up at end of Beat 3 migrates state seamlessly to account. *Never re-fill a screen.*
**What happens:**
- Plain-language Creator Agreement (Lane 2 path) click-through
- Honest difficulty acknowledgment (CV-context-aware copy — different framing for different professional backgrounds)
- CV Capture: "Tell us about you. 3 sentences. Title, years, biggest win." This becomes the Coach's *material*.
- Decision
**Status Thread:** *"Thirty minutes invested in your monetization path. That's already further than most professionals get."*
**Coach Function (if Type C signals "just give me the tools" via CV):** Suppress encouragement modules. Tool-first mode.
**Bar:** Feels like signing up for a fellowship, not a SaaS trial. Specific. Mutual. Adult.

### Beat 4 — The Idea Conversation (30 minutes — Type B express path 10 minutes)
**Where:** Alex chat or dedicated "shape your Worker" surface. BEFORE the install grind.
**What happens:** Conversation about Worker content (NOT technical):
- What problem the Worker solves
- Who uses it
- What success looks like
- What it's NOT
- A *name*
- A *voice*
- A first pass at *visual identity* — colors, generated logo (Fal.ai), tagline
- **NEW: What data does the Worker pull and from where?** Apollo for contacts? ATTOM for property data? Customer's CRM? Each integration is a data-fee opportunity AND a stickiness mechanism. Smart creators optimize for data-fee revenue, not just subscription tier.

By the end: `intent.md` populated, Worker has a NAME + LOGO + TAGLINE + DATA INTEGRATION PROFILE.

**Type B express path:** "I know what I'm building. Give me the schema, not the conversation." Skips guided dialog, opens YAML editor.

**Status Thread:** *"You just named and designed something. That's further than most people who look at this page."*
**What they should feel:** Domain pride + creative ownership.

### Beat 5 — The Mockup Preview (5 minutes) ⟵ MOVED BEFORE INSTALL IN v4
**Where:** Server-rendered Worker mockup at `sociii.ai/preview/<temporary-id>`. Generated from Beat 4 artifacts. NOT yet running on their fork — that comes later.
**What happens:** They see "their" Worker. Static rendering. Their logo, their colors, their canvas tabs populated with sample data. A "Share this preview" button generates a hosted URL they can text to a colleague *right now*.
**Status Thread:** *"This shareable URL is yours. Most people in your network can't even imagine making this."*
**What they should feel:** **DELIGHT.** Their idea, made real, shareable, within 30 minutes of signing up.

This is the first reward. It comes BEFORE the install grind — by design. The reward is the fuel for Beat 6.

**Reference:** OpenClaw's prior iteration had this immediate-shareable-mockup pattern and it drove activation rates 2-3x. The technical implementation is server-rendering Worker chrome around their Beat 4 artifacts — much simpler than a true runtime sandbox.

### Beat 6 — The Install Grind (60-180 minutes — honest range)
**Where:** Two browser tabs (claude.ai + journey page) + terminal.

**Time honesty by creator type:**
- Type A (Ruthie): 90-180 minutes realistic
- Type B (Elise): 30-60 minutes
- Type C (Quiet Founder): 45-90 minutes

v3 said 45-60 minutes universally. That was Ruthie-optimistic. v4 is honest.

**What happens:** Install Node, Git, GitHub signup, Claude Code, fork, clone. **Two Claudes pattern is load-bearing:**
- Claude Chat (claude.ai in browser) — for screenshots and confusion: "what is this and what do I click?"
- Claude Code (terminal once installed) — for actual code work

The journey page shows the Beat 5 mockup at the top: *"Your Worker is waiting. We're getting you to the point where it actually runs on your laptop."*

**Coach Function fires on FIRST failed install** (not third, per Claude's red team note): *"This is normal. Screenshot the error and paste it into Claude Chat. You'll be unstuck in 60 seconds. The fact that you got Node and Git open already puts you ahead."*

**Status Thread:** *"You got Node and Git installed. The hardest step is behind you."*

### Beat 7 — Real Workspace Preview (5 minutes)
**Where:** SOCIII workspace at app.sociii.ai. Same canvas customers will see.
**What happens:** Their Worker renders in the actual workspace, populated by their sample-data fixtures, branded with their Beat 4 identity. They can tweak the visual identity here (3-minute cosmetic agency after the install pain).
**Status Thread:** *"Your worker is rendering. That's a real product running with your name on it."*
**What they should feel:** Real ownership — this isn't a mockup, it's *the actual product*.

### Beat 8 — Validation (10 minutes)
**Where:** Journey page + terminal.
**What happens:** Run `npm run validate-worker` (structural DoD). Run QA-001 v1 (parse `tests/assertions.md`, run, report). Failures have plain-language explanations + "Ask Claude Code to fix" buttons.
**Habit prompt (when QA-001 passes):** *"It says it works. Now try to break it. Add 3 assertions that SHOULD fail."* Red-team discipline.
**Status Thread:** *"You wrote N assertions about how your worker should behave. Most software ships with zero."*
**Framing:** "Ship a shitty worker, earn no money, get bad reviews — this is for your own benefit." Self-interest aligned with quality.

### Beat 9 — The Pull Request (5 minutes execution + variable review time)
**Where:** Terminal `git push` → GitHub PR.
**What happens:** PR template walks through DoD. CI runs validator + QA-001 + AI reviewer (Section 7). Most PRs auto-merge if clean.

**SLA (explicit in v4):**
- AI auto-merge (~70% of PRs): same day
- Peer review (~20% of PRs): 5 business days
- Sean review (~10% of PRs): 5-10 business days target

Sean's framing: *"First time shipping something is like the first time flying a plane. It's terrifying and you really have no friggin idea what this stuff means."*

**Status Thread:** *"Your PR is in public version control history. Your name is in the open-source record."*

### Beat 10 — Merge + Public Identity (same day for AI-merged; up to 10 days otherwise)
**Where:** Marketplace listing + Creator Profile page at `sociii.ai/c/<handle>` go live.
**What happens:** Worker appears with name + logo from Beat 4. Profile page populates from CV captured in Beat 3 + Stripe Identity verification.

**Habit prompt:** *"Today's a milestone. Write a 3-line codex in your worker's CHANGELOG.md. What did you ship? What surprised you? What's next? You'll thank yourself in a year."*

**Status Thread:** *"Welcome to the [N] [vertical] experts on SOCIII."* (Real number from Firestore, vertical-specific.)

**What they should feel:** STATUS VALIDATION. Publicly recognized expert. Permanent URL with their name.

### Beat 11 — Forge First Customer (within 72 hours) ⟵ NEW IN v4
**Where:** Forge Reviews (independent entity, see Section 9) subscribes to the Worker within 24-72 hours of marketplace listing.
**What happens:** Forge pays full subscription. Money flows through Stripe → Creator wallet (75%) + SOCIII (25% recovered). Forge generates a structured review (private to creator for 7 days, then published).

**Creator receives:**
- "You have your first customer!" notification (with disclosure that it's Forge)
- $X.XX in earnings dashboard
- Private review preview within 7 days (or public review after 7 days if no fixes)
- 7-day window to address negative findings before publication

**Status Thread:** *"You just monetized your expertise. Most people with your skills never do."*

**Why this beat exists (per OpenAI's biggest critique of v3):** First customer matters more than first PR. Without Forge, creators can wait 60+ days for organic first customer — emotionally fatal. With Forge, the first-customer dopamine fires within 72 hours, guaranteed.

### Beat 12 — Network Activation (1-2 days execution; ongoing)
**Where:** Their personal/professional network. Email primary, LinkedIn secondary, X tertiary.

**Tools surfaced (v4 reordering — email FIRST per Claude's red team):**
1. Email template for their professional list (primary for Type A)
2. LinkedIn post template (primary for Type B/C)
3. Pre-generated images (Worker card, Profile screenshot, "I'm a SOCIII Certified Creator" badge once earned)
4. Email signature line generator
5. Pre-formatted text for UpWork/Fiverr Certifications field (once credentialed)

**Coach prompt:** *"Your network is your strongest distribution. The Marketplace is the storefront; your relationships are the door. 80% of early Workers get their first 50 organic customers from the Creator's own network. That's you."*

**Status Thread:** *"Your network is your moat. You're about to convert trust into revenue."*

### Beat 13 — Sustained Customer Acquisition + First Payout (5th of next month for first payout; ongoing loop)
**Where:** Bank account + dashboard.
**What happens:** ACH lands. Dashboard reconciles. **Total Revenue per Worker** breakdown visible — subscription revenue + data fee revenue + per-use fees.

**Status Thread:** *"This is the proof that your knowledge has measurable economic value. The data fee number is the one to watch — it usually grows faster than subscriptions and customers don't cancel data they're using."*

**Worker #2 prompts:** *"What other Worker would you build next? You're 80% set up to ship it faster."*

---

## 4. The Emotional Arc Summary (v4)

| Beat | Time | Status Thread | Emotion |
|---|---|---|---|
| 1 Discovery | 5 min | "Most people close this tab." | Surprised recognition |
| 2 Maybe-I-could | 10 min | "You clicked through. Most scroll past." | Specific envy |
| 3 Commitment + CV | 15 min | "30 minutes — further than most." | Grown-up clarity |
| 4 Idea Conversation | 30 min (10 express) | "You just designed something." | Domain pride + ownership |
| 5 Mockup Preview | 5 min | "This shareable URL is yours." | **DELIGHT** (shareable) |
| 6 Install Grind | 60-180 min (honest) | "Hardest step is behind you." | Anxiety → competence |
| 7 Real Workspace Preview | 5 min | "Real product with your name on it." | Real ownership |
| 8 Validation | 10 min | "Most software ships with zero assertions." | Respect + alignment |
| 9 PR | 5 min + variable | "Your name in open-source record." | **PRIDE** |
| 10 Merge + Identity | same day - 10 days | "Welcome to the [N] [vertical] experts." | **STATUS VALIDATION** |
| 11 Forge First Customer | <72 hours | "You just monetized your expertise." | First-money closure |
| 12 Network Activation | 1-2 days+ | "Your network is your moat." | Audience monetization |
| 13 First Payout + Loop | 5th next month + ongoing | "Data fees grow faster than subs." | Confidence + Worker #2 forming |

---

## 5. Coach Function + Status Thread (two distinct mechanics)

v3 conflated these as "Cheerleader Function." v4 separates them — they have different triggers, different copy patterns, and different risks.

### The Coach Function (responds to frustration)
- **Triggers:** Failed install (first failure, not third), validation failing 5th time, idle for 3+ days mid-journey
- **Voice:** Specific. Improvement-focused. *"That stack trace is the most common Node install error on Mac. Two-line fix. Try this command. It'll take 30 seconds."*
- **NOT:** Generic encouragement ("you got this!"), idle-prompt nags ("haven't seen you in a few days, how's it going?") — the Duolingo failure mode
- **Off-switch:** Beat 3 toggle "Just show me the tools" suppresses Coach modules for Type C creators
- **Tone:** Coach not cheerleader. Domain experts prefer coaches.

### The Status Thread (affirms at progress)
- **Triggers:** Beat completion, milestone achievement, comparative benchmark cleared
- **Voice:** Specific number when available, qualitative when not. Honest. *"You wrote 14 assertions. The platform median is 6."*
- **NEVER:** Fake percentages, cross-vertical comparisons without normalization, generic "great job!" affirmations
- **Numbers honesty discipline:**
  - Real platform data → use it
  - Industry benchmarks → cite them
  - Neither available → qualitative framing only ("most people don't"), never invented percentages
- **Runs forward** (you've just done something noteworthy) — NOT backward (you got stuck, recovery)

### Honest cross-creator-type calibration
- Type A (Ruthie) — wants warm specificity, not generic praise
- Type B (Elise) — wants benchmark comparisons, will appreciate "your QA-001 has more assertions than 70% of v1 Workers"
- Type C (Quiet Founder) — opts out at Beat 3, gets pure tool mode
- Type D (Consultant) — doesn't see Coach/Status Thread at all (Studio path)

---

## 6. The Tiered Review Model (with cold-start interim)

Sean cannot review every PR. The model that scales:

### Tier 1 — Automated AI Reviewer (~70% of PRs)

**Scope (v4 reduced from v3):**
- ✅ Security issues (secrets in code, suspicious capability requests)
- ✅ Missing capability declarations (worker calls `fetch()` but didn't declare `network.external_http_v1`)
- ✅ Structural validation failures (canvas-tabs schema, intent.md missing sections)
- ✅ Obvious functional issues (sample-data missing tab coverage, assertions reference undefined functions)

**Scope removed in v4 (per OpenAI red team):**
- ❌ Naming clarity (taste-based, leads to arguments)
- ❌ intent.md prose quality (subjective)
- ❌ Sample-data realism (subjective)
- ❌ Code style (taste)

**Why scope reduction matters:** Within 6 months, taste-based AI review becomes "please ignore this stupid comment" pattern. Trust collapses. Restrict to objective findings only.

**If everything passes + AI reviewer has no concerns:** Auto-merge with "Quality-Verified" mark on listing.

### Tier 2 — Peer Review (~20% of PRs, eventually)

**The cold-start problem (v3 didn't address):** At 7 creators, there are no peers in the same vertical to review anything. v3 said "20% peer review" — wrong for first 90 days.

**Interim model (v4 explicit):**
- **First 90 days OR until a vertical has 5+ creators:** Tier 2 = AI-reviewer-extended. More thorough Claude prompt, vertical-aware context loading (RAAS work), longer analysis. Not peer review — just deeper AI review.
- **After vertical reaches 5+ creators:** Activate human peer review within that vertical. Status loop: "You've reviewed 10 peer PRs" = community badge → eventual maintainer track.

This isolation prevents "Tier 2 doesn't exist at low N, so review SLA collapses" at exactly the moment word-of-mouth matters most.

### Tier 3 — Sean (~10% of PRs)

- Genuinely novel architecture, capability registry changes, RAAS rule additions, workers in new verticals where no peer pool exists yet
- Sean's review = a handful per week
- **The mystique works HERE.** "Sean reviewed your Worker" is a moment. Scarcity is the feature.

### Cost economics (v4 adds the missing number)

Claude API call per PR at ~$0.50-$2.00 depending on review depth. At 500 PRs/month × $1.50 average = $750/month. Real but trivial against marketplace economics.

### Career path implication

Creator → Peer Reviewer (within vertical) → Maintainer (cross-vertical) → Studio Lead candidate. The platform has built-in advancement.

---

## 7. The Three Lanes (v4 with Research Preview reframe + graduation criteria)

### Lane 1 — OPEN (Apache 2.0 Fork)
**Who:** Hackers, researchers, competitors, devs who want code without process.
**Terms:** Apache 2.0. No marketplace listing. No SOCIII brand. No relationship.
**QC:** None. Not in the picture.
**Our defense:** Closed platform layer (audit + payments + identity + regulatory + customer acquisition + brand) is the value. SDK alone doesn't get there.

### Lane 2 — MARKETPLACE (Standard Creator Path)
**Who:** Domain experts wanting SOCIII customers, infrastructure, brand validation.
**Terms:** Creator Agreement v1.1, tiered review, QA-001, pricing graduation rule (Section 11).
**Revenue split:** 75/25
**Branding:** Full Marketplace listing, "Quality-Verified" badge on pass.

### Lane 3 — RESEARCH PREVIEW ⟵ RENAMED FROM "EXPERIMENTAL" IN v4
**Who:** Brilliant outliers, early-stage workers, innovators pushing platform's design assumptions.
**Visual framing:** Google Labs not App Store. Listings carry distinct "Research Preview" badge, different color treatment, "Beta" feel.
**Terms:** Listed in Marketplace with explicit customer-facing disclosure: *"This is a Research Preview Worker. Minimal quality review. May not have full QA-001 coverage. Use with curiosity, not certainty."*
**Revenue split:** No marketing push, no featured placement, but standard 75/25 if customer subscribes. Earn customers through own promotion only.
**QC:** AI reviewer only (no peer review, no Sean review). DoD lite. QA-001 not required.

### Lane 3 → Lane 2 Graduation Criteria (v4 explicit)

A Research Preview Worker can apply to graduate to standard Marketplace (Lane 2) when ALL of:
- 10+ paying subscribers
- QA-001 pass
- 90 days listed
- Forge review ≥4 stars

Graduation is automatic upon meeting all criteria. No Sean judgment call. Worker's "Research Preview" badge replaced with standard Marketplace listing.

### Why this matters

- **Lane 1 protects innovation** (no friction for hackers)
- **Lane 2 protects the brand** (strict QC for the standard path)
- **Lane 3 protects against being a museum** (bleeding-edge has a path, customers know what they're getting via transparency)

Reference patterns: HuggingFace has all three. Substack has 1+2. We get all three because we're closer to HuggingFace on the technical-platform spectrum.

---

## 8. Forge Reviews (independent reviewer entity)

### Structural setup

- **Separate Delaware LLC** — Forge Reviews LLC. Ownership/governance TBD (could be Sean personally, could be SOCIII Inc., depends on tax + governance preference).
- **Editorial Charter** — written and binding. Forge has full authority over what gets reviewed, what the rating is, what gets published. SOCIII cannot direct, influence, suppress, or edit reviews.
- **Funding** — SOCIII pays Forge a monthly grant covering: subscription costs (Forge actually pays for the Workers it reviews via Stripe), reviewer compensation, infrastructure. Grant is NOT contingent on review tone or outcomes.
- **Public disclosure** — every Forge Review page carries: *"Forge Reviews is operationally funded by SOCIII Inc. Editorial decisions are independent per our published Charter [link]."*
- **Strategic upside** — Forge could eventually review Workers on other AI marketplaces (HuggingFace Spaces, OpenAI GPT Store), take outside revenue, become a real reviewer-of-record for the AI Worker category.
- **Sean CANNOT be on Forge editorial team.** Hard line.

### The Review Process (with 7-day cure mechanic)

1. New Worker lists on Marketplace
2. Within 24-72 hours, Forge subscribes via standard Stripe flow (full subscription paid)
3. Forge reviewer (AI-assisted, human-edited) tests the Worker for 14 days
4. Marketplace listing shows "Under Review by Forge" mark during this period (customers know review is coming)
5. After 7 days, preliminary findings shared privately with creator
6. Creator has 7 days to address negative findings
7. Final review published on day 14:
   - If creator fixed issues → revised review reflects improvements
   - If creator didn't fix → original findings published verbatim
8. Forge never suppresses findings. The published methodology ([link to Forge Charter]) explains this transparently.

### Published methodology language

> *"Forge Reviews tests every Worker we review for at least 14 days before publishing findings. During the final 7 days of testing, we share preliminary findings with the Creator and offer them an opportunity to address issues. Workers that fix substantive issues receive an updated review reflecting the changes. Workers that do not are published with original findings unmodified. We never withhold negative findings — we delay them to give Creators a fair opportunity to improve. Our funding from SOCIII Inc. does not influence our review decisions; see our Editorial Charter for details."*

### Forge funding math at v1 scale

With the pricing tier rule (Section 11) most early Workers are $0 or $29.

| Mix (first 100 Workers) | Monthly Forge subscription cost (gross) | Net after SOCIII 25% return |
|---|---|---|
| 100 free Workers | $0 | $0 |
| 80 free + 20 at $29 | $580 | $435 |
| 50 free + 40 at $29 + 10 at $49 | $1,650 | $1,238 |

So Forge is a $400-1,200/month budget line in v1. Easily fundable.

### Strategic implications

- Forge is the first customer for every Worker — solves cold-start
- Forge reviews accumulate as marketplace content
- "Forge reviewed it" becomes a trust signal customers look for
- Forge could publish a "best in vertical" annual list, becoming an awards body
- Eventually Forge becomes its own audience-having brand independent of SOCIII

---

## 9. The SOCIII Certified Creator Credential

**Win condition:** Badges on LinkedIn, UpWork, Fiverr, email signatures. The credential lives BEYOND the SOCIII platform. The moment a non-SOCIII LinkedIn audience sees a "SOCIII Certified Creator" badge and clicks through to verify, the platform has won.

### Two-tier structure (PADI-style)

**SOCIII Certified Creator** — earned after first eligible Worker
- Eligibility: 1 Worker live ≥60 days, ≥3 paying subscribers (or equivalent revenue threshold), Forge review ≥4 stars, Stripe identity verified, Creator in good standing
- Sticker price: $149 (anchors perceived value on LinkedIn audiences)
- Standard creator price: $49 ($100 "launch discount" applied)
- Auto-deducted from first eligible payout (default) OR pay-direct via Stripe (option)
- Badge: "SOCIII Certified Creator" — purple primary color
- Verification page: `sociii.ai/c/<handle>/credential` showing creator, Workers, Forge review, current status

**SOCIII Advanced Creator** — earned at 5th eligible Worker
- Eligibility: 5 Workers each meeting Certified Creator criteria
- Cost: Free
- Badge: "SOCIII Advanced Creator" — distinct visual treatment (gold accent), badges stack visually on LinkedIn
- Both credentials appear on LinkedIn separately (PADI divers list Open Water AND Advanced — both badges)

**Future tiers (post-v1):**
- SOCIII Master Creator (20+ Workers, peer review duties, mentorship)
- SOCIII Studio Lead (formal Sociii Studio team contributor)

### Renewal + Revocation

- **Renewal:** $49/year. Keeps credential "Active." Includes annual Forge re-review (catches Worker decay). Lapsed credentials show "Lapsed YYYY-MM-DD" — verification page works but reflects status.
- **Revocation:** Creator Agreement violation, Worker decommissioned entirely, sustained customer complaint pattern, chargebacks. Revoked credentials show "Revoked YYYY-MM-DD" — permanent public record.

### Success Metric (NOT revenue)

- Verification page traffic (external loads from LinkedIn/UpWork/Fiverr referrers)
- LinkedIn add-to-profile button click-through rate
- Inbound traffic to SOCIII from LinkedIn/UpWork/Fiverr (badge as customer acquisition channel)
- Number of active credentials in good standing
- Distinct organizations whose employees hold credential (enterprise penetration signal)

If credential revenue is $0 in year 1 but 500 badges appear on LinkedIn driving 50,000 new visitors to sociii.ai, the credential program is a massive success.

### Infrastructure requirements (v4 explicit)

- Public verification page at `sociii.ai/c/<handle>/credential` (or shorter `verify.sociii.ai/<id>`)
- One-click "Add to LinkedIn" button using LinkedIn's structured add URL
- Pre-formatted clipboard copy for UpWork Certifications field
- Pre-formatted clipboard copy for Fiverr Skills panel
- Email signature line generator
- High-resolution badge PNG + SVG in multiple sizes
- QR code on badge artwork (scans to verification page)
- API endpoint `GET /v1/credentials/<credential-id>` returning JSON for third-party verification

All of this is one-click in the Beat 12 "claim your credential and broadcast it" panel.

---

## 10. Sociii Studio (consulting tier — inbound only)

### What it is

Sociii Studio is the path for Type D consultants who want a Worker without doing the work themselves. **Not part of the public creator journey.** Separate landing page, qualified intake call, scoped engagement. No public pricing.

### Economics

- **Effective revenue rate:** $500/hour
- **Delivery cost basis:** $50-150/hour (contractors at v1, Studio Lead role at v2)
- **Margin:** 70-90% on scoped engagements
- **Sean's involvement:** ~2 hours per engagement (scope sign-off, deliverable review). NOT on delivery.

Justification for the rate: Fortune 500 orgs already pay $400-800/hour for Salesforce, Workday, ServiceNow implementation consulting. SOCIII Studio at $500 is in-market and below the Big Four consulting rate cards.

### Engagement structure (v4 simplified from v3 tiered packages)

**No tiered packages.** No "Worker Starter $3,500" trap that attracts the most time-intensive, least-profitable clients.

**Hourly bid-rate, scoped engagement only.** Each engagement custom-scoped against the client's specific needs. Engagement scope ranges:
- Small (single Worker for solo practitioner): 30-60 hours, $15K-$30K
- Medium (Worker family for small firm): 80-150 hours, $40K-$75K
- Large (enterprise workflow as multi-Worker system): 200+ hours, $100K+

### Deliverable structure

- Built Worker shipping to Marketplace under client's Creator account
- Listing carries "Built by Sociii Studio" tag — customer trust signal
- Client owns the Worker (75/25 split applies, Studio fee already paid the build cost)
- 60-day post-launch support included
- Client gets the SOCIII Certified Creator credential automatically upon eligibility (covered in engagement fee)

### Why this works strategically

- Captures the Type D consultant market (40-60% of TAM) without compromising self-service Journey
- Self-funds (high margin, predictable revenue)
- Feeds the Marketplace with high-quality vertical-specific Workers
- "Built by Sociii Studio" tag carries customer trust that justifies higher Day-1 pricing
- Eventually becomes its own brand line item

### Entry path

- Single landing page at sociii.ai/build (or sociii.ai/concierge)
- Gated behind intake form: company, role, problem to solve, budget range
- Qualified intake call (45 minutes) scopes the engagement
- Contract signed via DBX Sign
- Delivery 1-3 weeks

### What v1 needs

- The landing page (sociii.ai/build)
- The intake form + qualified-lead funnel
- 1-2 contract delivery contractors ($75-125/hour cost basis)
- Sean's intake-call calendar slots (~3 hours/week to start)
- Engagement contract template
- "Built by Sociii Studio" tag for Marketplace listings

---

## 11. Pricing Tier Rule + TRpW Graduation

### The Universal Rule (no exceptions)

**Workers cannot be priced above $29/month for first 90 days.** Universal. Applies to:
- Type A (Ruthie) — including Fellow Workers (Ruthie's first Worker starts at $0 or $29)
- Type B (Elise) — same
- Type C (Quiet Founder) — same
- Type D (Consultant via Studio) — same (the Studio fee covered build cost, but ongoing Marketplace pricing follows the tier rule)
- Lane 3 (Research Preview) — same OR free-only

System default recommendation for first Worker: **$0 for 30-60 days, then upgrade to $29.**

Justification surfaced in journey UI: *"Your first 30-60 days are about getting reviewed and finding your first 20 customers. Pricing at $0 doubles your network conversion rate."*

### TRpW (Total Revenue per Worker) — the Real Metric

Subscription tier is one revenue path. Data fees + per-use fees are often bigger. Smart creators optimize for **total revenue**, not subscription pricing.

Example: $0 Worker with 50 active users generating $40/month in data fees per user = $2,000/month TRpW. Subscription is zero. Total revenue is real. Customer can't "cancel" data they're using.

### Graduation by TRpW (v4 — replaces subscriber-count from v3)

**Tier 2 subscription ceiling unlock ($49 max):** Worker is eligible for $49 pricing when ALL of:
- ≥3 months active listing
- ≥$500 trailing-90-day TRpW
- QA-001 pass
- Forge review ≥4 stars

**Tier 3 subscription ceiling unlock ($79+ uncapped):** Worker is eligible for $79+ pricing when ALL of:
- ≥6 months active listing
- ≥$5,000 trailing-90-day TRpW
- Forge re-review ≥4.5 stars (refreshed at Month 6)

### Data fees as Beat 4 Design Consideration

The Idea Conversation in Beat 4 now explicitly walks through:

> *"Your worker is going to need data to do its work well. Some is in your customer's account (their files, their CRM, their workspace). Some is external (Apollo for contacts, ATTOM for property data, etc.). The most successful Workers bake meaningful external data calls into the workflow — partly because it makes the Worker more useful, partly because the data fees become a quiet recurring revenue stream that survives subscription cancellations. Walk me through what data your Worker will pull, and from where."*

This makes data-fee revenue a *design consideration*, not an accident.

### Status Thread implications

- Beat 11 (Forge First Customer): "Your data fee revenue is the durable kind. Subscription customers cancel when they review their bill; data fees don't show up that way."
- Beat 13 (First Payout): "Your earnings: $X subscription + $Y data fees. Ratio matters. >50% data fees = the durable kind of business."
- Recurring monthly milestone: "Last month: $Z total. Z% from data fees. You're building durable revenue."

---

## 12. QA-001 (positioning + minimum cut)

### Dual framing

- **Creator-facing:** Anxiety-reducer. "The friend that catches the bug before the customer does."
- **Customer-facing:** Trust signal. "Quality-Verified" badge on marketplace listing.

### v1 minimum cut (ships now)

Parse `tests/assertions.md`, run each assertion as a check against worker's service.js + sample-data fixtures, report pass/fail in plain language. Each failure has one-line explanation + "Ask Claude Code to fix" button.

### Self-interest framing throughout

*"Ship a shitty worker, earn no money, get bad reviews. Run QA-001 properly, ship something quality, earn. This is for your own benefit."*

### Full vision (roadmap)

- Behavioral integration testing
- RAAS rule conformance
- Regression detection
- Performance benchmarks
- Hallucination detection
- Vertical-aware test suites

Roadmap, not v1.

---

## 13. The Unifying Principle (v4 expanded)

**The platform is the teacher AND the credentialer AND the distribution engine — not any one alone.**

v3 said "teacher AND credentialer." OpenAI red team correctly noted the missing third — distribution. v4 includes all three.

- **Teacher** — the journey itself, the Coach function, the doc trail, the Two Claudes pattern
- **Credentialer** — Stripe Identity verification, Worker DoD, QA-001, Forge reviews, SOCIII Certified Creator credential
- **Distribution engine** — Marketplace discovery, public Creator Profile, network activation tooling, Forge as first customer, badge-as-customer-acquisition

Reference patterns:
- **Substack** = teacher + distribution (light on credentialer)
- **Stripe** = credentialer + distribution (light on teacher)
- **HuggingFace** = all three (closest analog)
- **YouTube** = distribution dominant + credentialer (Verified badge, Partner Program) + light teacher
- **PADI** = credentialer + teacher (no distribution — they don't sell dive trips)

SOCIII = all three at equal weight. The Journey is the teacher; Certification is the credentialer; Marketplace + Forge + Network Activation + Badges are the distribution engine.

**If we lose any one** — path without credentialing = SaaS feel; credentialing without distribution = bureaucracy; distribution without teaching = chaos — we lose the magic.

---

## 14. Ruthie's Tonight Session + Customer Acquisition Loops

### Ruthie's tonight specific flow

She is the FIRST creator to walk the journey end-to-end. Tonight is the load test.

**Pre-session state:**
- Has Fellow advisor packet email in her inbox (Sean sends today)
- Her Worker code already in repo at `creators/ruthie/nursing-education-001/`
- intent.md, canvas-tabs, sample-data populated
- Anthropic Team seat provisioned
- ruthie@sociii.ai mailbox provisioned

**Session flow (estimated 90-120 minutes):**

1. **Beat 3 (5 min):** Magic link → Stripe Identity → DBX Sign Fellow Advisor Agreement (NOT Marketplace Creator Agreement) → CV capture
2. **Beat 4 (skip — pre-checked):** Worker concept card shows existing name/logo/tagline
3. **Beat 5 — Mockup Preview (5 min):** Server-rendered mockup at sociii.ai/preview/<id>. She shares to a colleague.
4. **Beat 6 — Install Grind (45-90 min):** Two Claudes pattern. Sean as backup for THIS session only (in production this would be Claude Chat).
5. **Beat 7 — Real Workspace Preview (5 min):** Worker rendering in actual SOCIII workspace.
6. **Beats 8-10 (fast — 30 min combined):** Validator passes immediately (code already meets DoD), PR already merged, Marketplace listing populates, Profile page goes live at sociii.ai/c/ruthie.
7. **Beat 11 — Forge First Customer (within 72 hours):** Forge subscribes within 72 hours of listing.
8. **Beat 12 — Network Activation (overnight or next day):** Share assets surface, she shares to her LinkedIn (~500 nurse educators).
9. **Beats 13+:** First organic customer probably within a week from her LinkedIn share. First payout June 5th.

### What we learn from this session

- Where journey page UX breaks (it will — we just don't know where)
- How long Beat 6 actually takes vs. 60-180 minute estimate
- Whether Two Claudes pattern works in practice
- Whether share-snapshot at Beat 5 actually feels rewarding
- Whether the Forge first-customer dopamine arrives soon enough
- Whether her network activation converts

### What we DON'T try to ship before tonight

- Full Tier 1 AI reviewer (her PR is already merged)
- Tier 2 peer review (no peers yet)
- Network activation auto-posting (manual share fine for one person)
- Lane 3 Research Preview track (not needed for standard path)
- Sociii Studio landing page (separate inbound flow)
- Full credential system (Ruthie earns Certified Creator after Beat 11)

### v0.1 Journey page minimum

For Ruthie tonight, the minimum surface:
- Beat 3 form (sign + CV capture)
- Worker concept card (showing her existing Worker)
- Beat 5 mockup preview generator
- Beat 6 Two Claudes instructions + screenshot tutorial
- Workspace preview embed (Beat 7)
- Share snapshot button
- Beat 8 validator results display
- Profile page minimal version
- Forge First Customer notification (when it fires)
- Network activation panel
- Credential claim panel (post-eligibility)

### Second dogfood session (Elise — tomorrow)

Per Claude red team: Ruthie's session is a guided walkthrough with founder backup. Elise's session tomorrow should be **without Sean backup** to test the actual Two Claudes pattern. This is the true journey test.

### Customer Acquisition Loops (NEW dedicated subject in v4)

v3 treated customer acquisition as Beats 10-12 + epilogue. v4 makes it dedicated and ongoing:

**Loop 1 — Forge First Customer (guaranteed within 72 hours).** Solves cold-start.

**Loop 2 — Network Activation (Beat 12 + ongoing).** Creator's personal/professional network. 80% of first 50 organic customers come from here.

**Loop 3 — Badge-as-Customer-Acquisition.** Credentials on LinkedIn/UpWork/Fiverr drive inbound traffic to SOCIII. Measured by verification page external referrer traffic.

**Loop 4 — Forge Annual "Best in Vertical" awards.** Forge publishes annual lists. Creates marketplace content + driver inbound traffic. Future, not v1.

**Loop 5 — Creator → Peer Reviewer → Maintainer career path.** Creators who advance become more visible advocates. Compounds the brand.

**Loop 6 — Sociii Studio cross-pollination.** Studio engagements with Fortune 500 build Marketplace presence in new verticals. Studio-built Workers become Marketplace inventory.

These loops are the platform's distribution engine. Code work after Ruthie's session should focus on activating Loops 1-3 in v1, planning Loops 4-6 for v2.

---

## 15. Outside Review Questions (v4)

For Claude (corporate) + OpenAI second-pass review:

1. **Is TRpW the right graduation metric, or does it create perverse incentives?** Specifically: do creators game data-fee revenue by inflating unnecessary API calls? Forge's review should catch this but it adds review burden.
2. **Is the 7-day cure mechanic defensible?** Forge embargo with eventual publication is honest but unusual. Does the published methodology hold up under journalist scrutiny?
3. **What's the right ownership structure for Forge Reviews LLC?** Sean-personally vs SOCIII-Inc vs third-party. Tax + governance implications.
4. **Is the no-Fellow-exemption pricing rule defensible to Fellows themselves?** Ruthie/Kent/Elise are asked to start at $0 or $29 when their existing Workers could probably command $49+. Sells the rule as discipline; some may push back.
5. **Studio at $500/hour effective — is this actually in-market?** Or should it be $750-$1,000 for Fortune 500 work? Salesforce implementations regularly bill $800-$1,200/hour.
6. **The credential's $149 sticker / $49 paid / Free at 5 pattern — does $149 actually anchor perceived value if it's never charged?** Or do we need to ACTUALLY charge $149 to enterprise/non-discounted segments to maintain the anchor?
7. **What does Beat 0 look like?** v3 was flagged as missing the moment-before-discovery. v4 still doesn't have a Beat 0. How does Ruthie hear about SOCIII in the first place?
8. **AI reviewer vertical-aware context — is this RAAS work or separate?** Loading the right context for a nursing-Worker review vs. an aviation-Worker review is non-trivial. How does this integrate with the existing RAAS architecture?

---

## 16. Closing

**The product is the path AND the credentialing AND the openness AND the distribution.**

Four pillars, in tension, reconciled by:
- The Journey (the path) — 13 beats with Status Thread woven through
- The Certification (the credentialing) — SOCIII Certified Creator + Advanced Creator, with the win condition being badges on LinkedIn
- The Three Lanes (the openness) — Open Apache fork + Marketplace + Research Preview
- The Distribution Engine — Forge first customer + Network Activation + Badge-as-acquisition + Customer Acquisition Loops

If we keep all four as the unit of design, the platform builds itself around it.

If we lose any one, we lose the magic:
- Path without credentialing = SaaS feel
- Credentialing without path = bureaucracy
- Openness without QC = brand disaster
- Anything without distribution = silent platform that nobody finds

**Read this. React. Tell us what we got wrong. Then we build.**

---

*v4 drafted 2026-05-31 by Claude for Sean. Incorporates all locks from v3 review (Q1-Q10), OpenAI + Claude red team feedback, Type D Consultant addition, Forge Reviews entity structure, SOCIII Certified Creator + Advanced Creator credential design, Sociii Studio inbound-only path, pricing tier rule with TRpW graduation, Beat 6 reordering, Status Thread as parallel function to Coach, Customer Acquisition Loops as dedicated subject, four-pillar unifying principle. Suitable for outside review and as the implementation gate for Creator Journey v0.1 (Ruthie's tonight session) and v1.0 (full platform creator surface).*
