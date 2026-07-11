// Seed 8 LP investors for Domain Point into the RE demo tenant (investor-relations worker).
// Collection: tenants/{TENANT}/investors
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

const INVESTORS = [
  {
    id: "lp_001",
    name: "Howard Finch",
    entity: "Finch Family Trust",
    email: "howard.finch@finchtrust.com",
    commitment: 750000,
    paidIn: 600000,
    outstanding: 150000,
    type: "LP",
    status: "active",
    capitalCallResponse: "pending",
    notes: "Sophisticated investor — prefers detailed quarterly reports. Son Howard Jr. is also a buyer prospect at the Meridian.",
    demo: true,
  },
  {
    id: "lp_002",
    name: "Diana Park",
    entity: "Park Equity LLC",
    email: "diana@parkequity.com",
    commitment: 500000,
    paidIn: 400000,
    outstanding: 100000,
    type: "LP",
    status: "active",
    capitalCallResponse: "pending",
    notes: "Active communicator — expects monthly updates. Voted YES on GC extension.",
    demo: true,
  },
  {
    id: "lp_003",
    name: "Robert & Carol Simmons",
    entity: "Simmons Ventures",
    email: "robert.simmons@simmonsventures.com",
    commitment: 1000000,
    paidIn: 800000,
    outstanding: 200000,
    type: "LP",
    status: "active",
    capitalCallResponse: "confirmed",
    notes: "Largest LP — anchor investor from deal origination. Voted YES on GC extension.",
    demo: true,
  },
  {
    id: "lp_004",
    name: "Yusef Osman",
    entity: "Osman Holdings",
    email: "yusef@osmanholdings.com",
    commitment: 250000,
    paidIn: 250000,
    outstanding: 0,
    type: "LP",
    status: "active",
    capitalCallResponse: "confirmed",
    notes: "Fully funded — no outstanding balance. Voted YES on GC extension.",
    demo: true,
  },
  {
    id: "lp_005",
    name: "Patricia Liang",
    entity: "Liang Capital Group",
    email: "patricia.liang@liangcapital.com",
    commitment: 500000,
    paidIn: 400000,
    outstanding: 100000,
    type: "LP",
    status: "active",
    capitalCallResponse: "confirmed",
    notes: "Hands-on investor — asks detailed construction questions. Voted YES on GC extension.",
    demo: true,
  },
  {
    id: "lp_006",
    name: "Marcus Eaton",
    entity: "ME Real Assets LLC",
    email: "meaton@merealassets.com",
    commitment: 300000,
    paidIn: 150000,
    outstanding: 150000,
    type: "LP",
    status: "active",
    capitalCallResponse: "no_response",
    notes: "2 calls + 1 email — no response on July 30 capital call. Has not voted on GC extension.",
    demo: true,
  },
  {
    id: "lp_007",
    name: "Sunrise Ridge Partners",
    entity: "Sunrise Ridge Partners",
    email: "ir@sunriseridge.com",
    commitment: 700000,
    paidIn: 700000,
    outstanding: 0,
    type: "LP",
    status: "active",
    capitalCallResponse: "confirmed",
    notes: "Institutional LP — fully funded. Has not yet voted on GC extension.",
    demo: true,
  },
  {
    id: "lp_008",
    name: "The Nguyen Group",
    entity: "The Nguyen Group",
    email: "partners@nguyengroup.com",
    commitment: 250000,
    paidIn: 100000,
    outstanding: 150000,
    type: "LP",
    status: "active",
    capitalCallResponse: "no_response",
    notes: "1 call + 2 emails — no response. Has not voted on GC extension. Tight cash flow suspected.",
    demo: true,
  },
];

(async () => {
  const col = db.collection("tenants").doc(RE_DEMO_TENANT).collection("investors");

  // Clear existing demo investors
  const existing = await col.where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo investors`);

  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const lp of INVESTORS) {
    await col.doc(lp.id).set({ ...lp, tenantId: RE_DEMO_TENANT, ownerUid: RE_DEMO_UID, createdAt: now });
    console.log(`  ✓ ${lp.name} / ${lp.entity} — $${(lp.commitment / 1000).toFixed(0)}K committed`);
  }

  const totalCommitted = INVESTORS.reduce((s, i) => s + i.commitment, 0);
  const totalPaid = INVESTORS.reduce((s, i) => s + i.paidIn, 0);
  console.log(`\n✓ Seeded ${INVESTORS.length} LP investors`);
  console.log(`  Total committed: $${(totalCommitted / 1000000).toFixed(2)}M`);
  console.log(`  Total paid in:   $${(totalPaid / 1000000).toFixed(2)}M`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
