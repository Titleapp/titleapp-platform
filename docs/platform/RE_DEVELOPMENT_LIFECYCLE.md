# Real Estate Development Lifecycle Workers (22g)

This document specs every Digital Worker needed to cover the full real estate development lifecycle — from site acquisition through disposition. These are Scott Eschelman's operational vertical and represent TitleApp's first fully mapped industry pipeline.

Hawaii is used as the regulatory baseline for the Environmental and Cultural Review Worker because it's the hardest jurisdiction in the country — requiring biological surveys (endangered species, critical habitat), archaeological/historical reviews (SHPD Section 106), and cultural impact assessments (Native Hawaiian burial councils, traditional and customary practices). If the worker can handle Hawaii, it can handle anywhere.

**APPROACH:** Every worker gets a URL, landing page, and waitlist immediately (per 22e). Workers are built in priority order based on Scott's operational needs and market demand signals from waitlists.

---

## BUILD PRIORITY ORDER

| Priority | Worker | Slug | Why |
|----------|--------|------|-----|
| 1 | CRE Deal Analyst | `cre-analyst` | LIVE — Scott's entry point |
| 2 | Investor Relations | `investor-relations` | T2 building now (Session 25) |
| 3 | Construction Manager | `construction-manager` | Scott's daily ops — scheduling, RFIs, draws |
| 4 | Title & Escrow | `title-escrow` | Core TitleApp product — chain of title, on-chain |
| 5 | Mortgage Broker / Lending | `mortgage-broker` | Debt sourcing, loan compliance, refi |
| 6 | Entitlement & Land Use | `entitlement-analyst` | Pre-development critical path |
| 7 | Engineering Review | `engineering-review` | Civil, structural, traffic, utilities |
| 8 | Environmental / Cultural / Bio | `environmental-review` | Hawaii-baseline, Phase I/II, Section 106 |
| 9 | Architecture & Plan Review | `architecture-review` | Plan analysis, code compliance, AHJ coordination |
| 10 | Permit Submission | `permit-tracker` | Application filing, deficiency response, status tracking |
| 11 | Bid & Procurement | `bid-procurement` | Sub solicitation, bid analysis, buyout |
| 12 | Construction Lending & Draw | `construction-draws` | Draw requests, lien waivers, AIA billing |
| 13 | Labor & Staffing | `labor-staffing` | Crew scheduling, OSHA, prevailing wage |
| 14 | Accounting | `construction-accounting` | Job costing, change orders, owner reporting |
| 15 | Insurance & COI | `insurance-coi` | Policy management, COI tracking, claims |
| 16 | Tax & Assessment | `tax-assessment` | Property tax appeals, reassessment |
| 17 | Compliance & Deadline Tracker | `compliance-tracker` | Cross-phase deadline management |
| 18 | Legal & Contract | `legal-contracts` | Drafting, redline, tracking across all phases |

**Already live/spec'd:** CRE Analyst, IR Worker (building), Alex (22d), Document Engine (22b), Property Management (catalog), Real Estate Sales (catalog)

---

## LIFECYCLE MAP

```
PHASE 1: ACQUISITION
  CRE Deal Analyst -> Title & Escrow -> Environmental Review -> Mortgage Broker -> IR Worker

PHASE 2: ENTITLEMENT & PRE-CONSTRUCTION
  Entitlement Analyst -> Engineering Review -> Architecture Review -> Permit Tracker

PHASE 3: CONSTRUCTION
  Construction Manager -> Bid & Procurement -> Construction Draws -> Labor & Staffing

PHASE 4: STABILIZATION & OPERATIONS
  Property Management -> Accounting -> Insurance & COI -> Tax & Assessment

PHASE 5: DISPOSITION
  CRE Analyst (reverse) -> IR Worker (exit) -> Real Estate Sales

HORIZONTAL (ALL PHASES)
  Alex -> Document Engine -> Compliance Tracker -> Legal & Contracts
```

---

## WORKER SPECS

Each spec below contains everything needed to:
1. Build the landing page and waitlist (T1 — immediate)
2. Register the slug and Firestore entry (T1 — immediate)
3. Generate the RAAS library via Worker #1 (when built)
4. Build the worker (in priority order)

---

## PHASE 1: ACQUISITION

---

### 1.1 CRE DEAL ANALYST
- **Slug:** `cre-analyst`
- **Status:** LIVE
- **Covered in:** Session 22 deliverables, three-deal demo

---

### 1.2 TITLE & ESCROW WORKER

- **Slug:** `title-escrow`
- **URL:** `titleapp.ai/workers/title-escrow`
- **Suite:** Real Estate
- **Pricing:** Professional $29/mo
- **Priority:** #4
- **Status:** Spec ready — this is the original TitleApp core product

#### Landing Page Headline
"Pull, analyze, and verify title in minutes. Chain of title on blockchain. Escrow managed from open to close."

#### Capabilities
- **Title Report Analysis:** Parse preliminary title reports and title commitments. Identify and classify all exceptions: liens (tax, mechanics, judgment, HOA), easements (utility, access, conservation, aviation), encumbrances, CC&Rs, deed restrictions, pending litigation. Risk-rank each item (clear / minor / critical / deal-killer).
- **Chain of Title:** Trace full ownership history. Identify gaps, breaks, clouds, or irregularities. Flag quit-claim transfers, estate transfers without probate, forged instruments, wild deeds.
- **Visual Title Map:** Generate a visual encumbrance overlay showing easement locations, setback lines, and restriction zones relative to the property boundary.
- **Title on Chain:** Hash and record title status on blockchain for immutable verification. Track title transfers with on-chain audit trail. Supports Ethereum, Polygon.
- **Escrow Management:** Track escrow timeline from opening through closing. Monitor contingency deadlines. Coordinate document collection. Track earnest money deposits. Generate closing checklists.
- **Title Clearing:** For defects identified, recommend cure actions — release of lien, affidavit of heirship, quiet title action, corrective deed. Draft required documents via Document Engine.
- **Title Insurance Coordination:** Compare title commitment exceptions with standard exceptions. Identify endorsements needed. Flag items requiring underwriter approval.

#### RAAS Domains (Tier 1)
- State recording statutes (all 50 states)
- Title insurance regulations (state-specific)
- RESPA/TRID (federal closing disclosure requirements)
- Blockchain recording statutes (where enacted)
- UCC Article 9 (fixture filings, security interests)
- Federal/state lien priority rules
- Escrow licensing requirements (state-specific)

#### Referral Triggers (Tier 2)
- Property below replacement cost detected → suggest CRE Analyst
- Environmental easement or contamination noted → suggest Environmental Review Worker
- Zoning or land use restriction flagged → suggest Entitlement Analyst
- Complex estate/probate chain → suggest Legal & Contract Worker
- Active mechanics lien → suggest Construction Manager or Legal Worker

#### Connects To
- **Reads from:** CRE Analyst (property data, deal status)
- **Writes to:** Vault deal object (title status, exceptions, chain of title)
- **Hands off to:** Environmental Worker, Entitlement Worker, Mortgage Broker (for lender title requirements), IR Worker (title status for offering docs)

---

### 1.3 ENVIRONMENTAL, CULTURAL & BIOLOGICAL REVIEW WORKER

- **Slug:** `environmental-review`
- **URL:** `titleapp.ai/workers/environmental-review`
- **Suite:** Real Estate
- **Pricing:** Professional $29/mo
- **Priority:** #8
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Phase I through remediation. Biological surveys. Archaeological review. Cultural impact assessment. Built for Hawaii-level complexity."

