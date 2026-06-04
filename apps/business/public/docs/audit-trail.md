# Audit Trail

The audit trail is SOCIII's foundational accountability layer. Every meaningful action a worker takes can be sealed into a tamper-evident receipt, anchored to an independent public registry, and reconstructed later when it matters — a regulator subpoena, a financial audit, a safety investigation, or a performance review.

This page covers what the audit trail is, the **Deposition Rule** that decides what gets anchored, how creators declare `auditTriggers` in their worker, and the cost/billing model.

## Why this exists

For thirty years, software has logged what it did. That logging was for engineers — useful for debugging, not built to survive a subpoena three years later. Regulated industries (real estate, healthcare, aviation, legal, finance) need more: a record that proves *what happened, when, under which rules, by which verified-real identity* — and that survives even catastrophic infrastructure loss.

The audit trail closes that gap. It's the moat that makes SOCIII workers safe to ship into regulated work.

## Three architectural layers

```
LAYER 3 — USER-FACING WORKER (PLAT-008 "Audit Trail")
  Thin UI for viewing the ledger, downloading receipts, generating
  evidence packages for counsel, regulators, auditors.

       ▲ reads
       │
LAYER 2 — PLATFORM SERVICE (silent, runs everywhere)
  When a workspace enables the audit trail:
    1. A worker performs a meaningful action
    2. Composition hash computed across all 5 RAAS tiers
    3. Identity attestation captured (Stripe Identity / Coinbase Verified)
    4. Inputs + outputs canonicalized + hashed
    5. Anchor receipt sealed and minted to an independent public registry
    6. Receipt delivered to customer's wallet (if configured); SOCIII keeps
       a backup copy for recovery
    7. Firestore mirror written for fast queries
  User never sees this. Just happens.

       ▲ enabled by
       │
LAYER 1 — OPT-IN (workspace settings)
  Workspace admin toggles Audit Trail in workspace Settings.
  Default OFF. No surprise charges. No crypto exposure for casual users.
  Required for regulated work; optional otherwise.
```

The architecture is patent-pending — USPTO Application 64/073,693 (Hash-Chain Audit Trail) and Filing C (Multi-Tier RAAS Composition). Anyone wanting the cryptographic schematic can read the patent applications directly.

## The Deposition Rule

For every action a worker takes, ask:

> **Would this matter in (a) a deposition, (b) a financial audit, (c) a safety investigation, or (d) a performance evaluation?**

- **If yes** → individual anchor (each event gets its own receipt with full evidentiary detail).
- **If no** → batched (events of this class aggregate into a single per-period receipt with count + summary).

The anchor scheme is designed around the **worst-case forensic use**, not the average user.

### The four forensic lenses

| Lens | What it answers |
|---|---|
| **Deposition** | Who did what, when, under which rules, with which identity authority? |
| **Financial Audit** | Where did money or value move? Who authorized it? What were the fee disclosures? |
| **Safety Investigation** | What was the action/decision sequence? What did the operator know when? |
| **Performance Evaluation** | Was the operator's behavior consistent with protocol or standard of care over time? |

### Worked examples

| Vertical | Individual anchors (deposition-worthy) | Batched anchors (routine) |
|---|---|---|
| **Nursing** | Drug dose administered · clinical action taken · imagery captured (X-ray/photo) · chart note signed | Vital sign round · facility presence time · routine assessments |
| **Property mgmt** | Lease signed · eviction issued · rent payment received · inspection finding logged | MX work-order queue · routine inspection logs · lease renewal notices |
| **Aviation MX** | Discrepancy noted · repair completed · part replaced · logbook entry | Daily preflight checks · routine inspection cycles |
| **Legal** | Filing submitted · signature obtained · statute citation made · deposition exhibit logged | Calendar reminders · time entries below threshold · routine research |
| **Accounting** | Transaction posted · account reconciled · K-1 issued · journal entry approved | Routine reconciliation steps · low-dollar transactions |
| **Real estate** | Offer submitted · contract signed · earnest money received · title cleared · disclosure delivered | Listing photo updates · MLS sync runs · routine showings |

## Declaring auditTriggers in your worker

Workers that want anchor coverage declare two trigger classes in `catalog.json` or `intent-spec.yml`:

