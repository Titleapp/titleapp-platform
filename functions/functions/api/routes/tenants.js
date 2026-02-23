const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/tenants — tenants with payment status
router.get("/:workspace_id/tenants", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("propertyTenants").where("tenantId", "==", workspace_id);
    if (status) q = q.where("paymentStatus", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const tenants = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: tenants, total: tenants.length });
  } catch (err) {
    console.error("GET /tenants error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
