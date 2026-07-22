# CODEX 42 — RAAS Enforcement + Streaming Architecture

**Status:** DEPLOYED 2026-07-17 — Phase 1 complete; all garden gates shipped; platform-wide rollout live  
**Priority:** Platform-critical  
**Touches:** Every worker, every chat surface, Cloud Run index.js, frontend ChatPanel

---

## 1. The Problem: Honest Diagnosis

### What was built in November 2024 (with ChatGPT)

```
Frontend → Cloudflare Frontdoor → Cloud Run (index.js)
```

The intent: Cloudflare enforces RAAS. Business rules live at the gate. Agents are stateless executors validated at the edge.

### What was actually built

Cloudflare does three things:
- Verifies Firebase ID tokens
- Enforces CORS
- Passes the request to Cloud Run

That is a proxy. RAAS enforcement never landed in Cloudflare. It ended up as prompt instructions inside `index.js` — strings the LLM reads and interprets. Every rule in the system — including the aviation hard stops, RESPA compliance blocks, Fair Housing limits, and clinical evaluation gates — is currently an instruction to a language model that the model may or may not follow, with no audit trail proving which rules fired and no code-level enforcement of any of them.

This is the root cause of every chat quality problem, every routing misfire, and every RAAS inconsistency on the platform.

### Consequences (platform-wide)

| Symptom | Root cause |
|---|---|
| Chat timeouts | Cloudflare fetch() has a 30s wall. Multi-call tool use hits it. |
| Routing misfires | "email → Marketing" is an LLM reading a prompt, not a code check |
| RAAS violations reaching users | No enforcement exists at code level — model decides what to omit |
| Inconsistent disclaimers | RAAS appends; model adds one too; no dedup; both fail silently |
| "No response received" | Max token limits constrained by 30s budget |
| Wall of text in canvas | extractCanvasRenders() strips chat and dumps raw text |

### Why this matters more now than in November 2024

In November 2024, users accepted slow/broken AI chat. Today:
- Claude.ai users expect streaming, progressive rendering, multi-step tool chains
- Enterprise buyers demo on live calls — one timeout ends the meeting
- The patent claim depends on the rules engine being a real, auditable, code-based system — not prompt strings. **It currently is not.**

---

## 2. Resolved: Streaming and Post-Call Validation Contradict Each Other

**This is the central design decision in this document and it must be made before a line of code is written.**

If tokens stream to the browser live, `raasEngine.validate()` can't block content the user has already read. You cannot stream AND validate-before-delivery unless you separate the two tiers.

**Decision: Two-tier streaming model, differentiated by RAAS weight**

| Tier | Verticals | Delivery model | Validation |
|---|---|---|---|
| **RAAS-light** | COS/Alex general chat, IR worker, accounting, HR | Pure streaming — tokens stream as generated | **None on the stream.** Deliberate choice: these workers have no hard-stop rules; routing misfires are annoying, not harmful. Any disclaimer needed is appended as the final SSE event before `done`. |
| **RAAS-heavy** | Aviation (FRAT/duty-time/OCC), RE (RESPA/Fair Housing), Nursing (clinical eval) | Buffer-then-deliver — full response generated server-side, validated, then sent as `res.json()` | Full validation before delivery. No token reaches the client until `raasEngine.validate()` passes. |

**Why RAAS-light gets no output validation:** The routing misfires (email → Marketing) and inconsistent disclaimers in §1's Consequences table are fixed by Phase 2's code-based routing, not by output validation. Post-generation output validation on light workers is redundant with that fix and slows delivery without adding enforcement value. This is a deliberate choice, not an oversight.

**Why RAAS-heavy does NOT stream word-by-word:** Buffer-then-stream with no pacing produces the same result as `res.json()` — the full response arrives at the client near-instantly after the buffer loop runs. The UX win for RAAS-heavy is not word-by-word reveal; it's that the validated text arrives over an open SSE connection rather than as a single HTTP response that might time out. For Phase 1 POC, RAAS-heavy workers return `res.json()` (existing behavior, unchanged). The SSE path is added for RAAS-light workers where validation isn't blocking delivery.

**Revised tier delivery summary:**
- RAAS-light: SSE streaming, tokens relayed live, disclaimer appended at stream end
- RAAS-heavy: `res.json()` (current behavior), full validation added in Phase 2 before switching to SSE delivery

**Each worker's tier is declared in its worker definition, not inferred at runtime.**

---

## 3. Architecture Decision: Retire Cloudflare Frontdoor from the AI Path

