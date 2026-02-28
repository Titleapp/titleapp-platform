# Digital Worker Rules -- Auto -- California (CA) -- Ownership

This document defines **ownership, title-state, and encumbrance rules** for vehicles
under TitleApp **Digital Worker rules** in California.

Ownership rules ensure that vehicle records:
- reflect legal reality
- preserve historical continuity
- never imply clean title when encumbrances exist
- accurately represent title brand status
- track smog certification as a transfer prerequisite

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

### California-Specific Transfer Requirements

Before an ownership transition can finalize, the following must be satisfied:

**Smog Certification**
- A valid smog certificate is required for title transfer of used vehicles in California
- Smog certificate must be issued within 90 days prior to the transfer date
- The seller is responsible for providing the smog certificate (CVC Section 24007(b)(2))
- TitleApp records `smogCertRef` and `smogStatus` but does not verify certificates with BAR

**Smog Exemptions** (recorded as `smogStatus = exempt`):
- New vehicles on first sale from dealer
- Diesel-powered vehicles (model year 1997 and older)
- Electric, hydrogen, and other zero-emission vehicles
- Vehicles four model years old or newer
- Transfers between certain family members (buyer's responsibility to claim; the system records the declaration)

If smog status is `required` and no `smogCertRef` is present, the ownership transition workflow must halt.

**Report of Sale (REG 51)**
- Required for every vehicle sale in California
- Must be submitted to DMV within specified timeframes
- TitleApp records the `reportOfSaleRef` as an event attribute

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
- eltStatus (active | none | pending)

Rules:
- Encumbrances must be visible while active
- Encumbrances restrict ownership representations
- Release or expiration must be explicitly recorded

### Electronic Lien and Title (ELT)

California uses ELT as the standard method for recording liens on vehicle titles.

- When a lien is recorded, the title is held electronically by the lienholder
- `eltStatus = active` indicates the lienholder holds the electronic title
- Upon lien satisfaction, the lienholder releases the ELT, and the owner receives a paper title or the record is updated
- TitleApp tracks ELT status transitions as events but does not interact with the DMV ELT system directly

ELT status transitions:
- `none` -> `pending` (lien being recorded)
- `pending` -> `active` (ELT confirmed by lienholder)
- `active` -> `none` (lien released, title returned to owner)

---

## 5) Title Brand Tracking

California law requires certain title conditions to be permanently branded on the certificate of title.

### Supported Title Brands
- `clean` -- no adverse history recorded
- `salvage` -- vehicle declared a total loss by an insurer (CVC Section 544)
- `lemon_buyback` -- vehicle repurchased under the Song-Beverly Consumer Warranty Act
- `rebuilt` -- formerly salvage vehicle that has been rebuilt and inspected
- `flood` -- vehicle damaged by flooding

### Song-Beverly Consumer Warranty Act (Lemon Law)

- Vehicles repurchased under Song-Beverly must be branded `lemon_buyback`
- The lemon buyback brand is permanent and must be disclosed on all subsequent transfers
- TitleApp records the brand as an immutable attribute on the vehicle record
- Digital Worker rules do not adjudicate lemon law claims; they record the resulting title brand

### Rules
- Title brands are immutable once set by a state authority
- Title brands must remain visible to all parties in any transaction
- A vehicle with a `salvage` brand cannot be represented as `clean`
- Brand history is append-only and auditable
- Digital Worker rules do not assign title brands; they record declarations from authorized sources

---

## 6) Title Representation Posture

TitleApp:
- records title-related events
- does not file or modify title with the California DMV
- does not calculate taxes or fees
- does not certify ownership validity
- does not issue or verify smog certificates
- does not submit BPA transactions

All title-related records are **informational and auditable**.

---

## 7) Access & Visibility

Ownership visibility may be restricted by:
- role (dealer, owner, service)
- client policy
- jurisdictional rules

Restrictions must:
- not delete historical records
- not obscure encumbrance existence
- not obscure title brand status
- be logged as access events

---

## 8) Unsupported Actions

Not supported under Digital Worker rules:
- legal ownership determinations
- dispute resolution
- title fraud conclusions
- Song-Beverly claim adjudication
- smog certificate verification with BAR
- DMV title filing or registration

Unsupported requests must:
- halt execution
- notify the user
- log the attempt

---

## 9) Versioning

- Jurisdiction: CA
- Vertical: Auto
- Rules Module: Ownership
- Version: v1.0
- Last Reviewed: 2026-02-18
