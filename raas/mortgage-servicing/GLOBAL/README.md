# Mortgage Servicing (MSR) — GLOBAL compliance knowledge base
# Path: raas/mortgage-servicing/GLOBAL/README.md

Level 2 vertical baseline for the MSR Servicing & Compliance Worker (`msr-servicing-001`, CODEX S52.60). Federal only — Phase 1.

## What's here

| File | Covers |
|---|---|
| [`early-intervention-loss-mitigation.md`](./early-intervention-loss-mitigation.md) | 12 CFR 1024.39, 1024.41(c) |
| [`error-resolution.md`](./error-resolution.md) | 12 CFR 1024.35, 1024.36 |
| [`escrow-accounts.md`](./escrow-accounts.md) | 12 CFR 1024.17 |
| [`force-placed-insurance.md`](./force-placed-insurance.md) | 12 CFR 1024.37 |
| [`payment-crediting-statements.md`](./payment-crediting-statements.md) | 12 CFR 1026.36(c)(1)(i), 1026.41 |

Every citation in these files was independently verified against consumerfinance.gov and law.cornell.edu on 2026-08-21 — see CODEX S52.60 §2 for the verification record. **This is the entire verified rule set for Phase 1.** Nothing beyond these 5 files and 8 citations is active.

## Explicitly not here (yet)

**State-level servicing law.** Enforcement in this space is shifting toward state AGs, which makes this the single most valuable thing to build correctly — and the single largest real content project, not a schema exercise. No state rule is sourced, drafted, or implied by anything in this directory. When state files are added, each one needs the same citation-verification discipline as the federal files here, plus an ongoing maintenance owner (servicing law changes — this can't be a one-time pull).

## Enforcement

The actual block-capable enforcement of these rules lives in `functions/functions/raas/rulesets/msr_servicing_v1.json`, registered against `msr-servicing-001` in `raas/raas.engine.js`'s `WORKER_RULESET_MAP`. These markdown files are the knowledge/citation layer the worker's prompt draws from; the JSON ruleset is what can actually block an output.

## Non-goals (repeated here so a knowledge-base browse doesn't lose the framing)

This worker services loans. It does not represent, track, or facilitate MSR ownership transfer, ESS strips, or any tokenized instrument, and has no token/NFT/blockchain functionality of any kind. It is not investor-facing and does not support a capital raise. See CODEX S52.60 for the full non-goals list.
