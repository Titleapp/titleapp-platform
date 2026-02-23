const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/buyers
router.get("/:workspace_id/buyers", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("buyers").where("tenantId", "==", workspace_id);
    if (status) q = q.where("status", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const buyers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: buyers, total: buyers.length });
  } catch (err) {
    console.error("GET /buyers error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/buyers — create buyer lead (inbound from Zillow etc)
router.post("/:workspace_id/buyers", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const data = {
      ...req.body,
      tenantId: workspace_id,
      source: req.body.source || "api",
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await getDb().collection("buyers").add(data);
    res.status(201).json({ data: { id: ref.id, ...data } });
  } catch (err) {
    console.error("POST /buyers error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
