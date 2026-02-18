# RAAS -- Auto -- California (CA)

This directory defines the **Rules as a Service (RAAS)** package for **automotive dealership
operations in the State of California**.

It is designed for **new vehicle dealers, used vehicle dealers, service departments,
and fleet operators**.

> Not legal advice.
> TitleApp enforces declared workflows and guardrails; clients remain responsible for
final statutory compliance and DMV filings.

---

## 1) Scope of Coverage (California)

Auto RAAS for California supports:

### Sales
- New vehicle sales
- Used vehicle sales
- Cash transactions
- Financed transactions (lien noted via ELT)
- Leases (lease encumbrance noted)
- Trade-ins
- Dealer-required disclosures (high-level)

### Service
- Service appointments
- Repair orders (ROs)
- Warranty vs customer-pay service
- Recall documentation
- Smog certification tracking
- Ongoing service history continuity

### Ownership
- Ownership transitions
- Smog certification as a transfer prerequisite
- Title brand tracking (salvage, lemon buyback, rebuilt, flood)
- Lien and lease encumbrances with ELT status
- Owner vs customer vs driver distinction
- Report of Sale (REG 51) reference tracking

### Fleet
- Business or municipal fleet ownership
- Multiple drivers per vehicle
- Scheduled maintenance
- Bulk service events
- Vehicle rotation in and out of fleet
- Fleet smog compliance tracking

---

## 2) What This RAAS Does NOT Do (Explicitly)

California Auto RAAS does **not**:
- File title or registration documents with the California DMV
- Submit Business Partner Automation (BPA) transactions
- Replace Dealer Management Systems (DMS)
- Adjudicate warranty or Song-Beverly (Lemon Law) claims
- Process payments or calculate taxes
- Generate proprietary dealer contracts
- Verify smog certificates with the Bureau of Automotive Repair (BAR)
- Issue Temporary Operating Permits (TOPs)

TitleApp operates as a **neutral record, workflow, and audit layer**.

---

## 3) Regulatory Referencing Model (California)

RAAS references, but does not restate:
- California Vehicle Code (CVC)
- California Department of Tax and Fee Administration (CDTFA) motor vehicle tax rules
- Bureau of Automotive Repair (BAR) smog certification requirements
- Song-Beverly Consumer Warranty Act (Lemon Law)
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
5. **Smog certification is a hard stop for used vehicle sales**
6. **Title brands are immutable once recorded**
7. **Report of Sale (REG 51) reference required for all completed sales**
8. **Unsupported workflows are blocked**

---

## 5) California-Specific Additions

### Smog Certification
- Valid smog certificate required for title transfer of used vehicles (CVC Section 24007(b)(2))
- Certificate must be issued within 90 days prior to transfer
- Seller is responsible for providing the smog certificate
- Exemptions: new vehicles on first sale, diesel (1997 and older), zero-emission vehicles, vehicles four model years or newer, certain family transfers
- `smogStatus` tracked per vehicle (pass | exempt | required)

### Title Brands
- `titleBrand` tracked per vehicle (clean | salvage | lemon_buyback | rebuilt | flood)
- Salvage: vehicle declared total loss by insurer (CVC Section 544)
- Lemon buyback: repurchased under Song-Beverly; brand is permanent and must be disclosed
- Title brands are immutable once set by a state authority

### Electronic Lien and Title (ELT)
- California uses ELT as the standard method for recording liens
- `eltStatus` tracked per encumbrance (none | pending | active)
- Upon lien satisfaction, lienholder releases ELT

### Report of Sale (REG 51)
- Required for every vehicle sale in California
- `reportOfSaleRef` recorded on every sale transaction

### District Tax
- California has district-level taxes in addition to the base state sales tax rate
- `districtTaxRate` recorded for audit trail; TitleApp does not calculate or collect

### Temporary Operating Permit (TOP)
- `topIssued` tracked on applicable sale transactions
- TitleApp does not issue TOPs

### Dealer Bond
- $50,000 surety bond required for California dealers
- Bond status recorded for compliance visibility

---

## 6) Package Structure (California)

```
raas/auto/CA/
  README.md              <- This file
  data-model/README.md   <- Entities + required fields
  ownership/README.md    <- Ownership, ELT, title brands, smog
  service/README.md      <- Service & RO workflows
  fleet/README.md        <- Fleet-specific workflows
  workflows/README.md    <- End-to-end state machines
```

---

## 7) Versioning & Governance

- Jurisdiction: California
- Vertical: Auto
- RAAS Version: v1.0
- Review cadence: Monthly
- Emergency updates permitted for material changes
- Last Reviewed: 2026-02-18
