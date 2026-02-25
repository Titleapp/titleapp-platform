/**
 * sendgridWebhook.js — SendGrid delivery event webhook.
 * Events: delivered, opened, clicked, bounced, unsubscribed, spam_report
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function sendgridWebhook(req, res) {
  const db = getDb();
  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    if (!event || !event.event) continue;

    await db.collection("emailActivity").add({
      event: event.event,
      email: event.email,
      timestamp: event.timestamp
        ? new Date(event.timestamp * 1000)
        : admin.firestore.FieldValue.serverTimestamp(),
      sgMessageId: event.sg_message_id || null,
      category: event.category || [],
      url: event.url || null,
      reason: event.reason || null,
      rawEvent: event,
    });

    // Handle actionable events
    if (event.event === "bounce") {
      // Mark contact email as invalid
      const contactSnap = await db
        .collection("contacts")
        .where("email", "==", event.email)
        .limit(1)
        .get();
      if (!contactSnap.empty) {
        await db.collection("contacts").doc(contactSnap.docs[0].id).update({
          emailValid: false,
          tags: admin.firestore.FieldValue.arrayUnion("bounced"),
        });
      }
      await logActivity("communication", `Email bounced: ${event.email}`, "warning");
    }

    if (event.event === "spamreport") {
      const contactSnap = await db
        .collection("contacts")
        .where("email", "==", event.email)
        .limit(1)
        .get();
      if (!contactSnap.empty) {
        await db.collection("contacts").doc(contactSnap.docs[0].id).update({
          doNotContact: true,
          tags: admin.firestore.FieldValue.arrayUnion("spam_report"),
        });
      }
      await logActivity("communication", `Spam report from: ${event.email}`, "error");
    }

    if (event.event === "unsubscribe") {
      const contactSnap = await db
        .collection("contacts")
        .where("email", "==", event.email)
        .limit(1)
        .get();
      if (!contactSnap.empty) {
        await db.collection("contacts").doc(contactSnap.docs[0].id).update({
          unsubscribed: true,
          tags: admin.firestore.FieldValue.arrayUnion("unsubscribed"),
        });
      }
      await logActivity("communication", `Unsubscribed: ${event.email}`, "info");
    }
  }

  return res.status(200).send("OK");
}

module.exports = { sendgridWebhook };
