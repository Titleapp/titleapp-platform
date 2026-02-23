const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/assets — tracked assets (DTCs)
router.get("/:workspace_id/assets", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;

    // Assets come from DTCs scoped to the user behind the API key
    let q = getDb().collection("dtcs").where("userId", "==", req.apiKey.user_id);
    if (type) q = q.where("type", "==", type);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const assets = snap.docs.map(d => {
      const dtc = d.data();
      return {
        id: d.id,
        type: dtc.type,
        metadata: dtc.metadata || {},
        attested: dtc.attested || false,
        created_at: dtc.createdAt || null,
      };
    });

    res.json({ data: assets, total: assets.length });
  } catch (err) {
    console.error("GET /assets error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
