# TitleApp RAAS — California Real Estate Workflows

This document defines the **authorized, compliant real estate workflows** supported by TitleApp
for the state of **California (CA)**.

If a workflow is not declared in this file, it is **not permitted** to execute automatically.
Unsupported workflows must be flagged, logged, and halted.

---

## 1. Scope

These workflows apply to:
- Licensed California real estate brokers
- Licensed California real estate salespersons
- Property managers operating under California law
- HOA managers and boards (where applicable)

This RAAS layer governs **process and sequencing**, not legal advice.

---

## 2. Core Workflow Principles

All California workflows must:

- Comply with California Civil Code and Business & Professions Code
- Align with California Department of Real Estate (DRE) guidance
- Require required disclosures **before** contract execution
- Preserve audit logs for all material steps
- Prevent execution if required RAAS components are missing

---

## 3. Supported Workflows (California)

### 3.1 Residential Property Sale (Standard)

**Description**  
Transfer of ownership for residential real property (1–4 units).

**Required Components**
- Executed purchase agreement
- Seller Transfer Disclosure Statement (TDS)
- Natural Hazard Disclosure (NHD)
- Agency disclosures
- HOA disclosures (if applicable)
- Title & escrow coordination

**Workflow Steps**
1. Buyer offer submitted
2. Seller acceptance
3. Mandatory disclosures delivered
4. Buyer acknowledgment recorded
5. Title opened
6. Contingency tracking
7. Close of escrow
8. Ownership recorded

---

### 3.2 Residential Lease (New Lease)

**Description**  
Creation of a new residential lease agreement.

**Required Components**
- Lease agreement
- Habitability disclosures
- Lead-based paint disclosure (if applicable)
- Rent control / just-cause notices (if applicable)
- HOA rules (if applicable)

**Workflow Steps**
1. Tenant application
2. Lease execution
3. Security deposit handling
4. Move-in condition documentation
5. Lease activation

---

### 3.3 Residential Lease Renewal

**Description**  
Extension or renewal of an existing residential lease.

**Required Components**
- Renewal addendum or new lease
- Rent increase notice (if applicable)
- Updated disclosures if required by law

**Workflow Steps**
1. Renewal notice issued
2. Terms accepted or negotiated
3. Lease extended
4. Updated records stored

---

### 3.4 Lease-to-Own / Option Agreements

**Description**  
Lease with option or path to purchase.

**Required Components**
- Lease agreement
- Option agreement
- Clear separation of rent vs option consideration
- Disclosure of non-ownership until exercise

**Workflow Steps**
1. Lease execution
2. Option agreement execution
3. Option tracking
4. Exercise or expiration handling

---

### 3.5 Property Management Workflow

**Description**  
Ongoing management of rental properties.

**Required Components**
- Property management agreement
- Tenant leases
- Maintenance and repair tracking
- Financial and notice reporting obligations

**Workflow Steps**
1. Management agreement executed
2. Tenant onboarding
3. Rent collection
4. Maintenance coordination
5. Owner reporting

---

### 3.6 HOA-Involved Sale or Lease

**Description**  
Any sale or lease involving HOA-governed property.

**Required Components**
- HOA resale disclosure package (sale)
- HOA governing documents (CC&Rs, bylaws, rules)
- HOA assessments and fee status
- HOA approval steps (if required)

**Workflow Steps**
1. HOA status identified
2. HOA documents requested
3. HOA disclosures delivered
4. Buyer or tenant acknowledgment
5. Transaction proceeds or halts

---

## 4. Unsupported / Restricted Workflows

The following are **not automatically supported** unless explicitly added:

- Commercial real estate sales (5+ units)
- Syndications
- Timeshares
- Fractional ownership
- Unlicensed party transactions

Attempting these workflows must result in:
- Execution halt
- User notification
- Logged exception

---

## 5. Enforcement Rules

- A workflow **must** match this RAAS definition to proceed
- Missing disclosures = hard stop
- Missing contracts = hard stop
- Jurisdiction mismatch = hard stop
- Rent control conflicts = hard stop until resolved

---

## 6. Versioning

- Jurisdiction: CA
- Vertical: Real Estate
- RAAS Version: v1.0
- Last Reviewed: 2026-01-21

---

## 7. Disclaimer

TitleApp provides workflow structure and compliance guardrails.
It does **not** provide legal advice.
Users are responsible for ensuring all contracts and actions comply with applicable law.

---

_End of California Real Estate Workflows RAAS_
