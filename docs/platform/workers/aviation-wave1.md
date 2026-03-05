# Aviation Vertical — Wave 1 Deep Specs

This document captures the full deep specification tables for all 7 Wave 1 aviation Digital Workers, including the build sequence, Vault data contracts, integration touchpoints, and edge cases.

---

## Build Sequence

Wave 1 workers are built in this order based on dependency chains:

| Order | Worker ID | Worker Name | Rationale |
|---|---|---|---|
| 1 | AV-013 | Mission Builder & Dispatch | Central hub — all other workers feed into or out of dispatch. Building this first establishes the Vault schema and data contracts. |
| 2 | AV-P01 | Digital Logbook | Consumer-facing, low-risk, validates blockchain architecture and Vault write patterns. Can be released independently. |
| 3 | AV-009 | Flight & Duty Time Enforcer | Core safety worker — must be operational before AV-032 can validate schedules. |
| 4 | AV-004 | Aircraft Status & MEL Tracker | Core safety worker — must be operational before AV-013 can validate aircraft for dispatch. |
| 5 | AV-014 | Flight Risk Assessment (FRAT) | Feeds into AV-013 dispatch gate. Requires AV-009 and AV-004 for auto-populated risk factors. |
| 6 | AV-032 | Crew Scheduling & Roster | Requires AV-009 for legality pre-validation. Aladtec integration decision must be resolved. |
| 7 | AV-029 | Alex (Chief of Staff) | Orchestrator — requires all other workers to be operational for meaningful cross-worker coordination. Unlocks at 3+ subscriptions. |

---

## Worker Deep Spec Tables

### AV-013 — Mission Builder & Dispatch

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-013 |
| **Name** | Mission Builder & Dispatch |
| **Price** | $99/mo |
| **Phase** | Wave 1 — Core Operations |
| **Worker Type** | Composite |
| **Core Function** | Assembles complete mission packages (aircraft, crew, weather, risk, patient/customer) and validates every element against regulations, company policies, and real-time Vault data before issuing dispatch authorization. |
| **Required Inputs** | mission_request, aircraft_selection, crew_roster, weather_briefing, frat_score |
| **Outputs** | av013-mission-brief, av013-dispatch-release, av013-crew-notification, av013-audit-record |
| **Vault Reads** | AV-004 aircraft_status, AV-009 crew_duty_status, AV-014 frat_scorecard, AV-032 crew_roster |
| **Vault Writes** | mission_record, dispatch_release, crew_notification, patient_record (encrypted) |
| **Tier 1 Regs** | 14 CFR 135.63 (recordkeeping), 135.83 (operating info), 135.117 (passenger info), 135.229 (airport requirements), HIPAA (medevac PHI), DOT 49 CFR 175 (hazmat), TSA (security), No Surprises Act (air ambulance cost estimates) |
| **Integrations** | ForeFlight (weather, NOTAMs), Aladtec (crew availability), Protean (patient tracking), Twilio (notifications), Firebase Auth, Ramco/FVO (aircraft data) |
| **Alex Interactions** | Sends: mission completion events, dispatch anomalies, CP override events. Receives: daily ops briefing context, cross-worker conflict alerts. |
| **Edge Cases** | FRAT threshold exceeded (CP override workflow), aircraft MEL restricts mission type (alternate aircraft search), crew duty insufficient (AV-032 swap trigger), LZ closed (alternate + ground transport coordination), medevac HIPAA boundary (no PHI in Alex briefings) |

