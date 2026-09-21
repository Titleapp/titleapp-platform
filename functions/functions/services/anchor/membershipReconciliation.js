/**
 * membershipReconciliation.js — CODEX 98's sharper detector alongside
 * Firestore Data Access audit logging (DATA_WRITE, enabled 2026-09-21).
 *
 * Data Access logs are the broad net (every Admin SDK write, any
 * collection). This is the sharp one: periodically compares each
 * `memberships` doc's current state against its own `membershipEvents`
 * history, and alerts on a mismatch — a doc whose current fields don't
 * match what the audited event trail says they should be. That mismatch
 * means exactly one thing: something wrote to `memberships` outside the
 * 7 audited call sites in index.js (all wired 2026-09-21).
 *
 * Scope, deliberately: only memberships CREATED on or after
 * AUDIT_TRAIL_START — everything created before that date has no event
 * history by construction (the audit trail didn't exist yet), not because
 * anything bypassed it. Reconciling those would be 100% false positives on
 * day one. A grace window also excludes anything mutated in the last
 * RECONCILE_GRACE_MS, so an in-flight audited write (doc updated, event
 * write still pending) isn't flagged before it's had a chance to land.
 */

const admin = require("firebase-admin");

const AUDIT_TRAIL_START = new Date("2026-09-21T00:00:00Z");
const RECONCILE_GRACE_MS = 15 * 60 * 1000; // 15 minutes

function getDb() { return admin.firestore(); }

async function sendSecurityAlert(smsText, emailHtml) {
  // Reuses the exact alert mechanism workerCanary.js already uses —
  // config/workerHealth.alertRecipients, texts + emails — rather than
  // inventing a second notification system. [SECURITY] marker per CODEX 98
  // round-2 red-team pass: must be visually distinguishable from routine
  // external-action nudges, never batched/summarized.
  const db = getDb();
  const healthDoc = await db.doc("config/workerHealth").get();
  const recipients = (healthDoc.exists && Array.isArray(healthDoc.data().alertRecipients) && healthDoc.data().alertRecipients.length)
    ? healthDoc.data().alertRecipients
    : [{ name: "Sean", phone: "+13104300780", email: "sean@sociii.ai" }];

  let sendSMSDirect = null;
  try { ({ sendSMSDirect } = require("../../communications/twilioHelper")); } catch { /* unavailable */ }

  for (const r of recipients) {
    if (r.phone && sendSMSDirect) {
      try { await sendSMSDirect(r.phone, `[SECURITY] ${smsText}`); } catch (e) { console.warn("[membershipReconciliation] sms fail", e.message); }
    }
    if (r.email && process.env.SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: r.email }] }],
            from: { email: "alex@sociii.ai", name: "SOCIII Security" },
            subject: "[SECURITY] Membership audit-trail mismatch detected",
            content: [{ type: "text/html", value: emailHtml }],
          }),
        });
      } catch (e) { console.warn("[membershipReconciliation] email fail", e.message); }
    }
  }
}

/**
 * @returns {{ checked: number, mismatches: Array<object> }}
 */
async function runMembershipReconciliation() {
  const db = getDb();
  const cutoff = new Date(Date.now() - RECONCILE_GRACE_MS);

  const snap = await db.collection("memberships")
    .where("createdAt", ">=", AUDIT_TRAIL_START)
    .where("createdAt", "<", cutoff)
    .get();

  const mismatches = [];

  for (const doc of snap.docs) {
    const mem = doc.data();
    const eventsSnap = await db.collection("membershipEvents")
      .where("membershipId", "==", doc.id)
      .orderBy("changedAt", "desc")
      .limit(1)
      .get();

    if (eventsSnap.empty) {
      mismatches.push({
        membershipId: doc.id,
        uid: mem.userId,
        tenantId: mem.tenantId,
        reason: "no_event_found",
        detail: "Membership created after the audit trail started, but has no membershipEvents entry at all.",
      });
      continue;
    }

    const latest = eventsSnap.docs[0].data();
    const expected = latest.toValue || {};
    const statusMismatch = expected.status !== undefined && expected.status !== mem.status;
    const roleMismatch = expected.role !== undefined && expected.role !== mem.role;

    if (statusMismatch || roleMismatch) {
      mismatches.push({
        membershipId: doc.id,
        uid: mem.userId,
        tenantId: mem.tenantId,
        reason: "state_mismatch",
        detail: `Latest recorded event says ${JSON.stringify(expected)}, but the live document has status=${mem.status}, role=${mem.role}.`,
      });
    }
  }

  if (mismatches.length) {
    const findingsRef = db.collection("membershipReconciliationFindings").doc(new Date().toISOString());
    await findingsRef.set({ mismatches, checkedAt: admin.firestore.FieldValue.serverTimestamp() });
    const summary = mismatches.slice(0, 3).map((m) => `${m.membershipId} (${m.reason})`).join(", ");
    await sendSecurityAlert(
      `${mismatches.length} membership audit-trail mismatch(es) found — possible bypass of the audited write path. First few: ${summary}`,
      `<p><strong>${mismatches.length} membership record(s)</strong> don't match their own audit-trail history — a write may have bypassed the audited path entirely.</p><pre>${JSON.stringify(mismatches, null, 2)}</pre>`
    );
  }

  console.log(`[membershipReconciliation] checked ${snap.size}, found ${mismatches.length} mismatch(es)`);
  return { checked: snap.size, mismatches };
}

module.exports = { runMembershipReconciliation, AUDIT_TRAIL_START, RECONCILE_GRACE_MS };
