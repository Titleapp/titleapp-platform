"use strict";
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

function doc(name, text, tier = "reference") {
  return { name, text: text.trim(), tier, trustTag: "verified-reference", sourceForm: "admin-seed" };
}

// ── Real Estate / Title shared content ──────────────────────────────────────

const RE_SALESPERSON_DOCS = [
  doc("NAR Code of Ethics — Core Duties Summary", `
The National Association of REALTORS® Code of Ethics organizes an agent's
duties into three articles: duties to clients and customers, duties to the
public, and duties to other REALTORS®. Core obligations include: protecting
and promoting the client's interests while treating all parties honestly
(Article 1); avoiding exaggeration, misrepresentation, or concealment of
pertinent facts (Article 2); cooperating with other brokers when it serves
the client's interest (Article 3); disclosing any personal interest in a
property before making or accepting an offer (Article 4); and never
providing professional services in a transaction where the REALTOR® has an
undisclosed personal interest (Article 6). A REALTOR® must also submit
offers and counteroffers objectively and as quickly as possible (Article 1,
Standard of Practice 1-6), and must recommend that clients obtain
inspections, surveys, and legal counsel when facts are beyond the
REALTOR®'s expertise (Article 11).
`),
  doc("Federal Fair Housing Act — Protected Classes and Prohibited Conduct", `
The Fair Housing Act (Title VIII of the Civil Rights Act of 1968, as
amended) prohibits discrimination in the sale, rental, and financing of
housing based on seven protected classes: race, color, national origin,
religion, sex (including gender identity and sexual orientation per HUD's
current interpretation), familial status, and disability. Prohibited
conduct includes refusing to sell or rent, setting different terms or
conditions, making discriminatory statements in advertising, "steering"
buyers toward or away from neighborhoods based on a protected class, and
denying reasonable accommodations or modifications for a disability.
Many states and municipalities add further protected classes (e.g. source
of income, marital status, age) — always confirm state and local fair
housing law in addition to the federal baseline.
`),
  doc("Comparative Market Analysis (CMA) — Standard Methodology", `
A CMA estimates a property's likely market value by comparing it to
recently sold, active, and expired listings with similar characteristics.
Standard practice: select 3-6 comparables sold within the last 3-6 months,
within a reasonable radius (typically 0.5-1 mile in dense markets, wider in
rural areas), adjusting for differences in square footage, lot size, age,
condition, and features using a dollar-per-square-foot or paired-sales
adjustment method. Days-on-market and list-to-sale-price ratio for the
comps indicate whether the local market favors buyers or sellers. A CMA is
distinct from a formal fee appraisal (which follows USPAP standards and is
required for most mortgage lending) — a CMA is an opinion of value for
marketing and negotiation purposes, not a certified valuation.
`),
  doc("Agency Relationships and Fiduciary Duties", `
When a real estate licensee represents a client (as opposed to simply
assisting a customer), fiduciary duties typically include: loyalty (acting
in the client's best interest), obedience (following lawful instructions),
disclosure (of material facts affecting the transaction), confidentiality
(not disclosing client information that could harm their negotiating
position), accounting (properly handling client funds and documents), and
reasonable care and skill. Most states require a written agency disclosure
at first substantive contact, and many allow "dual agency" (representing
both buyer and seller) only with informed written consent from both
parties — some states prohibit dual agency outright. A licensee working
with a customer, not a client, still owes basic duties of honesty and fair
dealing even without a fiduciary relationship.
`),
];

const LAW_LANDUSE_DOCS = [
  doc("Zoning Fundamentals — Use, Density, and Overlay Districts", `
Zoning ordinances regulate land use through three primary mechanisms: use
restrictions (what activities are permitted — residential, commercial,
industrial, mixed-use), density/bulk controls (lot coverage, height limits,
setbacks, floor-area ratio), and overlay districts (additional rules layered
on a base zone, e.g. historic preservation, flood hazard, or
transit-oriented development overlays). Most US jurisdictions use
Euclidean zoning (separated use districts) though many are adopting
form-based codes that regulate building form rather than use. A use not
listed as permitted-by-right in a district typically requires either a
special/conditional use permit (discretionary approval, often with a
public hearing) or is prohibited outright.
`),
  doc("Variance vs. Special Use Permit — Key Differences", `
A variance is permission to deviate from a specific dimensional or
technical requirement of a zoning ordinance (e.g. a 5-foot setback instead
of the required 10 feet) because strict application would cause
"practical difficulty" or "unnecessary hardship" tied to the physical
characteristics of the specific lot — not the owner's personal or
financial circumstances. A special (or conditional) use permit authorizes
a use that the ordinance identifies as potentially appropriate in that
zone but requiring case-by-case review for compatibility (traffic,
noise, hours of operation). Variances are decided under a hardship
standard by a zoning board of adjustment; special use permits are decided
under a compatibility/conditions standard, often by the planning
commission or city council.
`),
  doc("Texas Local Government Code — Municipal Zoning Authority (Chapter 211 Overview)", `
Texas Local Government Code Chapter 211 authorizes municipalities to adopt
zoning regulations to promote public health, safety, and general welfare,
and to divide the municipality into districts for that purpose. Key
procedural requirements: a municipality must create a zoning commission to
recommend district boundaries and regulations, a public hearing is
required before adoption or amendment of zoning regulations (with notice
published and, for specific rezonings, mailed to owners within 200 feet),
and a supermajority vote (three-fourths of the governing body) is required
to override a valid protest from owners of 20%+ of the affected or
adjoining land. Counties in Texas have much more limited zoning authority
than municipalities — most unincorporated land in Texas is not zoned in
the traditional sense, though counties do regulate subdivisions and, in
some cases, floodplain development.
`),
];

