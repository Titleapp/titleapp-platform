// Seed the Title demo workspace (ABC Title Company / Attorneys Title Henderson County TX).
// Populates: HR staff, accounting transactions, marketing referral partners, contacts,
// 3 active title orders, Vault DTCs, and Drive file metadata.
//
// Idempotent — clears all demo:true records before writing.
//
// Run from functions/functions/:
//   node scripts/demo/seedTitleDemo.js
"use strict";

const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TITLE_UID    = "demo-title-admin-001";
const TITLE_TENANT = "demo-attorneys-title-001";

const now = () => admin.firestore.FieldValue.serverTimestamp();
const isoDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

// ─── 1. HR — 7-person title company staff ────────────────────────────────────

const STAFF = [
  {
    name: "Sarah Garris",
    email: "title-demo@sociii.ai",
    role: "Title Officer",
    type: "W2",
    status: "active",
    note: "Demo user — principal title officer. Licensed TX. 18 years Henderson County closings.",
    demo: true,
  },
  {
    name: "Jennifer Tate",
    email: "jennifer.tate@abctitleco.com",
    role: "Title Closer",
    type: "W2",
    status: "active",
    note: "Lead closer — handles all residential purchase and refinance closings. Bilingual (Spanish).",
    demo: true,
  },
  {
    name: "Marcus Webb",
    email: "marcus.webb@abctitleco.com",
    role: "Title Examiner",
    type: "W2",
    status: "active",
    note: "Chain-of-title specialist. Henderson County abstract library access. 3 active orders in exam.",
    demo: true,
  },
  {
    name: "Deborah Sandoval",
    email: "deborah.sandoval@abctitleco.com",
    role: "Office Manager",
    type: "W2",
    status: "active",
    note: "Manages scheduling, recording, disbursements. Notary public commission TX-2024-38891.",
    demo: true,
  },
  {
    name: "Tom Garris",
    email: "tgarris@garrishorn.com",
    role: "Real Estate Attorney",
    type: "1099",
    status: "active",
    note: "Garris Horn LLP — curative title work, lien releases, quiet title actions. On retainer.",
    demo: true,
  },
  {
    name: "Rachel Pierce",
    email: "rachel.pierce@abctitleco.com",
    role: "Referral Coordinator",
    type: "W2",
    status: "active",
    note: "Manages agent and lender referral relationships. Tracks order pipeline from referral to close.",
    demo: true,
  },
  {
    name: "Luis Fuentes",
    email: "luis.fuentes@abctitleco.com",
    role: "Title Processor",
    type: "W2",
    status: "active",
    note: "Order intake, ATTOM pulls, lien search coordination. New hire — 90-day review Aug 31.",
    demo: true,
  },
];

// ─── 2. Accounting transactions ───────────────────────────────────────────────

const tx = (o) => ({
  tenantId: TITLE_TENANT,
  ownerUid: TITLE_UID,
  source: "import_prebuilt",
  status: "posted",
  reconciled: true,
  demo: true,
  createdAt: now(),
  ...o,
});

