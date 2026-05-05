# CODEX 50.4 Phase 1 — Diagnostic Report

**Run at:** 2026-05-03T16:02:08.630Z
**Project:** title-app-alpha
**Mode:** read-only — no writes performed

## Summary

| Metric | usageEvents (camelCase) | usage_events (snake_case) |
|---|---|---|
| Total document count | 147 | 0 |
| Earliest timestamp | 2026-04-04 01:57:09 UTC | — |
| Latest timestamp | 2026-05-03 04:26:25 UTC | — |
| Revenue-bearing count (creator_share_amount > 0) | 0 | 0 |
| Sum of creator_share_amount | $0.00 | $0.00 |
| Distinct creators with shares | 0 | 0 |

## Scenario classification

Scenario: **B — Only camelCase usageEvents populated.** Full backfill required (Sean authorization).

## Field shape (per collection)

### usageEvents (camelCase) — 7 distinct fields seen
```
cost, createdAt, event_type, model, pass_through, userId, workerId
```
Sample doc id: `0e1ySrYFCPn8Q9xyGoY8`
```json
{
  "id": "0e1ySrYFCPn8Q9xyGoY8",
  "userId": "4WHjuUgEseQfBr0Tg92YXXhu6Mj1",
  "workerId": "sandbox-draft",
  "event_type": "image_generate",
  "cost": 0.008,
  "pass_through": true,
  "model": "fal-ai/flux/schnell",
  "createdAt": {
    "_seconds": 1775944696,
    "_nanoseconds": 787000000
  }
}
```

### usage_events (snake_case) — 0 distinct fields seen
```
(no documents)
```

## Estimated Creator share — by creator_id

_No revenue-bearing events found in either collection._

## Estimated financial impact

Under-paid amount (sum of unaggregated camelCase creator_share_amount): **$0.00**

This is what cycle-close failed to compute because it reads from `usage_events` while writes went to `usageEvents`.

## Spec-vs-reality reconciliation

**Critical static-analysis finding (independent of the live data above):**

- `usageEvents` (camelCase) is written by 4 code paths: `callWithHealthCheck.js`, `image/generator.js`, `documentControl/documentControlSchema.js`, `campaigns/subscriberDigest.js`. None of these writes include a `creator_share_amount` field. They write only `creditsUsed`, `event_type`, `connectorId`, `userId`, `workerId` etc. — credit-deduction telemetry.
- `usage_events` (snake_case) is written by exactly one function: `billing/recordUsageEvent.js`. This is the only write path in the entire codebase that produces a `creator_share_amount` field.
- `recordUsageEvent` is **never invoked** from any production execution path. `grep -rn 'recordUsageEvent('` in `functions/functions/` returns only the function definition itself.
- `stripeWebhook.js` cycle-close reads `usage_events` and aggregates `creator_share_amount` by `creator_id`. With nothing writing to `usage_events`, this aggregation is computing $0 for every period.

In other words: the bug isn't a name mismatch causing events to land in the wrong place. The bug is that the Creator-share write path (`recordUsageEvent`) was built but never wired into worker execution. The camelCase collection holds telemetry that doesn't include Creator-share data — even if you copied those events to `usage_events`, the field needed for payout aggregation isn't there.

## Recommended next steps

1. **Confirm with Sean which scenario applies** based on the live data above. The static analysis points to scenario B-prime: usage_events is empty AND camelCase doesn't have creator_share_amount fields, which is functionally a no-revenue-events state. No catch-up payouts are owed (because no revenue events ever existed in the canonical store).
2. **Wire `recordUsageEvent` into worker execution.** Determine the right entry point — likely `index.js` after a successful billable worker call. This is what the spec's Phase 3 'consolidation' should produce.
3. **If any Creator subscriptions have been monetized** since launch, manually backfill the missing revenue events using Stripe invoice line items or subscription start records as the source of truth — not the `usageEvents` telemetry collection (which lacks the necessary fields).

## Pre-flight notes

- Firestore export of both collections **was not run** by this script. The spec recommends exports as a Phase 1 safety step before any Phase 2 write. This diagnostic is read-only so the export gap is not blocking, but if Phase 2 backfill is authorized, do the gcloud-based export first.
- gcloud is not installed locally. Sean / DevOps will need to run the export from a machine that has it: `gcloud firestore export gs://title-app-alpha-backups/codex-50-4-pre-phase2 --collection-ids=usageEvents,usage_events,creatorPayouts`
- Cycle-close handler (`stripeWebhook.js` invoice.paid path) was not disabled during this diagnostic. Read-only queries don't interfere with it.

---

End of Phase 1 diagnostic. Hand this report to Sean before proceeding to Phase 2.