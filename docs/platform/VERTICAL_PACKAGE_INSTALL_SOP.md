# TitleApp Vertical Package Install SOP v1.0

## 1. Purpose
Define the canonical process for installing and activating
a vertical package (e.g., Real Estate, Auto Dealer) for a tenant.

This SOP ensures verticals are installed consistently,
permissioned correctly, and fully auditable.

No UI, GPT, or worker may install a vertical outside this process.

---

## 2. What a Vertical Package Includes
Each vertical package installs:
- Vertical-specific SOP reference
- Allowed and prohibited actions
- Lead maturation extensions
- Document templates (draft-only)
- Required disclosures
- Capability requirements
- Default automation limits

Packages do not modify core platform rules.

---

## 3. Installation Preconditions

Before installation:
- Tenant exists
- Admin user exists
- Valid KYC token present (per KYC_SOP.md)
- Pricing mode selected (per PRICING_SOP.md)

If any precondition fails, installation must halt.

---

## 4. Installation Steps (Canonical Order)

### Step 1 — Package Selection
Admin selects a vertical package:
- `real_estate`
- `auto_dealer`
- future verticals

Selection is logged.

---

### Step 2 — Capability Check
System verifies required capabilities:
- endpoints available
- permissions compatible
- pricing mode supported

Failure blocks install.

---

### Step 3 — Disclosure Acceptance
Admin must accept:
- Vertical-specific disclosures
- Non-legal / non-financial disclaimers
- Audit and logging acknowledgement

Acceptance is versioned and immutable.

---

### Step 4 — Resource Provisioning
System provisions:
- Lead pipelines
- Document draft containers
- Worker slots (inactive)
- Reporting dashboards

No workers are deployed yet.

---

### Step 5 — Activation State
Vertical enters:
- `Installed` state

Automation remains limited until:
- Onboarding completed
- Required documents uploaded or generated
- Billing active

---

## 5. Post-Install Activation Gates

Vertical moves from `Installed` → `Operational` only when:
- Client onboarding completed
- Required documents present
- KYC verified
- Billing confirmed

Only then may:
- Workers be deployed
- Automation limits be lifted

---

## 6. Removal & Changes
- Vertical removal requires admin confirmation
- Historical data retained
- Reinstallation requires re-acceptance of disclosures

All changes are logged.

---

## 7. Audit & Logging
Each install logs:
- tenantId
- verticalId
- adminId
- timestamp
- version identifiers

---

## 8. Change Control
- Versioned
- Must align with:
  - CLIENT_ONBOARDING_SOP.md
  - PRICING_SOP.md
  - KYC_SOP.md
  - PERMISSION_MATRIX.md

---

## 9. Status
**Binding**
Violations are defects.
