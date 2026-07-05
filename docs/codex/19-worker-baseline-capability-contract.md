# CODEX Surface 19 — Worker Baseline Capability Contract

**Status:** 🟡 spec v2 (red-teamed 2026-07-05) · **Owner:** Sean · **Created:** 2026-07-05
**Affects:** All published workers (spine + creator-built)
**Bar:** A creator publishes a worker and it is immediately workspace-aware — it can push to the Operating Feed, access shared memory, know its sibling workers, and be discovered by Alex with real depth. Creators never configure any of this. The platform provides it automatically.

---

## The problem

Alex (COS) and spine workers were built simultaneously, so cross-worker intelligence got wired into the COS session builder — the one place we were already touching. The result: a structural tier gap.

**Tier 1 — Alex (COS):**
- Full cross-workspace context at session start (all workers, all integrations, Operating Feed, Shopify, Gmail)
- Full tool set: push_alert, resolve_alert, snooze_alert, get_campaigns, get_shopify_orders, recall_notes, save_note, propose_email, etc.
- Knows what every worker found (via catalog + canvas output injection)

**Tier 2 — Spine workers (HR, Marketing, RE, etc.):**
- Domain-scoped context — knows its own data well
- No Operating Feed access from within the worker chat
- No sibling awareness ("check the Accounting worker for billing context")
- No shared memory access (recall_notes/save_note are COS-only)
- Alex knows about them with only catalog-entry depth

**Tier 3 — Creator-built workers:**
- Same isolation as Tier 2, but worse: Alex's discovery is even shallower because creator catalog entries are minimal at publish time
- No baseline tool set inherited from the platform
- Cannot push urgent findings to the Operating Feed
- Cannot tell a user "also check your Marketing worker"

**What this means in practice:**
- Elise's DPP worker finds a battery with an expired compliance date → cannot push a RED alert to the Operating Feed → Sean sees it only if he happens to open that worker
- A creator-built HR worker detects an overdue performance review → no way to surface it
- Alex recommends Elise use the DPP worker, but cannot tell her what the DPP worker found last week
- Creators building on SOCIII get less platform value than the marketing promises

---

## The contract: what every published worker inherits

The "baseline capability contract" is a standardized context block + tool set injected into every worker's chat session **at session start only — not re-injected each turn.** Creators never configure it. The platform provides it automatically at publish time.

### Baseline context block (injected once at session start)

```
WORKSPACE CONTEXT (injected by platform — do not fabricate):
- Persona: {personaName} ({personaType})
- Sibling workers in this persona (up to 5, most-recently-active first, inactive >30 days omitted):
  • {workerName} ({workerSlug}) — {purpose_one_liner} | last active: {X days ago}
- Recent Operating Feed signals from this worker (last 3 unresolved, if any):
  • {alert title} [{severity}] — {X days ago}
- Shared workspace notes (last 3, max 200 chars each):
  • {note text truncated to 200 chars}

PLATFORM TOOLS AVAILABLE: push_alert, recall_notes, save_note, get_sibling_summary.
Use push_alert proactively when you find something urgent. Surface push_alert calls
visibly in chat — never execute them silently. Do NOT surface findings only in
chat — push them to the Operating Feed so they're visible outside this conversation.
```

**Token budget:** Baseline block is capped at ~500 tokens total (enforced by the session builder, not the LLM). If the block would exceed 500 tokens, truncate sibling list to 3, notes to 1, alert history to 1. Log a warning when truncation occurs so we can tune the cap.

### Baseline tool set (every worker chat gets these)

**`push_alert`** — identical to COS version, same backend
- Worker's `source_label` is validated server-side against its registered slug at write time — prevents spoofing (see RT10)
- Alert appears in Operating Feed under the worker's registered label
- Hard rate limit: max 2 pushes per minute per worker slug; max 10 *unresolved* alerts per worker slug at any time
- When the 10-alert cap is reached: subsequent push attempts are dropped, ONE meta-alert fires: "{workerName} has 10+ unresolved items — review needed"
- 7-day auto-staleness: alerts uninteracted-with for 7 days move to `archived` (not deleted — append-only) and no longer count toward the 10-alert cap, freeing it for new genuine findings
- Every push_alert call must be surfaced visibly in the worker's chat thread

