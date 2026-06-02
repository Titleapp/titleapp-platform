# Worker Scaffold — `_skeleton`

This directory is the minimum valid SOCIII Digital Worker. Copy it as the starting point for your own worker.

## What's in here

```
_skeleton/
├── catalog.json        ← Marketplace listing
├── intent-spec.yml     ← What success looks like
├── rules/
│   ├── core.yml        ← Hard invariants
│   └── soft.yml        ← Soft (rationale-allowed) rules
├── fixtures/
│   ├── case-001.json   ← Sample input + expected output
│   └── edge-pii.json   ← Edge-case fixture (refusal)
├── canvas-tabs.json    ← Right panel tabs
└── README.md           ← This file
```

## How to use this

1. Copy this directory and rename it to your worker slug:
   ```
   cp -r creator-templates/_skeleton creator-templates/nurse-eval-001
   ```
2. Open the new directory in Claude Code:
   ```
   cd creator-templates/nurse-eval-001
   claude
   ```
3. Tell Claude Code what you're building. It will walk you through editing each file.

## What every file does

- **catalog.json** — Identity, pricing, lane. Read by the platform at deploy time. **[Docs →](https://sociii.ai/docs/worker-anatomy#catalogjson)**
- **intent-spec.yml** — The contract. Describes inputs, outputs, refuses, assertions. **[Docs →](https://sociii.ai/docs/intent-spec)**
- **rules/*.yml** — Behavioral constraints. Merge with platform rules at runtime. **[Docs →](https://sociii.ai/docs/raas)**
- **fixtures/*.json** — Sample inputs + expected outputs. Used by QA-001 validator. **[Docs →](https://sociii.ai/docs/qa-001)**
- **canvas-tabs.json** — UI tabs shown in the right panel. **[Docs →](https://sociii.ai/docs/canvas-tabs)**

## Validation

After your edits, run:

```
npm run validate -- nurse-eval-001
```

The validator runs structural, behavioral, and edge-case checks. Anything failing comes back with a plain-language explanation.

## Shipping

```
git checkout -b nurse-eval-001
git add creator-templates/nurse-eval-001/
git commit -m "Add nurse-eval-001 worker"
git push origin nurse-eval-001
```

Then open a PR. CI runs the validator + AI reviewer. **[Full walkthrough →](https://sociii.ai/docs/your-first-worker)**

## More reading

- **[What is SOCIII?](https://sociii.ai/docs/what-is-sociii)**
- **[SDK overview](https://sociii.ai/docs/sdk)**
- **[Three lanes](https://sociii.ai/docs/three-lanes)**
- **[Earnings & payouts](https://sociii.ai/docs/earnings)**
