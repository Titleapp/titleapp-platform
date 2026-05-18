// Pre-built financials xlsx parser.
//
// Phase 1 of CODEX 51.1. Reads xlsx files that already contain categorized
// financials (P&L by year, balance sheet, budget, etc.) and returns a
// structured object describing each sheet. No Firestore writes — this
// service only parses + announces. The caller decides what to commit.
//
// Why deterministic parsing rather than handing the file to Claude vision:
// the worker hallucinated $252,140 in 3-year burn when the truth was
// $35,615 — off by 7× — because LLM text-reading on structured spreadsheet
// data is unreliable. ExcelJS reads cells by address, no inference involved.

const admin = require("firebase-admin");
const ExcelJS = require("exceljs");

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function getDb() { return admin.firestore(); }

// ---------- Sheet-intent inference ----------
//
// Action values:
//   import-transactions  P&L year sheet → list of dated transactions
//   import-balance       balance-sheet rows → snapshot of assets/liabilities/equity
//   import-budget        forward-looking budget → forwardBudgets collection
//   skip                 informational/derived/doc — never auto-imports
//
// Intent is derived from the sheet NAME first, with header-row text as a
// reinforcing signal for the "informational only" pattern.

function classifySheet(sheet) {
  const name = (sheet.name || "").trim();
  const lc = name.toLowerCase();

  // Explicit informational-only / out-of-scope sheets — never import.
  if (lc.includes("personal") || lc.includes("informational") ||
      lc.includes("out of scope") || lc.includes("oos") ||
      lc.includes("memo") || lc.includes("memorandum")) {
    return { name, intent: "informational", action: "skip",
             reason: "Sheet name signals informational/out-of-scope content." };
  }
  if (lc.includes("methodology") || lc.includes("readme") || lc.includes("notes")) {
    return { name, intent: "documentation", action: "skip",
             reason: "Documentation sheet — not financial data." };
  }
  if (lc.includes("cashflow") || lc.includes("cash flow")) {
    return { name, intent: "derived", action: "skip",
             reason: "Cash flow is derived from transactions — no separate import needed." };
  }

  // Forward-looking budgets.
  const budgetMatch = lc.match(/(?:^|\s)(\d{4})\s*budget|budget\s*(\d{4})/);
  if (lc.includes("budget") || lc.includes("forecast") || lc.includes("projection")) {
    const year = budgetMatch ? Number(budgetMatch[1] || budgetMatch[2]) : null;
    return { name, intent: "budget", action: "import-budget",
             year, reason: `Forward-looking budget${year ? ` for ${year}` : ""}.` };
  }

  // Balance sheet — usually combined with a summary in single-sheet exports.
  if (lc.includes("balance sheet") || lc.includes("balance") ||
      (lc.includes("summary") && lc.includes("balance"))) {
    return { name, intent: "balance-sheet", action: "import-balance",
             reason: "Balance sheet rows — assets, liabilities, equity." };
  }
  // Summary-only sheets (no balance sheet content) get treated as overview docs.
  if (lc.startsWith("summary") || lc === "overview") {
    return { name, intent: "overview", action: "skip",
             reason: "Summary/overview sheet — review only, no import." };
  }

  // P&L year sheets. Match patterns like "P&L 2024", "PL 2024", "Profit Loss 2024".
  const yearMatch = lc.match(/(?:p\s*&?\s*l|profit.*loss|pnl)\D*(\d{4})/);
  const standaloneYear = lc.match(/^(\d{4})$/) || lc.match(/^fy\s*(\d{4})$/);
  if (yearMatch || standaloneYear) {
    const year = Number(yearMatch ? yearMatch[1] : standaloneYear[1]);
    return { name, intent: "pnl", action: "import-transactions",
             year, reason: `P&L line items for ${year}.` };
  }

  // Unknown — default to skip with a flag so the user can mark it manually.
  return { name, intent: "unknown", action: "skip",
           reason: "Sheet name did not match any known pattern — review manually." };
}

// ---------- Header-row finder ----------
//
// Pre-built reports often have a title row, blank row, etc. before the
// actual headers. Find the first row that looks like headers by matching
// expected column tokens.

