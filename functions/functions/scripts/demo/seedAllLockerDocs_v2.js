"use strict";
// Studio Locker audit-and-fill pass across every demo tenant (2026-08-20).
// Additive by document NAME (not "skip whole worker if any doc exists") so
// this is safe to re-run against lockers the v1 draft (seedAllLockerDocs_tmp.js)
// or another concurrent agent already partially populated — it only ever
// inserts docs whose exact name isn't already present for that worker.
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

function doc(name, text, tier = "reference") {
  return { name, text: text.trim(), tier, trustTag: "verified-reference", sourceForm: "admin-seed" };
}

// ── NEW: Real Estate marketing / abstract / zoning / IR / property mgmt ────

const RE_MARKETING_DOCS = [
  doc("NAR Code of Ethics Article 12 — Truthful Advertising Standards", `
Article 12 of the NAR Code of Ethics requires REALTORS® to be honest and
truthful in all real estate communications and to present a true picture in
advertising, marketing, and other representations. Standard of Practice 12-5
requires disclosure of the firm name in any advertisement of listed property
or services, and REALTORS® must ensure their status as real estate
professionals is readily apparent so recipients know a communication is
coming from a licensee, not a private party. Standard of Practice 12-1
permits use of "free" and similar terms only if all conditions governing
availability are disclosed at the same time as the offer — a common
violation is advertising a "free" service or item without the accompanying
conditions in the same ad. REALTORS® complete Fair Housing training every
three years, aligned with the Code of Ethics training cycle.
Source: NAR, "Article 12 of the Code of Ethics" (nar.realtor).
`),
  doc("Fair Housing Advertising Compliance — Words, Images, and Targeting", `
The Fair Housing Act's advertising provisions reach beyond overt
discrimination: HUD and courts have found liability for advertising
language that signals a preference or limitation based on a protected
class (e.g. phrases implying a preferred family composition, religion, or
national origin), for photography that fails to represent diverse
communities where that pattern is systemic, and — increasingly — for
targeted digital advertising that excludes protected classes from seeing a
listing at all (the 2019 HUD charge against a social platform's ad-targeting
tools for housing ads is the leading example). Practical compliance:
advertise the property's features, not a description of who should live
there; avoid platform ad-targeting tools that let an advertiser exclude
audiences by protected characteristics for housing-related ads; and
maintain the same advertising standard across every channel, including
social media and video content, not just print/MLS.
`),
  doc("MLS/IDX Display Rules and Listing Syndication Basics", `
Internet Data Exchange (IDX) lets participating brokers display each
other's MLS listings on their own websites under a reciprocal agreement.
Standard IDX rules require: the display must be updated frequently (most
MLSs require refresh within 24-72 hours of a status change), the listing
broker's name must be displayed with reasonable prominence, and a seller
may opt out of IDX display for their specific listing where permitted by
the MLS's rules. Listing syndication to public consumer portals is separate
from IDX and is typically controlled by the listing broker's syndication
settings (opt-in or opt-out varies by MLS and portal agreement) — an agent
should confirm current syndication status before telling a seller where
their listing will or won't appear, since portal-specific agreements change
periodically.
`),
  doc("Social Media Advertising Compliance for Real Estate Licensees", `
The same Code of Ethics and Fair Housing obligations that apply to print
and MLS advertising apply in full to social media posts, stories, and paid
ads. Practical requirements: license disclosure/brokerage identification
should appear on or with property-marketing posts consistent with state
license law (requirements vary by state — some require it on every post,
others only on paid ads), testimonials and client reviews shared publicly
should be genuine and not edited to remove material context, and any
"coming soon" or off-MLS marketing must still comply with the applicable
MLS's clear cooperation policy where the licensee's MLS has adopted one.
Boosted/paid social ads for specific listings are advertising under Article
12 and Fair Housing law exactly as a print ad would be, including the
targeting-exclusion risk described above.
`),
];

const TITLE_ABSTRACT_DOCS = [
  doc("What an Abstract of Title Is and How It Differs From a Title Commitment", `
An abstract of title is a chronological summary of every recorded document
affecting a parcel's ownership history — deeds, mortgages, liens,
easements, judgments, and probate or tax proceedings — compiled from the
public record, typically covering a defined search period (commonly 40
years under many state title standards, or back to a root of title/patent
for rural or unplatted land). It is distinct from a title commitment: the
abstract is the underlying evidentiary summary of what the record shows,
while the commitment is the title insurer's conclusion about what it will
insure, subject to stated exceptions, based on its underwriter's review of
the abstract (or an equivalent search).
Source: XtractSol, "What Is Title Abstracting? Understanding the Process
in Title Companies"; Quicken Loans, "Abstract of Title: What You Need to
Know."
`),
  doc("Title Abstracting Standards — Search Period and Source Records", `
A standard abstract search reviews deed records, mortgage/lien records,
plat records, and relevant court records (probate, divorce, civil
judgment, bankruptcy, and federal/state tax lien filings) for the subject
property and its chain of prior owners. Many state title standards set a
minimum search period — commonly 40 years — though insurers may require a
longer look-back for rural, unplatted, or previously-abstracted-only
parcels. Every document found is logged with its recording reference
(book/page or instrument number), grantor/grantee, date, and a brief
description of its effect on title, producing a document that a title
examiner or underwriting attorney can review without re-pulling the
underlying instruments.
`),
  doc("Chain of Title — Definition and Common Break Patterns", `
Chain of title is the unbroken sequential record of ownership transfers,
grantor to grantee, from the search's starting point to the present owner.
A clean chain shows each successive grantee becoming the next grantor with
no gaps. Common break patterns an abstractor watches for: a grantee in one
instrument who never appears as a grantor in a later conveyance (often
resolved by locating an unrecorded or late-recorded deed, or by probate if
the person died owning an interest); name variances between instruments
(married/maiden name, misspellings, "Jr./Sr." ambiguity) that require
supporting documentation to bridge; and a conveyance that predates a prior
lien's release, which can leave an apparent cloud on title even though the
underlying debt was actually satisfied.
`),
  doc("Abstractor Quality Control — Review and Traceability Practices", `
Because a title insurer's underwriting decision rests on the abstract,
production standards emphasize traceability back to source records: every
line item in the abstract summary should link to the specific recorded
instrument it summarizes so an examiner can audit the work without
re-searching. Standard QC practice includes a second review pass (often by
a supervising abstractor or the underwriting attorney) before the abstract
is relied on for a commitment, and — increasingly — technology-assisted
validation that flags likely-missing instruments (e.g. a mortgage with no
corresponding release, or a gap in sequential grantor/grantee names) for
human review rather than resolving them automatically.
Source: Landmark Title Agency, ALTA Best Practice #5 (Title Production).
`),
];

