# Worker Types Architecture

This document defines the three types of Digital Workers on the TitleApp platform and how they interact. This is a foundational architectural decision that affects the Sandbox, the marketplace, the pricing model, and the developer program.

This is a reference spec. T1 needs it for UI flows. T2 needs it for backend orchestration. T3 needs it for marketplace display.

---

## Three Worker Types

### Type 1: Standalone Worker

**What it is:** A single-function Digital Worker with its own RAAS library that performs one defined task or set of related tasks.

**Examples:**
- CRE Deal Analyst — screens and models investment opportunities
- Contract Reviewer — reviews legal contracts for risk and compliance
- Property Compliance Checker — verifies property compliance with local regulations
- Aviation Logbook Manager — manages pilot and aircraft logbook entries

**Who builds it:** TitleApp (internal catalog) or a Creator via Worker #1

**RAAS library:** One complete 4-tier library (Tier 0 inherited, Tier 1-3 generated/customized)

**Pricing tier:** Starter ($9/mo) or Professional ($29/mo)

**User experience:** Business subscribes to the worker, interacts with it directly. Input in, output out. Simple.

**Marketplace display:** Single worker card with compliance badges, description, subscription button.

---

### Type 2: Pipeline Worker

**What it is:** A sequenced chain of two or more Standalone Workers where the output of one becomes the input of the next. Each worker retains its own independent RAAS library. The platform orchestrates the handoff.

**Examples:**
- Deal Screening Pipeline: Deal Analyst -> Investor Governance Worker
  (Analyst screens the deal -> Governance worker produces investor docs from the analysis)
- Compliance Pipeline: Property Compliance -> Contract Reviewer -> Document Generator
  (Check compliance -> Review contracts -> Produce compliance package)
- Hiring Pipeline: Job Description Writer -> Candidate Screener -> Interview Prep
  (Write JD -> Screen applicants -> Prepare interview materials)

**Who builds it:** The business user configures it. No development skills needed. They select workers from their subscriptions and define the sequence in a visual pipeline builder.

**RAAS library:** Each worker in the chain keeps its own RAAS library. No merging. No conflicts. The pipeline configuration defines: (a) which workers, (b) in what order, (c) what data passes between them, and (d) what triggers the handoff (automatic or user-approved).

**Pricing tier:** Business ($49/mo) — or the sum of the individual worker subscriptions, whichever the business prefers. Pipeline configuration is a platform feature, not a separate product.

**User experience:** Business subscribes to multiple Standalone Workers. Goes to their Vault/workspace and creates a Pipeline. Visual builder: drag workers into sequence, define handoff rules. When a deal comes in, it flows through the pipeline automatically (or with approval gates at each step).

**Marketplace display:** Pipelines are NOT listed on the marketplace. They are user-configured combinations of marketplace workers. However, popular pipeline configurations can be featured as "Recommended Workflows" on worker detail pages ("Works great with: Investor Governance Worker").

### Pipeline Builder UI Requirements (T1)

```
Route: /vault/pipelines (or /workspace/pipelines)

Pipeline Builder:
  +---------------------------------------------------+
  |  Pipeline: CRE Deal Flow                          |
  |                                                   |
  |  +----------+    +------------------+             |
  |  | Deal     |--->| Investor         |             |
  |  | Analyst  |    | Governance       |             |
  |  +----------+    +------------------+             |
  |                                                   |
  |  Handoff Rules:                                   |
  |  ( ) Automatic (output passes immediately)        |
  |  (*) Approval Gate (user reviews before handoff)  |
  |                                                   |
  |  Data Passed: deal_analysis, financial_model,     |
  |               risk_assessment                     |
  |                                                   |
  |  [+ Add Worker to Pipeline]    [Save Pipeline]    |
  +---------------------------------------------------+
```

### Pipeline Orchestration Requirements (T2)

