/**
 * documentResolver.js — Document hierarchy resolution for Direct/Operational mode
 *
 * Hierarchy (highest authority first):
 *   1. operator_upload  — User-uploaded docs (POH, QRH, SOP) — serial-number specific
 *   2. titleapp_baseline — Generic reference documents — not serial-number specific
 *   3. public_regulatory — FAR/AC/ACS citations — always available
 *
 * Exports: resolveDocuments, formatCitation, buildDocReminder
 */

// ═══════════════════════════════════════════════════════════════
//  DOCUMENT RESOLUTION — query Firestore for user's uploaded docs
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve available document sources for a user + worker combination.
 *
 * @param {string} userId — Firebase auth UID
 * @param {string} workerId — worker ID (e.g. "AV-P01", "copilot-pc12")
 * @param {object} db — Firestore instance
 * @returns {Promise<{sources: object[], hasOperatorDocs: boolean, reminder: string|null}>}
 */
async function resolveDocuments(userId, workerId, db) {
  const sources = [];
  let hasOperatorDocs = false;

  // 1. Check for operator-uploaded documents
  try {
    const vaultSnap = await db
      .collection("vaultDocs")
      .doc(userId)
      .collection("private")
      .where("workerId", "in", [workerId, "copilot-pc12", "all"])
      .limit(20)
      .get();

    if (!vaultSnap.empty) {
      hasOperatorDocs = true;
      vaultSnap.forEach((doc) => {
        const data = doc.data();
        sources.push({
          type: "operator_upload",
          label: data.fileName || "Operator Document",
          docId: doc.id,
          available: true,
          revisionNumber: data.revisionNumber || null,
          effectiveDate: data.effectiveDate || null,
        });
      });
    }
  } catch (err) {
    // Firestore query failed — continue with baseline
    console.error("documentResolver: vaultDocs query failed:", err.message);
  }

  // 2. TitleApp baseline reference — always available
  sources.push({
    type: "titleapp_baseline",
    label: "Generic reference document — not serial-number specific",
    available: true,
  });

  // 3. Public regulatory sources — always available
  sources.push({
    type: "public_regulatory",
    label: "FAR/AC/ACS citation",
    available: true,
  });

  // Build reminder if no operator docs
  const reminder = hasOperatorDocs ? null : buildDocReminder();

  return { sources, hasOperatorDocs, reminder };
}

// ═══════════════════════════════════════════════════════════════
//  CITATION FORMATTING — per source type
// ═══════════════════════════════════════════════════════════════

/**
 * Format a citation string based on source type.
 *
 * @param {"operator_upload"|"titleapp_baseline"|"public_regulatory"} sourceType
 * @param {object} [opts]
 * @param {string} [opts.documentName] — name of the document
 * @param {string} [opts.section] — section reference
 * @param {string} [opts.revision] — revision number
 * @param {string} [opts.effectiveDate] — effective date
 * @param {string} [opts.farReference] — FAR/AC reference (e.g. "91.205")
 * @returns {string}
 */
function formatCitation(sourceType, opts = {}) {
  switch (sourceType) {
    case "operator_upload": {
      const parts = [opts.documentName || "Operator Document"];
      if (opts.section) parts.push(`Section ${opts.section}`);
      if (opts.revision) parts.push(`Revision ${opts.revision}`);
      if (opts.effectiveDate) parts.push(`Effective ${opts.effectiveDate}`);
      return `[${parts.join(", ")}]`;
    }

    case "titleapp_baseline":
      return "Generic reference document — not serial-number specific. Upload your documents in Settings for aircraft-specific answers.";

    case "public_regulatory": {
      if (opts.farReference) return `[FAR ${opts.farReference}${opts.section ? `, Section ${opts.section}` : ""}]`;
      return "[Public regulatory source]";
    }

    default:
      return "[Source citation unavailable]";
  }
}

// ═══════════════════════════════════════════════════════════════
//  SESSION DOC REMINDER — shown once on first message if no operator docs
// ═══════════════════════════════════════════════════════════════

/**
 * Build the session-open reminder string.
 * Shown to users who haven't uploaded operator-specific documents.
 *
 * @returns {string}
 */
function buildDocReminder() {
  return "Heads up — I'm working from generic reference documents for this aircraft type, not your specific serial number. Upload your POH, QRH, and any operator documents in Settings to get aircraft-specific answers in Direct Mode.";
}

module.exports = {
  resolveDocuments,
  formatCitation,
  buildDocReminder,
};