const CRE_ANALYST_DOCS = [
  doc("CRE Underwriting Fundamentals — Cap Rate, NOI, DSCR", `
Net Operating Income (NOI) = gross rental income + other income − vacancy
loss − operating expenses (excluding debt service and capital
expenditures). Capitalization rate (cap rate) = NOI ÷ purchase price (or
current value) — it approximates the unleveraged annual return and moves
inversely with price: a lower cap rate means a higher price for the same
NOI. Debt Service Coverage Ratio (DSCR) = NOI ÷ annual debt service;
most commercial lenders require a minimum DSCR of 1.20-1.25x, meaning NOI
must exceed the mortgage payment by that margin. Cash-on-cash return =
annual pre-tax cash flow ÷ total cash invested, which accounts for
leverage and is typically higher than the cap rate on a levered deal.
`),
  doc("Commercial Real Estate Deal Screening Checklist", `
A first-pass deal screen typically checks: (1) basis — purchase price per
square foot or per unit relative to replacement cost and recent comparable
sales; (2) in-place vs. market rents — is there upside from lease-up or
renewal at market rates; (3) lease rollover schedule — concentration risk
if multiple leases expire in the same period; (4) tenant credit quality —
national credit tenant vs. local/unrated tenant; (5) physical condition
and deferred maintenance — often assessed via a property condition report;
(6) zoning and entitlement status if any repositioning is planned; and
(7) environmental risk — a Phase I Environmental Site Assessment is
standard due diligence before closing on most commercial acquisitions.
`),
  doc("Commercial Loan Structuring Basics", `
Most commercial mortgage loans are sized off the lower of two constraints:
loan-to-value (LTV, typically 60-75% for stabilized commercial assets) and
DSCR (typically 1.20-1.35x minimum, varying by lender and asset class).
Common structures include fixed-rate permanent loans (5, 7, or 10-year
terms, often with a balloon payment and 25-30 year amortization),
floating-rate bridge loans (for value-add or transitional assets, often
interest-only), and construction loans (draw-based, converting to
permanent debt or requiring refinance at completion). Recourse varies:
many commercial loans are non-recourse to the borrower entity but carry
standard "bad boy" carve-outs (fraud, waste, unauthorized transfer)
that trigger personal liability for the guarantor.
`),
];

const SITE_RECON_DOCS = [
  doc("Site Due Diligence Checklist — Environmental, Utilities, Access", `
A thorough site due diligence review covers: environmental (Phase I ESA
findings, any recorded contamination, proximity to known hazardous sites),
utilities (confirmed availability and capacity of water, sewer, gas,
electric, and telecom at the property line, not just "in the area"),
access (legal and physical ingress/egress, any easements benefiting or
burdening the site, frontage on a public right-of-way), topography and
soils (flood zone status per FEMA maps, wetlands delineation, geotechnical
conditions relevant to foundation design), and title (recorded easements,
restrictive covenants, and any encroachments visible on a current
survey).
`),
  doc("Phase I Environmental Site Assessment — ASTM E1527 Overview", `
A Phase I Environmental Site Assessment, conducted to the ASTM E1527
standard, is the industry-standard process for identifying "recognized
environmental conditions" (RECs) at a property — evidence of a release or
threatened release of hazardous substances or petroleum products. It
typically includes: a review of historical records (Sanborn maps, aerial
photos, prior land use), a regulatory database search (federal and state
environmental agency records for the site and surrounding area), a site
reconnaissance visit, and interviews with current owners/occupants. A
"clean" Phase I is also the mechanism by which a purchaser establishes the
"innocent landowner" or "bona fide prospective purchaser" defense to
CERCLA liability under federal Superfund law — which is why lenders and
buyers routinely require one before closing on commercial property.
`),
];

