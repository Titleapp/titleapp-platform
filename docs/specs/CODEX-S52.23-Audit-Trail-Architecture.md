# CODEX S52.23 — Audit Trail Architecture (Foundational)

**Status:** LOCKED on design (2026-06-03 morning, Sean signed off Q1/Q2/Q4/Q5/Q6); production minting service build proceeds. Q3 (hash shape) + performance-evaluation lens scope still open for Sean.
**Author:** Sean Lee Combs + Alex (overnight, 2026-06-03)
**Predecessors:** S52.15 (Audit Trail Architecture — DTC/Logbook), S52.20 (SOCIII strategy lock)
**Patent refs:** USPTO 64/073,693 (Hash-Chain Audit Trail), Filing C (Multi-Tier RAAS)

## THE DEPOSITION RULE (Design Principle)

> For every action a worker takes, ask: *would this matter in (a) a deposition / court case, (b) a financial audit, (c) a safety investigation, or (d) a performance evaluation?* If yes → individual anchor. If no → batched. The anchor scheme is designed around the worst-case forensic use, not the average user.

Every worker that opts into anchoring declares two trigger classes in its catalog:
- `auditTriggers.individual[]` — deposition-worthy events that get a unique receipt. Each entry maps to one or more of the four forensic lenses.
- `auditTriggers.batched[]` — routine activity events that aggregate into a single per-period anchor (daily, per-shift, or per-cycle).

**The four forensic lenses:**
| Lens | What it answers |
|---|---|
| Deposition | Who did what, when, under which rules, with which identity authority? |
| Financial Audit | Where did money/value move? Who authorized it? What were the fee disclosures? |
| Safety Investigation | What was the action/decision sequence? What did the operator know when? |
| Performance Evaluation | Was the operator's behavior over time consistent with protocol / standard of care? |

**Worked examples:**

| Vertical | Individual anchors (deposition-worthy) | Batched anchors (routine) |
|---|---|---|
| Nursing | Drug dose administered, clinical action taken, imagery captured (X-ray/photo), chart note signed | Vital sign round, facility presence time, routine assessments |
| Property mgmt | Lease signed, eviction issued, rent payment received, inspection finding logged | MX work-order queue, routine inspection logs, lease renewal notices |
| Aviation MX | Discrepancy noted, repair completed, part replaced, logbook entry | Daily preflight checks, routine inspection cycles |
| Legal | Filing submitted, signature obtained, statute citation made, deposition exhibit logged | Calendar reminders, time entries below threshold, routine research |
| Accounting | Transaction posted, account reconciled, K-1 issued, journal entry approved | Routine reconciliation steps, low-dollar transactions |

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

## Gating Decisions — LOCKED 2026-06-03 morning

### 1. Where does the minting hook live? → **OPTION C** (Sean confirmed)

Hybrid: RAAS commit boundary fires the default audit hook. Workers can ALSO declare additional triggers in their catalog (`auditTriggers.individual[]` and `auditTriggers.batched[]`) for precision beyond what RAAS captures.

Implementation:
- `services/raas/commit.js` calls `services/audit/maybeAnchor(actionContext)` after every successful commit
- `maybeAnchor()` checks: tenant has `auditTrail.enabled === true` AND action matches a declared trigger in the active worker's catalog
- Each batched trigger has a roll-up period (daily / per-shift / per-cycle) — batched events accumulate to a queue, and a scheduled function anchors the rollup at period close

### 2. What counts as a "meaningful action"? → **STANDARD + INTELLIGENT BATCHING** (Sean confirmed)

Standard = events that touch RAAS commits + worker-declared individual triggers. PLUS the batching scheme:

**Individual anchors** (one receipt per event):
- Actions that would matter in a deposition, audit, safety inquiry, or performance review
- Examples by domain in the Deposition Rule worked-examples table above
- Each individual trigger declaration in worker catalog must reference one or more forensic lenses

**Batched anchors** (one receipt per period, with summary + count):
- Routine, high-frequency activity that has evidentiary value in aggregate but not individually
- Examples: facility-presence time, MX call queue, vital rounds, routine inspections
- Per-period rollup record includes: event count, lens classification, summary statistics, period boundaries, link to detailed Firestore mirror

