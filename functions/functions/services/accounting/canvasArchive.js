"use strict";

/**
 * canvasArchive.js — Phase D-1 of the Accounting build.
 *
 * Mirrors structured Accounting canvas cards (card:accounting-pl,
 * -balance-sheet, -cashflow, -invoice, -coa) into Drive so the user has
 * a durable artifact of every report the worker produces. We persist
 * markdown (human-readable, openable in any editor, renderable inline)
 * for now. The Reports tab's inline markdown renderer turns these into
 * styled tables. Native .xlsx output is queued for the next pass so we
 * can preserve in-app preview while giving users a real spreadsheet to
 * download.
 *
 * Only fires when the canvas type starts with "card:accounting-". Any
 * other card type is left alone.
 */

const admin = require("firebase-admin");

const ARCHIVE_TYPES = new Set([
  "card:accounting-pl",
  "card:accounting-balance-sheet",
  "card:accounting-cashflow",
  "card:accounting-invoice",
  "card:accounting-coa",
]);

function dollars(n) {
  if (n == null || isNaN(n)) return "—";
  const num = Number(n);
  const sign = num < 0 ? "-" : "";
  return `${sign}$${Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtSection(heading, rows) {
  if (!Array.isArray(rows) || !rows.length) return "";
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const body = rows.map(r => `| ${r.label} | ${dollars(r.amount)} |`).join("\n");
  return `\n### ${heading}\n\n| Item | Amount |\n|------|------:|\n${body}\n| **${heading} total** | **${dollars(total)}** |\n`;
}

function renderPL(p = {}) {
  const lines = [];
  lines.push(`# ${p.title || "Profit & Loss"}`);
  if (p.period) lines.push(`*${p.period}*`);
  if (p.summary) lines.push(`\n${p.summary}\n`);
  lines.push(fmtSection("Revenue", p.revenue));
  lines.push(fmtSection("Expenses", p.expenses));
  if (p.netIncome != null) lines.push(`\n**Net income: ${dollars(p.netIncome)}**\n`);
  return lines.join("\n");
}

function renderBS(p = {}) {
  const bs = p.balanceSheet || p;
  const lines = [];
  lines.push(`# ${p.title || "Balance Sheet"}`);
  if (p.asOf) lines.push(`*As of ${p.asOf}*`);
  lines.push(fmtSection("Current Assets", bs.currentAssets));
  lines.push(fmtSection("Non-Current Assets", bs.nonCurrentAssets));
  lines.push(fmtSection("Current Liabilities", bs.currentLiabilities));
  lines.push(fmtSection("Long-Term Liabilities", bs.longTermLiabilities));
  lines.push(fmtSection("Equity", bs.equity));
  return lines.join("\n");
}

function renderCF(p = {}) {
  const cf = p.cashFlow || p;
  const lines = [];
  lines.push(`# ${p.title || "Cash Flow Statement"}`);
  if (cf.period) lines.push(`*${cf.period}*`);
  if (cf.beginningCash != null) lines.push(`\nBeginning cash: ${dollars(cf.beginningCash)}\n`);
  lines.push(fmtSection("Operating", cf.operating));
  lines.push(fmtSection("Investing", cf.investing));
  lines.push(fmtSection("Financing", cf.financing));
  if (cf.endingCash != null) lines.push(`\n**Ending cash: ${dollars(cf.endingCash)}**\n`);
  return lines.join("\n");
}

