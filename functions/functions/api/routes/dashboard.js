const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GET /v1/workspaces/:workspace_id/dashboard — KPIs, alerts, briefing
router.get("/:workspace_id/dashboard", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;

    // Aggregate basic KPIs from workspace data
    const [inventorySnap, customerSnap, appointmentSnap] = await Promise.all([
      getDb().collection("inventory").where("tenantId", "==", workspace_id).get(),
      getDb().collection("customers").where("tenantId", "==", workspace_id).get(),
      getDb().collection("appointments").where("tenantId", "==", workspace_id).get(),
    ]);

    const inventory = inventorySnap.docs.map(d => d.data());
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const availableCount = inventory.filter(i => i.status === "available").length;

    res.json({
      data: {
        workspace_id,
        kpis: {
          total_inventory: inventorySnap.size,
          available_inventory: availableCount,
          total_inventory_value: totalInventoryValue,
          total_customers: customerSnap.size,
          total_appointments: appointmentSnap.size,
        },
        alerts: [],
        briefing: `Workspace has ${inventorySnap.size} inventory items, ${customerSnap.size} customers, and ${appointmentSnap.size} appointments.`,
      },
    });
  } catch (err) {
    console.error("GET /dashboard error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/insights — AI-generated insights
router.get("/:workspace_id/insights", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;

    // Pull recent activity to generate insights
    const snap = await getDb().collection("raasPackages")
      .where("tenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const insights = snap.docs.map(d => {
      const pkg = d.data();
      return {
        id: d.id,
        type: pkg.workflowId || "general",
        status: pkg.status,
        created_at: pkg.createdAt || null,
      };
    });

    res.json({ data: insights, total: insights.length });
  } catch (err) {
    console.error("GET /insights error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

module.exports = router;
