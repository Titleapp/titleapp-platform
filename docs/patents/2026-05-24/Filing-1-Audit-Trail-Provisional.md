# Filing 1 — Identity-Anchored Hash-Chain Audit Trail with Version-Pinned Rule-Set Provenance and Confidential Payload Retention

**Type:** Provisional Patent Application (35 U.S.C. § 111(b))
**Filing target:** Sun 2026-05-24 via USPTO EFS-Web
**Applicant:** SOCIII Inc. (Delaware C-corporation)
**Named Inventor:** Sean Lee Combs
**Small entity status:** Yes
**Estimated filing fee:** $120

---

## TITLE OF INVENTION

**Identity-Anchored Hash-Chain Audit Trail System with Version-Pinned Rule-Set Provenance, Confidential Off-Chain Payload Retention, and Chain-Agnostic Anchoring for AI-Powered Governance Decisions**

---

## FIELD OF THE INVENTION

The present invention relates to audit trail systems for software-mediated decisions, and more particularly to a hash-anchored cryptographic audit chain wherein every governance decision produced by an AI-powered software agent is bound to an immutable proof-of-existence record that includes (a) a cryptographic hash of the full decision payload, (b) a reference to the pinned version of the rule set under which the decision was evaluated, (c) a cryptographic reference to the identity attestation of the acting user, (d) a signature from the platform operator, and (e) an anchor written to a public blockchain — while the underlying decision payload is retained in append-only off-chain storage accessible only to authorized parties, providing the tamper-evident properties of blockchain combined with the confidentiality properties required for regulated industries.

---

## BACKGROUND OF THE INVENTION

### Continuous Invention Thread

This invention extends a continuous body of work in blockchain-anchored governance and parent-child digital identity architecture, including U.S. Patent Application No. 18/398,973 (Combs, filed December 28, 2023; abandoned in prosecution and published as prior art approximately June 28, 2025) which disclosed foundational parent-child Digital Title Certificate (DTC) architecture and the use of blockchain anchoring to provide tamper-evidence for asset records, and the December 2024 Blockchain Logbook System filing (Combs) which extended that architecture to dynamically-updatable logbook records with package-transfer semantics. The present invention is a focused contribution claiming the **audit trail composition layer** — the specific architecture by which AI-powered governance decisions are bound to identity, to pinned rule sets, and to immutable proof-of-existence in a manner that preserves confidentiality of the underlying payload while providing strong tamper-evidence properties.

### Background — The Audit Trail Problem in Regulated AI Systems

The deployment of AI-powered software agents (large-language-model-based assistants, decision-support systems, autonomous workflow execution) in regulated industries (financial services, healthcare, real estate, securities, government, aviation) raises a fundamental audit-trail problem:

1. **AI outputs are probabilistic.** Unlike deterministic code, AI agents may produce different outputs for similar inputs. Audit trails must capture the actual output at the time of the decision, not a reconstruction from inputs.

2. **Rule sets evolve.** Compliance rules, business policies, and platform safety invariants change over time. An audit must reconstruct the exact rules in effect at the time of the decision — not the rules in effect at the time of the audit.

3. **Identity must be verifiable.** Regulators, courts, and counterparties need cryptographic proof of who initiated the action, not merely a username. Identity attestations from third-party providers (KYC/AML, biometric verification, professional licensure) must flow into the audit record.

4. **Payloads contain sensitive data.** Decision payloads frequently include personally identifiable information (PII), protected health information (PHI), financial details, or trade secrets. The audit must protect this data while still proving the decision occurred.

5. **Tamper-evidence is necessary.** Records must be provably unchanged from the time of the decision. Centralized databases provide no cryptographic tamper-evidence; an internal actor can edit them. Public blockchains provide tamper-evidence but expose payloads.

6. **Records must outlive infrastructure.** Audit records must remain accessible and verifiable even if the platform that created them ceases to exist, is acquired, or changes vendors.

### Prior Art Limitations

While the cited prior art (18/398,973 and the December 2024 logbook filing) establishes the foundational use of blockchain anchoring to provide tamper-evidence for asset records, those disclosures do not enable:

- **Version-pinning of rule sets** at the time of each audit event, with the pinned rule-set reference cryptographically included in the on-chain anchor. Without this, the auditor cannot reconstruct which rules governed the decision.

- **Identity-anchored audit composition** where the user's identity attestation reference is included as a first-class element of the audit event payload, providing a cryptographic chain from action → composed rules → identity.

