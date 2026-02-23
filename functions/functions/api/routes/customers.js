const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/customers
router.get("/:workspace_id/customers", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("customers").where("tenantId", "==", workspace_id);
    if (status) q = q.where("status", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: customers, total: customers.length });
  } catch (err) {
    console.error("GET /customers error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/customers — create lead (inbound from AutoTrader etc)
router.post("/:workspace_id/customers", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { firstName, lastName, email, phone, tags, notes } = req.body;

    if (!firstName && !lastName && !email) {
      return res.status(400).json({
        error: { code: "bad_request", message: "At least one of firstName, lastName, or email is required", status: 400 },
      });
    }

    const ref = await getDb().collection("customers").add({
      tenantId: workspace_id,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      tags: tags || [],
      notes: notes || null,
      status: "new",
      source: req.body.source || "api",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id } });
  } catch (err) {
    console.error("POST /customers error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
