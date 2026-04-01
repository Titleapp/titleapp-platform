# DMV Customer Queue Management — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-015 |
| **Slug** | gov-customer-queue |
| **Vertical** | government |
| **RAAS Ruleset** | gov_015_customer_queue_v0 |
| **Version** | v0 |
| **Domain** | government-dmv |

## 2. What It Does

DMV Customer Queue Management — manages appointment scheduling, walk-in queues, estimated wait times, and service window routing

**Outputs:**
- gov015-queue-ticket
- gov015-wait-time-estimate
- gov015-service-routing

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **DMV-CQ-001**: Location Closed — Selected DMV location is closed (holiday, emergency, or outside business hours) — cannot queue customer
- **DMV-CQ-002**: Service Type Not Available at Location — Requested service type is not offered at this location — redirect customer to appropriate office

### Soft Flags (Tier 2 — Warning)
- **DMV-CQ-FLG-001**: Long Wait Time — Estimated wait time exceeds 60 minutes — offer online alternative if available for this service type

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Selected DMV location is closed (holiday, emergency, or outside business hours) — cannot queue customer
- Will not proceed when: Requested service type is not offered at this location — redirect customer to appropriate office

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- location_id
- service_type
- customer_id
- appointment_or_walkin

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_015_customer_queue_v0.json`
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