- **The on-chain hash / off-chain payload split** as a deliberate architectural pattern providing tamper-evidence without exposing decision data. The 2023 prior art described blockchain anchoring of records but did not specifically claim the confidentiality-preserving architecture of hashing on-chain while retaining payloads in authorized off-chain storage.

- **AI-specific audit event composition** wherein the audit payload includes the AI worker identifier, the input that triggered the decision, the composed rule set under which the worker operated, the rule-by-rule evaluation outcome, the worker's output, and the action outcome (executed, blocked, routed to human review).

- **Chain-agnostic anchor abstraction** allowing the same audit chain to anchor to Base, Ethereum, Polygon, Solana, Avalanche, or permissioned chains without changing the audit semantics.

- **Authorized audit access keyed by hash** — a mechanism by which authorized auditors (regulators, courts, counterparties under subpoena) can retrieve the off-chain payload for a specific on-chain hash without requiring access to the full audit database.

The present invention provides these capabilities through novel system composition.

---

## SUMMARY OF THE INVENTION

The present invention provides an Identity-Anchored Hash-Chain Audit Trail System (the "System") comprising:

1. **An audit event schema** wherein each AI-mediated governance decision generates a structured event record containing:
   - A unique event identifier
   - Timestamp (UTC, with sub-second precision)
   - The acting AI worker identifier and version
   - The acting user's identity attestation reference (cryptographic reference to a separately-issued attestation from a hosted identity rail)
   - The pinned rule-set version (a cryptographic content hash uniquely identifying the composed rule set in effect at the time of the event)
   - The input context (the prompt, query, or trigger that initiated the decision)
   - The rule-by-rule evaluation outcome (which rules evaluated, with what severity, producing what verdict)
   - The worker's output
   - The action outcome (executed, blocked, routed to human review, with the reason)
   - The platform's signing identifier

2. **A cryptographic hash function** applied to the event record producing a 256-bit (or larger) hash that uniquely identifies the event.

3. **A platform-signature step** wherein the hash is signed by the platform's private signing key, producing a signed hash.

4. **A chain-agnostic anchor adapter** that writes the signed hash to a target public blockchain (preferred embodiment Base; alternative embodiments Ethereum, Polygon, Solana, Avalanche, and others). The anchor adapter normalizes across chains so the same audit-chain semantics apply regardless of the underlying chain.

5. **An off-chain payload retention layer** wherein the full event record (including the input, output, rule evaluations, and any associated data) is stored in append-only secure storage with row-level encryption. The off-chain payload is accessible only to authorized parties (platform operators with appropriate role permissions, the user who initiated the action, authorized regulators, courts under subpoena).

6. **A hash-keyed retrieval API** providing programmatic access to the off-chain payload given a valid on-chain hash and appropriate authentication. An auditor presented with a hash from a counterparty's records can request the corresponding payload through this API.

7. **Version-pinning integration** with a separate Rule Composition Engine (referenced from co-pending applications) wherein the composed rule-set version is computed deterministically from the inputs and persisted alongside the event. Rule-set versions are themselves content-hashed; the pinned reference allows reconstruction of the exact rules under which the decision was made.

8. **Identity attestation integration** wherein the user's identity attestation reference flows into the event payload, providing a cryptographic chain through to the third-party identity provider's attestation (Stripe Identity, Coinbase Verified, or similar) without exposing the user's PII in the on-chain hash.

9. **Retention and access policy enforcement** wherein off-chain payloads are governed by per-vertical retention rules (e.g., HIPAA mandates seven-year retention for healthcare events; financial services rules vary by jurisdiction) and per-event access policies (which roles or entities may retrieve which events).

The System provides:

