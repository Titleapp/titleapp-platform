"use strict";

const { getTemplate, listTemplates, validateContent } = require("./templates/registry");
const { loadBranding, applyBranding } = require("./branding");
const { saveDocument, getDocumentUrl, getDocumentMetadata, listDocuments: listDocs } = require("./storage");

const { generatePdf } = require("./generators/pdf");
const { generateDocx } = require("./generators/docx");
const { generateXlsx } = require("./generators/xlsx");
const { generatePptx } = require("./generators/pptx");

const GENERATORS = {
  pdf: generatePdf,
  docx: generateDocx,
  xlsx: generateXlsx,
  pptx: generatePptx,
};

async function generateDocument({ tenantId, userId, templateId, format, content, title, metadata }) {
  // Validate template
  const template = getTemplate(templateId);
  if (!template) {
    return { ok: false, error: `Unknown template: ${templateId}` };
  }

  // Resolve format
  const outputFormat = format || template.defaultFormat;
  if (!template.supportedFormats.includes(outputFormat)) {
    return { ok: false, error: `Format "${outputFormat}" not supported by template "${templateId}". Supported: ${template.supportedFormats.join(", ")}` };
  }

  // Validate content
  const validation = validateContent(templateId, content);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  // Load branding
  const branding = await loadBranding(tenantId);
  const styles = applyBranding(template.defaultStyles, branding);
  const styledTemplate = { ...template, defaultStyles: styles };

  // Generate
  const generator = GENERATORS[outputFormat];
  if (!generator) {
    return { ok: false, error: `No generator for format: ${outputFormat}` };
  }

  const startMs = Date.now();
  const result = await generator(styledTemplate, content, branding);
  const durationMs = Date.now() - startMs;

  // Save
  const docTitle = title || content.title || content.coverPage?.title || templateId;
  const saved = await saveDocument({
    tenantId,
    userId,
    templateId,
    format: outputFormat,
    title: docTitle,
    buffer: result.buffer,
    pageCount: result.pageCount || null,
    metadata: {
      ...metadata,
      generationDurationMs: durationMs,
    },
  });

  return {
    ok: true,
    docId: saved.docId,
    filename: saved.filename,
    format: outputFormat,
    sizeBytes: saved.sizeBytes,
    pageCount: saved.pageCount,
    downloadUrl: saved.downloadUrl,
    generatedAt: new Date().toISOString(),
  };
}

async function getDocument(docId, tenantId) {
  const meta = await getDocumentMetadata(docId, tenantId);
  if (!meta) return { ok: false, error: "Document not found" };

  const urlResult = await getDocumentUrl(docId, tenantId, 3600);
  return {
    ok: true,
    ...meta,
    downloadUrl: urlResult ? urlResult.downloadUrl : null,
  };
}

async function listDocuments(tenantId, opts) {
  const result = await listDocs(tenantId, opts);
  return { ok: true, ...result };
}

function getTemplates(category) {
  return { ok: true, templates: listTemplates(category) };
}

module.exports = { generateDocument, getDocument, listDocuments, getTemplates };
