# CODEX 50.14 — Chain Anchor (Crossmint) + Hash Anchor (Universal) (SPEC)

**Author:** T1 (codebase-validating engineer)
**Date drafted:** 2026-05-04
**Status:** Decisions locked. Ready to execute. Sequencing per cross-cutting brief — runs after the 50.13 DTC schema migration so `contentHash` and `chain_anchor_status` fields exist on every DTC.
**Source memo:** [CODEX-50.14-Chain-Anchor-Hash-Anchor-Memo.docx](../../Downloads/CODEX-50.14-Chain-Anchor-Hash-Anchor-Memo.docx)
**Companion specs:** [CODEX-50.13 Drive/Vault/DTC](CODEX-50.13-Drive-Vault-DTC-Logbook-Integration.md), [CODEX-50.11 Worker Improvement Loop](CODEX-50.11-Worker-Improvement-Loop.md)

---

## What we're doing

Two anchor systems on every DTC:

1. **Universal hash anchor.** Every DTC, regardless of `blockchainMintingEnabled`, gets a SHA-256 `contentHash` at creation time. Daily Cloud Scheduler job batches all that day's hashes into a Merkle tree, anchors the root to Bitcoin via OpenTimestamps, and writes the batch + receipt to a new `dtcAnchorBatches` collection. Verification endpoint returns the DTC's hash, its Merkle proof, and the OpenTimestamps receipt — verifiable without TitleApp's cooperation.

2. **Chain anchor for entitled users.** Users with `blockchainMintingEnabled === true` (read at `index.js:704`) get an additional anchor on Polygon mainnet via Crossmint's managed minting service. Crossmint operates an audited contract; TitleApp does not custody the signing key. Async via Cloud Tasks: DTC created with `chain_anchor_status: chain_pending` returns immediately; mint completes 5-30s later; Cloud Tasks worker polls Crossmint, writes transaction hash + chain identifier to the DTC, transitions to `chain_confirmed`. Hash anchor still runs in parallel — chain is additive.

The marketing claim at launch: "tamper-evident and verifiable." Hash anchor delivers this for everyone. Chain anchor is a premium feature for users who need it. Plan A (TitleApp-owned ERC-1155 contract on Polygon) is held for Phase 2/3 once volume justifies the audit cost.

## Why we're doing it

The platform is selling itself as the digital-worker thing, not the crypto thing — but its provenance moat for regulated industries depends on tamper-evidence. The hash anchor is the foundation: cryptographic guarantees, no chain dependency, satisfies most regulated-industry use cases on its own. The chain anchor is the marketing-language unlock: when a user mints a DTC for a vehicle title or a credential, "minted on chain" is honest because it actually is — Crossmint puts it there. When the user does not mint to chain, the verifiable Bitcoin-anchored Merkle proof still makes the record tamper-evident.

The Crossmint path ships at ~5% of the engineering cost of Plan A. It defers a $10K-30K smart contract audit until volume + Phase 2 timing are right. This is the locked decision: ship enough chain anchor for the marketing claim to be honest, do not invest in heavy chain build that distracts from worker activation.

## Decisions locked (T1 from code visibility, 2026-05-04)

**Q-1 — Capability registry naming.** Add a new chain-specific capability `dtc.mint_dtc_polygon_crossmint_v1` alongside the existing `dtc.create_dtc_record_v1` and `dtc.mint_dtc_venly_v1`. Per `CLAUDE.md`: "Versioning is add-only — never silently modify an existing capability version; create v2." So we cannot rename the venly entry. Mark `dtc.mint_dtc_venly_v1` as `status: deprecated` in the registry; new chain mints route through the polygon-crossmint capability. Future Base or BNB integrations add their own capabilities (`dtc.mint_dtc_base_crossmint_v1`, etc.).

**Q-2 — Hash anchor batch cadence.** Daily. Matches existing Cloud Scheduler pattern (used by `aggregateAnalytics`, `generateDailyDigest`, `subscriberDigest`). OpenTimestamps daily anchoring is well-documented and free. Hourly batches (smaller proofs) is theoretically feasible but creates 24× more receipts to track for marginal proof-size reduction.