- **Tamper-evidence** for every governance decision through the on-chain anchor
- **Confidentiality** for the underlying decision data through off-chain retention
- **Reproducibility** through version-pinning of the rule set in effect at the time of the decision
- **Identity provenance** through the cryptographic reference to the user's identity attestation
- **Chain-agnostic operation** through the anchor adapter abstraction
- **Authorized audit access** through the hash-keyed retrieval API
- **Defensive longevity** wherein audit records remain verifiable even if the platform ceases to exist (the on-chain anchors and any party's local copy of the off-chain payload together suffice to verify the decision occurred)

---

## DETAILED DESCRIPTION OF EMBODIMENTS

### System Architecture

The System comprises four principal subsystems operating in concert:

**1. The Event Composer.** A backend service invoked by AI worker execution paths and by rule-evaluation services. Given the inputs (acting worker, user, context, rule set, output), the composer assembles a structured event record per the schema in the Summary section.

**2. The Hash-and-Sign Service.** Stateless transformation: serializes the event record into a canonical byte representation (JSON with sorted keys and stable encoding in the preferred embodiment), applies SHA-256 (or a stronger hash function in embodiments requiring post-quantum resistance), and signs the hash with the platform's private signing key.

**3. The Anchor Adapter.** Chain-agnostic abstraction over public blockchain anchoring. The adapter exposes a uniform interface (`anchor(signedHash, metadata) → AnchorReceipt`) and implements chain-specific adapters internally. The preferred embodiment writes anchors as small payload transactions on Base (selected for cost-efficiency and ecosystem reach as of the filing date). Alternative embodiments include Ethereum (for maximum decentralization), Polygon (for cost-efficiency at scale), Solana (for fast settlement), Avalanche (for sub-net isolation), and permissioned chains such as Hyperledger Fabric (for enterprise deployments with data-residency requirements).

**4. The Payload Store.** Append-only, row-encrypted, multi-region storage holding the full event payload keyed by the event's cryptographic hash. The store enforces:
   - **Append-only writes** — once persisted, an event record cannot be modified
   - **Row-level encryption** — each event's payload is encrypted with a key derived from the platform master key and the event hash, ensuring that a database breach does not expose unrelated events
   - **Access policy enforcement** — read access is mediated by the platform's authentication and authorization layer, with per-event policies governing who can retrieve what
   - **Retention policy enforcement** — events are retained per the vertical-specific rules in the composed rule set (e.g., seven years for HIPAA, varying durations for financial services)

### The Audit Event Lifecycle

A representative audit event proceeds as follows:

1. **Trigger.** An AI-powered software agent is invoked. The Rule Composition Engine assembles the applicable rule set, the composition hash is computed.

2. **Worker execution.** The agent executes its function within the composed rule-set constraints, producing an output.

3. **Output validation.** The output is evaluated against the composed rules.

4. **Pre-publish check (if applicable).** If the output proposes an external action, the pre-publish constraint check runs.

5. **Action decision.** Based on the validation outcomes, the action either executes, blocks, or routes to human review.

6. **Event composition.** The Event Composer assembles the full event record including all the elements from the Summary section.

7. **Hash-and-sign.** The Hash-and-Sign Service produces a signed hash.

8. **Anchor.** The Anchor Adapter writes the signed hash to the target public blockchain, receiving an anchor receipt (transaction hash, block number, timestamp from the chain).

9. **Payload persist.** The full event record (including the anchor receipt) is written to the Payload Store keyed by the event hash.

10. **Return.** A response is returned to the calling worker, including the event hash so the user can be shown the audit-chain reference if desired.

### Authorized Audit Access

When an authorized party (regulator, court under subpoena, counterparty with appropriate access grant) presents a hash, the System verifies authorization and returns the corresponding off-chain payload:

1. Authentication of the requesting party
2. Authorization check against the event's access policy
3. Retrieval of the encrypted payload from the Payload Store
4. Decryption with the appropriate key
5. Return of the payload to the requestor with a verifiable retrieval receipt (which is itself recorded as a child audit event — every access of a sensitive audit record is itself auditable)

### Cross-Industry Applications

The System contemplates application across regulated industries:

**Healthcare.** Every clinical decision support output, prior authorization decision, prescription suggestion, or medical record modification by AI-powered tools generates an audit event. HIPAA's seven-year retention rule is enforced via the per-vertical retention policy. Joint Commission auditors can request payload retrieval against on-chain hashes.

**Financial services.** Every algorithmic trading decision, credit underwriting recommendation, compliance check, or transaction approval generates an audit event. SEC, FINRA, and CFPB requirements drive the retention policy. The on-chain anchor provides the tamper-evidence required for regulatory examinations.

**Real estate.** Title transfer recommendations, escrow release decisions, and compliance evaluations are audit-anchored, with retention policies matching state-by-state recording statute requirements.

**Aviation.** Every Pilot Decision Support output (CoPilot in the SOCIII platform's terminology) generates an audit event. FAA airworthiness directive evaluations and flight-planning decisions are audit-anchored to support post-incident reconstruction and certification compliance.

**Government contracting.** Every FAR/DFARS compliance evaluation, set-aside qualification check, and approval routing is audit-anchored, with audit chain available for GAO inspection.

**Education.** Academic record updates, credential issuance, and disciplinary decisions are audit-anchored, with FERPA retention rules enforced.

### Chain-Agnostic Operation

The Anchor Adapter design ensures the System's value does not depend on any single blockchain remaining operational or affordable:

- If Base experiences outage, the adapter can re-route to a backup chain
- If transaction costs on a target chain become economically unviable, the system can migrate to a more cost-effective chain
- If a chain ceases to exist (precedent: failed blockchain projects), the historical anchors on that chain remain verifiable from the chain's archived state, while new anchors flow to a successor chain
- Permissioned chains (Hyperledger, Quorum) are supported for enterprise deployments with regulatory data-residency requirements

### Confidentiality Properties

The hash-on-chain / payload-off-chain split provides the System's confidentiality guarantee:

- The on-chain anchor reveals only that an event of a specific hash occurred at a specific time, signed by a specific platform key
- The on-chain anchor does NOT reveal the acting user, the input, the output, the rule evaluations, or any sensitive content
- The off-chain payload is encrypted at rest and accessible only through the authenticated retrieval API
- Even a complete leak of the on-chain anchor data set reveals no PII, PHI, financial details, or trade secrets

This is materially different from naively storing decision data on a public blockchain (where the data is exposed forever) and from purely-off-chain audit trails (where the auditor must trust the platform's claim that records have not been edited).

### Defensive Longevity

The System is designed for audit records to remain verifiable beyond the platform's lifecycle:

- On-chain anchors are written to public blockchains that persist independently of the platform
- Any party with a local copy of the off-chain payload can verify against the on-chain anchor at any future time using the standard cryptographic primitives (hash, signature verification)
- If the platform ceases to exist, regulators or courts that have previously retrieved payloads can still verify those payloads against the chain
- New anchors cease being written (no successor platform creating new audit events) but the historical audit chain remains intact and verifiable indefinitely

---

## BRIEF DESCRIPTION OF THE DRAWINGS

(To be supplied with formal drawings prior to filing.)

**Figure 1:** System architecture overview showing Event Composer, Hash-and-Sign Service, Anchor Adapter, Payload Store, and Hash-Keyed Retrieval API.

**Figure 2:** Audit event schema showing all required fields with example values for a representative governance decision.

**Figure 3:** Audit event lifecycle flow diagram showing the ten stages from trigger through anchor and payload persistence.

**Figure 4:** Authorized audit access flow showing authentication, authorization, decryption, and child-event recording for access auditing.

**Figure 5:** Chain-agnostic anchor adapter architecture showing the uniform interface and chain-specific implementations (Base, Ethereum, Polygon, Solana, Avalanche, Hyperledger).

**Figure 6:** Confidentiality split diagram showing what is and is not visible on-chain vs. off-chain.

**Figure 7:** Cross-industry application matrix showing how the architecture serves healthcare, financial services, real estate, aviation, government contracting, and education.

---

## CLAIMS

(Provisional claims; non-limiting.)

**Claim 1.** A computer-implemented audit trail system for AI-powered governance decisions, the system comprising:
   (a) an event composer service that assembles, for each governance decision, an event record comprising at least an event identifier, timestamp, AI worker identifier and version, user identity attestation reference, pinned rule-set version reference, input context, rule evaluation outcome, output, action outcome, and platform signing identifier;
   (b) a hash-and-sign service that produces a cryptographic hash of the event record and signs the hash with the platform's private key;
   (c) a chain-agnostic anchor adapter that writes the signed hash to a target public blockchain;
   (d) an append-only off-chain payload store that retains the full event record with row-level encryption and access policy enforcement; and
   (e) a hash-keyed retrieval API providing authorized parties with access to the off-chain payload corresponding to a given on-chain hash.

**Claim 2.** The system of Claim 1, wherein the chain-agnostic anchor adapter supports anchoring to blockchains including but not limited to Base, Ethereum, Polygon, Solana, Avalanche, and permissioned Hyperledger Fabric.

**Claim 3.** The system of Claim 1, wherein the pinned rule-set version is a cryptographic content hash uniquely identifying the composed rule set in effect at the time of the event, enabling reconstruction of the exact rules under which the decision was made.

**Claim 4.** The system of Claim 1, wherein the user identity attestation reference is a cryptographic pointer to a separately-issued attestation from a hosted identity rail, providing a verifiable chain from action through composed rules to user identity without exposing personally-identifiable information on the public blockchain.

**Claim 5.** The system of Claim 1, wherein the off-chain payload store enforces retention policies derived from the vertical-specific rules in the composed rule set, including but not limited to seven-year retention for HIPAA-governed healthcare events.

**Claim 6.** The system of Claim 1, wherein each authorized retrieval through the hash-keyed retrieval API generates a child audit event recorded to the audit chain, providing audit-of-audit-access capability.

**Claim 7.** A method for creating a tamper-evident audit record for an AI-mediated governance decision, the method comprising:
   (a) composing an event record including the elements specified in Claim 1;
   (b) computing a cryptographic hash of the event record;
   (c) signing the hash with a platform private key;
   (d) writing the signed hash to a public blockchain through a chain-agnostic adapter;
   (e) persisting the full event record to append-only off-chain storage with row-level encryption; and
   (f) returning the event hash to the calling system.

**Claim 8.** The method of Claim 7, further comprising verifying audit records by:
   (a) retrieving the on-chain anchor at the recorded transaction reference;
   (b) verifying the platform signature on the on-chain hash;
   (c) retrieving the off-chain payload through the hash-keyed retrieval API;
   (d) re-computing the hash of the retrieved payload; and
   (e) confirming the re-computed hash matches the on-chain anchor.

**Claim 9.** The system of Claim 1, applied to healthcare wherein the composed rule set enforces HIPAA-compliant access controls within the off-chain payload retrieval API.

**Claim 10.** The system of Claim 1, applied to financial services wherein each algorithmic trading decision, credit underwriting recommendation, or transaction approval generates an audit event with the relevant regulatory retention policy enforced.

**Claim 11.** The system of Claim 1, applied to real estate transactions wherein title transfer evaluations and escrow release decisions are audit-anchored with retention matching state-by-state recording statute requirements.

**Claim 12.** The system of Claim 1, wherein the system continues to provide verifiability of historical audit records after the operating platform ceases to exist, through the persistence of on-chain anchors on the public blockchain and any party's local retention of corresponding off-chain payloads.

**Claim 13.** The system of Claim 1, wherein audit events are linked into a hash chain by including the prior event's hash in the current event's payload, providing additional tamper-evidence properties (any tampering with a historical event invalidates the hash chain of all subsequent events).

**Claim 14.** The system of Claim 1, applied to aviation wherein every Pilot Decision Support output, airworthiness directive evaluation, and flight planning decision generates an audit event supporting post-incident reconstruction and FAA certification compliance.

**Claim 15.** The system of Claim 1, wherein the off-chain payload encryption uses keys derived from a platform master key and the event hash, ensuring that compromise of a single event's decryption does not expose unrelated events.

---

## ABSTRACT

An Identity-Anchored Hash-Chain Audit Trail System for AI-powered governance decisions, comprising an event composer producing structured records containing acting AI worker identifier, user identity attestation reference, pinned rule-set version, input context, rule evaluation outcomes, output, and action outcome; a hash-and-sign service producing platform-signed cryptographic hashes; a chain-agnostic anchor adapter writing signed hashes to public blockchains (Base, Ethereum, Polygon, Solana, Avalanche, or permissioned chains); an append-only off-chain payload store with row-level encryption and access policy enforcement; and a hash-keyed retrieval API providing authorized parties with access to off-chain payloads given on-chain hash references. The System extends prior art parent-child DTC architecture (cited as foundation) by providing the audit composition layer that binds AI governance decisions to identity, to pinned rule sets, and to immutable proof-of-existence in a manner preserving confidentiality of underlying payloads while providing strong tamper-evidence properties. Cross-industry application across healthcare, financial services, real estate, aviation, government contracting, education, and any other regulated domain requiring auditable AI-mediated decisions. Defensive longevity: audit records remain verifiable even after the operating platform ceases to exist.

---

## INVENTORSHIP AND ASSIGNMENT NOTES

**Named Inventor:** Sean Lee Combs, sole inventor.

**Applicant:** SOCIII Inc., a Delaware C-corporation.

**Strategic significance for fundraise:** This is the audit moat patent. Institutional investors evaluating SOCIII as a platform for regulated-industry AI deployment treat the audit trail architecture as the verifiable governance claim — without it, any AI agent is "vibes-based compliance," and regulated buyers cannot rely on it. With this filing in the patent family, SOCIII has IP protection on the specific architecture that makes AI-driven governance auditable in regulated industries. The combination of (a) hash-on-chain + payload-off-chain split, (b) version-pinned rule sets, (c) identity anchoring, and (d) chain-agnostic operation is the structural moat against any competitor attempting to commoditize the audit layer.

**Cross-filing note:** This filing references and is referenced by Filing 2 (Knowledge Capture Pipeline) in the same filing cycle and by the four deferred filings (AI Escrow Locker, Title and Property Assurance, RAAS Multi-Tier Composable Rules, Build-Without-Code) targeting June 2026. Together they form a patent family with this audit-trail filing as the foundational governance-provenance layer that the others build on.

---

*End of Filing 1 draft. Sean to review, refine claim language, and add formal drawings before USPTO submission.*
