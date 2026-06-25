// Seed REAL credit-card statement PDF blobs into Meadow Creek's Drive so the
// Accounting worker's "Import from Drive → parse → categorize" flow genuinely
// works on camera. Generates MULTIPLE distinct statements (different months,
// banks, cards, vendors, amounts) so you can use one for testing and keep
// fresh ones for the video.
//
// Idempotent: re-running overwrites the same objectIds + storage paths.
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

// Each statement: distinct bank, card brand, last4, period, due date, vendors.
const STATEMENTS = [
  {
    objectId: "demo_mc_card_statement_2026_03",
    filename: "Meadow Creek — Business Card Statement (March 2026).pdf",
    bank: "CALIFORNIA BUSINESS BANK", brand: "Business Visa®", last4: "4417",
    period: "March 1, 2026 – March 31, 2026", due: "April 24, 2026", periodTag: "2026-03-31",
    txns: [
      ["2026-03-02", "PATTERSON VETERINARY SUPPLY",   388.20],
      ["2026-03-04", "MWI ANIMAL HEALTH",            1102.66],
      ["2026-03-06", "IDEXX LABORATORIES",            689.40],
      ["2026-03-09", "ZOETIS INC",                    845.10],
      ["2026-03-11", "PG&E UTILITIES AUTOPAY",        611.07],
      ["2026-03-13", "COSTCO WHOLESALE #0421",        203.44],
      ["2026-03-16", "HENRY SCHEIN ANIMAL HEALTH",    472.18],
      ["2026-03-18", "AMAZON BUSINESS PRIME",         126.73],
      ["2026-03-21", "COMCAST BUSINESS INTERNET",     189.95],
      ["2026-03-24", "SHELL OIL 57442189",             66.80],
      ["2026-03-27", "COVETRUS NORTH AMERICA",        540.92],
      ["2026-03-30", "GOOGLE WORKSPACE",               72.00],
    ],
  },
  {
    objectId: "demo_mc_card_statement_2026_04",
    filename: "Meadow Creek — Business Card Statement (April 2026).pdf",
    bank: "PACIFIC COAST BANK", brand: "Business Mastercard®", last4: "8862",
    period: "April 1, 2026 – April 30, 2026", due: "May 24, 2026", periodTag: "2026-04-30",
    txns: [
      ["2026-04-01", "MWI ANIMAL HEALTH",            1340.55],
      ["2026-04-03", "IDEXX LABORATORIES",            712.00],
      ["2026-04-05", "VETSOURCE HOME DELIVERY",       298.41],
      ["2026-04-08", "PATTERSON VETERINARY SUPPLY",   455.69],
      ["2026-04-10", "STAPLES #1188 OFFICE SUPPLY",    91.32],
      ["2026-04-12", "INDEED JOB POSTING",            249.00],
      ["2026-04-15", "PG&E UTILITIES AUTOPAY",        598.22],
      ["2026-04-18", "ZOETIS INC",                    876.30],
      ["2026-04-21", "AMAZON BUSINESS PRIME",         164.08],
      ["2026-04-24", "MEADOW CREEK LANDSCAPING",      150.00],
      ["2026-04-27", "SHELL OIL 57442189",             74.15],
      ["2026-04-29", "HENRY SCHEIN ANIMAL HEALTH",    503.77],
    ],
  },
  {
    objectId: "demo_mc_card_statement_2026_05",
    filename: "Meadow Creek — Business Card Statement (May 2026).pdf",
    bank: "CALIFORNIA BUSINESS BANK", brand: "Business Visa®", last4: "4417",
    period: "May 1, 2026 – May 31, 2026", due: "June 24, 2026", periodTag: "2026-05-31",
    txns: [
      ["2026-05-02", "PATTERSON VETERINARY SUPPLY",   401.55],
      ["2026-05-04", "COVETRUS NORTH AMERICA",        689.20],
      ["2026-05-06", "IDEXX LABORATORIES",            744.85],
      ["2026-05-08", "MWI ANIMAL HEALTH",            1218.04],
      ["2026-05-11", "COMCAST BUSINESS INTERNET",     189.95],
      ["2026-05-13", "COSTCO WHOLESALE #0421",        177.91],
      ["2026-05-16", "ZOETIS INC",                    912.66],
      ["2026-05-19", "GOOGLE WORKSPACE",               72.00],
      ["2026-05-22", "PG&E UTILITIES AUTOPAY",        624.48],
      ["2026-05-25", "VETSOURCE HOME DELIVERY",       331.20],
      ["2026-05-28", "AMAZON BUSINESS PRIME",         142.37],
      ["2026-05-30", "SHELL OIL 57442189",             69.90],
    ],
  },
  {
    objectId: "demo_mc_card_statement_2026_06",
    filename: "Meadow Creek — Business Card Statement (June 2026).pdf",
    bank: "CALIFORNIA BUSINESS BANK", brand: "Business Visa®", last4: "4417",
    period: "June 1, 2026 – June 30, 2026", due: "July 24, 2026", periodTag: "2026-06-30",
    txns: [
      ["2026-06-02", "PATTERSON VETERINARY SUPPLY",   412.88],
      ["2026-06-03", "MWI ANIMAL HEALTH",            1289.40],
      ["2026-06-05", "IDEXX LABORATORIES",            734.15],
      ["2026-06-06", "HENRY SCHEIN ANIMAL HEALTH",    521.07],
      ["2026-06-08", "COSTCO WHOLESALE #0421",        188.62],
      ["2026-06-09", "PG&E UTILITIES AUTOPAY",        642.31],
      ["2026-06-11", "ZOETIS INC",                    903.55],
      ["2026-06-12", "AMAZON BUSINESS PRIME",         147.99],
      ["2026-06-14", "STAPLES #1188 OFFICE SUPPLY",    84.27],
      ["2026-06-16", "INDEED JOB POSTING",            249.00],
      ["2026-06-18", "COMCAST BUSINESS INTERNET",     189.95],
      ["2026-06-20", "SHELL OIL 57442189",             71.40],
      ["2026-06-23", "COVETRUS NORTH AMERICA",        658.12],
      ["2026-06-25", "GOOGLE WORKSPACE",               72.00],
      ["2026-06-27", "MEADOW CREEK LANDSCAPING",      150.00],
      ["2026-06-29", "VETSOURCE HOME DELIVERY",       318.74],
    ],
  },
];

