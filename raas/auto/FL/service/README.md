# Digital Worker Rules -- Auto -- Florida (FL) -- Service

This document defines the **service department rules and workflows** for Florida dealerships
under TitleApp **Digital Worker rules**.

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

Service rules use:
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

## 4) Required Fields & Hard Stops

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

## 5) Service History Continuity Rules (Non-Negotiable)

1. Service history is **append-only**
2. Ownership changes do **not** delete service events
3. Corrections are made by:
   - adding a superseding event
   - linking to the prior event id
4. Service access is permissioned, but history persists

---

## 6) Warranty & Recall Posture

TitleApp may:
- store warranty status fields (active/expired/unknown)
- store warranty claim reference ids (if provided)
- store recall campaign identifiers (if provided)

TitleApp does not:
- determine eligibility
- adjudicate claims
- provide OEM policy interpretation

---

## 7) Florida-Specific Service Notes

### Dealer Compliance Window
- Florida dealers have a 30-day window to complete title/registration after sale
- Service records created within this window should reference the pending title status
- If a vehicle is serviced before title/registration is completed, the service event is still valid and appended

### E-Title Interaction
- Service events do not modify e-title status
- Service records reference the VIN regardless of title status (electronic or paper)
- E-title status is informational context available to service workflows but not modified by them

### Recall Compliance
- Florida does not impose state-level recall completion mandates beyond federal requirements
- Digital Worker rules follow federal recall documentation standards
- Recall events are recorded per the standard RO lifecycle

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
- FLHSMV inspection certifications

If requested, the system returns:
- "This action is not supported under Digital Worker rules."
- logs the request for review

---

## 10) Versioning

- Jurisdiction: FL
- Vertical: Auto
- Rules Module: Service
- Version: v1.0
- Last Reviewed: 2026-02-18
