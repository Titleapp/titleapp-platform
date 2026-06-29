"use strict";
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const MAYA_UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";

const DTC_ENTRIES = {
  "U4Ud54JNwLil8d2Cbl4S": [
    { event: "service", note: "Oil change + tire rotation — 42,300 mi", date: new Date("2025-06-10") },
    { event: "service", note: "Annual smog check — passed", date: new Date("2025-10-15") },
    { event: "registration_renewal", note: "CA registration renewed — valid through 2026-10-31", date: new Date("2025-11-01") },
    { event: "service", note: "Brake pads replaced (front) — 47,800 mi", date: new Date("2026-01-22") },
    { event: "service", note: "Oil change + cabin air filter — 51,200 mi", date: new Date("2026-04-08") },
  ],
  "tALK2zfqXP7jeXSfLdFg": [
    { event: "renewal", note: "CE credits applied — 6 hrs exotic species restraint (AVMA conference)", date: new Date("2024-10-20") },
    { event: "renewal", note: "Certification renewed — valid through 2025-10-31", date: new Date("2024-10-31") },
    { event: "ce_credit", note: "CE credits applied — 4 hrs avian handling (online AAEP module)", date: new Date("2025-04-15") },
    { event: "renewal", note: "Certification renewed — valid through 2026-10-31", date: new Date("2025-11-01") },
  ],
  "vWd7Rm4ACqC1Zjy7CWUb": [
    { event: "titer_check", note: "Rabies titer drawn — result 1.4 IU/mL (above 0.5 threshold)", date: new Date("2024-08-05") },
    { event: "renewal", note: "Booster administered — protective level confirmed", date: new Date("2024-08-12") },
    { event: "titer_check", note: "Rabies titer drawn — result 2.1 IU/mL (excellent)", date: new Date("2025-07-18") },
    { event: "renewal", note: "Annual renewal logged — no booster required", date: new Date("2025-07-19") },
  ],
};

async function seed() {
  const col = db.collection("logbookEntries");
  let total = 0;

  for (const [dtcId, entries] of Object.entries(DTC_ENTRIES)) {
    const existing = await col.where("dtcId", "==", dtcId).where("userId", "==", MAYA_UID).get();
    if (existing.size > 1) {
      console.log("SKIP", dtcId, "—", existing.size, "entries already in top-level collection");
      continue;
    }
    for (const e of entries) {
      await col.add({
        dtcId,
        userId: MAYA_UID,
        tenantId: "vault",
        entryType: e.event,
        data: { note: e.note },
        createdAt: admin.firestore.Timestamp.fromDate(e.date),
      });
      total++;
    }
    console.log("+", dtcId, ":", entries.length, "entries");
  }

  console.log("Total seeded:", total);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
