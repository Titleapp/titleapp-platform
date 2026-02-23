const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/portfolio — positions
router.get("/:workspace_id/portfolio", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const snap = await getDb().collection("portfolio")
      .where("tenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const positions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data: positions, total: positions.length });
  } catch (err) {
    console.error("GET /portfolio error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
