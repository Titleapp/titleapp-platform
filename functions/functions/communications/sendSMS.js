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

  // Twilio REST API — using fetch instead of SDK to avoid extra dependency
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    await logActivity("error", `SMS send failed to ${to}: ${result.message || "unknown"}`, "error");
    return res.status(500).json({ ok: false, error: result.message || "SMS send failed" });
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
