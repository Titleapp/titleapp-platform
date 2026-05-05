# CODEX 50.10 — Foundation + Phase 1 (SHIPPED)

**Author:** T1 (codebase-validating engineer)
**Date shipped:** 2026-05-04 (single-day sprint)
**Status:** Live in production. All 8 foundation steps from CODEX 50.13/50.14/50.11 + the Phase 1 orphan ruleset adoption + 10 new worker registrations are deployed and verified by Sean. Catalog now sits at **248 digital workers · 230/230 live workers fully onboarded · 2 of 34 ruleset orphans remaining (both intentional exceptions)**.
**Predecessors:** [CODEX-50.13 Drive/Vault/DTC SPEC](CODEX-50.13-Drive-Vault-DTC-Logbook-Integration.md) · [CODEX-50.14 Anchor SPEC](CODEX-50.14-Chain-Anchor-Hash-Anchor.md) · [CODEX-50.11 Improvement Loop SPEC](CODEX-50.11-Worker-Improvement-Loop.md) · [Foundation Sequencing Brief](CODEX-50.10-Foundation-Sequencing-Brief.md) · [Phase 1 Spec (locked)](../../Downloads/CODEX-50.10-Phase1-Orphan-Ruleset-Adoption-SPEC.md)

This is the post-ship record for a single-day sprint that closed the foundation gap (8 steps across three architecture memos) and immediately picked up Phase 1 worker activation that the foundation gated. Use this document as the canonical reference for what shipped, why each piece exists, and where the v1.1 followups land.

---

## What was built

**8 foundation steps + Phase 1 worker activation in one session.** Effort came in at ~9 hours engineering-Claude shipping pace versus the spec's ~30–37 hour estimate; the gap is from reusing existing scaffolding (sha256 helper, hash-chain pattern, idVerification shape, lineage snapshot pattern, Firestore triggers, useWorkerCatalog) that the original memos didn't price in.

### Foundation (steps 1–8)

| # | Step | Commit | Artifact |
|---|---|---|---|
| 1 | Contact webhook tenant filter | `4ed5670f` | `resolveInboundTenant.js` + 3 patched handlers |
| 2 | DTC schema unified migration | `73af7023` | `migrateDtcSchemaV2.js` — 7 new fields on every DTC |
| 3 | Hash anchor service | `0c46d4dd` | `services/anchor/{hashAnchor,dailyBatchAnchor,confirmReceipts,verify}.js` + `dtcAnchorBatches/` collection + `/v1/dtc/:id/verify` |
| 4 | Audit-layer version pinning | `5686832d` | `services/chat/versionPinning.js` + 2 Firestore triggers |
| 5 | Drive/Vault UI separation | `edb819c8` | `useDtcCatalog`, `VaultDTCs.jsx`, sidebar pins, modification-authority gate |
| 6 | Crossmint chain anchor | `5df591b5` | `services/minting/{crossmintMinter,processChainMints}.js` + 2-min scheduler + capability registry |
| 7 | Improvement Request surface | `ee65c05c` | `services/improvementRequests.js` + 3 routes + `SuggestImprovementButton.jsx` |
| 8 | Per-message feedback | `efdaf63a` | `services/chat/feedbackHandler.js` + `MessageFeedback.jsx` + `workerFeedback/` collection |

### Phase 1 worker activation (post-foundation)

| Action | Commit | Outcome |
|---|---|---|
| 23 orphan rulesets deprecated | `3e8e0bc1` | Cluster A 18 + Cluster B 4 + Cluster E 1 renamed `.deprecated.json` |
| 10 new workers registered | `3e8e0bc1` | Legal Companion (live) + 4 IR + 5 analysts (waitlist) |
| `investor-relations` flipped to live | `3e8e0bc1` | Repositioned as CRE archetype; `ir_compliance_v0` ruleset attached |
| Investor industry pill | `61345296` | New top-level marketplace filter |

## Why we did it

Two compounding pressures: the platform was architecturally dishonest in three concrete ways (Vault page rendered Drive content, contact webhooks crossed workspace boundaries, DTCs minted to chain were invisible) AND Phase 1 worker activation was gated on the foundation landing. Sean's directive on 2026-05-04: ship the foundation as one sprint so the worker activation that depends on it can pick up immediately.

