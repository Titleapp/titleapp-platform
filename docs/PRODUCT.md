# SOCIII — Product & Platform Memo

**Date:** 2026-06-27 (updated)
**Status:** Current
**Brand:** SOCIII (not TitleApp — that entity is wound down)

---

# 1. What SOCIII Is

SOCIII is a governed integration platform. Domain experts — nurses, pilots, real estate attorneys, dealership operators, accountants — describe the rules of their work in plain conversation. The platform composes an AI worker that runs inside those rules, connects to the systems they already use, records every output in an append-only audit trail, and earns them revenue when colleagues subscribe.

The platform is not a dashboard. It is not a chatbot. It is a conversation-driven execution layer where:

- **Alex** (Chief of Staff) is the primary interface — present in every workspace on signup, routes between workers, and knows the user's context.
- **Workers** are domain-specific AI agents, governed by a rules engine, that do defined professional work.
- **Connectors** link those workers to the user's existing tools — email, calendar, drive, CRM, accounting — so the worker acts on real data, not fixtures.
- **Vault** is a personal append-only record store — every meaningful output becomes a permanent, provable record.

---

# 2. The Three-Layer Architecture

```
[User / Alex Chat]  →  [Rules Engine (RAAS)]  →  [Connectors + Record Layer]
```

**Layer 1 — Conversation.** Every interaction begins in chat. Alex handles routing, context-building, and the approval gate. Structured objects (canvases, reports, records) render inside the conversation after Alex proposes them. Nothing is committed without explicit user consent.

**Layer 2 — Rules Engine (RAAS).** Every AI output passes through the rules engine before it reaches the user. Rules are encoded by domain experts. The model proposes; the rules validate; only validated outputs surface. Model-agnostic — Claude, OpenAI, Gemini are interchangeable executors.

**Layer 3 — Connectors + Record Layer.** Workers act on real systems. Outputs become records. Records are immutable.

---

# 3. User Types

## Business Workspace Owner

Wants: workers that run their business, connected to the tools they already use, without a dev team.

Gets: Alex (Chief of Staff), all workers in the catalog, Google Calendar / Gmail / Drive / YouTube connected, accounting and HR workflows, a canvas that shows real data.

Does not want: another dashboard to learn, AI outputs they can't trust, tools that don't talk to each other.

## Domain Expert / Creator

Wants: to monetize the judgment they've built over 20 years.

Gets: Sandbox to build a worker in a conversation, Distribute to publish it, 75% of every subscription, 20% of data fees.

Does not want: to write code, to maintain software, to deal with infrastructure.

## Enterprise / Institutional Client

Wants: workers that are compliant with professional rules, auditable, and isolated per org and per seat.

Gets: per-tenant isolation, RAAS rules engine with vertical-specific modules (HIPAA, FAR/AIM, state RE law, etc.), append-only audit trail, role-based access.

Does not want: a general-purpose AI that ignores regulations, or outputs that can't be proved to a regulator.

---

# 4. The Integration Ecosystem

SOCIII is a governed integration hub. Connectors are not bolt-ons — every connector runs through the same rules engine that governs the AI workers. Connecting Gmail doesn't just give Alex access to email; it means Alex can read, summarize, draft, and send under the same rules that govern every other worker action.

**Live (June 2026):**
- Google Calendar — Alex reads schedule, proposes events, confirms before creating
- Gmail — Alex reads inbox context, sends on behalf of user, syncs contacts
- Google Drive — Alex browses and imports documents, contracts, and files
- YouTube — Post, schedule, and manage video content through the Marketing worker

**Coming Soon:**
- Shopify — Orders, products, customers
- Microsoft OneDrive — File sync and document import
- Microsoft Outlook — Email and calendar (Microsoft suite parity)
- Salesforce CRM — Customer data sync
- QuickBooks — Financial data and invoices

