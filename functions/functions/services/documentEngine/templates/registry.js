// services/documentEngine/templates/registry.js
// System template definitions + Firestore custom template lookup

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const SYSTEM_TEMPLATES = {
  "report-standard": {
    id: "report-standard",
    name: "Standard Report",
    format: "pdf",
    category: "report",
    description:
      "Multi-section PDF report with cover page, table of contents, and branded headers",
    sections: ["cover", "toc", "executive_summary", "body", "appendix"],
    requiredFields: ["title"],
    optionalFields: [
      "subtitle",
      "author",
      "date",
      "sections",
      "appendix",
    ],
    system: true,
  },
  "memo-executive": {
    id: "memo-executive",
    name: "Executive Memo",
    format: "pdf",
    category: "memo",
    description:
      "One-to-two page executive memorandum with structured fields",
    sections: ["header", "body", "recommendation"],
    requiredFields: ["title", "to", "from", "body"],
    optionalFields: ["date", "subject", "recommendation", "cc"],
    system: true,
  },
  "agreement-standard": {
    id: "agreement-standard",
    name: "Standard Agreement",
    format: "docx",
    category: "agreement",
    description:
      "Editable DOCX contract with numbered clauses and signature blocks",
    sections: ["header", "recitals", "clauses", "signatures"],
    requiredFields: ["title", "parties", "clauses"],
    optionalFields: [
      "recitals",
      "effectiveDate",
      "signatures",
      "exhibits",
    ],
    system: true,
  },
  "deck-standard": {
    id: "deck-standard",
    name: "Standard Pitch Deck",
    format: "pptx",
    category: "presentation",
    description:
      "Branded slide deck with title slide, content slides, and closing",
    sections: ["title_slide", "content_slides", "closing_slide"],
    requiredFields: ["title", "slides"],
    optionalFields: ["subtitle", "presenter", "date"],
    system: true,
  },
  "model-cashflow": {
    id: "model-cashflow",
    name: "Cash Flow Model",
    format: "xlsx",
    category: "financial",
    description:
      "Multi-tab XLSX workbook with revenue, expenses, and cash flow projections",
    sections: ["assumptions", "revenue", "expenses", "cashflow", "summary"],
    requiredFields: ["title", "periods"],
    optionalFields: ["assumptions", "revenue", "expenses", "notes"],
    system: true,
  },
  "model-proforma": {
    id: "model-proforma",
    name: "Pro Forma Model",
    format: "xlsx",
    category: "financial",
    description:
      "Real estate pro forma with acquisition, operating, and disposition analysis",
    sections: ["acquisition", "operating", "disposition", "returns"],
    requiredFields: ["title", "propertyData"],
    optionalFields: ["assumptions", "comparables", "notes"],
    system: true,
  },
  "one-pager": {
    id: "one-pager",
    name: "One-Pager",
    format: "pdf",
    category: "summary",
    description:
      "Single-page branded summary with key metrics and highlights",
    sections: ["header", "metrics", "highlights", "footer"],
    requiredFields: ["title", "metrics"],
    optionalFields: [
      "subtitle",
      "highlights",
      "callToAction",
      "contactInfo",
    ],
    system: true,
  },
  "letter-formal": {
    id: "letter-formal",
    name: "Formal Letter",
    format: "docx",
    category: "correspondence",
    description:
      "Editable DOCX letter with letterhead, salutation, body, and closing",
    sections: [
      "letterhead",
      "address_block",
      "salutation",
      "body",
      "closing",
      "signature",
    ],
    requiredFields: ["to", "from", "body"],
    optionalFields: ["date", "subject", "cc", "enclosures"],
    system: true,
  },
};

async function getTemplate(templateId, tenantId) {
  if (SYSTEM_TEMPLATES[templateId]) {
    return SYSTEM_TEMPLATES[templateId];
  }

  if (tenantId) {
    try {
      const snap = await getDb()
        .collection("documentTemplates")
        .doc(templateId)
        .get();
      if (snap.exists) {
        const tmpl = snap.data();
        if (tmpl.tenantId === tenantId || tmpl.system === true) {
          return { id: snap.id, ...tmpl };
        }
      }
    } catch (e) {
      console.warn("registry: failed to load custom template", templateId, e.message);
    }
  }

  return null;
}

async function listTemplates(tenantId) {
  const templates = Object.values(SYSTEM_TEMPLATES);

  if (tenantId) {
    try {
      const snap = await getDb()
        .collection("documentTemplates")
        .where("tenantId", "==", tenantId)
        .get();
      snap.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() });
      });
    } catch (e) {
      console.warn("registry: failed to load custom templates", e.message);
    }
  }

  return templates;
}

function validateInput(template, data) {
  const missing = [];
  for (const field of template.requiredFields || []) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  return { valid: true };
}

module.exports = { getTemplate, listTemplates, validateInput, SYSTEM_TEMPLATES };
