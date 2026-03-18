/**
 * campaignEngine.js — Core campaign orchestration.
 * Matches events to campaigns, deduplicates, resolves personalization, enqueues messages.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// ── In-memory campaign cache (5-min TTL) ─────────────────────
let campaignCache = null;
let campaignCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadCampaigns() {
  const now = Date.now();
  if (campaignCache && now - campaignCacheAt < CACHE_TTL_MS) return campaignCache;

  const db = getDb();
  const snap = await db.collection("campaigns").where("status", "==", "active").get();
  campaignCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  campaignCacheAt = now;
  return campaignCache;
}

/**
 * Find campaigns matching an event name + optional context conditions.
 */
async function matchCampaigns(event, context = {}) {
  const campaigns = await loadCampaigns();
  return campaigns.filter(c => {
    if (!c.trigger || c.trigger.event !== event) return false;
    // Check optional conditions
    if (c.trigger.conditions && typeof c.trigger.conditions === "object") {
      for (const [key, val] of Object.entries(c.trigger.conditions)) {
        if (context[key] !== val) return false;
      }
    }
    return true;
  });
}

/**
 * Enqueue a single message to the messageQueue collection.
 */
async function enqueueCampaignMessage(campaignId, userId, channel, resolvedContent, delayMinutes = 0) {
  const db = getDb();
  const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  await db.collection("messageQueue").add({
    userId,
    campaignId,
    channel,
    to: resolvedContent.to || "",
    subject: resolvedContent.subject || null,
    body: resolvedContent.body || "",
    textBody: resolvedContent.textBody || null,
    scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
    status: "pending",
    sentAt: null,
    error: null,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Trigger campaigns for an event.
 * Matches campaigns, checks dedup (maxPerUser), resolves personalization, enqueues.
 */
async function triggerCampaign(event, userId, context = {}) {
  const db = getDb();
  const matched = await matchCampaigns(event, context);
  if (matched.length === 0) return { triggered: 0 };

  const { buildPersonalizationContext, resolveMessageContent } = require("./personalization");
  const personContext = await buildPersonalizationContext(userId, context);

  // Load user for contact info
  const userSnap = await db.collection("users").doc(userId).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  let triggered = 0;

  for (const campaign of matched) {
    // Dedup check: maxPerUser
    if (campaign.maxPerUser) {
      const existing = await db.collection("messageQueue")
        .where("userId", "==", userId)
        .where("campaignId", "==", campaign.id)
        .where("status", "in", ["pending", "sent"])
        .limit(campaign.maxPerUser)
        .get();
      if (existing.size >= campaign.maxPerUser) continue;
    }

    // Enqueue for each channel
    for (const channel of (campaign.channels || ["email"])) {
      // Check SMS opt-out
      if (channel === "sms" && campaign.smsOptOutRequired !== false && userData.smsOptOut) continue;

      const resolved = resolveMessageContent(campaign, channel, personContext);
      if (!resolved) continue;

      // Set destination
      if (channel === "email") {
        resolved.to = userData.email || "";
      } else if (channel === "sms") {
        resolved.to = userData.phone || "";
      }

      if (!resolved.to) continue;

      await enqueueCampaignMessage(
        campaign.id,
        userId,
        channel,
        resolved,
        campaign.delayMinutes || 0
      );
      triggered++;
    }
  }

  return { triggered };
}

module.exports = { matchCampaigns, enqueueCampaignMessage, triggerCampaign, loadCampaigns };
