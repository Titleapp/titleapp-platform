"use strict";

/**
 * canvasArchive.js — Phase D-1 of the Accounting build.
 *
 * Mirrors structured Accounting canvas cards (card:accounting-pl,
 * -balance-sheet, -cashflow, -invoice, -coa) into Drive so the user has
 * a durable artifact of every report the worker produces.
 *
 * Output formats (updated 2026-05-14): tabular reports emit .xlsx via
 * ExcelJS so CPAs and operators can open them in Excel/Numbers/Sheets.
 * Invoices emit .pdf via pdfkit since they're a presentation document,
 * not a working sheet. Markdown is no longer produced — most users don't
 * know what a .md file is.
 *
 * Only fires when the canvas type starts with "card:accounting-". Any
 * other card type is left alone.
 */

const admin = require("firebase-admin");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const ARCHIVE_TYPES = new Set([
  "card:accounting-pl",
  "card:accounting-balance-sheet",
  "card:accounting-cashflow",
  "card:accounting-invoice",
  "card:accounting-coa",
]);

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PDF_MIME = "application/pdf";

// Type label used in displayTitle and as the prefix in the filename slug.
const TYPE_LABELS = {
  "pl": "P&L",
  "balance-sheet": "Balance Sheet",
  "cashflow": "Cash Flow",
  "coa": "Chart of Accounts",
  "invoice": "Invoice",
};

const ACCENT = "FF7C3AED";       // brand purple (ExcelJS uses ARGB)
const ACCENT_LIGHT = "FFF5F3FF"; // 50-tint of purple
const BORDER_GRAY = "FFE2E8F0";
const TEXT_DARK = "FF1E293B";
const TEXT_MUTED = "FF64748B";

function dollars(n) {
  if (n == null || isNaN(n)) return null;
  return Number(n);
}

function isArchivableAccounting(type) {
  return ARCHIVE_TYPES.has(type);
}

function inferVariant(periodStr, summaryStr) {
  const hay = `${periodStr || ""} ${summaryStr || ""}`.toLowerCase();
  if (/\b(projection|projected|forecast|forecasted)\b/.test(hay)) return "projection";
  if (/\bbudget(ed|s)?\b/.test(hay)) return "budget";
  if (/\b(reconstruction|reconstruct|approximat|estimate)\b/.test(hay)) return "reconstruction";
  return "actual";
}

function slugifyPeriod(periodStr, fallbackYear) {
  if (!periodStr) return fallbackYear || "unknown-period";
  return periodStr
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ---------- ExcelJS shared helpers ----------

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TitleApp Accounting";
  wb.created = new Date();
  return wb;
}

function styleTitleRow(ws, row, text) {
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.font = { name: "Calibri", size: 16, bold: true, color: { argb: TEXT_DARK } };
  ws.mergeCells(`A${row}:D${row}`);
  ws.getRow(row).height = 26;
}

function styleSubtitleRow(ws, row, text) {
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.font = { name: "Calibri", size: 11, italic: true, color: { argb: TEXT_MUTED } };
  ws.mergeCells(`A${row}:D${row}`);
}

function styleSectionHeader(ws, row, text) {
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
  cell.alignment = { vertical: "middle" };
  ws.mergeCells(`A${row}:D${row}`);
  ws.getRow(row).height = 20;
}

function styleHeaderRow(ws, row, labels) {
  for (let i = 0; i < labels.length; i++) {
    const cell = ws.getCell(row, i + 1);
    cell.value = labels[i];
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: TEXT_DARK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_LIGHT } };
    cell.border = { bottom: { style: "thin", color: { argb: BORDER_GRAY } } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
  }
  ws.getRow(row).height = 18;
}

function styleBodyRow(ws, row, values, opts = {}) {
  for (let i = 0; i < values.length; i++) {
    const cell = ws.getCell(row, i + 1);
    const v = values[i];
    if (i === 0) {
      cell.value = v;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    } else {
      cell.value = (v == null || v === "") ? null : Number.isFinite(Number(v)) ? Number(v) : v;
      cell.alignment = { vertical: "middle", horizontal: "right" };
      if (typeof cell.value === "number") cell.numFmt = '"$"#,##0.00;[Red]"-$"#,##0.00';
    }
    cell.font = { name: "Calibri", size: 11, color: { argb: TEXT_DARK }, bold: !!opts.bold };
    cell.border = { bottom: { style: "thin", color: { argb: BORDER_GRAY } } };
    if (opts.fill) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
    }
  }
}

