# Intent Spec

The Intent Spec is your worker's contract. It describes — in YAML — what the worker accepts, what it produces, what it refuses, and what success looks like.

Authoring the Intent Spec is the **first thing** Claude Code will help you do. Everything downstream (rules, fixtures, canvas tabs, validator assertions) flows from it.

## Why it exists

Every worker on SOCIII has to be honest about three things before it ships:
1. **What it does** — the inputs and outputs
2. **What it refuses** — the cases outside its scope
3. **How you'll know it worked** — measurable assertions

Without those three, the validator can't check your work, the marketplace can't list you accurately, and customers can't tell whether the worker is for them.

## The format

```yaml
# intent-spec.yml

worker:
  slug: nurse-eval-001
  version: 1
  domain: "Nursing patient evaluation — SOAP note drafting"

inputs:
  - name: patient_chart
    type: text
    description: "De-identified chart with vitals + lab values"
    required: true
  - name: hospital_protocol
    type: text
    description: "Optional protocol reference for this case"
    required: false

outputs:
  - name: soap_note
    type: structured
    schema: soap_note_v1
    description: "Standard SOAP format with Subjective, Objective, Assessment, Plan"
  - name: flagged_labs
    type: array
    items: { name: lab, value: number, reference_range: string, severity: enum }
  - name: next_step_orders
    type: array
    items: { order: text, protocol_section: string }

refuses:
  - condition: "input names a real (non-de-identified) patient"
    response: "I can't process this — it looks like a real patient. Please de-identify the chart first."
  - condition: "case is outside scope of nursing assessment (e.g., surgical planning)"
    response: "This is outside my scope. Try the [surgical-eval] worker instead."

assertions:
  - id: out-of-range-flagged
    statement: "Any lab value outside reference range appears in flagged_labs"
    family: behavioral
  - id: orders-cited
    statement: "Every entry in next_step_orders has a non-null protocol_section"
    family: behavioral
  - id: refuses-real-patients
    statement: "Given an input containing 'John Smith DOB' the worker refuses"
    family: edge-case
    fixture: fixtures/edge-pii.json

success_criteria:
  - "User accepts the SOAP draft without major rewrites > 70% of the time"
  - "Flagged labs are clinically accurate per board-certified review"
  - "No false positives on PII detection"
```

## What each field is for

**worker** — Identity. Slug must be unique across the platform. Version is integer (bump on breaking changes).

**inputs** — What the user gives the worker. Use `type: text | structured | file | url`. Mark each `required: true` or `false`.

**outputs** — What the worker produces. If you use `type: structured`, reference a schema name and define it in `schemas/` or refer to a platform schema.

**refuses** — Where the worker draws the line. Pair each condition with a response message. The platform's safety layer will append these to your Level 1 invariants.

**assertions** — Testable claims about behavior. The QA-001 validator uses these. Group by `family` (structural, behavioral, edge-case, performance). **[See QA-001 →](/docs/qa-001)**

**success_criteria** — Human-readable, not auto-tested. These describe what "this worker is working well" means in your domain. The Forge Review uses these to assess your first ship.

## How Claude Code helps you draft this

When you start a new worker, Claude Code will:
1. Ask you to describe the worker in plain language ("I want a worker that…")
2. Propose a first-draft Intent Spec
3. Ask 3–5 clarifying questions (Are there cases the worker should refuse? What's the structure of the output?)
4. Iterate the spec with you
5. Save the locked spec

You don't write YAML by hand. You read it and answer questions.

## Common mistakes

**Too vague.** "Outputs a SOAP note" isn't enough. Specify: SOAP format, with which fields, in what data type. The vaguer the spec, the more brittle the worker.

**No refuses.** Every worker should refuse something. If your worker accepts every input, you don't have a worker — you have a chat with Claude.

**No assertions.** "I'll know it when I see it" doesn't scale. Each assertion is a thing the validator can check on every PR.

**Skipping the version.** When you ship breaking changes (e.g., output schema rename), bump the version. The platform keeps old versions running for existing customers.

## What comes next

**[→ RAAS rule architecture](/docs/raas)** — where the rules backing your assertions live
**[→ QA-001 validator](/docs/qa-001)** — how assertions get checked
**[→ Worker anatomy](/docs/worker-anatomy)** — how Intent Spec fits with the other five files
