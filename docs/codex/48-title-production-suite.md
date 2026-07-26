# CODEX 48 — Title Production Suite
## The Title Company OS — From Search to Policy, Append-Only

**Status:** ⚪ spec · **Owner:** Sean · **Created:** 2026-07-25
**Vertical:** `real-estate` · **Suite:** Title Production (new)
**Trigger:** Mike Lee opportunity — Texas title company, AI-powered scale play
**Strategic frame:** SOCIII is not a title company. SOCIII is the OS that title companies run on.

---

## 0. Strategic Context

Mike Lee (ex-HOM DAO / Title App, recently released from KKR conflict) is engaged with an
attorney who owns a small Texas title company. The stated goal: use SOCIII to scale it into
the largest AI-powered title company in America.

**This CODEX does two things:**

1. Specifies the five workers that constitute the Title Production Suite — the software side
   of the bet.
2. Documents the business structure that lets us capture the upside while protecting the IP.

The six-word product thesis: **SOCIII is the chain of title.**

An append-only, hash-chained, AI-governed record of every search, every encumbrance, every
curative action, every fund receipt, and every policy issuance — anchored externally, visible
to the underwriter, and impossible to silently modify. That's not a workflow tool. That's
title plant infrastructure. And it's defensible IP (Patent 64/073,700) the moment the first
production policy issues through it.

---

## 1. The Business Structure (Read Before Building)

### Why a JV opco — not a direct acquisition, not a straight license

**Structural goal:** SOCIII captures equity upside in the title company AND retains platform IP.

| Entity | Holds | Contribution |
|---|---|---|
| **Title AI LLC** (opco) | TX title agent license; underwriter appointments (Stewart/First American/etc.); E&O insurance; regulatory relationships; brand | Mike Lee's attorney-client group |
| **SOCIII Inc** | Platform IP; RAAS engine; patents; non-exclusive license to opco; minority equity stake (20–40%) | Technology platform |

The license from SOCIII to the opco is **non-exclusive and royalty-bearing** — SOCIII can
license to any other title company simultaneously. The opco never owns the platform.

**On exit:** A strategic acquirer (Stewart Title, First American, ICE/Black Knight) buys the
opco — customer relationships, the TX license, the underwriter appointments. They take over
the SOCIII platform license under a **license-back agreement**. SOCIII IP is not transferred.
SOCIII receives: (a) proceeds on its equity stake in the opco, and (b) ongoing royalties from
the acquirer under the license-back. The platform keeps licensing to the next 50 title
companies.

**The Procore parallel:** Procore never built a construction company. They became the OS
construction companies run on. $8.8B IPO. Title Company OS is the same play.

**Natural strategic acquirer:** **Stewart Title Guaranty Company** (NYSE: STC) — headquartered
in Houston, Texas's largest independent title underwriter, publicly traded, actively trying to
modernize. A SOCIII-powered title shop running faster and cleaner than anything they've built
internally is the demo that starts that conversation.

**One regulatory flag:** If SOCIII holds equity in a Texas title agent, TDI may characterize
SOCIII as a beneficial owner of the agency. Mike's counsel must review the opco ownership
structure against Texas Insurance Code §2651 (title agent licensing) before equity percentages
are finalized. The clean posture: SOCIII is a minority passive investor and technology licensor;
the operating principal (Mike's attorney group) holds control and the license.

---

## 2. What's Already Built (Don't Duplicate)

| Capability | Location | Status |
|---|---|---|
| `escrow:list` + `escrow:create` routes | `index.js` ~line 22882 | Live — foundation for Escrow Manager |
| ATTOM `pullParcelBundle` | `workers/site-recon-001/attomClient.js` | Live — ownership/lien data for demo |
| `rec.deed.transfer_recorded` event type | `index.js` ~line 26254 | Live — extend for full chain |
| `real-estate-closing` card type | `index.js` (inline chat object) | Live — milestone tracker |
| RE Advocate | CODEX 41 (`re-salesperson`) | Live — consumer-side, no commission |
| ATTOM API key | Firebase Secret Manager | Live |
| Parcel + Title Abstract bundles | `docs/codex/` (bundle shapes CODEX) | Spec'd |

TX ruleset: **not yet created** — first new RAAS work in this CODEX.

---

## 3. Suite Overview — Five Workers

The Title Production Suite is what the title company's staff uses. The consumer-facing
complement (RE Advocate + Home Mortgage Advocate) is documented in §8–9.

| # | Worker | Slug | What it does |
|---|---|---|---|
| 1 | **Title Search** | `re-title-search-001` | Order and execute a title search: chain of ownership, open liens, judgments, tax status, encumbrances |
| 2 | **Commitment Engine** | `re-title-commitment-001` | Draft the title commitment: Schedule A (ownership facts), Schedule B-1 (requirements to clear), Schedule B-2 (exceptions to coverage) |
| 3 | **Defect Tracker** | `re-title-defects-001` | Log every title defect, assign curative action, track deadline, mark cleared |
| 4 | **Escrow Manager** | `re-escrow-mgr-001` | Funds in/out, disbursement schedule, ALTA settlement statement, escrow instructions |
| 5 | **Underwriting Review** | `re-title-uw-001` | Policy issuance gate: RAAS underwriting rules, underwriter sign-off, TDI premium calculation |

All five share the same underlying **title order** as the unit of work — a single Firestore
document that every worker reads from and appends events to. One transaction = one title order
= one append-only record.

---

## 4. Data Strategy — ATTOM Demo → DataTree Production

### What ATTOM provides (demo tier)
ATTOM's Property API delivers: owner name + vesting, sale history, AVM, lien data (open
mortgages, tax delinquencies, foreclosure status), legal description, parcel APN.

This is sufficient for **demo and early production** — enough to show the full workflow with
real data on any Texas address.

**ATTOM limitation for production title work:** ATTOM does not deliver recorded document
images (deeds, mortgage instruments, releases, judgment liens). For production underwriting,
you need the actual recorded documents from the county recorder — not just the data extracted
from them.