// CoA payloads from the worker come through in a couple of shapes:
// - { accounts: [{ code, name, type, monthlyCapCents }] }  (preferred — what
//   our seed/template service emits)
// - { chartOfAccounts: { assets: [...], liabilities: [...], equity: [...],
//   revenue: [...], expenses: [...] } }  (what the chat model sometimes
//   emits when it doesn't read our schema)
// Render whichever shape we find as a real markdown table. Never fall through
// to the JSON dump — that produces unreadable artifacts.
function renderCoA(p = {}) {
  const lines = [`# ${p.title || "Chart of Accounts"}`];
  if (p.asOf) lines.push(`*As of ${p.asOf}*`);

  // Flatten any shape into a single rows array
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
    lines.push("\n_No accounts on file yet._");
    return lines.join("\n");
  }

  // Sort by code so the table reads naturally
  rows.sort((a, b) => String(a.code).localeCompare(String(b.code)));

  const showCap = rows.some(r => r.monthlyCap != null);
  const showBalance = rows.some(r => r.balance != null && r.balance !== "");

  const headers = ["Code", "Name", "Type"];
  const align   = ["------", "------", "------"];
  if (showCap)     { headers.push("Monthly Cap"); align.push("------:"); }
  if (showBalance) { headers.push("Balance");     align.push("------:"); }

  lines.push("");
  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`|${align.map(a => a).join("|")}|`);
  for (const r of rows) {
    const row = [r.code || "—", r.name || "—", r.type || "—"];
    if (showCap)     row.push(r.monthlyCap != null ? dollars(r.monthlyCap) : "—");
    if (showBalance) row.push(r.balance != null && r.balance !== "" ? (typeof r.balance === "number" ? dollars(r.balance) : String(r.balance)) : "—");
    lines.push(`| ${row.join(" | ")} |`);
  }
  return lines.join("\n");
}

function renderInvoice(p = {}) {
  const inv = p.invoice || p;
  const lines = [];
  lines.push(`# ${p.title || "Invoice"}`);
  if (inv.number) lines.push(`**Invoice #:** ${inv.number}`);
  if (inv.date) lines.push(`**Date:** ${inv.date}`);
  if (inv.dueDate) lines.push(`**Due:** ${inv.dueDate}`);
  if (inv.billTo) {
    lines.push(`\n**Bill to:**\n${typeof inv.billTo === "string" ? inv.billTo : JSON.stringify(inv.billTo, null, 2)}`);
  }
  if (Array.isArray(inv.lineItems) && inv.lineItems.length) {
    lines.push("\n| Description | Qty | Rate | Amount |");
    lines.push("|------|---:|---:|---:|");
    for (const li of inv.lineItems) {
      lines.push(`| ${li.description || "—"} | ${li.qty ?? "—"} | ${li.rate != null ? dollars(li.rate) : "—"} | ${li.amount != null ? dollars(li.amount) : "—"} |`);
    }
  }
  if (inv.total != null) lines.push(`\n**Total: ${dollars(inv.total)}**`);
  if (p.summary) lines.push(`\n${p.summary}`);
  return lines.join("\n");
}

function renderToMarkdown(type, payload) {
  if (type === "card:accounting-pl") return renderPL(payload);
  if (type === "card:accounting-balance-sheet") return renderBS(payload);
  if (type === "card:accounting-cashflow") return renderCF(payload);
  if (type === "card:accounting-coa") return renderCoA(payload);
  if (type === "card:accounting-invoice") return renderInvoice(payload);
  return `# ${payload.title || type}\n\n${payload.summary || ""}\n`;
}

function isArchivableAccounting(type) {
  return ARCHIVE_TYPES.has(type);
}

async function archiveToCanvas({ canvasRenders, tenantId, userId }) {
  if (!Array.isArray(canvasRenders) || !canvasRenders.length) return { archived: 0 };
  if (!tenantId || tenantId === "vault") return { archived: 0, reason: "no_tenant" };

  const storage = require("../../lib/storage");
  const accounting = canvasRenders.filter(r => isArchivableAccounting(r?.type));
  if (!accounting.length) return { archived: 0 };

  let archived = 0;
  for (const r of accounting) {
    try {
      const md = renderToMarkdown(r.type, r.payload || {});
      const buffer = Buffer.from(md, "utf8");
      const shortType = r.type.replace(/^card:accounting-/, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${shortType}-${dateStr}.md`;
      await storage.upload({
        uid: userId,
        scope: "org",
        orgId: tenantId,
        subdir: "accounting/reports",
        filename,
        mimeType: "text/markdown",
        buffer,
        createdByWorker: "platform-accounting",
        tags: ["accounting", "report", shortType],
      });
      archived += 1;
    } catch (e) {
      console.warn(`[canvasArchive] failed to mirror ${r.type}:`, e.message);
    }
  }
  return { archived };
}

module.exports = { archiveToCanvas, isArchivableAccounting, renderToMarkdown, ARCHIVE_TYPES };