const FEASIBILITY_DOCS = [
  doc("Real Estate Development Feasibility Study — Core Components", `
A development feasibility study typically covers: market analysis (demand
drivers, absorption rates, comparable rents/sales for the proposed
product type), site analysis (physical constraints, zoning/entitlement
status, required approvals), financial pro forma (development budget,
projected revenue, return metrics — yield on cost, IRR, equity multiple),
and risk assessment (entitlement timeline risk, construction cost
escalation, market-timing risk between underwriting and delivery). A
feasibility study is a go/no-go decision tool, distinct from a formal
appraisal — it answers "should we build this" rather than "what is this
worth today."
`),
  doc("Entitlement Risk Assessment Basics", `
Entitlement risk is the risk that required government approvals (zoning
changes, variances, site plan approval, environmental clearances, utility
capacity commitments) are delayed, denied, or conditioned in a way that
materially changes project economics. Key risk factors to assess: whether
the proposed use is permitted-by-right or requires discretionary approval,
the jurisdiction's typical timeline and track record for similar
approvals, any active moratoria or pending ordinance changes, neighborhood
opposition history for comparable projects, and whether infrastructure
capacity (water, sewer, traffic) has been confirmed by the relevant
utility or public works department rather than assumed.
`),
];

const TITLE_SEARCH_DOCS = [
  doc("ALTA Title Insurance Policy Basics", `
ALTA (American Land Title Association) publishes the standard policy
forms used by most US title insurers. An Owner's Policy insures the buyer
against loss from defects in title existing as of the policy date
(undisclosed liens, forgery, missing heirs, errors in prior deeds); a
Loan Policy insures the lender's security interest and is typically
required as a condition of financing. Standard exclusions from coverage
include defects created by the insured, matters not recorded in the
public record but known to the insured, and standard exceptions like
zoning ordinances, unrecorded easements not disclosed by survey, and
rights of parties in possession. Enhanced/extended policies (e.g. ALTA
Homeowner's Policy) cover additional risks like post-policy forgery and
building permit violations for an additional premium.
`),
  doc("Chain of Title Search Standards", `
A title search traces the recorded chain of ownership for a parcel back to
a source deed or a period sufficient to satisfy the insurer's underwriting
standards (commonly 30-60 years, or "back to patent" in some
jurisdictions for rural land). The search reviews the county deed records,
plat records, and any relevant probate, divorce, or tax sale proceedings
that affected title, plus a lien search covering mortgages, judgments,
federal and state tax liens, mechanic's liens, and HOA assessments. Any
gap in the recorded chain (a missing conveyance, an unresolved probate
estate, a name discrepancy between grantor/grantee on successive
instruments) is a title defect requiring curative work before the
insurer will issue a clean policy.
`),
  doc("Common Title Defects and Curative Requirements", `
Frequent title defects include: unreleased mortgages or liens that were
actually paid off but never formally released of record (cured by
obtaining and recording a release or lien satisfaction), gaps in the
chain of title from an unprobated estate (cured by opening probate or
obtaining an affidavit of heirship, depending on the jurisdiction and
value), boundary or survey discrepancies (cured by a new survey and, if
needed, a boundary line agreement between neighboring owners), and
outstanding judgments against a prior owner with the same or similar name
("common name" issues, cured by an affidavit distinguishing the parties).
Each curative step should be documented and retained in the file, since
the insurer's underwriting decision — and any future claim — depends on
that record.
`),
];

const ESCROW_DOCS = [
  doc("ALTA Best Practices for Title and Settlement Companies", `
ALTA's Title Insurance and Settlement Company Best Practices framework
covers seven pillars: (1) licensing — maintaining current agent licenses
and appointments; (2) escrow trust accounting — daily reconciliation of
trust accounts, no commingling of company operating funds with client
escrow funds; (3) privacy and information security — written policies
protecting non-public personal information; (4) settlement processing —
timely recording and disbursement, accurate proration and calculation of
fees; (5) title policy production — accurate, timely policy issuance; (6)
professional liability and fidelity coverage maintained at appropriate
limits; and (7) consumer complaint handling with a documented resolution
process.
`),
  doc("Good Funds Requirements and Wire Fraud Prevention", `
Most states have "good funds" laws restricting what forms of payment a
settlement agent may disburse against before funds have actually cleared
— generally requiring wired funds or cashier's checks for amounts above a
statutory threshold, rather than personal checks. Given the prevalence of
business-email-compromise wire fraud targeting real estate closings,
standard practice is: never send or accept wiring instructions by email
without independent verbal verification using a phone number obtained
from a source other than the email itself, verify any last-minute change
to wiring instructions by phone before releasing funds, and confirm
receipt of incoming wires directly with the receiving bank rather than
relying on a forwarded confirmation email.
`),
  doc("Closing Disclosure and Settlement Statement Basics", `
For most residential purchase-money mortgages, TRID (the TILA-RESPA
Integrated Disclosure rule) requires the lender to deliver a Closing
Disclosure to the borrower at least three business days before
consummation, itemizing loan terms, projected payments, and closing costs
in a standardized format. For cash transactions or transactions not
subject to TRID, a HUD-1 style settlement statement or a state-specific
form is typically used instead. Either way, the settlement statement
should reconcile to the penny: purchase price, credits, prorations (taxes,
HOA dues, utilities), loan payoffs, and all fees, with the net amount due
from the buyer and due to the seller clearly stated.
`),
  doc("Escrow Trust Accounting Fundamentals", `
Escrow/trust funds belong to the parties to the transaction, not to the
title or escrow company, and must be held in a separate trust account
distinct from the company's operating funds. Fundamental controls
include: a three-way reconciliation each month (bank statement, book
balance, and the sum of all individual file balances must match),
no borrowing against or advancing from one file's escrow to cover a
shortfall in another ("commingling"), and prompt disbursement once all
conditions to release are satisfied — funds should not sit idle in trust
without a documented reason. Shortages in a trust account are treated as
a serious regulatory matter in every US jurisdiction that licenses title
and escrow companies.
`),
];

