# TitleApp — Record Anchors (Storage, Notary, Escrow)

This document defines the **Record Anchors** abstraction used across all TitleApp
verticals (Real Estate, Auto, Aviation, etc.).

Record Anchors provide **proof, integrity, notarization, and fund controls**
without coupling Digital Workers to any single storage or vendor system.

---

## 1) Purpose

Record Anchors exist to:
- provide tamper-evident records
- support digital notarization
- enable escrow-based fund controls
- reference authoritative external registries
- preserve auditability across ownership transitions

Digital Worker workflows may **require anchors**, but never dictate vendor choice.

---

## 2) Anchor Model (Universal)

Any entity or event may include:

```json
recordAnchors: [
  {
    "anchorType": "database | hash | blockchain | nft | notary | escrow | registry",
    "network": "optional (ethereum, polygon, solana, private, etc.)",
    "provider": "optional (Stripe, Venly, Escrow.com, FAA, DMV, etc.)",
    "anchorId": "string identifier",
    "referenceUrl": "optional",
    "createdAt": "timestamp",
    "status": "active | released | expired | superseded"
  }
]
This model is append-only.

3) Anchor Types
A) Database Anchor
Traditional database record

Default for all entities

Required for baseline operation

B) Hash Anchor
Cryptographic hash of record or document

Used for integrity verification

May be anchored on-chain or off-chain

C) Blockchain / NFT Anchor
Tokenized or hash-anchored record

Used for ownership proof, transfer events, or logbooks

Network and provider are abstracted

Examples:

Auto ownership milestone

Property title snapshot

Aviation maintenance log

D) Digital Notary Anchor (CRITICAL)
Used for:

escrow locker events

title/ownership attestations

contract execution acknowledgment

cross-party verification

Digital Notary anchors:

attest to who, when, and what

do not replace licensed notaries unless jurisdiction allows

may reference third-party notary services

This anchor is mandatory for Escrow Locker workflows.

E) Escrow Anchor (Funds Control)
Used to:

reference escrow accounts

lock/unlock funds based on workflow state

provide auditable proof of fund custody

Examples:

Escrow.com

Bank trust accounts

Regulated custodians

Escrow anchors:

do NOT move money themselves

reference external escrow systems

are required before ownership transfer finalization

F) Registry Anchor (External Authority)
Used to reference authoritative systems:

DMV (Auto)

County Recorder (Real Estate)

FAA Registry (Aviation)

OEM systems (optional)

Registry anchors:

store reference IDs

store timestamps

never attempt to mirror registry data

4) Digital Worker Enforcement Rules
Digital Worker rules may declare:

"This workflow requires a notary anchor"

"This ownership transfer requires an escrow anchor"

"This record must be registry-referenced"

If required anchors are missing:

workflow execution halts

user is notified

event is logged

5) Vendor Neutrality
Record Anchors intentionally avoid vendor lock-in.

Default adapters may include:

Stripe (payments)

Escrow.com (escrow)

Venly (NFT / blockchain)

DocuSign (signature)

Google Cloud (storage, OCR)

ForeFlight / FAA (aviation references)

Clients may replace any adapter without modifying the rules engine.

6) Versioning
Scope: Global

Applies to: All Verticals

Status: Active

Version: v1.0

Last Reviewed: 2026-01-21
