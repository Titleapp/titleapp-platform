"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

let _emailNotify;
function getEmailNotify() {
  if (!_emailNotify) _emailNotify = require("./emailNotify");
  return _emailNotify;
}

// Lead scoring — pure function
function computeLeadScore({ vertical, company, utm_source, promo_code, source }) {
  let score = 0;
  if (vertical) score += 20;
  if (company) score += 15;
  if (utm_source === "google" || utm_source === "linkedin") score += 10;
  else if (utm_source) score += 5;
  if (promo_code) score += 10;
  if (source === "chat_widget") score += 5;
  return Math.min(score, 100);
}

async function captureLead({ name, email, company, role, vertical, utm_source, utm_medium, utm_campaign, utm_content, ref, promo_code, headline_index, source }) {
  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Valid email is required" };
  }

  const db = getDb();
  const score = computeLeadScore({ vertical, company, utm_source, promo_code, source });

  // Check for existing lead by email
  const existing = await db.collection("leads")
    .where("email", "==", email.toLowerCase().trim())
    .limit(1)
    .get();

  if (!existing.empty) {
    // Merge — update with new UTM data if present
    const docRef = existing.docs[0].ref;
    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (utm_source) updates.utm_source = utm_source;
    if (utm_medium) updates.utm_medium = utm_medium;
    if (utm_campaign) updates.utm_campaign = utm_campaign;
    if (utm_content) updates.utm_content = utm_content;
    if (promo_code) updates.promo_code = promo_code;
    if (headline_index != null) updates.headline_index = headline_index;
    if (score > (existing.docs[0].data().score || 0)) updates.score = score;
    await docRef.update(updates);
    return { ok: true, leadId: existing.docs[0].id, merged: true };
  }

  // New lead
  const leadData = {
    email: email.toLowerCase().trim(),
    name: name || null,
    company: company || null,
    role: role || null,
    vertical: vertical || null,
    status: "new",
    score,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    utm_content: utm_content || null,
    ref: ref || null,
    promo_code: promo_code || null,
    headline_index: headline_index != null ? headline_index : null,
    source: source || "signup_form",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    convertedAt: null,
    userId: null,
  };

  const docRef = await db.collection("leads").add(leadData);

  // Fire notifications (non-blocking)
  try {
    const notify = getEmailNotify();
    await Promise.all([
      notify.notifySean({ ...leadData, leadId: docRef.id }),
      notify.sendWelcomeEmail({ ...leadData, leadId: docRef.id }),
    ]);
  } catch (e) {
    console.error("Lead notification failed (non-blocking):", e);
  }

  return { ok: true, leadId: docRef.id };
}

async function validatePromo({ code }) {
  if (!code) return { ok: true, valid: false };
  const db = getDb();
  const doc = await db.doc(`promoCodes/${code.toUpperCase().trim()}`).get();
  if (!doc.exists || !doc.data().active) {
    return { ok: true, valid: false };
  }
  const data = doc.data();
  return {
    ok: true,
    valid: true,
    discount: data.discount,
    type: data.type,
    description: data.description,
    duration: data.duration,
  };
}

async function listLeads({ vertical, status, limit: lim, offset }) {
  const db = getDb();
  let q = db.collection("leads").orderBy("createdAt", "desc");
  if (vertical) q = q.where("vertical", "==", vertical);
  if (status) q = q.where("status", "==", status);
  q = q.limit(lim || 50);
  if (offset) q = q.offset(offset);
  const snap = await q.get();
  const leads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { ok: true, leads, total: leads.length };
}

async function getLeadStats({ vertical }) {
  const db = getDb();
  let q = db.collection("leads");
  if (vertical) q = q.where("vertical", "==", vertical);
  const snap = await q.get();
  const leads = snap.docs.map(d => d.data());

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const total = leads.length;
  const today = leads.filter(l => l.createdAt && l.createdAt.toDate && l.createdAt.toDate() >= todayStart).length;
  const thisWeek = leads.filter(l => l.createdAt && l.createdAt.toDate && l.createdAt.toDate() >= weekAgo).length;
  const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / total) : 0;

  // Count by vertical
  const byVertical = {};
  leads.forEach(l => {
    const v = l.vertical || "unknown";
    byVertical[v] = (byVertical[v] || 0) + 1;
  });

  // Count by status
  const byStatus = {};
  leads.forEach(l => {
    const s = l.status || "new";
    byStatus[s] = (byStatus[s] || 0) + 1;
  });

  return { ok: true, total, today, thisWeek, avgScore, byVertical, byStatus };
}

module.exports = { captureLead, validatePromo, listLeads, getLeadStats, computeLeadScore };
