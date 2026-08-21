# Early Intervention & Loss Mitigation
# Path: raas/mortgage-servicing/GLOBAL/early-intervention-loss-mitigation.md

---

## 12 CFR 1024.39 — Early intervention requirements for certain borrowers

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/39/) and [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.39), 2026-08-21.

**Two independent triggers — track them separately, never as one deadline:**

1. **Live contact** — a good-faith effort to establish live contact with a delinquent borrower no later than the **36th day of delinquency**, and again every 36 days while the delinquency continues. Purpose: inform the borrower of loss-mitigation options.
2. **Written notice** — a separate written notice no later than the **45th day of delinquency**, repeated at least once every 180 days while the delinquency continues.

A servicer who completes the day-36 live-contact attempt has **not** thereby satisfied the day-45 written-notice requirement. These are two different obligations with two different clocks.

### AI Behavior
- When reporting early-intervention status on a delinquent loan, state the live-contact deadline/status AND the written-notice deadline/status **separately**, each computed from the loan's actual delinquency start date.
- Never describe early-intervention compliance as "complete" or "satisfied" based on only one of the two triggers.
- If the delinquency start date is missing from the record, say so — do not estimate either deadline.

---

## 12 CFR 1024.41(c) — Loss mitigation, evaluate for all available options

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/41/) and [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.41), 2026-08-21.

A servicer receiving a **complete** loss-mitigation application must evaluate the borrower for every loss-mitigation option available to them, subject to narrow exceptions in (c)(2)(ii)/(iii)/(v) (e.g., the borrower already accepted an offer, or the servicer already evaluated a substantially similar application).

### AI Behavior
- The AI computes and surfaces eligibility indicators against each available option — it does **not** issue the modification/forbearance/repayment-plan decision itself. That is an authorized human servicing decision. See `msr_servicing_v1.json`'s `msr-no-unilateral-modification-decision` hard stop.
- When describing "evaluated for all options," confirm every option the servicer actually offers was checked — do not describe a partial evaluation as complete.
- Completeness of the application itself (what documents/information make an application "complete" under this section) must be confirmed against the servicer's own documented completeness checklist, not inferred.
