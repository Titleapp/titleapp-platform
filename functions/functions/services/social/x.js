"use strict";

/**
 * x.js — On-demand X (Twitter) posting for the marketing worker.
 *
 * Reuses the same OAuth 1.0a user-context credentials as the daily poster
 * (marketing/dailyXPost.js): X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN /
 * X_ACCESS_SECRET — i.e. SOCIII's own @SOCIIIai account. Where the daily
 * poster runs on a cron, this lets the worker post a tweet (with optional
 * image/video) the moment the user approves one in chat.
 *
 * Exports: postToX
 */

const { TwitterApi } = require("twitter-api-v2");
const admin = require("firebase-admin");

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";

function xClientFromEnv() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    throw new Error("Missing X OAuth 1.0a credentials (X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET)");
  }
  return new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  });
}

function mimeFromPath(p) {
  const ext = String(p || "").toLowerCase().split(".").pop();
  if (ext === "mp4" || ext === "mov" || ext === "m4v") return "video/mp4";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function bytesFromStorage(storagePath) {
  const file = admin.storage().bucket(STORAGE_BUCKET).file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`Storage object missing: gs://${STORAGE_BUCKET}/${storagePath}`);
  const [buffer] = await file.download();
  return buffer;
}

async function bytesFromUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch media failed (${resp.status}) for ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * Post a tweet to @SOCIIIai, optionally with a single image/video.
 * @param {object} opts
 * @param {string} opts.text                 the tweet text (required)
 * @param {string} [opts.mediaStoragePath]   Cloud Storage object path (preferred)
 * @param {string} [opts.mediaUrl]           public URL fallback for media
 * @param {string} [opts.mimeType]           override the detected mime type
 * @returns {Promise<{ok:boolean, tweetId?:string, url?:string, text?:string, error?:string}>}
 */
async function postToX({ text, mediaStoragePath, mediaUrl, mimeType } = {}) {
  if (!text || !String(text).trim()) return { ok: false, error: "Tweet text is required" };
  try {
    const client = xClientFromEnv();

    let media;
    if (mediaStoragePath || mediaUrl) {
      const buffer = mediaStoragePath ? await bytesFromStorage(mediaStoragePath) : await bytesFromUrl(mediaUrl);
      const mime = mimeType || mimeFromPath(mediaStoragePath || mediaUrl);
      const mediaId = await client.v1.uploadMedia(buffer, { mimeType: mime, target: "tweet" });
      media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(media ? { text, media } : { text });
    const tweetId = tweet && tweet.data && tweet.data.id;
    return {
      ok: true,
      tweetId: tweetId || null,
      url: tweetId ? `https://x.com/SOCIIIai/status/${tweetId}` : null,
      text,
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

module.exports = { postToX };
