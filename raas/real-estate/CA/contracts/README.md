# RAAS — Real Estate — California — Contracts

> **Purpose (RaaS):** Provide a conservative, jurisdiction-aware **baseline contract library** for California real estate that is usable out-of-the-box, modifiable by clients, and auditable by the platform.
>
> **Not legal advice.** Clients are responsible for final review, customization, and compliance.

---

## 0) Philosophy

- Contracts are **templates + rules**, not static PDFs.
- Platform provides **safe defaults**, clients customize business terms.
- We bias toward **over-disclosure and clarity**.
- Platform tracks **which version** was used and **what was modified**.

Think: **GAAP for contracts**.

---

## 1) Contract Categories (CA)

All contracts must fall into one of these categories:

### A) Purchase & Sale
- Residential Purchase Agreement (RPA)
- Addenda (financing, appraisal, contingencies)
- Counteroffers / amendments
- Seller financing addendum
- Lease-option / lease-to-own addendum

### B) Lease
- Residential Lease (fixed / month-to-month)
- Lease addenda (pets, parking, utilities, disclosures)
- Commercial Lease (baseline only; expanded later)

### C) Financing
- Seller carry note
- Promissory note
- Deed of trust / security instrument (reference only)
- Disclosure addenda for non-traditional financing

### D) Occupancy & Tenancy
- Estoppel certificate
- Assignment of leases
- Rent roll certification
- Tenant notice acknowledgments

### E) Agency & Representation
- Buyer representation agreement
- Seller listing agreement (reference)
- Dual agency disclosure
- Broker compensation agreement (post-settlement safe baseline)

---

## 2) What the Platform Provides vs Client Provides

### Platform Provides
- **Structure** of each contract
- **Required clauses** (non-negotiable)
- **Optional clauses** (toggleable)
- **Jurisdictional warnings**
- **Change tracking**
- **Versioning**

### Client Customizes
- Price
- Dates
- Names
- Business terms
- Special conditions
- Local practice variations

---

## 3) Contract Metadata (Required)

Every contract instance must store:

- `contractType`
- `jurisdiction` (CA)
- `transactionType` (purchase, lease, etc.)
- `templateVersion`
- `createdAt`
- `createdBy`
- `modifiedSections[]`
- `signingMethod` (e-sign / wet)
- `executedAt`
- `relatedDisclosures[]`
- `relatedAssets[]` (property id, unit, VIN equivalent later)

---

## 4) Conservative Defaults (CA)

### Purchase
- Financing contingency ON by default
- Appraisal contingency ON
- Inspection contingency ON
- Seller disclosures REQUIRED before contingency removal
- Arbitration clauses OFF by default unless client opts in

### Lease
- Habitability disclosures REQUIRED
- Security deposit terms explicitly stated
- Entry notice + repair rights explicit
- Rent control / just cause notices included where applicable

### Seller Financing
- Treated as **high-risk**
- Mandatory disclosure addendum
- Mandatory acknowledgment
- Escalation warning surfaced in UI

---

## 5) Encumbrances & Existing Occupancy (Critical)

If **any** of the following are true:
- property occupied
- active lease
- option holder
- life estate / use right
- solar / PPA / equipment lease

Then contracts MUST:
- reference the encumbrance
- attach or reference the agreement
- require buyer acknowledgment

Hard stop if missing.

---

## 6) Licensing & Proprietary Forms

If client uses:
- CAR forms
- Broker-proprietary contracts
- Attorney-drafted agreements

Platform behavior:
- Store **form ID + version**
- Do NOT embed copyrighted text
- Still enforce metadata + workflow + disclosures

---

## 7) Enforcement Levels

### Hard Stop
- Missing required contract for transaction type
- Missing required signatures
- Missing required disclosure linkage

### Soft Stop
- Optional addenda not reviewed
- Recommended clauses toggled off

---

## 8) Audit & Defensibility

Platform must be able to answer:
- Which contract was used?
- Which version?
- What changed from default?
- Who changed it?
- When was it executed?
- What disclosures were tied to it?

---

## 9) Future Extensions (Not today)

- County/city overlays
- Smart clause activation
- AI red-flag review
- Cross-vertical reuse (auto, equipment, aircraft)

---

## 10) Change Log

- v0.1 — CA baseline contract structure

