# CODEX 22 — Vertical Governance and Creator Economics

**Status:** DRAFT — pending red team
**Date:** 2026-07-07
**Author:** Sean Combs + Claude
**Urgency:** University of Hawaii goes live ~August 2026. Sections 3 and 4 (creator economics + rate limit scoping) must be decided and implemented before then.

---

## Why This Exists

CODEX 21 locked a closed-world taxonomy: 5 predefined verticals, all-or-nothing bundle subscriptions, creator economics as an afterthought. Three things broke that frame:

1. Creators and partners are building workers in categories we haven't defined yet (DPP for Shopify, nursing CE that's really education CE, retail compliance).
2. "Nursing" is not a vertical — it's a CE/licensing capability that runs across every licensed profession. We named a suite as a vertical, and it'll cause confusion at scale.
3. University of Hawaii is coming in August. Thousands of professors means creator-economy mechanics at real scale, and the current pricing model (flat per-seat) breaks before it gets there.

This CODEX addresses all three. It does NOT redesign CODEX 21's foundation model — that stays. It extends it with governance for the open world and commercial mechanics for scale.

---

## 1. The Five Verticals (Locked)

Sean's decision: stay at five broad verticals. Resist the temptation to define more prematurely — the platform is embryonic and premature vertical taxonomy is more dangerous than missing taxonomy (it force-fits workers into wrong homes).

| Vertical key | Display name | Bundle ID | Status | Growth profile |
|---|---|---|---|---|
| `real-estate` | Real Estate | `re-in-a-box` | **Active** | Moderate — big market, slow professional behavior change |
| `aviation` | Aviation | `aviation-in-a-box` | **Active** | Niche but loyal — small TAM, high per-user spend |
| `education` | Education | `education-in-a-box` | **Active** | **Explosive** — professor-as-creator × student-as-consumer; UH is the proof |
| `healthcare` | Healthcare | `healthcare-in-a-box` | **Active** | High value, regulatory friction — non-clinical entry point (CE, licensing) |
| `finance` | Finance | `finance-in-a-box` | **Aspirational** — no workers yet, no bundle defined; listed to reserve the namespace | Fast but friction-heavy — SMB IR, cap table, accounting |

**Retired verticals (not in the Active table):**

| Vertical key | Decision | Treatment |
|---|---|---|
| `nursing` | Retired 2026-07-07 — was CE/licensing, not a real vertical | Workers reclassified to `education`; subscribers migrated to `education-in-a-box`. See §6. |
| `auto-dealer` | Retired 2026-07-07 — no workers, no bundle, no customers ever existed | Any docs with this vertical → `unassigned`. `getVerticalConfig` aliases kept for backwards compat. See §6. |

**Finance aspirational note:** Finance is listed to reserve the key and signal intent, not because workers exist today. It has no bundle, no `getVerticalConfig` entry, and no open implementation tasks. When the first finance worker is built, it starts in `unassigned` and promotes to `finance` via the normal promotion lifecycle (§2). Do not treat it as equally real to the four active verticals.

**Reclassification from CODEX 21:** `nursing` is retired as a vertical. Existing workers `nursing-ce-001` and `student-eval-001` reclassify to `vertical: "education"`, `suite: "Licensing & CE"`. The `nursing-in-a-box` bundle ID is deprecated — existing subscribers migrate to `education-in-a-box`. See §5 (migration).

**The growth pattern that matters:** The highest-growth verticals are the ones where the user of the worker is also its natural distributor. Education is the clearest case: a professor builds a CE worker, shares it with 200 students, those students take it to their next institution. The creator IS the distribution channel. Real estate has a similar shape if agents share workers with buyers/sellers, but adoption is slower. Finance and Healthcare require more institutional procurement cycles.

---

## 2. The Unassigned Staging Zone

**Problem:** The platform's stated ambition (marketplace, creators, partners like Elise's DPP/Shopify) is open-world. The locked 5-vertical taxonomy is closed-world. Workers built outside those 5 rows have no valid landing spot today — they get force-fit into the wrong vertical or drift with a blank field.

**Solution: `vertical: "unassigned"` is a first-class, valid value.**

