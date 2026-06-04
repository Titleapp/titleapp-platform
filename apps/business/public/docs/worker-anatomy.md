# Worker anatomy

Every Digital Worker on SOCIII is a directory of six files. This page shows what each file does, the minimum content, and where to read working examples.

## The six files

```
my-worker/
├── catalog.json        ← what the marketplace lists (includes auditTriggers)
├── intent-spec.yml     ← what success looks like
├── rules/
│   ├── core.yml        ← invariants that always hold
│   └── jurisdiction.yml  ← optional, for regulated workers
├── fixtures/
│   ├── sample-in.json    ← demo input
│   └── sample-out.json   ← expected output
├── canvas-tabs.json    ← what shows in the right panel
└── README.md           ← plain-language description
```

## catalog.json

What the marketplace lists. Read by Firestore at deploy time.

```json
{
  "slug": "nurse-eval-001",
  "label": "Nurse Eval — SOAP Note Drafting",
  "vertical": "healthcare",
  "jurisdiction": "GLOBAL",
  "creator": "ruthie-smith",
  "tagline": "Draft SOAP notes from charts with protocol-aware flagging.",
  "pricing": {
    "monthly": 49,
    "currency": "USD",
    "trial_days": 14
  },
  "forge": {
    "enabled": true,
    "forge_price": 1.34
  },
  "intent": "intent-spec.yml",
  "rulesets": ["rules/core.yml"],
  "canvasTabs": "canvas-tabs.json",
  "lane": "marketplace"
}
```

**Required fields:** `slug`, `label`, `vertical`, `creator`, `tagline`, `pricing`, `lane`.

`lane` is one of `open` / `marketplace` / `experimental`. **[See three lanes →](/docs/three-lanes)**

### auditTriggers (recommended for any regulated worker)

Workers that touch regulated work declare which of their actions get individually anchored vs batched. The **Deposition Rule** decides: would this matter in a deposition, financial audit, safety investigation, or performance review? Yes → individual; no → batched.

```json
{
  "auditTriggers": {
    "individual": [
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
      }
    ]
  }
}
```

Lens values: `deposition`, `financial-audit`, `safety`, `performance` (one or more per trigger).
Rollup periods: `hourly`, `shift`, `daily`, `weekly`, `monthly`.

The platform handles the actual anchoring — composition hash, identity binding, public-registry receipt, backup custody. You just declare what gets anchored. **[See Audit Trail →](/docs/audit-trail)**

`forge.enabled` defaults to `true` for the Marketplace lane. Set `forge.enabled: false` if you want to skip the platform-funded first-month review on your first ship. `forge.forge_price` defaults to `1.34` (USD); this is the one-time, one-month amount SOCIII pays — the creator receives a flat **$1.00 net**. There is no recurring Forge payment; the subscription auto-cancels at day 30. **[See Forge Reviews →](/docs/review-cycle)**

## intent-spec.yml

The formal spec — what your worker accepts, what it produces, what it refuses. **[Full Intent Spec format →](/docs/intent-spec)**

```yaml
inputs:
  - name: patient_chart
    type: text
    description: De-identified chart with vitals + lab values
  - name: hospital_protocol
    type: text
    optional: true

outputs:
  - name: soap_note
    type: structured
    schema: soap_note_v1
  - name: flagged_labs
    type: array
  - name: next_step_orders
    type: array

refuses:
  - "any input naming a real patient"
  - "any case outside scope of nursing assessment"

assertions:
  - "out-of-range labs are always flagged with reference range"
  - "every order recommendation cites the protocol section"
```

## rules/*.yml

Your worker's behavioral invariants. The platform merges these with global Level 0 + Level 1 + your vertical Level 2 baseline. **[See RAAS docs →](/docs/raas)**

```yaml
- id: medication-indication-check
  description: Never recommend a medication outside its FDA-approved indication
  enforce: hard
  refuse_message: "That medication is not FDA-approved for this indication."

- id: allergy-contraindication
  description: Refuse if patient allergy list shows a contraindication
  enforce: hard
  check: patient.allergies INTERSECT recommended_medications NOT EMPTY
```

## fixtures/*.json

Sample inputs + expected outputs. The QA-001 validator uses these. **[See QA-001 →](/docs/qa-001)**

```json
{
  "case-001": {
    "input": {
      "patient_chart": "65yo F, c/o chest pain x2hr...",
      "hospital_protocol": "ACS pathway v3"
    },
    "expected": {
      "flagged_labs": ["troponin: 0.4 (elevated)"],
      "next_step_orders": ["serial troponin q6h", "12-lead ECG"]
    }
  }
}
```

You don't have to predict the exact output — assertions are at the structural and semantic level (`flagged_labs` must include any troponin > 0.04 ng/mL, etc.), not byte-exact.

## canvas-tabs.json

What renders in the right panel of the worker UI. **[Full canvas tabs schema →](/docs/canvas-tabs)**

```json
{
  "tabs": [
    {
      "id": "current-case",
      "title": "Current case",
      "signal": "card:current-case",
      "default": true
    },
    {
      "id": "protocols",
      "title": "Protocols",
      "signal": "card:protocols",
      "data_source": "hospital-protocol-locker"
    },
    {
      "id": "history",
      "title": "Past evaluations",
      "signal": "card:history"
    }
  ]
}
```

## README.md

Plain language. This is what shows on your worker's marketplace listing and your Creator Profile.

```markdown
# Nurse Eval — SOAP Note Drafting

A Digital Worker that takes a patient chart (text + lab values) and drafts
a SOAP note, flagging out-of-range labs and suggesting next-step orders
consistent with your hospital's protocols.

**Built for:** Bedside nurses, charge nurses, nursing supervisors
**Vertical:** Healthcare (nursing assessment)
**Compliance posture:** HIPAA — accepts only de-identified inputs

## How it works

(plain-language description of the worker's behavior)

## What's included

- Protocol-aware lab flagging
- Order suggestions cited to protocol section
- Past evaluation history scoped to your hospital
```

The README is also what Alex reads when explaining your worker to a prospective customer in chat.

## Read an existing worker

The best documentation is an existing worker. Three to study:

- `creator-templates/_skeleton/` — the canonical minimal worker (use this as your starting point)
- `digitalWorkers/healthcare/nurse-triage-001/` — a real-world healthcare worker
- `digitalWorkers/auto/illinois-dealer-001/` — a real-world state-augmented worker

## What comes next

**[→ Intent Spec format](/docs/intent-spec)**
**[→ RAAS rule architecture](/docs/raas)**
**[→ Canvas tabs schema](/docs/canvas-tabs)**
**[→ QA-001 validator](/docs/qa-001)**