### What DataTree provides (production tier)
First American DataTree is a title plant access product: recorded document images, complete
chain of title from sovereignty (or 40+ years back per TDI requirement), open instruments,
plant searches by parcel. This is what production title work requires.

**Pricing:** ~$1,500/month enterprise access, or per-transaction pricing for lower volumes.

### Texas county direct access (long-term moat)
Many Texas metro counties have direct online access to recorded documents:
- Harris County (Houston): `cclerk.harriscountytx.gov`
- Travis County (Austin): `deed.co.travis.tx.us`
- Bexar County (San Antonio): county clerk portal
- Collin, Denton, Tarrant: all have online portals

A connector that pulls directly from county clerk APIs/portals — bypassing DataTree markup —
is the long-term data moat for a Texas-focused title company. Build after DataTree production
is stable.

### Connector declaration (add to `config/connectors.js`)

```js
{
  id: "attom_title",
  name: "ATTOM Property & Lien Data",
  description: "Chain of ownership, lien history, tax status — demo tier for title search",
  verticals: ["real-estate"],
  suite: "title-production",
  tier: "demo",
  secretKey: "ATTOM_API_KEY",
  metered: true,
  creditCostPerCall: 3,
},
{
  id: "datatree",
  name: "First American DataTree",
  description: "Full title plant access — recorded document images, complete chain of title",
  verticals: ["real-estate"],
  suite: "title-production",
  tier: "production",
  secretKey: "DATATREE_API_KEY",
  metered: true,
  creditCostPerCall: 15,
},
```

---

## 5. Append-Only Event Model

Every action in a title order emits an append event. Events are immutable; state is computed
from event history. This is not just good architecture — it IS the chain of title as a data
structure.

| Event type | Emitted when | Key fields |
|---|---|---|
| `title.order_opened` | New title order created | `parcelId`, `apn`, `address`, `buyerName`, `sellerName`, `orderType` |
| `title.search_initiated` | Search kicked off against data source | `dataSource` (attom/datatree/county), `searchType` |
| `title.ownership_found` | Vesting pulled | `vestedIn`, `vestingType`, `deedBook`, `deedPage`, `recordedDate` |
| `title.lien_found` | Each open lien/encumbrance discovered | `lienType`, `lienorName`, `amount`, `recordedDate`, `instrumentNo` |
| `title.tax_status_found` | Tax status checked | `taxYear`, `status` (current/delinquent), `amountDue` |
| `title.judgment_found` | Judgment against owner | `judgmentCreditor`, `amount`, `caseNo`, `recordedDate` |
| `title.search_complete` | Search finalized | `clearStatus` (clear/curative/complex), `riskScore` |
| `title.defect_logged` | Defect identified | `defectType`, `severity` (P0/P1/P2), `curativeAction`, `deadline` |
| `title.defect_cleared` | Curative action confirmed | `defectId`, `clearanceDoc`, `recordedInstrumentNo`, `clearedBy` |
| `title.commitment_drafted` | Commitment generated | `scheduleA`, `scheduleB1`, `scheduleB2`, `expirationDate` |
| `title.commitment_issued` | Commitment sent to parties | `issuedTo`, `policyAmount`, `hash` (content hash, anchored) |
| `title.funds_received` | Earnest money / loan proceeds / etc. received into escrow | `fundType`, `amountCents`, `fromParty`, `receiptRef` |
| `title.disbursement_approved` | Each escrow disbursement authorized | `toParty`, `purpose`, `amountCents`, `approvedBy`, `approvedAt` |
| `title.settlement_statement_generated` | ALTA/HUD-1 produced | `hash`, `version` |
| `title.uw_approved` | Underwriter sign-off | `underwriterId`, `policyForm`, `premiumCents`, `exceptions` |
| `title.policy_issued` | Title insurance policy issued | `policyNo`, `policyType` (owner/lender), `coverageAmountCents`, `hash` |
| `title.closing_recorded` | Deed recorded at county | `instrumentNo`, `recordedDate`, `county`, `book`, `page` |
| `title.order_closed` | Order complete | `closingDate`, `netProceedsCents` |

All events write to `titleOrders/{orderId}/events/{eventId}`. The order document
(`titleOrders/{orderId}`) stores the current computed state. State is never the source of
truth — events are.

---

## 6. Worker 1 — Title Search (`re-title-search-001`)

### One-sentence pitch
> Pull the full ownership history, every open lien, and every encumbrance on any Texas
> parcel — in minutes, not days — and flag exactly what needs to clear before this deal
> can close.

### Canvas tabs

| Tab | What it shows |
|---|---|
| **Order** | Open a new title order: address lookup → APN → buyer/seller names → order type (purchase/refi/HELOC). ATTOM pull fires on open; DataTree on production upgrade. |
| **Chain** | Ownership chain in reverse-chronological order: grantor → grantee, deed date, instrument number, vesting type. Flags gaps (missing links) in red. Goes back to satisfaction of TDI 25-year minimum or further if defect risk detected. |
| **Encumbrances** | All open instruments against the parcel: mortgages (open/satisfied), judgment liens, mechanic's liens, HOA liens, tax delinquencies, lis pendens, easements, restrictions. Each line shows lienor, recorded date, amount, and status (open/released/disputed). |
| **Tax** | Current and prior-year tax status: county + city + school district. Flags delinquency and estimated proration at close. |
| **Risk Score** | AI-generated search summary: Clear (no curative needed) / Curative (fixable before close) / Complex (needs underwriter). Named blockers called out. Confidence score. |

### Backend routes (new)
```
GET  /v1/title:search?address=&orderId=     — pull ATTOM parcel bundle + write search events
POST /v1/title:order                        — create titleOrder doc + emit order_opened
GET  /v1/title:order?orderId=               — return full order state + event log
```

### What it reuses
`pullParcelBundle` from `workers/site-recon-001/attomClient.js` — already pulls ownership,
liens, and tax data. The title search extends this with event emission and the defect
classification layer.

