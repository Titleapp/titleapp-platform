# CODEX 76 — Institution-Level Overage Billing + Anticipated-vs-Actual Usage Reporting

**Status:** SPEC — notes for implementation, nothing built yet
**Applies to:** Both "Box" plans — Business in a Box (`businessInABox`, per-seat) and Academia in a Box (`education`, per-student) — same underlying gap, same fix, written once.
**Date:** 2026-08-24
**Trigger:** Surfaced while pricing the University of Hawaii Maui College nursing-education deal (CODEX 75). The contract needs to say the institution — not individual students or employees — absorbs any usage beyond the included allowance. The platform's actual billing code doesn't support that yet. Sean's explicit direction: (1) institution/business pays overage, never the individual seat-holder; (2) SOCIII does not subsidize usage — overage must be billed at the real rate, not absorbed; (3) heavy usage is a good sign, not a problem — frame it with a recurring anticipated-vs-actual usage report, not a punitive surprise invoice.

---

## 1. The gap, precisely

`config/pricing.js` already anticipates this — both Box configs have an `overagePaidBy` field:

```js
businessInABox: { ..., overagePaidBy: "seat" }       // the seat-holder's own credits pay overage
education:      { ..., overagePaidBy: "student", ... } // comment: "institution" pool optional
```

But `functions/functions/billing/trackUsage.js` — the actual function that checks and bills overage — only implements the individual path:

```js
} else if (userData.stripeMeteredItemId) {
  // reports usage to the INDIVIDUAL USER's own Stripe metered item
}
```

There is no code branch that reads `overagePaidBy`, and no code path that reports usage to a *tenant-level* Stripe metered item. The config field is documentation of intent, not a working option. This is the actual gap to close — not a new feature so much as finishing one that's already half-designed.

---

## 2. What already exists that this can build on

Don't build this from scratch — reuse two things that are already real and working:

- **`functions/functions/billing/seatSync.js`** — quarterly job that reconciles a tenant's active seat count against `tenants/{tenantId}.boxPlanStripeSubscriptionId`, and already knows how to push a quantity update to a Stripe subscription item on the tenant's own subscription (not an individual user's). This is the existing pattern for "the tenant, not the user, has a Stripe billing relationship for Box plans" — the overage fix should follow the same shape, not invent a new one.
- **`functions/functions/billing/resetMonthlyUsage.js`** — scheduled monthly job (1st of month) that already iterates every user with `usageThisMonth > 0`, archives to `usageHistory`, and resets counters. This is the natural hook point for both the institution-overage rollup *and* the usage report in §4 — both need the same per-tenant aggregation, computed at the same time.

---

## 3. Design: institution-level overage billing

1. **Add a real `overagePaidBy: "institution"` branch to `trackUsage.js`** (or wherever the overage-reporting call lives — confirm current call site before implementing, `trackUsage.js` may have moved/split since this was written). When a user's tenant is configured this way, look up the *tenant's* metered Stripe item — not the user's personal one.
2. **Add `overageStripeMeteredItemId` (or equivalent) to the `tenants/{tenantId}` doc**, set up alongside the existing `boxPlanStripeSubscriptionId` at onboarding (same subscription, an additional metered line item — or a second subscription item on the same Stripe subscription `seatSync.js` already manages, whichever is cleaner against the existing Stripe product setup in `stripeProducts`/`stripeMeters` in `config/pricing.js`).
3. **Per-call overage reporting stays real-time** (same as today — a call happens, allowance is checked, overage is reported to Stripe metering immediately) — only the *destination* of the metered event changes (tenant's item vs. user's item). No batching needed for the billing mechanism itself.
4. **This one implementation covers both plans.** `businessInABox` and `education` share the identical shape (`basePriceMonthly`, `includedSeats`/`includedStudents`, `perActiveSeatMonthly`/`perActiveStudentMonthly`, `includedCreditsPerSeat`/`includedCreditsPerStudent`, `overagePaidBy`) — write the fix generically against "tenant + active-member count + per-member included allowance," not education-specific or business-specific code.
5. **No individual seat-holder or student is ever billed directly** once `overagePaidBy: "institution"` is set for a tenant — remove/bypass the `prepaidCredits`/personal-`stripeMeteredItemId` fallback entirely for these tenants, don't just deprioritize it.

---

## 4. Design: anticipated-vs-actual usage reporting

This is a product requirement, not just a billing fix — Sean's framing: **heavy usage is success, not a problem, and should be reported that way.**

**Cadence:** start at monthly, piggybacking on the existing `resetMonthlyUsage.js` cycle (already computing per-user monthly totals at the right moment) — add weekly as a fast-follow once the monthly version is real, rather than building three cadences (daily/weekly/monthly) at once. Sean asked about all three; recommend not over-building before the first version proves useful.

**Content, per tenant, per period:**
- Included allowance for the period (active-member count × per-member included credits, from `config/pricing.js`)
- Actual usage for the period (sum of `usageThisMonth`/`usageHistory` across the tenant's active members)
- Delta, framed positively when usage is high (e.g., "your students used 40% more tutoring interactions than included this month — this reflects strong engagement with Hannah") rather than as a warning
- Any resulting overage charge, shown transparently and tied to the same numbers — never a surprise line item disconnected from a number the institution has already seen
- Per-member breakdown available on request, not necessarily in the default summary (avoid over-surfacing individual student data in a routine report — FERPA-conscious by default, aggregate first)

**Delivery:** an email to the tenant's designated contact (for UH, that's Anne) is the minimum viable version — reuses existing email-sending infrastructure, no new UI required to ship v1. A dashboard view is a reasonable v2, not a blocker for v1.

**Where this plugs in:** extend `resetMonthlyUsage.js`'s existing per-tenant aggregation (or a new function alongside it, sharing its query pattern) — it already has the exact data (per-user usage for the closing month) that both the overage calculation in §3 and the report in this section need. Compute both from one pass, don't duplicate the aggregation logic.

---

## 5. Open items for whoever implements this

1. Confirm `trackUsage.js` is still the current call site for per-call overage checks — this session read it as of 2026-08-24, functions may have moved since.
2. Decide whether the institution's overage Stripe item is a new line item on the *same* subscription `seatSync.js` already manages, or a separate metered subscription — affects both `config/pricing.js`'s `stripeProducts`/`stripeMeters` setup and `seatSync.js` itself.
3. Confirm email delivery mechanism/template system to reuse for the usage report (don't build new email infrastructure if something adequate exists).
4. This CODEX doesn't change the base per-member price or the included-allowance defaults in `config/pricing.js` — that's CODEX 75's territory (the UH-specific 300-unit/student estimate). This CODEX only fixes *who gets billed* for overage and *how it's reported*, generically, for any tenant on either Box plan.
