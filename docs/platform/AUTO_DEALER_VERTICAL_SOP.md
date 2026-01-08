# TitleApp Auto Dealer Vertical SOP v1.0

## 1. Purpose
Define the operational rules, permissions, and automation boundaries
for the Auto Dealer vertical, with emphasis on lead conversion,
vehicle delivery, and post-sale follow-up.

This SOP enables automated sales support while preserving
dealer authority and regulatory responsibility.

---

## 2. Scope
Applies to:
- Independent and franchise auto dealers
- Primarily used vehicle sales
- Optional service department intake

---

## 3. Core Principle
AI supports sales and coordination.
Humans approve pricing, financing, and execution.

No AI action may finalize a sale or financing.

---

## 4. Allowed AI Actions

AI Workers MAY:
- Engage leads at any time (including after-hours)
- Qualify buyer intent and preferences
- Answer inventory and process questions
- Schedule test drives and appointments
- Draft non-binding sales documents (draft only)
- Prepare delivery and title checklists
- Generate daily sales summaries
- Initiate post-sale follow-ups

---

## 5. Prohibited AI Actions

AI Workers MAY NOT:
- Provide legal or financing advice
- Approve credit or loan terms
- Negotiate price autonomously
- Execute or finalize contracts
- Submit DMV or title filings
- Represent drafts as final or compliant
- Collect or process payments

These prohibitions are enforced at the endpoint level.

---

## 6. Sales Document Workflow

### Drafting
AI may draft:
- Buyer’s Order
- Purchase Agreement
- Lease Summary (non-binding)
- Service Authorization (draft)

All drafts must be labeled:
“Draft — Requires Dealer Approval”

---

### Approval
Dealer approval required before:
- Sending documents to customer
- Initiating signatures
- Marking vehicle as sold

Approvals are explicit and logged.

---

## 7. Lead Maturation Integration
This SOP extends:
- LEAD_MATURATION_SOP.md

Additional states:
- L5 — Sale Pending
- L6 — Sold / Delivered

AI permissions narrow as state advances.

---

## 8. Disclosures
Before automation is enabled, dealer must accept:
- TitleApp is not legal counsel
- Dealer retains compliance responsibility
- AI-generated documents are drafts
- All actions are logged for audit

Acceptance is versioned and immutable.

---

## 9. Pricing Integration
Pricing behavior governed by:
- PRICING_SOP.md

No automation fee is triggered without:
- Human-confirmed sale
- Valid KYC token

---

## 10. Audit & Logging
All actions log:
- userId
- tenantId
- leadId
- vehicleId (if applicable)
- documentId (if applicable)
- action + timestamp

---

## 11. Change Control
- Versioned
- Must align with:
  - KYC_SOP.md
  - CLIENT_ONBOARDING_SOP.md
  - LEAD_MATURATION_SOP.md
  - PERMISSION_MATRIX.md

---

## 12. Status
**Binding**
Violations are defects.