const TRANSACTIONS = [
  // Revenue — closed orders this quarter
  tx({
    id: "title_rev_001",
    date: isoDate(42),
    description: "Title Premium — Owner's Policy: 114 Elm Creek Rd, Athens TX (closed May 16)",
    type: "credit", amount: 1_247_00, category: "title_premium",
    coaAccountId: "revenue_title_premium",
  }),
  tx({
    id: "title_rev_002",
    date: isoDate(42),
    description: "Title Premium — Lender's Policy: 114 Elm Creek Rd, Athens TX",
    type: "credit", amount: 428_00, category: "title_premium",
    coaAccountId: "revenue_title_premium",
  }),
  tx({
    id: "title_rev_003",
    date: isoDate(42),
    description: "Settlement / Closing Fee: 114 Elm Creek Rd, Athens TX",
    type: "credit", amount: 350_00, category: "closing_fee",
    coaAccountId: "revenue_closing_fees",
  }),
  tx({
    id: "title_rev_004",
    date: isoDate(35),
    description: "Title Premium — Owner's Policy: 8821 Lake Palestine Rd, Athens TX (closed May 23)",
    type: "credit", amount: 963_00, category: "title_premium",
    coaAccountId: "revenue_title_premium",
  }),
  tx({
    id: "title_rev_005",
    date: isoDate(35),
    description: "Settlement / Closing Fee: 8821 Lake Palestine Rd, Athens TX",
    type: "credit", amount: 350_00, category: "closing_fee",
    coaAccountId: "revenue_closing_fees",
  }),
  tx({
    id: "title_rev_006",
    date: isoDate(18),
    description: "Title Search Fee — Cash Close: 1422 Oak Ridge Ln, Athens TX (search complete Jun 9)",
    type: "credit", amount: 225_00, category: "title_search_fee",
    coaAccountId: "revenue_search_fees",
  }),
  tx({
    id: "title_rev_007",
    date: isoDate(7),
    description: "Title Search Fee — Pending Close: 313 Mayfair Dr, Athens TX",
    type: "credit", amount: 225_00, category: "title_search_fee",
    coaAccountId: "revenue_search_fees",
  }),
  // Expenses — monthly operating
  tx({
    id: "title_exp_eo_jun",
    date: isoDate(28),
    description: "E&O Insurance Premium — June 2026 (Stewart Title Guaranty)",
    type: "debit", amount: 412_00, category: "insurance",
    coaAccountId: "expense_insurance",
  }),
  tx({
    id: "title_exp_eo_jul",
    date: isoDate(1),
    description: "E&O Insurance Premium — July 2026 (Stewart Title Guaranty)",
    type: "debit", amount: 412_00, category: "insurance",
    coaAccountId: "expense_insurance",
  }),
  tx({
    id: "title_exp_rent_jun",
    date: isoDate(28),
    description: "Office Rent — 204 Prairie St Suite 2, Athens TX — June 2026",
    type: "debit", amount: 1_650_00, category: "rent",
    coaAccountId: "expense_rent",
  }),
  tx({
    id: "title_exp_rent_jul",
    date: isoDate(1),
    description: "Office Rent — 204 Prairie St Suite 2, Athens TX — July 2026",
    type: "debit", amount: 1_650_00, category: "rent",
    coaAccountId: "expense_rent",
  }),
  tx({
    id: "title_exp_underwriting_may",
    date: isoDate(43),
    description: "Underwriting / Reinsurance Premium — May 2026 remittance (Stewart)",
    type: "debit", amount: 684_00, category: "underwriting_remittance",
    coaAccountId: "expense_underwriting",
  }),
  tx({
    id: "title_exp_underwriting_jun",
    date: isoDate(15),
    description: "Underwriting / Reinsurance Premium — June 2026 remittance (Stewart)",
    type: "debit", amount: 341_00, category: "underwriting_remittance",
    coaAccountId: "expense_underwriting",
  }),
  tx({
    id: "title_exp_sociii_jun",
    date: isoDate(28),
    description: "SOCIII Digital Workers subscription — June 2026",
    type: "debit", amount: 149_00, category: "software",
    coaAccountId: "expense_software",
  }),
  tx({
    id: "title_exp_sociii_jul",
    date: isoDate(1),
    description: "SOCIII Digital Workers subscription — July 2026",
    type: "debit", amount: 149_00, category: "software",
    coaAccountId: "expense_software",
  }),
  tx({
    id: "title_exp_recording",
    date: isoDate(42),
    description: "Henderson County Recording Fees paid — May 2026 batch (2 orders)",
    type: "debit", amount: 88_00, category: "recording_fees_paid",
    coaAccountId: "expense_recording",
  }),
];

// ─── 3. Marketing — referral partners ─────────────────────────────────────────

const REFERRAL_PARTNERS = [
  {
    id: "title_ref_001",
    name: "Chad Hardgrave",
    company: "GA Benchmark Mortgage",
    email: "chad.hardgrave@benchmarkmortgage.com",
    phone: "903-555-0147",
    type: "lender",
    nmls: "2143",
    segments: ["lender", "referral-partner"],
    ordersYtd: 4,
    status: "active",
    note: "CCO, GA Benchmark. Primary lender partner. Sends conventional + FHA referrals. 30-day avg close.",
    demo: true,
  },
  {
    id: "title_ref_002",
    name: "Kimberly Reese",
    company: "Coldwell Banker — Athens TX",
    email: "kim.reese@cbathenstx.com",
    phone: "903-555-0212",
    type: "agent",
    license: "TX-REL-643821",
    segments: ["agent", "referral-partner"],
    ordersYtd: 7,
    status: "active",
    note: "Top producer Henderson County. Residential purchase specialist. Sends 6-8 orders/year.",
    demo: true,
  },
  {
    id: "title_ref_003",
    name: "Bobby Tanner",
    company: "RE/MAX Henderson County",
    email: "btanner@remaxhc.com",
    phone: "903-555-0384",
    type: "agent",
    license: "TX-REL-518732",
    segments: ["agent", "referral-partner"],
    ordersYtd: 5,
    status: "active",
    note: "Waterfront / Lake Palestine specialist. Cash-close focused buyer pool.",
    demo: true,
  },
  {
    id: "title_ref_004",
    name: "Angela Burrows",
    company: "First National Bank of Athens",
    email: "aburrows@fnatx.com",
    phone: "903-555-0099",
    type: "lender",
    segments: ["lender", "referral-partner"],
    ordersYtd: 3,
    status: "active",
    note: "Local bank VP of mortgage. Handles in-house portfolio loans + conventional. Steady referral source.",
    demo: true,
  },
  {
    id: "title_ref_005",
    name: "Troy Garris",
    company: "Garris Horn LLP",
    email: "tgarris@garrishorn.com",
    phone: "903-555-0061",
    type: "attorney",
    segments: ["attorney", "referral-partner"],
    ordersYtd: 2,
    status: "active",
    note: "Real estate attorney — refers complex or contested title matters. Curative work coordinator.",
    demo: true,
  },
];

