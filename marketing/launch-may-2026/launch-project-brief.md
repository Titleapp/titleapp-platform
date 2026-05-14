# TitleApp AI — Launch Campaign Project Brief
**Project:** TitleApp Launch May 2026
**Owner:** Sean Combs (seanlcombs@gmail.com, sean@titleapp.ai)
**Worker:** Marketing & Content (`platform-marketing`)
**Drafted:** 2026-05-13
**Window:** May 13 → June 30, 2026
**Status:** Active, mid-execution

---

## 1. Why this project exists

We are launching TitleApp AI publicly into a market that already has:
- 1,000+ AI assistant products (most are wrappers, not workers)
- Dominant horizontal players (ChatGPT, Claude, Copilot, Gemini) that try to be everything
- Vertical incumbents in every industry we touch (Auto, RE, Aviation, Title/Escrow, Government, Healthcare)

We are not competing on "smart chatbot." We are competing on **governed, vertical, rule-bound digital workers that replace SaaS sprawl**. The launch has to land that positioning before anyone else gets there with the same words.

**Strategic frame (locked, do not deviate):**
- Productivity surface, not a worker store. ~15× cost compression vs SaaS sprawl.
- 1,000+ digital workers (state-augmented count).
- Patent-pending (no count cited).
- Gate Analogy is the canonical explainer — see canonical language doc.
- Sean → Auto/RE outreach. Kent → Aviation/HEMS. Alex → AI sales rep across all.

---

## 2. North-star outcomes (Q2)

| Metric | Target | How we count |
|---|---|---|
| Verified inbound demos (pre-paid commitments OK) | 50 | Calendar bookings via Alex or Sean direct |
| Paying tenants (any tier) | 25 | Stripe subscriptions live |
| Operator-uploaded knowledge bases | 10 | Vault docs with workerSlug tag, ≥1 doc |
| Webinar attendees (live) | 200 across Auto + RE | Zoom registrants who joined ≥10 min |
| Active Marketing worker sessions on dogfood tenant | 5/day | tenant_id=Sean's, worker=platform-marketing |
| Press / community impressions | 100K | Sum of LinkedIn + Reddit + GSC clicks |

These numbers are deliberately small. We are not chasing reach; we are chasing **proof that the worker product is real and people will pay**.

---

## 3. Audience segments (priority order)

1. **Auto dealer GMs / dealer principals** (≤50 rooftops). Sean's network + Apollo. May 19 webinar.
2. **RE brokers / appraisers / small title shops**. Sean's network + Apollo. May 22 webinar.
3. **Part 135 Director of Ops / Chief Pilots**. Kent's network + Apollo. Webinar TBD.
4. **AI-curious operators of legacy SaaS** (Salesforce / HubSpot / Comply365 / Microsoft 365 buyers). Reddit, LinkedIn organic, SEO.
5. **Investors** (Storyhouse interest + warm intros). Separate track — Alex investor surface handles.
6. **Future creators** (domain experts who want to author workers). Reddit, X, builder communities. Lower priority for May.

---

## 4. Channels — what is built, what is in flight, what is missing

### 4.1 Cold email (database marketing)
- **Sender:** sean@titleapp.ai
- **Volume target:** 1,000 sent in first 14 days. ≤200/day to protect deliverability.
- **Tooling shipped:** Apollo API integrated (4,020 credits/month, master key). Cold-email drafts authored: `auto-cold-email.md`, `re-cold-email.md`. SendGrid Marketing API wired for list + campaign sends. 26-campaign engine exists.
- **What's missing:**
  - Domain warming for sean@titleapp.ai (SPF/DKIM/DMARC verified? warming schedule?)
  - Auto C-suite list pulled from Apollo (target: 500 names with verified email)
  - A/B subject lines locked (Sean: short tease vs concrete promise)
  - Personalization fields tested end-to-end (`{{firstName}} {{company}} {{recent_trigger}}`)
  - 4-touch cadence: Day 0 cold, Day 4 nudge, Day 11 deck, Day 21 break-up
