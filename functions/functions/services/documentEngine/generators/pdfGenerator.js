// services/documentEngine/generators/pdfGenerator.js
// PDF generation via pdfkit — covers report-standard, memo-executive, one-pager

const PDFDocument = require("pdfkit");
const { MARGINS, FONTS, PAGE_SIZES, COLORS } = require("../templates/layouts");

async function generatePdf({ template, data, brand, logoBuffer }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: "LETTER",
      margins: MARGINS.standard,
      bufferPages: true,
      info: {
        Title: data.title || "Untitled Document",
        Author: data.author || brand.name || "TitleApp",
        Creator: "TitleApp Document Engine",
        Producer: "TitleApp.ai",
      },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      switch (template.id) {
        case "memo-executive":
          renderMemo(doc, data, brand, logoBuffer);
          break;
        case "one-pager":
          renderOnePager(doc, data, brand, logoBuffer);
          break;
        case "draw-g702":
          renderG702(doc, data, brand, logoBuffer);
          break;
        case "draw-lender-checklist":
          renderLenderChecklist(doc, data, brand, logoBuffer);
          break;
        case "cm-monthly-progress":
          renderMonthlyProgress(doc, data, brand, logoBuffer);
          break;
        case "cm-weekly-oac":
          renderWeeklyOAC(doc, data, brand, logoBuffer);
          break;
        case "cm-punchlist":
          renderPunchlist(doc, data, brand, logoBuffer);
          break;
        case "cl-loan-comparison":
          renderLoanComparison(doc, data, brand, logoBuffer);
          break;
        case "cl-utilization-dashboard":
          renderUtilizationDashboard(doc, data, brand, logoBuffer);
          break;
        case "cl-conversion-checklist":
          renderConversionChecklist(doc, data, brand, logoBuffer);
          break;
        case "cs-stack-summary":
          renderStackSummary(doc, data, brand, logoBuffer);
          break;
        case "cs-scenario-comparison":
          renderScenarioComparison(doc, data, brand, logoBuffer);
          break;
        // W-002 CRE Analyst
        case "da-ic-memo":
          renderIcMemo(doc, data, brand, logoBuffer);
          break;
        case "da-risk-summary":
          renderDealRiskSummary(doc, data, brand, logoBuffer);
          break;
        // W-019 Investor Relations
        case "ir-compliance-checklist":
          renderComplianceChecklist(doc, data, brand, logoBuffer);
          break;
        case "ir-investor-summary":
          renderInvestorSummary(doc, data, brand, logoBuffer);
          break;
        case "ir-accreditation-report":
          renderAccreditationReport(doc, data, brand, logoBuffer);
          break;
        case "ir-fund-overview":
          renderFundOverview(doc, data, brand, logoBuffer);
          break;
        case "ir-lp-terms":
          renderLpTerms(doc, data, brand, logoBuffer);
          break;
        case "ir-deal-summary":
          renderSyndicationDealSummary(doc, data, brand, logoBuffer);
          break;
        case "ir-risk-assessment":
          renderSyndicationRiskAssessment(doc, data, brand, logoBuffer);
          break;
        case "ir-offering-memo":
          renderOfferingMemo(doc, data, brand, logoBuffer);
          break;
        case "ir-quarterly-report":
          renderQuarterlyReport(doc, data, brand, logoBuffer);
          break;
        case "ir-capital-call":
          renderCapitalCall(doc, data, brand, logoBuffer);
          break;
        // W-048 Chief of Staff
        case "cos-pipeline-status":
          renderPipelineStatus(doc, data, brand, logoBuffer);
          break;
        case "cos-weekly-digest":
          renderWeeklyDigest(doc, data, brand, logoBuffer);
          break;
        case "cos-handoff-memo":
          renderHandoffMemo(doc, data, brand, logoBuffer);
          break;
        // W-022 Bid & Procurement
        case "bp-bid-package":
          renderBidPackage(doc, data, brand, logoBuffer);
          break;
        case "bp-award-memo":
          renderAwardMemo(doc, data, brand, logoBuffer);
          break;
        case "bp-sub-qual":
          renderSubQual(doc, data, brand, logoBuffer);
          break;
        // W-025 Insurance & Risk
        case "ir-coi-deficiency":
          renderCoiDeficiency(doc, data, brand, logoBuffer);
          break;
        case "ir-lender-report":
          renderLenderReport(doc, data, brand, logoBuffer);
          break;
        case "ir-risk-summary":
          renderRiskSummary(doc, data, brand, logoBuffer);
          break;
        // W-027 Quality Control & Inspection
        case "qc-inspection-report":
          renderInspectionReport(doc, data, brand, logoBuffer);
          break;
        case "qc-trade-checklist":
          renderTradeChecklist(doc, data, brand, logoBuffer);
          break;
        case "qc-co-tracker":
          renderCoTracker(doc, data, brand, logoBuffer);
          break;
        // W-028 Safety & OSHA
        case "safety-site-plan":
          renderSiteSafetyPlan(doc, data, brand, logoBuffer);
          break;
        case "safety-incident-report":
          renderIncidentReport(doc, data, brand, logoBuffer);
          break;
        case "safety-toolbox-talk":
          renderToolboxTalk(doc, data, brand, logoBuffer);
          break;
        case "safety-jha":
          renderJha(doc, data, brand, logoBuffer);
          break;
        // W-029 MEP Coordination
        case "mep-meeting-minutes":
          renderMepMeetingMinutes(doc, data, brand, logoBuffer);
          break;
        case "mep-cx-checklist":
          renderCxChecklist(doc, data, brand, logoBuffer);
          break;
        case "report-standard":
        default:
          renderReport(doc, data, brand, logoBuffer);
          break;
      }

      // Add footers to all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        addFooter(doc, brand, i + 1, range.count);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// --- Shared helpers ---

function primaryColor(brand) {
  return brand.primaryColor || COLORS.primary;
}

function secondaryColor(brand) {
  return brand.secondaryColor || COLORS.secondary;
}

function contentWidth() {
  return PAGE_SIZES.letter.width - MARGINS.standard.left - MARGINS.standard.right;
}

function addHeader(doc, brand, logoBuffer) {
  const startY = MARGINS.standard.top;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, MARGINS.standard.left, startY - 10, { height: 32 });
    } catch (e) {
      // Logo failed to load — skip silently
    }
  }
  const lineY = startY + 30;
  doc.moveTo(MARGINS.standard.left, lineY)
    .lineTo(PAGE_SIZES.letter.width - MARGINS.standard.right, lineY)
    .strokeColor(primaryColor(brand))
    .lineWidth(2)
    .stroke();
  doc.y = lineY + 12;
}

function addFooter(doc, brand, pageNum, totalPages) {
  const y = PAGE_SIZES.letter.height - MARGINS.standard.bottom + 10;
  const w = contentWidth();

  // Separator line
  doc.save();
  doc.moveTo(MARGINS.standard.left, y - 8)
    .lineTo(PAGE_SIZES.letter.width - MARGINS.standard.right, y - 8)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // AI disclosure (P0.9) — lineBreak: false prevents PDFKit from creating new pages
  doc.fontSize(FONTS.footer.size)
    .font(FONTS.footer.font)
    .fillColor(COLORS.textLight)
    .text(
      brand.aiDisclosure ||
        "Generated by TitleApp Digital Worker. AI-assisted analysis — human review recommended.",
      MARGINS.standard.left,
      y,
      { width: w - 60, align: "left", lineBreak: false }
    );

  // Page number — lineBreak: false to stay on current page
  doc.text(
    `${pageNum} / ${totalPages}`,
    MARGINS.standard.left,
    y,
    { width: w, align: "right", lineBreak: false }
  );
  doc.restore();
}

// --- Report layout ---

