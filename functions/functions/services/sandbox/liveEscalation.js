"use strict";

/**
 * liveEscalation.js — CODEX S52.55.
 *
 * The Test step's 5-question red-team protocol (workerTestProtocol.js) only
 * runs once, at build time, before a worker publishes. Nothing carried that
 * concept into live, post-publish chat — verified directly, not assumed: the
 * `escalated` classification had zero runtime existence anywhere outside
 * that one build-time file. This is the live equivalent: every worker chat
 * turn gets screened for the same kind of signal, and a real hit writes a
 * record + sends a human a real notification, instead of disappearing into
 * a chat log no one is watching.
 *
 * Deliberately conservative in the false-positive direction — a human
 * reviewing a benign message that got flagged costs a few seconds; a real
 * disclosure that never got flagged does not get a second chance. This is a
 * heuristic first pass, not a substitute for real clinical/legal-grade
 * detection — named as a real limitation, not glossed over.
 */

const admin = require("firebase-admin");

// Two independent signal sources, checked with OR: what the USER said (a
// disclosure), and what the WORKER said back (its own escalation language —
// a well-behaved worker saying "please talk to a trusted adult" is itself a
// strong, independent signal, worth catching even if the user's own phrasing
// didn't match anything).
const USER_SIGNAL_PATTERNS = [
  { tag: "self_harm", re: /\b(kill myself|end my life|end it all|want(ed)? to die|suicid\w*|hurt myself|self[- ]?harm(ing)?|cut(ting)? myself)\b/i },
  // "he/she/they" alone missed the phrasing a child actually uses — verified
  // by testing: "my dad hits me when he is mad" did not match the pronoun-only
  // version. Covers pronouns AND common family/guardian relation words.
  { tag: "abuse_or_neglect", re: /\b(he|she|they|my (dad|mom|mother|father|stepdad|stepmom|stepfather|stepmother|parent|guardian|uncle|aunt|brother|sister|grandpa|grandma|grandfather|grandmother)) (hits?|hit|beats?|beat|touch(es|ed)?|hurts?|hurt) me\b|\bbeing abused\b|\bafraid to go home\b|\bno (one|adult) (feeds?|checks? on) me\b|\bleft alone for days\b|\bnobody (feeds|checks on) me\b/i },
  { tag: "serious_mistake_in_progress", re: /\b(already (gave|took|administered)|about to (give|take|administer|do it anyway))\b.{0,40}\b(wrong|too much|overdose|mistake)\b/i },
];

const WORKER_SIGNAL_PATTERNS = [
  { tag: "worker_recommended_escalation", re: /\b(talk to a trusted adult|tell a parent|tell your (teacher|counselor|guardian)|contact (a|your) (crisis|counselor|therapist|doctor|attorney|supervisor)|call (911|988|a crisis line)|bring in a (human|person|professional|attorney|lawyer|doctor)|hand (this|it) off to (a|your))\b/i },
];

/**
 * Screen one chat turn. Returns null (no signal) or { tag, source } where
 * source is "user" or "worker" — never throws, since a false positive here
 * must never block or slow down the actual chat response.
 */
function detectEscalation({ userInput, aiText }) {
  try {
    for (const p of USER_SIGNAL_PATTERNS) {
      if (p.re.test(String(userInput || ""))) return { tag: p.tag, source: "user" };
    }
    for (const p of WORKER_SIGNAL_PATTERNS) {
      if (p.re.test(String(aiText || ""))) return { tag: p.tag, source: "worker" };
    }
    return null;
  } catch (e) {
    console.warn("[liveEscalation] detectEscalation threw, treating as no-signal:", e.message);
    return null;
  }
}

async function findNotifyEmail({ db, tenantId }) {
  try {
    if (!tenantId || tenantId === "vault") return null;
    // Same shape as membershipCheck.js's enforceRoleGate query — userId/tenantId/status.
    const membershipsSnap = await db.collection("memberships")
      .where("tenantId", "==", tenantId).where("role", "==", "admin").where("status", "==", "active")
      .limit(1).get();
    if (membershipsSnap.empty) return null;
    const uid = membershipsSnap.docs[0].data().userId;
    if (!uid) return null;
    const userRecord = await admin.auth().getUser(uid).catch(() => null);
    return (userRecord && userRecord.email) || null;
  } catch (e) {
    console.warn("[liveEscalation] findNotifyEmail failed:", e.message);
    return null;
  }
}

/**
 * Write the escalation record and fire a best-effort email notification.
 * Never throws — a notification failure must not surface as a chat error to
 * the person who may be mid-disclosure.
 */
async function recordAndNotifyEscalation({ db, tenantId, workerSlug, userId, userInput, aiText, tag, source }) {
  let escalationId = null;
  try {
    const ref = await db.collection("workerEscalations").add({
      tenantId: tenantId || null,
      workerSlug: workerSlug || null,
      userId: userId || null,
      tag,
      source, // "user" | "worker" — which side's language triggered this
      userInput: String(userInput || "").slice(0, 2000),
      workerResponse: String(aiText || "").slice(0, 2000),
      status: "open",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notifiedAt: null,
    });
    escalationId = ref.id;
  } catch (e) {
    console.error("[liveEscalation] failed to write workerEscalations record:", e.message);
    return { ok: false, error: e.message };
  }

  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
    if (!SENDGRID_API_KEY) {
      console.warn("[liveEscalation] SENDGRID_API_KEY not configured — escalation recorded but not emailed:", escalationId);
      return { ok: true, escalationId, notified: false };
    }
    const toEmail = await findNotifyEmail({ db, tenantId });
    if (!toEmail) {
      console.warn("[liveEscalation] no admin email found for tenant — escalation recorded but not emailed:", tenantId, escalationId);
      return { ok: true, escalationId, notified: false };
    }
    const subject = `[SOCIII] Worker escalation flagged — ${workerSlug || "unknown worker"}`;
    const body = `A live chat interaction was automatically flagged for review.\n\n` +
      `Worker: ${workerSlug || "unknown"}\n` +
      `Signal: ${tag} (detected in ${source === "user" ? "the user's message" : "the worker's own response"})\n` +
      `Escalation ID: ${escalationId}\n\n` +
      `This is an automated, heuristic screen — it can be wrong in either direction. Review the conversation directly before taking any action.\n\n` +
      `— SOCIII (automated)`;
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: "alerts@sociii.ai", name: "SOCIII Alerts" },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });
    await db.collection("workerEscalations").doc(escalationId).update({ notifiedAt: admin.firestore.FieldValue.serverTimestamp(), notifiedEmail: toEmail });
    return { ok: true, escalationId, notified: true };
  } catch (e) {
    console.error("[liveEscalation] notification failed (record still saved):", e.message);
    return { ok: true, escalationId, notified: false, notifyError: e.message };
  }
}

module.exports = { detectEscalation, recordAndNotifyEscalation };
