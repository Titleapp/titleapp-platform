// services/documentEngine/index.js
// Main orchestrator — generates documents, manages templates and branding

const crypto = require("crypto");
const { getTemplate, listTemplates, validateInput } = require("./templates/registry");
const { getBrandConfig, getLogoBuffer } = require("./branding");
const {
  saveGeneratedDocument,
  getDownloadUrl,
  listDocuments,
} = require("./storage");

// Lazy-load generators to minimize cold-start impact
let _pdfGen, _docxGen, _xlsxGen, _pptxGen;

function getPdfGenerator() {
  if (!_pdfGen) _pdfGen = require("./generators/pdfGenerator");
  return _pdfGen;
}
function getDocxGenerator() {
  if (!_docxGen) _docxGen = require("./generators/docxGenerator");
  return _docxGen;
}
function getXlsxGenerator() {
  if (!_xlsxGen) _xlsxGen = require("./generators/xlsxGenerator");
  return _xlsxGen;
}
function getPptxGenerator() {
  if (!_pptxGen) _pptxGen = require("./generators/pptxGenerator");
  return _pptxGen;
}

const GENERATORS = {
  pdf: () => getPdfGenerator().generatePdf,
  docx: () => getDocxGenerator().generateDocx,
  xlsx: () => getXlsxGenerator().generateXlsx,
  pptx: () => getPptxGenerator().generatePptx,
};

const CONTENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const EXT_MAP = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  pptx: "pptx",
};

async function generateDocument({
  tenantId,
  userId,
  templateId,
  data,
  overrideBrand,
}) {
  // 1. Resolve template
  const template = await getTemplate(templateId, tenantId);
  if (!template) {
    return { error: "unknown_template", message: `Template "${templateId}" not found` };
  }

  // 2. Validate required fields
  const validation = validateInput(template, data);
  if (!validation.valid) {
    return {
      error: "missing_fields",
      message: `Missing required fields: ${validation.missing.join(", ")}`,
      missing: validation.missing,
    };
  }

  // 3. Determine format
  const format = template.format;
  if (!GENERATORS[format]) {
    return { error: "unsupported_format", message: `Format "${format}" is not supported` };
  }

  // 4. Load branding
  const brand = overrideBrand
    ? { ...(await getBrandConfig(tenantId)), ...overrideBrand }
    : await getBrandConfig(tenantId);
  const logoBuffer = await getLogoBuffer(brand);

  // 5. Generate document
  const generateFn = GENERATORS[format]();
  const buffer = await generateFn({ template, data, brand, logoBuffer });

  // 6. Compute input hash for audit trail
  const inputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ templateId, data }))
    .digest("hex");

  // 7. Build filename
  const safeName = (data.title || "document")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const filename = `${safeName}.${EXT_MAP[format]}`;

  // 8. Save to Cloud Storage + Firestore
  const result = await saveGeneratedDocument({
    tenantId,
    userId,
    buffer,
    filename,
    contentType: CONTENT_TYPES[format],
    templateId,
    templateName: template.name,
    inputHash,
    metadata: {
      format,
      category: template.category,
      generatedBy: "documentEngine/v1",
    },
  });

  return {
    ok: true,
    docId: result.docId,
    storagePath: result.storagePath,
    templateId,
    templateName: template.name,
    format,
    filename,
    sizeBytes: buffer.length,
  };
}

module.exports = {
  generateDocument,
  getDownloadUrl,
  listDocuments,
  listTemplates,
};
