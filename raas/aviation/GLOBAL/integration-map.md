# Aviation Vertical — External System Integration Map

This document catalogs every external system integration touchpoint for the aviation Digital Worker vertical. Each integration lists the workers that connect to it, the integration mode, data flow direction, and any open decisions.

---

## 1. Aladtec (Crew Scheduling)

| Attribute | Detail |
|---|---|
| **System** | Aladtec — web-based crew scheduling for EMS, fire, and public safety |
| **Workers** | AV-032 (Crew Scheduling), AV-009 (Flight & Duty Enforcer, indirect via AV-032) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Bidirectional (mode-dependent) |
| **What Flows** | Crew schedules, shift assignments, availability, time-off requests, trade/giveaway records |
| **Open Decision** | **CRITICAL**: Read-from mode vs. Replace mode. Option A (read-from): Aladtec remains the scheduling source of truth; AV-032 reads the schedule and layers legality validation, qualification tracking, and enhanced reporting on top. Option B (replace): TitleApp AV-032 becomes the primary scheduling system; Aladtec is either deprecated or receives a read-only push for legacy visibility. This is a per-operator decision and must be resolved during onboarding. |
| **Authentication** | API key (Aladtec provides per-account) |
| **Rate Limits** | TBD — Aladtec API documentation needed |

## 2. Ramco (Aircraft Maintenance)

| Attribute | Detail |
|---|---|
| **System** | Ramco Aviation MRO Suite — maintenance, repair, and overhaul management |
| **Workers** | AV-004 (Aircraft Status & MEL) |
| **Integration Mode** | API (REST/SOAP — Ramco supports both) |
| **Data Flow** | Bidirectional |
| **What Flows** | Inbound: maintenance events, component tracking, work orders, AD compliance status, inspection records. Outbound: squawk reports from flight crews (if AV-004 is the initial squawk intake point). |
| **Open Decision** | Two-way sync scope: if Ramco is the MRO's system of record, do we push squawks to Ramco and let Ramco manage the work order lifecycle, or does AV-004 maintain a parallel squawk tracker? Recommendation: Ramco is authoritative for maintenance execution; AV-004 is authoritative for dispatch-facing airworthiness status. |
| **Authentication** | OAuth 2.0 (Ramco enterprise) |
| **Rate Limits** | Standard Ramco API tier — typically 1000 req/hr |

## 3. FVO (FlightVaultOnline)

| Attribute | Detail |
|---|---|
| **System** | FlightVaultOnline — digital aircraft records and logbook management |
| **Workers** | AV-004 (Aircraft Status & MEL), AV-P01 (Digital Logbook, indirect) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Inbound (read-only) |
| **What Flows** | Aircraft logbook entries, AD compliance documents, component time tracking, maintenance history |
| **Open Decision** | None — FVO is read-only for records verification and historical data import. |
| **Authentication** | API key per operator account |
| **Rate Limits** | TBD — FVO API documentation needed |

## 4. ForeFlight (Flight Planning & Weather)

| Attribute | Detail |
|---|---|
| **System** | ForeFlight — EFB (Electronic Flight Bag) for flight planning, weather, and navigation |
| **Workers** | AV-013 (Mission Builder), AV-014 (FRAT), AV-P01 (Digital Logbook) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Inbound |
| **What Flows** | AV-013: weather briefings (METAR, TAF, area forecast), NOTAMs, route planning data. AV-014: weather data for auto-populated FRAT risk factors. AV-P01: flight track data (GPS track logs) for auto-populating logbook entries with route, times, and approaches. |
| **Open Decision** | ForeFlight API access requires a ForeFlight Business or Enterprise subscription. Confirm that target operators have the appropriate ForeFlight subscription tier. Alternative weather sources (1800wxbrief, aviationweather.gov) should be supported as fallback. |
| **Authentication** | OAuth 2.0 (ForeFlight user authorization per pilot) |
| **Rate Limits** | ForeFlight Business API — standard rate limits apply |

## 5. Protean (Patient Tracking — Medevac)

