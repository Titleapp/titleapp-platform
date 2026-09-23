"use strict";

/**
 * personaEmailReplyPipeline.js — orchestrates one inbound message addressed
 * to a persona alias (ivy@/max@/jordan@sociii.ai): identify the persona,
 * draft a reply, run it through the moderation gate, and either send it or
 * hold it for Sean's approval.
 *
 * Callers: services/communications/gmailPushWebhook.js (real inbound mail).
 */

const crypto = require("crypto");
const admin = require("firebase-admin");
const { getWorkerSlugForEmail, getPersonaEmailIdentity, SOCIII_TENANT_ID } = require("../config/personaEmailIdentities");
const { generatePersonaReply, PERSONA_VOICE } = require("../services/communications/personaEmailReplyGenerator");
const { reviewDraftReply } = require("../services/communications/emailReplyModerationGate");
const gmailService = require("../services/social/gmail");

function getDb() { return admin.firestore(); }

// The alex@sociii.ai mailbox that physically holds all persona aliases,
// connected as an "extra account" under Sean's own platform user. Sean is
// the only human who completes that OAuth connection, so his uid is the
// fixed anchor for every persona send/watch call — this is not a
// per-persona identity, just where the token lives.
const MAILBOX_OWNER_EMAIL = "alex@sociii.ai";

function headerValue(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

function extractPlainText(payload) {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf8");
  }
  for (const part of payload.parts || []) {
    const text = extractPlainText(part);
    if (text) return text;
  }
  // Fall back to text/html stripped of tags if no plain-text part exists.
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = Buffer.from(payload.body.data, "base64").toString("utf8");
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function extractEmailAddress(headerVal) {
  if (!headerVal) return null;
  const match = headerVal.match(/<([^>]+)>/);
  return (match ? match[1] : headerVal).trim().toLowerCase();
}

/**
 * @param {string} uid — Sean's platform uid (owner of the alex@sociii.ai connection)
 * @param {object} rawMessage — result of gmailService.getMessageRaw
 */
async function processInboundPersonaMessage(uid, rawMessage) {
  const headers = rawMessage.payload?.headers || [];
  const deliveredTo = extractEmailAddress(headerValue(headers, "Delivered-To")) || extractEmailAddress(headerValue(headers, "X-Original-To"));
  const toHeader = extractEmailAddress(headerValue(headers, "To"));
  const candidateAddress = deliveredTo || toHeader;

  const workerSlug = getWorkerSlugForEmail(candidateAddress);
  if (!workerSlug || !PERSONA_VOICE[workerSlug]) {
    // Not addressed to a persona alias we handle (e.g. plain alex@sociii.ai
    // mail, or an alias like sage@/reed@ that has no send capability yet).
    return { handled: false, reason: `no persona mapping for ${candidateAddress}` };
  }

  const identity = getPersonaEmailIdentity(workerSlug, SOCIII_TENANT_ID);
  const fromAddr = extractEmailAddress(headerValue(headers, "From"));
  const subject = headerValue(headers, "Subject") || "(no subject)";
  const inboundBody = extractPlainText(rawMessage.payload);
  const gmailMessageId = headerValue(headers, "Message-ID");

  // Never auto-reply to our own test messages or to the persona addresses
  // themselves — guards against a reply loop between two personas.
  if (!fromAddr || fromAddr === candidateAddress || Object.values(PERSONA_VOICE).some((p) => fromAddr === `${p.name.toLowerCase()}@sociii.ai`)) {
    return { handled: false, reason: `refusing to reply to ${fromAddr} (self or sibling persona, avoids a loop)` };
  }

  const draftText = await generatePersonaReply(workerSlug, { from: fromAddr, subject, body: inboundBody });
  const review = await reviewDraftReply({ draftText, inboundText: inboundBody, personaName: identity.personaName });

  const sendArgs = {
    to: [fromAddr],
    subject: subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`,
    body: draftText,
    fromEmail: identity.email,
    threadId: rawMessage.threadId,
    inReplyTo: gmailMessageId,
    references: gmailMessageId,
  };

  if (!review.needsApproval) {
    // Gate is enforced inside gmailService.sendEmail() itself for any
    // persona fromEmail (see gmail.js) — not duplicated at each call site.
    const result = await gmailService.sendEmail(uid, SOCIII_TENANT_ID, sendArgs);
    await getDb().collection("personaEmailReplyLog").add({
      workerSlug, personaName: identity.personaName, personaEmail: identity.email,
      to: fromAddr, subject, draftText, status: "sent", moderation: review,
      gmailMessageId: result.messageId, threadId: result.threadId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { handled: true, status: "sent", workerSlug };
  }

  // Held for approval.
  const approvalToken = crypto.randomBytes(24).toString("hex");
  const pendingRef = await getDb().collection("pendingPersonaEmailApprovals").add({
    workerSlug, personaName: identity.personaName, personaEmail: identity.email,
    to: fromAddr, subject: sendArgs.subject, draftText, inboundBody,
    sendArgs,
    moderation: review, approvalToken, status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await notifySeanOfPendingApproval({
    pendingId: pendingRef.id, approvalToken, personaName: identity.personaName,
    fromAddr, subject: sendArgs.subject, draftText, reason: review.reason, category: review.category,
  });

  return { handled: true, status: "held_for_approval", workerSlug, pendingId: pendingRef.id };
}

async function notifySeanOfPendingApproval({ pendingId, approvalToken, personaName, fromAddr, subject, draftText, reason, category }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("[personaEmailReplyPipeline] SENDGRID_API_KEY missing — cannot notify Sean of pending approval", pendingId);
    return;
  }
  const base = process.env.PUBLIC_API_BASE_URL || "https://sociii.ai/api";
  const approveUrl = `${base}/v1/persona-email/approve?id=${pendingId}&token=${approvalToken}`;
  const rejectUrl = `${base}/v1/persona-email/reject?id=${pendingId}&token=${approvalToken}`;
  const body =
    `${personaName}'s draft reply to ${fromAddr} was held for review.\n\n` +
    `Flag reason (${category}): ${reason}\n\n` +
    `Subject: ${subject}\n\n---\n${draftText}\n---\n\n` +
    `Approve and send: ${approveUrl}\n` +
    `Reject (do not send): ${rejectUrl}`;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: "sean@sociii.ai" }] }],
      from: { email: "alex@sociii.ai", name: "Alex — SOCIII" },
      subject: `[Approval needed] ${personaName} reply to ${fromAddr}`,
      content: [{ type: "text/plain", value: body }],
    }),
  });
}

