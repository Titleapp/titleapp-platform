# Early Intervention & Loss Mitigation
# Path: raas/mortgage-servicing/GLOBAL/early-intervention-loss-mitigation.md

---

## 12 CFR 1024.39 — Early intervention requirements for certain borrowers

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/39/) and [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.39), 2026-08-21; subsection-level re-check 2026-08-21 after a red-team pass caught the "180 days" figure being presented as if independently sourced when it isn't.

**Two independent triggers, in two different subsections — track them separately, never as one deadline:**

1. **Live contact — §1024.39(a).** A good-faith effort to establish live contact with a delinquent borrower no later than the **36th day of delinquency**, and again every 36 days while the delinquency continues. Purpose: inform the borrower of loss-mitigation options.
2. **Written notice — §1024.39(b)(1).** A separate written notice no later than the **45th day of delinquency**. This same subsection also sets the recurrence cadence: the servicer isn't required to send it more than once in any 180-day period, and must send it again no later than 180 days after the prior notice if the borrower is still delinquent. The 180-day figure is **not** a separately-citable subsection — it's part of (b)(1) itself, same as the 45-day trigger.

A servicer who completes the day-36 live-contact attempt has **not** thereby satisfied the day-45 written-notice requirement. These are two different obligations with two different clocks.

### AI Behavior
- When reporting early-intervention status on a delinquent loan, state the live-contact deadline/status AND the written-notice deadline/status **separately**, each computed from the loan's actual delinquency start date.
- Never describe early-intervention compliance as "complete" or "satisfied" based on only one of the two triggers.
- If the delinquency start date is missing from the record, say so — do not estimate either deadline.

---

## 12 CFR 1024.41(b)(1) and (c)(1) — Loss mitigation, evaluate for all available options

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/41/) and [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.41), 2026-08-21; subsection-level re-check 2026-08-21.

"Complete application" is defined in **§1024.41(b)(1)**, not in (c) — check completeness against that definition specifically, not a servicer's own informal checklist. The evaluate-all-options mandate itself is **§1024.41(c)(1)**: a servicer receiving a complete application more than 37 days before a scheduled foreclosure sale must evaluate the borrower for every loss-mitigation option available to them, within a 30-day evaluation window, subject to narrow exceptions in **(c)(2)(ii)/(iii)/(v)** (e.g., incomplete-application diligence, short-term forbearance/repayment on an incomplete application, COVID-era options). **Note: (c)(2)(i) is an anti-evasion prohibition, not an exception — never cite it as grounds to skip evaluation.**

### AI Behavior
- The AI computes and surfaces eligibility indicators against each available option — it does **not** issue the modification/forbearance/repayment-plan decision itself. That is an authorized human servicing decision. See `msr_servicing_v1.json`'s `msr-no-unilateral-modification-decision` hard stop.
- When describing "evaluated for all options," confirm every option the servicer actually offers was checked — do not describe a partial evaluation as complete.
- Completeness of the application itself is a §1024.41(b)(1) determination — confirmed against that definition, not inferred from a servicer's own informal checklist.
- See `msr_servicing_v1.json`'s `hard_stops` — the ruleset's own `system_context` is where this is instructed to the model; as of this pass, that's a prompt instruction, not a server-side block (CODEX S52.60 §3.1).
