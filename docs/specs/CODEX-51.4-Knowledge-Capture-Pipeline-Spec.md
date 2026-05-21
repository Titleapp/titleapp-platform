# CODEX 51.4 — Knowledge Capture Pipeline (Spec)

**Status:** Spec'd. Forward-looking engineering work.
**Author:** Sean Lee Combs + AI workforce
**Period scoped:** Post-Storyhouse (week of 2026-05-26 onward)
**Companion records:** CODEX 51.2 (General Dev), CODEX 51.3 (SOCIII Inc. Setup)

---

## The Gap This Spec Addresses

During the SOCIII Inc. setup period (2026-05-19 through 2026-05-21), substantial operational knowledge was generated through Sean + AI conversations. Examples: Stripe Treasury flow, shareholder loan accounting, Plaid bank linking patterns, predecessor-entity comingling risk, 83(b) timing, warrant program structuring for non-quantifiable recognition, creator equity bounded by per-creator caps, cofounder offer mechanics (RSPA + FAST + side letter split), and dozens more.

This knowledge is exactly what the platform's **Accounting worker**, **Tax worker** (planned), and **Compliance worker** (planned) need to be useful for future founders. It is precisely the body of expert pattern-matching that distinguishes a governed AI worker from a generic AI chatbot.

But right now this knowledge lives in three places that the platform's workers cannot access:

1. **Memory** (file-based at `~/.claude/projects/-Users-seancombs/memory/`) — readable by Claude in future sessions, but workers cannot read it.
2. **Conversation transcripts** (jsonl at `~/.claude/projects/-Users-seancombs/<session-id>.jsonl`) — readable by humans and by Claude with explicit pointers, but not queryable by the platform.
3. **Downloaded documents** (`.docx` / `.md` files in `~/Downloads/`) — static artifacts, not living knowledge.

The gap: **there is no live pipeline from "Sean + Claude solve a real founder problem" → "the platform's Accounting / Tax / Compliance worker is smarter for the next user."** That pipeline must be built deliberately.

---

## What Needs to Be Built

Three jobs that together form the Knowledge Capture Pipeline. Each is a discrete engineering work item.

### Job 1 — Codex Ingestion

**Purpose:** Read AI-conversation transcripts and memory files, identify patterns and rules of thumb that the worker codex should encode, propose additions to the worker codex content, route to a human reviewer (initially Sean) for approval, and on approval merge into the codex.

**Inputs:**
- Conversation transcripts (jsonl)
- Memory files (markdown with frontmatter)
- Pre-existing worker codex content for the target worker

**Outputs:**
- Proposed codex additions (markdown, structured per existing codex format)
- Justification linking each proposed addition to source conversation/memory line(s)
- Review queue for human approval

**Engineering pieces:**
- Conversation parser (jsonl → semantic chunks)
- LLM analyzer with system prompt instructing extraction of "rules of thumb," "patterns," "anti-patterns"
- Codex diff generator
- Review UI integrated into the platform (extend existing Improvement Request surface from CODEX 50.11)
- Approval mechanic + merge

**Estimated effort:** 1-1.5 weeks for v1.

### Job 2 — Rule Extraction

**Purpose:** Identify new RAAS rules implied by AI conversations (e.g., "never use predecessor entity bank account to fund successor entity"), propose them as constraint modules, route to human for review, and on approval add them to the rules engine.

**Inputs:**
- Conversation transcripts (jsonl)
- Existing constraint modules in `constraintRaasModules` collection (per CODEX 50.15 P0-3)
- Worker the rule should attach to (Accounting, Tax, Compliance, etc.)

**Outputs:**
- Proposed RAAS rule definition (in the existing rule schema)
- Tier classification (Tier 0 platform safety, Tier 1 industry regulation, Tier 2 vertical baseline, Tier 3 tenant config)
- Test cases the rule should pass and fail
- Review queue for approval

**Engineering pieces:**
- LLM extractor with system prompt focused on rule patterns (conditional logic, anti-patterns, edge cases)
- Rule schema generator
- Test-case generator
- Integration with existing pre-publish constraint check (CODEX 50.15 P0-6)

**Estimated effort:** 1-1.5 weeks for v1. Builds on existing RAAS infrastructure.

### Job 3 — Worker Fixture Capture

**Purpose:** Capture actual workflow steps from real founder use (the canonical example being this SOCIII Inc. setup), convert them to canvas fixtures + demo data for the relevant workers, so future users of the Accounting / Tax / Compliance worker see realistic worked examples instead of toy data.

**Inputs:**
- Conversation transcripts (jsonl)
- Worker the fixture should attach to
- Existing canvas tab definitions (from CODEX 50.10-T3)

**Outputs:**
- Proposed canvas fixtures (per existing fixture schema)
- Step-by-step demo flows
- Review queue

**Engineering pieces:**
- Workflow extractor (LLM identifies multi-step sequences in conversations)
- Fixture builder (converts to canvasFixtures schema per CODEX 50.10-T4)
- Demo flow generator
- Integration with workerDemoFixtures collection

**Estimated effort:** 1 week for v1. Smallest of the three; leverages existing canvas fixture infrastructure.

---

## Terminal Worker (for Creators and Advisors)

Separate but related: the **Terminal worker** is the platform feature that lets creators and advisors build new workers in a hosted environment with AI assistance, code isolation, and policy-gated approvals.

