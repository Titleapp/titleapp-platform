# RAAS -- Auto -- California (CA) -- Data Model

This document defines the **canonical data model** for automotive operations under
the TitleApp **Rules as a Service (RAAS)** framework in California.

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

**California-Specific Fields**
- `smogStatus` (pass | exempt | required)
- `smogCertRef` (BAR smog certificate reference number)
- `titleBrand` (clean | salvage | lemon_buyback | rebuilt | flood)

**Rules**
- VIN is the primary identifier
- Vehicle records persist across ownership changes
- Vehicle history is append-only
- Smog status must be evaluated before any used vehicle sale
- Title brand is immutable once set

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

**California-Specific Fields**
- `eltStatus` (none | pending | active)

**Rules**
- Encumbrances must remain visible while active
- Encumbrances restrict ownership representations
- Release or expiration is an explicit event
- ELT status transitions: none -> pending -> active (lien confirmed) -> none (lien released)

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

**California-Specific Fields**
- `reportOfSaleRef` (REG 51 reference)
- `districtTaxRate` (district-level tax rate for audit)
- `topIssued` (boolean, whether a Temporary Operating Permit was issued)
- `smogCertRef` (smog certificate reference, required for used vehicles unless exempt)
- `bpaSubmissionRef` (BPA transaction reference, if applicable)

**Rules**
- Sale creates ownership transition
- Financing or lease creates encumbrance
- Sale does not erase service history
- Used vehicle sales require smog certification (hard stop if missing and not exempt)
- Report of Sale (REG 51) reference required for all completed sales

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

### 2.9 Dealer Compliance (California-Specific)

Represents dealer-level compliance fields required by California law.

**Fields**
- `dealerLicenseNumber` (DMV-issued)
- `suretyBondStatus` (active | expired | unknown)
- `suretyBondAmount` ($50,000 required)
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
- smogCertRecorded
- titleBrandNoted
- reportOfSaleFiled
- eltStatusChanged
- topIssued
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
- BAR smog certificate numbers
- DMV REG 51 references
- ELT system identifiers
- BPA transaction references

This avoids data duplication and conflict.

---

## 5) Compliance Posture

This data model:
- Supports California Auto RAAS workflows
- Enables auditability without replacing dealer systems
- Avoids statutory interpretation
- Fails closed if required fields are missing
- Enforces smog certification as a hard stop for used vehicle sales

---

## 6) Versioning

- Jurisdiction: CA
- Vertical: Auto
- Data Model Version: v1.0
- Last Reviewed: 2026-02-18
