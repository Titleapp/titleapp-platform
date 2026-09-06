"use strict";

/**
 * crewNotifications.js — CODEX 89 §4 step 6: crew notification + flight
 * package delivery, with the explicit acknowledgment decision §6 open
 * question 3 asked for.
 *
 * DECISION (made explicitly, not defaulted silently): an unacknowledged
 * notification BLOCKS readiness-for-departure. Delivery is not treated as
 * acknowledgment. Rationale: this build's own ground rules say "fail closed
 * on ambiguity, never silently assume a check passed" — assuming
 * delivery = acknowledgment is exactly that assumption, on the one step in
 * this whole pipeline where a human on the other end has to actually see
 * and confirm the package before departure. This mirrors real ACARS/dispatch
 * practice (a release copy requires crew acknowledgment) and CODEX 64's
 * existing "Dispatch creates, PIC accepts" manifest model — Dispatch
 * releasing a flight was never meant to be the last human checkpoint;
 * "readyForDeparture" in this module is a SEPARATE, later gate than
 * "released." Flagged in the build report as the explicit call made here —
 * Sean can override if a real operator workflow needs delivery-implies-ack
 * for some other reason, but that should be a deliberate reversal, not an
 * accident of this module defaulting the other way.
 *
 * Append-only, consistent with the platform's core invariant (CLAUDE.md:
 * "Records are never overwritten. State is computed from event history."):
 *   crewNotifications/{scopeId}/notifications/{id} — one doc per (release,
 *     crew member), written once at send time, never mutated.
 *   crewAcknowledgments/{scopeId}/acks/{id} — one doc per acknowledgment
 *     EVENT, written when (and only when) that crew member acknowledges.
 * "Is this release ready for departure" is COMPUTED from those two
 * collections, not stored as mutable state on flightReleases (which stays
 * exactly what it already was — an immutable release record).
 *
 * Delivery mechanism: real, not fabricated. SMS via the existing Twilio
 * helper (communications/twilioHelper.js) and email via the existing
 * SendGrid pattern (services/magicLink.js) — both already real integrations
 * elsewhere in this codebase, both already env-gated to no-op safely when
 * not configured. Push notifications are NOT wired (no push provider exists
 * anywhere in this codebase today) — every response is explicit about which
 * channels actually attempted delivery vs. which were skipped, rather than
 * claiming "notified" when only a Firestore record was written.
 */

const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

async function attemptSms(phone, body) {
  if (!phone) return { attempted: false, reason: "no phone on file" };
  try {
    const { sendSMSDirect } = require("../../communications/twilioHelper");
    await sendSMSDirect(phone, body);
    return { attempted: true, sent: true };
  } catch (e) {
    return { attempted: true, sent: false, error: e.message };
  }
}

async function attemptEmail(email, subject, htmlBody) {
  if (!email) return { attempted: false, reason: "no email on file" };
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
  if (!SENDGRID_API_KEY) return { attempted: false, reason: "SENDGRID_API_KEY not configured" };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: "dispatch@sociii.ai", name: "SOCIII Dispatch" },
        subject,
        content: [{ type: "text/html", value: htmlBody }],
      }),
    });
    if (!res.ok) return { attempted: true, sent: false, error: `SendGrid ${res.status}` };
    return { attempted: true, sent: true };
  } catch (e) {
    return { attempted: true, sent: false, error: e.message };
  }
}

/**
 * POST /v1/dispatch:notifyCrew
 * Body: { releaseId, requestId, scopeId, tenantId, crew: [{uid, role, name, phone?, email?}], flightPackage: {...} }
 */
async function handleNotifyCrew(req, res, ctx) {
  const db = getDb();
  const b = req.body || {};
  if (!b.releaseId) return res.status(400).json({ ok: false, error: "releaseId required" });
  if (!Array.isArray(b.crew) || !b.crew.length) return res.status(400).json({ ok: false, error: "crew[] required (at least one crew member)" });
  const scopeId = b.scopeId || ctx.tenantId || ctx.userId;

  const flightPackage = {
    releaseId: b.releaseId,
    requestId: b.requestId || null,
    tailNumber: b.flightPackage?.tailNumber || null,
    depIcao: b.flightPackage?.depIcao || null,
    arrIcao: b.flightPackage?.arrIcao || null,
    alternateIcao: b.flightPackage?.alternateIcao || null,
    proposedDepartureTime: b.flightPackage?.proposedDepartureTime || null,
    weatherBrief: b.flightPackage?.weatherBrief || null,
    notams: b.flightPackage?.notams || null,
    weightBalance: b.flightPackage?.weightBalance || null,
    crewAssignment: b.crew.map((c) => ({ uid: c.uid, role: c.role || null, name: c.name || null })),
  };

  const results = [];
  for (const c of b.crew) {
    if (!c || !c.uid) continue;
    const [sms, email] = await Promise.all([
      attemptSms(c.phone, `SOCIII Dispatch: flight release ${b.releaseId} (${flightPackage.depIcao || "?"}→${flightPackage.arrIcao || "?"}) is ready for your acknowledgment. Open the app to review and acknowledge before departure.`),
      attemptEmail(c.email, `Flight release ${b.releaseId} — acknowledgment required`, `<p>A flight package for release <strong>${b.releaseId}</strong> is ready for your review and acknowledgment. You must acknowledge it in the app before this flight is considered ready for departure.</p>`),
    ]);
    const ref = db.collection("crewNotifications").doc(scopeId).collection("notifications").doc();
    await ref.set({
      releaseId: b.releaseId,
      requestId: b.requestId || null,
      tenantId: b.tenantId || ctx.tenantId || null,
      pilotUid: c.uid,
      role: c.role || null,
      flightPackage,
      delivery: { sms, email },
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentByUid: ctx.userId,
    });
    results.push({ notificationId: ref.id, pilotUid: c.uid, delivery: { sms, email } });
  }

  return res.json({
    ok: true,
    releaseId: b.releaseId,
    notified: results,
    acknowledgmentRequired: true,
    message: "Notification(s) recorded and delivery attempted. This flight is NOT ready for departure until every crew member listed here has explicitly acknowledged the package (see /v1/dispatch:releaseReadiness) — delivery is not treated as acknowledgment.",
  });
}

