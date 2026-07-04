# CODEX Surface 18 — Alex Operating Feed (living attention layer)

**Status:** 🔴 build now · **Owner:** Sean · **Created:** 2026-07-03 · **Red-teamed:** 2026-07-03 (CODE + Claude.ai)
**Replaces:** static `userPriorities/{uid}` project tracker
**Bar:** Alex surfaces what needs attention without being asked. Sean glances at the right panel, sees the real state of the business, knows what to act on today. No list management required.

---

## Why the old tracker failed

`userPriorities/{uid}` was a static list Alex only wrote when Sean told it what was on his plate. Sean had to remember to brief Alex. Alex had no way to learn what was actually pending. Done/not-done required Sean to declare it explicitly. That's Google Tasks with extra steps — not intelligence. We tried to fix it three times. The architecture was wrong, not the implementation.

---

## The model: Alex is the writer, Sean is the reader

The feed is a Firestore real-time collection Alex manages autonomously. Sean never types into it.

**Alex writes when:**
- Morning scan finds an email that implies action (payment due, signature pending, reply expected)
- A sibling worker surfaces a deadline or stalled item
- Alex learns something actionable during chat ("I have a call with Kent Thursday")
- A health check fails (worker down, Gmail auth expired, payment card declined)
- A completion event arrives (eSign webhook, Stripe payment confirmation)

**Sean sees:**
- What needs attention now, grouped by severity then horizon
- Where each signal came from (email / which worker / system health)
- How long it's been sitting
- What action is available right now (not just what the item is)
- Resolve and Snooze buttons

**Alex resolves when:**
- A webhook event confirms completion (idempotently — resolving an already-resolved item is a no-op)
- Sean says "done" or clicks Resolve
- Worker/system recovers from a health failure (recovery timestamp in `resolvedEvidence`)
- Item exceeds the TTL → auto-archives

---

## Data model

**Collection:** `alertFeed/{uid}/items/{itemId}`

Consistent with platform invariant: records are never deleted. Status changes update the same doc in place. Archived items stay in Firestore but are not rendered.

```
{
  id:               string,
  uid:              string,         // owner — required
  tenantId:         string,         // workspace scope — required, enforced in rules
  title:            string,
  detail:           string,         // one-liner context
  actionHint:       string | null,  // "Draft reply ready" / "Re-auth required" / "Approve batch"
  source:           "email" | "worker" | "alex_chat" | "cron_scan" | "system_health",
  sourceWorker:     string | null,
  sourceRef:        string | null,  // Gmail messageId or Firestore docId — dedup key
  severity:         "red" | "yellow" | "green",  // RED bypasses 12-item cap
  horizon:          "today" | "this-week" | "next-week" | "waiting_external" | "snoozed" | "someday",
  priority:         "high" | "medium" | "low",
  status:           "active" | "snoozed" | "resolved" | "archived",
  snoozedUntil:     timestamp | null,  // stored in UTC, displayed in Hawaii time (UTC-10)
  resolvedAt:       timestamp | null,
  resolvedBy:       "alex" | "user" | "auto" | null,
  resolvedEvidence: string | null,  // "eSign completed 2026-07-05T14:32:00-10:00; was down 47 min"
  createdAt:        timestamp,
  updatedAt:        timestamp,
}
```

**Key model decisions:**
- `waiting_external` and `snoozed` are separate horizon values — items blocked on someone else vs. items deliberately deferred are fundamentally different states
- `severity: "red"` items bypass the visible cap — a broken worker is always more important than a pending invoice
- `actionHint` surfaces what Sean can do right now, not just what the item is
- All timestamps are stored UTC, all display is Hawaii time (UTC-10) — consistent in Phase 1, not deferred

Security rules: reads and writes require `request.auth.uid == resource.data.uid`. Scanner writes as service account, passes `uid` explicitly.

---

## What Alex scans

### Email (3 inboxes via `searchEmailsAllAccounts`)

