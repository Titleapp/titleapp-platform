const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// POST /v1/workspaces/:workspace_id/b2b/deploy — deploy workers to a recipient
router.post("/:workspace_id/b2b/deploy", requireWorkspaceAccess, requireScope("admin"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { recipientEmail, workerIds, workerName, permissions } = req.body;

    if (!recipientEmail || !workerIds || !workerIds.length) {
      return res.status(400).json({
        error: { code: "bad_request", message: "recipientEmail and workerIds are required", status: 400 },
      });
    }

    // Look up sender org name from workspace
    const memSnap = await getDb().collection("memberships")
      .where("tenantId", "==", workspace_id)
      .where("status", "==", "active")
      .limit(1)
      .get();

    let senderOrgName = "Unknown";
    if (!memSnap.empty) {
      const userId = memSnap.docs[0].data().userId;
      const wsDoc = await getDb().collection("users").doc(userId).collection("workspaces").doc(workspace_id).get();
      if (wsDoc.exists) senderOrgName = wsDoc.data().name || "Unknown";
    }

    const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create deployment doc
    const deployment = {
      id: deploymentId,
      senderTenantId: workspace_id,
      senderOrgName,
      workerIds,
      workerName: workerName || "Shared Worker",
      permissions: {
        recipientCanExport: permissions?.recipientCanExport ?? false,
        recipientCanRemove: permissions?.recipientCanRemove ?? true,
        dataRetentionDays: permissions?.dataRetentionDays ?? 365,
      },
      status: "active",
      recipientCount: 1,
      activeRecipientCount: 0,
      analytics: {
        totalInteractions: 0,
        avgInteractionsPerRecipient: 0,
      },
      tier: "starter",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Look up recipient by email
    let recipientUserId = null;
    try {
      const userRecord = await admin.auth().getUserByEmail(recipientEmail);
      recipientUserId = userRecord.uid;
    } catch (_) {
      // User doesn't exist yet — pending
    }

    const recipientDoc = {
      deploymentId,
      senderTenantId: workspace_id,
      senderOrgName,
      recipientEmail,
      recipientUserId,
      workerIds,
      workerName: workerName || "Shared Worker",
      vertical: "consumer",
      permissions: deployment.permissions,
      status: recipientUserId ? "active" : "pending",
      deployedAt: admin.firestore.FieldValue.serverTimestamp(),
      acceptedAt: null,
    };

    const batch = getDb().batch();
    batch.set(getDb().collection("b2bDeployments").doc(deploymentId), deployment);
    batch.set(getDb().collection("b2bRecipients").doc(), recipientDoc);
    await batch.commit();

    if (recipientUserId) {
      deployment.activeRecipientCount = 1;
    }

    res.status(201).json({ data: deployment });
  } catch (err) {
    console.error("POST /b2b/deploy error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/b2b/deployments — list all deployments
router.get("/:workspace_id/b2b/deployments", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    let query = getDb().collection("b2bDeployments")
      .where("senderTenantId", "==", workspace_id)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (offset > 0) {
      // Simple offset via skip (fine for small datasets)
      query = query.offset(offset);
    }

    const snap = await query.get();
    const deployments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Get recipient counts per deployment
    for (const dep of deployments) {
      const recipSnap = await getDb().collection("b2bRecipients")
        .where("deploymentId", "==", dep.id)
        .get();
      dep.recipientCount = recipSnap.size;
      dep.activeRecipientCount = recipSnap.docs.filter(r => r.data().status === "active").length;
    }

    res.json({ data: deployments, total: deployments.length, offset });
  } catch (err) {
    console.error("GET /b2b/deployments error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/b2b/deployments/:id — single deployment
router.get("/:workspace_id/b2b/deployments/:deployment_id", requireWorkspaceAccess, async (req, res) => {
  try {
    const { deployment_id } = req.params;
    const doc = await getDb().collection("b2bDeployments").doc(deployment_id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Deployment not found", status: 404 },
      });
    }

    const data = { id: doc.id, ...doc.data() };

    // Get recipients
    const recipSnap = await getDb().collection("b2bRecipients")
      .where("deploymentId", "==", deployment_id)
      .get();
    data.recipients = recipSnap.docs.map(r => ({
      id: r.id,
      email: r.data().recipientEmail,
      status: r.data().status,
      acceptedAt: r.data().acceptedAt,
      deployedAt: r.data().deployedAt,
    }));

    res.json({ data });
  } catch (err) {
    console.error("GET /b2b/deployments/:id error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// PUT /v1/workspaces/:workspace_id/b2b/deployments/:id — update deployment
router.put("/:workspace_id/b2b/deployments/:deployment_id", requireWorkspaceAccess, requireScope("admin"), async (req, res) => {
  try {
    const { deployment_id } = req.params;
    const { workerIds, permissions, workerName } = req.body;

    const ref = getDb().collection("b2bDeployments").doc(deployment_id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Deployment not found", status: 404 },
      });
    }

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (workerIds) updates.workerIds = workerIds;
    if (workerName) updates.workerName = workerName;
    if (permissions) {
      updates.permissions = {
        recipientCanExport: permissions.recipientCanExport ?? doc.data().permissions?.recipientCanExport ?? false,
        recipientCanRemove: permissions.recipientCanRemove ?? doc.data().permissions?.recipientCanRemove ?? true,
        dataRetentionDays: permissions.dataRetentionDays ?? doc.data().permissions?.dataRetentionDays ?? 365,
      };
    }

    await ref.update(updates);

    // Also update recipient docs if workerIds changed
    if (workerIds) {
      const recipSnap = await getDb().collection("b2bRecipients")
        .where("deploymentId", "==", deployment_id)
        .get();
      const batch = getDb().batch();
      recipSnap.docs.forEach(r => {
        batch.update(r.ref, { workerIds, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
    }

    const updated = await ref.get();
    res.json({ data: { id: updated.id, ...updated.data() } });
  } catch (err) {
    console.error("PUT /b2b/deployments/:id error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// DELETE /v1/workspaces/:workspace_id/b2b/deployments/:id — revoke deployment
router.delete("/:workspace_id/b2b/deployments/:deployment_id", requireWorkspaceAccess, requireScope("admin"), async (req, res) => {
  try {
    const { deployment_id } = req.params;
    const ref = getDb().collection("b2bDeployments").doc(deployment_id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Deployment not found", status: 404 },
      });
    }

    await ref.update({
      status: "revoked",
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Revoke all recipient entries
    const recipSnap = await getDb().collection("b2bRecipients")
      .where("deploymentId", "==", deployment_id)
      .get();
    const batch = getDb().batch();
    recipSnap.docs.forEach(r => {
      batch.update(r.ref, { status: "revoked", revokedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();

    res.json({ ok: true, message: "Deployment revoked" });
  } catch (err) {
    console.error("DELETE /b2b/deployments/:id error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/b2b/analytics — aggregate analytics
router.get("/:workspace_id/b2b/analytics", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const depSnap = await getDb().collection("b2bDeployments")
      .where("senderTenantId", "==", workspace_id)
      .get();

    let totalDeployments = 0;
    let activeDeployments = 0;
    let totalRecipients = 0;
    let activeRecipients = 0;
    let totalInteractions = 0;

    depSnap.docs.forEach(d => {
      const data = d.data();
      totalDeployments++;
      if (data.status === "active") activeDeployments++;
      totalRecipients += data.recipientCount || 0;
      activeRecipients += data.activeRecipientCount || 0;
      totalInteractions += data.analytics?.totalInteractions || 0;
    });

    res.json({
      data: {
        totalDeployments,
        activeDeployments,
        totalRecipients,
        activeRecipients,
        totalInteractions,
        avgInteractionsPerRecipient: activeRecipients > 0 ? Math.round(totalInteractions / activeRecipients * 10) / 10 : 0,
      },
    });
  } catch (err) {
    console.error("GET /b2b/analytics error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// GET /v1/workspaces/:workspace_id/b2b/analytics/:id — per-deployment analytics
router.get("/:workspace_id/b2b/analytics/:deployment_id", requireWorkspaceAccess, async (req, res) => {
  try {
    const { deployment_id } = req.params;
    const doc = await getDb().collection("b2bDeployments").doc(deployment_id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Deployment not found", status: 404 },
      });
    }

    const data = doc.data();

    // Get recipient breakdown
    const recipSnap = await getDb().collection("b2bRecipients")
      .where("deploymentId", "==", deployment_id)
      .get();

    const recipients = recipSnap.docs.map(r => {
      const rd = r.data();
      return {
        email: rd.recipientEmail,
        status: rd.status,
        acceptedAt: rd.acceptedAt,
        deployedAt: rd.deployedAt,
      };
    });

    res.json({
      data: {
        deploymentId: deployment_id,
        workerIds: data.workerIds,
        workerName: data.workerName,
        analytics: data.analytics || {},
        recipients,
        recipientCount: recipients.length,
        activeCount: recipients.filter(r => r.status === "active").length,
        pendingCount: recipients.filter(r => r.status === "pending").length,
      },
    });
  } catch (err) {
    console.error("GET /b2b/analytics/:id error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// POST /v1/workspaces/:workspace_id/b2b/bulk-deploy — deploy to multiple recipients
router.post("/:workspace_id/b2b/bulk-deploy", requireWorkspaceAccess, requireScope("admin"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { recipients, defaultWorkerIds, defaultPermissions, workerName } = req.body;

    if (!recipients || !recipients.length) {
      return res.status(400).json({
        error: { code: "bad_request", message: "recipients array is required", status: 400 },
      });
    }

    if (!defaultWorkerIds || !defaultWorkerIds.length) {
      return res.status(400).json({
        error: { code: "bad_request", message: "defaultWorkerIds is required", status: 400 },
      });
    }

    // Look up sender org name
    const memSnap = await getDb().collection("memberships")
      .where("tenantId", "==", workspace_id)
      .where("status", "==", "active")
      .limit(1)
      .get();

    let senderOrgName = "Unknown";
    if (!memSnap.empty) {
      const userId = memSnap.docs[0].data().userId;
      const wsDoc = await getDb().collection("users").doc(userId).collection("workspaces").doc(workspace_id).get();
      if (wsDoc.exists) senderOrgName = wsDoc.data().name || "Unknown";
    }

    const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const permissions = {
      recipientCanExport: defaultPermissions?.recipientCanExport ?? false,
      recipientCanRemove: defaultPermissions?.recipientCanRemove ?? true,
      dataRetentionDays: defaultPermissions?.dataRetentionDays ?? 365,
    };

    const deployment = {
      id: deploymentId,
      senderTenantId: workspace_id,
      senderOrgName,
      workerIds: defaultWorkerIds,
      workerName: workerName || "Shared Worker",
      permissions,
      status: "active",
      recipientCount: recipients.length,
      activeRecipientCount: 0,
      analytics: { totalInteractions: 0, avgInteractionsPerRecipient: 0 },
      tier: "business",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = getDb().batch();
    batch.set(getDb().collection("b2bDeployments").doc(deploymentId), deployment);

    let activeCount = 0;
    for (const recip of recipients) {
      const email = recip.email;
      const wIds = recip.workerIds || defaultWorkerIds;

      let recipientUserId = null;
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        recipientUserId = userRecord.uid;
        activeCount++;
      } catch (_) {
        // User doesn't exist yet
      }

      batch.set(getDb().collection("b2bRecipients").doc(), {
        deploymentId,
        senderTenantId: workspace_id,
        senderOrgName,
        recipientEmail: email,
        recipientUserId,
        workerIds: wIds,
        workerName: workerName || "Shared Worker",
        vertical: "consumer",
        permissions: recip.permissions || permissions,
        status: recipientUserId ? "active" : "pending",
        deployedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedAt: null,
      });
    }

    await batch.commit();

    deployment.activeRecipientCount = activeCount;

    res.status(201).json({
      data: deployment,
      summary: {
        total: recipients.length,
        active: activeCount,
        pending: recipients.length - activeCount,
      },
    });
  } catch (err) {
    console.error("POST /b2b/bulk-deploy error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// POST /v1/workspaces/:workspace_id/b2b/accept — recipient accepts a deployment
router.post("/:workspace_id/b2b/accept", requireWorkspaceAccess, async (req, res) => {
  try {
    const { deploymentId } = req.body;

    if (!deploymentId) {
      return res.status(400).json({
        error: { code: "bad_request", message: "deploymentId is required", status: 400 },
      });
    }

    // Find the recipient doc for this user + deployment
    const userId = req.apiKey.user_id;
    const recipSnap = await getDb().collection("b2bRecipients")
      .where("deploymentId", "==", deploymentId)
      .where("recipientUserId", "==", userId)
      .limit(1)
      .get();

    if (recipSnap.empty) {
      return res.status(404).json({
        error: { code: "not_found", message: "No deployment found for this user", status: 404 },
      });
    }

    const recipRef = recipSnap.docs[0].ref;
    await recipRef.update({
      status: "active",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, message: "Deployment accepted" });
  } catch (err) {
    console.error("POST /b2b/accept error:", err);
    res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

module.exports = router;
