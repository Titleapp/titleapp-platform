# SOCIII Launch Manifestos — 2026-06-01

**Status:** SOURCE OF TRUTH for the three launch-manifesto posts.
**Registered in:** `functions/functions/services/marketing/contentRegistry.js` under campaign `launch-manifesto`.
**Render:** `node scripts/render-black-cards.js --campaign launch-manifesto`
**CODEX:** S52.13 — Channel Stack and Creator Workspace Scaffold

---

## Why this campaign

Opens the SOCIII channel base. Three thesis posts that establish the category claim, the expert differentiator, and the sovereignty principle — in that order — before OF for Smart People character drips begin.

Posted from the COMPANY account, not Sean personally. This is the platform's voice, not the founder's.

---

## Cadence

| Day | YouTube | TikTok | LinkedIn | X |
|---|---|---|---|---|
| **Sun 6/1** | All 3 manifestos posted + pinned as channel stack | Manifesto #1 posted | Manifesto #1 (evening — catches Mon AM algorithm) | All 3 manifestos posted |
| **Mon 6/2** | Start OF drips (Katarzyna first) | Start OF drips | Manifesto #2 (AM) | OF char #1 |
| **Tue 6/3** | OF char #2 | OF char #2 | Manifesto #3 (AM) | OF char #2 |
| **Wed 6/4** | OF char #3 | OF char #3 | "Now meet the workers" → first HYB | OF char #3 |

**Rules from `CAMPAIGN_META.launch-manifesto`:**
- All 3 to YouTube + X day 1; LinkedIn staggered Sun-Mon-Tue (algorithm penalizes same-day clusters from new presences)
- Pin all 3 at top of YouTube channel as the thesis stack
- Black-card video form for YouTube Shorts / TikTok / IG Reels; long-form text for LinkedIn; mid-form text for X
- Don't lead OF character drips until the manifesto stack is up

---

## #1 — The category claim

**Pillar:** Power to Workers
**Content ID:** `launch-manifesto-001-category`

### Black-card video form (5-sec, white-on-black, SOCIII mark bottom-center)

```
For a hundred years
expertise lived in
billable hours.

Now it lives in
digital workers.

SOCIII.
```

### LinkedIn long-form (post-able as-is)

> For a hundred years, expertise lived in billable hours.
>
> The doctor. The engineer. The mechanic. The pilot. Each one a paywall on knowledge.
>
> That model is ending.
>
> The digital worker is what comes next — real expertise, distilled by the experts themselves, available on your terms.
>
> Welcome to SOCIII.
>
> sociii.ai

### X form (under 280)

> For a hundred years, expertise lived in billable hours.
>
> Now it lives in digital workers — built by the experts themselves.
>
> Welcome to SOCIII.
>
> sociii.ai

---

## #2 — The expert thesis

**Pillar:** Trust
**Content ID:** `launch-manifesto-002-expertise`

### Black-card video form

```
The model is the same.
The expertise isn't.

SOCIII workers
are built by the people
who actually do the work.
```

### LinkedIn long-form

> Generic AI guesses. SOCIII workers know.
>
> The model underneath is the same as everyone else's. The expertise on top isn't.
>
> SOCIII workers are built by the people who actually do the work — 20-year ER doctors, 30-year tax attorneys, master mechanics, pilots with 15,000 hours.
>
> Real expertise. Distilled into a worker. On your team.
>
> sociii.ai

### X form

> Generic AI guesses. SOCIII workers know.
>
> Same model. Different expertise.
>
> Built by 20-year ER doctors, 30-year tax attorneys, master mechanics, pilots with 15,000 hours.
>
> sociii.ai

---

## #3 — The sovereignty claim

**Pillar:** You Hold the Keys
**Content ID:** `launch-manifesto-003-sovereignty`

### Black-card video form

```
The worker works for you.

Not the platform.
Not the model.

You.

SOCIII.
```

### LinkedIn long-form

> The worker works for you. Not the platform. Not the model. You.
>
> SOCIII is built on a simple principle: every key, every audit, every decision stays with the person paying for the work.
>
> The platform is open. The architecture is auditable. The data is yours.
>
> That's what "you hold the keys" means.
>
> sociii.ai

### X form

> The worker works for you. Not the platform. Not the model. You.
>
> Every key, every audit, every decision stays with the person paying.
>
> That's what "you hold the keys" means.
>
> sociii.ai

---

## Open Graph / channel pin metadata

When uploading to YouTube Shorts, use these titles + descriptions so pinning the trio reads cleanly:

| # | YouTube title | YouTube description (first line) |
|---|---|---|
| 1 | "Expertise just changed shape." | For a hundred years, expertise lived in billable hours. Now it lives in digital workers. |
| 2 | "The model is the same. The expertise isn't." | SOCIII workers are built by the people who actually do the work. |
| 3 | "The worker works for you." | Not the platform. Not the model. You. |

---

## Related

- `docs/specs/CODEX-S52.13-Channel-Stack-and-Creator-Workspace-Scaffold.md` — full session context
- `functions/functions/services/marketing/contentRegistry.js` — schedulable registry entries
- `scripts/render-black-cards.js` — renderer (reads contentRegistry)
- `docs/marketing/SOCIII-Dogfood-Posts-2026-06-01.md` — week-2 dogfood thesis follow-on
- [[project-youtube-channel-ownership]] — channel base ownership decision
- [[project-external-accounts-register]] — vendor master for tracking the channels themselves
