# RAAS -- Auto -- Florida (FL)

This directory defines the **Rules as a Service (RAAS)** package for **automotive dealership
operations in the State of Florida**.

It is designed for **new vehicle dealers, used vehicle dealers, service departments,
and fleet operators**.

> Not legal advice.
> TitleApp enforces declared workflows and guardrails; clients remain responsible for
final statutory compliance and FLHSMV filings.

---

## 1) Scope of Coverage (Florida)

Auto RAAS for Florida supports:

### Sales
- New vehicle sales
- Used vehicle sales
- Cash transactions
- Financed transactions (lien noted on electronic title)
- Leases (lease encumbrance noted)
- Trade-ins
- Nonresident sales (DR-123 tracking)
- Dealer-required disclosures (high-level)

### Service
- Service appointments
- Repair orders (ROs)
- Warranty vs customer-pay service
- Recall documentation
- Ongoing service history continuity

### Ownership
- Ownership transitions
- Electronic title (e-title) status tracking
- Lien and lease encumbrances with e-title notation
- Owner vs customer vs driver distinction
- Plate disposition (plates stay with seller)
- 30-day dealer title submission window

### Fleet
- Business or municipal fleet ownership
- Multiple drivers per vehicle
- Scheduled maintenance
- Bulk service events
- Vehicle rotation in and out of fleet

---

## 2) What This RAAS Does NOT Do (Explicitly)

Florida Auto RAAS does **not**:
- File title or registration documents with FLHSMV
- Replace Dealer Management Systems (DMS)
- Adjudicate warranty claims
- Process payments or calculate taxes
- Generate proprietary dealer contracts
- Interact with the Electronic Lien and Title (ELT) system
- File Form DR-123 for nonresident sales
- Process plate transfers or surrenders

TitleApp operates as a **neutral record, workflow, and audit layer**.

---

## 3) Regulatory Referencing Model (Florida)

RAAS references, but does not restate:
- Fla. Stat. Ch. 319 (Certificates of Title)
- Fla. Stat. Ch. 320 (Motor Vehicle Registration)
- FLHSMV dealer licensing and bond requirements
- FTC Used Car Rule
- Federal warranty and recall guidance

If regulatory uncertainty exists:
- workflow execution must halt
- the issue is logged
- user is notified

---

## 4) Core Enforcement Principles

1. **VIN is mandatory to finalize records**
2. **Service history is append-only**
3. **Ownership changes are events, not overwrites**
4. **Encumbrances must remain visible**
5. **E-title status must be tracked per vehicle**
6. **Plate disposition must be recorded at every ownership transition**
7. **Unsupported workflows are blocked**

---

## 5) Florida-Specific Additions

### Electronic Title (E-Title)
- Florida uses electronic titles as the default titling method
- `eTitleStatus` tracked per vehicle (electronic | paper | converted | pending)
- Lien notations recorded on the electronic title record

### Plate Disposition
- In Florida, license plates remain with the seller, not the vehicle
- `plateTransferType` recorded at every ownership transition
- Options: retained_by_seller | surrendered | transferred_to_new_vehicle

### 30-Day Dealer Window
- Dealers have 30 calendar days from sale date to submit title and registration to FLHSMV
- `dealerTitleSubmissionDeadline` computed and surfaced

### Nonresident Sales (DR-123)
- Nonresident buyers may be eligible for partial sales tax exemption
- Form DR-123 status tracked (pending | filed | expired)
- 45-day filing window monitored

### Dealer Bond
- $25,000 surety bond required for Florida dealers
- Bond status recorded for compliance visibility (active | expired | unknown)

### Tax Structure
- 6% state sales tax
- County discretionary surtax (applied to first $5,000)
- Tax amounts recorded as reference; TitleApp does not calculate or collect

---

## 6) Package Structure (Florida)

```
raas/auto/FL/
  README.md              <- This file
  data-model/README.md   <- Entities + required fields
  ownership/README.md    <- Ownership, e-title, encumbrances
  service/README.md      <- Service & RO workflows
  fleet/README.md        <- Fleet-specific workflows
  workflows/README.md    <- End-to-end state machines
```

---

## 7) Versioning & Governance

- Jurisdiction: Florida
- Vertical: Auto
- RAAS Version: v1.0
- Review cadence: Monthly
- Emergency updates permitted for material changes
- Last Reviewed: 2026-02-18