**`recall_notes`** — read shared workspace memory
- Scoped by `tenantId` — always
- Never returns notes from a different tenantId even if called with an explicit tenantId override
- Prevents workers from checking if Alex already flagged something

**`save_note`** — write to shared workspace memory
- Notes are sanitized before storage: stripped of instruction-pattern text (`ignore prior`, `system:`, `[INST]`, etc.) to prevent prompt injection via shared surfaces (see RT9)
- Notes are also sanitized at injection time — the session builder applies the same strip before embedding in any other worker's or Alex's context

**`get_sibling_summary`** — reads `lastRun` docs for sibling workers
- Data source: `creators/{slug}/lastRun.canvasSummary` — the same doc `lastRun` pipeline writes after every canvas render (not a separate catalog field, not publish-time-only)
- Filters by `tenantId` AND `personaSlug` — never one without the other
- Returns: name, slug, last_active, canvasSummary (50-word max, template-generated — not LLM paraphrase)
- If `lastRun` doc missing (worker never rendered): returns `last_active: never` with no summary — does not fabricate

### What the contract explicitly does NOT include

- Propose/send email independently — workers propose through Alex or the user
- get_campaigns, get_shopify_orders — commerce tools stay COS-only; workers reference data, don't query commerce systems directly
- Cross-persona access — Business persona workers cannot see Personal persona workers (Vault isolation rule)
- Autonomous resolution of Operating Feed alerts — workers push only; resolution requires user confirmation or Alex

---

## COS deep discovery (what Alex learns about creator workers)

Currently Alex knows a creator worker exists via its catalog entry: name, description, slug. That's it.

**What Alex needs at session start:**
1. **Last canvas output digest** — from `creators/{slug}/lastRun.canvasSummary` (template-generated, not LLM)
2. **Last active timestamp** — from `creators/{slug}/lastRun.renderedAt`
3. **Alert history** — count + severity breakdown of alerts pushed in last 30 days
4. **Declared data sources** — from the spec `emits` and `accepts` fields on the catalog entry

**Result:** Alex can say "Your DPP worker last ran 4 days ago and pushed 2 amber alerts about battery compliance dates. Want me to open it and check?" instead of "You have a DPP worker available."

---

## lastRun write protocol

`lastRun` is written each time a worker's canvas renders. Because two sessions of the same worker can render concurrently, writes must be transactional:

```
// CORRECT — transactional increment
db.runTransaction(async (tx) => {
  const ref = db.doc(`creators/${slug}/lastRun`);
  const snap = await tx.get(ref);
  const prev = snap.exists ? snap.data() : {};
  tx.set(ref, {
    canvasSummary: templateSummary(payload),   // template-generated, never LLM
    renderedAt: serverTimestamp(),
    alertsPushed: (prev.alertsPushed || 0) + newAlertsThisRender,
  });
});

// WRONG — last-write-wins drops concurrent increments
db.doc(`creators/${slug}/lastRun`).set({ alertsPushed: N });
```

`canvasSummary` is generated from the canvas `payload` fields (structured data) using a deterministic template: `"Found {N} items. Top result: {first_item_title}. Status: {status}."` — never an LLM paraphrase.

---

## Fail behavior for workerSessionBuilder

If `workerSessionBuilder` cannot read the catalog entry (Firestore hiccup, malformed doc, network timeout):

- **Fail-closed on baseline injection** — start the worker chat without the baseline block rather than injecting a partial or stale block
- **Log the failure** with worker slug, tenantId, error class, and timestamp — this feeds the injection success/failure rate metric (W5)
- **Do NOT surface the error to the user** — the worker still starts; it just has less context. The user experience degrades gracefully, not catastrophically.
- Injection failure rate monitored in `config/workerHealth.injectionFailures` — alerts if rate > 1% over 1 hour

---

## Sandbox publish changes

When a creator clicks Publish:

1. **Write `baselineCapabilities` flag to catalog entry** — boolean `true`, not a version string. The actual tool set is always the current platform version resolved at session start. Workers do not pin capability versions — forward-compat is automatic; backward-compat is handled via the deprecation protocol below.

2. **Write initial `lastRun` stub** — `{ canvasSummary: null, renderedAt: null, alertsPushed: 0 }`. Ensures `get_sibling_summary` returns "last_active: never" rather than a missing-doc error.

3. **Register `personaSlug`** on the catalog entry so `get_sibling_summary` can find siblings.

4. **Explicit consent checkbox on Publish step (S4):** The passive disclosure line ("Your worker includes shared memory and Operating Feed access") is insufficient given that a badly tuned worker gets unsupervised write-access to the user's Operating Feed. Replace with an explicit checkbox: "I understand this worker can write to the workspace Operating Feed and shared memory. I am responsible for its behavior." Publish is gated until checked.

---

## Deprecation protocol (addressing RT6 backward-compat)

When a baseline tool is renamed or removed:

1. The old tool name stays as a **no-op stub** in the tool registry for one full release cycle (minimum 30 days). It returns a deprecation message rather than an error: `"This tool has been renamed to {new_name}. Please update your worker."` — never a silent failure.
2. The **baseline instruction text** injected into worker system prompts is generated from the current tool registry at session-build time, not from a static string stored at publish time. So instruction text always reflects current tool names.
3. The **catalog entry** `baselineCapabilities` flag means "give this worker the current baseline" — it is never a spec of which specific tools to inject. The platform decides the tool set; the flag is just the on/off switch.

---

## Backfill/migration (new task B1)

Creator workers published before this spec ships will have no `baselineCapabilities` flag. Without a migration, early creators stay in Tier 3 indefinitely — the exact problem this spec closes.

**Migration:** A one-time admin script (`scripts/backfill-baseline-capabilities.js`) that:
1. Reads all `raasCatalog` entries with `source: "creator"` (or equivalent creator flag)
2. Writes `baselineCapabilities: true` and `personaSlug` to each entry (if missing)
3. Writes `lastRun` stub if no `lastRun` doc exists
4. Idempotent — safe to re-run
5. Logged to `config/migrations/baseline-backfill-{date}` with count of docs updated

Spine workers (W4) are updated in the same pass — no separate migration needed.

---

## Revocation (new task W6)

When a worker is unpublished or deprecated:

1. `baselineCapabilities` is set to `false` on the catalog entry immediately
2. The worker's active `push_alert` alerts in `alertFeed` are auto-resolved with `resolvedBy: "worker_unpublished"` and `resolvedEvidence: "Worker {slug} was unpublished on {date}"`
3. The worker's `save_note` notes are NOT deleted (append-only invariant), but are tagged `source_worker_status: "unpublished"` so the session builder can optionally filter them
4. `lastRun` doc is retained for audit — never deleted
5. `get_sibling_summary` will no longer return the unpublished worker (filtered by `baselineCapabilities: true`)

---

## Health check system (Phase 4)

The existing canary has four problems:

**Problem 1 — Alert storm on bounce:** Canary alerts on every green→red transition. Fix: **one explicit state machine** (not two separate ones):

```
State: HEALTHY | ALERTING | SUSTAINED | RECOVERING

HEALTHY      → any scenario fails           → ALERTING   (send SMS+email, record alertedAt)
ALERTING     → all scenarios pass           → RECOVERING (start 30-min green timer)
ALERTING     → still failing after 30 min   → SUSTAINED  (send one follow-up SMS: "still down — Xmin")
ALERTING     → still failing, alertedAt >2h → suppress SMS (Operating Feed alert still updates, no new SMS)
SUSTAINED    → all scenarios pass           → RECOVERING
RECOVERING   → 30 min green elapsed         → HEALTHY    (send recovery SMS, resolve OFeed alert)
RECOVERING   → any scenario fails           → ALERTING   (new alert cycle — cooldown reset)
```

The Operating Feed alert (`ikey: canary_{date}_{hour}`) is always written/updated regardless of state — it is never suppressed. Only SMS/email is rate-limited.