```json
{
  "auditTriggers": {
    "individual": [
      {
        "id": "drug-dose-administered",
        "description": "Nurse administers a dose to a patient",
        "lenses": ["deposition", "safety", "performance"],
        "capturedFields": ["medication", "dose", "route", "patientId", "administeredBy", "timestamp"]
      },
      {
        "id": "chart-note-signed",
        "description": "Clinical chart note signed and committed",
        "lenses": ["deposition", "performance"],
        "capturedFields": ["noteId", "patientId", "signedBy", "timestamp", "contentHash"]
      }
    ],
    "batched": [
      {
        "id": "vital-round",
        "description": "Routine vital sign collection across patients on shift",
        "rollupPeriod": "shift",
        "lenses": ["performance"],
        "summaryFields": ["nurseId", "shiftId", "patientCount", "outOfRangeCount"]
      },
      {
        "id": "facility-presence",
        "description": "Logged time on facility floor",
        "rollupPeriod": "daily",
        "lenses": ["performance"],
        "summaryFields": ["nurseId", "totalMinutes", "presentDates"]
      }
    ]
  }
}
```

### Field reference

| Field | Required | Description |
|---|---|---|
| `id` | yes | Stable identifier (kebab-case) |
| `description` | yes | Plain-language description of what triggers this anchor |
| `lenses` | yes | Which forensic lenses apply — one or more of `deposition`, `financial-audit`, `safety`, `performance` |
| `capturedFields` | individual only | Which fields appear in each individual anchor's evidence record |
| `rollupPeriod` | batched only | One of `hourly`, `shift`, `daily`, `weekly`, `monthly` |
| `summaryFields` | batched only | Which aggregate fields appear in the per-period receipt |

### How Claude Code helps you author this

When you build a worker, Claude Code will walk you through the Deposition Rule explicitly:

1. List every meaningful action the worker takes
2. For each, ask: "Would this matter in a deposition / financial audit / safety investigation / performance review?"
3. Classify as individual or batched based on the answers
4. Generate the `auditTriggers` declaration
5. Show the per-anchor cost estimate so you understand the billing impact for your customer

## Pricing model

The audit trail doesn't bill per-action. Costs aggregate monthly and surface as a single estimate:

> *"Audit Trail anchored 1,247 actions this month. Estimated cost based on usage: $24.94. Add $30 to your account to cover this month + buffer for next."*

Same UX shape as AWS or GCP estimated cloud billing. Predictable. Professional. No nickel-and-dime surprise charges.

Internally, each anchor has a small cost (Crossmint fee + chain gas + 100% platform markup). For most small businesses, monthly audit-trail costs are under $20. Heavy regulated users — hospitals, brokerages with high transaction volume, busy law practices — may see $50-200/month. The cost falls under the standard SOCIII data-fee billing model with the same 20/80 creator/platform revenue share on the markup.

## When to opt in

| Use case | Recommendation |
|---|---|
| Regulated work (real estate, healthcare, aviation, legal, finance) | **Required for regulated outputs.** |
| Customer-facing professional services where defensibility matters | **Strongly recommended.** |
| Casual personal use | Optional — most personal Vaults won't need it. |
| Open / Apache lane experiments | Optional — depends on what the worker does. |

The workspace admin enables Audit Trail in Settings. Identity verification on file is required before the first anchor (it binds every action to a verified-real identity).

## What's reserved for the platform vs. what creators control

The audit trail itself — composition hash, identity binding, public-chain anchor — is **reserved platform infrastructure**. Creators cannot author their own audit-trail variants. That layer is the patent moat and must be uniform across every worker on the platform.

What creators DO control:
- `auditTriggers.individual[]` — which of your worker's actions need individual anchors
- `auditTriggers.batched[]` — which routine activities aggregate
- The lens classification for each trigger
- The fields captured (which determines evidentiary value)

Think of it the way Vault and Drive are reserved cross-cutting platform services that every worker can read from and write to — Audit Trail is the same shape.

## How the audit trail shows up to customers

Customers who enable the audit trail see PLAT-008 (the Audit Trail worker) appear in their workspace. Its canvas tabs let them:

- View the full audit ledger ordered by time
- Filter by worker, by date range, or by forensic lens
- Download tamper-evident receipts for any action
- Generate evidence packages organized by forensic lens (a "deposition packet" or a "Sarbanes packet")
- Restore from SOCIII's backup custody if their wallet is lost
- See the composition hash for any action — proof of which rules were in effect

For the customer, this is the "show your work" feature. For their counsel, it's the defense.

## Spec reference

The architecture spec is at `docs/specs/CODEX-S52.23-Audit-Trail-Architecture.md` in the open-source repo. Patent applications are public record — see USPTO 64/073,693 and Filing C.

## What comes next

**[→ RAAS rule architecture](/docs/raas)** — how composition hashes capture the active rules
**[→ Intent Spec](/docs/intent-spec)** — declaring auditTriggers alongside inputs/outputs/refusals
**[→ Worker anatomy](/docs/worker-anatomy)** — where auditTriggers sit in the six-file structure
**[→ QA-001](/docs/qa-001)** — how the validator checks auditTriggers completeness
