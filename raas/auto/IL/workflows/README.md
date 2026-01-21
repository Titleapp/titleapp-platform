# RAAS — Auto — Illinois (IL) — Workflows

This document defines the **authorized end-to-end automotive workflows**
for Illinois dealerships under TitleApp **Rules as a Service (RAAS)**.

If a workflow is not defined here, it **must not execute automatically**.

---

## 1) Workflow Governance

All workflows must:
- comply with Illinois Auto RAAS modules
- reference the Illinois data model
- halt on missing required components
- create append-only audit events

---

## 2) Supported Workflows

### 2.1 New Vehicle Sale → Service Continuity

**Description**  
Sale of a new vehicle with immediate service lifecycle support.

**Required**
- VIN
- Sale transaction (new)
- Buyer reference
- Ownership transition event

**Flow**
1. Vehicle sale recorded
2. Ownership record created
3. Encumbrance recorded (if finance/lease)
4. Service history initialized
5. Vehicle enters post-sale service lifecycle

---

### 2.2 Used Vehicle Sale → Prior History Preservation

**Description**  
Sale of a used vehicle with preservation of prior service history.

**Required**
- VIN
- Used sale transaction
- Buyer reference

**Flow**
1. Sale recorded
2. Ownership transitioned
3. Prior service history preserved
4. New owner granted visibility per policy

---

### 2.3 Cash Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference

**Flow**
1. Sale completed
2. Ownership transitioned
3. No encumbrance created

---

### 2.4 Finance Sale Workflow

**Required**
- VIN
- Sale type
- Buyer reference
- Lien holder reference

**Flow**
1. Sale completed
2. Ownership transitioned
3. Lien encumbrance created
4. Encumbrance visible until release

---

### 2.5 Lease Sale Workflow

**Required**
- VIN
- Lease transaction
- Lessee reference

**Flow**
1. Lease recorded
2. Ownership restricted
3. Lease encumbrance created
4. Lease expiration tracked

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

---

### 2.7 Service Appointment → Repair Order Workflow

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

### 2.9 Fleet Assignment → Maintenance Workflow

**Required**
- Fleet ownership record
- Assignment record

**Flow**
1. Driver assigned
2. Maintenance events tracked
3. Assignment changes logged
4. Ownership unchanged

---

## 3) Hard Stops (Non-Negotiable)

Execution must halt if:
- VIN missing
- Ownership unclear
- Encumbrance required but missing
- Workflow not defined in this document
- Jurisdiction mismatch

---

## 4) Unsupported Workflows

Not supported unless explicitly added:
- title filing with state
- insurance claim adjudication
- accident fault determination
- odometer fraud conclusions

Unsupported requests must:
- halt
- notify user
- log attempt

---

## 5) Versioning

- Jurisdiction: IL
- Vertical: Auto
- RAAS Module: Workflows
- Version: v1.0
- Last Reviewed: 2026-01-21

---

_End of Illinois Auto Workflows RAAS_