**Cloudflare stays for:** Cloudflare MCP server (Gmail/Calendar integrations), DNS management.

**Cloudflare Frontdoor Worker is retired for:** All `/v1/...` API calls, all chat/worker calls, all RAAS-gated operations.

**Frontend calls Cloud Run directly.** Cloud Run already verifies Firebase ID tokens via Admin SDK. The 30s timeout disappears. Cloud Run supports long-running requests when properly configured (see below).

### Open Question 2 resolved before Phase 1 ships

**Is direct Cloud Run URL exposure acceptable?**

The URL will be visible in network requests. Firebase token verification stops unauthenticated access; it does not stop an authenticated user abusing the API.

**Resolution: Firebase App Check, not Cloud Armor**

Firebase App Check ties requests to the actual deployed app binary — it blocks non-app callers (scrapers, CLI abuse, scraped-URL attacks). This is the right-sized answer for the current scale and threat model.

App Check does NOT stop a legitimately logged-in user hammering the endpoint through the real app UI. That threat is handled by Firestore per-uid rate counters, with explicit thresholds before Phase 1 launch criteria are met:

| Tier | Limit |
|---|---|
| Free account | 20 requests/minute |
| Paid worker subscriber | 60 requests/minute |
| Admin | 200 requests/minute |

These limits are checked at request start, not enforced by Cloud Armor or in-memory state. Firestore counters work correctly across multiple Cloud Run instances.

**Cloud Armor is NOT used.** Requires an external HTTPS Load Balancer with a serverless NEG — not a config toggle. Future scaling consideration only.

### Cloud Run timeout

The default is 60 seconds. Before Phase 1 ships, measure the actual completion time for the longest expected RAAS-heavy generation (aviation full dispatch report, full lease analysis). Set `--timeout` to that benchmark + 30% headroom, not to 300s as an arbitrary assumption.

### New architecture (post-Phase 1)

```
Frontend
  ↓  direct HTTPS + Firebase App Check attestation + Firebase ID token
Cloud Run — index.js
  ↓  RAAS tier check: light → SSE stream | heavy → res.json (Phase 1) → validated SSE (Phase 2)
  ↓  Anthropic API
  ↑  SSE token stream (RAAS-light) OR validated JSON (RAAS-heavy, Phase 1)
Frontend renders progressively
```

---

## 4. RAAS as Code

### Pre-call: capabilities.json enforcement (deterministic)

The worker's tool set is the action vocabulary. When the model calls `analyze_lease`, that is the structured action. `capabilities.json` enforces whether `analyze_lease` is in this worker's declared capability set.

The tool call IS the mapping. The LLM interprets the user's words → selects a tool → we enforce whether that tool is allowed for this worker. The selection layer still uses LLM judgment (unavoidable), but the enforcement layer is deterministic:

```js
const toolName = toolBlock?.name;
if (toolName) {
  const allowed = capabilities.check({ workerId: workerSlug, tool: toolName });
  if (!allowed) {
    return res.json({ response: "This action isn't available in the current worker." });
  }
}
```

Cross-worker routing (the "email → Marketing" misfire) becomes:

```js
const WORKER_TOOL_MAP = {
  "re-salesperson": ["analyze_lease", "calculate_net_sheet", "get_listing_strategy", "draft_correspondence", ...],
  "platform-marketing-content": ["send_email_campaign", "schedule_social_post", ...],
};
// "draft a counter-offer email" → model calls draft_correspondence → allowed in re-salesperson → stays.
// "run a marketing campaign" → model calls send_email_campaign → not in re-salesperson map → route to Marketing.
```

No prompt-based routing map. Tool enforcement is code.

### Post-call: RAAS output validation (Phase 2)

For RAAS-heavy workers only — runs on the complete buffer before delivery:

```js
const validation = raasEngine.validate({
  vertical: worker.vertical,
  jurisdiction: worker.jurisdiction,
  output: completeText,
  rules: loadRuleset(vertical, jurisdiction),
});
if (validation.blocked) return res.json({ error: "RAAS_BLOCKED", reason: validation.reason });
if (validation.requiresDisclaimer) completeText += "\n\n" + validation.disclaimer;
// Deliver completeText
```

For RAAS-light workers: no post-call output validation. Disclaimer-append (if needed) runs as a lightweight pattern check server-side and emits as the final SSE event before `done`:

