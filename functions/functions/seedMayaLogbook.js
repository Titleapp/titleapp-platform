"use strict";
/**
 * Seed realistic logbook entries for Maya Chen's demo DTCs.
 * Run: node seedMayaLogbook.js
 * Idempotent — skips entries that already exist (checks entry count > 1).
 */

const admin = require("firebase-admin");
const path = require("path");

// Use ADC / emulator credentials
const app = admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const MAYA_UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";

// All logbook entries keyed by DTC ID
const LOGBOOK_ENTRIES = {
  // Subaru Outback (vehicle)
  "U4Ud54JNwLil8d2Cbl4S": [
    { event: "service", note: "Oil change + tire rotation — 42,300 mi", date: new Date("2025-06-10") },
    { event: "service", note: "Annual smog check — passed", date: new Date("2025-10-15") },
    { event: "registration_renewal", note: "CA registration renewed — valid through 2026-10-31", date: new Date("2025-11-01") },
    { event: "service", note: "Brake pads replaced (front) — 47,800 mi", date: new Date("2026-01-22") },
    { event: "service", note: "Oil change + cabin air filter — 51,200 mi", date: new Date("2026-04-08") },
    { event: "service", note: "30k interval service: spark plugs, coolant flush, transmission fluid — 51,500 mi", date: new Date("2026-04-09") },
  ],

  // Exotic Animal Handling Certification (training_record)
  "tALK2zfqXP7jeXSfLdFg": [
    { event: "renewal", note: "CE credits applied — 6 hrs exotic species restraint (AVMA conference)", date: new Date("2024-10-20") },
    { event: "renewal", note: "Certification renewed — valid through 2025-10-31", date: new Date("2024-10-31") },
    { event: "ce_credit", note: "CE credits applied — 4 hrs avian handling (online AAEP module)", date: new Date("2025-04-15") },
    { event: "renewal", note: "Certification renewed — valid through 2026-10-31", date: new Date("2025-11-01") },
    { event: "ce_credit", note: "CE credits applied — 8 hrs wildlife triage practicum (UC Davis)", date: new Date("2026-03-12") },
  ],

  // Rabies Titer (medical_record)
  "vWd7Rm4ACqC1Zjy7CWUb": [
    { event: "titer_check", note: "Rabies titer drawn — result 1.4 IU/mL (above 0.5 threshold)", date: new Date("2024-08-05") },
    { event: "renewal", note: "Booster administered — protective level confirmed", date: new Date("2024-08-12") },
    { event: "titer_check", note: "Rabies titer drawn — result 2.1 IU/mL (excellent)", date: new Date("2025-07-18") },
    { event: "renewal", note: "Annual renewal logged — no booster required", date: new Date("2025-07-19") },
    { event: "titer_check", note: "Titer drawn per employer occupational health protocol — result pending", date: new Date("2026-07-10") },
  ],

  // DEA Controlled-Substance Registration (medical_certificate)
  // Use the DTC IDs confirmed from the Firestore query in the earlier session
};

