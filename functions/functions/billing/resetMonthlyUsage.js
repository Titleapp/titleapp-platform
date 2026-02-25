/**
 * resetMonthlyUsage.js — Scheduled Cloud Function (1st of month).
 * Archives usage history and resets counters.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function resetMonthlyUsage() {
  const db = getDb();
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthId = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  // Get all users with usage > 0
  const usersSnap = await db
    .collection("users")
    .where("usageThisMonth", ">", 0)
    .get();

  let resetCount = 0;
  const batch = db.batch();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();

    // Archive to usageHistory
    const archiveRef = db
      .collection("usageHistory")
      .doc(`${userDoc.id}_${monthId}`);
    batch.set(archiveRef, {
      userId: userDoc.id,
      month: monthId,
      totalCalls: data.usageThisMonth || 0,
      tier: data.tier || "free",
      monthlyAllowance: data.monthlyCredits || 50,
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Reset counter
    batch.update(userDoc.ref, { usageThisMonth: 0 });
    resetCount++;
  }

  if (resetCount > 0) {
    await batch.commit();
  }

  // Also reset accounting MTD
  const summaryRef = db.collection("accounting").doc("summary");
  const summarySnap = await summaryRef.get();
  if (summarySnap.exists) {
    const data = summarySnap.data();
    // Archive previous month accounting
    await db.collection("accounting").doc(`archive_${monthId}`).set({
      month: monthId,
      revenue: data.revenue || {},
      expenses: data.expenses || {},
      netIncome: data.netIncome || {},
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Reset MTD
    await summaryRef.set(
      {
        revenue: { ...data.revenue, mtd: 0, byCategory: {} },
        expenses: { ...data.expenses, mtd: 0, byCategory: {} },
        netIncome: { ...data.netIncome, mtd: 0 },
        lastReconciled: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await logActivity(
    "system",
    `Monthly reset: ${resetCount} user usage counters archived and reset.`,
    "info"
  );

  return { ok: true, resetCount, month: monthId };
}

module.exports = { resetMonthlyUsage };
