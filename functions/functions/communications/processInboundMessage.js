/**
 * processInboundMessage.js — Alex intent detection + autonomous response.
 * Called after an inbound message is stored.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

const INTENTS = {
  schedule_demo: { autoRespond: true, pipelineAction: "move_to_demo_scheduled" },
  pricing_question: { autoRespond: true },
  support_request: { autoRespond: true, domain: "service" },
  interested: { autoRespond: true, pipelineAction: "move_to_contacted" },
  not_interested: { autoRespond: true, pipelineAction: "move_to_closed_lost" },
  angry_customer: { autoRespond: false, escalate: true },
  legal_question: { autoRespond: false, escalate: true },
  investor_inquiry: { autoRespond: true, pipelineAction: "route_to_investor_pipeline" },
  spam: { autoRespond: false },
};

const INTENT_KEYWORDS = {
  schedule_demo: ["demo", "schedule", "meeting", "call", "show me"],
  pricing_question: ["price", "pricing", "cost", "how much", "plan", "subscription"],
  support_request: ["help", "support", "issue", "problem", "bug", "error", "broken"],
  interested: ["interested", "tell me more", "sounds good", "learn more", "curious"],
  not_interested: ["not interested", "no thanks", "unsubscribe", "stop", "remove me"],
  angry_customer: ["angry", "terrible", "worst", "sue", "lawyer", "complaint", "unacceptable"],
  legal_question: ["legal", "terms", "compliance", "regulation", "lawsuit", "liability"],
  investor_inquiry: ["invest", "funding", "safe", "equity", "angel", "vc", "seed"],
  spam: [],
};

function detectIntent(body) {
  const lower = (body || "").toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return intent;
    }
  }
  return "interested"; // Default: treat as interested
}

function detectSentiment(body) {
  const lower = (body || "").toLowerCase();
  const positiveWords = ["great", "love", "excellent", "amazing", "good", "interested", "excited"];
  const negativeWords = ["bad", "terrible", "angry", "frustrated", "disappointed", "hate", "worst"];

  let score = 0;
  for (const w of positiveWords) { if (lower.includes(w)) score++; }
  for (const w of negativeWords) { if (lower.includes(w)) score--; }

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

async function processInboundMessage(messageId) {
  const db = getDb();

  // Get message
  const msgSnap = await db.collection("messages").doc(messageId).get();
  if (!msgSnap.exists) return;
  const msg = msgSnap.data();

  // Detect intent and sentiment
  const intent = detectIntent(msg.body);
  const sentiment = detectSentiment(msg.body);
  const intentConfig = INTENTS[intent] || {};

  // Update message with analysis
  await db.collection("messages").doc(messageId).update({
    intent,
    sentiment,
    analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Get AI authorization config
  const configSnap = await db.collection("config").doc("aiAuthorization").get();
  const config = configSnap.exists ? configSnap.data() : {};
  const domain = intentConfig.domain || "sales";
  const domainConfig = config[domain] || {};

  // Handle escalation
  if (intentConfig.escalate) {
    await db.collection("escalations").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      domain,
      reason: intent,
      contactId: msg.contactId || null,
      context: `Inbound ${msg.channel} from ${msg.from}: "${(msg.body || "").slice(0, 200)}"`,
      alexAction: "escalated_to_owner",
      notifiedVia: ["dashboard"],
      resolved: false,
    });
    await logActivity("communication", `Escalated: ${intent} from ${msg.from}`, "warning", { messageId });
    return;
  }

  // Handle auto-respond
  if (intentConfig.autoRespond && domainConfig.autoRespond !== false) {
    // Generate draft (for now, store as draft for review)
    const draft = generateDraft(intent, msg);
    await db.collection("messages").doc(messageId).update({
      alexAction: config.mode === "autonomous" ? "auto_responded" : "drafted",
      alexResponse: draft,
    });

    if (config.mode !== "autonomous") {
      // Store in draft queue
      await db.collection("draftMessages").add({
        originalMessageId: messageId,
        to: msg.from,
        channel: msg.channel,
        body: draft,
        contactId: msg.contactId,
        status: "pending_review",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Handle pipeline action
  if (intentConfig.pipelineAction && msg.contactId) {
    // This would trigger pipeline stage changes — handled in pipeline module
    await logActivity("pipeline", `Pipeline action: ${intentConfig.pipelineAction} for contact ${msg.contactId}`, "info");
  }
}

function generateDraft(intent, msg) {
  const templates = {
    schedule_demo: "Thanks for your interest! I'd love to show you how TitleApp can help. Would any of these times work for a quick 15-minute demo?",
    pricing_question: "Great question! TitleApp starts free with 50 AI calls per month. Pro is $9/month with 500 calls, and Enterprise is $299/month with dedicated support. Happy to walk you through the details.",
    support_request: "I'm sorry you're running into an issue. I'm looking into this right now and will get back to you shortly with a solution.",
    interested: "Thank you for reaching out! I'd be happy to tell you more about how TitleApp can help. What's your primary use case?",
    not_interested: "Understood, thank you for letting me know. If anything changes, don't hesitate to reach out.",
    investor_inquiry: "Thank you for your interest in TitleApp. I'll have our team send over our investor materials. Would you prefer a deck or a quick call?",
  };
  return templates[intent] || "Thank you for your message. I'll get back to you shortly.";
}

module.exports = { processInboundMessage, detectIntent, detectSentiment };
