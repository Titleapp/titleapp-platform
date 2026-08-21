# Worker anatomy

Every Digital Worker is a directory of seven files, defined in the [open SDK's](https://github.com/SOCIII-Inc/sociii-sdk) `template/` folder. This page shows what each file does, the minimum content, and where to read a working example — matching the real template exactly, not an idealized version of it.

## The seven files

```
my-worker/
├── worker-spec.json    ← the marketplace listing: slug, name, pricing, canvas tabs
├── intent.md           ← what it does, who it's for, what success looks like, what it's NOT
├── rules.md             ← identity, scope, evidence standard, tone, disclaimers
├── canvas-tabs.json    ← what shows in the right panel
├── service.js           ← the worker's functions, as pure event proposals
├── sample-data.js       ← fixtures so a first-time user sees something real
└── tests/
    └── assertions.md    ← the acceptance checks QA-001 runs before it ships
```

## worker-spec.json

What the marketplace lists, and what the platform reads to register your worker.

```json
{
  "$schema": "https://sociii.ai/sdk/schema/1.0.0",
  "sociii-sdk-version": "1.0.0",
  "id": "RUTH-001",
  "name": "Nurse Eval — SOAP Note Drafting",
  "slug": "nurse-eval-001",
  "type": "standalone",
  "status": "waitlist",
  "description": "Drafts SOAP notes from patient charts with protocol-aware lab flagging.",
  "suite": "Nursing",
  "vertical": "healthcare",
  "phase": 0,
  "pricing": { "monthly": 49 },
  "tags": ["nursing", "documentation"],
  "valueBucket": ["save_time", "stay_compliant"],
  "capabilitySummary": "Takes a patient chart (text + lab values), drafts a SOAP note, flags out-of-range labs, suggests next-step orders consistent with hospital protocol.",
  "canvasTabs": [
    { "id": "current-case", "label": "Current case", "signal": "card:work-product", "default": true, "order": 0 }
  ],
  "alexRegistration": { "priority": "normal", "acceptsTasks": true, "briefingContribution": "nursing_eval_status" },
  "temporalType": "always_on",
  "vault_reads": [],
  "vault_writes": []
}
```

**Required fields:** `id`, `name`, `slug`, `pricing`, `canvasTabs`. `slug` must be globally unique and can't change after publish — lowercase, hyphens only.

### persona_name (recommended, not shown above — add it yourself)

Give your worker's chat a name, not just a job title. Users respond better to talking to "Ruthie" than to "Nurse Eval — SOAP Note Drafting" — every worker on the platform already has one (Max for accounting, Skye for aviation workers, and so on), and a worker that skips this field falls back to a generic, nameless "{name} · Worker" header in the chat UI. Add a `persona_name` field alongside `name` above; pick something short and human. There's no separate registry to update — set it here and it's live.

`valueBucket` options: `make_money`, `save_money`, `save_time`, `stay_organized`, `stay_compliant`, `delight_customers`.

## intent.md

The formal spec, in plain language — what your worker does, who it's for, what success looks like, and what it explicitly is *not*. **This is the file worth spending the most time on** — a sharper intent.md makes every later step faster, because there's less to discover mid-build.

```markdown
# Worker: nurse-eval-001

**Creator:** Ruthie Smith (ruthie@example.com)
**Status:** Draft

## What it does

Takes a patient's chart (text + lab values) and drafts a SOAP note,
flagging any out-of-range labs and suggesting next-step orders
consistent with the subscribing hospital's protocols.

## Who uses it

**Operators** (the subscribing hospital/unit): bedside and charge nurses
who need a first-pass SOAP note drafted quickly during a busy shift.

## What success looks like

- A nurse can review and sign a drafted note in under 2 minutes
- Every flagged lab includes the reference range it's being compared against
- Every suggested order cites the protocol section it came from

## What this worker is NOT

Not a replacement for clinical judgment — every note requires a human
sign-off before it's final. Not a diagnostic tool. Never accepts a real
patient name — de-identified input only.
```

## rules.md

Your worker's behavioral rules: identity, scope, evidence standard, tone, and required disclaimers.

```markdown
## Identity
You are Ruthie, a Digital Worker built on the SOCIII platform.
Your specialty: drafting SOAP notes from patient charts for bedside nurses.

## Scope
You ONLY help with: SOAP note drafting, lab flagging, protocol-cited order suggestions.

You NEVER:
- Give clinical advice outside a drafted note a human must sign off on.
- Claim to be a licensed nurse or physician.
- Fabricate lab values, reference ranges, or protocol citations.

## Evidence Standard
Every flagged lab and every suggested order must trace to (1) data the
user provided this conversation, or (2) the hospital's connected protocol
document. If you don't have a source, say so — don't estimate silently.

## Disclaimer (required)
> "This is a drafted note for clinical review — not a final record until
> a licensed nurse signs it."
```

Platform-level invariants (safety, audit, epistemic honesty) apply on top of whatever you write here automatically — you don't declare those yourself, and a worker-level rule may tighten them but never loosen them. **[See RAAS docs →](/docs/raas)**

## canvas-tabs.json

What renders in the right panel of the worker UI.

```json
{
  "workerSlug": "nurse-eval-001",
  "version": "0.1.0",
  "canvasTabs": [
    { "id": "current-case", "label": "Current case", "signal": "card:work-product", "order": 0, "default": true, "view": "operator" },
    { "id": "protocols", "label": "Protocols", "signal": "card:work-product", "order": 1, "view": "operator" },
    { "id": "history", "label": "Past evaluations", "signal": "card:work-product", "order": 2, "view": "operator" }
  ]
}
```

Tab `id`s are referenced by `service.js` and `sample-data.js` — don't rename after first merge. Exactly one tab needs `default: true`. Aim for 3–7 tabs. **[Full canvas tabs schema →](/docs/canvas-tabs)**

## service.js

The worker's functions — pure event proposals, not direct mutations. The platform's rules engine validates each proposal before it commits.

```javascript
export const SERVICE_ID = "nurse-eval-001";
export const REQUIRED_CAPABILITIES = []; // e.g. "notify.email_user_v1" if you need one

export function proposeSoapNote({ patientChart, hospitalProtocol }) {
  if (!patientChart) return { error: "patientChart is required" };
  return {
    type: "nurseEval.soapNoteProposed",
    payload: { patientChart, hospitalProtocol: hospitalProtocol || null, proposed_at_iso: new Date().toISOString() },
    requires: ["operator_role", "active_subscription"],
  };
}
```

## sample-data.js

Fixtures so a first-time user sees something real, not an empty state — same field names and shape as live data.

```javascript
export const SAMPLE_CANVAS_PAYLOADS = {
  "current-case": {
    title: "65yo F — chest pain x2hr",
    subtitle: "Sample data · ACS pathway v3",
    flaggedLabs: ["troponin: 0.4 ng/mL (elevated — ref range 0.00–0.04)"],
    suggestedOrders: ["serial troponin q6h (ACS pathway §4.2)", "12-lead ECG (ACS pathway §3.1)"],
  },
};
```

## tests/assertions.md

The acceptance checks QA-001 runs before your worker ships — aim for at least 5, better workers have 10–15.

```markdown
### Current case tab
- TC-###: First-visit user sees the sample fixture, not an empty state
- TC-###: Out-of-range labs are always flagged with their reference range
- TC-###: Every suggested order cites the protocol section it came from

### Negative tests
- TC-###: A chart naming a real (non-de-identified) patient is refused
- TC-###: A non-operator user cannot draft a note
```

You don't have to predict exact output — assertions are structural/semantic (e.g. "flagged labs must include any troponin > 0.04 ng/mL"), not byte-exact matches. **[See QA-001 →](/docs/qa-001)**

## Read an existing worker

The best documentation is the real thing. Start from the [SDK's own `template/` folder](https://github.com/SOCIII-Inc/sociii-sdk/tree/main/template) — copy it as your starting point. To see what a shipped worker looks like from the outside (its code isn't public, but its behavior and canvas are), browse a published worker on the [SOCIII Marketplace](https://sociii.ai/marketplace).

## What comes next

**[→ Intent Spec format](/docs/intent-spec)**
**[→ RAAS rule architecture](/docs/raas)**
**[→ Canvas tabs schema](/docs/canvas-tabs)**
**[→ QA-001 validator](/docs/qa-001)**
