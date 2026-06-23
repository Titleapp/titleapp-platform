// Seed Meadow Creek's Drive (My Drive / storageObjects) with sample practice
// documents so A2 "Your Drive" shows real files grouped into worker folders
// instead of "No documents yet". Metadata-only (list view) — idempotent.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2"; // demo@sociii.ai
const TENANT = "ws_1781920656122_tl9dhn";

const PDF = "application/pdf";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// filename, mimeType, sizeBytes, createdByWorker (folder), date
const DOCS = [
  ["Employee Handbook 2026.pdf",                 PDF,  1_840_000, "platform-hr",                "2026-04-02"],
  ["OSHA Bloodborne Pathogen Exposure Plan.pdf", PDF,    420_000, "platform-hr",                "2026-04-10"],
  ["Staff Roster & Credentials.xlsx",            XLSX,   96_000,  "spine-4-staff-credentials",  "2026-06-15"],
  ["DEA Registration Certificate.pdf",           PDF,    310_000, "vet-003-drug-dosing",        "2026-01-08"],
  ["Controlled Substance Log — June 2026.xlsx",  XLSX,   142_000, "vet-003-drug-dosing",        "2026-06-18"],
  ["Anesthesia Monitoring Sheet.pdf",            PDF,    188_000, "vet-003-drug-dosing",        "2026-05-22"],
  ["W-9 — Meadow Creek Veterinary.pdf",          PDF,    120_000, "platform-accounting",        "2026-02-14"],
  ["FY2025 Profit & Loss.xlsx",                  XLSX,   210_000, "platform-accounting",        "2026-03-01"],
  ["CVT Course Syllabus — Spring 2026.pdf",      PDF,    640_000, "edu-001-cvt-exam-prep",      "2026-03-28"],
  ["Practice Lease Agreement.pdf",               PDF,  2_100_000, "title-abstract-001",         "2025-11-30"],
  ["Surgical Consent Form Template.docx",        DOCX,   88_000,  null,                         "2026-05-05"],
  ["Vaccine Inventory Log.xlsx",                 XLSX,   74_000,  null,                          "2026-06-12"],
];

(async () => {
  const prior = await db.collection("storageObjects").where("orgId", "==", TENANT).where("demo", "==", true).get();
  if (!prior.empty) { const b = db.batch(); prior.docs.forEach(d => b.delete(d.ref)); await b.commit(); console.log(`cleared ${prior.size} prior demo docs`); }

  const batch = db.batch();
  for (const [filename, mimeType, sizeBytes, worker, date] of DOCS) {
    const objectId = "demo_" + filename.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const ts = admin.firestore.Timestamp.fromDate(new Date(date + "T12:00:00Z"));
    batch.set(db.collection("storageObjects").doc(objectId), {
      objectId, ownerUid: UID, orgId: TENANT, scope: "business",
      storagePath: `users/${UID}/business/${TENANT}/documents/${objectId}`,
      filename, mimeType, sizeBytes, version: 1,
      createdByWorker: worker, parentProjectId: null, tags: ["demo"],
      accessList: [{ uid: UID, permission: "admin" }],
      status: "active", demo: true, createdAt: ts, updatedAt: ts,
    });
  }
  await batch.commit();
  console.log(`✓ seeded ${DOCS.length} Drive documents for Meadow Creek (grouped into worker folders)`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
