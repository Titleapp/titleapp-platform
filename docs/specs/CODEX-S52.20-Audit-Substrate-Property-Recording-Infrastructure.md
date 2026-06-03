# CODEX S52.20 — SOCIII Audit Substrate: Property Recording Infrastructure for the Post-Google-AI Era

**Date:** 2026-06-02
**Author:** Sean Lee Combs + Claude (strategy synthesis)
**Status:** STRATEGY LOCK — the thesis the next 18 months of build rest on
**Supersedes:** Earlier real-estate-vertical framing; the broker-tool framing; any "AI for brokers" pitch

---

## Why this document exists

A long strategy session on 2026-06-02 evolved the SOCIII real-estate thesis through three reframings:

1. From "AI tools for real-estate brokers" (was wrong — brokers don't move against self-interest, and the moat would be thin)
2. To "the property intelligence layer that replaces Zillow / Redfin / Realtor.com" (was incomplete — that's a consumer-search story, downstream of where the value lives)
3. To **the audit-anchored regulatory verification layer for the largest asset class in the United States**, distributed as a free supplement, structurally protective of citizens, structurally exposing of incumbents

This is the third frame. It is the correct frame. Every product, partnership, and pitch from this point forward operates on this frame.

This document is the strategy lock. It is the brief that should be sent to investors, advisors (Kimmi specifically), strategic partners (Coinbase corp dev), and the SOCIII team as the canonical reference for what we are building and why.

---

## The thesis in one sentence

> **SOCIII is the audit-anchored regulatory verification layer for the largest asset class in the United States — distributed as a free supplement that becomes the system of record by being undeniable rather than by being adopted, and monetized through subscription access by every constituency whose work the verification touches.**

The asset class is real property — $45T residential + $25T commercial + ~$15T land/agricultural/mineral/water-rights in the United States alone. The verification work has been done badly for 200 years by a fragmented patchwork of county recorders, title insurers, lenders, escrow agents, and brokers, all of whom benefit from the absence of evidence. SOCIII creates the evidence. The evidence flows to whoever pays to use it: plaintiff lawyers who prosecute, defense lawyers who defend, insurers who price, lenders who underwrite, regulators who enforce, journalists who investigate.

We do not pick sides. We do not publish. We do not litigate. We are the substrate. The substrate earns.

---

## What's actually being built

### The substrate

A Parcel DTC (Digital Title Certificate) for every parcel in target geographies, pre-populated from public records (ATTOM + direct county scrapes), anchored on Base via Coinbase CDP, with every recorded change appended as a logbook entry on the parcel's audit chain. The chain exists *whether or not the county knows we are doing it*. Public records are public.

### The applications

Workers that consume the substrate, organized by constituency. Each one is a "Brandon Maka-awa-awa equivalent" — a user opens their workspace, sees the data the system was designed to hide, and chooses between two action lanes.

- **Title-Escrow vertical** — 12 existing workers (ESC-001 through ESC-012) operate on the substrate. New ESC-013 Parcel Atlas builds the substrate. The other 12 light up.
- **Legal vertical** — PARA-001 (live), PAT-001 (live), plus four new workers spec'd against the substrate (LIT-001 Litigation Discovery, DEF-001 Compliance Defense, DD-001 Transaction Due Diligence, CLOSE-001 Closing Attorney)
- **Real Estate vertical** — existing workers (Broker, Property Mgmt, Escrow, Developer, etc.) gain the audit substrate as a data layer, dramatically increasing their depth
- **Banking/Finance vertical** — Fundraise (BANK-FUND-001, live) plus lending and underwriting workers gain real-time risk surfacing from the substrate
- **Insurance vertical** (new) — title insurance underwriting, property insurance underwriting, claims defense all consume the substrate

### The patent fence

- Filing C (Multi-Tier Composable Rule-Based Governance) protects the composition engine — the part that combines rules, identity, audit, and verification
- Filing 1 (Identity-Anchored Hash-Chain Audit Trail) protects the audit substrate itself
- Filing 2 (Knowledge Capture Pipeline) protects how new rules get added
- Plus the deferred batch (Escrow Locker, Title & Property Assurance, Build-Without-Code) extends the fence further

A competitor cannot replicate the architecture without infringing. Patent grace period closes 2027-06-01 for the canvas + wearable subjects per the disclosure timeline; the substrate work is independently anchored and not at grace-period risk.

---

## Why now

Five forces converged in the last 18 months:

1. **Google AI is eating consumer search.** Zillow, Redfin, Realtor.com all depend on Google ad rates and SEO discovery. The conversion of search from "results page" to "AI answer" is collapsing their funnels. Zillow is raising ad rates because their lead-gen is failing. That entire layer is being recomposed. Whoever owns the *data source AI agents cite* becomes the new intermediary.

2. **County recorder systems are getting ransomwared.** Counties have paper-era infrastructure with digital veneers. They're vulnerable. They know it. They have no answer. Federal modernization grants are available. SOCIII as a free verification layer that *survives* ransomware (because the chain is anchored externally) is a politically zero-friction adoption story.

3. **AI-generated deed fraud is becoming a real attack vector.** Synthetic IDs forge documents that pass current verification standards. The audit chain catches them by anchoring a parcel's history *before* a fraudulent transaction appears, making forged deeds detectable in real time.

4. **CFPB enforcement of RESPA is collapsing under capacity.** Section 8 violations (kickbacks, fee-splitting, AfBA non-disclosure) happen every day. CFPB prosecutes a handful per year. Plaintiff bar can't prove what they can't see. The market for *the evidence that didn't exist* is enormous and pent up.

5. **Coinbase, Storyhouse, and the funding environment are aligned.** Coinbase Business KYB approved 2026-06-01. CDP API integration queued. Storyhouse $2M committed pending Kent cofounder formalization. Patent portfolio in place. The capital is there to execute.

This is a once-in-a-cycle convergence. The window is approximately 24 months before incumbents (Google, Compass, Sotheby's, the title insurance industry, the recorder-software vendors like Tyler Technologies) figure out what's happening and either copy us, sue us, or buy us. The answer to all three is the same: ship faster.

---

## The give-it-away-as-supplement model

The reason HOM DAO didn't move counties wasn't that the thesis was wrong. The thesis was right. The *delivery* was wrong: HOM DAO was always positioned as an *expensive replacement* for the county's existing system. No county can justify replacement — they have budget cycles, vendor contracts, political risk, IT integration nightmares, and a staff that doesn't want to retrain.

SOCIII's audit chain is the opposite shape: a *free parallel layer* that costs the county nothing, requires nothing of their staff, doesn't replace their vendor, doesn't change their political surface, and protects them from ransomware + deed fraud + lawsuits they couldn't defend.

The adoption sequence:

1. **Phase 1 — Supplement.** Pre-populate parcel DTCs for the target jurisdiction from ATTOM and public records. Anchor each. Build the verification API. Counties don't know or don't care; the substrate exists either way.
2. **Phase 2 — Acknowledgment.** Walk into the recorder's office: "We already built this for you. It costs you nothing. It survives ransomware. Want to acknowledge it as your verification layer?" Acknowledgment is political cover at zero cost. They say yes.
3. **Phase 3 — Integration.** Counties begin to record-into SOCIII simultaneously with their own system. Both copies exist. Theirs is the legal record; ours is the verifiable copy. Lawsuits, audits, and fraud cases cite ours.
4. **Phase 4 — Inversion.** Insurers, lenders, banks, attorneys, regulators all begin to *require* SOCIII-anchored process as a condition of business. The county's own system becomes downstream of ours. They become an SOCIII customer for their own data.

This is the same playbook Wikipedia ran on Britannica, Linux ran on Solaris, Bloomberg ran on Telerate. The free supplement wins by being undeniable.

---

## The Bloomberg distribution model (not Wikileaks)

The legal-side question — "how do we get this in front of law firms?" — has two possible answers:

**Wikileaks model:** mass public release of evidence patterns. Press picks it up. Force enforcement through public pressure. *Rejected.* Legal exposure (defamation, tortious interference, privacy if anyone is misidentified). Burns commercial relationships. Forces incumbents into anti-SOCIII coalition. Hard to monetize.

**Bloomberg model:** *adopted.* We don't publish. We *provide*. Subscribers (plaintiff firms, defense firms, insurers, regulators) pay for access. Their actions — case filings, demand letters, enforcement announcements, press releases — generate the news. We earn subscription revenue while staying structurally neutral on the litigation itself. The press story is the cases that get filed because the evidence exists.

The Wikileaks framing is preserved *as latent leverage*. Incumbents know the evidence exists and could theoretically be released. The threat accelerates subscription adoption. But we never execute it.

The pricing tiers scale with case stakes, not seat count. A solo plaintiff firm pays $1K/month for ZIP-level pattern access. A class-action firm pays $40K/year for jurisdiction-level filtered packages with API access. A title insurance carrier pays $1M+/year for portfolio-wide risk scoring. A state AG pays a public-sector subscription for prosecution-grade evidence packages. Each tier subsidizes the next.

---

## The four-constituency sales motion

Adoption happens in parallel across four constituencies, each with different speed, different pitch, different deal size, different psychology. **State AGs are the lead wedge** because their authority forces the issue immediately — subpoena power, settlement power, election-cycle press incentive, and a small staff with a big mandate that desperately needs better tools. Plaintiff bar follows AG cases. Closing attorneys adopt as malpractice defense becomes obvious. County recorders acknowledge once the political cover is established.

### 1. State AGs — the forcing function

Reformist state attorneys general (NY James, CA Bonta, MN Ellison, MA Campbell, CO Weiser, others — pattern of consumer-protection-active AGs across both parties) are the highest-leverage first wedge. Each one carries:

- **RESPA-equivalent state authority** via unfair/deceptive practices acts, state consumer protection statutes, anti-kickback rules
- **Subpoena power** that forces industry actors to produce records (with our audit chain matching)
- **Settlement authority** (industry pays without trial — multi-hundred-million-dollar settlements are routine in mortgage/title/real-estate enforcement)
- **Press incentive** — AGs are elected, big cases are political capital
- **Small staff, big mandate** — they need tools they don't have to build
- **Multi-year case dockets** — once an AG opens an investigation, every other industry actor in the state has to consider their exposure

**What they see in their SOCIII workspace:** state-wide pattern detection across every transaction in their jurisdiction. *"In 2024-2025, your state had 1,247 transactions with structural hallmarks of RESPA Section 8 violations. Top 50 sorted by dollar value, with full audit-chain evidence and recommended subpoena targets."* Click any case to see the broker-title-lender-escrow chain. Click "package for prosecution" to generate the subpoena and evidence binder via LIT-001.

**Two action lanes:** prosecute with our evidence and become a national consumer-protection leader; OR watch private plaintiffs do it first using the same data and have to explain why your office didn't move.

**Bloomberg vs Whistleblower for AGs specifically:**

- **NOT whistleblower.** We don't publicly release. Releasing publicly would make us the news; we don't want to be the news. We also could not later sell defense-side subscriptions to firms representing the targets (conflict of interest as a public crusader).
- **Bloomberg model with a public-sector tier.** AGs get access via a structured public-sector subscription — possibly free or heavily subsidized for the first 12 months as launch partners, then a fixed annual fee comparable to their Westlaw/Lexis budget. The AG files cases using SOCIII evidence; the press story is the AG's case, not SOCIII's data release. We stay structurally neutral.
- **The structural beauty:** AG cases generate the demand signal for the other three constituencies. Defense counsel suddenly *needs* SOCIII (to defend their clients against AG action). Closing attorneys suddenly *need* SOCIII (to document forward malpractice posture). County recorders suddenly *need* SOCIII (to demonstrate cooperation with the AG's mandate). Insurance carriers suddenly *need* SOCIII (to reduce loss exposure as litigation rises).
- **The AG is the distribution channel; defense counsel is the revenue source.** The AG pays public-sector rates (small revenue, large political capital, distribution leverage). Defense counsel pays market rates (large revenue, scaling per case filed by the AG). This is the same model Westlaw and Lexis run — sell cheap to the public sector that generates the case law; sell expensive to the private firms that defend against it.

**First wedge:** 2-3 reformist AGs with active consumer-protection / real-estate enforcement records. Cold-pitch the AG's chief of consumer protection or civil rights division. Offer a 90-day free trial with our team embedded. One AG investigation opened using SOCIII evidence is the forcing function for everything else.

### 2. Plaintiff bar — fast monetization (revenue arrives quickly once AG cases break)

Mid-size class-action and consumer-protection firms with existing RESPA / consumer-protection / deed-fraud practices.

- **What they see when they open their workspace:** every transaction in target jurisdictions with structural hallmarks of RESPA Section 8 violations — disguised kickbacks via marketing services agreements, undisclosed Affiliated Business Arrangements, escrow self-dealing, steering, float capture. Sorted by aggregate damages exposure.
- **Two action lanes:** file these cases now via PARA-001 demand-letter drafting; OR subscribe to the next-200-cases pipeline as the substrate detects them.
- **Their realization:** every case I couldn't bring before because discovery was prohibitively expensive — they already did the discovery.
- **Pitch shape:** *"You no longer choose whether to know. You choose whether to act on what you know."*
- **First wedge:** 3-5 mid-size class-action firms with RESPA practices. One pilot firm. One real case filed off SOCIII data. The case is the marketing.

### 3. Closing attorneys — structural adoption

In the ~19 attorney-closing states (NJ, NY, MA, CT, NC, SC, GA, NC, plus others), every real estate closing requires an attorney.

- **What they see:** their entire closing book, with each transaction annotated for malpractice exposure (chain-of-title gaps, missed liens, disclosure failures, FIRPTA exposure).
- **Two action lanes:** use SOCIII as forward malpractice defense (every new closing anchored, defensibly documented); OR wait until opposing counsel uses the audit chain against you.
- **Their realization:** every closing I've done is traceable. The audit chain exists whether I use it or not. I should use it.
- **Pitch shape:** state bar association CLE-credit partnerships. Audit-anchored process becomes a best-practice standard.
- **First wedge:** NJ, NY, MA, NC, GA — states where the bar association has CLE-mandate authority and reformist leadership.

### 4. County recorders — substrate distribution

Working recorders at small-to-mid-size counties. Sublette WY (~10K population, ~5K parcels) is the pilot.

- **What they see:** their county's entire parcel set, pre-populated, anchored, queryable. A ransomware survival demonstration. A deed-fraud detection demonstration.
- **Two action lanes:** acknowledge SOCIII as the county's verification layer (free, political cover, ransomware defense); OR don't, and remain exposed when the next attack hits.
- **Their realization:** this exists whether I want it to or not. Acknowledging it costs nothing and protects me.
- **First wedge:** Sublette WY (no relationships needed; cold). Then Mono CA (Bridgeport — warm intro from Sean's Mammoth development era). Then Placer CA (warm intro via Kimmi + Christina).

### 5. Insurance carriers — loss-ratio motivated

Title insurance underwriters (Stewart, Old Republic, the smaller carriers) and property insurance carriers.

- **What they see:** their entire underwriting portfolio with risk surfacing per parcel — chain-of-title risk, encumbrance risk, fraud-pattern risk, climate risk, regulatory risk.
- **Two action lanes:** integrate SOCIII risk scoring into underwriting (reduce loss ratio); OR continue underwriting blind and accept the loss ratio.
- **Their realization:** every claim we paid where we couldn't have known — we could have known now.
- **Pitch shape:** enterprise contract with the carrier's CTO + chief actuary. Pilot integration on a single product line. Loss-ratio improvement = adoption.
- **First wedge:** a smaller carrier (not Fidelity / First American — too entrenched) hungry for differentiation. Kimmi's network is the unlock here.

These five constituencies pay different amounts at different speeds for the same underlying data. **State AGs are the forcing function** — small direct revenue, massive distribution leverage, generates the demand signal that pulls every other constituency in. Plaintiff bar is fast and small-dollar (revenue arrives quickly once AG cases break). Closing attorneys are structural and accumulating. County recorders are free-tier acknowledgment that distributes the substrate. Insurers are slow and enterprise-scale.

The order of operations: **State AG investigation opens using SOCIII evidence → press story → defense counsel subscribes to defend → plaintiff bar subscribes to bring parallel private cases → closing attorneys subscribe as forward malpractice defense → county recorders acknowledge as political cover → insurers integrate to reduce loss ratios.** The whole flywheel spins from one AG case.

---

## The Sublette WY pilot

### Why Wyoming

- Crypto-friendly state legislation (DAO LLC law, blockchain registry law)
- Small population, manageable record count
- Working recorders with independent authority (no state legislature approval)
- No personal political baggage for Sean
- Strong property-rights culture (audit chain reads as protection, not intrusion)
- Federal grants for digital modernization available

### Why Sublette specifically

- ~10K population, ~5-7K parcels countywide
- ATTOM coverage confirmed: ZIP 82941 returned 4,657 indexed properties in test pull on 2026-06-02
- Pinedale seat — small enough to know the recorder personally on first call
- No major political theater
- Representative property mix (residential + ranch + commercial + energy)

### Cost and timeline

- **Sublette County pilot:** ~$1,000 in ATTOM API costs to pull every parcel. ~$500 in Base anchor gas. ~1 week of build time. Total: under $2K and 1-2 weeks.
- **Wyoming statewide:** ~250-400K parcels. ~$50-80K in ATTOM costs at developer pricing. Could be reduced 80%+ by negotiating bulk licensing with ATTOM or going direct to county records where the economics warrant.

### Activation sequence

1. **Week 1 (6/9-6/13):** Spec ESC-013 Parcel Atlas. Lock schema. Build ingestion service. Test on a 10-parcel sample.
2. **Week 2 (6/16-6/20):** Bulk pull Sublette County ATTOM. Anchor every parcel on Base. Build the audit-ledger viewer.
3. **Week 3 (6/23-6/27):** Case study deck. Press release ready. Cold-call Sublette recorder.
4. **Week 4 (6/30+):** Walk into Mono Bridgeport with the Sublette case study. Same to Placer. Each warm intro starts a parallel acknowledgment conversation.
5. **Week 5+ :** Repeat with plaintiff firm outreach using the substrate as the demo.

---

## ESC-013 Parcel Atlas — the dogfood worker

Specced separately in the companion brief (the second brief in this sequence — coming next). High-level shape:

- **Vertical:** title-escrow
- **Type:** composite, always-on
- **Pricing:** $99/mo for individual subscribers; tiered enterprise for insurers and law firms
- **Schema:** Parent DTC (boundary unit: ZIP / county / Ahupua'a / reservation / polygon). Child DTCs (individual parcels). Logbook entries (every recorded change).
- **Ingestion:** ATTOM Property + Sale + Assessment + Lending + Permits endpoints via bulk pull
- **Anchor:** Coinbase CDP on Base, merkle-batched weekly per S52.15 cost model
- **Canvas tabs:** Boundary Map / Parcel List / Audit Trail / Opportunities / Risk Heatmap / Subscription
- **Polymorphic boundary unit** — ZIP for default; county for recorder pilots; Ahupua'a for sovereign deployments; reservation for Tribal deployments; arbitrary polygon for custom (e.g., a watershed, an HOA, a school district)
- **Powers** ESC-001 through ESC-012 (every existing title-escrow worker now operates on a pre-anchored substrate instead of one-off transaction data)

---

## The legal worker constituency map

`catalogs/legal.json` ships today with PARA-001 (Paralegal) and PAT-001 (Patent Worker), both live in Firestore as of 2026-06-02 morning. The full legal family expands to:

| Worker | Constituency | Action lane |
|---|---|---|
| **PARA-001** Paralegal (live) | Brokers + advisors + employers + investors needing multi-party instruments | Drafts loan/warrant/advisor/RSPA/IP-assignment/employment bundles |
| **PAT-001** Patent Worker (live) | SOCIII's own portfolio + biotech + software companies | Manages patent lifecycle, deadlines, grace periods |
| **LIT-001** Litigation Discovery (to spec) | Plaintiff bar | Finds cases from substrate patterns, packages evidence, generates demand letters |
| **DEF-001** Compliance Defense (to spec) | Brokers / title / lenders / escrow holders defending against the above | Proactively audits client books, identifies exposure, drafts remediation |
| **DD-001** Transaction Due Diligence (to spec) | Big law M&A and real-estate finance partners | Deal-time audit-chain reports on target assets |
| **CLOSE-001** Closing Attorney (to spec) | Attorney-state closing lawyers (NJ, NY, MA, NC, GA, etc.) | Workflow for attorney-anchored closings with audit-chain malpractice defense |

Each of these is a "Brandon-equivalent" workspace: the user opens it, sees the data, chooses a lane. Offense or defense. The substrate is the same; the audience determines the framing.

---

## Coinbase strategic positioning

### What Coinbase wants

1. **Killer Base app.** They invested billions in Base. Base needs real-world, regulated-industry, non-memecoin use cases. *"The audit chain for U.S. property records"* is the killer app they have not yet found.
2. **Regulatory credibility.** Coinbase has been fighting the SEC for legitimacy. Owning (or funding) regulated-industry-grade audit infrastructure resolves multiple regulatory threads.
3. **TAM expansion.** U.S. property + title + escrow + lending compliance is ~$50B/yr. Their market cap is ~$60B. Acquiring SOCIII at any reasonable multiple expands their addressable market by an order of magnitude.
4. **Wallet acquisition.** Every property owner eventually has a Coinbase Wallet as their audit ledger. Most distributed wallet acquisition channel ever conceived.
5. **Anti-Big-Tech narrative.** Coinbase positioning as the credible alternative to Google/Microsoft in regulated industries.
6. **Government channel.** Coinbase corp dev cannot walk into a county recorder's office. SOCIII can.

### How to set up the conversation

- Approach when Coinbase Business KYB completes and CDP credentials are live. Existing technical relationship is the natural opening.
- Lead with: *"we're building the killer Base app — let's talk about how Coinbase wants to participate."* The asymmetry of who-needs-whom is opposite of a normal VC pitch.
- Two viable deal shapes:
  - **Strategic equity round** led by Coinbase Ventures, with Storyhouse already in.
  - **Commercial partnership first** (CDP credits, Base gas subsidy, joint GTM to one pilot county) that ramps into equity after the pilot proves out.
- Long-term option: acquisition. Don't pitch this. Design the partnership so it's structurally available later.

### What we don't ask for

- Bribes to anyone, ever (Palau lesson — see Sovereign Vector section)
- Exclusivity on the chain (we are chain-agnostic; Base is preferred, Polygon is fallback)
- Compromise on the audit-chain governance (we own this, not Coinbase)

---

## The sovereign vector — parked but designed for

Sean was Minister of Finance for the Sovereign Nation of Hawaii. The land-title work that started SOCIII traces back to that role. The HOM DAO experience taught us how to *not* build for sovereigns. Palau taught us never to pay rulers. These lessons are foundational, not historical.

### Current state: parked

Hawaii politics are too captured. State barfed all over the HOM DAO/TitleApp pitch precisely because the verification was the threat. Engaging now would be a time sink Sean cannot afford while the substrate is being built.

### Design principles for when it unparks

1. **No payments to rulers.** Ever. Bribes invalidate the platform's value proposition (which is anti-corruption transparency). Walk away from any sovereign deal that demands them.
2. **Sell to citizens, not executives.** Pitch to parliaments, councils, opposition parties, citizen groups, NGOs, courts. Not the president's office.
3. **Open enough to be uncapturable.** The audit chain must be transparent and forkable enough that no single actor — including SOCIII itself — can corrupt the record.
4. **Refuse fast on corruption-coded deals.** The minute a counterpart asks for a side payment, walk.

### The activation moment

When SOCIII has built the substrate, raised the strategic round, and has bandwidth for the political work, Waimānalo Ahupua'a is the lighthouse deployment of the century:

> *"The Sovereign Nation of Hawaii anchors its first Ahupua'a — every parcel from mountain to sea, cryptographically verifiable, in the hands of Brandon Maka-awa-awa and the citizens of Waimānalo. Either purchase, or use the legal workers to file quiet title actions and rebuild the Ahupua'a."*

That is a press story that writes itself globally. It connects the founder's history, the substrate, the legal workers, and the values throughline in one move. It is not for this year. It is the activation moment for the year when the substrate is real, the funding is in, and Sean has the time.

---

## HOM DAO failure modes explicitly avoided

To prevent SOCIII from sliding into the same traps:

1. **No token mechanics.** Counties, insurers, lenders, attorneys do not want to hold a token. They want USD billing and audit hashes. SOCIII bills in USD and anchors as audit records, never as tradeable tokens.
2. **No DAO governance.** Sole-director governance per `project_sociii_ip_governance_philosophy`. Audit chain is the substrate; governance stays human and accountable.
3. **No crypto vocabulary in customer surfaces.** Never "NFT," "mint," "token," "memecoin," "DeFi," "Web3." Always "logbook entry," "audit ledger," "anchor record," "parent / child DTC." Per `S52.15` vocabulary discipline.
4. **Right buyers, not crypto-native buyers.** Insurance, lending, government, plaintiffs' bar, defense counsel. None of whom care about crypto. All of whom care about evidence.

---

## Worker strategy summary

**Substrate worker (ships next):**
- ESC-013 Parcel Atlas — pre-populates parcel DTCs from ATTOM, anchors on Base, polymorphic boundary unit

**Application workers (already shipped today):**
- PARA-001 Paralegal — live in Firestore as of 2026-06-02
- PAT-001 Patent Worker — live in Firestore as of 2026-06-02

**Application workers (to spec next):**
- LIT-001 Litigation Discovery
- DEF-001 Compliance Defense
- DD-001 Transaction Due Diligence
- CLOSE-001 Closing Attorney

**Existing workers that gain depth from the substrate:**
- ESC-001 through ESC-012 (entire title-escrow vertical)
- Real Estate workers (broker, property mgmt, escrow, developer)
- Banking/Finance workers (fundraise, lending, underwriting)
- Insurance workers (to be defined)

**Vertical activation order:**
1. Title-Escrow (Sublette pilot) — Q3 2026
2. Legal (plaintiff bar wedge + closing attorney wedge) — Q3-Q4 2026
3. Insurance (carrier pilot) — Q4 2026 - Q1 2027
4. Lending (forward DD, foreclosure intelligence) — Q1 2027
5. Sovereign (Waimānalo Ahupua'a, when activated) — Q2 2027 or later

---

## Open questions for the next session

1. **Kimmi's advisory contextualization.** She is the strategic architect for the insurer + county-records lane. Sean handles the direct conversation; the Fellow agreement she received this morning should be supplemented with a personal note recontextualizing her role.
2. **Coinbase outreach timing.** When does the strategic conversation begin? Probably when CDP credentials go live (within 30 days). Who is the right entry point — Coinbase Ventures, corp dev, or Brian Armstrong's office directly?
3. **First plaintiff firm to approach.** Need to identify 3-5 mid-size firms with active RESPA practices. Apollo lookup or warm intro?
4. **Sublette recorder cold-call vs warm-intro path.** Cold is fine for the pilot; warm is better. Anyone in Sean's network with a Sublette or Pinedale connection?
5. **First insurance carrier.** Smaller, hungry for differentiation, not Fidelity / First American. Kimmi's network unlocks this.
6. **HOM DAO failure-modes doc.** Do we capture as durable institutional memory now, or hold? Recommended: capture now (separate doc) for institutional clarity and investor disclosure.

---

## What this document is not

- It is not the pitch deck. The deck is downstream of this and adapts language by audience.
- It is not the product spec. ESC-013 Parcel Atlas spec is the next brief in this sequence.
- It is not legal advice. Counsel reviews any specific go-to-market motion before execution.
- It is not a commitment to timeline. The activation order is the planned sequence; pilots and partnerships may accelerate or delay specific tracks.

---

## Related

- `[[CODEX-S52.15-Audit-Trail-Architecture-DTC-Logbook-Model]]` — the audit substrate this strategy depends on
- `[[CODEX-S52.16-Paralegal-Worker-Spec]]` — PARA-001 worker spec (shipped today)
- `[[CODEX-S52.17-Patent-Worker-Spec]]` — PAT-001 worker spec (shipped today)
- `[[CODEX-S52.19-ATTOM-Integration-and-Title-Abstract-Report]]` — ATTOM ingestion (now subsumed by ESC-013 Parcel Atlas)
- `[[project-real-estate-vertical-strategy]]` — earlier RE strategy memory (now superseded by this document)
- `[[project-attom-title-abstract-thesis]]` — Title Abstract Report thesis (now a child concept inside the substrate)
- `[[project-sociii-ip-governance-philosophy]]` — governance discipline this strategy preserves

---

*This document is the strategy lock for SOCIII's audit-substrate work. The platform's identity is set by this brief. Subsequent product specs, pitch decks, partnerships, and worker builds derive from this thesis. Updates require explicit revision; ad-hoc reframing across surfaces causes drift.*
