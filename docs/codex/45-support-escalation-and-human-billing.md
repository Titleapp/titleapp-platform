# CODEX 45 — Support Escalation Trigger + Human Support Billing Spec

**Status:** 🟢 Escalation trigger shipped 2026-07-19 · Billing spec in CODEX 44 (pre-build)
**Owner:** Sean
**Date:** 2026-07-19
**Trigger:** Makai School of Nursing pilot — Ruthie's 65+ students + 20 admin/teachers need support coverage without requiring full-time staff

---

## What Was Built This Session

### 1. Support Escalation Trigger (shipped + deployed)

Three-layer implementation — each layer catches what the previous misses:

**Layer 1 — Frontend regex (ChatPanel.jsx)**
Intercepts before any LLM call. When a user's message matches explicit escalation signals (`can't log in`, `talk to a human`, `something is broken`, `contact support`, etc.), ChatPanel:
- Shows an immediate local message: "I'm looping in the SOCIII support team — someone will follow up with you directly within a few hours."
- Fires `POST /v1/support:escalate` in the background with message + workerSlug + persona + sessionId context
- Does NOT send the message to the LLM (no token cost, no wrong answer)

**Layer 2 — Universal worker system prompt append (index.js)**
Appended to EVERY worker's system prompt, all tenants. Covers nuanced phrasing the regex misses ("I'm really confused", "I don't know what to do") — the LLM understands intent even when the wording doesn't match a keyword. Workers respond with the exact escalation phrase to signal the support team.

**Layer 3 — Demo overlay (index.js)**
The existing demo mode overlay (`DEMO MODE RULES`) was updated to include the escalation rule explicitly. Nursing students exploring the Makai demo are covered from the first message.

**Alex core prompt (core.js)**
Added a `SUPPORT ESCALATION` rule to Alex's master prompt so the COS surface responds correctly even when the two backend layers don't apply.

### 2. Backend Route: `POST /v1/support:escalate`

Located just before the Inventory routes in index.js. Authenticated route (Firebase user required). On call:
- Writes to `supportEscalations/{id}` in Firestore: tenantId, userId, userEmail, workerSlug, persona, sessionId, message, status=pending, createdAt
- Sends email to sean@sociii.ai via SendGrid with formatted HTML: user name, tenant, worker, message
- Sends SMS to +13104300780 via Twilio (non-fatal — SMS failure does not block the response)
- Returns `{ok: true}`

Demo tenants (`demo-*`) and subsidized tenants escalate with no billing — the route logs and notifies regardless.

### 3. CODEX 44 — Human Support Billing Spec (double red-teamed)

Full spec for metering human support through the existing credits system. Key decisions locked:
- $45/hr, 15-minute increments, minimum 12 credits per session
- Explicit consent gate before any session opens — button leads, credit disclosure secondary
- Real credit hold (not bookkeeping) at session open; final charge at close
- Rate limit per-user (NOT per-tenant — critical for multi-student institutional accounts like Makai)
- Subsidized flag (`billing.humanSupportSubsidized: true`) for Makai/UH/demo tenants
- Subsidy expiry requires affirmative action from Sean — cannot silently lapse into billing
- `reopenedFrom` + `skipCharge` fields on session doc enforce the "no charge on reopen" policy structurally
- `slaMet` computed off `respondedAt`, not `closedAt`
- Demo fleet covered by code-level `tenantId.startsWith("demo-")` prefix check, not manual flags

Red team surfaced 10+4+2 issues (v1 + second pass). All addressed in CODEX 44 v2.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/business/src/components/ChatPanel.jsx` | Layer 1: escalation regex + local response + API call in `sendMessage()` |
| `functions/functions/index.js` | `POST /v1/support:escalate` route; universal worker prompt append; demo overlay update |
| `functions/functions/services/alex/prompts/core.js` | `SUPPORT ESCALATION` rule added |
| `docs/codex/44-human-support-billing.md` | New — full billing spec, double red-teamed, v2 |
| `docs/codex/45-support-escalation-and-human-billing.md` | This file |
| `docs/codex/00-INDEX.md` | CODEX 44 + 45 indexed |

QA001 ran clean: 0 lint errors, clean production build.

---

## What's NOT Built Yet (CODEX 44 build backlog)

The escalation trigger fires and notifies Sean. The billing layer does not exist yet — no credits are charged for any support session today. Before charging any tenant:

1. **Consent gate UI** — structured card in ChatPanel (button leads, credit line secondary), replacing the current plain-text response for non-subsidized tenants
2. **Credit balance lookup at escalation time** — needed to show balance in the consent gate and enforce the zero-credit hard block
3. **Real credit hold at session open** — atomically deduct 12 from spendable balance when session opens
4. **Admin "close ticket" panel** — minutes logged + resolver + skip-charge check + credit debit trigger
5. **`billing.humanSupportSubsidized: true`** flag set on Makai tenant in Firestore before pilot goes live

---

## Open Decisions (Sean's call)

1. **Manpreet/Vishal rate card** — $20/hr is an estimate. Lock their per-call rate before margin math is real (CODEX 44 RT3).
2. **SLA hours** — 4 business hours Mon–Fri Pacific proposed. Confirm, especially for evening Hawaii-timezone escalations from Makai students.
3. **Subsidized until when for Makai?** — Set a specific date on `humanSupportSubsidizedUntil` so the 30-day warning fires at the right time.