### AV-009 — Flight & Duty Time Enforcer

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-009 |
| **Name** | Flight & Duty Time Enforcer |
| **Price** | $79/mo |
| **Phase** | Wave 1 — Core Safety |
| **Worker Type** | Standalone |
| **Core Function** | Single source of truth for crew legality. Enforces 14 CFR Part 135 flight time limitations, duty period restrictions, and rest requirements in real time. Prevents illegal assignments before they happen. |
| **Required Inputs** | pilot_id, proposed_assignment, duty_records, flight_time_records, rest_records |
| **Outputs** | av009-legality-determination, av009-duty-status-report, av009-override-log |
| **Vault Reads** | AV-013 mission_record, AV-032 crew_roster, AV-P01 flight_record |
| **Vault Writes** | crew_duty_status, legality_determination, override_log, compliance_report |
| **Tier 1 Regs** | 14 CFR 135.267 (duty limits — unscheduled), 135.265 (duty limits — scheduled), 135.271 (HEME/HEMS rest), 135.263 (cumulative limits), 91.1059 (fractional), FAA Order 8900.1 (inspection guidance) |
| **Integrations** | Aladtec (duty start/end times), ADP (payroll cross-reference), Firebase Auth |
| **Alex Interactions** | Sends: duty limit warnings, override events, compliance alerts. Receives: schedule change notifications for real-time recalculation. |
| **Edge Cases** | HEME exception (135.271 stricter rest for HEMS), mixed operation day (Part 91 + 135 — all time counts), international ICAO rules (flag but do not interpret), reserve pilot activation (duty starts at notification), pilot self-declaration of fatigue (record and remove from available status) |

### AV-004 — Aircraft Status & MEL Tracker

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-004 |
| **Name** | Aircraft Status & MEL Tracker |
| **Price** | $79/mo |
| **Phase** | Wave 1 — Core Safety |
| **Worker Type** | Standalone |
| **Core Function** | Real-time airworthiness visibility for every tail on the certificate. Tracks MEL deferrals, AD compliance, inspections, component life limits, and maintenance holds. |
| **Required Inputs** | aircraft_tail, mel_deferrals, maintenance_records, ad_status |
| **Outputs** | av004-airworthiness-brief, av004-mel-status, av004-maintenance-due |
| **Vault Reads** | AV-013 mission_record, AV-P01 flight_record |
| **Vault Writes** | aircraft_status, mel_status, maintenance_due, squawk_log |
| **Tier 1 Regs** | 14 CFR 135.65 (mechanical irregularity reporting), 135.411 (maintenance program applicability), 135.415 (mechanical interruption summary), 91.213 (inoperative equipment / MEL), FAA MEL Policy / MMEL |
| **Integrations** | Ramco (maintenance management — bidirectional), FVO (digital aircraft records — read-only), SharePoint/Dropbox (reference documents — read-only) |
| **Alex Interactions** | Sends: aircraft grounded alerts, MEL expiry warnings, inspection due alerts. Receives: mission completion events (to update aircraft hours). |
| **Edge Cases** | MEL expires during mission (flag before dispatch), CDL vs. MEL separate tracking, new squawk on return from maintenance (DOM review flag), ferry flight on MEL restriction (limited authorization for repositioning) |

### AV-014 — Flight Risk Assessment (FRAT)

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-014 |
| **Name** | Flight Risk Assessment (FRAT) |
| **Price** | $59/mo |
| **Phase** | Wave 1 — Safety Culture |
| **Worker Type** | Standalone |
| **Core Function** | Risk quantification that gates dispatch authorization. Pilots complete structured risk assessment; score determines mission authorization level (green/yellow/red/black). |
| **Required Inputs** | pilot_responses, mission_details, weather_data |
| **Outputs** | av014-frat-scorecard, av014-risk-breakdown, av014-mitigation-plan |
| **Vault Reads** | AV-009 crew_duty_status, AV-004 aircraft_status, AV-013 mission_record |
| **Vault Writes** | frat_scorecard, risk_breakdown, mitigation_plan, frat_trend_data |
| **Tier 1 Regs** | 14 CFR 135.267 (indirect — duty factors scored), FAA AC 120-92B (SMS), CAMTS (required FRAT for accredited operators), GOM FRAT provisions |
| **Integrations** | ForeFlight (weather auto-population), Firebase Auth (pilot/CP identity) |
| **Alex Interactions** | Sends: FRAT scores for daily briefing, CP override events, trend data for SMS reporting. Receives: mission details for context. |
| **Edge Cases** | Weather deteriorates post-submission (re-assessment recommended), CP override logging (immutable audit), international FRAT frameworks (flag, do not interpret), pressure to fly (mandatory CP notification regardless of score), multiple pilots with different scores (higher score governs) |

