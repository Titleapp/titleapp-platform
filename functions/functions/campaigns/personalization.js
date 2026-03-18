/**
 * personalization.js — Template variable resolver for campaign engine.
 * Replaces {{variable}} placeholders with context values at queue time.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Resolve {{variable}} placeholders in a template string.
 * Unresolved variables are left as-is (e.g. {{unknown}} stays).
 */
function resolveTemplate(template, context) {
  if (!template || typeof template !== "string") return template || "";
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Build a personalization context from user data + extras.
 */
async function buildPersonalizationContext(userId, extraContext = {}) {
  const db = getDb();
  const userSnap = await db.collection("users").doc(userId).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  const firstName = userData.name ? userData.name.split(" ")[0] : "there";
  const pricing = require("../config/pricing");

  const tierNames = { free: "Free", tier1: "Tier 1", tier2: "Tier 2", tier3: "Tier 3" };
  const userTier = userData.tier || "free";
  const tierConfig = pricing.subscriptionTiers[userTier] || pricing.subscriptionTiers.free;

  return {
    firstName,
    fullName: userData.name || "there",
    email: userData.email || "",
    phone: userData.phone || "",
    tierName: tierNames[userTier] || "Free",
    creditsRemaining: userData.monthlyCredits != null
      ? Math.max(0, (userData.monthlyCredits || 0) - (userData.usageThisMonth || 0))
      : tierConfig.creditsIncluded || 100,
    companyName: userData.companyName || "",
    vertical: userData.vertical || "",
    platformUrl: "https://app.titleapp.ai",
    sandboxUrl: "https://app.titleapp.ai/sandbox",
    supportEmail: "support@titleapp.ai",
    ...extraContext,
  };
}

/**
 * Resolve all template fields for a campaign channel.
 */
function resolveMessageContent(campaign, channel, context) {
  const tpl = campaign.template && campaign.template[channel];
  if (!tpl) return null;

  const resolved = {};
  if (tpl.subject) resolved.subject = resolveTemplate(tpl.subject, context);
  if (tpl.htmlBody) resolved.body = resolveTemplate(tpl.htmlBody, context);
  else if (tpl.body) resolved.body = resolveTemplate(tpl.body, context);
  if (tpl.textBody) resolved.textBody = resolveTemplate(tpl.textBody, context);
  return resolved;
}

module.exports = { resolveTemplate, buildPersonalizationContext, resolveMessageContent };
