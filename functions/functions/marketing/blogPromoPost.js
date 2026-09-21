"use strict";

// ----------------------------------------------------------------------------
// Blog/Press Promotion Poster — LinkedIn + X, 3x/week (Mon/Wed/Fri)
// ----------------------------------------------------------------------------
// Sean, 2026-09-20: "set it up so we start promoting our blog posts ... on
// LinkedIn and X 3x per week." Separate from the existing every-other-day
// "OF for Smart People" video-roster posters (dailyXPost.js /
// dailyLinkedInPost.js) — this one posts a caption + link to a real
// published article from blogRoster.js.
//
// Content-mix intent (Sean, same conversation): LinkedIn = blog posts;
// X = a mix, weighted more toward blog posts than before. Implementation:
// this poster runs on BOTH channels 3x/week. LinkedIn's old every-other-day
// video poster is paused (config/marketingWorker.linkedInEveryOtherDayEnabled
// = false) so LinkedIn becomes blog-only, per "LinkedIn is the blog posts."
// X's existing every-other-day video poster is left running unchanged, so X
// ends up with both — the "mix, more blog posts" Sean asked for — without
// needing a weighted-random content picker.
//
// Kill switches: config/marketingWorker.xBlogPromoEnabled /
// linkedInBlogPromoEnabled (both default ON; set false to pause either
// independently without redeploying).
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");
const { pickBlogForSlot } = require("./blogRoster");

function isPromoDay(now) {
  const day = now.getUTCDay(); // 0=Sun ... 1=Mon, 3=Wed, 5=Fri
  return day === 1 || day === 3 || day === 5;
}

// Increasing slot counter so the roster rotates one post per promo day,
// regardless of which day-of-week we're on. Half of day-of-year is a simple
// monotonic proxy — exact spacing doesn't matter, only that it advances.
function slotIndexForDate(now) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86400000);
  return dayOfYear;
}

/**
 * @param {"x"|"linkedin"} channel
 * @param {object} [opts] - { force, userId } — force bypasses the promo-day
 *   gate and de-dupe check, for manual testing.
 */
async function runBlogPromoPost(channel, opts = {}) {
  const db = admin.firestore();
  const cfgSnap = await db.doc("config/marketingWorker").get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};

  const flag = channel === "x" ? "xBlogPromoEnabled" : "linkedInBlogPromoEnabled";
  if (!opts.force && cfg[flag] === false) {
    console.log(`[blogPromoPost:${channel}] paused via config/marketingWorker.${flag}=false`);
    return { skipped: "paused" };
  }

  const now = new Date();
  if (!opts.force && !isPromoDay(now)) {
    console.log(`[blogPromoPost:${channel}] not a promo day (Mon/Wed/Fri only), skipping`);
    return { skipped: "not-promo-day" };
  }

  const dayKey = now.toISOString().slice(0, 10);
  const postRef = db.collection("marketingPosts").doc(`blog-${channel}-${dayKey}`);
  if (!opts.force) {
    const existing = await postRef.get();
    if (existing.exists && existing.data().status === "posted") {
      console.log(`[blogPromoPost:${channel}] already posted for ${dayKey}`);
      return { skipped: "already-posted", url: existing.data().url };
    }
  }

  const pick = pickBlogForSlot(slotIndexForDate(now));
  const text = `${pick.caption}\n\n${pick.url}\n\n#DigitalWorkers #SOCIII`;

  try {
    let result;
    if (channel === "x") {
      const { postToX } = require("../services/social/x");
      result = await postToX({ text });
      if (!result.ok) throw new Error(result.error || "postToX failed");
    } else {
      const userId = opts.userId || cfg.socialPosterUserId;
      if (!userId) {
        console.warn("[blogPromoPost:linkedin] no config/marketingWorker.socialPosterUserId set — nothing to post to");
        return { skipped: "no-user-configured" };
      }
      const { postToLinkedIn } = require("../services/social/linkedin");
      result = await postToLinkedIn(userId, { text, visibility: "PUBLIC" });
    }

    await postRef.set({
      channel: `blog-${channel}`,
      status: "posted",
      dayKey,
      slug: pick.slug,
      url: result.url || null,
      text,
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[blogPromoPost:${channel}] posted ${pick.slug}: ${result.url}`);
    return { posted: true, ...result, slug: pick.slug };
  } catch (err) {
    await postRef.set({
      channel: `blog-${channel}`,
      status: "error",
      dayKey,
      slug: pick.slug,
      error: String(err && err.message ? err.message : err),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.error(`[blogPromoPost:${channel}] FAILED for ${pick.slug}:`, err);
    throw err;
  }
}

module.exports = { runBlogPromoPost, isPromoDay };
