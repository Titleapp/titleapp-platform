/**
 * stalledDealCheck.js — Scheduled hourly: flag deals with no activity for 7+ days.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function stalledDealCheck() {
  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const activeStages = ["LEAD", "CONTACTED", "DEMO_SCHEDULED", "DEMO_COMPLETED", "PROPOSAL_SENT", "NEGOTIATING"];

  const dealsSnap = await db
    .collection("pipeline")
    .doc("b2b")
    .collection("deals")
    .where("stage", "in", activeStages)
    .get();

  let stalledCount = 0;

  for (const dealDoc of dealsSnap.docs) {
    const deal = dealDoc.data();
    const lastActivity = deal.lastActivityAt?.toDate?.() || new Date(deal.lastActivityAt || 0);

    if (lastActivity < sevenDaysAgo && !deal.stalledSince) {
      await dealDoc.ref.update({
        stalledSince: admin.firestore.FieldValue.serverTimestamp(),
      });
      stalledCount++;
    }
  }

  if (stalledCount > 0) {
    await logActivity(
      "pipeline",
      `${stalledCount} B2B deal(s) flagged as stalled (7+ days inactive)`,
      "warning"
    );
  }

  return { ok: true, stalledCount };
}

module.exports = { stalledDealCheck };
