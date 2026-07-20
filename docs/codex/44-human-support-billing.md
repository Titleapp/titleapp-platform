# CODEX 44 — Human Support: Metered Credit Service

**Status:** SPEC v2 — red-teamed twice 2026-07-19  
**Owner:** Sean  
**Date:** 2026-07-19  
**Trigger:** Makai School of Nursing pilot — Ruthie wants support included; Sean wants a scalable model that doesn't give it away for free at scale  
**Applies to:** All tenants, all workers, all verticals

---

## 1. The Philosophy

SOCIII's AI tier (Alex + all Digital Workers) handles the vast majority of user needs. Human support is a **premium metered layer** — used rarely, priced to reflect real cost, billed to the tenant's existing credit balance.

The model has three analogues:
- **AWS Support tiers** — AI docs first, human support is metered and adds real cost
- **Zendesk** — AI deflects, human resolves, every resolved ticket has a cost
- **A law firm's billing clock** — when the partner picks up, the meter runs

The goal is not to profit from distress. The goal is to:
1. Ensure SOCIII can sustain a human support function without subsidizing it indefinitely
2. Price it honestly so tenants know what they're buying
3. Exempt pilot/research accounts where the relationship is subsidized by design

---

## 2. Three-Tier Support Model

| Tier | Who | Cost | Always available |
|------|-----|------|-----------------|
| **Tier 0 — AI** | Alex + worker LLMs | Free, included | Yes — 24/7 |
| **Tier 1 — Human** | Manpreet / Vishal (per-call contractors) | $45/hr, 15-min minimum | Business hours, response SLA: 4 hours |
| **Tier 2 — Founder** | Sean directly | Goodwill only — NOT a billing tier | For pilot/strategic accounts only |

Tier 1 is the metered revenue model. Tier 2 is never billed — it's a relationship cost for pilots and high-value accounts. Tier 0 is always free and should handle ≥90% of requests.

---

## 3. Pricing

### Unit Rate
- **$45/hour** billed in **15-minute increments**
- **Minimum charge: 1 increment = $11.25**
- 1 credit = $1 → minimum = **12 credits** (rounding $11.25 up to the nearest whole credit)

### Billing Table

| Session duration | Credits charged |
|-----------------|----------------|
| 1–15 min | 12 credits |
| 16–30 min | 24 credits |
| 31–45 min | 36 credits |
| 46–60 min | 48 credits |
| 1h 1min–1h 15min | 60 credits |

### Cost/margin structure
- Sean's labor cost (per-call contractor): ~$20/hr
- SOCIII billing rate: $45/hr
- **Gross margin: ~56%** ($25 per hour retained)
- Even 1 session/day = ~$330/month contribution before overhead

---

## 4. Consent Gate — Critical

**No human support session opens without explicit credit consent from the user.**

When the escalation triggers in chat, Alex does NOT immediately say "I've notified the team." Instead, the flow is:

1. **Escalation detected** (keyword or LLM intent) → Alex responds:
   > "I can connect you with the SOCIII support team. Human support is billed at **12 credits per 15 minutes** from your credit balance (you currently have **[N] credits**). Shall I loop them in?"

2. **User confirms** → Alex responds: "Done — someone will follow up within 4 hours." Escalation fires. Session opens in `supportSessions/`.

3. **User declines or doesn't respond** → Alex continues trying to resolve, offers docs link, no session opened, no credits touched.

**Exception: Subsidized tenants.** For tenants with `billing.humanSupportSubsidized: true`, the consent gate is bypassed — Alex says "I'm looping in the support team" immediately, no credit mention. The escalation still logs to `supportSessions/` for the record.

**Exception: Zero-credit tenants.** If the tenant has fewer than 12 credits, the consent gate shows a credit warning instead:
> "You don't have enough credits for human support (need 12, have [N]). Add credits at [billing link], or I can keep trying to help you here."

---

## 5. Session Lifecycle

```
User: "I can't log in"
  → Escalation regex fires in ChatPanel (frontend, pre-LLM)
  → OR: Alex detects intent (LLM-side, for nuanced phrasing)
  → Consent gate shown (credits balance + confirmation)
  → User confirms
  → 12 credits atomically deducted from tenant's spendable balance (real hold, not bookkeeping)
  → supportSessions/{id} created: status=open, creditsReserved=12
  → Email + SMS fired to Sean (who routes to Manpreet/Vishal)
  → SLA clock starts (4-hour response target)

Manpreet/Vishal resolves the issue:
  → Admin panel: "Close ticket" + log actual minutes
  → Backend: compute ceil(minutes/15) × 12 credits
  → Debit tenant credit balance
  → Release the 12-credit hold; apply actual charge
  → supportSessions/{id}: status=closed, creditCharged=N, resolvedBy, resolvedAt, minutesLogged

Tenant sees in Billing:
  → "Human support — 23 min — July 19, 2026 — 24 credits"
```

