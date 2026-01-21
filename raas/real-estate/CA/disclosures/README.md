# RAAS — Real Estate — California — Disclosures

> **Purpose (RaaS):** Provide a conservative, jurisdiction-specific disclosure “baseline” for California real estate transactions that the platform can **surface, track, and require acknowledgment for**.
>
> **Not legal advice.** Client is responsible for compliance, final forms, and legal review.

---

## 0) Scope & Philosophy

### What this module does
- Defines **when disclosures are required** (triggers).
- Defines **what disclosures are commonly required** (checklist).
- Defines **how they are delivered + acknowledged** (workflow expectations).
- Defines **evidence** we store to prove delivery/acknowledgment.

### What this module does *not* do
- It does **not** replace broker counsel, attorneys, or escrow.
- It does **not** guarantee completeness for every property type or city/county overlay.
- It does **not** publish proprietary association forms (unless licensed).

### Conservative default
If uncertain, platform defaults to:
- “**disclose more**”
- “**deliver earlier**”
- “**record proof**”

---

## 1) Transaction Types Covered (CA)

This disclosure module applies to:
- **Residential purchase** (1–4 units)
- **Residential lease** (consumer)
- **Lease-to-own / option** (treated as purchase-like for disclosures)
- **Seller financing** (purchase-like + financing overlays)
- **Commercial purchase/lease** (supported, but requires expanded disclosures; see §7)

If transaction type is unknown: treat as **Residential purchase** until clarified.

---

## 2) Parties & Roles

- **Seller/Landlord**: primary disclosure obligation origin.
- **Buyer/Tenant**: must receive + acknowledge.
- **Agent/Broker**: delivery coordination + documentation.
- **Platform**: provides tracking + evidence + reminders; does not become counsel.

---

## 3) Disclosure Buckets (Canonical Categories)

All disclosures must be mapped into one of these buckets (machine-friendly):

1. **Property Condition**
2. **Title / Ownership / Encumbrances**
3. **Occupancy / Tenancy**
4. **Environmental / Hazards**
5. **Financial / Taxes / Assessments**
6. **HOA / Common Interest Development**
7. **Local / Municipal / Zoning**
8. **Agency / Representation**
9. **Consumer / Anti-Discrimination**
10. **Lead / Health / Safety**
11. **Insurance / Claims / Loss History**
12. **Construction / Permits / Alterations**
13. **Utilities / Shared Systems / Easements**
14. **Material Facts (Catch-all)**

---

## 4) Minimum Disclosure Checklist (Baseline)

> This is a **baseline**. Your licensed form library (if any) should populate the actual document templates.

### A) Always evaluate (most deals)
- Agency / representation disclosures (who represents whom)
- Transfer / sale disclosures (condition/material facts)
- Known defects, repairs, water intrusion, mold indications
- Neighborhood nuisances or disputes known to seller/agent
- HOA docs (if applicable): CC&Rs, bylaws, rules, budgets, reserves, assessments, meeting minutes

### B) Common triggers
- **Older construction / renovations** → lead + permit/alteration + contractor disclosures
- **HOA** → HOA document set + assessments + special assessments + litigation/insurance info
- **Rental property / occupied** → estoppel, rent roll, leases, deposits, notices, tenant rights
- **Solar / PPA / leased equipment** → agreement disclosure + transfer terms
- **Insurance claims / wildfire/flood risk areas** → loss history + insurance availability issues
- **Shared driveways / access** → easements, maintenance agreements, shared utilities
- **Deaths on property / stigmatized** → evaluate statutory requirements + client policy

### C) Financing overlays (when lending present)
- Seller carry / private financing → financing terms disclosure + required notices
- Assumptions / wrap / sub-to style structures → heightened “material fact” disclosures

---

## 5) Evidence We Must Store (Audit Trail)

For each disclosure artifact, store:
- `disclosureId` (platform-generated)
- `bucket` (from §3)
- `title` (human-readable)
- `version` (string; e.g., “v2026-01”)
- `source` (state / local / association / client custom / platform template)
- `deliveryMethod` (email / portal / e-sign / in-person)
- `deliveredAt` (timestamp)
- `recipient` (buyer/tenant name + email or account id)
- `ackMethod` (checkbox / e-sign / initial / reply)
- `ackAt` (timestamp)
- `files` (hash + storage pointer)
- `notes` (optional)

**Rule:** if `deliveredAt` exists and `ackAt` missing after threshold → trigger reminders/escalation.

---

## 6) Delivery & Timing Rules (Conservative Defaults)

### Purchase (baseline)
- Deliver disclosures **as early as possible**, ideally before offer acceptance where feasible.
- If post-acceptance: deliver within client policy window and track acknowledgments.

### Lease (baseline)
- Deliver required disclosures **before lease signing**.
- Acknowledgment required **before keys** (client policy default).

### If a disclosure changes
- If any disclosure is amended or replaced:
  - mark prior as `superseded`
  - re-deliver
  - require new acknowledgment

---

## 7) Commercial / Multi-Unit Notes (CA)

Commercial and 5+ unit transactions often require:
- rent rolls, leases, estoppels, service contracts
- environmental evaluations (Phase I/II) depending on property
- ADA considerations
- fire/life/safety compliance disclosures
- local municipal and zoning constraints

**Platform default:** If `assetClass = commercial` OR `units >= 5` → flag “Commercial disclosure expansion required”.

---

## 8) Hard Stops vs Soft Stops (Platform Enforcement)

### Hard Stop (cannot proceed)
- Buyer/Tenant acknowledgment missing for **critical** disclosure set required by transaction type.

### Soft Stop (warn + allow proceed)
- “Recommended” disclosures not acknowledged (allowed, but logged).
- Local overlays pending but not confirmed.

**Default:** treat baseline purchase/lease disclosures as **critical** unless client policy overrides.

---

## 9) Local Overlay Hooks (County/City)

This module supports overlays without changing the baseline.

Overlays live at:
- `raas/real-estate/CA/disclosures/overlays/<county>/...`
- `raas/real-estate/CA/disclosures/overlays/<city>/...`

**Rule:** overlay cannot remove baseline requirements; it can only add/clarify.

---

## 10) Licensing / Form Providers (Important)

If your brokerage uses a proprietary form library (CAR, broker forms, attorney forms):
- This RAAS module should reference them by **identifier**, not embed copyrighted text.
- Actual PDFs/templates should be in a licensed, access-controlled location.

---

## 11) Next Files (we do later)

After this README is committed, next steps are:
1) `raas/real-estate/CA/contracts/README.md`
2) `raas/real-estate/CA/workflows/README.md`

---

## 12) Change Log

- v0.1 — Initial baseline structure (disclosures-first)