#### Capabilities
- **Phase I Environmental Site Assessment:** Screen for recognized environmental conditions (RECs) per ASTM E1527-21. Review historical use (Sanborn maps, aerial photos, EDR reports), regulatory databases (CERCLIS, RCRA, UST, LUST, VCP), and site reconnaissance findings. Classify as no REC / de minimis / controlled REC / REC / significant REC.
- **Phase II Coordination:** When Phase I flags RECs, scope the Phase II investigation — sampling plan, analytical methods, regulatory thresholds. Track Phase II results and compare to applicable cleanup standards (state and federal).
- **Remediation Tracking:** For confirmed contamination, track remediation plans, cleanup milestones, regulatory approvals, monitoring requirements, and no-further-action (NFA) letter status. Calculate estimated remediation costs and timelines.
- **Biological Review:** Conduct desktop biological screening for listed species (federal ESA and state equivalents). Identify critical habitat, wildlife corridors, wetlands (CWA Section 404), and sensitive ecosystems. Flag seasonal survey windows. Hawaii-specific: native species (Hawaiian monk seal, Hawaiian hoary bat, hawksbill turtle, native birds), critical habitat designations, conservation districts.
- **Historical / Archaeological Review:** Screen for NRHP-listed or eligible properties, known archaeological sites, historic districts, and cultural landscapes. Coordinate with SHPO/THPO for Section 106 compliance. Hawaii-specific: pre-contact archaeological sites, historic plantation-era structures, WWII-era military sites. Generate Archaeological Inventory Survey (AIS) scoping.
- **Cultural Impact Assessment:** For jurisdictions requiring it (Hawaii Chapter 343, tribal consultation under NHPA), manage cultural impact assessment process. Hawaii-specific: coordinate with Office of Hawaiian Affairs (OHA), Native Hawaiian burial councils (NHBC), conduct cultural practice surveys, identify traditional and customary rights, manage burial treatment plans for inadvertent discoveries.
- **NEPA/CEQA/HRS 343 Compliance:** Determine required level of environmental review (Categorical Exclusion / Environmental Assessment / Environmental Impact Statement). Track public comment periods, agency responses, and findings. Generate compliance documentation.
- **Wetland Delineation Tracking:** Track CWA Section 404 permit status, Army Corps jurisdictional determinations, wetland mitigation requirements and banking credits.

#### RAAS Domains (Tier 1)
- CERCLA/Superfund (federal cleanup liability)
- RCRA (hazardous waste management)
- Clean Water Act Section 404 (wetlands)
- Endangered Species Act (federal) + state equivalents
- NEPA (federal environmental review)
- CEQA (California) / HRS Chapter 343 (Hawaii) / state equivalents
- NHPA Section 106 (historic preservation)
- NAGPRA (Native American graves protection)
- Hawaii: HRS Chapter 6E (historic preservation), SHPD rules, NHBC procedures, OHA consultation
- State-specific contamination cleanup standards
- ASTM E1527-21, E1903-19 (Phase I/II standards)

#### Referral Triggers (Tier 2)
- Contamination found → estimate remediation cost → send to CRE Analyst for deal re-scoring
- Wetlands identified → suggest Engineering Review Worker for site plan implications
- Archaeological discovery → suggest Legal Worker for compliance obligations
- Endangered species habitat → suggest Entitlement Worker (development restrictions)
- Clean Phase I → all clear to proceed → notify Alex

#### Connects To
- **Reads from:** CRE Analyst (property location), Title Worker (environmental easements)
- **Writes to:** Vault deal object (environmental status, bio survey results, cultural findings)
- **Hands off to:** Engineering Review (site constraints), Entitlement Worker (environmental conditions on approval), Mortgage Broker (lender Phase I requirements), Legal Worker (compliance obligations)

---

### 1.4 MORTGAGE BROKER & LENDING WORKER

- **Slug:** `mortgage-broker`
- **URL:** `titleapp.ai/workers/mortgage-broker`
- **Suite:** Finance & Investment
- **Pricing:** Business $49/mo
- **Priority:** #5
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Source the best debt. Acquisition loans, construction financing, bridge, perm, refi. Manage compliance from term sheet to payoff."

#### Capabilities
- **Loan Shopping & Comparison:** Based on deal parameters (property type, LTV, DSCR, borrower profile), identify best-fit lenders across: agency (Fannie Mae, Freddie Mac, FHA/HUD), CMBS, bank/credit union, bridge lenders, debt funds, life companies, SBA (504, 7a). Generate comparison matrix with rates, terms, fees, prepayment, recourse, and reserve requirements.
- **Term Sheet Analysis:** Parse and analyze lender term sheets. Compare key terms across multiple offers. Flag unfavorable provisions (bad-boy carve-outs, cash management triggers, lockbox requirements, rate floors). Score each term sheet against deal criteria.
- **Application Packaging:** Compile lender package — borrower financial statements, entity docs, rent roll, operating statements, property condition report, appraisal, Phase I, title commitment, insurance binder. Track document checklist by lender.
- **Construction Financing:** Specialized for construction loans — budget-to-loan reconciliation, interest reserve sizing, holdback calculations, completion guarantee analysis, guaranteed maximum price (GMP) tie-outs.
- **Loan Compliance Management:** Post-closing — track all loan covenants, DSCR tests, reporting requirements, insurance requirements, reserve balances, rate lock expirations, maturity dates, extension options. Alert before covenant breaches.
- **Refinance Analysis:** Monitor rate environment against existing debt. Model refinance scenarios — breakeven analysis, prepayment penalty calculation, net savings, cash-out potential. Recommend optimal refi timing.
- **Rate Lock Management:** Track rate lock expiration, extension costs, float-down options. Model rate sensitivity on deal returns.
- **Lender Relationship Management:** Track lender contacts, prior transactions, appetite by property type and geography. Maintain lender matrix.

#### RAAS Domains (Tier 1)
- TILA/Regulation Z (truth in lending)
- RESPA (real estate settlement procedures)
- Dodd-Frank (ability to repay, qualified mortgage)
- ECOA/Fair Lending
- BSA/AML (suspicious activity reporting)
- State mortgage broker/banker licensing (NMLS)
- Agency guide requirements (Fannie DUS, Freddie CME, FHA MAP)
- SBA lending regulations (504, 7a)
- CMBS servicing standards (PSA requirements)
- State usury laws

#### Referral Triggers (Tier 2)
- Lender requires Phase I → suggest Environmental Worker
- Lender requires appraisal update → suggest CRE Analyst for valuation refresh
- Lender requires title update → suggest Title Worker
- Construction loan approved → suggest Construction Draw Worker for draw management
- Loan maturity approaching → alert Alex, suggest Refi analysis
- SBA loan opportunity → may need Legal Worker for eligibility and guaranty structuring

#### Connects To
- **Reads from:** CRE Analyst (deal financials, cap rate), Title Worker (title commitment), Environmental Worker (Phase I status), IR Worker (equity raised, capital structure)
- **Writes to:** Vault deal object (loan terms, compliance status, maturity tracking)
- **Hands off to:** Construction Draw Worker (for construction loans), Insurance Worker (lender insurance requirements), Accounting Worker (debt service schedules), Legal Worker (loan document review)

---

### 1.5 INVESTOR RELATIONS WORKER
- **Slug:** `investor-relations`
- **Status:** T2 building now
- **Covered in:** Session 25 scope document
- **Priority:** #2

---

## PHASE 2: ENTITLEMENT & PRE-CONSTRUCTION

---

### 2.1 LAND USE & ENTITLEMENT WORKER

- **Slug:** `entitlement-analyst`
- **URL:** `titleapp.ai/workers/entitlement-analyst`
- **Suite:** Real Estate
- **Pricing:** Professional $29/mo
- **Priority:** #6
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Zoning analysis, entitlement strategy, and approval tracking. Know what you can build before you buy."

