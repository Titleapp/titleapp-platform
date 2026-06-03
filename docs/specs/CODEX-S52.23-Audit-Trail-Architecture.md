# CODEX S52.23 — Audit Trail Architecture (Foundational)

**Status:** PARTIAL (opt-in surface shipped 2026-06-03 overnight; gating + minting flow PENDING Sean review)
**Author:** Sean Lee Combs + Alex (overnight, 2026-06-03)
**Predecessors:** S52.15 (Audit Trail Architecture — DTC/Logbook), S52.20 (SOCIII strategy lock)
**Patent refs:** USPTO 64/073,693 (Hash-Chain Audit Trail), Filing C (Multi-Tier RAAS)

---

## Premise

The audit trail is the patent moat. It is also foundational infrastructure — every worker, every workspace, every meaningful action passes through it when enabled. It is therefore NOT a worker creators can author; it is reserved as platform substrate, parallel to Vault and Wallet.

This spec locks the three-layer architecture, the opt-in pattern, and the load-bearing decisions that need Sean's review before the minting service goes live.

---

## Three-Layer Architecture

```
LAYER 3 — USER-FACING WORKER (PLAT-008 "Audit Trail")
  Thin UI surface for viewing/managing the ledger
  Canvas tabs: Audit Ledger, Parent DTCs, Logbook Entries, NFT Mints,
  Identity Bindings, Rule Composition, Backup Status, Recovery Playbook,
  Subpoena Response
  Lives in MY WORKERS sidebar like any other worker. Reads existing
  Firestore mirror; never initiates minting.

         ▲ reads
         │
LAYER 2 — PLATFORM SERVICE (silent, runs everywhere)
  When tenants/{id}.auditTrail.enabled === true:
    1. Worker performs a meaningful action (see "Gating Decisions")
    2. Composition hash computed across 5 RAAS tiers
    3. Identity attestation captured (Stripe Identity / Coinbase Verified ID)
    4. Inputs + outputs canonicalized + hashed
    5. Crossmint mints receipt NFT on Base
    6. Receipt → customer's Coinbase Wallet (address from auditTrail config)
    7. SOCIII custody copy → nftCustody/{tokenId} (recovery / dispute)
    8. Firestore mirror → audit_ledger/{actionId} (fast queries)
    9. Data fee billed via existing data-credit billing
  User never sees this. Just happens.

         ▲ enabled by
         │
LAYER 1 — THE OPT-IN (workspace settings)
  Workspace admin toggles auditTrail.enabled.
  Requires:
    - Identity verification on file (Stripe Identity or Coinbase Verified ID)
    - Coinbase Wallet address (or use SOCIII custody only mode)
    - Acknowledgment of data-fee disclosure
  Default: OFF on all workspaces (no surprise charges, no crypto for casuals).
  Workspace-level scope (not per-worker, not per-user).
```

---

## Data Model

### Tenant doc extension (`tenants/{tenantId}`)

```
auditTrail: {
  enabled: boolean,                       // Opt-in toggle (default false)
  mode: "full" | "custody-only" | null,   // "full" = mint to customer wallet
                                          // "custody-only" = SOCIII keeps copy, no customer-side
  coinbaseWalletAddress: string | null,   // EVM address (0x...) for "full" mode
  optInAt: Timestamp | null,
  optInBy: string | null,                 // UID
  optOutAt: Timestamp | null,
  optOutBy: string | null,
  lastAnchorAt: Timestamp | null,         // Last successful mint
  anchorCount30d: number,                 // For Control Center KPI
  identityVerifiedAt: Timestamp | null,   // Snapshot of last verification
  lastUpdatedAt: Timestamp,
}
```

### New collections

- `auditLedger/{actionId}` — Firestore mirror of every anchored action (tenantId-scoped). Fields: `actionType`, `workerId`, `userId`, `inputHash`, `outputHash`, `compositionHash`, `identityAttestationRef`, `crossmintJobId`, `nftTokenId`, `txHash`, `chain` ("base"), `mintedAt`, `coinbaseWalletAddress`, `custodyOnly` boolean
- `nftCustody/{tokenId}` — SOCIII duplicate custody records. Fields: `tokenId`, `tenantId`, `actionId`, `crossmintJobId`, `txHash`, `custodyWallet`, `originalRecipient`, `mintedAt`

### Existing infrastructure to reuse

- `functions/services/minting/crossmintMinter.js` → `mintDtc({ dtcId, dtc })` + `getMintStatus(jobId)` (already functional)
- `functions/services/anchor/hashAnchor.js` → `contentHash(dtc)` (canonical hash)
- `identityVerifications/` collection (Stripe Identity records)

---

## Surface Shipped Overnight (2026-06-03)

1. **Workspace setting** — `tenants/{id}.auditTrail.*` field shape established. Default OFF.
2. **Endpoint** — `POST /v1/tenant:auditTrail:update` — admin-only, requires identity verification when enabling.
3. **Settings UI** — BusinessSettings → "Audit Trail" card. Toggle, Coinbase Wallet address field, last anchor timestamp, mode selector.
4. **PLAT-008 catalog** — minor refresh to point `infrastructure_refs` at the new endpoint.

### Behavior when enabled with current ship

- Tenant doc has `auditTrail.enabled = true` and `coinbaseWalletAddress` set.
- **No minting happens yet.** The silent service layer is unwired.
- User sees the toggle as "Enabled" in Settings.
- PLAT-008 worker UI shows the workspace as opted-in but ledger is empty.

This is intentional. It lets Sean turn the toggle on for SOCIII workspace and dogfood the Settings UX without triggering minting before the gating decisions are made.

---

