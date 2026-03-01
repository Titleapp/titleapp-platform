"use strict";

const DEFAULT_STYLES = {
  fontFamily: "Helvetica",
  fontFamilyBold: "Helvetica-Bold",
  fontSize: 11,
  headerSize: 16,
  subheaderSize: 13,
  lineHeight: 1.4,
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  accentColor: "#7c3aed",
  textColor: "#1a1a1a",
  mutedColor: "#6b7280",
};

const TEMPLATES = {
  "report-standard": {
    id: "report-standard",
    name: "Standard Report",
    description: "Multi-section report with cover page, executive summary, and appendix",
    version: "v1",
    category: "report",
    supportedFormats: ["pdf", "docx"],
    defaultFormat: "pdf",
    sections: [
      { id: "coverPage", name: "Cover Page", required: true },
      { id: "executiveSummary", name: "Executive Summary", required: true },
      { id: "sections", name: "Report Sections", required: true },
      { id: "appendix", name: "Appendix", required: false },
    ],
    defaultStyles: { ...DEFAULT_STYLES },
  },

  "memo-executive": {
    id: "memo-executive",
    name: "Executive Memo",
    description: "Executive summary memo with header, body, and recommendation",
    version: "v1",
    category: "memo",
    supportedFormats: ["pdf", "docx"],
    defaultFormat: "pdf",
    sections: [
      { id: "header", name: "Memo Header", required: true },
      { id: "body", name: "Body", required: true },
      { id: "recommendation", name: "Recommendation", required: false },
    ],
    defaultStyles: { ...DEFAULT_STYLES },
  },

  "agreement-standard": {
    id: "agreement-standard",
    name: "Standard Agreement",
    description: "Agreement or contract with parties, terms, and signature blocks",
    version: "v1",
    category: "agreement",
    supportedFormats: ["docx", "pdf"],
    defaultFormat: "docx",
    sections: [
      { id: "header", name: "Agreement Header", required: true },
      { id: "parties", name: "Parties", required: true },
      { id: "recitals", name: "Recitals", required: false },
      { id: "terms", name: "Terms and Conditions", required: true },
      { id: "signatures", name: "Signature Blocks", required: true },
    ],
    defaultStyles: { ...DEFAULT_STYLES, fontFamily: "Times-Roman", fontFamilyBold: "Times-Bold" },
  },

  "deck-standard": {
    id: "deck-standard",
    name: "Presentation Deck",
    description: "Slide deck with title, content, and two-column layouts",
    version: "v1",
    category: "deck",
    supportedFormats: ["pptx"],
    defaultFormat: "pptx",
    sections: [
      { id: "slides", name: "Slides", required: true },
    ],
    defaultStyles: {
      ...DEFAULT_STYLES,
      fontFamily: "Helvetica",
      fontSize: 18,
      headerSize: 28,
      subheaderSize: 22,
    },
  },

  "model-cashflow": {
    id: "model-cashflow",
    name: "Cash Flow Model",
    description: "Cash flow projection with assumptions, monthly projections, and summary metrics",
    version: "v1",
    category: "model",
    supportedFormats: ["xlsx"],
    defaultFormat: "xlsx",
    sections: [
      { id: "assumptions", name: "Assumptions", required: true },
      { id: "projections", name: "Monthly Projections", required: true },
      { id: "summary", name: "Summary Metrics", required: false },
    ],
    defaultStyles: { ...DEFAULT_STYLES, fontSize: 10 },
  },

  "model-proforma": {
    id: "model-proforma",
    name: "Pro Forma Model",
    description: "Pro forma financial model with income, balance sheet, cash flow, and assumptions",
    version: "v1",
    category: "model",
    supportedFormats: ["xlsx"],
    defaultFormat: "xlsx",
    sections: [
      { id: "assumptions", name: "Assumptions", required: true },
      { id: "incomeStatement", name: "Income Statement", required: true },
      { id: "balanceSheet", name: "Balance Sheet", required: false },
      { id: "cashFlow", name: "Cash Flow Statement", required: false },
    ],
    defaultStyles: { ...DEFAULT_STYLES, fontSize: 10 },
  },

  "one-pager": {
    id: "one-pager",
    name: "One-Pager",
    description: "Single-page summary with key metrics grid, body text, and call to action",
    version: "v1",
    category: "report",
    supportedFormats: ["pdf"],
    defaultFormat: "pdf",
    sections: [
      { id: "header", name: "Header", required: true },
      { id: "metrics", name: "Key Metrics", required: true },
      { id: "body", name: "Body", required: true },
      { id: "callToAction", name: "Call to Action", required: false },
    ],
    defaultStyles: { ...DEFAULT_STYLES },
  },

  "letter-formal": {
    id: "letter-formal",
    name: "Formal Letter",
    description: "Formal business letter with sender, recipient, body, and closing",
    version: "v1",
    category: "letter",
    supportedFormats: ["pdf", "docx"],
    defaultFormat: "pdf",
    sections: [
      { id: "sender", name: "Sender", required: true },
      { id: "recipient", name: "Recipient", required: true },
      { id: "body", name: "Body", required: true },
      { id: "closing", name: "Closing", required: true },
    ],
    defaultStyles: { ...DEFAULT_STYLES },
  },
};

function getTemplate(id) {
  return TEMPLATES[id] || null;
}

function listTemplates(category) {
  const all = Object.values(TEMPLATES);
  if (!category) return all.map(templateSummary);
  return all.filter((t) => t.category === category).map(templateSummary);
}

function templateSummary(t) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    supportedFormats: t.supportedFormats,
    defaultFormat: t.defaultFormat,
  };
}

function validateContent(templateId, content) {
  const template = getTemplate(templateId);
  if (!template) return { valid: false, error: `Unknown template: ${templateId}` };

  const missing = [];
  for (const section of template.sections) {
    if (section.required && (content[section.id] === undefined || content[section.id] === null)) {
      missing.push(section.id);
    }
  }
  if (missing.length > 0) {
    return { valid: false, error: `Missing required sections: ${missing.join(", ")}` };
  }
  return { valid: true };
}

module.exports = { TEMPLATES, DEFAULT_STYLES, getTemplate, listTemplates, validateContent };