#### Capabilities
- **Zoning Analysis:** Analyze current zoning designation against proposed use. Identify: permitted uses, conditional uses requiring CUP, prohibited uses, development standards (height, FAR, density, setbacks, lot coverage, parking ratios), overlay districts, specific plans, form-based code requirements.
- **Entitlement Strategy:** Based on zoning analysis and proposed project, recommend entitlement pathway — by-right development, minor variance, CUP, zone change, general plan amendment, specific plan amendment, planned development. Estimate timeline and probability of approval for each path.
- **Application Preparation:** Generate entitlement application content — project description, justification findings, consistency analysis (general plan, specific plan, design guidelines), neighborhood compatibility analysis. Coordinate with Architecture Worker for required exhibits.
- **Hearing Tracking:** Track planning commission and city council hearing dates, agenda items, staff reports, conditions of approval. Monitor appeal periods. Flag continuances and re-hearing requirements.
- **Conditions of Approval Management:** Parse and track all conditions of approval (COAs). Assign deadlines and responsible parties. Monitor compliance. Flag conditions requiring action before next milestone (building permit, certificate of occupancy, final map).
- **CEQA/NEPA Coordination:** Determine required environmental review level. Coordinate with Environmental Worker for EIR/EIS/EA preparation. Track public comment periods and agency responses.
- **Community Engagement:** Track neighborhood meetings, public comment letters, opposition groups. Generate community benefit summaries and mitigation commitments.
- **Subdivision / Parcel Map:** Track tentative map and final map processing, lot line adjustments, parcel mergers, condominium conversions.

