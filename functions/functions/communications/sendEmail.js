/**
 * sendEmail.js — Outbound email via SendGrid v3 API.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function sendEmail(req, res) {
  const db = getDb();
  const { to, from, subject, body, htmlBody, contactId, purpose } = req.body || {};
  if (!to || !subject || (!body && !htmlBody)) {
    return res.status(400).json({ ok: false, error: "to, subject, and body/htmlBody required" });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: "SendGrid not configured" });
  }

  const fromAddr = from || "alex@titleapp.ai";

  const sgPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromAddr, name: fromAddr === "alex@titleapp.ai" ? "Alex — TitleApp" : "TitleApp" },
    subject,
    content: [],
  };

  if (body) sgPayload.content.push({ type: "text/plain", value: body });
  if (htmlBody) sgPayload.content.push({ type: "text/html", value: htmlBody });

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sgPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    await logActivity("error", `Email send failed to ${to}: ${errText.slice(0, 200)}`, "error");
    return res.status(500).json({ ok: false, error: "Email send failed" });
  }

  // Log to messages/ and emailActivity/
  const messageDoc = {
    channel: "email",
    direction: "outbound",
    from: fromAddr,
    to,
    subject,
    body: body || "",
    contactId: contactId || null,
    purpose: purpose || "outbound",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("messages").add(messageDoc);
  await db.collection("emailActivity").add({
    ...messageDoc,
    event: "sent",
  });

  await logActivity("communication", `Email sent to ${to}: "${subject}"`, "info", { contactId });

  return res.json({ ok: true });
}

module.exports = { sendEmail };