**Problem 2 — Hardcoded recipients:** Read from `config/chatHealth.alertRecipients` Firestore doc. If doc missing OR `alertRecipients` is an empty array `[]`, fall back to hardcoded defaults (treat empty the same as missing — do not silently drop Sean).

**Problem 3 — Alert channel tiers:**
- First alert (HEALTHY→ALERTING): SMS + email
- Sustained outage (ALERTING→SUSTAINED, >30 min): SMS only, one message
- Recovery (RECOVERING→HEALTHY): SMS only, one message
- Worker canary (6h schedule): email only, no SMS

**Problem 4 — No Operating Feed integration:** On ALERTING, push `alertFeed/{uid}/items` with `ikey: canary_{date}_{hour}`, severity RED, source_label "System Health". On RECOVERING→HEALTHY, auto-resolve with `resolvedEvidence: "Recovered after {N} min"`.

**Problem 5 — Single-scenario blind spot (new, from red team RT7):** Current canary runs one scenario. A 50%-degraded system can pass a single scenario by chance. Fix: run 3 independent scenarios per pass. ANY failure = red. This is H5 (new build task), not covered by the existing H1-H4.

---

## Build tasks

### Phase 1 — Baseline injection (worker side)
- [ ] **W1** — `workerSessionBuilder`: reads `baselineCapabilities` flag → injects baseline context block (capped at 500 tokens) + 3 tools (`push_alert`, `recall_notes`, `save_note`) at session start only
- [ ] **W2** — `get_sibling_summary` backend: reads `lastRun` docs for persona siblings (filtered by `tenantId` AND `personaSlug`). Add to worker tool loop.
- [ ] **W3** — Inject `get_sibling_summary` into the worker baseline tool set
- [ ] **W4** — All spine worker catalog entries: add `baselineCapabilities: true` flag
- [ ] **W5** — Injection success/failure logging: write to `config/workerHealth.injectionFailures`; alert if rate > 1% over 1 hour
- [ ] **W6** — Revocation handler: unpublish flow sets `baselineCapabilities: false`, auto-resolves worker's alerts, tags saved notes

### Phase 2 — COS deep discovery
- [ ] **C1** — `lastRun` transactional write (with `alertsPushed` increment, not overwrite)
- [ ] **C2** — COS session builder: reads `lastRun` for creator workers, includes digest in "workers available" context block
- [ ] **C3** — COS prompt update: Alex references `lastRun` depth when recommending workers

### Phase 3 — Sandbox publish wiring
- [ ] **S1** — Publish flow: writes `baselineCapabilities: true` to catalog entry
- [ ] **S2** — Publish flow: writes `lastRun` stub
- [ ] **S3** — Publish flow: registers `personaSlug` on catalog entry
- [ ] **S4** — Publish UI: explicit consent checkbox (not passive disclosure text); Publish button gated until checked

### Phase 4 — Health check fixes
- [ ] **H1** — Single state machine (HEALTHY/ALERTING/SUSTAINED/RECOVERING) replacing the old green/red boolean
- [ ] **H2** — Recipients: `config/chatHealth.alertRecipients`; empty array treated as missing → fallback to hardcoded
- [ ] **H3** — Alert tiers: SMS+email on first alert; SMS-only on sustained + recovery; email-only for worker canary
- [ ] **H4** — Operating Feed integration: RED alert on ALERTING, auto-resolve on HEALTHY recovery
- [ ] **H5** — Multi-scenario canary: 3 independent scenarios per pass; any failure = red (partial-outage detection)

### Phase 5 — Migration
- [ ] **B1** — Backfill script: `scripts/backfill-baseline-capabilities.js` — idempotent, adds flag + personaSlug + lastRun stub to all pre-existing creator catalog entries and spine workers

---

## Red team (v2 — incorporates full feedback)

**RT1 — Token bloat (revised):** Baseline block is now hard-capped at 500 tokens enforced by the session builder. Per-note cap of 200 chars. `get_sibling_summary` capped at 50 words per sibling × 5 siblings max. Block is injected once at session start, never re-sent per turn. Truncation is logged. *Residual risk:* The 500-token cap is an estimate — needs measurement in W1 before finalizing.