const TENANT_PORTAL_DOCS = [
  doc("Residential Tenant Rights — General Overview", `
Most US jurisdictions require landlords to: maintain the property in
habitable condition (working plumbing, heat, and structural safety),
provide advance notice before entry (commonly 24-48 hours except in an
emergency), return a security deposit within a statutory period after
move-out (commonly 14-60 days depending on the state) with an itemized
list of any deductions, and follow a formal legal eviction process rather
than self-help remedies like changing locks or shutting off utilities.
Exact notice periods, deposit limits, and habitability standards vary
significantly by state and sometimes by city — always confirm the
specific jurisdiction's landlord-tenant statute rather than assuming a
national standard.
`),
  doc("Standard Residential Lease Terms Glossary", `
Common lease terms: "joint and several liability" means each co-tenant is
individually responsible for the full rent, not just their share; a
"holdover tenant" is one who remains after lease expiration without a new
agreement, typically converting to a month-to-month tenancy at the
landlord's option; "quiet enjoyment" is the tenant's right to use the
property without unreasonable interference from the landlord; a
"acceleration clause" allows a landlord to demand the entire remaining
rent balance immediately upon default, where permitted by state law; and
"subletting" (the tenant renting to a third party) is typically prohibited
without the landlord's prior written consent unless the lease says
otherwise.
`),
];

// ── Vet / spine content ──────────────────────────────────────────────────────

const ACCOUNTING_DOCS = [
  doc("Small Business Chart of Accounts — Standard Structure", `
A standard small-business chart of accounts is organized into five
top-level categories, each with a reserved numeric range: Assets
(1000-1999: cash, accounts receivable, inventory, fixed assets), Liabilities
(2000-2999: accounts payable, accrued expenses, loans payable), Equity
(3000-3999: owner's equity, retained earnings), Revenue (4000-4999, often
broken out by service line), and Expenses (5000-6999, split between cost
of goods/services sold and operating expenses like payroll, rent, and
marketing). Keeping revenue and expense sub-accounts granular enough to
answer "which service line is actually profitable" — without so many
accounts that reconciliation becomes unmanageable — is the standard
tradeoff in designing a chart of accounts.
`),
  doc("Cash vs. Accrual Accounting — When Each Applies", `
Cash-basis accounting records revenue when payment is received and
expenses when paid — simple, but can distort profitability in a given
period if invoices are outstanding. Accrual-basis accounting records
revenue when earned (service performed or product delivered) and expenses
when incurred, regardless of when cash changes hands — required under
GAAP and required for tax purposes once a business exceeds the IRS's
average annual gross receipts threshold (a figure that is indexed and
should be confirmed for the current tax year) unless it qualifies for a
small business exception. Most small service businesses can choose either
method for tax purposes below that threshold, but accrual gives a more
accurate month-to-month view of profitability when there's a meaningful
gap between service and payment.
`),
];

const CONTACTS_DOCS = [
  doc("CRM Data Hygiene — Standard Practices", `
Reliable CRM data depends on a few disciplines: a single source of truth
for each contact (avoid duplicate records for the same person/entity —
deduplicate on email or phone match, not just name), consistent field
formatting (phone numbers, addresses, and dates in one format), regular
suppression of hard-bounced emails and disconnected numbers, and a clear
policy on required fields at creation (at minimum, name plus one verified
contact method) so incomplete records don't silently accumulate. Tagging
contacts by segment (client, prospect, vendor, referral source) at the
point of entry, rather than trying to reconstruct segmentation later, is
far more reliable.
`),
];

const HR_DOCS = [
  doc("At-Will Employment — What It Does and Doesn't Mean", `
In most US states, employment is presumed "at will": either the employer
or employee may end the relationship at any time, with or without cause,
absent a contract stating otherwise. At-will status does not permit
termination for a reason that violates federal or state
anti-discrimination law (protected classes under Title VII, ADA, ADEA,
etc.), termination in retaliation for a legally protected activity (filing
a workers' comp claim, reporting a safety violation, engaging in protected
concerted activity), or termination that breaches an implied contract
created by a handbook or consistent past practice in some states. A
written offer letter or handbook should explicitly preserve at-will
status if that's the intended relationship, since ambiguous language can
undermine it.
`),
  doc("OSHA Recordkeeping — Small Employer Basics", `
Employers with 10 or fewer employees are generally exempt from the
requirement to routinely keep OSHA injury and illness records (Form 300,
300A, 301), though they must still report any work-related fatality within
8 hours and any in-patient hospitalization, amputation, or loss of an eye
within 24 hours, regardless of size. Certain industries (listed in OSHA's
Appendix A to Subpart B, generally lower-hazard sectors) are exempt from
routine recordkeeping even above 10 employees unless requested by OSHA or
the Bureau of Labor Statistics for a specific survey. Employers should
confirm their current NAICS code exemption status, since the list is
periodically updated.
`),
  doc("Form I-9 and E-Verify — Compliance Basics", `
Every US employer must complete Form I-9 for each new hire within 3
business days of the start date, verifying identity and work
authorization from the employee's original documents (not copies). The
employer retains I-9s for the later of 3 years after hire or 1 year after
termination. E-Verify is a separate, mostly-voluntary federal system
(mandatory for federal contractors and in some states) that electronically
confirms I-9 information against SSA and DHS records — using E-Verify
does not replace the requirement to complete a physical I-9, and
employers must still follow E-Verify's specific procedures for handling a
"tentative nonconfirmation" result before taking any adverse action.
`),
];

