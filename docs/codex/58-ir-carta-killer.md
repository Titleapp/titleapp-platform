# CODEX 58 — IR Worker: Carta Killer
# Status: SPEC — Review before build
# The framing: Carta charges $10K+/year. SOCIII includes everything in the base subscription.

---

## Red-Team Audit Results (2026-07-26)

Two blocking questions raised in the CODEX 57/58 review were verified against the actual code:

**RT-1: Tenant isolation for cap table injection — CONFIRMED CLOSED ✅**
`workerOwnData.js` has an `ownerTenantId` guard (lines 513–521). If `ownerTenantId` is absent or doesn't match the calling tenant ID, the response returns empty shareholders and zero shares. Direct-query transactions/loans/investors already use `where("tenantId", "==", tenantId)`. No cross-tenant leak exists in the current build.

**RT-2: 409A PWERM exit scenarios — CONFIRMED HARDCODED ⚠️**
The exit scenarios in `/ir:valuation:409a` are literal constants, identical across every tenant. They are not pulled from per-tenant Firestore config. Additionally, the methodology section below was documenting the wrong numbers — the doc said $15M/@40%, $50M/@30%, $25M/@20% but the actual code uses different scenarios (see corrected section below). Both `index.js` (line 24105) and `workerOwnData.js` (line 551) contain duplicate hardcoded copies — two sources of truth that could silently diverge. **Do not position the general-purpose 409A as a working multi-tenant feature until exit scenarios are made tenant-configurable.**

---

## What Carta Does (Feature Inventory)

| Feature | Carta | SOCIII Today | Delta |
|---|---|---|---|
| Cap table management | ✅ | ✅ | Done |
| 409A valuation | ✅ $3-5K/appraisal | ✅ AI-computed, real-time | Done — ADVANTAGE |
| SAFE instrument tracking | ✅ | ✅ | Done |
| Round modeling / dilution | ✅ | ✅ | Done |
| Equity grant issuance | ✅ | ⚠️ Partial (RSPA via DropboxSign) | Gap |
| Option pool management (ISO/NSO) | ✅ | ❌ | Gap |
| Option exercise tracking | ✅ | ❌ | Gap |
| Vesting schedule display | ✅ | ⚠️ Data stored, no vesting timeline UI | Gap |
| 83(b) deadline tracking | ✅ | ✅ | Done |
| Board consent / resolutions | ✅ | ⚠️ Governance ballots only | Gap |
| Investor data room | ✅ | ✅ | Done |
| Investor pipeline CRM | ✅ | ✅ | Done |
| SAFE signing flow | ✅ | ✅ DropboxSign | Done |
| KYC / accreditation | ✅ | ✅ Stripe Identity | Done |
| Reg D 506(b/c) compliance | ✅ | ✅ | Done |
| Reg CF support | ❌ | ✅ | Done — ADVANTAGE |
| Investor updates / communications | ✅ | ✅ | Done |
| K-1 / tax documents | ✅ | ⚠️ Template only, no generation | Gap |
| Secondary market (liquidity) | ✅ CartaX | ❌ | Future |
| Waterfall analysis | ✅ | ✅ | Done |
| Exit scenario modeling | ✅ | ✅ PWERM in 409A | Done |
| Employee-facing equity portal | ✅ | ❌ | Gap |
| Cap table import (from spreadsheet) | ✅ | ❌ | Gap |
| DocuSign / e-sign integration | ✅ | ✅ DropboxSign + typed consent | Done |
| Shareholder voting | ✅ | ✅ | Done |
| Fund formation / LP management | ✅ | ✅ | Done |
| AI chat across cap table | ❌ | ✅ Alex knows everything | ADVANTAGE |
| Immutable audit trail (Vault/DTC) | ❌ | ✅ | ADVANTAGE |
| Chat-driven grant issuance | ❌ | ⚠️ Partial | Build |
| Reg CF raise management | ❌ | ✅ | ADVANTAGE |
| Multi-model AI (Claude/GPT/Gemini) | ❌ | ✅ | ADVANTAGE |
| RAAS rules enforcement | ❌ | ✅ | ADVANTAGE |
| Shopify/Drive/Gmail integrations | ❌ | ✅ | ADVANTAGE |

---

## SOCIII Advantages Over Carta (Permanent Differentiators)

