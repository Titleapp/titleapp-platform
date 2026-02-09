const { getCatalog, putCatalog, createPackage, getPackage, bindFilesToPackage } = require("./raas.store");

function jsonError(res, status, error, extra = {}) {
  console.error("❌ RAAS ERROR:", status, error, extra);
  return res.status(status).json({ ok: false, error, ...extra });
}

/**
 * Handlers expect the same ctx you already use:
 * ctx = { tenantId, userId, email }
 */

async function handleRaasWorkflows({ req, res, method, body, ctx }) {
  // GET /v1/raas:workflows?vertical=...&jurisdiction=...
  if (method !== "GET") return jsonError(res, 405, "Method not allowed");

  const vertical = String(req.query?.vertical || "").trim();
  const jurisdiction = String(req.query?.jurisdiction || "GLOBAL").trim();
  if (!vertical) return jsonError(res, 400, "Missing vertical");

  const catalog = await getCatalog({ vertical, jurisdiction });
  if (!catalog) {
    return res.json({
      ok: true,
      vertical,
      jurisdiction,
      workflows: [],
      note: "No catalog found yet. Use POST /v1/raas:catalog:upsert to seed workflows for this vertical/jurisdiction.",
    });
  }

  return res.json({ ok: true, vertical, jurisdiction, workflows: catalog.workflows || [] });
}

async function handleRaasCatalogUpsert({ req, res, method, body, ctx }) {
  // POST /v1/raas:catalog:upsert
  if (method !== "POST") return jsonError(res, 405, "Method not allowed");

  const vertical = String(body.vertical || "").trim();
  const jurisdiction = String(body.jurisdiction || "GLOBAL").trim();
  const workflows = body.workflows;

  if (!vertical) return jsonError(res, 400, "Missing vertical");
  if (!Array.isArray(workflows)) return jsonError(res, 400, "Missing workflows[]");

  const out = await putCatalog({
    vertical,
    jurisdiction,
    workflows,
    updatedBy: { userId: ctx.userId, email: ctx.email },
  });

  return res.json({ ok: true, ...out });
}

async function handleRaasPackagesCreate({ req, res, method, body, ctx }) {
  // POST /v1/raas:packages:create
  if (method !== "POST") return jsonError(res, 405, "Method not allowed");

  const vertical = String(body.vertical || "").trim();
  const jurisdiction = String(body.jurisdiction || "GLOBAL").trim();
  const workflowId = body.workflowId ? String(body.workflowId).trim() : null;
  const rulesetRef = body.rulesetRef ? String(body.rulesetRef).trim() : null;
  const templateRefs = Array.isArray(body.templateRefs) ? body.templateRefs.map(String) : [];

  if (!vertical) return jsonError(res, 400, "Missing vertical");

  const out = await createPackage({
    tenantId: ctx.tenantId,
    createdBy: { userId: ctx.userId, email: ctx.email },
    vertical,
    jurisdiction,
    workflowId,
    rulesetRef,
    templateRefs,
  });

  return res.json({ ok: true, ...out });
}

async function handleRaasPackagesBindFiles({ req, res, method, body, ctx }) {
  // POST /v1/raas:packages:bindFiles
  if (method !== "POST") return jsonError(res, 405, "Method not allowed");

  const packageId = String(body.packageId || "").trim();
  const bindings = body.bindings;

  if (!packageId) return jsonError(res, 400, "Missing packageId");
  if (!Array.isArray(bindings)) return jsonError(res, 400, "Missing bindings[]");

  const out = await bindFilesToPackage({
    tenantId: ctx.tenantId,
    packageId,
    boundBy: { userId: ctx.userId, email: ctx.email },
    bindings,
  });

  if (out.notFound) return jsonError(res, 404, "Unknown packageId");
  if (out.forbidden) return jsonError(res, 403, "Forbidden");
  if (out.badRequest) return jsonError(res, 400, out.reason || "Bad request", out);

  return res.json({ ok: true, ...out });
}

async function handleRaasPackagesGet({ req, res, method, body, ctx }) {
  // GET /v1/raas:packages:get?id=...
  if (method !== "GET") return jsonError(res, 405, "Method not allowed");

  const packageId = String(req.query?.id || "").trim();
  if (!packageId) return jsonError(res, 400, "Missing id");

  const out = await getPackage({ tenantId: ctx.tenantId, packageId });
  if (!out) return jsonError(res, 404, "Unknown packageId");
  if (out.forbidden) return jsonError(res, 403, "Forbidden");

  return res.json({ ok: true, package: out });
}

module.exports = {
  handleRaasWorkflows,
  handleRaasCatalogUpsert,
  handleRaasPackagesCreate,
  handleRaasPackagesBindFiles,
  handleRaasPackagesGet,
};