function setColumnWidths(ws) {
  ws.getColumn(1).width = 44;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
}

function appendSection(ws, startRow, heading, rows) {
  if (!Array.isArray(rows) || !rows.length) return startRow;
  styleSectionHeader(ws, startRow, heading);
  let r = startRow + 1;
  styleHeaderRow(ws, r, ["Item", "Amount"]);
  r += 1;
  let total = 0;
  for (const row of rows) {
    const amt = dollars(row.amount);
    if (amt != null) total += amt;
    styleBodyRow(ws, r, [row.label || "—", amt]);
    r += 1;
  }
  styleBodyRow(ws, r, [`${heading} total`, total], { bold: true, fill: ACCENT_LIGHT });
  return r + 2;
}

// ---------- Builders per report type ----------

function buildPLWorkbook(p) {
  const pl = p.profitLoss || p.plData || p;
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Profit & Loss");
  setColumnWidths(ws);

  styleTitleRow(ws, 1, p.title || pl.title || "Profit & Loss");
  if (pl.period || p.period) styleSubtitleRow(ws, 2, pl.period || p.period);
  let r = (pl.summary || p.summary) ? 4 : 3;
  if (pl.summary || p.summary) {
    const cell = ws.getCell(`A3`);
    cell.value = pl.summary || p.summary;
    cell.alignment = { wrapText: true };
    cell.font = { name: "Calibri", size: 11, color: { argb: TEXT_DARK } };
    ws.mergeCells(`A3:D3`);
    ws.getRow(3).height = 36;
  }

  r = appendSection(ws, r, "Revenue", pl.revenue);
  r = appendSection(ws, r, "Expenses", pl.expenses);

  if (pl.netIncome != null) {
    styleBodyRow(ws, r, ["Net income", dollars(pl.netIncome)], { bold: true, fill: ACCENT_LIGHT });
  }
  return wb;
}

function buildCashflowWorkbook(p) {
  const cf = p.cashFlow || p;
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Cash Flow");
  setColumnWidths(ws);

  styleTitleRow(ws, 1, p.title || "Cash Flow Statement");
  if (cf.period) styleSubtitleRow(ws, 2, cf.period);
  let r = 4;
  if (cf.beginningCash != null) {
    styleBodyRow(ws, r, ["Beginning cash", dollars(cf.beginningCash)], { bold: true });
    r += 2;
  }
  r = appendSection(ws, r, "Operating", cf.operating);
  r = appendSection(ws, r, "Investing", cf.investing);
  r = appendSection(ws, r, "Financing", cf.financing);
  if (cf.endingCash != null) {
    styleBodyRow(ws, r, ["Ending cash", dollars(cf.endingCash)], { bold: true, fill: ACCENT_LIGHT });
  }
  return wb;
}

function buildBalanceSheetWorkbook(p) {
  const bs = p.balanceSheet || p;
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Balance Sheet");
  setColumnWidths(ws);

  styleTitleRow(ws, 1, p.title || "Balance Sheet");
  if (p.asOf) styleSubtitleRow(ws, 2, `As of ${p.asOf}`);
  let r = 4;
  r = appendSection(ws, r, "Current Assets", bs.currentAssets);
  r = appendSection(ws, r, "Non-Current Assets", bs.nonCurrentAssets);
  r = appendSection(ws, r, "Current Liabilities", bs.currentLiabilities);
  r = appendSection(ws, r, "Long-Term Liabilities", bs.longTermLiabilities);
  r = appendSection(ws, r, "Equity", bs.equity);
  return wb;
}

