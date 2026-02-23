const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess } = require("../middleware/auth");
const { mintTitleRecord, computeHash } = require("../utils/titleMint");

const router = express.Router();
function getDb() {
  return admin.firestore();
}

// ────────────────────────────────────────────────────────────────
// POST /v1/workers/import
// Register a Worker built on another platform.
// ────────────────────────────────────────────────────────────────
router.post("/workers/import", async (req, res) => {
  try {
    const { name, description, source, capabilities, rules, category, pricing, mint_title } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: { code: "bad_request", message: "name and description are required", status: 400 },
      });
    }

    // Resolve workspace from API key
    const workspaceIds = req.apiKey.workspace_ids || [];
    if (workspaceIds.length === 0) {
      return res.status(403).json({
        error: { code: "forbidden", message: "No workspace associated with this API key", status: 403 },
      });
    }
    const tenantId = workspaceIds[0];
    const uid = req.apiKey.user_id;

    const rulesHash = computeHash(rules || []);
    const metadataHash = computeHash({ name, description, capabilities, rules_hash: rulesHash, created_at: new Date().toISOString() });

    const workerId = "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const workerData = {
      name: String(name).substring(0, 200),
      description: String(description).substring(0, 2000),
      source: source || { platform: "custom" },
      capabilities: Array.isArray(capabilities) ? capabilities.slice(0, 20) : [],
      rules: Array.isArray(rules) ? rules.slice(0, 50) : [],
      category: category ? String(category).substring(0, 50) : "other",
      pricing: pricing || { model: "subscription", amount: 0, currency: "USD" },
      status: "registered",
      imported: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      rulesHash,
      metadataHash,
    };

    await getDb().doc(`tenants/${tenantId}/workers/${workerId}`).set(workerData);

    let titleRecord = null;
    if (mint_title) {
      titleRecord = await mintTitleRecord(tenantId, workerId, workerData);
    }

    return res.status(201).json({
      ok: true,
      worker: {
        id: workerId,
        name: workerData.name,
        status: workerData.status,
        imported: true,
        created_at: new Date().toISOString(),
        ...(titleRecord ? { title_record: titleRecord } : {}),
      },
    });
  } catch (err) {
    console.error("POST /workers/import error:", err);
    return res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /v1/workspaces/:workspace_id/workers/:workerId/mint
// Mint (or re-mint) a title record for an existing Worker.
// ────────────────────────────────────────────────────────────────
router.post("/:workspace_id/workers/:workerId/mint", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id, workerId } = req.params;
    const { memo } = req.body || {};

    const workerSnap = await getDb().doc(`tenants/${workspace_id}/workers/${workerId}`).get();
    if (!workerSnap.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Worker not found", status: 404 },
      });
    }

    const workerData = workerSnap.data();
    const titleRecord = await mintTitleRecord(workspace_id, workerId, workerData, memo || "");

    return res.json({ ok: true, title_record: titleRecord });
  } catch (err) {
    console.error("POST /workers/:id/mint error:", err);
    return res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /v1/workspaces/:workspace_id/workers/:workerId/title
// Get the title/provenance history for a Worker.
// ────────────────────────────────────────────────────────────────
router.get("/:workspace_id/workers/:workerId/title", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id, workerId } = req.params;

    const workerSnap = await getDb().doc(`tenants/${workspace_id}/workers/${workerId}`).get();
    if (!workerSnap.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Worker not found", status: 404 },
      });
    }

    const workerData = workerSnap.data();

    const recordsSnap = await getDb()
      .collection(`tenants/${workspace_id}/workers/${workerId}/titleRecords`)
      .orderBy("version", "desc")
      .get();

    const titleHistory = [];
    recordsSnap.forEach((doc) => {
      const d = doc.data();
      titleHistory.push({
        record_id: doc.id,
        version: d.version,
        tx_hash: d.txHash,
        chain: d.chain,
        minted_at: d.mintedAt?.toDate ? d.mintedAt.toDate().toISOString() : d.mintedAt,
        metadata_hash: d.metadataHash,
        rules_hash: d.rulesHash,
        memo: d.memo || "",
        previous_version_tx: d.previousVersionTx || null,
      });
    });

    return res.json({
      ok: true,
      worker_id: workerId,
      name: workerData.name,
      title_history: titleHistory,
    });
  } catch (err) {
    console.error("GET /workers/:id/title error:", err);
    return res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /v1/workspaces/:workspace_id/workers/:workerId/verify
// Verify a Worker's current config matches its latest title record.
// ────────────────────────────────────────────────────────────────
router.post("/:workspace_id/workers/:workerId/verify", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id, workerId } = req.params;
    const { rules_hash } = req.body || {};

    const workerSnap = await getDb().doc(`tenants/${workspace_id}/workers/${workerId}`).get();
    if (!workerSnap.exists) {
      return res.status(404).json({
        error: { code: "not_found", message: "Worker not found", status: 404 },
      });
    }

    const workerData = workerSnap.data();
    const latestTitle = workerData.latestTitleRecord;

    if (!latestTitle) {
      return res.json({ ok: true, verified: false, reason: "No title record exists for this Worker" });
    }

    // If caller provides a rules_hash, compare it
    if (rules_hash) {
      const currentRulesHash = computeHash(workerData.rules || []);
      const matches = rules_hash === currentRulesHash;
      return res.json({
        ok: true,
        verified: matches,
        matches_version: latestTitle.version,
        minted_at: latestTitle.mintedAt,
        current_rules_hash: currentRulesHash,
      });
    }

    // Otherwise, verify the metadata hash still matches
    const freshHash = computeHash({
      worker_id: workerId,
      name: workerData.name,
      description: workerData.description,
      capabilities: workerData.capabilities || [],
      rules_hash: computeHash(workerData.rules || []),
      created_at: workerData.createdAt || "",
      version: latestTitle.version,
    });

    const matches = freshHash === latestTitle.metadataHash;
    return res.json({
      ok: true,
      verified: matches,
      matches_version: latestTitle.version,
      minted_at: latestTitle.mintedAt,
    });
  } catch (err) {
    console.error("POST /workers/:id/verify error:", err);
    return res.status(500).json({
      error: { code: "internal_error", message: err.message, status: 500 },
    });
  }
});

module.exports = router;
