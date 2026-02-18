# RAAS -- Auto -- California (CA) -- Fleet

This document defines **fleet ownership, assignment, and maintenance workflows**
under TitleApp **Rules as a Service (RAAS)** for California.

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
- smog certification tracking (California-specific)

Rules:
- Service history remains vehicle-centric
- Fleet service does not overwrite prior records
- Bulk service entries must reference affected VINs
- Smog certification must be current for any fleet vehicle undergoing title transfer or disposal

---

## 5) Fleet Smog Compliance (California-Specific)

Fleet operators in California must maintain smog compliance for applicable vehicles.

TitleApp supports:
- tracking `smogStatus` per fleet vehicle (pass | exempt | required)
- flagging vehicles with expired or missing smog certification
- recording smog certificate references as service events
- noting exemption status for electric, diesel (pre-1998), and vehicles within four model years

TitleApp does not:
- enforce smog testing schedules
- verify certificates with BAR
- determine exemption eligibility (records declarations only)

When a fleet vehicle is being disposed of or transferred out of the fleet, smog certification status is evaluated as part of the ownership transition workflow.

---

## 6) Dealer & Service Interaction

Dealers may:
- service fleet vehicles
- record ROs and maintenance events
- reference fleet service contracts (if applicable)

Dealers may not:
- alter fleet ownership records
- remove service history
- suppress encumbrances

---

## 7) External System References

Fleet records may reference:
- fleet management system IDs
- internal asset numbers
- DMS RO numbers
- maintenance contract identifiers
- BAR smog certificate numbers

No requirement to ingest full external datasets.

---

## 8) Unsupported Actions

The following are not supported:
- insurance adjudication
- driver compliance enforcement
- accident fault determination
- CARB emissions compliance enforcement

Unsupported actions must:
- halt execution
- notify the user
- log the attempt

---

## 9) Versioning

- Jurisdiction: CA
- Vertical: Auto
- RAAS Module: Fleet
- Version: v1.0
- Last Reviewed: 2026-02-18
