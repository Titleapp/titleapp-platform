const { getDb } = require("../_shared/db");

const STUDIO_LOCKER_BUDGET_TOKENS = 8000;
const CHARS_PER_TOKEN = 4;
const BUDGET_CHARS = STUDIO_LOCKER_BUDGET_TOKENS * CHARS_PER_TOKEN;

// Criticality levels — lower number = higher priority, never trimmed first
// 0 = safety-critical (always injected, never trimmed)
// 1 = regulatory (trimmed only after criticality-0 fills budget)
// 2 = operational
// 3 = reference (first to be summarized if over budget)
const CRITICALITY_LABELS = { 0: "SAFETY-CRITICAL", 1: "REGULATORY", 2: "OPERATIONAL", 3: "REFERENCE" };

async function loadStudioLockerContext(vertical, workerSlug, tenantId, tenantJurisdiction = "GLOBAL") {
  if (!vertical) return { contextString: null, injectedDocs: [] };
  const db = getDb();

  const [baselineSnap, tenantSnap] = await Promise.all([
    db.collection(`studioLocker/${vertical}/baseline`)
      .where("status", "==", "published")
      .get(),
    tenantId
      ? db.collection(`studioLocker/${vertical}/tenants/${tenantId}/documents`)
          .where("status", "==", "published")
          .get()
      : Promise.resolve({ docs: [] }),
  ]);

  // Filter baseline to matching jurisdiction
  const baselineDocs = baselineSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => {
      const j = d.jurisdiction || ["GLOBAL"];
      return j.includes("GLOBAL") || j.includes(tenantJurisdiction);
    })
    .sort((a, b) => (a.criticality ?? 2) - (b.criticality ?? 2));

  // Tenant docs bound to this worker or all workers ("*")
  const tenantDocs = tenantSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => {
      const applies = d.appliesTo || ["*"];
      return applies.includes("*") || applies.includes(workerSlug);
    })
    .sort((a, b) => (a.criticality ?? 2) - (b.criticality ?? 2));

  const injectedDocs = [];
  const trimmedDocs = [];
  let usedChars = 0;

  const sections = [];

  // Assemble baseline
  const baselineSection = [];
  for (const doc of baselineDocs) {
    const content = doc.content || "";
    const isCritical = (doc.criticality ?? 2) <= 1;
    const docChars = content.length;

    if (isCritical || usedChars + docChars <= BUDGET_CHARS) {
      baselineSection.push(
        `### [${CRITICALITY_LABELS[doc.criticality ?? 2]}] ${doc.title} (v${doc.version || "1.0"})\n${content}`
      );
      usedChars += docChars;
      injectedDocs.push({ source: "baseline", id: doc.id, title: doc.title, version: doc.version });
    } else {
      trimmedDocs.push(doc);
    }
  }
  if (baselineSection.length) {
    sections.push(`## STUDIO LOCKER — Platform Baseline (${vertical})\n\n${baselineSection.join("\n\n---\n\n")}`);
  }

  // Assemble tenant confidential
  const tenantSection = [];
  for (const doc of tenantDocs) {
    const content = doc.content || "";
    const isCritical = (doc.criticality ?? 2) <= 1;
    const docChars = content.length;

    if (isCritical || usedChars + docChars <= BUDGET_CHARS) {
      tenantSection.push(
        `### [COMPANY — ${doc.type?.toUpperCase() || "DOCUMENT"}] ${doc.title} (v${doc.version || "1.0"})\n${content}`
      );
      usedChars += docChars;
      injectedDocs.push({ source: "tenant", id: doc.id, title: doc.title, version: doc.version });
    } else {
      trimmedDocs.push(doc);
    }
  }
  if (tenantSection.length) {
    sections.push(`## STUDIO LOCKER — Company Documents\n\n${tenantSection.join("\n\n---\n\n")}`);
  }

  // Trimmed docs — title + docId so the worker can call get_studio_locker_doc
  if (trimmedDocs.length) {
    const trimmedList = trimmedDocs
      .map((d) => `- **${d.title}** (docId: ${d.id}) — summarized due to context budget; use get_studio_locker_doc to retrieve full content`)
      .join("\n");
    sections.push(`## STUDIO LOCKER — Additional Documents (summarized)\n\n${trimmedList}`);
  }

  // Tenant override instruction — always appended
  const overrideInstruction = `## STUDIO LOCKER — Precedence Rules

When a Company Document covers the same topic as a Platform Baseline document, the Company Document is authoritative — EXCEPT where the Company Document is less restrictive than a criticality-0 (safety-critical) or criticality-1 (regulatory) baseline. In that case, apply the stricter standard and flag the conflict explicitly: "Your company policy allows X, but the applicable regulation requires Y (stricter). I am applying the regulatory standard. Please update your Company Document to reflect current requirements."

If you cannot confidently determine which standard is stricter — due to different units, conditional exceptions, augmented-crew rules, or other ambiguity — default to the baseline (the conservative choice) and flag for human review: "I cannot confirm whether your company policy or the regulatory baseline is more restrictive on this topic. I am applying the baseline standard until a qualified person reviews and clarifies."

When a topic is not covered by any Studio Locker document, say so explicitly rather than inferring from training data: "I don't have your company policy on this topic — please upload it to your Studio Locker under Company Documents."`;

  sections.push(overrideInstruction);

  const contextString = sections.join("\n\n");
  return { contextString, injectedDocs, trimmedDocCount: trimmedDocs.length };
}

// Called mid-conversation by the get_studio_locker_doc tool
async function getStudioLockerDoc(vertical, docId, tenantId) {
  const db = getDb();

  // Try baseline first
  const baselineRef = db.doc(`studioLocker/${vertical}/baseline/${docId}`);
  const baselineSnap = await baselineRef.get();
  if (baselineSnap.exists) {
    const d = baselineSnap.data();
    return { title: d.title, version: d.version, content: d.content, source: "baseline" };
  }

  // Try tenant doc
  if (tenantId) {
    const tenantRef = db.doc(`studioLocker/${vertical}/tenants/${tenantId}/documents/${docId}`);
    const tenantSnap = await tenantRef.get();
    if (tenantSnap.exists) {
      const d = tenantSnap.data();
      return { title: d.title, version: d.version, content: d.content, source: "tenant" };
    }
  }

  return null;
}

module.exports = { loadStudioLockerContext, getStudioLockerDoc };
