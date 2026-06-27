# Creator Worker Build Guide

This is the technical companion to `CREATOR-ONBOARDING.md`. Read that first.

> **Before you build, read `CREATOR-CAPABILITIES.md` — the menu of what's actually possible** (live data connectors, real owned records + Vault, digital signatures + anchoring, generated visuals from data, reaching the user's Google Drive/Gmail, rules + approval gates). Most people under-build because they don't know these exist. This guide is *how to assemble* a worker; that one is *what you can put in it*.

## The five files every worker has

Every worker in `creators/<your-handle>/<worker-slug>/` ships with these five files. They are the contract.

### 1. `intent.md` — what this worker is for

The single most important file. If a maintainer can't tell what your worker does from this file alone, the PR doesn't merge. Required sections:

```markdown
# Worker: <slug>

## What it does
One paragraph. No jargon. A non-technical reader should understand.

## Who uses it
Roles: end users vs operators. Example: "Nursing instructors create rubrics
and lock grades. Nursing students see their grades and competency progress."

## What success looks like
3-5 measurable outcomes. Example:
- A nursing instructor can create a rubric in under 5 minutes
- A locked grade cannot be modified, even by the instructor who locked it
- Student can show a verified transcript to a third party (employer, board)

## What this worker is NOT
The boundary. Example: "This worker does not issue degrees. It records
competency observations. Degree issuance is the institution's authority."

## Why it dovetails with the SOCIII platform
What platform infrastructure does it depend on?
- Audit trail (tamper-proof grades)
- Identity (verified instructor + student)
- Payments (subscription / per-evaluation fee)
- Other workers (e.g. HR for credentialing flow)
```

### 2. `canvas-tabs.json` — what users see

The right panel of your worker has a row of tabs. Define them here:

```json
{
  "canvasTabs": [
    {
      "id": "rubric",
      "label": "Rubric",
      "signal": "card:work-product",
      "order": 1,
      "default": true,
      "view": "instructor",
      "description": "The competency framework instructors define and version"
    },
    {
      "id": "evaluations",
      "label": "Active Evaluations",
      "signal": "card:work-product",
      "order": 2,
      "view": "instructor",
      "description": "Students currently being evaluated against the rubric"
    },
    {
      "id": "my-grades",
      "label": "My Grades",
      "signal": "card:work-product",
      "order": 3,
      "view": "student",
      "description": "Student's locked grades + competency progression"
    }
  ]
}
```

| Field | Rules |
|---|---|
| `id` | Lowercase, hyphenated. Stable — don't rename after merge. |
| `label` | Human-friendly. Title case. |
| `signal` | Almost always `card:work-product`. Other signals exist for specialized tabs; ask in review. |
| `order` | Integer. Lower = leftmost. |
| `default` | True on exactly one tab — the one that auto-opens on the user's second visit. |
| `view` | One of: `instructor`, `student`, `member`, `admin`, `hr`. Determines which payload variant gets shown. |
| `description` | One sentence. What this tab is for. |

### 3. `service.js` — your worker's functions

Stateless functions your worker exposes. They take input, return output. They never directly mutate platform state — they propose actions, the rules engine validates, events append.

```js
// creators/ruthie/nurse-eval-001/service.js

export const SERVICE_ID = "nurse-eval-001";

/**
 * Create a new evaluation rubric.
 * Instructor calls this; rubric appears in canvas Rubric tab.
 */
export function proposeRubric({ name, version, dimensions }) {
  // Validate input shape
  if (!name || !Array.isArray(dimensions)) {
    return { error: "name and dimensions[] are required" };
  }
  // Return the proposed event — platform's rules engine decides whether to commit
  return {
    type: "rubric.proposed",
    payload: { name, version, dimensions, proposed_at_iso: new Date().toISOString() },
    requires: ["instructor_role", "active_subscription"],
  };
}

/**
 * Record a competency observation against a rubric.
 * Instructor evaluates a student. Returns an event proposal.
 * The observation is NOT a grade — grades are computed projections of all observations.
 */
export function recordObservation({ rubric_id, student_id, dimension_id, score, notes }) {
  // ...
}

/**
 * Lock a grade. Once locked, the grade is immutable. The platform anchors
 * the locked grade to the audit chain so any third party can verify it.
 */
export function lockGrade({ student_id, rubric_id }) {
  // ...
}
```

Patterns to follow:
- **Functions are pure** — they take input, return output, no side effects
- **Functions return event proposals**, not direct mutations
- **Declare what permissions/state your function requires** in a `requires: []` array
- **Validate input shapes** — don't trust the caller

