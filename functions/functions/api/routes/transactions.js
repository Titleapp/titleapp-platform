const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

const router = express.Router();
function getDb() { return admin.firestore(); }

// GAAP category assignment helper
function assignGaapFields(direction, category) {
  const cat = (category || "").toLowerCase();
  let gaap_category = "expense";
  let debit_account = "expense:" + cat;
  let credit_account = "cash";

  if (direction === "income") {
    gaap_category = "revenue";
    debit_account = "cash";
    credit_account = "revenue:" + cat;
  } else if (direction === "transfer") {
    gaap_category = "asset";
    debit_account = "asset:" + cat;
    credit_account = "cash";
  }

  return { gaap_category, debit_account, credit_account };
}

// Write-through: update accounting/summary when transactions change
async function updateAccountingSummary(workspace_id) {
  try {
    const snap = await getDb().collection("transactions")
      .where("tenantId", "==", workspace_id)
      .where("status", "in", ["cleared", "reconciled"])
      .get();

    let revenueMtd = 0;
    let expenseMtd = 0;
    const revByCategory = {};
    const expByCategory = {};

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const doc of snap.docs) {
      const d = doc.data();
      const txDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
      if (txDate < monthStart) continue;

      const cat = d.category || "uncategorized";
      if (d.direction === "income") {
        revenueMtd += d.amount || 0;
        revByCategory[cat] = (revByCategory[cat] || 0) + (d.amount || 0);
      } else if (d.direction === "expense") {
        expenseMtd += d.amount || 0;
        expByCategory[cat] = (expByCategory[cat] || 0) + (d.amount || 0);
      }
    }

    await getDb().collection("accounting").doc("summary").set({
      revenue: { mtd: revenueMtd, byCategory: revByCategory },
      expenses: { mtd: expenseMtd, byCategory: expByCategory },
      netIncome: { mtd: revenueMtd - expenseMtd },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error("updateAccountingSummary error:", err);
  }
}

// GET /v1/workspaces/:workspace_id/transactions — transaction pipeline
router.get("/:workspace_id/transactions", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("transactions").where("tenantId", "==", workspace_id);
    if (status) q = q.where("status", "==", status);
    q = q.orderBy("createdAt", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: transactions, total: transactions.length });
  } catch (err) {
    console.error("GET /transactions error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/transactions
router.post("/:workspace_id/transactions", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { amount, direction, category, description, date, contact_id, asset_id, document_id, source } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        error: { code: "bad_request", message: "amount is required", status: 400 },
      });
    }
    if (!direction || !["income", "expense", "transfer"].includes(direction)) {
      return res.status(400).json({
        error: { code: "bad_request", message: "direction must be income, expense, or transfer", status: 400 },
      });
    }

    const gaap = assignGaapFields(direction, category || "general");

    const ref = await getDb().collection("transactions").add({
      tenantId: workspace_id,
      amount: Math.abs(amount),
      direction,
      category: category || "uncategorized",
      description: description || "",
      date: date ? new Date(date) : admin.firestore.FieldValue.serverTimestamp(),
      contact_id: contact_id || null,
      asset_id: asset_id || null,
      document_id: document_id || null,
      source: source || "manual",
      status: "pending",
      debit_account: gaap.debit_account,
      credit_account: gaap.credit_account,
      gaap_category: gaap.gaap_category,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Fire-and-forget write-through to accounting/summary
    updateAccountingSummary(workspace_id);

    res.status(201).json({ data: { id: ref.id } });
  } catch (err) {
    console.error("POST /transactions error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// PUT /v1/workspaces/:workspace_id/transactions/:txId
router.put("/:workspace_id/transactions/:txId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, txId } = req.params;
    const docRef = getDb().collection("transactions").doc(txId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({
        error: { code: "not_found", message: "Transaction not found", status: 404 },
      });
    }

    const allowedFields = ["amount", "direction", "category", "description", "date", "contact_id", "asset_id", "document_id", "status"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Recalculate GAAP fields if direction or category changed
    const currentData = doc.data();
    const dir = updates.direction || currentData.direction;
    const cat = updates.category || currentData.category;
    const gaap = assignGaapFields(dir, cat);
    updates.debit_account = gaap.debit_account;
    updates.credit_account = gaap.credit_account;
    updates.gaap_category = gaap.gaap_category;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (updates.amount !== undefined) updates.amount = Math.abs(updates.amount);

    await docRef.update(updates);

    // Fire-and-forget write-through to accounting/summary
    updateAccountingSummary(workspace_id);

    res.json({ data: { id: txId, ...updates } });
  } catch (err) {
    console.error("PUT /transactions error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/transactions/import-statement — STUB
router.post("/:workspace_id/transactions/import-statement", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  // Phase C will implement the full PDF/CSV parser.
  // For now, accept the request and return a placeholder.
  res.status(202).json({
    data: {
      status: "accepted",
      message: "Statement import received. Full parsing available in a future update.",
      job_id: null,
    },
  });
});

module.exports = router;
