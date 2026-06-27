# SOCIII — Trust & Data Integrity for Large Organizations

**Audience:** enterprise IT, security, legal/compliance, and procurement reviewers — including **public-sector and higher-education** buyers (see §14 for FERPA + accessibility specifics).
**Status:** standard reference. This is how we operate for every enterprise engagement — not a pilot exception.
**Document version:** v2.2 · 2026-06-26 · *(maintain a version table at the end; reviewers check currency.)*

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
2. **Tamper-resistance against that actor (independent anchoring).** Periodically we publish a Merkle root of the record set to an **independent, append-only register outside our control**. Because the external anchor is not ours to rewrite, an inside-infrastructure actor *cannot* silently rewrite history and re-anchor — the divergence is provable. **This is the guarantee that actually holds**, and it is the one to lean on.

**The honest bound — the anchor interval.** Anchoring is periodic, so the insider-resistance in (2) protects everything *up to the last anchor*. Records created **since** the last anchor are protected only by the weaker hash-chaining in (1) until the next anchor publishes. The residual exposure window therefore equals the **anchor interval, currently [CONFIRM — e.g., every N minutes]**. We state this number rather than imply continuous insider-proofing, because the interval *is* the risk parameter a security reviewer should evaluate.

**Which anchor gives which property — no sleight of hand.** These are different trust models and we don't blur them:
- **RFC-3161 trusted timestamping** proves *when* a record existed, via a trusted timestamp authority (a trusted third party — strong, but not "trustless").
- **A public transparency log** (Certificate-Transparency-style) proves *append-only inclusion*.
- **Public-chain anchoring** is the only target that delivers true *trustless, no-one-can-rewrite* resistance.
The insider-resistance argument in (2) holds in its strongest form under public-chain anchoring; under a TSA it reduces to "a trusted third party attests the timeline." **[CONFIRM which target is running in production today]** so the §13 talking point matches what is actually deployed.

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
- **The access log is itself tamper-evident** — to the same standard, and with the same bound, as everything else. Every access event — who, when, under which ticket, what they touched — is written into the **same append-only, hash-chained, anchored audit trail** as your operational records. Once an access entry is anchored, we cannot quietly delete the evidence that we looked; within the pre-anchor window it carries the same hash-chaining protection as any other record (see §3 for the precise bound — we do not claim more for our own access log than we claim for your data). On Enterprise tier this access log is available to you for review.
- **CMEK revocation is real but not instantaneous.** Revoking your key cuts off **new** decryption operations; in-flight sessions and any short-lived key cache drain within **[CONFIRM propagation window]**. "You can revoke our ability to decrypt" means exactly that — for new operations within the stated window — not a guarantee about an already-open session.

---

## 7. Retention, deletion & the anchor tension

- **Default retention:** [CONFIRM window per tier]. Configurable by contract.
- **Deletion cascade:** deletion removes the record from primary stores and cascades to backups within [CONFIRM backup-cycle window]; we provide deletion confirmation.
- **The honest technical tension — deletion vs. immutability.** The external anchor stores only a **hash/Merkle root — never the underlying data or any PII.** Anchor **leaves are hashes of encrypted, salted records — not hashes of raw field values** — so a residual anchor cannot be brute-forced back into a deleted SSN or student ID. Deleting a record does **not** require un-anchoring: the anchor continues to prove history is intact while revealing nothing about deleted content.
- **Hard-delete mechanism differs by tier — stated plainly:**
  - **Dedicated / BYOC (CMEK):** "right to be forgotten" uses **crypto-shredding** — destroying the per-tenant CMEK key renders the encrypted data permanently unrecoverable while the residual anchor remains a meaningless hash.
  - **Shared / Standard (platform-managed keys):** crypto-shredding is **not** available per-record on this tier, so hard-delete is performed by **purging the plaintext record from primary stores and backups** within the cascade window above, leaving only the non-reversible anchor leaf. For institutions with strict expungement requirements (e.g., FERPA record correction/deletion), we recommend the **Dedicated tier**, where deletion is cryptographically provable.

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

