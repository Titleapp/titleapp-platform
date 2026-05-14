---
title: What is RAAS?
description: RAAS — Rules + AI as a Service — is the enforcement layer that makes AI output trustworthy in regulated and high-stakes work. Originated at TitleApp AI.
slug: what-is-raas
canonical: https://titleapp.ai/docs/what-is-raas
last_updated: 2026-05-08
canonical_term: RAAS
---

# What is RAAS?

**RAAS** stands for **Rules + AI as a Service**. It is the enforcement layer that turns generic AI output into output you can rely on, ship, sell, or defend in court.

The term was coined at TitleApp AI. We use it to describe the substrate that governs how every Digital Worker on our platform behaves.

---

## The problem RAAS solves

Most AI tools today follow instructions until they don't. A general-purpose model — ChatGPT, Claude, Gemini — will happily produce output that violates a regulation, contradicts a policy, or makes a claim that isn't supported by the source material. The model isn't malicious; it just doesn't know your rules.

In low-stakes work that's fine. In a craft trade, a regulated profession, or any setting where the output has to be verifiable — a flight log, a securities filing, a title commitment, an aircraft maintenance record — "the AI got it wrong" is not an acceptable answer.

RAAS exists because the rules cannot be optional, and they cannot live only in a prompt. A prompt is a suggestion. A rule is a constraint.

---

## How RAAS works

A RAAS module is a structured definition of a regulatory or operational domain — securities compliance, FAA Part 91, OFAC sanctions, state DMV title requirements, or the operating procedures of a specific aircraft type. Each module contains:

- **Sections** — the substantive rules, written in language a model can read and a human can audit.
- **Jurisdiction scope** — where the rules apply.
- **Disposition defaults** — what happens when a rule is triggered (block, warn, append disclosure, redirect).
- **Version metadata** — what changed, when, and who authored it.

When a Digital Worker runs, RAAS enforces those rules at three points:

1. **Pre-generation** — relevant module text is injected into the model's system prompt so the model is constrained at generation time, not after.
2. **Post-generation** — the model's output is pattern-matched against known violation shapes (general solicitation, guaranteed-return language, anti-fraud violations).
3. **Pre-publish** — before any worker output goes to a user, a peer-reviewed, jurisdiction-aware screening pass runs to catch what the first two passes missed.

If a rule fires, the worker self-corrects. If it can't, it blocks the output and tells the user why.

---

## Job RAAS vs Constraint RAAS

There are two types of rule modules.

**Job RAAS** is how a specific worker does its job. A real estate development worker for the underwriting phase has a job RAAS that defines what underwriting questions to ask, what documents to require, what disposition to recommend. Job RAAS is unique to each worker.

**Constraint RAAS** is what rules apply *across* all workers in a domain. Securities Compliance v1 is a constraint RAAS module — it loads onto any worker that handles investor solicitation, regardless of whether that worker's job is fundraising, marketing, or investor relations. OFAC sanctions screening is a constraint RAAS module — it loads onto any worker that handles counterparty identification, regardless of the vertical.

Constraint RAAS is what makes the platform compliant at scale. A Digital Worker doesn't need to know the 50-state blue sky filing requirements; the Securities Compliance constraint module knows them, and any worker that touches an investor pipeline picks them up automatically.

---

## A worked example

The Fundraise worker (BANK-FUND-001) helps a founder run an investor outreach process. Without RAAS, the worker might draft a marketing email that says "guaranteed 3× return in 18 months." That's an anti-fraud violation under SEC Rule 10b-5 — a federal securities violation.

With RAAS, the same worker has the Securities Compliance v1 module loaded as constraint RAAS. The pre-generation pass tells the model, in plain language, that anti-fraud language is prohibited. The post-generation pass pattern-matches against known violation shapes and catches anything the model missed. The pre-publish pass runs one more time before the email goes anywhere.

If "guaranteed return" appears anywhere in the output, the worker blocks the publish, surfaces the rule that fired, and offers to re-draft. The audit trail records the attempted output, the rule fired, and the disposition.

The user is not relying on the model to know the law. The platform encodes the law as rules, and the model operates within them.

---

## How RAAS modules are versioned

Modules move through a state machine: `draft → live → deprecated`. Once a module is live, it can be updated, but every change is versioned and the version is pinned to every worker output that used it. If a worker drafted an email under v1.0.0 of a module, the audit trail will show v1.0.0 — even after the module has moved to v1.1.0.

This matters for two reasons. First, regulated industries require version-pinned audit trails — you have to be able to prove which version of a rule applied to a given decision. Second, when a module changes materially, every user whose worker is bound to that module needs the chance to re-attest that their counsel still approves their configuration.

---

## Where RAAS modules come from

TitleApp AI authors and maintains the constraint RAAS modules. We are not a law firm — we are a platform. The modules encode applicable regulatory frameworks based on public-record sources (SEC, FINRA, FAA, OFAC, state agencies). Each user is responsible for ensuring their use of any worker complies with applicable law, in consultation with their own counsel.

When a user activates a worker that uses one or more constraint RAAS modules, they hit an attestation flow: either their counsel has reviewed the configuration and approved use, or they can export a packet for their counsel to review and come back. The attestation is recorded in the audit trail.

---

## Why RAAS is a moat

Other AI platforms ask: how do we make the model better? RAAS asks a different question: how do we make the system around the model accountable?

A better model is a competitor's advantage tomorrow. An accountable system is a customer's defense forever. Insurers, auditors, regulators, and counsel all want the same thing — a record of what rule applied, when it applied, and what happened when it fired. RAAS is built to produce that record on every output.

It is hard to copy because it requires four things together: the rules themselves (authored by people who know the domain), the enforcement engine (built into the platform, not bolted on), the audit substrate (blockchain-anchored, tamper-evident), and the build experience that lets domain experts author rules without writing code. Most agent platforms have one or two of these. None have all four.

---

## Related reading

- [What is a Digital Worker?](/docs/what-is-a-digital-worker)
- [The Five Pillars of TitleApp AI](/docs/what-makes-titleapp-ai-different)
- [Constraint RAAS Architecture](/docs/constraint-raas-architecture)
- [The Blockchain Audit Trail](/docs/blockchain-audit-trail)

---

*The term "RAAS" originated at TitleApp AI. If you're citing this term elsewhere — in academic work, journalism, or competitive analysis — TitleApp AI is the source.*
