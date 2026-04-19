const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/contacts
router.get("/:workspace_id/contacts", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("contacts")
      .where("tenantId", "==", workspace_id)
      .where("schema_version", "==", "spine_v1");
    if (type) q = q.where("type", "==", type);
    q = q.orderBy("created_at", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: contacts, total: contacts.length });
  } catch (err) {
    console.error("GET /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/contacts
router.post("/:workspace_id/contacts", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { name, type, identity_id, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { code: "bad_request", message: "name is required", status: 400 },
      });
    }

    const validTypes = ["customer", "vendor", "investor", "tenant", "employee", "patient", "student", "contractor", "personal"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        error: { code: "bad_request", message: `type must be one of: ${validTypes.join(", ")}`, status: 400 },
      });
    }

    const ref = await getDb().collection("contacts").add({
      tenantId: workspace_id,
      schema_version: "spine_v1",
      name,
      type: type || "customer",
      identity_id: identity_id || null,
      workspaces: [workspace_id],
      added_by: req.apiKey.user_id,
      notes: notes || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id } });
  } catch (err) {
    console.error("POST /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// PUT /v1/workspaces/:workspace_id/contacts/:contactId
router.put("/:workspace_id/contacts/:contactId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().tenantId !== workspace_id || doc.data().schema_version !== "spine_v1") {
      return res.status(404).json({
        error: { code: "not_found", message: "Contact not found", status: 404 },
      });
    }

    const allowedFields = ["name", "type", "identity_id", "notes"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updates);
    res.json({ data: { id: contactId, ...updates } });
  } catch (err) {
    console.error("PUT /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// DELETE /v1/workspaces/:workspace_id/contacts/:contactId
router.delete("/:workspace_id/contacts/:contactId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().tenantId !== workspace_id || doc.data().schema_version !== "spine_v1") {
      return res.status(404).json({
        error: { code: "not_found", message: "Contact not found", status: 404 },
      });
    }

    await docRef.delete();
    res.json({ data: { id: contactId, deleted: true } });
  } catch (err) {
    console.error("DELETE /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/contacts/:contactId/link-identity
router.post("/:workspace_id/contacts/:contactId/link-identity", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const { identity_id } = req.body;

    if (!identity_id) {
      return res.status(400).json({
        error: { code: "bad_request", message: "identity_id is required", status: 400 },
      });
    }

    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().tenantId !== workspace_id || doc.data().schema_version !== "spine_v1") {
      return res.status(404).json({
        error: { code: "not_found", message: "Contact not found", status: 404 },
      });
    }

    await docRef.update({
      identity_id,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ data: { id: contactId, identity_id, linked: true } });
  } catch (err) {
    console.error("POST /contacts/link-identity error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
