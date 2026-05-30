# QA-001 — Worker Testing Harness

Runs structural + integration checks against the codebase + live services to catch bug classes we've seen in dogfood sessions.

**Success metric** (memory: `feedback_qa001_success_metric.md`):
> Bugs caught here / total bugs caught in build's lifecycle. S51.37 baseline was 0/8 (because QA-001 didn't exist). Target for IR Investor View V2: ≥6/8.

## Usage

```bash
# Run all checks
node scripts/qa-001/index.js

# Single check
node scripts/qa-001/index.js --check=template-sanity

# JSON output (for CI integration)
node scripts/qa-001/index.js --json

# Env required for live checks (template sanity)
HELLOSIGN_API_KEY=...           # to fetch DBX Sign templates
DROPBOX_SIGN_TEMPLATE_INVESTOR_SAFE=...   # any template-env-key your cfg references
```

Exit code:
- `0` — no P0 findings
- `1` — at least one P0 finding (fail CI)
- `2` — harness itself crashed

## Checks shipped (V1)

| ID | Severity | Targets | Catches |
|---|---|---|---|
| `template-sanity` | P0 | DBX Sign templates | TC-025, TC-026 |
| `state-machine` | P0 | flowStep values vs enrichment | TC-027 |
| `hardcoded-defaults` | P1 | DEFAULT_* constants in flow code | TC-022 |
| `action-handlers` | P0 | Obligation actions vs route handlers | TC-021 |

## Checks queued (V2)

- `deliverability` — outbound subject lines vs Gmail Promotions classifier (TC-020)
- `materials-promise` — email-promised surfaces vs actual workspace render trees (TC-024)
- `webhook-recovery` — every webhook integration has a defensive-sync path (TC-018, TC-019)
- `permission-isolation` — investor cannot see other investors' positions or admin-only tabs
- `deadline-surfacing` — every Firestore date field surfaces in "what needs your attention"

## Adding a new check

Drop a file under `scripts/qa-001/checks/`. Export:

```js
module.exports = {
  id: "my-check",
  title: "One-line description",
  severity: "p0",  // p0 fails CI, p1/p2 warn-only
  async run() {
    return {
      ok: true,
      findings: [{
        check: "my-check",
        severity: "p1",
        tc: "TC-XXX",  // link to docs/QA-001-TEST-CORPUS.md if applicable
        title: "Short summary",
        detail: "Longer explanation",
        evidence: { /* structured reproducer data */ },
      }],
    };
  },
};
```

Index.js auto-loads everything in `checks/`. No registration needed.

## Related

- `docs/QA-001-TEST-CORPUS.md` — the assertion catalog (28 entries as of 2026-05-29)
- `docs/specs/IR-Worker-Investor-View-V2.md` — first spec with QA-001 assertions section
- Memory: `feedback_qa001_success_metric.md` — discipline rule
