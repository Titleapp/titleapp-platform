# Digital Worker Rules -- Auto -- Florida (FL) -- Ownership

This document defines **ownership, title-state, and encumbrance rules** for vehicles
under TitleApp **Digital Worker rules** in Florida.

Ownership rules ensure that vehicle records:
- reflect legal reality
- preserve historical continuity
- never imply clean title when encumbrances exist
- track electronic title (e-title) status accurately
- enforce Florida's plate-stays-with-seller convention

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

**Florida-Specific Fields**
- `plateTransferType` (retained_by_seller | surrendered | transferred_to_new_vehicle)
- `eTitleStatus` (electronic | paper | converted | pending)

Rules:
- Only one active ownership record per vehicle
- Ownership changes create a new record
- Prior ownership records are immutable
- Plate disposition must be recorded at every ownership transition

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
- records plate disposition (plates stay with seller in Florida)

**Florida-Specific Transition Rules**
- Dealer has 30 calendar days from sale date to submit title and registration to FLHSMV
- `dealerTitleSubmissionDeadline` is computed and surfaced
- If the deadline passes without recorded submission, a compliance warning event is created
- Buyer must obtain new plates; seller retains or surrenders existing plates

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

### Florida-Specific Fields
- `eTitleLienNotation` (boolean) -- whether the lien is recorded on the electronic title
- `electronicLienId` (ELT system reference, if applicable)

Rules:
- Encumbrances must be visible while active
- Encumbrances restrict ownership representations
- Release or expiration must be explicitly recorded
- In Florida, liens are noted on the electronic title; `eTitleLienNotation` must be true while the lien is active
- Lien release triggers an eTitleStatusChanged event

---

## 5) Electronic Title (E-Title) Posture

Florida has adopted electronic titles as the standard method of titling.

TitleApp tracks:
- `eTitleStatus` per vehicle (electronic | paper | converted | pending)
- lien notations on the electronic title record
- conversion events (paper to electronic or vice versa)

Rules:
- Electronic title is the assumed default for Florida vehicles
- Paper title is an exception that must be explicitly noted
- E-title status changes are recorded as events
- TitleApp does not file or modify titles with FLHSMV

---

## 6) Title Representation Posture

TitleApp:
- records title-related events
- tracks e-title status and lien notations
- does not file or modify title with FLHSMV
- does not calculate taxes or fees
- does not certify ownership validity

All title-related records are **informational and auditable**.

---

## 7) Plate Disposition (Florida-Specific)

In Florida, license plates remain with the seller, not the vehicle.

TitleApp records:
- `plateTransferType` at every ownership transition
- whether the seller retained, surrendered, or transferred plates to another vehicle

Rules:
- Plate disposition is a required field on ownership transition events
- TitleApp does not interact with FLHSMV plate systems
- Plate disposition is informational and supports audit completeness

---

## 8) Access & Visibility

Ownership visibility may be restricted by:
- role (dealer, owner, service)
- client policy
- jurisdictional rules

Restrictions must:
- not delete historical records
- not obscure encumbrance existence
- be logged as access events

---

## 9) Unsupported Actions

Not supported under Digital Worker rules:
- legal ownership determinations
- dispute resolution
- title fraud conclusions
- FLHSMV filing or submission
- plate transfer processing

Unsupported requests must:
- halt execution
- notify the user
- log the attempt

---

## 10) Versioning

- Jurisdiction: FL
- Vertical: Auto
- Rules Module: Ownership
- Version: v1.0
- Last Reviewed: 2026-02-18