const ZONING_DOCS = [
  doc("Planned Unit Development (PUD) — Definition and Rezoning Process", `
A Planned Unit Development is a flexible, non-Euclidean zoning device —
typically an overlay or its own zoning district — that lets a developer
mix land uses (residential, office, commercial) and design creative
building/site arrangements that wouldn't be permitted under the
jurisdiction's standard zoning. Approving a PUD is legally a rezoning: it
requires an amendment based on a planning commission recommendation and
governing-body approval, and the process (site plan review, public
hearing, findings that the plan meets the comprehensive plan) commonly
takes 6-8 months from application to final approval. In exchange for the
flexibility, developers typically provide public benefits — additional
open space, pedestrian/transit amenities, stormwater management, or
affordable housing — that a jurisdiction requires as consideration for the
deviation from standard zoning.
Source: Phoenix PUD Procedures Outline; Wikipedia, "Planned unit
development"; NAR, "Planned Unit Developments in Real Estate."
`),
  doc("Nonconforming Use — What Happens to a Use When Zoning Changes", `
A legal nonconforming use is a use that was lawful when established but no
longer conforms to the zoning district's current permitted uses because
the ordinance changed after the use began. Most jurisdictions "grandfather"
existing nonconforming uses (they may continue) but restrict their
expansion, and many ordinances provide that if a nonconforming use is
discontinued or abandoned for a defined period (commonly 6-12 months) or
the structure is destroyed beyond a stated damage threshold, the right to
resume the nonconforming use is lost and the property must conform to
current zoning going forward. When a PUD or rezoning is used specifically
to bring a nonconforming use closer to conformity with the surrounding
district, that is itself one of the recognized justifications planning
boards look for in approving the change.
`),
  doc("Comprehensive Plan vs. Zoning Ordinance — Consistency Requirement", `
A comprehensive (or "master") plan is a jurisdiction's long-range policy
document for land use, transportation, and infrastructure; the zoning
ordinance is the enforceable regulatory instrument that implements it.
Most states require zoning decisions — including rezonings and PUD
approvals — to be "consistent with" or at minimum "not in conflict with"
the comprehensive plan, and a rezoning that clearly contradicts the
adopted plan is one of the most common grounds for a successful legal
challenge to a zoning decision. Because comprehensive plans are updated on
a much longer cycle than individual rezoning requests, a current zoning
analysis should always check the specific plan designation for the parcel,
not assume the existing zoning district reflects the latest planning
policy.
`),
  doc("Rezoning Process — Typical Procedural Steps and Timeline", `
A standard rezoning application follows: pre-application review with
planning staff, a formal application with a site plan and narrative
explaining consistency with the comprehensive plan, a staff report and
recommendation, a public hearing before the planning commission
(recommendation only, in most jurisdictions), and a final public hearing
and vote before the governing body (city council or county board), which
holds final approval authority. Notice requirements typically include
published notice and mailed notice to property owners within a set
radius (commonly 200-500 feet). Total timeline from application to final
decision commonly runs 3-8 months depending on hearing schedules,
required environmental or traffic review, and whether neighborhood
opposition triggers a supermajority-vote requirement in jurisdictions that
have one.
`),
];

