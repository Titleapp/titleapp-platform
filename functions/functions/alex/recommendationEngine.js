"use strict";

/**
 * recommendationEngine.js — Cadence-based worker recommendation engine
 *
 * Alex recommends workers based on:
 *   1. Session count (cadence stages)
 *   2. User vertical + persona match
 *   3. Already-subscribed exclusion
 *   4. BOGO eligibility (secondary, never the lead)
 *
 * Cadence stages:
 *   - Session 1:  1 starter recommendation
 *   - Session 5 (or Day 3): 1 adjacent worker
 *   - Session 50: Portfolio review (up to 5)
 *   - 30 days inactive on any worker: soft check-in
 *   - Monthly fallback: rotating suggestion
 *
 * Exports: getRecommendation, getCadenceStage
 */

const ALEX_SLUGS = ["chief-of-staff", "av-alex", "av-alex-personal"];

/**
 * Determine the cadence stage based on session count.
 *
 * @param {number} sessionCount
 * @returns {"starter"|"adjacent"|"portfolio_review"|"monthly"}
 */
function getCadenceStage(sessionCount) {
  if (!sessionCount || sessionCount <= 1) return "starter";
  if (sessionCount <= 5) return "adjacent";
  if (sessionCount >= 50) return "portfolio_review";
  return "monthly";
}

/**
 * Build a soft check-in message for inactive workers.
 *
 * @param {string} workerName
 * @param {number} daysSinceUse
 * @returns {string}
 */
function getSoftDeletionMessage(workerName, daysSinceUse) {
  return `I noticed you haven't used ${workerName} in ${daysSinceUse} days. Still need it, or should we pause it and save the cost? You can always re-activate later.`;
}

/**
 * Rank available workers by vertical + persona match.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} vertical — user's vertical (e.g. "aviation_135", "re_development")
 * @param {string} persona — user's role/persona
 * @param {string[]} activeWorkerSlugs — already-subscribed slugs
 * @returns {Promise<object[]>} — ranked workers
 */
async function rankWorkers(db, vertical, persona, activeWorkerSlugs) {
  const candidates = [];

  try {
    const snap = await db.collection("digitalWorkers")
      .where("status", "==", "live")
      .limit(100)
      .get();

    snap.forEach((doc) => {
      const data = doc.data();
      const slug = doc.id;

      // Exclude Alex variants
      if (ALEX_SLUGS.includes(slug)) return;

      // Exclude already-subscribed
      if (activeWorkerSlugs.includes(slug)) return;

      // Score by vertical match
      let score = 0;
      const workerVertical = data.catalogId ? data.catalogId.substring(0, 2) : "";

      // Vertical match scoring
      if (vertical === "aviation_135" || vertical === "pilot_suite") {
        if (workerVertical === "AV") score += 10;
      } else if (vertical === "re_development") {
        if (workerVertical === "W-" || slug.startsWith("market") || slug.startsWith("cre")) score += 10;
      } else if (vertical === "auto_dealer") {
        if (workerVertical === "AD") score += 10;
      } else if (vertical === "health_education") {
        if (workerVertical === "HE") score += 10;
      }

      // Pricing tier bonus (free workers rank higher for new users)
      if (data.pricing_tier === 0) score += 3;
      if (data.pricing_tier === 29) score += 2;

      candidates.push({
        slug,
        name: data.display_name || slug,
        price: data.pricing_tier || 0,
        score,
        catalogId: data.catalogId || null,
        headline: data.headline || "",
        bogoEligible: data.bogoEligible || false,
      });
    });
  } catch (err) {
    console.error("recommendationEngine: rankWorkers query failed:", err.message);
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Get a recommendation for the user based on cadence + context.
 *
 * @param {object} opts
 * @param {string} opts.userId — Firebase user ID
 * @param {string} opts.vertical — user's vertical
 * @param {string} opts.persona — user's role
 * @param {string[]} opts.activeWorkerSlugs — slugs the user already has
 * @param {number} opts.sessionCount — number of chat sessions
 * @param {FirebaseFirestore.Firestore} opts.db — Firestore instance
 * @returns {Promise<object|null>} — recommendation or null
 */
async function getRecommendation({ userId, vertical, persona, activeWorkerSlugs = [], sessionCount = 0, db }) {
  if (!db || !userId) return null;

  const cadenceStage = getCadenceStage(sessionCount);

  // Check if we already recommended recently (within 24 hours)
  try {
    const recentRecs = await db.collection("users").doc(userId)
      .collection("alexRecommendations")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!recentRecs.empty) {
      const lastRec = recentRecs.docs[0].data();
      const lastRecTime = lastRec.createdAt?.toDate ? lastRec.createdAt.toDate() : new Date(lastRec.createdAt);
      const hoursSince = (Date.now() - lastRecTime.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24 && cadenceStage !== "portfolio_review") return null;
    }
  } catch (err) {
    // Non-fatal — proceed with recommendation
  }

  const ranked = await rankWorkers(db, vertical, persona, activeWorkerSlugs);
  if (ranked.length === 0) return null;

  let maxRecs = 1;
  if (cadenceStage === "portfolio_review") maxRecs = 5;
  if (cadenceStage === "adjacent") maxRecs = 1;

  const selected = ranked.slice(0, maxRecs);
  const primary = selected[0];

  // Build reason text
  let reason;
  switch (cadenceStage) {
    case "starter":
      reason = `Based on your ${vertical ? vertical.replace(/_/g, " ") : "industry"} work, ${primary.name} is a great place to start.`;
      break;
    case "adjacent":
      reason = `Now that you're settled in, ${primary.name} pairs well with your current workers.`;
      break;
    case "portfolio_review":
      reason = `You've been using TitleApp for a while. Here are workers that could round out your setup.`;
      break;
    default:
      reason = `${primary.name} could help with your ${vertical ? vertical.replace(/_/g, " ") : ""} workflow.`;
  }

  // BOGO check (secondary, never the lead)
  let bogoText = null;
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const bogoUsed = userData.bogoUsed || false;

    if (!bogoUsed && primary.bogoEligible) {
      const settingsDoc = await db.collection("platform").doc("settings").get();
      const bogoEnabled = settingsDoc.exists ? (settingsDoc.data().bogoEnabled || false) : false;

      if (bogoEnabled) {
        bogoText = "This worker is BOGO-eligible — subscribe to one platform worker and get the second one free (cheapest one is free).";
      }
    }
  } catch (err) {
    // Non-fatal
  }

  // Build prompt injection text
  let promptText = `RECOMMENDATION: Suggest "${primary.name}" ($${primary.price}/mo) to the user. Reason: ${reason}`;
  if (primary.headline) promptText += ` What it does: ${primary.headline}.`;
  if (bogoText) promptText += ` BOGO: ${bogoText}`;
  promptText += "\nDeliver this naturally in conversation — do not say 'the system recommended this.' Present it as your own suggestion as their Chief of Staff.";

  const recDoc = {
    workerId: primary.catalogId,
    slug: primary.slug,
    name: primary.name,
    price: primary.price,
    reason,
    bogoEligible: !!bogoText,
    cadenceStage,
    createdAt: new Date().toISOString(),
  };

  // Store recommendation
  try {
    await db.collection("users").doc(userId)
      .collection("alexRecommendations").add(recDoc);
  } catch (err) {
    // Non-fatal
  }

  return {
    ...recDoc,
    promptText,
    allRecommendations: cadenceStage === "portfolio_review" ? selected : [primary],
  };
}

module.exports = {
  getRecommendation,
  getCadenceStage,
  getSoftDeletionMessage,
  rankWorkers,
};
