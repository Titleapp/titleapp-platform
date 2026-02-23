const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// POST /v1/workspaces/:workspace_id/inbound — universal data push endpoint
// Accepts any JSON payload with a "source" field. Stored for AI processing.
router.post("/:workspace_id/inbound", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        error: { code: "bad_request", message: "Request body must be a JSON object", status: 400 },
      });
    }

    const ref = await getDb().collection("inbound").add({
      tenantId: workspace_id,
      source: payload.source || "unknown",
      payload,
      status: "pending",
      api_key_id: req.apiKey.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      data: { id: ref.id, status: "pending", message: "Data received and queued for AI processing" },
    });
  } catch (err) {
    console.error("POST /inbound error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
