# TitleApp Pricing Architecture — Three Revenue Lines

**Approved: Session 28 (March 2026)**

## Revenue Line 1 — Inference Credits
- Overage rate: $0.02/credit
- Platform margin: ~80–85%
- Creator share: 20% of platform margin on overage executions
- Metered Stripe product: `inference_credits_overage`

## Revenue Line 2 — Data Pass-Through Fee
- Rate: actual_cost × 2.0 markup
- Platform margin: ~50%
- Creator share: 0% (cost recovery line)
- Billing: Stripe Invoice Items (not metered — variable per provider)
- Registry: `data_fee_registry` Firestore collection
- If provider not registered → block call, alert sean@titleapp.ai
- Quarterly review: Jan 1 / Apr 1 / Jul 1 / Oct 1

## Revenue Line 3 — Audit Trail Fee
- Rate: $0.005/record
- Platform gas cost: ~$0.001/record
- Platform margin: ~80%
- Creator share: 0% (platform IP / moat revenue)
- Metered Stripe product: `audit_trail_records`
- Enterprise example: 200 nurses × 20 executions × 3 shifts = 120K records/mo = $600 revenue, $480 net

## Creator Share Summary
| Line | Creator Gets |
|------|-------------|
| Subscription | 75% |
| Inference overage | ~15–17% of overage charge |
| Data pass-through | 0% |
| Audit trail | 0% |

## usage_events Schema (23 fields — immutable, append-only)
event_id, timestamp, worker_id, creator_id, user_id, org_id, execution_type,
credits_consumed, inference_cost_actual, data_api_calls (array), data_fee_actual,
data_fee_charged, audit_record_written, audit_fee_charged, blockchain_tx_hash,
jurisdiction, raas_tier_applied, disclaimer_active, subscription_tier,
revenue_line_1, revenue_line_2, revenue_line_3, creator_share_amount

## Long-Term Thesis
"If subscriptions survive, we survive. If they die, we thrive."
As software costs compress toward zero, audit trail + data fees become dominant revenue.