**Shared responsibility — who guarantees what.** SOCIII guarantees the **substrate**: the append-only record, the rules engine, the approval gates, anchoring, and isolation. When *your* team authors workers and rules on the SDK, **the correctness of those workers and rules is yours** — a misconfigured customer-built worker is the customer's exposure, exactly as a misconfigured query against any platform would be. The engine still enforces capability declarations and approval gates underneath every worker, customer-built or not; what we cannot do is guarantee that a rule *you* wrote expresses *your* policy correctly. We provide review tooling and a capability registry to make that safe; the authoring judgment is shared.

**On maturity, honestly:** this *governance + enablement* path is how we run every institutional engagement — it is not a one-off experiment in our process. That said, we are candid about our company stage (§11): for a first university-wide commitment we typically recommend a **scoped departmental deployment that expands**, which is both lower-risk for you and a more credible footing than "bet the institution on an early-stage vendor." The path is standard; the *scope* should match your risk tolerance.

---

## 11. Honest maturity statement

We are an **early-stage enterprise vendor with production infrastructure and an honest roadmap — not a pilot program, and not a decade-old platform.**

- **In production:** append-only event store; hash-chaining + anchoring; capability registry; rules engine; tenant isolation (logical); human approval gates; per-call usage metering; model-agnostic execution.
- **Available as a scoped enterprise build:** Dedicated + CMEK; BYOC; SSO/SAML; region pinning; sector DPA addenda. Real engineering/ops commitments, priced as enterprise tier.
- **Roadmap (named as roadmap):** SOC 2 attestation; automated provisioning of Dedicated/BYOC (today concierge-guided); the standalone verifier (if not yet shipped); expanded anchoring partners.

---

## 12. Exit & portability

- **Export:** full record set — events, attachments, and verification proofs — as **JSON event exports plus original files** [CONFIRM final format detail]. Self-serve export is available on demand; a complete bulk export is **typically delivered within ~5 business days of request** (exact SLA set in the MSA). The export format is **open and documented**, so the record is readable without SOCIII software.
- **No lock-in:** your data leaves in an open, documented format; with BYOC the deployment already runs in your cloud. (We do regard the record model and rules engine as our defensible IP — but that is *our* concern, not a constraint on *your* data, which is portable by design.)
- **Vendor-continuity / survivability — the early-stage question, answered.** Because you depend on this as a **system of record**, you should know what happens if SOCIII the company fails. Three mitigations, by tier: **(a)** the export above means you always hold a current, openly-formatted copy; **(b)** the **external anchor is independent of SOCIII** — you can verify your record set against the public proof even if our infrastructure is gone; **(c) BYOC** is the strongest answer — the deployment lives in *your* cloud and keeps running without us. [CONFIRM whether source-code/spec escrow is offered for Dedicated.]
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
- *(Education buyers)* "We sign on as a **FERPA school official under your direction**, commit to **WCAG 2.1 AA + a VPAT**, and your data survives us — open export plus an independent anchor you can verify without our software." *(§14, §12)*

---

## 14. Education-sector specifics (FERPA, accessibility, audit rights)

This section exists because a public university's review surface is not the generic enterprise one. If you are a higher-ed or K-12 buyer, start here.

**FERPA.** Where SOCIII processes student education records, we act as a **"school official" with a "legitimate educational interest"** under **34 CFR §99.31(a)(1)** — meaning we use education records **only under your direction**, only to perform the service you've contracted, and we do **not** re-disclose them except as you authorize. Our **subprocessors (including model vendors, §9) operate under the same direct-control and no-training terms**, so AI processing does not constitute uncontrolled re-disclosure. A **FERPA addendum / DPA** captures the school-official designation, direct-control language, the audit-and-evaluation provisions, and subprocessor re-disclosure handling. [CONFIRM the FERPA addendum is attached to the standard DPA.]

