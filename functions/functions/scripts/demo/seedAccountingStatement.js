// Seed a REAL credit-card statement PDF blob into Meadow Creek's Drive so the
// Accounting worker's existing "Import from Drive → parse → categorize" flow
// (handleImportFromDrive → /accounting:statements:parse → Claude extracts the
// transactions) genuinely works on camera — not a metadata placeholder.
//
// Idempotent: re-running overwrites the same objectId + storage path.
//
//   node scripts/demo/seedAccountingStatement.js
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";
const bucket = admin.storage().bucket(STORAGE_BUCKET);

const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2"; // demo@sociii.ai
const TENANT = "ws_1781920656122_tl9dhn";   // Meadow Creek Veterinary
const FILENAME = "Meadow Creek — Business Card Statement (June 2026).pdf";
const OBJECT_ID = "demo_meadow_creek_business_card_statement_june_2026";
const STORAGE_PATH = `users/${UID}/business/${TENANT}/documents/${OBJECT_ID}`;

// Realistic vet-practice business-card transactions for June 2026.
const TXNS = [
  ["2026-06-02", "PATTERSON VETERINARY SUPPLY",        412.88],
  ["2026-06-03", "MWI ANIMAL HEALTH",                  1289.40],
  ["2026-06-05", "IDEXX LABORATORIES",                  734.15],
  ["2026-06-06", "HENRY SCHEIN ANIMAL HEALTH",          521.07],
  ["2026-06-08", "COSTCO WHOLESALE #0421",              188.62],
  ["2026-06-09", "PG&E UTILITIES AUTOPAY",              642.31],
  ["2026-06-11", "ZOETIS INC",                          903.55],
  ["2026-06-12", "AMAZON BUSINESS PRIME",               147.99],
  ["2026-06-14", "STAPLES #1188 OFFICE SUPPLY",          84.27],
  ["2026-06-16", "INDEED JOB POSTING",                  249.00],
  ["2026-06-18", "COMCAST BUSINESS INTERNET",           189.95],
  ["2026-06-20", "SHELL OIL 57442189",                   71.40],
  ["2026-06-23", "COVETRUS NORTH AMERICA",              658.12],
  ["2026-06-25", "GOOGLE WORKSPACE",                     72.00],
  ["2026-06-27", "MEADOW CREEK LANDSCAPING",            150.00],
  ["2026-06-29", "VETSOURCE HOME DELIVERY",             318.74],
];

function buildPdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const total = TXNS.reduce((s, t) => s + t[2], 0);

    doc.fontSize(18).font("Helvetica-Bold").text("CALIFORNIA BUSINESS BANK", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(12).font("Helvetica").text("Business Visa® — Statement");
    doc.moveDown(0.6);
    doc.fontSize(10).font("Helvetica");
    doc.text("Account Holder: Meadow Creek Veterinary Clinic");
    doc.text("Card ending in: 4417");
    doc.text("Statement Period: June 1, 2026 – June 30, 2026");
    doc.text("Payment Due Date: July 24, 2026");
    doc.moveDown(0.8);

    // Table header
    const x0 = 54, xDate = 54, xDesc = 140, xAmt = 470;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Date", xDate, doc.y);
    const headerY = doc.y - 12;
    doc.text("Description", xDesc, headerY);
    doc.text("Amount", xAmt, headerY, { width: 90, align: "right" });
    doc.moveTo(x0, doc.y + 2).lineTo(558, doc.y + 2).stroke();
    doc.moveDown(0.4);

    doc.font("Helvetica").fontSize(10);
    for (const [date, desc, amt] of TXNS) {
      const y = doc.y;
      doc.text(date, xDate, y);
      doc.text(desc, xDesc, y, { width: 320 });
      doc.text("$" + amt.toFixed(2), xAmt, y, { width: 90, align: "right" });
      doc.moveDown(0.45);
    }

    doc.moveTo(x0, doc.y + 2).lineTo(558, doc.y + 2).stroke();
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(11);
    const ty = doc.y;
    doc.text("New Balance / Total Purchases", xDesc, ty);
    doc.text("$" + total.toFixed(2), xAmt, ty, { width: 90, align: "right" });

    doc.moveDown(1.5);
    doc.font("Helvetica").fontSize(8).fillColor("#666");
    doc.text("This statement is provided for demonstration purposes. CALIFORNIA BUSINESS BANK is a fictional institution.", { width: 460 });

    doc.end();
  });
}

(async () => {
  const buf = await buildPdf();
  console.log(`Generated statement PDF: ${buf.length} bytes`);

  await bucket.file(STORAGE_PATH).save(buf, {
    resumable: false,
    metadata: { contentType: "application/pdf" },
  });
  console.log(`Uploaded blob → gs://${STORAGE_BUCKET}/${STORAGE_PATH}`);

  const ts = admin.firestore.Timestamp.fromDate(new Date("2026-06-30T12:00:00Z"));
  await db.collection("storageObjects").doc(OBJECT_ID).set({
    objectId: OBJECT_ID, ownerUid: UID, orgId: TENANT, scope: "business",
    storagePath: STORAGE_PATH,
    filename: FILENAME, mimeType: "application/pdf", sizeBytes: buf.length, version: 1,
    createdByWorker: "platform-accounting", parentProjectId: null, tags: ["demo"],
    accessList: [{ uid: UID, permission: "admin" }],
    status: "active", demo: true, createdAt: ts, updatedAt: ts,
  });
  console.log(`✓ storageObjects/${OBJECT_ID} written — Accounting → Import from Drive will now parse this.`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
