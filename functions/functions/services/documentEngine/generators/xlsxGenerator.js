// services/documentEngine/generators/xlsxGenerator.js
// XLSX generation via exceljs — covers model-cashflow, model-proforma

const ExcelJS = require("exceljs");
const { COLORS } = require("../templates/layouts");

async function generateXlsx({ template, data, brand }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TitleApp Document Engine";
  workbook.created = new Date();
  workbook.properties.date1904 = false;

  switch (template.id) {
    case "model-proforma":
      buildProforma(workbook, data, brand);
      break;
    case "draw-g703":
      buildG703(workbook, data, brand);
      break;
    case "draw-waiver-matrix":
      buildWaiverMatrix(workbook, data, brand);
      break;
    case "draw-reconciliation":
      buildReconciliation(workbook, data, brand);
      break;
    case "cm-budget-tracker":
      buildBudgetTracker(workbook, data, brand);
      break;
    case "cm-rfi-log":
      buildRfiLog(workbook, data, brand);
      break;
    case "cm-co-log":
      buildCoLog(workbook, data, brand);
      break;
    case "cl-draw-schedule":
      buildDrawSchedule(workbook, data, brand);
      break;
    case "cl-interest-reserve":
      buildInterestReserve(workbook, data, brand);
      break;
    case "cs-full-model":
      buildFullModel(workbook, data, brand);
      break;
    case "cs-waterfall":
      buildWaterfall(workbook, data, brand);
      break;
    // W-002 CRE Analyst
    case "da-assumptions":
      buildAssumptions(workbook, data, brand);
      break;
    case "da-evidence-table":
      buildEvidenceTable(workbook, data, brand);
      break;
    // W-019 Investor Relations
    case "ir-fee-analysis":
      buildFeeAnalysis(workbook, data, brand);
      break;
    case "ir-waterfall":
      buildIrWaterfall(workbook, data, brand);
      break;
    case "ir-waterfall-projection":
      buildWaterfallProjection(workbook, data, brand);
      break;
    // W-048 Chief of Staff
    case "cos-task-tracker":
      buildTaskTracker(workbook, data, brand);
      break;
    // W-022 Bid & Procurement
    case "bp-bid-matrix":
      buildBidMatrix(workbook, data, brand);
      break;
    // W-025 Insurance & Risk
    case "ir-insurance-matrix":
      buildInsuranceMatrix(workbook, data, brand);
      break;
    // W-027 Quality Control & Inspection
    case "qc-deficiency-log":
      buildDeficiencyLog(workbook, data, brand);
      break;
    // W-028 Safety & OSHA
    case "safety-osha-300":
      buildOsha300(workbook, data, brand);
      break;
    // W-029 MEP Coordination
    case "mep-clash-log":
      buildClashLog(workbook, data, brand);
      break;
    // W-001 Market Research
    case "mr-comp-analysis":
      buildCompAnalysis(workbook, data, brand);
      break;
    case "mr-submarket-ranking":
      buildSubmarketRanking(workbook, data, brand);
      break;
    // W-005 ADA Compliance
    case "adr-code-compliance":
      buildCodeCompliance(workbook, data, brand);
      break;
    case "adr-ve-log":
      buildVeLog(workbook, data, brand);
      break;
    // W-006 Engineering Review
    case "er-design-change-log":
      buildDesignChangeLog(workbook, data, brand);
      break;
    // W-007 Environmental Compliance
    case "ecr-remediation-tracker":
      buildRemediationTracker(workbook, data, brand);
      break;
    case "ecr-permit-tracker":
      buildPermitTracker(workbook, data, brand);
      break;
    // W-008 Energy & Sustainability
    case "es-certification-tracker":
      buildCertificationTracker(workbook, data, brand);
      break;
    // W-009 Affordable Housing
    case "afh-accommodation-tracker":
      buildAccommodationTracker(workbook, data, brand);
      break;
    case "afh-unit-classification":
      buildUnitClassification(workbook, data, brand);
      break;
    // W-011 Fire & Life Safety
    case "fls-fire-system-tracker":
      buildFireSystemTracker(workbook, data, brand);
      break;
    // W-020 Opportunity Zone
    case "oz-asset-test":
      buildOzAssetTest(workbook, data, brand);
      break;
    case "oz-substantial-improvement":
      buildOzSubstantialImprovement(workbook, data, brand);
      break;
    case "oz-investor-180-day":
      buildOzInvestor180Day(workbook, data, brand);
      break;
    // W-030 Automated Valuation
    case "avr-comp-analysis":
      buildAvrCompAnalysis(workbook, data, brand);
      break;
    // W-034 Rent Roll & Revenue
    case "rr-rent-roll":
      buildRentRoll(workbook, data, brand);
      break;
    case "rr-revenue-forecast":
      buildRevenueForecast(workbook, data, brand);
      break;
    case "rr-lease-expiration-matrix":
      buildLeaseExpirationMatrix(workbook, data, brand);
      break;
    // W-035 Maintenance & Work Orders
    case "mwo-pm-schedule":
      buildPmSchedule(workbook, data, brand);
      break;
    // W-036 Utility Management
    case "um-rubs-calculation":
      buildRubsCalculation(workbook, data, brand);
      break;
    // W-037 HOA & Association
    case "hoa-assessment-tracker":
      buildHoaAssessmentTracker(workbook, data, brand);
      break;
    // W-038 Warranty & Defect
    case "wd-warranty-register":
      buildWarrantyRegister(workbook, data, brand);
      break;
    case "wd-defect-log":
      buildWdDefectLog(workbook, data, brand);
      break;
    // W-040 Tax Appeal
    case "ta-payment-tracker":
      buildTaPaymentTracker(workbook, data, brand);
      break;
    case "ta-projection":
      buildTaProjection(workbook, data, brand);
      break;
    // W-041 Vendor Compliance
    case "vc-vendor-registry":
      buildVendorRegistry(workbook, data, brand);
      break;
    case "vc-contract-tracker":
      buildContractTracker(workbook, data, brand);
      break;
    case "vc-bid-comparison":
      buildVcBidComparison(workbook, data, brand);
      break;
    // W-051 Investor Reporting & Distributions
    case "ird-distribution-schedule":
      buildDistributionSchedule(workbook, data, brand);
      break;
    case "ird-capital-account":
      buildCapitalAccount(workbook, data, brand);
      break;
    // W-052 Debt Service & Loan Compliance
    case "dslc-payment-schedule":
      buildPaymentSchedule(workbook, data, brand);
      break;
    case "dslc-reserve-tracker":
      buildReserveTracker(workbook, data, brand);
      break;
    // W-042 Disposition Planning
    case "dp-broker-comparison":
      buildBrokerComparison(workbook, data, brand);
      break;
    case "dp-offer-comparison":
      buildOfferComparison(workbook, data, brand);
      break;
    case "dp-closing-checklist":
      buildClosingChecklist(workbook, data, brand);
      break;
    // W-043 Exchange (1031)
    case "ex-basis-calculation":
      buildBasisCalculation(workbook, data, brand);
      break;
    // W-050 Deal Management & Data Room
    case "dmdr-data-room-index":
      buildDataRoomIndex(workbook, data, brand);
      break;
    case "dmdr-buyer-tracker":
      buildBuyerTracker(workbook, data, brand);
      break;
    case "dmdr-dd-checklist":
      buildDdChecklist(workbook, data, brand);
      break;
    // W-046 Entity Formation
    case "ef-formation-checklist":
      buildFormationChecklist(workbook, data, brand);
      break;
    case "ef-entity-registry":
      buildEntityRegistry(workbook, data, brand);
      break;
    case "ef-annual-compliance":
      buildAnnualCompliance(workbook, data, brand);
      break;
    // W-049 Property Insurance Review
    case "pir-claims-log":
      buildClaimsLog(workbook, data, brand);
      break;
    case "pir-renewal-comparison":
      buildRenewalComparison(workbook, data, brand);
      break;
    case "model-cashflow":
    default:
      buildCashflow(workbook, data, brand);
      break;
  }

  return workbook.xlsx.writeBuffer();
}