```javascript
// Pipeline execution model
{
  "pipelineId": "pipeline-abc123",
  "name": "CRE Deal Flow",
  "userId": "scott-id",
  "orgId": "jma-ventures",
  "steps": [
    {
      "order": 1,
      "workerId": "cre-deal-analyst",
      "inputSource": "user",           // User provides initial input
      "outputFields": ["deal_analysis", "financial_model", "risk_score"],
      "handoff": "approval_gate"       // User approves before next step
    },
    {
      "order": 2,
      "workerId": "investor-governance",
      "inputSource": "previous_step",   // Receives output from step 1
      "inputMapping": {                 // Map step 1 output to step 2 input
        "deal_data": "deal_analysis",
        "financials": "financial_model"
      },
      "outputFields": ["offering_memo", "investor_summary", "pitch_deck"],
      "handoff": "automatic"
    }
  ],
  "status": "active",
  "createdAt": "2026-03-01T00:00:00Z"
}
```

```javascript
// Pipeline execution flow
async function executePipeline(pipelineId, initialInput) {
  const pipeline = await getPipeline(pipelineId);
  let currentInput = initialInput;

  for (const step of pipeline.steps) {
    // Map input from previous step if needed
    const stepInput = step.inputSource === "user"
      ? currentInput
      : mapInput(currentInput, step.inputMapping);

    // Execute the worker
    const result = await executeWorker(step.workerId, stepInput);

    // Check handoff type
    if (step.handoff === "approval_gate") {
      // Pause and notify user for review
      await notifyUserForApproval(pipeline.userId, step, result);
      // Wait for user approval before continuing
      await waitForApproval(pipelineId, step.order);
    }

    // Pass output to next step
    currentInput = result;

    // Log step completion for audit trail
    await logPipelineStep(pipelineId, step.order, result);
  }

  return currentInput; // Final output from last step
}
```

---

### Type 3: Composite Worker

**What it is:** A custom-built Digital Worker created through Worker #1 that combines capabilities from multiple verticals or domains into a single, unified RAAS library. This is a NEW worker — not a chain of existing workers. It has one integrated RAAS library purpose-built for a specific use case.

**Examples:**
- CRE Acquisition & Capital Markets Worker — combines deal analysis, financial modeling, investor document generation, and regulatory compliance into one worker purpose-built for CRE acquisition firms
- Healthcare Practice Manager — combines patient scheduling, compliance tracking, billing code verification, and documentation into one worker for medical practices
- Aviation Operations Worker — combines flight scheduling, crew compliance, maintenance tracking, and FAA reporting into one worker for Part 135 operators

**Who builds it:** A Creator (developer) via Worker #1 in the Sandbox. The Creator describes the combined use case, Worker #1 researches the regulatory landscape across all relevant domains, generates a unified RAAS library, and the Creator customizes Tier 3 SOPs. The Creator then publishes it to the marketplace.

**RAAS library:** One unified 4-tier library that incorporates rules from multiple domains. Worker #1 handles deduplication and conflict resolution. For example, a CRE Acquisition worker would have:
- Tier 1: SEC regulations (from investor/governance domain) + state RE regulations (from real estate domain) + FTC rules (from marketing domain if the worker generates marketing materials)
- Tier 2: Institutional underwriting standards (from analyst domain) + investor reporting best practices (from governance domain) + document formatting standards (from document generation domain)
- Tier 3: Custom SOPs for the specific acquisition workflow

**Pricing tier:** Business ($49/mo) or Enterprise ($79/mo) — composite workers are premium products because they deliver more value than standalone workers.

**User experience:** Business subscribes to a single composite worker. It handles the entire workflow internally — no pipeline configuration needed, no handoffs, no approval gates between steps (unless the RAAS rules require them). From the user's perspective, it's one worker that does everything.

**Marketplace display:** Single worker card (same as standalone) but with additional badges indicating multi-domain capability. The detail page shows which domains/verticals it covers and the combined RAAS rule count.

### Composite Worker Creation Flow (via Worker #1)

