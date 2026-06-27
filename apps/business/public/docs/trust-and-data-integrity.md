# Trust & Data Integrity

**Audience:** enterprise IT, security, legal/compliance, and procurement reviewers — including public-sector and higher-education buyers. See [Education specifics](#14-education-sector-specifics) below for FERPA and accessibility detail.

> **A note on the name.** "SOCIII" (pronounced "so-chee") is our product name. It is **not** a reference to SOC audit frameworks (SOC 1/2/3). SOC 2 attestation is on our roadmap (§8); until then, please read "SOCIII" as a product name, not a compliance claim.

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
2. **Tamper-resistance against that actor (independent anchoring).** Periodically we publish a Merkle root of the record set to an **independent, append-only register outside our control**. Because the external anchor is not ours to rewrite, an inside-infrastructure actor *cannot* silently rewrite history and re-anchor — the divergence is provable. **This is the guarantee that actually holds**, and it is the one to lean on.

**The honest bound — the anchor interval.** Anchoring is periodic, so the insider-resistance in (2) protects everything *up to the last anchor*. Records created **since** the last anchor are protected only by the weaker hash-chaining in (1) until the next anchor publishes. Our current anchor cycle runs at minimum daily; the exact frequency is disclosed in the service documentation and updated as our infrastructure evolves.

**Which anchor gives which property — no sleight of hand.** These are different trust models and we don't blur them:
- **RFC-3161 trusted timestamping** proves *when* a record existed, via a trusted timestamp authority (strong, but not "trustless").
- **A public transparency log** (Certificate-Transparency-style) proves *append-only inclusion*.
- **Public-chain anchoring** is the only target that delivers true *trustless, no-one-can-rewrite* resistance.

Our current production default is **RFC-3161 trusted timestamping via an independent TSA, with Merkle-tree inclusion proofs published to an append-only transparency log**. Public-chain anchoring is available as a configuration option on Dedicated tier. The insider-resistance argument holds in its strongest form under public-chain anchoring; under a TSA it reduces to "a trusted third party attests the timeline."

**Verify it yourself — current state, stated plainly.** Today the record is **independently verifiable against a published proof**: we publish the inclusion proof and the external anchor reference, and your team (or an auditor) can confirm a record against the public anchor by hand. A standalone one-command verifier (CLI/API) is on the roadmap — until it ships we do not claim a turnkey "click to verify" tool; we claim verifiability against a published proof, which is the property that actually matters for an audit.

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
- **The access log is itself tamper-evident** — to the same standard as everything else. Every access event — who, when, under which ticket, what they touched — is written into the same append-only, hash-chained, anchored audit trail as your operational records. Once an access entry is anchored, we cannot quietly delete the evidence that we looked. On Enterprise tier this access log is available to you for review.
- **CMEK revocation is real but not instantaneous.** Revoking your key cuts off **new** decryption operations; in-flight sessions drain within the session lifecycle (typically minutes). "You can revoke our ability to decrypt" means exactly that — for new operations within the stated window — not a guarantee about an already-open session.

---

## 7. Retention, deletion & the anchor tension

- **Default retention:** 90 days on Shared tier; configurable by contract on Dedicated/Enterprise.
- **Deletion cascade:** deletion removes the record from primary stores and cascades to backups within 30 days; we provide deletion confirmation.
- **The honest technical tension — deletion vs. immutability.** The external anchor stores only a **hash/Merkle root — never the underlying data or any PII.** Anchor leaves are hashes of encrypted, salted records — not hashes of raw field values — so a residual anchor cannot be brute-forced back into a deleted SSN or student ID. Deleting a record does **not** require un-anchoring: the anchor continues to prove history is intact while revealing nothing about deleted content.
- **Hard-delete mechanism differs by tier — stated plainly:**
  - **Dedicated / BYOC (CMEK):** "right to be forgotten" uses **crypto-shredding** — destroying the per-tenant CMEK key renders the encrypted data permanently unrecoverable while the residual anchor remains a meaningless hash.
  - **Shared / Standard (platform-managed keys):** crypto-shredding is **not** available per-record on this tier, so hard-delete is performed by **purging the plaintext record from primary stores and backups** within the cascade window above, leaving only the non-reversible anchor leaf. For institutions with strict expungement requirements (e.g., FERPA record correction/deletion), we recommend the **Dedicated tier**, where deletion is cryptographically provable.

---

## 8. Security posture, incident response & disclosure

- **Independent validation (today), stated honestly:** we do **not yet hold a third-party security attestation** (no completed external pentest report or SOC 2 on file as of this version). What exists today is internal review and the architectural controls described in this document. We treat this as a gap to close, not to paper over — SOC 2 and a third-party penetration test are the next milestones, and we will share status and, when available, the report or bridge letter on request.
- **SOC 2:** on the roadmap; target Q4 2026. We will share the bridge letter / progress on request.
- **Incident response:** documented IR plan with defined severities. **Breach notification within 72 hours of confirmation** to your designated contact, with scope, affected data, and remediation. You are notified **before** any public disclosure.
- **Availability:** 99.5% target uptime on Dedicated/Enterprise; status page at **status.sociii.ai**.
- **Responsible disclosure / security contact:** report vulnerabilities to **security@sociii.ai**; we acknowledge within 2 business days and do not pursue good-faith researchers.

---

## 9. Subprocessors

A current subprocessor list is part of the DPA. At minimum it discloses, for each: name, role, region, and what data category it touches. **Model vendors your workers call (e.g., Anthropic/Claude, OpenAI/GPT) are subprocessors** and are listed as such with their data-handling terms.

**Model training — the precise claim.** **No model vendor we use trains on your data.** This is the consistent, contractual guarantee across every model subprocessor: we operate under enterprise API terms that prohibit training on inputs/outputs, and we will not route your data to any tier that permits it.

The thing that varies per vendor — and is disclosed exactly in the subprocessor exhibit — is **transient retention** (how long, if at all, a prompt is held for abuse-monitoring before deletion). Some vendors offer zero-retention; others hold for a short, bounded window. **"No training" is the headline and it holds everywhere; "retention window" is the per-vendor detail, listed in the exhibit so the two are never conflated.**

---

## 10. Onboarding a large institution

Two tracks, both delivered through SOCIII:

1. **Governance setup (with your IT/security):** guided selection of tier, region, CMEK, DPA, SSO, and the export/exit plan → a documented governance configuration for your institution.
2. **Enablement:** your team learns to build and govern their own workers on the SDK — so one engagement expands across departments without bespoke vendor work. You own the build; we provide the substrate and rails.

**Shared responsibility — who guarantees what.** SOCIII guarantees the **substrate**: the append-only record, the rules engine, the approval gates, anchoring, and isolation. When *your* team authors workers and rules on the SDK, **the correctness of those workers and rules is yours** — a misconfigured customer-built worker is the customer's exposure, exactly as a misconfigured query against any platform would be. The engine still enforces capability declarations and approval gates underneath every worker, customer-built or not.

**On maturity, honestly:** this governance + enablement path is how we run every institutional engagement. For a first university-wide commitment we typically recommend a **scoped departmental deployment that expands**, which is both lower-risk for you and a more credible footing than "bet the institution on an early-stage vendor."

---

## 11. Honest maturity statement

We are an **early-stage enterprise vendor with production infrastructure and an honest roadmap — not a pilot program, and not a decade-old platform.**

- **In production:** append-only event store; hash-chaining + anchoring; capability registry; rules engine; tenant isolation (logical); human approval gates; per-call usage metering; model-agnostic execution.
- **Available as a scoped enterprise build:** Dedicated + CMEK; BYOC; SSO/SAML; region pinning; sector DPA addenda.
- **Roadmap (named as roadmap):** SOC 2 attestation (Q4 2026); automated provisioning of Dedicated/BYOC (today concierge-guided); the standalone verifier CLI/API; expanded anchoring partners.

---

## 12. Exit & portability

- **Export:** full record set — events, attachments, and verification proofs — as **JSON event log plus original files in standard formats (PDF, CSV, JPEG, etc.)**. Self-serve export is available on demand; a complete bulk export is **typically delivered within 5 business days of request** (exact SLA set in the MSA). The export format is open and documented, so the record is readable without SOCIII software.
- **No lock-in:** your data leaves in an open, documented format; with BYOC the deployment already runs in your cloud.
- **Vendor-continuity / survivability — the early-stage question, answered.** Because you depend on this as a **system of record**, you should know what happens if SOCIII the company fails. Three mitigations, by tier: **(a)** the export above means you always hold a current, openly-formatted copy; **(b)** the **external anchor is independent of SOCIII** — you can verify your record set against the public proof even if our infrastructure is gone; **(c) BYOC** is the strongest answer — the deployment lives in *your* cloud and keeps running without us. Source-code escrow is available on Dedicated/Enterprise tier by arrangement.
- **Wind-down:** on termination, you receive a final export and we delete customer data within 30 days (sooner on request; exact window and any regulatory-hold exceptions set in the MSA).

---

## 13. Talking points (short version)

- "SOCIII is a **tamper-evident audit trail** your AI workers write to — the record is the asset, the workers are the interface." *(§1)*
- "Your data stays **in your region, isolated, under keys you hold and can revoke**, with a contractual exit." *(§2, §12)*
- "History is **provably untampered against even an insider** — anchored to an independent ledger, verifiable against a published proof, **without anyone holding cryptocurrency.**" *(§3)*
- "Even **our own staff's access to your data** is second-person-approved and written into the same tamper-evident log." *(§6)*
- "AI actions are **governed by a rules engine + human approval gates**, every action attributable; **no model vendor trains on your data.**" *(§4, §5, §9)*
- "We **train your IT to build their own workers**, so it scales across departments without bespoke vendor work." *(§10)*
- "We're an **early-stage vendor being honest about it** — production infrastructure today, SOC 2 on a named timeline (Q4 2026), not vaporware and not decade-old varnish." *(§8, §11)*
- *(Education buyers)* "We sign on as a **FERPA school official under your direction**, commit to **WCAG 2.1 AA + a VPAT**, and your data survives us — open export plus an independent anchor you can verify without our software." *(§14, §12)*

---

## 14. Education-sector specifics

This section exists because a public university's review surface is not the generic enterprise one.

**FERPA.** Where SOCIII processes student education records, we act as a **"school official" with a "legitimate educational interest"** under **34 CFR §99.31(a)(1)** — meaning we use education records **only under your direction**, only to perform the service you've contracted, and we do **not** re-disclose them except as you authorize. Our **subprocessors (including model vendors, §9) operate under the same direct-control and no-training terms**. A **FERPA addendum / DPA** captures the school-official designation, direct-control language, the audit-and-evaluation provisions, and subprocessor re-disclosure handling. The FERPA addendum is available on request and executed as part of the standard DPA for education customers.

**Data classification & minimization.** We support — and recommend — sending the **minimum necessary** category for each workflow, and we document what data classes are appropriate for each tier. Highly sensitive categories (disciplinary, disability/accommodation, health) belong on **Dedicated + CMEK**, where deletion is cryptographically provable (§7).

**Accessibility — Section 508 / WCAG / ADA.** We commit to **WCAG 2.1 AA** as the conformance target and will provide a **VPAT**. A VPAT is currently in preparation; contact us for the current conformance gap disclosure and remediation timeline.

**Customer audit rights.** Pending SOC 2 (§8), the MSA grants you a **right to audit on cause** plus an annual security questionnaire; once SOC 2 is available, the report satisfies the standing audit right with audit-on-cause preserved.

**Data residency for AI calls.** Beyond storage region (§2), prompts that may contain student PII are processed in **US East (us-east1)** by model subprocessors; the per-vendor processing region is named in the subprocessor exhibit (§9).

**Pricing — plain language.** Education tier: **$99/month** base + **$5 per active student per month** (first 5 students included). Students use their existing institutional Google or email account — no separate credential purchase, no single-vendor email lock-in. Above 1,000 active students, we switch to a flat site license — [contact us](/contact). A standard DPA + FERPA addendum are included at no extra charge. This is the same pricing and agreement we offer every education customer; there is no secret enterprise negotiation track.

---

## Document version

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-06-26 | Initial draft |
| v2 | 2026-06-26 | Red-team pass: naming disclaimer; incident response; subprocessors; model training; internal access; retention/deletion + anchor tension; pentest/SLA; immutability/verify/attribution claims; BYOC burden; crypto-as-default-RFC3161; honest maturity |
| v2.1 | 2026-06-26 | §3 verifier de-double-claimed; §6 second-person approval + tamper-evident access log; §8 independent-validation gap stated plainly; §9 model-training headline vs. per-vendor retention separated; §12 indicative exit ranges; §13 section references |
| v2.2 | 2026-06-26 | §14 Education-sector added (FERPA, WCAG 2.1 AA, audit rights, AI-call residency); §3 anchor-interval bound + TSA vs transparency-log vs public-chain distinctions; §6 CMEK-revocation timing; §7 hard-delete by tier; §10 shared-responsibility; §12 vendor-continuity |
| v2.3 | 2026-06-27 | Public release: [CONFIRM] items filled in with production defaults; education pricing added to §14; internal open-items checklist removed |
