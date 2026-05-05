"use strict";

/**
 * deliveryRulesFilter.js — Server-side enforcement of DELIVERY RULES (49.27).
 *
 * After the model responds, this filter checks whether the response:
 *  (a) contains forbidden "I'll process / give me a moment / working on it" phrases, or
 *  (b) is missing a |||CANVAS_RENDER||| marker when the user asked for a structured deliverable
 *      (breakdown, summary, table, list, plan, model, schedule, P&L, etc.).
 *
 * If either is true, callers retry the model once with a stronger reminder message
 * appended to the conversation. This is the heavy-handed escalation Sean asked for
 * after multiple prompt-only iterations let Alex/workers keep faking processing.
 */

// Phrases the model is forbidden from saying — must mirror prompts/rules.js + index.js worker prompt prepend.
const FORBIDDEN_PATTERNS = /(working on it|working now|give me (a few |a couple |2 |3 |a )?(more )?(minute|moment)s?|i will (have|send|send you|come back|get back|process|extract|analyze|put together)|once i have|i am processing|processing now|extracting now|let me (extract|process|analyze|pull|build)|ready (for download|to download)|will be ready (in|shortly)|will follow up|in a (few |couple )?(minute|moment)s?|you will have|breakdown (in|shortly)|pulling every|will populate|will produce|will draft|coming (right )?up|standby|stand by|hold tight|one moment)/i;

// Heuristic: did the user ask for a structured deliverable that should land on the canvas?
const DELIVERABLE_REQUEST_PATTERNS = /\b(breakdown|summary|summari[sz]e|table|spreadsheet|list (of|out|the)|plan|schedule|timeline|model|forecast|projection|chart|report|template|framework|comparison|analysis|analyze|chart of accounts|p ?& ?l|profit and loss|income statement|balance sheet|cash ?flow|budget|calendar|register|ledger|dashboard|review|recap|categori[sz]e|categori[sz]ation|extract (the|all|line items)|pull (the|all|out)|reconcile|reconciliation|review the|go through (the|all))\b/i;

// Marker presence (we accept either CANVAS_RENDER or GENERATE_DOCUMENT — both produce visible artifacts).
const CANVAS_MARKER_RE = /\|\|\|CANVAS_RENDER\|\|\|/;
const GENERATE_DOCUMENT_RE = /\|\|\|GENERATE_DOCUMENT\|\|\|/;

/**
 * Inspect a model response.
 * @param {object} args
 * @param {string} args.response — raw AI response text (BEFORE marker extraction)
 * @param {string} args.userInput — the user message that triggered the response
 * @returns {{ ok: boolean, violations: string[], reason?: string, retryHint?: string }}
 */
function checkDeliveryRules({ response, userInput }) {
  const violations = [];
  const text = String(response || "");
  const ask = String(userInput || "");

  if (FORBIDDEN_PATTERNS.test(text)) {
    violations.push("forbidden_phrase");
  }

  // Only require canvas marker when (a) user actually asked for a deliverable AND
  // (b) the response is non-trivial (not a clarifying question).
  const userAskedForDeliverable = DELIVERABLE_REQUEST_PATTERNS.test(ask);
  const responseIsLong = text.length > 350; // longer than a question
  const hasMarker = CANVAS_MARKER_RE.test(text) || GENERATE_DOCUMENT_RE.test(text);
  const looksLikeQuestion = /\?\s*$/.test(text.trim()) && text.trim().length < 600;

  if (userAskedForDeliverable && responseIsLong && !hasMarker && !looksLikeQuestion) {
    violations.push("missing_canvas_marker");
  }

  if (violations.length === 0) return { ok: true, violations: [] };

  const hints = [];
  if (violations.includes("forbidden_phrase")) {
    hints.push(
      'Your previous response contained a forbidden phrase (e.g. "working on it", "give me a moment", "I will...", "processing now"). You are stateless. There is no future turn. Either deliver the work in THIS response or ask one specific clarifying question. Do not promise future work.'
    );
  }
  if (violations.includes("missing_canvas_marker")) {
    hints.push(
      "The user asked for a structured deliverable. You MUST emit a |||CANVAS_RENDER|||{...}|||END_CANVAS||| marker IN THIS RESPONSE with the deliverable populated. Use real data if you have it; otherwise populate a clearly-labeled template with placeholders so the user sees the shape. Keep your chat reply to 1–2 sentences pointing at the canvas — do NOT paste the work product into chat."
    );
  }

  return {
    ok: false,
    violations,
    reason: violations.join("+"),
    retryHint: hints.join("\n\n"),
  };
}

module.exports = { checkDeliveryRules, FORBIDDEN_PATTERNS, DELIVERABLE_REQUEST_PATTERNS };