const INVESTOR_RELATIONS_DOCS = [
  doc("Real Estate Syndication Structure — GP/LP and Reg D Basics", `
A real estate syndication pools capital from passive investors (limited
partners, LPs) to acquire and operate a property, managed by a sponsor
(general partner, GP) who sources the deal, arranges financing, and handles
day-to-day asset management. Most syndications are organized as an LLC or
limited partnership and raise capital under SEC Regulation D — most
commonly Rule 506(b) (up to 35 non-accredited but sophisticated investors
permitted, no general solicitation) or Rule 506(c) (general solicitation
permitted, but every investor must be verified as accredited). Investors
receive a Schedule K-1 reflecting their share of income, losses, and
depreciation passed through from the partnership, rather than a 1099.
Source: The Real Estate CPA, "Guide to Real Estate Syndication &
Sponsors"; Angel Investors Network, "Real Estate Syndication Guide."
`),
  doc("Distribution Waterfall — Preferred Return, Return of Capital, Promote", `
A typical syndication distribution waterfall pays out in tiers: first,
return of the LPs' original invested capital; second, a cumulative
preferred return to LPs (commonly 6-9% annually — "cumulative" means any
shortfall in a given period accrues and must be paid before later tiers
receive anything); and only after those tiers are satisfied does the GP
begin receiving a "promote" or carried interest (commonly 20-30% of
remaining profit) as its incentive compensation for performance above the
preferred-return hurdle. Some structures use multiple hurdle tiers with an
increasing GP promote share at each higher return threshold. The exact
waterfall mechanics are governed by the operating agreement and should be
read tier-by-tier rather than assumed from a summary, since small
differences (compounding vs. non-compounding preferred return, catch-up
provisions) materially change actual investor economics.
`),
  doc("Schedule K-1 Timing and Investor Tax Reporting", `
K-1 timing depends on the partnership's own bookkeeping and its Form 1065
filing: the partnership return is generally due by the 15th day of the
third month after year-end (March 15 for a calendar-year partnership,
extendable), and K-1s are issued to investors only after that return is
substantially complete, since each K-1's allocations must reconcile
exactly to the partnership-level return. Investors should expect K-1s later
than a W-2 or 1099 (often March-April, sometimes after the initial
individual filing deadline if the partnership extends), which is why many
sponsors set investor expectations up front and advise investors to plan
for a possible personal extension. A K-1 reports each investor's
proportional share of income, loss, and deductions — including
depreciation, which frequently makes an investor's taxable income lower
than their cash distribution in early years of a syndication.
`),
  doc("Investor Reporting Cadence — What LPs Should Receive and When", `
Standard sponsor reporting practice for an operating syndication includes:
quarterly (or at minimum semi-annual) investor updates covering property
performance against the underwritten pro forma, leasing/occupancy
activity, capital improvements completed, and any material changes to the
business plan or market conditions; an annual audited or reviewed
financial statement package; and prompt (not batched-until-quarterly)
notice of any capital call, material adverse event, or refinancing/sale
decision requiring investor consent under the operating agreement.
Distributions, when made, are typically paid on a set cadence (commonly
quarterly) with a statement showing the return-of-capital vs.
preferred-return vs. profit-share composition of that specific
distribution, not just a lump total.
`),
];

const PROPERTY_MANAGER_DOCS = [
  doc("NARPM Code of Ethics — Core Standards for Property Managers", `
The National Association of Residential Property Managers (NARPM) Code of
Ethics and Standards of Professionalism sets expectations across several
areas: fiduciary duty to the property owner/client, fair and honest
dealing with tenants and prospective tenants, competence (managing only
properties the manager is qualified and licensed to manage), and
truthful advertising and representations about a property or a management
company's services. Members agree to hold client (owner) funds in
accordance with trust accounting requirements and to disclose any
conflict of interest, such as a financial relationship with a vendor
referred for maintenance work.
Source: NARPM, "Code of Ethics and Standards of Professionalism"
(narpm.org).
`),
  doc("Security Deposit Handling and Habitability Obligations", `
Standard property-management practice requires providing tenants a
written, itemized security deposit disposition within the timeframe set
by state law after move-out (commonly 14-60 days depending on the state),
with any deduction tied to actual documented damage beyond normal wear and
tear — not routine cleaning or pre-existing conditions noted at move-in.
Habitability obligations (functioning plumbing, heat, and structural
safety, and compliance with the local housing code) sit with the owner but
are typically delegated to the property manager under the management
agreement; NARPM's standards specifically direct members not to continue
managing a property whose owner refuses to bring it into habitability
compliance, rather than continuing to collect rent on a noncompliant unit.
`),
  doc("Fair Housing Compliance in Property Management", `
Property managers are held to the same Fair Housing Act standards as
brokers and landlords: no differential treatment in application screening,
lease terms, or renewal decisions based on race, color, religion, sex,
national origin, familial status, or disability, and a documented,
consistently-applied screening criterion (credit/income/rental history
thresholds applied identically to every applicant) is the standard defense
against a claim of discriminatory treatment. Reasonable accommodation
requests (e.g. an assistance animal in a no-pets building, or a reserved
accessible parking space) must be evaluated under fair-housing
accommodation standards, not the property's general pet or parking policy,
and denial of a legitimate accommodation request is a common source of
fair-housing liability for property managers specifically.
`),
  doc("Maintenance Request Response — Standard Practice", `
Property managers are expected to respond promptly to maintenance
requests once a management agreement makes maintenance their
responsibility — NARPM's standards frame this as a professionalism
obligation, not just good customer service, tying prompt response directly
to the habitability duties described above. Standard triage practice:
emergency issues (no heat in cold climates, active water leak, no
functioning smoke detector, security/lock failure) get same-day response;
urgent-but-not-emergency issues (a single malfunctioning appliance,
minor leak) get response within 24-72 hours; and routine requests are
scheduled within a stated service-level window communicated to the tenant
at intake. Every request and its resolution should be logged with
timestamps, since a documented response history is the property manager's
primary defense if a habitability or negligence claim is later raised.
`),
];

// ── EXPANSIONS: thin existing workers get 2 more real docs each ────────────