#### RAAS Domains (Tier 1)
- State planning and zoning enabling statutes (varies by state)
- State subdivision map acts
- Local general plans, specific plans, zoning codes
- CEQA (California) / NEPA (federal) / state equivalents
- Coastal Zone Management Act (coastal properties)
- State Housing Element law (California SB 35, builder's remedy)
- ADA accessibility requirements in site planning
- State density bonus laws
- Affordable housing inclusionary requirements (local)
- Historic district overlay regulations

#### Referral Triggers (Tier 2)
- Environmental review required → suggest Environmental Worker
- Traffic study required → suggest Engineering Review Worker
- Biological constraints identified → suggest Environmental Worker
- Zone change needed → suggest Legal Worker for application support
- Entitlements approved → suggest Permit Worker to begin plan submission
- Development fees estimated → send to CRE Analyst for deal re-scoring

#### Connects To
- **Reads from:** CRE Analyst (proposed use, density, unit count), Title Worker (deed restrictions, CC&Rs), Environmental Worker (environmental constraints)
- **Writes to:** Vault deal object (zoning status, entitlement path, COAs, timeline)
- **Hands off to:** Engineering Review (for infrastructure requirements in COAs), Architecture Worker (for plan development within entitlement constraints), Permit Worker (entitled — ready for building permit), Mortgage Broker (entitlement status for lender)

---

### 2.2 ENGINEERING REVIEW WORKER

- **Slug:** `engineering-review`
- **URL:** `titleapp.ai/workers/engineering-review`
- **Suite:** Construction
- **Pricing:** Professional $29/mo
- **Priority:** #7
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Civil, structural, traffic, utilities. Every engineering discipline reviewed, coordinated, and tracked."

#### Capabilities
- **Civil Engineering Review:**
  - Grading and drainage analysis — cut/fill calculations, stormwater management, retention/detention, low impact development (LID) compliance
  - Site utility design review — water, sewer, storm drain, dry utilities. Capacity analysis, point of connection verification, will-serve letter tracking
  - Right-of-way analysis — dedication requirements, public improvements, encroachment permits, street widening, sidewalk/curb/gutter requirements
  - Erosion control and SWPPP — stormwater pollution prevention plan review, BMP selection, NPDES compliance, construction general permit
  - Street and access — traffic circulation, sight distance, fire access, ADA path of travel, curb cuts, driveway spacing

- **Structural Engineering Review:**
  - Foundation design review — soil report analysis, foundation type recommendation (spread footing, mat, drilled pier, driven pile), bearing capacity verification
  - Structural system review — lateral force resisting system, gravity system, load path verification, special inspection requirements
  - Seismic analysis review — seismic design category, R-factor, drift limits, base shear, irregularity checks
  - Wind analysis review — wind speed, exposure category, component and cladding, MWFRS
  - Special structures — retaining walls, shoring, parking structures, podium design

- **Traffic Engineering:**
  - Traffic impact analysis review — trip generation (ITE manual), level of service analysis, intersection capacity, signal warrant analysis
  - Traffic mitigation — fair share calculations, required improvements, signal timing, turn lane requirements
  - Parking analysis — code-required spaces, shared parking studies, TDM programs, bicycle parking

- **Utility Coordination:**
  - Will-serve letter tracking for all utilities (water, sewer, electric, gas, telecom, cable)
  - Capacity analysis — fire flow requirements, sewer capacity, electrical load calculations
  - Utility relocation — identify conflicts, estimate relocation costs, track relocation agreements
  - Dry utility coordination — joint trench design, transformer pad locations, switchgear, telecom vaults

- **Geotechnical Review:**
  - Soil report analysis — bearing capacity, expansive soils, liquefaction potential, slope stability
  - Groundwater analysis — dewatering requirements, permanent subdrain design, waterproofing recommendations
  - Earthwork analysis — import/export quantities, soil suitability, compaction requirements

#### RAAS Domains (Tier 1)
- IBC/IRC (International Building Code / Residential Code)
- ASCE 7 (structural loads — seismic, wind, snow, flood)
- ACI 318 (concrete design)
- AISC 360 (steel design)
- NDS (wood design)
- TMS 402 (masonry design)
- Local amendments to IBC (city/county specific)
- NPDES / Clean Water Act (stormwater)
- MUTCD (traffic control devices)
- ITE Trip Generation Manual
- ADA/CBC accessibility (path of travel, parking)
- AASHTO (roadway design)
- State DOT standards (highway access, encroachment)

#### Referral Triggers (Tier 2)
- Environmental constraints on grading → suggest Environmental Worker
- Right-of-way dedication required → suggest Legal Worker (dedication instruments)
- Traffic mitigation fees estimated → send to CRE Analyst for cost impact
- Structural system selected → suggest Architecture Worker for coordination
- Soil contamination found during geotech → suggest Environmental Worker
- Special inspection requirements → suggest Construction Manager for scheduling

#### Connects To
- **Reads from:** Entitlement Worker (COAs with infrastructure requirements), Architecture Worker (building footprint, stories, structural system), Environmental Worker (grading constraints, wetland buffers)
- **Writes to:** Vault deal object (engineering status, infrastructure costs, utility status)
- **Hands off to:** Permit Worker (engineering plans ready for submission), Construction Manager (engineering specs for bidding), Bid & Procurement (infrastructure scope for subcontractor pricing)

---

### 2.3 ARCHITECTURE & PLAN REVIEW WORKER

- **Slug:** `architecture-review`
- **URL:** `titleapp.ai/workers/architecture-review`
- **Suite:** Construction
- **Pricing:** Professional $29/mo
- **Priority:** #9
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Plan analysis, building code compliance, AHJ coordination. From schematic design through construction documents."

#### Capabilities
- **Building Code Analysis:** Review architectural plans against applicable codes — IBC, IRC, energy code (IECC/Title 24), accessibility (ADA/FHA/CBC), fire/life safety, egress, plumbing code, mechanical code, electrical code. Identify code deficiencies before submission.
- **Plan Review Simulation:** Pre-check plans against known AHJ (Authority Having Jurisdiction) requirements. Each AHJ has specific interpretations and local amendments — worker maintains a database of AHJ-specific requirements to reduce plan check corrections.
- **Deficiency Response:** When plan check comments are received, parse each comment, categorize by discipline, suggest resolution, and track response status. Generate formal response letters with code citations.
- **Design Standard Compliance:** Check plans against design guidelines, specific plan standards, HOA architectural requirements, historic district standards, and form-based code standards.
- **Accessibility Review:** Detailed ADA/FHA/CBC review — accessible routes, unit counts and types (Type A, Type B), common area accessibility, parking, signage, sensory requirements.
- **Energy Code Compliance:** Review for Title 24 (California) / IECC compliance — envelope performance, HVAC efficiency, lighting power density, solar readiness, EV readiness, water efficiency.
- **Fire & Life Safety:** Egress analysis, fire ratings, sprinkler requirements, smoke control, high-rise provisions, area and height calculations, construction type determination, mixed-use separation.
- **Drawing Coordination:** Cross-reference architectural plans with structural, MEP, civil, and landscape drawings. Identify conflicts and coordination issues before they become RFIs in the field.

#### RAAS Domains (Tier 1)
- IBC/IRC (building code)
- IECC / Title 24 (energy code)
- ADA, FHA, CBC (accessibility)
- NFPA 13/14/72 (fire protection)
- UPC/UMC/NEC (plumbing, mechanical, electrical)
- Local building code amendments (city/county)
- State architect licensing regulations
- Design guideline and specific plan standards (local)
- Green building requirements (LEED, CALGreen, local)
- Residential design standards (FHA Design Manual)

#### Referral Triggers (Tier 2)
- Structural questions during plan review → suggest Engineering Review Worker
- Energy code noncompliance → flag cost impact → send to CRE Analyst
- Accessibility deficiencies → suggest Legal Worker (FHA/ADA risk)
- Plans ready for submission → suggest Permit Worker
- Fire department comments → suggest Engineering Worker (fire access, hydrant spacing)

#### Connects To
- **Reads from:** Entitlement Worker (design standards from COAs), Engineering Worker (structural system, utility locations), Environmental Worker (setback constraints)
- **Writes to:** Vault deal object (plan review status, code compliance status, deficiency log)
- **Hands off to:** Permit Worker (plans ready for submission), Construction Manager (construction documents for bidding), Bid & Procurement (scope from CDs)

---

### 2.4 PERMIT SUBMISSION & TRACKING WORKER

- **Slug:** `permit-tracker`
- **URL:** `titleapp.ai/workers/permit-tracker`
- **Suite:** Construction
- **Pricing:** Professional $29/mo
- **Priority:** #10
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"File permits, track review cycles, respond to deficiency notices, and manage approvals across every jurisdiction."

#### Capabilities
- **Application Filing:** Prepare and track permit applications — building permit, grading permit, demolition permit, encroachment permit, right-of-way permit, fire department permit, health department permit, utility connection permits. Track application requirements by jurisdiction.
- **Review Cycle Management:** Track plan check submittals, review periods, resubmittals. Monitor which departments have approved vs. still reviewing. Flag overdue reviews. Calculate permit timeline projections.
- **Deficiency Notice Response:** When plan check corrections are issued, parse by department/discipline, assign to responsible party (architect, engineer, contractor), track response preparation, compile correction package, manage resubmittal.
- **Fee Calculation & Tracking:** Estimate permit fees, impact fees, school fees, park fees, transportation fees, utility connection fees, art-in-public-places fees. Track payments and receipts.
- **Inspection Scheduling:** Once permits are issued, track required inspections — foundation, framing, rough MEP, insulation, drywall, final. Schedule inspections, track results, manage re-inspections for failed items.
- **Certificate of Occupancy:** Track all requirements for CO/TCO — final inspections, fire department sign-off, utility releases, landscape bond, as-built drawings, close-out documents.
- **Multi-Jurisdiction Coordination:** For projects spanning multiple jurisdictions (county, city, special districts, fire authority, health department, coastal commission), track parallel review processes and coordinate approvals.

#### RAAS Domains (Tier 1)
- State building permit statutes
- Local permit processing procedures (city/county specific)
- Permit Streamlining Act (California)
- Housing Accountability Act (California)
- State-mandated review timelines
- ADA accessibility inspection requirements
- Fire marshal review requirements
- Health department review requirements (food service, pools)
- NPDES construction general permit (grading permits)

#### Referral Triggers (Tier 2)
- Architecture deficiency issued → suggest Architecture Worker for response
- Engineering deficiency issued → suggest Engineering Worker for response
- Fire department comments → suggest Engineering Worker
- Permit fees exceed budget → send to CRE Analyst for cost impact
- Permit approved → suggest Construction Manager (ready to break ground)
- CO requirements checklist generated → suggest Construction Manager for close-out

#### Connects To
- **Reads from:** Architecture Worker (plans), Engineering Worker (civil/structural plans), Entitlement Worker (conditions requiring permit-level compliance)
- **Writes to:** Vault deal object (permit status, fee tracking, inspection results, deficiency log)
- **Hands off to:** Construction Manager (permits issued — start construction), Insurance Worker (permit requires insurance proof), Mortgage Broker (lender needs permit status)

---

## PHASE 3: CONSTRUCTION

---

### 3.1 CONSTRUCTION MANAGER WORKER

- **Slug:** `construction-manager`
- **URL:** `titleapp.ai/workers/construction-manager`
- **Suite:** Construction
- **Pricing:** Business $49/mo
- **Priority:** #3 — BUILD NEXT AFTER IR WORKER
- **Status:** Priority build

#### Landing Page Headline
"Your AI superintendent. Scheduling, RFIs, submittals, daily logs, punch lists, and close-out. Every project, every day."

#### Capabilities
- **Master Scheduling:** CPM scheduling with critical path analysis. Track milestones, lead times, float, and delays. Auto-update schedule impacts when tasks slip. Weather delay tracking. Gantt chart generation via Document Engine.
- **RFI Management:** Draft, submit, track, and close RFIs (Requests for Information). Assign to responsible party. Track response deadlines. Flag aged RFIs. Log cost and schedule impacts. Cross-reference with submittals and change orders.
- **Submittal Management:** Track shop drawing and material submittals through the approval cycle — contractor preparation, architect review, engineer review, resubmit if required. Flag submittals on critical path. Track lead times for long-lead materials.
- **Daily Logs:** Generate and manage daily construction reports — weather, crew counts by trade, equipment on site, work performed, visitors, deliveries, safety incidents, delays. Photo documentation integration.
- **Punch List Management:** Generate punch lists by unit/area. Track completion status. Coordinate back-charge for deficient work. Manage pre-final and final punch walks.
- **Change Order Management:** Track change orders from identification through pricing, approval, and execution. Categorize by type (owner-directed, field condition, design error, code change). Track cumulative budget impact. Flag change orders requiring owner approval above threshold.
- **Safety & OSHA:** Track safety meetings (toolbox talks), incident reports, near-misses, OSHA inspection readiness. Monitor site-specific safety plan compliance. Track certifications (OSHA 10/30, fall protection, confined space).
- **Quality Control:** Track special inspections (structural steel, concrete, welding, fireproofing, waterproofing). Monitor QA/QC test results. Flag failed tests and corrective actions.
- **Close-Out Management:** Track close-out requirements — as-built drawings, O&M manuals, warranties, attic stock, final lien waivers, final retention release, certificate of substantial completion, final completion.
- **Lien & Bond Management:** Track mechanics lien rights and deadlines. Monitor preliminary notice requirements. Manage payment and performance bond claims. Track inchoate lien rights for all subcontractors and suppliers.
- **Loan Draw Coordination:** Work with Construction Draw Worker to prepare monthly draw packages — schedule of values, work completed, stored materials, retention, lien waivers.

#### RAAS Domains (Tier 1)
- OSHA construction standards (29 CFR 1926)
- State contractor licensing requirements
- Mechanics lien statutes (state-specific — critical, varies widely)
- Prevailing wage laws (Davis-Bacon federal, state equivalents)
- State prompt payment acts
- Building code inspection requirements
- AIA contract documents (A101, A201, G702, G703)
- ConsensusDocs equivalents
- State stop-notice statutes
- Preliminary notice requirements (state-specific)
- Retention release statutes (state-specific)
- Workers compensation requirements

#### Referral Triggers (Tier 2)
- Change order exceeds threshold → suggest CRE Analyst for budget re-analysis
- Unforeseen site condition → suggest Environmental Worker (if contamination) or Engineering Worker (if structural/geotech)
- Mechanics lien filed → suggest Legal Worker immediately
- Draw package ready → hand off to Construction Draw Worker
- Schedule delay impacts loan maturity → alert Mortgage Broker Worker
- Substantial completion achieved → suggest Permit Worker for CO process
- Subcontractor dispute → suggest Legal Worker

#### Connects To
- **Reads from:** Bid & Procurement (subcontractor awards, contract amounts), Architecture Worker (construction documents, ASIs), Engineering Worker (structural/civil specs), Permit Worker (permit conditions, inspection requirements)
- **Writes to:** Vault deal object (construction status, schedule, budget, change orders, safety log)
- **Hands off to:** Construction Draw Worker (monthly draw support), Insurance Worker (COI requirements for new subs), Accounting Worker (cost coding, billing), Labor Worker (crew needs), Legal Worker (disputes, liens)

---

### 3.2 BID & PROCUREMENT WORKER

- **Slug:** `bid-procurement`
- **URL:** `titleapp.ai/workers/bid-procurement`
- **Suite:** Construction
- **Pricing:** Professional $29/mo
- **Priority:** #11
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Solicit bids, level proposals, manage buyout. From scope to signed subcontract."

#### Capabilities
- **Bid Solicitation:** Generate and distribute bid packages by trade — scope of work, plans and specs, bid form, insurance requirements, schedule, special conditions. Track invited bidders and responses.
- **Bid Leveling:** Normalize bids across bidders — align scope inclusions/exclusions, identify missing scope, compare unit prices, flag outliers. Generate bid comparison matrix.
- **Scope Review:** For each trade, verify bid covers complete scope. Identify scope gaps, overlaps, and gray areas between trades. Flag "bid shopping" indicators.
- **Buyout Tracking:** Track subcontract execution — bid → award letter → insurance received → subcontract executed → NTP issued. Monitor buyout savings vs. budget.
- **Subcontract Management:** Generate subcontract packages (AIA A401 or custom). Track subcontract terms, retention, insurance requirements, warranty terms.
- **Prequalification:** Track subcontractor prequalification — financial statements, bonding capacity, EMR (experience modification rate), references, license verification.
- **Material Procurement:** Track long-lead material orders — switchgear, elevators, structural steel, MEP equipment. Monitor lead times and delivery dates against schedule.

#### RAAS Domains (Tier 1)
- State competitive bidding requirements (public projects)
- DBE/MBE/WBE requirements (federal/state)
- State subcontractor listing laws
- Prompt payment acts (sub-tier)
- State licensing verification requirements
- Bonding and insurance requirements
- Anti-bid-shopping regulations (where applicable)

#### Referral Triggers (Tier 2)
- Bids exceed budget → suggest CRE Analyst for value engineering analysis
- Subcontractor license issue → suggest Legal Worker
- Bonding required but sub is unbondable → flag to Construction Manager
- Long-lead items impact schedule → alert Construction Manager

#### Connects To
- **Reads from:** Architecture Worker (CDs and specifications), Engineering Worker (engineering specs), Construction Manager (schedule requirements, trade breakdowns)
- **Writes to:** Vault deal object (bid results, subcontract status, buyout savings/overruns)
- **Hands off to:** Construction Manager (awarded subs and contract amounts), Insurance Worker (new sub COI requirements), Accounting Worker (subcontract values for cost coding)

---

### 3.3 CONSTRUCTION LENDING & DRAW WORKER

- **Slug:** `construction-draws`
- **URL:** `titleapp.ai/workers/construction-draws`
- **Suite:** Construction
- **Pricing:** Professional $29/mo
- **Priority:** #12
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Monthly draw requests, lien waivers, inspection coordination. Get your money on time, every time."

#### Capabilities
- **Draw Request Preparation:** Generate monthly draw packages per lender requirements — AIA G702/G703 (Application and Certificate for Payment), schedule of values, percentage complete by line item, stored materials documentation, retention calculation.
- **Lien Waiver Collection:** Track conditional and unconditional lien waivers from all subcontractors and suppliers. Verify amounts match payment. Flag missing waivers before draw submission. State-specific waiver forms (California, Texas, etc. — all different).
- **Inspection Coordination:** Schedule and track lender inspection (typically third-party construction monitor). Prepare for inspector visit — compile progress photos, updated schedule, change order log, budget reconciliation.
- **Budget-to-Actual Reconciliation:** Track construction budget vs. actual costs. Monitor hard cost and soft cost line items. Flag line items trending over budget. Calculate contingency burn rate.
- **Interest Reserve Management:** Track construction loan interest reserve — draws against reserve, remaining balance, projected exhaustion date. Alert when reserve is trending toward depletion.
- **Change Order Impact on Loan:** When change orders are approved, model impact on construction budget, contingency, and loan sufficiency. Flag when changes push total cost above loan amount (equity cure required).
- **Retention Management:** Track retention held by line item. Calculate retention balance. Monitor retention release requirements (state-specific statutes). Generate final retention release package.

#### RAAS Domains (Tier 1)
- AIA G702/G703 payment application standards
- State mechanics lien waiver statutes (different forms per state)
- State retention statutes
- Construction loan agreement covenants
- State prompt payment acts
- Trust fund statutes (state-specific — some states require draw funds held in trust)
- Davis-Bacon certified payroll requirements (if federal funds)

#### Referral Triggers (Tier 2)
- Draw amount exceeds schedule progress → flag to Construction Manager
- Missing lien waivers blocking draw → flag to Construction Manager
- Budget trending over loan amount → alert Mortgage Broker and IR Worker (additional equity needed)
- Lender inspection failed → flag to Construction Manager for corrective action
- Retention release eligible → suggest Legal Worker for final release documentation

#### Connects To
- **Reads from:** Construction Manager (schedule of values, work completed, change orders), Bid & Procurement (subcontract values), Accounting Worker (cost coding)
- **Writes to:** Vault deal object (draw history, lien waiver status, budget tracking, retention balance)
- **Hands off to:** Mortgage Broker (loan compliance status), Accounting Worker (draw proceeds allocation), IR Worker (investor reporting on construction progress)

---

### 3.4 LABOR & STAFFING WORKER

- **Slug:** `labor-staffing`
- **URL:** `titleapp.ai/workers/labor-staffing`
- **Suite:** Construction
- **Pricing:** Professional $29/mo
- **Priority:** #13
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Crew scheduling, prevailing wage compliance, OSHA tracking, and workforce management for every project."

#### Capabilities
- **Crew Scheduling:** Schedule crews by trade and project. Manage multi-project workforce allocation. Track availability, overtime, and utilization. Weather-adjusted scheduling.
- **Prevailing Wage Compliance:** Track prevailing wage requirements by project, trade, and jurisdiction. Generate certified payroll reports (WH-347 for federal, state forms for state prevailing wage). Monitor apprenticeship ratio requirements.
- **OSHA Compliance:** Track OSHA training requirements by worker — OSHA 10, OSHA 30, fall protection, confined space, scaffolding, excavation competent person. Monitor expiration dates. Track site-specific safety plans.
- **Workers Compensation:** Track workers comp classifications by trade. Monitor EMR (Experience Modification Rate). Incident reporting and OSHA 300 log management. Return-to-work program tracking.
- **Apprenticeship Tracking:** Monitor apprenticeship ratio requirements (varies by jurisdiction and funding source). Track apprentice hours, mentorship assignments, and program compliance.
- **Labor Relations:** For union projects — track CBA (collective bargaining agreement) terms, jurisdictional assignments, shift premiums, holiday schedules, reporting pay requirements, steward access.

#### RAAS Domains (Tier 1)
- OSHA 29 CFR 1926 (construction safety)
- Davis-Bacon Act (federal prevailing wage)
- State prevailing wage laws
- FLSA (overtime, minimum wage)
- State workers compensation statutes
- EEOC / Title VII (employment discrimination)
- E-Verify / I-9 requirements
- State apprenticeship requirements
- NLRA (labor relations, union requirements)
- State sick leave / paid family leave

#### Referral Triggers (Tier 2)
- OSHA violation or incident → suggest Legal Worker
- Prevailing wage audit notice → suggest Legal Worker immediately
- Crew shortage impacting schedule → alert Construction Manager
- Workers comp claim filed → suggest Insurance Worker

#### Connects To
- **Reads from:** Construction Manager (schedule, crew needs by trade), Bid & Procurement (subcontractor labor requirements)
- **Writes to:** Vault deal object (labor compliance status, safety records, certified payroll)
- **Hands off to:** Accounting Worker (payroll data, prevailing wage rates), Insurance Worker (workers comp claims), Legal Worker (labor disputes, OSHA violations)

---

## PHASE 4: STABILIZATION & OPERATIONS

---

### 4.1 PROPERTY MANAGEMENT WORKER
- **Slug:** `property-management`
- **Status:** EXISTS IN CATALOG
- **Already defined — skip**

---

### 4.2 ACCOUNTING WORKER

- **Slug:** `construction-accounting`
- **URL:** `titleapp.ai/workers/construction-accounting`
- **Suite:** Finance & Investment
- **Pricing:** Business $49/mo
- **Priority:** #14
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Construction job costing, AIA billing, change order tracking, and owner reporting. From first draw to final close-out."

#### Capabilities
- **Job Costing:** Track costs by CSI division, cost code, and subcontractor. Real-time budget-to-actual reporting. Cost-to-complete projections. Earned value analysis.
- **AIA Billing:** Generate and manage AIA G702/G703 pay applications. Track billing by line item, retention, stored materials, and previously billed amounts.
- **Change Order Accounting:** Track change order financial impact — approved, pending, rejected. Maintain change order log with cumulative budget impact. Forecast final cost including pending COs.
- **Owner Reporting:** Generate monthly owner reports — budget summary, cost to complete, schedule status, change order log, cash flow projection.
- **AP/AR Management:** Track payables to subcontractors and suppliers. Match invoices to contracts and change orders. Track receivables from owner/lender.
- **Operations Accounting:** Post-construction — tenant rent tracking, CAM reconciliation, operating expense management, owner distributions, monthly financial packages.
- **Tax Preparation Support:** Cost segregation study coordination, depreciation schedules, 1099 preparation, K-1 data compilation.

#### RAAS Domains (Tier 1)
- GAAP (construction accounting standards)
- Percentage of completion accounting
- ASC 606 (revenue recognition)
- State sales tax on construction materials
- 1099 reporting requirements
- Cost segregation regulations (IRS)
- State-specific construction trust fund requirements

#### Referral Triggers (Tier 2)
- Cost overrun exceeds contingency → alert Alex, suggest CRE Analyst for re-underwriting
- Tax filing deadline approaching → suggest Tax Worker
- Subcontractor payment dispute → suggest Legal Worker
- Distribution calculation needed → hand off to IR Worker

#### Connects To
- **Reads from:** Construction Manager (work completed, change orders), Construction Draws (draw proceeds), Bid & Procurement (contract values), Labor Worker (payroll data), Mortgage Broker (debt service schedule)
- **Writes to:** Vault deal object (financial status, budget tracking, cost projections)
- **Hands off to:** IR Worker (investor financial reporting), Tax Worker (tax data), Mortgage Broker (financial covenants)

---

### 4.3 INSURANCE & COI WORKER

- **Slug:** `insurance-coi`
- **URL:** `titleapp.ai/workers/insurance-coi`
- **Suite:** General Business
- **Pricing:** Professional $29/mo
- **Priority:** #15
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Policy management, COI tracking, claims handling, and renewal coordination. Never miss a coverage gap."

#### Capabilities
- **Policy Management:** Track all insurance policies across all projects — builder's risk, general liability, professional liability, property, umbrella/excess, workers comp, auto, pollution, earthquake, flood, cyber. Monitor coverage limits, deductibles, exclusions, and endorsements.
- **COI Tracking:** Track Certificates of Insurance for all subcontractors and vendors. Verify coverage meets contract requirements (limits, additional insured, waiver of subrogation). Flag expiring COIs. Auto-request renewals.
- **Claims Management:** Track insurance claims from incident through resolution — loss reports, adjuster coordination, reserve tracking, settlement, subrogation.
- **Renewal Management:** Track renewal dates for all policies. Begin renewal process 90 days out. Compare renewal quotes. Flag coverage changes or premium increases.
- **Lender Compliance:** Ensure all policies meet lender insurance requirements — named insured, loss payee, policy limits, deductible caps, replacement cost endorsement, flood certification.
- **OCIP/CCIP Management:** For wrap-up insurance programs, track enrollment, manual rates, audited rates, and loss experience for all enrolled contractors.

#### RAAS Domains (Tier 1)
- State insurance regulations
- Lender insurance requirements (agency, CMBS, bank)
- OSHA incident reporting requirements
- State workers compensation requirements
- Flood insurance (NFIP, FEMA)
- Builder's risk policy requirements
- Certificate of insurance standards (ACORD forms)

#### Referral Triggers (Tier 2)
- Coverage gap identified → alert Alex immediately
- Workers comp claim → suggest Labor Worker for incident documentation
- Property damage claim → suggest Construction Manager for documentation
- Insurance cost increase → send to CRE Analyst for budget impact
- COI deficiency blocking draw → alert Construction Draw Worker

#### Connects To
- **Reads from:** Construction Manager (subcontractor list, incidents), Mortgage Broker (lender insurance requirements), Bid & Procurement (new subs needing COIs)
- **Writes to:** Vault deal object (insurance status, coverage summary, claims log)
- **Hands off to:** Construction Draw Worker (COIs required for draw), Legal Worker (disputed claims), Accounting Worker (premium payments, claim proceeds)

---

### 4.4 TAX & ASSESSMENT WORKER

- **Slug:** `tax-assessment`
- **URL:** `titleapp.ai/workers/tax-assessment`
- **Suite:** Finance & Investment
- **Pricing:** Professional $29/mo
- **Priority:** #16
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Property tax monitoring, assessment appeals, and tax planning. Save 10-30% on your tax bill."

#### Capabilities
- **Assessment Monitoring:** Track property tax assessments across all properties and jurisdictions. Compare assessed value to market value and recent comparables. Flag over-assessments automatically.
- **Tax Appeal Management:** When over-assessment identified, manage the appeal process — informal review, formal appeal, assessment review board hearing, court appeal if necessary. Track deadlines (critical — miss the deadline and you lose the right to appeal for the year).
- **Tax Payment Tracking:** Track tax payment due dates, installments, penalties for late payment. Coordinate with escrow for impounded taxes. Verify payments posted correctly.
- **Tax Projections:** Project future property taxes based on assessed value trends, millage rate changes, and exemption status. Model tax impact of renovations or new construction (reassessment triggers).
- **Exemption Management:** Track available exemptions — homestead, senior, veteran, agricultural, historic, affordable housing, opportunity zone. Apply for and maintain exemptions.
- **Cost Segregation Coordination:** Interface with cost segregation engineers for accelerated depreciation studies on commercial properties. Track depreciation schedules by component.
- **1031 Exchange Tracking:** When disposition planned, coordinate with qualified intermediary for 1031 exchange timelines and requirements.

#### RAAS Domains (Tier 1)
- State property tax statutes (vary widely)
- State assessment appeal procedures
- State tax exemption requirements
- IRS depreciation rules (MACRS, cost segregation)
- IRC Section 1031 (like-kind exchange)
- IRC Section 1400Z-2 (opportunity zones)
- State-specific reassessment triggers
- Supplemental tax assessment rules (California Prop 13)

#### Referral Triggers (Tier 2)
- Over-assessment identified → start appeal automatically, alert Alex
- Tax impact of proposed renovation → send to CRE Analyst
- 1031 exchange timeline active → alert Legal Worker and Accounting Worker
- Opportunity zone compliance deadline → alert Compliance Worker
- Tax bill significantly higher than budget → send to Accounting Worker and IR Worker

#### Connects To
- **Reads from:** CRE Analyst (property value, comparable data), Accounting Worker (current tax payments), Title Worker (ownership and assessed value history)
- **Writes to:** Vault deal object (tax status, appeal status, exemption status, projections)
- **Hands off to:** Legal Worker (formal appeals requiring legal representation), Accounting Worker (tax payments and depreciation), IR Worker (tax impact on investor returns)

---

## PHASE 5: DISPOSITION

---

### 5.1 REAL ESTATE SALES WORKER
- **Slug:** `real-estate-sales`
- **Status:** EXISTS IN CATALOG
- **Already defined — skip**

---

## HORIZONTAL WORKERS (ALL PHASES)

---

### H.1 COMPLIANCE & DEADLINE TRACKER

- **Slug:** `compliance-tracker`
- **URL:** `titleapp.ai/workers/compliance-tracker`
- **Suite:** General Business
- **Pricing:** Professional $29/mo
- **Priority:** #17
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Every deadline, every filing, every renewal. Across every deal, every phase, every jurisdiction. Nothing slips."

#### Capabilities
- **Cross-Phase Deadline Management:** Aggregate ALL deadlines from ALL workers across ALL deals into a unified compliance calendar. Permit expirations, loan maturities, insurance renewals, tax appeal deadlines, entity annual reports, contractor license renewals, inspection deadlines, COA compliance milestones.
- **Automated Alerts:** Tiered alerts — 90 day, 60 day, 30 day, 14 day, 7 day, 1 day before every deadline. Escalation to Alex if deadline is at risk.
- **Regulatory Filing Tracker:** Track all required government filings — entity annual reports (state), beneficial ownership (FinCEN BOI), SEC filings (if applicable), state securities filings, business license renewals.
- **Audit Trail:** Maintain complete compliance history — what was filed, when, by whom, confirmation numbers, receipts.
- **Compliance Dashboard:** Real-time dashboard showing: upcoming deadlines (red/yellow/green), overdue items, compliance score by deal, compliance score by category.
- **Entity Maintenance:** Track entity formation, registered agents, annual report filings, good standing status across all entities and all states.

#### RAAS Domains (Tier 1)
- State entity maintenance requirements
- FinCEN Beneficial Ownership (Corporate Transparency Act)
- SEC filing requirements (if applicable)
- State securities filing requirements
- Business license requirements (local)
- All deadline-generating regulations from every other worker

#### Referral Triggers (Tier 2)
- This worker primarily RECEIVES triggers from other workers rather than sending them
- Overdue compliance item → escalate to Alex → suggest appropriate specialist worker
- Entity not in good standing → suggest Legal Worker

#### Connects To
- **Reads from:** EVERY worker (aggregates all deadlines)
- **Writes to:** Vault deal object (compliance status, deadline calendar)
- **Hands off to:** Alex (escalation), appropriate specialist worker based on deadline type

---

### H.2 LEGAL & CONTRACT WORKER

- **Slug:** `legal-contracts`
- **URL:** `titleapp.ai/workers/legal-contracts`
- **Suite:** Legal
- **Pricing:** Business $49/mo
- **Priority:** #18
- **Status:** Planned — landing page + waitlist

#### Landing Page Headline
"Contracts, agreements, and legal compliance across every phase. Draft, review, redline, and track."

#### Capabilities
- **Contract Drafting:** Generate standard contracts using industry templates — AIA (A101, A201, B101, A401), ConsensusDocs, purchase and sale agreements, lease agreements, property management agreements, loan documents, operating agreements, subscription agreements.
- **Contract Review & Redline:** Analyze third-party contracts. Identify unfavorable terms, missing protections, non-standard provisions. Generate redline with recommended changes and reasoning.
- **Contract Tracking:** Track all active contracts across all deals — execution status, key dates (commencement, expiration, renewal options, termination notice periods), key terms (insurance requirements, indemnification, limitation of liability, dispute resolution).
- **Entity Management:** Formation, maintenance, and dissolution of LLCs, LPs, corporations, series LLCs, SPVs. Track registered agents, annual filings, operating agreements, amendments.
- **Dispute Management:** When disputes arise, document the issue, identify applicable contract provisions, recommend resolution strategy (negotiation, mediation, arbitration, litigation), track dispute status.
- **Mechanics Lien Response:** When a lien is filed, verify compliance with statutory requirements, recommend response (pay, bond, dispute), draft response documents, track through resolution.
- **Regulatory Compliance Review:** Review project plans and operations for legal compliance — fair housing, ADA, employment law, environmental law, securities law. Flag potential exposure.

#### RAAS Domains (Tier 1)
- UCC (Uniform Commercial Code)
- State contract law
- State mechanics lien statutes
- AIA and ConsensusDocs contract standards
- State entity formation and maintenance
- Federal and state securities law (Reg D, state blue sky)
- Fair Housing Act
- ADA (Americans with Disabilities Act)
- State landlord-tenant law
- Federal and state employment law
- State dispute resolution statutes (arbitration, mediation)

#### Referral Triggers (Tier 2)
- This worker primarily RECEIVES referrals from other workers
- Contract dispute identified → this worker handles it
- Entity formation needed for new deal → trigger from IR Worker or Mortgage Broker
- Lien filed → trigger from Construction Manager

#### Connects To
- **Reads from:** Every worker that generates or receives contracts
- **Writes to:** Vault deal object (contract status, entity status, dispute log)
- **Hands off to:** Appropriate specialist worker based on contract type; Compliance Tracker for all legal deadlines

---

## MANDATORY: ALL WORKERS GO THROUGH WORKER #1

### P0.18 — Universal Worker QC (New Tier 0 Rule)

**No worker may be deployed to the platform without passing through Worker #1's RAAS generation and validation process. No exceptions — including workers built internally by TitleApp.**

This applies to:
- Creator-built workers in the Sandbox (already enforced)
- TitleApp-built workers from internal specs (like 22g) — MUST ALSO GO THROUGH WORKER #1
- Enterprise workers built for B2B push (22h) — MUST ALSO GO THROUGH WORKER #1
- Workers generated from Worker Request Board claims — MUST ALSO GO THROUGH WORKER #1

**Why this matters:**
- Every worker on the platform must have a validated 4-tier RAAS library
- Every worker must pass the 7-point acceptance criteria
- Every worker must have referral triggers generated from domain research
- Every worker must inherit Tier 0 platform rules (P0.1-P0.18)
- Without this, you get two classes of workers — governed and ungoverned — which destroys platform trust

**The process for internally-built workers:**
1. Write the spec (like 22g — capabilities, domains, referral triggers)
2. Feed the spec INTO Worker #1 as input (not as a bypass)
3. Worker #1 conducts its standard research phase (regulations, case law, best practices)
4. Worker #1 generates the full 4-tier RAAS library, incorporating the spec's capabilities
5. Worker #1 runs the 7-point acceptance check
6. Worker passes QC → published to platform
7. Worker fails QC → iterated in Sandbox until it passes

**The spec documents (22g, Session 25, etc.) are INPUT to Worker #1, not a replacement for it.** The specs define WHAT the worker should do. Worker #1 defines HOW it does it within the RAAS governance framework.

This ensures:
- Consistent compliance floor across every worker on the platform
- No "special" workers that skip governance
- The spec accelerates Worker #1's research phase (it already has capabilities and domains identified) but doesn't bypass it
- Every worker gets referral maps, Vault integration, and platform service hooks automatically

### Updated Tier 0 Rule Table

| Rule | Name | Source |
|------|------|--------|
| P0.1 | Do No Harm | 22a |
| P0.2 | Transparency | 22a |
| P0.3 | Human Override | 22a |
| P0.4 | Data Privacy | 22a |
| P0.5 | Audit Trail | 22a |
| P0.6 | No Unauthorized Practice | 22a |
| P0.7 | Scope Limitation | 22a |
| P0.8 | Error Handling | 22a |
| P0.9 | Document Disclosure | 22b |
| P0.10 | Document Audit Trail | 22b |
| P0.11 | Document Retention | 22b |
| P0.12 | No Misleading Credentials | 22b |
| P0.13 | Vault Awareness | 22d |
| P0.14 | Referral Protocol | 22d |
| P0.15 | Context Transfer Consent | 22d |
| P0.16 | Contribution Integrity | 22d |
| P0.17 | Vault Privacy Scope | 22d |
| **P0.18** | **Universal Worker QC** | **22g** |

---

## COMPLETE SLUG REGISTRY (For T1 Bulk Registration)

All 18 new workers plus existing ones. Register ALL immediately for landing pages and waitlists.

```javascript
const developmentLifecycleWorkers = [
  // Phase 1: Acquisition
  { slug: "cre-analyst", status: "live", suite: "real-estate", price: 2900 },
  { slug: "title-escrow", status: "planned", suite: "real-estate", price: 2900 },
  { slug: "environmental-review", status: "planned", suite: "real-estate", price: 2900 },
  { slug: "mortgage-broker", status: "planned", suite: "finance", price: 4900 },
  { slug: "investor-relations", status: "in_development", suite: "finance", price: 4900 },

  // Phase 2: Entitlement & Pre-Construction
  { slug: "entitlement-analyst", status: "planned", suite: "real-estate", price: 2900 },
  { slug: "engineering-review", status: "planned", suite: "construction", price: 2900 },
  { slug: "architecture-review", status: "planned", suite: "construction", price: 2900 },
  { slug: "permit-tracker", status: "planned", suite: "construction", price: 2900 },

  // Phase 3: Construction
  { slug: "construction-manager", status: "planned", suite: "construction", price: 4900 },
  { slug: "bid-procurement", status: "planned", suite: "construction", price: 2900 },
  { slug: "construction-draws", status: "planned", suite: "construction", price: 2900 },
  { slug: "labor-staffing", status: "planned", suite: "construction", price: 2900 },

  // Phase 4: Stabilization & Operations
  { slug: "property-management", status: "live", suite: "real-estate", price: 2900 },
  { slug: "construction-accounting", status: "planned", suite: "finance", price: 4900 },
  { slug: "insurance-coi", status: "planned", suite: "business", price: 2900 },
  { slug: "tax-assessment", status: "planned", suite: "finance", price: 2900 },

  // Phase 5: Disposition
  { slug: "real-estate-sales", status: "live", suite: "real-estate", price: 2900 },

  // Horizontal
  { slug: "compliance-tracker", status: "planned", suite: "business", price: 2900 },
  { slug: "legal-contracts", status: "planned", suite: "legal", price: 4900 },

  // Platform
  { slug: "chief-of-staff", status: "live", suite: "platform", price: 0 },
];
```

---

## SCOTT'S RECOMMENDED BUNDLE

For the email to Scott, recommend this as his starter team:

```
SCOTT'S CRE DEVELOPMENT BUNDLE
───────────────────────────────
  CRE Deal Analyst          $29/mo    LIVE
  Investor Relations         $49/mo    This week
  Construction Manager       $49/mo    Next build
  Title & Escrow            $29/mo    Following
  Mortgage Broker           $49/mo    Following
  Alex (Chief of Staff)     FREE      (5 workers = auto-unlock)
                              ─────────
                              $205/mo   + free Alex

"Alex, run the full acquisition pipeline on the Phoenix deal,
then set up the construction schedule."

That's a deal team for $205/month.
```

---

## PIPELINE VISUALIZATION (For Marketing)

```
                    ┌─────────────────┐
                    │  DEAL COMES IN  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  CRE ANALYST    │ Score → Pursue/Pass
                    └────────┬────────┘
                      ┌──────┼──────┐
               ┌──────▼──┐ ┌▼──────┐ ┌▼──────────┐
               │  TITLE   │ │ ENV   │ │ MORTGAGE   │  Parallel
               │  ESCROW  │ │REVIEW │ │ BROKER     │  due diligence
               └──────┬───┘ └┬──────┘ └┬───────────┘
                      └──────┼─────────┘
                    ┌────────▼────────┐
                    │  ENTITLEMENT    │ Zoning → Approved
                    └────────┬────────┘
                      ┌──────┼──────┐
               ┌──────▼──┐ ┌▼──────┐ ┌▼──────────┐
               │  ENGIN-  │ │ARCHI- │ │ PERMIT     │  Plan development
               │  EERING  │ │TECTURE│ │ TRACKER    │  & review
               └──────┬───┘ └┬──────┘ └┬───────────┘
                      └──────┼─────────┘
                    ┌────────▼────────┐
                    │  CONSTRUCTION   │ Build it
                    │  MANAGER        │
                    └────────┬────────┘
               ┌─────────┬──┼──┬─────────┐
            ┌──▼──┐ ┌────▼┐ ┌▼─┐ ┌───▼──┐
            │BIDS │ │DRAWS│ │$ │ │LABOR │  Supporting
            └─────┘ └─────┘ └──┘ └──────┘  workers
                    ┌────────▼────────┐
                    │  STABILIZATION  │ Lease up
                    │  PROP MGMT      │
                    └────────┬────────┘
                      ┌──────┼──────┐
               ┌──────▼──┐ ┌▼──────┐ ┌▼──────────┐
               │INSURANCE│ │ TAX   │ │ACCOUNTING  │  Operations
               └─────────┘ └───────┘ └────────────┘
                    ┌────────▼────────┐
                    │  DISPOSITION    │ Sell / Refi
                    │  IR → SALES    │
                    └─────────────────┘

        ← ALEX COORDINATES EVERYTHING →
        ← COMPLIANCE TRACKS ALL DEADLINES →
        ← LEGAL HANDLES ALL CONTRACTS →
        ← DOCUMENT ENGINE GENERATES ALL DOCS →
```