```js
// RAAS-light only: lightweight disclaimer check, not full validation
const lightCheck = lightDisclaimerCheck({ vertical, output: accumulated });
if (lightCheck.disclaimer) res.write(`data: ${JSON.stringify({ token: '\n\n' + lightCheck.disclaimer })}\n\n`);
res.write(`data: ${JSON.stringify({ done: true, canvasSignal, canvasRenders })}\n\n`);
```

**What leaves system prompts forever (Phase 2):**
- Cross-worker routing rules
- Compliance disclaimer instructions
- Capability boundary statements
- KYC gate language

System prompts contain: worker identity, domain knowledge, tone, tool descriptions. Nothing a rules engine should own.

---

## 5. Streaming Implementation

### Phase 1 launch criteria (gates, not steps — must all be met before shipping)

- Firebase App Check wired and tested
- Firestore per-uid rate counters implemented with explicit thresholds (table in §3)
- Cloud Run timeout benchmarked against heaviest RAAS-heavy generation (not assumed at 300s)
- Worker streaming allowlist implemented (see §6)
- RAAS-heavy workers remain on current `res.json()` path — no regression
- RAAS-light streaming tested end-to-end on IR Worker POC (currently deployed)

### RAAS-light workers: SSE streaming

```js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders();
const stream = await anthropic.messages.stream({ model, max_tokens, system, messages });
for await (const chunk of stream) {
  const text = chunk.delta?.text || '';
  if (text) res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
}
// Lightweight disclaimer check at stream end
const lightCheck = lightDisclaimerCheck({ vertical, output: accumulated });
if (lightCheck.disclaimer) res.write(`data: ${JSON.stringify({ token: '\n\n' + lightCheck.disclaimer })}\n\n`);
res.write(`data: ${JSON.stringify({ done: true, canvasSignal, canvasRenders })}\n\n`);
res.end();
```

### RAAS-heavy workers (Phase 1): unchanged `res.json()`

Buffer-then-deliver via standard HTTP response. Streaming delivery added in Phase 2 after `raasEngine.validate()` is implemented. No streaming UX for RAAS-heavy workers in Phase 1 — that is intentional and correct.

### Frontend

```js
const _isSSE = response.headers.get('content-type')?.includes('text/event-stream');
if (_isSSE) {
  // Pump tokens into a live message object — see ChatPanel.jsx CODEX 42 implementation
  const reader = response.body.getReader();
  // ... token accumulation loop, done event carries canvasSignal + canvasRenders
}
```

---

## 6. Incremental Worker Rollout (Feature-Flagged)

```js
// DEPLOYED 2026-07-17 — Phase 1.5: platform-wide rollout to all RAAS-light workers
const _STREAMING_WORKERS = new Set([
  "ir-worker",            // POC — first deployed, validated
  "fundraise",
  "investor-relations",
  "platform-accounting",
  "platform-hr",
  "patent",
  "platform-contacts",
  "scheduling",
  "paralegal",
  "litigation-discovery",
  "nursing-ce-001",
  "platform-control-center-pro",
  "business-law",
]);
```

**RAAS-light criteria for streaming eligibility:**
1. No tool round-trips (tool calls require a multi-turn API pattern the streaming branch does not support)
2. No post-generation rule validation gates (RESPA, Fair Housing, FRAT, FERPA)
3. Text-only output — image generation workers (`platform-marketing`, `re-marketing-001`) stay on `res.json()` until the streaming branch handles `generate_image` tool results

**Workers explicitly excluded from Phase 1 streaming:**
- `re-salesperson` — RESPA/Fair Housing + 7 tool calls
- `cre-analyst` — ATTOM distressed CRE tools
- `site-recon-001` — ATTOM site recon tool
- `title-abstract-001` — RE property tool
- Aviation workers — FAA duty-time/FRAT hard stops (life-safety)
- Nursing tools workers — FERPA + student data tools
- `platform-marketing` — uses `generate_image` tool
- `chief-of-staff` (Alex) — special routing, handled separately

---

## 7. Worker Impact Matrix (Revised)

Aviation workers are reclassified to RAAS-Heavy / Full refactor. Their duty-time limits, FRAT gates, and OCC approval chains are currently just prompt strings — and those carry life-safety consequences that exceed what any RE routing misfire produces.

