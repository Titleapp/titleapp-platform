"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// SendGrid Marketing API
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_BASE = "https://api.sendgrid.com/v3";

async function sgFetch(path, method, body) {
  if (!SENDGRID_API_KEY) throw new Error("SendGrid API key not configured");
  const resp = await fetch(`${SENDGRID_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.errors?.[0]?.message || `SendGrid HTTP ${resp.status}`);
  }
  return data;
}

/**
 * Create a SendGrid contact list.
 * @param {string} userId
 * @param {object} opts - { name, contacts }
 * @returns {{ ok, listId }}
 */
async function createContactList(userId, { name, contacts }) {
  if (!name) return { ok: false, error: "Missing list name" };

  // Create list
  const listResult = await sgFetch("/marketing/lists", "POST", { name });
  const listId = listResult.id;

  // Add contacts if provided
  if (contacts && Array.isArray(contacts) && contacts.length > 0) {
    const sgContacts = contacts.map(c => ({
      email: c.email,
      first_name: c.firstName || c.first_name || "",
      last_name: c.lastName || c.last_name || "",
    }));

    await sgFetch("/marketing/contacts", "PUT", {
      list_ids: [listId],
      contacts: sgContacts,
    });
  }

  // Log to Firestore
  const db = getDb();
  await db.collection("emailLists").doc(listId).set({
    userId,
    name,
    sendgridListId: listId,
    contactCount: contacts?.length || 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, listId };
}

/**
 * Send a marketing email via SendGrid Single Send.
 * @param {string} userId
 * @param {object} opts - { listId, subject, htmlContent, plainContent, fromName, fromEmail }
 * @returns {{ ok, campaignId }}
 */
async function sendMarketingEmail(userId, { listId, subject, htmlContent, plainContent, fromName, fromEmail }) {
  if (!listId) return { ok: false, error: "Missing listId" };
  if (!subject) return { ok: false, error: "Missing subject" };
  if (!htmlContent) return { ok: false, error: "Missing htmlContent" };

  const senderEmail = fromEmail || "alex@titleapp.ai";
  const senderName = fromName || "Alex -- TitleApp";

  // Create single send
  const sendResult = await sgFetch("/marketing/singlesends", "POST", {
    name: subject,
    send_to: { list_ids: [listId] },
    email_config: {
      subject,
      html_content: htmlContent,
      plain_content: plainContent || "",
      sender_id: null,
      custom_unsubscribe_url: "",
      suppression_group_id: null,
      generate_plain_content: !plainContent,
    },
  });

  const campaignId = sendResult.id;

  // Schedule send immediately
  await sgFetch(`/marketing/singlesends/${campaignId}/schedule`, "PUT", {
    send_at: "now",
  });

  // Log to Firestore
  const db = getDb();
  await db.collection("emailCampaigns").doc(campaignId).set({
    userId,
    listId,
    subject,
    fromName: senderName,
    fromEmail: senderEmail,
    sendgridCampaignId: campaignId,
    status: "sent",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, campaignId };
}

/**
 * Import contacts to an existing SendGrid list.
 * @param {string} userId
 * @param {object} opts - { listId, contacts }
 * @returns {{ ok, importedCount }}
 */
async function importContacts(userId, { listId, contacts }) {
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return { ok: false, error: "Missing or empty contacts array" };
  }

  const sgContacts = contacts.map(c => ({
    email: c.email,
    first_name: c.firstName || c.first_name || "",
    last_name: c.lastName || c.last_name || "",
    ...(c.company ? { company: c.company } : {}),
  }));

  const putBody = { contacts: sgContacts };
  if (listId) putBody.list_ids = [listId];

  await sgFetch("/marketing/contacts", "PUT", putBody);

  // Update Firestore count if list-specific
  if (listId) {
    const db = getDb();
    const listRef = db.collection("emailLists").doc(listId);
    const listSnap = await listRef.get();
    if (listSnap.exists) {
      await listRef.update({
        contactCount: admin.firestore.FieldValue.increment(contacts.length),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  return { ok: true, importedCount: contacts.length };
}

/**
 * Get campaign stats (open/click rates).
 * @param {string} userId
 * @param {object} opts - { campaignId }
 * @returns {{ ok, stats }}
 */
async function getCampaignStats(userId, { campaignId }) {
  if (!campaignId) return { ok: false, error: "Missing campaignId" };

  const result = await sgFetch(`/marketing/stats/singlesends/${campaignId}`, "GET");

  const stats = result.results?.[0]?.stats || {};
  return {
    ok: true,
    stats: {
      delivered: stats.delivered || 0,
      opens: stats.opens || 0,
      uniqueOpens: stats.unique_opens || 0,
      clicks: stats.clicks || 0,
      uniqueClicks: stats.unique_clicks || 0,
      bounces: stats.bounces || 0,
      unsubscribes: stats.unsubscribes || 0,
    },
  };
}

module.exports = { createContactList, sendMarketingEmail, importContacts, getCampaignStats };
