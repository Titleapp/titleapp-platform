# SOCIII — Data Integrity & Trust for Large Organizations

**Audience:** enterprise IT, security, legal/compliance, and procurement reviewers.
**Status:** standard reference (applies to every enterprise engagement — this is how we operate, not a pilot exception).
**One-line:** *SOCIII is a tamper-evident audit trail that your governed AI workers write to. The record is the product; the workers are the interface.*

---

## 1. The mental model (read this first)

Most "AI platforms" ask you to trust a black box. SOCIII inverts that. Underneath the AI workers is an **append-only system of record**: every action a worker takes is written as an immutable event, cryptographically hash-anchored, and attributable. The AI proposes; rules validate; events append. Nothing is silently overwritten.

So there are two layers, and they are governed independently:

1. **The record** — an append-only, tamper-evident event store. This is the durable asset and the thing your auditors care about.
2. **The workers** — AI agents that read context and propose actions. They never bypass the rules engine, and everything they do lands in the record.

This is why the right frame for a large institution is **"a governed audit trail with an AI interface,"** not "AI agents loose in our data."

---

## 2. The four questions every enterprise review asks

### Q1. Where does our data live, and who controls it?

We offer a tiered data-residency model. Pick the tier that matches your risk posture:

| Tier | What it is | Isolation | Keys | Best for |
|------|-----------|-----------|------|----------|
| **Shared (standard)** | Logical multi-tenant; every record scoped to your tenant ID | Logical | Platform-managed | Smaller teams, fast start |
| **Dedicated** | Your own isolated project/database, region-pinned | Physical (separate project) | **Customer-managed keys (CMEK)** — you hold the encryption keys in your KMS and can revoke | Universities, regulated enterprises |
| **Customer-hosted (BYOC)** | Deployed into *your* cloud tenancy (templated via infrastructure-as-code) | Full — runs in your account | Yours | Maximum-sovereignty mandates |

For most institutions, **Dedicated + CMEK + a signed DPA** satisfies the security review without you taking on the operational burden of self-hosting. "Our data is isolated, in our region, encrypted with keys we hold and can revoke, with a contractual exit" is usually a *stronger* position than running it yourself.

**What does not change across tiers:** the data model is portable. You can export your complete record set — events, attachments, and verification proofs — at any time, and on exit. No lock-in to our infrastructure; the defensible value is the record model and rules engine, not the cloud vendor.

### Q2. How do we know the records haven't been tampered with?

Every canonical record is **append-only and hash-anchored**. Tamper-evidence is a property of the data, not a promise:

- Records are chained by hash; any alteration breaks the chain and is detectable.
- Periodic anchoring writes a Merkle root to an **independent immutable ledger**, so you can prove a record existed, unchanged, as of a point in time — and verify it *yourself*, without trusting us.

Crucially, **immutability is separate from cryptocurrency.** You do not hold any token, run a wallet, or take on any treasury/accounting exposure to use this. We offer anchoring targets in order of how easily they clear an institutional audit:

1. **No-crypto immutability (default for conservative buyers):** trusted timestamping (RFC-3161) + a public transparency log. Cryptographic proof, zero crypto exposure.
2. **Public-chain anchoring with platform-sponsored gas:** the "anchored to a public blockchain, here's the verifiable proof" story — but **you never hold or touch a token.** Any chain cost is a metered platform fee, not a balance-sheet item for you.
3. **Customer-operated anchor (only if you require independence):** available, but this is the only path that would put any crypto operations on your side, and we generally steer institutions away from it.

The customer-facing artifact is always the **proof and verification tool**, not a chain brand. You can hand an auditor a record and a verifier; they confirm integrity offline.

### Q3. How are the AI workers governed?

- **Rules before action.** Business logic lives in a rules engine, not in model prompts. Every proposed action is validated against tenant-configurable rules before any event is written. Swapping the underlying model (Claude, GPT, etc.) does not change what is permitted.
- **Capability registry.** Executable actions are declared in a versioned registry; if a capability isn't declared, it doesn't exist. Versioning is add-only — existing behavior can't be silently changed.
- **Human approval gates.** Consequential actions require explicit user approval before they commit. Agents propose; people confirm; only then does an event append.
- **Attribution.** Every event records who/what initiated it, under which capability, at which time — a complete, queryable activity trail.

### Q4. What about our compliance obligations (FERPA / HIPAA-adjacent / sector rules)?

- **Data Processing Agreement (DPA)** governs the relationship; we act as a processor/"school official" under a documented legitimate-interest basis where applicable (e.g., FERPA for student education records).
- **Audit logging** of access and actions is inherent to the append-only model.
- **Data residency** (region pinning) and **key control (CMEK)** support data-sovereignty requirements.
- **Export & deletion** paths are documented and contractual.

Sector-specific addenda (FERPA, and others as needed) attach to the standard DPA rather than re-negotiating the core terms.

---

## 3. Onboarding a large institution

Large clients don't want a hand-held pilot; they want a repeatable process and to become self-sufficient. Onboarding has two tracks, both delivered through SOCIII itself:

1. **Governance setup (with your IT/security).** A guided onboarding walks your team through tier selection, region, key management (CMEK), DPA, SSO, and the export/exit plan — producing a documented data-governance configuration for your institution.
2. **Enablement (teach your team to build workers).** Your IT/innovation team learns to build and govern their own workers on the SOCIII SDK. This is what lets one engagement expand across departments (e.g., a university moving from one program to registrar, health sciences, athletics, etc.) **without** bespoke vendor work for each — you own the build, we provide the substrate and the rails.

The goal is explicit: **you are not an experiment.** This is the standard enterprise path, and the end state is your organization operating SOCIII as governed infrastructure.

---

## 4. What is and isn't built today (honest status)

So this memo is accurate to use in a real review:

- **Built and in production:** append-only event store; hash-anchored records ("hash anchored" is visible on records today); capability registry; rules engine; tenant isolation (logical); human approval gates; per-call usage metering (Data Credits); model-agnostic worker execution.
- **Available as an enterprise build (scoped per engagement, not flip-a-switch):** dedicated project + CMEK; BYOC; SSO/SAML; region pinning; sector DPA addenda. These are real engineering/ops commitments and are priced as enterprise tier.
- **On the roadmap (name it as roadmap):** SOC 2 attestation; automated provisioning of the dedicated/BYOC tiers (today the configuration is concierge-guided with provisioning behind it); expanded anchoring partners.

Selling the standard substrate honestly, and scoping the enterprise tier as a deliberate build, is the credible posture — it reads as a mature vendor, which is exactly what a large institution is checking for.

---

## 5. Talking points (the short version)

- "SOCIII is a **tamper-evident audit trail** that your AI workers write to — the record is the asset, the workers are the interface."
- "Your data stays **in your region, isolated, under keys you hold and can revoke**, with a contractual exit."
- "Records are **provably untampered** and you can verify it yourself — **without anyone holding cryptocurrency.**"
- "AI actions are **governed by a rules engine and human approval gates**, not loose in your data — and every action is attributable."
- "We **train your IT to build their own workers**, so this scales across your departments without bespoke vendor work."
