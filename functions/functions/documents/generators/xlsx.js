"use strict";

const ExcelJS = require("exceljs");

function hexToArgb(hex) {
  return "FF" + (hex || "000000").replace("#", "");
}

async function generateXlsx(templateDef, content, branding) {
  const styles = templateDef.defaultStyles || {};
  const accentColor = hexToArgb(branding.accentColor || styles.accentColor || "#7c3aed");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = branding.companyName || "TitleApp";
  workbook.created = new Date();

  const templateId = templateDef.id;

  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: accentColor } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: "FF999999" } },
    },
  };

  const currencyFormat = '"$"#,##0.00';
  const percentFormat = "0.00%";
  const numberFormat = "#,##0";

  function autoWidth(ws) {
    ws.columns.forEach((col) => {
      let max = 12;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = String(cell.value || "").length;
        if (len > max) max = Math.min(len + 2, 40);
      });
      col.width = max;
    });
  }

  function applyHeaderRow(ws, rowNum) {
    const row = ws.getRow(rowNum);
    row.eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });
    row.height = 24;
  }

  function detectFormat(val) {
    if (typeof val === "string") {
      if (val.startsWith("$")) return "currency";
      if (val.endsWith("%")) return "percent";
    }
    return null;
  }

  function parseNumericValue(val) {
    if (typeof val === "number") return val;
    if (typeof val !== "string") return val;
    const cleaned = val.replace(/[$,%]/g, "").trim();
    const num = Number(cleaned);
    if (isNaN(num)) return val;
    if (val.endsWith("%")) return num / 100;
    return num;
  }

  if (templateId === "model-cashflow") {
    // Assumptions sheet
    const assumptions = content.assumptions || {};
    if (Object.keys(assumptions).length > 0) {
      const ws = workbook.addWorksheet("Assumptions");
      ws.addRow(["Parameter", "Value"]);
      applyHeaderRow(ws, 1);
      for (const [key, val] of Object.entries(assumptions)) {
        const row = ws.addRow([key, parseNumericValue(val)]);
        const fmt = detectFormat(val);
        if (fmt === "currency") row.getCell(2).numFmt = currencyFormat;
        if (fmt === "percent") row.getCell(2).numFmt = percentFormat;
      }
      autoWidth(ws);
    }

    // Projections sheet
    const projections = content.projections || [];
    if (projections.length > 0) {
      const ws = workbook.addWorksheet("Projections");
      const headers = Object.keys(projections[0] || {});
      ws.addRow(headers);
      applyHeaderRow(ws, 1);
      for (const period of projections) {
        const vals = headers.map((h) => parseNumericValue(period[h]));
        const row = ws.addRow(vals);
        headers.forEach((h, i) => {
          const fmt = detectFormat(period[h]);
          if (fmt === "currency") row.getCell(i + 1).numFmt = currencyFormat;
          if (fmt === "percent") row.getCell(i + 1).numFmt = percentFormat;
        });
      }
      autoWidth(ws);
    }

    // Summary sheet
    const summary = content.summary || {};
    if (Object.keys(summary).length > 0) {
      const ws = workbook.addWorksheet("Summary");
      ws.addRow(["Metric", "Value"]);
      applyHeaderRow(ws, 1);
      for (const [key, val] of Object.entries(summary)) {
        const row = ws.addRow([key, parseNumericValue(val)]);
        const fmt = detectFormat(val);
        if (fmt === "currency") row.getCell(2).numFmt = currencyFormat;
        if (fmt === "percent") row.getCell(2).numFmt = percentFormat;
      }
      autoWidth(ws);
    }

  } else if (templateId === "model-proforma") {
    // Assumptions
    const assumptions = content.assumptions || {};
    if (Object.keys(assumptions).length > 0) {
      const ws = workbook.addWorksheet("Assumptions");
      ws.addRow(["Parameter", "Value"]);
      applyHeaderRow(ws, 1);
      for (const [key, val] of Object.entries(assumptions)) {
        ws.addRow([key, parseNumericValue(val)]);
      }
      autoWidth(ws);
    }

    // Income Statement
    const income = content.incomeStatement || {};
    if (Object.keys(income).length > 0) {
      const ws = workbook.addWorksheet("Income Statement");
      if (Array.isArray(income)) {
        // Array of rows [{label, ...periods}]
        const headers = Object.keys(income[0] || {});
        ws.addRow(headers);
        applyHeaderRow(ws, 1);
        for (const row of income) {
          ws.addRow(headers.map((h) => parseNumericValue(row[h])));
        }
      } else {
        // Object {lineItem: value}
        ws.addRow(["Line Item", "Amount"]);
        applyHeaderRow(ws, 1);
        for (const [key, val] of Object.entries(income)) {
          const row = ws.addRow([key, parseNumericValue(val)]);
          row.getCell(2).numFmt = currencyFormat;
        }
      }
      autoWidth(ws);
    }

    // Balance Sheet
    const balance = content.balanceSheet || {};
    if (Object.keys(balance).length > 0) {
      const ws = workbook.addWorksheet("Balance Sheet");
      ws.addRow(["Line Item", "Amount"]);
      applyHeaderRow(ws, 1);
      for (const [key, val] of Object.entries(balance)) {
        const row = ws.addRow([key, parseNumericValue(val)]);
        row.getCell(2).numFmt = currencyFormat;
      }
      autoWidth(ws);
    }

    // Cash Flow
    const cf = content.cashFlow || {};
    if (Object.keys(cf).length > 0) {
      const ws = workbook.addWorksheet("Cash Flow");
      ws.addRow(["Line Item", "Amount"]);
      applyHeaderRow(ws, 1);
      for (const [key, val] of Object.entries(cf)) {
        const row = ws.addRow([key, parseNumericValue(val)]);
        row.getCell(2).numFmt = currencyFormat;
      }
      autoWidth(ws);
    }

  } else {
    // Fallback: dump content as key-value
    const ws = workbook.addWorksheet("Data");
    ws.addRow(["Field", "Value"]);
    applyHeaderRow(ws, 1);
    const flat = flattenObject(content);
    for (const [key, val] of Object.entries(flat)) {
      ws.addRow([key, val]);
    }
    autoWidth(ws);
  }

  // Disclosure sheet
  const disclosureWs = workbook.addWorksheet("Disclosure");
  disclosureWs.addRow([branding.footerText || "Generated by TitleApp Digital Worker. AI-assisted analysis — human review recommended."]);
  disclosureWs.addRow([branding.disclaimer || ""]);
  disclosureWs.addRow([`Generated: ${new Date().toISOString()}`]);
  disclosureWs.getColumn(1).width = 80;

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer) };
}

function flattenObject(obj, prefix = "") {
  const result = {};
  for (const [key, val] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, path));
    } else {
      result[path] = Array.isArray(val) ? JSON.stringify(val) : val;
    }
  }
  return result;
}

module.exports = { generateXlsx };
