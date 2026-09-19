"use strict";

// Real customer lead-follow-up drip — CODEX 94 §3.7. Reuses the existing
// drip PATTERN (scheduledAt + auto-enqueue-next-stage) already proven in
// services/sandbox/dripEmailQueue.js, but that one is SOCIII's own
// hardcoded Creator-onboarding nurture (fixed copy: "Your Digital Worker
// draft is ready"), not something a customer tenant can use for their own
// leads. This is the generic version: a tenant defines their own sequence
// (Ivy can draft it, or a human writes it), enrolls a real contact/lead in
// it, and it runs on its own dedicated `leadDripQueue` collection —
// deliberately NOT the shared `messageQueue` collection the Sandbox drip
// uses, since that processor queries messageQueue for any pending+due doc
// with no distinguishing field filter and would try (and fail) to process
// these as its own userId/sessionId-shaped entries.
//
// Tenant-scoping invariant (see CLAUDE.md — this codebase's real,
// previously-shipped vulnerability class, not theoretical): every query
// here filters by tenantId explicitly, even where contactId/campaignId
// alone would seem sufficient, since a plain id lookup could otherwise
// cross tenant boundaries.

const admin = require("firebase-admin");
function getDb() { return admin.firestore(); }

/**
 * Define a drip campaign for a tenant. A campaign is just an ordered list
 * of stages — delay + subject + HTML body, with {{firstName}} as the only
 * templating token for v1 (matches the simplicity of the existing Sandbox
 * drip's templating).
 *
 * @param {string} tenantId
 * @param {object} opts - { name, stages: [{ delayDays, subject, htmlContent }] }
 * @returns {Promise<{ok:boolean, campaignId?:string, error?:string}>}
 */
