/**
 * twilioInbound.js — Inbound SMS webhook from Twilio.
 * Handles STOP/YES compliance, sandbox replies, and Alex routing.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");
const { resolveInboundTenant } = require("./resolveInboundTenant");

function getDb() { return admin.firestore(); }

const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "yes", "unstop", "subscribe"];

async function twilioInbound(req, res) {
  const db = getDb();
  const { From: from, To: to, Body: body, MessageSid: sid } = req.body || {};

  if (!from || !body) {
    return res.status(400).send("Missing required fields");
  }

  const bodyLower = (body || "").trim().toLowerCase();

  // 50.13 Layer E — resolve which workspace the inbound message belongs to.
  // Without this, contact mutations cross workspace boundaries (a STOP from
  // workspace A could opt out a contact in workspace B if phone numbers match).
  const tenancy = await resolveInboundTenant("twilio", req.body || {});
  const tenantId = tenancy.tenantId;
  const tenantSkipReason = tenantId ? null : tenancy.reason;

  // ── STOP / UNSUBSCRIBE ────────────────────────────────────────
  if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
    // Contact mutation is tenant-scoped. User-level opt-out below is global
    // (the user's cross-tenant identity, not contact records).
    if (tenantId) {
      const contactSnap = await db.collection("contacts")
        .where("tenantId", "==", tenantId)
        .where("phone", "==", from)
        .limit(1).get();
      if (!contactSnap.empty) {
        await contactSnap.docs[0].ref.update({
          smsOptOut: true,
          smsOptOutAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    // Update user
    const userSnap = await db.collection("users").where("phone", "==", from).limit(1).get();
    if (!userSnap.empty) {
      await userSnap.docs[0].ref.update({ smsOptOut: true });
      // Cancel pending SMS in messageQueue
      const pendingSms = await db.collection("messageQueue")
        .where("to", "==", from)
        .where("channel", "==", "sms")
        .where("status", "==", "pending")
        .limit(50)
        .get();
      for (const doc of pendingSms.docs) {
        await doc.ref.update({ status: "cancelled", error: "User opted out" });
      }
    }

    await logActivity("communication", `SMS opt-out from ${from}`, "info");
    res.set("Content-Type", "text/xml");
    return res.send("<Response><Message>You have been unsubscribed from TitleApp SMS. Reply START to re-subscribe.</Message></Response>");
  }

  // ── START / OPT-IN ────────────────────────────────────────────
  if (OPT_IN_KEYWORDS.includes(bodyLower)) {
    if (tenantId) {
      const contactSnap = await db.collection("contacts")
        .where("tenantId", "==", tenantId)
        .where("phone", "==", from)
        .limit(1).get();
      if (!contactSnap.empty) {
        await contactSnap.docs[0].ref.update({
          smsOptOut: false,
          smsOptInAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    const userSnap = await db.collection("users").where("phone", "==", from).limit(1).get();
    if (!userSnap.empty) {
      await userSnap.docs[0].ref.update({ smsOptOut: false });
    }

    await logActivity("communication", `SMS opt-in from ${from}`, "info");
    res.set("Content-Type", "text/xml");
    return res.send("<Response><Message>You have been re-subscribed to TitleApp SMS. Reply STOP to unsubscribe.</Message></Response>");
  }

  // ── SANDBOX REPLY ROUTING ─────────────────────────────────────
  const userByPhone = await db.collection("users").where("phone", "==", from).limit(1).get();
  if (!userByPhone.empty) {
    const uid = userByPhone.docs[0].id;
    const activeSessions = await db.collection("sandboxSessions")
      .where("userId", "==", uid)
      .where("status", "in", ["vibe_in_progress", "spec_ready"])
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!activeSessions.empty) {
      await db.collection("sandboxReplies").add({
        sessionId: activeSessions.docs[0].id,
        userId: uid,
        body,
        from,
        channel: "sms",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await logActivity("communication", `Sandbox SMS reply from ${from}`, "info", { sessionId: activeSessions.docs[0].id });
      res.set("Content-Type", "text/xml");
      return res.send("<Response></Response>");
    }
  }

  // ── DEFAULT: Store + Alex routing ─────────────────────────────
  // Always log inbound (tenancy may be null — record it for traceability).
  const inboundRef = await db.collection("inboundMessages").add({
    channel: "sms",
    from,
    to,
    body,
    twilioSid: sid || null,
    tenantId: tenantId || null,
    tenantSkipReason: tenantSkipReason || null,
    processedAt: null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Without a resolved tenant, do not mutate contacts or route through Alex —
  // we have no workspace to route the message to. Log + skip cleanly.
  if (!tenantId) {
    await logActivity(
      "communication",
      `Inbound SMS skipped (no tenant): ${tenantSkipReason} — from=${from} to=${to}`,
      "warning",
      { inboundId: inboundRef.id }
    );
    res.set("Content-Type", "text/xml");
    return res.send("<Response></Response>");
  }

  // Match sender to contact by phone within the resolved tenant.
  const contactSnap = await db.collection("contacts")
    .where("tenantId", "==", tenantId)
    .where("phone", "==", from)
    .limit(1).get();
  let contactId = null;
  if (!contactSnap.empty) {
    contactId = contactSnap.docs[0].id;
    await db.collection("contacts").doc(contactId).update({
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      totalMessages: admin.firestore.FieldValue.increment(1),
    });
  }

  // Log to unified messages
  const messageRef = await db.collection("messages").add({
    channel: "sms",
    direction: "inbound",
    from,
    to,
    body,
    contactId,
    tenantId,
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

  // Route through Alex intent detection
  try {
    const { processInboundMessage } = require("./processInboundMessage");
    await processInboundMessage(messageRef.id);
  } catch (e) {
    console.error("[twilioInbound] processInboundMessage failed:", e.message);
  }

  // Twilio expects TwiML response
  res.set("Content-Type", "text/xml");
  return res.send("<Response></Response>");
}

module.exports = { twilioInbound };