// Generic entries for all other DTCs (by type)
const GENERIC_ENTRIES_BY_TYPE = {
  education_record: [
    { event: "enrollment", note: "Enrolled in program — record created", date: new Date("2022-08-20") },
    { event: "milestone", note: "Completed Year 1 coursework — GPA 3.8", date: new Date("2023-05-15") },
    { event: "milestone", note: "Degree conferred — DVM, UC Davis School of Veterinary Medicine", date: new Date("2024-05-18") },
  ],
  medical_certificate: [
    { event: "issued", note: "Certificate issued — initial application approved", date: new Date("2023-09-01") },
    { event: "renewal", note: "Annual renewal — no adverse events reported", date: new Date("2024-09-01") },
    { event: "renewal", note: "Annual renewal — continuing education requirements met", date: new Date("2025-09-01") },
  ],
  training_record: [
    { event: "completion", note: "Training completed — competency assessment passed", date: new Date("2023-11-15") },
    { event: "ce_credit", note: "CE credits applied — 4 hrs advanced module", date: new Date("2024-11-15") },
    { event: "renewal", note: "Certification renewed — current through next period", date: new Date("2025-11-15") },
  ],
  equipment: [
    { event: "purchase", note: "Equipment acquired — serial number recorded", date: new Date("2023-06-01") },
    { event: "maintenance", note: "Annual calibration/inspection — passed", date: new Date("2024-06-01") },
    { event: "maintenance", note: "Annual calibration/inspection — passed; firmware updated", date: new Date("2025-06-01") },
  ],
  bank_account: [
    { event: "opened", note: "Account opened — linked to personal vault", date: new Date("2021-03-15") },
    { event: "update", note: "Beneficiary information updated", date: new Date("2023-08-10") },
    { event: "update", note: "Routing number confirmed — direct deposit active", date: new Date("2024-01-05") },
  ],
  investment_account: [
    { event: "opened", note: "Account opened — IRA contribution initiated", date: new Date("2020-04-01") },
    { event: "update", note: "Annual contribution maximized — $7,000 limit", date: new Date("2024-04-15") },
    { event: "update", note: "Beneficiary designation reviewed and confirmed", date: new Date("2025-01-10") },
  ],
  property: [
    { event: "purchase", note: "Property recorded — deed filed with county recorder", date: new Date("2022-07-15") },
    { event: "update", note: "Homeowner's insurance renewed — policy on file", date: new Date("2024-07-15") },
    { event: "update", note: "Property tax paid — assessed value confirmed", date: new Date("2025-07-15") },
  ],
  liability: [
    { event: "issued", note: "Policy issued — coverage effective", date: new Date("2023-07-01") },
    { event: "renewal", note: "Policy renewed — premium adjusted for claims-free history", date: new Date("2024-07-01") },
    { event: "renewal", note: "Policy renewed — coverage limits increased per employer requirement", date: new Date("2025-07-01") },
  ],
  clinical_evaluation: [
    { event: "evaluation", note: "Annual clinical evaluation completed — meets competency standards", date: new Date("2024-01-15") },
    { event: "evaluation", note: "Mid-year check-in — no performance concerns noted", date: new Date("2024-07-15") },
    { event: "evaluation", note: "Annual clinical evaluation completed — promoted to senior clinician", date: new Date("2025-01-15") },
  ],
};

async function seedLogbook(dtcId, entries) {
  const dtcRef = db.collection("dtcs").doc(dtcId);
  const logbookRef = dtcRef.collection("logbookEntries");

  // Check existing entries
  const existingSnap = await logbookRef.get();
  if (existingSnap.size > 1) {
    console.log(`  SKIP ${dtcId} — already has ${existingSnap.size} entries`);
    return 0;
  }

  let added = 0;
  for (const entry of entries) {
    await logbookRef.add({
      event: entry.event,
      note: entry.note,
      date: admin.firestore.Timestamp.fromDate(entry.date),
      createdAt: admin.firestore.Timestamp.fromDate(entry.date),
      source: "worker:site-recon-001",
      userId: MAYA_UID,
    });
    added++;
  }

  // Update logbookCount on the DTC
  await dtcRef.update({ logbookCount: admin.firestore.FieldValue.increment(added) });
  console.log(`  + ${dtcId}: added ${added} entries`);
  return added;
}

async function main() {
  console.log("Seeding Maya's logbook entries...\n");

  // Seed the three key DTCs with specific entries
  for (const [dtcId, entries] of Object.entries(LOGBOOK_ENTRIES)) {
    await seedLogbook(dtcId, entries);
  }

  // Query all Maya DTCs and seed generic entries by type for the rest
  const dtcSnap = await db.collection("dtcs")
    .where("userId", "==", MAYA_UID)
    .get();

  for (const doc of dtcSnap.docs) {
    const dtcId = doc.id;
    if (LOGBOOK_ENTRIES[dtcId]) continue; // already handled above

    const data = doc.data();
    const type = data.type || "training_record";
    const genericEntries = GENERIC_ENTRIES_BY_TYPE[type];
    if (!genericEntries) {
      console.log(`  SKIP ${dtcId} — no generic template for type "${type}"`);
      continue;
    }

    await seedLogbook(dtcId, genericEntries);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