const TITLE_SEARCH_EXTRA = [
  doc("Recording Statutes — Race, Notice, and Race-Notice Systems", `
US states use one of three recording-statute frameworks to resolve
competing claims to the same property: a pure "race" statute (whoever
records first wins, regardless of notice of an earlier unrecorded
interest — rare today), a "notice" statute (a later purchaser without
actual or constructive notice of an earlier unrecorded interest prevails
even if they record second), and the most common, "race-notice" (a later
purchaser prevails only if they both lacked notice of the earlier interest
AND recorded first). Which framework a jurisdiction uses directly affects
how a title examiner assesses the risk of an unrecorded prior interest
surfacing after closing, and is one of the first things underwriting
counsel confirms when opening a file in an unfamiliar jurisdiction.
`),
  doc("Mechanic's Liens and Judgment Liens — Search and Priority Basics", `
A mechanic's (or construction) lien secures payment to a contractor,
subcontractor, or material supplier for work performed on the property;
most states allow the lien to relate back to the date work began or a
notice of commencement was filed — meaning a mechanic's lien recorded
after a purchase can still have priority over the buyer's interest if
qualifying work started before closing, which is why a title search
specifically checks for recent construction activity and unpaid contractor
claims, not just what's already recorded. A judgment lien attaches to all
real property a debtor owns in the county (or statewide, depending on the
jurisdiction) once properly recorded/indexed, and remains a title
exception until released, satisfied of record, or the underlying judgment
expires under the state's judgment-lien duration statute.
`),
];

const CRE_ANALYST_EXTRA = [
  doc("1031 Like-Kind Exchange — Basic Mechanics and Timelines", `
Section 1031 of the Internal Revenue Code allows an investor to defer
capital gains tax on the sale of investment/business real property by
reinvesting the proceeds into "like-kind" replacement real property. Core
timing rules: the investor must identify replacement property within 45
days of closing the sale of the relinquished property, and must close on
the replacement property within 180 days of that same sale (the 45-day
window runs concurrently within, not in addition to, the 180 days). Sale
proceeds must be held by a qualified intermediary rather than touched by
the seller between the two closings — actual or constructive receipt of
the funds disqualifies the exchange. This is a well-established federal
tax deferral mechanism, not tax elimination — gain is deferred until a
later non-exchanged sale, and specific rules apply to any "boot" (cash or
non-like-kind value) received in the exchange.
`),
  doc("Cap Rate Compression and Expansion — Market Cycle Basics", `
Cap rates move inversely with asset prices for a given income stream:
"compression" (cap rates falling) means investors are paying more per
dollar of NOI, typically driven by falling interest rates, strong capital
inflows to an asset class, or improving rent growth expectations;
"expansion" (cap rates rising) means the opposite — usually driven by
rising interest rates, tightening credit, or deteriorating fundamentals —
and results in lower asset values for the same NOI. Because commercial
real estate is priced relative to the risk-free rate plus a spread, cap
rate trends are commonly analyzed against the 10-year Treasury yield: a
persistently narrowing spread between cap rates and Treasury yields is a
signal that an asset class may be fully or over-priced relative to its
risk profile.
`),
];

const LAW_LANDUSE_EXTRA = [
  doc("Easements and Restrictive Covenants — Land Use Basics", `
An easement grants a non-owner the right to use another's land for a
specific purpose (utility lines, ingress/egress, drainage) without
transferring ownership, and runs with the land (binding future owners)
when properly recorded and drafted as appurtenant to the property rather
than personal to the original parties. A restrictive covenant limits how
an owner may use their land (setback beyond zoning minimums, architectural
standards, prohibition on certain business uses) and is enforced by the
parties the covenant benefits — typically a neighboring owner or a
homeowners' association — rather than by the municipality, distinguishing
it from a zoning violation, which the municipality itself enforces.
Racially restrictive covenants, though unenforceable and illegal since
Shelley v. Kraemer (1948) and the Fair Housing Act, are still sometimes
found in older recorded documents and require specific handling (many
states now allow or require a form of formal repudiation on record) rather
than simple removal.
`),
  doc("Regulatory Takings — Basic Framework", `
The Fifth Amendment's Takings Clause prohibits government from taking
private property for public use without just compensation, and this
extends beyond physical seizure to "regulatory takings" — a land-use
regulation so restrictive it deprives an owner of substantially all
economically viable use of the property. The leading test (Penn Central,
1978) balances the economic impact of the regulation, the extent of
interference with investment-backed expectations, and the character of
the government action; a categorical taking is found where a regulation
denies all economically beneficial use (Lucas v. South Carolina Coastal
Council, 1992). Most routine zoning and land-use regulation does not rise
to a taking — courts give substantial deference to legitimate police-power
regulation — but a permit denial or downzoning that eliminates essentially
all value can trigger a valid takings claim.
`),
];

