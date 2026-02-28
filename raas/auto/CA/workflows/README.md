# Digital Worker Rules -- Auto -- California (CA) -- Workflows

This document defines the **authorized end-to-end automotive workflows**
for California dealerships under TitleApp **Digital Worker rules**.

If a workflow is not defined here, it **must not execute automatically**.

---

## 1) Workflow Governance

All workflows must:
- comply with California Auto Digital Worker rules
- reference the California data model
- halt on missing required components
- create append-only audit events
- enforce smog certification as a hard stop for applicable used vehicle sales

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
- Report of Sale reference (REG 51)

**Flow**
1. Vehicle sale recorded
2. Report of Sale (REG 51) reference captured
3. Ownership record created
4. Encumbrance recorded (if finance/lease; ELT status set)
5. Temporary Operating Permit issued (if applicable; `topIssued = true`)
6. Service history initialized
7. Vehicle enters post-sale service lifecycle

**Smog Note**: New vehicles are exempt from smog certification on first sale.

---

### 2.2 Used Vehicle Sale -> Prior History Preservation

**Description**
Sale of a used vehicle with preservation of prior service history.

**Required**
- VIN
- Used sale transaction
- Buyer reference
- Smog certificate reference (unless exempt)
- Report of Sale reference (REG 51)

**Flow**
1. **Smog certification check** (HARD STOP if `smogStatus = required` and no `smogCertRef` present)
2. Title brand verified and disclosed (salvage, lemon buyback, rebuilt, flood)
3. Sale recorded
4. Report of Sale (REG 51) reference captured
5. Ownership transitioned
6. Encumbrance recorded (if finance/lease; ELT status set)
7. Prior service history preserved
8. New owner granted visibility per policy
9. District tax rate recorded for audit trail

**Hard Stop**: This workflow cannot proceed past step 1 without a valid smog certificate reference or a documented exemption. This is a non-negotiable gate.

---

### 2.3 Cash Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference
- Report of Sale reference (REG 51)
- Smog certificate reference (if used vehicle and not exempt)

**Flow**
1. Smog certification check (used vehicles only; hard stop if required and missing)
2. Sale completed
3. Report of Sale (REG 51) reference captured
4. Ownership transitioned
5. No encumbrance created
6. District tax rate recorded

---

### 2.4 Finance Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference
- Lien holder reference
- Report of Sale reference (REG 51)
- Smog certificate reference (if used vehicle and not exempt)

**Flow**
1. Smog certification check (used vehicles only; hard stop if required and missing)
2. Sale completed
3. Report of Sale (REG 51) reference captured
4. Ownership transitioned
5. Lien encumbrance created
6. ELT status set to `pending` (lienholder to confirm electronic title)
7. Encumbrance visible until release
8. District tax rate recorded

---

### 2.5 Lease Sale Workflow

**Required**
- VIN
- Lease transaction
- Lessee reference
- Report of Sale reference (REG 51)

**Flow**
1. Lease recorded
2. Report of Sale (REG 51) reference captured
3. Ownership restricted
4. Lease encumbrance created
5. ELT status set to `pending`
6. Lease expiration tracked

---

### 2.6 Trade-In Workflow

**Required**
- Outbound VIN
- Trade-in VIN

**Flow**
1. Trade-in vehicle recorded
2. Prior ownership closed
3. Vehicle enters dealer inventory
4. Reconditioning service workflow initiated
5. Smog status evaluated for future resale readiness

---

### 2.7 Service Appointment -> Repair Order Workflow

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

### 2.8 Warranty / Recall Workflow

**Required**
- VIN
- Recall or warranty reference (if applicable)

**Flow**
1. Recall check recorded
2. Repair documented
3. Reference IDs stored
4. Service history updated

---

### 2.9 Fleet Assignment -> Maintenance Workflow

**Required**
- Fleet ownership record
- Assignment record

**Flow**
1. Driver assigned
2. Maintenance events tracked
3. Assignment changes logged
4. Ownership unchanged

---

### 2.10 Smog Certification Workflow (California-Specific)

**Description**
Records smog inspection results and links them to the vehicle record for title transfer readiness.

**Required**
- VIN
- Smog inspection result (pass | fail | exempt)
- Smog certificate reference (if pass)
- Exemption reason (if exempt)

**Flow**
1. Smog inspection result recorded as a service event
2. `smogStatus` on vehicle record updated
3. If pass: `smogCertRef` stored
4. If exempt: `exemptionReason` stored
5. If fail: vehicle flagged as ineligible for title transfer until resolved
6. Event appended to vehicle history

---

### 2.11 Title Brand Recording Workflow (California-Specific)

**Description**
Records a title brand declaration from an authorized source.

**Required**
- VIN
- Title brand type (salvage | lemon_buyback | rebuilt | flood)
- Source reference (insurer, manufacturer, or state authority)

**Flow**
1. Title brand recorded on vehicle record
2. `titleBrand` field set (immutable once recorded)
3. Brand source and date captured
4. Event appended to vehicle history
5. All future sale workflows must disclose the brand

---

### 2.12 ELT Lien Release Workflow (California-Specific)

**Description**
Records the release of an electronic lien and title.

**Required**
- VIN
- Encumbrance reference
- Release confirmation reference

**Flow**
1. Encumbrance status updated to `released`
2. ELT status updated to `none`
3. Release event recorded with lienholder reference
4. Vehicle record reflects unencumbered status

---

## 3) Hard Stops (Non-Negotiable)

Execution must halt if:
- VIN missing
- Ownership unclear
- Encumbrance required but missing
- Workflow not defined in this document
- Jurisdiction mismatch
- Smog certification required but `smogStatus` is not `pass` or `exempt` (used vehicle sales)
- Report of Sale (REG 51) reference missing for any completed sale
- Title brand disclosure missing when brand exists on vehicle record

---

## 4) Unsupported Workflows

Not supported unless explicitly added:
- title filing with California DMV
- BPA transaction submission
- insurance claim adjudication
- accident fault determination
- odometer fraud conclusions
- Song-Beverly claim adjudication
- smog certificate verification with BAR
- sales tax calculation or collection

Unsupported requests must:
- halt
- notify user
- log attempt

---

## 5) Versioning

- Jurisdiction: CA
- Vertical: Auto
- Rules Module: Workflows
- Version: v1.0
- Last Reviewed: 2026-02-18