function renderReport(doc, data, brand, logoBuffer) {
  // Cover page
  addHeader(doc, brand, logoBuffer);
  doc.moveDown(3);
  doc.fontSize(26)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text(data.title, { align: "center" });

  if (data.subtitle) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.subheading.size)
      .font("Helvetica")
      .fillColor(secondaryColor(brand))
      .text(data.subtitle, { align: "center" });
  }

  doc.moveDown(3);
  doc.fontSize(FONTS.body.size)
    .font(FONTS.body.font)
    .fillColor(COLORS.text);

  if (data.author) {
    doc.text(`Prepared by: ${data.author}`, { align: "center" });
  }
  doc.text(
    `Date: ${data.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    { align: "center" }
  );

  if (data.preparedFor) {
    doc.text(`Prepared for: ${data.preparedFor}`, { align: "center" });
  }

  // Confidentiality notice
  doc.moveDown(4);
  doc.fontSize(FONTS.caption.size)
    .font(FONTS.caption.font)
    .fillColor(COLORS.textLight)
    .text(
      brand.footerText || "Confidential — Generated by TitleApp.ai",
      { align: "center" }
    );

  // Body sections
  const sections = data.sections || [];
  for (const section of sections) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);

    doc.fontSize(FONTS.heading.size)
      .font(FONTS.heading.font)
      .fillColor(primaryColor(brand))
      .text(section.title || "Section");

    doc.moveDown(0.5);

    // Section highlights (key-value pairs)
    if (section.highlights && Array.isArray(section.highlights)) {
      for (const h of section.highlights) {
        doc.fontSize(FONTS.label.size)
          .font(FONTS.label.font)
          .fillColor(COLORS.textLight)
          .text(h.label + ": ", { continued: true });
        doc.font(FONTS.body.font)
          .fillColor(COLORS.text)
          .text(h.value || "");
      }
      doc.moveDown(0.5);
    }

    // Section body text
    doc.fontSize(FONTS.body.size)
      .font(FONTS.body.font)
      .fillColor(COLORS.text);

    if (typeof section.content === "string") {
      doc.text(section.content, { lineGap: 4 });
    } else if (Array.isArray(section.content)) {
      for (const para of section.content) {
        if (typeof para === "string") {
          doc.text(para, { lineGap: 4 });
          doc.moveDown(0.5);
        }
      }
    }

    // Section table
    if (section.table && Array.isArray(section.table.rows)) {
      doc.moveDown(0.5);
      renderSimpleTable(doc, section.table, brand);
    }
  }

  // Appendix
  if (data.appendix) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size)
      .font(FONTS.heading.font)
      .fillColor(primaryColor(brand))
      .text("Appendix");
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size)
      .font(FONTS.body.font)
      .fillColor(COLORS.text);
    if (typeof data.appendix === "string") {
      doc.text(data.appendix, { lineGap: 4 });
    } else if (Array.isArray(data.appendix)) {
      for (const item of data.appendix) {
        doc.text(typeof item === "string" ? item : JSON.stringify(item), { lineGap: 4 });
        doc.moveDown(0.3);
      }
    }
  }
}

// --- Memo layout ---

function renderMemo(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(FONTS.heading.size)
    .font(FONTS.heading.font)
    .fillColor(primaryColor(brand))
    .text("MEMORANDUM");
  doc.moveDown(0.8);

  // Header fields
  const fields = [
    { label: "TO", value: data.to },
    { label: "FROM", value: data.from },
    { label: "DATE", value: data.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
    { label: "RE", value: data.subject || data.title },
  ];
  if (data.cc) {
    fields.push({ label: "CC", value: data.cc });
  }

  for (const f of fields) {
    doc.fontSize(FONTS.body.size);
    doc.font(FONTS.label.font)
      .fillColor(COLORS.textLight)
      .text(`${f.label}:`, MARGINS.standard.left, doc.y, { continued: true, width: 50 });
    doc.font(FONTS.body.font)
      .fillColor(COLORS.text)
      .text(`  ${f.value || ""}`, { lineGap: 2 });
  }

  // Divider
  doc.moveDown(0.5);
  doc.moveTo(MARGINS.standard.left, doc.y)
    .lineTo(PAGE_SIZES.letter.width - MARGINS.standard.right, doc.y)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
  doc.moveDown(1);

  // Body
  doc.fontSize(FONTS.body.size)
    .font(FONTS.body.font)
    .fillColor(COLORS.text);

  if (typeof data.body === "string") {
    doc.text(data.body, { lineGap: 4 });
  } else if (Array.isArray(data.body)) {
    for (const para of data.body) {
      doc.text(para, { lineGap: 4 });
      doc.moveDown(0.5);
    }
  }

  // Recommendation
  if (data.recommendation) {
    doc.moveDown(1);
    doc.fontSize(FONTS.subheading.size)
      .font(FONTS.subheading.font)
      .fillColor(primaryColor(brand))
      .text("Recommendation");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size)
      .font(FONTS.body.font)
      .fillColor(COLORS.text)
      .text(data.recommendation, { lineGap: 4 });
  }
}

// --- One-pager layout ---

function renderOnePager(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(22)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text(data.title, { align: "center" });

  if (data.subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(FONTS.body.size)
      .font(FONTS.body.font)
      .fillColor(COLORS.textLight)
      .text(data.subtitle, { align: "center" });
  }

  doc.moveDown(1);

  // Metrics grid
  if (data.metrics && Array.isArray(data.metrics)) {
    const metricsPerRow = Math.min(data.metrics.length, 3);
    const colWidth = contentWidth() / metricsPerRow;

    for (let i = 0; i < data.metrics.length; i++) {
      const m = data.metrics[i];
      const col = i % metricsPerRow;
      const x = MARGINS.standard.left + col * colWidth;

      if (col === 0 && i > 0) {
        doc.moveDown(1.5);
      }

      const rowY = doc.y;

      doc.fontSize(FONTS.metric.size)
        .font(FONTS.metric.font)
        .fillColor(primaryColor(brand))
        .text(String(m.value || "0"), x, rowY, {
          width: colWidth,
          align: "center",
        });

      doc.fontSize(FONTS.caption.size)
        .font(FONTS.caption.font)
        .fillColor(COLORS.textLight)
        .text(m.label || "", x, rowY + 28, {
          width: colWidth,
          align: "center",
        });

      // Reset Y for same row
      if (col < metricsPerRow - 1 && i < data.metrics.length - 1) {
        doc.y = rowY;
      }
    }

    doc.moveDown(2);
  }

  // Highlights
  if (data.highlights && Array.isArray(data.highlights)) {
    doc.fontSize(FONTS.subheading.size)
      .font(FONTS.subheading.font)
      .fillColor(primaryColor(brand))
      .text("Key Highlights");
    doc.moveDown(0.3);

    doc.fontSize(FONTS.body.size)
      .font(FONTS.body.font)
      .fillColor(COLORS.text);

    for (const h of data.highlights) {
      const text = typeof h === "string" ? h : h.text || h.label || "";
      doc.text(`  \u2022  ${text}`, { lineGap: 3 });
    }
  }

  // Call to action
  if (data.callToAction) {
    doc.moveDown(1);
    doc.fontSize(FONTS.body.size)
      .font("Helvetica-Bold")
      .fillColor(primaryColor(brand))
      .text(data.callToAction, { align: "center" });
  }

  // Contact info
  if (data.contactInfo) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.caption.size)
      .font(FONTS.caption.font)
      .fillColor(COLORS.textLight)
      .text(data.contactInfo, { align: "center" });
  }
}

// --- Simple table renderer ---

function renderSimpleTable(doc, table, brand) {
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (headers.length === 0 && rows.length === 0) return;

  const w = contentWidth();
  const colCount = headers.length || (rows[0] && rows[0].length) || 1;
  const colWidth = w / colCount;
  const startX = MARGINS.standard.left;
  let y = doc.y;

  // Header row
  if (headers.length > 0) {
    doc.fontSize(FONTS.label.size)
      .font(FONTS.label.font)
      .fillColor(COLORS.white);

    // Header background
    doc.rect(startX, y, w, 20)
      .fill(primaryColor(brand));

    for (let i = 0; i < headers.length; i++) {
      doc.fillColor(COLORS.white)
        .text(String(headers[i]), startX + i * colWidth + 4, y + 5, {
          width: colWidth - 8,
          align: "left",
        });
    }
    y += 22;
  }

  // Data rows
  doc.fontSize(FONTS.body.size)
    .font(FONTS.body.font)
    .fillColor(COLORS.text);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // Alternating row background
    if (r % 2 === 0) {
      doc.rect(startX, y, w, 18)
        .fill(COLORS.background);
    }

    doc.fillColor(COLORS.text);
    const cells = Array.isArray(row) ? row : Object.values(row);
    for (let i = 0; i < cells.length && i < colCount; i++) {
      doc.text(String(cells[i] || ""), startX + i * colWidth + 4, y + 4, {
        width: colWidth - 8,
        align: "left",
      });
    }
    y += 20;

    // Page break if needed
    if (y > PAGE_SIZES.letter.height - MARGINS.standard.bottom - 40) {
      doc.addPage();
      y = MARGINS.standard.top;
    }
  }

  doc.y = y + 8;
}

// --- AIA G702 layout ---

function renderG702(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("APPLICATION AND CERTIFICATE FOR PAYMENT", { align: "center" });
  doc.fontSize(10)
    .font("Helvetica")
    .fillColor(COLORS.textLight)
    .text("AIA Document G702", { align: "center" });
  doc.moveDown(1);

  // Project info block
  const fields = [
    ["Project", data.projectName || ""],
    ["Application No.", String(data.applicationNumber || "")],
    ["Period To", data.periodTo || ""],
    ["Contractor", data.contractorName || ""],
    ["Owner", data.ownerName || ""],
  ];

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of fields) {
    if (value) {
      doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
      doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
    }
  }

  doc.moveDown(1);

  // Contract summary table
  const originalSum = data.originalContractSum || 0;
  const cos = data.changeOrders || 0;
  const contractToDate = originalSum + cos;
  const completed = data.completedToDate || 0;
  const retPct = data.retainagePercent || 10;
  const retainage = Math.round(completed * retPct / 100);
  const earnedLessRetainage = completed - retainage;
  const prevCerts = data.previousCertificates || 0;
  const currentDue = earnedLessRetainage - prevCerts;
  const balanceToFinish = contractToDate - completed;

  const summaryRows = [
    ["1. Original Contract Sum", fmtCurrency(originalSum)],
    ["2. Net Change by Change Orders", fmtCurrency(cos)],
    ["3. Contract Sum to Date (1 + 2)", fmtCurrency(contractToDate)],
    ["4. Total Completed and Stored to Date", fmtCurrency(completed)],
    ["5. Retainage (" + retPct + "%)", fmtCurrency(retainage)],
    ["6. Total Earned Less Retainage (4 - 5)", fmtCurrency(earnedLessRetainage)],
    ["7. Less Previous Certificates for Payment", fmtCurrency(prevCerts)],
    ["8. Current Payment Due (6 - 7)", fmtCurrency(currentDue)],
    ["9. Balance to Finish Including Retainage", fmtCurrency(balanceToFinish + retainage)],
  ];

  renderSimpleTable(doc, {
    headers: ["Item", "Amount"],
    rows: summaryRows,
  }, brand);

  doc.moveDown(1.5);

  // Certification block
  doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(COLORS.text)
    .text("CONTRACTOR'S CERTIFICATION");
  doc.moveDown(0.3);
  doc.font(FONTS.body.font).fillColor(COLORS.text)
    .text("The undersigned Contractor certifies that to the best of the Contractor's knowledge, information, and belief, the Work covered by this Application for Payment has been completed in accordance with the Contract Documents.", { lineGap: 3 });

  doc.moveDown(1.5);
  const sigW = contentWidth() / 2 - 20;
  const sigY = doc.y;

  doc.moveTo(MARGINS.standard.left, sigY).lineTo(MARGINS.standard.left + sigW, sigY).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Contractor Signature / Date", MARGINS.standard.left, sigY + 4, { width: sigW });

  doc.moveTo(MARGINS.standard.left + sigW + 40, sigY).lineTo(MARGINS.standard.left + sigW * 2 + 40, sigY).stroke();
  doc.text("Architect Signature / Date", MARGINS.standard.left + sigW + 40, sigY + 4, { width: sigW });

  // Disclaimer
  doc.moveDown(3);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This draw package is for review purposes. Final draw approval requires lender review and inspection verification.", { align: "center" });

  if (data.notes) {
    doc.moveDown(1);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Notes: " + data.notes, { lineGap: 3 });
  }
}

function fmtCurrency(n) {
  if (typeof n !== "number") return String(n);
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Lender Checklist layout ---

function renderLenderChecklist(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("LENDER DRAW SUBMISSION CHECKLIST", { align: "center" });
  doc.moveDown(0.5);

  // Project info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.drawNumber ? ["Draw #", String(data.drawNumber)] : null,
    data.lenderName ? ["Lender", data.lenderName] : null,
    data.submissionDate ? ["Submission Date", data.submissionDate] : null,
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }

  doc.moveDown(1);

  // Checklist table
  const items = data.checklistItems || [];
  const rows = items.map((item) => {
    const statusIcon = item.status === "received" ? "RECEIVED" : item.status === "na" ? "N/A" : "MISSING";
    return [item.item || item.name || "", item.required !== false ? "Yes" : "No", statusIcon, item.notes || ""];
  });

  renderSimpleTable(doc, {
    headers: ["Document", "Required", "Status", "Notes"],
    rows,
  }, brand);

  // Summary
  const received = items.filter((i) => i.status === "received").length;
  const total = items.filter((i) => i.required !== false && i.status !== "na").length;

  doc.moveDown(1);
  doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
    .text(received + " of " + total + " required items received");

  if (received < total) {
    doc.moveDown(0.3);
    doc.font(FONTS.body.font).fillColor("#dc2626")
      .text("Draw package is INCOMPLETE — " + (total - received) + " item(s) missing");
  } else {
    doc.moveDown(0.3);
    doc.font(FONTS.body.font).fillColor("#16a34a")
      .text("Draw package is COMPLETE — ready for submission");
  }

  // Disclaimer
  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This draw package is for review purposes. Final draw approval requires lender review and inspection verification.", { align: "center" });

  if (data.notes) {
    doc.moveDown(1);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-021 Monthly Progress Report ---

function renderMonthlyProgress(doc, data, brand, logoBuffer) {
  // Cover page
  addHeader(doc, brand, logoBuffer);
  doc.moveDown(3);
  doc.fontSize(26)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text(data.title || "Monthly Progress Report", { align: "center" });

  if (data.projectName) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.subheading.size)
      .font("Helvetica")
      .fillColor(secondaryColor(brand))
      .text(data.projectName, { align: "center" });
  }

  doc.moveDown(1);
  doc.fontSize(FONTS.body.size)
    .font(FONTS.body.font)
    .fillColor(COLORS.text);
  if (data.reportPeriod) doc.text(`Report Period: ${data.reportPeriod}`, { align: "center" });
  doc.text(`Date: ${data.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });

  // Executive Summary
  doc.addPage();
  addHeader(doc, brand, logoBuffer);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Executive Summary");
  doc.moveDown(0.5);

  // Schedule status
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Schedule Status");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  const pctComplete = data.percentComplete != null ? data.percentComplete : "N/A";
  const daysVar = data.daysAheadBehind != null ? data.daysAheadBehind : 0;
  const daysLabel = daysVar >= 0 ? `${daysVar} days ahead` : `${Math.abs(daysVar)} days behind`;
  doc.text(`Overall Progress: ${pctComplete}% complete`);
  doc.text(`Schedule Variance: ${daysLabel}`);
  doc.moveDown(0.5);

  // Budget summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Budget Summary");
  doc.moveDown(0.3);
  const bs = data.budgetSummary || {};
  if (bs.originalContract || bs.revisedContract) {
    renderSimpleTable(doc, {
      headers: ["Item", "Amount"],
      rows: [
        ["Original Contract", fmtCurrency(bs.originalContract || 0)],
        ["Approved Changes", fmtCurrency(bs.approvedChanges || 0)],
        ["Revised Contract", fmtCurrency(bs.revisedContract || bs.originalContract || 0)],
        ["Committed", fmtCurrency(bs.committed || 0)],
        ["Spent to Date", fmtCurrency(bs.spentToDate || 0)],
        ["Remaining", fmtCurrency(bs.remaining || 0)],
        ["Contingency Remaining", fmtCurrency(bs.contingencyRemaining || 0)],
      ],
    }, brand);
  }

  // Change Orders
  if (data.changeOrders && Array.isArray(data.changeOrders) && data.changeOrders.length > 0) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Change Order Log");
    doc.moveDown(0.5);

    const coRows = data.changeOrders.map((co) => [
      co.number || co.coNumber || "",
      co.description || "",
      fmtCurrency(co.amount || co.cost || 0),
      co.status || "Pending",
    ]);
    renderSimpleTable(doc, { headers: ["CO #", "Description", "Amount", "Status"], rows: coRows }, brand);

    const approvedTotal = data.changeOrders.filter(co => co.status === "Approved").reduce((s, co) => s + (co.amount || co.cost || 0), 0);
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(COLORS.text)
      .text(`Cumulative Approved COs: ${fmtCurrency(approvedTotal)}`);
  }

  // RFI Summary
  if (data.rfis && Array.isArray(data.rfis) && data.rfis.length > 0) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("RFI Status Summary");
    doc.moveDown(0.5);

    const openRfis = data.rfis.filter(r => r.status === "Open" || r.status === "Pending Response");
    const overdueRfis = data.rfis.filter(r => r.overdue || r.daysOverdue > 0);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    doc.text(`Total RFIs: ${data.rfis.length}  |  Open: ${openRfis.length}  |  Overdue: ${overdueRfis.length}`);
    doc.moveDown(0.5);

    const rfiRows = data.rfis.slice(0, 20).map((r) => [
      r.number || r.rfiNumber || "",
      (r.description || r.question || "").substring(0, 50),
      r.assignedTo || "",
      r.status || "Open",
    ]);
    renderSimpleTable(doc, { headers: ["RFI #", "Description", "Assigned To", "Status"], rows: rfiRows }, brand);
  }

  // Risk Register
  if (data.risks && Array.isArray(data.risks) && data.risks.length > 0) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Risk Register");
    doc.moveDown(0.5);

    const riskRows = data.risks.map((r) => [
      r.description || "",
      r.severity || r.impact || "Medium",
      r.mitigation || "",
      r.status || "Open",
    ]);
    renderSimpleTable(doc, { headers: ["Risk", "Severity", "Mitigation", "Status"], rows: riskRows }, brand);
  }

  // 3-Week Look-Ahead
  if (data.lookAhead && Array.isArray(data.lookAhead) && data.lookAhead.length > 0) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("3-Week Look-Ahead");
    doc.moveDown(0.5);

    const laRows = data.lookAhead.map((a) => [
      a.activity || a.name || "",
      a.trade || "",
      a.startDate || a.start || "",
      a.endDate || a.end || "",
      a.status || "Scheduled",
    ]);
    renderSimpleTable(doc, { headers: ["Activity", "Trade", "Start", "End", "Status"], rows: laRows }, brand);
  }

  // Disclaimer
  const lastPage = doc.bufferedPageRange();
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This report does not replace licensed professional construction management. All construction decisions must be reviewed and approved by qualified professionals.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-021 Weekly OAC Report ---

