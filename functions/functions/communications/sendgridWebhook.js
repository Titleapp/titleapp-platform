/**
 * sendgridWebhook.js — SendGrid delivery event webhook.
 * Events: delivered, opened, clicked, bounced, unsubscribed, spam_report
 *
 * 50.13 Layer E — every event resolves its tenant before any contact
 * mutation. SendGrid batches events from multiple senders in a single POST,
 * so resolution happens per-event. Untenanted events are logged to
 * emailActivity for traceability but cannot mutate the contacts collection.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");
const { resolveInboundTenant } = require("./resolveInboundTenant");

function getDb() { return admin.firestore(); }

async function sendgridWebhook(req, res) {
  const db = getDb();
  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    if (!event || !event.event) continue;

    const tenancy = await resolveInboundTenant("sendgrid_webhook", event);
    const tenantId = tenancy.tenantId;
    const tenantSkipReason = tenantId ? null : tenancy.reason;

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
      tenantId: tenantId || null,
      tenantSkipReason: tenantSkipReason || null,
      rawEvent: event,
    });

    // Without a resolved tenant we cannot safely mutate contacts. Log + skip.
    if (!tenantId) {
      if (["bounce", "spamreport", "unsubscribe"].includes(event.event)) {
        await logActivity(
          "communication",
          `Email ${event.event} skipped (no tenant): ${tenantSkipReason} — ${event.email}`,
          "warning"
        );
      }
      continue;
    }

    // Handle actionable events — all queries scoped to the resolved tenant.
    if (event.event === "bounce") {
      const contactSnap = await db
        .collection("contacts")
        .where("tenantId", "==", tenantId)
        .where("email", "==", event.email)
        .limit(1)
        .get();
      if (!contactSnap.empty) {
        await db.collection("contacts").doc(contactSnap.docs[0].id).update({
          emailValid: false,
          tags: admin.firestore.FieldValue.arrayUnion("bounced"),
        });
      }
      await logActivity("communication", `Email bounced: ${event.email} (tenant ${tenantId})`, "warning");
    }

    if (event.event === "spamreport") {
      const contactSnap = await db
        .collection("contacts")
        .where("tenantId", "==", tenantId)
        .where("email", "==", event.email)
        .limit(1)
        .get();
      if (!contactSnap.empty) {
        await db.collection("contacts").doc(contactSnap.docs[0].id).update({
          doNotContact: true,
          tags: admin.firestore.FieldValue.arrayUnion("spam_report"),
        });
      }
      await logActivity("communication", `Spam report from: ${event.email} (tenant ${tenantId})`, "error");
    }

    if (event.event === "unsubscribe") {
      const contactSnap = await db
        .collection("contacts")
        .where("tenantId", "==", tenantId)
        .where("email", "==", event.email)
        .limit(1)
        .get();
      if (!contactSnap.empty) {
        await db.collection("contacts").doc(contactSnap.docs[0].id).update({
          unsubscribed: true,
          tags: admin.firestore.FieldValue.arrayUnion("unsubscribed"),
        });
      }
      await logActivity("communication", `Unsubscribed: ${event.email} (tenant ${tenantId})`, "info");
    }
  }

  return res.status(200).send("OK");
}

module.exports = { sendgridWebhook };
