# CODEX 76 — Institution-Level Overage Billing + Anticipated-vs-Actual Usage Reporting

**Status:** 🟡 usage visibility built 2026-08-28; automated Stripe overage billing still requires a real metered price + Sean's sign-off — see §6
**Applies to:** Both "Box" plans — Business in a Box (`businessInABox`, per-seat) and Academia in a Box (`education`, per-student) — same underlying gap, same fix, written once.
**Date:** 2026-08-24 (rescoped 2026-08-28 after verifying the actual live architecture — the original plan was built on two stale assumptions, corrected in §0)
**Trigger:** Surfaced while pricing the University of Hawaii Maui College nursing-education deal (CODEX 75), then made urgent 2026-08-28 discussing UH's move to an annual contract: Sean's framing — *"we risk becoming a failure financially if we become a success"* — i.e. if students actually use this heavily (the goal), and usage cost isn't visible or contained, growth in engagement becomes a growth in unrecovered cost.

---

## 0. Correction to the original plan — verified before writing code

The original CODEX (below, §1–§5, kept for history) named `trackUsage.js` as the call site to fix. **That's stale.** Verified 2026-08-28 by reading the actual codebase, not assuming the CODEX's own citation still held (same discipline as the CODEX 79/81 chain):

- **`billing/trackUsage.js` is dead code.** Grepped the entire `functions/functions/` tree — nothing calls `trackUsage()`. It was never the real per-call overage checkpoint; it's an unused module from an earlier design.
- **`billing/usageProcessor.js`'s `processUsageEvents` is real and runs hourly**, but it's scoped to Document Control events (e-signatures, blockchain records) — a completely different subsystem, unrelated to AI chat/tutoring usage.
- **Box-plan seat-count overage already works correctly today.** `seatSync.js` (quarterly) pushes a tenant's active-member count to a tiered Stripe seat price on the **tenant's own subscription** — more active students than the included 5 is already billed to the institution, not any individual. This part of "institution pays, not the student" was never actually broken.
- **What genuinely doesn't exist anywhere:** any tracking of AI-interaction *volume* per student/tenant. A tenant with exactly 5 included students who each send 10,000 messages a month has that entirely absorbed into the flat base+seat fee today, with zero visibility and zero cost containment. **This is the real, more precise version of Sean's worry** — not seat growth (handled), but interaction volume within existing seats (not handled at all, not even measured).

Net effect: the fix isn't "add an `overagePaidBy: institution` branch to an existing per-call check" (that check didn't exist to extend). It's "build the per-call tracking from scratch, tenant-scoped, and ship visibility before ever wiring automated billing to it."

## 1. What got built 2026-08-28

- **`services/billing/boxPlanUsage.js`** (new) — `recordInteraction(db, tenantId)`: a cheap, best-effort, non-blocking counter increment (`boxPlanUsage/{tenantId}_{monthKey}`), fired once per chat turn for *every* tenant regardless of box-plan status (deliberately — an extra Firestore read to check status first would cost more than the write itself; filtering happens at report time against the much smaller box-plan tenant list). `computeTenantUsage(db, tenantDoc, monthKey)`: joins that counter against `config/pricing.js`'s allowance numbers (`includedStudents`/`includedSeats` × `includedCreditsPerStudent`/`includedCreditsPerSeat`) and active membership count, returning actual vs. included plus a **visibility-only** estimated overage amount.
- **Wired into `/chat:message`** in `index.js`, at the same reliable early point used for the distress-protocol gate (runs for every chat turn, before any worker-specific branching).
- **`resetMonthlyUsage.js` extended** with `sendBoxPlanUsageReports()` — on the existing 1st-of-month schedule (`exports.resetMonthlyUsage`, already live), iterates active box-plan tenants (`tenants` where `boxPlanStatus == "active"`, same query `seatSync.js` uses), computes actual-vs-included, and emails the tenant's `billingEmail` (or `contactEmail`) via the existing `sendViaSendGrid` helper — no new email infrastructure. Framed per Sean's explicit direction: heavy usage reported as *"strong engagement,"* not a warning. Explicitly states in the email body that nothing is auto-charged.

**Deliberately not built:** automated Stripe overage charging. See §6 for exactly why and what it would take.

## 2. What this does NOT do, stated plainly

- **It does not charge anyone.** `computeTenantUsage`'s `estimatedOverageAmount` is a number for a human to look at, not a Stripe API call. No metered Stripe price exists for AI-interaction overage today (`config/stripeBoxes.js` has only `basePriceId` and `seatPriceId` per plan — nothing metered).
- **It is not yet FERPA-reviewed for the email content.** CODEX 76's original §4 called for aggregate-first, no per-student breakdown in the routine report — this build honors that (the report is tenant-level totals only, no student-level data), but hasn't had a real privacy/FERPA pass beyond that structural choice.
- **The allowance math trusts `config/pricing.js`**, not `config/stripeBoxes.js` — worth knowing these are two different files with possibly-divergent numbers (`pricing.js` has the allowance shape CODEX 76 always intended to use; `stripeBoxes.js` is the live Stripe product/price wiring and has no allowance data at all, just price IDs). Not reconciled in this pass — flagged, not fixed.

