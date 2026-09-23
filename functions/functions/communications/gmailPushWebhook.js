"use strict";

/**
 * gmailPushWebhook.js — receives Cloud Pub/Sub push notifications for the
 * alex@sociii.ai mailbox (Gmail's watch() API publishes here on new mail),
 * fetches what changed since the last processed historyId, and routes any
 * message addressed to a persona alias into personaEmailReplyPipeline.
 *
 * Setup (one-time, outside this file):
 *   1. Pub/Sub topic + push subscription pointing at this route's URL.
 *   2. gmail-api-push@system.gserviceaccount.com granted pubsub.publisher
 *      on that topic (Google's documented requirement for Gmail push).
 *   3. gmail.watchMailbox() called once (and renewed — see
 *      gmailWatchRenewal.js) for the alex@sociii.ai connected account.
 */

const admin = require("firebase-admin");
const gmailService = require("../services/social/gmail");
const { processInboundPersonaMessage, MAILBOX_OWNER_EMAIL } = require("./personaEmailReplyPipeline");
const { SOCIII_TENANT_ID } = require("../config/personaEmailIdentities");
const { checkGatesStatus } = require("../config/capabilityGates");

function getDb() { return admin.firestore(); }

const WATCH_STATE_DOC = "gmailWatchState/alex_sociii_ai";

let cachedSeanUid = null;
async function getSeanUid() {
  if (cachedSeanUid) return cachedSeanUid;
  const user = await admin.auth().getUserByEmail("sean@sociii.ai");
  cachedSeanUid = user.uid;
  return cachedSeanUid;
}

async function handleGmailPushWebhook(req, res) {
  // Ack fast — Pub/Sub retries on non-2xx or timeout, and retries would
  // reprocess the same historyId range and could double-send replies.
  // Respond immediately, do the real work after.
  res.status(204).end();

  try {
    const messageData = req.body?.message?.data;
    if (!messageData) {
      console.warn("[gmailPushWebhook] no message.data in push payload");
      return;
    }
    const decoded = JSON.parse(Buffer.from(messageData, "base64").toString("utf8"));
    const { emailAddress, historyId: newHistoryId } = decoded;
    if (emailAddress !== MAILBOX_OWNER_EMAIL) {
      console.warn(`[gmailPushWebhook] push for unexpected mailbox ${emailAddress}, ignoring`);
      return;
    }

    const uid = await getSeanUid();
    const db = getDb();
    const stateRef = db.doc(WATCH_STATE_DOC);
    const stateSnap = await stateRef.get();
    const lastHistoryId = stateSnap.exists ? stateSnap.data().lastHistoryId : null;

    if (!lastHistoryId) {
      // First push since watch() started — nothing to diff against yet.
      // Store this historyId as the new baseline and wait for the next push.
      await stateRef.set({ lastHistoryId: newHistoryId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return;
    }

    // Red-team round 2, point #2: Gmail exposes no "does a watch currently
    // exist" endpoint — a push message actually arriving IS the ground
    // truth that one does, stronger evidence than any stored Firestore
    // flag (which a bypass wouldn't update). So gates are checked HERE,
    // continuously, on every push — not just once at activation. If gates
    // are failing while a message is arriving anyway, that's exactly the
    // "registry bypassed" case, and this is red regardless of what any
    // other state says.
    const gateStatus = await checkGatesStatus("persona-email-inbound-listener");
    if (!gateStatus.allPass) {
      console.error("[gmailPushWebhook] CRITICAL: inbound message arrived while gates are failing — a watch exists despite an unmet/bypassed gate.", JSON.stringify(gateStatus.failed));
      try {
        await gmailService.stopWatch(uid, SOCIII_TENANT_ID, {
          fromEmail: MAILBOX_OWNER_EMAIL,
          reason: `gate bypass detected on inbound push: ${gateStatus.failed.map((f) => f.id).join(", ")}`,
        });
        console.error("[gmailPushWebhook] stopWatch() called in response — watch should now be stopped.");
      } catch (stopErr) {
        console.error("[gmailPushWebhook] stopWatch() itself failed:", stopErr.message);
      }
      // Do not process or reply to the message that triggered this — the
      // capability isn't approved to be live at all right now.
      return;
    }

    const history = await gmailService.historySince(uid, SOCIII_TENANT_ID, {
      fromEmail: MAILBOX_OWNER_EMAIL,
      startHistoryId: lastHistoryId,
    });

    const seenMessageIds = new Set();
    for (const record of history) {
      for (const added of record.messagesAdded || []) {
        const msgId = added.message?.id;
        if (!msgId || seenMessageIds.has(msgId)) continue;
        seenMessageIds.add(msgId);
        try {
          const raw = await gmailService.getMessageRaw(uid, SOCIII_TENANT_ID, {
            fromEmail: MAILBOX_OWNER_EMAIL,
            messageId: msgId,
          });
          // Skip anything already in SENT (our own outbound replies show up
          // in history too) — only react to genuinely received mail.
          if ((raw.labelIds || []).includes("SENT")) continue;
          const result = await processInboundPersonaMessage(uid, raw);
          console.log(`[gmailPushWebhook] message ${msgId}:`, result);
        } catch (err) {
          console.error(`[gmailPushWebhook] failed processing message ${msgId}:`, err.message);
        }
      }
    }

    await stateRef.set({ lastHistoryId: newHistoryId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error("[gmailPushWebhook] unhandled error:", err.message, err.stack);
  }
}

module.exports = { handleGmailPushWebhook };
