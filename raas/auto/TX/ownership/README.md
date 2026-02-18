# RAAS -- Auto -- Texas (TX) -- Ownership

This document defines **ownership, title-state, and encumbrance rules** for vehicles
under TitleApp **Rules as a Service (RAAS)** in Texas.

Ownership RAAS ensures that vehicle records:
- reflect legal reality
- preserve historical continuity
- never imply clean title when encumbrances exist

---

## 1) Ownership Concepts

TitleApp distinguishes between:
- **Owner** -- legal owner of the vehicle
- **Customer** -- party interacting with dealer
- **Driver** -- authorized operator (common in fleet)

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

**TX-Specific Fields**
- `form130URef` -- reference to the Form 130-U (Application for Texas Title and/or Registration) associated with this ownership event
- `vehicleTransferNotificationRef` -- reference to the Vehicle Transfer Notification filed by the seller with TxDMV

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

### TX-Specific: Vehicle Transfer Notification

When a vehicle is sold or transferred in Texas, the seller should file a **Vehicle Transfer Notification (VTN)** with TxDMV within 30 days of the sale date. This protects the seller from liability for the vehicle after transfer.

TitleApp records the VTN filing as:
- a `vehicleTransferNotificationFiled` event on the vehicle timeline
- a `vehicleTransferNotificationRef` on the ownership record

TitleApp does not file the VTN. The seller or dealer is responsible for filing via TxDMV's online portal or in person at a CTAC office.

### TX-Specific: webDEALER Electronic Title System

Texas requires all licensed dealers to process title and registration transactions through the **webDEALER** system. TitleApp records webDEALER submission references but does not interact with webDEALER directly.

Each ownership transition involving a dealer should include:
- `webDealerSubmissionRef` on the associated sale transaction
- a `webDealerSubmitted` event on the vehicle timeline

This ensures the audit trail references the electronic filing without duplicating it.

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
- In Texas, lien information is filed electronically through webDEALER; the webDEALER submission reference should be cross-referenced on the encumbrance record

---

## 5) Title Representation Posture

TitleApp:
- records title-related events
- does not file or modify title with TxDMV
- does not calculate taxes, fees, or Standard Presumptive Value
- does not certify ownership validity
- does not file Form 130-U or interact with webDEALER

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
- filing Vehicle Transfer Notifications on behalf of the seller
- interacting with webDEALER or TxDMV systems directly
- calculating or remitting motor vehicle sales tax

Unsupported requests must:
- halt execution
- notify the user
- log the attempt

---

## 8) Versioning

- Jurisdiction: TX
- Vertical: Auto
- RAAS Module: Ownership
- Version: v1.0
- Last Reviewed: 2026-02-18