| Attribute | Detail |
|---|---|
| **System** | Protean — patient tracking, billing, and transport management for air ambulance |
| **Workers** | AV-013 (Mission Builder) |
| **Integration Mode** | API (HL7 FHIR preferred, REST fallback) |
| **Data Flow** | Bidirectional |
| **What Flows** | Inbound: patient pickup requests, facility information, insurance data. Outbound: ETA notifications, transport confirmations, billing data, completion records. |
| **Open Decision** | HIPAA BAA required before any patient data flows. Protean integration must be configured with encryption in transit and at rest. PHI must never be stored in standard Vault collections — dedicated encrypted collection required. |
| **Authentication** | OAuth 2.0 with HIPAA-compliant token handling |
| **Rate Limits** | TBD — Protean API documentation needed |

## 6. SharePoint (Document Storage)

| Attribute | Detail |
|---|---|
| **System** | Microsoft SharePoint — document management and storage |
| **Workers** | AV-004 (Aircraft Status & MEL) |
| **Integration Mode** | API (Microsoft Graph API) |
| **Data Flow** | Inbound (read-only) |
| **What Flows** | MEL pages, AD compliance documents, maintenance records, operator manuals, GOM sections |
| **Open Decision** | None — read-only reference document access. Some operators may use SharePoint, others Dropbox or Google Drive. The integration should be abstracted to support multiple document storage backends. |
| **Authentication** | OAuth 2.0 (Microsoft identity platform) |
| **Rate Limits** | Microsoft Graph API standard throttling |

## 7. ADP (Payroll & HR)

| Attribute | Detail |
|---|---|
| **System** | ADP Workforce Now — payroll, HR, and time tracking |
| **Workers** | AV-009 (Flight & Duty Enforcer), AV-032 (Crew Scheduling) |
| **Integration Mode** | API (ADP Marketplace API) |
| **Data Flow** | Inbound (read-only) |
| **What Flows** | AV-009: payroll flight hours for cross-reference with duty records (reconciliation). AV-032: scheduled hours for overtime calculation awareness. |
| **Open Decision** | ADP integration is low priority for MVP. Most operators will manually reconcile payroll hours. Include in Phase 2 or later. |
| **Authentication** | OAuth 2.0 (ADP Marketplace) |
| **Rate Limits** | ADP standard API rate limits |

## 8. Dropbox Sign (Electronic Signatures)

| Attribute | Detail |
|---|---|
| **System** | Dropbox Sign (formerly HelloSign) — electronic signature |
| **Workers** | AV-P01 (Digital Logbook — PRIA authorization), AV-013 (Mission Builder — dispatch release acknowledgment) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Bidirectional |
| **What Flows** | Outbound: documents requiring signature (PRIA authorization, dispatch acknowledgments, training sign-offs). Inbound: signed document status, signature timestamps, audit trail. |
| **Open Decision** | Dropbox Sign vs. DocuSign vs. native digital signature. For MVP, PRIA authorization uses an in-app authenticated action (not a full e-signature workflow). E-signature integration is a Phase 2 item per the Document Engine roadmap. |
| **Authentication** | OAuth 2.0 |
| **Rate Limits** | Dropbox Sign API standard rate limits |

## 9. Twilio (Communications)

| Attribute | Detail |
|---|---|
| **System** | Twilio — SMS, voice, and messaging |
| **Workers** | AV-013 (Mission Builder), AV-029 (Alex), AV-032 (Crew Scheduling) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Outbound |
| **What Flows** | AV-013: crew notifications for mission assignments, customer/patient ETA notifications. AV-029: alert escalation SMS/voice, daily briefing delivery. AV-032: schedule change notifications, trade approvals, sick call alerts, shift reminders. |
| **Open Decision** | None — Twilio is the platform-standard communications provider. Already integrated at the platform level. Aviation workers use the existing Twilio infrastructure. |
| **Authentication** | Twilio Account SID + Auth Token (platform-level, shared across verticals) |
| **Rate Limits** | Twilio standard rate limits per account tier |

## 10. Firebase Auth (Authentication)

