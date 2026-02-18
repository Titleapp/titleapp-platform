# RAAS -- Auto -- Florida (FL) -- Data Model

This document defines the **canonical data model** for automotive operations under
the TitleApp **Rules as a Service (RAAS)** framework in Florida.

All Auto workflows (sales, service, ownership, fleet) depend on this model.

---

## 1) Design Principles

- **Vehicle-centric**: the vehicle record is primary
- **Event-sourced**: nothing is overwritten; events append
- **System-compatible**: integrates with existing dealer systems (DMS, service tools)
- **Audit-first**: every material action is attributable and timestamped

---

## 2) Core Entities

### 2.1 Vehicle (Primary Asset)

**Required**
- `vin` (string, required to finalize)
- `year`
- `make`
- `model`
- `trim` (if available)

**Optional**
- `odometer`
- `color`
- `bodyType`

**Florida-Specific Fields**
- `eTitleStatus` (electronic | paper | converted | pending)
- `plateTransferType` (retained_by_seller | surrendered | transferred_to_new_vehicle)

**Rules**
- VIN is the primary identifier
- Vehicle records persist across ownership changes
- Vehicle history is append-only
- E-title status must be tracked; electronic is the assumed default in Florida

---

### 2.2 Ownership Record

Represents a **point-in-time ownership state**, not a permanent overwrite.

**Fields**
- `ownerType` (individual | business | fleet)
- `ownerName`
- `ownerIdentifier` (internal or external reference)
- `ownershipStartDate`
- `ownershipEndDate` (nullable)
- `ownershipStatus` (active | transferred | terminated)

**Florida-Specific Fields**
- `plateTransferType` (retained_by_seller | surrendered | transferred_to_new_vehicle)
- `eTitleStatus` (electronic | paper | converted | pending)
- `dealerTitleSubmissionDeadline` (sale date + 30 days)

**Rules**
- Only one active ownership record at a time
- Ownership changes create a new record
- Prior ownership remains immutable
- Plate disposition must be recorded at every ownership transition
- Dealer has 30 days from sale to submit title/registration to FLHSMV

---

### 2.3 Encumbrance

Represents a lien or lease associated with the vehicle.

**Fields**
- `encumbranceType` (lien | lease)
- `holderName`
- `referenceId` (deal number, lease id, etc.)
- `startDate`
- `endDate` (nullable)
- `status` (active | released | expired)

**Florida-Specific Fields**
- `eTitleLienNotation` (boolean) -- whether the lien is recorded on the electronic title
- `electronicLienId` (ELT system reference, if applicable)

**Rules**
- Encumbrances must remain visible while active
- Encumbrances restrict ownership representations
- Release or expiration is an explicit event
- In Florida, liens are noted on the electronic title; `eTitleLienNotation` must be true while active

---

### 2.4 Customer

Represents a person or business interacting with the dealer.

**Fields**
- `customerType` (individual | business)
- `name`
- `contactInfo`
- `role` (buyer | lessee | serviceCustomer | fleetManager)

**Rules**
- Customer != Owner
- Customers may change roles over time
- Customer records do not imply ownership

---

### 2.5 Service Appointment

Represents a scheduled service interaction.

**Fields**
- `appointmentId`
- `vin`
- `scheduledDate`
- `serviceType`
- `status` (scheduled | completed | cancelled)
- `dealerLocation`

---

### 2.6 Repair Order (RO)

Represents work performed on a vehicle.

**Fields**
- `roNumber`
- `vin`
- `openDate`
- `closeDate`
- `payType` (warranty | customer | goodwill)
- `workSummary`
- `partsSummary`
- `attachments` (invoices, photos)

**Rules**
- ROs append to vehicle history
- ROs are never deleted
- Corrections are superseding entries

---

### 2.7 Sale Transaction

Represents a vehicle sale event.

**Fields**
- `saleType` (new | used)
- `transactionType` (cash | finance | lease)
- `dealNumber`
- `saleDate`
- `buyerReference`
- `tradeInVin` (nullable)

**Florida-Specific Fields**
- `countyDiscretionarySurtaxRate` (applied to first $5,000)
- `dr123Applicable` (boolean, true if buyer is nonresident)
- `dr123Status` (pending | filed | expired)

**Rules**
- Sale creates ownership transition
- Financing or lease creates encumbrance
- Sale does not erase service history

---

### 2.8 Fleet Assignment

Represents vehicle use within a fleet.

**Fields**
- `fleetOwner`
- `assignedDriver` (nullable)
- `assignmentStart`
- `assignmentEnd` (nullable)
- `usageType` (operational | pool | temporary)

**Rules**
- Fleet vehicles may have multiple drivers
- Assignment does not change ownership
- Service events remain vehicle-centric

---

### 2.9 Dealer Compliance (Florida-Specific)

Represents dealer-level compliance fields required by Florida law.

**Fields**
- `dealerLicenseNumber` (FLHSMV-issued)
- `suretyBondStatus` (active | expired | unknown)
- `suretyBondAmount` ($25,000 required)
- `suretyBondExpiration` (date)
- `bondCompanyName`

**Rules**
- Bond status is recorded for compliance visibility
- TitleApp does not validate bond authenticity with surety companies
- Expired bond status triggers a compliance warning event

---

## 3) Event Model (Append-Only)

All actions create events, including:
- ownershipChange
- saleCompleted
- encumbranceAdded
- encumbranceReleased
- serviceCompleted
- recallNoted
- fleetAssignmentChanged
- eTitleStatusChanged
- dr123StatusUpdated
- plateDispositionRecorded
- dealerBondStatusChanged

Events must include:
- `eventType`
- `timestamp`
- `actor` (system | user | dealer)
- `referenceId`

---

## 4) External System References

TitleApp stores **references**, not copies:
- DMS deal numbers
- RO numbers
- OEM recall identifiers
- Warranty claim IDs
- FLHSMV title numbers
- ELT (Electronic Lien and Title) system identifiers
- DR-123 filing references

This avoids data duplication and conflict.

---

## 5) Compliance Posture

This data model:
- Supports Florida Auto RAAS workflows
- Enables auditability without replacing dealer systems
- Avoids statutory interpretation
- Fails closed if required fields are missing
- References Fla. Stat. Ch. 319 (titles) and Ch. 320 (registration) without restating them

---

## 6) Versioning

- Jurisdiction: FL
- Vertical: Auto
- Data Model Version: v1.0
- Last Reviewed: 2026-02-18
