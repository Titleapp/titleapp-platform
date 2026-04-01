# Permit Intake — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | GOV-016 |
| **Slug** | gov-permit-intake |
| **Vertical** | government |
| **RAAS Ruleset** | gov_016_permit_intake_v0 |
| **Version** | v0 |
| **Domain** | government-permitting |

## 2. What It Does

Permit Intake — validates building/trade permit applications, checks contractor licensing and insurance, enforces zoning and environmental prerequisites

**Outputs:**
- gov016-permit-application-receipt
- gov016-fee-calculation
- gov016-plan-review-checklist
- gov016-zoning-verification

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **PERM-R-001**: Missing Required Fields — Application is missing one or more required fields as defined by the application_type schema — cannot process incomplete submission
- **PERM-R-002**: Contractor License Expired — Contractor's state license has expired — unlicensed work is prohibited per state contractor licensing statute
- **PERM-R-003**: Contractor Insurance Expired — Contractor's general liability or workers' compensation insurance has lapsed — cannot issue permit without active coverage
- **PERM-R-004**: CO Requested Without Final Inspection — Certificate of Occupancy requested but no final inspection on record — CO cannot be issued per IBC 111.1
- **PERM-R-005**: Zoning Conflict — Proposed use or structure conflicts with current zoning designation — requires variance, conditional use permit, or rezoning before permit issuance
- **PERM-R-006**: Environmental Review Required But Not Filed — Project triggers NEPA/CEQA environmental review threshold but no review has been filed — cannot proceed without clearance
- **PERM-R-007**: Fee Not Paid — Permit application fee payment not confirmed — application cannot be accepted without payment

### Soft Flags (Tier 2 — Warning)
- **PERM-R-FLG-001**: High Valuation Project — Project valuation exceeds $500,000 — may trigger additional plan review requirements or impact fees
- **PERM-R-FLG-002**: Historic District Parcel — Parcel is located within a designated historic district — additional design review may be required

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Application is missing one or more required fields as defined by the application_type schema — cannot process incomplete submission
- Will not proceed when: Contractor's state license has expired — unlicensed work is prohibited per state contractor licensing statute
- Will not proceed when: Contractor's general liability or workers' compensation insurance has lapsed — cannot issue permit without active coverage
- Will not proceed when: Certificate of Occupancy requested but no final inspection on record — CO cannot be issued per IBC 111.1
- Will not proceed when: Proposed use or structure conflicts with current zoning designation — requires variance, conditional use permit, or rezoning before permit issuance
- Will not proceed when: Project triggers NEPA/CEQA environmental review threshold but no review has been filed — cannot proceed without clearance
- Will not proceed when: Permit application fee payment not confirmed — application cannot be accepted without payment

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- application_type
- parcel_number
- applicant_name
- valuation
- description
- payment_intent_id

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/gov_016_permit_intake_v0.json`
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