1. **Real-time AI 409A** — Carta charges $3,000–$5,000 per appraisal, takes 2-4 weeks. SOCIII computes in seconds, any time, and refreshes before each grant cycle. The disclaimer is honest: a qualified independent appraiser must sign for full safe harbor, but the AI computation provides the defensible basis — and eliminates the $5K fee for early-stage companies.

2. **Reg CF native** — Carta does not support Regulation Crowdfunding. SOCIII is built for it: investment limits enforcement, Form C assistance, investor onboarding, SAFE signing, accreditation checks. This is the right instrument for the SOCIII raise and for creator-economy founders who can't afford Carta's VC-tilted pricing.

3. **Alex knows your cap table** — Ask Alex "what happens to Kent's ownership if I raise $1M at a $10M valuation?" or "which advisors haven't filed their 83(b)?" Alex answers in seconds. Carta has no AI chat interface.

4. **Immutable Vault records** — Every equity event (grant, exercise, transfer) is a DTC written to the Vault. Immutable, portable, anchored. Carta's records live in Carta's database.

5. **Price** — SOCIII included in base subscription. Carta: $2,000–$10,000+/year plus per-409A fees plus per-transaction fees.

---

## Build Plan — Phased

### Phase 1 (August 2026 — for raise) — DONE + IN PROGRESS

**Done:**
- [x] Cap table seeded with real SOCIII data (Sean, Kent, advisors, SAFE terms)
- [x] 409A tab added to fundraise worker canvas (`Valuation409A.jsx`)
- [x] 409A backend route (`/ir:valuation:409a`) with three-approach blend — **SOCIII tenant only; PWERM is hardcoded, not tenant-configurable (see RT-2)**
- [x] `Valuation409ACard.jsx` for chat signal rendering
- [x] 83(b) deadline tracking and alerts in governance/capTable

**In Progress:**
- [ ] Vesting schedule timeline UI — show each shareholder's vesting cliff + monthly schedule as a Gantt-style bar
- [ ] 83(b) status per advisor on cap table tab (green checkmark / red warning)
- [ ] Option to export cap table as PDF (for board packets)

### Phase 2 (Q4 2026 — post-raise) — Option Pool + Grants