| Query | What it finds | Severity |
|---|---|---|
| `is:unread label:inbox` | Unread items waiting for attention | yellow |
| `subject:invoice OR subject:payment OR subject:receipt` | Financial action | yellow |
| `subject:"action required" OR subject:signature OR subject:sign` | Pending signatures | yellow |
| `subject:suspended OR subject:suspension OR subject:"failed payment" OR subject:"card declined"` | Service/payment crisis | **red** |
| `from:donotreply@hellosign.com OR from:docusign.com` | eSign status | yellow |
| `is:unread older_than:2d` | Emails ignored >2 days | yellow |

### System health (first-class source — not an afterthought)

Health checks run on their own schedule, independent of the morning scan:

| Check | Frequency | Failure threshold | Feed action |
|---|---|---|---|
| Chat availability (canary ping) | Every 15 min (existing) | 2 consecutive failures | RED item immediately, SMS/Telegram |
| Worker function response | Every 60 min | 2 consecutive failures | RED item for that worker |
| Gmail OAuth token validity | Every 60 min | Token refresh fails | RED item with re-auth deep link in `actionHint` |
| Morning scan itself | After each run | Any exception thrown | Writes RED system_health item: "Morning scan failed at 7:02 AM — check logs" |

Health check items:
- `source: "system_health"` — distinct from email/worker/cron
- `severity: "red"` always — bypass the 12-item visible cap
- Auto-resolve when system recovers, with `resolvedEvidence: "Recovered at 14:32 HST; was down 47 min"`
- Smoke test, not ping — verify the function returns a correct response, not just HTTP 200

### Worker data (Firestore reads, no LLM)

| Source | Query | Severity |
|---|---|---|
| Accounting | Bills due within 14 days, status ≠ paid | yellow |
| Accounting | Bill due <48h or overdue | **red** |
| Contacts | Last contact >7 days, no closedAt | yellow |
| IR | Investor docs with status = reply_needed | yellow |
| Patents | deadlineDate within 60 days | yellow |
| Patents | deadlineDate within 7 days | **red** |
| RE | Closing dates within 30 days | yellow |
| eSign | Pending signatures >72h | yellow |

### Dedup before every write

1. `sourceRef` exact match + `status in [active, snoozed]` → skip
2. Title substring match >80% within 7 days → skip, bump `updatedAt` instead
3. Resolved items don't block re-surfacing if issue recurs after 14 days
4. Resolve operations are **idempotent** — resolving an already-resolved item is a no-op, not an error (critical for webhook retry safety)

---

## Scan schedule

| Trigger | What runs |
|---|---|
| 7:00 AM Hawaii time (UTC-10) daily | Full scan: email + all worker collections + calendar |
| 7:00 PM Hawaii time daily | Email-only: check replies on active `waiting_external` items |
| Every 15 min (existing canary) | Chat health check → feed if failed |
| Every 60 min | Worker function health + Gmail OAuth health |
| Alex chat `push_alert` tool | Immediate, from conversation context |
| eSign webhook | Idempotent auto-resolve of matching item |
| Stripe webhook | Idempotent auto-resolve of matching payment item |
| Morning scan exception | Writes system_health RED item to feed |

---

## Alex tools (replace `set_priorities`)

**`push_alert`**
```json
{ "title": "...", "detail": "...", "actionHint": "...", "severity": "yellow", "horizon": "today", "priority": "high", "sourceWorker": "chief-of-staff" }
```

**`resolve_alert`** — idempotent; resolving an already-resolved item is a no-op
```json
{ "itemIds": ["abc123"], "resolvedEvidence": "Sean confirmed in chat" }
```

**`snooze_alert`** — stored UTC, displayed Hawaii time
```json
{ "itemId": "abc123", "snoozedUntil": "2026-07-10T17:00:00Z" }
```

The existing `set_priorities` tool is retired after Phase 1 ships.

---

## Feed UI (replaces static PROJECT TRACKER box)

**Data:** Firestore real-time listener on `alertFeed/{uid}/items` where `status in [active, snoozed]`, ordered by `severity desc, updatedAt desc`

**Cap model (UI decision, never a data decision):**
- 12 items visible by default
- RED severity items always shown regardless of cap — they are never hidden
- When cap hit: "3 more items — Show all" with count badge
- Items are never silently dropped from Firestore; cap is display-only

