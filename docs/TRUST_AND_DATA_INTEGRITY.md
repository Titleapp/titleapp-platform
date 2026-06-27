# SOCIII — Trust & Data Integrity for Large Organizations

**Audience:** enterprise IT, security, legal/compliance, and procurement reviewers.
**Status:** standard reference. This is how we operate for every enterprise engagement — not a pilot exception.
**Document version:** v2 · 2026-06-26 · *(maintain a version table at the end; reviewers check currency.)*

> **A note on the name.** "SOCIII" (pronounced "so-chee") is our company/product name. **It is not a reference to SOC audit frameworks (SOC 1/2/3).** SOC 2 attestation is on our roadmap (see §8); until then, please read "SOCIII" as a product name, not a compliance claim.

**One line:** *SOCIII is a tamper-evident audit trail that your governed AI workers write to. The record is the product; the workers are the interface.*

---

## 1. The mental model

Underneath the AI workers is an **append-only system of record**: every action is written as an immutable event, hash-chained, periodically anchored to an independent ledger, and attributable. The AI proposes; the rules engine validates; events append. Nothing is silently overwritten.

Two layers, governed independently:

1. **The record** — append-only, tamper-evident event store. The durable asset your auditors care about.
2. **The workers** — AI agents that read context and propose actions, never bypassing the rules engine.

The right frame for a large institution: *a governed audit trail with an AI interface*, not "AI agents loose in our data."

---

## 2. Data residency — where it lives, who controls it

| Tier | What it is | Isolation | Keys |
|------|-----------|-----------|------|
| **Shared (standard)** | Logical multi-tenant; every record scoped to your tenant ID | Logical | Platform-managed |
| **Dedicated** | Your own isolated project/database, region-pinned | Physical (separate project) | **Customer-managed (CMEK)** — you hold keys in your KMS, can revoke |
| **Customer-hosted (BYOC)** | Deployed into *your* cloud tenancy via infrastructure-as-code | Full — runs in your account | Yours |

For most institutions, **Dedicated + CMEK + DPA** clears the security review without the burden of self-hosting.

**BYOC — set expectations honestly.** BYOC is maximum control *and* maximum responsibility: you take on patching, scaling, monitoring, and uptime of the deployment in your own cloud. It is the right choice for sovereignty mandates, but it is not "more control for free" — it is an operational commitment on your side, with a shared-responsibility matrix we provide before you choose it.

---

## 3. Data integrity — and the precise claim

We make two **distinct** guarantees; conflating them is a mistake, so we separate them:

1. **Tamper-evidence within the store (hash-chaining).** Records are chained by hash. Any alteration breaks the chain and is *detectable*. On its own this detects tampering after the fact; it does not, by itself, stop an actor with deep infrastructure access from rewriting history *and* recomputing the chain.
2. **Tamper-resistance against that actor (independent anchoring).** Periodically we publish a Merkle root of the record set to an **independent, append-only ledger outside our control**. Because the external anchor is not ours to rewrite, an inside-infrastructure actor *cannot* silently rewrite history and re-anchor — the divergence is provable. **This is the guarantee that actually holds**, and it is the one to lean on.

**Verify it yourself — how.** [CONFIRM build status] We provide an open verification specification and a standalone verifier (CLI/API) that takes a record + its inclusion proof and confirms it against the public anchor, **without trusting SOCIII**. *(If the verifier is not yet shipped, state that plainly and soften the claim to "independently verifiable against a published proof" until it is.)*

**Immutability ≠ cryptocurrency.** You hold no token, run no wallet, and take on no treasury/accounting exposure. Anchoring targets, in order of how easily they clear an institutional audit:

1. **No-crypto (default for regulated buyers):** RFC-3161 trusted timestamping + a public transparency log. Cryptographic proof, zero crypto exposure. **This is our default; we do not foreground a blockchain unless you ask.**
2. **Public-chain anchoring with platform-sponsored fees:** the "anchored to a public ledger" story, you never touch a token, any cost is a metered platform fee.
3. **Customer-operated anchor:** available only if you require it; the only path that would put crypto operations on your side — we steer institutions away from it.

---

## 4. AI governance

- **Rules before action.** Business logic lives in a tenant-configurable rules engine, not in prompts. Every proposed action is validated before any event is written.
- **Capability registry.** Executable actions are declared in a versioned registry; undeclared actions don't exist. Versioning is add-only.
- **Human approval gates.** Consequential actions require explicit approval before they commit.
- **Honest scope of the model-agnostic claim.** The rules engine governs *what is permitted* regardless of model (Claude, GPT, etc.). It does **not** claim identical model *behavior*: prompt-injection, model-specific quirks, and version drift can affect what a worker attempts. Our defense is layered — the rules engine and approval gates are the backstop that holds even when a model misbehaves, and we monitor for capability drift across model versions.

---

## 5. Identity & attribution

Every event records who/what initiated it, under which capability, at what time. **Attribution is only as strong as the identity layer beneath it:**

- **Enterprise tier:** SSO/SAML (your IdP) — attribution ties to your directory identities.
- **Standard tier:** platform-managed identity (email/password + auth provider). Attribution is to the platform account, not a federated enterprise identity.

We state the basis explicitly per tier rather than implying directory-grade attribution everywhere.

---

## 6. Internal access controls (insider threat)

