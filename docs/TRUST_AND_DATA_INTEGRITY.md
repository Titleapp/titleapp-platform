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

**Verify it yourself — current state, stated plainly.** Today the record is **independently verifiable against a published proof**: we publish the inclusion proof and the external anchor reference, and your team (or an auditor) can confirm a record against the public anchor by hand. The **standalone one-command verifier (CLI/API) is on the roadmap** (see §11) — until it ships we do not claim a turnkey "click to verify" tool; we claim verifiability against a published proof, which is the property that actually matters for an audit.

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
- Any access is **least-privilege, time-boxed, and logged** — and on Dedicated/BYOC it is **gated by your CMEK**, so you can revoke our ability to decrypt entirely.
- **Approval mechanism, not just a promise.** Support access to a tenant requires (a) an open ticket from your side or your written authorization, and (b) a second-person internal approval — no single SOCIII employee can self-grant access to your data.
- **The access log is itself tamper-evident.** Every access event — who, when, under which ticket, what they touched — is written into the **same append-only, hash-chained, anchored audit trail** as your operational records. That means our own staff access to your data is held to the same "provably untampered" standard as everything else; we cannot quietly delete the evidence that we looked. On Enterprise tier this access log is available to you for review.

---

## 7. Retention, deletion & the anchor tension

- **Default retention:** [CONFIRM window per tier]. Configurable by contract.
- **Deletion cascade:** deletion removes the record from primary stores and cascades to backups within [CONFIRM backup-cycle window]; we provide deletion confirmation.
- **The honest technical tension — deletion vs. immutability.** The external anchor stores only a **hash/Merkle root — never the underlying data or any PII.** So deleting a record does **not** require un-anchoring: the anchor continues to prove that history is intact while revealing nothing about deleted content. For "right to be forgotten" / hard-delete, we use **crypto-shredding** — destroying the CMEK key renders the encrypted data permanently unrecoverable, while the residual anchor remains a meaningless hash. You get provable history *and* honored deletion.

---

## 8. Security posture, incident response & disclosure

- **Independent validation (today), stated honestly:** we do **not yet hold a third-party security attestation** (no completed external pentest report or SOC 2 on file as of this version). What exists today is internal review and the architectural controls described in this document. We treat this as a gap to close, not to paper over — SOC 2 and a third-party penetration test are the next milestones (below), and we will share status and, when available, the report or bridge letter on request. *(When a pentest/SOC 2/bug bounty is in fact engaged, name the firm and the date here and delete this honest-gap wording.)*
- **SOC 2:** on the roadmap; target [CONFIRM]. We will share the bridge letter / progress on request.
- **Incident response:** documented IR plan with defined severities. **Breach notification within [CONFIRM ≤72h] of confirmation**, to your designated contact, with scope, affected data, and remediation. You are notified **before** any public disclosure.
- **Availability:** [CONFIRM SLA / target uptime] for Dedicated/Enterprise; status page at [CONFIRM]. RTO [CONFIRM] / RPO [CONFIRM].
- **Responsible disclosure / security contact:** report vulnerabilities to **[CONFIRM security@…]**; we acknowledge within [CONFIRM] and do not pursue good-faith researchers.

---

## 9. Subprocessors

A current subprocessor list is part of the DPA. At minimum it discloses, for each: name, role, region, and what data category it touches. **Model vendors your workers call (e.g., Anthropic/Claude, OpenAI/GPT) are subprocessors** and are listed as such with their data-handling terms.

**Model training — the precise claim.** **No model vendor we use trains on your data.** This is the consistent, contractual guarantee across every model subprocessor: we operate under enterprise API terms that prohibit training on inputs/outputs, and we will not route your data to any tier that permits it.

The thing that varies per vendor — and is disclosed exactly in the subprocessor exhibit — is **transient retention** (how long, if at all, a prompt is held for abuse-monitoring before deletion). Some vendors offer zero-retention; others hold for a short, bounded window. **"No training" is the headline and it holds everywhere; "retention window" is the per-vendor detail, listed in the exhibit so the two are never conflated.** [CONFIRM exact per-vendor retention windows in the subprocessor exhibit.]

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

- **Export:** full record set — events, attachments, and verification proofs — as **JSON event exports plus original files** [CONFIRM final format detail]. Self-serve export is available on demand; a complete bulk export is **typically delivered within ~5 business days of request** (exact SLA set in the MSA).
- **No lock-in:** the defensible value is the record model and rules engine, not our cloud. With BYOC the deployment is already yours.
- **Wind-down:** on termination, you receive a final export and we **delete customer data within ~30 days** (sooner on request; exact window and any regulatory-hold exceptions set in the MSA). Ongoing commitments and any anchoring continuity are defined in the MSA. *(Ranges here are indicative defaults for orientation; the binding numbers live in the MSA.)*

---

## 13. Talking points (short version)

- "SOCIII is a **tamper-evident audit trail** your AI workers write to — the record is the asset, the workers are the interface." *(§1)*
- "Your data stays **in your region, isolated, under keys you hold and can revoke**, with a contractual exit." *(§2, §12)*
- "History is **provably untampered against even an insider** — anchored to an independent ledger, verifiable against a published proof, **without anyone holding cryptocurrency.**" *(§3)*
- "Even **our own staff's access to your data** is second-person-approved and written into the same tamper-evident log." *(§6)*
- "AI actions are **governed by a rules engine + human approval gates**, every action attributable; **no model vendor trains on your data.**" *(§4, §5, §9)*
- "We **train your IT to build their own workers**, so it scales across departments without bespoke vendor work." *(§10)*
- "We're an **early-stage vendor being honest about it** — production infrastructure today, SOC 2 and a third-party pentest on a named roadmap, not vaporware and not decade-old varnish." *(§8, §11)*

---

## Open items to finalize before external distribution

These `[CONFIRM]` items must be filled by you / ops / counsel — do not ship externally with placeholders:
breach-notification window · RTO/RPO · uptime SLA + status page · security@ contact + ack window · retention windows + backup-cycle · subprocessor exhibit + per-vendor retention · current independent-validation status · SOC 2 target date · verifier ship status · export format/SLA · wind-down timeline · internal-access approval workflow.

## Document version history
| Version | Date | Notes |
|---|---|---|
| v1 | 2026-06-26 | Initial draft |
| v2 | 2026-06-26 | Red-team pass: SOCIII naming + SOC disclaimer; added incident response, subprocessors, model-training, internal access, retention/deletion+anchor tension, pentest/SLA/security-contact/version history; sharpened immutability/verify/model-agnostic/attribution claims; reframed BYOC burden + crypto-as-default-RFC3161 + honest maturity |
| v2.1 | 2026-06-26 | Second review pass: §3 verifier de-double-claimed (softer "verifiable against a published proof" register); §6 added second-person approval mechanism + tamper-evident access log; §8 independent-validation gap stated plainly instead of papered; §9 model-training headline made precise vs. per-vendor retention; §12 exit/wind-down given indicative ranges (~5 biz days export, ~30-day deletion); §13 talking points carry section references + honest-maturity line |
