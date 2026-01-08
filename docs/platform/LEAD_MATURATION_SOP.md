# TitleApp Lead Maturation SOP v1.0

## 1. Purpose
Define how TitleApp captures, qualifies, nurtures, and hands off leads using AI Workers,
without human intervention until value is created.

This SOP governs pre-sales behavior only.
It does not authorize execution, contracts, or payments.

---

## 2. Applicable Verticals
- Real Estate
- Automotive
- HOA
- Any sales-driven tenant

---

## 3. Lead Entry Points
Leads may originate from:
- Website forms
- Chat (Sales GPT)
- Third-party feeds (e.g., Zillow-style)
- Manual import (CSV / CRM sync)

All leads enter in **Unqualified** state.

---

## 4. Canonical Lead States

### L0 — New / Unqualified
- No intent confirmed
- No contact verified
- AI allowed to ask discovery questions

### L1 — Engaged
- Contact method confirmed
- Basic needs captured
- Budget or timeline hinted

### L2 — Qualified
- Clear intent
- Timeline identified
- Budget range known
- Asset or criteria defined

### L3 — Scheduled
- Showing / test drive / consult scheduled
- Human notified
- Calendar event created

### L4 — Offer-Ready
- Terms drafted (non-binding)
- Documents prepared for review
- Awaiting human approval

---

## 5. AI Worker Permissions

AI Workers MAY:
- Ask clarifying questions
- Answer FAQs
- Draft non-binding summaries
- Propose next actions
- Schedule events

AI Workers MAY NOT:
- Make promises
- Submit offers
- Sign documents
- Commit pricing
- Execute payments

---

## 6. Human Handoff Rules
Human notification occurs only when:
- Lead reaches L2 or higher
- Or user explicitly requests a human

Handoff package must include:
- Lead summary
- Conversation history
- Qualification score
- Recommended next step

---

## 7. Scheduling Logic
- AI may propose times
- Uses tenant calendar availability
- Human may override or confirm

---

## 8. Audit & Logging
Every lead state transition logs:
- leadId
- previousState → newState
- triggering action
- AI or human actor
- timestamp

---

## 9. Change Control
- Versioned
- Must align with:
  - CLIENT_ONBOARDING_SOP.md
  - PERMISSION_MATRIX.md
  - PLATFORM_ENDPOINT_SOP.md

---

## 10. Status
**Binding**
Violations are defects.
