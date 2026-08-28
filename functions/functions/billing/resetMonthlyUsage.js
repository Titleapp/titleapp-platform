/**
 * resetMonthlyUsage.js — Scheduled Cloud Function (1st of month).
 * Archives usage history and resets counters.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");
const pricing = require("../config/pricing");
const { computeTenantUsage } = require("../services/billing/boxPlanUsage");

function getDb() { return admin.firestore(); }

/**
 * CODEX 76 §4 — anticipated-vs-actual usage report, box-plan tenants only.
 * Reporting only — does NOT charge anyone (see boxPlanUsage.js header for
 * why: no metered Stripe price exists yet for this). Framed positively per
 * Sean's explicit direction: heavy usage is success, not a warning.
 */
async function sendBoxPlanUsageReports(db, closingMonthKey) {
  const { sendViaSendGrid } = require("../services/marketingService/emailNotify");
  const tenantsSnap = await db.collection("tenants").where("boxPlanStatus", "==", "active").get();

  let sent = 0, skipped = 0, failed = 0;
  for (const tenantDoc of tenantsSnap.docs) {
    try {
      const usage = await computeTenantUsage(db, tenantDoc, closingMonthKey);
      if (!usage.billingEmail) { skipped++; continue; }

      const overLine = usage.actualTotal > usage.includedTotal
        ? `Your account used ${usage.actualTotal} interactions this month against an included allowance of ${usage.includedTotal} — that's ${Math.round(100 * (usage.actualTotal - usage.includedTotal) / Math.max(1, usage.includedTotal))}% more than included, which reflects strong engagement.`
        : `Your account used ${usage.actualTotal} of ${usage.includedTotal} included interactions this month.`;

      await sendViaSendGrid({
        to: usage.billingEmail,
        subject: `${usage.tenantName} — SOCIII usage summary for ${closingMonthKey}`,
        textBody: `${overLine}\n\nActive members: ${usage.activeMembers}\n\nThis is a usage summary, not an invoice. Nothing has been charged automatically — if this account is on a plan where overage is billed, we'll follow up separately with the specifics before anything is invoiced.`,
      });
      sent++;
    } catch (err) {
      console.error(`[boxPlanUsageReport] tenant ${tenantDoc.id} failed:`, err.message);
      failed++;
    }
  }
  return { sent, skipped, failed, total: tenantsSnap.size };
}

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
      monthlyAllowance: data.monthlyCredits || pricing.subscriptionTiers.free.creditsIncluded,
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

  // CODEX 76 — box-plan usage visibility report. Independent of the
  // per-user reset above (different collection, different tenants), same
  // closing-month boundary, same monthly cadence as CODEX 76 §4 specified.
  let boxPlanReport = null;
  try {
    boxPlanReport = await sendBoxPlanUsageReports(db, monthId);
  } catch (err) {
    console.error("[resetMonthlyUsage] box-plan usage report pass failed (non-blocking):", err.message);
  }

  await logActivity(
    "system",
    `Monthly reset: ${resetCount} user usage counters archived and reset.` +
      (boxPlanReport ? ` Box-plan usage reports: ${boxPlanReport.sent} sent, ${boxPlanReport.skipped} skipped (no billing email), ${boxPlanReport.failed} failed.` : ""),
    "info"
  );

  return { ok: true, resetCount, month: monthId, boxPlanReport };
}

module.exports = { resetMonthlyUsage };