## Gating Decisions — PENDING Sean Review

These are load-bearing. Each touches the patent moat or the billing layer. They were SPEC'd but NOT shipped overnight.

### 1. Where does the minting hook live?

Three candidate hook points in worker action flow:

- **Option A — RAAS commit boundary.** Every time `services/raas/commit.js` writes an action to `raasPackages/{id}/events/`, the audit service fires. Pros: catches everything that touches RAAS. Cons: not every audit-worthy action touches RAAS.
- **Option B — Worker-declared events.** Each worker declares which of its canvas actions are "audit-worthy" in its catalog (e.g. `auditTriggers: ["document.draft.signed", "calculation.committed"]`). Service fires only on declared events. Pros: precise, intentional, per-worker control. Cons: requires backfilling every catalog.
- **Option C — Hybrid.** RAAS commits anchor automatically; workers can also declare additional triggers. Default sensible behavior + opt-in granularity.

**Recommend Option C.** RAAS-commits are the structural backbone; per-worker triggers add precision for high-frequency or specialized actions.

### 2. What counts as a "meaningful action"?

If everything gets minted, costs explode. If only structured commits get minted, the chat-based actions miss the moat.

Candidate definitions:
- **Strict:** only events that produce a `dtcId` (i.e. canonical Vault state changes)
- **Standard:** strict + every action that calls `requireFirebaseUser` AND touches `raasPackages/{id}/events/`
- **Broad:** standard + every chat message that triggers a tool call

**Recommend Standard.** Captures the audit-defensible work without flooding the ledger with chat noise.

### 3. Composition hash implementation

The hash function over 5 RAAS tiers needs to be:
- Deterministic across versions
- Stable when rule order changes (sort canonical)
- Cryptographically binding (SHA-256)
- Patent-load-bearing

Proposed:
```
compositionHash(tiers) = SHA-256(canonicalize([
  { tier: 1, name: "platform-safety",  ruleSetVersion, hash: SHA-256(ruleSet) },
  { tier: 2, name: "operations",       ruleSetVersion, hash: SHA-256(ruleSet) },
  { tier: 3, name: "vertical-baseline", ruleSetVersion, hash: SHA-256(ruleSet) },
  { tier: 4, name: "workspace-overlay", ruleSetVersion, hash: SHA-256(ruleSet) },
  { tier: 5, name: "per-transaction",   ruleSetVersion, hash: SHA-256(ruleSet) },
]))
```

Sean needs to sign off on this exact shape because it goes into the patent prosecution as the canonical embodiment.

### 4. Data fee structure

Existing data-credit billing has `recordDataFee` + `quoteDataFee` (shipped 2026-05-08). The audit anchor needs:

- **Per-anchor cost:** estimate $0.02 (Crossmint fee + Base gas + markup). Internal cost ~$0.005, customer charge ~$0.02-0.05, markup follows the universal rule.
- **Billing trigger:** on `mintDtc` success, write a data-fee record with `category: "audit-anchor"`.
- **Cap:** workspace-level monthly anchor cap (default $50/mo) to prevent surprise bills, with auto-pause if exceeded.
- **Receipt:** each billed anchor includes the tokenId and Crossmint jobId.

This needs to compose cleanly with existing data-credit billing without double-charging.

---

## Backup Layer (Defer to S52.24)

The 3-2-1 backup architecture was originally folded into PLAT-008 but is structurally a separate concern. Spec it separately at CODEX-S52.24:
- Daily Firestore export to isolated GCP project
- Weekly AWS Glacier Deep Archive
- Quarterly LTO tape + safe-deposit
- Each export signed and its hash anchored via the audit service

The audit chain anchors the backup hashes — so the backup spec depends on this one, not the other way around.

---

## What NOT to do

- Do NOT let creators author their own audit-service variants. The composition hash + identity binding + chain anchor is the moat. Open SDK gives creators worker authorship; closed substrate keeps the audit layer.
- Do NOT mint chat messages by default. The ledger becomes useless and costs become unsustainable.
- Do NOT allow disabling without explicit workspace owner approval + audit log (refusal mode in PLAT-008 catalog).
- Do NOT expose NFT / mint / token vocabulary in customer-facing copy. Use "anchored," "receipt," "audit ledger." (Press surface — see press page Q&A.)

---

## Open Questions for Sean

1. Sign off on Option C for gating (RAAS commits + per-worker triggers)?
2. Sign off on Standard definition of "meaningful action"?
3. Sign off on the composition hash shape above (this goes into patent prosecution)?
4. Confirm $0.02-$0.05 per-anchor pricing and $50/mo default cap?
5. Should custody-only mode (no customer wallet, SOCIII keeps the only copy) exist as a tier, or is it just "audit trail off"?
6. Decommission the old Venly + Polygon "Blockchain Title Records" toggle in BusinessSettings, or leave it as the legacy path?

---

## Files Touched Overnight

- `docs/specs/CODEX-S52.23-Audit-Trail-Architecture.md` — this file (new)
- `functions/functions/index.js` — added `POST /v1/tenant:auditTrail:update` endpoint
- `apps/business/src/sections/Settings.jsx` — added Audit Trail card to BusinessSettings
- `functions/functions/services/alex/catalogs/platform.json` — minor PLAT-008 refresh (infrastructure_refs)

## Files NOT Touched (Pending Review)

- Worker action lifecycle / RAAS commit boundary — no minting hook wired
- `crossmintMinter.js` — unchanged
- `hashAnchor.js` — unchanged
- Data-fee billing — no audit-anchor category added
- OnboardingWizard — no opt-in step added (deferred to next session)
- Any creator-facing audit trail surface — reserved as platform moat per Sean directive
