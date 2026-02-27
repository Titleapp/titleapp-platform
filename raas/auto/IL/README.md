# Digital Worker Rules — Auto — Illinois (IL)

This directory defines the **Digital Worker rules** package for **automotive dealership
operations in the State of Illinois**.

It is designed for **new vehicle dealers, used vehicle dealers, service departments,
and fleet operators**.

> ⚠️ Not legal advice.  
> TitleApp enforces declared workflows and guardrails; clients remain responsible for
final statutory compliance and DMV filings.

---

## 1) Scope of Coverage (Illinois)

Auto Digital Worker rules for Illinois support:

### Sales
- New vehicle sales
- Used vehicle sales
- Cash transactions
- Financed transactions (lien noted)
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
- Title events (recorded, not filed)
- Lien and lease encumbrances
- Owner vs customer vs driver distinction

### Fleet
- Business or municipal fleet ownership
- Multiple drivers per vehicle
- Scheduled maintenance
- Bulk service events
- Vehicle rotation in and out of fleet

---

## 2) What These Rules Do NOT Do (Explicitly)

Illinois Auto Digital Worker rules do **not**:
- File title or registration documents with the Secretary of State
- Replace Dealer Management Systems (DMS)
- Adjudicate warranty claims
- Process payments
- Generate proprietary dealer contracts

TitleApp operates as a **neutral record, workflow, and audit layer**.

---

## 3) Regulatory Referencing Model (Illinois)

Digital Worker rules reference, but do not restate:
- Illinois Vehicle Code
- Illinois Attorney General consumer guidance
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
5. **Unsupported workflows are blocked**

---

## 5) Package Structure (Illinois)

raas/auto/IL/
README.md ← This file
data-model/README.md ← Entities + required fields
sales/README.md ← Sales workflows
service/README.md ← Service & RO workflows
ownership/README.md ← Ownership & encumbrances
fleet/README.md ← Fleet-specific workflows
workflows/README.md ← End-to-end state machines

yaml
Copy code

---

## 6) Versioning & Governance

- Jurisdiction: Illinois
- Vertical: Auto
- Rules Version: v1.0 (baseline)
- Review cadence: Monthly
- Emergency updates permitted for material changes

---

## 7) Next Step

Define the **Auto data model**, which all workflows depend on:

raas/auto/IL/data-model/README.md

Copy code