const SITE_RECON_EXTRA = [
  doc("FEMA Flood Zone Designations — What the Letter Codes Mean", `
FEMA Flood Insurance Rate Maps designate flood risk by zone letter: Zone X
(or shaded X) is minimal-to-moderate risk, generally outside the 100-year
floodplain and not requiring mandatory flood insurance for a federally
backed mortgage; Zone A (and AE, with a defined base flood elevation) is
the 100-year (1%-annual-chance) floodplain, where flood insurance is
mandatory for federally backed financing; Zone VE is a coastal
high-hazard area subject to wave action, carrying the strictest building
and insurance requirements. A site's flood zone should always be confirmed
against the current effective FIRM for the specific parcel — FEMA
periodically remaps areas, and a site's designation can change without any
change to the property itself.
`),
  doc("Wetlands Delineation — Section 404 Basics", `
Under Section 404 of the Clean Water Act, discharging fill material into a
"water of the United States" — which includes many wetlands — requires a
permit from the US Army Corps of Engineers. A wetlands delineation, using
the federal three-parameter method (hydrophytic vegetation, hydric soils,
and wetland hydrology), determines whether a site contains jurisdictional
wetlands and where their boundaries lie. If wetlands are present, project
options are typically avoidance, minimization, or permitted impact with
required compensatory mitigation (creating, restoring, or preserving
wetlands elsewhere, often through a mitigation bank). Because jurisdiction
determinations can be appealed or challenged and the definition of
"waters of the United States" has been the subject of significant recent
litigation and rulemaking, a site-specific delineation and jurisdictional
determination from the Corps — not a general assumption — should govern
any site with potential wetland indicators.
`),
];

const FEASIBILITY_EXTRA = [
  doc("Highest and Best Use Analysis — The Four Tests", `
Highest and best use — the foundational concept underlying most
feasibility and appraisal analysis — is the reasonably probable use of a
property that is legally permissible, physically possible, financially
feasible, and maximally productive, applied in that order. A use fails at
whichever test it can't clear: a use might be financially attractive but
not legally permissible under current zoning (requiring a rezoning
feasibility assessment of its own), or physically possible but not
financially feasible given site costs. The analysis is normally run twice
— highest and best use of the land as though vacant, and as improved with
any existing structure — since redevelopment analysis depends on whether
the existing improvement itself still contributes more value than the
land alone would if cleared.
`),
  doc("Absorption Rate and Market Timing in Feasibility Analysis", `
Absorption rate — the pace at which a market absorbs new supply of a given
product type (units leased or sold per month/quarter) — is a central input
to development feasibility because it drives the assumed lease-up or
sell-out timeline, which in turn drives carrying costs, financing costs,
and the revenue-timing assumptions in the pro forma. Feasibility studies
typically derive an absorption assumption from recent comparable project
lease-up/sell-out histories in the same submarket, adjusted for how much
new competing supply is concurrently entering the pipeline — a common
feasibility-study failure mode is using a historical absorption rate from
a period with less competing supply than the market will actually have by
the time the subject project delivers.
`),
];

const AV_CREW_SCHEDULING_EXTRA = [
  doc("FAR Part 117 — Window of Circadian Low and FDP Table B Basics", `
Part 117 defines the "window of circadian low" as the period of maximum
physiological sleepiness, 0200-0559 in the flightcrew member's
acclimated time zone — a flight duty period that overlaps this window gets
a shorter maximum FDP than an identical duty starting outside it, because
circadian-low duty carries materially higher fatigue risk. Table B sets
maximum flight duty period length (roughly 9-14 hours) as a function of
report time and number of flight segments: more segments, or a report time
that overlaps the circadian low, reduces the maximum allowable FDP for that
duty. Crew scheduling software must compute the applicable Table B limit
for every planned duty and re-check it in real time when irregular
operations (weather, mechanical delay, ATC) push an actual duty period
toward or past its planned limit.
Source: eCFR 14 CFR Part 117; Aviatize, "FAR Part 117 — Flight & Duty Time
Limitations."
`),
  doc("Fatigue Risk Management System (FRMS) — Alternative Compliance Pathway", `
An FRMS is an FAA-approved alternative to specific prescriptive Part 117
limits (including Table B) that lets an operator deviate from a stated
limit where a safety case — grounded in fatigue science and the
operator's own safety data — demonstrates an equivalent or better fatigue
outcome than strict rule compliance would produce. FRMS approval is
operator-specific: it is not a general relaxation of Part 121 duty rules,
and an operator must maintain ongoing fatigue-hazard reporting and data
analysis to keep its FRMS authorization, not just receive one-time
approval. "Unforeseen operational circumstance" — an unplanned event too
short-notice to allow schedule adjustment, such as unforecast weather, an
equipment malfunction, or an ATC delay — is a defined term under Part 117
that governs a narrow, separate category of allowable duty extension
distinct from FRMS.
`),
];

const WATER_CYCLE_EXTRA = [
  doc("Human Impact on the Water Cycle — Introductory Concepts", `
Human activity affects the water cycle in several ways elementary
students can observe locally: paving over ground with roads and parking
lots increases surface runoff and reduces infiltration into groundwater
(one reason cities build stormwater drains and retention ponds); pumping
groundwater faster than precipitation recharges it lowers the water table
over time; and deforestation reduces transpiration (water plants release
to the atmosphere), which can reduce local rainfall in some regions. These
connect the abstract water-cycle diagram to a testable, observable idea —
that changes to land use change how much water infiltrates versus runs
off — appropriate for a 5th-grade NGSS 5-ESS2-1 lesson on evidence about
Earth's water distribution and systems.
`),
];