**Groups:**
1. RED — always expanded, shown first
2. Today — expanded
3. This Week — expanded
4. Waiting on Others (`waiting_external`) — collapsed by default
5. Snoozed — collapsed, shows "wakes at [time]"

**Each card:** severity dot (red/yellow/green), source badge (system / email / worker name), relative time in Hawaii timezone, title, `actionHint` line (e.g. "Draft reply ready" / "Re-auth required" / "Approve batch"), [Resolve] [Snooze ▾]

**Snooze options:** 1 hour / Tomorrow 7 AM HST / Next Monday 7 AM HST — all in Hawaii time

**Resolved items:** fade out, move to collapsed "Resolved" section (last 7 days)

**Offline/airplane mode:** When Firestore is unreachable, show last known state with "Last updated X min ago" banner. Never blank panel. Sean will check this at 35,000 feet.

**Empty state:** "No new signals — next scan at 7 AM HST" — not "Tell Alex what's on your plate"

---

## Build tasks (Phase 1)

- [ ] **F1** — Firestore security rules for `alertFeed` + indexes (uid+tenantId+severity+status+updatedAt)
- [ ] **F2** — `alertFeedRefresh` Cloud Function: email scan + worker data scan + dedup + system health
- [ ] **F3** — Wire `cosWorkerMorningRun` + `cosWorkerEveningRun` to call `alertFeedRefresh`; scan exceptions write RED system_health item to feed
- [ ] **F4** — Health check schedule: Gmail OAuth check every 60 min; worker function smoke test every 60 min; failures write RED immediately
- [ ] **F5** — Alex tools: `push_alert`, `resolve_alert` (idempotent), `snooze_alert` (Hawaii time) — retire `set_priorities`
- [ ] **F6** — Feed UI: severity groups, cap-with-count, offline banner, `actionHint` line on cards, Hawaii time throughout
- [ ] **F7** — eSign + Stripe webhook handlers: idempotent auto-resolve with recovery timestamp
- [ ] **F8** — REST endpoints: `POST /v1/alert:push`, `POST /v1/alert:resolve`, `POST /v1/alert:snooze`, `GET /v1/alert:list`
- [ ] **F9** — Retire `userPriorities/{uid}` from UI (keep Firestore doc 30 days, then delete)

## Phase 2
- Worker event bus: workers push to `alertFeed` via `/v1/alert:push` (high-priority items only; medium/low batch to morning scan)
- Email auto-resolve (high-confidence: same-thread, exact sender match — webhook-only in Phase 1)
- Phase 3 review UI: log every auto-resolve with evidence for Sean's weekly spot-check (builds false-resolve rate dataset needed before Phase 3 opens)

## Phase 3 (gate: 30 days P1 + measured false-resolve rate from Phase 2 review UI — not just zero-assertion)
- Pattern coaching ("you've deferred this 3 times")
- Autonomous actions within RAAS-governed guardrails (separate rule file per action type, reviewed before shipping)
- Business intelligence layer: investor campaign performance, worker usage, growth metrics proactively surfaced

---

## RED TEAM (v2 — incorporating Claude.ai session review 2026-07-03)

**RT1 — Signal-to-noise collapse** *(most likely kill)*
**Mitigation:** Hard cap 12 visible items (UI, not data). RED items always shown. "N more hidden — Show all" badge. Scanner justifies every write — low-confidence → discard. Morning cron logs considered vs. written ratio; <20% write = tuning needed.

**RT2 — Webhook reliability + resolve idempotency** *(underweighted in v1)*
Stripe webhooks fail, retry, arrive out of order. A payment webhook fires, Alex resolves, webhook retries, Alex tries to resolve again. Does it create a new item or error?
**Mitigation:** Resolve operations are explicitly idempotent — resolving an already-resolved item is a no-op with HTTP 200. Creation dedup covers inbound; resolve idempotency covers outbound. Both paths independently safe.

**RT3 — Tenant boundary leak** *(catastrophic)*
**Mitigation:** Every item requires uid AND tenantId. Security rules enforce both. Scanner passes tenantId explicitly. 2-workspace test before shipping.