**Q-3 — OpenTimestamps vs commercial witnessing.** OpenTimestamps for v1. Free, minimal infra, matches the architectural intent (verifiable without TitleApp's cooperation). Commercial alternative (Chainpoint) adds a vendor dependency and recurring cost for a guarantee that OpenTimestamps already provides. If operational reliability becomes a concern at scale, swap then.

**Q-4 — IPFS snapshots.** Defer to Phase 2. Hash + Bitcoin via OTS is sufficient for v1 marketing claim. IPFS adds ~100-200 hr engineering for a strengthening of an already-defensible guarantee.

**Q-5 — Async chain mint handling.** Cloud Tasks. Cleanest engineering, matches the platform's existing async patterns (e.g., `messageQueueProcessor`). DTC created synchronously with `chain_anchor_status: chain_pending`; chat response returns immediately; Cloud Tasks worker polls Crossmint every 5s for up to 60s; on completion writes proof + transitions to `chain_confirmed`; on failure transitions to `chain_failed` (hash anchor remains valid as fallback).

**Q-6 — Per-tenant chain configuration.** Schema accommodates it via a future `chainConfig` field on `tenants/`, read at mint time. v1 ships single platform-wide config (Polygon mainnet via Crossmint). No breaking change to add per-tenant later.

## How we're doing it

### Layer A — Hash anchor primitives

**File:** `functions/functions/services/anchor/hashAnchor.js` (new). Reuses existing scaffolding:

- SHA-256: extends `signatureService/blockchain.js:7-9` (`sha256()` already exported).
- Chained-hash pattern: `signatureService/blockchain.js:29-70` (`computeSignHash`, `verifyChain`) is the model.
- Deterministic compliance hash: `auditTrailService.js` is the reference for canonical serialization.

**Canonical serialization for DTC contentHash:**

```js
function canonicalize(dtc) {
  // Stable key order, exclude server-side only fields and the contentHash itself.
  const include = ["userId", "tenantId", "type", "metadata", "fileIds", "version", "createdAt"];
  const obj = {};
  for (const k of include.sort()) {
    if (dtc[k] !== undefined) obj[k] = dtc[k];
  }
  return JSON.stringify(obj); // Firebase admin SDK serializes timestamps deterministically
}

function contentHash(dtc) {
  return sha256(canonicalize(dtc));
}
```

Write-time: when a DTC is created (`index.js:13362-13371`), compute `contentHash` and write it to the doc in the same operation. No separate pass for new DTCs.

Backfill pass: separate one-shot script `scripts/backfillContentHash.js` walks `dtcs/*` where `contentHash === null`, computes hash, updates. Idempotent. Run once after the 50.13 schema migration completes.

### Layer B — Daily Merkle batch + OpenTimestamps anchoring

**File:** `functions/functions/services/anchor/dailyBatchAnchor.js` (new).

**Cloud Scheduler trigger:** `dailyDtcAnchorBatch` — runs at 02:00 UTC. Pattern mirrors existing `aggregateAnalytics` / `generateDailyDigest` schedulers in `index.js:19403, 19496`.

**Logic:**
1. Query `dtcs` where `contentHash !== null` AND not yet in any batch (track via `batchId === null`). Yesterday's window: `createdAt >= startOfYesterday AND createdAt < startOfToday`.
2. Build Merkle tree over the contentHashes (binary tree, SHA-256 internal nodes). Library: implement directly — ~50 lines, no external dep needed.
3. Compute Merkle root.
4. Submit root to OpenTimestamps via `npm install opentimestamps` library. Returns a pending receipt (anchored to Bitcoin within 1-6 hours).
5. Write batch document to `dtcAnchorBatches`:
   ```js
   {
     batchId: 'YYYY-MM-DD',
     merkleRoot: '<sha256>',
     dtcIds: [<list>],
     createdAt: <serverTimestamp>,
     opentimestampsReceipt: <pending receipt buffer>,
     opentimestampsConfirmedAt: null  // updated when receipt anchors
   }
   ```
6. Update each DTC in the batch: set `batchId` to the batch ID.

**Receipt confirmation pass:** separate scheduled job `confirmOpentimestampsReceipts` runs every 6 hours. Walks pending batches, calls OpenTimestamps API to upgrade receipts; when anchored to Bitcoin, writes upgraded receipt + `opentimestampsConfirmedAt` timestamp.

### Layer C — Verification endpoint

**Route:** `GET /v1/dtc/:dtcId/verify` — public read, no auth required (verifiability without TitleApp's cooperation is the goal; the proof is self-contained).

**Returns:**
```json
{
  "ok": true,
  "dtcId": "<id>",
  "contentHash": "<sha256>",
  "merkleProof": ["<hash>", "<hash>", ...],
  "merkleRoot": "<sha256>",
  "batchId": "YYYY-MM-DD",
  "opentimestampsReceipt": "<base64>",
  "opentimestampsStatus": "pending|confirmed",
  "chain": null | "polygon-mainnet",
  "chainTxHash": null | "0x...",
  "chainStatus": "hash_only|chain_pending|chain_confirmed|chain_failed"
}
```

The Merkle proof is logarithmically small (1M DTCs → 20-hash proof). User can verify offline: hash the DTC document → walk proof → match Merkle root → verify OpenTimestamps receipt → confirm Bitcoin anchoring.

### Layer D — Crossmint chain anchor

**File:** `functions/functions/services/minting/crossmintMinter.js` (new).

**API integration:**
- Endpoint: Crossmint's NFT mint endpoint (per Crossmint docs; service already declared in connector registry at `config/connectors.js:324`).
- Auth: `process.env.CROSSMINT_SERVER_API_KEY` (already populated per audit).
- Custody mode: server-managed, TitleApp-owned wallet (avoids the wallet-lock-in concern that ruled out Venly per the memo).
- Polygon mainnet by default; chain selection from platform config.

**Mint flow:**

1. DTC creation in `index.js:13362-13371` checks `blockchainMintingEnabled` (already at line 704).
2. If enabled: write DTC with `chain_anchor_status: chain_pending`, `chain: "polygon-mainnet"`, `blockchainProof: null`. Enqueue Cloud Tasks job `chainMintDtc` with the DTC ID.
3. Cloud Tasks worker calls Crossmint mint API with DTC metadata (id, type, hash). Crossmint returns a job ID; worker polls every 5s.
4. On success: Crossmint returns a transaction hash. Worker writes:
   ```js
   blockchainProof: { txHash: '0x...', chain: 'polygon-mainnet', mintedAt: <ts>, provider: 'crossmint' }
   chain_anchor_status: 'chain_confirmed'
   ```
5. On failure (timeout, API error, insufficient gas): worker writes `chain_anchor_status: chain_failed`. Hash anchor remains the verifiable record.

**Idempotency:** Cloud Tasks gives at-least-once delivery. Worker checks current `chain_anchor_status`; if already `chain_confirmed`, no-op.

**Replace placeholder:** `functions/functions/api/utils/titleMint.js:59` (the `crypto.randomBytes(32)` mock) is removed. The route that called it now routes through the new Crossmint service for entitled users, or falls back to the mock placeholder explicitly only in `NODE_ENV !== 'production'` to support local dev without Crossmint.

### Layer E — DTC schema additions for chain anchor

The 50.13 migration already adds `chain_anchor_status`, `chain`, and reserves space for `contentHash`. This spec adds **only `contentHash`** as a separate concern (because canonical serialization logic lives in the anchor service, not the migration script). Per Q-B, contentHash is left null in the 50.13 migration and populated by the backfill pass at the end of Layer A.

`blockchainProof` field already exists at `index.js:721, 12828, 13368` initialized null (audit confirmed). The Crossmint flow populates it instead of leaving null.

### Layer F — Capability registry

`contracts/capabilities.json` additions:

```json
{
  "id": "dtc.mint_dtc_polygon_crossmint_v1",
  "class": "dtc",
  "summary": "Asynchronous chain-anchor minting via Crossmint on Polygon mainnet.",
  "callers": ["dtcService"],
  "kyc": "none",
  "roles": ["owner", "workspace:admin"],
  "status": "active"
}
```

Mark `dtc.mint_dtc_venly_v1` with `"status": "deprecated"` and add `"replaced_by": "dtc.mint_dtc_polygon_crossmint_v1"`. Existing readers continue to load the deprecated entry; new mints route to the active one.

## Open questions answered (T1 from code visibility)

| Memo Q | T1 answer |
|---|---|
| Sequencing within launch sprint | Hash anchor primitives + DTC schema migration first (foundation). Then Crossmint chain anchor for entitled users. Detail in cross-cutting brief. |
| Capability registry naming | Add chain-specific (`dtc.mint_dtc_polygon_crossmint_v1`); deprecate the venly entry (Q-1 above). |
| Batch cadence | Daily (Q-2 above). |
| OpenTimestamps vs commercial | OpenTimestamps (Q-3 above). |
| IPFS snapshots | Defer to Phase 2 (Q-4 above). |
| Async chain mint handling | Cloud Tasks (Q-5 above). |
| Per-tenant chain config | Schema-ready, v1 single-config (Q-6 above). |

## Action sequencing within this spec

1. **Hash anchor service** (`hashAnchor.js`, ~6-8 hr) — canonical serialization, contentHash compute, write-time integration in `index.js:13362-13371`, backfill script for existing DTCs.
2. **Daily Merkle batch + OpenTimestamps** (`dailyBatchAnchor.js`, ~3-4 hr) — Cloud Scheduler job, Merkle tree builder (~50 lines inline), `dtcAnchorBatches` collection, OpenTimestamps integration, separate confirm-receipts job.
3. **Verification endpoint** (`/v1/dtc/:dtcId/verify`, ~2 hr) — public read, returns proof + receipt + chain status.
4. **Crossmint chain anchor** (`crossmintMinter.js`, ~3-4 hr) — Crossmint API integration, Cloud Tasks worker, idempotent polling, blockchainProof write.
5. **Capability registry update** (~30 min) — add new capability, mark old deprecated.
6. **`titleMint.js` mock removal** (~30 min) — production callers route through Crossmint; mock retained for local dev only.

**Total: ~16-20 hr engineering-Claude shipping pace.** Memo's 800 hr estimate assumed greenfield hash primitives and full IPFS scope; reusing existing scaffolding + deferring IPFS brings this in dramatically.

## Out of scope

- **Plan A (direct TitleApp-owned ERC-1155 contract on Polygon).** Audit required ($10K-30K). Phase 2/3.
- **Smart contract audit procurement.** Tied to Plan A.
- **Promotion flow (hash → chain) for existing hash-only DTCs.** v1 ships a stub `/v1/dtc:promote` that enables chain anchoring on future DTCs only. Existing hash-only DTCs remain hash-only. Phase 2 batch-promotes them.
- **IPFS snapshot inclusion.** Hash + Bitcoin via OTS is sufficient for v1. Phase 2.
- **Chain selection per-tenant or per-DTC.** Schema accommodates it; v1 platform-wide config (Polygon).
- **Base or BNB Chain integrations.** Architecture supports them via additional capabilities + provider implementations. Phase 3+.

## Acceptance criteria

- Every DTC created after the hash anchor service ships has `contentHash` populated at write time.
- Backfill script populates `contentHash` for all pre-existing DTCs.
- `dailyDtcAnchorBatch` Cloud Scheduler job runs successfully one day after deploy; produces `dtcAnchorBatches/<YYYY-MM-DD>` document with Merkle root + pending OTS receipt.
- `confirmOpentimestampsReceipts` job upgrades pending receipts to confirmed within 6-12 hours (Bitcoin block time).
- `GET /v1/dtc/:dtcId/verify` returns a proof that an external verifier can validate offline.
- Users with `blockchainMintingEnabled === true` see DTCs minted to Polygon (`chain: "polygon-mainnet"`, `blockchainProof.txHash` populated, `chain_anchor_status: chain_confirmed`) within 60 seconds of DTC creation.
- Users without `blockchainMintingEnabled` see DTCs with `chain_anchor_status: hash_only`, `chain: null` — but `contentHash` and `batchId` populated.
- Failed Crossmint mints transition to `chain_anchor_status: chain_failed`; hash anchor remains valid; verification endpoint reports `chainStatus: chain_failed` but still returns a valid Merkle proof.
- `dtc.mint_dtc_polygon_crossmint_v1` appears in capability registry; `dtc.mint_dtc_venly_v1` marked deprecated.

## Acceptance evidence (post-build)

- A test DTC created with `blockchainMintingEnabled: false` shows `contentHash` populated, `chain: null`, `chain_anchor_status: hash_only`. After 24h+, `batchId` populated and `dtcAnchorBatches/<batch>` exists with valid Merkle root.
- A test DTC created with `blockchainMintingEnabled: true` shows `chain_anchor_status: chain_pending` initially. Within 60s: `chain_confirmed`, `blockchainProof.txHash` set, transaction visible on PolygonScan.
- `GET /v1/dtc/<id>/verify` returns proof; offline verification with the OpenTimestamps CLI confirms Merkle root anchored to Bitcoin block.
- Crossmint dashboard shows successful mint matching the DTC ID.

---

*End of spec. Execution begins after the 50.13 DTC schema migration lands and proceeds through the six-step sequence above.*