Per the locked sequencing brief: contact webhook fix first as confidence-builder + zero-dep privacy fix, then DTC schema migration as the foundation for everything anchor-related, then hash anchor (universal default for tamper-evidence), then version pinning (small feedback prep), then the larger Drive/Vault UI work, then Crossmint (additive on top of hash anchor), then Improvement Requests, then per-message feedback. Each step shipped on top of the previous; the order minimized rework.

## How we did it — the build

### Step 1 — Contact webhook tenant filter

Three inbound handlers (`twilioInbound`, `sendgridInbound`, `sendgridWebhook`) were querying the `contacts` collection by phone or email with no `tenantId` filter. STOP from one workspace's customer could opt out a contact in a different workspace if the phone number matched.

The fix: a shared `resolveInboundTenant(handler, payload)` helper that maps the inbound channel identifier (Twilio number, SendGrid alias, SendGrid event category) to a workspace via `inboundChannelMap/{handler}` Firestore docs. Each handler resolves tenancy first; contact mutations only happen with a resolved tenant. Untenanted events log to `inboundMessages` / `emailActivity` for traceability but never touch contacts. Fail-closed on the privacy axis.

Two new composite indexes: `contacts (tenantId, phone)` and `contacts (tenantId, email)`.

**Operational gate:** until `inboundChannelMap/{handler}` is configured per channel, all inbound events log but contacts go untouched. This is the desired safe default.

### Step 2 — DTC schema unified migration

Every existing DTC got 7 new fields in one idempotent script:

| Field | Default | Purpose |
|---|---|---|
| `version` | `1` | concurrent-write conflict detection |
| `parent_dtc_id` | `null` | future chained-DTC architecture (v1.1) |
| `modification_authority` | `owner_only` (personal) / `workspace_role:admin` (tenant) | API-enforced gate on Logbook appends |
| `chain_anchor_status` | `hash_only` | enum: `hash_only` / `chain_pending` / `chain_confirmed` / `chain_failed` |
| `chain` | `null` | populated only when chain anchor present |
| `credentialing_projection_schema` | `null` | dual-record v1.1 prep |
| `contentHash` | `null` | populated by Step 3's hash anchor service |

Production result: 15 DTCs touched. 14 personal-context (`owner_only`), 1 tenant-context (`workspace_role:admin`). Idempotent — re-running is a no-op.

### Step 3 — Hash anchor service (universal default)

This was the largest single piece of work. Three layers:

