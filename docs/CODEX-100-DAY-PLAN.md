# CODEX — The 100-Day Plan (exit-framed)

**Status:** 🟡 **PROPOSED — sign off before any build ships.**
**Owner:** Sean · **Created:** 2026-06-22 · **Window:** ~100 days, self-funded.

---

## 1. The frame (this drives every decision)

- **Goal:** an **acquirable** company in ~12 months. Not a years-long self-serve platform.
- **Money:** **self-funded, low-burn.** Chasing 200K users burns the cash and kills it.
  Affordable path = **3–5 core clients**, a **bulletproof** product for *them*, and a
  **growing patent portfolio.** Do not spend a dollar on mass acquisition.
- **What an acquirer buys:** defensible IP ("MCP but already built" + patents), real
  referenceable traction (the 3–5), a few **excellent** workers, the team, the
  agent-era / Anthropic-aligned narrative.
- **Curation, not floodgates:** keep worker-*creation* **hard/gated** — protects quality
  and lets Ruthie own the U of H relationship.

### Scale tiers — draw the line in the right place (Sean, 2026-06-22)
The mistake is treating "substrate improvements" as deferrable. They are *not* — because:

| Tier | Who | Bar | Build? |
|---|---|---|---|
| **0 · Video** | 1 synthetic persona (Dr. Chen) | demo-grade, scripted OK — it's a sales pitch | demo only |
| **1 · Real client orgs** | **50 nursing educators @ U of H · 350 Medtronic distributors** · BuildSF · aviation/RE | **"this shit has to work"** — per-seat isolation, reliability, the fix-loop, records at scale | ✅ **build now** |
| **2 · Open scale** | internet self-serve, 200K+, open marketplace | full hardened multi-tenant at scale | ⛔ defer (burn trap / acquirer) |

**The substrate work serves Tier 1 — and Tier 1 is the 100-day target.** It is required, not
vision. What's deferred is only **Tier 2** (internet-scale open self-serve). A working
*350-distributor* deployment is a far stronger acquisition asset than any video — so the
substrate *is* the value creation, and the burn is bounded (hundreds of seats, not 200K) and
self-fundable. This whole thread came out of the **Salesforce moment** + Sean living in
**Terminal more than SOCIII**: for 50 educators / 350 distributors who will *never* open a
terminal, the platform substrate has to deliver what Sean currently goes to Terminal for.

### The verb is "turn on," not "build" (Sean, 2026-06-22)
The Tier-1 substrate — multi-tenant DB infra, per-org/per-seat isolation, the scaling
foundation — was **built in Q4 2025.** It's already there; **it has just never been turned
on / wired up.** So the 100-day work is **activate + verify + connect**, not rebuild. This
materially lowers scope and burn.

