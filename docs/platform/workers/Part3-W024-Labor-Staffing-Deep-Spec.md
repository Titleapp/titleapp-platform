# W-024 Labor & Staffing | $49/mo
## Phase 4 — Construction | Standalone

**Headline:** "Right crews, right certifications, right time"

## What It Does
Manages construction workforce — labor tracking, certified payroll for prevailing wage projects, apprenticeship compliance, workforce diversity reporting, crew scheduling, and training/certification management. Ensures labor compliance for government-funded and private projects.

## RAAS Tier 1 — Regulations
- **Davis-Bacon Act (Federal)**: For federally funded/assisted projects — prevailing wage rates by classification and county, fringe benefit requirements, weekly certified payroll submissions (WH-347), apprentice ratios. Hard stop: NEVER approve payroll that pays below prevailing wage rates on covered projects.
- **State Prevailing Wage**: Track state-specific prevailing wage laws (not all states have them). State rates may differ from federal. Some states cover projects state doesn't fund.
- **Apprenticeship Requirements**: Track apprentice-to-journeyman ratios per trade. Federal: registered apprenticeship programs only. Some states/projects have specific apprenticeship participation goals. IRA energy credits require apprenticeship compliance for bonus.
- **I-9 / E-Verify**: Track I-9 completion for all workers. E-Verify required for federal contractors (FAR 52.222-54) and many state/local projects.
- **FLSA**: Fair Labor Standards Act — overtime requirements (>40hrs/week = 1.5x), record keeping requirements, child labor restrictions.
- **EEO / OFCCP**: For federal contractors — EEO reporting, affirmative action requirements, OFCCP compliance. Track EEO-1 filings.
- **Worker Classification**: Track proper classification of workers as employees vs independent contractors. Misclassification carries severe penalties. IRS 20-factor test / ABC test (varies by state).

## RAAS Tier 2 — Company Policies
- prevailing_wage_applies: true/false per project
- diversity_goals: MBE/WBE/DBE/Section 3 participation targets
- overtime_approval: "pre_approved" | "supervisor_approval" | "auto"
- e_verify_required: true/false
- apprenticeship_program: Registered apprenticeship program affiliation

## Capabilities
1. **Certified Payroll** — Generate WH-347 certified payroll reports from time records. Validate rates against prevailing wage determinations. Flag underpayments.
2. **Workforce Tracking** — Track all workers on site: employer (GC/sub), trade classification, hours, certifications, training status. Daily headcount reporting.
3. **Certification Management** — Track worker certifications: OSHA 10/30, equipment operator, welding, crane signaler, forklift, confined space. Alert before expiration.
4. **Diversity Reporting** — Track workforce demographics for MBE/WBE/DBE/Section 3 compliance. Generate participation reports against project goals.
5. **Apprenticeship Tracking** — Track apprentice hours vs journeyman hours by trade. Ensure ratios comply with program requirements and project specifications.
6. **Crew Scheduling** — Coordinate crew needs with construction schedule (W-021). Flag when labor requirements exceed availability. Track overtime trends.

## Vault Data
- **Reads**: W-021 construction_schedule (labor needs by phase), W-022 subcontractor_registry (sub workforce)
- **Writes**: labor_roster, certified_payroll, workforce_reports, certification_status → consumed by W-028, W-023, W-039, W-047

## Referral Triggers
- Prevailing wage violation found → W-045 (legal exposure)
- Worker certification expired → W-028 (safety compliance)
- Overtime trending high → W-021 (schedule/budget impact)
- Diversity goals not met → W-047 (compliance tracking)
- Payroll data needed for draw → W-023
- Worker misclassification risk → W-045

## Document Templates
1. ls-certified-payroll (XLSX) — WH-347 format certified payroll
2. ls-workforce-report (PDF) — Daily/weekly workforce summary
3. ls-diversity-report (PDF) — MBE/WBE/DBE participation vs goals
4. ls-certification-tracker (XLSX) — All worker certifications with expiration dates
