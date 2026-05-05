"use strict";

/**
 * sideEffectMarkers.js (49.32) — Worker execution side-effects.
 *
 * Workers emit |||SIDE_EFFECT|||{...}|||END_SIDE_EFFECT||| markers when the
 * user has explicitly approved an action that has real-world consequences
 * (sending a marketing email, posting to social, queuing a transactional
 * message, etc.). The marker is stripped from the chat reply before it
 * goes to the user; the parsed side-effects are passed to
 * executeChatSideEffects() in index.js for execution.
 *
 * Marker contract:
 *   {
 *     "action": "sendEmailCampaign" | "scheduleSocialPost" | "enqueueMessage",
 *     "data":   { ...action-specific fields }
 *   }
 *
 * Multiple markers per response are allowed; each is executed in order.
 */

const MARKER_RE = /\|\|\|SIDE_EFFECT\|\|\|\s*([\s\S]*?)\s*\|\|\|END_SIDE_EFFECT\|\|\|/g;

const ALLOWED_ACTIONS = new Set([
  "sendEmailCampaign",
  "scheduleSocialPost",
  "enqueueMessage",
]);

function extractSideEffects(text) {
  if (!text || typeof text !== "string") return { cleanText: text || "", sideEffects: [] };

  const sideEffects = [];
  const cleanText = text.replace(MARKER_RE, (_match, body) => {
    try {
      const obj = JSON.parse(body);
      if (obj && typeof obj === "object" && typeof obj.action === "string") {
        if (!ALLOWED_ACTIONS.has(obj.action)) {
          console.warn(`[sideEffectMarkers] rejected disallowed action: ${obj.action}`);
        } else {
          sideEffects.push({ action: obj.action, data: obj.data || {} });
        }
      }
    } catch (parseErr) {
      console.warn("[sideEffectMarkers] failed to parse SIDE_EFFECT body:", parseErr.message);
    }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();

  return { cleanText, sideEffects };
}

module.exports = { extractSideEffects, ALLOWED_ACTIONS };
