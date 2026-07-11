# RE Demo Presenter Script
## Merritt Capital Group — Scott Harrington walkthrough

**Persona:** Scott Harrington, Principal, Merritt Capital Group LLC  
**Demo URL:** `https://app.sociii.ai/demo/real-estate` (auto-signs in, no password)  
**Audience variant:** Kimi = focus Scenes 1–4 brokerage + Scene 2 MX. Christina = focus Scene 2 PM detail. Scott = full run including Scene 5.  
**Total runtime:** 12–18 minutes at a conversational pace.

---

## Before you start

Open the demo URL in a clean browser tab (or incognito — no prior login).  
The loading screen shows "Merritt Capital Group · Scott Harrington, Principal" for 3–4 seconds, then drops you into the workspace. If it errors, hit retry or clear localStorage and reload.

On entry you land on the Control Center Pro dashboard. Alex is in the right panel.

---

## Scene 1 — Alex morning briefing (2 min)

**What's on screen:** Control Center Pro canvas. Operating feed on left (4–6 items with timestamps). Alex chat panel on right.

**Say:**
> "Scott gets in at 8am and his first stop is the Control Center. Alex has already pulled his morning brief — let me show you."

**Type into Alex chat:**
> `What's on my plate this morning?`

Alex will surface the top items from the operating feed:
- HVAC Unit 214 — Day 4 unresolved (heat advisory)
- Capital call $130K outstanding — Marcus Eaton + Nguyen Group no-response
- Unit 704 close — final walkthrough today
- Domain Point GC contract extension — vote by Friday

**Say:**
> "Four things. Three properties, three different workers — all in one briefing. Let's drill into the HVAC first because that's the one with a deadline."

---

## Scene 2 — Property Manager: MX ticket (3 min)

**Click:** "Property Manager" in the left sidebar (or say `Show me the HVAC situation at Creekwood`)

**What's on screen:** MX ticket board for Creekwood Commons. Ticket 001 is highlighted in red (high severity, overdue).

**Click** the HVAC ticket (mx_creekwood_001).

**What's on screen:** Full ticket detail —
- Tenant photo of the frosted evaporator coils
- AI review block: `Severity: HIGH — CA Civil Code 1941, 24hr SLA, tenant health risk`
- Assigned to Ray Estevez, Day 4
- Resolution notes: condenser coil defrost in progress, replacement part ordered

**Say:**
> "This is not just a work order system. Watch what the AI did — the tenant submitted a standard maintenance request. The AI looked at the photo, cross-referenced the date, saw that California is under a heat advisory, and escalated it from 'HVAC service' to 'health risk — 24hr statutory obligation.' Ray Estevez got assigned before anyone even reviewed the ticket."

**Pause for reaction.**

> "The photo is attached, the chain of custody is in the record, the AI recommendation is timestamped. If this ever becomes a dispute — habitability complaint, tenant claim — you've got the paper trail already built."

*For Kimi / Christina demos: show the full ticket list (all 5 tickets) and walk through the open vs. completed view for Unit 116 turnover — before/after photos of the carpet replacement.*

---

## Scene 3 — Investor Relations: capital call follow-up (3 min)

**Type into Alex:**
> `What's the status on the Domain Point capital call?`

**Or click** "Investor Relations" in the sidebar.

**What's on screen:** LP table — 8 limited partners, $4.25M committed, $3.4M funded. Marcus Eaton and The Nguyen Group both show "No response — 14 days."

**Say:**
> "Domain Point is a $12M mixed-use development in Austin. Two of your LPs went dark after capital call #2. There's $130K sitting on the table and you need it to hit the next draw."

**Type into Alex:**
> `Draft a follow-up to Marcus Eaton — professional but direct, capital is 14 days past due`

Alex drafts a short email. An approval card appears below the draft.

**Say:**
> "The draft is here. You review it, you change whatever you want, you hit Approve. Only then does anything get sent. Before you approve, nothing moves."