// ─── 4. Active Title Orders ────────────────────────────────────────────────────

const TITLE_ORDERS = [
  {
    id: "title_order_001",
    address: "313 Mayfair Dr, Athens, TX 75751",
    parcelId: "HC-2023-04712",
    county: "Henderson",
    state: "TX",
    orderType: "purchase",
    status: "search_complete",
    buyerName: "James & Lisa Hawkins",
    sellerName: "Roy Belton",
    purchasePrice: 285_000_00,
    loanAmount: 228_000_00,
    lender: "GA Benchmark Mortgage",
    lenderContact: "Chad Hardgrave NMLS #2143",
    referringAgent: "Kimberly Reese",
    openedDate: isoDate(14),
    targetCloseDate: isoDate(-21),
    riskScore: 12,
    chainEventCount: 7,
    defectCount: 0,
    notes: "Conventional 30yr. Clean chain — 3 prior owners since 1987. Tax status current. No liens.",
    demo: true,
  },
  {
    id: "title_order_002",
    address: "1422 Oak Ridge Ln, Athens, TX 75751",
    parcelId: "HC-2019-08834",
    county: "Henderson",
    state: "TX",
    orderType: "purchase",
    status: "commitment_issued",
    buyerName: "Cortez Family Trust",
    sellerName: "Sandra Whitfield",
    purchasePrice: 189_000_00,
    loanAmount: null,
    lender: "Cash close — no lender",
    lenderContact: null,
    referringAgent: "Bobby Tanner",
    openedDate: isoDate(22),
    targetCloseDate: isoDate(-7),
    riskScore: 5,
    chainEventCount: 5,
    defectCount: 0,
    notes: "Cash close. Waterfront lot on Lake Palestine. Clean title. Commitment issued — awaiting buyer attorney review.",
    demo: true,
  },
  {
    id: "title_order_003",
    address: "847 Henderson Hwy, Athens, TX 75751",
    parcelId: "HC-2015-02291",
    county: "Henderson",
    state: "TX",
    orderType: "refi",
    status: "exam_in_progress",
    buyerName: "Michael & Teri Odom (refi)",
    sellerName: null,
    purchasePrice: null,
    loanAmount: 320_000_00,
    lender: "GA Benchmark Mortgage",
    lenderContact: "Chad Hardgrave NMLS #2143",
    referringAgent: "Chad Hardgrave",
    openedDate: isoDate(8),
    targetCloseDate: isoDate(-28),
    riskScore: 28,
    chainEventCount: 9,
    defectCount: 1,
    defectNote: "P1-C: HOA lien from 2021 — curative release in progress via Garris Horn LLP",
    notes: "Refinance. 15-year fixed. One P1-C defect (HOA lien) — Tom Garris handling release. ~10 days to cure.",
    demo: true,
  },
];

// ─── 5. Vault DTCs — company assets ───────────────────────────────────────────

