# RAAS -- Auto -- Florida (FL) -- Workflows

This document defines the **authorized end-to-end automotive workflows**
for Florida dealerships under TitleApp **Rules as a Service (RAAS)**.

If a workflow is not defined here, it **must not execute automatically**.

---

## 1) Workflow Governance

All workflows must:
- comply with Florida Auto RAAS modules
- reference the Florida data model
- halt on missing required components
- create append-only audit events
- respect the 30-day dealer title/registration submission window
- track e-title status and plate disposition

---

## 2) Supported Workflows

### 2.1 New Vehicle Sale -> Service Continuity

**Description**
Sale of a new vehicle with immediate service lifecycle support.

**Required**
- VIN
- Sale transaction (new)
- Buyer reference
- Ownership transition event

**Florida-Specific Requirements**
- `eTitleStatus` recorded (default: electronic)
- `plateTransferType` recorded (new plates for buyer)
- `dealerTitleSubmissionDeadline` computed (sale date + 30 days)
- `countyDiscretionarySurtaxRate` recorded
- `dr123Applicable` evaluated (true if buyer is nonresident)

**Flow**
1. Vehicle sale recorded
2. Ownership record created
3. Encumbrance recorded (if finance/lease); `eTitleLienNotation` set to true
4. Plate disposition recorded (plates stay with seller / new plates for buyer)
5. E-title status set
6. Dealer title submission deadline computed and surfaced
7. If nonresident buyer, DR-123 tracking initiated
8. Service history initialized
9. Vehicle enters post-sale service lifecycle

---

### 2.2 Used Vehicle Sale -> Prior History Preservation

**Description**
Sale of a used vehicle with preservation of prior service history.

**Required**
- VIN
- Used sale transaction
- Buyer reference

**Florida-Specific Requirements**
- `eTitleStatus` carried forward or updated
- `plateTransferType` recorded
- `dealerTitleSubmissionDeadline` computed
- Prior encumbrances verified as released before sale

**Flow**
1. Sale recorded
2. Ownership transitioned
3. Plate disposition recorded
4. E-title status updated if changed
5. Prior service history preserved
6. New owner granted visibility per policy
7. Dealer title submission deadline surfaced

---

### 2.3 Cash Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference

**Florida-Specific**
- `taxableAmount` computed (sale price minus trade-in credit, if any)
- `stateSalesTaxRate` recorded (6%)
- `countyDiscretionarySurtaxRate` recorded (applied to first $5,000)

**Flow**
1. Sale completed
2. Ownership transitioned
3. No encumbrance created
4. Tax reference amounts recorded
5. Plate disposition recorded

---

### 2.4 Finance Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference
- Lien holder reference

**Florida-Specific**
- `eTitleLienNotation` set to true
- `electronicLienId` recorded if available (ELT system)
- `dealerTitleSubmissionDeadline` computed

**Flow**
1. Sale completed
2. Ownership transitioned
3. Lien encumbrance created with e-title notation
4. Encumbrance visible until release
5. Plate disposition recorded
6. Dealer title submission deadline surfaced

---

### 2.5 Lease Sale Workflow

**Required**
- VIN
- Lease transaction
- Lessee reference

**Florida-Specific**
- `eTitleLienNotation` set to true (lessor noted on title)
- Lease encumbrance reflects lessor as title holder

**Flow**
1. Lease recorded
2. Ownership restricted
3. Lease encumbrance created with e-title notation
4. Lease expiration tracked
5. Plate disposition recorded

---

### 2.6 Trade-In Workflow

**Required**
- Outbound VIN (vehicle being purchased)
- Trade-in VIN

**Florida-Specific**
- `tradeInCredit` recorded on the outbound sale transaction
- `taxableAmount` reduced by trade-in credit before tax calculation
- Plate disposition recorded for the trade-in vehicle (plates stay with seller/trader)

**Flow**
1. Trade-in vehicle recorded
2. Prior ownership closed
3. Plate disposition recorded for trade-in
4. Trade-in credit applied to outbound sale
5. Vehicle enters dealer inventory
6. Reconditioning service workflow initiated

---

### 2.7 Nonresident Sale Workflow (Florida-Specific)

**Required**
- VIN
- Sale transaction
- Buyer reference
- `residencyStatus` = nonresident

**Florida-Specific**
- `dr123Applicable` set to true
- `dr123Status` initialized as pending
- 45-day window tracked for Form DR-123 completion
- Partial sales tax exemption eligibility is noted but not adjudicated

**Flow**
1. Sale recorded with nonresident buyer flag
2. Ownership transitioned
3. DR-123 status set to pending
4. 45-day DR-123 deadline computed and surfaced
5. If DR-123 not filed within 45 days, status updated to expired and compliance warning logged
6. Encumbrance recorded (if finance/lease)
7. Plate disposition recorded

---

### 2.8 Service Appointment -> Repair Order Workflow

**Required**
- VIN
- Appointment record

**Flow**
1. Appointment created
2. RO opened
3. Service performed
4. RO closed
5. Service event appended to history

---

### 2.9 Warranty / Recall Workflow

**Required**
- VIN
- Recall or warranty reference (if applicable)

**Flow**
1. Recall check recorded
2. Repair documented
3. Reference IDs stored
4. Service history updated

---

### 2.10 Fleet Assignment -> Maintenance Workflow

**Required**
- Fleet ownership record
- Assignment record

**Flow**
1. Driver assigned
2. Maintenance events tracked
3. Assignment changes logged
4. Ownership unchanged

---

### 2.11 Fleet Vehicle Disposition Workflow (Florida-Specific)

**Required**
- Fleet ownership record
- VIN
- Sale or transfer transaction

**Flow**
1. Fleet vehicle sale or transfer recorded
2. Fleet ownership record closed
3. Plate disposition recorded (plates stay with fleet owner)
4. E-title status updated
5. Dealer title submission deadline computed
6. Vehicle exits fleet lifecycle

---

## 3) Hard Stops (Non-Negotiable)

Execution must halt if:
- VIN missing
- Ownership unclear
- Encumbrance required but missing
- Workflow not defined in this document
- Jurisdiction mismatch (workflow executed against non-FL vehicle)
- E-title status unknown and required for title-related workflow
- 30-day dealer window exceeded without submission record (compliance warning, not halt -- logged for review)

---

## 4) Unsupported Workflows

Not supported unless explicitly added:
- title filing with FLHSMV
- insurance claim adjudication
- accident fault determination
- odometer fraud conclusions
- DR-123 filing or submission
- plate transfer processing with FLHSMV
- surety bond validation

Unsupported requests must:
- halt
- notify user
- log attempt

---

## 5) Versioning

- Jurisdiction: FL
- Vertical: Auto
- RAAS Module: Workflows
- Version: v1.0
- Last Reviewed: 2026-02-18
