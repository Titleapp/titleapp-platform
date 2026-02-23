const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/listings
router.get("/:workspace_id/listings", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, min_price, max_price, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("listings").where("tenantId", "==", workspace_id);
    if (status && status !== "all") q = q.where("status", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side price filtering (Firestore doesn't support range + inequality on different fields easily)
    const filtered = listings.filter(l => {
      if (min_price && (parseFloat(l.price) || 0) < parseFloat(min_price)) return false;
      if (max_price && (parseFloat(l.price) || 0) > parseFloat(max_price)) return false;
      return true;
    });

    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    console.error("GET /listings error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/listings — create listing (inbound)
router.post("/:workspace_id/listings", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const data = {
      ...req.body,
      tenantId: workspace_id,
      source: req.body.source || "api",
      status: req.body.status || "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await getDb().collection("listings").add(data);
    res.status(201).json({ data: { id: ref.id, ...data } });
  } catch (err) {
    console.error("POST /listings error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