- **[ ] Tasks**
  - [ ] [USER] Confirm DKIM/SPF/DMARC on sean@titleapp.ai inbox
  - [ ] [AUTO] Pull 500 auto-dealer GM/Principal contacts from Apollo (filter: state, dealership count 1–5, no enterprise)
  - [ ] [APPROVAL] Generate Day 0 + Day 4 + Day 11 cold-email variants from authored .md sources, render via personalization engine
  - [ ] [APPROVAL] Lock 3 subject-line variants per touch for A/B
  - [ ] [USER] First send (200) — Sean clicks Send after review
  - [ ] [AUTO] Daily metrics digest: opens, clicks, replies, bounces; flag if bounce >2%

### 4.2 Webinars
- **Dates:** May 19 (Auto), May 22 (RE). Both 30-minute slots. Aviation TBD.
- **What's built:** Registration URLs exist. `marketing-content` worker has 30-min webinar template language locked.
- **Missing:** Demo flow rehearsed, dry-run recording, attendee follow-up sequence, slide deck final.
- **[ ] Tasks**
  - [ ] [USER] Sean records 5-min dry run of Auto demo (Loom)
  - [ ] [APPROVAL] Draft 3-email pre-webinar drip (T-7, T-2, day-of)
  - [ ] [APPROVAL] Draft post-webinar follow-up (attended → demo CTA; no-show → recording link + bookable slot)
  - [ ] [AUTO] Sync Zoom registrants → contacts spine
  - [ ] [USER] Decide: live or live-with-rehearsed-segments

### 4.3 LinkedIn (Sean + Kent's networks — ~3000 contacts combined)
- **What's built:** LinkedIn Ad Account 514047661 + Insight Tag 9295268 wired. `linkedin-messages.md` drafts authored.
- **Missing:** Outreach cadence, personalization, response handler. No paid campaign live yet.
- **[ ] Tasks**
  - [ ] [USER] Decide org-page vs personal-profile-only for organic launch
  - [ ] [APPROVAL] Draft 5-touch DM sequence for warm 2nd-degree connections
  - [ ] [APPROVAL] Author launch-day post — Sean + Kent each — single canonical Gate Analogy hook
  - [ ] [USER] Sean posts launch-day; tag 10 supporters for amplification
  - [ ] [APPROVAL] Set up retargeting audience from Insight Tag (site visitors → "watched docs" segment)
  - [ ] [APPROVAL] Draft sponsored InMail variants for auto-dealer + RE titles (when ready to fund)

### 4.4 Google Search / SEO / docs site
- **What's built:** GSC verified on titleapp.ai + titleapp.io. titleapp.ai/docs MVP shipped (SEO traction asset). GA4 G-F6EDHCVXWX + GTM GTM-TGWB73MV live.
- **Missing:** Pillar pages (Gate Analogy, "What is a Digital Worker", SaaS Consolidation thesis as a public essay), category pages per vertical, comparison pages.
- **[ ] Tasks**
  - [ ] [AUTO] Audit current crawl coverage in GSC, list top 25 indexed pages
  - [ ] [APPROVAL] Draft pillar page: "The Gate Analogy — why digital workers replace SaaS, not augment it"
  - [ ] [APPROVAL] Draft pillar page: "Vertical-specific digital workers for Auto Dealers" + 1 each for RE, Aviation, Government, Title/Escrow
  - [ ] [APPROVAL] Draft comparison pages: "TitleApp vs ChatGPT", "TitleApp vs Salesforce + ChatGPT stack", "TitleApp vs Comply365" (aviation)
  - [ ] [AUTO] Submit XML sitemap, monitor index status weekly
  - [ ] [APPROVAL] 4 long-tail blog posts per vertical hitting purchase-intent keywords

