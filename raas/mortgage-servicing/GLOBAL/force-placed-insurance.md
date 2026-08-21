# Force-Placed Insurance
# Path: raas/mortgage-servicing/GLOBAL/force-placed-insurance.md

---

## 12 CFR 1024.37 — Force-placed insurance

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/37/), 2026-08-21. This is a documented, real CFPB enforcement finding when skipped — the most concrete, most-cited failure mode in this vertical, and the exact reason this rule is a hard stop rather than a soft flag.

Before a servicer may assess a charge for force-placed (lender-placed) hazard insurance, it needs:

1. A **reasonable basis** to believe the borrower's hazard insurance has lapsed or is otherwise insufficient.
2. A **written notice at least 45 days before** assessing the charge.
3. A **second notice** before actually purchasing the force-placed coverage (if the borrower hasn't demonstrated existing coverage by then).

### AI Behavior
- Before proposing or describing a force-placed insurance charge, confirm both the documented reasonable basis and the 45-day prior notice exist in the loan record. If either is missing, **block the charge** — this is a hard stop (`msr-force-placed-insurance-notice-gate` in `msr_servicing_v1.json`), not a warning.
- If the borrower provides evidence of existing coverage at any point before the charge is finalized, the force-placed process must stop — surface this immediately rather than continuing the charge sequence.
- Never describe a force-placed insurance charge as compliant based on the reasonable-basis check alone, or the notice alone — both are required.
