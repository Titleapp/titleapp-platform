# CODEX S52.15 — Audit Trail Architecture (DTC + NFT Relational Model)

**Date:** 2026-06-02
**Status:** ARCHITECTURE — to lock before the Coinbase Base build week
**Author:** Alex (Sean Lee Combs's Chief of Staff)
**Patent context:** Filing C (Multi-Tier Composable Rule-Based Governance) and the parent-child DTC + audit chain primitives carried forward from the 2023 prior-art provisional and December 2024 Blockchain Logbook System filing

---

## Why this CODEX exists

Coinbase Business is approved for SOCIII Inc. as of 2026-06-01. The audit-trail / on-chain anchor build week is queued for next week. Before we wire it, we need to lock the structural model: what's a DTC, what's an NFT, how they relate, what lives on-platform vs. on-chain, and how the customer sees it.

Sean's architectural insight (2026-06-02 AM): *"DTC is the main 'thing.' Logbook entries (anything that appends a DTC) is an NFT. The appended item may also become its own DTC and may also reference multiple DTCs. Kind of standard relational data structure, but in this case the objects in the database are NFTs."*

This codex captures that model and shows how it operationalizes.

---

## 1. The model in one paragraph

A **DTC (Digital Title Certificate)** is an entity — the asset, the contract, the person, the property, the worker. An **NFT (logbook entry)** is an event — the append, the state change, the action taken on or by an entity. Each NFT carries a parent reference to the DTC it appends. Importantly: **an NFT can itself become a DTC** if the event creates a new entity (a closing event creates a deed-DTC; a signing event creates an agreement-DTC). And an NFT **can reference multiple DTCs** when the event involves more than one entity (a closing references property + buyer + seller; a transfer references vehicle + prior-owner + new-owner). The result is a standard relational graph where every node and every edge is a verifiable, on-chain-anchored, audit-trail object.

---

## 2. The vocabulary, locked

| Term | Definition | Lifecycle | On-chain form |
|---|---|---|---|
| **DTC** | A *thing* — entity with identity. Has a parent (when it's a child of another DTC, e.g., a logbook entry that itself became a DTC). Has children (subsequent DTCs derived from it). Has a logbook of NFTs appending state changes. | Created once. Updated only via NFT appends. Never deleted. | A persistent token (ERC-721 or equivalent) with metadata pointing to the off-chain payload. |
| **NFT (Logbook Entry)** | An *event* — a state-change record appending to one or more DTCs. Atomic, immutable, signed, timestamped, rule-validated. | Minted on event commit. Never updated. Never burned. | An ERC-721 token at mint, with metadata pointing to the off-chain event payload. |
| **Logbook** | The ordered append-only list of NFTs attached to a given DTC. Computed; not stored as a separate object. | Always derived from `WHERE nft.parent_dtc = X ORDER BY ts ASC`. | Not on-chain. The logbook is *implied* by NFTs referencing the DTC. |
| **Compound DTC** | A DTC whose creation event was itself an NFT (the closing event becomes the deed; the signing event becomes the agreement). | The NFT and the DTC are dual-typed: same on-chain token, with both `nft_event_payload` and `dtc_entity_payload` in its off-chain metadata. | Same token. The on-chain doesn't distinguish; the platform distinguishes via metadata fields. |
| **Composition hash** | Per Filing C Claim 3: a deterministic hash of the full composed [RAAS](../../apps/business/public/docs/raas.md) ruleset (all five tiers merged) at event time. Captured in every NFT payload. | Per event. | Field inside the NFT's off-chain metadata. |

---

## 3. The relational shape — concrete real-estate example

Walking through a Tahoe property going from listing → contract → close → recording, using DTCs (squares) and NFTs (arrows):

```
[Property DTC]  ←──── parcel-anchored, created at first encounter
   │
   │  NFT: listing_created (broker action)
   │  NFT: comparable_pulled (worker action, references ATTOM API call)
   │  NFT: photo_set_uploaded (broker action)
   │  NFT: showing_scheduled (worker action)
   │  NFT: offer_received (broker action, references [Buyer DTC])
   │  NFT: counter_offer_sent (broker action)
   │  NFT: offer_accepted (mutual signing event)
   │           ↓
   │     [Purchase Agreement DTC]  ←──── compound: the NFT IS also the DTC of the agreement
   │           │
   │           │  NFT: contingency_inspection (escrow worker action)
   │           │  NFT: contingency_appraisal (escrow worker action)
   │           │  NFT: contingency_financing (escrow worker action)
   │           │  NFT: title_search_complete (escrow worker action, references prior chain on Property DTC)
   │           │  NFT: closing_documents_generated (escrow worker action)
   │           │  NFT: closing_executed (multi-party signing event)
   │           │           ↓
   │           │      [Deed DTC]  ←──── compound: NFT IS also the DTC of the deed
   │           │           │
   │           │           │  NFT: recorded_with_county (county API action)
   │           │           │  NFT: title_insurance_bound (insurer API action)
   │           │           │  NFT: keys_transferred (broker action)
   │           │           │  
   │           │
   │  NFT: ownership_transferred  ←──── appends back to Property DTC,
   │     ↑                                references [Deed DTC] + [Buyer DTC] + [Seller DTC]
   │     └─── this is the "multiple DTC reference" Sean called out
   │
[Property DTC] continues its logbook under new owner
```

Three things this captures that a flat audit log can't:

1. **Compound DTCs** — the Purchase Agreement is both an event (appended to the Property DTC) AND an entity (with its own logbook of contingencies). Same token on-chain, dual semantics off-chain.

2. **Multi-DTC events** — `ownership_transferred` references the Property DTC, the Deed DTC, the Buyer DTC, and the Seller DTC. Every audit query starting from any of those four entities surfaces the same closing event.

3. **Continuity** — the Property DTC's logbook is unbroken across the closing. Subsequent property events (a new lease, a maintenance dispatch, a refinance) continue appending to the same Property DTC under the new owner, because the DTC is parcel-anchored, not ownership-anchored.

---

## 4. The on-platform vs. on-chain split — locked

| Layer | What's there | Why |
|---|---|---|
| **Firestore (primary, queryable)** | Full event payloads, structured by DTC reference. Rich metadata. Composition hash. Identity attestation reference. Worker invocation context. Full rule evaluation trace. | Speed, query, search, regulatory disclosure. This is where the audit log *lives* for daily use. |
| **Coinbase Base (anchor, tamper-evident)** | Hash of each event payload (merkle root for batches at high volume). NFT token minted per event referencing the payload hash. Token transferable to customer wallet. | Cryptographic proof-of-existence at a known time. Tamper-evidence. Customer-held proof. |
| **Customer's Coinbase Wallet** | The NFTs themselves. Customer sees them in their wallet UI. Each NFT clicks through to the off-platform payload (via metadata URI). | Customer holds the proof. Even if SOCIII goes dark, the customer's audit chain is recoverable from their wallet. |
| **Customer's Drive** | A periodic export of the on-platform audit chain as a verifiable package. Recompute the hashes from this package, verify against on-chain anchors. | Belt-and-suspenders backup. The wallet has the tokens; the Drive has the payloads. Recovery without SOCIII is possible. |

The default for daily operation is Firestore. Coinbase is the *trust anchor*, not the *primary store*. This is what Sean meant by "keep organization on platform, use wallet as backup + security."

---

## 5. Granularity — when does an event mint an NFT?

Not every state change is worth an NFT. Minting cost (a Base transaction fee, low but nonzero) and on-chain noise (one NFT per worker tool call would be unreadable) both matter. The granularity rule:

| Event class | Mints NFT? | Lives only in Firestore? |
|---|---|---|
| Material business event (closing, lease executed, vehicle sold, agreement signed) | Yes | Also in Firestore |
| Compliance attestation (inspection passed, license verified, sanctions cleared) | Yes | Also in Firestore |
| Worker invocation that produced a customer-visible deliverable | Yes | Also in Firestore |
| Intermediate worker tool call (ran one Apollo query, looked up one ATTOM record) | No | Yes — Firestore only |
| Internal state shuffle (changed a tab default, edited a fixture) | No | Yes — Firestore only |
| Routine read query | No | Yes — read-only, logged but not minted |

For high-frequency event streams (e.g., a property-management worker logging 50 maintenance dispatches a week), the platform supports **batched merkle anchoring** — many events hashed together into a merkle root, one NFT minted for the root, individual events verifiable via merkle proof. This is invisible to the customer (they still see "your audit trail has 50 entries" in the UI), but it keeps on-chain cost flat.

---

## 6. The customer-facing UI — three surfaces

**A. The DTC view** — for "tell me everything about this property"
```
Tahoe Property — 123 Lakeside Drive (Parcel APN: 042-061-005)
─────────────────────────────────────────────────────────────
Logbook (43 events)
  • 2026-06-02 09:14  Listing created — Christina Soloski Realty
  • 2026-06-02 09:31  Comparable pulled — 3 active, 5 sold (ATTOM, $8.40)
  • 2026-06-03 14:22  Showing scheduled — Mark + Lisa Chen
  • ...
  • 2026-06-19 11:00  Closing executed — see Deed DTC
  • 2026-06-20 09:45  Recorded with Placer County
  • 2026-06-22 16:00  Ownership transferred — new owner: Chen Family Trust

[View child DTCs (2)]  [Export verifiable audit package]  [View on Base ↗]
```

**B. The event view** — for "tell me everything about this closing"
```
Closing Executed — 2026-06-19 11:00 PST
─────────────────────────────────────────
References: Property DTC (Lakeside Dr) · Buyer DTC (Chen Trust) · Seller DTC (Prior Owner) · Purchase Agreement DTC
Worker: Escrow Worker v0.4.2
Composition hash: 0x9f3a... (5 tiers, version-pinned at process initiation)
Identity attestations: [4 parties, all Stripe-Identity verified]
Pre-publish check: PASSED (12 rules evaluated, 0 violations)
Audit anchor: 0xa8d1...e72f on Base block 18,491,773 (2026-06-19 11:00:14 UTC)
NFT token: SOCIII-AUDIT #00109481  →  in Christina Soloski's Coinbase wallet
Customer-visible deliverables: Final HUD-1, Recorded Deed, Title Policy Binder
```

**C. The wallet view** — for "show me what I hold"
```
[Christina Soloski's Coinbase wallet]
SOCIII Audit NFTs (162)
  • #00109481  Closing Executed — Lakeside Dr (Tap to view)
  • #00109449  Listing Created — Lakeside Dr
  • #00109213  Lease Executed — Heavenly Apartments Unit 4
  • ...
```

The wallet is the customer's hold-the-keys surface. They don't operate from there — they operate from the platform UI. But the wallet is what survives if the platform goes dark, gets acquired, has a service outage. It's the cryptographic safety net.

---

## 7. Identity bond per NFT

Per Filing C Claim 7, identity attestations flow into rule-set composition as first-class inputs. Operationalized in the NFT:

- Every NFT carries a reference to the acting user's identity attestation (Stripe Identity verification ID, or Coinbase Verified ID, recorded as a child entry on the user's parent DTC).
- The composition hash binds the rules-as-applied to the identity-as-known at that moment.
- A regulator pulling the audit chain three years later sees: this user was verified-real at the time, these rules were in effect, this is what happened.

This is what makes the audit chain *legally meaningful* in a regulated industry — it's not just "an action happened," it's "an identified party took an action under known rules at a known time, and here's the cryptographic proof."

---

## 8. What we don't build (per Sean's floor)

- **No customer wallet management.** The customer brings their own Coinbase wallet (we suggest Coinbase Business or Coinbase Wallet during onboarding). Customers who can't manage a wallet are not the target customer. The platform does not custody customer NFTs.
- **No on-chain governance.** The audit chain is one-way: events flow on-chain. No on-chain voting, no on-chain rule changes, no DAO mechanics. The platform's sole-director governance per `project_sociii_ip_governance_philosophy` is the only governance layer.
- **No customer-burnable NFTs.** Once minted, NFTs are non-transferable to anyone other than the customer's wallet of record (soulbound to the verified identity). This protects the audit chain from money-laundering vectors and aligns with the "audit not collectible" framing.
- **No alternative chains in v1.** Patent claim is chain-agnostic, but the build is Base-first. Multi-chain support is a v2 question if customer demand arises.

---

## 9. Patent claim alignment

This architecture executes against Filing C as follows:

| Filing C element | How this architecture implements it |
|---|---|
| Claim 1(g) Hash-anchored audit chain | Per-event hash + NFT mint on Base. Merkle batching for high-volume streams. |
| Claim 1(h) Identity anchoring | Identity attestation reference embedded in every NFT payload. |
| Claim 3 Composition hash determinism | Same composition hash computed from same inputs; pinned per NFT. |
| Claim 6 Chain-agnostic operation | Base in v1; architecture supports Ethereum, Polygon, Solana variants without code change to the composition engine. |
| Claim 9 Version pinning for multi-step processes | Compound DTCs (Purchase Agreement, Deed) pin composition hash at creation; subsequent NFTs reference the pinned hash. |

The DTC + NFT relational model is the *embodiment* of the patent's audit-chain claim. It does not introduce new patentable subject matter — it is the specific implementation of the existing claims.

---

## 10. Build sequence — next week

Suggested execution order for the Coinbase week:

1. **Day 1 — Schema lock.** Add `dtc` and `nft` collections to Firestore (or extend existing `dtc` collection if present). Define the metadata schemas. Wire the relational fields (`parent_dtc`, `references_dtcs[]`, `is_compound_dtc`, `composition_hash`, `identity_attestation_ref`).
2. **Day 2 — Mint service.** Build the NFT mint service against Coinbase Business — function takes a structured event payload, computes the hash, mints on Base, returns the token id + transaction hash.
3. **Day 3 — Audit append service.** The platform-facing API that workers call when they need to record a material event: takes the event, runs pre-publish constraint check (already shipped per S52.11 backend work), commits to Firestore, dispatches the mint.
4. **Day 4 — Customer wallet linking.** Onboarding step: customer connects their Coinbase wallet address; future mints route there. Backfill option: mint all of the customer's historical audit events on demand.
5. **Day 5 — Customer-facing UI.** The three views (DTC view, event view, wallet view). Workspace canvas tab for "Audit Trail" on every worker that produces material events.

Estimated five working days for v1. The architecture compiles to about 600-1000 lines of new code plus the schema migration. Not large; the patent work makes most of the architectural decisions for us.

---

## 11. Open questions for Sean (after Christina meeting)

1. **Granularity defaults per worker class.** Should the platform ship defaults (e.g., "RE workers mint on every closing-class event by default") or is granularity always declared per-worker in `catalog.json`?
2. **Customer onboarding for wallet linking.** Required during signup, or progressive (linked when first material event needs minting)?
3. **Cost transparency.** Show the customer the per-NFT mint cost (a few cents on Base), or absorb it as part of the platform's overhead (it's tiny)?
4. **Compound DTC URI scheme.** Should the on-chain metadata URI for compound DTCs serve different content based on `?as=dtc` vs `?as=nft`, or always serve both views?

---

## 12. Related

- Filing C — Multi-Tier Composable Rule-Based Governance (the patent this implements)
- Filing 1 — Audit Trail Provisional (the 2026-05-24 audit chain claim)
- `apps/business/public/docs/raas.md` — five-tier rule hierarchy that produces the composition hash
- `apps/business/public/docs/canvas-tabs.md` — Audit Trail canvas tab is the customer-facing surface
- `[[project-coinbase-business-approved]]` memory — the unlock that made this build week possible
- `[[project-external-accounts-register]]` memory — the Coinbase Business account itself is a record in the Vendor Master
