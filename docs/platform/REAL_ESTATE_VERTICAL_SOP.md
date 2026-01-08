# TitleApp Real Estate Vertical SOP v1.0

## 1. Purpose
Define the operational rules, permissions, and automation boundaries
for the Real Estate vertical (residential and commercial).

This SOP enables automated lead maturation and document drafting
while preserving broker authority and regulatory responsibility.

---

## 2. Scope
Applies to:
- Licensed real estate brokers and agents
- Residential and commercial transactions
- Buyer-side and seller-side workflows

---

## 3. Core Principle
AI performs engagement, coordination, and drafting.
Humans approve, sign, and execute.

No AI action may create a binding obligation.

---

## 4. Allowed AI Actions

AI Workers MAY:
- Engage leads at any time (including after-hours)
- Qualify buyers and sellers
- Schedule showings and meetings
- Draft offers, counters, LOIs, and P&S agreements (draft only)
- Revise drafts based on broker input
- Track contingencies and deadlines
- Generate daily broker summaries

---

## 5. Prohibited AI Actions

AI Workers MAY NOT:
- Provide legal advice
- Assert regulatory compliance
- Negotiate price autonomously
- Submit offers or counters
- Execute signatures
- File MLS, escrow, or county documents
- Represent drafts as final or binding

These prohibitions are enforced at the endpoint level.

---

## 6. Offer & Contract Workflow

### Drafting
- AI may generate drafts labeled:
  “Draft — Requires Broker Approval”
- Each revision is versioned

### Approval
Broker approval required before:
- Sending offers
- Sending counteroffers
- Initiating signatures
- Advancing lead to “Under Contract”

Approval is explicit and logged.

---

## 7. Disclosures
Before automation is enabled, broker must accept:
- TitleApp is not legal counsel
- Broker retains compliance responsibility
- AI-generated documents are drafts
- All actions are logged for audit

Acceptance is versioned and immutable.

---

## 8. Lead Maturation Integration
This SOP extends:
- LEAD_MATURATION_SOP.md

Additional state:
- L5 — Under Contract
- L6 — Closed

AI actions narrow as state advances.

---

## 9. Pricing Integration
Pricing behavior governed by:
- PRICING_SOP.md

No fee is triggered without:
- Human-confirmed close
- Valid KYC token

---

## 10. Audit & Logging
All actions log:
- userId
- tenantId
- leadId
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