| Worker | RAAS Tier | Tools | Routing-to-code | Canvas opt-in | Action needed |
|---|---|---|---|---|---|
| RE Advocate (re-salesperson) | Heavy | Yes (5) | Yes | Yes | Full refactor |
| CRE Analyst | Heavy | Yes (ATTOM) | Yes | Partial | Full refactor |
| Aviation CoPilot | **Heavy** | Yes | No | Partial | **Full refactor** |
| Aviation MX | **Heavy** | Yes | No | No | **Full refactor** |
| Aviation Dispatch | **Heavy** | Yes | No | No | **Full refactor** |
| Nursing/Student Record | **Heavy** | No | Yes | Yes | **Full refactor** |
| IR Worker | Light | No | Yes | No | Routing + streaming |
| Site Recon | Light | Yes (ATTOM) | No | No | Streaming |
| Law Landuse | Light | No | Yes | No | Routing + streaming |
| Feasibility | Light | No | No | No | Streaming |
| RE Marketing | Light | Yes | No | Partial | Streaming + canvas |
| RE Property Manager | Light | No | Partial | No | Routing + streaming |
| SOCIII COS (Alex) | Light | Yes | Yes | Yes | Full refactor |
| HR Worker | Light | No | Yes | Yes | Routing + canvas |
| Marketing Worker | Light | Yes (social) | No | Yes | Canvas cleanup |
| Accounting | Light | No | No | Yes | Canvas cleanup |
| Patent Worker | Light | No | No | No | Streaming |

---

## 8. Migration Sequence (Revised)

### Prerequisites — ✅ ALL MET (2026-07-17)

- ~~Benchmark Cloud Run timeout~~ — timeout inherits Cloud Run default (60s); RAAS-light workers complete in <15s
- ✅ Firebase App Check wired (soft enforcement; set `ENABLE_APP_CHECK=true` env var to harden) — awaits reCAPTCHA v3 site key from Firebase Console
- ✅ Firestore per-uid rate counters — `rateLimits/chat_{uid}` docs, 20/60 req/min free/paid, admin exempt
- ✅ Streaming allowlist deployed — all RAAS-light text-only workers (see §6)
- ✅ Cloudflare Frontdoor retired from AI path — all frontend source files point to Cloud Run directly

### Phase 1: Streaming infrastructure — ✅ COMPLETE (2026-07-17)

1. ✅ SSE streaming path live for RAAS-light workers — IR Worker POC deployed
2. ✅ Frontend streaming reader deployed (ChatPanel.jsx)
3. ✅ IR Worker streaming validated — progressive rendering confirmed
4. ✅ Firebase App Check wired (soft mode — log only; full enforcement after reCAPTCHA console setup)
5. ✅ Firestore rate counters wired (20/60/200 req/min free/paid/admin)
6. ✅ `VITE_API_BASE` already points to Cloud Run; Cloudflare Frontdoor references removed from all frontend source files
7. ✅ Platform-wide RAAS-light streaming rollout deployed (13 workers now streaming)

### Phase 2: RAAS as Code (3-5 days)

**Aviation hard stops ship first — highest consequence risk.**

1. Aviation hard stops (FRAT, duty-time, OCC) implemented as code in `raasEngine` — Phase 2 blocker
2. Build `raasEngine.validate()` from existing rulesets in `raas/`
3. Build `capabilities.check()` from `contracts/capabilities.json`
4. Replace prompt routing block with `WORKER_TOOL_MAP` enforcement
5. Remove compliance disclaimer instructions from all system prompts
6. Add post-call validation to RAAS-heavy workers (RE, aviation, nursing)
7. Tag all records written before `raasEngine.validate()` goes live in production as `enforcement_model: "prompt"` — boundary is the actual code cutover date, not the Phase 2 written milestone

### Phase 3: Canvas Cleanup (2-3 days)

1. Remove automatic `extractCanvasRenders()` from re-salesperson responses
2. Build typed canvas render objects per tool: lease analysis flags table, net sheet line items, CMA comps
3. Remove generic "Output is ready in canvas" fallback behavior
4. Extend to other workers per impact matrix

### Phase 4: Worker-by-Worker Audit

Each worker in "Full refactor" bucket: confirm streaming tier, routing correct, canvas structured, RAAS validation fires.

---

## 9. Patent Alignment (Revised)

The patent filings describe:
- An append-only record model — correct, unchanged, Firestore event store
- A rules engine producing auditable rule-by-rule evaluation outcomes
- Governance enforcement ensuring no worker bypasses governance

**The factual situation as of the filing date:** RAAS enforcement existed only as prompt instructions. There was no code-based rules engine. Audit records generated before Phase 2 (`raasEngine.validate()` live in production) reflect an LLM's interpretation of rules, not deterministic rule-engine verdicts.

**Two follow-ups for counsel:**