**MCP Server (live Q2 2026):**
SOCIII operates as a Model Context Protocol server. Claude, and other MCP-compatible AI assistants, can connect to a user's Vault, invoke workers, and execute under the rules engine. This is not a demo — it is in production. Any user who connects Claude Desktop to SOCIII gets governed access to their entire worker catalog.

The trajectory toward 100+ integrations is the compounding moat: every new connector increases the surface area where workers can act, which increases the value of every existing worker.

---

# 5. Core Product Surfaces

**Alex (Chief of Staff)**
The primary UX. Alex is in every workspace on signup, knows the user's context (workspace, workers, Vault, connected accounts), routes between workers, and serves as the approval gate for any consequential action.

**Sandbox**
Seven-step worker authoring flow: Discover → Design → Build → Test → Preflight → Distribute → Grow. A domain expert describes their work in conversation; the platform composes a worker. No code required.

**Vault**
Personal append-only record store. Every meaningful output — a logbook entry, a signed document, a DTC, a learning record — files into the Vault. Records are never overwritten. Optionally anchored to a public blockchain for third-party verifiability.

**Drive**
Connected cloud storage. Workers can read documents from Drive, file outputs back to Drive, and use Drive as the document layer for any workflow.

**Canvas**
The right-side panel. Structured data rendered in context — property records, financial reports, compliance checklists, patient records, vehicle histories — specific to the active worker and the user's real data.

---

# 6. Active Verticals (June 2026)

1. **Aviation** — CoPilot, MX (Maintenance), Dispatch; Part 135/91 RAAS rules; NOTAM and ADS-B live
2. **Real Estate** — Title, Parcel Atlas, Land Use, CE courses; ATTOM data live; CA and NV rulesets
3. **Healthcare / Education** — Nursing student evaluation, learning records, FERPA-aware; nursing LMS integration in progress
4. **HR / Legal / Compliance** — HR worker, IR worker (83(b) tracker, cap table, investor outreach), Paralegal
5. **Finance / Accounting** — P&L, Cash Flow, Balance Sheet from real transactions; Stripe connected
6. **Auto Dealer** — VIN-first vehicle lifecycle, IL title rules, recall/lien checks
7. **Marketing / Content** — Campaign manager, social scheduling, YouTube posting, creative image generation
8. **Creator / Sandbox** — Worker authoring, distribution, earn model

---

# 7. The 100-Day Roadmap (June–September 2026)

**Onboarding first enterprise clients.** First institutional clients across healthcare education, medical distribution, and real estate development are beginning onboarding in H2 2026. The bar is not pilot — it is production deployment at scale, with per-seat isolation, real records, and a fix loop that lets clients improve workers without touching Terminal.

**MCP + Integration expansion.** The MCP server is live. The connector roadmap extends through Microsoft, Salesforce, Shopify, and specialized vertical APIs. The trajectory is toward 100+ integrations by end of 2026.

**Alex-dispatches-Code.** The real-time worker improvement loop: client chats with Alex reporting a worker issue, Alex proposes a fix, client approves, fix is deployed. This is how enterprise clients get bulletproof workers without an implementation team.

**Patent continuation.** Additional provisionals on the connector/MCP governance architecture and the persona-aware worker composition pipeline.

---

# 8. What Makes This Defensible

The integration moat is new and not in the original patent filings. Every connector that runs through the rules engine is a governed integration, not a raw API call. This is what vertical SaaS competitors can't replicate quickly: their integrations are raw data pipes. SOCIII's integrations are pipes with a rules engine on top.

The compounding dynamic: more connectors → more surface area for workers → more value per worker → more creator incentive to build → more workers → more connectors needed. The flywheel is now connector-led, not just worker-led.

---

# 9. What SOCIII Is Not

- Not a dashboard app (Alex is primary; canvas is secondary)
- Not a general-purpose chatbot (every worker has scoped rules)
- Not a raw API integration tool (every connector is governed)
- Not a services business (workers scale without an implementation team)
- Not a blockchain product (chain anchoring is infrastructure, never UX)
