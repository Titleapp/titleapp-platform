/**
 * sendSMS.js — Outbound SMS via Twilio.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function sendSMS(req, res) {
  const db = getDb();
  const { to, body, contactId, pipelineId, purpose } = req.body || {};
  if (!to || !body) {
    return res.status(400).json({ ok: false, error: "to and body required" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({ ok: false, error: "Twilio not configured" });
  }

  // Send via shared Twilio helper
  const { sendSMSDirect } = require("./twilioHelper");
  let result;
  try {
    result = await sendSMSDirect(to, body);
  } catch (e) {
    await logActivity("error", `SMS send failed to ${to}: ${e.message}`, "error");
    return res.status(500).json({ ok: false, error: e.message });
  }

  // Log to messages/ and smsActivity/
  const messageDoc = {
    channel: "sms",
    direction: "outbound",
    from: fromNumber,
    to,
    body,
    twilioSid: result.sid,
    contactId: contactId || null,
    pipelineId: pipelineId || null,
    purpose: purpose || "outbound",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("messages").add(messageDoc);
  await db.collection("smsActivity").add({
    ...messageDoc,
    status: result.status,
  });

  await logActivity("communication", `SMS sent to ${to}`, "info", { twilioSid: result.sid, contactId });

  return res.json({ ok: true, sid: result.sid, status: result.status });
}

module.exports = { sendSMS };