function headerFill(brand) {
  const color = (brand.primaryColor || COLORS.primary).replace("#", "");
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${color}` },
  };
}

function headerFont() {
  return { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
}

function currencyFormat() {
  return '"$"#,##0.00';
}

function percentFormat() {
  return "0.00%";
}

function numberFormat() {
  return "#,##0";
}

function styleHeaderRow(row, brand) {
  row.eachCell((cell) => {
    cell.fill = headerFill(brand);
    cell.font = headerFont();
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
  row.height = 24;
}

function addDisclosureRow(sheet, brand, colCount) {
  sheet.addRow([]);
  const discRow = sheet.addRow([
    brand.aiDisclosure ||
      "Generated by a TitleApp Digital Worker. AI-assisted analysis — human review recommended.",
  ]);
  discRow.getCell(1).font = {
    italic: true,
    size: 9,
    color: { argb: "FF6B7280" },
    name: "Arial",
  };
  sheet.mergeCells(discRow.number, 1, discRow.number, colCount);
}

// --- Cash Flow Model ---

function buildCashflow(workbook, data, brand) {
  const title = data.title || "Cash Flow Model";
  const periods = data.periods || [];

  // Summary sheet
  const summary = workbook.addWorksheet("Summary");
  summary.getColumn(1).width = 28;
  summary.addRow([title]).font = {
    bold: true,
    size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  summary.addRow([`Generated: ${new Date().toLocaleDateString("en-US")}`]).font = {
    size: 10,
    color: { argb: "FF6B7280" },
    name: "Arial",
  };
  summary.addRow([]);

  // Assumptions sheet
  if (data.assumptions && Array.isArray(data.assumptions)) {
    const assumptions = workbook.addWorksheet("Assumptions");
    assumptions.columns = [
      { header: "Assumption", key: "name", width: 30 },
      { header: "Value", key: "value", width: 20 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    styleHeaderRow(assumptions.getRow(1), brand);

    for (const a of data.assumptions) {
      assumptions.addRow({
        name: a.name || a.label || "",
        value: a.value || "",
        notes: a.notes || "",
      });
    }

    addDisclosureRow(assumptions, brand, 3);
  }

  // Revenue sheet
  if (data.revenue && Array.isArray(data.revenue)) {
    const revenue = workbook.addWorksheet("Revenue");
    const headers = ["Line Item", ...periods.map((p) => p.label || p)];
    revenue.addRow(headers);
    styleHeaderRow(revenue.getRow(1), brand);

    revenue.getColumn(1).width = 28;
    for (let i = 2; i <= headers.length; i++) {
      revenue.getColumn(i).width = 16;
      revenue.getColumn(i).numFmt = currencyFormat();
    }

    for (const item of data.revenue) {
      const row = [item.name || item.label || ""];
      const values = item.values || item.amounts || [];
      for (const v of values) {
        row.push(typeof v === "number" ? v : parseFloat(v) || 0);
      }
      revenue.addRow(row);
    }

    addDisclosureRow(revenue, brand, headers.length);
  }

  // Expenses sheet
  if (data.expenses && Array.isArray(data.expenses)) {
    const expenses = workbook.addWorksheet("Expenses");
    const headers = ["Line Item", ...periods.map((p) => p.label || p)];
    expenses.addRow(headers);
    styleHeaderRow(expenses.getRow(1), brand);

    expenses.getColumn(1).width = 28;
    for (let i = 2; i <= headers.length; i++) {
      expenses.getColumn(i).width = 16;
      expenses.getColumn(i).numFmt = currencyFormat();
    }

    for (const item of data.expenses) {
      const row = [item.name || item.label || ""];
      const values = item.values || item.amounts || [];
      for (const v of values) {
        row.push(typeof v === "number" ? v : parseFloat(v) || 0);
      }
      expenses.addRow(row);
    }

    addDisclosureRow(expenses, brand, headers.length);
  }

  // Cash Flow sheet
  const cf = workbook.addWorksheet("Cash Flow");
  const cfHeaders = ["Line Item", ...periods.map((p) => p.label || p)];
  cf.addRow(cfHeaders);
  styleHeaderRow(cf.getRow(1), brand);

  cf.getColumn(1).width = 28;
  for (let i = 2; i <= cfHeaders.length; i++) {
    cf.getColumn(i).width = 16;
    cf.getColumn(i).numFmt = currencyFormat();
  }

  // Auto-calculate net cash flow if revenue and expenses provided
  if (data.revenue && data.expenses) {
    const totalRevByPeriod = new Array(periods.length).fill(0);
    const totalExpByPeriod = new Array(periods.length).fill(0);

    for (const item of data.revenue || []) {
      const vals = item.values || item.amounts || [];
      for (let i = 0; i < vals.length; i++) {
        totalRevByPeriod[i] += typeof vals[i] === "number" ? vals[i] : parseFloat(vals[i]) || 0;
      }
    }
    for (const item of data.expenses || []) {
      const vals = item.values || item.amounts || [];
      for (let i = 0; i < vals.length; i++) {
        totalExpByPeriod[i] += typeof vals[i] === "number" ? vals[i] : parseFloat(vals[i]) || 0;
      }
    }

    cf.addRow(["Total Revenue", ...totalRevByPeriod]).font = { bold: true, name: "Arial" };
    cf.addRow(["Total Expenses", ...totalExpByPeriod]).font = { bold: true, name: "Arial" };

    const netCf = totalRevByPeriod.map((r, i) => r - totalExpByPeriod[i]);
    const netRow = cf.addRow(["Net Cash Flow", ...netCf]);
    netRow.font = { bold: true, name: "Arial" };
    netRow.eachCell((cell, colNum) => {
      if (colNum > 1) {
        const val = typeof cell.value === "number" ? cell.value : 0;
        cell.font = {
          bold: true,
          color: { argb: val >= 0 ? "FF16A34A" : "FFDC2626" },
          name: "Arial",
        };
      }
    });
  }

  // Custom cash flow rows
  if (data.cashflow && Array.isArray(data.cashflow)) {
    for (const item of data.cashflow) {
      const row = [item.name || item.label || ""];
      const values = item.values || item.amounts || [];
      for (const v of values) {
        row.push(typeof v === "number" ? v : parseFloat(v) || 0);
      }
      cf.addRow(row);
    }
  }

  addDisclosureRow(cf, brand, cfHeaders.length);

  // Summary metrics
  if (data.notes) {
    summary.addRow(["Notes"]).font = { bold: true, name: "Arial" };
    const notesText = Array.isArray(data.notes) ? data.notes.join("\n") : data.notes;
    summary.addRow([notesText]);
  }

  addDisclosureRow(summary, brand, 1);
}

// --- Pro Forma Model ---

function buildProforma(workbook, data, brand) {
  const title = data.title || "Pro Forma Analysis";
  const propData = data.propertyData || {};

  // Summary sheet
  const summary = workbook.addWorksheet("Summary");
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 20;
  summary.addRow([title]).font = {
    bold: true,
    size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  summary.addRow([`Generated: ${new Date().toLocaleDateString("en-US")}`]).font = {
    size: 10,
    color: { argb: "FF6B7280" },
    name: "Arial",
  };
  summary.addRow([]);

  // Property overview
  const overviewFields = [
    ["Property Name", propData.name || propData.address || ""],
    ["Property Type", propData.type || ""],
    ["Units / SF", propData.units || propData.sqft || ""],
    ["Year Built", propData.yearBuilt || ""],
    ["Location", propData.location || propData.market || ""],
  ];
  for (const [label, value] of overviewFields) {
    if (value) {
      const row = summary.addRow([label, value]);
      row.getCell(1).font = { bold: true, name: "Arial" };
    }
  }

  // Acquisition sheet
  const acq = workbook.addWorksheet("Acquisition");
  acq.columns = [
    { header: "Item", key: "item", width: 30 },
    { header: "Amount", key: "amount", width: 20 },
    { header: "Per Unit", key: "perUnit", width: 16 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  styleHeaderRow(acq.getRow(1), brand);
  acq.getColumn(2).numFmt = currencyFormat();
  acq.getColumn(3).numFmt = currencyFormat();

  const acqItems = propData.acquisition || data.acquisition || [];
  for (const item of acqItems) {
    acq.addRow({
      item: item.name || item.label || "",
      amount: item.amount || item.value || 0,
      perUnit: item.perUnit || "",
      notes: item.notes || "",
    });
  }

  addDisclosureRow(acq, brand, 4);

  // Operating sheet
  const ops = workbook.addWorksheet("Operating");
  const periods = data.periods || propData.periods || ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
  const opsHeaders = ["Line Item", ...periods.map((p) => p.label || p)];
  ops.addRow(opsHeaders);
  styleHeaderRow(ops.getRow(1), brand);
  ops.getColumn(1).width = 28;
  for (let i = 2; i <= opsHeaders.length; i++) {
    ops.getColumn(i).width = 16;
    ops.getColumn(i).numFmt = currencyFormat();
  }

  const opsItems = propData.operating || data.operating || [];
  for (const item of opsItems) {
    const row = [item.name || item.label || ""];
    const values = item.values || item.amounts || [];
    for (const v of values) {
      row.push(typeof v === "number" ? v : parseFloat(v) || 0);
    }
    const addedRow = ops.addRow(row);
    if (item.bold || item.total) {
      addedRow.font = { bold: true, name: "Arial" };
    }
  }

  addDisclosureRow(ops, brand, opsHeaders.length);

  // Returns sheet
  const returns = workbook.addWorksheet("Returns");
  returns.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 20 },
  ];
  styleHeaderRow(returns.getRow(1), brand);

  const returnMetrics = propData.returns || data.returns || [];
  for (const m of returnMetrics) {
    const row = returns.addRow({
      metric: m.name || m.label || m.metric || "",
      value: m.value || "",
    });
    if (m.highlight) {
      row.getCell(2).font = {
        bold: true,
        color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
        name: "Arial",
      };
    }
  }

  addDisclosureRow(returns, brand, 2);

  // Assumptions
  if (data.assumptions && Array.isArray(data.assumptions)) {
    const assumptions = workbook.addWorksheet("Assumptions");
    assumptions.columns = [
      { header: "Assumption", key: "name", width: 30 },
      { header: "Value", key: "value", width: 20 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    styleHeaderRow(assumptions.getRow(1), brand);

    for (const a of data.assumptions) {
      assumptions.addRow({
        name: a.name || a.label || "",
        value: a.value || "",
        notes: a.notes || "",
      });
    }

    addDisclosureRow(assumptions, brand, 3);
  }

  addDisclosureRow(summary, brand, 2);
}

// --- AIA G703 Continuation Sheet ---

function buildG703(workbook, data, brand) {
  const title = data.title || "AIA G703 — Continuation Sheet";
  const retPct = data.retainagePercent || 10;

  const sheet = workbook.addWorksheet("Schedule of Values");

  // Title row
  sheet.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    sheet.addRow(["Project: " + data.projectName + (data.applicationNumber ? "  |  Application #" + data.applicationNumber : "") + (data.periodTo ? "  |  Period To: " + data.periodTo : "")]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  sheet.addRow([]);

  // Header row
  const headers = ["Item", "Description of Work", "Scheduled Value", "From Previous Applications", "This Period", "Materials Stored", "Total Completed & Stored", "% Complete", "Balance to Finish", "Retainage (" + retPct + "%)"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  // Column widths
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 16;
  sheet.getColumn(7).width = 22;
  sheet.getColumn(8).width = 12;
  sheet.getColumn(9).width = 18;
  sheet.getColumn(10).width = 18;

  // Currency formats
  for (const col of [3, 4, 5, 6, 7, 9, 10]) {
    sheet.getColumn(col).numFmt = currencyFormat();
  }
  sheet.getColumn(8).numFmt = "0.0%";

  // Data rows
  let totalScheduled = 0, totalPrevious = 0, totalThisPeriod = 0, totalStored = 0, totalCompleted = 0, totalBalance = 0, totalRetainage = 0;

  const items = data.lineItems || [];
  for (const item of items) {
    const scheduled = item.scheduledValue || item.scheduled_value || 0;
    const previous = item.previous || item.previousApplications || item.previous_applications || 0;
    const thisPeriod = item.thisPeriod || item.this_period || 0;
    const stored = item.storedMaterials || item.stored_materials || item.materials_stored || 0;
    const total = previous + thisPeriod + stored;
    const pct = scheduled > 0 ? total / scheduled : 0;
    const balance = scheduled - total;
    const ret = Math.round(total * retPct / 100);

    totalScheduled += scheduled;
    totalPrevious += previous;
    totalThisPeriod += thisPeriod;
    totalStored += stored;
    totalCompleted += total;
    totalBalance += balance;
    totalRetainage += ret;

    sheet.addRow([
      item.item || item.itemNumber || "",
      item.description || "",
      scheduled,
      previous,
      thisPeriod,
      stored,
      total,
      pct,
      balance,
      ret,
    ]);
  }

  // Totals row
  const totalsRow = sheet.addRow([
    "", "TOTALS",
    totalScheduled, totalPrevious, totalThisPeriod, totalStored, totalCompleted,
    totalScheduled > 0 ? totalCompleted / totalScheduled : 0,
    totalBalance, totalRetainage,
  ]);
  totalsRow.font = { bold: true, name: "Arial" };
  totalsRow.eachCell((cell) => {
    cell.border = { top: { style: "double", color: { argb: "FF000000" } } };
  });

  addDisclosureRow(sheet, brand, 10);
}

// --- Lien Waiver Matrix ---

function buildWaiverMatrix(workbook, data, brand) {
  const title = data.title || "Lien Waiver Tracking Matrix";
  const subs = data.subcontractors || [];
  const drawCount = data.drawCount || Math.max(...subs.map(s => (s.draws || []).length), 0) || 1;

  const sheet = workbook.addWorksheet("Waiver Matrix");

  // Title
  sheet.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    sheet.addRow(["Project: " + data.projectName + (data.asOfDate ? "  |  As of: " + data.asOfDate : "")]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  sheet.addRow([]);

  // Headers: Sub, Contract Value, then per draw: CW | UW, then Lien Risk
  const headers = ["Subcontractor / Supplier", "Contract Value", "Total Billed", "Total Paid"];
  for (let d = 1; d <= drawCount; d++) {
    headers.push("Draw " + d + " CW");
    headers.push("Draw " + d + " UW");
  }
  headers.push("Lien Risk");

  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 16; sheet.getColumn(2).numFmt = currencyFormat();
  sheet.getColumn(3).width = 16; sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).width = 16; sheet.getColumn(4).numFmt = currencyFormat();
  for (let i = 5; i <= 4 + drawCount * 2; i++) {
    sheet.getColumn(i).width = 12;
  }
  sheet.getColumn(headers.length).width = 12;

  // Data rows
  let totalSubs = 0, waiversCurrent = 0, waiversMissing = 0, highRisk = 0;

  for (const sub of subs) {
    totalSubs++;
    const row = [
      sub.name || "",
      sub.contractValue || sub.contract_value || 0,
      sub.totalBilled || sub.total_billed || 0,
      sub.totalPaid || sub.total_paid || 0,
    ];

    const draws = sub.draws || [];
    for (let d = 0; d < drawCount; d++) {
      const draw = draws[d] || {};
      const cw = draw.conditionalWaiver || draw.conditional_waiver || "na";
      const uw = draw.unconditionalWaiver || draw.unconditional_waiver || "na";
      row.push(cw === "received" ? "✓" : cw === "missing" ? "✗" : "—");
      row.push(uw === "received" ? "✓" : uw === "missing" ? "✗" : uw === "pending" ? "⏳" : "—");
      if (cw === "received") waiversCurrent++;
      if (cw === "missing") waiversMissing++;
      if (uw === "received") waiversCurrent++;
      if (uw === "missing") waiversMissing++;
    }

    const risk = sub.lienRisk || sub.lien_risk || "none";
    row.push(risk.toUpperCase());
    if (risk === "high") highRisk++;

    const addedRow = sheet.addRow(row);

    // Color the risk cell
    const riskCell = addedRow.getCell(headers.length);
    if (risk === "high") {
      riskCell.font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    } else if (risk === "medium") {
      riskCell.font = { bold: true, color: { argb: "FFD97706" }, name: "Arial" };
    }
  }

  // Summary
  sheet.addRow([]);
  const summaryRow = sheet.addRow(["SUMMARY"]);
  summaryRow.font = { bold: true, name: "Arial" };
  sheet.addRow(["Total Subcontractors", totalSubs]);
  sheet.addRow(["Waivers Current", waiversCurrent]);
  sheet.addRow(["Waivers Missing", waiversMissing]);
  sheet.addRow(["High Lien Risk", highRisk]);

  addDisclosureRow(sheet, brand, headers.length);
}

// --- Draw Reconciliation ---

function buildReconciliation(workbook, data, brand) {
  const title = data.title || "Draw Reconciliation Report";
  const draws = data.draws || [];
  const loanCommitment = data.loanCommitment || data.loan_commitment || 0;

  // Tab 1: Summary
  const summary = workbook.addWorksheet("Summary");
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 20; summary.getColumn(2).numFmt = currencyFormat();
  summary.getColumn(3).width = 20; summary.getColumn(3).numFmt = currencyFormat();
  summary.getColumn(4).width = 20; summary.getColumn(4).numFmt = currencyFormat();

  summary.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    summary.addRow(["Project: " + data.projectName]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  summary.addRow([]);

  const sumHeaders = summary.addRow(["Draw #", "Requested", "Funded", "Variance"]);
  styleHeaderRow(sumHeaders, brand);

  let totalRequested = 0, totalFunded = 0;
  for (const d of draws) {
    const req = d.requested || d.amount || 0;
    const funded = d.funded || d.amountFunded || req;
    totalRequested += req;
    totalFunded += funded;
    summary.addRow([d.number || d.drawNumber || "", req, funded, funded - req]);
  }

  const totRow = summary.addRow(["TOTAL", totalRequested, totalFunded, totalFunded - totalRequested]);
  totRow.font = { bold: true, name: "Arial" };
  totRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  if (loanCommitment > 0) {
    summary.addRow([]);
    summary.addRow(["Loan Commitment", loanCommitment]).font = { bold: true, name: "Arial" };
    summary.addRow(["Total Drawn", totalFunded]);
    summary.addRow(["Remaining", loanCommitment - totalFunded]);
    summary.addRow(["Utilization", (totalFunded / loanCommitment * 100).toFixed(1) + "%"]);
  }

  addDisclosureRow(summary, brand, 4);

  // Tab 2: By Division
  const divisions = data.divisions || [];
  if (divisions.length > 0) {
    const divSheet = workbook.addWorksheet("By Division");
    divSheet.getColumn(1).width = 8;
    divSheet.getColumn(2).width = 28;
    divSheet.getColumn(3).width = 18; divSheet.getColumn(3).numFmt = currencyFormat();
    divSheet.getColumn(4).width = 18; divSheet.getColumn(4).numFmt = currencyFormat();
    divSheet.getColumn(5).width = 18; divSheet.getColumn(5).numFmt = currencyFormat();
    divSheet.getColumn(6).width = 12; divSheet.getColumn(6).numFmt = "0.0%";

    const divHeaders = divSheet.addRow(["Division", "Description", "Budget", "Drawn to Date", "Variance", "% Drawn"]);
    styleHeaderRow(divHeaders, brand);

    for (const div of divisions) {
      const budget = div.budget || 0;
      const drawn = div.drawn || div.drawnToDate || 0;
      divSheet.addRow([div.code || div.number || "", div.description || div.name || "", budget, drawn, budget - drawn, budget > 0 ? drawn / budget : 0]);
    }

    addDisclosureRow(divSheet, brand, 6);
  }

  // Tab 3: Cumulative
  const cumSheet = workbook.addWorksheet("Cumulative");
  cumSheet.getColumn(1).width = 12;
  cumSheet.getColumn(2).width = 18; cumSheet.getColumn(2).numFmt = currencyFormat();
  cumSheet.getColumn(3).width = 18; cumSheet.getColumn(3).numFmt = currencyFormat();
  cumSheet.getColumn(4).width = 18; cumSheet.getColumn(4).numFmt = currencyFormat();
  cumSheet.getColumn(5).width = 14; cumSheet.getColumn(5).numFmt = "0.0%";

  const cumHeaders = cumSheet.addRow(["Draw #", "This Draw", "Cumulative Drawn", "Remaining", "% Utilized"]);
  styleHeaderRow(cumHeaders, brand);

  let cumulative = 0;
  for (const d of draws) {
    const funded = d.funded || d.amountFunded || d.requested || d.amount || 0;
    cumulative += funded;
    cumSheet.addRow([d.number || d.drawNumber || "", funded, cumulative, loanCommitment > 0 ? loanCommitment - cumulative : 0, loanCommitment > 0 ? cumulative / loanCommitment : 0]);
  }

  addDisclosureRow(cumSheet, brand, 5);

  // Tab 4: Retainage
  const retainageData = data.retainageData || data.retainage || [];
  const retSheet = workbook.addWorksheet("Retainage");
  retSheet.getColumn(1).width = 28;
  retSheet.getColumn(2).width = 18; retSheet.getColumn(2).numFmt = currencyFormat();
  retSheet.getColumn(3).width = 18; retSheet.getColumn(3).numFmt = currencyFormat();
  retSheet.getColumn(4).width = 18; retSheet.getColumn(4).numFmt = currencyFormat();

  const retHeaders = retSheet.addRow(["Subcontractor", "Retainage Held", "Retainage Released", "Retainage Remaining"]);
  styleHeaderRow(retHeaders, brand);

  let totalHeld = 0, totalReleased = 0;
  for (const r of retainageData) {
    const held = r.held || r.retainageHeld || 0;
    const released = r.released || r.retainageReleased || 0;
    totalHeld += held;
    totalReleased += released;
    retSheet.addRow([r.name || r.subcontractor || "", held, released, held - released]);
  }

  const retTotRow = retSheet.addRow(["TOTAL", totalHeld, totalReleased, totalHeld - totalReleased]);
  retTotRow.font = { bold: true, name: "Arial" };
  retTotRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  addDisclosureRow(retSheet, brand, 4);
}

// --- W-021 Budget Tracker ---

function buildBudgetTracker(workbook, data, brand) {
  const title = data.title || "Budget Tracking Report";
  const divisions = data.divisions || [];
  const originalContract = data.originalContract || 0;
  const approvedChanges = data.approvedChanges || 0;

  // Tab 1: Summary by Division
  const summary = workbook.addWorksheet("Summary");
  summary.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    summary.addRow(["Project: " + data.projectName]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  summary.addRow([]);

  summary.getColumn(1).width = 10;
  summary.getColumn(2).width = 28;
  summary.getColumn(3).width = 18; summary.getColumn(3).numFmt = currencyFormat();
  summary.getColumn(4).width = 18; summary.getColumn(4).numFmt = currencyFormat();
  summary.getColumn(5).width = 18; summary.getColumn(5).numFmt = currencyFormat();
  summary.getColumn(6).width = 18; summary.getColumn(6).numFmt = currencyFormat();
  summary.getColumn(7).width = 18; summary.getColumn(7).numFmt = currencyFormat();
  summary.getColumn(8).width = 12; summary.getColumn(8).numFmt = "0.0%";

  const sumHeaders = summary.addRow(["Division", "Description", "Original Budget", "Approved COs", "Revised Budget", "Committed", "Spent to Date", "% Spent"]);
  styleHeaderRow(sumHeaders, brand);

  let totOrig = 0, totCOs = 0, totRevised = 0, totCommit = 0, totSpent = 0;
  for (const div of divisions) {
    const orig = div.originalBudget || div.budget || 0;
    const cos = div.approvedChanges || div.changeOrders || 0;
    const revised = orig + cos;
    const committed = div.committed || 0;
    const spent = div.spentToDate || div.spent || 0;
    const pct = revised > 0 ? spent / revised : 0;

    totOrig += orig;
    totCOs += cos;
    totRevised += revised;
    totCommit += committed;
    totSpent += spent;

    const row = summary.addRow([div.code || div.divisionCode || "", div.name || div.description || "", orig, cos, revised, committed, spent, pct]);
    if (pct > 0.9) {
      row.getCell(8).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }

  const totRow = summary.addRow(["", "TOTALS", totOrig, totCOs, totRevised, totCommit, totSpent, totRevised > 0 ? totSpent / totRevised : 0]);
  totRow.font = { bold: true, name: "Arial" };
  totRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  addDisclosureRow(summary, brand, 8);

  // Tab 2: Line-Item Detail
  const detail = workbook.addWorksheet("Detail");
  detail.getColumn(1).width = 10;
  detail.getColumn(2).width = 14;
  detail.getColumn(3).width = 28;
  detail.getColumn(4).width = 18; detail.getColumn(4).numFmt = currencyFormat();
  detail.getColumn(5).width = 18; detail.getColumn(5).numFmt = currencyFormat();
  detail.getColumn(6).width = 18; detail.getColumn(6).numFmt = currencyFormat();
  detail.getColumn(7).width = 20;

  const detHeaders = detail.addRow(["Division", "Code", "Description", "Budgeted", "Committed", "Spent", "Subcontractor"]);
  styleHeaderRow(detHeaders, brand);

  for (const div of divisions) {
    const lineItems = div.lineItems || div.line_items || [];
    for (const item of lineItems) {
      detail.addRow([
        div.code || div.divisionCode || "",
        item.code || "",
        item.description || "",
        item.budgetedAmount || item.budgeted_amount || item.budget || 0,
        item.committedAmount || item.committed_amount || item.committed || 0,
        item.spentAmount || item.spent || 0,
        item.subcontractor || "",
      ]);
    }
  }

  addDisclosureRow(detail, brand, 7);

  // Tab 3: Change Orders
  const coSheet = workbook.addWorksheet("Change Orders");
  coSheet.getColumn(1).width = 8;
  coSheet.getColumn(2).width = 12;
  coSheet.getColumn(3).width = 30;
  coSheet.getColumn(4).width = 16;
  coSheet.getColumn(5).width = 18; coSheet.getColumn(5).numFmt = currencyFormat();
  coSheet.getColumn(6).width = 12;
  coSheet.getColumn(7).width = 14;
  coSheet.getColumn(8).width = 18; coSheet.getColumn(8).numFmt = currencyFormat();

  const coHeaders = coSheet.addRow(["CO #", "Date", "Description", "Initiated By", "Amount", "Time Impact", "Status", "Cumulative"]);
  styleHeaderRow(coHeaders, brand);

  const changeOrders = data.changeOrders || [];
  let cumulative = 0;
  for (const co of changeOrders) {
    if (co.status === "Approved") cumulative += (co.amount || co.cost || 0);
    coSheet.addRow([
      co.number || co.coNumber || "",
      co.date || "",
      co.description || "",
      co.initiatedBy || co.initiated_by || "",
      co.amount || co.cost || 0,
      co.timeImpact || co.time_impact_days || "",
      co.status || "Pending",
      cumulative,
    ]);
  }

  addDisclosureRow(coSheet, brand, 8);

  // Tab 4: Contingency
  const contSheet = workbook.addWorksheet("Contingency");
  contSheet.getColumn(1).width = 30;
  contSheet.getColumn(2).width = 20; contSheet.getColumn(2).numFmt = currencyFormat();

  contSheet.addRow(["Contingency Tracking"]).font = { bold: true, size: 14, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  contSheet.addRow([]);

  const contBudget = data.contingencyBudget || 0;
  const contUsed = data.contingencyUsed || 0;
  contSheet.addRow(["Original Contingency Budget", contBudget]).getCell(1).font = { bold: true, name: "Arial" };
  contSheet.addRow(["Contingency Used", contUsed]);
  contSheet.addRow(["Contingency Remaining", contBudget - contUsed]).getCell(1).font = { bold: true, name: "Arial" };
  contSheet.addRow(["% Remaining", originalContract > 0 ? ((contBudget - contUsed) / originalContract * 100).toFixed(1) + "%" : "N/A"]);

  addDisclosureRow(contSheet, brand, 2);

  // Tab 5: Cash Flow
  if (data.cashFlowPeriods && Array.isArray(data.cashFlowPeriods)) {
    const cfSheet = workbook.addWorksheet("Cash Flow");
    const cfHeaders = ["Period", "Projected", "Actual", "Cumulative Projected", "Cumulative Actual"];
    cfSheet.addRow(cfHeaders);
    styleHeaderRow(cfSheet.getRow(1), brand);

    cfSheet.getColumn(1).width = 16;
    for (let i = 2; i <= 5; i++) { cfSheet.getColumn(i).width = 18; cfSheet.getColumn(i).numFmt = currencyFormat(); }

    let cumProj = 0, cumAct = 0;
    for (const p of data.cashFlowPeriods) {
      const proj = p.projected || 0;
      const actual = p.actual || 0;
      cumProj += proj;
      cumAct += actual;
      cfSheet.addRow([p.period || p.label || "", proj, actual, cumProj, cumAct]);
    }

    addDisclosureRow(cfSheet, brand, 5);
  }
}

// --- W-021 RFI Log ---

function buildRfiLog(workbook, data, brand) {
  const title = data.title || "RFI Log";
  const rfis = data.rfis || [];

  const sheet = workbook.addWorksheet("RFI Log");

  sheet.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    sheet.addRow(["Project: " + data.projectName + (data.asOfDate ? "  |  As of: " + data.asOfDate : "")]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  sheet.addRow([]);

  const headers = ["RFI #", "Date", "From", "Spec Section", "Drawing", "Description", "Assigned To", "Due Date", "Response Date", "Days Open", "Cost Impact", "Schedule Impact", "Status"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 30;
  sheet.getColumn(7).width = 18;
  sheet.getColumn(8).width = 12;
  sheet.getColumn(9).width = 14;
  sheet.getColumn(10).width = 10;
  sheet.getColumn(11).width = 12;
  sheet.getColumn(12).width = 14;
  sheet.getColumn(13).width = 14;

  let totalOpen = 0, totalOverdue = 0;

  for (const rfi of rfis) {
    const daysOpen = rfi.daysOpen || rfi.days_open || "";
    const isOverdue = rfi.overdue || (rfi.dueDate && rfi.status !== "Closed" && rfi.status !== "Responded");
    const isOpen = rfi.status === "Open" || rfi.status === "Pending Response";
    if (isOpen) totalOpen++;
    if (isOverdue) totalOverdue++;

    const row = sheet.addRow([
      rfi.number || rfi.rfiNumber || "",
      rfi.date || rfi.dateSubmitted || "",
      rfi.from || rfi.submittedBy || rfi.submitted_by || "",
      rfi.specSection || rfi.spec_section || "",
      rfi.drawing || rfi.drawingReference || "",
      rfi.description || rfi.question || "",
      rfi.assignedTo || rfi.assigned_to || "",
      rfi.dueDate || rfi.due_date || "",
      rfi.responseDate || rfi.response_date || "",
      daysOpen,
      rfi.costImpact || rfi.cost_impact || "No",
      rfi.scheduleImpact || rfi.schedule_impact || "No",
      rfi.status || "Open",
    ]);

    // Color overdue rows
    if (isOverdue) {
      row.getCell(13).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }

  // Summary
  sheet.addRow([]);
  const summRow = sheet.addRow(["SUMMARY"]);
  summRow.font = { bold: true, name: "Arial" };
  sheet.addRow(["Total RFIs", rfis.length]);
  sheet.addRow(["Open", totalOpen]);
  sheet.addRow(["Overdue", totalOverdue]);
  sheet.addRow(["Closed", rfis.filter(r => r.status === "Closed" || r.status === "Responded").length]);

  addDisclosureRow(sheet, brand, 13);
}

// --- W-021 Change Order Log ---

function buildCoLog(workbook, data, brand) {
  const title = data.title || "Change Order Log";
  const changeOrders = data.changeOrders || [];
  const originalContractSum = data.originalContractSum || 0;

  const sheet = workbook.addWorksheet("CO Log");

  sheet.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    sheet.addRow(["Project: " + data.projectName + (data.asOfDate ? "  |  As of: " + data.asOfDate : "")]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  if (originalContractSum > 0) {
    sheet.addRow(["Original Contract Sum: $" + originalContractSum.toLocaleString()]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  sheet.addRow([]);

  const headers = ["CO #", "Date", "Description", "Initiated By", "Cost", "Time Impact (Days)", "Status", "Approval Level", "Cumulative Total", "% of Contract"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 30;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 18; sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(6).width = 16;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 14;
  sheet.getColumn(9).width = 18; sheet.getColumn(9).numFmt = currencyFormat();
  sheet.getColumn(10).width = 14; sheet.getColumn(10).numFmt = "0.00%";

  let cumulativeApproved = 0;
  let totalApprovedCount = 0, totalPendingCount = 0, totalPendingValue = 0;

  for (const co of changeOrders) {
    const cost = co.amount || co.cost || 0;
    const isApproved = co.status === "Approved";
    if (isApproved) {
      cumulativeApproved += cost;
      totalApprovedCount++;
    }
    if (co.status === "Pending") {
      totalPendingCount++;
      totalPendingValue += cost;
    }

    const pctOfContract = originalContractSum > 0 ? cumulativeApproved / originalContractSum : 0;

    const row = sheet.addRow([
      co.number || co.coNumber || "",
      co.date || "",
      co.description || "",
      co.initiatedBy || co.initiated_by || "",
      cost,
      co.timeImpact || co.time_impact_days || 0,
      co.status || "Pending",
      co.approvalLevel || co.approval_level || "",
      cumulativeApproved,
      pctOfContract,
    ]);

    // Highlight high % of contract
    if (pctOfContract > 0.10) {
      row.getCell(10).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    } else if (pctOfContract > 0.05) {
      row.getCell(10).font = { bold: true, color: { argb: "FFD97706" }, name: "Arial" };
    }
  }

  // Totals
  const totRow = sheet.addRow(["", "", "TOTALS", "", cumulativeApproved, "", "", "", cumulativeApproved, originalContractSum > 0 ? cumulativeApproved / originalContractSum : 0]);
  totRow.font = { bold: true, name: "Arial" };
  totRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  // Summary
  sheet.addRow([]);
  const summRow = sheet.addRow(["SUMMARY"]);
  summRow.font = { bold: true, name: "Arial" };
  sheet.addRow(["Approved COs", totalApprovedCount, "", "", cumulativeApproved]);
  sheet.addRow(["Pending COs", totalPendingCount, "", "", totalPendingValue]);
  sheet.addRow(["Total Exposure", totalApprovedCount + totalPendingCount, "", "", cumulativeApproved + totalPendingValue]);
  if (originalContractSum > 0) {
    sheet.addRow(["Approved % of Contract", ((cumulativeApproved / originalContractSum) * 100).toFixed(2) + "%"]);
    sheet.addRow(["Exposure % of Contract", (((cumulativeApproved + totalPendingValue) / originalContractSum) * 100).toFixed(2) + "%"]);
  }

  addDisclosureRow(sheet, brand, 10);
}

// --- W-015 Draw Schedule ---

function buildDrawSchedule(workbook, data, brand) {
  const title = data.title || "Construction Loan Draw Schedule";
  const periods = data.periods || [];
  const loanAmount = data.loanAmount || 0;
  const rate = data.rate || 0;
  const interestReserve = data.interestReserve || 0;

  // Tab 1: Schedule
  const sched = workbook.addWorksheet("Schedule");
  sched.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    sched.addRow(["Project: " + data.projectName + "  |  Loan: " + (loanAmount > 0 ? "$" + loanAmount.toLocaleString() : "N/A")]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  sched.addRow([]);

  sched.getColumn(1).width = 10;
  sched.getColumn(2).width = 14;
  sched.getColumn(3).width = 14;
  sched.getColumn(4).width = 18; sched.getColumn(4).numFmt = currencyFormat();
  sched.getColumn(5).width = 18; sched.getColumn(5).numFmt = currencyFormat();
  sched.getColumn(6).width = 18; sched.getColumn(6).numFmt = currencyFormat();
  sched.getColumn(7).width = 18; sched.getColumn(7).numFmt = currencyFormat();
  sched.getColumn(8).width = 18; sched.getColumn(8).numFmt = currencyFormat();
  sched.getColumn(9).width = 18; sched.getColumn(9).numFmt = currencyFormat();

  const schedHeaders = sched.addRow(["Period", "Start", "End", "Projected Draw", "Equity", "Cumulative Drawn", "Remaining", "Interest This Period", "Reserve Balance"]);
  styleHeaderRow(schedHeaders, brand);

  let cumDrawn = 0, cumInterest = 0;
  let reserveBalance = interestReserve;
  const monthlyRate = rate / 100 / 12;

  for (const p of periods) {
    const draw = p.projectedDraw || p.projected_draw || p.draw || 0;
    const equity = p.equityContribution || p.equity_contribution || p.equity || 0;
    cumDrawn += draw;
    const interest = cumDrawn * monthlyRate;
    cumInterest += interest;
    reserveBalance -= interest;

    sched.addRow([
      p.periodNumber || p.period_number || p.period || "",
      p.periodStart || p.start || "",
      p.periodEnd || p.end || "",
      draw,
      equity,
      cumDrawn,
      loanAmount - cumDrawn,
      Math.round(interest * 100) / 100,
      Math.round(reserveBalance * 100) / 100,
    ]);
  }

  addDisclosureRow(sched, brand, 9);

  // Tab 2: Interest Model
  const intSheet = workbook.addWorksheet("Interest Model");
  intSheet.getColumn(1).width = 10;
  intSheet.getColumn(2).width = 18; intSheet.getColumn(2).numFmt = currencyFormat();
  intSheet.getColumn(3).width = 12; intSheet.getColumn(3).numFmt = "0.00%";
  intSheet.getColumn(4).width = 18; intSheet.getColumn(4).numFmt = currencyFormat();
  intSheet.getColumn(5).width = 18; intSheet.getColumn(5).numFmt = currencyFormat();
  intSheet.getColumn(6).width = 18; intSheet.getColumn(6).numFmt = currencyFormat();

  const intHeaders = intSheet.addRow(["Month", "Drawn Balance", "Rate", "Monthly Interest", "Cumulative Interest", "Reserve Remaining"]);
  styleHeaderRow(intHeaders, brand);

  let intCumDrawn = 0, intCumInterest = 0;
  let intReserve = interestReserve;

  for (const p of periods) {
    const draw = p.projectedDraw || p.projected_draw || p.draw || 0;
    intCumDrawn += draw;
    const interest = intCumDrawn * monthlyRate;
    intCumInterest += interest;
    intReserve -= interest;

    const row = intSheet.addRow([
      p.periodNumber || p.period_number || p.period || "",
      intCumDrawn,
      rate / 100,
      Math.round(interest * 100) / 100,
      Math.round(intCumInterest * 100) / 100,
      Math.round(intReserve * 100) / 100,
    ]);

    if (intReserve < 0) {
      row.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }

  addDisclosureRow(intSheet, brand, 6);

  // Tab 3: Summary
  const summary = workbook.addWorksheet("Summary");
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 20; summary.getColumn(2).numFmt = currencyFormat();

  summary.addRow(["Key Metrics"]).font = { bold: true, size: 14, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  summary.addRow([]);
  summary.addRow(["Loan Commitment", loanAmount]).getCell(1).font = { bold: true, name: "Arial" };
  summary.addRow(["Annual Rate", rate + "%"]);
  summary.addRow(["Interest Reserve Funded", interestReserve]);
  summary.addRow(["Total Projected Interest", Math.round(intCumInterest * 100) / 100]);
  summary.addRow(["Reserve Surplus / (Deficit)", Math.round(intReserve * 100) / 100]).getCell(1).font = { bold: true, name: "Arial" };

  if (intReserve < 0) {
    const defRow = summary.addRow(["WARNING: Interest reserve projected insufficient"]);
    defRow.font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
  }

  addDisclosureRow(summary, brand, 2);
}

// --- W-015 Interest Reserve Model ---

function buildInterestReserve(workbook, data, brand) {
  const title = data.title || "Interest Reserve Model";
  const loanAmount = data.loanAmount || 0;
  const baseRate = data.rate || 0;
  const reserve = data.interestReserve || 0;
  const months = data.constructionMonths || 18;
  const drawSchedule = data.drawSchedule || [];

  // Build monthly draw progression (linear if no schedule provided)
  const monthlyDraws = [];
  if (drawSchedule.length > 0) {
    for (const d of drawSchedule) {
      monthlyDraws.push(d.projectedDraw || d.draw || d.amount || 0);
    }
  } else {
    const monthlyDraw = loanAmount / months;
    for (let i = 0; i < months; i++) {
      monthlyDraws.push(monthlyDraw);
    }
  }

  // Scenario definitions
  const scenarios = [
    { name: "Base Case", rateBps: 0, extraMonths: 0 },
    { name: "3-Month Delay", rateBps: 0, extraMonths: 3 },
    { name: "Rate +100bps", rateBps: 100, extraMonths: 0 },
    { name: "Rate +200bps", rateBps: 200, extraMonths: 0 },
  ];

  for (const scenario of scenarios) {
    const sheet = workbook.addWorksheet(scenario.name);
    sheet.addRow([title + " — " + scenario.name]).font = {
      bold: true, size: 14,
      color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
      name: "Arial",
    };
    if (data.projectName) {
      sheet.addRow(["Project: " + data.projectName]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
    }
    sheet.addRow([]);

    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 18; sheet.getColumn(2).numFmt = currencyFormat();
    sheet.getColumn(3).width = 18; sheet.getColumn(3).numFmt = currencyFormat();
    sheet.getColumn(4).width = 12; sheet.getColumn(4).numFmt = "0.00%";
    sheet.getColumn(5).width = 18; sheet.getColumn(5).numFmt = currencyFormat();
    sheet.getColumn(6).width = 18; sheet.getColumn(6).numFmt = currencyFormat();
    sheet.getColumn(7).width = 18; sheet.getColumn(7).numFmt = currencyFormat();

    const headers = sheet.addRow(["Month", "Draw This Month", "Drawn Balance", "Rate", "Monthly Interest", "Cumulative Interest", "Reserve Remaining"]);
    styleHeaderRow(headers, brand);

    const scenarioRate = (baseRate + scenario.rateBps / 100) / 100 / 12;
    const totalMonths = months + scenario.extraMonths;
    let cumDrawn = 0, cumInterest = 0, resBal = reserve;

    for (let m = 1; m <= totalMonths; m++) {
      const draw = m <= monthlyDraws.length ? monthlyDraws[m - 1] : 0;
      cumDrawn += draw;
      if (cumDrawn > loanAmount) cumDrawn = loanAmount;
      const interest = cumDrawn * scenarioRate;
      cumInterest += interest;
      resBal -= interest;

      const row = sheet.addRow([
        m,
        Math.round(draw * 100) / 100,
        Math.round(cumDrawn * 100) / 100,
        (baseRate + scenario.rateBps / 100) / 100,
        Math.round(interest * 100) / 100,
        Math.round(cumInterest * 100) / 100,
        Math.round(resBal * 100) / 100,
      ]);

      if (resBal < 0) {
        row.getCell(7).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
      }
    }

    // Summary at bottom
    sheet.addRow([]);
    sheet.addRow(["Total Projected Interest", "", "", "", "", Math.round(cumInterest * 100) / 100]).font = { bold: true, name: "Arial" };
    sheet.addRow(["Interest Reserve Funded", "", "", "", "", reserve]).font = { bold: true, name: "Arial" };
    const surplusRow = sheet.addRow(["Surplus / (Deficit)", "", "", "", "", Math.round(resBal * 100) / 100]);
    surplusRow.font = { bold: true, name: "Arial" };
    if (resBal < 0) {
      surplusRow.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }

    addDisclosureRow(sheet, brand, 7);
  }
}

// --- W-016 Full Capital Stack Model ---

function buildFullModel(workbook, data, brand) {
  const title = data.title || "Capital Stack Model";
  const layers = data.capitalLayers || [];
  const uses = data.uses || [];
  const totalProjectCost = data.totalProjectCost || uses.reduce((s, u) => s + (u.amount || 0), 0);
  const totalSources = layers.reduce((s, l) => s + (l.amount || 0), 0);
  const pf = data.proFormaAssumptions || {};
  const wf = data.waterfallTerms || {};
  const holdPeriod = pf.holdPeriod || 5;

  // Tab 1: Assumptions
  const assump = workbook.addWorksheet("Assumptions");
  assump.getColumn(1).width = 32;
  assump.getColumn(2).width = 22;

  assump.addRow([title]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.dealName) {
    assump.addRow([data.dealName]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  assump.addRow([]);

  const aRows = [
    ["Total Project Cost", totalProjectCost],
    ["Hold Period (Years)", holdPeriod],
    ["Gross Potential Rent", pf.grossPotentialRent || 0],
    ["Vacancy", (pf.vacancy || 0) * 100 + "%"],
    ["Other Income", pf.otherIncome || 0],
    ["Operating Expenses", pf.operatingExpenses || 0],
    ["Management Fee", (pf.managementFee || 0) * 100 + "%"],
    ["Reserves", pf.reserves || 0],
    ["Rent Growth", (pf.rentGrowth || 0) + "% / yr"],
    ["Expense Growth", (pf.expenseGrowth || 0) + "% / yr"],
    ["Exit Cap Rate", (pf.exitCapRate || 0) * 100 + "%"],
    ["Selling Costs", (pf.sellingCosts || 0) * 100 + "%"],
    ["Preferred Return", (wf.preferredReturn || 8) + "%"],
    ["LP/GP Residual Split", wf.residualSplit ? wf.residualSplit.map(v => (v * 100) + "%").join(" / ") : "80% / 20%"],
  ];

  for (const [label, val] of aRows) {
    const r = assump.addRow([label, val]);
    r.getCell(1).font = { bold: true, name: "Arial" };
    if (typeof val === "number" && label !== "Hold Period (Years)") r.getCell(2).numFmt = currencyFormat();
  }

  addDisclosureRow(assump, brand, 2);

  // Tab 2: Sources & Uses
  const su = workbook.addWorksheet("Sources & Uses");
  su.getColumn(1).width = 28;
  su.getColumn(2).width = 20; su.getColumn(2).numFmt = currencyFormat();
  su.getColumn(3).width = 12; su.getColumn(3).numFmt = percentFormat();
  su.getColumn(4).width = 6;
  su.getColumn(5).width = 28;
  su.getColumn(6).width = 20; su.getColumn(6).numFmt = currencyFormat();
  su.getColumn(7).width = 12; su.getColumn(7).numFmt = percentFormat();

  const suHeader = su.addRow(["SOURCES", "Amount", "%", "", "USES", "Amount", "%"]);
  styleHeaderRow(suHeader, brand);

  const maxRows = Math.max(layers.length, uses.length);
  const totalUses = uses.reduce((s, u) => s + (u.amount || 0), 0);

  for (let i = 0; i < maxRows; i++) {
    const l = layers[i];
    const u = uses[i];
    su.addRow([
      l ? (l.source || l.type || "") : "",
      l ? (l.amount || 0) : "",
      l && totalSources > 0 ? (l.amount || 0) / totalSources : "",
      "",
      u ? (u.category || u.name || "") : "",
      u ? (u.amount || 0) : "",
      u && totalUses > 0 ? (u.amount || 0) / totalUses : "",
    ]);
  }

  const totRow = su.addRow(["TOTAL", totalSources, 1, "", "TOTAL", totalUses, 1]);
  totRow.font = { bold: true, name: "Arial" };
  totRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  if (Math.abs(totalSources - totalUses) > 0.01) {
    const gapRow = su.addRow(["", "", "", "", "GAP", totalSources - totalUses]);
    gapRow.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
  }

  addDisclosureRow(su, brand, 7);

  // Tab 3: Capital Stack
  const cs = workbook.addWorksheet("Capital Stack");
  const csHeaders = cs.addRow(["Priority", "Source", "Type", "Amount", "% of Stack", "Cost / Rate", "Weighted Cost", "Term", "Status"]);
  styleHeaderRow(csHeaders, brand);

  cs.getColumn(1).width = 10;
  cs.getColumn(2).width = 22;
  cs.getColumn(3).width = 18;
  cs.getColumn(4).width = 18; cs.getColumn(4).numFmt = currencyFormat();
  cs.getColumn(5).width = 12; cs.getColumn(5).numFmt = percentFormat();
  cs.getColumn(6).width = 12; cs.getColumn(6).numFmt = percentFormat();
  cs.getColumn(7).width = 14; cs.getColumn(7).numFmt = percentFormat();
  cs.getColumn(8).width = 12;
  cs.getColumn(9).width = 14;

  let wacc = 0;
  for (const l of layers) {
    const amt = l.amount || 0;
    const pct = totalSources > 0 ? amt / totalSources : 0;
    const cost = (l.costOrRate || 0) / 100;
    const weighted = pct * cost;
    wacc += weighted;

    cs.addRow([
      l.priority || "",
      l.source || "",
      l.type || "",
      amt,
      pct,
      cost,
      weighted,
      l.term ? l.term + (l.term > 60 ? " yrs" : " mo") : "",
      l.status || "",
    ]);
  }

  const waccRow = cs.addRow(["", "", "WACC", totalSources, 1, "", wacc]);
  waccRow.font = { bold: true, name: "Arial" };
  waccRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  addDisclosureRow(cs, brand, 9);

  // Tab 4: Pro Forma
  const pfSheet = workbook.addWorksheet("Pro Forma");
  const pfHeaders = ["", ...Array.from({ length: holdPeriod }, (_, i) => "Year " + (i + 1))];
  const pfHeaderRow = pfSheet.addRow(pfHeaders);
  styleHeaderRow(pfHeaderRow, brand);

  pfSheet.getColumn(1).width = 28;
  for (let i = 2; i <= holdPeriod + 1; i++) { pfSheet.getColumn(i).width = 16; pfSheet.getColumn(i).numFmt = currencyFormat(); }

  const gpr = pf.grossPotentialRent || 0;
  const vac = pf.vacancy || 0;
  const otherInc = pf.otherIncome || 0;
  const opex = pf.operatingExpenses || 0;
  const mgmtFee = pf.managementFee || 0;
  const reserveAmt = pf.reserves || 0;
  const rentGr = (pf.rentGrowth || 0) / 100;
  const expGr = (pf.expenseGrowth || 0) / 100;

  const pfData = {};
  const pfLabels = ["Gross Potential Rent", "Vacancy", "Other Income", "Effective Gross Income", "Operating Expenses", "Management Fee", "Reserves", "Net Operating Income"];

  for (const label of pfLabels) { pfData[label] = []; }

  for (let y = 0; y < holdPeriod; y++) {
    const gprY = gpr * Math.pow(1 + rentGr, y);
    const vacY = gprY * vac;
    const otherY = otherInc * Math.pow(1 + rentGr, y);
    const egi = gprY - vacY + otherY;
    const opexY = opex * Math.pow(1 + expGr, y);
    const mgmtY = egi * mgmtFee;
    const noi = egi - opexY - mgmtY - reserveAmt;

    pfData["Gross Potential Rent"].push(Math.round(gprY));
    pfData["Vacancy"].push(Math.round(-vacY));
    pfData["Other Income"].push(Math.round(otherY));
    pfData["Effective Gross Income"].push(Math.round(egi));
    pfData["Operating Expenses"].push(Math.round(-opexY));
    pfData["Management Fee"].push(Math.round(-mgmtY));
    pfData["Reserves"].push(Math.round(-reserveAmt));
    pfData["Net Operating Income"].push(Math.round(noi));
  }

  for (const label of pfLabels) {
    const r = pfSheet.addRow([label, ...pfData[label]]);
    if (label === "Effective Gross Income" || label === "Net Operating Income") {
      r.font = { bold: true, name: "Arial" };
      r.eachCell((cell) => { cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } } }; });
    }
  }

  addDisclosureRow(pfSheet, brand, holdPeriod + 1);

  // Tab 5: Debt Service
  const dsSheet = workbook.addWorksheet("Debt Service");
  const dsHeaders = ["", ...Array.from({ length: holdPeriod }, (_, i) => "Year " + (i + 1))];
  const dsHeaderRow = dsSheet.addRow(dsHeaders);
  styleHeaderRow(dsHeaderRow, brand);

  dsSheet.getColumn(1).width = 28;
  for (let i = 2; i <= holdPeriod + 1; i++) { dsSheet.getColumn(i).width = 16; dsSheet.getColumn(i).numFmt = currencyFormat(); }

  const debtLayers = layers.filter(l => l.type === "senior_debt" || l.type === "mezz");
  let totalDsByYear = new Array(holdPeriod).fill(0);

  for (const dl of debtLayers) {
    const amt = dl.amount || 0;
    const rate = (dl.costOrRate || 0) / 100;
    const annualInterest = amt * rate;
    const dsValues = new Array(holdPeriod).fill(Math.round(annualInterest));
    dsValues.forEach((v, i) => { totalDsByYear[i] += v; });
    dsSheet.addRow([dl.source || dl.type || "", ...dsValues]);
  }

  const totalDsRow = dsSheet.addRow(["Total Debt Service", ...totalDsByYear]);
  totalDsRow.font = { bold: true, name: "Arial" };
  totalDsRow.eachCell((cell) => { cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } } }; });

  // Cash flow after debt service
  const cfads = pfData["Net Operating Income"].map((noi, i) => noi - totalDsByYear[i]);
  dsSheet.addRow([]);
  const cfRow = dsSheet.addRow(["Cash Flow After Debt Service", ...cfads]);
  cfRow.font = { bold: true, name: "Arial" };

  // DSCR
  const dscr = pfData["Net Operating Income"].map((noi, i) => totalDsByYear[i] > 0 ? (noi / totalDsByYear[i]).toFixed(2) + "x" : "N/A");
  dsSheet.addRow(["DSCR", ...dscr]);

  addDisclosureRow(dsSheet, brand, holdPeriod + 1);

  // Tab 6: Waterfall — Operating
  const wfOp = workbook.addWorksheet("Waterfall Operating");
  const prefReturn = (wf.preferredReturn || 8) / 100;
  const totalEquity = layers.filter(l => l.type === "common_equity" || l.type === "preferred_equity").reduce((s, l) => s + (l.amount || 0), 0);
  const lpShare = wf.residualSplit ? wf.residualSplit[0] : 0.80;
  const gpShare = wf.residualSplit ? wf.residualSplit[1] : 0.20;

  const wfOpHeaders = wfOp.addRow(["", ...Array.from({ length: holdPeriod }, (_, i) => "Year " + (i + 1))]);
  styleHeaderRow(wfOpHeaders, brand);

  wfOp.getColumn(1).width = 28;
  for (let i = 2; i <= holdPeriod + 1; i++) { wfOp.getColumn(i).width = 16; wfOp.getColumn(i).numFmt = currencyFormat(); }

  wfOp.addRow(["Cash Available for Distribution", ...cfads]);
  const prefAmtAnnual = Math.round(totalEquity * prefReturn);
  const prefRow = cfads.map(cf => Math.min(cf, prefAmtAnnual));
  wfOp.addRow(["Preferred Return (" + (wf.preferredReturn || 8) + "%)", ...prefRow]);

  const residual = cfads.map((cf, i) => Math.max(0, cf - prefRow[i]));
  wfOp.addRow(["Residual", ...residual]);
  wfOp.addRow(["LP Share (" + (lpShare * 100) + "%)", ...residual.map(r => Math.round(r * lpShare))]);
  wfOp.addRow(["GP Share (" + (gpShare * 100) + "%)", ...residual.map(r => Math.round(r * gpShare))]);

  const lpTotal = cfads.map((cf, i) => prefRow[i] + Math.round(residual[i] * lpShare));
  const gpTotal = residual.map(r => Math.round(r * gpShare));
  wfOp.addRow([]);
  const lpTotRow = wfOp.addRow(["Total LP Distribution", ...lpTotal]);
  lpTotRow.font = { bold: true, name: "Arial" };
  const gpTotRow = wfOp.addRow(["Total GP Distribution", ...gpTotal]);
  gpTotRow.font = { bold: true, name: "Arial" };

  addDisclosureRow(wfOp, brand, holdPeriod + 1);

  // Tab 7: Waterfall — Disposition
  const wfDisp = workbook.addWorksheet("Waterfall Disposition");
  wfDisp.getColumn(1).width = 32;
  wfDisp.getColumn(2).width = 22; wfDisp.getColumn(2).numFmt = currencyFormat();

  wfDisp.addRow(["Disposition Waterfall"]).font = { bold: true, size: 14, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  wfDisp.addRow([]);

  const exitNoi = pfData["Net Operating Income"][holdPeriod - 1] || 0;
  const exitCap = pf.exitCapRate || 0.05;
  const grossSalePrice = exitCap > 0 ? Math.round(exitNoi / exitCap) : 0;
  const sellingCosts = Math.round(grossSalePrice * (pf.sellingCosts || 0.02));
  const netSaleProceeds = grossSalePrice - sellingCosts;
  const debtPayoff = debtLayers.reduce((s, l) => s + (l.amount || 0), 0);
  const equityProceeds = netSaleProceeds - debtPayoff;

  wfDisp.addRow(["Exit NOI (Year " + holdPeriod + ")", exitNoi]).getCell(1).font = { bold: true, name: "Arial" };
  wfDisp.addRow(["Exit Cap Rate", exitCap * 100 + "%"]);
  wfDisp.addRow(["Gross Sale Price", grossSalePrice]).getCell(1).font = { bold: true, name: "Arial" };
  wfDisp.addRow(["Selling Costs", -sellingCosts]);
  wfDisp.addRow(["Net Sale Proceeds", netSaleProceeds]).getCell(1).font = { bold: true, name: "Arial" };
  wfDisp.addRow(["Debt Payoff", -debtPayoff]);
  wfDisp.addRow(["Equity Proceeds", equityProceeds]).getCell(1).font = { bold: true, name: "Arial" };
  wfDisp.addRow([]);
  wfDisp.addRow(["Return of Capital", Math.min(equityProceeds, totalEquity)]).getCell(1).font = { bold: true, name: "Arial" };

  const dispResidual = Math.max(0, equityProceeds - totalEquity);
  wfDisp.addRow(["Residual Profit", dispResidual]);
  wfDisp.addRow(["LP Share (" + (lpShare * 100) + "%)", Math.round(dispResidual * lpShare)]);
  wfDisp.addRow(["GP Promote (" + (gpShare * 100) + "%)", Math.round(dispResidual * gpShare)]);

  addDisclosureRow(wfDisp, brand, 2);

  // Tab 8: Return Summary
  const retSheet = workbook.addWorksheet("Return Summary");
  retSheet.getColumn(1).width = 28;
  retSheet.getColumn(2).width = 20;

  retSheet.addRow(["Return Summary"]).font = { bold: true, size: 14, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  retSheet.addRow([]);

  const totalLpDist = lpTotal.reduce((s, v) => s + v, 0) + Math.min(equityProceeds, totalEquity) + Math.round(dispResidual * lpShare);
  const totalGpDist = gpTotal.reduce((s, v) => s + v, 0) + Math.round(dispResidual * gpShare);
  const lpEquity = totalEquity * lpShare;
  const gpEquity = totalEquity * gpShare;
  const lpMult = lpEquity > 0 ? (totalLpDist / lpEquity).toFixed(2) : "N/A";
  const gpMult = gpEquity > 0 ? (totalGpDist / gpEquity).toFixed(2) : "N/A";
  const eqMult = totalEquity > 0 ? ((totalLpDist + totalGpDist) / totalEquity).toFixed(2) : "N/A";
  const cocY1 = totalEquity > 0 ? (cfads[0] / totalEquity * 100).toFixed(1) : "N/A";

  const retRows = [
    ["Total Equity", totalEquity],
    ["Total LP Distributions", totalLpDist],
    ["Total GP Distributions", totalGpDist],
    ["LP Equity Multiple", lpMult + "x"],
    ["GP Equity Multiple", gpMult + "x"],
    ["Total Equity Multiple", eqMult + "x"],
    ["Year 1 Cash-on-Cash", cocY1 + "%"],
    ["WACC", (wacc * 100).toFixed(2) + "%"],
  ];

  for (const [label, val] of retRows) {
    const r = retSheet.addRow([label, val]);
    r.getCell(1).font = { bold: true, name: "Arial" };
    if (typeof val === "number") r.getCell(2).numFmt = currencyFormat();
  }

  addDisclosureRow(retSheet, brand, 2);

  // Tab 9: Sensitivity
  const sensSheet = workbook.addWorksheet("Sensitivity");
  sensSheet.getColumn(1).width = 20;

  sensSheet.addRow(["Sensitivity Analysis — Equity Multiple by Exit Cap / Rent Growth"]).font = {
    bold: true, size: 12,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  sensSheet.addRow([]);

  const exitCaps = [exitCap - 0.01, exitCap - 0.005, exitCap, exitCap + 0.005, exitCap + 0.01, exitCap + 0.015];
  const rentGrowths = [(pf.rentGrowth || 3) - 2, (pf.rentGrowth || 3) - 1, pf.rentGrowth || 3, (pf.rentGrowth || 3) + 1, (pf.rentGrowth || 3) + 2];

  const sensHeaderRow = sensSheet.addRow(["Exit Cap / Rent Gr.", ...rentGrowths.map(rg => rg + "%")]);
  styleHeaderRow(sensHeaderRow, brand);
  for (let i = 2; i <= rentGrowths.length + 1; i++) { sensSheet.getColumn(i).width = 14; }

  for (const ec of exitCaps) {
    const row = [(ec * 100).toFixed(1) + "%"];
    for (const rg of rentGrowths) {
      const adjExitNoi = (pf.grossPotentialRent || 0) * (1 - (pf.vacancy || 0)) * Math.pow(1 + rg / 100, holdPeriod - 1) - (pf.operatingExpenses || 0) * Math.pow(1 + (pf.expenseGrowth || 0) / 100, holdPeriod - 1);
      const adjSalePrice = ec > 0 ? adjExitNoi / ec : 0;
      const adjNetProceeds = adjSalePrice * (1 - (pf.sellingCosts || 0.02));
      const adjEquityProceeds = adjNetProceeds - debtPayoff;
      const adjTotalDist = cfads.reduce((s, v) => s + v, 0) + adjEquityProceeds;
      const adjMult = totalEquity > 0 ? (adjTotalDist / totalEquity).toFixed(2) : "N/A";
      row.push(adjMult + "x");
    }
    sensSheet.addRow(row);
  }

  addDisclosureRow(sensSheet, brand, rentGrowths.length + 1);

  // Tab 10: Scenarios
  const scenSheet = workbook.addWorksheet("Scenarios");
  scenSheet.getColumn(1).width = 28;

  scenSheet.addRow(["Scenario Comparison"]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  scenSheet.addRow([]);

  const scenData = data.scenarios || {};
  const scenNames = Object.keys(scenData);
  if (scenNames.length > 0) {
    for (let i = 0; i < scenNames.length; i++) { scenSheet.getColumn(i + 2).width = 18; }

    const scenHeader = scenSheet.addRow(["Metric", ...scenNames.map(s => s.charAt(0).toUpperCase() + s.slice(1))]);
    styleHeaderRow(scenHeader, brand);

    const scenFields = ["leveredIrr", "lpIrr", "gpIrr", "equityMultiple", "lpEquityMultiple", "cashOnCashY1", "dscr"];
    const scenFieldLabels = { leveredIrr: "Levered IRR", lpIrr: "LP IRR", gpIrr: "GP IRR", equityMultiple: "Equity Multiple", lpEquityMultiple: "LP Equity Multiple", cashOnCashY1: "Year 1 CoC", dscr: "Min DSCR" };

    for (const f of scenFields) {
      const row = [scenFieldLabels[f] || f];
      for (const s of scenNames) {
        const sc = scenData[s] || {};
        const metrics = sc.returnMetrics || sc.metrics || sc;
        const val = metrics[f];
        row.push(val != null ? String(val) : "N/A");
      }
      scenSheet.addRow(row);
    }
  } else {
    scenSheet.addRow(["No scenario data provided."]);
  }

  addDisclosureRow(scenSheet, brand, scenNames.length + 1);
}

// --- W-016 Waterfall Distribution Model ---

function buildWaterfall(workbook, data, brand) {
  const title = data.title || "Waterfall Distribution Model";
  const wf = data.waterfallTerms || {};
  const holdPeriod = data.holdPeriod || 5;
  const totalEquity = data.totalEquity || 0;
  const annualCFs = data.annualCashFlows || [];
  const dispProceeds = data.dispositionProceeds || 0;
  const prefReturn = (wf.preferredReturn || 8) / 100;
  const lpShare = wf.residualSplit ? wf.residualSplit[0] : 0.80;
  const gpShare = wf.residualSplit ? wf.residualSplit[1] : 0.20;

  // Tab 1: Operating CF Waterfall
  const opSheet = workbook.addWorksheet("Operating Waterfall");
  opSheet.addRow([title + " — Operating Cash Flow"]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.dealName) {
    opSheet.addRow([data.dealName]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  opSheet.addRow([]);

  const years = Math.max(holdPeriod, annualCFs.length);
  opSheet.getColumn(1).width = 28;
  for (let i = 2; i <= years + 1; i++) { opSheet.getColumn(i).width = 16; opSheet.getColumn(i).numFmt = currencyFormat(); }

  const opHeaders = opSheet.addRow(["", ...Array.from({ length: years }, (_, i) => "Year " + (i + 1))]);
  styleHeaderRow(opHeaders, brand);

  const cfs = Array.from({ length: years }, (_, i) => annualCFs[i] || 0);
  opSheet.addRow(["Cash Available", ...cfs]);

  const prefAmt = Math.round(totalEquity * prefReturn);
  const prefPaid = cfs.map(cf => Math.min(cf, prefAmt));
  opSheet.addRow(["Preferred Return (" + (wf.preferredReturn || 8) + "%)", ...prefPaid]);

  const residual = cfs.map((cf, i) => Math.max(0, cf - prefPaid[i]));
  opSheet.addRow(["Residual", ...residual]);

  const lpResidual = residual.map(r => Math.round(r * lpShare));
  const gpResidual = residual.map(r => Math.round(r * gpShare));
  opSheet.addRow(["LP (" + (lpShare * 100) + "%)", ...lpResidual]);
  opSheet.addRow(["GP (" + (gpShare * 100) + "%)", ...gpResidual]);

  opSheet.addRow([]);
  const lpTotalOp = cfs.map((cf, i) => prefPaid[i] + lpResidual[i]);
  const gpTotalOp = gpResidual;
  const lpTotRow = opSheet.addRow(["Total to LP", ...lpTotalOp]);
  lpTotRow.font = { bold: true, name: "Arial" };
  const gpTotRow = opSheet.addRow(["Total to GP", ...gpTotalOp]);
  gpTotRow.font = { bold: true, name: "Arial" };

  addDisclosureRow(opSheet, brand, years + 1);

  // Tab 2: Disposition Waterfall
  const dispSheet = workbook.addWorksheet("Disposition Waterfall");
  dispSheet.getColumn(1).width = 32;
  dispSheet.getColumn(2).width = 22; dispSheet.getColumn(2).numFmt = currencyFormat();

  dispSheet.addRow([title + " — Disposition"]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  dispSheet.addRow([]);

  dispSheet.addRow(["Net Sale Proceeds", dispProceeds]).getCell(1).font = { bold: true, name: "Arial" };
  dispSheet.addRow(["Return of Capital", Math.min(dispProceeds, totalEquity)]).getCell(1).font = { bold: true, name: "Arial" };
  const dispResidual = Math.max(0, dispProceeds - totalEquity);
  dispSheet.addRow(["Residual Profit", dispResidual]);
  dispSheet.addRow(["LP Share (" + (lpShare * 100) + "%)", Math.round(dispResidual * lpShare)]);
  dispSheet.addRow(["GP Promote (" + (gpShare * 100) + "%)", Math.round(dispResidual * gpShare)]);

  dispSheet.addRow([]);
  const lpDispTotal = Math.min(dispProceeds, totalEquity) + Math.round(dispResidual * lpShare);
  const gpDispTotal = Math.round(dispResidual * gpShare);
  dispSheet.addRow(["Total to LP", lpDispTotal]).font = { bold: true, name: "Arial" };
  dispSheet.addRow(["Total to GP", gpDispTotal]).font = { bold: true, name: "Arial" };

  addDisclosureRow(dispSheet, brand, 2);

  // Tab 3: LP Return Detail
  const lpSheet = workbook.addWorksheet("LP Detail");
  lpSheet.getColumn(1).width = 28;
  lpSheet.getColumn(2).width = 20; lpSheet.getColumn(2).numFmt = currencyFormat();

  lpSheet.addRow(["LP Return Summary"]).font = { bold: true, size: 14, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  lpSheet.addRow([]);

  const lpEquity = totalEquity * lpShare;
  const lpOpTotal = lpTotalOp.reduce((s, v) => s + v, 0);
  const lpAllIn = lpOpTotal + lpDispTotal;
  const lpMult = lpEquity > 0 ? (lpAllIn / lpEquity).toFixed(2) : "N/A";

  lpSheet.addRow(["LP Equity Invested", lpEquity]).getCell(1).font = { bold: true, name: "Arial" };
  lpSheet.addRow(["Operating Distributions", lpOpTotal]);

  for (let i = 0; i < years; i++) {
    lpSheet.addRow(["  Year " + (i + 1), lpTotalOp[i]]);
  }

  lpSheet.addRow(["Disposition Proceeds", lpDispTotal]);
  lpSheet.addRow(["Total Distributions", lpAllIn]).getCell(1).font = { bold: true, name: "Arial" };
  lpSheet.addRow(["LP Equity Multiple", lpMult + "x"]).getCell(1).font = { bold: true, name: "Arial" };

  addDisclosureRow(lpSheet, brand, 2);

  // Tab 4: GP Return Detail
  const gpSheet = workbook.addWorksheet("GP Detail");
  gpSheet.getColumn(1).width = 28;
  gpSheet.getColumn(2).width = 20; gpSheet.getColumn(2).numFmt = currencyFormat();

  gpSheet.addRow(["GP Return Summary"]).font = { bold: true, size: 14, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  gpSheet.addRow([]);

  const gpEquity = totalEquity * gpShare;
  const gpOpTotal = gpTotalOp.reduce((s, v) => s + v, 0);
  const gpAllIn = gpOpTotal + gpDispTotal;
  const gpMult = gpEquity > 0 ? (gpAllIn / gpEquity).toFixed(2) : "N/A";

  gpSheet.addRow(["GP Equity Invested", gpEquity]).getCell(1).font = { bold: true, name: "Arial" };
  gpSheet.addRow(["Operating Promote", gpOpTotal]);

  for (let i = 0; i < years; i++) {
    gpSheet.addRow(["  Year " + (i + 1), gpTotalOp[i]]);
  }

  gpSheet.addRow(["Disposition Promote", gpDispTotal]);
  gpSheet.addRow(["Total GP Income", gpAllIn]).getCell(1).font = { bold: true, name: "Arial" };
  gpSheet.addRow(["GP Equity Multiple", gpMult + "x"]).getCell(1).font = { bold: true, name: "Arial" };

  addDisclosureRow(gpSheet, brand, 2);

  // Tab 5: Comparison
  const compSheet = workbook.addWorksheet("Comparison");
  compSheet.getColumn(1).width = 28;
  compSheet.getColumn(2).width = 20; compSheet.getColumn(2).numFmt = currencyFormat();
  compSheet.getColumn(3).width = 20; compSheet.getColumn(3).numFmt = currencyFormat();
  compSheet.getColumn(4).width = 20; compSheet.getColumn(4).numFmt = currencyFormat();

  const compHeaderRow = compSheet.addRow(["", "LP", "GP", "Total"]);
  styleHeaderRow(compHeaderRow, brand);

  compSheet.addRow(["Equity Invested", lpEquity, gpEquity, totalEquity]);
  compSheet.addRow(["Operating Distributions", lpOpTotal, gpOpTotal, lpOpTotal + gpOpTotal]);
  compSheet.addRow(["Disposition Proceeds", lpDispTotal, gpDispTotal, lpDispTotal + gpDispTotal]);
  compSheet.addRow(["Total Distributions", lpAllIn, gpAllIn, lpAllIn + gpAllIn]).font = { bold: true, name: "Arial" };
  compSheet.addRow(["Equity Multiple", lpMult + "x", gpMult + "x", totalEquity > 0 ? ((lpAllIn + gpAllIn) / totalEquity).toFixed(2) + "x" : "N/A"]);

  addDisclosureRow(compSheet, brand, 4);
}

// ── W-002 CRE Analyst XLSX builders ──

function buildAssumptions(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Assumptions");
  sheet.getColumn(1).width = 35;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 25;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 30;

  const header = sheet.addRow(["Assumption", "Value", "Unit", "Source", "Sensitivity", "Notes"]);
  styleHeaderRow(header, brand);

  const assumptions = data.assumptions || [];
  assumptions.forEach(a => {
    sheet.addRow([
      a.assumption || "—",
      a.value != null ? a.value : "—",
      a.unit || "—",
      a.source || "—",
      a.sensitivity || "—",
      a.notes || "",
    ]);
  });

  addDisclosureRow(sheet, brand, 6);
}

function buildEvidenceTable(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Evidence");
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 35;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 25;

  const header = sheet.addRow(["Claim", "Value", "Unit", "Evidence Pointer", "Confidence", "Notes"]);
  styleHeaderRow(header, brand);

  const claims = data.claims || [];
  claims.forEach(c => {
    const pointer = c.evidencePointers
      ? (Array.isArray(c.evidencePointers) ? c.evidencePointers.map(p => `${p.sourceType || ""}:${p.fileId || ""}${p.page ? ` p.${p.page}` : ""}`).join("; ") : String(c.evidencePointers))
      : "—";
    sheet.addRow([
      c.claim || "—",
      c.value != null ? c.value : "—",
      c.unit || "—",
      pointer,
      c.confidence || "—",
      c.notes || "",
    ]);
  });

  addDisclosureRow(sheet, brand, 6);
}

// ── W-019 Investor Relations XLSX builders ──

function buildFeeAnalysis(workbook, data, brand) {
  const fundSize = data.fundSize || 50000000;
  const fundName = data.fundName || "Fund";
  const mgmtFee = data.managementFee || 0.02;
  const carry = data.carry || 0.20;
  const hurdleRate = data.hurdleRate || 0.08;
  const gpCommit = data.gpCommit || 0.02;
  const fundLife = data.fundLife || 7;
  const investmentPeriod = data.investmentPeriod || 3;

  // Tab 1: Management Fees
  const feeSheet = workbook.addWorksheet("Management Fees");
  feeSheet.getColumn(1).width = 12;
  feeSheet.getColumn(2).width = 22; feeSheet.getColumn(2).numFmt = currencyFormat();
  feeSheet.getColumn(3).width = 14;
  feeSheet.getColumn(4).width = 22; feeSheet.getColumn(4).numFmt = currencyFormat();
  feeSheet.getColumn(5).width = 22; feeSheet.getColumn(5).numFmt = currencyFormat();

  const feeHeader = feeSheet.addRow(["Year", "Fund Size", "Fee Rate", "Annual Fee", "Cumulative Fees"]);
  styleHeaderRow(feeHeader, brand);

  let cumFees = 0;
  for (let y = 1; y <= fundLife; y++) {
    const base = y <= investmentPeriod ? fundSize : fundSize * 0.75;
    const rate = y <= investmentPeriod ? mgmtFee : mgmtFee * 0.75;
    const fee = base * rate;
    cumFees += fee;
    feeSheet.addRow([y, base, `${(rate * 100).toFixed(2)}%`, fee, cumFees]);
  }
  feeSheet.addRow([]).font = { bold: true };
  feeSheet.addRow(["Total", "", "", cumFees, ""]).font = { bold: true, name: "Arial" };
  addDisclosureRow(feeSheet, brand, 5);

  // Tab 2: Carry Projection
  const carrySheet = workbook.addWorksheet("Carry Projection");
  carrySheet.getColumn(1).width = 20;
  carrySheet.getColumn(2).width = 20; carrySheet.getColumn(2).numFmt = currencyFormat();
  carrySheet.getColumn(3).width = 20; carrySheet.getColumn(3).numFmt = currencyFormat();
  carrySheet.getColumn(4).width = 20; carrySheet.getColumn(4).numFmt = currencyFormat();

  const carryHeader = carrySheet.addRow(["Scenario", "Total Profit", "GP Carry", "LP Net"]);
  styleHeaderRow(carryHeader, brand);

  const scenarios = [
    { label: "1.5x Return", mult: 1.5 },
    { label: "2.0x Return", mult: 2.0 },
    { label: "2.5x Return", mult: 2.5 },
    { label: "3.0x Return", mult: 3.0 },
  ];
  const projReturns = data.projectedReturns || [];
  const scenData = projReturns.length > 0 ? projReturns : scenarios;
  scenData.forEach(s => {
    const mult = s.mult || s.multiple || 2.0;
    const totalReturn = fundSize * mult;
    const profit = totalReturn - fundSize;
    const prefAmount = fundSize * hurdleRate * fundLife;
    const carryableProfit = Math.max(0, profit - prefAmount);
    const gpCarry = carryableProfit * carry;
    const lpNet = totalReturn - gpCarry;
    carrySheet.addRow([s.label || `${mult}x`, profit, gpCarry, lpNet]);
  });
  addDisclosureRow(carrySheet, brand, 4);

  // Tab 3: GP Commitment
  const gpSheet = workbook.addWorksheet("GP Commitment");
  gpSheet.getColumn(1).width = 25;
  gpSheet.getColumn(2).width = 25; gpSheet.getColumn(2).numFmt = currencyFormat();

  const gpHeader = gpSheet.addRow(["Item", "Amount"]);
  styleHeaderRow(gpHeader, brand);

  const gpAmount = fundSize * gpCommit;
  gpSheet.addRow(["Fund Size", fundSize]);
  gpSheet.addRow(["GP Commit %", `${(gpCommit * 100).toFixed(1)}%`]);
  gpSheet.addRow(["GP Commitment $", gpAmount]);
  gpSheet.addRow(["LP Commitment", fundSize - gpAmount]);
  addDisclosureRow(gpSheet, brand, 2);

  // Tab 4: Net Returns
  const netSheet = workbook.addWorksheet("Net Returns");
  netSheet.getColumn(1).width = 20;
  netSheet.getColumn(2).width = 16;
  netSheet.getColumn(3).width = 16;
  netSheet.getColumn(4).width = 16;

  const netHeader = netSheet.addRow(["Scenario", "Gross Multiple", "Net Multiple", "Net IRR Est."]);
  styleHeaderRow(netHeader, brand);

  scenData.forEach(s => {
    const mult = s.mult || s.multiple || 2.0;
    const totalReturn = fundSize * mult;
    const profit = totalReturn - fundSize;
    const prefAmount = fundSize * hurdleRate * fundLife;
    const carryableProfit = Math.max(0, profit - prefAmount);
    const gpCarry = carryableProfit * carry;
    const netReturn = totalReturn - gpCarry - cumFees;
    const netMult = netReturn / fundSize;
    const estIrr = Math.pow(netMult, 1 / fundLife) - 1;
    netSheet.addRow([s.label || `${mult}x`, `${mult.toFixed(2)}x`, `${netMult.toFixed(2)}x`, `${(estIrr * 100).toFixed(1)}%`]);
  });
  addDisclosureRow(netSheet, brand, 4);
}

function buildIrWaterfall(workbook, data, brand) {
  const totalEquity = data.totalEquity || 10000000;
  const prefReturn = data.prefReturn || 0.08;
  const catchUpSplit = data.catchUpSplit || 1.0;
  const carrySplit = data.carrySplit || 0.20;
  const cashFlows = data.cashFlows || data.annualCashFlows || [];
  const dispProceeds = data.dispositionProceeds || 0;
  const holdPeriod = data.holdPeriod || 5;
  const investors = data.investors || [];

  // Tab 1: Return of Capital
  const rocSheet = workbook.addWorksheet("Return of Capital");
  rocSheet.getColumn(1).width = 20;
  rocSheet.getColumn(2).width = 20; rocSheet.getColumn(2).numFmt = currencyFormat();
  rocSheet.getColumn(3).width = 20; rocSheet.getColumn(3).numFmt = currencyFormat();

  const rocHeader = rocSheet.addRow(["Period", "Distribution", "Remaining Capital"]);
  styleHeaderRow(rocHeader, brand);

  let remainingCap = totalEquity;
  const periods = cashFlows.length > 0 ? cashFlows : Array(holdPeriod).fill(totalEquity * 0.06);
  periods.forEach((cf, i) => {
    const amt = typeof cf === "number" ? cf : cf.amount || 0;
    const toCapital = Math.min(amt, remainingCap);
    remainingCap -= toCapital;
    rocSheet.addRow([`Year ${i + 1}`, toCapital, remainingCap]);
  });
  if (dispProceeds > 0) {
    const toCapital = Math.min(dispProceeds, remainingCap);
    remainingCap -= toCapital;
    rocSheet.addRow(["Disposition", toCapital, remainingCap]);
  }
  addDisclosureRow(rocSheet, brand, 3);

  // Tab 2: Preferred Return
  const prefSheet = workbook.addWorksheet("Preferred Return");
  prefSheet.getColumn(1).width = 20;
  prefSheet.getColumn(2).width = 20; prefSheet.getColumn(2).numFmt = currencyFormat();
  prefSheet.getColumn(3).width = 20; prefSheet.getColumn(3).numFmt = currencyFormat();

  const prefHeader = prefSheet.addRow(["Period", "Pref Accrued", "Pref Paid"]);
  styleHeaderRow(prefHeader, brand);

  let cumPrefAccrued = 0;
  let cumPrefPaid = 0;
  for (let y = 1; y <= holdPeriod; y++) {
    const accrued = totalEquity * prefReturn;
    cumPrefAccrued += accrued;
    const cf = periods[y - 1];
    const amt = typeof cf === "number" ? cf : cf ? cf.amount || 0 : 0;
    const prefPaid = Math.min(amt, cumPrefAccrued - cumPrefPaid);
    cumPrefPaid += prefPaid;
    prefSheet.addRow([`Year ${y}`, cumPrefAccrued, cumPrefPaid]);
  }
  addDisclosureRow(prefSheet, brand, 3);

  // Tab 3: GP Catch-Up
  const catchSheet = workbook.addWorksheet("GP Catch-Up");
  catchSheet.getColumn(1).width = 25;
  catchSheet.getColumn(2).width = 25; catchSheet.getColumn(2).numFmt = currencyFormat();

  const catchHeader = catchSheet.addRow(["Item", "Amount"]);
  styleHeaderRow(catchHeader, brand);

  const totalDist = periods.reduce((s, cf) => s + (typeof cf === "number" ? cf : cf.amount || 0), 0) + dispProceeds;
  const totalProfit = totalDist - totalEquity;
  const targetGpProfit = Math.max(0, totalProfit) * carrySplit;
  const catchUpAmount = Math.min(targetGpProfit, Math.max(0, totalProfit - cumPrefAccrued));
  catchSheet.addRow(["Total Distributions", totalDist]);
  catchSheet.addRow(["Total Equity", totalEquity]);
  catchSheet.addRow(["Total Profit", totalProfit]);
  catchSheet.addRow(["Target GP Share", targetGpProfit]);
  catchSheet.addRow(["Catch-Up Amount", catchUpAmount]);
  addDisclosureRow(catchSheet, brand, 2);

  // Tab 4: Carried Interest Split
  const splitSheet = workbook.addWorksheet("Carried Interest");
  splitSheet.getColumn(1).width = 25;
  splitSheet.getColumn(2).width = 20; splitSheet.getColumn(2).numFmt = currencyFormat();
  splitSheet.getColumn(3).width = 20; splitSheet.getColumn(3).numFmt = currencyFormat();
  splitSheet.getColumn(4).width = 20; splitSheet.getColumn(4).numFmt = currencyFormat();

  const splitHeader = splitSheet.addRow(["", "LP", "GP", "Total"]);
  styleHeaderRow(splitHeader, brand);

  const residual = Math.max(0, totalProfit - cumPrefAccrued - catchUpAmount);
  const lpResidual = residual * (1 - carrySplit);
  const gpResidual = residual * carrySplit;
  const lpTotal = totalEquity + cumPrefPaid + lpResidual;
  const gpTotal = catchUpAmount + gpResidual;

  splitSheet.addRow(["Return of Capital", totalEquity, 0, totalEquity]);
  splitSheet.addRow(["Preferred Return", cumPrefPaid, 0, cumPrefPaid]);
  splitSheet.addRow(["GP Catch-Up", 0, catchUpAmount, catchUpAmount]);
  splitSheet.addRow(["Residual Split", lpResidual, gpResidual, residual]);
  splitSheet.addRow(["Total", lpTotal, gpTotal, lpTotal + gpTotal]).font = { bold: true, name: "Arial" };
  addDisclosureRow(splitSheet, brand, 4);

  // Tab 5: Investor Allocations
  const allocSheet = workbook.addWorksheet("Allocations");
  allocSheet.getColumn(1).width = 25;
  allocSheet.getColumn(2).width = 20; allocSheet.getColumn(2).numFmt = currencyFormat();
  allocSheet.getColumn(3).width = 14;
  allocSheet.getColumn(4).width = 20; allocSheet.getColumn(4).numFmt = currencyFormat();

  const allocHeader = allocSheet.addRow(["Investor", "Commitment", "Share %", "Total Distribution"]);
  styleHeaderRow(allocHeader, brand);

  if (investors.length > 0) {
    const totalCommit = investors.reduce((s, inv) => s + (inv.commitment || 0), 0);
    investors.forEach(inv => {
      const share = totalCommit > 0 ? (inv.commitment || 0) / totalCommit : 0;
      allocSheet.addRow([inv.name || "—", inv.commitment || 0, `${(share * 100).toFixed(2)}%`, lpTotal * share]);
    });
  } else {
    allocSheet.addRow(["(No investor data provided)", "", "", ""]);
  }
  addDisclosureRow(allocSheet, brand, 4);
}

function buildWaterfallProjection(workbook, data, brand) {
  const totalEquity = data.totalEquity || 10000000;
  const prefReturn = data.prefReturn || 0.08;
  const carrySplit = data.carrySplit || 0.20;
  const holdPeriod = data.holdPeriod || 5;
  const cashFlows = data.annualCashFlows || data.cashFlows || [];
  const dispProceeds = data.dispositionProceeds || 0;

  // Tab 1: Operating Distributions
  const opSheet = workbook.addWorksheet("Operating");
  opSheet.getColumn(1).width = 14;
  for (let c = 2; c <= 6; c++) { opSheet.getColumn(c).width = 20; opSheet.getColumn(c).numFmt = currencyFormat(); }

  const opHeader = opSheet.addRow(["Year", "Cash Flow", "To Capital", "Pref Return", "LP Share", "GP Share"]);
  styleHeaderRow(opHeader, brand);

  let remCap = totalEquity;
  let cumPref = 0;
  for (let y = 1; y <= holdPeriod; y++) {
    const cf = cashFlows[y - 1] || totalEquity * 0.06;
    const amt = typeof cf === "number" ? cf : cf.amount || 0;
    const toCapital = Math.min(amt, remCap); remCap -= toCapital;
    const afterCap = amt - toCapital;
    const prefDue = totalEquity * prefReturn;
    cumPref += prefDue;
    const toPref = Math.min(afterCap, prefDue);
    const afterPref = afterCap - toPref;
    const lpShare = toPref + afterPref * (1 - carrySplit);
    const gpShare = afterPref * carrySplit;
    opSheet.addRow([y, amt, toCapital, toPref, lpShare, gpShare]);
  }
  addDisclosureRow(opSheet, brand, 6);

  // Tab 2: Disposition
  const dispSheet = workbook.addWorksheet("Disposition");
  dispSheet.getColumn(1).width = 28;
  dispSheet.getColumn(2).width = 22; dispSheet.getColumn(2).numFmt = currencyFormat();

  const dispHeader = dispSheet.addRow(["Item", "Amount"]);
  styleHeaderRow(dispHeader, brand);

  dispSheet.addRow(["Disposition Proceeds", dispProceeds]);
  dispSheet.addRow(["Remaining Capital to Return", remCap]);
  const afterCapDisp = dispProceeds - remCap;
  dispSheet.addRow(["After Capital Return", afterCapDisp]);
  const remainingPref = Math.max(0, cumPref - totalEquity * prefReturn * holdPeriod * 0.5);
  dispSheet.addRow(["Remaining Pref Due", remainingPref]);
  const afterPrefDisp = Math.max(0, afterCapDisp - remainingPref);
  dispSheet.addRow(["LP Residual", afterPrefDisp * (1 - carrySplit)]);
  dispSheet.addRow(["GP Carry", afterPrefDisp * carrySplit]);
  addDisclosureRow(dispSheet, brand, 2);

  // Tab 3: Cumulative Returns
  const cumSheet = workbook.addWorksheet("Cumulative");
  cumSheet.getColumn(1).width = 25;
  cumSheet.getColumn(2).width = 20; cumSheet.getColumn(2).numFmt = currencyFormat();
  cumSheet.getColumn(3).width = 20; cumSheet.getColumn(3).numFmt = currencyFormat();
  cumSheet.getColumn(4).width = 20; cumSheet.getColumn(4).numFmt = currencyFormat();

  const cumHeader = cumSheet.addRow(["Year", "LP Cumulative", "GP Cumulative", "Total"]);
  styleHeaderRow(cumHeader, brand);

  let lpCum = 0; let gpCum = 0;
  for (let y = 1; y <= holdPeriod; y++) {
    const cf = cashFlows[y - 1] || totalEquity * 0.06;
    const amt = typeof cf === "number" ? cf : cf.amount || 0;
    lpCum += amt * (1 - carrySplit);
    gpCum += amt * carrySplit;
    cumSheet.addRow([`Year ${y}`, lpCum, gpCum, lpCum + gpCum]);
  }
  lpCum += (dispProceeds - remCap) * (1 - carrySplit) + remCap;
  gpCum += (dispProceeds - remCap) * carrySplit;
  cumSheet.addRow(["+ Disposition", lpCum, gpCum, lpCum + gpCum]).font = { bold: true, name: "Arial" };
  addDisclosureRow(cumSheet, brand, 4);
}

// ── W-048 Chief of Staff XLSX builder ──

function buildTaskTracker(workbook, data, brand) {
  // Tab 1: Tasks
  const taskSheet = workbook.addWorksheet("Tasks");
  taskSheet.getColumn(1).width = 8;
  taskSheet.getColumn(2).width = 35;
  taskSheet.getColumn(3).width = 20;
  taskSheet.getColumn(4).width = 14;
  taskSheet.getColumn(5).width = 12;
  taskSheet.getColumn(6).width = 14;
  taskSheet.getColumn(7).width = 20;
  taskSheet.getColumn(8).width = 30;

  const taskHeader = taskSheet.addRow(["ID", "Task", "Worker", "Status", "Priority", "Due Date", "Blocked By", "Notes"]);
  styleHeaderRow(taskHeader, brand);

  const tasks = data.tasks || [];
  tasks.forEach((t, i) => {
    taskSheet.addRow([
      t.id || i + 1,
      t.task || t.description || "—",
      t.worker || "—",
      t.status || "Pending",
      t.priority || "Medium",
      t.dueDate || "—",
      t.blockedBy || "—",
      t.notes || "",
    ]);
  });
  addDisclosureRow(taskSheet, brand, 8);

  // Tab 2: Dependencies
  const depSheet = workbook.addWorksheet("Dependencies");
  depSheet.getColumn(1).width = 8;
  depSheet.getColumn(2).width = 30;
  depSheet.getColumn(3).width = 8;
  depSheet.getColumn(4).width = 30;
  depSheet.getColumn(5).width = 14;

  const depHeader = depSheet.addRow(["Task ID", "Task", "Blocks", "Blocked Task", "Status"]);
  styleHeaderRow(depHeader, brand);

  tasks.forEach((t, i) => {
    if (t.blockedBy) {
      depSheet.addRow([t.id || i + 1, t.task || "—", t.blockedBy, "", t.status || "Pending"]);
    }
  });
  addDisclosureRow(depSheet, brand, 5);

  // Tab 3: Summary
  const sumSheet = workbook.addWorksheet("Summary");
  sumSheet.getColumn(1).width = 25;
  sumSheet.getColumn(2).width = 14;

  const sumHeader = sumSheet.addRow(["Metric", "Count"]);
  styleHeaderRow(sumHeader, brand);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed" || t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "In Progress" || t.status === "in_progress").length;
  const blocked = tasks.filter(t => t.blockedBy).length;
  const overdue = tasks.filter(t => t.status === "Overdue" || t.overdue).length;

  sumSheet.addRow(["Total Tasks", total]);
  sumSheet.addRow(["Completed", completed]);
  sumSheet.addRow(["In Progress", inProgress]);
  sumSheet.addRow(["Blocked", blocked]);
  sumSheet.addRow(["Overdue", overdue]);
  sumSheet.addRow(["Remaining", total - completed]);
  addDisclosureRow(sumSheet, brand, 2);
}

// ── W-022 Bid & Procurement XLSX builder ──

function buildBidMatrix(workbook, data, brand) {
  const title = data.title || "Bid Comparison Matrix";
  const sheet = workbook.addWorksheet("Bid Comparison");

  // Title
  const titleRow = sheet.addRow([title]);
  titleRow.font = { size: 14, bold: true, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  sheet.mergeCells(1, 1, 1, 8);

  // Subtitle
  const subRow = sheet.addRow([`Project: ${data.projectName || "\u2014"} | Generated: ${new Date().toLocaleDateString()}`]);
  subRow.font = { size: 10, italic: true, color: { argb: "FF64748b" }, name: "Arial" };
  sheet.mergeCells(2, 1, 2, 8);
  sheet.addRow([]);

  // Determine bidders
  const bidders = data.bidders || [];
  const bidderNames = bidders.map(b => b.name || b.bidder || "Bidder");
  const colCount = 4 + bidderNames.length; // Division, bidder columns, Median, Low, Variance

  // Headers
  const headers = ["Division", ...bidderNames, "Median", "Low", "Variance (%)"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  // Column widths
  sheet.getColumn(1).width = 28;
  for (let i = 2; i <= bidderNames.length + 1; i++) {
    sheet.getColumn(i).width = 18;
    sheet.getColumn(i).numFmt = currencyFormat();
  }
  sheet.getColumn(bidderNames.length + 2).width = 18;
  sheet.getColumn(bidderNames.length + 2).numFmt = currencyFormat();
  sheet.getColumn(bidderNames.length + 3).width = 16;
  sheet.getColumn(bidderNames.length + 3).numFmt = currencyFormat();
  sheet.getColumn(bidderNames.length + 4).width = 14;
  sheet.getColumn(bidderNames.length + 4).numFmt = "0.0%";

  // Data rows — from divisions or bidders array
  const divisions = data.divisions || [];
  let grandTotals = new Array(bidderNames.length).fill(0);

  if (divisions.length > 0) {
    for (const div of divisions) {
      const bids = div.bids || [];
      const bidValues = [];
      for (let i = 0; i < bidderNames.length; i++) {
        const val = bids[i] || 0;
        bidValues.push(typeof val === "number" ? val : val.amount || 0);
        grandTotals[i] += typeof val === "number" ? val : val.amount || 0;
      }
      const validBids = bidValues.filter(v => v > 0);
      const sorted = [...validBids].sort((a, b) => a - b);
      const median = sorted.length > 0 ? (sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)]) : 0;
      const low = sorted.length > 0 ? sorted[0] : 0;
      const variance = median > 0 ? (Math.max(...validBids) - Math.min(...validBids)) / median : 0;

      const row = sheet.addRow([div.name || div.division || "", ...bidValues, median, low, variance]);

      // Flag anomalies — variance > 20%
      if (variance > 0.2) {
        row.getCell(colCount).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
      }
    }
  } else {
    // Build from bidders structure
    for (let i = 0; i < bidders.length; i++) {
      const b = bidders[i];
      const baseBid = b.baseBid || b.amount || 0;
      grandTotals[i] = baseBid;
    }
  }

  // Totals row
  if (divisions.length > 0) {
    const allValid = grandTotals.filter(v => v > 0);
    const sortedTotals = [...allValid].sort((a, b) => a - b);
    const medianTotal = sortedTotals.length > 0 ? (sortedTotals.length % 2 === 0 ? (sortedTotals[sortedTotals.length / 2 - 1] + sortedTotals[sortedTotals.length / 2]) / 2 : sortedTotals[Math.floor(sortedTotals.length / 2)]) : 0;
    const lowTotal = sortedTotals.length > 0 ? sortedTotals[0] : 0;
    const varTotal = medianTotal > 0 ? (Math.max(...allValid) - Math.min(...allValid)) / medianTotal : 0;

    const totRow = sheet.addRow(["TOTALS", ...grandTotals, medianTotal, lowTotal, varTotal]);
    totRow.font = { bold: true, name: "Arial" };
    totRow.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });
  }

  // Alternates sheet
  if (data.alternates && Array.isArray(data.alternates) && data.alternates.length > 0) {
    const altSheet = workbook.addWorksheet("Alternates");
    altSheet.getColumn(1).width = 28;
    altSheet.getColumn(2).width = 30;
    for (let i = 3; i <= bidderNames.length + 2; i++) {
      altSheet.getColumn(i).width = 18;
      altSheet.getColumn(i).numFmt = currencyFormat();
    }

    const altHeaders = altSheet.addRow(["Alternate", "Description", ...bidderNames]);
    styleHeaderRow(altHeaders, brand);

    for (const alt of data.alternates) {
      const altBids = alt.bids || [];
      altSheet.addRow([alt.name || alt.alternate || "", alt.description || "", ...altBids]);
    }

    addDisclosureRow(altSheet, brand, bidderNames.length + 2);
  }

  // Exclusions sheet
  if (data.exclusions && Array.isArray(data.exclusions) && data.exclusions.length > 0) {
    const exSheet = workbook.addWorksheet("Exclusions");
    exSheet.getColumn(1).width = 22;
    exSheet.getColumn(2).width = 40;
    exSheet.getColumn(3).width = 20;

    const exHeaders = exSheet.addRow(["Bidder", "Exclusion", "Cost Impact"]);
    styleHeaderRow(exHeaders, brand);

    for (const ex of data.exclusions) {
      exSheet.addRow([ex.bidder || "", ex.exclusion || ex.description || "", ex.costImpact || "\u2014"]);
    }

    addDisclosureRow(exSheet, brand, 3);
  }

  addDisclosureRow(sheet, brand, colCount);
}

// ── W-025 Insurance & Risk XLSX builder ──

function buildInsuranceMatrix(workbook, data, brand) {
  const title = data.title || "Insurance Compliance Matrix";
  const sheet = workbook.addWorksheet("Insurance Matrix");
  const colCount = 12;

  // Title
  const titleRow = sheet.addRow([title]);
  titleRow.font = { size: 14, bold: true, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  sheet.mergeCells(1, 1, 1, colCount);

  // Subtitle
  const subRow = sheet.addRow([`Project: ${data.projectName || "\u2014"} | Generated: ${new Date().toLocaleDateString()}`]);
  subRow.font = { size: 10, italic: true, color: { argb: "FF64748b" }, name: "Arial" };
  sheet.mergeCells(2, 1, 2, colCount);
  sheet.addRow([]);

  // Headers
  const headers = ["Subcontractor", "GL Limit", "GL Expires", "Auto Limit", "Auto Expires", "WC Status", "WC Expires", "Umbrella", "Umbrella Expires", "Add'l Insured", "Waiver of Sub", "Status"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  // Column widths
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 16; sheet.getColumn(2).numFmt = currencyFormat();
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 16; sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 16; sheet.getColumn(8).numFmt = currencyFormat();
  sheet.getColumn(9).width = 16;
  sheet.getColumn(10).width = 14;
  sheet.getColumn(11).width = 14;
  sheet.getColumn(12).width = 14;

  // Data rows
  const subs = data.subcontractors || [];
  let compliant = 0, deficient = 0, expiringSoon = 0;

  for (const sub of subs) {
    const status = sub.status || sub.complianceStatus || "Pending";
    if (status === "Compliant" || status === "compliant" || status === "green") compliant++;
    else if (status === "Deficient" || status === "deficient" || status === "red") deficient++;
    else expiringSoon++;

    const row = sheet.addRow([
      sub.name || sub.subcontractor || "",
      sub.glLimit || sub.gl_limit || 0,
      sub.glExpires || sub.gl_expires || "",
      sub.autoLimit || sub.auto_limit || 0,
      sub.autoExpires || sub.auto_expires || "",
      sub.wcStatus || sub.wc_status || "",
      sub.wcExpires || sub.wc_expires || "",
      sub.umbrellaLimit || sub.umbrella || 0,
      sub.umbrellaExpires || sub.umbrella_expires || "",
      sub.additionalInsured ? "Yes" : "No",
      sub.waiverOfSubrogation || sub.waiver ? "Yes" : "No",
      status,
    ]);

    // Color the status cell
    const statusCell = row.getCell(12);
    if (status === "Compliant" || status === "compliant" || status === "green") {
      statusCell.font = { bold: true, color: { argb: "FF16A34A" }, name: "Arial" };
    } else if (status === "Deficient" || status === "deficient" || status === "red") {
      statusCell.font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    } else {
      statusCell.font = { bold: true, color: { argb: "FFD97706" }, name: "Arial" };
    }
  }

  // Summary
  sheet.addRow([]);
  const summRow = sheet.addRow(["SUMMARY"]);
  summRow.font = { bold: true, name: "Arial" };
  sheet.addRow(["Total Subcontractors", subs.length]);
  sheet.addRow(["Compliant", compliant]);
  sheet.addRow(["Deficient", deficient]);
  sheet.addRow(["Expiring / Pending", expiringSoon]);

  addDisclosureRow(sheet, brand, colCount);
}

// ── W-027 Quality Control & Inspection XLSX builder ──

function buildDeficiencyLog(workbook, data, brand) {
  const title = data.title || "Deficiency Log";
  const sheet = workbook.addWorksheet("Deficiency Log");
  const colCount = 10;

  // Title
  const titleRow = sheet.addRow([title]);
  titleRow.font = { size: 14, bold: true, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  sheet.mergeCells(1, 1, 1, colCount);

  // Subtitle
  const subRow = sheet.addRow([`Project: ${data.projectName || "\u2014"} | Generated: ${new Date().toLocaleDateString()}`]);
  subRow.font = { size: 10, italic: true, color: { argb: "FF64748b" }, name: "Arial" };
  sheet.mergeCells(2, 1, 2, colCount);
  sheet.addRow([]);

  // Headers
  const headers = ["ID", "Description", "Location", "Trade", "Severity", "Photo Ref", "Responsible Sub", "Deadline", "Status", "Re-inspection Date"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  // Column widths
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 35;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 22;
  sheet.getColumn(8).width = 14;
  sheet.getColumn(9).width = 14;
  sheet.getColumn(10).width = 16;

  // Data rows
  const deficiencies = data.deficiencies || [];
  let totalOpen = 0, totalOverdue = 0, totalClosed = 0;
  let criticalCount = 0, majorCount = 0, minorCount = 0;

  for (const d of deficiencies) {
    const status = d.status || "Open";
    const severity = d.severity || "Minor";

    if (status === "Open" || status === "open") totalOpen++;
    if (status === "Overdue" || status === "overdue" || d.overdue) totalOverdue++;
    if (status === "Closed" || status === "closed" || status === "Resolved") totalClosed++;
    if (severity === "Critical" || severity === "critical") criticalCount++;
    else if (severity === "Major" || severity === "major") majorCount++;
    else minorCount++;

    const row = sheet.addRow([
      d.id || d.deficiencyId || "",
      d.description || "",
      d.location || "",
      d.trade || "",
      severity,
      d.photo || d.photoRef || "",
      d.responsibleSub || d.sub || "",
      d.deadline || "",
      status,
      d.reinspectionDate || d.reinspection || "",
    ]);

    // Color severity
    const sevCell = row.getCell(5);
    if (severity === "Critical" || severity === "critical") {
      sevCell.font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    } else if (severity === "Major" || severity === "major") {
      sevCell.font = { bold: true, color: { argb: "FFD97706" }, name: "Arial" };
    }

    // Color overdue status
    if (status === "Overdue" || status === "overdue" || d.overdue) {
      row.getCell(9).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }

  // By Trade summary sheet
  const tradeSheet = workbook.addWorksheet("By Trade");
  tradeSheet.getColumn(1).width = 22;
  tradeSheet.getColumn(2).width = 12;
  tradeSheet.getColumn(3).width = 12;
  tradeSheet.getColumn(4).width = 12;
  tradeSheet.getColumn(5).width = 12;

  const tradeHeaders = tradeSheet.addRow(["Trade", "Open", "Closed", "Overdue", "Total"]);
  styleHeaderRow(tradeHeaders, brand);

  const tradeCounts = {};
  for (const d of deficiencies) {
    const trade = d.trade || "Unknown";
    if (!tradeCounts[trade]) tradeCounts[trade] = { open: 0, closed: 0, overdue: 0, total: 0 };
    tradeCounts[trade].total++;
    const status = d.status || "Open";
    if (status === "Open" || status === "open") tradeCounts[trade].open++;
    if (status === "Closed" || status === "closed" || status === "Resolved") tradeCounts[trade].closed++;
    if (status === "Overdue" || status === "overdue" || d.overdue) tradeCounts[trade].overdue++;
  }
  for (const [trade, counts] of Object.entries(tradeCounts)) {
    tradeSheet.addRow([trade, counts.open, counts.closed, counts.overdue, counts.total]);
  }
  addDisclosureRow(tradeSheet, brand, 5);

  // Summary
  sheet.addRow([]);
  const summRow = sheet.addRow(["SUMMARY"]);
  summRow.font = { bold: true, name: "Arial" };
  sheet.addRow(["Total Deficiencies", deficiencies.length]);
  sheet.addRow(["Open", totalOpen]);
  sheet.addRow(["Overdue", totalOverdue]);
  sheet.addRow(["Closed / Resolved", totalClosed]);
  sheet.addRow(["Critical", criticalCount]);
  sheet.addRow(["Major", majorCount]);
  sheet.addRow(["Minor", minorCount]);

  addDisclosureRow(sheet, brand, colCount);
}

// ── W-028 Safety & OSHA XLSX builder ──

function buildOsha300(workbook, data, brand) {
  const title = data.title || "OSHA 300 Log";
  const incidents = data.incidents || [];
  const employeeHours = data.employeeHours || 0;
  const year = data.year || new Date().getFullYear();

  // Tab 1: Form 300 — Log of Work-Related Injuries and Illnesses
  const form300 = workbook.addWorksheet("Form 300");
  form300.addRow([`OSHA Form 300 \u2014 Log of Work-Related Injuries and Illnesses \u2014 ${year}`]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  if (data.projectName) {
    form300.addRow(["Project: " + data.projectName]).font = { size: 10, color: { argb: "FF6B7280" }, name: "Arial" };
  }
  form300.addRow([]);

  const f300Headers = ["Case No.", "Employee Name", "Job Title", "Date of Injury", "Location", "Description", "Death", "Days Away", "Restricted Transfer", "Other Recordable", "Days Away Count", "Restricted Days"];
  const f300HeaderRow = form300.addRow(f300Headers);
  styleHeaderRow(f300HeaderRow, brand);

  form300.getColumn(1).width = 10;
  form300.getColumn(2).width = 22;
  form300.getColumn(3).width = 18;
  form300.getColumn(4).width = 14;
  form300.getColumn(5).width = 20;
  form300.getColumn(6).width = 35;
  form300.getColumn(7).width = 8;
  form300.getColumn(8).width = 12;
  form300.getColumn(9).width = 16;
  form300.getColumn(10).width = 16;
  form300.getColumn(11).width = 14;
  form300.getColumn(12).width = 14;

  let deathCount = 0, daysAwayCount = 0, restrictedCount = 0, otherCount = 0;
  let totalDaysAway = 0, totalRestrictedDays = 0;

  for (const inc of incidents) {
    const isDeath = inc.death || inc.fatality || false;
    const isDaysAway = inc.daysAway || inc.days_away || false;
    const isRestricted = inc.restricted || inc.restricted_transfer || false;
    const isOther = inc.other || inc.otherRecordable || false;
    const daysAway = inc.daysAwayCount || inc.days_away_count || 0;
    const restrictedDays = inc.restrictedDays || inc.restricted_days || 0;

    if (isDeath) deathCount++;
    if (isDaysAway) daysAwayCount++;
    if (isRestricted) restrictedCount++;
    if (isOther) otherCount++;
    totalDaysAway += daysAway;
    totalRestrictedDays += restrictedDays;

    form300.addRow([
      inc.caseNumber || inc.case_number || "",
      inc.employeeName || inc.employee || "",
      inc.jobTitle || inc.job_title || "",
      inc.date || inc.dateOfInjury || "",
      inc.location || "",
      inc.description || "",
      isDeath ? "X" : "",
      isDaysAway ? "X" : "",
      isRestricted ? "X" : "",
      isOther ? "X" : "",
      daysAway,
      restrictedDays,
    ]);
  }

  // Totals
  const totRow300 = form300.addRow(["", "", "", "TOTALS", "", "", deathCount, daysAwayCount, restrictedCount, otherCount, totalDaysAway, totalRestrictedDays]);
  totRow300.font = { bold: true, name: "Arial" };
  totRow300.eachCell((cell) => { cell.border = { top: { style: "double", color: { argb: "FF000000" } } }; });

  addDisclosureRow(form300, brand, 12);

  // Tab 2: Form 300A — Summary
  const form300a = workbook.addWorksheet("Form 300A");
  form300a.getColumn(1).width = 35;
  form300a.getColumn(2).width = 20;

  form300a.addRow([`OSHA Form 300A \u2014 Summary of Work-Related Injuries and Illnesses \u2014 ${year}`]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  form300a.addRow([]);

  const summaryFields = [
    ["Calendar Year", String(year)],
    ["Establishment Name", data.projectName || data.establishmentName || ""],
    ["Total Number of Deaths", String(deathCount)],
    ["Total Cases with Days Away from Work", String(daysAwayCount)],
    ["Total Cases with Restricted / Transfer", String(restrictedCount)],
    ["Total Other Recordable Cases", String(otherCount)],
    ["Total Days Away from Work", String(totalDaysAway)],
    ["Total Days of Restricted Work", String(totalRestrictedDays)],
    ["Annual Average Number of Employees", String(data.annualEmployees || "")],
    ["Total Hours Worked by All Employees", String(employeeHours)],
  ];

  for (const [label, value] of summaryFields) {
    const row = form300a.addRow([label, value]);
    row.getCell(1).font = { bold: true, name: "Arial" };
  }

  addDisclosureRow(form300a, brand, 2);

  // Tab 3: Metrics — TRIR, DART, EMR
  const metrics = workbook.addWorksheet("Metrics");
  metrics.getColumn(1).width = 40;
  metrics.getColumn(2).width = 20;
  metrics.getColumn(3).width = 40;

  metrics.addRow(["Safety Metrics"]).font = {
    bold: true, size: 14,
    color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` },
    name: "Arial",
  };
  metrics.addRow([]);

  const metricHeaders = metrics.addRow(["Metric", "Value", "Formula"]);
  styleHeaderRow(metricHeaders, brand);

  const totalRecordable = deathCount + daysAwayCount + restrictedCount + otherCount;
  const trir = employeeHours > 0 ? (totalRecordable * 200000 / employeeHours) : 0;
  const dart = employeeHours > 0 ? ((daysAwayCount + restrictedCount) * 200000 / employeeHours) : 0;

  const metricRows = [
    ["Total Recordable Incident Rate (TRIR)", Math.round(trir * 100) / 100, "(Total Recordable Cases x 200,000) / Total Hours Worked"],
    ["Days Away, Restricted, Transfer Rate (DART)", Math.round(dart * 100) / 100, "((Days Away + Restricted Transfer) x 200,000) / Total Hours Worked"],
    ["Total Recordable Cases", totalRecordable, "Deaths + Days Away + Restricted + Other"],
    ["Total Hours Worked", employeeHours, ""],
    ["Deaths", deathCount, ""],
    ["Cases with Days Away", daysAwayCount, ""],
    ["Restricted / Transfer Cases", restrictedCount, ""],
    ["Other Recordable Cases", otherCount, ""],
  ];

  for (const [metric, value, formula] of metricRows) {
    const row = metrics.addRow([metric, value, formula]);
    row.getCell(1).font = { bold: true, name: "Arial" };
  }

  if (data.emr) {
    metrics.addRow([]);
    const emrRow = metrics.addRow(["Experience Modification Rate (EMR)", data.emr, "From insurance carrier"]);
    emrRow.getCell(1).font = { bold: true, name: "Arial" };
    if (data.emr > 1.0) {
      emrRow.getCell(2).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    } else {
      emrRow.getCell(2).font = { bold: true, color: { argb: "FF16A34A" }, name: "Arial" };
    }
  }

  addDisclosureRow(metrics, brand, 3);
}

