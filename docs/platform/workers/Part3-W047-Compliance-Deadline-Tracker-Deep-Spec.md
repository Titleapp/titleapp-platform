# W-047 Compliance & Deadline Tracker | $39/mo
## Horizontal — All Phases | Standalone

**Headline:** "Never miss a deadline that costs you money"

## What It Does
Central compliance and deadline tracker across ALL workers and ALL phases. Aggregates deadlines from every worker, unified calendar view, multi-tier alerts, completion tracking, cross-worker conflict detection, compliance reports. The "connective tissue" worker.

## RAAS Tier 1 — Regulations
- **Statute of Limitations**: Mechanics lien deadlines (60-90 days by state), OSHA reporting (8hr fatality, 24hr hospitalization), tax filing deadlines, insurance claim notice periods.
- **Regulatory Reporting**: OSHA 300A annual posting (Feb 1-Apr 30), prevailing wage certified payroll, environmental monitoring, permit renewals.
- **Contractual Deadlines**: Termination notice periods, option exercise dates, rate lock expirations, earnest money hard dates, due diligence expirations.
- **Tax Deadlines**: Property tax payments, assessment appeals, tax credit compliance, 1031 exchange identification (45 days) and closing (180 days).

## RAAS Tier 2 — Company Policies
- alert_lead_times (default: 30/14/3 days), escalation_path, compliance_report_frequency (weekly default), missed_deadline_protocol

## Capabilities
1. **Unified Deadline Calendar** — Aggregate all deadlines from all workers. Color-coded by urgency and category (regulatory, contractual, financial, internal).
2. **Alert System** — Multi-tier: early warning, approaching, critical, overdue. Route to responsible party per escalation path.
3. **Compliance Dashboard** — Total deadlines (30/60/90 day view), overdue items, completion rate, risk items by category.
4. **Cross-Worker Conflict Detection** — Scheduling conflicts between workers: draw deadline requires inspection that hasn't been scheduled, insurance renewal expiring before next draw, etc.
5. **Regulatory Calendar** — Pre-built by jurisdiction: annual OSHA filings, property tax dates, permit renewals, insurance cycles.
6. **Compliance Reporting** — Status reports for lenders, investors, management showing all tracked obligations and status.

## Vault Data
- **Reads**: ALL workers. Key sources: W-021 (milestones), W-023 (draw dates), W-025 (insurance expirations), W-027 (inspection dates), W-028 (OSHA filings), W-044 (closing dates), W-045 (contract deadlines), W-017 (tax credit compliance)
- **Writes**: unified_deadline_calendar, compliance_dashboard, conflict_alerts → consumed by W-048 (Alex), all workers

## Referral Triggers
- Deadline approaching → route to responsible worker
- Cross-worker conflict → Alex (orchestration)
- Compliance report due to lender → W-015
- Compliance report due to investor → W-019
- Missed deadline with legal consequence → W-045

## Document Templates
1. ct-compliance-report (PDF)
2. ct-deadline-calendar (XLSX)
3. ct-conflict-report (PDF)
