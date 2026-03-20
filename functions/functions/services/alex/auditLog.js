"use strict";

/**
 * auditLog.js — Alex Worker Zero Audit Trail
 *
 * Every Alex interaction logs to Firestore as an append-only record.
 * Collection: alexAuditLog/{uid}/{sessionId}/{messageId}
 *
 * This log is NEVER modified after write. It is the audit trail.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

/**
 * Generate a unique message ID.
 * @returns {string}
 */
function generateMessageId() {
  return "msg_" + crypto.randomBytes(8).toString("hex");
}

/**
 * Log an Alex interaction to the audit trail.
 *
 * @param {Object} params
 * @param {string} params.userId — Firebase auth UID
 * @param {string} params.sessionId — session identifier (tenantId or "guest")
 * @param {string} [params.messageId] — unique message ID (auto-generated if omitted)
 * @param {string} params.mode — "guest" | "authenticated" | "team"
 * @param {string|null} params.activeVertical — current vertical
 * @param {string|null} params.activeTeamId — current team ID
 * @param {string} params.rulePackVersion — "alex-rule-pack-v1"
 * @param {Object} params.input — { raw, handoffTriggered, handoffTarget, hardStopTriggered }
 * @param {Object} params.output — { response, violations, regenerationCount, approved }
 * @param {Object} params.layer2Snapshot — { subscribedWorkers, activeTeamId }
 * @returns {Promise<string>} — messageId
 */
async function logAlexInteraction({
  userId,
  sessionId,
  messageId,
  mode,
  activeVertical,
  activeTeamId,
  rulePackVersion,
  input,
  output,
  layer2Snapshot,
}) {
  const db = getDb();
  const msgId = messageId || generateMessageId();
  const sessId = sessionId || "default";

  const record = {
    userId,
    sessionId: sessId,
    messageId: msgId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    mode: mode || "authenticated",
    activeVertical: activeVertical || null,
    activeTeamId: activeTeamId || null,
    rulePackVersion: rulePackVersion || "alex-rule-pack-v1",
    input: {
      raw: (input && input.raw) ? input.raw.substring(0, 5000) : "",
      handoffTriggered: !!(input && input.handoffTriggered),
      handoffTarget: (input && input.handoffTarget) || null,
      hardStopTriggered: !!(input && input.hardStopTriggered),
    },
    output: {
      response: (output && output.response) ? output.response.substring(0, 10000) : "",
      violations: (output && output.violations) || [],
      regenerationCount: (output && output.regenerationCount) || 0,
      approved: output ? !!output.approved : true,
    },
    layer2Snapshot: {
      subscribedWorkers: (layer2Snapshot && layer2Snapshot.subscribedWorkers) || [],
      activeTeamId: (layer2Snapshot && layer2Snapshot.activeTeamId) || null,
    },
  };

  try {
    await db
      .collection("alexAuditLog")
      .doc(userId)
      .collection(sessId)
      .doc(msgId)
      .set(record);
  } catch (err) {
    // Audit logging should never block the response
    console.error("[alexAuditLog] Write failed (non-blocking):", err.message);
  }

  return msgId;
}

module.exports = { logAlexInteraction, generateMessageId };