> ⚠️ **Red-team caveat (and it's a real one here):** "built but never turned on" is *the
> recurring failure pattern* in this codebase — the aviation APIs were paid-for-but-never-
> called; the render pipeline's canvas specs never drove the renderer; multiple "done but
> unwired" substrates turned out to have gaps when finally exercised. So we do **not** assume
> the Q4 substrate works because it exists — **Step 0 is a read-only activation audit**: prove
> it actually does per-org/per-seat isolation (R2) and holds up at Tier-1 scale (50 / 350
> seats) *before* the plan leans on it. Turn-on, then verify at scale — not assume.

## 1b. CORE OPERATING PRINCIPLE — audit-and-turn-on *before* re-coding (Sean, 2026-06-22)

The recurring dysfunction, named: **we keep re-coding what was foundationally built months
ago → then prune the junk that creates → then fight random popups over the canvas and
canvas areas that suck.** The dead-overlay and canvas bugs this whole session were *symptoms*
of exactly this. So the rule for the 100 days:

> **Before writing a line, find what already exists and turn it on.** Discovery precedes
> construction. Re-coding a working foundation is the #1 source of junk, regressions, and
> the canvas garbage. When something "doesn't work," the first hypothesis is *"it was built
> and never wired,"* not *"it needs to be built."*

This isn't only the multi-tenant substrate — it's **every** feature. It's also why the video
can run *ahead* of the polished product (next section): the capability is usually *already
there*, just unwired, so "a couple weeks ahead" is real, not vaporware.

## 2. The 3–5 core clients — and what "bulletproof" means for each

| Client | Vertical | Bulletproof = | Key-person |
|---|---|---|---|
| **U of H** (Ruthie) | Education / med | EDU-001 cohort live, real students, tamper-evident records; *it goes → spreads to academia + medicine* | Ruthie (Sean holds her hand) |
| **Elise** | Retail / EU compliance | Shopify connector + Digital Product Passport + returns worker actually working | Elise |
| **Scott / BuildSF** | Real estate | RE workers (title/parcel/zoning) really work; **advisor agreement signed ✓** | Scott |
| **Sean** | Aviation + RE + IR | Aviation suite + RE + the IR/83(b) worker really work | — |
| *(opt) Megan / Hartbreaker* | Retail/DTC | Shopify-as-engine pilot | Megan |

**Dr. Chen / Meadow Vet = the synthetic DEMO** (videos), not a client.

## 3. Ship list — next 100 days (tight)

1. **Dr. Chen demo + consumer-facing skin** (white-label portal) — **demo-grade, clearly
   a demo** — to record the "why care" videos. Pet-owner skin (R1 = safety *in the reply*)
   + advisor skin.
2. **Advisor affirm link** — light SOCIII skin + their Vault + "approve to your Vault" +
   a chat that helps them put their stuff in the Vault. **Real** (Scott signed; advisors
   onboard for actual paperwork).
3. **MCP integration — real, not hype.** SOCIII as an MCP server: Vault + workers as
   governed resources/tools. Small but genuine — Claude can actually connect + act under
   the rules engine. Credibility artifact for Anthropic / AI angels / acquirers.
4. **★ Alex-dispatches-Code real-time fix loop (CRITICAL — Sean, 2026-06-22).** A client
   chats with Alex ("the eval worker keeps doing X wrong"); Alex dispatches a Code change,
   previews it, and brings it back: "fixed — approve?"; client approves → deployed. **This
   is what makes the workers actually get bulletproof (fast iteration = the bulletproofing)
   AND what makes clients *love* it** — the U-of-H-professor-watches-Alex-fix-it-live moment.
   **Scope for now: per-client worker repos = isolation by separation** (no shared base yet,
   so R2's "change my worker not everyone's" is satisfied structurally). Build the *capability*
   now; the at-scale hardened version is deferred (§4).
5. **Bulletproof the existing workers** for the 3–5 (aviation, RE, Shopify+DPP, vet/edu suite).
6. **Patents** — file provisionals on the genuinely novel inventions as we build (see §5/§6 numbering).
7. **Weekly wins to announce:** U of H; Scott/BuildSF signed + using RE workers; MCP.

## 4. Do **NOT** build (the burn traps — acquirer's job, post-close)

**Defer the *at-scale* version, not the capability.** The real-time-fix loop ships now
(per-client, §3.4); what's deferred is the **scale-hardening**: a single shared base worker
serving *thousands* of self-serve tenants with a fully-isolated overlay/sandbox + open
marketplace. Also deferred: mass onboarding/signup · consumer portal *at scale* · managed
comms (Twilio/10DLC) · mobile app · billing/subscriptions polish. These live as **vision
CODEXes + patents**, not builds.

## 5. Patent workstream ("keep sipping out patents")

File **provisionals on the genuinely novel** — a few strong claims beat a spray of weak ones:
1. **Append-only, owned, on-chain-anchored personal/business record** (the Vault substrate).
2. **Rules-engine-validated AI agent actions** — propose→approve + capability registry.
3. **Base-worker + per-tenant-overlay** multi-tenant AI-worker customization (R2).
4. **RAAS** governance model (rules+AI, model-agnostic executors).
5. **MCP-governed-context provider** — owned context + permission layer for any model.
*As each ships, I flag the invention + draft a provisional-style disclosure.*

---

## 6. RED TEAM — attack the *plan* (not just the code)

🟠 **P1 — demo-vs-real gap (softened by intent, but not gone).** The video's job is to
**show how it works**, not hard-sell — so it's OK for it to run **a couple of weeks ahead**
of the shipped product (the capability is usually *already built, just unwired* — see §1b).
That's honest *if* the gap is weeks, not fantasy. The real bar is **running a whole
university / 350 distributors — not "4 nurses in a corner."** **Mitigation:** keep the
video's lead to ~weeks; the product must *genuinely* catch up to university scale fast; never
let the video imply a finished thing that's actually vaporware. Show-how-it-works ≠ over-claim.

🔴 **P2 — MCP claimed but hollow = you become what you're mocking.** If "MCP integration"
is a thin wrapper, it reads as hype to the one audience (Anthropic) that can tell. **Mitigation:**
ship a *working* MCP server (Claude connects, reads a real Vault, invokes a worker under
the rules engine) before claiming it. Claim exactly what works, no more.

🟠 **P3 — concentration + key-person risk.** 3–5 clients, several relationship-held
(Ruthie→U of H, Elise, Scott). One churn or one stalled relationship craters the traction
story. **Mitigation:** diversify across verticals; get real *usage + records* into SOCIII so
it's sticky, not relationship-held; document each deployment as a referenceable case.

🟠 **P4 — R1 (medical advice) is now *public* in a video seen by "the planet."** Amplifies
liability + the is-this-real question. **Mitigation:** portal-in-video is explicitly a demo;
safety language in every reply; never represented as a live medical service.

🟠 **P5 — R2 bites for real the moment a client customizes.** With real clients editing,
"change *my* worker, not everyone's" is a live bug, not hypothetical. **Mitigation:** for the
100 days keep customization in **Code, per-client repos/branches (manual isolation)** — do
*not* ship hosted editing; the overlay infra is post-sale.

🟡 **P6 — patents can be a false moat.** Provisionals are cheap but a pile of weak/obvious
ones is worthless, and grants take years. **Mitigation:** few strong claims on the truly
novel; remember the working product + traction + trade secret carry as much acquisition
weight as pending IP. Don't over-index on patents.

🟡 **P7 — scope creep vs. runway.** The plan only holds if scope stays tiny. Every new
"wouldn't it be cool" (comms, hosted agent, scale portal) is burn. **Mitigation:** the §4
do-NOT-build list is a hard gate; every build must answer "does this serve the 3–5 or the
sale?" — else it's a CODEX, not a build.

🟡 **P8 — pitching a vision you're explicitly not building.** Leaning the sale on roadmap
(hosted agent, overlay, comms) invites a promise/deliver gap in diligence. **Mitigation:**
be crisp about BUILT (proof) vs. ROADMAP (vision + patents); never blur them.

---

## 7. Sign-off gate

Before anything in §3 ships: **(a)** this plan is approved, **(b)** the consumer portal is
labeled demo-grade with R1 safety-in-reply, **(c)** MCP ships only when a real connect+act
works (P2). The portal route is **wired but un-deployed** pending (a).
