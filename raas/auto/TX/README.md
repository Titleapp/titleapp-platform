# RAAS -- Auto -- Texas (TX)

This directory defines the **Rules as a Service (RAAS)** package for **automotive dealership
operations in the State of Texas**.

It is designed for **new vehicle dealers, used vehicle dealers, service departments,
and fleet operators**.

> Not legal advice.
> TitleApp enforces declared workflows and guardrails; clients remain responsible for
final statutory compliance and TxDMV filings.

---

## 1) Scope of Coverage (Texas)

Auto RAAS for Texas supports:

### Sales
- New vehicle sales
- Used vehicle sales
- Cash transactions
- Financed transactions (lien noted via webDEALER)
- Leases (lease encumbrance noted)
- Trade-ins
- Dealer-required disclosures (high-level)

### Service
- Service appointments
- Repair orders (ROs)
- Warranty vs customer-pay service
- Recall documentation
- Ongoing service history continuity

### Ownership
- Ownership transitions
- Form 130-U reference tracking
- Vehicle Transfer Notification (VTN) documentation
- webDEALER submission tracking
- Lien and lease encumbrances
- Owner vs customer vs driver distinction

### Fleet
- Business or municipal fleet ownership
- Multiple drivers per vehicle
- Scheduled maintenance
- Bulk service events
- Vehicle rotation in and out of fleet
- Gross weight tracking for tax routing

---

## 2) What This RAAS Does NOT Do (Explicitly)

Texas Auto RAAS does **not**:
- File title or registration documents with TxDMV
- Interact with webDEALER directly
- Replace Dealer Management Systems (DMS)
- Adjudicate warranty claims
- Process payments, calculate taxes, or compute Standard Presumptive Value (SPV)
- Generate proprietary dealer contracts
- File Vehicle Transfer Notifications on behalf of sellers
- Issue metal plates or temporary tags

TitleApp operates as a **neutral record, workflow, and audit layer**.

---

## 3) Regulatory Referencing Model (Texas)

RAAS references, but does not restate:
- Texas Transportation Code (Title 7)
- Texas Tax Code (Chapter 152, Motor Vehicle Sales Tax)
- TxDMV dealer licensing and bond requirements
- HB 718 (89th Legislature, 2025) -- metal plates at point of sale
- HB 3297 (89th Legislature, 2025) -- abolishment of annual safety inspections for non-commercial passenger vehicles
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
5. **Gross weight must be recorded for tax collection routing**
6. **Form 130-U reference required for all completed sales**
7. **Metal plate issuance at POS must be confirmed (HB 718)**
8. **Unsupported workflows are blocked**

---

## 5) Texas-Specific Additions

### Motor Vehicle Sales Tax
- 6.25% state motor vehicle sales tax
- For vehicles 11,000 lbs gross weight or less: dealer collects tax
- For vehicles over 11,000 lbs: buyer remits tax to County Tax Assessor-Collector (CTAC) within 30 days
- `grossWeight` must be recorded on every sale transaction to determine the tax collection path
- TitleApp records tax reference amounts but does not calculate or collect taxes

### Standard Presumptive Value (SPV)
- SPV applies to private-party used vehicle sales for tax purposes
- TitleApp does not compute SPV; it records references only

### Form 130-U
- Application for Texas Title and/or Registration
- `form130URef` required on every completed sale transaction
- TitleApp records the reference but does not file the form

### webDEALER
- Texas requires all licensed dealers to process title/registration through webDEALER
- `webDealerSubmissionRef` recorded on applicable transactions
- TitleApp does not interact with webDEALER directly

### Metal Plates at Point of Sale (HB 718)
- HB 718 requires metal license plates to be issued at the point of sale
- `metalPlateIssuedAtPOS` must be confirmed on every completed sale
- Paper temporary tags are no longer standard
- TitleApp records plate issuance as an event

### Safety Inspection Abolishment (HB 3297)
- Annual safety inspections abolished for non-commercial passenger vehicles
- Commercial vehicles and those over 26,001 lbs GVWR remain subject to inspection
- Emissions inspections remain required in designated counties
- Historical inspection records preserved in vehicle timeline

### Vehicle Transfer Notification (VTN)
- Seller should file VTN with TxDMV within 30 days of sale
- Protects seller from post-sale liability
- TitleApp records the filing as an event; does not file on behalf of seller

### Dealer Bond
- $25,000 surety bond required for Texas dealers
- Bond status recorded for compliance visibility

---

## 6) Package Structure (Texas)

```
raas/auto/TX/
  README.md              <- This file
  data-model/README.md   <- Entities + required fields
  ownership/README.md    <- Ownership, VTN, webDEALER
  service/README.md      <- Service & RO workflows
  fleet/README.md        <- Fleet-specific workflows
  workflows/README.md    <- End-to-end state machines
```

---

## 7) Versioning & Governance

- Jurisdiction: Texas
- Vertical: Auto
- RAAS Version: v1.0
- Review cadence: Monthly
- Emergency updates permitted for material changes
- Last Reviewed: 2026-02-18