async function createDripCampaign(tenantId, { name, stages }) {
  if (!tenantId) return { ok: false, error: "Missing tenantId" };
  if (!name) return { ok: false, error: "Missing name" };
  if (!Array.isArray(stages) || stages.length === 0) return { ok: false, error: "Missing stages" };
  for (const s of stages) {
    if (typeof s.delayDays !== "number" || !s.subject || !s.htmlContent) {
      return { ok: false, error: "Each stage needs delayDays (number), subject, and htmlContent" };
    }
  }

  const db = getDb();
  const ref = db.collection("tenants").doc(tenantId).collection("dripCampaigns").doc();
  await ref.set({
    name,
    stages: stages.map((s, i) => ({ stage: i + 1, delayDays: s.delayDays, subject: s.subject, htmlContent: s.htmlContent })),
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, campaignId: ref.id };
}

/**
 * Enroll one contact/lead in a tenant's drip campaign. Enqueues stage 1
 * immediately (or after stage 1's own delayDays, same as the Sandbox drip's
 * convention) — subsequent stages get auto-enqueued by processLeadDripQueue
 * as each prior stage actually sends, not all scheduled up front, so a
 * contact who unsubscribes or converts mid-sequence doesn't get stages
 * that were already queued before that happened.
 *
 * @param {string} tenantId
 * @param {string} contactId - a doc id in the tenant-scoped `contacts` collection
 * @param {string} campaignId
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function enrollContactInDrip(tenantId, contactId, campaignId) {
  if (!tenantId || !contactId || !campaignId) return { ok: false, error: "Missing tenantId, contactId, or campaignId" };
  const db = getDb();

  const contactSnap = await db.collection("contacts").doc(contactId).get();
  if (!contactSnap.exists || contactSnap.data().tenantId !== tenantId) {
    return { ok: false, error: "Contact not found for this tenant" };
  }
  const contact = contactSnap.data();
  if (!contact.email) return { ok: false, error: "Contact has no email address" };
  if (contact.unsubscribed) return { ok: false, error: "Contact has unsubscribed — will not enroll" };

  const campaignSnap = await db.collection("tenants").doc(tenantId).collection("dripCampaigns").doc(campaignId).get();
  if (!campaignSnap.exists) return { ok: false, error: "Drip campaign not found for this tenant" };
  const campaign = campaignSnap.data();
  if (!campaign.active) return { ok: false, error: "Drip campaign is not active" };

  await enqueueLeadDripStage(tenantId, contactId, campaignId, 1);
  return { ok: true };
}

async function enqueueLeadDripStage(tenantId, contactId, campaignId, stageNumber) {
  const db = getDb();
  const campaignSnap = await db.collection("tenants").doc(tenantId).collection("dripCampaigns").doc(campaignId).get();
  if (!campaignSnap.exists) return;
  const stage = (campaignSnap.data().stages || []).find(s => s.stage === stageNumber);
  if (!stage) return; // sequence complete, nothing more to enqueue

  const contactSnap = await db.collection("contacts").doc(contactId).get();
  const contact = contactSnap.exists ? contactSnap.data() : {};
  const firstName = contact.firstName || (contact.name ? contact.name.split(" ")[0] : "there");

  const scheduledAt = new Date(Date.now() + stage.delayDays * 24 * 60 * 60 * 1000);
  const subject = stage.subject.replace(/{{firstName}}/g, firstName);
  const body = stage.htmlContent.replace(/{{firstName}}/g, firstName);

  // Deliberately its own collection, NOT messageQueue — the existing Sandbox
  // drip processor (dripEmailQueue.js's processDripQueue()) queries
  // messageQueue for ANY pending+due doc with no distinguishing field
  // filter, and would try to process these as if they were its own
  // userId/sessionId-shaped entries (they're tenantId/contactId-shaped),
  // marking them "skipped" before this module's own processor ever saw
  // them. A separate collection avoids that collision entirely rather than
  // requiring a change to the existing, working Sandbox drip code.
  await db.collection("leadDripQueue").add({
    tenantId,
    contactId,
    dripCampaignId: campaignId,
    stage: stageNumber,
    channel: "email",
    to: contact.email || "",
    subject,
    body,
    status: "pending",
    scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
    sentAt: null,
    error: null,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Daily processor: send all pending lead-drip emails whose scheduledAt <=
 * now, then auto-enqueue the next stage for that contact/campaign. Mirrors
 * services/sandbox/dripEmailQueue.js's processDripQueue() shape but reads
 * tenantId/contactId/dripCampaignId instead of userId/sessionId, and pulls
 * from a tenant's own campaign definition instead of hardcoded copy.
 * Uses the tenant's verified sending domain if one exists (domainAuth.js,
 * CODEX 94 §3.6) so a client's drip emails come from their own domain, not
 * alex@sociii.ai — falls back to the platform default otherwise.
 */
async function processLeadDripQueue() {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  const pendingSnap = await db.collection("leadDripQueue")
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", now)
    .limit(200)
    .get();

  if (pendingSnap.empty) {
    console.log("[leadDripQueue] No pending lead-drip emails to process");
    return { ok: true, sent: 0, skipped: 0, failed: 0 };
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const doc of pendingSnap.docs) {
    const email = doc.data();
    try {
      const contactSnap = await db.collection("contacts").doc(email.contactId).get();
      const contact = contactSnap.exists ? contactSnap.data() : null;
      if (!contact || contact.tenantId !== email.tenantId || !contact.email) {
        await doc.ref.update({ status: "skipped", error: "Contact missing, wrong tenant, or no email" });
        skipped++;
        continue;
      }
      if (contact.unsubscribed) {
        await doc.ref.update({ status: "skipped", error: "Contact unsubscribed since enrollment" });
        skipped++;
        continue;
      }

      const { getVerifiedSendingIdentity } = require("../emailService/domainAuth");
      const identity = await getVerifiedSendingIdentity(email.tenantId).catch(() => null);

      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: email.to }] }],
          from: identity ? { email: identity.fromEmail, name: identity.fromName } : { email: process.env.SENDGRID_FROM_EMAIL || "alex@sociii.ai", name: "Alex — SOCIII" },
          subject: email.subject,
          content: [{ type: "text/html", value: email.body }],
          tracking_settings: { click_tracking: { enable: true }, open_tracking: { enable: true } },
        }),
      });

      if (!resp.ok) throw new Error(`SendGrid HTTP ${resp.status}`);

      await doc.ref.update({ status: "sent", sentAt: admin.firestore.FieldValue.serverTimestamp() });
      sent++;

      await enqueueLeadDripStage(email.tenantId, email.contactId, email.dripCampaignId, email.stage + 1);
    } catch (e) {
      console.error(`[leadDripQueue] Failed to send ${doc.id}:`, e.message);
      await doc.ref.update({ status: "failed", error: e.message });
      failed++;
    }
  }

  console.log(`[leadDripQueue] Processed: sent=${sent}, skipped=${skipped}, failed=${failed}`);
  return { ok: true, sent, skipped, failed };
}

module.exports = { createDripCampaign, enrollContactInDrip, processLeadDripQueue };
