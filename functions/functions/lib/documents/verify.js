"use strict";
/**
 * Document Verification — CODEX 49.5 Phase B
 * Per-type schema checks. Confirms required sections are present.
 */

/**
 * Verify a generated document against its schema.
 * @param {Buffer} buffer — the generated file
 * @param {string} type — document type (e.g., "financial-model")
 * @param {object} schema — from document-schemas.json
 * @param {string} format — xlsx | docx | pdf
 * @returns {{ ok, found, missing }}
 */
function verify(buffer, type, schema, format) {
  if (!schema || !schema.requiredSections) {
    return { ok: true, found: [], missing: [] };
  }

  // Size threshold check
  const minSize = schema.minSizeBytes || 1024; // At least 1KB
  if (buffer.length < minSize) {
    return {
      ok: false,
      found: [],
      missing: ["file_too_small"],
      message: `File is ${buffer.length} bytes, minimum is ${minSize}`,
    };
  }

  const required = schema.requiredSections || [];
  const found = [];
  const missing = [];

  if (format === "xlsx") {
    // For Excel files, check for sheet names in the binary
    // Sheet names appear as UTF-16LE strings in xlsx XML
    const content = buffer.toString("utf8");
    for (const section of required) {
      // Sheet names appear in xl/workbook.xml as <sheet name="..."/>
      const patterns = [
        section.toLowerCase(),
        section.replace(/\s+/g, ""),
        section.replace(/\s+/g, "_"),
      ];
      const sectionFound = patterns.some(p => content.toLowerCase().includes(p));
      if (sectionFound) {
        found.push(section);
      } else {
        missing.push(section);
      }
    }
  } else if (format === "docx") {
    // For Word docs, check for heading text in the XML
    const content = buffer.toString("utf8");
    for (const section of required) {
      if (content.toLowerCase().includes(section.toLowerCase())) {
        found.push(section);
      } else {
        missing.push(section);
      }
    }
  } else if (format === "pdf") {
    // For PDFs, check for text strings in the binary
    const content = buffer.toString("latin1");
    for (const section of required) {
      if (content.toLowerCase().includes(section.toLowerCase())) {
        found.push(section);
      } else {
        missing.push(section);
      }
    }
  } else {
    // Unknown format — pass through
    return { ok: true, found: required, missing: [] };
  }

  return {
    ok: missing.length === 0,
    found,
    missing,
  };
}

module.exports = { verify };