**RT2 — Sibling boundary leak:** `get_sibling_summary` must filter by `tenantId` AND `personaSlug` — never one without the other. QA-001 check added (see sign-off gate).

**RT3 — Duplicate alerts (worker vs. COS):** Worker-pushed alerts use ikey `{workerSlug}_{entity}_{date}`. COS-pushed alerts use a different prefix. Title substring dedup (>80% match within 7 days) catches remaining collisions.

**RT4 — Fabricated canvasSummary (revised):** `canvasSummary` is template-generated from structured `payload` fields — never LLM paraphrase. `get_sibling_summary` explicitly reads `creators/{slug}/lastRun.canvasSummary` (the same doc the render pipeline writes) — not a separate stale catalog field. If `lastRun` doc is missing: returns `last_active: never`, no summary, no fabrication.

**RT5 — Silent push_alert:** Every push_alert call from a worker chat must be surfaced visibly in the chat thread. Instruction text in the baseline block explicitly requires this. QA-001 check for the instruction string in the baseline injection.

**RT6 — Version drift / backward-compat (revised):** `baselineCapabilities` flag is a boolean on/off switch. Platform always resolves the current tool set at session start — workers don't pin versions. Deprecated tools stay as no-op stubs for 30 days, returning a deprecation message. Instruction text is generated at session-build time from the current tool registry — never stored as a static string at publish time.

**RT7 — Cooldown vs. partial-outage (revised):** Single explicit state machine defined (see Health check section). Two conflicting state machines replaced by one. Multi-scenario detection (3 scenarios per pass) added as H5 — promoted to a build task, not left as "candidate mitigation." Operating Feed alert always updates (never suppressed); only SMS/email is rate-limited by cooldown.

**RT8 — Alert rate limit (revised):** Two-level throttle: (1) max 2 pushes/minute per worker slug (rate), (2) max 10 unresolved at a time (cap). 7-day auto-staleness moves uninteracted-with alerts to `archived`, freeing the cap. When cap is hit, a single meta-alert fires rather than silent drop. *Residual question:* 7-day staleness threshold — Sean to confirm before H1 builds.

**RT9 — Prompt injection via shared surfaces (new):** `save_note` content and `canvasSummary` are platform-writable and get injected into other workers' and Alex's system prompts. A note containing `"ignore prior instructions..."` written by one worker becomes a cross-worker injection vector. *Mitigation:* Notes stripped of instruction-pattern text before storage AND before injection. Pattern list: `ignore prior`, `system:`, `[INST]`, `<|im_start|>`, `forget`, `new instructions`, `assistant:`. Strip is applied at both the save_note write path and the session builder injection path. QA-001 check verifies strip is applied.

**RT10 — source_label spoofing (new):** Nothing currently stops a worker from setting `source_label: "HR Worker"` on a push_alert it didn't originate. *Mitigation:* `source_label` is validated server-side at write time against the worker's registered slug (from the auth context / catalog entry). Workers cannot set arbitrary source labels. The backend sets `source_label` from the caller's registered `workerName` — the input field is ignored if it doesn't match.

**RT11 — No backfill for pre-existing creator workers (new):** Creator workers published before this ships have no `baselineCapabilities` flag. Without migration, early creators stay in Tier 3. *Mitigation:* B1 migration script (see build tasks). Must run before Phase 1 is announced as complete. Sign-off gate includes verifying pre-existing workers were migrated.

**RT12 — Fail-open silent regression (new):** If `workerSessionBuilder` fails to read the catalog entry, the worker silently starts with no baseline. Hard to detect. *Mitigation:* Fail-closed on baseline injection (worker starts without baseline, not with a partial one). Failure logged to `config/workerHealth.injectionFailures`. Alert if rate > 1% over 1 hour. QA-001 check verifies logging path exists.

**RT13 — lastRun write race (new):** Two concurrent sessions of the same worker can race on `alertsPushed`, causing one session's increment to be dropped. *Mitigation:* `lastRun` writes use Firestore transactions with read-increment-write. `alertsPushed` is never overwritten with a static value. See `lastRun` write protocol section.