function buildPdf(s) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const total = s.txns.reduce((sum, t) => sum + t[2], 0);

    doc.fontSize(18).font("Helvetica-Bold").text(s.bank, { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(12).font("Helvetica").text(`${s.brand} — Statement`);
    doc.moveDown(0.6);
    doc.fontSize(10).font("Helvetica");
    doc.text("Account Holder: Meadow Creek Veterinary Clinic");
    doc.text(`Card ending in: ${s.last4}`);
    doc.text(`Statement Period: ${s.period}`);
    doc.text(`Payment Due Date: ${s.due}`);
    doc.moveDown(0.8);

    const x0 = 54, xDate = 54, xDesc = 140, xAmt = 470;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Date", xDate, doc.y);
    const headerY = doc.y - 12;
    doc.text("Description", xDesc, headerY);
    doc.text("Amount", xAmt, headerY, { width: 90, align: "right" });
    doc.moveTo(x0, doc.y + 2).lineTo(558, doc.y + 2).stroke();
    doc.moveDown(0.4);

    doc.font("Helvetica").fontSize(10);
    for (const [date, desc, amt] of s.txns) {
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
    doc.text(`This statement is provided for demonstration purposes. ${s.bank} is a fictional institution.`, { width: 460 });

    doc.end();
  });
}

(async () => {
  for (const s of STATEMENTS) {
    const buf = await buildPdf(s);
    const storagePath = `users/${UID}/business/${TENANT}/documents/${s.objectId}`;
    await bucket.file(storagePath).save(buf, {
      resumable: false,
      metadata: { contentType: "application/pdf" },
    });
    const ts = admin.firestore.Timestamp.fromDate(new Date(s.periodTag + "T12:00:00Z"));
    await db.collection("storageObjects").doc(s.objectId).set({
      objectId: s.objectId, ownerUid: UID, orgId: TENANT, scope: "business",
      storagePath,
      filename: s.filename, mimeType: "application/pdf", sizeBytes: buf.length, version: 1,
      createdByWorker: "platform-accounting", parentProjectId: null, tags: ["demo"],
      accessList: [{ uid: UID, permission: "admin" }],
      status: "active", demo: true, createdAt: ts, updatedAt: ts,
    });
    console.log(`✓ ${s.filename} — ${s.txns.length} txns, ${buf.length} bytes`);
  }
  console.log(`\nSeeded ${STATEMENTS.length} statements. Accounting → Import from Drive will parse any of them.`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
