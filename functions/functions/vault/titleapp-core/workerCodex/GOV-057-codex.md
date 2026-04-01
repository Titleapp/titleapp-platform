# Alex Government Chief of Staff — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-057 |
| **Slug** | gov-alex-government-cos |
| **Vertical** | government |
| **RAAS Ruleset** | gov_057_alex_government_cos_v0 |
| **Version** | v0 |
| **Domain** | government |

## 2. What It Does

Alex Government Chief of Staff — orchestrates cross-suite workflows, manages inter-department handoffs, tracks SLA compliance, and provides jurisdiction-wide analytics

**Outputs:**
- gov057-jurisdiction-dashboard
- gov057-sla-compliance-report
- gov057-cross-suite-workflow-log
- gov057-analytics-summary

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **GOV-COS-001**: Cross-Suite Data Sharing Without Authorization — A worker in one suite is attempting to access data from another suite without the required inter-departmental data sharing agreement on file
- **GOV-COS-002**: SLA Breach — Critical Process — A critical government process (title issuance, permit decision, recording) has exceeded its statutory or SLA deadline — immediate escalation required
- **GOV-COS-003**: Audit Trail Gap — A gap has been detected in the audit trail for a government transaction — all government actions must have complete, immutable audit records

### Soft Flags (Tier 2 — Warning)
- **GOV-COS-FLG-001**: Approaching SLA Warning Threshold — One or more processes are within 20% of their SLA deadline — proactive attention needed to avoid breach
- **GOV-COS-FLG-002**: Worker Utilization Imbalance — One suite has more than 3x the pending task volume of another suite — consider rebalancing workload or adding capacity

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: A worker in one suite is attempting to access data from another suite without the required inter-departmental data sharing agreement on file
- Will not proceed when: A critical government process (title issuance, permit decision, recording) has exceeded its statutory or SLA deadline — immediate escalation required
- Will not proceed when: A gap has been detected in the audit trail for a government transaction — all government actions must have complete, immutable audit records

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- workspace_id
- active_suites
- pending_tasks
- sla_targets

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_057_alex_government_cos_v0.json`
2. Add or modify hard_stops and soft_flags as needed
3. Run `POST /v1/admin:workers:sync` to propagate changes to Firestore
4. Changes take effect on next catalog cache refresh (5 minutes)

## 8. Version History

| Version | Date | Notes |
|---------|------|-------|
| v0 | 2026-04-01 | Recovered from RAAS rulesets — Session 43 |

## 9. Known Limitations

- Connectors not yet wired. Advisory Mode until documents uploaded.
- Required inputs are declared but not enforced at runtime (pending enforcement engine).
- Outputs are declared but document templates may not yet exist in the template registry.
- raasStatus set to `pending` — requires review before activation.