const MARKETING_DOCS = [
  doc("Local SEO Basics for Service Businesses", `
For a business that serves a local area, the highest-leverage local SEO
actions are: claiming and fully completing a Google Business Profile
(accurate category, hours, service area, and regularly posted updates),
accumulating genuine customer reviews and responding to all of them,
ensuring the business name/address/phone number (NAP) is identical across
every online directory listing, and building locally-relevant content
(service-area pages, not just a generic homepage) so search engines can
match the business to "[service] near me" queries. Google's local search
ranking is heavily influenced by proximity, relevance, and prominence —
review volume/recency is one of the strongest prominence signals a small
business can directly influence.
`),
  doc("Client Retention Marketing for Recurring-Visit Businesses", `
For businesses built on repeat visits (medical, dental, veterinary,
personal services), retention marketing typically outperforms new-client
acquisition on cost-per-dollar-of-revenue. Core tactics: automated
appointment and wellness reminders timed to the actual recommended
interval (not a generic 6-month blast), a simple referral-ask built into
the post-visit experience rather than a separate campaign, and segmenting
lapsed clients (no visit in 12+ months) for a distinct win-back message
rather than lumping them in with active clients. Tracking client lifetime
value by acquisition channel — not just cost-per-lead — is what actually
tells you which marketing spend is working.
`),
];

const STAFF_CREDENTIALS_DOCS = [
  doc("DEA Registration — Renewal Requirements for Practices", `
A DEA registration (required for any practice that orders, possesses, or
administers controlled substances) is issued on DEA Form 224 (new
registration) or Form 224a (renewal) and must be renewed every 3 years.
Practices should track the registration expiration date independently of
any reminder DEA sends, since dispensing or administering controlled
substances under an expired registration is a federal violation regardless
of whether a renewal notice was received. A change of practice location or
a change in the type of controlled substances handled generally requires
a new or modified registration, not just an update to the existing one.
`),
  doc("State Professional License Renewal — General CE Pattern", `
Most state licensing boards for regulated health professions require
continuing education (CE) as a condition of license renewal, typically on
a 1-2 year renewal cycle with a set number of CE hours (the exact number
and any subject-matter requirements — e.g. a mandatory ethics or
jurisprudence hour — vary by state and profession, so the current state
board rule should always be confirmed directly). Boards commonly require
CE to come from an approved provider or accrediting body, and most require
the licensee to retain CE completion certificates for a period after
renewal in case of audit, rather than simply attesting to completion.
`),
];

const DRUG_DOSING_DOCS = [
  doc("Controlled Substance Recordkeeping — DEA Requirements for Practices", `
Any practice that handles Schedule II-V controlled substances must
maintain a complete, accurate, and readily retrievable record of every
receipt and disposition — commonly a bound log or an equivalent electronic
system meeting DEA requirements. Schedule II substances require a
biennial (every 2 years) physical inventory count; Schedule III-V require
the same biennial inventory. Any theft or significant loss of controlled
substances must be reported to the DEA (Form 106) and, in most states,
to the state licensing board as well. Records must be kept for a minimum
of 2 years and be available for DEA inspection without advance notice.
`),
  doc("Prescribing and Dispensing Documentation Standards", `
Regardless of species, a defensible medication record documents: the
specific drug, concentration, and route of administration; the calculated
dose and the basis for that calculation (patient weight, condition); who
administered or dispensed it and when; and any informed consent discussion
with the client for medications carrying meaningful risk. Actual dosing
decisions must be based on current, species-appropriate clinical
references and professional judgment — a general compliance reference
like this one intentionally does not include specific dosing tables,
since dosing must come from a current formulary and the treating
clinician's judgment, not a static reference document.
`),
];