### 4.5 Google Ads
- **State:** Account 753-473-3093 exists; **auth pending**. No spend yet.
- **[ ] Tasks**
  - [ ] [USER] Authorize Google Ads OAuth for the platform
  - [ ] [APPROVAL] Search campaign #1 — branded ("titleapp", "title app ai") — protective spend, ~$10/day
  - [ ] [APPROVAL] Search campaign #2 — high-intent non-branded ("ai for dealerships", "automotive AI compliance", "digital workers for real estate") — start $30/day per vertical, optimize ruthlessly
  - [ ] [APPROVAL] Performance Max for docs site traffic once 50+ pages indexed
  - [ ] [AUTO] Daily spend + conversion report

### 4.6 Review sites / 3rd-party listings
- **Domains owned (defensive):** comparedigitalworkers, aiworkers.reviews, raascompliance, titleappai.com — we hold the comparison real estate.
- **External listings missing entirely:** G2, Capterra, Product Hunt, Trustpilot, GetApp.
- **[ ] Tasks**
  - [ ] [USER] Apply to G2 (vendor profile) + Capterra (free tier)
  - [ ] [USER] Schedule Product Hunt launch — date locked before paid ads to maximize same-day liftoff
  - [ ] [APPROVAL] Draft Product Hunt copy: tagline, gallery captions, founder comment, first-day FAQ replies
  - [ ] [APPROVAL] Build aiworkers.reviews shell — at minimum, a roundup of major AI worker platforms (us + competitors) with honest scoring; first 3 review essays drafted
  - [ ] [APPROVAL] Build comparedigitalworkers.com landing — straight comparison grid, side-by-side, anchored to TitleApp's strengths

### 4.7 Press / PR
- **What's built:** PRLog integration stub exists in `prService/`. No releases distributed yet.
- **[ ] Tasks**
  - [ ] [APPROVAL] Draft launch press release — single canonical version + 3 vertical variants (Auto, RE, Aviation)
  - [ ] [USER] Decide PRLog vs paid distribution (Business Wire = $$$ but tier-1 outlets)
  - [ ] [APPROVAL] Pitch list — 30 named journalists across AI, vertical SaaS, and PE coverage
  - [ ] [USER] Sean records 30-sec founder video for press kit