- SOCIII staff do **not** have routine access to customer tenant data.
- Any access is **least-privilege, time-boxed, logged, and (Dedicated/BYOC) gated by your CMEK** — with CMEK, you can revoke our ability to decrypt.
- Support access requires a ticket + [CONFIRM: approval workflow / customer authorization], and every access event is recorded in the same audit trail.

---

## 7. Retention, deletion & the anchor tension

- **Default retention:** [CONFIRM window per tier]. Configurable by contract.
- **Deletion cascade:** deletion removes the record from primary stores and cascades to backups within [CONFIRM backup-cycle window]; we provide deletion confirmation.
- **The honest technical tension — deletion vs. immutability.** The external anchor stores only a **hash/Merkle root — never the underlying data or any PII.** So deleting a record does **not** require un-anchoring: the anchor continues to prove that history is intact while revealing nothing about deleted content. For "right to be forgotten" / hard-delete, we use **crypto-shredding** — destroying the CMEK key renders the encrypted data permanently unrecoverable, while the residual anchor remains a meaningless hash. You get provable history *and* honored deletion.

---

## 8. Security posture, incident response & disclosure

- **Independent validation (today):** [CONFIRM — name what exists: pentest / bug bounty / third-party review. If none yet, say "no third-party attestation yet; SOC 2 in progress" — that is stronger than silence.]
- **SOC 2:** on the roadmap; target [CONFIRM]. We will share the bridge letter / progress on request.
- **Incident response:** documented IR plan with defined severities. **Breach notification within [CONFIRM ≤72h] of confirmation**, to your designated contact, with scope, affected data, and remediation. You are notified **before** any public disclosure.
- **Availability:** [CONFIRM SLA / target uptime] for Dedicated/Enterprise; status page at [CONFIRM]. RTO [CONFIRM] / RPO [CONFIRM].
- **Responsible disclosure / security contact:** report vulnerabilities to **[CONFIRM security@…]**; we acknowledge within [CONFIRM] and do not pursue good-faith researchers.

---

## 9. Subprocessors

A current subprocessor list is part of the DPA. At minimum it discloses, for each: name, role, region, and what data category it touches. **Model vendors your workers call (e.g., Anthropic/Claude, OpenAI/GPT) are subprocessors** and are listed as such with their data-handling terms.

**Model training:** **Your data is not used to train any model.** We use enterprise/zero-retention API tiers where available and contractually prohibit training on your data. [CONFIRM exact per-vendor retention terms in the subprocessor exhibit.]

---

## 10. Onboarding a large institution

Two tracks, both delivered through SOCIII:

1. **Governance setup (with your IT/security):** guided selection of tier, region, CMEK, DPA, SSO, and the export/exit plan → a documented governance configuration for your institution.
2. **Enablement:** your team learns to build and govern their own workers on the SDK — so one engagement expands across departments without bespoke vendor work. You own the build; we provide the substrate and rails.

You are not an experiment — this is the standard enterprise path. (See §11 for an honest read of our maturity.)

---

## 11. Honest maturity statement

We are an **early-stage enterprise vendor with production infrastructure and an honest roadmap — not a pilot program, and not a decade-old platform.**

- **In production:** append-only event store; hash-chaining + anchoring; capability registry; rules engine; tenant isolation (logical); human approval gates; per-call usage metering; model-agnostic execution.
- **Available as a scoped enterprise build:** Dedicated + CMEK; BYOC; SSO/SAML; region pinning; sector DPA addenda. Real engineering/ops commitments, priced as enterprise tier.
- **Roadmap (named as roadmap):** SOC 2 attestation; automated provisioning of Dedicated/BYOC (today concierge-guided); the standalone verifier (if not yet shipped); expanded anchoring partners.

---

## 12. Exit & portability

- **Export:** full record set — events, attachments, and verification proofs — in [CONFIRM format, e.g., JSON + original files], available on demand and at exit, within [CONFIRM SLA].
- **No lock-in:** the defensible value is the record model and rules engine, not our cloud. With BYOC the deployment is already yours.
- **Wind-down:** on termination, [CONFIRM data-return + deletion timeline]; ongoing commitments and any anchoring continuity are defined in the MSA.

---

## 13. Talking points (short version)

- "SOCIII is a **tamper-evident audit trail** your AI workers write to — the record is the asset, the workers are the interface."
- "Your data stays **in your region, isolated, under keys you hold and can revoke**, with a contractual exit."
- "History is **provably untampered against even an insider** — anchored to an independent ledger — and you can verify it yourself, **without anyone holding cryptocurrency.**"
- "AI actions are **governed by a rules engine + human approval gates**, every action attributable; your data **never trains any model.**"
- "We **train your IT to build their own workers**, so it scales across departments without bespoke vendor work."

---

## Open items to finalize before external distribution

These `[CONFIRM]` items must be filled by you / ops / counsel — do not ship externally with placeholders:
breach-notification window · RTO/RPO · uptime SLA + status page · security@ contact + ack window · retention windows + backup-cycle · subprocessor exhibit + per-vendor retention · current independent-validation status · SOC 2 target date · verifier ship status · export format/SLA · wind-down timeline · internal-access approval workflow.

## Document version history
| Version | Date | Notes |
|---|---|---|
| v1 | 2026-06-26 | Initial draft |
| v2 | 2026-06-26 | Red-team pass: SOCIII naming + SOC disclaimer; added incident response, subprocessors, model-training, internal access, retention/deletion+anchor tension, pentest/SLA/security-contact/version history; sharpened immutability/verify/model-agnostic/attribution claims; reframed BYOC burden + crypto-as-default-RFC3161 + honest maturity |
