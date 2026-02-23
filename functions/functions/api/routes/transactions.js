const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/transactions — transaction pipeline
router.get("/:workspace_id/transactions", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("transactions").where("tenantId", "==", workspace_id);
    if (status) q = q.where("status", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: transactions, total: transactions.length });
  } catch (err) {
    console.error("GET /transactions error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