// ── W-029 MEP Coordination XLSX builder ──

function buildClashLog(workbook, data, brand) {
  const title = data.title || "Clash Detection Log";
  const sheet = workbook.addWorksheet("Clash Log");
  const colCount = 9;

  // Title
  const titleRow = sheet.addRow([title]);
  titleRow.font = { size: 14, bold: true, color: { argb: `FF${(brand.primaryColor || COLORS.primary).replace("#", "")}` }, name: "Arial" };
  sheet.mergeCells(1, 1, 1, colCount);

  // Subtitle
  const subRow = sheet.addRow([`Project: ${data.projectName || "\u2014"} | Generated: ${new Date().toLocaleDateString()}`]);
  subRow.font = { size: 10, italic: true, color: { argb: "FF64748b" }, name: "Arial" };
  sheet.mergeCells(2, 1, 2, colCount);
  sheet.addRow([]);

  // Headers
  const headers = ["Clash ID", "Location", "System A", "System B", "Severity", "Responsible Trade", "Resolution", "Status", "Days Open"];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);

  // Column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 30;
  sheet.getColumn(8).width = 14;
  sheet.getColumn(9).width = 12;

  // Data rows
  const clashes = data.clashes || [];
  let criticalCount = 0, majorCount = 0, minorCount = 0;
  let openCount = 0, resolvedCount = 0;

  for (const c of clashes) {
    const severity = c.severity || "Minor";
    const status = c.status || "Open";
    const daysOpen = c.daysOpen || c.days_open || "";

    if (severity === "Critical" || severity === "critical") criticalCount++;
    else if (severity === "Major" || severity === "major") majorCount++;
    else minorCount++;

    if (status === "Open" || status === "open" || status === "In Progress") openCount++;
    if (status === "Resolved" || status === "resolved" || status === "Closed") resolvedCount++;

    const row = sheet.addRow([
      c.clashId || c.id || "",
      c.location || "",
      c.systemA || c.system_a || "",
      c.systemB || c.system_b || "",
      severity,
      c.responsibleTrade || c.trade || "",
      c.resolution || "",
      status,
      daysOpen,
    ]);

    // Color severity
    const sevCell = row.getCell(5);
    if (severity === "Critical" || severity === "critical") {
      sevCell.font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    } else if (severity === "Major" || severity === "major") {
      sevCell.font = { bold: true, color: { argb: "FFD97706" }, name: "Arial" };
    }

    // Color status
    const statusCell = row.getCell(8);
    if (status === "Resolved" || status === "resolved" || status === "Closed") {
      statusCell.font = { bold: true, color: { argb: "FF16A34A" }, name: "Arial" };
    }
  }

  // By System summary sheet
  const sysSheet = workbook.addWorksheet("By System");
  sysSheet.getColumn(1).width = 22;
  sysSheet.getColumn(2).width = 12;
  sysSheet.getColumn(3).width = 12;
  sysSheet.getColumn(4).width = 12;

  const sysHeaders = sysSheet.addRow(["System", "Open", "Resolved", "Total"]);
  styleHeaderRow(sysHeaders, brand);

  const sysCounts = {};
  for (const c of clashes) {
    const systems = [c.systemA || c.system_a, c.systemB || c.system_b].filter(Boolean);
    const status = c.status || "Open";
    for (const sys of systems) {
      if (!sysCounts[sys]) sysCounts[sys] = { open: 0, resolved: 0, total: 0 };
      sysCounts[sys].total++;
      if (status === "Open" || status === "open" || status === "In Progress") sysCounts[sys].open++;
      if (status === "Resolved" || status === "resolved" || status === "Closed") sysCounts[sys].resolved++;
    }
  }
  for (const [sys, counts] of Object.entries(sysCounts)) {
    sysSheet.addRow([sys, counts.open, counts.resolved, counts.total]);
  }
  addDisclosureRow(sysSheet, brand, 4);

  // Summary on main sheet
  sheet.addRow([]);
  const summRow = sheet.addRow(["SUMMARY"]);
  summRow.font = { bold: true, name: "Arial" };
  sheet.addRow(["Total Clashes", clashes.length]);
  sheet.addRow(["Open", openCount]);
  sheet.addRow(["Resolved", resolvedCount]);
  sheet.addRow(["Critical", criticalCount]);
  sheet.addRow(["Major", majorCount]);
  sheet.addRow(["Minor", minorCount]);

  addDisclosureRow(sheet, brand, colCount);
}

