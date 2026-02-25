/**
 * twilioInbound.js — Inbound SMS webhook from Twilio.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function twilioInbound(req, res) {
  const db = getDb();
  const { From: from, To: to, Body: body, MessageSid: sid } = req.body || {};

  if (!from || !body) {
    return res.status(400).send("Missing required fields");
  }

  // Store raw inbound
  const inboundRef = await db.collection("inboundMessages").add({
    channel: "sms",
    from,
    to,
    body,
    twilioSid: sid || null,
    processedAt: null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Match sender to contact by phone
  const contactSnap = await db
    .collection("contacts")
    .where("phone", "==", from)
    .limit(1)
    .get();

  let contactId = null;
  if (!contactSnap.empty) {
    contactId = contactSnap.docs[0].id;
    // Update last message
    await db.collection("contacts").doc(contactId).update({
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      totalMessages: admin.firestore.FieldValue.increment(1),
    });
  }

  // Log to unified messages
  await db.collection("messages").add({
    channel: "sms",
    direction: "inbound",
    from,
    to,
    body,
    contactId,
    twilioSid: sid || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    alexAction: null,
    sentiment: null,
    intent: null,
  });

  await logActivity(
    "communication",
    `Inbound SMS from ${from}: "${body.slice(0, 80)}${body.length > 80 ? "..." : ""}"`,
    "info",
    { contactId, inboundId: inboundRef.id }
  );

  // Twilio expects TwiML response
  res.set("Content-Type", "text/xml");
  return res.send("<Response></Response>");
}

module.exports = { twilioInbound };
