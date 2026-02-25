/**
 * queryAccounting.js — Admin queries the ledger and accounting data.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

async function queryAccounting(req, res) {
  const db = getDb();
  const { action, filters } = req.body || {};

  switch (action) {
    case "summary": {
      const snap = await db.collection("accounting").doc("summary").get();
      return res.json({ ok: true, summary: snap.exists ? snap.data() : {} });
    }

    case "ledger": {
      const { startDate, endDate, category, verified, limit: lim } = filters || {};
      let q = db.collection("ledger").orderBy("createdAt", "desc");
      if (startDate) q = q.where("date", ">=", startDate);
      if (endDate) q = q.where("date", "<=", endDate);
      if (category) q = q.where("category", "==", category);
      if (typeof verified === "boolean") q = q.where("verified", "==", verified);
      q = q.limit(lim || 100);

      const snap = await q.get();
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.json({ ok: true, entries });
    }

    case "verify": {
      const { entryId, verifiedBy } = filters || {};
      if (!entryId) return res.status(400).json({ ok: false, error: "entryId required" });
      await db.collection("ledger").doc(entryId).update({
        verified: true,
        verifiedBy: verifiedBy || "admin",
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ ok: true });
    }

    case "recategorize": {
      const { entryId, newCategory, newSubcategory } = filters || {};
      if (!entryId || !newCategory)
        return res.status(400).json({ ok: false, error: "entryId and newCategory required" });
      await db.collection("ledger").doc(entryId).update({
        category: newCategory,
        subcategory: newSubcategory || null,
        autoCategorized: false,
        categorizedBy: "admin_manual",
      });
      return res.json({ ok: true });
    }

    case "payments": {
      const lim = (filters || {}).limit || 50;
      const snap = await db
        .collection("payments")
        .orderBy("timestamp", "desc")
        .limit(lim)
        .get();
      const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.json({ ok: true, payments });
    }

    case "creatorPayouts": {
      const lim = (filters || {}).limit || 50;
      const snap = await db
        .collection("creatorPayouts")
        .orderBy("timestamp", "desc")
        .limit(lim)
        .get();
      const payouts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.json({ ok: true, payouts });
    }

    default:
      return res.status(400).json({ ok: false, error: "Unknown action" });
  }
}

module.exports = { queryAccounting };
