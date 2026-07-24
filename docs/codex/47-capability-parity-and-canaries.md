# CODEX 47 — Capability Parity + Quality Canaries

**Status:** 🟢 active · **Owner:** Sean · **Created:** 2026-07-24
**Frame:** As frontier models advance, SOCIII's moat deepens — but only if Alex stays
capable enough that users don't reach for raw ChatGPT instead. This CODEX defines the
process for staying on pace AND the automated probes that catch regressions before users do.

---

## The strategic principle

SOCIII's edge is **RAAS governance on top of a capable model**, not the model itself.
That means:

- The smarter the base model, the more powerful SOCIII becomes — RAAS is a force
  multiplier, not a ceiling.
- Competitors giving raw GPT access can't safely give it more autonomy. We can,
  because RAAS validates before anything commits.
- Every new capability we add to Alex must route through RAAS. That's non-negotiable.
  Capability expansion without governance is a liability, not a feature.

The risk to manage: **UX regression** — users expect Alex to do more over time. If the
base model improves but Alex's surface doesn't expose the new power, we fall behind
on perceived quality even while the backend gets stronger.

---

## Part 1: Capability Parity Playbook

### Model updates (quarterly minimum)

| What to check | Where | Action |
|---|---|---|
| Latest Claude model ID | Anthropic release notes | Update `ANTHROPIC_MODEL` in `.env` + Secret Manager |
| Latest OpenAI model ID | OpenAI release notes | Update `OPENAI_MODEL` in `.env` + Secret Manager |
| Context window changed | Model docs | Adjust `workerMaxTokens` map in `index.js` if new limits allow longer sessions |
| New modalities (vision, audio) | Model docs | Evaluate for accounting PDF ingestion, aviation chart reading |

**Model swap process:**
1. Update env var in Firebase Secret Manager (not `.env` — that's local only)
2. Deploy functions
3. Run the chat canary probe (Part 2) against the new model
4. If canary passes, ship. If fails, roll back and investigate.

Model IDs are set in `index.js` — search for `ANTHROPIC_MODEL` or `gpt-4` to find the
current pinned values. These should reference env vars, not be hardcoded.

### Quarterly capability gap review

Each quarter, evaluate these capability gaps against what frontier models now offer:

| Gap | Current state | When to close |
|---|---|---|
| **Web search** | Alex cannot look up live data (NOTAMs, property listings, news) | Q3 2026 — Brave Search API ($3/1k queries) or Tavily |
| **Document native ingestion** | PDFs parsed as text before sending to model | Q3 2026 — send PDF bytes directly via vision API for accounting statements |
| **Agentic multi-step** | Alex does mostly single-turn Q&A | Q4 2026 — structured task chains with progress + approval gate |
| **Code execution** | Alex cannot run calculations client-side | Q4 2026 — sandboxed interpreter for financial modeling |
| **Voice input/output** | Text only | 2027 — evaluate for aviation (hands-free preflight briefing) |

**Rule:** don't add capability until there's a concrete use case with a real user waiting
for it. Capability for its own sake becomes junk code. The list above is sorted by
known user demand.

### RAAS governance gate for new capabilities

Before shipping any new Alex capability, answer three questions:

1. **Does the AI output get validated before it commits to Firestore?**
   If no — add RAAS validation or require explicit user approval before write.

2. **Is the capability scoped to the right worker/vertical?**
   A capability available in every worker context creates surface area for misuse.
   Scope tightly; expand on demand.

3. **Is there an audit trail?**
   Every significant action Alex takes should be auditable via the append-only record.

---

## Part 2: Quality Canaries

### What we have today

- **Uptime canary** (every 15 min): pings Alex chat → texts + emails Sean if no response.
  Catches: API down, Cloud Run cold-start failure, auth gate broken.
  **Does NOT catch:** bad answers, wrong numbers, fabricated data.

### What we need

Three additional probe types beyond uptime:

#### A. Chat correctness probe (run every 30 min)

Send Alex a deterministic question with a known correct answer. Verify the response
contains the expected output.

**Probe questions (rotate):**
- "What is the SOCIII platform?" → response must contain "RAAS" or "Digital Worker"
- "What workspace am I in?" → response must reference the canary tenant name, not a fabricated one
- "What's my current credit balance?" → response must contain a number (not null/undefined/error)

**Failure action:** same as uptime canary — text + email Sean.

**Implementation note:** The canary Cloud Function can send a POST to the chat SSE
endpoint with a `canary=true` param that causes the backend to skip the SSE stream
and return a single JSON response — avoids needing to parse an SSE stream in the probe.

#### B. Canvas data probe (run every hour)

For each active worker vertical, verify that the canvas API returns real data, not
empty arrays or error states.

**Probes:**
- `GET /v1/raas/packages?tenantId=<canary_tenant>` → must return ≥1 package
- `GET /accounting:reports?type=pl` → must return `revenue` and `expenses` fields
- `GET /accounting:accounts` → must return connected accounts array (may be empty — that's OK)

**Failure action:** log to Firestore `canaryFailures` collection + alert if failure
persists 3 consecutive runs.

#### C. Integration health probe (run every hour)

Check that key integrations are still connected and responding — not just that the
route exists, but that the external API returns a valid response.

**Probes:**
- Gmail: `GET /v1/gmail:status` for the canary user → `connected: true`
- Calendar: `GET /v1/calendar:status` for the canary user → `connected: true`
- Stripe: `GET /accounting:fc:accounts` → no Stripe API error in response
- ATTOM: cached data freshness — last ATTOM pull < 24h for any active RE package

**Failure action:** surface in Alex's operating feed (CODEX 18) as a warning, not
a page — integrations disconnect legitimately (token expiry, re-auth needed).

### Canary tenant

All canaries run against a dedicated **canary workspace**, not the demo space and
not a real customer workspace. The canary workspace has:
- Tenant ID stored in Secret Manager as `CANARY_TENANT_ID`
- One seeded loan record (so balance sheet is non-zero)
- One seeded transaction (so P&L is non-zero)
- Gmail, Calendar connected with a dedicated `canary@sociii.ai` service account

The canary user's UID is stored as `CANARY_USER_UID` in Secret Manager.

### Where to build

The existing chat canary Cloud Function is at `functions/functions/index.js` (search
for `canary` near the cron/scheduled function section). Extend it rather than adding
a new function — one scheduled function runs all four probes in sequence.

---

## Part 3: Keeping the CODEX itself on pace

This CODEX is only useful if it's read before shipping new AI capabilities. Add it to
the pre-ship checklist for any task that modifies:
- `index.js` model selection or token limits
- Any AI prompt template in `raas/`
- Any new route that calls an external AI API

**Review cycle:** quarterly — same cadence as the capability gap review above.

---

## Sign-off gate

- [ ] Model env vars are in Secret Manager (not hardcoded)
- [ ] Chat correctness probe implemented and running on 30-min cron
- [ ] Canvas data probe implemented and running on 1-hour cron
- [ ] Integration health probe implemented and running on 1-hour cron
- [ ] Canary workspace seeded and tenant ID stored in Secret Manager
- [ ] First quarterly capability gap review complete (Q3 2026 target: web search)
