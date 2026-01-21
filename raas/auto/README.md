# RAAS — Auto (Vertical)

This directory defines the **Rules as a Service (RAAS)** baseline for the **Auto vertical**
across supported jurisdictions.

Auto RAAS is designed for real dealership operations, including:
- New & used vehicle sales
- Finance and lease deals (encumbrances)
- Trade-ins
- Service appointments and repair orders (ROs)
- Warranty and recall documentation
- Fleet ownership and maintenance workflows

> ⚠️ Not legal advice.  
> TitleApp provides workflow structure and compliance guardrails, not legal conclusions.

---

## 1) Core Objective

**Sales → Service continuity** is the primary wedge:
A vehicle’s history should not “break” when it is sold, traded, or reassigned.

TitleApp Auto RAAS enforces:
- append-only vehicle history
- explicit ownership transition events
- visible encumbrances (lien/lease)
- auditable service timelines

---

## 2) Design Principles (Non-Negotiable)

1. **VIN-first**
   - VIN is the primary identifier for a vehicle record.
   - If VIN is missing, the system may create a draft record but must prompt to finalize.

2. **Event-sourced lifecycle**
   - Sale, service, recall, ownership change, fleet reassignment are all **events**.
   - Events are never silently deleted. Corrections are made via superseding events.

3. **Workflow-gated**
   - Automated actions require a declared workflow in RAAS.
   - Unsupported workflows must be flagged and halted.

4. **Encumbrance-aware**
   - If lien/lease exists, the platform must not imply unencumbered ownership.
   - Encumbrances remain attached until explicitly released/expired.

5. **System-of-record compatibility**
   - Dealerships already run a DMS and service tools.
   - TitleApp does not replace them; it references their identifiers (deal number, RO number)
     and preserves the neutral, auditable record.

---

## 3) Jurisdiction Packages

Jurisdiction-specific RAAS lives under:

raas/auto/<STATE>/

makefile
Copy code

Example:

raas/auto/IL/

sql
Copy code

Each jurisdiction contains:

raas/auto/<STATE>/
README.md
data-model/README.md
sales/README.md
service/README.md
ownership/README.md
fleet/README.md
workflows/README.md

yaml
Copy code

---

## 4) Regulatory Referencing (Avoid Doom Loops)

RAAS references authorities without restating statutes:
- state motor vehicle codes (by name)
- attorney general consumer guidance
- FTC consumer rules (used car, warranties, etc.)
- agency bulletins where applicable

RAAS changes are:
- reviewed by humans
- versioned
- released on a scheduled cadence (monthly) with emergency hotfix capability

---

## 5) Data & Customer Privacy Posture (Baseline)

Auto RAAS distinguishes:
- **Customer** (person or business interacting with dealer)
- **Owner** (legal owner of vehicle record)
- **Driver** (authorized operator; common in fleet)
- **Dealer** (service provider and/or seller)

Visibility and transfer rules are governed by jurisdiction RAAS and client policy,
with audit logs for all access/ownership transitions.

---

## 6) Status

- Vertical: Auto
- RAAS Status: Active (baseline)
- Next: establish first jurisdiction package (IL) and then extend.

---

## 7) Next Step

Create the first jurisdiction package:
