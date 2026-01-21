# RAAS — Real Estate — California — Workflows

> **Purpose (RaaS):** Define **state-aware, defensible transaction workflows** that work out-of-the-box for California real estate, independent of a client’s internal SOPs.
>
> These workflows orchestrate **contracts + disclosures + status gates**.

---

## 0) Core Principle

Workflows are **enforced sequences**, not suggestions.

If a required step is missing:
- the platform blocks progress
- logs the exception
- records who overrode (if allowed)

---

## 1) Canonical Workflow Types (CA)

### A) Residential Purchase — Owner Occupied
### B) Residential Purchase — Tenant Occupied
### C) Residential Lease
### D) Lease-to-Own / Option
### E) Seller Financing Transaction

Each workflow references:
- contracts (from `/contracts`)
- disclosures (from `/disclosures`)
- role responsibilities (buyer / seller / broker)

---

## 2) Workflow State Machine (Shared)

All workflows use these states:

1. `initiated`
2. `intake-complete`
3. `disclosures-issued`
4. `contract-issued`
5. `under-review`
6. `executed`
7. `in-escrow` (if applicable)
8. `closed`
9. `archived`

State regression is **logged**.

---

## 3) Residential Purchase — Owner Occupied (CA)

### Required Inputs
- Property address
- Seller identity
- Buyer identity
- Occupancy status = owner-occupied

### Mandatory Steps
1. Intake complete
2. Seller disclosures issued
3. Buyer acknowledgment logged
4. Purchase agreement generated
5. Financing terms captured
6. Contract executed
7. Escrow initiated
8. Close + archive

### Hard Stops
- Contract cannot be issued before disclosures
- Contingency removal requires disclosure acknowledgment
- Execution blocked if disclosures missing

---

## 4) Residential Purchase — Tenant Occupied (CA)

### Additional Mandatory Steps
- Existing lease attached
- Estoppel certificate completed
- Tenant acknowledgment (where required)

### Hard Stops
- Buyer acknowledgment of tenancy
- Lease survivability clause required

---

## 5) Residential Lease (CA)

### Required Steps
1. Intake (unit + parties)
2. Habitability disclosures issued
3. Local rent control check
4. Lease generated
5. Addenda applied
6. Execution
7. Archive

### Notes
- Month-to-month defaults allowed
- Fixed term requires justification if rent controlled

---

## 6) Lease-to-Own / Option (CA)

### Risk Classification: HIGH

### Mandatory
- Lease agreement
- Option agreement
- Separate consideration disclosure
- Financing risk disclosure

### Hard Stop
- Buyer acknowledgment of non-ownership status

---

## 7) Seller Financing (CA)

### Mandatory
- Promissory note
- Financing disclosure
- Deed of trust reference
- Escalation warning

### Hard Stop
- Financing disclosures before contract execution

---

## 8) Disclosure Coupling Rule (Critical)

Every workflow step must assert:
- which disclosures are active
- which contracts reference them
- who acknowledged them

No “orphan disclosures.”

---

## 9) Overrides & Exceptions

### Allowed
- Broker-admin override with reason
- Logged and immutable

### Not Allowed
- Skipping disclosures
- Backdating execution
- Removing tenant acknowledgment

---

## 10) Audit Outputs (Minimum)

Each completed workflow produces:
- timeline of states
- documents used + versions
- disclosure acknowledgments
- override log (if any)

---

## 11) Future Hooks

- County overlays
- City rent control engines
- AI risk scoring
- Cross-asset reuse (auto, equipment)

---

## 12) Change Log

- v0.1 — CA workflow baseline

