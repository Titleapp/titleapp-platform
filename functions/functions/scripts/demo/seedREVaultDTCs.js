// Seed RE demo Vault with the full Merritt Capital Group asset portfolio.
// Writes to tenantId:"vault" + userId:RE_DEMO_UID.
// Idempotent — clears prior demo:true DTCs and logbook entries first.
//
// Run from functions/functions/:  node scripts/demo/seedREVaultDTCs.js
"use strict";
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";

// type → Vault pillar:
//   property / vehicle / equipment               → My Stuff
//   bank_account / investment_account / liability → My Money
//   training_record / degree / education_record  → My Education
//   medical_certificate / medical_record         → My Health

const DTCS = [
  // ════════════════════════════════════════════════════════════════
  // BUILDINGS — 3 properties, Merritt Capital Group LLC
  // ════════════════════════════════════════════════════════════════
  {
    type: "property",
    title: "Meridian at Flamingo — 4525 Dean Martin Dr, Las Vegas NV 89103",
    valueUsd: 12_400_000,
    description: "32-unit luxury HOA condominium. Developer retains 9 units for resale / investment. HOA board seat held by Merritt Capital Group.",
    tags: ["las-vegas", "hoa", "meridian"],
  },
  {
    type: "property",
    title: "Creekwood Commons — 2901 Riverside Blvd, Sacramento CA 95818",
    valueUsd: 27_800_000,
    description: "148-unit Class B multifamily — fee-simple ownership. Managed by Merritt Property Group LLC. Conventional 30-yr mortgage at 5.25%.",
    tags: ["sacramento", "multifamily", "creekwood"],
    nextDue: "2026-08-14", // REAP inspection
  },
  {
    type: "property",
    title: "Domain Point — 300 W 6th St, Austin TX 78701",
    valueUsd: 4_200_000,
    description: "8-floor mixed-use development — active construction (70% complete). Land + entitlements owned. Construction loan: $7.2M First National. Completion Q1 2027.",
    tags: ["austin", "mixed-use", "construction", "domain-point"],
  },

  // ════════════════════════════════════════════════════════════════
  // MERIDIAN AT FLAMINGO — individual units
  // ════════════════════════════════════════════════════════════════
  // Developer-owned (for sale or holding)
  {
    type: "property",
    title: "Meridian Unit 704 — 4525 Dean Martin Dr #704, Las Vegas NV",
    valueUsd: 875_000,
    description: "2BR/2BA, 1,080 sq ft. Developer-owned. Active listing $875K. Offer in negotiation — James Smith, $840K counter, close target Aug 30. Commission 2.5%.",
    tags: ["meridian", "unit-704", "listing-active"],
  },
  {
    type: "property",
    title: "Meridian Unit 512 — 4525 Dean Martin Dr #512, Las Vegas NV",
    valueUsd: 695_000,
    description: "1BR/1BA, 740 sq ft. Developer-owned. Active listing $695K. Day 28 on market, no offers. CMA supports $675K — price reduction pending decision.",
    tags: ["meridian", "unit-512", "listing-active"],
    nextDue: "2026-07-14", // price decision deadline
  },
  {
    type: "property",
    title: "Meridian Unit 218 — 4525 Dean Martin Dr #218, Las Vegas NV",
    valueUsd: 459_000,
    description: "Studio, 520 sq ft. Developer-owned. Coming soon — Aug 1 list date. Pre-market buyer list campaign scheduled.",
    tags: ["meridian", "unit-218", "pre-market"],
  },
  {
    type: "property",
    title: "Meridian Unit 302 — 4525 Dean Martin Dr #302, Las Vegas NV",
    valueUsd: 680_000,
    description: "1BR/1BA, 780 sq ft. Developer-owned. Occupied — short-term lease through Sep 30. Listing prep scheduled Oct 1.",
    tags: ["meridian", "unit-302"],
  },
  {
    type: "property",
    title: "Meridian Unit 408 — 4525 Dean Martin Dr #408, Las Vegas NV",
    valueUsd: 890_000,
    description: "2BR/2BA, 1,140 sq ft corner unit. Developer-owned. Held for appreciation — no current listing. High-floor strip views.",
    tags: ["meridian", "unit-408"],
  },
  // Sold to individual owners — still in Vault as disposition records
  {
    type: "property",
    title: "Meridian Unit 101 — SOLD — Garcia / $612,000",
    valueUsd: 0,
    description: "Sold July 2024 to Carlos Garcia for $612,000. Deed recorded Clark County. Commission $15,300 posted to accounting. HOA membership transferred.",
    tags: ["meridian", "unit-101", "sold"],
  },
  {
    type: "property",
    title: "Meridian Unit 205 — SOLD — Wong / $841,000",
    valueUsd: 0,
    description: "Sold Nov 2024 to Jennifer Wong for $841,000. Closed escrow. Commission $21,025 posted. Buyer assumed HOA obligations.",
    tags: ["meridian", "unit-205", "sold"],
  },
  {
    type: "property",
    title: "Meridian Unit 319 — SOLD — Okafor / $657,000",
    valueUsd: 0,
    description: "Sold Jan 2025 to Emeka Okafor for $657,000. All-cash closing. Commission $16,425 posted.",
    tags: ["meridian", "unit-319", "sold"],
  },
  {
    type: "property",
    title: "Meridian Unit 416 — SOLD — Chen / $872,500",
    valueUsd: 0,
    description: "Sold Mar 2025 to David & Lisa Chen for $872,500. VA loan closing. Commission $21,812 posted.",
    tags: ["meridian", "unit-416", "sold"],
  },

  // ════════════════════════════════════════════════════════════════
  // CREEKWOOD COMMONS — select unit records (rental portfolio)
  // ════════════════════════════════════════════════════════════════
  {
    type: "property",
    title: "Creekwood Unit 116 — 2901 Riverside #116, Sacramento CA (Vacant)",
    valueUsd: 0,
    description: "1BR/1BA. Vacated June 1. On market $1,840/mo — Google Search + Apartments.com. Showing July 9. 1 application in review.",
    tags: ["creekwood", "unit-116", "vacant"],
  },
  {
    type: "property",
    title: "Creekwood Unit 214 — 2901 Riverside #214, Sacramento CA",
    valueUsd: 0,
    description: "2BR/2BA. Occupied — lease through Jan 31. Open MX ticket: HVAC not cooling, Day 4. CA Civil Code 1941 habitability obligation active.",
    tags: ["creekwood", "unit-214", "mx-open"],
    nextDue: "2026-07-10", // resolution SLA
  },
  {
    type: "property",
    title: "Creekwood Unit 308 — 2901 Riverside #308, Sacramento CA",
    valueUsd: 0,
    description: "2BR/2BA. Occupied — lease through Oct 31. Open MX ticket: roof leak, interior ceiling stain. Exterior contractor quote pending. Mold risk >72hr mark.",
    tags: ["creekwood", "unit-308", "mx-open"],
    nextDue: "2026-08-14", // REAP inspection
  },
  {
    type: "property",
    title: "Creekwood Unit 512 — 2901 Riverside #512, Sacramento CA",
    valueUsd: 0,
    description: "2BR/2BA. Occupied. Open MX: refrigerator compressor failure. Replacement ordered — ETA July 11.",
    tags: ["creekwood", "unit-512", "mx-open"],
    nextDue: "2026-07-11",
  },

  // ════════════════════════════════════════════════════════════════
  // DOMAIN POINT — pre-construction unit records
  // ════════════════════════════════════════════════════════════════
  {
    type: "property",
    title: "Domain Point Floor 1 — Ground Retail (3 bays, 4,000 sq ft)",
    valueUsd: 0,
    description: "NNN retail shell — marketing to national QSR + local F&B. LOI received from Torchy's Tacos (1,500 sq ft). Completion Q1 2027. Pre-lease rate $52/sq ft NNN.",
    tags: ["domain-point", "retail", "pre-lease"],
  },
  {
    type: "property",
    title: "Domain Point Floors 2–4 — 18 Residential Units (under construction)",
    valueUsd: 0,
    description: "18 residential units, 700–1,100 sq ft. Presale pricing TBD — awaiting certificate of occupancy. Targeting $2,400–$2,900/unit/mo rental or $480K–$650K sale.",
    tags: ["domain-point", "residential", "under-construction"],
  },
  {
    type: "property",
    title: "Domain Point Floors 5–8 — 24 Premium Units (under construction)",
    valueUsd: 0,
    description: "24 premium residential units, 1,000–1,400 sq ft. Penthouse floor 8 = 4 units at $850K+ presale target. City skyline views.",
    tags: ["domain-point", "premium-residential", "under-construction"],
  },

  // ════════════════════════════════════════════════════════════════
  // VEHICLES — 4 per property × 3 properties = 12 vehicles
  // All type="vehicle" → My Stuff tile
  // ════════════════════════════════════════════════════════════════
  // Meridian at Flamingo (Las Vegas)
  {
    type: "vehicle",
    title: "2024 Ford F-150 — Meridian MX Truck #1 · Nevada 7A4B21",
    valueUsd: 38_500,
    description: "Merritt Property Group fleet. Unit: Meridian at Flamingo MX crew. GVWR 6,700 lbs. Registered NV. Annual DMV renewal due Feb 2027.",
    tags: ["meridian", "vehicle", "truck"],
    nextDue: "2027-02-28",
  },
  {
    type: "vehicle",
    title: "2023 Ford F-150 — Meridian MX Truck #2 · Nevada 8C3F44",
    valueUsd: 34_200,
    description: "Merritt Property Group fleet. Unit: Meridian at Flamingo MX crew. 2023 model. 28,400 miles. Renewal due Sep 2026.",
    tags: ["meridian", "vehicle", "truck"],
    nextDue: "2026-09-30",
  },
  {
    type: "vehicle",
    title: "2024 Ford Transit Cargo Van — Meridian · Nevada 2K9L77",
    valueUsd: 42_000,
    description: "High-roof Transit 350. Outfitted for MX tool storage and appliance hauling. Annual inspection due Nov 2026.",
    tags: ["meridian", "vehicle", "van"],
    nextDue: "2026-11-15",
  },
  {
    type: "vehicle",
    title: "2023 Club Car Onward — Meridian Golf Cart · Serial MCG-8841",
    valueUsd: 9_800,
    description: "Electric 48V. Garage-charged. Used for on-site MX runs + property tours. Annual service due Oct 2026.",
    tags: ["meridian", "vehicle", "golf-cart"],
    nextDue: "2026-10-01",
  },
  // Creekwood Commons (Sacramento)
  {
    type: "vehicle",
    title: "2024 Ford F-150 — Creekwood MX Truck #1 · California 8BKT412",
    valueUsd: 39_100,
    description: "Merritt Property Group fleet. Unit: Creekwood Commons MX crew. CA registered. Smog check due Jun 2027.",
    tags: ["creekwood", "vehicle", "truck"],
    nextDue: "2027-06-30",
  },
  {
    type: "vehicle",
    title: "2022 Ford F-150 — Creekwood MX Truck #2 · California 7XRN884",
    valueUsd: 31_000,
    description: "2022 model. 41,200 miles. Assigned Ray Estevez (lead MX tech). CA registration due Mar 2027.",
    tags: ["creekwood", "vehicle", "truck"],
    nextDue: "2027-03-31",
  },
  {
    type: "vehicle",
    title: "2023 Ford Transit Cargo Van — Creekwood · California 3PBL221",
    valueUsd: 40_500,
    description: "Mid-roof Transit 250. MX crew transport + supply hauling. HVAC replacement route vehicle. CA smog Feb 2027.",
    tags: ["creekwood", "vehicle", "van"],
    nextDue: "2027-02-28",
  },
  {
    type: "vehicle",
    title: "2022 Club Car Tempo — Creekwood Golf Cart · Serial CRW-5540",
    valueUsd: 8_400,
    description: "Electric. Covered parking near leasing office. Leasing agent and MX quick-runs. Annual service past due — schedule July.",
    tags: ["creekwood", "vehicle", "golf-cart"],
    nextDue: "2026-07-31",
  },
  // Domain Point (Austin)
  {
    type: "vehicle",
    title: "2025 Ford F-150 — Domain Point Site Truck #1 · Texas 47BK229",
    valueUsd: 44_200,
    description: "Construction site fleet. Domain Point Austin. New 2025 model, 3,100 miles. TX registration due Dec 2026.",
    tags: ["domain-point", "vehicle", "truck"],
    nextDue: "2026-12-31",
  },
  {
    type: "vehicle",
    title: "2024 Ford F-150 — Domain Point Site Truck #2 · Texas 39MT661",
    valueUsd: 38_000,
    description: "Site crew. Derek Cho (project lead) assigned. TX registration due Aug 2026.",
    tags: ["domain-point", "vehicle", "truck"],
    nextDue: "2026-08-31",
  },
  {
    type: "vehicle",
    title: "2024 Ford Transit Cargo Van — Domain Point · Texas 51GH774",
    valueUsd: 42_500,
    description: "High-roof Transit 350. Construction site materials + tools. TX inspection due Jan 2027.",
    tags: ["domain-point", "vehicle", "van"],
    nextDue: "2027-01-31",
  },
  {
    type: "vehicle",
    title: "2024 Club Car Onward — Domain Point Site Cart · Serial DPT-7723",
    valueUsd: 10_200,
    description: "Gas-powered (site has no reliable charge points during construction). Site visitor tours + parcel runs. Annual service due Sep 2026.",
    tags: ["domain-point", "vehicle", "golf-cart"],
    nextDue: "2026-09-30",
  },

  // ════════════════════════════════════════════════════════════════
  // BANK ACCOUNTS — operating + holding/reserve per property = 6
  // type="bank_account" → My Money pillar
  // ════════════════════════════════════════════════════════════════
  // Meridian at Flamingo accounts
  {
    type: "bank_account",
    title: "Meridian Operating — Wells Fargo ····3841",
    valueUsd: 142_600,
    description: "Primary operating account — Meridian at Flamingo LLC. Jul 2026 balance. HOA fee collections in. Monthly expenses: landscaping $2,800, insurance $1,900, utilities $3,400. Outstanding payable: Keller Williams commission holdback $8,500 (released at 704 close).",
    tags: ["meridian", "bank", "operating"],
  },
  {
    type: "bank_account",
    title: "Meridian Capital Reserve — Wells Fargo ····4902",
    valueUsd: 88_200,
    description: "HOA reserve fund (Meridian at Flamingo LLC). Per-unit reserve assessment $220/mo. Funded 71% of 10-year reserve study. Projected shortfall: elevator modernization 2028 ($120K). 3-month reserve target: $95,400.",
    tags: ["meridian", "bank", "reserve"],
  },
  // Creekwood Commons accounts
  {
    type: "bank_account",
    title: "Creekwood Operating — US Bank ····7714",
    valueUsd: 312_800,
    description: "Primary operating account — Creekwood Commons LLC. Rent roll deposits: $261,280/mo. Monthly expenses: payroll $38,000, maintenance vendors $22,000, utilities $9,200, insurance $4,100, mortgage $87,400. Accounts payable: CoolAir HVAC invoice $3,200 (pending).",
    tags: ["creekwood", "bank", "operating"],
  },
  {
    type: "bank_account",
    title: "Creekwood Capital Reserve — US Bank ····8830",
    valueUsd: 224_500,
    description: "Property reserves — Creekwood Commons LLC. Capital replacement planning: roof (2029 $180K), elevator (2031 $95K), common area HVAC (2027 $42K). Receivable: REAP violation credit from city ($1,800 pending Aug 14 inspection).",
    tags: ["creekwood", "bank", "reserve"],
  },
  // Domain Point accounts
  {
    type: "bank_account",
    title: "Domain Point Construction Draw — First National ····2219",
    valueUsd: 1_840_000,
    description: "Construction draw account — Domain Point LLC. Total construction loan: $7.2M. Draws to date: $5.36M. Current draw balance $1.84M available. July 30 capital call ($380K) will fund MEP completion + exterior finishes. Next draw request: Aug 15.",
    tags: ["domain-point", "bank", "construction-draw"],
    nextDue: "2026-07-30", // capital call
  },
  {
    type: "bank_account",
    title: "Domain Point Operating — First National ····3391",
    valueUsd: 218_400,
    description: "Operating account — Domain Point LLC. Covers GC monthly billings, permit fees, soft costs. Outstanding payables: Westbrook GC $142,000 (Aug 1 payment), civil engineer $18,500, city impact fees $24,000. LP capital calls flow through this account.",
    tags: ["domain-point", "bank", "operating"],
  },

  // ════════════════════════════════════════════════════════════════
  // LICENSES + COMPLIANCE — Merritt Property Group, LLC (brokerage)
  // type="training_record" → My Education
  // ════════════════════════════════════════════════════════════════
  {
    type: "training_record",
    title: "Nevada Real Estate Broker License — Dana Reyes",
    expires: "2026-09-30",
    description: "NV Broker License #B.1004881. Merritt Property Group LLC designated broker. 36 CE credits due by renewal. 22 credits completed.",
    tags: ["license", "nevada", "broker"],
    nextDue: "2026-09-30",
  },
  {
    type: "training_record",
    title: "California Broker License — Merritt Property Group LLC",
    expires: "2027-01-31",
    description: "CA DRE Corp License #02148320. Managing broker: Scott Harrington. Entity renewal due Jan 2027. 45-hr CE cycle required.",
    tags: ["license", "california", "broker"],
    nextDue: "2027-01-31",
  },
  {
    type: "training_record",
    title: "Texas Real Estate Broker License — Scott Harrington",
    expires: "2027-03-31",
    description: "TX TREC Broker #594402. 18 CE hours required per cycle. 14 hours completed. Domain Point project requires active TX license.",
    tags: ["license", "texas", "broker"],
    nextDue: "2027-03-31",
  },
  {
    type: "training_record",
    title: "Fair Housing Certification — all agents (annual)",
    expires: "2026-12-31",
    description: "Annual fair housing training — all licensed agents in Merritt Property Group. 5 agents certified through July 2026. Renewal cycle Dec 31.",
    tags: ["compliance", "fair-housing"],
    nextDue: "2026-12-31",
  },
  {
    type: "training_record",
    title: "E&O Insurance — Merritt Property Group LLC",
    expires: "2026-11-30",
    description: "Errors & Omissions policy #EPO-2248871. $1M per claim / $3M aggregate. Carrier: Victor O'Schinnerer. Premium $4,800/yr. Renewal due Nov 30.",
    tags: ["insurance", "e-and-o"],
    nextDue: "2026-11-30",
  },
];