function findHeaderRow(sheet, expectedTokens, maxScan = 10) {
  for (let r = 1; r <= Math.min(sheet.rowCount || maxScan, maxScan); r++) {
    const row = sheet.getRow(r);
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(String(cell.value ?? "").trim().toLowerCase());
    });
    const joined = values.join(" ");
    const hits = expectedTokens.filter(t => joined.includes(t.toLowerCase()));
    if (hits.length >= Math.min(2, expectedTokens.length)) {
      return { rowNumber: r, values };
    }
  }
  return null;
}

function cellToNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value.result != null) return Number(value.result);
  const s = String(value).replace(/[$,]/g, "").trim();
  if (s === "" || s.toLowerCase() === "tbd" || s.toLowerCase() === "contingent") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellToString(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.text != null) return String(value.text).trim();
  if (typeof value === "object" && value.result != null) return String(value.result).trim();
  return String(value).trim();
}

// ---------- P&L year sheet extractor ----------
//
// V11 layout: [Account / Transaction, Date, Merchant, Amount, Source]
// Data rows interspersed with category banners ("--- Software & Cloud ---")
// and subtotals ("Software & Cloud subtotal"). Banners group transactions —
// the most recent banner is the category for the rows beneath it.

function extractPL(sheet, year) {
  const header = findHeaderRow(sheet, ["date", "amount"]);
  if (!header) {
    return { transactionCount: 0, transactions: [], totals: {},
             warning: "Could not locate header row — expected columns including Date and Amount." };
  }
  const cols = {};
  header.values.forEach((v, i) => {
    const col = i + 1; // ExcelJS columns are 1-indexed
    if (v.includes("date")) cols.date = col;
    else if (v.includes("amount")) cols.amount = col;
    else if (v.includes("merchant")) cols.merchant = col;
    else if (v.includes("account") || v.includes("description") || v.includes("transaction")) cols.description = col;
    else if (v.includes("source")) cols.source = col;
  });

  const transactions = [];
  const categoryTotals = {};
  let currentCategory = null;
  let grandTotal = 0;

  const startRow = header.rowNumber + 1;
  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const descCell = cellToString(row.getCell(cols.description || 1).value);
    const amountCell = cellToNumber(row.getCell(cols.amount || 4).value);

    // Category banner row: "--- Category Name ---"
    const bannerMatch = descCell.match(/^---\s*(.+?)\s*---\s*$/);
    if (bannerMatch) {
      currentCategory = bannerMatch[1].trim();
      categoryTotals[currentCategory] = 0;
      continue;
    }

    // Subtotal row: "  Category subtotal"
    if (descCell.match(/subtotal\s*$/i)) continue;

    // Grand total row: "TOTAL BUSINESS OPEX"
    if (descCell.match(/^total/i)) {
      if (amountCell != null) grandTotal = amountCell;
      continue;
    }

    // Personal-section banner inside a P&L tab: stop processing this sheet
    // for transaction extraction — the rest is informational.
    if (descCell.match(/personal.*out.*scope|out.*scope.*personal|informational only/i)) {
      break;
    }

    // Skip blank rows + footnote rows
    if (!descCell && amountCell == null) continue;
    if (amountCell == null) continue;
    if (descCell.startsWith("(")) continue; // parenthetical notes

    const dateCell = cellToString(row.getCell(cols.date || 2).value);
    const merchantCell = cellToString(row.getCell(cols.merchant || 3).value);
    const sourceCell = cellToString(row.getCell(cols.source || 5).value);

    transactions.push({
      date: dateCell || null,
      description: descCell,
      merchant: merchantCell,
      amountCents: Math.round(amountCell * 100),
      source: sourceCell,
      category: currentCategory,
      year,
    });
    if (currentCategory) categoryTotals[currentCategory] += amountCell;
  }

  return {
    year,
    transactionCount: transactions.length,
    transactions,
    categoryTotals,
    grandTotal,
  };
}

// ---------- Balance sheet extractor ----------
//
// V11 layout: ASSETS / LIABILITIES / MEMBER'S EQUITY sections, each with
// rows of [Item Name, Amount, Note]. Amount can be a number, "TBD", or
// "Contingent". All three are captured — non-numeric values are flagged.

