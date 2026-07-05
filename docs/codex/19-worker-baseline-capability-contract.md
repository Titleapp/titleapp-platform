# CODEX Surface 19 — Worker Baseline Capability Contract

**Status:** 🔴 spec · **Owner:** Sean · **Created:** 2026-07-05
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

The "baseline capability contract" is a standardized context block + tool set that is injected into every worker's chat session at startup, regardless of whether it's a spine worker or creator-built. Creators never configure it. The platform provides it automatically at publish time.

### Baseline context block (injected at session start)

```
WORKSPACE CONTEXT (injected by platform — do not fabricate):
- Persona: {personaName} ({personaType})
- Sibling workers in this persona:
  {for each sibling: "• {workerName} ({workerSlug}) — {purpose_one_liner} | last active: {X days ago}"}
- Recent Operating Feed signals (your worker's alerts):
  {last 3 unresolved alerts pushed by this worker, if any}
- Shared notes for this workspace (from Alex's memory):
  {last 3 notes tagged to this tenantId, if any}

PLATFORM TOOLS AVAILABLE:
push_alert, recall_notes, save_note — defined below. Use push_alert proactively
when you find something urgent. Do NOT surface findings only in chat — push them
to the Operating Feed so they're visible outside this conversation.
```

### Baseline tool set (every worker chat gets these)

**`push_alert`** — identical to COS version, same backend
- Worker identifies itself via `source_label` (e.g., "DPP Worker", "HR Worker")
- Alert appears in Operating Feed under that label
- Use cases: compliance deadline, overdue task, anomaly found during analysis

**`recall_notes`** — read Alex's shared memory for this workspace
- Scoped to `tenantId` — workers in the same persona share the same note pool
- Prevents duplication: worker can check if Alex already flagged something

**`save_note`** — write a note to the shared workspace memory
- Allows workers to leave breadcrumbs for Alex and for sibling workers
- Example: DPP worker saves "Battery model 4821-X expires 2026-09-01" → Alex finds it at next session

**`get_sibling_summary`** — NEW tool (not in COS yet)
- Returns: name, slug, last_active, last_canvas_output_summary (50-word digest) for each sibling worker in this persona
- Worker can tell the user "for billing questions, check your Accounting worker — it last ran 2 days ago"
- Does NOT cross persona boundaries (persona isolation is preserved)

### What the contract explicitly does NOT include

