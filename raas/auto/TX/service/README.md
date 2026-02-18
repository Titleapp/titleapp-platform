# RAAS -- Auto -- Texas (TX) -- Service

This document defines the **service department rules and workflows** for Texas dealerships
under TitleApp **Rules as a Service (RAAS)**.

Primary objective:
- Preserve **service history continuity** across ownership changes
- Support **appointments -> repair orders (ROs) -> outcomes** as an auditable timeline

---

## 1) Scope

Applies to:
- New and used vehicle service departments
- Warranty service
- Customer-pay service
- Fleet service operations
- Internal reconditioning (used inventory)

TitleApp does not replace a DMS. It records:
- appointment events
- RO references
- service outcomes
- attachments (photos, invoices, estimates)

---

## 2) Service Objects (from Data Model)

Service RAAS uses:
- Vehicle (VIN)
- Customer (service customer)
- Service Appointment
- Repair Order (RO)
- Events (append-only)

---

## 3) Supported Service Activities

### A) Appointment Lifecycle
- Create appointment
- Reschedule appointment
- Cancel appointment
- Mark completed

### B) Repair Order Lifecycle
- Open RO
- Update RO status
- Close RO
- Attach artifacts (invoice, estimate, photos)

### C) Pay Types
- Warranty
- Customer-pay
- Goodwill / dealer-pay

### D) Recall / Campaign Documentation
- Record recall check result (pass/fail/unknown)
- Record recall performed (with reference id)

### E) Used Inventory Reconditioning
- Pre-sale inspection event
- Reconditioning RO
- Certification evidence (if applicable)

### F) Fleet Maintenance
- Scheduled maintenance events
- Bulk service entries
- Driver assignment notes (non-PII)

---

## 4) TX-Specific: Safety Inspection Changes (HB 3297, 2025)

Effective with HB 3297 (89th Legislature, 2025), Texas has **abolished annual safety inspections
for non-commercial passenger vehicles**.

Implications for service workflows:
- Safety inspection is no longer required for title transfer of non-commercial vehicles
- Safety inspection ROs for non-commercial vehicles are no longer a standard service event
- Commercial vehicles and vehicles over 26,001 lbs GVWR remain subject to safety inspection requirements
- Emissions inspections remain required in designated counties (not abolished by HB 3297)

TitleApp records:
- Historical safety inspection events remain in the vehicle timeline (append-only; never deleted)
- New safety inspection events are only expected for commercial vehicles or vehicles over 26,001 lbs GVWR
- Emissions inspection events remain supported for vehicles registered in affected counties

---

## 5) Required Fields & Hard Stops

### Appointment Create (minimum)
Hard stop unless:
- `vin` is present OR record is explicitly marked `draft`
- scheduled date/time is present
- service type is present

### RO Close (minimum)
Hard stop unless:
- `roNumber` present OR explicitly marked `externalRefMissing=true`
- payType present
- work summary present
- close date present

---

## 6) Service History Continuity Rules (Non-Negotiable)

1. Service history is **append-only**
2. Ownership changes do **not** delete service events
3. Corrections are made by:
   - adding a superseding event
   - linking to the prior event id
4. Service access is permissioned, but history persists

---

## 7) Warranty & Recall Posture

TitleApp may:
- store warranty status fields (active/expired/unknown)
- store warranty claim reference ids (if provided)
- store recall campaign identifiers (if provided)

TitleApp does not:
- determine eligibility
- adjudicate claims
- provide OEM policy interpretation

---

## 8) External System References (DMS-Compatible)

Service entries should support:
- `roNumber` (DMS reference)
- `advisorId` (internal reference)
- `locationId` (dealer/store id)
- `partsInvoiceId` (optional reference)

No requirement to ingest full DMS data.

---

## 9) Exceptions & Unsupported Actions

Unsupported (must be flagged/logged):
- legal determinations about warranty denial
- consumer rights conclusions
- odometer fraud detection conclusions
- emissions compliance determinations

If requested, the system returns:
- "This action is not supported under RAAS."
- logs the request for review

---

## 10) Versioning

- Jurisdiction: TX
- Vertical: Auto
- RAAS Module: Service
- Version: v1.0
- Last Reviewed: 2026-02-18