const CVT_EXAM_DOCS = [
  doc("VTNE (Veterinary Technician National Examination) — Overview", `
The VTNE is administered by the American Association of Veterinary State
Boards (AAVSB) and is the credentialing exam required in nearly every US
state to become a licensed/certified/registered veterinary technician
(exact title varies by state). The exam covers nine domains: pharmacy and
pharmacology, surgical nursing, dental procedures, laboratory procedures,
animal care and nursing, diagnostic imaging, anesthesia, emergency
medicine/critical care, and pain management/analgesia. Candidates must
generally graduate from an AVMA-CVTEA-accredited program before sitting
the exam, and most states require a passing scaled score along with a
state-specific jurisprudence exam.
`),
  doc("CVT Exam Content Domain Weighting — General Pattern", `
While exact domain weighting is published and updated periodically by
AAVSB (candidates should confirm the current version before an exam
window), the VTNE has historically weighted pharmacy/pharmacology,
surgical nursing, and animal care/nursing as the largest domains, with
laboratory procedures and dental procedures also carrying substantial
weight. A study plan built around domain weighting — rather than equal
time per topic — is the AAVSB's own recommended approach, since domains
are not equally represented on the exam.
`),
];

const VET_CE_DOCS = [
  doc("Veterinary Continuing Education — General Renewal Pattern", `
Most state veterinary licensing boards require a set number of CE hours
per renewal cycle (commonly 1-2 years), often including a required number
of "RACE-approved" hours (courses reviewed and approved by AAVSB's
Registry of Approved Continuing Education) and, in some states, a
specific mandatory topic (e.g. controlled substances, jurisprudence, or
pain management). Exact hour requirements and mandatory topics vary by
state and should be confirmed against the current board rule rather than
assumed from a prior renewal cycle, since boards periodically update
requirements.
`),
  doc("RACE-Approved CE — What It Means", `
RACE (Registry of Approved Continuing Education), administered by AAVSB,
reviews and approves CE providers and individual courses against defined
quality standards so that state boards can rely on a "RACE-approved" label
without independently vetting every course. A course being RACE-approved
in general does not guarantee it satisfies every state's specific renewal
requirement (some states have additional criteria beyond RACE approval) —
licensees should verify their home state accepts the specific course
before relying on it for renewal credit.
`),
];

const EXOTIC_TRIAGE_DOCS = [
  doc("Exotic Animal Emergency Triage — Categorization Framework", `
Exotic-species triage generally follows the same acuity-based framework as
other emergency veterinary triage — immediate (airway/breathing/circulation
compromise, active seizure, severe trauma), urgent (stable but with a
condition that will deteriorate without prompt treatment), and non-urgent
— but the presenting signs of critical illness in exotics are often more
subtle than in dogs and cats, since prey-species physiology tends to mask
distress until decompensation is advanced. A general triage reference
should flag species and presentation pattern for the treating clinician's
judgment rather than substitute for species-specific clinical protocols.
`),
  doc("Common Exotic Species Presentation Categories — Overview", `
Common categories of exotic-animal emergency presentation include:
gastrointestinal stasis (frequent in rabbits and guinea pigs, often
presenting as reduced appetite and fecal output rather than obvious pain
behavior), respiratory distress (common in birds, who often show minimal
outward signs until respiratory compromise is severe), egg-binding/
dystocia in reptiles and birds, and metabolic bone disease in reptiles
from inadequate UVB exposure or calcium intake. Species-specific
reference material and current formulary guidance should always govern
actual treatment decisions.
`),
];

const PET_HEALTH_CLIENT_DOCS = [
  doc("Pet Owner FAQ — When a Symptom Needs Same-Day Care", `
General guidance most veterinary practices give clients: seek same-day or
emergency care for difficulty breathing, repeated vomiting or an inability
to keep water down, straining to urinate with little or no output
(especially in male cats — a true emergency), suspected toxin ingestion,
active seizure or collapse, a distended/hard abdomen, or any trauma from a
fall or vehicle. Symptoms that usually warrant a scheduled (not emergency)
visit within a day or two include mild lethargy without other symptoms, a
single episode of vomiting or soft stool in an otherwise normal pet, or
mild limping without visible injury. This is general guidance only — a
specific pet's history and the treating veterinarian's judgment always
take priority over general triage guidance.
`),
];

// ── DPP / Battery Regulation ─────────────────────────────────────────────────