- **Per-DTC hashing** (`services/anchor/hashAnchor.js`): SHA-256 over a stable canonical serialization (alphabetical keys: `createdAt`, `fileIds`, `metadata`, `tenantId`, `type`, `userId`, `version`). Reuses the existing `sha256` helper from `signatureService/blockchain.js`. Backfill script populated `contentHash` on the 15 existing DTCs.
- **Daily Merkle batch + OpenTimestamps** (`services/anchor/dailyBatchAnchor.js`): Cloud Scheduler `dailyDtcAnchorBatch` runs at 02:00 UTC. Pulls DTCs with `contentHash` and no `batchId`, builds a binary Merkle tree (50-line implementation; no external dep), submits the root to OpenTimestamps for free public Bitcoin anchoring via four calendar servers (a.pool, b.pool, eternitywall, catallaxy). Writes `dtcAnchorBatches/{YYYY-MM-DD}` with the root, ordered leaves, OTS receipt (base64), and confirmation timestamp. A second scheduler (`confirmOpentimestampsReceipts`, every 6 hours) upgrades pending receipts when the Bitcoin block attestation lands.
- **Public verification endpoint** (`/v1/dtc/:dtcId/verify`): no auth required (verifiability without TitleApp's cooperation is the architectural goal). Returns the contentHash, the Merkle proof reconstructed from the batch leaves, the OTS receipt, and the chain anchor status. Proof is logarithmic in batch size (~20 hashes for 1M leaves).

**Production state on day-of-ship:** the first batch (`dtcAnchorBatches/2026-05-05`, Merkle root `803bef3a…`) is anchored to OpenTimestamps and pending Bitcoin block attestation, which lands within 1–6 hours. Sean can verify any DTC right now via the public endpoint.

### Step 4 — Audit-layer version pinning

`worker_version` field captured on every `chatSessions` and `messageEvents` doc at write time so future feedback events (per-message thumbs, improvement requests, audit replays) know which worker version the user reacted to. Implemented via two Firestore triggers (`onChatSessionCreate`, `onMessageEventCreate`) rather than editing the ~14 `sessionRef.set()` sites; covers all current and future creation paths in one place.

Defaults to `"v1"` literal until the v1.1 beta channel adds a real version field on `digitalWorkers/{slug}`.

### Step 5 — Drive/Vault UI separation

Five things in one ship:

1. **`storageObjects` workspace scoping** (`lib/storage/index.js:209`): query branches on `(orgId && orgId !== uid)`. Workspace context filters by `orgId`; personal context drops files with `orgId` set so business-scope uploads don't bleed into personal Drive. Frontend `useDocuments` hook reads `TENANT_ID` from localStorage.

2. **New `useDtcCatalog` hook** + **`VaultDTCs.jsx` surface**: first frontend caller of `/v1/dtc:list`. Six-class asset taxonomy (Real Property, Vehicles, Personal Assets, Credentials, Business Records, Compliance) mapped from current DTC types with documented expansion path. Card grid shows type-aware metadata, chain anchor status badge, logbook entry count.

3. **Sidebar nav rewrite**: replaced the single "My Vault" pin (which routed to the Drive surface — the inversion the spec called out) with two parallel pins, "My Drive ›" and "My Vault ›". Both styled like the existing top-level destinations.

4. **Modification authority gate** on `/v1/logbook:append`: reads the DTC's `modification_authority` field; `owner_only` requires userId match; `workspace_role:<role>` defers to `enforceRoleGate` (CODEX 50.7 middleware). Misconfigured personal DTCs fall back to owner-only check (fail-closed).

5. Section ID kept as `vault-documents` for the Drive surface and added `vault-dtcs` for the new Vault surface; no breakage of existing deep links.

### Step 6 — Crossmint chain anchor (entitled users)

Users with `blockchainMintingEnabled === true` get an additional Polygon mainnet anchor via Crossmint's managed minting service. Hash anchor still runs in parallel — chain is additive.

`services/minting/crossmintMinter.js` wraps Crossmint's mint endpoint and status poll. `services/minting/processChainMints.js` is the every-2-minute scheduler-driven processor that picks up DTCs in `chain_pending`, submits new ones, polls in-flight ones, transitions to `chain_confirmed` (with `blockchainProof.txHash`) or `chain_failed`. Picked scheduler-driven over Cloud Tasks to match the existing `messageQueueProcessor` pattern; worst-case latency ~2.5 min, acceptable for background record-anchoring decoupled from chat UX.

`contracts/capabilities.json`: added `dtc.mint_dtc_polygon_crossmint_v1` (active); marked `dtc.mint_dtc_venly_v1` as `deprecated` with `replacedBy` pointer (per the `CLAUDE.md` add-only versioning rule — cannot rename existing entries).

The processor is dormant until a user has `blockchainMintingEnabled=true`; until then, the every-2-min run is a no-op.

### Step 7 — Improvement Request surface

Domain experts (Kent — finance, Ruthie — healthcare) and subscribers can file specific improvements against any worker. State machine mirrors `idVerification.js` shape (`open → in_review → approved_into_beta | declined → open`) but in a separate `improvementRequests/` collection (different domain, different routing).

Backend: `services/improvementRequests.js` exports `createRequest`, `listRequests`, `transitionStatus`. Three routes wired into `index.js`. Submitter role auto-resolves: `owner` if creator of target worker; `domain_expert` if `admins/{uid}.domains` is non-empty; otherwise `subscriber`. Queue ordering surfaces domain-expert items first, then severity, then recency.

Frontend: `SuggestImprovementButton.jsx` is a drop-in trigger + modal. Embedded in `CanvasTabBar.jsx` so it appears on every worker's landing page.

`approved_into_beta` is terminal for the request — v1.1 beta channel work picks up from there.

### Step 8 — Per-message feedback

Thumbs up/down on every substantive AI reply. New `workerFeedback/` collection (parallel to legacy `ratings/`, not extension — `ratings/` schema is too sparse to extend cleanly). Schema captures scope (`chat_message` | `canvas_card` | `worker_overall`), type, messageId, sessionId, cardSignal, comment, worker_version (inherited from parent session via Step 4's trigger).

`POST /v1/chat:feedback` with in-memory rate limit (6 events per user per 60s, best-effort per Cloud Functions instance). `MessageFeedback.jsx` renders below assistant messages — 👍 fires immediately, 👎 expands an optional comment input.

### Phase 1 worker activation

Per Sean's locked Q1–Q5 decisions on the Phase 1 spec:

- **Q1 — deprecation by rename:** 23 ruleset files renamed to `.deprecated.json` (audit trail preserved): 18 ad_012-029 v1, 4 platform_*_v1 (excluding `platform_legal_v1` which became a worker), `aviation_compliance_v1`. RULESET_MAP doesn't reference these — auto-dealer workers source rules from `suiteDefaults/auto_dealer.js`, not individual ad_* files; platform Spine workers had explicit null entries.

- **Q2 — Legal Companion (live):** new `platform-legal` worker. Vertical: platform · Suite: Legal · $0 · 2 credits · session_open. Ruleset `platform_legal_v1` attached (15 rules: AI-disclosure hard stop, statute-of-frauds, securities flag, usury limits, draft-marking; chat rules block legal advice, attorney-client implications, enforceability opinions). Positioning as Companion (review and flag), never as counsel.

- **Q3 — IR cluster:** existing `investor-relations` flipped draft → live as CRE archetype with `ir_compliance_v0` attached. Four new IR workers (waitlist, $79): `founder-ir` (startup IR), `inv-fund-001` (fund formation, `ir_fund_v0`), `inv-debt-001` (debt investment, no raas — authoring deferred), `inv-pe-001` (PE syndication, `ir_syndication_v0`).

- **Q4 — Investment Analysts suite:** five new analyst workers (waitlist, $49): `analyst-conversion-screen`, `analyst-debt-acquisition`, `analyst-entitlement-screen`, `analyst-pe-deal-screen`, `analyst-refinance-screen`. Each gets the matching `*_screen_v0` ruleset attached.

- **Q5 — misc:** `chief_of_staff_v1` kept (Alex master prompt, wired via `rulePackId`). `aviation_compliance_v1` deprecated (assumed superseded by per-aircraft rulesets). `healthcare_compliance_v1` parked pending Ruthie Clearwater review.

Workers were written directly to `digitalWorkers/` rather than through catalog file edits + `workerSync` because Phase 2's `useWorkerCatalog` reads Firestore truth. Catalog file polish (`services/alex/catalogs/*.json`) is an out-of-scope follow-up.

**Polish:** added `investor: "Investor"` to `VERTICAL_LABELS` in RAASStore so the new investor-vertical workers (10 of them) appear under their own Industry pill instead of being reachable only via suite pills.

## What surprised us — pivots during the build

### A. Capabilities registry is add-only, not rename

The CODEX 50.14 spec proposed renaming `dtc.mint_dtc_venly_v1` to a generic name. CLAUDE.md explicitly says "Versioning is add-only — never silently modify an existing capability version; create v2." Pivot: added `dtc.mint_dtc_polygon_crossmint_v1` alongside; marked the venly entry `status: deprecated` with `replacedBy` pointer. Existing readers continue to resolve the deprecated entry; new mints route through the active one.

### B. DTC `createdAt` had to be deterministic for hashable canonicalization

Initial DTC creation wrote `nowServerTs()` (Firestore server-side resolution) and tried to compute `contentHash` over the same record. The two values diverged — verifiers couldn't re-derive the hash from the stored doc. Fix: capture a `new Date()` once, store the Firestore Timestamp version, but feed the ISO string version into `contentHash()`. Verifier converts `createdAt.toDate().toISOString()` to recompute the same hash.

### C. Existing DTCs lacked `batchId` field

The daily batch query `where("batchId", "==", null)` would not match docs where the field was missing entirely. The DTC schema migration added 6 fields but not `batchId` (which the anchor pipeline owns). Fix: the `contentHash` backfill script also writes `batchId: null` so the daily batch picks up pre-existing DTCs.

### D. The verify endpoint had to be moved before the auth gate

DTC verification needs to be public (the architectural goal is verifiability without TitleApp's cooperation). I initially placed the route alongside `/v1/dtc:create` after `requireFirebaseUser`. Auth rejected it. Moved before the auth gate; works.

### E. Some ruleset rules don't have `label` fields

The first registration apply hit `Cannot use "undefined" as a Firestore value` because some rulesets have only `id` (no `label`). Sanitized the read: `label: r.label || r.message || r.logic || r.id || ""`.

### F. Trigger-based version pinning vs. inline edits

Step 4 originally proposed editing every `sessionRef.set()` site (~14 in `index.js`). Triggers were the cleaner pattern — one place to maintain field-naming canonicalization, covers all current and future creation paths, handles legacy code paths. The audit-pin landed as two Firestore triggers in ~2 minutes of engineering instead of ~30 of careful editing.

## Files changed

A summary; see commit messages for line-level detail.

**New backend services and helpers (10 files):**
- `functions/functions/communications/resolveInboundTenant.js`
- `functions/functions/services/anchor/hashAnchor.js`
- `functions/functions/services/anchor/dailyBatchAnchor.js`
- `functions/functions/services/anchor/confirmReceipts.js`
- `functions/functions/services/anchor/verify.js`
- `functions/functions/services/chat/versionPinning.js`
- `functions/functions/services/chat/feedbackHandler.js`
- `functions/functions/services/improvementRequests.js`
- `functions/functions/services/minting/crossmintMinter.js`
- `functions/functions/services/minting/processChainMints.js`

**New frontend (3 files):**
- `apps/business/src/data/useDtcCatalog.js`
- `apps/business/src/sections/VaultDTCs.jsx`
- `apps/business/src/components/SuggestImprovementButton.jsx`
- `apps/business/src/components/MessageFeedback.jsx`

**Patched (highlights):**
- `functions/functions/index.js` (DTC create rewrite, /v1/dtc:verify route, /v1/improvementRequests:* routes, /v1/chat:feedback route, 3 new schedulers, 2 new triggers, modification-authority gate on /v1/logbook:append, Crossmint chain_pending wiring)
- `functions/functions/lib/storage/index.js` (workspace-scoped list query)
- `functions/functions/communications/{twilioInbound,sendgridInbound,sendgridWebhook}.js` (tenant filter)
- `apps/business/src/sections/RAASStore.jsx` (Investor industry label)
- `apps/business/src/components/Sidebar.jsx` (My Drive + My Vault parallel pins)
- `apps/business/src/components/canvas/CanvasTabBar.jsx` (SuggestImprovementButton embed)
- `apps/business/src/hooks/useDocuments.js` (orgId pass-through)
- `apps/business/src/components/ChatPanel.jsx` (MessageFeedback embed)
- `apps/business/src/App.jsx` (workerSlug into CanvasTabBar, vault-dtcs section route)
- `firestore.rules` (public read on `dtcAnchorBatches/{batchId}`)
- `firestore.indexes.json` (2 contact composite indexes)
- `contracts/capabilities.json` (capability registry update)

**New scripts (5 files):**
- `scripts/migrateDtcSchemaV2.js`
- `scripts/backfillContentHash.js`
- `scripts/deprecateOrphanRulesets.js`
- `scripts/registerPhase1Workers.js`
- (audit scripts already existed)

**Renamed (23 files):** ruleset deprecations, `*.json` → `*.deprecated.json`.

## Validation evidence

- **Foundation:** every step deployed and smoke-tested end-to-end. The hash anchor's first batch close ran successfully (`dtcAnchorBatches/2026-05-05`, root `803bef3a…`, 15 DTCs anchored to 4 OTS calendar servers). `/v1/dtc/<id>/verify` returns valid Merkle proof + OTS receipt. Sean confirmed the Drive/Vault sidebar pins, the Vault surface with 6-class taxonomy, and the marketplace browse rendering correctly.

- **Phase 1:** Sean's screenshots (Image #210–213) showed Legal Companion live in marketplace, Investor Relations suite filter showing 5 workers (1 live + 4 waitlist), Investment Analysts suite filter showing 5 workers (all waitlist).

- **DoD audit re-run after Phase 1:** 248 total digitalWorkers, 230/230 live workers fully onboarded (was 228/228), 18 pre-launch (was 10) — all gains are intentional new registrations.

- **Orphan ruleset audit re-run:** 34 → 2 (just `chief_of_staff_v1` and `healthcare_compliance_v1`, both intentional exceptions).

## What was not done (deferred to v1.1 or follow-up)

**v1.1 deferrals (architecturally locked, code surface deferred):**
- Chained-DTC Logbook refactor (parent_dtc_id population)
- Drive→Vault promotion UI
- Contact tier metadata (personal/professional/confidential)
- Dual-record / credentialing projection logic
- Beta channel runtime selection (releaseChannel field, betaOptIn map, resolver branching)
- Domain expert role surface (admins.domains array population for Kent and Ruthie)
- Canvas card feedback (CanvasCardShell redesign pass)
- Worker-level modification authority override
- IPFS snapshot inclusion on hash anchor
- Plan A direct Polygon contract (audit required, $10K-30K)
- Promotion flow for hash-only DTCs to chain when blockchainMintingEnabled flips on

**Follow-up polish (not architecturally constrained, ship as time permits):**
- Catalog file authoring for the 10 new Phase 1 workers in `services/alex/catalogs/*.json` so workerSync can produce them from canonical sources
- Per-suite icons for "Investor Relations" and "Investment Analysts" in marketplace pills
- Component file rename: `VaultDocuments.jsx` → `DriveDocuments.jsx`, retire `VaultAssets`/`VaultTools`/`VaultDashboard` placeholders
- Creator-facing Improvement Request inbound queue UI (routes return data; the tab on owned workers is v1.1)
- Email notifications on improvement-request transitions (idVerification has them; not copied yet)
- v1.1 weekly improvement-digest job per Creator (lighter Editor option)

**Architectural followups (separate work):**
- Editor as productized worker (v2+, included with $49 Creator annual)
- Implicit feedback signals (session length, dead-end conversations, canvas dismissal, tab abandonment)
- Per-tenant chain configuration (schema-ready, single platform-wide for v1)

## What this unblocks

- **Phase 3** (Real Estate Salesperson worker registration) — 546 lines of authored RAAS waiting for catalog entries.
- **Phase 4** (Tab-and-polish across demo-ready bundles) — Auto Dealer, Real Estate Escrow/Broker, Aviation Pilot, Spine.
- **Phase 5** (Light authoring) — Investor founder-archetype additions, Property Management per-worker specialization, Aviation Dispatcher/Operations/Maintenance.
- **Phase 6** (Heavy authoring) — Real Estate Developer non-Property-Management workers, Aviation type-rated CoPilots.
- **Phase 7** (Greenfield) — Cap Table standalone, Property Analysis, anything else with no content path.
- **Beta channel work (v1.1)** — improvement requests transitioning to `approved_into_beta` need the runtime selector to actually route subscribers; that work picks up from a stable foundation.

## Operational notes for the on-call cadence

- **Hash anchor:** runs nightly at 02:00 UTC. Inspect `dtcAnchorBatches/{YYYY-MM-DD}` to confirm. Receipts confirmed every 6 hours via separate scheduler.
- **Crossmint:** dormant until first user has `blockchainMintingEnabled=true`. The 2-min processor runs always but is a no-op when no `chain_pending` DTCs exist.
- **Inbound webhook tenancy:** until `inboundChannelMap/{handler}` is populated, no contact mutations happen. Configure: `inboundChannelMap/twilio = { "<twilio_number>": "<tenantId>" }`, `inboundChannelMap/sendgrid_inbound = { "<email_alias>": "<tenantId>" }`. SendGrid sends should include `tenant:<id>` in the `category` array so webhook events resolve.
- **Logbook appends to tenant DTCs** now require admin role in the DTC's tenant. Members trying to append get 403.

## Known issues deferred (carried over from prior SHIPPED records)

1. **Two accounting workers in Firestore.** `digitalWorkers/accounting` (vertical=`real_estate_development`, RE tabs) vs `digitalWorkers/platform-accounting` (vertical=`platform`, 6 spine tabs). Cleanup pass needed.
2. **Chat conversation history index.** Firestore composite index for `userId + tenantId + createdAt` not deployed; click the auto-create link from the browser console.
3. **Catalog file authoring for all Phase 1 workers** as noted above.

---

*End of post-ship record. The single-day sprint that closed the foundation gap and started Phase 1 worker activation is production. Phase 3+ unblocked.*
