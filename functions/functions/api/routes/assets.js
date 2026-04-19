const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

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

// ═══════════════════════════════════════════════════════════
// Business Assets (Spine — CODEX 49.1)
// Separate from DTC blockchain assets above
// ═══════════════════════════════════════════════════════════

// GET /v1/workspaces/:workspace_id/business-assets
router.get("/:workspace_id/business-assets", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("businessAssets").where("owner_workspace", "==", workspace_id);
    if (type) q = q.where("type", "==", type);
    q = q.orderBy("created_at", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const assets = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: assets, total: assets.length });
  } catch (err) {
    console.error("GET /business-assets error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/business-assets
router.post("/:workspace_id/business-assets", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { name, type, current_value, purchase_date, purchase_price, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { code: "bad_request", message: "name is required", status: 400 },
      });
    }

    const validTypes = ["vehicle", "property", "aircraft", "equipment", "intellectual_property", "other"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        error: { code: "bad_request", message: `type must be one of: ${validTypes.join(", ")}`, status: 400 },
      });
    }

    const ref = await getDb().collection("businessAssets").add({
      owner_workspace: workspace_id,
      name,
      type: type || "other",
      current_value: current_value || null,
      purchase_date: purchase_date || null,
      purchase_price: purchase_price || null,
      linked_documents: [],
      linked_transactions: [],
      linked_contacts: [],
      dtc_id: null,
      logbook_id: null,
      audit_trail_default: "firebase",
      notes: notes || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id } });
  } catch (err) {
    console.error("POST /business-assets error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// PUT /v1/workspaces/:workspace_id/business-assets/:assetId
router.put("/:workspace_id/business-assets/:assetId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, assetId } = req.params;
    const docRef = getDb().collection("businessAssets").doc(assetId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().owner_workspace !== workspace_id) {
      return res.status(404).json({
        error: { code: "not_found", message: "Business asset not found", status: 404 },
      });
    }

    const allowedFields = ["name", "type", "current_value", "purchase_date", "purchase_price", "linked_documents", "linked_transactions", "linked_contacts", "audit_trail_default", "notes"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updates);
    res.json({ data: { id: assetId, ...updates } });
  } catch (err) {
    console.error("PUT /business-assets error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/business-assets/:assetId/link-dtc
router.post("/:workspace_id/business-assets/:assetId/link-dtc", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, assetId } = req.params;
    const { dtc_id } = req.body;

    if (!dtc_id) {
      return res.status(400).json({
        error: { code: "bad_request", message: "dtc_id is required", status: 400 },
      });
    }

    const docRef = getDb().collection("businessAssets").doc(assetId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().owner_workspace !== workspace_id) {
      return res.status(404).json({
        error: { code: "not_found", message: "Business asset not found", status: 404 },
      });
    }

    // Verify the DTC record exists
    const dtcDoc = await getDb().collection("dtcs").doc(dtc_id).get();
    if (!dtcDoc.exists) {
      return res.status(400).json({
        error: { code: "bad_request", message: "dtc_id does not reference a valid DTC record", status: 400 },
      });
    }

    await docRef.update({
      dtc_id,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ data: { id: assetId, dtc_id, linked: true } });
  } catch (err) {
    console.error("POST /business-assets/link-dtc error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
