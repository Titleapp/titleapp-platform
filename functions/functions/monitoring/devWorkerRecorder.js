"use strict";

/**
 * devWorkerRecorder.js — the write+alert half of Dev (CODEX 100).
 *
 * Required ONLY from the internal HTTP route in index.js (running under
 * `api`'s broader identity, with Secret-Manager-bound Twilio/SendGrid
 * creds) — never from devWorker.js itself, which runs under the dedicated
 * read-only `dev-worker-readonly` service account and has neither write
 * access nor these secrets. See devWorker.js's header for the incident
 * that made this split necessary.
 */

const admin = require("firebase-admin");

const HEALTH_DOC = "config/devHealth";
const REALERT_AFTER_MS = 12 * 60 * 60 * 1000;
const DEFAULT_RECIPIENTS = [{ name: "Sean", phone: "+13104300780", email: "sean@sociii.ai" }];

// Templated per check scope, selected from a fixed set — never freely
// generated from finding content (CODEX 100: no LLM-generated fixes, and
// finding `reason` strings must never carry untrusted content into
// whatever narrates them; every field here is either a fixed string or an
// id/count already produced by deterministic code, never raw email text).
function proposedFixFor(finding) {
  switch (finding.scope) {
    case "gate-registry":
      return "Review capabilityGates.js for the missing/tampered/stubbed gate; re-approve and re-pin CAPABILITY_GATES_APPROVED_HASH only after independent review.";
    case "gmail-watch":
      if (finding.id === "watch-active-gates-failing") return "Call stopWatch() immediately (or confirm the auto-stop already fired) and investigate how the watch was activated without gates passing.";
      if (finding.id === "watch-expired") return "Call the renewal route (/v1/admin/gmail/renew-watch) or re-run startPersonaWatch.";
      return "No action required unless this persists past the next check.";
    case "moderation-queue":
      return "Review the pending approval in pendingPersonaEmailApprovals and approve/reject it, or decide on a backup approver per CODEX 100.";
    default:
      if (finding.surfaced) return "See worker-canary's own findings/alerts for remediation.";
      return "Investigate manually — no templated fix defined for this finding scope.";
  }
}

async function sendAlerts(recipients, smsText, emailSubject, emailHtml) {
  let sendSMSDirect = null;
  try { ({ sendSMSDirect } = require("../communications/twilioHelper")); } catch { /* unavailable */ }
  for (const r of recipients) {
    if (r.phone && sendSMSDirect) { try { await sendSMSDirect(r.phone, smsText); } catch (e) { console.warn("[devWorkerRecorder] sms fail", e.message); } }
    if (r.email && process.env.SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: r.email }] }],
            from: { email: "alex@titleapp.ai", name: "SOCIII Dev (IT/Ops)" },
            subject: emailSubject, content: [{ type: "text/html", value: emailHtml }],
          }),
        });
      } catch (e) { console.warn("[devWorkerRecorder] email fail", e.message); }
    }
  }
}

/**
 * @param {object} payload — exactly what devWorker.js's runDevChecks()
 * computed: { status, ownStatus, redCount, warnCount, reds, warns,
 * ownReds, findings, checkedAtMs, noAlerts }
 */
async function recordAndAlert(payload) {
  const db = admin.firestore();
  const nowMs = payload.checkedAtMs || Date.now();
  const { status, ownStatus, redCount, warnCount, reds, warns, ownReds, findings } = payload;

  const healthRef = db.doc(HEALTH_DOC);
  const prevSnap = await healthRef.get();
  const prev = prevSnap.exists ? prevSnap.data() : {};
  const prevOwnStatus = prev.ownStatus || "green";
  const prevOwnRedKeys = new Set((prev.ownReds || []).map((r) => `${r.scope}:${r.id}`));
  const recipients = (Array.isArray(prev.alertRecipients) && prev.alertRecipients.length) ? prev.alertRecipients : DEFAULT_RECIPIENTS;
  const lastAlertAt = prev.lastAlertAtMs || 0;

  await healthRef.set({
    status, ownStatus, redCount, warnCount, reds, warns, ownReds,
    lastCheckedMs: nowMs, lastChecked: admin.firestore.FieldValue.serverTimestamp(),
    ...(prevSnap.exists ? {} : { alertRecipients: DEFAULT_RECIPIENTS }),
  }, { merge: true });
  await db.collection("devFindings").add({
    status, redCount, warnCount,
    findings: findings.map((f) => ({ ...f, proposedFix: proposedFixFor(f) })),
    atMs: nowMs, at: admin.firestore.FieldValue.serverTimestamp(),
  });

  const newOwnReds = ownReds.filter((r) => !prevOwnRedKeys.has(`${r.scope}:${r.id}`));
  let alertReason = "none";
  if (newOwnReds.length) alertReason = "new_red";
  else if (ownReds.length && (nowMs - lastAlertAt) > REALERT_AFTER_MS) alertReason = "still_red_12h";
  else if (!ownReds.length && prevOwnStatus === "red") alertReason = "recovery";

  if (alertReason !== "none" && !payload.noAlerts) {
    if (alertReason === "recovery") {
      await sendAlerts(recipients, "✅ Dev (SOCIII IT/ops): all red issues cleared.", "✅ Dev: red issues cleared", "<p>All Dev-owned red findings cleared.</p>");
    } else {
      const lines = ownReds.map((r) => `• [${r.scope}] ${r.id}: ${r.reason}`).join("\n");
      await sendAlerts(recipients,
        `🔴 Dev (SOCIII IT/ops): ${ownReds.length} red.\n${lines}`.slice(0, 1400),
        `🔴 Dev (IT/ops) — ${ownReds.length} red`,
        `<p><b>${ownReds.length} finding(s) RED</b>.</p><pre>${ownReds.map((r) => `[${r.scope}] ${r.id}: ${r.reason}`).join("\n")}</pre>`);
    }
    await healthRef.set({ lastAlertAtMs: nowMs, lastAlertReason: alertReason }, { merge: true });
  }

  return { status, redCount, warnCount, alertReason };
}

module.exports = { recordAndAlert, proposedFixFor };