This is the cost discipline AND the legal sufficiency. Per-event microcharges are eliminated; per-event detail remains in Firestore for forensic forensic packages but only one receipt-per-period hits the chain.

### 3. Composition hash implementation → **PROPOSED, AWAITING SEAN SIGN-OFF**

The hash function over 5 RAAS tiers needs to be:
- Deterministic across versions
- Stable when rule order changes (sort canonical)
- Cryptographically binding (SHA-256)
- Patent-load-bearing

Proposed shape:
```
compositionHash(tiers, auditTriggers) = SHA-256(canonicalize({
  ruleTiers: [
    { tier: 1, name: "platform-safety",   ruleSetVersion, hash: SHA-256(ruleSet) },
    { tier: 2, name: "operations",        ruleSetVersion, hash: SHA-256(ruleSet) },
    { tier: 3, name: "vertical-baseline", ruleSetVersion, hash: SHA-256(ruleSet) },
    { tier: 4, name: "workspace-overlay", ruleSetVersion, hash: SHA-256(ruleSet) },
    { tier: 5, name: "per-transaction",   ruleSetVersion, hash: SHA-256(ruleSet) },
  ],
  auditTriggers: {
    triggerId: "...",                 // which catalog trigger fired
    lenses: ["deposition", "safety"], // which forensic lenses apply
    triggerVersion: "...",            // catalog version
  },
  identityAttestation: { kind, ref, verifiedAt }
}))
```

Two questions still open for Sean:
- (a) Does this exact shape go into patent prosecution as the canonical embodiment for Filing C?
- (b) Should `auditTriggers` lens classification be INCLUDED in the hash (proposed yes — ties the forensic-mapping into the anchored receipt) or kept OUTSIDE the hash for flexibility?

### 4. Data fee structure → **MONTHLY AGGREGATE + TOP-UP** (Sean confirmed)

No microcharging. The user-facing flow:

**End of month:**
- Audit Trail tracks per-anchor cost internally (Crossmint fee + Base gas + markup, ~$0.005-0.02 per anchor)
- Anchors are counted per workspace per month
- At month-end (or when balance drops below threshold), workspace gets a single statement: *"Audit Trail anchored 1,247 actions this month. Estimated cost based on usage: $24.94. Add $30 to your account to cover this month + buffer for next."*
- Customer tops up account in chunks (e.g., $20, $50, $100)
- Per-anchor cost is debited from balance internally; never surfaced as a charge

**Why:** professional positioning, predictable bills, no nickel-and-dime drag. Same UX shape as AWS/GCP estimated cloud billing.

**Internal accounting:**
- Per-anchor cost tracked in `auditLedger/{actionId}.estimatedCost` (in cents)
- Monthly aggregate: `auditTrailBilling/{tenantId}_{YYYY_MM}` doc with anchor count, estimated cost, top-up history
- Composes with existing data-credit billing engine via a new `category: "audit-trail-monthly"` aggregate line, not per-event

### 5. Mode tiers → **COLLAPSED TO SINGLE TOGGLE** (Sean confirmed)

Removed `mode` field. Audit Trail is now ON or OFF. Coinbase Wallet address is optional:
- Wallet set → receipts ship to wallet + SOCIII backup
- Wallet empty → SOCIII keeps the only copy (effectively the old "Custody-Only" but as natural fallback, not a separate tier)

Settings UI simplified to: toggle + optional wallet input + Test Anchor button.

### 6. Old Venly + Polygon "Blockchain Title Records" toggle → **REMOVED** (Sean confirmed)

Deleted from BusinessSettings. Dead code (Venly was the v1 stub before Crossmint integration).

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

## Open Questions Still Pending Sean

Closed: Q1 (Option C), Q2 (Standard + batching), Q4 (monthly aggregate + top-up), Q5 (single toggle), Q6 (Venly removed).

Still open:
1. **Composition hash sign-off** — does the proposed shape (including `auditTriggers` lens classification IN the hash) go into Filing C as the canonical embodiment? Or extract lens classification to the receipt metadata outside the hash?
2. **Performance Evaluation lens scope** — does it cover (a) external only (annual review, professional certification, license renewal) or (b) internal too (managerial review of employee/contractor)? Recommend (a) only so the lens stays forensically defensible.

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
