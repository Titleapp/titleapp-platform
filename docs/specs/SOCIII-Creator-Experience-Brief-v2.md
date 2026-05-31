# The Creator Experience — Product Brief v2

**Audience:** Sean. This is the strategic frame, not a build spec. Read this before we write a single line of code on the sandbox/creator space.

**v2 changes from v1 (incorporating Sean's notes 2026-05-31):**
1. Beats 4 and 5 swapped — the Idea Conversation comes BEFORE the Setup Grind. Capture excitement first; let it carry them through the hard part.
2. Explicit difficulty acknowledgment added at the Commitment beat — "this isn't easy; that's why this is OF for smart people; and you are smart, that's why you're here."
3. Beat 6 (First Preview) now happens inside the SOCIII workspace with their worker rendered there. Not a separate preview tab.
4. Brand and visual identity woven into Beats 4 and 6 — naming, voice, logo, color as part of crafting the worker, not an afterthought.
5. New Beat 10 — Network Activation. Personal/professional network is the distribution channel, not Instagram virality.
6. Beats 9, 10, 11 reframed around status and expertise validation, not just money. Money matters; recognition matters more.
7. Q6 (Sean-in-Slack backup) retired — replaced by the Two Claudes pattern.
8. New questions added (Q9, Q10) on brand-creation tooling and network-activation tooling.

**Premise:** Whatever code we ship next will be judged by a simple question — does Ruthie sit down at her terminal tonight, walk through her journey, and end up feeling that this is the most rewarding work she's done in a while? If yes, the journey is right. If no, the code shape doesn't matter.

---

## 1. The single sentence

**The SOCIII creator experience is the moment a domain expert realizes their knowledge is finally worth something tradeable AND publicly recognized, and the platform doesn't get in the way of them shipping it.**

That sentence is the brief. Two emphasis additions in v2 — *tradeable AND publicly recognized*. Money matters. Status matters too. Many creators care about status more than money, and the most successful ones won't admit it. Build for both.

---

## 2. Who is the creator, actually?

(Unchanged from v1 — three sharply distinct types share the same path.)

**Type A — The Domain Expert Who Doesn't Code (Ruthie).** Twenty-five years of clinical and teaching experience. Knows Tanner's clinical judgment model, knows the ANA Standards, knows what good nursing performance looks like at 3am in a real ICU. Can describe what her worker should do in plain English. Has never used Git. Used to think "the cloud" was a marketing term. Lives the *content*. Terrified of breaking the platform.

**Type B — The Adjacent Builder (Elise).** Built Shopify themes. Knows HTML, CSS, Liquid, some Python. Hangs around AI Twitter. Reads Hacker News. Has shipped things to the public internet before. Is comfortable in a terminal. Doesn't yet have a domain she's expert in — her edge is *taste and speed of iteration*.

**Type C — The Quiet Founder (the marketplace creators we don't know yet).** A solo or two-person shop with a workflow they've systematized over years. Maybe an aviation MRO who has the dispatch playbook in their head. Maybe a title clerk in a county that nobody else can read. Maybe a homeschool curriculum author with a real audience. They're not asking permission. They want to monetize.

**The platform must hold all three on Day 1.** All three want *the work to feel like the work*. All three want *the moment of shipping to feel real*. All three want *the first payment AND the first public recognition* to feel like undeniable validation. They will tolerate setup friction once — but only if the excitement they walked in with survives it.

---

## 3. The journey, beat by beat (v2 reordered)

I walk through the canonical path from first encounter to first payout. At each beat I name the emotion the creator should feel, and the failure mode that kills it.

### Beat 1 — Discovery (5 minutes)

**Where:** A blog post. A LinkedIn share from Kent. An X meme. Word of mouth from a friend ("you should look at this thing Sean's building").

**What happens:** They land on sociii.ai. They see the slim landing surface. They read the headline. They watch a 60-second loom or read the whitepaper executive summary.

**What they should feel:** *Wait — this is for me?* A tiny, surprised pulse of recognition.

**What kills it:** A page full of "AI-powered" buzzwords. A wall of pricing tiers. A demo that requires login.

**The bar:** A working nurse who has never thought of herself as a "creator" should look at the page and say "Oh — like Substack but I get paid for the thing I actually know."

---

### Beat 2 — The maybe-I-could-do-this moment (10 minutes)

**Where:** They click into the public marketplace. They see other creators' workers.

**What happens:** They look at someone like them, doing what they could do. They see the creator's name, photo, bio, credentials. They see "Endorsed by [credentialing body]" or "Recognized in [community]." They see earnings (eventually — once we have real numbers).

**What they should feel:** *Someone like me is doing this. And they're recognized for it.* A specific kind of envy that pulls toward action. **Note v2 emphasis:** the envy is partly about money and partly about *status*. The other creator is *visibly the expert*, not just *visibly earning*.

**What kills it:** All the workers look the same. The creator's identity is invisible. There's no Ruthie-shaped person visibly winning. The marketplace looks like a SKU listing instead of a recognized-expert directory.

**The bar:** A creator profile page should feel like a Substack author page or a Patreon page or a HuggingFace researcher page — *a person, with a voice, with proof of work AND proof of recognition*. Not a generic SKU listing.

---

### Beat 3 — The commitment (15 minutes)

**Where:** They click "Become a Creator" or "Start building." We land them in a creator-onboarding journey — NOT a sales funnel.

**What happens:**
- They learn what they're agreeing to (the click-through Creator Agreement, in plain language)
- They see the earnings example ($99/mo customer → $71.87 to you)
- They see what recognition looks like (verified-expert badge on their profile, public Creator Profile page, "Endorsed by SOCIII" mark on the marketplace listing)
- They learn the tooling they'll need (Claude Code + GitHub account + ~2 hours of focused time)
- **They are told, honestly:** *This isn't trivially easy. You'll do some terminal work. You'll install a few things. You'll feel confused once or twice. That's why this works for smart people — it filters for people who can persevere. You're here. You're smart. We'll get you through.*
- They make a decision: am I doing this?

**What they should feel:** *I understand the deal. The math is fair. The work ahead is real, but it's the kind of work I want to do. And the platform respects me enough to be honest about the difficulty.* A grown-up commitment.

**What kills it:** Marketing fluff that promises "no code required" then drops them into a terminal anyway. Hidden costs. Surprise terms.

**The bar:** The commitment page should feel like signing up for a fellowship, not for a SaaS trial. Specific. Mutual. Adult. The honesty about difficulty is itself a status signal — it says *we don't think you're stupid, and we don't think this is for stupid people*.

**Explicit copy idea for this page** (workshoppable):

> "This isn't a five-minute signup. You'll install a couple of tools, fork some code, talk to Claude (twice), and ship a Worker that people pay for. Total time end-to-end: about two hours of focused work, spread however you want. It's hard enough to be real. It's not hard enough to stop you. The reason this works at all is that we filter for people who can do something a little technical without panicking. That's you. Welcome."

---

### Beat 4 — The Idea Conversation (30 minutes) ⟵ moved earlier in v2

**Where:** A conversation surface inside SOCIII (Alex chat or a dedicated "shape your Worker" surface). Importantly, this happens BEFORE the technical install grind. Capture their excitement first; let it carry them through the hard part next.

**What happens:** They sit down with Alex (or Claude) and have a real conversation about what their Worker will do. Not technical. Domain. They talk about:
- What problem the Worker solves
- Who uses it
- What success looks like
- What it's NOT
- A *name* for the Worker
- A *voice* (warm/clinical/expert/playful)
- A first pass at *visual identity* — colors, a generated logo concept, a tagline

By the end of this conversation, they have an `intent.md` mostly populated, a Worker name they chose, a Worker logo and color scheme (Claude generated options, they picked), and a tagline. The Worker has an IDENTITY before it has any code.

**What they should feel:** *This is the part I'm good at. I'm describing the work I actually know. And I'm creating something that has a name and a face.* Their domain expertise becomes the input. Their creative ownership starts here. **Pride and ownership before pain.**

**What kills it:** The conversation goes technical too fast. The platform demands JSON before it understands what the Worker is. The name and logo feel like afterthoughts instead of part of the craft.

**The bar:** When the creator finishes Beat 4, they walk away with a NAMED, VISUALLY IDENTIFIABLE Worker concept they're emotionally invested in — even though no code exists yet. That investment is what carries them through Beat 5.

The Worker artifacts produced in Beat 4: `intent.md` (populated), proposed Worker name, proposed Worker logo (SVG or PNG, generated), color scheme, tagline. Files live in temporary state until they finish Beat 5 and have a fork to write them into.

**Tools needed for this beat:** generated-logo capability (Fal.ai or similar — see Q9 below). Conversation prompt scaffolding for Alex/Claude to walk them through the brand+intent dialog. Storage for the in-progress artifacts before they have a git fork.

---

### Beat 5 — The Setup Grind (45-60 minutes) ⟵ moved later in v2, framing strengthened

**Where:** Following CREATOR-INSTALL.md on their own laptop. Two browser tabs open: claude.ai (the helper) and their SOCIII journey page (the progress tracker). Plus a terminal window. They install Node, Git, sign up for GitHub, install Claude Code, fork the repo, clone it.

**What happens:** Lots of typing. Stuff scrolls by. They hit something that fails. They take a screenshot, paste it into the Claude.ai tab, ask "what is this and what do I click?" They get an immediate answer. They keep going. They hit another snag. Same loop. They get through it.

**What they should feel:** *I am leveling up. The Worker I already named is waiting for me on the other side of this. I have Claude Chat helping me in real-time. I'm not alone.* Anxiety transmuted into competence.

**What kills it:** The doc assumes Mac-only when they're on Windows. The Two Claudes pattern isn't explained explicitly. They don't realize they can screenshot anything into Claude Chat.

**The bar:** The journey page during Beat 5 shows:
- A prominent reminder: "Open claude.ai in another tab. Screenshot anything confusing. Paste it there. You'll get answers in seconds."
- Screenshot shortcut instructions for Mac (`Cmd + Shift + 4`) and Windows (`Win + Shift + S`).
- The Worker concept they crafted in Beat 4 sitting at the top of the page: "Your Worker is named X. We're getting you to the point where you can ship it. Almost there."
- Honest acknowledgment of the difficulty: "This step is the hardest. Push through it. The other side is the fun part."

The Two Claudes pattern is the load-bearing UX choice here. Claude Chat = the always-on helper that handles confusion. Claude Code (once installed) = the actual code work. Both stay open. Both serve different purposes.

**This is also the beat where we kill the "Sean in Slack" backup idea from v1.** The backup is Claude Chat. Sean is not the help mechanism. The platform — through Claude — is.

---

### Beat 6 — The First Preview, In Your Workspace (5 minutes) ⟵ workspace-integrated in v2

**Where:** They open SOCIII in their browser. They land in their workspace. Their Worker (the one they named in Beat 4, just installed in Beat 5) is rendered IN the workspace — same canvas, same UI, same context their future customers will see. With its name. With its logo. With its tagline. Populated by their sample data.

**What happens:** Their idea, made real, on a screen, looking like a product. Not a "preview" page. The actual workspace. The actual product.

**What they should feel:** **DELIGHT.** Specific. Embodied. *Their Worker. With the name they chose. With the logo they crafted. Running.* This is the screenshot they take and send to their spouse, their friend, their LinkedIn.

**What kills it:** It looks generic. Their visual identity got lost. It looks like every other thing. The preview is in a separate "preview" surface that doesn't feel like the real product.

**The bar:** Beat 6 is the first **reward**. After 45 minutes of conversation (Beat 4) + 60 minutes of setup (Beat 5), they need a *win they can take a screenshot of and tell people about*. The first workspace render is that screenshot.

This is also where they get to **tweak the visual identity** — adjust the logo, change the color, swap the tagline. They've earned the right to fine-tune. Three minutes of cosmetic agency right after the technical pain is over feels like a *gift*.

QA-001 also starts to live in their experience here. The workspace includes the QA-001 panel — "here's what passes structurally, here's what still needs work behaviorally." Not as a wall of red. As a *checklist of what's needed to be ready to ship*.

---

### Beat 7 — The Validation (10 minutes)

**Where:** They run `npm run validate-worker -- --worker=<their-handle>/<their-slug>` from the terminal, or click "Validate" on the journey page. The validator runs Worker DoD + QA-001 assertion checks.

**What happens:** Some pass. Some fail. Each failure has a one-line plain-language explanation and a link to the doc section that explains how to fix it.

**What they should feel:** *I'm being held to a standard, but the standard is knowable. I have Claude Chat and Claude Code both at my disposal to get through it.* The platform respects them enough to be specific.

**What kills it:** Cryptic error messages. Failures on things they can't reasonably fix. Validation that doesn't match the standard the reviewer will use.

**The bar:** Every validation failure has a *plain-language one-line explanation* + a *link to the doc section that explains how to fix it* + (ideally) a *"Ask Claude Code to fix this" button* that opens a Claude Code prompt with the failure pre-filled.

QA-001 framing: it's the friend that catches the bug before the customer does, not the gate that keeps the creator out. Reframe of v1 — same as before.

---

### Beat 8 — The Pull Request (5 minutes)

**Where:** They run `git push` to their fork. They click the "Open Pull Request" link GitHub shows them. CI runs the validator + QA-001 + any other automated checks.

**What happens:** A PR opens. The PR template walks them through the DoD checklist. CI runs in the background and reports pass/fail.

**What they should feel:** *I shipped.* Specifically: I made something, I put it out for review, I'm now subject to someone else's judgment, and I'm okay with that. **Pride.**

**Sean's note in v2:** *"The first time shipping something is like the first time flying a plane. It's terrifying and you really have no friggin idea what this stuff means."* We hand-hold them through the terminal commands AND across Claude Chat — both tools, both available, both encouraged.

**What kills it:** The PR sits for a week. The reviewer responds in code-review-speak instead of teaching-speak. The PR comments demoralize.

**The bar:** First-PR turnaround target = 24 hours. Review tone = teaching-with-respect. Specific. Concrete. Show the small change you'd make, don't lecture about the abstract principle. The terror is temporary; the pride after the merge is permanent.

---

### Beat 9 — The Merge + The Public Identity (1-2 days) ⟵ reframed in v2

**Where:** Their PR merges. The platform listing pipeline takes over. Their Worker appears in the Marketplace. Their public Creator Profile page goes live at `sociii.ai/c/<handle>`. They are now publicly listed, publicly identified, publicly recognized.

**What happens:** Their Worker appears in the Marketplace with the name and logo they crafted in Beat 4. Their Profile page goes live with their photo, bio, the Worker they shipped, a "Verified Expert" mark via Stripe Identity, and any credentials they chose to display. They get an email: "Your Worker is live. Here's your public Creator Profile."

**What they should feel:** **STATUS VALIDATION.** Not "I'm on the map" — that was v1's understated framing. The truer feeling: *I am publicly recognized as the expert in my domain on this platform. There is a URL with my name on it. Anyone can see it. It will outlive this moment.* **Pride + permanent identity + recognition.**

**What kills it:** Their listing is a generic SKU with no creator identity visible. Their profile is a stub. They don't get a *moment* — just a confirmation email that reads like a transaction.

**The bar:** Listing day = a moment celebrated.
- Warm email from Sean (auto-personalized later) — "Your worker is live. Welcome to the SOCIII roster."
- Pre-generated social cards they can post (their Worker, their name, their tagline, the SOCIII brand mark)
- 7-day Featured-New pin on the Marketplace
- Their Creator Profile page goes live
- A "Verified Expert" mark (via Stripe Identity + any credential capture)

**v2 reframe of the underlying emotion:** This is the beat where *expertise becomes credentialed publicly*. For many creators — especially Type A (Ruthie) — this matters more than the eventual money. The public Profile page is their *recognized-expert artifact*. They will share it. Their network will see it. People who knew them as "Ruthie who teaches nursing" will now see them as "Ruthie Clearwater, recognized SOCIII Fellow and author of the Clearwater Nursing Education Worker."

---

### Beat 10 — Network Activation (NEW IN v2 — 1-2 days, often longer)

**Where:** Their personal/professional network. NOT Instagram. Their LinkedIn. Their professional Slack channels. Their email list. Their domain-specific communities (nursing forums for Ruthie, aviation groups for the Type C founder, etc.). The conference they were going to anyway.

**What happens:** They share their newly-live Worker with the people who already trust them. The platform proactively gives them the tools to do so:
- Pre-written LinkedIn post template ("After 25 years of [domain], I built a Worker that does X. It's live on SOCIII. Try it.")
- Pre-generated images (Worker card, Profile page screenshot, "I'm a SOCIII Fellow" badge)
- Email signature line they can add ("Author of [Worker name] on SOCIII →")
- An email template they can send to their list

**What they should feel:** *My network — the people who already know my expertise — can finally pay me for it. This isn't a stranger marketplace. It's my own audience, now monetizable.* A specific re-shape of identity: from "person who knows things" to "person whose knowledge has a price and a public artifact."

**What kills it:** The platform's only distribution model is the Marketplace. The creator is left to figure out how to tell people about their Worker. No pre-built share assets. No suggested copy. They share once awkwardly and never again.

**The bar:** The platform treats network activation as a first-class feature, equal in weight to authoring the Worker itself. The journey page surfaces:
- "Here are the channels your audience is on. Here's what to say. Here are the assets to attach."
- "Most early Workers get 80%+ of their first 50 customers from the Creator's personal/professional network. The Marketplace is the storefront; your relationships are the door."

**v2 honest framing:** Instagram virality is not the model. The Marketplace algorithm is not the model. The model is *expertise + trust + an audience that already knows you can deliver*. SOCIII's job is to make the conversion from "person who trusts you" to "person paying you" as low-friction as possible. The platform owns the technical conversion (signup, billing, identity). The creator owns the trust conversion (they were going to trust you anyway).

**Tools needed for this beat:** social card generator (we have the prompts already), LinkedIn post template generator, email template generator, Profile page screenshot tool, "I'm a SOCIII Fellow / Creator" badge for email signatures.

---

### Beat 11 — The First Customer (variable — days to weeks)

**Where:** Someone subscribes. Often it's someone from their network they activated in Beat 10. Stripe processes. The platform notifies the creator.

**What happens:** They get an email: "You have your first customer." Their dashboard shows $0 → $99 gross / $71.87 net. The customer's name may be visible (if disclosed via opt-in).

**What they should feel:** **VALIDATION.** Specifically: *a person paid me money for the thing I knew*. Often this person is someone in their network — which makes it sweeter, not weaker. The status loop closes: "person who recognizes my expertise" → "person paying for my expertise." Their Worker is now a thing that turns *trust* into *revenue*.

**What kills it:** The notification is cold and transactional ("Subscription created, ID xyz-1234"). The earnings dashboard is a spreadsheet. There's no celebration.

**The bar:** First-customer email = warm, specific, addressed to them by name, reads like a personal note. If the customer is from their network (signal: same domain, signed up via referral), acknowledge it: *"This looks like someone from your network — your trust is converting."* *This is the moment they tell five people about the platform. And it's the moment the status loop closes — they are now a paid expert.*

---

### Beat 12 — The First Payout (5th of next month)

**Where:** Money hits their bank account.

**What happens:** ACH lands. Email confirms. Dashboard shows lifetime earnings climbing.

**What they should feel:** **CONFIDENCE.** Money in the bank is qualitatively different from "earnings on the dashboard." Once it lands once, they know the system works. They can stop being anxious about whether they wasted their time. They start thinking about Worker #2. They tell more people. The flywheel turns.

**What kills it:** Payment fails. Statement is opaque. Dashboard doesn't match the deposit.

**The bar:** Payment lands on time. Statement is clear. Dashboard reconciles to the penny. *Boring works here.* The wow happened earlier; now the platform just has to be reliable.

---

## 4. The emotional arc, summarized (v2)

| Beat | Time | Emotion |
|---|---|---|
| 1 Discovery | 5 min | Surprised recognition ("this is for me?") |
| 2 Maybe-I-could | 10 min | Specific envy (someone like me is recognized AND earning) |
| 3 Commitment | 15 min | Grown-up clarity + honest difficulty ("you're smart, that's why you're here") |
| **4 Idea Conversation** ⟵ | 30 min | **Domain pride + creative ownership** (name + logo + voice = mine) |
| **5 Setup Grind** ⟵ | 45-60 min | **Anxiety → competence** (Two Claudes pattern, push through) |
| 6 First Preview, In Workspace ⟵ | 5 min | **Delight** (my Worker, named + logoed + rendered in the actual product) |
| 7 Validation | 10 min | Respect (held to a knowable standard, with tools to fix) |
| 8 PR ("first flight terror") | 5 min | **Pride** (I shipped, hand-held through both Claudes) |
| **9 Merge + Public Identity** ⟵ | 1-2 days | **Status validation** (publicly recognized expert, permanent profile URL) |
| **10 Network Activation** (NEW) | 1-2 days+ | **Audience monetization** (my network can finally pay me) |
| 11 First Customer | variable | **Trust → revenue closure** (the loop closes) |
| 12 First Payout | 5th next month | **Confidence** (the system works, Worker #2 starts forming) |

**The emotional arc in summary:** Recognition → Envy → Clarity → Ownership → Grit → Delight → Respect → Pride → Status → Audience → Validation → Confidence.

If we lose them, it's almost always at Beat 5 (Setup) or Beat 7 (Validation). Everywhere else, the platform's role is to *not get in the way*. The Two Claudes pattern is the structural answer to Beat 5. Plain-language failure messages + fix-with-Claude buttons are the structural answer to Beat 7.

---

## 5. The unifying principle (v2 expanded)

**The platform is the teacher AND the credentialer, not the gatekeeper.**

Every interaction asks: am I helping this creator level up, or am I judging them for not being levelled-up?

Substack's success is rooted in this. Stripe Atlas's success is rooted in this. Notion's success. Patreon's. HuggingFace's recognized-researcher model. They all *believed in the creator's becoming* AND *publicly recognized the result* — and built tools that made both the becoming and the recognition as low-friction as possible.

SOCIII's added thing on top of that — and where we differ from Substack — is the *credentialing layer*. Stripe Identity verifies the creator is who they say. The Worker DoD verifies the Worker is what it claims. QA-001 verifies it behaves correctly. The chain anchor verifies the audit trail is tamper-proof. These don't just protect customers — they confer *recognized-expert status* on the creator.

So the design tension is:

**Maximum creator empathy + maximum quality standard + maximum recognition = the platform is a demanding teacher that publicly credentials the work.**

That's the whole product thesis. Substack respects the writer; SOCIII respects the *expert*. Same vibe, different status mechanic.

---

## 6. What QA-001 actually is, in this frame

QA-001 isn't a wall to climb over. **QA-001 is the friend that catches the bug before the customer does AND signals to the marketplace that this Worker has been thoroughly checked.**

It plays double duty:
- For the creator: anxiety-reducer, confidence-builder, ship-with-clarity tool.
- For the customer/marketplace: trust-builder, recognition signal, "this Worker has passed QA-001" badge.

When the creator opens their workspace at Beat 6 and beyond, they see:
- Their Worker, rendering
- DoD validator output (structural — must pass)
- QA-001 output (behavioral — running their assertions)
- Plain-language failures with one-line explanations and "Ask Claude Code to fix" buttons

QA-001 surfaces failures in plain language. It links back to the assertion in `tests/assertions.md` that failed. It can generate a Claude Code prompt that walks the creator through the fix.

**Status layer:** Workers that pass QA-001 get a visible "Quality-Verified" mark on the Marketplace listing. This is part of how the creator earns recognition. The badge matters as much as the test pass.

---

## 7. What this means for the next code we write (v2)

The shape of what we build:

### The Creator Journey page (`/creators/journey`)

A single React surface inside `apps/business/`, accessible after the creator clicks-through the Creator Agreement. The only place a creator needs to look during onboarding. It has:

- **Top banner:** The Two Claudes reminder. "Open claude.ai in another tab. Screenshot anything confusing." Screenshot shortcut instructions.
- **Worker concept card** (after Beat 4): the Worker's name, logo, tagline, color scheme they crafted. Always visible. Tweakable from here.
- **Progress checklist (Beats 1-12):** vertical list, each row has a check state, "what this means" expandable section, "what to do next" specific instruction, "click to do this now" button where applicable. Pre-checked Beats are visible but greyed.
- **Workspace embed** (after Beat 5): live render of their Worker in the SOCIII workspace surface. Updates as they edit files.
- **DoD + QA-001 panel:** plain-language results, fix-with-Claude buttons.
- **Network activation panel** (after Beat 9): share assets, suggested copy, social card downloads.

### The Idea Conversation surface

A dedicated surface or Alex-chat subsurface specifically for Beat 4. Walks the creator through: name, voice, who-uses-it, success-looks-like, visual identity. Generates options (logo, colors, taglines). Produces the in-progress `intent.md` + brand assets BEFORE they have a fork.

### The Workspace-integrated preview

Beat 6 happens IN the workspace, not in a separate preview tab. Same canvas, same UI, same context customers will see. Tweakable visual identity (logo, color) right there.

### Network activation tooling

After listing (Beat 9), the journey page surfaces:
- Pre-written LinkedIn post template
- Pre-generated image assets (Worker card, Profile screenshot, Fellow badge)
- Email signature line generator
- Email template for their list
- "Where's your audience?" checklist (LinkedIn / domain Slack / email list / conference / forum)

### The Marketplace listing + Creator Profile page

When a Worker merges, the Marketplace listing auto-publishes AND the Creator Profile page goes live at `sociii.ai/c/<handle>`. Profile includes: photo, bio, Worker(s), "Verified Expert" mark, credentials, ask-form, Worker testimonials/reviews. This is the *recognized-expert artifact* that powers Beat 9.

### The First-Customer email + first-payout dashboard

Warm, specific, signed by Sean while we're small (auto-personalized later). Reference the Worker by name. Acknowledge if the customer appears to be from the creator's network.

---

## 8. The hard questions for Sean to react to (v2)

These trade-offs need your read before we spec implementation. **Q8 already answered: same path for everyone, Ruthie skips first 3 beats pre-checked. Q6 retired: the backup is Claude Chat, not Sean in Slack.**

### Q1 — Public or logged-in journey page?

Does a prospective creator (hasn't signed up yet) see the journey page at all?
- (A) Logged-in only — to see the journey, sign up first.
- (B) Hybrid — public marketing page at `sociii.ai/creators` shows the 12 beats and example creator stories. Sign-up button leads to their own actual journey page.

**Recommendation:** (B). Substack's "What writers earn" page is public for a reason — it converts skeptics by showing the path is real.

### Q2 — Manual checkpoint check-off or auto-detection?

Once on the journey page, who marks checkpoints complete?
- (A) Creator clicks the checkbox themselves.
- (B) Platform auto-detects (GitHub OAuth, fork webhook, Claude Code telemetry).

**Recommendation:** (A) Day 1, layer (B) progressively. Self-reporting gives the creator agency.

### Q3 — Real-time workspace preview or static preview.html?

At Beat 6, how does the creator see their Worker?
- (A) Sophisticated — live iframe in the workspace, hot-reloads from filesystem changes.
- (B) Simple — static `preview.html` per Worker (like Ruthie's existing ones).

**v2 update:** Sean specified Beat 6 should be in the SOCIII workspace. That implies (A) eventually. But Day 1 can ship as (B) with the workspace UI styling — the static preview page renders inside the workspace shell, looks like a workspace, becomes interactive later. Best of both. Concrete v1 cut: static preview rendered inside workspace shell + chrome.

### Q4 — QA-001 v1 cut?

The full vision is 5-7 weeks. The minimum is 1-2 weeks.
- (A) Minimum — parse `tests/assertions.md`, run each as a check, report pass/fail with plain-language explanations.
- (B) Full vision — behavioral, integration, RAAS conformance, regression, performance, hallucination detection.

**Recommendation:** (A) ships now for Ruthie's worker. (B) is roadmap.

### Q5 — 24-hour first-PR review SLA?

- (A) Real — commit to 24h, hold yourself to it for the first 10 creators. Transition to slower SLA at 50+.
- (B) Aspirational — set public expectation at "5 business days," beat when possible.

**Recommendation:** (A) for now. Substack-tier responsiveness is the differentiator.

### Q6 — RETIRED. The backup is Claude Chat. The community is a future thing for peer-to-peer creator discussion, not setup help.

### Q7 — Creator Profile public page, Day 1 or v2?

**v2 update:** Sean's emphasis on status validation moves this UP. The Profile page at `sociii.ai/c/<handle>` IS the recognized-expert artifact. If we don't ship it Day 1, Beat 9's emotion is weaker.

- (A) Day 1 — Profile page at `/c/<handle>` ships when the first Worker goes live. Engineering work but central to status.
- (B) v2 — modal-with-bio Day 1, full page later.

**Revised recommendation:** (A) ships as part of Beat 9 — the Profile page is the *receipt* for finishing the journey. Without it, the status validation is hollow. We can ship a minimal version (photo, bio, Worker, Verified Expert mark) without the ask-form or rich testimonials — those follow later.

### Q8 — ANSWERED. Same path for everyone. Ruthie's Beats 1-3 pre-checked; Elise's same.

### Q9 — NEW. Brand creation tooling?

Beat 4 (Idea Conversation) requires logo and color scheme generation. Three options:
- (A) Generated — Fal.ai or DALL-E generates logo concepts; creator picks. Generative AI under the hood. (Tool already wired per fal.ai integration.)
- (B) Templated — pick from a library of 30 stock logos with color customization. Lower-friction, more generic outputs.
- (C) Upload only — creator brings their own. Pushes the creative work onto them.

**Recommendation:** (A) + fallback to (C). Generative-first because it's *fun* (status moment in the journey). Manual upload as backup for creators who already have a brand.

### Q10 — NEW. Network activation tooling?

Beat 10 (Network Activation) requires share assets and templates. What's v1?
- (A) Minimal — pre-written LinkedIn post template + 2-3 pre-generated images (Worker card, Profile screenshot). They copy-paste and post.
- (B) Mid — same as (A) plus email template generator + Fellow badge + email signature line.
- (C) Full — same as (B) plus auto-posting integrations (LinkedIn API, X API), audience analytics, share-tracking.

**Recommendation:** (B) for v1. The auto-posting integrations of (C) are 3rd-party API work that will block on OAuth verification; defer. The fellowship badge + email signature are tiny lifts with high status value.

---

## 9. Closing (v2)

**The product is the path AND the credentialing.** Not the platform; the path + the public artifact at the end.

We are building:
- A path that takes a domain expert from "I know stuff" to "I have a public, paying, audit-anchored, recognized-expert business built on my expertise."
- In 2-3 hours of focused work + a few weeks of patience.
- With Claude Chat + Claude Code as the always-on helper pair.
- With honest difficulty acknowledgment that filters for the right creators.
- With a Beat-9 status validation that is THE permanent artifact of the journey.
- With Beat-10 network activation that converts trust into revenue at the creator's own audience.

If we keep that path + credentialing pair as the unit of design — every code decision, every UI element, every doc — the platform builds itself around it.

If we lose either (path without credential = SaaS feel; credential without path = bureaucracy), we lose the magic.

Read this. React. Tell me which of the open questions (Q1, Q2, Q3, Q4, Q5, Q7, Q9, Q10) you want to lock down first. Then we spec the code.

---

*v2 drafted 2026-05-31 by Claude for Sean, incorporating Sean's notes on beat order, status framing, network activation, brand creation, and the explicit honesty about difficulty. Companion to v1; v2 supersedes. Suitable for outside review by Claude (corporate account) and OpenAI for a second pass.*
