# CODEX 42 — Amendment A: Alex (COS) Delivery Model

**Date:** 2026-07-23  
**Status:** CANONICAL — amends CODEX 42 §6 ("Excluded workers: special routing, handled separately")  
**Triggered by:** Cross-document red team finding that Alex is a shared dependency of CODEX 18, CODEX 19, and CODEX 42 with no delivery model defined in any of them.

---

## The Gap

CODEX 42 §6 lists `chief-of-staff` as excluded from `_STREAMING_WORKERS` with the note "special routing, handled separately" — no pointer to where, no spec. Meanwhile:
- CODEX 18 gives Alex three new autonomous tool calls (`push_alert`, `resolve_alert`, `snooze_alert`)
- CODEX 19 gives Alex a cross-workspace fan-out (up to 8 workspaces per turn)
- CODEX 42 defines two enforcement tiers (RAAS-light / RAAS-heavy) but places Alex in neither

This amendment defines Alex's delivery model so the three CODEXes can compose safely.

---

## Alex's Tier: "Platform" — Cross-Vertical, Always Buffered, Content-Safety Only

### Delivery

Alex (`chief-of-staff`) runs the **COS path** starting at line 6153 of `index.js` (`_isCos` branch). She is **permanently excluded from `_STREAMING_WORKERS`** and this is intentional — not an oversight to fix later.

**Why buffered, not streamed:**
- Alex's responses often depend on cross-workspace context that arrives asynchronously (CODEX 19 fan-out)
- Alex routes between workers; a partial response that names a handoff target before confirming it exists creates UI race conditions
- Alex's tool calls (alertFeed writes) must complete before her response reaches the client, so the feed is consistent when she narrates what she just did

### RAAS Enforcement

Alex is **RAAS-exempt for domain enforcement.** She is cross-vertical — no single ruleset applies. Applying `aviation_hard_stops_v1` or `re_compliance_v1` to Alex's cross-domain orchestration responses would produce false blocks.

What Alex IS subject to:
- `constraintCheck()` — content safety and platform-level prohibitions (no PII leakage, no financial advice)
- Append-only invariant — every Firestore write Alex triggers (alertFeed, notes) creates new records; nothing is overwritten

What Alex is NOT subject to:
- `validateChatOutput(raasRules)` — domain enforcement
- `WORKER_TOOL_MAP` slot enforcement (when Phase 2 ships, Alex's map entry = `[]` — she has no direct tools, she routes)

**Audit record for Alex turns:** `enforcement_model: "platform"` (distinct from `"code"` and `"prompt"`) so auditors can identify COS turns without misattributing them.

### CODEX 18 Tool Calls (alertFeed writes)

Alex CAN call `push_alert`, `resolve_alert`, `snooze_alert`. These are the only autonomous writes Alex makes. Constraints:
1. **alertFeed only** — tool calls write to `alertFeed/{uid}/items`, nowhere else
2. **Append-only** — `push_alert` creates new items; `resolve_alert` and `snooze_alert` update status fields only (no data fields change)
3. **No RAAS gate required** — alertFeed writes are operational metadata, not domain decisions. They are not subject to RAAS validation.
4. **Not in WORKER_TOOL_MAP** — Alex's tool calls are wired at the COS path level, not through the Phase 2 tool enforcement layer

When `push_alert` / `resolve_alert` / `snooze_alert` are implemented in `index.js`, they must be dispatched only when `_isCos === true`. If `workerSlug !== null && workerSlug !== "chief-of-staff"`, these tool calls are rejected silently (domain workers cannot push to the alertFeed directly).

### CODEX 19 Fan-Out (Cross-Workspace Context)

The CODEX 19 fan-out runs **pre-turn, not as a tool call during the AI response.** Before Alex's messages array is sent to the model, `buildSiblingStatePrompt` injects workspace summaries into the system prompt. This is:
- Read-only (no Firestore writes during fan-out)
- Bounded (2s timeout, 8 workspace cap, 400 tokens per workspace)
- Injected as context, not returned as a tool result

Fan-out is NOT an in-turn AI tool. Alex does not `await` a tool and then get workspace data back mid-response. The data arrives before the first token is generated.

### Phase 2 Behavior (When CODEX 42 Phase 2 Ships)

Alex remains non-streaming and RAAS-exempt in Phase 2. The `WORKER_TOOL_MAP` includes:

```js
"chief-of-staff": {
  allowedTools: [],           // Alex has no direct execution tools — she routes
  raasValidation: "none",     // platform tier
  delivery: "buffered-json",  // permanent
  auditModel: "platform",
}
```

If Phase 2 WORKER_TOOL_MAP enforcement blocks a tool call from a `workerSlug === "chief-of-staff"` session, that is a false positive — the COS path should be explicitly exempt from the enforcement gate.

---

## Implementation Requirements

When building CODEX 18's `push_alert` / `resolve_alert` / `snooze_alert` tool calls in the COS path:

```js
// In the _isCos branch only:
if (toolBlock?.name === 'push_alert') {
  // write to alertFeed/{uid}/items
  // enforce: uid = authUser.uid, tenantId = _cosTenantId
  // field schema: see alertFeed canonical schema (CODEX 18 §5)
}
if (toolBlock?.name === 'resolve_alert') {
  // update alertFeed/{uid}/items/{itemId}: status → "resolved", resolvedAt → now
}
if (toolBlock?.name === 'snooze_alert') {
  // update alertFeed/{uid}/items/{itemId}: status → "snoozed", snoozedUntil → timestamp
}
```

Guard: if any of these tool names appear in a non-COS worker turn, log a warning and skip — domain workers cannot write to alertFeed.

---

## Sign-off Checklist

- [ ] Alex's `enforcement_model` in audit record set to `"platform"` (not `"code"`)
- [ ] `push_alert` / `resolve_alert` / `snooze_alert` tool dispatch gated on `_isCos === true`
- [ ] CODEX 19 fan-out confirmed pre-turn (not a tool call)
- [ ] Phase 2 `WORKER_TOOL_MAP` includes `"chief-of-staff": { allowedTools: [], raasValidation: "none" }`
- [ ] No domain worker can emit `push_alert` / `resolve_alert` / `snooze_alert` (log-and-skip guard)