---

## 7. Worker 2 — Commitment Engine (`re-title-commitment-001`)

### One-sentence pitch
> Generate a Texas-compliant title commitment from the search results — the legal document
> that commits the underwriter to issue a policy if the Schedule B-1 requirements are met.

### Texas context
Texas uses TDI-promulgated title commitment forms (T-7 Commitment). Schedule A covers the
facts; Schedule B-1 covers requirements (what must happen before the policy issues); Schedule
B-2 covers exceptions (what the policy won't cover). These forms are not negotiable —
the language is set by TDI. SOCIII generates the content; the licensed title agent reviews
and issues.

### Canvas tabs

| Tab | What it shows |
|---|---|
| **Schedule A** | Current vesting (copied from search chain), legal description, proposed insured (buyer/lender), policy type and amount, proposed transaction (purchase/refi), consideration. All pulled from the title order — no manual entry. |
| **Schedule B-1** | Requirements list: each open lien that must be satisfied, each instrument that must be recorded, each instrument that must be delivered. Each requirement links to the corresponding defect in the Defect Tracker — when the defect clears, the requirement auto-checks. |
| **Schedule B-2** | Standard exceptions (taxes not yet due, rights of parties in possession, shortages in area/boundaries, homestead/community property rights, survey matters) + property-specific exceptions (existing easements from the chain, restrictions from the plat). Each exception links to the underlying instrument. |
| **Parties** | Buyer, seller, lender, escrow officer, title agent, underwriter. All editable; buyer/seller pulled from the order. |
| **Issue** | One-button commitment issuance: runs RAAS `title_commitment_ready` rule check (all search events present? no P0 defects open?), generates the T-7 form, hashes and anchors it, emits `title.commitment_issued`. |

### RAAS gate: `title_commitment_ready`
- Search must be in `complete` status
- No P0 (critical) defects open
- Schedule A vesting must match the current chain owner
- Policy amount must be ≥ sale price (owner) or loan amount (lender)
- Commitment must not be issued after search expiry (TDI: 90 days from effective date)

---

## 8. Worker 3 — Defect Tracker (`re-title-defects-001`)

### One-sentence pitch
> Every title defect gets a type, a severity, a curative action, a deadline, and a
> clearance proof — and nothing closes until they're all green.

### Defect taxonomy

| Type | Common examples | Typical cure |
|---|---|---|
| **Open mortgage** | Prior lender not released | Payoff letter + recorded release |
| **Judgment lien** | Court judgment against owner | Pay and record satisfaction |
| **Mechanic's lien** | Contractor lien on property | Negotiate/pay + record release |
| **HOA lien** | Unpaid dues | Pay at closing, HOA estoppel letter |
| **Tax delinquency** | Unpaid property taxes | Pay at closing from proceeds |
| **Lis pendens** | Pending lawsuit affecting title | Resolve litigation or insure over |
| **Gap in chain** | Missing deed in ownership history | Affidavit of lost instrument or quiet title |
| **Name discrepancy** | Seller's name on deed differs from current ID | Affidavit of identity |
| **Marital interest** | Community property / homestead rights | Spouse's joinder on deed |
| **Easement conflict** | Easement not visible in search | Survey, exception in B-2, or cure if possible |
| **Forgery / fraud flag** | AI-detected pattern in signature/notary blocks | Underwriter referral + fraud investigation |

### Severity levels
- **P0 — Critical:** Closes the order; cannot issue commitment or policy. Example: active lis pendens, forgery flag.
- **P1 — Blocking:** Cannot close until cleared; listed in Schedule B-1. Example: open mortgage, judgment lien.
- **P2 — Advisory:** Can close with exception in Schedule B-2 or cure preferred. Example: minor survey matter.

### Canvas tabs

| Tab | What it shows |
|---|---|
| **Active** | All open defects by severity (P0 → P1 → P2). Each card: defect type, lienor/claimant, amount, recorded date, curative action required, assigned to, deadline. Status pill (Open / In Progress / Pending Clearance). |
| **Curative** | Documents needed to clear each open defect: payoff demand letters, release forms, affidavit templates. Alex can draft curative language for standard defect types. One-click send to relevant party via Gmail integration. |
| **Cleared** | Closed defects with proof: recorded instrument number, clearance date, who confirmed. Immutable — cleared events cannot be reopened (new defect must be opened if an issue resurfaces). |
| **Critical Path** | Timeline view: each open P1/P0 defect mapped against the projected close date. Shows which defects are on the critical path to close. Alex alerts if a deadline is at risk. |

### RAAS gate: `title_defects_cleared`
All P0 and P1 defects must be in `cleared` status before Underwriting Review can
approve the policy. P2 defects can be accepted as B-2 exceptions with underwriter sign-off.

---

## 9. Worker 4 — Escrow Manager (`re-escrow-mgr-001`)

### One-sentence pitch
> Every dollar that flows through this closing is tracked, approved, and anchored —
> nobody loses money, nobody disbursed before funds are in hand.

### Texas wet close rule
Texas is a **wet closing state** by default: funds must be received and verified before the
deed is recorded. Dry closings (record first, fund later) require explicit written authorization
from all parties and the lender. RAAS enforces this: `title.closing_recorded` cannot emit
until `funds_received` events show the full closing amount is in escrow.

### Canvas tabs

| Tab | What it shows |
|---|---|
| **Receipts** | Every dollar received: earnest money deposit (EMD), buyer down payment, lender wire, seller credits, prorations. Each receipt links to the bank confirmation reference. Running total vs. required-to-close. |
| **Disbursements** | Proposed disbursements: existing mortgage payoff, real estate commissions, title/escrow fees, recording fees, tax proration, HOA payoff, net proceeds to seller. Each disbursement requires approval before it executes. Dual approval enforced by RAAS above a threshold (default: $50,000). |
| **Settlement Statement** | ALTA Universal Settlement Statement (or HUD-1 for older transactions): auto-generated from receipts + disbursements. Balanced view: buyer side (debits/credits) and seller side (debits/credits). One-click download as PDF. Hash stored and anchored on generation. |
| **Instructions** | Escrow instructions: conditions for fund release (loan funding confirmed, title commitment issued, all defects cleared, recording confirmed). AI drafts standard Texas escrow instructions from the order data. |
| **Timeline** | Close date, funding deadline, recording deadline, disbursement hold period. RAAS alerts if any milestone is missed. |

### Extends existing infrastructure
`escrow:list` and `escrow:create` routes at `index.js` ~line 22882 are the foundation.
The Escrow Manager worker adds:
- `escrow:fund` — record a receipt
- `escrow:disburse` — propose + approve a disbursement
- `escrow:statement` — generate ALTA settlement statement
- `escrow:close` — final close event; triggers `title.order_closed`

### RAAS rules
- `escrow_balanced_before_close`: total disbursements ≤ total receipts at close (hard block)
- `wet_close_funding_required`: `title.closing_recorded` cannot emit until receipts = required-to-close
- `dual_approval_over_threshold`: disbursements ≥ $50,000 require two approvers from the tenant
- `no_commission_before_funding`: real estate commission disbursement cannot precede lender wire receipt

---

## 10. Worker 5 — Underwriting Review (`re-title-uw-001`)

### One-sentence pitch
> The policy issuance gate — RAAS checks every precondition, the underwriter signs off,
> and the policy anchors to the same immutable record as the chain of title it insures.

### Texas title insurance context
Texas is unique: title insurance rates are **promulgated by TDI** (Texas Department of
Insurance). The title company cannot deviate from the rate schedule. Rates are set in the
**Texas Title Insurance Basic Manual (TIRBM)**. There is no negotiating the premium.

The title company is an **agent** of the title insurance underwriter — they don't bear the
underwriting risk themselves. Major TX underwriters: Stewart Title Guaranty (Houston), Fidelity
National Title, First American Title Insurance, Old Republic National Title.

### TDI premium calculation (basic rate, owner's policy)
For an owner's policy up to $100,000: $832. Then $5.15 per thousand from $100K to $1M.
Then $3.80 per thousand above $1M. Simultaneous issue (owner's + lender's): lender's policy
is $100 when issued at the same time as the owner's. These figures are illustrative —
CODEX must use the current TDI rate card embedded in `raas/rulesets/real-estate/TX/`.

### Canvas tabs

| Tab | What it shows |
|---|---|
| **Policy** | Policy type (T-1 Owner's / T-2 Lender's / T-2R Lender's Reissue / other TX forms), coverage amount, proposed insured, policy number (generated on issuance), effective date. Reads from the commitment. |
| **Checklist** | Pre-issuance RAAS checklist: (1) search complete ✓, (2) all P0+P1 defects cleared ✓, (3) commitment issued and not expired ✓, (4) escrow funded ✓, (5) deed recorded ✓, (6) premium calculated ✓. Each check runs a Firestore query against the title order events. Cannot proceed until all six are green. |
| **Exceptions Review** | All Schedule B-2 exceptions from the commitment. Each exception: accept (passes to policy), modify (underwriter adds language), delete (exception cured — requires evidence). Underwriter can add policy-specific exceptions that weren't in the B-2. |
| **Premium** | TDI rate schedule calculation: policy type + coverage amount → premium. Simultaneous issue discount auto-applied if owner's + lender's issued together. Reissue credit if prior policy within 10 years. Breakdown line-by-line. |
| **Sign-Off** | Underwriter approval gate: underwriter reviews checklist + exceptions, types sign-off note, clicks Issue Policy. RAAS validates the full checklist one final time before accepting. Emits `title.uw_approved` then `title.policy_issued`. Policy document generated, hashed, anchored. |

### RAAS gate: `title_policy_issuance`
This is the hardest gate in the platform. All must pass:
1. `title.search_complete` event exists for this order
2. No open P0 or P1 defects (all `title.defect_logged` events have corresponding `title.defect_cleared`)
3. `title.commitment_issued` exists and commitment has not expired (≤90 days, TDI requirement)
4. `title.funds_received` total ≥ required-to-close amount
5. `title.closing_recorded` event exists (deed is on record)
6. Premium is calculated per current TDI rate table — no deviation
7. A licensed underwriter (verified role on the tenant) has provided sign-off

Any failure = hard block. No policy issues until all seven pass.

---

## 11. Worker 6 — RE Advocate (reference — CODEX 41)

The RE Advocate (`re-salesperson`) is already specified in CODEX 41 and partially live.
It serves the consumer side: price discovery, financing constraints, offer strategy,
transaction support — with no commission, no referral fee.

**In the Title Production Suite context:** The RE Advocate is the buyer's/seller's companion
while the title company's five workers are the back-office engine. Both workers read from
the same title order when an order ID is present. A buyer asking "what liens are on this
property?" in the RE Advocate can surface data from the title order if they're a party
to it and have the right permissions.

**No rebuild needed here.** CODEX 41 governs.

**Affiliated opco disclosure — new requirement not in CODEX 41:**
CODEX 41's "no commission, no referral fee" thesis is the RE Advocate's core credibility
claim. But when the Advocate operates inside a SOCIII instance where SOCIII holds 20–40%
equity in the title company handling the transaction, SOCIII has a real financial interest
in that title company succeeding — even without a direct commission changing hands. That
is the same shape of conflict TX-T-010 requires disclosure for elsewhere in this document.

**New RAAS rule: `re_advocate_affiliated_opco_disclosure`**
If a title order for this transaction is being processed by a title company in which
SOCIII holds equity (identified by `affiliatedOpco: true` on the tenant configuration),
the RE Advocate must surface a plain-language affiliated business disclosure before
providing any title-related guidance:

> "SOCIII holds an ownership interest in the title company handling this transaction.
> That means SOCIII benefits financially if this closing completes with this title company.
> You are not required to use this title company. This tool still works for you regardless
> of which title company you choose."

This disclosure must appear once per order on first title-related query. The acknowledgment
is **not a session flag** — it is a durable append-only event:

```
title.disclosure_acknowledged {
  disclosureType: "affiliated_opco",
  uid: <user uid>,
  tenantId: <opco tenant id>,
  orderId: <title order id, if present>,
  sessionId: <session id>,
  acknowledgedAt: <server timestamp>,
  disclosureText: <exact text shown to the user>
}
```

Written to `titleOrders/{orderId}/events/` when an order is present, or to
`disclosures/{uid}_{sessionId}` when surfaced before an order is opened. The record
is hash-chained with the rest of the order events. If a regulator or buyer later asks
"was I told SOCIII has equity in this title company before receiving guidance," the answer
is not "we think so" — it's a dated, hash-chained, anchored event in the same record
as every lien, every defect, and every disbursement.

The "no commission" language in the RE Advocate's UI description must be updated to "no
agent commission" wherever `affiliatedOpco: true` is set on the tenant, to avoid a
materially misleading statement.

---

## 12. Worker 7 — Home Mortgage Advocate (`re-mortgage-advocate-001`)

### One-sentence pitch
> The only mortgage guide that shows you what loans exist, what they cost, and what the
> disclosures mean — with no commission from any lender and no stake in which one you pick.

### Regulatory boundary (hard)
This worker is **educational**. It does not:
- Originate loans
- Quote specific rates from named lenders
- Collect borrower financial data (income, credit score, assets)
- Issue a Loan Estimate (only licensed MLOs can do that)

What it does: explains loan categories, explains TRID disclosures, tracks timing requirements,
helps borrowers understand what they signed.

### TRID (TILA-RESPA Integrated Disclosure) timing rules
| Event | Requirement | Rule |
|---|---|---|
| Application received | Loan Estimate must be delivered within 3 business days | RESPA §1024.7 |
| Loan Estimate | Borrower must receive ≥ 7 business days before close | TILA §1026.19(e)(2) |
| Closing Disclosure issued | Must be delivered ≥ 3 business days before close | TILA §1026.19(f)(1)(ii) |
| Changed circumstance | Revised LE required within 3 business days of the change | CFPB 12 CFR §1026.19(e)(3)(iv) |

### Canvas tabs

| Tab | What it shows |
|---|---|
| **Loan Types** | Educational overview of loan categories for this property: Conventional (conforming/jumbo), FHA, VA, USDA, HELOC, Construction-to-Perm. For each: qualification profile, down payment range, PMI rules, FHA/VA/USDA eligibility for this address (reads from RE Advocate financing data). |
| **TRID Tracker** | Timeline view: application date → LE delivery deadline → lock expiration → CD delivery deadline → closing date. Flags if any TRID deadline is at risk. Borrower can enter their application date and the tracker auto-calculates all deadlines. |
| **LE Review** | Loan Estimate plain-English explainer. Upload your LE → AI identifies Loan Costs (A/B/C sections), Prepaids, Initial Escrow Payment, Cash to Close. Explains each line in plain English. Flags anything that looks unusual (unusually high origination fee, lender credit with rate above market category, etc.). Does NOT tell borrower whether to accept — explains what each item means. **Data handling:** the uploaded document is parsed in-session only (extracted text held in working memory for this chat turn). No document bytes, no extracted financial figures (loan amount, income, debt, asset values), and no structured output from the parse are written to Firestore. Session memory is cleared at session end. This is required: LE and CD documents routinely contain income figures and personal financial data that the `no_borrower_financial_data` RAAS rule prohibits persisting. |
| **CD Review** | Closing Disclosure comparison: upload CD + LE → AI compares them. Flags changes between LE and CD. TRID allows some changes (changed circumstances, rate locks, etc.); flags changes that may require a revised LE and a new 3-day waiting period. **Same data-handling rule as LE Review:** parsed in-session, nothing written to Firestore. |
| **Rate Context** | Current rate context by loan category — NOT named lenders, NOT rates the worker is recommending. CFPB's weekly primary mortgage market survey averages (public data, updated weekly) + 10-year Treasury yield as the benchmark. "30-year conforming loans have averaged X% this week per CFPB/Freddie Mac survey." Frame: context, not advice. |
| **Affiliated Business** | RESPA §8(c)(4) affiliated business arrangement disclosures: if the title company, real estate agent, or lender have business relationships with each other, borrowers must be informed. Worker flags when any affiliated business disclosure is detected in the order and explains what it means. |

### RAAS rules

| Rule | Constraint |
|---|---|
| `no_lender_recommendation` | Never name a specific lender for the purpose of directing business; describe loan categories and products only |
| `no_borrower_financial_data` | Do not collect or persist income, credit score, asset data — redirect to lender for qualification |
| `trid_deadline_alert` | Emit an alert event if a TRID deadline is < 2 business days away |
| `affiliated_business_disclosure` | Read `affiliatedOpco` from the tenant config (the single source of truth for SOCIII equity stake — see note below). If true, surface RESPA-compliant affiliated business disclosure language. Both Worker 7 and the RE Advocate read this same flag; neither does independent order-level detection. |
| `le_cd_comparison_disclaimer` | Every LE/CD review output must include: "This is educational — not legal or mortgage advice. Review your disclosure documents with your loan officer." |
| `le_cd_session_only` | Uploaded LE/CD document bytes and all extracted financial figures must not be written to Firestore. Parse in working memory; discard at session end. Enforcement: the LE Review and CD Review chat handlers must have no `db.collection().add()` or `.set()` calls for document content or extracted financial fields. |
| `mortgage_advocate_ruleset_owner` | The Mortgage Advocate RAAS ruleset is owned and versioned by SOCIII Inc, not by the opco tenant. Opco admin accounts do not have write access to this ruleset. Any change requires a SOCIII platform deploy, not a tenant configuration update. This prevents ordinary commercial pressure to close loans faster from quietly loosening the educational-only boundary. |

**Single source of truth for affiliated disclosure:** SOCIII's equity stake in any opco
is a tenant-level fact, not an order-level one. The canonical record is `affiliatedOpco:
true` in the tenant configuration document. Both the RE Advocate and Worker 7's
`affiliated_business_disclosure` rule read from this same flag — neither worker runs
independent order-level detection. This eliminates the drift risk where one worker
discloses and the other silently doesn't because they were watching different signals for
the same underlying fact. Updating the equity relationship means updating one tenant
config field; both workers pick it up without a separate coordination step.

---

## 13. RAAS Rules — Texas Jurisdiction File

**New file:** `functions/functions/raas/rulesets/real-estate/TX/title-production.md`

```
# Texas Title Production Rules
# Jurisdiction: TX | Vertical: real-estate | Suite: title-production
# Authority: Texas Department of Insurance; Texas Title Insurance Basic Manual (TIRBM)

TX-T-001: PROMULGATED RATES
Title insurance premiums must be calculated per the current TDI rate schedule (TIRBM
Procedural Rule P-1). No deviation, discount, or negotiation is permitted. The rate
schedule is embedded in raas/rulesets/real-estate/TX/tdi-rate-schedule.json.

Rate table file must carry a top-level `lastVerifiedDate` field (ISO date string).
RAAS emits a WARN (Operating Feed, not page) if `lastVerifiedDate` is > 365 days old,
because a stale-but-internally-consistent table would pass the RT3 $0.01 tolerance check
while producing a regulatory violation on every policy issued — the RT3 check catches
calculation errors against the table, not the table being outdated.

Freshness owner: Sean (or a designated title counsel). Review cadence: annually and
whenever TDI issues a TIRBM amendment. TDI rate change notices are published at
tdi.texas.gov. The rate table file update must be a tracked checklist item in the
annual platform compliance review.

TX-T-002: COMMITMENT FORM
All title commitments must use TDI-promulgated form T-7. No custom commitment language.
Schedules A, B-1, and B-2 must conform to TIRBM requirements.

TX-T-003: POLICY FORMS
Owner's policy: T-1. Lender's policy: T-2. Lender's reissue: T-2R. Other forms as
promulgated by TDI. No custom policy language.

TX-T-004: SEARCH REQUIREMENT
Title search must cover a minimum of 25 years from the effective date, or back to a
prior title insurance policy of sufficient coverage, per standard underwriter guidelines.
For agricultural or rural property with complex history, 40 years minimum.

TX-T-005: WET CLOSE
Texas default is wet close (funds received before recording). Dry close requires written
authorization from all parties including the lender. The system must not emit
title.closing_recorded before title.funds_received total equals required-to-close amount,
unless an explicit dry_close_authorization event has been recorded.

TX-T-006: HOMESTEAD
Texas Constitution Art. 16 §50: homestead property has specific protections. A
refinance of a Texas homestead may only be a rate/term refi or a home equity loan under
§50(a)(6) — which carries the 80% LTV cap, 12-day cooling-off period, and other
requirements. Flag when the property type is homestead and the transaction is a refi.

TX-T-007: COMMUNITY PROPERTY
Texas is a community property state. Both spouses must join in any conveyance or
encumbrance of community property homestead. Flag when vesting shows a married individual
without spouse joinder on a homestead property.

TX-T-008: ATTORNEY EXCEPTION
A Texas licensed attorney may perform title and escrow functions without a title
insurance agent license, subject to Texas Insurance Code §2651.054. The system must
accept attorney-role users as authorized to perform escrow officer functions if they
are a licensed Texas attorney (role: attorney_escrow).

TX-T-009: ESCROW OFFICER LICENSURE
Non-attorney escrow officers must hold a Texas title agent license (individual) or act
under the supervision of a licensed title company. Verify license status via TDI lookup
before enabling escrow disbursement functions.

TX-T-010: AFFILIATED BUSINESS DISCLOSURE
If the title company, real estate broker, and/or lender have common ownership or a
referral arrangement, RESPA §8(c)(4) requires an Affiliated Business Arrangement
Disclosure Statement delivered at or before settlement service referral.
```

---

## 14. Append-Only as Chain of Title — The Patent Alignment

The SOCIII patent 64/073,700 covers the append-only, hash-chained, externally-anchored
record model. A title company running on SOCIII is a live demonstration of that patent's
commercial application.

Every `title.lien_found`, `title.defect_cleared`, `title.policy_issued` event is:
1. Written to Firestore (append-only, no overwrites)
2. Hash-chained to the prior event in the order
3. Periodically anchored to an external registry

This means the chain of title is not just in the title company's files — it's in an
externally-verifiable, tamper-evident record that the underwriter, the lender, and the
buyer can all independently verify.

**This is the product.** The workers are the UI. The append-only anchored chain of title
is the moat.

---

## 15. Demo Workspace — "Texas Title AI" Tenant

For the Mike Lee demo and any Stewart/First American conversation, seed a dedicated demo
tenant with real Texas addresses:

**Suggested seed transactions:**

| # | Address | Scenario | Defects |
|---|---|---|---|
| 1 | 2102 Scenic Dr, Austin TX 78703 | Residential purchase | One open mortgage to pay off — clean story |
| 2 | 5609 Manor Rd, Austin TX 78723 | Cash purchase with judgment lien | P1 defect requiring curative — shows the defect tracker |
| 3 | 816 Congress Ave, Austin TX 78701 | Commercial refi | Complex chain with multiple recorded easements — shows B-2 exceptions |
| 4 | 1819 Lavaca St, Austin TX 78701 | Homestead refi | §50(a)(6) home equity — triggers TX-T-006 homestead flag |

Idempotent seed script at `/tmp/seedTexasTitleDemo.js` — same pattern as other demo seeds.

**What the demo must show on screen (Trump Rule):**
1. Type an Austin address → chain of title appears in the Chain tab, real ATTOM data
2. RAAS flags the open lien → it shows up in the Defect Tracker as P1
3. Clear the defect → Schedule B-1 requirement auto-checks green
4. Escrow manager shows balanced funds → Settlement Statement generates
5. Underwriting checklist goes all-green → policy issued, hash anchored

Every step visible, every step clickable. Do not narrate what it would do — show it doing it.

---

## 16. Red Team

**RT1 — SOCIII as unlicensed title insurer:** The system generates title commitments and
policies, but SOCIII is not a title insurer. Every commitment and policy must carry the
underwriter's name (Stewart, First American, etc.) and be issued under the underwriter's
authority. RAAS hard constraint: `title.policy_issued` requires a valid `underwriterId`
mapping to an approved underwriter in the tenant's configuration. SOCIII provides the
workflow and record; the underwriter bears the risk.

**Code-level enforcement required (not just a prompt instruction):** The seven-gate
`title_policy_issuance` check must be implemented as deterministic code in
`raasEngine.validate()` — the same enforcement standard the platform-wide RAAS-as-code
migration established. A prompt that says "do not issue a policy without an underwriterId"
is not the same artifact as a code-level gate that hard-blocks the `title.policy_issued`
write if `underwriterId` is absent or unrecognized. The §18 build sequence must include
an explicit step confirming this gate is wired in code, not only in the markdown ruleset
file. The markdown file is the spec; `raasEngine.validate()` is the enforcement.

**RT2 — Escrow fund commingling:** Escrow funds in Texas are regulated — they must be
held in a segregated trust account, not commingled with operating funds. SOCIII tracks
escrow fund events but does not hold actual money. The bank account integration (if added)
must only be a read-mirror for balance verification, not a money transmitter. SOCIII is
not a money transmitter. Flag this if any payment processing integration is proposed.

**RT3 — Promulgated rate deviation:** Texas title insurance rates are fixed by TDI.
Any calculation that produces a premium different from the TIRBM rate table is a regulatory
violation. RAAS must hard-block policy issuance if the calculated premium does not match
the embedded TDI rate table within $0.01. This is non-negotiable.

**Code-level enforcement required:** The premium tolerance check must be deterministic
arithmetic in `raasEngine.validate()`, not a prompt constraint. The rate table lookup is
pure math — rate band × coverage amount → expected premium — with no AI involvement. The
gate passes or fails on the number, and the LLM cannot override it. Same standard as
RT1: the markdown rule is the spec; the code block is the enforcement.

**RT4 — RESPA §8 (kickbacks):** The Mortgage Advocate must not steer borrowers to named
lenders in exchange for any arrangement with the title company. If the opco has an affiliated
lender, the affiliated business disclosure (TX-T-010) must be surface before any lender
discussion. This is a RESPA §8(a) hard prohibition — civil and criminal penalties.

**RT5 — Dry close without authorization:** Recording the deed before funds arrive is
a wire fraud risk vector — it has been used in RE fraud schemes. TX-T-005 (wet close rule)
is enforced at the code level in the escrow manager, not just in a prompt. The
`title.closing_recorded` event must be blocked until funds confirmed, period.

**Code-level enforcement required:** The wet-close gate is a Firestore-query check:
sum all `title.funds_received` amounts for the order, compare to `requiredToCloseCents`
on the order document. If the sum falls short and no `dry_close_authorization` event
exists, the `title.closing_recorded` write is rejected in `raasEngine.validate()` before
it reaches Firestore. This is deterministic code, not a prompt guard. The §18 build
sequence must confirm this gate is wired in Phase 2, step 5, before the first real closing.

**RT6 — AI hallucination in chain of title:** If Alex invents a deed that doesn't exist
or misreads an instrument number from ATTOM, the chain of title is wrong.

**The architectural fix, not a validation rule:** `chain_data_must_have_source` (checking
that a `sourceRef` field is present) is insufficient — a confident model doesn't
distinguish inventing a fact from inventing its citation, and will populate a
plausible-looking `sourceRef` in the same breath as the hallucinated lien. A schema check
that a sufficiently fluent hallucination satisfies is not a guard.

The correct mitigation is architectural — the same as CODEX 43's Pattern B ("the AI does
zero arithmetic, the rules engine owns the numbers"):

**Raw-fact chain events — pipeline-only, no exceptions:**
`title.lien_found`, `title.ownership_found`, `title.judgment_found`, `title.tax_status_found`
and any other event that carries a fact extracted from an external data source are written
programmatically by the data-ingestion pipeline at the moment the ATTOM or DataTree API
response returns. The AI has no code path to emit these events. `sourceRef` is populated
by the ingestion pipeline with the actual API response ID before the AI sees the data.
If the API call fails, no event is written — Alex explains the failure; it does not
substitute a plausible alternative. `chain_data_must_have_source` remains as a secondary
check, but the primary protection is the architecture: no code path from "Alex generates
text" to "a raw-fact chain event is written."

**Classification events — AI-authored, but only over pipeline-verified facts:**
`title.defect_logged` is a deliberate carve-out from the pipeline-only rule. Defect
severity classification (P0/P1/P2) is an interpretation of already-verified facts, not a
raw fact pulled from ATTOM — and the Defect Tracker explicitly includes AI-driven
classification (e.g., "Forgery / fraud flag: AI-detected pattern in signature/notary
blocks"). The AI may author `title.defect_logged` events, subject to one hard constraint:
**every fact cited in the classification must already exist as a prior pipeline-written
chain event with a real `sourceRef`.** The AI is permitted to judge; it is never permitted
to originate the underlying fact it's judging. Build enforcement: the `title.defect_logged`
handler must verify that each `sourceEventId` cited in the defect payload resolves to an
existing event in the order's event log before accepting the write.

`chain_data_must_have_source` remains as a secondary defense on raw-fact events. The
architectural separation — pipeline writes facts, AI judges facts — is the primary control.

**RT7 — Data freshness at close:** A title search from 60 days ago may miss a lien
filed last week. RAAS rule: if the order's last `title.search_initiated` event is > 30 days
old, the Underwriting Review checklist flags a required search update before policy
issuance. This is consistent with standard title insurance practice (most underwriters
require a search no older than 30 days at closing).

**RT8 — TDI equity ownership disclosure:** If SOCIII holds equity in the opco (the title
agent), TDI may require disclosure of that equity interest in the title agent's license
application and annual reporting. Texas Insurance Code §2651 requires disclosure of all
principals and beneficial owners. Mike's counsel must confirm the disclosure requirements
before equity percentages are finalized.

**This is a blocking gate, not a parallel track.** §1 already states a specific equity
range (20–40%). If those numbers appear in a term sheet before counsel has confirmed the
TDI disclosure requirements, the disclosure review becomes a retrofit on a done deal
rather than a precondition that might change the structure. See §17, item 0.

---

## 17. Open Decisions

0. **[BLOCKING — must resolve before equity is finalized] TDI beneficial-owner disclosure
   review:** Texas Insurance Code §2651 requires title agent license applications and annual
   reports to disclose all principals and beneficial owners. SOCIII holding equity in the
   opco triggers this requirement. Mike's counsel must confirm: (a) whether SOCIII's equity
   stake requires disclosure on the license application, (b) the ownership percentage
   threshold that triggers TDI review or approval, and (c) whether TDI has any restrictions
   on a technology platform holding equity in a licensed title agent. This review must be
   completed before any equity numbers appear in a term sheet. The 20–40% range in §1 is
   illustrative for structure discussion — the actual number must wait on counsel's
   confirmation of what TDI will accept without objection.

1. **DataTree connector build timing:** Build for demo with ATTOM; wire DataTree after the
   first real Texas closing demonstrates the workflow. DataTree requires a commercial
   agreement with First American — not just an API key. Sean to confirm commercial
   relationship path with Mike Lee's group.

2. **Underwriter appointment for demo:** To issue a real title commitment (not a mock),
   the demo title company needs an active appointment with at least one Texas underwriter.
   For software demo purposes, a mock commitment with "DEMO — NOT A REAL POLICY" watermark
   is sufficient. For the first real transaction, appointment must be in place.

3. **Escrow bank account integration:** The Escrow Manager tracks funds as events — it
   does not connect to a bank account in v1. A future connector (Plaid or direct bank API)
   can mirror the actual escrow trust account balance for real-time reconciliation. Flag
   for v2 after the workflow is proven.

4. **Home Mortgage Advocate licensing question:** In Texas, providing "mortgage assistance"
   for compensation may require a Residential Mortgage Loan Originator (RMLO) license
   under Texas Finance Code §156. The Advocate must stay strictly educational — never
   collecting application data, never quoting binding rates, never steering to specific
   lenders. Counsel to confirm the RMLO boundary before deploying the Mortgage Advocate
   in the opco context.

5. **Bundle name:** "Title in a Box" is the natural bundle name for the 5 title company
   workers + RE Advocate + Mortgage Advocate (per CODEX 21 bundle taxonomy). Confirm with
   Sean. Slug: `re-title-in-a-box`.

6. **Texas county clerk connector:** Build after DataTree is stable. Priority order:
   Harris (Houston) → Travis (Austin) → Bexar (San Antonio). Each requires mapping the
   county clerk's specific API/portal. Assign one connector per county; declare in
   `config/connectors.js` with `tier: "county-direct"`.

---

## 18. Build Sequence

Phase 1 — Demo-ready (ATTOM data, mock policy, shows the full workflow):
1. New RAAS ruleset file: `raas/rulesets/real-estate/TX/title-production.md` — this is
   the *spec*. The file alone is not the enforcement artifact.
2. **Wire chain-event pipeline:** ATTOM ingestion client writes `title.lien_found`,
   `title.ownership_found`, etc. programmatically on API response. Confirm no code path
   exists from AI free-form generation to a chain event write (RT6 architectural fix).
3. Title order Firestore model + event emitters
4. Worker 1: Title Search (ATTOM-backed, Chain + Encumbrances tabs)
5. Worker 3: Defect Tracker (P0/P1/P2 defects, curative tab)
6. Worker 2: Commitment Engine (Schedule A/B-1/B-2 generator)
7. Seed demo workspace (4 Austin addresses, §15)
8. Demo pass: type address → full workflow on screen

Phase 2 — Production-ready (real policies, DataTree, TX-compliant):
1. DataTree connector
2. Worker 4: Escrow Manager (full fund tracking, ALTA statement)
3. Worker 5: Underwriting Review (TDI premium, full checklist gate, policy issuance)
4. TX-T-006/007 homestead + community property rules enforced in UI
5. **Wire wet-close gate in `raasEngine.validate()`** — deterministic code block: sum
   `title.funds_received` events, compare to `requiredToCloseCents`, hard-block
   `title.closing_recorded` if short and no `dry_close_authorization` event exists (RT5).
6. **Wire `title_policy_issuance` seven-gate check in `raasEngine.validate()`** — all
   seven conditions as deterministic Firestore queries, not prompt guards (RT1). Include
   TDI rate table check as pure arithmetic against embedded rate schedule (RT3).
7. Chain anchor on policy issuance
8. Confirm: rate table `tdi-rate-schedule.json` carries `lastVerifiedDate`; counsel has
   verified current rates match the embedded table before first real policy issues.
9. First real closing

Phase 3 — Consumer layer + opco expansion:
1. RE Advocate integration (reads title order data when buyer is a party)
2. Home Mortgage Advocate (TRID tracker, LE/CD review)
3. County clerk direct connectors (Harris → Travis → Bexar)
4. Additional Texas metro demo workspaces
5. License template for next title company customers

---

*SOCIII is not a title insurer. SOCIII provides the platform; the licensed title agent and appointed underwriter bear the risk.*
*All TX title rules are per TDI and TIRBM — not negotiable.*
*Patent 64/073,700 covers the append-only anchored record model this suite runs on.*