An unassigned worker:
- Has a legitimate home in the catalog (not invisible, not an error state)
- Is priced à la carte (no bundle — user subscribes to the specific worker, not a vertical box)
- Shows up in a "catalog:unassigned" admin/marketplace view
- Does NOT appear in vertical sibling injection (no vertical = no siblings)
- Triggers an admin review queue entry so SOCIII can track clustering

**Promotion lifecycle:**

```
Stage 1 — Unassigned (à la carte, no bundle)
    ↓  (3+ workers clearly cluster in the same domain)
Stage 2 — Suite promotion (the cluster becomes a named suite
           inside an existing vertical, if it fits)
    ↓  (5+ workers, own data model, own external APIs)
Stage 3 — Vertical promotion (CODEX amendment required —
           explicit decision, new bundle ID, new getVerticalConfig entry)
```

Promotion is a deliberate code decision, not a Firestore field tweak. Specifically: promoting to a new vertical requires a PR that adds a row to `getVerticalConfig` and a new entry in `BUNDLES`. No vertical gets created by accident.

**DPP/Shopify (Elise's use case) applies this today:** One DPP worker, `vertical: "unassigned"`. If 3-4 Shopify/retail-adjacent workers emerge in the next 6 months, we have evidence to promote `retail` to a vertical. We don't have that evidence today.

---

## 3. Cross-Vertical Suites

**Problem:** Some capability types cut across multiple verticals but don't belong to any single one. CE and licensing renewal is the proof case — nurses, real estate agents, pilots, and financial advisors all have mandatory annual CE. The current schema has no way to express "this suite type exists inside multiple verticals" without inventing a fake vertical.

**Solution: Suite names are shared vocabulary, not vertical-unique.**

A suite name like `"Licensing & CE"` can appear in Education, Real Estate, Aviation, and Healthcare simultaneously. The worker's unique identity is `(vertical, suite, slug)` — not just `suite`. The suite name is a shared label, like a tag, not a unique namespace.

**Canonical cross-vertical suites (defined here, usable in any vertical):**

| Suite name | Description | Currently lives in |
|---|---|---|
| `Licensing & CE` | Continuing education, license renewal, compliance training | Education (nursing-ce-001, student-eval-001), Real Estate (future: re-agent-ce-ca, re-agent-ce-nv), Aviation (future) |
| `Compliance` | Regulatory filings, reporting obligations, audit prep | Finance, Healthcare, Real Estate, Auto Dealer |
| `Operations` | Internal workflow, scheduling, process automation | All verticals + Spine |

**Rule:** A cross-vertical suite name is written in Title Case and listed here when first created. New cross-vertical suites require a CODEX amendment. Vertical-specific suite names (e.g., `"Entitlement"` in RE) are NOT cross-vertical — they stay in their vertical and are NOT listed here.

**Why CE workers are a revenue wedge:** CE renewal is annual and mandatory. That means every licensed professional in every vertical is a recurring annual-revenue customer — not a one-time acquisition. A CE worker for California real estate agents generates revenue every year, at renewal, from every agent in the state who uses it. This is the moat.

---

## 4. Creator Economics (Time-Critical — Before UH)

**Current state:** Creator gets 72% of subscription revenue, 25% of data pass-through fees (3-way split with platform and data provider). This is correct and stays. The issue is not the split percentages — those work at every tier. The issue is what happens when scale changes the PRICING SHAPE, not just the revenue amount.

### 4.1 The Flat-Rate Ceiling Problem

Flat per-seat pricing breaks in two directions:

**Too cheap at enterprise scale:** A 500K-seat Ford deployment at flat per-seat generates a number procurement refuses to sign. Enterprise deals are always negotiated — which means the "price" is now a starting point, not a final number.

**Too unpredictable for creators:** If the platform negotiates a custom price with Ford, and that custom price is 60% of list, Ruthie's 72% of 60% of list is not what she priced into her business model. She has no visibility into what the platform collected, and no input into the deal.

### 4.2 The Fix: Revenue Share on Collected, Not Listed

**Creator payout = 72% of revenue actually collected for that worker, regardless of pricing structure.**

This holds across:
- Standard marketplace checkout (72% of list price)
- Volume-discounted enterprise deals (72% of the discounted price)
- Annual prepay deals (72% of the annual contract value, paid monthly to creator)
- Negotiated custom contracts (72% of whatever was invoiced and collected)

The platform collects first, then distributes the creator share. The creator never has to care about the deal structure — they get their 72% of what came in.

This must be the language in every creator agreement before UH goes live. Ruthie's current agreement (if it references a fixed per-seat number) needs to be updated to reference the percentage of collected revenue instead.

### 4.3 Graduated Pricing Curve (Tiered Volume)

Platform list price follows a volume curve — NOT a flat rate at all scales:

| Tier | Seat range | Per-seat/month | Notes |
|---|---|---|---|
| Standard | 1–99 | List price | Marketplace checkout, no negotiation |
| Growth | 100–999 | List × 0.80 | 20% volume discount, auto-applied at checkout |
| Scale | 1,000–9,999 | List × 0.60 | 40% discount, annual prepay option unlocks |
| Enterprise | 10,000+ | Negotiated | Floor = list × 0.40; custom contract, platform signs |

**Why this exists as a formula (not case-by-case):** If every large deal is a negotiation, the sales team is reinventing pricing for every customer. A formula is better: the customer knows what to expect, the creator knows what to expect (72% of the tier price), and SOCIII has a defensible pricing rationale in every deal.

Creator's share follows the curve: at the Growth tier, creator gets 72% of list × 0.80 = 57.6% of list. This is disclosed in the creator agreement. At Enterprise tier, creator gets 72% of the negotiated floor (minimum 72% × 0.40 = 28.8% of list) — also disclosed.

### 4.4 Graduation Threshold (Platform Co-Management)

When a creator worker crosses a usage threshold, it "graduates" — SOCIII takes on co-management obligations (support SLA, uptime commitments, enterprise procurement paperwork) and the revenue split adjusts to reflect that.

**Threshold:** A worker graduates when it exceeds either:
- 5,000 active seats across all tenants, OR
- One single tenant with 1,000+ seats

**At graduation:**
- Creator retains authorship and IP
- Platform assumes support/SLA obligations (creator no longer on call for enterprise tickets)
- Revenue split adjusts: creator share drops from 72% to 55% of collected revenue (17-point shift to platform for absorbing operational costs)
- Creator is notified and must acknowledge in writing — graduation is not silent

**Opt-out rule:** A creator may opt out of graduation — declining platform co-management, keeping the 72% split, and remaining fully responsible for support. **Exception: opt-out is unavailable once a deal crosses the Enterprise tier boundary (10,000+ seats, platform-signed contract).** At Enterprise scale, the platform has contractually committed to the customer. The creator's internal opt-out does not relieve the customer of their SLA expectation. The platform absorbs Enterprise SLA obligations regardless of creator opt-out status; the cost of that absorption is already reflected in the 55% split. Opt-out is a pre-graduation right, not a post-Enterprise-contract right.

Note: the Enterprise tier boundary (10,000 seats) and the single-tenant graduation threshold (1,000 seats) are different numbers serving different purposes — the graduation threshold triggers the split change, the Enterprise tier triggers the platform-signed contract. A creator with a 1,000-seat single-tenant deal has graduated but may not yet be Enterprise; a creator with 10,000 aggregate seats across small tenants is Enterprise by volume. Both can trigger graduation; the Enterprise opt-out lock applies only when a platform-signed contract exists.

**Slug-splitting loophole (acknowledged):** A creator could theoretically avoid the aggregate 5,000-seat graduation threshold by publishing many state-specific or role-specific slugs (`re-agent-ce-ca`, `re-agent-ce-nv`) instead of one unified worker — each individually below the threshold, in aggregate enormous. This is acknowledged and currently unmitigated by design: per-slug granularity may reflect legitimate product differentiation (state-specific CE content really is a distinct product). If slug-splitting as threshold-avoidance becomes a visible pattern, add an `ownerUid`-level aggregate threshold in a future amendment. Until then, single-slug graduation thresholds are the rule.

**Why this matters for UH:** If a professor publishes a worker that 50 universities adopt with 500 students each = 25,000 seats. That professor never agreed to be an enterprise software vendor. Graduation gives SOCIII the ability to step in and protect both the professor and the customers.

**The disclosure requirement:** Graduation thresholds must appear in every creator agreement, in plain language, before the creator publishes their first worker. Not in the ToS appendix. In the onboarding flow.

### 4.5 Rate Limit Scoping (Infrastructure — Before UH)

**Current state:** Rate limits on worker tool calls (e.g., "max 2 pushes/minute per worker slug") are scoped globally — one noisy tenant exhausts the quota for every other tenant running the same published worker.

**Fix:** All rate limits are scoped per `(tenantId, workerSlug)`, not per `workerSlug` globally. A university with 500 students hammering a CE worker does not throttle another university's identical worker.

This is a code change, not a product decision. It must land before UH goes live.

---

## 5. GTM: Real Estate CE as the Market Gateway

### 5.1 The Thesis

Real estate agents are legally required to complete continuing education at every license renewal — typically 45 hours every 2-4 years depending on state. This is the only professional behavior in the RE industry the state guarantees will happen. It is not optional, not cuttable, and not deferrable.

The insight: if SOCIII owns the CE renewal experience, SOCIII has a captive audience for the RE worker platform at the moment agents are thinking most seriously about their professional practice. The CE is not the product — it is the acquisition funnel. The platform is the product.

**The gateway sequence:**
1. Agent must renew their license → searches for CE provider
2. Finds SOCIII CE — AI-native, faster, actually relevant to their work
3. Completes CE (45 hours, fully on SOCIII platform, using Alex throughout)
4. At course completion: "Your license renewal is logged in your Vault. Ready to see what else Alex can do for your listings?"
5. Drops directly into a live RE worker session — same interface, no re-onboarding
6. Free 100-day trial of the RE worker suite begins

The critical design constraint: **CE completion must transition the agent into the RE worker platform in the same session, not as a separate product they have to find.** If they have to navigate to a different URL or re-log in, conversion drops to near zero.

### 5.2 The Regulatory Unlock — Sean's Licensure

The barrier most tech founders hit: to offer CE for real estate license credit, you must be an approved CE provider in each state. Approval typically requires either holding a broker license in that state or demonstrating equivalent authority. Sean holds the necessary licensure to apply directly in Hawaii and California — bypassing the 12-18 month "find a licensed partner" path.

**Initial state targets:**
- **Hawaii** — small market (~15K licensed agents), manageable to learn the CE approval process, personal relationships at the state level possible. Launch state.
- **California** — largest agent population in the US (~400K licensed agents). 45-hour CE requirement every 4 years. California DRE approval as CE provider is the prize. Once CA is running, the model is proven.

Timeline assumption: Hawaii application submitted Q3 2026, approval Q4 2026. California application concurrent, approval 2027.

### 5.3 State Expansion Roadmap — Odd/Even Year Stagger

States deliberately offset their renewal cycles to distribute the administrative load. This creates a natural expansion calendar — apply 12 months before a state's peak renewal window.

**Renewal cycle map (simplified):**

| Year type | High-volume states | Target for application |
|---|---|---|
| Even years | Florida, Texas, Colorado, Washington | Apply Q1 odd year prior |
| Odd years | New York, Illinois, Georgia, Arizona | Apply Q1 even year prior |
| Rolling (by license date) | California, Nevada, Virginia | Apply 12 months before first major cohort |

**Expansion trigger:** Do not enter a new state without a confirmed CE provider approval in hand. Applications are cheap (a few hundred dollars and paperwork); operating without approval exposes the license.

**The broker-for-hire model (post-revenue):** Once platform revenue supports it, hire a licensed broker in each target state at ~$3-5K/year retainer to hold the CE provider application and serve as state-required compliance contact. This is a defined per-state cost with a defined return — access to a captive renewal cohort. It is not speculative headcount; it is a license to sell.

### 5.4 Funnel Math

**Conservative scenario (Year 1, HI + CA only):**
- Hawaii: ~3,000 agents renewing annually. Capture 10% = 300 agents × $177 avg CE spend = $53K CE revenue. 10% convert to platform = 30 agents × $99/mo = $35K ARR.
- California: ~100,000 agents renewing annually (4-year cycle = ~100K/yr). Capture 2% year 1 = 2,000 agents × $177 = $354K CE revenue. 10% convert = 200 agents × $99/mo = $238K ARR.
- **Year 1 total: ~$407K CE revenue + ~$273K ARR from platform.**

**Growth scenario (Year 2-3, add 4-6 states):**
- 500K agents in market reach. 3% CE capture = 15,000 agents × $177 = $2.65M CE revenue. 10% platform convert = 1,500 agents × $99/mo = $1.78M ARR.
- At this scale, CE is not just an acquisition channel — it's a real revenue line in its own right.

**The conversion rate assumption worth defending:** 10% CE-to-platform conversion is higher than industry norms for top-of-funnel → paid conversion, but lower than what you'd expect when the customer just spent 45 hours on your platform completing mandatory work. The 10% figure assumes the transition from CE to RE workers is seamless (same session, Vault already populated, Alex already knows them). If the transition requires any friction, model 3-5% instead. The product continuity principle in §5.1 is what justifies the 10%.

### 5.5 The Product Build That Makes This Work

The CE gateway requires three things that don't fully exist yet:

**1. CE course content delivery.** The CE courses must be built on the SOCIII platform — not a third-party LMS embedded in an iframe. Alex walks the agent through the material, quizzes, tracks completion, and issues the certificate. The course completion writes to the agent's Vault automatically (`logbookEntry: { type: "ce_completion", state: "CA", hours: 45, certificateUrl: "..." }`).

**2. State-specific course approval.** Each course (and often each topic module) must be approved by the state CE authority. Course content must match approved outlines — not freeform AI generation. The CE courses are structured and approved; Alex's role is delivery and assessment, not curriculum invention.

**3. Zero-friction handoff at completion.** The final CE module ends with: "Your 45 hours are complete. Certificate sent to DRE. Here's your Vault entry — tap to see your full license record." One tap later: "Ready to see what the RE workers can do? Your first 100 days are on us." The RE worker suite opens in the same session. This is the moment the gateway either works or doesn't.

### 6.1 Nursing → Education reclassification

**Workers:** `nursing-ce-001`, `student-eval-001`
- Update Firestore: `vertical: "nursing"` → `vertical: "education"`
- Update `suite` if it doesn't already say `"Licensing & CE"` → update to `"Licensing & CE"`
- Script: idempotent, query `digitalWorkers` where `vertical == "nursing"`, batch update

**Bundle:** `nursing-in-a-box` → `education-in-a-box`
- Existing subscribers: query `subscriptions` where `bundleId == "nursing-in-a-box"`, update `bundleId` to `"education-in-a-box"` (no worker changes — they already have the workers)
- Add `"education-in-a-box"` to BUNDLES constant, deprecate `"nursing-in-a-box"` (leave old key as alias that maps to the new bundle for backwards compat)

**`getVerticalConfig`:** Add `education` key aliased to `firestoreVertical: "education"`. Remove `nursing` key (or alias it to `education` for backwards compat in existing API calls).

### 6.2 Auto-dealer retirement

**Workers:** None exist. No migration of worker docs needed.
- `getVerticalConfig` in `index.js`: both `auto_dealer` and `auto-dealer` keys updated to return `{ suites: [], prefix: 'ad-', firestoreVertical: 'unassigned' }` as backwards-compat aliases. Remove in a subsequent PR once no active traffic.
- Verify: `grep -n "auto_dealer\|auto-dealer" functions/functions/index.js` — confirm both entries exist and now point to `unassigned`.

### 6.3 Backfill vertical field on existing unassigned workers

Any `digitalWorkers` doc with `vertical: null`, `vertical: ""`, or `vertical: "platform"` (if not actually a spine worker) should be reviewed and either:
- Set to a valid vertical key, OR
- Set to `"unassigned"` explicitly

Script: query all `digitalWorkers`, filter where `vertical` not in the canonical set + `"unassigned"` + `"platform"`, log and mark as `"unassigned"` with a `needsReview: true` flag.

---

## 6. Red Team

**R1: "Unassigned" becomes a permanent home, not a staging zone**
*Attack:* Workers get tagged "unassigned" and nobody ever promotes them. The staging zone fills up with uncategorized workers that never get reviewed. Marketplace becomes a junk drawer.
*Mitigation:* Admin review queue has a mandatory monthly review step. Workers in "unassigned" for more than 90 days trigger a Slack/Telegram alert to Sean. Promotion is a deliberate decision — but so is the decision NOT to promote (which should also be explicit: "this worker is intentionally à la carte and not vertical-bound").

**R2: 72% of collected revenue is hard to audit when pricing is negotiated**
*Attack:* Enterprise deal closes at a negotiated rate. Creator has no visibility into what was actually collected. Platform has information asymmetry. Creator's payout feels arbitrary.
*Mitigation:* Creator dashboard shows, for each billing period: total collected for that worker, creator's percentage, and creator's payout. Not a black box. Enterprise deals that include custom pricing trigger a "revenue disclosure" to any creator whose worker is in the deal — exactly the collected amount and the resulting creator share. This is table stakes for creator trust at scale.

**R3: Graduation at 5,000 seats surprises creators who are already in a deal**
*Attack:* A creator's worker quietly crosses the graduation threshold mid-year. Their revenue split drops from 72% to 55% retroactively. They feel cheated.
*Mitigation:* Graduation is prospective, not retroactive. The split adjusts at the next billing cycle after the threshold is crossed. Creator is notified 30 days before any split change takes effect. Creator can opt out of the platform co-management (but then loses the SLA backing and is fully on-call again — their choice). The 30-day notice is a contractual obligation, not a best-effort courtesy.

**R4: Tiered pricing creates a "valley of death" at tier boundaries**
*Attack:* A customer at 99 seats (Standard tier) has no incentive to grow to 100 (Growth tier starts) because the per-seat price drops — they lose the price advantage by growing. If 100-seat pricing is announced but not applied automatically, customers stay artificially small.
*Mitigation:* Tier pricing is applied automatically at checkout/renewal — customers don't have to ask. The pricing page shows the full curve, so customers know growth is cheaper, not a cliff. There is no penalty for crossing a tier boundary; the lower rate applies to the whole seat count at renewal.

**R5: "Education" vertical absorbs nursing workers but UH is a university, not a nursing school**
*Attack:* UH's professors span many departments — business, engineering, nursing, liberal arts. If we reclassify nursing-ce-001 into the education vertical, it now appears in UH's sibling injection alongside workers that have nothing to do with nursing. A business professor's CE worker would show nursing workers as siblings.
*Mitigation:* Sibling injection already filters by `(vertical, suite)` — not just vertical. A business professor's worker would be `vertical: "education", suite: "Licensing & CE"` and would see nursing-ce-001 as a sibling only if they share the same suite. If a business CE worker has a different suite (e.g., `"Professional Development"`), it never sees the nursing worker. Suite-level isolation within the vertical handles this without needing separate verticals.

**R6: Rate limit per-tenantId breaks if tenantId is missing or spoofed**
*Attack:* A client sends requests with no `x-tenant-id` header (missing tenantId). The rate limiter falls back to global scope, recreating the original problem for all unauthenticated or misconfigured callers.
*Mitigation:* If `tenantId` is missing on an authenticated request, the rate limiter uses `userId` as the scope (still per-user, not global). Unauthenticated requests use IP address as the scope. Never fall back to `workerSlug`-only global scope.

**R7: Cross-vertical suite names collide with vertical-specific suite names**
*Attack:* "Operations" is both a cross-vertical suite (§3) and a Real Estate vertical suite (§2 of CODEX 21). A worker tagged `suite: "Operations"` in the RE vertical is ambiguous — is it the cross-vertical Operations or the RE-specific one?
*Mitigation:* The cross-vertical suite list in §3 is additive, not a rename. The distinction is in `(vertical, suite)` pair — `(real-estate, Operations)` is a valid RE-specific Operations worker; `(unassigned, Operations)` is a cross-vertical one. The pair is always what identifies a worker's home, never the suite name alone. The catalog UI shows both fields, not just the suite name.

**R9: CE approval timeline collides with UH launch**
*Attack:* Hawaii and California CE provider applications are in process at the same time UH goes live in August. If the CE provider approval takes longer than expected (state backlogs, missing documentation, required in-person review), the RE CE gateway doesn't exist when the platform is being demo'd to universities. The two timelines are happening simultaneously and neither can wait for the other.
*Mitigation:* These are genuinely independent. UH is an education vertical play (professors + students); RE CE is a real-estate vertical play (agents). They use different workers, different Vault data models, and different RAAS rule sets. A delay in CA DRE CE provider approval has zero impact on UH going live. Keep the timelines separate in planning documents — do not let one create urgency on the other. RE CE can launch after UH.

**R10: Course quality is the entire bet — bad CE destroys the gateway**
*Attack:* An agent completes a poorly-designed AI CE course, submits it to DRE, and it fails to count toward their renewal because it doesn't match the approved course outline. Or it counts but the agent found it confusing and frustrating. Either outcome destroys the referral effect. A bad experience in a mandatory context is worse than no experience — the agent is captive and cannot leave, so their frustration is concentrated.
*Mitigation:* CE content must be built with a licensed education consultant who knows each state's approved course outline format — not generated freely by AI. Alex delivers and assesses; Alex does NOT invent the curriculum. The course content is reviewed and pre-approved before going live. Pilot with 10 agents before opening to any state cohort. "Does this count toward my renewal hours?" is the only question that matters — get the answer to yes before launching. The Alex-as-delivery, human-as-curriculum model is the right split.

**R11: Incumbents copy the AI format within 12-18 months**
*Attack:* The CE Shop, McKissock, and Colibri Real Estate are well-funded and already have state approvals in all 50 states. If SOCIII proves that AI-delivered CE converts agents to platform users, they add an "AI tutor" layer to their existing content within 18 months and compete directly on the CE side with a head start on state approvals, brand recognition, and existing student databases.
*Mitigation:* CE delivery is not the moat — it is the funnel. The moat is what happens AFTER CE completion: the RE worker suite, the Vault, the sibling communication, the immutable record. Incumbents can copy the AI tutor, but they cannot copy the platform the agent lands in after completion. The moment a McKissock-trained agent finishes CE and goes back to their email, SOCIII's agent finishes CE and opens a live CRE Analyst session. That is the difference. The answer to this attack is: do not try to win on CE quality alone; win on what CE unlocks.

**R12: Odd/even stagger creates feast-or-famine revenue within a state**
*Attack:* California's 4-year renewal cycle means in any given year, roughly 25% of agents are renewing. But the distribution isn't flat — agents who got their license in a particular year all renew together. A year with a large original-licensure cohort creates a spike; the following year is quiet. Revenue from a single state is lumpy, not smooth.
*Mitigation:* Multi-state presence smooths the curve — different states have different cycle shapes. The expansion roadmap in §5.3 explicitly targets odd/even year states in alternation to create blended coverage. Within a state, the platform subscription revenue (monthly recurring) is smooth even if CE revenue is lumpy — an agent who completes CE in year 1 and stays on the platform pays $99/mo for years 2, 3, and 4 while their renewal is dormant. The CE is one-time acquisition; the platform is recurring.

**R13: Broker-for-hire creates personal license dependency**
*Attack:* In the broker-for-hire model, SOCIII's CE provider authorization in a given state depends on a specific individual holding an active broker license and serving as compliance contact. If that broker's license lapses, is suspended, or they simply leave, SOCIII's CE authorization in that state is voided — potentially mid-cohort, with students enrolled in approved courses that can no longer be completed for credit.
*Mitigation:* Never rely on a single broker per state. Require two licensed brokers on file as compliance contacts — a primary and a backup — before opening any state. Build license expiration tracking into the patent/deadline engine already built for the IR worker: monitor each broker's license renewal date, alert 90 days before expiration, auto-alert if a license goes inactive in a state where SOCIII has enrolled students. The same append-only, deadline-engine model that tracks 83(b) filing windows applies here.

**R14: Product continuity requires Alex to know CE completion — integration gap**
*Attack:* The zero-friction handoff (§5.5 item 3) requires that at the moment of CE course completion, Alex already knows the agent's license state, renewal hours completed, and which RE workers to offer. But today's Alex context build (`buildSiblingStatePrompt`) reads from workspace data — it doesn't read from a CE completion event. If CE completion just writes to Vault and nothing else happens, the agent finishes their course and gets a generic Alex welcome screen, not "your 45 hours are complete, here's your Vault entry, here are your workers." The magic moment doesn't exist in the current codebase.
*Mitigation:* CE completion must fire a `ce_completion` event that: (1) writes the Vault logbook entry, (2) triggers the RE worker onboarding sequence, (3) sets a `ceGatewayComplete: true` flag on the user's workspace that Alex reads at context-build time. The first chat session after `ceGatewayComplete` is `true` should have a specialized system prompt injection: "This user just completed their real estate CE on SOCIII. They are a licensed agent in [state]. Their license record is in their Vault. Open with: 'Your renewal is logged. Ready to put your license to work?'" This is a 2-4 hour backend change, but it is the hinge the entire GTM strategy turns on. It must be built before the first CE student finishes a course.

**R8: Creator agreement update for UH has no deadline enforcement**
*Attack:* "Ruthie's agreement needs to be updated before UH goes live" — this is a legal/business task that can slip if not assigned. UH goes live with a creator using an agreement that references fixed per-seat dollars instead of % of collected revenue.
*Mitigation:* This CODEX's sign-off gate explicitly includes "creator agreements updated to % of collected revenue language" as a blocking item. Not a nice-to-have. The sign-off gate is the enforcement mechanism.

**R15: Scale tier and single-tenant graduation threshold coincide at 1,000 seats**
*Attack:* A customer crossing 1,000 seats simultaneously triggers a price drop for them (Scale tier starts at 1,000) AND a creator revenue-split drop (single-tenant graduation also fires at 1,000+). Two independent mechanisms landing on the same number. If unintentional, a 1,000-seat customer is a bad day for the creator regardless of which mechanism fires first.
*Mitigation:* This coincidence is intentional and confirmed — at 1,000 seats in a single tenant, both the volume discount and the graduation threshold apply. The price curve drop (to list × 0.60) reduces total revenue collected; the 72%→55% split change reduces the creator's share of that reduced revenue. The creator's effective take at exactly 1,000 seats is 55% × 0.60 of list, vs. 72% × list below 1,000. This is a meaningful step-down and must be disclosed explicitly in creator agreements — not buried in a pricing footnote. The step-down is the mechanism by which SOCIII recovers margin at the point where operational obligations begin. It is not a coincidence to be fixed; it is a design decision to be disclosed.

---

## 7. Open Items

- [ ] DPP worker: create `digitalWorkers/dpp-001` with `vertical: "unassigned"`, suite `"Compliance"`, wire Shopify connector
- [ ] Add `education-in-a-box` bundle to BUNDLES constant; deprecate `nursing-in-a-box`
- [ ] Run nursing → education reclassification script
- [ ] Run unassigned backfill script (workers with blank/null vertical)
- [ ] Rate limit scoping: change to `(tenantId, workerSlug)` before UH launch
- [ ] Creator agreement template: update to "72% of revenue collected" language; apply to Ruthie's existing agreement
- [ ] Revenue transparency dashboard for creators (billing period, collected amount, payout)
- [ ] Add graduation threshold disclosure to creator onboarding flow (visible before first publish, not buried in ToS)
- [ ] Education in a Box: build the worker suite (nursing-ce-001 and student-eval-001 are the seeds; UH needs at minimum a professor-facing worker and a student-facing CE worker)

---

## 8. Sign-off Gate (Before UH Goes Live — ~August 2026)

**Must ship (before UH goes live):**
- [ ] Rate limits scoped per `(tenantId, workerSlug)` — not global
- [ ] Creator agreements reference % of collected revenue (not fixed per-seat)
- [ ] Graduation threshold + 1,000-seat step-down disclosed in creator onboarding flow before publish
- [ ] `nursing` workers reclassified to `education` vertical — existing subscribers unaffected
- [ ] `unassigned` is a valid, queryable vertical value — workers with blank vertical are assigned
- [ ] `auto-dealer` retirement migration run — no docs remain with that vertical value

**Must ship (before first RE CE student completes a course — R14):**
- [ ] `ce_completion` event fires on course completion and: (1) writes Vault logbook entry, (2) sets `ceGatewayComplete: true` on user workspace, (3) triggers RE worker onboarding sequence in the same session
- [ ] First post-CE-completion chat session uses specialized system prompt injection referencing the agent's state, license, and Vault entry — not a generic welcome screen
- [ ] Zero-friction handoff confirmed in end-to-end test: agent completes final CE module → Vault entry appears → RE worker opens in same session without re-login or navigation

**Should ship:**
- [ ] Education in a Box bundle visible in marketplace — not gated behind "nursing" label
- [ ] Revenue transparency dashboard (at minimum: billing period + payout breakdown per worker)
- [ ] Tiered pricing curve live in Stripe — Growth/Scale/Enterprise tiers in effect

**Can wait:**
- [ ] DPP/Shopify worker (Elise pilot — post UH)
- [ ] Graduation co-management operations (requires a worker to actually hit 5K seats first)
- [ ] Enterprise custom worker entitlement (Ford-bespoke model — separate CODEX)
