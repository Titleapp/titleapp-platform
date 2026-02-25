/**
 * creatorHealthCheck.js — Scheduled daily: recalculate health scores for all creators.
 *
 * Health score (0-100):
 * - Login recency: 30pts (7d=30, 14d=20, 30d=10, 30d+=0)
 * - Workers published: 25pts (3+=25, 2=20, 1=15, 0=0)
 * - Revenue: 25pts (any=25, 0=0)
 * - Activity recency: 20pts (7d=20, 14d=10, 30d=5, 30d+=0)
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

function daysSince(date) {
  if (!date) return 999;
  const d = date.toDate ? date.toDate() : new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function calcHealthScore(creator) {
  let score = 0;
  const loginDays = daysSince(creator.lastLoginAt);
  if (loginDays <= 7) score += 30;
  else if (loginDays <= 14) score += 20;
  else if (loginDays <= 30) score += 10;

  const published = creator.workersPublished || 0;
  if (published >= 3) score += 25;
  else if (published >= 2) score += 20;
  else if (published >= 1) score += 15;

  if ((creator.totalRevenue || 0) > 0) score += 25;

  const actDays = daysSince(creator.lastActivityAt || creator.lastLoginAt);
  if (actDays <= 7) score += 20;
  else if (actDays <= 14) score += 10;
  else if (actDays <= 30) score += 5;

  return score;
}

function calcChurnRisk(score, creator) {
  if (score < 30) return "high";
  if (score < 50) return "medium";
  return "low";
}

async function creatorHealthCheck() {
  const db = getDb();
  const creatorsSnap = await db
    .collection("pipeline")
    .doc("creators")
    .collection("users")
    .get();

  let updated = 0;
  const batch = db.batch();

  for (const creatorDoc of creatorsSnap.docs) {
    const creator = creatorDoc.data();
    const healthScore = calcHealthScore(creator);
    const churnRisk = calcChurnRisk(healthScore, creator);

    // Determine stage transitions
    let newStage = creator.stage;
    const loginDays = daysSince(creator.lastLoginAt);
    if (loginDays >= 30 && !["CHURNED", "POWER_USER"].includes(creator.stage)) {
      newStage = "CHURNED";
    } else if (loginDays >= 7 && loginDays < 30 && !["STALLED", "CHURNED", "POWER_USER", "FIRST_REVENUE"].includes(creator.stage)) {
      newStage = "STALLED";
    }

    batch.update(creatorDoc.ref, {
      healthScore,
      churnRisk,
      stage: newStage,
      healthUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
    await logActivity("pipeline", `Creator health check: ${updated} scores updated`, "info");
  }

  return { ok: true, updated };
}

module.exports = { creatorHealthCheck };
