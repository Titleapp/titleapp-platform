# Digital Worker Rules -- Auto -- Texas (TX) -- Data Model

This document defines the **canonical data model** for automotive operations under
the TitleApp **Digital Worker rules** framework in Texas.

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

**Texas-Specific Fields**
- `grossWeight` (required for tax collection routing)
- `metalPlateIssuedAtPOS` (boolean, per HB 718)

**Rules**
- VIN is the primary identifier
- Vehicle records persist across ownership changes
- Vehicle history is append-only
- Gross weight must be recorded to determine tax collection path

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

**Texas-Specific Fields**
- `form130URef` -- reference to Form 130-U associated with this ownership event
- `vehicleTransferNotificationRef` -- reference to VTN filed by the seller with TxDMV

**Rules**
- Only one active ownership record at a time
- Ownership changes create a new record
- Prior ownership remains immutable

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

**Rules**
- Encumbrances must remain visible while active
- Encumbrances restrict ownership representations
- Release or expiration is an explicit event
- Lien information filed electronically through webDEALER; submission reference cross-referenced

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

**Texas-Specific Fields**
- `form130URef` (Form 130-U document reference)
- `webDealerSubmissionRef` (webDEALER submission reference)
- `grossWeight` (required for tax collection routing)
- `metalPlateIssuedAtPOS` (boolean, per HB 718)
- `taxCollectionPath` (dealer_collects | buyer_remits_to_ctac)

**Rules**
- Sale creates ownership transition
- Financing or lease creates encumbrance
- Sale does not erase service history
- Gross weight determines tax collection path (11,000 lbs threshold)
- Metal plate issuance at POS must be confirmed

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

### 2.9 Dealer Compliance (Texas-Specific)

Represents dealer-level compliance fields required by Texas law.

**Fields**
- `dealerLicenseNumber` (TxDMV-issued)
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
- metalPlateIssued
- webDealerSubmitted
- vehicleTransferNotificationFiled
- form130UCompleted
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
- webDEALER submission IDs
- Form 130-U document references
- Vehicle Transfer Notification confirmation references
- TxDMV plate inventory references

This avoids data duplication and conflict.

---

## 5) Compliance Posture

This data model:
- Supports Texas Auto Digital Worker workflows
- Enables auditability without replacing dealer systems
- Avoids statutory interpretation
- Fails closed if required fields are missing
- Records gross weight to support correct tax collection routing
- References Form 130-U and webDEALER without replacing those systems

---

## 6) Versioning

- Jurisdiction: TX
- Vertical: Auto
- Data Model Version: v1.0
- Last Reviewed: 2026-02-18
