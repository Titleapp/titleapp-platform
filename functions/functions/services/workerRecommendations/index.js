"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Industry value → vertical name mapping
const INDUSTRY_TO_VERTICAL = {
  "auto-dealer": "Auto Dealer",
  "real-estate": "Real Estate",
  "aviation": "Aviation",
  "healthcare": "Health and EMS",
  "government": "Government",
  "web3": "Web3",
  "solar": "Solar",
  "legal": "Real Estate Professional",
  "professional-services": null,
  "construction": null,
  "other": null,
};

/**
 * Get recommended workers for a given industry.
 * Queries the digitalWorkers collection filtered by vertical.
 * @param {string} industry — industry value from business setup
 * @param {object} opts — { limit }
 * @returns {{ ok, workers, total }}
 */
async function getIndustryWorkers(industry, { limit: lim } = {}) {
  const vertical = INDUSTRY_TO_VERTICAL[industry];
  if (!vertical) {
    return { ok: true, workers: [], total: 0, message: "No specific vertical for this industry" };
  }

  const db = getDb();
  let q = db.collection("digitalWorkers")
    .where("vertical", "==", vertical)
    .where("status", "==", "live")
    .orderBy("priority", "desc")
    .limit(lim || 10);

  const snap = await q.get();
  const workers = snap.docs.map(d => {
    const data = d.data();
    return {
      slug: d.id,
      name: data.name || data.title || d.id,
      description: data.short_description || data.capabilitySummary || "",
      price: data.price_tier || data.price || 0,
      suite: data.suite || null,
      vertical: data.vertical || null,
      bogoEligible: data.bogoEligible || false,
    };
  });

  return { ok: true, workers, total: workers.length, vertical };
}

/**
 * Get top worker recommendations across all verticals.
 * @param {object} opts — { limit }
 * @returns {{ ok, workers }}
 */
async function getFeaturedWorkers({ limit: lim } = {}) {
  const db = getDb();
  const snap = await db.collection("digitalWorkers")
    .where("status", "==", "live")
    .where("featured", "==", true)
    .limit(lim || 10)
    .get();

  const workers = snap.docs.map(d => {
    const data = d.data();
    return {
      slug: d.id,
      name: data.name || data.title || d.id,
      description: data.short_description || "",
      price: data.price_tier || 0,
      vertical: data.vertical || null,
    };
  });

  return { ok: true, workers };
}

module.exports = { getIndustryWorkers, getFeaturedWorkers };