const DPP_DOCS = [
  doc("EU Battery Regulation (EU) 2023/1542 — Overview", `
Regulation (EU) 2023/1542 is a directly applicable EU law (not requiring
national transposition) setting binding sustainability, safety, labeling,
and end-of-life requirements across the full battery lifecycle for five
battery categories: portable, SLI (starting/lighting/ignition, i.e.
automotive), LMT (light means of transport, e.g. e-bikes), electric
vehicle, and industrial batteries. Key obligations phase in on a
staggered timeline: carbon footprint declaration requirements for EV
batteries applied from February 2025, with industrial and LMT battery
carbon footprint obligations following in February 2026. The Digital
Battery Passport becomes mandatory on 18 February 2027 for industrial
batteries above 2 kWh, EV batteries, and LMT batteries.
`),
  doc("Digital Battery Passport — Required Data Categories", `
The Digital Battery Passport must make structured, accessible information
available (typically via a QR code or similar unique identifier)
covering: battery identity (manufacturer, model, unique identifier,
manufacturing date/location), composition (chemistry, critical raw
materials content), performance and durability (rated capacity, expected
lifetime, state of health where applicable), carbon footprint (calculated
per the Regulation's methodology, by model and manufacturing plant), and
end-of-life information (collection, recycling, and second-life
guidance). Certain data must be publicly accessible while other fields
may be restricted to specific actors (e.g. recyclers, market
surveillance authorities) — the Regulation specifies access tiers by data
category.
`),
  doc("Supply Chain Due Diligence Obligations", `
Economic operators placing qualifying batteries on the EU market must
establish a battery due diligence policy addressing risks associated with
the sourcing, processing, and trading of raw materials (cobalt, natural
graphite, lithium, nickel, and their chemical compounds) — covering
social and environmental risks in the supply chain, comparable in
structure to conflict-minerals due diligence regimes. Independent
third-party verification of the due diligence policy is required, with a
compliance deadline of August 2027. Due diligence documentation must be
retained and made available to competent national authorities on
request.
`),
  doc("Carbon Footprint Declaration — Methodology Basics", `
Carbon footprint must be calculated as a life-cycle assessment covering
raw material extraction and pre-processing, main product production, and
end-of-life stages, expressed as kg CO2-equivalent per kWh of total
energy provided by the battery over its expected service life. The
calculation must follow the delegated methodology the European Commission
adopts for each battery category, and the declared footprint is
model-and-manufacturing-plant specific — meaning the same battery model
built at two different plants can carry two different declared carbon
footprints if the plants' energy sources or processes differ.
`),
  doc("GS1 EPCIS — Standard for Custody-Event Data (Reference Pattern)", `
GS1's EPCIS (Electronic Product Code Information Services) is an open,
royalty-free GS1 standard for capturing and sharing supply-chain event
data — who did what, to what object, where, and when. It is already used
for chain-of-custody tracking in pharmaceuticals (US DSCSA) and food
(FSMA 204), and multiple battery/DPP implementations are converging on it
as the interoperable format for custody events across the parties in a
battery supply chain (raw material suppliers, cell manufacturers, pack
assemblers, OEMs). Adopting an existing open standard rather than a
bespoke schema is generally preferred where multiple independent parties
must post and consume the same event data.
`),
];

// ── Education (5th grade water cycle) ────────────────────────────────────────

const WATER_CYCLE_DOCS = [
  doc("The Water Cycle — Core Processes (NGSS 5-ESS2-1 aligned)", `
The water cycle describes the continuous movement of water through
evaporation, condensation, precipitation, and collection. Evaporation:
the sun heats water in oceans, lakes, and rivers, turning it into water
vapor that rises into the atmosphere. Condensation: as water vapor rises
and cools, it condenses around tiny particles in the air to form clouds.
Precipitation: when water droplets in a cloud become heavy enough, they
fall as rain, snow, sleet, or hail. Collection: precipitation collects in
oceans, lakes, rivers, and underground (groundwater), where the cycle
begins again. Transpiration (water vapor released by plants) and
sublimation (ice turning directly to vapor) are additional processes
often taught alongside the four core stages. This aligns with the Next
Generation Science Standards performance expectation 5-ESS2-1, which asks
students to describe and graph the amounts and percentages of water in
various reservoirs to provide evidence about the distribution of water on
Earth.
`),
  doc("Groundwater and the Water Table — Basics", `
When precipitation infiltrates the soil rather than running off into
streams, it moves downward until it reaches the water table — the upper
boundary of the zone where soil and rock are fully saturated with water
(the aquifer). The water table's depth varies by location and season,
rising after heavy rain and falling during dry periods or heavy pumping.
Groundwater eventually re-enters the surface water cycle by seeping into
streams, lakes, or wetlands, or by being pumped out through wells — it is
not a separate, disconnected system from the surface water cycle most
students first learn.
`),
  doc("Watersheds — How Land Shapes Water Flow", `
A watershed (or drainage basin) is the area of land where all surface
water — from rain and snowmelt — drains to a common outlet, such as a
river mouth, lake, or bay. Ridge lines and hilltops typically form the
boundaries between adjacent watersheds. Everything within a watershed's
boundary — farms, cities, forests — affects the water quality and
quantity that eventually reaches the watershed's outlet, which is why
watershed-scale thinking (rather than looking at any single property in
isolation) is standard practice in water resource management and is
often introduced alongside the water cycle in elementary earth science.
`),
];

// ── Aviation gap fill ─────────────────────────────────────────────────────────

