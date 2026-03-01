const express = require("express");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();

// POST /v1/workspaces/:workspace_id/documents/generate
router.post("/:workspace_id/documents/generate", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { templateId, format, title, content, metadata } = req.body || {};
    if (!templateId) return res.status(400).json({ error: { code: "bad_request", message: "Missing templateId" } });
    if (!content) return res.status(400).json({ error: { code: "bad_request", message: "Missing content" } });

    const { generateDocument } = require("../../documents");
    const result = await generateDocument({
      tenantId: workspace_id,
      userId: req.apiKeyData?.owner || "api",
      templateId,
      format: format || null,
      content,
      title: title || templateId,
      metadata: { source: "public_api", ...(metadata || {}) },
    });

    if (!result.ok) return res.status(400).json({ error: { code: "bad_request", message: result.error } });
    res.json({ data: result });
  } catch (err) {
    console.error("POST /documents/generate error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// GET /v1/workspaces/:workspace_id/documents/generated
router.get("/:workspace_id/documents/generated", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const { listDocuments } = require("../../documents");
    const result = await listDocuments(workspace_id, { limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ data: result.documents, total: result.total });
  } catch (err) {
    console.error("GET /documents/generated error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// GET /v1/workspaces/:workspace_id/documents/generated/:docId
router.get("/:workspace_id/documents/generated/:docId", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id, docId } = req.params;

    const { getDocument } = require("../../documents");
    const result = await getDocument(docId, workspace_id);
    if (!result.ok) return res.status(404).json({ error: { code: "not_found", message: result.error } });
    res.json({ data: result });
  } catch (err) {
    console.error("GET /documents/generated/:docId error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// GET /v1/workspaces/:workspace_id/documents/templates
router.get("/:workspace_id/documents/templates", requireWorkspaceAccess, async (req, res) => {
  try {
    const { getTemplates } = require("../../documents");
    const { category } = req.query;
    const result = getTemplates(category || null);
    res.json({ data: result.templates });
  } catch (err) {
    console.error("GET /documents/templates error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
