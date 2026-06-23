# CODEX Surface 7 — Distribution in the Answer-Engine Era (parallel track)

**Status:** ⚪ parallel track (task #78) · **Owner:** Sean · 2026-06-22
**Origin:** Sean's hike question — "as search changes, where Google/Claude/OpenAI *are* search
and give answers, how do we make it so the LLM can crawl the RAAS for our workers, and how do we
promote our worker solutions?" Answer: yes, it's real — and it rides free on the MCP work (Surface 4).

---

## Objective
When someone asks an LLM "who can verify a title / run a nursing eval / value my aircraft," a
SOCIII **worker** is the governed tool the model discovers and invokes — better than ranking #1 in
blue links. SOCIII becomes a *tool the LLM calls*, not a *page it summarizes*.

## The thesis
- **MCP IS the crawl/discovery channel.** An LLM reads an MCP server's tool manifest (≈ a real,
  enforced `capabilities.json`) → it can *list and invoke* SOCIII workers. Listing in MCP registries
  = distribution. This is the same artifact as Surface 4 — build once, two payoffs (moat + reach).
- **GEO/AEO** (answer-engine optimization) is the public-web complement: public worker pages +
  `llms.txt` + schema.org markup so the crawlers that feed the answer engines find + describe the
  workers correctly.
- **Punchline:** SEO ranks a page; this makes SOCIII the *action* the answer engine takes. The
  governed/audited invocation (Surface 4) is exactly what an LLM needs to trust calling a tool.

## What's built vs. the gap
**Built:** RAAS catalog (`raasCatalog`), worker docs, the `/v1` API, public worker visibility tiers
(#26). **Gap:** no MCP server (Surface 4 T6), no `llms.txt`, no public worker pages with schema, no
registry listings.

## Turn-on tasks (cheap, ride on Surface 4)
- [ ] **T1 — Public worker page** per published worker (what it does, inputs, governance) — the
      GEO/AEO landing surface; reuse worker spec docs.
- [ ] **T2 — `llms.txt`** + schema.org markup so answer-engine crawlers describe workers correctly.
- [ ] **T3 — List the MCP server** (Surface 4 T6) in MCP registries once it's real.
- [ ] **T4 — Measure:** can Claude/GPT, given the manifest, discover + correctly describe a worker?

## RED TEAM
- 🟠 **RT1 — Early/emerging = easy to over-invest** in a channel with no traffic yet. **Mitigation:**
  position *cheaply*; it rides free on Surface 4. Don't build a marketing engine — build the manifest
  + a few pages and list them.
- 🟠 **RT2 — Exposing workers for discovery widens the attack/abuse surface** (anyone's LLM invokes
  them). **Mitigation:** Surface 4's auth + rules + audit gate every invocation; public = *discoverable*,
  not *ungoverned*. Discovery ≠ free execution.
- 🟡 **RT3 — Over-claiming "LLM-native distribution"** to investors when it's nascent. **Mitigation:**
  frame as *positioned early on the right rail*, not as a traffic source today (honest P1/P2 posture).
- 🟡 **RT4 — Distracts from the 3–5 clients.** **Mitigation:** strictly parallel + cheap; if it
  competes for time with Surface 1/6, it loses.

## Sign-off gate
Only after Surface 4 T6 (real MCP server) exists. Public pages + `llms.txt` are cheap and can ship
anytime; registry listing waits for a working server. Keep total investment small.
