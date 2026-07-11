# CODEX 32 — EU Registry Manager: DPP Central Registry Operations

**Status:** SPEC — activates after 19 July 2026 (EU DPP Central Registry goes live)  
**Suite:** EU DPP · Worker 4 of 5  
**Slug:** `eu-registry-manager-001`  
**Regulation anchor:** EU Battery Regulation 2023/1542, Articles 77–78 (battery passport registration)  
**Activation date:** 19 July 2026 (registry opens); required by 18 Feb 2027

---

## 1. What This Worker Does

The EU DPP Central Registry is the government system that issues official passport IDs and makes passports accessible via QR code to anyone along the supply chain. The Passport Builder generates the file; the Registry Manager handles the live relationship with the registry — submissions, status tracking, amendments, and renewals.

This worker is separate from the Passport Builder because the registry relationship is ongoing: passports must be updated when lifecycle data changes (SoH degrades, battery is repurposed, etc.), and the registry API requires authentication, allowlisting, and error handling that warrants its own dedicated worker.

**EU registry access requires prior government allowlisting.** Third-party submitters (advisors, platforms) must register with the EU Commission's registry operator before submission is possible. This process should be started as soon as the registry opens on 19 July 2026.

---

## 2. Worker Identity

| Field | Value |
|-------|-------|
| Slug | `eu-registry-manager-001` |
| Worker name | EU Registry Manager |
| Vertical | `unassigned` |
| Suite | `EU DPP` |
| Persona name | Elara |
| Anchor | EU DPP Central Registry API |
| Catalog listing | "Manages the live relationship with the EU DPP Central Registry. Submits passports, tracks registration status, handles lifecycle amendments, and monitors QR code availability for all products in scope." |

---

## 3. Canvas Tabs

### Tab 1 — Registry Status
- Connection status: Allowlisted / Pending / Not yet applied
- Registry go-live countdown (19 Jul 2026) if not yet live
- Total passports: Submitted / Registered / Pending / Failed
- Last API sync timestamp

### Tab 2 — Submission Queue
- Passports ready for submission (Passport Builder = complete)
- Per passport: product name, SKU, readiness check, estimated submission time
- Batch submit button (submit multiple products in one operation)
- Individual submit with pre-submission checklist confirmation

### Tab 3 — Registry Ledger
- All submitted passports with full registry metadata
- Passport ID (EU-issued), submission date, registration date, QR code URL
- Amendment history: lifecycle events appended since initial registration
- Client copy: each registered passport's QR code is also sent to the client's workspace

### Tab 4 — QR Code Manager
- QR codes for all registered products
- Download pack (all QR codes as ZIP → client sends to product labeling team)
- QR code audit: verify QR resolves to correct registry entry
- Re-generate if QR is corrupted or URL changes

### Tab 5 — Alerts + Renewals
- Passports approaching mandatory update deadlines
- Registry API error log
- Certificate renewals that require passport amendment
- Regulatory change alerts (EU Commission amendments to Annex XIII)

---

## 4. RAAS Rules

1. **Allowlist gate** — `POST /v1/dpp:submit` blocked until operator's registry credentials are confirmed valid
2. **Submission lock** — once registered, passport content is immutable; all changes go through amendment API
3. **QR integrity check** — after registration, RAAS polls the QR URL to confirm it resolves correctly
4. **Lifecycle amendment trigger** — when Lifecycle Monitor (Worker 5) records a significant SoH drop, RAAS triggers a registry amendment
5. **Client notification on registration** — on successful registration, RAAS sends client a notification with passport ID + QR code

---

## 5. API Surface

All calls proxy through `POST /v1/dpp:submit`, `GET /v1/dpp:status`, `POST /v1/dpp:update`.
The EU registry API endpoint and authentication are configured per workspace operator credentials.

---

## 6. Build Prerequisites

- EU DPP Central Registry API credentials (government allowlist — apply when registry opens 19 Jul 2026)
- Registry API schema documentation (to be published by EU Commission pre-launch)
- QR code resolution verification (polling mechanism post-registration)
- Webhook or polling mechanism for registry confirmation (registry may be async)

---

## 7. Build Steps

1. Apply for registry allowlisting immediately when registry opens (19 Jul 2026)
2. Implement `POST /v1/dpp:submit` with live registry API (currently returns mock)
3. Build Submission Queue tab — surface all Passport Builder-ready passports
4. Implement batch submit
5. Build Registry Ledger — real-time status from registry API
6. Build QR code manager — download pack generation
7. Wire lifecycle amendment trigger from Worker 5 (Lifecycle Monitor)
8. Wire client notification on successful registration