function renderWeeklyOAC(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("WEEKLY OAC REPORT", { align: "center" });
  doc.moveDown(0.3);

  // Meta info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.weekNumber ? ["Week", String(data.weekNumber)] : null,
    data.reportDate ? ["Date", data.reportDate] : null,
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Schedule snapshot
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Schedule");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  const pct = data.percentComplete != null ? data.percentComplete : "N/A";
  const days = data.daysAheadBehind != null ? data.daysAheadBehind : 0;
  doc.text(`Progress: ${pct}% complete  |  Variance: ${days >= 0 ? days + " days ahead" : Math.abs(days) + " days behind"}`);
  doc.moveDown(0.5);

  // Budget snapshot
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Budget");
  doc.moveDown(0.3);
  const bs = data.budgetSummary || {};
  if (bs.revisedContract || bs.spentToDate) {
    renderSimpleTable(doc, {
      headers: ["Item", "Amount"],
      rows: [
        ["Revised Contract", fmtCurrency(bs.revisedContract || 0)],
        ["Spent to Date", fmtCurrency(bs.spentToDate || 0)],
        ["Remaining", fmtCurrency(bs.remaining || 0)],
        ["Contingency", fmtCurrency(bs.contingencyRemaining || 0)],
      ],
    }, brand);
  }
  doc.moveDown(0.5);

  // Open Items
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Open Items");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.openRfis != null) doc.text(`Open RFIs: ${data.openRfis}`);
  if (data.openCOs != null) doc.text(`Pending Change Orders: ${data.openCOs}`);
  if (data.openSubmittals != null) doc.text(`Pending Submittals: ${data.openSubmittals}`);
  doc.moveDown(0.5);

  // Inspections
  if (data.inspections && Array.isArray(data.inspections) && data.inspections.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Upcoming Inspections");
    doc.moveDown(0.3);
    const inspRows = data.inspections.map(i => [i.type || i.name || "", i.date || "", i.status || "Scheduled"]);
    renderSimpleTable(doc, { headers: ["Inspection", "Date", "Status"], rows: inspRows }, brand);
    doc.moveDown(0.5);
  }

  // 3-Week Look-Ahead
  if (data.lookAhead && Array.isArray(data.lookAhead) && data.lookAhead.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("3-Week Look-Ahead");
    doc.moveDown(0.3);
    const laRows = data.lookAhead.map(a => [a.activity || a.name || "", a.trade || "", a.startDate || a.start || "", a.endDate || a.end || ""]);
    renderSimpleTable(doc, { headers: ["Activity", "Trade", "Start", "End"], rows: laRows }, brand);
    doc.moveDown(0.5);
  }

  // Action Items
  if (data.actionItems && Array.isArray(data.actionItems) && data.actionItems.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Action Items");
    doc.moveDown(0.3);
    const aiRows = data.actionItems.map(a => [a.item || a.description || "", a.owner || "", a.dueDate || a.due || "", a.status || "Open"]);
    renderSimpleTable(doc, { headers: ["Item", "Owner", "Due", "Status"], rows: aiRows }, brand);
  }

  // Disclaimer
  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This report does not replace licensed professional construction management. All construction decisions must be reviewed and approved by qualified professionals.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-021 Punchlist ---

function renderPunchlist(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("PUNCHLIST", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.inspectionDate ? ["Inspection Date", data.inspectionDate] : null,
    data.inspectedBy ? ["Inspected By", data.inspectedBy] : null,
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Punchlist table
  const items = data.punchlistItems || [];
  const rows = items.map((item, idx) => [
    item.number || String(idx + 1),
    item.area || item.location || "",
    (item.description || "").substring(0, 60),
    item.trade || "",
    item.responsibleSub || item.sub || "",
    item.dueDate || "",
    item.status || "Open",
  ]);

  renderSimpleTable(doc, {
    headers: ["#", "Area", "Description", "Trade", "Responsible Sub", "Due", "Status"],
    rows,
  }, brand);

  // Summary
  const total = items.length;
  const open = items.filter(i => i.status === "Open" || !i.status).length;
  const inProgress = items.filter(i => i.status === "In Progress").length;
  const complete = items.filter(i => i.status === "Complete" || i.status === "Verified").length;

  doc.moveDown(1);
  doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
    .text(`Total Items: ${total}  |  Open: ${open}  |  In Progress: ${inProgress}  |  Complete: ${complete}`);

  if (open === 0 && inProgress === 0 && total > 0) {
    doc.moveDown(0.3);
    doc.font(FONTS.body.font).fillColor("#16a34a")
      .text("All punchlist items resolved. Project eligible for final completion.");
  }

  // Disclaimer
  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This report does not replace licensed professional construction management. All construction decisions must be reviewed and approved by qualified professionals.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-015 Loan Comparison ---

function renderLoanComparison(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("CONSTRUCTION LOAN COMPARISON", { align: "center" });
  doc.moveDown(0.3);

  if (data.projectName) {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.textLight)
      .text(data.projectName, { align: "center" });
  }
  if (data.projectCost) {
    doc.text("Project Cost: " + fmtCurrency(data.projectCost), { align: "center" });
  }
  doc.moveDown(1);

  // Term sheet comparison table
  const sheets = data.termSheets || [];
  if (sheets.length > 0) {
    const fields = ["Loan Amount", "LTC", "Rate", "Term", "Extensions", "Origination", "Interest Reserve", "Recourse", "Conversion"];
    const rows = fields.map((field) => {
      const row = [field];
      for (const ts of sheets) {
        switch (field) {
          case "Loan Amount": row.push(fmtCurrency(ts.loanAmount || ts.loan_amount || 0)); break;
          case "LTC": row.push((ts.ltcRatio || ts.ltc_ratio || 0) + "%"); break;
          case "Rate": row.push(ts.rateDescription || ts.rate_description || (ts.rateOrSpread || ts.rate_or_spread || "") + (ts.rateType === "floating" ? " (floating)" : " (fixed)")); break;
          case "Term": row.push((ts.termMonths || ts.term_months || "") + " months"); break;
          case "Extensions": row.push(ts.extensionDescription || ts.extensions || ""); break;
          case "Origination": row.push((ts.originationFeeBps || ts.origination_fee_bps || 0) + "bps"); break;
          case "Interest Reserve": row.push(fmtCurrency(ts.interestReserve || ts.interest_reserve || 0)); break;
          case "Recourse": row.push(ts.recourse || ""); break;
          case "Conversion": row.push(ts.conversionDescription || ts.conversion || "None"); break;
          default: row.push(""); break;
        }
      }
      return row;
    });

    const headers = ["Term", ...sheets.map(ts => ts.lender || ts.name || "Lender")];
    renderSimpleTable(doc, { headers, rows }, brand);
  }

  // Cost analysis
  if (sheets.some(ts => ts.totalCost || ts.total_cost)) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Total Cost of Capital");
    doc.moveDown(0.5);

    const costRows = sheets.map(ts => [
      ts.lender || ts.name || "",
      fmtCurrency(ts.originationCost || ts.origination_cost || 0),
      fmtCurrency(ts.projectedInterest || ts.projected_interest || 0),
      fmtCurrency(ts.extensionCost || ts.extension_cost || 0),
      fmtCurrency(ts.totalCost || ts.total_cost || 0),
      (ts.effectiveRate || ts.effective_rate || 0) + "%",
    ]);
    renderSimpleTable(doc, { headers: ["Lender", "Origination", "Projected Interest", "Extension Cost", "Total Cost", "Effective Rate"], rows: costRows }, brand);
  }

  // Recommendation
  if (data.recommendation) {
    doc.moveDown(1);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Recommendation");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.recommendation, { lineGap: 3 });
  }

  // Pros/Cons
  for (const ts of sheets) {
    if (ts.pros || ts.cons) {
      doc.moveDown(0.5);
      doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand))
        .text(ts.lender || ts.name || "Lender");
      doc.moveDown(0.2);
      doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
      if (ts.pros && Array.isArray(ts.pros)) {
        for (const p of ts.pros) doc.text("  + " + p, { lineGap: 2 });
      }
      if (ts.cons && Array.isArray(ts.cons)) {
        for (const c of ts.cons) doc.text("  - " + c, { lineGap: 2 });
      }
    }
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for informational purposes only and does not constitute lending advice. Consult your lender and legal counsel for binding decisions.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-015 Utilization Dashboard ---

function renderUtilizationDashboard(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("LOAN UTILIZATION DASHBOARD", { align: "center" });
  doc.moveDown(0.5);

  if (data.projectName) {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.textLight)
      .text(data.projectName, { align: "center" });
  }
  doc.moveDown(1);

  // Key metrics
  const commitment = data.loanCommitment || 0;
  const drawn = data.drawnToDate || 0;
  const utilPct = commitment > 0 ? (drawn / commitment * 100).toFixed(1) : "0.0";
  const remaining = commitment - drawn;
  const reserveBalance = data.interestReserveBalance || 0;
  const constructionPct = data.constructionPercent || 0;

  const metricRows = [
    ["Loan Commitment", fmtCurrency(commitment)],
    ["Drawn to Date", fmtCurrency(drawn)],
    ["Utilization", utilPct + "%"],
    ["Remaining Commitment", fmtCurrency(remaining)],
    ["Construction % Complete", constructionPct + "%"],
    ["Interest Reserve Remaining", fmtCurrency(reserveBalance)],
  ];

  if (data.maturityDate) {
    metricRows.push(["Maturity Date", data.maturityDate]);
  }

  renderSimpleTable(doc, { headers: ["Metric", "Value"], rows: metricRows }, brand);
  doc.moveDown(1);

  // Conversion conditions
  if (data.conversionConditions && Array.isArray(data.conversionConditions) && data.conversionConditions.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Conversion Status");
    doc.moveDown(0.3);

    const condRows = data.conversionConditions.map(c => [c.condition || c.name || "", c.status || "Not Started"]);
    renderSimpleTable(doc, { headers: ["Condition", "Status"], rows: condRows }, brand);

    const met = data.conversionConditions.filter(c => c.status === "Complete" || c.status === "complete" || c.status === "Waived").length;
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
      .text(met + " of " + data.conversionConditions.length + " conditions met");
    doc.moveDown(0.5);
  }

  // Flags
  if (data.flags && Array.isArray(data.flags) && data.flags.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Flags & Alerts");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const f of data.flags) {
      const severity = (f.severity || "info").toUpperCase();
      doc.text("[" + severity + "] " + (f.message || f.description || ""), { lineGap: 3 });
    }
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for informational purposes only and does not constitute lending advice. Consult your lender and legal counsel for binding decisions.", { align: "center" });
}

// --- W-015 Conversion Checklist ---