```
Creator enters Sandbox -> "Build a Digital Worker"
  -> Worker #1 Intake Interview
    - "What task does this worker perform?"
    - Creator: "I need a worker that screens CRE deals, runs financial
      analysis, produces investor documents, and manages compliance"
    - Worker #1 identifies this spans multiple domains:
      [x] Investment Analysis
      [x] Financial Modeling
      [x] Investor Relations / Governance
      [x] Securities Compliance (Reg D)
      [x] Document Generation
  -> Worker #1 Research Phase
    - Researches regulations across ALL identified domains
    - Identifies overlapping rules (deduplicate)
    - Identifies conflicting rules (resolve — more restrictive wins)
    - Researches best practices from each domain
  -> Compliance Brief
    - Shows Creator the combined regulatory landscape
    - Flags any domain-specific showstoppers
    - Shows how conflicts were resolved
  -> RAAS Library Editor
    - Unified library with rules sourced from multiple domains
    - Each rule tagged with its source domain for transparency
    - Creator customizes Tier 3 SOPs for the integrated workflow
  -> Pre-Publish Validation
    - 7-point acceptance criteria (same as any worker)
  -> Publish
    - Published to marketplace as a single composite worker
```

---

## Comparison Table

| Attribute | Standalone | Pipeline | Composite |
|-----------|-----------|----------|-----------|
| **RAAS Libraries** | 1 | Multiple (1 per worker) | 1 (unified, multi-domain) |
| **Who builds** | Creator or TitleApp | Business user configures | Creator via Worker #1 |
| **Dev skills needed** | Creator License | None | Creator License |
| **Marketplace listed** | Yes | No (user-configured) | Yes |
| **Price tier** | $9-29/mo | Sum of subscriptions | $49-79/mo |
| **Rule conflicts** | N/A | None (separate libraries) | Resolved by Worker #1 |
| **Handoffs** | N/A | Explicit (auto or gated) | Internal (seamless) |
| **Audit trail** | Single worker log | Log per step | Single worker log |
| **Best for** | Single-function tasks | Multi-step workflows | Integrated domain solutions |

---

## The Flywheel

```
Business discovers TitleApp
  -> Subscribes to Standalone Workers (Starter/Professional)
  -> Chains them into Pipelines as needs grow (Business)
  -> Realizes they want something more integrated
  -> Either:
    (a) Subscribes to an existing Composite Worker (Enterprise)
    (b) Becomes a Creator and builds their own Composite Worker
  -> New Composite Worker published to marketplace
  -> Other businesses in the same vertical discover it
  -> Subscribe -> Revenue -> Creator earns 75%
  -> More Creators attracted -> More Composite Workers built
  -> Platform becomes the definitive source for compliant AI workers
  -> RAAS library grows with every worker -> moat deepens
```

---

## Impact on Existing Specs

### Worker #1 Spec (22a)
- Update intake interview to detect multi-domain use cases
- Add domain tagging to RAAS rules
- Add conflict resolution logic for cross-domain Tier 1 rules
- Add composite worker badge to pre-publish validation

### Platform Document Engine (22b)
- Pipeline workers need document generation at each step (not just the final step)
- Composite workers need access to templates from all their source domains

### Sandbox UI (T1)
- Add Pipeline Builder to Vault/workspace
- Worker #1 intake needs multi-domain detection UI
- RAAS Library Editor needs domain source tags on rules

### Marketplace (T1)
- Worker cards need type badges (Standalone, Composite)
- Composite worker detail pages show domain coverage
- "Works great with" recommendations for pipeline suggestions

### Command Center (T1)
- Review queue shows worker type
- Composite workers may need additional review (multi-domain = more rules to verify)

---

## Priority Order

1. **Document this architecture** — commit to repo so all terminals have it
2. **Pipeline Builder** — this is the fastest path to multi-worker value for users like Scott
3. **Worker #1 composite support** — update the intake and research flow to handle multi-domain
4. **Marketplace updates** — type badges, recommendations, domain coverage display

For Scott right now: we handle it manually (run both workers, orchestrate the handoff ourselves). The architecture is defined for when we build it into the platform.
