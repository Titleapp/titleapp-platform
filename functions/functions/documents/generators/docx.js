"use strict";

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ImageRun, Header, Footer, PageNumber,
} = require("docx");

function hexToDocxColor(hex) {
  return (hex || "#000000").replace("#", "");
}

async function generateDocx(templateDef, content, branding) {
  const styles = templateDef.defaultStyles || {};
  const accentColor = hexToDocxColor(branding.accentColor || styles.accentColor || "#7c3aed");
  const textColor = hexToDocxColor(branding.textColor || styles.textColor || "#1a1a1a");
  const mutedColor = hexToDocxColor(branding.mutedColor || styles.mutedColor || "#6b7280");
  const fontFamily = styles.fontFamily === "Times-Roman" ? "Times New Roman" : "Calibri";

  const children = [];
  const templateId = templateDef.id;

  // Helper to create a paragraph
  function p(text, opts = {}) {
    return new Paragraph({
      heading: opts.heading,
      alignment: opts.alignment,
      spacing: { after: opts.after || 200 },
      children: [
        new TextRun({
          text: text || "",
          bold: opts.bold || false,
          size: (opts.size || 22),
          color: opts.color || textColor,
          font: fontFamily,
        }),
      ],
    });
  }

  function heading(text, level) {
    const hl = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
    return new Paragraph({
      heading: hl,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: text || "",
          bold: true,
          size: level === 1 ? 32 : 26,
          color: accentColor,
          font: fontFamily,
        }),
      ],
    });
  }

  function hr() {
    return new Paragraph({
      spacing: { before: 100, after: 100 },
      border: { bottom: { color: mutedColor, style: BorderStyle.SINGLE, size: 1 } },
      children: [],
    });
  }

  // ---- Template-specific rendering ----

  if (templateId === "report-standard") {
    const cover = content.coverPage || {};
    // Cover
    children.push(new Paragraph({ spacing: { before: 4000 }, children: [] }));
    children.push(p(cover.title || "Report", { bold: true, size: 48, color: accentColor }));
    if (cover.subtitle) children.push(p(cover.subtitle, { size: 28, color: textColor }));
    children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    if (cover.author) children.push(p(`Prepared by: ${cover.author}`, { size: 20, color: mutedColor }));
    if (cover.preparedFor) children.push(p(`Prepared for: ${cover.preparedFor}`, { size: 20, color: mutedColor }));
    if (cover.date) children.push(p(cover.date, { size: 20, color: mutedColor }));
    children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

    // Executive summary
    children.push(heading("Executive Summary", 1));
    const summary = typeof content.executiveSummary === "string" ? content.executiveSummary : (content.executiveSummary || {}).text || "";
    children.push(p(summary));

    if (content.executiveSummary && content.executiveSummary.highlights) {
      for (const h of content.executiveSummary.highlights) {
        children.push(new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: `${h.label}: `, bold: true, size: 22, font: fontFamily }),
            new TextRun({ text: h.value || "", size: 22, font: fontFamily }),
          ],
        }));
      }
    }

    // Body sections
    for (const section of (content.sections || [])) {
      children.push(heading(section.heading || "Section", 2));
      children.push(p(section.content || ""));
    }

    // Appendix
    if (content.appendix) {
      children.push(hr());
      children.push(heading("Appendix", 1));
      children.push(p(typeof content.appendix === "string" ? content.appendix : JSON.stringify(content.appendix, null, 2)));
    }

  } else if (templateId === "memo-executive") {
    children.push(heading("MEMORANDUM", 1));
    children.push(hr());
    const hdr = content.header || {};
    for (const [label, val] of [["TO", hdr.to], ["FROM", hdr.from], ["DATE", hdr.date], ["RE", hdr.re || hdr.subject]]) {
      if (!val) continue;
      children.push(new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 22, font: fontFamily }),
          new TextRun({ text: val, size: 22, font: fontFamily }),
        ],
      }));
    }
    children.push(hr());
    children.push(p(content.body || ""));
    if (content.recommendation) {
      children.push(heading("Recommendation", 2));
      children.push(p(content.recommendation));
    }

  } else if (templateId === "agreement-standard") {
    const hdr = content.header || {};
    children.push(heading(hdr.title || "Agreement", 1));
    children.push(p(`Effective Date: ${hdr.effectiveDate || "___________"}`, { size: 20, color: mutedColor }));

    // Parties
    const parties = content.parties || [];
    if (parties.length > 0) {
      children.push(heading("Parties", 2));
      for (const party of parties) {
        children.push(p(`${party.role || "Party"}: ${party.name || ""}`, { bold: true }));
        if (party.address) children.push(p(party.address, { size: 20, color: mutedColor }));
      }
    }

    // Recitals
    if (content.recitals && content.recitals.length > 0) {
      children.push(heading("Recitals", 2));
      for (const r of content.recitals) {
        children.push(p(`WHEREAS, ${r}`));
      }
    }

    // Terms
    const terms = content.terms || [];
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      children.push(new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({ text: `${i + 1}. ${t.heading || `Section ${i + 1}`}`, bold: true, size: 22, font: fontFamily }),
        ],
      }));
      if (t.content) children.push(p(t.content));
    }

    // Signature blocks
    const sigs = content.signatures || content.parties || [];
    if (sigs.length > 0) {
      children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
      children.push(heading("Signatures", 2));
      for (const s of sigs) {
        children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        children.push(p("_________________________________"));
        children.push(p(s.name || "Name", { bold: true }));
        children.push(p(`Role: ${s.role || "___________"}`, { size: 20, color: mutedColor }));
        children.push(p("Date: ___________", { size: 20, color: mutedColor }));
      }
    }

  } else if (templateId === "letter-formal") {
    const sender = content.sender || {};
    const recipient = content.recipient || {};

    for (const line of [sender.name, sender.title, sender.company, sender.address].filter(Boolean)) {
      children.push(p(line, { size: 20, color: mutedColor, after: 40 }));
    }
    children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    children.push(p(content.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })));
    children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
    for (const line of [recipient.name, recipient.title, recipient.company, recipient.address].filter(Boolean)) {
      children.push(p(line, { after: 40 }));
    }
    children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
    children.push(p(content.salutation || `Dear ${recipient.name || "Sir/Madam"},`));
    children.push(p(content.body || ""));
    children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    const closing = content.closing || {};
    children.push(p(closing.text || "Sincerely,"));
    children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
    children.push(p(sender.name || "", { bold: true }));
    if (sender.title) children.push(p(sender.title, { size: 20, color: mutedColor }));

  } else {
    // Fallback
    children.push(heading(content.title || templateId, 1));
    children.push(p(JSON.stringify(content, null, 2), { size: 18 }));
  }

  // AI disclosure
  children.push(hr());
  children.push(p(branding.footerText || "Generated by TitleApp Digital Worker. AI-assisted analysis — human review recommended.", { size: 16, color: mutedColor }));

  // Build header/footer
  const headerChildren = [];
  if (branding.logoBuffer) {
    try {
      headerChildren.push(new Paragraph({
        children: [new ImageRun({ data: branding.logoBuffer, transformation: { width: 80, height: 30 }, type: branding.logoFormat === "png" ? "png" : "jpg" })],
      }));
    } catch (e) {
      // Logo embedding failed, skip
    }
  }

  const footerParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: `${branding.companyName || "TitleApp"} | Page `, size: 14, color: mutedColor, font: fontFamily }),
      new TextRun({ children: [PageNumber.CURRENT], size: 14, color: mutedColor }),
    ],
  });

  const doc = new Document({
    sections: [{
      headers: headerChildren.length > 0 ? { default: new Header({ children: headerChildren }) } : undefined,
      footers: { default: new Footer({ children: [footerParagraph] }) },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return { buffer };
}

module.exports = { generateDocx };