function extractBalanceSheet(sheet) {
  const lines = [];
  let currentSection = null;

  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const colA = cellToString(row.getCell(1).value);
    const colB = row.getCell(2).value;
    const colC = cellToString(row.getCell(3).value);

    if (!colA) continue;

    // Section detection
    const upper = colA.toUpperCase();
    if (upper === "ASSETS" || upper === "LIABILITIES" ||
        upper.startsWith("MEMBER'S EQUITY") || upper.startsWith("MEMBERS EQUITY") ||
        upper.startsWith("MEMORANDUM") || upper.startsWith("NET POSITION")) {
      currentSection = upper;
      continue;
    }

    // Skip total / subtotal / header rows for the line collection
    if (/^total/i.test(colA) || /subtotal/i.test(colA)) {
      lines.push({
        section: currentSection,
        name: colA,
        valueRaw: cellToString(colB),
        valueNumeric: cellToNumber(colB),
        note: colC,
        isTotal: true,
      });
      continue;
    }

    // Only capture rows that have either a numeric value or "TBD"/"Contingent"
    const valueRaw = cellToString(colB);
    const valueNumeric = cellToNumber(colB);
    if (!currentSection) continue;
    if (valueRaw === "" && valueNumeric == null) continue;

    lines.push({
      section: currentSection,
      name: colA,
      valueRaw,
      valueNumeric,
      note: colC,
      isTotal: false,
    });
  }

  // Roll up by section
  const sections = {};
  lines.forEach(l => {
    if (l.isTotal) return;
    if (!sections[l.section]) sections[l.section] = { items: [], knownTotal: 0, hasTBD: false };
    sections[l.section].items.push(l);
    if (typeof l.valueNumeric === "number") sections[l.section].knownTotal += l.valueNumeric;
    else sections[l.section].hasTBD = true;
  });

  return { lines, sections };
}

// ---------- Budget extractor ----------
//
// V11 2026 Budget layout: [Line item, Monthly run-rate, Months in 2026,
// 2026 total, Annualized 2027 run-rate] with section banners (PEOPLE,
// INFRASTRUCTURE, MARKETING, PROFESSIONAL SERVICES, CONTINGENCY).

function extractBudget(sheet, year) {
  const header = findHeaderRow(sheet, ["monthly", "total"], 12);
  const cols = {};
  if (header) {
    header.values.forEach((v, i) => {
      const col = i + 1;
      if (v.includes("line") || v.includes("item")) cols.item = col;
      else if (v.includes("monthly")) cols.monthly = col;
      else if (v.includes("month") && v.includes("in")) cols.months = col;
      else if (v.includes("total") && !v.includes("annual")) cols.total = col;
      else if (v.includes("annual")) cols.annual = col;
    });
  }

  const lineItems = [];
  let currentSection = null;
  const sectionTotals = {};
  let grandPeriodTotal = 0;
  let grandAnnualTotal = 0;

  // Section keywords (case-insensitive substring match). First match wins.
  // Section banners in V11 look like "PEOPLE (salaries + benefits)" — the
  // leading keyword is uppercase but the parenthetical isn't, so we check
  // for uppercase keyword presence rather than full-string uppercase.
  const SECTION_KEYWORDS = ["PEOPLE", "INFRASTRUCTURE", "MARKETING", "SALES",
    "PROFESSIONAL SERVICES", "CONTINGENCY", "TOOLS", "DATA", "OPERATIONS"];

  function looksLikeSectionBanner(s) {
    if (!s) return false;
    if (/^\d/.test(s)) return false;       // grand-total lines start with a year
    if (/^subtotal/i.test(s)) return false;
    if (s.includes("$")) return false;
    // Has to start with one of our known section keywords
    return SECTION_KEYWORDS.some(k => s.toUpperCase().startsWith(k));
  }

  function looksLikeGrandTotal(s) {
    if (!s) return false;
    const upper = s.toUpperCase();
    return /TOTAL|RUN-RATE|RUN RATE|ANNUALIZED/.test(upper) &&
           !/^subtotal/i.test(s);
  }

  const startRow = (header ? header.rowNumber : 5) + 1;
  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const itemName = cellToString(row.getCell(cols.item || 1).value);
    if (!itemName) continue;

    // Grand totals at the bottom (e.g. "2026 H2 TOTAL (Jul-Dec)",
    // "2027 ANNUALIZED RUN-RATE"). Check before section banner because the
    // grand-total row may also contain a section-like keyword.
    if (looksLikeGrandTotal(itemName)) {
      const periodVal = cellToNumber(row.getCell(cols.total || 4).value);
      const annualVal = cellToNumber(row.getCell(cols.annual || 5).value);
      if (periodVal != null && periodVal > grandPeriodTotal) grandPeriodTotal = periodVal;
      if (annualVal != null && annualVal > grandAnnualTotal) grandAnnualTotal = annualVal;
      continue;
    }

    if (looksLikeSectionBanner(itemName)) {
      currentSection = itemName;
      sectionTotals[currentSection] = { period: 0, annual: 0, items: 0 };
      continue;
    }

    // Subtotal rows
    if (/^subtotal/i.test(itemName)) continue;

    const monthly = cellToNumber(row.getCell(cols.monthly || 2).value);
    const months = cellToNumber(row.getCell(cols.months || 3).value);
    const total = cellToNumber(row.getCell(cols.total || 4).value);
    const annual = cellToNumber(row.getCell(cols.annual || 5).value);

    // Need at least one numeric column to be a real line item
    if (monthly == null && total == null && annual == null) continue;

    lineItems.push({
      section: currentSection,
      name: itemName,
      monthlyCents: monthly != null ? Math.round(monthly * 100) : null,
      months,
      periodTotalCents: total != null ? Math.round(total * 100) : null,
      annualTotalCents: annual != null ? Math.round(annual * 100) : null,
    });
    if (currentSection && sectionTotals[currentSection]) {
      if (total != null) sectionTotals[currentSection].period += total;
      if (annual != null) sectionTotals[currentSection].annual += annual;
      sectionTotals[currentSection].items += 1;
    }
  }

  return {
    year,
    lineItems,
    sectionTotals,
    grandPeriodTotal,
    grandAnnualTotal,
  };
}