function renderConversionChecklist(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("CONSTRUCTION-TO-PERMANENT CONVERSION CHECKLIST", { align: "center" });
  doc.moveDown(0.5);

  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.lenderName ? ["Lender", data.lenderName] : null,
    data.maturityDate ? ["Loan Maturity", data.maturityDate] : null,
    data.conversionDeadline ? ["Conversion Deadline", data.conversionDeadline] : null,
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Conditions table
  const conditions = data.conditions || [];
  const rows = conditions.map(c => [
    c.condition || c.name || "",
    c.status || "Not Started",
    c.responsibleParty || c.responsible || "",
    c.deadline || c.dueDate || "",
    c.documentation || c.docs || "",
    c.notes || "",
  ]);

  renderSimpleTable(doc, {
    headers: ["Condition", "Status", "Responsible", "Deadline", "Documentation", "Notes"],
    rows,
  }, brand);

  // Summary
  const total = conditions.length;
  const complete = conditions.filter(c => c.status === "Complete" || c.status === "complete" || c.status === "Waived").length;
  const inProgress = conditions.filter(c => c.status === "In Progress" || c.status === "in_progress").length;
  const notStarted = total - complete - inProgress;

  doc.moveDown(1);
  doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
    .text(complete + " of " + total + " conditions met  |  " + inProgress + " in progress  |  " + notStarted + " not started");

  if (complete === total && total > 0) {
    doc.moveDown(0.3);
    doc.font(FONTS.body.font).fillColor("#16a34a")
      .text("All conversion conditions met. Loan eligible for permanent conversion.");
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for informational purposes only and does not constitute lending advice. Consult your lender and legal counsel for binding decisions.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-016 Capital Stack Summary ---

function renderStackSummary(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("CAPITAL STACK SUMMARY", { align: "center" });
  doc.moveDown(0.3);

  if (data.dealName) {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.textLight)
      .text(data.dealName, { align: "center" });
  }
  if (data.totalProjectCost) {
    doc.text("Total Project Cost: " + fmtCurrency(data.totalProjectCost), { align: "center" });
  }
  doc.moveDown(1);

  // Sources & Uses
  const layers = data.capitalLayers || [];
  const uses = data.uses || [];
  const totalSources = layers.reduce((s, l) => s + (l.amount || 0), 0);
  const totalUses = uses.reduce((s, u) => s + (u.amount || 0), 0);

  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Sources");
  doc.moveDown(0.3);

  const sourceRows = layers.map(l => {
    const pct = totalSources > 0 ? ((l.amount || 0) / totalSources * 100).toFixed(1) + "%" : "0%";
    return [l.type || l.source || "", fmtCurrency(l.amount || 0), pct, (l.costOrRate || 0) + "%"];
  });
  sourceRows.push(["TOTAL SOURCES", fmtCurrency(totalSources), "100%", ""]);
  renderSimpleTable(doc, { headers: ["Source", "Amount", "% of Stack", "Cost"], rows: sourceRows }, brand);
  doc.moveDown(0.5);

  if (uses.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Uses");
    doc.moveDown(0.3);

    const useRows = uses.map(u => {
      const pct = totalUses > 0 ? ((u.amount || 0) / totalUses * 100).toFixed(1) + "%" : "0%";
      return [u.category || u.name || "", fmtCurrency(u.amount || 0), pct];
    });
    useRows.push(["TOTAL USES", fmtCurrency(totalUses), "100%"]);
    renderSimpleTable(doc, { headers: ["Use", "Amount", "%"], rows: useRows }, brand);
  }

  // Gap
  const gap = totalSources - totalUses;
  if (gap !== 0 && totalUses > 0) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(gap > 0 ? "#d97706" : "#dc2626")
      .text("Sources / Uses Gap: " + fmtCurrency(gap));
  }
  doc.moveDown(0.5);

  // WACC
  if (data.wacc != null) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Blended Cost of Capital");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(COLORS.text)
      .text("WACC: " + data.wacc + "%");
    doc.moveDown(0.5);
  }

  // Return Metrics
  const rm = data.returnMetrics || {};
  if (rm.leveredIrr != null || rm.unleveredIrr != null) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Return Metrics");
    doc.moveDown(0.5);

    const metricRows = [
      rm.unleveredIrr != null ? ["Unlevered IRR", rm.unleveredIrr + "%"] : null,
      rm.leveredIrr != null ? ["Levered IRR", rm.leveredIrr + "%"] : null,
      rm.lpIrr != null ? ["LP IRR", rm.lpIrr + "%"] : null,
      rm.gpIrr != null ? ["GP IRR", rm.gpIrr + "%"] : null,
      rm.equityMultiple != null ? ["Equity Multiple", rm.equityMultiple + "x"] : null,
      rm.lpEquityMultiple != null ? ["LP Equity Multiple", rm.lpEquityMultiple + "x"] : null,
      rm.paybackPeriod != null ? ["Payback Period", rm.paybackPeriod + " years"] : null,
      rm.peakEquity != null ? ["Peak Equity", fmtCurrency(rm.peakEquity)] : null,
    ].filter(Boolean);

    renderSimpleTable(doc, { headers: ["Metric", "Value"], rows: metricRows }, brand);
  }

  // Scenario comparison
  const scenarios = data.scenarios || {};
  if (scenarios.base || scenarios.upside || scenarios.downside) {
    doc.moveDown(1);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Scenario Comparison");
    doc.moveDown(0.5);

    const scenNames = ["base", "upside", "downside"];
    const scenLabels = { base: "Base Case", upside: "Upside", downside: "Downside" };
    const scenMetrics = ["leveredIrr", "lpIrr", "equityMultiple", "cashOnCashY1"];
    const scenMetricLabels = { leveredIrr: "Levered IRR", lpIrr: "LP IRR", equityMultiple: "Equity Multiple", cashOnCashY1: "Year 1 CoC" };

    const scenRows = scenMetrics.map(m => {
      const row = [scenMetricLabels[m] || m];
      for (const s of scenNames) {
        const sc = scenarios[s] || {};
        const val = sc[m];
        if (m.includes("Irr") || m.includes("irr") || m.includes("CoC") || m.includes("cashOnCash")) {
          row.push(val != null ? val + "%" : "N/A");
        } else if (m.includes("Multiple") || m.includes("multiple")) {
          row.push(val != null ? val + "x" : "N/A");
        } else {
          row.push(val != null ? String(val) : "N/A");
        }
      }
      return row;
    });

    renderSimpleTable(doc, {
      headers: ["Metric", ...scenNames.map(s => scenLabels[s])],
      rows: scenRows,
    }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for informational purposes only and does not constitute investment advice or a securities offering. All projections are estimates. Consult qualified advisors.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// --- W-016 Scenario Comparison Report ---

function renderScenarioComparison(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("SCENARIO COMPARISON", { align: "center" });
  doc.moveDown(0.3);

  if (data.dealName) {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.textLight)
      .text(data.dealName, { align: "center" });
  }
  doc.moveDown(1);

  const scenarios = data.scenarios || {};
  const scenNames = Object.keys(scenarios);
  if (scenNames.length === 0) {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("No scenarios provided.");
    return;
  }

  // Assumptions comparison
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Key Assumptions");
  doc.moveDown(0.3);

  const assumptionFields = ["rentGrowth", "vacancy", "exitCapRate", "costOverrun", "holdPeriod"];
  const assumptionLabels = { rentGrowth: "Rent Growth", vacancy: "Vacancy", exitCapRate: "Exit Cap Rate", costOverrun: "Cost Overrun", holdPeriod: "Hold Period" };

  const assumptionRows = assumptionFields.map(f => {
    const row = [assumptionLabels[f] || f];
    for (const s of scenNames) {
      const sc = scenarios[s] || {};
      const assumptions = sc.assumptions || sc;
      const val = assumptions[f];
      if (f === "holdPeriod") {
        row.push(val != null ? val + " yrs" : "N/A");
      } else {
        row.push(val != null ? val + "%" : "N/A");
      }
    }
    return row;
  }).filter(r => r.some((v, i) => i > 0 && v !== "N/A"));

  if (assumptionRows.length > 0) {
    const labels = scenNames.map(s => {
      const label = s.charAt(0).toUpperCase() + s.slice(1);
      return label.replace(/([A-Z])/g, " $1").trim();
    });
    renderSimpleTable(doc, { headers: ["Assumption", ...labels], rows: assumptionRows }, brand);
    doc.moveDown(0.5);
  }

  // Return Metrics comparison
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Return Metrics");
  doc.moveDown(0.3);

  const metricFields = [
    { key: "unleveredIrr", label: "Unlevered IRR", suffix: "%" },
    { key: "leveredIrr", label: "Levered IRR", suffix: "%" },
    { key: "lpIrr", label: "LP IRR", suffix: "%" },
    { key: "gpIrr", label: "GP IRR", suffix: "%" },
    { key: "equityMultiple", label: "Equity Multiple", suffix: "x" },
    { key: "lpEquityMultiple", label: "LP Equity Multiple", suffix: "x" },
    { key: "cashOnCashY1", label: "Year 1 Cash-on-Cash", suffix: "%" },
    { key: "paybackPeriod", label: "Payback Period", suffix: " yrs" },
    { key: "peakEquity", label: "Peak Equity", suffix: "", isCurrency: true },
    { key: "dscr", label: "Min DSCR", suffix: "x" },
    { key: "noi", label: "Stabilized NOI", suffix: "", isCurrency: true },
  ];

  const metricRows = metricFields.map(mf => {
    const row = [mf.label];
    let hasValue = false;
    for (const s of scenNames) {
      const sc = scenarios[s] || {};
      const metrics = sc.returnMetrics || sc.metrics || sc;
      const val = metrics[mf.key];
      if (val != null) hasValue = true;
      if (val == null) {
        row.push("N/A");
      } else if (mf.isCurrency) {
        row.push(fmtCurrency(val));
      } else {
        row.push(val + mf.suffix);
      }
    }
    return hasValue ? row : null;
  }).filter(Boolean);

  const scenLabels = scenNames.map(s => {
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    return label.replace(/([A-Z])/g, " $1").trim();
  });
  renderSimpleTable(doc, { headers: ["Metric", ...scenLabels], rows: metricRows }, brand);

  // Recommendation
  if (data.recommendation) {
    doc.moveDown(1);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Recommendation");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.recommendation, { lineGap: 3 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for informational purposes only and does not constitute investment advice or a securities offering. All projections are estimates. Consult qualified advisors.", { align: "center" });

  if (data.notes) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text("Notes: " + data.notes, { lineGap: 3 });
  }
}

// ── W-002 CRE Analyst PDF renderers ──

function renderIcMemo(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "IC Memo", brand, logoBuffer);
  doc.moveDown(0.5);

  // Deal Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Deal Summary");
  doc.moveDown(0.3);
  const ds = data.dealSummary || {};
  const summaryRows = [
    ["Deal Type", ds.dealType || data.dealType || "—"],
    ["Asset", ds.asset || "—"],
    ["Location", ds.location || "—"],
    ["Ask Price", ds.askPrice ? `$${Number(ds.askPrice).toLocaleString()}` : "—"],
    ["Proposed Terms", ds.proposedTerms || "—"],
    ["Timeline", ds.timeline || "—"],
  ];
  renderSimpleTable(doc, { headers: ["Field", "Value"], rows: summaryRows }, brand);

  // Investment Thesis
  if (data.thesis || data.keyAssumptions) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Investment Thesis");
    doc.moveDown(0.3);
    if (data.thesis) doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.thesis, { lineGap: 3 });
    if (data.keyAssumptions) {
      doc.moveDown(0.3);
      doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight).text("Key Assumptions:");
      const assumptions = Array.isArray(data.keyAssumptions) ? data.keyAssumptions : [data.keyAssumptions];
      assumptions.forEach(a => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${a}`));
    }
  }

  // Key Metrics
  const m = data.metrics || {};
  doc.moveDown(0.8);
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Key Metrics");
  doc.moveDown(0.3);
  const metricRows = Object.entries(m).filter(([, v]) => v != null).map(([k, v]) => {
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    return [label, String(v)];
  });
  if (metricRows.length > 0) renderSimpleTable(doc, { headers: ["Metric", "Value"], rows: metricRows }, brand);

  // Risks & Mitigations
  if (data.risks || data.mitigations) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Risks & Mitigations");
    doc.moveDown(0.3);
    const risks = Array.isArray(data.risks) ? data.risks : [];
    const mitigations = Array.isArray(data.mitigations) ? data.mitigations : [];
    const riskRows = risks.map((r, i) => [r, mitigations[i] || "—"]);
    if (riskRows.length > 0) renderSimpleTable(doc, { headers: ["Risk", "Mitigation"], rows: riskRows }, brand);
  }

  // Recommendation
  if (data.recommendation) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Recommendation");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.recommendation, { lineGap: 3 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for informational purposes only and does not constitute investment advice. All metrics are evidence-cited per the Evidence-First SOP. Consult qualified advisors.", { align: "center" });
}

function renderDealRiskSummary(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Risk Summary", brand, logoBuffer);
  doc.moveDown(0.5);

  // Overall Rating
  const rating = data.overallRiskRating || "Not Rated";
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Overall Risk Rating");
  doc.moveDown(0.3);
  const ratingColor = rating === "low" ? "228B22" : rating === "medium" ? "DAA520" : rating === "high" ? "CC0000" : COLORS.text;
  doc.fontSize(18).font(FONTS.subheading.font).fillColor(ratingColor).text(rating.toUpperCase());
  doc.moveDown(0.5);

  // Risk Drivers
  if (data.riskDrivers && data.riskDrivers.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Risk Drivers");
    doc.moveDown(0.3);
    data.riskDrivers.forEach(d => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${d}`));
    doc.moveDown(0.5);
  }

  // Missing Documents
  if (data.missingDocuments && data.missingDocuments.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Missing Documents");
    doc.moveDown(0.3);
    data.missingDocuments.forEach(d => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${d}`));
    doc.moveDown(0.5);
  }

  // Gating Failures
  if (data.gatingFailures && data.gatingFailures.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor("CC0000").text("Gating Failures");
    doc.moveDown(0.3);
    data.gatingFailures.forEach(f => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${f}`));
    doc.moveDown(0.5);
  }

  // Approval Conditions
  if (data.approvalConditions && data.approvalConditions.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Approval Conditions");
    doc.moveDown(0.3);
    data.approvalConditions.forEach(c => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${c}`));
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Risk assessment generated by a TitleApp Digital Worker. For informational purposes only.", { align: "center" });
}

// ── W-019 Investor Relations PDF renderers ──

function renderComplianceChecklist(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Compliance Checklist", brand, logoBuffer);
  doc.moveDown(0.5);

  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Offering Details");
  doc.moveDown(0.3);
  const infoRows = [
    ["Regulation", data.regulation || "—"],
    ["Deal Name", data.dealName || "—"],
    ["Total Raised", data.totalRaised ? `$${Number(data.totalRaised).toLocaleString()}` : "—"],
    ["Investor Count", data.investorCount != null ? String(data.investorCount) : "—"],
    ["Non-Accredited", data.nonAccreditedCount != null ? String(data.nonAccreditedCount) : "—"],
  ];
  renderSimpleTable(doc, { headers: ["Item", "Value"], rows: infoRows }, brand);

  // Checklist Items
  const items = data.checklistItems || data.documents || [];
  if (items.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Compliance Checklist");
    doc.moveDown(0.3);
    const checkRows = items.map(item => {
      if (typeof item === "string") return [item, "Pending"];
      return [item.name || item.label || "—", item.status || "Pending"];
    });
    renderSimpleTable(doc, { headers: ["Requirement", "Status"], rows: checkRows }, brand);
  }

  // Filing Deadlines
  if (data.filingDeadlines && data.filingDeadlines.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Filing Deadlines");
    doc.moveDown(0.3);
    const deadlineRows = data.filingDeadlines.map(d => [d.filing || "—", d.deadline || "—", d.status || "Pending"]);
    renderSimpleTable(doc, { headers: ["Filing", "Deadline", "Status"], rows: deadlineRows }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This checklist is for organizational purposes only. Consult qualified securities counsel for compliance guidance.", { align: "center" });
}

function renderInvestorSummary(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Investor Summary", brand, logoBuffer);
  doc.moveDown(0.5);

  // Totals
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Summary");
  doc.moveDown(0.3);
  const totals = [
    ["Total Commitments", data.totalCommitments ? `$${Number(data.totalCommitments).toLocaleString()}` : "—"],
    ["Total Called", data.totalCalled ? `$${Number(data.totalCalled).toLocaleString()}` : "—"],
    ["Total Distributed", data.totalDistributed ? `$${Number(data.totalDistributed).toLocaleString()}` : "—"],
  ];
  renderSimpleTable(doc, { headers: ["Metric", "Amount"], rows: totals }, brand);

  // Investor Roster
  const investors = data.investors || [];
  if (investors.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Investor Roster");
    doc.moveDown(0.3);
    const investorRows = investors.map(inv => [
      inv.name || "—",
      inv.commitment ? `$${Number(inv.commitment).toLocaleString()}` : "—",
      inv.accreditation || "—",
      inv.called ? `$${Number(inv.called).toLocaleString()}` : "—",
      inv.distributed ? `$${Number(inv.distributed).toLocaleString()}` : "—",
    ]);
    renderSimpleTable(doc, { headers: ["Investor", "Commitment", "Accreditation", "Called", "Distributed"], rows: investorRows }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Confidential investor information. Not for distribution without authorization.", { align: "center" });
}

function renderAccreditationReport(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Accreditation Report", brand, logoBuffer);
  doc.moveDown(0.5);

  const investors = data.investors || [];
  if (investors.length > 0) {
    const rows = investors.map(inv => [
      inv.name || "—",
      inv.method || "—",
      inv.status || "—",
      inv.verifiedDate || "—",
      inv.expirationDate || "—",
    ]);
    renderSimpleTable(doc, { headers: ["Investor", "Method", "Status", "Verified", "Expires"], rows }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Accreditation verification records. Consult securities counsel for compliance requirements.", { align: "center" });
}

function renderFundOverview(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Fund Overview", brand, logoBuffer);
  doc.moveDown(0.5);

  const rows = [
    ["Fund Name", data.fundName || "—"],
    ["Strategy", data.strategy || "—"],
    ["Fund Size", data.fundSize ? `$${Number(data.fundSize).toLocaleString()}` : "—"],
    ["Target Raise", data.targetRaise ? `$${Number(data.targetRaise).toLocaleString()}` : "—"],
    ["GP Commitment", data.gpCommit ? `${(Number(data.gpCommit) * 100).toFixed(1)}%` : "—"],
    ["Management Fee", data.managementFee ? `${(Number(data.managementFee) * 100).toFixed(1)}%` : "—"],
    ["Carry", data.carry ? `${(Number(data.carry) * 100).toFixed(0)}%` : "—"],
    ["Hurdle Rate", data.hurdleRate ? `${(Number(data.hurdleRate) * 100).toFixed(1)}%` : "—"],
    ["Fund Life", data.fundLife ? `${data.fundLife} years` : "—"],
    ["Investment Period", data.investmentPeriod ? `${data.investmentPeriod} years` : "—"],
  ];
  renderSimpleTable(doc, { headers: ["Term", "Value"], rows }, brand);

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This is a summary for informational purposes only. Refer to the Limited Partnership Agreement for definitive terms.", { align: "center" });
}

function renderLpTerms(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "LP Terms Summary", brand, logoBuffer);
  doc.moveDown(0.5);

  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Economics");
  doc.moveDown(0.3);
  const econRows = [
    ["Preferred Return", data.prefReturn ? `${(Number(data.prefReturn) * 100).toFixed(1)}%` : "—"],
    ["Carry / Promote", data.carry ? `${(Number(data.carry) * 100).toFixed(0)}%` : "—"],
    ["Hurdle Rate", data.hurdleRate ? `${(Number(data.hurdleRate) * 100).toFixed(1)}%` : "—"],
    ["GP Commitment", data.gpCommit ? `${(Number(data.gpCommit) * 100).toFixed(1)}%` : "—"],
    ["Management Fee", data.managementFee ? `${(Number(data.managementFee) * 100).toFixed(1)}%` : "—"],
    ["Clawback", data.clawback ? "Yes" : "No"],
  ];
  renderSimpleTable(doc, { headers: ["Term", "Value"], rows: econRows }, brand);

  doc.moveDown(0.8);
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Governance");
  doc.moveDown(0.3);
  const govRows = [
    ["Key Person", data.keyPerson || "—"],
    ["Advisory Committee", data.advisoryCommittee || "—"],
    ["Reporting Frequency", data.reportingFrequency || "—"],
    ["Transfer Restrictions", data.transferRestrictions || "—"],
  ];
  renderSimpleTable(doc, { headers: ["Provision", "Detail"], rows: govRows }, brand);

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Summary only. Refer to the Limited Partnership Agreement for complete terms.", { align: "center" });
}

function renderSyndicationDealSummary(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Deal Summary", brand, logoBuffer);
  doc.moveDown(0.5);

  const rows = [
    ["Property", data.propertyName || "—"],
    ["Purchase Price", data.purchasePrice ? `$${Number(data.purchasePrice).toLocaleString()}` : "—"],
    ["NOI", data.noi ? `$${Number(data.noi).toLocaleString()}` : "—"],
    ["Cap Rate", data.capRate ? `${(Number(data.capRate) * 100).toFixed(2)}%` : "—"],
    ["LTV", data.ltv ? `${(Number(data.ltv) * 100).toFixed(1)}%` : "—"],
    ["DSCR", data.dscr ? `${Number(data.dscr).toFixed(2)}x` : "—"],
    ["Target Raise", data.targetRaise ? `$${Number(data.targetRaise).toLocaleString()}` : "—"],
    ["Hold Period", data.holdPeriod ? `${data.holdPeriod} years` : "—"],
    ["Target IRR", data.targetIrr ? `${(Number(data.targetIrr) * 100).toFixed(1)}%` : "—"],
    ["Equity Multiple", data.equityMultiple ? `${Number(data.equityMultiple).toFixed(2)}x` : "—"],
  ];
  renderSimpleTable(doc, { headers: ["Metric", "Value"], rows }, brand);

  if (data.risks && data.risks.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Key Risks");
    doc.moveDown(0.3);
    data.risks.forEach(r => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${r}`));
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This is not an offer to sell or solicitation to buy securities. All projections are estimates.", { align: "center" });
}