### 4.8 Reddit + technical-community presence
- **What's built:** Nothing. Greenfield.
- **Risk:** Reddit hates obvious marketing. Tone must be founder-to-community, not announcement.
- **[ ] Tasks**
  - [ ] [USER] Decide founder handle for Reddit (Sean's existing reddit alt or new)
  - [ ] [APPROVAL] Lurk-then-post plan — 5 substantive comments in r/Entrepreneur, r/RealEstate, r/AskAutoSales, r/flying before any TitleApp mention
  - [ ] [APPROVAL] Draft 2 "I built this because…" posts (one for r/SaaS, one for r/SideProject) — founder voice, no marketing speak
  - [ ] [APPROVAL] Hacker News post draft for the day of Product Hunt launch — "Show HN: TitleApp AI — governed vertical digital workers"

### 4.9 Demo assets / video / loom
- **What's built:** Nothing public. Some internal screenshots only.
- **[ ] Tasks**
  - [ ] [USER] Sean records 90-sec product overview (Gate Analogy → live worker demo)
  - [ ] [USER] Sean records 5 × 60-sec vertical demos (Auto, RE, Aviation, Title, Government)
  - [ ] [APPROVAL] Embed all demos on landing pages + docs site + cold-email Day-4 nudge

### 4.10 Marketing worker self-instrumentation
- **What's built:** Marketing worker knowledge file `titleapp-launch-may-2026.md` wired into prompt. Brand voice + canonical language anchored. Apollo + SendGrid + Twilio + LinkedIn APIs all callable.
- **Missing:** Per-action permissions list (what is Marketing worker allowed to send / spend / commit without me?), session budget, weekly digest report format.
- **[ ] Tasks**
  - [ ] [USER] Decide spending authority cap per worker session ($X for ads, $Y for sends, etc.)
  - [ ] [USER] Decide approval gates — which actions require Sean's review (any external send? any spend? any contact added to a list?)
  - [ ] [AUTO] Weekly Friday digest: what was sent / spent / opened / replied / booked / written + next-week proposed plan

---

## 5. Workstream summary (autonomy at-a-glance)

| Workstream | Tasks | [AUTO] | [APPROVAL] | [USER] |
|---|---:|---:|---:|---:|
| Cold email | 6 | 2 | 3 | 1 |
| Webinars | 5 | 1 | 2 | 2 |
| LinkedIn | 6 | 0 | 4 | 2 |
| Google Search / SEO | 6 | 2 | 4 | 0 |
| Google Ads | 4 | 1 | 2 | 1 |
| Review sites | 5 | 0 | 3 | 2 |
| Press | 4 | 0 | 2 | 2 |
| Reddit / community | 4 | 0 | 3 | 1 |
| Demos / video | 3 | 0 | 1 | 2 |
| Self-instrumentation | 3 | 1 | 0 | 2 |
| **TOTAL** | **46** | **7** | **24** | **15** |

**What this tells us about the worker today:**
- **15 of 46 tasks (33%) still require a human in the loop** — mostly auth/identity decisions, content judgment calls, and personal-brand posts.
- **24 of 46 tasks (52%) the worker can prep but needs approval to ship** — exactly where we want it: it does the typing, you sanity-check, you click send.
- **7 of 46 tasks (15%) the worker can run on its own** — Apollo pulls, metrics digests, sitemap monitoring. Low-risk, repetitive.

For a real "AI-run project" we want that mix to shift over time toward [AUTO] for trusted operations once you've watched the worker do them well 3–5 times.

---

## 6. Dependencies + sequencing

- **Week of May 13** (now): Domain warming, Apollo contact pulls, brand voice config, demo recording, Reddit lurking.
- **Week of May 19**: Auto webinar. Day-0 cold email send. LinkedIn launch post.
- **Week of May 22**: RE webinar. Day-4 cold-email nudge wave. Product Hunt prep.
- **Week of May 27**: Google Ads goes live. Press release distributes. First pillar pages publish.
- **Week of June 3**: Product Hunt launch + Hacker News post + Reddit posts (synchronized day).
- **Week of June 10–30**: Optimization phase. Iterate on what's converting. Aviation webinar.

---

## 7. What the worker should do FIRST when it ingests this brief

1. Read all sections.
2. Mirror the task list into its own checklist store (one `- [ ]` per task above).
3. For every [AUTO] task: propose a concrete next action with input it needs and an ETA.
4. For every [APPROVAL] task: prep a draft and queue for Sean's review.
5. For every [USER] task: schedule a reminder to Sean (digest line item, no spam).
6. Reply with one summary message: "I've absorbed 46 tasks across 10 workstreams. I can start immediately on N items. Here are the first 3 I'd tackle today: …"

If the worker can do steps 1–6, the architecture is real and we have a worker-run project. If it cannot, we know exactly which capability gap to close next.

---

## 8. Open questions for Sean (for the worker to ask if it can)

1. What's the weekly review cadence — Monday standup? Friday digest only? Both?
2. What's the hard spend ceiling for Google Ads + LinkedIn Ads combined for the first 30 days?
3. Press: PRLog (free, weak reach) or paid wire (~$500, real reach)?
4. Should I (the worker) draft outreach in Sean's voice + sign with his name, or in TitleApp's voice + sign as Alex?
5. For Reddit / community work — autonomous post drafts, or hands-off until Sean is in the seat?

---

*This is the seed document for the Project. Once the projects architecture is wired, this file is the canonical plan. Checking an item here in chat or in the project UI updates state in Firestore and (eventually) writes back to the source markdown in Drive. The worker grounds in this doc for every session related to the launch.*
