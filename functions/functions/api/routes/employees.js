const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/employees
router.get("/:workspace_id/employees", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, employment_type, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("employees").where("tenantId", "==", workspace_id);
    if (status) q = q.where("status", "==", status);
    if (employment_type) q = q.where("employment_type", "==", employment_type);
    q = q.orderBy("created_at", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const employees = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: employees, total: employees.length });
  } catch (err) {
    console.error("GET /employees error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/employees
router.post("/:workspace_id/employees", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { contact_id, role, employment_type, start_date, status, schedule, documents } = req.body;

    if (!contact_id) {
      return res.status(400).json({
        error: { code: "bad_request", message: "contact_id is required — every employee links to a contact", status: 400 },
      });
    }
    if (!role) {
      return res.status(400).json({
        error: { code: "bad_request", message: "role is required", status: 400 },
      });
    }

    const validTypes = ["full_time", "part_time", "contractor", "volunteer"];
    const empType = employment_type || "full_time";
    if (!validTypes.includes(empType)) {
      return res.status(400).json({
        error: { code: "bad_request", message: `employment_type must be one of: ${validTypes.join(", ")}`, status: 400 },
      });
    }

    // Verify the contact exists
    const contactDoc = await getDb().collection("contacts").doc(contact_id).get();
    if (!contactDoc.exists || contactDoc.data().tenantId !== workspace_id) {
      return res.status(400).json({
        error: { code: "bad_request", message: "contact_id does not reference a valid contact in this workspace", status: 400 },
      });
    }

    const ref = await getDb().collection("employees").add({
      tenantId: workspace_id,
      contact_id,
      role,
      employment_type: empType,
      start_date: start_date || new Date().toISOString(),
      end_date: null,
      status: status || "onboarding",
      compensation: null,
      documents: documents || [],
      schedule: schedule || null,
      compliance_flags: [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id } });
  } catch (err) {
    console.error("POST /employees error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// PUT /v1/workspaces/:workspace_id/employees/:employeeId
router.put("/:workspace_id/employees/:employeeId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, employeeId } = req.params;
    const docRef = getDb().collection("employees").doc(employeeId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({
        error: { code: "not_found", message: "Employee not found", status: 404 },
      });
    }

    const allowedFields = ["role", "employment_type", "start_date", "end_date", "status", "compensation", "documents", "schedule", "compliance_flags"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updates);
    res.json({ data: { id: employeeId, ...updates } });
  } catch (err) {
    console.error("PUT /employees error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// GET /v1/workspaces/:workspace_id/employees/:employeeId/compliance
router.get("/:workspace_id/employees/:employeeId/compliance", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id, employeeId } = req.params;
    const doc = await getDb().collection("employees").doc(employeeId).get();

    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({
        error: { code: "not_found", message: "Employee not found", status: 404 },
      });
    }

    const data = doc.data();
    res.json({
      data: {
        id: employeeId,
        role: data.role,
        status: data.status,
        compliance_flags: data.compliance_flags || [],
        documents: data.documents || [],
        missing_documents: [],
      },
    });
  } catch (err) {
    console.error("GET /employees/compliance error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
