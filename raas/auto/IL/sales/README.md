# RAAS — Auto — Illinois (IL) — Sales

This document defines the **authorized vehicle sales workflows** for Illinois dealerships
under TitleApp **Rules as a Service (RAAS)**.

Sales RAAS governs **transaction structure and sequencing**, not pricing, financing approval,
or legal interpretation.

---

## 1) Scope

Applies to:
- New vehicle sales
- Used vehicle sales
- Cash transactions
- Financed transactions
- Lease transactions
- Trade-ins

Sales RAAS ensures:
- required disclosures are acknowledged
- ownership transitions are recorded correctly
- encumbrances are explicitly noted
- service history continuity is preserved

---

## 2) Sale Types

### A) New Vehicle Sale
- Vehicle sold by franchised dealer
- May include OEM warranty
- May include financing or lease

### B) Used Vehicle Sale
- Dealer-owned used inventory
- Trade-in or auction sourced vehicles
- Subject to used vehicle disclosures

### C) Trade-In
- Incoming vehicle linked to outbound sale
- Trade-in VIN recorded
- Trade-in condition noted (high level)

---

## 3) Transaction Types

Each sale must declare one:

- `cash`
- `finance`
- `lease`

### Finance
- Creates lien encumbrance
- Lien holder reference required

### Lease
- Creates lease encumbrance
- Lessee ≠ owner
- Lease end date tracked (if available)

---

## 4) Required Components (Hard Stops)

Sale execution must halt unless:

- `vin` is present
- sale type declared (new | used)
- transaction type declared (cash | finance | lease)
- buyer reference present
- sale date present

Additional requirements:
- finance → lien reference required
- lease → lease encumbrance required

---

## 5) Ownership Transition Rules

1. Sale completion creates an **ownership change event**
2. Prior ownership is closed, not deleted
3. New ownership becomes active
4. Service history remains attached to vehicle
5. Encumbrances persist until released or expired

---

## 6) Disclosures & Acknowledgments (High-Level)

Sales RAAS requires acknowledgment of:
- used vehicle condition disclosures
- buyer guide / consumer notices
- agency or dealer disclosures (where applicable)

RAAS does **not** store proprietary disclosure text.
It records acknowledgment events and references.

---

## 7) External System References

Sales entries should support:
- `dealNumber` (DMS reference)
- `financeContractId` (if applicable)
- `leaseId` (if applicable)
- `tradeInVin` (if applicable)

---

## 8) Unsupported Actions

The following are not supported:
- title filing with Secretary of State
- tax calculation or remittance
- credit approval decisions
- contract generation

Unsupported requests must:
- halt execution
- notify the user
- log the attempt

---

## 9) Versioning

- Jurisdiction: IL
- Vertical: Auto
- RAAS Module: Sales
- Version: v1.0
- Last Reviewed: 2026-01-21
