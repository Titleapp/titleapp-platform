/**
 * followUpCadence.js — Scheduled hourly: check contacts for pending follow-ups.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

const CADENCE_MAP = {
  day1: 1,
  day3: 3,
  day7: 7,
  day14: 14,
  day30: 30,
};

async function followUpCadence() {
  const db = getDb();
  const now = new Date();

  // Get AI authorization config
  const configSnap = await db.collection("config").doc("aiAuthorization").get();
  const config = configSnap.exists ? configSnap.data() : {};

  if (!config.sales?.autoFollowUp) return { ok: true, message: "Follow-ups disabled" };

  const cadenceStr = config.sales?.followUpCadence || "day1, day3, day7, day14, day30";
  const cadenceDays = cadenceStr
    .split(",")
    .map((s) => s.trim())
    .map((s) => CADENCE_MAP[s])
    .filter(Boolean);

  const maxFollowUps = config.sales?.maxFollowUps || 5;

  // Get contacts with active pipeline stages that need follow-up
  const contactsSnap = await db
    .collection("contacts")
    .where("pipelineStage", "in", ["LEAD", "CONTACTED", "PROPOSAL_SENT"])
    .get();

  let followUpCount = 0;

  for (const contactDoc of contactsSnap.docs) {
    const contact = contactDoc.data();
    if (contact.doNotContact || contact.unsubscribed) continue;

    const lastMessage = contact.lastMessageAt?.toDate?.() || contact.lastMessageAt;
    if (!lastMessage) continue;

    const daysSinceContact = Math.floor((now - new Date(lastMessage)) / 86400000);
    const followUpsSent = contact.followUpsSent || 0;

    if (followUpsSent >= maxFollowUps) continue;

    // Check if it's time for a follow-up
    const nextFollowUpDay = cadenceDays[followUpsSent];
    if (!nextFollowUpDay || daysSinceContact < nextFollowUpDay) continue;

    // It's time — draft a follow-up
    const draft = {
      to: contact.email,
      channel: "email",
      contactId: contactDoc.id,
      body: generateFollowUp(followUpsSent, contact),
      subject: generateFollowUpSubject(followUpsSent, contact),
      status: config.mode === "autonomous" ? "ready_to_send" : "pending_review",
      followUpNumber: followUpsSent + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("draftMessages").add(draft);

    // Update contact follow-up count
    await db.collection("contacts").doc(contactDoc.id).update({
      followUpsSent: admin.firestore.FieldValue.increment(1),
      lastFollowUpAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    followUpCount++;
  }

  if (followUpCount > 0) {
    await logActivity(
      "communication",
      `Follow-up cadence: ${followUpCount} follow-ups queued`,
      "info"
    );
  }

  return { ok: true, followUpsQueued: followUpCount };
}

function generateFollowUp(index, contact) {
  const templates = [
    `Hi ${contact.fullName || "there"}, just following up on my earlier message. Would love to chat about how TitleApp can help ${contact.company || "your business"}. Any time this week for a quick call?`,
    `Hi ${contact.fullName || "there"}, wanted to share a quick case study from a ${contact.vertical || "business"} similar to yours. They saw a 40% reduction in compliance processing time. Worth a 10-minute conversation?`,
    `${contact.fullName || "Hi there"}, I know you're busy so I'll keep this brief. TitleApp is helping ${contact.vertical || "businesses"} like ${contact.company || "yours"} automate title management and compliance. Happy to show you in a quick demo whenever convenient.`,
    `One more check-in, ${contact.fullName || ""}. If now isn't the right time, no worries — just let me know and I'll follow up later. Otherwise, I have some availability this week for a demo.`,
    `Last note from me for now, ${contact.fullName || ""}. If TitleApp sounds interesting down the road, you can always reach out at alex@titleapp.ai. Wishing you well.`,
  ];
  return templates[Math.min(index, templates.length - 1)];
}

function generateFollowUpSubject(index, contact) {
  const subjects = [
    `Quick follow-up — TitleApp for ${contact.company || "your team"}`,
    `Case study: ${contact.vertical || "industry"} results with TitleApp`,
    `10 minutes — see TitleApp in action?`,
    `Checking in one more time`,
    `Signing off for now`,
  ];
  return subjects[Math.min(index, subjects.length - 1)];
}

module.exports = { followUpCadence };
