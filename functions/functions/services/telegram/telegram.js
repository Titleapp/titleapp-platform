"use strict";

/**
 * telegram.js — Telegram Bot API integration.
 *
 * Alex uses this to send messages, post to channels, and receive replies.
 * All sends go through the human-approval gate (Alex proposes → user approves).
 *
 * ENV vars required:
 *   TELEGRAM_BOT_TOKEN       — from BotFather (@BotFather → /newbot)
 *   TELEGRAM_OWNER_CHAT_ID   — Sean's personal chat ID (DM the bot, then /v1/telegram:getMe)
 *   TELEGRAM_ADVISOR_GROUP_ID — Advisor group chat ID (add bot to group, check /v1/telegram:getMe)
 *
 * How to get chat IDs after creating the bot:
 *   1. DM the bot any message
 *   2. Call GET https://api.telegram.org/bot{TOKEN}/getUpdates
 *   3. Read chat.id from the update — that's the chat ID
 *   Negative IDs = groups/channels. Positive IDs = private chats.
 */

const admin = require("firebase-admin");
function getDb() { return admin.firestore(); }

const BOT_API = "https://api.telegram.org";

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured — create a bot at @BotFather");
  return token;
}

async function telegramRequest(method, params = {}) {
  const token = getBotToken();
  const fetch = (await import("node-fetch")).default;
  const res = await fetch(`${BOT_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error (${method}): ${data.description}`);
  return data.result;
}

// ═══════════════════════════════════════════════════════════════
//  CORE SEND
// ═══════════════════════════════════════════════════════════════

/**
 * sendMessage — send a text message to any chat (personal, group, channel).
 * parse_mode: "HTML" for bold/italic/links, "Markdown" for basic formatting.
 */
async function sendMessage(chatId, text, opts = {}) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode || "HTML",
    disable_web_page_preview: opts.disablePreview !== false,
    ...(opts.replyToMessageId ? { reply_to_message_id: opts.replyToMessageId } : {}),
  });
}

/**
 * sendDocument — send a file (PDF, etc.) to a chat.
 * fileUrl must be publicly accessible.
 */
async function sendDocument(chatId, fileUrl, caption = "") {
  return telegramRequest("sendDocument", { chat_id: chatId, document: fileUrl, caption });
}

// ═══════════════════════════════════════════════════════════════
//  NAMED DESTINATIONS (read from env)
// ═══════════════════════════════════════════════════════════════

function getOwnerChatId() {
  const id = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!id) throw new Error("TELEGRAM_OWNER_CHAT_ID not set — DM the bot, then run /v1/telegram:getUpdates to find it");
  return id;
}

function getAdvisorGroupId() {
  const id = process.env.TELEGRAM_ADVISOR_GROUP_ID;
  if (!id) throw new Error("TELEGRAM_ADVISOR_GROUP_ID not set — add the bot to the advisor group, then run /v1/telegram:getUpdates");
  return id;
}

async function sendToOwner(text, opts = {}) {
  return sendMessage(getOwnerChatId(), text, opts);
}

async function sendToAdvisorGroup(text, opts = {}) {
  return sendMessage(getAdvisorGroupId(), text, opts);
}

// "owner" → owner DM, "advisor-group" → advisor group, anything else → treat as raw chatId
async function sendToDestination(destination, text, opts = {}) {
  if (destination === "advisor-group") return sendToAdvisorGroup(text, opts);
  if (!destination || destination === "owner") return sendToOwner(text, opts);
  return sendMessage(destination, text, opts);
}

// ═══════════════════════════════════════════════════════════════
//  STATUS / DISCOVERY
// ═══════════════════════════════════════════════════════════════

async function getBotInfo() {
  return telegramRequest("getMe");
}

async function getUpdates(offset = 0) {
  return telegramRequest("getUpdates", { offset, limit: 10 });
}

async function isConfigured() {
  try {
    getBotToken();
    return {
      configured: true,
      hasOwnerChatId: !!process.env.TELEGRAM_OWNER_CHAT_ID,
      hasAdvisorGroupId: !!process.env.TELEGRAM_ADVISOR_GROUP_ID,
    };
  } catch {
    return { configured: false, hasOwnerChatId: false, hasAdvisorGroupId: false };
  }
}

