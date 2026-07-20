# CODEX 45 — Support Escalation Trigger + Human Support Billing Spec

**Status:** 🟢 Escalation trigger + consent gate UI shipped 2026-07-19 · Admin close-ticket panel still pending
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

### 2. Backend Routes (index.js)

**`GET /v1/support:status`** — called by `SupportEscalationCard` on mount:
- Returns `{subsidized, creditsAvailable, withinHours, nextOpen, creditsPerBlock}`
- Subsidized check: `tenantId.startsWith("demo-")` OR Firestore `billing.humanSupportSubsidized: true` (with expiry check)
- Business hours check: Mon–Fri 9am–5pm PT using `America/Los_Angeles` timezone

**`POST /v1/support:escalate`** — fired after user gives explicit consent in the card:
- If NOT subsidized: checks credit balance; rejects with 402 if < 7 credits; atomically decrements 7 credits from `dataCredits` doc
- Opens a `supportSessions/{id}` doc with full lifecycle fields (`status`, `subsidized`, `creditsReserved`, `creditCharged`, `reopenedFrom`, `skipCharge`, `respondedAt`, `slaMet`, etc.)
- Sends HTML email to sean@sociii.ai (includes business hours note + session ID)
- Sends SMS to +13104300780 (non-fatal)
- Returns `{ok: true, sessionId, subsidized, withinHours}`

Demo tenants and subsidized tenants: full logging + notification, zero credit deduction.

### 3. Consent Gate UI — `SupportEscalationCard.jsx` (new component)

Replaces the previous plain-text + immediate-fire approach. Injected as structured data into the chat message stream via `renderStructuredData()` in ChatPanel.

Phases:
- **loading** — fetches `GET /v1/support:status` on mount
- **subsidized** — "Support is covered for your account — no charge"
- **outside_hours** — warning banner + "Leave a message →" CTA
- **no_credits** — shows balance shortfall + "Add credits →" deeplinks to billing
- **ready** — shows credit balance, "Connect me →" primary, "Keep trying with AI" secondary
- **confirmed** — green checkmark confirmation state
- **declined** — renders null

Button-first layout (CODEX 44 RT8). Credit info is secondary disclosure, not gating. "Connect me →" fires `POST /v1/support:escalate` with `consentGiven: true`.

### 4. CODEX 44 — Human Support Billing Spec (double red-teamed)

Full spec for metering human support through the existing credits system. Key decisions locked:
- **$25/hr**, 15-minute increments, **minimum 7 credits** per session (1 credit = $1)
- Explicit consent gate before any session opens — button leads, credit disclosure secondary
- Real credit hold (not bookkeeping) at session open; final charge at close
- Rate limit per-user (NOT per-tenant — critical for multi-student institutional accounts like Makai)
- Subsidized flag (`billing.humanSupportSubsidized: true`) for Makai/UH/demo tenants
- Subsidy expiry requires affirmative action from Sean — cannot silently lapse into billing
- `reopenedFrom` + `skipCharge` fields on session doc enforce the "no charge on reopen" policy structurally
- `slaMet` computed off `respondedAt`, not `closedAt`
- Demo fleet covered by code-level `tenantId.startsWith("demo-")` prefix check, not manual flags
- **Makai/UH subsidized through 2026-12-31** (set in `scripts/seedMakaiNursingDemo.js`)

Red team surfaced 10+4+2 issues (v1 + second pass). All addressed in CODEX 44 v2.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/business/src/components/ChatPanel.jsx` | Layer 1: escalation regex → inject consent card via `structuredData`; import + `renderStructuredData` handler |
| `apps/business/src/components/SupportEscalationCard.jsx` | **NEW** — consent gate UI (6 phases, credit balance fetch, connect/dismiss buttons) |
| `functions/functions/index.js` | `GET /v1/support:status` (new); `POST /v1/support:escalate` (updated: session doc, credit deduction, SMS improvements); universal worker prompt append; demo overlay update |
| `functions/functions/services/alex/prompts/core.js` | `SUPPORT ESCALATION` rule added |
| `scripts/seedMakaiNursingDemo.js` | `billing.humanSupportSubsidized + humanSupportSubsidizedUntil` added to TENANT_DOC |
| `docs/codex/44-human-support-billing.md` | v2 — full billing spec, double red-teamed, $25/hr + 7 credits |
| `docs/codex/45-support-escalation-and-human-billing.md` | This file |
| `docs/codex/00-INDEX.md` | CODEX 44 + 45 indexed |

QA001 ran clean: 0 lint errors, clean production build (prior session).

---

## What's NOT Built Yet (CODEX 44 build backlog)

Consent gate + credit deduction at session open are shipped. Remaining before the full billing loop closes:

1. **Admin "close ticket" panel** — minutes logged + resolver + skip-charge check + final credit debit trigger
2. **Subsidy expiry warning emails** — 30-day → 7-day → hard hold notifications (needed before Makai subsidy lapses 2026-12-31)
3. **Credit reconciliation at close** — if session ran > 15 min, charge additional blocks; refund if < 15 min

---

## Open Decisions (Sean's call)

1. **Manpreet/Vishal rate card** — $20/hr is an estimate. Lock their per-call rate before margin math is real (CODEX 44 RT3).
2. **SLA hours** — 4 business hours Mon–Fri Pacific proposed. Confirm, especially for evening Hawaii-timezone escalations from Makai students.
3. **Makai subsidy end date** — set to 2026-12-31 in seed script. Need to set it live in Firestore before subsidy warning emails are relevant.
