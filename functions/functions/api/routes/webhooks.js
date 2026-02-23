const express = require("express");
const admin = require("firebase-admin");
const { requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/webhooks — list webhook subscriptions
router.get("/", async (req, res) => {
  try {
    const snap = await getDb().collection("webhooks")
      .where("api_key_id", "==", req.apiKey.id)
      .orderBy("createdAt", "desc")
      .get();

    const webhooks = snap.docs.map(d => {
      const wh = d.data();
      return {
        id: d.id,
        url: wh.url,
        events: wh.events || [],
        workspace_id: wh.workspace_id || null,
        status: wh.status || "active",
        created_at: wh.createdAt || null,
      };
    });

    res.json({ data: webhooks, total: webhooks.length });
  } catch (err) {
    console.error("GET /webhooks error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/webhooks — create webhook subscription
router.post("/", requireScope("write"), async (req, res) => {
  try {
    const { url, events, workspace_id } = req.body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: { code: "bad_request", message: "Missing url or events array", status: 400 },
      });
    }

    // Validate workspace access if workspace_id provided
    if (workspace_id && !req.apiKey.workspace_ids.includes(workspace_id) && !req.apiKey.scopes.includes("admin")) {
      return res.status(403).json({
        error: { code: "forbidden", message: "Access denied to this workspace", status: 403 },
      });
    }

    const ref = await getDb().collection("webhooks").add({
      api_key_id: req.apiKey.id,
      user_id: req.apiKey.user_id,
      url,
      events,
      workspace_id: workspace_id || null,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      data: { id: ref.id, url, events, workspace_id: workspace_id || null, status: "active" },
    });
  } catch (err) {
    console.error("POST /webhooks error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// DELETE /v1/webhooks/:id — delete webhook subscription
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await getDb().collection("webhooks").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Webhook not found", status: 404 },
      });
    }

    if (doc.data().api_key_id !== req.apiKey.id) {
      return res.status(403).json({
        error: { code: "forbidden", message: "Access denied", status: 403 },
      });
    }

    await getDb().collection("webhooks").doc(id).delete();
    res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("DELETE /webhooks error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