**Data classification & minimization.** Not all education records carry the same sensitivity. We support — and recommend — sending the **minimum necessary** category for the workflow, and we will document what data classes are appropriate for each tier. Highly sensitive categories (disciplinary, disability/accommodation, health) belong on **Dedicated + CMEK**, where deletion is cryptographically provable (§7). [CONFIRM data-classification guide.]

**Accessibility — Section 508 / WCAG / ADA.** The product is UI-forward ("the workers are the interface"), so accessibility is a procurement gate, not an afterthought. We commit to **WCAG 2.1 AA** as the conformance target and will provide a **VPAT (Voluntary Product Accessibility Template)**. [CONFIRM current VPAT status — if not yet complete, state the conformance gaps honestly and a remediation timeline, the same way §8 handles the attestation gap.]

**Customer audit rights.** You are not asked to take security on faith. Pending SOC 2 (§8), the MSA grants you a **right to audit on cause** plus an annual security questionnaire; once SOC 2 is available, the report satisfies the standing audit right with the right to audit-on-cause preserved. [CONFIRM audit-rights clause in the MSA.]

**Data residency for AI calls.** Beyond storage region (§2), prompts that may contain student PII are processed in a **[CONFIRM US region]** by model subprocessors; the per-vendor processing region is named in the subprocessor exhibit (§9).

---

## Open items to finalize before external distribution

These `[CONFIRM]` items must be filled by you / ops / counsel — do not ship externally with placeholders:
breach-notification window · RTO/RPO · uptime SLA + status page · security@ contact + ack window · retention windows + backup-cycle · subprocessor exhibit + per-vendor retention + processing region · current independent-validation status · SOC 2 target date · verifier ship status · export format/SLA · wind-down timeline · internal-access approval workflow · **anchor interval + which anchor target is in production** · **CMEK revocation propagation window** · **FERPA addendum attached** · **VPAT / WCAG 2.1 AA status** · **customer audit-rights clause** · **data-classification guide** · **Dedicated source/spec escrow (y/n)**.

**Education-buyer gate:** the FERPA addendum and the VPAT/accessibility status (§14) are *blockers* for a public university — do not send to a higher-ed reviewer until both are resolved, even if the rest is filled.

## Document version history
| Version | Date | Notes |
|---|---|---|
| v1 | 2026-06-26 | Initial draft |
| v2 | 2026-06-26 | Red-team pass: SOCIII naming + SOC disclaimer; added incident response, subprocessors, model-training, internal access, retention/deletion+anchor tension, pentest/SLA/security-contact/version history; sharpened immutability/verify/model-agnostic/attribution claims; reframed BYOC burden + crypto-as-default-RFC3161 + honest maturity |
| v2.1 | 2026-06-26 | Second review pass: §3 verifier de-double-claimed (softer "verifiable against a published proof" register); §6 added second-person approval mechanism + tamper-evident access log; §8 independent-validation gap stated plainly instead of papered; §9 model-training headline made precise vs. per-vendor retention; §12 exit/wind-down given indicative ranges (~5 biz days export, ~30-day deletion); §13 talking points carry section references + honest-maturity line |
| v2.2 | 2026-06-26 | University/FERPA review pass (independent reviewer, scored v2.1 at 58 on the education surface): added **§14 Education-sector specifics** (FERPA school-official designation, data classification/minimization, WCAG 2.1 AA + VPAT, customer audit rights, AI-call residency); §3 now states the **anchor-interval bound** + distinguishes TSA vs transparency-log vs public-chain trust models (no sleight of hand); §6 reconciled the access-log claim to the same anchor bound + CMEK-revocation-not-instantaneous; §7 split hard-delete by tier (crypto-shred on Dedicated, purge on Shared) + leaves-are-hashes-of-encrypted; §10 added shared-responsibility for customer-authored workers + repositioned "not an experiment" to scoped-pilot-that-scales; §12 added open-format export + vendor-continuity/survivability; dropped IP-moat phrasing from buyer-facing copy; expanded Open-items + education-buyer gate |
