/**
 * documentMode.js — Runtime document mode resolution for worker execution
 *
 * Determines how a worker should behave based on operator document availability.
 * Called before AI execution in raas.engine.js.
 *
 * 5 modes:
 *   PLATFORM_BASELINE  — worker doesn't require operator docs (default)
 *   DOCUMENT_ENFORCED  — all required doc types present
 *   PARTIAL_DOCS       — some required doc types missing
 *   ADVISORY_ONLY      — no operator docs, worker falls back to advisory
 *   BLOCKED            — no operator docs and blockWithoutDocs is true
 *
 * Exports: getWorkerDocumentMode
 */

let _db = null;
function getDb() {
  if (_db) return _db;
  const admin = require("firebase-admin");
  _db = admin.firestore();
  return _db;
}

/**
 * Resolve the document mode for a worker execution.
 *
 * @param {string} userId — Firebase auth UID of the operator
 * @param {string} workerId — worker ID (e.g. "AV-P01")
 * @param {object} workerRecord — full worker record (must include documentControl)
 * @returns {Promise<{mode: string, disclaimer: string|null, missing: string[]}>}
 */
async function getWorkerDocumentMode(userId, workerId, workerRecord) {
  const dc = workerRecord?.documentControl;

  // If worker doesn't require operator docs, use platform baseline
  if (!dc || dc.requiresOperatorDocs !== true) {
    return { mode: "PLATFORM_BASELINE", disclaimer: null, missing: [] };
  }

  const requiredTypes = Array.isArray(dc.requiredDocTypes) ? dc.requiredDocTypes : [];
  if (requiredTypes.length === 0) {
    return { mode: "PLATFORM_BASELINE", disclaimer: null, missing: [] };
  }

  // Query operator's active documents
  const db = getDb();
  let operatorDocTypes = [];

  try {
    const dcSnap = await db
      .collection("documentControl")
      .doc(userId)
      .collection("documents")
      .where("status", "==", "active")
      .limit(50)
      .get();

    if (!dcSnap.empty) {
      dcSnap.forEach((doc) => {
        const data = doc.data();
        if (data.docType) operatorDocTypes.push(data.docType.toUpperCase());
      });
    }
  } catch (err) {
    console.error("documentMode: failed to query operator docs:", err.message);
  }

  // Check which required doc types are present
  const normalizedRequired = requiredTypes.map((t) => t.toUpperCase());
  const present = normalizedRequired.filter((t) => operatorDocTypes.includes(t));
  const missing = normalizedRequired.filter((t) => !operatorDocTypes.includes(t));

  // All present
  if (missing.length === 0) {
    return { mode: "DOCUMENT_ENFORCED", disclaimer: null, missing: [] };
  }

  // Partial
  if (present.length > 0) {
    return {
      mode: "PARTIAL_DOCS",
      disclaimer: `Missing documents: ${missing.join(", ")}. Responses may be incomplete for areas requiring those documents.`,
      missing,
    };
  }

  // None present — check blockWithoutDocs
  if (dc.blockWithoutDocs === true) {
    return {
      mode: "BLOCKED",
      disclaimer: "This worker requires operator documents to run. Upload the required documents in Settings to proceed.",
      missing,
    };
  }

  // None present, advisory fallback
  if (dc.advisoryWithoutDocs !== false) {
    return {
      mode: "ADVISORY_ONLY",
      disclaimer: "No operator documents loaded. Responses are advisory only and based on platform baseline references.",
      missing,
    };
  }

  // Fallback — shouldn't reach here but default to advisory
  return {
    mode: "ADVISORY_ONLY",
    disclaimer: "No operator documents loaded. Responses are advisory only.",
    missing,
  };
}

module.exports = { getWorkerDocumentMode };
