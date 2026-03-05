/**
 * onContentSync.js — Firestore trigger that fires on platform content sync events.
 *
 * Trigger: platform/contentSync/events/{eventId} (onCreate)
 *
 * Updates all platform surfaces when a worker is approved or deprecated:
 *   1. Homepage counter cache (platform/homepageCache)
 *   2. Vertical worker list cache (platform/verticalCache/{vertical})
 *   3. Alex knowledge base (alex/knowledge/workers/{worker_id})
 *   4. Chat context (platform/chatContext/{vertical})
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleContentSync(snap) {
  const event = snap.data();
  if (!event || !event.event_type) {
    console.warn("[onContentSync] Event missing event_type — skipping");
    return;
  }

  const db = getDb();

  switch (event.event_type) {
    case "worker_approved":
      await updateHomepageCounter(db);
      await rebuildVerticalCache(db, event.vertical);
      await updateAlexKnowledge(db, event.worker_id);
      await updateChatContext(db, event.vertical);
      console.log(`[onContentSync] worker_approved: ${event.worker_id} — all surfaces updated`);
      break;

    case "worker_deprecated":
      await updateHomepageCounter(db);
      await rebuildVerticalCache(db, event.vertical);
      await removeFromAlexKnowledge(db, event.worker_id);
      await updateChatContext(db, event.vertical);
      console.log(`[onContentSync] worker_deprecated: ${event.worker_id} — all surfaces updated`);
      break;

    case "counters_rebuild":
      await updateHomepageCounter(db);
      console.log("[onContentSync] counters_rebuild — homepage cache updated");
      break;

    default:
      console.warn(`[onContentSync] Unknown event_type: ${event.event_type}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  HOMEPAGE COUNTER
// ═══════════════════════════════════════════════════════════════

async function updateHomepageCounter(db) {
  const counts = await db.doc("platform/workerCounts").get();
  const data = counts.exists ? counts.data() : {};

  await db.doc("platform/homepageCache").set({
    worker_count_live: data.total_live || 0,
    worker_count_total: data.total_all_statuses || 0,
    worker_count_display: formatWorkerCount(data.total_all_statuses || 0),
    last_updated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * Always round DOWN to nearest 100 for conservative, defensible claim.
 * 1247 → "1,200+", 89 → "0+", 346 → "300+"
 */
function formatWorkerCount(count) {
  if (count < 100) return `${count}`;
  const rounded = Math.floor(count / 100) * 100;
  if (rounded >= 1000) {
    const thousands = Math.floor(rounded / 1000);
    const hundreds = rounded % 1000;
    return `${thousands},${String(hundreds).padStart(3, "0")}+`;
  }
  return `${rounded}+`;
}

// ═══════════════════════════════════════════════════════════════
//  VERTICAL CACHE
// ═══════════════════════════════════════════════════════════════

async function rebuildVerticalCache(db, vertical) {
  if (!vertical) return;

  const workers = await db.collection("raasCatalog")
    .where("vertical", "==", vertical)
    .where("status", "==", "live")
    .get();

  // Sort by phase_number (nulls last)
  const workerList = workers.docs
    .map(d => {
      const data = d.data();
      return {
        worker_id: d.id,
        name: data.name,
        price_tier: data.price_tier,
        short_description: data.short_description,
        tags: data.tags || [],
        worker_url: data.worker_url || null,
        phase: data.phase || null,
        phase_number: data.phase_number ?? 999,
      };
    })
    .sort((a, b) => a.phase_number - b.phase_number);

  await db.doc(`platform/verticalCache/${vertical}`).set({
    workers: workerList,
    count: workerList.length,
    last_updated: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════
//  ALEX KNOWLEDGE
// ═══════════════════════════════════════════════════════════════

async function updateAlexKnowledge(db, workerId) {
  if (!workerId) return;
  const { parsePriceTier } = require("./helpers/workerSchema");

  const worker = await db.collection("raasCatalog").doc(workerId).get();
  if (!worker.exists) return;
  const w = worker.data();

  await db.collection("alex").doc("knowledge").collection("workers").doc(workerId).set({
    worker_id: w.worker_id,
    name: w.name,
    vertical: w.vertical,
    price_tier: w.price_tier,
    revenue_model: w.revenue_model,
    short_description: w.short_description,
    tags: w.tags || [],
    status: w.status,
    worker_url: w.worker_url || null,
    monthly_price_usd: parsePriceTier(w.price_tier),
    is_tech_fee_vertical: ["auto_dealer", "re_sales", "property_management"].includes(w.vertical),
    added_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function removeFromAlexKnowledge(db, workerId) {
  if (!workerId) return;
  await db.collection("alex").doc("knowledge").collection("workers").doc(workerId).delete().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
//  CHAT CONTEXT
// ═══════════════════════════════════════════════════════════════

async function updateChatContext(db, vertical) {
  if (!vertical) return;

  const cache = await db.doc(`platform/verticalCache/${vertical}`).get();
  if (!cache.exists) return;
  const data = cache.data();

  await db.doc(`platform/chatContext/${vertical}`).set({
    vertical,
    worker_summary: (data.workers || []).map(w =>
      `${w.name} (${w.price_tier}/mo): ${w.short_description}`
    ).join("\n"),
    worker_count: data.count || 0,
    last_updated: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = {
  handleContentSync,
  updateHomepageCounter,
  rebuildVerticalCache,
  updateAlexKnowledge,
  removeFromAlexKnowledge,
  updateChatContext,
  formatWorkerCount,
};