const TENANT_PORTAL_EXTRA = [
  doc("Renters Insurance — What Most Leases Require", `
Many residential leases now require tenants to carry renters insurance
covering personal property and, importantly, personal liability (e.g. if a
tenant accidentally causes a fire or water-damage loss). Renters insurance
does not cover the building structure itself — that is the landlord's
property insurance — so a tenant's policy and the landlord's policy serve
different, complementary purposes. Where a lease requires proof of
coverage, it is standard practice for the tenant to provide a certificate
naming the landlord or property manager as an "interested party" so the
landlord is notified if the policy lapses or is canceled.
`),
  doc("Move-In and Move-Out Inspection Documentation — Best Practice", `
A thorough move-in inspection, documented in writing (and ideally with
photos or video, timestamped) and signed by both landlord/manager and
tenant, is the single strongest protection for both parties in a later
security-deposit dispute — it establishes the property's condition before
the tenant's occupancy so "normal wear and tear" versus tenant-caused
damage at move-out has an objective baseline. Best practice extends the
same documentation standard to move-out: a walkthrough with the tenant
present when possible, itemized against the move-in report, before any
deposit deduction is finalized, rather than a landlord unilaterally
assessing damage after the tenant has already vacated.
`),
];

const STAFF_CREDENTIALS_EXTRA = [
  doc("Workers' Compensation Basics for Small Veterinary Practices", `
Nearly every US state requires employers, including veterinary practices,
to carry workers' compensation insurance covering employees for
work-related injury or illness (a small number of states exempt very
small employers below a specific headcount threshold — this should be
confirmed against current state law rather than assumed). Workers' comp is
a no-fault system: an injured employee generally receives covered medical
treatment and partial wage replacement regardless of who caused the
injury, in exchange for giving up the right to sue the employer directly
for most workplace injuries. Veterinary-specific injury risks that
commonly appear on a practice's claims history include animal bites/
scratches, needlestick injuries, and repetitive-strain injury from
restraining or lifting animals — all of which should be covered by the
practice's standard safety training, not treated as one-off incidents.
`),
  doc("Mandatory Workplace Postings — Federal Baseline for Employers", `
Federal law requires most employers to display certain posters where
employees can readily see them, regardless of size in most cases: the
FLSA minimum wage poster, the OSHA "Job Safety and Health: It's the Law"
poster, the Equal Employment Opportunity ("EEO is the Law") poster, the
FMLA poster (for employers with 50+ employees), and the Employee
Polygraph Protection Act notice. States commonly layer on additional
required postings (state minimum wage, state disability/paid leave
programs, workers' comp carrier information) that go beyond the federal
baseline, so a practice should confirm its state's specific list rather
than relying on the federal posters alone, and should re-check postings
whenever a poster is updated for a minimum-wage or program change.
`),
];

const DRUG_DOSING_EXTRA = [
  doc("Species Metabolic Differences — Why Dosing Isn't Simply Weight-Scaled", `
Dosing across species is not just a linear weight calculation: cats, for
example, have a well-documented deficiency in glucuronidation (a Phase II
liver metabolism pathway), making them uniquely sensitive to certain drugs
that are safely metabolized by dogs or humans at a similar weight-adjusted
dose (acetaminophen toxicity in cats is the classic teaching example of
this difference, though it is far from the only one). This is why a
general compliance/reference document intentionally does not substitute
species-specific dosing tables from a current veterinary formulary — the
role of a reference like this is to flag that cross-species extrapolation
is unsafe, not to provide the dose itself.
`),
  doc("Client Communication and Informed Consent for Medication Risk", `
Defensible practice for any medication carrying meaningful risk (sedation,
controlled substances, medications with a narrow therapeutic index)
includes a documented conversation with the client covering: the reason
for the medication, expected effects and realistic timeline, specific
warning signs that should prompt an immediate call or visit, and — where
relevant — lower-cost or lower-risk alternatives that were considered.
Documentation of that conversation (even a brief note in the medical
record, not necessarily a signed form for routine medications) protects
both the client's ability to make an informed decision and the practice's
record if a question arises later about what the client was told.
`),
];

const CVT_EXAM_EXTRA = [
  doc("AAVSB Candidate Handbook — Exam Administration Basics", `
The VTNE is administered under rules published in AAVSB's candidate
handbook, which candidates should review directly for the current testing
window rather than relying on a prior cycle's version. Key administration
basics that have historically applied: candidates must be approved by
their state veterinary board (or the credentialing body for their
jurisdiction) before scheduling, the exam is computer-based and offered at
approved testing centers, and a candidate who does not pass may retake the
exam after a required waiting period, with a state-specific limit on total
attempts in some jurisdictions. Because both fees and specific
administration policies are periodically updated by AAVSB, candidates
should always confirm current details on the official AAVSB site before
registering.
`),
  doc("Building a VTNE Study Plan by Domain Weight", `
AAVSB's own guidance recommends allocating study time according to each
of the nine VTNE domains' published weight rather than spending equal time
on every domain — historically, pharmacy/pharmacology, surgical nursing,
and animal care/nursing have carried the largest share of exam content,
with laboratory procedures and dental procedures also weighted
substantially. A practical study plan built on this pattern: diagnose
weak domains early with a practice exam, allocate the largest block of
remaining study time to the highest-weighted domains where the candidate
is weakest (not the domains they find most interesting), and reserve the
final 1-2 weeks for cumulative practice exams under timed conditions rather
than new content, since timing and retrieval practice are separate skills
from content mastery.
`),
];