// ---------- Main entry point ----------
//
// Returns a parse plan describing every sheet in the workbook, with typed
// extraction results for sheets that have actionable data. No commits.

async function parsePrebuiltFinancials({ buffer, filename, contentType }) {
  if (!buffer || !buffer.length) throw new Error("Empty file buffer");
  const lc = (contentType || "").toLowerCase();
  const isXlsx = lc.includes("spreadsheet") || lc === XLSX_MIME ||
                 (filename || "").toLowerCase().endsWith(".xlsx");
  if (!isXlsx) {
    throw new Error("parsePrebuiltFinancials requires an .xlsx file");
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const sheets = [];
  wb.worksheets.forEach(sheet => {
    const classification = classifySheet(sheet);
    const out = { ...classification, rowCount: sheet.rowCount, columnCount: sheet.columnCount };

    try {
      if (classification.action === "import-transactions") {
        out.data = extractPL(sheet, classification.year);
      } else if (classification.action === "import-balance") {
        out.data = extractBalanceSheet(sheet);
      } else if (classification.action === "import-budget") {
        out.data = extractBudget(sheet, classification.year);
      }
    } catch (e) {
      out.error = `Extraction failed: ${e.message}`;
    }

    sheets.push(out);
  });

  // Summary roll-up across all P&L sheets so the worker can announce totals
  // accurately without re-summing in the chat handler.
  let totalTransactions = 0;
  let totalBusinessOpex = 0;
  const opexByYear = {};
  sheets.forEach(s => {
    if (s.action === "import-transactions" && s.data) {
      totalTransactions += s.data.transactionCount || 0;
      const total = s.data.grandTotal || 0;
      totalBusinessOpex += total;
      if (s.year) opexByYear[s.year] = total;
    }
  });

  // Balance sheet roll-up
  let balanceSummary = null;
  const bsSheet = sheets.find(s => s.action === "import-balance" && s.data);
  if (bsSheet) {
    const sects = bsSheet.data.sections || {};
    balanceSummary = {
      assets: sects["ASSETS"] || null,
      liabilities: sects["LIABILITIES"] || null,
      equity: sects["MEMBER'S EQUITY (LLC BOOKS, CASH BASIS)"] ||
              sects["MEMBER'S EQUITY"] || null,
    };
  }

  // Budget roll-up
  let budgetSummary = null;
  const budgetSheet = sheets.find(s => s.action === "import-budget" && s.data);
  if (budgetSheet) {
    budgetSummary = {
      year: budgetSheet.year,
      periodTotal: budgetSheet.data.grandPeriodTotal,
      annualTotal: budgetSheet.data.grandAnnualTotal,
      monthlyRunRate: budgetSheet.data.grandAnnualTotal
        ? budgetSheet.data.grandAnnualTotal / 12 : null,
    };
  }

  return {
    filename,
    sheetCount: sheets.length,
    sheets,
    rollup: {
      totalTransactions,
      totalBusinessOpex,
      opexByYear,
      balanceSummary,
      budgetSummary,
    },
  };
}

// ---------- Commit functions (Phase 2) ----------
//
// Three append-only writes per import:
//   1. transactions   — P&L line items, source="import_prebuilt"
//   2. balanceSnapshots — one doc per upload, captures all asset/liability/equity rows
//   3. forwardBudgets  — one doc per budget sheet, captures lineItems + totals
//
// Idempotency: prior imports with the same sourceFileId are checked first.
// If found, return { skipped: true, reason: "already_imported" } so the
// user can't accidentally double-import the same xlsx.

async function alreadyImported({ tenantId, sourceFileId }) {
  if (!sourceFileId) return false;
  const db = getDb();
  // Check the balanceSnapshots collection first — fastest signal because
  // only prebuilt imports write there.
  const bsSnap = await db.collection("balanceSnapshots")
    .where("tenantId", "==", tenantId)
    .where("sourceFileId", "==", sourceFileId)
    .limit(1)
    .get();
  if (!bsSnap.empty) return true;
  // Fallback: check transactions for source=import_prebuilt + this fileId.
  const txSnap = await db.collection("transactions")
    .where("tenantId", "==", tenantId)
    .where("sourceFileId", "==", sourceFileId)
    .where("source", "==", "import_prebuilt")
    .limit(1)
    .get();
  return !txSnap.empty;
}

function dateToMonthlyTotals(transactions) {
  // Helper used for category sanity-checks in commit.
  // Bucketed by YYYY-MM. Useful for the Dashboard rollup downstream.
  const out = {};
  transactions.forEach(t => {
    if (!t.date) return;
    const m = t.date.match(/^(\d{4})-(\d{2})|^(\d{1,2})\/\d{1,2}\/(\d{4})/);
    if (!m) return;
    const ym = m[1] ? `${m[1]}-${m[2]}` : `${m[4]}-${String(m[3]).padStart(2, "0")}`;
    out[ym] = (out[ym] || 0) + (t.amountCents || 0);
  });
  return out;
}

function normalizeDateForFirestore(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // V11 P&L uses M/D/YYYY in the Date column
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  // ISO already
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

async function commitPrebuiltFinancials({
  tenantId, userId, fileId, fileName, plan, sheetActions,
}) {
  if (!tenantId) throw new Error("Missing tenantId");
  if (!plan || !Array.isArray(plan.sheets)) throw new Error("Missing parse plan");
  // sheetActions: { [sheetName]: boolean } — user's per-sheet include/exclude.
  // Missing or true → import per the plan's default action. false → skip.

  const dup = await alreadyImported({ tenantId, sourceFileId: fileId });
  if (dup) {
    return { skipped: true, reason: "already_imported",
             message: "This file was already imported. Discard and start fresh if you want to re-import." };
  }

  const db = getDb();
  const written = {
    transactions: 0,
    balanceSnapshots: 0,
    forwardBudgets: 0,
    skipped: [],
  };
  const eventTime = admin.firestore.FieldValue.serverTimestamp();

  for (const sheet of plan.sheets) {
    const userIncluded = sheetActions ? sheetActions[sheet.name] !== false : true;
    if (!userIncluded || sheet.action === "skip") {
      written.skipped.push(sheet.name);
      continue;
    }

    if (sheet.action === "import-transactions" && sheet.data) {
      const txns = sheet.data.transactions || [];
      // Batch in chunks of 400 (Firestore limit 500/batch, leave headroom).
      for (let i = 0; i < txns.length; i += 400) {
        const slice = txns.slice(i, i + 400);
        const batch = db.batch();
        slice.forEach(t => {
          const ref = db.collection("transactions").doc();
          batch.set(ref, {
            tenantId,
            date: normalizeDateForFirestore(t.date),
            description: (t.description || "").slice(0, 500) || null,
            merchant: (t.merchant || "").slice(0, 500) || null,
            amountCents: typeof t.amountCents === "number" ? t.amountCents : 0,
            direction: "debit", // P&L imports are expense outflows
            classification: "expense",
            // category field from V11 sheet banners is preserved as a hint
            // — CoA mapping happens via the categoryHint field for future
            // backfills if/when the user maps these categories to CoA ids.
            categoryHint: t.category || null,
            coaAccountId: null,
            coaConfidence: null,
            reviewNote: "Imported from pre-built xlsx — category preserved as hint",
            source: "import_prebuilt",
            sourceFileId: fileId,
            sourceFileName: fileName || null,
            status: "committed", // already categorized in the source file
            year: t.year || null,
            createdAt: eventTime,
            createdBy: userId,
          });
        });
        await batch.commit();
        written.transactions += slice.length;
      }
    }

    if (sheet.action === "import-balance" && sheet.data) {
      const lines = sheet.data.lines || [];
      const sections = sheet.data.sections || {};
      const ref = db.collection("balanceSnapshots").doc();
      await ref.set({
        tenantId,
        snapshotDate: new Date().toISOString().slice(0, 10),
        source: "import_prebuilt",
        sourceFileId: fileId,
        sourceFileName: fileName || null,
        sheetName: sheet.name,
        lineItems: lines.map(l => ({
          section: l.section || null,
          name: (l.name || "").slice(0, 500),
          valueCents: typeof l.valueNumeric === "number" ? Math.round(l.valueNumeric * 100) : null,
          valueRaw: (l.valueRaw || "").slice(0, 200),
          note: (l.note || "").slice(0, 1000),
          isTotal: !!l.isTotal,
        })),
        sectionTotals: Object.entries(sections).reduce((acc, [k, v]) => {
          acc[k] = {
            knownTotalCents: Math.round((v.knownTotal || 0) * 100),
            itemCount: v.items.length,
            hasTBD: !!v.hasTBD,
          };
          return acc;
        }, {}),
        createdAt: eventTime,
        createdBy: userId,
      });
      written.balanceSnapshots += 1;
    }

    if (sheet.action === "import-budget" && sheet.data) {
      const ref = db.collection("forwardBudgets").doc();
      const data = sheet.data;
      await ref.set({
        tenantId,
        year: data.year || sheet.year || null,
        source: "import_prebuilt",
        sourceFileId: fileId,
        sourceFileName: fileName || null,
        sheetName: sheet.name,
        lineItems: (data.lineItems || []).map(l => ({
          section: l.section || null,
          name: (l.name || "").slice(0, 500),
          monthlyCents: l.monthlyCents,
          months: l.months,
          periodTotalCents: l.periodTotalCents,
          annualTotalCents: l.annualTotalCents,
        })),
        sectionTotals: data.sectionTotals || {},
        grandPeriodTotalCents: Math.round((data.grandPeriodTotal || 0) * 100),
        grandAnnualTotalCents: Math.round((data.grandAnnualTotal || 0) * 100),
        monthlyRunRateCents: data.grandAnnualTotal
          ? Math.round((data.grandAnnualTotal / 12) * 100) : null,
        createdAt: eventTime,
        createdBy: userId,
      });
      written.forwardBudgets += 1;
    }
  }

  // Audit row so the user has a record of every import event.
  await db.collection("importEvents").add({
    tenantId,
    userId,
    type: "prebuilt_financials",
    sourceFileId: fileId,
    sourceFileName: fileName || null,
    sheetCount: plan.sheets.length,
    written,
    createdAt: eventTime,
  });

  return { ok: true, written };
}

module.exports = {
  parsePrebuiltFinancials,
  commitPrebuiltFinancials,
  alreadyImported,
  classifySheet,
  XLSX_MIME,
};
