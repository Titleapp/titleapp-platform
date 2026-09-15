// Real currency/qualification events for Sean's SOCIII Vault — sourced from
// his real FAA medical certificate and his real FlightVector qualification
// dashboard (screenshot, 2026-09-10). Not demo data.
"use strict";
const path = require("path");
const admin = require(path.resolve(__dirname, "../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2";
const SEAN_TENANT = "ws_1779846027006_hc71aw";
const now = () => admin.firestore.FieldValue.serverTimestamp();

const events = [
  {
    eventType: "medical",
    date: "2026-05-11",
    expirationDate: "2027-05-31",
    medicalClass: "Class 1",
    remarks: "FAA Form 8500-9, Examiner Patrick Lam MD (Designation #000019657). FlightVector's own qualification dashboard states expiration 05/31/2027 (12-month clock). Per 14 CFR 61.23(d), age 40+ means First Class is only good for 6 calendar months (11/30/2026) when exercising ATP privileges specifically — verify which clock applies before the checkride.",
  },
  {
    eventType: "135_proficiency_check",
    date: "2025-09-19",
    expirationDate: "2026-09-30",
    aircraftType: "Pilatus PC-12/47E",
    remarks: "14 CFR 135.293 competency check (PC12-293), per FlightVector qualification dashboard.",
  },
  {
    eventType: "135_297_ipc",
    date: "2026-03-21",
    expirationDate: "2026-09-30",
    aircraftType: "Pilatus PC-12/47E",
    remarks: "14 CFR 135.297 instrument proficiency check (PC12-297), per FlightVector qualification dashboard.",
  },
  {
    eventType: "huet_raft",
    date: "2025-09-22",
    expirationDate: "2027-09-30",
    remarks: "HUET - Raft Hands On, Hawaii-theater water egress/survival training, per FlightVector qualification dashboard.",
  },
];

async function main() {
  const logCol = db.collection("logbookEntries");
  for (const ev of events) {
    const ref = await logCol.add({
      userId: SEAN_UID,
      tenantId: SEAN_TENANT,
      entryType: "aviation.currency_event",
      data: ev,
      createdAt: now(),
      source: "seedSeanCurrencyEvents",
    });
    console.log(`• Wrote ${ev.eventType} (exp ${ev.expirationDate}) — ${ref.id}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
