"use strict";

/**
 * modeDetector.js — RAAS Mode Detection for Game Workers
 *
 * Detects whether a game worker should use RAAS Light (creator-described rules)
 * or RAAS Regulated (vertical rule pack + exam questions).
 *
 * Detection is automatic from conversation context. If ambiguous, returns
 * confidence: "low" so Alex can ask one clarifying question.
 */

const REGULATED_SIGNALS = /\b(regulation|regulations|exam|examination|certification|certif(?:y|ied)|license|licensure|compliance|compliant|FAR|AIM|NCLEX|OSHA|HIPAA|Part\s*\d{2,3}|CFR|statute|code of conduct|professional standards|board exam|state exam|federal)\b/i;

const REGULATED_VERTICALS = [
  "aviation", "nursing", "real_estate", "real-estate", "real_estate_development",
  "ems", "healthcare", "government", "legal",
];

/**
 * Detect RAAS mode from conversation context.
 *
 * @param {object} ctx
 * @param {string} [ctx.description] — creator's plain-language game description
 * @param {string} [ctx.vertical] — detected vertical from conversation
 * @param {string} [ctx.examScope] — specific exam/regulation scope mentioned
 * @param {string[]} [ctx.mentions] — keywords extracted from conversation
 * @returns {{ raasMode: string, verticalRulePack: string|null, examScope: string|null, confidence: string }}
 */
function detectRaasMode(ctx = {}) {
  const { description = "", vertical = "", examScope = "", mentions = [] } = ctx;
  const allText = [description, vertical, examScope, ...mentions].join(" ");

  // Direct exam scope → regulated with high confidence
  if (examScope && examScope.trim()) {
    return {
      raasMode: "regulated",
      verticalRulePack: vertical || null,
      examScope: examScope.trim(),
      confidence: "high",
    };
  }

  // Regex signals in description/mentions → regulated
  if (REGULATED_SIGNALS.test(allText)) {
    return {
      raasMode: "regulated",
      verticalRulePack: vertical || null,
      examScope: null,
      confidence: "medium",
    };
  }

  // Vertical is in regulated list → regulated
  const normalizedVertical = (vertical || "").toLowerCase().replace(/\s+/g, "_");
  if (normalizedVertical && REGULATED_VERTICALS.includes(normalizedVertical)) {
    return {
      raasMode: "regulated",
      verticalRulePack: vertical,
      examScope: null,
      confidence: "medium",
    };
  }

  // No regulatory signals → light
  if (description.trim()) {
    return {
      raasMode: "light",
      verticalRulePack: null,
      examScope: null,
      confidence: "high",
    };
  }

  // No description at all → ambiguous
  return {
    raasMode: "light",
    verticalRulePack: null,
    examScope: null,
    confidence: "low",
  };
}

module.exports = { detectRaasMode };
