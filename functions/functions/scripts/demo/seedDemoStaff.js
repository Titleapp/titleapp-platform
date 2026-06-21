// Seed Meadow Creek's 5 staff + their credentials into DEMO SPACE
// (build item #2). Deadlines are the brief's exact "Needs attention" moments,
// computed relative to today (2026-06-19). Read later by SPINE-4 / the
// Staff Training & Credential worker. Idempotent (demo:true).
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TENANT = "ws_1781920656122_tl9dhn";

// dates relative to 2026-06-19
const DAY = (iso) => iso; // YYYY-MM-DD
const status = (iso) => {
  const today = "2026-06-19";
  if (iso < today) return "overdue";
  // within 60 days → expiring
  const dt = new Date(iso + "T00:00:00Z").getTime();
  const t0 = new Date(today + "T00:00:00Z").getTime();
  return (dt - t0) / 86400000 <= 60 ? "expiring" : "current";
};

const STAFF = [
  { name: "Dr. Maya Chen, DVM", role: "Owner / Lead Vet / Educator", creds: [
    ["DEA controlled-substance registration", "2026-07-03"],   // 14 days — HERO
    ["State veterinary license (DVM)",        "2027-02-28"],
    ["Rabies titer",                          "2026-07-19"],   // next month
    ["AVMA membership",                       "2026-12-31"],
    ["CVT instructor certification",          "2027-05-15"],
    ["Annual CE credits (20 hrs)",            "2026-12-31"],
  ]},
  { name: "Jordan Park, DVM", role: "Associate Vet", creds: [
    ["State veterinary license (DVM)",        "2026-08-05"],   // 47 days
    ["DEA sub-registration",                  "2026-11-30"],
    ["Rabies handler certification",          "2027-01-10"],
    ["Soft-tissue surgery certification",     "2027-03-22"],
  ]},
  { name: "Sam Rivera, CVT", role: "Head Vet Tech (VTS candidate)", creds: [
    ["CVT license renewal",                   "2026-07-20"],   // 31 days
    ["Anesthesia monitoring certification",   "2026-10-12"],
    ["Rabies handler certification",          "2026-12-01"],
  ]},
  { name: "Alex Torres", role: "Vet Tech (CVT in progress)", creds: [
    ["OSHA bloodborne pathogens training",    "2026-05-20"],   // OVERDUE
    ["Rabies handler certification",          "2026-09-15"],
    ["CVT exam (VTNE) — in Dr. Chen's course","2026-11-08"],
  ]},
  { name: "Casey Kim", role: "Receptionist / Office Manager", creds: [
    ["OSHA safety training",                  "2027-01-31"],
    ["Practice management software cert",     "2027-04-04"],
    ["Client communication certification",    "2026-12-20"],
  ]},
];

(async () => {
  const prior = await db.collection("staffCredentials").where("tenantId","==",TENANT).where("demo","==",true).get();
  const del = db.batch(); prior.forEach(d => del.delete(d.ref));
  if (!prior.empty) { await del.commit(); console.log(`cleared ${prior.size} demo staffCredentials`); }

  const batch = db.batch();
  let total = 0, needsAttention = 0;
  for (const s of STAFF) {
    for (const [credential, expiresAt] of s.creds) {
      const st = status(expiresAt);
      if (st !== "current") needsAttention++;
      total++;
      batch.set(db.collection("staffCredentials").doc(), {
        tenantId: TENANT, demo: true,
        staffName: s.name, role: s.role,
        credential, expiresAt: DAY(expiresAt), status: st,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  await batch.commit();
  console.log(`✓ seeded ${total} staff credentials across ${STAFF.length} staff (${needsAttention} need attention)`);
  console.log(`  HERO deadlines: DEA 7/3 (14d) · Sam CVT 7/20 (31d) · Jordan license 8/5 (47d) · Alex OSHA OVERDUE · rabies titer 7/19`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
