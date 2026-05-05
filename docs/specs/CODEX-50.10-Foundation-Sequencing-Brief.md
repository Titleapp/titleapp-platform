# CODEX 50.10 — Foundation Sequencing Brief

**Author:** T1 (codebase-validating engineer)
**Date drafted:** 2026-05-04
**Purpose:** One-page execution order across the three foundation specs (50.13 / 50.14 / 50.11). Sean confirmed this ordering 2026-05-04; this brief preserves the rationale.

---

## The eight-step sequence

```
1. Contact webhook tenant filter             [50.13 Layer E]   ~30 min   privacy fix, zero deps
2. DTC schema unified migration              [50.13 Layer A]   ~1 hr     foundation for everything below
3. Hash anchor service                        [50.14 Layers A-C] ~10-12 hr  populates contentHash, builds verifiability
4. Audit-layer version pinning                [50.11 Layer A]   ~1 hr     reads from digitalWorkers; field default "v1"
5. Drive/Vault UI separation                  [50.13 Layers B-D] ~5-6 hr   frontend rebuild on solid backend
6. Crossmint chain anchor                     [50.14 Layer D]   ~3-4 hr   entitled users get chain anchor
7. Improvement Request surface                [50.11 Layer C]   ~6-8 hr   Kent and Ruthie can file
8. Per-message feedback                       [50.11 Layer B]   ~4 hr     last because it depends on auth+session pinning
```

**Total: ~30-37 hr engineering-Claude shipping pace, single sequenced sprint.**

## Why this ordering

### Step 1 first — confidence builder + privacy gap closure
Contact webhook tenant filter is **30 minutes**, **zero dependencies**, and closes an active privacy bug (cross-workspace contact mutation). Shipping it first proves the sequencing is real and hands Sean an immediate delta to test before the bigger work begins. Anyone watching the queue sees motion right away.

### Step 2 — DTC schema migration
Foundation for everything in 50.14 and 50.13's Vault surface. The migration is one script that adds 7 fields (`version`, `parent_dtc_id`, `modification_authority`, `chain_anchor_status`, `chain`, `credentialing_projection_schema`, `contentHash`-as-null) to all existing DTCs. Ships before any code reads these fields, so no read-path needs null-defensive logic. Scope is small (~100 docs in production today, low estimate). Pattern is identical to the canvasTabs backfill from T3 — we have the muscle memory.

### Step 3 — Hash anchor service
The largest single piece of work, but it must run before Vault UI ships and before any chain anchor work. Reasons:
- The hash anchor is the universal default — every DTC, regardless of `blockchainMintingEnabled`, gets a `contentHash` and a Merkle batch. If Vault renders DTCs that don't have hashes yet, the surface looks broken.
- The hash anchor backfill pass populates `contentHash` for all pre-existing DTCs in one shot, completing the schema migration semantically.
- The chain anchor (step 6) is additive on top of the hash anchor — chain anchor doesn't replace it, it complements it. So hash anchor must exist first.

This step bundles 50.14 Layers A (hashAnchor.js), B (dailyBatchAnchor.js), and C (verification endpoint) because they're a cohesive unit.

### Step 4 — Audit-layer version pinning
1-line extensions to `chatSessions` and `messageEvents` writes. Lands here because it doesn't depend on the heavy work above and it's the prerequisite for step 8 (per-message feedback needs `worker_version` to be useful). Field defaults to `"v1"` literal until beta channel ships in v1.1.

### Step 5 — Drive/Vault UI separation
Frontend-heavy. Lands after the schema migration so the Vault surface has fields to render and after the hash anchor so DTCs aren't rendered with empty `chain_anchor_status` badges. Layers B, C, D of 50.13 ship together: workspace scoping for Drive, new Vault surface, modification authority gates, Drive rename + retire dead Vault* components.

### Step 6 — Crossmint chain anchor
Async chain mint via Cloud Tasks for users with `blockchainMintingEnabled === true`. Ships AFTER hash anchor + Vault UI because:
- The marketing claim ("tamper-evident and verifiable") is honest with hash anchor alone — no urgency to add chain.
- Vault UI surfaces `chain_anchor_status` badges; until Vault is rendering, chain status has no visible affordance.
- Crossmint integration is small (~3-4 hr) but the polling/Cloud Tasks setup adds operational complexity better added once the rest is verified working.

