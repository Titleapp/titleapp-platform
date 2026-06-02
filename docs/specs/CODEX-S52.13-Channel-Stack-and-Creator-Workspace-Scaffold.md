# CODEX S52.13 — Channel Stack, Creator Workspace Scaffold, and Worker Pipeline Decisions

**Date:** 2026-06-01 (Sunday evening session)
**Cadence:** late-session capture before Sean's break
**Status:** SHIPPED for what was code; DECIDED for what was architectural; QUEUED for what was conceptual

---

## Why this CODEX exists

A long Sunday session that touched code, architecture, channel ops, and creative direction. Without consolidation the threads drift before Monday. This document captures what shipped, what was decided, what was conceived, and what the next session picks up.

If reading cold: skip to **Section 6 (Next session pickup)** for the punch list.

---

## 1. What shipped (code)

### 1.1 CreatorWorkspace page — `/creator-workspace/<slug>`

`apps/business/src/pages/CreatorWorkspace.jsx` (new) — three-tab surface (Overview · Distribute · Promote) that mounts salvaged sandbox components for the creator-side view of a finished worker.

- **Distribute tab** mounts `DistributionKit` → generates worker promo decks (PowerPoint, PDF, QR, embed code). Already SOCIII-branded throughout; backend endpoint `/v1/docs:generate` unchanged.
- **Promote tab** mounts `CreatorSpotlight` → featured-creator submission flow with photo upload, bio, release agreement.
- **Overview tab** renders worker card + quick actions + status panel.

Route wired in `apps/business/src/App.jsx` at line 5066 (intercept) and the route handler section. Lazy-loaded under React.Suspense.

**Worker fixtures included:**
- `fundraise` — IR worker (BANK-FUND-001 in catalog) — `live: true`, RAAS resolves, real deck generation
- `nursing-eval-001` — Ruthie's worker stub — `live: false`, demo only
- `fred-international-tax` — OF for Smart People character stub — `live: false`, demo only

A "Demo only — no catalog entry" amber badge surfaces in the sub-bar when the fixture's slug doesn't resolve to a real catalog entry, preventing silent RAAS fallback drift.

### 1.2 QA-001 pass on the scaffold

Applied test corpus assertions to the new surface before shipping:

| Test | Status | Resolution |
|---|---|---|
| TC-006 (worker slug consistency) | Fixed | `ir-worker` → `fundraise` to match catalog id |
| TC-008 (fixture key matches catalog) | Fixed | Map key = slug = catalog id |
| TC-001 / TC-004 (frontend reads catalog) | Documented risk | Hardcoded fixture for demo; production should hydrate from `useWorkerCatalog` |
| RAAS isolation | Pass for fundraise · Demo-only badge for the rest |
| Three-panel layout rule | **Violation flagged** — scaffold is two-column. Joins the queue with `/creators/journey` and `/data-room`. Not blocking Ruthie demo; ship before opening to general creators. |

This was the first scaffold to run QA-001 in-line before shipping. Pattern continues.

### 1.3 YouTube + TikTok channel base

