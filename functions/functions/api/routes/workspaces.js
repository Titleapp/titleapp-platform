const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces — list workspaces accessible by this API key
router.get("/", (req, res) => {
  const ids = req.apiKey.workspace_ids || [];
  res.json({ data: ids.map(id => ({ id })), total: ids.length });
});

// GET /v1/workspaces/:workspace_id — workspace details
router.get("/:workspace_id", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;

    // Personal vault shortcut
    if (workspace_id === "vault") {
      return res.json({
        data: { id: "vault", vertical: "consumer", name: "Personal Vault", status: "active", plan: "free" },
      });
    }

    // Find workspace owner via memberships
    const memSnap = await getDb().collection("memberships")
      .where("tenantId", "==", workspace_id)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (memSnap.empty) {
      return res.status(404).json({
        error: { code: "not_found", message: "Workspace not found", status: 404 },
      });
    }

    const userId = memSnap.docs[0].data().userId;
    const wsDoc = await getDb().collection("users").doc(userId).collection("workspaces").doc(workspace_id).get();

    if (!wsDoc.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Workspace not found", status: 404 },
      });
    }

    const ws = wsDoc.data();
    res.json({
      data: {
        id: wsDoc.id,
        name: ws.name || null,
        vertical: ws.vertical || null,
        tagline: ws.tagline || null,
        jurisdiction: ws.jurisdiction || null,
        status: ws.status || null,
        plan: ws.plan || null,
        created_at: ws.createdAt || null,
      },
    });
  } catch (err) {
    console.error("GET /workspaces/:id error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

module.exports = router;