const DTCS = [
  {
    type: "insurance",
    title: "E&O Insurance — Stewart Title Guaranty — ABC Title Company",
    valueUsd: null,
    description: "Title agents errors & omissions policy. $1M per claim / $2M aggregate. Policy #STG-TX-2026-48821. Annual premium $4,944. Renewal June 2027.",
    tags: ["eo-insurance", "title", "texas", "stewart"],
    nextDue: isoDate(-335),
  },
  {
    type: "property",
    title: "Office Lease — 204 Prairie St Suite 2, Athens TX 75751",
    valueUsd: null,
    description: "Commercial lease. 1,800 sq ft. $1,650/mo. 3-year term — Aug 2024 through Jul 2027. Landlord: Henderson County Properties LLC.",
    tags: ["office-lease", "athens-tx", "henderson-county"],
    nextDue: isoDate(-365),
  },
  {
    type: "license",
    title: "Texas Department of Insurance — Title Insurance License #TX-TIA-39182",
    valueUsd: null,
    description: "TDI-licensed title agent. License holder: Sarah Garris. Annual renewal due October 31. CE requirement: 15 hours/biennial.",
    tags: ["tdi", "title-license", "texas", "insurance"],
    nextDue: isoDate(-280),
  },
  {
    type: "bank_account",
    title: "Escrow / Trust Account — First National Bank of Athens (Operating Escrow)",
    valueUsd: 847_200,
    description: "Client escrow trust account. Holds earnest money + settlement funds pending close. FDIC-insured. TDI trust account compliance audited annually. Current balance reflects 3 open orders.",
    tags: ["escrow", "trust-account", "title"],
  },
  {
    type: "bank_account",
    title: "Operating Account — First National Bank of Athens",
    valueUsd: 38_450,
    description: "Business operating account. Receives title premiums, closing fees. Pays staff payroll, E&O, office rent, underwriting remittances.",
    tags: ["operating-account", "title"],
  },
  {
    type: "credential", // a notary commission is a credential, not equipment — fixed under S52.53
    title: "Notary Commission — Deborah Sandoval TX-2024-38891",
    valueUsd: null,
    description: "Texas notary public commission. Commission #2024-38891. Expires 2028. Required for all closing documents requiring notarization.",
    tags: ["notary", "texas"],
  },
];

// ─── 6. Drive files (metadata only) ───────────────────────────────────────────

const DRIVE_FILES = [
  {
    id: "title_drive_001",
    name: "Title Commitment — 313 Mayfair Dr (ABC-2026-0031).pdf",
    type: "application/pdf",
    category: "title_commitment",
    orderId: "title_order_001",
    address: "313 Mayfair Dr, Athens TX 75751",
    notes: "Schedule A (owner + lender), Schedule B-1 (requirements), Schedule B-2 (exceptions). Issued Jul 14 2026.",
    sizeBytes: 248_000,
    demo: true,
  },
  {
    id: "title_drive_002",
    name: "ALTA Settlement Statement — 1422 Oak Ridge Ln (ABC-2026-0029).pdf",
    type: "application/pdf",
    category: "settlement_statement",
    orderId: "title_order_002",
    address: "1422 Oak Ridge Ln, Athens TX 75751",
    notes: "Cash close. Buyer and seller columns. Prorated taxes, recording fees, title premium line items.",
    sizeBytes: 186_000,
    demo: true,
  },
  {
    id: "title_drive_003",
    name: "Lender Instructions — GA Benchmark (Order 847 Henderson Hwy).pdf",
    type: "application/pdf",
    category: "lender_instructions",
    orderId: "title_order_003",
    address: "847 Henderson Hwy, Athens TX 75751",
    notes: "Wire instructions, funding conditions, lender policy requirements. Hold pending P1-C defect cure.",
    sizeBytes: 124_000,
    demo: true,
  },
  {
    id: "title_drive_004",
    name: "HOA Lien Release Request — Garris Horn LLP (Order 003).pdf",
    type: "application/pdf",
    category: "curative_document",
    orderId: "title_order_003",
    address: "847 Henderson Hwy, Athens TX 75751",
    notes: "Letter from Tom Garris to Henderson County HOA requesting payoff and lien release. Sent Jul 21 2026. Response expected 5-10 business days.",
    sizeBytes: 98_000,
    demo: true,
  },
];

// ─── Runner ────────────────────────────────────────────────────────────────────