The three required properties (per Sean's spec):

1. **A — Creator can talk to AI in terminal.** Claude CLI integrated into the per-creator hosted environment.
2. **B — Creator cannot harm code.** Workspace scoping, branch protection, pre-publish constraint check, RAAS audit trail.
3. **C — Sean approves big things only.** Auto-approval policy for low-risk changes; gated review for high-risk changes.

### Architecture

| Layer | Purpose | Implementation |
|---|---|---|
| Hosted dev environment | Browser-based VS Code per creator, on demand | Codespaces or Coder-style; pre-cloned with worker authoring template + Claude CLI authenticated to the creator |
| Workspace scoping | Creator sees only their own worker directory + read-only platform codex | Filesystem-level isolation; auth-gated repo subtree access |
| Branch protection | All creator changes on feature branches; main is structurally protected | GitHub branch protection rules; CODEOWNERS for sensitive paths |
| Pre-publish constraint check | Every change passes RAAS rules engine before merge / deploy | Reuses CODEX 50.15 P0-6 service |
| Auto-approval policy | Decides which changes auto-merge vs route to Sean | New service: policy engine reading change scope + risk signals |
| Audit trail | Every keystroke, Claude conversation, code change logged | Reuses RAAS hash-anchored audit trail |

### Auto-Approval Policy (the "small things" filter)

**Auto-approved without Sean's review:**

- Changes confined to creator's own worker directory
- Changes to creator's worker's rulesets, canvas tabs, codex content
- Documentation updates within the creator's worker
- Test additions
- Anything that passes pre-publish constraint check AND scores below the "complexity threshold" (lines changed, files touched, public surface affected)

**Routed to Sean for review:**

- Any change outside the creator's worker scope (platform core, other creators' workers)
- Any change touching auth, KYC, payments, secrets handling, RAAS rules engine itself
- Any first-time creator's first published worker (human review for debut, then trust grows)
- Any change that fails the pre-publish constraint check OR triggers a compliance/legal/securities flag
- Any change above the complexity threshold

The threshold is a tuning knob. Start conservative; relax per creator as the audit trail shows ten clean auto-approved changes.

### Phased Rollout

| Phase | Period | Scope |
|---|---|---|
| Phase 1 | Week 1-2 | Sandbox extension to support no-code worker editing for non-technical creators; audit trail extended to creator authoring actions; pre-publish constraint check exposed to creator-built changes |
| Phase 2 | Week 3-4 | Hosted Terminal environment (browser-based VS Code) per creator on demand; Claude CLI integrated and authenticated; sandboxed from platform secrets |
| Phase 3 | Week 5-6 | Auto-approval policy engine; Sean's "big things" inbox dashboard; differential RAAS rules for creator-authoring vs creator-publishing |
| Phase 4 | Week 7-8 | Onboard first creators (Eric's son as first technical pilot; Kim and Elise; then post-launch creators) |

### Specific Advisor Onboarding Path

| Advisor | Entry Point | Notes |
|---|---|---|
| Eric Altshuler (and son) | Terminal worker — first technical pilot | Comfortable with terminal; trusted reference for what works and what doesn't |
| Kim Bennett | Terminal worker (Phase 4) or Sandbox (interim) | Technical background through PropertyRadar; can use either path |
| Elise van der Bel | Sandbox first; Terminal worker later | Shopify expertise; not yet Anthropic-experienced; benefits from no-code path |
| Robert Rosenstien | Sandbox primarily | Compliance/IT discipline; not in active build mode |
| Scott Eschelman | Sandbox primarily | RE development focus; may build verticals via Sandbox |
| Ruthie Clearwater | Sandbox primarily | Nursing/EMS domain expertise; non-technical authoring is the natural fit |
| Vishal Kumar, Manpreet Kaur | Terminal worker (already pair-program with Claude) | Existing engagement migrates from raw repo access to Terminal worker once Phase 2 lands; same workflow, with the platform's audit trail and pre-publish gate underneath |

---

## Decision Points Outstanding

1. **Codex Ingestion job priority** — when do we commit engineering bandwidth to building it? It is the highest-leverage forward-looking work because every conversation between Sean and Claude is currently lost to the platform's workers. Until this lands, the platform's knowledge layer does not compound.

2. **Terminal worker phasing** — agree on the 4-phase rollout or compress to a faster MVP? A compressed MVP could ship Phase 1+3 (Sandbox extension + auto-approval) without Phase 2 (hosted Terminal environment), letting creators build via the existing platform UI with the policy gating in place. Faster to ship; less generous to technical creators who want a real terminal.

3. **Auto-approval threshold defaults** — start conservative (most changes need Sean's review) and loosen, or start permissive and tighten if abused? The conservative direction is safer but bottlenecks on Sean's review queue. The permissive direction requires strong RAAS guardrails to prevent damage. Recommendation: start conservative; relax per creator as audit trail demonstrates trust.

4. **Where the ingestion job runs** — as a scheduled Cloud Function on a cadence (nightly?), or triggered on-demand from a UI button in the platform's Admin panel? Cadenced reduces Sean's overhead; on-demand gives more control.

---

## Bottom Line

The platform's value proposition rests on workers that compound knowledge from real founder use. Today, that compounding does not happen — every Sean+Claude conversation generates valuable patterns that vanish into a transcript file. CODEX 51.4 specifies the work needed to close that loop.

Two real engineering builds: the Knowledge Capture Pipeline (three ingestion jobs) and the Terminal Worker (four phases). Combined estimate: 5-7 weeks of focused effort.

The earliest payoff: the Accounting worker, for the next founder forming a Delaware C-corp through Atlas, will know everything Sean learned this week — from the Stripe Treasury opening-balance pattern to the predecessor-entity commingling risk to the 83(b) timing on the founder RSPA. Today, that founder starts from zero. After CODEX 51.4 ships, they start from the corpus.

That is the platform's structural advantage made operational. It is the work of the next sprint.
