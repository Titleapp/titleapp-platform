# CODEX 50.5 — Validation Checklist

Pre-launch validation for the Creator economy revenue stream. All 9 scenarios
from CODEX 50.5 spec § Validation are listed here. Run after deploy and after
Pre-Flight items 1-4 are satisfied.

---

## Pre-flight

- [ ] CODEX 50.4 Phase 3a deployed (canonical collection + USAGE_EVENTS_COLLECTION threading + deprecation marker on `usage_events`).
- [ ] CODEX 50.5 deployed (helper + emission wiring + cycle-close + refund walkback + indexes).
- [ ] Firestore composite indexes built. After deploy, check Firebase console → Firestore → Indexes. The new ones are:
  - `usageEvents` (billing_period ASC, creator_id ASC)
  - `usageEvents` (creator_id ASC, billing_period ASC)
  - `usageEvents` (billing_period ASC, parent_creator_id ASC)
  - `subscriptions` (ownerType ASC, ownerId ASC, slug ASC)
  - `subscriptions` (ownerType ASC, ownerId ASC, workerId ASC, trialStatus ASC)
- [ ] Stripe in **test mode** for any Creator account being used in validation. Live transfers do not get rolled back automatically.
- [ ] One test Creator account exists with an active Stripe Connect account and verified `stripeConnectAccountId` on their user doc.

---

## Helper unit tests

These run locally without touching prod Firestore (the script stubs the SDK):

```bash
cd functions/functions
NODE_PATH=./node_modules node ../../scripts/test50_5RevenueAttribution.js
```

- [ ] All 11 helper tests pass. Re-run if any fail before continuing.

---

## E2E scenarios — run in test mode

For each scenario, confirm the expected values in `usageEvents` collection
(filter by recent timestamp), and run a synthetic cycle-close to confirm
`creatorPayouts` rows.

### 1. TitleApp original, paid user
- [ ] Run a billable chat completion in a TitleApp-original worker (creatorId = `"titleapp-platform"`).
- [ ] Event has `creator_id = "titleapp-platform"`, `creator_share_amount = 0`, `revenue_amount > 0`.
- [ ] Cycle-close produces no `creatorPayouts` row for this event.

### 2. Creator-authored, no fork, paid user
- [ ] Run a billable call in a Creator-authored worker.
- [ ] Event has `creator_share_amount = revenue_amount × 0.20`, `creator_status = "active"`, `parent_creator_id = null`.
- [ ] After threshold reached, cycle-close creates a `creatorPayouts` row with `role="creator"` for this Creator.

### 3. Forked from TitleApp original, paid user
- [ ] Fork a TitleApp original to a test Creator. Run a billable call against the fork.
- [ ] Event has `creator_id = forker`, `parent_creator_id = null`, `creator_share_amount = 20% × revenue`, `parent_share_amount = 0`.
- [ ] All share goes to forker; no upstream payout.

### 4. Forked from Creator-authored, paid user
- [ ] Two-level fork: Alice authors original → Bob forks Alice → Carol forks Bob. Run a billable call on Bob's fork.
- [ ] Event has `creator_id = "uid_bob"`, `parent_creator_id = "uid_alice"`, share split 14% Bob / 6% Alice.
- [ ] Cycle-close produces TWO `creatorPayouts` rows: one for Bob (role="creator"), one for Alice (role="parent").
- [ ] Verify a level-2 call (Carol's fork) attributes parent to Bob, NOT Alice.

### 5. Chained interaction (parent_interaction_id)
- [ ] Send one user message that triggers chat + tool call + image generation.
- [ ] All three events share one `parent_interaction_id`.
- [ ] Confirm in Firestore by querying `usageEvents.where("parent_interaction_id", "==", "<id>")` — should return 3 docs.

### 6. Refund walkback
- [ ] Issue a refund via `POST /v1/admin:refund` (or directly through `processRefund`) with `parentInteractionId` from scenario 5.
- [ ] All 3 events get `refunded_at` timestamp.
- [ ] Any `creatorPayouts` rows with status `deferred` or `pending` for affected Creators get reduced or marked `reversed`.
- [ ] If the share had already been transferred, a row appears in `creatorClawbacks` for the matching amount.
- [ ] Re-run the refund (idempotency check) — no double-walkback.

### 7. Cycle-close end-to-end
- [ ] Trigger a synthetic Stripe `invoice.paid` event for a billing period containing test events (use the Stripe CLI in test mode):
  ```bash
  stripe trigger invoice.paid
  ```
- [ ] Confirm `creatorPayouts` rows are created for each affected Creator and parent.
- [ ] Confirm Stripe Connect transfer fires (test-mode transfers are visible in the dashboard but don't move real money).

### 8. Stale-creator escheat
- [ ] Mark a test Creator's user doc with `deleted_at: <timestamp>` and clear `stripeConnectAccountId`.
- [ ] Run cycle-close for a period with their share.
- [ ] Confirm a row in `platformEscheats` with `creatorId`, `netAmount`, `reason: "creator_deleted_no_connect"`.
- [ ] Confirm NO transfer was attempted and no `creatorPayouts` row with `transferred` status was created for this creator.

### 9. Free-tier non-write
- [ ] Run a free-tier call (no subscription, no credits).
- [ ] Event has `revenue_basis = "free"`, `revenue_amount = 0`, `creator_share_amount = 0`.
- [ ] Cycle-close produces no `creatorPayouts` row for this event.

---

## Edge cases worth a manual check

- [ ] Subscription pro-rata with a single billable call in the period — `revenue_amount` is the per-credit slice for that tier (e.g., Pro user with 5-credit call → $0.29 revenue, $0.058 share). Spec calls this out as "acceptable but worth surfacing in the dashboard."
- [ ] Creator with active Connect account but `creator_status="deleted"` (deletion in progress) — per D6 the transfer goes through normally. Verify cycle-close issues the transfer.
- [ ] Clawback exceeding next payout — verify the `creatorClawbacks` row is partially applied with status `partial` and remaining balance carries to the next cycle.

---

## Sign-off deliverables

- Schema-extension confirmation — verified by running scenario 2 and inspecting the event doc has all 11 nullable fields populated.
- Wiring confirmation for each emission point — verified by running each respective trigger and confirming the event lands with attribution fields.
- Helper module test results — see `scripts/test50_5RevenueAttribution.js` output (11/11 expected).
- E2E validation report — fill in this checklist with screenshots / log excerpts where relevant.
- processRefund + cycle-close confirmation — scenarios 6 + 7 cover.
- CODEX 50.6 unblock — confirm Creator dashboard work in 50.6 can read `creatorPayouts` and `usageEvents` with the new fields.
