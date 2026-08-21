// seedSpineCanvasDemo.js — Seeds real spine-worker CANVAS DATA (transactions,
// campaigns, contacts, tenants/{id}/teamMembers) for demo tenants whose
// Accounting / Marketing / HR / Contacts sections were empty.
//
// Scope note: this is NOT Studio Locker (tenantLockers/*/workers/*/documents —
// grounding docs a worker cites in chat). This writes the actual transactional
// records that the Accounting/Marketing/HR/Contacts dashboards read directly
// to render their numbers: top-level `transactions`/`campaigns`/`contacts`
// (filtered by tenantId field) and `tenants/{tenantId}/teamMembers`.
//
// Field shapes were reverse-engineered from the live route handlers in
// functions/functions/index.js (not guessed):
//   - transactions: amountCents (int), direction ("credit"|"debit"),
//     classification ("revenue"|"expense"), coaCategory (P&L line label),
//     date "YYYY-MM-DD", description. See /accounting:pl, /accounting:balance-sheet.
//   - campaigns: name, channel, impressions, clicks, spend, conversions,
//     revenue, trend[]. See services/canvas/workerOwnData.js marketingBlock().
//   - contacts: name/first_name/last_name/email, segments[], status
//     (must not be "deleted"). See /contacts:list + contactsBlock().
//   - teamMembers: name, email, role, type ("W2"|"1099"), schedule, status
//     (must be "active" or "onboarding" or hr:people:list silently bootstraps
//     Sean+Kent defaults — see /hr:people:list in index.js).
//
// Tenants covered (each vertical's real demo tenantId, cross-checked against
// the PERSONAS map in index.js, not just the task's assumed IDs):
//   - DPP / Volta Advisory      -> demo-volta-advisory-001 (NOT ws_1783763627546_mv3rpx,
//     which turned out to be a real signed-up account — do not touch it)
//   - Aviation / Pacific Air    -> demo-pacific-air-001
//   - Brokerage / Summit Realty -> demo-summit-realty
//   - Education / Westview     -> demo-westview-education
//   - Nursing / UH Mānoa        -> demo-uh-nursing (transactions + teamMembers
//     only — platform-marketing/platform-contacts are not in this tenant's
//     activeWorkers, per PERSONAS["uh-admin"], so campaigns/contacts would be
//     force-fit data for a worker that isn't actually subscribed there)
//
// demo-makai-nursing is deliberately NOT touched here: its activeWorkers is
// identical to UH Mānoa's (["nursing-education-001","nursing-micro-001",
// "nursing-ob-001"] — no platform-* spine workers at all), and it already has
// 90 real transactions, so no new records are force-fit into it.
//
// Idempotent — clears prior demo:true rows per tenant+collection before
// inserting, matching the pattern in seedTitleDemo.js.
//
// Run with node_modules resolved from the real functions/functions checkout,
// e.g.: NODE_PATH=/Users/sean/titleapp-platform/functions/functions/node_modules node seedSpineCanvasDemo.js
"use strict";

const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const now = () => admin.firestore.FieldValue.serverTimestamp();

// ─────────────────────────────────────────────────────────────────────────
// Shared contact-generation helpers (buyer/seller-style leads for brokerage,
// prospective-family leads for education) so we don't hand-write 25 nearly
// identical rows.
// ─────────────────────────────────────────────────────────────────────────
const FIRST = ["Michael","Sandra","David","Angela","Kevin","Monica","Steven","Renee","Brian","Carla",
  "Jason","Denise","Todd","Yvonne","Craig","Paulette","Wesley","Tanya","Corey","Bianca",
  "Nathaniel","Christine","Dwayne","Priscilla","Lorenzo","Simone","Garrett","Adriana","Marcus","Felicia"];
const LAST = ["Barrera","Kim","Alvarado","Whitfield","Chastain","Osei","McAllister","Delacroix","Fontaine","Ibarra",
  "Nakamura","Petrov","Okonkwo","Villareal","Bergstrom","Haddad","Renaud","Lindholm","Torres","Ellingson"];

