# CODEX S52.15 — Audit Trail Architecture (DTC + Logbook Entry Relational Model)

**Date:** 2026-06-02 (vocabulary revision 2026-06-02 PM)
**Status:** ARCHITECTURE — to lock before the Coinbase Base build week
**Author:** Alex (Sean Lee Combs's Chief of Staff)
**Patent context:** Filing C (Multi-Tier Composable Rule-Based Governance) and the parent-child DTC + hash-anchored audit chain primitives carried forward from the 2023 prior-art provisional and December 2024 Blockchain Logbook System filing

---

## The conceptual anchor — pilot logbook

This architecture's inspiration is a pilot's logbook. A pilot maintains certification by logging every material event — takeoff, landing, instrument approach, duty period, type rating, flight review. The logbook entries are individually material because each one carries real weight (the FAA can ask to see them; insurance underwriters ask to see them; an investigator after an accident asks to see them). They are also append-only — entries are never erased or rewritten. The logbook itself, as a record-keeping object, is the canonical audit trail of a pilot's career.

SOCIII's audit trail uses the same model. Every DTC (the asset, the property, the agreement, the worker output) has a logbook of immutable entries. Every entry is by definition a material event. The DTC + logbook entry relational model is the digital equivalent of a pilot's paper logbook — but extended across every regulated profession.

---

## Vocabulary note

This architecture intentionally avoids the term **NFT** in customer-facing and developer-facing language. SOCIII is an audit-and-governance platform, not a crypto product, and the audit credibility we sell — to regulators, courts, lenders, escrow officers, title attorneys, certifying agencies — requires vocabulary from the audit/legal lineage, not the speculative-token lineage.

| Used here | Plain meaning | What you'd call it in legacy crypto-speak |
|---|---|---|
| **Parent DTC** | The asset / entity record | (no equivalent) |
| **Child DTC** | A derived record that's a child of another DTC | (no equivalent) |
| **Logbook Entry** | An immutable, material event record appended to a DTC | "NFT" |
| **Compound DTC** | A logbook entry that itself is also a DTC (a closing event IS the deed) | "NFT that's also a token" |
| **Anchored** | Committed cryptographically to a public ledger as tamper-evidence | "Minted" |
| **Anchor Service** | The platform service that performs anchoring | "Mint service" |
| **Audit Ledger** | The customer's view of their logbook entries | "Wallet view" |
| **Composition Hash** | Deterministic hash of the full composed RAAS ruleset at event time | (no equivalent) |

The on-chain artifact is technically a non-transferable ERC-721-style token, but we call it a **logbook entry** in every UX, doc, contract, regulatory disclosure, and customer-facing surface. The technical implementation is incidental to the function: a tamper-evident, identity-bound, rule-version-pinned audit record.

---

## Why this CODEX exists

Coinbase Business is approved for SOCIII Inc. as of 2026-06-01. The audit-trail / on-chain anchor build week is queued for next week. Before we wire it, we need to lock the structural model: what's a DTC, what's a logbook entry, how they relate, what lives on-platform vs. on-chain, and how the customer sees it.

Sean's architectural insight (2026-06-02 AM): *"DTC is the main 'thing.' Logbook entries (anything that appends a DTC) is an entry. The appended item may also become its own DTC and may also reference multiple DTCs. Kind of standard relational data structure, but in this case the objects in the database are immutable audit records."*

This codex captures that model and shows how it operationalizes.

---

## 1. The model in one paragraph

A **DTC (Digital Title Certificate)** is an entity — the asset, the contract, the person, the property, the worker. A **Logbook Entry** is a material event — an append, a state change, an action taken on or by an entity. Each logbook entry carries a parent reference to the DTC it appends. Importantly: **a logbook entry can itself become a DTC** if the event creates a new entity (a closing event creates a deed-DTC; a signing event creates an agreement-DTC). And a logbook entry **can reference multiple DTCs** when the event involves more than one entity (a closing references property + buyer + seller; a transfer references vehicle + prior-owner + new-owner). The result is a standard relational graph where every node and every edge is a verifiable, cryptographically anchored, audit-trail object — modeled on the way a pilot's logbook documents a career, extended across every regulated profession.

---

## 2. The vocabulary, locked

| Term | Definition | Lifecycle | On-chain form |
|---|---|---|---|
| **DTC** | A *thing* — entity with identity. Has a parent (when it's a child of another DTC). Has children (subsequent DTCs derived from it). Has a logbook of entries appending state changes. | Created once. Updated only via logbook entry appends. Never deleted. | A persistent anchor record on Base with metadata pointing to the off-chain payload. |
| **Logbook Entry** | A material *event* — a state-change record appended to one or more DTCs. Atomic, immutable, signed, timestamped, rule-validated. Each entry is by definition load-bearing for the audit; nothing trivial gets logged. | Anchored on event commit. Never updated. Never burned. | A non-transferable anchor record at commit, with metadata pointing to the off-chain event payload. |
| **Logbook** | The ordered append-only list of entries attached to a given DTC. Computed; not stored as a separate object. | Always derived from `WHERE entry.parent_dtc = X ORDER BY ts ASC`. | Not on-chain. The logbook is *implied* by entries referencing the DTC. |
| **Compound DTC** | A DTC whose creation event was itself a logbook entry (the closing event becomes the deed; the signing event becomes the agreement). | The entry and the DTC are dual-typed: same anchor record, with both `event_payload` and `dtc_entity_payload` in its off-chain metadata. | Same anchor record. The on-chain doesn't distinguish; the platform distinguishes via metadata fields. |
| **Composition Hash** | Per Filing C Claim 3: a deterministic hash of the full composed [RAAS](../../apps/business/public/docs/raas.md) ruleset (all five tiers merged) at event time. Captured in every logbook entry payload. | Per event. | Field inside the logbook entry's off-chain metadata. |

---

## 3. The relational shape — concrete real-estate example

Walking through a Tahoe property going from listing → contract → close → recording, using DTCs (squares) and logbook entries (arrows):

```
[Property DTC]  ←──── parcel-anchored, created at first encounter
   │
   │  Entry: listing_created (broker action)
   │  Entry: comparable_pulled (worker action, references ATTOM API call)
   │  Entry: photo_set_uploaded (broker action)
   │  Entry: showing_scheduled (worker action)
   │  Entry: offer_received (broker action, references [Buyer DTC])
   │  Entry: counter_offer_sent (broker action)
   │  Entry: offer_accepted (mutual signing event)
   │           ↓
   │     [Purchase Agreement DTC]  ←──── compound: the entry IS also the DTC of the agreement
   │           │
   │           │  Entry: contingency_inspection (escrow worker action)
   │           │  Entry: contingency_appraisal (escrow worker action)
   │           │  Entry: contingency_financing (escrow worker action)
   │           │  Entry: title_search_complete (escrow worker action, references prior chain on Property DTC)
   │           │  Entry: closing_documents_generated (escrow worker action)
   │           │  Entry: closing_executed (multi-party signing event)
   │           │           ↓
   │           │      [Deed DTC]  ←──── compound: entry IS also the DTC of the deed
   │           │           │
   │           │           │  Entry: recorded_with_county (county API action)
   │           │           │  Entry: title_insurance_bound (insurer API action)
   │           │           │  Entry: keys_transferred (broker action)
   │           │           │
   │           │
   │  Entry: ownership_transferred  ←──── appends back to Property DTC,
   │     ↑                                references [Deed DTC] + [Buyer DTC] + [Seller DTC]
   │     └─── this is the "multiple DTC reference" Sean called out
   │
[Property DTC] continues its logbook under new owner
```

Three things this captures that a flat audit log can't:

1. **Compound DTCs** — the Purchase Agreement is both an event (appended to the Property DTC) AND an entity (with its own logbook of contingencies). Same anchor record on-chain, dual semantics off-chain.

2. **Multi-DTC events** — `ownership_transferred` references the Property DTC, the Deed DTC, the Buyer DTC, and the Seller DTC. Every audit query starting from any of those four entities surfaces the same closing event.

3. **Continuity** — the Property DTC's logbook is unbroken across the closing. Subsequent property events (a new lease, a maintenance dispatch, a refinance) continue appending to the same Property DTC under the new owner, because the DTC is parcel-anchored, not ownership-anchored.

---

## 4. The on-platform vs. on-chain split — locked

| Layer | What's there | Why |
|---|---|---|
| **Firestore (primary, queryable)** | Full event payloads, structured by DTC reference. Rich metadata. Composition hash. Identity attestation reference. Worker invocation context. Full rule evaluation trace. | Speed, query, search, regulatory disclosure. This is where the audit log *lives* for daily use. |
| **Coinbase Base (anchor, tamper-evident)** | Hash of each event payload (merkle root for batched anchors at high volume). Anchor record committed per logbook entry referencing the payload hash. Anchor record routes to the customer's audit ledger. | Cryptographic proof-of-existence at a known time. Tamper-evidence. Customer-held proof. |
| **Customer's Audit Ledger (Coinbase wallet)** | The anchor records themselves. Customer sees them as logbook entries in their audit ledger view. Each entry clicks through to the off-platform payload (via metadata URI). | Customer holds the proof. Even if SOCIII goes dark, the customer's audit chain is recoverable from their ledger. |
| **Customer's Drive** | A periodic export of the on-platform audit chain as a verifiable package. Recompute the hashes from this package, verify against on-chain anchors. | Belt-and-suspenders backup. The audit ledger has the anchor records; the Drive has the payloads. Recovery without SOCIII is possible. |

The default for daily operation is Firestore. Coinbase Base is the *trust anchor*, not the *primary store*. This is what Sean meant by "keep organization on platform, use ledger as backup + security."

---

## 5. Logbook entries are always material; batching is just anchoring efficiency

Per the pilot-logbook analogy: every logbook entry is a material event by definition. Trivial actions (a worker reading a record, an intermediate tool call to look up one ATTOM property, a tab default change) do **not** create logbook entries. They live in Firestore as operational logs only, never anchored.

What does become a logbook entry:

| Event class | Logbook entry? |
|---|---|
| Closing executed, lease signed, vehicle title transferred, contract signed | Yes |
| Inspection passed, license verified, sanctions cleared, KYC completed | Yes |
| Worker invocation that produced a customer-visible deliverable (a draft, a report, a generated document) | Yes |
| Filing, recording, mailing, sending, paying | Yes |
| Intermediate worker reasoning that produced no deliverable | No — Firestore only |
| Routine read query | No — operational log only |
| Internal state shuffle | No — operational log only |

**Batched anchoring** is purely an on-chain cost optimization, not a downgrade in event significance. For high-volume material event streams (a property-management worker logging 50 maintenance dispatches in a week — each one a material event because it touches a property condition + cost + liability surface), the platform supports merkle-batched anchoring. Many entries are hashed together into a merkle root, one anchor record is committed for the root, and individual entries remain independently verifiable via merkle proof.

To the customer, every entry still shows individually in their audit ledger. To Base, the anchor cost stays flat. The economic model: per-event anchoring keeps integrity; merkle batching keeps cost. Both produce the same legal weight.

---

## 6. The customer-facing UI — three surfaces

**A. The DTC view** — for "tell me everything about this property"
```
Tahoe Property — 123 Lakeside Drive (Parcel APN: 042-061-005)
─────────────────────────────────────────────────────────────
Logbook (43 entries)
  • 2026-06-02 09:14  Listing created — Christina Soloski Realty
  • 2026-06-02 09:31  Comparable pulled — 3 active, 5 sold (ATTOM, $8.40)
  • 2026-06-03 14:22  Showing scheduled — Mark + Lisa Chen
  • ...
  • 2026-06-19 11:00  Closing executed — see Deed DTC
  • 2026-06-20 09:45  Recorded with Placer County
  • 2026-06-22 16:00  Ownership transferred — new owner: Chen Family Trust

[View child DTCs (2)]  [Export verifiable audit package]  [View on Base ↗]
```

**B. The entry view** — for "tell me everything about this closing"
```
Closing Executed — 2026-06-19 11:00 PST
─────────────────────────────────────────
References: Property DTC (Lakeside Dr) · Buyer DTC (Chen Trust) · Seller DTC (Prior Owner) · Purchase Agreement DTC
Worker: Escrow Worker v0.4.2
Composition hash: 0x9f3a... (5 tiers, version-pinned at process initiation)
Identity attestations: [4 parties, all Stripe-Identity verified]
Pre-publish check: PASSED (12 rules evaluated, 0 violations)
Audit anchor: 0xa8d1...e72f on Base block 18,491,773 (2026-06-19 11:00:14 UTC)
Anchor record: SOCIII-AUDIT #00109481  →  in Christina Soloski's audit ledger
Customer-visible deliverables: Final HUD-1, Recorded Deed, Title Policy Binder
```

**C. The audit ledger view** — for "show me what I hold"
```
[Christina Soloski's audit ledger]
SOCIII Logbook Entries (162)
  • #00109481  Closing Executed — Lakeside Dr (Tap to view)
  • #00109449  Listing Created — Lakeside Dr
  • #00109213  Lease Executed — Heavenly Apartments Unit 4
  • ...
```

The audit ledger is the customer's hold-the-keys surface. They don't operate from there — they operate from the platform UI. But the ledger is what survives if the platform goes dark, gets acquired, has a service outage. It's the cryptographic safety net.

---

## 7. Identity bond per logbook entry

Per Filing C Claim 7, identity attestations flow into rule-set composition as first-class inputs. Operationalized in the logbook entry:

- Every entry carries a reference to the acting user's identity attestation (Stripe Identity verification ID, or Coinbase Verified ID, recorded as a child entry on the user's parent DTC).
- The composition hash binds the rules-as-applied to the identity-as-known at that moment.
- A regulator pulling the audit chain three years later sees: this user was verified-real at the time, these rules were in effect, this is what happened.

This is what makes the audit chain *legally meaningful* in a regulated industry — it's not just "an action happened," it's "an identified party took an action under known rules at a known time, and here's the cryptographic proof."

---

## 8. Coinbase API access — how the wiring works

The SOCIII Inc. Coinbase Business account (approved 2026-06-01) is the foundation. Two distinct roles:

**Platform side (SOCIII signs and pays):**
- Provision API credentials from the Coinbase Developer Platform (CDP) under the SOCIII Inc. business account
- Platform backend holds a small ETH/USDC balance on Base for gas
- Platform signs anchor transactions and submits them to Base via CDP RPC
- Deploy one custom smart contract for the SOCIII Audit Logbook (non-transferable; custom mint-to-address with metadata URI pointing to off-chain payload)
- Coinbase's CDP SDK abstracts most of this — we do not need to write raw Solidity if we use their account-abstraction primitives

**Customer side (their audit ledger):**
- Each customer connects their own wallet address — lazily, at first-anchor time, not at signup
- Accepted wallets (multi-wallet day 1): Coinbase Wallet, Coinbase Business, MetaMask, Binance Wallet, PayPal Wallet, plus any other EVM-compatible Base or Polygon wallet
- Platform routes anchor records TO that address (mint-to-address)
- If the customer hasn't connected a wallet yet, the platform holds the anchor record in custody and routes it when they do
- Customer does not sign anything for normal operation — they are the recipient
- Customer signs only if they want to export / transfer their audit chain elsewhere (which we do not make easy by design — these are soulbound to verified identity)
- Customer-facing copy never says "wallet" — it says "audit ledger." The wallet is the storage; the audit ledger is the experience.

**Where the credentials live (gitignored):**
```
COINBASE_CDP_API_KEY=...
COINBASE_CDP_API_SECRET=...
BASE_RPC_URL=...
SOCIII_AUDIT_LOGBOOK_CONTRACT_ADDRESS=...   (once deployed)
```

Same pattern as ATTOM and SendGrid: keys in `.env`, never committed.

---

## 9. What we don't build (per Sean's floor)

- **No customer wallet management.** The customer brings their own wallet. We accept any EVM-compatible wallet (Coinbase Wallet recommended; MetaMask, Binance Wallet, PayPal Wallet, Coinbase Business, others all accepted). Customers who can't connect a wallet at link-time can defer; the platform holds the anchor record in custody and links later. Customers who never connect still get the on-chain proof — we just don't route the anchor record to them.
- **No on-chain governance.** The audit chain is one-way: events flow on-chain. No on-chain voting, no on-chain rule changes, no DAO mechanics. The platform's sole-director governance per `project_sociii_ip_governance_philosophy` is the only governance layer.
- **No customer-transferable anchor records.** Once anchored, logbook entries are non-transferable to anyone other than the customer's audit ledger of record (soulbound to the verified identity). This protects the audit chain from money-laundering vectors and aligns with the "audit not collectible" framing.
- **No crypto-nerd tone, ever.** All customer-facing surfaces use audit-domain language (logbook entry / parent DTC / child DTC / audit ledger / anchored / hash). We do not say "NFT," "mint," "token," "memecoin," "DeFi," or "Web3" in any customer-facing surface. The chain is an implementation detail — the audit is the product.
- **Base-first, Polygon-second.** Default chain is Base (cheap, fast, Coinbase-native). Second choice if Base is unavailable or customer prefers: Polygon. Architecture is chain-agnostic per the patent claim, but we don't bother the customer with chain choice — they get an audit ledger, not a chain dashboard.

---

## 10. Patent claim alignment

This architecture executes against Filing C as follows:

| Filing C element | How this architecture implements it |
|---|---|
| Claim 1(g) Hash-anchored audit chain | Per-event hash + anchor record committed on Base. Merkle batching for high-volume streams. |
| Claim 1(h) Identity anchoring | Identity attestation reference embedded in every logbook entry payload. |
| Claim 3 Composition hash determinism | Same composition hash computed from same inputs; pinned per logbook entry. |
| Claim 6 Chain-agnostic operation | Base in v1; architecture supports Ethereum, Polygon, Solana variants without code change to the composition engine. |
| Claim 9 Version pinning for multi-step processes | Compound DTCs (Purchase Agreement, Deed) pin composition hash at creation; subsequent logbook entries reference the pinned hash. |

The DTC + logbook entry relational model is the *embodiment* of the patent's audit-chain claim. It does not introduce new patentable subject matter — it is the specific implementation of the existing claims.

---

## 11. Build sequence — next week

Suggested execution order for the Coinbase week:

1. **Day 1 — Schema lock + CDP credentials.** Add `dtc` and `logbook_entries` collections to Firestore. Define the metadata schemas. Wire the relational fields (`parent_dtc`, `references_dtcs[]`, `is_compound_dtc`, `composition_hash`, `identity_attestation_ref`). Provision Coinbase CDP API keys under the SOCIII Business account; drop into `functions/functions/.env`.
2. **Day 2 — Anchor service.** Build the anchor service against Coinbase CDP — function takes a structured event payload, computes the hash, commits the anchor record on Base, returns the token id + transaction hash. Deploy the custom SOCIII Audit Logbook smart contract (non-transferable, custom mint-to-address).
3. **Day 3 — Audit append service.** The platform-facing API that workers call when they need to record a material event: takes the event, runs pre-publish constraint check (already shipped per S52.11 backend work), commits to Firestore, dispatches the anchor.
4. **Day 4 — Customer audit-ledger linking.** Onboarding step: customer connects their Coinbase wallet address as their audit ledger; future anchors route there. Backfill option: anchor all of the customer's historical material events on demand.
5. **Day 5 — Customer-facing UI.** The three views (DTC view, entry view, audit ledger view). Workspace canvas tab for "Audit Trail" on every worker that produces material events.

Estimated five working days for v1. The architecture compiles to about 600-1000 lines of new code plus the schema migration and the smart contract. Not large; the patent work makes most of the architectural decisions for us.

---

## 12. Q1–Q4 — RESOLVED 2026-06-02 (Sean)

### Q1 — Granularity defaults. RESOLVED → worker-sets default; user dials up or down. Audits are a revenue stream + our differentiator.

Every worker declares a default granularity tier in `catalog.json` (e.g., RE workers default to anchor-every-closing-class-event; analyst workers default to anchor-on-publish-only). The customer can dial **up** (anchor every meaningful step on a high-stakes matter) or **down** (anchor only milestone events on a low-stakes matter) from their workspace settings.

**Why this matters strategically:** every other AI agent platform is going to ship without an audit chain. We are the only platform that produces cryptographically-anchored, identity-bound, regulator-presentable proof of what an AI agent did on a customer's behalf. That is the differentiator. And because the customer controls granularity, **the customer chooses how much audit they want to pay for** — and that becomes a meaningful revenue stream over time, not a cost center.

The price/granularity dial in the worker settings is itself a sales mechanism: visible to the customer at all times, normalized as "you're getting more audit than competitors offer at any price." Long-term thesis: audit-as-a-revenue-stream becomes a top-3 line item on SOCIII's P&L by year 3, second only to per-worker subscription.

### Q2 — Onboarding for audit-ledger linking. RESOLVED → progressive, not signup-gate. Coinbase + multi-wallet support.

**Don't make onboarding hard.** The customer signs up with email + Stripe Identity (existing flow). The audit-ledger wallet link happens lazily, when the first anchor record is ready to mint.

At that moment, the platform shows: *"This worker produced a material event worth anchoring. To save the cryptographic proof to your audit ledger, connect a wallet. (Or, we can hold the anchor record in custody until you connect one later.)"*

**Wallet options at link time:** Coinbase Wallet (primary recommendation), Coinbase Business, MetaMask, Binance Wallet, PayPal Wallet, any other EVM-compatible Base/Polygon wallet. Multi-wallet support from day 1 — the platform is chain-agnostic per the patent claim and remains tone-agnostic per Sean's guidance: this is not a crypto product, it's an audit product that happens to use blockchain.

**Coinbase opportunity:** SOCIII anchoring on Coinbase Wallet rails opens an entirely new market for Coinbase — every audit-required vertical (real estate, healthcare, aviation, legal, government) becomes a Coinbase Wallet user category. This is a co-marketing conversation to have with Coinbase Business once volumes justify it.

**Tone discipline (Sean):** *"There's no need to go crypto nerd and make this about chains. It's not about chains and selling memecoins."* All customer-facing copy uses "audit ledger" / "logbook entry" / "anchored." Internal docs can use technical terms (NFT, ERC-721, etc.) — customer surfaces never do.

### Q3 — Cost transparency + batching. RESOLVED → show all costs; $1 minimum per anchor; batched anchoring at $5–$10/batch.

**Cost transparency rule:** every anchor cost is visible to the customer before commit (the pre-publish constraint check is the natural surface — "this action will create a logbook entry; anchor cost: $1.00").

**Pricing structure:**
- Single-event anchor: **$1.00 minimum per anchor** (base Coinbase/Base gas at ~$0.02 + platform margin to a flat-rate $1 floor for billing simplicity)
- Weekly merkle-batched anchor: **$5.00 flat per batch** (covers up to N entries per batch — N TBD by volume profile, suggested 50–200)
- Monthly merkle-batched anchor: **$10.00 flat per batch** (covers up to 4× the weekly volume)
- Anchor mode (real-time vs. weekly vs. monthly) is a per-worker setting the customer chooses

The customer sees this presented as: *"You can save money by batching. For most use cases, weekly is the right choice. For evidence you may need to defend in court within hours, real-time is the right choice."* Decision lives in worker settings; default is per-worker (high-stakes workers default to real-time; low-stakes default to weekly).

**Per-event anchoring vs. batched:** both produce the same legal weight (each entry is still independently verifiable via merkle proof in the batched case). The cost difference is purely on-chain gas amortization. Customer chooses based on time-to-availability of the cryptographic proof and budget.

### Q4 — What gets stored on-chain vs. off-chain. RESOLVED → reference content in database (always) + image of the actual document/task (preferred for material events).

The minimum: the on-chain anchor record carries a hash + a URI. The URI points to a SOCIII-controlled object (Firebase Storage or similar) that holds the structured event payload (parties, timestamps, identity attestation refs, composition hash).

The preferred: for any event with a meaningful customer artifact (a signed deed, an executed contract, a recorded permit, a closing HUD-1, a patent filing receipt), the storage object also holds an image or PDF of the actual artifact. This makes the logbook entry self-explanatory when the customer (or their counsel, or a regulator) opens it three years later.

**Storage model:**
```
On-chain anchor record:
  - parent DTC ref or compound DTC ref
  - payload hash (sha-256)
  - URI to storage object (https://storage.sociii.ai/audit/{anchor-record-id})
  - identity attestation ref
  - composition hash

Off-chain storage object:
  - the structured event payload (JSON)
  - the artifact (PDF, image, or "no artifact — see linked DTC" marker)
  - a human-readable summary ("Closing executed for property at 4529 Winona Ct
    on 2026-06-19, $475,000, all parties identity-verified, all rules passed")
```

Storage object is content-addressable; URI is canonical. If platform goes dark, the on-chain anchor still proves *what happened* (via the hash + identity bond) and customers can request the storage payload from any honest archive. If storage object is unavailable, the on-chain proof still survives — the artifact is recoverable from the customer's own files (a deed always exists in the county recorder's records; a contract always exists with the parties).

**The "always reference, often hold the actual artifact" rule** is the right balance between on-chain cost (kept minimal — never store a PDF on chain) and customer utility (the storage object is the customer's friend-of-the-court file when something goes wrong).

---

## 13. Related

- Filing C — Multi-Tier Composable Rule-Based Governance (the patent this implements)
- Filing 1 — Audit Trail Provisional (the 2026-05-24 audit chain claim)
- `apps/business/public/docs/raas.md` — five-tier rule hierarchy that produces the composition hash
- `apps/business/public/docs/canvas-tabs.md` — Audit Trail canvas tab is the customer-facing surface
- `[[project-coinbase-business-approved]]` memory — the unlock that made this build week possible
- `[[project-external-accounts-register]]` memory — the Coinbase Business account itself is a record in the Vendor Master