**RT4 — Duplicate item loop**
**Mitigation:** Dedup on `sourceRef` (Gmail messageId). O(1) query before write.

**RT5 — Gmail auth expiry — silent feed death** *(missing from v1)*
OAuth tokens expire. If Gmail connection lapses, the morning scan silently fails, the feed goes quiet. Sean doesn't know if nothing is happening or if Alex is blind.
**Mitigation:** Gmail OAuth health check every 60 min. Token refresh failure → immediate RED `system_health` item with `actionHint: "Reconnect Gmail"` and a re-auth deep link. Feed surfaces the blindness rather than hiding it.

**RT6 — Stale items rot the feed**
**Mitigation:** 30-day TTL → auto-archive. 60-day TTL for `waiting_external`. Daily cleanup job.

**RT7 — Cost spiral from LLM scanning**
**Mitigation:** Phase 1+2 scanner is rule-based only. No LLM in scanner. Phase 3 gated on cost model validation.

**RT8 — Autonomous action scope creep**
**Mitigation:** P1 and P2 = read + propose only. Phase 3 requires separate RAAS rule file per action type + measured false-resolve rate from Phase 2 review UI.

**RT9 — Worker noise explosion in Phase 2**
**Mitigation:** Workers push high-priority only. Medium/low batch to morning scan. Alex is editorial layer.

**RT10 — Silent degradation looks like health** *(missing from v1 — most operationally dangerous)*
If a worker goes down, the feed goes quiet. Sean can't distinguish "nothing to surface" from "scanner is blind."
**Mitigation:** System health is a first-class feed source with its own check schedule (not waiting for 7am). Two consecutive missed health checks → RED item immediately. Health items bypass cap. Scanner failures write to the feed itself. The feed is the error surface for everything.

**RT11 — Offline / airplane mode blank panel** *(missing from v1)*
Sean is a pilot. He will check this at 35,000 feet.
**Mitigation:** Firestore real-time listener falls back to last cached state on disconnect. Feed shows "Last updated X min ago" banner. Never blank. Cached state is read-only — no resolve/snooze while offline (button disabled with tooltip).

**RT12 — 12-item cap silently hides urgent items** *(v1 cap was a data decision)*
If 15 things are urgent, 3 silently don't appear. Sean thinks he's seeing everything.
**Mitigation:** Cap is UI-only — never drop from Firestore. RED severity always visible regardless of cap. Non-red items over cap show "N more — Show all" badge. The word "silently" must never apply to this feature.

**RT13 — Phase 3 gate is unmeasurable** *(v1 said "zero false-resolves" — unprovable)*
"Zero false-resolves" as a Phase 3 gate is an assertion, not a measurement. If Sean doesn't know what he's not seeing, the rate can't be calculated.
**Mitigation:** Phase 2 includes a review UI: every auto-resolve is logged with evidence, surfaced in a weekly digest for Sean's spot-check. This builds the false-resolve rate dataset. Phase 3 opens when the measured rate is below a threshold (TBD, probably <2% over 30 days), not when someone asserts zero.

---

## Sign-off gate (Phase 1 ships when all pass)

- [ ] Feed shows 3+ real items from morning scan without Sean prompting
- [ ] `push_alert` from Alex chat appears in feed within 2 seconds
- [ ] Resolve and Snooze buttons work; resolved item exits active list immediately
- [ ] Resolving an already-resolved item returns success (idempotency confirmed)
- [ ] Gmail auth failure surfaces as RED item with re-auth link within 60 min
- [ ] Worker function failure surfaces as RED item within 2 consecutive check intervals
- [ ] Morning scan exception writes RED system_health item (not silent failure)
- [ ] 2-workspace test: zero items cross tenant boundary
- [ ] 12 non-red items visible + "N more" badge when over cap; RED items always shown
- [ ] Feed shows cached state offline with "Last updated X ago" banner (not blank)
- [ ] Snooze "tomorrow morning" fires at 7:00 AM Hawaii time
- [ ] `set_priorities` UI and tool fully retired, no orphaned code path
