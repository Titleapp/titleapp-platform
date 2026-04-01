# Elevator Inspector — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-037 |
| **Slug** | gov-elevator-inspector |
| **Vertical** | government |
| **RAAS Ruleset** | gov_037_elevator_inspector_v0 |
| **Version** | v0 |
| **Domain** | government-inspector |

## 2. What It Does

Elevator Inspector — inspects elevators, escalators, and conveyances for ASME A17.1 compliance, annual certifications, and safety device testing

**Outputs:**
- gov037-elevator-inspection-report
- gov037-operating-certificate
- gov037-violation-notice
- gov037-test-certification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **INSP-EV-001**: Safety Device Test Failed — Governor, safeties, or buffers failed the required Category 1 or Category 5 test — elevator must be taken out of service
- **INSP-EV-002**: Emergency Communication Inoperative — Elevator emergency phone or two-way communication device is not operational — ADA and ASME A17.1 2.27.1.1 violation
- **INSP-EV-003**: Annual Certification Expired — Elevator annual operating certificate has expired — conveyance cannot be operated until re-inspected and certified

### Soft Flags (Tier 2 — Warning)
- **INSP-EV-FLG-001**: Five-Year Full Load Test Due — Elevator is due for the 5-year full load safety test per ASME A17.1 — schedule with elevator contractor

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Governor, safeties, or buffers failed the required Category 1 or Category 5 test — elevator must be taken out of service
- Will not proceed when: Elevator emergency phone or two-way communication device is not operational — ADA and ASME A17.1 2.27.1.1 violation
- Will not proceed when: Elevator annual operating certificate has expired — conveyance cannot be operated until re-inspected and certified

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- conveyance_id
- inspection_type
- inspector_id
- gps_coordinates
- test_results

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_037_elevator_inspector_v0.json`
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
