# Auto Dealer — Cold Email Invite (May 19 Webinar)

**Send timing:** Day 1 — 10 contacts, then ramp 10/day
**Sender:** sean@sociii.ai (signed by Sean) — *not* alex@
**Reply-to:** sean@sociii.ai
**Audience:** C-suite at auto dealerships in CA, NV, OR, WA, TX
**CTA:** Register for May 19 webinar — **30 minutes**
**Brand voice:** Swiss tone — direct, calm, no hype. No emojis.

---

## A/B Subject line rotation (3 variants — randomize daily)

**Variant A.** AI in auto dealerships — invite to a 30-min session
**Variant B.** What top dealers are doing with AI in 2026 (30 min, May 19)
**Variant C.** F&I, compliance, AI — and what's still hype (May 19)

**Send strategy:** randomize ~equal across each daily batch of 10. After ~50 total sends across 5-7 days, identify highest open-rate variant; weight remaining sends toward the winner. Don't lock to one option until clear data signal emerges.

---

## Email body — plain text version

```
Hi {{first_name}},

We're hosting a 30-minute session on May 19 for dealership leaders in
California, Nevada, Oregon, Washington, and Texas — focused on what AI
actually changes in F&I compliance, customer lifetime value, and the
service department, and what's still hype.

Thirty minutes. No pitch deck. Just what we've seen working at dealers
who've started using AI for the right things and avoiding it on the
wrong ones.

Speakers:
  - Sean Combs — CEO and Co-founder, SOCIII. AI thought leader
    with patent-pending compliance architecture. Two decades operating
    in transportation — airline pilot, medevac pilot — where the cost
    of bad information is measured in lives, not metrics.
  - Kent Redwine — CFO and Co-founder, SOCIII. Fifteen years in
    investment banking, advising clients across one of the world's
    largest aircraft manufacturers, leading technology firms, green
    energy, and electric vehicles. Founded an electric vehicle company
    before Tesla took the segment.
  - Alex — Chief of Staff to Sean Lee Combs, CEO and Co-founder. Live
    Q&A in chat throughout the session.

Date: Monday, May 19, 2026
Time: 11:00–11:30 AM Pacific (12:00 MT, 1:00 CT, 2:00 ET)
Format: Google Meet, recorded, replay available

Register: https://forms.gle/KQheZEzYWjX2SecG7

Attendees get our 2026 white paper — "The AI Playbook for Auto Dealers"
— with modeled benchmarks, real architecture, and a 30-day playbook
you can run yourself.

— Sean

P.S. If May 19 doesn't work, register anyway and we'll send the recording
plus the white paper. No follow-up sales call unless you ask for one.
```

---

## HTML version

```html
<p>Hi {{first_name}},</p>

<p>We're hosting a 30-minute session on May 19 for dealership leaders in California,
Nevada, Oregon, Washington, and Texas — focused on what AI actually changes in F&amp;I
compliance, customer lifetime value, and the service department, and what's still hype.</p>

<p>Thirty minutes. No pitch deck. Just what we've seen working at dealers who've started
using AI for the right things and avoiding it on the wrong ones.</p>

<p><strong>Speakers</strong></p>
<ul>
  <li><strong>Sean Combs</strong> — CEO and Co-founder, SOCIII. AI thought leader
      with patent-pending compliance architecture. Two decades operating in transportation —
      airline pilot, medevac pilot — where the cost of bad information is measured in lives,
      not metrics.</li>
  <li><strong>Kent Redwine</strong> — CFO and Co-founder, SOCIII. Fifteen years in
      investment banking, advising clients across one of the world's largest aircraft
      manufacturers, leading technology firms, green energy, and electric vehicles. Founded
      an electric vehicle company before Tesla took the segment.</li>
  <li><strong>Alex</strong> — Chief of Staff to Sean Lee Combs, CEO and Co-founder. Live
      Q&amp;A in chat throughout the session.</li>
</ul>

<p><strong>Date:</strong> Monday, May 19, 2026<br>
<strong>Time:</strong> 11:00–11:30 AM Pacific (12:00 MT, 1:00 CT, 2:00 ET)<br>
<strong>Format:</strong> Google Meet, recorded, replay available</p>

<p><a href="https://forms.gle/KQheZEzYWjX2SecG7" style="display:inline-block;padding:12px 24px;
background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">
Register here</a></p>

<p>Attendees get our 2026 white paper — <em>The AI Playbook for Auto Dealers</em> —
with modeled benchmarks, real architecture, and a 30-day playbook you can run yourself.</p>

<p>— Sean</p>

<p style="color:#666;font-size:13px;"><strong>P.S.</strong> If May 19 doesn't work,
register anyway and we'll send the recording plus the white paper. No follow-up sales
call unless you ask for one.</p>
```

---

## Personalization fields

| Tag | Source |
|---|---|
| `{{first_name}}` | Apollo person.first_name |
| `https://forms.gle/KQheZEzYWjX2SecG7` | Sean to provide once Google Form set up |

---

## Pre-send checklist

- [ ] `https://forms.gle/KQheZEzYWjX2SecG7` swapped with real Google Form URL
- [ ] `{{first_name}}` merge tag matches SendGrid contact list field
- [ ] Sender authenticated (sean@sociii.ai must be Single Sender Verified in SendGrid — Sean to check)
- [ ] Unsubscribe group ID 29284 attached
- [ ] First 10 sends only (today's batch). Ramp 10/day.
- [ ] **3 subject line variants assigned across the batch** (rotate daily)
- [ ] After 24 hours: log open rate per variant, reply rate, bounce rate
- [ ] If bounce rate >2% — STOP and check list quality before next batch

---

## Notes vs. v1 (what changed in v3 revisions)

- Sender flipped from alex@ → sean@sociii.ai (founder-personal cold sends better)
- Webinar 60 min → **30 min**
- Sean Auto bio: AI thought leader + airline + medevac (transportation angle, no resort)
- Kent bio: industry sectors + EV founder
- Alex framing: Chief of Staff to Sean Lee Combs, CEO and Co-founder
- "patent-pending" replaces specific patent count
- White paper bonus reframed as "modeled benchmarks" not specific ROI claims
- Added 3 subject line variants for A/B (Sean's call to test until winner emerges)
