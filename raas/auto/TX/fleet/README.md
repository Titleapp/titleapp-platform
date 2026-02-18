# RAAS -- Auto -- Texas (TX) -- Fleet

This document defines **fleet ownership, assignment, and maintenance workflows**
under TitleApp **Rules as a Service (RAAS)** for Texas.

Fleet RAAS supports:
- corporate fleets
- municipal fleets
- dealer loaner fleets
- rental or pool vehicles (recorded, not operated)

---

## 1) Fleet Concepts

A **fleet vehicle** is a vehicle owned by a business or organization
and assigned to one or more drivers over time.

Fleet RAAS distinguishes:
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
- Fleet vehicles over 11,000 lbs gross weight follow different tax remittance rules (buyer remits to CTAC directly)
- `grossWeight` must be recorded on each fleet vehicle to determine tax collection path

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

### TX-Specific: Safety Inspection for Fleet Vehicles

Per HB 3297 (2025), annual safety inspections are abolished for non-commercial passenger vehicles. However:
- Commercial fleet vehicles remain subject to safety inspection requirements
- Fleet vehicles over 26,001 lbs GVWR remain subject to safety inspection requirements
- Non-commercial fleet vehicles (pool cars, loaner vehicles, light-duty operational vehicles) are exempt from safety inspection

TitleApp records inspection events when applicable but does not enforce inspection scheduling for exempt vehicle classes.

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

## 6) External System References

Fleet records may reference:
- fleet management system IDs
- internal asset numbers
- DMS RO numbers
- maintenance contract identifiers
- webDEALER submission references (for title/registration events)
- Form 130-U references (for ownership transitions)

No requirement to ingest full external datasets.

---

## 7) Unsupported Actions

The following are not supported:
- insurance adjudication
- driver compliance enforcement
- accident fault determination
- filing Vehicle Transfer Notifications on behalf of fleet owners
- interacting with webDEALER or TxDMV directly

Unsupported actions must:
- halt execution
- notify the user
- log the attempt

---

## 8) Versioning

- Jurisdiction: TX
- Vertical: Auto
- RAAS Module: Fleet
- Version: v1.0
- Last Reviewed: 2026-02-18
