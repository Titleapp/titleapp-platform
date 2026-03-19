"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
function nowServerTs() { return admin.firestore.FieldValue.serverTimestamp(); }

/**
 * Generate and deliver a session summary for a guest who chatted with Alex.
 *
 * @param {string} guestId — session ID from the guest chat
 * @returns {{ ok: boolean, summary?: string, error?: string }}
 */
async function summarizeGuestSession(guestId) {
  const db = getDb();

  // Load guest session
  const sessionRef = db.collection("chatSessions").doc(guestId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return { ok: false, error: "Session not found" };

  const sessionState = sessionSnap.data().state || {};
  const history = sessionState.salesHistory || [];
  if (history.length < 2) return { ok: false, error: "Session too short for summary" };

  // Load guest contact info
  const contactSnap = await db.collection("guestContacts").doc(guestId).get();
  const contact = contactSnap.exists ? contactSnap.data() : {};

  // Generate summary via Claude
  const { getAnthropic } = require("../../helpers/anthropic");
  const anthropic = getAnthropic();

  const conversationText = history.map(h =>
    `${h.role === "user" ? "Prospect" : "Alex"}: ${h.content}`
  ).join("\n");

  const summaryPrompt = `You are Alex, Chief of Staff at TitleApp. Summarize this conversation for the prospect.

Format: "Here's what we covered..." — first person, Alex voice, warm and professional.
Include: vertical discussed, workers mentioned, pain points, and next steps.
Keep it concise — 3-5 short paragraphs. End with a clear next step.

Conversation:
${conversationText}

Prospect name: ${contact.name || sessionState.prospectName || "there"}
Vertical: ${sessionState.campaignSlug || "general"}`;

  const aiResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 512,
    messages: [{ role: "user", content: summaryPrompt }],
  });

  const summary = aiResponse.content[0]?.text || "Thanks for chatting with me today. Come back anytime to continue.";

  // Post summary to chat session (visible if they return)
  history.push({ role: "assistant", content: summary });
  await sessionRef.update({
    "state.salesHistory": history,
    "state.summaryGeneratedAt": new Date().toISOString(),
    updatedAt: nowServerTs(),
  });

  // Deliver via contact method
  const name = contact.name || sessionState.prospectName || "there";
  const vertical = sessionState.campaignSlug || "";
  const returnLink = `https://app.titleapp.ai/meet-alex?vertical=${encodeURIComponent(vertical)}&returning=true`;

  if (contact.email) {
    try {
      const { sendViaSendGrid } = require("../../communications/emailNotify");
      await sendViaSendGrid({
        to: contact.email,
        subject: `Here's your TitleApp recap, ${name}`,
        html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${summary}</div>
          <div style="margin-top: 24px;"><a href="${returnLink}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Continue with Alex</a></div>
          <div style="margin-top: 16px; font-size: 12px; color: #94a3b8;">— Alex, Chief of Staff at TitleApp</div>
        </div>`,
      });
    } catch (emailErr) {
      console.warn("guestSummary: email delivery failed:", emailErr.message);
    }
  }

  // Write drip trigger if not converted
  if (contact.email || contact.phone) {
    try {
      await db.collection("campaigns").doc("drip").collection("queue").doc(guestId).set({
        guestId,
        name,
        email: contact.email || null,
        phone: contact.phone || null,
        vertical,
        summary,
        touches: [
          { day: 0, type: "summary", sent: true, sentAt: new Date().toISOString() },
          { day: 2, type: "worker_highlight", sent: false },
          { day: 5, type: "free_trial_cta", sent: false },
        ],
        createdAt: nowServerTs(),
        stoppedAt: null,
      });
    } catch (dripErr) {
      console.warn("guestSummary: drip trigger failed:", dripErr.message);
    }
  }

  return { ok: true, summary };
}

module.exports = { summarizeGuestSession };
