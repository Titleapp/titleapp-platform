/**
 * messageProcessor.js — 15-minute scheduled queue processor.
 * Sends pending messages from messageQueue (email + SMS).
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Process pending messages from the messageQueue collection.
 * Called every 15 minutes by the messageQueueProcessor scheduled function.
 */
async function processMessageQueue() {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  const pendingSnap = await db.collection("messageQueue")
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", now)
    .limit(200)
    .get();

  if (pendingSnap.empty) {
    console.log("[messageProcessor] No pending messages");
    return { ok: true, sent: 0, skipped: 0, failed: 0 };
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const msgDoc of pendingSnap.docs) {
    const msg = msgDoc.data();

    try {
      // Check SMS opt-out
      if (msg.channel === "sms" && msg.userId) {
        const userSnap = await db.collection("users").doc(msg.userId).get();
        if (userSnap.exists && userSnap.data().smsOptOut) {
          await msgDoc.ref.update({ status: "skipped", error: "User opted out of SMS" });
          skipped++;
          continue;
        }
      }

      if (!msg.to) {
        await msgDoc.ref.update({ status: "skipped", error: "No recipient address" });
        skipped++;
        continue;
      }

      if (msg.channel === "email") {
        const { sendViaSendGrid } = require("../services/marketingService/emailNotify");
        await sendViaSendGrid({
          to: msg.to,
          subject: msg.subject || "TitleApp",
          htmlBody: msg.body || undefined,
          textBody: msg.textBody || undefined,
        });
      } else if (msg.channel === "sms") {
        const { sendSMSDirect } = require("../communications/twilioHelper");
        await sendSMSDirect(msg.to, msg.body || "");
      } else {
        await msgDoc.ref.update({ status: "skipped", error: `Unknown channel: ${msg.channel}` });
        skipped++;
        continue;
      }

      await msgDoc.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      sent++;
    } catch (e) {
      console.error(`[messageProcessor] Failed ${msgDoc.id}:`, e.message);
      await msgDoc.ref.update({
        status: "failed",
        error: e.message,
        attempts: admin.firestore.FieldValue.increment(1),
      });
      failed++;
    }
  }

  console.log(`[messageProcessor] Done: sent=${sent}, skipped=${skipped}, failed=${failed}`);
  return { ok: true, sent, skipped, failed };
}

module.exports = { processMessageQueue };
