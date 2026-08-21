# Force-Placed Insurance
# Path: raas/mortgage-servicing/GLOBAL/force-placed-insurance.md

---

## 12 CFR 1024.37 — Force-placed insurance

Verified against [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/37/), 2026-08-21; subsection-level re-check 2026-08-21. This is a documented, real CFPB enforcement finding when skipped — the most concrete, most-cited failure mode in this vertical, and the exact reason this rule is a hard stop rather than a soft flag.

Before a servicer may assess a charge for force-placed (lender-placed) hazard insurance, it needs:

1. **§1024.37(b)** — A **reasonable basis** to believe the borrower's hazard insurance has lapsed or is otherwise insufficient.
2. **§1024.37(c)(1)(i)** — A **written notice at least 45 days before** assessing the charge.
3. **§1024.37(d)(1)** — A **second notice at least 15 days before** the charge is actually assessed (referencing the content requirements of (c)(1)(ii)) — a distinct 15-day deadline of its own, not a loose "before purchase" requirement.

### AI Behavior
- Before proposing or describing a force-placed insurance charge, confirm the documented reasonable basis (b), the 45-day notice (c)(1)(i), AND the 15-day second notice (d)(1) all exist in the loan record. If any is missing, **block the charge** — this is a hard stop (`msr-force-placed-insurance-notice-gate` in `msr_servicing_v1.json`), not a warning. As of this pass, "block" means a prompt-level instruction to the model, not a server-side mechanical block — see CODEX S52.60 §3.1.
- If the borrower provides evidence of existing coverage at any point before the charge is finalized, the force-placed process must stop — surface this immediately rather than continuing the charge sequence.
- Never describe a force-placed insurance charge as compliant based on any one of the three requirements alone — all three (reasonable basis, 45-day notice, 15-day second notice) are required.