| Attribute | Detail |
|---|---|
| **System** | Firebase Authentication — identity and access management |
| **Workers** | All aviation workers |
| **Integration Mode** | SDK (Firebase Admin SDK) |
| **Data Flow** | Bidirectional |
| **What Flows** | User authentication, role verification (CP, DOM, scheduler, pilot), tenant scoping, session management |
| **Open Decision** | None — Firebase Auth is the platform standard. Aviation workers use existing Firebase Auth infrastructure with aviation-specific custom claims for role-based access (e.g., chief_pilot, dom, scheduler). |
| **Authentication** | Firebase Admin SDK service account |
| **Rate Limits** | Firebase Auth standard limits |

## 11. Stripe (Billing)

| Attribute | Detail |
|---|---|
| **System** | Stripe — subscription billing and payment processing |
| **Workers** | All aviation workers (subscription management), AV-P01 (free vs. Pro tier gating) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Bidirectional |
| **What Flows** | Subscription status, tier (free/Pro), payment events, worker activation/deactivation based on subscription status |
| **Open Decision** | None — Stripe is the platform standard for billing. Aviation worker subscriptions use the existing Stripe integration. AV-P01 free tier requires special handling (no Stripe subscription required for free features). |
| **Authentication** | Stripe API key (platform-level) |
| **Rate Limits** | Stripe standard rate limits |

## 12. Wearable API (AR/MR Glasses)

| Attribute | Detail |
|---|---|
| **System** | Wearable AR/MR glasses — visual query and HUD overlay |
| **Workers** | AV-004 (preflight), AV-006/007 (maintenance, future), AV-034 (LZ intel, future), AV-029 (voice query) |
| **Integration Mode** | API (REST) — STUB ONLY |
| **Data Flow** | Bidirectional |
| **What Flows** | Inbound: camera frames, GPS coordinates, worker context. Outbound: HUD overlay data, Vault context, approval prompts. |
| **Open Decision** | **NOT IMPLEMENTED**. See WEARABLE-STUB.md for architecture reservation and open questions for Ron Palmeri. First demo targets property inspection, not aviation. |
| **Authentication** | Session token (TBD) |
| **Rate Limits** | TBD |

## 13. Blockchain (Venly — Planned)

| Attribute | Detail |
|---|---|
| **System** | Venly — blockchain infrastructure for digital asset management |
| **Workers** | AV-P01 (Digital Logbook — flight record certification) |
| **Integration Mode** | API (REST) |
| **Data Flow** | Outbound |
| **What Flows** | Flight record hashes for blockchain anchoring. The hash proves the record existed at a specific point in time and has not been modified. |
| **Open Decision** | Currently using simulated blockchain hashes per platform architecture decision. Venly integration is planned for production but not yet implemented. Timeline depends on platform-level blockchain infrastructure decisions. |
| **Authentication** | Venly API key (TBD) |
| **Rate Limits** | Venly standard rate limits |

---

## Integration Priority Matrix

| Priority | Integration | Workers | MVP Required | Notes |
|---|---|---|---|---|
| P0 | Firebase Auth | All | Yes | Platform standard, already integrated |
| P0 | Stripe | All | Yes | Platform standard, already integrated |
| P0 | Twilio | AV-013, AV-029, AV-032 | Yes | Platform standard, already integrated |
| P1 | Aladtec | AV-032 | Yes (read-from mode) | Critical for crew scheduling — open decision on mode |
| P1 | ForeFlight | AV-013, AV-014, AV-P01 | Yes | Weather data and flight planning are core to dispatch |
| P2 | Ramco | AV-004 | No | Phase 2 — manual data entry for MVP |
| P2 | FVO | AV-004 | No | Phase 2 — manual data entry for MVP |
| P2 | Protean | AV-013 | No | Phase 2 — medevac-specific, not all operators need this |
| P3 | ADP | AV-009, AV-032 | No | Phase 3 — payroll reconciliation is nice-to-have |
| P3 | SharePoint | AV-004 | No | Phase 3 — document reference, not operational |
| P3 | Dropbox Sign | AV-P01, AV-013 | No | Phase 3 — per Document Engine roadmap |
| Future | Wearable API | AV-004, AV-029 | No | Stub only — pending Ron Palmeri input |
| Future | Blockchain (Venly) | AV-P01 | No | Simulated for now — pending platform decision |
