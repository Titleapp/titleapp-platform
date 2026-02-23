const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// POST /v1/workspaces/:workspace_id/chat — send message to workspace AI
router.post("/:workspace_id/chat", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { message, conversation_id } = req.body;

    if (!message) {
      return res.status(400).json({
        error: { code: "bad_request", message: "Missing message field", status: 400 },
      });
    }

    // Store the inbound message
    const convId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const msgRef = await getDb().collection("chatMessages").add({
      tenantId: workspace_id,
      conversationId: convId,
      role: "user",
      content: message,
      source: "api",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      data: {
        message_id: msgRef.id,
        conversation_id: convId,
        status: "queued",
        note: "Message received. AI processing is async — poll activity endpoint for response.",
      },
    });
  } catch (err) {
    console.error("POST /chat error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// POST /v1/workspaces/:workspace_id/draft — draft a communication
router.post("/:workspace_id/draft", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, recipient, subject, context } = req.body;

    if (!type || !recipient) {
      return res.status(400).json({
        error: { code: "bad_request", message: "Missing type or recipient", status: 400 },
      });
    }

    const ref = await getDb().collection("drafts").add({
      tenantId: workspace_id,
      type,
      recipient,
      subject: subject || null,
      context: context || null,
      status: "pending",
      source: "api",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      data: { draft_id: ref.id, status: "pending" },
    });
  } catch (err) {
    console.error("POST /draft error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// POST /v1/workspaces/:workspace_id/tasks — create a task
router.post("/:workspace_id/tasks", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { title, description, due_date, priority, assignee } = req.body;

    if (!title) {
      return res.status(400).json({
        error: { code: "bad_request", message: "Missing title", status: 400 },
      });
    }

    const ref = await getDb().collection("tasks").add({
      tenantId: workspace_id,
      title,
      description: description || null,
      dueDate: due_date || null,
      priority: priority || "medium",
      assignee: assignee || null,
      status: "open",
      source: "api",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id, title, status: "open" } });
  } catch (err) {
    console.error("POST /tasks error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/tasks — list tasks
router.get("/:workspace_id/tasks", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("tasks")
      .where("tenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (status) q = q.where("status", "==", status);

    const snap = await q.get();
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: tasks, total: tasks.length });
  } catch (err) {
    console.error("GET /tasks error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/activity — AI activity log
router.get("/:workspace_id/activity", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { limit = 50 } = req.query;

    const snap = await getDb().collection("raasPackages")
      .where("tenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .get();

    const activity = snap.docs.map(d => {
      const pkg = d.data();
      return {
        id: d.id,
        workflow_id: pkg.workflowId || null,
        status: pkg.status,
        model: pkg.model || null,
        created_at: pkg.createdAt || null,
        completed_at: pkg.completedAt || null,
      };
    });

    res.json({ data: activity, total: activity.length });
  } catch (err) {
    console.error("GET /activity error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/reports — reports data
router.get("/:workspace_id/reports", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const snap = await getDb().collection("imports")
      .where("tenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: reports, total: reports.length });
  } catch (err) {
    console.error("GET /reports error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

module.exports = router;
