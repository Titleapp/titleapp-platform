const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/documents — stored documents
router.get("/:workspace_id/documents", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const snap = await getDb().collection("files")
      .where("tenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const documents = snap.docs.map(d => {
      const file = d.data();
      return {
        id: d.id,
        name: file.name || file.filename || null,
        type: file.contentType || file.type || null,
        size: file.size || null,
        status: file.status || null,
        created_at: file.createdAt || null,
      };
    });

    res.json({ data: documents, total: documents.length });
  } catch (err) {
    console.error("GET /documents error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