function buildCoAWorkbook(p) {
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Chart of Accounts");
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 44;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 18;

  styleTitleRow(ws, 1, p.title || "Chart of Accounts");
  if (p.asOf) styleSubtitleRow(ws, 2, `As of ${p.asOf}`);

  let rows = [];
  if (Array.isArray(p.accounts)) {
    rows = p.accounts.map(a => ({
      code: a.code || "",
      name: a.name || "",
      type: a.type || "",
      monthlyCap: a.monthlyCapCents != null ? Number(a.monthlyCapCents) / 100 : null,
      balance: a.balance != null ? a.balance : null,
    }));
  } else if (p.chartOfAccounts && typeof p.chartOfAccounts === "object") {
    for (const [group, list] of Object.entries(p.chartOfAccounts)) {
      if (!Array.isArray(list)) continue;
      for (const a of list) {
        rows.push({
          code: a.code || "",
          name: a.name || "",
          type: a.type || group,
          monthlyCap: a.monthlyCapCents != null ? Number(a.monthlyCapCents) / 100 : null,
          balance: a.balance != null ? a.balance : null,
        });
      }
    }
  }

  if (!rows.length) {
    const cell = ws.getCell("A4");
    cell.value = "No accounts on file yet.";
    cell.font = { italic: true, color: { argb: TEXT_MUTED } };
    return wb;
  }

  rows.sort((a, b) => String(a.code).localeCompare(String(b.code)));

  styleHeaderRow(ws, 4, ["Code", "Name", "Type", "Monthly Cap", "Balance"]);
  let r = 5;
  for (const row of rows) {
    for (let i = 0; i < 5; i++) {
      const cell = ws.getCell(r, i + 1);
      let v;
      if (i === 0) v = row.code || "—";
      else if (i === 1) v = row.name || "—";
      else if (i === 2) v = row.type || "—";
      else if (i === 3) v = row.monthlyCap;
      else v = typeof row.balance === "number" ? row.balance : null;
      cell.value = v;
      cell.font = { name: "Calibri", size: 11, color: { argb: TEXT_DARK } };
      cell.alignment = { vertical: "middle", horizontal: i >= 3 ? "right" : "left" };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER_GRAY } } };
      if ((i === 3 || i === 4) && typeof v === "number") {
        cell.numFmt = '"$"#,##0.00;[Red]"-$"#,##0.00';
      }
    }
    r += 1;
  }
  return wb;
}

async function workbookToBuffer(wb) {
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}

// ---------- Invoice PDF ----------

function fmtUsd(n) {
  if (n == null || isNaN(n)) return "—";
  const num = Number(n);
  const sign = num < 0 ? "-" : "";
  return `${sign}$${Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function buildInvoicePdf(p) {
  const inv = p.invoice || p;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: "LETTER", margins: { top: 56, bottom: 56, left: 56, right: 56 } });
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#1e293b").fontSize(22).text(p.title || "Invoice", { align: "left" });
    doc.moveDown(0.4);
    doc.fillColor("#64748b").fontSize(10);
    if (inv.number) doc.text(`Invoice #: ${inv.number}`);
    if (inv.date) doc.text(`Date: ${inv.date}`);
    if (inv.dueDate) doc.text(`Due: ${inv.dueDate}`);

    doc.moveDown(1);
    if (inv.billTo) {
      doc.fillColor("#1e293b").fontSize(11).text("Bill to:", { underline: true });
      const billTo = typeof inv.billTo === "string"
        ? inv.billTo
        : (inv.billTo.name ? `${inv.billTo.name}${inv.billTo.email ? `\n${inv.billTo.email}` : ""}${inv.billTo.address ? `\n${inv.billTo.address}` : ""}` : JSON.stringify(inv.billTo));
      doc.fillColor("#475569").text(billTo);
      doc.moveDown(0.8);
    }

    const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : [];
    if (lineItems.length) {
      const startY = doc.y + 6;
      const cols = [56, 320, 380, 440, 500];
      doc.fillColor("#1e293b").fontSize(10);
      doc.text("Description", cols[0], startY);
      doc.text("Qty", cols[2], startY, { width: 50, align: "right" });
      doc.text("Rate", cols[3], startY, { width: 60, align: "right" });
      doc.text("Amount", cols[4], startY, { width: 60, align: "right" });
      doc.moveTo(56, startY + 14).lineTo(556, startY + 14).strokeColor("#e2e8f0").stroke();
      let y = startY + 22;
      for (const li of lineItems) {
        doc.fillColor("#475569").fontSize(10);
        doc.text(li.description || "—", cols[0], y, { width: 250 });
        doc.text(String(li.qty ?? "—"), cols[2], y, { width: 50, align: "right" });
        doc.text(li.rate != null ? fmtUsd(li.rate) : "—", cols[3], y, { width: 60, align: "right" });
        doc.text(li.amount != null ? fmtUsd(li.amount) : "—", cols[4], y, { width: 60, align: "right" });
        y += 20;
      }
      doc.y = y + 8;
    }

    if (inv.total != null) {
      doc.moveDown(0.6);
      doc.fillColor("#1e293b").fontSize(12).text(`Total: ${fmtUsd(inv.total)}`, { align: "right" });
    }
    if (p.summary) {
      doc.moveDown(1.2);
      doc.fillColor("#475569").fontSize(10).text(p.summary, { align: "left" });
    }

    doc.end();
  });
}

