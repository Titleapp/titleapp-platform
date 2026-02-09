const admin = require("firebase-admin");

/**
 * Firestore layout (v0)
 *
 * raasCatalog/{vertical}__{jurisdiction}
 *   - vertical, jurisdiction
 *   - workflows: [{id,name,domain,description,rulesetRef,templates[]}]
 *
 * raasPackages/{packageId}
 *   - tenantId, createdBy, createdAt, updatedAt
 *   - vertical, jurisdiction, workflowId
 *   - rulesetRef, templateRefs[]
 *   - status: draft|ready|archived
 *   - fileBindings: [{fileId, role, label, boundAt, boundBy}]
 */

function getDb() {
  return admin.firestore();
}

function catalogDocId(vertical, jurisdiction) {
  return `${vertical}__${jurisdiction}`;
}

async function getCatalog({ vertical, jurisdiction }) {
  const db = getDb();
  const docId = catalogDocId(vertical, jurisdiction);
  const snap = await db.collection("raasCatalog").doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function putCatalog({ vertical, jurisdiction, workflows, updatedBy }) {
  const db = getDb();
  const docId = catalogDocId(vertical, jurisdiction);

  const payload = {
    vertical,
    jurisdiction,
    workflows: Array.isArray(workflows) ? workflows : [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: updatedBy || null,
  };

  await db.collection("raasCatalog").doc(docId).set(payload, { merge: true });
  return { ok: true, id: docId };
}

async function createPackage({ tenantId, createdBy, vertical, jurisdiction, workflowId, rulesetRef, templateRefs }) {
  const db = getDb();
  const packageId = "pkg_" + require("crypto").randomUUID().replace(/-/g, "");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    tenantId,
    vertical,
    jurisdiction,
    workflowId: workflowId || null,
    rulesetRef: rulesetRef || null,
    templateRefs: Array.isArray(templateRefs) ? templateRefs : [],
    status: "draft",
    fileBindings: [],
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || null,
  };

  await db.collection("raasPackages").doc(packageId).set(payload);
  return { ok: true, packageId };
}

async function getPackage({ tenantId, packageId }) {
  const db = getDb();
  const snap = await db.collection("raasPackages").doc(packageId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.tenantId !== tenantId) return { forbidden: true };
  return { id: snap.id, ...data };
}

async function bindFilesToPackage({ tenantId, packageId, boundBy, bindings }) {
  const db = getDb();
  const pkgRef = db.collection("raasPackages").doc(packageId);
  const pkgSnap = await pkgRef.get();
  if (!pkgSnap.exists) return { notFound: true };

  const pkg = pkgSnap.data();
  if (pkg.tenantId !== tenantId) return { forbidden: true };

  const safeBindings = (Array.isArray(bindings) ? bindings : []).map((b) => ({
    fileId: String(b.fileId || "").trim(),
    role: String(b.role || "supporting").trim(),
    label: b.label ? String(b.label).slice(0, 120) : null,
    boundAt: admin.firestore.FieldValue.serverTimestamp(),
    boundBy: boundBy || null,
  })).filter((b) => b.fileId);

  // Validate fileIds belong to tenant
  const fileIds = [...new Set(safeBindings.map((b) => b.fileId))];
  if (!fileIds.length) return { ok: true, added: 0 };

  const fileSnaps = await Promise.all(fileIds.map((id) => db.collection("files").doc(id).get()));
  for (const fsnap of fileSnaps) {
    if (!fsnap.exists) return { badRequest: true, reason: "Unknown fileId", fileId: fsnap.id };
    const f = fsnap.data();
    if (f.tenantId !== tenantId) return { forbidden: true };
    if (f.status !== "uploaded") return { badRequest: true, reason: "File not uploaded", fileId: fsnap.id, status: f.status };
  }

  await pkgRef.update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    fileBindings: admin.firestore.FieldValue.arrayUnion(...safeBindings),
  });

  return { ok: true, added: safeBindings.length };
}

module.exports = {
  getCatalog,
  putCatalog,
  createPackage,
  getPackage,
  bindFilesToPackage,
};