### Step 7 — Improvement Request surface
Ships AFTER the foundation because the surface needs the worker landing page to exist (Phase 2's `useWorkerCatalog` already shipped — this just adds a "Suggest Improvement" button to it). The state machine + 4 routes + creator queue surface are bounded work. Kent and Ruthie can start filing requests the moment this lands.

### Step 8 — Per-message feedback
Last because:
- Depends on `worker_version` from step 4 (otherwise feedback is unmoored — unable to tell which version of the worker the user is reacting to).
- Smallest surface change (thumbs UI + `/v1/chat:feedback` route + `workerFeedback/` collection) but lowest urgency individually — collecting signal during the 90 days post-launch is the goal, not before.

## Cross-cutting interactions

### Schema migrations are unified
The 50.13 migration writes 6 fields. 50.14 adds 1 (`contentHash`). Doing them as **one** script is the simpler path — touches each DTC doc once. The script has two phases: (a) write the 6 50.13 fields with computed defaults; (b) leave `contentHash` null for the hash anchor service to populate. This is the actual implementation; the spec docs describe them as separable concerns for review clarity.

### Capability registry interactions
50.14 deprecates `dtc.mint_dtc_venly_v1` and adds `dtc.mint_dtc_polygon_crossmint_v1`. 50.13 doesn't touch the registry. 50.11 doesn't either. Single touch in step 6.

### `worker_version` field on `digitalWorkers` is shared between 50.11 v1 audit pinning and 50.11 v1.1 beta channel
v1 doesn't add the field to `digitalWorkers`; the audit pin defaults to `"v1"` literal. v1.1 adds the field for real and the audit pin reads it. No collision; no rename.

### Firestore rules
- 50.13 closes the contact webhook gap (server-side filter, not a rules change).
- `dtcs` rules stay user/tenant private (no public read like `digitalWorkers/*` from Phase 2).
- `dtcAnchorBatches` (50.14) needs **public read** so verification works without auth — the verification endpoint uses it directly. Rules update bundled with step 3.
- `workerFeedback/` and `improvementRequests/` (50.11) are auth-required, owner/tenant-scoped writes only.

### Cloud Scheduler entries
50.14 adds two new schedulers (`dailyDtcAnchorBatch`, `confirmOpentimestampsReceipts`). 50.11 adds none in v1. v1.1 may add a weekly improvement-digest job per Creator if Sean asks for the lighter Editor option.

## What about Phase 1 worker activation?

Phase 1 (orphan ruleset adoption + 5 new worker registrations per the locked spec) is **gated on this entire foundation landing first**. Sean confirmed this 2026-05-04. The reason: Phase 1 mints DTCs on behalf of new workers (e.g. `Legal Companion` writing contract-review records, the analyst workers writing deal-screen records). Those DTCs need the schema additions, the hash anchor, and visibility in the new Vault surface to be honest. Otherwise Phase 1 lands and the records are invisible.

After step 8, Phase 1 picks up exactly where the spec at `Downloads/CODEX-50.10-Phase1-Orphan-Ruleset-Adoption-SPEC.md` leaves off.

## What about Stripe testing, the formal ADR, the existing Phase 2 work, demo fixtures?

All complete or independent of this sprint:
- **Phase 2 (marketplace activation):** shipped 2026-05-04 — Firestore-backed `useWorkerCatalog` is the source of truth.
- **T3 canvas tabs / T4 demo fixtures:** shipped 2026-05-04.
- **CODEX 50.4/50.5 validation:** complete.
- **Stripe testing + formal ADR:** orthogonal; can run in parallel with this sprint without dependency.

## Risk and rollback

**Per step:**

- **Step 1 (webhook fix):** rollback by reverting the three handler files. Risk: low. Inbound events that fail to resolve a tenant just log and skip — they don't propagate the privacy bug.
- **Step 2 (schema migration):** rollback by deleting the new fields. Existing read paths don't reference them yet. Risk: low.
- **Step 3 (hash anchor):** rollback by disabling the Cloud Scheduler triggers and the verification endpoint. The contentHash field stays populated but unused. Risk: medium — need to verify OpenTimestamps and Merkle library work end-to-end in production before considering shipped.
- **Step 4 (version pinning):** rollback by removing the field from new writes. Existing rows have a "v1" literal that's harmless. Risk: low.
- **Step 5 (Drive/Vault UI):** the riskiest single step. Rollback by reverting frontend commits. Backend stays intact (Vault is read-only against `dtcs`). Risk: medium — UI work tends to surface more issues than expected; allocate buffer time.
- **Step 6 (Crossmint):** rollback by setting `blockchainMintingEnabled: false` for everyone or by short-circuiting the Cloud Tasks worker. Risk: low — async means failures don't block DTC creation, hash anchor still valid.
- **Step 7 (Improvement Requests):** rollback by hiding the Suggest Improvement button. Stored requests stay in Firestore; queue surface goes blank for a session. Risk: low.
- **Step 8 (per-message feedback):** rollback by hiding thumbs buttons. Stored feedback stays. Risk: lowest of the eight steps.

## What ships per "session"

If we keep the post-Phase-2 cadence (one Sean-approved deploy per work session), a reasonable split:

- **Session 1:** Steps 1 + 2 (webhook fix + DTC schema migration). Small but visible delta. Validates approach.
- **Session 2:** Step 3 (hash anchor service). Largest single piece. Probably needs 2 sub-deploys (service code, then daily batch job).
- **Session 3:** Steps 4 + 5 (version pinning + Drive/Vault UI). Audit-pin lands first within session, UI rebuild fills the rest.
- **Session 4:** Step 6 (Crossmint). Smaller than session 2, validates with test mint before considering shipped.
- **Session 5:** Steps 7 + 8 (Improvement Request + per-message feedback). v1 ships complete here.

**Five sessions to v1 foundation complete.** Phase 1 worker activation picks up immediately after.

---

*End of brief. The order above preserves Sean's confirmed sequencing and the rationale that contact webhook ships first as confidence builder + zero-dep privacy fix.*
