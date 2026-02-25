/**
 * sendgridInbound.js — Inbound Parse webhook from SendGrid.
 * Handles incoming emails to @incoming.titleapp.ai
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function sendgridInbound(req, res) {
  const db = getDb();
  const { from, to, subject, text, html } = req.body || {};

  if (!from) {
    return res.status(400).send("Missing from field");
  }

  // Extract email address from "Name <email>" format
  const emailMatch = from.match(/<([^>]+)>/) || [null, from];
  const fromEmail = emailMatch[1] || from;

  // Store raw inbound
  const inboundRef = await db.collection("inboundMessages").add({
    channel: "email",
    from: fromEmail,
    fromRaw: from,
    to: to || "",
    subject: subject || "(no subject)",
    body: text || "",
    htmlBody: html || "",
    processedAt: null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Match to contact
  const contactSnap = await db
    .collection("contacts")
    .where("email", "==", fromEmail)
    .limit(1)
    .get();

  let contactId = null;
  if (!contactSnap.empty) {
    contactId = contactSnap.docs[0].id;
    await db.collection("contacts").doc(contactId).update({
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      totalMessages: admin.firestore.FieldValue.increment(1),
    });
  }

  // Log to unified messages
  await db.collection("messages").add({
    channel: "email",
    direction: "inbound",
    from: fromEmail,
    to: to || "",
    subject: subject || "(no subject)",
    body: text || "",
    contactId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    alexAction: null,
    sentiment: null,
    intent: null,
  });

  await logActivity(
    "communication",
    `Inbound email from ${fromEmail}: "${(subject || "").slice(0, 60)}"`,
    "info",
    { contactId, inboundId: inboundRef.id }
  );

  return res.status(200).send("OK");
}

module.exports = { sendgridInbound };
