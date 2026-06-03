# SDK overview

> **If you don't know what an SDK is, you can skip this whole section.**
>
> You don't have to know how to code to build a Digital Worker. Claude Code + the chat interface in your browser + sociii.ai is all you need. Go to **[Your first worker](/docs/your-first-worker)** instead — that's the path for non-coders.
>
> This section is for people who have coded before and want to understand the file structure underneath, so they can author or read worker files directly.

---

The SOCIII SDK is **not** a library you install. It's a small set of conventions and file formats that the platform reads. You don't import anything; you just author files in a particular shape, and the platform binds them at runtime.

If you've ever written a configuration file (`.yml`, `.json`, `.env`), you already understand the SDK. The difference: you'll write these files conversationally with Claude Code, not by hand.

## The core idea

A Digital Worker on SOCIII is a directory with **six files**, each answering one question:

| File | Question it answers |
|---|---|
| `catalog.json` | What is this worker, who's it for, what does it cost? |
| `intent-spec.yml` | What does success look like? What are the inputs, outputs, refusal modes? |
| `rules/*.yml` | What rules govern its behavior? (RAAS — three-level hierarchy) |
| `fixtures/*.json` | What sample data does the canvas render in demo mode? |
| `canvas-tabs.json` | What tabs show in the right panel, what does each one display? |
| `README.md` | Plain-language description of the worker's domain expertise |

That's the entire SDK contract. **[See full Worker anatomy →](/docs/worker-anatomy)**

## What the platform provides

When your worker ships and a customer subscribes, the platform handles:

- **Identity** — accredited verification (Stripe Identity), accreditation gating where required
- **Billing** — subscription management, monthly invoicing, refund handling
- **Audit** — every action the worker takes appends to an event log (Firestore, append-only). DTC chain anchor optional.
- **Compliance** — RAAS modules merge your rules with state/federal regulatory updates (OFAC, FAA, FINRA, state-specific)
- **UI** — sidebar nav, Alex chat surface, canvas tab rendering, embed signing, document storage
- **Distribution** — your worker auto-lists in the SOCIII Marketplace + your public Creator Profile

You build the worker. The platform does the rest.

## What you provide

The minimum domain content you'll author (with Claude Code's help):

1. **A clear Intent Spec.** What inputs does this worker accept? What does the output look like? When should it refuse?
2. **Rule definitions.** What invariants must always hold? What constraints by jurisdiction?
3. **Sample inputs + expected outputs.** The validator runs these as smoke tests.
4. **A few canvas tabs.** What does the user see when they open your worker? Usually 3–10 tabs.

That's the whole creative surface. Everything else (DBX Sign integration, SendGrid emails, Stripe billing, audit trail) is library code the platform calls into.

## Why this design

Two reasons:

**Reason 1 — Portability.** Because workers are files (not deployed services), they move. You can fork a worker that exists, modify it for your jurisdiction, and ship the fork. The platform tracks the fork lineage and assigns revenue accordingly.

**Reason 2 — LLM authoring.** Because the contract is small and declarative, Claude Code can author 80% of a worker from a conversation. You describe what success looks like, it drafts the spec. You describe the rules, it formalizes them. You provide an example, it writes the fixture. Your domain expertise is the input; the worker is the output.

## The three rule levels (RAAS)

Workers don't ship rules from scratch. The platform provides three levels, layered:

| Level | Scope | Examples |
|---|---|---|
| **Level 0** | Global style | "Never invent statutory citations." "Always show your source." |
| **Level 1** | Platform invariants | "Append-only audit." "Identity-verified for any signature." |
| **Level 2** | Vertical baseline | Auto: "VIN-first lifecycle." Real estate: "Parcel-anchored records." |
| **Your worker** | Domain-specific | Whatever you author |

Your worker only needs to write its own additions. **[See RAAS docs →](/docs/raas)**

## What ships in v1

The current SDK contract is stable enough for a creator to author and ship a worker in **a single focused day** with Claude Code. The areas still hardening:

- **Intent Spec format** — v1 spec defined, validator partial. **[See current spec →](/docs/intent-spec)**
- **QA-001 validator** — runs assertions defined in intent-spec on each PR. v1 partial. **[See QA-001 →](/docs/qa-001)**
- **Canvas tab schema** — v1 stable, the platform's 1,000+ workers carry the schema. **[See canvas tabs →](/docs/canvas-tabs)**

When in doubt about a convention, **read an existing worker** in the [open-source repo](https://github.com/SOCIII-Inc/sociii) — every worker is itself documentation.

## What comes next

**[→ Worker anatomy](/docs/worker-anatomy)** — the six files in detail
**[→ Your first worker](/docs/your-first-worker)** — start to finish, in conversation with Claude Code
**[→ Three lanes](/docs/three-lanes)** — Open fork · Marketplace · Experimental — which one your worker lives in
