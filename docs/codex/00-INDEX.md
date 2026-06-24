# CODEX — Master Index (the 100-day turn-on)

**Status:** 🟢 active index · **Owner:** Sean · **Created:** 2026-06-22
**Frame:** see [`CODEX-100-DAY-PLAN.md`](../CODEX-100-DAY-PLAN.md) — exit in ~12mo, self-funded,
3–5 core clients, curate not flood, keep sipping patents.

---

## How to read this

The 100-day plan is **one big thing broken into bite-size surfaces** so we *finish*
things instead of carrying a laundry list that never gets done (Sean, 2026-06-22). Each
surface below is an **independent, shippable CODEX** with: objective · what's-built-vs-gap
(grounded in the 2026-06-22 audit) · turn-on tasks · its own red-team · sign-off gate.

**Operating principle (non-negotiable):** before writing a line, find what already exists
and **turn it on**. The audit proved every surface is "built but never turned on." Re-coding
a working foundation is the #1 source of junk. See 100-DAY §1b.

## The audit verdict (2026-06-22, 5 read-only sweeps)

Foundations exist on all 5 surfaces. Three real wiring-gaps bite at Tier-1 scale; **R2 is the
keystone** — it blocks the portal, the fix-loop, and the "350 distributors" promise.

| # | Surface | Built? | The gap | Blocks |
|---|---|---|---|---|
| 1 | **Substrate / Isolation (R2)** | per-tenant store + gate exist | runtime serves GLOBAL `digitalWorkers/{slug}`; tenantId spoofable on un-gated routes | **everything** |
| 2 | Canvas collapse | renderer intact | 2 mounts + 6 drivers + dead overlay | polish |
| 3 | Chat-Modify / Alex-dispatches-Code | API + RAAS + tenant store | round-trip not assembled; unsafe until #1 | the Salesforce moment |
| 4 | MCP + Audit (moat) | anchoring REAL + on cron | capabilities.json unread; auditLedger = test stub; no MCP server | the sale memo |
| 5 | Consumer surfaces | ClientPortal prototype | unwired; inherits R1/R2/R3 | the "why care" videos |

## Surfaces (build order)

1. [`01-substrate-isolation.md`](01-substrate-isolation.md) — 🔴 **keystone, do first**
2. [`02-canvas-collapse.md`](02-canvas-collapse.md) — quick win, unblocks clean demos
3. [`03-chat-modify-overlay.md`](03-chat-modify-overlay.md) — depends on #1
4. [`04-mcp-audit.md`](04-mcp-audit.md) — the moat; lead with what's real
5. [`05-consumer-surfaces.md`](05-consumer-surfaces.md) → detail in [`../CODEX-CUSTOMER-PORTAL.md`](../CODEX-CUSTOMER-PORTAL.md)
6. [`06-worker-bulletproofing.md`](06-worker-bulletproofing.md) — make the 3–5 clients' workers really work
7. [`07-answer-engine-distribution.md`](07-answer-engine-distribution.md) — parallel track (task #78)
8. [`08-patents.md`](08-patents.md) — file as each surface ships
9. [`09-confidentiality-firewall.md`](09-confidentiality-firewall.md) — 🟢 **shipped 2026-06-23** — data-silo sanctity: no customer Alex recites SOCIII internals; company status from real data, not hardcoded prose

## Status legend
🟢 turned on & verified · 🟡 partially wired · 🔴 gap confirmed · ⚪ not started