(async () => {
  // Clear prior RE demo Vault DTCs
  const prior = await db.collection("dtcs")
    .where("userId", "==", RE_DEMO_UID)
    .where("tenantId", "==", "vault")
    .where("demo", "==", true)
    .get();
  if (!prior.empty) {
    const b = db.batch();
    for (const d of prior.docs) {
      const ev = await db.collection("logbookEntries").where("dtcId", "==", d.id).get();
      ev.forEach((e) => b.delete(e.ref));
      b.delete(d.ref);
    }
    await b.commit();
    console.log(`cleared ${prior.size} prior RE demo Vault DTCs`);
  }

  let netWorth = 0;
  let attention = 0;
  const batch = db.batch();

  for (const item of DTCS) {
    const { type, title, valueUsd, expires, nextDue, description, tags } = item;
    if (typeof valueUsd === "number") {
      netWorth += type === "liability" ? -valueUsd : valueUsd;
    }
    if (expires || nextDue) attention++;

    const ref = db.collection("dtcs").doc();
    const metadata = { title };
    if (typeof valueUsd === "number") metadata.valueUsd = valueUsd;
    if (expires) metadata.expires = expires;
    if (nextDue) metadata.nextDue = nextDue;
    if (type === "liability") metadata.liability = true;
    if (description) metadata.description = description;
    if (tags) metadata.tags = tags;

    batch.set(ref, {
      userId: RE_DEMO_UID,
      tenantId: "vault",
      demo: true,
      type,
      metadata,
      logbookCount: 1,
      modification_authority: "owner_only",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.set(db.collection("logbookEntries").doc(), {
      dtcId: ref.id,
      userId: RE_DEMO_UID,
      tenantId: "vault",
      demo: true,
      entryType: "created",
      dtcTitle: title,
      data: { note: description || "Added to Vault" },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  const vehicles   = DTCS.filter((d) => d.type === "vehicle").length;
  const properties = DTCS.filter((d) => d.type === "property").length;
  const accounts   = DTCS.filter((d) => d.type === "bank_account").length;
  const licenses   = DTCS.filter((d) => d.type === "training_record").length;

  console.log(`\n✓ Seeded ${DTCS.length} RE demo Vault DTCs for Merritt Capital Group`);
  console.log(`  ${properties} properties (buildings + units)  |  ${vehicles} vehicles  |  ${accounts} bank accounts  |  ${licenses} licenses/compliance`);
  console.log(`  Net asset value ≈ $${netWorth.toLocaleString()}`);
  console.log(`  ${attention} items with upcoming deadlines`);
  console.log(`\n  Key deadlines to show in demo:`);
  console.log(`    · Creekwood Unit 214 — HVAC SLA closes July 10`);
  console.log(`    · Domain Point capital call — $380K due July 30`);
  console.log(`    · Creekwood Unit 512 — price decision by July 14`);
  console.log(`    · Creekwood golf cart service — past due (July 31)`);
  console.log(`    · Nevada broker license renewal — Sep 30`);
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message, e.stack);
  process.exit(1);
});