function renderSyndicationRiskAssessment(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Risk Assessment", brand, logoBuffer);
  doc.moveDown(0.5);

  if (data.overallRating) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Overall Risk Rating");
    doc.moveDown(0.3);
    doc.fontSize(16).font(FONTS.subheading.font).fillColor(COLORS.text).text(data.overallRating.toUpperCase());
    doc.moveDown(0.5);
  }

  const categories = [
    { label: "Market Risks", key: "marketRisks" },
    { label: "Operational Risks", key: "operationalRisks" },
    { label: "Financial Risks", key: "financialRisks" },
    { label: "Structural Risks", key: "structuralRisks" },
  ];
  categories.forEach(cat => {
    const items = data[cat.key] || [];
    if (items.length > 0) {
      doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text(cat.label);
      doc.moveDown(0.3);
      items.forEach(r => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${r}`));
      doc.moveDown(0.5);
    }
  });

  if (data.mitigants && data.mitigants.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Mitigants");
    doc.moveDown(0.3);
    data.mitigants.forEach(m => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${m}`));
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Risk assessment for informational purposes only. Not investment advice.", { align: "center" });
}

function renderOfferingMemo(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Offering Memorandum", brand, logoBuffer);
  doc.moveDown(0.5);

  // Executive Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Executive Summary");
  doc.moveDown(0.3);
  const summaryRows = [
    ["Property", data.propertyName || "—"],
    ["Purchase Price", data.purchasePrice ? `$${Number(data.purchasePrice).toLocaleString()}` : "—"],
    ["NOI", data.noi ? `$${Number(data.noi).toLocaleString()}` : "—"],
    ["Cap Rate", data.capRate ? `${(Number(data.capRate) * 100).toFixed(2)}%` : "—"],
    ["Target IRR", data.targetIrr ? `${(Number(data.targetIrr) * 100).toFixed(1)}%` : "—"],
    ["Equity Multiple", data.equityMultiple ? `${Number(data.equityMultiple).toFixed(2)}x` : "—"],
    ["Hold Period", data.holdPeriod ? `${data.holdPeriod} years` : "—"],
  ];
  renderSimpleTable(doc, { headers: ["Metric", "Value"], rows: summaryRows }, brand);

  // Capital Structure
  if (data.capitalStructure) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Capital Structure");
    doc.moveDown(0.3);
    if (typeof data.capitalStructure === "string") {
      doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.capitalStructure, { lineGap: 3 });
    } else {
      const capRows = Object.entries(data.capitalStructure).map(([k, v]) => [k, typeof v === "number" ? `$${v.toLocaleString()}` : String(v)]);
      renderSimpleTable(doc, { headers: ["Source", "Amount"], rows: capRows }, brand);
    }
  }

  // Risk Factors
  const riskFactors = data.riskFactors || [];
  if (riskFactors.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Risk Factors");
    doc.moveDown(0.3);
    riskFactors.forEach(r => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${r}`));
  }

  // Legal Disclaimers
  doc.moveDown(1.5);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("IMPORTANT: This memorandum is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. Securities may only be offered or sold pursuant to applicable exemptions from registration under federal and state securities laws. Past performance does not guarantee future results. All projections are estimates based on current assumptions and are subject to change.", { align: "center", lineGap: 2 });
}

function renderQuarterlyReport(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Quarterly Report", brand, logoBuffer);
  doc.moveDown(0.5);

  // Quarter Info
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.textLight).text(`Quarter: ${data.quarter || "—"}  |  Fund: ${data.fundName || "—"}`);
  doc.moveDown(0.5);

  // Portfolio Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Portfolio Summary");
  doc.moveDown(0.3);
  const perf = data.performance || {};
  const perfRows = Object.entries(perf).map(([k, v]) => {
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    return [label, typeof v === "number" ? (v < 1 && v > -1 ? `${(v * 100).toFixed(1)}%` : `$${v.toLocaleString()}`) : String(v)];
  });
  if (perfRows.length > 0) renderSimpleTable(doc, { headers: ["Metric", "Value"], rows: perfRows }, brand);

  // Deal Updates
  const deals = data.deals || [];
  if (deals.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Deal Updates");
    doc.moveDown(0.3);
    const dealRows = deals.map(d => [d.name || "—", d.status || "—", d.notes || "—"]);
    renderSimpleTable(doc, { headers: ["Deal", "Status", "Notes"], rows: dealRows }, brand);
  }

  // Distributions
  const dists = data.distributions || [];
  if (dists.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Distributions");
    doc.moveDown(0.3);
    const distRows = dists.map(d => [d.date || "—", d.deal || "—", d.amount ? `$${Number(d.amount).toLocaleString()}` : "—", d.type || "—"]);
    renderSimpleTable(doc, { headers: ["Date", "Deal", "Amount", "Type"], rows: distRows }, brand);
  }

  // Outlook
  if (data.outlook) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Outlook");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.outlook, { lineGap: 3 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This report contains forward-looking statements based on current expectations. Actual results may differ materially. Not an offer to sell securities.", { align: "center" });
}

function renderCapitalCall(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Capital Call Notice", brand, logoBuffer);
  doc.moveDown(0.5);

  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Call Details");
  doc.moveDown(0.3);
  const callRows = [
    ["Fund / Deal", data.fundName || data.dealName || "—"],
    ["Purpose", data.purpose || "—"],
    ["Total Call Amount", data.callAmount ? `$${Number(data.callAmount).toLocaleString()}` : "—"],
    ["Due Date", data.dueDate || "—"],
  ];
  renderSimpleTable(doc, { headers: ["Item", "Detail"], rows: callRows }, brand);

  // Investor Allocations
  const investors = data.investors || [];
  if (investors.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Investor Allocations");
    doc.moveDown(0.3);
    const allocRows = investors.map(inv => [
      inv.name || "—",
      inv.commitment ? `$${Number(inv.commitment).toLocaleString()}` : "—",
      inv.share ? `${(Number(inv.share) * 100).toFixed(2)}%` : "—",
      inv.callAmount ? `$${Number(inv.callAmount).toLocaleString()}` : "—",
    ]);
    renderSimpleTable(doc, { headers: ["Investor", "Commitment", "Share", "Amount Due"], rows: allocRows }, brand);
  }

  // Wire Instructions
  if (data.wireInstructions) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Wire Instructions");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.wireInstructions, { lineGap: 3 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This capital call is made pursuant to the terms of the governing documents. Failure to fund may result in dilution or default penalties.", { align: "center" });
}

// ── W-048 Chief of Staff PDF renderers ──

function renderPipelineStatus(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Pipeline Status", brand, logoBuffer);
  doc.moveDown(0.5);

  // Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Summary");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`Workspace: ${data.workspaceName || "—"}`);
  doc.moveDown(0.3);

  // Active Pipelines
  const pipelines = data.pipelines || [];
  if (pipelines.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Active Pipelines");
    doc.moveDown(0.3);
    const pipeRows = pipelines.map(p => [p.name || "—", p.status || "—", p.currentStep || "—", p.progress || "—"]);
    renderSimpleTable(doc, { headers: ["Pipeline", "Status", "Current Step", "Progress"], rows: pipeRows }, brand);
    doc.moveDown(0.5);
  }

  // Blocked Items
  const blocked = data.blockedItems || [];
  if (blocked.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor("CC0000").text("Blocked Items");
    doc.moveDown(0.3);
    const blockRows = blocked.map(b => [b.item || "—", b.reason || "—", b.worker || "—"]);
    renderSimpleTable(doc, { headers: ["Item", "Reason", "Worker"], rows: blockRows }, brand);
    doc.moveDown(0.5);
  }

  // Deadlines
  const deadlines = data.deadlines || [];
  if (deadlines.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Upcoming Deadlines");
    doc.moveDown(0.3);
    const dlRows = deadlines.map(d => [d.item || "—", d.deadline || "—", d.owner || "—"]);
    renderSimpleTable(doc, { headers: ["Item", "Deadline", "Owner"], rows: dlRows }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Generated by Alex — Chief of Staff. AI-assisted coordination — human review recommended.", { align: "center" });
}

function renderWeeklyDigest(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Weekly Digest", brand, logoBuffer);
  doc.moveDown(0.5);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.textLight).text(`Workspace: ${data.workspaceName || "—"}  |  Week of: ${data.weekOf || "—"}`);
  doc.moveDown(0.5);

  // Highlights
  const highlights = data.highlights || [];
  if (highlights.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Highlights");
    doc.moveDown(0.3);
    highlights.forEach(h => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${h}`));
    doc.moveDown(0.5);
  }

  // Worker Activity
  const activity = data.workerActivity || [];
  if (activity.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Worker Activity");
    doc.moveDown(0.3);
    const actRows = activity.map(a => [a.worker || "—", String(a.actions || 0), String(a.documents || 0)]);
    renderSimpleTable(doc, { headers: ["Worker", "Actions", "Documents"], rows: actRows }, brand);
    doc.moveDown(0.5);
  }

  // Decisions Pending
  const decisions = data.decisionsPending || [];
  if (decisions.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Decisions Pending");
    doc.moveDown(0.3);
    decisions.forEach(d => doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(`  - ${typeof d === "string" ? d : d.description || "—"}`));
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Generated by Alex — Chief of Staff. AI-assisted summary — human review recommended.", { align: "center" });
}

function renderHandoffMemo(doc, data, brand, logoBuffer) {
  addHeader(doc, data.title || "Worker Handoff Memo", brand, logoBuffer);
  doc.moveDown(0.5);

  const infoRows = [
    ["Source Worker", data.sourceWorker || "—"],
    ["Target Worker", data.targetWorker || "—"],
    ["Deal / Project", data.dealName || "—"],
    ["Approval Status", data.approvalStatus || "Pending"],
  ];
  renderSimpleTable(doc, { headers: ["Field", "Value"], rows: infoRows }, brand);

  // Context
  if (data.context) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Context");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.context, { lineGap: 3 });
  }

  // Data Passed
  if (data.dataPassed) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Data Passed");
    doc.moveDown(0.3);
    if (typeof data.dataPassed === "string") {
      doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.dataPassed, { lineGap: 3 });
    } else {
      const dpRows = Object.entries(data.dataPassed).map(([k, v]) => [k, String(v)]);
      renderSimpleTable(doc, { headers: ["Key", "Value"], rows: dpRows }, brand);
    }
  }

  // Expected Output
  if (data.expectedOutput) {
    doc.moveDown(0.8);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Expected Output");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text).text(data.expectedOutput, { lineGap: 3 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Generated by Alex — Chief of Staff. This handoff requires user approval before execution.", { align: "center" });
}