/**
 * GET /v1/dispatch:crewPackage?notificationId=xxx&scopeId=xxx
 * A crew member fetching their own package (or an owner/admin looking one up).
 */
async function handleGetCrewPackage(req, res, ctx) {
  const db = getDb();
  const notificationId = req.query?.notificationId;
  const scopeId = req.query?.scopeId || ctx.tenantId || ctx.userId;
  if (!notificationId) return res.status(400).json({ ok: false, error: "notificationId required" });

  const snap = await db.collection("crewNotifications").doc(scopeId).collection("notifications").doc(notificationId).get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "not found" });
  const doc = snap.data();
  if (doc.pilotUid !== ctx.userId) {
    // Self-only in this build — fail closed rather than let any signed-in
    // user read any package. A dispatch-board "view any crew member's
    // package" affordance (owner/admin on the same tenant) would need its
    // own membership-role check here; not built yet, flagged as a v1 gap
    // rather than silently widening this to "any tenant member."
    return res.status(403).json({ ok: false, error: "This package is addressed to a different crew member" });
  }
  return res.json({ ok: true, notification: { id: snap.id, ...doc } });
}

/**
 * POST /v1/dispatch:acknowledgePackage
 * Body: { notificationId, scopeId }
 * Self-ack only — a dispatcher cannot acknowledge on a pilot's behalf. This
 * is the enforced human action step 6 requires: acknowledgment is its own
 * append-only event, not a field flipped on the notification doc.
 */
async function handleAcknowledgePackage(req, res, ctx) {
  const db = getDb();
  const b = req.body || {};
  const scopeId = b.scopeId || ctx.tenantId || ctx.userId;
  if (!b.notificationId) return res.status(400).json({ ok: false, error: "notificationId required" });

  const notifRef = db.collection("crewNotifications").doc(scopeId).collection("notifications").doc(b.notificationId);
  const notifSnap = await notifRef.get();
  if (!notifSnap.exists) return res.status(404).json({ ok: false, error: "notification not found" });
  const notif = notifSnap.data();
  if (notif.pilotUid !== ctx.userId) {
    return res.status(403).json({ ok: false, error: "Only the addressed crew member may acknowledge this package" });
  }

  const ackRef = db.collection("crewAcknowledgments").doc(scopeId).collection("acks").doc();
  await ackRef.set({
    releaseId: notif.releaseId,
    requestId: notif.requestId || null,
    notificationId: b.notificationId,
    pilotUid: ctx.userId,
    acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true, ackId: ackRef.id, releaseId: notif.releaseId });
}

/**
 * GET /v1/dispatch:releaseReadiness?releaseId=xxx&scopeId=xxx
 * Computed from event history — never stored as mutable state. This is the
 * real answer to "is this flight ready for departure" per the notification
 * decision above: not released.status, a separate, later gate.
 */
async function handleReleaseReadiness(req, res, ctx) {
  const db = getDb();
  const releaseId = req.query?.releaseId;
  const scopeId = req.query?.scopeId || ctx.tenantId || ctx.userId;
  if (!releaseId) return res.status(400).json({ ok: false, error: "releaseId required" });

  const [notifSnap, ackSnap] = await Promise.all([
    db.collection("crewNotifications").doc(scopeId).collection("notifications").where("releaseId", "==", releaseId).get(),
    db.collection("crewAcknowledgments").doc(scopeId).collection("acks").where("releaseId", "==", releaseId).get(),
  ]);
  const notified = notifSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ackedUids = new Set(ackSnap.docs.map((d) => d.data().pilotUid));
  const pendingCrew = notified.filter((n) => !ackedUids.has(n.pilotUid)).map((n) => ({ pilotUid: n.pilotUid, role: n.role, notificationId: n.id }));

  return res.json({
    ok: true,
    releaseId,
    crewNotified: notified.length,
    crewAcknowledged: ackedUids.size,
    pendingCrew,
    allAcknowledged: notified.length > 0 && pendingCrew.length === 0,
    readyForDeparture: notified.length > 0 && pendingCrew.length === 0,
  });
}

module.exports = { handleNotifyCrew, handleGetCrewPackage, handleAcknowledgePackage, handleReleaseReadiness };
