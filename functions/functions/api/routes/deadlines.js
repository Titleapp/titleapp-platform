const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/deadlines — upcoming deadlines
router.get("/:workspace_id/deadlines", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { limit = 50 } = req.query;

    // Deadlines from tasks with due dates
    const snap = await getDb().collection("tasks")
      .where("tenantId", "==", workspace_id)
      .where("dueDate", "!=", null)
      .orderBy("dueDate", "asc")
      .limit(parseInt(limit))
      .get();

    const deadlines = snap.docs.map(d => {
      const task = d.data();
      return {
        id: d.id,
        title: task.title,
        due_date: task.dueDate,
        status: task.status,
        priority: task.priority || null,
      };
    });

    res.json({ data: deadlines, total: deadlines.length });
  } catch (err) {
    console.error("GET /deadlines error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
