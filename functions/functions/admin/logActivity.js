/**
 * logActivity.js — Utility to write activity feed events.
 * Import from any Cloud Function to log platform activity.
 */

const admin = require("firebase-admin");

/**
 * @param {string} type - Event type: signup, worker, revenue, error, communication, pipeline, system
 * @param {string} message - Human-readable event description
 * @param {string} severity - info | success | warning | error
 * @param {object} metadata - Additional structured data
 */
async function logActivity(type, message, severity = "info", metadata = {}) {
  const db = admin.firestore();
  const event = {
    type,
    message,
    severity,
    metadata,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("activityFeed").add(event);
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
}

module.exports = { logActivity };
