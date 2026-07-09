# Kent — Solar Worker Portfolio Brief

**From:** Sean Combs  
**For:** Kent + Claude Code  
**Subject:** Solar Worker Build — 3-Worker Portfolio

---

## What We're Building

A portfolio of three related solar workers. Each is standalone but they share a common data story:

### Worker 1 — Grid + Real Estate Solar Optimizer
**Slug:** `solar-grid-optimizer`  
Analyzes grid interconnection nodes, electricity demand curves, and real estate portfolios to recommend optimal solar deployment sites. Primary use case: real estate owners and developers who want to size solar for a property, balance against grid capacity, and model the economics.

**Key inputs:** property address, utility provider, current/projected electricity demand  
**Key outputs:** recommended solar capacity (kW), estimated ROI, grid export potential, interconnection feasibility

### Worker 2 — Solar Adoption Tracker  
**Slug:** `solar-adoption-tracker`  
Surfaces ATTOM data showing which properties already have solar installed. Useful for competitive intel, lead scoring, and understanding market penetration by ZIP code or neighborhood.

**Key inputs:** geography (address / ZIP / county), property type  
**Key outputs:** solar-installed property list, penetration rate, install year distribution, owner contacts

### Worker 3 — Solar Sales Targeting  
**Slug:** `solar-sales-pitch`  
Profiles property owners who are likely solar candidates — high electricity cost exposure, good roof orientation, no solar yet, owned (not rented), income band in range. Generates a personalized outreach narrative.

**Key inputs:** target geography or property list  
**Key outputs:** scored prospect list, personalized pitch copy per prospect, outreach email draft

---

## Fork / Setup

**You are on the full-platform fork.** This gives you full access to build workers, iterate specs, and run Claude Code against the live codebase.

Your fork lives at: `https://github.com/[your-github-username]/titleapp-platform`

**If you haven't forked yet:**
```
git clone https://github.com/SOCIII-Inc/sociii-sdk.git
```
The SDK repo has everything you need for the creator setup flow.

**The repo you should be working in for these solar workers is the SDK repo above** — `SOCIII-Inc/sociii-sdk`. DM Sean to confirm you have access if you're seeing permission errors.

---

## Your Workspace

Your account `kent@sociii.ai` is already provisioned and you have your own SOCIII workspace. Alex reports to you directly in that workspace — she does not route through Sean. If Alex ever says she "only talks to Sean," that's a bug (was fixed). Open a new chat with Alex and she should greet you as Kent.

**If Alex still says she only knows Sean:** Log out, clear browser cache, log back in with `kent@sociii.ai`. The workspace state is keyed to your UID.

---

## How to Work: CODE + Alex + Claude Chat

These three tools are complementary. Here's the intended workflow for building your solar workers:

### 1. Claude Chat (this conversation or claude.ai)
Use for: **thinking, design, spec drafting, architecture decisions**

When you have a question like "how should the grid optimizer model interconnection costs?" — talk it through here first. Claude will help you design the data model, decide what ATTOM fields to use, and write the worker spec.

### 2. Alex (inside SOCIII — your COS)
Use for: **in-product testing, running your worker against real data, market research**

Once a worker is published, open it in SOCIII and talk to Alex. Say "Run the solar adoption tracker for ZIP 89104." Alex will call the worker tools and surface real ATTOM results. This is your live QA loop.

### 3. Claude Code (terminal, in the repo)
Use for: **implementation — writing specs, backend handlers, canvas components**

Run `claude` from the repo root. Give it the spec you designed in Claude Chat and ask it to:
- Create the worker spec file at `creators/solar-grid-optimizer/spec.md`
- Wire the ATTOM data handler in `functions/functions/raas/`
- Build the canvas component

**Typical build loop:**
```
Claude Chat → design the worker
→ Claude Code → implement the spec + handlers
→ Alex → test it live in SOCIII
→ Claude Chat → iterate on edge cases
→ Claude Code → push fixes
```

---

## Starting Points in the Codebase

| What | Where |
|------|-------|
| Existing ATTOM handler (RE workers) | `functions/functions/raas/raas.handlers.js` |
| ATTOM data service | `functions/functions/services/attom/` |
| Worker spec examples | `creators/` (Ruthie's nursing worker = good reference) |
| Canvas component examples | `apps/business/src/components/` — see `RealEstateCanvas.jsx` |
| Backend routes | `functions/functions/index.js` — all routes are in one file |
| Worker catalog entry | `functions/functions/raas/raas.store.js` |

The real estate workers (CA + NV) already pull ATTOM property data — the Solar Adoption Tracker (Worker 2) should reuse that same data path. When Claude Code asks where to add the solar-specific route, point it to the ATTOM handlers.

---

## First Task for Claude Code

Paste this into Claude Code when you're ready to start:

```
I'm building a portfolio of 3 solar workers for SOCIII. Start with Worker 2: the Solar Adoption Tracker.

Goals:
- Create the worker spec at creators/solar-adoption-tracker/spec.md
- The spec should define: data inputs (address/ZIP), ATTOM fields to query (solar panel presence, install year, property owner), canvas layout, and Alex tool descriptions
- Reference the existing real estate workers (raas/real-estate/) for the spec format
- Do NOT implement handlers yet — just the spec and catalog entry

Worker slug: solar-adoption-tracker
Jurisdiction: US (start national, not state-specific)
Vertical: real-estate (solar sub-vertical)
```

---

## Notes on Worker Autonomy

These workers are **your workers, in your workspace.** Sean sees them as a separate tenant — your data does not cross into SOCIII Inc's data. The workers you build and publish will show up in your SOCIII workspace and optionally in the marketplace if you choose to list them.

If you want Sean to review a canvas or spec, just share a screenshot or DM the spec file — no special access is needed on either side.

---

## Open Questions to Resolve With Sean Before Building

1. **ATTOM solar data fields** — does our ATTOM subscription include solar install indicator? Sean to confirm which fields are available.
2. **Grid data source** — Worker 1 needs a grid interconnection API. EIA (free/public) or a paid provider? Sean to decide.
3. **Target geography for launch** — US-national or Nevada-first (NV is where the demo workspace is)?
4. **Sales targeting data** — Worker 3 needs electricity cost data. Sean to confirm if we're using EIA utility rate data or a 3rd-party source.

---

*File generated 2026-06-30. Feed this to Claude Code as context before starting the solar build.*