### AV-032 — Crew Scheduling & Roster

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-032 |
| **Name** | Crew Scheduling & Roster |
| **Price** | $79/mo |
| **Phase** | Wave 1 — Operations |
| **Worker Type** | Standalone |
| **Core Function** | Full crew scheduling lifecycle — schedule generation, legality pre-validation (via AV-009), qualification tracking, trade/giveaway processing, sick call replacement, and roster publication. |
| **Required Inputs** | scheduling_horizon, crew_availability, flight_schedule, qualification_data |
| **Outputs** | av032-published-roster, av032-conflict-report, av032-legality-summary |
| **Vault Reads** | AV-009 crew_duty_status, AV-009 legality_determination, AV-013 mission_record, AV-004 aircraft_status |
| **Vault Writes** | crew_roster, conflict_report, qualification_matrix, trade_log |
| **Tier 1 Regs** | 14 CFR 135.267 (duty limits validated via AV-009), 135.271 (HEMS rest), 135.99 (crew composition), 135.243 (PIC qualifications), 91.1 (general) |
| **Integrations** | Aladtec (crew scheduling — CRITICAL open decision on mode), ADP (payroll cross-reference), Twilio (schedule notifications), Firebase Auth |
| **Alex Interactions** | Sends: published rosters, scheduling conflicts, staffing warnings. Receives: mission schedule changes, crew availability updates. |
| **Edge Cases** | Aladtec integration mode (read-from vs. replace — per-operator decision), crew trade legality (check full horizon, not just traded shift), sick call replacement (minimum staffing enforcement, reserve activation), training event scheduling (balance training currency with operational needs) |

### AV-029 — Alex (Chief of Staff)

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-029 |
| **Name** | Alex (Chief of Staff) |
| **Price** | $0/mo (included, unlocks at 3+ subscriptions) |
| **Phase** | Wave 1 — Orchestration |
| **Worker Type** | Orchestrator (Composite) |
| **Core Function** | Cross-worker orchestration and escalation routing. Delivers daily ops briefing, routes safety alerts, detects cross-worker data conflicts, and ensures nothing falls through the cracks. Does NOT make operational decisions. |
| **Required Inputs** | vault_event_stream |
| **Outputs** | av029-daily-ops-briefing, av029-alert-log, av029-escalation-record |
| **Vault Reads** | AV-004 aircraft_status/maintenance_due, AV-009 crew_duty_status, AV-013 mission_record, AV-014 frat_scorecard/risk_breakdown, AV-032 crew_roster/conflict_report, AV-P01 flight_record |
| **Vault Writes** | daily_ops_briefing, alert_log, escalation_record |
| **Tier 1 Regs** | No direct regulatory authority. Obligations: accurate alert routing without suppression, HIPAA boundary enforcement (no PHI in briefings), immutable audit trail for all routing. |
| **Integrations** | Twilio (alert delivery), Firebase Auth (role-based routing). All other integrations are indirect via Vault. |
| **Alex Interactions** | N/A — Alex IS the orchestrator. Interacts with all other workers by reading their Vault writes and routing their alerts. |
| **Edge Cases** | Fewer than 3 workers (Alex not activated), customized name (display only, behavior unchanged), conflicting Tier 2 instructions (Tier 0 wins), multiple simultaneous escalations (safety > compliance > operational > admin), off-hours alerts (safety overrides quiet hours) |

### AV-P01 — Digital Logbook

| Attribute | Detail |
|---|---|
| **Worker ID** | AV-P01 |
| **Name** | Digital Logbook |
| **Price** | $0/mo (Free) / $19/mo (Pro) |
| **Phase** | Wave 1 — Consumer |
| **Worker Type** | Standalone |
| **Core Function** | Blockchain-verified personal flight record. Manual entry and auto-import from dispatch, with OCR scan import (Pro), cumulative totals, currency tracking, milestone alerts, and PRIA export (Pro). |
| **Required Inputs** | flight_entry |
| **Outputs** | avp01-flight-record, avp01-cumulative-totals, avp01-pria-export, avp01-blockchain-certificate |
| **Vault Reads** | AV-013 mission_record, AV-009 crew_duty_status |
| **Vault Writes** | flight_record, cumulative_totals, pria_export, blockchain_certificate |
| **Tier 1 Regs** | 14 CFR 61.51 (logbook requirements), 14 CFR 61.159 (ATP experience requirements), PRIA 49 USC 44703 (pilot records for employment) |
| **Integrations** | ForeFlight (flight track import), Firebase Auth, Blockchain/Venly (planned, simulated for now) |
| **Alex Interactions** | Sends: flight records for utilization metrics. Receives: N/A (personal tool, Alex interaction is limited to operator context). |
| **Edge Cases** | Photo scan OCR unreadable (reject below 40% confidence), duplicate import detection (side-by-side comparison), company vs. personal subscription merge (single logbook, tagged sources, stays with pilot on departure), PRIA release authorization (digital signature required, immutable audit), time zone handling (all times in UTC) |

