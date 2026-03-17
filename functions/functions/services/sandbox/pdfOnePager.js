"use strict";

const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const { emitCreatorEvent, CREATOR_EVENT_TYPES } = require("./creatorEvents");

function getDb() { return admin.firestore(); }

const COLORS = {
  purple: "#6B46C1",
  nearBlack: "#0F1117",
  slateGray: "#64748B",
  mutedGray: "#99AABB",
  lightBg: "#F3F0FF",
  white: "#FFFFFF",
};

const PRICE_LABELS = ["Free", "$29/mo", "$49/mo", "$79/mo"];

/**
 * Generate a one-pager PDF from a draft worker spec.
 * Returns a Promise<Buffer>.
 */
function generateSpecPdf(spec, creatorName) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = 612;
    const marginL = 54;
    const marginR = 54;
    const contentW = pageW - marginL - marginR;

    // --- Header bar ---
    doc.rect(0, 0, pageW, 48).fill(COLORS.purple);
    doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.white)
      .text("TitleApp", marginL, 14, { width: contentW / 2 });
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.white)
      .text("titleapp.ai", marginL + contentW / 2, 18, { width: contentW / 2, align: "right" });

    let y = 68;

    // --- Worker name ---
    doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.purple)
      .text(spec.name || "Untitled Worker", marginL, y, { width: contentW, align: "center" });
    y += 30;

    // --- Tagline ---
    if (spec.tagline) {
      doc.font("Helvetica").fontSize(11).fillColor(COLORS.slateGray)
        .text(spec.tagline, marginL, y, { width: contentW, align: "center" });
      y += 20;
    }

    y += 8;

    // --- Metrics grid (3 columns) ---
    const colW = contentW / 3;
    const metrics = [
      { label: "Category", value: (spec.category || "general").replace(/-/g, " ") },
      { label: "Price", value: PRICE_LABELS[spec.pricingTier] || "TBD" },
      { label: "Status", value: "Draft" },
    ];
    metrics.forEach((m, i) => {
      const x = marginL + i * colW;
      doc.rect(x + 4, y, colW - 8, 36).lineWidth(0.5).strokeColor(COLORS.slateGray).stroke();
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.slateGray)
        .text(m.label.toUpperCase(), x + 8, y + 6, { width: colW - 16, align: "center" });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.nearBlack)
        .text(m.value, x + 8, y + 18, { width: colW - 16, align: "center" });
    });
    y += 50;

    // --- Helper: section heading ---
    function heading(title) {
      if (y > 680) return; // guard overflow
      doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.purple)
        .text(title, marginL, y, { width: contentW });
      y += 18;
    }

    // --- Helper: body text ---
    function body(text, maxChars) {
      if (y > 700) return;
      const truncated = text && text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.nearBlack)
        .text(truncated || "—", marginL, y, { width: contentW, lineGap: 2 });
      y = doc.y + 10;
    }

    // --- What It Does ---
    heading("What It Does");
    body(spec.description, 500);

    // --- Who It's For ---
    heading("Who It's For");
    body(spec.targetAudience, 300);

    // --- Capabilities ---
    if (spec.capabilities && spec.capabilities.length > 0) {
      heading("Capabilities");
      const caps = spec.capabilities.slice(0, 6);
      caps.forEach((cap) => {
        if (y > 710) return;
        doc.font("Helvetica").fontSize(10).fillColor(COLORS.nearBlack)
          .text(`\u2022  ${cap}`, marginL + 8, y, { width: contentW - 16 });
        y = doc.y + 4;
      });
      y += 6;
    }

    // --- Compliance Rules ---
    if (spec.complianceRules && spec.complianceRules.length > 0) {
      heading("Compliance Rules");
      spec.complianceRules.slice(0, 4).forEach((rule) => {
        if (y > 720) return;
        doc.font("Helvetica").fontSize(10).fillColor(COLORS.nearBlack)
          .text(`\u2022  ${rule}`, marginL + 8, y, { width: contentW - 16 });
        y = doc.y + 4;
      });
      y += 6;
    }

    // --- Sample Interaction ---
    if (spec.sampleInteractions && spec.sampleInteractions.length > 0 && y < 690) {
      heading("Sample Interaction");
      const sample = spec.sampleInteractions[0];
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.slateGray)
        .text("User:", marginL + 8, y);
      y = doc.y + 2;
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.nearBlack)
        .text(sample.user || "", marginL + 16, y, { width: contentW - 24 });
      y = doc.y + 6;
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.slateGray)
        .text("Worker:", marginL + 8, y);
      y = doc.y + 2;
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.nearBlack)
        .text(sample.worker || "", marginL + 16, y, { width: contentW - 24 });
      y = doc.y + 6;
    }

    // --- Footer ---
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.mutedGray)
      .text(
        "AI-generated spec — human review recommended. This document was produced by TitleApp AI and may contain inaccuracies.",
        marginL, 752, { width: contentW, align: "center" }
      );
    if (creatorName) {
      doc.text(`Created by ${creatorName} on titleapp.ai`, marginL, 762, { width: contentW, align: "center" });
    }

    doc.end();
  });
}

/**
 * Route handler: GET /v1/sandbox:session:pdf?sessionId=xxx
 */
async function handleGetSessionPdf(req, res, user) {
  const db = getDb();
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ ok: false, error: "Missing sessionId" });

  const sessionSnap = await db.collection("sandboxSessions").doc(sessionId).get();
  if (!sessionSnap.exists) return res.status(404).json({ ok: false, error: "Session not found" });

  const session = sessionSnap.data();
  if (session.userId !== user.uid) return res.status(403).json({ ok: false, error: "Not your session" });
  if (!session.spec) return res.status(400).json({ ok: false, error: "No spec generated yet" });

  const userSnap = await db.collection("users").doc(user.uid).get();
  const creatorName = userSnap.exists ? (userSnap.data().name || userSnap.data().displayName || "") : "";

  const pdfBuffer = await generateSpecPdf(session.spec, creatorName);

  emitCreatorEvent(user.uid, CREATOR_EVENT_TYPES.PDF_DOWNLOADED, { sessionId });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${session.spec.slug || "worker-spec"}.pdf"`);
  return res.send(pdfBuffer);
}

module.exports = { generateSpecPdf, handleGetSessionPdf };
