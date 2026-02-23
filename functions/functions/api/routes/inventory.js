const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/inventory — vehicle inventory
router.get("/:workspace_id/inventory", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("inventory").where("tenantId", "==", workspace_id);
    if (type) q = q.where("type", "==", type);
    if (status) q = q.where("status", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: items, total: items.length });
  } catch (err) {
    console.error("GET /inventory error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/inventory — add vehicle (inbound from DMS)
router.post("/:workspace_id/inventory", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, metadata, price, cost, status: itemStatus } = req.body;

    if (!type || !metadata) {
      return res.status(400).json({
        error: { code: "bad_request", message: "Missing type or metadata", status: 400 },
      });
    }

    const ref = await getDb().collection("inventory").add({
      tenantId: workspace_id,
      type,
      status: itemStatus || "available",
      metadata,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      source: req.body.source || "api",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id } });
  } catch (err) {
    console.error("POST /inventory error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
