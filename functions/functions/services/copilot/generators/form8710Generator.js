"use strict";

/**
 * form8710Generator.js — PDFKit renderer for FAA Form 8710-1
 *
 * Generates a PDF approximation of FAA 8710-1 (Airman Certificate
 * and/or Rating Application) Section IV using aggregated logbook data.
 *
 * Not an official FAA form — for reference/pre-fill only.
 */

/**
 * Generate an 8710-1 PDF buffer from builder output.
 *
 * @param {Object} data — output from form8710Builder.build8710()
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generate8710PDF(data) {
  const PDFDocument = require("pdfkit");

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "LETTER", margin: 50 });
      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(14).font("Helvetica-Bold")
        .text("FAA Form 8710-1 — Flight Time Summary", { align: "center" });
      doc.fontSize(9).font("Helvetica")
        .text("(Pre-fill reference — not an official FAA form)", { align: "center" });
      doc.moveDown(0.5);

      // Applicant info
      const info = data.sectionI || {};
      doc.fontSize(10).font("Helvetica-Bold").text("Section I — Applicant Information");
      doc.font("Helvetica").fontSize(9);
      drawRow(doc, "Name", info.name || "—");
      drawRow(doc, "Certificate No.", info.certificateNumber || "—");
      drawRow(doc, "Certificate Type", info.certificateType || "—");
      drawRow(doc, "Medical Class", info.medicalClass || "—");
      drawRow(doc, "Medical Date", info.medicalDate || "—");
      doc.moveDown(0.5);

      // Section IV: Flight Time
      const totals = (data.sectionIV || {}).allTime || {};
      doc.fontSize(10).font("Helvetica-Bold").text("Section IV — Record of Pilot Time");
      doc.moveDown(0.3);

      // All-time totals
      doc.font("Helvetica-Bold").fontSize(9).text("All-Time Totals:");
      doc.font("Helvetica").fontSize(8);

      const totalRows = [
        ["Total Flight Time", fmt(totals.totalTime)],
        ["Airplane SEL", fmt(totals.airplaneSEL)],
        ["Airplane MEL", fmt(totals.airplaneMEL)],
        ["PIC", fmt(totals.picTime)],
        ["SIC", fmt(totals.sicTime)],
        ["Cross-Country", fmt(totals.crossCountry)],
        ["Night", fmt(totals.nightTime)],
        ["Actual Instrument", fmt(totals.actualInstrument)],
        ["Simulated Instrument", fmt(totals.simulatedInstrument)],
        ["Total Instrument", fmt(totals.totalInstrument)],
        ["Dual Received", fmt(totals.dualReceived)],
        ["Dual Given", fmt(totals.dualGiven)],
        ["Day Landings", String(totals.landingsDay || 0)],
        ["Night Landings", String(totals.landingsNight || 0)],
        ["Total Landings", String(totals.totalLandings || 0)],
        ["Turbine", fmt(totals.turbineTime)],
        ["Complex", fmt(totals.complexTime)],
        ["High Performance", fmt(totals.highPerformanceTime)],
      ];

      drawTable(doc, totalRows);
      doc.moveDown(0.5);

      // Period totals
      const last6 = (data.sectionIV || {}).last6Months || {};
      const last12 = (data.sectionIV || {}).last12Months || {};

      doc.font("Helvetica-Bold").fontSize(9).text("Period Totals:");
      doc.font("Helvetica").fontSize(8);

      const periodHeader = [["Category", "Last 6 Months", "Last 12 Months"]];
      const periodRows = [
        ["Total Time", fmt(last6.totalTime), fmt(last12.totalTime)],
        ["PIC", fmt(last6.picTime), fmt(last12.picTime)],
        ["SIC", fmt(last6.sicTime), fmt(last12.sicTime)],
        ["Cross-Country", fmt(last6.crossCountry), fmt(last12.crossCountry)],
        ["Night", fmt(last6.nightTime), fmt(last12.nightTime)],
        ["Actual Instrument", fmt(last6.actualInstrument), fmt(last12.actualInstrument)],
      ];

      drawTable3Col(doc, periodHeader.concat(periodRows));
      doc.moveDown(0.5);

      // Approaches
      doc.font("Helvetica-Bold").fontSize(9)
        .text(`Total Approaches: ${(data.sectionIV || {}).totalApproaches || 0}`);

      const breakdown = (data.sectionIV || {}).approachBreakdown || {};
      if (Object.keys(breakdown).length > 0) {
        doc.font("Helvetica").fontSize(8);
        for (const [type, count] of Object.entries(breakdown)) {
          doc.text(`  ${type}: ${count}`);
        }
      }
      doc.moveDown(0.5);

      // Footer
      doc.font("Helvetica").fontSize(7).fillColor("#666666")
        .text(`Generated ${new Date().toISOString().substring(0, 10)} by TitleApp CoPilot`, { align: "center" })
        .text("This is a pre-fill reference document, not an official FAA form.", { align: "center" })
        .text("Verify all values against your official logbook before submission.", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// --- PDF helpers ---

function drawRow(doc, label, value) {
  doc.text(`${label}: ${value}`, { continued: false });
}

function drawTable(doc, rows) {
  const x = doc.x;
  for (const [label, value] of rows) {
    doc.text(label, x, doc.y, { width: 200, continued: true });
    doc.text(value, { width: 100, align: "right" });
  }
}

function drawTable3Col(doc, rows) {
  const x = doc.x;
  for (const [col1, col2, col3] of rows) {
    const y = doc.y;
    doc.text(col1, x, y, { width: 180 });
    doc.text(col2, x + 200, y, { width: 80, align: "right" });
    doc.text(col3, x + 300, y, { width: 80, align: "right" });
  }
}

function fmt(val) {
  if (val === undefined || val === null) return "0.0";
  return Number(val).toFixed(1);
}

module.exports = { generate8710PDF };
