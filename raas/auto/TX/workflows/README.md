# Digital Worker Rules -- Auto -- Texas (TX) -- Workflows

This document defines the **authorized end-to-end automotive workflows**
for Texas dealerships under TitleApp **Digital Worker rules**.

If a workflow is not defined here, it **must not execute automatically**.

---

## 1) Workflow Governance

All workflows must:
- comply with Texas Auto Digital Worker rules
- reference the Texas data model
- halt on missing required components
- create append-only audit events

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
- Form 130-U reference (`form130URef`)
- webDEALER submission reference (`webDealerSubmissionRef`)
- Gross weight recorded (`grossWeight`)

**Flow**
1. Vehicle sale recorded
2. Gross weight evaluated to determine tax collection path
3. If gross weight is 11,000 lbs or less: dealer collects 6.25% motor vehicle sales tax
4. If gross weight exceeds 11,000 lbs: buyer remits tax to CTAC within 30 days (recorded, not enforced)
5. Ownership record created
6. Encumbrance recorded (if finance/lease)
7. Form 130-U reference recorded
8. webDEALER submission reference recorded
9. Metal plate issued at point of sale (HB 718); `metalPlateIssuedAtPOS = true` recorded
10. `metalPlateIssued` event appended to vehicle timeline
11. Service history initialized
12. Vehicle enters post-sale service lifecycle

---

### 2.2 Used Vehicle Sale -> Prior History Preservation

**Description**
Sale of a used vehicle with preservation of prior service history.

**Required**
- VIN
- Used sale transaction
- Buyer reference
- Form 130-U reference
- webDEALER submission reference
- Gross weight recorded

**Flow**
1. Sale recorded
2. Gross weight evaluated for tax collection path
3. Dealer collects 6.25% sales tax (vehicles 11,000 lbs or less) or records buyer-remit obligation
4. Ownership transitioned
5. Prior service history preserved
6. New owner granted visibility per policy
7. Form 130-U and webDEALER references recorded
8. Metal plate issued at POS (HB 718)
9. Seller reminded to file Vehicle Transfer Notification with TxDMV within 30 days

---

### 2.3 Cash Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference
- Form 130-U reference
- Gross weight recorded

**Flow**
1. Sale completed
2. Tax collection path determined by gross weight
3. Ownership transitioned
4. No encumbrance created
5. Metal plate issued at POS (HB 718)
6. Form 130-U and webDEALER references recorded

---

### 2.4 Finance Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference
- Lien holder reference
- Form 130-U reference
- webDEALER submission reference

**Flow**
1. Sale completed
2. Tax collection path determined by gross weight
3. Ownership transitioned
4. Lien encumbrance created
5. Lien filed electronically via webDEALER (reference recorded)
6. Encumbrance visible until release
7. Metal plate issued at POS (HB 718)
8. Form 130-U reference recorded

---

### 2.5 Lease Sale Workflow

**Required**
- VIN
- Lease transaction
- Lessee reference
- Form 130-U reference

**Flow**
1. Lease recorded
2. Ownership restricted
3. Lease encumbrance created
4. Lease expiration tracked
5. Metal plate issued at POS (HB 718)
6. webDEALER reference recorded

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
5. Seller reminded to file Vehicle Transfer Notification with TxDMV

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

### 2.10 Metal Plate Issuance at POS (HB 718)

**Description**
Standalone workflow for documenting metal plate issuance at point of sale, as required by HB 718 (2025). This workflow is embedded in all sale workflows above but may also be triggered independently for correction or late documentation.

**Required**
- VIN
- Sale transaction reference (dealNumber)
- Plate number or plate inventory reference

**Flow**
1. Verify active sale transaction exists for VIN
2. Record `metalPlateIssuedAtPOS = true` on sale transaction
3. Append `metalPlateIssued` event to vehicle timeline
4. Record plate number or inventory reference
5. If plate was not issued at POS, record exception with reason and flag for dealer review

**Hard Stop**
- If no active sale transaction exists for the VIN, workflow halts
- Paper temporary tags are not valid; system does not support recording paper temp tag issuance

---

### 2.11 Vehicle Transfer Notification Filing (Seller Protection)

**Description**
Standalone workflow for documenting a Vehicle Transfer Notification filed by the seller with TxDMV. TitleApp records the filing; it does not file on the seller's behalf.

**Required**
- VIN
- Seller reference
- Transfer date

**Flow**
1. Verify ownership transition event exists for VIN
2. Record `vehicleTransferNotificationFiled` event on vehicle timeline
3. Store `vehicleTransferNotificationRef` on the prior ownership record
4. Log filing date and confirmation reference (if available)

**Note**
- VTN should be filed within 30 days of sale to protect seller from post-sale liability
- TitleApp may surface a reminder but does not enforce the 30-day deadline

---

## 3) Hard Stops (Non-Negotiable)

Execution must halt if:
- VIN missing
- Ownership unclear
- Encumbrance required but missing
- Workflow not defined in this document
- Jurisdiction mismatch
- `grossWeight` missing on sale transactions (required for tax collection routing)
- `form130URef` missing on finalized sale transactions
- `metalPlateIssuedAtPOS` not confirmed on finalized sale transactions (HB 718)

---

## 4) Unsupported Workflows

Not supported unless explicitly added:
- title filing with TxDMV
- insurance claim adjudication
- accident fault determination
- odometer fraud conclusions
- direct interaction with webDEALER
- SPV calculation
- tax remittance to Comptroller or CTAC

Unsupported requests must:
- halt
- notify user
- log attempt

---

## 5) Versioning

- Jurisdiction: TX
- Vertical: Auto
- Rules Module: Workflows
- Version: v1.0
- Last Reviewed: 2026-02-18
