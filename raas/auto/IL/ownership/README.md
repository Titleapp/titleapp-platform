# RAAS — Auto — Illinois (IL) — Ownership

This document defines **ownership, title-state, and encumbrance rules** for vehicles
under TitleApp **Rules as a Service (RAAS)** in Illinois.

Ownership RAAS ensures that vehicle records:
- reflect legal reality
- preserve historical continuity
- never imply clean title when encumbrances exist

---

## 1) Ownership Concepts

TitleApp distinguishes between:
- **Owner** — legal owner of the vehicle
- **Customer** — party interacting with dealer
- **Driver** — authorized operator (common in fleet)

These roles may overlap but are not interchangeable.

---

## 2) Ownership Records

Ownership is represented as **point-in-time records**, not overwrites.

Each ownership record includes:
- owner type (individual | business | fleet)
- owner name
- ownership start date
- ownership end date (nullable)
- ownership status (active | transferred | terminated)

Rules:
- Only one active ownership record per vehicle
- Ownership changes create a new record
- Prior ownership records are immutable

---

## 3) Ownership Transitions

Ownership changes may occur via:
- vehicle sale
- lease initiation (restricted ownership)
- lease termination
- fleet reassignment
- repossession or return (recorded, not adjudicated)

Each transition:
- creates an ownershipChange event
- closes the prior ownership record
- preserves all historical data

---

## 4) Encumbrances (Lien / Lease)

Encumbrances represent legal or contractual restrictions.

### Encumbrance Types
- Lien
- Lease

### Required Fields
- encumbrance type
- holder name
- reference id (deal, contract, or lease reference)
- start date
- status (active | released | expired)

Rules:
- Encumbrances must be visible while active
- Encumbrances restrict ownership representations
- Release or expiration must be explicitly recorded

---

## 5) Title Representation Posture

TitleApp:
- records title-related events
- does not file or modify title with the state
- does not calculate taxes or fees
- does not certify ownership validity

All title-related records are **informational and auditable**.

---

## 6) Access & Visibility

Ownership visibility may be restricted by:
- role (dealer, owner, service)
- client policy
- jurisdictional rules

Restrictions must:
- not delete historical records
- not obscure encumbrance existence
- be logged as access events

---

## 7) Unsupported Actions

Not supported under RAAS:
- legal ownership determinations
- dispute resolution
- title fraud conclusions

Unsupported requests must:
- halt execution
- notify the user
- log the attempt

---

## 8) Versioning

- Jurisdiction: IL
- Vertical: Auto
- RAAS Module: Ownership
- Version: v1.0
- Last Reviewed: 2026-01-21