---

## Pricing Summary

| Worker | Monthly Price | Notes |
|---|---|---|
| AV-013 Mission Builder | $99 | Composite — highest value, most integration points |
| AV-009 Flight & Duty Enforcer | $79 | Core safety — hard regulatory compliance |
| AV-004 Aircraft Status & MEL | $79 | Core safety — airworthiness tracking |
| AV-014 FRAT | $59 | Safety culture — risk quantification |
| AV-032 Crew Scheduling | $79 | Operations — requires Aladtec decision |
| AV-029 Alex (CoS) | $0 | Included — unlocks at 3+ worker subscriptions |
| AV-P01 Digital Logbook | $0 / $19 | Free tier + Pro tier for advanced features |
| **Total (all Wave 1)** | **$395/mo + $19 optional** | Not all operators need all workers |

## Typical Operator Bundles

| Operator Type | Recommended Workers | Monthly Cost |
|---|---|---|
| Small Part 135 (3-5 aircraft, charter) | AV-013, AV-009, AV-004, AV-014 | $316/mo + Alex (free) |
| HEMS Operator (medevac) | AV-013, AV-009, AV-004, AV-014, AV-032 | $395/mo + Alex (free) |
| Individual Pilot | AV-P01 (Pro) | $19/mo |
| Individual Pilot | AV-P01 (Free) | $0/mo |

---

## Cross-Worker Data Flow Diagram

```
                    AV-032 Crew Scheduling
                         |
                    crew_roster
                         |
                         v
AV-004 Aircraft  -->  AV-013 Mission Builder  <--  AV-014 FRAT
  Status & MEL       (Dispatch Hub)              (Risk Score)
       |                  |                          ^
  aircraft_status    mission_record            crew_duty_status
       |                  |                          |
       v                  v                     AV-009 Duty
  AV-029 Alex  <--  AV-P01 Logbook            Enforcer
  (Orchestrator)    (Personal Record)
       |
  daily_ops_briefing
  alert_log
  escalation_record
```

---

## Vault Collections (Aviation)

| Collection | Description | Written By | Read By |
|---|---|---|---|
| av_missions | Mission records with actual times and outcomes | AV-013 | AV-009, AV-004, AV-014, AV-029, AV-P01 |
| av_dispatch_releases | Formal dispatch authorization documents | AV-013 | Archive |
| av_crew_duty | Real-time duty time status per pilot | AV-009 | AV-013, AV-014, AV-029, AV-032 |
| av_legality_checks | Assignment legality determinations | AV-009 | AV-013, AV-032 |
| av_aircraft_status | Per-tail airworthiness status | AV-004 | AV-013, AV-029, AV-032 |
| av_mel_deferrals | Active MEL deferrals with deadlines | AV-004 | AV-013 |
| av_squawks | Mechanical irregularity log | AV-004 | AV-029 |
| av_frat_scores | Completed FRAT assessments | AV-014 | AV-013, AV-029 |
| av_crew_roster | Published crew schedules | AV-032 | AV-013, AV-009, AV-029 |
| av_flight_records | Personal flight time entries | AV-P01 | AV-009, AV-004 |
| av_alerts | Routed alerts and escalations | AV-029 | All users |
| av_briefings | Daily operations briefings | AV-029 | All users |
| av_patient_records | HIPAA-encrypted medevac patient data | AV-013 | Authorized users only |
| av_overrides | CP override events with justification | AV-009, AV-014 | AV-029, Archive |
