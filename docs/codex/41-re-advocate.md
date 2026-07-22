# CODEX 41 — Real Estate Advocate
## The Pure-Fiduciary Property Companion — Price Discovery for Buyers and Sellers

**Status:** 🟡 live — Search/CMA/Analysis/Financing tabs functional; sell-side tabs spec'd, not built
**Slug:** `re-salesperson` (existing catalog entry; display name = "Real Estate Advocate")
**Vertical:** `real-estate` · **Suite:** Sales
**Catalog ID:** RES-001

---

## 0. Slug Conflict Resolution

An earlier design document used the same slug (`re-salesperson`) to describe a three-surface product: Surface 1 (Seller Portal), Surface 2 (Buyer Portal), Surface 3 (Professional Mode for licensed agents/brokers), and a planned Phase E (AI-vs-AI negotiation protocol).

**This CODEX supersedes that design.** The product shipped under this slug is the Advocate — a single consumer-facing tool that serves buyers and sellers, but not licensed professionals acting in an agency capacity. The earlier surfaces are resolved as follows:

| Earlier Surface | Status |
|---|---|
| Surface 2 — Buyer Portal | Shipped — this is the Advocate's core; §5 tabs cover it |
| Surface 1 — Seller Portal | Spec'd here in §5 (sell-side tabs); not yet built |
| Surface 3 — Professional Mode (B2B for agents/brokers) | **Descoped from this worker.** Not dead — belongs in a separate "Broker Tools" bundle alongside RE Marketing, Property Manager, and Site Recon. Those workers already serve the professional side. |
| Phase E — AI-vs-AI negotiation | **Deferred.** High legal exposure (agency, fiduciary duty, contract formation). Requires explicit legal sign-off. Flag this as a future platform capability, not a near-term product. |

Any future CODEX that describes Professional Mode or AI-vs-AI negotiation must use a different slug.

---

## 1. The One-Sentence Pitch

> The only real estate tool that works entirely for the person in front of it — no commission, no referral fee, no financial stake in whether the deal closes — and the only one that shows you what a property is actually worth, who can finance it, and what a transaction looks like on all sides, before you commit.

---

## 2. The Problem

The standard residential real estate transaction has a structural conflict on both sides:

**Buy side:** The buyer's agent is paid a percentage of the purchase price, which means they make more money when you buy more expensive property and less money when you walk away. Most agents are honest people trying to serve their clients well inside a broken incentive structure — but the incentive structure is the problem.

**Sell side:** The listing agent wants any offer to close — quickly, cleanly, enough to justify their commission. An agent who tells you "this offer is too low, hold firm" is asking you to do more work and accept more risk for their same fee. An agent who tells you "this condo project doesn't have FHA approval, so your buyer pool is narrower and you should price accordingly" is potentially killing the very deal they need to close.

**The same person often buys AND sells.** Selling your ski condo to buy a house, trading up, downsizing, doing a 1031 exchange — these are the same transaction from different angles, and a fiduciary should be able to hold both.

---

## 3. What the Advocate Does (Scope)

**In scope — price discovery and transaction support for consumers:**
- Property search with live listings and CMA against comparable sales
- Financing constraint identification: flood zone, fire hazard, FHA/VA condo eligibility, conforming loan limits, USDA eligibility
- Disclosure analysis for buyers: read and flag disclosures
- Offer strategy coaching: what to offer, which contingencies to keep, when to walk
- **Sell-side price discovery:** pricing your listing, net sheet (proceeds after costs), disclosure requirements, offer evaluation, FSBO vs. agent
- **Transaction structuring:** 1031 exchanges, seller financing, sale-leasebacks, installment sales — as a framework for understanding options, not legal or tax advice
- Market context: DOM trends, sale-to-list ratios, seasonal patterns