> **Prerequisites before building Phase 2** (Review Questions #1 and #5 are blockers, not parallel work):
> - Formal board established (currently informal — consent automation has nothing to automate without it)
> - ESOP resolution authorizing the option pool (no grants can issue without it)
> - RT-2 exit scenarios made tenant-configurable (before marketing 409A as a general-purpose feature)

**Option Pool Management:**
- Option pool size: X shares (configure from cap table)
- ISO vs NSO classification rules (ISO: employees only, max $100K/year vesting)
- Strike price: pulled from latest 409A computation
- Grant workflow: Alex proposes → board approval → employee acceptance → DTC mint
- Expiration tracking: 10-year term, 90-day post-termination exercise window
- Option exercise flow: employee exercises → shares issued → cap table updates

**Rule 701 Compliance Tracking:**
- Private company equity compensation has dollar-value disclosure triggers under Rule 701 over a rolling 12-month period
- Track aggregate grant value (shares × FMV per share) against the $10M threshold; above it, financial-statement disclosure is required before further grants
- Add a Rule 701 utilization indicator to the cap table tab alongside existing 83(b) tracking
- Especially relevant given simultaneous Reg CF raise — public fundraising + option issuance in the same period puts Rule 701 on the active compliance surface

**Board Consent Automation:**
- Board consent templates (option grants, officer appointments, fundraise authorization)
- Digital consent circulation (typed-name or DropboxSign)
- Unanimous written consent (UWC) generation
- Consent log in governance/capTable as immutable record

**Vesting Calendar:**
- Timeline view: each shareholder's cliff date + monthly vesting events
- Alerts: upcoming vesting events (30-day advance notice)
- Accelerated vesting triggers: change of control clause configuration

### Phase 3 (Q1 2027 — full parity + beyond)

**Employee Equity Portal:**
- Employee-facing view of their grant: shares, strike price, vesting schedule, current value
- Option exercise request flow
- Tax scenario calculator (ISO AMT vs NSO ordinary income)
- Exercise history and DTC records

**Cap Table Import:**
- CSV upload of existing cap table (from spreadsheet, Excel, Carta export)
- Validation: total shares, ownership percentages, instrument types
- Conflict resolution: what to do with existing Firestore data

**Secondary Market (Future):**
- Wefunder equity marketplace integration
- Carta X alternative: connect willing buyers/sellers of secondary shares
- ROFR (right of first refusal) enforcement — rules engine validates before any secondary transfer

**K-1 / Tax Document Generation:**
- AI-generated K-1 distributions based on waterfall math
- Partner allocations: pull from irDistributions collection
- PDF generation via Document Engine
- Annual mailing list: send K-1s to all investors by March 15

---

## 409A Methodology (Current Implementation)

The `/ir:valuation:409a` backend route computes:

**1. Asset Approach (10% weight)**
- Book equity = total assets − total debt
- Derived from seeded transaction data in Firestore

**2. Market Comparable — AI/SaaS Seed (40% weight)**
- Comparable companies: AI/SaaS seed stage ($1–5M ARR equivalent)
- Revenue multiple: 10x ARR (or 3x cost basis pre-revenue)
- Discount for lack of marketability (DLOM): 35%

**3. PWERM — Probability-Weighted Expected Return (50% weight)**
⚠️ Hardcoded in `index.js:24105` and `workerOwnData.js:551` — not tenant-configurable. Both files must stay in sync manually until this is extracted to per-tenant Firestore config.

Actual current values (as of 2026-07-26 audit):
- Exit scenario 1: Strong exit / IPO / acquisition ($50M EV, 12% probability) — 4 years
- Exit scenario 2: Moderate acquisition ($10M EV, 30% probability) — 3 years
- Exit scenario 3: Slow-growth acqui-hire ($3M EV, 35% probability) — 5 years
- Exit scenario 4: Wind-down ($0, 23% probability)
- Discount rate: 20% (early-stage risk premium, hardcoded)

**Blended EV → subtract debt → apply 35% DLOM → equity value → ÷ total shares = FMV per share**

**IRS Safe Harbor:** The target is to satisfy "reasonable valuation method" under IRC §409A and Treasury Regulation §1.409A-1(b)(5). The goal is that the AI computation establishes a defensible basis, reducing an independent appraiser engagement from a full $3–5K appraisal to a ~$1K review. **This cost-reduction claim has not yet been validated by a qualified valuation professional** — see Review Question 3. Until an actual appraiser confirms it, frame this as the intended outcome, not an established fact.

---

## Competitive Pricing Position

| Tier | Carta | SOCIII |
|---|---|---|
| Cap table + 409A | $10,000+/year | Included in $99/mo base |
| Per 409A appraisal | $3,000–$5,000 | $0 (AI-computed) ¹ |
| Option pool management | Included | Phase 2 (Q4 2026) |
| Employee equity portal | Included | Phase 3 (Q1 2027) |
| Reg CF support | Not available | Included |
| AI chat across cap table | Not available | Included |
| Audit trail / Vault | Not available | Included |

**Positioning for the raise:** "SOCIII is building what Carta should have been for the non-VC startup. Carta costs $10K+/year and requires a $3-5K 409A every time you grant options. We do both in real-time, included, and we're the only platform with native Reg CF support for the founder who's raising from their community, not just institutional VCs."

> ¹ **RT-2 caveat:** The $0 AI-computed 409A is currently SOCIII-tenant-only. The PWERM exit scenarios are hardcoded in two backend files and are not tenant-configurable. Do not present this row as a working general-purpose multi-tenant feature until that is resolved. If this table is pulled into a pitch deck or investor email, this footnote travels with it — "AI-computed, SOCIII tenant (multi-tenant roadmap Q4 2026)" is accurate; "$0 AI-computed" without the qualifier is not.
>
> ⚠️ More broadly: Phase 2/3 items in this table should carry their phase labels when extracted to any investor-facing material. "Included (Phase 2, Q4 2026)" is accurate; "Included" alone is not. Deadline pressure tends to strip these caveats. Watch for it.

---

## Review Questions (Decide Before Building Phase 2)

1. **Option pool size** — How many shares are in the option pool? Currently unallocated 200K in advisor pool, but formal ESOP not established. Need board resolution to establish.

2. **ISO vs NSO decision** — ISOs (employees) vs NSOs (advisors, contractors). Advisors always NSO. Employees can choose ISO (better tax treatment below $100K/year). Need to decide for Kent (employee → ISO eligible).

3. **409A sign-off** — Do we engage a qualified independent appraiser to review the AI computation before the first option grant? Recommend yes for the first grant (sets clean record for the raise).

4. **Wefunder vs direct** — Will the Reg CF raise be through Wefunder (most common) or another portal? This determines how the IR worker's SAFE signing integrates.

5. **Board composition** — Who sits on the board? Currently informal. If we add board consent automation, we need the board formally established.