// ── W-022 Bid & Procurement PDF renderers ──

function renderBidPackage(doc, data, brand, logoBuffer) {
  // Cover page
  addHeader(doc, brand, logoBuffer);
  doc.moveDown(3);
  doc.fontSize(26)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text(data.title || "Bid Package", { align: "center" });

  if (data.projectName) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.subheading.size)
      .font("Helvetica")
      .fillColor(secondaryColor(brand))
      .text(data.projectName, { align: "center" });
  }

  doc.moveDown(1);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.division) doc.text(`CSI Division: ${data.division}`, { align: "center" });
  if (data.bidDueDate) doc.text(`Bid Due Date: ${data.bidDueDate}`, { align: "center" });
  doc.text(`Date: ${data.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });

  doc.moveDown(4);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text(brand.footerText || "Confidential — Generated by TitleApp.ai", { align: "center" });

  // Scope of Work
  doc.addPage();
  addHeader(doc, brand, logoBuffer);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Scope of Work");
  doc.moveDown(0.5);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.scopeDescription) {
    const scopeItems = Array.isArray(data.scopeDescription) ? data.scopeDescription : [data.scopeDescription];
    for (const item of scopeItems) {
      doc.text(typeof item === "string" ? item : item.description || "", { lineGap: 4 });
      doc.moveDown(0.3);
    }
  } else {
    doc.text("Scope of work to be defined by issuing party.", { lineGap: 4 });
  }

  // Schedule Requirements
  doc.moveDown(1);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Schedule Requirements");
  doc.moveDown(0.5);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.scheduleRequirements) {
    const schedItems = Array.isArray(data.scheduleRequirements) ? data.scheduleRequirements : [data.scheduleRequirements];
    for (const item of schedItems) {
      doc.text(typeof item === "string" ? item : item.requirement || "", { lineGap: 4 });
      doc.moveDown(0.3);
    }
  } else {
    doc.text("Schedule to be coordinated with General Contractor.", { lineGap: 4 });
  }

  // Bid Instructions
  doc.addPage();
  addHeader(doc, brand, logoBuffer);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Bid Instructions");
  doc.moveDown(0.5);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);

  const defaultInstructions = [
    "Submit sealed bid by the due date above.",
    "Include base bid, all alternates, and a list of exclusions.",
    "Provide preliminary schedule and manpower plan.",
    "Include proof of insurance and bonding capacity.",
    "Bids received after the deadline will not be considered.",
  ];
  const instructions = data.bidInstructions || defaultInstructions;
  for (let i = 0; i < instructions.length; i++) {
    const inst = typeof instructions[i] === "string" ? instructions[i] : instructions[i].text || "";
    doc.text(`${i + 1}. ${inst}`, { lineGap: 4 });
  }

  // Insurance & Bond Requirements
  doc.moveDown(1);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Insurance & Bond Requirements");
  doc.moveDown(0.5);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);

  const reqRows = [];
  if (data.insuranceRequirements) {
    const insReqs = Array.isArray(data.insuranceRequirements) ? data.insuranceRequirements : [data.insuranceRequirements];
    for (const r of insReqs) {
      reqRows.push([typeof r === "string" ? r : r.type || "", typeof r === "string" ? "" : r.limit || r.requirement || ""]);
    }
  }
  if (data.bondRequirements) {
    const bondReqs = Array.isArray(data.bondRequirements) ? data.bondRequirements : [data.bondRequirements];
    for (const r of bondReqs) {
      reqRows.push([typeof r === "string" ? r : r.type || "", typeof r === "string" ? "" : r.limit || r.requirement || ""]);
    }
  }

  if (reqRows.length > 0) {
    renderSimpleTable(doc, { headers: ["Requirement", "Minimum / Details"], rows: reqRows }, brand);
  } else {
    doc.text("Insurance and bonding requirements per project specifications.", { lineGap: 4 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This bid package is for procurement purposes only. All construction decisions must be reviewed by qualified professionals.", { align: "center" });
}

function renderAwardMemo(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("AWARD RECOMMENDATION MEMO", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Executive Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Executive Summary");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.division) doc.text(`Division: ${data.division}`);
  if (data.recommendedSub) doc.text(`Recommended Subcontractor: ${data.recommendedSub}`);
  if (data.bidAmount) doc.text(`Bid Amount: ${fmtCurrency(data.bidAmount)}`);
  doc.moveDown(0.5);

  // Rationale
  if (data.rationale) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Rationale");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text(data.rationale, { lineGap: 4 });
    doc.moveDown(0.5);
  }

  // Bid Comparison Summary
  if (data.bidders && Array.isArray(data.bidders)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Bid Comparison");
    doc.moveDown(0.3);
    const bidRows = data.bidders.map(b => [
      b.name || "",
      fmtCurrency(b.baseBid || b.amount || 0),
      b.schedule || "\u2014",
      b.qualified ? "Yes" : "No",
      b.notes || "",
    ]);
    renderSimpleTable(doc, { headers: ["Bidder", "Base Bid", "Schedule", "Qualified", "Notes"], rows: bidRows }, brand);
    doc.moveDown(0.5);
  }

  // Risk Factors
  if (data.riskFactors && Array.isArray(data.riskFactors)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Risk Factors");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const r of data.riskFactors) {
      doc.text(`  \u2022  ${typeof r === "string" ? r : r.description || ""}`, { lineGap: 3 });
    }
    doc.moveDown(0.5);
  }

  // Negotiation Points
  if (data.negotiationPoints && Array.isArray(data.negotiationPoints)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Negotiation Points");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const p of data.negotiationPoints) {
      doc.text(`  \u2022  ${typeof p === "string" ? p : p.point || ""}`, { lineGap: 3 });
    }
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This recommendation is for procurement review purposes. Final award decisions require authorized approval.", { align: "center" });
}

function renderSubQual(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("SUBCONTRACTOR QUALIFICATION REVIEW", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Sub Info
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Subcontractor Information");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.subName) doc.text(`Subcontractor: ${data.subName}`);
  if (data.division) doc.text(`Division: ${data.division}`);
  doc.moveDown(0.5);

  // License Verification
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("License Verification");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  doc.text(`License Number: ${data.licenseNumber || "Not provided"}`);
  if (data.licenseState) doc.text(`State: ${data.licenseState}`);
  if (data.licenseExpiration) doc.text(`Expiration: ${data.licenseExpiration}`);
  if (data.licenseStatus) doc.text(`Status: ${data.licenseStatus}`);
  doc.moveDown(0.5);

  // Insurance Review
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Insurance Review");
  doc.moveDown(0.3);
  if (data.insuranceLimits && Array.isArray(data.insuranceLimits)) {
    const insRows = data.insuranceLimits.map(i => [
      i.type || i.coverage || "",
      i.limit || i.amount || "",
      i.required || "",
      i.status || "Pending",
    ]);
    renderSimpleTable(doc, { headers: ["Coverage Type", "Current Limit", "Required", "Status"], rows: insRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Insurance documentation not yet provided.");
  }
  doc.moveDown(0.5);

  // Safety Record
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Safety Record");
  doc.moveDown(0.3);
  const safetyRows = [
    ["Experience Modification Rate (EMR)", String(data.emr || "Not provided")],
    ["TRIR", String(data.trir || "Not provided")],
    ["DART Rate", String(data.dartRate || "Not provided")],
    ["OSHA Citations (3 yr)", String(data.oshaCitations || "Not provided")],
  ];
  renderSimpleTable(doc, { headers: ["Metric", "Value"], rows: safetyRows }, brand);
  doc.moveDown(0.5);

  // Bonding Capacity
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Bonding Capacity");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  doc.text(`Bonding Capacity: ${data.bondingCapacity ? fmtCurrency(data.bondingCapacity) : "Not provided"}`);
  if (data.bondingSurety) doc.text(`Surety: ${data.bondingSurety}`);
  doc.moveDown(0.5);

  // References
  if (data.references && Array.isArray(data.references)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("References");
    doc.moveDown(0.3);
    const refRows = data.references.map(r => [
      r.project || r.name || "",
      r.contact || "",
      r.phone || r.email || "",
      r.rating || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Project", "Contact", "Phone/Email", "Rating"], rows: refRows }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This qualification review is for procurement evaluation purposes. Final qualification decisions require authorized approval.", { align: "center" });
}

// ── W-025 Insurance & Risk PDF renderers ──

function renderCoiDeficiency(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor("#dc2626")
    .text("CERTIFICATE OF INSURANCE DEFICIENCY NOTICE", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Notice header
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.subName) doc.text(`To: ${data.subName}`);
  doc.text(`Re: Insurance Deficiency Notice \u2014 ${data.projectName || "Project"}`);
  doc.moveDown(0.5);

  doc.text("This notice is to inform you that a review of your Certificate of Insurance has identified the following deficiencies:", { lineGap: 4 });
  doc.moveDown(0.5);

  // Deficiency table
  const deficiencies = data.deficiencies || [];
  if (Array.isArray(deficiencies) && deficiencies.length > 0) {
    const defRows = deficiencies.map(d => [
      d.coverageType || d.type || "",
      d.required || d.requiredLimit || "",
      d.current || d.currentLimit || "",
      d.gap || d.deficiency || "",
    ]);
    renderSimpleTable(doc, { headers: ["Coverage Type", "Required", "Current", "Gap / Issue"], rows: defRows }, brand);
  } else if (data.requiredCoverage || data.currentCoverage) {
    renderSimpleTable(doc, { headers: ["Item", "Details"], rows: [
      ["Required Coverage", data.requiredCoverage || "\u2014"],
      ["Current Coverage", data.currentCoverage || "\u2014"],
    ] }, brand);
  }

  doc.moveDown(1);

  // Required Actions
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Required Actions");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  const actions = data.requiredActions || [
    "Obtain updated Certificate of Insurance meeting project requirements.",
    "Ensure General Contractor and Owner are listed as Additional Insured.",
    "Provide Waiver of Subrogation endorsement.",
    "Submit corrected COI before the deadline below.",
  ];
  for (const a of actions) {
    doc.text(`  \u2022  ${typeof a === "string" ? a : a.action || ""}`, { lineGap: 3 });
  }
  doc.moveDown(0.5);

  // Deadline
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor("#dc2626").text("Deadline");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor("#dc2626")
    .text(`Compliance Deadline: ${data.deadline || "Immediately"}`);
  doc.moveDown(0.3);
  doc.font(FONTS.body.font).fillColor(COLORS.text)
    .text("Failure to provide compliant insurance documentation by the deadline may result in withholding of payment and/or removal from the project.", { lineGap: 3 });

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This notice is generated for construction insurance compliance. Human review and authorized signature required.", { align: "center" });
}

function renderLenderReport(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("LENDER INSURANCE COMPLIANCE REPORT", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Report header
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.lenderName) doc.text(`Prepared for: ${data.lenderName}`);
  doc.moveDown(0.5);

  // Project Coverage Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Project Coverage Summary");
  doc.moveDown(0.3);
  if (data.lenderRequirements && Array.isArray(data.lenderRequirements)) {
    const covRows = data.lenderRequirements.map(r => [
      r.type || r.coverage || "",
      r.required || "",
      r.current || r.inPlace || "",
      r.status || (r.compliant ? "Compliant" : "Non-Compliant"),
    ]);
    renderSimpleTable(doc, { headers: ["Coverage Type", "Required", "In Place", "Status"], rows: covRows }, brand);
  }
  doc.moveDown(0.5);

  // Sub Compliance Matrix
  if (data.complianceStatus && Array.isArray(data.complianceStatus)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Subcontractor Compliance");
    doc.moveDown(0.3);
    const subRows = data.complianceStatus.map(s => [
      s.subcontractor || s.name || "",
      s.glStatus || "\u2014",
      s.autoStatus || "\u2014",
      s.wcStatus || "\u2014",
      s.additionalInsured ? "Yes" : "No",
      s.compliant ? "Compliant" : "Deficient",
    ]);
    renderSimpleTable(doc, { headers: ["Subcontractor", "GL", "Auto", "WC", "Add'l Insured", "Status"], rows: subRows }, brand);
    doc.moveDown(0.5);
  }

  // Coverage Gaps
  if (data.gaps && Array.isArray(data.gaps) && data.gaps.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor("#dc2626").text("Coverage Gaps");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const g of data.gaps) {
      doc.text(`  \u2022  ${typeof g === "string" ? g : g.description || ""}`, { lineGap: 3 });
    }
    doc.moveDown(0.5);
  }

  // Recommendations
  if (data.recommendations && Array.isArray(data.recommendations)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Recommendations");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const r of data.recommendations) {
      doc.text(`  \u2022  ${typeof r === "string" ? r : r.recommendation || ""}`, { lineGap: 3 });
    }
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This report is prepared for lender compliance review. It does not constitute insurance advice. Consult your insurance broker for binding decisions.", { align: "center" });
}

function renderRiskSummary(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("RISK EXPOSURE SUMMARY", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Executive Summary
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Executive Summary");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  doc.text("This report summarizes the project's risk exposure across builder's risk, umbrella coverage, and excluded perils.", { lineGap: 4 });
  doc.moveDown(0.5);

  // Builder's Risk Analysis
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Builder's Risk Analysis");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.buildersRiskAmount) doc.text(`Builder's Risk Coverage: ${fmtCurrency(data.buildersRiskAmount)}`);
  if (data.buildersRiskAdequacy) doc.text(`Adequacy: ${data.buildersRiskAdequacy}`);
  if (data.buildersRiskDeductible) doc.text(`Deductible: ${fmtCurrency(data.buildersRiskDeductible)}`);
  if (data.buildersRiskNotes) doc.text(data.buildersRiskNotes, { lineGap: 4 });
  doc.moveDown(0.5);

  // Umbrella Coverage
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Umbrella Coverage");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.umbrellaCoverage) doc.text(`Umbrella Limit: ${fmtCurrency(data.umbrellaCoverage)}`);
  if (data.umbrellaCarrier) doc.text(`Carrier: ${data.umbrellaCarrier}`);
  if (data.umbrellaStatus) doc.text(`Status: ${data.umbrellaStatus}`);
  doc.moveDown(0.5);

  // Excluded Perils
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Excluded Perils");
  doc.moveDown(0.3);
  if (data.excludedPerils && Array.isArray(data.excludedPerils)) {
    const perilRows = data.excludedPerils.map(p => [
      typeof p === "string" ? p : p.peril || p.name || "",
      typeof p === "string" ? "" : p.exposure || "\u2014",
      typeof p === "string" ? "" : p.mitigation || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Peril", "Exposure", "Mitigation"], rows: perilRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("No excluded perils identified at this time.");
  }
  doc.moveDown(0.5);

  // Exposure Summary
  if (data.exposures && Array.isArray(data.exposures)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Exposure Summary");
    doc.moveDown(0.3);
    const expRows = data.exposures.map(e => [
      e.category || "",
      e.exposure || "",
      e.likelihood || "\u2014",
      e.impact || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Category", "Exposure", "Likelihood", "Impact"], rows: expRows }, brand);
    doc.moveDown(0.5);
  }

  // Recommendations
  if (data.recommendations && Array.isArray(data.recommendations)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Recommendations");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const r of data.recommendations) {
      doc.text(`  \u2022  ${typeof r === "string" ? r : r.recommendation || ""}`, { lineGap: 3 });
    }
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This analysis is for risk assessment purposes only. It does not constitute insurance advice. Consult your broker and risk manager.", { align: "center" });
}

// ── W-027 Quality Control & Inspection PDF renderers ──

function renderInspectionReport(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("INSPECTION REPORT", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.inspectionType ? ["Inspection Type", data.inspectionType] : null,
    data.inspector ? ["Inspector", data.inspector] : null,
    data.date ? ["Date", data.date] : ["Date", new Date().toLocaleDateString()],
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Result
  const result = (data.result || "Pending").toUpperCase();
  const resultColor = result === "PASS" ? "#16a34a" : result === "FAIL" ? "#dc2626" : "#d97706";
  doc.fontSize(18).font("Helvetica-Bold").fillColor(resultColor)
    .text(`Result: ${result}`, { align: "center" });
  doc.moveDown(1);

  // Conditions
  if (data.conditions && Array.isArray(data.conditions) && data.conditions.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Conditions");
    doc.moveDown(0.3);
    const condRows = data.conditions.map(c => [
      typeof c === "string" ? c : c.condition || c.description || "",
      typeof c === "string" ? "\u2014" : c.status || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Condition", "Status"], rows: condRows }, brand);
    doc.moveDown(0.5);
  }

  // Deficiencies
  if (data.deficiencies && Array.isArray(data.deficiencies) && data.deficiencies.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor("#dc2626").text("Deficiencies");
    doc.moveDown(0.3);
    const defRows = data.deficiencies.map((d, idx) => [
      String(idx + 1),
      typeof d === "string" ? d : d.description || "",
      typeof d === "string" ? "\u2014" : d.location || "\u2014",
      typeof d === "string" ? "\u2014" : d.severity || "\u2014",
      typeof d === "string" ? "\u2014" : d.responsibleSub || d.trade || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["#", "Description", "Location", "Severity", "Responsible"], rows: defRows }, brand);
    doc.moveDown(0.5);
  }

  // Re-inspection
  if (data.reinspectionDate || data.reinspectionRequired) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Re-inspection");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    if (data.reinspectionRequired) doc.text(`Re-inspection Required: Yes`);
    if (data.reinspectionDate) doc.text(`Scheduled Date: ${data.reinspectionDate}`);
    if (data.reinspectionNotes) doc.text(data.reinspectionNotes, { lineGap: 3 });
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This report does not replace official inspection records from the authority having jurisdiction (AHJ).", { align: "center" });
}

function renderTradeChecklist(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("TRADE QUALITY CHECKLIST", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.trade ? ["Trade", data.trade] : null,
    data.inspector ? ["Inspector", data.inspector] : null,
    data.date ? ["Date", data.date] : ["Date", new Date().toLocaleDateString()],
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Checklist Items
  const items = data.checklistItems || [];
  if (items.length > 0) {
    const checkRows = items.map((item, idx) => {
      const desc = typeof item === "string" ? item : item.description || item.item || "";
      const status = typeof item === "string" ? "Pending" : item.status || "Pending";
      const statusMark = status === "Pass" || status === "pass" || status === "Yes" ? "PASS" : status === "Fail" || status === "fail" || status === "No" ? "FAIL" : "N/A";
      const notes = typeof item === "string" ? "" : item.notes || "";
      return [String(idx + 1), desc, statusMark, notes];
    });
    renderSimpleTable(doc, { headers: ["#", "Checklist Item", "Status", "Notes"], rows: checkRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("No checklist items defined for this trade.");
  }

  // Summary
  const total = items.length;
  const passed = items.filter(i => {
    const s = typeof i === "string" ? "" : (i.status || "");
    return s === "Pass" || s === "pass" || s === "Yes";
  }).length;
  const failed = items.filter(i => {
    const s = typeof i === "string" ? "" : (i.status || "");
    return s === "Fail" || s === "fail" || s === "No";
  }).length;

  doc.moveDown(1);
  doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
    .text(`Total: ${total}  |  Pass: ${passed}  |  Fail: ${failed}  |  Pending: ${total - passed - failed}`);

  // Sign-off block
  doc.moveDown(2);
  const sigW = contentWidth() / 2 - 20;
  const sigY = doc.y;

  doc.moveTo(MARGINS.standard.left, sigY).lineTo(MARGINS.standard.left + sigW, sigY).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Inspector Signature / Date", MARGINS.standard.left, sigY + 4, { width: sigW });

  doc.moveTo(MARGINS.standard.left + sigW + 40, sigY).lineTo(MARGINS.standard.left + sigW * 2 + 40, sigY).stroke();
  doc.text("Superintendent Signature / Date", MARGINS.standard.left + sigW + 40, sigY + 4, { width: sigW });

  doc.moveDown(3);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This checklist is for GC self-verification purposes. It does not replace formal inspection by the AHJ.", { align: "center" });
}

function renderCoTracker(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("CERTIFICATE OF OCCUPANCY TRACKER", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  if (data.targetDate) {
    doc.text(`Target CO Date: ${data.targetDate}`, { align: "center" });
  }
  doc.moveDown(1.5);

  // Requirements table
  const requirements = data.requirements || [];
  if (requirements.length > 0) {
    const reqRows = requirements.map(r => [
      r.item || r.name || r.requirement || "",
      r.required ? "Yes" : "N/A",
      r.status || "Not Started",
      r.date || r.completedDate || "\u2014",
      r.notes || "",
    ]);
    renderSimpleTable(doc, { headers: ["Item", "Required", "Status", "Date", "Notes"], rows: reqRows }, brand);

    // Progress summary
    const total = requirements.filter(r => r.required !== false).length;
    const complete = requirements.filter(r => r.status === "Complete" || r.status === "Passed" || r.status === "complete").length;
    const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

    doc.moveDown(1);
    doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
      .text(`Progress: ${complete} of ${total} requirements met (${pct}%)`);

    if (complete === total && total > 0) {
      doc.moveDown(0.3);
      doc.font(FONTS.body.font).fillColor("#16a34a")
        .text("All CO requirements met. Project eligible for Certificate of Occupancy application.");
    }
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("CO requirements not yet defined.");
  }

  // Inspection status
  if (data.inspectionStatus && Array.isArray(data.inspectionStatus)) {
    doc.moveDown(1);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Inspection Status");
    doc.moveDown(0.3);
    const inspRows = data.inspectionStatus.map(i => [
      i.type || i.inspection || "",
      i.status || "Scheduled",
      i.date || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Inspection", "Status", "Date"], rows: inspRows }, brand);
  }

  // Certificate status
  if (data.certificateStatus && Array.isArray(data.certificateStatus)) {
    doc.moveDown(1);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Certificate Status");
    doc.moveDown(0.3);
    const certRows = data.certificateStatus.map(c => [
      c.certificate || c.name || "",
      c.status || "Pending",
      c.date || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Certificate", "Status", "Date"], rows: certRows }, brand);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This tracker is for project management purposes. Final CO issuance is at the discretion of the AHJ.", { align: "center" });
}

// ── W-028 Safety & OSHA PDF renderers ──

function renderSiteSafetyPlan(doc, data, brand, logoBuffer) {
  // Cover page
  addHeader(doc, brand, logoBuffer);
  doc.moveDown(3);
  doc.fontSize(26)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text(data.title || "Site Safety Plan", { align: "center" });

  if (data.projectName) {
    doc.moveDown(0.5);
    doc.fontSize(FONTS.subheading.size).font("Helvetica").fillColor(secondaryColor(brand))
      .text(data.projectName, { align: "center" });
  }
  if (data.siteAddress) {
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text(data.siteAddress, { align: "center" });
  }
  doc.moveDown(1);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
    .text(`Date: ${data.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });

  doc.moveDown(4);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text(brand.footerText || "Confidential — Generated by TitleApp.ai", { align: "center" });

  // Hazard Assessment
  doc.addPage();
  addHeader(doc, brand, logoBuffer);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Hazard Assessment");
  doc.moveDown(0.5);

  if (data.hazards && Array.isArray(data.hazards)) {
    const hazRows = data.hazards.map(h => [
      typeof h === "string" ? h : h.hazard || h.name || "",
      typeof h === "string" ? "\u2014" : h.location || "\u2014",
      typeof h === "string" ? "\u2014" : h.severity || "\u2014",
      typeof h === "string" ? "\u2014" : h.controls || "\u2014",
    ]);
    renderSimpleTable(doc, { headers: ["Hazard", "Location", "Severity", "Controls"], rows: hazRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Site hazard assessment to be completed during pre-construction walk.", { lineGap: 4 });
  }

  // PPE Requirements
  doc.moveDown(1);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("PPE Requirements");
  doc.moveDown(0.5);
  if (data.ppeRequirements && Array.isArray(data.ppeRequirements)) {
    const ppeRows = data.ppeRequirements.map(p => [
      typeof p === "string" ? p : p.item || p.ppe || "",
      typeof p === "string" ? "All areas" : p.area || "All areas",
      typeof p === "string" ? "Required" : p.requirement || "Required",
    ]);
    renderSimpleTable(doc, { headers: ["PPE Item", "Area", "Requirement"], rows: ppeRows }, brand);
  } else {
    const defaultPpe = [
      ["Hard Hat", "All areas", "Required at all times"],
      ["Safety Glasses", "All areas", "Required at all times"],
      ["High-Visibility Vest", "All areas", "Required at all times"],
      ["Steel-Toe Boots", "All areas", "Required at all times"],
      ["Hearing Protection", "As posted", "Required in high-noise areas"],
      ["Fall Protection", "Above 6 ft", "Required per OSHA 1926.502"],
    ];
    renderSimpleTable(doc, { headers: ["PPE Item", "Area", "Requirement"], rows: defaultPpe }, brand);
  }

  // Emergency Procedures
  doc.addPage();
  addHeader(doc, brand, logoBuffer);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Emergency Procedures");
  doc.moveDown(0.5);

  if (data.emergencyContacts && Array.isArray(data.emergencyContacts)) {
    const emRows = data.emergencyContacts.map(c => [
      c.role || c.name || "",
      c.name || "",
      c.phone || "",
    ]);
    renderSimpleTable(doc, { headers: ["Role", "Name", "Phone"], rows: emRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    doc.text("Emergency: Dial 911", { lineGap: 4 });
    doc.text("Report all injuries to the site superintendent immediately.", { lineGap: 4 });
  }

  // Hospital Route
  if (data.hospitalRoute) {
    doc.moveDown(1);
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Nearest Hospital / Route");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text(data.hospitalRoute, { lineGap: 4 });
  }

  // Competent Persons
  doc.moveDown(1);
  doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Competent Persons");
  doc.moveDown(0.5);
  if (data.competentPersons && Array.isArray(data.competentPersons)) {
    const cpRows = data.competentPersons.map(p => [
      p.name || "",
      p.role || p.discipline || "",
      p.company || "",
      p.phone || "",
    ]);
    renderSimpleTable(doc, { headers: ["Name", "Discipline", "Company", "Phone"], rows: cpRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Competent persons to be designated prior to start of work.");
  }

  // Site Rules
  if (data.siteRules && Array.isArray(data.siteRules)) {
    doc.addPage();
    addHeader(doc, brand, logoBuffer);
    doc.fontSize(FONTS.heading.size).font(FONTS.heading.font).fillColor(primaryColor(brand)).text("Site Rules");
    doc.moveDown(0.5);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (let i = 0; i < data.siteRules.length; i++) {
      const rule = typeof data.siteRules[i] === "string" ? data.siteRules[i] : data.siteRules[i].rule || "";
      doc.text(`${i + 1}. ${rule}`, { lineGap: 4 });
    }
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This safety plan does not replace site-specific safety programs required by OSHA. All safety decisions must be reviewed by a qualified safety professional.", { align: "center" });
}

function renderIncidentReport(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor("#dc2626")
    .text("INCIDENT REPORT", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"}`, { align: "center" });
  doc.moveDown(1.5);

  // Incident Header
  const incidentMeta = [
    data.date ? ["Date", data.date] : null,
    data.time ? ["Time", data.time] : null,
    data.location ? ["Location", data.location] : null,
    data.reportedBy ? ["Reported By", data.reportedBy] : null,
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of incidentMeta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Description
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Incident Description");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.description) {
    doc.text(data.description, { lineGap: 4 });
  } else {
    doc.text("Description not provided.", { lineGap: 4 });
  }
  doc.moveDown(0.5);

  // Witnesses
  if (data.witnesses && Array.isArray(data.witnesses) && data.witnesses.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Witnesses");
    doc.moveDown(0.3);
    const witRows = data.witnesses.map(w => [
      typeof w === "string" ? w : w.name || "",
      typeof w === "string" ? "" : w.company || "",
      typeof w === "string" ? "" : w.phone || "",
      typeof w === "string" ? "" : w.statement || "",
    ]);
    renderSimpleTable(doc, { headers: ["Name", "Company", "Phone", "Statement"], rows: witRows }, brand);
    doc.moveDown(0.5);
  }

  // Injury Details
  if (data.injury) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor("#dc2626").text("Injury Details");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    if (typeof data.injury === "string") {
      doc.text(data.injury, { lineGap: 4 });
    } else {
      if (data.injury.type) doc.text(`Type: ${data.injury.type}`);
      if (data.injury.bodyPart) doc.text(`Body Part: ${data.injury.bodyPart}`);
      if (data.injury.severity) doc.text(`Severity: ${data.injury.severity}`);
      if (data.injury.treatment) doc.text(`Treatment: ${data.injury.treatment}`);
      if (data.injury.daysAway) doc.text(`Days Away from Work: ${data.injury.daysAway}`);
      if (data.injury.restricted) doc.text(`Restricted Duty: ${data.injury.restricted}`);
    }
    doc.moveDown(0.5);
  }

  // Root Cause Analysis
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Root Cause Analysis");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.rootCause) {
    if (typeof data.rootCause === "string") {
      doc.text(data.rootCause, { lineGap: 4 });
    } else if (Array.isArray(data.rootCause)) {
      for (const c of data.rootCause) {
        doc.text(`  \u2022  ${typeof c === "string" ? c : c.cause || ""}`, { lineGap: 3 });
      }
    }
  } else {
    doc.text("Root cause analysis pending investigation.", { lineGap: 4 });
  }
  doc.moveDown(0.5);

  // Corrective Actions
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Corrective Actions");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.correctiveActions && Array.isArray(data.correctiveActions)) {
    const caRows = data.correctiveActions.map(a => [
      typeof a === "string" ? a : a.action || a.description || "",
      typeof a === "string" ? "\u2014" : a.responsibleParty || a.owner || "\u2014",
      typeof a === "string" ? "\u2014" : a.dueDate || "\u2014",
      typeof a === "string" ? "\u2014" : a.status || "Open",
    ]);
    renderSimpleTable(doc, { headers: ["Action", "Responsible", "Due Date", "Status"], rows: caRows }, brand);
  } else {
    doc.text("Corrective actions pending investigation.", { lineGap: 4 });
  }
  doc.moveDown(0.5);

  // OSHA Recordability
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("OSHA Recordability Determination");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  const recordable = data.oshaRecordable || data.recordable || "Pending determination";
  doc.text(`OSHA Recordable: ${typeof recordable === "boolean" ? (recordable ? "Yes" : "No") : recordable}`);
  if (data.oshaFormRequired) doc.text(`Form 301 Required: ${data.oshaFormRequired}`);

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This incident report is for internal documentation. OSHA reporting requirements may apply. Consult your safety officer.", { align: "center" });
}

function renderToolboxTalk(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("TOOLBOX TALK", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.topic ? ["Topic", data.topic] : null,
    data.presenter ? ["Presenter", data.presenter] : null,
    data.date ? ["Date", data.date] : ["Date", new Date().toLocaleDateString()],
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }

  // Divider
  doc.moveDown(0.5);
  doc.moveTo(MARGINS.standard.left, doc.y)
    .lineTo(PAGE_SIZES.letter.width - MARGINS.standard.right, doc.y)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
  doc.moveDown(1);

  // Key Safety Points
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Key Safety Points");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.keyPoints && Array.isArray(data.keyPoints)) {
    for (let i = 0; i < data.keyPoints.length; i++) {
      const point = typeof data.keyPoints[i] === "string" ? data.keyPoints[i] : data.keyPoints[i].point || "";
      doc.text(`${i + 1}. ${point}`, { lineGap: 4 });
    }
  } else {
    doc.text("Key points to be discussed during the toolbox talk.", { lineGap: 4 });
  }
  doc.moveDown(0.5);

  // Discussion Notes
  if (data.discussion) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Discussion Notes");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    if (typeof data.discussion === "string") {
      doc.text(data.discussion, { lineGap: 4 });
    } else if (Array.isArray(data.discussion)) {
      for (const d of data.discussion) {
        doc.text(typeof d === "string" ? d : d.note || "", { lineGap: 4 });
        doc.moveDown(0.3);
      }
    }
    doc.moveDown(0.5);
  }

  // Attendance
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Attendance");
  doc.moveDown(0.3);
  if (data.attendees && Array.isArray(data.attendees)) {
    const attRows = data.attendees.map((a, idx) => [
      String(idx + 1),
      typeof a === "string" ? a : a.name || "",
      typeof a === "string" ? "" : a.company || "",
      typeof a === "string" ? "" : a.trade || "",
      "________________",
    ]);
    renderSimpleTable(doc, { headers: ["#", "Name", "Company", "Trade", "Signature"], rows: attRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Attendance to be recorded at the time of the toolbox talk.");
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Toolbox talks are part of a comprehensive safety program. They do not replace formal safety training.", { align: "center" });
}

function renderJha(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("JOB HAZARD ANALYSIS", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Activity Description
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Activity");
  doc.moveDown(0.3);
  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  if (data.activity) {
    doc.text(typeof data.activity === "string" ? data.activity : data.activity.name || data.activity.description || "", { lineGap: 4 });
  } else {
    doc.text("Activity description not provided.", { lineGap: 4 });
  }
  doc.moveDown(0.5);

  // Hazard Identification Table
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Hazard Analysis");
  doc.moveDown(0.3);

  if (data.hazards && Array.isArray(data.hazards)) {
    const hazRows = data.hazards.map(h => {
      const prob = typeof h === "string" ? "\u2014" : h.probability || "\u2014";
      const sev = typeof h === "string" ? "\u2014" : h.severity || "\u2014";
      const probNum = typeof prob === "number" ? prob : (prob === "High" ? 3 : prob === "Medium" ? 2 : prob === "Low" ? 1 : 0);
      const sevNum = typeof sev === "number" ? sev : (sev === "High" ? 3 : sev === "Medium" ? 2 : sev === "Low" ? 1 : 0);
      const riskScore = probNum * sevNum || "\u2014";
      return [
        typeof h === "string" ? h : h.step || h.task || "",
        typeof h === "string" ? "\u2014" : h.hazard || h.description || "",
        String(prob),
        String(sev),
        String(riskScore),
        typeof h === "string" ? "\u2014" : h.controls || h.control || "",
      ];
    });
    renderSimpleTable(doc, { headers: ["Step / Task", "Hazard", "Probability", "Severity", "Risk Score", "Controls"], rows: hazRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("No hazards identified for analysis.");
  }

  // Risk Matrix Legend
  doc.moveDown(1);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Risk Score: Probability x Severity. Low=1, Medium=2, High=3. Score 6-9=Critical, 3-4=Moderate, 1-2=Low");

  // Sign-off
  doc.moveDown(2);
  const sigW = contentWidth() / 2 - 20;
  const sigY = doc.y;

  doc.moveTo(MARGINS.standard.left, sigY).lineTo(MARGINS.standard.left + sigW, sigY).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("Prepared By / Date", MARGINS.standard.left, sigY + 4, { width: sigW });

  doc.moveTo(MARGINS.standard.left + sigW + 40, sigY).lineTo(MARGINS.standard.left + sigW * 2 + 40, sigY).stroke();
  doc.text("Reviewed By / Date", MARGINS.standard.left + sigW + 40, sigY + 4, { width: sigW });

  doc.moveDown(3);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This JHA does not replace formal safety programs. All work must comply with OSHA regulations and site safety requirements.", { align: "center" });
}

// ── W-029 MEP Coordination PDF renderers ──

function renderMepMeetingMinutes(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("MEP COORDINATION MEETING MINUTES", { align: "center" });
  doc.moveDown(0.5);

  // Meta info
  const meta = [
    data.projectName ? ["Project", data.projectName] : null,
    data.meetingDate ? ["Meeting Date", data.meetingDate] : ["Date", new Date().toLocaleDateString()],
    data.meetingNumber ? ["Meeting #", String(data.meetingNumber)] : null,
    data.location ? ["Location", data.location] : null,
  ].filter(Boolean);

  doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
  for (const [label, value] of meta) {
    doc.font(FONTS.label.font).fillColor(COLORS.textLight).text(label + ": ", { continued: true });
    doc.font(FONTS.body.font).fillColor(COLORS.text).text(value);
  }
  doc.moveDown(1);

  // Attendees
  if (data.attendees && Array.isArray(data.attendees)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Attendees");
    doc.moveDown(0.3);
    const attRows = data.attendees.map(a => [
      typeof a === "string" ? a : a.name || "",
      typeof a === "string" ? "" : a.company || "",
      typeof a === "string" ? "" : a.trade || a.role || "",
    ]);
    renderSimpleTable(doc, { headers: ["Name", "Company", "Trade / Role"], rows: attRows }, brand);
    doc.moveDown(0.5);
  }

  // Agenda Items
  if (data.agendaItems && Array.isArray(data.agendaItems)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Agenda / Discussion");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (let i = 0; i < data.agendaItems.length; i++) {
      const item = data.agendaItems[i];
      const topic = typeof item === "string" ? item : item.topic || item.title || "";
      const notes = typeof item === "string" ? "" : item.notes || item.discussion || "";
      doc.font("Helvetica-Bold").text(`${i + 1}. ${topic}`);
      if (notes) {
        doc.font(FONTS.body.font).text(`   ${notes}`, { lineGap: 3 });
      }
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  // Action Items
  if (data.actionItems && Array.isArray(data.actionItems) && data.actionItems.length > 0) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Action Items");
    doc.moveDown(0.3);
    const aiRows = data.actionItems.map((a, idx) => [
      String(idx + 1),
      typeof a === "string" ? a : a.item || a.description || "",
      typeof a === "string" ? "\u2014" : a.owner || a.responsibleParty || "\u2014",
      typeof a === "string" ? "\u2014" : a.deadline || a.dueDate || "\u2014",
      typeof a === "string" ? "Open" : a.status || "Open",
    ]);
    renderSimpleTable(doc, { headers: ["#", "Action Item", "Owner", "Deadline", "Status"], rows: aiRows }, brand);
  }

  // Follow-up
  if (data.nextMeetingDate) {
    doc.moveDown(1);
    doc.fontSize(FONTS.body.size).font("Helvetica-Bold").fillColor(primaryColor(brand))
      .text(`Next Meeting: ${data.nextMeetingDate}`);
  }

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("These meeting minutes are for coordination purposes. All MEP decisions must be reviewed by the design team of record.", { align: "center" });
}

function renderCxChecklist(doc, data, brand, logoBuffer) {
  addHeader(doc, brand, logoBuffer);

  doc.fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(primaryColor(brand))
    .text("MEP COMMISSIONING CHECKLIST", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
    .text(`Project: ${data.projectName || "\u2014"} | Date: ${data.date || new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  // Systems overview
  if (data.systems && Array.isArray(data.systems)) {
    doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Systems Under Commissioning");
    doc.moveDown(0.3);
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text);
    for (const s of data.systems) {
      doc.text(`  \u2022  ${typeof s === "string" ? s : s.name || s.system || ""}`, { lineGap: 3 });
    }
    doc.moveDown(0.5);
  }

  // Functional Performance Testing
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Functional Performance Testing");
  doc.moveDown(0.3);
  if (data.testResults && Array.isArray(data.testResults)) {
    const testRows = data.testResults.map(t => [
      t.system || t.name || "",
      t.test || t.description || "",
      t.result || t.status || "Pending",
      t.notes || "",
    ]);
    renderSimpleTable(doc, { headers: ["System", "Test", "Result", "Notes"], rows: testRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Functional performance testing not yet completed.");
  }
  doc.moveDown(0.5);

  // TAB Results
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Testing, Adjusting & Balancing (TAB)");
  doc.moveDown(0.3);
  if (data.tabData && Array.isArray(data.tabData)) {
    const tabRows = data.tabData.map(t => [
      t.system || t.area || "",
      t.designFlow || t.design || "",
      t.measuredFlow || t.measured || "",
      t.variance || (t.designFlow && t.measuredFlow ? ((t.measuredFlow - t.designFlow) / t.designFlow * 100).toFixed(1) + "%" : "\u2014"),
      t.status || "Pending",
    ]);
    renderSimpleTable(doc, { headers: ["System / Area", "Design Flow", "Measured Flow", "Variance", "Status"], rows: tabRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("TAB report not yet available.");
  }
  doc.moveDown(0.5);

  // Controls Verification
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Controls Verification");
  doc.moveDown(0.3);
  if (data.controlsStatus && Array.isArray(data.controlsStatus)) {
    const ctrlRows = data.controlsStatus.map(c => [
      c.system || c.point || "",
      c.description || c.sequence || "",
      c.status || "Pending",
      c.notes || "",
    ]);
    renderSimpleTable(doc, { headers: ["System / Point", "Sequence", "Status", "Notes"], rows: ctrlRows }, brand);
  } else {
    doc.fontSize(FONTS.body.size).font(FONTS.body.font).fillColor(COLORS.text)
      .text("Controls verification not yet completed.");
  }
  doc.moveDown(0.5);

  // Documentation Status
  doc.fontSize(FONTS.subheading.size).font(FONTS.subheading.font).fillColor(primaryColor(brand)).text("Documentation Status");
  doc.moveDown(0.3);
  const docItems = data.documentationStatus || [
    { item: "O&M Manuals", status: "Pending" },
    { item: "As-Built Drawings", status: "Pending" },
    { item: "Training Records", status: "Pending" },
    { item: "Warranty Information", status: "Pending" },
    { item: "TAB Report", status: "Pending" },
    { item: "Cx Final Report", status: "Pending" },
  ];
  const docRows = docItems.map(d => [
    d.item || d.name || "",
    d.status || "Pending",
    d.notes || "",
  ]);
  renderSimpleTable(doc, { headers: ["Document", "Status", "Notes"], rows: docRows }, brand);

  doc.moveDown(2);
  doc.fontSize(FONTS.caption.size).font(FONTS.caption.font).fillColor(COLORS.textLight)
    .text("This commissioning checklist is for project management purposes. All systems must be verified by a qualified commissioning agent.", { align: "center" });
}

module.exports = { generatePdf };
