"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Distribute a press release via PRLog free API.
 * @param {string} userId
 * @param {object} opts - { title, content, tier }
 * @returns {{ ok, prId, distributionResult }}
 */
async function distributePR(userId, { title, content, tier }) {
  if (!title) return { ok: false, error: "Missing title" };
  if (!content) return { ok: false, error: "Missing content" };

  const db = getDb();
  const prId = "pr_" + require("crypto").randomUUID().replace(/-/g, "");

  let distributionResult = { submitted: false };

  try {
    // PRLog free submission API
    const resp = await fetch("https://www.prlog.org/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body: content,
        tier: tier || "free",
      }),
    });

    const data = await resp.json().catch(() => ({}));
    distributionResult = {
      submitted: resp.ok,
      status: resp.status,
      prlogId: data.id || null,
      url: data.url || null,
      error: resp.ok ? null : (data.message || data.error || `HTTP ${resp.status}`),
    };
  } catch (e) {
    distributionResult = { submitted: false, error: e.message };
  }

  // Log to Firestore
  await db.collection("pressReleases").doc(prId).set({
    userId,
    title,
    content,
    tier: tier || "free",
    distributionResult,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, prId, distributionResult };
}

module.exports = { distributePR };