// ═══════════════════════════════════════════════════════════════
//  WEBHOOK (inbound messages from Telegram → Alex)
// ═══════════════════════════════════════════════════════════════

/**
 * setWebhook — register our Cloud Run URL as the Telegram webhook.
 * Call once during setup. Telegram will POST updates to this URL.
 * webhookUrl: e.g. "https://api-feyfibglbq-uc.a.run.app/v1/telegram:webhook"
 */
async function setWebhook(webhookUrl) {
  return telegramRequest("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
  });
}

/**
 * processWebhookUpdate — handle an inbound Telegram update.
 * Stores the message in Firestore for Alex to read at next check-in.
 * Returns a summary string.
 */
async function processWebhookUpdate(update) {
  const db = getDb();
  const message = update.message;
  if (!message) return null;

  const entry = {
    telegramMessageId: message.message_id,
    chatId: String(message.chat.id),
    chatType: message.chat.type, // private | group | supergroup | channel
    from: {
      id: message.from?.id,
      username: message.from?.username || null,
      firstName: message.from?.first_name || null,
      lastName: message.from?.last_name || null,
    },
    text: message.text || null,
    date: message.date,
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    processed: false,
  };

  await db.collection("telegramInbound").add(entry);
  return entry;
}

/**
 * getUnreadMessages — fetch unprocessed inbound messages for Alex's triage.
 */
async function getUnreadMessages(limit = 20) {
  const db = getDb();
  const snap = await db.collection("telegramInbound")
    .where("processed", "==", false)
    .orderBy("date", "asc")
    .limit(limit)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function markMessagesRead(ids) {
  const db = getDb();
  const batch = db.batch();
  for (const id of ids) {
    batch.update(db.collection("telegramInbound").doc(id), { processed: true });
  }
  await batch.commit();
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleStatus(req, res) {
  const status = await isConfigured();
  let botInfo = null;
  if (status.configured) {
    try { botInfo = await getBotInfo(); } catch (_) {}
  }
  return res.json({ ok: true, ...status, botInfo });
}

async function handleSend(req, res) {
  const { destination, text, chatId } = req.body || {};
  if (!text) return res.status(400).json({ ok: false, error: "text required" });

  let targetChatId;
  if (chatId) {
    targetChatId = chatId;
  } else if (destination === "advisor-group") {
    targetChatId = getAdvisorGroupId();
  } else {
    // Default: owner's personal chat
    targetChatId = getOwnerChatId();
  }

  const result = await sendMessage(targetChatId, text);
  return res.json({ ok: true, messageId: result.message_id });
}

async function handleSetWebhook(req, res) {
  const { webhookUrl } = req.body || {};
  if (!webhookUrl) return res.status(400).json({ ok: false, error: "webhookUrl required" });
  const result = await setWebhook(webhookUrl);
  return res.json({ ok: true, result });
}

async function handleGetUpdates(req, res) {
  const updates = await getUpdates();
  return res.json({ ok: true, updates });
}

async function handleInboundWebhook(req, res) {
  try {
    const update = req.body || {};
    const entry = await processWebhookUpdate(update);
    return res.json({ ok: true, processed: !!entry });
  } catch (e) {
    console.error("[telegram:webhook] failed:", e.message);
    return res.json({ ok: true }); // Always 200 to Telegram or it will retry
  }
}

async function handleUnread(req, res) {
  const messages = await getUnreadMessages(parseInt(req.query?.limit || "20"));
  return res.json({ ok: true, messages });
}

module.exports = {
  sendMessage,
  sendDocument,
  sendToOwner,
  sendToAdvisorGroup,
  sendToDestination,
  getBotInfo,
  getUpdates,
  isConfigured,
  setWebhook,
  processWebhookUpdate,
  getUnreadMessages,
  markMessagesRead,
  handleStatus,
  handleSend,
  handleSetWebhook,
  handleGetUpdates,
  handleInboundWebhook,
  handleUnread,
};
