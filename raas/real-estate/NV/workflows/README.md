# RaaS — Real Estate Workflows — Nevada (NV)

This directory defines **approved transaction workflows** for Nevada real estate
under the TitleApp Rules as a Service (RaaS) framework.

Workflows enforce **ordering, gating, and compliance checks** across
contracts and disclosures.

---

## Workflow Philosophy

- A transaction is a **state machine**, not a document dump
- Required steps cannot be skipped
- Compliance failures block progression
- Overrides are logged and auditable

---

## Supported Workflow Types (Baseline)

### 1) Residential Purchase
### 2) Residential Lease
### 3) Commercial Purchase (Baseline)
### 4) Commercial Lease (Baseline)
### 5) Seller Financing (Restricted)

---

## Canonical Workflow States

All workflows use the following states:

1. `initiated`
2. `intake-complete`
3. `disclosures-issued`
4. `disclosures-acknowledged`
5. `contract-generated`
6. `contract-executed`
7. `pre-close`
8. `closed`
9. `archived`

State regression is logged.

---

## Residential Purchase Workflow (NV)

### Required Sequence
1. Intake completed (property + parties)
2. Seller disclosures issued
3. Buyer acknowledgment recorded
4. Purchase agreement generated
5. Contract executed
6. Close transaction
7. Archive

### Hard Stops
- Contract generation blocked until disclosures acknowledged
- Closing blocked if statutory disclosures missing

---

## Residential Lease Workflow (NV)

### Required Sequence
1. Intake (unit + tenant)
2. Required disclosures issued
3. Lease agreement generated
4. Tenant acknowledgment
5. Lease execution
6. Archive

---

## Seller Financing Workflow (NV)

### Risk Classification
**HIGH**

### Additional Requirements
- Seller financing addendum required
- Financing disclosure required
- Buyer acknowledgment of non-bank financing

### Enforcement
- Workflow cannot proceed without disclosures
- Overrides require senior approval

---

## Audit & Logging Requirements

Each workflow produces:
- Timestamped state transitions
- Document versions used
- Disclosure acknowledgments
- Override log (if any)

---

## Local Overlays

County or municipal overlays may extend these workflows but may not:
- Remove required steps
- Bypass disclosure acknowledgments

---

## Versioning

- Baseline version: v0.1
- Review cadence: Monthly or emergency update
- Jurisdiction: Nevada (NV)