## 3. What this actually answers for the UH Maui annual-contract conversation

Now there's a real number to look at instead of nothing: once deployed and running for a billing cycle, `resetMonthlyUsage`'s monthly pass will show whether UH Maui's actual interaction volume is anywhere near the `includedCreditsPerStudent` assumption baked into the $5/student price — which is the actual question an annual contract needs answered before locking in a rate for a year. Before this, that question had no data behind it at all.

## 4. Original plan (2026-08-24) — kept for history, superseded by §0–§3

<details>
<summary>Original gap analysis and design notes (click to expand)</summary>

### The gap, as originally stated

`config/pricing.js` already anticipates this — both Box configs have an `overagePaidBy` field:

```js
businessInABox: { ..., overagePaidBy: "seat" }       // the seat-holder's own credits pay overage
education:      { ..., overagePaidBy: "student", ... } // comment: "institution" pool optional
```

The original plan assumed `trackUsage.js`'s individual-only metering path was the thing to extend with a tenant-level branch. **This assumption was wrong — see §0.**

### What already exists that this can build on (still accurate)

- **`functions/functions/billing/seatSync.js`** — quarterly job, tenant-level Stripe billing relationship for Box plans. Still the right pattern to imitate for "the tenant, not the user, gets billed."
- **`functions/functions/billing/resetMonthlyUsage.js`** — monthly scheduled job. Still the right hook point — used in §1 above, exactly as originally proposed.

</details>

## 5. Open items, original framing (superseded — see §6 for the current list)

<details>
<summary>Original open items — superseded</summary>

1. Confirm `trackUsage.js` is still the current call site — **resolved: it never was (§0).**
2. Decide whether the institution's overage Stripe item is a new line item on the same subscription or separate — **still open, see §6.**
3. Confirm email delivery mechanism — **resolved: `sendViaSendGrid`, already reused (§1).**
4. This CODEX doesn't change base pricing or allowance defaults (CODEX 75's territory) — **still true.**

</details>

## 6. What's actually open now

1. **No metered Stripe price exists for AI-interaction overage.** Creating one (in Stripe's dashboard/API, then wiring its ID into `config/stripeBoxes.js`) is a prerequisite for any automated charge — and a real commercial/rate decision, not something to default silently. Requires Stripe API access this session doesn't have.
2. **Whether that price lives as a new line item on the tenant's existing Box subscription (same shape `seatSync.js` already manages) or a separate metered subscription** — affects both the Stripe setup and how `boxPlanUsage.js` would report to it. Not decided.
3. **The actual overage rate for AI-interaction volume** — `perActiveStudentMonthly`/`perActiveSeatMonthly` in `pricing.js` is priced for *seat* overage, not *interaction-volume* overage; reusing that number for interaction overage (as `computeTenantUsage`'s estimate currently does, for visibility only) is a placeholder, not a considered rate. Needs Sean's real pricing decision once actual usage data exists to price against.
4. **Reconcile `config/pricing.js` vs. `config/stripeBoxes.js`** — two sources of Box-plan truth today, one with allowance math and no live Stripe wiring, one with live Stripe wiring and no allowance math. Worth consolidating before this goes further, not urgent to block visibility shipping today.
5. **FERPA review of the report content and cadence** — the structural choice (aggregate-only, no per-student data) matches CODEX 76's original intent, but hasn't been reviewed by anyone beyond this session's own judgment call.
6. **Run this for at least one real billing cycle before deciding anything about UH Maui's annual-contract overage terms.** The whole point of building this now was to have real data before that conversation locks in a number — that data doesn't exist yet, and won't until this is deployed and a month passes.

---

## Cross-references

- `docs/codex/75-dpp-product-build-priorities.md` — where UH Maui pricing originated (base rate, included-allowance defaults — this CODEX doesn't change those numbers)
- `functions/functions/services/billing/boxPlanUsage.js` — the new interaction-tracking + usage-computation module
- `functions/functions/billing/resetMonthlyUsage.js` — extended with the monthly report pass
- `functions/functions/billing/seatSync.js` — the existing, correctly-working tenant-level seat billing this CODEX intentionally does not duplicate
- `functions/functions/config/pricing.js` / `functions/functions/config/stripeBoxes.js` — the two Box-plan config sources, not yet reconciled (§6 item 4)