- Propose/send email (workers don't email independently — they propose through Alex or the user)
- get_campaigns, get_shopify_orders — commerce tools stay COS-only for now (workers reference data, don't query commerce systems directly)
- Cross-persona worker access — a worker in the Business persona cannot see workers in the Personal persona (Vault isolation rule)
- Autonomous resolution of Operating Feed alerts — workers push only; resolution requires user confirmation or Alex

---

## COS deep discovery (what Alex learns about creator workers)

Currently Alex knows a creator worker exists via its catalog entry: name, description, slug. That's it.

**What Alex needs at session start:**
1. **Last canvas output digest** — what did this worker produce in its last session? (50-word AI summary of the last canvas `payload`, stored at catalog entry update time)
2. **Last active timestamp** — so Alex can say "the DPP worker hasn't run in 3 weeks, might be worth a check"
3. **Alert history** — what alerts has this worker pushed in the last 30 days? (count + severity breakdown)
4. **Declared data sources** — what does this worker read? (from the spec `emits` and `accepts` fields)

The session builder reads `raasCatalog/{vertical}__{jurisdiction}` at startup. For creator workers, it additionally reads `creators/{slug}/lastRun` (a doc written each time the worker renders) to populate the digest.

**Result:** Alex can say "Your DPP worker last ran 4 days ago and pushed 2 amber alerts about battery compliance dates. Want me to open it and check?" instead of just "You have a DPP worker available."

---

## Sandbox publish changes

When a creator clicks Publish (or the sandbox auto-publishes after Test step), the publish flow must:

1. **Write `capabilities` to the catalog entry:**
   ```json
   {
     "baselineCapabilities": ["push_alert", "recall_notes", "save_note", "get_sibling_summary"],
     "version": "1.0"
   }
   ```
   This is the flag the worker session builder reads to inject the baseline context block and tool set.

2. **Write `lastRun` doc** (updated every time the worker renders):
   ```
   creators/{slug}/lastRun: {
     canvasSummary: "50-word digest of last canvas output",
     renderedAt: timestamp,
     alertsPushed: N
   }
   ```

3. **Register sibling relationship** — the catalog entry gets `personaSlug` so `get_sibling_summary` can find it.

4. **No new UI for creators.** The sandbox Publish step shows: "Your worker will have access to shared workspace memory, the Operating Feed, and can reference sibling workers automatically." That's it. Not configurable.

---

## Health check system (parallel spec — urgent)

The existing canary has two problems worth fixing in this same build pass:

**Problem 1 — Alert storm on bounce:**
When chat goes green→red→green→red (e.g., a flapping deploy), the canary sends one alert per transition. If it bounces 4 times in an hour, Sean gets 4 SMS. The fix: a **2-hour cooldown** — if an alert was sent within the last 2 hours, suppress the next one. Reset cooldown when system returns to green and stays green for 30 min.

**Problem 2 — Hardcoded recipients:**
`seanlcombs@gmail.com` and `+13104300780` are hardcoded in `chatCanary.js`. Org admins can't be added without a deploy. The fix: read from `config/chatHealth` Firestore doc → `alertRecipients` array. Default fallback to hardcoded if doc missing. Org admins added via admin UI (or Alex command: "add [email] to health alert recipients").

**Problem 3 — Alert channel:**
Email every 15 min was excessive even for a real outage. Better model:
- **First alert:** SMS + email immediately on green→red (with cooldown)
- **Sustained outage (>30 min):** One follow-up SMS "Chat still down — 35 min"
- **Recovery:** One SMS "Chat recovered — was down 41 min"
- **Worker canary (6h):** Email only (not SMS), even on first alert — less urgent than chat being down

**Problem 4 — No Operating Feed integration:**
When the canary fires, it should push a RED alert to Sean's Operating Feed (`alertFeed/{uid}/items`) in addition to SMS/email. Then resolve it when the system recovers. This way the outage is visible in the morning brief even if Sean missed the SMS at 3am.

---

## Build tasks

### Phase 1 — Baseline injection (worker side)
- [ ] **W1** — `workerSessionBuilder` function: reads catalog entry `baselineCapabilities` flag → if set, injects baseline context block + 3 tools (`push_alert`, `recall_notes`, `save_note`) into the worker system prompt
- [ ] **W2** — `get_sibling_summary` backend: reads `raasCatalog` for all workers matching `personaSlug`, returns digest. Add to tool loop.
- [ ] **W3** — Inject `get_sibling_summary` into the worker baseline tool set
- [ ] **W4** — All spine worker catalog entries: add `baselineCapabilities` flag so they inherit too (not just creator workers)

### Phase 2 — COS deep discovery
- [ ] **C1** — `creators/{slug}/lastRun` doc: written by canvas render pipeline each time a creator worker renders. Fields: `canvasSummary`, `renderedAt`, `alertsPushed`
- [ ] **C2** — COS session builder: reads `lastRun` for each creator worker and includes digest in the "workers available" context block
- [ ] **C3** — COS prompt update: Alex instructed to reference `lastRun` depth ("last ran X days ago, pushed N alerts") when recommending workers

### Phase 3 — Sandbox publish wiring
- [ ] **S1** — Publish flow: writes `baselineCapabilities` to catalog entry
- [ ] **S2** — Publish flow: writes initial `lastRun` doc stub
- [ ] **S3** — Sandbox UI: one-line disclosure "Your worker includes shared memory and Operating Feed access" on the Publish step

### Phase 4 — Health check fixes
- [ ] **H1** — Canary cooldown: 2-hour suppress on repeat alerts; reset on sustained green
- [ ] **H2** — Recipients: read from `config/chatHealth.alertRecipients` Firestore, fallback to hardcoded
- [ ] **H3** — Alert tiers: SMS on first alert + 30-min sustained; email-only for worker canary
- [ ] **H4** — Operating Feed integration: canary pushes RED alert to `alertFeed/{uid}/items` on outage, auto-resolves on recovery

---

## Red team

**RT1 — Sibling context noise:** If a persona has 12 workers and each injects a sibling block, the worker's system prompt bloats by 600+ tokens per session. With LLM cost scaling at volume, this is a real concern.
*Candidate mitigation:* Cap sibling block at 5 workers, prioritized by last_active recency. Skip siblings not active in 30 days. Measure token delta before/after W1-W3.

**RT2 — get_sibling_summary crosses persona boundary by accident:** A misconfigured worker with the wrong `personaSlug` could see siblings from a different tenant's persona.
*Candidate mitigation:* `get_sibling_summary` must always filter by `tenantId` AND `personaSlug`. Never by `personaSlug` alone. QA-001 check verifying the query includes tenantId.

**RT3 — push_alert from a worker creates duplicate with COS push_alert:** Alex pushes an alert about an overdue task; 6 hours later the worker scanner runs and pushes the same alert again with a different ikey.
*Candidate mitigation:* Worker-pushed alerts use ikey format `{workerSlug}_{entity}_{date}`. COS-pushed alerts use different prefix. Title substring dedup (>80% match within 7 days) catches the rest.

**RT4 — lastRun canvasSummary is fabricated:** If the canvas render pipeline writes a summary using an LLM summarizer that hallucinates, Alex cites false data about what a worker found.
*Candidate mitigation:* `canvasSummary` is generated from the canvas `payload` fields (structured data), not from a free-text LLM pass. Summary is a template fill: "Found {N} items. Top result: {first_item_title}. Status: {status}." Never an LLM paraphrase.

**RT5 — Worker chat tool loop executes push_alert without user seeing it:** Worker pushes a RED alert silently during a session. User doesn't know. Trust is broken.
*Candidate mitigation:* Worker chat must surface push_alert calls visibly in the chat thread — "I've flagged this as urgent in your Operating Feed." Same pattern as COS. Never silent.

**RT6 — Baseline capability version drift:** Worker publishes with `baselineCapabilities: "1.0"`. Platform upgrades to 1.1 with a new tool. Existing published workers don't get it.
*Candidate mitigation:* `baselineCapabilities` version is resolved at session start, not at publish time. The catalog flag is just `true/false`. The actual tool set is always the current platform version. Workers don't pin capability versions.

**RT7 — Health canary cooldown hides a sustained partial outage:** System is 50% degraded (some requests fail, some succeed). Canary happens to get a passing request each run. Cooldown suppresses re-alerts. Sean doesn't know.
*Candidate mitigation:* Canary runs 3 scenarios per pass. If ANY scenario fails, it's red. The cooldown applies to SMS only — the Operating Feed alert is always written fresh (ikey = `canary_{date}_{hour}` so it updates but doesn't spam).

**RT8 — Creator workers push low-quality alerts:** A creator worker is poorly tuned and pushes 50 amber alerts a day. Feed is useless.
*Candidate mitigation:* Rate limit per worker: max 10 unresolved active alerts per worker slug at any time. Attempt to push when at limit → log warning, don't write. When limit is hit, push ONE red alert: "DPP worker has 10+ unresolved items — review needed." This creates accountability without spam.

---

## Sign-off gate (Phase 1 ships when all pass)

- [ ] Creator-built worker chat injects sibling context block — visible in chat session debug
- [ ] push_alert from within a worker chat appears in Operating Feed within 2 seconds
- [ ] push_alert call is surfaced visibly in the worker chat thread (not silent)
- [ ] recall_notes returns notes scoped to the correct tenantId (not another tenant's notes)
- [ ] get_sibling_summary never returns workers from a different tenantId
- [ ] Spine workers (HR, Marketing, RE) also receive the baseline (W4 complete)
- [ ] Alex at session start references creator worker lastRun depth for a worker active in last 7 days
- [ ] Sandbox Publish step shows the capability disclosure line
- [ ] Health canary: 2-hour cooldown confirmed (send alert, bounce 3 times in 30min, only 1 SMS sent)
- [ ] Health canary recipients: adding email to `config/chatHealth.alertRecipients` routes alerts without deploy
- [ ] Health canary outage: RED alert appears in Operating Feed; resolves automatically on recovery
