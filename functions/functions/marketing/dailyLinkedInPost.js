// ----------------------------------------------------------------------------
// Every-Other-Day LinkedIn Marketing Worker
// ----------------------------------------------------------------------------
// Posts ONE "OF for Smart People" caption to a connected personal LinkedIn
// profile, on the same day-of-year cadence as dailyXPost.js so all channels
// stay thematically in sync. Text-only: the LinkedIn integration
// (services/social/linkedin.js) requests scope `w_member_social`, which
// only supports text posts to a member's own feed — no company-page
// posting, no media attachment. See that file's header for why.
//
// Auth: per-user LinkedIn OAuth, already connected via Settings. Target
// user: Firestore doc `config/marketingWorker` field `socialPosterUserId`
// (Sean, connected 2026-09-15). If that field is unset or the account isn't
// connected, this worker logs an error and no-ops — it does not crash the
// scheduler.
//
// Kill switch: Firestore doc `config/marketingWorker` field
// `linkedInEveryOtherDayEnabled` (defaults ON; set to false to pause).
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");
const { ROSTER, pickForToday, TAGLINE } = require("./dailyXPost");

async function runDailyLinkedInPost(opts = {}) {
  const db = admin.firestore();

  const cfgSnap = await db.doc("config/marketingWorker").get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};

  if (!opts.force && cfg.linkedInEveryOtherDayEnabled === false) {
    console.log("[dailyLinkedInPost] paused via config/marketingWorker.linkedInEveryOtherDayEnabled=false");
    return { skipped: "paused" };
  }

  const userId = opts.userId || cfg.socialPosterUserId;
  if (!userId) {
    console.warn("[dailyLinkedInPost] no config/marketingWorker.socialPosterUserId set — nothing to post to");
    return { skipped: "no-user-configured" };
  }

  const now = new Date();
  const pick = pickForToday(now);
  const dayKey = now.toISOString().slice(0, 10);

  if (!opts.force && pick.dayOfYear % 2 !== 0) {
    console.log(`[dailyLinkedInPost] off-day (dayOfYear=${pick.dayOfYear}), skipping`);
    return { skipped: "off-day" };
  }

  const postRef = db.collection("marketingPosts").doc(`li-${dayKey}`);
  if (!opts.force) {
    const existing = await postRef.get();
    if (existing.exists && existing.data().status === "posted") {
      console.log(`[dailyLinkedInPost] already posted for ${dayKey}`);
      return { skipped: "already-posted", url: existing.data().url };
    }
  }

  const text = `${pick.caption}${TAGLINE}`;

  try {
    const { postToLinkedIn } = require("../services/social/linkedin");
    const result = await postToLinkedIn(userId, { text, visibility: "PUBLIC" });
    await postRef.set({
      channel: "linkedin",
      status: "posted",
      dayKey,
      slug: pick.slug,
      workerName: pick.name,
      role: pick.role,
      userId,
      postId: result.postId || null,
      url: result.url || null,
      text,
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[dailyLinkedInPost] posted ${pick.slug} (${pick.role}): ${result.url}`);
    return { posted: true, ...result, slug: pick.slug };
  } catch (err) {
    await postRef.set({
      channel: "linkedin",
      status: "error",
      dayKey,
      slug: pick.slug,
      userId,
      error: String(err && err.message ? err.message : err),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.error(`[dailyLinkedInPost] FAILED for ${pick.slug}:`, err);
    throw err;
  }
}

module.exports = { runDailyLinkedInPost };