async function clearCollection(col, field = "demo") {
  const snap = await col.where(field, "==", true).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

(async () => {
  console.log("═══ seedTitleDemo.js — ABC Title Company / Attorneys Title Henderson County TX ═══\n");

  // ── HR ─────────────────────────────────────────────────────────────────────
  const teamCol = db.collection("tenants").doc(TITLE_TENANT).collection("teamMembers");
  const clearedHR = await clearCollection(teamCol);
  console.log(`• Cleared ${clearedHR} existing HR records`);
  for (const s of STAFF) {
    await teamCol.add({ ...s, tenantId: TITLE_TENANT, ownerUid: TITLE_UID, createdAt: now() });
    console.log(`  ✓ HR: ${s.name} (${s.role})`);
  }

  // ── Accounting ─────────────────────────────────────────────────────────────
  const txCol = db.collection("transactions");
  const clearedTx = await clearCollection(txCol);
  console.log(`\n• Cleared ${clearedTx} existing accounting records`);
  for (const t of TRANSACTIONS) {
    await txCol.doc(t.id).set({ ...t, tenantId: TITLE_TENANT, ownerUid: TITLE_UID });
    console.log(`  ✓ Tx: ${t.description.slice(0, 60)}`);
  }

  // ── Contacts / Referral Partners ───────────────────────────────────────────
  const contactCol = db.collection("contacts");
  const clearedContacts = await clearCollection(contactCol);
  console.log(`\n• Cleared ${clearedContacts} existing contacts`);
  for (const c of REFERRAL_PARTNERS) {
    await contactCol.doc(c.id).set({ ...c, tenantId: TITLE_TENANT, ownerUid: TITLE_UID, createdAt: now() });
    console.log(`  ✓ Contact: ${c.name} (${c.role || c.type})`);
  }

  // ── Title Orders ───────────────────────────────────────────────────────────
  const orderCol = db.collection("titleOrders");
  const clearedOrders = await clearCollection(orderCol);
  console.log(`\n• Cleared ${clearedOrders} existing title orders`);
  for (const o of TITLE_ORDERS) {
    await orderCol.doc(o.id).set({
      ...o,
      tenantId: TITLE_TENANT,
      ownerUid: TITLE_UID,
      createdAt: now(),
      updatedAt: now(),
    });
    // Seed a minimal chain event for the order
    await orderCol.doc(o.id).collection("events").add({
      type: "title.order_opened",
      address: o.address,
      orderType: o.orderType,
      createdAt: now(),
    });
    console.log(`  ✓ Order: ${o.address} (${o.status})`);
  }

  // ── Vault DTCs ─────────────────────────────────────────────────────────────
  const dtcCol = db.collection("dtcs");
  const dtcSnap = await dtcCol.where("userId", "==", TITLE_UID).where("demo", "==", true).get();
  if (!dtcSnap.empty) {
    const b = db.batch();
    dtcSnap.docs.forEach(d => b.delete(d.ref));
    await b.commit();
  }
  console.log(`\n• Cleared ${dtcSnap.size} existing Vault DTCs`);

  const logCol = db.collection("logbookEntries");
  const logSnap = await logCol.where("userId", "==", TITLE_UID).where("demo", "==", true).get();
  if (!logSnap.empty) {
    const b = db.batch();
    logSnap.docs.forEach(d => b.delete(d.ref));
    await b.commit();
  }
  console.log(`• Cleared ${logSnap.size} existing logbook entries`);

  // S52.53 — these are company assets (E&O insurance, escrow/trust + operating
  // accounts, TDI license, notary commission, office lease), not Sarah's
  // personal belongings. Seeding them to tenantId "vault" was a real bug: it
  // commingled ABC Title's $847,200 client escrow balance into Sarah's
  // personal net worth, which is exactly what TDI trust-account segregation
  // rules prohibit. These now go to TITLE_TENANT — the business Vault reads
  // them from there; the personal Vault (tenantId "vault") no longer sees them.
  for (const dtc of DTCS) {
    const ref = dtcCol.doc();
    await ref.set({
      ...dtc,
      userId: TITLE_UID,
      tenantId: TITLE_TENANT,
      demo: true,
      createdAt: now(),
      updatedAt: now(),
    });
    await logCol.add({
      dtcId: ref.id,
      userId: TITLE_UID,
      tenantId: TITLE_TENANT,
      action: "created",
      note: `Seeded by seedTitleDemo.js`,
      demo: true,
      createdAt: now(),
    });
    console.log(`  ✓ Vault DTC: ${dtc.title.slice(0, 60)}`);
  }

  // ── Drive Files ────────────────────────────────────────────────────────────
  const driveCol = db.collection("driveFiles");
  const clearedDrive = await clearCollection(driveCol);
  console.log(`\n• Cleared ${clearedDrive} existing Drive files`);
  for (const f of DRIVE_FILES) {
    await driveCol.doc(f.id).set({
      ...f,
      tenantId: TITLE_TENANT,
      ownerUid: TITLE_UID,
      createdAt: now(),
    });
    console.log(`  ✓ Drive: ${f.name}`);
  }

  console.log(`
═══ Seed complete ═══
  HR staff:             ${STAFF.length}
  Accounting txns:      ${TRANSACTIONS.length}
  Referral partners:    ${REFERRAL_PARTNERS.length}
  Title orders:         ${TITLE_ORDERS.length}
  Vault DTCs:           ${DTCS.length}
  Drive files:          ${DRIVE_FILES.length}
`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
