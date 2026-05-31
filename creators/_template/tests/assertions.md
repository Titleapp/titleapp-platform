# QA-001 Assertions — `<your-worker-slug>`

These assertions become the platform's automated tests for your worker. They run before any release. They are how QA-001 catches bugs before users do.

Aim for **at least 5 assertions**. Better workers have 10-15. Each assertion gets a TC-### identifier when merged into the platform corpus.

## Naming convention

- **TC-###**: assigned by the platform when merged. Don't pre-assign.
- **Tab name**: the canvas tab the assertion lives in
- **Statement**: must be testable with a clear pass/fail

## Worker-specific assertions

### Main tab

- TC-###: First-visit user sees the sample fixture, not an empty state
- TC-###: Operator can create a new thing with valid input
- TC-###: Creating a thing with invalid input returns a specific, actionable error

### Activity tab

- TC-###: Recent activity reflects events from the last 7 days
- TC-###: An operator's actions appear in activity within 2 seconds

### Audit Trail tab

- TC-###: Every state-changing action emits an audit event
- TC-###: Audit events include the verified actor identity
- TC-###: Locked events have a chain anchor hash
- TC-###: An attempt to modify a locked event fails AND emits its own audit event

### Cross-cutting

- TC-###: A worker action that changes shared state appears in the tenant's audit trail
- TC-###: A worker action that requires KYC fails for an unverified user

## Time budgets (treat as bugs if exceeded)

Time budgets are bugs, not features. List the action-time bars for your worker:

- TC-###: `<primary user action>` completes in ≤ N seconds (95th percentile)
- TC-###: `<secondary user action>` completes in ≤ N seconds (95th percentile)

## Negative tests

What should NOT be possible:

- TC-###: A non-operator user cannot create a thing
- TC-###: A user cannot read another tenant's things
- TC-###: A locked thing cannot be modified, even by the user who locked it

## Notes for reviewer

If any of these assertions require new platform capabilities (KYC gate, chain anchor, etc.), call them out in `intent.md` under "Why this dovetails with the SOCIII platform" so a maintainer wires them up during PR review.
