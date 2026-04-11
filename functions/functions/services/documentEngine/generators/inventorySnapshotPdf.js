// services/documentEngine/generators/inventorySnapshotPdf.js
// PearX S26 Doc 1.4 — Investor-facing platform inventory snapshot PDF
// Clean, minimal layout: summary metrics, workers by vertical, integrations by category.
// No internal details (individual worker names, development status, pricing).

"use strict";

const PDFDocument = require("pdfkit");
const { MARGINS, FONTS, PAGE_SIZES, COLORS } = require("../templates/layouts");

const contentWidth = () => PAGE_SIZES.letter.width - MARGINS.standard.left - MARGINS.standard.right;

async function generateInventorySnapshot(inventoryData) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: "LETTER",
      margins: MARGINS.standard,
      bufferPages: true,
      info: {
        Title: "TitleApp Platform Inventory",
        Author: "TitleApp",
        Creator: "TitleApp Platform Inventory Worker",
        Producer: "TitleApp.ai",
      },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      renderSnapshot(doc, inventoryData);

      // Add footer to all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        renderFooter(doc);
      }
    } catch (e) {
      reject(e);
      return;
    }

    doc.end();
  });
}

function renderSnapshot(doc, data) {
  const { summary, verticals, integrations } = data;
  const cw = contentWidth();
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Header bar ──────────────────────────────────────────────
  doc.rect(0, 0, PAGE_SIZES.letter.width, 90).fill(COLORS.secondary);

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.accent)
    .text("TITLEAPP", MARGINS.standard.left, 28, { width: cw });

  doc.fontSize(18).font("Helvetica-Bold").fillColor(COLORS.white)
    .text("Platform Inventory", MARGINS.standard.left, 48, { width: cw * 0.7 });

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textMuted)
    .text(today, MARGINS.standard.left, 52, { width: cw, align: "right" });

  doc.y = 110;

  // ── Summary metrics ─────────────────────────────────────────
  const metrics = [
    { label: "Live Workers", value: String(summary.liveWorkers) },
    { label: "Verticals", value: String(summary.totalVerticals) },
    { label: "API Integrations", value: String(summary.totalIntegrations) },
  ];

  const metricWidth = cw / metrics.length;
  const metricY = doc.y;

  doc.rect(MARGINS.standard.left, metricY, cw, 60).fill("#F8F9FC");

  metrics.forEach((m, i) => {
    const x = MARGINS.standard.left + i * metricWidth;
    doc.fontSize(24).font("Helvetica-Bold").fillColor(COLORS.primary)
      .text(m.value, x + 16, metricY + 10, { width: metricWidth - 32 });
    doc.fontSize(9).font("Helvetica").fillColor(COLORS.textLight)
      .text(m.label, x + 16, metricY + 38, { width: metricWidth - 32 });
  });

  doc.y = metricY + 76;

  // ── Workers by Vertical ─────────────────────────────────────
  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.secondary)
    .text("WORKERS BY VERTICAL", MARGINS.standard.left, doc.y, { width: cw });
  doc.y += 8;

  // Table header
  const colX = [MARGINS.standard.left, MARGINS.standard.left + cw * 0.6, MARGINS.standard.left + cw * 0.8];
  const colW = [cw * 0.6, cw * 0.2, cw * 0.2];

  doc.rect(MARGINS.standard.left, doc.y, cw, 18).fill(COLORS.secondary);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
  doc.text("Vertical", colX[0] + 8, doc.y + 5, { width: colW[0] });
  doc.text("Live", colX[1], doc.y + 5, { width: colW[1], align: "center" });
  doc.text("Total", colX[2], doc.y + 5, { width: colW[2], align: "center" });
  doc.y += 18;

  if (verticals) {
    verticals.forEach((v, i) => {
      if (doc.y > PAGE_SIZES.letter.height - MARGINS.standard.bottom - 40) {
        doc.addPage();
        doc.y = MARGINS.standard.top;
      }

      const rowBg = i % 2 === 0 ? "#FFFFFF" : "#F8F9FC";
      doc.rect(MARGINS.standard.left, doc.y, cw, 20).fill(rowBg);

      doc.fontSize(10).font("Helvetica").fillColor(COLORS.text);
      doc.text(v.name, colX[0] + 8, doc.y + 5, { width: colW[0] - 16 });
      doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary);
      doc.text(String(v.live), colX[1], doc.y + 5, { width: colW[1], align: "center" });
      doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight);
      doc.text(String(v.total || v.live), colX[2], doc.y + 5, { width: colW[2], align: "center" });
      doc.y += 20;
    });
  }

  doc.y += 20;

  // ── Integrations by Category ────────────────────────────────
  if (doc.y > PAGE_SIZES.letter.height - MARGINS.standard.bottom - 80) {
    doc.addPage();
    doc.y = MARGINS.standard.top;
  }

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.secondary)
    .text("API INTEGRATIONS BY CATEGORY", MARGINS.standard.left, doc.y, { width: cw });
  doc.y += 8;

  // Table header
  const intColX = [MARGINS.standard.left, MARGINS.standard.left + cw * 0.7];
  const intColW = [cw * 0.7, cw * 0.3];

  doc.rect(MARGINS.standard.left, doc.y, cw, 18).fill(COLORS.secondary);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
  doc.text("Category", intColX[0] + 8, doc.y + 5, { width: intColW[0] });
  doc.text("Count", intColX[1], doc.y + 5, { width: intColW[1], align: "center" });
  doc.y += 18;

  if (integrations?.categories) {
    integrations.categories.forEach((cat, i) => {
      if (doc.y > PAGE_SIZES.letter.height - MARGINS.standard.bottom - 40) {
        doc.addPage();
        doc.y = MARGINS.standard.top;
      }

      const rowBg = i % 2 === 0 ? "#FFFFFF" : "#F8F9FC";
      doc.rect(MARGINS.standard.left, doc.y, cw, 20).fill(rowBg);

      doc.fontSize(10).font("Helvetica").fillColor(COLORS.text);
      doc.text(cat.name, intColX[0] + 8, doc.y + 5, { width: intColW[0] - 16 });
      doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary);
      doc.text(String(cat.count), intColX[1], doc.y + 5, { width: intColW[1], align: "center" });
      doc.y += 20;
    });

    // Total row
    doc.rect(MARGINS.standard.left, doc.y, cw, 22).fill("#F3F0FF");
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary);
    doc.text("Total", intColX[0] + 8, doc.y + 6, { width: intColW[0] });
    doc.text(String(integrations.totalCount), intColX[1], doc.y + 6, { width: intColW[1], align: "center" });
    doc.y += 22;
  }
}

function renderFooter(doc) {
  const y = PAGE_SIZES.letter.height - MARGINS.standard.bottom + 20;
  const cw = contentWidth();
  const dateStr = new Date().toISOString().slice(0, 10);

  doc.fontSize(8).font("Helvetica").fillColor(COLORS.textMuted)
    .text(
      `TitleApp.ai  \u00B7  Live data as of ${dateStr}  \u00B7  Confidential`,
      MARGINS.standard.left, y,
      { width: cw, align: "center", lineBreak: false }
    );
}

module.exports = { generateInventorySnapshot };