/**
 * HTTP handler for the approve/reject links sent in the notification email.
 * `action` is "approve" or "reject". Token check is the only auth — the
 * link is only ever sent to sean@sociii.ai, and the token is a random
 * 24-byte value never exposed anywhere else.
 */
async function handlePersonaEmailApprovalAction(req, res, action) {
  const { id, token } = req.query || {};
  if (!id || !token) return res.status(400).send("Missing id or token.");

  const ref = getDb().collection("pendingPersonaEmailApprovals").doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).send("This approval request no longer exists.");
  const data = snap.data();

  if (data.approvalToken !== token) return res.status(403).send("Invalid or expired approval link.");
  if (data.status !== "pending") return res.status(409).send(`This draft was already ${data.status}.`);

  if (action === "reject") {
    await ref.update({ status: "rejected", resolvedAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).send(`Rejected — ${data.personaName}'s draft reply to ${data.to} will not be sent.`);
  }

  try {
    const seanUser = await admin.auth().getUserByEmail("sean@sociii.ai");
    const result = await gmailService.sendEmail(seanUser.uid, SOCIII_TENANT_ID, data.sendArgs);
    await ref.update({
      status: "sent", resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      gmailMessageId: result.messageId, gmailThreadId: result.threadId,
    });
    return res.status(200).send(`Sent — ${data.personaName}'s reply to ${data.to} is on its way.`);
  } catch (err) {
    console.error("[personaEmailReplyPipeline] approval send failed:", err.message);
    return res.status(500).send("Approved, but the send failed — check the logs.");
  }
}

// CODEX 100's round-2 red-team pass flagged this as a real gap, not a
// "decide later" item: Sean flies 14-on/14-off, and the doc's own
// escalation thresholds (24h warn / 48h red) assume someone can act
// within that window — a red alert firing on day 2 of a rotation could sit
// for 12+ days with no decided fallback. The doc's own text already names
// the safe default ("a stale draft expires unsent, never auto-sends on
// timeout") — that default needs no judgment call from Sean to implement
// (a specific backup-approver identity would), so it ships now rather
// than waiting on him. A backup-approver is still a real, separate,
// open decision — this doesn't resolve that, it just closes the
// worse failure mode (silent indefinite limbo / accidental auto-send)
// while it's still undecided.
const STALE_APPROVAL_THRESHOLD_MS = 48 * 60 * 60 * 1000;
async function expireStalePersonaEmailApprovals() {
  const db = getDb();
  const cutoffMs = Date.now() - STALE_APPROVAL_THRESHOLD_MS;
  const snap = await db.collection("pendingPersonaEmailApprovals")
    .where("status", "==", "pending")
    .get();
  let expired = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const createdMs = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : null;
    if (createdMs === null || createdMs > cutoffMs) continue;
    await doc.ref.update({
      status: "expired",
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiredReason: `never actioned within ${STALE_APPROVAL_THRESHOLD_MS / 3600000}h — safe default is expire unsent, never auto-send on timeout`,
    });
    expired++;
  }
  if (expired > 0) console.log(`[personaEmailReplyPipeline] expired ${expired} stale pending approval(s), unsent`);

  // Heartbeat — red-team round 4: this sweep is now a safety-critical
  // fail-safe (expires stuck approvals unsent rather than letting them sit
  // in limbo), so something needs to confirm it's still running on
  // schedule rather than assuming silence means healthy. Written on every
  // run, even when nothing expired. Read by devWorker.js's
  // checkExpirySweepHeartbeat().
  await db.doc("config/personaEmailExpirySweepHealth").set({
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    lastRunAtMs: Date.now(),
    lastExpiredCount: expired,
  }, { merge: true });

  return { expired };
}

module.exports = {
  processInboundPersonaMessage,
  MAILBOX_OWNER_EMAIL,
  notifySeanOfPendingApproval,
  handlePersonaEmailApprovalAction,
  expireStalePersonaEmailApprovals,
};