function genContacts({ tenant, total, segmentPool, titlePool, companyFn, emailDomain }) {
  const out = [];
  for (let i = 0; i < total; i++) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7) % LAST.length];
    const segs = segmentPool[i % segmentPool.length];
    const title = titlePool[i % titlePool.length];
    out.push({
      tenantId: tenant, demo: true, status: "active",
      name: `${first} ${last}`, first_name: first, last_name: last,
      email: `${first}.${last}@${emailDomain}`.toLowerCase(),
      phone: `(555) ${String(300 + i).padStart(3, "0")}-${String(1000 + (i * 37) % 9000).padStart(4, "0")}`,
      company: companyFn ? companyFn(i) : null,
      title,
      segments: segs,
      type: segs.includes("client") || segs.includes("past-client") || segs.includes("enrolled") ? "customer" : "lead",
      source: "demo-seed",
      createdAt: new Date(Date.UTC(2026, 2 + (i % 5), 1 + (i % 27))),
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. DPP / Volta Advisory — demo-volta-advisory-001
// ═══════════════════════════════════════════════════════════════════════
const DPP_TENANT = "demo-volta-advisory-001";
const DPP_UID = "demo-traitly-elise-001";

const DPP_TRANSACTIONS = [
  ["2026-03-05","credit","Compliance Audit — Rheinwerk GmbH (Battery Passport Cluster 3 LCA review)",1850000,"Compliance Audit Fees"],
  ["2026-03-12","debit","Payroll — compliance analysts (March)",620000,"Payroll"],
  ["2026-03-20","debit","SaaS — Traitly platform subscription + document management",89000,"Software & Subscriptions"],
  ["2026-04-02","credit","Advisory Retainer — Zhenghe Celltech Co. (Q2 EU Battery Regulation readiness)",2400000,"Advisory Retainers"],
  ["2026-04-10","debit","Flights + hotel — supplier audit site visit, Zhenghe Celltech (Ningbo, CN)",215000,"Travel"],
  ["2026-04-15","debit","Payroll — compliance analysts (April)",640000,"Payroll"],
  ["2026-04-22","credit","Compliance Audit — Hanam Cell Corp. (supplier verification, Cluster 1-2)",980000,"Compliance Audit Fees"],
  ["2026-05-01","debit","Office rent — Amsterdam co-working suite (May)",165000,"Office Rent"],
  ["2026-05-08","credit","Compliance Audit — ShinPower Corp. (carbon footprint LCA, Cluster 3)",1575000,"Compliance Audit Fees"],
  ["2026-05-14","debit","Payroll — compliance analysts (May)",640000,"Payroll"],
  ["2026-05-20","debit","EU Battery Regulation registry filing fees — 3 SKU submissions",320000,"Legal & Registry Fees"],
  ["2026-06-03","credit","Advisory Retainer — Zhenghe Celltech Co. (Q2 renewal + expanded scope)",2800000,"Advisory Retainers"],
  ["2026-06-11","debit","Professional liability + cyber insurance — June premium",110000,"Insurance"],
  ["2026-06-18","debit","Payroll — compliance analysts (June)",640000,"Payroll"],
  ["2026-06-25","credit","Workshop Fee — \"EU Battery Passport 101\" training for Rheinwerk GmbH staff",650000,"Training & Workshop Fees"],
  ["2026-07-02","debit","Office rent — Amsterdam co-working suite (July)",165000,"Office Rent"],
  ["2026-07-09","credit","Compliance Audit — Rheinwerk GmbH (curative action verification)",1920000,"Compliance Audit Fees"],
  ["2026-07-16","debit","Payroll — compliance analysts (July)",640000,"Payroll"],
  ["2026-07-22","debit","Outside counsel — EU Digital Product Passport regulatory review",480000,"Legal & Registry Fees"],
  ["2026-08-01","credit","Advisory Retainer — Hanam Cell Corp. (full-scope onboarding, all 6 SKUs)",3150000,"Advisory Retainers"],
  ["2026-08-06","debit","Office rent — Amsterdam co-working suite (August)",165000,"Office Rent"],
  ["2026-08-12","debit","Payroll — compliance analysts (August)",640000,"Payroll"],
  ["2026-08-14","debit","Contractor — freelance LCA specialist (carbon footprint modeling, ShinPower)",290000,"Contractor Fees"],
  ["2026-08-15","credit","Compliance Audit — ShinPower Corp. (second-life battery certification review)",1240000,"Compliance Audit Fees"],
];

const DPP_CAMPAIGNS = [
  { name: "EU Battery Regulation Webinar Series", channel: "linkedin", headline: "Are you ready for the August 2026 registry deadline?",
    gradient: "linear-gradient(135deg,#0ea5e9,#0369a1)", impressions: 38000, clicks: 1900, spend: 4200, conversions: 62, revenue: 145000, trend: [8,12,15,18,22,28,35] },
  { name: "Battery Passport Compliance Guide (gated download)", channel: "linkedin", headline: "Free 20-page guide: EU Battery Passport cluster requirements",
    gradient: "linear-gradient(135deg,#6366f1,#4338ca)", impressions: 22000, clicks: 1320, spend: 1800, conversions: 88, revenue: 0, trend: [10,14,16,15,18,20,24] },
  { name: "Conference Lead-Gen — Battery Show Europe", channel: "event", headline: "Meet Volta Advisory at Battery Show Europe, Stuttgart",
    gradient: "linear-gradient(135deg,#f59e0b,#b45309)", impressions: 5000, clicks: 400, spend: 12000, conversions: 34, revenue: 218000, trend: [5,8,6,9,4,2,0] },
  { name: "Supplier Verification Nurture Sequence", channel: "email", headline: "3 things your BMS vendor isn't telling you about SoH reporting",
    gradient: "linear-gradient(135deg,#10b981,#047857)", impressions: 6400, clicks: 980, spend: 300, conversions: 41, revenue: 96000, trend: [6,7,9,8,10,9,11] },
  { name: "LinkedIn Thought Leadership — Elise Moreau", channel: "linkedin", headline: "Why 90% of EU battery manufacturers will miss the registry deadline",
    gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)", impressions: 61000, clicks: 2850, spend: 900, conversions: 27, revenue: 0, trend: [3,5,8,12,18,25,31] },
  { name: "Google Search — \"EU Battery Passport consultant\"", channel: "google", headline: "EU Battery Passport compliance, done right the first time",
    gradient: "linear-gradient(135deg,#ef4444,#b91c1c)", impressions: 14500, clicks: 720, spend: 3100, conversions: 19, revenue: 84000, trend: [2,3,3,4,5,4,6] },
];

const DPP_CONTACTS = [
  ["Lukas","Bergmann","Rheinwerk GmbH","Head of Compliance",["client","industrial"]],
  ["Mei","Zhang","Zhenghe Celltech Co.","VP Regulatory Affairs",["client","ev"]],
  ["Jin-ho","Park","Hanam Cell Corp.","Quality Director",["client","industrial"]],
  ["Soo-yun","Choi","ShinPower Corp.","Compliance Manager",["client","lmt"]],
  ["Anke","Voss","Nordbatt Solutions GmbH","CTO",["prospect","ev"]],
  ["Marco","Bellini","Energia Volt SpA","Head of Sustainability",["prospect","industrial"]],
  ["Camille","Dubois","PowerCell France SAS","Regulatory Affairs Lead",["lead","ev"]],
  ["Erik","Lindqvist","Nordic Battery AB","VP Operations",["lead","industrial"]],
  ["Hana","Kobayashi","Kobayashi Energy Systems","EU Market Entry Director",["prospect","ev"]],
  ["Tomasz","Nowak","PolBat Industries","Plant Manager",["lead","industrial"]],
  ["Isabel","Fernandes","IberCell Storage","Compliance Officer",["lead","lmt"]],
  ["Pieter","de Vries","Delta Battery Technologies","Founder / CEO",["prospect","ev"]],
  ["Greta","Halvorsen","Fjord Power Modules","Head of Supply Chain",["lead","industrial"]],
  ["Andrei","Popescu","CarpatCell SRL","Operations Director",["lead","industrial"]],
  ["Ines","Lacroix","Atlantique Batteries SA","VP Regulatory",["prospect","ev"]],
  ["Werner","Huber","Alpen Storage GmbH","Sustainability Manager",["client","industrial"]],
  ["Katarina","Novak","Balkan Battery Group","Compliance Lead",["lead","lmt"]],
  ["Rikard","Sørensen","DanCell Energy","CTO",["prospect","ev"]],
  ["Elena","Martinez","IberoBat Solutions","Head of Product Compliance",["lead","industrial"]],
  ["Bram","Janssens","BeneluxCell NV","Regulatory Affairs Manager",["lead","lmt"]],
];

const DPP_TEAM = [
  { name: "Elise Moreau", email: "elise.moreau@voltaadvisory.eu", role: "Practice Lead / Founder", type: "W2", schedule: "M–F 8am–6pm CET", startDate: "2025-11-03" },
  { name: "Sara Lindberg", email: "sara.lindberg@voltaadvisory.eu", role: "Senior Compliance Analyst — EV & Industrial", type: "W2", schedule: "M–F 9am–5pm CET", startDate: "2026-01-12" },
  { name: "Tomás Rivera", email: "tomas.rivera@voltaadvisory.eu", role: "Compliance Analyst — Supply Chain Verification", type: "W2", schedule: "M–F 9am–5pm CET", startDate: "2026-02-02" },
  { name: "Nils Andersson", email: "nils.andersson@voltaadvisory.eu", role: "Compliance Analyst — Registry & Filings", type: "W2", schedule: "M–F 9am–5pm CET", startDate: "2026-02-16" },
  { name: "Priya Desai", email: "priya.desai@voltaadvisory.eu", role: "Junior Compliance Analyst / LCA Specialist", type: "1099", schedule: "Project-based, ~25 hrs/wk", startDate: "2026-03-30" },
];

// ═══════════════════════════════════════════════════════════════════════
// 2. Aviation / Pacific Air Partners — demo-pacific-air-001
// ═══════════════════════════════════════════════════════════════════════
const AV_TENANT = "demo-pacific-air-001";
const AV_UID = "demo-aviation-alex-001";

const AV_TRANSACTIONS = [
  ["2026-03-04","credit","Charter Revenue — N701AA, Van Nuys–Aspen round trip (3 legs)",4200000,"Charter Revenue"],
  ["2026-03-07","debit","Jet A fuel — N701AA, N702AA (March)",840000,"Fuel"],
  ["2026-03-11","debit","Scheduled maintenance — N704AA 100-hr inspection",1260000,"Maintenance"],
  ["2026-03-15","debit","Pilot payroll — 4 captains, 2 first officers (March)",1800000,"Payroll"],
  ["2026-03-20","credit","Charter Revenue — N702AA, Van Nuys–Cabo San Lucas",2850000,"Charter Revenue"],
  ["2026-03-25","debit","Hangar rent — Van Nuys Airport (March)",620000,"Hangar & Facilities"],
  ["2026-04-02","credit","Aircraft Management Fee — N705AA owner (March)",1980000,"Management Fees"],
  ["2026-04-06","debit","Jet A fuel (April)",910000,"Fuel"],
  ["2026-04-10","debit","Insurance — hull & liability, quarterly premium",480000,"Insurance"],
  ["2026-04-14","credit","Charter Revenue — N701AA, multi-leg East Coast (NY–Miami–Nassau)",5100000,"Charter Revenue"],
  ["2026-04-18","debit","Pilot payroll (April)",1820000,"Payroll"],
  ["2026-04-24","debit","Unscheduled maintenance — N702AA brake replacement",790000,"Maintenance"],
  ["2026-05-01","credit","Charter Revenue — N704AA, Van Nuys–Jackson Hole",2240000,"Charter Revenue"],
  ["2026-05-06","debit","Hangar rent (May)",630000,"Hangar & Facilities"],
  ["2026-05-11","debit","Jet A fuel (May)",960000,"Fuel"],
  ["2026-05-16","credit","Aircraft Management Fee — N705AA owner (April)",1980000,"Management Fees"],
  ["2026-05-20","debit","Pilot payroll (May)",1840000,"Payroll"],
  ["2026-05-27","debit","Recurrent training — 2 captains, sim center (Dallas)",540000,"Training"],
  ["2026-06-02","credit","Charter Revenue — N701AA, Van Nuys–Vail",3670000,"Charter Revenue"],
  ["2026-06-09","debit","Jet A fuel (June)",980000,"Fuel"],
  ["2026-06-15","debit","Scheduled maintenance — N701AA 200-hr inspection + avionics update",2200000,"Maintenance"],
  ["2026-06-20","credit","Charter Revenue — N702AA, Van Nuys–Sun Valley",2730000,"Charter Revenue"],
  ["2026-06-25","debit","Pilot payroll (June)",1840000,"Payroll"],
  ["2026-07-03","credit","Aircraft Management Fee — N705AA owner (May-June catchup)",3960000,"Management Fees"],
  ["2026-07-10","debit","Jet A fuel (July)",1020000,"Fuel"],
  ["2026-07-17","debit","Hangar rent (July)",640000,"Hangar & Facilities"],
  ["2026-07-24","credit","Charter Revenue — N704AA, multi-leg (Van Nuys–Scottsdale–Napa)",4450000,"Charter Revenue"],
  ["2026-08-05","debit","Pilot payroll (August, incl. new FO onboarding)",1860000,"Payroll"],
];

const AV_CAMPAIGNS = [
  { name: "Aircraft Management — Owner Acquisition", channel: "linkedin", headline: "Turn your idle aircraft into revenue — full-service Part 135 management",
    gradient: "linear-gradient(135deg,#0284c7,#0c4a6e)", impressions: 18000, clicks: 620, spend: 3400, conversions: 12, revenue: 237600, trend: [1,2,2,3,4,5,6] },
  { name: "Charter Client Referral Program", channel: "email", headline: "Refer a friend, both fly free on your next Cabo trip",
    gradient: "linear-gradient(135deg,#f97316,#c2410c)", impressions: 4200, clicks: 890, spend: 200, conversions: 22, revenue: 154000, trend: [2,3,4,3,5,6,7] },
  { name: "Google Search — private jet charter Southern California", channel: "google", headline: "On-demand private charter, Van Nuys-based, 4 aircraft ready",
    gradient: "linear-gradient(135deg,#ef4444,#991b1b)", impressions: 26000, clicks: 1040, spend: 5200, conversions: 31, revenue: 421000, trend: [4,5,6,7,8,9,11] },
  { name: "Instagram — Weekend Getaway Charter", channel: "instagram", headline: "Aspen by lunch. Book your weekend charter.",
    gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)", impressions: 45000, clicks: 1350, spend: 2100, conversions: 18, revenue: 198000, trend: [3,4,5,6,7,9,12] },
  { name: "Private Aviation Trade Publication Ad", channel: "print", headline: "Pacific Air Partners — Part 135 charter & aircraft management",
    gradient: "linear-gradient(135deg,#64748b,#334155)", impressions: 8000, clicks: 180, spend: 4500, conversions: 5, revenue: 89000, trend: [1,1,0,1,1,0,1] },
  { name: "NBAA Conference Booth Lead-Gen", channel: "event", headline: "Meet Pacific Air Partners at NBAA-BACE",
    gradient: "linear-gradient(135deg,#f59e0b,#92400e)", impressions: 2200, clicks: 210, spend: 9800, conversions: 9, revenue: 178000, trend: [2,3,1,2,1,0,0] },
  { name: "Repeat Client Email — Peak Season Booking Reminder", channel: "email", headline: "Book your holiday charter before the calendar fills up",
    gradient: "linear-gradient(135deg,#10b981,#065f46)", impressions: 3100, clicks: 720, spend: 100, conversions: 26, revenue: 312000, trend: [4,5,6,8,10,12,15] },
];

const AV_CONTACTS = [
  ["Richard","Ashford","Ashford Capital Partners","Managing Partner",["charter-client","repeat"]],
  ["Dana","Whitfield","Whitfield Family Office","Principal",["charter-client","repeat"]],
  ["Marcus","Chen","Chen Biotech Inc.","CEO",["charter-client"]],
  ["Lauren","Voss","Voss Entertainment Group","COO",["charter-client","repeat"]],
  ["Kevin","Okafor",null,"Aircraft Owner (N880KO)",["aircraft-owner","prospect"]],
  ["Diane","Marchetti","Marchetti Vineyards","Owner",["charter-client"]],
  ["Trevor","Lang","Lang Sports Management","Founder",["charter-client","repeat"]],
  ["Patricia","Nguyen",null,"Aircraft Owner (prospect)",["aircraft-owner","prospect"]],
  ["Samuel","Reyes","Reyes Development Group","President",["charter-client"]],
  ["Mark","Dietrich","Universal Fuel Services","Account Manager",["vendor","fuel"]],
  ["Carla","Simmons","Van Nuys Jet Center","FBO Manager",["vendor","fbo"]],
  ["Greg","Halvorsen","Duncan Aviation","MX Account Rep",["vendor","maintenance"]],
  ["Julie","Park","StandardAero","Sales Rep",["vendor","maintenance"]],
  ["Anthony","Ricci",null,"Charter Prospect",["charter-client","lead"]],
  ["Faisal","Al-Rashid",null,"Aircraft Owner (prospect)",["aircraft-owner","prospect"]],
  ["Nicole","Bergstrom","Bergstrom Wealth Management","Managing Director",["charter-client"]],
  ["Omar","Haddad",null,"Charter Prospect",["charter-client","lead"]],
  ["Christine","Delacroix","Delacroix Events","Owner",["charter-client","repeat"]],
  ["Brett","Sullivan",null,"Charter Prospect",["charter-client","lead"]],
  ["Amara","Osei","Osei Legal Group","Managing Partner",["charter-client"]],
  ["Victor","Lindholm",null,"Aircraft Owner (prospect)",["aircraft-owner","prospect"]],
  ["Sophie","Renaud","Renaud Fashion House","CEO",["charter-client","repeat"]],
  ["Miguel","Torres-Alvarado",null,"Charter Prospect",["charter-client","lead"]],
  ["Grace","Ellingson","Ellingson Family Office","Principal",["charter-client"]],
];

const AV_TEAM = [
  { name: "Alex Rivera", email: "alex.rivera@pacificairpartners.com", role: "Director of Operations", type: "W2", schedule: "M–F 7am–6pm PT, on call", startDate: "2024-06-01" },
  { name: "Capt. Diego Fuentes", email: "diego.fuentes@pacificairpartners.com", role: "Chief Pilot / Gulfstream-rated", type: "W2", schedule: "Rotating — per flight schedule", startDate: "2024-08-15" },
  { name: "Capt. Whitney Sharp", email: "whitney.sharp@pacificairpartners.com", role: "Line Captain", type: "W2", schedule: "Rotating — per flight schedule", startDate: "2025-02-10" },
  { name: "FO Marcus Ibe", email: "marcus.ibe@pacificairpartners.com", role: "First Officer", type: "W2", schedule: "Rotating — per flight schedule", startDate: "2026-08-01" },
  { name: "Renee Colby", email: "renee.colby@pacificairpartners.com", role: "Dispatcher / Flight Coordinator", type: "W2", schedule: "M–F 6am–3pm PT", startDate: "2024-11-04" },
  { name: "Hank Osterman", email: "hank.osterman@pacificairpartners.com", role: "Lead A&P Mechanic", type: "1099", schedule: "M–F 7am–4pm PT + on-call AOG", startDate: "2025-05-19" },
];

// ═══════════════════════════════════════════════════════════════════════
// 3. Brokerage / Summit Realty Group — demo-summit-realty
// ═══════════════════════════════════════════════════════════════════════
const RE_TENANT = "demo-summit-realty";
const RE_UID = "demo-brokerage-jordan-001";

const RE_TRANSACTIONS = [
  ["2026-03-05","credit","Commission — 412 Ridgeview Dr closing (listing side, $475K sale)",1425000,"Commission Income"],
  ["2026-03-08","debit","Agent commission split — Marcus Webb (412 Ridgeview Dr)",712500,"Commission Payouts"],
  ["2026-03-12","debit","MLS + CRM software subscription (March)",65000,"Software & Subscriptions"],
  ["2026-03-18","credit","Commission — 88 Elm St closing (buyer side, $327K sale)",980000,"Commission Income"],
  ["2026-03-22","debit","Agent commission split — Priya Nair (88 Elm St)",490000,"Commission Payouts"],
  ["2026-03-27","debit","Listing photography + drone package — 3 new listings",180000,"Marketing & Advertising"],
  ["2026-04-03","credit","Commission — 1290 Harbor View closing (dual agency, $737K sale)",2210000,"Commission Income"],
  ["2026-04-08","debit","Agent commission split — Jordan Blake (1290 Harbor View)",1105000,"Commission Payouts"],
  ["2026-04-14","debit","Office rent — Summit Realty main office (April)",320000,"Office Rent"],
  ["2026-04-19","credit","Commission — 55 Meadowbrook Ln closing (listing side, $380K sale)",1140000,"Commission Income"],
  ["2026-04-24","debit","Agent commission split — Marcus Webb (55 Meadowbrook Ln)",570000,"Commission Payouts"],
  ["2026-04-28","debit","Zillow Premier Agent + Realtor.com featured listings (April)",240000,"Marketing & Advertising"],
  ["2026-05-02","credit","Commission — 902 Sunridge Ct closing (buyer side, $555K sale)",1665000,"Commission Income"],
  ["2026-05-07","debit","Agent commission split — Priya Nair (902 Sunridge Ct)",832500,"Commission Payouts"],
  ["2026-05-13","debit","E&O insurance — quarterly premium",120000,"Insurance"],
  ["2026-05-19","credit","Commission — 217 Birchwood Ave closing (listing side, $435K sale)",1305000,"Commission Income"],
  ["2026-05-25","debit","Agent commission split — Devon Marsh (217 Birchwood Ave)",652500,"Commission Payouts"],
  ["2026-06-01","debit","Office rent (May, late-recorded)",320000,"Office Rent"],
  ["2026-06-06","credit","Commission — 44 Overlook Terrace closing (dual agency, $650K sale)",1950000,"Commission Income"],
  ["2026-06-12","debit","Agent commission split — Jordan Blake (44 Overlook Terrace)",975000,"Commission Payouts"],
  ["2026-06-18","debit","Home staging — 3 active listings",260000,"Marketing & Advertising"],
  ["2026-06-24","credit","Commission — 76 Lakeshore Dr closing (buyer side, $360K sale)",1080000,"Commission Income"],
  ["2026-07-02","debit","Agent commission split — Devon Marsh (76 Lakeshore Dr)",540000,"Commission Payouts"],
  ["2026-07-10","credit","Commission — 1500 Crestline Rd closing (listing side, $830K sale)",2490000,"Commission Income"],
  ["2026-07-16","debit","Agent commission split — Marcus Webb (1500 Crestline Rd)",1245000,"Commission Payouts"],
  ["2026-08-01","debit","Office rent (August)",320000,"Office Rent"],
];

const RE_CAMPAIGNS = [
  { name: "New Listing Blast — 1500 Crestline Rd", channel: "instagram", headline: "Just Listed: stunning 5BR Crestline estate",
    gradient: "linear-gradient(135deg,#f472b6,#be185d)", impressions: 21000, clicks: 940, spend: 600, conversions: 14, revenue: 0, trend: [4,5,6,7,6,8,9] },
  { name: "Open House Weekend — Multi-Listing", channel: "facebook", headline: "4 open houses this Saturday — Summit Realty",
    gradient: "linear-gradient(135deg,#60a5fa,#1d4ed8)", impressions: 15400, clicks: 610, spend: 450, conversions: 38, revenue: 0, trend: [6,8,7,9,10,11,12] },
  { name: "Zillow Premier Agent", channel: "other", headline: "Featured agent placement, Summit Realty Group",
    gradient: "linear-gradient(135deg,#34d399,#047857)", impressions: 62000, clicks: 1860, spend: 2400, conversions: 21, revenue: 285000, trend: [3,4,5,6,7,8,9] },
  { name: "First-Time Homebuyer Seminar", channel: "email", headline: "Free seminar: navigating your first home purchase",
    gradient: "linear-gradient(135deg,#fbbf24,#b45309)", impressions: 3800, clicks: 540, spend: 300, conversions: 44, revenue: 0, trend: [5,6,8,9,11,13,16] },
  { name: "Google Local Services Ads — Realtor", channel: "google", headline: "Top-rated local realtor — Summit Realty Group",
    gradient: "linear-gradient(135deg,#ef4444,#991b1b)", impressions: 18500, clicks: 780, spend: 3100, conversions: 17, revenue: 198000, trend: [2,3,4,5,4,6,7] },
  { name: "Just Sold Social Proof Campaign", channel: "instagram", headline: "Another one sold above asking — see our recent closings",
    gradient: "linear-gradient(135deg,#a78bfa,#6d28d9)", impressions: 27000, clicks: 1120, spend: 500, conversions: 9, revenue: 0, trend: [3,4,3,5,6,5,7] },
];

const RE_STATUS_POOL = [
  ["buyer-lead"], ["seller-lead"], ["past-client","buyer"], ["past-client","seller"], ["active-buyer"], ["active-seller"],
];
const RE_TITLE_POOL = ["Prospective Buyer", "Prospective Seller", "Past Client — Buyer", "Past Client — Seller", "Active Buyer", "Active Seller"];

const RE_TEAM = [
  { name: "Jordan Blake", email: "jordan.blake@summitrealtygroup.com", role: "Principal Broker / Owner", type: "W2", schedule: "M–Sa 8am–7pm", startDate: "2022-04-01" },
  { name: "Marcus Webb", email: "marcus.webb@summitrealtygroup.com", role: "Senior Listing Agent", type: "1099", schedule: "Flexible — client-driven", startDate: "2023-01-15" },
  { name: "Priya Nair", email: "priya.nair@summitrealtygroup.com", role: "Buyer's Agent", type: "1099", schedule: "Flexible — client-driven", startDate: "2023-09-05" },
  { name: "Devon Marsh", email: "devon.marsh@summitrealtygroup.com", role: "Buyer's Agent", type: "1099", schedule: "Flexible — client-driven", startDate: "2024-06-10" },
  { name: "Wanda Ellis", email: "wanda.ellis@summitrealtygroup.com", role: "Transaction Coordinator", type: "W2", schedule: "M–F 9am–5pm", startDate: "2023-03-20" },
  { name: "Theo Sackett", email: "theo.sackett@summitrealtygroup.com", role: "Marketing Coordinator", type: "W2", schedule: "M–F 9am–5pm", startDate: "2024-11-01" },
];

// ═══════════════════════════════════════════════════════════════════════
// 4. Education / Westview Elementary School — demo-westview-education
// ═══════════════════════════════════════════════════════════════════════
const EDU_TENANT = "demo-westview-education";
const EDU_UID = "demo-education-patricia-001";

const EDU_TRANSACTIONS = [
  ["2026-03-03","credit","Tuition — March payment batch (46 families, per-child billing)",1840000,"Tuition Revenue"],
  ["2026-03-09","debit","Payroll — teaching staff (March)",3200000,"Payroll"],
  ["2026-03-14","debit","Classroom supplies — art, science kits (Q1 restock)",210000,"Classroom Supplies"],
  ["2026-03-20","credit","State STEM Enrichment Grant — Q1 disbursement",650000,"Grant Revenue"],
  ["2026-03-26","debit","Facilities rent — Westview campus (March)",480000,"Facilities & Rent"],
  ["2026-04-02","credit","Tuition — April payment batch",1910000,"Tuition Revenue"],
  ["2026-04-08","debit","Payroll — teaching staff (April)",3200000,"Payroll"],
  ["2026-04-13","debit","Field trip — 4th grade science museum (transport + admission)",185000,"Field Trips & Enrichment"],
  ["2026-04-19","credit","Before/after-school care fees (April)",240000,"Extended Care Revenue"],
  ["2026-04-25","debit","Facilities rent (April)",480000,"Facilities & Rent"],
  ["2026-05-01","credit","Tuition — May payment batch",1890000,"Tuition Revenue"],
  ["2026-05-07","debit","Payroll — teaching staff (May, incl. sub coverage)",3250000,"Payroll"],
  ["2026-05-14","debit","Learning management software + student portal (annual renewal)",110000,"Software & Technology"],
  ["2026-05-20","credit","PTA Spring Fundraiser — net proceeds",420000,"Fundraising Revenue"],
  ["2026-05-27","debit","Facilities rent (May)",480000,"Facilities & Rent"],
  ["2026-06-03","credit","Tuition — June payment batch",1960000,"Tuition Revenue"],
  ["2026-06-09","debit","Payroll — teaching staff (June)",3200000,"Payroll"],
  ["2026-06-15","debit","Insurance — general liability + property, June premium",98000,"Insurance"],
  ["2026-06-22","credit","State STEM Enrichment Grant — Q2 disbursement",650000,"Grant Revenue"],
  ["2026-07-08","debit","Summer facilities maintenance — HVAC servicing",260000,"Facilities & Rent"],
  ["2026-07-20","credit","Tuition — Fall 2026 enrollment deposits (early-bird batch)",2130000,"Tuition Revenue"],
  ["2026-08-05","debit","Back-to-school classroom supplies — all grades",140000,"Classroom Supplies"],
];

const EDU_CAMPAIGNS = [
  { name: "Fall 2026 Enrollment — Open House", channel: "facebook", headline: "Tour Westview this Saturday — Fall 2026 enrollment now open",
    gradient: "linear-gradient(135deg,#60a5fa,#2563eb)", impressions: 9800, clicks: 640, spend: 400, conversions: 22, revenue: 0, trend: [3,4,5,6,8,9,11] },
  { name: "Enroll Now for Fall 2026", channel: "google", headline: "Small class sizes, big results — enroll your child today",
    gradient: "linear-gradient(135deg,#f59e0b,#b45309)", impressions: 12400, clicks: 580, spend: 900, conversions: 15, revenue: 0, trend: [2,3,4,3,5,6,7] },
  { name: "Current Family Referral Program", channel: "email", headline: "Refer a family, get a semester of extended care free",
    gradient: "linear-gradient(135deg,#34d399,#047857)", impressions: 1200, clicks: 340, spend: 0, conversions: 8, revenue: 0, trend: [1,2,1,2,3,2,3] },
  { name: "Instagram — A Day at Westview", channel: "instagram", headline: "See what makes Westview different — a day in our classrooms",
    gradient: "linear-gradient(135deg,#f472b6,#be185d)", impressions: 16500, clicks: 720, spend: 300, conversions: 11, revenue: 0, trend: [2,3,4,5,4,6,7] },
  { name: "STEM Enrichment Program Spotlight", channel: "facebook", headline: "State-funded STEM enrichment — free for enrolled families",
    gradient: "linear-gradient(135deg,#a78bfa,#6d28d9)", impressions: 7200, clicks: 410, spend: 150, conversions: 9, revenue: 0, trend: [1,2,2,3,3,4,5] },
];

const EDU_STATUS_POOL = [
  ["inquiry"], ["tour-scheduled"], ["enrolled"], ["waitlist"], ["inquiry","stem-interest"], ["tour-scheduled","fall-2026"],
];
const EDU_GRADES = ["Kindergarten","1st Grade","2nd Grade","3rd Grade","4th Grade","5th Grade"];
const EDU_TITLE_POOL = EDU_GRADES.map(g => `Prospective Parent — ${g}`);

const EDU_TEAM = [
  { name: "Dr. Patricia Wells", email: "patricia.wells@westviewschool.org", role: "Principal", type: "W2", schedule: "M–F 7am–4pm", startDate: "2021-08-01" },
  { name: "Renata Solis", email: "renata.solis@westviewschool.org", role: "Assistant Principal", type: "W2", schedule: "M–F 7am–4pm", startDate: "2022-08-01" },
  { name: "Ben Okafor", email: "ben.okafor@westviewschool.org", role: "4th Grade Teacher", type: "W2", schedule: "M–F 7:30am–3:30pm", startDate: "2023-08-01" },
  { name: "Whitney Cho", email: "whitney.cho@westviewschool.org", role: "2nd Grade Teacher", type: "W2", schedule: "M–F 7:30am–3:30pm", startDate: "2022-08-01" },
  { name: "Marcus Delgado", email: "marcus.delgado@westviewschool.org", role: "Kindergarten Teacher", type: "W2", schedule: "M–F 7:30am–3:30pm", startDate: "2024-08-01" },
  { name: "Fiona Grant", email: "fiona.grant@westviewschool.org", role: "Office Manager / Enrollment Coordinator", type: "W2", schedule: "M–F 7am–4pm", startDate: "2021-08-01" },
];

// ═══════════════════════════════════════════════════════════════════════
// 5. Nursing / UH Mānoa — demo-uh-nursing (transactions + teamMembers ONLY;
//    platform-marketing / platform-contacts are not in this tenant's
//    activeWorkers per PERSONAS["uh-admin"] in index.js, so campaigns and
//    contacts are intentionally skipped, not force-fit.)
// ═══════════════════════════════════════════════════════════════════════
const UH_TENANT = "demo-uh-nursing";
const UH_UID = "demo-uh-admin-001";

const UH_TRANSACTIONS = [
  ["2026-03-05","credit","Tuition — Spring 2026 BSN cohort (58 students, in-state)",14500000,"Tuition Revenue"],
  ["2026-03-10","debit","Faculty payroll — nursing faculty (March)",6800000,"Payroll"],
  ["2026-03-16","debit","Simulation lab supplies — manikin consumables, IV kits",820000,"Simulation Lab Supplies"],
  ["2026-03-24","credit","HRSA Nursing Workforce Diversity Grant — Q1 disbursement",8500000,"Grant Revenue"],
  ["2026-04-02","debit","Faculty payroll (April)",6800000,"Payroll"],
  ["2026-04-09","debit","CCNE accreditation site visit fees + self-study prep",1250000,"Accreditation Fees"],
  ["2026-04-15","credit","Clinical site fees collected — hospital partner cost-share reimbursement",980000,"Clinical Site Revenue"],
  ["2026-04-22","debit","Learning management + simulation software licenses (annual)",410000,"Software & Technology"],
  ["2026-05-01","debit","Faculty payroll (May)",6800000,"Payroll"],
  ["2026-05-08","debit","Clinical placement coordination — travel for site visits",360000,"Clinical Placement Coordination"],
  ["2026-05-14","credit","Tuition — Summer 2026 accelerated cohort (61 students)",15200000,"Tuition Revenue"],
  ["2026-05-20","debit","Simulation lab equipment maintenance + calibration",680000,"Simulation Lab Supplies"],
  ["2026-06-02","debit","Faculty payroll (June, incl. summer session overload pay)",6850000,"Payroll"],
  ["2026-06-10","credit","HRSA Nursing Workforce Diversity Grant — Q2 disbursement",8500000,"Grant Revenue"],
  ["2026-06-18","debit","Clinical placement coordination (June)",520000,"Clinical Placement Coordination"],
  ["2026-07-01","debit","Faculty payroll (July)",6800000,"Payroll"],
  ["2026-07-12","credit","Clinical site fees collected — Q2 batch",1140000,"Clinical Site Revenue"],
  ["2026-07-20","debit","Simulation lab supplies restock",290000,"Simulation Lab Supplies"],
  ["2026-08-01","debit","Faculty payroll (August)",6800000,"Payroll"],
  ["2026-08-10","credit","Tuition — Fall 2026 BSN cohort deposits (early enrollment)",15850000,"Tuition Revenue"],
];

const UH_TEAM = [
  { name: "Dr. Noa Kahananui", email: "nkahananui@hawaii.edu", role: "Program Director / Professor", type: "W2", schedule: "M–F 8am–5pm HT", startDate: "2019-08-01" },
  { name: "Dr. Leilani Akana", email: "lakana@hawaii.edu", role: "Associate Professor, OB/Maternal-Child Health", type: "W2", schedule: "M–F 8am–5pm HT", startDate: "2021-01-10" },
  { name: "Dr. Keoni Fonoti", email: "kfonoti@hawaii.edu", role: "Assistant Professor, Microbiology & Pathophysiology", type: "W2", schedule: "M–F 8am–5pm HT", startDate: "2022-08-15" },
  { name: "Malia Kahale", email: "mkahale@hawaii.edu", role: "Clinical Placement Coordinator", type: "W2", schedule: "M–F 8am–5pm HT", startDate: "2020-06-01" },
  { name: "Dr. Sarah Yim", email: "syim@hawaii.edu", role: "Simulation Lab Director / Clinical Instructor", type: "W2", schedule: "M–F 8am–5pm HT", startDate: "2023-01-09" },
];

// ─────────────────────────────────────────────────────────────────────────
// Runner helpers
// ─────────────────────────────────────────────────────────────────────────
async function clearDemo(colRef, tenantId) {
  // CRITICAL: must scope by tenantId. Without it, this wipes every demo:true
  // record in the collection across EVERY tenant on the platform, not just
  // the one being reseeded — this exact bug caused a real data-loss incident
  // (2026-08-20) that wiped Title/RE/Meadow-Creek's pre-existing good demo
  // data every time this script ran for an unrelated tenant.
  if (!tenantId) throw new Error("clearDemo: tenantId is required");
  const snap = await colRef.where("tenantId", "==", tenantId).where("demo", "==", true).get();
  if (snap.empty) return 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

function buildTx(tenant, rows) {
  return rows.map(([date, direction, description, amountCents, coaCategory]) => ({
    tenantId: tenant, demo: true, source: "demo-seed",
    date, direction, description, amountCents,
    classification: direction === "credit" ? "revenue" : "expense",
    coaCategory, status: "posted", createdAt: now(),
  }));
}

function buildCampaigns(tenant, rows) {
  return rows.map(c => ({ tenantId: tenant, demo: true, status: "active", ...c, createdAt: now() }));
}

function buildNamedContacts(tenant, rows, { emailDomain }) {
  return rows.map(([first, last, company, title, segments]) => ({
    tenantId: tenant, demo: true, status: "active",
    name: `${first} ${last}`, first_name: first, last_name: last,
    email: company
      ? `${first}.${last}@${(company.toLowerCase().replace(/[^a-z0-9]+/g, "") || "company")}.${emailDomain}`
      : `${first}.${last}@gmail.com`,
    phone: null, company: company || null, title: title || null,
    segments, type: segments.some(s => ["client","past-client","enrolled","repeat"].includes(s)) ? "customer" : "lead",
    source: "demo-seed", createdAt: now(),
  }));
}

function buildTeam(tenant, uid, rows) {
  return rows.map(p => ({
    ...p, tenantId: tenant, ownerUid: uid, demo: true, status: "active", timeOff: [],
    created_at: now(), created_by: "seed_script",
  }));
}

async function seedCollection(colRef, docs, label) {
  if (!docs.length) { console.log(`  • ${label}: skipped (no docs)`); return; }
  const tenantId = docs[0].tenantId;
  if (!tenantId) throw new Error(`seedCollection: docs for "${label}" are missing tenantId`);
  const cleared = await clearDemo(colRef, tenantId);
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach(d => batch.set(colRef.doc(), d));
    await batch.commit();
  }
  console.log(`  • ${label}: cleared ${cleared} (tenant-scoped), wrote ${docs.length}`);
}

(async () => {
  console.log("═══ seedSpineCanvasDemo.js — spine-worker canvas data for 5 demo tenants ═══");

  console.log(`\n═══ DPP / Volta Advisory (${DPP_TENANT}) ═══`);
  await seedCollection(db.collection("transactions"), buildTx(DPP_TENANT, DPP_TRANSACTIONS), "transactions");
  await seedCollection(db.collection("campaigns"), buildCampaigns(DPP_TENANT, DPP_CAMPAIGNS), "campaigns");
  await seedCollection(db.collection("contacts"), buildNamedContacts(DPP_TENANT, DPP_CONTACTS, { emailDomain: "com" }), "contacts");
  await seedCollection(db.collection("tenants").doc(DPP_TENANT).collection("teamMembers"), buildTeam(DPP_TENANT, DPP_UID, DPP_TEAM), "teamMembers");

  console.log(`\n═══ Aviation / Pacific Air Partners (${AV_TENANT}) ═══`);
  await seedCollection(db.collection("transactions"), buildTx(AV_TENANT, AV_TRANSACTIONS), "transactions");
  await seedCollection(db.collection("campaigns"), buildCampaigns(AV_TENANT, AV_CAMPAIGNS), "campaigns");
  await seedCollection(db.collection("contacts"), buildNamedContacts(AV_TENANT, AV_CONTACTS, { emailDomain: "com" }), "contacts");
  await seedCollection(db.collection("tenants").doc(AV_TENANT).collection("teamMembers"), buildTeam(AV_TENANT, AV_UID, AV_TEAM), "teamMembers");

  const reContacts = genContacts({
    tenant: RE_TENANT, total: 26, segmentPool: RE_STATUS_POOL, titlePool: RE_TITLE_POOL,
    companyFn: () => null, emailDomain: "gmail.com",
  });
  const eduContacts = genContacts({
    tenant: EDU_TENANT, total: 24, segmentPool: EDU_STATUS_POOL, titlePool: EDU_TITLE_POOL,
    companyFn: () => null, emailDomain: "gmail.com",
  });

  console.log(`\n═══ Brokerage / Summit Realty Group (${RE_TENANT}) ═══`);
  await seedCollection(db.collection("transactions"), buildTx(RE_TENANT, RE_TRANSACTIONS), "transactions");
  await seedCollection(db.collection("campaigns"), buildCampaigns(RE_TENANT, RE_CAMPAIGNS), "campaigns");
  await seedCollection(db.collection("contacts"), reContacts, "contacts");
  await seedCollection(db.collection("tenants").doc(RE_TENANT).collection("teamMembers"), buildTeam(RE_TENANT, RE_UID, RE_TEAM), "teamMembers");

  console.log(`\n═══ Education / Westview Elementary School (${EDU_TENANT}) ═══`);
  await seedCollection(db.collection("transactions"), buildTx(EDU_TENANT, EDU_TRANSACTIONS), "transactions");
  await seedCollection(db.collection("campaigns"), buildCampaigns(EDU_TENANT, EDU_CAMPAIGNS), "campaigns");
  await seedCollection(db.collection("contacts"), eduContacts, "contacts");
  await seedCollection(db.collection("tenants").doc(EDU_TENANT).collection("teamMembers"), buildTeam(EDU_TENANT, EDU_UID, EDU_TEAM), "teamMembers");

  console.log(`\n═══ Nursing / UH Mānoa (${UH_TENANT}) — transactions + teamMembers only ═══`);
  await seedCollection(db.collection("transactions"), buildTx(UH_TENANT, UH_TRANSACTIONS), "transactions");
  await seedCollection(db.collection("tenants").doc(UH_TENANT).collection("teamMembers"), buildTeam(UH_TENANT, UH_UID, UH_TEAM), "teamMembers");
  console.log("  • campaigns: SKIPPED (platform-marketing not in activeWorkers for demo-uh-nursing)");
  console.log("  • contacts: SKIPPED (platform-contacts not in activeWorkers for demo-uh-nursing)");

  console.log("\n═══ demo-makai-nursing: NOT TOUCHED ═══");
  console.log("  activeWorkers identical to UH Mānoa (nursing-education-001/nursing-micro-001/nursing-ob-001 only,");
  console.log("  no platform-* spine workers). Already has 90 real transactions. No new records written.");

  console.log("\n═══ Seed complete ═══");
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