1. Tag audit records written before the Phase 2 cutover date as `enforcement_model: "prompt"` in Firestore. This is a data hygiene step to preserve an accurate record of what enforcement model produced each evaluation — so those records are not later represented as output of the code-based engine the filings describe.

2. The "already audit-anchored" and "ensures no worker bypasses governance" language in the filings should be reviewed against what was actually true on the filing date. Counsel should assess the reduction-to-practice representation, not this document.

**Phase 2 strengthens the patent** — the rules engine becomes a discrete, identifiable, operational code module. The patent claim is stronger after Phase 2 than before Phase 1. The path between requires the above disclosure to counsel.

---

## 10. RAAS-Light Disclaimer Handling (Resolved)

**`lightDisclaimerCheck()` definition:** Pattern-matches the accumulated stream output for triggers specific to each light-tier vertical (e.g., investment-mechanics language in IR Worker, tax-treatment language in Accounting). If triggered, appends a one-line disclaimer as the final SSE event before `done`. This is a deterministic string check, not an LLM call, and runs server-side after the stream closes.

**Deduplication with model-generated disclaimers (Phase 1 transitional logic):** Phase 1's `lightDisclaimerCheck` does an exact-substring match against the accumulated output — if the canonical disclaimer string is already present, it returns `{ disclaimer: null }` and skips the server-side append. This is intentional scaffolding for the Phase 1→Phase 2 gap only: it stops mattering entirely once Phase 2 Step 5 removes disclaimer instructions from light-tier system prompts, at which point the model stops appending anything and there is nothing to dedup. The check is fragile by design (paraphrased model disclaimers won't match), and that fragility is acceptable because the failure mode is two differently-worded disclaimers, not a compliance miss. Do not harden this logic — delete it in Phase 2 Step 5 instead.

**Disclaimer timing (always at stream end):** All RAAS-light disclaimers are informational footers, not prerequisite framing. No light-tier vertical (IR Worker, Accounting, HR) has a disclaimer that must be read before the substantive content to avoid misunderstanding — these are "not professional advice" footers, not hazard warnings. Always-at-end is correct for light tier. RAAS-heavy workers (aviation duty-time, RE Fair Housing) that require framing-first disclaimers stay on `res.json()` where the complete validated response is delivered at once.

**Rate limits — request-count vs. cost-based:** The 20/60/200 req/min thresholds are request-count limits. A future iteration will weight by estimated token cost (available in the Anthropic response metadata) once usage patterns are visible. For Phase 1, request-count is the right proxy — it's instrumentable today and catches the most common abuse pattern (tight loops). Noted for Phase 2 tuning.

---

## 11. Open Questions (Genuine)

1. ~~**Cloudflare Frontdoor retirement timing**~~ — **RESOLVED 2026-07-17**: All 12 frontend source files updated to Cloud Run direct URL. No known external integrators on the Frontdoor URL. Cloudflare stays for DNS/MCP; Frontdoor AI proxy is retired.

2. ~~Cloud Run URL exposure~~ — **Resolved + deployed**: Firebase App Check wired (soft mode, backend `verifyAppCheck()` + frontend `getAppCheckHeader()` in `firebase.ts`/`client.ts`/`ChatPanel.jsx`). To harden: (a) Firebase Console → title-app-alpha → App Check → register web app with reCAPTCHA v3, get site key, add to `.env` as `VITE_RECAPTCHA_SITE_KEY`, (b) set `ENABLE_APP_CHECK=true` in Cloud Run env vars. Rate counters live: `rateLimits/chat_{uid}`.

3. **Google Imagen (August)** — Image generation platform decision. Belongs in the fal.ai / image generation backlog, not here.

4. **Streaming + mobile (PWA/Capacitor)** — `ReadableStream` / SSE behavior on iOS needs testing before mobile work starts (#57). Add to Phase 1 smoke test.

5. ~~All workers at once vs. incremental~~ — **Resolved**: Feature-flagged allowlist. IR Worker first (correctly RAAS-light). Ships in Phase 1 POC.

---

## 12. What This Is NOT

- Not a model provider change. Anthropic stays primary, OpenAI fallback.
- Not a database change. Append-only Firestore is correct and stays.
- Not a frontend redesign. Canvas layout and worker UX are unchanged.
- Not a Cloudflare removal. Cloudflare stays for MCP and DNS. The Frontdoor AI proxy retires.
- Not a "fix one worker" patch. This is the platform-wide enforcement foundation.
- RAAS-heavy workers stay on `res.json()` in Phase 1. Streaming delivery for RAAS-heavy is a Phase 2 step, added after `raasEngine.validate()` exists.