- **SOCIII YouTube** channel created at studio.youtube.com/channel/UCVaF3P41A4H2t9-YrJXMPCQ — display name pending final ("SOCIII" without AI suffix recommended), handle landed on a fallback variant since `@sociii` was unavailable, Brand Account wrapper on top of `seanlcombs@gmail.com`.
- **SOCIII TikTok** account created (Sean's separate action; handle TBD in vendor master).
- **TitleApp TikTok** (`@titleappofficial`, 8,171 followers) left dormant; rebrand handshake deferred.

---

## 2. What was decided (architecture)

### 2.1 External Accounts Register lives in Accounting

The Vendor Master + platform-account + SaaS-subscription + banking + labor register is **owned by the Accounting worker**, consumed by HR for the labor subset only. Never duplicated.

Rationale and full schema in [[project-external-accounts-register]].

Backfill scope (≈15 scattered credentials needing consolidation): Apollo · SendGrid · Twilio · Cloudflare · Firebase · Stripe · Dropbox Sign · Google Workspace · Fal.ai · Kling · Coinbase Business · Namecheap · TitleApp TikTok · SOCIII TikTok · SOCIII YouTube · SOCIII X · SOCIII LinkedIn.

Unblocks: patent claim #1 (audit anchoring) — anchoring requires a known asset set; the Vendor Master IS that set.

### 2.2 YouTube channel ownership pattern

Owned under Sean's personal Google login + SOCIII Brand Account wrapper. Transfer to `alex@sociii.ai` triggered by the inbox-triage worker shipping. Until then, Alex cannot read notifications, so the only mailbox actually monitored holds the keys.

Full reasoning + transfer trigger in [[project-youtube-channel-ownership]].

### 2.3 TikTok strategy — fresh SOCIII accounts, legacy handshake later

Rejected the option of renaming `@titleappofficial` → `@sociii` immediately. Reasons:

1. Algorithmic risk: rebranded accounts get throttled ~2 weeks while the recommender re-calibrates.
2. Content thesis mismatch: existing 8,171 followers came for consumer property/title/GPS/pet content; SOCIII is enterprise AI workers. Half churn anyway.
3. Cleaner signal: fresh SOCIII handle starts with zero algorithmic baggage.

Legacy handshake happens later via a 3-post bridge series when there's a real story to tell.

### 2.4 Worker output channel-strategy split

- **YouTube + TikTok + Instagram**: OF for Smart People + manifesto + Hate Your Boss + future explainer videos
- **LinkedIn**: Manifesto + Hate Your Boss only. OF format risks brand misread on LinkedIn (the "OnlyFans" visual reference reads off-tone).
- **X**: Manifesto + OF + Hate Your Boss + thread-form thinking
- All 4: Black-card manifesto posts work text-only on LinkedIn/X, video-form on YouTube/TikTok

### 2.5 Launch cadence rules (new-channel discipline)

- **First 7 days**: 1 video/day. Resist bulk-upload temptation.
- **Days 8-14**: scale to 2/day if engagement responds.
- **Days 14+**: max 3/day even at scale.
- **First posts must lead with thesis** (manifesto), not character ads. The algorithm + the human both calibrate from the opener.
- **Cross-platform uploads from CLEAN MASTERS only.** Never download from TikTok → upload to YouTube; the watermark gets detected and de-prioritized.
- **TikTok duplicate detection**: if any video was previously on `@titleappofficial`, test ONE re-upload first and watch the 4-hour impression curve before posting more.

---

## 3. What was conceived (worker pipeline)

Workers that surfaced as concrete needs today but aren't built yet. Each is queued or new:

### 3.1 Character Generator Worker (new)

**Job**: auto-OF-ify the 238-worker catalog. Feed catalog entry → produce avatar still + 5-sec Kling clip + caption + character landing URL → push to TikTok/YouTube/IG.

**Why**: doing this manually per worker is the bottleneck; 17 OF videos for the launch took a full day. 238 workers at that pace is 14 days of pure render work.

**Avatar policy**: mixed — real photos where the creator consented (Fellows + early Marketplace creators); synthetic avatars for catalog-only stubs. Synthetic avatars tagged with a visual signal so viewers can distinguish "live expert" from "composite expert built from [n] years of [specialty] precedent."

**Patent reinforcement**: real-creator videos prove patent claim #4 (consent-based likeness licensing) chain works end-to-end; synthetic ones prove platform doesn't depend on celebrity for distribution.

### 3.2 Inbox-Triage Worker (new — gating dependency)

**Job**: read alex@sociii.ai (and optionally consenting human inboxes), triage, surface action items to a workspace canvas, draft replies for human approval, alert on time-sensitive items (account strikes, recovery flows, invoice deadlines).

**Why this matters**: gates the YouTube ownership transfer from Sean → alex@sociii.ai. Until Alex can read mail autonomously, no platform credentials should sit on alex@sociii.ai inboxes.

**Adjacent to**: task #266 Personalized Outreach Worker (IR→HR lifecycle).

### 3.3 Vendor & Subscription Controller Worker — PLAT-005 (already queued #265)

**Now has a registry to work on** — the External Accounts register architecture decision (Section 2.1). Without this, the Controller had no source-of-truth to enforce against. Now it does.

### 3.4 Improved workers (today's pass)

- **DistributionKit (component)** — was stranded in the dead sandbox host; now reachable via CreatorWorkspace. Ruthie's deck for tomorrow's pitch generates from here.
- **CreatorSpotlight (component)** — same; now mounted in CreatorWorkspace Promote tab.
- **Marketing Worker** — new cadence rules baked into the playbook (Section 2.5). Should be wired into Marketing Worker's campaign scheduling logic so creators get launch-discipline by default.
- **Accounting Worker (Controller pattern)** — scope expanded to External Accounts register beyond just spend. The "Controller" role now includes credential custody.

---

## 4. Marketing launch base (today's post stack)

### 4.1 Three black-card manifestos (Section 2.4 channel split)

Authored as if generated by a SOCIII brand worker. Each post in three forms: 5-sec black-card video (for YouTube Shorts + TikTok + IG Reels) + LinkedIn long-form expansion + X short-form.

| # | Theme | SOCIII pillar |
|---|---|---|
| 1 | Category claim — "expertise leaves billable hours, enters digital workers" | Power to Workers |
| 2 | Expert thesis — "model is the same, expertise isn't" | Trust |
| 3 | Sovereignty claim — "the worker works for you, not the platform" | You Hold the Keys |

Full copy in `docs/marketing/SOCIII-Launch-Manifestos-2026-06-01.md` (black-card form + LinkedIn long-form + X form). Registered in `functions/functions/services/marketing/contentRegistry.js` under campaign `launch-manifesto`. Render via `node scripts/render-black-cards.js --campaign launch-manifesto`.

### 4.2 Rollout cadence

| Day | YouTube | TikTok | LinkedIn | X |
|---|---|---|---|---|
| **Sun 6/1** | All 3 manifestos posted + pinned | Manifesto #1 posted | Manifesto #1 (evening) | All 3 manifestos posted |
| **Mon 6/2** | Start OF character drips (1/day) | Start OF drips (1/day) | Manifesto #2 (AM) | OF character #1 |
| **Tue 6/3** | OF char #2 | OF char #2 | Manifesto #3 (AM) | OF char #2 |
| **Wed 6/4** | OF char #3 | OF char #3 | "Now meet the workers" → first HYB | OF char #3 |
| **Thu 6/5+** | OF drips continue | OF drips continue | HYB cadence weekly | OF drips continue |

OF drip sequence prioritized by audience overlap with TitleApp legacy audience: Katarzyna (landlord/tenant) → Madison (HIPAA/privacy) → an RE worker character (to be created) → Darnell (family law) → then the higher-end professional characters.

### 4.3 Distribution discipline (from Section 2.5)

- Clean masters to each platform separately. No TikTok → YouTube reposts.
- TikTok duplicate detection: test with one video before any bulk action.
- YouTube scheduled publish queue: load 14+ days of content tonight, auto-release on cadence.
- TikTok scheduled publish gated to 10K+ followers; manual posting until then. Set daily reminder or wire Marketing Worker schedule (#149/#150 thread).

---

## 5. Open follow-ups

**Tonight (if energy holds):**
- Render the 3 manifesto black-card videos via `scripts/render-black-cards.js`
- Confirm YouTube handle + display name + description published
- Upload manifesto #1 to YouTube + TikTok + LinkedIn + X
- Queue manifesto #2-3 on YouTube via scheduled publish

**Monday morning:**
- Ruthie's pitch — `/creator-workspace/nursing-eval-001` → Distribute tab → generate her deck (PPTX or PDF) → handoff
- Start OF for Smart People drip cadence (Katarzyna first)
- Manifesto #2 on LinkedIn (AM window)

**This week:**
- Vendor & Subscription Controller Worker spec — operationalize the External Accounts register
- Backfill the 15 scattered platform credentials into the register
- Three-panel layout refactor for `/creator-workspace` (joins the existing queue with `/creators/journey`, `/data-room`)
- Character Generator worker scoping doc

**Next week:**
- Coinbase Business audit-anchor wiring (Section 2.1 unblocks this)
- Inbox-Triage Worker scope + spike
- YouTube channel monetization clock-tracking confirmation

---

## 6. Next session pickup (the punch list)

Read this if returning cold and short on time:

1. **Ship Ruthie's deck.** `/creator-workspace/nursing-eval-001` → Distribute tab → "Generate deck" → download. Branding swap on slide templates may need touch-up depending on `/v1/docs:generate` output.
2. **Render + post manifesto #1** if not already done (YouTube + TikTok + LinkedIn + X). Cadence Section 4.2.
3. **Start OF drip.** First character: Katarzyna (landlord/tenant) — highest audience overlap with TitleApp legacy followers.
4. **Three-panel layout refactor** queued for `/creator-workspace` — not blocking demo, but ship before general creator open.
5. **Vendor & Subscription Controller Worker (#265)** — has its registry now (External Accounts register, Section 2.1). Spec next.

---

## Related

- [[project-youtube-channel-ownership]]
- [[project-external-accounts-register]]
- [[project-sandbox-killed-substack-pattern]]
- [[project-coinbase-business-approved]]
- `CODEX-S52.9-Conversion-Machine-Campaign.md`
- `CODEX-S52.10-Video-Application-Maturity-Model.md`
- `CODEX-S52.11-Video-as-First-Class-Worker-Output-DRAFT.md`
- `CODEX-S52.12-Sandbox-Salvage-Audit.md`
- `apps/business/src/pages/CreatorWorkspace.jsx`
- `apps/business/src/components/DistributionKit.jsx`
- `scripts/render-black-cards.js`
- `docs/QA-001-TEST-CORPUS.md`
