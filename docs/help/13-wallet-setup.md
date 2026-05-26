# 13. Wallet Setup (Blockchain Audit Trail)

> **STATUS:** Skeleton + current-state audit captured below. Full how-to drafting deferred to next pass.

## What this section will cover

How to enable the blockchain audit trail on your account so that important records (DTCs, executed agreements, ownership transfers, attestations) are anchored to a public blockchain — making them tamper-proof and independently verifiable.

## Current state (verified 2026-05-25)

The wallet onboarding flow lives in **Settings → Blockchain Audit**:

- **Toggle:** A single switch enables the blockchain audit trail. State is persisted via `VAULT_BLOCKCHAIN_ENABLED` in localStorage and synced to your account.
- **Wallet:** "SOCIII via Venly (gas fees covered)." The platform manages the wallet on your behalf — you don't bring your own. SOCIII covers gas fees.
- **Chain:** Polygon (current). Records are visible on PolygonScan via the link the platform provides per record.
- **Cost model:** A small per-record fee bundled into the platform's audit-trail pricing (`$0.005/record` per `pricing.js`). The first allowance is included in your subscription tier.
- **What gets anchored:** When you enable the toggle, the platform begins minting blockchain records for verifiable events (DTC creation, document signing, ownership transfer). Per-DTC, you can see the transaction hash and a PolygonScan link.

## Coming soon

- **Base support.** The eventual default chain is **Base** (Coinbase's L2). Polygon is current; Base migration is on the roadmap as part of the Coinbase Business / API integration (task #261).
- **Bring-your-own-wallet.** Currently SOCIII manages the wallet via Venly. A future release adds an option to connect your own wallet (WalletConnect or Coinbase Wallet) and receive blockchain records to it directly.

## Open questions for the full draft

- Walk-through screenshots of the toggle, the wallet-managed-by-SOCIII confirmation, the per-DTC record view, and the PolygonScan link
- The relationship between blockchain audit and the rest of the audit trail (Firestore events vs. on-chain anchoring)
- When to enable: which use cases benefit, which don't
- How to retrieve and verify a blockchain record independently (the "show your work" demo)
- Migration story for users who turn it on now (Polygon) and want their records carried to Base later

---

*Stub created 2026-05-25. See [docs/help/README.md](./README.md) for the full table of contents.*