Patterns to avoid:
- Calling external APIs directly (you'll hit secret-scan failures; use capability declarations instead — see "Capabilities" below)
- Modifying platform state outside your worker's namespace
- Long-running operations (your function should return in milliseconds; the platform handles async)

### 4. `sample-data.js` — fixture data for demos

When a user opens your worker for the first time, they see sample data, not an empty state. This file is that sample data.

```js
// creators/ruthie/nurse-eval-001/sample-data.js

export const SAMPLE_FIXTURES = {
  "rubric": {
    title: "Clinical Reasoning Rubric (Sample)",
    subtitle: "Sample data · adapted from NCLEX-RN competency framework",
    sections: [
      {
        heading: "Dimensions",
        body: "Assessment · Diagnosis · Planning · Implementation · Evaluation",
      },
      {
        heading: "Scoring",
        body: "1 = Novice · 2 = Beginner · 3 = Competent · 4 = Proficient · 5 = Expert",
      },
    ],
  },
  "evaluations": {
    title: "Active Evaluations",
    subtitle: "Sample data · 3 students in progress",
    items: [
      "Maria Lopez — Clinical Reasoning · 4 of 5 dimensions observed",
      "James Chen — Clinical Reasoning · 2 of 5 dimensions observed",
      "Aisha Patel — Clinical Reasoning · ready to lock",
    ],
  },
  // ... one entry per canvasTab.id
};
```

Sample data is the user's first impression of your worker. Make it look like the real thing.

### 5. `tests/assertions.md` — QA-001 catches

Before your worker ships, it has to pass QA-001 (the platform's automated quality assurance). This file lists the assertions QA-001 runs.

```markdown
# QA-001 Assertions — nurse-eval-001

## Rubric tab
- TC-001: Instructor can create a new rubric with at least 3 dimensions
- TC-002: Rubric versions are immutable — editing creates v2, never overwrites v1
- TC-003: Sample fixture renders for a brand-new instructor on first visit

## Evaluations tab
- TC-004: Active evaluations list excludes locked grades
- TC-005: Instructor can record an observation; observation appears in audit log
- TC-006: Student cannot see another student's observations

## My Grades tab
- TC-007: Student sees only their own grades
- TC-008: A locked grade displays "Locked YYYY-MM-DD" timestamp + anchor hash
- TC-009: Tamper attempt on a locked grade fails platform validation (test via test harness, not in prod)

## Cross-cutting
- TC-010: A grade lock event appears in the tenant's audit trail
- TC-011: A grade lock event includes the instructor's verified identity (KYC required)
```

QA-001 generates a test harness from this file. Your assertions become living tests.

## Capabilities — what your worker is allowed to do

If your worker needs to do anything with real-world consequences (send email, charge a credit card, call an external API, write to a shared system), you don't code that directly. You declare a capability requirement, and a SOCIII maintainer wires it up with appropriate guards.

In your `service.js`, declare what capabilities your worker needs:

```js
export const REQUIRED_CAPABILITIES = [
  "identity.verify_instructor_v1",
  "audit.anchor_locked_grade_v1",
  "notify.student_grade_locked_v1",
];
```

A SOCIII maintainer reviews these in your PR. If any are new (don't yet exist in `contracts/capabilities.json`), they get added with the appropriate role gates, KYC requirements, and per-call billing.

## Worker DoD — definition of done

Before opening your PR, run this checklist:

- [ ] `intent.md` filled in completely, no `<placeholder>` text
- [ ] `canvas-tabs.json` has 3-7 tabs, one marked `default: true`, one per `view` type as appropriate
- [ ] `service.js` exports at least one function, each function returns event proposals (not direct mutations)
- [ ] `sample-data.js` has fixtures for every `canvasTab.id`
- [ ] `tests/assertions.md` has at least 5 testable assertions
- [ ] No API keys, passwords, or tokens in any file (CI will block)
- [ ] All function inputs validated; no `process.env` reads in your code
- [ ] Capability requirements declared if your worker needs external effects
- [ ] README.md in your worker directory describing anything specific (e.g. "this worker assumes the tenant has NCLEX-RN curriculum loaded")

## Examples to study

When in doubt, look at:

| Worker | What to learn from it |
|---|---|
| `creators/_template/` | The minimal skeleton — copy this to start |
| `creators/ruthie/nurse-eval-001/` | The reference example for evaluation-style workers |
| `apps/business/src/sections/HRSchedulePanel.jsx` | A canvas-tab UI pattern (full read/write CRUD against backend) |

## When your worker generates revenue

Once merged and live in the marketplace:
- Customers subscribe via the marketplace
- Platform collects payment (Stripe)
- Platform handles refunds, chargebacks, taxes
- You receive 75% of net revenue, paid monthly
- 1099 generated automatically at year-end (US creators)

For advisors or creators who cross 2.5% of platform revenue, an equity track may open via separate negotiation. See `docs/CREATOR-EARNINGS.md`.

## What this doc is not

- Not a React tutorial
- Not a JavaScript tutorial
- Not the SDK reference (that's at `docs/SDK.md`, generated from `packages/sdk/`)
- Not the RAAS rule authoring guide (that's at `docs/RAAS-AUTHORING.md` — separate concern from worker authoring)

— SOCIII Platform Team
