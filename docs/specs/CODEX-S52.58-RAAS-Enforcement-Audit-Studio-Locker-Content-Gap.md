# CODEX S52.58 — RAAS Enforcement Audit: What Guardrails Actually Exist, and Why Most Workers Have Thin Ones

**Status:** AUDIT (2026-08-20), not yet a build plan. Written so this doesn't get lost — Sean's own framing: real content in the Studio Locker is the actual bottleneck, not missing enforcement code.
**Author:** Sean Lee Combs + Claude Code
**Predecessor:** CODEX S52.48 (RAAS/Studio Locker consolidation, still DRAFT), CODEX S52.52 (RAAS Admin Module — the missing content-authoring UI), CODEX S52.57 (superseded into S52.48 — confirmed Studio Locker document injection is real and universal).

---

## Why this exists

Sean's diagnosis, stated directly and confirmed correct by this audit: most workers have thin guardrails not because the enforcement *code* is missing, but because **the content those guardrails need to check against has never been properly researched and populated.** Accounting is the one strong exception — Sean personally spent real time on it after Max failed at basic accounting, so real GAAP rule content exists and is wired in. Aviation, by his own account, needs "massive content" and doesn't have it yet. This audit confirms that pattern in the code, precisely, rather than leaving it as an impression.

## What actually exists — three distinct enforcement layers, verified directly

**Layer 1 — `raas/raas.engine.js`'s `validateChatOutput`**, regex pattern-matching against the AI's output text, called from the main per-worker chat handler (`index.js` ~6722–6764).

Real, worker-specific coverage exists via `WORKER_RULESET_MAP` (`raas/raas.engine.js` ~514) for: `platform-accounting`, `platform-hr`, `platform-marketing`, `platform-legal`, `platform-contacts`, `re-salesperson`, `cre-analyst`, `investor-relations`, the 5-worker Makai nursing suite, and ~11 aviation worker slugs.

**Confirmed to have zero worker-specific coverage** — not in the map at all, falls through to 3 generic rules only (`no_guaranteed_returns`, `no_specific_legal_advice`, `no_tax_guarantees`): title/escrow workers (`re-title-search-001`, `re-escrow-001` — the exact worker CODEX S52.56's Garcia customer portal routes through), auto dealer, government, education, DPP/battery, veterinary, brokerage.

**Even where a rule fires, remediation is weak.** On a violation, the code doesn't remove or regenerate the offending claim — it appends a disclaimer sentence after it (`index.js` ~6743–6761: `aiText += "\n\n*This is informational guidance only..."`). The bad claim itself stays in the response, verbatim, with a disclaimer bolted on.

**Layer 2 — a stronger check that can actually block a response** (`services/raas/constraintCheck.js`, CODEX 50.17 P0-6, `index.js` ~6767–6795). Can genuinely replace the response (`block_with_explanation`) or flag it prominently — but only runs when `constraintModulesApplied` (real, admin-authored `constraintRaasModules` content) is loaded for that worker. Per CODEX S52.48's inventory, **exactly one worker currently has this: `platform-accounting`** (`accounting_gaap_v1`). Every other worker never reaches this layer, regardless of what it says.

**Layer 3 — Alex's dedicated enforcement** (rule pack + input/output filter). Genuinely well-designed — detects violations, retries with violation context, regenerates up to twice, falls back to a safe response if still violating. **Confirmed today: never wired into Alex's actual live response path.** The files were deleted as dead code in today's cleanup pass (except the rule pack itself, held back — its handoff-trigger patterns for safety-critical domains like aviation/clinical/legal questions aren't duplicated anywhere in Alex's live prompt stack and shouldn't be lost without porting them somewhere real first).

**One more real, working piece, not fully traced**: a separate `handleAIChatFallthrough` function (`index.js` ~1441–1471) calls the same engine with genuine retry-and-regenerate behavior (not just disclaimer-append) — but it's a narrower fallthrough path, not the main worker-chat handler most conversations go through. Worth understanding when this path actually fires, as a follow-up.

## The real bottleneck, per Sean's own diagnosis — confirmed, not just asserted

The enforcement *mechanism* (Layers 1 and 2) already exists and is reasonably well-built. What's missing is:
1. **`WORKER_RULESET_MAP` coverage** for entire verticals (title/escrow, auto, government, education, DPP, vet, brokerage) — zero domain-specific rules today.
2. **Real `constraintRaasModules` content** for anything beyond accounting — the admin-authoring UI to even create this content doesn't exist yet (CODEX S52.52's whole finding: full backend CRUD, zero frontend).
3. **Real Studio Locker documents** (the tenant-uploaded knowledge layer, confirmed working end-to-end today per S52.48/S52.57) populated per vertical — aviation specifically, per Sean, needs the real FAA/POH/AFM/ops-spec content it doesn't currently have, not just the plumbing to inject it (which already works).

This is a content-authoring problem, not a missing-engineering problem. The engineering to wire real content in, once it exists, is already built for at least the Studio Locker path (universal) and partially built for `constraintRaasModules` (works for accounting, no way for anyone else to author more yet).

## Open decisions / next steps — not resolved here, tracked for later

- **Priority order for content population** — Sean's stated priority is aviation next ("should have massive content"), given accounting's already done. Worth confirming the full priority order across verticals before starting.
- **Whether to build the S52.52 RAAS admin UI first** (so content authoring doesn't require an engineer running a one-off script each time) before or alongside populating aviation's content — doing the UI first means aviation's content goes through the real path from day one rather than needing a second migration later.
- **The weak-remediation problem in Layer 1** (disclaimer-append instead of block/regenerate) — worth deciding whether this should be strengthened to match Layer 2's block behavior, independent of the content-population work, since it affects every worker currently in `WORKER_RULESET_MAP` today.
- **`alex-rule-pack-v1.js`'s handoff-trigger patterns** — port into Alex's live prompt stack (or wherever handoff logic should live) before the file is deleted; not done yet, flagged in today's cleanup pass.
- **Title/escrow's zero coverage** is the most immediately relevant gap given today's Garcia customer-portal work (CODEX S52.56) routes real customer-facing chat through `re-title-search-001`, which has no rules mapped at all today.