**RT14 — Empty alertRecipients drops Sean silently (new):** An admin who sets `alertRecipients: []` (not missing, but empty) would silently remove all recipients including the hardcoded fallback. *Mitigation:* If `alertRecipients` array is empty, treat as missing → fallback to hardcoded defaults. The distinction between "missing doc" and "empty array" is explicitly handled.

**RT15 — No revocation when worker is unpublished (new):** Unpublishing a worker should pull its baseline capabilities and clean up its Operating Feed presence. Without this, orphaned alerts point at a slug that no longer resolves. *Mitigation:* W6 revocation handler — see build tasks and revocation section.

**RT16 — Consent framing too passive (new):** One-line disclosure text on the Publish step is insufficient for a change granting unsupervised Operating Feed write-access. *Mitigation:* S4 replaces disclosure text with an explicit checkbox. Publish button is gated. The creator must acknowledge rather than just see.

---

## Sign-off gate (Phase 1 ships when all pass)

**Baseline injection:**
- [ ] Creator-built worker chat injects sibling context block — visible in session debug; block is ≤500 tokens
- [ ] Block is injected once at session start — not re-sent each turn in a 10-turn conversation
- [ ] Injection failure (simulated Firestore hiccup) is logged to `config/workerHealth.injectionFailures`; worker still starts without crashing

**push_alert:**
- [ ] push_alert from within a worker chat appears in Operating Feed within 2 seconds
- [ ] push_alert call is surfaced visibly in the worker's chat thread (not silent)
- [ ] source_label on the written alert matches the worker's registered name — not an arbitrary caller-supplied string
- [ ] 11th push attempt (at cap) drops silently + fires the meta-alert; does NOT write an 11th item
- [ ] A 7-day-old unresolved alert is moved to `archived`; worker's unresolved count decrements, freeing cap

**Memory tools:**
- [ ] recall_notes returns notes scoped to the correct tenantId only
- [ ] save_note with instruction-pattern text (`"ignore prior instructions..."`) is stripped before storage and before injection into sibling/COS contexts
- [ ] get_sibling_summary never returns workers from a different tenantId

**Boundaries:**
- [ ] get_sibling_summary filters by tenantId AND personaSlug — verified by running it from a worker in persona A against a tenant with workers in personas A and B; only persona A workers returned

**canvasSummary integrity:**
- [ ] canvasSummary in lastRun is generated by template fill from structured payload fields — not an LLM paraphrase (verified by code review of the render pipeline write path)
- [ ] get_sibling_summary reads `creators/{slug}/lastRun.canvasSummary` directly — not a stale catalog field

**Spine worker parity:**
- [ ] Spine workers (HR, Marketing, RE, Accounting, IR, Aviation) all have `baselineCapabilities: true` in their catalog entries (W4)

**Migration:**
- [ ] B1 script ran, all pre-existing creator catalog entries have `baselineCapabilities: true` and `personaSlug`
- [ ] B1 is idempotent — re-running it against an already-migrated tenant produces no duplicate writes

**Revocation:**
- [ ] Unpublishing a worker sets `baselineCapabilities: false`; its unresolved alerts auto-resolve with `resolvedBy: "worker_unpublished"`
- [ ] Unpublished worker no longer appears in get_sibling_summary results

**COS deep discovery:**
- [ ] Alex at session start references creator worker lastRun depth for a worker active in last 7 days — cites lastRun data, not the catalog description

**Sandbox:**
- [ ] Publish step shows explicit consent checkbox; Publish button disabled until checked

**Health canary:**
- [ ] 2-hour SMS cooldown confirmed: alert fires, system bounces red 3 times in 30 min, only 1 SMS total sent
- [ ] Empty `alertRecipients: []` in Firestore → falls back to hardcoded recipients (Sean not dropped)
- [ ] Operating Feed RED alert appears on ALERTING; auto-resolves with recovery duration on HEALTHY
- [ ] 3-scenario pass: artificially fail 1 of 3 scenarios → state transitions to ALERTING (partial-outage detection confirmed)
