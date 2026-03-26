"use strict";

/**
 * audit.js — Game Audit Trail
 *
 * Wraps auditTrailService.writeAuditRecord() for game-specific events.
 * Only writes when gameConfig.auditTrail === true.
 * Two execution types: game_answer, game_rule_violation.
 */

const crypto = require("crypto");

/**
 * Log a game event to the audit trail.
 *
 * @param {object} opts
 * @param {string} opts.session_id — game session ID
 * @param {string} opts.worker_id — worker ID
 * @param {string} opts.subscriber_id — player's user ID
 * @param {string} [opts.question_id] — question ID (for regulated mode)
 * @param {string} [opts.answer_given] — player's answer
 * @param {boolean} [opts.correct] — whether answer was correct
 * @param {string} [opts.rule_violated] — rule violation description (for light mode)
 * @param {object} gameConfig — worker's gameConfig (checked for auditTrail flag)
 * @returns {Promise<object>} — audit record or { skipped: true }
 */
async function logGameEvent(opts, gameConfig) {
  if (!gameConfig || gameConfig.auditTrail !== true) {
    return { skipped: true };
  }

  const { writeAuditRecord } = require("../auditTrailService");

  const executionType = opts.rule_violated ? "game_rule_violation" : "game_answer";
  const eventId = `game_${crypto.randomUUID()}`;

  const auditResult = await writeAuditRecord({
    worker_id: opts.worker_id,
    user_id: opts.subscriber_id,
    org_id: null,
    event_id: eventId,
    execution_type: executionType,
    timestamp: new Date().toISOString(),
  });

  return {
    ...auditResult,
    event_id: eventId,
    execution_type: executionType,
    session_id: opts.session_id,
    question_id: opts.question_id || null,
    answer_given: opts.answer_given || null,
    correct: opts.correct ?? null,
    rule_violated: opts.rule_violated || null,
  };
}

module.exports = { logGameEvent };
