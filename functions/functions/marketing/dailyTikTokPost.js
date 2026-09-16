// ----------------------------------------------------------------------------
// Every-Other-Day TikTok Marketing Worker
// ----------------------------------------------------------------------------
// Posts ONE "OF for Smart People" showcase video to a connected TikTok
// creator account, on the same day-of-year cadence as dailyXPost.js so all
// channels stay thematically in sync. Reuses the same video assets as the X
// poster (gs://<bucket>/launch-creative/of-<slug>-video-01.mp4, served
// publicly at https://sociii.ai/launch-creative/...).
//
// Auth: per-user TikTok OAuth (services/social/tiktok.js), scope
// video.upload,video.publish. Target user: Firestore doc
// `config/marketingWorker` field `socialPosterUserId`. As of 2026-09-15
// this account has NOT connected TikTok yet (no users/{uid}/integrations/
// tiktok doc) — this worker will log an error and no-op until that OAuth
// connection is completed via Settings.
//
// Kill switch: Firestore doc `config/marketingWorker` field
// `tiktokEveryOtherDayEnabled` (defaults ON; set to false to pause).
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");
const { pickForToday } = require("./dailyXPost");

const CREATIVE_BASE = "https://sociii.ai/launch-creative";

async function runDailyTikTokPost(opts = {}) {
  const db = admin.firestore();

  const cfgSnap = await db.doc("config/marketingWorker").get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};

  if (!opts.force && cfg.tiktokEveryOtherDayEnabled === false) {
    console.log("[dailyTikTokPost] paused via config/marketingWorker.tiktokEveryOtherDayEnabled=false");
    return { skipped: "paused" };
  }

  const userId = opts.userId || cfg.socialPosterUserId;
  if (!userId) {
    console.warn("[dailyTikTokPost] no config/marketingWorker.socialPosterUserId set — nothing to post to");
    return { skipped: "no-user-configured" };
  }

  const now = new Date();
  const pick = pickForToday(now);
  const dayKey = now.toISOString().slice(0, 10);

  if (!opts.force && pick.dayOfYear % 2 !== 0) {
    console.log(`[dailyTikTokPost] off-day (dayOfYear=${pick.dayOfYear}), skipping`);
    return { skipped: "off-day" };
  }

  const postRef = db.collection("marketingPosts").doc(`tt-${dayKey}`);
  if (!opts.force) {
    const existing = await postRef.get();
    if (existing.exists && existing.data().status === "posted") {
      console.log(`[dailyTikTokPost] already posted for ${dayKey}`);
      return { skipped: "already-posted", url: existing.data().url };
    }
  }

  const videoUrl = `${CREATIVE_BASE}/of-${pick.slug}-video-01.mp4`;

  try {
    const { postVideoToTikTok } = require("../services/social/tiktok");
    const result = await postVideoToTikTok(userId, {
      videoUrl,
      title: pick.caption.slice(0, 150),
      privacyLevel: "PUBLIC_TO_EVERYONE",
    });
    await postRef.set({
      channel: "tiktok",
      status: "posted",
      dayKey,
      slug: pick.slug,
      workerName: pick.name,
      role: pick.role,
      userId,
      publishId: result.publishId || null,
      url: result.url || null,
      videoUrl,
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[dailyTikTokPost] posted ${pick.slug} (${pick.role}): ${result.url}`);
    return { posted: true, ...result, slug: pick.slug };
  } catch (err) {
    await postRef.set({
      channel: "tiktok",
      status: "error",
      dayKey,
      slug: pick.slug,
      userId,
      error: String(err && err.message ? err.message : err),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.error(`[dailyTikTokPost] FAILED for ${pick.slug}:`, err);
    throw err;
  }
}

module.exports = { runDailyTikTokPost };