**Out of scope — this worker is not:**
- A mortgage broker or loan officer. Does not recommend loan products, assess creditworthiness, or quote rates.
- A licensed real estate attorney. Identifies issues; doesn't provide legal advice.
- A licensed appraiser. Provides CMA data (market-based), not certified appraisals.
- A licensed real estate agent or broker for the purposes of the transaction. Does not negotiate on behalf of the user in a legal agency capacity.
- An underwriting worker. (That's a future separate worker.)
- A tax advisor. 1031 exchange and installment sale content is educational — not a tax opinion.

---

## 4. The Agent Question — Competitor, Tool, or Both?

The Advocate is consumer-direct. It is not a tool that licensed agents and brokers use for their professional work — those workers exist already (RE Marketing, Property Manager, CRE Analyst, Site Recon, Zoning). The Advocate is what their buyer-clients get instead of, or alongside, a traditional buyer's agent.

**For Christina Soloski (listing agent, Tahoe) and Scott (CRE leasing/investing):**
- The Advocate is not their product. Their clients' products.
- From a listing agent's perspective: a buyer who arrived with an Advocate-generated CMA and financing constraint check is more prepared, less likely to blow up in escrow, and less likely to make an offer that can't be financed. That's good for a listing agent.
- From a tenant-rep or buyer-rep perspective: yes, the Advocate competes for that side of the fee. Post-NAR settlement, buyer's agent compensation is no longer built into MLS listings automatically — buyers increasingly pay their own agent or use alternatives. The Advocate is one such alternative.

**The EXP/flat-fee question:** The Advocate is different from EXP — it eliminates the buyer's agent commission entirely for buyers who choose to self-represent or use a flat-fee attorney. The Advocate handles the research and strategy layer; a flat-fee attorney handles the contract execution layer. Together they replace the traditional 2.5–3% buyer's agent commission.

**Broker Partnership tier:** Park until after direct-to-consumer traction is established. The product's fiduciary independence is the first thing a broker partnership erodes — see Red Team RT6.

---

## 5. Canvas Tabs

### Buy Side (current)

| Tab | What it shows |
|---|---|
| **Search** | Property search by criteria; CMA on any address; live listings with sale-to-estimate differential; DOM and market tempo. |
| **Financing** | *(live)* Flood zone (FEMA NFHL), fire hazard (CAL FIRE, CA only), FHA/VA condo project eligibility (HUD), conforming loan limits (FHFA 2025), USDA rural eligibility. Property facts only — not loan advice. |
| **Analysis** | Full CMA breakdown: comparables, price-per-sqft trend, DOM, sale-to-list ratio, fair value range. |
| **Offer Desk** | Offer strategy coaching: how much to offer, which contingencies to keep, escalation clause analysis, competing offer context. |
| **Transaction** | Offer tracking, contingency deadlines, disclosure checklist, inspection coordination. |
| **Documents** | Drive-connected: listing disclosures, preliminary title report, HOA docs, inspection reports, AI-searchable. |
| **Market** | Neighborhood market context: 90-day DOM trend, sale-to-list trend, active vs. sold inventory, seasonal pattern. |

### Sell Side (spec'd, not yet built)

| Tab | What it shows |
|---|---|
| **List** | Pricing your listing: CMA from the sell side ("what will buyers pay"), optimal price range, days-on-market risk at different price points, timing guidance (seasonal pattern), FSBO vs. agent decision support (cost/benefit, honest). |
| **Net Sheet** | Proceeds calculator: sale price minus payoff balance, real estate commission (if agent), transfer taxes (county + city), title insurance, escrow fees, prorated HOA/taxes, recording fees. Shows what you actually walk away with. |
| **Disclosures** | Seller disclosure requirements by state: CA = TDS + NHD + SPQ + AVID; NV = SRPD + CLUE. Flag what must be disclosed and what seller knows that affects price. Already partially built (CA TDS in advocate.js). |
| **Sell-Side Offers** | Offer evaluation from seller's perspective: is this offer fair? Which contingencies should I push back on? Should I counter or accept? Same Offer Desk logic, seller view. |
| **Exchange & Structure** | (see §6 below) |

---

## 6. Exchange & Structure Tab — 1031, Seller Financing, Sale-Leaseback

This is the tab that serves the "I'm selling and buying" customer — not just the first-time homebuyer.

### 1031 Exchange

**What it is:** A tax-deferred exchange under IRC §1031 — sell investment/business property, reinvest proceeds into like-kind property, defer capital gains tax. Does not apply to personal residence (use §121 exclusion for that).

**RAAS rules the Advocate must enforce:**

| Rule | Constraint | Source |
|---|---|---|
| Like-kind requirement | Both relinquished and replacement must be investment/business property — not personal use | IRC §1031(a) |
| 45-day identification | Replacement property must be identified within 45 calendar days of closing the sale | IRC §1031(a)(3)(A) |
| 180-day close | Must close on replacement within 180 calendar days of selling (or tax return due date if earlier) | IRC §1031(a)(3)(B) |
| Qualified Intermediary | Proceeds must go through a QI — seller must never touch the money | IRC §1031(a) |
| Boot rule | Cash or non-like-kind received ("boot") is taxable in the year received — cannot be deferred | IRC §1031(b) |
| Equal or greater value | To defer ALL capital gains, replacement must be equal or greater in value than relinquished | IRS guidance |
| Same taxpayer | Same legal entity must sell and buy — limited exceptions for certain entity changes | IRS Revenue Ruling 2002-83 |
| Related-party restriction | Buying from or selling to a related party triggers additional 2-year holding rule | IRC §1031(f) |
| Personal property exclusion | Effective post-TCJA 2017, §1031 only applies to real property — not personal property (equipment, vehicles) | Tax Cuts and Jobs Act 2017 |

**What the Advocate shows:**
- Can this sale qualify? (property type, use, ownership entity)
- Timeline tracker: sale close date → 45-day deadline → 180-day deadline
- "Boot" calculator: if you're buying down in value, estimate the taxable boot amount
- QI reminder: flags if user mentions taking possession of funds directly
- Clear disclaimer: "This is educational information about how 1031 works — not a tax opinion. Your CPA or tax attorney must review the transaction structure before you proceed."

**What the Advocate does NOT do:**
- Does not recommend a specific QI (RESPA-adjacent risk if fee-based relationship)
- Does not file the tax forms or certify qualification
- Does not advise on state tax treatment (most states conform to federal §1031 but some don't — CA has a clawback provision)

### Seller Financing (Installment Sale)

**What it is:** Seller acts as the lender — buyer makes payments directly to seller over time. Seller recognizes gain proportionally over the installment period (not all at once).

**Key facts:**
- Down payment + interest rate + amortization + balloon = terms negotiated between buyer and seller
- Dodd-Frank rule: individual sellers who sell more than 3 residential properties per year must use a licensed mortgage loan originator; selling 3 or fewer per year to non-family buyers = "seller financing exception"
- Benefits for seller: installment sale tax treatment (defer capital gains over multiple tax years, potentially staying in lower bracket)
- Benefits for buyer: more flexible qualification, potentially lower closing costs, creative structuring
- Risk for seller: buyer default — seller must foreclose to recover property; title insurance protects chain-of-ownership

**What the Advocate shows:**
- Basic installment sale calculator: sale price, down payment %, interest rate, term → monthly payment + seller's annual income recognition
- Dodd-Frank threshold flag (over 3 properties/year = must use MLO)
- Default/foreclosure risk flag
- Title search recommendation before agreeing to seller financing

### Sale-Leaseback

**What it is:** Owner sells property and simultaneously signs a lease to remain as tenant. Liquidity event while retaining operational use.

**Common use cases:**
- Business owner sells the building and leases it back from the new owner (frees capital, removes real estate from balance sheet)
- Residential: less common but exists — particularly for elderly homeowners who need liquidity (sale-leaseback programs from specialized buyers)
- Aviation, healthcare, industrial: very common for specialized facilities

**Key considerations:**
- For businesses: gain on sale recognized; future lease payments are operating expenses (deductible)
- Lease term and rent: market-rate rent + reasonable term; below-market rent triggers IRS scrutiny (may recharacterize as financing)
- 1031 eligibility: if selling investment property (not personal residence), can structure the sale as a 1031 and apply proceeds to a replacement property — the leaseback and the 1031 are not mutually exclusive
- Residential vs. commercial: residential sale-leaseback programs are often consumer-protection concerns (some states regulate them as predatory); flag buyer/seller asymmetry

**What the Advocate shows:**
- Lease economics calculator: implied cap rate from sale price + lease payments
- 1031 combination: if the seller is buying replacement property, are they eligible to combine leaseback with 1031?
- IRS below-market rent flag

### Land Contract / Contract for Deed

**What it is:** Buyer makes payments while seller retains legal title until paid off. At completion, deed transfers.

**Key facts:**
- Buyer has "equitable title" but seller holds legal title throughout
- Higher-risk structure for buyers (if they default, they may lose all payments — "forfeiture" vs. foreclosure)
- Some states have protections converting long-held land contracts to mortgage-equivalent (Minnesota, others)
- Often used when buyer can't qualify for conventional financing
- **Note:** Also called "land installment contract," "bond for deed," or "agreement for sale" depending on state

### Land Swap (Like-Kind)

**What it is:** Exchange one parcel for another. Qualifies as a 1031 exchange if both are investment/business property.

**Key distinction from 1031:** In a direct swap, no QI is required IF both parties exchange simultaneously and no cash changes hands. But if there's any cash differential, the boot is taxable — same rules apply.

**RAAS rule:** Land swap between parties with a price differential must route the cash differential through a QI to remain fully tax-deferred.

---

## 7. Financing Constraints (API Summary — Already Wired)

| API | Source | Status |
|---|---|---|
| Flood zone | FEMA NFHL REST (public) | **Live** — `financing.js` |
| Fire hazard zone | CAL FIRE FHSZ ArcGIS (CA only) | **Live** — `financing.js` |
| FHA condo project approval | HUD ENTP (condos only) | **Live** — `financing.js` |
| Conforming loan limits | FHFA 2025 embedded table | **Live** — `financing.js` |
| USDA rural eligibility | USDA GeoServer WFS | **Live** — `financing.js` |
| Insurance availability | No clean public API — future (CLUE signals or Kin/Hippo integration) | Future |

---

## 8. Red Team

- **RT1 (Mortgage advice / unlicensed lending):** Financing constraints are property facts, not loan recommendations. "This property is in Zone AE — flood insurance is required" is fact; "You should get a 30-year fixed at X rate" is advice. The RAAS ruleset enforces: the Advocate surfaces constraints, never recommends loan products. The 1031 content and seller financing calculators are educational tools with explicit "not tax/legal advice" disclosures — same posture.

- **RT2 (Licensed appraisal):** CMA language must remain "comparable sales suggest a range of $X–$Y" — never "this property is worth $X." The distinction is the same analysis a buyer's agent provides and does not require an appraisal license.

- **RT3 (RESPA — referral fees):** No referral fee arrangements, ever. When lenders are mentioned, the response must draw from categories (large online lender, credit union, mortgage broker) rather than specific brand names in a fixed order — consistent brand naming without compensation looks like steering to a regulator even without a cash arrangement. This is in the RAAS ruleset as a hard constraint: no named lender referrals. Same applies to QI referrals for 1031 exchanges.

- **RT4 (Fair Housing Act — redlining):** All financing constraint data must be sourced from specific, property-level public datasets (FEMA NFHL, CAL FIRE FHSZ, HUD FHA lookup). The CLUE-based insurance availability signal (future feature) must be property-level or zip+propertytype level — never neighborhood characterizations that could proxy for race or national origin. This is a RAAS rule enforced at the data layer, not just the prompt layer. Enforcement point: the CALFIRE and FEMA calls return coordinates-based results, not neighborhood aggregates — this is by design.

- **RT5 (Scope creep into underwriting):** RAAS hard constraint: the Advocate does not collect or process buyer financial information (income, debt, credit score). If a buyer volunteers this information, the response is "I work on the property side — for loan qualification, talk to a lender." For seller financing calculator, user inputs are terms (rate, down payment, amortization) — not buyer creditworthiness. The calculator models cash flows, not qualification.

- **RT6 (Broker Partnership — deferred):** If a brokerage subscribes and refers clients, buyers must be disclosed that the referring firm has a business relationship with the platform. Design this in from the start if ever built; don't retrofit disclosures.

- **RT7 (Data freshness):** All financing constraint data timestamped at lookup date. The Advocate must display "as of [date] — verify with your lender before close" on every Financing tab output. **Extension:** financing constraint checks should be repeatable during an active transaction — specifically at the financing contingency deadline. The Transaction tab should have a "Re-check financing constraints" action for any property with an active escrow. This is not yet built; add it to the Transaction tab spec.

- **RT8 (RT5 extension — stored conversation):** If a buyer volunteers financial data in chat (income, credit score, etc.), the verbal decline ("I work on the property side") is not enough. RAAS rule: volunteered financial data must not persist in stored conversation history or be associated with the user's profile. Chat storage for the Advocate must scrub income/debt/credit fields from stored messages. Implementation: add a financial-data scrubber to the Alex chat persistence layer for re-salesperson conversations.

- **RT9 (1031 — state tax clawback):** California has a clawback provision: if you do a 1031 exchange out of California property into out-of-state property, California can tax the deferred gain when the replacement property is eventually sold, even if you no longer live in California. The Advocate must flag this when the relinquished property is in CA and the user mentions a replacement property in another state. RAAS rule: `ca_1031_clawback_warning` — triggers on CA relinquished + out-of-state replacement.

- **RT10 (Sale-leaseback predatory lending flag):** Residential sale-leaseback programs targeting financially distressed homeowners are regulated or prohibited in some states (California's Equity Purchase Law, for example, has strict disclosure and rescission requirements). The Advocate must flag when a residential sale-leaseback involves a distressed seller — "California law (Civil Code §1695) requires specific disclosures and a 5-business-day right of rescission for residential equity purchases." RAAS rule: `ca_elp_disclosure` — triggers on residential + leaseback + CA.

---

## 9. RAAS Rules Required

| Rule ID | Trigger | Action |
|---|---|---|
| `re_cma_language` | Any CMA output | Language must be "range" not "value"; never "worth" |
| `re_no_lender_naming` | Any financing question | Describe loan categories; never name specific lenders |
| `re_no_financial_data` | Buyer mentions income/credit | Redirect to lender; do not store the data |
| `re_flood_source_attribution` | Any flood zone output | Must include FEMA source + date |
| `re_fire_source_attribution` | Any fire hazard output | Must include CAL FIRE source + date (CA only) |
| `re_financing_reverify` | Transaction tab — financing contingency deadline | Surface "re-check financing constraints" action |
| `re_1031_disclaimer` | Any 1031 content | "Educational only — not a tax opinion. Confirm with your CPA." |
| `ca_1031_clawback_warning` | CA relinquished + out-of-state replacement | Flag CA clawback provision |
| `re_seller_financing_ddfa` | Seller mentions selling more than 3 properties/year | Flag Dodd-Frank MLO requirement |
| `ca_elp_disclosure` | Residential + leaseback + CA + distressed seller signals | Flag CA Equity Purchase Law |
| `re_no_qr_referral` | Any QI mention for 1031 | Describe QI categories; never name specific QIs for compensation |

---

## 10. Open Decisions

1. **Sell-side tab build order:** Net Sheet first (clearest value, no regulatory exposure), then List (pricing), then Sell-Side Offers (offer evaluation). Disclosures tab is partially built already (CA TDS in advocate.js). Exchange & Structure tab is complex — spec it fully before building.

2. **Re-check financing constraints at contingency deadline:** Design this into the Transaction tab before building the sell side. It's a simple "re-run the same API calls for the address on file" — the complexity is surfacing it at the right moment.

3. **Financial data scrubbing in chat persistence:** This is a RAAS enforcement gap. The Advocate's chat conversation is stored for continuity — any financial data the user types needs to be scrubbed at storage time, not just verbally declined. Implement in the Alex chat persistence layer, gated on worker slug = `re-salesperson`.

4. **1031 content — when to build:** The 1031 framework (timeline tracker, boot calculator, like-kind qualifier) is high-value but has the highest legal-disclaimer surface of anything in this CODEX. Build after the sell-side tabs are solid. Do not build the 1031 tracker without the explicit RAAS rules from §9 enforced first.

5. **Tenant view (Property Manager worker):** Separately from the Advocate — the Property Manager worker currently shows only the landlord/owner side. A "Tenant" view is needed: lease terms, maintenance requests, payment history, move-in/out documentation. This is the same buyer/seller split problem — same data, different principal. Spec separately as a companion to Property Manager, not part of the Advocate. (See user notes on academic demo — student view vs. academy view is the same pattern.)

6. **Underwriting Worker (future):** A separate worker that collects buyer financial data, models loan scenarios, compares lender options — licensed for each state's mortgage broker regulations. Requires licensing and compliance infrastructure not yet built. Scope when ready; do not add to the Advocate.

---

*Financing APIs live: FEMA NFHL · CAL FIRE FHSZ · HUD FHA Condo · FHFA 2025 limits · USDA GeoServer*
*RAAS rules §9 are spec'd; build them before deploying 1031/leaseback content.*
*No referral arrangements. No lender/QI naming. No buyer financial data storage.*