// ── W-001 Market Research XLSX builders ──

function buildCompAnalysis(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Comp Analysis");
  sheet.columns = [
    { width: 30 }, { width: 18 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 },
  ];
  const headerRow = sheet.addRow(["Property", "Address", "Sale Price", "Price/SF", "Cap Rate", "Year Built", "SF", "Sale Date"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).numFmt = percentFormat();

  const comps = data.comps || data.comparables || [];
  for (const c of comps) {
    sheet.addRow([
      c.property || c.name || "",
      c.address || "",
      c.salePrice || c.price || 0,
      c.priceSf || c.pricePerSf || 0,
      c.capRate || 0,
      c.yearBuilt || "",
      c.sf || c.squareFeet || 0,
      c.saleDate || "",
    ]);
  }

  // Summary tab
  const sumSheet = workbook.addWorksheet("Summary Statistics");
  sumSheet.columns = [{ width: 25 }, { width: 18 }];
  const sumHeader = sumSheet.addRow(["Metric", "Value"]);
  styleHeaderRow(sumHeader, brand);
  const prices = comps.map(c => c.salePrice || c.price || 0).filter(v => v > 0);
  const caps = comps.map(c => c.capRate || 0).filter(v => v > 0);
  sumSheet.addRow(["Total Comps", comps.length]);
  sumSheet.addRow(["Avg Sale Price", prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0]);
  sumSheet.addRow(["Median Sale Price", prices.length ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0]);
  sumSheet.addRow(["Avg Cap Rate", caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : 0]);
  addDisclosureRow(sumSheet, brand, 2);
  addDisclosureRow(sheet, brand, 8);
}

function buildSubmarketRanking(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Submarket Ranking");
  sheet.columns = [
    { width: 8 }, { width: 28 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 },
  ];
  const headerRow = sheet.addRow(["Rank", "Submarket", "Vacancy (%)", "Avg Rent/SF", "Absorption", "New Supply", "Population Growth", "Overall Score"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = percentFormat();
  sheet.getColumn(4).numFmt = currencyFormat();

  const submarkets = data.submarkets || [];
  submarkets.forEach((s, i) => {
    sheet.addRow([
      s.rank || i + 1,
      s.name || s.submarket || "",
      s.vacancy || 0,
      s.avgRent || s.rentPerSf || 0,
      s.absorption || 0,
      s.newSupply || 0,
      s.populationGrowth || "",
      s.score || s.overallScore || 0,
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-005 ADA Compliance XLSX builders ──

function buildCodeCompliance(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Code Compliance");
  sheet.columns = [
    { width: 8 }, { width: 18 }, { width: 35 }, { width: 14 },
    { width: 14 }, { width: 22 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Code Section", "Requirement", "Status", "Priority", "Responsible Party", "Due Date"]);
  styleHeaderRow(headerRow, brand);

  const items = data.items || data.requirements || [];
  items.forEach((item, i) => {
    const row = sheet.addRow([
      item.id || i + 1,
      item.codeSection || item.section || "",
      item.requirement || item.description || "",
      item.status || "Open",
      item.priority || "Medium",
      item.responsibleParty || item.assignee || "",
      item.dueDate || "",
    ]);
    if ((item.status || "").toLowerCase() === "non-compliant") {
      row.getCell(4).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 7);
}

function buildVeLog(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Value Engineering Log");
  sheet.columns = [
    { width: 8 }, { width: 30 }, { width: 14 }, { width: 18 },
    { width: 18 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "Description", "Category", "Cost Savings", "Impact", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(4).numFmt = currencyFormat();

  const items = data.items || data.veItems || [];
  items.forEach((item, i) => {
    sheet.addRow([
      item.id || i + 1,
      item.description || "",
      item.category || "",
      item.costSavings || item.savings || 0,
      item.impact || "Low",
      item.status || "Proposed",
      item.notes || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 7);
}

// ── W-006 Engineering Review XLSX builder ──

function buildDesignChangeLog(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Design Change Log");
  sheet.columns = [
    { width: 8 }, { width: 14 }, { width: 30 }, { width: 16 },
    { width: 18 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "Date", "Description", "Discipline", "Cost Impact", "Schedule Impact", "Status", "Approved By"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(5).numFmt = currencyFormat();

  const changes = data.changes || data.items || [];
  changes.forEach((c, i) => {
    sheet.addRow([
      c.id || i + 1,
      c.date || "",
      c.description || "",
      c.discipline || "",
      c.costImpact || 0,
      c.scheduleImpact || "",
      c.status || "Pending",
      c.approvedBy || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-007 Environmental Compliance XLSX builders ──

function buildRemediationTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Remediation Tracker");
  sheet.columns = [
    { width: 8 }, { width: 28 }, { width: 18 }, { width: 16 },
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Contaminant", "Location", "Method", "Start Date", "Est. Completion", "Cost", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(7).numFmt = currencyFormat();

  const items = data.items || data.remediations || [];
  items.forEach((item, i) => {
    const row = sheet.addRow([
      item.id || i + 1,
      item.contaminant || "",
      item.location || "",
      item.method || "",
      item.startDate || "",
      item.estCompletion || item.targetDate || "",
      item.cost || 0,
      item.status || "In Progress",
    ]);
    if ((item.status || "").toLowerCase() === "overdue") {
      row.getCell(8).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildPermitTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Permit Tracker");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 18 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "Permit Type", "Issuing Agency", "Application Date", "Expiration", "Status", "Fee", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(7).numFmt = currencyFormat();

  const permits = data.permits || data.items || [];
  permits.forEach((p, i) => {
    const row = sheet.addRow([
      p.id || i + 1,
      p.permitType || p.type || "",
      p.agency || p.issuingAgency || "",
      p.applicationDate || p.appDate || "",
      p.expiration || p.expirationDate || "",
      p.status || "Pending",
      p.fee || 0,
      p.notes || "",
    ]);
    if ((p.status || "").toLowerCase() === "expired") {
      row.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-008 Energy & Sustainability XLSX builder ──

function buildCertificationTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Certification Tracker");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 18 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "Certification", "Standard", "Target Level", "Current Score", "Required Score", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const certs = data.certifications || data.items || [];
  certs.forEach((c, i) => {
    sheet.addRow([
      c.id || i + 1,
      c.certification || c.name || "",
      c.standard || "",
      c.targetLevel || "",
      c.currentScore || 0,
      c.requiredScore || 0,
      c.status || "In Progress",
      c.notes || "",
    ]);
  });

  // Credits tab
  const credSheet = workbook.addWorksheet("Credits");
  credSheet.columns = [{ width: 25 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const credHeader = credSheet.addRow(["Credit Category", "Points Available", "Points Targeted", "Points Achieved"]);
  styleHeaderRow(credHeader, brand);
  const credits = data.credits || [];
  for (const cr of credits) {
    credSheet.addRow([cr.category || "", cr.available || 0, cr.targeted || 0, cr.achieved || 0]);
  }
  addDisclosureRow(credSheet, brand, 4);
  addDisclosureRow(sheet, brand, 8);
}

// ── W-009 Affordable Housing XLSX builders ──

function buildAccommodationTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Accommodation Tracker");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 18 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "Tenant/Unit", "Request Type", "Date Requested", "Date Completed", "Cost", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(6).numFmt = currencyFormat();

  const items = data.accommodations || data.items || [];
  items.forEach((item, i) => {
    sheet.addRow([
      item.id || i + 1,
      item.tenant || item.unit || "",
      item.requestType || item.type || "",
      item.dateRequested || "",
      item.dateCompleted || "",
      item.cost || 0,
      item.status || "Pending",
      item.notes || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildUnitClassification(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Unit Classification");
  sheet.columns = [
    { width: 12 }, { width: 14 }, { width: 14 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 14 }, { width: 18 },
  ];
  const headerRow = sheet.addRow(["Unit #", "Bedrooms", "Sq Ft", "AMI Level (%)", "Max Rent", "Current Rent", "Status", "Program"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(6).numFmt = currencyFormat();

  const units = data.units || data.items || [];
  for (const u of units) {
    sheet.addRow([
      u.unit || u.unitNumber || "",
      u.bedrooms || u.beds || 0,
      u.sqFt || u.squareFeet || 0,
      u.amiLevel || u.ami || "",
      u.maxRent || 0,
      u.currentRent || 0,
      u.status || "Compliant",
      u.program || "",
    ]);
  }

  // Summary tab
  const sumSheet = workbook.addWorksheet("AMI Summary");
  sumSheet.columns = [{ width: 20 }, { width: 14 }, { width: 14 }];
  const sumHeader = sumSheet.addRow(["AMI Level", "Unit Count", "Avg Rent"]);
  styleHeaderRow(sumHeader, brand);
  const amiGroups = {};
  for (const u of units) {
    const ami = u.amiLevel || u.ami || "Unknown";
    if (!amiGroups[ami]) amiGroups[ami] = { count: 0, totalRent: 0 };
    amiGroups[ami].count++;
    amiGroups[ami].totalRent += u.currentRent || 0;
  }
  for (const [ami, g] of Object.entries(amiGroups)) {
    sumSheet.addRow([ami, g.count, g.count ? g.totalRent / g.count : 0]);
  }
  addDisclosureRow(sumSheet, brand, 3);
  addDisclosureRow(sheet, brand, 8);
}

// ── W-011 Fire & Life Safety XLSX builder ──

function buildFireSystemTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Fire System Tracker");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 18 }, { width: 16 },
    { width: 16 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "System", "Location", "Last Inspection", "Next Due", "Vendor", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const systems = data.systems || data.items || [];
  systems.forEach((s, i) => {
    const row = sheet.addRow([
      s.id || i + 1,
      s.system || s.name || "",
      s.location || "",
      s.lastInspection || "",
      s.nextDue || s.nextInspection || "",
      s.vendor || "",
      s.status || "Current",
      s.notes || "",
    ]);
    if ((s.status || "").toLowerCase() === "overdue" || (s.status || "").toLowerCase() === "expired") {
      row.getCell(7).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-020 Opportunity Zone XLSX builders ──

function buildOzAssetTest(workbook, data, brand) {
  const sheet = workbook.addWorksheet("90% Asset Test");
  sheet.columns = [
    { width: 30 }, { width: 18 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Asset Description", "Total Value", "OZ Qualified Value", "OZ %", "Test Date", "Pass/Fail"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(2).numFmt = currencyFormat();
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = percentFormat();

  const assets = data.assets || data.items || [];
  let totalValue = 0, totalQualified = 0;
  for (const a of assets) {
    const val = a.totalValue || a.value || 0;
    const qVal = a.qualifiedValue || a.ozValue || 0;
    totalValue += val;
    totalQualified += qVal;
    sheet.addRow([
      a.description || a.name || "",
      val,
      qVal,
      val > 0 ? qVal / val : 0,
      a.testDate || "",
      a.pass ? "Pass" : "Fail",
    ]);
  }

  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTALS", totalValue, totalQualified, totalValue > 0 ? totalQualified / totalValue : 0, "", totalQualified / totalValue >= 0.9 ? "Pass" : "Fail"]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, 6);
}

function buildOzSubstantialImprovement(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Substantial Improvement");
  sheet.columns = [
    { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Property", "Original Basis", "Improvement Spend", "Required (100%)", "Deadline", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(2).numFmt = currencyFormat();
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();

  const properties = data.properties || data.items || [];
  for (const p of properties) {
    const basis = p.originalBasis || p.basis || 0;
    const spend = p.improvementSpend || p.spend || 0;
    const row = sheet.addRow([
      p.property || p.name || "",
      basis,
      spend,
      basis,
      p.deadline || "",
      spend >= basis ? "Met" : "Not Met",
    ]);
    if (spend < basis) {
      row.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }
  addDisclosureRow(sheet, brand, 6);
}

function buildOzInvestor180Day(workbook, data, brand) {
  const sheet = workbook.addWorksheet("180-Day Tracker");
  sheet.columns = [
    { width: 25 }, { width: 16 }, { width: 16 }, { width: 14 },
    { width: 18 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Investor", "Gain Date", "180-Day Deadline", "Days Left", "Investment Amount", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(5).numFmt = currencyFormat();

  const investors = data.investors || data.items || [];
  for (const inv of investors) {
    const row = sheet.addRow([
      inv.investor || inv.name || "",
      inv.gainDate || "",
      inv.deadline || "",
      inv.daysLeft || "",
      inv.amount || inv.investmentAmount || 0,
      inv.status || "Pending",
      inv.notes || "",
    ]);
    const days = inv.daysLeft || 999;
    if (typeof days === "number" && days <= 30) {
      row.getCell(4).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }
  addDisclosureRow(sheet, brand, 7);
}

// ── W-030 Automated Valuation XLSX builder ──

function buildAvrCompAnalysis(workbook, data, brand) {
  const sheet = workbook.addWorksheet("AVR Comp Analysis");
  sheet.columns = [
    { width: 30 }, { width: 30 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Property", "Address", "Sale Price", "Price/SF", "Cap Rate", "GRM", "Distance (mi)", "Adj. Value"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).numFmt = percentFormat();
  sheet.getColumn(8).numFmt = currencyFormat();

  const comps = data.comps || data.comparables || [];
  for (const c of comps) {
    sheet.addRow([
      c.property || c.name || "",
      c.address || "",
      c.salePrice || c.price || 0,
      c.priceSf || c.pricePerSf || 0,
      c.capRate || 0,
      c.grm || 0,
      c.distance || 0,
      c.adjustedValue || c.adjValue || 0,
    ]);
  }

  // Adjustments tab
  const adjSheet = workbook.addWorksheet("Adjustments");
  adjSheet.columns = [{ width: 30 }, { width: 25 }, { width: 18 }, { width: 18 }];
  const adjHeader = adjSheet.addRow(["Property", "Adjustment Type", "Amount", "Adjusted Price"]);
  styleHeaderRow(adjHeader, brand);
  adjSheet.getColumn(3).numFmt = currencyFormat();
  adjSheet.getColumn(4).numFmt = currencyFormat();
  const adjustments = data.adjustments || [];
  for (const a of adjustments) {
    adjSheet.addRow([a.property || "", a.type || a.adjustmentType || "", a.amount || 0, a.adjustedPrice || 0]);
  }
  addDisclosureRow(adjSheet, brand, 4);
  addDisclosureRow(sheet, brand, 8);
}

// ── W-034 Rent Roll & Revenue XLSX builders ──

function buildRentRoll(workbook, data, brand) {
  // Tab 1: Rent Roll
  const sheet = workbook.addWorksheet("Rent Roll");
  sheet.columns = [
    { width: 12 }, { width: 20 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Unit #", "Tenant", "Lease Start", "Lease End", "Sq Ft", "Monthly Rent", "Annual Rent", "Rent/SF", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(6).numFmt = currencyFormat();
  sheet.getColumn(7).numFmt = currencyFormat();
  sheet.getColumn(8).numFmt = currencyFormat();

  const units = data.units || data.items || [];
  let totalMonthly = 0, totalAnnual = 0, totalSf = 0;
  for (const u of units) {
    const monthly = u.monthlyRent || u.rent || 0;
    const annual = u.annualRent || monthly * 12;
    const sf = u.sqFt || u.squareFeet || 0;
    totalMonthly += monthly;
    totalAnnual += annual;
    totalSf += sf;
    sheet.addRow([
      u.unit || u.unitNumber || "",
      u.tenant || u.name || "",
      u.leaseStart || "",
      u.leaseEnd || "",
      sf,
      monthly,
      annual,
      sf > 0 ? annual / sf : 0,
      u.status || "Occupied",
    ]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTALS", "", "", "", totalSf, totalMonthly, totalAnnual, totalSf > 0 ? totalAnnual / totalSf : 0, ""]);
  totRow.font = { bold: true, name: "Arial" };

  // Tab 2: Summary
  const sumSheet = workbook.addWorksheet("Summary");
  sumSheet.columns = [{ width: 25 }, { width: 18 }];
  const sumHeader = sumSheet.addRow(["Metric", "Value"]);
  styleHeaderRow(sumHeader, brand);
  const occupied = units.filter(u => (u.status || "Occupied") !== "Vacant").length;
  sumSheet.addRow(["Total Units", units.length]);
  sumSheet.addRow(["Occupied", occupied]);
  sumSheet.addRow(["Vacant", units.length - occupied]);
  sumSheet.addRow(["Occupancy Rate", units.length > 0 ? `${((occupied / units.length) * 100).toFixed(1)}%` : "0%"]);
  sumSheet.addRow(["Monthly Revenue", totalMonthly]);
  sumSheet.addRow(["Annual Revenue", totalAnnual]);
  addDisclosureRow(sumSheet, brand, 2);
  addDisclosureRow(sheet, brand, 9);
}

function buildRevenueForecast(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Revenue Forecast");
  const periods = data.periods || ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
  const headers = ["Revenue Source", ...periods];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(1).width = 28;
  for (let i = 2; i <= headers.length; i++) {
    sheet.getColumn(i).width = 16;
    sheet.getColumn(i).numFmt = currencyFormat();
  }

  const sources = data.sources || data.items || [];
  const totals = new Array(periods.length).fill(0);
  for (const s of sources) {
    const values = s.values || s.amounts || [];
    values.forEach((v, idx) => { if (idx < totals.length) totals[idx] += (typeof v === "number" ? v : parseFloat(v) || 0); });
    sheet.addRow([s.name || s.source || "", ...values]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTAL REVENUE", ...totals]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, headers.length);
}

function buildLeaseExpirationMatrix(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Lease Expiration Matrix");
  const years = data.years || data.periods || ["2026", "2027", "2028", "2029", "2030"];
  const headers = ["Tenant", "Unit", "SF", ...years];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 12;
  for (let i = 4; i <= headers.length; i++) {
    sheet.getColumn(i).width = 14;
    sheet.getColumn(i).numFmt = currencyFormat();
  }

  const leases = data.leases || data.items || [];
  for (const l of leases) {
    const expirations = l.expirations || l.values || [];
    sheet.addRow([
      l.tenant || l.name || "",
      l.unit || "",
      l.sf || l.squareFeet || 0,
      ...expirations,
    ]);
  }

  // Summary by year
  const sumSheet = workbook.addWorksheet("Expiration Summary");
  sumSheet.columns = [{ width: 14 }, { width: 14 }, { width: 18 }, { width: 14 }];
  const sumHeader = sumSheet.addRow(["Year", "# Expiring", "SF Expiring", "% of Total SF"]);
  styleHeaderRow(sumHeader, brand);
  const summaries = data.expirationSummary || [];
  for (const s of summaries) {
    sumSheet.addRow([s.year || "", s.count || 0, s.sf || 0, s.pctTotal || ""]);
  }
  addDisclosureRow(sumSheet, brand, 4);
  addDisclosureRow(sheet, brand, headers.length);
}

// ── W-035 Maintenance & Work Orders XLSX builder ──

function buildPmSchedule(workbook, data, brand) {
  const sheet = workbook.addWorksheet("PM Schedule");
  sheet.columns = [
    { width: 8 }, { width: 28 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Task", "Equipment", "Frequency", "Last Done", "Next Due", "Assigned To", "Status"]);
  styleHeaderRow(headerRow, brand);

  const tasks = data.tasks || data.items || [];
  tasks.forEach((t, i) => {
    const row = sheet.addRow([
      t.id || i + 1,
      t.task || t.description || "",
      t.equipment || "",
      t.frequency || "Monthly",
      t.lastDone || t.lastCompleted || "",
      t.nextDue || "",
      t.assignedTo || t.assignee || "",
      t.status || "Scheduled",
    ]);
    if ((t.status || "").toLowerCase() === "overdue") {
      row.getCell(8).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-036 Utility Management XLSX builder ──

function buildRubsCalculation(workbook, data, brand) {
  const sheet = workbook.addWorksheet("RUBS Calculation");
  sheet.columns = [
    { width: 12 }, { width: 20 }, { width: 12 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Unit #", "Tenant", "Sq Ft", "Occupants", "Water Share", "Electric Share", "Gas Share", "Total Bill-Back"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(6).numFmt = currencyFormat();
  sheet.getColumn(7).numFmt = currencyFormat();
  sheet.getColumn(8).numFmt = currencyFormat();

  const units = data.units || data.items || [];
  let totalBillback = 0;
  for (const u of units) {
    const total = (u.waterShare || 0) + (u.electricShare || 0) + (u.gasShare || 0);
    totalBillback += total;
    sheet.addRow([
      u.unit || u.unitNumber || "",
      u.tenant || "",
      u.sqFt || 0,
      u.occupants || 0,
      u.waterShare || 0,
      u.electricShare || 0,
      u.gasShare || 0,
      u.totalBillBack || total,
    ]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTAL", "", "", "", "", "", "", totalBillback]);
  totRow.font = { bold: true, name: "Arial" };

  // Utility costs tab
  const utilSheet = workbook.addWorksheet("Utility Costs");
  utilSheet.columns = [{ width: 20 }, { width: 18 }, { width: 18 }, { width: 14 }];
  const utilHeader = utilSheet.addRow(["Utility", "Total Cost", "Recoverable", "Recovery %"]);
  styleHeaderRow(utilHeader, brand);
  utilSheet.getColumn(2).numFmt = currencyFormat();
  utilSheet.getColumn(3).numFmt = currencyFormat();
  const utilities = data.utilities || [];
  for (const ut of utilities) {
    utilSheet.addRow([ut.name || "", ut.totalCost || 0, ut.recoverable || 0, ut.recoveryPct || ""]);
  }
  addDisclosureRow(utilSheet, brand, 4);
  addDisclosureRow(sheet, brand, 8);
}

// ── W-037 HOA & Association XLSX builder ──

function buildHoaAssessmentTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Assessment Tracker");
  sheet.columns = [
    { width: 12 }, { width: 22 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Unit/Lot", "Owner", "Assessment Type", "Amount Due", "Amount Paid", "Balance", "Due Date", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(6).numFmt = currencyFormat();

  const assessments = data.assessments || data.items || [];
  let totalDue = 0, totalPaid = 0;
  for (const a of assessments) {
    const due = a.amountDue || a.amount || 0;
    const paid = a.amountPaid || 0;
    totalDue += due;
    totalPaid += paid;
    const row = sheet.addRow([
      a.unit || a.lot || "",
      a.owner || "",
      a.assessmentType || a.type || "Regular",
      due,
      paid,
      a.balance || due - paid,
      a.dueDate || "",
      a.status || (paid >= due ? "Paid" : "Outstanding"),
    ]);
    if (paid < due) {
      row.getCell(8).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTALS", "", "", totalDue, totalPaid, totalDue - totalPaid, "", ""]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, 8);
}

// ── W-038 Warranty & Defect XLSX builders ──

function buildWarrantyRegister(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Warranty Register");
  sheet.columns = [
    { width: 8 }, { width: 22 }, { width: 20 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["ID", "Item/System", "Contractor", "Warranty Type", "Start Date", "End Date", "Days Left", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const warranties = data.warranties || data.items || [];
  warranties.forEach((w, i) => {
    const row = sheet.addRow([
      w.id || i + 1,
      w.item || w.system || "",
      w.contractor || w.vendor || "",
      w.warrantyType || w.type || "Standard",
      w.startDate || "",
      w.endDate || "",
      w.daysLeft || "",
      w.notes || "",
    ]);
    const days = w.daysLeft || 999;
    if (typeof days === "number" && days <= 30) {
      row.getCell(7).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildWdDefectLog(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Defect Log");
  sheet.columns = [
    { width: 8 }, { width: 30 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 20 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Description", "Location", "Severity", "Reported Date", "Responsible Party", "Due Date", "Status"]);
  styleHeaderRow(headerRow, brand);

  const defects = data.defects || data.items || [];
  defects.forEach((d, i) => {
    const row = sheet.addRow([
      d.id || i + 1,
      d.description || "",
      d.location || "",
      d.severity || "Minor",
      d.reportedDate || d.date || "",
      d.responsibleParty || d.contractor || "",
      d.dueDate || "",
      d.status || "Open",
    ]);
    if ((d.severity || "").toLowerCase() === "critical") {
      row.getCell(4).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-040 Tax Appeal XLSX builders ──

function buildTaPaymentTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Tax Payment Tracker");
  sheet.columns = [
    { width: 25 }, { width: 14 }, { width: 18 }, { width: 18 },
    { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Property", "Tax Year", "Assessed Value", "Tax Amount", "Due Date", "Paid Date", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();

  const payments = data.payments || data.items || [];
  let totalTax = 0;
  for (const p of payments) {
    const tax = p.taxAmount || p.amount || 0;
    totalTax += tax;
    sheet.addRow([
      p.property || p.name || "",
      p.taxYear || "",
      p.assessedValue || 0,
      tax,
      p.dueDate || "",
      p.paidDate || "",
      p.status || "Due",
    ]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTAL", "", "", totalTax, "", "", ""]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, 7);
}

function buildTaProjection(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Tax Projection");
  const years = data.years || data.periods || ["2026", "2027", "2028", "2029", "2030"];
  const headers = ["Property", ...years];
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(1).width = 28;
  for (let i = 2; i <= headers.length; i++) {
    sheet.getColumn(i).width = 16;
    sheet.getColumn(i).numFmt = currencyFormat();
  }

  const properties = data.properties || data.items || [];
  const totals = new Array(years.length).fill(0);
  for (const p of properties) {
    const values = p.values || p.projectedTax || [];
    values.forEach((v, idx) => { if (idx < totals.length) totals[idx] += (typeof v === "number" ? v : parseFloat(v) || 0); });
    sheet.addRow([p.property || p.name || "", ...values]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTAL", ...totals]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, headers.length);
}

// ── W-041 Vendor Compliance XLSX builders ──

function buildVendorRegistry(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Vendor Registry");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 18 }, { width: 16 },
    { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Vendor", "Category", "License #", "Insurance Exp.", "W-9 on File", "COI Current", "Status"]);
  styleHeaderRow(headerRow, brand);

  const vendors = data.vendors || data.items || [];
  vendors.forEach((v, i) => {
    const row = sheet.addRow([
      v.id || i + 1,
      v.vendor || v.name || "",
      v.category || v.trade || "",
      v.licenseNumber || v.license || "",
      v.insuranceExp || v.insuranceExpiration || "",
      v.w9 ? "Yes" : "No",
      v.coiCurrent ? "Yes" : "No",
      v.status || "Active",
    ]);
    if (!(v.coiCurrent)) {
      row.getCell(7).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildContractTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Contract Tracker");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 22 }, { width: 18 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Vendor", "Contract Desc.", "Value", "Start Date", "End Date", "Renewal", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(4).numFmt = currencyFormat();

  const contracts = data.contracts || data.items || [];
  contracts.forEach((c, i) => {
    sheet.addRow([
      c.id || i + 1,
      c.vendor || c.name || "",
      c.description || c.contractDesc || "",
      c.value || c.amount || 0,
      c.startDate || "",
      c.endDate || "",
      c.renewal || "Annual",
      c.status || "Active",
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildVcBidComparison(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Bid Comparison");
  sheet.columns = [
    { width: 8 }, { width: 28 }, { width: 22 }, { width: 18 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["#", "Scope/Service", "Vendor", "Bid Amount", "Terms", "Rating", "Recommended", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(4).numFmt = currencyFormat();

  const bids = data.bids || data.items || [];
  bids.forEach((b, i) => {
    sheet.addRow([
      b.id || i + 1,
      b.scope || b.service || "",
      b.vendor || b.name || "",
      b.bidAmount || b.amount || 0,
      b.terms || "",
      b.rating || "",
      b.recommended ? "Yes" : "No",
      b.notes || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

// ── W-051 Investor Reporting & Distributions XLSX builders ──

function buildDistributionSchedule(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Distribution Schedule");
  sheet.columns = [
    { width: 25 }, { width: 14 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Investor", "Ownership %", "Capital Contributed", "Preferred Return", "Distribution Amount", "Period", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(2).numFmt = percentFormat();
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).numFmt = currencyFormat();

  const investors = data.investors || data.items || [];
  let totalDist = 0;
  for (const inv of investors) {
    const dist = inv.distributionAmount || inv.distribution || 0;
    totalDist += dist;
    sheet.addRow([
      inv.investor || inv.name || "",
      inv.ownership || inv.ownershipPct || 0,
      inv.capitalContributed || inv.capital || 0,
      inv.preferredReturn || inv.prefReturn || 0,
      dist,
      inv.period || "",
      inv.status || "Scheduled",
    ]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTAL", "", "", "", totalDist, "", ""]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, 7);
}

function buildCapitalAccount(workbook, data, brand) {
  // Tab 1: Capital Accounts
  const sheet = workbook.addWorksheet("Capital Accounts");
  sheet.columns = [
    { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 },
  ];
  const headerRow = sheet.addRow(["Investor", "Beginning Balance", "Contributions", "Distributions", "Allocation", "Ending Balance"]);
  styleHeaderRow(headerRow, brand);
  for (let i = 2; i <= 6; i++) sheet.getColumn(i).numFmt = currencyFormat();

  const accounts = data.accounts || data.items || [];
  for (const a of accounts) {
    const begin = a.beginningBalance || a.beginBal || 0;
    const contrib = a.contributions || 0;
    const dist = a.distributions || 0;
    const alloc = a.allocation || 0;
    sheet.addRow([
      a.investor || a.name || "",
      begin,
      contrib,
      dist,
      alloc,
      a.endingBalance || (begin + contrib - dist + alloc),
    ]);
  }

  // Tab 2: Transaction History
  const txSheet = workbook.addWorksheet("Transactions");
  txSheet.columns = [{ width: 14 }, { width: 25 }, { width: 18 }, { width: 18 }, { width: 20 }];
  const txHeader = txSheet.addRow(["Date", "Investor", "Type", "Amount", "Description"]);
  styleHeaderRow(txHeader, brand);
  txSheet.getColumn(4).numFmt = currencyFormat();
  const transactions = data.transactions || [];
  for (const tx of transactions) {
    txSheet.addRow([tx.date || "", tx.investor || "", tx.type || "", tx.amount || 0, tx.description || ""]);
  }
  addDisclosureRow(txSheet, brand, 5);
  addDisclosureRow(sheet, brand, 6);
}

// ── W-052 Debt Service & Loan Compliance XLSX builders ──

function buildPaymentSchedule(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Payment Schedule");
  sheet.columns = [
    { width: 8 }, { width: 14 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 18 },
  ];
  const headerRow = sheet.addRow(["#", "Date", "Payment", "Principal", "Interest", "Balance", "DSCR"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(6).numFmt = currencyFormat();

  const payments = data.payments || data.items || [];
  payments.forEach((p, i) => {
    const row = sheet.addRow([
      p.number || i + 1,
      p.date || "",
      p.payment || p.totalPayment || 0,
      p.principal || 0,
      p.interest || 0,
      p.balance || p.remainingBalance || 0,
      p.dscr || "",
    ]);
    if (typeof p.dscr === "number" && p.dscr < 1.25) {
      row.getCell(7).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 7);
}

function buildReserveTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Reserve Tracker");
  sheet.columns = [
    { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Reserve Account", "Required Balance", "Current Balance", "Shortfall", "Next Funding Date", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(2).numFmt = currencyFormat();
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();

  const reserves = data.reserves || data.items || [];
  for (const r of reserves) {
    const required = r.requiredBalance || r.required || 0;
    const current = r.currentBalance || r.current || 0;
    const shortfall = r.shortfall || Math.max(0, required - current);
    const row = sheet.addRow([
      r.account || r.name || "",
      required,
      current,
      shortfall,
      r.nextFundingDate || r.nextDate || "",
      r.status || (shortfall > 0 ? "Underfunded" : "Funded"),
      r.notes || "",
    ]);
    if (shortfall > 0) {
      row.getCell(4).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
      row.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }
  addDisclosureRow(sheet, brand, 7);
}

// ── W-042 Disposition Planning XLSX builders ──

function buildBrokerComparison(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Broker Comparison");
  sheet.columns = [
    { width: 25 }, { width: 22 }, { width: 14 }, { width: 18 },
    { width: 14 }, { width: 16 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Broker/Firm", "Market Specialty", "Commission %", "Est. Sale Price", "Track Record", "Marketing Plan", "Rating", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = percentFormat();
  sheet.getColumn(4).numFmt = currencyFormat();

  const brokers = data.brokers || data.items || [];
  for (const b of brokers) {
    sheet.addRow([
      b.broker || b.firm || b.name || "",
      b.specialty || b.marketSpecialty || "",
      b.commission || b.commissionPct || 0,
      b.estSalePrice || b.estimatedPrice || 0,
      b.trackRecord || "",
      b.marketingPlan || "",
      b.rating || "",
      b.notes || "",
    ]);
  }
  addDisclosureRow(sheet, brand, 8);
}

function buildOfferComparison(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Offer Comparison");
  sheet.columns = [
    { width: 22 }, { width: 18 }, { width: 14 }, { width: 16 },
    { width: 14 }, { width: 16 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Buyer", "Offer Price", "Earnest $", "Financing", "Close Date", "Contingencies", "Net Proceeds", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(2).numFmt = currencyFormat();
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(7).numFmt = currencyFormat();

  const offers = data.offers || data.items || [];
  for (const o of offers) {
    sheet.addRow([
      o.buyer || o.name || "",
      o.offerPrice || o.price || 0,
      o.earnest || o.earnestMoney || 0,
      o.financing || "Cash",
      o.closeDate || "",
      o.contingencies || "",
      o.netProceeds || 0,
      o.notes || "",
    ]);
  }
  addDisclosureRow(sheet, brand, 8);
}

function buildClosingChecklist(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Closing Checklist");
  sheet.columns = [
    { width: 8 }, { width: 35 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 20 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["#", "Task", "Category", "Due Date", "Status", "Responsible Party", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const tasks = data.tasks || data.items || [];
  tasks.forEach((t, i) => {
    sheet.addRow([
      t.id || i + 1,
      t.task || t.description || "",
      t.category || "",
      t.dueDate || "",
      t.status || "Pending",
      t.responsibleParty || t.assignee || "",
      t.notes || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 7);
}

// ── W-043 Exchange (1031) XLSX builder ──

function buildBasisCalculation(workbook, data, brand) {
  // Tab 1: Basis Calculation
  const sheet = workbook.addWorksheet("Basis Calculation");
  sheet.columns = [
    { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 },
  ];
  const headerRow = sheet.addRow(["Property", "Original Basis", "Improvements", "Depreciation", "Adj. Basis", "FMV"]);
  styleHeaderRow(headerRow, brand);
  for (let i = 2; i <= 6; i++) sheet.getColumn(i).numFmt = currencyFormat();

  const properties = data.properties || data.items || [];
  for (const p of properties) {
    const origBasis = p.originalBasis || p.basis || 0;
    const improvements = p.improvements || 0;
    const depreciation = p.depreciation || 0;
    sheet.addRow([
      p.property || p.name || "",
      origBasis,
      improvements,
      depreciation,
      p.adjustedBasis || (origBasis + improvements - depreciation),
      p.fmv || p.fairMarketValue || 0,
    ]);
  }

  // Tab 2: Exchange Summary
  const exSheet = workbook.addWorksheet("Exchange Summary");
  exSheet.columns = [{ width: 30 }, { width: 22 }];
  const exHeader = exSheet.addRow(["Item", "Amount"]);
  styleHeaderRow(exHeader, brand);
  exSheet.getColumn(2).numFmt = currencyFormat();
  const summary = data.exchangeSummary || data.summary || {};
  exSheet.addRow(["Relinquished Property FMV", summary.relinquishedFmv || 0]);
  exSheet.addRow(["Adjusted Basis", summary.adjustedBasis || 0]);
  exSheet.addRow(["Realized Gain", summary.realizedGain || 0]);
  exSheet.addRow(["Recognized Gain (Boot)", summary.recognizedGain || summary.boot || 0]);
  exSheet.addRow(["Deferred Gain", summary.deferredGain || 0]);
  exSheet.addRow(["Replacement Property Basis", summary.replacementBasis || 0]);
  addDisclosureRow(exSheet, brand, 2);
  addDisclosureRow(sheet, brand, 6);
}

// ── W-050 Deal Management & Data Room XLSX builders ──

function buildDataRoomIndex(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Data Room Index");
  sheet.columns = [
    { width: 8 }, { width: 22 }, { width: 35 }, { width: 14 },
    { width: 16 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["#", "Folder", "Document", "Date Uploaded", "Uploaded By", "Version", "Status"]);
  styleHeaderRow(headerRow, brand);

  const documents = data.documents || data.items || [];
  documents.forEach((d, i) => {
    sheet.addRow([
      d.id || i + 1,
      d.folder || d.category || "",
      d.document || d.name || "",
      d.dateUploaded || d.uploadDate || "",
      d.uploadedBy || "",
      d.version || "1.0",
      d.status || "Current",
    ]);
  });
  addDisclosureRow(sheet, brand, 7);
}

function buildBuyerTracker(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Buyer Tracker");
  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 22 }, { width: 14 },
    { width: 16 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["#", "Buyer", "Contact", "CA Signed", "Data Room Access", "LOI Status", "Stage", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const buyers = data.buyers || data.items || [];
  buyers.forEach((b, i) => {
    sheet.addRow([
      b.id || i + 1,
      b.buyer || b.name || "",
      b.contact || b.email || "",
      b.caSigned ? "Yes" : "No",
      b.dataRoomAccess ? "Granted" : "Pending",
      b.loiStatus || "None",
      b.stage || "Prospect",
      b.notes || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildDdChecklist(workbook, data, brand) {
  const sheet = workbook.addWorksheet("DD Checklist");
  sheet.columns = [
    { width: 8 }, { width: 22 }, { width: 30 }, { width: 14 },
    { width: 14 }, { width: 20 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["#", "Category", "Item", "Status", "Due Date", "Responsible Party", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const items = data.items || data.checklist || [];
  items.forEach((item, i) => {
    const row = sheet.addRow([
      item.id || i + 1,
      item.category || "",
      item.item || item.description || "",
      item.status || "Pending",
      item.dueDate || "",
      item.responsibleParty || item.assignee || "",
      item.notes || "",
    ]);
    if ((item.status || "").toLowerCase() === "overdue") {
      row.getCell(4).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  });
  addDisclosureRow(sheet, brand, 7);
}

// ── W-046 Entity Formation XLSX builders ──

function buildFormationChecklist(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Formation Checklist");
  sheet.columns = [
    { width: 8 }, { width: 30 }, { width: 18 }, { width: 14 },
    { width: 14 }, { width: 20 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["#", "Task", "Category", "Due Date", "Status", "Responsible Party", "Notes"]);
  styleHeaderRow(headerRow, brand);

  const tasks = data.tasks || data.items || [];
  tasks.forEach((t, i) => {
    sheet.addRow([
      t.id || i + 1,
      t.task || t.description || "",
      t.category || "",
      t.dueDate || "",
      t.status || "Pending",
      t.responsibleParty || t.assignee || "",
      t.notes || "",
    ]);
  });
  addDisclosureRow(sheet, brand, 7);
}

function buildEntityRegistry(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Entity Registry");
  sheet.columns = [
    { width: 8 }, { width: 28 }, { width: 14 }, { width: 16 },
    { width: 18 }, { width: 14 }, { width: 16 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["ID", "Entity Name", "Type", "State", "EIN", "Formation Date", "Registered Agent", "Status"]);
  styleHeaderRow(headerRow, brand);

  const entities = data.entities || data.items || [];
  entities.forEach((e, i) => {
    sheet.addRow([
      e.id || i + 1,
      e.entityName || e.name || "",
      e.type || e.entityType || "LLC",
      e.state || e.jurisdiction || "",
      e.ein || "",
      e.formationDate || "",
      e.registeredAgent || e.agent || "",
      e.status || "Active",
    ]);
  });
  addDisclosureRow(sheet, brand, 8);
}

function buildAnnualCompliance(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Annual Compliance");
  sheet.columns = [
    { width: 25 }, { width: 22 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Entity", "Filing Type", "Jurisdiction", "Due Date", "Fee", "Status", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(5).numFmt = currencyFormat();

  const filings = data.filings || data.items || [];
  for (const f of filings) {
    const row = sheet.addRow([
      f.entity || f.entityName || "",
      f.filingType || f.type || "Annual Report",
      f.jurisdiction || f.state || "",
      f.dueDate || "",
      f.fee || 0,
      f.status || "Due",
      f.notes || "",
    ]);
    if ((f.status || "").toLowerCase() === "overdue") {
      row.getCell(6).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }
  addDisclosureRow(sheet, brand, 7);
}

// ── W-049 Property Insurance Review XLSX builders ──

function buildClaimsLog(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Claims Log");
  sheet.columns = [
    { width: 8 }, { width: 14 }, { width: 28 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 },
  ];
  const headerRow = sheet.addRow(["Claim #", "Date Filed", "Description", "Property", "Amount Claimed", "Amount Paid", "Carrier", "Status"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(6).numFmt = currencyFormat();

  const claims = data.claims || data.items || [];
  let totalClaimed = 0, totalPaid = 0;
  for (const c of claims) {
    const claimed = c.amountClaimed || c.amount || 0;
    const paid = c.amountPaid || 0;
    totalClaimed += claimed;
    totalPaid += paid;
    sheet.addRow([
      c.claimNumber || c.id || "",
      c.dateFiled || c.date || "",
      c.description || "",
      c.property || "",
      claimed,
      paid,
      c.carrier || c.insurer || "",
      c.status || "Open",
    ]);
  }
  sheet.addRow([]);
  const totRow = sheet.addRow(["TOTALS", "", "", "", totalClaimed, totalPaid, "", ""]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, 8);
}

function buildRenewalComparison(workbook, data, brand) {
  const sheet = workbook.addWorksheet("Renewal Comparison");
  sheet.columns = [
    { width: 22 }, { width: 22 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 14 }, { width: 14 }, { width: 25 },
  ];
  const headerRow = sheet.addRow(["Coverage Type", "Carrier", "Current Premium", "Renewal Premium", "Change ($)", "Change (%)", "Deductible", "Notes"]);
  styleHeaderRow(headerRow, brand);
  sheet.getColumn(3).numFmt = currencyFormat();
  sheet.getColumn(4).numFmt = currencyFormat();
  sheet.getColumn(5).numFmt = currencyFormat();
  sheet.getColumn(7).numFmt = currencyFormat();

  const policies = data.policies || data.items || [];
  let totalCurrent = 0, totalRenewal = 0;
  for (const p of policies) {
    const current = p.currentPremium || p.current || 0;
    const renewal = p.renewalPremium || p.renewal || 0;
    const changeDollar = renewal - current;
    const changePct = current > 0 ? ((renewal - current) / current * 100).toFixed(1) + "%" : "N/A";
    totalCurrent += current;
    totalRenewal += renewal;
    const row = sheet.addRow([
      p.coverageType || p.type || "",
      p.carrier || p.insurer || "",
      current,
      renewal,
      changeDollar,
      changePct,
      p.deductible || 0,
      p.notes || "",
    ]);
    if (changeDollar > 0) {
      row.getCell(5).font = { bold: true, color: { argb: "FFDC2626" }, name: "Arial" };
    }
  }
  sheet.addRow([]);
  const totChange = totalRenewal - totalCurrent;
  const totRow = sheet.addRow(["TOTALS", "", totalCurrent, totalRenewal, totChange, totalCurrent > 0 ? ((totChange / totalCurrent) * 100).toFixed(1) + "%" : "", "", ""]);
  totRow.font = { bold: true, name: "Arial" };
  addDisclosureRow(sheet, brand, 8);
}

module.exports = { generateXlsx };