---

## 6. Subsidized Tenants

Tenant-level flag in Firestore:
```
tenants/{tenantId}:
  billing.humanSupportSubsidized: true
  billing.humanSupportSubsidizedUntil: <date>  // optional expiry
  billing.humanSupportSubsidizedReason: "Makai pilot"
```

**Accounts that get this flag at launch:**
- Makai School of Nursing (Ruthie Clearwater's tenant)
- University of Hawaii (when provisioned)
- Sean's DEMO SPACE tenant (`ws_1781920656122_tl9dhn`)
- Any `demo-*` tenant

**What "subsidized" means:** Sessions are logged, email+SMS still fire, SLA still applies — but **zero credits are charged**. The `creditCharged` field is 0. Sean absorbs the labor cost as a business development expense.

**Expiry — requires affirmative action, not passive lapse:** `humanSupportSubsidizedUntil` triggers:
- **30 days before:** Notification to Sean — extend, convert to paid, or negotiate institutional pricing.
- **7 days before:** If Sean has not acted, a second notification. The flag does **not** auto-expire silently.
- **On the expiry date, if Sean has not acted:** The system holds — it does not flip to paid. It sends a blocking alert to Sean and marks the tenant `billing.humanSupportSubsidyExpired: true`. The consent gate for that tenant shows: "Support is temporarily paused — contact your SOCIII account manager." No student ever hits a surprise billing prompt they've never seen before. The subsidy cannot lapse without Sean's deliberate decision.
- **Tenant-facing notice:** 7 days before expiry, if the tenant is transitioning to paid, a notice is sent to the tenant admin (Ruthie, or whoever the workspace owner is): "Your supported access to human support expires on [date]. After that date, human support is billed at 12 credits per 15 minutes."

---

## 7. Data Model

### `supportSessions/{sessionId}`
```js
{
  tenantId: string,
  userId: string,
  userEmail: string | null,
  workerSlug: string | null,       // which worker they were in
  persona: string | null,          // demo persona if applicable
  triggerMessage: string,          // what the user said
  triggerMethod: "regex" | "llm",  // how escalation was detected
  status: "open" | "in_progress" | "closed" | "cancelled",
  subsidized: boolean,
  creditsReserved: number,         // 12 credits atomically deducted from spendable balance at open — this is a REAL hold, not a bookkeeping field. Spendable balance decreases by 12 the moment a session opens, preventing spend-down during the session and the arrears scenario RT2 describes.
  creditCharged: number,           // final charge written at close: hold released, actual usage debit applied (may be less than 12 if session was very short — min 12 regardless)
  minutesLogged: number | null,    // set at close
  openedAt: Timestamp,
  respondedAt: Timestamp | null,   // when agent first replied
  closedAt: Timestamp | null,
  resolvedBy: string | null,       // "manpreet" | "vishal" | "sean"
  resolutionSummary: string | null,
  reopenedFrom: string | null,     // parent sessionId if this is a reopen (chain for audit)
  skipCharge: boolean,             // auto-set true when created via reopen; close-ticket form skips debit if true
  slaMet: boolean | null,          // computed off respondedAt, NOT closedAt (fast-response-slow-resolution must not count as SLA miss)
}
```

### `tenants/{tenantId}.billing`
```js
{
  humanSupportSubsidized: boolean,
  humanSupportSubsidizedUntil: Timestamp | null,
  humanSupportSubsidizedReason: string | null,
}
```

---

## 8. Admin Tooling Required

### Minimum viable admin panel (before first paid session):
1. **Open sessions list** — tenant, user, trigger message, time open, SLA status (green/red)
2. **Close ticket form** — "minutes logged" input + resolver name + optional resolution note → triggers credit debit
3. **Subsidized tenant toggle** — set/unset `billing.humanSupportSubsidized` flag + expiry date

### Nice to have (v2):
- SLA dashboard — % sessions responded within 4 hours
- Cost-per-session analytics — blended labor cost vs. credit billed
- Auto-escalation to Sean if no agent response in 4 hours

---

## 9. Consent Gate UX — Sketch

When escalation intent is detected, Alex's response in chat:

> **Connecting you with a person**
>
> The SOCIII support team can help with login issues, account access, and platform problems. Human support costs **12 credits per 15 minutes**.
>
> Your balance: **[N] credits**
>
> [ Connect me → ] [ Keep trying with AI ]

This is a structured card (like the existing worker-subscribe card), not a plain-text response. The "Connect me →" button fires the actual escalation.

---

## 10. Open Items (Pre-Launch)

| Item | Status | Owner | Blocker? |
|------|--------|-------|---------|
| Consent gate UI (card in ChatPanel, not just text) | Not built | Build backlog | Yes — before first paid session |
| Credit balance lookup at escalation time | Not built | Backend | Yes — needed for consent gate |
| Admin "close ticket" panel | Not built | Build backlog | Yes — before first paid session |
| Credit debit at ticket close | Not built | Backend | Yes |
| `billing.humanSupportSubsidized` flag on Makai/UH | Not set | Sean / DB seed | Yes — before Makai goes live |
| SLA notification (SMS to Sean if 4-hour clock expires) | Not built | Backend | Nice to have |
| Credit top-up link in zero-credit warning | Exists (billing page) | — | No |

---

## 11. Red Team

### RT1: User doesn't know they're being charged before the session opens
**Risk:** Current implementation fires escalation and shows "I'm looping in the support team" with no credit disclosure. User gets a charge they didn't consent to.
**Severity:** High — potential dispute, chargeback, trust damage
**Fix required:** Consent gate (§4, §9) must be built before first paid session goes live. The current "I'm looping in the support team" response is correct for subsidized tenants only. For paid tenants, it must be replaced with the consent card. This is a build blocker, not a nice-to-have.
**Current state:** Escalation is live but no billing is wired yet — so no one is being charged today. The window to fix this is before credit debit is implemented.

### RT2: Insufficient credits when escalation fires
**Risk:** Tenant has 5 credits. Escalation triggers. We reserve 12 credits but they don't have 12. Do we block, overdraft, or waive?
**Fix:** Hard block — show zero-credit warning message instead of connecting. Never go into arrears. Consistent with CODEX 36 Rule 5 (no invoicing, no credit terms from SOCIII).

### RT3: Manpreet/Vishal are per-call contractors — their cost is variable
**Risk:** $20/hr estimate assumes steady availability. Per-call contractors may charge more for urgent/off-hours calls, or become unavailable. Labor cost could exceed $20/hr.
**Fix:** Price buffer is $45 − $20 = $25/hr gross. Even at $30/hr labor cost, SOCIII retains $15/hr margin. At $40/hr labor cost the margin collapses. Need a rate card agreement with Manpreet/Vishal before pilot scales. Add to Open Items.

### RT4: Escalation spam — user triggers multiple sessions
**Risk:** Curious user hits escalation multiple times, burning credits or generating multiple tickets for the same issue.
**Fix:** Rate limit: one open session **per user** (keyed on `userId`, not `tenantId`) at a time. If the same user already has an open session, the consent gate shows "You already have an open support session — the team is working on it" and does not open a second.

**Scoping note — per-user, NOT per-tenant:** Makai School of Nursing is one tenant (`tenantId`) with 65+ student users. A per-tenant rate limit would mean Student B cannot escalate while Student A has an open ticket, even for a completely unrelated issue. That inverts the goal. The `userId` field is already on every `supportSessions` doc — the check is `WHERE userId == caller AND status == "open"`, not `WHERE tenantId == tenant AND status == "open"`. This distinction must be enforced in code, not just described in prose.

### RT5: Time logging is manual — no verification mechanism
**Risk:** Manpreet logs 30 minutes but only worked 5. SOCIII bills the tenant 24 credits for a 5-minute fix.
**Fix (process):** Require a resolution summary that describes what was done. If the summary doesn't justify the logged time, Sean reviews. Build an "anomaly flag" for sessions where logged time > 20 minutes — these go to Sean for spot-check before credit debit fires.
**Fix (structural):** v2 — actual session timer starts when agent opens the ticket and stops when they click Close. Logged time is system-tracked, not self-reported. Manual override still available but leaves an audit trail.

### RT6: SLA promise "within a few hours" is undefined
**Risk:** "A few hours" could be interpreted as 1 hour by some users, 8 hours by others. If Manpreet is offline overnight and a Makai student escalates at 11pm Hawaii time, no one responds until morning — that could be 10+ hours.
**Fix:** Define the SLA explicitly in the consent gate: "Response within 4 business hours (Mon–Fri, 8am–6pm Pacific)." For Makai: Hawaii is 2–3 hours behind Pacific. Students escalating in the evening may get a next-morning response — acceptable for non-urgent platform issues, not acceptable for login issues blocking coursework. Add an emergency path: if the session is flagged "urgent/login-blocked," SMS Sean directly regardless of business hours. Tier the SLA.

**`slaMet` definition:** Computed off `respondedAt` (first agent reply timestamp), NOT `closedAt`. A session where the agent responded in 2 hours but took 3 days to fully close is an SLA success. A session closed in 30 minutes but with no first response for 5 hours is an SLA miss. Using `closedAt` would silently miscount both. The SLA clock runs from `openedAt` to `respondedAt`, in business hours only.

### RT7: Demo tenants have no credit balance — billing backend would fail
**Risk:** `demo-*` tenants have no Firestore credit record. If billing code tries to debit a nonexistent balance, it throws.
**Fix:** The `subsidized: true` path skips all credit operations. The subsidized check must happen BEFORE any credit lookup. Never run consent gate for `demo-*` tenants. Alex just says "I'm looping in the support team" with no credit mention — the session logs but no credit path is touched.

**Implementation note — prefix check in code, not manual flag:** The `demo-*` subsidy bypass must be a code-level prefix check (`tenantId.startsWith("demo-")`), not a requirement that someone remembered to set `billing.humanSupportSubsidized: true` on every demo tenant. If it relies on a manually-set flag, every newly created demo tenant is a potential RT7 crash until someone remembers to flag it. The prefix check closes this unconditionally. The manual `humanSupportSubsidized` flag is for named institutional accounts (Makai, UH); the prefix check is for the demo fleet.

### RT8: Consent gate creates friction that discourages legitimate escalation
**Risk:** A student who genuinely can't access their account sees "12 credits" and backs off, choosing to struggle alone rather than ask for help. This is a support failure even if it avoids a billing event.
**Fix:** Reassurance-first framing applies **universally** — not just for subsidized tenants. A user in distress (login-blocked, confused, stuck) should never feel like the platform is making them solve a billing problem before getting help. The credit disclosure stays, but it does not lead.

Universal consent copy:
> "The SOCIII support team can help with this. **[ Connect me with support ]**
> _(Human support is billed at 12 credits per 15 minutes from your account's credit balance.)_"

For subsidized tenants, replace the parenthetical with:
> _(Support is covered for your account — no credits charged.)_

The action button leads. The billing line is small and secondary. A user who clicks without reading the fine print has still made an informed decision — the disclosure is present. A user who is scared off by the fine print without seeing the button is a support failure we can avoid with this layout.

### RT9: Credit debit fires before the user considers the session resolved
**Risk:** Agent closes the ticket after 15 minutes but the issue wasn't resolved. User gets charged and is still stuck.
**Fix:** At ticket close, system sends user a chat message: "The SOCIII support team has marked this session complete ([N] credits charged). Did this resolve your issue? [ Yes ] [ No — reopen ]" If user says No within 24 hours, session reopens. No additional credit charge for the reopened session (it's the same issue). Reopened sessions are flagged for Sean review.

**Data model enforcement:** The "no additional charge on reopen" policy must be enforced structurally, not relied on human memory. Required changes to the session doc and close-ticket flow:

```js
supportSessions/{sessionId}:
  reopenedFrom: string | null   // parent session ID if this is a reopen
  skipCharge: boolean           // auto-set true when session is created via reopen
```

When a session is created as a reopen: `skipCharge: true` is set automatically. The admin close-ticket form checks `skipCharge` before running the credit debit — if `skipCharge === true`, the debit is skipped entirely and `creditCharged: 0` is written. No manual memory required. The `reopenedFrom` field creates a chain for audit purposes.

### RT10: "Support" scope creep — users call in for feature requests or platform feedback
**Risk:** User escalates to say "I wish this feature existed" or "can you build X?" Manpreet/Vishal spends 20 minutes understanding the request. Tenant gets billed for a conversation that was really a product feedback call.
**Fix (process):** Manpreet/Vishal's first triage question: "Is this a platform issue preventing you from working, or a feature/product request?" Feature requests are redirected to a feedback form, session is closed at 0 minutes logged (no charge), feedback is routed to Sean separately.
**Fix (structural):** The consent gate copy should scope the service: "Human support is for login issues, account access, and platform problems — not for feature requests or product questions." This sets expectations before the session opens.

---

## 12. What This Is Not

- **Not a subscription support tier.** This is metered — you pay when you use it, not as a fixed monthly add-on.
- **Not a replacement for AI support.** Tier 0 (Alex) handles the vast majority of requests. Human support is the exception, not the default path.
- **Not a SaaS help desk product.** SOCIII doesn't build or resell support software. This is a service line backed by real people, billed through the existing credit infrastructure.
- **Not a promise of 24/7 availability.** SLA is 4 business hours. Emergency login-blocked cases get out-of-hours SMS to Sean, but this is a goodwill path, not a contractual guarantee.