const VET_CE_EXTRA = [
  doc("Multi-State License Portability — General Pattern", `
A veterinarian or credentialed technician licensed in one state does not
automatically hold a license to practice in another — most states require
a separate application, verification of the home-state license in good
standing, and often a state-specific jurisprudence exam even for an
otherwise-qualified applicant, though a growing number of states
participate in compact or expedited-endorsement arrangements that reduce
duplicate requirements for applicants from states with substantially
similar standards. CE completed for one state's renewal does not
automatically satisfy another state's requirement unless the second
state's board specifically accepts it (RACE approval helps but doesn't
guarantee acceptance, as noted above) — a professional working across
state lines should track each state's renewal cycle and CE requirement
separately.
`),
  doc("Tracking CE Deadlines — Recordkeeping Best Practice", `
Because license lapse for missed CE or a missed renewal deadline can halt
a professional's ability to practice, standard best practice is to track
renewal and CE deadlines independently of any reminder the licensing board
sends — board reminder systems can fail, go to an outdated address, or be
missed entirely. Retaining CE completion certificates (not just a
completed-hours count) for the period the board requires after renewal
means a licensee can respond immediately if audited, rather than trying to
reconstruct completion evidence from memory or a training provider's
records months or years later.
`),
];

const EXOTIC_TRIAGE_EXTRA = [
  doc("Rabbit and Small Mammal GI Stasis — Recognition Basics", `
Gastrointestinal stasis is one of the most common emergency presentations
in pet rabbits and guinea pigs, and — because these species mask pain and
distress far more than dogs or cats — often presents subtly: reduced or
absent fecal output, reduced appetite, and a hunched or reluctant-to-move
posture, rather than obvious vomiting (rabbits cannot vomit) or overt pain
behavior. Because GI stasis can progress rapidly and become
life-threatening, general practice guidance treats any rabbit or guinea
pig with reduced fecal output and reduced appetite for more than several
hours as an urgent, same-day case rather than a "wait and see" presentation
— actual treatment decisions remain the treating clinician's, informed by
current exotic-formulary guidance.
`),
  doc("Avian Respiratory Distress — Recognition Basics", `
Birds are prey-species physiology at its most extreme for masking illness:
by the time a bird shows overt open-mouth breathing, tail-bobbing with
each breath, or audible respiratory sounds, respiratory compromise is
often already severe, since birds' evolutionary pressure to hide weakness
from predators works against early external signs of distress. General
triage guidance treats any bird with visible respiratory effort, tail-bob
breathing, or a fluffed/lethargic presentation as an emergency requiring
immediate low-stress handling (minimizing restraint time and handling
stress, which itself worsens respiratory compromise in birds) rather than
a routine workup — species-specific formulary and stabilization protocols
should govern actual treatment.
`),
];

const PET_HEALTH_CLIENT_EXTRA = [
  doc("Preventive Care Schedule — General Wellness Visit Cadence", `
Most veterinary practices recommend a wellness exam at least once a year
for adult dogs and cats, and twice a year for senior pets (commonly age 7+
for dogs, varying by breed size, and age 10+ for cats), since pets age
faster than humans and can develop or progress conditions meaningfully
between annual visits. Core preventive elements typically covered:
weight and body-condition tracking, dental assessment, core vaccines on
the practice's recommended schedule, and parasite prevention
(heartworm, flea/tick) appropriate to the region and season. Exact vaccine
and screening schedules vary by pet, region, and risk factors — this is
general guidance, not a substitute for the treating veterinarian's
individualized recommendation.
`),
  doc("Pet Poison Hotline and When to Call", `
If a pet may have ingested something toxic (household chemicals, human
medication, certain foods like grapes/raisins/xylitol/chocolate, or a
plant), general guidance is to call a pet poison hotline (e.g. the ASPCA
Animal Poison Control Center or the Pet Poison Helpline, both staffed
24/7 in the US, though each may charge a consultation fee) or the pet's
own veterinarian immediately rather than waiting for symptoms to appear —
many toxins cause internal damage well before visible symptoms show, and
having the product packaging or plant identified on hand speeds up
guidance. This is general awareness guidance only; the treating
veterinarian's direction for the specific pet and substance always
governs actual treatment.
`),
  doc("Understanding Your Vet Bill — Common Line Items", `
Veterinary invoices commonly break into: the exam/consultation fee,
diagnostics (bloodwork, imaging, in-house lab tests), procedures
(vaccines, dental cleaning, surgery), medications dispensed, and
facility/anesthesia-monitoring fees for anything requiring sedation.
Clients are generally entitled to a written estimate before a
non-emergency procedure, and most practices will explain any line item on
request — a documented estimate given before treatment, updated if the
plan changes mid-procedure, is standard practice for avoiding billing
surprises and is one of the most common sources of client complaints when
it's skipped.
`),
];