> "When you do approve — the send event is logged with a timestamp and your identity. The LP can't later claim they didn't receive a capital call notice. That log is outside your control — that's the point."

**Don't actually send** — this is a demo environment. Just show the approval card.

---

## Scene 4 — Brokerage: Unit 704 pipeline (2 min)

**Click** "RE Marketing" in the sidebar or type:
> `Show me Unit 704 status`

**What's on screen:** Listing pipeline for Meridian at Flamingo. Unit 704 shows:
- Listing: $875K
- Status: Offer in negotiation
- Buyer: James Smith (contact card)
- Commission: $21,875 (2.5%, pending close)

**Say:**
> "This is Dana Reyes's side of the house — Merritt Property Group is the brokerage subsidiary. Unit 704 is at offer. The buyer is in the contacts list, the commission is calculated, and when this closes it posts automatically to Accounting."

*For Kimi demos: show the full Meridian at Flamingo listing pipeline — 100 buyer contacts across luxury, investor, first-time segments. Show the open-house lead detail for the first 5 buyers.*

---

## Scene 5 — CRE Analyst workers: due diligence deep dive (5–8 min)

This is the section that differentiates SOCIII from any property management tool on the market. The three workers — Title Abstract, Zoning, and CRE Analyst — are your deal intelligence layer.

**Setup:**
> "Let's talk about Domain Point in Austin. It's an 8-floor mixed-use development, and let's say you're looking at an adjacent parcel for a Phase 2. This is the conversation you'd normally have with a title company, a land-use attorney, and your underwriter — spread across three weeks and multiple invoices."

---

### 5a. Title Abstract (2 min)

**Click** "Title Abstract" in the sidebar, or type into Alex:
> `Pull a title abstract on the Domain Point parcel — 300 W 6th St Austin TX`

**What's on screen:** Title Abstract canvas —
- APN and legal description
- Owner of record: Domain Point LLC (Merritt Capital Group)
- Last recorded deed: Warranty Deed, Travis County, 2024
- Active liens: Construction loan, First National Bank, $7.2M
- Encumbrances: Utility easement, west boundary 10 ft
- Tax status: Current — Travis County 2025 assessed $3.8M

**Say:**
> "Chain of title, active liens, encumbrances, tax status — in under a minute. A title company takes 3–5 business days and invoices $400–800. We pull this from the county records and ATTOM's dataset in real time."

> "For the demo, this is pre-loaded data. In a live deal, you paste any US address and it pulls live."

**Key point to land:**
> "The title abstract is the first thing you need before any deal conversation. Now you know what you're working with before you've spent a dollar."

---

### 5b. Zoning (2 min)

**Click** "Zoning" in the sidebar or type:
> `What's the zoning on the Domain Point parcel? Can we build mixed-use residential above 6 stories?`

**What's on screen:** Zoning canvas —
- Base zone: CBD (Central Business District)
- Overlay: DBETOD (Downtown Density Bonus / TOD corridor)
- Max height: 60 ft ground floor + density bonus up to 120 ft with affordable unit trigger
- FAR: 8:1 base, up to 12:1 with bonus
- Allowable by right: Commercial ground floor, residential upper floors
- Conditional use: Hotel, parking structure over 300 spaces
- IZ trigger: >10 units = 10% affordable housing requirement

**Say:**
> "Base zone is CBD. But the density bonus overlay lets you go higher — if you include 10% affordable units, you unlock 12:1 FAR. Your architect probably already knew this, but now your whole team sees it in the same place at the same time."

> "The zoning worker cross-references the base zone against every overlay that applies to that parcel — TOD corridors, historic districts, flood plain, whatever the city has. It doesn't just give you the zoning designation. It gives you the build envelope."

**Key point:**
> "Land-use attorneys charge $400 an hour to read this to you. This is available to everyone on your team, every time, for free."