// ---------- Format selection ----------

function formatFor(type) {
  if (type === "card:accounting-invoice") return { ext: "pdf", mime: PDF_MIME };
  return { ext: "xlsx", mime: XLSX_MIME };
}

async function buildBuffer(type, payload) {
  if (type === "card:accounting-pl") return workbookToBuffer(buildPLWorkbook(payload));
  if (type === "card:accounting-cashflow") return workbookToBuffer(buildCashflowWorkbook(payload));
  if (type === "card:accounting-balance-sheet") return workbookToBuffer(buildBalanceSheetWorkbook(payload));
  if (type === "card:accounting-coa") return workbookToBuffer(buildCoAWorkbook(payload));
  if (type === "card:accounting-invoice") return buildInvoicePdf(payload);
  throw new Error(`unsupported archive type: ${type}`);
}

async function archiveToCanvas({ canvasRenders, tenantId, userId }) {
  if (!Array.isArray(canvasRenders) || !canvasRenders.length) return { archived: 0 };
  if (!tenantId || tenantId === "vault") return { archived: 0, reason: "no_tenant" };

  const storage = require("../../lib/storage");
  const db = admin.firestore();
  const accounting = canvasRenders.filter(r => isArchivableAccounting(r?.type));
  if (!accounting.length) return { archived: 0 };

  let archived = 0;
  for (const r of accounting) {
    try {
      const { ext, mime } = formatFor(r.type);
      const buffer = await buildBuffer(r.type, r.payload || {});
      const shortType = r.type.replace(/^card:accounting-/, "");
      const today = new Date().toISOString().slice(0, 10);
      const p = r.payload || {};
      const periodStr = String(p.period || p.profitLoss?.period || p.cashFlow?.period || p.balanceSheet?.asOf || p.asOf || "").trim();
      const summaryStr = String(p.summary || p.profitLoss?.summary || p.cashFlow?.summary || p.balanceSheet?.summary || "");
      const yearMatch = periodStr.match(/\b(20\d{2})\b/);
      const periodYear = yearMatch ? yearMatch[1] : null;
      const variant = inferVariant(periodStr, summaryStr);
      const typeLabel = TYPE_LABELS[shortType] || shortType;
      const periodDisplay = periodStr || (periodYear ? `FY ${periodYear}` : "");
      const variantSuffix = variant === "actual" ? "" : ` · ${variant}`;
      const displayTitle = periodDisplay ? `${typeLabel} · ${periodDisplay}${variantSuffix}` : typeLabel;
      const periodSlug = slugifyPeriod(periodStr, periodYear || today.slice(0, 4));
      const filename = `${shortType}-${periodSlug}-${variant}-${today}.${ext}`;

      // DEDUP: soft-delete any prior accounting report for this tenant
      // matching the same (type, period, variant). Even when extension changed
      // (.md → .xlsx), the dedup still fires on reportType/Period/Variant.
      const existing = await db.collection("storageObjects")
        .where("orgId", "==", tenantId)
        .where("createdByWorker", "==", "platform-accounting")
        .where("status", "==", "active")
        .get();
      const stale = existing.docs.filter(d => {
        const data = d.data();
        return data.reportType === shortType
            && (data.reportPeriod || "") === periodStr
            && (data.reportVariant || "actual") === variant;
      });
      for (const s of stale) {
        await s.ref.update({
          status: "superseded",
          supersededAt: admin.firestore.FieldValue.serverTimestamp(),
          supersededBy: "auto-redeploy",
        });
      }

      const result = await storage.upload({
        uid: userId,
        scope: "org",
        orgId: tenantId,
        subdir: "accounting/reports",
        filename,
        mimeType: mime,
        buffer,
        createdByWorker: "platform-accounting",
        tags: ["accounting", "report", shortType, `variant-${variant}`, ...(periodYear ? [`period-${periodYear}`] : [])],
      });

      if (result?.ok && result.objectId) {
        await db.doc(`storageObjects/${result.objectId}`).update({
          displayTitle,
          reportType: shortType,
          reportPeriod: periodStr,
          reportPeriodYear: periodYear,
          reportVariant: variant,
          reportFormat: ext,
        });
      }
      archived += 1;
    } catch (e) {
      console.warn(`[canvasArchive] failed to mirror ${r.type}:`, e.message);
    }
  }
  return { archived };
}

module.exports = { archiveToCanvas, isArchivableAccounting, ARCHIVE_TYPES };