const AV_CREW_SCHEDULING_DOCS = [
  doc("14 CFR Part 117 — Flight and Duty Time Limitations (Part 121 ops)", `
Part 117 governs flight, duty, and rest requirements for Part 121
scheduled air carrier operations. Core structure: maximum flight time and
maximum flight duty period (FDP) are set based on report time and number
of flight segments (more segments or a later/earlier report time reduces
the maximum allowable FDP), a minimum of 10 consecutive hours of rest is
required before an FDP begins (with at least 8 hours being an
uninterrupted sleep opportunity), and cumulative limits apply across
rolling 7, 28, and 365-day windows to prevent chronic fatigue
accumulation across a longer schedule, not just a single duty period.
`),
  doc("Part 135 Flight and Duty Time — Key Differences from Part 121", `
Part 135 on-demand and commuter operations follow flight, duty, and rest
rules under 14 CFR 135.267 and 135.269 rather than Part 117 — generally
simpler but with less granular scaling by report time/segment count than
Part 117. Typical structure under 135.267 (unscheduled, one or two
pilots): daily flight time limits and a minimum rest requirement before
the next duty period, with cumulative limits over 7-day, 30-day, and
90-day windows. Operators should confirm which specific subpart of 135.267
or .269 applies based on their certificate and operation type, since the
applicable limits differ for scheduled vs. unscheduled Part 135 flying.
`),
];

// ── Assemble tenant/worker → docs map ─────────────────────────────────────────

const JOBS = [
  ["demo-attorneys-title-001", "re-title-search-001", TITLE_SEARCH_DOCS],
  ["demo-attorneys-title-001", "re-escrow-001", ESCROW_DOCS],
  ["demo-attorneys-title-001", "re-salesperson", RE_SALESPERSON_DOCS],
  ["demo-attorneys-title-001", "law-landuse-001", LAW_LANDUSE_DOCS],
  ["demo-attorneys-title-001", "cre-analyst", CRE_ANALYST_DOCS],

  ["ws_1783659066844_o7m1pm", "re-salesperson", RE_SALESPERSON_DOCS],
  ["ws_1783659066844_o7m1pm", "cre-analyst", CRE_ANALYST_DOCS],
  ["ws_1783659066844_o7m1pm", "site-recon-001", SITE_RECON_DOCS],
  ["ws_1783659066844_o7m1pm", "feasibility-001", FEASIBILITY_DOCS],
  ["ws_1783659066844_o7m1pm", "law-landuse-001", LAW_LANDUSE_DOCS],
  ["ws_1783659066844_o7m1pm", "tenant-portal-001", TENANT_PORTAL_DOCS],

  ["ws_1781920656122_tl9dhn", "platform-accounting", ACCOUNTING_DOCS],
  ["ws_1781920656122_tl9dhn", "platform-contacts", CONTACTS_DOCS],
  ["ws_1781920656122_tl9dhn", "platform-hr", HR_DOCS],
  ["ws_1781920656122_tl9dhn", "platform-marketing", MARKETING_DOCS],
  ["ws_1781920656122_tl9dhn", "spine-4-staff-credentials", STAFF_CREDENTIALS_DOCS],
  ["ws_1781920656122_tl9dhn", "vet-003-drug-dosing", DRUG_DOSING_DOCS],
  ["ws_1781920656122_tl9dhn", "edu-001-cvt-exam-prep", CVT_EXAM_DOCS],
  ["ws_1781920656122_tl9dhn", "vet-ce-license-001", VET_CE_DOCS],
  ["ws_1781920656122_tl9dhn", "vet-exotic-triage-001", EXOTIC_TRIAGE_DOCS],
  ["ws_1781920656122_tl9dhn", "pet-health-client", PET_HEALTH_CLIENT_DOCS],

  ["demo-summit-realty", "re-salesperson", RE_SALESPERSON_DOCS],
  ["demo-summit-realty", "law-landuse-001", LAW_LANDUSE_DOCS],
  ["demo-summit-realty", "site-recon-001", SITE_RECON_DOCS],

  ["demo-westview-education", "watercyclehelper-mswpe8no", WATER_CYCLE_DOCS],

  ["demo-volta-advisory-001", "eu-battery-dpp-001", DPP_DOCS],
  ["demo-volta-advisory-001", "eu-passport-registry-001", DPP_DOCS],
  ["demo-volta-advisory-001", "eu-supply-chain-tracer-001", DPP_DOCS],

  ["demo-pacific-air-001", "av-crew-scheduling", AV_CREW_SCHEDULING_DOCS],
];

(async () => {
  let totalWritten = 0;
  for (const [tenantId, workerId, docs] of JOBS) {
    const col = db.collection("tenantLockers").doc(tenantId).collection("workers").doc(workerId).collection("documents");
    // Skip if already populated (idempotency guard — don't duplicate on rerun).
    const existing = await col.limit(1).get();
    if (!existing.empty) {
      console.log(`SKIP  ${tenantId} / ${workerId} — already has docs`);
      continue;
    }
    for (const d of docs) {
      const clamped = d.text.length > 12000 ? d.text.slice(0, 12000) + "\n... [truncated]" : d.text;
      await col.add({
        name: d.name,
        text: clamped,
        type: d.sourceForm || "upload",
        charCount: clamped.length,
        tier: d.tier || null,
        trustTag: d.trustTag || null,
        metadata: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedAt: null,
        createdBy: "admin-ingest",
      });
      totalWritten++;
    }
    console.log(`WROTE ${tenantId} / ${workerId} — ${docs.length} docs`);
  }
  console.log(`\nTotal documents written: ${totalWritten}`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