// ── Reused content (already proven; kept verbatim from the earlier draft) ──

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
  // Title
  ["demo-attorneys-title-001", "re-title-search-001", [...TITLE_SEARCH_DOCS, ...TITLE_SEARCH_EXTRA]],
  ["demo-attorneys-title-001", "re-escrow-001", ESCROW_DOCS],
  ["demo-attorneys-title-001", "re-salesperson", RE_SALESPERSON_DOCS],
  ["demo-attorneys-title-001", "law-landuse-001", [...LAW_LANDUSE_DOCS, ...LAW_LANDUSE_EXTRA]],
  ["demo-attorneys-title-001", "cre-analyst", [...CRE_ANALYST_DOCS, ...CRE_ANALYST_EXTRA]],

  // Real Estate — Merritt Capital Group
  ["ws_1783659066844_o7m1pm", "re-salesperson", RE_SALESPERSON_DOCS],
  ["ws_1783659066844_o7m1pm", "cre-analyst", [...CRE_ANALYST_DOCS, ...CRE_ANALYST_EXTRA]],
  ["ws_1783659066844_o7m1pm", "site-recon-001", [...SITE_RECON_DOCS, ...SITE_RECON_EXTRA]],
  ["ws_1783659066844_o7m1pm", "feasibility-001", [...FEASIBILITY_DOCS, ...FEASIBILITY_EXTRA]],
  ["ws_1783659066844_o7m1pm", "law-landuse-001", [...LAW_LANDUSE_DOCS, ...LAW_LANDUSE_EXTRA]],
  ["ws_1783659066844_o7m1pm", "tenant-portal-001", [...TENANT_PORTAL_DOCS, ...TENANT_PORTAL_EXTRA]],
  ["ws_1783659066844_o7m1pm", "re-marketing-001", RE_MARKETING_DOCS],
  ["ws_1783659066844_o7m1pm", "title-abstract-001", TITLE_ABSTRACT_DOCS],
  ["ws_1783659066844_o7m1pm", "zoning-001", ZONING_DOCS],
  ["ws_1783659066844_o7m1pm", "investor-relations", INVESTOR_RELATIONS_DOCS],
  ["ws_1783659066844_o7m1pm", "re-property-manager", PROPERTY_MANAGER_DOCS],

  // Vet — Meadow Creek (vet-vertical workers only; platform-* spine workers
  // owned by a separate parallel agent — intentionally NOT touched here)
  ["ws_1781920656122_tl9dhn", "spine-4-staff-credentials", [...STAFF_CREDENTIALS_DOCS, ...STAFF_CREDENTIALS_EXTRA]],
  ["ws_1781920656122_tl9dhn", "vet-003-drug-dosing", [...DRUG_DOSING_DOCS, ...DRUG_DOSING_EXTRA]],
  ["ws_1781920656122_tl9dhn", "edu-001-cvt-exam-prep", [...CVT_EXAM_DOCS, ...CVT_EXAM_EXTRA]],
  ["ws_1781920656122_tl9dhn", "vet-ce-license-001", [...VET_CE_DOCS, ...VET_CE_EXTRA]],
  ["ws_1781920656122_tl9dhn", "vet-exotic-triage-001", [...EXOTIC_TRIAGE_DOCS, ...EXOTIC_TRIAGE_EXTRA]],
  ["ws_1781920656122_tl9dhn", "pet-health-client", [...PET_HEALTH_CLIENT_DOCS, ...PET_HEALTH_CLIENT_EXTRA]],

  // Brokerage — Summit Realty Group
  ["demo-summit-realty", "re-salesperson", RE_SALESPERSON_DOCS],
  ["demo-summit-realty", "law-landuse-001", [...LAW_LANDUSE_DOCS, ...LAW_LANDUSE_EXTRA]],
  ["demo-summit-realty", "site-recon-001", [...SITE_RECON_DOCS, ...SITE_RECON_EXTRA]],

  // Education — Westview Elementary
  ["demo-westview-education", "watercyclehelper-mswpe8no", [...WATER_CYCLE_DOCS, ...WATER_CYCLE_EXTRA]],

  // DPP — Volta Advisory
  ["demo-volta-advisory-001", "eu-battery-dpp-001", DPP_DOCS],
  ["demo-volta-advisory-001", "eu-passport-registry-001", DPP_DOCS],
  ["demo-volta-advisory-001", "eu-supply-chain-tracer-001", DPP_DOCS],

  // Aviation — Pacific Air Partners (av-copilot-001/av-mx-001/av-dispatch-001/
  // av-ground-school-001 already populated by another pass; only the
  // crew-scheduling gap remains)
  ["demo-pacific-air-001", "av-crew-scheduling", [...AV_CREW_SCHEDULING_DOCS, ...AV_CREW_SCHEDULING_EXTRA]],
];

(async () => {
  let totalWritten = 0;
  const report = [];
  for (const [tenantId, workerId, docs] of JOBS) {
    const col = db.collection("tenantLockers").doc(tenantId).collection("workers").doc(workerId).collection("documents");
    const existingSnap = await col.get();
    const existingNames = new Set();
    let beforeCount = 0;
    existingSnap.forEach(d => {
      const data = d.data();
      if (!data.deletedAt) beforeCount++;
      if (data.name) existingNames.add(data.name);
    });

    let wrote = 0;
    for (const d of docs) {
      if (existingNames.has(d.name)) continue; // already present by exact name — skip
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
      wrote++;
      totalWritten++;
    }
    const afterCount = beforeCount + wrote;
    report.push({ tenantId, workerId, beforeCount, wrote, afterCount });
    console.log(`${wrote > 0 ? "WROTE" : "SKIP "} ${tenantId} / ${workerId} — before=${beforeCount} +${wrote} = after=${afterCount}`);
  }
  console.log(`\nTotal documents written: ${totalWritten}`);
  console.log("\nJSON_REPORT=" + JSON.stringify(report));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
