# Recording Monitor — Worker Codex

## 1. Identity

| Field | Value |
|-------|-------|
| **Worker ID** | ESC-011 |
| **Slug** | esc-recording-monitor |
| **Vertical** | re_professional |
| **RAAS Ruleset** | esc_011_recording_monitor_v0 |
| **Version** | 0.1.0 |
| **Domain** | title_escrow |

## 2. What It Does

Recording Monitor — tracks document recording with county recorder offices, monitors e-recording submissions, confirms recording numbers, and blocks DTC transfer until recording is confirmed. Handles recording rejections and document corrections.

**Outputs:**
- tracker_id
- recording_status
- confirmation_number
- dtc_transfer_status

## 3. What Rules It Compiled

### Hard Stops (Tier 1 — Blocking)
- **ESC-RM-001**: Recording Rejected Hold And Notify — Document was rejected by the county recorder — hold transaction and notify all parties for correction and resubmission.
- **ESC-RM-002**: Recording Not Confirmed Block DTC Transfer — Recording has not been confirmed by the county — block DTC transfer until confirmation number is received.
- **ESC-RM-003**: DTC Transfer Without Recording Block — DTC transfer was initiated without a confirmed recording — block transfer immediately.

### Soft Flags (Tier 2 — Warning)
- **ESC-RM-FLG-001**: Recording Delayed — Recording has been pending longer than expected for the jurisdiction — flag for follow-up.
- **ESC-RM-FLG-002**: E-Recording Unavailable — Jurisdiction does not support e-recording — flag for manual recording process.
- **ESC-RM-FLG-003**: Document Correction Needed — Document requires correction before recording can be accepted — flag for preparation of corrective instrument.

### Advisory (Tier 3)
- No tier 3 rules defined in this version.

## 4. What Connectors It Uses

- None wired yet. Connector integration pending.

## 5. What It Won't Do

- Will not proceed when: Document was rejected by the county recorder — hold transaction and notify all parties for correction and resubmission.
- Will not proceed when: Recording has not been confirmed by the county — block DTC transfer until confirmation number is received.
- Will not proceed when: DTC transfer was initiated without a confirmed recording — block transfer immediately.

## 6. Studio Locker Requirements

**Required for Pro Mode:**
- locker_id
- document_type
- recording_jurisdiction

**Recommended Documents:**
- Jurisdiction-specific regulatory documentation
- Agency policy manuals

**Advisory Mode Message:**
> Upload your jurisdiction documents and policy manuals to activate Pro Mode.

## 7. How to Update

1. Edit the RAAS ruleset at `raas/rulesets/esc_011_recording_monitor_v0.json`
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
