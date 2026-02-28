# Digital Worker Rules -- Auto -- Florida (FL) -- Fleet

This document defines **fleet ownership, assignment, and maintenance workflows**
under TitleApp **Digital Worker rules** for Florida.

Fleet rules support:
- corporate fleets
- municipal fleets
- dealer loaner fleets
- rental or pool vehicles (recorded, not operated)

---

## 1) Fleet Concepts

A **fleet vehicle** is a vehicle owned by a business or organization
and assigned to one or more drivers over time.

Fleet rules distinguish:
- Fleet owner (legal owner)
- Assigned driver (authorized operator)
- Managing entity (dealer or fleet manager)

---

## 2) Fleet Ownership

Fleet ownership:
- follows standard ownership rules
- is represented as an ownership record with `ownerType = fleet`
- may include multiple vehicles under one owner entity

Rules:
- Fleet ownership does not change per driver assignment
- Ownership changes only via sale or transfer event

---

## 3) Driver Assignment

Fleet vehicles may have:
- a single assigned driver
- multiple sequential drivers
- temporary or pool usage

Each assignment includes:
- driver reference
- assignment start date
- assignment end date (nullable)
- usage type (operational | pool | temporary)

Rules:
- Driver assignment does not imply ownership
- Assignment changes are events
- Historical assignments are preserved

---

## 4) Fleet Service & Maintenance

Fleet service must support:
- scheduled maintenance
- bulk service events
- mileage-based service triggers
- recall documentation
- warranty tracking (reference-only)

Rules:
- Service history remains vehicle-centric
- Fleet service does not overwrite prior records
- Bulk service entries must reference affected VINs

---

## 5) Dealer & Service Interaction

Dealers may:
- service fleet vehicles
- record ROs and maintenance events
- reference fleet service contracts (if applicable)

Dealers may not:
- alter fleet ownership records
- remove service history
- suppress encumbrances

---

## 6) Florida-Specific Fleet Rules

### Plate Disposition on Fleet Rotation
- When a fleet vehicle is sold or transferred out of fleet, plates stay with the fleet owner (seller)
- `plateTransferType` must be recorded on every fleet vehicle disposition event
- Fleet owners may transfer plates to replacement fleet vehicles per FLHSMV rules

### E-Title for Fleet Vehicles
- Fleet vehicles follow the same e-title posture as individual vehicles
- `eTitleStatus` must be tracked per vehicle, not per fleet
- Bulk fleet acquisitions should record e-title status for each VIN individually

### Sales Tax on Fleet Acquisitions
- Fleet vehicle purchases are subject to the same 6% state sales tax + county discretionary surtax
- No fleet-specific exemption exists under general Florida law
- Government and municipal fleet exemptions (if applicable) are recorded as a compliance note, not adjudicated by TitleApp

### 30-Day Title Window
- Fleet acquisitions are subject to the same 30-day dealer window for title/registration submission
- `dealerTitleSubmissionDeadline` applies per vehicle, not per bulk purchase order

---

## 7) External System References

Fleet records may reference:
- fleet management system IDs
- internal asset numbers
- DMS RO numbers
- maintenance contract identifiers
- FLHSMV title numbers (per vehicle)

No requirement to ingest full external datasets.

---

## 8) Unsupported Actions

The following are not supported:
- insurance adjudication
- driver compliance enforcement
- accident fault determination
- FLHSMV plate transfer processing
- government fleet tax exemption determinations

Unsupported actions must:
- halt execution
- notify the user
- log the attempt

---

## 9) Versioning

- Jurisdiction: FL
- Vertical: Auto
- Rules Module: Fleet
- Version: v1.0
- Last Reviewed: 2026-02-18
