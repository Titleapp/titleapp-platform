// Seed Dr. Maya Chen's personal Vault (demo@sociii.ai) — 4 tiles + the S2-1
// "Needs attention" hero deadlines + a real net worth. tenant "vault",
// userId = demo uid. Idempotent (clears prior demo:true). today = 2026-06-20.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2"; // demo@sociii.ai

// type → Vault tile: medical_* = Health, degree/*_record = Education,
// bank/investment/liability = Money, property/vehicle/equipment = My Stuff.
const DTCS = [
  // ── My Health (credentials/licenses with hard expiries) ──
  { type: "medical_certificate", title: "DEA Controlled-Substance Registration", expires: "2026-07-04" },            // 14d — HERO
  { type: "medical_record",      title: "Rabies Titer (required for vets)",       expires: "2026-07-19" },            // ~29d
  { type: "medical_certificate", title: "Professional Liability (E&O) Insurance", expires: "2026-09-30" },
  { type: "medical_certificate", title: "State Veterinary License (DVM)",         expires: "2027-02-28" },
  { type: "medical_record",      title: "Annual Physical — Dr. Chen" },
  // ── My Education (degree, CE, certs) ──
  { type: "degree",          title: "Doctor of Veterinary Medicine — UC Davis" },
  { type: "training_record", title: "Veterinary CE Credits (20 hrs/yr)",       nextDue: "2026-12-31" },
  { type: "training_record", title: "Controlled-Substance Handling Certification", expires: "2026-08-15" },
  { type: "training_record", title: "Anesthesia Monitoring Certification",     expires: "2027-01-20" },
  { type: "training_record", title: "OSHA Safety Training",                    expires: "2026-10-05" },
  { type: "training_record", title: "Exotic Animal Handling Certification",    expires: "2027-04-30" },
  { type: "training_record", title: "CVT Instructor Certification" },
  { type: "education_record", title: "AVMA Membership",                        nextDue: "2026-12-31" },
  // ── My Money (assets + liabilities → net worth) ──
  { type: "bank_account",       title: "Business Checking ····4471",  valueUsd: 91800 },
  { type: "bank_account",       title: "Business Savings",            valueUsd: 120000 },
  { type: "investment_account", title: "Personal Investments (brokerage + retirement)", valueUsd: 310000 },
  { type: "liability",          title: "Practice Acquisition Loan",   valueUsd: 420000 },
  { type: "liability",          title: "Equipment Financing",         valueUsd: 38000 },
  // ── My Stuff (property, vehicle, equipment — w/ calibration dates) ──
  { type: "property",  title: "Clinic Building — Meadow Creek",        valueUsd: 850000 },
  { type: "equipment", title: "Digital X-Ray Machine",  valueUsd: 45000, nextDue: "2026-06-14" },                    // calibration OVERDUE 6d
  { type: "equipment", title: "Autoclave / Sterilizer", valueUsd: 8000,  nextDue: "2026-11-01" },
  { type: "equipment", title: "Surgical Equipment Suite", valueUsd: 60000 },
  { type: "equipment", title: "Exam Tables (x4)",        valueUsd: 12000 },
  { type: "vehicle",   title: "Practice Vehicle — Subaru Outback",   valueUsd: 32000 },
];

(async () => {
  const prior = await db.collection("dtcs").where("userId","==",UID).where("tenantId","==","vault").where("demo","==",true).get();
  if (!prior.empty) {
    const b = db.batch();
    for (const d of prior.docs) {
      const ev = await db.collection("logbookEntries").where("dtcId","==",d.id).get();
      ev.forEach(e => b.delete(e.ref));
      b.delete(d.ref);
    }
    await b.commit(); console.log(`cleared ${prior.size} prior demo DTCs`);
  }

  let netWorth = 0, attention = 0;
  const batch = db.batch();
  for (const item of DTCS) {
    const { type, title, valueUsd, expires, nextDue } = item;
    if (typeof valueUsd === "number") netWorth += (type === "liability" ? -valueUsd : valueUsd);
    if (expires || nextDue) attention++;
    const ref = db.collection("dtcs").doc();
    const metadata = { title };
    if (typeof valueUsd === "number") metadata.valueUsd = valueUsd;
    if (expires) metadata.expires = expires;
    if (nextDue) metadata.nextDue = nextDue;
    if (type === "liability") metadata.liability = true;
    batch.set(ref, {
      userId: UID, tenantId: "vault", demo: true, type, metadata,
      logbookCount: 1, modification_authority: "owner_only",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("logbookEntries").doc(), {
      dtcId: ref.id, userId: UID, tenantId: "vault", demo: true,
      entryType: "created", dtcTitle: title,
      data: { note: "Added to Vault" },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`✓ seeded ${DTCS.length} Vault DTCs for Dr. Chen`);
  console.log(`  Net worth ≈ $${netWorth.toLocaleString()}`);
  console.log(`  ${attention} items with deadlines — incl. DEA 7/4 (14d), X-ray calibration OVERDUE, rabies 7/19`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
