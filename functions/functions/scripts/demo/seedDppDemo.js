// seedDppDemo.js — Seed live Firestore data for the DPP demo (Voltara BV / Traitly).
//
// Matches the existing hardcoded demo constants in
// apps/business/src/components/canvas/DPPWorkerCanvas.jsx exactly, so wiring
// the canvas to live data (CODEX 71) shows the same familiar demo story —
// just sourced from Firestore instead of a JS constant.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json node scripts/demo/seedDppDemo.js
//
// Requires Firebase Admin credentials — not runnable from this environment
// (no Firebase CLI / service account configured on this machine as of
// 2026-08-13). Written and ready to run by whoever has deploy access.

const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const TENANT_ID = "demo-volta-advisory-001"; // matches PERSONAS.traitly in functions/functions/index.js

function now() { return admin.firestore.FieldValue.serverTimestamp(); }

// ── Cluster completion table — mirrors CLUSTER_TABLE in DPPWorkerCanvas.jsx ──
const CLUSTER_TABLE = {
  0:  [0,   0,   0,   0,   0,   0,   0  ],
  8:  [55,  0,   0,   0,   0,   0,   0  ],
  38: [90,  75,  0,   30,  20,  0,   0  ],
  64: [100, 100, 8,   65,  70,  40,  55 ],
  87: [100, 100, 60,  95,  95,  90,  85 ],
  95: [100, 100, 80,  100, 100, 100, 100],
};

function clustersFor(pct) {
  const row = CLUSTER_TABLE[pct] || CLUSTER_TABLE[0];
  const out = {};
  row.forEach((p, i) => { out[`c${i + 1}`] = { pct: p }; });
  return out;
}

// passportStatus stays "unknown" (in-progress) for every SKU — none has
// cleared the Cluster 3 (carbon footprint LCA) gate yet, matching the
// existing demo narrative (nobody is actually ready to submit today).
const PRODUCTS = [
  { sku: "VLT-EV48",  name: "EV Module 48V 200Ah",       category: "EV",         overallPct: 0,  passportStatus: "unknown" },
  { sku: "VLT-EV72",  name: "EV Module 72V 150Ah",       category: "EV",         overallPct: 8,  passportStatus: "unknown" },
  { sku: "VLT-IND24", name: "Industrial 24V 500Ah",      category: "Industrial", overallPct: 38, passportStatus: "unknown" },
  { sku: "VLT-IND48", name: "Industrial 48V 400Ah",      category: "Industrial", overallPct: 64, passportStatus: "unknown" },
  { sku: "VLT-LMT12", name: "LMT Module 12V 100Ah",      category: "LMT",        overallPct: 87, passportStatus: "unknown" },
  { sku: "VLT-LMT24", name: "LMT Module 24V 80Ah",       category: "LMT",        overallPct: 95, passportStatus: "unknown" },
];

const SUPPLIERS = [
  { name: "Zhenghe Celltech Co.", language: "ZH", status: "verified", products: ["VLT-EV48", "VLT-EV72"], certExpiry: null },
  { name: "Hanam Cell Corp.",      language: "KO", status: "invited",  products: ["VLT-IND24", "VLT-IND48"], certExpiry: null },
  { name: "ShinPower Corp.",       language: "KO", status: "verified", products: ["VLT-LMT12", "VLT-LMT24"], certExpiry: null },
  { name: "Rheinwerk GmbH",        language: "DE", status: "pending",  products: ["VLT-IND24", "VLT-IND48", "VLT-LMT12", "VLT-LMT24"], certExpiry: null },
];

const REGISTRY_STATUS = {
  allowlistStatus: "not_applied", // no evidence allowlisting was ever pursued — CODEX 71 §14
  registryGoLive: "20 Jul 2026",  // corrected date, not the original 19 Jul — CODEX 71 §9a
  submissionQueue: [],
  registered: [],
};

const FLEET = [
  { sku: "VLT-IND24", unitsDeployed: 23, bmsStatus: "Live",                  sohPct: 94, sohColor: "green",  cycleCount: 312,  ratedCycles: 2000, amendmentPending: false },
  { sku: "VLT-IND48", unitsDeployed: 41, bmsStatus: "Live",                  sohPct: 88, sohColor: "green",  cycleCount: 587,  ratedCycles: 2000, amendmentPending: false },
  { sku: "VLT-LMT12", unitsDeployed: 67, bmsStatus: "Live — near threshold", sohPct: 79, sohColor: "yellow", cycleCount: 1103, ratedCycles: 1500, amendmentPending: true  },
  { sku: "VLT-LMT24", unitsDeployed: 89, bmsStatus: "Live — second-life",    sohPct: 71, sohColor: "yellow", cycleCount: 1298, ratedCycles: 1500, amendmentPending: true  },
  { sku: "VLT-EV48",  unitsDeployed: 0,  bmsStatus: "not_connected",         sohPct: null, sohColor: "grey", cycleCount: null, ratedCycles: 3000, amendmentPending: false },
  { sku: "VLT-EV72",  unitsDeployed: 0,  bmsStatus: "not_connected",         sohPct: null, sohColor: "grey", cycleCount: null, ratedCycles: 3000, amendmentPending: false },
];

async function seed() {
  console.log(`\n=== Seeding DPP demo data for tenant ${TENANT_ID} ===\n`);

  // Clear existing demo docs for idempotency (matches the pattern used by
  // seedHendersonCountyDemo.js / seedTitleDemo.js elsewhere in this repo).
  for (const coll of ["dppProducts", "dppSuppliers", "dppRegistryStatus", "dppFleet"]) {
    const snap = await db.collection(coll).where("tenantId", "==", TENANT_ID).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`  cleared ${snap.size} existing ${coll} doc(s)`);
    }
  }

  const productCol = db.collection("dppProducts");
  for (const p of PRODUCTS) {
    await productCol.add({
      ...p,
      tenantId: TENANT_ID,
      clusters: clustersFor(p.overallPct),
      demo: true,
      createdAt: now(),
      updatedAt: now(),
    });
    console.log(`  ✓ product: ${p.sku} (${p.overallPct}% overall)`);
  }

  const supplierCol = db.collection("dppSuppliers");
  for (const s of SUPPLIERS) {
    await supplierCol.add({ ...s, tenantId: TENANT_ID, demo: true, createdAt: now(), updatedAt: now() });
    console.log(`  ✓ supplier: ${s.name} (${s.status})`);
  }

  await db.collection("dppRegistryStatus").add({
    ...REGISTRY_STATUS, tenantId: TENANT_ID, demo: true, createdAt: now(), updatedAt: now(),
  });
  console.log(`  ✓ registry status`);

  const fleetCol = db.collection("dppFleet");
  for (const f of FLEET) {
    await fleetCol.add({ ...f, tenantId: TENANT_ID, demo: true, createdAt: now(), updatedAt: now() });
    console.log(`  ✓ fleet: ${f.sku} (${f.unitsDeployed} units)`);
  }

  console.log(`\n=== Done — ${PRODUCTS.length} products, ${SUPPLIERS.length} suppliers, 1 registry status, ${FLEET.length} fleet records ===\n`);
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
