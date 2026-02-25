/**
 * aggregateAnalytics.js — Scheduled daily: rollup stats into analytics/ collection.
 */

const admin = require("firebase-admin");
const { logActivity } = require("./logActivity");

function getDb() { return admin.firestore(); }

async function aggregateAnalytics() {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);

  // Count users
  const usersSnap = await db.collection("users").get();
  const totalUsers = usersSnap.size;

  // Count today's signups
  const todayStart = new Date(today + "T00:00:00Z");
  const signupsSnap = await db
    .collection("users")
    .where("createdAt", ">=", todayStart)
    .get();
  const signupsToday = signupsSnap.size;

  // Count workers (from marketplace or raasPackages)
  const workersSnap = await db.collection("raasPackages").get();
  const totalWorkers = workersSnap.size;

  // Count published workers
  const publishedSnap = await db
    .collection("marketplace")
    .where("status", "==", "published")
    .get();
  const publishedWorkers = publishedSnap.size;

  // API calls — count from rate_limits collection (approximate)
  let apiCalls24h = 0;
  const hourKey = `${today.replace(/-/g, "")}_${String(now.getUTCHours()).padStart(2, "0")}`;
  const rateLimitsSnap = await db.collection("rate_limits").get();
  rateLimitsSnap.forEach((doc) => {
    const data = doc.data();
    if (data.count) apiCalls24h += data.count;
  });

  // Error rate — estimate from activityFeed errors
  const errorsSnap = await db
    .collection("activityFeed")
    .where("severity", "==", "error")
    .where("timestamp", ">=", todayStart)
    .get();
  const errorsToday = errorsSnap.size;
  const errorRate = apiCalls24h > 0 ? (errorsToday / apiCalls24h) * 100 : 0;

  // Active users — users with recent activity
  let activeUsers = 0;
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const activeSnap = await db
    .collection("users")
    .where("lastLoginAt", ">=", thirtyDaysAgo)
    .get();
  activeUsers = activeSnap.size;

  const dailyData = {
    date: today,
    totalUsers,
    activeUsers,
    signupsToday,
    totalWorkers,
    workersCreated: totalWorkers,
    workersCreatedToday: 0,
    workersPublished: publishedWorkers,
    apiCalls24h,
    errorsToday,
    errorRate: Math.round(errorRate * 10) / 10,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Write daily analytics
  await db.collection("analytics").doc(`daily_${today}`).set(dailyData, { merge: true });

  // Weekly rollup
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0) {
    const weekId = `${now.getFullYear()}-W${String(Math.ceil((now.getDate()) / 7)).padStart(2, "0")}`;
    await db.collection("analytics").doc(`weekly_${weekId}`).set({
      weekId,
      totalUsers,
      activeUsers,
      workersPublished: publishedWorkers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // Monthly rollup
  if (now.getDate() === 1) {
    const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await db.collection("analytics").doc(`monthly_${monthId}`).set({
      monthId,
      totalUsers,
      activeUsers,
      workersPublished: publishedWorkers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await logActivity("system", `Daily analytics aggregated: ${totalUsers} users, ${publishedWorkers} published workers`, "info");

  return { ok: true, date: today, data: dailyData };
}

module.exports = { aggregateAnalytics };
