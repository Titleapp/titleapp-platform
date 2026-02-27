# Digital Worker Rules — Auto — Illinois (IL) — Data Model

This document defines the **canonical data model** for automotive operations under
the TitleApp **Digital Worker rules** framework in Illinois.

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

**Rules**
- VIN is the primary identifier
- Vehicle records persist across ownership changes
- Vehicle history is append-only

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

**Rules**
- Encumbrances must remain visible while active
- Encumbrances restrict ownership representations
- Release or expiration is an explicit event

---

### 2.4 Customer

Represents a person or business interacting with the dealer.

**Fields**
- `customerType` (individual | business)
- `name`
- `contactInfo`
- `role` (buyer | lessee | serviceCustomer | fleetManager)

**Rules**
- Customer ≠ Owner
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

## 3) Event Model (Append-Only)

All actions create events, including:
- ownershipChange
- saleCompleted
- encumbranceAdded
- encumbranceReleased
- serviceCompleted
- recallNoted
- fleetAssignmentChanged

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

This avoids data duplication and conflict.

---

## 5) Compliance Posture

This data model:
- Supports Illinois Auto Digital Worker workflows
- Enables auditability without replacing dealer systems
- Avoids statutory interpretation
- Fails closed if required fields are missing

---

## 6) Versioning

- Jurisdiction: IL
- Vertical: Auto
- Data Model Version: v1.0
- Last Reviewed: 2026-01-21

