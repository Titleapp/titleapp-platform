/**
 * resolveInboundTenant — given an inbound webhook handler key and payload,
 * resolves which workspace tenant the event belongs to.
 *
 * Per CODEX 50.13 Layer E: handlers MUST NOT mutate contacts collection
 * without a resolved tenantId. Cross-tenant contact mutation was a privacy
 * bug — STOP from one workspace's customer could mark a contact in another
 * workspace if the phone/email matched.
 *
 * Mapping source: inboundChannelMap/{handler} document, where the doc body
 * is { [channelId]: tenantId }. Configured per-handler:
 *
 *   twilio              — channelId = the To number that received the SMS.
 *                         Each Twilio number is provisioned to a workspace.
 *   sendgrid_inbound    — channelId = the inbound email address (e.g. an
 *                         alias like incoming-acme@incoming.sociii.ai).
 *   sendgrid_webhook    — primary path: payload.category contains a
 *                         'tenant:<id>' tag injected per-send. Fallback:
 *                         cross-reference sg_message_id against messages/.
 *
 * Returns { tenantId, source } when resolved, { tenantId: null, reason }
 * when not. Callers log + skip on { tenantId: null }.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

async function resolveFromMap(handler, channelId) {
  if (!channelId) return { tenantId: null, reason: `no channel id` };
  const doc = await getDb().collection("inboundChannelMap").doc(handler).get();
  if (!doc.exists) {
    return { tenantId: null, reason: `inboundChannelMap/${handler} not configured` };
  }
  const map = doc.data() || {};
  const tenantId = map[channelId];
  if (!tenantId) {
    return { tenantId: null, reason: `channelId ${channelId} not mapped` };
  }
  return { tenantId, source: `inboundChannelMap/${handler}` };
}

async function resolveInboundTenant(handler, payload) {
  if (handler === "twilio") {
    const to = payload.To || payload.to || null;
    return resolveFromMap("twilio", to);
  }

  if (handler === "sendgrid_inbound") {
    const to = payload.to || null;
    return resolveFromMap("sendgrid_inbound", to);
  }

  if (handler === "sendgrid_webhook") {
    const categories = Array.isArray(payload.category) ? payload.category : [];
    const tag = categories.find(c => typeof c === "string" && c.startsWith("tenant:"));
    if (tag) {
      return { tenantId: tag.slice("tenant:".length), source: "sendgrid.category" };
    }
    if (payload.sg_message_id) {
      const snap = await getDb().collection("messages")
        .where("sgMessageId", "==", payload.sg_message_id)
        .limit(1)
        .get();
      if (!snap.empty) {
        const t = snap.docs[0].data().tenantId;
        if (t) return { tenantId: t, source: "messages.cross-reference" };
      }
    }
    return { tenantId: null, reason: "no tenant signal in event" };
  }

  return { tenantId: null, reason: `unknown handler: ${handler}` };
}

module.exports = { resolveInboundTenant };