---

### 5c. CRE Analyst: deal underwriting (3 min)

**Click** "CRE Analyst" in the sidebar or type:
> `Run a quick underwriting on a hypothetical Phase 2 parcel adjacent to Domain Point. Assume $4.2M acquisition, 8 floors, 80% residential at $2,800/mo avg, 20% retail at $45/sq ft NNN.`

**What's on screen:** CRE Analyst canvas —
- Property summary: 8-floor mixed-use, 65,000 sq ft GBA
- Residential: 52 units × $2,800 avg = $1.745M GSI
- Retail: 13,000 sq ft × $45 NNN = $585K
- Total GSI: $2.33M
- Vacancy (5%): -$116K
- EGI: $2.214M
- OpEx: $620K
- NOI: $1.594M
- Cap rate at $4.2M acquisition: **5.8%**
- Hold: 5-year, reversion cap 6.25%
- Levered IRR (65% LTV, 6.5% rate): **13.4%**
- Comp sales: 3 comparable Austin CBD mixed-use trades, avg $6.8M, avg cap 5.6%

**Say:**
> "5.8% cap rate on a CBD Austin mixed-use parcel, 13.4% levered IRR at 5-year hold. The comps are pulling from ATTOM's transaction database — three comparable sales in the last 18 months."

> "Now here's why this matters for Scott's team specifically."

**Pause.**

> "Before, every deal gets its own spreadsheet. Someone builds a model, someone else updates it, someone sends the wrong version to the LP. Now you have one underwriting template, every deal runs through it, everyone sees the same numbers at the same time. And the LP sees the same output you built it on — there's no translation layer."

**Optional — show the output shared to IR:**
> `Send the Domain Point Phase 2 underwriting summary to the LP investor report`

Alex proposes the share action. Approval card appears.

> "Everything proposed, nothing committed until you approve. The LP report would include this as a structured attachment — same data, formatted for the investor audience."

---

## Close (1 min)

**Say:**
> "Seven workers. Three assets. One workspace. Your analyst, your property manager, your IR, your brokerage, your title, your zoning — all connected. When the HVAC ticket closes, the cost posts to Accounting. When the LP sends capital, IR logs it and Accounting updates. When Unit 704 closes, the commission posts automatically."

> "This is what we call Business in a Box for Real Estate. It's not a property management tool. It's the operating system for a CRE firm."

**For Scott specifically:**
> "We're on five verticals right now — real estate, aviation, healthcare, education, finance. The platform is the same across all of them. The workers change. The data model is identical."

> "The infrastructure Scott uses for Domain Point is the same infrastructure Merritt Property Group uses for Creekwood. It just knows which workers apply."

---

## Demo FAQ / objections

**"Does this replace my title company?"**
> No — you still need a title company to issue the title insurance commitment and close. The title abstract worker does the research and due diligence layer. It's what your attorney or analyst was doing before they handed it to the title company. You still close with a licensed title professional.

**"Does this work for our markets?" (markets not covered)**
> ATTOM covers the entire US. Zoning data coverage varies — major metro areas are complete, rural counties may have gaps. We'd verify coverage for your specific markets before you rely on it for live deals.

**"Where does this data live?"**
> In your workspace, in Firestore, on Google Cloud infrastructure. Not shared with other tenants. The AI outputs are logged but the raw data is yours. You can export at any time.

**"Can I use this with my existing software?"** (Yardi, AppFolio, etc.)
> Right now it's a parallel system — you run your PM software and SOCIII alongside it. The integration roadmap includes two-way sync with the major PM platforms. The value today is in the AI analysis and the connected intelligence layer, not replacing the ledger.

**"What does this cost?"**
> RE Business in a Box is $299/mo for the first workspace. Each additional user is $49/mo. ATTOM data pulls are metered at cost — title abstracts run about $1.50 each. Volume discounts apply for firms doing more than 20 deals per month.
