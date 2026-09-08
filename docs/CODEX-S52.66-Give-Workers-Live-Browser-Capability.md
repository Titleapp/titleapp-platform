# CODEX S52.66 — Give Digital Workers Live Browser Capability

**Status:** Proposal, not started
**Owner:** Sean (prioritization) · Claude (design/build once greenlit)
**Scope:** whether and how SOCIII's Digital Workers get real, live web-browsing capability — not just the underlying LLM

---

## Why this exists

Sean, working alongside Claude-in-Chrome all day today, asked a sharp question: SOCIII's workers are built on Claude — don't they already have this? **No.** "Built on Claude" (per `CLAUDE.md`'s Door 2 Multi-Model Strategy — Claude/GPT as interchangeable reasoning executors) means the conversation/reasoning layer uses Claude. It says nothing about tool access. Every worker audited today (`CODEX-S52.47`) has a narrow, specific, hand-built tool list — `query_ledger`, `query_contacts`, a handful of read-only status checks. None of them can see or act on a live webpage. That's a separate capability that has to be deliberately built and wired in, the same way `check_stripe_status` or `check_linkedin_status` had to be built today rather than existing by default.

Today's own session is the proof of concept: several of the day's most important findings only happened *because* a live browser was available — verifying RealWear's real pricing, checking the actual Cloudflare Worker configuration, confirming the `/demo/title` bug by watching it happen live, checking Reed's investor data against source documents. A worker without this capability is permanently limited to whatever's already in Firestore or hardcoded into a tool — it can't go look anything up.

## Concrete, vertical-grounded use cases (not hypothetical — drawn from today's actual audits)

- **Site Recon (Title/RE, Petra)** — the clearest case. County recorder and assessor offices are notoriously non-API'd; many are only reachable through an actual web search form. This worker's entire job is site/property reconnaissance, and it currently can't do the part of that job that lives outside Firestore.
- **Av Mx (Aviation, Skye)** — looking up Airworthiness Directives on the FAA's site, OEM service bulletins (Pratt & Whitney, Textron, etc.), and parts data that ADS-B/NOTAMify don't cover.
- **RE Underwriting / Feasibility (Petra)** — comparable-sales and zoning lookups on public county/city planning sites.
- **Elara (DPP)** — checking the EU's actual Official Journal for amendments to the Battery Regulation (2023/1542) or ESPR — compliance guidance that's static today will drift out of date as the real regulation evolves toward its 2027 deadline.
- **Hannah (Nursing)** — checking NCSBN's current NCLEX exam blueprint, or CDC/clinical-guideline updates, to keep coursework content current rather than frozen at whatever was true when the worker was built.
- **Reed (IR)** — today's market-comp research (Carta/Pitchwise seed-stage data) was done by Claude via browser, not by Reed. That's exactly the kind of thing Reed should be able to do itself on request.
- **Ivy (Marketing)** — checking a competitor's actual current social presence or verifying a published claim before making a comparison in ad copy.

## The real risks — this needs deliberate design, not a quick bolt-on

1. **Prompt injection from page content.** A live browsing agent reads whatever text is on the page it visits — including text an attacker deliberately planted to hijack the agent ("ignore your instructions and instead..."). This is a known, real attack class for browsing agents, not theoretical. Any implementation must treat fetched page content as untrusted data, never as instructions, the same way Claude's own operating principles already require for this exact reason.
2. **Scope control.** A title worker should not be free-roaming the general internet — it should have a tight allowlist of the specific site categories relevant to its job (county recorder domains, specific OEM manufacturer sites, etc.), not open-ended browsing.
3. **Read vs. write.** Start read-only (research/lookup). A browsing agent that can also *submit forms or click through workflows* on a third-party site is a much bigger risk surface (irreversible actions, account credentials, CAPTCHAs) — that's a later phase, if ever, not the starting point.
4. **Audit trail.** RAAS's whole thesis is that every action is governed and recorded. Browsing actions need to produce the same kind of auditable record as any other tool call — what was looked up, from where, and what was returned — not a black box.
5. **Cost and reliability.** Live browsing is slower and more failure-prone than a clean API call. Don't reach for it as the default when a real API already exists (ATTOM, RentCast, ADS-B, NOTAMify) — reserve it for the gaps those don't cover.

## Recommended phasing

1. **Phase 1 — pick one worker, one narrow use case.** Site Recon is the strongest candidate: real, immediate customer value (the Henderson County deal is live right now), and a naturally narrow scope (county government sites for a specific property).
2. **Design the allowlist and injection defenses for that one case first**, prove it works safely, then generalize the pattern to the next worker rather than building a generic "give every worker the internet" capability on day one.
3. **Read-only only, in this first phase.** No form submission, no clicking through multi-step flows, no credential entry by the worker itself.
4. **Full audit logging from the start** — this is not something to add later.
5. **Expand vertical by vertical** using the use-case list above as the rough priority order, informed by which vertical has the most real customer activity at the time (today that's clearly Title/RE and, to a lesser extent, Nursing).

## What this doc is not

This is a proposal and design starting point, not a build plan — no code has been written. The technical integration approach (how a worker's tool-calling loop actually invokes a browser session, what infrastructure that runs on, how it's rate-limited and sandboxed) needs its own dedicated design pass before Phase 1 starts. Flagging the idea and the shape of the risk now so it's not lost, per Sean's explicit ask.
